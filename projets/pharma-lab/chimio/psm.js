/* Poste de sécurité microbiologique (PSM classe II) : matériel dessiné en code (seringue graduée, flacon, poche, tubulure,
   aiguille sécurisée), animations des gestes et manipulations à la souris (piston, homogénéisation, clics sur les objets). */
import { THREE, charger, carrelage, etiquetteTexture } from './scene3d.js';
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

/* ---------- textures ---------- */
function texte(lignes, w = 512, h = 256, opts = {}) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g = cv.getContext('2d');
  g.fillStyle = opts.fond || '#ffffff'; g.fillRect(0, 0, w, h);
  if (opts.bande) { g.fillStyle = opts.bande; g.fillRect(0, 0, w, h * 0.22); }
  g.fillStyle = opts.encre || '#1b2430'; g.textAlign = 'center';
  lignes.forEach((l, i) => { const [t, px, gras, coul] = Array.isArray(l) ? l : [l, 30]; g.font = `${gras ? 'bold ' : ''}${px}px "IBM Plex Sans", Arial, sans-serif`; g.fillStyle = coul || opts.encre || '#1b2430'; g.fillText(t, w / 2, (opts.y0 || 50) + i * (opts.pas || 44)); });
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
/* graduations d'une seringue : bande verticale centrée sur la face avant */
function graduations(G, inverse) {
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 1024; const g = cv.getContext('2d'); g.clearRect(0, 0, 1024, 1024);
  const pas = G <= 6 ? 0.2 : G <= 12 ? 0.2 : G <= 24 ? 1 : G <= 35 ? 1 : 1; const maj = G <= 6 ? 1 : G <= 12 ? 1 : G <= 24 ? 5 : 5;
  g.strokeStyle = '#1b2430'; g.fillStyle = '#1b2430'; g.font = 'bold 44px Arial'; g.textAlign = 'left'; g.textBaseline = 'middle';
  for (let v = 0; v <= G + 1e-9; v += pas) {
    const y = 1024 - (v / G) * 1024; const grand = Math.abs(v / maj - Math.round(v / maj)) < 1e-6; const moyen = !grand && G > 12 && Math.abs(v - Math.round(v)) < 1e-6 && Math.round(v) % 1 === 0 && pas < 1;
    g.lineWidth = grand ? 6 : 3; g.beginPath(); g.moveTo(512 - 70, y); g.lineTo(512 - 70 + (grand ? 70 : moyen ? 48 : 34), y); g.stroke();
    if (grand && v > 0) { const txt = String(Math.round(v * 10) / 10).replace('.', ','), yy = Math.max(26, y);
      if (inverse) { g.save(); g.translate(512 + 10, yy); g.rotate(Math.PI); g.textAlign = 'right'; g.fillText(txt, 0, 0); g.restore(); g.textAlign = 'left'; }
      else g.fillText(txt, 512 + 10, yy); }
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

/* ---------- seringue procédurale : embout en y = 0, corps vers +y ---------- */
const DIMS = { 5: [0.042, 0.0068, 6], 10: [0.058, 0.0088, 12], 20: [0.072, 0.0108, 24], 30: [0.078, 0.0122, 35], 50: [0.092, 0.0148, 60], 60: [0.098, 0.0148, 60] };
function creerSeringue(cap, couleurLiq) {
  const [L, r, G] = DIMS[cap] || DIMS[50]; const g = new THREE.Group();
  const verre = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.08, metalness: 0, transmission: 0.92, thickness: 0.001, transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false });
  const blanc = new THREE.MeshStandardMaterial({ color: 0xf2f4f5, roughness: 0.45 });
  const corps = new THREE.Mesh(new THREE.CylinderGeometry(r, r, L, 48, 1, true, Math.PI), verre); corps.position.y = L / 2; corps.renderOrder = 3; g.add(corps);
  const grad = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.004, r * 1.004, L, 48, 1, true, Math.PI), new THREE.MeshBasicMaterial({ map: graduations(G), transparent: true, depthWrite: false }));
  { const tx = [grad.material.map, graduations(G, true)], ax = new THREE.Vector3();
    grad.onBeforeRender = () => { ax.set(0, 1, 0).transformDirection(grad.matrixWorld); const m = tx[ax.y < -0.2 ? 1 : 0]; if (grad.material.map !== m) { grad.material.map = m; grad.material.needsUpdate = true; } }; }
  grad.position.y = L / 2; grad.renderOrder = 4; g.add(grad);
  const fond = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.55, r * 0.6, 32), verre); fond.position.y = -r * 0.3; g.add(fond);
  const luer = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.38, r * 0.42, 0.012, 24), blanc); luer.position.y = -r * 0.6 - 0.006; g.add(luer);
  const ailettes = new THREE.Mesh(new THREE.BoxGeometry(r * 4.2, 0.0025, r * 1.6), blanc); ailettes.position.y = L; g.add(ailettes);
  const liqMat = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(couleurLiq || '#cfe3f3'), roughness: 0.1, transparent: true, opacity: 0.62, depthWrite: false });
  const liq = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.94, r * 0.94, 1, 40), liqMat); liq.renderOrder = 2; g.add(liq);
  const joint = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.97, r * 0.97, 0.006, 32), new THREE.MeshStandardMaterial({ color: 0x23272b, roughness: 0.6 })); g.add(joint);
  const tige = new THREE.Group(); const tm = new THREE.MeshStandardMaterial({ color: 0xf6f7f8, roughness: 0.35, transparent: true, opacity: 0.9 });
  const b1 = new THREE.Mesh(new THREE.BoxGeometry(r * 1.5, L + 0.012, 0.0016), tm), b2 = new THREE.Mesh(new THREE.BoxGeometry(0.0016, L + 0.012, r * 1.5), tm);
  b1.position.y = b2.position.y = (L + 0.012) / 2; tige.add(b1, b2);
  const pouce = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.05, r * 1.05, 0.0025, 32), tm); pouce.position.y = L + 0.013; tige.add(pouce); g.add(tige);
  const bulles = new THREE.Group(); const bm = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0, transmission: 1, transparent: true, opacity: 0.55, depthWrite: false });
  for (let i = 0; i < 9; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), bm); s.visible = false; s.scale.setScalar(0.0005); bulles.add(s); } g.add(bulles);
  const S = { g, cap, G, L, r, liq: 0, air: 0, bulles: 0, regroupe: 0, liqMat };
  const u = (v) => Math.min(L, (v / G) * L);
  /* tipHaut : embout vers le haut (flacon retourné au-dessus) → l'air monte vers l'embout */
  S.maj = () => {
    const tot = S.liq + S.air; const us = Math.max(0.0005, u(tot)); joint.position.y = us + 0.003; tige.position.y = us + 0.006;
    const monde = new THREE.Vector3(0, 1, 0).applyQuaternion(g.getWorldQuaternion(new THREE.Quaternion())); const tipHaut = monde.y < -0.3;
    const hl = u(S.liq), ha = us - hl;
    liq.visible = S.liq > 0.001; liq.scale.y = Math.max(0.0001, hl); liq.position.y = tipHaut ? us - hl / 2 : hl / 2;
    // bulles : dispersées dans le liquide, regroupées vers l'embout quand on tapote
    const n = Math.min(9, Math.round(S.bulles)); bulles.children.forEach((b, i) => {
      b.visible = i < n && S.liq > 0.01; if (!b.visible) { b.scale.setScalar(0.0005); return; } const rr = r * (0.12 + 0.08 * ((i * 37) % 5) / 5);
      b.scale.setScalar(rr); const a = i * 2.4, rad = r * 0.6 * ((i * 53) % 7) / 7;
      const yLibre = tipHaut ? ha + ((i * 0.13) % 1) * hl : ((i * 0.13) % 1) * hl;
      const yTete = tipHaut ? ha + rr : hl - rr; const y = yLibre + (yTete - yLibre) * S.regroupe;
      b.position.set(Math.cos(a) * rad * (1 - S.regroupe), y, Math.sin(a) * rad * (1 - S.regroupe));
    });
  };
  S.maj(); return S;
}

