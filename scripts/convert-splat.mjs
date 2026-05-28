#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname } from "node:path";
import { PlyLoader, SplatLoader } from "@mkkellogg/gaussian-splats-3d";

if (!globalThis.window) {
  globalThis.window = {
    setTimeout: globalThis.setTimeout,
    clearTimeout: globalThis.clearTimeout,
  };
}

const [, , inputPath, outputPath] = process.argv;

if (!inputPath || !outputPath) {
  console.error("Usage: node --max-old-space-size=8192 scripts/convert-splat.mjs input.ply public/gaussians/output.ksplat");
  process.exit(1);
}

const extension = extname(inputPath).toLowerCase();
const sourceBuffer = await readFile(inputPath);
const sourceArrayBuffer = sourceBuffer.buffer.slice(
  sourceBuffer.byteOffset,
  sourceBuffer.byteOffset + sourceBuffer.byteLength
);

const minimumAlpha = Number(process.env.KSPLAT_MIN_ALPHA ?? 24);
const compressionLevel = Number(process.env.KSPLAT_COMPRESSION ?? 2);
const optimizeSplatData = true;
const sphericalHarmonicsDegree = 0;

const splatBuffer = extension === ".splat"
  ? await SplatLoader.loadFromFileData(
      sourceArrayBuffer,
      minimumAlpha,
      compressionLevel,
      optimizeSplatData
    )
  : await PlyLoader.loadFromFileData(
      sourceArrayBuffer,
      minimumAlpha,
      compressionLevel,
      optimizeSplatData,
      sphericalHarmonicsDegree
    );

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, Buffer.from(splatBuffer.bufferData));

console.log(`Wrote ${outputPath}`);
