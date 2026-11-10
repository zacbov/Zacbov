// Dracula — relais temps réel entre l'écran (jeu) et le téléphone (manette)
// Chaque code à 4 lettres = une « salle » (Durable Object). Tout message reçu est renvoyé aux autres connectés.
export class Room {
  constructor(state, env) { this.state = state; }
  async fetch(request) {
    if (request.headers.get('Upgrade') !== 'websocket') return new Response('WebSocket attendu', { status: 426 });
    const [client, server] = Object.values(new WebSocketPair());
    this.state.acceptWebSocket(server);          // API « hibernation » : la salle dort quand personne ne parle
    return new Response(null, { status: 101, webSocket: client });
  }
  webSocketMessage(ws, message) {
    for (const s of this.state.getWebSockets()) {
      if (s !== ws) { try { s.send(message); } catch (e) {} }
    }
  }
  webSocketClose(ws, code) { try { ws.close(code, 'bye'); } catch (e) {} }
  webSocketError(ws) { try { ws.close(1011); } catch (e) {} }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/ws') {
      const room = (url.searchParams.get('room') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
      if (!room) return new Response('room manquante', { status: 400 });
      const id = env.ROOM.idFromName(room);
      return env.ROOM.get(id).fetch(request);
    }
    return new Response('Dracula relay OK', { headers: { 'content-type': 'text/plain; charset=utf-8', 'access-control-allow-origin': '*' } });
  },
};
