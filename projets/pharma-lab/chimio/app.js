/* TP « Préparation des chimiothérapies » : habillage au miroir, validation d'ordonnance, préparation sous PSM, bilan.
   Tout est calculé dans la page (aucun serveur, aucune IA). */
import { creerRendu } from './scene3d.js';
import { creerHabillage } from './habillage.js';
import { creerPSM } from './psm.js';
import { HABILLAGE, MOLECULES, SOLVANTS, CAS, MOTIFS, GESTES, PHASES } from './donnees.js';
import { ficheHTML, ficheTexture, ficheDonnees } from './fiche.js';
import { solution, proche, r, texteOrdonnance } from './calculs.js';

const $ = (id) => document.getElementById(id);
const fr = (x, n = 1) => (Math.round(x * 10 ** n) / 10 ** n).toLocaleString('fr-FR');
const melange = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const echap = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const R = creerRendu($('scene'));
let HAB = null, PSM = null, occupe = false;
const etat = {
  hab: { faits: [], erreurs: [], zone: 'vestiaire', fini: false, ordre: [] },
  ord: { cas: null, sol: null, saisie: null, valide: false, erreurs: [] },
  psm: { faits: [], erreurs: [], fini: false, ordre: {}, phase: 'A' },
};

/* ---------------- annonces et journal ---------------- */
let tAnn = null;
function annonce(txt, type = '') {
  const a = $('annonce'); a.className = 'annonce ' + type; a.innerHTML = txt; a.hidden = false;
  clearTimeout(tAnn); tAnn = setTimeout(() => { a.hidden = true; }, type === 'erreur' ? 6500 : 3500);
}
function journal(id, txt, ko, detail) {
  const li = document.createElement('li'); if (ko) li.className = 'ko';
  li.innerHTML = echap(txt) + (detail ? '<small>' + detail + '</small>' : ''); $(id).appendChild(li); li.scrollIntoView({ block: 'nearest' });
}

/* ---------------- onglets ---------------- */
function onglet(nom) {
  document.querySelectorAll('.onglets button').forEach((b) => b.classList.toggle('actif', b.dataset.ong === nom));
  document.querySelectorAll('.volet').forEach((v) => v.classList.toggle('actif', v.dataset.volet === nom));
  $('scene').classList.toggle('miroir', nom === 'habillage');
  $('pivoter').hidden = nom !== 'habillage';
  if (nom === 'habillage' && HAB) { R.activer(HAB.vue); majZone(); }
  if (nom === 'psm' || nom === 'ordonnance') ouvrirPSM().then(() => { if (document.querySelector('.onglets .actif').dataset.ong !== 'habillage') R.activer(PSM.vue); });
  if (nom === 'psm' || nom === 'ordonnance') { $('zoneEtiquette').className = 'zone zac'; $('zoneEtiquette').innerHTML = '<span class="zone-nom">ZAC · poste de préparation</span><span class="zone-sous">PSM classe II · flux d’air laminaire vertical</span>'; }
  if (nom === 'psm') rendrePSM();
  if (nom === 'bilan') rendreBilan();
}
document.querySelectorAll('.onglets button').forEach((b) => b.addEventListener('click', () => onglet(b.dataset.ong)));
async function ouvrirPSM() {
  if (PSM) return PSM;
  $('chargement').hidden = false; $('chargement').querySelector('p').textContent = 'Chargement du poste de sécurité microbiologique…';
  PSM = await creerPSM(R); $('chargement').hidden = true; window.__labo && (window.__labo.PSM = PSM); if (etat.ord.valide && etat.ord.sol.verdict === 'conforme' && !etat.psm.cfg) nouvellePrep(); return PSM;
}

/* ================= 1. HABILLAGE ================= */
const ACTIONS = HABILLAGE.actions;
const CANON = ACTIONS.filter((a) => !a.piege).map((a) => a.id);
const ICONE = (n) => new URL('./icones/' + n + '.png', import.meta.url).href;
function majZone() {
  const z = HABILLAGE.zones.find((x) => x.id === etat.hab.zone);
  $('zoneEtiquette').className = 'zone ' + z.id;
  $('zoneEtiquette').innerHTML = `<span class="zone-nom">${z.nom}</span><span class="zone-sous">${z.sous}</span>`;
}
function rendreChariot() {
  const c = $('chariot'); c.innerHTML = '';
  if (!etat.hab.ordre.length) etat.hab.ordre = melange(ACTIONS.map((a) => a.id));
  const sugg = $('guide').checked ? CANON.find((id) => !etat.hab.faits.includes(id)) : null;
  for (const id of etat.hab.ordre) {
    const a = ACTIONS.find((x) => x.id === id); const fait = etat.hab.faits.includes(id) || (a.piege && etat.hab.erreurs.some((e) => e.id === id));
    const b = document.createElement('button'); b.className = 'carte' + (fait ? ' fait' : '') + (sugg === id ? ' suggere' : '') + (a.icone ? ' avec-icone' : ''); b.dataset.cat = a.cat; b.dataset.id = a.id; b.disabled = fait || etat.hab.fini;
    b.innerHTML = (a.icone ? `<img src="${ICONE(a.icone)}" alt="">` : '') + `<span class="cat">${a.cat}</span><span class="nom">${echap(a.nom)}</span>`;
    b.addEventListener('click', () => faireHab(a)); c.appendChild(b);
  }
}

