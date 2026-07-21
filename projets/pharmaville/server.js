/**
 * PharmaVille — Serveur multijoueur
 * LTI 1.1 (Moodle) + WebSockets + Matchmaking
 */

require('dotenv').config();
const express    = require('express');
const http       = require('http');
const WebSocket  = require('ws');
const session    = require('express-session');
const lti        = require('ims-lti');
const { v4: uuid } = require('uuid');
const path       = require('path');

const app    = express();
const server = http.createServer(app);
const wss    = new WebSocket.Server({ server });

const PORT          = process.env.PORT || 3000;
const LTI_KEY       = process.env.LTI_KEY    || 'pharmaville';
const LTI_SECRET    = process.env.LTI_SECRET || 'changeme';
const SESSION_SECRET = process.env.SESSION_SECRET || 'changeme2';

// ─── MIDDLEWARE ───────────────────────────────────────────────────────────────

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 4 * 60 * 60 * 1000 }, // 4h
}));
app.use(express.static(path.join(__dirname, '../public')));

// ─── ÉTAT EN MÉMOIRE ──────────────────────────────────────────────────────────
// En production, remplacer par Redis ou une base de données.

/** @type {Map<string, GameRoom>} */
const rooms = new Map();

/** File d'attente de matchmaking : userId → {userId, displayName, ws, courseId} */
const waitingQueue = new Map();

/** userId → roomId (pour retrouver la partie d'un joueur) */
const userToRoom = new Map();

/** userId → WebSocket actif */
const userSockets = new Map();

// ─── LOGIQUE DE JEU (miroir du client) ───────────────────────────────────────
// Le serveur est autoritaire : il calcule les effets et envoie le nouvel état.

const CARD_DEFINITIONS = {
  pharmacie_base:  { activation:[1,2],  income:1, color:'green',  starter:true  },
  labo_base:       { activation:[3],    income:1, color:'blue',   starter:true  },
  hopital:         { activation:[9,10], income:3, color:'blue'   },
  clinique:        { activation:[5],    income:2, color:'blue'   },
  fabrication:     { activation:[4],    income:3, color:'green'  },
  recherche:       { activation:[6],    income:5, color:'green'  },
  biotech:         { activation:[11,12],income:8, color:'green'  },
  startup:         { activation:[8],    income:4, color:'green'  },
  labo_innovation: { activation:[5],    income:3, color:'green'  },
  centre_essais:   { activation:[7],    income:4, color:'green'  },
  pharma_premium:  { activation:[3],    income:2, color:'green'  },
  usine_production:{ activation:[9],    income:5, color:'green'  },
  grossiste:       { activation:[7],    income:2, color:'red'    },
  importateur:     { activation:[9],    income:3, color:'red'    },
  distributeur:    { activation:[5],    income:2, color:'red'    },
  courtier:        { activation:[8],    income:3, color:'red'    },
  centrale_achat:  { activation:[6],    income:2, color:'red'    },
  rachat:          { activation:[8],    income:5, color:'purple' },
  fusion:          { activation:[10],   income:6, color:'purple' },
  opa:             { activation:[7],    income:4, color:'purple' },
  lobbying:        { activation:[9],    income:5, color:'purple' },
  brevet_vol:      { activation:[6],    income:4, color:'purple' },
  espionnage:      { activation:[11],   income:7, color:'purple' },
};

const MONUMENTS = ['fda','patent','usine','campus'];
const MONUMENT_COST = { fda:16, patent:22, usine:30, campus:60 };

const ALL_BY_COLOR = {
  blue:   ['hopital','clinique'],
  green:  ['fabrication','recherche','biotech','startup','labo_innovation','centre_essais','pharma_premium','usine_production'],
  red:    ['grossiste','importateur','distributeur','courtier','centrale_achat'],
  purple: ['rachat','fusion','opa','lobbying','brevet_vol','espionnage'],
};

