#!/usr/bin/env bash
# Downloads the face-tracking runtime (MediaPipe Tasks Vision + the BlazeFace model) into
# app/vendor/. These files are large (~23 MB) so they are not committed; the Pages workflow
# runs this script on every deploy, and you can run it locally too. Without them the app
# falls back to loading the same files from a CDN.
set -euo pipefail

MP_VERSION="1.0.1"
MP_SHA256="ee318eaa3d42230aa10910d114faf2a488c577c4e4d33c7cb04126924aca505f"
MODEL_URL="https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite"
MODEL_SHA256="b4578f35940bf5a1a655214a1cce5cab13eba73c1297cd78e1a04c2380b0152f"
SEG_URL="https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/1/selfie_segmenter.tflite"
SEG_SHA256="191ac9529ae506ee0beefa6b2c945a172dab9d07d1e802a290a4e4038226658b"
MESH_URL="https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"
MESH_SHA256="64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff"

root="$(cd "$(dirname "$0")/.." && pwd)"
dest="$root/app/vendor/mediapipe-$MP_VERSION"

# keep app/js/face.js pointing at the same version
grep -q "MP_VERSION = '$MP_VERSION'" "$root/app/js/face.js" \
  || { echo "app/js/face.js MP_VERSION does not match $MP_VERSION" >&2; exit 1; }

if [ -f "$dest/.complete" ] && [ -f "$dest/face_landmarker.task" ]; then echo "Already have $dest"; exit 0; fi

tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
check() { echo "$2  $1" | sha256sum -c --quiet - || { echo "Checksum mismatch for $1" >&2; exit 1; }; }

curl -fsSL --retry 3 -o "$tmp/pkg.tgz" "https://registry.npmjs.org/@mediapipe/tasks-vision/-/tasks-vision-$MP_VERSION.tgz"
check "$tmp/pkg.tgz" "$MP_SHA256"
curl -fsSL --retry 3 -o "$tmp/model.tflite" "$MODEL_URL"
check "$tmp/model.tflite" "$MODEL_SHA256"
curl -fsSL --retry 3 -o "$tmp/seg.tflite" "$SEG_URL"
check "$tmp/seg.tflite" "$SEG_SHA256"
curl -fsSL --retry 3 -o "$tmp/mesh.task" "$MESH_URL"
check "$tmp/mesh.task" "$MESH_SHA256"

tar -xzf "$tmp/pkg.tgz" -C "$tmp"
rm -rf "$dest"; mkdir -p "$dest/wasm"
cp "$tmp/package/vision_bundle.mjs" "$dest/"
cp "$tmp/package/LICENSE" "$dest/" 2>/dev/null || true
for f in vision_wasm_internal vision_wasm_nosimd_internal; do
  cp "$tmp/package/wasm/$f.js" "$tmp/package/wasm/$f.wasm" "$dest/wasm/"
done
cp "$tmp/model.tflite" "$dest/blaze_face_short_range.tflite"
cp "$tmp/seg.tflite" "$dest/selfie_segmenter.tflite"
cp "$tmp/mesh.task" "$dest/face_landmarker.task"
chmod -R a+rX "$dest"
touch "$dest/.complete"
echo "Face tracking files ready in ${dest#$root/}"