/* mini-jeux : une fenêtre générique construite à la volée */
const jeuDlg = (() => { const d = document.createElement('dialog'); d.id = 'jeu'; d.className = 'fenetre large jeu'; document.body.appendChild(d); return d; })();
function jeu(titre, icone, corps, init) {
  return new Promise((fin) => {
    jeuDlg.innerHTML = `<div class="jeu-tete">${icone ? `<img src="${ICONE(icone)}" alt="">` : ''}<h3>${titre}</h3></div><div class="jeu-corps">${corps}</div>`;
    jeuDlg.oncancel = (e) => e.preventDefault();
    jeuDlg.showModal(); init(jeuDlg, (res) => { jeuDlg.close(); fin(res); });
  });
}
async function jeuLavage() {
  const L = HABILLAGE.lavage; const ordre = L.etapes.map((x) => x[0]); const err = []; let i = 0, secondes = 0;
  const boutons = melange(L.etapes);
  const corps = `<p>Cliquez les gestes dans l’ordre. Chaque zone frottée compte ${L.friction} s ; le lavage dure au moins ${L.mini} s.</p>
    <div class="chrono"><span id="lavT">0</span> s<i><b id="lavB"></b></i></div>
    <div class="jeu-grille">${boutons.map(([k, t]) => `<button type="button" data-k="${k}">${t}</button>`).join('')}</div>
    <div id="lavRinc" hidden><p><b>Rinçage</b> : comment tenez-vous les mains ?</p><div class="jeu-choix">${melange(L.rincage).map(([k, t]) => `<button type="button" data-r="${k}">${t}</button>`).join('')}</div></div>
    <p class="jeu-retour" id="lavMsg"></p>`;
  HAB.tenir('frotter');
  const res = await jeu('Lavage des mains', 'lavage', corps, (d, ok) => {
    d.querySelectorAll('[data-k]').forEach((b) => b.onclick = () => {
      const k = b.dataset.k; const attendu = ordre[i];
      if (k === 'rincer' && secondes < L.mini && i >= 2) { err.push(`Rinçage après ${secondes} s de lavage : il faut au moins ${L.mini} s (paumes, dos, espaces interdigitaux, ongles, pouces, poignets).`); }
      if (k !== attendu) {
        const t = L.etapes.find((x) => x[0] === attendu)[1].toLowerCase();
        d.querySelector('#lavMsg').textContent = `Pas encore : d’abord « ${t} ».`; d.querySelector('#lavMsg').className = 'jeu-retour ko';
        if (!err.some((e) => e.startsWith('Ordre'))) err.push(`Ordre du lavage : « ${L.etapes.find((x) => x[0] === k)[1].toLowerCase()} » avant « ${t} ». L’ordre attendu : mouiller, savon, paumes, dos, espaces interdigitaux, ongles, pouces, poignets, rinçage.`);
        return;
      }
      b.disabled = true; b.classList.add('fait'); i++; d.querySelector('#lavMsg').textContent = ''; 
      if (!['mouiller', 'savon', 'rincer'].includes(k)) { secondes += L.friction; d.querySelector('#lavT').textContent = secondes; d.querySelector('#lavB').style.width = Math.min(100, 100 * secondes / L.mini) + '%'; }
      if (k === 'rincer') { HAB.tenir('haut'); d.querySelector('#lavRinc').hidden = false; d.querySelectorAll('[data-k]').forEach((x) => { x.disabled = true; }); }
    });
    d.querySelectorAll('[data-r]').forEach((b) => b.onclick = () => {
      const bon = L.rincage.find((x) => x[0] === b.dataset.r)[2];
      if (!bon) { err.push('Rinçage : les mains restent au-dessus des coudes, l’eau coule des doigts vers les avant-bras (jamais l’inverse).'); HAB.tenir('repos'); }
      ok(err);
    });
  });
  HAB.tenir('repos'); return res;
}
async function jeuSechage() {
  const corps = `<p>Les champs stériles sont dans l’emballage de la blouse. Comment séchez-vous les mains ?</p>
    <div class="jeu-choix">${melange(HABILLAGE.sechage).map(([k, t]) => `<button type="button" data-s="${k}">${t}</button>`).join('')}</div>`;
  return jeu('Séchage des mains', null, corps, (d, ok) => {
    d.querySelectorAll('[data-s]').forEach((b) => b.onclick = () => {
      const x = HABILLAGE.sechage.find((y) => y[0] === b.dataset.s);
      ok(x[2] ? [] : ['Séchage : un champ stérile différent pour chaque main, par tamponnement, en allant des mains vers les coudes.']);
    });
  });
}
async function jeuGants() {
  const G = HABILLAGE.gants; const err = []; let n = 1;
  const corps = `<p>Remettez les gestes dans l’ordre. La face stérile d’un gant ne touche que la face stérile de l’autre.</p>
    <div class="jeu-choix">${melange(G).map(([k, t]) => `<button type="button" data-g="${k}">${t}</button>`).join('')}</div><p class="jeu-retour" id="gMsg"></p>`;
  HAB.tenir('devant');
  const res = await jeu('Gants stériles', 'gants', corps, (d, ok) => {
    d.querySelectorAll('[data-g]').forEach((b) => b.onclick = () => {
      const x = G.find((y) => y[0] === b.dataset.g);
      if (x[2] === 0) { err.push('Gants : la main nue ne touche jamais la face externe (stérile) d’un gant.'); b.disabled = true; b.classList.add('ko'); d.querySelector('#gMsg').textContent = 'Non : la main nue touche la face stérile.'; d.querySelector('#gMsg').className = 'jeu-retour ko'; return; }
      if (x[2] !== n) { if (!err.some((e) => e.startsWith('Ordre'))) err.push('Ordre des gants : premier gant par le revers (face interne), puis doigts gantés sous le revers du second, puis revers déroulés sur les poignets de la blouse.'); d.querySelector('#gMsg').textContent = 'Pas dans cet ordre.'; d.querySelector('#gMsg').className = 'jeu-retour ko'; return; }
      b.disabled = true; b.classList.add('fait'); n++; d.querySelector('#gMsg').textContent = '';
      if (n > 3) ok(err);
    });
  });
  HAB.tenir('repos'); return res;
}

