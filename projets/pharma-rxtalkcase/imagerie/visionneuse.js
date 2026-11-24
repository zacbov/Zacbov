/* Visionneuse d'imagerie des tumeurs (scanner, IRM) : coupes hébergées avec le site (planche JPEG par série) et contour
   de la tumeur en surimpression, masqué par défaut. Molette, curseur ou flèches : changer de coupe. Aucun service extérieur.
   Document de cas : { type: 'imagerie', titre, serie: 'poumon_adk-1', legende? }. */
(function () {
  const B = new URL('./', document.currentScript.src).href;
  let CAT = null;
  const catalogue = () => CAT || (CAT = fetch(B + 'tumeurs.json').then((r) => { if (!r.ok) throw new Error('tumeurs.json ' + r.status); return r.json(); })
    .then((j) => { const m = new Map(); j.series.forEach((s) => m.set(s.id, s)); return m; }).catch((e) => { CAT = null; throw e; }));
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function html(d, casId) {
    return '<div class="feuille vis-img"><div class="fh"><div><b>' + esc(d.titre || 'Imagerie') + '</b><br><small>' + esc(d.legende || '') + '</small></div><small>Dossier ' + esc(casId) + '</small></div>'
      + '<div class="vis-zone" style="position:relative;background:#000;border-radius:6px;overflow:hidden;touch-action:none;aspect-ratio:1/1;max-height:min(62vh,560px);margin:auto">'
      + '<canvas class="vis-c" width="768" height="768" style="width:100%;height:100%;display:block;cursor:ns-resize"></canvas>'
      + '<div class="vis-hg" style="position:absolute;top:6px;left:8px;color:#e8e8e8;font:12px/1.35 system-ui;text-shadow:0 0 3px #000;pointer-events:none"></div>'
      + '<div class="vis-bd" style="position:absolute;bottom:6px;right:8px;color:#e8e8e8;font:12px system-ui;text-shadow:0 0 3px #000;pointer-events:none"></div>'
      + '<div class="vis-ch" style="position:absolute;inset:0;display:grid;place-items:center;color:#aaa">Chargement des coupes…</div></div>'
      + '<div style="display:flex;gap:.5rem;align-items:center;flex-wrap:wrap;margin:.5rem 0 .2rem">'
      + '<button type="button" class="vis-moins" title="Coupe précédente">▲</button><input class="vis-r" type="range" min="0" max="0" value="0" style="flex:1;min-width:140px" aria-label="Coupe"><button type="button" class="vis-plus" title="Coupe suivante">▼</button>'
      + '<button type="button" class="vis-lesion" aria-pressed="false">Montrer la lésion</button></div>'
      + '<div class="pied vis-pied"></div></div>';
  }

  async function ouvrir(racine, d) {
    const el = (c) => racine.querySelector('.' + c), cv = el('vis-c'), g = cv.getContext('2d');
    let S;
    try { S = (await catalogue()).get(d.serie); if (!S) throw new Error('série inconnue : ' + d.serie); }
    catch (e) { el('vis-ch').textContent = 'Imagerie indisponible (' + e.message + ').'; return; }
    const img = new Image(); img.src = B + S.id + '.jpg';
    try { await img.decode(); } catch (e) { el('vis-ch').textContent = 'Images introuvables (imagerie/' + S.id + '.jpg).'; return; }
    el('vis-ch').remove();
    let k = 0, voir = false; const T = S.taille, N = S.n, ech = cv.width / T;
    el('vis-r').max = N - 1;
    el('vis-pied').innerHTML = esc(S.examen) + ' · ' + (S.mod === 'MR' ? 'IRM' : 'scanner') + ' d\'un autre patient (base publique), choisi pour illustrer le même type de tumeur : il ne reproduit ni les mesures ni le côté décrits dans le compte rendu.<br>'
      + esc(S.source);
    function dessiner() {
      g.fillStyle = '#000'; g.fillRect(0, 0, cv.width, cv.height);
      g.drawImage(img, (k % S.cols) * T, Math.floor(k / S.cols) * T, T, T, 0, 0, cv.width, cv.height);
      const t = S.tranches[k] || {};
      if (voir) {
        for (const [cls, col, tir] of [['oedeme', '#ffd23f', [6, 4]], ['tumeur', '#ff3b3b', []]]) {
          g.strokeStyle = col; g.lineWidth = 2.2; g.setLineDash(tir);
          for (const p of t[cls] || []) { g.beginPath(); p.forEach(([x, y], i) => (i ? g.lineTo(x * ech, y * ech) : g.moveTo(x * ech, y * ech))); g.closePath(); g.stroke(); }
        }
        g.setLineDash([]);
      }
      const cm = 10 / S.mm_px * ech, x0 = 14, y0 = cv.height - 16;      // barre d'échelle 1 cm
      g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + cm, y0); g.moveTo(x0, y0 - 6); g.lineTo(x0, y0 + 2); g.moveTo(x0 + cm, y0 - 6); g.lineTo(x0 + cm, y0 + 2); g.stroke();
      g.fillStyle = '#fff'; g.font = '20px system-ui'; g.fillText('1 cm', x0 + cm + 8, y0 + 6);
      el('vis-hg').innerHTML = esc(S.examen) + '<br>Coupe ' + (k + 1) + ' / ' + N + (S.epaisseur ? ' · ' + String(S.epaisseur).replace('.', ',') + ' mm' : '')
        + (voir && S.diam_mm && k === S.max ? '<br><span style="color:#ff6b6b">Plus grand diamètre ≈ ' + S.diam_mm + ' mm' + (S.contour_ia ? ' (contour automatique)' : '') + '</span>' : '');
      el('vis-bd').textContent = S.mod === 'MR' ? 'IRM' : 'TDM';
      el('vis-r').value = k;
    }
    const aller = (n) => { k = Math.max(0, Math.min(N - 1, n)); dessiner(); };
    cv.addEventListener('wheel', (e) => { e.preventDefault(); aller(k + Math.sign(e.deltaY)); }, { passive: false });
    let y0 = null; cv.addEventListener('pointerdown', (e) => { y0 = e.clientY; cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointermove', (e) => { if (y0 == null) return; const dy = e.clientY - y0; if (Math.abs(dy) > 8) { aller(k + Math.sign(dy)); y0 = e.clientY; } });
    cv.addEventListener('pointerup', () => { y0 = null; });
    cv.tabIndex = 0; cv.addEventListener('keydown', (e) => { if (/Arrow(Up|Left)/.test(e.key)) { aller(k - 1); e.preventDefault(); } if (/Arrow(Down|Right)/.test(e.key)) { aller(k + 1); e.preventDefault(); } });
    el('vis-r').oninput = () => aller(+el('vis-r').value);
    el('vis-moins').onclick = () => aller(k - 1); el('vis-plus').onclick = () => aller(k + 1);
    el('vis-lesion').onclick = (e) => { voir = !voir; e.target.setAttribute('aria-pressed', voir); e.target.textContent = voir ? 'Masquer la lésion' : 'Montrer la lésion'; if (voir) aller(S.max); else dessiner(); };
    aller(0);
  }
  window.Visionneuse = { html, ouvrir, catalogue };
})();
