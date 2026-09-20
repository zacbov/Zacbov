/* =====================================================================
   PHARMA-FOOT — écran de rendu  (Three.js r128)
   L'écran est autoritaire : physique, IA, score. Les téléphones
   n'envoient que des inputs.
   ===================================================================== */
'use strict';

/* ---------------- CONFIG ---------------- */
const CFG = {
  RELAY: 'wss://pharmafoot.zacharybov.workers.dev/ws',
  AI: {
    easy:   { spd: 0.86, react: 0.42, err: 3.0, shoot: 0.55 },
    normal: { spd: 0.95, react: 0.26, err: 1.7, shoot: 0.75 },
    hard:   { spd: 1.02, react: 0.13, err: 0.9, shoot: 0.92 }
  }
};

/* Terrain : X = longueur (buts en ±W/2), Z = largeur */
const F = { W: 72, H: 46, GW: 11, GH: 3.6, GD: 2.6, BOXX: 12, BOXZ: 24, SIXX: 5, SIXZ: 12 };

const P = {
  R: 0.62, ACC: 52, MAX: 9.0, SPRINT: 1.26, FRIC: 8.5,
  CTRL: 1.35, DRIB: 0.92, STAM: 3.2
};
const BL = { R: 0.36, G: -22, DRAG: 0.02, BOUNCE: 0.55, ROLL: 0.988 };

const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : (v > b ? b : v));
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a, b) => a + Math.random() * (b - a);
const now = () => performance.now() / 1000;

/* ---------------- AUDIO (procédural) ---------------- */
const SFX = {
  ctx: null, master: null, crowdG: null, exc: 0,
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.85;
    this.master.connect(this.ctx.destination);
    // rumeur de foule : bruit filtré en boucle
    const sr = this.ctx.sampleRate, len = sr * 4;
    const buf = this.ctx.createBuffer(1, len, sr), d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = last * 0.965 + w * 0.035; d[i] = last * 3.2; }
    const src = this.ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 620; lp.Q.value = 0.6;
    this.crowdG = this.ctx.createGain(); this.crowdG.gain.value = 0.05;
    src.connect(lp); lp.connect(this.crowdG); this.crowdG.connect(this.master); src.start();
    this.lp = lp;
  },
  tone(f, dur, type, vol, f2) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol == null ? 0.25 : vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.02);
  },
  noise(dur, freq, vol) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime, sr = this.ctx.sampleRate;
    const n = Math.max(1, (sr * dur) | 0);
    const b = this.ctx.createBuffer(1, n, sr), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = this.ctx.createBufferSource(); s.buffer = b;
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq || 900; f.Q.value = 1.1;
    const g = this.ctx.createGain(); g.gain.value = vol == null ? 0.3 : vol;
    s.connect(f); f.connect(g); g.connect(this.master); s.start(t);
  },
  kick(pw) { this.tone(150 + pw * 90, 0.12, 'triangle', 0.32, 60); this.noise(0.06, 1600, 0.18 + pw * 0.2); },
  touch() { this.tone(220, 0.05, 'sine', 0.1, 140); },
  tackle() { this.noise(0.22, 420, 0.35); this.tone(90, 0.18, 'sawtooth', 0.14, 45); },
  post() { this.tone(880, 0.35, 'square', 0.22, 300); },
  save() { this.noise(0.14, 700, 0.3); this.tone(320, 0.1, 'sine', 0.15, 180); },
  whistle(long) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime, dur = long ? 1.1 : 0.42;
    for (let k = 0; k < 2; k++) {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain(), lfo = this.ctx.createOscillator(), lg = this.ctx.createGain();
      o.type = 'sine'; o.frequency.value = 2050 + k * 260;
      lfo.frequency.value = 32; lg.gain.value = 90; lfo.connect(lg); lg.connect(o.frequency); lfo.start(t); lfo.stop(t + dur);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.16, t + 0.03);
      g.gain.setValueAtTime(0.16, t + dur - 0.08); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.02);
    }
  },
  cheer(v) {
    if (!this.crowdG || !this.ctx) return;
    const t = this.ctx.currentTime;
    this.crowdG.gain.cancelScheduledValues(t);
    this.crowdG.gain.setValueAtTime(this.crowdG.gain.value, t);
    this.crowdG.gain.linearRampToValueAtTime(v, t + 0.15);
    this.crowdG.gain.linearRampToValueAtTime(0.05, t + 4.5);
    if (this.lp) {
      this.lp.frequency.cancelScheduledValues(t);
      this.lp.frequency.setValueAtTime(2200, t);
      this.lp.frequency.linearRampToValueAtTime(620, t + 4.5);
    }
  }
};

/* ---------------- RESEAU ---------------- */
class Net {
  constructor(room, onMsg) {
    this.room = room; this.onMsg = onMsg; this.ws = null; this.open = false; this.tries = 0;
    this.connect();
  }
  connect() {
    const url = CFG.RELAY + '?room=' + encodeURIComponent(this.room) + '&role=screen&id=screen';
    let ws;
    try { ws = new WebSocket(url); } catch (e) { this.retry(); return; }
    this.ws = ws;
    ws.onopen = () => { this.open = true; this.tries = 0; setConn('relais connecté · ' + this.room); };
    ws.onclose = () => { this.open = false; setConn('reconnexion…'); this.retry(); };
    ws.onerror = () => { setConn('erreur relais'); };
    ws.onmessage = (e) => {
      let m; try { m = JSON.parse(e.data); } catch (err) { return; }
      this.onMsg(m);
    };
  }
  retry() {
    this.tries++;
    setTimeout(() => this.connect(), Math.min(6000, 700 * this.tries));
  }
  send(to, d) { if (this.open) { try { this.ws.send(JSON.stringify({ to: to, d: d })); } catch (e) {} } }
}
function setConn(s) { const e = document.getElementById('conn'); if (e) e.textContent = s; }

/* =====================================================================
   TEXTURES PROCEDURALES
   ===================================================================== */
function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function tex(canvas, rep) {
  const t = new THREE.CanvasTexture(canvas);
  t.anisotropy = 4;
  if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); }
  return t;
}

function pitchTexture() {
  const S = 16, w = F.W * S, h = F.H * S;
  const c = cv(w, h), x = c.getContext('2d');
  // pelouse + bandes de tonte
  x.fillStyle = '#2f7c3c'; x.fillRect(0, 0, w, h);
  const bands = 12;
  for (let i = 0; i < bands; i++) {
    x.fillStyle = i % 2 ? 'rgba(255,255,255,.055)' : 'rgba(0,0,0,.05)';
    x.fillRect((i * w) / bands, 0, w / bands, h);
  }
  // grain
  for (let i = 0; i < 9000; i++) {
    x.fillStyle = 'rgba(255,255,255,' + (Math.random() * 0.035) + ')';
    x.fillRect(Math.random() * w, Math.random() * h, 2, 2);
  }
  // lignes
  x.strokeStyle = 'rgba(255,255,255,.92)'; x.lineWidth = 3.2;
  const m = 0.7 * S;
  x.strokeRect(m, m, w - 2 * m, h - 2 * m);
  x.beginPath(); x.moveTo(w / 2, m); x.lineTo(w / 2, h - m); x.stroke();
  x.beginPath(); x.arc(w / 2, h / 2, 8 * S, 0, TAU); x.stroke();
  x.beginPath(); x.arc(w / 2, h / 2, 0.45 * S, 0, TAU); x.fillStyle = '#fff'; x.fill();
  // surfaces
  const box = (dx, dz, side) => {
    const bw = dx * S, bh = dz * S;
    const px = side > 0 ? w - m - bw : m;
    x.strokeRect(px, h / 2 - bh / 2, bw, bh);
  };
  for (const s of [-1, 1]) {
    box(F.BOXX, F.BOXZ, s);
    box(F.SIXX, F.SIXZ, s);
    // point de penalty
    const px = s > 0 ? w - m - 9 * S : m + 9 * S;
    x.beginPath(); x.arc(px, h / 2, 0.45 * S, 0, TAU); x.fillStyle = '#fff'; x.fill();
    // arc de surface
    x.beginPath();
    x.arc(px, h / 2, 6.6 * S, s > 0 ? Math.PI * 0.62 : -Math.PI * 0.38, s > 0 ? Math.PI * 1.38 : Math.PI * 0.38);
    x.stroke();
  }
  // corners
  for (const cx of [m, w - m]) for (const cz of [m, h - m]) {
    x.beginPath(); x.arc(cx, cz, 1.2 * S, 0, TAU); x.stroke();
  }
  return tex(c);
}

function netTexture() {
  const c = cv(128, 128), x = c.getContext('2d');
  x.clearRect(0, 0, 128, 128);
  x.strokeStyle = 'rgba(255,255,255,.75)'; x.lineWidth = 2;
  for (let i = 0; i <= 128; i += 12) {
    x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 128); x.stroke();
    x.beginPath(); x.moveTo(0, i); x.lineTo(128, i); x.stroke();
  }
  const t = tex(c, 1); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 3);
  return t;
}