async function faireHab(a) {
  if (occupe || etat.hab.fini) return; occupe = true; document.querySelectorAll('#chariot .carte').forEach((b) => { b.disabled = true; });
  const h = etat.hab, err = [];
  try {
    if (a.piege) err.push(a.pourquoi);
    else {
      if (a.zone !== h.zone) { const z = HABILLAGE.zones.find((x) => x.id === a.zone); err.push(`Ce geste se fait dans la zone « ${z.nom} ».`); }
      const manque = (a.avant || []).filter((x) => !h.faits.includes(x));
      if (manque.length) err.push('Pas encore fait : ' + manque.map((x) => ACTIONS.find((y) => y.id === x).nom.toLowerCase()).join(', ') + '. ' + a.pourquoi);
      if (['casaque', 'gants', 'banc'].includes(a.id) && h.retouche) err.push('La charlotte a été touchée après la friction : il fallait refaire la friction hydroalcoolique.');
    }
    // mini-jeux
    if (a.jeu === 'lavage') err.push(...await jeuLavage());
    if (a.jeu === 'sechage') err.push(...await jeuSechage());
    if (a.jeu === 'gants') err.push(...await jeuGants());
    if (a.id === 'ajuster' && h.faits.includes('sha')) h.retouche = true;
    if (a.id === 'sha') h.retouche = false;
    if (!a.piege) h.faits.push(a.id);
    const ko = err.length > 0; if (ko) h.erreurs.push({ id: a.id, nom: a.nom, txt: err.join(' ') });
    journal('journalHab', a.nom, ko, ko ? echap(err.join(' ')) : '');
    if (ko) annonce('<b>À revoir.</b> ' + echap(err[0]), 'erreur');
    // effets visibles
    const gestes = [];
    if (a.geste) gestes.push(HAB.geste(a.geste, a.duree || 1.4));
    if (a.id === 'pyjama') await HAB.pyjama();
    else if (a.id === 'cheveux') { await R.attendre(0.6); await Promise.all([HAB.montrer('CheveuxLibres', false), HAB.montrer('CheveuxAttaches', !HAB.visible('Charlotte'))]); }
    else if (a.id === 'epi') HAB.epi(true);
    else if (a.id === 'charlotte') { HAB.prendre('charlotte'); await R.attendre(0.5); await HAB.montrer('Charlotte', true); if (h.faits.includes('cheveux')) await HAB.montrer('CheveuxAttaches', false); else annonce('Des mèches dépassent de la charlotte : les cheveux n’étaient pas attachés.', 'erreur'); }
    else if (a.id === 'masque') { HAB.prendre('masque'); await R.attendre(0.5); await HAB.montrer('Masque', true); }
    else if (a.id === 'sachets') { await HAB.ouvrirSachet('casaque'); await HAB.ouvrirSachet('gants'); }
    else if (a.id === 'banc') await HAB.passerBanc();
    else if (a.id === 'casaque') { HAB.prendre('casaque'); await R.attendre(0.5); await HAB.montrer('Casaque', true); HAB.montrer('Tunique', false); }
    else if (a.id === 'gants') { HAB.prendre('gants'); await HAB.montrer('Gants', true); }
    else if (a.retire) await HAB.montrer(a.piece, false);
    else if (a.piece) { await R.attendre(a.geste ? 0.5 : 0); await HAB.montrer(a.piece, true); }
    await Promise.all(gestes);
    if (a.passe && a.id !== 'banc') { HAB.zone(a.passe); }
    if (a.passe) { h.zone = a.passe; majZone(); }
    if (a.id === 'entrer') { h.fini = true; finHab(); }
  } finally { occupe = false; rendreChariot(); }
}
function finHab() {
  const n = etat.hab.erreurs.length;
  annonce(n ? `Entrée en zone classe C avec <b>${n}</b> erreur${n > 1 ? 's' : ''}. Le détail est dans le bilan.` : '<b>Habillage sans faute.</b> Vous pouvez préparer.', n ? 'erreur' : 'bien');
  journal('journalHab', n ? `Habillage terminé — ${n} erreur${n > 1 ? 's' : ''}` : 'Habillage terminé sans erreur', false);
}
$('guide').addEventListener('change', () => { rendreChariot(); rendrePSM(); });
$('pivoter').addEventListener('click', () => HAB && HAB.pivoter());
$('recommencer').addEventListener('click', () => {
  const o = document.querySelector('.onglets .actif').dataset.ong;
  if (o === 'habillage' && HAB) { etat.hab = { faits: [], erreurs: [], zone: 'vestiaire', fini: false, ordre: [] }; HAB.reset(); $('journalHab').innerHTML = ''; majZone(); rendreChariot(); }
  if (o === 'psm' && PSM) { nouvellePrep(); }
  if (o === 'ordonnance') { choisirCas(etat.ord.cas ? etat.ord.cas.id : CAS[0].id); }
});

/* ================= 2. ORDONNANCE ================= */
function remplirChoix() {
  $('choixCas').innerHTML = CAS.map((c) => `<option value="${c.id}">${c.id} · ${echap(c.protocole)}</option>`).join('');
  $('c_verdict').innerHTML = '<option value="">—</option>' + Object.entries(MOTIFS).map(([k, t]) => `<option value="${k}">${echap(t)}</option>`).join('');
}
function choisirCas(id) {
  const c = CAS.find((x) => x.id === id); etat.ord = { cas: c, sol: solution(c), saisie: null, valide: false, erreurs: [] };
  $('choixCas').value = id; const t = texteOrdonnance(c); const m = t.m;
  const bio = [`PNN : ${fr(c.bio.pnn)} G/l`, `Plaquettes : ${c.bio.plaq} G/l`].concat(c.bio.bili ? [`Bilirubine : ${fr(c.bio.bili)} × LSN`] : []);
  $('ordonnance').innerHTML = `<h4>${echap(c.protocole)}</h4><div class="meta">Ordonnance ${c.id} · ${echap(c.contexte)}</div>
    <table><tr><td>Patient${c.sexe === 'F' ? 'e' : ''}</td><td>${c.sexe === 'F' ? 'Femme' : 'Homme'}, ${c.age} ans</td></tr>
    <tr><td>Taille · poids</td><td>${c.taille} cm · ${c.poids} kg</td></tr>
    <tr><td>Créatinine</td><td>${c.creat} µmol/l</td></tr>
    <tr><td>Bilan du jour</td><td>${bio.join(' · ')}</td></tr>
    <tr><td>Flacon disponible</td><td>${m.nom} ${fr(m.conc)} mg/ml</td></tr></table>
    <div class="rx"><b>${m.nom}</b> ${echap(t.dose)} — dans ${t.poche} de ${t.solvant.toLowerCase()} — perfusion de ${m.duree}</div>`;
  for (const id of ['c_sc', 'c_cl', 'c_dose', 'c_vol', 'c_solv', 'c_poche', 'c_verdict']) { $(id).value = ''; $(id).className = ''; }
  $('retourOrd').innerHTML = '';
}
$('choixCas').addEventListener('change', (e) => choisirCas(e.target.value));
$('casHasard').addEventListener('click', () => choisirCas(CAS[Math.floor(Math.random() * CAS.length)].id));
const nombre = (id) => parseFloat(String($(id).value).replace(',', '.'));
$('calculs').addEventListener('submit', (e) => {
  e.preventDefault(); const c = etat.ord.cas, s = etat.ord.sol, m = s.m;
  const sc = nombre('c_sc'), cl = nombre('c_cl'), dose = nombre('c_dose'), vol = nombre('c_vol'), solv = $('c_solv').value, poche = +$('c_poche').value, verd = $('c_verdict').value;
  const concE = dose / (poche + vol);
  const res = {
    c_sc: proche(sc, s.sc, 0.02), c_cl: proche(cl, s.cl, 0.03), c_dose: proche(dose, s.dose, 0.03), c_vol: proche(vol, s.vol, 0.03),
    c_solv: m.solvants.includes(solv), c_poche: !!poche && s.dose / (poche + s.vol) <= m.cmax + 1e-9 && s.dose / (poche + s.vol) >= m.cmin - 1e-9,
    c_verdict: verd === s.verdict,
  };
  for (const [k, ok] of Object.entries(res)) $(k).className = ok ? 'ok' : 'ko';
  const errs = Object.entries(res).filter(([, ok]) => !ok).map(([k]) => k);
  etat.ord.saisie = { sc, cl, dose, vol, solv, poche, verd }; etat.ord.erreurs = errs; etat.ord.valide = true;
  const k = c.sexe === 'F' ? 1.04 : 1.23;
  const lignes = [
    `<b>Surface corporelle</b> (Mosteller) = √(${c.taille} × ${c.poids} / 3600) = <code>${fr(s.sc, 2)} m²</code>`,
    `<b>Clairance</b> (Cockcroft-Gault) = (140 − ${c.age}) × ${c.poids} × ${k} / ${c.creat} = <code>${fr(s.cl)} ml/min</code>`,
    m.calvert ? `<b>Dose</b> (Calvert) = ASC × (DFG + 25) = ${c.asc} × (${fr(Math.min(s.cl, 125))} + 25) = <code>${fr(s.dose)} mg</code>`
      : `<b>Dose</b> = ${c.dose_m2} mg/m² × ${fr(s.sc, 2)} m² = <code>${fr(s.dose)} mg</code>`,
    `<b>Volume</b> = ${fr(s.dose)} mg ÷ ${fr(m.conc)} mg/ml = <code>${fr(s.vol)} ml</code>`,
    `<b>Solvant</b> : ${m.solvants.map((x) => SOLVANTS[x].toLowerCase()).join(' ou ')}. <b>Concentration finale</b> dans ${s.poche} ml ≈ <code>${fr(s.conc, 2)} mg/ml</code>` + (m.cmax < 50 ? ` (bornes du RCP : ${m.cmin ? fr(m.cmin, 2) + ' à ' : '≤ '}${fr(m.cmax, 2)} mg/ml)` : ''),
    `<b>Seuils</b> : ` + Object.entries(m.seuils || {}).map(([k2, v2]) => ({ pnn: `PNN ≥ ${fr(v2)} G/l`, plaq: `plaquettes ≥ ${v2} G/l`, clcr: `clairance ≥ ${v2} ml/min`, bili: `bilirubine ≤ ${v2} × LSN` }[k2])).join(', ') + '.',
    `<b>À retenir</b> : ${echap(m.notes)}`,
  ];
  const decision = s.verdict === 'conforme' ? 'Ordonnance conforme : la préparation peut être lancée.' : MOTIFS[s.verdict] + '.';
  $('retourOrd').innerHTML = `<div class="encart ${errs.length ? 'ko' : 'ok'}"><b>${errs.length ? errs.length + ' point' + (errs.length > 1 ? 's' : '') + ' à revoir' : 'Tout est juste.'}</b> ${decision}</div>
    <div class="encart">${lignes.map((l) => '<p>' + l + '</p>').join('')}<p class="sources">Source : <a href="${m.source[1]}" target="_blank" rel="noopener">${echap(m.source[0])}</a></p></div>` +
    (s.verdict === 'conforme' ? ficheHTML(ficheDonnees(etat.ord, cfgPrep())) + '<button class="principal" id="versPSM">Passer à la préparation sous PSM →</button>' : '<button class="principal" id="casSuivant">Ordonnance suivante →</button>');
  if ($('versPSM')) $('versPSM').onclick = () => { nouvellePrep(); onglet('psm'); };
  if ($('casSuivant')) $('casSuivant').onclick = () => { const i = CAS.indexOf(c); choisirCas(CAS[(i + 1) % CAS.length].id); };
});

