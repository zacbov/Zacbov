/* TP 3 — réactions de base : la paillasse du TP 2, montée pour un dosage (burette sur l'agitateur, électrode de pH)
   et pour les tests en tubes (portoir, flacons compte-gouttes, bain-marie). */
import { THREE, charger } from '../chimio/scene3d.js';
function etiquetteTexture(lignes, o = {}) {        // lignes : [texte, taille px, gras], centrées
  const cv = document.createElement('canvas'); cv.width = o.w || 256; cv.height = o.h || 200; const g = cv.getContext('2d');
  g.fillStyle = '#fffdf6'; g.fillRect(0, 0, cv.width, cv.height); g.strokeStyle = o.bord || '#7a3b8f'; g.lineWidth = 8; g.strokeRect(4, 4, cv.width - 8, cv.height - 8);
  g.fillStyle = '#1d1b18'; g.textAlign = 'center'; g.textBaseline = 'middle';
  lignes.filter((l) => l[0]).forEach(([t, px, gras], i, a) => { let f = px; do { g.font = `${gras ? 'bold ' : ''}${f}px "IBM Plex Sans", Arial, sans-serif`; f -= 2; } while (g.measureText(t).width > cv.width - 24 && f > 12); g.fillText(t, cv.width / 2, cv.height / 2 + (i - (a.length - 1) / 2) * px * 1.15); });
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
import { creerPaillasse } from '../magistrales/paillasse.js';
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

export async function creerReactions(R) {
  const P = await creerPaillasse(R); const { scene, camera } = P.vue; const H = P.H, O = P.objets;
  for (const k of ['mortier', 'pilon', 'pate', 'gelulier', 'pot', 'flacon', 'support', 'burette', 'becherB', 'tubeG', 'entonnoir']) if (O[k]) O[k].visible = false;
  const verre = new THREE.MeshPhysicalMaterial({ color: 0xeaf4f8, roughness: 0.05, transparent: true, opacity: 0.25, depthWrite: false, side: THREE.DoubleSide, clearcoat: 1 });

  /* ---------- bécher de l'agitateur : solution dont on règle le volume et la couleur ---------- */
  O.agit.updateMatrixWorld(true);
  let beaker = null; O.agit.traverse((o) => { if (/^Beaker/.test(o.name)) beaker = o; });
  const bb = new THREE.Box3().setFromObject(beaker || O.agit), BC = bb.getCenter(V3(0, 0, 0)), rB = Math.min(bb.max.x - bb.min.x, bb.max.z - bb.min.z) / 2 * 0.9;
  const sol = O.solution; let sol0 = null;
  if (sol) { const b = new THREE.Box3().setFromObject(sol); sol0 = { bas: b.min.y, h: b.max.y - b.min.y, sy: sol.scale.y, py: sol.position.y }; }
  const fondB = sol0 ? sol0.bas : bb.min.y + 0.004;
  function liquide(mL, couleur = '#e8f2f6', opacite = 0.35) {
    if (!sol) return; sol.visible = mL > 0.2; if (!sol.visible) return;
    const h = Math.min(bb.max.y - fondB - 0.004, (mL * 1e-6) / (Math.PI * rB * rB)), k = Math.max(0.02, h / sol0.h);
    sol.scale.y = sol0.sy * k; sol.position.y = sol0.py; sol.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(sol); const ws = sol.parent.getWorldScale(V3(0, 0, 0)).y || 1; sol.position.y += (sol0.bas - b.min.y) / ws;
    sol.material.color.setStyle(couleur); sol.material.opacity = opacite; sol.userData.haut = sol0.bas + h;
  }
  const surfaceB = () => (sol && sol.visible ? sol.userData.haut || fondB : fondB);

  /* ---------- burette de 50 mL sur son support, au-dessus du bécher ---------- */
  const burette = P.verreGLB((await charger('burette.glb')).scene.clone());
  const pointeY = bb.max.y + 0.012; burette.position.set(BC.x, pointeY, BC.z); scene.add(burette); burette.updateMatrixWorld(true);
  const L0 = new THREE.Box3().setFromObject(burette).min.y - pointeY; burette.position.y -= L0;   // pointe de la burette (bas du modèle) juste au-dessus du bécher
  const arriere = new THREE.Box3().setFromObject(O.agit).min.z - 0.035;
  const support = new THREE.Group(); { const metal = new THREE.MeshStandardMaterial({ color: 0x9aa3ab, metalness: 0.7, roughness: 0.35 });
    const socle = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.012, 0.12), new THREE.MeshStandardMaterial({ color: 0x3b4046, roughness: 0.5 })); socle.position.set(0, 0.006, -0.04); support.add(socle);
    const tige = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.78, 12), metal); tige.position.set(0, 0.39, 0); support.add(tige);
    for (const y of [pointeY - H + 0.24, pointeY - H + 0.44]) { const l = BC.z - arriere; const p = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.01, l), metal); p.position.set(0, y, l / 2); support.add(p);
      const m = new THREE.Mesh(new THREE.TorusGeometry(0.009, 0.002, 6, 16), metal); m.rotation.x = Math.PI / 2; m.position.set(0, y, l); support.add(m); }
    support.traverse((o) => { if (o.isMesh) o.castShadow = true; }); }
  support.position.set(BC.x, H, arriere); scene.add(support);
  // colonne de soude dans la burette (graduation 0 en haut, 50 mL près du robinet)
  const B0 = 0.455, B50 = 0.17, rBur = 0.0052;
  const colonne = new THREE.Mesh(new THREE.CylinderGeometry(rBur, rBur, 1, 16), new THREE.MeshPhysicalMaterial({ color: 0xdfeef7, transparent: true, opacity: 0.55, roughness: 0.05, depthWrite: false }));
  colonne.renderOrder = 1; burette.add(colonne);
  const menisque = new THREE.Mesh(new THREE.TorusGeometry(rBur * 0.8, 0.0009, 6, 20), new THREE.MeshBasicMaterial({ color: 0x5a7a8c })); menisque.rotation.x = Math.PI / 2; burette.add(menisque);
  function buretteNiveau(vVerse, plein = true) {
    colonne.visible = menisque.visible = plein; if (!plein) return;
    const y = B0 - (Math.max(0, Math.min(50, vVerse)) / 50) * (B0 - B50), bas = 0.04; colonne.scale.y = y - bas; colonne.position.y = L0 + (y + bas) / 2; menisque.position.y = L0 + y;
  }
  buretteNiveau(0, false);
  // gouttes qui tombent de la pointe
  const gouttes = []; const gM = new THREE.MeshPhysicalMaterial({ color: 0xdfeef7, transparent: true, opacity: 0.8, roughness: 0.05 });
  for (let i = 0; i < 8; i++) { const g = new THREE.Mesh(new THREE.SphereGeometry(0.0022, 10, 8), gM); g.visible = false; g.scale.y = 1.25; scene.add(g); gouttes.push({ g, t: 0, de: null, a: null }); }
  function goutte(de, a, couleur) { const d = gouttes.find((x) => !x.g.visible); if (!d) return; d.g.visible = true; d.t = 0; d.de = de.clone(); d.a = a.clone(); if (couleur) d.g.material = new THREE.MeshPhysicalMaterial({ color: couleur, transparent: true, opacity: 0.85 }); else d.g.material = gM; d.g.position.copy(de); }
  const gouttePointe = () => goutte(V3(BC.x, pointeY - 0.004, BC.z), V3(BC.x, surfaceB(), BC.z));
  // turbulence de surface quand on agite
  let agitation = 0;
  // barreau aimanté : son origine n'est pas en son centre ; on le recentre dans le bécher et on le fait tourner autour d'un pivot vertical
  const barreau = (() => { let b = null; O.agit.traverse((o) => { if (/StirBar/.test(o.name)) b = o; }); if (!b) return null;
    const c = new THREE.Box3().setFromObject(b).getCenter(V3(0, 0, 0)); const pivot = new THREE.Group(); pivot.position.set(BC.x, c.y, BC.z); scene.add(pivot); pivot.updateMatrixWorld(true);
    pivot.attach(b); b.position.sub(V3(c.x - BC.x, 0, c.z - BC.z)); return pivot; })();

  /* ---------- électrode de pH : celle du pH-mètre est remplacée par une électrode qui plonge dans le bécher ---------- */
  O.phm.traverse((o) => { if (/^Electrode/.test(o.name)) o.visible = false; });
  const electrode = new THREE.Group(); { const corps = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.13, 16), new THREE.MeshPhysicalMaterial({ color: 0xe6f0f4, transparent: true, opacity: 0.55, roughness: 0.1 })); corps.position.y = 0.065; electrode.add(corps);
    const bulbe = new THREE.Mesh(new THREE.SphereGeometry(0.0065, 16, 10), corps.material); bulbe.position.y = 0.0; electrode.add(bulbe);
    const tete = new THREE.Mesh(new THREE.CylinderGeometry(0.0075, 0.0075, 0.04, 16), new THREE.MeshStandardMaterial({ color: 0x23272b, roughness: 0.5 })); tete.position.y = 0.15; electrode.add(tete); }
  scene.add(electrode);
  const phb = new THREE.Box3().setFromObject(O.phm), phC = phb.getCenter(V3(0, 0, 0));
  const eRepos = V3(phb.min.x - 0.03, H + 0.005, phb.max.z - 0.02), eDans = V3(BC.x + rB * 0.5, fondB + 0.012, BC.z + rB * 0.25);
  electrode.position.copy(eRepos); electrode.rotation.z = Math.PI / 2;
  const cableM = new THREE.MeshStandardMaterial({ color: 0x23272b, roughness: 0.6 }); let cable = null;
  function majCable() { if (cable) { scene.remove(cable); cable.geometry.dispose(); } const a = electrode.localToWorld(V3(0, 0.17, 0)), b = V3(phC.x - 0.02, phb.min.y + 0.05, phb.max.z - 0.03);
    const m = a.clone().lerp(b, 0.5).add(V3(0, 0.08, 0.02)); cable = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([a, m, b]), 30, 0.0018, 6), cableM); scene.add(cable); }
  majCable();
  async function plongerElectrode(on) { const p0 = electrode.position.clone(), r0 = electrode.rotation.z, p1 = on ? eDans : eRepos, r1 = on ? 0 : Math.PI / 2, haut = Math.max(p0.y, p1.y) + 0.16;
    await R.tween(1.0, (e) => { electrode.position.lerpVectors(p0, p1, e); electrode.position.y = e < 0.5 ? p0.y + (haut - p0.y) * (e * 2) : haut + (p1.y - haut) * ((e - 0.5) * 2); electrode.rotation.z = r0 + (r1 - r0) * Math.min(1, e * 2); majCable(); }); }

  /* ---------- portoir de tubes à essai ---------- */
  const RX = -0.14, RZ = 0.12, NT = 3, DX = 0.045;
  const portoir = new THREE.Group(); { const bois = new THREE.MeshStandardMaterial({ color: 0x2f6fd6, roughness: 0.5 });
    for (const [y, h] of [[0.004, 0.008], [0.075, 0.006]]) { const pl = new THREE.Mesh(new THREE.BoxGeometry(DX * NT + 0.03, h, 0.04), bois); pl.position.y = y; portoir.add(pl); }
    for (const x of [-1, 1]) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.075, 0.04), bois); m.position.set(x * (DX * NT + 0.024) / 2, 0.04, 0); portoir.add(m); } }
  portoir.position.set(RX, H, RZ); scene.add(portoir);
  const RT = 0.0078, AIRE = Math.PI * RT * RT;
  const tubes = [];
  for (let i = 0; i < NT; i++) {
    const g = new THREE.Group(); const t = P.tubeModele ? P.tubeModele.clone() : new THREE.Mesh(new THREE.CylinderGeometry(0.0095, 0.0095, 0.15, 20, 1, true), verre); if (!P.tubeModele) t.position.y = 0.075; g.add(t);
    const liqM = new THREE.MeshPhysicalMaterial({ color: 0xeef5f8, transparent: true, opacity: 0.5, roughness: 0.08, depthWrite: false });
    const liq = new THREE.Mesh(new THREE.CylinderGeometry(RT, RT, 1, 20), liqM); liq.renderOrder = 1; liq.visible = false; g.add(liq);
    const pr = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.0011, 0), new THREE.MeshStandardMaterial({ roughness: 0.9 }), 160); pr.count = 0; g.add(pr);
    const lab = new THREE.Mesh(new THREE.PlaneGeometry(0.022, 0.016), new THREE.MeshBasicMaterial({ map: etiquetteTexture([[String.fromCharCode(65 + i), 120, true]], { w: 160, h: 120, y0: 92 }) }));
    lab.position.set(0, 0.075, 0.0205); portoir.add(lab); lab.position.x = (i - (NT - 1) / 2) * DX;
    const maison = V3(RX + (i - (NT - 1) / 2) * DX, H + 0.009, RZ); g.position.copy(maison); scene.add(g);
    tubes.push({ g, liq, pr, maison, etat: { v: 0 } });
  }
  const mtx = new THREE.Matrix4(), col = new THREE.Color();
  function tube(i, { v, couleur, opacite = 0.55, precipite = 0, precCouleur = '#ffffff', trouble = 0 } = {}) {
    const T = tubes[i]; if (!T) return; const h = Math.min(0.12, (v || 0) * 1e-6 / AIRE);
    T.liq.visible = h > 0.001; T.liq.scale.y = Math.max(0.001, h); T.liq.position.y = 0.004 + h / 2;
    if (couleur) T.liq.material.color.setStyle(couleur); T.liq.material.opacity = Math.min(0.95, opacite + trouble * 0.35);
    T.pr.count = Math.round(160 * Math.max(0, Math.min(1, precipite))); T.pr.material.color.setStyle(precCouleur);
    for (let k = 0; k < T.pr.count; k++) { const a = k * 2.4, r = Math.sqrt((k % 23) / 23) * RT * 0.85, y = 0.005 + (k % 7) * 0.0009 + trouble * ((k * 37) % 100) / 100 * h * 0.8;
      mtx.makeRotationY(k).setPosition(Math.cos(a) * r, Math.min(y, 0.004 + h), Math.sin(a) * r); T.pr.setMatrixAt(k, mtx); }
    T.pr.instanceMatrix.needsUpdate = true; T.h = h;
  }
  const hautTube = (i) => tubes[i].g.position.clone().add(V3(0, 0.155, 0));

  /* ---------- flacons compte-gouttes étiquetés ---------- */
  const flacons = {}; let fx = -0.4;
  function flaconCG(id, nom, couleur, brun = false) {
    const g = new THREE.Group(); const corps = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.055, 24), new THREE.MeshPhysicalMaterial({ color: brun ? 0x6b3410 : 0xeaf2f4, transparent: true, opacity: brun ? 0.9 : 0.4, roughness: 0.1, depthWrite: !(!brun) }));
    corps.position.y = 0.0275; g.add(corps);
    const liq = new THREE.Mesh(new THREE.CylinderGeometry(0.0155, 0.0155, 0.035, 20), new THREE.MeshStandardMaterial({ color: couleur, transparent: true, opacity: 0.8 })); liq.position.y = 0.019; if (!brun) g.add(liq);
    const col_ = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.012, 0.01, 20), corps.material); col_.position.y = 0.06; g.add(col_);
    const poire = new THREE.Mesh(new THREE.SphereGeometry(0.009, 16, 10), new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.7 })); poire.scale.y = 1.4; poire.position.y = 0.078; g.add(poire);
    const et = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 0.026), new THREE.MeshBasicMaterial({ map: etiquetteTexture([[nom.split(' ').slice(0, 2).join(' '), 34, true], [nom.split(' ').slice(2).join(' '), 30]], { w: 256, h: 220, y0: 80, pas: 52 }) }));
    et.position.set(0, 0.028, 0.0172); g.add(et);
    g.position.set(fx, H, -0.06); fx += 0.05; g.userData.id = id; g.userData.poire = poire; scene.add(g); flacons[id] = g; return g;
  }
  // compte-gouttes (pipette Pasteur à poire)
  const cg = new THREE.Group(); { const tg = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0015, 0.07, 12), verre); tg.position.y = 0.035; cg.add(tg);
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.008, 14, 10), new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.7 })); p.scale.y = 1.5; p.position.y = 0.082; cg.add(p); }
  cg.visible = false; scene.add(cg);
  async function verserGouttes(idFlacon, i, n = 5, couleur) {
    const F = flacons[idFlacon]; if (!F) return; F.userData.poire.visible = false;
    const p0 = F.position.clone().add(V3(0, 0.07, 0)), p1 = hautTube(i).add(V3(0, 0.01, 0)); cg.position.copy(p0); cg.visible = true;
    await R.tween(0.7, (e) => { cg.position.lerpVectors(p0, p1, e); cg.position.y += Math.sin(e * Math.PI) * 0.08; });
    for (let k = 0; k < n; k++) { goutte(p1.clone(), V3(p1.x, tubes[i].g.position.y + 0.004 + (tubes[i].h || 0), p1.z), couleur); await R.attendre(0.18); }
    await R.tween(0.6, (e) => { cg.position.lerpVectors(p1, p0, e); cg.position.y += Math.sin(e * Math.PI) * 0.08; });
    cg.visible = false; F.userData.poire.visible = true;
  }

  /* ---------- bain-marie : les tubes vont dans le portoir du bain ---------- */
  let rackB = null, eauB = null; O.bain.traverse((o) => { if (/^TubeRack/.test(o.name)) rackB = o; if (/^Water/.test(o.name)) eauB = o; });
  const rb = new THREE.Box3().setFromObject(rackB || O.bain), rbc = rb.getCenter(V3(0, 0, 0));
  async function auBain(on) {
    const lev = 0.17;
    await Promise.all(tubes.map((T, i) => { const p0 = T.g.position.clone(), p1 = on ? V3(rbc.x + (i - 1) * 0.03, rb.max.y - 0.07, rbc.z) : T.maison.clone();
      return R.tween(1.2, (e) => { T.g.position.lerpVectors(p0, p1, e); T.g.position.y += Math.sin(e * Math.PI) * lev; }); }));
  }

  /* ---------- pipette jaugée : prise d'essai versée dans le bécher ---------- */
  const pip = O.pipette, pipRepos = { p: pip.position.clone(), r: pip.rotation.clone() };
  async function pipetter() {
    const p0 = pip.position.clone(), r0 = pip.rotation.clone(), p1 = V3(BC.x - rB * 0.78, bb.max.y - 0.03, BC.z + rB * 0.35);   // pointe contre la paroi, côté opposé à la burette (au centre) et à l'électrode
    await R.tween(1.0, (e) => { pip.position.lerpVectors(p0, p1, e); pip.position.y += Math.sin(e * Math.PI) * 0.15; pip.rotation.set(r0.x * (1 - e), r0.y * (1 - e), r0.z * (1 - e) + 0.16 * e); });
    await R.attendre(0.9); while (window.__pipTenir) { window.__pipEnPlace = true; await R.attendre(0.1); } window.__pipEnPlace = false;   // __pipTenir : banc d'essai
    await R.tween(1.0, (e) => { pip.position.lerpVectors(p1, pipRepos.p, e); pip.position.y += Math.sin(e * Math.PI) * 0.15; pip.rotation.set(pipRepos.r.x * e, pipRepos.r.y * e, 0.16 * (1 - e) + pipRepos.r.z * e); });
  }

  /* ---------- animation par image : gouttes, barreau aimanté, ondulation ---------- */
  const tick0 = P.vue.tick;
  P.vue.tick = (dt, t) => {
    tick0 && tick0(dt, t);
    for (const d of gouttes) { if (!d.g.visible) continue; d.t += dt; const k = Math.min(1, d.t / 0.35); d.g.position.lerpVectors(d.de, d.a, k * k); if (k >= 1) d.g.visible = false; }
    if (barreau && agitation) barreau.rotation.y += dt * agitation * 0.12;
  };

  /* ---------- vues ---------- */
  Object.assign(P.VUES, {
    titrage: [V3(BC.x + 0.05, pointeY + 0.12, BC.z + 0.62), V3(BC.x, pointeY + 0.05, BC.z)],
    becher: [V3(BC.x + 0.02, bb.max.y + 0.03, BC.z + 0.32), V3(BC.x, fondB + 0.03, BC.z)],
    burette: [V3(BC.x + 0.03, pointeY + 0.32, BC.z + 0.36), V3(BC.x, pointeY + 0.3, BC.z)],
    tubes: [V3(RX + 0.08, H + 0.26, RZ + 0.42), V3(RX - 0.05, H + 0.06, RZ - 0.06)],
    tubesPres: [V3(RX + 0.01, H + 0.12, RZ + 0.24), V3(RX, H + 0.06, RZ)],
    bainmarie: [V3(rbc.x + 0.12, H + 0.45, rbc.z + 0.45), V3(rbc.x, rb.max.y - 0.03, rbc.z)],
    phmetre: [V3(phC.x - 0.05, H + 0.3, phC.z + 0.45), V3(phC.x - 0.1, H + 0.08, phC.z)],
  });

  return {
    vue: P.vue, regarder: P.regarder, ecran: P.ecran, cliquer: P.cliquer,
    liquide, buretteNiveau, gouttePointe, plongerElectrode, pipetter, tube, verserGouttes, auBain, flaconCG, flacons,
    agiter: (v) => { agitation = v; P.ecran('agit', v ? v + ' tr/min' : '0 tr/min'); },
    bain: (T) => P.ecran('bain', T.toFixed(1) + ' °C'),
    tubesObjets: () => tubes.map((T) => T.g),
    rangerFlacons: (ids) => { for (const id in flacons) flacons[id].visible = false; ids.forEach((id, k) => { const F = flacons[id]; if (!F) return; F.visible = true; F.position.set(RX + 0.135 + k * 0.05, H, RZ + 0.01); }); },
    _dbg: () => ({ bb: [bb.min.toArray(), bb.max.toArray()], pointeY, fondB, BC: BC.toArray(), bur: [new THREE.Box3().setFromObject(burette).min.toArray(), new THREE.Box3().setFromObject(burette).max.toArray()], pip: [new THREE.Box3().setFromObject(pip).min.toArray(), new THREE.Box3().setFromObject(pip).max.toArray()], pipPos: pip.position.toArray(), rB,  beaker: beaker && beaker.name }),
  };
}