function jerseyTexture(base, accent, pattern) {
  const c = cv(128, 128), x = c.getContext('2d');
  x.fillStyle = base; x.fillRect(0, 0, 128, 128);
  x.fillStyle = accent;
  if (pattern === 'stripes') { for (let i = 8; i < 128; i += 34) x.fillRect(i, 0, 16, 128); }
  else if (pattern === 'hoops') { for (let i = 14; i < 128; i += 34) x.fillRect(0, i, 128, 15); }
  else if (pattern === 'sash') { x.save(); x.translate(64, 64); x.rotate(-0.72); x.fillRect(-120, -13, 240, 26); x.restore(); }
  else if (pattern === 'half') { x.fillRect(64, 0, 64, 128); }
  else { x.fillRect(0, 108, 128, 8); } // liseré bas
  // ombrage
  const g = x.createLinearGradient(0, 0, 0, 128);
  g.addColorStop(0, 'rgba(255,255,255,.12)'); g.addColorStop(1, 'rgba(0,0,0,.22)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  return tex(c);
}
function backTexture(base, accent, num, name) {
  const c = cv(128, 128), x = c.getContext('2d');
  x.fillStyle = base; x.fillRect(0, 0, 128, 128);
  x.fillStyle = 'rgba(255,255,255,.9)';
  x.font = 'bold 62px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(String(num), 64, 74);
  x.font = 'bold 15px Arial'; x.fillStyle = 'rgba(255,255,255,.85)';
  x.fillText(String(name || '').toUpperCase().slice(0, 10), 64, 26);
  return tex(c);
}
function labelSprite(text, color) {
  const c = cv(256, 64), x = c.getContext('2d');
  x.fillStyle = 'rgba(0,0,0,.45)';
  x.beginPath();
  if (x.roundRect) { x.roundRect(8, 10, 240, 44, 12); x.fill(); } else x.fillRect(8, 10, 240, 44);
  x.fillStyle = color || '#fff'; x.font = 'bold 28px Trebuchet MS'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(String(text).toUpperCase().slice(0, 12), 128, 33);
  const m = new THREE.SpriteMaterial({ map: tex(c), transparent: true, depthTest: false });
  const s = new THREE.Sprite(m);
  s.scale.set(3.1, 0.78, 1);
  s.renderOrder = 20;
  return s;
}
function skyTexture() {
  const c = cv(8, 256), x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, '#0a1b2e'); g.addColorStop(0.45, '#17415e'); g.addColorStop(0.8, '#2a6d6a'); g.addColorStop(1, '#0b1a12');
  x.fillStyle = g; x.fillRect(0, 0, 8, 256);
  return tex(c);
}

/* =====================================================================
   SCENE
   ===================================================================== */
let renderer, scene, camera, sun, crowdMesh, ballMesh, ballShadow;
const camState = { pos: new THREE.Vector3(0, 30, F.H / 2 + 34), look: new THREE.Vector3(0, 0, 0) };

function initScene() {
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;
  document.getElementById('app').appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = skyTexture();
  scene.fog = new THREE.Fog(0x0d2233, 90, 210);

  camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.5, 400);
  camera.position.copy(camState.pos);

  scene.add(new THREE.HemisphereLight(0xbfe4ff, 0x24391f, 0.75));
  sun = new THREE.DirectionalLight(0xfff3d6, 1.05);
  sun.position.set(-40, 60, 30);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const d = 48;
  sun.shadow.camera.left = -d; sun.shadow.camera.right = d;
  sun.shadow.camera.top = d; sun.shadow.camera.bottom = -d;
  sun.shadow.camera.near = 10; sun.shadow.camera.far = 160;
  sun.shadow.bias = -0.0012;
  scene.add(sun); scene.add(sun.target);

  // pelouse
  const pitch = new THREE.Mesh(
    new THREE.PlaneGeometry(F.W, F.H),
    new THREE.MeshLambertMaterial({ map: pitchTexture() })
  );
  pitch.rotation.x = -Math.PI / 2; pitch.receiveShadow = true;
  scene.add(pitch);

  // bordure verte + piste
  const outer = new THREE.Mesh(
    new THREE.PlaneGeometry(F.W + 18, F.H + 18),
    new THREE.MeshLambertMaterial({ color: 0x1f5b2c })
  );
  outer.rotation.x = -Math.PI / 2; outer.position.y = -0.02; outer.receiveShadow = true;
  scene.add(outer);

  buildGoals();
  buildBoards();
  buildStands();
  buildBall();
}

function buildGoals() {
  const white = new THREE.MeshLambertMaterial({ color: 0xf2f6f4 });
  const netMat = new THREE.MeshLambertMaterial({ map: netTexture(), transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false });
  for (const s of [-1, 1]) {
    const g = new THREE.Group();
    const px = s * F.W / 2;
    const postG = new THREE.CylinderGeometry(0.13, 0.13, F.GH, 8);
    for (const z of [-F.GW / 2, F.GW / 2]) {
      const p = new THREE.Mesh(postG, white);
      p.position.set(px, F.GH / 2, z); p.castShadow = true; g.add(p);
    }
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, F.GW + 0.26, 8), white);
    bar.rotation.x = Math.PI / 2; bar.position.set(px, F.GH, 0); bar.castShadow = true; g.add(bar);
    // filets : fond + côtés + toit
    const back = new THREE.Mesh(new THREE.PlaneGeometry(F.GW, F.GH), netMat);
    back.position.set(px + s * F.GD, F.GH / 2, 0); back.rotation.y = s > 0 ? -Math.PI / 2 : Math.PI / 2; g.add(back);
    for (const z of [-F.GW / 2, F.GW / 2]) {
      const sd = new THREE.Mesh(new THREE.PlaneGeometry(F.GD, F.GH), netMat);
      sd.position.set(px + s * F.GD / 2, F.GH / 2, z); g.add(sd);
    }
    const top = new THREE.Mesh(new THREE.PlaneGeometry(F.GW, F.GD), netMat);
    top.rotation.x = Math.PI / 2; top.position.set(px + s * F.GD / 2, F.GH, 0); g.add(top);
    scene.add(g);
  }
}

function buildBoards() {
  const mat = new THREE.MeshLambertMaterial({ color: 0x11202c });
  const acc = new THREE.MeshLambertMaterial({ color: 0x1a9c5e });
  const hz = F.H / 2 + 1.6, hx = F.W / 2 + 1.6, hgt = 1.0;
  const long = new THREE.BoxGeometry(F.W + 3.2, hgt, 0.4);
  const shrt = new THREE.BoxGeometry(0.4, hgt, F.H + 3.2);
  for (const z of [-hz, hz]) { const m = new THREE.Mesh(long, mat); m.position.set(0, hgt / 2, z); m.receiveShadow = true; scene.add(m); }
  for (const x of [-hx, hx]) { const m = new THREE.Mesh(shrt, mat); m.position.set(x, hgt / 2, 0); m.receiveShadow = true; scene.add(m); }
  for (const z of [-hz, hz]) { const m = new THREE.Mesh(new THREE.BoxGeometry(F.W + 3.3, 0.12, 0.46), acc); m.position.set(0, hgt, z); scene.add(m); }
}

function buildStands() {
  const mat = new THREE.MeshLambertMaterial({ color: 0x1b2b38 });
  const tiers = 5;
  const grp = new THREE.Group();
  for (const s of [-1, 1]) {
    for (let i = 0; i < tiers; i++) {
      const y = 0.9 + i * 1.15, dz = F.H / 2 + 3.4 + i * 1.5;
      const m = new THREE.Mesh(new THREE.BoxGeometry(F.W + 16, 1.2, 1.5), mat);
      m.position.set(0, y, s * dz); grp.add(m);
    }
  }
  for (const s of [-1, 1]) {
    for (let i = 0; i < tiers; i++) {
      const y = 0.9 + i * 1.15, dx = F.W / 2 + 5 + i * 1.5;
      const m = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.2, F.H + 16), mat);
      m.position.set(s * dx, y, 0); grp.add(m);
    }
  }
  scene.add(grp);

  // public : InstancedMesh
  const N = 1400;
  const geo = new THREE.BoxGeometry(0.55, 0.9, 0.5);
  const im = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial(), N);
  im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const col = new THREE.Color(), pal = [0x2f6bff, 0xe0353f, 0xffffff, 0xf2c94c, 0x2ecb7a, 0x9b59b6];
  const seeds = [];
  const dummy = new THREE.Object3D();
  for (let i = 0; i < N; i++) {
    const side = (Math.random() * 4) | 0, tier = (Math.random() * tiers) | 0;
    let x, z;
    if (side < 2) {
      const s = side === 0 ? -1 : 1;
      x = rnd(-(F.W / 2 + 7), F.W / 2 + 7); z = s * (F.H / 2 + 3.4 + tier * 1.5);
    } else {
      const s = side === 2 ? -1 : 1;
      z = rnd(-(F.H / 2 + 7), F.H / 2 + 7); x = s * (F.W / 2 + 5 + tier * 1.5);
    }
    const y = 0.9 + tier * 1.15 + 1.05;
    seeds.push({ x: x, y: y, z: z, p: Math.random() * TAU });
    dummy.position.set(x, y, z); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix);
    col.setHex(pal[(Math.random() * pal.length) | 0]).multiplyScalar(rnd(0.55, 1));
    im.setColorAt(i, col);
  }
  im.instanceColor.needsUpdate = true;
  scene.add(im);
  crowdMesh = { mesh: im, seeds: seeds, dummy: dummy, hype: 0 };
}

