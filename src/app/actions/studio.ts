"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ShotType } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// JSON-returning server actions for the image-first Studio editor. Unlike the
// FormData actions in actions/listings.ts (which drive full-page form posts),
// these return { ok } so the client studio can save fluidly (autosave, toggles)
// without navigation. All mutations go through the user-scoped client, so RLS
// enforces listing ownership.
// ─────────────────────────────────────────────────────────────────────────────

const ASSET_BUCKET = "listing-assets";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export interface ActionResult {
  ok: boolean;
  error?: string;
}

async function requireUser(): Promise<{ supabase: Supabase }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase };
}

/** Revalidates the editor + the public listing pages (best-effort slug lookup). */
async function revalidateListing(supabase: Supabase, listingId: string) {
  const { data } = await supabase
    .from("listings")
    .select("slug")
    .eq("id", listingId)
    .maybeSingle<{ slug: string }>();
  revalidatePath(`/dashboard/listings/${listingId}`);
  if (data?.slug) {
    revalidatePath(`/l/${data.slug}`);
    revalidatePath(`/listing/${data.slug}`);
  }
}

// ─── Moment content ───────────────────────────────────────────────────────────

export interface MomentContentInput {
  listingId: string;
  momentId: string;
  title?: string;
  subtitle?: string | null;
  body?: string | null;
  eyebrow?: string | null;
  isTitle?: boolean;
  align?: string;
}

