/* Tensiomètre : chargement (compression Draco), textes réécrits en français, valeurs du cas, animation de la mesure.
   Calques du modèle : Object_25 = les 3 lignes de chiffres, Object_27 = libellés et unités, Object_31 = texte du bouton bleu.
   Object_13/14/16 = brassard, Object_21 = câble ; tout le reste = boîtier. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

const CUFF = ['Object_13', 'Object_14', 'Object_16'], CABLE = 'Object_21';
const CUFF_AXIS = new THREE.Vector3(-0.028, 0.853, -0.521).normalize(), CUFF_C = new THREE.Vector3(0.718, 0.239, 0.322), CUFF_R = 0.183;   // repère du fichier (mesuré)
const CUFF_PORT = new THREE.Vector3(0.698, 0.029, 0.181), BOX_PORT = new THREE.Vector3(-0.302, 0.072, -0.217);
const SCREEN_N = new THREE.Vector3(-0.385, 0.182, 0.905).normalize(), SCREEN_UP = new THREE.Vector3(-0.56, 0.733, -0.385).normalize(), SCREEN_C = new THREE.Vector3(0.002, 0.119, 0.039);

/* ---------- afficheur à 7 segments ---------- */
const SEG = { 0: 'abcdef', 1: 'bc', 2: 'abdeg', 3: 'abcdg', 4: 'bcfg', 5: 'acdfg', 6: 'acdefg', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg', '-': 'g', ' ': '' };
function digit(g, ch, x, y, w, h, t) {
  const s = SEG[ch] ?? '', m = h / 2, k = t * 0.5, sl = w * 0.12;          // légère inclinaison, comme un vrai écran LCD
  const X = (px, py) => x + px + sl * (1 - py / h);
  const hz = (py) => [[k, py], [t, py - k], [w - t, py - k], [w - k, py], [w - t, py + k], [t, py + k]];
  const vt = (px, y0, y1) => [[px, y0 + k], [px + k, y0 + t], [px + k, y1 - t], [px, y1 - k], [px - k, y1 - t], [px - k, y0 + t]];
  const P = { a: hz(k), g: hz(m), d: hz(h - k), f: vt(k, 0, m), b: vt(w - k, 0, m), e: vt(k, m, h), c: vt(w - k, m, h) };
  for (const c of s) { g.beginPath(); P[c].forEach(([px, py], i) => (i ? g.lineTo(X(px, py), y + py) : g.moveTo(X(px, py), y + py))); g.closePath(); g.fill(); }
}
function number(g, str, right, y, w, h, gap) {          // aligné à droite, 3 cases
  const s = String(str).padStart(3, ' ').slice(-3), t = w * 0.2;
  for (let i = 0; i < 3; i++) digit(g, s[i], right - (3 - i) * (w + gap) + gap, y, w, h, t);
}

/* textures redessinées (2048 × 2048, même découpage UV que l'original) */
function lcdCanvas() { const c = document.createElement('canvas'); c.width = c.height = 1024; return c; }   // moitié de la résolution d'origine
function drawLCD(c, v) {
  const g = c.getContext('2d'), S = 0.5; g.clearRect(0, 0, c.width, c.height); g.save(); g.scale(S, S); g.fillStyle = '#16181c';
  if (v.sys !== '' && v.sys != null) number(g, v.sys, 1180, 350, 270, 480, 40);
  if (v.dia !== '' && v.dia != null) number(g, v.dia, 1180, 960, 270, 480, 40);
  if (v.pul !== '' && v.pul != null) number(g, v.pul, 1190, 1600, 165, 300, 30);
  if (v.heart) { g.font = 'bold 150px system-ui,sans-serif'; g.fillText('♥', 160, 1880); }
  if (v.err) { g.font = 'bold 200px system-ui,sans-serif'; g.fillText('Err', 300, 700); }
  g.restore();
}
function drawLabels(c, img) {
  const g = c.getContext('2d'); g.drawImage(img, 0, 0, c.width, c.height); const S = c.width / 2048; g.save(); g.scale(S, S);
  g.fillStyle = '#ffffff'; g.fillRect(215, 720, 520, 1020);
  g.fillStyle = '#2b2f33'; g.textAlign = 'right';
  const row = (lab, unit, y) => { g.font = '600 74px system-ui,"Segoe UI",sans-serif'; g.fillText(lab, 690, y); g.font = '58px system-ui,"Segoe UI",sans-serif'; g.fillText(unit, 690, y + 82); };
  row('Systolique', 'mmHg', 840); row('Diastolique', 'mmHg', 1235); row('Pouls', 'bat/min', 1580);
  g.restore();
}
function drawButton(c) {
  const g = c.getContext('2d'), S = c.width / 2048; g.clearRect(0, 0, c.width, c.height); g.save(); g.scale(S, S);
  g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '700 190px system-ui,"Segoe UI",sans-serif'; g.fillText('MESURE', 1016, 1300);
  g.fillRect(352, 1535, 1344, 26);
  g.font = '700 190px system-ui,"Segoe UI",sans-serif'; g.fillText('ARRÊT', 1016, 1810);
  g.restore();
}
const tex = (c) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.flipY = false; t.anisotropy = 4; return t; };