function buildBall() {
  const c = cv(128, 128), x = c.getContext('2d');
  x.fillStyle = '#fbfbfb'; x.fillRect(0, 0, 128, 128);
  x.fillStyle = '#14181c';
  for (let i = 0; i < 12; i++) {
    x.save(); x.translate(rnd(0, 128), rnd(0, 128)); x.rotate(rnd(0, TAU));
    x.beginPath();
    for (let k = 0; k < 5; k++) { const a = (k / 5) * TAU, r = 13; x.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    x.closePath(); x.fill(); x.restore();
  }
  ballMesh = new THREE.Mesh(
    new THREE.SphereGeometry(BL.R, 20, 14),
    new THREE.MeshLambertMaterial({ map: tex(c) })
  );
  ballMesh.castShadow = true;
  scene.add(ballMesh);

  const sc = cv(64, 64), sx = sc.getContext('2d');
  const g = sx.createRadialGradient(32, 32, 2, 32, 32, 30);
  g.addColorStop(0, 'rgba(0,0,0,.5)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  sx.fillStyle = g; sx.fillRect(0, 0, 64, 64);
  ballShadow = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5),
    new THREE.MeshBasicMaterial({ map: tex(sc), transparent: true, depthWrite: false }));
  ballShadow.rotation.x = -Math.PI / 2; ballShadow.position.y = 0.02;
  scene.add(ballShadow);
}

/* =====================================================================
   JOUEURS (modèle 3D articulé)
   ===================================================================== */