export async function saveMomentContent(
  input: MomentContentInput,
): Promise<ActionResult> {
  try {
    const { supabase } = await requireUser();

    const update: Record<string, unknown> = {};
    if (input.title !== undefined) update.title = input.title;
    if (input.subtitle !== undefined) update.subtitle = input.subtitle || null;
    if (input.body !== undefined) update.body = input.body || null;
    if (input.eyebrow !== undefined) update.eyebrow = input.eyebrow || null;
    if (input.isTitle !== undefined) update.is_title = input.isTitle;
    if (input.align !== undefined) update.align = input.align || "left";
    if (Object.keys(update).length === 0) return { ok: true };

    const { error } = await supabase
      .from("moments")
      .update(update)
      .eq("id", input.momentId);
    if (error) return { ok: false, error: error.message };

    await revalidateListing(supabase, input.listingId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Save failed." };
  }
}

// ─── Mode (Detail vs 3D) ────────────────────────────────────────────────────

export type PhotoMode = "detail" | "3d";

/**
 * Parks a photo as a carousel detail shot or a 3D-render (wide) shot. Updates
 * the moment's classification and syncs the matching `assets` row (by public
 * URL) so the render pipeline — which queries `assets.render_candidate` — agrees.
 */
export async function setMomentMode(input: {
  listingId: string;
  momentId: string;
  mode: PhotoMode;
}): Promise<ActionResult> {
  try {
    const { supabase } = await requireUser();
    const shotType: ShotType = input.mode === "3d" ? "wide" : "detail";
    const renderCandidate = input.mode === "3d";

    const { data: moment, error } = await supabase
      .from("moments")
      .update({ shot_type: shotType, render_candidate: renderCandidate })
      .eq("id", input.momentId)
      .select("image_path")
      .maybeSingle<{ image_path: string | null }>();
    if (error) return { ok: false, error: error.message };

    // Keep the source asset in sync so 3D bakes pick it up (or drop it).
    if (moment?.image_path) {
      const { data: assets } = await supabase
        .from("assets")
        .select("id, storage_path")
        .eq("listing_id", input.listingId);
      for (const a of (assets ?? []) as { id: string; storage_path: string }[]) {
        const url = supabase.storage
          .from(ASSET_BUCKET)
          .getPublicUrl(a.storage_path).data.publicUrl;
        if (url === moment.image_path) {
          await supabase
            .from("assets")
            .update({ shot_type: shotType, render_candidate: renderCandidate })
            .eq("id", a.id);
          break;
        }
      }
    }

    await revalidateListing(supabase, input.listingId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed." };
  }
}

// ─── Add / delete / reorder / move ──────────────────────────────────────────

export async function addMomentFromAsset(input: {
  listingId: string;
  sceneId: string;
  imagePath: string;
  title?: string;
}): Promise<{ ok: boolean; error?: string; momentId?: string }> {
  try {
    const { supabase } = await requireUser();

    const { data: last } = await supabase
      .from("moments")
      .select("position")
      .eq("scene_id", input.sceneId)
      .order("position", { ascending: false })
      .limit(1);
    const nextPos = (last?.[0]?.position ?? -1) + 1;

    const { data, error } = await supabase
      .from("moments")
      .insert({
        scene_id: input.sceneId,
        position: nextPos,
        image_path: input.imagePath,
        title: input.title ?? "Untitled",
        align: nextPos % 2 === 0 ? "left" : "right",
        shot_type: "detail",
        render_candidate: false,
      })
      .select("id")
      .single();
    if (error) return { ok: false, error: error.message };

    await revalidateListing(supabase, input.listingId);
    return { ok: true, momentId: data.id as string };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed." };
  }
}

export async function deleteMomentById(input: {
  listingId: string;
  momentId: string;
}): Promise<ActionResult> {
  try {
    const { supabase } = await requireUser();
    const { error } = await supabase
      .from("moments")
      .delete()
      .eq("id", input.momentId);
    if (error) return { ok: false, error: error.message };
    await revalidateListing(supabase, input.listingId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed." };
  }
}

export async function reorderMoment(input: {
  listingId: string;
  sceneId: string;
  momentId: string;
  dir: "up" | "down";
}): Promise<ActionResult> {
  try {
    const { supabase } = await requireUser();
    const { data: moments } = await supabase
      .from("moments")
      .select("id, position")
      .eq("scene_id", input.sceneId)
      .order("position", { ascending: true });
    if (!moments) return { ok: true };

    const idx = moments.findIndex((m) => m.id === input.momentId);
    const swapIdx = input.dir === "up" ? idx - 1 : idx + 1;
    if (idx === -1 || swapIdx < 0 || swapIdx >= moments.length) return { ok: true };

    const a = moments[idx];
    const b = moments[swapIdx];
    await supabase.from("moments").update({ position: b.position }).eq("id", a.id);
    await supabase.from("moments").update({ position: a.position }).eq("id", b.id);

    await revalidateListing(supabase, input.listingId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed." };
  }
}

/**
 * Applies an explicit ordering (and section assignment) for a batch of moments.
 * Used by drag-and-drop: the client sends the final position + scene_id for
 * every moment in each affected section.
 */
export async function reorderMoments(input: {
  listingId: string;
  updates: { momentId: string; sceneId: string; position: number }[];
}): Promise<ActionResult> {
  try {
    const { supabase } = await requireUser();
    await Promise.all(
      input.updates.map((u) =>
        supabase
          .from("moments")
          .update({ scene_id: u.sceneId, position: u.position })
          .eq("id", u.momentId),
      ),
    );
    await revalidateListing(supabase, input.listingId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed." };
  }
}

export async function moveMomentToScene(input: {
  listingId: string;
  momentId: string;
  toSceneId: string;
}): Promise<ActionResult> {
  try {
    const { supabase } = await requireUser();
    const { data: last } = await supabase
      .from("moments")
      .select("position")
      .eq("scene_id", input.toSceneId)
      .order("position", { ascending: false })
      .limit(1);
    const nextPos = (last?.[0]?.position ?? -1) + 1;

    const { error } = await supabase
      .from("moments")
      .update({ scene_id: input.toSceneId, position: nextPos })
      .eq("id", input.momentId);
    if (error) return { ok: false, error: error.message };

    await revalidateListing(supabase, input.listingId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed." };
  }
}

// ─── Scene (section) management ─────────────────────────────────────────────

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function createSection(input: {
  listingId: string;
  label?: string;
}): Promise<{ ok: boolean; error?: string; sceneId?: string }> {
  try {
    const { supabase } = await requireUser();
    const { data: last } = await supabase
      .from("scenes")
      .select("position")
      .eq("listing_id", input.listingId)
      .order("position", { ascending: false })
      .limit(1);
    const nextPos = (last?.[0]?.position ?? -1) + 1;
    const label = input.label?.trim() || `New Section ${nextPos + 1}`;

    const { data, error } = await supabase
      .from("scenes")
      .insert({
        listing_id: input.listingId,
        position: nextPos,
        key: `${slugify(label) || "section"}-${nextPos + 1}`,
        label,
      })
      .select("id")
      .single();
    if (error) return { ok: false, error: error.message };

    await revalidateListing(supabase, input.listingId);
    return { ok: true, sceneId: data.id as string };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed." };
  }
}

export async function renameSection(input: {
  listingId: string;
  sceneId: string;
  label: string;
}): Promise<ActionResult> {
  try {
    const { supabase } = await requireUser();
    const { error } = await supabase
      .from("scenes")
      .update({ label: input.label.trim() || "Section" })
      .eq("id", input.sceneId);
    if (error) return { ok: false, error: error.message };
    await revalidateListing(supabase, input.listingId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed." };
  }
}

export async function reorderSection(input: {
  listingId: string;
  sceneId: string;
  dir: "up" | "down";
}): Promise<ActionResult> {
  try {
    const { supabase } = await requireUser();
    const { data: scenes } = await supabase
      .from("scenes")
      .select("id, position")
      .eq("listing_id", input.listingId)
      .order("position", { ascending: true });
    if (!scenes) return { ok: true };

    const idx = scenes.findIndex((s) => s.id === input.sceneId);
    const swapIdx = input.dir === "up" ? idx - 1 : idx + 1;
    if (idx === -1 || swapIdx < 0 || swapIdx >= scenes.length) return { ok: true };

    const a = scenes[idx];
    const b = scenes[swapIdx];
    await supabase.from("scenes").update({ position: b.position }).eq("id", a.id);
    await supabase.from("scenes").update({ position: a.position }).eq("id", b.id);

    await revalidateListing(supabase, input.listingId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed." };
  }
}

export async function deleteSection(input: {
  listingId: string;
  sceneId: string;
}): Promise<ActionResult> {
  try {
    const { supabase } = await requireUser();
    const { error } = await supabase
      .from("scenes")
      .delete()
      .eq("id", input.sceneId);
    if (error) return { ok: false, error: error.message };
    await revalidateListing(supabase, input.listingId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed." };
  }
}
