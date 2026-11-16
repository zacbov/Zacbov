# Clairière — espace de relaxation VR (Quest) + AR téléphone

Une forêt vivante autour de toi : un **décor vidéo 360° en boucle**, les chants
d'oiseaux réels de Xeno-canto (avec fiche : photo, sonogramme, lieu d'enregistrement),
un papillon et une libellule en vol, une plante en gaussian splat, des sons de forêt.
Aucun déplacement requis.

## Ce qui a changé : plus de HDRI, une seule vidéo
Les cinq décors EXR statiques, le menu de choix, la touche `N` / la gâchette qui
changeaient de décor et le fondu croisé entre HDRI sont **retirés**. Le décor est
maintenant **un seul fichier vidéo équirectangulaire**, rendu comme dans Respire :

- **Dans le casque : couche média WebXR** (`USE_XR_MEDIA_LAYER = true`). La vidéo est
  confiée au compositeur du Quest au lieu d'être recopiée à chaque image dans une
  texture WebGL (c'est ce qui évite les artefacts/scintillements en haute résolution).
- **Repli automatique sur une sphère WebGL** : aperçu sur PC, AR téléphone, navigateur
  sans couches WebXR, ou `VIDEO_LETTERBOX` > 0.
- Réglages en haut du bloc « DÉCOR VIDÉO » de `index.html`, **repris tels quels de ta
  version de Respire** : `VIDEO_YAW_DEG` (orientation), `VIDEO_BRIGHTNESS`,
  `VIDEO_LETTERBOX`, `VIDEO_STEREO`. Orientation ou luminosité à ajuster : c'est là.

### Où mettre la vidéo
Un dossier **`asset/`** (ou `assets/`, `assets/video/`, `video/`) à côté de
`index.html`, avec l'un de ces noms :

| Nom de fichier | Remarque |
|---|---|
| `clairiere.webm` / `clairière.webm` | recommandé |
| `foret.webm` | aussi accepté |

`.mp4` accepté aussi, majuscule initiale tolérée (`Clairiere.webm`), accents
tolérés (forme macOS ou Windows). **Pour un autre nom, ajoute-le dans `names`** (liste
`DECORS`) — mais garde la liste courte : chaque combinaison dossier × nom × orthographe ×
extension est testée par une requête, toutes lancées en parallèle (64 aujourd'hui).
Un fichier absent ou illisible affiche un avertissement orange sur l'écran d'accueil
et la scène reste sur un fond sombre.

### Format, codec, résolution
- 3840×2160 (4K) fonctionne dans le casque. Au-delà (8K), ce qui compte est le
  décodeur matériel du Quest et le codec, **pas le poids du fichier** (un fichier de
  30 Mo peut être illisible, un de 300 Mo parfaitement lu). La couche média est
  précisément ce qui évite les scintillements en 8K en mode sphère (voir le README de
  Respire). Si une vidéo ne se lit pas, essaie un autre codec (VP9, H.264, H.265) ou une
  résolution plus basse (5760×2880).
- Vidéo 16:9 (1920×1080, 3840×2160) : étirée sur toute la sphère, ce qui est correct si
  elle a été exportée ainsi depuis du 360° (cas le plus courant). Si elle contient du
  2:1 avec des bandes noires, règle `VIDEO_LETTERBOX`.
- La vidéo se charge dès l'ouverture de la page (muette, donc lecture automatique
  autorisée) ; la barre de chargement suit le téléchargement. Appuyer sur « Entrer »
  avant la fin n'est pas bloquant : le décor apparaît en fondu dès qu'il est prêt.

### Éclairage des modèles 3D (sans HDRI)
Les HDRI servaient aussi d'éclairage ambiant aux modèles 3D. À la place :
une lumière hémisphérique (un peu plus forte qu'avant) **teintée par la vidéo** :
la zone devant toi est échantillonnée dans une miniature de 16×8 px, une première fois
avant l'entrée en VR puis toutes les 15 s (jamais plus souvent, pour ne pas provoquer
d'à-coup dans le casque). `AMBIENT_FROM_VIDEO = false` désactive ; si la lecture de
l'image est impossible (couche média), les couleurs par défaut restent.

## Ce qui n'a pas changé
Oiseaux (36 espèces, Xeno-canto, un nouvel oiseau toutes les 20 s, ordre aléatoire,
fiche avec photo Wikipedia + sonogramme), papillon et libellule `.glb` (battement
d'ailes par calcul des sommets, trajectoire de vol), gaussian splat (fraxinelle),
pollen, rayons de lumière, ombres de contact, sons de forêt avec fondus, mode AR
téléphone, qualité réduite sur mobile, service worker.

Les rayons de lumière (`godRaysGroup`) sont orientés vers un « soleil » fixe : ils ne
suivent pas la lumière de la vidéo. Si ça jure avec ton décor, mets `rayCount` à 0 dans l'objet `QUALITY` (en haut de `index.html`).

## Fichiers inutiles maintenant
`assets/env/*.exr` et `assets/env/thumbs/` ne sont plus utilisés : tu peux les
supprimer du dépôt (ce sont les plus gros fichiers du projet).

## Service worker
Pages en « réseau d'abord » (une mise à jour arrive tout de suite, au lieu de
l'ancienne version restée en cache), Three.js en « cache d'abord ». Les médias
(vidéo, `.mp3`) ne passent pas par le service worker : il gère mal les requêtes
Range, et le cache HTTP du navigateur s'en occupe très bien. Cache : `clairiere-v16`.

## Ce qui n'a pas pu être testé (à valider sur le casque)
Pas de casque ici : la logique est vérifiée par analyse statique (aucun identifiant
non défini, aucune erreur d'ordre d'initialisation, ids HTML présents) et par
simulation pour la recherche du fichier. À vérifier : que la vidéo s'affiche et
tourne en boucle, son orientation, la lisibilité des fiches d'oiseaux sur le nouveau
fond, et l'éclairage des modèles 3D.

## Oiseaux modélisés sur la branche (novembre 2026)

Chaque espèce appelée via Xeno-canto a maintenant son oiseau 3D : il arrive en vol, se
pose sur la branche, vit (regarde, se lisse, sautille), ouvre le bec en rythme avec
l'enregistrement, puis s'envole avant le suivant.

- `assets/oiseaux/oiseaux.js` : le moteur (plumes, squelette, comportements, branche) et les
  36 espèces. Aucun fichier de modèle : tout est généré, d'où un seul fichier de 260 Ko.
  Il utilise le Three.js 0.160 déjà chargé par la page.
- `oiseaux.html` : banc d'essai pour regarder chaque espèce de près sur ordinateur.
- La branche prend la taille de l'oiseau et le perchoir se place plus ou moins loin
  (roitelet à 0,8 m, buse à 2,2 m). Réglages en tête de la section « PERCHOIR » de
  `index.html` : `PERCH_DIRECTION`, `PERCH_HEIGHT`, `PERCH_TURN_DEG`.
- Deux versions : complète (ordinateur, ~110 000 triangles) et allégée (casque et
  téléphone, ~55 000). Choix automatique ; forcer avec `?oiseaux=leger` ou `?oiseaux=complet`.
- `?oiseau=merle` : toujours la même espèce, pour l'examiner.
- Ordinateur : glisser pour tourner la tête, molette pour zoomer.
- AR : le décor vidéo est coupé et la scène est recalée devant soi au lancement.
