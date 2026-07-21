# PharmaVille — Guide de déploiement

## Architecture

```
Moodle (authentification LTI)
      │
      ▼
pharmaville-server (Node.js sur Render.com)
      │
      ├── POST /lti/launch   ← Moodle envoie le token étudiant
      ├── WebSocket /        ← Jeu en temps réel
      ├── GET /api/status    ← Tableau de bord prof
      └── GET /api/stats     ← Statistiques anonymes
```

Aucune donnée personnelle n'est stockée.
Le serveur reçoit : un identifiant opaque Moodle + le prénom + l'identifiant du cours.

---

## Étape 1 — Déployer sur Render.com (10 min)

### 1.1 Créer un compte
- Allez sur https://render.com
- Créez un compte gratuit (avec votre email)

### 1.2 Pousser le code sur GitHub
```bash
# Dans le dossier pharmaville-server/
git init
git add .
git commit -m "Initial commit"
# Créez un dépôt sur github.com et suivez les instructions
git remote add origin https://github.com/VOTRE_NOM/pharmaville-server.git
git push -u origin main
```

### 1.3 Déployer sur Render
1. Dashboard Render → **New** → **Web Service**
2. Connectez votre dépôt GitHub
3. Paramètres :
   - **Name** : `pharmaville`
   - **Runtime** : `Node`
   - **Build Command** : `npm install`
   - **Start Command** : `npm start`
4. Variables d'environnement (onglet **Environment**) :
   ```
   NODE_ENV      = production
   LTI_KEY       = pharmaville
   LTI_SECRET    = [générez une chaîne aléatoire longue, ex: pwgen -s 32 1]
   SESSION_SECRET= [autre chaîne aléatoire]
   PUBLIC_URL    = https://pharmaville.onrender.com  ← votre URL Render
   ```
5. Cliquez **Create Web Service**
6. Attendez ~2 minutes que le déploiement se termine
7. Notez votre URL : `https://pharmaville.onrender.com`

> ⚠️ Le plan gratuit Render met le serveur en veille après 15 min d'inactivité.
> Pour éviter ça, utilisez https://uptimerobot.com (ping toutes les 5 min, gratuit).

---

## Étape 2 — Configurer Moodle (15 min)

Vous avez besoin d'un accès pour créer des activités dans votre cours.
La configuration LTI nécessite une action de l'administrateur Moodle (une seule fois).

### 2.1 Demande à l'administrateur (email type)

```
Objet : Ajout d'un outil LTI externe — PharmaVille

Bonjour,

Dans le cadre de mon cours de pharmacie, je souhaite intégrer
un jeu éducatif (PharmaVille) hébergé sur :
https://pharmaville.onrender.com

Pourriez-vous enregistrer cet outil LTI avec les paramètres suivants ?

  URL de lancement : https://pharmaville.onrender.com/lti/launch
  Clé (Consumer Key) : pharmaville
  Secret             : [votre LTI_SECRET]
  Version LTI        : 1.1

Merci,
[Votre nom]
```

### 2.2 Une fois l'outil enregistré par l'admin

Dans votre cours Moodle :
1. **Activer le mode édition**
2. **Ajouter une activité** → **Outil externe** (External Tool)
3. Paramètres :
   - **Nom de l'activité** : `PharmaVille`
   - **Outil préconfigurés** : sélectionnez `pharmaville` (ajouté par l'admin)
   - **Description** : optionnel
4. **Enregistrer**

Les étudiants voient l'activité dans leur cours → ils cliquent → le jeu s'ouvre
directement sans aucune saisie de mot de passe.

---

## Étape 3 — Tester en local (optionnel)

```bash
# Cloner le projet
cd pharmaville-server
cp .env.example .env
# Éditer .env avec vos valeurs

npm install
npm run dev   # démarre avec nodemon

# Ouvrir deux onglets :
# http://localhost:3000/dev/login?name=Alice&uid=1
# http://localhost:3000/dev/login?name=Bob&uid=2
# Les deux entrent en matchmaking → la partie démarre
```

---

## Étape 4 — Intégrer le jeu (game.js)

Le fichier `public/game.js` doit contenir le composant React `PharmaVilleGame`
adapté pour le mode multijoueur (il reçoit `roomState` et `onAction` en props
au lieu de gérer son propre state).

Pour le générer depuis `PharmaVille.jsx` :
```bash
# Si vous avez Node/Babel :
npx babel PharmaVille.jsx --out-file public/game.js --presets @babel/preset-react

# Ou avec Vite/webpack selon votre setup
```

---

## Tableau de bord professeur

Accédez à `https://pharmaville.onrender.com/api/stats` pour voir :
- Nombre de parties jouées
- Nombre de tours par partie
- Scores finaux (anonymes — aucun nom)
- Durée moyenne des parties

Pour une interface visuelle, une simple page HTML peut consommer cette API.

---

## Sécurité et vie privée

| Ce que le serveur reçoit de Moodle | Ce qui est stocké |
|------------------------------------|-------------------|
| `user_id` (identifiant opaque)     | En mémoire (RAM), perdu au redémarrage |
| Prénom uniquement                  | En mémoire temporaire |
| `context_id` (identifiant du cours)| En mémoire temporaire |

❌ **Aucun email, aucun nom de famille, aucun mot de passe** n'est transmis ou stocké.
❌ **Aucune base de données** n'est utilisée (état en RAM uniquement).
✅ **LTI 1.1** : signature OAuth vérifie l'authenticité de la requête Moodle.

---

## Structure des fichiers

```
pharmaville-server/
├── src/
│   └── server.js          ← Serveur principal (LTI + WebSocket + API)
├── public/
│   ├── index.html         ← Shell HTML + matchmaking UI
│   └── game.js            ← Jeu React compilé (à générer)
├── .env.example           ← Variables d'environnement
├── package.json
├── render.yaml            ← Config déploiement Render
└── README.md
```

---

## FAQ

**Q : Que se passe-t-il si un étudiant ferme son navigateur pendant la partie ?**
L'adversaire voit un message "Adversaire déconnecté". Si l'étudiant rouvre
l'activité Moodle dans les 4h, il est reconnecté à sa partie.

**Q : Peut-on avoir plusieurs cours en même temps ?**
Oui — le matchmaking trie par `context_id` (identifiant de cours Moodle),
donc les étudiants de TD1 jouent entre eux, pas contre ceux de TD2.

**Q : Le plan gratuit Render suffit-il ?**
Pour un usage pédagogique (quelques dizaines d'étudiants), oui.
La limite est 512 MB RAM et la mise en veille après inactivité.
Activez UptimeRobot pour éviter la mise en veille pendant les cours.

**Q : Faut-il Redis ou une base de données ?**
Non pour un usage en classe (état en RAM). Si vous voulez persister
les scores entre plusieurs sessions, ajoutez SQLite (2 lignes de code).
