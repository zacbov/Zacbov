/* Réserve : une pièce en 3D où tout le matériel est rangé sur des étagères, par famille.
   L'étudiant survole (nom affiché) puis clique sur l'objet qu'il veut utiliser ; onPick(id) est appelé. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RESERVE, PROC } from './objets.js';

export function createReserve(host, opts = {}) {
  const base = opts.base || 'equip/', loader = new GLTFLoader().setDRACOLoader(new DRACOLoader().setDecoderPath(opts.draco || 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/draco/'));
  const wrap = document.createElement('div'); wrap.className = 'rsv';
  wrap.innerHTML = `<style>
    .rsv{position:absolute;inset:0;z-index:30;display:none;background:#e9e4da;font:14px/1.35 system-ui,sans-serif}
    .rsv canvas{position:absolute;inset:0;width:100%;height:100%;display:block;cursor:pointer}
    .rsv .hd{position:absolute;left:12px;right:12px;top:10px;display:flex;justify-content:space-between;align-items:center;gap:8px;pointer-events:none}
    .rsv .hd b{background:#16201bdd;color:#fff;border-radius:10px;padding:6px 12px;font:600 15px/1.2 Georgia,serif}
    .rsv .hd button{pointer-events:auto;background:#16201bdd;color:#fff;border:1px solid #fff5;border-radius:8px;padding:6px 10px;cursor:pointer}
    .rsv .tip{position:absolute;pointer-events:none;transform:translate(-50%,-140%);background:#16201b;color:#fff;border-radius:8px;padding:4px 9px;white-space:nowrap;display:none}
    .rsv .tip small{display:block;color:#9fd8bd;font:11px ui-monospace,monospace}
    .rsv .ask{position:absolute;left:50%;bottom:16px;transform:translateX(-50%);background:#16201bf0;color:#fff;border-radius:12px;padding:12px 14px;display:none;max-width:min(520px,92%);text-align:center}
    .rsv .ask p{margin:0 0 .6rem}.rsv .ask button{margin:0 .3rem;border-radius:8px;padding:6px 12px;border:1px solid #fff6;background:transparent;color:#fff;cursor:pointer}.rsv .ask button.ok{background:#37c48f;border-color:#37c48f;color:#04150e;font-weight:700}
  </style><canvas></canvas><div class="hd"><b>Réserve : choisissez le matériel</b><button type="button" class="x">Fermer</button></div><div class="tip"></div><div class="ask"><p></p><button type="button" class="ok"></button><button type="button" class="no"></button></div>`;
  host.append(wrap);
  const canvas = wrap.querySelector('canvas'), tip = wrap.querySelector('.tip'), ask = wrap.querySelector('.ask');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true }); renderer.setPixelRatio(Math.min(2, devicePixelRatio)); renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0xe9e4da);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 20);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8170, 1.6)); const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(1.5, 3, 4); scene.add(key);
  // --- meuble : fond, montants, 4 étagères
  const COLS = 7, ROWS = 4, CW = 0.3, RH = 0.32, W = COLS * CW, H = ROWS * RH, wood = new THREE.MeshStandardMaterial({ color: 0xb08a5c, roughness: 0.7 });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(W + 0.2, H + 0.25), new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.9 })); back.position.set(0, H / 2, -0.17); scene.add(back);
  for (let r = 0; r <= ROWS; r++) { const sh = new THREE.Mesh(new THREE.BoxGeometry(W + 0.06, 0.025, 0.34), wood); sh.position.set(0, r * RH, 0); scene.add(sh); }
  for (const x of [-W / 2 - 0.03, W / 2 + 0.03]) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.03, H + 0.025, 0.34), wood); s.position.set(x, H / 2, 0); scene.add(s); }
  const label = (txt, w = 0.5) => { const c = document.createElement('canvas'); c.width = Math.round(512 * w / 0.5); c.height = 64; const g = c.getContext('2d'); g.fillStyle = '#16201b'; g.fillRect(0, 0, c.width, 64); g.fillStyle = '#f4f1ea'; g.font = '600 30px Georgia,serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, c.width / 2, 33);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return new THREE.Mesh(new THREE.PlaneGeometry(w, 0.0625), new THREE.MeshBasicMaterial({ map: t })); };
  // --- rangement : une famille par rangée quand c'est possible
  const ROWFAM = [['Vaccination', 'TROD', 'Plaies', 'Réanimation'], ['Constantes'], ['Inhalation', 'Hôpital', 'Dispositifs', 'Contention'], ['Orthèses']], slots = [], picks = [];
  const placedFam = new Set();
  ROWFAM.forEach((fams, k) => {                                 // une rangée par groupe de familles, de haut en bas
    const row = ROWS - 1 - k; let col = 0;
    for (const f of fams) {
      const its = RESERVE.filter((r) => r.famille === f); if (!its.length) continue; placedFam.add(f);
      const lb = label(f, Math.max(0.27, Math.min(0.62, its.length * CW - 0.05))); lb.position.set(-W / 2 + (col + its.length / 2) * CW, row * RH - 0.034, 0.172); scene.add(lb);
      for (const it of its) { slots.push({ it, x: -W / 2 + (col + 0.5) * CW, y: row * RH + 0.0125 }); col++; }
    }
  });
  RESERVE.filter((r) => !placedFam.has(r.famille)).forEach((it, i) => slots.push({ it, x: -W / 2 + (i + 0.5) * CW, y: -RH + 0.0125 }));   // famille inconnue : sous le meuble
  const fit = (o, s) => { const b = new THREE.Box3().setFromObject(o), sz = b.getSize(new THREE.Vector3()), k = s / Math.max(sz.x, sz.y, sz.z, 1e-4), c = b.getCenter(new THREE.Vector3());
    const g = new THREE.Group(); o.position.sub(c); g.add(o); g.scale.setScalar(k); return { g, h: sz.y * k }; };
  async function build() {
    await Promise.all(slots.map(async (sl) => {
      let o = null;
      if (sl.it.fichier) try { o = (await loader.loadAsync(base + sl.it.fichier)).scene; } catch (e) { o = null; }
      if (!o && sl.it.proc && PROC[sl.it.proc]) o = PROC[sl.it.proc](THREE);
      if (!o) o = PROC.boite(0x9aa3ab);
      if (sl.it.id === 'pansement') o.traverse((m) => { if (m.isMesh && m.material && m.material.name === 'Gauze') { m.material = m.material.clone(); m.material.map = null; m.material.color.set(0xf4f4ef); } });
      const big = /tension|balance|reanimation|perfusion|releveur|collier|bas_contention|corset/.test(sl.it.id) ? 0.25 : /oxymetre|pouce/.test(sl.it.id) ? 0.13 : /vaccin|tique|injection_iv|trod_naso/.test(sl.it.id) ? 0.2 : 0.19;   // taille d'affichage sur l'étagère
      const { g, h } = fit(o, big); g.position.set(sl.x, sl.y + h / 2 + 0.005, 0.02); g.rotation.y = -0.35; g.userData.id = sl.it.id; g.userData.it = sl.it; scene.add(g); picks.push(g);
    }));
  }
  const ready = build();
  // --- interaction
  const ray = new THREE.Raycaster(), mouse = new THREE.Vector2(); let hover = null, onPick = null, par = [0, 0];
  function hit(e) { const r = canvas.getBoundingClientRect(); mouse.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); par = [mouse.x, mouse.y]; ray.setFromCamera(mouse, camera);
    const h = ray.intersectObjects(picks, true)[0]; let o = h && h.object; while (o && !o.userData.id) o = o.parent; return { o, x: e.clientX - r.left, y: e.clientY - r.top }; }
  canvas.addEventListener('pointermove', (e) => { const { o, x, y } = hit(e); hover = o || null;
    if (o) { tip.style.display = 'block'; tip.style.left = x + 'px'; tip.style.top = y + 'px'; tip.innerHTML = `${o.userData.it.nom}<small>${o.userData.it.famille}</small>`; } else tip.style.display = 'none'; });
  canvas.addEventListener('pointerleave', () => { hover = null; tip.style.display = 'none'; });
  canvas.addEventListener('click', (e) => { const { o } = hit(e); if (o && onPick && ask.style.display !== 'block') onPick(o.userData.id, o.userData.it); });
  wrap.querySelector('.x').onclick = () => close();
  const fitView = () => { const w = wrap.clientWidth || 600, h = wrap.clientHeight || 400; renderer.setSize(w, h, false); camera.aspect = w / h;
    const d = Math.max((H + 0.3) / 2 / Math.tan(camera.fov * Math.PI / 360), (W + 0.3) / 2 / Math.tan(camera.fov * Math.PI / 360) / camera.aspect); camera.position.set(0, H / 2, d + 0.2); camera.updateProjectionMatrix(); };
  const ro = new ResizeObserver(fitView); ro.observe(wrap);
  let on = false;
  renderer.setAnimationLoop((t) => {
    if (!on) return;
    for (const p of picks) { const k = p === hover ? 1.12 : 1; p.userData.k = (p.userData.k || 1) + (k - (p.userData.k || 1)) * 0.2; p.children[0] && (p.scale.setScalar(p.userData.k * (p.userData.s0 || (p.userData.s0 = p.scale.x)))); p.rotation.y = -0.35 + (p === hover ? Math.sin(t / 400) * 0.3 : 0); }
    camera.position.x += (par[0] * 0.08 - camera.position.x) * 0.05; camera.lookAt(0, H / 2, 0); renderer.render(scene, camera);
  });
  function open(cb) { onPick = cb; on = true; wrap.style.display = 'block'; ask.style.display = 'none'; fitView(); return ready; }
  function close() { on = false; wrap.style.display = 'none'; tip.style.display = 'none'; }
  /* question du patient (« vous êtes sûr ? ») avec deux boutons ; renvoie true si l'étudiant confirme */
  function confirm(txt, yes = "Oui, j'en ai besoin", no = 'Non, je le repose') {
    return new Promise((res) => { ask.querySelector('p').textContent = txt; const ok = ask.querySelector('.ok'), nb = ask.querySelector('.no'); ok.textContent = yes; nb.textContent = no; ask.style.display = 'block';
      ok.onclick = () => { ask.style.display = 'none'; res(true); }; nb.onclick = () => { ask.style.display = 'none'; res(false); }; });
  }
  function where(id) { const g = picks.find((p) => p.userData.id === id); if (!g) return null; const v = g.getWorldPosition(new THREE.Vector3()).project(camera), r = canvas.getBoundingClientRect(); return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height }; }
  return { open, close, confirm, ready, where, get isOpen() { return on; } };
}