const shuffle = arr => [...arr].sort(() => Math.random() - 0.5);
const rollD6  = () => Math.floor(Math.random() * 6) + 1;

function initShop() {
  return [
    ...shuffle(ALL_BY_COLOR.blue).slice(0,2),
    ...shuffle(ALL_BY_COLOR.green).slice(0,3),
    ...shuffle(ALL_BY_COLOR.red).slice(0,2),
    ...shuffle(ALL_BY_COLOR.purple).slice(0,2),
  ];
}

function initPlayer(userId, displayName) {
  return {
    userId,
    displayName,
    money: 3,
    cards: { pharmacie_base:1, labo_base:1 },
    monuments: [],
    diceCount: 1,
  };
}

/**
 * Résout les effets des cartes après un lancer de dés.
 * Retourne les nouveaux états des deux joueurs + log des événements.
 */
function resolveEffects(rollValue, players, activeIndex) {
  const np = players.map(p => ({ ...p, cards:{...p.cards}, monuments:[...p.monuments] }));
  const cp = activeIndex;
  const hasNovortis = np[cp].monuments.includes('usine');
  let anyGained = false;
  const events = [];

  // BLUE — chaque possesseur gagne, quel que soit le tour
  Object.entries(CARD_DEFINITIONS).forEach(([id, card]) => {
    if (card.color !== 'blue' || !card.activation.includes(rollValue)) return;
    np.forEach((p, i) => {
      const cnt = p.cards[id] || 0;
      if (!cnt) return;
      const earned = card.income * cnt;
      p.money += earned; anyGained = true;
      events.push({ type:'gain', player:i, cardId:id, amount:earned });
    });
  });

  // RED — adversaires volent le joueur actif
  Object.entries(CARD_DEFINITIONS).forEach(([id, card]) => {
    if (card.color !== 'red' || !card.activation.includes(rollValue)) return;
    np.forEach((p, i) => {
      if (i === cp) return;
      const cnt = p.cards[id] || 0;
      if (!cnt) return;
      const stolen = Math.min(card.income * cnt, np[cp].money);
      if (!stolen) return;
      np[cp].money -= stolen; p.money += stolen;
      events.push({ type:'steal', from:cp, to:i, cardId:id, amount:stolen });
    });
  });

  // GREEN — joueur actif seulement
  Object.entries(CARD_DEFINITIONS).forEach(([id, card]) => {
    if (card.color !== 'green' || !card.activation.includes(rollValue)) return;
    const cnt = np[cp].cards[id] || 0;
    if (!cnt) return;
    const bonus = hasNovortis ? 2 : 0;
    const earned = (card.income + bonus) * cnt;
    np[cp].money += earned; anyGained = true;
    events.push({ type:'gain', player:cp, cardId:id, amount:earned, novortis:bonus>0 });
  });

  // PURPLE — joueur actif vole le plus riche
  Object.entries(CARD_DEFINITIONS).forEach(([id, card]) => {
    if (card.color !== 'purple' || !card.activation.includes(rollValue)) return;
    const cnt = np[cp].cards[id] || 0;
    if (!cnt) return;
    const targets = np.map((p,i) => ({p,i})).filter(({i}) => i!==cp && np[i].money>0).sort((a,b)=>b.p.money-a.p.money);
    if (!targets.length) return;
    const { p:target, i:tidx } = targets[0];
    const stolen = Math.min(card.income * cnt, target.money);
    target.money -= stolen; np[cp].money += stolen;
    events.push({ type:'steal', from:tidx, to:cp, cardId:id, amount:stolen });
  });

  // Patent — aucun gain → +10€
  if (!anyGained && np[cp].monuments.includes('patent')) {
    np[cp].money += 10;
    events.push({ type:'patent', player:cp, amount:10 });
  }

  return { players: np, events };
}

// ─── GESTION DES PARTIES ──────────────────────────────────────────────────────

