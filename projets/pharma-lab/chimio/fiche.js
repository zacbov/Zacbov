/* Fiche de fabrication (inspirée du modèle de l'unité de préparation) : HTML dans la page, texture aimantée sur la vitre du PSM. */
import { THREE } from './scene3d.js';
const fr = (x, n = 1) => (Math.round(x * 10 ** n) / 10 ** n).toLocaleString('fr-FR');
const SER = [5, 10, 20, 30, 50, 60];

export function ficheDonnees(ord, cfg) {
  const c = ord.cas, s = ord.sol, m = s.m; const maintenant = new Date();
  const n = String(700000 + (c.id.charCodeAt(1) * 977 + Number(c.id.slice(1)) * 131) % 99999);
  const ser = SER.find((x) => x >= cfg.vol) || 60; const volFinal = cfg.poche + cfg.vol;
  const flacons = Math.ceil(cfg.vol / cfg.flaconVol);
  const fab = maintenant.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
  const per = new Date(maintenant.getTime() + 24 * 3600e3).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
  return {
    n, patient: `${c.sexe === 'F' ? 'Patiente' : 'Patient'} ${c.id} · ${c.age} ans · ${c.taille} cm · ${c.poids} kg`, service: 'HDJ oncologie', protocole: c.protocole,
    dci: m.nom.toUpperCase(), dose: fr(s.dose, 0) + ' mg', solvant: cfg.solvant, poche: cfg.poche, volFinal: fr(volFinal, 0) + ' ml', voie: `IV (pompe) · ${m.duree}`,
    produit: `${m.nom.toUpperCase()} ${fr(m.conc)} mg/ml, flacon de ${fr(cfg.flaconVol, 0)} ml`, nb: flacons, vol: fr(cfg.vol) + ' ml',
    reste: fr(Math.max(0, flacons * cfg.flaconVol - cfg.vol)) + ' ml', ser,
    mode: [`Prélever ${fr(cfg.vol)} ml de ${m.nom.toUpperCase()} à l’aide d’une seringue de ${ser} ml (aiguille sécurisée à prise d’air filtrée).`,
      `Injecter ${fr(cfg.vol)} ml dans la poche de ${cfg.solvant.toUpperCase()} ${cfg.poche} ml (objet thérapeutique).`, 'Rincer 2 fois la seringue ; chasser le volume mort de la valve avec de l’air.',
      `Homogénéiser soigneusement l’objet thérapeutique de ${fr(volFinal, 0)} ml.`, 'Étiqueter puis emballer dans un sachet ' + (m.lumiere ? 'opaque.' : 'transparent.')],
    conc: fr(s.dose / volFinal, 2) + ' mg/ml', conserv: (m.lumiere ? 'À l’abri de la lumière · ' : '') + 'péremption : ' + per, fab, alerte: m.filtre ? 'ATTENTION : CONNECTER UNE TUBULURE AVEC FILTRE' : (!m.pvc ? 'ATTENTION : TUBULURE SANS PVC' : 'TUBULURE AVEC SITE D’INJECTION'),
  };
}

export function ficheHTML(d) {
  return `<div class="fiche"><div class="fiche-tete"><span>Unité de préparation · Fiche de fabrication</span><b>${d.n}</b></div>
  <table><tr><th>Patient</th><td colspan="3">${d.patient}</td></tr><tr><th>Service</th><td>${d.service}</td><th>Protocole</th><td>${d.protocole}</td></tr></table>
  <table class="violet"><tr><th>Médicament</th><td><b>${d.dci}</b></td><th>Solvant</th><td><b>${d.solvant}</b></td></tr><tr><th>Dose</th><td><b>${d.dose}</b></td><th>Volume final</th><td>${d.volFinal}</td></tr><tr><th>Administration</th><td colspan="3">${d.voie}</td></tr></table>
  <h5>Matière première</h5><table><tr><th>Produit</th><th>Nb</th><th>Volume prélevé</th><th>Reste</th></tr><tr><td>${d.produit}</td><td>${d.nb}</td><td><b>${d.vol}</b></td><td>${d.reste} — à jeter</td></tr></table>
  <h5>Consommables</h5><p>Seringue ${d.ser} ml · aiguille sécurisée à prise d’air filtrée · poche ${d.solvant} ${d.poche} ml · tubulure · compresses stériles</p>
  <h5>Mode opératoire — réalisation de l’objet thérapeutique</h5><ol>${d.mode.map((x) => `<li>${x}</li>`).join('')}</ol>
  <p class="fiche-alerte">${d.alerte}</p>
  <table><tr><th>Concentration finale attendue</th><td>${d.conc}</td></tr><tr><th>Stabilité · conservation</th><td>${d.conserv}</td></tr><tr><th>Fabriqué le</th><td>${d.fab} · par : ………… · contrôlé par : …………</td></tr></table></div>`;
}

export function ficheTexture(d) {
  const W = 1024, H = 1448; const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H);
  const bloc = (y, h, titre) => { g.fillStyle = '#e9d8f4'; g.fillRect(30, y, W - 60, 46); g.fillStyle = '#3b1e5a'; g.font = 'bold 30px Arial'; g.fillText(titre, 44, y + 33); g.strokeStyle = '#7a5a9a'; g.lineWidth = 2; g.strokeRect(30, y, W - 60, h); return y + 46; };
  const ligne = (y, t, px = 28, gras = false, c = '#1b1b1b') => { g.fillStyle = c; g.font = `${gras ? 'bold ' : ''}${px}px Arial`; g.fillText(t, 48, y); return y + px + 14; };
  g.fillStyle = '#3b1e5a'; g.font = 'bold 34px Arial'; g.fillText('Fiche de fabrication', 40, 60); g.font = 'bold 64px Arial'; g.textAlign = 'right'; g.fillText(d.n, W - 40, 80); g.textAlign = 'left';
  let y = bloc(110, 150, 'Patient'); y = ligne(y + 36, d.patient, 28); ligne(y, d.protocole, 26);
  y = bloc(280, 200, 'Médicament'); y = ligne(y + 40, `${d.dci}  ${d.dose}`, 40, true); y = ligne(y, `Solvant : ${d.solvant} ${d.poche} ml · volume final ${d.volFinal}`, 28); ligne(y, d.voie, 26);
  y = bloc(500, 150, 'Matière première'); y = ligne(y + 36, d.produit, 26); ligne(y, `Volume à prélever : ${d.vol}`, 38, true, '#7a1f1f');
  y = bloc(670, 470, 'Mode opératoire'); y += 34;
  d.mode.forEach((t, i) => { const mots = (i + 1 + '. ' + t).split(' '); let l = ''; for (const m of mots) { if (g.measureText(l + m).width > W - 120) { y = ligne(y, l, 27); l = '   '; } l += m + ' '; g.font = '27px Arial'; } y = ligne(y, l, 27); });
  g.fillStyle = '#b42318'; g.font = 'bold 30px Arial'; g.fillText(d.alerte, 44, 1190);
  y = bloc(1220, 190, 'Contrôle'); y = ligne(y + 36, `Concentration finale attendue : ${d.conc}`, 28); y = ligne(y, d.conserv, 26); ligne(y, `Fabriqué le ${d.fab}`, 26);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
