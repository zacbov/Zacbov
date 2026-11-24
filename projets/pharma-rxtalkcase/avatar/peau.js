/* Lésions de peau reprises de CorpoAtlas (famille « peau » de maladies_anim.json) :
   - lésions en relief (papules, vésicules, croûtes, sillons…) posées sur la peau et accrochées à l'os le plus proche, pour suivre les gestes ;
   - couches peintes dans la texture de la peau (plein, plaques, marbré, anneau).
   Les zones de l'atlas (sphères dans le repère de son propre corps) sont redéfinies ici sur le squelette du patient. */
import * as THREE from 'three';
const comp = (a, i, k) => (k === 0 ? a.getX(i) : k === 1 ? a.getY(i) : k === 2 ? a.getZ(i) : a.getW(i));   // attributs simples ou entrelacés

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
let CAT = null, FICHES = {};
export async function chargerPeau(url = 'peau.json') { if (!CAT) { const j = await (await fetch(url)).json(); CAT = j.m; FICHES = j.fiches || {}; } return CAT; }
/* résumé CorpoAtlas d'une maladie (description, pièges, diagnostics différentiels) pour le débriefing */
export function infoStades(key) { const e = CAT && CAT[key]; return e ? { L: e.L || [], T: e.T || [], ll: e.ll || '' } : null; }
export function ficheAtlas(key) { const e = CAT && CAT[key]; if (e && e.fiche) return { nom: e.nom, ...e.fiche }; return FICHES[key] || null; }
const plain = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/* reconnaît une maladie de peau du catalogue dans un texte (nom ou synonyme) */
export function trouverMaladie(texte) {
  if (!CAT) return null; const t = ' ' + plain(texte).replace(/[^a-z0-9]+/g, ' ') + ' ';
  let best = null;
  for (const [k, e] of Object.entries(CAT)) for (const n of [e.nom, ...(e.syn || [])]) {
    const w = ' ' + plain(n).replace(/\([^)]*\)/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim() + ' ';
    if (w.trim().length > 3 && t.includes(w) && (!best || w.length > best.len)) {
      const i = t.indexOf(w), ctx = t.slice(Math.max(0, i - 90), i + w.length + 90);
      if (/vaccin|rappel|serolog|antecedent|immunis|contage|eviction/.test(ctx)) continue;                    // maladie citée, pas présente sur la peau
      if (k === 'brulures' && !/(degre|soleil|eau bouillante|brule par|four|flamme|huile)/.test(ctx)) continue;   // brûlures mictionnelles, d'estomac…
      best = { k, len: w.length };
    }
  }
  return best && best.k;
}

/* morphologies (couleurs et formes de l'atlas) */
const LES = {
  papule: { g: 'dome', col: 0xd65454, flat: 0.55 }, vesicule: { g: 'dome', col: 0xf6eedc, flat: 0.75, halo: 0xe07070, rough: 0.4, em: 0x3a3028 },
  bulle: { g: 'dome', col: 0xf3e4b0, flat: 0.55, halo: 0xe08080, rough: 0.4, em: 0x3a3020 }, pustule: { g: 'dome', col: 0xf3e4a8, flat: 0.6, halo: 0xe06a6a },
  croute: { g: 'crust', col: 0xc88a2a, flat: 0.3 }, nodule: { g: 'dome', col: 0xa8445a, flat: 0.65 }, abces: { g: 'dome', col: 0xf0d070, flat: 0.7, halo: 0xc04848 },
  comedon: { g: 'dome', col: 0x2a2420, flat: 0.35 }, comedon_b: { g: 'dome', col: 0xf3eddc, flat: 0.4 }, ombilique: { g: 'dome', col: 0xf3e6dc, flat: 0.7, dot: 0x9a7a70 },
  tache: { g: 'disc', col: 0x9a6a44 }, kerat: { g: 'dome', col: 0x6e4a30, flat: 0.3 }, ulcere: { g: 'disc', col: 0xf4e8bc, halo: 0xd44a4a },
  sillon: { g: 'line', col: 0x5a3e30, flat: 0.25 }, trait: { g: 'line', col: 0xf0b4b4, flat: 0.2, halo: 0xe06a6a }, piqure: { g: 'dome', col: 0xd84a4a, flat: 0.5, dot: 0x3a0c0c },
  plaie: { g: 'disc', col: 0x8a1a1a }, eschare: { g: 'disc', col: 0x2a1a14 }, cor: { g: 'dome', col: 0xe8d090, flat: 0.5, dot: 0xb89a50 }, telang: { g: 'line', col: 0xd02a2a, flat: 0.15 },
};
const GEO = {};
function geo(g) {
  if (GEO[g]) return GEO[g]; let x;
  if (g === 'dome' || g === 'line') { x = new THREE.SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2); x.rotateX(Math.PI / 2); }
  else if (g === 'disc') x = new THREE.CircleGeometry(1, 18);
  else x = new THREE.DodecahedronGeometry(1, 0);
  return (GEO[g] = x);
}
let seed = 1; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

