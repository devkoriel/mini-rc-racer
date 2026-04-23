#!/usr/bin/env bash
set -euo pipefail

BLENDER_BIN="${BLENDER_BIN:-blender}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${ROOT}/public/content"

if ! command -v "$BLENDER_BIN" >/dev/null 2>&1; then
  echo "error: Blender CLI not found on PATH and BLENDER_BIN not set."
  echo "       On macOS try: export BLENDER_BIN=/Applications/Blender.app/Contents/MacOS/Blender"
  exit 1
fi

echo "[assets] using $("$BLENDER_BIN" --version | head -1)"

mkdir -p "$OUT/meshes/props" "$OUT/meshes/pickups" "$OUT/meshes/cars" "$OUT/textures"

RC_ASSETS_OUT="$OUT/meshes/props" "$BLENDER_BIN" --background --python "$ROOT/tools/blender/build_props.py"
RC_ASSETS_OUT="$OUT/meshes/pickups" "$BLENDER_BIN" --background --python "$ROOT/tools/blender/build_pickups.py"

echo "[assets] done — output in $OUT"