/* ================= 3. PSM ================= */
const SERINGUES = [5, 10, 20, 30, 50, 60];
const LIQ = { oxaliplatine: '#d9ecf8', carboplatine: '#d9ecf8', cisplatine: '#f1ecc4', paclitaxel: '#efe9cf', docetaxel: '#efe1a0', gemcitabine: '#d9ecf8', irinotecan: '#efdc8c' };
const CAPS = { oxaliplatine: 0x7a3fb0, carboplatine: 0x1f8a70, cisplatine: 0xd97706, paclitaxel: 0x2f6fd6, docetaxel: 0x6b7280, gemcitabine: 0xb91c1c, irinotecan: 0x0e7490 };
function cfgPrep() {
  const o = etat.ord, s = o.sol, m = s.m, cle = Object.keys(MOLECULES).find((k) => MOLECULES[k] === m);
  const vols = m.flacons.map((mg) => mg / m.conc).sort((x, y) => x - y); const fv = vols.find((x) => x >= s.vol * 1.05) || vols[vols.length - 1];
  const solv = o.saisie && m.solvants.includes(o.saisie.solv) ? o.saisie.solv : m.solvants[0];
  return { nom: m.nom, cle, vol: Math.round(s.vol * 10) / 10, dose: s.dose, flaconVol: Math.max(fv, s.vol * 1.05), poche: (o.saisie && o.saisie.poche) || s.poche, solvant: SOLVANTS[solv], solvCode: solv,
    couleur: LIQ[cle] || '#d9ecf8', capsule: CAPS[cle] || 0x2f6fd6, ser: SERINGUES.find((x) => x >= s.vol) || 60, lumiere: m.lumiere };
}
function nouvellePrep() {
  etat.psm = { faits: [], erreurs: [], fini: false, ordre: {}, phase: 'A' };
  $('journalPsm').innerHTML = '';
  if (PSM && etat.ord.valide && etat.ord.sol.verdict === 'conforme') { const c = cfgPrep(); c.ser = 60; PSM.preparer(c); etat.psm.cfg = c; }
  rendrePSM();
}
/* ---------- panneau de manipulation posé sur la scène ---------- */
const hudEl = (() => { const d = document.createElement('div'); d.className = 'hud'; d.hidden = true; $('scene').appendChild(d); return d; })();
function hud({ titre, texte, valeur = '', boutons = [] }) {
  hudEl.hidden = false;
  hudEl.innerHTML = `<div class="hud-tete"><b>${titre}</b><span class="hud-val">${valeur}</span></div><p>${texte}</p><div class="hud-btns"></div>`;
  const zb = hudEl.querySelector('.hud-btns');
  const H = {
    texte: (t) => { hudEl.querySelector('p').innerHTML = t; },
    valeur: (t) => { hudEl.querySelector('.hud-val').innerHTML = t; },
    boutons: (liste) => { zb.innerHTML = ''; for (const b of liste) { const x = document.createElement('button'); x.type = 'button'; x.textContent = b.t; x.className = b.cls || ''; if (b.id) x.dataset.id = b.id; x.onclick = b.f; if (b.off) x.disabled = true; zb.appendChild(x); } },
    btn: (id) => zb.querySelector(`[data-id="${id}"]`),
    fermer: () => { hudEl.hidden = true; hudEl.innerHTML = ''; },
  };
  H.boutons(boutons); return H;
}
const attendreClic = () => new Promise((ok) => { hudEl.__ok = ok; });