function buildPlayerMesh(p) {
  const g = new THREE.Group();
  const skin = new THREE.MeshLambertMaterial({ color: p.custom.skin });
  const base = p.teamColor, acc = p.custom.accent;

  // jambes
  const legMat = new THREE.MeshLambertMaterial({ color: p.custom.shorts });
  const sockMat = new THREE.MeshLambertMaterial({ color: acc });
  const shoeMat = new THREE.MeshLambertMaterial({ color: p.custom.shoes });
  const legs = [];
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(s * 0.22, 0.86, 0);
    const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.46, 0.28), skin);
    thigh.position.y = -0.23; thigh.castShadow = true; pivot.add(thigh);
    const sock = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.34, 0.3), sockMat);
    sock.position.y = -0.63; sock.castShadow = true; pivot.add(sock);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 0.46), shoeMat);
    shoe.position.set(0, -0.85, 0.08); shoe.castShadow = true; pivot.add(shoe);
    g.add(pivot); legs.push(pivot);
  }

  // short
  const shorts = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.46, 0.6), legMat);
  shorts.position.y = 1.05; shorts.castShadow = true; g.add(shorts);

  // torse (maillot) : [ +x, -x, +y, -y, +z(face), -z(dos) ]
  const jt = jerseyTexture(base, acc, p.custom.pattern);
  const jm = new THREE.MeshLambertMaterial({ map: jt });
  const bm = new THREE.MeshLambertMaterial({ map: backTexture(base, acc, p.num, p.name) });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.92, 0.6), [jm, jm, jm, jm, jm, bm]);
  torso.position.y = 1.72; torso.castShadow = true; g.add(torso);

  // bras
  const arms = [];
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(s * 0.62, 2.05, 0);
    const up = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.4, 0.24), jm);
    up.position.y = -0.2; up.castShadow = true; pivot.add(up);
    const lo = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.42, 0.22), skin);
    lo.position.y = -0.58; lo.castShadow = true; pivot.add(lo);
    g.add(pivot); arms.push(pivot);
  }

  // tête (face = +z, index 4)
  const headMats = [];
  for (let i = 0; i < 6; i++) headMats.push(new THREE.MeshLambertMaterial({ color: p.custom.skin }));
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.7, 0.62), headMats);
  head.position.y = 2.46; head.castShadow = true; g.add(head);
  // visage par défaut (avant photo)
  headMats[4] = new THREE.MeshLambertMaterial({ map: faceTexture(p.custom.skin) });
  head.material = headMats;
  // cheveux
  const hair = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.2, 0.66),
    new THREE.MeshLambertMaterial({ color: p.custom.hair }));
  hair.position.y = 2.82; hair.castShadow = true; g.add(hair);

  // anneau au sol
  let ring = null;
  const ringCol = p.isHuman ? (p.custom.accent) : (p.team === 0 ? p.teamColor : p.teamColor);
  ring = new THREE.Mesh(new THREE.RingGeometry(0.72, 0.92, 24),
    new THREE.MeshBasicMaterial({ color: ringCol, transparent: true, opacity: p.isHuman ? 0.85 : 0.28, side: THREE.DoubleSide, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.03; g.add(ring);

  let label = null;
  if (p.isHuman) {
    label = labelSprite(p.name, '#ffffff');
    label.position.y = 3.35; g.add(label);
  }

  g.userData = { legs: legs, arms: arms, torso: torso, head: head, headMats: headMats, ring: ring, label: label };
  scene.add(g);
  return g;
}

function faceTexture(skin) {
  const c = cv(64, 64), x = c.getContext('2d');
  x.fillStyle = skin; x.fillRect(0, 0, 64, 64);
  x.fillStyle = '#1a1210';
  x.fillRect(16, 26, 8, 6); x.fillRect(40, 26, 8, 6);
  x.fillRect(24, 44, 16, 3);
  return tex(c);
}
function applyPhoto(p, dataUrl) {
  const img = new Image();
  img.onload = function () {
    const c = cv(128, 128), x = c.getContext('2d');
    const side = Math.min(img.width, img.height);
    x.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, 128, 128);
    const t = tex(c);
    const md = p.mesh.userData;
    md.headMats[4] = new THREE.MeshLambertMaterial({ map: t });
    md.head.material = md.headMats;
    p.photoTex = t;
    if (p.avatar) p.avatar.style.backgroundImage = 'url(' + dataUrl + ')';
  };
  img.src = dataUrl;
}

/* =====================================================================
   ETAT DE JEU
   ===================================================================== */
const G = {
  phase: 'LOBBY',          // LOBBY | KICKOFF | PLAY | GOAL | END
  timer: 0,                 // timer de phase
  clock: 0,                 // temps de match restant
  score: [0, 0],
  players: [],
  ball: { p: new THREE.Vector3(0, BL.R, 0), v: new THREE.Vector3(), spin: 0, owner: null, lastTouch: null, lock: 0 },
  kickoffTeam: 0,
  settings: { fmt: 3, dur: 240, diff: 'normal', gk: true, colA: '#2f6bff', colB: '#e0353f' },
  humans: new Map(),        // ctrlId -> human record
  net: null,
  room: '----',
  aiCfg: CFG.AI.normal,
  scorer: null
};

const PALETTE = [
  ['#2f6bff', '#e0353f'], ['#12b886', '#f76707'], ['#e6e6e6', '#111827'],
  ['#f2c94c', '#7048e8'], ['#0ea5e9', '#f43f5e']
];

/* ---------- formations ---------- */
function formation(n) {
  const F1 = [[-0.10, 0]];
  const F2 = [[-0.28, -0.20], [-0.06, 0.20]];
  const F3 = [[-0.32, 0], [-0.08, -0.26], [-0.08, 0.26]];
  const F4 = [[-0.34, -0.20], [-0.34, 0.20], [-0.08, -0.24], [-0.08, 0.24]];
  const F5 = [[-0.36, 0], [-0.28, -0.28], [-0.28, 0.28], [-0.06, -0.20], [-0.06, 0.20]];
  return [F1, F2, F3, F4, F5][clamp(n, 1, 5) - 1];
}
function goalX(team) { return team === 0 ? F.W / 2 : -F.W / 2; }   // but attaqué
function ownX(team) { return team === 0 ? -F.W / 2 : F.W / 2; }
function dirOf(team) { return team === 0 ? 1 : -1; }

/* ---------- création des joueurs ---------- */
let uid = 1;
function createPlayer(team, idx, n, human) {
  const set = G.settings;
  const teamColor = team === 0 ? set.colA : set.colB;
  const custom = human ? human.custom : {
    skin: ['#f3d0b0', '#e0b48a', '#c98d5f', '#8d5a36', '#5c3a22'][(Math.random() * 5) | 0],
    hair: ['#1a1210', '#4a2c17', '#c9a227', '#7a7a7a'][(Math.random() * 4) | 0],
    accent: team === 0 ? '#ffffff' : '#1a1a1a',
    shorts: team === 0 ? '#ffffff' : '#1a1a1a',
    shoes: ['#111', '#fff', '#f2c94c', '#e0353f'][(Math.random() * 4) | 0],
    pattern: 'plain'
  };
  const p = {
    id: uid++, team: team, idx: idx, isHuman: !!human, ctrl: human ? human.id : null,
    name: human ? human.name : (idx === -1 ? 'GK' : 'CPU ' + (idx + 1)),
    num: human ? human.num : (idx === -1 ? 1 : idx + 2),
    teamColor: teamColor, custom: custom,
    pos: new THREE.Vector3(), vel: new THREE.Vector3(), face: dirOf(team) > 0 ? 0 : Math.PI,
    home: new THREE.Vector3(), isGK: idx === -1,
    stun: 0, tackleT: 0, tackleCd: 0, charge: 0, charging: false, stam: 1,
    kickCd: 0, anim: 0, input: { mx: 0, my: 0, shoot: 0, tackle: 0, pass: 0 },
    aiT: 0, aiTarget: new THREE.Vector3(), aiHold: 0, gkHold: 0
  };
  if (p.isGK) {
    p.home.set(ownX(team) + dirOf(team) * 1.4, 0, 0);
  } else {
    const f = formation(n)[idx];
    p.home.set(f[0] * F.W * dirOf(team), 0, f[1] * F.H);
  }
  p.pos.copy(p.home);
  p.mesh = buildPlayerMesh(p);
  if (human) { human.player = p; if (human.photo) applyPhoto(p, human.photo); }
  G.players.push(p);
  return p;
}

function clearMatch() {
  for (const p of G.players) if (p.mesh) scene.remove(p.mesh);
  G.players.length = 0;
  for (const h of G.humans.values()) h.player = null;
  clearPreviews();
}

function startMatch() {
  SFX.init();
  clearMatch();
  const set = G.settings;
  const humans = [...G.humans.values()].filter(h => h.online !== false);
  const n = clamp(Math.max(set.fmt, humans.length), 1, 5);
  set.fmt = n;
  G.aiCfg = CFG.AI[set.diff];
  G.score = [0, 0]; G.clock = set.dur; G.scorer = null;

  // équipe 0 : humains + IA
  const slots = formation(n);
  for (let i = 0; i < n; i++) {
    // le premier humain prend le poste le plus avancé
    const h = humans[i] ? humans[i] : null;
    createPlayer(0, n - 1 - i, n, h);
  }
  for (let i = 0; i < n; i++) createPlayer(1, i, n, null);
  if (set.gk) { createPlayer(0, -1, n, null); createPlayer(1, -1, n, null); }

  document.getElementById('lobby').classList.add('off');
  document.getElementById('hud').classList.add('on');
  document.getElementById('result').classList.remove('on');
  document.getElementById('dotA').style.background = set.colA;
  document.getElementById('dotB').style.background = set.colB;
  G.kickoffTeam = 0;
  kickoff(0, true);
  broadcast({ t: 'phase', p: 'play' });
}

function kickoff(team, first) {
  G.phase = 'KICKOFF'; G.timer = first ? 3.2 : 2.2;
  G.ball.p.set(0, BL.R, 0); G.ball.v.set(0, 0, 0); G.ball.owner = null; G.ball.lock = 0; G.ball.spin = 0;
  for (const p of G.players) {
    p.pos.copy(p.home); p.vel.set(0, 0, 0); p.stun = 0; p.charge = 0; p.charging = false;
    p.tackleT = 0; p.tackleCd = 0; p.stam = 1; p.kickCd = 0;
    // tout le monde dans son camp
    if (!p.isGK) {
      const d = dirOf(p.team);
      if (p.pos.x * d > -2) p.pos.x = -2.5 * d;
      if (p.team === team && p.idx === 0) { p.pos.set(-1.6 * d, 0, 0.4); }
    }
    p.face = dirOf(p.team) > 0 ? 0 : Math.PI;
    p.mesh.position.copy(p.pos);
  }
  SFX.whistle(false);
  banner(first ? 'COUP D\'ENVOI' : 'ENGAGEMENT', '', 1.4);
}

/* =====================================================================
   ACTIONS
   ===================================================================== */
const V0 = new THREE.Vector3(), V1 = new THREE.Vector3();
function faceVec(p, out) { return (out || new THREE.Vector3()).set(Math.sin(p.face), 0, Math.cos(p.face)); }
function d2(a, b) { const dx = a.x - b.x, dz = a.z - b.z; return dx * dx + dz * dz; }
function dist(a, b) { return Math.sqrt(d2(a, b)); }

function shootBall(p, power) {
  const b = G.ball;
  const dir = faceVec(p, V0);
  const speed = 14 + 25 * power;
  const vy = 1.0 + power * power * 12;
  b.owner = null; b.lock = 0.22; b.lastTouch = p;
  p.kickCd = 0.28; p.charge = 0; p.charging = false;
  b.p.set(p.pos.x + dir.x * 0.85, 0.42, p.pos.z + dir.z * 0.85);
  b.v.set(dir.x * speed, vy, dir.z * speed);
  // effet latéral selon le stick au moment du tir
  const lat = p.input.mx * dir.z - p.input.my * dir.x;
  b.spin = clamp(lat, -1, 1) * 3.2 * (0.4 + power);
  SFX.kick(power);
  buzz(p, 30 + power * 60);
}

function passBall(p) {
  const b = G.ball;
  const dir = faceVec(p, V0);
  let best = null, bestS = -1e9;
  for (const m of G.players) {
    if (m === p || m.team !== p.team || m.isGK) continue;
    const dx = m.pos.x - p.pos.x, dz = m.pos.z - p.pos.z;
    const d = Math.sqrt(dx * dx + dz * dz) || 1;
    if (d > 34) continue;
    const al = (dx / d) * dir.x + (dz / d) * dir.z;
    const fwd = (m.pos.x - p.pos.x) * dirOf(p.team);
    let s = al * 3 + fwd * 0.05 - d * 0.03;
    // pénalise si un adversaire est sur la ligne de passe
    for (const o of G.players) {
      if (o.team === p.team) continue;
      const t = clamp(((o.pos.x - p.pos.x) * dx + (o.pos.z - p.pos.z) * dz) / (d * d), 0, 1);
      const cx = p.pos.x + dx * t - o.pos.x, cz = p.pos.z + dz * t - o.pos.z;
      if (cx * cx + cz * cz < 2.2) s -= 2.4;
    }
    if (s > bestS) { bestS = s; best = m; }
  }
  if (!best || bestS < -1.5) { shootBall(p, 0.3); return; }
  const tx = best.pos.x + best.vel.x * 0.3, tz = best.pos.z + best.vel.z * 0.3;
  const dx = tx - p.pos.x, dz = tz - p.pos.z;
  const d = Math.sqrt(dx * dx + dz * dz) || 1;
  const sp = clamp(d * 1.9, 13, 27);
  b.owner = null; b.lock = 0.18; b.lastTouch = p; p.kickCd = 0.24; p.charge = 0; p.charging = false;
  b.p.set(p.pos.x + (dx / d) * 0.8, 0.4, p.pos.z + (dz / d) * 0.8);
  b.v.set((dx / d) * sp, 1.1, (dz / d) * sp);
  b.spin = 0;
  SFX.kick(0.25);
}

function startTackle(p) {
  if (p.tackleCd > 0 || p.stun > 0 || p.tackleT > 0) return;
  p.tackleT = 0.34; p.tackleCd = 1.25; p.charging = false; p.charge = 0;
  SFX.tackle();
}

function resolveTackle(p) {
  const b = G.ball;
  for (const o of G.players) {
    if (o.team === p.team || o.stun > 0) continue;
    if (dist(p.pos, o.pos) < 1.7) {
      if (b.owner === o) {
        b.owner = null; b.lock = 0.12; b.lastTouch = p;
        const d = faceVec(p, V0);
        b.p.set(o.pos.x + d.x * 0.7, 0.4, o.pos.z + d.z * 0.7);
        b.v.set(d.x * 6 + rnd(-2, 2), 2.2, d.z * 6 + rnd(-2, 2));
        o.stun = 0.85; o.kickCd = 1.0; o.vel.multiplyScalar(-0.4);
        buzz(o, 220); buzz(p, 60);
        SFX.tackle();
        return true;
      } else {
        o.vel.addScaledVector(faceVec(p, V0), 5);
      }
    }
  }
  return false;
}

/* =====================================================================
   IA
   ===================================================================== */
function aiTeamStats() {
  const b = G.ball;
  const st = [{ chaser: null, best: 1e9 }, { chaser: null, best: 1e9 }];
  for (const p of G.players) {
    if (p.isGK || p.stun > 0) continue;
    const d = d2(p.pos, b.p);
    if (d < st[p.team].best) { st[p.team].best = d; st[p.team].chaser = p; }
  }
  return st;
}

function nearestOpp(p) {
  let best = null, bd = 1e9;
  for (const o of G.players) {
    if (o.team === p.team || o.isGK) continue;
    const d = d2(p.pos, o.pos);
    if (d < bd) { bd = d; best = o; }
  }
  return { p: best, d: Math.sqrt(bd) };
}

function aiMoveTo(p, tx, tz, dt, boost) {
  const dx = tx - p.pos.x, dz = tz - p.pos.z;
  const d = Math.sqrt(dx * dx + dz * dz);
  if (d < 0.35) { p.input.mx = 0; p.input.my = 0; return; }
  const k = d < 1.6 ? d / 1.6 : 1;
  p.input.mx = (dx / d) * k * (boost || 1);
  p.input.my = (dz / d) * k * (boost || 1);
}

function aiUpdate(p, dt, st) {
  const b = G.ball, cfg = G.aiCfg;
  p.input.shoot = 0; p.input.pass = 0; p.input.tackle = 0;
  if (p.stun > 0 || p.tackleT > 0) { p.input.mx = 0; p.input.my = 0; return; }
  if (p.isGK) { gkUpdate(p, dt); return; }

  p.aiT -= dt;
  if (p.aiT <= 0) {
    p.aiT = cfg.react * rnd(0.7, 1.4);
    p.err = new THREE.Vector3(rnd(-cfg.err, cfg.err), 0, rnd(-cfg.err, cfg.err));
  }
  if (!p.err) p.err = new THREE.Vector3();
  const gx = goalX(p.team), d = dirOf(p.team);

  if (b.owner === p) {
    // --- porteur ---
    const dg = Math.sqrt((gx - p.pos.x) * (gx - p.pos.x) + p.pos.z * p.pos.z);
    const opp = nearestOpp(p);
    const canShoot = dg < 26 && Math.abs(p.pos.z) < 22;
    p.aiHold -= dt;
    if (canShoot && (opp.d < 3.6 || dg < 15) && p.aiHold <= 0 && Math.random() < cfg.shoot * dt * 3.2) {
      // vise le but avec un peu d'imprécision
      const tz = clamp(rnd(-F.GW / 2 + 1, F.GW / 2 - 1) + p.err.z * 0.25, -F.GW / 2 + 0.6, F.GW / 2 - 0.6);
      p.face = Math.atan2(gx - p.pos.x, tz - p.pos.z);
      shootBall(p, clamp(dg / 30, 0.35, 0.95));
      p.aiHold = 0.6;
      return;
    }
    if (opp.d < 3.0 && Math.random() < 0.9 * dt * 4) { passBall(p); p.aiHold = 0.5; return; }
    // dribble vers le but en évitant l'adversaire le plus proche
    let tx = gx - d * 6, tz = clamp(p.pos.z * 0.5, -F.H / 2 + 4, F.H / 2 - 4);
    if (opp.p && opp.d < 7) {
      const side = (p.pos.z - opp.p.pos.z) >= 0 ? 1 : -1;
      tz = clamp(p.pos.z + side * 6, -F.H / 2 + 3, F.H / 2 - 3);
    }
    aiMoveTo(p, tx, tz, dt);
    return;
  }

  if (b.owner && b.owner.team === p.team) {
    // --- soutien ---
    const adv = clamp(b.p.x + d * 12, -F.W / 2 + 6, F.W / 2 - 6);
    const tx = lerp(p.home.x, adv, 0.7);
    const tz = clamp(p.home.z * 0.85 + b.p.z * 0.15 + p.err.z * 0.3, -F.H / 2 + 3, F.H / 2 - 3);
    aiMoveTo(p, tx, tz, dt);
    return;
  }

  // --- défense / récupération ---
  const chaser = st[p.team].chaser;
  if (chaser === p) {
    const px = b.p.x + b.v.x * 0.22 + p.err.x * 0.35;
    const pz = b.p.z + b.v.z * 0.22 + p.err.z * 0.35;
    aiMoveTo(p, px, pz, dt);
    if (b.owner && b.owner.team !== p.team && dist(p.pos, b.owner.pos) < 2.4 && p.tackleCd <= 0 && Math.random() < 0.9 * dt * 3) {
      startTackle(p);
    }
  } else {
    const own = ownX(p.team);
    const tx = lerp(p.home.x, own + d * 12, clamp((own - b.p.x) * -d / 40 + 0.35, 0, 0.9));
    const tz = clamp(p.home.z * 0.7 + b.p.z * 0.3 + p.err.z * 0.4, -F.H / 2 + 3, F.H / 2 - 3);
    aiMoveTo(p, tx, tz, dt);
  }
}

function gkUpdate(p, dt) {
  const b = G.ball, d = dirOf(p.team), line = ownX(p.team) + d * 1.5;
  p.gkHold -= dt;
  if (b.owner === p) {
    p.input.mx = 0; p.input.my = 0;
    p.face = d > 0 ? 0 : Math.PI;
    if (p.gkHold <= 0) passBall(p);
    return;
  }
  const towardGoal = (b.v.x * -d) > 4;
  let tz = clamp(b.p.z * 0.6, -F.GW / 2 - 0.8, F.GW / 2 + 0.8);
  let tx = line;
  if (towardGoal) {
    const t = (line - b.p.x) / (b.v.x || 0.001);
    if (t > 0 && t < 2.2) tz = clamp(b.p.z + b.v.z * t, -F.GW / 2 - 1.4, F.GW / 2 + 1.4);
  }
  const inBox = Math.abs(b.p.x - ownX(p.team)) < F.BOXX && Math.abs(b.p.z) < F.BOXZ / 2;
  if (inBox && !b.owner && dist(p.pos, b.p) < 9) { tx = b.p.x; tz = b.p.z; }
  else if (inBox && b.owner && b.owner.team !== p.team && dist(p.pos, b.owner.pos) < 6) { tx = lerp(line, b.p.x, 0.45); tz = b.p.z * 0.8; }
  aiMoveTo(p, tx, tz, dt, towardGoal ? 1.35 : 1);
  // capture
  if (!b.owner && b.lock <= 0 && dist(p.pos, b.p) < 1.5 && b.p.y < 2.4) {
    b.owner = p; b.lastTouch = p; p.gkHold = 1.1;
    SFX.save();
    banner('ARRÊT !', '', 0.9);
  }
}

/* =====================================================================
   SIMULATION
   ===================================================================== */
function updatePlayer(p, dt) {
  p.kickCd = Math.max(0, p.kickCd - dt);
  p.tackleCd = Math.max(0, p.tackleCd - dt);

  if (p.stun > 0) {
    p.stun -= dt;
    p.input.tackle = 0; p.input.pass = 0;
    p.charging = false; p.charge = 0;
    p.vel.multiplyScalar(1 - 6 * dt);
  } else if (p.tackleT > 0) {
    p.tackleT -= dt;
    const d = faceVec(p, V0);
    p.vel.set(d.x * 15, 0, d.z * 15);
    if (resolveTackle(p)) p.tackleT = Math.min(p.tackleT, 0.1);
    if (p.tackleT <= 0) p.stun = 0.4;
  } else {
    const inp = p.input;
    let mx = inp.mx, my = inp.my;
    const mag = Math.sqrt(mx * mx + my * my);
    if (mag > 1) { mx /= mag; my /= mag; }
    const carrying = G.ball.owner === p;
    const sprint = (!carrying && inp.shoot && p.stam > 0.05 && mag > 0.2);
    if (sprint) p.stam = Math.max(0, p.stam - dt / P.STAM);
    else p.stam = Math.min(1, p.stam + dt / (P.STAM * 1.8));

    let spd = P.MAX * (p.isHuman ? 1 : G.aiCfg.spd);
    if (sprint) spd *= P.SPRINT;
    if (carrying) spd *= 0.94;
    if (p.charging) spd *= 0.5;
    if (p.isGK) spd *= 1.02;
    if (G.phase !== 'PLAY') spd *= 0.25;

    const tvx = mx * spd, tvz = my * spd;
    p.vel.x += clamp(tvx - p.vel.x, -P.ACC * dt, P.ACC * dt);
    p.vel.z += clamp(tvz - p.vel.z, -P.ACC * dt, P.ACC * dt);
    if (mag < 0.08) { p.vel.x -= p.vel.x * Math.min(1, P.FRIC * dt); p.vel.z -= p.vel.z * Math.min(1, P.FRIC * dt); }

    // orientation
    if (mag > 0.15) {
      const want = Math.atan2(mx, my);
      let dd = want - p.face;
      while (dd > Math.PI) dd -= TAU; while (dd < -Math.PI) dd += TAU;
      p.face += dd * Math.min(1, dt * (p.charging ? 9 : 14));
    } else if (carrying && !p.charging) {
      const want = Math.atan2(goalX(p.team) - p.pos.x, -p.pos.z + (p.pos.z * 0.0));
      let dd = want - p.face; while (dd > Math.PI) dd -= TAU; while (dd < -Math.PI) dd += TAU;
      p.face += dd * Math.min(1, dt * 2);
    }

    // charge de tir
    if (carrying && G.phase === 'PLAY') {
      if (inp.shoot) { p.charging = true; p.charge = Math.min(1, p.charge + dt / 0.95); }
      else if (p.charging) { shootBall(p, Math.max(0.18, p.charge)); }
      if (inp.pass && p.kickCd <= 0) { passBall(p); inp.pass = 0; }
    } else { p.charging = false; p.charge = 0; p.input.pass = 0; }

    if (inp.tackle && !carrying) { startTackle(p); inp.tackle = 0; }
    if (inp.tackle && carrying) inp.tackle = 0;
  }

  p.pos.x += p.vel.x * dt; p.pos.z += p.vel.z * dt;
  const lim = 1.2;
  p.pos.x = clamp(p.pos.x, -F.W / 2 - lim, F.W / 2 + lim);
  p.pos.z = clamp(p.pos.z, -F.H / 2 - lim, F.H / 2 + lim);
  if (p.isGK) {
    const d = dirOf(p.team);
    p.pos.x = d > 0 ? clamp(p.pos.x, -F.W / 2 - 0.6, -F.W / 2 + F.BOXX) : clamp(p.pos.x, F.W / 2 - F.BOXX, F.W / 2 + 0.6);
    p.pos.z = clamp(p.pos.z, -F.BOXZ / 2, F.BOXZ / 2);
  }
}

function separate(dt) {
  const n = G.players.length;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const a = G.players[i], b = G.players[j];
    const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z;
    const d = Math.sqrt(dx * dx + dz * dz);
    const min = P.R * 2;
    if (d < min && d > 0.0001) {
      const push = (min - d) * 0.5;
      const ux = dx / d, uz = dz / d;
      a.pos.x -= ux * push; a.pos.z -= uz * push;
      b.pos.x += ux * push; b.pos.z += uz * push;
      const rel = (b.vel.x - a.vel.x) * ux + (b.vel.z - a.vel.z) * uz;
      if (rel < 0) {
        a.vel.x += ux * rel * 0.4; a.vel.z += uz * rel * 0.4;
        b.vel.x -= ux * rel * 0.4; b.vel.z -= uz * rel * 0.4;
      }
    }
  }
}

