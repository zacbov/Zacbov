#!/usr/bin/env bash
# Récupère les 6 images CC0 / domaine public dans data/imaging/
# À lancer depuis le dossier contenant corpoatlas.html
#
# Les fichiers sont hébergés sur Wikimedia Commons (Radlines les rediffuse).
# L'API Commons résout le nom de fichier vers l'URL réelle : pas besoin de
# connaître le hash MD5 du chemin upload.wikimedia.org.

set -e
mkdir -p data/imaging
cd data/imaging

FILES=(
 "X-ray of the cervical spine of a 20 year old male - anteroposterior.jpg"
 "X-ray of normal elbow by anteroposterior projection.jpg"
 "X-ray of normal wrist by dorsoplantar projection (crop).jpg"
 "X-ray of normal hand by dorsoplantar projection.jpg"
 "Projectional rendering of CT scan of thorax (thumbnail).gif"
 "Central venous catheter with a fibrin sheath.jpg"
)

UA="CorpoAtlas/1.0 (educational; contact: your-email@example.com)"

for f in "${FILES[@]}"; do
  out="${f// /_}"
  if [ -f "$out" ]; then echo "✓ déjà présent : $out"; continue; fi
  echo "→ $f"
  # 1) demander à l'API Commons l'URL directe du fichier
  url=$(curl -s -A "$UA" -G \
        --data-urlencode "action=query" \
        --data-urlencode "titles=File:$f" \
        --data-urlencode "prop=imageinfo" \
        --data-urlencode "iiprop=url" \
        --data-urlencode "format=json" \
        "https://commons.wikimedia.org/w/api.php" \
        | grep -o '"url":"[^"]*"' | head -1 | cut -d'"' -f4 | sed 's|\\/|/|g')
  if [ -z "$url" ]; then
    echo "  ✗ introuvable sur Commons — récupérer à la main"
    continue
  fi
  curl -s -A "$UA" -o "$out" "$url"
  echo "  ✓ $out  ($(du -h "$out" | cut -f1))"
done

echo
echo "Terminé. Fichiers dans data/imaging/ :"
ls -1