export async function loadTensio(url, dracoPath) {
  const loader = new GLTFLoader().setDRACOLoader(new DRACOLoader().setDecoderPath(dracoPath || 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/draco/'));
  const gltf = await loader.loadAsync(url), src = gltf.scene, byName = {};
  src.traverse((o) => { if (o.isMesh) byName[o.name] = o; });
  // textes
  const lcd = lcdCanvas(), lab = document.createElement('canvas'), btn = document.createElement('canvas'); lab.width = lab.height = btn.width = btn.height = 1024;
  const m25 = byName.Object_25.material, m27 = byName.Object_27.material, m31 = byName.Object_31.material;
  drawLCD(lcd, { sys: '', dia: '', pul: '' }); m25.map = tex(lcd); m25.transparent = true; m25.needsUpdate = true;
  drawLabels(lab, m27.map.image); m27.map = tex(lab); m27.needsUpdate = true;
  drawButton(btn); m31.map = tex(btn); m31.transparent = true; m31.needsUpdate = true;
  // boîtier (sans brassard ni câble) et brassard séparés
  const box = new THREE.Group(), cuffSrc = new THREE.Group();
  for (const n of Object.keys(byName)) { const o = byName[n]; if (n === CABLE) continue; (CUFF.includes(n) ? cuffSrc : box).add(o.clone()); }
  // brassard recentré : axe du cylindre = +Y, prise du tuyau vers -Z
  const cuff = new THREE.Group(), inner = new THREE.Group(); inner.add(cuffSrc); cuffSrc.position.copy(CUFF_C).negate();
  const portDir = CUFF_PORT.clone().sub(CUFF_C); portDir.sub(CUFF_AXIS.clone().multiplyScalar(portDir.dot(CUFF_AXIS))).normalize();
  const basis = new THREE.Matrix4().makeBasis(portDir.clone().cross(CUFF_AXIS), CUFF_AXIS, portDir.clone().negate());   // colonnes : x, y = axe, z = -prise
  inner.quaternion.setFromRotationMatrix(basis).invert(); cuff.add(inner);
  const portLocal = CUFF_PORT.clone().sub(CUFF_C).applyQuaternion(inner.quaternion);
  // boîtier recentré : écran vers +Z, haut vers +Y
  const boxPivot = new THREE.Group(), bi = new THREE.Group(); bi.add(box); box.position.copy(SCREEN_C).negate();
  const up = SCREEN_UP.clone().sub(SCREEN_N.clone().multiplyScalar(SCREEN_UP.dot(SCREEN_N))).normalize();
  bi.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(up.clone().cross(SCREEN_N), up, SCREEN_N)).invert(); boxPivot.add(bi);
  const boxPortLocal = BOX_PORT.clone().sub(SCREEN_C).applyQuaternion(bi.quaternion);
  let vals = { sys: '', dia: '', pul: '' };
  const api = {
    box: boxPivot, cuff, cuffRadius: CUFF_R, cuffPort: portLocal, boxPort: boxPortLocal,
    show(v) { vals = { ...vals, ...v }; drawLCD(lcd, vals); m25.map.needsUpdate = true; },
    /* animation d'une mesure : gonflage, montée de la pression, dégonflage, puis affichage des valeurs du cas */
    measure(target, onTick) {
      const sys = +target.sys || 120, dia = +target.dia || 80, pul = +target.pul || 72, peak = sys + 30, t0 = performance.now();
      const dur = { up: 4500, down: 5000 };
      return new Promise((res) => {
        const step = () => {
          const t = performance.now() - t0; let p, phase;
          if (t < dur.up) { phase = 'gonflage'; p = Math.round(peak * (t / dur.up) ** 0.8); api.show({ sys: p, dia: '', pul: '', heart: false }); }
          else if (t < dur.up + dur.down) { phase = 'dégonflage'; const u = (t - dur.up) / dur.down; p = Math.round(peak - (peak - dia + 10) * u); api.show({ sys: p, dia: '', pul: '', heart: Math.floor(t / 400) % 2 === 0 }); }
          else { phase = 'fin'; api.show({ sys, dia, pul, heart: true }); onTick && onTick(phase, 0); return res({ sys, dia, pul }); }
          onTick && onTick(phase, phase === 'gonflage' ? t / dur.up : 1 - (t - dur.up) / dur.down);
          requestAnimationFrame(step);
        };
        step();
      });
    },
  };
  return api;
}
