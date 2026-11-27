/* Habillage : l'infirmière (modèle de Tice) vue comme dans un miroir.
   Vestiaire → sas (côté sale) → passage du banc (assise, jambes basculées) → côté propre → zone classe C. */
import { THREE, charger, carrelage } from './scene3d.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const PIECES = ['Corps', 'Yeux', 'Cils', 'Tunique', 'Pantalon', 'Chaussures', 'CheveuxLibres', 'CheveuxAttaches', 'Bague', 'Montre', 'BoucleG', 'BoucleD', 'Charlotte', 'Masque', 'Gants', 'Gants2', 'Casaque', 'Surchaussures'];
const DEPART = ['Corps', 'Yeux', 'Cils', 'Tunique', 'Pantalon', 'Chaussures', 'CheveuxLibres', 'Bague', 'Montre', 'BoucleG', 'BoucleD'];
const DECORS = {
  vestiaire: { mur: ['#e8dcc6', '#dfd0b4', '#cdbb98'], sol: ['#b9a27e', '#a98f69', '#8a7352'] },
  sas: { mur: ['#eef3f6', '#e3ebf0', '#c9d6de'], sol: ['#d5dfe5', '#c8d4db', '#aebcc5'] },
  propre: { mur: ['#e9f4f2', '#dcefec', '#bfdcd7'], sol: ['#d9ece9', '#cde5e1', '#afd0ca'] },
  zac: { mur: ['#e4eef7', '#d8e6f2', '#b9cde0'], sol: ['#cfdeeb', '#c3d4e4', '#a6bcd2'] },
};
const BANC_Z = 0.5;            // banc devant elle (entre elle et le miroir) : côté sale derrière, côté propre devant

/* texture de sachet : icône de Tice + mention */
function sachetTexture(icone, mention) {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 192; const g = cv.getContext('2d');
  g.fillStyle = '#f4f7f8'; g.fillRect(0, 0, 256, 192); g.strokeStyle = '#7fa7c2'; g.lineWidth = 6; g.setLineDash([10, 6]); g.strokeRect(6, 6, 244, 180);
  g.fillStyle = '#16324a'; g.font = 'bold 22px "IBM Plex Mono", monospace'; g.textAlign = 'center'; g.fillText(mention, 128, 176);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  const im = new Image(); im.onload = () => { g.drawImage(im, 78, 18, 100, 100); t.needsUpdate = true; }; im.src = new URL('./icones/' + icone + '.png', import.meta.url).href;
  return t;
}