function createRoom(player0, player1) {
  const roomId = uuid();
  const room = {
    id: roomId,
    players: [
      initPlayer(player0.userId, player0.displayName),
      initPlayer(player1.userId, player1.displayName),
    ],
    userIds: [player0.userId, player1.userId],
    currentPlayer: 0,
    shop: initShop(),
    turnNum: 1,
    diceResult: null,
    hasRolled: false,
    hasBought: 0,
    canReroll: false,
    status: 'playing', // 'playing' | 'finished'
    winner: null,
    createdAt: Date.now(),
  };
  rooms.set(roomId, room);
  userToRoom.set(player0.userId, roomId);
  userToRoom.set(player1.userId, roomId);
  return room;
}

function buyLimit(room) {
  return room.players[room.currentPlayer].monuments.includes('campus') ? 2 : 1;
}

function broadcast(room, message) {
  room.userIds.forEach(uid => {
    const ws = userSockets.get(uid);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  });
}

function sendState(room) {
  // Envoie l'état complet à chaque joueur
  // Chaque joueur reçoit son index pour savoir qui il est
  room.userIds.forEach((uid, idx) => {
    const ws = userSockets.get(uid);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'STATE',
        myIndex: idx,
        room: {
          id: room.id,
          players: room.players,
          currentPlayer: room.currentPlayer,
          shop: room.shop,
          turnNum: room.turnNum,
          diceResult: room.diceResult,
          hasRolled: room.hasRolled,
          hasBought: room.hasBought,
          canReroll: room.canReroll,
          status: room.status,
          winner: room.winner,
        },
      }));
    }
  });
}

// ─── ACTIONS DE JEU ──────────────────────────────────────────────────────────

