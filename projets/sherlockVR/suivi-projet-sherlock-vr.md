# Suivi de projet — Sherlock VR/AR "L'Enquête Miroir Space-Time"

## 🎯 Concept validé

Jeu asymétrique à deux joueurs :
- **Watson (téléphone, AR)** explore la scène de crime en réalité augmentée dans son propre espace physique
- **Holmes (casque, VR)** explore un Palais de la Mémoire avec les mêmes indices sous forme d'objets 3D géants manipulables
- Les deux joueurs doivent croiser leurs observations à voix haute pour valider chaque piste

## 📍 Scène choisie pour le prototype

**Le salon du 221B Baker Street cambriolé**, retenue plutôt que La Vallée de la Peur (chambre close) ou Le Chien des Baskerville (lande extérieure), car :
- Espace intérieur, transposable dans n'importe quel salon réel
- Désordre riche en micro-indices, adapté à la mécanique "objet retourné = détail secret"
- Échelle humaine gérable assis ou debout

## 🗺️ Structure de la scène : 4 zones d'indices

| # | Zone | Statut |
|---|------|--------|
| 1 | Bureau renversé | ✅ Détaillé |
| 2 | Bibliothèque saccagée | ✅ Détaillé |
| 3 | Cheminée | ✅ Détaillé |
| 4 | Fenêtre forcée | ✅ Détaillé |

## 🔧 Indices détaillés

### Indice 1 — Bureau renversé
- **Geste AR** : s'accroupir pour voir sous le bureau, repérer une fente suspecte à l'arrière d'un tiroir
- **Geste VR** : saisir le tiroir, le retourner à 180°, appuyer sur le fond pour révéler un double-fond
- **Révélation** : inscription gravée *"Pour Moriarty seul — 14"*
- **Type de mécanique VR** : retournement + pression

### Indice 2 — Bibliothèque saccagée
- **Geste AR** : balayage latéral devant l'étagère pour repérer un livre manquant via une trace de poussière anormale
- **Geste VR** : localiser deux fragments distincts (signet + page arrachée) dans le Palais, les rapprocher pour les fusionner
- **Révélation** : message manuscrit *"Rendez-vous au 14, comme convenu"*
- **Type de mécanique VR** : recherche + assemblage de deux objets
- **Particularité** : recoupement direct avec l'indice 1 (le chiffre "14" revient) → cohérence interne du scénario

### Indice 3 — Cheminée
- **Geste AR** : s'approcher physiquement de la cheminée, orienter le téléphone en plongée pour voir dans le foyer, repérer un fragment de tissu non consumé dans les cendres encore tièdes
- **Geste VR** : fouiller le tas de cendres à la main (préhension fine), suivre le retour haptique gradué jusqu'au point de vibration maximale, extraire le fragment avec le trigger
- **Révélation** : un bouton de manteau à moitié calciné, avec un blason gravé
- **Type de mécanique VR** : fouille haptique (nouvelle mécanique, distincte des deux premières)
- **Particularité** : premier indice qui pointe vers l'identité du coupable plutôt que vers la logistique du crime

### Indice 4 — Fenêtre forcée
- **Geste AR** : s'accroupir, incliner le téléphone à angle rasant pour révéler une empreinte de semelle nette dans la boue (motif de croix au talon)
- **Geste VR** : sélectionner une botte parmi plusieurs suspects, la retourner, superposer la semelle sur un gabarit translucide représentant l'empreinte (aimantation légère pour l'alignement)
- **Révélation** : correspondance visuelle immédiate (vert = match, rouge = rejet)
- **Type de mécanique VR** : comparaison par superposition (4e mécanique distincte)
- **Particularité** : seul indice qui identifie formellement le coupable, plutôt qu'un lien logistique ou narratif

## ✅ Les 4 indices du prototype sont complets

Récapitulatif des 4 mécaniques VR distinctes couvertes :
1. Retourner + presser (bureau)
2. Rechercher + assembler deux fragments (bibliothèque)
3. Fouille haptique graduée (cheminée)
4. Comparaison par superposition (fenêtre)

## 🏠 Mapping AR pour salons de tailles différentes

