/* pH en temps réel : équilibre des charges résolu par dichotomie (acides/bases polyprotiques, ions forts, eau).
   Prolonge le moteur du laboratoire virtuel de Tice (acides forts/faibles) aux mélanges réels des préparations. */
export const ESPECES = {
  // pKa à 25 °C ; z0 = charge de la forme la plus protonée ; M = masse molaire (g/mol) ; contre-ion apporté (Na+ = 1 par molécule de sel sodique)
  bicarbonate: { nom: 'Hydrogénocarbonate de sodium', M: 84.01, pKa: [6.35, 10.33], z0: 0, protons: 1, na: 1 },   // NaHCO3 : HCO3- = H2CO3 ayant perdu 1 H+
  carbonate_ca: { nom: 'Carbonate de calcium', M: 100.09, pKa: [6.35, 10.33], z0: 0, protons: 0, ca: 1, peuSoluble: true },
  citrique: { nom: 'Acide citrique', M: 192.12, pKa: [3.13, 4.76, 6.40], z0: 0, protons: 3 },
  citrate_na: { nom: 'Citrate trisodique', M: 258.07, pKa: [3.13, 4.76, 6.40], z0: 0, protons: 0, na: 3 },
  lactique: { nom: 'Acide lactique', M: 90.08, pKa: [3.86], z0: 0, protons: 1 },
  salicylique: { nom: 'Acide salicylique', M: 138.12, pKa: [2.97, 13.6], z0: 0, protons: 2 },
  borique: { nom: 'Acide borique', M: 61.83, pKa: [9.24], z0: 0, protons: 1 },
  acetique: { nom: 'Acide acétique', M: 60.05, pKa: [4.76], z0: 0, protons: 1 },
  omeprazole: { nom: 'Oméprazole', M: 345.42, pKa: [4.0, 8.8], z0: 1, protons: 2 },   // pyridinium 4,0 ; benzimidazole N-H 8,8
  minoxidil: { nom: 'Minoxidil', M: 209.25, pKa: [4.6], z0: 1, protons: 1 },
  sulfurique: { nom: 'Acide sulfurique', M: 98.08, pKa: [-3, 1.99], z0: 0, protons: 2 },
  oxalique: { nom: 'Acide oxalique', M: 90.03, pKa: [1.25, 4.27], z0: 0, protons: 2 },
  benzoique: { nom: 'Acide benzoïque', M: 122.12, pKa: [4.20], z0: 0, protons: 1 },
  ammoniac: { nom: 'Ammoniac', M: 17.03, pKa: [9.25], z0: 1, protons: 0 },      // NH4+ / NH3 ; ajouté sous forme NH3 (sans contre-ion)
  koh: { nom: 'Hydroxyde de potassium', fort: 'base', M: 56.11 },
  hcl: { nom: 'Acide chlorhydrique', fort: 'acide', M: 36.46 },
  naoh: { nom: 'Hydroxyde de sodium', fort: 'base', M: 40.0 },
};
const Kw = 1e-14;

/* fractions de chaque forme d'un système polyprotique : forme i a perdu i protons */
function fractions(pKa, h) {
  const K = pKa.map((p) => 10 ** -p); const t = [1]; for (let i = 0; i < K.length; i++) t.push(t[i] * K[i] / h);
  const s = t.reduce((a, b) => a + b, 0); return t.map((x) => x / s);
}

/* composants : [{ id, mol }] dans un volume V (litres). Retourne le pH (0–14) */
export function pH(composants, V) {
  if (!V || V <= 0) return 7;
  let fortes = 0; const sys = [];
  for (const c of composants) {
    const e = ESPECES[c.id]; if (!e) continue; const C = c.mol / V;
    if (e.fort === 'acide') fortes -= C;
    else if (e.fort === 'base') fortes += C;
    else {
      const Cdis = e.peuSoluble ? Math.min(C, 1.4e-4) : C;     // CaCO3 : très peu soluble (≈ 14 mg/l)
      if (e.na) fortes += e.na * Cdis; if (e.ca) fortes += 2 * e.ca * Cdis;
      sys.push({ C: Cdis, pKa: e.pKa, z0: e.z0 });
    }
  }
  const bilan = (p) => {             // somme des charges positives − négatives
    const h = 10 ** -p; let q = h - Kw / h + fortes;
    for (const s of sys) { const f = fractions(s.pKa, h); f.forEach((a, i) => { q += s.C * a * (s.z0 - i); }); }
    return q;
  };
  let lo = 0, hi = 14;
  for (let k = 0; k < 60; k++) { const m = (lo + hi) / 2; if (bilan(m) > 0) lo = m; else hi = m; }
  return (lo + hi) / 2;
}

/* couleur d'un indicateur universel (même rampe que le laboratoire virtuel) */
export function couleurPH(p) {
  const s = [[0, 180, 0, 0], [2, 220, 50, 0], [4, 240, 180, 0], [5, 200, 220, 0], [7, 40, 160, 90], [8, 0, 100, 200], [10, 50, 0, 160], [12, 100, 0, 120], [14, 60, 0, 80]];
  for (let i = 1; i < s.length; i++) if (p <= s[i][0]) { const t = (p - s[i - 1][0]) / (s[i][0] - s[i - 1][0]); const l = (j) => Math.round(s[i - 1][j] + t * (s[i][j] - s[i - 1][j])); return `rgb(${l(1)},${l(2)},${l(3)})`; }
  return 'rgb(60,0,80)';
}
