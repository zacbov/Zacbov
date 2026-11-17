import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

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
  anxieux: { face: { ...B2('BrowsIn', .5), ...B2('BrowsUp', .35), ...B2('EyesWide', .2) }, gesture: 'protege', head: [0.02, 0, 0], jitter: 0.008, blink: 1.6 },
  presse: { face: { ...B2('Frown', .35), ...B2('BrowsDown', .3) }, gesture: 'montre', head: [0.03, 0, 0], jitter: 0.01 },
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

/* ---------- gestes : directions du monde [vers l'extérieur, haut, avant] pour le bras puis l'avant-bras ---------- */
const REPOS = { a: [0.12, -1, 0.05], f: [0.05, -0.85, 0.5], curl: 0.2 };
export const GESTURES = {
  repos: { L: REPOS, R: REPOS },
  explique: { L: REPOS, R: { a: [0.35, -0.8, 0.25], f: [0.1, -0.25, 0.9], curl: 0.1 } },
  surprise: { L: { a: [0.3, -0.85, 0.25], f: [0.1, 0.7, 0.6], curl: 0 }, R: { a: [0.3, -0.85, 0.25], f: [0.1, 0.7, 0.6], curl: 0 } },
  abattu: { L: { a: [0.05, -1, -0.05], f: [0, -1, 0.15], curl: 0.3 }, R: { a: [0.05, -1, -0.05], f: [0, -1, 0.15], curl: 0.3 }, shrug: -0.15 },
  ouvert: { L: { a: [0.45, -0.7, 0.2], f: [0.4, -0.2, 0.9], curl: 0 }, R: { a: [0.45, -0.7, 0.2], f: [0.4, -0.2, 0.9], curl: 0 } },
  poings: { L: { a: [0.15, -0.9, 0.25], f: [0.05, 0.25, 0.95], curl: 1 }, R: { a: [0.15, -0.9, 0.25], f: [0.05, 0.25, 0.95], curl: 1 } },
  protege: { L: { a: [0.1, -0.95, 0.15], f: [-0.5, 0.55, 0.65], curl: 0.4 }, R: { a: [0.1, -0.95, 0.15], f: [-0.5, 0.55, 0.65], curl: 0.4 } },
  reflexion: { R: { a: [0.15, -0.9, 0.35], f: [-0.35, 0.8, 0.5], curl: 0.6 }, L: { a: [0.1, -0.95, 0.1], f: [-0.7, 0.05, 0.7], curl: 0.3 } },
  ventre: { L: { a: [0.1, -1, 0.1], f: [-0.65, -0.25, 0.7], curl: 0.3 }, R: { a: [0.1, -1, 0.1], f: [-0.65, -0.25, 0.7], curl: 0.3 } },
  montre: { L: { a: [0.1, -0.9, 0.3], f: [-0.5, 0.35, 0.8], curl: 0.5 }, R: REPOS },
  haussement: { L: { a: [0.5, -0.8, 0.1], f: [0.35, 0.1, 0.9], curl: 0 }, R: { a: [0.5, -0.8, 0.1], f: [0.35, 0.1, 0.9], curl: 0 }, shrug: 1 },
};

