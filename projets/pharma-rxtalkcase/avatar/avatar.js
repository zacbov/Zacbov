import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z), clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const W = 'MouthWhistle_NarrowAdjust_', B2 = (n, v) => ({ [n + '_Left']: v, [n + '_Right']: v });

/* ---------- expressions du visage (jeu de 50 formes) + geste et posture de tête associés ---------- */
export const EMOTIONS = {
  neutre: { face: {}, gesture: 'repos', head: [0, 0, 0] },
  surprise: { face: { ...B2('BrowsUp', .9), ...B2('EyesWide', .9), Jaw_Down: .3, MouthOpen: .25, ...B2('UpperLipUp', .15) }, gesture: 'surprise', head: [-0.08, 0, 0] },
  tristesse: { face: { ...B2('BrowsIn', .6), ...B2('BrowsUp', .2), ...B2('Frown', .5), MouthDown: .25, LowerLipOut: .25, ...B2('Blink', .15) }, gesture: 'abattu', head: [0.14, 0, 0.05] },
  joie: { face: { ...B2('Smile', .85), ...B2('Squint', .35), ...B2('CheekPuff', .1), ...B2('BrowsUp', .12) }, gesture: 'ouvert', head: [-0.03, 0, 0] },
  colere: { face: { ...B2('BrowsDown', .8), ...B2('Frown', .35), ...B2('Squint', .3), ...B2('NoseScrunch', .4), ...B2('MouthNarrow', .3), LowerLipIn: .2 }, gesture: 'poings', head: [0.05, 0, 0] },
  peur: { face: { ...B2('BrowsUp', .8), ...B2('BrowsIn', .6), ...B2('EyesWide', .8), ...B2('MouthNarrow', .3), Jaw_Down: .2 }, gesture: 'protege', head: [-0.05, 0, 0] },
  degout: { face: { ...B2('NoseScrunch', .8), ...B2('UpperLipUp', .6), ...B2('BrowsDown', .4), ...B2('Squint', .3), MouthDown: .2 }, gesture: 'repos', head: [0.04, 0.1, 0] },
  doute: { face: { BrowsUp_Left: .65, BrowsDown_Right: .3, MouthNarrow_Left: .4, Midmouth_Left: .3, Squint_Right: .15 }, gesture: 'reflexion', head: [0.02, 0.08, 0.1] },
  fatigue: { face: { ...B2('Blink', .45), ...B2('BrowsDown', .15), Jaw_Down: .05 }, gesture: 'abattu', head: [0.12, 0, -0.04] },
  douleur: { face: { ...B2('Squint', .6), ...B2('BrowsIn', .5), ...B2('BrowsDown', .3), ...B2('MouthNarrow', .5), ...B2('Frown', .3), ...B2('NoseScrunch', .3) }, gesture: 'ventre', head: [0.1, 0, 0] },
  anxieux: { face: { ...B2('BrowsIn', .55), ...B2('BrowsUp', .15), ...B2('EyesWide', .35), ...B2('Frown', .35), ...B2('MouthNarrow', .25), MouthDown: .15, LowerLipIn: .15 }, gesture: 'protege', head: [0.02, 0, 0], jitter: 0.008, blink: 1.6 },
  presse: { face: { ...B2('Frown', .35), ...B2('BrowsDown', .3) }, gesture: 'heure', head: [0.12, 0.05, 0], jitter: 0.006 },
  bavard: { face: { ...B2('Smile', .3), ...B2('BrowsUp', .15) }, gesture: 'explique', head: [0, 0, 0] },
  gene: { face: { ...B2('BrowsIn', .2), ...B2('BrowsUp', .15), ...B2('MouthNarrow', .15) }, gesture: 'repos', head: [0.08, 0.1, 0] },
};
export const PROFIL_EMO = { presse: 'presse', bavard: 'bavard', anxieux: 'anxieux', observance: 'gene', '': 'neutre' };
export function guessEmotion(text, profil = '') {
  const t = (text || '').toLowerCase(), base = PROFIL_EMO[profil] || 'neutre';
  if (/inquiet|peur|angoiss|stress/.test(t)) return 'peur';
  if (/fatigu|épuis|crev|sommeil/.test(t)) return 'fatigue';
  if (/douleur|j'ai mal|ça fait mal|souffr/.test(t)) return 'douleur';
  if (/triste|déprim|pleur|moral/.test(t)) return 'tristesse';
  if (/comprends pas|je ne sais pas|je sais plus|pas sûr/.test(t)) return 'doute';
  if (/merci|content|soulag|ravi|super/.test(t)) return 'joie';
  if (/vraiment\s*\?|quoi\s*\?|comment\s*\?|ah bon/.test(t)) return 'surprise';
  return base;
}

/* ---------- gestes ----------
   Chaque geste donne, pour chaque bras, soit une position de poignet (w), soit un point de contact de la paume sur le corps (c, avec la normale n de la surface).
   fing = direction des doigts, palm = direction vers laquelle la paume regarde, pole = direction du coude, curl = fermeture de la main (0 à 1). Repère du modèle : x vers la gauche du patient, y vers le haut, z vers le pharmacien. */
const P = (o, x, y, z) => V3(o * x, y, z);
export function surf(D, y, ang, o = 1) {                         // point de la surface du tronc (ellipse lue sur les vêtements) : ang 0 = devant, PI/2 = flanc, PI = dos
  const rx = D.hx(y), zf = D.zf(y), zb = D.zb(y), zc = (zf + zb) / 2, rz = Math.max((zf - zb) / 2, 0.05);
  return { c: V3(o * rx * Math.sin(ang), y, zc + rz * Math.cos(ang)), n: V3(o * Math.sin(ang) / rx, 0, Math.cos(ang) / rz).normalize() };
}
const hip = (D, o) => { const { c, n } = surf(D, D.hipsY + 0.085, 1.85, o); return { c, n, fing: V3(0, -0.5, 1), pole: P(o, 1, 0.05, -0.35), curl: 0.12 }; };   // main posée sur la hanche, doigts vers l'avant, coude écarté
const aPortee = (D, o, p, f = 0.86) => {                       // cible ramenée vers l'épaule si le bras devrait être tendu (coude plié)
  if (!D.armLen) return p; const S = V3(o * D.armX, D.shoulderY, D.armZ), d = p.clone().sub(S), L = d.length(), m = f * D.armLen;
  return L > m ? S.add(d.multiplyScalar(m / L)) : p; };
const hang = (D, o) => ({ w: P(o, D.hx(D.hipsY) + 0.045, D.hipsY + 0.03, D.zf(D.hipsY) * 0.35 + 0.035), pole: P(o, 0.35, 0, -1), fing: V3(0, -1, 0.12), palm: P(o, -1, 0, 0.1), curl: 0.32, thumb: 0.15, suit: 0.75 });   // bras ballant, paume contre la cuisse
export const GESTURES = {
  repos: (D, s, o) => hang(D, o),                                                                           // bras détendus le long du corps, coudes à peine pliés (au comptoir)
  hanches: (D, s, o) => hip(D, o),                                                                          // mains sur les hanches
  explique: (D, s, o) => s === 'Right' ? { w: P(o, 0.19, D.chestY - 0.1, D.zf(D.chestY) + 0.2), pole: P(o, 0.6, -1, -0.3), fing: P(o, 0.1, 0.25, 1), palm: P(o, -0.55, 0.8, 0), curl: 0.25, thumb: 0.1, suit: 0.35 } : hang(D, o),
  surprise: (D, s, o) => ({ w: P(o, 0.15, D.chestY - 0.13, D.zf(D.chestY - 0.1) + 0.12), pole: P(o, 0.55, -1, -0.25), fing: P(o, 0.15, 0.75, 0.6), palm: P(o, -0.25, -0.15, 1), curl: 0.12, thumb: 0.1, suit: 0.55 }),   // mains un peu levées devant le ventre, paumes vers l'avant, poignets dans l'axe
  jointes: (D, s, o) => ({ w: aPortee(D, o, P(o, 0.05, D.hipsY + 0.01, D.zf(D.hipsY) + 0.1)), pole: P(o, 1, -0.7, -0.15), fing: P(o, -0.75, -0.6, 0.15), palm: P(o, -0.25, 0.1, -1), curl: 0.4, thumb: 0.25, suit: 0.7 }),   // attente : mains jointes devant le bas-ventre
  abattu: (D, s, o) => ({ ...hang(D, o), curl: 0.35, shrug: -0.2 }),                                       // bras ballants, épaules affaissées
  ouvert: (D, s, o) => ({ w: P(o, 0.22, D.hipsY + 0.14, D.zf(D.hipsY + 0.1) + 0.17), pole: P(o, 0.6, -1, -0.2), fing: P(o, 0.3, 0.1, 1), palm: V3(0, 1, 0.1), curl: 0.25, thumb: 0.05, suit: 0.5 }),   // paumes ouvertes vers le haut
  poings: (D, s, o) => ({ w: P(o, D.hx(D.hipsY) + 0.07, D.hipsY + 0.05, 0.07), pole: P(o, 0.5, 0, -1), fing: V3(0, -1, 0.25), palm: P(o, -1, 0, 0), curl: 0.9, thumb: 0.6, shrug: 0.2, suit: 0.8 }),   // poings serrés le long du corps, bras tendus
  protege: (D, s, o) => ({ w: P(o, 0.11, D.chestY + (D.bust > 0.012 ? 0.04 : -0.07), D.zf(D.chestY + 0.04) + 0.13), pole: P(o, 0.5, -1, 0), fing: P(o, -0.1, 1, 0.1), palm: P(o, -0.35, 0, 1), suit: 0.4, curl: 0.35 }),   // mains devant la poitrine, écartées, paumes vers l'avant
  reflexion: (D, s, o) => s === 'Right'
    ? { c: D.chin.clone().add(V3(0, -0.065, 0.005)), n: V3(0, -0.5, 0.85), fing: V3(0, 0.75, 0.66), pole: P(o, 0.3, -1, D.bust > 0.012 ? 0.75 : 0), curl: 0.65, thumb: 0.2 }     // main sous le menton
    : (() => { const { c, n } = surf(D, D.hipsY + 0.2, -0.35, o); return { c, n, fing: P(o, -1, 0.15, 0), pole: P(o, 1, -0.6, 0.1), curl: 0.25 }; })(),   // avant-bras en travers du ventre
  ventre: (D, s, o) => s === 'Right' ? (() => { const { c, n } = surf(D, D.hipsY + 0.12, 0.15, o); return { c, n, fing: V3(-o, -0.35, 0), pole: P(o, 0.9, -0.6, -0.3), curl: 0.15 }; })() : hang(D, o),   // une main sur le ventre, l'autre bras ballant
  heure: (D, s, o) => s === 'Left' ? { w: P(o, 0.02, D.chestY - 0.04, D.zf(D.chestY) + 0.15), pole: P(o, 0.5, -1, -0.1), fing: P(o, -1, 0.15, 0.2), palm: V3(0, -1, 0), curl: 0.35 } : hang(D, o),   // regarde sa montre (poignet gauche)
  haussement: (D, s, o) => ({ ...hang(D, o), curl: 0.2, shrug: 1 }),                                     // seules les épaules montent
};
/* parties du corps : la paume se pose sur la zone (main opposée pour l'épaule, le bras et la poitrine). Le bras touché est lu sur le squelette, donc la main suit sa position réelle. */
export const TOUCH = {
  front: (D, s, o, R) => ({ hand: 'Right', c: D.forehead.clone().add(V3(0, 0.02, -0.005)), n: V3(0, 0.35, 1), fing: V3(1, 0.3, 0), pole: P(-1, 1, -0.15, 0.35), curl: 0.2 }),   // coude écarté sur le côté, avant-bras presque horizontal
  gorge: (D, s, o, R) => ({ hand: 'Right', c: V3(0, D.neckY - 0.03, D.neckFront), n: V3(0, -0.15, 1), fing: V3(1, 0.45, 0), pole: P(-1, 0.4, -1, 0.1), curl: 0.4 }),
  poitrine: (D, s, o, R) => { const big = D.bust > 0.012, { c, n } = surf(D, big ? (D.chestY + D.shoulderY) / 2 + 0.02 : D.chestY + 0.03, big ? 0.3 : 0.45, o); return { hand: s === 'Left' ? 'Right' : 'Left', c, n, fing: V3(o * 0.5, 0.85, 0), pole: P(-o, 0.3, -1, big ? 1 : 0.45), curl: 0.12 }; },
  ventre: (D, s, o, R) => { const { c, n } = surf(D, D.hipsY + 0.11, s === 'Left' ? 0.35 : -0.2, D.sideSign.Left); return { hand: 'Right', c, n, fing: V3(D.sideSign.Left, -0.3, 0), pole: P(D.sideSign.Right, 0.9, -0.6, -0.3), curl: 0.15 }; },
  epaule: (D, s, o, R) => ({ hand: s === 'Left' ? 'Right' : 'Left', c: V3(o * 0.175, D.shoulderY + 0.03, D.zf(D.shoulderY) - 0.02), n: V3(o * 0.3, 0.65, 0.7), fing: V3(o * 0.2, 0.45, -0.85), pole: P(-o, 0.15, -0.7, 0.75), curl: 0.4 }),
  bras: (D, s, o, R) => { const a = R.local(s + 'Arm'), e = R.local(s + 'ForeArm'), m = a.lerp(e, 0.5), ax = e.clone().sub(R.local(s + 'Arm')).normalize(), n = V3(o * 0.55, 0, 0.85); n.sub(ax.clone().multiplyScalar(n.dot(ax))).normalize();
    return { hand: s === 'Left' ? 'Right' : 'Left', c: (() => { const c = m.add(n.clone().multiplyScalar(0.055)); c.z = Math.max(c.z + 0.02 + 1.5 * (D.bust || 0), D.zf(c.y) - 0.02); return c; })(), n, fing: V3(o * 0.6, 0, -0.8), pole: P(-o, 0.3, -1, 0.85), curl: 0.5, thumb: 0.4 }; },   // coude en avant : l'avant-bras passe devant la poitrine
  reins: (D, s, o, R) => { const { c, n } = surf(D, D.hipsY + 0.08, 2.5, o); return { hand: s, c, n, fing: P(o, -0.45, -1, 0), pole: P(o, 1, 0, -0.5), curl: 0.1 }; },
  cuisse: (D, s, o, R) => ({ hand: s, c: P(o, D.hx(D.hipsY) * 0.55, D.hipsY - 0.1, D.zf(D.hipsY - 0.1) + 0.005), n: P(o, 0.25, 0, 1), fing: P(o, -0.1, -1, 0), pole: P(o, 0.5, 0, -1), curl: 0.2 }),
};
export const ZONES = { front: 'Tête (front)', gorge: 'Gorge', poitrine: 'Poitrine', ventre: 'Ventre', epaule: 'Épaule', bras: 'Bras', reins: 'Bas du dos', cuisse: 'Cuisse' };
export function guessTouch(text) {
  const t = (text || '').toLowerCase(); if (!/mal|douleur|douloureu|gêne|brûl|pique|serre|tiraille|lance|crampe|souffr|élanc|courbatu/.test(t)) return null;
  const map = [[/épaule/, 'epaule'], [/\bbras\b|coude|poignet/, 'bras'], [/tête|front|crâne|migraine|céphal|tempe/, 'front'], [/gorge|\bcou\b|nuque|avaler/, 'gorge'], [/poitrine|thorax|cœur|coeur|sternum/, 'poitrine'],
    [/ventre|estomac|abdomen|bas-ventre|nombril|digest/, 'ventre'], [/\bdos\b|reins|lombaire|hanche/, 'reins'], [/cuisse|jambe|genou|mollet/, 'cuisse']];
  for (const [rx, part] of map) { const m = rx.exec(t); if (m) { const near = t.slice(Math.max(0, m.index - 25), m.index + 35); return { part, side: /gauche/.test(near) ? 'Left' : 'Right' }; } }
  return null;
}
/* une spécification de contact devient une cible de poignet : la paume (à ~7 cm du poignet le long des doigts) se pose sur la surface */
export function resolveSpec(sp) {
  if (!sp.c) return sp;
  const n = sp.n.clone().normalize(), f = sp.fing.clone().sub(n.clone().multiplyScalar(sp.fing.dot(n))).normalize();
  return { ...sp, w: sp.c.clone().add(n.clone().multiplyScalar(0.032)).sub(f.clone().multiplyScalar(0.07)), fing: f, palm: n.clone().negate() };
}

/* ---------- squelette : calcul géométrique pur (testable sans navigateur) ---------- */
export class Rig {
  constructor(root) {
    this.root = root; this.bones = {}; this.tpose = {}; this.out = {}; this.fingers = { Left: [], Right: [] }; this.thumbs = { Left: [], Right: [] }; this.l1 = {}; this.l2 = {}; this.meshes = []; this.morphs = []; this.fingL = {}; this.palmL = {};
    root.traverse((o) => {
      if (o.isBone) { const k = o.name.replace(/^mixamorig[_:]/, ''); this.bones[k] = o; this.tpose[k] = o.quaternion.clone(); }
      if (o.isSkinnedMesh) { o.frustumCulled = false; this.meshes.push(o); if (o.morphTargetDictionary) { this.body = o; this.dict = o.morphTargetDictionary; this.morphs.push(o); } }
    });
    if (!this.body) { this.body = this.meshes.find((m) => /^body/i.test(m.name)) || this.meshes[0]; this.dict = this.body && this.body.morphTargetDictionary || {}; }   // modèle sans expressions
    root.updateMatrixWorld(true);
    const wp = (n) => this.bones[n].getWorldPosition(V3(0, 0, 0)), wq = (b) => b.getWorldQuaternion(new THREE.Quaternion());
    this.restWQ = {}; for (const k in this.bones) this.restWQ[k] = wq(this.bones[k]);   // orientation de repos (repère du modèle) de chaque os
    for (const s of ['Left', 'Right']) {
      const A = this.bones[s + 'Arm'], F = this.bones[s + 'ForeArm'], H = this.bones[s + 'Hand'];
      this.out[s] = A && F ? Math.sign(wp(s + 'ForeArm').x - wp(s + 'Arm').x) || 1 : 1;
      if (!A || !F || !H) continue;
      this.l1[s] = wp(s + 'Arm').distanceTo(wp(s + 'ForeArm')); this.l2[s] = wp(s + 'ForeArm').distanceTo(wp(s + 'Hand'));
      const hq = wq(H).invert(), f = wp(s + 'HandMiddle1').sub(wp(s + 'Hand')).normalize(), side = wp(s + 'HandIndex1').sub(wp(s + 'HandPinky1')).normalize();
      let pn = f.clone().cross(side).normalize(); if (pn.y > 0) pn.negate();                          // en pose en T, les paumes regardent vers le bas
      this.fingL[s] = f.clone().applyQuaternion(hq); this.palmL[s] = pn.clone().applyQuaternion(hq);
      for (const fn of ['Index', 'Middle', 'Ring', 'Pinky', 'Thumb']) {        // axe de flexion de chaque phalange, calculé en pose en T
        const chain = [];
        for (let k = 1; k <= 3; k++) {
          const b = this.bones[`${s}Hand${fn}${k}`], c = this.bones[`${s}Hand${fn}${k + 1}`] || null; if (!b) continue;
          const p = b.getWorldPosition(V3(0, 0, 0)), q = c ? c.getWorldPosition(V3(0, 0, 0)) : p.clone().add(p.clone().sub(b.parent.getWorldPosition(V3(0, 0, 0))));
          const dir = q.sub(p).normalize(), axisW = fn === 'Thumb' ? dir.clone().cross(pn).normalize().multiplyScalar(-1) : dir.clone().cross(V3(0, -1, 0)).normalize();
          if (fn === 'Thumb' && this.out[s] < 0) axisW.negate();
          chain.push({ b, key: `${s}Hand${fn}${k}`, axis: axisW.applyQuaternion(wq(b).invert()).normalize() });
        }
        if (chain.length) (fn === 'Thumb' ? this.thumbs[s] : this.fingers[s]).push({ f: fn, chain });
      }
    }
    this.measure();
  }
  local(n) { return this.root.worldToLocal(this.bones[n].getWorldPosition(V3(0, 0, 0))); }
  measure() {                                                       // dimensions du corps (repère du modèle), lues sur le squelette et sur les vêtements en pose de repos
    const L = (n) => this.local(n), hips = L('Hips'), neck = L('Neck'), head = L('Head'), A = L('LeftArm');
    const top = this.bones.HeadTop_End ? L('HeadTop_End') : head.clone().add(V3(0, 0.2, 0));
    const bins = {}, y0 = hips.y - 0.15, y1 = A.y + 0.05, step = 0.04, face = []; let neckFront = neck.z + 0.06;
    for (const m of this.meshes) {
      const cloth = /sweat|shirt|pants/i.test(m.name), body = m === this.body || this.morphs.includes(m) || /^body/i.test(m.name); if (!cloth && !body) continue;
      const p = V3(0, 0, 0), pos = m.geometry.attributes.position, n = pos.count;
      for (let i = 0; i < n; i += 2) { p.fromBufferAttribute(pos, i); const w = this.root.worldToLocal(m.localToWorld(p.clone()));
        if (body) { if (Math.abs(w.x) < 0.02 && Math.abs(w.y - (neck.y - 0.03)) < 0.02) neckFront = Math.max(neckFront, w.z); if (w.y > neck.y + 0.02 && Math.abs(w.x) < 0.12) face.push(w); continue; }
        if (Math.abs(w.x) > 0.23 || w.y < y0 || w.y > y1) continue;
        const k = Math.round((w.y - y0) / step), b = bins[k] || (bins[k] = { hx: 0, zf: -9, zb: 9 }); b.hx = Math.max(b.hx, Math.abs(w.x)); b.zf = Math.max(b.zf, w.z); b.zb = Math.min(b.zb, w.z); }
    }
    { const A0 = this.local('LeftArm'), E0 = this.local('LeftForeArm'), ax = E0.clone().sub(A0), L2 = ax.lengthSq(), ds = [];       // rayon du haut du bras (manche comprise)
      const m = this.meshes.find((x) => /sweat/i.test(x.name)) || this.body, p = V3(0, 0, 0), pos = m.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) { p.fromBufferAttribute(pos, i); const w = this.root.worldToLocal(m.localToWorld(p.clone())), t = w.clone().sub(A0).dot(ax) / L2; if (t > 0.3 && t < 0.6) ds.push(w.distanceTo(A0.clone().add(ax.clone().multiplyScalar(t)))); }
      ds.sort((x, y) => x - y); this.armR = ds.length ? ds[Math.floor(ds.length * 0.85)] : 0.05; }
    const at = (y, key, def) => { const k = Math.round((y - y0) / step); for (const d of [0, 1, -1, 2, -2]) { const b = bins[k + d]; if (b && b.hx > 0) return b[key]; } return def; };
    this.D = { hipsY: hips.y, chestY: (hips.y + A.y) / 2 + 0.03, shoulderY: A.y, neckY: neck.y, headY: head.y, neckFront, sideSign: { Left: this.out.Left, Right: this.out.Right },
      hx: (y) => at(y, 'hx', 0.17), zf: (y) => at(y, 'zf', 0.12), zb: (y) => at(y, 'zb', -0.1),
      chin: head.clone().add(V3(0, -0.06, 0.1)), forehead: head.clone().add(V3(0, 0.088, 0.112)) };
    { const a = this.local('LeftArm'), e = this.local('LeftForeArm'), h = this.local('LeftHand'); this.D.armLen = a.distanceTo(e) + e.distanceTo(h); this.D.armX = Math.abs(a.x); this.D.armZ = a.z; }   // portée du bras (cibles atteignables)
    // visage lu sur le maillage, à partir des yeux : front, bouche, menton (chaque modèle a ses proportions)
    const eyes = ['LeftEye', 'RightEye'].filter((k) => this.bones[k]).map((k) => L(k));
    this.D.head0 = head.clone();
    if (eyes.length && face.length > 50) {                          // visage lu sur le maillage, en proportion de la hauteur œil–menton
      const ey = eyes.reduce((a, e) => a + e.y, 0) / eyes.length, mid = face.filter((w) => Math.abs(w.x) < 0.012);
      const front = (y0_, y1_) => { let b = null; for (const w of mid) if (w.y > y0_ && w.y < y1_ && (!b || w.z > b.z)) b = w; return b && b.clone(); };
      const fz = mid.filter((w) => w.z > neckFront + 0.02 && w.y < ey - 0.04), lowest = fz.reduce((a, w) => (!a || w.y < a.y ? w : a), null);
      const chin = lowest ? (front(lowest.y + 0.004, lowest.y + 0.018) || lowest.clone()) : this.D.chin, h = ey - chin.y;
      this.D.chin = chin; this.D.eyeY = ey; this.D.eyes = eyes;
      this.D.forehead = front(ey + 0.45 * h, ey + 0.58 * h) || this.D.forehead;
      this.D.nose = front(ey - 0.5 * h, ey - 0.25 * h);
      this.D.mouth = front(ey - 0.74 * h, ey - 0.64 * h);
      let ear = null; for (const w of face) if (Math.abs(w.y - (ey - 0.3 * h)) < 0.012 && w.x > 0 && Math.abs(w.z - head.z) < 0.06 && (!ear || w.x > ear.x)) ear = w;
      this.D.lobe = ear && ear.clone();
    }
    this.D.bust = this.D.zf(this.D.chestY + 0.05) - this.D.zf(this.D.hipsY + 0.12);   // relief de la poitrine (patiente) : les coudes passent devant
    if (this.D.bust > 0.012) { const D = this.D, scan = (a, b_, f) => { let best = null; for (let y = a; y <= b_; y += 0.01) { const v = f(y); if (best === null || v > best.v) best = { y, v }; } return best ? best.y : (a + b_) / 2; };
      D.waistY = scan(D.hipsY + 0.04, D.chestY + 0.02, (y) => -D.hx(y));                         // taille : tronc le plus étroit
      D.bustY = scan(D.chestY - 0.04, D.shoulderY - 0.06, (y) => D.zf(y));                       // poitrine : relief maximal
      D.hipY = Math.max(D.hipsY - 0.03, scan(D.hipsY - 0.08, D.waistY - 0.06, (y) => D.hx(y))); }                         // hanches : bassin le plus large
  }
  aim(b, child, dir) {                                             // oriente un os vers une direction du monde, quel que soit son repère local
    const p = b.getWorldPosition(V3(0, 0, 0)), c = child.getWorldPosition(V3(0, 0, 0)), cur = c.sub(p).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(cur, dir.clone().normalize()), wq = b.getWorldQuaternion(new THREE.Quaternion()).premultiply(q);
    b.quaternion.copy(b.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(wq)); b.updateMatrixWorld(true);
  }
  setWorldQ(b, q) { b.quaternion.copy(b.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(q)); b.updateMatrixWorld(true); }
  reset(...names) { for (const n of names) if (this.bones[n]) this.bones[n].quaternion.copy(this.tpose[n]); this.root.updateMatrixWorld(true); }
  reach(s, wModel, poleModel, shrug = 0, fingModel = null, palmModel = null, suit = 0, plat = false) {   // suit : 0..1, les doigts prolongent l'avant-bras (poignet droit, naturel au repos)   // cinématique inverse à deux os (poignet sur la cible, coude vers le pôle), puis orientation de la main
    const sh = this.bones[s + 'Shoulder'], A = this.bones[s + 'Arm'], F = this.bones[s + 'ForeArm'], H = this.bones[s + 'Hand']; if (!A || !F || !H) return;
    const M = this.root.matrixWorld; this.reset(s + 'Shoulder', s + 'Arm', s + 'ForeArm', s + 'Hand');
    if (sh) this.aim(sh, A, V3(this.out[s], 0.12 + 0.4 * shrug, 0).transformDirection(M));
    const S = A.getWorldPosition(V3(0, 0, 0)), l1 = this.l1[s], l2 = this.l2[s], u = this.root.localToWorld(wModel.clone()).sub(S); let d = clamp(u.length(), Math.abs(l1 - l2) + 0.05, (l1 + l2) * 0.995); u.normalize();
    const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(l1 * l1 - a * a, 0)), pl = poleModel.clone().transformDirection(M), pp = pl.sub(u.clone().multiplyScalar(pl.dot(u))).normalize();
    const E = S.clone().add(u.clone().multiplyScalar(a)).add(pp.multiplyScalar(h)), W = S.clone().add(u.clone().multiplyScalar(d));
    this.aim(A, F, E.clone().sub(S)); this.aim(F, H, W.clone().sub(E));
    if (!fingModel || !palmModel) return;
    const ax = W.clone().sub(E).normalize(); let Fw = fingModel.clone().transformDirection(M);
    if (suit > 0) { const up = V3(0, 1, 0).transformDirection(M), prol = plat ? ax.clone().sub(up.clone().multiplyScalar(ax.dot(up) + 0.04)).normalize() : ax.clone(); Fw.lerp(prol, suit).normalize(); }   // prolonge l'avant-bras, à plat (la main repose sur le plan où est le poignet)
    {                                                                                   // butées du poignet : flexion 70°, extension 60°, inclinaisons 25°
      const n0 = palmModel.clone().transformDirection(M); n0.sub(ax.clone().multiplyScalar(n0.dot(ax)));
      if (n0.lengthSq() > 1e-6) {
        n0.normalize(); const r = ax.clone().cross(n0), x = Fw.dot(ax), y = Fw.dot(n0), z = Fw.dot(r);
        const sp = this.souple ? 1.3 : 1, fl = clamp(Math.atan2(y, Math.max(x, 1e-3)), -1.05 * sp, 1.22 * sp), dv = clamp(Math.atan2(z, Math.max(x, 1e-3)), -0.44 * sp, 0.44 * sp);   // contact (main posée) : butées plus larges
        Fw = ax.clone().add(n0.multiplyScalar(Math.tan(fl))).add(r.multiplyScalar(Math.tan(dv))).normalize();
      }
    }
    const Nw = palmModel.clone().transformDirection(M); Nw.sub(Fw.clone().multiplyScalar(Nw.dot(Fw))).normalize();
    const proj = (v) => v.clone().sub(ax.clone().multiplyScalar(v.dot(ax))).normalize();          // pronation / supination : la moitié par l'avant-bras, le reste par le poignet
    const cur = proj(this.palmL[s].clone().applyQuaternion(H.getWorldQuaternion(new THREE.Quaternion()))), tgt = proj(Nw);
    const roll = Math.atan2(cur.clone().cross(tgt).dot(ax), cur.dot(tgt));
    this.setWorldQ(F, new THREE.Quaternion().setFromAxisAngle(ax, clamp(roll * 0.6, -1.05, 1.05)).multiply(F.getWorldQuaternion(new THREE.Quaternion())));   // la rotation de l'avant-bras porte presque toute la supination : le poignet ne se tord plus
    const hq = H.getWorldQuaternion(new THREE.Quaternion()), fw = this.fingL[s].clone().applyQuaternion(hq), nw = this.palmL[s].clone().applyQuaternion(hq);
    nw.sub(fw.clone().multiplyScalar(nw.dot(fw))).normalize();
    const Mc = new THREE.Matrix4().makeBasis(fw, nw, fw.clone().cross(nw)), Mt = new THREE.Matrix4().makeBasis(Fw, Nw, Fw.clone().cross(Nw));
    const R = new THREE.Quaternion().setFromRotationMatrix(Mt.multiply(Mc.transpose()));
    this.setWorldQ(H, R.multiply(hq));
  }
  curl(s, amount, thumb = 0) {                                     // 0 = main ouverte, 1 = poing
    const ang = [0.95, 1.2, 0.85], tang = [0.25, 0.55, 0.6];
    for (const { f, chain } of this.fingers[s]) chain.forEach(({ b, key, axis }, i) => {
      b.quaternion.copy(this.tpose[key]).multiply(new THREE.Quaternion().setFromAxisAngle(axis, ang[i] * clamp(amount + (f === 'Pinky' ? 0.05 : 0) - (f === 'Index' ? 0.04 : 0), 0, 1)));
    });
    for (const { chain } of this.thumbs[s]) chain.forEach(({ b, key, axis }, i) => { b.quaternion.copy(this.tpose[key]).multiply(new THREE.Quaternion().setFromAxisAngle(axis, tang[i] * clamp(thumb, -0.3, 1))); });
  }
  turn(name, ax, ang, add = false) {                               // rotation autour d'un axe du monde ; add = s'ajoute à la rotation déjà appliquée dans l'image
    const b = this.bones[name]; if (!b) return; const pq = b.parent.getWorldQuaternion(new THREE.Quaternion()), q = new THREE.Quaternion().setFromAxisAngle(ax, ang);
    b.quaternion.copy(pq.clone().invert().multiply(q).multiply(pq).multiply(add ? b.quaternion.clone() : this.tpose[name]));
  }
}