function handleAction(userId, action) {
  const roomId = userToRoom.get(userId);
  if (!roomId) return { error: 'Aucune partie en cours' };

  const room = rooms.get(roomId);
  if (!room) return { error: 'Partie introuvable' };
  if (room.status !== 'playing') return { error: 'Partie terminée' };

  const myIndex = room.userIds.indexOf(userId);
  if (myIndex !== room.currentPlayer) return { error: 'Ce n\'est pas votre tour' };

  switch (action.type) {

    case 'ROLL': {
      if (room.hasRolled && !room.canReroll) return { error: 'Dés déjà lancés' };
      const numDice = room.players[room.currentPlayer].diceCount;
      const d1 = rollD6();
      const d2 = numDice === 2 ? rollD6() : null;
      const total = d1 + (d2 || 0);
      room.diceResult = { d1, d2, total };
      room.hasRolled = true;
      room.canReroll = false;

      const { players: np, events } = resolveEffects(total, room.players, room.currentPlayer);
      room.players = np;

      // FDA : permet de relancer
      if (!action.isReroll && room.players[room.currentPlayer].monuments.includes('fda')) {
        room.canReroll = true;
      }

      broadcast(room, { type:'DICE_EVENTS', diceResult:room.diceResult, events, canReroll:room.canReroll });
      sendState(room);
      return { ok: true };
    }

    case 'BUY_CARD': {
      if (!room.hasRolled) return { error: 'Lancez les dés d\'abord' };
      if (room.hasBought >= buyLimit(room)) return { error: 'Limite d\'achat atteinte' };
      const { cardId } = action;
      const cardDef = CARD_DEFINITIONS[cardId];
      if (!cardDef) return { error: 'Carte inconnue' };

      // Coûts depuis le client (on refait le calcul côté serveur)
      const CARD_COSTS = { hopital:6,clinique:4,fabrication:3,recherche:6,biotech:12,startup:7,labo_innovation:5,centre_essais:6,pharma_premium:4,usine_production:8,grossiste:4,importateur:6,distributeur:5,courtier:5,centrale_achat:5,rachat:8,fusion:10,opa:7,lobbying:9,brevet_vol:6,espionnage:11 };
      const CARD_MAX = { hopital:3,clinique:3,fabrication:3,recherche:3,biotech:3,startup:3,labo_innovation:3,centre_essais:3,pharma_premium:3,usine_production:3,grossiste:3,importateur:3,distributeur:3,courtier:3,centrale_achat:3,rachat:3,fusion:3,opa:3,lobbying:3,brevet_vol:3,espionnage:3 };
      const cost = CARD_COSTS[cardId];
      const max  = CARD_MAX[cardId] || 3;
      if (cost === undefined) return { error: 'Carte non achetable' };

      const p = room.players[room.currentPlayer];
      if (p.money < cost) return { error: 'Fonds insuffisants' };
      if ((p.cards[cardId]||0) >= max) return { error: 'Maximum atteint' };
      if (!room.shop.includes(cardId)) return { error: 'Carte non disponible en boutique' };

      p.money -= cost;
      p.cards[cardId] = (p.cards[cardId]||0) + 1;
      room.hasBought++;

      // Remplacer la carte dans la boutique
      const shopIdx = room.shop.indexOf(cardId);
      const pool = ALL_BY_COLOR[cardDef.color].filter(id => id !== cardId);
      if (pool.length > 0) room.shop[shopIdx] = shuffle(pool)[0];

      sendState(room);
      return { ok: true };
    }

    case 'BUY_MONUMENT': {
      if (!room.hasRolled) return { error: 'Lancez les dés d\'abord' };
      if (room.hasBought >= buyLimit(room)) return { error: 'Limite d\'achat atteinte' };
      const { monumentId } = action;
      if (!MONUMENTS.includes(monumentId)) return { error: 'Monument inconnu' };

      const p = room.players[room.currentPlayer];
      const cost = MONUMENT_COST[monumentId];
      if (p.money < cost) return { error: 'Fonds insuffisants' };
      if (p.monuments.includes(monumentId)) return { error: 'Déjà construit' };

      p.money -= cost;
      p.monuments.push(monumentId);
      room.hasBought++;

      // Vérification victoire
      if (p.monuments.length === 4) {
        room.status  = 'finished';
        room.winner  = room.currentPlayer;
        broadcast(room, { type:'VICTORY', winner:room.currentPlayer, displayName:p.displayName });
      }

      sendState(room);
      return { ok: true };
    }

    case 'BUY_DICE': {
      if (!room.hasRolled) return { error: 'Lancez les dés d\'abord' };
      if (room.hasBought >= buyLimit(room)) return { error: 'Limite d\'achat atteinte' };
      const p = room.players[room.currentPlayer];
      if (p.money < 20) return { error: 'Fonds insuffisants' };
      if (p.diceCount === 2) return { error: 'Déjà 2 dés' };

      p.money -= 20;
      p.diceCount = 2;
      room.hasBought++;

      sendState(room);
      return { ok: true };
    }

    case 'END_TURN': {
      if (!room.hasRolled) return { error: 'Lancez les dés d\'abord' };

      room.currentPlayer = (room.currentPlayer + 1) % 2;
      room.hasRolled  = false;
      room.hasBought  = 0;
      room.canReroll  = false;
      room.diceResult = null;
      room.turnNum++;

      broadcast(room, { type:'NEW_TURN', currentPlayer:room.currentPlayer, turnNum:room.turnNum });
      sendState(room);
      return { ok: true };
    }

    case 'SWAP_SHOP': {
      const { cardId } = action;
      const cardDef = CARD_DEFINITIONS[cardId];
      if (!cardDef || !room.shop.includes(cardId)) return { error: 'Carte non disponible' };
      const pool = ALL_BY_COLOR[cardDef.color].filter(id => id !== cardId);
      if (pool.length > 0) {
        room.shop[room.shop.indexOf(cardId)] = shuffle(pool)[0];
      }
      sendState(room);
      return { ok: true };
    }

    default:
      return { error: `Action inconnue : ${action.type}` };
  }
}

// ─── WEBSOCKET ────────────────────────────────────────────────────────────────

