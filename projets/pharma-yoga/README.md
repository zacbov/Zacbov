# Respire — Cohérence & respiration guidée VR

Version indépendante de Clairière, focalisée uniquement sur la respiration
guidée. Aucun appel réseau, aucun fichier lourd (pas d'EXR, de splat, de
modèle 3D, ni de son de synthèse vocale) — tout est généré par code
(dégradé de ciel, étoiles, sphère qui respire, carillon). Ça règle d'un coup
tous les problèmes de chargement/WiFi rencontrés sur Clairière.

## Contenu du dossier
- `index.html` — l'application complète (menu, scène VR/AR, moteur de respiration)
- `sw.js` — Service Worker pour le mode hors-ligne (cache très léger, rien à précharger)
- `manifest.json` — permet d'installer un raccourci sur l'écran d'accueil du Quest

## Correctif : téléphones personnels, pas un téléphone partagé
Point clarifié après coup : chaque personne utilise **son propre téléphone**,
pas un appareil partagé au poste. Ça change deux choses :
- La remarque sur l'hygiène de l'objectif (tour précédent) ne s'applique
  plus — retirée, elle n'avait de sens que pour un téléphone commun.
- **Vrai problème corrigé** : le code de séance fixe (`"default"`) aurait fait
  se mélanger les mesures de personnes différentes dans le même compartiment
  de données si deux personnes s'enchaînent rapidement sans que la précédente
  ferme son onglet. Remplacé par un **code aléatoire à 5 caractères, généré à
  chaque session** (`generateSessionCode()` dans `index.html`), affiché via
  **QR code** (généré 100% côté client, sans appel réseau au moment de
  l'affichage — bibliothèque `qrcode` via unpkg, mise en cache comme le reste).

### Nouveau flux d'appairage
1. Sur l'écran "Entrer en VR" (avant de mettre le casque), un QR code
   s'affiche avec le lien vers `battement.html` — le code de séance est déjà
   intégré dans l'URL (`?code=XXXXX`).
2. La personne scanne avec **son** téléphone, la page s'ouvre avec le code
   déjà pré-rempli (`battement.html` lit `?code=` dans l'URL) — rien à taper.
3. Elle appuie sur "Démarrer la mesure", pose son doigt, et dès qu'une mesure
   stable est obtenue (voir le système de qualité du tour précédent), le BPM
   apparaît automatiquement dans le casque.

Comme la page se recharge normalement à chaque nouvelle session (nouvelle
personne = nouveau chargement de `index.html`), un nouveau code aléatoire est
généré à chaque fois — pas de risque de collision entre deux personnes qui se
suivent sur le poste.

## Nouveau : détection de qualité de signal (contexte poste en libre-service)
Pensé pour un déploiement sans supervision (pause déjeuner, forte rotation
d'utilisateurs) : une mesure douteuse doit être **impossible à manquer**, et
surtout **ne doit jamais atteindre le casque silencieusement**.

### États affichés (grand anneau coloré + texte court, `battement.html`)
- 🟡 **"Pose ton doigt sur la caméra arrière"** — luminosité trop élevée,
  le doigt ne couvre probablement pas bien l'objectif
- 🟡 **"Relâche un peu la pression"** — luminosité proche de zéro, doigt qui
  écrase trop fort (plus aucune lumière ne passe)
- 🟠 **"Reste immobile quelques secondes"** — signal trop erratique
  (amplitude insuffisante ou intervalles entre battements trop irréguliers)
- 🔵 **"Mesure en cours / Stabilisation…"** — signal exploitable mais pas
  encore assez d'estimations cohérentes d'affilée (4 requises,
  `goodStreakNeeded`)
- 🟢 **"Mesure stable"** — c'est SEULEMENT à ce stade que le BPM s'affiche
  et part vers le casque

### Le point important : filtrage strict, pas juste un avertissement
`sendHeartRate()` n'est appelé qu'à un seul endroit dans tout le code — la
toute fin de `computeBPM()`, uniquement quand l'état "good" est atteint (4
estimations cohérentes d'affilée, régularité des intervalles vérifiée). Une
mesure de mauvaise qualité ne peut donc **jamais** arriver jusqu'au casque,
même silencieusement : au pire, l'utilisateur VR voit "📱 En attente du
téléphone…" plus longtemps, jamais un chiffre faux affiché avec assurance.

### Réinitialisation automatique entre utilisateurs
Quand le doigt est retiré (retour à l'état "pose ton doigt"), l'historique de
mesure est vidé (`resetMeasurementState()`) — la personne suivante démarre
sur une mesure propre, sans pollution par les données de la précédente.

### ⚠️ Seuils à recalibrer sur place
Tous les seuils de détection (`QUALITY_THRESHOLDS` en haut du script de
`battement.html`) ont été fixés à vue, sans pouvoir tester sur du vrai
matériel — les caméras/flashs varient beaucoup d'un téléphone à l'autre.
**Teste avec 2-3 téléphones différents avant le déploiement** et ajuste :
- `noFingerBrightness` / `overPressureBrightness` si les états "pose ton
  doigt" ou "relâche la pression" se déclenchent alors que la mesure est
  correcte (ou inversement, ne se déclenchent jamais)
- `maxIntervalCV` si l'état "reste immobile" est trop strict (déclenché en
  permanence) ou pas assez (accepte des mesures visiblement erratiques)

### À considérer pour un déploiement en libre-service (au-delà du code)
- **Batterie du téléphone de chaque personne** : le flash reste allumé
  pendant la mesure — négligeable pour un usage bref (quelques minutes), pas
  un vrai souci vu que c'est le téléphone personnel de chacun, pas un
  appareil laissé allumé en continu au poste
- **Bouton de réinitialisation manuel** : utile en complément du reset
  automatique, si quelqu'un veut relancer une mesure sans retirer le doigt
  entièrement (pas encore implémenté)
- **Panneau explicatif près du casque** : une petite affiche/écran expliquant
  "scanne ce QR avec ton téléphone si tu veux voir ton pouls pendant la
  séance" aiderait — le QR apparaît déjà dans le casque avant l'entrée en VR,
  mais une personne qui découvre le poste sans lire l'écran pourrait le rater

## Nouveau : particules respirantes, respiration du point de vue
- **Particules respirantes** : 36 particules discrètes autour de la sphère,
  montent à l'inspiration et redescendent à l'expiration (opacité qui varie
  aussi) — écho du pollen de Clairière, mais synchronisé au souffle plutôt
  qu'en dérive libre.
- **Respiration du point de vue** : très légère amplitude verticale (quelques
  millimètres) appliquée au rig, synchronisée à `breathProgress01` — monte à
  l'inspiration, descend à l'expiration. Toujours appliquée au rig et jamais
  à la caméra directement, pour rester compatible avec le tracking VR.

## Nouveau : rythme cardiaque en temps réel (via une page téléphone séparée)
Le casque Quest ne peut pas lire directement un capteur Bluetooth (le
navigateur Quest bloque le Web Bluetooth, contrairement à Chrome Android —
voir plus bas). Solution : une page dédiée à ouvrir sur le téléphone
(`battement.html`), qui mesure le pouls **par la caméra** (méthode PPG
classique : doigt sur l'objectif + flash, variation de luminosité du canal
rouge à chaque battement, détection de pics) et envoie la valeur au casque
via un petit relais en ligne gratuit.

### Mise en place (une seule fois)
1. Crée un bucket kvdb.io (gratuit, juste un email, pas de vrai compte) :
   ```
   curl -d 'email=ton@email.com' https://kvdb.io
   ```
   Ça renvoie un identifiant du type `Fd55uogXyxYdnXJvnyN8Xo`.
2. Colle cet identifiant dans **`KVDB_BUCKET`**, à l'identique dans
   `index.html` ET `battement.html`.
3. Héberge normalement (même repo/dossier que le reste).

### Utilisation
1. Sur le téléphone : ouvre `battement.html`, appuie sur "Démarrer la
   mesure", pose le doigt sur l'objectif arrière (et le flash s'il est juste
   à côté) sans trop appuyer, reste immobile quelques secondes.
2. Sur le casque : le BPM apparaît automatiquement sous le texte de
   respiration dès que le téléphone commence à envoyer des valeurs (sondage
   toutes les 2s). "📱 En attente du téléphone…" tant qu'aucune donnée n'est
   arrivée depuis plus de 8s.
3. Le "code de séance" (par défaut `default`) permet de distinguer plusieurs
   séances en parallèle si besoin un jour — laisse tel quel pour un usage solo.

### Limites à connaître
- **Précision** : la méthode caméra est correcte pour un ordre de grandeur et
  une tendance, mais moins précise qu'une vraie ceinture pectorale Bluetooth
  (type Polar H10). Suffisant pour donner un repère pendant une séance de
  respiration, pas pour un usage médical.
- **Web Bluetooth sur Quest** : la vraie solution "casque lit directement un
  capteur BLE" existe (protocole standard, gratuit, capteurs de ceinture
  largement disponibles) mais le navigateur Quest la bloque actuellement
  (rapporté par la communauté développeurs Meta, juillet 2025) — d'où ce
  contournement par téléphone. Si Meta corrige ça un jour, on pourra
  simplifier en lisant directement le capteur depuis le casque.
- **Sécurité du bucket** : laissé en accès libre par défaut (comme conçu pour
  ce cas d'usage) — largement suffisant pour un simple BPM à usage personnel,
  mais à garder en tête si tu envisages d'y stocker un jour autre chose de
  plus sensible (dans ce cas, utilise les clés d'accès kvdb.io documentées
  sur kvdb.io/docs/api/).

## Comment ça marche
1. **Menu de sélection** : 6 techniques au choix, chacune avec son propre
   rythme de phases (`TECHNIQUES` dans `index.html`) :
   - **Respiration en carré** : 4s inspire / 4s retiens / 4s expire / 4s retiens
   - **4-7-8** : 4s inspire / 7s retiens / 8s expire
   - **Cohérence cardiaque** : 5s inspire / 5s expire
   - **Triangle (5-5-5)** : 5s inspire / 5s retiens / 5s expire
   - **Respiration apaisante (4-8)** : 4s inspire / 8s expire (expiration longue)
   - **Soupir physiologique** : double inspiration courte (2s + 1s) suivie
     d'une longue expiration (6s) — technique de décharge rapide de tension
2. **Sphère qui respire** : grossit à l'inspiration, se contracte à
   l'expiration, reste stable pendant les temps de rétention. Teinte qui
   varie doucement (plus froide à pleine inspiration). Le moteur interpole
   désormais depuis l'échelle réelle au début de chaque phase (pas toujours
   depuis min/max) — nécessaire pour le soupir physiologique, où la seconde
   inspiration reprend là où la première s'est arrêtée plutôt que de repartir
   de zéro.
3. **Panneau texte** : mot de la phase en cours ("Inspirez"/"Retenez"/"Expirez")
   + décompte en secondes, toujours tourné vers le spectateur.
4. **Carillon doux** : une note différente à chaque début de phase (plus
   aiguë pour inspirer, plus grave pour expirer), générée par Web Audio API
   — aucun fichier audio.
5. Aucun guidage vocal (choix assumé, pas de synthèse vocale ni de
   speech-to-text dans cette version).

## Installation / hébergement
Même principe que Clairière : héberger en HTTPS (GitHub Pages, Netlify...),
charger une première fois pour que le Service Worker mette tout en cache,
puis "Ajouter à l'écran d'accueil" pour un raccourci utilisable hors-ligne
ensuite. Vu la légèreté de cette version (aucun gros fichier), le premier
chargement devrait être quasi instantané, même sur un WiFi limité.

## Personnalisation facile
- **Ajouter une technique** : une entrée dans `TECHNIQUES` (`index.html`),
  avec sa liste de phases (`label`, `type`: `grow`/`shrink`/`hold`, `dur` en
  secondes) — le moteur de respiration et l'UI s'adaptent automatiquement,
  rien d'autre à modifier.
- **Couleur/ambiance** : `makeSkyGradientTexture()` pour le dégradé de fond,
  `sphereMat` pour la couleur de base de la sphère.
- **Durée de session** : actuellement la session tourne en continu tant que
  l'utilisateur reste en VR/AR (pas de minuteur de fin). Facile à ajouter si
  souhaité (ex: fondu au noir après N cycles).

## Pistes pour plus tard (non implémentées)
- Minuteur de session avec fondu de fin en douceur
- Sauvegarde de la technique préférée (`localStorage`/`window.storage`)
- Vibration légère du contrôleur au changement de phase (retour haptique)
