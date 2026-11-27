/* TP 3 — réactions de base : réactifs, indicateurs, missions.
   Repris du laboratoire virtuel de Tice (PharmAtlas v3) : acides et bases, indicateurs, réactifs des alcaloïdes,
   Fehling, permanganate ; passé en 3D avec la verrerie du labo. */

/* acides et bases (concentrations des flacons de la paillasse, mol/L) ; espece = clé de magistrales/chimie.js */
export const REACTIFS = {
  hcl: { nom: 'Acide chlorhydrique', formule: 'HCl', C: 0.1, espece: 'hcl', cat: 'acide', type: 'Acide fort' },
  sulfurique: { nom: 'Acide sulfurique', formule: 'H₂SO₄', C: 0.05, espece: 'sulfurique', cat: 'acide', type: 'Diacide (1re acidité forte, pKa₂ 1,99)' },
  acetique: { nom: 'Acide acétique', formule: 'CH₃COOH', C: 0.1, espece: 'acetique', cat: 'acide', type: 'Acide faible, pKa 4,76' },
  citrique: { nom: 'Acide citrique', formule: 'C₆H₈O₇', C: 0.1, espece: 'citrique', cat: 'acide', type: 'Triacide faible, pKa 3,13 · 4,76 · 6,40' },
  lactique: { nom: 'Acide lactique', formule: 'C₃H₆O₃', C: 0.1, espece: 'lactique', cat: 'acide', type: 'Acide faible, pKa 3,86' },
  oxalique: { nom: 'Acide oxalique', formule: 'C₂H₂O₄', C: 0.1, espece: 'oxalique', cat: 'acide', type: 'Diacide faible, pKa 1,25 · 4,27' },
  benzoique: { nom: 'Acide benzoïque', formule: 'C₇H₆O₂', C: 0.02, espece: 'benzoique', cat: 'acide', type: 'Acide faible, pKa 4,20 (peu soluble)' },
  naoh: { nom: 'Soude', formule: 'NaOH', C: 0.1, espece: 'naoh', cat: 'base', type: 'Base forte' },
  koh: { nom: 'Potasse', formule: 'KOH', C: 0.1, espece: 'koh', cat: 'base', type: 'Base forte' },
  ammoniac: { nom: 'Ammoniaque', formule: 'NH₃', C: 0.1, espece: 'ammoniac', cat: 'base', type: 'Base faible, pKa NH₄⁺/NH₃ 9,25' },
  bicarbonate: { nom: 'Hydrogénocarbonate de sodium', formule: 'NaHCO₃', C: 0.1, espece: 'bicarbonate', cat: 'base', type: 'Amphotère, pKa 6,35 · 10,33' },
  eau: { nom: 'Eau purifiée', formule: 'H₂O', C: 0, cat: 'solvant', type: 'Solvant' },
};

/* indicateurs colorés : zone de virage (pH bas → pH haut), couleurs de part et d'autre */
export const INDICATEURS = {
  helianthine: { nom: 'Hélianthine (méthylorange)', bas: 3.1, haut: 4.4, acide: '#d7261e', base: '#f2b42a' },
  bbt: { nom: 'Bleu de bromothymol', bas: 6.0, haut: 7.6, acide: '#e8c51a', base: '#1f5fb8' },
  phenol: { nom: 'Phénolphtaléine', bas: 8.2, haut: 10.0, acide: null, base: '#e0218a' },     // incolore en dessous de 8,2
  universel: { nom: 'Indicateur universel', universel: true },
};

/* réactifs de caractérisation (tubes à essai), au compte-gouttes */
export const TESTS = {
  dragendorff: { nom: 'Réactif de Dragendorff', formule: 'K[BiI₄]', couleur: '#f08a1c', role: 'alcaloïdes' },
  mayer: { nom: 'Réactif de Mayer', formule: 'K₂[HgI₄]', couleur: '#f6f1d8', role: 'alcaloïdes' },
  fehlingA: { nom: 'Liqueur de Fehling A', formule: 'CuSO₄', couleur: '#2e7fd0', role: 'sucres' },
  fehlingB: { nom: 'Liqueur de Fehling B', formule: 'tartrate double, NaOH', couleur: '#eef2f2', role: 'sucres' },
  h2so4dil: { nom: 'Acide sulfurique dilué', formule: 'H₂SO₄ 1 mol/L', couleur: '#eef4f6', role: 'oxydation' },
  kmno4: { nom: 'Permanganate de potassium', formule: 'KMnO₄ 0,01 mol/L', couleur: '#7a1aa0', role: 'oxydation' },
  hcldil: { nom: 'Acide chlorhydrique dilué', formule: 'HCl 1 mol/L', couleur: '#eef4f6', role: 'alcaloïdes' },
};