wss.on('connection', (ws, req) => {
  // L'URL contient le token de session : ws://host/ws?token=SESSION_ID
  // En pratique on récupère l'userId depuis la session Express stockée
  // en mémoire côté serveur (pas besoin de le transmettre dans l'URL).
  // On l'identifie via un handshake initial.

  let userId = null;

  ws.on('message', raw => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    // ── Handshake ──
    if (msg.type === 'AUTH') {
      // Le client envoie son sessionToken obtenu après le LTI
      const token = msg.token;
      if (!token || !sessionStore.has(token)) {
        ws.send(JSON.stringify({ type:'ERROR', message:'Token invalide' }));
        ws.close();
        return;
      }
      const userData = sessionStore.get(token);
      userId = userData.userId;
      userSockets.set(userId, ws);

      // Vérifier si déjà en partie
      const roomId = userToRoom.get(userId);
      if (roomId && rooms.has(roomId) && rooms.get(roomId).status === 'playing') {
        ws.send(JSON.stringify({ type:'RECONNECTED', roomId }));
        sendState(rooms.get(roomId));
        return;
      }

      ws.send(JSON.stringify({ type:'AUTHENTICATED', userId, displayName:userData.displayName }));
      return;
    }

    // ── Toutes les autres actions nécessitent d'être authentifié ──
    if (!userId) {
      ws.send(JSON.stringify({ type:'ERROR', message:'Non authentifié' }));
      return;
    }

    // ── Matchmaking ──
    if (msg.type === 'FIND_MATCH') {
      const userData = sessionStore.get([...sessionStore.entries()].find(([,v])=>v.userId===userId)?.[0]);
      if (!userData) return;

      // Déjà en file d'attente ?
      if (waitingQueue.has(userId)) {
        ws.send(JSON.stringify({ type:'MATCHMAKING', status:'waiting', position:waitingQueue.size }));
        return;
      }

      // Y a-t-il quelqu'un qui attend du même cours ?
      const courseId = userData.courseId;
      const opponent = [...waitingQueue.values()].find(w => w.courseId === courseId && w.userId !== userId);

      if (opponent) {
        waitingQueue.delete(opponent.userId);
        const room = createRoom(
          { userId, displayName: userData.displayName },
          { userId: opponent.userId, displayName: opponent.displayName }
        );
        // Notifier les deux
        ws.send(JSON.stringify({ type:'MATCH_FOUND', roomId:room.id, opponentName:opponent.displayName }));
        const oppWs = userSockets.get(opponent.userId);
        if (oppWs?.readyState === WebSocket.OPEN) {
          oppWs.send(JSON.stringify({ type:'MATCH_FOUND', roomId:room.id, opponentName:userData.displayName }));
        }
        setTimeout(() => sendState(room), 200);
      } else {
        waitingQueue.set(userId, { userId, displayName:userData.displayName, courseId, ws });
        ws.send(JSON.stringify({ type:'MATCHMAKING', status:'waiting', position:waitingQueue.size }));
      }
      return;
    }

    if (msg.type === 'CANCEL_MATCH') {
      waitingQueue.delete(userId);
      ws.send(JSON.stringify({ type:'MATCHMAKING', status:'cancelled' }));
      return;
    }

    // ── Actions de jeu ──
    if (msg.type === 'ACTION') {
      const result = handleAction(userId, msg.action);
      if (result.error) {
        ws.send(JSON.stringify({ type:'ERROR', message:result.error }));
      }
      return;
    }
  });

  ws.on('close', () => {
    if (userId) {
      userSockets.delete(userId);
      waitingQueue.delete(userId);
      // Notifier l'adversaire si en partie
      const roomId = userToRoom.get(userId);
      if (roomId) {
        const room = rooms.get(roomId);
        if (room && room.status === 'playing') {
          broadcast(room, { type:'OPPONENT_DISCONNECTED' });
        }
      }
    }
  });
});

// ─── SESSION STORE EN MÉMOIRE ─────────────────────────────────────────────────
// Clé = token aléatoire, valeur = { userId, displayName, courseId }

