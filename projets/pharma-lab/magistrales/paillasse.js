/* Paillasse 3D du préparatoire : balance, pH-mètre, agitateur, verrerie, mortier, conditionnements. */
import { THREE, charger, carrelage } from '../chimio/scene3d.js';
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

export async function creerPaillasse(R) {
  const v = R.vue({ fond: 0xe9efe9, fov: 34, orbite: true });
  const { scene, camera, controls } = v;
  scene.add(new THREE.HemisphereLight(0xfffbf2, 0x7d7a70, 0.7));
  const key = new THREE.DirectionalLight(0xfff4e2, 1.7); key.position.set(-1.2, 3, 2.2); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -1.5, right: 1.5, top: 1.5, bottom: -1.5 }); key.shadow.radius = 5; scene.add(key);
  const sol = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.MeshStandardMaterial({ map: (() => { const t = carrelage('#d9d3c6', '#cfc8ba', '#b5ad9c', 8); t.repeat.set(8, 8); return t; })(), roughness: 0.85 }));
  sol.rotation.x = -Math.PI / 2; sol.receiveShadow = true; scene.add(sol);
  const mur = new THREE.Mesh(new THREE.PlaneGeometry(10, 4), new THREE.MeshStandardMaterial({ map: (() => { const t = carrelage('#f1f3ee', '#e8ebe4', '#cfd4c9', 12); t.repeat.set(6, 2.4); return t; })(), roughness: 0.6 }));
  mur.position.set(0, 2, -0.55); scene.add(mur);
  // paillasse : plan de travail résine noire sur meuble clair
  const H = 0.9;
  const plan = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.04, 0.8), new THREE.MeshStandardMaterial({ color: 0x2b2d2f, roughness: 0.35, metalness: 0.05 }));
  plan.position.set(0, H - 0.02, -0.12); plan.receiveShadow = true; plan.castShadow = true; scene.add(plan);
  const meuble = new THREE.Mesh(new THREE.BoxGeometry(2.36, H - 0.04, 0.74), new THREE.MeshStandardMaterial({ color: 0xe6e1d6, roughness: 0.6 }));
  meuble.position.set(0, (H - 0.04) / 2, -0.12); scene.add(meuble);
  const etagere = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.025, 0.25), new THREE.MeshStandardMaterial({ color: 0xcfc6b2, roughness: 0.5 }));
  etagere.position.set(0, H + 0.5, -0.42); scene.add(etagere);

  const poser = async (nom, x, z, haut, rotY = 0) => {
    const g = (await charger(nom)).scene.clone(); g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } if (/collider/i.test(o.name)) o.visible = false; });
    const b = new THREE.Box3().setFromObject(g); const s = b.getSize(V3(0, 0, 0));
    if (haut) g.scale.multiplyScalar(haut / s.y);
    const b2 = new THREE.Box3().setFromObject(g); const c = b2.getCenter(V3(0, 0, 0));
    const grp = new THREE.Group(); g.position.sub(V3(c.x, b2.min.y, c.z)); grp.add(g); grp.position.set(x, H, z); grp.rotation.y = rotY; scene.add(grp); return grp;
  };
  const balance = await poser('balance.glb', -0.55, -0.1, null);
  const phm = await poser('phmetre.glb', 0.62, -0.16, null);
  const agit = await poser('agitateur.glb', 0.25, -0.12, null);
  const verrerie = await poser('verrerie.glb', -0.02, -0.4, 0.24);
  const tubesScene = (await charger('tubes_essai.glb')).scene;
  const bain = await poser('bainmarie.glb', -0.98, -0.22, null);
  verrerie.scale.multiplyScalar(0.9);
  /* verrerie et petit matériel achetés (OBJ convertis à leur taille réelle) : verre translucide, graduations opaques */
  const verreGLB = (g) => { g.traverse((o) => { if (!o.isMesh) return; const m = o.material = o.material.clone(); if (m.transparent) { m.depthWrite = false; m.side = THREE.DoubleSide; m.roughness = 0.05; m.metalness = 0; o.castShadow = false; o.renderOrder = 2; } }); return g; };
  const pissette = await poser('pissette.glb', 0, 0, null);
  const entonnoir = verreGLB(await poser('entonnoir.glb', 0.8, 0.2, null));
  const pipette = verreGLB(await poser('pipette.glb', 0, 0, null)); pipette.rotation.set(0, 0.2, Math.PI / 2); pipette.position.set(0.3, H + 0.004, 0.22);
  const centri = await poser('centrifugeuse.glb', 0.98, -0.31, null, -0.35);
  // burette sur son support, bécher sous la pointe
  const support = new THREE.Group(); { const metal = new THREE.MeshStandardMaterial({ color: 0x9aa3ab, metalness: 0.7, roughness: 0.35 });
    const socle = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.012, 0.2), new THREE.MeshStandardMaterial({ color: 0x3b4046, roughness: 0.5 })); socle.position.set(0, 0.006, -0.04); support.add(socle);
    const tige = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.72, 12), metal); tige.position.set(0, 0.36, -0.11); support.add(tige);
    for (const y of [0.3, 0.56]) { const pince = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.01, 0.1), metal); pince.position.set(0, y, -0.06); support.add(pince); }
    support.traverse((o) => { if (o.isMesh) o.castShadow = true; }); }
  support.position.set(-0.34, H, -0.3); scene.add(support);
  const burette = verreGLB(await poser('burette.glb', -0.34, -0.3, null)); burette.position.y = H + 0.1;
  const becherB = verreGLB(await poser('becher.glb', -0.34, -0.3, null)); becherB.scale.setScalar(0.62);
  const becherModele = verreGLB((await charger('becher.glb')).scene.clone());
  const tubeModele = (() => { let t = null; const g = verreGLB(tubesScene.clone()); g.traverse((o) => { if (o.isMesh && /model_0/.test(o.name)) t = o; }); if (!t) return null;
    t = t.clone(); t.position.set(0, 0, 0); t.rotation.set(0, 0, 0); t.scale.set(1, 1, 1); t.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(t); const c = b.getCenter(V3(0, 0, 0)); t.position.set(-c.x, -b.min.y, -c.z); const g2 = new THREE.Group(); g2.add(t); return g2; })();

  /* afficheur dynamique : plan à texture canvas posé sur l'écran du modèle ; chiffres moulés du modèle masqués */
  const afficheur = (grp, couleur = '#9ff0c8') => {
    grp.updateMatrixWorld(true); let ecran = null, best = 0;
    grp.traverse((o) => { if (o.isMesh && o.material && o.material.name === 'screen') { const b = new THREE.Box3().setFromObject(o); const s = b.getSize(V3(0, 0, 0)); const a = s.x * s.y + s.y * s.z + s.x * s.z; if (a > best) { best = a; ecran = b; } } });
    if (!ecran) return { set() {} };
    const s = ecran.getSize(V3(0, 0, 0)), c = ecran.getCenter(V3(0, 0, 0)), marge = ecran.clone().expandByScalar(0.004);
    grp.traverse((o) => { if (o.isMesh && o.material && /^ui_|print_grey/.test(o.material.name)) { const b = new THREE.Box3().setFromObject(o); if (marge.containsPoint(b.getCenter(V3(0, 0, 0)))) o.visible = false; } });
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 160; const g = cv.getContext('2d');
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
    let geo, pos = c.clone(), rot = new THREE.Euler();
    if (s.z <= s.x && s.z <= s.y) { geo = new THREE.PlaneGeometry(s.x * 0.96, s.y * 0.9); pos.z = ecran.max.z + 0.0012; }          // écran vertical face à +z
    else if (s.y <= s.x) { geo = new THREE.PlaneGeometry(s.x * 0.96, s.z * 0.9); pos.y = ecran.max.y + 0.0012; rot.x = -Math.PI / 2; } // écran horizontal
    else { geo = new THREE.PlaneGeometry(s.z * 0.96, s.y * 0.9); pos.x = ecran.max.x + 0.0012; rot.y = Math.PI / 2; }
    const m = new THREE.Mesh(geo, mat); m.position.copy(pos); m.rotation.copy(rot); scene.add(m);
    const set = (txt, petit = '') => {
      g.fillStyle = '#0d1512'; g.fillRect(0, 0, 512, 160); g.fillStyle = couleur; g.textAlign = 'right'; g.textBaseline = 'middle';
      let fs = 92; do { g.font = '600 ' + fs + 'px "IBM Plex Mono", monospace'; fs -= 4; } while (g.measureText(txt).width > 470 && fs > 30); g.fillText(txt, 492, petit ? 70 : 82);
      if (petit) { g.font = '28px "IBM Plex Mono", monospace'; g.globalAlpha = 0.75; g.fillText(petit, 492, 136); g.globalAlpha = 1; }
      tex.needsUpdate = true;
    };
    set(''); return { set };
  };
  const ecrans = { balance: afficheur(balance), ph: afficheur(phm, '#9fe3f0'), bain: afficheur(bain, '#ffc46b'), agit: afficheur(agit, '#ffc46b') };
  // le bécher de l'agitateur : on retrouve la solution pour la teinter selon le pH
  let solution = null; agit.traverse((o) => { if (/solution|medium|liquid/i.test(o.name) && o.isMesh) solution = o; });
  if (solution) { solution.material = solution.material.clone(); solution.material.transparent = true; solution.material.opacity = 0.75; }
  // mortier et pilon (tour)
  const pts = [V3(0, 0, 0), V3(0.05, 0, 0), V3(0.065, 0.01, 0), V3(0.07, 0.05, 0), V3(0.075, 0.075, 0), V3(0.066, 0.075, 0), V3(0.06, 0.045, 0), V3(0.04, 0.02, 0), V3(0.0, 0.016, 0)].map((p) => new THREE.Vector2(p.x, p.y));
  const mortier = new THREE.Mesh(new THREE.LatheGeometry(pts, 40), new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.55, side: THREE.DoubleSide }));
  mortier.position.set(-0.1, H, 0.08); mortier.castShadow = true; scene.add(mortier);
  const pilon = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.02, 0.15, 20), mortier.material); pilon.position.set(-0.08, H + 0.09, 0.08); pilon.rotation.z = 0.5; scene.add(pilon);
  const pate = new THREE.Mesh(new THREE.SphereGeometry(0.055, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }));
  pate.scale.set(1, 0.3, 1); pate.position.set(-0.1, H + 0.045, 0.08); pate.visible = false; scene.add(pate);
  // conditionnements : pot, flacon verre brun, gélulier
  const pot = new THREE.Group(); const potM = new THREE.MeshStandardMaterial({ color: 0xf7f7f4, roughness: 0.4 });
  const pc = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.038, 0.05, 32), potM); pc.position.y = 0.025; pot.add(pc);
  const pcv = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.018, 32), new THREE.MeshStandardMaterial({ color: 0x1f6f68, roughness: 0.5 })); pcv.position.y = 0.06; pot.add(pcv);
  pot.position.set(0.95, H, 0.12); scene.add(pot);
  const flacon = new THREE.Group(); const brun = new THREE.MeshStandardMaterial({ color: 0x5a2d0c, roughness: 0.15, transparent: true, opacity: 0.85 });
  const fc = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.11, 32), brun); fc.position.y = 0.055; flacon.add(fc);
  const fg = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.03, 0.025, 24), brun); fg.position.y = 0.122; flacon.add(fg);
  const fb = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.02, 24), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 })); fb.position.y = 0.143; flacon.add(fb);
  flacon.position.set(1.05, H, -0.05); scene.add(flacon);
  const gelulier = new THREE.Group(); const gm = new THREE.MeshStandardMaterial({ color: 0xdde3e8, roughness: 0.3, metalness: 0.3 });
  const gb = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.025, 0.14), gm); gb.position.y = 0.0125; gelulier.add(gb);
  const capsule = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.0035, 0.01, 4, 8), new THREE.MeshStandardMaterial({ color: 0xf6c344, roughness: 0.35 }), 60);
  for (let i = 0; i < 60; i++) { const m = new THREE.Matrix4().makeTranslation(-0.085 + (i % 10) * 0.019, 0.032, -0.05 + Math.floor(i / 10) * 0.02); capsule.setMatrixAt(i, m); }
  capsule.visible = false; gelulier.add(capsule); gelulier.position.set(-0.85, H, 0.15); scene.add(gelulier);


  /* plateau de la balance : contenant posé et tas de poudre proportionnel à la masse */
  const plat = (() => {
    const b = new THREE.Box3().setFromObject(balance); const ray = new THREE.Raycaster(V3((b.min.x + b.max.x) / 2, b.max.y + 0.2, (b.min.z + b.max.z) / 2 - 0.03), V3(0, -1, 0));
    const hits = ray.intersectObject(balance, true).filter((h) => h.object.visible); const y = hits.length ? hits[0].point.y : b.max.y;
    return V3((b.min.x + b.max.x) / 2, y, (b.min.z + b.max.z) / 2 - 0.03);
  })();
  const blanc = new THREE.MeshStandardMaterial({ color: 0xf4f4f0, roughness: 0.5 });
  const verreM = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, transmission: 0.9, transparent: true, opacity: 0.35, thickness: 0.002 });
  const C = {
    nacelle: (() => { const g = new THREE.Group(); const f = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.002, 0.07), blanc); g.add(f);
      for (const [x, z, w, d] of [[0, 0.035, 0.07, 0.002], [0, -0.035, 0.07, 0.002], [0.035, 0, 0.002, 0.07], [-0.035, 0, 0.002, 0.07]]) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.012, d), blanc); m.position.set(x, 0.006, z); g.add(m); } return g; })(),
    becher: (() => { const g = new THREE.Group(); const b = becherModele.clone(); b.scale.setScalar(0.62); g.add(b); return g; })(),
    capsule: new THREE.Mesh(new THREE.LatheGeometry([0, 0.03, 0.045, 0.05].map((r, i) => new THREE.Vector2(r, [0, 0.002, 0.012, 0.02][i])), 32), new THREE.MeshStandardMaterial({ color: 0xf6f3ec, roughness: 0.4, side: THREE.DoubleSide })),
  };
  for (const k in C) { C[k].visible = false; C[k].position.copy(plat); C[k].traverse((o) => { o.castShadow = true; }); scene.add(C[k]); }
  const tas = new THREE.Mesh(new THREE.SphereGeometry(0.02, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95 }));
  tas.visible = false; scene.add(tas);
  const plateau = (cont, masse = 0, couleur = '#ffffff') => {
    for (const k in C) C[k].visible = k === cont;
    tas.visible = !!cont && masse > 0; if (!tas.visible) return;
    const s = Math.min(1.6, Math.max(0.15, Math.cbrt(masse / 5))); tas.scale.set(s, s * 0.6, s); tas.material.color.setStyle(couleur);
    tas.position.copy(plat); tas.position.y += cont === 'capsule' ? 0.004 : 0.002;
  };

  /* grains de poudre dans le mortier : se fondent dans la pâte au fil de la trituration */
  const MC = mortier.position.clone(); const NG = 420;
  const grainsM = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.0022, 0), new THREE.MeshStandardMaterial({ roughness: 0.9 }), NG); grainsM.count = 0; scene.add(grainsM);
  const graines = []; for (let i = 0; i < NG; i++) { const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 0.04; graines.push([Math.cos(a) * r, Math.sin(a) * r, Math.random()]); }
  const mtx = new THREE.Matrix4(), col = new THREE.Color();
  function grains(n, couleurs, homog = 0) {
    grainsM.count = Math.min(NG, n); const cs = [].concat(couleurs || '#ffffff');
    for (let i = 0; i < grainsM.count; i++) {
      const [x, z, h] = graines[i]; const r = Math.hypot(x, z); const y = 0.016 + (r / 0.04) ** 2 * 0.02 + h * 0.006 * (1 - homog);
      const sc = (0.7 + h * 0.8) * (1 - 0.85 * homog); mtx.makeScale(sc, sc, sc).setPosition(MC.x + x, H + y, MC.z + z); grainsM.setMatrixAt(i, mtx);
      grainsM.setColorAt(i, col.setStyle(cs[i % cs.length]));
    }
    grainsM.instanceMatrix.needsUpdate = true; if (grainsM.instanceColor) grainsM.instanceColor.needsUpdate = true;
  }
  /* pilon guidé : angle autour du centre du mortier */
  const pilonA = (a) => { pilon.position.set(MC.x + Math.cos(a) * 0.022, H + 0.085, MC.z + Math.sin(a) * 0.022); pilon.rotation.set(Math.sin(a) * 0.45, 0, -Math.cos(a) * 0.45); };
  const pilonRepos = () => { pilon.position.set(-0.08, H + 0.09, 0.08); pilon.rotation.set(0, 0, 0.5); };
  /* tamis au-dessus du mortier */
  const tamis = new THREE.Group(); { const anneau = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.03, 32, 1, true), new THREE.MeshStandardMaterial({ color: 0xc9ced3, metalness: 0.8, roughness: 0.3, side: THREE.DoubleSide })); tamis.add(anneau);
    const toile = new THREE.Mesh(new THREE.CircleGeometry(0.054, 32), new THREE.MeshStandardMaterial({ color: 0x9aa4ad, metalness: 0.6, roughness: 0.5, transparent: true, opacity: 0.6, side: THREE.DoubleSide })); toile.rotation.x = -Math.PI / 2; toile.position.y = -0.012; tamis.add(toile); }
  tamis.position.set(MC.x, H + 0.13, MC.z); tamis.visible = false; scene.add(tamis);
  /* cristaux au fond du bécher de l'agitateur : se dissolvent */
  const bz = new THREE.Box3().setFromObject(agit); const BC = V3((bz.min.x + bz.max.x) / 2, 0, (bz.min.z + bz.max.z) / 2);
  let fondB = H; { const rc = new THREE.Raycaster(V3(BC.x, bz.max.y + 0.1, BC.z), V3(0, -1, 0)); const hs = rc.intersectObject(agit, true).filter((h) => h.object !== solution && h.object.visible); if (solution) { const sb = new THREE.Box3().setFromObject(solution); fondB = sb.min.y; } else if (hs.length) fondB = hs[hs.length - 1].point.y; }
  const cristaux = new THREE.InstancedMesh(new THREE.BoxGeometry(0.003, 0.003, 0.003), new THREE.MeshStandardMaterial({ roughness: 0.4 }), 80); cristaux.count = 0; scene.add(cristaux);
  function dissoudre(k, couleur = '#ffffff') {
    cristaux.count = Math.round(80 * (1 - k)); cristaux.material.color.setStyle(couleur);
    for (let i = 0; i < cristaux.count; i++) { const a = i * 2.39, r = 0.004 + (i % 9) * 0.0022; mtx.makeRotationY(i).setPosition(BC.x + Math.cos(a + k * 6) * r, fondB + 0.002, BC.z + Math.sin(a + k * 6) * r); cristaux.setMatrixAt(i, mtx); }
    cristaux.instanceMatrix.needsUpdate = true;
  }
  /* tube témoin (indicateur coloré) et bandelette de papier pH, près du pH-mètre */
  const tube = new THREE.Group(); if (tubeModele) tube.add(tubeModele); else { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.15, 20, 1, true), verreM); t.position.y = 0.075; tube.add(t); }
  const tubeLiq = new THREE.Mesh(new THREE.CylinderGeometry(0.0078, 0.0078, 0.03, 20), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, roughness: 0.1 })); tubeLiq.position.y = 0.019; tube.add(tubeLiq);
  const portoir = new THREE.Group(); { const bleu = new THREE.MeshStandardMaterial({ color: 0x2f6fd6, roughness: 0.5 });
    for (const [y, h] of [[0.003, 0.006], [0.07, 0.005]]) { const pl = new THREE.Mesh(new THREE.BoxGeometry(0.06, h, 0.035), bleu); pl.position.y = y; portoir.add(pl); }
    for (const x of [-0.027, 0.027]) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.07, 0.035), bleu); m.position.set(x, 0.037, 0); portoir.add(m); } }
  const tubeG = new THREE.Group(); tubeG.add(portoir); tube.position.y = 0.006; tubeG.add(tube); tubeG.position.set(0.42, H, 0.05); tubeG.visible = false; scene.add(tubeG);
  const bandelette = new THREE.Group(); { const p = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.0008, 0.08), new THREE.MeshStandardMaterial({ color: 0xf2efe6, roughness: 0.9 })); bandelette.add(p);
    const z = new THREE.Mesh(new THREE.BoxGeometry(0.0082, 0.001, 0.014), new THREE.MeshStandardMaterial({ color: 0xe8d9a0, roughness: 0.9 })); z.position.z = 0.03; bandelette.add(z); bandelette.userData.zone = z; }
  bandelette.position.set(0.5, H + 0.001, 0.12); bandelette.visible = false; scene.add(bandelette);
  /* ---------- complément au trait : récipient de mesure + pissette d'eau purifiée ---------- */
  const QX = -0.27, QZ = 0.0;
  const eauM = new THREE.MeshPhysicalMaterial({ color: 0xbfdcec, transparent: true, opacity: 0.6, roughness: 0.05, side: THREE.DoubleSide, depthWrite: false });
  const traitM = new THREE.MeshBasicMaterial({ color: 0x1b2430 });
  const verreR = new THREE.MeshPhysicalMaterial({ color: 0xeaf4f8, roughness: 0.05, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide, clearcoat: 1 });   // sans transmission : le liquide reste visible à travers
  // profil intérieur [y, r] d'un récipient ; volume cumulé pour trouver la hauteur d'un volume donné
  function profil(type, cap) {
    const P = [];
    if (type === 'fiole') {
      const r = cap > 60 ? 0.0065 : 0.0055; const bulbe = (R) => { const Q = [], cy = R * 0.75, haut = cy + Math.sqrt(R * R - r * r); for (let i = 0; i <= 40; i++) { const y = haut * i / 40; Q.push([y, Math.max(r, Math.sqrt(Math.max(0, R * R - (y - cy) ** 2)))]); } return Q; };
      let R = 0.02; for (let k = 0; k < 6; k++) { const Q = bulbe(R); R *= Math.cbrt(cap * 1e-6 * 0.88 / vol(Q, Q[Q.length - 1][0])); }
      P.push(...bulbe(R)); const haut = P[P.length - 1][0];
      const vb = vol(P, haut); const dy = Math.max(0.01, (cap * 1e-6 - vb) / (Math.PI * r * r)); P.push([haut + dy, r], [haut + dy + 0.04, r]);
    } else if (type === 'eprouvette') { const r = 0.0137, h = cap * 1e-6 / (Math.PI * r * r); P.push([0, r], [h + 0.035, r]); }
    else { const r = 0.0225; P.push([0, r], [0.058, r]); }      // bécher (modèle à 62 %)
    return P;
  }
  function vol(P, h) { let v = 0; for (let i = 1; i < P.length; i++) { const [y0, r0] = P[i - 1], [y1, r1] = P[i]; if (y0 >= h) break; const yb = Math.min(y1, h), rb = r0 + (r1 - r0) * ((yb - y0) / (y1 - y0 || 1)); v += Math.PI * (yb - y0) * (r0 * r0 + r0 * rb + rb * rb) / 3; } return v; }
  function hauteur(P, v) { let lo = 0, hi = P[P.length - 1][0]; for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2; if (vol(P, m) < v) lo = m; else hi = m; } return (lo + hi) / 2; }
  const lathe = (P, e = 0, hmax = Infinity, fond = false) => { const pts = fond ? [new THREE.Vector2(0, 0.0006)] : []; for (let i = 0; i < P.length; i++) { const [y, r] = P[i]; if (y <= hmax) { pts.push(new THREE.Vector2(r + e, Math.max(y, fond ? 0.0006 : y))); continue; } const [y0, r0] = P[i - 1]; pts.push(new THREE.Vector2(r0 + (r - r0) * ((hmax - y0) / (y - y0 || 1)) + e, hmax)); break; } return new THREE.LatheGeometry(pts, 40); };
  const rec = { g: new THREE.Group(), P: null, liq: null, dessus: null, type: null };
  rec.g.position.set(QX, H, QZ); scene.add(rec.g);
  function recipient(type, cap, cible) {
    rec.g.clear(); rec.type = type; if (!type) return;
    if (type === 'becher') { const b = becherModele.clone(); b.scale.setScalar(0.62); rec.g.add(b); }
    rec.P = profil(type, cap); const P = rec.P;
    if (type !== 'becher') {
      const paroi = new THREE.Mesh(lathe(P, 0.0012), verreR); paroi.renderOrder = 2; rec.g.add(paroi);
      const fond = new THREE.Mesh(new THREE.CircleGeometry(P[0][1] + 0.0012, 40), verreR); fond.rotation.x = -Math.PI / 2; fond.position.y = 0.0005; rec.g.add(fond);
      if (type === 'eprouvette') { const pied = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.032, 0.006, 6), verreR); pied.position.y = -0.002; rec.g.add(pied);
        for (let v = 10; v <= cap; v += 10) { const y = hauteur(P, v * 1e-6); const t = new THREE.Mesh(new THREE.BoxGeometry(v % 50 ? 0.006 : 0.011, 0.0006, 0.0006), traitM); t.position.set(-0.0145 + (v % 50 ? 0.003 : 0.0055), y, 0.006); rec.g.add(t); } }
    }
    // trait de jauge (fiole) ou graduation du volume voulu
    rec.yTrait = hauteur(P, Math.min(cap, cible) * 1e-6);
    if (type === 'fiole') { const rT = P[P.length - 1][1] + 0.0014; const t = new THREE.Mesh(new THREE.TorusGeometry(rT, 0.0005, 6, 40), traitM); t.rotation.x = Math.PI / 2; t.position.y = hauteur(P, cap * 1e-6); rec.g.add(t); rec.yTrait = t.position.y; }
    rec.liq = new THREE.Mesh(new THREE.BufferGeometry(), eauM); rec.liq.renderOrder = 1; rec.g.add(rec.liq);
    rec.dessus = new THREE.Mesh(new THREE.CircleGeometry(1, 40), eauM); rec.dessus.rotation.x = -Math.PI / 2; rec.liq.renderOrder = 1; rec.g.add(rec.dessus);
  }
  function niveau(ml) {
    if (!rec.type) return; const P = rec.P; const h = Math.min(P[P.length - 1][0] - 0.002, hauteur(P, ml * 1e-6));
    rec.liq.geometry.dispose(); rec.liq.geometry = lathe(P, -0.0002, h, true);
    let r = P[0][1]; for (let i = 1; i < P.length; i++) if (P[i][0] >= h) { const [y0, r0] = P[i - 1], [y1, r1] = P[i]; r = r0 + (r1 - r0) * ((h - y0) / (y1 - y0 || 1)); break; }
    rec.dessus.scale.set(r - 0.0002, r - 0.0002, 1); rec.dessus.position.y = h; rec.h = h;
  }
  // pissette : bout de l'embout repéré dans le maillage (point le plus éloigné de l'axe du flacon)
  pissette.updateMatrixWorld(true);
  const BOUT = (() => {   // axe du corps du flacon = centre des sommets bas ; bout = sommet haut le plus éloigné de cet axe
    const v = V3(0, 0, 0), inv = pissette.matrixWorld.clone().invert(), pts = []; pissette.traverse((o) => { if (!o.isMesh) return; const a = o.geometry.attributes.position; for (let i = 0; i < a.count; i += 2) pts.push(v.fromBufferAttribute(a, i).applyMatrix4(o.matrixWorld).applyMatrix4(inv).clone()); });
    const bas = pts.filter((p) => p.y < 0.06); const cx = bas.reduce((a, p) => a + p.x, 0) / bas.length, cz = bas.reduce((a, p) => a + p.z, 0) / bas.length;
    let best = null, dmax = -1; for (const p of pts) { if (p.y < 0.1) continue; const d = Math.hypot(p.x - cx, p.z - cz); if (d > dmax) { dmax = d; best = p; } } return best || V3(0.05, 0.13, 0); })();
  const dirBout = V3(BOUT.x, 0, BOUT.z).normalize();
  const lacet = (vers) => new THREE.Quaternion().setFromUnitVectors(dirBout, vers.clone().setY(0).normalize());
  const repos = { p: V3(QX - 0.03, H, QZ + 0.17), q: lacet(V3(-1, 0, -0.5)) };
  pissette.position.copy(repos.p); pissette.quaternion.copy(repos.q);
  const jet = new THREE.Mesh(new THREE.CylinderGeometry(0.0009, 0.0009, 1, 8), eauM); jet.visible = false; scene.add(jet);
  let cibleJet = null;
  function posePour(cible) {          // embout au-dessus de la cible, pissette inclinée vers le bas
    const q0 = lacet(V3(-1, 0, 0)); const axe = V3(0, 1, 0).cross(V3(-1, 0, 0)).normalize();
    const q = new THREE.Quaternion().setFromAxisAngle(axe, 0.55).multiply(q0);
    const p = cible.clone().add(V3(0, 0.03, 0)).sub(BOUT.clone().applyQuaternion(q)); return { p, q };
  }
  async function pissetteVers(but, d = 0.6) { const p0 = pissette.position.clone(), q0 = pissette.quaternion.clone(); await R.tween(d, (e) => { pissette.position.lerpVectors(p0, but.p, e); pissette.quaternion.slerpQuaternions(q0, but.q, e); }); }
  function cibleQsp() { return rec.type ? rec.g.position.clone().add(V3(0, rec.P[rec.P.length - 1][0], 0)) : plat.clone().add(V3(0, 0.1, 0)); }
  async function jetEau(d = 0.35) {
    if (!cibleJet) return; pissette.updateMatrixWorld(true); const a = BOUT.clone().applyMatrix4(pissette.matrixWorld); const b = cibleJet.clone(); b.y = rec.type ? rec.g.position.y + (rec.h || 0) : plat.y + 0.02;
    jet.position.copy(a).add(b).multiplyScalar(0.5); jet.scale.set(1, a.distanceTo(b), 1); jet.quaternion.setFromUnitVectors(V3(0, 1, 0), a.clone().sub(b).normalize()); jet.visible = true;
    const s0 = pissette.scale.clone(); await R.tween(d, (e) => { pissette.scale.set(s0.x * (1 - 0.04 * Math.sin(e * Math.PI)), s0.y, s0.z); }); jet.visible = false;
  }
  /* entonnoir posé sur le flacon pendant le conditionnement d'un liquide */
  const entRepos = entonnoir.position.clone();
  /* clics et glissés sur la scène */
  const el = R.renderer.domElement; const ray = new THREE.Raycaster(); const ptr = new THREE.Vector2();
  function cliquer(objets, cb) {
    const down = (e) => { const r = el.getBoundingClientRect(); ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ptr, camera);
      const h = ray.intersectObjects(objets, true)[0]; if (!h) return; let o = h.object; while (o && !objets.includes(o)) o = o.parent; if (o) cb(o); };
    el.addEventListener('pointerdown', down); return () => el.removeEventListener('pointerdown', down);
  }
  /* geste circulaire autour d'un point (le mortier) : cb(angle, delta) */
  function tourner(centre, cb) {
    let actif = false, a0 = null;
    const angle = (e) => { const r = el.getBoundingClientRect(); const q = centre.clone().project(camera); const cxp = r.left + (q.x + 1) / 2 * r.width, cyp = r.top + (1 - q.y) / 2 * r.height; return Math.atan2(e.clientY - cyp, e.clientX - cxp); };
    const down = (e) => { actif = true; a0 = angle(e); controls.enabled = false; el.setPointerCapture(e.pointerId); };
    const move = (e) => { if (!actif) return; const a = angle(e); let d = a - a0; if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI; a0 = a; cb(a, d); };
    const up = () => { actif = false; controls.enabled = true; };
    el.addEventListener('pointerdown', down); el.addEventListener('pointermove', move); el.addEventListener('pointerup', up);
    return () => { el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); controls.enabled = true; };
  }
  /* glissé horizontal (secouer le tamis) : cb(dx en pixels) */
  function secouer(cb) {
    let actif = false, x0 = 0;
    const down = (e) => { actif = true; x0 = e.clientX; controls.enabled = false; el.setPointerCapture(e.pointerId); };
    const move = (e) => { if (!actif) return; cb(e.clientX - x0); x0 = e.clientX; };
    const up = () => { actif = false; controls.enabled = true; };
    el.addEventListener('pointerdown', down); el.addEventListener('pointermove', move); el.addEventListener('pointerup', up);
    return () => { el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); controls.enabled = true; };
  }
  camera.position.set(0.05, H + 0.75, 1.35); controls.target.set(0.05, H + 0.08, -0.12); controls.update();
  controls.minDistance = 0.35; controls.maxDistance = 3; controls.maxPolarAngle = Math.PI * 0.48;
  const vers = (p, t, d = 1) => { const p0 = camera.position.clone(), t0 = controls.target.clone(); return R.tween(d, (e) => { camera.position.lerpVectors(p0, p, e); controls.target.lerpVectors(t0, t, e); }); };
  const VUES = {
    ensemble: [V3(0.05, H + 0.75, 1.35), V3(0.05, H + 0.08, -0.12)],
    balance: [V3(-0.5, H + 0.42, 0.45), V3(-0.55, H + 0.08, -0.1)],
    mortier: [V3(-0.05, H + 0.4, 0.5), V3(-0.1, H + 0.04, 0.08)],
    ph: [V3(0.5, H + 0.42, 0.5), V3(0.45, H + 0.1, -0.14)],
    conditionnement: [V3(0.9, H + 0.4, 0.62), V3(1.0, H + 0.07, 0.03)],
    gelulier: [V3(-0.8, H + 0.38, 0.55), V3(-0.85, H + 0.03, 0.15)],
    bainmarie: [V3(-0.85, H + 0.45, 0.45), V3(-0.98, H + 0.08, -0.22)],
  };
  return {
    vue: v, H, VUES, vers, verreGLB, becherModele, tubeModele, tubesScene, verreR, eauM,
    objets: { mortier, pilon, pate, gelulier, pot, flacon, verrerie, pissette, entonnoir, pipette, centri, support, burette, becherB, agit, phm, bain, balance, tubeG, solution, bandelette },
    regarder: (k) => vers(...VUES[k]),
    ecran: (k, txt, petit) => ecrans[k] && ecrans[k].set(txt, petit),
    plateau, grains, pilonA, pilonRepos, dissoudre, cliquer, tourner, secouer,
    centreMortier: () => MC.clone().setY(H + 0.03),
    tamis: (on, x = 0) => { tamis.visible = on; tamis.position.x = MC.x + x; },
    tube: (on, couleur) => { tubeG.visible = on; if (couleur) tubeLiq.material.color.setStyle(couleur); },
    bandelette: (on, couleur) => { bandelette.visible = on; if (couleur) bandelette.userData.zone.material.color.setStyle(couleur); },
    contenants: { pot, flacon, gelulier },
    teinte: (couleur) => { if (solution) solution.material.color.setStyle(couleur); },
    pate: (on, couleur = '#ffffff') => { pate.visible = on; pate.material.color.setStyle(couleur); },
    gelules: (n, couleur) => { capsule.count = Math.min(60, n); capsule.visible = n > 0; if (couleur) capsule.material.color.setStyle(couleur); },
    triturer: async (s = 1.6) => { const p0 = pilon.rotation.clone(); await R.tween(s, (e) => { pilon.rotation.z = 0.5 + 0.25 * Math.sin(e * Math.PI * 8); pilon.rotation.y = e * Math.PI * 6; }); pilon.rotation.copy(p0); },
    agiter: async (s = 1.6) => { await R.tween(s, (e) => { agit.rotation.y = Math.sin(e * Math.PI * 10) * 0.01; }); },
    qsp: async (type, cap, cible) => {              // type : 'balance' | 'fiole' | 'eprouvette' | 'becher' | null
      if (!type) { cibleJet = null; jet.visible = false; recipient(null); await pissetteVers(repos, 0.5); return; }
      recipient(type === 'balance' ? null : type, cap, cible); cibleJet = cibleQsp(); await pissetteVers(posePour(cibleJet), 0.6);
      if (type !== 'balance') { const y = H + rec.yTrait; await vers(V3(QX + 0.04, y + 0.015, QZ + 0.5), V3(QX, y - 0.02, QZ), 0.8); }
    },
    niveau: (ml) => niveau(ml), jet: (d) => jetEau(d),
    conditionner: async (type) => {
      if (type === 'flacon') { const f = flacon.position.clone(); await R.tween(0.6, (e) => { entonnoir.position.lerpVectors(entRepos, V3(f.x, H + 0.128 + Math.sin(e * Math.PI) * 0.05, f.z), e); }); await R.attendre(0.8); await R.tween(0.6, (e) => { entonnoir.position.lerpVectors(V3(f.x, H + 0.128, f.z), entRepos, e); }); return; } const o = type === 'flacon' ? flacon : type === 'gelulier' ? gelulier : pot; const y0 = o.position.y; await R.tween(0.8, (e) => { o.position.y = y0 + Math.sin(e * Math.PI) * 0.08; }); },
  };
}
