# PHARMA-FOOT

Jeu de foot arcade multijoueur local : **un seul écran de rendu** (PC / TV), les
téléphones servent de manettes via un relais WebSocket Cloudflare.

```
pharmafoot/
├── worker/                 # relais WebSocket (Durable Object)
│   ├── src/index.js
│   └── wrangler.toml
└── public/                 # Cloudflare Pages
    ├── index.html          # écran de rendu
    ├── controller.html     # manette téléphone (autonome)
    └── js/screen.js        # moteur de jeu
```

## Déploiement

```bash
# 1) relais  (nom du worker = pharmafoot -> pharmafoot.zacharybov.workers.dev)
cd worker
npx wrangler deploy

# 2) écran + manette
cd ..
npx wrangler pages deploy public --project-name pharmafoot
```

L'adresse du relais est codée en dur dans `public/js/screen.js` (`CFG.RELAY`) et
dans `public/controller.html` (`RELAY`) : `wss://pharmafoot.zacharybov.workers.dev/ws`.
Si tu renommes le worker, change les deux.

## Boucle de jeu

1. L'écran affiche un **code à 4 lettres** + l'URL `…/controller.html#CODE`.
2. Chaque joueur ouvre l'URL sur son téléphone : pseudo, numéro, **photo**
   (caméra frontale, appliquée sur la face avant de la tête 3D), maillot.
3. Réglages sur l'écran : format 1v1 → 5v5, durée, difficulté IA, gardiens,
   couleurs des deux équipes. **COUP D'ENVOI**.
4. Les humains occupent les postes les plus avancés de l'équipe A ; les places
   restantes sont comblées par des coéquipiers IA. L'équipe B a le même effectif.

## Contrôles (téléphone, paysage)

| Commande | Effet |
|---|---|
| Stick gauche | déplacement analogique (orienté écran) |
| **TIR** maintenu | charge la jauge ; la trajectoire prévisualisée s'affiche sur le terrain dans la direction visée. Relâcher = frappe (hauteur + effet selon la charge et le stick) |
| **TIR** sans ballon | sprint (barre d'endurance, anneau rouge quand vide) |
| **PASSE** | passe au sol vers le coéquipier le mieux placé (lignes de passe encombrées pénalisées) |
| **TACLE** | glissade ; réussie = ballon libéré + adversaire au sol 0,85 s, ratée = 0,4 s au sol |

Vibrations : contrôle de balle, tacle subi, but.

**Clavier (test solo)** : touche `K` sur l'écran pour ajouter/retirer un joueur
clavier — ZQSD/flèches, `Espace` = tir/sprint, `E` = passe, `Maj` = tacle.

## Choix de conception

- **Pas de touche ni de corner** : bandes façon futsal, le ballon rebondit. Le jeu
  ne s'arrête jamais sauf sur but — meilleur rythme en arcade.
- **Gardiens IA des deux côtés** (désactivables) : sortie sur ballon perdu dans la
  surface, plongeon sur trajectoire prédite avec temps de réaction, relance après 1,1 s.
- **Reconnexion** : l'identifiant de manette est stocké en `localStorage`, une
  déconnexion en cours de match bascule le joueur en IA et le rend à son propriétaire
  dès qu'il revient. Un joueur qui rejoint en cours de match prend une place d'IA.
- Photo redimensionnée à 160×160 JPEG q0.62 (~6 ko) avant envoi.

## Validation effectuée

Simulation headless (stubs THREE/DOM) de 5 matchs complets :

| Configuration | Score final | Ballon hors limites | Ballon inerte |
|---|---|---|---|
| 1v1 facile | 0-3 | 0 | < 6 s |
| 3v3 normal | 3-3 | 0 | < 6 s |
| 5v5 difficile | 8-3 | 0 | < 6 s |
| 4v4 IA seule | 3-3 | 0 | < 6 s |
| 3v3 sans gardiens | 1-8 | 0 | < 6 s |

Aucune exception, aucune position NaN, tous les matchs atteignent la fin du temps
réglementaire. `node --check` OK sur les trois fichiers JS.

## Pistes suivantes

- QR code sur l'écran (reprendre l'encodeur de Pharma-Cook).
- Coups francs / penalties, fautes sur tacle par derrière.
- Rejouer les buts (ralenti caméra basse).
- Humains dans les deux équipes (mode versus).
- Effet de frappe visible : traînée du ballon + courbe accentuée.
