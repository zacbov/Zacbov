/* TP préparations magistrales : ordonnance → calculs → pesées → préparation → contrôles et étiquette → bilan. */
import { creerRendu } from '../chimio/scene3d.js';
import { creerPaillasse } from './paillasse.js';
import { pH, couleurPH } from './chimie.js';
import { FORMULES, MENTIONS, BALANCES, CONTENANTS, VERRERIE, GELULES, REGLES, PHARMACIE } from './donnees.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const fr = (x, d = 2) => (x == null || Number.isNaN(x) ? '—' : Number(x).toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d }));
const frc = (x) => { const d = Math.abs(x) < 1 ? 3 : Math.abs(x) < 10 ? 2 : 1; return Number(x.toFixed(d)).toLocaleString('fr-FR', { maximumFractionDigits: d }); };
const lire = (v) => { const n = parseFloat(String(v).replace(/\s/g, '').replace(',', '.')); return Number.isFinite(n) ? n : NaN; };
const hash = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const alea = (graine) => { let a = graine || 1; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const melanger = (arr, r) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const aujourdhui = () => { const d = new Date(); d.setHours(12, 0, 0, 0); return d; };
const iso = (d) => d.toISOString().slice(0, 10);
const plusJours = (n) => { const d = aujourdhui(); d.setDate(d.getDate() + n); return d; };
const dateFr = (d) => d.toLocaleDateString('fr-FR');

const BAREME = { analyse: 2, calculs: 4, pesees: 4, preparation: 4, controles: 3, etiquette: 3 };
const NOMS_SECTION = { analyse: 'Analyse de l\'ordonnance', calculs: 'Calculs', pesees: 'Pesées et mesures', preparation: 'Mode opératoire', controles: 'Contrôles', etiquette: 'Étiquetage' };
const VUES = { ensemble: ['Paillasse', 'préparatoire'], balance: ['Balance', 'pesées'], mortier: ['Mortier', 'trituration, incorporation'], ph: ['Agitateur · pH-mètre', 'dissolution, mesure du pH'], bainmarie: ['Bain-marie', 'fusion des corps gras'], conditionnement: ['Conditionnement', 'pots, flacons'], gelulier: ['Gélulier', 'remplissage des gélules'] };

let R, P, E;
const guide = () => $('#guide').checked;

/* ---------- 3D ---------- */
async function demarrer3D() {
  R = creerRendu($('#scene'));
  try { P = await creerPaillasse(R); R.activer(P.vue); P.ecran('balance', '0.00', 'g'); P.ecran('ph', '7.00', 'pH'); P.ecran('bain', '20.0 °C'); P.ecran('agit', '0 tr/min'); }
  catch (e) { console.error(e); P = null; }
  $('#chargement').hidden = true;
}
let vueCourante = null;
const vue = (k) => { if (!P) return; if (k !== vueCourante) P.regarder(k); vueCourante = k; const [a, b] = VUES[k] || VUES.ensemble; $('#vignetteNom').textContent = a; $('#vignetteSous').textContent = b; $$('.outils-scene button').forEach((x) => x.classList.toggle('actif', x.dataset.vue === k)); };
const p3 = (f, ...a) => (P && P[f] ? P[f](...a) : Promise.resolve());

function annonce(txt, type = '') {
  const a = $('#annonce'); a.textContent = txt; a.className = 'annonce ' + type; a.hidden = false;
  clearTimeout(annonce.t); annonce.t = setTimeout(() => { a.hidden = true; }, 4200);
}

/* ---------- état ---------- */
function nouvelEtat(f) {
  const r = alea(hash(f.id + iso(aujourdhui())));
  E = { f, r, erreurs: [], analyse: null, calcFait: false, pesees: {}, faites: [], ph: null, lactose: null, qsp: null, controlesFaits: false, fini: false,
    ordonnancier: '2026-' + String(1000 + Math.floor(r() * 8999)) };
  E.cibles = cibles(f);
  window.__magEtat = E;
}
function erreur(sec, txt, pourquoi = '') { E.erreurs.push({ sec, txt, pourquoi }); }

/* quantités attendues pour la quantité prescrite */
function cibles(f) {
  if (!f.composants) return [];
  if (f.gelules) {
    const tot = f.dose * f.n;                        // mg
    return [
      { c: f.composants[0], mode: 'pesee', cible: tot / 1000, u: 'g', calc: tot, calcU: 'mg', formule: `${f.dose} mg × ${f.n} gélules = ${fr(tot, 0)} mg` },
      { c: f.composants[1], mode: 'qsp', cible: null, u: 'mL', qspTxt: `qsp ${fr(f.n * GELULES[f.taille], 2)} mL (volume des ${f.n} gélules)` },
    ];
  }
  const k = f.ordo.qte / f.base.q; const etapeQsp = f.etapes.some((e) => e.qsp);
  return f.composants.map((c) => {
    const q = c.q * k;
    if (c.unites) { const n = Math.round(q / c.unites.dose); return { c, mode: 'unites', cible: n, u: c.unites.nom, calc: n, calcU: c.unites.nom, formule: `${frc(q)} mg ÷ ${c.unites.dose} mg = ${n} ${c.unites.nom}` }; }
    if (c.qsp && (c.u === 'mL' || etapeQsp)) return { c, mode: 'qsp', cible: null, u: f.base.u, qspTxt: `qsp ${frc(f.ordo.qte)} ${f.base.u}` };
    const enG = c.u === 'mg' ? q / 1000 : q;
    return { c, mode: c.volume ? 'volume' : 'pesee', cible: c.u === 'mg' ? enG : q, u: c.volume ? 'mL' : 'g', calc: q, calcU: c.u,
      formule: `${frc(c.q)} ${c.u} × ${frc(f.ordo.qte)} / ${frc(f.base.q)} = ${frc(q)} ${c.u}` };
  });
}

/* ---------- onglets ---------- */
function ouvrir(nom) {
  $$('.onglets button').forEach((b) => b.classList.toggle('actif', b.dataset.ong === nom));
  $$('.volet').forEach((v) => v.classList.toggle('actif', v.dataset.volet === nom));
}
const debloquer = (nom) => { $(`.onglets button[data-ong="${nom}"]`).disabled = false; };

/* ---------- 1. ordonnance ---------- */
function afficherOrdonnance() {
  const f = E.f; const o = f.ordo;
  $('#ordonnance').innerHTML = `
    <h4>Ordonnance</h4>
    <div class="meta">${o.prescripteur} · ${dateFr(aujourdhui())}</div>
    <table><tr><td>Patient</td><td>${o.patient}</td></tr>
    <tr><td>Forme</td><td>${f.forme} · ${f.voie}</td></tr></table>
    <div class="rx">${o.texte}</div>`;
  const opts = [['oui', 'Préparer'], ['appeler', 'Ne pas préparer : appeler le prescripteur'], ['non', 'Refuser sans autre démarche']];
  $('#decision').innerHTML = `<h3>Analyse pharmaceutique</h3><div class="options">${opts.map(([v, t]) => `<button type="button" data-dec="${v}">${t}</button>`).join('')}</div><div class="retour" id="retourDec"></div>`;
  $$('#decision button').forEach((b) => b.onclick = () => decider(b.dataset.dec));
  $('#calculs').hidden = true; $('#calculs').innerHTML = ''; $('#retourCalc').innerHTML = '';
}

function decider(v) {
  if (E.analyse) return;
  const f = E.f; const bon = f.analyse.ok; E.analyse = v;
  $$('#decision button').forEach((b) => { b.disabled = true; b.classList.toggle('choisi', b.dataset.dec === v); });
  const juste = v === bon;
  if (!juste) erreur('analyse', bon === 'oui' ? 'Préparation refusée alors qu\'elle était réalisable' : 'Décision inadaptée devant une contre-indication', f.analyse.pourquoi);
  $('#retourDec').innerHTML = `<div class="encart ${juste ? 'ok' : 'ko'}"><b>${juste ? 'Juste.' : 'À revoir.'}</b> ${f.analyse.pourquoi}</div>`;
  if (!f.composants) { E.fini = true; debloquer('bilan'); setTimeout(() => { bilan(); ouvrir('bilan'); }, 900); return; }
  if (!juste) $('#retourDec').insertAdjacentHTML('beforeend', '<p class="sources">Pour le TP, on continue la préparation.</p>');
  formulaireCalculs();
}

function formulaireCalculs() {
  const f = E.f; const F = $('#calculs'); F.hidden = false;
  const lignes = E.cibles.map((t, i) => {
    const c = t.c; const ref = f.gelules ? (c.q ? `${c.q} mg / gélule` : 'qsp 1 gélule n° 4') : (c.qsp ? `qsp ${frc(f.base.q)} ${f.base.u}` : `${frc(c.q)} ${c.u}`);
    const champ = t.mode === 'qsp' ? `<span class="unite">${t.qspTxt}</span>` : `<input data-i="${i}" inputmode="decimal"><span class="unite">${t.calcU}</span>`;
    return `<tr><td>${c.nom}<small>${c.role}</small></td><td class="q">${ref}</td><td>${champ}</td></tr>`;
  }).join('');
  const titreRef = f.gelules ? 'Formule (par gélule)' : `Formule (${frc(f.base.q)} ${f.base.u})`;
  const titreCalc = f.gelules ? `Pour ${f.n} gélules` : `Pour ${frc(f.ordo.qte)} ${f.base.u}`;
  let extra = '';
  if (f.gelules) extra += `<div class="question"><label for="q_taille">Taille de gélule</label><select id="q_taille"><option value="">—</option>${Object.keys(GELULES).map((k) => `<option value="${k}">n° ${k} (${fr(GELULES[k], 2)} mL)</option>`).join('')}</select></div>
    <div class="question"><label for="q_vol">Volume total de poudre à préparer <small class="unite">mL</small></label><input id="q_vol" inputmode="decimal"></div>`;
  if (f.controles && f.controles.osmo) extra += `<div class="question"><label for="q_osmo">Osmolarité théorique <small class="unite">mOsm/L</small><br><small>NaHCO₃ 84,01 g/mol · NaCl 58,44 g/mol, dissociation totale</small></label><input id="q_osmo" inputmode="decimal"></div>`;
  F.innerHTML = `<h3 class="sous-titre">Calculs</h3><table><thead><tr><th>Matière première</th><th>${titreRef}</th><th>${titreCalc}</th></tr></thead><tbody>${lignes}</tbody></table>${extra}
    ${guide() ? `<p class="sources">${f.gelules ? 'Masse totale = dose × nombre de gélules ; volume = nombre de gélules × volume d\'une gélule.' : 'Quantité = quantité de la formule × quantité prescrite ÷ quantité de la formule de référence.'}</p>` : ''}
    <button type="submit" class="principal">Valider mes calculs</button>`;
  F.onsubmit = (ev) => { ev.preventDefault(); corrigerCalculs(); };
}

function corrigerCalculs() {
  if (E.calcFait) return; E.calcFait = true;
  const f = E.f; const lignes = [];
  const juge = (el, val, cible, tol, txt, formule) => {
    const ok = Math.abs(val - cible) <= Math.max(Math.abs(cible) * tol, 1e-9);
    el.classList.add(ok ? 'ok' : 'ko'); el.disabled = true;
    if (!ok) { erreur('calculs', `${txt} : ${Number.isNaN(val) ? 'non renseigné' : frc(val)} au lieu de ${frc(cible)}`, formule); }
    lignes.push(`<li class="${ok ? 'ok' : 'ko'}">${txt} : <code>${formule}</code></li>`);
  };
  E.cibles.forEach((t, i) => { if (t.mode === 'qsp') return; const el = $(`#calculs input[data-i="${i}"]`); juge(el, lire(el.value), t.calc, t.mode === 'unites' ? 0 : REGLES.tolCalcul, t.c.nom, t.formule); });
  if (f.gelules) {
    const el = $('#q_taille'); const ok = el.value === f.taille; el.classList.add(ok ? 'ok' : 'ko'); el.disabled = true;
    if (!ok) erreur('calculs', 'Taille de gélule', 'Le Formulaire national prévoit la gélule n° 4 pour 0,5 à 25 mg de spironolactone.');
    lignes.push(`<li class="${ok ? 'ok' : 'ko'}">Taille : <code>gélule n° ${f.taille} (${fr(GELULES[f.taille], 2)} mL)</code></li>`);
    const vt = f.n * GELULES[f.taille]; juge($('#q_vol'), lire($('#q_vol').value), vt, REGLES.tolCalcul, 'Volume total', `${f.n} × ${fr(GELULES[f.taille], 2)} mL = ${fr(vt, 2)} mL`);
  }
  if (f.controles && f.controles.osmo) {
    const el = $('#q_osmo'); const v = lire(el.value); const ok = Math.abs(v - f.controles.osmo.valeur) <= f.controles.osmo.tol; el.classList.add(ok ? 'ok' : 'ko'); el.disabled = true;
    if (!ok) erreur('calculs', 'Osmolarité', '(0,7 / 84,01 × 2 + 0,45 / 58,44 × 2) × 1000 / 0,1 L ≈ 320 mOsm/L : proche de l\'isotonie (≈ 300).');
    lignes.push(`<li class="${ok ? 'ok' : 'ko'}">Osmolarité : <code>(0,7/84,01×2 + 0,45/58,44×2) mol ÷ 0,1 L ≈ 320 mOsm/L</code> — proche de l'isotonie</li>`);
  }
  const nko = lignes.filter((l) => l.includes('class="ko"')).length;
  $('#retourCalc').innerHTML = `<div class="encart ${nko ? 'ko' : 'ok'}"><b>${nko ? nko + ' calcul(s) à revoir.' : 'Calculs justes.'}</b><ul>${lignes.join('')}</ul>
    ${nko ? '<p class="sources">Les pesées se feront sur les valeurs justes.</p>' : ''}<button class="principal" id="versPesees">Passer aux pesées</button></div>`;
  $('#versPesees').onclick = () => { debloquer('pesees'); listePesees(); ouvrir('pesees'); vue('balance'); };
}

/* ---------- 2. pesées ---------- */
function listePesees() {
  const f = E.f;
  $('#reglesPesee').innerHTML = `Tolérance du TP : ± ${REGLES.tolPesee * 100} % par pesée. Choix de la balance : sa résolution doit rester ≤ ${REGLES.incertitude * 100} % de la masse pesée. Verrerie : la plus petite qui contient le volume.`;
  const items = E.cibles.filter((t) => t.mode !== 'qsp');
  $('#pesees').innerHTML = items.map((t) => {
    const p = E.pesees[t.c.id]; const cl = t.mode === 'volume' ? 'volume' : '';
    const lib = t.mode === 'volume' ? 'Mesurer' : t.mode === 'unites' ? 'Compter' : 'Peser';
    const cible = t.mode === 'unites' ? `${t.cible} ${t.u}` : `${frc(t.cible)} ${t.u}`;
    return `<div class="pesee ${cl} ${p ? 'fait ' + (p.ok ? 'ok' : 'ko') : ''}" data-id="${t.c.id}"><div class="nom">${t.c.nom}<small>cible : ${cible}</small></div><div class="val">${p ? p.txt : ''}</div><button type="button" ${p ? 'disabled' : ''}>${lib}</button></div>`;
  }).join('');
  $$('#pesees .pesee button').forEach((b) => b.onclick = () => { const t = items.find((x) => x.c.id === b.closest('.pesee').dataset.id); t.mode === 'volume' ? mesurer(t) : t.mode === 'unites' ? compter(t) : peser(t); });
  const fini = items.every((t) => E.pesees[t.c.id]);
  $('#retourPesee').innerHTML = fini ? '<button class="principal" id="versPrep">Passer à la préparation</button>' : '';
  if (fini) $('#versPrep').onclick = () => { debloquer('preparation'); preparer(); ouvrir('preparation'); };
}

function radios(hote, nom, liste, txt, defaut) {
  hote.innerHTML = liste.map((x) => `<label><input type="radio" name="${nom}" value="${x.id}" ${x.id === defaut ? 'checked' : ''}>${txt(x)}</label>`).join('');
}

function peser(t) {
  const d = $('#dlgPesee'); const s = { bal: null, cont: null, pose: false, tare: 0, produit: 0 };
  $('#peseeTitre').textContent = 'Pesée — ' + t.c.nom;
  $('#peseeCible').textContent = `Quantité calculée : ${frc(t.cible)} g`;
  radios($('#peseeBalances'), 'bal', BALANCES, (b) => b.nom);
  radios($('#peseeContenants'), 'cont', CONTENANTS, (c) => c.nom);
  const lecture = () => { if (!s.bal) return null; return (s.pose && s.cont ? s.cont.m : 0) + s.produit - s.tare; };
  const dec = () => (s.bal ? (s.bal.res < 0.01 ? 3 : 2) : 2);
  const maj = () => {
    const l = lecture(); const txt = l == null ? '—' : (l > s.bal.max ? 'Err' : l.toFixed(dec()));
    $('#peseeLecture').textContent = txt; p3('ecran', 'balance', l == null ? '' : txt + ' g', s.bal ? (s.bal.res < 0.01 ? 'précision 0,001 g' : '0,01 g') : '');
    p3('plateau', s.pose && s.cont ? s.cont.id : null, s.produit, t.c.couleur || '#ffffff');
    $('#peseePoser').classList.toggle('actif', s.pose);
    const pas = s.bal ? (s.bal.res < 0.01 ? [1, 0.1, 0.01, 0.001] : [10, 1, 0.1, 0.01]) : [];
    $('#peseePas').innerHTML = pas.map((p) => `<button type="button" data-p="${p}">+ ${String(p).replace('.', ',')}</button>`).join('') + pas.map((p) => `<button type="button" class="moins" data-p="${-p}">− ${String(p).replace('.', ',')}</button>`).join('');
    $$('#peseePas button').forEach((b) => b.onclick = () => {
      if (!s.pose) { annonce('Posez d\'abord le contenant sur le plateau.', 'erreur'); return; }
      s.produit = Math.max(0, +(s.produit + Number(b.dataset.p)).toFixed(4)); maj();
    });
  };
  $$('input[name=bal]', d).forEach((i) => i.onchange = () => { s.bal = BALANCES.find((b) => b.id === i.value); s.tare = 0; maj(); });
  $$('input[name=cont]', d).forEach((i) => i.onchange = () => { s.cont = CONTENANTS.find((c) => c.id === i.value); s.pose = false; s.produit = 0; s.tare = 0; maj(); });
  $('#peseePoser').onclick = () => { if (!s.bal || !s.cont) { annonce('Choisissez la balance et le contenant.', 'erreur'); return; } s.pose = !s.pose; if (!s.pose) s.produit = 0; maj(); };
  $('#peseeTare').onclick = () => { if (!s.bal) return; s.tare = (s.pose && s.cont ? s.cont.m : 0) + s.produit; maj(); };
  $('#peseeVider').onclick = () => { s.produit = 0; maj(); };
  maj(); vue('balance');
  d.onclose = () => {
    p3('plateau', null);
    if (d.returnValue !== 'ok') return;
    if (!s.bal || !s.cont || !s.pose || s.produit <= 0) { annonce('Pesée incomplète : rien n\'a été noté.', 'erreur'); return; }
    const l = lecture(); const ko = [];
    if (Math.abs(s.tare - s.cont.m) > 1e-9) ko.push(['Tare oubliée ou faite au mauvais moment', `On tare avec le contenant vide sur le plateau. Lecture notée ${fr(l, dec())} g, produit réellement pesé ${frc(s.produit)} g.`]);
    if (s.bal.res > t.cible * REGLES.incertitude + 1e-12) ko.push(['Balance inadaptée', `Résolution ${String(s.bal.res).replace('.', ',')} g pour ${frc(t.cible)} g : ${fr(100 * s.bal.res / t.cible, 1)} % de la masse. Il faut la balance de précision.`]);
    if (s.bal.max < t.cible) ko.push(['Portée dépassée', 'La masse dépasse la portée de la balance.']);
    const ecart = (s.produit - t.cible) / t.cible;
    if (Math.abs(ecart) > REGLES.tolPesee) ko.push([`Écart de pesée ${ecart > 0 ? '+' : ''}${fr(100 * ecart, 1)} %`, `Produit pesé ${frc(s.produit)} g pour ${frc(t.cible)} g (tolérance ± ${REGLES.tolPesee * 100} %).`]);
    ko.forEach(([a, b]) => erreur('pesees', `${t.c.nom} — ${a}`, b));
    E.pesees[t.c.id] = { reel: s.produit, ok: !ko.length, txt: `${frc(s.produit)} g${ko.length ? ' ✗' : ' ✓'}` };
    annonce(ko.length ? `${t.c.nom} : ${ko[0][0]}.` : `${t.c.nom} : ${frc(s.produit)} g, pesée conforme.`, ko.length ? 'erreur' : 'bien');
    listePesees();
  };
  ouvrirDlg(d);
}

function mesurer(t) {
  const d = $('#dlgVolume'); let instr = null, v = 0;
  $('#volTitre').textContent = 'Mesure — ' + t.c.nom; $('#volCible').textContent = `Volume calculé : ${frc(t.cible)} mL`;
  radios($('#volVerrerie'), 'verre', VERRERIE, (x) => x.nom);
  const cur = $('#volCurseur');
  const maj = () => { $('#volVal').textContent = instr ? fr(v, instr.grad < 0.1 ? 2 : 1) : '0'; $('#volLiquide').style.height = instr ? Math.min(100, 100 * v / instr.cap) + '%' : '0'; };
  $$('input[name=verre]', d).forEach((i) => i.onchange = () => { instr = VERRERIE.find((x) => x.id === i.value); cur.max = instr.cap; cur.step = instr.grad; v = 0; cur.value = 0; maj(); });
  cur.oninput = () => { v = Number(cur.value); maj(); };
  maj();
  d.onclose = () => {
    if (d.returnValue !== 'ok') return;
    if (!instr || v <= 0) { annonce('Mesure incomplète : rien n\'a été noté.', 'erreur'); return; }
    const ko = []; const mieux = VERRERIE.filter((x) => x.cap >= t.cible).sort((a, b) => a.cap - b.cap)[0];
    if (instr.cap < t.cible) ko.push(['Verrerie trop petite', `${instr.nom} ne contient pas ${frc(t.cible)} mL.`]);
    else if (instr.id !== mieux.id) ko.push(['Verrerie peu précise', `Pour ${frc(t.cible)} mL, la plus petite verrerie adaptée est : ${mieux.nom}.`]);
    const tol = Math.max(t.cible * REGLES.tolPesee, instr.grad / 2 + 1e-9);
    if (Math.abs(v - t.cible) > tol) ko.push(['Volume inexact', `${fr(v, 2)} mL mesurés pour ${frc(t.cible)} mL.`]);
    ko.forEach(([a, b]) => erreur('pesees', `${t.c.nom} — ${a}`, b));
    E.pesees[t.c.id] = { reel: v, ok: !ko.length, txt: `${fr(v, 2)} mL${ko.length ? ' ✗' : ' ✓'}` };
    annonce(ko.length ? `${t.c.nom} : ${ko[0][0]}.` : `${t.c.nom} : ${fr(v, 2)} mL, mesure conforme.`, ko.length ? 'erreur' : 'bien');
    listePesees();
  };
  ouvrirDlg(d);
}

function compter(t) {
  const n = parseInt(prompt(`${t.c.nom}\nCombien de ${t.u} prélevez-vous ?`, ''), 10);
  if (!Number.isFinite(n)) return;
  const ok = n === t.cible;
  if (!ok) erreur('pesees', `${t.c.nom} — ${n} ${t.u} au lieu de ${t.cible}`, t.formule);
  E.pesees[t.c.id] = { reel: n * t.c.unites.dose / 1000, ok, txt: `${n} ${t.u}${ok ? ' ✓' : ' ✗'}` };
  listePesees();
}

/* ---------- 3. préparation ---------- */
function preparer() {
  const f = E.f;
  $('#rappelPrep').innerHTML = (f.temp ? `<b>${f.temp.txt}.</b> ` : '') + (f.proposeMode ? 'Mode opératoire proposé pour le TP (pas de monographie au Formulaire national). ' : '') + `Source : ${f.source.titre}.`;
  const cartes = melanger([...f.etapes.map((e) => ({ ...e, cat: 'Geste' })), ...f.pieges.map((p) => ({ ...p, cat: 'Piège', piege: true }))], E.r);
  E.cartes = cartes;
  $('#etapes').innerHTML = cartes.map((c) => `<button class="carte" data-id="${c.id}" data-cat="Geste"><span class="cat">${c.piege ? 'Geste' : 'Geste'}</span><span class="nom">${c.txt}</span></button>`).join('');
  $$('#etapes .carte').forEach((b) => b.onclick = () => choisirEtape(b.dataset.id, b));
  $('#journalPrep').innerHTML = ''; suggerer();
  p3('pate', false); p3('gelules', 0); vue('ensemble');
}
function suggerer() { const n = E.f.etapes[E.faites.length]; $$('#etapes .carte').forEach((b) => b.classList.toggle('suggere', guide() && n && b.dataset.id === n.id)); }
const journal = (txt, ko = false, petit = '') => $('#journalPrep').insertAdjacentHTML('beforeend', `<li class="${ko ? 'ko' : ''}">${txt}${petit ? `<small>${petit}</small>` : ''}</li>`);

let occupe = false;
async function choisirEtape(id, bouton) {
  if (occupe) return; const f = E.f; const carte = E.cartes.find((c) => c.id === id); const suivante = f.etapes[E.faites.length];
  if (carte.piege) { erreur('preparation', carte.txt, carte.pourquoi); journal(carte.txt, true, carte.pourquoi); annonce(carte.pourquoi, 'erreur'); bouton.disabled = true; bouton.classList.add('fait'); return; }
  if (!suivante || carte.id !== suivante.id) { erreur('preparation', `Trop tôt : « ${carte.txt} »`, `Il fallait d'abord : ${suivante.txt}.`); journal(`Trop tôt : ${carte.txt}`, true, `D'abord : ${suivante.txt}`); annonce(`Pas encore : ${suivante.txt}.`, 'erreur'); return; }
  occupe = true;
  try { const ok = await executer(carte); if (ok === false) { occupe = false; return; } }
  finally { occupe = false; }
  E.faites.push(carte.id); bouton.disabled = true; bouton.classList.add('fait'); suggerer();
  if (E.faites.length === f.etapes.length) {
    journal('Préparation terminée.');
    $('#etapes').insertAdjacentHTML('afterend', '<button class="principal" id="versControles">Passer aux contrôles</button>');
    $('#versControles').onclick = () => { debloquer('controles'); controles(); ouvrir('controles'); $('#versControles').remove(); };
  }
}

const modal = (d) => new Promise((ok) => { d.onclose = () => ok(d.returnValue); d.returnValue = ''; ouvrirDlg(d); });
/* dialogues ancrés sur le panneau : la scène 3D reste visible */
function ouvrirDlg(d) { document.body.classList.add('dlg-ouvert'); d.addEventListener('close', () => document.body.classList.remove('dlg-ouvert'), { once: true }); d.show(); }

/* ---------- panneau de manipulation sur la scène ---------- */
const hudEl = (() => { const d = document.createElement('div'); d.className = 'hud'; d.hidden = true; document.getElementById('scene').appendChild(d); return d; })();
function hud(titre, texte, valeur = '') {
  hudEl.hidden = false; hudEl.innerHTML = `<div class="hud-tete"><b>${titre}</b><span class="hud-val">${valeur}</span></div><p>${texte}</p><div class="hud-extra"></div><div class="hud-btns"></div>`;
  const zb = hudEl.querySelector('.hud-btns');
  return {
    texte: (t) => { hudEl.querySelector('p').innerHTML = t; }, valeur: (t) => { hudEl.querySelector('.hud-val').innerHTML = t; }, extra: (h) => { hudEl.querySelector('.hud-extra').innerHTML = h; return hudEl.querySelector('.hud-extra'); },
    boutons: (l) => { zb.innerHTML = ''; for (const b of l) { const x = document.createElement('button'); x.type = 'button'; x.textContent = b.t; x.className = b.cls || ''; if (b.id) x.dataset.id = b.id; x.onclick = b.f; zb.appendChild(x); } },
    fermer: () => { hudEl.hidden = true; hudEl.innerHTML = ''; },
  };
}
const couleursPoudres = () => { const cs = E.cibles.filter((t) => t.mode === 'pesee' && !(t.c.volume)).map((t) => t.c.couleur || '#ffffff'); return cs.length ? cs : ['#ffffff']; };

async function gesteTriturer(e) {
  const f = E.f, CIBLE = 4 * 2 * Math.PI; let tot = 0; const cs = couleursPoudres(); p3('grains', 320, cs, 0); p3('pate', false);
  const H = hud('Trituration', 'Décrivez des cercles avec la souris (ou le doigt) autour du mortier : le pilon écrase et mélange. Quatre tours.', '0 %');
  await new Promise((fin) => {
    const avance = (a, d) => { tot += Math.abs(d); p3('pilonA', a); const k = Math.min(1, tot / CIBLE); p3('grains', 320, cs, k); H.valeur(Math.round(k * 100) + ' %'); if (k >= 1) { off(); fin(); } };
    let ang = 0; const off = P ? P.tourner(P.centreMortier(), avance) : () => {};
    H.boutons([{ t: '↻ Tourner (clavier)', f: () => { ang += Math.PI / 2; avance(ang, Math.PI / 2); } }]);
  });
  H.fermer(); p3('grains', 0); p3('pilonRepos'); p3('pate', true, e.pate || f.couleur || '#ffffff');
}
async function gesteTamiser(e) {
  const cs = couleursPoudres(); let n = 0, sens = 0, x = 0; p3('tamis', true); p3('grains', 0);
  const H = hud('Tamisage', 'Secouez le tamis de droite à gauche (glissez sur la scène) : la poudre passe en fines particules.', '0/6');
  await new Promise((fin) => {
    const bouge = (dx) => { x = Math.max(-0.02, Math.min(0.02, x + dx * 0.0004)); p3('tamis', true, x); const s = Math.sign(dx); if (s && s !== sens && Math.abs(x) > 0.008) { if (sens) { n++; H.valeur(`${Math.min(6, n)}/6`); p3('grains', Math.round(320 * Math.min(1, n / 6)), cs, 0); } sens = s; } if (n >= 6) { off(); fin(); } };
    const off = P ? P.secouer(bouge) : () => {};
    H.boutons([{ t: '← Secouer', f: () => { x = 0.015; bouge(-60); } }, { t: 'Secouer →', f: () => { x = -0.015; bouge(60); } }]);
  });
  H.fermer(); p3('tamis', false);
}
async function gesteAgiter(e) {
  const H = hud('Agitation magnétique', 'Réglez la vitesse de l’agitateur, puis lancez : les cristaux se dissolvent.', '');
  const zone = H.extra('<label class="curseur">Vitesse : <b id="agV">0</b> tr/min<input type="range" id="agC" min="0" max="1200" step="50" value="0"></label>');
  const c = zone.querySelector('#agC'); c.oninput = () => { zone.querySelector('#agV').textContent = c.value; p3('ecran', 'agit', c.value + ' tr/min'); };
  await new Promise((ok) => H.boutons([{ t: 'Lancer l’agitation', cls: 'principal', f: ok }]));
  const v = Number(c.value);
  if (v > 900) { erreur('preparation', `Agitation à ${v} tr/min`, 'Trop vive : vortex, projections et mousse. On agite à vitesse modérée (300 à 800 tr/min).'); annonce('Trop vite : projections et mousse.', 'erreur'); }
  else if (v < 150) { erreur('preparation', `Agitation à ${v} tr/min`, 'Trop lente : les cristaux restent au fond. On agite à vitesse modérée (300 à 800 tr/min).'); annonce('Trop lent : les cristaux ne se dissolvent pas.', 'erreur'); }
  const coul = e.teinte || '#e8f2f6'; p3('teinte', coul);
  if (R) await R.tween(2.2, (k) => { p3('dissoudre', v < 150 ? k * 0.3 : k, '#ffffff'); P && P.agiter && 0; });
  p3('dissoudre', 1); p3('ecran', 'agit', '0 tr/min'); H.fermer();
}
async function gestePH(e) {
  const f = E.f; const comp = [];
  for (const t of E.cibles) { if (!t.c.espece) continue; const m = E.pesees[t.c.id] ? E.pesees[t.c.id].reel : t.cible; const esp = { bicarbonate: 84.01, omeprazole: 345.42 }[t.c.espece]; comp.push({ id: t.c.espece, mol: m / esp }); }
  const v = pH(comp, f.ordo.qte / 1000); E.ph = Math.round(v * 100) / 100; const coul = couleurPH(v);
  const echelle = Array.from({ length: 14 }, (_, i) => `<span style="background:${couleurPH(i + 1)}">${i + 1}</span>`).join('');
  const H = hud('Mesure du pH', 'Contrôlez le pH sans contaminer la préparation : papier pH ou tube témoin, puis pH-mètre.', '');
  const zone = H.extra(`<div class="echelle-ph">${echelle}</div><div class="ligne-ph" hidden><label>pH estimé d’après la couleur : <input id="phEst" inputmode="decimal" class="hud-champ"></label></div>`);
  let teste = false;
  await new Promise((ok) => H.boutons([
    { t: 'Tremper une bandelette de papier pH', f: () => { p3('bandelette', true, coul); teste = true; zone.querySelector('.ligne-ph').hidden = false; H.texte('Comparez la couleur de la bandelette à l’échelle.'); } },
    { t: 'Tube témoin : 2 ml + 2 gouttes d’indicateur universel', f: () => { p3('tube', true, coul); teste = true; zone.querySelector('.ligne-ph').hidden = false; H.texte('Comparez la couleur du tube témoin à l’échelle.'); } },
    { t: 'Verser l’indicateur dans la préparation', cls: 'moins', f: () => { erreur('preparation', 'Indicateur coloré versé dans la préparation', 'L’indicateur contamine la préparation : on le met dans un prélèvement (tube témoin) ou on utilise du papier pH.'); annonce('Non : l’indicateur ne va jamais dans la préparation.', 'erreur'); p3('teinte', coul); } },
    { t: 'Mesurer au pH-mètre', cls: 'principal', f: () => { if (!teste) { annonce('Faites d’abord un essai au papier pH ou au tube témoin.', 'erreur'); return; } ok(); } },
  ]));
  const est = lire(zone.querySelector('#phEst').value);
  if (!(Math.abs(est - E.ph) <= 1)) erreur('controles', 'Lecture du papier pH', `La couleur correspondait à un pH d’environ ${Math.round(E.ph)} (valeur exacte au pH-mètre : ${fr(E.ph, 2)}).`);
  await p3('agiter', 0.8); p3('ecran', 'ph', E.ph.toFixed(2), 'pH · 22 °C'); H.fermer();
  annonce('Notez la valeur affichée par le pH-mètre.', '');
}
async function gesteConditionner(e) {
  const noms = { pot: 'Pot', flacon: 'Flacon de verre brun', gelulier: 'Pilulier' };
  const H = hud('Conditionnement', 'Cliquez le conditionnement adapté (sur la paillasse ou ci-dessous).', '');
  const choix = await new Promise((ok) => {
    const off = P ? P.cliquer(Object.values(P.contenants), (o) => { const k = Object.keys(P.contenants).find((x) => P.contenants[x] === o); off(); ok(k); }) : () => {};
    H.boutons(Object.entries(noms).map(([k, t]) => ({ t, f: () => { off(); ok(k); } })));
  });
  H.fermer(); const bon = e.cond === 'pot' && E.f.gelules ? 'pot' : e.cond;
  const ok2 = choix === bon || (E.f.gelules && choix === 'gelulier');
  if (!ok2) { erreur('preparation', `Conditionnement : ${noms[choix].toLowerCase()}`, `Il fallait : ${noms[bon].toLowerCase()} (${E.f.forme.toLowerCase()}).`); annonce(`Pas adapté : ${noms[bon].toLowerCase()}.`, 'erreur'); }
  await p3('conditionner', bon);
}
async function gesteGelules() {
  const f = E.f; const G = [['ouvrir', 'Placer les gélules ouvertes dans le gélulier (corps en bas)', 1], ['araser', 'Répartir la poudre sur la plaque et araser', 2], ['fermer', 'Remettre les têtes et fermer les gélules', 3]];
  const H = hud('Remplissage des gélules', 'Faites les trois gestes dans l’ordre.', '0/3'); let n = 1, faute = false;
  await new Promise((fin) => H.boutons(melanger(G, alea(7)).map(([k, t, o]) => ({ t, f: async () => {
    if (o !== n) { if (!faute) erreur('preparation', 'Ordre du remplissage des gélules', 'Gélules ouvertes dans le gélulier, poudre répartie et arasée, puis fermeture.'); faute = true; annonce('Pas dans cet ordre.', 'erreur'); return; }
    n++; H.valeur(`${n - 1}/3`); if (k === 'ouvrir') p3('gelules', f.n, '#f3f3ef'); if (k === 'araser') { for (let i = 1; i <= 6; i++) { p3('gelules', f.n, i % 2 ? '#ffffff' : '#f3f3ef'); await R.attendre(0.12); } } if (n > 3) fin();
  } }))));
  H.fermer();
}

async function executer(e) {
  const f = E.f; vue(e.vue);
  if (e.bain) { const T = await bainMarie(e); if (T == null) return false; journal(`${e.txt} — consigne ${T} °C`, T > f.temp.max); }
  else if (e.qsp) { const r = await completer(e); if (r == null) return false; journal(`${e.txt} — ${r}`); }
  else if (e.eprouvette) { const r = await eprouvette(); if (r == null) return false; journal(`${e.txt} — ${r}`); }
  else if (e.ph) { await gestePH(e); journal(`${e.txt} — ${fr(E.ph, 2)} au pH-mètre.`); }
  else if (e.anim === 'triturer') { await gesteTriturer(e); journal(e.txt); }
  else if (/^Tamiser/.test(e.txt)) { await gesteTamiser(e); journal(e.txt); }
  else if (e.anim === 'agiter') { await gesteAgiter(e); journal(e.txt); }
  else if (e.anim === 'gelules') { await gesteGelules(); journal(e.txt); }
  else if (e.anim === 'conditionner') { await gesteConditionner(e); journal(e.txt); }
  else journal(e.txt);
  if (e.pate && e.anim !== 'triturer') p3('pate', true, e.pate);
  if (e.teinte && e.anim !== 'agiter') p3('teinte', e.teinte);
  return true;
}

async function bainMarie(e) {
  const f = E.f; const d = $('#dlgBain'); const cur = $('#bainCurseur'); cur.value = 20;
  $('#bainTexte').textContent = e.txt + '. Réglez la consigne.';
  const maj = () => { $('#bainVal').textContent = cur.value; }; cur.oninput = maj; maj();
  if ((await modal(d)) !== 'ok') return null;
  const T = Number(cur.value);
  await R.tween(1.4, (k) => { const t = 20 + (T - 20) * k; $('#bainLecture').textContent = t.toFixed(1); p3('ecran', 'bain', t.toFixed(1) + ' °C', 'consigne ' + T); });
  const max = f.temp.max; const facultatif = e.id === 'chauffe';
  if (T > max) { erreur('preparation', `Bain-marie à ${T} °C`, `Limite de la formule : ${max} °C. ${f.temp.txt}.`); annonce(`${T} °C : au-delà de ${max} °C.`, 'erreur'); }
  else if (!facultatif && T < max - 12) { erreur('preparation', `Bain-marie à ${T} °C : trop froid`, `À ${T} °C la base ne fond pas ; on chauffe vers ${max} °C sans dépasser.`); annonce('Trop froid : la base ne fond pas.', 'erreur'); }
  else annonce(`${T} °C : température adaptée.`, 'bien');
  return T;
}

async function completer(e) {
  const f = E.f; const d = $('#dlgQsp'); const u = f.base.u; const cible = f.ordo.qte;
  let val = 0, outil = null;
  if (u === 'g') {
    val = Object.entries(E.pesees).reduce((a, [, p]) => a + (p.reel || 0), 0);
    $('#qspTexte').textContent = `Flacon taré sur la balance avec les matières premières déjà ajoutées. Complétez avec l'eau purifiée jusqu'à ${frc(cible)} g.`;
    $('#qspChoix').innerHTML = ''; $('#qspUnite').textContent = 'g'; $('#qspPasNom').textContent = 'Eau';
    var pas = [10, 1, 0.1, 0.01];
  } else {
    val = cible * 0.82;
    $('#qspTexte').textContent = `Complétez au volume final de ${frc(cible)} mL à la pissette d'eau purifiée. Choisissez la verrerie : la vue se place à hauteur du trait, le bas du ménisque doit l'affleurer.`;
    const choix = [{ id: 'fj50', nom: 'Fiole jaugée 50 mL', cap: 50, j: true }, { id: 'fj100', nom: 'Fiole jaugée 100 mL', cap: 100, j: true }, { id: 'e100', nom: 'Éprouvette 100 mL', cap: 100 }, { id: 'b250', nom: 'Bécher 250 mL', cap: 250, b: true }];
    $('#qspChoix').innerHTML = `<span>Verrerie</span><div class="pastilles">${choix.map((c) => `<label><input type="radio" name="qspv" value="${c.id}">${c.nom}</label>`).join('')}</div>`;
    $$('input[name=qspv]', d).forEach((i) => i.onchange = async () => { outil = choix.find((c) => c.id === i.value); await p3('qsp', outil.j ? 'fiole' : outil.b ? 'becher' : 'eprouvette', outil.cap, cible); p3('niveau', val); });
    $('#qspUnite').textContent = 'mL'; $('#qspPasNom').textContent = 'Eau';
    var pas = [5, 1, 0.5, 0.1];
  }
  const maj = () => { $('#qspLecture').textContent = u === 'g' ? val.toFixed(2) : val.toFixed(1); if (u === 'g') p3('ecran', 'balance', val.toFixed(2) + ' g', 'qsp ' + cible + ' g'); };
  $('#qspPas').innerHTML = pas.map((p) => `<button type="button" data-p="${p}">+ ${String(p).replace('.', ',')}</button>`).join('') + pas.map((p) => `<button type="button" class="moins" data-p="${-p}">− ${String(p).replace('.', ',')}</button>`).join('');
  $$('#qspPas button').forEach((b) => b.onclick = () => { const p = Number(b.dataset.p); val = Math.max(0, +(val + p).toFixed(3)); maj(); p3('niveau', val); if (p > 0) p3('jet', Math.min(0.6, 0.2 + p / 25)); });
  maj(); if (u === 'g') { vue('balance'); p3('qsp', 'balance'); }
  const rep = await modal(d); const v0 = vueCourante; vueCourante = null; p3('qsp', null); vue(v0 || 'ensemble');
  if (rep !== 'ok') return null;
  if (u === 'mL') {
    const exacte = [50, 100].includes(cible);
    if (!outil) erreur('preparation', 'Volume complété sans verrerie choisie', 'Le volume final se mesure en fiole jaugée (ou en éprouvette si aucune fiole ne correspond).');
    else if (outil.b) erreur('preparation', 'Volume complété au bécher', 'Un bécher n\'est pas un instrument de mesure : fiole jaugée du volume final.');
    else if (exacte && !(outil.j && outil.cap === cible)) erreur('preparation', `${outil.nom} pour ${cible} mL`, `Pour ${cible} mL, la fiole jaugée de ${cible} mL est la plus juste.`);
    else if (!exacte && outil.j) erreur('preparation', `${outil.nom} pour ${cible} mL`, `Une fiole jaugée ne mesure que son propre volume : pour ${cible} mL, éprouvette de 100 mL.`);
  }
  const ec = (val - cible) / cible;
  if (Math.abs(ec) > REGLES.tolQsp) { erreur('preparation', `Quantité finale ${frc(val)} ${u} au lieu de ${frc(cible)} ${u}`, `Tolérance du TP : ± ${REGLES.tolQsp * 100} %.`); annonce('Le trait n\'est pas atteint (ou dépassé).', 'erreur'); }
  E.qsp = val; return `${frc(val)} ${u}`;
}

async function eprouvette() {
  const f = E.f; const d = $('#dlgEprouvette'); const cur = $('#eprCurseur');
  const mActif = E.pesees.spiro ? E.pesees.spiro.reel : f.dose * f.n / 1000; const vActif = mActif / f.densiteActif; const cible = f.n * GELULES[f.taille]; const cap = 10;
  $('#eprTexte').textContent = `Éprouvette de 10 mL. La spironolactone pesée (${frc(mActif)} g) occupe ${fr(vActif, 2)} mL. Versez le lactose jusqu'au volume total des ${f.n} gélules n° ${f.taille}.`;
  cur.min = 0; cur.max = cap; cur.step = 0.05; cur.value = vActif.toFixed(2);
  const maj = () => { const v = Math.max(Number(cur.value), vActif); $('#eprVal').textContent = fr(v, 2); $('#eprActif').style.height = (100 * vActif / cap) + '%'; $('#eprExc').style.height = (100 * v / cap) + '%'; $('#eprExc').style.zIndex = 0; };
  cur.oninput = maj; maj();
  if ((await modal(d)) !== 'ok') return null;
  const v = Math.max(Number(cur.value), vActif); const ec = (v - cible) / cible;
  if (Math.abs(ec) > REGLES.tolPesee) { erreur('preparation', `Volume de poudre ${fr(v, 2)} mL au lieu de ${fr(cible, 2)} mL`, `${f.n} gélules n° ${f.taille} × ${fr(GELULES[f.taille], 2)} mL. Trop de poudre : gélules qui débordent ; pas assez : gélules sous-dosées en volume et masse irrégulière.`); annonce('Volume total incorrect.', 'erreur'); }
  E.lactose = (v - vActif) * f.densiteExc; E.volPoudre = v;
  return `${fr(v, 2)} mL, soit ${frc(E.lactose)} g de lactose`;
}

/* ---------- 4. contrôles et étiquette ---------- */
function controles() {
  const f = E.f; const C = f.controles; const r = alea(hash(f.id + 'ctl')); const F = $('#controles'); let h = '';
  const asp = melanger([C.aspect.bon, ...C.aspect.faux], r);
  h += `<div class="bloc"><h3>Aspect</h3><p>Observez la préparation terminée.</p><div class="radios">${asp.map((a, i) => `<label><input type="radio" name="aspect" value="${i}">${a}</label>`).join('')}</div></div>`;
  E.aspects = asp;
  if (C.ph) h += `<div class="bloc"><h3>pH</h3><p>Spécification du TP : ${fr(C.ph.min, 1)} à ${fr(C.ph.max, 1)} (${C.ph.txt}).</p>
    <div class="ligne"><label for="c_ph">pH lu sur le pH-mètre</label><input type="text" id="c_ph" inputmode="decimal"></div>
    <div class="ligne"><label for="c_phok">Conforme ?</label><select id="c_phok"><option value="">—</option><option value="oui">Oui</option><option value="non">Non</option></select></div></div>`;
  if (C.uniformite) {
    const m0 = ((E.pesees.spiro ? E.pesees.spiro.reel : f.dose * f.n / 1000) + (E.lactose || 0)) / f.n * 1000;
    const ms = []; for (let i = 0; i < 20; i++) { const g = (r() + r() + r() - 1.5) * 0.045; ms.push(m0 * (1 + g)); }
    ms[Math.floor(r() * 20)] = m0 * 1.115; E.masses = ms.map((x) => Math.round(x * 10) / 10);
    h += `<div class="bloc"><h3>Uniformité de masse (Ph. Eur. 2.9.5)</h3><p>Contenu de 20 gélules prises au hasard (mg). Moins de 300 mg : écart toléré ± 10 % de la moyenne ; au plus 2 unités au-delà, aucune au-delà de 20 %.</p>
      <div class="masses">${E.masses.map((m) => `<span>${fr(m, 1)}</span>`).join('')}</div>
      <div class="ligne"><label for="u_moy">Masse moyenne (mg)</label><input type="text" id="u_moy" inputmode="decimal"></div>
      <div class="ligne"><label for="u_bas">Limite basse (mg)</label><input type="text" id="u_bas" inputmode="decimal"></div>
      <div class="ligne"><label for="u_haut">Limite haute (mg)</label><input type="text" id="u_haut" inputmode="decimal"></div>
      <div class="ligne"><label for="u_hors">Nombre d'unités hors limites</label><input type="text" id="u_hors" inputmode="numeric"></div>
      <div class="ligne"><label for="u_ok">Lot conforme ?</label><select id="u_ok"><option value="">—</option><option value="oui">Oui</option><option value="non">Non</option></select></div></div>`;
  }
  const ments = melanger(MENTIONS, r);
  h += `<div class="bloc"><h3>Étiquette</h3><p>Cochez les mentions de l'étiquette. N° d'ordonnancier : <code>${E.ordonnancier}</code>.</p>
    <div class="mentions">${ments.map((m) => `<label><input type="checkbox" name="mention" value="${m.id}"> ${m.txt}</label>`).join('')}</div>
    <div class="ligne"><label for="e_dlu">Date limite d'utilisation</label><input type="date" id="e_dlu"></div></div>
    <button type="submit" class="principal">Valider, imprimer l'étiquette</button><div class="retour" id="retourCtl"></div>`;
  F.innerHTML = h; F.onsubmit = (ev) => { ev.preventDefault(); corrigerControles(); };
  vue('conditionnement');
}

function corrigerControles() {
  if (E.controlesFaits) return; E.controlesFaits = true;
  const f = E.f; const C = f.controles; const res = [];
  const marque = (el, ok) => { if (el) { el.classList.add(ok ? 'ok' : 'ko'); el.disabled = true; } };
  const a = $('input[name=aspect]:checked'); const aOk = a && E.aspects[a.value] === C.aspect.bon;
  if (!aOk) erreur('controles', 'Aspect', `Attendu : ${C.aspect.bon}.`); res.push([aOk, `Aspect : ${C.aspect.bon}`]);
  $$('input[name=aspect]').forEach((i) => { i.disabled = true; });
  if (C.ph) {
    const v = lire($('#c_ph').value); const ok1 = Math.abs(v - E.ph) <= 0.05; marque($('#c_ph'), ok1);
    if (!ok1) erreur('controles', 'pH lu', `Le pH-mètre affichait ${fr(E.ph, 2)}.`);
    const conf = E.ph >= C.ph.min && E.ph <= C.ph.max ? 'oui' : 'non'; const ok2 = $('#c_phok').value === conf; marque($('#c_phok'), ok2);
    if (!ok2) erreur('controles', 'Conformité du pH', `${fr(E.ph, 2)} ${conf === 'oui' ? 'est' : 'n\'est pas'} dans ${fr(C.ph.min, 1)}–${fr(C.ph.max, 1)}.`);
    res.push([ok1 && ok2, `pH ${fr(E.ph, 2)} : ${conf === 'oui' ? 'conforme' : 'non conforme'}`]);
  }
  if (C.uniformite) {
    const moy = E.masses.reduce((x, y) => x + y, 0) / 20; const bas = moy * 0.9, haut = moy * 1.1;
    const hors = E.masses.filter((m) => m < bas || m > haut).length; const hors20 = E.masses.filter((m) => m < moy * 0.8 || m > moy * 1.2).length; const conf = hors <= 2 && hors20 === 0 ? 'oui' : 'non';
    const t = [['#u_moy', moy, 0.5, 'Masse moyenne'], ['#u_bas', bas, 0.5, 'Limite basse (moyenne − 10 %)'], ['#u_haut', haut, 0.5, 'Limite haute (moyenne + 10 %)'], ['#u_hors', hors, 0, 'Unités hors limites']];
    let tout = true;
    for (const [sel, val, tol, nom] of t) { const ok = Math.abs(lire($(sel).value) - val) <= tol; marque($(sel), ok); if (!ok) { tout = false; erreur('controles', nom, `Valeur juste : ${fr(val, tol ? 1 : 0)}.`); } }
    const okc = $('#u_ok').value === conf; marque($('#u_ok'), okc); if (!okc) { tout = false; erreur('controles', 'Conclusion de l\'uniformité de masse', `${hors} unité(s) hors ± 10 %, ${hors20} hors ± 20 % : lot ${conf === 'oui' ? 'conforme' : 'non conforme'}.`); }
    res.push([tout, `Uniformité : moyenne ${fr(moy, 1)} mg, limites ${fr(bas, 1)}–${fr(haut, 1)} mg, ${hors} hors limites → ${conf === 'oui' ? 'conforme' : 'non conforme'}`]);
  }
  // étiquette
  const coche = new Set($$('input[name=mention]:checked').map((i) => i.value)); $$('input[name=mention]').forEach((i) => { i.disabled = true; });
  const attendues = new Set([...MENTIONS.filter((m) => m.toujours).map((m) => m.id), ...(f.mentions || [])]);
  const manque = [...attendues].filter((m) => !coche.has(m)); const trop = [...coche].filter((m) => !attendues.has(m));
  const nom = (id) => MENTIONS.find((m) => m.id === id).txt;
  manque.forEach((m) => erreur('etiquette', `Mention manquante : ${nom(m)}`, m === 'ci3ans' ? 'Le cérat de Galien contient du borax.' : m === 'inflammable' ? 'Solution alcoolique.' : m === 'een' ? `Excipients à effet notoire : ${f.een}.` : m === 'agiter' ? 'Suspension : les particules sédimentent.' : ''));
  trop.forEach((m) => erreur('etiquette', `Mention inutile : ${nom(m)}`, MENTIONS.find((x) => x.id === m).piege ? 'Mention propre aux spécialités, pas à une préparation magistrale.' : 'Ne concerne pas cette préparation.'));
  const dEl = $('#e_dlu'); const dv = dEl.value; let dOk;
  if (f.conservation.dlu) { dOk = dv === iso(plusJours(f.conservation.dlu)); if (!dOk) erreur('etiquette', 'Date limite d\'utilisation', `${f.conservation.dluTxt} : ${dateFr(plusJours(f.conservation.dlu))}.`); }
  else { dOk = !!dv && dv > iso(aujourdhui()) && dv <= iso(plusJours(365)); if (!dOk) erreur('etiquette', 'Date limite d\'utilisation absente ou invraisemblable', `Durée ${f.conservation.dluTxt}.`); }
  marque(dEl, dOk);
  res.push([!manque.length && !trop.length && dOk, `Étiquette : ${manque.length} mention(s) manquante(s), ${trop.length} inutile(s)`]);
  // aperçu de l'étiquette
  const compo = E.cibles.map((t) => `${t.c.nom.replace(/ \(.*\)/, '')} ${t.mode === 'qsp' ? (f.gelules ? 'qsp 1 gélule' : t.qspTxt) : t.mode === 'unites' ? frc(t.c.q * f.ordo.qte / f.base.q) + ' mg' : frc(f.gelules ? f.dose : t.calc) + ' ' + (f.gelules ? 'mg/gélule' : t.calcU)}`).join(' · ');
  const dlu = dv ? dateFr(new Date(dv + 'T12:00:00')) : '—';
  $('#retourCtl').innerHTML = `<div class="etiquette-apercu"><h4>${f.nom}</h4>
    <div>${compo}</div>
    <div class="mono">${f.gelules ? f.n + ' gélules n° ' + f.taille : frc(f.ordo.qte) + ' ' + f.base.u} · ${f.voie}${coche.has('posologie') ? ' · ' + f.ordo.texte.replace(/^[^.]*\.\s*/, '') : ''}</div>
    <div class="mono">${f.ordo.patient} · ${f.ordo.prescripteur.split(',')[0]} · Ord. n° ${E.ordonnancier}</div>
    <div class="mono">Préparé le ${dateFr(aujourdhui())} · À utiliser avant le ${dlu} · ${f.conservation.txt}</div>
    ${coche.has('een') ? `<div class="mono">Excipients à effet notoire : ${f.een || '—'}</div>` : ''}
    ${['agiter', 'ne_pas_avaler', 'inflammable', 'ci3ans'].filter((m) => coche.has(m)).map((m) => `<div class="alerte">${nom(m).replace(/[«»]/g, '').trim()}</div>`).join('')}
    <div class="mono">${PHARMACIE}</div></div>
    <ul>${res.map(([ok, t]) => `<li class="${ok ? 'ok' : 'ko'}">${t}</li>`).join('')}</ul>
    <button class="principal" id="versBilan">Voir le bilan</button>`;
  $('#versBilan').onclick = () => { E.fini = true; debloquer('bilan'); bilan(); ouvrir('bilan'); };
  vue('conditionnement');
}

/* ---------- 5. bilan ---------- */
function bilan() {
  const f = E.f; const secs = f.composants ? Object.keys(BAREME) : ['analyse'];
  const tot = secs.reduce((a, s) => a + BAREME[s], 0);
  const pts = Object.fromEntries(secs.map((s) => [s, Math.max(0, BAREME[s] - E.erreurs.filter((e) => e.sec === s).length * (s === 'analyse' ? BAREME.analyse : 1))]));
  const note = Math.round(20 * secs.reduce((a, s) => a + pts[s], 0) / tot * 2) / 2;
  const src = f.source;
  $('#bilan').innerHTML = `<div class="bloc"><div class="note">${fr(note, note % 1 ? 1 : 0)}<small style="font-size:1rem">/20</small></div><p>${f.nom} — ${f.ordo.patient}</p>
    ${secs.map((s) => `<div class="barre"><span>${NOMS_SECTION[s]}</span><i><b style="width:${100 * pts[s] / BAREME[s]}%"></b></i><span>${pts[s]}/${BAREME[s]}</span></div>`).join('')}</div>
    <div class="bloc"><h3>À revoir</h3>${E.erreurs.length ? `<ul>${E.erreurs.map((e) => `<li class="ko"><b>${e.txt}</b>${e.pourquoi ? ` — ${e.pourquoi}` : ''}</li>`).join('')}</ul>` : '<p>Aucune erreur.</p>'}</div>
    ${f.composants ? `<div class="bloc"><h3>Mode opératoire de référence</h3><ol>${f.etapes.map((e) => `<li>${e.txt}</li>`).join('')}</ol>
      <p class="sources">Conservation : ${f.conservation.txt} · durée : ${f.conservation.dluTxt}.${f.note ? ' ' + f.note : ''}</p></div>` : ''}
    <div class="bloc"><h3>Source</h3><p class="sources">${src.titre}<br><code>${src.url}</code></p></div>
    <button class="principal" id="autre">Faire une autre préparation</button>`;
  $('#autre').onclick = () => { const i = FORMULES.indexOf(f); const s = $('#choixFormule'); s.selectedIndex = (i + 1) % FORMULES.length; charger(FORMULES[s.selectedIndex]); };
  window.__magResultat = { id: f.id, note, erreurs: E.erreurs.length };
}

/* ---------- lancement ---------- */
function charger(f) {
  nouvelEtat(f);
  $$('.onglets button').forEach((b) => { b.disabled = b.dataset.ong !== 'ordonnance'; });
  $('#pesees').innerHTML = ''; $('#retourPesee').innerHTML = ''; $('#etapes').innerHTML = ''; $('#journalPrep').innerHTML = ''; $('#controles').innerHTML = ''; $('#bilan').innerHTML = '';
  const b = $('#versControles'); if (b) b.remove();
  ouvrir('ordonnance'); afficherOrdonnance();
  p3('pate', false); p3('gelules', 0); p3('teinte', '#d8e8f0'); p3('ecran', 'balance', '0.00', 'g'); p3('ecran', 'ph', '7.00', 'pH'); p3('ecran', 'bain', '20.0 °C'); vue('ensemble');
}

function init() {
  const s = $('#choixFormule');
  s.innerHTML = FORMULES.map((f, i) => `<option value="${i}">${f.nom}${f.variante ? '' : ''}</option>`).join('');
  s.onchange = () => charger(FORMULES[s.value]);
  $('#formuleHasard').onclick = () => { s.value = Math.floor(Math.random() * FORMULES.length); charger(FORMULES[s.value]); };
  $$('.onglets button').forEach((b) => b.onclick = () => { if (!b.disabled) ouvrir(b.dataset.ong); });
  $$('.outils-scene button').forEach((b) => b.onclick = () => vue(b.dataset.vue));
  $('#guide').onchange = () => { if (E && E.cartes) suggerer(); };
  const q = new URLSearchParams(location.search).get('prep'); const i = Math.max(0, FORMULES.findIndex((f) => f.id === q));
  s.value = i; charger(FORMULES[i]);
  window.__mag = { charger, FORMULES, get E() { return E; }, get P() { return P; } };
}

init();
demarrer3D().then(() => { if (E) vue('ensemble'); window.__magPret = true; });