/* solutions inconnues des tubes : ce qu'elles contiennent vraiment */
export const ECHANTILLONS = {
  quinquina: { nom: "Extrait acide d'écorce de quinquina", alcaloide: true, couleur: '#efe0b8' },
  glucose: { nom: 'Solution de glucose à 5 %', reducteur: true, couleur: '#f4f6f6' },
  saccharose: { nom: 'Solution de saccharose à 5 %', reducteur: false, couleur: '#f4f6f6' },
  ethanol: { nom: 'Éthanol à 10 %', oxydable: true, couleur: '#f4f6f6' },
  vinaigre: { nom: 'Vinaigre blanc (acide acétique à 5 %)', oxydable: false, couleur: '#f6f4ec' },
  eau: { nom: 'Eau purifiée (témoin)', couleur: '#eef5f8' },
};

export const MISSIONS = [
  { id: 'colori', titre: 'Titrage colorimétrique', icone: '⚗', resume: "Doser une solution d'acide acétique par la soude 0,100 mol/L : choix de la verrerie et de l'indicateur, virage, calcul de la concentration.", type: 'titrage', points: 20,
    rappel: "CH₃COOH + HO⁻ → CH₃COO⁻ + H₂O. À l'équivalence, n(acide) = n(soude) : Ca × Va = Cb × Veq. Le pH à l'équivalence est basique (≈ 8,7) : l'ion acétate est une base faible." },
  { id: 'phmetrie', titre: 'Titrage pH-métrique et pKa', icone: '📈', resume: "Même dosage suivi au pH-mètre : étalonnage, courbe pH = f(V), équivalence par le saut de pH, pKa lu à la demi-équivalence (zone tampon).", type: 'titrage', points: 20,
    rappel: "À la demi-équivalence, [CH₃COOH] = [CH₃COO⁻] : pH = pKa (Henderson-Hasselbalch, pH = pKa + log [A⁻]/[AH]). Autour de ce point, le pH varie peu : c'est la zone tampon." },
  { id: 'alcaloides', titre: 'Recherche des alcaloïdes', icone: '🌿', resume: "Trois tubes inconnus : réactif de Dragendorff puis confirmation par le réactif de Mayer, en milieu acide.", type: 'tubes', points: 20,
    tubes: ['quinquina', 'glucose', 'eau'], reactifs: ['hcldil', 'dragendorff', 'mayer'],
    rappel: "En milieu acide, les alcaloïdes (sels d'amines) précipitent avec les iodures métalliques : orange-rouge avec Dragendorff (iodobismuthate), blanc-crème avec Mayer (iodomercurate). Un témoin à l'eau permet de juger l'aspect du réactif seul." },
  { id: 'fehling', titre: 'Test de Fehling', icone: '🔥', resume: "Glucose, saccharose ou eau ? Liqueur de Fehling (A + B) puis chauffage au bain-marie : précipité rouge brique avec les sucres réducteurs.", type: 'tubes', points: 20,
    tubes: ['glucose', 'saccharose', 'eau'], reactifs: ['fehlingA', 'fehlingB'], chauffe: 80,
    rappel: "Les ions Cu²⁺ (complexe tartrique bleu) oxydent la fonction aldéhyde des sucres réducteurs à chaud ; ils sont réduits en oxyde cuivreux Cu₂O, rouge brique. Le saccharose n'a pas de fonction réductrice libre : la liqueur reste bleue." },
  { id: 'kmno4', titre: 'Oxydation par le permanganate', icone: '🟣', resume: "Éthanol, eau ou vinaigre ? Permanganate en milieu acide, à tiède : décoloration en présence d'un réducteur.", type: 'tubes', points: 20,
    tubes: ['ethanol', 'eau', 'vinaigre'], reactifs: ['h2so4dil', 'kmno4'], chauffe: 50,
    rappel: "En milieu acide, MnO₄⁻ (violet) est réduit en Mn²⁺ (presque incolore) ; l'éthanol est oxydé (éthanal puis acide acétique). Sans acide, la réduction s'arrête à MnO₂, précipité brun. L'acide acétique du vinaigre est déjà le produit d'oxydation de l'éthanol : il ne réagit pas." },
  { id: 'libre', titre: 'Paillasse libre', icone: '🧪', resume: "Mélangez acides, bases et indicateurs dans le bécher : pH-mètre, couleur, neutralisation.", type: 'libre', points: 0 },
];

export const VERRERIE_PRISE = [
  { id: 'pipette', nom: 'Pipette jaugée de 20 mL (deux traits)', ok: true },
  { id: 'eprouvette', nom: 'Éprouvette graduée de 25 mL', ok: false, pourquoi: "L'éprouvette est trop imprécise pour une prise d'essai de dosage : la pipette jaugée donne le volume à ± 0,03 mL." },
  { id: 'becher', nom: 'Bécher de 50 mL (graduations)', ok: false, pourquoi: "Les graduations d'un bécher sont indicatives : jamais pour une prise d'essai." },
];

export const SOURCES = [
  'Laboratoire virtuel PharmAtlas v3 (Tice) : réactifs, réactions et missions d’origine.',
  'Zones de virage usuelles : hélianthine 3,1–4,4 ; bleu de bromothymol 6,0–7,6 ; phénolphtaléine 8,2–10,0.',
  'pKa à 25 °C : acide acétique 4,76 ; NH₄⁺ 9,25 ; acide citrique 3,13 / 4,76 / 6,40.',
];
