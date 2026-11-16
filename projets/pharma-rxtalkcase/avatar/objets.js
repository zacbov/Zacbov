/* Gestes du pharmacien : catalogue des objets de la réserve, scènes d'application sur le patient, objets dessinés quand le fichier 3D manque.
   Chaque objet a un nom de fichier simple (dossier avatar/equip/). S'il est absent, une version dessinée le remplace (sauf mention).
   Familles : vaccination, TROD, constantes, inhalation, pansement, tique, réanimation, injection IV (hôpital), orthèses et dispositifs. */
import * as THREE from 'three';
import { ITEMS, forearm, forearmSkin, foot, surfW, armOnTable, handsDown, handsOnThighs, P, V3, body } from './equip.js';

/* ---------- repères du visage, des doigts, des bras ---------- */
function headPt(b, off) {                                    // point du visage : décalage (repère du modèle, depuis l'os de la tête) qui suit les mouvements de la tête
  const R = b.rig, hb = R.bones.Head, q = hb.getWorldQuaternion(new THREE.Quaternion()).multiply(R.restWQ.Head.clone().invert());
  return b.W('Head').add(off.clone().applyQuaternion(q));
}
const headDir = (b, d) => { const R = b.rig, q = R.bones.Head.getWorldQuaternion(new THREE.Quaternion()).multiply(R.restWQ.Head.clone().invert()); return d.clone().applyQuaternion(q).normalize(); };
const FACE0 = { front: V3(0, 0.088, 0.112), nez: V3(0, 0.02, 0.118), narine: V3(0.008, 0.0, 0.112), bouche: V3(0, -0.032, 0.108), menton: V3(0, -0.07, 0.1), oeil: V3(0.033, 0.06, 0.1), lobe: V3(0.075, -0.01, 0.0), masque: V3(0, -0.006, 0.112) };
let FACE = FACE0, faceOf = null;
function faceFor(b) {                                        // repères du visage lus sur le modèle (patient ou patiente), en décalage depuis l'os de la tête au repos
  const D = b.D; if (!D || !D.head0 || !D.mouth) return FACE0; if (faceOf === D) return FACE; faceOf = D;
  const h0 = D.head0, rel = (p, dx = 0, dy = 0, dz = 0) => p.clone().sub(h0).add(V3(dx, dy, dz)), e = D.eyes && D.eyes.find((x) => x.x > 0);
  FACE = { front: rel(D.forehead, 0, 0, 0.004), nez: rel(D.nose || D.mouth, 0, 0, 0.003), narine: rel(D.nose || D.mouth, 0.008, -0.014, -0.006), bouche: rel(D.mouth, 0, 0, 0.004), menton: rel(D.chin, 0, 0, 0.004),
    oeil: e ? rel(e, 0, 0, 0.014) : FACE0.oeil, lobe: D.lobe ? rel(D.lobe, -0.004, 0, 0) : FACE0.lobe, masque: D.nose ? rel(D.nose.clone().lerp(D.mouth, 0.5), 0, 0, 0.0) : FACE0.masque };
  return FACE;
}
const fingerTip = (b, s = 'Left') => { const t = b.W(s + 'HandIndex4') || b.W(s + 'HandIndex3'), m = b.W(s + 'HandIndex3'); return { p: t, dir: t.clone().sub(m).normalize() }; };
const deltoid = (b, s) => { const a = b.W(s + 'Arm'), e = b.W(s + 'ForeArm'), side = b.side(s), ax = e.clone().sub(a).normalize(); const n = side.clone().sub(ax.clone().multiplyScalar(side.dot(ax))).normalize();
  return { p: a.clone().lerp(e, 0.28).add(n.clone().multiplyScalar(b.rig.armR * 0.8)), n, up: ax.clone().negate() }; };
const WOUND = 0.3;                                            // position de la plaie et de la tique sur l'avant-bras gauche

/* ---------- objets dessinés (remplacent un fichier absent) ---------- */
const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, ...o });
const mesh = (g, m, pos, rot) => { const x = new THREE.Mesh(g, m); if (pos) x.position.set(...pos); if (rot) x.rotation.set(...rot); return x; };
function screenTex(lines, w = 256, h = 128, bg = '#0b1a14', fg = '#5dffb0') {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
  lines.forEach(([t, size, y, col]) => { g.font = `700 ${size}px ui-monospace,monospace`; g.fillStyle = col || fg; g.fillText(t, w / 2, y); });
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return tx;
}
export const PROC = {
  oxymetre: () => { const g = new THREE.Group();                        // pince de doigt : le doigt entre selon -z, écran sur le dessus (+y)
    g.add(mesh(new THREE.BoxGeometry(0.036, 0.016, 0.055), M(0x2f6fd6), [0, 0.013, 0])); g.add(mesh(new THREE.BoxGeometry(0.034, 0.014, 0.05), M(0xe9eef2), [0, -0.012, 0]));
    const scr = mesh(new THREE.PlaneGeometry(0.026, 0.018), new THREE.MeshBasicMaterial({ map: screenTex([['--', 50, 64]]) }), [0, 0.0215, 0.004], [-Math.PI / 2, 0, 0]); scr.name = 'ecran'; g.add(scr); return g; },
  ecouvillon: () => { const g = new THREE.Group();                      // tige de 15 cm, bout floqué en -y
    g.add(mesh(new THREE.CylinderGeometry(0.0012, 0.0012, 0.15, 8), M(0xf3f3f3), [0, 0, 0])); g.add(mesh(new THREE.CapsuleGeometry(0.0022, 0.012, 4, 8), M(0xf7f0dc, { roughness: 0.95 }), [0, -0.075, 0]));
    g.add(mesh(new THREE.CylinderGeometry(0.0025, 0.0025, 0.004, 10), M(0x3a7bd5), [0, 0.02, 0])); return g; },
  abaisse: () => mesh(new THREE.BoxGeometry(0.018, 0.15, 0.002), M(0xdcc191, { roughness: 0.9 })),   // bâtonnet de bois, bout en -y
  cassette: (res = 'negatif') => { const g = new THREE.Group(); g.add(mesh(new THREE.BoxGeometry(0.075, 0.006, 0.022), M(0xf4f4f4)));
    const c = document.createElement('canvas'); c.width = 300; c.height = 90; const x = c.getContext('2d'); x.fillStyle = '#fafafa'; x.fillRect(0, 0, 300, 90); x.fillStyle = '#ddd'; x.fillRect(110, 30, 110, 30);
    x.fillStyle = '#c0306a'; x.fillRect(175, 30, 6, 30); if (res === 'positif') x.fillRect(140, 30, 6, 30); x.fillStyle = '#333'; x.font = '700 22px sans-serif'; x.fillText('C', 170, 80); x.fillText('T', 135, 80); x.beginPath(); x.arc(50, 45, 16, 0, 7); x.fillStyle = '#ddd'; x.fill();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; g.add(mesh(new THREE.PlaneGeometry(0.072, 0.0216), new THREE.MeshBasicMaterial({ map: t }), [0, 0.0031, 0], [-Math.PI / 2, 0, 0])); return g; },
  chambre: () => { const g = new THREE.Group();                         // chambre d'inhalation : embout buccal en -z, aérosol doseur au bout (+z)
    g.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.14, 24, 1, true), M(0xcfe8ff, { transparent: true, opacity: 0.55, side: THREE.DoubleSide }), [0, 0, 0], [Math.PI / 2, 0, 0]));
    g.add(mesh(new THREE.CylinderGeometry(0.012, 0.03, 0.03, 20), M(0xffffff), [0, 0, -0.085], [-Math.PI / 2, 0, 0])); g.add(mesh(new THREE.BoxGeometry(0.022, 0.012, 0.025), M(0xf2c14e), [0, 0, -0.11]));
    g.add(mesh(new THREE.CylinderGeometry(0.031, 0.031, 0.02, 24), M(0x2d6bd8), [0, 0, 0.075], [Math.PI / 2, 0, 0]));
    g.add(mesh(new THREE.BoxGeometry(0.03, 0.07, 0.022), M(0x3a8be0), [0, 0.035, 0.095])); g.add(mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.05, 16), M(0xdddddd), [0, 0.085, 0.095])); return g; },
  nebuliseur: () => { const g = new THREE.Group();                      // masque facial (ouverture en -z) + godet + tuyau
    const mask = mesh(new THREE.SphereGeometry(0.055, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2.2), M(0xe8f4ff, { transparent: true, opacity: 0.6, side: THREE.DoubleSide }), [0, 0, 0], [-Math.PI / 2, 0, 0]); mask.scale.set(1, 1.25, 0.8); g.add(mask);
    g.add(mesh(new THREE.CylinderGeometry(0.018, 0.012, 0.05, 16), M(0xf7f7f7, { transparent: true, opacity: 0.8 }), [0, -0.05, 0.05]));
    const tube = new THREE.CatmullRomCurve3([V3(0, -0.075, 0.05), V3(0, -0.15, 0.07), V3(0.05, -0.25, 0.04)]); g.add(mesh(new THREE.TubeGeometry(tube, 20, 0.004, 8), M(0x9fd3ff, { transparent: true, opacity: 0.7 })));
    g.add(mesh(new THREE.TorusGeometry(0.075, 0.003, 6, 30, Math.PI), M(0x2a9d8f), [0, 0.01, -0.01], [0, Math.PI / 2, 0])); return g; },
  ppc: () => { const g = new THREE.Group();                             // masque nasal de PPC (ouverture en -z), harnais, tuyau
    const sh = mesh(new THREE.SphereGeometry(0.035, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2), M(0xdfeaf0, { transparent: true, opacity: 0.75, side: THREE.DoubleSide }), [0, 0, 0], [-Math.PI / 2, 0, 0]); sh.scale.set(1, 1.3, 0.7); g.add(sh);
    g.add(mesh(new THREE.TorusGeometry(0.034, 0.006, 8, 24), M(0x4a4f57), [0, 0, -0.002])); g.add(mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.03, 14), M(0x9aa3ab), [0, 0, 0.03], [Math.PI / 2, 0, 0]));
    const tube = new THREE.CatmullRomCurve3([V3(0, 0, 0.045), V3(0, -0.04, 0.12), V3(0.02, -0.2, 0.18)]); g.add(mesh(new THREE.TubeGeometry(tube, 24, 0.011, 10), M(0x8e99a3)));
    for (const s of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(0.11, 0.012, 0.003), M(0x3b3f45), [s * 0.08, 0.02, -0.03], [0, s * 0.6, 0])); return g; },
  antiseptique: () => { const g = new THREE.Group();                    // flacon pulvérisateur : buse en +y
    g.add(mesh(new THREE.CylinderGeometry(0.022, 0.024, 0.09, 20), M(0xffffff), [0, 0, 0])); g.add(mesh(new THREE.CylinderGeometry(0.023, 0.023, 0.035, 20), M(0xd65a31), [0, 0, 0]));
    g.add(mesh(new THREE.CylinderGeometry(0.008, 0.012, 0.03, 12), M(0xeeeeee), [0, 0.06, 0])); g.add(mesh(new THREE.BoxGeometry(0.012, 0.02, 0.022), M(0xd65a31), [0, 0.08, 0])); return g; },
  compresse: () => { const g = new THREE.Group(); const m = mesh(new THREE.BoxGeometry(0.075, 0.003, 0.075), M(0xffffff, { roughness: 1 })); g.add(m);   // compresse pliée, épaisseur en y
    const lines = new THREE.Mesh(new THREE.PlaneGeometry(0.075, 0.075, 12, 12), new THREE.MeshBasicMaterial({ color: 0xe0e0e0, wireframe: true })); lines.rotation.x = -Math.PI / 2; lines.position.y = 0.0016; g.add(lines); return g; },
  plaie: () => { const g = new THREE.Group(); const m = mesh(new THREE.CircleGeometry(0.014, 24), M(0x9b1b1b, { roughness: 0.4 })); m.scale.set(1.6, 0.6, 1); g.add(m);   // écorchure, à plat (normale +z)
    const r = mesh(new THREE.CircleGeometry(0.02, 24), M(0xd88a7a, { transparent: true, opacity: 0.5 }), [0, 0, -0.0005]); r.scale.set(1.5, 0.8, 1); g.add(r); return g; },
  tique: () => { const g = new THREE.Group(); const bd = mesh(new THREE.SphereGeometry(0.0028, 12, 10), M(0x3b2416, { roughness: 0.3 })); bd.scale.set(1, 1.35, 0.7); g.add(bd); g.scale.setScalar(1.8);   // tique gorgée, pattes (un peu agrandie pour être visible)
    g.add(mesh(new THREE.SphereGeometry(0.0012, 8, 6), M(0x1a0f08), [0, 0.0036, 0.0003]));
    for (let i = 0; i < 4; i++) for (const s of [-1, 1]) g.add(mesh(new THREE.CylinderGeometry(0.0002, 0.0002, 0.004, 4), M(0x1a0f08), [s * 0.003, 0.002 - i * 0.0012, 0], [0, 0, s * (1.2 + i * 0.15)])); return g; },
  boite: (c = 0x999999) => mesh(new THREE.BoxGeometry(0.06, 0.04, 0.03), M(c)),
};

