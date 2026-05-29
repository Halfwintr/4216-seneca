#!/usr/bin/env node

// Offline frame renderer for Gaussian splat scenes.
//
// Drives the /capture page in a real Chromium (via Playwright), steps a baked
// camera dolly through the splat, and saves one image per frame. The resulting
// sequence is scrubbed on scroll at runtime (see ScrollFrameScene), which is far
// cheaper than running multiple live WebGL splat viewers.
//
// Usage:
//   node scripts/render-splat-frames.mjs \
//     --splat /gaussians/arrival-001.ksplat \
//     --id arrival-001 \
//     [--frames 60] [--zoom 0.08] [--width 1600] [--height 900] \
//     [--base http://localhost:3000]

import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import sharp from "sharp";

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i]?.replace(/^--/, "");
    const value = argv[i + 1];
    if (key) args[key] = value;
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const splat = args.splat;
const id = args.id;

if (!splat || !id) {
  console.error(
    "Usage: node scripts/render-splat-frames.mjs --splat /gaussians/<file>.ksplat --id <scene-id> [--frames 60] [--zoom 0.08] [--width 1600] [--height 900] [--base http://localhost:3000]"
  );
  process.exit(1);
}

const frames = Number(args.frames ?? 60);
const zoom = Number(args.zoom ?? 0.08);
const width = Number(args.width ?? 1440);
const height = Number(args.height ?? 810);
const baseUrl = args.base ?? "http://localhost:3000";
const format = (args.format ?? "webp").toLowerCase();
const quality = Number(args.quality ?? 80);
const fileExt = format === "jpeg" ? "jpg" : format;

const outDir = join(projectRoot, "public", "scenes", id);

async function main() {
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  const browser = await chromium.launch({
    headless: false,
    args: ["--ignore-gpu-blocklist", "--enable-gpu"],
  });

  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: 1,
  });

  const captureUrl = `${baseUrl}/capture?splat=${encodeURIComponent(splat)}&frames=${frames}&zoom=${zoom}`;
  console.log(`Opening ${captureUrl}`);
  await page.goto(captureUrl, { waitUntil: "networkidle" });

  await page.waitForFunction(
    () => window.__captureReady === true || window.__captureFailed === true,
    undefined,
    { timeout: 120000 }
  );

  const failed = await page.evaluate(() => window.__captureFailed === true);
  if (failed) {
    await browser.close();
    throw new Error("Capture page reported a failure. See its console output.");
  }

  const frameCount = await page.evaluate(() => window.__captureFrameCount ?? 0);
  console.log(`Rendering ${frameCount} frames at ${width}x${height} as ${format} (q${quality})…`);

  const padWidth = String(frameCount - 1).length;

  const encode = (png) => {
    const pipeline = sharp(png);
    if (format === "webp") return pipeline.webp({ quality }).toBuffer();
    if (format === "jpeg") return pipeline.jpeg({ quality, mozjpeg: true }).toBuffer();
    if (format === "avif") return pipeline.avif({ quality }).toBuffer();
    return Promise.resolve(png);
  };

  for (let i = 0; i < frameCount; i += 1) {
    await page.evaluate((frameIndex) => window.__captureSeek?.(frameIndex), i);

    // Capture lossless PNG, then re-encode once to avoid double-lossy artifacts.
    const png = await page.screenshot({ type: "png" });
    const encoded = await encode(png);
    const name = `frame-${String(i).padStart(padWidth, "0")}.${fileExt}`;
    await writeFile(join(outDir, name), encoded);

    if (i % 10 === 0 || i === frameCount - 1) {
      console.log(`  frame ${i + 1}/${frameCount}`);
    }
  }

  await browser.close();

  const manifest = {
    id,
    splat,
    frameCount,
    zoom,
    width,
    height,
    pad: padWidth,
    ext: fileExt,
    format,
    quality,
  };
  await writeFile(
    join(outDir, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`
  );

  console.log(`Done. Wrote ${frameCount} frames to public/scenes/${id}/`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