/* ---------- avatar complet : scène, animation, voix ---------- */
const MOUTH = /^(Jaw|Mouth|Midmouth|LowerLip|UpperLip|Tongue)/;
const W_ = (n) => W + n;
const VIS = { A: { Jaw_Down: .55, MouthOpen: .45 }, E: { Jaw_Down: .3, ...B2('Smile', .35) }, I: { Jaw_Down: .12, ...B2('Smile', .55) }, O: { Jaw_Down: .3, MouthOpen: .25, [W_('Left')]: .45, [W_('Right')]: .45 },
  U: { Jaw_Down: .1, [W_('Left')]: .8, [W_('Right')]: .8, ...B2('MouthNarrow', .4) }, EU: { Jaw_Down: .25, [W_('Left')]: .35, [W_('Right')]: .35 }, M: { UpperLipIn: .5, LowerLipIn: .5 },
  F: { LowerLipIn: .7, ...B2('UpperLipUp', .2) }, CH: { Jaw_Down: .12, [W_('Left')]: .3, [W_('Right')]: .3 }, T: { Jaw_Down: .12, TongueUp: .5 }, S: { Jaw_Down: .08, ...B2('Smile', .2) }, K: { Jaw_Down: .15 }, _: {} };
export function visemes(text) {
  const t = text.toLowerCase(), out = new Array(t.length).fill('_');
  for (let i = 0; i < t.length; i++) {
    const c = t[i], n = t[i + 1] || ''; let v = '_';
    if ('aàâ'.includes(c)) v = 'A'; else if ('eéèêë'.includes(c)) v = 'E'; else if ('iîïy'.includes(c)) v = 'I'; else if ('oô'.includes(c)) v = n === 'u' ? 'U' : 'O';
    else if ('uûùü'.includes(c)) v = 'U'; else if (c === 'œ') v = 'EU'; else if ('pbm'.includes(c)) v = 'M'; else if ('fv'.includes(c)) v = 'F';
    else if (c === 'j' || (c === 'c' && n === 'h') || (c === 'g' && 'ei'.includes(n))) v = 'CH'; else if ('tdnl'.includes(c)) v = 'T';
    else if ('szx'.includes(c) || (c === 'c' && 'ei'.includes(n))) v = 'S'; else if ('rkqgc'.includes(c)) v = 'K';
    out[i] = v;
    if (c === 'o' && n === 'u') { out[i + 1] = 'U'; i++; } else if (c === 'e' && n === 'u') { out[i] = out[i + 1] = 'EU'; i++; }
  }
  return out;
}