- **Décision validée** : ancrage indépendant par zone — chaque zone (bureau, bibliothèque, cheminée, fenêtre) est ancrée séparément sur une surface détectée par le joueur (table → bureau, mur → bibliothèque, etc.), plutôt qu'un redimensionnement global de la scène
- **Justification** : plus simple à tester avec du matériel ARKit/ARCore standard, et cohérent avec l'esprit "chaque joueur inspecte sa propre pièce" plutôt qu'une reproduction fidèle et à l'échelle du 221B
- **Implication** : prévoir une étape d'installation où le joueur place manuellement chaque zone au début de la partie

## 🕵️ Scénario narratif

- **Coupable** : Colonel Sebastian Moran, ancien complice de Moriarty
  - Recoupement : "Moriarty" (indice 1) + blason du régiment (indice 3) + botte militaire à motif croix (indice 4)
  - Mobile : récupérer un document compromettant contre Moriarty (pas un vol crapuleux)
  - Le chiffre "14" apparaît deux fois (bureau + livre reconstitué) = heure du rendez-vous avec un complice
- **Fausses pistes (2)**
  1. Mrs. Hudson — a rangé certaines affaires par réflexe, brouille des traces, mais aucun mobile
  2. Collectionneur rival — gant oublié lors d'une visite légitime la veille, parti avant le vol
- **Condition de résolution** : accusation valide seulement si les 4 indices sont cross-checkés ET recoupés entre eux (pas juste 1 indice isolé) — prévoir une pénalité en cas d'accusation prématurée

## 🎲 Génération aléatoire des indices

