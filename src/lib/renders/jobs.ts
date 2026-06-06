import "server-only";
import { spawn } from "node:child_process";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AssetRow } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// 3D render bake job runner.
//
// Orchestrates the existing LOCAL pipeline for a listing's 3D-candidate photos:
//   1. download the source photo from Supabase Storage
//   2. SHARP (single-image → .ply)        — Apple MPS ML model in a local venv
//   3. convert-splat.mjs (.ply → .ksplat)
//   4. render-splat-frames.mjs            — Playwright dolly through /capture → WebP
//   5. upload the baked frames + manifest to Supabase Storage
//   6. point the matching moment's frame_sequence_path at that public folder
//
// This only runs on the machine running `npm run dev` (it shells out to SHARP +
// a visible Chromium). Jobs are tracked in-memory (per dev process).
// ─────────────────────────────────────────────────────────────────────────────

const BUCKET = "listing-assets";

const PROJECT_ROOT = process.cwd();
const SHARP_VENV = process.env.RENDER_SHARP_VENV ?? "/tmp/4216-seneca-sharp/.venv";
const RENDER_BASE_URL = process.env.RENDER_BASE_URL ?? "http://localhost:3000";
const FRAMES = process.env.RENDER_FRAMES ?? "60";
// Camera dolly distance. Small = a gentle push-in with minimal splat warping
// (larger values push deep enough to expose single-image reconstruction artifacts).
const ZOOM = process.env.RENDER_ZOOM ?? "0.03";
const START = process.env.RENDER_START ?? "0";
// Camera FOV. Default matches the original framing the other scenes use; can be
// narrowed (env) for a scene whose splat sits small in frame with a black border.
const FOV = process.env.RENDER_FOV ?? "46.8";
// Shipped frame sequence: QHD, high-quality WebP. These are the only artifacts
// visitors download, so this is the quality/bandwidth lever. The capture
// rasterizes the splat at this resolution, so it directly drives sharpness.
const FRAME_WIDTH = process.env.RENDER_WIDTH ?? "2560";
const FRAME_HEIGHT = process.env.RENDER_HEIGHT ?? "1440";
const FRAME_QUALITY = process.env.RENDER_QUALITY ?? "90";
// Splat conversion: the .ksplat is an intermediate (never shipped to visitors),
// so we keep it lossless and retain faint splats for maximum render fidelity.
const KSPLAT_MIN_ALPHA = process.env.RENDER_KSPLAT_MIN_ALPHA ?? "5";
const KSPLAT_COMPRESSION = process.env.RENDER_KSPLAT_COMPRESSION ?? "0";

export interface RenderTarget {
  assetId: string;
  momentId: string;
  url: string;
  room: string;
}

export type RenderJobState = "running" | "done" | "error";

export interface RenderJobStatus {
  id: string;
  listingId: string;
  state: RenderJobState;
  total: number;
  done: number;
  /** Label of the photo currently baking. */
  current: string | null;
  errors: string[];
}

// Survive Next dev HMR by stashing the registry on globalThis.
const store: Map<string, RenderJobStatus> =
  (globalThis as unknown as { __renderJobs?: Map<string, RenderJobStatus> })
    .__renderJobs ?? new Map();
(globalThis as unknown as { __renderJobs?: Map<string, RenderJobStatus> }).__renderJobs =
  store;

export function getJob(jobId: string): RenderJobStatus | null {
  return store.get(jobId) ?? null;
}

function adminPublicUrl(
  admin: ReturnType<typeof createAdminClient>,
  storagePath: string,
): string {
  return admin.storage.from(BUCKET).getPublicUrl(storagePath).data.publicUrl;
}

/**
 * The 3D-flagged moments to bake. The moment is the source of truth (it's what
 * the studio badges and the public renderer use), so we select moments marked
 * 3D — render_candidate, or shot_type 'wide' — rather than the assets table,
 * whose flags can be stale from the original AI analysis. Each moment is matched
 * back to its source asset (by public URL) for the SHARP input image.
 *
 * With `onlyUnbaked`, moments that already have a baked sequence
 * (`frame_sequence_path`) are skipped — so a repeat "Generate 3D" only renders
 * newly-flagged photos instead of re-rendering everything.
 */
