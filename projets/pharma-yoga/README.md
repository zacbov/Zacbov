# Respire — respiration guidée en VR (Quest)

Un guide de respiration (« Inspirez / Expirez » + décompte), des techniques
présentées par ce qu'elles apportent (« Pause calme », « Évacuer le stress »…), un décor vidéo
360° en boucle, deux musiques enchaînées et des sons d'ambiance. Choisir une
technique sur l'écran plat t'emmène **directement en VR**.

## Arborescence attendue

```
index.html          battement.html (page téléphone, optionnelle)
sw.js               manifest.json
audio/
  Weightless Drift.mp3     ← musique (enchaînée avec la suivante, en boucle)
  Still Waters.mp3         ← musique
  ruisseau.mp3             ← ambiance (boucle seule)
  vague.mp3                ← ambiance (boucle seule)
asset/                     ← (ou assets/, assets/video/, video/)
  ruisseau.webm  plage.webm  forêt.webm  phare.webm   ← décors vidéo 360°, par NOM
```
Les décors sont cherchés par nom (liste `DECORS` en haut de `index.html`, qui
fixe aussi l'ordre du menu). Acceptés : `.webm` ou `.mp4`, majuscule initiale ou
non (`Plage.webm`), et pour la forêt `forêt`, `foret` ou `fôret`. Un décor absent
est simplement retiré du menu (avertissement orange). Pour ajouter un décor :
une ligne dans `DECORS`.
Les dossiers sont cherchés dans l'ordre indiqué par `AUDIO_DIRS` / `VIDEO_DIRS`
(en haut de `index.html`). Les noms avec espaces sont gérés. Si un fichier audio
manque, un avertissement orange s'affiche dans le menu.

## Commandes en VR (manettes Quest)
Il n'y a pas de bouton à viser : tout passe par les boutons physiques.

| Action | Commande |
|---|---|
| Sons d'ambiance : aucun → ruisseau → vague → aucun | **Gâchette** (la 1ʳᵉ pression ferme le tutoriel) |
| Musique on / off | **A** ou **X** |
| Décor vidéo suivant | **Clic du joystick** |
| Revenir au menu (changer de technique) | **Maintenir B ou Y pendant 2 s** (barre de progression) |

L'aide des commandes **s'efface au bout de 4 s** sans toucher les manettes
(`HUD_AUTOHIDE_SEC`) et revient dès qu'on pose le doigt sur un bouton, qu'on en
presse un ou qu'on pousse un joystick. Un pouce posé en permanence sur le
joystick ne la garde pas affichée (seul le début du contact compte).

Choix volontaire : la gâchette latérale (grip) n'est **pas** utilisée, parce
qu'on la presse sans le vouloir dès qu'on serre la manette — le retour au menu
exige donc un geste long et délibéré. Les mêmes réglages (musique, ambiance,
décor) existent aussi dans le menu avant d'entrer. Un tutoriel s'affiche
14 s à l'entrée en VR, et une aide discrète reste visible sous le texte de respiration.
Les deux boucles d'ambiance ne se mélangent jamais : une seule à la fois,
bascule en fondu.

## Audio
- **Musique** : les deux morceaux s'enchaînent en boucle avec fondu enchaîné de 4 s
  (et fondu d'entrée/sortie à l'activation/désactivation).
- **Ambiance** : une seule boucle (ruisseau **ou** vague), fondu enchaîné de 3 s
  sur elle-même pour qu'on n'entende pas la jonction.
- Plus aucun son aux changements de phase (le repère reste visuel).
- Réglages par défaut : musique activée, ambiance désactivée (`DEFAULT_AUDIO`),
  volumes (`MUSIC_VOLUME`, `AMBIENCE_VOLUME`) en haut de `index.html`.

## Décor vidéo 360°
- **Dans le casque : couche média WebXR** (`USE_XR_MEDIA_LAYER = true`). La vidéo
  est confiée directement au compositeur du Quest, au lieu d'être recopiée à
  chaque image dans une texture WebGL. C'est la correction des artefacts et du
  scintillement en 8K (voir ci-dessous). Fondus et assombrissement
  (`VIDEO_BRIGHTNESS`) passent par un voile noir dessiné par-dessus.
- **Repli automatique** sur l'ancienne sphère WebGL : aperçu sur PC, navigateur
  sans couches WebXR, ou `VIDEO_LETTERBOX` > 0 (la couche ne sait pas rogner).
  Le tutoriel d'entrée en VR indique en petit, en haut à droite, le mode utilisé
  (« vidéo : couche média » ou « vidéo : sphère WebGL »).
- `VIDEO_STEREO` : `'mono'` par défaut ; `'stereo-top-bottom'` si un jour tu as
  des vidéos 3D dessus/dessous.

### Pourquoi la 8K scintillait
Ce n'est pas la géométrie de la sphère, c'est le trajet de l'image. En mode
sphère, chaque image décodée (7680×3840 ≈ 33 Mpx, ~118 Mo non compressés) est
recopiée dans une texture WebGL, 30 fois par seconde. Le GPU mobile du Quest
n'arrive pas à suivre (images sautées ou à moitié copiées → artefacts), et la
texture n'a pas de mipmaps : quand plusieurs pixels vidéo tombent sur un seul
pixel d'écran (surtout vers le haut et le bas de la sphère), l'image fourmille.
Le débit du fichier (10 ou 80 Mo) n'y change rien. La couche média évite les
deux problèmes : pas de copie, et un seul rééchantillonnage, fait par le
compositeur à la résolution de l'écran.

**Limite restante (non testable sans casque)** : le décodeur matériel. Le Quest 3
est donné pour la 8K ; sur Quest 2, la 8K VP9 est à la limite. Si la 8K reste
saccadée même en mode couche média, **5760×2880 (5,7K)** est le meilleur
compromis netteté/fluidité. En mode sphère (repli), reste en 4K.
- (Un `scene.background` Three.js ne se rafraîchit pas pour une vidéo — il
  figerait la première image : c'est pour ça qu'on ne l'utilise pas.)
- **Format 1920×1080** : la vidéo est étirée sur toute la sphère, ce qui est
  correct si elle a été exportée ainsi depuis du 360° (anamorphique, cas le
  plus courant). Si elle contient en fait du 2:1 avec des bandes noires
  haut/bas, règle `VIDEO_LETTERBOX` (ex. `0.0556`).
- **Orientation** : `VIDEO_YAW_DEG` (défaut −90°) met le centre de l'image
  face à l'utilisateur ; ajuste si l'horizon ou le « devant » ne convient pas.
  `VIDEO_BRIGHTNESS` assombrit un peu pour la lisibilité du texte.
- **Netteté** : 1920 px sur 360° = ~5 px/degré, un casque en résout 20 à 25.
  Ça marchera mais restera doux ; si tu peux, privilégie 3840×1920 (ou au
  moins 2880×1440) en VP9, débit modéré.
- Menu : « Décor : Aléatoire / Ruisseau / Plage / Forêt / Phare » (seulement
  ceux trouvés). Sans aucune vidéo trouvée, retour au ciel étoilé.
- `.webm` (VP9) et `.mp4` (H.264) acceptés. Si une vidéo ne se lit pas sur le
  casque, c'est presque toujours le codec : réencode en VP9 ou H.264.

## Relais gratuit du pouls (remplace kvdb.io, payant)
Le casque ne peut pas lire un capteur Bluetooth (le navigateur Quest bloque le
Web Bluetooth). Le téléphone mesure le pouls par la caméra (`battement.html`) et
l'écrit dans une petite base en ligne que le casque relit toutes les 2 s.

**Pourquoi Firebase** : ntfy.sh public est limité à 250 messages/jour/IP (un
WiFi de fac partage les IP), PubNub/Ably demandent des clés. Firebase Realtime
Database est gratuit (offre Spark, sans carte bancaire — vérifie les limites
actuelles dans la console), accessible par simple `fetch` depuis une page
statique, et très largement au-dessus du besoin (quelques centaines d'octets
par séance).

**Mise en place (≈5 min, une seule fois)**
1. <https://console.firebase.google.com> → *Ajouter un projet* (Analytics inutile).
2. *Build → Realtime Database → Créer une base de données* (région Belgique
   `europe-west1`, mode **verrouillé**).
3. Onglet **Règles** → coller ceci → *Publier* :
```json
{
  "rules": {
    ".read": false,
    ".write": false,
    "hr": {
      "$code": {
        ".read": true,
        ".write": true,
        ".validate": "$code.matches(/^[A-Z0-9]{4,8}$/) && newData.hasChildren(['bpm', 't'])",
        "bpm": { ".validate": "newData.isNumber() && newData.val() >= 30 && newData.val() <= 220" },
        "t":   { ".validate": "newData.isNumber()" },
        "$other": { ".validate": false }
      }
    }
  }
}
```
   (Seules des valeurs 30–220 sous un code de 4 à 8 caractères sont acceptées ;
   la liste des codes n'est pas lisible.)
4. L'URL est déjà en place dans **`FIREBASE_DB_URL`** (`index.html` **et**
   `battement.html`) : `https://pharma-yoga-default-rtdb.europe-west1.firebasedatabase.app`.

**Utilisation** : bouton discret « 💓 Suivre mon pouls » sous le menu → un code
de 5 caractères s'affiche. Sur son téléphone : ouvrir `battement.html` (ou
`battement.html?code=XXXXX`), taper le code (il est mémorisé), « Démarrer la
mesure », doigt sur l'objectif. **Le menu du casque confirme la réception**
(« ✓ Reçu du téléphone : 67 bpm ») avant même de mettre le casque. En VR, le BPM
apparaît sous le texte ; tant que rien n'arrive, le panneau affiche le code
attendu ou l'erreur (règles Firebase, réseau). Une mesure interrompue reste
affichée en grisé 45 s. Tant que l'option n'est pas activée : aucun appel
réseau pour le pouls, aucun panneau.

**Pourquoi le pouls n'arrivait pas au casque** (corrigé) : le casque changeait
de code à chaque retour au menu, alors que le téléphone continuait d'écrire sous
l'ancien — les valeurs arrivaient sur Firebase, mais à une adresse que le casque
ne lisait plus. Et le service worker servait l'ancien `index.html` depuis son
cache (« cache d'abord »), donc une URL Firebase corrigée pouvait ne jamais
arriver sur le casque. Désormais le code reste le même tant que la page est
ouverte, et les pages sont chargées « réseau d'abord ».

**Données** : un nombre et un horodatage sous un code aléatoire, sans aucune
identité. À chaque retour au menu, le casque **efface** la valeur. Pour la
personne suivante, bouton **« 🔄 Nouveau code »** dans le menu. C'est de la donnée
de santé, même anonyme : si tu l'utilises à grande échelle à la fac, mieux vaut
le dire aux utilisateurs.

**Qualité de mesure** (`battement.html`) — refaite :
- L'exposition n'est plus verrouillée au démarrage. Elle se figeait sur la
  lumière de la pièce, puis le doigt plongeait l'image dans le noir, ce que
  l'ancienne version prenait pour « doigt trop appuyé » (d'où le message
  permanent).
- Le doigt est reconnu à sa couleur (rouge dominant), pas à une luminosité
  absolue qui varie d'un téléphone à l'autre.
- Rythme calculé par autocorrélation sur 8 s (au lieu de compter les pics),
  avec un score de qualité. Seules des valeurs stables (4 estimations cohérentes)
  sont envoyées ; filtre contre les erreurs « moitié/double ».
- Chaque image caméra est lue une seule fois avec son horodatage réel.
- Messages ciblés : doigt absent, image noire / trop peu de lumière, doigt qui
  bouge, signal faible (là seulement : « pose le doigt plus légèrement »).
- Le flash est allumé quand le téléphone le permet (pas sur iPhone : se mettre
  face à une lampe). L'écran reste allumé pendant la mesure.

Testé par simulation (signaux de pouls réalistes, bruit, dérive d'exposition,
images perdues) : avec flash, valeur juste à ±3 bpm en ~8 s, de 48 à 140 bpm ;
aucun faux pouls sur du bruit pur. Sans flash et avec un signal très faible, la
mesure peut ne jamais se stabiliser (elle n'envoie alors rien), et au-delà de
~120 bpm elle peut parfois afficher la moitié. Seuils regroupés dans `Q`.
Précision correcte pour un repère, pas pour un usage médical.

## Corrections de cette version
- **Horloge du moteur de respiration** : le démarrage utilisait `performance.now()`
  alors que la boucle utilisait un compteur interne, ce qui pouvait empêcher
  l'enchaînement des phases. Une seule horloge maintenant (vérifié par simulation
  sur les 6 techniques, y compris avec un démarrage tardif).
- **Étoiles** : quasi invisibles avant (réduites à 1-2 px par l'atténuation de
  distance). Shader dédié : taille en pixels, disque doux, scintillement propre
  à chaque étoile.
- **Animations en VR** : plus de `requestAnimationFrame` maison (il ne tourne
  pas pendant une session immersive) ; tout passe par la boucle de rendu.
- AR retiré. Plus de carillon. QR code retiré (impossible à scanner depuis
  l'intérieur du casque).

## Autres changements de cette version
- Sphère qui respire retirée (`SHOW_BREATH_SPHERE = false` ; `true` la remet).
  Le texte prend sa place à hauteur du regard.
- Texte « Inspirez / Expirez » réduit : `BREATH_TEXT_WIDTH` (0,36 m, avant 0,6).
- Technique « Avant de dormir » (4-7-8) retirée.
- Service worker : pages en « réseau d'abord » (`respire-v8`).

## Ce qui n'a PAS pu être testé (à valider sur le casque)
**Nouveau, à vérifier en priorité** : que le tutoriel indique bien « vidéo :
couche média » à l'entrée en VR, que la 8K est nette et stable, et que
l'orientation est la même qu'avant (sinon ajuster `VIDEO_YAW_DEG`). Si la
couche média pose problème : `USE_XR_MEDIA_LAYER = false` remet l'ancien rendu.

Je n'ai pas accès à un Quest : la logique (fondus audio, moteur de respiration,
cohérence du code) est testée par simulation, mais pas le rendu ni les manettes.
À vérifier : l'orientation/la netteté de ta vidéo, que A/X, gâchette, clic
joystick et B/Y réagissent comme prévu, la lecture des `.webm` sur le casque,
et que le tutoriel est lisible à distance.

## Limites connues
- Musiques/ambiances/vidéos ne sont pas mises en cache hors-ligne par le Service
  Worker (les requêtes Range des médias s'y prêtent mal) : le cache HTTP du
  navigateur s'en charge, mais un premier chargement sur un WiFi lent reste lent.
- Pas de bouton à viser dans le casque (pas de lancer de rayon) : tout est sur
  les boutons des manettes. Les mains seules (sans manette) ne pilotent rien.
