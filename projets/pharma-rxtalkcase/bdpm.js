/* Base des médicaments (BDPM, ANSM, licence Etalab 2.0) dans le panneau Outils.
   - bdpm.json (construit par gen/bdpm_build.py) est chargé à la première ouverture, puis gardé en mémoire ;
   - recherche par nom, substance, code ATC ou CIS ; fiche : composition, présentations (taux, prix), groupe
     générique, SMR/ASMR, conditions de délivrance, tensions/ruptures ;
   - RCP et notice : demandés au worker (mode « rcp »), qui relaie medicaments-api et met en cache.
   Aucun lien externe ouvert : tout s'affiche dans le panneau. */
(function () {
  const S = {};          // { data, idx, parCis, parGroupe }
  let opts = {};
  const nrm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const CSS = `#bd{font-size:.92rem}#bd .bq{display:flex;gap:.4rem;align-items:center;flex-wrap:wrap}#bd .bq input[type=search]{flex:1;min-width:12rem}
#bd .bl{list-style:none;margin:.6rem 0 0;padding:0;max-height:56vh;overflow:auto}#bd .bl li{padding:.35rem .4rem;border-bottom:1px solid var(--trait);cursor:pointer}
#bd .bl li:hover,#bd .bl li:focus{background:rgba(127,127,127,.15);outline:none}#bd .bl small,#bd .dim{color:var(--doux)}
#bd .bf{max-height:62vh;overflow:auto}#bd h3{margin:.4rem 0}#bd h4{margin:.8rem 0 .3rem}#bd table{border-collapse:collapse;width:100%;margin:.3rem 0}
#bd td,#bd th{border:1px solid var(--trait);padding:.2rem .35rem;vertical-align:top;text-align:left}#bd .tag{display:inline-block;border:1px solid var(--trait);border-radius:999px;padding:0 .5rem;margin:0 .25rem .25rem 0;font-size:.82rem}
#bd .alerte{border-color:#d9822b;color:#d9822b}#bd button.lien{background:none;border:0;color:inherit;text-decoration:underline;cursor:pointer;padding:0;font:inherit}
#bd details{border:1px solid var(--trait);border-radius:6px;margin:.3rem 0;padding:.2rem .5rem}#bd summary{cursor:pointer;font-weight:600}#bd .rcp p{margin:.3rem 0}
#bd .pied{color:var(--doux);font-size:.8rem;margin-top:.6rem}#bd .barre{display:flex;gap:.4rem;flex-wrap:wrap;margin:.5rem 0}`;
  const F = { cis: 0, nom: 1, forme: 2, voies: 3, tit: 4, sa: 5, pr: 6, g: 7, smr: 8, asmr: 9, cpd: 10, dispo: 11, atc: 12, sr: 13, homeo: 14 };

  async function charger() {
    if (S.data) return S.data;
    const r = await fetch(opts.url || 'bdpm.json');
    if (!r.ok) throw new Error('bdpm.json : ' + r.status);
    const d = await r.json();
    S.parCis = new Map(); S.parGroupe = new Map();
    S.idx = d.m.map((m) => {
      S.parCis.set(m[F.cis], m);
      if (m[F.g]) { const k = m[F.g][0]; if (!S.parGroupe.has(k)) S.parGroupe.set(k, []); S.parGroupe.get(k).push(m); }
      return ' ' + nrm(m[F.nom] + ' ' + (m[F.sa] || []).map((s) => s[0]).join(' ') + ' ' + (m[F.atc] || '') + ' ' + m[F.cis]);
    });
    S.data = d; return d;
  }

  function chercher(q, homeo) {
    const mots = nrm(q).split(/[\s,;/+]+/).filter((w) => w.length > 1 || /\d/.test(w));
    if (!mots.length) return [];
    const res = [];
    for (let i = 0; i < S.idx.length; i++) {
      const m = S.data.m[i]; if (!homeo && m[F.homeo]) continue;
      const k = S.idx[i]; if (!mots.every((w) => k.includes(w))) continue;
      const n = nrm(m[F.nom]);
      res.push([n.startsWith(mots[0]) ? 0 : k.includes(' ' + mots[0]) ? 1 : 2, n, m]);
    }
    res.sort((a, b) => a[0] - b[0] || a[1].localeCompare(b[1]));
    return res.slice(0, 80).map((r) => r[2]);
  }

  const substances = (m) => (m[F.sa] || []).map((s) => s[0] + (s[1] ? ' ' + s[1] : '')).join(' + ');

  function liste(el, L, total) {
    el.innerHTML = L.length ? L.map((m) => `<li tabindex="0" data-cis="${m[F.cis]}">${esc(m[F.nom])}<br><small>${esc(substances(m))}${m[F.dispo] ? ' — <b>' + esc(m[F.dispo][0]) + '</b>' : ''}</small></li>`).join('')
      + (total > L.length ? `<li class="dim">… affinez la recherche</li>` : '') : '<li class="dim">Aucune spécialité commercialisée trouvée.</li>';
  }

  function fiche(m) {
    const d = S.data, g = m[F.g], pr = m[F.pr] || [];
    let h = `<div class="barre"><button type="button" class="lien" data-retour>← Résultats</button></div><h3>${esc(m[F.nom])}</h3>`;
    h += `<div>${m[F.sr] ? '<span class="tag alerte">Surveillance renforcée</span>' : ''}${m[F.dispo] ? `<span class="tag alerte">${esc(m[F.dispo][0])} depuis le ${esc(m[F.dispo][1])}</span>` : ''}${m[F.atc] ? `<span class="tag">ATC ${esc(m[F.atc])}</span>` : ''}<span class="tag">CIS ${esc(m[F.cis])}</span></div>`;
    h += `<table><tr><th>Forme</th><td>${esc(m[F.forme])}</td></tr><tr><th>Voie(s)</th><td>${esc(m[F.voies])}</td></tr><tr><th>Titulaire</th><td>${esc(m[F.tit])}</td></tr>`;
    h += `<tr><th>Composition</th><td>${(m[F.sa] || []).map((s) => esc(s[0]) + ' <b>' + esc(s[1]) + '</b>' + (s[2] ? ' <span class="dim">pour ' + esc(s[2]) + '</span>' : '')).join('<br>') || '—'}</td></tr>`;
    if (m[F.cpd]) h += `<tr><th>Délivrance</th><td>${m[F.cpd].map(esc).join('<br>')}</td></tr>`;
    h += '</table>';
    if (pr.length) h += `<h4>Présentations</h4><table><tr><th>Conditionnement</th><th>Remb.</th><th>Prix</th></tr>${pr.map((p) => `<tr><td>${esc(p[0])}<br><small class="dim">CIP ${esc(p[1])}</small></td><td>${esc(p[2] || 'NR')}</td><td>${p[3] != null ? p[3].toFixed(2).replace('.', ',') + ' €' : '—'}</td></tr>`).join('')}</table>`;
    if (g) {
      const L = (S.parGroupe.get(g[0]) || []).filter((x) => x !== m);
      h += `<h4>Groupe générique</h4><p>${esc(d.groupes[g[0]] || '')}<br><span class="dim">Cette spécialité : ${esc(d.types_generique[g[1]] || 'type ' + g[1])}</span></p>`;
      if (L.length) h += `<ul class="bl" style="max-height:12rem">${L.sort((a, b) => a[F.g][1] - b[F.g][1]).map((x) => `<li tabindex="0" data-cis="${x[F.cis]}">${esc(x[F.nom])} <small>(${esc(d.types_generique[x[F.g][1]] || '')})</small></li>`).join('')}</ul>`;
    }
    for (const [k, lib] of [[F.smr, 'SMR'], [F.asmr, 'ASMR']]) if (m[k]) h += `<h4>${lib} : ${esc(m[k][0])} <small class="dim">(avis HAS du ${esc(m[k][1])})</small></h4><p class="dim">${esc(m[k][2])}${m[k][2].length >= 259 ? '…' : ''}</p>`;
    h += `<h4>Documents de référence</h4><div class="barre"><button type="button" data-doc="rcp">Afficher le RCP</button><button type="button" data-doc="notice">Afficher la notice</button></div><div class="rcp" id="bdrcp" data-c="${m[F.cis]}"></div>`;
    h += `<p class="pied">Source : ${esc(d.source)}, extraction du ${esc(d.extraction)}. Outil pédagogique : vérifier sur la base officielle avant toute délivrance.</p>`;
    return h;
  }

  /* HTML du RCP : déjà assaini en amont, on repasse une liste blanche côté page (aucun lien, aucun attribut) */
  const OK = new Set(['P', 'BR', 'B', 'STRONG', 'I', 'EM', 'U', 'SUB', 'SUP', 'UL', 'OL', 'LI', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TD', 'TH', 'H4', 'H5', 'SPAN', 'DIV']);
  function propre(html) {
    const doc = new DOMParser().parseFromString('<div>' + html + '</div>', 'text/html');
    const net = (n) => {
      for (const c of [...n.childNodes]) {
        if (c.nodeType === 3) continue;
        if (c.nodeType !== 1) { c.remove(); continue; }
        if (/^(SCRIPT|STYLE|TEMPLATE|IFRAME|OBJECT|SVG|MATH)$/i.test(c.tagName)) { c.remove(); continue; }
        net(c);
        if (!OK.has(c.tagName)) { c.replaceWith(...c.childNodes); continue; }
        for (const a of [...c.attributes]) if (!/^(colspan|rowspan)$/i.test(a.name)) c.removeAttribute(a.name);
      }
    };
    const root = doc.body.firstChild; net(root); return root.innerHTML;
  }
  const PRIO = ['4.1', '4.2', '4.3', '4.4', '4.5', '4.6', '4.8', '4.9'];
  async function documentRef(cis, type, el) {
    el.innerHTML = '<p class="dim">Chargement…</p>';
    try {
      if (!opts.worker) throw new Error('worker non configuré');
      const r = await fetch(opts.worker, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-App-Secret': opts.secret || '' }, body: JSON.stringify({ mode: 'rcp', cis, type }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || r.status);
      const secs = j.sections || [];
      el.innerHTML = `<p class="dim">${type === 'rcp' ? 'RCP' : 'Notice'} mis à jour le ${esc(j.miseAJour || '?')} — ${esc(j.source || 'ANSM')}</p>` + secs.map((s) =>
        `<details${type === 'rcp' && PRIO.includes(s.id) && (s.id === '4.3' || s.id === '4.5') ? ' open' : ''}><summary>${esc(s.titre)}</summary>${propre(s.contenu || '')}</details>`).join('');
    } catch (e) { el.innerHTML = `<p class="dim">Document indisponible (${esc(e.message)}). Le RCP s'obtient via le worker, qui doit être redéployé avec le mode « rcp ».</p>`; }
  }

  async function ui(cont, o) {
    opts = Object.assign(opts, o || {});
    if (!document.getElementById('bdcss')) { const st = document.createElement('style'); st.id = 'bdcss'; st.textContent = CSS; document.head.appendChild(st); }
    cont.innerHTML = `<div id="bd"><div class="bq"><input type="search" id="bdq" placeholder="Nom, substance, ATC ou CIS (ex. : amoxicilline 500)" aria-label="Rechercher un médicament">
<label style="display:flex;gap:.25rem;align-items:center;margin:0"><input type="checkbox" id="bdh" style="width:auto"> homéopathie</label></div>
<div id="bdz"><ul class="bl" id="bdl"><li class="dim">Chargement de la base…</li></ul></div></div>`;
    cont.oninput = null;
    const q = cont.querySelector('#bdq'), zone = cont.querySelector('#bdz');
    let derniere = '';
    try { await charger(); } catch (e) { zone.innerHTML = `<p class="dim">Base indisponible : ${esc(e.message)}. Placez bdpm.json à côté de la page.</p>`; return; }
    const lancer = () => {
      derniere = q.value; const L = q.value.trim() ? chercher(q.value, cont.querySelector('#bdh').checked) : [];
      zone.innerHTML = '<ul class="bl" id="bdl"></ul>';
      if (!q.value.trim()) zone.firstChild.innerHTML = `<li class="dim">${S.data.m.length.toLocaleString('fr-FR')} spécialités commercialisées (extraction du ${esc(S.data.extraction)}).</li>`;
      else liste(zone.firstChild, L, L.length >= 80 ? 81 : L.length);
    };
    let t; q.oninput = () => { clearTimeout(t); t = setTimeout(lancer, 150); };
    cont.querySelector('#bdh').onchange = lancer;
    const ouvrir = (cis) => { const m = S.parCis.get(cis); if (!m) return; zone.innerHTML = '<div class="bf">' + fiche(m) + '</div>'; zone.scrollTop = 0; };
    zone.onclick = (e) => {
      const li = e.target.closest('[data-cis]'); if (li) return ouvrir(li.dataset.cis);
      if (e.target.closest('[data-retour]')) { q.value = derniere; return lancer(); }
      const b = e.target.closest('[data-doc]'); if (b) { const r = zone.querySelector('#bdrcp'); documentRef(r.dataset.c, b.dataset.doc, r); }
    };
    zone.onkeydown = (e) => { if (e.key === 'Enter') { const li = e.target.closest('[data-cis]'); if (li) ouvrir(li.dataset.cis); } };
    if (o && o.q) { q.value = o.q; } lancer(); q.focus();
  }
  window.BDPM = { ui, charger, chercher: (q) => (S.data ? chercher(q, false) : []), _S: S };
})();