/* ---------- valeurs du cas (affichées par les appareils) ---------- */
const num = (s) => parseFloat(String(s).replace(',', '.'));
export function valeursDuCas(cas = {}) {
  const t = [cas.enonce || '', (cas.questions || []).map((q) => q.reponse_modele).join(' ')].join(' '), f = cas.fiche || {}, k = cas.constantes || {};
  const m = (rx) => { const r = rx.exec(t); return r ? num(r[1]) : null; };
  const temp = m(/(3[5-9][,.]\d|4[0-2][,.]\d)\s*°\s*C/i) ?? m(/(?:fièvre|température)[^.\d]{0,20}(3[5-9](?:[,.]\d)?|4[0-2](?:[,.]\d)?)/i);
  const spo2 = m(/(?:SpO2|saturation)[^\d]{0,12}(\d{2})\s*%/i), glyc = m(/glyc[ée]mie[^.\d]{0,25}(\d+(?:[,.]\d+)?)\s*g\/L/i), glycMmol = m(/glyc[ée]mie[^.\d]{0,25}(\d+(?:[,.]\d+)?)\s*mmol/i);
  const tt = m(/tour de taille[^.\d]{0,15}(\d{2,3})/i), trodPos = /TROD[^.]{0,60}positif|positif au TROD|streptocoque A|test (?:antigénique )?positif/i.test(t);
  const poids = f.poids_kg || m(/(\d{2,3})\s*kg/i);
  // mesures des jambes (bas de contention) : lues dans l'énoncé, sinon tirées de façon stable d'après l'identifiant du cas ; plus fortes si œdème
  const h = [...String(cas.id || 'cas')].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7), r = (k) => ((h >>> k) % 997) / 997, demi = (x) => Math.round(x * 2) / 2;
  const oed = /œdème|oedème|lymph[oœ]d[eè]me|chevilles? gonfl|jambes? gonfl/i.test(t), lym = /lymph[oœ]d[eè]me/i.test(t);
  const chev = m(/cheville[^.\d]{0,20}(\d{2}(?:[,.]\d)?)\s*cm/i) ?? demi(19.5 + r(2) * 7 + (oed ? 2 : 0));
  const mol = m(/mollet[^.\d]{0,20}(\d{2}(?:[,.]\d)?)\s*cm/i) ?? demi(chev * 1.5 + (r(11) - 0.5) * 3 + (lym ? 6 : oed ? 2 : 0));
  const cuisse = m(/cuisse[^.\d]{0,20}(\d{2}(?:[,.]\d)?)\s*cm/i) ?? demi(mol * 1.48 + (r(19) - 0.5) * 4);
  const cl = /classe\s*(IV|III|II|I|[1-4])\b/i.exec(t), classe = cl ? ({ I: 1, II: 2, III: 3, IV: 4 }[cl[1].toUpperCase()] || +cl[1]) : 2;
  return { temp: temp || 36.8, spo2: spo2 || 97, pouls: k.pouls || 76, poids: poids || 74, glyc: glyc || (glycMmol ? +(glycMmol * 0.18).toFixed(2) : 1.02), taille: tt || Math.round(70 + (poids || 74) * 0.35), trod: trodPos ? 'positif' : 'negatif',
    cheville: chev, mollet: mol, cuisse, classe };
}
const fr = (x, d = 1) => Number(x).toFixed(d).replace('.', ',');

function hubCatheter(api, F) {                              // embout luer du cathéter posé (côté poignet), où se branche la seringue
  const P = (api._placed || []).find((x) => x.piece && x.piece.id === 'catheter' && !x.from); if (!P) return null;
  let c = null; P.g.traverse((o) => { if (!c && o.name === 'corps') c = o; }); if (!c) return null;
  const box = new THREE.Box3().setFromObject(c), ctr = box.getCenter(new THREE.Vector3()); let mn = Infinity;
  for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const zz of [box.min.z, box.max.z]) mn = Math.min(mn, new THREE.Vector3(x, y, zz).sub(ctr).dot(F.ax));
  return ctr.add(F.ax.clone().multiplyScalar(mn * 0.95));
}
/* ---------- nouvelles scènes d'objets ---------- */
const STAND = (cam, extra = {}) => ({ seat: 0, arms: handsDown, cam, ...extra });
const ARM_L_UP = armOnTable(true);
const faceZone = (key, label) => ({ label, at: (b) => headPt(b, faceFor(b)[key]) });
const faceAt = (key, tilt = 0) => (b) => { const p = headPt(b, faceFor(b)[key]), n = headDir(b, V3(0, Math.sin(tilt), Math.cos(tilt))); return { p, n, up: headDir(b, V3(0, 1, 0)) }; };
const woundAt = (lift = 0.03) => (b) => { const F = forearm(b, 'Left', WOUND, lift); return { p: F.p, n: F.n, up: F.ax }; };
const wristZone = (s, t = 0.1) => ({ label: s === 'Left' ? 'Poignet gauche' : 'Poignet droit', at: (b) => b.W(s + 'Hand').lerp(b.W(s + 'ForeArm'), t) });

