/* Synthèse vocale Piper hors ligne (module worker) : texte -> phonèmes (espeak-ng, piper_phonemize en WebAssembly)
   -> identifiants -> modèle VITS ONNX (onnxruntime-web) -> échantillons Float32. Tout est servi par le site lui-même. */
import * as ort from './moteur/ort.min.mjs';
import creerPhonemiseur from './moteur/piper_phonemize.mjs';

const B = new URL('./', import.meta.url).href;
ort.env.wasm.wasmPaths = B + 'moteur/';
ort.env.wasm.numThreads = self.crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 1) : 1;   // GitHub Pages : pas d'isolation, 1 fil
let cfg = null, sess = null, ph = null;

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

self.onmessage = async ({ data: d }) => {
  try {
    if (d.type === 'init') {
      cfg = await (await fetch(B + 'piper/' + d.modele + '.onnx.json')).json();
      sess = await ort.InferenceSession.create(B + 'piper/' + d.modele + '.onnx', { executionProviders: ['wasm'], graphOptimizationLevel: 'all' });
      await phonemiseur();
      self.postMessage({ type: 'pret', locuteurs: cfg.speaker_id_map || {} });
    } else if (d.type === 'dire') {
      const ids = (await phonemiseur())(d.texte, cfg.espeak.voice);
      if (!ids.length) return self.postMessage({ type: 'audio', id: d.id, pcm: new Float32Array(0), sr: cfg.audio.sample_rate });
      const I = cfg.inference, entrees = {
        input: new ort.Tensor('int64', BigInt64Array.from(ids, BigInt), [1, ids.length]),
        input_lengths: new ort.Tensor('int64', BigInt64Array.from([BigInt(ids.length)]), [1]),
        scales: new ort.Tensor('float32', Float32Array.from([I.noise_scale, I.length_scale / (d.vitesse || 1), I.noise_w]), [3]),
      };
      if (Object.keys(cfg.speaker_id_map || {}).length) entrees.sid = new ort.Tensor('int64', BigInt64Array.from([BigInt(d.sid || 0)]), [1]);
      const t0 = performance.now(), r = await sess.run(entrees), pcm = Float32Array.from(r.output.data);
      self.postMessage({ type: 'audio', id: d.id, pcm, sr: cfg.audio.sample_rate, ms: Math.round(performance.now() - t0) }, [pcm.buffer]);
    }
  } catch (e) { self.postMessage({ type: 'erreur', id: d.id, message: String(e && e.message || e) }); }
};