/* ---------- flacon procédural (verre, liquide, capsule sertie) ---------- */
function creerFlacon(vol, nom, couleurCap, couleurLiq) {
  const g = new THREE.Group(); const k = Math.cbrt(vol / 50); const R = 0.022 * k, H = 0.06 * k;
  const verre = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, transmission: 0.9, thickness: 0.002, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false });
  const prof = [[0, 0], [R, 0], [R, H], [R * 0.95, H + R * 0.25], [R * 0.45, H + R * 0.55], [R * 0.42, H + R * 0.85], [0, H + R * 0.85]].map(([x, y]) => new THREE.Vector2(x, y));
  const corps = new THREE.Mesh(new THREE.LatheGeometry(prof, 40), verre); corps.renderOrder = 3; g.add(corps);
  const sert = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.5, R * 0.5, R * 0.3, 32), new THREE.MeshStandardMaterial({ color: 0xc9ced3, metalness: 0.85, roughness: 0.25 })); sert.position.y = H + R * 0.85 + R * 0.1; g.add(sert);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.5, R * 0.5, R * 0.12, 32), new THREE.MeshStandardMaterial({ color: couleurCap, roughness: 0.4 })); cap.position.y = H + R * 0.85 + R * 0.3; g.add(cap);
  const liqMat = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(couleurLiq), roughness: 0.1, transparent: true, opacity: 0.6, depthWrite: false });
  const liq = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.94, R * 0.94, 1, 32), liqMat); liq.renderOrder = 2; g.add(liq);
  const etq = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.004, R * 1.004, H * 0.55, 40, 1, true, Math.PI * 0.55, Math.PI * 0.9), new THREE.MeshStandardMaterial({ map: texte([[nom, 46, true], ['solution à diluer', 30], ['CYTOTOXIQUE', 32, true, '#b42318']], 512, 200, { y0: 60, pas: 54 }), roughness: 0.6, side: THREE.DoubleSide }));
  etq.position.y = H * 0.45; g.add(etq);
  const F = { g, vol, reste: vol, H, R, retourne: false, flipOff: cap };
  F.maj = () => { const f = Math.max(0, F.reste / vol) * 0.92; const h = H * f; liq.visible = h > 0.0005; liq.scale.y = Math.max(0.0001, h); liq.position.y = F.retourne ? H - h / 2 : h / 2; };
  F.maj(); return F;
}

/* ---------- poche souple à plat (Freeflex) ---------- */
function creerPoche(vol, solvant) {
  const g = new THREE.Group(); const w = vol >= 500 ? 0.15 : 0.12, l = vol >= 500 ? 0.25 : 0.2;
  const sh = new THREE.Shape(); const rr = 0.012; sh.moveTo(-w / 2 + rr, -l / 2); sh.lineTo(w / 2 - rr, -l / 2); sh.quadraticCurveTo(w / 2, -l / 2, w / 2, -l / 2 + rr); sh.lineTo(w / 2, l / 2 - rr); sh.quadraticCurveTo(w / 2, l / 2, w / 2 - rr, l / 2);
  sh.lineTo(-w / 2 + rr, l / 2); sh.quadraticCurveTo(-w / 2, l / 2, -w / 2, l / 2 - rr); sh.lineTo(-w / 2, -l / 2 + rr); sh.quadraticCurveTo(-w / 2, -l / 2, -w / 2 + rr, -l / 2);
  const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.006, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 4 });
  const mat = new THREE.MeshPhysicalMaterial({ color: 0xeef6fb, roughness: 0.25, transmission: 0.6, thickness: 0.01, transparent: true, opacity: 0.82 });
  const sac = new THREE.Mesh(geo, mat); sac.castShadow = true; const coussin = new THREE.Group(); coussin.add(sac); g.add(coussin);
  const lab = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.82, l * 0.55), new THREE.MeshStandardMaterial({ map: texte([['freeflex', 24, false, '#3a6fa5'], [solvant, 40, true], [vol + ' ml', 36, true], ['Solution pour perfusion', 24]], 384, 320, { fond: 'rgba(255,255,255,0.0)', y0: 60, pas: 62 }), transparent: true, roughness: 0.6 }));
  lab.position.set(0, 0.02, 0.0135); coussin.add(lab);
  // sites en bas (−y local) : bleu = perforable (perfusion), blanc = injection
  const port = (x, c) => { const p = new THREE.Group(); const t = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 0.022, 16), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 })); t.position.y = -0.011; p.add(t);
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.0065, 0.0065, 0.008, 16), new THREE.MeshStandardMaterial({ color: c, roughness: 0.4 })); b.position.y = -0.024; p.add(b); p.position.set(x, -l / 2 - 0.004, 0.006); return p; };
  const bleu = port(-0.022, 0x2f6fd6), blancP = port(0.022, 0xf2f2f2); g.add(bleu, blancP);
  g.rotation.x = -Math.PI / 2;                 // à plat : la poche regarde vers le haut, les sites vers l'avant (+z)
  return { g, coussin, w, l, bleu, blanc: blancP, mat, gonfle: (k) => { coussin.scale.z = 1 + 0.6 * k; } };
}

