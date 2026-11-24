/* Pont SCORM : ce paquet (hébergé par la plateforme) parle à l'API SCORM 1.2 ou 2004 et affiche l'outil en ligne dans
   un cadre. L'outil lui envoie chaque note /20 (postMessage, origine vérifiée). Score = moyenne des notes ramenée sur 100. */
(function () {
  const S = window.SEANCE, $ = (id) => document.getElementById(id);
  const ORIGINE = new URL(S.app).origin;
  /* ---------- API SCORM (recherche dans les fenêtres parentes puis l'ouvreur) ---------- */
  function chercher(w, nom) { for (let i = 0; w && i < 12; i++) { try { if (w[nom]) return w[nom]; } catch (e) {} if (w.parent === w) break; w = w.parent; } return null; }
  const api12 = chercher(window, 'API') || (window.opener && chercher(window.opener, 'API'));
  const api04 = !api12 && (chercher(window, 'API_1484_11') || (window.opener && chercher(window.opener, 'API_1484_11')));
  const V = api04 ? '2004' : api12 ? '1.2' : null;
  const A = {
    init: () => V === '2004' ? api04.Initialize('') : V ? api12.LMSInitialize('') : 'true',
    get: (k) => V === '2004' ? api04.GetValue(k) : V ? api12.LMSGetValue(k) : '',
    set: (k, v) => V === '2004' ? api04.SetValue(k, String(v)) : V ? api12.LMSSetValue(k, String(v)) : 'true',
    commit: () => V === '2004' ? api04.Commit('') : V ? api12.LMSCommit('') : 'true',
    fin: () => V === '2004' ? api04.Terminate('') : V ? api12.LMSFinish('') : 'true',
  };
  const t0 = Date.now(); let fini = false;
  A.init();
  const K = V === '2004'
    ? { statut: 'cmi.completion_status', raw: 'cmi.score.raw', min: 'cmi.score.min', max: 'cmi.score.max', susp: 'cmi.suspend_data', temps: 'cmi.session_time', inter: 'cmi.interactions.', exit: 'cmi.exit' }
    : { statut: 'cmi.core.lesson_status', raw: 'cmi.core.score.raw', min: 'cmi.core.score.min', max: 'cmi.core.score.max', susp: 'cmi.suspend_data', temps: 'cmi.core.session_time', inter: 'cmi.interactions.', exit: 'cmi.core.exit' };
  let R = []; try { R = JSON.parse(A.get(K.susp) || '[]'); } catch (e) { R = []; }          // [[id, note, durée s], …] (reprise)
  const duree = (s) => { const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, x = s % 60;
    return V === '2004' ? `PT${h}H${m}M${x}S` : `${String(h).padStart(4, '0')}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}`; };
  const moyenne = () => { const n = R.filter((r) => r[1] != null); return n.length ? n.reduce((a, r) => a + r[1], 0) / n.length : null; };

  function enregistrer(dernier) {
    const m = moyenne(), score = m == null ? 0 : Math.round(m * 5);
    A.set(K.min, 0); A.set(K.max, 100); A.set(K.raw, score);
    if (V === '2004') A.set('cmi.score.scaled', (score / 100).toFixed(2));
    const termine = R.length >= S.n;
    if (V === '2004') { A.set('cmi.completion_status', termine ? 'completed' : 'incomplete'); if (termine) A.set('cmi.success_status', m >= S.seuil ? 'passed' : 'failed'); }
    else A.set(K.statut, termine ? (m >= S.seuil ? 'passed' : 'failed') : 'incomplete');
    A.set(K.susp, JSON.stringify(R).slice(0, 4000));
    if (dernier) {                                                    // une interaction par cas noté
      const i = R.length - 1, p = K.inter + i + '.';
      A.set(p + 'id', ('cas_' + dernier.id).replace(/[^A-Za-z0-9_\-.]/g, '_'));
      A.set(p + 'type', V === '2004' ? 'other' : 'performance');
      if (dernier.note != null) A.set(p + 'result', dernier.note);
      if (V === '2004') { A.set(p + 'description', (dernier.titre || dernier.id).slice(0, 250)); A.set(p + 'timestamp', new Date().toISOString().slice(0, 19)); A.set(p + 'latency', duree(dernier.duree || 0)); }
      else A.set(p + 'latency', duree(dernier.duree || 0));
    }
    A.commit(); afficher();
    if (termine) terminer();
  }
  function afficher() {
    $('titre').textContent = S.titre;
    $('prog').innerHTML = Array.from({ length: S.n }, (_, i) => `<span class="pt ${R[i] ? (R[i][1] != null && R[i][1] >= S.seuil ? 'ok' : 'ko') : ''}" title="${R[i] ? 'Cas ' + R[i][0] + ' : ' + (R[i][1] ?? '—') + '/20' : 'Cas ' + (i + 1)}"></span>`).join('');
    const m = moyenne();
    $('etat').textContent = (V ? '' : 'Hors plateforme (aucune note enregistrée). ') + `Cas notés : ${Math.min(R.length, S.n)}/${S.n}` + (m != null ? ` · moyenne ${m.toFixed(1).replace('.', ',')}/20` : '') +
      (R.length < S.n ? ' · Terminez chaque cas par « Terminer et débriefer ».' : '');
  }
  function terminer() {
    if (fini) return; fini = true;
    const m = moyenne();
    $('app').style.display = 'none'; $('fin').style.display = 'block';
    $('fin').innerHTML = `<h2>Séance terminée</h2><p>Moyenne : <b>${m != null ? m.toFixed(1).replace('.', ',') : '—'}/20</b> (score transmis : ${m != null ? Math.round(m * 5) : 0}/100) — ${m >= S.seuil ? 'réussi' : 'non réussi'} (seuil ${S.seuil}/20).</p>
      <table><tr><th>Cas</th><th>Note</th><th>Durée</th></tr>${R.map((r) => `<tr><td>${r[0]}</td><td>${r[1] ?? '—'}/20</td><td>${(r[2] || 0) < 60 ? "< 1" : Math.round(r[2] / 60)} min</td></tr>`).join('')}</table>
      <p>Vous pouvez fermer cette fenêtre.</p>`;
    A.set(K.temps, duree(Math.round((Date.now() - t0) / 1000))); if (V === '2004') A.set(K.exit, 'normal'); A.commit(); A.fin();
  }
  /* ---------- messages de l'outil ---------- */
  window.addEventListener('message', (e) => {
    if (e.origin !== ORIGINE || !e.data || e.data.rxtalkcase !== 1 || fini) return;
    const d = e.data; pret = true;
    if (d.type === 'pret') { afficher(); return; }
    if (d.type === 'cas' && R.length < S.n) { R.push([d.id, d.note, d.duree || 0]); enregistrer(d); }
  });
  window.addEventListener('beforeunload', () => { if (fini) return; A.set(K.temps, duree(Math.round((Date.now() - t0) / 1000))); A.set(K.exit, 'suspend'); A.commit(); A.fin(); });
  /* ---------- lancement ---------- */
  const q = new URLSearchParams({ scorm: '1', n: S.n, origine: location.origin === 'null' ? '*' : location.origin });
  if (S.pop) q.set('pop', S.pop); if (S.theme) q.set('theme', S.theme);
  let pret = false;
  setTimeout(() => { if (!pret && !fini) $('etat').innerHTML = '<b style="color:#b00">L\'outil ne répond pas au mode SCORM</b> : la version en ligne (' + S.app.replace(/[<>&"]/g, '') + ') ne contient sans doute pas encore scorm.js. Mettez le site à jour, puis rouvrez l\'activité.'; }, 20000);
  afficher();
  if (R.length >= S.n) terminer(); else $('app').src = S.app + (S.app.includes('?') ? '&' : '?') + q;
})();