- **Niveau cosmétique** : inscriptions, motifs, couleurs, chiffres — piochés dans une liste de variantes à chaque partie
- **Niveau positionnel** : emplacement de chaque indice dans sa zone (ex : quel tiroir, quel endroit de l'étagère) varie parmi 2-3 possibilités, pour forcer une vraie recherche côté AR
- **Niveau structurel (garde-fou anti-triche principal)** : le coupable et les 2 fausses pistes sont piochés à chaque partie parmi un pool de suspects plus large — connaître "l'histoire type" ne suffit pas
- **Mécanisme technique** : seed aléatoire généré au lancement, stocké sur le serveur relais, distribué aux deux clients pour garantir une version cohérente entre Watson et Holmes

## 🏗️ Architecture technique

- **Principe clé** : pas besoin de synchronisation spatiale entre les deux espaces — le Palais VR est un espace mental abstrait, indépendant de la géométrie du salon réel du joueur AR. Simplifie fortement l'architecture.
- **Backend** : serveur relais léger (Photon Fusion / Colyseus / WebSocket-Firebase) qui ne synchronise que des événements ("indice trouvé", "objet retourné", "match validé/rejeté") — pas de géométrie lourde, donc latence non-critique
- **Client AR (téléphone)** : ARKit/ARCore ou WebXR, détection de surfaces du salon réel, envoi des événements d'observation
- **Client VR (Quest 3)** : Unity + OpenXR (cohérent avec l'écosystème Meta), réception des événements AR, traduction en état du Palais mental
- **Communication vocale** : directe si même pièce ; sinon canal VoIP externe (Discord pour le prototype, WebRTC natif pour une version finale)

## 🔄 Pivot d'architecture — Abandon d'Unity au profit du tout-WebXR

- **Décision** : le client VR (Quest 3) est réécrit en WebXR (JavaScript/Three.js) plutôt qu'en Unity/C#, car le navigateur du Quest 3 supporte nativement les sessions `immersive-vr`
- **Justification** : évite complètement Unity, le build natif Android/Quest, et l'installation de SDK — cohérent avec le client AR déjà en WebXR
- **Conséquence** : le dossier `SherlockVR-Unity/` (scripts C#) devient une piste alternative/de secours, non prioritaire — le développement se poursuit désormais côté web
- **Contrainte non-négociable à retenir** : WebXR exige HTTPS (sauf localhost strict). Pour tester entre deux appareils physiques différents (téléphone + Quest 3), il faut héberger les fichiers en HTTPS — solution simple : tunnel `ngrok` pointé sur le serveur relais, ou hébergement statique (GitHub Pages, Vercel…)
- **Limite persistante** : aucun test sur matériel réel n'a été fait — impossible à faire depuis cet environnement, à valider par l'utilisateur

## 🧪 Ordre de prototypage

- **Décision validée** :
  1. Client AR seul (sans VR, sans backend) — brique la plus risquée techniquement (détection de surfaces, ancrage stable des 4 zones), testable isolément
  2. Backend événementiel minimal (WebSocket basique pour commencer, pas besoin de Photon dès le prototype) — simulation manuelle des événements avant d'avoir le client VR
  3. Client VR (Unity + OpenXR sur Quest 3) — territoire technique bien balisé, peut attendre que les deux premières briques soient validées
- **Justification** : si l'ancrage par zone ne fonctionne pas bien en pratique côté AR, ça remet en cause la décision de mapping — mieux vaut le découvrir tôt, avant d'investir dans le backend ou le client VR

### Statut brique 1 — Client AR (Zone 1 : Bureau)

- ✅ **Livré** : `sherlock-ar-prototype-zone1.html` — page WebXR standalone, testable directement sur Chrome Android (ARCore), sans build natif
- Fonctionnalités couvertes : détection de surface (hit-test + reticle), ancrage au toucher, révélation de l'indice (double-fond) au second toucher
- **À tester par l'utilisateur** : ouvrir le fichier sur un téléphone Android compatible ARCore, valider que l'ancrage est stable et que le geste "toucher pour révéler" est naturel
### Statut brique 2 & 3 — Backend relais + Client VR (code source)

- ✅ **Livré** : dossier `SherlockVR-Unity/` contenant
  - `Scripts/ClueObject.cs` — classe de base pour tout indice manipulable
  - `Scripts/CaseManager.cs` — seed reçu du relais (plus de génération locale au démarrage), coupable, fausses pistes, condition de résolution
  - `Scripts/NetworkClient.cs` — client WebSocket, synchro réelle du seed avec repli local si le relais est injoignable après 5s
  - `Scripts/AccusationUI.cs` — écran d'accusation final (verdict correct/erroné, protection contre l'accusation prématurée)
  - `Scripts/Clues/DrawerClue.cs` — indice 1 complet (retourner + presser)
  - `Scripts/Clues/BookAssemblyClue.cs` — indice 2 complet (recherche + assemblage de fragments)
  - `Scripts/Clues/AshSearchClue.cs` — indice 3 complet (fouille haptique graduée, retour vibratoire à la manette)
  - `Scripts/Clues/BootCompareClue.cs` — indice 4 complet (comparaison par superposition)
  - `Server/relay-server.js` — serveur relais Node.js, génère et diffuse le seed de partie
  - `README.md` — instructions d'installation Unity + serveur, à jour
- ✅ **Pont réseau AR↔relais réalisé** : `sherlock-ar-prototype-zone1.html` se connecte désormais au serveur relais, reçoit le seed de partie, et échange des événements réels avec le client VR pour l'indice 1 (boucle bout-en-bout fonctionnelle sur cette zone)
- ✅ **Client VR réécrit en WebXR** : `sherlock-vr-client.html` — page standalone testable directement dans le navigateur du Quest 3, sans Unity ni build
- ✅ **Les 4 indices sont désormais tous portés en JS côté client VR** :
  - Indice 1 (tiroir) : grab, retournement mesuré par angle de quaternion, pression via raycasting
  - Indice 2 (livre) : deux fragments saisissables simultanément (un par main), fusion à la distance
  - Indice 3 (cendres) : détection de proximité par manette + retour haptique réel (gamepad.hapticActuators), extraction par gâchette
  - Indice 4 (botte) : superposition avec seuil de distance et d'angle, snap final et changement de couleur du gabarit
  - Chaque indice envoie son propre événement `clue_revealed_vr` au serveur relais
- ✅ **Client AR généralisé** : réagit désormais à n'importe quel indice révélé côté VR, pas seulement l'indice 1
- ✅ **Rendu amélioré** (sans aucun asset externe, tout généré en code) :
  - Éclairage à trois points (lumière clé chaude avec ombres portées, contre-jour froid, point lumineux d'ambiance) + brouillard atmosphérique
  - Tone mapping cinématique (ACES Filmic) et espace colorimétrique correct
  - Ombres douces (PCFSoftShadowMap) sur tous les objets manipulables et le sol
  - Textures procédurales générées par canvas (bois pour le tiroir, cuir pour le livre/la botte, parchemin pour la page, cendres granuleuses, sol quadrillé) — remplacent les couleurs plates
  - Matériaux avec rugosité/métallicité ajustées par objet (bois mat, cuir semi-mat, bouton doré métallique)
- ⚠️ **Bug corrigé (x2)** : deux erreurs de syntaxe causées par la perte accidentelle de déclarations de fonction lors d'éditions successives (`setupControllers`, `revealClue1`, puis `buildPalaceRoom`) — fichier relu intégralement à chaque fois pour confirmer la cohérence
- ✅ **6 améliorations livrées** (fichiers réécrits intégralement et validés avec `node --check` avant livraison, pour éviter de reproduire les bugs de syntaxe précédents) :
  1. **Indice "loupe" (AR)** : pince à deux doigts pour zoomer (ajuste le FOV de la caméra), révèle un détail caché supplémentaire sur le tiroir ancré une fois un seuil de zoom atteint
  2. **Niveaux de difficulté** : écran de sélection côté AR (Facile 3/1, Normal 4/2, Difficile 6/3 — suspects/fausses pistes) ; le choix déclenche un événement `start_game` sur le relais, qui génère et diffuse le seed + la difficulté aux deux clients ; le relais renvoie l'état à un client qui rejoint après le démarrage
  3. **Indicateur de progression partagé** : 4 pastilles DOM affichées des deux côtés (AR et VR), qui s'allument en doré (ou rouge pour une fausse piste) à chaque indice révélé
  4. **Retour sonore (Web Audio API)** : sons générés par oscillateurs (pas de fichier audio) — accord montant pour une révélation réussie, son grave dissonant pour une fausse piste
  5. **Animations de révélation** : tweens simples (ease-out cubic) en scale-in sur chaque objet révélé, des deux côtés
  6. **Skybox** : sphère inversée avec un dégradé vertical (shader personnalisé, violet profond en haut, sombre en bas) remplaçant le fond uni du Palais mental
- ✅ **2 améliorations supplémentaires livrées** (validées par `node --check`) :
  7. **Reconnexion automatique** : les deux clients (AR et VR) retentent la connexion au relais avec un délai croissant (backoff exponentiel plafonné à 10s) en cas de déconnexion, au lieu de rester bloqués
  8. **Accusation finale portée en JS** : une fois les 4 indices révélés, le client VR affiche un écran avec les suspects de la partie (coupable + fausses pistes, mélangés), le joueur en choisit un, le verdict s'affiche (correct/erroné) avec son associé, et le résultat est envoyé au client AR qui l'affiche aussi — **la boucle complète du jeu (indices → accusation → verdict) est maintenant fonctionnelle des deux côtés**
- **Limite connue** : le mécanisme de fausse piste par indice (au niveau de chaque objet) n'est pas encore implémenté — seule l'accusation finale distingue coupable et fausses pistes ; les 4 indices physiques ne sont jamais marqués `isRedHerring: true` pour l'instant
- **Reste à faire** :
  - Étendre le prototype AR WebXR aux zones 2, 3 et 4 (actuellement seule la zone 1 a une page AR avec ancrage réel — les indices 2/3/4 n'ont qu'un pendant VR)
  - Porter l'écran d'accusation (AccusationUI, existant en C#) en JS pour le client VR WebXR
  - Mettre en place l'hébergement HTTPS (ngrok ou équivalent) pour tester entre les deux appareils physiques
  - Contenu 3D réel (le code actuel utilise des primitives comme placeholders)
  - Tests sur matériel réel (Quest 3 + téléphone Android) — étape la plus importante, à faire par l'utilisateur, impossible depuis cet environnement

---
*Dernière mise à jour : 6 améliorations livrées (loupe AR, difficulté, indicateur, son, animations, skybox) — validées par node --check avant livraison — reste : accusation en JS, zones 2/3/4 côté AR, hébergement HTTPS, tests matériel*