function updateBall(dt) {
  const b = G.ball;
  b.lock = Math.max(0, b.lock - dt);

  if (b.owner) {
    const o = b.owner;
    if (o.stun > 0 || o.tackleT > 0) { b.owner = null; b.lock = 0.15; b.v.set(o.vel.x * 0.5, 1.4, o.vel.z * 0.5); }
    else {
      const d = faceVec(o, V0);
      const bob = Math.sin(now() * 14) * 0.06 * Math.min(1, o.vel.length() / 6);
      b.p.set(o.pos.x + d.x * P.DRIB, BL.R + Math.abs(bob), o.pos.z + d.z * P.DRIB);
      b.v.copy(o.vel); b.spin = 0;
      return;
    }
  }

  // intégration
  b.v.y += BL.G * dt;
  if (b.p.y > BL.R + 0.02) {
    const sp = Math.sqrt(b.v.x * b.v.x + b.v.z * b.v.z);
    if (sp > 0.1 && b.spin) {
      const ax = -b.v.z / sp, az = b.v.x / sp;
      b.v.x += ax * b.spin * dt * 3.2;
      b.v.z += az * b.spin * dt * 3.2;
    }
    b.v.multiplyScalar(1 - BL.DRAG * dt * 60 * 0.016);
  }
  b.p.addScaledVector(b.v, dt);

  if (b.p.y < BL.R) {
    b.p.y = BL.R;
    if (b.v.y < -0.5) { b.v.y = -b.v.y * BL.BOUNCE; SFX.touch(); }
    else b.v.y = 0;
    b.v.x *= BL.ROLL; b.v.z *= BL.ROLL;
    b.spin *= 0.92;
    if (Math.abs(b.v.x) < 0.05) b.v.x = 0;
    if (Math.abs(b.v.z) < 0.05) b.v.z = 0;
  }

  // touchées / bandes
  const hz = F.H / 2 - BL.R;
  if (Math.abs(b.p.z) > hz) { b.p.z = Math.sign(b.p.z) * hz; b.v.z *= -0.72; b.spin *= -0.5; SFX.touch(); }

  const hx = F.W / 2 - BL.R;
  if (Math.abs(b.p.x) > hx) {
    const inGoal = Math.abs(b.p.z) < F.GW / 2 - 0.1 && b.p.y < F.GH - 0.15;
    if (inGoal) {
      if (Math.abs(b.p.x) > F.W / 2 + 0.4) {
        if (G.phase === 'PLAY') { onGoal(b.p.x > 0 ? 0 : 1); return; }
      }
      if (Math.abs(b.p.x) > F.W / 2 + F.GD - BL.R) { b.p.x = Math.sign(b.p.x) * (F.W / 2 + F.GD - BL.R); b.v.x *= -0.25; }
    } else {
      // montant / barre
      const nearPost = Math.abs(Math.abs(b.p.z) - F.GW / 2) < 0.35 && b.p.y < F.GH;
      if (nearPost) SFX.post();
      b.p.x = Math.sign(b.p.x) * hx; b.v.x *= -0.72; b.spin *= -0.5;
      if (!nearPost) SFX.touch();
    }
  }
  if (b.p.y > F.GH - 0.1 && Math.abs(b.p.x) > hx - 0.2 && Math.abs(b.p.z) < F.GW / 2) {
    // barre transversale
    if (b.v.y > 0 && b.p.y < F.GH + 0.3) { b.v.y *= -0.5; b.v.x *= -0.4; SFX.post(); }
  }

  // récupération
  if (b.lock <= 0 && b.p.y < 1.8) {
    let best = null, bd = P.CTRL * P.CTRL;
    for (const p of G.players) {
      if (p.stun > 0 || p.kickCd > 0 || p.tackleT > 0) continue;
      const d = d2(p.pos, b.p);
      if (d < bd) { bd = d; best = p; }
    }
    if (best) {
      if (best.isGK) {
        b.owner = best; best.gkHold = 1.0; b.lastTouch = best; SFX.save();
      } else {
        b.owner = best; b.lastTouch = best;
        best.charge = 0; best.charging = false;
        SFX.touch(); buzz(best, 25);
      }
    }
  }
}

