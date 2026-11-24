/* Voix locales, gratuites et hors ligne (rien n'est envoyé à un service extérieur) :
   - VoixLocale : le patient parle avec Piper (modèles fr_FR mls, upmc, siwis, tom : 20 voix choisies selon le sexe et
     l'âge du patient), phrase par phrase ;
     expose position() et amp() pour caler les lèvres de l'avatar sur le son ;
   - DicteeLocale : l'étudiant dicte sa réponse, Whisper la transcrit dans le navigateur.
   Les modèles se placent dans voix/piper/ et voix/whisper-base/ (voir LISEZMOI_voix.txt). Sans eux, la page reprend la
   voix du navigateur et le bouton micro reste masqué. */
(function () {
  const B = new URL('./', document.currentScript.src).href;
  const existe = (u) => fetch(u, { method: 'HEAD', cache: 'no-store' }).then((r) => r.ok && +(r.headers.get('Content-Length') || 1) > 1000).catch(() => false);

  /* Catalogue des voix (choix de Tice). loc = nom du locuteur dans le modèle (speaker_id_map), vide pour un modèle à une voix.
     age : jeune (< 30 ans), adulte (30–54), mature (55–69), agee (≥ 70). poids : priorité dans sa tranche. */
  const MLS = 'fr_FR-mls-medium', UPMC = 'fr_FR-upmc-medium', SIWIS = 'fr_FR-siwis-medium', TOM = 'fr_FR-tom-medium';
  const VOIX = [
    { cle: 'F-mls-12709', modele: MLS, loc: '12709', sexe: 'F', age: 'agee', poids: 3, nom: 'Femme âgée 1' },
    { cle: 'F-mls-8778', modele: MLS, loc: '8778', sexe: 'F', age: 'agee', poids: 3, nom: 'Femme âgée 2' },
    { cle: 'F-mls-12713', modele: MLS, loc: '12713', sexe: 'F', age: 'agee', poids: 3, nom: 'Femme âgée 3' },
    { cle: 'F-mls-9121', modele: MLS, loc: '9121', sexe: 'F', age: 'mature', poids: 3, nom: 'Femme mûre' },
    { cle: 'F-siwis', modele: SIWIS, loc: '', sexe: 'F', age: 'adulte', poids: 2, nom: 'Siwis' },
    { cle: 'F-upmc-jessica', modele: UPMC, loc: 'jessica', sexe: 'F', age: 'adulte', poids: 2, nom: 'Jessica' },
    { cle: 'F-mls-1474', modele: MLS, loc: '1474', sexe: 'F', age: 'adulte', poids: 1, nom: 'Femme 1474' },
    { cle: 'F-mls-4512', modele: MLS, loc: '4512', sexe: 'F', age: 'adulte', poids: 1, nom: 'Femme 4512' },
    { cle: 'F-mls-13634', modele: MLS, loc: '13634', sexe: 'F', age: 'adulte', poids: 1, nom: 'Femme 13634' },
    { cle: 'F-mls-6128', modele: MLS, loc: '6128', sexe: 'F', age: 'adulte', poids: 1, nom: 'Femme 6128' },
    { cle: 'F-mls-5232', modele: MLS, loc: '5232', sexe: 'F', age: 'adulte', poids: 1, nom: 'Femme 5232' },
    { cle: 'F-mls-12823', modele: MLS, loc: '12823', sexe: 'F', age: 'adulte', poids: 1, nom: 'Femme 12823' },
    { cle: 'F-mls-5612', modele: MLS, loc: '5612', sexe: 'F', age: 'jeune', poids: 2, nom: 'Jeune femme' },
    { cle: 'H-mls-7423', modele: MLS, loc: '7423', sexe: 'H', age: 'agee', poids: 3, nom: 'Homme âgé 1' },
    { cle: 'H-mls-9242', modele: MLS, loc: '9242', sexe: 'H', age: 'agee', poids: 2, nom: 'Homme âgé 2' },
    { cle: 'H-mls-10065', modele: MLS, loc: '10065', sexe: 'H', age: 'mature', poids: 3, nom: "Homme d'âge moyen" },
    { cle: 'H-tom', modele: TOM, loc: '', sexe: 'H', age: 'adulte', poids: 2, nom: 'Tom' },
    { cle: 'H-upmc-pierre', modele: UPMC, loc: 'pierre', sexe: 'H', age: 'adulte', poids: 2, nom: 'Pierre' },
    { cle: 'H-mls-1840', modele: MLS, loc: '1840', sexe: 'H', age: 'adulte', poids: 1, nom: 'Homme 1840' },
    { cle: 'H-mls-12501', modele: MLS, loc: '12501', sexe: 'H', age: 'jeune', poids: 2, nom: 'Jeune homme' },
  ];
  const VOISINES = { agee: ['agee', 'mature', 'adulte'], mature: ['mature', 'adulte', 'agee'], adulte: ['adulte', 'mature', 'jeune'], jeune: ['jeune', 'adulte'] };
  const tranche = (age, unite) => {
    if (age == null || isNaN(age)) return 'adulte';
    if (/mois|jour|sem/i.test(unite || '') || age < 15) return 'adulte';   // enfant : c'est le parent qui parle au comptoir
    return age < 30 ? 'jeune' : age < 55 ? 'adulte' : age < 70 ? 'mature' : 'agee';
  };
  const hache = (t) => { let h = 2166136261; for (const c of String(t)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  let presents = null;                         // modèles réellement déployés dans voix/piper/
  async function verifierModeles() {
    if (!presents) presents = (async () => {
      const noms = [...new Set(VOIX.map((v) => v.modele))], ok = await Promise.all(noms.map((n) => existe(B + 'piper/' + n + '.onnx')));
      return new Set(noms.filter((n, i) => ok[i]));
    })();
    return presents;
  }
  function choisirDans(P, sexe, age, unite, graine) {   // même cas -> même voix ; cas différents -> voix variées de la bonne tranche
    const s = /^f/i.test(sexe || '') ? 'F' : 'H';
    for (const t of VOISINES[tranche(+age, unite)]) {
      const L = VOIX.filter((v) => v.sexe === s && v.age === t && P.has(v.modele)); if (!L.length) continue;
      let k = hache(graine || '') % L.reduce((a, v) => a + v.poids, 0);
      for (const v of L) { if ((k -= v.poids) < 0) return v; }
    }
    return VOIX.find((v) => v.sexe === s && P.has(v.modele)) || VOIX.find((v) => P.has(v.modele)) || null;
  }

  /* ---------------- synthèse ---------------- */
  let w = null, actif = false, ctx = null, nId = 0, courante = null, forcee = null;
  const attente = new Map(), prets = new Map(), locuteurs = {};
  function travailleur() {
    if (w) return w;
    w = new Worker(B + 'piper-worker.js', { type: 'module' });
    w.onmessage = ({ data: d }) => {
      if (attente.has(d.id)) { const a = attente.get(d.id); attente.delete(d.id); d.type === 'erreur' ? a.ko(new Error(d.message)) : a.ok(d); }
    };
    w.onerror = (e) => { attente.forEach((a) => a.ko(new Error(e.message || 'worker'))); attente.clear(); };
    return w;
  }
  const envoyer = (m) => new Promise((ok, ko) => { const id = ++nId; attente.set(id, { ok, ko }); travailleur().postMessage({ ...m, id }); });
  function demarrer(modele) {
    modele = modele || (courante && courante.modele) || UPMC;
    if (!prets.has(modele)) {
      const p = envoyer({ type: 'init', modele }).then((d) => { locuteurs[modele] = d.locuteurs || {}; });
      p.catch(() => prets.delete(modele)); prets.set(modele, p);
    }
    return prets.get(modele);
  }
  const synth = (texte, v, vitesse) => envoyer({ type: 'dire', texte, modele: v.modele, sid: v.loc ? (locuteurs[v.modele] || {})[v.loc] ?? 0 : 0, vitesse });
  const phrases0 = (t) => (t.match(/[^.!?…;:]+[.!?…;:]*["»)]*\s*|[.!?…;:]+\s*/g) || [t]).reduce((a, p) => {   // regroupe les fragments trop courts
    if (a.length && (a[a.length - 1].length < 25 || p.trim().length < 6)) a[a.length - 1] += p; else a.push(p); return a; }, []);
  const phrases = (t) => {                     // le premier morceau court part vite : on coupe la première phrase à la virgule
    const P = phrases0(t), m = P.length && P[0].length > 45 ? /^(.{12,}?,\s+)(.{12,})$/s.exec(P[0]) : null;
    return m ? [m[1], m[2], ...P.slice(1)] : P;
  };

  function enveloppe(pcm, sr) {               // volume par tranches de 20 ms, normalisé
    const n = Math.max(1, Math.round(sr / 50)), env = new Float32Array(Math.ceil(pcm.length / n)); let mx = 1e-4;
    for (let i = 0; i < env.length; i++) { let s = 0; const a = i * n, b = Math.min(pcm.length, a + n); for (let k = a; k < b; k++) s += pcm[k] * pcm[k]; env[i] = Math.sqrt(s / Math.max(1, b - a)); mx = Math.max(mx, env[i]); }
    for (let i = 0; i < env.length; i++) env[i] = Math.min(1, env[i] / (mx * 0.7));
    return env;
  }

  function parler(texte, o = {}) {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    const v = (o.voix && VOIX.find((x) => x.cle === o.voix)) || forcee || (courante && (!o.sexe || /^f/i.test(o.sexe) === (courante.sexe === 'F')) ? courante : null)
      || VOIX.find((x) => x.cle === (/^f/i.test(o.sexe || '') ? 'F-upmc-jessica' : 'H-upmc-pierre'));
    const P = phrases(texte), total = texte.length || 1;
    const segs = []; let off = 0, arret = false, fin0 = 0;
    P.forEach((p) => { segs.push({ off, len: p.length, debut: null, duree: 0, env: null, src: null }); off += p.length; });
    const sons = P.map((p) => demarrer(v.modele).then(() => synth(p.trim(), v, o.vitesse || 1)));   // le worker les traite dans l'ordre
    const fin = (async () => {
      let t = ctx.currentTime + 0.03;
      for (let i = 0; i < P.length; i++) {
        const d = await sons[i]; if (arret) return;
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
      demarre() { const now = ctx.currentTime; return segs.some((s) => s.debut != null && now >= s.debut); },
      position() { const s = courant(); if (!s) return 0; return Math.min(1, (s.off + s.len * Math.min(1, (ctx.currentTime - s.debut) / s.duree)) / total); },
      amp() { const s = courant(); if (!s || !s.env) return 0; const k = Math.floor((ctx.currentTime - s.debut) * 50); return k < s.env.length ? s.env[k] : 0; },
      stop() { arret = true; segs.forEach((s) => { try { s.src && s.src.stop(); } catch {} }); },
    };
  }

  const VoixLocale = {
    voix: VOIX,
    disponible: null,
    async verifier() { if (this.disponible === null) this.disponible = (await verifierModeles()).size > 0; return this.disponible; },
    modeles: () => verifierModeles(),
    /* Voix du patient pour un cas : sexe et âge de la fiche, tirage stable par identifiant du cas. */
    async pourCas(c) {
      const f = (c && c.fiche) || {}, P = await verifierModeles();
      courante = choisirDans(P, f.sexe, f.age, f.age_unite, c && c.id);
      if (actif && courante) demarrer(courante.modele).catch(() => {});
      return courante;
    },
    courante: () => forcee || courante,
    forcer(cle) { forcee = (cle && VOIX.find((v) => v.cle === cle)) || null; try { cle ? localStorage.setItem('voixForcee', cle) : localStorage.removeItem('voixForcee'); } catch {} return forcee; },
    async activer(on = true) {
      actif = on && (await this.verifier());
      if (actif && !prets.size) {               // préchargement différé : la page et le classeur d'abord, la voix (~70 Mo, en cache ensuite) quand le navigateur est libre
        const go = () => demarrer().catch((e) => console.warn('Voix locale :', e));
        (window.requestIdleCallback || ((f) => setTimeout(f, 1))) (() => setTimeout(go, 3000), { timeout: 6000 });
      }
      return actif;
    },
    desactiver() { actif = false; },
    active: () => actif,
    parler,
    precharger: (m) => demarrer(m),
  };
  try { const k = localStorage.getItem('voixForcee'); if (k) forcee = VOIX.find((v) => v.cle === k) || null; } catch {}

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
