/* Calculs de validation : surface corporelle, clairance, dose, volume, concentration — tous vérifiables par l'étudiant. */
import { MOLECULES, SOLVANTS } from './donnees.js';

export const surface = (taille, poids) => Math.sqrt(taille * poids / 3600);                 // Mosteller (m²)
export const clairance = (c) => (140 - c.age) * c.poids * (c.sexe === 'F' ? 1.04 : 1.23) / c.creat;   // Cockcroft-Gault (ml/min), créatinine en µmol/l
export const r = (x, n = 1) => Math.round(x * 10 ** n) / 10 ** n;

export function solution(c) {
  const m = MOLECULES[c.molecule], sc = surface(c.taille, c.poids), cl = clairance(c);
  const dose = m.calvert ? c.asc * (Math.min(cl, 125) + 25) : c.dose_m2 * sc;            // DFG plafonné à 125 ml/min (pratique courante, à valider)
  const vol = dose / m.conc;
  // poche conseillée : la plus petite poche prévue qui garde la concentration dans les bornes
  const poche = m.poches.find((p) => { const k = dose / (p + vol); return k <= m.cmax && k >= m.cmin; }) || m.poches[m.poches.length - 1];
  const motifs = [];
  const s = m.seuils || {};
  if (s.pnn && c.bio.pnn < s.pnn) motifs.push('bio');
  if (s.plaq && c.bio.plaq < s.plaq) motifs.push('bio');
  if (s.clcr && cl < s.clcr) motifs.push('rein');
  if (s.bili && c.bio.bili > s.bili) motifs.push('bio');
  if (c.prescrit.dose_ecrite && Math.abs(c.prescrit.dose_ecrite - dose) / dose > 0.1) motifs.push('dose');
  if (!m.solvants.includes(c.prescrit.solvant)) motifs.push('solvant');
  return { m, sc, cl, dose, vol, poche, conc: dose / (poche + vol), motifs: [...new Set(motifs)], verdict: motifs[0] || 'conforme' };
}

/* juge une saisie : écart relatif toléré (2 % par défaut) */
export const proche = (val, ref, tol = 0.02) => isFinite(val) && Math.abs(val - ref) <= Math.abs(ref) * tol + 1e-9;

export function texteOrdonnance(c) {
  const m = MOLECULES[c.molecule];
  const dose = c.prescrit.dose_ecrite ? c.prescrit.dose_ecrite + ' mg' : (m.calvert ? 'ASC ' + c.asc + ' (Calvert)' : c.dose_m2 + ' mg/m²');
  return { m, dose, solvant: SOLVANTS[c.prescrit.solvant], poche: c.prescrit.poche + ' ml' };
}