export async function creerPSM(R) {
  const v = R.vue({ fond: 0xe9eef2, fov: 36, orbite: true });
  const { scene, camera, controls } = v;
  /* éclairage : ciel clair, lumière principale douce, rampe du PSM au-dessus du plan de travail */
  scene.add(new THREE.HemisphereLight(0xffffff, 0x9aa3ab, 0.9));
  const key = new THREE.DirectionalLight(0xfff6ea, 1.25); key.position.set(1.2, 3.4, 2.2); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 6; key.shadow.bias = -0.0005;
  Object.assign(key.shadow.camera, { left: -1.2, right: 1.2, top: 1.2, bottom: -1.2 }); scene.add(key);
  const fill = new THREE.DirectionalLight(0xe6f0ff, 0.55); fill.position.set(-2, 1.6, 2.5); scene.add(fill);
  const sol = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.MeshStandardMaterial({ map: (() => { const t = carrelage('#dfe6ec', '#d6dee5', '#bcc8d2', 8); t.repeat.set(8, 8); return t; })(), roughness: 0.8 }));
  sol.rotation.x = -Math.PI / 2; sol.receiveShadow = true; scene.add(sol);
  const mur = new THREE.Mesh(new THREE.PlaneGeometry(10, 4), new THREE.MeshStandardMaterial({ color: 0xf1f4f6, roughness: 0.9 })); mur.position.set(0, 2, -0.9); scene.add(mur);

  const g = await charger('psm.glb'); const psm = g.scene; scene.add(psm);
  const N = {}; psm.traverse((o) => { if (o.name) N[o.name] = o; if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; for (const m of [].concat(o.material)) if (m.envMapIntensity !== undefined) m.envMapIntensity = 0.8; } });
  for (const n of ['Colliders', 'BSC_Status_Alarm', 'BSC_UV_On', 'BSC_Airflow', 'BSC_Status_OK']) if (N[n]) N[n].visible = false;
  for (const n of Object.keys(N)) if (/^COL_/.test(n)) N[n].visible = false;
  const mixer = new THREE.AnimationMixer(psm); const clips = Object.fromEntries(g.animations.map((a) => [a.name, a]));
  const jouer = (nom) => { const c = clips[nom]; if (!c) return R.attendre(0.2); mixer.stopAllAction(); const a = mixer.clipAction(c); a.setLoop(THREE.LoopOnce); a.clampWhenFinished = true; a.reset().play(); return R.attendre(c.duration); };
  const leverVitre = () => { if (!clips.BSC_Sash_Raise_Loading) return; mixer.stopAllAction(); const a = mixer.clipAction(clips.BSC_Sash_Raise_Loading); a.setLoop(THREE.LoopOnce); a.clampWhenFinished = true; a.reset().play(); mixer.update(10); };
  leverVitre();
  psm.updateMatrixWorld(true);
  const bz = new THREE.Box3().setFromObject(N.BSC_WorkZone || psm);
  const solides = []; psm.traverse((o) => { if (o.isMesh && o.visible && !/^COL_|Airflow|Sash/.test(o.name + (o.parent ? o.parent.name : ''))) solides.push(o); });
  const rc = new THREE.Raycaster(V3((bz.min.x + bz.max.x) / 2, bz.max.y - 0.05, 0), V3(0, -1, 0)); const hit = rc.intersectObjects(solides, true)[0];
  const plan = (hit ? hit.point.y : bz.min.y) + 0.002;
  const cx = (bz.min.x + bz.max.x) / 2, cz = (bz.min.z + bz.max.z) / 2 + 0.05, avant = bz.max.z;
  // rampe lumineuse du PSM (lumière blanche au-dessus du plan de travail)
  const rampe = new THREE.SpotLight(0xffffff, 6, 1.6, Math.PI / 3.2, 0.7, 1.2); rampe.position.set(cx, plan + 0.75, cz - 0.05); rampe.target.position.set(cx, plan, cz); rampe.castShadow = true; rampe.shadow.mapSize.set(1024, 1024); rampe.shadow.bias = -0.0004;
  scene.add(rampe, rampe.target);

  /* vues */
  const VUES = {
    ensemble: [V3(cx + 0.08, plan + 0.42, avant + 0.7), V3(cx, plan + 0.05, cz - 0.02)],
    champ: [V3(cx + 0.02, plan + 0.42, avant + 0.32), V3(cx, plan + 0.02, cz)],
    table: [V3(bz.max.x + 0.35, 1.25, cz + 0.85), V3(bz.max.x + 0.5, 0.9, cz + 0.15)],
    prelevement: [V3(cx + 0.12, plan + 0.27, cz + 0.62), V3(cx + 0.03, plan + 0.19, cz + 0.05)],
    poche: [V3(cx + 0.18, plan + 0.36, cz + 0.42), V3(cx + 0.12, plan + 0.03, cz + 0.02)],
    fiche: [V3(cx, plan + 0.45, avant + 0.35), V3(cx, plan + 0.42, avant - 0.12)],
  };
  // en vue rapprochée, le cadre de la vitre et l'accoudoir masquent le plan de travail : on les rend translucides
  const masques = []; ['BSC_Sash', 'BSC_Armrest', 'BSC_Sash_Height_Mark'].forEach((n) => N[n] && N[n].traverse((o) => { if (o.isMesh) { o.material = (Array.isArray(o.material) ? o.material : [o.material]).map((m) => { const c = m.clone(); c.userData.op = m.transparent ? m.opacity : 1; return c; }); if (o.material.length === 1) o.material = o.material[0]; masques.push(o); } }));
  const translucide = (on) => masques.forEach((o) => (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { m.transparent = on || m.userData.op < 1; m.opacity = on ? Math.min(0.12, m.userData.op) : m.userData.op; m.depthWrite = !on; m.needsUpdate = true; }));
  const PROCHES = ['champ', 'prelevement', 'poche'];
  const regarder = (k, d = 1.1) => { translucide(PROCHES.includes(k)); const [p, t] = VUES[k]; const p0 = camera.position.clone(), t0 = controls.target.clone(); return R.tween(d, (e) => { camera.position.lerpVectors(p0, p, e); controls.target.lerpVectors(t0, t, e); }); };
  camera.position.copy(VUES.ensemble[0]); controls.target.copy(VUES.ensemble[1]); controls.update();
  controls.minDistance = 0.12; controls.maxDistance = 3.2; controls.maxPolarAngle = Math.PI * 0.49;

  /* ---------- décor fixe ---------- */
  const champ = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.4), new THREE.MeshStandardMaterial({ color: 0x9fd0ee, roughness: 0.95, transparent: true, opacity: 0 }));
  champ.rotation.x = -Math.PI / 2; champ.position.set(cx, plan + 0.003, cz); champ.visible = false; champ.receiveShadow = true; scene.add(champ);
  const table = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.04, 0.45), new THREE.MeshStandardMaterial({ color: 0xc7ced3, metalness: 0.5, roughness: 0.35 }));
  table.position.set(bz.max.x + 0.55, 0.88, cz + 0.15); table.castShadow = true; table.receiveShadow = true; scene.add(table);
  for (const [x, z] of [[-0.3, -0.18], [0.3, -0.18], [-0.3, 0.18], [0.3, 0.18]]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.86), table.material); p.position.set(table.position.x + x, 0.43, table.position.z + z); scene.add(p); }
  VUES.table = [V3(table.position.x - 0.05, 1.5, table.position.z + 0.78), V3(table.position.x, 0.9, table.position.z - 0.02)];
  const surTable = (dx, dz, dy = 0) => V3(table.position.x + dx, table.position.y + 0.02 + dy, table.position.z + dz);
  const dans = (dx, dz, dy = 0.004) => V3(cx + dx, plan + dy, cz + dz);
  const gris = new THREE.MeshStandardMaterial({ color: 0xd9dee2, roughness: 0.5 });
  const bacTransport = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.03, 0.14), gris); bacTransport.position.copy(surTable(-0.18, 0.02, 0.015)); scene.add(bacTransport);
  const bacAlcool = new THREE.Group(); { const c = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, 0.12), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 0.8, transparent: true, opacity: 0.35, roughness: 0.1, side: THREE.DoubleSide, depthWrite: false })); c.position.y = 0.03; bacAlcool.add(c);
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.152, 0.04, 0.112), new THREE.MeshPhysicalMaterial({ color: 0xd8ecff, transparent: true, opacity: 0.45, roughness: 0.05, depthWrite: false })); l.position.y = 0.021; bacAlcool.add(l);
    const e = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.03), new THREE.MeshBasicMaterial({ map: texte([['ALCOOL 70 %', 70, true, '#0b4f8a']], 512, 140, { y0: 95 }) })); e.position.set(0, 0.03, 0.0605); bacAlcool.add(e); }
  bacAlcool.position.copy(surTable(0.12, 0.05)); scene.add(bacAlcool);
  const plateau = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.012, 0.14), gris); plateau.position.copy(dans(0.12, 0.17, 0.006)); plateau.visible = false; scene.add(plateau);
  const poubelle = new THREE.Group(); const jaune = new THREE.MeshStandardMaterial({ color: 0xf2c200, roughness: 0.5 });
  { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.052, 0.15, 24), jaune); c.position.y = 0.075; poubelle.add(c); const cv = new THREE.Mesh(new THREE.CylinderGeometry(0.064, 0.064, 0.016, 24), new THREE.MeshStandardMaterial({ color: 0x8a1c1c, roughness: 0.5 })); cv.position.y = 0.158; poubelle.add(cv);
    const e = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.04), new THREE.MeshBasicMaterial({ map: texte([['DASRI', 64, true], ['cytotoxiques', 40]], 512, 290, { fond: '#f2c200', y0: 110, pas: 90 }) })); e.position.set(0, 0.09, 0.0565); poubelle.add(e); }
  poubelle.position.set(bz.min.x + 0.09, plan, cz - 0.1); scene.add(poubelle);
  const bouchePoub = () => poubelle.position.clone().add(V3(0, 0.2, 0));
  // compresses
  const compresse = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.004, 0.05), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 })); compresse.position.copy(dans(0.22, -0.12)); compresse.visible = false; scene.add(compresse);
  // fiche de fabrication aimantée en haut de la vitre
  const fiche = new THREE.Mesh(new THREE.PlaneGeometry(0.21, 0.297 * 0.62), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false })); fiche.position.set(cx, plan + 0.42, avant - 0.1); fiche.rotation.x = -0.12; fiche.visible = false; scene.add(fiche);
  // flux d'air laminaire : traits qui descendent
  const flux = new THREE.Group(); const fm = new THREE.MeshBasicMaterial({ color: 0x7cc4ff, transparent: true, opacity: 0.0, depthWrite: false });
  for (let i = 0; i < 42; i++) { const t = new THREE.Mesh(new THREE.BoxGeometry(0.0012, 0.06, 0.0012), fm); t.userData.x = cx - 0.32 + (i % 7) * 0.105 + (i * 0.013) % 0.03; t.userData.z = cz - 0.16 + Math.floor(i / 7) * 0.065; t.userData.p = (i * 0.37) % 1; flux.add(t); }
  scene.add(flux); let fluxOn = 0;

  /* ---------- matériel de la préparation (reconstruit pour chaque cas) ---------- */
  let M = null;
  function vider() { if (!M) return; for (const o of M.objets) scene.remove(o); M = null; }
  function emballage(o, txt, couleur = 0xf4f6f7) {
    const b = new THREE.Box3(); o.updateMatrixWorld(true); o.traverse((m) => { if (m.isMesh && m.visible) b.expandByObject(m); }); const s = b.getSize(V3(0, 0, 0)), c = b.getCenter(V3(0, 0, 0));
    const p = new THREE.Group(); const dessus = new THREE.Mesh(new THREE.BoxGeometry(s.x + 0.02, 0.003, s.z + 0.03), new THREE.MeshStandardMaterial({ color: couleur, roughness: 0.75, transparent: true, opacity: 0.92, map: txt ? texte([[txt, 34, true, '#1d4e89']], 512, 160, { y0: 95, fond: '#f4f6f7' }) : null }));
    dessus.position.y = s.y + 0.004; const dessous = new THREE.Mesh(new THREE.BoxGeometry(s.x + 0.02, 0.002, s.z + 0.03), new THREE.MeshStandardMaterial({ color: 0xe6edf2, roughness: 0.8 }));
    p.add(dessus, dessous); p.position.set(c.x, b.min.y, c.z); p.userData.dessus = dessus; return p;
  }
  function preparer(cfg) {
    vider(); const objets = [];
    const add = (o) => { scene.add(o); objets.push(o); return o; };
    const F = creerFlacon(cfg.flaconVol, cfg.nom, cfg.capsule || 0x2f6fd6, cfg.couleur); add(F.g); F.g.position.copy(surTable(-0.18, 0.02, 0.03));
    const P = creerPoche(cfg.poche, cfg.solvant); add(P.g); P.g.position.copy(surTable(0.02, -0.12, 0.02)); P.g.rotation.z = 0;
    // tubulure : perforateur + chambre compte-gouttes + tube + site d'injection (bouchon bleu)
    const T = new THREE.Group(); const blancM = new THREE.MeshStandardMaterial({ color: 0xf5f5f2, roughness: 0.4 });
    const perfo = new THREE.Group(); const pic = new THREE.Mesh(new THREE.ConeGeometry(0.0035, 0.02, 12), blancM); pic.rotation.x = Math.PI; pic.position.y = -0.01; perfo.add(pic);
    const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.04, 20), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 0.9, transparent: true, opacity: 0.4, roughness: 0.05, depthWrite: false })); ch.position.y = 0.022; perfo.add(ch);
    T.add(perfo); T.userData.perfo = perfo;
    const tubeMat = new THREE.MeshPhysicalMaterial({ color: 0xf4f8fb, transparent: true, opacity: 0.55, roughness: 0.15, depthWrite: false });
    const site = new THREE.Group(); const sc = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.012, 0.018), blancM); site.add(sc);
    const valve = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0055, 0.016, 16), new THREE.MeshPhysicalMaterial({ color: 0xc9b8f2, transparent: true, opacity: 0.8, roughness: 0.2 })); valve.position.set(0.004, 0.014, 0); site.add(valve);
    const bouchonBleu = new THREE.Mesh(new THREE.CylinderGeometry(0.0075, 0.0075, 0.012, 18), new THREE.MeshStandardMaterial({ color: 0x2f6fd6, roughness: 0.4 })); bouchonBleu.position.set(0.004, 0.026, 0); site.add(bouchonBleu); site.userData.bouchon = bouchonBleu; site.userData.valve = valve;
    T.add(site); T.userData.site = site; T.userData.tubeMat = tubeMat; T.visible = true; add(T); T.position.copy(surTable(0.22, -0.1, 0.02));
    const A = new THREE.Group(); { const sp = new THREE.Mesh(new THREE.ConeGeometry(0.0022, 0.016, 10), new THREE.MeshStandardMaterial({ color: 0xd9dde0, metalness: 0.8, roughness: 0.3 })); sp.rotation.x = Math.PI; sp.position.y = -0.008; A.add(sp);
      const co = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.007, 0.014, 20), blancM); co.position.y = 0.006; A.add(co);
      const fil = new THREE.Mesh(new THREE.CylinderGeometry(0.0075, 0.0075, 0.004, 20), new THREE.MeshStandardMaterial({ color: 0x7fb7e8, roughness: 0.6 })); fil.rotation.z = Math.PI / 2; fil.position.set(0.011, 0.006, 0); A.add(fil);
      const lu = new THREE.Mesh(new THREE.CylinderGeometry(0.0042, 0.0042, 0.01, 16), new THREE.MeshStandardMaterial({ color: 0x2f6fd6, roughness: 0.4 })); lu.position.y = 0.018; A.add(lu); }
    add(A); A.position.copy(surTable(0.24, 0.1, 0.01));
    const Ssr = creerSeringue(cfg.ser, cfg.couleur); add(Ssr.g); Ssr.g.rotation.set(Math.PI / 2, 0, Math.PI / 2); Ssr.g.position.copy(surTable(0.05, 0.12, 0.016));
    // emballages (sachets pelables)
    const emb = { poche: add(emballage(P.g, 'POCHE ' + cfg.poche + ' ml')), tubulure: add(emballage(T, 'TUBULURE')), seringue: add(emballage(Ssr.g, 'SERINGUE ' + cfg.ser + ' ml')), aiguille: add(emballage(A, 'AIGUILLE SÉCURISÉE')) };
    const gants = add((() => { const p = new THREE.Group(); const m = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.006, 0.16), new THREE.MeshStandardMaterial({ map: texte([['GANTS', 46, true, '#1d4e89'], ['STÉRILES', 46, true, '#1d4e89'], ['taille 7', 30]], 384, 300, { fond: '#f6f4ee', y0: 90, pas: 70 }), roughness: 0.8 })); p.add(m); p.userData.dessus = m; return p; })());
    gants.position.copy(surTable(-0.05, -0.12, 0.004)); emb.gants = gants;
    for (const o of [P.g, T, A, Ssr.g]) o.visible = false;      // dans leur sachet
    const sachet = add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xc46a1a, roughness: 0.7, transparent: true, opacity: 0 }))); sachet.visible = false;
    const etq = add(new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.05), new THREE.MeshStandardMaterial({ roughness: 0.6 }))); etq.visible = false; etq.rotation.x = -Math.PI / 2;
    M = { cfg, F, P, T, A, S: Ssr, emb, sachet, etq, objets, assemble: null };
    fiche.visible = false; plateau.visible = false; champ.visible = false; champ.material.opacity = 0;
    if (N.BSC_Status_OK) N.BSC_Status_OK.visible = false; leverVitre();
    return M;
  }

  /* ---------- animations ---------- */
  const aller = (o, p, d = 0.9, haut = 0.06) => { const a = o.position.clone(); return R.tween(d, (e) => { o.position.lerpVectors(a, p, e); o.position.y += Math.sin(e * Math.PI) * haut; }); };
  const tourner = (o, eul, d = 0.6) => { const q0 = o.quaternion.clone(), q1 = new THREE.Quaternion().setFromEuler(eul); return R.tween(d, (e) => { o.quaternion.slerpQuaternions(q0, q1, e); }); };
  const essuyer = async (p) => { compresse.visible = true; compresse.position.copy(p).add(V3(-0.03, 0.04, 0)); for (let i = 0; i < 3; i++) { await aller(compresse, p.clone().add(V3(0.015 * (i % 2 ? 1 : -1), 0.012, 0)), 0.3, 0.004); } compresse.visible = false; };
  const avantGrille = (dx = 0) => V3(cx + dx, plan + 0.06, avant - 0.06);
  let ticker = null;
  v.tick = (dt, t) => {
    mixer.update(dt);
    fm.opacity += ((fluxOn ? 0.45 : 0) - fm.opacity) * Math.min(1, dt * 3); flux.visible = fm.opacity > 0.01;
    if (flux.visible) for (const s of flux.children) { s.userData.p = (s.userData.p + dt * 0.7) % 1; s.position.set(s.userData.x, plan + 0.5 - s.userData.p * 0.48, s.userData.z); }
    if (M && M.S) M.S.maj();
    if (ticker) ticker(dt, t);
  };

  const ACT = {
    async psm() { await regarder('ensemble', 0.6); await jouer('BSC_Sash_Lower_Working'); fluxOn = 1; await R.attendre(1.2); if (N.BSC_Status_OK) N.BSC_Status_OK.visible = true; await R.attendre(0.6); fluxOn = 0; },
    async desinfecter() { await regarder('champ', 0.6); compresse.visible = true; compresse.position.copy(dans(-0.25, -0.12, 0.006)); for (let i = 0; i < 4; i++) await aller(compresse, dans(0.25 * (i % 2 ? -1 : 1), -0.12 + i * 0.08, 0.006), 0.4, 0.004); compresse.visible = false; },
    async champ() { champ.visible = true; await R.tween(0.6, (e) => { champ.material.opacity = e; }); },
    // peler un sachet à la veine de garde : le contenu entre, l'emballage part à la poubelle
    async peler(k) {
      const p = M.emb[k]; const dx = { gants: -0.05, poche: 0.05, tubulure: 0.15, seringue: -0.12, aiguille: 0.2 }[k] || 0;
      await aller(p, avantGrille(dx), 0.7, 0.08);
      const d = p.userData.dessus; await R.tween(0.45, (e) => { d.rotation.x = -1.2 * e; d.position.z = -0.02 * e; d.position.y += 0.0004; });
      const cible = { poche: [M.P.g, dans(0.06, -0.06, 0.012)], tubulure: [M.T, dans(0.2, -0.02, 0.006)], seringue: [M.S.g, dans(-0.05, 0.1, 0.016)], aiguille: [M.A, dans(-0.24, 0.12, 0.012)] }[k];
      if (cible) { const [o, pos] = cible; o.position.copy(avantGrille(dx)).add(V3(0, 0.02, 0)); o.visible = true; await aller(o, pos, 0.6, 0.04); }
      await aller(p, bouchePoub(), 0.7, 0.12); p.visible = false;
    },
    async orienter(versFond) { const s = M.S.g; await tourner(s, new THREE.Euler(Math.PI / 2, 0, versFond ? Math.PI : 0), 0.6); s.position.copy(dans(-0.05, 0.1, M.S.r + 0.002)); },
    async flacon() {
      await regarder('table', 0.8); const f = M.F.g; await aller(f, bacAlcool.position.clone().add(V3(0, 0.1, 0)), 0.7, 0.05);
      await R.tween(0.9, (e) => { f.position.y = bacAlcool.position.y + 0.1 - Math.sin(e * Math.PI) * 0.085; });
      await aller(f, surTable(-0.18, 0.02, 0.03), 0.6, 0.05); await R.attendre(0.2);
      await aller(bacTransport, avantGrille(-0.15).add(V3(0, -0.04, 0.05)), 0.9, 0.1); f.position.copy(bacTransport.position).add(V3(0, 0.015, 0)); await regarder('champ', 0.6);
    },
    async poser_flacon() { await aller(M.F.g, dans(-0.17, 0.03, 0.003), 0.7, 0.05); await aller(bacTransport, surTable(-0.18, 0.02, 0.015), 0.6, 0.06); },
    async fiche(tex) { fiche.material.map = tex; fiche.material.needsUpdate = true; fiche.visible = true; const p = fiche.position.clone(); fiche.position.y -= 0.2; await R.tween(0.8, (e) => { fiche.position.y = p.y - 0.2 * (1 - e); }); await regarder('fiche', 0.8); await R.attendre(1.2); await regarder('champ', 0.8); },
    async tubulure() { const T = M.T, P = M.P; const bp = new THREE.Vector3(); P.bleu.getWorldPosition(bp); const pf = T.userData.perfo;
      T.userData.perfo.position.set(0, 0, 0); const dest = bp.clone().add(V3(0, 0.004, 0.03)); const w = new THREE.Vector3(); pf.getWorldPosition(w);
      pf.rotation.set(-Math.PI / 2, 0, 0); const local = (wv) => T.worldToLocal(wv.clone());
      const a = local(dest.clone().add(V3(0, 0, 0.03))), b = local(dest);
      await R.tween(0.6, (e) => pf.position.lerpVectors(local(w), a, e)); await R.tween(0.5, (e) => pf.position.lerpVectors(a, b, e));
      // tube : du perforateur au site d'injection (posé devant à droite)
      const site = T.userData.site; site.position.copy(local(dans(0.16, 0.1, 0.008)));
      const p0 = pf.position.clone().add(V3(0, 0, 0.04)), p1 = site.position.clone();
      const crb = new THREE.CatmullRomCurve3([p0, p0.clone().add(V3(0.03, 0, 0.04)), p1.clone().add(V3(0.06, 0, -0.05)), p1.clone().add(V3(0.02, 0, 0)), p1]);
      if (T.userData.tube) T.remove(T.userData.tube); const tube = new THREE.Mesh(new THREE.TubeGeometry(crb, 80, 0.002, 8), T.userData.tubeMat); T.add(tube); T.userData.tube = tube;
    },
    async purger() { const m = M.T.userData.tubeMat; await R.tween(1.2, (e) => { m.color.lerpColors(new THREE.Color(0xf4f8fb), new THREE.Color(0xa9d4f5), e); m.opacity = 0.55 + 0.25 * e; }); },
    async compresse() { const p = new THREE.Vector3(); M.F.flipOff.getWorldPosition(p); M.F.flipOff.visible = false; await essuyer(p); },
    async aiguille() { const f = M.F.g; const haut = f.position.clone().add(V3(0, M.F.H + M.F.R * 0.85 + M.F.R * 0.35, 0)); await aller(M.A, haut.clone().add(V3(0, 0.05, 0)), 0.7, 0.04); await aller(M.A, haut.clone().add(V3(0, 0.008, 0)), 0.5, 0); },
    async visser(n) { const s = M.S.g; if (n === 0) { await tourner(s, new THREE.Euler(0, 0, 0), 0.5); const tip = M.A.position.clone().add(V3(0, 0.024 + M.S.r * 0.6 + 0.012, 0)); s.position.copy(tip).add(V3(0, 0.05, 0)); await aller(s, tip, 0.5, 0); }
      const q0 = s.quaternion.clone(); await R.tween(0.35, (e) => { s.quaternion.copy(q0).multiply(new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), e * Math.PI * 0.6)); }); },
    // flacon en haut, seringue en dessous, embout vers le haut ; l'ensemble tenu au-dessus du champ
    async retourner() {
      const G = new THREE.Group(); scene.add(G); M.objets.push(G); G.position.copy(M.A.position);
      for (const o of [M.F.g, M.A, M.S.g]) G.attach(o);
      const dst = dans(-0.02, 0.06, 0.11 + M.S.L); await regarder('prelevement', 0.8);
      const q0 = G.quaternion.clone(), q1 = new THREE.Quaternion().setFromAxisAngle(V3(0, 0, 1), Math.PI); const p0 = G.position.clone();
      await R.tween(1.2, (e) => { G.quaternion.slerpQuaternions(q0, q1, e); G.position.lerpVectors(p0, dst, e); });
      M.F.retourne = true; M.F.maj(); M.assemble = G;
    },
    async deconnecter() { const G = M.assemble; const s = M.S.g; scene.attach(s); for (const o of [M.F.g, M.A]) scene.attach(o);
      const p = new THREE.Vector3(); M.A.getWorldPosition(p); await essuyer(p.clone().add(V3(0, -0.03, 0)));
      await R.tween(0.8, (e) => { s.position.y -= 0.0006; });
      // flacon et aiguille reposés sur le champ, flacon à l'endroit
      const f = M.F.g; f.rotation.set(0, 0, 0); f.position.copy(dans(-0.17, 0.03, 0.003)); M.F.retourne = false; M.F.maj(); M.A.rotation.set(0, 0, 0); M.A.position.copy(f.position).add(V3(0, M.F.H + M.F.R * 1.2 + 0.008, 0));
      await tourner(s, new THREE.Euler(0, 0, Math.PI), 0.3); await aller(s, dans(-0.02, 0.08, 0.13 + M.S.L), 0.5, 0);
    },
    async montrer() { const s = M.S.g; await aller(s, dans(0.0, 0.16, 0.16 + M.S.L), 0.6, 0.02); await tourner(s, new THREE.Euler(0, 0.25, Math.PI, 'YXZ'), 0.4); await regarder('prelevement', 0.6); },
    async site() { const s = M.S.g; const site = M.T.userData.site; const bc = site.userData.bouchon; bc.visible = false; const p = new THREE.Vector3(); site.userData.valve.getWorldPosition(p);
      await regarder('poche', 0.8); await tourner(s, new THREE.Euler(0, 0, 0), 0.4); await aller(s, p.clone().add(V3(0, 0.04, 0)), 0.7, 0.04); await aller(s, p.clone().add(V3(0, 0.016, 0)), 0.4, 0); },
    async bouchon() { const site = M.T.userData.site; const p = new THREE.Vector3(); site.userData.valve.getWorldPosition(p);
      const s = M.S.g; await aller(s, dans(-0.24, -0.02, 0.016), 0.6, 0.06); s.rotation.set(Math.PI / 2, 0, Math.PI); await essuyer(p);
      const bc = site.userData.bouchon; bc.visible = true; const y0 = bc.position.y; await R.tween(0.6, (e) => { bc.position.y = y0 + 0.02 * (1 - e); bc.rotation.y = e * Math.PI * 2; });
      await R.tween(0.4, (e) => { site.rotation.y = -e * Math.PI / 2; }); },
    async plateau() { await regarder('champ', 0.6); plateau.visible = true; const P = M.P.g; await aller(P, plateau.position.clone().add(V3(0, 0.012, 0)), 0.9, 0.08); M.T.visible = true; await aller(M.T, plateau.position.clone().add(V3(0.08, 0.004, -0.02)), 0.6, 0.04); },
    async etiqueter(lignes) { const e = M.etq; e.material.map = etiquetteTexture(lignes); e.material.needsUpdate = true; const p = new THREE.Vector3(); M.P.coussin.getWorldPosition(p);
      e.position.copy(p).add(V3(-0.015, 0.02, -0.03)); e.visible = true; await R.tween(0.5, (x) => e.scale.setScalar(0.4 + 0.6 * x)); },
    async sachet(opaque) { const s = M.sachet; const b = new THREE.Box3().setFromObject(M.P.g); b.expandByObject(M.etq); const sz = b.getSize(V3(0, 0, 0)), c = b.getCenter(V3(0, 0, 0));
      s.scale.set(sz.x + 0.035, sz.y + 0.02, sz.z + 0.04); s.position.copy(c); s.material.color.setHex(opaque ? 0xc46a1a : 0xe8f1f6); s.material.opacity = 0; s.visible = true;
      await R.tween(0.7, (e) => { s.material.opacity = (opaque ? 0.96 : 0.5) * e; }); },
    async dechets() { for (const o of [M.S.g, M.A, M.F.g]) { await aller(o, bouchePoub(), 0.6, 0.1); o.visible = false; } },
    async liberer() { const mats = []; M.sachet.visible && mats.push(M.sachet.material); await R.tween(1.2, (e, k) => { mats.forEach((m) => m.emissive && m.emissive.setHex(0x37c871).multiplyScalar(Math.sin(k * Math.PI) * 0.4)); }); },
  };

  /* ---------- manipulations à la souris ---------- */
  const el = R.renderer.domElement; const ray = new THREE.Raycaster(); const ptr = new THREE.Vector2();
  const versEcran = (p) => { const q = p.clone().project(camera); return new THREE.Vector2((q.x + 1) / 2 * el.clientWidth, (1 - q.y) / 2 * el.clientHeight); };
  /* glisser le long d'un axe du monde : cb(déplacement en mètres le long de l'axe) */
  function glisser(axeMonde, origine, cb) {
    let actif = false, last = null;
    const down = (e) => { actif = true; last = [e.clientX, e.clientY]; controls.enabled = false; el.setPointerCapture(e.pointerId); };
    const move = (e) => { if (!actif) return; const a = versEcran(origine()), b = versEcran(origine().add(axeMonde().multiplyScalar(0.05))); const ax = b.sub(a); const px = ax.length() || 1;
      const d = (e.clientX - last[0]) * ax.x / px + (e.clientY - last[1]) * ax.y / px; last = [e.clientX, e.clientY]; cb(d / px * 0.05, e); };
    const up = () => { actif = false; controls.enabled = true; };
    el.addEventListener('pointerdown', down); el.addEventListener('pointermove', move); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    return () => { el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); controls.enabled = true; };
  }
  /* cliquer un objet parmi une liste */
  function cliquer(objets, cb) {
    const down = (e) => { const r = el.getBoundingClientRect(); ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ptr, camera);
      const vis = objets.filter((o) => o.visible); const h = ray.intersectObjects(vis, true)[0]; if (!h) return; let o = h.object; while (o && !vis.includes(o)) o = o.parent; if (o) cb(o); };
    el.addEventListener('pointerdown', down); return () => el.removeEventListener('pointerdown', down);
  }
  /* axe de la seringue (embout → piston), dans le monde */
  const axeSeringue = () => V3(0, 1, 0).applyQuaternion(M.S.g.getWorldQuaternion(new THREE.Quaternion())).normalize();
  const centreSeringue = () => { const p = new THREE.Vector3(); M.S.g.getWorldPosition(p); return p.add(axeSeringue().multiplyScalar(M.S.L / 2)); };
  const mlParMetre = () => M.S.G / M.S.L;

  /* changer de seringue (choix de l'étudiant) avant de peler */
  function remplacerSeringue(cap) {
    if (!M || M.S.cap === cap) return; const old = M.S.g, oldEmb = M.emb.seringue; const pos = old.position.clone(), rot = old.rotation.clone();
    scene.remove(old); scene.remove(oldEmb); const S = creerSeringue(cap, M.cfg.couleur); scene.add(S.g); M.objets.push(S.g); S.g.rotation.copy(rot); S.g.position.copy(pos); S.g.visible = false;
    M.S = S; const e = emballage((() => { S.g.visible = true; return S.g; })(), 'SERINGUE ' + cap + ' ml'); S.g.visible = false; scene.add(e); M.objets.push(e); M.emb.seringue = e;
  }
  return {
    vue: v, ACT, regarder, preparer, remplacerSeringue, V3, glisser, cliquer, axeSeringue, centreSeringue, mlParMetre,
    get M() { return M; },
    flux: (on) => { fluxOn = on ? 1 : 0; },
    ticker: (f) => { ticker = f; },
    leverVitre,
    reset() { translucide(false); vider(); fiche.visible = false; plateau.visible = false; champ.visible = false; champ.material.opacity = 0; fluxOn = 0; ticker = null; if (N.BSC_Status_OK) N.BSC_Status_OK.visible = false; leverVitre(); camera.position.copy(VUES.ensemble[0]); controls.target.copy(VUES.ensemble[1]); },
  };
}
