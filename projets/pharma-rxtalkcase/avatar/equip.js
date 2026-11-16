/* Objets que le pharmacien montre et place sur le patient (orthèses, collier, semelles, stomie, perfusion).
   Principe, comme pour la prise de tension : chaque objet a sa scène (posture, caméra, mobilier). L'étudiant prend une pièce dans le plateau,
   la glisse sur une zone du patient ; si la zone est la bonne, la pièce s'ajuste sur le corps (repères de l'objet alignés sur les os), sinon un message explique.
   Ajustement : 2 points + 1 direction de l'objet (A, B, up) sont alignés sur 2 points + 1 direction du corps (tA, tB, tUp), lus sur le squelette à chaque image. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const P = (o, x, y, z) => V3(o * x, y, z);

/* ---------- ajustement : objet → corps ---------- */
function frame(a, b, up) { const x = b.clone().sub(a).normalize(), y = up.clone().sub(x.clone().multiplyScalar(up.dot(x))).normalize(); return new THREE.Matrix4().makeBasis(x, y, x.clone().cross(y)); }
export function fitMatrix(o, t, scale) {                     // o, t : { A, B, up } ; scale : nombre, ou { fit: facteur, base } pour adapter la longueur
  const lo = o.B.distanceTo(o.A), lt = t.B.distanceTo(t.A), s = typeof scale === 'number' ? scale : scale.s != null ? scale.s : (lt / lo) * (scale.k || 1);
  const sv = scale && scale.xz ? V3(s * scale.xz, s, s * scale.xz) : V3(s, s, s);    // xz : resserre l'objet autour de son axe vertical (collier sur un cou fin)
  const R = frame(t.A, t.B, t.up).multiply(frame(o.A, o.B, o.up).transpose());
  const q = new THREE.Quaternion().setFromRotationMatrix(R), pos = t.A.clone().sub(o.A.clone().multiply(sv).applyQuaternion(q));
  return new THREE.Matrix4().compose(pos, q, sv);
}

/* ---------- repères du corps (monde) ---------- */
function body(api) {
  const R = api.rig, root = api.root, W = (n) => R.bones[n] ? R.bones[n].getWorldPosition(V3(0, 0, 0)) : null;
  const toW = (v) => root.localToWorld(v.clone()), dirW = (v) => v.clone().transformDirection(root.matrixWorld);
  return { W, toW, dirW, up: dirW(V3(0, 1, 0)), fwd: dirW(V3(0, 0, 1)), side: (s) => dirW(V3(R.out[s], 0, 0)), D: api.D, rig: R };
}
const foot = (b, s) => {                                     // talon, pointe et dessus de la semelle de la chaussure
  const ank = b.W(s + 'Foot'), ball = b.W(s + 'ToeBase'), tip = b.W(s + 'Toe_End') || ball.clone().add(ball.clone().sub(ank).multiplyScalar(0.5));
  const fw = ball.clone().sub(ank); fw.sub(b.up.clone().multiplyScalar(fw.dot(b.up))).normalize();
  const solY = Math.min(ball.dot(b.up), tip.dot(b.up)) - 0.005;
  const flat = (p, h) => p.clone().sub(b.up.clone().multiplyScalar(p.dot(b.up) - solY - h));
  return { ank, ball, tip, fw, heel: flat(ank.clone().sub(fw.clone().multiplyScalar(0.07)), 0), flat };
};
function plante(b, api, s, f) {                             // hauteur de la plante du pied (pied nu) au-dessus du plan « flat » du pied, mesurée par lancer de rayon puis mise en cache
  const R = (api._plante = api._plante || {}); if (R[s] != null) return R[s];
  const skins = (api._skin && api._skin.skins) || api.rig.meshes.filter((m) => /body/i.test(m.name)), rc = new THREE.Raycaster(), hs = [];
  for (const t of [0.25, 0.5, 0.8]) { const p = f.ank.clone().lerp(f.ball, t); rc.set(p.clone().sub(b.up.clone().multiplyScalar(0.12)), b.up.clone()); rc.far = 0.12;
    const h = rc.intersectObjects(skins, false)[0]; if (h) hs.push(h.point.dot(b.up)); }
  const solY = f.flat(f.ball, 0).dot(b.up); R[s] = hs.length ? Math.min(...hs) - solY : 0.021; return R[s];   // pas de pied sous la chaussure (patient homme) : dans la chaussure
}
const forearm = (b, s, t, lift = 0.035, around = 0) => {     // point de l'avant-bras à la fraction t (0 = poignet, 1 = coude), face antérieure (paume) ou tournée de « around » rad
  const w = b.W(s + 'Hand'), e = b.W(s + 'ForeArm'), ax = e.clone().sub(w).normalize(), hq = b.rig.bones[s + 'Hand'].getWorldQuaternion(new THREE.Quaternion());
  let n = b.rig.palmL[s].clone().applyQuaternion(hq); n.sub(ax.clone().multiplyScalar(n.dot(ax))).normalize();   // normale côté paume (face antérieure)
  if (around) n.applyAxisAngle(ax, around);
  return { p: w.clone().lerp(e, t).add(n.clone().multiplyScalar(lift)), n, ax, w, e };
};

const forearmSkin = (b, api, s, t, extra = 0) => {         // comme forearm, mais posé sur la vraie peau (rayon mesuré une fois par lancer de rayon, mis en cache)
  const key = s + ':' + t, R = (api._rayAB = api._rayAB || {});
  if (R[key] == null) {
    const F = forearm(b, s, t, 0), rc = new THREE.Raycaster(), skins = (api._skin && api._skin.skins) || api.rig.meshes.filter((m) => /body/i.test(m.name));
    rc.set(F.p.clone().add(F.n.clone().multiplyScalar(0.12)), F.n.clone().negate()); rc.far = 0.12;
    const h = rc.intersectObjects(skins, false)[0]; R[key] = h ? 0.12 - h.distance : 0.025;
  }
  return forearm(b, s, t, R[key] + extra);
};

/* ---------- postures des scènes (repère du modèle, comme les gestes d'avatar.js) ---------- */
const TABLE_Y = 0.185;
const armOnTable = (palmUp) => (D, s, o) => s === 'Left'
  ? (palmUp === 'side' ? { w: P(o, 0.19, D.hipsY + TABLE_Y + 0.03, 0.36), pole: P(o, 0.5, -1, -0.4), fing: V3(-o * 0.15, -0.05, 1), palm: P(o, -1, -0.15, 0), curl: 0.45, thumb: -0.2 }   // main sur le bord cubital, pouce vers le haut
    : { w: P(o, 0.2, D.hipsY + TABLE_Y, 0.37), pole: P(o, 0.35, -1, -0.45), fing: V3(0, -0.05, 1), palm: V3(0, palmUp ? 1 : -1, 0), curl: palmUp ? 0.3 : 0.15, thumb: 0.1 })
  : { w: P(o, 0.13, D.hipsY + TABLE_Y, 0.36), pole: P(o, 0.6, -1, -0.3), fing: P(o, -0.4, -0.1, 1), palm: V3(0, -1, 0), curl: 0.3 };
