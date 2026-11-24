/* Mode SCORM (notation dans Moodle ou toute plateforme SCORM 1.2 / 2004).
   La page est ouverte dans le paquet SCORM (scorm/index.html), qui seul parle à la plateforme ; ici on se contente :
   - de lire les réglages de la séance dans l'adresse : ?scorm=1&n=3&pop=officine&theme=…&seuil=10 ;
   - de régler et verrouiller parcours et thème ;
   - d'envoyer au paquet, à chaque débriefing, la note /20 donnée par l'évaluateur (postMessage).
   Sans ?scorm=1 dans l'adresse, rien ne change. */
(function () {
  const P = new URLSearchParams(location.search);
  if (P.get('scorm') !== '1' || window.parent === window) { window.scormResultat = null; return; }
  const parent = window.parent, cible = P.get('origine') || '*';           // origine du paquet SCORM (donnée par lui)
  const envoyer = (m) => parent.postMessage(Object.assign({ rxtalkcase: 1 }, m), cible);
  const debut = Date.now(); let tCas = Date.now(), nFaits = 0;
  const N = Math.max(1, Math.min(20, +P.get('n') || 3));

  function regler() {                                                       // parcours et thème imposés par la séance
    const pop = document.getElementById('pop'), th = document.getElementById('theme');
    if (!pop || !th || th.options.length < 2) return setTimeout(regler, 300);
    if (P.get('pop')) { pop.value = P.get('pop'); pop.dispatchEvent(new Event('change')); }
    setTimeout(() => {
      if (P.get('theme') && [...th.options].some((o) => o.value === P.get('theme'))) { th.value = P.get('theme'); th.dispatchEvent(new Event('change')); }
      if (P.get('pop')) pop.disabled = true; if (P.get('theme')) th.disabled = true;
      envoyer({ type: 'pret', n: N });
    }, 200);
  }
  regler();
  document.addEventListener('click', (e) => { if (e.target && e.target.id === 'new') tCas = Date.now(); }, true);

  /* appelé par la page à la fin de chaque débriefing */
  window.scormResultat = ({ cas, texte, points, obtenus, indices }) => {
    const m = /note\s*:?\s*\**\s*(\d+(?:[.,]\d+)?)\s*\/\s*20/i.exec(texte || '');
    const note = m ? Math.max(0, Math.min(20, parseFloat(m[1].replace(',', '.')))) : null;
    nFaits++;
    envoyer({ type: 'cas', id: cas.id, theme: cas.theme, pop: cas.pop || '', titre: (cas.apercu || '').slice(0, 120), note, sur: 20,
              points: points ? points.length : 0, obtenus: obtenus || 0, indices: indices || 0, duree: Math.round((Date.now() - tCas) / 1000), rang: nFaits });
  };
  window.addEventListener('message', (e) => {                              // le paquet peut demander où l'on en est
    if (e.source !== parent || !e.data || e.data.rxtalkcase !== 1) return;
    if (e.data.type === 'etat') envoyer({ type: 'etat', faits: nFaits, duree: Math.round((Date.now() - debut) / 1000) });
  });
})();