const NEW = {
  vaccin: {
    label: 'Vaccination (injection intramusculaire)', consigne: "Injectez le vaccin par voie intramusculaire, puis posez un pansement.", hide: ['Sweatshirt'], manches: true, files: ['seringue.glb', 'pansement.glb'],
    file: null, procs: {}, multi: { seringue: 'seringue.glb', pansement: 'pansement.glb' },
    stage: STAND({ pos: [0.78, 1.46, 0.55], look: [0.17, 1.32, 0.0] }),
    zones: { deltoide_G: { label: 'Deltoïde gauche', at: (b) => deltoid(b, 'Left').p }, deltoide_D: { label: 'Deltoïde droit', at: (b) => deltoid(b, 'Right').p },
      avantbras_G: { label: 'Avant-bras gauche', at: (b) => b.W('LeftForeArm').lerp(b.W('LeftHand'), 0.4) }, fesse: { label: 'Fesse (quadrant supéro-externe)', at: (b) => b.toW(V3(0.1, b.D.hipsY - 0.02, b.D.zb(b.D.hipsY) - 0.02)) } },
    pieces: [
      { id: 'seringue', node: 'seringue', label: 'Seringue (vaccin)', ok: ['deltoide_G', 'deltoide_D'], pose: { axis: '+y', up: '+z', gap: -0.012 },
        at: (b, z) => deltoid(b, z === 'deltoide_D' ? 'Right' : 'Left'),
        faux: { avantbras_G: "L'avant-bras n'est pas un site d'injection intramusculaire : chez l'adulte, on pique dans le deltoïde.", fesse: "La fesse n'est plus recommandée pour les vaccins chez l'adulte (tissu graisseux épais, nerf sciatique) : préférez le deltoïde." },
        after: (ctx) => ({ geste: 'injection intramusculaire du vaccin dans le deltoïde', msg: "Injection dans le deltoïde, aiguille perpendiculaire à la peau." }) },
      { id: 'pansement', node: 'pansement', label: 'Pansement', ok: ['deltoide_G', 'deltoide_D'], pose: { axis: '+z', up: '+x', gap: -0.001 },
        at: (b, z) => { const d = deltoid(b, z === 'deltoide_D' ? 'Right' : 'Left'); return { p: d.p, n: d.n, up: d.up }; },
        faux: { avantbras_G: "Le pansement se pose au point d'injection, sur le deltoïde.", fesse: "Le pansement se pose au point d'injection, sur le deltoïde." },
        after: () => ({ geste: "pansement posé au point d'injection" }) },
    ],
  },
  trod_angine: {
    label: 'TROD angine (prélèvement de gorge)', consigne: "Abaissez la langue, puis prélevez au niveau des amygdales.", procs: { abaisse: PROC.abaisse, ecouvillon: PROC.ecouvillon },
    stage: STAND({ pos: [0.18, 1.62, 0.6], look: [0, 1.56, 0.05] }, { morphs: { MouthOpen: 1, Jaw_Down: 0.8, BoucheOuverte: 1 } }), headLock: true,
    zones: { bouche: faceZone('bouche', 'Bouche'), nez: faceZone('narine', 'Narine') },
    pieces: [
      { id: 'abaisse', node: 'abaisse', label: 'Abaisse-langue', ok: ['bouche'], pose: { axis: '-y', up: '+z', gap: -0.05 }, at: faceAt('bouche', -0.15),
        faux: { nez: "L'abaisse-langue se pose sur la langue pour dégager la gorge." }, after: () => ({ geste: 'abaisse la langue avec un abaisse-langue' }) },
      { id: 'ecouvillon', node: 'ecouvillon', label: 'Écouvillon de gorge', ok: ['bouche'], pose: { axis: '-y', up: '+z', gap: -0.07 }, at: faceAt('bouche', 0.08), spin: { dur: 2, f: 14, a: 0.6 },
        faux: { nez: "Pour une angine, le prélèvement est pharyngé : on frotte les amygdales et le fond de gorge, pas le nez." },
        after: (ctx) => ({ geste: `prélèvement pharyngé et TROD angine : résultat ${ctx.trod === 'positif' ? 'POSITIF (streptocoque A)' : 'NÉGATIF'}`, badge: `TROD : ${ctx.trod === 'positif' ? 'positif' : 'négatif'}`, msg: 'Prélèvement fait : lecture du test à 5 minutes.' }) },
    ],
  },
  trod_naso: {
    label: 'TROD Covid / grippe (prélèvement nasal)', consigne: "Inclinez la tête du patient et prélevez dans la narine.", procs: { ecouvillon: PROC.ecouvillon },
    stage: STAND({ pos: [0.42, 1.6, 0.55], look: [0, 1.58, 0.06] }, { headPitch: -0.32 }), headLock: true,
    zones: { nez: faceZone('narine', 'Narine'), bouche: faceZone('bouche', 'Bouche'), oeil: { label: 'Œil', at: (b) => headPt(b, faceFor(b).oeil) } },
    pieces: [{ id: 'ecouvillon', node: 'ecouvillon', label: 'Écouvillon nasal', ok: ['nez'], pose: { axis: '-y', up: '+z', gap: -0.045 },
      at: (b) => { const p = headPt(b, faceFor(b).narine), n = headDir(b, V3(0, -0.35, 1)); return { p, n, up: headDir(b, V3(0, 1, 0)) }; }, spin: { dur: 2.5, f: 10, a: 0.7 },
      faux: { bouche: "Le TROD Covid-grippe se fait par voie nasale : écouvillon horizontal, le long du plancher de la fosse nasale.", oeil: "Pas l'œil ! L'écouvillon s'introduit dans la narine." },
      after: (ctx) => ({ geste: `prélèvement nasal et TROD Covid/grippe : résultat ${ctx.trod === 'positif' ? 'POSITIF' : 'NÉGATIF'}`, badge: `TROD : ${ctx.trod === 'positif' ? 'positif' : 'négatif'}` }) }],
  },
  oxymetre: {
    label: 'Oxymètre de pouls', consigne: "Mesurez la saturation en oxygène.", file: 'oxymetre.glb', fallback: { oxymetre: PROC.oxymetre },
    stage: { seat: 1, table: true, arms: armOnTable(false), cam: { pos: [0.45, 0.98, 0.95], look: [0.17, 0.75, 0.45] } },
    zones: { doigt_G: { label: 'Index gauche', at: (b) => fingerTip(b, 'Left').p }, poignet_G: wristZone('Left'), oreille: { label: 'Lobe de l\'oreille', at: (b) => headPt(b, faceFor(b).lobe) } },
    pieces: [{ id: 'oxymetre', node: 'oxymetre', label: 'Oxymètre', ok: ['doigt_G'], pose: { axis: '-y', up: '-z', gap: -0.02 },
      at: (b) => { const f = fingerTip(b, 'Left'), hq = b.rig.bones.LeftHand.getWorldQuaternion(new THREE.Quaternion()), n = b.rig.palmL.Left.clone().applyQuaternion(hq).negate(); return { p: f.p.clone().sub(f.dir.clone().multiplyScalar(0.012)), n, up: f.dir }; },
      faux: { poignet_G: "L'oxymètre de pouls se pince au bout du doigt (pas de vernis), pas au poignet.", oreille: "Possible avec un capteur spécial, mais l'oxymètre de pince se met au bout du doigt." },
      after: (ctx, api, Pl) => { const scr = Pl.g.getObjectByName('ecran'); if (scr) { scr.material.map = screenTex([['SpO2 ' + ctx.spo2 + '%', 30, 44], ['♥ ' + ctx.pouls, 30, 92, '#ffd166']]); scr.material.needsUpdate = true; }
        return { geste: `oxymétrie de pouls à l'index gauche : SpO2 ${ctx.spo2} %, pouls ${ctx.pouls}/min`, badge: `SpO2 ${ctx.spo2} % · pouls ${ctx.pouls}` }; } }],
  },
  thermometre: {
    label: 'Thermomètre sans contact', consigne: "Prenez la température.", file: 'thermometre.glb', fallback: { thermometre: () => PROC.boite(0x8f6fd6) },
    stage: STAND({ pos: [0.45, 1.62, 0.95], look: [0.05, 1.55, 0.05] }),
    zones: { front: faceZone('front', 'Front'), bouche: faceZone('bouche', 'Bouche'), aisselle: { label: 'Aisselle', at: (b) => b.W('LeftArm').add(b.up.clone().multiplyScalar(-0.08)) } },
    pieces: [{ id: 'thermometre', node: 'thermometre', label: 'Thermomètre', ok: ['front'], pose: { axis: '+x', up: '+y', gap: 0.035 }, at: faceAt('front', 0.1),
      faux: { bouche: "Ce thermomètre infrarouge se vise sur le front (ou la tempe), à quelques centimètres, sans contact.", aisselle: "Ce thermomètre est sans contact : on vise le front, pas l'aisselle." },
      after: (ctx) => ({ geste: `température frontale sans contact : ${fr(ctx.temp)} °C`, badge: `${fr(ctx.temp)} °C` }) }],
  },
  balance: {
    label: 'Pèse-personne', consigne: "Pesez le patient.", file: 'balance.glb', fallback: { balance: () => mesh(new THREE.BoxGeometry(0.32, 0.03, 0.3), M(0xdfe6ea)) },
    stage: STAND({ pos: [0.75, 0.7, 1.35], look: [0, 0.25, 0.15] }),
    zones: { sol: { label: 'Au sol, sous les pieds', at: (b) => b.W('LeftFoot').lerp(b.W('RightFoot'), 0.5).setY(0.02) }, table: { label: 'Comptoir', at: (b) => b.toW(V3(0.45, b.D.hipsY, 0.5)) } },
    pieces: [{ id: 'balance', node: 'balance', label: 'Pèse-personne', ok: ['sol'], pose: { axis: '-y', up: '-z', gap: 0 },
      at: (b) => { const m = b.W('LeftToeBase').lerp(b.W('RightToeBase'), 0.5).lerp(b.W('LeftFoot').lerp(b.W('RightFoot'), 0.5), 0.5); m.y = 0; return { p: m, n: V3(0, 1, 0), up: b.fwd.clone().setY(0).normalize() }; },
      faux: { table: "Le pèse-personne se pose au sol, sur une surface dure et plane, et le patient monte dessus." },
      after: (ctx, api) => { api.stage.lift = 0.03; return { geste: `pesée : ${fr(ctx.poids, 1)} kg`, badge: `${fr(ctx.poids, 1)} kg` }; } }],
  },
  metre_ruban: {
    label: 'Mètre ruban', consigne: "Mesurez le tour de taille.", file: 'metre_ruban.glb', fallback: { metre_ruban: () => PROC.boite(0x5fb4c9) }, hide: ['Sweatshirt'],
    stage: STAND({ pos: [0.3, 1.1, 1.05], look: [0, 1.02, 0.05] }),
    zones: { taille: { label: 'Taille (au-dessus des hanches)', at: (b) => surfW(b, b.D.waistY ?? b.D.hipsY + 0.1, 0, 'Left').c }, poitrine: { label: 'Poitrine', at: (b) => surfW(b, b.D.bustY ?? b.D.chestY, 0, 'Left').c },
      hanches: { label: 'Hanches', at: (b) => surfW(b, b.D.hipY ?? b.D.hipsY - 0.08, 0.95, 'Left').c } },
    pieces: [{ id: 'metre_ruban', node: 'metre_ruban', label: 'Mètre ruban', ok: ['taille'], pose: { axis: '+z', up: '+y', gap: 0.004 },
      at: (b) => { const S = surfW(b, b.D.waistY ?? b.D.hipsY + 0.1, 0, 'Left'); return { p: S.c, n: S.n, up: b.up }; },
      faux: { poitrine: "Le tour de taille se mesure à mi-distance entre la dernière côte et la crête iliaque, pas à la poitrine.", hanches: "Le tour de hanches est une autre mesure : le tour de taille se prend plus haut, au-dessus des crêtes iliaques." },
      after: (ctx, api) => { const ring = tapeRing(api); api.root.add(ring); return { geste: `tour de taille : ${ctx.taille} cm`, badge: `Tour de taille : ${ctx.taille} cm`, extra: ring }; } }],
  },
  glucometre: {
    label: 'Lecteur de glycémie', consigne: "Faites une glycémie capillaire.", file: 'glucometre.glb', fallback: { lecteur: () => PROC.boite(0xeeeeee) },
    stage: { seat: 1, table: true, arms: armOnTable(false), cam: { pos: [0.45, 0.98, 0.95], look: [0.17, 0.75, 0.45] } },
    zones: { doigt_G: { label: 'Bout du doigt (côté)', at: (b) => fingerTip(b, 'Left').p }, avantbras_G: { label: 'Avant-bras', at: (b) => forearm(b, 'Left', 0.5).p }, lobe: { label: 'Lobe de l\'oreille', at: (b) => headPt(b, faceFor(b).lobe) } },
    pieces: [{ id: 'lecteur', nodes: ['lecteur', 'autopiqueur', 'lancettes', 'bandelettes'], label: 'Autopiqueur et lecteur', ok: ['doigt_G'], pose: { axis: '-y', up: '-z', gap: 0.0 },
      at: (b) => { const f = fingerTip(b, 'Left'), fw = f.dir.clone().setY(0).normalize(), p = f.p.clone().add(fw.clone().multiplyScalar(0.08)).add(b.side('Right').multiplyScalar(0.04)); p.y = b.toW(V3(0, b.D.hipsY + 0.16, 0)).y; return { p, n: V3(0, 1, 0), up: fw }; },
      faux: { avantbras_G: "La glycémie capillaire se prélève sur le côté de la pulpe du doigt (moins douloureux que le centre).", lobe: "On prélève au bout du doigt, sur le côté de la pulpe." },
      after: (ctx) => ({ geste: `glycémie capillaire au doigt : ${fr(ctx.glyc, 2)} g/L`, badge: `Glycémie ${fr(ctx.glyc, 2)} g/L` }) }],
  },
  chambre: {
    label: "Chambre d'inhalation", consigne: "Montrez comment utiliser la chambre d'inhalation avec l'aérosol doseur.", file: 'chambre_inhalation.glb', fallback: { chambre: PROC.chambre },
    stage: STAND({ pos: [0.32, 1.6, 0.85], look: [0.02, 1.54, 0.1] }),
    zones: { bouche: faceZone('bouche', 'Bouche'), nez: faceZone('nez', 'Nez') },
    pieces: [{ id: 'chambre', node: 'chambre', label: "Chambre d'inhalation", ok: ['bouche'], pose: { axis: '-z', up: '+y', gap: -0.006, c: [0, 0, -0.122] }, at: faceAt('bouche'),
      faux: { nez: "L'embout se met dans la bouche, lèvres bien serrées autour ; chez le petit enfant, on utilise un masque qui couvre nez et bouche." },
      after: () => ({ geste: "montre l'utilisation de la chambre d'inhalation : une bouffée dans la chambre, puis respirations lentes par l'embout", msg: "Agiter, une bouffée dans la chambre, puis 5 à 6 respirations calmes, ou une inspiration lente et 10 secondes d'apnée." }) }],
  },
  nebuliseur: {
    label: 'Nébuliseur (masque)', consigne: "Placez le masque du nébuliseur.", file: 'nebuliseur.glb', fallback: { nebuliseur: PROC.nebuliseur },
    stage: STAND({ pos: [0.32, 1.6, 0.85], look: [0.02, 1.54, 0.1] }),
    zones: { visage: faceZone('nez', 'Nez et bouche'), menton: faceZone('menton', 'Menton') },
    pieces: [{ id: 'nebuliseur', node: 'nebuliseur', label: 'Masque de nébulisation', ok: ['visage'], pose: { axis: '-z', up: '+y', gap: 0.012, c: [0, 0, 0] },
      at: (b) => { const p = headPt(b, faceFor(b).masque); return { p, n: headDir(b, V3(0, 0, 1)), up: headDir(b, V3(0, 1, 0)) }; },
      faux: { menton: "Le masque couvre le nez et la bouche, l'élastique derrière la tête." }, after: () => ({ geste: 'pose le masque du nébuliseur sur le nez et la bouche' }) }],
  },
  ppc: {
    label: 'Masque de PPC (apnée du sommeil)', consigne: "Placez le masque nasal de PPC.", file: 'masque_ppc.glb', fallback: { ppc: PROC.ppc },
    stage: STAND({ pos: [0.32, 1.6, 0.85], look: [0.02, 1.54, 0.1] }),
    zones: { nez: faceZone('nez', 'Nez'), bouche: faceZone('bouche', 'Bouche'), front: faceZone('front', 'Front') },
    pieces: [{ id: 'ppc', node: 'ppc', label: 'Masque nasal', ok: ['nez'], pose: { axis: '-z', up: '+y', gap: 0.006, c: [0, 0, 0] }, at: faceAt('nez'),
      faux: { bouche: "Ce masque est nasal : il couvre le nez ; un masque facial (bucco-nasal) se choisit si le patient respire par la bouche.", front: "L'appui frontal n'est pas le masque : celui-ci se pose sur le nez." },
      after: () => ({ geste: 'pose le masque nasal de PPC et ajuste le harnais', msg: "Ajuster sans trop serrer : deux doigts doivent passer sous le harnais." }) }],
  },
  pansement: {
    label: 'Désinfection et pansement simple', consigne: "Nettoyez et désinfectez la plaie, puis protégez-la.", files: ['pansement.glb', 'bande.glb'],
    multi: { pansement: 'pansement.glb', bande: 'bande.glb' }, procs: { antiseptique: PROC.antiseptique, compresse: PROC.compresse, plaie: PROC.plaie },
    prep: (g) => { const b = g.getObjectByName('bande'); if (b) b.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); o.material.map = null; o.material.color.set(0xf4f4ef); } }); },
    stage: { seat: 1, table: true, arms: ARM_L_UP, cam: { pos: [0.5, 1.05, 0.95], look: [0.2, 0.76, 0.32] } },
    props: [{ id: 'plaie', node: 'plaie', pose: { axis: '-z', up: '+x', gap: -0.001 }, at: woundAt(0.031) }],
    zones: { plaie: { label: 'Plaie', at: (b) => forearm(b, 'Left', WOUND, 0.031).p }, main: { label: 'Main', at: (b) => b.W('LeftHandMiddle1') } },
    pieces: [
      { id: 'antiseptique', node: 'antiseptique', label: 'Antiseptique', ok: ['plaie'], pose: { axis: '+y', up: '+z', gap: 0.07 }, at: woundAt(0.031),
        faux: { main: "On désinfecte la plaie elle-même (après l'avoir nettoyée à l'eau et au savon)." }, after: () => ({ geste: 'nettoie puis désinfecte la plaie avec un antiseptique', msg: "Nettoyer à l'eau et au savon, rincer, puis antiseptique du centre vers l'extérieur." }) },
      { id: 'compresse', node: 'compresse', label: 'Compresse stérile', ok: ['plaie'], pose: { axis: '-y', up: '+x', gap: -0.001 }, at: woundAt(0.031),
        faux: { main: "La compresse se pose sur la plaie." }, after: () => ({ geste: 'sèche la plaie avec une compresse stérile' }) },
      { id: 'pansement', node: 'pansement', label: 'Pansement', ok: ['plaie'], pose: { axis: '+z', up: '+x', gap: -0.001 }, at: woundAt(0.03),
        faux: { main: "Le pansement couvre la plaie, compresse centrée sur la lésion." }, after: () => ({ geste: 'pose un pansement adhésif sur la plaie' }) },
      { id: 'bande', node: 'bande', label: 'Bande de gaze', ok: ['plaie'], pose: { axis: '-x', up: '+y', gap: 0.0 }, at: woundAt(0.035),
        faux: { main: "La bande se déroule autour de l'avant-bras, sur le pansement, sans serrer." },
        after: (ctx, api) => { const r = bandageRing(api); api.scene.add(r); return { geste: "maintient le pansement avec une bande de gaze, sans serrer", extra: r }; } },
    ],
  },
  tique: {
    label: 'Retrait de tique', consigne: "Retirez la tique.", file: 'tire_tique.glb', fallback: { tire_tique: () => mesh(new THREE.CylinderGeometry(0.004, 0.006, 0.055, 10), M(0xd0d0d0)) },
    procs: { tique: PROC.tique, antiseptique: PROC.antiseptique },
    stage: { seat: 1, table: true, arms: ARM_L_UP, cam: { pos: [0.45, 1.0, 0.7], look: [0.19, 0.77, 0.24] } },
    props: [{ id: 'tique', node: 'tique', pose: { axis: '-z', up: '+y', gap: 0.0 }, at: woundAt(0.031) }],
    zones: { tique: { label: 'Tique', at: (b) => forearm(b, 'Left', WOUND, 0.033).p }, main: { label: 'Main', at: (b) => b.W('LeftHandMiddle1') } },
    pieces: [
      { id: 'tire_tique', node: 'tire_tique', label: 'Tire-tique', ok: ['tique'], pose: { axis: '-y', up: '+z', gap: -0.004 }, at: woundAt(0.031), spin: { dur: 2.2, f: 6, a: 1.4 },
        faux: { main: "Le crochet se glisse sous la tique, au ras de la peau." },
        after: () => ({ geste: "retire la tique au tire-tique, en tournant sans tirer", msg: "Glisser le crochet sous la tique, tourner doucement sans tirer, puis vérifier que la tête est retirée.", remove: ['tique'] }) },
      { id: 'antiseptique', node: 'antiseptique', label: 'Antiseptique', ok: ['tique'], pose: { axis: '+y', up: '+z', gap: 0.07 }, at: woundAt(0.031),
        faux: { main: "On désinfecte le point de morsure." }, after: () => ({ geste: 'désinfecte le point de morsure', msg: "Désinfecter, puis surveiller la zone pendant un mois (érythème migrant ?)." }) },
    ],
  },
  reanimation: {
    label: 'Réanimation : DAE et insufflations', consigne: "Le patient est inconscient et ne respire pas : torse dénudé (haut et soutien-gorge retirés ou coupés), posez les électrodes du DAE sur la peau sèche, puis le masque du BAVU.", files: ['dae.glb', 'bavu.glb'],
    multi: { dae: 'dae.glb', bavu: 'bavu.glb' }, hide: ['Shirt', 'SoutienGorge'],
    stage: { seat: 0, lie: 1, arms: (D, s, o) => ({ ...handsDown(D, s, o), w: P(o, D.hx(D.hipsY) + 0.07, D.hipsY + 0.04, -0.1), palm: V3(0, 0, -1) }), cam: { pos: [0.7, 1.35, -0.85], look: [0.05, 0.1, -1.3] } },
    props: [{ id: 'dae_sol', nodes: ['boitier', 'ecran', 'bouton_choc', 'marche', 'haut', 'bas', 'ok', 'voyant'], pose: { axis: '-z', up: '+y', gap: 0 },
      at: (b) => { const p = b.W('LeftArm').add(b.side('Left').multiplyScalar(0.35)); p.y = 0.0; return { p, n: V3(0, 1, 0), up: b.up.clone().setY(0).normalize() }; } }],
    zones: { sousclav_D: { label: 'Sous la clavicule droite', at: (b) => surfW(b, b.D.bustY != null ? Math.max(b.D.shoulderY - 0.09, b.D.bustY + 0.1) : b.D.shoulderY - 0.09, 0.45, 'Right').c }, flanc_G: { label: 'Sous l\'aisselle gauche', at: (b) => surfW(b, b.D.chestY - 0.05, 1.25, 'Left').c },
      sternum: { label: 'Sternum', at: (b) => surfW(b, b.D.chestY, 0, 'Left').c }, visage: faceZone('nez', 'Visage') },
    pieces: [
      { id: 'electrode_rouge', node: 'electrode_rouge', label: 'Électrode rouge', ok: ['sousclav_D'], pose: { axis: '-z', up: '+y', gap: -0.001 },
        at: (b) => { const S = surfW(b, b.D.bustY != null ? Math.max(b.D.shoulderY - 0.09, b.D.bustY + 0.1) : b.D.shoulderY - 0.09, 0.45, 'Right'); return { p: S.c, n: S.n, up: b.up }; },   // sous la clavicule, au-dessus du sein
        faux: { flanc_G: "Cette électrode va sous la clavicule droite ; l'autre se colle sur le côté gauche, sous l'aisselle.", sternum: "Pas sur le sternum : une électrode sous la clavicule droite, l'autre sous l'aisselle gauche, pour que le courant traverse le cœur." },
        after: () => ({ geste: 'colle une électrode du DAE sous la clavicule droite' }) },
      { id: 'electrode_verte', node: 'electrode_verte', label: 'Électrode verte', ok: ['flanc_G'], pose: { axis: '-z', up: '+y', gap: -0.001 },
        at: (b) => { const S = surfW(b, b.D.chestY - 0.05, 1.25, 'Left'); return { p: S.c, n: S.n, up: b.up }; },
        faux: { sousclav_D: "L'électrode verte se colle sur le côté gauche du thorax, sous l'aisselle.", sternum: "Pas sur le sternum : sous l'aisselle gauche." },
        after: () => ({ geste: "colle l'autre électrode sur le côté gauche, sous l'aisselle ; le DAE analyse le rythme", msg: "Ne touchez plus le patient pendant l'analyse ; suivez les consignes vocales du DAE." }) },
      { id: 'bavu', node: 'bavu', label: 'BAVU (masque et ballon)', ok: ['visage'], pose: { axis: '+z', up: '+y', gap: -0.03 },
        at: (b) => { const p = headPt(b, faceFor(b).masque); return { p, n: headDir(b, V3(0, 0, 1)), up: headDir(b, V3(0, 1, 0)) }; },
        faux: { sternum: "Le masque du BAVU se pose sur le nez et la bouche, tête en légère extension.", sousclav_D: "Le masque se pose sur le visage.", flanc_G: "Le masque se pose sur le visage." },
        after: () => ({ geste: 'applique le masque du BAVU sur le nez et la bouche et insuffle', msg: "30 compressions, 2 insufflations ; reprendre le massage sans attendre." }) },
    ],
  },
  injection_iv: {
    label: 'Injection intraveineuse (hôpital)', consigne: "Posez le cathéter court, puis injectez par le site d'injection.", files: ['catheter.glb', 'seringue.glb'],
    multi: { catheter: 'catheter.glb', seringue: 'seringue.glb' },
    stage: { seat: 1, table: true, arms: ARM_L_UP, cam: { pos: [0.55, 1.08, 0.95], look: [0.2, 0.76, 0.3] } },
    zones: { avantbras_G: { label: 'Veine de l\'avant-bras', at: (b) => forearm(b, 'Left', 0.42).p }, coude_G: { label: 'Pli du coude', at: (b) => forearm(b, 'Left', 0.95).p },
      catheter: { label: 'Site d\'injection du cathéter', at: (b, api) => hubCatheter(api, forearm(b, 'Left', 0.3, 0)) || forearmSkin(b, api, 'Left', 0.3, 0.012).p } },
    pieces: [
      { id: 'catheter', node: 'catheter', label: 'Cathéter court', ok: ['avantbras_G'], pose: { axis: '+y', up: '+z', gap: -0.009 }, dropOnPlace: ['aiguille'], at: (b, z, api) => { const F = forearmSkin(b, api, 'Left', 0.42); return { p: F.p, n: F.n, up: F.ax }; },
        faux: { coude_G: "On évite le pli du coude : la flexion coude le cathéter. Choisissez une veine droite de l'avant-bras.", catheter: "Posez d'abord le cathéter." },
        after: () => ({ geste: 'pose un cathéter veineux périphérique sur l\'avant-bras gauche (mandrin retiré), fixé par un pansement transparent', msg: 'Cathéter en place : le mandrin métallique est retiré, seul le cathéter souple reste dans la veine.' }) },
      { id: 'seringue', node: 'seringue', label: 'Seringue', ok: ['catheter'], pose: { axis: '+y', up: '+x', gap: 0.0 },
        at: (b, z, api) => { const F = forearmSkin(b, api, 'Left', 0.3, 0.012), h = hubCatheter(api, F); return { p: h || F.p, n: F.ax.clone().negate().add(F.n.clone().multiplyScalar(0.6)).normalize(), up: F.n }; },
        faux: { avantbras_G: "L'injection se fait par le site d'injection du cathéter déjà en place, pas en piquant la peau à nouveau.", coude_G: "Injectez par le cathéter en place." },
        after: () => ({ geste: 'injecte lentement par le site du cathéter, après avoir vérifié le reflux et la perméabilité', msg: "Vérifier le reflux, injecter lentement, rincer au sérum physiologique." }) },
    ],
  },
};
/* anneaux procéduraux : ruban autour de la taille, bande autour de l'avant-bras */
function tapeRing(api) {
  const D = api.D, y = D.waistY ?? D.hipsY + 0.1, rx = D.hx(y) + 0.004, zf = D.zf(y) + 0.004, zb = D.zb(y) - 0.004, zc = (zf + zb) / 2, rz = (zf - zb) / 2, pts = [];
  for (let i = 0; i <= 64; i++) { const a = i / 64 * Math.PI * 2; pts.push(V3(rx * Math.sin(a), y, zc + rz * Math.cos(a))); }
  return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 128, 0.004, 4, true), M(0xf2d04a));
}
function bandageRing(api) {
  const g = new THREE.Group(), mat = M(0xf7f7f2, { roughness: 1 });
  for (let i = 0; i < 5; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.036, 0.004, 6, 28), mat); r.userData.t = 0.38 + i * 0.05; g.add(r); }
  g.userData.follow = true; api.extras.push(() => {
    const R = api.rig, w = R.bones.LeftHand.getWorldPosition(V3(0, 0, 0)), e = R.bones.LeftForeArm.getWorldPosition(V3(0, 0, 0)), ax = e.clone().sub(w).normalize();
    for (const r of g.children) { r.position.copy(w.clone().lerp(e, r.userData.t)); r.quaternion.setFromUnitVectors(V3(0, 0, 1), ax); r.scale.setScalar(0.85 + 0.35 * r.userData.t); }
  }); return g;
}

