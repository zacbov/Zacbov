#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════
# compress-glb.sh — compression Draco du modèle CorpoAtlas
#
# Le GLB fait 202 Mo et met ~6 s à se charger : c'est 99,9 % du
# poids de la page et le principal frein au démarrage.
#
# Draco compresse la GÉOMÉTRIE sans toucher aux noms de nœuds —
# vérifié : `VH_F_*` est préservé, donc ORGAN_MESH_MAP, la sidebar,
# les fiches et les ancres d'animation continuent de fonctionner.
#
# Usage :
#   ./compress-glb.sh 3d-vh-f-united-custom.glb
#   ./compress-glb.sh mon.glb --agressif     (ajoute la simplification)
# ══════════════════════════════════════════════════════════════
set -e

IN="${1:?Usage: ./compress-glb.sh <fichier.glb> [--agressif]}"
MODE="${2:-}"
BASE="${IN%.glb}"
OUT="${BASE}-draco.glb"

[ -f "$IN" ] || { echo "✗ Fichier introuvable : $IN"; exit 1; }

# ── Dépendances ──
if ! command -v gltf-transform >/dev/null 2>&1; then
  echo "→ Installation de @gltf-transform/cli…"
  npm install -g @gltf-transform/cli
fi

size_mb () { echo "scale=1; $(stat -c%s "$1" 2>/dev/null || stat -f%z "$1") / 1048576" | bc; }

echo "════════════════════════════════════════════"
echo "  Entrée : $IN  ($(size_mb "$IN") Mo)"
echo "════════════════════════════════════════════"

TMP="${BASE}-tmp.glb"

# ── 1. weld : fusionne les sommets identiques ──
# Étape sûre et sans perte visuelle. Réduit souvent de 20-40 %
# et améliore beaucoup le taux de compression Draco ensuite.
echo
echo "[1/3] weld — fusion des sommets équivalents"
gltf-transform weld "$IN" "$TMP"

# ── 2. simplify (optionnel) ──
# ATTENTION : réduit le nombre de triangles, donc DÉGRADE la
# géométrie. À n'utiliser que si le poids reste bloquant après
# Draco, et à vérifier visuellement organe par organe.
if [ "$MODE" = "--agressif" ]; then
  echo
  echo "[2/3] simplify — réduction du maillage (PERTE DE DÉTAIL)"
  echo "      ratio 0.75, erreur max 0.001"
  gltf-transform simplify "$TMP" "${TMP}.s" --ratio 0.75 --error 0.001 \
    && mv "${TMP}.s" "$TMP" \
    || echo "      ⚠ simplify a échoué — on continue sans (non bloquant)"
else
  echo
  echo "[2/3] simplify — ignoré (utiliser --agressif pour l'activer)"
fi

# ── 3. Draco ──
echo
echo "[3/3] draco — compression de la géométrie"
gltf-transform draco "$TMP" "$OUT"
rm -f "$TMP"

echo
echo "════════════════════════════════════════════"
echo "  $(size_mb "$IN") Mo → $(size_mb "$OUT") Mo"
echo "  Sortie : $OUT"
echo "════════════════════════════════════════════"

# ── Vérification : les noms de nœuds ont-ils survécu ? ──
echo
echo "Contrôle des noms de nœuds (critique pour l'atlas) :"
python3 - "$OUT" <<'PY'
import json, struct, sys, re
p = sys.argv[1]
with open(p, 'rb') as f:
    f.read(12)
    n = struct.unpack('<I', f.read(4))[0]
    f.read(4)
    j = json.loads(f.read(n).decode('utf-8'))
names = [x.get('name', '') for x in j.get('nodes', [])]
vh = [x for x in names if x.startswith('VH_F_')]
print(f"  nœuds totaux   : {len(names)}")
print(f"  préfixés VH_F_ : {len(vh)}")
print(f"  extensions     : {j.get('extensionsUsed')}")
if len(vh) == 0:
    print("  ✗ AUCUN nom VH_F_ — l'atlas ne fonctionnera PAS avec ce fichier")
    sys.exit(1)
print(f"  exemples       : {', '.join(vh[:4])}")
print("  ✓ noms préservés")
PY

cat <<'EOF'

────────────────────────────────────────────
ÉTAPE SUIVANTE — indispensable

Draco exige un décodeur côté navigateur. Sans lui, le modèle
ne se chargera PAS. Ajouter dans corpoatlas.html, après la
balise GLTFLoader :

  <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/DRACOLoader.js"></script>

puis, juste avant `loader.load(...)` :

  const dracoLoader = new THREE.DRACOLoader();
  dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
  loader.setDRACOLoader(dracoLoader);

Enfin, pointer vers le nouveau fichier dans loader.load().

Tester en local AVANT de remplacer le fichier en production.
────────────────────────────────────────────
EOF
