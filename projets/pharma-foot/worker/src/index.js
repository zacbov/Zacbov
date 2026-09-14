/* PHARMA-FOOT — relais WebSocket (Worker + Durable Object)
   Le "screen" est autoritaire : les manettes lui envoient leurs inputs,
   il leur renvoie l'état / les vibrations. Le DO ne fait que router. */

export class Room {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.screen = null;
    this.controllers = new Map(); // id -> ws
  }

  send(ws, obj) {
    try { ws.send(JSON.stringify(obj)); } catch (e) {}
  }

  toScreen(obj) {
    if (this.screen) this.send(this.screen, obj);
  }

  async fetch(req) {
    const url = new URL(req.url);
    if (req.headers.get('Upgrade') !== 'websocket') {
      return new Response('expected websocket', { status: 426 });
    }
    const role = url.searchParams.get('role') === 'screen' ? 'screen' : 'ctrl';
    const id = (url.searchParams.get('id') || '').slice(0, 40) || crypto.randomUUID();

    const pair = new WebSocketPair();
    const client = pair[0], server = pair[1];
    server.accept();

    if (role === 'screen') {
      if (this.screen) { try { this.screen.close(4000, 'replaced'); } catch (e) {} }
      this.screen = server;
      server.addEventListener('message', (e) => {
        let m; try { m = JSON.parse(e.data); } catch (err) { return; }
        if (!m || !m.d) return;
        if (m.to === '*') {
          for (const ws of this.controllers.values()) this.send(ws, m.d);
        } else {
          const ws = this.controllers.get(m.to);
          if (ws) this.send(ws, m.d);
        }
      });
      server.addEventListener('close', () => { if (this.screen === server) this.screen = null; });
      server.addEventListener('error', () => { if (this.screen === server) this.screen = null; });
      // resynchro : on annonce les manettes déjà connectées
      for (const cid of this.controllers.keys()) this.toScreen({ t: 'ctrl_join', id: cid });
    } else {
      const old = this.controllers.get(id);
      if (old) { try { old.close(4001, 'replaced'); } catch (e) {} }
      this.controllers.set(id, server);
      server.addEventListener('message', (e) => {
        let d; try { d = JSON.parse(e.data); } catch (err) { return; }
        this.toScreen({ t: 'from', id, d });
      });
      const bye = () => {
        if (this.controllers.get(id) === server) {
          this.controllers.delete(id);
          this.toScreen({ t: 'ctrl_leave', id });
        }
      };
      server.addEventListener('close', bye);
      server.addEventListener('error', bye);
      this.send(server, { t: 'hello', id, screen: !!this.screen });
      this.toScreen({ t: 'ctrl_join', id });
    }

    return new Response(null, { status: 101, webSocket: client });
  }
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === '/ws') {
      const room = (url.searchParams.get('room') || 'LOBBY').toUpperCase().slice(0, 8);
      const idObj = env.ROOMS.idFromName(room);
      return env.ROOMS.get(idObj).fetch(req);
    }
    if (url.pathname === '/health') return new Response('ok');
    return new Response('PHARMA-FOOT relay', { status: 200 });
  }
};
