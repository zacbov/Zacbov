#!/bin/sh
# Même chose que telecharger_voix.ps1, pour macOS / Linux / GitHub Actions.
set -e
V="$(cd "$(dirname "$0")/.." && pwd)/voix"; HF=https://huggingface.co
get() { mkdir -p "$(dirname "$V/$2")"; [ -s "$V/$2" ] && [ "$(wc -c < "$V/$2")" -gt 1000 ] && { echo "déjà présent : $2"; return; }; echo "téléchargement : $2"; curl -fL --retry 3 -o "$V/$2" "$1"; }
get $HF/rhasspy/piper-voices/resolve/main/fr/fr_FR/upmc/medium/fr_FR-upmc-medium.onnx piper/fr_FR-upmc-medium.onnx
get $HF/rhasspy/piper-voices/resolve/main/fr/fr_FR/upmc/medium/fr_FR-upmc-medium.onnx.json piper/fr_FR-upmc-medium.onnx.json
for f in config.json generation_config.json preprocessor_config.json tokenizer.json tokenizer_config.json special_tokens_map.json added_tokens.json normalizer.json onnx/encoder_model_quantized.onnx onnx/decoder_model_merged_quantized.onnx; do
  get $HF/onnx-community/whisper-base/resolve/main/$f whisper-base/$f
done
du -sh "$V"