const handsDown = (D, s, o) => ({ w: P(o, D.hx(D.hipsY) + 0.06, D.hipsY + 0.02, -0.01), pole: P(o, 0.3, 0, -1), fing: V3(0, -1, 0), palm: P(o, -1, 0, 0), curl: 0.25 });
const handsOnThighs = (D, s, o) => ({ w: P(o, 0.13, D.hipsY + 0.06, 0.3), pole: P(o, 0.6, -0.4, -0.6), fing: V3(0, -0.3, 1), palm: V3(0, -1, 0), curl: 0.3 });   // assis, mains posées sur les cuisses

/* ---------- catalogue ---------- */
const COLLARS = [   // source : 4 tailles du set (cm), centre de l'anneau, bas/haut, direction de la mentonnière (degrés dans le plan xz)
  { c: [-492.4, -475.7], y: [-4.2, 10.2], a: 68, h: 11.9, nom: 'Taille 1 (jaune)' },
  { c: [-514.3, -497.3], y: [-4.9, 10.8], a: 80, h: 12.7, nom: 'Taille 2 (bleu)' },
  { c: [-513.2, -467.3], y: [-5.1, 11.1], a: 24, h: 13.3, nom: 'Taille 3 (orange)' },
  { c: [-488.7, -499.9], y: [-5.5, 11.4], a: 36, h: 13.6, nom: 'Taille 4 (vert)' },
];
export const ITEMS = {
  pouce: {
    label: 'Orthèse du pouce (gauche)', file: 'orthese_pouce.glb', consigne: "Placez l'orthèse de pouce sur la bonne main.",
    stage: { seat: 1, table: true, arms: armOnTable('side'), cam: { pos: [0.02, 1.0, 0.95], look: [0.17, 0.76, 0.4] } },
    zones: { main_G: { label: 'Main gauche', at: (b) => b.W('LeftHandThumb1').lerp(b.W('LeftHand'), 0.4) }, main_D: { label: 'Main droite', at: (b) => b.W('RightHandThumb1').lerp(b.W('RightHand'), 0.4) } },
    pieces: [{ id: 'orthese', node: 'orthese', label: 'Orthèse de pouce', ok: ['main_G'],
      faux: { main_D: "Cette orthèse est moulée pour une main gauche : sur la main droite, le pouce ne rentre pas dans le fourreau." },
      obj: { A: V3(23.6, 82.1, 23.8), B: V3(-5.7, 2.2, -5.2), up: V3(5.8, 37.4, 7.0) }, axisUp: true, roll: 0,
      fit: (b) => { const ip = b.W('LeftHandThumb3'), wr = b.W('LeftHand').add(b.W('LeftHand').sub(b.W('LeftForeArm')).normalize().multiplyScalar(-0.015));
        return { A: ip, B: wr, up: b.W('LeftHandThumb2').sub(b.W('LeftHandIndex1')) }; }, scale: 0.00112 }],
  },
  releveur: {
    label: 'Orthèse cheville-pied (releveur)', file: 'releveur.glb', consigne: "Mettez le releveur sur la jambe atteinte (pied qui tombe, côté gauche).", shoesGhost: true,
    stage: { seat: 1, table: false, arms: handsOnThighs, knee: 1.45, drop: 0.36, cam: { pos: [0.95, 0.58, 1.3], look: [0.06, 0.26, 0.42] } },
    zones: { jambe_G: { label: 'Jambe gauche', at: (b) => b.W('LeftLeg').lerp(b.W('LeftFoot'), 0.55) }, jambe_D: { label: 'Jambe droite', at: (b) => b.W('RightLeg').lerp(b.W('RightFoot'), 0.55) },
      genou_G: { label: 'Genou gauche', at: (b) => b.W('LeftLeg') } },
    pieces: [{ id: 'releveur', node: 'releveur', label: 'Releveur', ok: ['jambe_G'],
      faux: { jambe_D: "Le déficit des releveurs est à gauche dans ce cas : l'orthèse se met du côté du pied qui tombe.", genou_G: "C'est une orthèse cheville-pied (releveur) : elle tient la cheville à angle droit, elle ne s'arrête pas au genou." },
      obj: { A: V3(0, -0.93, -0.66), B: V3(0, 0.9, -0.55), up: V3(0, 0, 1) },
      fit: (b) => { const f = foot(b, 'Left'), k = b.W('LeftLeg'), top = k.clone().lerp(b.W('LeftFoot'), 0.13).sub(f.fw.clone().multiplyScalar(0.06));
        return { A: f.heel.clone().add(f.fw.clone().multiplyScalar(0.02)), B: top, up: f.fw }; }, scale: { k: 1 } }],
  },
  semelles: {
    label: 'Semelles orthopédiques', file: 'semelles.glb', consigne: "Placez chaque semelle sous le bon pied (gauche / droite) : talon calé, arche sous la voûte plantaire.", shoesGhost: true, hideFemme: ['Shoes'],
    stage: { seat: 1, table: false, arms: handsOnThighs, knee: 1.45, drop: 0.36, cam: { pos: [0.62, 0.36, 0.95], look: [0.02, 0.05, 0.52] } },
    zones: { pied_G: { label: 'Pied gauche', at: (b) => b.W('LeftToeBase').lerp(b.W('LeftFoot'), 0.5) }, pied_D: { label: 'Pied droit', at: (b) => b.W('RightToeBase').lerp(b.W('RightFoot'), 0.5) } },
    pieces: ['G', 'D'].map((c) => { const s = c === 'G' ? 'Left' : 'Right', x0 = c === 'G' ? -0.133 : 0.0;
      return { id: 'semelle_' + c, node: 'semelle_' + c, label: 'Semelle ' + (c === 'G' ? 'gauche' : 'droite'), ok: ['pied_' + c],
        faux: { ['pied_' + (c === 'G' ? 'D' : 'G')]: "Mauvais pied : l'arche de la semelle (le soutien de la voûte plantaire) doit se trouver du côté interne du pied." },
        obj: { A: V3(x0, 0.0, -0.01), B: V3(x0 + 0.005, 0.0, -0.27), up: V3(0, 1, 0) },
        fit: (b, z, api) => { const f = foot(b, s), h = plante(b, api, s, f) - 0.003; return { A: f.flat(f.heel.clone().add(f.fw.clone().multiplyScalar(0.005)), h), B: f.flat(f.tip.clone().sub(f.fw.clone().multiplyScalar(0.02)), h), up: b.up }; }, scale: { k: 1 } }; }),
  },
  collier: {
    label: 'Collier cervical', file: 'colliers.glb', consigne: "Choisissez la taille adaptée et placez le collier.", headLock: true, hide: ['hood'],
    stage: { seat: 0, arms: handsDown, cam: { pos: [0.42, 1.55, 0.95], look: [0, 1.45, 0.02] } },
    zones: { cou: { label: 'Cou', at: (b) => b.W('Neck').lerp(b.W('Head'), 0.3) }, tete: { label: 'Tête', at: (b) => b.W('Head').add(b.up.clone().multiplyScalar(0.1)) } },
    pieces: COLLARS.map((k, i) => ({ id: 'collier_' + (i + 1), node: 'collier_' + (i + 1), label: k.nom, ok: ['cou'], taille: i + 1, h: k.h,
      faux: { tete: "Le collier se place autour du cou : appui sous le menton et sur le haut du thorax et des épaules." },
      obj: { A: V3(k.c[0], k.y[1], k.c[1]), B: V3(k.c[0], k.y[0], k.c[1]), up: V3(Math.cos(k.a * Math.PI / 180), 0, Math.sin(k.a * Math.PI / 180)) },
      fit: (b, z, api) => { const n = b.W('Neck'), base = b.toW(V3(0, b.D.shoulderY - (api.femme ? 0.011 : 0.026), 0)).setX(n.x).setZ(n.z).add(b.fwd.clone().multiplyScalar(api.femme ? 0.006 : 0.012));   // bas du collier sur le haut du thorax, quel que soit le modèle
        return { A: base, B: base.clone().add(b.up), up: b.fwd }; }, scale: (b, api) => (api.femme ? { s: 0.0088, xz: 0.84 } : { s: 0.01, xz: 0.9 }) })),
    single: true,
  },
  stomie: {
    label: 'Poche de stomie', file: 'stomie.glb', consigne: "Colostomie gauche : placez l'appareillage sur la stomie.", hide: ['Sweatshirt'],
    stage: { seat: 0, arms: handsDown, cam: { pos: [0.18, 1.06, 0.95], look: [0, 0.98, 0.05] } },
    zones: {
      FIG: { label: 'Fosse iliaque gauche', at: (b) => surfW(b, b.D.hipsY + 0.03, 0.55, 'Left').c },
      FID: { label: 'Fosse iliaque droite', at: (b) => surfW(b, b.D.hipsY + 0.03, 0.55, 'Right').c },
      ombilic: { label: 'Ombilic', at: (b) => surfW(b, b.D.hipsY + 0.12, 0, 'Left').c },
    },
    pieces: [{ id: 'poche', nodes: ['poche', 'support', 'collerette', 'papier'], dropOnPlace: ['papier'], label: 'Poche de stomie', ok: ['FIG'],
      faux: { FID: "Une colostomie gauche (côlon descendant ou sigmoïde) se situe dans la fosse iliaque gauche ; à droite, ce serait plutôt une iléostomie.", ombilic: "La stomie n'est pas à l'ombilic : elle est dans la fosse iliaque, sous la ceinture." },
      obj: { A: V3(-0.633, 8.586, -8.28), B: V3(-0.633, 9.586, -8.28), up: V3(0, 0, -1) },
      fit: (b, zone) => { const s = zone === 'FID' ? 'Right' : 'Left', S = surfW(b, b.D.hipsY + 0.03, 0.55, s); const A = S.c.clone().add(S.n.clone().multiplyScalar(0.004));
        return { A, B: A.clone().add(b.up), up: S.n }; }, scale: 0.01 }],
  },
  perfusion: {
    label: 'Matériel de perfusion', file: 'perfusion.glb', consigne: "Préparez la perfusion : bracelet, cathéter court, poche sur la potence.", pole: true,
    stage: { seat: 1, table: true, arms: armOnTable(true), cam: { pos: [0.85, 1.38, 1.8], look: [0.25, 1.08, 0.3] } },
    zones: {
      poignet_D: { label: 'Poignet droit', at: (b) => b.W('RightHand').lerp(b.W('RightForeArm'), 0.12) },
      avantbras_G: { label: 'Avant-bras gauche', at: (b) => forearm(b, 'Left', 0.45).p },
      coude_G: { label: 'Pli du coude gauche', at: (b) => forearm(b, 'Left', 0.95).p },
      potence: { label: 'Potence', at: (b, api) => api._pole ? api._pole.hook.clone().add(V3(0, -0.2, 0)) : null },
    },
    pieces: [
      { id: 'bracelet', nodes: ['bracelet'], label: "Bracelet d'identification", ok: ['poignet_D', 'avantbras_G'], wrap: { r: 0.043, turns: 1.05 },
        faux: { coude_G: "Le bracelet d'identification se met au poignet." , potence: "Le bracelet identifie le patient : il se met à son poignet." },
        obj: { A: V3(0, 0, 0), B: V3(0, 0, 1), up: V3(1, 0, 0) },
        fit: (b, zone) => { const s = zone === 'avantbras_G' ? 'Left' : 'Right', w = b.W(s + 'Hand'), e = b.W(s + 'ForeArm'), A = w.clone().lerp(e, 0.06);
          return { A, B: A.clone().add(e.clone().sub(w)), up: b.up }; }, scale: 1 },
      { id: 'catheter', nodes: ['catheter'], dropOnPlace: ['Cath_case', 'blue_thingy'], label: 'Cathéter court', ok: ['avantbras_G'],
        faux: { coude_G: "On évite le pli du coude pour un cathéter de perfusion : la flexion le coude et le déloge. Préférez l'avant-bras.", poignet_D: "Le poignet est une zone mobile et douloureuse : choisissez une veine droite de l'avant-bras.", potence: "Le cathéter va dans une veine du patient." },
        obj: { A: V3(0, -0.285, -0.585), B: V3(0, -0.285, -0.45), up: V3(1, 0, 0) },
        fit: (b) => { const F = forearm(b, 'Left', 0.42, 0.032); return { A: F.p, B: F.p.clone().add(F.ax), up: F.n }; }, scale: 1 },
      { id: 'poche', nodes: ['poche'], label: 'Poche de soluté', ok: ['potence'],
        faux: { avantbras_G: "La poche se suspend en hauteur à la potence, au-dessus du cœur, pour que le soluté s'écoule.", coude_G: "La poche se suspend à la potence.", poignet_D: "La poche se suspend à la potence." },
        obj: { A: V3(0.024, 0.5, -0.548), B: V3(0.024, 0.044, -0.548), up: V3(1, 0, 0) },
        fit: (b, zone, api) => { const h = api._pole.hook; return { A: h.clone().add(V3(0, -0.02, 0)), B: h.clone().add(V3(0, -1, 0)), up: api.camera.position.clone().sub(h).setY(0).normalize() }; }, scale: 0.62 },
    ],
  },
};
function surfW(b, y, ang, s) {                              // point de surface du tronc (via surf d'avatar.js recopié pour rester indépendant), en monde
  const D = b.D, o = b.rig.out[s], rx = D.hx(y), zf = D.zf(y), zb = D.zb(y), zc = (zf + zb) / 2, rz = Math.max((zf - zb) / 2, 0.05);
  const c = V3(o * rx * Math.sin(ang), y, zc + rz * Math.cos(ang)), n = V3(o * Math.sin(ang) / rx, 0, Math.cos(ang) / rz).normalize();
  return { c: b.toW(c), n: b.dirW(n) };
}