export function createPeau(A) {
  const { skins, canvasOf, restB, gltf } = A._skin, D = A.D;
  const B = (n) => restB[n] && restB[n].clone(), mid = (a, b, t = 0.5) => (restB[a] && restB[b] ? restB[a].clone().lerp(restB[b], t) : null);
  const top = restB.HeadTop_End ? restB.HeadTop_End.y : (D.forehead ? D.forehead.y + 0.08 : 1.6), U = top / 266;   // unité de l'atlas (corps de 266 unités)
  const zf = (y) => D.zf(y), zb = (y) => D.zb(y), hx = (y) => D.hx(y);
  const bust = D.bustY ?? D.chestY + 0.05, waist = D.waistY ?? D.hipsY + 0.1, ey = D.eyeY ?? (D.forehead ? D.forehead.y - 0.04 : D.headY + 0.07);
  const nose = D.nose || D.mouth || V3(0, ey - 0.03, 0.08), mouth = D.mouth || nose, chin = D.chin, fh = D.forehead, lobe = D.lobe;
  const S = (c, R, dir, md = 0.1) => (c ? { c, R, dir: dir ? dir.clone().normalize() : null, md } : null);
  const both = (f) => [f(1), f(-1)];
  const side = (o, k) => k.replace('Left', o > 0 ? 'Left' : 'Right');
  /* zones de l'atlas -> sphères sur le patient (repère du modèle au repos : x vers la gauche du patient, y en haut, z vers l'avant) */
  const Z = {
    cuir: () => [S(V3(0, top - 0.035, (B('Head') || nose).z - 0.02), 0.095, V3(0, 1, -0.25), 0.15)],
    vertex: () => [S(V3(0, top - 0.01, (B('Head') || nose).z - 0.03), 0.06, V3(0, 1, 0), 0.3)],
    golfes: () => fh ? both((o) => S(V3(o * 0.045, fh.y + 0.035, fh.z - 0.02), 0.03, V3(0, 0.5, 1), 0)) : [],
    front: () => [fh && S(fh, 0.045, V3(0, 0.2, 1), 0.3)],
    joues: () => both((o) => S(V3(o * 0.042, (ey + mouth.y) / 2, nose.z - 0.035), 0.033, V3(o * 0.4, 0, 1), 0.2)),
    nez: () => [S(nose, 0.022, V3(0, 0, 1), 0.1)], levres: () => [S(mouth, 0.022, V3(0, 0, 1), 0.1)],
    visage: () => [S(V3(0, ey - 0.025, nose.z - 0.03), 0.085, V3(0, 0, 1), 0.25)],
    barbe: () => [chin && S(V3(0, chin.y + 0.012, chin.z - 0.02), 0.055, V3(0, -0.4, 1), 0)],
    oreilles: () => lobe ? both((o) => S(V3(o * lobe.x, lobe.y + 0.02, lobe.z), 0.03, V3(o, 0, 0), -0.2)) : [],
    cou: () => [S(V3(0, (D.neckY + (chin ? chin.y : D.neckY + 0.06)) / 2, D.neckFront), 0.05, V3(0, 0, 1), -0.3)],
    nuque: () => [S(V3(0, D.neckY + 0.04, (B('Neck') || V3(0, 0, 0)).z - 0.05), 0.05, V3(0, 0, -1), 0.2)],
    thorax: () => [S(V3(0, bust, zf(bust)), 0.12, V3(0, 0, 1), 0.3)],
    poitrine_haut: () => [S(V3(0, (bust + D.shoulderY) / 2 + 0.02, zf(bust + 0.06)), 0.11, V3(0, 0, 1), 0.3)],
    sous_seins: () => both((o) => S(V3(o * 0.08, bust - 0.06, zf(bust - 0.06) - 0.01), 0.05, V3(0, -0.6, 1), -0.2)),
    abdomen: () => [S(V3(0, waist, zf(waist)), 0.11, V3(0, 0, 1), 0.3)],
    dos: () => [S(V3(0, D.chestY + 0.04, zb(D.chestY)), 0.13, V3(0, 0, -1), 0.3)],
    dos_haut: () => [S(V3(0, D.shoulderY - 0.05, zb(D.shoulderY - 0.05)), 0.11, V3(0, 0, -1), 0.3)],
    lombes: () => [S(V3(0, D.hipsY + 0.08, zb(D.hipsY + 0.08)), 0.1, V3(0, 0, -1), 0.3)],
    aisselles: () => both((o) => S(B(side(o, 'LeftArm')).add(V3(-o * 0.02, -0.06, 0)), 0.055, null, -2)),
    aines: () => both((o) => S(V3(o * 0.075, D.hipsY - 0.06, zf(D.hipsY - 0.06) - 0.02), 0.05, V3(0, 0, 1), -0.3)),
    pubis: () => [S(V3(0, D.hipsY - 0.04, zf(D.hipsY - 0.04)), 0.06, V3(0, 0, 1), 0.1)],
    perinee: () => [S(V3(0, D.hipsY - 0.12, 0), 0.06, V3(0, -1, 0), 0.2)],
    fesses: () => both((o) => S(V3(o * 0.07, D.hipsY - 0.04, zb(D.hipsY - 0.04)), 0.09, V3(0, 0, -1), 0.3)),
    bras: () => both((o) => S(mid(side(o, 'LeftArm'), side(o, 'LeftForeArm')), 0.07, null, -2)),
    plis_coudes: () => both((o) => S(B(side(o, 'LeftForeArm')), 0.045, V3(0, 0, 1), 0.2)),
    coudes: () => both((o) => S(B(side(o, 'LeftForeArm')), 0.045, V3(0, 0, -1), 0.2)),
    avant_bras: () => both((o) => [0.3, 0.55, 0.8].map((t) => S(mid(side(o, 'LeftForeArm'), side(o, 'LeftHand'), t), 0.06, null, -2))).flat(),
    avant_bras_g: () => [0.3, 0.55, 0.8].map((t) => S(mid('LeftForeArm', 'LeftHand', t), 0.06, null, -2)),
    poignets: () => both((o) => S(mid(side(o, 'LeftForeArm'), side(o, 'LeftHand'), 0.93), 0.035, V3(0, -1, 0), 0.1)),
    paumes: () => both((o) => S(mid(side(o, 'LeftHand'), side(o, 'LeftHandMiddle1')), 0.05, V3(0, -1, 0), 0.3)),
    dos_mains: () => both((o) => S(mid(side(o, 'LeftHand'), side(o, 'LeftHandMiddle1')), 0.05, V3(0, 1, 0), 0.3)),
    mains: () => both((o) => S(mid(side(o, 'LeftHand'), side(o, 'LeftHandMiddle1')), 0.08, null, -2)),
    main_g: () => [S(mid('LeftHand', 'LeftHandMiddle1'), 0.07, null, -2)],
    doigts: () => both((o) => S(mid(side(o, 'LeftHandMiddle1'), side(o, 'LeftHandMiddle3')), 0.05, null, -2)),
    cuisses: () => both((o) => S(mid(side(o, 'LeftUpLeg'), side(o, 'LeftLeg'), 0.45), 0.13, null, -2)),
    cuisse_g: () => [S(mid('LeftUpLeg', 'LeftLeg', 0.45), 0.13, null, -2)],
    cuisse_g_int: () => [S(mid('LeftUpLeg', 'LeftLeg', 0.4).add(V3(-0.04, 0, 0)), 0.08, V3(-1, 0, 0.3), 0.1)],
    genoux: () => both((o) => S(B(side(o, 'LeftLeg')), 0.055, V3(0, 0, 1), 0.3)),
    plis_genoux: () => both((o) => S(B(side(o, 'LeftLeg')), 0.055, V3(0, 0, -1), 0.3)),
    jambes: () => both((o) => S(mid(side(o, 'LeftLeg'), side(o, 'LeftFoot')), 0.12, null, -2)),
    jambe_g: () => [S(mid('LeftLeg', 'LeftFoot'), 0.13, null, -2)],
    tibias: () => both((o) => S(mid(side(o, 'LeftLeg'), side(o, 'LeftFoot')), 0.08, V3(0, 0, 1), 0.3)),
    chevilles: () => both((o) => S(B(side(o, 'LeftFoot')), 0.05, null, -2)),
    pieds: () => both((o) => S(mid(side(o, 'LeftFoot'), side(o, 'LeftToeBase')), 0.06, V3(0, 0.6, 1), 0.1)),
    plantes: () => both((o) => S(mid(side(o, 'LeftFoot'), side(o, 'LeftToeBase')), 0.07, V3(0, -1, 0), 0.4)),
    cuisse_g_av: () => [S(mid('LeftUpLeg', 'LeftLeg', 0.5), 0.13, V3(0, 0, 1), 0.35)],
    avant_bras_dos: () => both((o) => [0.35, 0.65].map((t) => S(mid(side(o, 'LeftForeArm'), side(o, 'LeftHand'), t), 0.07, V3(0, 1, 0.3), 0.3))).flat(),
    flanc_g: () => [S(V3(hx(D.chestY) * 0.8, D.chestY, (zf(D.chestY) + zb(D.chestY)) / 2), 0.09, V3(1, 0, 0.15), 0.25)],
    hemithorax_g: () => [S(V3(0.06, D.chestY + 0.01, zf(D.chestY) - 0.01), 0.08, V3(0.4, 0, 1), 0.2), S(V3(hx(D.chestY) * 0.8, D.chestY, (zf(D.chestY) + zb(D.chestY)) / 2), 0.08, V3(1, 0, 0.1), 0.25), S(V3(0.07, D.chestY, zb(D.chestY) + 0.01), 0.08, V3(0.3, 0, -1), 0.2)],
    paupiere_g: () => { const e = D.eyes && D.eyes.find((x) => x.x > 0); return [e && S(e.clone().add(V3(0.004, -0.009, 0.012)), 0.012, V3(0, -0.2, 1), 0)]; },
    epaules: () => both((o) => S(B(side(o, 'LeftArm')).add(V3(-o * 0.02, 0.04, 0)), 0.07, V3(o * 0.3, 1, 0.2), 0)),
    talons: () => both((o) => S(B(side(o, 'LeftFoot')).add(V3(0, -0.06, -0.035)), 0.04, V3(0, -0.3, -1), 0)),
    orteils: () => both((o) => S(mid(side(o, 'LeftToeBase'), side(o, 'LeftToe_End')), 0.04, V3(0, 0, 1), -0.5)),
  };
  /* sommets de peau de chaque zone (repère du modèle au repos), avec os dominant */
  const cache = {};
  const P = V3(0, 0, 0), N = V3(0, 0, 0);
  function verts(zone) {
    if (cache[zone]) return cache[zone];
    const sph = (Z[zone] ? Z[zone]() : []).filter(Boolean), out = [];
    gltf.scene.updateMatrixWorld(true);
    for (const m of skins) {
      const g = m.geometry, Pa = g.attributes.position, Na = g.attributes.normal, Ua = g.attributes.uv, Si = g.attributes.skinIndex, Sw = g.attributes.skinWeight; if (!Ua || !Si) continue;
      const Mm = gltf.scene.matrixWorld.clone().invert().multiply(m.matrixWorld), Nm = new THREE.Matrix3().getNormalMatrix(Mm);
      for (let i = 0; i < Pa.count; i++) {
        P.fromBufferAttribute(Pa, i).applyMatrix4(Mm); let ok = null;
        for (const s of sph) { const d = P.distanceTo(s.c); if (d > s.R) continue; if (s.dir) { N.fromBufferAttribute(Na, i).applyMatrix3(Nm).normalize(); if (N.dot(s.dir) < s.md) continue; } ok = { s, d: d / s.R }; break; }
        if (!ok) continue;
        N.fromBufferAttribute(Na, i).applyMatrix3(Nm).normalize();
        let bi = 0, bw = -1; for (let k = 0; k < 4; k++) { const w = comp(Sw, i, k); if (w > bw) { bw = w; bi = comp(Si, i, k); } }
        out.push({ m, i, p: P.clone(), n: N.clone(), u: Ua.getX(i), v: Ua.getY(i), d: ok.d, bone: bi });
      }
    }
    return (cache[zone] = out);
  }
  /* couverture par les vêtements : lésions masquées tant que la zone est couverte */
  const couvre = (p) => p.y > D.hipsY - 0.02 && p.y < D.neckY && Math.abs(p.x) < 0.29 ? 'haut' : p.y < 0.105 ? 'pieds' : p.y < D.hipsY + 0.02 ? 'bas' : 'libre';
  const groupes = [];
  A._lesionsTenue = (t, femme) => { for (const g of groupes) g.visible = g.userData.cov === 'libre' || (femme && ((g.userData.cov === 'haut' && (t.buste || t.poitrine)) || (g.userData.cov === 'bas' && t.jambes) || (g.userData.cov === 'pieds' && t.jambes))); };

  /* lésions en relief : une série d'instances par os et par zone de couverture, dans le repère de l'os (elles suivent les gestes) */
  function relief(samples, kind, size, o = {}) {
    const L = LES[kind] || LES.papule; if (!samples.length) return;
    const parts = new Map();
    for (const s of samples) { const key = s.m.uuid + ':' + s.bone + ':' + couvre(s.p); if (!parts.has(key)) parts.set(key, []); parts.get(key).push(s); }
    const col = new THREE.Color(o.col ?? L.col), flat = o.flat ?? L.flat ?? 0.6, q = new THREE.Quaternion(), qs = new THREE.Quaternion(), zA = V3(0, 0, 1), M = new THREE.Matrix4();
    for (const [key, arr] of parts) {
      const m = arr[0].m, sk = m.skeleton, bone = sk.bones[arr[0].bone], inv = sk.boneInverses[arr[0].bone], toBone = inv.clone().multiply(m.bindMatrix);
      const toMesh = gltf.scene.matrixWorld.clone().invert().multiply(m.matrixWorld).invert();            // repère du modèle -> maillage
      const grp = new THREE.Group(); grp.userData.cov = couvre(arr[0].p);
      const mk = (g, c, opa, rough = 0.45, em = 0) => { const im = new THREE.InstancedMesh(geo(g), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: em, roughness: rough, transparent: opa < 1, opacity: opa, depthWrite: opa >= 1 }), arr.length); im.frustumCulled = false; grp.add(im); return im; };
      const im = mk(L.g, col, L.op || 1, L.rough, L.em), halo = L.halo ? mk('disc', null, 0.7) : null, dot = L.dot ? mk('disc', null, 1) : null, c = new THREE.Color();
      arr.forEach((s, i) => {
        const r = size * U * (0.7 + 0.6 * rnd()), line = L.g === 'line';
        const pm = s.p.clone().applyMatrix4(toMesh).applyMatrix4(toBone), nb = s.n.clone().transformDirection(toMesh).transformDirection(toBone);
        q.setFromUnitVectors(zA, nb); qs.setFromAxisAngle(zA, o.dir ? 0 : rnd() * 6.283); q.multiply(qs);
        const sx = line ? r * (o.len || 3) : r, sy = line ? r * 0.4 : r;
        M.compose(pm.clone().addScaledVector(nb, (L.g === 'disc' ? 0.06 : 0.02) * r), q, V3(sx, sy, r * flat)); im.setMatrixAt(i, M);
        c.copy(col).multiplyScalar(0.85 + 0.3 * rnd()); im.setColorAt(i, c);
        if (halo) { M.compose(pm.clone().addScaledVector(nb, 0.0004), q, V3(sx * 1.7, sy * 1.7, 1)); halo.setMatrixAt(i, M); halo.setColorAt(i, new THREE.Color(L.halo)); }
        if (dot) { M.compose(pm.clone().addScaledVector(nb, r * flat * 1.02), q, V3(r * 0.28, r * 0.28, 1)); dot.setMatrixAt(i, M); dot.setColorAt(i, new THREE.Color(L.dot)); }
      });
      for (const x of [im, halo, dot]) if (x) { x.instanceMatrix.needsUpdate = true; if (x.instanceColor) x.instanceColor.needsUpdate = true; }
      bone.add(grp); groupes.push(grp);
    }
  }
  /* couches peintes : chaque sommet touché dépose une tache dans la texture, à ses coordonnées UV */
  const noise = (p, f) => { const s = Math.sin(p.x * 127.1 * f + p.y * 311.7 * f + p.z * 74.7 * f) * 43758.5453; return s - Math.floor(s); };
  const vnoise = (p, f) => (noise(p, f) + noise(p.clone().multiplyScalar(1.7), f) + noise(p.clone().multiplyScalar(0.6), f)) / 3;
  function peindreCouche(vs, col, alpha, kind, o = {}) {
    if (!vs.length || alpha <= 0) return;
    const byMat = new Map(); for (const v of vs) { if (/cils|bouche/i.test(v.m.material.name)) continue; if (!byMat.has(v.m.material)) byMat.set(v.m.material, []); byMat.get(v.m.material).push(v); }
    const c = new THREE.Color(col), rgb = `${(c.r * 255) | 0},${(c.g * 255) | 0},${(c.b * 255) | 0}`;
    for (const [mat, arr] of byMat) {
      const { c: cv, g, tx } = canvasOf(mat), W = cv.width, H = cv.height, fr = (t) => t - Math.floor(t);
      const px = (v) => [fr(v.u) * W, (tx.flipY ? 1 - fr(v.v) : fr(v.v)) * H];
      let k = 0, n = 0; for (let i = 0; i < Math.min(arr.length, 400); i += 7) { const a = arr[i], b = arr[(i + 13) % arr.length], dp = a.p.distanceTo(b.p); if (dp > 0.004 && dp < 0.05) { const [x1, y1] = px(a), [x2, y2] = px(b); const dd = Math.hypot(x1 - x2, y1 - y2); if (dd < W * 0.2) { k += dd / dp; n++; } } }
      const ppm = n ? k / n : W * 2.5;
      let sp = 0, ns = 0; for (let i = 0; i < Math.min(arr.length, 60); i++) { const a = arr[Math.floor(rnd() * arr.length)]; let best = 1e9; for (let j = 0; j < arr.length; j += Math.max(1, arr.length >> 9)) { const d = a.p.distanceToSquared(arr[j].p); if (d > 1e-10 && d < best) best = d; } if (best < 1e8) { sp += Math.sqrt(best); ns++; } }
      const rad = Math.max(1.5, ppm * 0.0028, ns ? ppm * (sp / ns) * 0.9 : 0);   // la tache couvre au moins l'écart entre sommets voisins
      const mk = document.createElement('canvas'); mk.width = W; mk.height = H; const mg = mk.getContext('2d'); mg.globalCompositeOperation = 'lighten';   // masque : on garde le maximum, pas la somme
      let x0 = W, y0 = H, x1 = 0, y1 = 0;
      for (const v of arr) {
        const e = o.edge ?? 0.6, fall = Math.max(0, Math.min(1, (1 - v.w) / Math.max(0.05, 1 - e))); let a = alpha * fall;
        if (kind === 'plaques') a *= Math.max(0, Math.min(1, vnoise(v.p, (o.ns || 0.6) * 40) * 2.2 - 0.6));
        else if (kind === 'marbre') a *= 0.45 + 0.55 * Math.abs(Math.sin(vnoise(v.p, (o.ns || 0.5) * 30) * 9));
        else if (kind === 'anneau') a *= Math.exp(-(((v.w - (o.ring || 0.8)) / 0.12) ** 2));
        if (a < 0.02) continue;
        const [x, y] = px(v), l = Math.round(255 * Math.min(1, a)); mg.fillStyle = `rgb(${l},${l},${l})`; mg.beginPath(); mg.arc(x, y, rad * 1.3, 0, 6.283); mg.fill();
        x0 = Math.min(x0, x - rad * 6); y0 = Math.min(y0, y - rad * 6); x1 = Math.max(x1, x + rad * 6); y1 = Math.max(y1, y + rad * 6);
      }
      if (x1 <= x0) continue;
      const bx = Math.max(0, x0 | 0), by = Math.max(0, y0 | 0), bw = Math.min(W, x1 | 0) - bx, bh = Math.min(H, y1 | 0) - by;
      const col_ = document.createElement('canvas'); col_.width = bw; col_.height = bh; const cg = col_.getContext('2d');
      cg.filter = `blur(${Math.max(1, rad * 0.8).toFixed(1)}px)`; cg.drawImage(mk, bx, by, bw, bh, 0, 0, bw, bh); cg.filter = 'none';
      const im = cg.getImageData(0, 0, bw, bh), dta = im.data;                                        // luminance du masque -> transparence, teinte de la couche
      for (let q = 0; q < dta.length; q += 4) { const al = dta[q]; dta[q] = c.r * 255; dta[q + 1] = c.g * 255; dta[q + 2] = c.b * 255; dta[q + 3] = al; }
      cg.putImageData(im, 0, 0);
      g.save(); g.globalCompositeOperation = 'multiply'; g.globalAlpha = 0.6; g.drawImage(col_, bx, by); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 0.22; g.drawImage(col_, bx, by); g.restore();
      tx.needsUpdate = true;
    }
  }
  const at = (x, stade) => (Array.isArray(x) ? x[Math.min(stade, x.length - 1)] : x);
  let centre = null;
  function appliquer(key, stade = 1) {
    const e = CAT && CAT[key]; if (!e) return false; seed = 7 + key.length * 31 + stade; centre = null;
    for (const L of [...(e.les || []), ...(e.paint || [])]) { if (centre) break; for (const z of [].concat(L.z)) { const sp = Z[z] && Z[z]().filter(Boolean)[0]; if (sp) { centre = { c: sp.c.clone(), dir: sp.dir ? sp.dir.clone() : V3(0, 0, 1), R: sp.R, zone: z }; break; } } }
    for (const L of e.paint || []) {
      const alpha = at(L.a, stade) || 0; if (!alpha) continue;
      const vs = L.z.flatMap((z) => verts(z)); if (!vs.length) continue;
      const nSpots = L.n ? at(L.n, stade) : 0, grow = at(L.grow, stade) || 1;
      if (nSpots) {                                                     // taches de rayon r (unités de l'atlas)
        const r = (at(L.r, stade) || 3) * U;
        for (let s = 0; s < nSpots; s++) { const ctr = vs[Math.floor(rnd() * vs.length)], rr = r * (0.7 + 0.6 * rnd()); const sub = vs.filter((v) => v.p.distanceTo(ctr.p) < rr).map((v) => ({ ...v, w: v.p.distanceTo(ctr.p) / rr })); peindreCouche(sub, L.col, alpha, L.k, L); }
      } else if (L.n == null) peindreCouche(vs.map((v) => ({ ...v, w: Math.min(1, v.d / Math.min(1, grow)) })), L.col, alpha, L.k, L);   // n = 0 à ce stade : pas de tache (et non toute la zone)
    }
    for (const L of e.les || []) {
      const n = at(L.n, stade) || 0; if (!n) continue;
      const vs = [].concat(L.z).filter((z) => Z[z]).flatMap((z) => verts(z)); if (!vs.length) continue;
      let samples = [];
      if (L.line) {                                                     // sillons et traits : points alignés sur la peau
        const per = Math.max(2, Math.round((L.len || 2.5) / (L.step || 0.3)));
        for (let l = 0; l < Math.ceil(n / 2); l++) { const s0 = vs[Math.floor(rnd() * vs.length)], d = L.dir ? V3(...L.dir).normalize() : V3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize();
          for (let j = 0; j < per; j++) { const q = s0.p.clone().addScaledVector(d, j * (L.step || 0.3) * U * 4); let b = null, bd = 1e9; for (let k = 0; k < vs.length; k += 3) { const dd = vs[k].p.distanceToSquared(q); if (dd < bd) { bd = dd; b = vs[k]; } } if (b && bd < (0.02) ** 2) samples.push(b); } }
      } else if (L.grappe) {                                           // vésicules en bouquets (herpès, zona)
        const ng = L.ng || 1, R = L.grappe * U * 4;
        for (let g = 0; g < ng; g++) { const c0 = vs[Math.floor(rnd() * vs.length)], near = vs.filter((v) => v.p.distanceTo(c0.p) < R); for (let i = 0; i < Math.ceil(n / ng); i++) samples.push(near[Math.floor(rnd() * near.length)]); }
      } else for (let i = 0; i < n; i++) { const v = vs[Math.floor(rnd() * vs.length)]; if (v.d > 0.9 && rnd() < 0.5) continue; samples.push(v); }
      relief(samples, L.m, L.s || 0.2, { col: L.col, flat: L.flat, len: L.len ? 2.2 : undefined, dir: L.dir });
    }
    A.applyTenue && A.applyTenue();
    return true;
  }
  function effacer() { for (const g of groupes) g.parent && g.parent.remove(g); groupes.length = 0; }
  /* point de vue rapproché sur la lésion (repère du modèle au repos -> monde, posture actuelle approchée par l'os le plus proche) */
  function regard() {
    if (!centre) return null; const vs = verts(centre.zone); if (!vs.length) return null;
    gltf.scene.updateMatrixWorld(true);
    const monde = (v) => { const sk = v.m.skeleton, bone = sk.bones[v.bone], toBone = sk.boneInverses[v.bone].clone().multiply(v.m.bindMatrix), toMesh = gltf.scene.matrixWorld.clone().invert().multiply(v.m.matrixWorld).invert();
      return { p: v.p.clone().applyMatrix4(toMesh).applyMatrix4(toBone).applyMatrix4(bone.matrixWorld), n: v.n.clone().transformDirection(toMesh).transformDirection(toBone).transformDirection(bone.matrixWorld) }; };
    const couche = A.base === 'lit' || (A.stage && A.stage.lie);
    let w;
    if (couche) {                                  // patient allongé : on choisit le point de la lésion le plus tourné vers le haut (le dessous touche le matelas)
      const cand = vs.slice().sort((a, b) => a.d - b.d).slice(0, 120).map(monde); w = cand.reduce((a, x) => (x.n.y > a.n.y ? x : a));
      const n = w.n.clone(), cache = n.y < 0.2;           // lésion sous le corps (talon, sacrum) : on regarde de côté, au ras du matelas
      if (cache) {                                         // pieds : depuis le bout du lit ; ailleurs : de côté, au-dessus de la barrière
        const kz = A.rig.bones.LeftLeg ? A.rig.bones.LeftLeg.getWorldPosition(V3(0, 0, 0)).z : w.p.z - 1;
        if (w.p.z > kz + 0.15) n.set(Math.sign(w.p.x || 1), 0.8, 0.45); else n.set(Math.sign(w.p.x || 1), 0.9, 0);
      } else n.y = Math.max(n.y, 0.75);
      n.normalize();
      const dist = cache ? 0.6 : Math.max(0.3, Math.min(0.6, centre.R * 3.2)), pos = w.p.clone().add(n.multiplyScalar(dist)); pos.y = Math.max(pos.y, w.p.y + (cache ? 0.12 : 0.25));
      return { pos, look: w.p };
    }
    w = monde(vs.reduce((a, x) => (x.d < a.d ? x : a)));
    const n = w.n; if (n.z < 0.15) n.z = 0.15; n.normalize();
    const dist = Math.max(0.22, Math.min(0.55, centre.R * 3.2));
    return { pos: w.p.clone().add(n.multiplyScalar(dist)), look: w.p };
  }
  return { appliquer, effacer, regard, zones: Object.keys(Z), verts };
}
