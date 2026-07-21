/**
 * PharmaVille — Serveur de signaling WebRTC
 *
 * Ce serveur fait UNIQUEMENT :
 *   1. Authentification LTI (Moodle)
 *   2. Matchmaking (trouver un adversaire du même cours)
 *   3. Relais des messages WebRTC SDP/ICE (~10 messages par partie)
 *
 * Toute la logique de jeu tourne dans les navigateurs (P2P).
 * Le serveur ne voit JAMAIS les actions de jeu.
 */

require('dotenv').config();
const express = require('express');
const http    = require('http');
const WS      = require('ws');
const lti     = require('ims-lti');
const { v4: uuid } = require('uuid');
const path    = require('path');

const app    = express();
const server = http.createServer(app);
const wss    = new WS.Server({ server });

const PORT           = process.env.PORT        || 3000;
const LTI_KEY        = process.env.LTI_KEY     || 'pharmaville';
const LTI_SECRET     = process.env.LTI_SECRET  || 'changeme';
const PUBLIC_URL     = process.env.PUBLIC_URL  || `http://localhost:${PORT}`;

// Config ICE (STUN public + TURN de secours)
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  ...(process.env.TURN_URL ? [{
    urls:       process.env.TURN_URL,
    username:   process.env.TURN_USERNAME,
    credential: process.env.TURN_CREDENTIAL,
  }] : []),
];

// ─── STORES EN MÉMOIRE ────────────────────────────────────────────────────────

/** token → { userId, displayName, courseId, createdAt } */
const sessionStore = new Map();

/** userId → WebSocket */
const userSockets = new Map();

/** courseId → [{ userId, displayName }]  — file d'attente par cours */
const waitingQueues = new Map();

/** roomId → { userIds:[id0,id1], displayNames:[n0,n1], createdAt } */
const rooms = new Map();

/** userId → roomId */
const userToRoom = new Map();

// ─── NETTOYAGE PÉRIODIQUE ────────────────────────────────────────────────────

setInterval(() => {
  const cutoff = Date.now() - 4 * 60 * 60 * 1000; // 4h
  for (const [k, v] of sessionStore.entries()) {
    if (v.createdAt < cutoff) sessionStore.delete(k);
  }
  for (const [k, v] of rooms.entries()) {
    if (v.createdAt < cutoff) {
      v.userIds.forEach(uid => userToRoom.delete(uid));
      rooms.delete(k);
    }
  }
}, 30 * 60 * 1000);

// ─── UTILITAIRES ──────────────────────────────────────────────────────────────

function sendTo(userId, msg) {
  const ws = userSockets.get(userId);
  if (ws?.readyState === WS.OPEN) ws.send(JSON.stringify(msg));
}

function getSessionByUserId(userId) {
  for (const v of sessionStore.values()) {
    if (v.userId === userId) return v;
  }
  return null;
}

// ─── ROUTES HTTP ──────────────────────────────────────────────────────────────

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

/**
 * Point d'entrée LTI — Moodle POST ici quand l'étudiant clique sur l'activité.
 */
app.post('/lti/launch', (req, res) => {
  const provider = new lti.Provider(LTI_KEY, LTI_SECRET);

  provider.valid_request(req, (err, isValid) => {
    if (err || !isValid) {
      console.error('LTI invalide:', err?.message);
      return res.status(401).send(`
        <h2 style="font-family:sans-serif;color:#dc2626">Authentification LTI échouée</h2>
        <p>Vérifiez la clé et le secret dans Moodle.</p>
        <pre>${err?.message || 'Erreur inconnue'}</pre>
      `);
    }

    const userId      = req.body.user_id;
    const displayName = req.body.lis_person_name_given
                     || req.body.lis_person_name_full?.split(' ')[0]
                     || `Étudiant${Math.floor(Math.random() * 9999)}`;
    const courseId    = req.body.context_id || 'default';

    const token = uuid();
    sessionStore.set(token, { userId, displayName, courseId, createdAt: Date.now() });

    console.log(`LTI launch: ${displayName} (course: ${courseId})`);
    res.redirect(`${PUBLIC_URL}/?token=${token}`);
  });
});