/* ---------- manipulations ---------- */
async function jeuPeler(liste, err) {
  const M = PSM.M; const reste = new Set(liste);
  await PSM.regarder('table', 0.7);
  const H = hud({ titre: 'Peler les emballages', texte: `Cliquez chaque sachet : il est ouvert à l’arrière de la veine de garde, son contenu entre dans le PSM, l’emballage part à la poubelle jaune. (${[...reste].length} à ouvrir)` });
  await new Promise((fin) => {
    let occ = false;
    const off = PSM.cliquer(liste.map((k) => M.emb[k]), async (o) => {
      if (occ) return; const k = liste.find((x) => M.emb[x] === o); if (!reste.has(k)) return; occ = true; reste.delete(k);
      await PSM.ACT.peler(k); occ = false; H.texte(reste.size ? `Encore ${reste.size} sachet${reste.size > 1 ? 's' : ''} à ouvrir.` : 'Tout est ouvert.');
      if (!reste.size) { off(); fin(); }
    });
  });
  H.fermer(); await PSM.regarder('champ', 0.7);
}
async function choisirSeringue(err) {
  const c = etat.psm.cfg; const bon = SERINGUES.find((x) => x >= c.vol) || 60;
  const H = hud({ titre: 'Seringue', texte: `Volume à prélever (fiche) : <b>${fr(c.vol)} ml</b>. Quelle seringue prenez-vous ?` });
  const cap = await new Promise((ok) => H.boutons(SERINGUES.map((x) => ({ t: x + ' ml', f: () => ok(x) }))));
  H.fermer();
  if (cap < c.vol) err.push(`Seringue de ${cap} ml trop petite pour ${fr(c.vol)} ml : deux prélèvements augmentent le risque d’erreur et d’exposition.`);
  else if (cap !== bon) err.push(`Seringue de ${cap} ml : on prend la plus petite qui contient le volume (${bon} ml), la graduation y est plus précise.`);
  const capOk = cap < c.vol ? bon : cap; c.ser = capOk; PSM.remplacerSeringue(capOk); etat.psm.ser = cap;
}
async function jeuOrienter(err) {
  const H = hud({ titre: 'Seringue sur le champ', texte: 'Dans quel sens posez-vous la seringue ?' });
  const fond = await new Promise((ok) => H.boutons([{ t: 'Embout vers le fond du PSM', f: () => ok(true) }, { t: 'Embout vers moi', f: () => ok(false) }]));
  H.fermer(); if (!fond) err.push('La seringue se pose embout vers le fond : l’embout reste dans l’air filtré, loin des mains et de l’ouverture.');
  await PSM.ACT.orienter(true);
}
async function jeuTubulure(err) {
  const M = PSM.M; await PSM.regarder('poche', 0.7);
  const H = hud({ titre: 'Tubulure', texte: 'Cliquez le site de la poche dans lequel vous enfoncez le perforateur de la tubulure.' });
  const o = await new Promise((ok) => { const off = PSM.cliquer([M.P.bleu, M.P.blanc], (x) => { off(); ok(x); }); });
  if (o === M.P.blanc) err.push('Le perforateur va dans le site bleu (site de perfusion) ; le site blanc sert aux injections.');
  H.texte('Perforateur en place. Purgez la tubulure avec le solvant.'); H.boutons([]);
  await PSM.ACT.tubulure();
  await new Promise((ok) => H.boutons([{ t: 'Purger avec le solvant', cls: 'principal', f: ok }])); H.boutons([]);
  await PSM.ACT.purger(); H.fermer();
}
async function jeuVisser(err) {
  const H = hud({ titre: 'Luer lock', texte: 'Vissez la seringue sur l’aiguille sécurisée : trois quarts de tour.' , valeur: '0/3' });
  for (let i = 0; i < 3; i++) { await new Promise((ok) => H.boutons([{ t: 'Visser ↻', cls: 'principal', f: ok }])); H.boutons([]); await PSM.ACT.visser(i); H.valeur(`${i + 1}/3`); }
  H.fermer();
}
/* piston : glisser sur la scène le long de la seringue (ou boutons fins) */
function piston(H, regle) {
  const M = PSM.M, S = M.S; let t0 = performance.now();
  const appliquer = (dv, bouton = false) => { const t = performance.now(), dt = Math.max(0.016, (t - t0) / 1000); t0 = t; regle(dv, bouton ? 0 : Math.abs(dv) / dt); S.liq = Math.max(0, Math.min(S.G, S.liq)); S.air = Math.max(0, S.air); H.valeur(`<b>${fr(S.liq, 1)}</b> ml${S.air > 0.005 ? ` · air ${fr(S.air, 2)} ml` : ''}`); };
  const off = PSM.glisser(PSM.axeSeringue, PSM.centreSeringue, (d) => appliquer(d * PSM.mlParMetre()));
  return { off, appliquer };
}
const fins = (P, pas) => pas.flatMap((p) => [{ t: '+' + String(p).replace('.', ','), f: () => P.appliquer(p, true) }, { t: '−' + String(p).replace('.', ','), cls: 'moins', f: () => P.appliquer(-p, true) }]);
async function jeuPrelever(err) {
  const c = etat.psm.cfg, M = PSM.M, S = M.S, F = M.F; await PSM.ACT.retourner();
  const H = hud({ titre: 'Prélèvement', texte: `Flacon en haut, seringue en dessous. <b>Tirez le piston</b> : glissez sur la scène le long de la seringue (ou boutons fins). Volume de la fiche : <b>${fr(c.vol)} ml</b>.`, valeur: '0 ml' });
  let premiere = true, rapide = false;
  const P = piston(H, (dv, vitesse) => {
    if (dv > 0) { const pris = Math.min(dv, F.reste); F.reste -= pris; S.liq += pris; S.air += dv - pris; if (premiere) { S.bulles = 4; S.air += Math.min(0.25, c.vol * 0.01); premiere = false; } if (vitesse > S.G * 0.8) { rapide = true; S.bulles = Math.min(9, S.bulles + 0.4); } }
    else { const rend = Math.min(-dv, S.liq); S.liq -= rend; F.reste += rend; }
    F.maj();
  });
  await new Promise((ok) => H.boutons([...fins(P, [1, 0.1]), { t: 'Valider le volume', cls: 'principal', f: ok }]));
  P.off(); H.fermer();
  if (Math.abs(S.liq - c.vol) > c.vol * 0.05) err.push(`Volume prélevé ${fr(S.liq)} ml au lieu de ${fr(c.vol)} ml : à ajuster avant de montrer la seringue.`);
  if (rapide) err.push('Piston tiré trop vite : des bulles se forment et le volume devient imprécis. On aspire lentement.');
}
async function jeuBulles(err) {
  const c = etat.psm.cfg, S = PSM.M.S; let taps = 0, expulse = 0;
  const H = hud({ titre: 'Bulles d’air', texte: 'Embout vers le haut. <b>Tapotez</b> pour faire remonter les bulles, puis <b>poussez le piston</b> pour chasser l’air (au-dessus d’une compresse) et ajustez au volume.', valeur: '' });
  const P = piston(H, (dv) => {
    if (dv < 0) { let r = -dv; const a = S.regroupe >= 0.99 ? Math.min(r, S.air) : 0; S.air -= a; r -= a; if (S.regroupe >= 0.99 && S.air <= 0.005) S.bulles = 0; if (r > 0) { const l = Math.min(r, S.liq); S.liq -= l; expulse += l; } }
    else { S.air += dv; }
  });
  P.appliquer(0);
  await new Promise((ok) => H.boutons([{ t: 'Tapoter', f: () => { taps++; S.regroupe = Math.min(1, taps / 3); if (taps >= 3 && S.bulles > 0) { S.air += 0.02 * S.bulles; S.bulles = 0.0; } P.appliquer(0); } }, ...fins(P, [0.1, 0.05].filter((x) => x < 1)), { t: 'Volume ajusté', cls: 'principal', f: ok }]));
  P.off(); H.fermer();
  if (taps < 3 && PSM.M.S.bulles > 0) err.push('Des bulles restent dans la seringue : il faut tapoter pour les faire remonter vers l’embout avant de chasser l’air.');
  if (S.air > 0.02) err.push(`Il reste ${fr(S.air, 2)} ml d’air dans la seringue : le volume injecté sera faux.`);
  if (Math.abs(S.liq - c.vol) > Math.max(c.vol * 0.02, 0.05)) err.push(`Volume ajusté ${fr(S.liq)} ml au lieu de ${fr(c.vol)} ml (écart toléré : 2 %).`);
  if (expulse > c.vol * 0.1) err.push(`${fr(expulse)} ml de cytotoxique expulsés en chassant l’air : il fallait d’abord faire remonter l’air vers l’embout.`);
  etat.psm.volume = S.liq;
}
async function jeuMontrer(err) {
  const c = etat.psm.cfg, S = PSM.M.S; await PSM.ACT.montrer();
  const H = hud({ titre: 'Double contrôle', texte: `Lisez le volume sur la seringue et annoncez-le à l’aide-manipulateur.<br><input id="lu" inputmode="decimal" placeholder="volume lu (ml)" class="hud-champ">` });
  await new Promise((ok) => H.boutons([{ t: 'Montrer à l’aide-manipulateur', cls: 'principal', f: ok }]));
  const lu = parseFloat(String(hudEl.querySelector('#lu').value).replace(',', '.'));
  const grad = S.G <= 12 ? 0.2 : 1;
  if (!(Math.abs(lu - S.liq) <= grad / 2 + 1e-9)) err.push(`Volume annoncé ${Number.isFinite(lu) ? fr(lu) : '—'} ml, la seringue contient ${fr(S.liq)} ml : relire la graduation au niveau du joint du piston.`);
  const okV = Math.abs(S.liq - c.vol) <= Math.max(c.vol * 0.02, 0.05);
  H.texte(okV ? `<b>Aide-manipulateur :</b> « ${fr(S.liq)} ml, conforme à la fiche. Vous pouvez injecter. »` : `<b>Aide-manipulateur :</b> « ${fr(S.liq)} ml, la fiche demande ${fr(c.vol)} ml. Non conforme. »`);
  if (!okV) err.push(`L’aide-manipulateur a refusé le volume (${fr(S.liq)} ml pour ${fr(c.vol)} ml) : le volume se corrige avant l’injection.`);
  await new Promise((ok) => H.boutons([{ t: 'Continuer', cls: 'principal', f: ok }])); H.fermer();
}
async function jeuInjecter(err) {
  const c = etat.psm.cfg, M = PSM.M, S = M.S; const v0 = S.liq; let rapide = false; PSM.flux(true);
  const H = hud({ titre: 'Injection', texte: 'Poche à plat. <b>Poussez le piston doucement</b> (glissez vers l’embout) : le cytotoxique passe par le site dans la poche. Le flux d’air du PSM descend sur le plan de travail.', valeur: '' });
  const P = piston(H, (dv, vitesse) => { if (dv < 0) { const l = Math.min(-dv, S.liq); S.liq -= l; M.P.gonfle(1 - S.liq / Math.max(0.1, v0)); if (vitesse > S.G * 0.7 && l > 0) { if (!rapide) annonce('Doucement : une injection trop rapide met la poche en surpression.', 'erreur'); rapide = true; } } else { S.liq += Math.min(dv, 0.0); } });
  P.appliquer(0);
  await new Promise((ok) => { H.boutons([...fins(P, [1]), { t: 'Injection terminée', cls: 'principal', id: 'fin', f: () => { if (S.liq <= 0.05) ok(); else annonce(`Il reste ${fr(S.liq)} ml dans la seringue.`, 'erreur'); } }]); });
  P.off(); H.fermer(); PSM.flux(false);
  if (rapide) err.push('Injection trop rapide : on pousse lentement, poche à plat, pour éviter surpression et projections.');
}
async function jeuRincer(err) {
  const S = PSM.M.S, c = etat.psm.cfg; let cycles = 0, haut = false; const mini = Math.max(2, Math.min(S.G * 0.4, c.vol * 0.5));
  const H = hud({ titre: 'Rinçages', texte: `Aspirez au moins ${fr(mini, 0)} ml de soluté dans la poche, puis réinjectez tout. Deux fois.`, valeur: '0/2' });
  const P = piston(H, (dv) => { S.liq += dv; if (S.liq >= mini) haut = true; if (haut && S.liq <= 0.05) { cycles++; haut = false; H.valeur(`${Math.min(2, cycles)}/2`); if (cycles >= 2) { H.texte('Deux rinçages faits.'); const b = H.btn('fin'); if (b) b.disabled = false; } } S.liqMat.color.set(cycles ? '#e7f1f8' : c.couleur); });
  await new Promise((ok) => H.boutons([...fins(P, [1]), { t: 'Rinçages faits', cls: 'principal', id: 'fin', f: () => (cycles >= 2 && S.liq <= 0.05 ? ok() : annonce('Faites deux rinçages complets (aspirer puis tout réinjecter).', 'erreur')) }]));
  P.off(); H.fermer();
}
async function jeuAir(err) {
  const S = PSM.M.S; let pris = false, fini = false;
  const H = hud({ titre: 'Volume mort', texte: 'Reprenez un peu d’air de la poche (1 à 2 ml) puis réinjectez-le pour chasser le liquide resté dans la valve.', valeur: '' });
  const P = piston(H, (dv) => { if (dv > 0) { S.air += dv; if (S.air >= 1) pris = true; } else { const a = Math.min(-dv, S.air); S.air -= a; if (pris && S.air <= 0.02) fini = true; } });
  await new Promise((ok) => H.boutons([...fins(P, [0.5]), { t: 'Valve rincée', cls: 'principal', f: () => (fini ? ok() : annonce('Aspirez au moins 1 ml d’air, puis réinjectez-le entièrement.', 'erreur')) }]));
  P.off(); H.fermer();
}
async function jeuHomog(err) {
  const M = PSM.M, coussin = M.P.g; let ang = 0, sens = 0, n = 0, amp = 0;
  await PSM.regarder('poche', 0.6);
  const H = hud({ titre: 'Homogénéisation', texte: 'Glissez de droite à gauche sur la scène : la poche bascule doucement. Six mouvements.', valeur: '0/6' });
  const off = PSM.glisser(() => PSM.V3(1, 0, 0), () => { const p = PSM.V3(0, 0, 0); coussin.getWorldPosition(p); return p; }, (d) => {
    ang = Math.max(-0.35, Math.min(0.35, ang + d * 6)); coussin.rotation.y = ang; const s = Math.sign(d);
    amp = Math.max(amp, Math.abs(ang)); if (s && s !== sens) { if (sens && amp > 0.15) { n++; H.valeur(`${Math.min(6, n)}/6`); amp = 0; } sens = s; }
  });
  const bascule = (s) => { const a0 = ang, a1 = 0.3 * s; PSM.vue && (function anime(k) { if (k > 1) return; coussin.rotation.y = a0 + (a1 - a0) * k; requestAnimationFrame(() => anime(k + 0.12)); })(0); ang = a1; if (s !== sens) { if (sens) { n++; H.valeur(`${Math.min(6, n)}/6`); } sens = s; } };
  await new Promise((ok) => { const t = setInterval(() => { if (n >= 6) { clearInterval(t); ok(); } }, 150); H.boutons([{ t: '← vers la gauche', f: () => bascule(-1) }, { t: 'vers la droite →', f: () => bascule(1) }]); });
  off(); coussin.rotation.y = 0; H.fermer();
}

