# PharmaVille WebRTC — Guide complet

## Pourquoi WebRTC ?

Contrairement à la version WebSocket classique, **les données de jeu ne passent jamais
par le serveur**. Le serveur fait uniquement :

1. Authentification LTI (Moodle → token)
2. Matchmaking (trouver un adversaire du même cours)
3. Échange des ~10 messages WebRTC pour établir la connexion P2P

Une fois les deux navigateurs connectés, **tout se passe directement entre eux**.

```
PHASE 1 — Signaling (quelques secondes, via le serveur)
──────────────────────────────────────────────────────
Étudiant A ──── "je cherche une partie" ────► Serveur
Étudiant B ──── "moi aussi"             ────► Serveur
Serveur    ──── "voici l'offre de B"    ────► Étudiant A
Étudiant A ──── "voici ma réponse"      ────► Serveur
Serveur    ──── "réponse de A"          ────► Étudiant B
                        ↓
PHASE 2 — Jeu P2P (toute la partie, sans le serveur)
──────────────────────────────────────────────────────
Étudiant A ◄══════ DataChannel WebRTC ══════► Étudiant B
   (dés, achats, état du jeu — le serveur ne voit rien)
```

---

## Architecture des fichiers

```
pharmaville-webrtc/
├── src/
│   └── server.js        ← Signaling uniquement (LTI + matchmaking + relais SDP/ICE)
├── public/
│   └── index.html       ← Client complet (jeu + WebRTC + UI matchmaking)
├── .env.example
├── .gitignore
├── package.json
├── render.yaml
└── README.md
```

---

## Étape 1 — Tester en local

```bash
cd pharmaville-webrtc
cp .env.example .env
# Éditer .env : remplir LTI_SECRET et SESSION_SECRET

npm install
npm run dev

# Ouvrir deux onglets dans le même navigateur (ou deux navigateurs) :
# Onglet 1 : http://localhost:3000/dev/login?name=Alice&uid=u1&course=pharma2024
# Onglet 2 : http://localhost:3000/dev/login?name=Bob&uid=u2&course=pharma2024
#
# Les deux cliquent "TROUVER UN ADVERSAIRE" → partie P2P démarre
```

> Pour tester depuis deux machines différentes sur le même réseau local,
> remplacez `localhost` par l'IP locale de votre machine (ex: 192.168.1.42).
> La connexion P2P fonctionnera via STUN (pas besoin du TURN en local).

---

## Étape 2 — Déployer sur Render.com

### 2.1 Pousser sur GitHub

```bash
cd pharmaville-webrtc
git init
git add .
git commit -m "PharmaVille WebRTC"
# Créer un repo sur github.com, puis :
git remote add origin https://github.com/VOTRE_NOM/pharmaville-webrtc.git
git push -u origin main
```

### 2.2 Créer le service sur Render

1. https://render.com → **New** → **Web Service**
2. Connecter votre repo GitHub
3. Paramètres :
   - **Name** : `pharmaville`
   - **Runtime** : `Node`
   - **Build Command** : `npm install`
   - **Start Command** : `npm start`
4. Variables d'environnement (onglet **Environment**) :

   | Clé | Valeur |
   |-----|--------|
   | `NODE_ENV` | `production` |
   | `LTI_KEY` | `pharmaville` |
   | `LTI_SECRET` | *(générer : `openssl rand -hex 32`)* |
   | `SESSION_SECRET` | *(générer : `openssl rand -hex 32`)* |
   | `PUBLIC_URL` | `https://pharmaville.onrender.com` *(votre URL Render)* |
   | `TURN_URL` | `turns:openrelay.metered.ca:443` |
   | `TURN_USERNAME` | `openrelayproject` |
   | `TURN_CREDENTIAL` | `openrelayproject` |

5. **Create Web Service** → attendre ~2 min
6. Tester : `https://pharmaville.onrender.com/api/status`

### 2.3 Éviter la mise en veille (plan gratuit)

Le plan gratuit Render met le serveur en veille après 15 min d'inactivité.
Pour éviter ça pendant les cours :

- Créer un compte sur https://uptimerobot.com (gratuit)
- Ajouter un moniteur HTTP vers `https://pharmaville.onrender.com/api/status`
- Intervalle : 5 minutes
- Activer uniquement pendant les créneaux de cours

---

## Étape 3 — Configurer Moodle (LTI)

### 3.1 Email à envoyer à votre DSI (une seule fois)

```
Objet : Enregistrement d'un outil LTI — PharmaVille

Bonjour,

Je souhaite intégrer un jeu éducatif (PharmaVille) dans mon cours Moodle.
Le jeu est hébergé sur : https://pharmaville.onrender.com

Pourriez-vous enregistrer cet outil LTI 1.1 avec les paramètres suivants ?

  URL de lancement  : https://pharmaville.onrender.com/lti/launch
  Consumer Key (Clé): pharmaville
  Shared Secret     : [votre LTI_SECRET — gardez-le confidentiel]
  Version LTI       : 1.1 / Basic LTI

Aucune donnée personnelle n'est stockée côté jeu :
le serveur reçoit uniquement un identifiant opaque Moodle,
le prénom de l'étudiant, et l'identifiant du cours.

Merci,
[Votre nom]
```

