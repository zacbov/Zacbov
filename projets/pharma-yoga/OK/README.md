# Respire — respiration guidée en VR (Quest)

Une sphère qui respire, des techniques présentées par ce qu'elles apportent
(« Pause calme », « Évacuer le stress », « Avant de dormir »…), un décor vidéo
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
  1.webm  2.webm  3.webm … ← décors vidéo 360°, numérotés sans trou
```
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
- Lecture en boucle, muette, sur une **sphère vue de l'intérieur**. (Un
  `scene.background` Three.js ne se rafraîchit pas pour une vidéo — il
  figerait la première image. Même remarque pour le décor vidéo de Clairière.)
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
- Menu : « Décor : Aléatoire / 1 / 2 / 3… » (les numéros détectés
  automatiquement). Sans aucune vidéo trouvée, retour au ciel étoilé.
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
4. Copie l'URL affichée en haut de l'onglet *Données*
   (`https://…-default-rtdb.europe-west1.firebasedatabase.app`) dans
   **`FIREBASE_DB_URL`**, dans `index.html` **et** `battement.html`.

**Utilisation** : bouton discret « 💓 Suivre mon pouls » sous le menu → un code
de 5 caractères s'affiche. Sur son téléphone : ouvrir `battement.html`, taper le
code, « Démarrer la mesure », doigt sur l'objectif. Le BPM apparaît dans le
casque sous le texte. Tant que l'option n'est pas activée : aucun appel réseau
pour le pouls, aucun panneau.

**Données** : un nombre et un horodatage sous un code aléatoire, sans aucune
identité. À chaque retour au menu, le casque **efface** la valeur et **change de
code** (la page peut rester ouverte d'un utilisateur à l'autre). C'est de la donnée
de santé, même anonyme : si tu l'utilises à grande échelle à la fac, mieux vaut
le dire aux utilisateurs.

**Qualité de mesure** (`battement.html`) : seuls les relevés stables
(4 estimations cohérentes d'affilée, intervalles réguliers) sont envoyés ; sinon
le casque affiche « en attente » plutôt qu'un chiffre faux. Seuils fixés à vue
(`QUALITY_THRESHOLDS`) — à recalibrer sur 2-3 téléphones. Précision correcte
pour un repère, pas pour un usage médical.

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

## Ce qui n'a PAS pu être testé (à valider sur le casque)
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