/* ---------- liste des gestes, par phase ---------- */
function phaseCourante() { const p = etat.psm; for (const ph of PHASES) { const ids = GESTES.filter((g) => g.phase === ph.id && !g.piege).map((g) => g.id); if (!ids.every((id) => p.faits.includes(id))) return ph.id; } return 'D'; }
function rendrePSM() {
  const o = etat.ord;
  if (!o.valide || o.sol.verdict !== 'conforme') {
    $('rappelPrep').innerHTML = 'Validez d’abord une ordonnance <b>conforme</b> (onglet 2) : la préparation reprend vos calculs et la fiche de fabrication.'; $('gestes').innerHTML = ''; return;
  }
  const s = o.sol, m = s.m, p = etat.psm; if (!p.cfg && PSM) { nouvellePrep(); return; }
  const c = p.cfg || cfgPrep();
  $('rappelPrep').innerHTML = `${o.cas.id} · <b>${m.nom} ${fr(s.dose)} mg</b> · prélever <b>${fr(c.vol)} ml</b> · poche de ${c.poche} ml de ${c.solvant.toLowerCase()}` + (m.lumiere ? ' · <b>photosensible</b>' : '') + ` · <a href="#" id="voirFiche">fiche de fabrication</a>`;
  const vf = $('voirFiche'); if (vf) vf.onclick = (e) => { e.preventDefault(); onglet('ordonnance'); setTimeout(() => { const f = document.querySelector('.fiche'); f && f.scrollIntoView({ behavior: 'smooth' }); }, 200); };
  const ph = phaseCourante(); p.phase = ph;
  const sugg = $('guide').checked ? GESTES.filter((g) => !g.piege && g.phase === ph).map((g) => g.id).find((id) => !p.faits.includes(id)) : null;
  const c2 = $('gestes'); c2.innerHTML = '';
  const bandeau = document.createElement('div'); bandeau.className = 'phases';
  bandeau.innerHTML = PHASES.map((x) => { const ids = GESTES.filter((g) => g.phase === x.id && !g.piege).map((g) => g.id); const nf = ids.filter((id) => p.faits.includes(id)).length;
    return `<span class="phase ${x.id === ph ? 'en-cours' : nf === ids.length ? 'faite' : ''}"><b>${x.id}</b> ${x.nom}<small>${nf}/${ids.length}</small></span>`; }).join('');
  c2.appendChild(bandeau);
  if (!p.ordre[ph]) p.ordre[ph] = melange(GESTES.filter((g) => g.phase === ph).map((g) => g.id));
  for (const id of p.ordre[ph]) {
    const gst = GESTES.find((x) => x.id === id); const fait = p.faits.includes(id) || (gst.piege && p.erreurs.some((e) => e.id === id));
    const b = document.createElement('button'); b.className = 'carte' + (fait ? ' fait' : '') + (sugg === id ? ' suggere' : '') + (gst.jeu ? ' interactif' : ''); b.dataset.cat = 'Geste'; b.dataset.id = id; b.disabled = fait || p.fini;
    b.innerHTML = `<span class="cat">${gst.jeu ? 'Geste · à faire' : 'Geste'}</span><span class="nom">${echap(gst.nom)}</span>`;
    b.addEventListener('click', () => fairePSM(gst)); c2.appendChild(b);
  }
}
function demander(dlg) { return new Promise((ok) => { const d = $(dlg); d.returnValue = ''; d.showModal(); d.addEventListener('close', () => ok(d.returnValue), { once: true }); }); }
async function fairePSM(gst) {
  if (occupe || etat.psm.fini) return; const p = etat.psm, s = etat.ord.sol, m = s.m, err = [];
  if (gst.piege) err.push(gst.pourquoi);
  else { const manque = (gst.avant || []).filter((x) => !p.faits.includes(x)); if (manque.length) err.push('Pas encore fait : ' + manque.map((x) => GESTES.find((y) => y.id === x).nom.toLowerCase()).join(' ; ') + '. ' + gst.pourquoi); }
  if (!gst.piege && err.length) { journal('journalPsm', 'Trop tôt : ' + gst.nom, true, echap(err.join(' '))); p.erreurs.push({ id: gst.id + '_ordre', nom: gst.nom, txt: err.join(' ') }); annonce('<b>Pas encore.</b> ' + echap(err[0]), 'erreur'); return; }
  occupe = true; document.querySelectorAll('#gestes .carte').forEach((b) => { b.disabled = true; });
  let detail = '';
  try {
    if (gst.piege) { /* rien à animer */ }
    else if (gst.id === 'gants2') await jeuPeler(['gants'], err);
    else if (gst.id === 'peler') { await choisirSeringue(err); await jeuPeler(['poche', 'tubulure', 'seringue', 'aiguille'], err); detail = `seringue de ${p.ser} ml`; }
    else if (gst.id === 'orienter') await jeuOrienter(err);
    else if (gst.id === 'tubulure') await jeuTubulure(err);
    else if (gst.id === 'visser') await jeuVisser(err);
    else if (gst.id === 'prelever') await jeuPrelever(err);
    else if (gst.id === 'bulles') { await jeuBulles(err); detail = `${fr(p.volume || 0)} ml`; }
    else if (gst.id === 'montrer') await jeuMontrer(err);
    else if (gst.id === 'injecter') await jeuInjecter(err);
    else if (gst.id === 'rincer') await jeuRincer(err);
    else if (gst.id === 'air') await jeuAir(err);
    else if (gst.id === 'homogeneiser') await jeuHomog(err);
    else if (gst.id === 'site') await PSM.ACT.site();
    else if (gst.id === 'fiche') await PSM.ACT.fiche(ficheTexture(ficheDonnees(etat.ord, p.cfg)));
    else if (gst.etiquette) {
      const OBLIG = [['patient', 'Nom, prénom et date de naissance du patient'], ['dci', 'DCI et dose (mg)'], ['volume', 'Volume final et solvant'], ['date', 'Date et heure de fabrication'], ['peremption', 'Date et heure limites d’utilisation'], ['voie', 'Voie et durée d’administration'], ['cyto', 'Mention « cytotoxique »'], ['ordo', 'Numéro d’ordonnancier']]
        .concat(m.lumiere ? [['lumiere', 'À conserver à l’abri de la lumière']] : []).concat(!m.pvc || m.filtre ? [['pvc', (m.filtre ? 'Filtre 0,22 µm, ' : '') + 'tubulure sans PVC']] : []);
      const PIEGES = [['diag', 'Diagnostic du patient'], ['prix', 'Prix de la préparation'], ['tel', 'Téléphone du patient'], ['cache', 'Étiquette collée sur les mentions de la poche']].concat(m.lumiere ? [] : [['lumiere', 'À conserver à l’abri de la lumière']]);
      const tout = melange([...OBLIG.map((x) => [...x, 1]), ...PIEGES.map((x) => [...x, 0])]);
      $('mentions').innerHTML = tout.map(([k, t]) => `<label><input type="checkbox" value="${k}"> ${echap(t)}</label>`).join('');
      const rep = await demander('etiquetage');
      const coches = new Set([...document.querySelectorAll('#mentions input:checked')].map((x) => x.value));
      const oubli = OBLIG.filter(([k]) => !coches.has(k)).map(([, t]) => t.toLowerCase()); const trop = PIEGES.filter(([k]) => coches.has(k)).map(([, t]) => t.toLowerCase());
      if (rep !== 'ok') err.push('Étiquette non posée.');
      if (oubli.length) err.push('Mentions oubliées : ' + oubli.join(' ; ') + '.');
      if (trop.length) err.push('À ne pas faire : ' + trop.join(' ; ') + '.');
      const c = etat.ord.cas; await PSM.ACT.etiqueter([`${m.nom.toUpperCase()} ${fr(s.dose, 0)} mg`, `${c.sexe === 'F' ? 'Mme' : 'M.'} ${c.id} · ${c.age} ans`, `${p.cfg.poche} ml ${p.cfg.solvant}`, `IV ${m.duree}`, 'CYTOTOXIQUE'].concat(m.lumiere ? ['Abri de la lumière'] : []));
    }
    else if (gst.id === 'sachet') { await PSM.ACT.sachet(m.lumiere); detail = m.lumiere ? 'sachet opaque (photosensible)' : 'sachet transparent'; }
    else if (PSM.ACT[gst.id]) await PSM.ACT[gst.id]();
  } catch (e) { console.warn(e); }
  if (!gst.piege) p.faits.push(gst.id);
  const ko = err.length > 0; if (ko) p.erreurs.push({ id: gst.id, nom: gst.nom, txt: err.join(' ') });
  journal('journalPsm', gst.nom + (detail ? ' (' + detail + ')' : ''), ko, ko ? echap(err.join(' ')) : '');
  if (ko) annonce('<b>À revoir.</b> ' + echap(err[0]), 'erreur');
  if (gst.id === 'liberer') { p.fini = true; const n = p.erreurs.length; annonce(n ? `Préparation libérée avec <b>${n}</b> point${n > 1 ? 's' : ''} à revoir.` : '<b>Préparation sans faute, libérée.</b>', n ? 'erreur' : 'bien'); }
  occupe = false; rendrePSM();
}

