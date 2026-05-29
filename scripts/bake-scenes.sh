#!/usr/bin/env bash
# Bake one or more scenes end-to-end: SHARP (.ply) -> .ksplat -> WebP frames.
#
# Usage:
#   scripts/bake-scenes.sh heart-002 heart-003 accommodations-12 ...
#
# Assumes:
#   - the Next dev server is running on http://localhost:3000 (serves /capture)
#   - the local SHARP venv exists at /tmp/4216-seneca-sharp/.venv
#   - source images live in public/images/property/<id>.webp

set -euo pipefail

ROOT="/Users/roberttrahan/Developer/4216-seneca"
TMP="/tmp/4216-seneca-sharp"
VENV="$TMP/.venv"

if [ ! -x "$VENV/bin/sharp" ]; then
  echo "SHARP venv missing at $VENV. Re-create it before baking." >&2
  exit 1
fi

for id in "$@"; do
  echo "=== $id ==="
  src="$ROOT/public/images/property/$id.webp"
  ksplat="$ROOT/public/gaussians/$id.ksplat"

  if [ ! -f "$src" ]; then
    echo "Missing source image: $src" >&2
    exit 1
  fi

  if [ ! -f "$ksplat" ]; then
    indir="$TMP/input-$id"
    outdir="$TMP/output-$id"
    rm -rf "$indir" "$outdir"
    mkdir -p "$indir" "$outdir"
    ln -sf "$src" "$indir/$id.webp"
    echo "  SHARP predict…"
    PYTHONUNBUFFERED=1 "$VENV/bin/sharp" predict -i "$indir" -o "$outdir" --device mps --no-render
    echo "  convert -> ksplat…"
    KSPLAT_MIN_ALPHA=24 KSPLAT_COMPRESSION=2 node --max-old-space-size=8192 "$ROOT/scripts/convert-splat.mjs" "$outdir/$id.ply" "$ksplat"
  else
    echo "  ksplat exists, skipping SHARP."
  fi

  echo "  render frames…"
  node "$ROOT/scripts/render-splat-frames.mjs" --splat "/gaussians/$id.ksplat" --id "$id" --frames 60 --zoom 0.08 --format webp --quality 80
done

echo "BAKE_ALL_DONE"
