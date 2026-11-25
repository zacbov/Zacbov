# Télécharge une fois pour toutes les modèles des voix locales dans le dossier voix\ de la page.
# Clic droit > « Exécuter avec PowerShell », depuis le dossier outils\ (ou : powershell -ExecutionPolicy Bypass -File telecharger_voix.ps1)
$ErrorActionPreference = 'Stop'
$voix = Join-Path (Split-Path $PSScriptRoot -Parent) 'voix'
$HF = 'https://huggingface.co'
$fichiers = @()
foreach ($m in 'upmc','mls','siwis','tom') {          # voix Piper : upmc (Jessica, Pierre), mls (15 voix retenues), siwis (femme), tom (homme)
  $fichiers += ,@("$HF/rhasspy/piper-voices/resolve/main/fr/fr_FR/$m/medium/fr_FR-$m-medium.onnx", "piper\fr_FR-$m-medium.onnx")
  $fichiers += ,@("$HF/rhasspy/piper-voices/resolve/main/fr/fr_FR/$m/medium/fr_FR-$m-medium.onnx.json", "piper\fr_FR-$m-medium.onnx.json")
  $fichiers += ,@("$HF/rhasspy/piper-voices/resolve/main/fr/fr_FR/$m/medium/MODEL_CARD", "piper\MODEL_CARD_$m.txt")
}
foreach ($f in 'config.json','generation_config.json','preprocessor_config.json','tokenizer.json','tokenizer_config.json','special_tokens_map.json','added_tokens.json','normalizer.json','onnx/encoder_model_quantized.onnx','onnx/decoder_model_merged_quantized.onnx') {
  $fichiers += ,@("$HF/onnx-community/whisper-base/resolve/main/$f", ('whisper-base\' + $f.Replace('/', '\')))
}
foreach ($f in $fichiers) {
  $dest = Join-Path $voix $f[1]
  New-Item -ItemType Directory -Force -Path (Split-Path $dest) | Out-Null
  if ((Test-Path $dest) -and (Get-Item $dest).Length -gt 100) { Write-Host "déjà présent : $($f[1])"; continue }
  Write-Host "téléchargement : $($f[1])"
  Invoke-WebRequest -Uri $f[0] -OutFile $dest -UseBasicParsing
}
Write-Host "Terminé. Taille du dossier voix :" ([math]::Round(((Get-ChildItem $voix -Recurse | Measure-Object Length -Sum).Sum / 1MB))) "Mo"