const NEG = new Set(['tristesse', 'colere', 'peur', 'degout', 'douleur', 'fatigue', 'anxieux', 'presse', 'gene', 'doute']);
export async function createAvatar(el, opts = {}) {
  const o = { glb: 'avatar/patient_homme.glb', background: 'avatar/decor_pharmacie.webp', tensio: 'avatar/tensiometre-draco.glb', draco: 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/draco/', interactive: false, view: 'buste', ...opts };
  el.style.position = el.style.position || 'relative'; if (o.background) el.style.background = `#13201b url(${o.background}) center/cover no-repeat`;
  let API_SOL = null;
  const canvas = document.createElement('canvas'); canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block' + (o.interactive ? '' : ';pointer-events:none'); el.prepend(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); renderer.setPixelRatio(Math.min(2, devicePixelRatio)); renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(28, 1, 0.05, 20);
  /* éclairage : modelé plutôt que lumière plate — ambiance réduite, plafonnier chaud de trois quarts, appoint froid, contre-jour, reflets d'une pièce */
  scene.add(new THREE.HemisphereLight(0xfff4e8, 0x4a5058, 0.55));
  const key = new THREE.DirectionalLight(0xfff1e0, 2.6); key.position.set(-1.2, 3.2, 2.2); scene.add(key);
  const fill = new THREE.DirectionalLight(0xdfe8ff, 0.7); fill.position.set(2.2, 1.2, 1.6); scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffffff, 1.3); rim.position.set(0.6, 2.4, -2.5); scene.add(rim);
  try { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; pm.dispose(); } catch (e) {}
  const ENV_I = 0.35;   // reflets d'environnement discrets (peau, yeux, tissus)
  const controls = o.interactive ? new OrbitControls(camera, canvas) : null; if (controls) { controls.enablePan = false; controls.minDistance = 0.4; controls.maxDistance = 4; }   // en situation, le patient ne se manipule pas
  const fit = () => { const w = el.clientWidth || 300, h = el.clientHeight || 400; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
  const ro = new ResizeObserver(fit); ro.observe(el); fit();
  const gltf = await new GLTFLoader().setDRACOLoader(new DRACOLoader().setDecoderPath(o.draco || 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/draco/')).setMeshoptDecoder(MeshoptDecoder).loadAsync(o.glb); scene.add(gltf.scene);
  gltf.scene.traverse((m) => { if (m.isMesh) for (const mt of [].concat(m.material)) if (mt && 'envMapIntensity' in mt) mt.envMapIntensity = ENV_I; });
  const rig = new Rig(gltf.scene), names = Object.keys(rig.dict || {}), D = rig.D, look = V3(0, 1.4, 0);
  {                                                                    // sol sous les pieds : carrelage clair qui se fond dans le décor + ombre de contact
    const tex = (dessin) => { const c = document.createElement('canvas'); c.width = c.height = 512; dessin(c.getContext('2d')); const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return tx; };
    const sol = tex((g) => {
      g.fillStyle = '#d9d4cb'; g.fillRect(0, 0, 512, 512); g.strokeStyle = 'rgba(120,110,95,0.35)'; g.lineWidth = 2;
      for (let i = 0; i <= 512; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 512); g.moveTo(0, i); g.lineTo(512, i); g.stroke(); }
      const r = g.createRadialGradient(256, 256, 60, 256, 256, 256); r.addColorStop(0, 'rgba(0,0,0,0)'); r.addColorStop(1, 'rgba(0,0,0,1)');
      g.globalCompositeOperation = 'destination-out'; g.fillStyle = r; g.fillRect(0, 0, 512, 512);
    });
    const ombre = tex((g) => { const r = g.createRadialGradient(256, 256, 0, 256, 256, 256); r.addColorStop(0, 'rgba(0,0,0,0.55)'); r.addColorStop(0.5, 'rgba(0,0,0,0.25)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, 512, 512); });
    const y0 = new THREE.Box3().setFromObject(gltf.scene).min.y;
    const plan = (taille, map, y, ordre) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(taille, taille), new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, toneMapped: false })); m.rotation.x = -Math.PI / 2; m.position.y = y; m.renderOrder = ordre; m.name = 'Sol'; scene.add(m); return m; };
    API_SOL = [plan(3.2, sol, y0 - 0.002, -2), plan(0.75, ombre, y0 - 0.001, -1)];
  }
  const API = { sol: API_SOL, names, manual: {}, rig, scene, camera, controls, THREE, emotion: 'neutre', gesture: null, D, profil: '', muted: false, rate: 1, voiceIndex: 0, speaking: false, extras: [] };
  function view(kind = o.view) {
    const h = rig.local('Head'), face = kind === 'visage';                // position de la tête debout (indépendante d'une transition en cours)
    look.set(h.x, h.y - (face ? 0.02 : 0.3), h.z); camera.position.set(h.x, h.y + (face ? 0.02 : -0.08), h.z + (face ? 0.8 : 2.1));
    if (controls) { controls.target.copy(look); controls.update(); } else camera.lookAt(look);
  }
  view();
  /* décor de la pharmacie : la photo de fond suit la caméra comme un mur situé 3 m derrière le patient
     (parallaxe : regarder les pieds fait voir le bas de la photo, s'approcher l'agrandit) */
  const DECOR = { a: 1.5, ok: false, x0: look.x, y0: look.y, cle: '' };
  if (o.background) { const im = new Image(); im.onload = () => { DECOR.a = im.naturalWidth / im.naturalHeight; DECOR.ok = true; }; im.src = o.background; }
  const _fv = V3(0, 0, 0), _fp = V3(0, 0, 0), RECUL = 3, TAN = Math.tan(camera.fov * Math.PI / 360);
  function suivreFond() {
    if (!DECOR.ok || API.base === 'lit') return;
    const w = el.clientWidth, h = el.clientHeight; if (!w || !h) return;
    const hz = DECOR.hz ?? (DECOR.hz = rig.local('Head').z), d = Math.max(0.3, camera.position.z - hz);   // profondeur du patient figée : le fond ne suit plus le balancement (impression de caméra qui tremble)
    camera.getWorldDirection(_fv); _fp.copy(camera.position).addScaledVector(_fv, d / Math.max(0.2, -_fv.z));   // point visé dans le plan du patient
    const s = 1.5 * (2.1 + RECUL) / (d + RECUL);
    let bw, bh; if (w / h > DECOR.a) { bw = w; bh = w / DECOR.a; } else { bh = h; bw = h * DECOR.a; } bw *= s; bh *= s;
    const vis = 2 * (d + RECUL) * TAN, k = h / vis * (d / (d + RECUL)) * 1.6;   // décalage apparent du mur (plus lent que le patient)
    const x = Math.min(0, Math.max(w - bw, (w - bw) / 2 - (_fp.x - DECOR.x0) * k)), y = Math.min(0, Math.max(h - bh, (h - bh) / 2 + (_fp.y - DECOR.y0) * k));
    const cle = `${bw | 0} ${bh | 0} ${x | 0} ${y | 0}`;
    if (cle !== DECOR.cle) { DECOR.cle = cle; el.style.backgroundSize = `${bw | 0}px ${bh | 0}px`; el.style.backgroundPosition = `${x | 0}px ${y | 0}px`; }
  }
  // --- voix du navigateur (voix Windows) ---
  let voices = [], VQ = [], charPos = 0, cps = 14, lastB = null, ext = null;   // ext : lecture en cours par une voix locale (voix-locale.js)
  const hasTTS = typeof speechSynthesis !== 'undefined';
  const loadVoices = () => { if (!hasTTS) return; const all = speechSynthesis.getVoices(); voices = all.filter((v) => v.lang.toLowerCase().startsWith('fr')); if (!voices.length) voices = all; API.voices = voices; API.onvoices && API.onvoices(voices); };
  if (hasTTS) { speechSynthesis.onvoiceschanged = loadVoices; loadVoices(); }
  let touchState = null;
  API.touch = (part, side = 'Right', sec = 2.4) => { touchState = TOUCH[part] ? { part, side, dur: Math.min(sec, 2.6), t0: performance.now() / 1000, until: null } : null; };   // geste bref, au début de la parole
  API.say = (text, opt = {}) => new Promise((resolve) => {
    const brut = (text || '').trim(); if (!brut) return resolve();
    if (/touss|\btoux\b|\bkof\b|\*toux/i.test(brut)) API.tousser();
    const txt = brut.replace(/\*[^*\n]{1,300}\*/g, ' ').replace(/\*/g, '').replace(/\s{2,}/g, ' ').replace(/\s+([,.!?…])/g, '$1').trim();   // didascalies *soupire* : jouées, pas lues
    if (opt.emotion) API.emotion = opt.emotion; API._relance = true; API._phrase = (API._phrase || 0) + 1;
    if (!txt) return resolve();
    VQ = visemes(txt); charPos = 0; cps = 14 * API.rate; lastB = null;
    const end = () => { API.speaking = false; resolve(); };
    const V = API.voixExterne;                                    // voix locale (Piper) : audio synthétisé dans la page, lèvres sur l'enveloppe du son
    if (V && !API.muted && V.active()) {
      if (hasTTS) speechSynthesis.cancel(); if (ext) ext.stop();
      API.speaking = false; const e = ext = V.parler(txt, { sexe: API.voixSexe, vitesse: API.rate });   // bouche et gestes de parole : seulement quand le son part (voir boucle)
      e.fin.then(() => { API._echecsVoix = 0; if (ext === e) { ext = null; end(); } }, (err) => { console.warn('Voix locale indisponible, repli sur la voix du navigateur', err); if (ext === e) ext = null; API._echecsVoix = (API._echecsVoix || 0) + 1; if (API._echecsVoix >= 3 && V.desactiver) V.desactiver(); /* repli ponctuel ; voix locale coupée après 3 échecs */ API.speaking = false; API.say(txt).then(resolve); });
      return;
    }
    if (API.muted || !hasTTS) { API.speaking = true; setTimeout(end, Math.min(20000, txt.length / cps * 1000)); return; }   // sans voix : l'avatar parle quand même
    speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(txt); u.lang = 'fr-FR'; if (voices[API.voiceIndex]) u.voice = voices[API.voiceIndex]; u.rate = API.rate;
    u.onstart = () => { API.speaking = true; }; u.onend = u.onerror = end;
    u.onboundary = (e) => { const now = performance.now(); if (lastB && e.charIndex > lastB.i && now > lastB.t) cps = clamp((e.charIndex - lastB.i) / ((now - lastB.t) / 1000), 5, 40); charPos = e.charIndex; lastB = { i: e.charIndex, t: now }; };
    speechSynthesis.speak(u);
  });
  API.stop = () => { if (hasTTS) speechSynthesis.cancel(); if (ext) { ext.stop(); ext = null; } API.speaking = false; touchState = null; };
  API.gestes = (url) => chargerGestes(url).catch((e) => { console.warn('Gestes capturés indisponibles :', e); return null; });
  API.jouer = (nom, o) => jouer(nom, o);
  API.tousser = () => { MC.toux = { t0: last || performance.now() / 1000 }; };
  API.view = view; API.canvas = canvas; API.root = gltf.scene; API.renderer = renderer; API.flip = () => { gltf.scene.rotation.y += Math.PI; }; API.resize = fit;
  API.dispose = () => { renderer.setAnimationLoop(null); ro.disconnect(); API.stop(); renderer.dispose(); canvas.remove(); };
  // --- prise de tension : patient assis, brassard sur le haut du bras gauche, tensiomètre au premier plan ---
  let T = null, seat = 0, lie = 0, hose = null, table = null, stool = null;
  /* scène courante : posture, bras imposés, caméra, table. Utilisée par la prise de tension et par les objets à placer (equip.js) */
  API.stage = { seat: 0, arms: null, cam: null, table: false };
  const camPos = V3(0, 0, 0), camLook = V3(0, 0, 0); let camInit = false;
  API.furniture = () => {                                               // table et tabouret, créés à la demande
    if (table) return;
    table = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.035, 0.62), new THREE.MeshStandardMaterial({ color: 0xc9b79a, roughness: 0.7 }));
    table.position.set(0, D.hipsY + 0.142, 0.5); gltf.scene.add(table);
    stool = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 32), new THREE.MeshStandardMaterial({ color: 0x4a4f57, roughness: 0.6 }));
    stool.position.set(0, D.hipsY - 0.08, -0.05); gltf.scene.add(stool); table.visible = stool.visible = false;
  };
  const SEATED = (D, s, o) => s === 'Left'
    ? { w: P(o, 0.2, D.hipsY + 0.19, 0.37), pole: P(o, 0.35, -1, -0.45), fing: V3(0, -0.05, 1), palm: V3(0, 1, 0), curl: 0.3, thumb: 0.1 }       // avant-bras posé sur la table, paume vers le haut
    : { w: P(o, 0.13, D.hipsY + 0.185, 0.36), pole: P(o, 0.6, -1, -0.3), fing: P(o, -0.4, -0.1, 1), palm: V3(0, -1, 0), curl: 0.3 };
  API.tension = async (vals = {}) => {                                  // entre dans la scène de mesure ; vals = { sys, dia, pul } du cas
    if (!T) {
      const { loadTensio } = await import('./tensio.js'); T = await loadTensio(o.tensio, o.draco);
      scene.add(camera); camera.add(T.box); T.box.scale.setScalar(0.16); T.box.rotation.set(0.05, -0.3, 0);
      scene.add(T.cuff);
      API.furniture();
      hose = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshStandardMaterial({ color: 0x5b6066, roughness: 0.5 })); scene.add(hose);
    }
    API.values = { sys: vals.sys ?? '', dia: vals.dia ?? '', pul: vals.pul ?? '' }; T.show({ sys: '', dia: '', pul: '', heart: false });
    T.box.visible = T.cuff.visible = hose.visible = true; API.stage = { seat: 1, arms: SEATED, cam: { pos: V3(0.55, 1.08, 1.45), look: V3(0.12, 0.93, 0.15) }, table: true }; API.posture = 'assis';
  };
  API.mesurer = async () => { if (!T || !T.cuff.visible) return null; const v = API.values || {}; return T.measure(v, (ph, p) => { T.cuff.userData.inflate = ph === 'fin' ? 0 : p; }); };
  API.quitterTension = () => { API.debout(); if (T) T.box.visible = T.cuff.visible = hose.visible = false; };
  /* ---------- chambre d'hôpital : patient allongé sur le lit ---------- */
  let lit = null, sol = null, bg0 = null;
  async function chargerLit(url) {
    const g = (await new GLTFLoader().setDRACOLoader(new DRACOLoader().setDecoderPath(o.draco || 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/draco/')).loadAsync(url)).scene;
    let b = new THREE.Box3().setFromObject(g), sz = b.getSize(V3(0, 0, 0));
    if (sz.x > sz.z) { g.rotation.y = Math.PI / 2; g.updateMatrixWorld(true); b = new THREE.Box3().setFromObject(g); sz = b.getSize(V3(0, 0, 0)); }   // longueur du lit selon z
    g.rotation.y += Math.PI; g.updateMatrixWorld(true);                 // oreiller côté tête (vers -z)
    const k = 2.1 / sz.z, w = new THREE.Group(); w.add(g); w.scale.setScalar(k); w.updateMatrixWorld(true); b = new THREE.Box3().setFromObject(w);
    const c = b.getCenter(V3(0, 0, 0)); w.position.set(-c.x, -b.min.y, -0.82 - c.z); w.updateMatrixWorld(true);
    const ray = new THREE.Raycaster(V3(0, 3, -0.82), V3(0, -1, 0)), hit = ray.intersectObject(w, true)[0];   // dessus du matelas
    w.userData.matelas = hit ? hit.point.y : 0.6;
    w.traverse((m) => { if (m.isMesh) m.frustumCulled = false; }); scene.add(w); return w;
  }
  API.alite = async (on = true, url = o.lit || 'avatar/lit_hopital.glb') => {
    if (on && !lit) { try { lit = await chargerLit(url); } catch (e) { console.warn('lit', e); return false; } }
    if (!sol) { sol = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.MeshStandardMaterial({ color: 0xd7dcd9, roughness: 0.9 })); sol.rotation.x = -Math.PI / 2; sol.position.y = 0.001; scene.add(sol); }
    if (lit) lit.visible = on; sol.visible = on;
    if (bg0 === null) bg0 = el.style.background;
    el.style.background = on ? 'linear-gradient(#eef2f1 0%, #e1e8e6 62%, #c9d1cf 62.2%, #d7dcd9 100%)' : bg0; DECOR.cle = '';   // mur et sol de chambre
    API.base = on ? 'lit' : null; API.debout(); return true;
  };
  /* ---------- patient en fauteuil roulant (cas qui le décrivent) : assis dans le fauteuil au lieu de debout ---------- */
  let fauteuil = null, fdrop = 0.43;
  const surCuisses = (D_, s_, o_) => ({ w: P(o_, 0.14, D_.hipsY + 0.07, 0.28), pole: P(o_, 0.6, -0.4, -0.6), fing: V3(0, -0.3, 1), palm: V3(0, -1, 0), curl: 0.3 });   // mains posées sur les cuisses
  API.fauteuil = async (on = true, url = 'avatar/equip/fauteuil_roulant.glb') => {
    if (on && !fauteuil) {
      try { const g = (await new GLTFLoader().setDRACOLoader(new DRACOLoader().setDecoderPath(o.draco || 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/draco/')).loadAsync(url)).scene;
        g.updateMatrixWorld(true); const hit = new THREE.Raycaster(V3(0, 2, 0.04), V3(0, -1, 0)).intersectObject(g, true)[0], sy = hit ? hit.point.y : 0.5;   // dessus du siège
        fauteuil = new THREE.Group(); fauteuil.add(g); fauteuil.position.set(0, 0, -0.06); fauteuil.userData.siege = sy; scene.add(fauteuil);
        fauteuil.traverse((m) => { if (m.isMesh) m.frustumCulled = false; });
      } catch (e) { console.warn('fauteuil', e); return false; }
    }
    if (fauteuil) { fauteuil.visible = false; fdrop = D.hipsY - 0.055 - fauteuil.userData.siege; }
    if (on) API.base = 'fauteuil'; else if (API.base === 'fauteuil') API.base = null;
    API.debout(); return true;
  };
  API.debout = () => {                                                  // retour debout : la caméra glisse vers le cadrage « buste » de la position debout
    if (API.base === 'lit' && lit) {                                     // ou retour au lit
      const y = lit.userData.matelas + 0.01 - (D.zb(D.chestY) || -0.1);
      API.stage = { seat: 0, lie: 1, bedY: y, headPitch: 0.3, headLock: true, arms: (D_, s_, o_) => ({ ...hang(D_, o_), w: P(o_, D_.hx(D_.hipsY) + 0.08, D_.hipsY + 0.02, D_.zb(D_.hipsY) + 0.06), pole: P(o_, 1, 0, 0.15), fing: V3(0, -1, 0), palm: V3(0, 0, -1), curl: 0.25 }),   // bras posés sur le matelas
        cam: { pos: V3(1.15, y + 0.85, -0.25), look: V3(0, y + 0.1, -1.2) } };
      API.posture = 'couche'; return;
    }
    if (API.base === 'fauteuil' && fauteuil) {                           // ou retour dans le fauteuil roulant
      const h = rig.local('Head');
      API.stage = { seat: 1, drop: fdrop, knee: 1.5, arms: surCuisses, table: false, cam: { pos: V3(h.x, h.y - fdrop - 0.12, h.z + 2.2), look: V3(h.x, h.y - fdrop - 0.38, h.z) } };
      API.posture = 'fauteuil'; return;
    }
    const h = rig.local('Head'), face = o.view === 'visage';
    API.stage = { seat: 0, arms: null, table: false, cam: { pos: V3(h.x, h.y + (face ? 0.02 : -0.08), h.z + (face ? 0.8 : 2.1)), look: V3(h.x, h.y - (face ? 0.02 : 0.3), h.z) } };
    API.posture = 'debout'; setTimeout(() => { if (API.posture === 'debout' && !API.stage.seat) { API.stage.cam = null; camInit = false; view(); } }, 2500);
  };
  function placeCuff() {
    const A = rig.bones.LeftArm.getWorldPosition(V3(0, 0, 0)), E = rig.bones.LeftForeArm.getWorldPosition(V3(0, 0, 0)), ax = A.clone().sub(E).normalize();
    const front = V3(0, -0.4, 1).transformDirection(gltf.scene.matrixWorld); front.sub(ax.clone().multiplyScalar(front.dot(ax))).normalize();   // prise du tuyau vers l'avant et le bas
    T.cuff.position.copy(E.clone().lerp(A, 0.56)); T.cuff.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(ax.clone().cross(front.clone().negate()), ax, front.clone().negate()));
    const inf = 1 + 0.07 * (T.cuff.userData.inflate || 0), s0 = rig.armR * 0.84 / T.cuffRadius; T.cuff.scale.set(s0 * inf, 0.135 / 0.564, s0 * inf);   // brassard de 13,5 cm de haut
    const dd = 0.6, hh = dd * Math.tan(camera.fov * Math.PI / 360), hw = hh * camera.aspect, k = Math.min(1, hw * 0.55 / 0.16, hh * 0.5 / 0.16); T.box.scale.setScalar(0.16 * k); T.box.rotation.set(0.05, 0.3, 0); T.box.position.set(-hw + 0.09 * k, -hh + 0.085 * k, -dd);   // tensiomètre petit, coin inférieur gauche : le bras brassardé (à droite de l'écran) reste visible
    T.cuff.updateMatrixWorld(true); camera.updateMatrixWorld(true);
    const p0 = T.cuff.localToWorld(T.cuffPort.clone()), p3 = T.box.children[0].localToWorld(T.boxPort.clone()), mid = p0.clone().lerp(p3, 0.5);
    const curve = new THREE.CatmullRomCurve3([p0, p0.clone().add(front.clone().multiplyScalar(0.05)).add(V3(0, -0.04, 0)), V3(mid.x, Math.min(p0.y, p3.y) - 0.08, mid.z), p3]);
    hose.geometry.dispose(); hose.geometry = new THREE.TubeGeometry(curve, 48, 0.0035, 8, false);
  }
  // --- animation ---
  const st = { Left: null, Right: null }, emoW = {}, cur = {}, AX = { x: V3(1, 0, 0), y: V3(0, 1, 0), z: V3(0, 0, 1) };
  /* ---------- capture de mouvement : animations Mixamo reciblées sur le patient ----------
     gestes.json/.bin : pour chaque os et chaque image, rotation « delta » dans le monde (pose animée × repos⁻¹, Y-haut).
     Reciblage : rotation du patient = delta × sa rotation de repos (les deux squelettes sont en T au repos).
     La couche donne la pose de fond (attente, parole, réactions) ; les gestes précis (toucher une zone, objets,
     tension, assis, allongé) restent calculés par IK et prennent la main bras par bras. */
  const MC = { clips: null, w: 0, amp: 0.3, bras: { Left: 0, Right: 0 }, cour: null, prec: null, fondu: 1, react: null, toux: null };
  {
    for (const k in rig.bones) rig.bones[k].quaternion.copy(rig.tpose[k]);
    gltf.scene.updateMatrixWorld(true);
    const rq = gltf.scene.getWorldQuaternion(new THREE.Quaternion()).invert();
    MC.W0 = {}; MC.par = {}; MC.PQ0 = {};
    for (const k in rig.bones) {
      const b = rig.bones[k]; MC.W0[k] = rq.clone().multiply(b.getWorldQuaternion(new THREE.Quaternion()));
      const pk = Object.keys(rig.bones).find((n) => rig.bones[n] === b.parent); MC.par[k] = pk || null;
      if (!pk) MC.PQ0[k] = rq.clone().multiply(b.parent.getWorldQuaternion(new THREE.Quaternion()));
    }
    const prof = (k) => { let d = 0, b = rig.bones[k]; while (b.parent && b.parent.isBone) { d++; b = b.parent; } return d; };
    MC.ordre = Object.keys(rig.bones).sort((a, b) => prof(a) - prof(b));
    const H = rig.bones.Hips; MC.hips0 = H.position.clone();
    const sol = new THREE.Box3().setFromObject(gltf.scene).min.y, hy = gltf.scene.worldToLocal(H.getWorldPosition(V3(0, 0, 0))).y;
    MC.hH = hy - gltf.scene.worldToLocal(V3(0, sol, 0)).y;
    MC.parInv = new THREE.Matrix4().copy(gltf.scene.matrixWorld).invert().multiply(H.parent.matrixWorld).invert();   // repère du patient -> repère du parent du bassin
    const sInv = new THREE.Matrix4().copy(gltf.scene.matrixWorld).invert();
    MC.M0i = { Hips: sInv.clone().multiply(H.matrixWorld).invert(), Spine2: sInv.clone().multiply(rig.bones.Spine2.matrixWorld).invert() };
  }
  const _mH = new THREE.Matrix4(), _mS = new THREE.Matrix4(), _sInv = new THREE.Matrix4(), _qH = new THREE.Quaternion(), _qS = new THREE.Quaternion(), _qT = new THREE.Quaternion(), _p1 = V3(0, 0, 0), _p2 = V3(0, 0, 0);
  function suivreCorps(spec, D) {                     // cibles des mains calculées au repos -> suivent le bassin (bas) et le haut du tronc (haut)
    const a = lisse(D.hipsY, D.chestY, spec.w ? spec.w.y : D.hipsY);
    const move = (v) => { _p1.copy(v).applyMatrix4(_mH); _p2.copy(v).applyMatrix4(_mS); return v.copy(_p1.lerp(_p2, a)); };
    const turn = (v) => { _qT.copy(_qH).slerp(_qS, a); return v.applyQuaternion(_qT); };
    if (spec.w) move(spec.w); if (spec.c) move(spec.c);
    for (const k of ['pole', 'fing', 'palm', 'n']) if (spec[k] && spec[k].isVector3) turn(spec[k]);
    return spec;
  }
  async function chargerGestes(url) {
    const [m, b] = await Promise.all([fetch(url + '.json').then((r) => r.json()), fetch(url + '.bin').then((r) => r.arrayBuffer())]);
    const C = {};
    for (const [n, c] of Object.entries(m.clips)) {
      const ix = {}; c.os.forEach((o, i) => { if (rig.bones[o]) ix[o] = i; });
      C[n] = { n, images: c.images, nb: c.os.length, ix, q: new Int16Array(b, c.q, c.images * c.os.length * 4), h: new Int16Array(b, c.h, c.images * 3) };
    }
    MC.clips = C; return C;
  }
  const _qa = new THREE.Quaternion(), _qb = new THREE.Quaternion();
  function deltaQ(c, j, fr, out) { const o = (fr * c.nb + j) * 4; return out.set(c.q[o] / 32767, c.q[o + 1] / 32767, c.q[o + 2] / 32767, c.q[o + 3] / 32767).normalize(); }
  function echantillon(c, tt, boucle, out) {          // out[k] = rotation locale du patient ; out._h = déplacement du bassin
    const x = boucle ? ((tt * 30) % c.images + c.images) % c.images : clamp(tt * 30, 0, c.images - 1.001), i0 = Math.floor(x), i1 = boucle ? (i0 + 1) % c.images : Math.min(i0 + 1, c.images - 1), f = x - i0;
    const Wd = {};
    for (const k of MC.ordre) {
      const j = c.ix[k]; if (j === undefined) continue;
      const d = deltaQ(c, j, i0, _qa).slerp(deltaQ(c, j, i1, _qb), f), Wt = d.clone().multiply(MC.W0[k]);
      const pk = MC.par[k], PW = pk ? (Wd[pk] || MC.W0[pk]) : MC.PQ0[k];
      out[k] = (out[k] || new THREE.Quaternion()).copy(PW).invert().multiply(Wt); Wd[k] = Wt;
    }
    const h0 = i0 * 3, h1 = i1 * 3, hv = (o) => (c.h[h0 + o] * (1 - f) + c.h[h1 + o] * f) / 8000;
    out._h = V3(hv(0), hv(1), hv(2)).multiplyScalar(MC.hH); out._W = Wd; return out;
  }
  function jouer(nom, o = {}) {                       // réaction ponctuelle (o.boucle : devient la pose de fond)
    if (!MC.clips || !MC.clips[nom]) return false;
    MC.react = { nom, t0: performance.now() / 1000, dur: MC.clips[nom].images / 30, fondu: o.fondu || 0.4 }; return true;
  }
  const PAROLE = ['Talking', 'Talking_1', 'Talking_2', 'Talking_3'];
  const REACTION = { surprise: 'Reacting', joie: 'Thankful', doute: 'Thinking', gene: 'Shrugging' };
  const FOND = { fatigue: 'Dizzy_Idle', douleur: 'Dizzy_Idle' };
  const MC_OS_BRAS = (s) => [s + 'Shoulder', s + 'Arm', s + 'ForeArm', s + 'Hand', ...Object.keys(rig.bones).filter((k) => k.startsWith(s + 'Hand') && k !== s + 'Hand')];
  const MC_TRONC = ['Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head', 'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'LeftToeBase', 'RightUpLeg', 'RightLeg', 'RightFoot', 'RightToeBase'];
  const poseA = {}, poseB = {}, poseR = {}, poseT = {};
  let nextBlink = 1.5, blinkT = -9, last = 0, sacc = [0, 0], nextSacc = 2, headS = [0, 0, 0], eT0 = 0, ePrev = null, gPrev = null, gT0 = 0;
  /* les émotions fortes sont des réactions : le geste dure quelques secondes puis le patient revient à une attitude d'attente,
     et le visage garde une version atténuée de l'émotion */
  const BREF = { surprise: 2.2, protege: 3.5, poings: 3, ouvert: 2.5, reflexion: 4, heure: 3, ventre: 5, explique: 99 };
  const CALME = { anxieux: 'jointes', peur: 'jointes', gene: 'jointes', doute: 'jointes' };
  const VIF = { surprise: [2.5, 0.25], peur: [4, 0.5], colere: [4, 0.45], douleur: [6, 0.6], anxieux: [5, 0.7], joie: [4, 0.55] };   // durée pleine, puis part gardée
  const lisse = (a, b, x) => { const u = clamp((x - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); };
  renderer.setAnimationLoop((ms) => {
    const t = ms / 1000, dt = Math.min(0.1, t - last || 0.016); last = t; const E = EMOTIONS[API.emotion] || EMOTIONS.neutre, neg = NEG.has(API.emotion);
    if (API.emotion !== ePrev || API._relance) { ePrev = API.emotion; eT0 = t; gT0 = t; API._relance = false; }
    const vif = VIF[API.emotion], fI = vif ? 1 - (1 - vif[1]) * lisse(vif[0], vif[0] + 1.5, t - eT0) : 1;
    if (ext && !API.speaking && (!ext.demarre || ext.demarre())) API.speaking = true;   // voix locale : la synthèse de la 1re phrase prend 0,3 à 2 s
    if (rig.body) {                                                                      // visage
      const tw = {}, add = (obj, kk = 1) => { for (const n in obj) tw[n] = (tw[n] || 0) + obj[n] * kk * (neg && n.startsWith('Smile_') ? 0.25 : 1); };
      if (API.speaking && ext) {                                        // voix locale : position réelle dans le texte, ouverture selon le volume
        charPos = ext.position() * VQ.length; const a = Math.min(1, 0.1 + 1.3 * ext.amp()), i = Math.floor(charPos), f = charPos - i;
        add(VIS[VQ[i] || '_'], (1 - f) * a); add(VIS[VQ[i + 1] || '_'], f * a);
      } else if (API.speaking) { charPos += cps * dt; const i = Math.floor(charPos), f = charPos - i; add(VIS[VQ[i] || '_'], 1 - f); add(VIS[VQ[i + 1] || '_'], f); if (i > VQ.length + 2) API.speaking = false; }
      for (const n of new Set([...Object.keys(E.face), ...Object.keys(emoW)])) emoW[n] = (emoW[n] || 0) + ((E.face[n] || 0) - (emoW[n] || 0)) * (1 - Math.exp(-dt * 6));
      for (const n in emoW) tw[n] = (tw[n] || 0) + emoW[n] * fI * (API.speaking && MOUTH.test(n) ? 0.45 : 1);
      if (API.boucheJaw && tw.Jaw_Down) { tw.BoucheOuverte = (tw.BoucheOuverte || 0) + tw.Jaw_Down * API.boucheJaw; tw.Jaw_Down *= 0.3; if (tw.MouthOpen) tw.MouthOpen *= 0.5; }   // patiente v5 : la vraie ouverture (lèvres, dents, langue) remplace le menton seul
      if (t > nextBlink) { blinkT = t; nextBlink = t + (2.5 + Math.random() * 3) / (E.blink || 1); }
      const x = (t - blinkT) / 0.18, bw = x >= 0 && x < 1 ? Math.sin(x * Math.PI) : 0;
      for (const n of names) {
        const m = API.manual[n], goal = m !== undefined && m > 0 ? m : (tw[n] || 0); cur[n] = (cur[n] || 0) + (goal - (cur[n] || 0)) * (1 - Math.exp(-dt * 22));
        let val = clamp(n.startsWith('Blink_') ? Math.max(cur[n], bw) : cur[n], 0, 1);
        if (API.asym && n.endsWith('_' + API.asym.side) && !/^Frown/.test(n) && !(API.asym.central && /^(Brows|Blink|Squint|EyesWide)/.test(n))) val *= 0.12;   // paralysie faciale : la moitié du visage ne bouge plus (le front reste mobile si l'atteinte est centrale)
        if (API.asym && n === 'Frown_' + API.asym.side) val = Math.max(val, 0.55);
        for (const mm of rig.morphs) { const ix = mm.morphTargetDictionary[n]; if (ix !== undefined) mm.morphTargetInfluences[ix] = val; }   // un visage à plusieurs matériaux = plusieurs maillages
      }
    }
    let g0 = API.gesture || E.gesture; if (g0 !== gPrev) { gPrev = g0; gT0 = t; }
    /* capture de mouvement : fond (attente / parole) + réaction en cours, fondus */
    let MP = null;
    {
      const SG0 = API.stage, debout = (SG0.seat || 0) < 0.05 && (SG0.lie || 0) < 0.05 && seat < 0.05 && lie < 0.05 && !SG0.arms && !SG0.noMocap && !API.mocapOff;
      MC.debout = debout; MC.w += ((MC.clips && debout ? 1 : 0) - MC.w) * (1 - Math.exp(-dt * (debout ? 2.5 : 6)));
      if (MC.clips && MC.w > 0.002) {
        if (t - eT0 < 0.05 && MC.relanceEmo !== eT0) { MC.relanceEmo = eT0; const r = REACTION[API.emotion]; if (r) jouer(r); }
        const fond = API.speaking ? (MC.parole && API._phrase === MC.phraseId ? MC.parole : (MC.phraseId = API._phrase, MC.parole = PAROLE[Math.floor(Math.random() * PAROLE.length)])) : (FOND[API.emotion] || 'Idle');
        if (!MC.cour || MC.cour.nom !== fond) { MC.prec = MC.cour; MC.cour = { nom: fond, t0: t }; MC.fondu = 0; }
        MC.fondu = Math.min(1, MC.fondu + dt / 0.6);
        const vit = (n) => (/Idle/.test(n) ? 0.6 : 1);                                   // attente : clip ralenti
        echantillon(MC.clips[MC.cour.nom], (t - MC.cour.t0) * vit(MC.cour.nom), true, poseA);
        if (MC.prec && MC.fondu < 1) { echantillon(MC.clips[MC.prec.nom], (t - MC.prec.t0) * vit(MC.prec.nom), true, poseB); for (const k in poseA) if (poseB[k] && k[0] !== '_') poseA[k].slerp(poseB[k], 1 - MC.fondu); poseA._h.lerp(poseB._h, 1 - MC.fondu); }
        if (API.speaking && API.emotion === 'colere') { echantillon(MC.clips.Standing_Arguing, t - MC.cour.t0, true, poseT); for (const k in poseA) if (poseT[k] && k[0] !== '_') poseA[k].slerp(poseT[k], 0.5); }   // colère : dispute atténuée de moitié
        let rw = 0;
        if (MC.react) {
          const R_ = MC.react, tt = Math.max(0, performance.now() / 1000 - R_.t0);
          if (tt > R_.dur) MC.react = null;
          else { rw = Math.min(1, tt / R_.fondu, (R_.dur - tt) / R_.fondu); echantillon(MC.clips[R_.nom], tt, false, poseR); for (const k in poseA) if (poseR[k] && k[0] !== '_') poseA[k].slerp(poseR[k], rw); poseA._h.lerp(poseR._h, rw); }
        }
        MP = poseA; MC.rw = rw;
      }
    }
    if (BREF[g0] && t - gT0 > BREF[g0] && !(API.speaking && g0 === API.gesture)) g0 = CALME[API.emotion] || 'repos';   // retour à l'attente
    const gn = API.speaking && g0 === 'repos' ? 'explique' : g0, k = 1 - Math.exp(-dt * (g0 === gPrev ? 5 : 2.5));   // tronc, tête, regard (retour au calme plus lent)
    rig.bones.Spine2.quaternion.copy(rig.tpose.Spine2);   // os sans réglage procédural : remis au repos à chaque image (sinon la toux s'accumule)
    rig.turn('Spine1', AX.x, Math.sin(t * 1.4) * 0.012); rig.turn('Spine', AX.z, Math.sin(t * 0.27) * 0.012);   // respiration, léger balancement
    const HL = API.stage.headLock ? 0.15 : 1, jit = HL * (E.jitter || 0) * Math.sin(t * 7), hp = (E.head || [0, 0, 0]).map((v) => v * HL);   // collier cervical : tête maintenue headS = headS.map((v, i) => v + (hp[i] - v) * k);
    rig.turn('Neck', AX.y, HL * Math.sin(t * 0.6) * 0.02 + jit + headS[1] * 0.5); rig.turn('Neck', AX.x, headS[0] * 0.5, true);
    rig.turn('Head', AX.x, HL * (Math.sin(t * 0.9) * 0.01 + (API.speaking ? Math.sin(t * 5.5) * 0.025 : 0)) + headS[0] * 0.5); rig.turn('Head', AX.y, headS[1] * 0.5, true); rig.turn('Head', AX.z, headS[2], true);
    if (API.stage.headPitch) { API._hp = (API._hp || 0) + (API.stage.headPitch - (API._hp || 0)) * k; } else API._hp = (API._hp || 0) * (1 - k);
    if (MP) {                                                                           // tronc et jambes : pose capturée ; les inclinaisons de tête de l'émotion s'ajoutent
      MC.amp += ((MC.rw > 0.05 ? 0.8 : API.speaking ? 0.5 : 0.3) - MC.amp) * (1 - Math.exp(-dt * 2));   // capture adoucie : attente 30 %, parole 50 % (v31 : le déhanché penchait trop)
      if (MC.debout && rig.tpose.Hips) rig.bones.Hips.quaternion.copy(rig.tpose.Hips);   // le bassin n'a pas de réglage procédural debout : sans remise au repos, le mélange convergeait vers 100 % de la pose capturée
      for (const k of MC_TRONC.slice(0, 6)) if (MP[k] && rig.bones[k]) rig.bones[k].quaternion.slerp(MP[k], MC.w * MC.amp);
      const hx = clamp(MP._h.x, -0.04, 0.04), hz = clamp(MP._h.z, -0.05, 0.05), hp_ = V3(0, 0, 0).applyMatrix4(MC.parInv), hv = V3(hx, MP._h.y, hz).applyMatrix4(MC.parInv).sub(hp_);
      rig.bones.Hips.position.copy(MC.hips0).addScaledVector(hv, MC.w * MC.amp);
      rig.turn('Head', AX.x, headS[0] * 0.5 * MC.w, true); rig.turn('Head', AX.y, headS[1] * 0.5 * MC.w, true); rig.turn('Head', AX.z, headS[2] * MC.w, true);
    } else if (rig.bones.Hips.position.distanceToSquared(MC.hips0) > 1e-12) rig.bones.Hips.position.copy(MC.hips0);
    if (MC.toux) {                                                                      // quinte de toux : mouvement relatif du haut du corps, quelle que soit la posture
      const tt = Math.max(0, t - MC.toux.t0), c = MC.clips && MC.clips.Laying_Severe_Cough;
      if (!c || tt > c.images / 30) MC.toux = null;
      else {
        const fr = Math.min(c.images - 1, Math.floor(tt * 30)), aw = Math.min(1, tt / 0.3, (c.images / 30 - tt) / 0.3), h0 = deltaQ(c, c.ix.Hips, 0, new THREE.Quaternion()), rq = gltf.scene.getWorldQuaternion(new THREE.Quaternion());
        const OS = ['Spine', 'Spine1', 'Spine2', 'Neck', 'Head'], avant = OS.map((k) => rig.bones[k].getWorldQuaternion(new THREE.Quaternion()));   // orientations avant la toux
        OS.forEach((k, n) => {
          const j = c.ix[k]; if (j === undefined) return;
          const dr = deltaQ(c, j, fr, new THREE.Quaternion()).multiply(deltaQ(c, j, 0, new THREE.Quaternion()).invert());      // relatif à la 1re image
          const dc = h0.clone().invert().multiply(dr).multiply(h0);                                                     // exprimé dans le repère du corps
          const dw = new THREE.Quaternion().slerp(dc, aw * (lie > 0.5 ? 0.32 : 0.28));   // le clip est une quinte allongée (le buste se redresse) : atténuée, surtout debout
          rig.setWorldQ(rig.bones[k], rq.clone().multiply(dw).multiply(rq.clone().invert()).multiply(avant[n]));         // orientation visée = delta complet × orientation d'origine
        });
      }
    }
    if (Math.abs(API._hp || 0) > 1e-3) { const hb = rig.bones.Head, ax = V3(1, 0, 0).transformDirection(gltf.scene.matrixWorld); rig.turn('Neck', ax, API._hp * 0.45, true); rig.root.updateMatrixWorld(true); rig.turn('Head', ax, API._hp * 0.55, true); }   // tête basculée (prélèvement nasal)
    if (t > nextSacc) { sacc = [(Math.random() - 0.5) * 0.12, (Math.random() - 0.5) * 0.08]; nextSacc = t + 1.5 + Math.random() * 2.5; }
    for (const e of ['LeftEye', 'RightEye']) { rig.turn(e, AX.y, sacc[0]); rig.turn(e, AX.x, sacc[1], true); }
    const SG = API.stage; seat += ((SG.seat || 0) - seat) * (1 - Math.exp(-dt * 4)); lie += ((SG.lie || 0) - lie) * (1 - Math.exp(-dt * 3));
    const enF = API.base === 'fauteuil' && fauteuil; if (fauteuil) fauteuil.visible = !!enF && seat > 0.5;
    gltf.scene.position.y = -(enF ? fdrop : SG.drop ?? 0.43) * seat + (SG.bedY ?? 0.15) * lie; gltf.scene.rotation.x = -Math.PI / 2 * lie;            // posture assise ; allongé sur le dos (réanimation)            // posture assise
    for (const s of ['Left', 'Right']) { rig.turn(s + 'UpLeg', AX.x, -1.45 * seat); rig.turn(s + 'Leg', AX.x, (SG.knee ?? 1.5) * seat); rig.turn(s + 'Foot', AX.x, (SG.ankle || 0) * seat); }
    if (MP) for (const k of MC_TRONC.slice(6)) if (MP[k] && rig.bones[k]) { if (MC.debout && rig.tpose[k]) rig.bones[k].quaternion.copy(rig.tpose[k]); rig.bones[k].quaternion.slerp(MP[k], MC.w * Math.min(1, MC.amp + 0.1)); }   // jambes capturées (debout seulement), même amplitude que le bassin
    if (table) { table.visible = !!SG.table && seat > 0.5; stool.visible = seat > 0.5 && !enF; }
    if (SG.cam) {                                                                        // caméra de la scène, avec transition douce
      if (!camInit) { camPos.copy(camera.position); camLook.copy(look); camInit = true; }
      const kc = 1 - Math.exp(-dt * 3); camPos.lerp(SG.cam.pos, kc); camLook.lerp(SG.cam.look, kc); camera.position.copy(camPos); camera.lookAt(camLook);
    }
    if (touchState && touchState.until === null && (API.speaking || t - touchState.t0 > 3)) touchState.until = t + touchState.dur;   // montre l'endroit quand la voix part
    if (touchState && touchState.until !== null && t > touchState.until) touchState = null;          // bras et mains
    rig.root.updateMatrixWorld(true); _sInv.copy(gltf.scene.matrixWorld).invert();
    _mH.copy(_sInv).multiply(rig.bones.Hips.matrixWorld).multiply(MC.M0i.Hips); _mS.copy(_sInv).multiply(rig.bones.Spine2.matrixWorld).multiply(MC.M0i.Spine2);
    _mH.decompose(_p1, _qH, _p2); _mS.decompose(_p1, _qS, _p2);
    const G = GESTURES[gn] || GESTURES.repos, tch = touchState && touchState.until !== null && TOUCH[touchState.part] ? touchState : null, th = tch ? TOUCH[tch.part](D, tch.side, rig.out[tch.side], rig).hand : null;
    for (const s of th === 'Left' ? ['Right', 'Left'] : ['Left', 'Right']) {             // la main qui touche est placée en dernier (elle peut viser l'autre bras)
      const raw = SG.arms && SG.arms(D, s, rig.out[s]) ? SG.arms(D, s, rig.out[s]) : s === th ? { ...TOUCH[tch.part](D, tch.side, rig.out[tch.side], rig) } : G(D, s, rig.out[s]), spec = resolveSpec(raw);
      if (MP && !SG.arms && !(s === th && tch.part === 'bras')) suivreCorps(spec, D);   // 'bras' vise déjà l'os animé
      if (!spec.fing) { spec.fing = V3(0, -1, 0); spec.palm = V3(-rig.out[s], 0, 0); }
      if (!st[s]) st[s] = { w: spec.w.clone(), pole: spec.pole.clone(), fing: spec.fing.clone(), palm: spec.palm.clone(), curl: spec.curl || 0, thumb: spec.thumb || 0, shrug: spec.shrug || 0, suit: spec.suit || 0 };
      const q = st[s], kk = s === th ? 1 - Math.exp(-dt * 7) : k; q.w.lerp(spec.w, kk); q.pole.lerp(spec.pole, kk); q.fing.lerp(spec.fing, kk).normalize(); q.palm.lerp(spec.palm, kk).normalize();
      for (const key of ['curl', 'thumb', 'shrug', 'suit']) q[key] = (q[key] || 0) + ((spec[key] || 0) - (q[key] || 0)) * kk;
      const beat = API.speaking && s === 'Right' && gn === 'explique' && s !== th ? Math.sin(t * 4) : 0, w = q.w.clone(); w.y += beat * 0.03; w.z += beat * 0.015;
      q.plat = !!spec.plat; rig.souple = !!raw.c; rig.reach(s, w, q.pole, q.shrug, q.fing, q.palm, q.suit, q.plat);
      {                                                                                  // le coude ne rentre pas dans le tronc : sinon on l'écarte (vers l'extérieur et l'avant) et on refait l'IK
        rig.root.updateMatrixWorld(true); const el = rig.local(s + 'ForeArm');
        if (el.y > D.hipsY - 0.12 && el.y < D.shoulderY + 0.02 && D.hx(el.y) > 0.05) {
          const rx = D.hx(el.y) + 0.04, zf = D.zf(el.y) + 0.04, zb = D.zb(el.y) - 0.02, zc = (zf + zb) / 2, rz = Math.max((zf - zb) / 2, 0.06), u = el.x / rx, v = (el.z - zc) / rz, r = Math.hypot(u, v);
          if (r < 1) {
            const dir = V3(u / rx, 0, Math.max(v, 0.2) / rz).normalize(), pole2 = q.pole.clone().normalize().addScaledVector(dir, 1.5 + 3 * (1 - r)).normalize();
            rig.reach(s, w, pole2, q.shrug, q.fing, q.palm, q.suit, q.plat); q.pole.lerp(pole2, 0.1);
          }
        }
      } rig.curl(s, q.curl, q.thumb);
      if (MP) {                                                                          // bras libre (attente, parole, réaction) : il suit la capture
        const libre = !SG.arms && s !== th && ((gn === 'explique' && API.speaking) || MC.rw > 0.3 || (BREF[gn] && REACTION[API.emotion]));
        MC.bras[s] += ((libre ? 1 : 0) - MC.bras[s]) * (1 - Math.exp(-dt * 4)); const bw_ = MC.bras[s] * MC.w;
        if (bw_ > 0.002) for (const k of MC_OS_BRAS(s)) if (MP[k] && rig.bones[k]) rig.bones[k].quaternion.slerp(MP[k], bw_);
      } else MC.bras[s] = 0;
    }
    if (Number.isNaN(rig.bones.Spine2.quaternion.w) || Number.isNaN(rig.bones.Hips.position.y)) { for (const k in rig.bones) rig.bones[k].quaternion.copy(rig.tpose[k]); rig.bones.Hips.position.copy(MC.hips0); for (const s in st) st[s] = null; console.warn('pose invalide : remise au repos'); }   // garde-fou
    if (T && T.cuff.visible) placeCuff();
    for (const fn of API.extras) fn(t, dt);
    if (controls) controls.update(); if (API._camTest) { camera.position.copy(API._camTest.pos); camera.lookAt(API._camTest.look); }   // essais : caméra imposée
    suivreFond(); renderer.render(scene, camera);
  });
  /* ---------- tenue, matériel porté, mastectomie, lésions de peau ---------- */
  renderer.localClippingEnabled = true;
  const byName = (n) => gltf.scene.getObjectByName(n);
  const MED = ['BasContention', 'CeintureLombaire', 'Corset', 'SoutienGorgeMastectomie', 'ProtheseMammaire_G', 'ProtheseMammaire_D'];
  API.femme = !!byName('SoutienGorge'); API.corps = !!byName('CorpsHaut');
  API.boucheJaw = names.includes('BoucheOuverte') && !byName('Tete') ? 0.6 : 0;
  gltf.scene.traverse((m) => { if (m.isMesh) for (const mt of [].concat(m.material)) if (/^Tissu_Bas/.test(mt.name)) { mt.roughness = 1; mt.metalness = 0; if ('specularIntensity' in mt) mt.specularIntensity = 0.15; } });   // bas en tricot : mat
  if (API.boucheJaw) gltf.scene.traverse((m) => { if (m.isMesh) for (const mt of [].concat(m.material)) if (mt.name === 'Bouche') mt.color.setScalar(0.82); });   // dents un peu moins blanches   // v37 : intérieur de bouche refait (cavité sombre), la parole ouvre vraiment la bouche
  if (API.corps) for (const n of ['Body', 'CorpsHaut']) { const o = byName(n); if (o) o.traverse((m) => { if (m.isMesh) for (const mt of [].concat(m.material)) mt.side = THREE.DoubleSide; }); }   // bord coupé de l'avant-bras sous la manche : l'intérieur rend couleur peau (plus de dents sombres)   // patient homme v31 : corps complet sous les vêtements
  {                                                                      // culotte de la couleur du soutien-gorge (bleue comme le pantalon, elle passait pour un reste de pantalon)
    const mats = (n) => { const r = []; const o_ = byName(n); if (o_) o_.traverse((m) => { if (m.isMesh) r.push(m); }); return r; };
    const sg = mats('SoutienGorge')[0];
    if (sg) for (const m of mats('Culotte')) { const mt = [].concat(m.material)[0]; if (mt && !mt.map) { m.material = mt.clone(); m.material.color.copy([].concat(sg.material)[0].color); } }
  }
  API.tenue = { jambes: false, buste: false, poitrine: false }; API.porte = new Set();
  const show = (n, v) => { const o = byName(n); if (o) o.visible = v; };
  function applyTenue() {                                                // une seule source de vérité pour ce qui est visible
    const t = API.tenue, haut = t.buste || t.poitrine, eqHide = API._eqHide || [];
    for (const m of rig.meshes) m.visible = !eqHide.some((h) => m.name.toLowerCase().includes(h.toLowerCase()));
    const hide = (n) => { const o = byName(n); if (o) o.visible = false; }, unhide = (n) => { const o = byName(n); if (o) { o.visible = true; o.traverse((c) => { if (c.isMesh) c.visible = true; }); } };
    if (API.femme || API.corps) {
      if (t.jambes) { hide('Pants'); hide('Shoes'); }
      if (haut) hide('Shirt');
      if (API.femme && (t.poitrine || API.porte.has('SoutienGorgeMastectomie'))) hide('SoutienGorge');
      if (API.corps) { if (!haut) hide('CorpsHaut'); if (!t.jambes) hide('CorpsBas'); }
      if (API.femme) { const vu = (n) => { const o = byName(n); return !!o && o.visible; };   // sous-vêtements cachés sous un vêtement opaque (ils traversaient le jean / le t-shirt par endroits)
        if (vu('Pants')) hide('Culotte'); if (vu('Shirt') && !API.manches) hide('SoutienGorge'); }   // corps du patient : seulement la partie découverte (pas de peau qui traverse les vêtements)
    }
    if (haut) hide('Sweatshirt');                                            // patient homme : pas de peau sous le tee-shirt, seul le sweat se retire
    for (const n of MED) API.porte.has(n) ? unhide(n) : hide(n);
    if (API._lesionsTenue) API._lesionsTenue(t, API.femme);
  }
  /* patient homme : pas de peau sous le sweat ni sous le débardeur. On fabrique, une fois, des bras (depuis les manches du sweat) et un torse (depuis le débardeur),
     resserrés vers le corps et couleur peau, montrés quand le vêtement est retiré. */
  const PEAU_H = API.femme || API.corps ? null : (() => {
    const sweat = byName('Sweatshirt'), shirt = byName('Shirt'), body0 = rig.body || rig.meshes[0];
    const meshOf = (o) => { let m = null; if (o) o.traverse((c) => { if (!m && c.isSkinnedMesh) m = c; }); return m; };
    const sw = meshOf(sweat), sh = meshOf(shirt); if (!sw || !body0) return null;
    const mat = new THREE.MeshStandardMaterial({ color: 0xc28a68, roughness: 0.62 });
    const boneMesh0 = (m, n) => { const i = m.skeleton.bones.indexOf(rig.bones[n]); if (i < 0) return null; const M = m.bindMatrixInverse.clone().multiply(m.skeleton.boneInverses[i].clone().invert()); return new THREE.Vector3().setFromMatrixPosition(M); };
    /* manches du sweat : au-delà du coude, la manche suit l'avant-bras (les poids d'origine la gardaient sur le bras :
       coude très plié = manche écrasée et avant-bras nu qui sort du tronc) */
    const GET = [(a, i) => a.getX(i), (a, i) => a.getY(i), (a, i) => a.getZ(i), (a, i) => a.getW(i)];
    for (const m of [sw]) {
      const si = m.geometry.attributes.skinIndex, swt = m.geometry.attributes.skinWeight, pos = m.geometry.attributes.position, B = m.skeleton.bones;
      for (const s of ['Left', 'Right']) {
        const iA = B.indexOf(rig.bones[s + 'Arm']), iF = B.indexOf(rig.bones[s + 'ForeArm']), e = boneMesh0(m, s + 'ForeArm'), a0 = boneMesh0(m, s + 'Arm'), h = boneMesh0(m, s + 'Hand');
        if (iA < 0 || iF < 0 || !e || !a0 || !h) continue;
        const ax = h.clone().sub(a0).normalize(), te = e.clone().sub(a0).dot(ax), v = new THREE.Vector3();
        for (let i = 0; i < pos.count; i++) {
          v.fromBufferAttribute(pos, i); const d = v.clone().sub(a0), tt = d.dot(ax); if (d.clone().addScaledVector(ax, -tt).length() > 0.12) continue;   // hors de la manche
          const f = clamp((tt - te + 0.035) / 0.07, 0, 1); if (f <= 0) continue;
          let wA = 0, wF = 0; const keep = [];
          for (let k = 0; k < 4; k++) { const b = GET[k](si, i), w = GET[k](swt, i); if (b === iA) wA += w; else if (b === iF) wF += w; else if (w > 0) keep.push([b, w]); }
          const mv = wA * f; wA -= mv; wF += mv; const L = [[iA, wA], [iF, wF], ...keep].filter((x) => x[1] > 1e-4).sort((p, q) => q[1] - p[1]).slice(0, 4), S = L.reduce((p, x) => p + x[1], 0) || 1;
          const c = [0, 1, 2, 3].map((k) => L[k] || [0, 0]); si.setXYZW(i, c[0][0], c[1][0], c[2][0], c[3][0]); swt.setXYZW(i, c[0][1] / S, c[1][1] / S, c[2][1] / S, c[3][1] / S);
        }
      }
      for (const a of [si, swt]) { if (a.isInterleavedBufferAttribute) a.data.needsUpdate = true; else a.needsUpdate = true; }
    }
    const boneMesh = (m, n) => { const i = m.skeleton.bones.indexOf(rig.bones[n]); if (i < 0) return null; const M = m.bindMatrixInverse.clone().multiply(m.skeleton.boneInverses[i].clone().invert()); return new THREE.Vector3().setFromMatrixPosition(M); };
    function peau(src, garde, retrait) {                     // copie filtrée d'un vêtement : mêmes os et poids, sommets rentrés le long des normales
      const g = src.geometry, P = g.attributes.position, Nn = g.attributes.normal, idx = g.index ? g.index.array : [...Array(P.count).keys()], keep = [];
      for (let t = 0; t < idx.length; t += 3) { const a = idx[t], b = idx[t + 1], c = idx[t + 2]; if (garde(a) && garde(b) && garde(c)) keep.push(a, b, c); }
      const ng = g.clone(); ng.morphAttributes = {}; const pos = ng.attributes.position;
      // sommets soudés par position (coutures), composantes connexes : on écarte les petits morceaux (bords déchiquetés)
      const key = new Map(), wid = new Int32Array(pos.count); for (let i = 0; i < pos.count; i++) { const k = Math.round(pos.getX(i) * 2000) + ',' + Math.round(pos.getY(i) * 2000) + ',' + Math.round(pos.getZ(i) * 2000); if (!key.has(k)) key.set(k, key.size); wid[i] = key.get(k); }
      const par = new Int32Array(key.size).map((_, i) => i), f = (u) => { while (par[u] !== u) u = par[u] = par[par[u]]; return u; };
      for (let t = 0; t < keep.length; t += 3) { const a = f(wid[keep[t]]), b = f(wid[keep[t + 1]]), c = f(wid[keep[t + 2]]); par[b] = a; par[f(c)] = a; }
      const nb = new Map(); for (let t = 0; t < keep.length; t += 3) { const r = f(wid[keep[t]]); nb.set(r, (nb.get(r) || 0) + 1); }
      const keep2 = []; for (let t = 0; t < keep.length; t += 3) if (nb.get(f(wid[keep[t]])) > 200) keep2.push(keep[t], keep[t + 1], keep[t + 2]);
      ng.setIndex(keep2);
      // lissage (les plis du tissu disparaissent), puis retrait vers le corps
      const W = key.size, acc = new Float32Array(W * 3), cnt = new Float32Array(W), Pw = new Float32Array(W * 3);
      for (let i = 0; i < pos.count; i++) { Pw[wid[i] * 3] = pos.getX(i); Pw[wid[i] * 3 + 1] = pos.getY(i); Pw[wid[i] * 3 + 2] = pos.getZ(i); }
      const edges = []; for (let t = 0; t < keep2.length; t += 3) for (const [u, v_] of [[0, 1], [1, 2], [2, 0]]) edges.push(wid[keep2[t + u]], wid[keep2[t + v_]]);
      const ec = new Map(); for (let e = 0; e < edges.length; e += 2) { const k = Math.min(edges[e], edges[e + 1]) * W + Math.max(edges[e], edges[e + 1]); ec.set(k, (ec.get(k) || 0) + 1); }
      const bord = new Uint8Array(W); for (const [k, n] of ec) if (n === 1) { bord[Math.floor(k / W)] = 1; bord[k % W] = 1; }   // les bords ne bougent pas (sinon le lissage les rétracte)
      for (let it = 0; it < 6; it++) { acc.fill(0); cnt.fill(0);
        for (let e = 0; e < edges.length; e += 2) { const u = edges[e], w2 = edges[e + 1]; for (let k = 0; k < 3; k++) { acc[u * 3 + k] += Pw[w2 * 3 + k]; acc[w2 * 3 + k] += Pw[u * 3 + k]; } cnt[u]++; cnt[w2]++; }
        for (let u = 0; u < W; u++) if (cnt[u] && !bord[u]) for (let k = 0; k < 3; k++) Pw[u * 3 + k] = Pw[u * 3 + k] * 0.5 + 0.5 * acc[u * 3 + k] / cnt[u]; }
      for (let i = 0; i < pos.count; i++) { const q = new THREE.Vector3(Pw[wid[i] * 3], Pw[wid[i] * 3 + 1], Pw[wid[i] * 3 + 2]), r = typeof retrait === 'function' ? retrait(i, q) : null;
        if (r && r.isVector3) q.copy(r); else if (r) q.addScaledVector(new THREE.Vector3(Nn.getX(i), Nn.getY(i), Nn.getZ(i)), -r); pos.setXYZ(i, q.x, q.y, q.z); }
      pos.needsUpdate = true; ng.computeVertexNormals();
      const m = new THREE.SkinnedMesh(ng, mat); m.position.copy(src.position); m.quaternion.copy(src.quaternion); m.scale.copy(src.scale); m.bind(src.skeleton, src.bindMatrix); m.frustumCulled = false; m.visible = false; src.parent.add(m); return m;
    }
    const P = sw.geometry.attributes.position, v = new THREE.Vector3(), bras = [];
    const segs = ['Left', 'Right'].flatMap((s) => [[boneMesh(sw, s + 'Arm'), boneMesh(sw, s + 'ForeArm'), -0.04, 1.0], [boneMesh(sw, s + 'ForeArm'), boneMesh(sw, s + 'Hand'), 0, 0.8]]).filter((a) => a[0] && a[1]);
    const tArm = new Float32Array(P.count).fill(-9), sArm = new Int8Array(P.count).fill(-1);   // bras + avant-bras jusqu'à la peau d'origine (qui ne commence qu'au milieu de l'avant-bras)
    for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i); segs.forEach(([S, E, t0, t1], k) => { const ax = E.clone().sub(S), L = ax.length(); ax.normalize(); const d = v.clone().sub(S), t = d.dot(ax) / L, r = d.sub(ax.clone().multiplyScalar(t * L)).length();
      if (t > t0 && t < t1 && r < 0.085 && t > tArm[i]) { tArm[i] = t; sArm[i] = k; } }); }
    const rayon = (k, t) => (k % 2 === 0 ? 0.047 - 0.006 * Math.max(0, t) : 0.042 - 0.004 * t);   // bras puis avant-bras (m)
    const brasM = peau(sw, (i) => tArm[i] > -9, (i, q) => {          // le manche devient un membre : rayon ramené à celui d'un bras, la forme de section est gardée
      const k = sArm[i]; if (k < 0) return 0.011; const [S, E] = segs[k], ax = E.clone().sub(S), L = ax.length(); ax.normalize();
      const d = q.clone().sub(S), t = d.dot(ax) / L, c = S.clone().addScaledVector(ax, t * L), rv = q.clone().sub(c), r = rv.length(), rt = rayon(k, t);
      if (t < 0.05 && k % 2 === 0) return 0.011;                  // épaule : simple retrait
      return r > rt ? c.add(rv.multiplyScalar(rt / r)) : q.clone().addScaledVector(rv.normalize(), -0.002);
    });
    const torseM = sh ? peau(sh, () => true, () => 0.002) : null;
    return { bras: brasM, torse: torseM };
  })();
  API._peauHomme = PEAU_H;
  /* patiente : haut sans manches (manches relevées jusqu'à l'épaule) pour les gestes sur le deltoïde ou le bras */
  let mancheM = null;
  function sansManches() {
    if (mancheM !== null) return mancheM; mancheM = false;
    const o = byName('Shirt'); let src = null; if (o) o.traverse((c) => { if (!src && c.isSkinnedMesh) src = c; }); if (!src) return false;
    const bm = (n) => { const i = src.skeleton.bones.indexOf(rig.bones[n]); if (i < 0) return null; return new THREE.Vector3().setFromMatrixPosition(src.bindMatrixInverse.clone().multiply(src.skeleton.boneInverses[i].clone().invert())); };
    const ax = ['Left', 'Right'].map((s) => [bm(s + 'Arm'), bm(s + 'ForeArm')]).filter((a) => a[0] && a[1]);
    const g = src.geometry, P = g.attributes.position, idx = g.index.array, v = new THREE.Vector3(), keep = [];
    const surBras = (i) => { v.fromBufferAttribute(P, i); return ax.some(([S, E]) => { const d = E.clone().sub(S), L = d.length(); d.normalize(); return v.clone().sub(S).dot(d) / L > 0.12; }); };
    for (let t = 0; t < idx.length; t += 3) if (!(surBras(idx[t]) || surBras(idx[t + 1]) || surBras(idx[t + 2]))) keep.push(idx[t], idx[t + 1], idx[t + 2]);
    const ng = g.clone(); ng.setIndex(keep);
    mancheM = new THREE.SkinnedMesh(ng, src.material); mancheM.position.copy(src.position); mancheM.quaternion.copy(src.quaternion); mancheM.scale.copy(src.scale);
    mancheM.bind(src.skeleton, src.bindMatrix); mancheM.frustumCulled = false; mancheM.visible = false; mancheM.name = 'ShirtSansManches'; src.parent.add(mancheM);
    if (src.morphTargetInfluences) { mancheM.morphTargetInfluences = src.morphTargetInfluences; mancheM.morphTargetDictionary = src.morphTargetDictionary; }
    return mancheM;
  }
  API.manches = false;                                                   // true : la patiente relève ses manches (vaccin, perfusion…)
  const applyTenue0 = applyTenue;
  function applyTenueH() {
    applyTenue0(); if (!PEAU_H) return;
    const vis = (n) => { const o = byName(n); let v = !!o; if (o) { v = o.visible; o.traverse((c) => { if (c.isMesh && !c.visible) v = false; }); } return v; };
    PEAU_H.bras.visible = !vis('Sweatshirt'); if (PEAU_H.torse) PEAU_H.torse.visible = !vis('Shirt');
  }
  function applyTenueF() {
    applyTenue0(); if (!API.femme) return;
    const o = byName('Shirt'), visible = !!o && o.visible && (() => { let v = true; o.traverse((c) => { if (c.isMesh && !c.visible) v = false; }); return v; })();
    const m = API.manches && visible ? sansManches() : mancheM;
    if (m) { m.visible = !!(API.manches && visible); if (m.visible) o.traverse((c) => { if (c.isMesh) c.visible = false; }); }
  }
  API.applyTenue = API.femme ? applyTenueF : applyTenueH;
  API.applyTenue();
  API.decouvrir = (zone) => {                                            // 'jambes' | 'buste' | 'poitrine' | 'rhabille'
    if (zone === 'rhabille') { API.tenue = { jambes: false, buste: false, poitrine: false }; for (const n of [...API.porte]) if (!/Prothese|Mastectomie/.test(n)) API.porte.delete(n); }
    else if (zone in API.tenue) { API.tenue[zone] = true; if (zone === 'poitrine') API.tenue.buste = true; }
    API.applyTenue(); return API.tenue;
  };
  API.porter = (n, on = true, dur = 1.4) => {                             // matériel révélé : un bas se déroule du pied vers la cuisse, le reste apparaît en fondu
    const o = byName(n); if (!o) return false;
    if (!on) { API.porte.delete(n); API.applyTenue(); return true; }
    API.porte.add(n); API.applyTenue();
    const mats = []; o.traverse((m) => { if (m.isMesh) { m.material = m.material.clone(); mats.push(m.material); } });
    const box = new THREE.Box3().setFromObject(o), y0 = box.min.y, y1 = box.max.y, up = /Bas/.test(n), plane = new THREE.Plane(V3(0, -1, 0), y0);
    for (const m of mats) { if (up) m.clippingPlanes = [plane]; else { m.transparent = true; m.opacity = 0; } }
    let t0 = null;
    const step = (t) => { if (t0 === null) t0 = t; const k = Math.min(1, (t - t0) / dur), e = k * k * (3 - 2 * k);
      for (const m of mats) { if (up) plane.constant = y0 + (y1 - y0 + 0.02) * e; else m.opacity = e; }
      if (k >= 1) { for (const m of mats) { m.clippingPlanes = null; m.transparent = false; m.opacity = 1; } API.extras.splice(API.extras.indexOf(step), 1); } };
    API.extras.push(step); return true;
  };
  function bakeForme(name) {                                            // forme appliquée en dur (positions + normales recalculées), réversible
    for (const m of rig.morphs) {
      const g = m.geometry, P = g.attributes.position, N = g.attributes.normal; if (!P || !N) continue;
      if (!g.userData.P0) { g.userData.P0 = P.array.slice(); g.userData.N0 = N.array.slice(); }
      P.array.set(g.userData.P0); N.array.set(g.userData.N0);
      const k = name && m.morphTargetDictionary[name], D = k !== undefined && k !== null && g.morphAttributes.position ? g.morphAttributes.position[k] : null;
      if (D) {
        const moved = [];
        for (let i = 0; i < P.count; i++) { const dx = D.getX(i), dy = D.getY(i), dz = D.getZ(i); if (Math.abs(dx) + Math.abs(dy) + Math.abs(dz) > 1e-6) { P.setXYZ(i, P.getX(i) + dx, P.getY(i) + dy, P.getZ(i) + dz); moved.push(i); } }
        if (moved.length) { const t = new THREE.BufferGeometry(); t.setAttribute('position', P); if (g.index) t.setIndex(g.index); t.computeVertexNormals(); const TN = t.attributes.normal; for (const i of moved) N.setXYZ(i, TN.getX(i), TN.getY(i), TN.getZ(i)); }
      }
      P.needsUpdate = true; N.needsUpdate = true; g.computeBoundingSphere();
    }
  }
  API.mastectomie = (cote) => { API.manual.Mastectomie_Left = 0; API.manual.Mastectomie_Right = 0; bakeForme(null); if (cote) API.peindre('cicatrice', cote === 'gauche' ? 'sein_G' : 'sein_D'); bakeForme(cote === 'gauche' ? 'Mastectomie_Left' : cote === 'droite' ? 'Mastectomie_Right' : null); };

  // peinture sur la peau : on retrouve les sommets proches d'un point du corps (pose de repos) et on peint dans la texture, à leurs coordonnées UV
  const skins = []; gltf.scene.traverse((m) => { if (m.isMesh && m.material && m.material.map && /Peau|Body|body|skin/i.test(m.material.name + m.name)) skins.push(m); });
  const canv = new Map();
  function canvasOf(mat) {
    if (canv.has(mat)) return canv.get(mat);
    const img = mat.map.image, c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0);
    const tx = new THREE.CanvasTexture(c); tx.flipY = mat.map.flipY; tx.colorSpace = mat.map.colorSpace; tx.wrapS = mat.map.wrapS; tx.wrapT = mat.map.wrapT; tx.channel = mat.map.channel;
    mat.map = tx; mat.needsUpdate = true; const r = { c, g, tx, img }; canv.set(mat, r); return r;
  }
  const restB = {}; for (const k in rig.bones) restB[k] = rig.bones[k].getWorldPosition(V3(0, 0, 0)).applyMatrix4(gltf.scene.matrixWorld.clone().invert());
  const mid = (a, b, t = 0.5) => restB[a] && restB[b] ? restB[a].clone().lerp(restB[b], t) : null;
  const ZONES = {                                                       // centre, direction de la face visible, rayon (m)
    avantbras_G: () => [mid('LeftForeArm', 'LeftHand', 0.45), V3(0, 1, 0.4), 0.07], avantbras_D: () => [mid('RightForeArm', 'RightHand', 0.45), V3(0, 1, 0.4), 0.07],
    bras_G: () => [mid('LeftArm', 'LeftForeArm'), V3(0, 0.3, 1), 0.07], bras_D: () => [mid('RightArm', 'RightForeArm'), V3(0, 0.3, 1), 0.07],
    coude_G: () => [restB.LeftForeArm, V3(0, 0, -1), 0.045], coude_D: () => [restB.RightForeArm, V3(0, 0, -1), 0.045],
    pli_coude_G: () => [restB.LeftForeArm, V3(0, 0, 1), 0.04], pli_coude_D: () => [restB.RightForeArm, V3(0, 0, 1), 0.04],
    thorax: () => [mid('Spine1', 'Spine2', 0.7), V3(0, 0, 1), 0.11, 0.09], abdomen: () => [mid('Hips', 'Spine', 0.9), V3(0, 0, 1), 0.1, 0.08],
    dos: () => [mid('Spine', 'Spine1'), V3(0, 0, -1), 0.12, 0.08], flanc_G: () => [mid('Spine', 'Spine1'), V3(1, 0, 0.3), 0.08, 0.1], flanc_D: () => [mid('Spine', 'Spine1'), V3(-1, 0, 0.3), 0.08, 0.1],
    cuisse_G: () => [mid('LeftUpLeg', 'LeftLeg'), V3(0, 0, 1), 0.09], cuisse_D: () => [mid('RightUpLeg', 'RightLeg'), V3(0, 0, 1), 0.09],
    jambe_G: () => [mid('LeftLeg', 'LeftFoot'), V3(0, 0, 1), 0.08], jambe_D: () => [mid('RightLeg', 'RightFoot'), V3(0, 0, 1), 0.08],
    genou_G: () => [restB.LeftLeg, V3(0, 0, 1), 0.05], genou_D: () => [restB.RightLeg, V3(0, 0, 1), 0.05],
    visage: () => [restB.Head && restB.Head.clone().add(V3(0, 0.07, 0.06)), V3(0, 0, 1), 0.075], cou: () => [mid('Neck', 'Head', 0.3), V3(0, 0, 1), 0.05],
    sein_G: () => [mid('Spine1', 'Spine2', 0.75).add(V3(0.075, 0, 0)), V3(0, 0, 1), 0.07, 0.1], sein_D: () => [mid('Spine1', 'Spine2', 0.75).add(V3(-0.075, 0, 0)), V3(0, 0, 1), 0.07, 0.1],
  };
  let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  function sample(zone) {                                               // sommets de peau de la zone, regroupés par texture
    const z = ZONES[zone] && ZONES[zone](); if (!z || !z[0]) return [];
    const [c0, dir, R, depth] = z; dir.normalize(); const c = c0.clone().add(dir.clone().multiplyScalar(depth || 0)); const out = [];
    for (const m of skins) {
      const g = m.geometry, P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv; if (!U) continue;
      gltf.scene.updateMatrixWorld(true); const Mm = gltf.scene.matrixWorld.clone().invert().multiply(m.matrixWorld), Nm = new THREE.Matrix3().getNormalMatrix(Mm);   // maillage quantifié : on revient au repère du modèle
      const pts = []; const p = V3(0, 0, 0), n = V3(0, 0, 0);
      for (let i = 0; i < P.count; i++) {
        p.fromBufferAttribute(P, i).applyMatrix4(Mm); const d = p.distanceTo(c); if (d > R) continue;
        if (N) { n.fromBufferAttribute(N, i).applyMatrix3(Nm).normalize(); if (n.dot(dir) < 0.15) continue; }
        pts.push({ u: U.getX(i), v: U.getY(i), d: d / R, p: p.clone(), i });
      }
      if (pts.length > 8) out.push({ mat: m.material, pts, mesh: m });
    }
    return out;
  }
  const PEINT = {
    urticaire: (g, s, x, y) => { const r = (10 + rnd() * 26) * s; g.fillStyle = 'rgba(214,72,78,.32)'; g.beginPath(); g.ellipse(x, y, r * 1.3, r, rnd() * 3, 0, 7); g.fill(); g.fillStyle = 'rgba(250,215,205,.35)'; g.beginPath(); g.ellipse(x, y, r * 0.6, r * 0.45, rnd() * 3, 0, 7); g.fill(); },
    varicelle: (g, s, x, y) => { const r = (7 + rnd() * 6) * s; g.fillStyle = 'rgba(205,50,55,.55)'; g.beginPath(); g.arc(x, y, r * 1.6, 0, 7); g.fill(); if (rnd() < 0.6) { g.fillStyle = 'rgba(255,245,230,.85)'; g.beginPath(); g.arc(x, y, r * 0.7, 0, 7); g.fill(); } else { g.fillStyle = 'rgba(120,60,40,.8)'; g.beginPath(); g.arc(x, y, r * 0.6, 0, 7); g.fill(); } },
    zona: (g, s, x, y) => { g.fillStyle = 'rgba(205,60,60,.30)'; g.beginPath(); g.arc(x, y, 14 * s, 0, 7); g.fill(); for (let k = 0; k < 4; k++) { const a = rnd() * 7, d = rnd() * 9 * s; g.fillStyle = 'rgba(255,240,225,.9)'; g.beginPath(); g.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, (2 + rnd() * 2.5) * s, 0, 7); g.fill(); } },
    eczema: (g, s, x, y) => { g.fillStyle = 'rgba(190,60,60,.20)'; g.beginPath(); g.arc(x, y, (14 + rnd() * 18) * s, 0, 7); g.fill(); for (let k = 0; k < 5; k++) { g.fillStyle = rnd() < 0.5 ? 'rgba(170,45,45,.45)' : 'rgba(245,225,210,.5)'; g.fillRect(x + (rnd() - 0.5) * 24 * s, y + (rnd() - 0.5) * 24 * s, 2 * s, 2 * s); } },
    psoriasis: (g, s, x, y) => { const r = (12 + rnd() * 16) * s; g.fillStyle = 'rgba(200,62,70,.7)'; g.beginPath(); g.ellipse(x, y, r * 1.2, r, rnd() * 3, 0, 7); g.fill(); for (let k = 0; k < 14; k++) { g.fillStyle = 'rgba(238,236,228,.75)'; g.beginPath(); g.arc(x + (rnd() - 0.5) * r * 1.6, y + (rnd() - 0.5) * r * 1.4, (1.5 + rnd() * 3) * s, 0, 7); g.fill(); } },
    piqure: (g, s, x, y) => { g.fillStyle = 'rgba(200,60,60,.45)'; g.beginPath(); g.arc(x, y, 9 * s, 0, 7); g.fill(); g.fillStyle = 'rgba(90,20,20,.9)'; g.beginPath(); g.arc(x, y, 2.2 * s, 0, 7); g.fill(); },
  };
  const DENS = { urticaire: 26, varicelle: 60, zona: 34, eczema: 40, psoriasis: 6, piqure: 1 };
  API.peindre = (type, zone, opt = {}) => {
    seed = opt.seed || 7 + type.length * 13 + zone.length;
    for (const { mat, pts, mesh } of sample(zone)) {
      const { c, g, tx } = canvasOf(mat), W_ = c.width, H_ = c.height;
      const fr = (t) => t - Math.floor(t), px = (q) => [fr(q.u) * W_, (tx.flipY ? 1 - fr(q.v) : fr(q.v)) * H_], s = W_ / 2048;
      if (type === 'plaie') {                                        // écorchure : au point le plus proche du centre visé, taille en mètres (pixels par mètre mesurés)
        const ctr = pts.reduce((a, q) => (q.d < a.d ? q : a)), [cx, cy] = px(ctr); if (!API._plaieV || ctr.d < API._plaieV.d) API._plaieV = { mesh, i: ctr.i, d: ctr.d };   // sommet du centre : la zone « Plaie » du pansement le suit
        let k = 0, n = 0; for (const q of pts) { const dp = q.p.distanceTo(ctr.p); if (dp > 0.006) { const [x, y] = px(q); k += Math.hypot(x - cx, y - cy) / dp; n++; } } const ppm = n ? k / n : 4000;
        const tache = (x0, y0, rx, ry, col, a) => { const gr = g.createRadialGradient(0, 0, 0, 0, 0, 1); gr.addColorStop(0, `rgba(${col},${a})`); gr.addColorStop(1, `rgba(${col},0)`);
          g.save(); g.translate(x0, y0); g.rotate(0.4); g.scale(rx, ry); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 1, 0, 7); g.fill(); g.restore(); };
        tache(cx, cy, 0.024 * ppm, 0.013 * ppm, '205,105,95', 0.5);
        for (let i = 0; i < 22; i++) tache(cx + (rnd() - 0.5) * 0.028 * ppm, cy + (rnd() - 0.5) * 0.012 * ppm, (0.003 + rnd() * 0.007) * ppm, (0.0012 + rnd() * 0.002) * ppm, '150,25,28', 0.8);
        for (let i = 0; i < 7; i++) tache(cx + (rnd() - 0.5) * 0.022 * ppm, cy + (rnd() - 0.5) * 0.008 * ppm, (0.001 + rnd() * 0.0018) * ppm, (0.0008 + rnd() * 0.0012) * ppm, '85,20,14', 0.9);
      } else if (type === 'erytheme_migrant' || type === 'cicatrice') {
        const ctr = type === 'cicatrice' ? pts.reduce((a, q) => (q.p.z > a.p.z ? q : a)) : pts.reduce((a, q) => (q.d < a.d ? q : a)); const [cx, cy] = px(ctr);
        let k = 0, n = 0; for (const q of pts) { const dp = q.p.distanceTo(ctr.p); if (dp > 0.01) { const [x, y] = px(q); k += Math.hypot(x - cx, y - cy) / dp; n++; } } const ppm = n ? k / n : 4000;
        g.save(); g.translate(cx, cy);
        if (type === 'erytheme_migrant') { g.lineWidth = 0.012 * ppm; g.strokeStyle = 'rgba(205,60,65,.55)'; g.beginPath(); g.ellipse(0, 0, 0.05 * ppm, 0.042 * ppm, 0.3, 0, 7); g.stroke(); g.fillStyle = 'rgba(205,70,70,.35)'; g.beginPath(); g.arc(0, 0, 0.008 * ppm, 0, 7); g.fill(); }
        else {
          let R_ = 0, G_ = 0, B_ = 0, n_ = 0;                          // ton moyen de la peau autour du sein (anneau), qui recouvre l'aréole et l'ombrage peint
          for (const q of pts) { const dq = q.p.distanceTo(ctr.p); if (dq > 0.075 && dq < 0.09 && q.p.y > ctr.p.y - 0.02) { const [x, y] = px(q); const d_ = g.getImageData(Math.round(x), Math.round(y), 1, 1).data; if (d_[0] + d_[1] + d_[2] > 150) { R_ += d_[0]; G_ += d_[1]; B_ += d_[2]; n_++; } } }
          const tgt = ctr.p.clone().add(V3(0, -0.04, 0)), bas = pts.reduce((a, q) => (q.p.distanceTo(tgt) < a.p.distanceTo(tgt) ? q : a)), [bx, by] = px(bas), ox = (bx - cx) * 0.8, oy = (by - cy) * 0.8;   // le pli peint sous le sein est plus bas
          if (n_) { const col = `rgba(${R_ / n_ | 0},${G_ / n_ | 0},${B_ / n_ | 0},`; for (const [x0, y0, rr] of [[ox * 1.15, oy * 1.15, 0.12], [ox * 0.5, oy * 0.5, 0.1], [0, 0, 0.075]]) { const gr = g.createRadialGradient(x0, y0, 0, x0, y0, rr * ppm); gr.addColorStop(0, col + '.95)'); gr.addColorStop(0.5, col + '.8)'); gr.addColorStop(0.85, col + '.25)'); gr.addColorStop(1, col + '0)'); g.fillStyle = gr; g.beginPath(); g.arc(x0, y0, rr * ppm, 0, 7); g.fill(); } }
          g.strokeStyle = 'rgba(170,70,80,.85)'; g.lineWidth = 0.004 * ppm; g.lineCap = 'round'; g.beginPath(); g.moveTo(-0.05 * ppm, 0.005 * ppm); g.quadraticCurveTo(0, -0.008 * ppm, 0.05 * ppm, 0.004 * ppm); g.stroke(); g.strokeStyle = 'rgba(240,200,200,.5)'; g.lineWidth = 0.0015 * ppm; g.stroke(); }
        g.restore();
      } else {
        const f = PEINT[type]; if (!f) continue; const n = Math.round((DENS[type] || 20) * (opt.densite || 1) * Math.min(1, pts.length / 60));
        for (let i = 0; i < n; i++) { const q = pts[Math.floor(rnd() * pts.length)]; if (q.d > 0.85 && rnd() < 0.6) continue; const [x, y] = px(q); f(g, s, x, y); }
      }
      tx.needsUpdate = true;
    }
  };
  /* plaie décrite par le cas (objets.js plaieDuCas) : peinte dans la peau, au même endroit que la zone « Plaie » du pansement */
  const restQ = {}; for (const k in rig.bones) restQ[k] = rig.bones[k].getWorldQuaternion(new THREE.Quaternion()).premultiply(new THREE.Quaternion().setFromRotationMatrix(gltf.scene.matrixWorld).invert());
  API.peindrePlaie = (pl, dirTest) => {
    if (!pl) return; const S = pl.cote === 'Right' ? 'Right' : 'Left', T = { avantbras: 0.3, poignet: 0.12, coude: 0.88, main: -0.42 };
    let c, dir;
    if (pl.site === 'genou') { c = mid(S + 'Leg', S + 'UpLeg', 0.04); dir = V3(0, 0, 1); }
    else if (pl.site === 'jambe') { c = mid(S + 'Leg', S + 'Foot', 0.4); dir = V3(0, 0, 1); }
    else { const w = restB[S + 'Hand'], e = restB[S + 'ForeArm'], ax = e.clone().sub(w).normalize(); c = w.clone().lerp(e, T[pl.site] ?? 0.3);
      dir = pl.site === 'main' ? rig.palmL[S].clone().applyQuaternion(restQ[S + 'Hand']).negate() : pl.site === 'coude' ? V3(0, 0, -1) : V3(0, 0.5, 1);   // face antérieure (pose T), dos de la main, pointe du coude
      dir.sub(ax.clone().multiplyScalar(dir.dot(ax))).normalize(); }
    if (dirTest) dir = V3(...dirTest).normalize();
    if (!c) return; ZONES._plaie = () => [c, dir, 0.03, 0.04]; API._plaieV = null; API.peindre('plaie', '_plaie', { seed: 11 });
  };
  /* texture du visage remplacée (même disposition UV que celle du modèle : visage MetaHuman) — vieillissement, autres visages */
  API.visage = (url) => new Promise((res) => {
    const m = byName('Tete') || (!API.femme && byName('Body')); if (!m) return res(false);   // patiente v5 (pas de Tete, UV différent) : rien  // patiente MetaHuman : maillage Tete ; patient homme : Body (atlas MikeAlger complet)
    const poser = (t) => { m.traverse((x) => { if (x.isMesh) { const mt = [].concat(x.material)[0]; if (!mt || !mt.map) return;
      const r = canv.get(mt);                                             // peau déjà repeinte (lésions) : on change l'image de fond du canevas
      if (r) { if (!r.img0) r.img0 = r.img; r.img = t ? t.image : r.img0; r.g.drawImage(r.img, 0, 0, r.c.width, r.c.height); r.tx.needsUpdate = true; return; }
      if (!x.userData.map0) x.userData.map0 = mt.map; mt.map = t || x.userData.map0; mt.needsUpdate = true; } }); };
    if (!url) { poser(null); return res(true); }                        // visage d'origine
    new THREE.TextureLoader().load(url, (t) => { t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; poser(t); res(true); }, undefined, () => res(false));
  });
  API.cheveuxGris = (on = true) => {                                     // cheveux blancs/gris : texture recalculée (luminance éclaircie, alpha gardé)
    const h = byName('Hair'); if (!h || (API.femme && !byName('Tete'))) return;   // patiente v5 : texture des cheveux partagée avec la peau
    h.traverse((x) => { if (!x.isMesh) return; const mt = [].concat(x.material)[0]; if (!mt || !mt.map) return;
      if (!x.userData.map0) x.userData.map0 = mt.map;
      if (!on) { mt.map = x.userData.map0; mt.needsUpdate = true; return; }
      if (!x.userData.mapGris) { const im = x.userData.map0.image; if (!im || !im.width) return;
        const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0);
        const d = g.getImageData(0, 0, c.width, c.height), p = d.data;
        for (let i = 0; i < p.length; i += 4) { const l = (p[i] * 0.3 + p[i + 1] * 0.59 + p[i + 2] * 0.11) / 255, v = 105 + 150 * Math.pow(l, 0.7); p[i] = v; p[i + 1] = v * 0.985; p[i + 2] = v * 0.96; }
        g.putImageData(d, 0, 0); const t = new THREE.CanvasTexture(c); t.flipY = x.userData.map0.flipY; t.colorSpace = THREE.SRGBColorSpace; x.userData.mapGris = t; }
      mt.map = x.userData.mapGris; mt.needsUpdate = true; });
  };
  if (o.visage) API.visage(o.visage);
  API.plaieMonde = () => {                                               // position actuelle (monde) du centre de la plaie peinte, et normale approchée
    const P = API._plaieV; if (!P) return null; const m = P.mesh, p = V3(0, 0, 0).fromBufferAttribute(m.geometry.attributes.position, P.i);
    if (m.isSkinnedMesh && m.applyBoneTransform) m.applyBoneTransform(P.i, p); p.applyMatrix4(m.matrixWorld);
    const N = m.geometry.attributes.normal; let n = null;
    if (N) { const p2 = V3(0, 0, 0).fromBufferAttribute(m.geometry.attributes.position, P.i).add(V3(0, 0, 0).fromBufferAttribute(N, P.i).multiplyScalar(0.01)); if (m.isSkinnedMesh && m.applyBoneTransform) m.applyBoneTransform(P.i, p2); p2.applyMatrix4(m.matrixWorld); n = p2.sub(p).normalize(); }
    return { p, n };
  };
  API.effacerPeau = () => { API._plaieV = null; for (const [mat, r] of canv) { r.g.drawImage(r.img, 0, 0); r.tx.needsUpdate = true; } };
  /* ---------- voir l'intérieur : organes de CorpoAtlas (Visible Human ; calque Homme pour le patient), recalés et accrochés aux os ---------- */
  let inter = null, interOn = false;
  async function chargerInterieur(url) {
    const g = (await new GLTFLoader().setDRACOLoader(new DRACOLoader().setDecoderPath(o.draco || 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/draco/')).loadAsync(url)).scene;
    const body = skins[0], sk = body.skeleton; gltf.scene.updateMatrixWorld(true);
    const toMesh = gltf.scene.matrixWorld.clone().invert().multiply(body.matrixWorld).invert(), parts = [];
    g.updateMatrixWorld(true);
    const meshes = []; g.traverse((m) => { if (m.isMesh) meshes.push(m); });
    if (meshes.some((m) => m.isSkinnedMesh)) {                // v13 : maillages habillés sur le squelette de la patiente (mêmes os, même pose de repos)
      const byName = (n) => { const k = n.replace(/^mixamorig[_:]?/, ''); return rig.bones[k] || null; };
      for (const m of meshes) {
        if (!m.isSkinnedMesh) continue;
        const bones = m.skeleton.bones.map((b) => byName(b.name) || rig.bones.Hips);
        const parent = body.parent; m.removeFromParent(); m.position.copy(body.position); m.quaternion.copy(body.quaternion); m.scale.copy(body.scale); parent.add(m);
        m.bind(new THREE.Skeleton(bones, m.skeleton.boneInverses), body.bindMatrix);
        m.frustumCulled = false; m.renderOrder = 2; m.userData.groupe = m.userData.groupe || m.name.replace(/^Int_/, '').replace(/[_.]\d+$/, '');
        const mt = m.material; if (mt) { mt.side = THREE.DoubleSide; mt.vertexColors = !!m.geometry.attributes.color; mt.needsUpdate = true; }
        parts.push(m);
      }
      return parts;
    }
    for (const m of meshes) {
      let n = m, os = null, grp = null; while (n && !os) { os = n.userData && n.userData.os; grp = n.userData && n.userData.groupe; n = n.parent; }
      const bone = rig.bones[os] || rig.bones.Hips, bi = sk.bones.indexOf(bone); if (bi < 0) continue;
      const M = sk.boneInverses[bi].clone().multiply(body.bindMatrix).multiply(toMesh).multiply(m.matrixWorld);
      m.removeFromParent(); m.matrixAutoUpdate = false; m.matrix.copy(M); m.frustumCulled = false; m.renderOrder = 2; m.userData.groupe = grp;
      const mt = m.material; if (mt) { mt.side = THREE.DoubleSide; mt.depthWrite = true; if (mt.transparent && mt.opacity < 0.3) mt.opacity = 0.35; }
      bone.add(m); parts.push(m);
    }
    return parts;
  }
  const VOILE = [];
  API.interieur = async (on = !interOn, url = o.interieur || (API.femme ? 'avatar/interieur_femme.glb' : 'avatar/interieur_homme.glb'), groupes = null) => {
    if (on && !inter) { try { inter = await chargerInterieur(url); } catch (e) { console.warn('intérieur', e); return false; } }
    interOn = on;
    if (inter) for (const m of inter) m.visible = on && (!groupes || groupes.includes(m.userData.groupe));
    gltf.scene.traverse((m) => {                                       // peau et vêtements en voile translucide
      if (!m.isMesh || (inter && inter.includes(m))) return;
      if (on) { if (!m.userData.matOpaque) { m.userData.matOpaque = m.material; const v = m.material.clone(); v.transparent = true; v.opacity = /Hair|Cils/i.test(m.name + v.name) ? 0.08 : 0.16; v.depthWrite = false; m.material = v; m.renderOrder = 5; VOILE.push(m); } }
      else if (m.userData.matOpaque) { m.material = m.userData.matOpaque; delete m.userData.matOpaque; m.renderOrder = 0; }
    });
    return on;
  };
  API.zonesPeau = Object.keys(ZONES); API._skin = { skins, canvasOf, restB, gltf, rig };   // pour peau.js (lésions de CorpoAtlas) API._sample = (z) => sample(z).map((s) => s.mat.name + ':' + s.pts.length); API._skins = skins.map((m) => m.name + '/' + m.material.name);
  return API;
}
