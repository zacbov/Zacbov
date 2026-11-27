/* Synthèse vocale Piper hors ligne (module worker) : texte -> phonèmes (espeak-ng, piper_phonemize en WebAssembly)
   -> identifiants -> modèle VITS ONNX (onnxruntime-web) -> échantillons Float32. Tout est servi par le site lui-même. */
import * as ort from './moteur/ort.min.mjs';
import creerPhonemiseur from './moteur/piper_phonemize.mjs';

const B = new URL('./', import.meta.url).href;
ort.env.wasm.wasmPaths = B + 'moteur/';
ort.env.wasm.numThreads = self.crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 1) : 1;   // GitHub Pages : pas d'isolation, 1 fil
let ph = null; const modeles = new Map();   // plusieurs voix : une session ONNX par modèle, chargée à la première demande
async function fichier(url) {                 // modèle gardé dans le cache du navigateur (Cache Storage) : téléchargé une seule fois
  try {
    const c = await caches.open('voix-locales-v1'); let r = await c.match(url);
    if (!r) { r = await fetch(url); if (!r.ok) throw new Error(url + ' : ' + r.status); await c.put(url, r.clone()); }
    return new Uint8Array(await r.arrayBuffer());
  } catch (e) { const r = await fetch(url); if (!r.ok) throw new Error(url + ' : ' + r.status); return new Uint8Array(await r.arrayBuffer()); }
}

async function phonemiseur() {
  if (ph) return ph;
  let sortie = null;
  const m = await creerPhonemiseur({ print: (l) => { sortie && sortie.push(l); }, printErr: () => {}, locateFile: (f) => B + 'moteur/' + f });
  ph = (texte, voix) => {
    sortie = [];
    try { m.callMain(['-l', voix, '--input', JSON.stringify([{ text: texte }]), '--espeak_data', '/espeak-ng-data']); }
    catch (e) { if (!(e && (e.name === 'ExitStatus' || e.status === 0))) throw e; }
    const ids = []; for (const l of sortie) { try { ids.push(...JSON.parse(l).phoneme_ids); } catch {} }
    return ids;
  };
  return ph;
}

function modele(nom) {
  if (modeles.has(nom)) { const p = modeles.get(nom); modeles.delete(nom); modeles.set(nom, p); }   // remis en tête (le plus récent)
  else {
    const p = (async () => {
      const cfg = await (await fetch(B + 'piper/' + nom + '.onnx.json')).json();
      const sess = await ort.InferenceSession.create(await fichier(B + 'piper/' + nom + '.onnx'), { executionProviders: ['wasm'], graphOptimizationLevel: 'all' });
      return { cfg, sess };
    })();
    p.catch(() => modeles.delete(nom));
    modeles.set(nom, p);
    liberer(2, nom);                          // mémoire : mls (15 voix) toujours gardé + deux autres modèles au plus
  }
  return modeles.get(nom);
}
const GARDE = 'fr_FR-mls-medium';
function liberer(max, sauf) {                 // libère les modèles les plus anciens (hors mls et hors celui demandé), après la fin de leurs synthèses
  const autres = [...modeles.keys()].filter((k) => k !== GARDE && k !== sauf);
  while (autres.length > max - 1 + (sauf === GARDE ? 1 : 0) && autres.length) {
    const vieux = autres.shift(), q = modeles.get(vieux); modeles.delete(vieux);
    q.then((m) => file.then(() => m.sess.release && m.sess.release())).catch(() => {});
  }
}

let file = Promise.resolve();                 // les demandes sont traitées une à une (pas de libération pendant un calcul)
self.onmessage = ({ data: d }) => { file = file.then(() => traiter(d)).catch(() => {}); };
async function traiter(d, essai = 0) {
  try {
    if (d.type === 'init') {
      const { cfg } = await modele(d.modele); await phonemiseur();
      self.postMessage({ type: 'pret', id: d.id, modele: d.modele, locuteurs: cfg.speaker_id_map || {} });
    } else if (d.type === 'dire') {
      const { cfg, sess } = await modele(d.modele);
      const ids = (await phonemiseur())(d.texte, cfg.espeak.voice);
      if (!ids.length) return self.postMessage({ type: 'audio', id: d.id, pcm: new Float32Array(0), sr: cfg.audio.sample_rate });
      const I = cfg.inference, entrees = {
        input: new ort.Tensor('int64', BigInt64Array.from(ids, BigInt), [1, ids.length]),
        input_lengths: new ort.Tensor('int64', BigInt64Array.from([BigInt(ids.length)]), [1]),
        scales: new ort.Tensor('float32', Float32Array.from([Math.min(I.noise_scale, 0.5), I.length_scale / (d.vitesse || 1), Math.min(I.noise_w, 0.6)]), [3]),   // bruit réduit : moins de syllabes inventées (voix mls surtout)
      };
      if (cfg.num_speakers > 1 || Object.keys(cfg.speaker_id_map || {}).length) entrees.sid = new ort.Tensor('int64', BigInt64Array.from([BigInt(d.sid || 0)]), [1]);
      const t0 = performance.now(), r = await sess.run(entrees), pcm = Float32Array.from(r.output.data);
      self.postMessage({ type: 'audio', id: d.id, pcm, sr: cfg.audio.sample_rate, ms: Math.round(performance.now() - t0) }, [pcm.buffer]);
    }
  } catch (e) {
    if (!essai && d.modele) {                 // échec (souvent la mémoire) : on libère tout sauf ce modèle, on le recharge, on réessaie une fois
      for (const [k, q] of [...modeles.entries()]) { modeles.delete(k); q.then((m) => m.sess.release && m.sess.release()).catch(() => {}); }
      return traiter(d, 1);
    }
    self.postMessage({ type: 'erreur', id: d.id, message: String(e && e.message || e) });
  }
}