/* ---------- squelette : calcul géométrique pur (testable sans navigateur) ---------- */
export class Rig {
  constructor(root) {
    this.root = root; this.bones = {}; this.tpose = {}; this.out = {}; this.fingers = { Left: [], Right: [] };
    root.traverse((o) => {
      if (o.isBone) { const k = o.name.replace(/^mixamorig[_:]/, ''); this.bones[k] = o; this.tpose[k] = o.quaternion.clone(); }
      if (o.isSkinnedMesh) { o.frustumCulled = false; if (o.morphTargetDictionary) { this.body = o; this.dict = o.morphTargetDictionary; } }
    });
    root.updateMatrixWorld(true);
    for (const s of ['Left', 'Right']) {
      const A = this.bones[s + 'Arm'], F = this.bones[s + 'ForeArm'];
      this.out[s] = A && F ? Math.sign(F.getWorldPosition(V3(0, 0, 0)).x - A.getWorldPosition(V3(0, 0, 0)).x) || 1 : 1;
      for (const f of ['Index', 'Middle', 'Ring', 'Pinky']) {          // axe de flexion de chaque phalange, calculé en pose en T (paumes vers le bas)
        const chain = [];
        for (let k = 1; k <= 3; k++) {
          const b = this.bones[`${s}Hand${f}${k}`], c = this.bones[`${s}Hand${f}${k + 1}`] || null; if (!b) continue;
          const p = b.getWorldPosition(V3(0, 0, 0)), q = c ? c.getWorldPosition(V3(0, 0, 0)) : p.clone().add(p.clone().sub(b.parent.getWorldPosition(V3(0, 0, 0))));
          const dir = q.sub(p).normalize(), axisW = dir.clone().cross(V3(0, -1, 0)).normalize();
          chain.push({ b, key: `${s}Hand${f}${k}`, axis: axisW.applyQuaternion(b.getWorldQuaternion(new THREE.Quaternion()).invert()).normalize() });
        }
        if (chain.length) this.fingers[s].push({ f, chain });
      }
    }
  }
  aim(b, child, dir) {                                             // oriente un os vers une direction du monde, quel que soit son repère local
    const p = b.getWorldPosition(V3(0, 0, 0)), c = child.getWorldPosition(V3(0, 0, 0)), cur = c.sub(p).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(cur, dir.clone().normalize()), wq = b.getWorldQuaternion(new THREE.Quaternion()).premultiply(q);
    b.quaternion.copy(b.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(wq)); b.updateMatrixWorld(true);
  }
  reset(...names) { for (const n of names) if (this.bones[n]) this.bones[n].quaternion.copy(this.tpose[n]); this.root.updateMatrixWorld(true); }
  arm(s, aDir, fDir, shrug = 0) {
    const sh = this.bones[s + 'Shoulder'], A = this.bones[s + 'Arm'], F = this.bones[s + 'ForeArm'], H = this.bones[s + 'Hand']; if (!A || !F || !H) return;
    this.reset(s + 'Shoulder', s + 'Arm', s + 'ForeArm');
    if (sh) this.aim(sh, A, V3(this.out[s], 0.12 + 0.4 * shrug, 0.0));
    this.aim(A, F, aDir); this.aim(F, H, fDir);
  }
  curl(s, amount, extra = 0) {                                     // 0 = main ouverte, 1 = poing
    const ang = [0.95, 1.2, 0.85];
    for (const { f, chain } of this.fingers[s]) chain.forEach(({ b, key, axis }, i) => {
      b.quaternion.copy(this.tpose[key]).multiply(new THREE.Quaternion().setFromAxisAngle(axis, ang[i] * clamp(amount + (f === 'Pinky' ? 0.05 : 0) + extra, 0, 1)));
    });
  }
  turn(name, ax, ang) {                                            // rotation autour d'un axe du monde, appliquée à l'os
    const b = this.bones[name]; if (!b) return; const pq = b.parent.getWorldQuaternion(new THREE.Quaternion()), q = new THREE.Quaternion().setFromAxisAngle(ax, ang);
    b.quaternion.copy(pq.clone().invert().multiply(q).multiply(pq).multiply(this.tpose[name]));
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

export async function createAvatar(el, opts = {}) {
  const o = { glb: 'avatar/patient_homme.glb', background: 'avatar/decor_pharmacie.webp', interactive: false, view: 'buste', ...opts };
  el.style.position = el.style.position || 'relative'; if (o.background) el.style.background = `#13201b url(${o.background}) center/cover no-repeat`;
  const canvas = document.createElement('canvas'); canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block'; el.prepend(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); renderer.setPixelRatio(Math.min(2, devicePixelRatio)); renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(28, 1, 0.05, 20);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x556677, 1.25)); const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(1, 2, 2.2); scene.add(key);
  const controls = new OrbitControls(camera, canvas); controls.enablePan = false; controls.minDistance = 0.4; controls.maxDistance = 4; controls.enabled = !!o.interactive;
  const fit = () => { const w = el.clientWidth || 300, h = el.clientHeight || 400; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
  const ro = new ResizeObserver(fit); ro.observe(el); fit();
  const gltf = await new GLTFLoader().loadAsync(o.glb); scene.add(gltf.scene);
  const rig = new Rig(gltf.scene), names = Object.keys(rig.dict || {}), H = rig.bones.Head;
  const API = { names, manual: {}, rig, scene, camera, controls, emotion: 'neutre', gesture: null, profil: '', muted: false, rate: 1, voiceIndex: 0, speaking: false };
  function view(kind = o.view) {
    const h = H.getWorldPosition(V3(0, 0, 0)), face = kind === 'visage';
    controls.target.set(h.x, h.y - (face ? 0.02 : 0.27), h.z); camera.position.set(h.x, h.y + (face ? 0.02 : -0.1), h.z + (face ? 0.8 : 1.75)); controls.update();
  }
  view();
  // --- voix du navigateur (voix Windows) ---
  let voices = [], VQ = [], charPos = 0, cps = 14, lastB = null;
  const hasTTS = typeof speechSynthesis !== 'undefined';
  const loadVoices = () => { if (!hasTTS) return; const all = speechSynthesis.getVoices(); voices = all.filter((v) => v.lang.toLowerCase().startsWith('fr')); if (!voices.length) voices = all; API.voices = voices; API.onvoices && API.onvoices(voices); };
  if (hasTTS) { speechSynthesis.onvoiceschanged = loadVoices; loadVoices(); }
  API.say = (text, opt = {}) => new Promise((resolve) => {
    const txt = (text || '').trim(); if (!txt) return resolve();
    if (opt.emotion) API.emotion = opt.emotion; VQ = visemes(txt); charPos = 0; cps = 14 * API.rate; lastB = null;
    const end = () => { API.speaking = false; resolve(); };
    if (API.muted || !hasTTS) { API.speaking = true; setTimeout(end, Math.min(20000, txt.length / cps * 1000)); return; }   // sans voix : l'avatar parle quand même
    speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(txt); u.lang = 'fr-FR'; if (voices[API.voiceIndex]) u.voice = voices[API.voiceIndex]; u.rate = API.rate;
    u.onstart = () => { API.speaking = true; }; u.onend = u.onerror = end;
    u.onboundary = (e) => { const now = performance.now(); if (lastB && e.charIndex > lastB.i && now > lastB.t) cps = clamp((e.charIndex - lastB.i) / ((now - lastB.t) / 1000), 5, 40); charPos = e.charIndex; lastB = { i: e.charIndex, t: now }; };
    speechSynthesis.speak(u);
  });
  API.stop = () => { if (hasTTS) speechSynthesis.cancel(); API.speaking = false; };
  API.view = view; API.flip = () => { gltf.scene.rotation.y += Math.PI; }; API.resize = fit;
  API.dispose = () => { renderer.setAnimationLoop(null); ro.disconnect(); API.stop(); renderer.dispose(); canvas.remove(); };
  // --- animation ---
  const dirs = { Left: { a: V3(0, -1, 0), f: V3(0, -1, 0), sh: 0, curl: 0.2 }, Right: { a: V3(0, -1, 0), f: V3(0, -1, 0), sh: 0, curl: 0.2 } }, emoW = {}, cur = {}, AX = { x: V3(1, 0, 0), y: V3(0, 1, 0), z: V3(0, 0, 1) };
  let nextBlink = 1.5, blinkT = -9, last = 0, sacc = [0, 0], nextSacc = 2, headS = [0, 0, 0];
  renderer.setAnimationLoop((ms) => {
    const t = ms / 1000, dt = Math.min(0.1, t - last || 0.016); last = t; const E = EMOTIONS[API.emotion] || EMOTIONS.neutre;
    // visage
    if (rig.body) {
      const tw = {}, add = (obj, k = 1) => { for (const n in obj) tw[n] = (tw[n] || 0) + obj[n] * k; };
      if (API.speaking) { charPos += cps * dt; const i = Math.floor(charPos), f = charPos - i; add(VIS[VQ[i] || '_'], 1 - f); add(VIS[VQ[i + 1] || '_'], f); if (i > VQ.length + 2) API.speaking = false; }
      for (const n of new Set([...Object.keys(E.face), ...Object.keys(emoW)])) emoW[n] = (emoW[n] || 0) + ((E.face[n] || 0) - (emoW[n] || 0)) * (1 - Math.exp(-dt * 6));
      for (const n in emoW) tw[n] = (tw[n] || 0) + emoW[n] * (API.speaking && MOUTH.test(n) ? 0.45 : 1);
      if (t > nextBlink) { blinkT = t; nextBlink = t + (2.5 + Math.random() * 3) / (E.blink || 1); }
      const x = (t - blinkT) / 0.18, bw = x >= 0 && x < 1 ? Math.sin(x * Math.PI) : 0;
      for (const n of names) {
        const m = API.manual[n], goal = m !== undefined && m > 0 ? m : (tw[n] || 0); cur[n] = (cur[n] || 0) + (goal - (cur[n] || 0)) * (1 - Math.exp(-dt * 22));
        rig.body.morphTargetInfluences[rig.dict[n]] = clamp(n.startsWith('Blink_') ? Math.max(cur[n], bw) : cur[n], 0, 1);
      }
    }
    // corps : tronc, tête, regard
    const g0 = API.gesture || E.gesture, gn = API.speaking && g0 === 'repos' ? 'explique' : g0, G = GESTURES[gn] || GESTURES.repos, k = 1 - Math.exp(-dt * 5);
    rig.turn('Spine1', AX.x, Math.sin(t * 1.4) * 0.012);
    const jit = (E.jitter || 0) * Math.sin(t * 7), hp = E.head || [0, 0, 0]; headS = headS.map((v, i) => v + (hp[i] - v) * k);
    rig.turn('Neck', AX.y, Math.sin(t * 0.6) * 0.02 + jit + headS[1] * 0.5); rig.turn('Neck', AX.x, headS[0] * 0.5);
    rig.turn('Head', AX.x, Math.sin(t * 0.9) * 0.01 + (API.speaking ? Math.sin(t * 5.5) * 0.025 : 0) + headS[0] * 0.5); rig.turn('Head', AX.y, headS[1] * 0.5); rig.turn('Head', AX.z, headS[2]);
    if (t > nextSacc) { sacc = [(Math.random() - 0.5) * 0.12, (Math.random() - 0.5) * 0.08]; nextSacc = t + 1.5 + Math.random() * 2.5; }
    for (const e of ['LeftEye', 'RightEye']) { rig.turn(e, AX.y, sacc[0]); rig.turn(e, AX.x, sacc[1]); }
    // bras et mains
    for (const [s, key] of [['Left', 'L'], ['Right', 'R']]) {
      const gs = G[key] || REPOS, d = dirs[s], o_ = rig.out[s], tgt = (v) => V3(o_ * v[0], v[1], v[2]), beat = API.speaking && s === 'Right' && gn === 'explique' ? Math.sin(t * 4) * 0.18 : 0;
      d.a.lerp(tgt(gs.a), k).normalize(); const f2 = tgt(gs.f); f2.y += beat; f2.x += beat * 0.5; d.f.lerp(f2, k).normalize();
      d.sh += ((G.shrug || 0) - d.sh) * k; d.curl += (gs.curl - d.curl) * k;
      rig.arm(s, d.a, d.f, d.sh); rig.curl(s, d.curl);
    }
    controls.update(); renderer.render(scene, camera);
  });
  return API;
}