/* ---------- le bracelet est modélisé à plat : on l'enroule autour d'un axe ---------- */
function wrapGeometry(obj, { r, turns }) {                // bande plate → anneau d'axe z, centré sur l'origine
  obj.updateMatrixWorld(true);
  const pts = []; obj.traverse((m) => { if (m.isMesh) { const pa = m.geometry.attributes.position; for (let i = 0; i < pa.count; i++) pts.push(V3(0, 0, 0).fromBufferAttribute(pa, i).applyMatrix4(m.matrixWorld)); } });
  const box = new THREE.Box3().setFromPoints(pts), size = box.getSize(V3(0, 0, 0)), ctr = box.getCenter(V3(0, 0, 0));
  const ax = ['x', 'y', 'z'].sort((a, b) => size[b] - size[a]), L = ax[0], Wd = ax[1], T = ax[2], len = size[L];   // longueur, largeur, épaisseur
  obj.traverse((m) => { if (!m.isMesh) return; const g = m.geometry.clone(), pa = g.attributes.position, p = V3(0, 0, 0), Mi = m.matrixWorld.clone().invert();
    for (let i = 0; i < pa.count; i++) { p.fromBufferAttribute(pa, i).applyMatrix4(m.matrixWorld);
      const t = (p[L] - box.min[L]) / len * Math.PI * 2 * turns, rr = r + (p[T] - ctr[T]), w = p[Wd] - ctr[Wd];
      p.set(rr * Math.cos(t), rr * Math.sin(t), w).applyMatrix4(Mi); pa.setXYZ(i, p.x, p.y, p.z); }
    g.computeVertexNormals(); g.computeBoundingSphere(); g.computeBoundingBox(); m.geometry = g; });
}