export async function listRenderTargets(
  listingId: string,
  opts?: { onlyUnbaked?: boolean },
): Promise<RenderTarget[]> {
  const admin = createAdminClient();

  const { data: sceneRows } = await admin
    .from("scenes")
    .select("id")
    .eq("listing_id", listingId);
  const sceneIds = (sceneRows ?? []).map((s) => s.id as string);
  if (sceneIds.length === 0) return [];

  const { data: momentRows } = await admin
    .from("moments")
    .select("id, image_path, render_candidate, shot_type, frame_sequence_path")
    .in("scene_id", sceneIds)
    .or("render_candidate.eq.true,shot_type.eq.wide");
  const moments = (momentRows ?? []).filter((m) => {
    const row = m as { image_path: string | null; frame_sequence_path: string | null };
    if (!row.image_path) return false;
    if (opts?.onlyUnbaked && row.frame_sequence_path) return false;
    return true;
  }) as { id: string; image_path: string }[];
  if (moments.length === 0) return [];

  const { data: assetRows } = await admin
    .from("assets")
    .select("*")
    .eq("listing_id", listingId);
  const assetByUrl = new Map<string, AssetRow>();
  for (const a of (assetRows ?? []) as AssetRow[]) {
    assetByUrl.set(adminPublicUrl(admin, a.storage_path), a);
  }

  const targets: RenderTarget[] = [];
  for (const m of moments) {
    const asset = assetByUrl.get(m.image_path);
    // No uploaded source asset (e.g., a seeded static image) — can't bake it.
    if (!asset) continue;
    targets.push({
      assetId: asset.id,
      momentId: m.id,
      url: m.image_path,
      room: asset.room_type ?? "Space",
    });
  }
  return targets;
}

/** Creates a job record and kicks off the bake in the background. */
export function startJob(listingId: string): string {
  const id = crypto.randomUUID();
  store.set(id, {
    id,
    listingId,
    state: "running",
    total: 0,
    done: 0,
    current: null,
    errors: [],
  });
  void runRenderJob(id, listingId);
  return id;
}

function run(
  cmd: string,
  args: string[],
  env?: Record<string, string>,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: PROJECT_ROOT,
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let tail = "";
    const onChunk = (d: Buffer) => {
      const s = d.toString();
      tail = (tail + s).slice(-800);
      process.stdout.write(`[render] ${s}`);
    };
    child.stdout?.on("data", onChunk);
    child.stderr?.on("data", onChunk);
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`${path.basename(cmd)} exited ${code}: ${tail.trim()}`)),
    );
  });
}

