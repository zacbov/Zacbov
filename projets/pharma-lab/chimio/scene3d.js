/* Moteur 3D commun : rendu, chargement des modèles (Draco), petites animations (tween). */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
export { THREE };

export const BASE = new URL('../modeles/', import.meta.url).href;
const draco = new DRACOLoader(); draco.setDecoderPath(window.LABO_DRACO || 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/draco/');
const loader = new GLTFLoader(); loader.setDRACOLoader(draco);
const cache = new Map();
export function charger(nom) {
  if (!cache.has(nom)) cache.set(nom, new Promise((ok, ko) => loader.load(BASE + nom, ok, undefined, ko)));
  return cache.get(nom);
}

export function creerRendu(hote) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  hote.appendChild(renderer.domElement);
  const pmrem = new THREE.PMREMGenerator(renderer); const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const vues = new Set(); let active = null;
  const taille = () => { const w = hote.clientWidth || 800, h = hote.clientHeight || 600; renderer.setSize(w, h, false); for (const v of vues) { v.camera.aspect = w / h; v.camera.updateProjectionMatrix(); } };
  new ResizeObserver(taille).observe(hote);
  const tweens = []; let last = performance.now();
  renderer.setAnimationLoop((t) => {
    const dt = Math.min(0.05, (t - last) / 1000); last = t;
    for (let i = tweens.length - 1; i >= 0; i--) { const tw = tweens[i]; tw.t += dt; const k = Math.min(1, tw.t / tw.d), e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2; tw.f(e, k); if (k >= 1) { tweens.splice(i, 1); tw.ok(); } }
    if (active) { active.tick && active.tick(dt, t / 1000); if (active.controls) active.controls.update(); renderer.render(active.scene, active.camera); }
  });
  return {
    renderer, env, THREE,
    vue(opts = {}) {
      const scene = new THREE.Scene(); scene.environment = env; scene.background = new THREE.Color(opts.fond || 0xe9e4da);
      const camera = new THREE.PerspectiveCamera(opts.fov || 32, 1, 0.02, 60);
      const v = { scene, camera, tick: null, controls: null };
      if (opts.orbite) { v.controls = new OrbitControls(camera, renderer.domElement); v.controls.enableDamping = true; v.controls.enabled = false; }
      vues.add(v); taille(); return v;
    },
    activer(v) { if (active && active.controls) active.controls.enabled = false; active = v; if (v.controls) v.controls.enabled = true; taille(); },
    tween(d, f) { return new Promise((ok) => tweens.push({ t: 0, d, f, ok })); },
    attendre(s) { return new Promise((ok) => tweens.push({ t: 0, d: s, f: () => {}, ok })); },
  };
}

/* texture de carrelage (canvas) */
export function carrelage(c1, c2, joint, n = 8) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 512; const g = cv.getContext('2d');
  const s = 512 / n; g.fillStyle = joint; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { g.fillStyle = (i + j) % 2 ? c1 : c2; g.fillRect(i * s + 2, j * s + 2, s - 4, s - 4); }
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

/* texte sur une étiquette (canvas) */
export function etiquetteTexture(lignes, opts = {}) {
  const cv = document.createElement('canvas'); cv.width = opts.w || 512; cv.height = opts.h || 320; const g = cv.getContext('2d');
  g.fillStyle = opts.fond || '#fffdf6'; g.fillRect(0, 0, cv.width, cv.height);
  g.strokeStyle = opts.bord || '#c2410c'; g.lineWidth = 10; g.strokeRect(5, 5, cv.width - 10, cv.height - 10);
  g.fillStyle = '#1d1b18'; let y = 46;
  for (const [i, l] of lignes.entries()) { g.font = (i === 0 ? 'bold 38px ' : '28px ') + '"IBM Plex Mono", monospace'; g.fillText(l, 24, y); y += i === 0 ? 50 : 38; }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