/* ---------- catalogue de la réserve : nom affiché, famille, fichiers, mots du cas qui rendent l'objet pertinent ---------- */
export const RESERVE = [
  { id: 'vaccin', nom: 'Seringue et vaccin', famille: 'Vaccination', fichier: 'seringue.glb', pert: /vaccin|rappel|grippe saisonnière|zona|tétanos|pneumocoque|hpv|covid/i },
  { id: 'trod_angine', nom: 'TROD angine', famille: 'TROD', fichier: 'abaisse_langue.glb', pert: /angine|gorge|amygdal|pharyng|streptoc/i },
  { id: 'trod_naso', nom: 'TROD Covid / grippe', famille: 'TROD', proc: 'ecouvillon', pert: /covid|grippe|syndrome grippal|nez qui coule|rhinite|fièvre/i },
  { id: 'thermometre', nom: 'Thermomètre', famille: 'Constantes', fichier: 'thermometre.glb', pert: /fièvre|fébrile|température|°C|frisson|infection|grippe|angine|cystite|pyélo/i },
  { id: 'oxymetre', nom: 'Oxymètre', famille: 'Constantes', fichier: 'oxymetre.glb', proc: 'oxymetre', pert: /essouffl|dyspnée|souffle|bpco|asthme|covid|saturation|spo2|respir/i },
  { id: 'tension', nom: 'Tensiomètre', famille: 'Constantes', fichier: '../tensiometre-draco.glb', pert: /tension|hta|hypertens|cœur|coeur|cardiaque|vertige|céphal|malaise|palpitation|pouls|ains|ibuprofène|diabète/i },
  { id: 'balance', nom: 'Pèse-personne', famille: 'Constantes', fichier: 'balance.glb', pert: /poids|kg|obésit|imc|maigr|dénutrition|nourrisson|œdème|oedème|insuffisance cardiaque|diabète/i },
  { id: 'metre_ruban', nom: 'Mètre ruban', famille: 'Constantes', fichier: 'metre_ruban.glb', pert: /tour de taille|obésit|surpoids|syndrome métabolique|diabète|imc|poids/i },
  { id: 'glucometre', nom: 'Lecteur de glycémie', famille: 'Constantes', fichier: 'glucometre.glb', pert: /diabèt|glyc|insuline|hypoglyc|sucre|metformine/i },
  { id: 'chambre', nom: "Chambre d'inhalation", famille: 'Inhalation', fichier: 'chambre_inhalation.glb', proc: 'chambre', pert: /asthme|bpco|inhal|ventoline|salbutamol|aérosol|bronch/i },
  { id: 'nebuliseur', nom: 'Nébuliseur', famille: 'Inhalation', fichier: 'nebuliseur.glb', proc: 'nebuliseur', pert: /nébulis|aérosol|bronchiolite|bpco|mucovisc|asthme/i },
  { id: 'ppc', nom: 'Masque de PPC', famille: 'Inhalation', fichier: 'masque_ppc.glb', proc: 'ppc', pert: /apnée|ronfl|ppc|cpap|somnolence/i },
  { id: 'pansement', nom: 'Antiseptique et pansements', famille: 'Plaies', fichier: 'pansement.glb', pert: /plaie|coupure|écorch|brûlure|égratign|blessure|saign|chute/i },
  { id: 'tique', nom: 'Tire-tique', famille: 'Plaies', fichier: 'tire_tique.glb', pert: /tique|lyme|morsure|forêt|randonnée/i },
  { id: 'reanimation', nom: 'DAE et BAVU', famille: 'Réanimation', fichier: 'dae.glb', pert: /arrêt cardiaque|inconscient|ne respire|malaise grave|réanimation|massage cardiaque|défibrill/i },
  { id: 'injection_iv', nom: 'Cathéter et seringue', famille: 'Hôpital', fichier: 'catheter.glb', pert: /perfusion|intraveineu|IV\b|cathéter|injection|hospitalis/i, pop: 'hospitalier' },
  { id: 'pouce', nom: 'Orthèse de pouce', famille: 'Orthèses', fichier: 'orthese_pouce.glb', pert: /pouce|rhizarthrose|entorse du pouce|poignet|canal carpien|tendinite de de quervain/i },
  { id: 'releveur', nom: 'Releveur', famille: 'Orthèses', fichier: 'releveur.glb', pert: /releveur|steppage|pied tombant|sciatique paralysante|avc|hémiplég|neuropathie/i },
  { id: 'semelles', nom: 'Semelles', famille: 'Orthèses', fichier: 'semelles.glb', pert: /semelle|pied plat|voûte plantaire|talalgie|aponévros|diabète|pied diabétique/i },
  { id: 'collier', nom: 'Collier cervical', famille: 'Orthèses', fichier: 'colliers.glb', pert: /cervical|torticolis|cou|nuque|coup du lapin|cervicalgie/i },
  { id: 'stomie', nom: 'Poche de stomie', famille: 'Dispositifs', fichier: 'stomie.glb', pert: /stomie|colostomie|iléostomie|urostomie|côlon|colectomie/i },
  { id: 'perfusion', nom: 'Perfusion', famille: 'Dispositifs', fichier: 'perfusion.glb', pert: /perfusion|hospitalisation à domicile|HAD|soluté|déshydrat/i },
];
export function pertinent(id, cas) {
  const r = RESERVE.find((x) => x.id === id); if (!r || !cas) return true;
  const txt = [cas.enonce, cas.apercu, cas.fiche_source && cas.fiche_source.nom, (cas.questions || []).map((q) => q.question + ' ' + q.reponse_modele).join(' ')].join(' ');
  if (id === 'tension' && cas.constantes) return true;
  return r.pert.test(txt);
}
export const ETONNEMENT = ["Vous êtes sûr ? Je ne vois pas trop le rapport avec ce qui m'amène…", "Euh… vous êtes sûr ? C'est pour quoi faire ?", "Vous êtes sûr ? Je ne pensais pas que c'était nécessaire.", "Ah bon ? Vous êtes sûr d'avoir besoin de ça ?"];