function onGoal(team) {
  G.phase = 'GOAL'; G.timer = 3.4;
  G.score[team]++;
  const sc = G.ball.lastTouch;
  G.scorer = sc;
  G.kickoffTeam = 1 - team;
  SFX.whistle(false); SFX.cheer(team === 0 ? 0.5 : 0.22);
  if (crowdMesh) crowdMesh.hype = team === 0 ? 3.4 : 1.6;
  const who = sc ? sc.name : '';
  banner('BUT !', who ? (who.toUpperCase() + (sc && sc.team !== team ? ' (CSC)' : '')) : '', 3.2);
  for (const h of G.humans.values()) if (h.player) send(h.id, { t: 'goal', me: h.player === sc, team: team });
  updateHUD();
}

/* ---------- aperçu de trajectoire ---------- */
const previews = new Map();
function getPreview(p) {
  let pv = previews.get(p.id);
  if (!pv) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(34 * 3), 3));
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: p.custom.accent || '#ffffff', transparent: true, opacity: 0.9, depthTest: false }));
    line.renderOrder = 12;
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.75, 20),
      new THREE.MeshBasicMaterial({ color: p.custom.accent || '#ffffff', transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthTest: false }));
    ring.rotation.x = -Math.PI / 2; ring.renderOrder = 12;
    scene.add(line); scene.add(ring);
    pv = { line: line, ring: ring, geo: geo };
    previews.set(p.id, pv);
  }
  return pv;
}
function clearPreviews() {
  for (const pv of previews.values()) { scene.remove(pv.line); scene.remove(pv.ring); }
  previews.clear();
}
function updatePreview(p) {
  const pv = getPreview(p);
  const arr = pv.geo.attributes.position.array;
  const dir = faceVec(p, V0);
  const power = Math.max(0.18, p.charge);
  const speed = 14 + 25 * power, vy = 1.0 + power * power * 12;
  let x = p.pos.x + dir.x * 0.85, y = 0.42, z = p.pos.z + dir.z * 0.85;
  let vx = dir.x * speed, vvy = vy, vz = dir.z * speed;
  const st = 0.05;
  let lx = x, lz = z;
  for (let i = 0; i < 34; i++) {
    arr[i * 3] = x; arr[i * 3 + 1] = y + 0.05; arr[i * 3 + 2] = z;
    lx = x; lz = z;
    vvy += BL.G * st;
    x += vx * st; y += vvy * st; z += vz * st;
    if (y < BL.R) { y = BL.R; vvy = -vvy * BL.BOUNCE; }
  }
  pv.geo.attributes.position.needsUpdate = true;
  pv.geo.computeBoundingSphere();
  pv.line.visible = true;
  pv.ring.visible = true;
  pv.ring.position.set(lx, 0.05, lz);
  const s = 0.6 + power * 0.9;
  pv.ring.scale.set(s, s, s);
  pv.line.material.opacity = 0.35 + power * 0.6;
}
function hidePreview(p) {
  const pv = previews.get(p.id);
  if (pv) { pv.line.visible = false; pv.ring.visible = false; }
}