/** Login de développement — désactivé en production */
app.get('/dev/login', (req, res) => {
  if (process.env.NODE_ENV === 'production') return res.status(403).send('Désactivé en production');
  const token = uuid();
  sessionStore.set(token, {
    userId:      req.query.uid  || `dev_${Date.now()}`,
    displayName: req.query.name || 'DevUser',
    courseId:    req.query.course || 'dev_course',
    createdAt:   Date.now(),
  });
  res.redirect(`/?token=${token}`);
});

/** Config ICE pour le client (sans exposer les secrets dans le HTML) */
app.get('/api/ice', (req, res) => {
  res.json({ iceServers: ICE_SERVERS });
});

/** Statut public (pour monitoring) */
app.get('/api/status', (req, res) => {
  res.json({
    playersOnline:  userSockets.size,
    playersWaiting: [...waitingQueues.values()].reduce((s, q) => s + q.length, 0),
    roomsActive:    rooms.size,
  });
});

// Toutes les autres routes → SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// ─── WEBSOCKET SIGNALING ──────────────────────────────────────────────────────

wss.on('connection', ws => {
  let userId = null;

  ws.on('message', raw => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    // ── AUTH ────────────────────────────────────────────────────────────────
    if (msg.type === 'AUTH') {
      const session = sessionStore.get(msg.token);
      if (!session) {
        ws.send(JSON.stringify({ type: 'ERROR', code: 'INVALID_TOKEN', message: 'Token invalide ou expiré. Rechargez depuis Moodle.' }));
        ws.close();
        return;
      }
      userId = session.userId;
      userSockets.set(userId, ws);

      // Déjà en partie ?
      const roomId = userToRoom.get(userId);
      if (roomId && rooms.has(roomId)) {
        const room = rooms.get(roomId);
        const myIdx = room.userIds.indexOf(userId);
        const oppId = room.userIds[1 - myIdx];
        ws.send(JSON.stringify({
          type:         'AUTHENTICATED',
          userId,
          displayName:  session.displayName,
          iceServers:   ICE_SERVERS,
          reconnecting: true,
          roomId,
          myIndex:      myIdx,
          opponentId:   oppId,
          opponentName: room.displayNames[1 - myIdx],
        }));
        // Prévenir l'adversaire
        sendTo(oppId, { type: 'OPPONENT_RECONNECTED' });
        return;
      }

      ws.send(JSON.stringify({
        type:        'AUTHENTICATED',
        userId,
        displayName: session.displayName,
        iceServers:  ICE_SERVERS,
      }));
      return;
    }

    if (!userId) return; // non authentifié

    // ── MATCHMAKING ─────────────────────────────────────────────────────────
    if (msg.type === 'FIND_MATCH') {
      const session = getSessionByUserId(userId);
      if (!session) return;

      const courseId = session.courseId;
      if (!waitingQueues.has(courseId)) waitingQueues.set(courseId, []);
      const queue = waitingQueues.get(courseId);

      // Déjà dans la file ?
      if (queue.find(e => e.userId === userId)) {
        ws.send(JSON.stringify({ type: 'MATCHMAKING', status: 'waiting', position: queue.length }));
        return;
      }

      // Y a-t-il un adversaire qui attend ?
      const oppIdx = queue.findIndex(e => e.userId !== userId);
      if (oppIdx !== -1) {
        const opp = queue.splice(oppIdx, 1)[0];
        const roomId = uuid();
        // J0 = celui qui était en attente, J1 = le nouveau (initiateur WebRTC)
        const room = {
          id:           roomId,
          userIds:      [opp.userId, userId],
          displayNames: [opp.displayName, session.displayName],
          createdAt:    Date.now(),
        };
        rooms.set(roomId, room);
        userToRoom.set(opp.userId, roomId);
        userToRoom.set(userId,     roomId);

        // J0 reçoit la notification (il était en attente, il sera l'offrant WebRTC)
        sendTo(opp.userId, {
          type:         'MATCH_FOUND',
          roomId,
          myIndex:      0,
          opponentId:   userId,
          opponentName: session.displayName,
          isInitiator:  true,   // J0 crée l'offre WebRTC
        });

        // J1 reçoit la notification
        ws.send(JSON.stringify({
          type:         'MATCH_FOUND',
          roomId,
          myIndex:      1,
          opponentId:   opp.userId,
          opponentName: opp.displayName,
          isInitiator:  false,  // J1 répond à l'offre
        }));

      } else {
        queue.push({ userId, displayName: session.displayName });
        ws.send(JSON.stringify({ type: 'MATCHMAKING', status: 'waiting', position: queue.length }));
      }
      return;
    }

    if (msg.type === 'CANCEL_MATCH') {
      const session = getSessionByUserId(userId);
      if (!session) return;
      const queue = waitingQueues.get(session.courseId) || [];
      const idx = queue.findIndex(e => e.userId === userId);
      if (idx !== -1) queue.splice(idx, 1);
      ws.send(JSON.stringify({ type: 'MATCHMAKING', status: 'cancelled' }));
      return;
    }

    // ── SIGNALING WebRTC ─────────────────────────────────────────────────────
    // Le serveur relaie UNIQUEMENT les messages SDP et ICE entre les deux pairs.
    // Il ne comprend pas le contenu — juste un tuyau.

    if (msg.type === 'SIGNAL') {
      const roomId = userToRoom.get(userId);
      if (!roomId) return;
      const room = rooms.get(roomId);
      if (!room) return;

      const myIdx  = room.userIds.indexOf(userId);
      const oppId  = room.userIds[1 - myIdx];

      // Relai pur : on transmet le payload tel quel à l'adversaire
      sendTo(oppId, {
        type:    'SIGNAL',
        from:    userId,
        payload: msg.payload, // { type:'offer'|'answer'|'candidate', ... }
      });
      return;
    }

    // ── ABANDON ──────────────────────────────────────────────────────────────
    if (msg.type === 'FORFEIT') {
      const roomId = userToRoom.get(userId);
      if (!roomId) return;
      const room = rooms.get(roomId);
      if (!room) return;
      const myIdx = room.userIds.indexOf(userId);
      const oppId = room.userIds[1 - myIdx];
      sendTo(oppId, { type: 'OPPONENT_FORFEIT' });
      userToRoom.delete(userId);
      userToRoom.delete(oppId);
      rooms.delete(roomId);
      return;
    }
  });

  ws.on('close', () => {
    if (!userId) return;
    userSockets.delete(userId);

    // Retirer de la file d'attente
    for (const queue of waitingQueues.values()) {
      const idx = queue.findIndex(e => e.userId === userId);
      if (idx !== -1) { queue.splice(idx, 1); break; }
    }

    // Notifier l'adversaire si en partie
    const roomId = userToRoom.get(userId);
    if (roomId) {
      const room = rooms.get(roomId);
      if (room) {
        const myIdx = room.userIds.indexOf(userId);
        const oppId = room.userIds[1 - myIdx];
        sendTo(oppId, { type: 'OPPONENT_DISCONNECTED' });
      }
    }
  });
});

// ─── DÉMARRAGE ────────────────────────────────────────────────────────────────

server.listen(PORT, () => {
  console.log(`✅ PharmaVille signaling server — port ${PORT}`);
  console.log(`   LTI endpoint : POST ${PUBLIC_URL}/lti/launch`);
  console.log(`   Dev login    : GET  http://localhost:${PORT}/dev/login?name=Alice&uid=1`);
  console.log(`   ICE servers  : ${ICE_SERVERS.length} configurés`);
});
