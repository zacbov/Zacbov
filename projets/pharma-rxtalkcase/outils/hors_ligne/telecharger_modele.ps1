# Télécharge un modèle Gemma 4 au format GGUF (une seule fois, avec Internet) dans le dossier modeles\.
# usage : powershell -ExecutionPolicy Bypass -File telecharger_modele.ps1 [26b|12b]
param([string]$taille = "26b")
$dest = Join-Path $PSScriptRoot "modeles"; New-Item -ItemType Directory -Force $dest | Out-Null
$url = @{
  "26b" = "https://huggingface.co/unsloth/gemma-4-26B-A4B-it-GGUF/resolve/main/gemma-4-26B-A4B-it-UD-Q4_K_XL.gguf";   # 17 Go
  "12b" = "https://huggingface.co/unsloth/gemma-4-12b-it-GGUF/resolve/main/gemma-4-12b-it-IQ4_XS.gguf"                  # 6,4 Go
}[$taille]
$fichier = Join-Path $dest ($url.Split("/")[-1])
Write-Host "Téléchargement de $url -> $fichier (reprise possible si interrompu)"
curl.exe -L -C - -o $fichier $url
