/* Préchargement de l'essentiel avant d'entrer dans l'outil : patients 3D, décor, gestes, classeur des cas, décodeur Draco.
   - chaque fichier est téléchargé une fois, avec progression ; il est gardé dans le cache du navigateur (Cache Storage),
     les visites suivantes sont donc presque instantanées ;
   - les requêtes de l'application vers ces mêmes fichiers sont servies depuis ce préchargement (pas de double téléchargement) ;
   - « Entrer sans attendre » laisse continuer en arrière-plan.
   À inclure en tout premier dans <head> (script classique). */
(function () {
  const VERSION = 'rxtalk-essentiel-v35';                 // à changer quand les modèles 3D changent
  const BASE = window.AVATAR_BASE || 'avatar/';
  const DRACO = window.AVATAR_DRACO || 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/draco/';
  const pat = (() => { try { const q = new URLSearchParams(location.search).get('patiente'), k = q || localStorage.getItem('patiente'); return ['amanda', 'crowd84'].includes(k) ? 'patient_' + k + '.glb' : 'patient_femme.glb'; } catch (e) { return 'patient_femme.glb'; } })();
  const LISTE = [
    ['Classeur des cas', 'cas_cliniques_complet.xlsx'],
    ['Lecteur Excel', window.HORS_LIGNE ? 'lib/xlsx.full.min.js' : 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'],
    ['Patiente', BASE + pat],
    ['Patient', BASE + 'patient_homme.glb'],
    ['Décor de la pharmacie', BASE + 'decor_pharmacie.webp'],
    ['Tensiomètre', BASE + 'tensiometre-draco.glb'],
    ['Mouvements', BASE + 'gestes.json'],
    ['Mouvements (données)', BASE + 'gestes.bin'],
    ['Lésions de peau', BASE + 'peau.json'],
    ['Décodeur 3D', DRACO + 'draco_wasm_wrapper.js'],
    ['Décodeur 3D (wasm)', DRACO + 'draco_decoder.wasm'],
  ].filter((x) => x[1]).map(([nom, u]) => ({ nom, url: new URL(u, location.href).href, recu: 0, total: 0, fini: false, erreur: false }));
  const PRE = new Map();                                 // url absolue -> Promise<{buf, type}>
  window.__precharge = { liste: LISTE, map: PRE, version: VERSION };

  /* les requêtes de l'application vers un fichier préchargé attendent ce préchargement au lieu de repartir sur le réseau */
  const fetch0 = window.fetch.bind(window);
  window.fetch = function (input, init) {
    try {
      const u = new URL(typeof input === 'string' ? input : input.url, location.href).href, p = PRE.get(u);
      if (p && (!init || !init.method || init.method === 'GET')) return p.then((r) => (r ? new Response(r.buf.slice(0), { status: 200, headers: { 'Content-Type': r.type } }) : fetch0(input, init)));
    } catch (e) {}
    return fetch0(input, init);
  };

  /* copie gardée encore valable ? (requête HEAD : ETag / date de modification ; hors réseau, on garde la copie) */
  async function aJour(url, r) {
    const e0 = r.headers.get('X-Etag') || '', m0 = r.headers.get('X-Modif') || '';
    if (!e0 && !m0) return true;
    try {
      const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 3000);
      const h = await fetch0(url, { method: 'HEAD', cache: 'no-cache', signal: ctl.signal }); clearTimeout(t);
      if (!h.ok) return true;
      const e = h.headers.get('ETag') || '', m = h.headers.get('Last-Modified') || '';
      return e0 ? !e || e === e0 : !m || m === m0;
    } catch (e) { return true; }
  }
  async function charger(it, cache) {
    try {
      if (cache) { let r = await cache.match(it.url); if (r && !(await aJour(it.url, r))) { cache.delete(it.url); r = null; } if (r) { const buf = await r.arrayBuffer(); it.recu = it.total = buf.byteLength; it.fini = true; it.cache = true; maj(); return { buf, type: r.headers.get('Content-Type') || '' }; } }
      const r = await fetch0(it.url, { cache: 'no-cache' });
      if (!r.ok) throw new Error(r.status);
      it.total = +r.headers.get('Content-Length') || 0;
      const type = r.headers.get('Content-Type') || '', parts = [];
      if (r.body && r.body.getReader) {
        const rd = r.body.getReader();
        for (;;) { const { done, value } = await rd.read(); if (done) break; parts.push(value); it.recu += value.length; maj(); }
      } else { const b = new Uint8Array(await r.arrayBuffer()); parts.push(b); it.recu = b.length; }
      const buf = new Uint8Array(it.recu); let o = 0; for (const p of parts) { buf.set(p, o); o += p.length; }
      if (!it.total || it.total < it.recu) it.total = it.recu;
      it.fini = true; maj();
      if (cache) cache.put(it.url, new Response(buf.slice(0), { headers: { 'Content-Type': type, 'X-Etag': r.headers.get('ETag') || '', 'X-Modif': r.headers.get('Last-Modified') || '' } })).catch(() => {});
      return { buf: buf.buffer, type };
    } catch (e) { it.erreur = it.fini = true; maj(); return null; }      // en cas d'échec, l'application refera la requête normalement
  }

  /* ---------- écran */
  let el = null, t0 = performance.now(), entre = false;
  function css() {
    const s = document.createElement('style');
    s.textContent = `#precharge{position:fixed;inset:0;z-index:99999;background:radial-gradient(ellipse at 50% 30%,#1b2e27 0%,#0d1613 70%);color:#dfe9e3;display:flex;align-items:center;justify-content:center;font-family:'Atkinson Hyperlegible',system-ui,sans-serif;transition:opacity .45s}
#precharge.parti{opacity:0;pointer-events:none}
#precharge .boite{width:min(520px,calc(100vw - 32px))}
#precharge h1{font-size:1.35rem;margin:0 0 .25rem;font-weight:700;letter-spacing:.01em}
#precharge .sous{color:#8fa89b;font-size:.92rem;margin:0 0 1.2rem}
#precharge .barre{height:10px;border-radius:6px;background:#15221d;border:1px solid #2a3d35;overflow:hidden}
#precharge .barre i{display:block;height:100%;width:0;background:linear-gradient(90deg,#2f9e74,#37c48f);transition:width .2s}
#precharge .chiffres{display:flex;justify-content:space-between;color:#8fa89b;font-size:.85rem;margin:.45rem 0 1rem;font-variant-numeric:tabular-nums}
#precharge ul{list-style:none;margin:0 0 1.2rem;padding:0;font-size:.86rem;max-height:40vh;overflow:auto}
#precharge li{display:flex;justify-content:space-between;gap:1rem;padding:.22rem 0;border-bottom:1px solid #1d2c26;color:#b9c9c0}
#precharge li span:last-child{color:#8fa89b;font-variant-numeric:tabular-nums;white-space:nowrap}
#precharge li.pc-ok span:last-child{color:#37c48f}#precharge li.pc-err span:last-child{color:#e0a458}
#precharge button{background:transparent;color:#dfe9e3;border:1px solid #2a3d35;border-radius:8px;padding:.55rem 1rem;font:inherit;font-size:.9rem;cursor:pointer}
#precharge button:hover{border-color:#37c48f}#precharge button.go{background:#37c48f;color:#0d1613;border-color:#37c48f;font-weight:700}`;
    document.head.appendChild(s);
  }
  const mo = (n) => (n / 1048576).toFixed(n > 10485760 ? 0 : 1).replace('.', ',') + ' Mo';
  function maj() {
    if (!el) return;
    let r = 0, t = 0, f = 0;
    for (const it of LISTE) { r += it.recu; t += Math.max(it.total, it.recu); if (it.fini) f++; }
    const pc = LISTE.length ? Math.round(100 * (t ? (0.85 * r / t + 0.15 * f / LISTE.length) : f / LISTE.length)) : 100;
    el.querySelector('.barre i').style.width = pc + '%';
    const dt = (performance.now() - t0) / 1000, debit = r / Math.max(dt, 0.1);
    el.querySelector('.g').textContent = (f === LISTE.length ? 'Prêt' : pc + ' %') + ' · ' + mo(r) + (t ? ' / ' + mo(t) : '');
    el.querySelector('.d').textContent = f === LISTE.length ? '' : (debit > 1024 ? mo(debit) + '/s' : '');
    el.querySelector('ul').innerHTML = LISTE.map((it) => `<li class="${it.erreur ? 'pc-err' : it.fini ? 'pc-ok' : ''}"><span>${it.nom}</span><span>${it.erreur ? 'plus tard' : it.fini ? (it.cache ? 'déjà là' : '✓') : it.total ? Math.round(100 * it.recu / it.total) + ' %' : it.recu ? mo(it.recu) : '…'}</span></li>`).join('');
  }
  function entrer() {
    if (entre || !el) return; entre = true; el.classList.add('parti'); setTimeout(() => el && el.remove(), 500);
  }
  function ecran() {
    css(); el = document.createElement('div'); el.id = 'precharge'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Chargement');
    el.innerHTML = `<div class="boite"><h1>Préparation de la simulation</h1><p class="sous">Patients 3D, décor, mouvements et cas cliniques : chargés une fois, puis gardés par le navigateur.</p>
<div class="barre" role="progressbar" aria-label="Progression"><i></i></div><div class="chiffres"><span class="g">0 %</span><span class="d"></span></div><ul></ul>
<button type="button" class="pass">Entrer sans attendre</button></div>`;
    el.querySelector('.pass').onclick = entrer;
    document.body.appendChild(el); maj();
  }
  if (document.body) ecran(); else document.addEventListener('DOMContentLoaded', ecran);

  (async () => {
    let cache = null;
    try { if (window.caches) { cache = await caches.open(VERSION); for (const k of await caches.keys()) if (k.startsWith('rxtalk-essentiel-') && k !== VERSION) caches.delete(k); } } catch (e) { cache = null; }
    for (const it of LISTE) PRE.set(it.url, charger(it, cache));
    await Promise.all(PRE.values());
    maj(); setTimeout(entrer, LISTE.some((i) => i.erreur) ? 1200 : 350);
  })();
})();
