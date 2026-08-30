/* =========================================================================
   PHARMA-COOK — Relais WebSocket (Cloudflare Worker + Durable Object)
   -------------------------------------------------------------------------
   Rôle : aiguiller les messages entre UN écran (host, la page Three.js)
          et N manettes (pads, les téléphones).
   L'écran est autoritatif : il fait tourner toute la simulation.
   Le Worker ne connaît RIEN des règles du jeu, il ne fait que relayer.

   Routes :
     GET /ws?room=ABCD&role=host   → l'écran
     GET /ws?room=ABCD&role=pad    → un téléphone
     GET /health                   → ok

   Déploiement (wrangler.toml) :
     name = "pharma-cook"
     main = "worker.js"
     compatibility_date = "2024-09-01"
     [[durable_objects.bindings]]
     name = "ROOMS"
     class_name = "Room"
     [[migrations]]
     tag = "v1"
     new_classes = ["Room"]
   ========================================================================= */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/health') {
      return new Response('ok', { headers: cors() });
    }

    if (url.pathname === '/ws') {
      const room = (url.searchParams.get('room') || '').toUpperCase().slice(0, 8);
      if (!/^[A-Z0-9]{4,8}$/.test(room)) {
        return new Response('code de salon invalide', { status: 400, headers: cors() });
      }
      const id = env.ROOMS.idFromName(room);
      return env.ROOMS.get(id).fetch(request);
    }

    return new Response('Pharma-Cook relay', { headers: cors() });
  }
};

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*'
  };
}

export class Room {
  constructor(state) {
    this.state = state;
    this.host = null;      // WebSocket de l'écran
    this.pads = new Map(); // padId -> WebSocket
    this.nextPad = 1;
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('websocket attendu', { status: 426 });
    }

    const role = url.searchParams.get('role') === 'host' ? 'host' : 'pad';
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    server.accept();

    if (role === 'host') {
      // Un seul écran par salon : le nouveau remplace l'ancien.
      if (this.host) { try { this.host.close(1000, 'remplacé'); } catch (e) {} }
      this.host = server;

      // On annonce à l'écran les manettes déjà présentes.
      for (const padId of this.pads.keys()) {
        this.send(server, { t: 'padjoin', id: padId });
      }

      server.addEventListener('message', (ev) => this.onHostMessage(ev));
      server.addEventListener('close', () => { if (this.host === server) this.host = null; });
      server.addEventListener('error', () => { if (this.host === server) this.host = null; });

    } else {
      const padId = this.nextPad++;
      this.pads.set(padId, server);
      this.send(server, { t: 'welcome', id: padId, screen: !!this.host });
      if (this.host) this.send(this.host, { t: 'padjoin', id: padId });

      server.addEventListener('message', (ev) => {
        if (!this.host) return;
        const msg = this.parse(ev.data);
        if (!msg) return;
        msg.id = padId;               // l'écran doit toujours savoir qui parle
        this.send(this.host, msg);
      });

      const bye = () => {
        this.pads.delete(padId);
        if (this.host) this.send(this.host, { t: 'padleave', id: padId });
      };
      server.addEventListener('close', bye);
      server.addEventListener('error', bye);
    }

    return new Response(null, { status: 101, webSocket: client });
  }

  onHostMessage(ev) {
    const msg = this.parse(ev.data);
    if (!msg) return;
    if (msg.to) {
      // Message ciblé vers une manette précise.
      const pad = this.pads.get(msg.to);
      if (pad) this.send(pad, msg);
    } else {
      // Diffusion à toutes les manettes.
      for (const pad of this.pads.values()) this.send(pad, msg);
    }
  }

  parse(data) {
    try { return JSON.parse(data); } catch (e) { return null; }
  }

  send(ws, obj) {
    try { ws.send(JSON.stringify(obj)); } catch (e) {}
  }
}