/* =====================================================================
   RENDU / ANIMATION
   ===================================================================== */
function animateMesh(p, dt) {
  const md = p.mesh.userData;
  const sp = Math.sqrt(p.vel.x * p.vel.x + p.vel.z * p.vel.z);
  p.anim += dt * (1.2 + sp * 1.15);
  const amp = clamp(sp / 8, 0, 1);
  const sw = Math.sin(p.anim * 3.4) * amp * 1.0;
  md.legs[0].rotation.x = sw; md.legs[1].rotation.x = -sw;
  md.arms[0].rotation.x = -sw * 0.75; md.arms[1].rotation.x = sw * 0.75;
  md.arms[0].rotation.z = 0.12; md.arms[1].rotation.z = -0.12;
  md.torso.position.y = 1.72 + Math.abs(Math.sin(p.anim * 3.4)) * 0.05 * amp;
  md.head.position.y = 2.46 + Math.abs(Math.sin(p.anim * 3.4)) * 0.05 * amp;

  p.mesh.position.set(p.pos.x, 0, p.pos.z);
  p.mesh.rotation.y = p.face;
  let tilt = -amp * 0.12;
  if (p.tackleT > 0) tilt = -1.15;
  else if (p.stun > 0) tilt = -1.35;
  else if (p.charging) tilt = 0.1;
  p.mesh.rotation.x = lerp(p.mesh.rotation.x, tilt, Math.min(1, dt * 16));

  if (md.ring) {
    const carrying = G.ball.owner === p;
    md.ring.material.opacity = p.isHuman ? (carrying ? 1 : 0.7) : (carrying ? 0.6 : 0.2);
    const s = carrying ? 1.18 : 1;
    md.ring.scale.set(s, s, s);
    if (p.isHuman) md.ring.material.color.set(p.stam < 0.25 ? '#ff5a5a' : (p.custom.accent || '#ffffff'));
  }
  if (md.label) md.label.material.opacity = 1;
}

function updateCamera(dt) {
  const b = G.ball;
  let tx = clamp(b.p.x * 0.7, -20, 20);
  let tz = clamp(b.p.z * 0.3, -7, 7);
  let h = 30, back = F.H / 2 + 33;

  if (G.phase === 'GOAL' && G.scorer) {
    tx = clamp(G.scorer.pos.x * 0.8, -24, 24);
    tz = clamp(G.scorer.pos.z * 0.5, -10, 10);
    h = 15; back = F.H / 2 + 15;
  } else if (G.phase === 'LOBBY') {
    const a = now() * 0.12;
    tx = Math.sin(a) * 18; tz = Math.cos(a) * 6;
    h = 26; back = F.H / 2 + 30;
  }
  const target = V0.set(tx, h, tz + back);
  const k = 1 - Math.pow(0.0009, dt);
  camState.pos.lerp(target, k);
  camState.look.lerp(V1.set(tx, 1.2, tz), k);
  camera.position.copy(camState.pos);
  camera.lookAt(camState.look);
  sun.target.position.set(b.p.x, 0, b.p.z);
  sun.position.set(b.p.x - 40, 60, b.p.z + 30);
}

function updateCrowd(dt) {
  if (!crowdMesh) return;
  crowdMesh.hype = Math.max(0, crowdMesh.hype - dt);
  const t = now(), im = crowdMesh.mesh, du = crowdMesh.dummy;
  const hype = crowdMesh.hype > 0 ? 1 : 0.12;
  for (let i = 0; i < crowdMesh.seeds.length; i++) {
    const s = crowdMesh.seeds[i];
    const b = Math.abs(Math.sin(t * (hype > 0.5 ? 6 : 1.2) + s.p)) * (hype > 0.5 ? 0.5 : 0.06);
    du.position.set(s.x, s.y + b, s.z);
    du.updateMatrix();
    im.setMatrixAt(i, du.matrix);
  }
  im.instanceMatrix.needsUpdate = true;
}

/* =====================================================================
   HUD
   ===================================================================== */
let bannerT = 0;
function banner(big, sub, dur) {
  const el = document.getElementById('banner');
  document.getElementById('bigText').textContent = big;
  document.getElementById('subText').textContent = sub || '';
  el.classList.add('on');
  document.getElementById('bigText').style.animation = 'none';
  void document.getElementById('bigText').offsetWidth;
  document.getElementById('bigText').style.animation = '';
  bannerT = dur || 1.5;
}
function updateHUD() {
  document.getElementById('score').textContent = G.score[0] + ' - ' + G.score[1];
  const m = Math.max(0, G.clock);
  document.getElementById('clock').textContent = Math.floor(m / 60) + ':' + ('0' + Math.floor(m % 60)).slice(-2);
}

function endMatch() {
  G.phase = 'END';
  SFX.whistle(true);
  const a = G.score[0], b = G.score[1];
  document.getElementById('resTitle').textContent = a > b ? 'VICTOIRE !' : (a < b ? 'DÉFAITE' : 'MATCH NUL');
  document.getElementById('resScore').textContent = a + ' - ' + b;
  document.getElementById('result').classList.add('on');
  if (a > b) { SFX.cheer(0.55); if (crowdMesh) crowdMesh.hype = 5; }
  broadcast({ t: 'phase', p: 'end', a: a, b: b });
}

/* =====================================================================
   BOUCLE
   ===================================================================== */
let lastT = 0;
function frame() {
  requestAnimationFrame(frame);
  const t = now();
  let dt = lastT ? t - lastT : 0.016;
  lastT = t;
  dt = Math.min(dt, 0.05);
  step(dt);
  renderer.render(scene, camera);
}

function step(dt) {
  if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) document.getElementById('banner').classList.remove('on'); }

  if (G.phase === 'KICKOFF') {
    G.timer -= dt;
    if (G.timer <= 0) { G.phase = 'PLAY'; }
  } else if (G.phase === 'PLAY') {
    G.clock -= dt;
    if (G.clock <= 0) { G.clock = 0; endMatch(); }
  } else if (G.phase === 'GOAL') {
    G.timer -= dt;
    if (G.timer <= 0) kickoff(G.kickoffTeam, false);
  }

  if (G.players.length) {
    const st = aiTeamStats();
    for (const p of G.players) {
      if (!p.isHuman) aiUpdate(p, dt, st);
      updatePlayer(p, dt);
    }
    separate(dt);
    if (G.phase === 'PLAY' || G.phase === 'GOAL') updateBall(dt);
    else { G.ball.lock = 0.2; if (G.ball.owner) G.ball.owner = null; }

    for (const p of G.players) {
      animateMesh(p, dt);
      if (p.isHuman && p.charging && G.ball.owner === p) updatePreview(p); else hidePreview(p);
    }
  }

  ballMesh.position.copy(G.ball.p);
  ballMesh.rotation.x += G.ball.v.z * dt * 1.6;
  ballMesh.rotation.z -= G.ball.v.x * dt * 1.6;
  ballShadow.position.set(G.ball.p.x, 0.03, G.ball.p.z);
  const sc = clamp(1.5 - G.ball.p.y * 0.12, 0.5, 1.5);
  ballShadow.scale.set(sc, sc, 1);
  ballShadow.material.opacity = clamp(1 - G.ball.p.y * 0.08, 0.15, 1);

  updateCamera(dt);
  updateCrowd(dt);
  if (G.phase === 'PLAY' || G.phase === 'KICKOFF') updateHUD();
}

/* =====================================================================
   RESEAU / MANETTES
   ===================================================================== */
function send(id, o) { if (G.net) G.net.send(id, o); }
function broadcast(o) { if (G.net) G.net.send('*', o); }
function buzz(p, ms) { if (p && p.isHuman && p.ctrl && p.ctrl !== 'KB') send(p.ctrl, { t: 'buzz', ms: ms }); }

const DEF_CUSTOM = () => ({
  skin: '#e0b48a', hair: '#2b1d16', accent: '#ffffff',
  shorts: '#ffffff', shoes: '#111111', pattern: 'plain'
});