/* ---------- module ---------- */
export function createEquip(api, opts = {}) {
  const base = opts.base || 'equip/', loader = new GLTFLoader().setDRACOLoader(new DRACOLoader().setDecoderPath(opts.draco || 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/draco/'));
  const cache = {}, scene = api.scene, camera = api.camera, canvas = api.canvas, el = canvas.parentElement;
  let cur = null, held = null, placed = [], markers = [], listeners = [], ui = null, msgT = 0;
  const emit = (e) => { e.t = performance.now(); listeners.forEach((f) => f(e)); };
  async function loadItem(id, item) {                     // fichier .glb (à côté de la page) et/ou objets dessinés ; si le fichier manque, on dessine une version simple
    if (cache[id]) return cache[id];
    const g = new THREE.Group(); let ok = !item.file;
    if (item.file) { try { g.add((await loader.loadAsync(base + item.file)).scene); ok = true; } catch (e) { console.warn('Objet 3D absent :', base + item.file); } }
    for (const [n, f] of Object.entries(item.multi || {})) {                       // scènes à plusieurs fichiers : chaque fichier sous un nœud nommé
      const w = new THREE.Group(); w.name = n;
      try { w.add((await loader.loadAsync(base + f)).scene); } catch (e) { console.warn('Objet 3D absent :', base + f); const o = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.03, 0.04), new THREE.MeshStandardMaterial({ color: 0x9a9a9a })); w.add(o); }
      g.add(w);
    }
    for (const [n, mk] of Object.entries(item.procs || {})) { const o = mk(THREE); o.name = n; g.add(o); }
    if (!ok) for (const [n, mk] of Object.entries(item.fallback || {})) { const o = mk(THREE); o.name = n; g.add(o); }
    if (!ok && !item.fallback && !item.procs) { const o = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.06), new THREE.MeshStandardMaterial({ color: 0x999999 })); o.name = 'absent'; g.add(o); }
    if (item.prep) item.prep(g, THREE);
    g.updateMatrixWorld(true); return (cache[id] = g);
  }
  const cloneAt = (o) => { o.updateWorldMatrix(true, false); const c = o.clone(true); o.matrixWorld.decompose(c.position, c.quaternion, c.scale); c.updateMatrix(); return c; };   // copie avec la transformation complète (échelle des parents comprise)
  const AXV = (a) => { const v = V3(0, 0, 0); v[a[1]] = a[0] === '-' ? -1 : 1; return v; };

  // --- interface (plateau, message) : éléments HTML posés sur la scène ---
  function buildUI() {
    ui = document.createElement('div'); ui.className = 'eq-ui';
    ui.innerHTML = `<style>
      .eq-ui{position:absolute;inset:0;pointer-events:none;font:14px/1.35 system-ui,sans-serif;color:#fff}
      .eq-tray{position:absolute;left:12px;right:12px;bottom:12px;display:flex;gap:8px;flex-wrap:wrap;pointer-events:auto}
      .eq-card{background:rgba(15,25,22,.82);border:1px solid rgba(255,255,255,.25);border-radius:10px;padding:8px 12px;cursor:grab;user-select:none;touch-action:none}
      .eq-card.done{opacity:.45;cursor:default} .eq-card.held{outline:2px solid #ffd166}
      .eq-head{position:absolute;left:12px;top:12px;right:12px;display:flex;justify-content:space-between;gap:8px;align-items:flex-start}
      .eq-cons{background:rgba(15,25,22,.82);border-radius:10px;padding:8px 12px;max-width:70%}
      .eq-btn{pointer-events:auto;background:rgba(15,25,22,.82);color:#fff;border:1px solid rgba(255,255,255,.3);border-radius:8px;padding:6px 10px;cursor:pointer}
      .eq-msg{position:absolute;left:50%;top:22%;transform:translateX(-50%);max-width:min(560px,86%);padding:10px 14px;border-radius:10px;background:rgba(15,25,22,.9);opacity:0;transition:opacity .25s}
      .eq-msg.ok{border-left:4px solid #3ecf8e}.eq-msg.ko{border-left:4px solid #ff6b6b}.eq-msg.on{opacity:1}
      .eq-zone{position:absolute;transform:translate(-50%,-50%);width:46px;height:46px;border-radius:50%;border:2px dashed rgba(255,209,102,.9);background:rgba(255,209,102,.12);opacity:0;transition:opacity .2s,transform .2s}
      .eq-zone span{position:absolute;top:50px;left:50%;transform:translateX(-50%);white-space:nowrap;font-size:12px;background:rgba(15,25,22,.8);padding:1px 6px;border-radius:6px}
      .eq-zone.show{opacity:1}.eq-zone.hot{transform:translate(-50%,-50%) scale(1.25);background:rgba(255,209,102,.35)}
      .eq-ghost{position:absolute;pointer-events:none;transform:translate(-50%,-50%);background:#ffd166;color:#222;border-radius:8px;padding:4px 8px;font-size:12px;display:none}
      .eq-choix{position:absolute;inset:0;pointer-events:auto;background:rgba(8,14,12,.55);display:flex;align-items:center;justify-content:center;z-index:5}
      .eq-ch-box{background:#14211c;border:1px solid #37c48f;border-radius:12px;padding:14px 16px;max-width:min(430px,92%);max-height:88%;overflow:auto;box-shadow:0 8px 30px #0008}
      .eq-ch-aide{font-size:12.5px;color:#cfe;margin:6px 0 4px}.eq-ch-aide table{border-collapse:collapse;margin:6px 0;font:12px ui-monospace,monospace}.eq-ch-aide td,.eq-ch-aide th{border:1px solid #3a5248;padding:2px 6px;text-align:center}
      .eq-ch-l{margin:10px 0 4px;font-weight:600}.eq-ch-o{display:flex;flex-wrap:wrap;gap:6px}.eq-ch-o button{background:#22332c;color:#fff;border:1px solid #4a6a5d;border-radius:8px;padding:5px 11px;cursor:pointer;font:inherit}
      .eq-ch-o button.on{background:#ffd166;color:#222;border-color:#ffd166}.eq-ch-act{display:flex;justify-content:flex-end;gap:8px;margin-top:12px}.eq-val:disabled{opacity:.45}
      .eq-badge{position:absolute;transform:translate(-50%,-130%);background:#0d1613e6;color:#7dffc0;border:1px solid #37c48f;border-radius:8px;padding:4px 10px;font:600 15px/1.2 ui-monospace,monospace;white-space:nowrap}
    </style><div class="eq-head"><div class="eq-cons"></div><button class="eq-btn eq-reset">Tout retirer</button></div><div class="eq-zones"></div><div class="eq-msg"></div><div class="eq-ghost"></div><div class="eq-badges"></div><div class="eq-tray"></div>`;
    el.append(ui); ui.querySelector('.eq-reset').onclick = () => reset();
  }
  const say = (txt, ok) => { const m = ui.querySelector('.eq-msg'); m.textContent = txt; m.className = 'eq-msg on ' + (ok ? 'ok' : 'ko'); clearTimeout(msgT); msgT = setTimeout(() => m.classList.remove('on'), 4500); };

  function zoneScreen(z) { const p = z.world && z.world.clone().project(camera), r = canvas.getBoundingClientRect(); return p ? { x: (p.x + 1) / 2 * r.width, y: (1 - p.y) / 2 * r.height, vis: p.z < 1 } : null; }
  function zoneAt(x, y) { let best = null, bd = 60; for (const z of markers) { const s = zoneScreen(z); if (!s) continue; const d = Math.hypot(s.x - x, s.y - y); if (d < bd) { bd = d; best = z; } } return best; }

  // --- prise et dépôt d'une pièce ---
  function grab(piece, card, ev) {
    if (card.classList.contains('done')) return; held = { piece, card }; card.classList.add('held');
    const g = ui.querySelector('.eq-ghost'); g.textContent = piece.label; g.style.display = 'block'; move(ev);
    markers.forEach((z) => z.dom.classList.add('show'));
  }
  function move(ev) { if (!held) return; const r = canvas.getBoundingClientRect(), x = ev.clientX - r.left, y = ev.clientY - r.top, g = ui.querySelector('.eq-ghost');
    g.style.left = x + 'px'; g.style.top = y + 'px'; const z = zoneAt(x, y); markers.forEach((m) => m.dom.classList.toggle('hot', m === z)); }
  async function drop(ev) {
    if (!held) return; const r = canvas.getBoundingClientRect(), z = zoneAt(ev.clientX - r.left, ev.clientY - r.top), { piece, card } = held;
    held = null; card.classList.remove('held'); ui.querySelector('.eq-ghost').style.display = 'none'; markers.forEach((m) => m.dom.classList.remove('show', 'hot'));
    if (!z) return; return deposer(piece, card, z);
  }
  async function deposer(piece, card, z) {
    const ok = piece.ok.includes(z.id); emit({ type: 'depot', objet: cur.id, piece: piece.id, zone: z.id, ok, pieceLabel: piece.label, zoneLabel: z.label });
    if (!ok) { say((piece.faux && piece.faux[z.id]) || `Pas ici : ${piece.label.toLowerCase()} ne se place pas sur « ${z.label} ».`, false); return; }
    if (piece.repeat) { mesurer(piece, z); return; }                 // mètre ruban : plusieurs mesures, la carte reste disponible
    if (piece.requiert && !piece.requiert.every((k) => cur.mesures && cur.mesures[k] != null)) {   // taille choisie sans avoir mesuré
      say(piece.requiertMsg || 'Prenez d\'abord les mesures.', false); emit({ type: 'sans_mesure', objet: cur.id, piece: piece.id, pieceLabel: piece.label }); return; }
    let ch = null;
    if (piece.choix) { const id0 = cur.id; ch = await choisir(piece.choix); if (!ch || !cur || cur.id !== id0) return; }
    place(piece, z.id, true); card.classList.add('done');
    if (cur.single) ui.querySelectorAll('.eq-card').forEach((c) => c.classList.add('done'));
    afterPlace(piece, z, ch);
    if (placed.length === cur.pieces.length || cur.single) emit({ type: 'fin', objet: cur.id });
  }

  function afterPlace(piece, z, ch) {                         // résultat du geste : message, valeur affichée, élément retiré, texte transmis au chat
    const P = placed[placed.length - 1], res = piece.after ? piece.after(cur.ctx || {}, api, P) : null;
    const fb = ch || (cur.check && cur.check(piece, api)); say(ch ? ch.txt : (res && res.msg) || (fb ? fb.txt : `${piece.label} : bien placé.`), fb ? fb.ok : true);
    if (ch) { emit({ type: 'taille', objet: cur.id, piece: piece.id, label: piece.label, ok: ch.ok, sens: ch.sens || null, choix: ch.resume });
      if (res) res.geste = (res.geste || piece.label) + ` (${ch.resume} ; ${ch.ok ? 'taille adaptée' : ch.sens === 'petit' ? 'trop petit pour ses mesures' : ch.sens === 'grand' ? 'trop grand pour ses mesures' : 'choix inadapté'})`; }
    if (res && res.badge) badge(res.badge, P);
    if (res && res.remove) res.remove.forEach(removeProp);
    if (res && res.extra) (cur._extra = cur._extra || []).push(res.extra);
    emit({ type: 'geste', objet: cur.id, piece: piece.id, zone: z.id, texte: (res && res.geste) || `${piece.label} placé : ${z.label.toLowerCase()}` });
  }
  function mesurer(piece, z) {                              // une mesure au mètre ruban : valeur, anneau autour du membre, texte transmis au chat
    const v = piece.mesure(cur.ctx || {}, z.id), nom = piece.nom || z.label.split(' (')[0]; (cur.mesures = cur.mesures || {})[piece.cle || z.id] = v;
    const old = badges.findIndex((b) => b.z && b.z.id === z.id); if (old >= 0) { badges[old].dom.remove(); badges.splice(old, 1); }
    const d = document.createElement('div'); d.className = 'eq-badge'; d.textContent = `${nom} : ${String(v).replace('.', ',')} cm`; ui.querySelector('.eq-badges').append(d); badges.push({ dom: d, z, world: null });
    const ring = piece.ring && piece.ring(api, z.id); if (ring) (cur._extra = cur._extra || []).push(ring);
    say(`${piece.nom || z.label} : ${String(v).replace('.', ',')} cm.`, true);
    emit({ type: 'geste', objet: cur.id, piece: piece.id, zone: z.id, texte: `mesure au mètre ruban, ${(piece.nom || z.label).toLowerCase()} : ${String(v).replace('.', ',')} cm` });
  }
  function choisir(ch) {                                     // choix de la taille (et de la classe) d'après les mesures et le tableau du fabricant
    return new Promise((res) => {
      const m = document.createElement('div'), sel = {}; m.className = 'eq-choix';
      m.innerHTML = `<div class="eq-ch-box"><b>${ch.titre}</b><div class="eq-ch-aide">${ch.aide(cur.ctx || {}, cur.mesures || {})}</div>` +
        ch.champs.map((c) => `<div class="eq-ch-l">${c.label}</div><div class="eq-ch-o" data-c="${c.id}">${c.options.map((o) => `<button type="button" data-v="${o}">${o}</button>`).join('')}</div>`).join('') +
        `<div class="eq-ch-act"><button type="button" class="eq-btn eq-ann">Annuler</button><button type="button" class="eq-btn eq-val" disabled>Valider</button></div></div>`;
      ui.append(m); const val = m.querySelector('.eq-val');
      m.querySelectorAll('.eq-ch-o').forEach((g) => g.querySelectorAll('button').forEach((b) => b.onclick = () => {
        g.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); sel[g.dataset.c] = b.dataset.v; val.disabled = ch.champs.some((c) => !sel[c.id]); }));
      m.querySelector('.eq-ann').onclick = () => { m.remove(); res(null); };
      val.onclick = () => { m.remove(); res(ch.juger(sel, cur.ctx || {}, cur.mesures || {})); };
    });
  }
  function place(piece, zone, animate) {
    if (piece.wear) {                                       // pièce portée : couche du modèle révélée (bas, ceinture, prothèse…)
      const n = typeof piece.wear === 'function' ? piece.wear(cur.ctx || {}) : piece.wear; api.porter && api.porter(n, true);
      const holder = new THREE.Group(); scene.add(holder); const P = { piece, zone, holder, t0: 0, from: null, g: holder, wear: n }; placed.push(P); return P;
    }
    const src = cur.model, g = new THREE.Group(), names = piece.nodes || [piece.node];
    for (const n of names) { const o = src.getObjectByName(n); if (o) g.add(cloneAt(o)); }
    g.updateMatrixWorld(true);
    if (piece.wrap) wrapGeometry(g, piece.wrap);
    for (const n of piece.dropOnPlace || []) g.traverse((o) => { if (o.name === n || (o.name || '').startsWith(n)) o.visible = false; });
    g.traverse((o) => { if (o.isMesh) { o.frustumCulled = false; o.castShadow = false; } });
    const holder = new THREE.Group(); holder.matrixAutoUpdate = false; holder.add(g); scene.add(holder);
    const P = { piece, zone, holder, t0: animate ? performance.now() : 0, from: null, g };
    if (piece.pose) poseLandmarks(P, g, piece.pose);
    if (animate) {                                          // l'objet arrive depuis la caméra
      const s = typeof piece.scale === 'number' ? piece.scale : 1, f = camera.position.clone().add(camera.getWorldDirection(V3(0, 0, 0)).multiplyScalar(0.45)).add(V3(0, -0.12, 0));
      P.from = new THREE.Matrix4().compose(f, camera.quaternion.clone(), V3(s, s, s)); }
    placed.push(P); return P;
  }
  function update() {                                       // à chaque image : suit le corps
    if (!cur) return; api.root.updateMatrixWorld(true);
    const b = body(api);
    const rr = canvas.getBoundingClientRect(); let hors = false;
    for (const z of markers) { z.world = z.at(b, api); const s = zoneScreen(z); if (s) { z.dom.style.left = s.x + 'px'; z.dom.style.top = s.y + 'px'; if (!s.vis || s.x < 46 || s.x > rr.width - 46 || s.y < 70 || s.y > rr.height - 90) hors = true; } }
    const now = performance.now(); cur.horsT = hors ? cur.horsT || now : 0;   // on attend la fin du changement de posture, et une zone hors cadre pendant plus d'une demi-seconde
    if (hors && now - (cur.t0 || 0) > 1800 && now - cur.horsT > 600 && cur.cam0 && (cur.zoom || 1) < 1.7) {                // une zone sort du cadre : la caméra recule doucement
      cur.zoom = (cur.zoom || 1) * 1.025; const c0 = cur.cam0; api.stage.cam = { pos: c0.look.clone().add(c0.pos.clone().sub(c0.look).multiplyScalar(cur.zoom)), look: c0.look.clone() }; }
    api._placed = placed;
    for (const p of placed) {
      if (p.wear) continue;
      const pc = p.piece, M = pc.pose ? poseMatrix(p, b) : fitMatrix(pc.obj, pc.fit(b, p.zone, api), typeof pc.scale === 'function' ? pc.scale(b, api) : pc.scale);
      if (pc.spin && !p.from) { const k = (performance.now() - p.t0) / 1000; if (k < pc.spin.dur) M.multiply(new THREE.Matrix4().makeRotationAxis(p.axis, Math.sin(k * pc.spin.f) * pc.spin.a)); }
      if (p.from) { const k = Math.min(1, (performance.now() - p.t0) / 700), e = 1 - Math.pow(1 - k, 3); const a = new THREE.Vector3(), qa = new THREE.Quaternion(), sa = new THREE.Vector3(), bb = new THREE.Vector3(), qb = new THREE.Quaternion(), sb = new THREE.Vector3();
        p.from.decompose(a, qa, sa); M.decompose(bb, qb, sb); M.compose(a.lerp(bb, e), qa.slerp(qb, e), sa.lerp(sb, e)); if (k >= 1) p.from = null; }
      p.holder.matrix.copy(M); p.holder.matrixWorldNeedsUpdate = true;
    }
    for (const pr of props) { pr.holder.matrix.copy(poseMatrix(pr, b)); pr.holder.matrixWorldNeedsUpdate = true; }
    for (const bd of badges) { const w = bd.z ? (bd.z.world ? bd.z.world.clone().add(V3(0.0, 0.0, 0)) : null) : V3(0, 0, 0).setFromMatrixPosition(bd.P.holder.matrix).add(bd.lift || V3(0, 0, 0)); if (w) { bd.world = w; const sc = zoneScreen(bd); if (sc) { bd.dom.style.left = sc.x + 'px'; bd.dom.style.top = sc.y + 'px'; } } }
    if (cur.pole && api._pole) drawLine(b);
    if (cur.tick) cur.tick(b, api, placed);
  }
  // repères d'une pièce « pointée » : son axe (vers le corps) et son haut, lus sur sa boîte englobante
  function poseLandmarks(P, g, pose) {
    const box = new THREE.Box3().setFromObject(g), C = box.getCenter(V3(0, 0, 0)), size = box.getSize(V3(0, 0, 0)), ax = AXV(pose.axis), up = AXV(pose.up || '+y');
    if (pose.c) { const c = V3(...pose.c); P.obj = { A: c, B: c.clone().add(ax), up }; P.ext = 0; P.axis = ax; return; }   // point d'appui donné (centre du masque…)
    P.obj = { A: C, B: C.clone().add(ax), up }; P.ext = Math.abs(size.dot(ax)) / 2; P.axis = ax;
  }
  function poseMatrix(P, b) {
    const pc = P.piece || P, s = (pc.at || pc.pose.at)(b, P.zone, api, cur.ctx || {}); if (!s) return P.holder.matrix.clone();
    const n = s.n.clone().normalize(), A = s.p.clone().add(n.clone().multiplyScalar(P.ext + ((pc.pose && pc.pose.gap) || 0)));
    return fitMatrix(P.obj, { A, B: A.clone().sub(n), up: s.up || b.up }, 1);
  }
  // décor posé sur le patient (plaie, tique…), suit le corps
  let props = [], badges = [];
  function addProp(pr) {
    const g = new THREE.Group(); for (const n of pr.nodes || [pr.node]) { const src = cur.model.getObjectByName(n); if (src) g.add(cloneAt(src)); } if (!g.children.length) return; g.updateMatrixWorld(true);
    const holder = new THREE.Group(); holder.matrixAutoUpdate = false; holder.add(g); scene.add(holder);
    const P = { ...pr, holder, g, zone: pr.zone }; poseLandmarks(P, g, pr.pose); props.push(P);
  }
  function removeProp(name) { props = props.filter((p) => { if ((p.id || p.node) === name) { scene.remove(p.holder); return false; } return true; }); }
  function badge(txt, P) { const d = document.createElement('div'); d.className = 'eq-badge'; d.textContent = txt; ui.querySelector('.eq-badges').append(d); badges.push({ dom: d, P, world: null }); }
  // --- potence et tubulure (perfusion) ---
  let line = null;
  function makePole() {
    const g = new THREE.Group(), mat = new THREE.MeshStandardMaterial({ color: 0xb8bec6, metalness: 0.6, roughness: 0.35 });
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.6, 16), mat); rod.position.y = 0.8; g.add(rod);
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.3, 12), mat); bar.rotation.z = Math.PI / 2; bar.position.y = 1.58; g.add(bar);
    for (const x of [-0.14, 0.14]) { const h = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.004, 8, 16, Math.PI), mat); h.position.set(x, 1.56, 0); h.rotation.z = Math.PI; g.add(h); }
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.03, 5), new THREE.MeshStandardMaterial({ color: 0x3a3f46 })); foot.position.y = 0.015; g.add(foot);
    g.position.copy(api.root.localToWorld(V3(0.56, 0, 0.42))).setY(0); scene.add(g);
    api._pole = { g, hook: g.position.clone().add(V3(-0.14, 1.55, 0)) };
  }
  function drawLine(b) {
    const bag = placed.find((p) => p.piece.id === 'poche'), cat = placed.find((p) => p.piece.id === 'catheter');
    if (!bag || !cat || bag.from || cat.from) { if (line) line.visible = false; return; }
    const a = api._pole.hook.clone().add(V3(0, -0.3, 0)), F = forearm(b, 'Left', 0.42, 0.032), c = F.p.clone().sub(F.ax.clone().multiplyScalar(0.01));
    const ch = a.clone().add(V3(0, -0.09, 0)), mid = a.clone().lerp(c, 0.55); mid.y = Math.min(a.y, c.y) - 0.12;
    const curve = new THREE.CatmullRomCurve3([a, ch, mid, c.clone().add(F.ax.clone().multiplyScalar(-0.08)).add(F.n.clone().multiplyScalar(0.02)), c]);
    if (!line) { line = new THREE.Group(); const tube = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshStandardMaterial({ color: 0xdfe8ee, transparent: true, opacity: 0.75, roughness: 0.2 }));
      const drip = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.07, 16), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }));
      const film = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.07), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, side: THREE.DoubleSide }));
      line.add(tube, drip, film); line.userData = { tube, drip, film }; scene.add(line); }
    line.visible = true; const { tube, drip, film } = line.userData; tube.geometry.dispose(); tube.geometry = new THREE.TubeGeometry(curve, 64, 0.0022, 6, false);
    drip.position.copy(a.clone().add(V3(0, -0.045, 0)));
    film.position.copy(F.p.clone().add(F.n.clone().multiplyScalar(0.006))); film.lookAt(film.position.clone().add(F.n)); // pansement transparent sur le cathéter
  }

  // --- ouverture d'une scène d'objet ---
  async function open(id, ctx = {}) {
    close(); const item = ITEMS[id]; if (!item) return false;
    if (item.femme && !api.femme) { emit({ type: 'indispo', objet: id, label: item.label }); return false; }
    if (item.need && api.tenue && !api.tenue[item.need]) { emit({ type: 'besoin', objet: id, need: item.need, label: item.label }); return false; }
    cur = { id, ...item, model: await loadItem(id, item), ctx };
    if (ctx.ok) cur.pieces = cur.pieces.map((p) => ctx.ok[p.id] ? { ...p, ok: ctx.ok[p.id] } : p);    // le cas peut changer la bonne zone (ex. iléostomie → FID)
    if (id === 'collier') {                                // taille : on compare la hauteur menton–épaule du patient à la hauteur de la mentonnière
      const D = api.D, need = (D.chin.y - D.shoulderY) * 100 * (api.femme ? 1 / 0.88 : 1); let best = cur.pieces[0];   // hauteur épaule–menton (cm), ramenée à l'échelle du collier
      for (const p of cur.pieces) if (Math.abs(p.h - need) < Math.abs(best.h - need)) best = p;
      cur.check = (p) => p === best ? { ok: true, txt: `${p.label} : bonne taille, le menton repose sur l'appui sans être relevé.` }
        : { ok: false, txt: `${p.label} : ${p.h > best.h ? 'trop haut, la tête part en extension' : 'trop bas, le cou n\'est pas maintenu'}. La taille adaptée ici est la ${best.taille}.` };
    }
    const S = item.stage; api.furniture && api.furniture();
    const D = api.D || {}, KY = [[0, 0], [1.001, D.hipsY ?? 1.001], [1.101, D.waistY ?? (D.hipsY ?? 1.001) + 0.1], [1.445, D.shoulderY ?? 1.445], [1.597, D.headY ?? 1.597], [2.4, (D.headY ?? 1.597) + 0.8]];
    const mapY = (y) => { for (let i = 1; i < KY.length; i++) if (y <= KY[i][0] || i === KY.length - 1) { const [a0, b0] = KY[i - 1], [a1, b1] = KY[i], t = (y - a0) / (a1 - a0); return b0 + (b1 - b0) * t; } return y; };
    const dr = S.seat ? (S.drop ?? 0.43) : 0, cy = (v) => V3(v[0], S.lie ? v[1] : mapY(v[1] + dr) - dr, v[2]);   // cadrages réglés sur le patient homme : recalés sur les repères du modèle chargé
    api.stage = { seat: S.seat, lie: S.lie, headPitch: S.headPitch, table: S.table, knee: S.knee, ankle: S.ankle, drop: S.drop, arms: S.arms, cam: { pos: cy(S.cam.pos), look: cy(S.cam.look) }, headLock: item.headLock || S.lie };
    cur.cam0 = { pos: cy(S.cam.pos), look: cy(S.cam.look) }; cur.zoom = 1; cur.t0 = performance.now();
    for (const [k, v] of Object.entries(S.morphs || {})) api.manual[k] = v;
    for (const pr of item.props || []) addProp(pr);
    if (item.pole && !api._pole) makePole(); if (api._pole) api._pole.g.visible = !!item.pole;
    if (S.lie && !api._floor) {                               // sol (le décor n'est qu'une image de fond) et tapis, pour la scène allongée
      const f = new THREE.Group(); f.add(new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.MeshStandardMaterial({ color: 0xcfd3cc, roughness: 0.9 })));
      const tapis = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 2.1), new THREE.MeshStandardMaterial({ color: 0x2f6d8f, roughness: 0.8 })); tapis.position.set(0, 0.95, 0.004); f.add(tapis);
      f.rotation.x = -Math.PI / 2; f.position.y = 0.001; scene.add(f); api._floor = f; }
    if (api._floor) api._floor.visible = !!S.lie;
    setMeshes(item);
    canvas.style.pointerEvents = 'auto';
    if (!ui) buildUI(); ui.style.display = '';
    ui.querySelector('.eq-cons').textContent = ctx.consigne || item.consigne;
    const tray = ui.querySelector('.eq-tray'); tray.innerHTML = '';
    for (const p of cur.pieces) { const c = document.createElement('div'); c.className = 'eq-card'; c.textContent = p.label; tray.append(c);
      c.addEventListener('pointerdown', (e) => { e.preventDefault(); if (held && held.card === c) return; grab(p, c, e); }); }
    const zh = ui.querySelector('.eq-zones'); zh.innerHTML = ''; markers = Object.entries(item.zones).map(([zid, z]) => { const d = document.createElement('div'); d.className = 'eq-zone'; d.innerHTML = `<span>${z.label}</span>`; zh.append(d); return { id: zid, ...z, dom: d, world: null }; });
    api.extras.push(update); emit({ type: 'ouverture', objet: id }); return true;
  }
  function setMeshes(item) {                                // vêtements masqués ou rendus transparents selon la scène (la tenue du patient est gérée par l'avatar)
    api._eqHide = item ? [...(item.hide || []), ...(api.femme ? item.hideFemme || [] : [])] : null;
    api.manches = !!(item && item.manches);   // la patiente a des pieds sous ses chaussures : on les retire
    for (const m of api.rig.meshes) {
      if (!m.userData.mat0) m.userData.mat0 = m.material;
      if (!api.applyTenue) m.visible = !(api._eqHide && api._eqHide.some((h) => m.name.toLowerCase().includes(h.toLowerCase())));
      if (api.porte && [...api.porte].some((n) => m.name.startsWith(n))) continue;   // matériel porté : garde son matériau
      if (item && item.shoesGhost && !(api.femme && item.hideFemme) && /shoe/i.test(m.name)) { m.material = m.userData.mat0.clone(); m.material.transparent = true; m.material.opacity = 0.22; m.material.depthWrite = false; }
      else m.material = m.userData.mat0;
    }
    if (api.applyTenue) api.applyTenue();
  }
  function reset() { for (const o of (cur && cur._extra) || []) o.parent && o.parent.remove(o); if (cur) { cur._extra = []; cur.mesures = {}; } if (ui) ui.querySelectorAll('.eq-choix').forEach((m) => m.remove()); for (const p of placed) { scene.remove(p.holder); if (p.wear && api.porter && !p.keep) api.porter(p.wear, false); } placed = []; if (line) line.visible = false; badges.forEach((b) => b.dom.remove()); badges = []; for (const p of props) scene.remove(p.holder); props = []; if (cur) for (const pr of cur.props || []) addProp(pr); if (ui) ui.querySelectorAll('.eq-card').forEach((c) => c.classList.remove('done', 'held')); }
  function close() {
    for (const p of placed) p.keep = true;                   // le matériel enfilé reste porté quand on termine le geste
    reset(); if (cur) { const i = api.extras.indexOf(update); if (i >= 0) api.extras.splice(i, 1); emit({ type: 'fermeture', objet: cur.id }); }
    for (const p of props) scene.remove(p.holder); props = []; if (cur) for (const k of Object.keys((cur.stage && cur.stage.morphs) || {})) delete api.manual[k];
    cur = null; held = null; if (ui) ui.style.display = 'none'; if (api._pole) api._pole.g.visible = false; if (api._floor) api._floor.visible = false; setMeshes(null); canvas.style.pointerEvents = 'none';
  }
  window.addEventListener('pointermove', move); window.addEventListener('pointerup', (e) => { if (held && e.target.closest && e.target.closest('.eq-card')) return; drop(e); });
  canvas.addEventListener('pointerup', drop);
  return { open, close, reset, on: (f) => listeners.push(f), items: ITEMS, get current() { return cur && cur.id; }, get placed() { return placed.map((p) => ({ piece: p.piece.id, zone: p.zone })); },
    /* pour les tests : déposer une pièce sur une zone comme à la souris */ _depot: (pid, zid) => { const i = cur.pieces.findIndex((x) => x.id === pid); return deposer(cur.pieces[i], ui.querySelectorAll('.eq-card')[i], markers.find((m) => m.id === zid)); },
    /* pour les tests : placer directement une pièce */ _place: (pid, zone) => { const p = cur.pieces.find((x) => x.id === pid), zid = zone || p.ok[0]; place(p, zid, false); afterPlace(p, markers.find((m) => m.id === zid) || { id: zid, label: zid }); } };
}

export { forearm, forearmSkin, foot, surfW, armOnTable, handsDown, handsOnThighs, P, V3, body };