/* ---------- matériel porté par la patiente (couches du modèle 3D, révélées au geste) ---------- */
Object.assign(PROC, {
  bas: () => { const g = new THREE.Group(), pts = []; for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push(new THREE.Vector2(0.028 + 0.03 * t + 0.008 * Math.sin(t * 6), t * 0.36)); }
    const leg = mesh(new THREE.LatheGeometry(pts, 24), M(0xcda48a, { roughness: 0.75, side: THREE.DoubleSide })); g.add(leg);
    g.add(mesh(new THREE.TorusGeometry(0.062, 0.006, 8, 24), M(0x9c7a66), [0, 0.355, 0], [Math.PI / 2, 0, 0]));
    const ft = mesh(new THREE.CapsuleGeometry(0.026, 0.07, 6, 12), M(0xcda48a, { roughness: 0.75 }), [0, 0.0, 0.04], [Math.PI / 2, 0, 0]); g.add(ft); return g; },
  ceinture: () => { const g = new THREE.Group(); const b = mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.17, 32, 1, true, 0.3, 5.6), M(0x111214, { roughness: 0.9, side: THREE.DoubleSide })); b.scale.set(1, 1, 0.75); g.add(b);
    for (const y of [-0.03, 0.03]) g.add(mesh(new THREE.BoxGeometry(0.05, 0.03, 0.004), M(0x2b2f36), [0.11, y, 0.05])); return g; },
  corset: () => { const g = new THREE.Group(); const b = mesh(new THREE.CylinderGeometry(0.13, 0.135, 0.3, 32, 1, true, 0.4, 5.5), M(0xeceae4, { roughness: 0.55, side: THREE.DoubleSide })); b.scale.set(1, 1, 0.75); g.add(b);
    for (const x of [-0.05, 0, 0.05]) g.add(mesh(new THREE.BoxGeometry(0.012, 0.28, 0.004), M(0xb9bcc2, { metalness: 0.4 }), [x, 0, -0.099])); return g; },
  prothese: () => { const g = new THREE.Group(); const s = mesh(new THREE.SphereGeometry(0.06, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), M(0xdcb39b, { roughness: 0.3, transparent: true, opacity: 0.92 })); s.scale.set(1, 0.55, 1.15); s.rotation.x = -Math.PI / 2; g.add(s);
    g.add(mesh(new THREE.CircleGeometry(0.06, 24), M(0xcfa48c, { roughness: 0.4 }), [0, 0, -0.001])); g.children[1].scale.set(1, 1.15, 1); return g; },
});
const PORTE_FAUX = (txt) => ({ faux: txt });
/* ---------- tailles : mesures prises au mètre ruban, tableau type de fabricant (valeurs pédagogiques) ---------- */
export const TAILLES_BAS = [{ t: '1', B: [18, 21], C: [28, 35] }, { t: '2', B: [21, 24], C: [32, 38] }, { t: '3', B: [24, 27], C: [35, 42] }, { t: '4', B: [27, 30], C: [39, 46] }];
export const TAILLES_TAILLE = [{ t: '1', T: [65, 80] }, { t: '2', T: [80, 95] }, { t: '3', T: [95, 110] }, { t: '4', T: [110, 125] }];
const cm = (x) => (Number.isInteger(+x) ? String(x) : fr(x));
const CLASSES = { 1: '10 à 15 mmHg', 2: '15 à 20 mmHg', 3: '20 à 36 mmHg', 4: 'plus de 36 mmHg' };
export function tailleBas(B, C) {
  const s = TAILLES_BAS.find((x) => B >= x.B[0] && B < x.B[1]);
  if (!s) return { t: 'Sur mesure', pourquoi: `la cheville (${cm(B)} cm) sort du tableau` };
  if (C < s.C[0] || C > s.C[1]) return { t: 'Sur mesure', pourquoi: `le mollet (${cm(C)} cm) sort de la plage de la taille ${s.t} (${s.C[0]} à ${s.C[1]} cm)` };
  return { t: s.t };
}
export function tailleTaille(T) { const s = TAILLES_TAILLE.find((x) => T >= x.T[0] && T < x.T[1]); return s ? { t: s.t } : { t: 'Sur mesure', pourquoi: `le tour de taille (${T} cm) sort du tableau` }; }
const ordreT = (t) => (t === 'Sur mesure' ? 9 : +t);
function jugeTaille(choisie, bonne, quoi) {                 // trop petit = serre, trop grand = glisse
  if (choisie === bonne.t) return { ok: true, sens: null, txt: `Taille ${bonne.t} : adaptée aux mesures.` };
  if (bonne.t === 'Sur mesure') return { ok: false, sens: 'petit', txt: `Aucune taille standard ne convient : ${bonne.pourquoi}. Il faut un ${quoi} sur mesure.` };
  if (choisie === 'Sur mesure') return { ok: false, sens: null, txt: `Pas besoin de sur mesure : la taille ${bonne.t} du tableau convient (le sur mesure coûte plus cher et demande un délai).` };
  return ordreT(choisie) < ordreT(bonne.t) ? { ok: false, sens: 'petit', txt: `Taille ${choisie} trop petite : il fallait la taille ${bonne.t}. Elle serre trop et peut faire garrot.` }
    : { ok: false, sens: 'grand', txt: `Taille ${choisie} trop grande : il fallait la taille ${bonne.t}. Elle glisse, fait des plis et ne comprime pas assez.` };
}
const tableBas = (M) => '<table><tr><th>Taille</th><th>Cheville B (cm)</th><th>Mollet C (cm)</th></tr>' + TAILLES_BAS.map((x) => `<tr><td>${x.t}</td><td>${x.B[0]} à ${x.B[1]}</td><td>${x.C[0]} à ${x.C[1]}</td></tr>`).join('') + '</table>';
const tableTaille = () => '<table><tr><th>Taille</th><th>Tour de taille (cm)</th></tr>' + TAILLES_TAILLE.map((x) => `<tr><td>${x.t}</td><td>${x.T[0]} à ${x.T[1]}</td></tr>`).join('') + '</table>';
const CHOIX_BAS = {
  titre: 'Choisir les bas',
  aide: (c, M) => `Mesures : cheville ${cm(M.cheville)} cm, mollet ${cm(M.mollet)} cm${M.cuisse != null ? ', cuisse ' + cm(M.cuisse) + ' cm' : ''}. Ordonnance : bas de contention, classe ${c.classe || 2}.` + tableBas() + 'Classes : ' + Object.entries(CLASSES).map(([k, v]) => `${k} = ${v}`).join(' · '),
  champs: [{ id: 'classe', label: 'Classe', options: ['1', '2', '3', '4'] }, { id: 'taille', label: 'Taille', options: ['1', '2', '3', '4', 'Sur mesure'] }],
  juger: (sel, c, M) => {
    const bonne = tailleBas(M.cheville, M.mollet), j = jugeTaille(sel.taille, bonne, 'bas'), cl = String(c.classe || 2), okc = sel.classe === cl;
    const txt = (okc ? '' : `Classe ${sel.classe} : ce n'est pas la classe prescrite (classe ${cl}, ${CLASSES[cl]}). `) + j.txt;
    return { ok: j.ok && okc, sens: j.sens || (okc ? null : +sel.classe > +cl ? 'petit' : 'grand'), txt, resume: `classe ${sel.classe}, taille ${sel.taille}` };
  },
};
const choixTaille = (quoi, titre) => ({
  titre, aide: (c, M) => `Tour de taille mesuré : ${fr(M.taille, 0)} cm.` + tableTaille(),
  champs: [{ id: 'taille', label: 'Taille', options: ['1', '2', '3', '4', 'Sur mesure'] }],
  juger: (sel, c, M) => ({ ...jugeTaille(sel.taille, tailleTaille(M.taille), quoi), resume: `taille ${sel.taille}` }),
});
const METRE_TAILLE = { id: 'metre', label: 'Mètre ruban', repeat: true, ok: ['taille'], cle: 'taille', nom: 'Tour de taille', mesure: (c) => c.taille, ring: (api) => { const r = tapeRing(api); api.root.add(r); return r; },
  faux: { poitrine: "Le tour de taille se mesure entre la dernière côte et la crête iliaque, pas à la poitrine." } };
