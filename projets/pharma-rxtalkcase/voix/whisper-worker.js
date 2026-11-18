/* Reconnaissance vocale hors ligne : Whisper (base, quantifié 8 bits) avec transformers.js, modèle servi par le site. */
import { pipeline, env } from './moteur/transformers.min.js';

const B = new URL('./', import.meta.url).href;
env.allowRemoteModels = false;                 // jamais de téléchargement depuis Hugging Face
env.allowLocalModels = true;
env.localModelPath = B;                        // -> voix/whisper-base/...
env.backends.onnx.wasm.wasmPaths = B + 'moteur/';
env.backends.onnx.wasm.numThreads = self.crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 1) : 1;
let asr = null;

self.onmessage = async ({ data: d }) => {
  try {
    if (!asr) {
      self.postMessage({ type: 'etat', texte: 'Chargement du modèle de reconnaissance…' });
      asr = await pipeline('automatic-speech-recognition', d.modele || 'whisper-base', {
        device: 'wasm', dtype: { encoder_model: 'q8', decoder_model_merged: 'q8' },
        progress_callback: (p) => { if (p.status === 'progress' && p.total) self.postMessage({ type: 'etat', texte: `Chargement ${Math.round(p.progress)} %` }); },
      });
    }
    if (d.type === 'init') return self.postMessage({ type: 'pret' });
    const t0 = performance.now();
    const r = await asr(d.audio, { language: 'french', task: 'transcribe', chunk_length_s: 30, stride_length_s: 5 });
    self.postMessage({ type: 'texte', id: d.id, texte: (r.text || '').trim(), ms: Math.round(performance.now() - t0) });
  } catch (e) { self.postMessage({ type: 'erreur', id: d.id, message: String(e && e.message || e) }); }
};