### 3.2 Ajouter l'activité dans votre cours

Une fois l'outil enregistré par l'admin :

1. Cours Moodle → **Activer le mode édition**
2. **Ajouter une activité** → **Outil externe**
3. Paramètres :
   - Nom : `PharmaVille — Jeu 1v1`
   - Outil préconfiguré : `pharmaville`
   - Lancer le conteneur : `Nouvelle fenêtre` *(recommandé)*
4. **Enregistrer**

Les étudiants cliquent sur l'activité → le jeu s'ouvre directement,
authentifié via leur compte Moodle, sans aucun mot de passe supplémentaire.

---

## TURN server — Firewall universitaire

Les réseaux universitaires bloquent parfois les connexions P2P directes (NAT symétrique).
Dans ce cas, WebRTC bascule automatiquement sur le serveur TURN configuré.

Le serveur TURN `openrelay.metered.ca` est **gratuit et public** — suffisant pour
des usages pédagogiques. Si vous voulez plus de fiabilité, des options payantes
existent (~5€/mois pour un usage modéré).

Pour vérifier si le TURN est nécessaire dans votre réseau :
- Ouvrez la console navigateur pendant une partie (F12)
- Cherchez `WebRTC state: connected`
- Si vous voyez `relay` dans les candidats ICE → le TURN est utilisé

---

## Flux de données complet

```
Étudiant clique sur l'activité Moodle
           │
           ▼
Moodle POST /lti/launch (token LTI signé)
           │
           ▼
Serveur valide la signature OAuth LTI
Crée un token de session (UUID)
Redirige vers /?token=UUID
           │
           ▼
Navigateur charge index.html
Ouvre WebSocket vers le serveur
Envoie { type: AUTH, token: UUID }
           │
           ▼
Serveur répond avec displayName + iceServers
           │
           ▼
Étudiant clique "Trouver un adversaire"
Serveur cherche dans la file du même cours (context_id Moodle)
           │
    ┌──────┴──────┐
 Pas d'adversaire   Adversaire trouvé
    │                     │
 File d'attente      Échange SDP/ICE via serveur (~5 messages)
                          │
                    RTCPeerConnection établie
                    DataChannel ouvert
                          │
                    Serveur n'intervient plus
                          │
              ┌───────────┴───────────┐
         Navigateur A            Navigateur B
         (J0 — initiateur)       (J1)
              │                       │
         Génère état initial     Reçoit état initial
         Envoie GAME_INIT ──────────► │
              │◄────────── Actions ───│
              │──────── Actions ─────►│
              │    (dés, achats,       │
              │     fin de tour)       │
```

---

## Sécurité et vie privée

| Donnée | Transmise au serveur | Stockée |
|--------|---------------------|---------|
| Identifiant Moodle (opaque) | ✅ (LTI) | RAM uniquement, < 4h |
| Prénom | ✅ (LTI) | RAM uniquement, < 4h |
| Email | ❌ | Jamais |
| Mot de passe | ❌ | Jamais |
| Actions de jeu (dés, achats) | ❌ | Jamais — P2P uniquement |
| Scores | ❌ | Non persistés |

---

## Différences vs version WebSocket

| | WebSocket (v1) | WebRTC (v2) |
|--|----------------|-------------|
| Données de jeu | Via serveur | P2P direct |
| Logique autoritaire | Serveur | Client J0 (initiateur) |
| Charge serveur | Élevée | Quasi nulle |
| Latence | 50–100 ms | 5–20 ms |
| Risque firewall fac | Faible | Moyen (TURN fallback) |
| Complexité code | Moyenne | Plus élevée |
| Triche possible | Non (serveur autoritaire) | Théoriquement oui* |

*Pour un jeu éducatif en contexte de confiance, ce n'est pas un problème.
Si nécessaire, on peut ajouter une validation croisée des états.

---

## FAQ

**Q : Que se passe-t-il si un étudiant ferme son onglet pendant la partie ?**
L'adversaire voit un message "Connexion perdue". La partie est suspendue.
Si l'étudiant revient dans les 4h via Moodle, il peut se reconnecter
(le serveur notifie l'adversaire via `OPPONENT_RECONNECTED`).

**Q : Peut-on jouer depuis un téléphone ?**
Oui — WebRTC et les DataChannels sont supportés sur tous les navigateurs mobiles
modernes (Chrome Android, Safari iOS 14.5+).

**Q : Les étudiants de groupes différents peuvent-ils se rencontrer ?**
Non — le matchmaking filtre par `context_id` Moodle, qui correspond à votre cours.
Si vous avez deux groupes de TD dans le même cours Moodle, ils pourront jouer ensemble.
Pour les séparer, créez deux activités dans deux cours distincts.

**Q : Le jeu fonctionne-t-il sans TURN si le réseau bloque le P2P ?**
Non — sans TURN, la connexion échoue silencieusement. C'est pourquoi le serveur TURN
est configuré par défaut. Avec `openrelay.metered.ca`, ~95% des configurations réseau
universitaires fonctionnent.