const LEG = { cheville: ['LeftLeg', 'LeftFoot', 0.88], mollet: ['LeftLeg', 'LeftFoot', 0.3], cuisse: ['LeftUpLeg', 'LeftLeg', 0.3], genou: ['LeftLeg', 'LeftLeg', 0] };
const legPt = (b, z, out = 0) => { const [a, c, t] = LEG[z]; return b.W(a).lerp(b.W(c), t).add(b.fwd.clone().multiplyScalar(out)); };
function legRing(api, z) {                                  // anneau du mètre ruban épousant la jambe (rayons trouvés par lancer de rayons sur la peau)
  const b = body(api), [a, c, t] = LEG[z], A = b.W(a), C = b.W(c), ax = C.clone().sub(A).normalize(), ctr = A.clone().lerp(C, t);
  const u = b.fwd.clone().sub(ax.clone().multiplyScalar(b.fwd.dot(ax))).normalize(), v = ax.clone().cross(u).normalize();
  const skins = (api._skin && api._skin.skins) || api.rig.meshes, rc = new THREE.Raycaster(), pts = [];
  api.root.updateMatrixWorld(true);
  for (let i = 0; i < 24; i++) {
    const g = i / 24 * Math.PI * 2, d = u.clone().multiplyScalar(Math.cos(g)).add(v.clone().multiplyScalar(Math.sin(g)));
    rc.set(ctr.clone().add(d.clone().multiplyScalar(0.11)), d.clone().negate()); rc.far = 0.11;
    const hit = rc.intersectObjects(skins, false)[0], rr = hit ? 0.11 - hit.distance : 0.05;
    pts.push(ctr.clone().add(d.multiplyScalar(rr + 0.003)));
  }
  const ring = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 96, 0.0035, 4, true), M(0xf2d04a));
  (api.root.parent || api.root).add(ring); const bone = api.rig.bones[a]; if (bone) bone.attach(ring); return ring;
}
const METRE_JAMBE = { id: 'metre', label: 'Mètre ruban', repeat: true, ok: ['cheville', 'mollet', 'cuisse'], mesure: (c, z) => c[z], ring: legRing,
  faux: { genou: "On ne mesure pas au genou : cheville (point B, juste au-dessus des malléoles), mollet (point C, à l'endroit le plus large) et, pour un bas-cuisse, la cuisse.",
    jambes: "Choisissez un point de mesure précis : cheville, mollet ou cuisse.", ventre: "Les bas se choisissent sur les mesures de la jambe : cheville et mollet." } };
