// Serveur relais minimal — Sherlock VR/AR
// Usage : node relay-server.js
// Dépendance : npm install ws
//
// Ne synchronise que des événements (pas de géométrie), conformément
// à l'architecture validée. Chaque session regroupe exactement un client
// "ar" et un client "vr" ; tout message reçu de l'un est retransmis à l'autre.
//
// Nouveauté : la partie ne démarre plus automatiquement à la connexion.
// Elle démarre quand l'un des deux clients envoie un événement "start_game"
// avec un niveau de difficulté ; le serveur génère alors un seed et le
// diffuse aux deux clients avec la difficulté choisie.

const WebSocket = require("ws");

const PORT = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port: PORT });

// sessions: Map<sessionCode, { ar: ws|null, vr: ws|null, seed: number|null, difficulty: string|null, started: boolean }>
const sessions = new Map();

function getOrCreateSession(code) {
  if (!sessions.has(code)) {
    sessions.set(code, {
      ar: null,
      vr: null,
      seed: null,
      difficulty: null,
      started: false,
    });
  }
  return sessions.get(code);
}

function sendTo(ws, obj) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(obj));
  }
}

wss.on("connection", (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const sessionCode = url.searchParams.get("session") || "DEFAULT";
  const role = url.searchParams.get("role"); // "ar" ou "vr"

  if (role !== "ar" && role !== "vr") {
    ws.close(1008, "role invalide (attendu: ar | vr)");
    return;
  }

  const session = getOrCreateSession(sessionCode);
  session[role] = ws;

  console.log(`[relay] ${role} connecté sur la session "${sessionCode}"`);

  // Si la partie a déjà démarré (l'autre joueur a déjà choisi une difficulté),
  // on renvoie immédiatement le même seed/difficulté à ce nouveau venu.
  if (session.started) {
    sendTo(ws, {
      type: "session_seed",
      payload: JSON.stringify({ seed: session.seed, difficulty: session.difficulty }),
    });
  }

  ws.on("message", (data) => {
    let parsed;
    try {
      parsed = JSON.parse(data.toString());
    } catch (e) {
      console.warn(`[relay] Message JSON invalide ignoré (${role}) :`, data.toString());
      return;
    }

    const peerRole = role === "ar" ? "vr" : "ar";
    const peer = session[peerRole];

    if (parsed.type === "start_game") {
      if (!session.started) {
        session.started = true;
        session.seed = Math.floor(Math.random() * 1_000_000);
        session.difficulty = parsed.difficulty || "normal";
        console.log(`[relay] Partie démarrée sur "${sessionCode}" — seed=${session.seed}, difficulté=${session.difficulty}`);
      }

      const seedPayload = {
        type: "session_seed",
        payload: JSON.stringify({ seed: session.seed, difficulty: session.difficulty }),
      };
      sendTo(session.ar, seedPayload);
      sendTo(session.vr, seedPayload);
      return;
    }

    console.log(`[relay] ${role} -> ${peerRole} : ${data}`);
    sendTo(peer, parsed);
  });

  ws.on("close", () => {
    console.log(`[relay] ${role} déconnecté de la session "${sessionCode}"`);
    session[role] = null;

    // Nettoyage si la session est totalement vide
    if (!session.ar && !session.vr) {
      sessions.delete(sessionCode);
    }
  });
});

console.log(`[relay] Serveur relais Sherlock VR/AR en écoute sur ws://localhost:${PORT}`);
