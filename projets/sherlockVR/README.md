# Sherlock VR/AR — Système VR (code source)

Ce dossier contient le vrai code source du système VR (Holmes) et du serveur
relais, conformément à l'architecture et à l'ordre de prototypage validés
dans le fichier de suivi du projet.

⚠️ **Ce n'est pas un jeu buildé et jouable directement.** Ce sont des
scripts C# à intégrer dans un projet Unity, plus un petit serveur Node.js.
Un build Quest 3 complet demande Unity installé, le module Android/Quest,
et un test sur casque réel — étapes que je ne peux pas exécuter à ta place.

## Contenu

```
SherlockVR-Unity/
├── Scripts/
│   ├── ClueObject.cs          → classe de base pour tout indice manipulable
│   ├── CaseManager.cs         → seed reçu du relais, coupable, fausses pistes, condition de résolution
│   ├── NetworkClient.cs       → client WebSocket (connexion au relais, synchro du seed)
│   ├── AccusationUI.cs        → écran d'accusation final (verdict correct/erroné)
│   └── Clues/
│       ├── DrawerClue.cs          → indice 1 (bureau) — retourner + presser
│       ├── BookAssemblyClue.cs    → indice 2 (bibliothèque) — recherche + assemblage
│       ├── AshSearchClue.cs       → indice 3 (cheminée) — fouille haptique graduée
│       └── BootCompareClue.cs     → indice 4 (fenêtre) — comparaison par superposition
└── Server/
    └── relay-server.js        → serveur relais minimal (brique 2), génère et diffuse le seed de partie
```

**Important — synchronisation du seed** : `CaseManager` n'auto-génère plus de partie au lancement. Il attend un événement `session_seed` envoyé par le serveur relais (via `NetworkClient`), pour garantir que Watson (AR) et Holmes (VR) jouent exactement le même scénario. Si le relais est injoignable après 5 secondes, un seed local de secours est généré (mode dégradé, hors-ligne) — mais dans ce cas Watson et Holmes ne seront plus synchronisés.

## Installation côté Unity

1. Créer un projet Unity (2022 LTS recommandé) avec le template **VR**
2. Installer via Package Manager :
   - `XR Interaction Toolkit`
   - `OpenXR Plugin` + activer le profil **Meta Quest** dans
     Project Settings → XR Plug-in Management → OpenXR
3. Copier le dossier `Scripts/` dans `Assets/Scripts/` de ton projet
4. Créer un objet vide `CaseManager` dans la scène et y attacher `CaseManager.cs`
5. Créer un objet vide `NetworkClient` dans la scène et y attacher `NetworkClient.cs`
6. Créer un Canvas UI avec un bouton par suspect, y attacher `AccusationUI.cs`,
   et relier chaque bouton à `AccusationUI.Accuse("Nom du suspect")`.
   Glisser cette même UI dans le champ `accusationUI` de `CaseManager` dans l'inspecteur
7. Pour chaque indice : créer un objet 3D avec un `XRGrabInteractable` +
   le script correspondant (`DrawerClue`, `BookAssemblyClue`, `AshSearchClue`, `BootCompareClue`)

## Installation côté serveur relais

```bash
cd Server
npm install ws
node relay-server.js
```

Le serveur écoute sur `ws://localhost:8080` et génère un seed aléatoire par
session, diffusé aux deux clients (AR et VR) à la connexion. Pour tester en
LAN avec un vrai téléphone AR et un casque Quest 3, remplace `localhost`
par l'IP locale de la machine qui héberge le serveur, dans :
- `NetworkClient.serverUrl` (côté Unity)
- `RELAY_URL` dans le fichier `sherlock-ar-prototype-zone1.html` (côté AR)

Le prototype AR WebXR envoie déjà ses événements (`clue_observed_ar`) au
relais et reçoit ceux du VR (`clue_revealed_vr`, `all_clues_ready`) — la
boucle bout-en-bout fonctionne pour l'indice 1.

## Ce qui manque encore (pour le "jeu complet")

- Les zones 2, 3 et 4 du prototype AR WebXR (actuellement seule la zone 1
  "bureau" a une page AR ; les 3 autres n'ont que leur pendant VR)
- Le contenu 3D réel (modèles, textures) — tout ce qui est livré ici utilise
  des primitives (cubes, plans) comme représentation temporaire
- Un vrai design d'UI pour l'écran d'accusation (actuellement une logique
  pure, sans mise en page ni retour visuel autre que la Console Unity)
- Les tests sur matériel réel (Quest 3 + téléphone Android), impossibles à
  faire depuis cet environnement — c'est l'étape la plus importante à
  faire de ton côté avant d'aller plus loin