Object.assign(NEW, {
  bas_contention: {
    label: 'Bas de contention', femme: true, need: 'jambes', consigne: "Mesurez la jambe (cheville, mollet), choisissez la classe prescrite et la taille, puis enfilez les bas du pied à la cuisse, sans pli.",
    stage: STAND({ pos: [0.75, 0.75, 1.75], look: [0, 0.48, 0] }),
    zones: { jambes: { label: 'Jambes (enfiler)', at: (b) => b.W('RightLeg').lerp(b.W('RightFoot'), 0.5).add(b.fwd.clone().multiplyScalar(0.05)) },
      cheville: { label: 'Cheville (B)', at: (b) => legPt(b, 'cheville', 0.05) }, mollet: { label: 'Mollet (C)', at: (b) => legPt(b, 'mollet', 0.06) },
      genou: { label: 'Genou', at: (b) => legPt(b, 'genou', 0.06) }, cuisse: { label: 'Cuisse (G)', at: (b) => legPt(b, 'cuisse', 0.08) },
      ventre: { label: 'Ventre', at: (b) => b.W('Spine').add(b.fwd.clone().multiplyScalar(0.11)) } },
    pieces: [METRE_JAMBE, { id: 'bas', label: 'Bas de contention', wear: 'BasContention', ok: ['jambes'], requiert: ['cheville', 'mollet'], choix: CHOIX_BAS,
      requiertMsg: "Mesurez d'abord la cheville et le mollet : la taille se choisit sur ces mesures, prises le matin, jambes non gonflées.",
      ...PORTE_FAUX({ ventre: "Ce n'est pas une ceinture : les bas se mettent sur les jambes, du pied vers la cuisse, de préférence le matin au lever.", cheville: "Les bas s'enfilent sur toute la jambe : déposez-les sur « Jambes (enfiler) ».", mollet: "Les bas s'enfilent sur toute la jambe : déposez-les sur « Jambes (enfiler) ».", genou: "Les bas s'enfilent du pied jusqu'à la cuisse : déposez-les sur « Jambes (enfiler) ».", cuisse: "Les bas s'enfilent du pied jusqu'à la cuisse : déposez-les sur « Jambes (enfiler) »." }),
      after: () => ({ msg: 'Bas enfilés : talon bien en place, pas de pli ni de bourrelet en haut de cuisse.', geste: 'enfile les bas de contention (pied jusqu\'à la cuisse)' }) }],
  },
  ceinture_lombaire: {
    label: 'Ceinture lombaire', femme: true, need: 'buste', consigne: "Mesurez le tour de taille, choisissez la taille de la ceinture, puis placez-la au bon niveau.",
    stage: STAND({ pos: [0.55, 1.05, 1.35], look: [0, 0.95, 0] }),
    zones: { taille: { label: 'Bas du dos / taille', at: (b) => b.W('Spine').lerp(b.W('Hips'), 0.3).add(b.fwd.clone().multiplyScalar(0.11)) },
      poitrine: { label: 'Poitrine', at: (b) => b.W('Spine2').add(b.fwd.clone().multiplyScalar(0.12)) } },
    pieces: [METRE_TAILLE, { id: 'ceinture', label: 'Ceinture lombaire', wear: 'CeintureLombaire', ok: ['taille'], requiert: ['taille'], choix: choixTaille('ceinture', 'Choisir la taille de la ceinture'), requiertMsg: "Mesurez d'abord le tour de taille : la taille de la ceinture se choisit sur cette mesure.", ...PORTE_FAUX({ poitrine: "Trop haut : la ceinture lombaire se centre sur le bas du dos, entre les côtes et le bassin." }),
      after: () => ({ msg: 'Ceinture en place : centrée sur les lombaires, serrée sans gêner la respiration.', geste: 'pose la ceinture de soutien lombaire au niveau des lombaires' }) }],
  },
  corset: {
    label: "Corset d'immobilisation", femme: true, need: 'buste', consigne: "Mesurez le tour de taille, choisissez la taille du corset, puis mettez en place l'orthèse thoraco-lombaire d'immobilisation.",
    stage: STAND({ pos: [0.6, 1.1, 1.4], look: [0, 1.0, 0] }),
    zones: { tronc: { label: 'Tronc', at: (b) => b.W('Spine1').add(b.fwd.clone().multiplyScalar(0.12)) },
      cou: { label: 'Cou', at: (b) => b.W('Neck').add(b.fwd.clone().multiplyScalar(0.05)) } },
    pieces: [{ ...METRE_TAILLE, ok: ['tronc'], mesure: (c) => c.taille, faux: { cou: "Le tour de taille se mesure au-dessus des hanches, pas au cou." } }, { id: 'corset', label: 'Corset', wear: 'Corset', ok: ['tronc'], requiert: ['taille'], choix: choixTaille('corset', 'Choisir la taille du corset'), requiertMsg: "Mesurez d'abord le tour de taille : la taille du corset se choisit sur cette mesure.", ...PORTE_FAUX({ cou: "Ce n'est pas un collier cervical : le corset maintient le tronc, du bassin jusque sous la poitrine." }),
      after: () => ({ msg: "Corset en place : bord bas au-dessus du bassin, sangles serrées en position debout.", geste: 'met en place le corset d\'immobilisation thoraco-lombaire' }) }],
  },
  prothese_mammaire: {
    label: 'Prothèse mammaire externe', femme: true, need: 'poitrine', consigne: "Essayage après mastectomie : soutien-gorge adapté, puis prothèse du côté opéré.",
    stage: STAND({ pos: [0.3, 1.18, 1.05], look: [0, 1.12, 0] }),
    zones: { poitrine: { label: 'Poitrine', at: (b) => b.W('Spine2').add(b.fwd.clone().multiplyScalar(0.13)).add(b.up.clone().multiplyScalar(-0.04)) },
      sein_G: { label: 'Côté gauche', at: (b) => b.W('Spine2').add(b.fwd.clone().multiplyScalar(0.12)).add(b.side('Left').multiplyScalar(0.08)).add(b.up.clone().multiplyScalar(-0.03)) },
      sein_D: { label: 'Côté droit', at: (b) => b.W('Spine2').add(b.fwd.clone().multiplyScalar(0.12)).add(b.side('Right').multiplyScalar(0.08)).add(b.up.clone().multiplyScalar(-0.03)) } },
    pieces: [
      { id: 'soutien', label: 'Soutien-gorge post-mastectomie', wear: 'SoutienGorgeMastectomie', ok: ['poitrine', 'sein_G', 'sein_D'],
        after: () => ({ msg: 'Soutien-gorge à poches, sans armature, fermeture devant.', geste: 'fait essayer un soutien-gorge post-mastectomie' }) },
      { id: 'prothese', label: 'Prothèse mammaire', wear: (c) => 'ProtheseMammaire_' + (c.mast === 'droite' ? 'D' : 'G'), ok: ['sein_G'],
        faux: { sein_D: "Pas de ce côté : la prothèse remplace le sein retiré, du côté de la mastectomie.", sein_G: "Pas de ce côté : la prothèse remplace le sein retiré, du côté de la mastectomie.", poitrine: "La prothèse se glisse dans la poche du soutien-gorge, du côté opéré." },
        after: (c) => ({ msg: 'Prothèse en place dans la poche : symétrie vérifiée, bord bien couvert.', geste: `place la prothèse mammaire externe dans la poche du soutien-gorge, côté ${c.mast || 'gauche'}` }) },
    ],
  },
});
RESERVE.push(
  { id: 'bas_contention', nom: 'Bas de contention', famille: 'Contention', proc: 'bas', pert: /contention|varice|insuffisance veineuse|phl[ée]bite|thrombose|lymph[oœ]d[eè]me|jambes lourdes|chevilles gonfl/i },
  { id: 'ceinture_lombaire', nom: 'Ceinture lombaire', famille: 'Orthèses', proc: 'ceinture', pert: /lombalgie|lumbago|lombaire|hernie discale|sciatique|mal de dos|mal au dos/i },
  { id: 'corset', nom: "Corset d'immobilisation", famille: 'Orthèses', proc: 'corset', pert: /tassement|fracture vert[ée]bral|ost[ée]oporose|corset|dorsalgie|scoliose/i },
  { id: 'prothese_mammaire', nom: 'Prothèse mammaire', famille: 'Orthèses', proc: 'prothese', pert: /mastectomie|cancer du sein|tumorectomie|prothèse mammaire|sein/i },
);