async function bakeOne(
  admin: ReturnType<typeof createAdminClient>,
  listingId: string,
  target: RenderTarget,
  storagePath: string,
): Promise<string> {
  const id = `r-${target.assetId}`;
  const ext = (storagePath.split(".").pop() || "jpg").toLowerCase();

  const inDir = path.join(PROJECT_ROOT, ".render-tmp", `in-${id}`);
  const outDir = path.join(PROJECT_ROOT, ".render-tmp", `out-${id}`);
  const ksplat = path.join(PROJECT_ROOT, "public", "gaussians", `${id}.ksplat`);
  const framesDir = path.join(PROJECT_ROOT, "public", "scenes", id);

  try {
    // 1. Download the source photo into SHARP's input directory.
    await rm(inDir, { recursive: true, force: true });
    await rm(outDir, { recursive: true, force: true });
    await mkdir(inDir, { recursive: true });
    await mkdir(outDir, { recursive: true });
    const res = await fetch(target.url);
    if (!res.ok) throw new Error(`Could not download source photo (${res.status}).`);
    await writeFile(path.join(inDir, `${id}.${ext}`), Buffer.from(await res.arrayBuffer()));

    // 2. SHARP single-image → .ply
    await run(path.join(SHARP_VENV, "bin", "sharp"), [
      "predict",
      "-i",
      inDir,
      "-o",
      outDir,
      "--device",
      "mps",
      "--no-render",
    ]);

    // 3. .ply → .ksplat (served locally for the capture page)
    await mkdir(path.dirname(ksplat), { recursive: true });
    await run(
      "node",
      [
        "--max-old-space-size=8192",
        path.join(PROJECT_ROOT, "scripts", "convert-splat.mjs"),
        path.join(outDir, `${id}.ply`),
        ksplat,
      ],
      { KSPLAT_MIN_ALPHA, KSPLAT_COMPRESSION },
    );

    // 4. Playwright dolly through the splat → baked WebP frames + manifest.
    await run("node", [
      path.join(PROJECT_ROOT, "scripts", "render-splat-frames.mjs"),
      "--splat",
      `/gaussians/${id}.ksplat`,
      "--id",
      id,
      "--frames",
      FRAMES,
      "--zoom",
      ZOOM,
      "--start",
      START,
      "--fov",
      FOV,
      "--width",
      FRAME_WIDTH,
      "--height",
      FRAME_HEIGHT,
      "--format",
      "webp",
      "--quality",
      FRAME_QUALITY,
      "--base",
      RENDER_BASE_URL,
    ]);

    // 5. Upload frames + manifest (+ the splat) to Supabase Storage.
    const dest = `renders/${listingId}/${target.assetId}`;
    const files = await readdir(framesDir);
    for (const file of files) {
      const data = await readFile(path.join(framesDir, file));
      await admin.storage.from(BUCKET).upload(`${dest}/${file}`, data, {
        contentType: file.endsWith(".json") ? "application/json" : "image/webp",
        upsert: true,
      });
    }
    await admin.storage
      .from(BUCKET)
      .upload(`${dest}/scene.ksplat`, await readFile(ksplat), {
        contentType: "application/octet-stream",
        upsert: true,
      });

    const folderUrl = admin.storage
      .from(BUCKET)
      .getPublicUrl(dest)
      .data.publicUrl.replace(/\/$/, "");

    // 6. Point the moment at the baked sequence.
    await admin
      .from("moments")
      .update({ frame_sequence_path: folderUrl })
      .eq("id", target.momentId);

    return folderUrl;
  } finally {
    // Clean up local intermediates — the assets now live in Supabase.
    await rm(inDir, { recursive: true, force: true }).catch(() => {});
    await rm(outDir, { recursive: true, force: true }).catch(() => {});
    await rm(framesDir, { recursive: true, force: true }).catch(() => {});
    await rm(ksplat, { force: true }).catch(() => {});
  }
}

async function runRenderJob(jobId: string, listingId: string): Promise<void> {
  const job = store.get(jobId);
  if (!job) return;

  const fail = (msg: string) => {
    job.state = "error";
    job.errors.push(msg);
  };

  if (!existsSync(path.join(SHARP_VENV, "bin", "sharp"))) {
    fail(
      `SHARP model not found at ${SHARP_VENV}. 3D rendering runs locally and needs the SHARP venv (set RENDER_SHARP_VENV to override).`,
    );
    return;
  }

  try {
    const admin = createAdminClient();
    // Only render newly-flagged photos; skip ones already baked.
    const targets = await listRenderTargets(listingId, { onlyUnbaked: true });
    job.total = targets.length;

    if (targets.length === 0) {
      job.state = "done";
      return;
    }

    const { data: assetRows } = await admin
      .from("assets")
      .select("id, storage_path")
      .in(
        "id",
        targets.map((t) => t.assetId),
      );
    const pathById = new Map(
      (assetRows ?? []).map((a) => [a.id as string, a.storage_path as string]),
    );

    const { data: listing } = await admin
      .from("listings")
      .select("slug")
      .eq("id", listingId)
      .single<{ slug: string }>();

    for (let i = 0; i < targets.length; i += 1) {
      const target = targets[i];
      job.current = target.room;
      try {
        await bakeOne(admin, listingId, target, pathById.get(target.assetId) ?? "");
      } catch (e) {
        job.errors.push(
          `${target.room}: ${e instanceof Error ? e.message : "render failed"}`,
        );
      }
      job.done = i + 1;
    }

    // Best-effort cache refresh for the listing's pages.
    if (listing?.slug) {
      try {
        const { revalidatePath } = await import("next/cache");
        revalidatePath(`/l/${listing.slug}`);
        revalidatePath(`/listing/${listing.slug}`);
        revalidatePath(`/dashboard/listings/${listingId}`);
      } catch {
        /* revalidate is best-effort outside a request scope */
      }
    }

    job.current = null;
    job.state = job.errors.length === targets.length ? "error" : "done";
  } catch (e) {
    fail(e instanceof Error ? e.message : "Render job failed.");
  }
}
