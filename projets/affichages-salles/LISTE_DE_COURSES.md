# Liste de courses — Prototype n°1 (boîtier planning e-ink)

## Indispensable

| # | Référence | Détail | Qté | Prix unit. |
|---|---|---|---|---|
| 1 | **FireBeetle 2 ESP32-E** (DFRobot DFR0654) | Deep sleep ~10 µA, connecteur LiPo intégré, diviseur de tension batterie sur GPIO34 | 1 | ~12 € |
| 2 | **Waveshare 7.5" e-Paper (V2) 800×480 N&B** avec carte driver (HAT, connecteur SPI) | Vérifier la référence exacte du contrôleur imprimée sur le flex (UC8179 vs GD7965) | 1 | ~50–55 € |
| 3 | **Support pile 18650** à clips + fils | 1 slot | 1 | ~1,5 € |
| 4 | **Cellule 18650 protégée** (Samsung 35E, LG MJ1 — 3400–3500 mAh) | "Protégée" = circuit anti-décharge profonde intégré | 1 | ~8 € |
| 5 | **Chargeur 18650** (LiitoKala Lii-202 ou équivalent) | Un seul pour tout le futur parc, pas par boîtier | 1 | ~12 € |
| 6 | **MOSFET canal P** (AO3401 ou IRLML6402) | Coupure d'alimentation de l'écran pendant le deep sleep | 1–2 | ~1 € |
| 7 | Résistance 100 kΩ (1/4 W) | Pull-up grille du MOSFET | 2–3 | négligeable |
| 8 | Bouton poussoir tactile 6×6 mm | Mode config / réveil manuel | 1–2 | ~0,5 € |
| 9 | Plaque d'essai (breadboard) + fils Dupont M/F et M/M | Prototypage avant boîtier définitif | 1 lot | ~5 € |

**Sous-total indispensable : ~90 €**

## Optionnel / utile selon le cas

| Référence | Détail | Utilité |
|---|---|---|
| LDO XC6220B331 ou HT7833 (3,3 V, Iq 1–8 µA) + 2× condensateurs 10 µF | Seulement si tu n'utilises **pas** le FireBeetle (qui a déjà un régulateur adapté) |
| Condensateur 100–470 µF | Tampon si l'écran tire un pic de courant au réveil |
| Filament PLA/PETG pour impression 3D du boîtier | Boîtier définitif, à faire une fois les cotes de l'écran vérifiées |
| Ruban adhésif double-face 3M VHB | Fixation de la plaque murale sur les portes |
| Vis M3 + inserts laiton à chaud | Fixation démontable du boîtier sur la plaque murale |

## Pour la série (au-delà du prototype)

- Acheter les FireBeetle et écrans en gros (remise fournisseur au-delà de 10 unités)
- Un seul chargeur 18650 multi-slots (4 ou 8 baies) suffit pour tout le parc
- Prévoir 10–15 % de cellules 18650 en stock supplémentaire (usure, remplacement)
- Coût unitaire visé en série : **~75 €/boîtier** (hors chargeur, mutualisé)

## Points de vigilance à l'achat

- **Écran** : bien prendre la version avec la carte driver (HAT), pas le panneau nu seul — sinon il faut souder le contrôleur soi-même.
- **Cellule 18650** : prendre uniquement des cellules **protégées**, le circuit ne prévoit pas de BMS séparé dans cette version du projet.
- **FireBeetle vs DevKitC classique** : le DevKitC classique est très bien pour les premiers tests sur table (moins cher, plus courant), mais son deep sleep est nettement moins bon — à réserver au débogage, pas au déploiement final sur porte.