const sessionStore = new Map();

// ─── ROUTES HTTP ──────────────────────────────────────────────────────────────

/**
 * Point d'entrée LTI — Moodle POST ici quand l'étudiant clique sur l'activité.
 * Moodle envoie : user_id, lis_person_name_full, context_id (= cours), oauth_consumer_key, oauth_signature…
 */
app.post('/lti/launch', (req, res) => {
  const provider = new lti.Provider(LTI_KEY, LTI_SECRET);

  provider.valid_request(req, (err, isValid) => {
    if (err || !isValid) {
      console.error('LTI invalide :', err);
      return res.status(401).send(`
        <h2>Authentification échouée</h2>
        <p>La requête LTI n'est pas valide. Vérifiez la clé et le secret dans Moodle.</p>
        <pre>${err?.message || 'Erreur inconnue'}</pre>
      `);
    }

    // Extraire les infos Moodle — on n'utilise pas l'email réel
    const moodleUserId  = req.body.user_id;                          // identifiant opaque Moodle
    const displayName   = req.body.lis_person_name_given            // prénom
                       || req.body.lis_person_name_full?.split(' ')[0]
                       || `Étudiant${Math.floor(Math.random()*9999)}`;
    const courseId      = req.body.context_id || 'default';         // identifiant du cours

    // Créer un token de session court
    const token = uuid();
    sessionStore.set(token, { userId: moodleUserId, displayName, courseId });

    // Nettoyer les vieux tokens (> 4h)
    const now = Date.now();
    for (const [k, v] of sessionStore.entries()) {
      if (v.createdAt && now - v.createdAt > 4*60*60*1000) sessionStore.delete(k);
    }
    sessionStore.get(token).createdAt = Date.now();

    // Rediriger vers le jeu avec le token
    const publicUrl = process.env.PUBLIC_URL || `http://localhost:${PORT}`;
    res.redirect(`${publicUrl}/?token=${token}`);
  });
});

/**
 * Route de test sans LTI — utile en développement local.
 * Désactiver en production ou protéger par variable d'environnement.
 */
app.get('/dev/login', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).send('Désactivé en production');
  }
  const name  = req.query.name  || 'DevUser';
  const uid   = req.query.uid   || `dev_${Date.now()}`;
  const token = uuid();
  sessionStore.set(token, { userId:uid, displayName:name, courseId:'dev_course', createdAt:Date.now() });
  res.redirect(`/?token=${token}`);
});

/**
 * Informations de statut — pour le tableau de bord prof.
 */
app.get('/api/status', (req, res) => {
  res.json({
    roomsActive:   [...rooms.values()].filter(r=>r.status==='playing').length,
    roomsFinished: [...rooms.values()].filter(r=>r.status==='finished').length,
    playersOnline: userSockets.size,
    playersWaiting: waitingQueue.size,
  });
});

/**
 * Statistiques anonymes des parties terminées (pour le prof).
 * Aucun identifiant réel — seulement les scores et durées.
 */
app.get('/api/stats', (req, res) => {
  const finished = [...rooms.values()].filter(r => r.status === 'finished');
  const stats = finished.map(r => ({
    roomId:    r.id,
    turnCount: r.turnNum,
    winner:    r.winner,
    scores:    r.players.map(p => ({
      monuments: p.monuments.length,
      money:     p.money,
      cardCount: Object.values(p.cards).reduce((s,c)=>s+c,0),
    })),
    duration: Math.round((Date.now() - r.createdAt) / 60000), // minutes
  }));
  res.json({ total: stats.length, games: stats });
});

// Toutes les autres routes → index.html (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// ─── DÉMARRAGE ────────────────────────────────────────────────────────────────

server.listen(PORT, () => {
  console.log(`✅ PharmaVille serveur démarré sur le port ${PORT}`);
  console.log(`   Mode LTI  : ${LTI_KEY}`);
  console.log(`   Dev login : http://localhost:${PORT}/dev/login?name=Alice`);
});