function onNet(m) {
  if (m.t === 'ctrl_join') {
    const h = G.humans.get(m.id);
    if (h) { h.online = true; if (h.player) h.player.isHuman = true; }
    renderLobby();
  } else if (m.t === 'ctrl_leave') {
    const h = G.humans.get(m.id);
    if (h) { h.online = false; if (h.player) { h.player.isHuman = false; h.player.charging = false; } }
    renderLobby();
  } else if (m.t === 'from') {
    handleCtrl(m.id, m.d);
  }
}

function handleCtrl(id, d) {
  if (!d || !d.t) return;
  if (d.t === 'join') {
    let h = G.humans.get(id);
    if (!h) { h = { id: id, custom: DEF_CUSTOM(), photo: null, player: null, online: true, num: 9, name: 'JOUEUR' }; G.humans.set(id, h); }
    h.online = true;
    if (d.name) h.name = String(d.name).slice(0, 12);
    if (d.num != null) h.num = clamp(parseInt(d.num) || 9, 1, 99);
    if (d.custom) for (const k in d.custom) h.custom[k] = d.custom[k];
    if (h.player) refreshPlayer(h);
    else if (G.phase !== 'LOBBY') assignSlot(h);
    send(id, { t: 'ok', color: G.settings.colA, phase: G.phase === 'LOBBY' ? 'lobby' : 'play', name: h.name });
    renderLobby();
  } else if (d.t === 'photo') {
    const h = G.humans.get(id);
    if (!h) return;
    h.photo = d.d;
    if (h.player) applyPhoto(h.player, d.d);
    renderLobby();
  } else if (d.t === 'in') {
    const h = G.humans.get(id);
    if (!h || !h.player) return;
    const p = h.player;
    p.input.mx = clamp(d.x || 0, -1, 1);
    p.input.my = clamp(d.y || 0, -1, 1);
    p.input.shoot = d.s ? 1 : 0;
    if (d.k) p.input.tackle = 1;
    if (d.p) p.input.pass = 1;
  } else if (d.t === 'start') {
    if (G.phase === 'LOBBY' || G.phase === 'END') startMatch();
  }
}

function refreshPlayer(h) {
  const p = h.player;
  p.name = h.name; p.num = h.num; p.custom = h.custom; p.isHuman = true; p.ctrl = h.id;
  scene.remove(p.mesh);
  p.mesh = buildPlayerMesh(p);
  if (h.photo) applyPhoto(p, h.photo);
}
function assignSlot(h) {
  for (const p of G.players) {
    if (p.team === 0 && !p.isGK && !p.isHuman) {
      h.player = p; refreshPlayer(h); return true;
    }
  }
  return false;
}

/* =====================================================================
   LOBBY / UI
   ===================================================================== */
function renderLobby() {
  const list = document.getElementById('playerList');
  const hs = [...G.humans.values()];
  if (!hs.length) { list.innerHTML = '<div class="empty">En attente de joueurs…</div>'; }
  else {
    list.innerHTML = '';
    for (const h of hs) {
      const row = document.createElement('div'); row.className = 'pl';
      const av = document.createElement('div'); av.className = 'av';
      if (h.photo) { av.style.backgroundImage = 'url(' + h.photo + ')'; }
      else av.style.background = h.custom.accent || '#555';
      const nm = document.createElement('span'); nm.textContent = h.name + (h.online ? '' : ' (hors ligne)');
      nm.style.opacity = h.online ? 1 : 0.4;
      const nu = document.createElement('span'); nu.className = 'num'; nu.textContent = '#' + h.num;
      row.appendChild(av); row.appendChild(nm); row.appendChild(nu);
      list.appendChild(row);
    }
  }
  const n = hs.filter(h => h.online).length;
  document.getElementById('startBtn').disabled = n === 0;
  if (n > G.settings.fmt) { G.settings.fmt = clamp(n, 1, 5); buildOptions(); }
}

function optRow(id, items, get, set) {
  const row = document.getElementById(id);
  row.innerHTML = '';
  for (const it of items) {
    const b = document.createElement('div');
    b.className = 'opt' + (get() === it.v ? ' sel' : '');
    b.innerHTML = it.l;
    b.onclick = () => { set(it.v); buildOptions(); };
    row.appendChild(b);
  }
}
function buildOptions() {
  const s = G.settings;
  optRow('fmtRow', [1, 2, 3, 4, 5].map(v => ({ v: v, l: v + ' vs ' + v })), () => s.fmt, v => s.fmt = v);
  optRow('durRow', [120, 240, 360, 600].map(v => ({ v: v, l: (v / 60) + ' min' })), () => s.dur, v => s.dur = v);
  optRow('diffRow', [{ v: 'easy', l: 'Facile' }, { v: 'normal', l: 'Normal' }, { v: 'hard', l: 'Difficile' }], () => s.diff, v => s.diff = v);
  optRow('gkRow', [{ v: true, l: 'Avec' }, { v: false, l: 'Sans' }], () => s.gk, v => s.gk = v);
  const row = document.getElementById('colRow');
  row.innerHTML = '';
  PALETTE.forEach(pair => {
    const b = document.createElement('div');
    b.className = 'opt' + (s.colA === pair[0] ? ' sel' : '');
    b.innerHTML = '<span style="display:inline-block;width:14px;height:14px;border-radius:4px;background:' + pair[0] + ';vertical-align:-2px"></span> ' +
      '<span style="display:inline-block;width:14px;height:14px;border-radius:4px;background:' + pair[1] + ';vertical-align:-2px"></span>';
    b.onclick = () => { s.colA = pair[0]; s.colB = pair[1]; buildOptions(); };
    row.appendChild(b);
  });
}

/* ---------- joueur clavier (test solo) ---------- */
const KEYS = {};
function keyboardPlayer() {
  let h = G.humans.get('KB');
  if (h) { G.humans.delete('KB'); if (h.player) { h.player.isHuman = false; h.player.ctrl = null; } renderLobby(); return; }
  h = { id: 'KB', name: 'CLAVIER', num: 10, custom: DEF_CUSTOM(), photo: null, player: null, online: true };
  h.custom.accent = '#ffe066';
  G.humans.set('KB', h);
  if (G.phase !== 'LOBBY') assignSlot(h);
  renderLobby();
}
function pollKeyboard() {
  const h = G.humans.get('KB');
  if (!h || !h.player) return;
  const i = h.player.input;
  let x = 0, y = 0;
  if (KEYS['KeyA'] || KEYS['KeyQ'] || KEYS['ArrowLeft']) x -= 1;
  if (KEYS['KeyD'] || KEYS['ArrowRight']) x += 1;
  if (KEYS['KeyW'] || KEYS['KeyZ'] || KEYS['ArrowUp']) y -= 1;
  if (KEYS['KeyS'] || KEYS['ArrowDown']) y += 1;
  i.mx = x; i.my = y;
  i.shoot = KEYS['Space'] ? 1 : 0;
  if (KEYS['KeyE']) { i.pass = 1; KEYS['KeyE'] = false; }
  if (KEYS['ShiftLeft'] || KEYS['ShiftRight']) { i.tackle = 1; KEYS['ShiftLeft'] = false; KEYS['ShiftRight'] = false; }
}

/* =====================================================================
   BOOT
   ===================================================================== */
function roomCode() {
  let c = localStorage.getItem('pf_room');
  if (!c || c.length !== 4) {
    const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    c = ''; for (let i = 0; i < 4; i++) c += A[(Math.random() * A.length) | 0];
    localStorage.setItem('pf_room', c);
  }
  return c;
}

function boot() {
  G.room = roomCode();
  document.getElementById('roomCode').textContent = G.room;
  const base = location.origin + location.pathname.replace(/index\.html?$/, '');
  document.getElementById('joinUrl').textContent = base + 'controller.html#' + G.room;

  initScene();
  buildOptions();
  renderLobby();
  updateHUD();

  G.net = new Net(G.room, onNet);

  document.getElementById('startBtn').onclick = () => { SFX.init(); startMatch(); };
  document.getElementById('againBtn').onclick = () => {
    document.getElementById('result').classList.remove('on');
    document.getElementById('hud').classList.remove('on');
    document.getElementById('lobby').classList.remove('off');
    clearMatch();
    G.phase = 'LOBBY';
    broadcast({ t: 'phase', p: 'lobby' });
    renderLobby();
  };

  addEventListener('keydown', e => {
    KEYS[e.code] = true;
    if (e.code === 'KeyK') keyboardPlayer();
    if (e.code === 'Space') e.preventDefault();
  });
  addEventListener('keyup', e => { KEYS[e.code] = false; });
  addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
  addEventListener('pointerdown', () => SFX.init(), { once: true });

  setInterval(pollKeyboard, 16);
  setInterval(() => {
    const el = document.getElementById('dbg');
    if (el && renderer) el.textContent = renderer.info.render.calls + ' draw · ' + G.players.length + ' joueurs';
  }, 800);

  lastT = now();
  frame();
}
boot();