/* enregistrement : chaque scène reçoit un modèle composé de plusieurs fichiers (multi) ; equip.js charge item.file, on gère ici les fichiers multiples */
for (const [id, it] of Object.entries(NEW)) {
  if (it.multi) {   // plusieurs fichiers : on les charge nous-mêmes dans prep (via un chargeur partagé), noms de nœuds = clés
    it.fileList = it.multi;
  }
  ITEMS[id] = it;
}
export { NEW as SCENES_GESTES };

/* ---------- réactions de la patiente aux gestes (sensation, surprise, gêne) : [réplique, émotion, zone touchée] ---------- */
export const REACTIONS = {
  ok: {
    'vaccin.seringue': ["Aïe ! … Bon, c'était rapide.", 'douleur', 'epaule'],
    'trod_angine.abaisse': ['Aaah… ça donne envie de vomir.', 'degout'],
    'trod_angine.ecouvillon': ["Kof ! C'est vraiment désagréable…", 'degout', 'gorge'],
    'trod_naso.ecouvillon': ["Ouh ! Ça pique, j'en ai les larmes aux yeux.", 'douleur', 'front'],
    'thermometre.thermometre': ["C'est déjà fini ? Je n'ai rien senti.", 'surprise'],
    'glucometre.lecteur': ['Aïe, ça pique un peu.', 'douleur'],
    'metre_ruban.metre_ruban': ["Ah, c'est froid !", 'surprise', 'ventre'],
    'pansement.antiseptique': ['Ça pique !', 'douleur', 'bras'],
    'tique.tire_tique': ["Elle est partie entière ? Je n'ai rien senti.", 'doute'],
    'injection_iv.catheter': ["Aïe ! C'est normal que ça fasse mal comme ça ?", 'douleur', 'bras'],
    'bas_contention.metre': ['Ah, ça chatouille !', 'joie'], 'ceinture_lombaire.metre': ["Ah, c'est froid !", 'surprise'], 'corset.metre': ["Ah, c'est froid !", 'surprise'],
    'chambre.chambre': ['Je respire normalement dedans, c\'est tout ?', 'doute'],
    'bas_contention.bas': ['Ça serre, mais c\'est supportable. Je dois les mettre tous les jours ?', 'doute', 'cuisse'],
    'ceinture_lombaire.ceinture': ['Ah, je me sens maintenue. Je peux la garder la nuit ?', 'doute', 'reins'],
    'corset.corset': ["C'est rigide… je ne vais plus pouvoir me pencher.", 'anxieux', 'ventre'],
    'prothese_mammaire.prothese': ["C'est… étrange. Ça fait du bien de se revoir comme avant.", 'tristesse', 'poitrine'],
  },
  faux: {                                                    // par zone (puis par objet.zone si besoin)
    oeil: ["Hé ! Pas dans l'œil !", 'peur'], fesse: ['Dans la fesse ?! Je dois baisser mon pantalon ?', 'surprise'],
    'thermometre.bouche': ["Dans la bouche ? Je croyais qu'il était sans contact…", 'doute'], 'thermometre.aisselle': ["Sous le bras ? Il ne faut pas le viser sur le front ?", 'doute'],
    'trod_angine.nez': ["Dans le nez ? Mais c'est la gorge qui me fait mal…", 'doute'], 'trod_naso.bouche': ["Dans la bouche ? Pour la grippe, on m'avait fait le nez…", 'doute'],
    'ceinture_lombaire.poitrine': ["Si haut ? J'ai mal en bas du dos, pourtant.", 'doute'], 'corset.cou': ["Autour du cou ? C'est pour le dos, non ?", 'doute'],
    'prothese_mammaire.sein_D': ["Ce n'est pas de ce côté-là qu'on m'a opérée…", 'tristesse'], 'prothese_mammaire.sein_G': ["Ce n'est pas de ce côté-là qu'on m'a opérée…", 'tristesse'],
    ventre: ['Sur le ventre ?', 'surprise'], genou: ['Au genou ? Ce n\'est pas plutôt la cheville ?', 'doute'],
  },
  generique: [['Euh… là ?', 'doute'], ['Vous êtes sûr que c\'est là ?', 'doute'], ['Vous avez l\'habitude de faire ça ?', 'anxieux'], ['Je commence à m\'inquiéter… vous pouvez demander à un collègue ?', 'anxieux']],
  taille: {
    petit: { bas_contention: ["Aïe, ça serre beaucoup trop ! J'ai les orteils qui fourmillent.", 'douleur', 'cuisse'], defaut: ["Je n'arrive plus à respirer, c'est beaucoup trop serré !", 'douleur', 'ventre'] },
    grand: { bas_contention: ['Ils glissent déjà, ça fait des plis à la cheville.', 'doute', 'cuisse'], defaut: ['Elle remonte toute seule, elle ne me tient pas du tout.', 'doute', 'ventre'] },
    classe: ["Ce sont bien ceux de mon ordonnance ? Ma prescription disait autre chose, non ?", 'doute'],
    surmesure: ['Sur mesure ? Ça va coûter combien, et il faudra attendre ?', 'anxieux'],
  },
  sans_mesure: { bas_contention: ["Vous ne prenez pas mes mesures ? À ma voisine, on lui avait mesuré les jambes.", 'doute'], defaut: ['Vous ne mesurez pas mon tour de taille avant ?', 'doute'] },
  muets: ['reanimation'],                                    // patient inconscient : pas de réaction
};