/* ================= 4. BILAN ================= */
function note(n) { return Math.max(0, 20 - 2 * n); }
function rendreBilan() {
  const h = etat.hab, o = etat.ord, p = etat.psm;
  const bloc = (titre, fait, erreurs, okTexte, total) => `<div class="bloc"><h3>${titre}</h3>` + (fait ? `<div class="note">${note(erreurs.length)}<small style="font-size:1rem">/20</small></div>` +
    (erreurs.length ? '<ul>' + erreurs.map((e) => `<li class="ko"><b>${echap(e.nom)}</b> — ${echap(e.txt)}</li>`).join('') + '</ul>' : `<ul><li class="ok">${okTexte}</li></ul>`) : '<p>Pas encore fait.</p>') + '</div>';
  const libO = { c_sc: 'surface corporelle', c_cl: 'clairance', c_dose: 'dose', c_vol: 'volume à prélever', c_solv: 'solvant', c_poche: 'volume de la poche', c_verdict: 'décision' };
  const ordE = (o.erreurs || []).map((k) => ({ nom: libO[k], txt: 'valeur ou choix à revoir (voir la correction détaillée dans l’onglet 2).' }));
  const srcM = o.cas ? `<li><a href="${o.sol.m.source[1]}" target="_blank" rel="noopener">${echap(o.sol.m.source[0])}</a></li>` : '';
  $('bilan').className = 'bilan';
  $('bilan').innerHTML = bloc('Habillage', h.fini, h.erreurs, 'Toutes les étapes dans le bon ordre.') +
    bloc('Validation de l’ordonnance' + (o.cas ? ' · ' + o.cas.id : ''), o.valide, ordE, 'Calculs et décision justes.') +
    bloc('Préparation sous PSM', p.fini, p.erreurs, 'Gestes dans l’ordre, volume et étiquette justes.') +
    `<div class="bloc sources"><h3>Sources</h3><ul>${HABILLAGE.sources.map(([t, u]) => `<li><a href="${u}" target="_blank" rel="noopener">${echap(t)}</a></li>`).join('')}${srcM}</ul>
     <p>Procédure d’habillage et barème (−2 points par erreur) à adapter à la procédure de l’unité.</p></div>`;
}

/* ================= démarrage ================= */
remplirChoix(); choisirCas(CAS[0].id); majZone(); rendreChariot();
creerHabillage(R).then((h) => { HAB = h; R.activer(h.vue); $('chargement').hidden = true; $('scene').classList.add('miroir'); window.__labo = { R, HAB, etat }; })
  .catch((e) => { $('chargement').querySelector('p').textContent = 'Impossible de charger le modèle 3D : ' + e.message; console.error(e); });
window.__laboEtat = etat;