export async function creerHabillage(R) {
  const v = R.vue({ fond: 0xe8dcc6, fov: 30 });
  const { scene, camera } = v;
  scene.add(new THREE.HemisphereLight(0xfff8ee, 0x8a7a66, 0.6));
  const key = new THREE.DirectionalLight(0xfff1dd, 2.0); key.position.set(-1.2, 2.6, 2.4); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024); Object.assign(key.shadow.camera, { left: -1.5, right: 1.5, top: 2, bottom: -0.2 }); key.shadow.radius = 6; key.shadow.bias = -0.0004;
  scene.add(key); const fill = new THREE.DirectionalLight(0xdfeaff, 0.6); fill.position.set(1.6, 1.4, 1.8); scene.add(fill);
  const mur = new THREE.Mesh(new THREE.PlaneGeometry(8, 4), new THREE.MeshStandardMaterial({ roughness: 0.9 })); mur.position.set(0, 2, -1.3); scene.add(mur);
  const sol = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.MeshStandardMaterial({ roughness: 0.85 })); sol.rotation.x = -Math.PI / 2; sol.receiveShadow = true; scene.add(sol);
  // banc : assise, pieds, ligne rouge pointillée (sale / propre)
  const banc = new THREE.Group(); const bm = new THREE.MeshStandardMaterial({ color: 0xf3f5f6, roughness: 0.45 }); const lis = new THREE.MeshStandardMaterial({ color: 0x5b86c5, roughness: 0.5 });
  const assise = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.045, 0.34), bm); assise.position.y = 0.45; assise.castShadow = true; assise.receiveShadow = true; banc.add(assise);
  const chant = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.012, 0.345), lis); chant.position.y = 0.428; banc.add(chant);
  for (const x of [-0.85, 0, 0.85]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.43, 0.3), bm); p.position.set(x, 0.215, 0); p.castShadow = true; banc.add(p); }
  const tirets = new THREE.Group(); const rouge = new THREE.MeshBasicMaterial({ color: 0xe04848 });
  for (let i = -24; i <= 24; i++) { const t = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.02), rouge); t.rotation.x = -Math.PI / 2; t.position.set(i * 0.15, 0.003, 0); tirets.add(t); }
  const ligneBanc = new THREE.Mesh(new THREE.PlaneGeometry(1.86, 0.012), rouge); ligneBanc.rotation.x = -Math.PI / 2; ligneBanc.position.y = 0.4735; banc.add(ligneBanc);
  banc.add(tirets); scene.add(banc);
  // EPI déposés sur le banc (sachets avec les pictogrammes)
  const epi = new THREE.Group(); banc.add(epi); epi.visible = false;
  const sachets = {};
  for (const [k, ic, txt, x, w] of [['charlotte', 'charlotte', 'CHARLOTTE', -0.75, 0.16], ['masque', 'masque', 'MASQUE', -0.55, 0.15], ['casaque', 'casaque', 'BLOUSE STÉRILE', 0.5, 0.3], ['gants', 'gants', 'GANTS STÉRILES', 0.78, 0.16]]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.012, w * 0.75), [0, 0, new THREE.MeshStandardMaterial({ map: sachetTexture(ic, txt), roughness: 0.7 }), 0, 0, 0].map((x) => x || new THREE.MeshStandardMaterial({ color: 0xe8eef2, roughness: 0.7 })));
    m.position.set(x, 0.48, 0); m.castShadow = true; epi.add(m); sachets[k] = m;
  }
  const sabots = new THREE.Group(); const sm = new THREE.MeshStandardMaterial({ color: 0xf2f4f5, roughness: 0.5 });
  for (const x of [-0.11, 0.11]) { const s = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.16, 6, 12), sm); s.rotation.x = Math.PI / 2; s.scale.set(1, 1, 0.55); s.position.set(x, 0.025, 0); sabots.add(s); }
  scene.add(sabots);
  // vestiaire : casier ; sas : lavabo
  const casier = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.8, 0.4), new THREE.MeshStandardMaterial({ color: 0x9fb6c2, roughness: 0.4, metalness: 0.3 })); casier.position.set(-1.35, 0.9, -1.05); scene.add(casier);
  const lavabo = new THREE.Group(); const lv = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.18, 0.42), new THREE.MeshStandardMaterial({ color: 0xf5f5f2, roughness: 0.2 })); lv.position.y = 0.85; lavabo.add(lv);
  const robinet = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.22), new THREE.MeshStandardMaterial({ color: 0xc9cfd4, metalness: 0.9, roughness: 0.2 })); robinet.position.set(0, 1.05, -0.15); lavabo.add(robinet);
  lavabo.position.set(1.3, 0, -1.0); scene.add(lavabo);
  let zoneCour = 'vestiaire';
  function decor(z) {
    zoneCour = z; const d = DECORS[z]; const tm = carrelage(d.mur[0], d.mur[1], d.mur[2], 10); tm.repeat.set(4, 2); mur.material.map = tm; mur.material.needsUpdate = true;
    const ts = carrelage(d.sol[0], d.sol[1], d.sol[2], 8); ts.repeat.set(6, 6); sol.material.map = ts; sol.material.needsUpdate = true;
    scene.background = new THREE.Color(d.mur[0]);
    casier.visible = z === 'vestiaire'; lavabo.visible = z === 'sas'; banc.visible = z === 'sas' || z === 'propre';
    banc.position.z = z === 'propre' ? -0.55 : BANC_Z;                           // côté propre : le banc est derrière elle
    sabots.visible = z === 'sas' && !etat.sabots; sabots.position.set(0, 0, BANC_Z + 0.42);
  }
  const etat = { sabots: false };

  const g = await charger('infirmiere.glb'); const root = g.scene; scene.add(root);
  const P = {}; const bones = {}; const mats = {};
  root.traverse((o) => {
    if (o.isBone) bones[o.name] = o;
    if (o.isMesh) {
      o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
      for (const m of [].concat(o.material)) {
        mats[m.name] = m;
        if (/^(Hair|Scalp|CheveuxAttaches)/.test(m.name)) { m.transparent = false; m.alphaTest = 0.45; m.side = THREE.DoubleSide; m.depthWrite = true; }
        else if (m.transparent) { m.transparent = false; m.depthWrite = true; }
        if (m.name === 'Casaque_non_tisse') { m.color.setHex(0x9fc4d6); m.roughness = 1; m.side = THREE.DoubleSide; }       // non-tissé stérile, bleu pâle
        if (m.name === 'Tissu_surchaussures') { m.color.setHex(0xf2f4f5); m.roughness = 0.5; m.side = THREE.DoubleSide; }  // sabots blancs
        if (m.name === 'Gants_blancs') { m.color.setHex(0xf0e4c4); m.roughness = 0.45; }                                  // gants stériles crème
        if (m.name === 'CheveuxAttaches') m.color.setRGB(0.55, 0.45, 0.42);
        if (m.name === 'Tunique_pyjama' || m.name === 'Bottom') m.side = THREE.DoubleSide;
      }
    }
  });
  root.traverse((o) => { if ((o.isMesh || o.isGroup || o.type === 'Object3D') && o.name && !o.isBone && !P[o.name]) P[o.name] = o; });
  const piece = (n) => P[n] || P[n.replace(/\s/g, '_')];
  // tenue de ville : la tunique et le pantalon prennent des couleurs « de ville » jusqu'au pyjama
  const VILLE = { Tunique_pyjama: { map: null, ville: 0x8c3b4a, pyjama: 0x2f63a8 }, Bottom: { map: mats.Bottom && mats.Bottom.map, ville: 0x2f3e5c, pyjama: 0xffffff } };
  function tenue(pyjama) {
    for (const [n, x] of Object.entries(VILLE)) { const m = mats[n]; if (!m) continue; m.map = pyjama ? x.map : null; m.color.setHex(pyjama ? x.pyjama : x.ville); m.roughness = pyjama ? 0.85 : 0.9; m.needsUpdate = true; }
  }
  function departVisible() { for (const n of PIECES) if (piece(n)) piece(n).visible = DEPART.includes(n); }
  departVisible(); tenue(false); decor('vestiaire');

  root.updateMatrixWorld(true);
  const wp = (b) => b.getWorldPosition(new THREE.Vector3());
  const B = (n) => bones[Object.keys(bones).find((k) => k.startsWith(n + '_'))];
  const os = { tete: B('Head'), L: [B('LeftArm'), B('LeftForeArm'), B('LeftHand')], R: [B('RightArm'), B('RightForeArm'), B('RightHand')],
    jL: [B('LeftUpLeg'), B('LeftLeg'), B('LeftFoot')], jR: [B('RightUpLeg'), B('RightLeg'), B('RightFoot')], sp: B('Spine1') };
  const repos = new Map(); root.traverse((o) => { if (o.isBone) repos.set(o, o.quaternion.clone()); });
  const H = wp(os.tete).y, HANCHE = wp(os.jL[0]).y;
  camera.position.set(0, H - 0.42, 3.4); camera.lookAt(V3(0, H - 0.5, 0));

  /* gestes des bras : directions (repère du modèle) */
  const POSES = {
    repos: { L: [V3(0.2, -1, 0.06), V3(0.06, -1, 0.22)] },
    tete: { L: [V3(0.75, 0.2, 0.45), 'tete'] },
    devant: { L: [V3(0.32, -0.8, 0.5), V3(-0.5, -0.12, 1)] },
    frotter: { L: [V3(0.3, -0.85, 0.45), V3(-0.62, -0.05, 1)] },
    haut: { L: [V3(0.35, -0.55, 0.55), V3(-0.15, 0.85, 0.45)] },            // rinçage : mains au-dessus des coudes
    assise: { L: [V3(0.25, -0.9, 0.3), V3(0.05, -0.35, 1)] },             // mains sur les cuisses
  };
  /* jambes : debout, assise (cuisses horizontales), jambes levées pour passer au-dessus du banc */
  const JAMBES = {
    debout: null,
    assise: [V3(0.04, -0.12, 1), V3(0, -1, 0.08)],
    levee: [V3(0.04, 0.35, 1), V3(0, -0.45, 0.6)],
  };
  let pose = 'repos', poids = { repos: 1 }, jambes = 'debout', pj = { debout: 1 };
  const qtmp = new THREE.Quaternion(), qp = new THREE.Quaternion();
  const qRoot = new THREE.Quaternion();
  function viser(b, enfant, dir, w) {
    if (w <= 0 || !b || !enfant) return;
    b.updateWorldMatrix(true, false); const a = wp(b), c = wp(enfant); const cur = c.sub(a).normalize(); const tgt = dir.clone().normalize();
    qtmp.setFromUnitVectors(cur, tgt); const qw = b.getWorldQuaternion(new THREE.Quaternion()); const q2 = qtmp.multiply(qw);
    b.parent.getWorldQuaternion(qp); const loc = qp.invert().multiply(q2); b.quaternion.slerp(loc, w); b.updateMatrixWorld(true);
  }
  const monde = (d) => d.clone().applyQuaternion(qRoot);       // directions du repère du modèle → monde
  function dirs(nom, cote, t) {
    const p = POSES[nom]; const s = cote === 'L' ? 1 : -1; const m = (d) => V3(d.x * s, d.y, d.z);
    let up = m(p.L[0]), fo;
    if (p.L[1] === 'tete') { os[cote][1].updateWorldMatrix(true, false); const e = wp(os[cote][1]); const h = wp(os.tete).add(monde(V3(0.1 * s, 0.1, 0.02))); fo = h.sub(e).applyQuaternion(qRoot.clone().invert()); }
    else fo = m(p.L[1]);
    if (nom === 'frotter') fo = fo.clone().add(V3(0.12 * Math.sin(t * 9 + (s > 0 ? 0 : Math.PI)), 0.05 * Math.cos(t * 9), 0));
    if (nom === 'tete') fo = fo.clone().add(V3(0, 0.03 * Math.sin(t * 6), 0));
    return [up, fo];
  }
  /* main au repos : pouce vers l'avant (paume contre la cuisse), doigts légèrement fléchis */
  const doigts = { L: [], R: [] };
  for (const c of ['L', 'R']) for (const d of ['Index', 'Middle', 'Ring', 'Pinky']) for (const i of [1, 2, 3]) { const b = B((c === 'L' ? 'Left' : 'Right') + 'Hand' + d + i); if (b) doigts[c].push(b); }
  const pouce = { L: B('LeftHandThumb1'), R: B('RightHandThumb1') }, majeur = { L: B('LeftHandMiddle1'), R: B('RightHandMiddle1') };
  const qa = new THREE.Quaternion(), qw2 = new THREE.Quaternion(), qpar = new THREE.Quaternion();
  function tournerMonde(b, axe, ang) {
    qa.setFromAxisAngle(axe, ang); b.getWorldQuaternion(qw2); const q2 = qa.multiply(qw2);
    b.parent.getWorldQuaternion(qpar); b.quaternion.copy(qpar.invert().multiply(q2)); b.updateMatrixWorld(true);
  }
  function mainNaturelle(cote, w) {
    if (w <= 0.02 || !pouce[cote] || !majeur[cote]) return;
    const s = cote === 'L' ? 1 : -1, avb = os[cote][1], main = os[cote][2];
    main.updateWorldMatrix(true, true);
    const h = wp(main), axe = wp(majeur[cote]).sub(h).normalize();
    const cible = monde(V3(-0.25 * s, 0, 1)); cible.addScaledVector(axe, -cible.dot(axe)).normalize();
    const angle = () => { const th = wp(pouce[cote]).sub(wp(main)); th.addScaledVector(axe, -th.dot(axe)).normalize(); let a = Math.acos(Math.max(-1, Math.min(1, th.dot(cible)))); if (V3().crossVectors(th, cible).dot(axe) < 0) a = -a; return a; };
    tournerMonde(avb, wp(main).sub(wp(avb)).normalize(), angle() * 0.65 * w); main.updateWorldMatrix(true, true);
    tournerMonde(main, axe, angle() * w);
    const paume = V3().crossVectors(axe, cible).normalize().multiplyScalar(s);
    for (const b of doigts[cote]) { const e = b.children.find((c) => c.isBone); if (!e) continue; const d = wp(e).sub(wp(b)).normalize(); tournerMonde(b, V3().crossVectors(d, paume).normalize(), 0.22 * w); }
  }
  let souffle = 0;
  const pos = { x: 0, y: 0, z: 0, rot: 0 };          // position et orientation de la personne (animées)
  v.tick = (dt, t) => {
    for (const k of Object.keys(poids)) poids[k] = Math.max(0, poids[k] - dt * 3.2);
    poids[pose] = Math.min(1, (poids[pose] || 0) + dt * 6.4);
    for (const k of Object.keys(pj)) pj[k] = Math.max(0, pj[k] - dt * 2.6);
    pj[jambes] = Math.min(1, (pj[jambes] || 0) + dt * 5.2);
    const tot = Object.values(poids).reduce((a, b) => a + b, 0) || 1, totj = Object.values(pj).reduce((a, b) => a + b, 0) || 1;
    root.position.set(pos.x, pos.y, pos.z); root.rotation.y = pos.rot + (v._rot || 0); qRoot.setFromEuler(root.rotation);
    for (const [b, q] of repos) b.quaternion.copy(q);
    root.updateMatrixWorld(true);
    // jambes (mélange des poses)
    for (const c of ['jL', 'jR']) {
      const wDeb = (pj.debout || 0) / totj; if (wDeb > 0.999) continue;
      const a = V3(0, 0, 0), f = V3(0, 0, 0);
      for (const [k, w] of Object.entries(pj)) { if (w <= 0) continue; const J = JAMBES[k] || [V3(0, -1, 0.02), V3(0, -1, -0.02)]; a.addScaledVector(J[0].clone().normalize(), w / totj); f.addScaledVector(J[1].clone().normalize(), w / totj); }
      viser(os[c][0], os[c][1], monde(a), 1); viser(os[c][1], os[c][2], monde(f), 1);
    }
    for (const cote of ['L', 'R']) {
      const a = V3(0, 0, 0), f = V3(0, 0, 0);
      for (const [k, w] of Object.entries(poids)) { if (w <= 0) continue; const [u, fo] = dirs(k, cote, t); a.addScaledVector(u.normalize(), w / tot); f.addScaledVector(fo.normalize(), w / tot); }
      viser(os[cote][0], os[cote][1], monde(a), 1); viser(os[cote][1], os[cote][2], monde(f), 1);
    }
    for (const cote of ['L', 'R']) mainNaturelle(cote, ((poids.repos || 0) + (poids.assise || 0)) / tot);
    souffle += dt; if (os.sp) os.sp.rotation.x += Math.sin(souffle * 1.6) * 0.012;
  };

  const fondre = (o, on, d = 0.45) => {
    if (!o) return Promise.resolve();
    const ms = []; o.traverse((m) => { if (m.isMesh) for (const mt of [].concat(m.material)) ms.push(mt); });
    o.visible = true; ms.forEach((m) => { m.transparent = true; m.depthWrite = true; });
    return R.tween(d, (e) => { ms.forEach((m) => { m.opacity = on ? e : 1 - e; }); }).then(() => { ms.forEach((m) => { m.opacity = 1; m.transparent = false; }); o.visible = on; });
  };
  const anim = (d, f) => R.tween(d, f);
  const lerp = (a, b, e) => a + (b - a) * e;

  /* passage du banc : s'avancer, se retourner, s'asseoir, basculer les jambes côté propre, se lever */
  async function passerBanc() {
    const zAssis = BANC_Z, chute = HANCHE - 0.52;
    await anim(0.9, (e) => { pos.z = lerp(0, zAssis - 0.28, e); });                       // s'approcher
    await anim(0.7, (e) => { pos.rot = lerp(0, Math.PI, e); });                            // dos au banc
    pose = 'assise'; jambes = 'assise';
    await anim(1.0, (e) => { pos.z = lerp(zAssis - 0.28, zAssis + 0.02, e); pos.y = -chute * e; });   // s'asseoir (jambes côté sale)
    await R.attendre(0.4);
    jambes = 'levee'; await R.attendre(0.35);
    await anim(1.6, (e) => { pos.rot = lerp(Math.PI, 2 * Math.PI, e); });                  // pivoter sur l'assise : les jambes passent au-dessus du banc
    jambes = 'assise'; await R.attendre(0.5);
    etat.sabots = true; sabots.visible = false; piece('Chaussures').visible = false; await fondre(piece('Surchaussures'), true, 0.5);   // sabots propres
    pose = 'repos'; jambes = 'debout';
    await anim(1.0, (e) => { pos.y = -chute * (1 - e); pos.z = lerp(zAssis + 0.02, zAssis + 0.3, e); });
    pos.rot = 0;
    // on recadre : elle revient au centre, le banc passe derrière elle
    await anim(1.0, (e) => { pos.z = lerp(zAssis + 0.3, 0, e); banc.position.z = lerp(BANC_Z, -0.55, e) - (zAssis + 0.3) * 0; });
    decor('propre');
  }

  return {
    vue: v, racine: root, _pos: pos, _banc: banc,
    pieces: P,
    montrer: (n, on = true) => Promise.all([].concat(n).map((x) => fondre(piece(x), on))),
    visible: (n) => !!(piece(n) && piece(n).visible),
    geste: async (nom, s = 1.2) => { pose = nom; await R.attendre(s); pose = 'repos'; },
    tenir: (nom) => { pose = nom || 'repos'; },
    zone: (z) => decor(z),
    pyjama: async () => { const ms = [mats.Tunique_pyjama, mats.Bottom].filter(Boolean); await anim(0.35, (e) => ms.forEach((m) => { m.transparent = true; m.opacity = 1 - 0.85 * e; })); tenue(true); await anim(0.35, (e) => ms.forEach((m) => { m.opacity = 0.15 + 0.85 * e; })); ms.forEach((m) => { m.transparent = false; m.opacity = 1; }); },
    epi: (on = true) => { epi.visible = on; },
    ouvrirSachet: async (k) => { const s = sachets[k]; if (!s) return; await anim(0.4, (e) => { s.scale.y = 1 + e * 1.5; s.rotation.z = 0.15 * e; }); },
    prendre: (k) => { if (sachets[k]) sachets[k].visible = false; },
    passerBanc,
    pivoter: () => { v._rot = (v._rot || 0) ? 0 : Math.PI; },
    reset: () => {
      departVisible(); tenue(false); v._rot = 0; Object.assign(pos, { x: 0, y: 0, z: 0, rot: 0 }); etat.sabots = false;
      for (const s of Object.values(sachets)) { s.visible = true; s.scale.set(1, 1, 1); s.rotation.set(0, 0, 0); }
      epi.visible = false; banc.position.z = BANC_Z; decor('vestiaire'); pose = 'repos'; jambes = 'debout';
    },
  };
}
