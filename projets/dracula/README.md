# Dracula — Le Château : mise en ligne et test

Deux éléments : le **jeu** (`index.html`, à héberger sur Cloudflare Pages → https://dracula.pages.dev) et le **relais** (`worker.js`, à déployer sur ton worker → https://dracula.zacharybov.workers.dev).

## 1. Le relais (worker)
Ton worker répond aujourd'hui « Hello World! » : il faut le remplacer.
```
cd dossier-contenant-worker.js-et-wrangler.toml
npx wrangler login        # une seule fois
npx wrangler deploy
```
Vérification : ouvre https://dracula.zacharybov.workers.dev/ → le message doit être **« Dracula relay OK »**.
(Le fichier `wrangler.toml` déclare l'objet durable `Room`, nécessaire au relais. Il est compatible avec le plan gratuit.)

## 2. Le jeu (Pages)
- Mets `index.html` à la racine d'un dépôt GitHub (ou en « Direct Upload » dans Cloudflare Pages).
- Cloudflare Pages → Créer un projet → nom `dracula` → pas de commande de build, dossier de sortie `/`.
- Adresse obtenue : https://dracula.pages.dev (HTTPS obligatoire pour que le téléphone donne son orientation).

## 3. Test complet
1. Ouvre https://dracula.pages.dev sur l'ordinateur. L'écran d'introduction affiche un **QR code** et un code à 4 lettres.
2. Scanne le QR code avec le téléphone : la page « Manette » s'ouvre, le code est déjà rempli. Appuie sur **Connecter** et accepte les capteurs de mouvement.
3. Sur l'ordinateur, le message devient **« ✓ Téléphone relié »**.
4. Clique **Commencer** : le téléphone sonne dans le jeu (et sur le téléphone relié, quand un appel arrive). Appuie sur ✆.
5. Vérifie : le faisceau et la vue suivent le téléphone ; le joystick du téléphone ; le bouton **Action** ; **T** au clavier envoie un appel d'essai au téléphone (sonnerie, vibration, voix).
6. **G** au clavier : bascule entre mode scénarisé et exploration libre (pour tester les pièces).

## En cas de problème
- Rien ne se connecte : ouvre la console du navigateur (F12) ; l'adresse `wss://dracula.zacharybov.workers.dev/ws?room=XXXX` doit passer en 101.
- Le téléphone ne tourne pas : iPhone → Réglages → Safari → « Mouvement et orientation » ; il faut aussi être en HTTPS.
- Pas de son : un clic sur « Commencer » est nécessaire pour activer l'audio.
