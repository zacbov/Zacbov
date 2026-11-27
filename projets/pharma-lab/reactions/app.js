/* TP 3 — réactions de base : dosages (colorimétrique, pH-métrique), caractérisations en tubes, paillasse libre. */
import { creerRendu } from '../chimio/scene3d.js';
import { creerReactions } from './scene.js';
import { pH as calculPH, couleurPH } from '../magistrales/chimie.js';
import { REACTIFS, INDICATEURS, TESTS, ECHANTILLONS, MISSIONS, VERRERIE_PRISE, SOURCES } from './donnees.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const fr = (x, d = 2) => (x == null || Number.isNaN(x) ? '—' : Number(x).toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d }));
const lire = (v) => { const n = parseFloat(String(v).replace(/\s/g, '').replace(',', '.')); return Number.isFinite(n) ? n : NaN; };
const hash = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const alea = (g) => { let a = g || 1; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const melanger = (arr, r) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const LETTRE = (i) => String.fromCharCode(65 + i);

const VUES = { ensemble: ['Paillasse', 'laboratoire de chimie'], titrage: ['Dosage', 'burette, agitateur, pH-mètre'], becher: ['Bécher', 'couleur de la solution'], burette: ['Burette', 'lecture du volume'], tubes: ['Tubes à essai', 'portoir, compte-gouttes'], tubesPres: ['Tubes à essai', 'de près'], bainmarie: ['Bain-marie', 'chauffage des tubes'], phmetre: ['pH-mètre', 'étalonnage'] };
let R, S, E = null; const FAITES = {}; let elec = false, offClic = null;
const guide = () => $('#guide').checked;
const p3 = (f, ...a) => (S && S[f] ? S[f](...a) : Promise.resolve());
let vueCourante = null;
const vue = (k) => { if (!S) return; if (k !== vueCourante) S.regarder(k); vueCourante = k; const [a, b] = VUES[k] || VUES.ensemble; $('#vignetteNom').textContent = a; $('#vignetteSous').textContent = b; $$('.outils-scene button').forEach((x) => x.classList.toggle('actif', x.dataset.vue === k)); };
function annonce(txt, type = '') { const a = $('#annonce'); a.textContent = txt; a.className = 'annonce ' + type; a.hidden = false; clearTimeout(annonce.t); annonce.t = setTimeout(() => { a.hidden = true; }, 4200); }
const journal = (txt, ko = false, petit = '') => $('#journal').insertAdjacentHTML('beforeend', `<li class="${ko ? 'ko' : ''}">${txt}${petit ? `<small>${petit}</small>` : ''}</li>`);
function erreur(txt, pourquoi, pts = 2) { E.erreurs.push({ txt, pourquoi, pts }); journal(txt, true, pourquoi); annonce(pourquoi || txt, 'erreur'); }

/* ---------- onglets ---------- */
function ouvrir(o) { $$('.onglets button').forEach((b) => b.classList.toggle('actif', b.dataset.ong === o)); $$('.volet').forEach((v) => v.classList.toggle('actif', v.dataset.volet === o)); }
$$('.onglets button').forEach((b) => b.onclick = () => { if (!b.disabled) ouvrir(b.dataset.ong); });
$$('.outils-scene button').forEach((b) => b.onclick = () => { vueCourante = null; vue(b.dataset.vue); });

/* ---------- couleurs ---------- */
const hex = (c) => { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const mix = (a, b, t) => { const A = hex(a), B = hex(b); return '#' + A.map((x, i) => Math.round(x + (B[i] - x) * t).toString(16).padStart(2, '0')).join(''); };
function couleurIndic(id, p) {        // [couleur, opacité]
  const I = INDICATEURS[id]; if (!I) return ['#e8f2f6', 0.3];
  if (I.universel) { const m = couleurPH(p).match(/\d+/g).map(Number); return ['#' + m.map((x) => x.toString(16).padStart(2, '0')).join(''), 0.8]; }
  const t = Math.max(0, Math.min(1, (p - I.bas) / (I.haut - I.bas)));
  if (!I.acide) return t <= 0 ? ['#eef4f6', 0.3] : [mix('#f6e6ef', I.base, t), 0.35 + 0.5 * t];
  return [mix(I.acide, I.base, t), 0.8];
}

/* ---------- liste des missions ---------- */
function listeMissions() {
  $('#listeMissions').innerHTML = MISSIONS.map((m) => `<button class="mission ${FAITES[m.id] != null ? 'fait' : ''}" data-id="${m.id}"><span class="ic">${m.icone}</span><b>${m.titre}</b><span>${m.resume}</span>${FAITES[m.id] != null ? `<i class="note">Dernière note : ${FAITES[m.id]}/20</i>` : ''}</button>`).join('');
  $$('#listeMissions .mission').forEach((b) => b.onclick = () => lancer(b.dataset.id));
}

/* ---------- moteur des étapes (débloquées l'une après l'autre) ---------- */
function etapes(liste) {
  const zone = $('#mEtapes'); zone.innerHTML = '';
  const els = liste.map((e, i) => { const d = document.createElement('div'); d.className = 'etape' + (i ? ' attente' : ''); d.innerHTML = `<h4>${i + 1}. ${e.titre}<small>${e.sous || ''}</small></h4>${e.aide ? `<p>${e.aide}</p>` : ''}<div class="actions"></div><div class="resultat"></div>`; zone.appendChild(d); return d; });
  let i = 0;
  const suivant = () => { els[i].classList.add('faite'); i++; if (i < els.length) { els[i].classList.remove('attente'); demarrer(); els[i].scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } };
  const demarrer = () => { const e = liste[i], el = els[i]; e.vue && vue(e.vue); e.faire(el.querySelector('.actions'), (txt) => { if (txt) el.querySelector('.resultat').innerHTML = txt; suivant(); }, el); };
  demarrer();
}
const boutons = (zone, liste) => { zone.innerHTML = ''; return liste.map((b) => { const x = document.createElement('button'); x.type = 'button'; x.innerHTML = b.t; if (b.cls) x.className = b.cls; x.onclick = () => b.f(x); zone.appendChild(x); return x; }); };

/* ---------- lancement ---------- */
function lancer(id) {
  const m = MISSIONS.find((x) => x.id === id); const r = alea(hash(id + new Date().toISOString().slice(0, 10) + Math.random()));
  E = { m, r, erreurs: [], q: {}, debut: Date.now() };
  window.__rxEtat = E;
  $('#mTitre').textContent = m.titre; $('#mResume').textContent = m.resume; $('#mRappel').innerHTML = guide() && m.rappel ? m.rappel : '';
  $('#journal').innerHTML = ''; $('[data-ong="paillasse"]').disabled = false; ouvrir('paillasse');
  remiseAZero();
  if (m.type === 'titrage') titrage(m); else if (m.type === 'tubes') tubesMission(m); else libre();
}
function remiseAZero() {
  clearInterval(robinetT); offClic && offClic(); offClic = null;
  p3('liquide', 0); p3('buretteNiveau', 0, false); p3('agiter', 0); p3('ecran', 'ph', '----', 'pH'); p3('bain', 20);
  if (S) { for (let i = 0; i < 3; i++) S.tube(i, { v: 0 }); for (const id in S.flacons) S.flacons[id].visible = false; if (elec) S.plongerElectrode(false); }
  elec = false;
}
const plonger = async () => { if (!elec) { elec = true; await p3('plongerElectrode', true); } };

/* =====================================================================
   DOSAGES
   ===================================================================== */
function etatTitrage() {
  const T = E.T; const comp = [{ id: 'acetique', mol: T.Ca * T.Va / 1000 }, { id: 'naoh', mol: T.Cb * T.Vb / 1000 }];
  return calculPH(comp, (T.Va + T.Vb + T.eau) / 1000);
}
function majTitrage() {
  const T = E.T, p = etatTitrage(); T.pH = p;
  const [c, o] = T.indic ? couleurIndic(T.indic, p) : ['#e8f2f6', 0.3];
  p3('liquide', T.Va + T.Vb + T.eau, c, o); p3('buretteNiveau', T.Vb, T.plein);
  if (elec) p3('ecran', 'ph', p.toFixed(2), 'pH · 22 °C');
  const l = $('#lectureV'); if (l) l.textContent = fr(Math.round(T.Vb * 20) / 20, 2);
  if (E.m.id === 'phmetrie') { const lp = $('#lecturePH'); if (lp) lp.textContent = elec ? fr(p, 2) : '—'; }
}
function titrage(m) {
  const pm = m.id === 'phmetrie';
  E.T = { Ca: Math.round((0.075 + E.r() * 0.05) * 1000) / 1000, Va: 0, Cb: 0.1, Vb: 0, eau: 0, plein: false, indic: null, pH: 7, points: [], debit: 0 };
  const T = E.T; T.Veq = T.Ca * 20 / T.Cb;
  const liste = [];
  if (pm) liste.push({ titre: 'Étalonner le pH-mètre', sous: 'tampons', vue: 'phmetre', aide: "Étalonnez avec deux solutions tampons qui encadrent les pH attendus, en rinçant l'électrode à l'eau purifiée entre chaque.", faire: (z, fin) => {
    const fait = {}; let rince = false;
    boutons(z, [
      { t: 'Rincer l’électrode (pissette)', f: () => { rince = true; journal('Électrode rincée à l’eau purifiée'); } },
      { t: 'Tampon pH 7,00', f: (x) => act('t7', x) }, { t: 'Tampon pH 4,01', f: (x) => act('t4', x) },
      { t: 'Étalonner dans la solution à doser', cls: 'moins', f: () => erreur('Étalonnage dans la solution à doser', "On étalonne avec des tampons de pH connu ; la solution à doser a un pH inconnu.") },
    ]);
    function act(k, x) {
      if (fait[k]) return;
      if (!rince) erreur('Électrode non rincée avant le tampon', 'Rincez l’électrode à l’eau purifiée avant chaque solution : sinon on pollue le tampon.', 1);
      if (k === 't4' && !fait.t7) erreur('Tampon 4 avant le tampon 7', "On commence par le tampon de pH 7 (point zéro de l'électrode), puis on règle la pente avec le tampon 4.", 1);
      rince = false; fait[k] = true; x.classList.add('choisi'); p3('ecran', 'ph', k === 't7' ? '7.00' : '4.01', k === 't7' ? 'étalonnage' : 'pente 98,6 %');
      if (fait.t7 && fait.t4) { journal('pH-mètre étalonné (tampons 7,00 et 4,01)'); fin('Étalonnage : pente 98,6 %.'); }
    }
  } });
  liste.push({ titre: "Prélever la prise d'essai", sous: '20,0 mL', vue: 'titrage', aide: "Solution d'acide acétique de concentration inconnue (≈ 0,1 mol/L). Prélevez exactement 20,0 mL dans le bécher.", faire: (z, fin) => {
    boutons(z, VERRERIE_PRISE.map((v) => ({ t: v.nom, f: async () => { if (!v.ok) erreur(`Prise d'essai à ${v.nom.toLowerCase()}`, v.pourquoi, 3); z.innerHTML = ''; T.Va = 20; await p3('pipetter'); majTitrage(); journal(`Prise d'essai : 20,0 mL (${v.nom.toLowerCase()})`); fin(`20,0 mL d'acide acétique dans le bécher.`); } })));
  } });
  if (pm) liste.push({ titre: "Immerger l'électrode", sous: 'eau purifiée', vue: 'titrage', aide: "Le bulbe de l'électrode doit tremper. Faut-il compléter avec de l'eau purifiée ? Cela change-t-il le volume équivalent ?", faire: (z, fin) => {
    boutons(z, [{ t: 'Ajouter 20 mL d’eau purifiée, puis plonger l’électrode', f: async () => { T.eau = 20; z.innerHTML = ''; await plonger(); majTitrage(); journal("20 mL d'eau ajoutés, électrode immergée (la dilution ne change pas la quantité d'acide)"); fin("L'eau ajoutée ne change ni n(acide) ni Veq."); } },
      { t: 'Plonger l’électrode sans rien ajouter', f: async () => { z.innerHTML = ''; await plonger(); erreur('Électrode mal immergée', "Avec 20 mL dans ce bécher, le bulbe affleure : la mesure est instable. On ajoute de l'eau purifiée (sans effet sur Veq).", 1); majTitrage(); fin(''); } }]);
  } });
  if (!pm) liste.push({ titre: "Choisir l'indicateur coloré", sous: '2 gouttes', vue: 'becher', aide: "Le pH à l'équivalence d'un acide faible dosé par une base forte est basique. Choisissez l'indicateur dont la zone de virage contient ce pH.", faire: (z, fin) => {
    boutons(z, ['helianthine', 'bbt', 'phenol'].map((k) => ({ t: `${INDICATEURS[k].nom} <small>(${fr(INDICATEURS[k].bas, 1)}–${fr(INDICATEURS[k].haut, 1)})</small>`, f: () => {
      T.indic = k; z.innerHTML = ''; majTitrage();
      if (k === 'helianthine') erreur("Hélianthine pour doser l'acide acétique", "Zone de virage 3,1–4,4 : elle vire bien avant l'équivalence (pH ≈ 8,7), dès le premier tiers du dosage.", 4);
      else if (k === 'bbt') erreur('Bleu de bromothymol', "Zone 6,0–7,6 : il vire juste avant l'équivalence (pH ≈ 8,7). Acceptable pour un acide fort ; la phénolphtaléine (8,2–10) est le bon choix ici.", 1);
      journal(`Indicateur : ${INDICATEURS[k].nom}`); fin(`${INDICATEURS[k].nom} : solution ${k === 'phenol' ? 'incolore' : k === 'bbt' ? 'jaune' : 'rouge'} en milieu acide.`);
    } })));
  } });
  liste.push({ titre: 'Préparer la burette de soude', sous: 'NaOH 0,100 mol/L', vue: 'burette', aide: 'La burette sort du lavage, encore mouillée d’eau. Faites les gestes nécessaires (dans l’ordre de votre choix), puis validez.', faire: (z, fin) => {
    const g = { rincer: false, remplir: false, bulle: false, zero: false };
    const bs = boutons(z, [
      { t: 'Rincer deux fois avec un peu de soude', f: (x) => { g.rincer = true; x.classList.add('choisi'); } },
      { t: 'Remplir au-dessus du zéro', f: (x) => { if (!g.rincer) erreur('Burette remplie sans rinçage à la soude', "L'eau restée dans la burette dilue la soude : la concentration n'est plus 0,100 mol/L. On rince avec le réactif.", 2); g.remplir = true; x.classList.add('choisi'); T.plein = true; majTitrage(); } },
      { t: 'Chasser la bulle sous le robinet', f: (x) => { g.bulle = true; x.classList.add('choisi'); } },
      { t: 'Ajuster le bas du ménisque au zéro', f: (x) => { if (!g.remplir) { annonce('Remplissez d’abord.', 'erreur'); return; } if (!g.bulle) erreur('Zéro ajusté avant de chasser la bulle', 'La bulle sous le robinet part pendant le dosage et fausse le volume lu : on la chasse avant d’ajuster le zéro.', 2); g.zero = true; x.classList.add('choisi'); } },
      { t: 'Valider', cls: 'principal', f: () => { if (!g.remplir || !g.zero) { annonce('Remplissez et ajustez le zéro.', 'erreur'); return; } if (!g.bulle) erreur('Bulle non chassée', 'Une bulle sous le robinet fausse le volume versé.', 2); z.innerHTML = ''; journal('Burette rincée, remplie, zéro ajusté'); fin('Burette prête : 0,00 mL.'); } },
    ]);
  } });
  if (!pm) liste.push({ titre: 'Agitation', sous: 'agitateur magnétique', vue: 'titrage', aide: 'Réglez une agitation régulière, sans vortex ni projections.', faire: (z, fin) => agitation(z, fin) });
  else liste.push({ titre: 'Agitation', sous: 'agitateur magnétique', vue: 'titrage', aide: 'Agitation douce : le barreau ne doit pas heurter l’électrode.', faire: (z, fin) => agitation(z, fin) });
  liste.push({ titre: pm ? 'Doser en relevant le pH' : 'Doser jusqu’au virage', sous: pm ? 'courbe pH = f(V)' : 'goutte à goutte à la fin', vue: 'titrage', aide: pm ? 'Versez la soude par ajouts successifs et relevez le pH après chaque ajout. Resserrez les ajouts autour du saut de pH, puis continuez jusqu’à 30 mL.' : 'Ouvrez le robinet, puis passez au goutte-à-goutte quand la couleur commence à persister. Fermez au virage : première teinte persistante.', faire: (z, fin) => pm ? doserPH(z, fin) : doserColor(z, fin) });
  liste.push({ titre: 'Exploiter', sous: 'calculs', vue: pm ? 'titrage' : 'burette', aide: pm ? 'Lisez Veq au milieu du saut de pH, puis le pH à Veq/2.' : 'Notez le volume versé au virage et calculez la concentration de l’acide.', faire: (z, fin) => exploiter(z, fin, pm) });
  etapes(liste);
}
function agitation(z, fin) {
  z.innerHTML = '<label class="curseur" style="width:100%">Vitesse : <b id="agV">0</b> tr/min<input type="range" id="agC" min="0" max="1200" step="50" value="0"></label>';
  const c = $('#agC', z); c.oninput = () => { $('#agV', z).textContent = c.value; p3('agiter', Number(c.value)); };
  boutons(z.appendChild(document.createElement('div')), [{ t: 'Valider la vitesse', cls: 'principal', f: () => { const v = Number(c.value); if (v > 900) erreur(`Agitation à ${v} tr/min`, 'Trop vive : vortex, projections (et électrode heurtée).', 1); else if (v < 150) erreur(`Agitation à ${v} tr/min`, 'Trop lente : la soude ne se mélange pas, le virage apparaît localement et trompe.', 1); journal(`Agitation : ${v} tr/min`); z.innerHTML = ''; fin(`${v} tr/min.`); } }]);
}
/* robinet de la burette : fermé, goutte à goutte (≈ 0,05 mL toutes les 0,4 s), filet (≈ 1 mL/s) */
let robinetT = null;
function robinet(debit) {
  const T = E.T; T.debit = debit; clearInterval(robinetT); $$('.robinet button').forEach((b) => b.classList.toggle('actif', Number(b.dataset.d) === debit));
  if (!debit) return;
  let n = 0; robinetT = setInterval(() => { if (T.Vb >= 50) { robinet(0); return; } verser(debit === 1 ? 0.1 : 0.05, n++ % (debit === 1 ? 1 : 1) === 0); }, debit === 1 ? 100 : 400);
}
function verser(dv, voirGoutte = true) { const T = E.T; T.Vb = Math.min(50, +(T.Vb + dv).toFixed(3)); if (voirGoutte) p3('gouttePointe'); majTitrage(); suivreVirage(); }
function suivreVirage() { const T = E.T; if (!T.indic || T.vir) return; const I = INDICATEURS[T.indic]; const p = T.pH; if (p >= I.bas + (I.haut - I.bas) * 0.15 && !T.vir) { T.vir = T.Vb; } }
function doserColor(z, fin) {
  const T = E.T;
  z.innerHTML = `<div class="lecture"><span>Volume lu sur la burette</span><b><span id="lectureV">0,00</span> mL</b></div><div class="robinet"><button data-d="0">Fermé</button><button data-d="2">Goutte à goutte</button><button data-d="1">Filet</button><button data-d="g">1 goutte</button></div>`;
  $$('.robinet button', z).forEach((b) => b.onclick = () => { if (b.dataset.d === 'g') { robinet(0); verser(0.05); } else robinet(Number(b.dataset.d)); });
  boutons(z.appendChild(document.createElement('div')), [{ t: 'Virage atteint : fermer et noter', cls: 'principal', f: () => {
    robinet(0); T.Vstop = T.Vb; const depasse = T.Vb - T.Veq;
    if (!T.vir) { annonce('Pas encore de virage visible.', 'erreur'); return; }
    if (T.indic === 'phenol' && depasse > 0.25) erreur(`Virage dépassé de ${fr(depasse, 2)} mL`, 'La solution est devenue franchement rose : on passe au goutte-à-goutte avant l’équivalence et on s’arrête à la première teinte rose persistante.', 2);
    journal(`Robinet fermé à ${fr(T.Vb, 2)} mL`); z.innerHTML = ''; fin(`Robinet fermé à ${fr(T.Vb, 2)} mL.`);
  } }]);
  vue('becher');
}
function doserPH(z, fin) {
  const T = E.T; T.points = [{ v: 0, p: etatTitrage() }];
  z.innerHTML = `<div class="lecture"><span>V = <span id="lectureV">0,00</span> mL</span><b>pH <span id="lecturePH">—</span></b></div><canvas class="courbe" width="560" height="240"></canvas>`;
  const cv = $('canvas', z); const dessiner = () => {
    const g = cv.getContext('2d'), W = cv.width, Hh = cv.height, m = 34; g.clearRect(0, 0, W, Hh); g.strokeStyle = '#1b2430'; g.lineWidth = 1.2; g.font = '13px IBM Plex Mono, monospace'; g.fillStyle = '#6d655a';
    g.beginPath(); g.moveTo(m, 8); g.lineTo(m, Hh - m); g.lineTo(W - 8, Hh - m); g.stroke();
    const X = (v) => m + v / 30 * (W - m - 12), Y = (p) => Hh - m - p / 14 * (Hh - m - 12);
    for (let v = 0; v <= 30; v += 5) { g.fillText(v, X(v) - 6, Hh - m + 16); } for (let p = 0; p <= 14; p += 2) { g.fillText(p, 6, Y(p) + 4); g.strokeStyle = '#e6dfd2'; g.beginPath(); g.moveTo(m + 1, Y(p)); g.lineTo(W - 8, Y(p)); g.stroke(); }
    g.fillStyle = '#e4572e'; for (const q of T.points) { g.beginPath(); g.arc(X(q.v), Y(q.p), 3.2, 0, 7); g.fill(); }
    g.fillStyle = '#1b2430'; g.fillText('V (mL)', W - 70, Hh - m - 6); g.fillText('pH', m + 6, 18);
  };
  dessiner(); majTitrage();
  const ajout = (dv) => { verser(dv); T.points.push({ v: T.Vb, p: T.pH }); dessiner(); };
  boutons(z.appendChild(document.createElement('div')), [{ t: '+ 2 mL', f: () => ajout(2) }, { t: '+ 1 mL', f: () => ajout(1) }, { t: '+ 0,5 mL', f: () => ajout(0.5) }, { t: '+ 0,2 mL', f: () => ajout(0.2) }, { t: '+ 0,1 mL', f: () => ajout(0.1) },
    { t: 'Terminer le relevé', cls: 'principal', f: () => {
      if (T.Vb < T.Veq + 3) { annonce('Poursuivez au-delà du saut de pH (quelques mL après).', 'erreur'); return; }
      const pres = T.points.filter((q) => Math.abs(q.v - T.Veq) <= 1.2).length; if (pres < 4) erreur('Ajouts trop espacés autour du saut', 'Autour de l’équivalence, on resserre les ajouts (0,1 à 0,2 mL) pour bien placer le saut de pH.', 2);
      journal(`Relevé terminé : ${T.points.length} points jusqu’à ${fr(T.Vb, 1)} mL`); fin(`${T.points.length} points relevés.`);
    } }]);
}
function exploiter(z, fin, pm) {
  const T = E.T;
  z.innerHTML = `<label>V<sub>eq</sub> (mL) <input id="qVeq" inputmode="decimal"></label>${pm ? '<label>pKa <input id="qPka" inputmode="decimal"></label>' : ''}<label>C<sub>acide</sub> (mol/L) <input id="qCa" inputmode="decimal"></label>`;
  boutons(z.appendChild(document.createElement('div')), [{ t: 'Valider les résultats', cls: 'principal', f: () => {
    const veq = lire($('#qVeq', z).value), ca = lire($('#qCa', z).value), pka = pm ? lire($('#qPka', z).value) : null;
    const ref = pm ? T.Veq : T.Vstop;
    if (!(Math.abs(veq - ref) <= (pm ? 0.35 : 0.1))) erreur(`Veq = ${fr(veq, 2)} mL`, pm ? `Le saut de pH est centré sur ${fr(T.Veq, 2)} mL (méthode des tangentes ou de la dérivée).` : `Le volume lu à la fermeture était ${fr(T.Vstop, 2)} mL.`, 3);
    const caAtt = T.Cb * veq / 20; if (!(Math.abs(ca - caAtt) / caAtt <= 0.02)) erreur(`C = ${fr(ca, 4)} mol/L`, `Ca = Cb × Veq / Va = 0,100 × ${fr(veq, 2)} / 20,0 = ${fr(caAtt, 4)} mol/L.`, 4);
    if (pm && !(Math.abs(pka - 4.76) <= 0.15)) erreur(`pKa = ${fr(pka, 2)}`, `À la demi-équivalence (${fr(T.Veq / 2, 2)} mL), pH = pKa ≈ 4,76.`, 3);
    E.q = { veq, ca, pka }; journal(`Résultats : Veq ${fr(veq, 2)} mL, C ${fr(ca, 4)} mol/L${pm ? `, pKa ${fr(pka, 2)}` : ''}`);
    z.innerHTML = ''; fin(`Valeur vraie : C = ${fr(T.Ca, 4)} mol/L (Veq = ${fr(T.Veq, 2)} mL).`); terminer();
  } }]);
}

/* =====================================================================
   TUBES À ESSAI
   ===================================================================== */
function etatTube(t) {      // couleur et précipité selon le contenu et le chauffage
  const a = t.ajouts, ech = ECHANTILLONS[t.ech]; let couleur = ech.couleur, op = 0.4, precipite = 0, precC = '#ffffff', trouble = 0, txt = 'limpide, incolore';
  if (E.m.id === 'alcaloides') {
    if (a.dragendorff) { couleur = '#f3b66a'; op = 0.6; txt = 'orangé (couleur du réactif)'; if (ech.alcaloide) { precipite = 1; precC = '#e2561a'; trouble = 0.7; couleur = '#e97a2e'; txt = 'précipité orange-rouge'; } }
    if (a.mayer) { if (ech.alcaloide) { precipite = Math.max(precipite, 0.9); precC = a.dragendorff ? '#e2561a' : '#f1ead0'; trouble = 0.8; if (!a.dragendorff) { couleur = '#f3eedc'; txt = 'précipité blanc-crème'; } else txt += ' + trouble blanc-crème'; } else if (!a.dragendorff) txt = 'limpide (pas de précipité)'; }
  }
  if (E.m.id === 'fehling') {
    const f = a.fehlingA && a.fehlingB;
    if (a.fehlingA || a.fehlingB) { couleur = a.fehlingA ? (f ? '#1f5fc4' : '#5f9fe0') : '#eef2f2'; op = a.fehlingA ? 0.75 : 0.4; txt = f ? 'bleu intense (complexe tartrique)' : a.fehlingA ? 'bleu clair (CuSO₄ seul)' : 'incolore'; }
    if (f && t.T >= 70 && ech.reducteur) { precipite = 1; precC = '#b5381a'; trouble = 0.85; couleur = '#b8562a'; txt = 'précipité rouge brique (Cu₂O)'; }
    else if (f && t.T >= 70) txt = 'reste bleu après chauffage';
  }
  if (E.m.id === 'kmno4') {
    if (a.kmno4) { couleur = '#9a2cb8'; op = 0.75; txt = 'violet (MnO₄⁻)';
      if (t.T >= 40 && ech.oxydable) { if (a.h2so4dil) { couleur = '#f3e8f0'; op = 0.35; txt = 'décoloré (Mn²⁺)'; } else { couleur = '#8a5a2a'; precipite = 0.8; precC = '#5b3a1c'; trouble = 0.6; txt = 'brun (MnO₂, sans acide)'; } } }
    else if (a.h2so4dil) txt = 'incolore (acidifié)';
  }
  return { couleur, opacite: op, precipite, precCouleur: precC, trouble, txt };
}
function majTubes() {
  E.tubes.forEach((t, i) => { const e = etatTube(t); t.res = e; p3('tube', i, { v: t.v, ...e }); });
  const tb = $('#tabTubes'); if (tb) tb.innerHTML = '<tr><th>Tube</th><th>Réactifs</th><th>Aspect</th></tr>' + E.tubes.map((t, i) => `<tr><td><b>${LETTRE(i)}</b></td><td>${Object.keys(t.ajouts).map((k) => TESTS[k].nom.replace(/^Réactif de |^Liqueur de /, '')).join(', ') || '—'}${t.T > 20 ? ` · ${t.T} °C` : ''}</td><td><span class="pastille-coul" style="background:${t.res.couleur}"></span>${t.res.txt}</td></tr>`).join('');
}
function tubesMission(m) {
  const ordre = melanger(m.tubes, E.r);
  E.tubes = ordre.map((k) => ({ ech: k, v: 2, ajouts: {}, T: 20 }));
  // flacons compte-gouttes sur la paillasse
  if (S) { for (const id in S.flacons) S.flacons[id].visible = m.reactifs.includes(id); for (const id of m.reactifs) if (!S.flacons[id]) S.flaconCG(id, TESTS[id].nom, TESTS[id].couleur, id === 'kmno4' || id === 'dragendorff'); S.rangerFlacons(m.reactifs); }
  majTubes();
  let flacon = null, tubeSel = null, occupe = false;
  const liste = [
    { titre: 'Observer les tubes', sous: '2 mL chacun', vue: 'tubes', aide: `Trois tubes A, B, C : ${ordre.map((k) => ECHANTILLONS[k].nom.toLowerCase()).sort().join(' ; ')} — dans un ordre inconnu.`, faire: (z, fin) => boutons(z, [{ t: 'Commencer', cls: 'principal', f: () => { z.innerHTML = ''; fin('Les trois tubes sont limpides.'); } }]) },
    { titre: 'Ajouter les réactifs', sous: 'compte-gouttes', vue: 'tubes', aide: 'Choisissez un flacon (sur la paillasse ou ci-dessous), puis un tube. Notez l’aspect de chaque tube.' + (m.chauffe ? ' Le chauffage se fait ensuite au bain-marie.' : ''), faire: (z, fin) => {
      z.innerHTML = `<div class="choix-ligne"><span>Flacon</span><div class="pastilles" id="choixFl">${m.reactifs.map((k) => `<button type="button" data-k="${k}">${TESTS[k].nom}</button>`).join('')}</div></div>
        <div class="choix-ligne"><span>Tube</span><div class="pastilles" id="choixTu">${E.tubes.map((_, i) => `<button type="button" data-i="${i}">${LETTRE(i)}</button>`).join('')}</div></div><table class="tableau-tubes" id="tabTubes"></table>`;
      majTubes();
      const choisirF = (k) => { flacon = k; $$('#choixFl button', z).forEach((b) => b.classList.toggle('choisi', b.dataset.k === k)); };
      const choisirT = async (i) => {
        if (occupe) return; if (!flacon) { annonce('Choisissez d’abord un flacon.', 'erreur'); return; }
        occupe = true; const t = E.tubes[i];
        if (m.id === 'kmno4' && flacon === 'kmno4' && !t.ajouts.h2so4dil && !t.avertiAcide) { t.avertiAcide = true; }
        if (m.id === 'alcaloides' && flacon === 'mayer' && !t.ajouts.dragendorff && !E.mayerSeul) { E.mayerSeul = true; }
        await p3('verserGouttes', flacon, i, flacon.startsWith('fehling') ? 8 : 5, TESTS[flacon].couleur);
        t.ajouts[flacon] = (t.ajouts[flacon] || 0) + 1; t.v += flacon.startsWith('fehling') ? 1 : 0.25; majTubes();
        journal(`${TESTS[flacon].nom} → tube ${LETTRE(i)} : ${t.res.txt}`); occupe = false;
      };
      $$('#choixFl button', z).forEach((b) => b.onclick = () => choisirF(b.dataset.k));
      $$('#choixTu button', z).forEach((b) => b.onclick = () => choisirT(Number(b.dataset.i)));
      if (S) { offClic && offClic(); offClic = S.cliquer([...m.reactifs.map((k) => S.flacons[k]), ...S.tubesObjets()], (o) => { const k = o.userData && o.userData.id; if (k) choisirF(k); else { const i = S.tubesObjets().indexOf(o); if (i >= 0) choisirT(i); } }); }
      boutons(z.appendChild(document.createElement('div')), [{ t: m.chauffe ? 'Passer au chauffage' : 'Passer à l’interprétation', cls: 'principal', f: () => {
        if (occupe) return; const tous = E.tubes.every((t) => Object.keys(t.ajouts).length);
        if (!tous) erreur('Un tube sans réactif', 'Chaque tube reçoit les mêmes réactifs, témoin compris : c’est la comparaison qui permet de conclure.', 2);
        controleOrdre(m); offClic && offClic(); offClic = null; z.innerHTML = ''; fin('Réactifs ajoutés.');
      } }]);
    } },
  ];
  if (m.chauffe) liste.push({ titre: 'Chauffer au bain-marie', sous: `consigne ${m.chauffe === 80 ? '≥ 80 °C' : '≈ 50 °C'}`, vue: 'bainmarie', aide: m.id === 'fehling' ? 'La réduction de la liqueur de Fehling se fait à chaud (bain-marie bouillant, quelques minutes).' : 'La réaction est lente à froid : bain-marie tiède quelques minutes.', faire: (z, fin) => {
    z.innerHTML = '<label class="curseur" style="width:100%">Consigne : <b id="bmV">20</b> °C<input type="range" id="bmC" min="20" max="100" step="5" value="20"></label>';
    const c = $('#bmC', z); c.oninput = () => { $('#bmV', z).textContent = c.value; };
    boutons(z.appendChild(document.createElement('div')), [{ t: 'Plonger les tubes 3 minutes', cls: 'principal', f: async () => {
      const Tc = Number(c.value); z.innerHTML = '<p>Chauffage…</p>'; await p3('auBain', true);
      for (let k = 0; k <= 10; k++) { const T = 20 + (Tc - 20) * k / 10; p3('bain', T); E.tubes.forEach((t) => { t.T = Math.round(T); }); majTubes(); await (R ? R.attendre(0.25) : Promise.resolve()); }
      await p3('auBain', false); vue('tubesPres');
      if (m.id === 'fehling' && Tc < 70) erreur(`Chauffage à ${Tc} °C`, 'Trop froid : la réduction de Fehling demande un bain-marie bouillant ; un résultat négatif à froid ne prouve rien.', 3);
      if (m.id === 'kmno4' && Tc < 40) erreur(`Chauffage à ${Tc} °C`, 'À froid, la réaction est trop lente pour conclure en quelques minutes.', 2);
      if (m.id === 'kmno4' && Tc > 80) erreur(`Chauffage à ${Tc} °C`, 'Inutile de faire bouillir : l’éthanol s’évapore (Téb 78 °C).', 1);
      journal(`Bain-marie à ${Tc} °C, 3 min`); fin(`Tubes chauffés à ${Tc} °C.`);
    } }]);
  } });
  liste.push({ titre: 'Conclure', sous: 'interprétation', vue: 'tubesPres', aide: 'Quel tube contient ce qu’on recherche ? Justifiez par le témoin.', faire: (z, fin) => {
    const q = m.id === 'alcaloides' ? ['Quel tube contient des alcaloïdes ?', 'Pourquoi traiter aussi le tube d’eau ?', ['Témoin négatif : aspect du réactif seul', 'Pour diluer le réactif', 'Pour vérifier le pH']]
      : m.id === 'fehling' ? ['Quel tube contient un sucre réducteur ?', 'Pourquoi le saccharose ne réagit-il pas ?', ['Pas de fonction aldéhyde (ou cétone) libre : les deux oses sont liés par leur carbone anomère', 'Il n’est pas soluble dans l’eau', 'Il faudrait chauffer plus longtemps']]
      : ['Quel tube contient un réducteur oxydable ?', 'Rôle de l’acide sulfurique ?', ['Milieu acide : MnO₄⁻ est réduit jusqu’à Mn²⁺ (décoloration)', 'Il dissout le permanganate', 'Il accélère l’évaporation de l’éthanol']];
    z.innerHTML = `<div class="choix-ligne"><span>${q[0]}</span><div class="pastilles">${E.tubes.map((_, i) => `<label><input type="radio" name="qT" value="${i}">${LETTRE(i)}</label>`).join('')}</div></div><div class="qcm"><b style="font-size:.86rem">${q[1]}</b>${q[2].map((t, i) => `<label><input type="radio" name="qQ" value="${i}">${t}</label>`).join('')}</div>`;
    boutons(z.appendChild(document.createElement('div')), [{ t: 'Valider', cls: 'principal', f: () => {
      const r = $('input[name=qT]:checked', z), qq = $('input[name=qQ]:checked', z); if (!r || !qq) { annonce('Répondez aux deux questions.', 'erreur'); return; }
      const cible = E.tubes.findIndex((t) => (m.id === 'alcaloides' ? ECHANTILLONS[t.ech].alcaloide : m.id === 'fehling' ? ECHANTILLONS[t.ech].reducteur : ECHANTILLONS[t.ech].oxydable));
      if (Number(r.value) !== cible) erreur(`Tube ${LETTRE(Number(r.value))} désigné`, `C'était le tube ${LETTRE(cible)} : ${ECHANTILLONS[E.tubes[cible].ech].nom.toLowerCase()}.`, 8);
      if (qq.value !== '0') erreur('Réponse à la question de cours', q[2][0] + '.', 3);
      journal(`Conclusion : tube ${LETTRE(Number(r.value))}`); z.innerHTML = ''; fin(E.tubes.map((t, i) => `${LETTRE(i)} = ${ECHANTILLONS[t.ech].nom.toLowerCase()}`).join(' ; ')); terminer();
    } }]);
  } });
  etapes(liste);
}
function controleOrdre(m) {
  const t = E.tubes;
  if (m.id === 'alcaloides') {
    const alc = t.find((x) => ECHANTILLONS[x.ech].alcaloide);
    if (!alc.ajouts.mayer) erreur('Pas de confirmation par le réactif de Mayer', 'Un seul réactif ne suffit pas : Dragendorff donne de faux positifs (protéines, certaines amines) ; on confirme avec Mayer.', 3);
    if (!alc.ajouts.dragendorff) erreur('Pas de réactif de Dragendorff', 'Dragendorff est le réactif général des alcaloïdes (précipité orange-rouge).', 3);
  }
  if (m.id === 'fehling' && t.some((x) => (x.ajouts.fehlingA ? 1 : 0) + (x.ajouts.fehlingB ? 1 : 0) === 1)) erreur('Liqueur de Fehling incomplète', 'La liqueur de Fehling se prépare extemporanément en mélangeant volumes égaux de A (CuSO₄) et B (tartrate, soude).', 3);
  if (m.id === 'kmno4' && t.some((x) => x.ajouts.kmno4 && !x.ajouts.h2so4dil)) erreur('Permanganate sans acidification', 'Sans acide, MnO₄⁻ est réduit en MnO₂ (précipité brun) : on acidifie d’abord par H₂SO₄ dilué.', 3);
}

/* =====================================================================
   PAILLASSE LIBRE
   ===================================================================== */
function libre() {
  E.L = { comp: {}, V: 0, indic: null };
  const z0 = $('#mEtapes'); z0.innerHTML = '';
  const d = document.createElement('div'); d.className = 'etape'; z0.appendChild(d);
  d.innerHTML = `<h4>Bécher de 100 mL <small>électrode de pH immergée</small></h4>
    <div class="choix-ligne"><span>Réactif</span><select id="lReac">${Object.entries(REACTIFS).map(([k, r]) => `<option value="${k}">${r.nom} ${r.C ? `(${fr(r.C, r.C < 0.1 ? 2 : 1)} mol/L)` : ''}</option>`).join('')}</select></div>
    <div class="actions" id="lVol"></div>
    <div class="choix-ligne"><span>Indicateur</span><div class="actions" id="lInd"></div></div>
    <div class="lecture"><span>V = <span id="lV">0</span> mL</span><b>pH <span id="lPH">—</span></b></div><p id="lType"></p>`;
  (async () => { await plonger(); })(); vue('titrage');
  const maj = () => {
    const L = E.L; const comp = Object.entries(L.comp).map(([k, mol]) => ({ id: REACTIFS[k].espece, mol })).filter((c) => c.id);
    const p = L.V ? calculPH(comp, L.V / 1000) : 7; L.pH = p; const [c, o] = L.indic ? couleurIndic(L.indic, p) : ['#e8f2f6', 0.3];
    p3('liquide', L.V, c, o); p3('ecran', 'ph', L.V ? p.toFixed(2) : '----', 'pH'); $('#lV').textContent = fr(L.V, 1); $('#lPH').textContent = L.V ? fr(p, 2) : '—';
  };
  const ajout = (v) => { const k = $('#lReac').value, r = REACTIFS[k]; if (E.L.V + v > 95) { annonce('Bécher plein : rincez-le.', 'erreur'); return; }
    E.L.V += v; if (r.C) E.L.comp[k] = (E.L.comp[k] || 0) + r.C * v / 1000; p3('gouttePointe'); maj();
    const fa = Object.keys(E.L.comp).some((x) => ['hcl', 'sulfurique'].includes(x)), fb = Object.keys(E.L.comp).some((x) => ['naoh', 'koh'].includes(x));
    journal(`+ ${v} mL ${r.nom} → pH ${fr(E.L.pH, 2)}${fa && fb && Math.abs(E.L.pH - 7) < 0.5 ? ' — neutralisation : H₃O⁺ + HO⁻ → 2 H₂O' : ''}`); $('#lType').textContent = r.type; };
  boutons($('#lVol', d), [{ t: '+ 1 goutte', f: () => ajout(0.05) }, { t: '+ 1 mL', f: () => ajout(1) }, { t: '+ 5 mL', f: () => ajout(5) }, { t: '+ 10 mL', f: () => ajout(10) }, { t: 'Rincer le bécher', cls: 'moins', f: () => { E.L = { comp: {}, V: 0, indic: null }; maj(); journal('Bécher rincé'); } }]);
  boutons($('#lInd', d), Object.entries(INDICATEURS).map(([k, I]) => ({ t: I.nom, f: () => { E.L.indic = k; maj(); journal(`2 gouttes de ${I.nom.toLowerCase()}`); } })));
  $('#lReac').onchange = () => { $('#lType').textContent = REACTIFS[$('#lReac').value].type; };
  maj();
}

/* ---------- fin et bilan ---------- */
function terminer() {
  const pts = E.erreurs.reduce((a, e) => a + e.pts, 0), note = Math.max(0, 20 - pts); FAITES[E.m.id] = note; listeMissions();
  $('[data-ong="bilan"]').disabled = false;
  $('#bilan').innerHTML = `<div class="bloc"><div class="note">${note}/20</div><p>${E.m.titre}</p></div>
    <div class="bloc"><h3>À revoir</h3>${E.erreurs.length ? `<ul>${E.erreurs.map((e) => `<li><b>${e.txt}</b> (−${e.pts}) — ${e.pourquoi}</li>`).join('')}</ul>` : '<p>Aucune erreur.</p>'}</div>
    <div class="bloc"><h3>Rappel</h3><p>${E.m.rappel}</p></div><div class="bloc"><h3>Sources</h3><ul>${SOURCES.map((s) => `<li>${s}</li>`).join('')}</ul></div>
    <button class="principal" id="autreMission">Autre manipulation</button>`;
  $('#autreMission').onclick = () => ouvrir('missions');
  window.__rxResultat = { id: E.m.id, note, erreurs: E.erreurs.map((e) => e.txt) };
  setTimeout(() => ouvrir('bilan'), 900);
}

/* ---------- démarrage ---------- */
listeMissions();
(async () => {
  R = creerRendu($('#scene'));
  try { S = await creerReactions(R); R.activer(S.vue); S.ecran('ph', '----', 'pH'); S.ecran('bain', '20.0 °C'); S.ecran('agit', '0 tr/min'); S.ecran('balance', '0.00', 'g'); }
  catch (e) { console.error(e); S = null; }
  $('#chargement').hidden = true; vue('ensemble');
  window.__rx = { lancer, get E() { return E; }, get S() { return S; }, pret: true };
})();
