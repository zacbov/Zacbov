/* Voix locales, gratuites et hors ligne (rien n'est envoyé à un service extérieur) :
   - VoixLocale : le patient parle avec Piper (voix « fr_FR-upmc-medium » : Jessica et Pierre), phrase par phrase ;
     expose position() et amp() pour caler les lèvres de l'avatar sur le son ;
   - DicteeLocale : l'étudiant dicte sa réponse, Whisper la transcrit dans le navigateur.
   Les modèles se placent dans voix/piper/ et voix/whisper-base/ (voir LISEZMOI_voix.txt). Sans eux, la page reprend la
   voix du navigateur et le bouton micro reste masqué. */
(function () {
  const B = new URL('./', document.currentScript.src).href;
  const MODELE = 'fr_FR-upmc-medium', LOC = { Femme: 'jessica', Homme: 'pierre' };
  const existe = (u) => fetch(u, { method: 'HEAD', cache: 'no-store' }).then((r) => r.ok && +(r.headers.get('Content-Length') || 1) > 1000).catch(() => false);

  /* ---------------- synthèse ---------------- */
  let w = null, pret = null, locuteurs = {}, actif = false, ctx = null, nId = 0;
  const attente = new Map();
  function demarrer() {
    if (pret) return pret;
    pret = new Promise((ok, ko) => {
      w = new Worker(B + 'piper-worker.js', { type: 'module' });
      w.onmessage = ({ data: d }) => {
        if (d.type === 'pret') { locuteurs = d.locuteurs; ok(); }
        else if (d.type === 'erreur' && d.id == null) ko(new Error(d.message));
        else if (attente.has(d.id)) { const a = attente.get(d.id); attente.delete(d.id); d.type === 'erreur' ? a.ko(new Error(d.message)) : a.ok(d); }
      };
      w.onerror = (e) => ko(new Error(e.message || 'worker'));
      w.postMessage({ type: 'init', modele: MODELE });
    });
    pret.catch(() => { actif = false; });
    return pret;
  }
  const synth = (texte, sid, vitesse) => new Promise((ok, ko) => { const id = ++nId; attente.set(id, { ok, ko }); w.postMessage({ type: 'dire', id, texte, sid, vitesse }); });
  const phrases = (t) => (t.match(/[^.!?…;:]+[.!?…;:]*["»)]*\s*|[.!?…;:]+\s*/g) || [t]).reduce((a, p) => {   // regroupe les fragments trop courts
    if (a.length && (a[a.length - 1].length < 25 || p.trim().length < 6)) a[a.length - 1] += p; else a.push(p); return a; }, []);

  function enveloppe(pcm, sr) {               // volume par tranches de 20 ms, normalisé
    const n = Math.max(1, Math.round(sr / 50)), env = new Float32Array(Math.ceil(pcm.length / n)); let mx = 1e-4;
    for (let i = 0; i < env.length; i++) { let s = 0; const a = i * n, b = Math.min(pcm.length, a + n); for (let k = a; k < b; k++) s += pcm[k] * pcm[k]; env[i] = Math.sqrt(s / Math.max(1, b - a)); mx = Math.max(mx, env[i]); }
    for (let i = 0; i < env.length; i++) env[i] = Math.min(1, env[i] / (mx * 0.7));
    return env;
  }

  function parler(texte, o = {}) {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    const sid = locuteurs[/^f/i.test(o.sexe || '') ? LOC.Femme : LOC.Homme] ?? 0, P = phrases(texte), total = texte.length || 1;
    const segs = []; let off = 0, arret = false, fin0 = 0;
    P.forEach((p) => { segs.push({ off, len: p.length, debut: null, duree: 0, env: null, src: null }); off += p.length; });
    const prets = P.map((p) => demarrer().then(() => synth(p.trim(), sid, o.vitesse || 1)));   // le worker les traite dans l'ordre
    const fin = (async () => {
      let t = ctx.currentTime + 0.03;
      for (let i = 0; i < P.length; i++) {
        const d = await prets[i]; if (arret) return;
        const s = segs[i]; if (!d.pcm.length) continue;
        const buf = ctx.createBuffer(1, d.pcm.length, d.sr); buf.copyToChannel(d.pcm, 0);
        const src = ctx.createBufferSource(); src.buffer = buf; src.connect(ctx.destination);
        t = Math.max(t, ctx.currentTime + 0.02); src.start(t);
        Object.assign(s, { debut: t, duree: buf.duration, env: enveloppe(d.pcm, d.sr), src }); t += buf.duration; fin0 = t;
      }
      while (!arret && ctx.currentTime < fin0) await new Promise((r) => setTimeout(r, 50));
    })();
    const courant = () => { const now = ctx.currentTime; for (let i = segs.length - 1; i >= 0; i--) if (segs[i].debut != null && now >= segs[i].debut) return segs[i]; return null; };
    return {
      fin,
      position() { const s = courant(); if (!s) return 0; return Math.min(1, (s.off + s.len * Math.min(1, (ctx.currentTime - s.debut) / s.duree)) / total); },
      amp() { const s = courant(); if (!s || !s.env) return 0; const k = Math.floor((ctx.currentTime - s.debut) * 50); return k < s.env.length ? s.env[k] : 0; },
      stop() { arret = true; segs.forEach((s) => { try { s.src && s.src.stop(); } catch {} }); },
    };
  }

  const VoixLocale = {
    modele: MODELE,
    disponible: null,
    async verifier() { if (this.disponible === null) this.disponible = await existe(B + 'piper/' + MODELE + '.onnx'); return this.disponible; },
    async activer(on = true) { actif = on && (await this.verifier()); if (actif) demarrer().catch((e) => console.warn('Voix locale :', e)); return actif; },
    desactiver() { actif = false; },
    active: () => actif,
    parler,
    precharger: () => demarrer(),
  };

  /* ---------------- dictée ---------------- */
  let ww = null, wpret = null, nT = 0; const wAtt = new Map();
  function wDemarrer(etat) {
    if (wpret) return wpret;
    wpret = new Promise((ok, ko) => {
      ww = new Worker(B + 'whisper-worker.js', { type: 'module' });
      ww.onmessage = ({ data: d }) => {
        if (d.type === 'etat') etat && etat(d.texte);
        else if (d.type === 'pret') ok();
        else if (d.type === 'erreur' && !wAtt.has(d.id)) ko(new Error(d.message));
        else if (wAtt.has(d.id)) { const a = wAtt.get(d.id); wAtt.delete(d.id); d.type === 'erreur' ? a.ko(new Error(d.message)) : a.ok(d); }
      };
      ww.onerror = (e) => ko(new Error(e.message || 'worker'));
      ww.postMessage({ type: 'init' });
    });
    wpret.catch(() => { wpret = null; });
    return wpret;
  }
  let rec = null, flux = null, morceaux = [];
  const DicteeLocale = {
    disponible: null,
    async verifier() { if (this.disponible === null) this.disponible = await existe(B + 'whisper-base/onnx/encoder_model_quantized.onnx'); return this.disponible; },
    precharger: (etat) => wDemarrer(etat),
    get enCours() { return !!rec; },
    async commencer() {
      flux = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
      morceaux = []; rec = new MediaRecorder(flux); rec.ondataavailable = (e) => e.data.size && morceaux.push(e.data); rec.start();
    },
    async terminer(etat) {
      if (!rec) return '';
      const r = rec; rec = null;
      await new Promise((ok) => { r.onstop = ok; r.stop(); }); flux.getTracks().forEach((t) => t.stop());
      const blob = new Blob(morceaux, { type: r.mimeType });
      const ac = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });   // décodage + rééchantillonnage à 16 kHz
      const ab = await ac.decodeAudioData(await blob.arrayBuffer()); ac.close();
      const audio = ab.getChannelData(0).slice();
      await wDemarrer(etat); etat && etat('Transcription…');
      const d = await new Promise((ok, ko) => { const id = ++nT; wAtt.set(id, { ok, ko }); ww.postMessage({ type: 'texte', id, audio }, [audio.buffer]); });
      return d.texte;
    },
    annuler() { if (rec) { try { rec.stop(); } catch {} rec = null; } if (flux) flux.getTracks().forEach((t) => t.stop()); },
  };
  window.VoixLocale = VoixLocale; window.DicteeLocale = DicteeLocale;
})();
