/* TP préparations magistrales — formules, ordonnances, étapes, contrôles, étiquetage.
   Formules reprises des sources citées pour chaque préparation (Formulaire national de l'ANSM, Pharmacie des HUG, RCP).
   Les ordonnances, patients et prescripteurs sont fictifs. */

export const PHARMACIE = 'Pharmacie du TP · Faculté de pharmacie';

/* instruments de mesure (volume) : capacité, graduation (mL) */
export const VERRERIE = [
  { id: 'pip1', nom: 'Pipette graduée 1 mL', cap: 1, grad: 0.01 },
  { id: 'pip5', nom: 'Pipette graduée 5 mL', cap: 5, grad: 0.05 },
  { id: 'pip10', nom: 'Pipette graduée 10 mL', cap: 10, grad: 0.1 },
  { id: 'epr25', nom: 'Éprouvette 25 mL', cap: 25, grad: 0.5 },
  { id: 'epr50', nom: 'Éprouvette 50 mL', cap: 50, grad: 1 },
  { id: 'epr100', nom: 'Éprouvette 100 mL', cap: 100, grad: 1 },
];
/* balances */
export const BALANCES = [
  { id: 'b01', nom: 'Balance 0,01 g (portée 2 000 g)', res: 0.01, max: 2000 },
  { id: 'b001', nom: 'Balance de précision 0,001 g (portée 220 g)', res: 0.001, max: 220 },
];
/* contenants de pesée : masse à vide (g) */
export const CONTENANTS = [
  { id: 'nacelle', nom: 'Nacelle de pesée', m: 1.87 },
  { id: 'becher', nom: 'Bécher 100 mL', m: 48.6 },
  { id: 'capsule', nom: 'Capsule de porcelaine', m: 31.2 },
];
/* volume du corps des gélules (mL), tables des fabricants de gélules */
export const GELULES = { '5': 0.13, '4': 0.21, '3': 0.30, '2': 0.37, '1': 0.50, '0': 0.68 };

/* règles du TP (affichées à l'étudiant) */
export const REGLES = {
  tolPesee: 0.02,        // ± 2 % sur chaque pesée
  tolQsp: 0.01,          // ± 1 % sur la masse ou le volume final
  tolCalcul: 0.005,      // ± 0,5 % sur les calculs
  incertitude: 0.01,     // la résolution de la balance doit rester ≤ 1 % de la masse pesée
};

/* mentions d'étiquetage proposées ; `toujours` = exigées pour toute préparation magistrale */
export const MENTIONS = [
  { id: 'patient', txt: 'Nom du patient', toujours: true },
  { id: 'prescripteur', txt: 'Nom du prescripteur', toujours: true },
  { id: 'ordonnancier', txt: 'Numéro d\'enregistrement à l\'ordonnancier', toujours: true },
  { id: 'pharmacie', txt: 'Nom et adresse de la pharmacie', toujours: true },
  { id: 'composition', txt: 'Composition qualitative et quantitative', toujours: true },
  { id: 'voie', txt: 'Voie d\'administration', toujours: true },
  { id: 'posologie', txt: 'Posologie et mode d\'emploi', toujours: true },
  { id: 'date_prep', txt: 'Date de préparation', toujours: true },
  { id: 'dlu', txt: 'Date limite d\'utilisation', toujours: true },
  { id: 'conservation', txt: 'Conditions de conservation', toujours: true },
  { id: 'een', txt: 'Excipients à effet notoire' },
  { id: 'agiter', txt: '« Agiter avant emploi »' },
  { id: 'ne_pas_avaler', txt: '« Ne pas avaler »' },
  { id: 'inflammable', txt: '« Inflammable : tenir à distance de toute source de chaleur »' },
  { id: 'ci3ans', txt: '« Ne pas utiliser chez l\'enfant de moins de 3 ans »' },
  { id: 'ouverture', txt: 'Durée d\'utilisation après ouverture' },
  { id: 'prix', txt: 'Prix de vente conseillé', piege: true },
  { id: 'cip', txt: 'Code CIP et vignette', piege: true },
  { id: 'logo', txt: 'Logo d\'un laboratoire', piege: true },
  { id: 'generique', txt: '« Médicament générique »', piege: true },
];

/* catalogue des gestes animés dans la scène */
// vue : balance | mortier | ph | bainmarie | conditionnement | gelulier | ensemble ; anim : triturer | agiter | conditionner | gelules
export const FORMULES = [
  {
    id: 'julep', nom: 'Potion gommeuse (julep gommeux)', forme: 'Solution buvable', voie: 'Voie orale', couleur: '#f6efd8',
    source: { titre: 'Formulaire national 2012 — Potion gommeuse', url: 'https://ansm.sante.fr/uploads/2020/10/23/potion-gommeuse.pdf' },
    base: { q: 150, u: 'g' },
    composants: [
      { id: 'gomme', couleur: '#efe3c2', nom: 'Gomme arabique (pulvérisée)', q: 10, u: 'g', role: 'viscosifiant' },
      { id: 'sirop', couleur: '#f3ead2', nom: 'Sirop simple', q: 30, u: 'g', role: 'édulcorant', een: 'saccharose' },
      { id: 'oranger', couleur: '#f6f1e6', nom: 'Eau distillée de fleur d\'oranger', q: 10, u: 'g', role: 'aromatisant' },
      { id: 'eau', nom: 'Eau purifiée', q: 100, u: 'g', role: 'solvant', qsp: true },
    ],
    ordo: { patient: 'Léa Marchand, 34 ans', prescripteur: 'Dr Hélène Vasseur, médecin généraliste', qte: 150, texte: 'Potion gommeuse, 150 g. Une cuillère à soupe trois fois par jour. Qsp 5 jours.' },
    analyse: { ok: 'oui', pourquoi: 'Préparation courante du Formulaire national, sans contre-indication pour cette patiente adulte.' },
    temp: null,
    etapes: [
      { id: 'pulv', txt: 'Pulvériser la gomme arabique au mortier', vue: 'mortier', anim: 'triturer' },
      { id: 'trit', txt: 'Triturer la gomme arabique avec le sirop simple jusqu\'à dissolution', vue: 'mortier', anim: 'triturer', pate: '#efe2bd' },
      { id: 'eau', txt: 'Ajouter peu à peu l\'eau purifiée', vue: 'mortier', anim: 'triturer', pate: '#f3ead0' },
      { id: 'oranger', txt: 'Ajouter l\'eau distillée de fleur d\'oranger', vue: 'mortier', anim: 'triturer' },
      { id: 'qsp', txt: 'Compléter à 150 g avec l\'eau purifiée (flacon taré sur la balance)', vue: 'balance', qsp: true },
      { id: 'homog', txt: 'Homogénéiser', vue: 'conditionnement', anim: 'agiter' },
      { id: 'cond', txt: 'Conditionner en flacon de verre brun', vue: 'conditionnement', anim: 'conditionner', cond: 'flacon' },
    ],
    pieges: [
      { id: 'tout_eau', txt: 'Verser toute l\'eau sur la gomme d\'un coup', pourquoi: 'La gomme arabique s\'agglomère en grumeaux : elle se disperse d\'abord dans le sirop, l\'eau vient ensuite peu à peu.' },
      { id: 'chauffer80', txt: 'Chauffer le mélange à 80 °C pour dissoudre plus vite', pourquoi: 'Le Formulaire national ne prévoit aucun chauffage : on dissout par trituration.' },
    ],
    controles: { aspect: { bon: 'Liquide légèrement visqueux, opalescent, odeur de fleur d\'oranger', faux: ['Pâte blanche épaisse', 'Liquide limpide comme de l\'eau', 'Grumeaux visibles en suspension'] } },
    conservation: { txt: 'Entre 2 °C et 8 °C, à l\'abri de la lumière', dlu: 7, dluTxt: '7 jours au maximum' },
    mentions: ['een'], een: 'Saccharose (sirop simple)',
    note: 'Pour une suspension d\'une substance active insoluble, le Formulaire national fait triturer cette substance avec la gomme avant d\'ajouter le sirop.',
  },
  {
    id: 'cerat', nom: 'Cérat de Galien', forme: 'Crème (émulsion E/H)', voie: 'Voie cutanée', couleur: '#fbf6ec',
    source: { titre: 'Formulaire national 2010 — Cérat de Galien', url: 'https://ansm.sante.fr/uploads/2020/10/23/cerat-de-galien.pdf' },
    base: { q: 100, u: 'g' },
    composants: [
      { id: 'cire', couleur: '#f7f0d8', nom: 'Cire d\'abeille blanche', q: 13.0, u: 'g', role: 'épaississant' },
      { id: 'amande', couleur: '#eedd94', nom: 'Huile d\'amande raffinée', q: 53.5, u: 'g', role: 'adoucissant' },
      { id: 'borax', nom: 'Borax', q: 0.5, u: 'g', role: 'conservateur' },
      { id: 'rose', couleur: '#fbe6ec', nom: 'Eau aromatisée de rose', q: 33.0, u: 'g', role: 'solvant, aromatisant' },
    ],
    ordo: { patient: 'Marc Lefèvre, 52 ans', prescripteur: 'Dr Paul Nguyen, dermatologue', qte: 60, texte: 'Cérat de Galien, 60 g. Appliquer matin et soir sur les mains sèches.' },
    analyse: { ok: 'oui', pourquoi: 'Patient adulte : le borax n\'est contre-indiqué que chez l\'enfant de moins de 3 ans.' },
    temp: { max: 50, etape: 'fondre', txt: 'Bain-marie : ne pas dépasser 50 °C' },
    etapes: [
      { id: 'fondre', txt: 'Faire fondre la cire dans l\'huile d\'amande au bain-marie', vue: 'bainmarie', bain: true },
      { id: 'mortier', txt: 'Transvaser dans un mortier préchauffé, agiter au pilon préchauffé', vue: 'mortier', anim: 'triturer', pate: '#f6e7b4' },
      { id: 'borax', txt: 'Dissoudre le borax dans l\'eau de rose', vue: 'ph', anim: 'agiter' },
      { id: 'incorp', txt: 'Incorporer la solution par petites fractions en agitant énergiquement jusqu\'à masse homogène', vue: 'mortier', anim: 'triturer', pate: '#fbf6ec' },
      { id: 'cond', txt: 'Conditionner en pot ou en tube', vue: 'conditionnement', anim: 'conditionner', cond: 'pot' },
    ],
    pieges: [
      { id: 'chauffer70', txt: 'Chauffer le bain-marie à 70 °C pour fondre la cire plus vite', pourquoi: 'Le Formulaire national impose de ne pas dépasser 50 °C.' },
      { id: 'dun_coup', txt: 'Verser toute la phase aqueuse d\'un coup', pourquoi: 'L\'émulsion se forme par incorporation en petites fractions, sous agitation énergique.' },
    ],
    controles: { aspect: { bon: 'Crème blanche, homogène, onctueuse, odeur de rose', faux: ['Phase aqueuse séparée au fond du pot', 'Masse jaune et cassante', 'Liquide huileux'] } },
    conservation: { txt: 'Récipient bien fermé, à température ambiante', dlu: null, dluTxt: 'non fixée par le Formulaire national : fixée et justifiée par le pharmacien' },
    mentions: ['ci3ans'],
    note: 'Contre-indiqué chez l\'enfant de moins de 3 ans (borax).',
  },
  {
    id: 'cerat_bebe', nom: 'Cérat de Galien — nourrisson', variante: 'cerat', forme: 'Crème (émulsion E/H)', voie: 'Voie cutanée',
    source: { titre: 'Formulaire national 2010 — Cérat de Galien', url: 'https://ansm.sante.fr/uploads/2020/10/23/cerat-de-galien.pdf' },
    ordo: { patient: 'Nina Robert, 18 mois', prescripteur: 'Dr Claire Joly, pédiatre', qte: 50, texte: 'Cérat de Galien, 50 g. Appliquer sur les joues irritées deux fois par jour.' },
    analyse: { ok: 'appeler', pourquoi: 'Le cérat de Galien contient du borax : il est contre-indiqué chez l\'enfant de moins de 3 ans. On ne prépare pas ; on appelle la prescriptrice pour proposer une autre préparation.' },
  },
  {
    id: 'pate_eau', nom: 'Pâte zincique à l\'eau (pâte de Darier)', forme: 'Pâte', voie: 'Voie cutanée', couleur: '#f7f7f2',
    source: { titre: 'Formulaire national 2007 — Pâte zincique à l\'eau', url: 'https://ansm.sante.fr/uploads/2020/10/23/pate-zincique-a-l-eau.pdf' },
    base: { q: 100, u: 'g' },
    composants: [
      { id: 'zno', nom: 'Oxyde de zinc', q: 25, u: 'g', role: 'substance active' },
      { id: 'caco3', nom: 'Carbonate de calcium', q: 25, u: 'g', role: 'alcalinisant' },
      { id: 'glycerol', couleur: '#f5f7f8', nom: 'Glycérol', q: 25, u: 'g', role: 'humectant' },
      { id: 'eau', nom: 'Eau purifiée', q: 25, u: 'g', role: 'solvant' },
    ],
    ordo: { patient: 'Hugo Bernard, 7 ans', prescripteur: 'Dr Claire Joly, pédiatre', qte: 80, texte: 'Pâte à l\'eau, 80 g. Appliquer en couche épaisse sur les lésions de varicelle, deux fois par jour.' },
    analyse: { ok: 'oui', pourquoi: 'Préparation du Formulaire national utilisable chez l\'enfant.' },
    temp: null,
    etapes: [
      { id: 'tamis', txt: 'Tamiser l\'oxyde de zinc et le carbonate de calcium', vue: 'mortier' },
      { id: 'melange', txt: 'Mélanger les deux poudres', vue: 'mortier', anim: 'triturer', pate: '#ffffff' },
      { id: 'glyc', txt: 'Triturer le mélange de poudres avec le glycérol', vue: 'mortier', anim: 'triturer', pate: '#f4f4ee' },
      { id: 'eau', txt: 'Ajouter l\'eau par petites portions jusqu\'à homogénéité', vue: 'mortier', anim: 'triturer', pate: '#f7f7f2' },
      { id: 'cond', txt: 'Conditionner en pot', vue: 'conditionnement', anim: 'conditionner', cond: 'pot' },
    ],
    pieges: [
      { id: 'eau_avant', txt: 'Mouiller les poudres avec l\'eau avant le glycérol', pourquoi: 'Les poudres sont d\'abord triturées avec le glycérol, l\'eau vient ensuite par petites portions.' },
      { id: 'vaseline', txt: 'Ajouter de la vaseline pour assouplir', pourquoi: 'Ce n\'est plus la formule : la pâte à l\'eau ne contient pas de corps gras.' },
    ],
    controles: { aspect: { bon: 'Pâte blanche, épaisse, homogène, sans grain', faux: ['Pâte grise avec des grains', 'Liquide blanc qui coule', 'Pommade grasse et brillante'] } },
    conservation: { txt: 'Récipient étanche', dlu: null, dluTxt: 'non fixée par le Formulaire national : fixée et justifiée par le pharmacien' },
    mentions: [],
  },
  {
    id: 'dalibour', nom: 'Pommade cupro-zincique (pommade de Dalibour sans camphre)', forme: 'Pommade', voie: 'Voie cutanée', couleur: '#eef3ef',
    source: { titre: 'Formulaire national 2008 — Pommade cupro-zincique', url: 'https://ansm.sante.fr/uploads/2020/10/23/pommade-cupro-zincique.pdf' },
    base: { q: 100, u: 'g' },
    composants: [
      { id: 'cuso4', couleur: '#3f8fd0', nom: 'Sulfate de cuivre pentahydraté', q: 0.10, u: 'g', role: 'substance active' },
      { id: 'znso4', nom: 'Sulfate de zinc heptahydraté', q: 0.35, u: 'g', role: 'substance active' },
      { id: 'zno', nom: 'Oxyde de zinc', q: 10.00, u: 'g', role: 'substance active' },
      { id: 'eau', nom: 'Eau purifiée', q: 10.00, u: 'g', role: 'solvant' },
      { id: 'lanoline', couleur: '#efd88a', nom: 'Graisse de laine (lanoline)', q: 20.00, u: 'g', role: 'émulsionnant', een: 'graisse de laine (lanoline)' },
      { id: 'vaseline', couleur: '#fbf8ef', nom: 'Vaseline blanche', q: 59.55, u: 'g', role: 'excipient' },
    ],
    ordo: { patient: 'Sophie Garnier, 41 ans', prescripteur: 'Dr Paul Nguyen, dermatologue', qte: 100, texte: 'Pommade de Dalibour, 100 g. Une application par jour sur l\'intertrigo.' },
    analyse: { ok: 'oui', pourquoi: 'Formule du Formulaire national, patiente adulte.' },
    temp: { max: 60, etape: 'fondre', txt: 'Bain-marie : vers 60 °C, sans dépasser 60 °C' },
    etapes: [
      { id: 'tamis', txt: 'Tamiser l\'oxyde de zinc', vue: 'mortier' },
      { id: 'fondre', txt: 'Faire fondre ensemble la lanoline et la vaseline au bain-marie', vue: 'bainmarie', bain: true },
      { id: 'zno', txt: 'Incorporer l\'oxyde de zinc dans la base fondue', vue: 'mortier', anim: 'triturer', pate: '#f3f1e8' },
      { id: 'refroidir', txt: 'Laisser refroidir', vue: 'mortier' },
      { id: 'sulfates', txt: 'Dissoudre les sulfates de cuivre et de zinc dans l\'eau purifiée', vue: 'ph', anim: 'agiter', teinte: '#8fd0e8' },
      { id: 'ajout', txt: 'Ajouter la solution de sulfates à la base refroidie, triturer', vue: 'mortier', anim: 'triturer', pate: '#e9f1ee' },
      { id: 'cond', txt: 'Conditionner en pot', vue: 'conditionnement', anim: 'conditionner', cond: 'pot' },
    ],
    pieges: [
      { id: 'sulfates_chaud', txt: 'Verser la solution de sulfates dans la base encore fondue', pourquoi: 'La solution s\'ajoute à la base refroidie (Formulaire national).' },
      { id: 'chauffer80', txt: 'Monter le bain-marie à 80 °C', pourquoi: 'La base se fond vers 60 °C, sans dépasser 60 °C.' },
    ],
    controles: { aspect: { bon: 'Pommade blanc-verdâtre très pâle, homogène', faux: ['Pommade bleu vif', 'Gouttelettes d\'eau en surface', 'Grains blancs sous la spatule'] } },
    conservation: { txt: 'Récipient étanche', dlu: null, dluTxt: 'non fixée par le Formulaire national : fixée et justifiée par le pharmacien' },
    mentions: ['een'], een: 'Graisse de laine (lanoline)',
    note: 'Les 0,10 g de sulfate de cuivre se pèsent sur la balance de précision : sur une balance au centigramme, la résolution représenterait 10 % de la masse.',
  },
  {
    id: 'salicyle', nom: 'Pommade à l\'acide salicylique à 10 %', forme: 'Pommade', voie: 'Voie cutanée', couleur: '#f8f5ea',
    source: { titre: 'Formulaire national 2007 — Pommade à l\'acide salicylique', url: 'https://ansm.sante.fr/uploads/2020/10/23/pommade-a-l-acide-salicylique.pdf' },
    base: { q: 100, u: 'g' },
    composants: [
      { id: 'salic', nom: 'Acide salicylique', q: 10, u: 'g', role: 'substance active (kératolytique)' },
      { id: 'vaseline', couleur: '#fbf8ef', nom: 'Vaseline blanche', q: 90, u: 'g', role: 'excipient', qsp: true },
    ],
    ordo: { patient: 'Jacques Morel, 66 ans', prescripteur: 'Dr Paul Nguyen, dermatologue', qte: 50, texte: 'Vaseline salicylée à 10 %, 50 g. Une application le soir sur les plaques de psoriasis des coudes.' },
    analyse: { ok: 'oui', pourquoi: 'Concentration comprise dans la plage du Formulaire national (1 à 50 %), zone limitée chez l\'adulte.' },
    temp: { max: 30, etape: 'chauffe', txt: 'Vaseline éventuellement chauffée, sans dépasser 30 °C' },
    etapes: [
      { id: 'pulv', txt: 'Pulvériser finement l\'acide salicylique', vue: 'mortier', anim: 'triturer', pate: '#ffffff' },
      { id: 'chauffe', txt: 'Assouplir la vaseline au bain-marie (facultatif)', vue: 'bainmarie', bain: true },
      { id: 'incorp', txt: 'Incorporer l\'acide par petites fractions à la vaseline en triturant jusqu\'à homogénéité', vue: 'mortier', anim: 'triturer', pate: '#f8f5ea' },
      { id: 'cond', txt: 'Conditionner en pot', vue: 'conditionnement', anim: 'conditionner', cond: 'pot' },
    ],
    pieges: [
      { id: 'fondre60', txt: 'Fondre la vaseline à 60 °C et y dissoudre l\'acide salicylique', pourquoi: 'Le Formulaire national interdit de chauffer au-delà de 30 °C : l\'acide recristalliserait en aiguilles irritantes.' },
      { id: 'dun_coup', txt: 'Ajouter toute la vaseline d\'un coup sur la poudre', pourquoi: 'L\'incorporation se fait par petites fractions pour éviter les amas de poudre.' },
    ],
    controles: { aspect: { bon: 'Pommade blanche, homogène, sans grain au toucher', faux: ['Cristaux brillants en aiguilles', 'Pommade jaune et liquide', 'Amas blancs dans la vaseline'] } },
    conservation: { txt: 'Récipient étanche', dlu: null, dluTxt: 'non fixée par le Formulaire national : fixée et justifiée par le pharmacien' },
    mentions: [],
    note: 'L\'étiquette doit indiquer la teneur en acide salicylique (Formulaire national) : elle fait partie de la composition quantitative.',
  },
  {
    id: 'spiro', nom: 'Gélules de spironolactone à 5 mg', forme: 'Gélules', voie: 'Voie orale', couleur: '#ffffff', gelules: true,
    source: { titre: 'Formulaire national 2021 — Gélules de spironolactone 0,5 à 25 mg', url: 'https://ansm.sante.fr/uploads/2021/03/25/gelules-de-spironolactone-0-5-a-25-mg.pdf' },
    dose: 5, n: 30, taille: '4', densiteActif: 0.35, densiteExc: 0.60,   // masses volumiques apparentes (g/mL) utilisées par la simulation
    composants: [
      { id: 'spiro', nom: 'Spironolactone', q: 5, u: 'mg', role: 'substance active' },
      { id: 'lactose', nom: 'Lactose monohydraté', q: null, u: 'g', role: 'diluant', qsp: true, een: 'lactose' },
    ],
    ordo: { patient: 'Inès Durand, 4 ans, 16 kg', prescripteur: 'Dr Marc Fabre, cardiopédiatre', qte: 30, texte: 'Spironolactone 5 mg, gélules. Une gélule matin et soir. 30 gélules.' },
    analyse: { ok: 'oui', pourquoi: 'Dosage pédiatrique absent du commerce, prévu par le Formulaire national (0,5 à 25 mg, lactose, gélule n° 4).' },
    temp: null,
    etapes: [
      { id: 'tamis', txt: 'Tamiser la spironolactone et le lactose (tamis 125)', vue: 'mortier' },
      { id: 'eprouvette', txt: 'Mesurer le volume : spironolactone dans l\'éprouvette, compléter avec le lactose jusqu\'au volume des gélules', vue: 'balance', eprouvette: true },
      { id: 'melange', txt: 'Mélanger (dilutions successives au mortier)', vue: 'mortier', anim: 'triturer', pate: '#ffffff' },
      { id: 'remplir', txt: 'Remplir les gélules n° 4 au gélulier, araser, fermer', vue: 'gelulier', anim: 'gelules' },
      { id: 'cond', txt: 'Conditionner en pilulier', vue: 'conditionnement', anim: 'conditionner', cond: 'pot' },
    ],
    pieges: [
      { id: 'sans_tamis', txt: 'Mélanger directement sans tamiser', pourquoi: 'Le tamisage (125) homogénéise la taille des particules : sans lui, le mélange se sépare et la teneur varie d\'une gélule à l\'autre.' },
      { id: 'masse_lactose', txt: 'Peser 30 × 150 mg de lactose sans mesurer le volume', pourquoi: 'Une gélule se remplit en volume : on complète au volume total des gélules (méthode de l\'éprouvette), pas avec une masse fixe.' },
    ],
    controles: { aspect: { bon: 'Gélules n° 4 bien fermées, poudre blanche homogène', faux: ['Gélules à moitié vides', 'Poudre jaune et collante', 'Gélules ouvertes'] }, uniformite: true },
    conservation: { txt: 'À l\'abri de la lumière', dlu: 180, dluTxt: '6 mois' },
    mentions: ['een'], een: 'Lactose',
  },
  {
    id: 'omeprazole', nom: 'Suspension d\'oméprazole à 2 mg/mL', forme: 'Suspension buvable', voie: 'Voie orale', couleur: '#f4f0e2',
    source: { titre: 'Pharmacie des HUG — Suspension d\'oméprazole 2 mg/mL (version officine)', url: 'https://hug.ch/sites/interhug/files/structures/pharmacie/infos-medic/utilismedic/omeprazole_susp_formhug.pdf' },
    base: { q: 50, u: 'mL' },
    composants: [
      { id: 'omep', nom: 'Oméprazole (microgranules des gélules à 20 mg)', q: 100, u: 'mg', role: 'substance active', unites: { n: 5, dose: 20, nom: 'gélules à 20 mg' }, espece: 'omeprazole' },
      { id: 'nahco3', nom: 'Hydrogénocarbonate de sodium', q: 4.2, u: 'g', role: 'alcalinisant (protège l\'oméprazole de l\'acidité)', espece: 'bicarbonate' },
      { id: 'eau', nom: 'Eau purifiée', q: 50, u: 'mL', role: 'solvant', qsp: true },
    ],
    ordo: { patient: 'Théo Petit, 2 ans, 12 kg', prescripteur: 'Dr Claire Joly, pédiatre', qte: 50, texte: 'Oméprazole 2 mg/mL, suspension buvable. 5 mg (2,5 mL) le matin à jeun. 50 mL.' },
    analyse: { ok: 'oui', pourquoi: 'Pas de forme buvable adaptée à cet enfant : préparation à partir des gélules du commerce, dans le bicarbonate à 8,4 %.' },
    temp: null,
    etapes: [
      { id: 'bicar', txt: 'Dissoudre l\'hydrogénocarbonate de sodium dans environ 40 mL d\'eau purifiée', vue: 'ph', anim: 'agiter', teinte: '#e8f2f6' },
      { id: 'ouvrir', txt: 'Ouvrir les 5 gélules et écraser les microgranules au mortier', vue: 'mortier', anim: 'triturer', pate: '#f1e8cf' },
      { id: 'ajout', txt: 'Ajouter progressivement la solution de bicarbonate en triturant', vue: 'mortier', anim: 'triturer', pate: '#f4f0e2' },
      { id: 'qsp', txt: 'Transférer et compléter à 50 mL avec l\'eau purifiée', vue: 'ph', qsp: true },
      { id: 'ph', txt: 'Mesurer le pH', vue: 'ph', ph: true },
      { id: 'cond', txt: 'Conditionner en flacon de 60 mL avec adaptateur pour seringue orale', vue: 'conditionnement', anim: 'conditionner', cond: 'flacon' },
    ],
    pieges: [
      { id: 'eau_seule', txt: 'Disperser les microgranules dans l\'eau seule', pourquoi: 'L\'oméprazole se dégrade en milieu acide ou neutre : le bicarbonate à 8,4 % le protège.' },
      { id: 'jus', txt: 'Aromatiser avec du jus d\'orange', pourquoi: 'Un jus acide neutralise le bicarbonate et dégrade l\'oméprazole.' },
    ],
    controles: { aspect: { bon: 'Suspension blanc cassé, fines particules qui se remettent en suspension par agitation', faux: ['Solution jaune-brun', 'Granules intacts au fond', 'Liquide limpide'] }, ph: { min: 8.0, max: 8.6, txt: 'milieu alcalin (bicarbonate à 8,4 %)' } },
    conservation: { txt: 'Au réfrigérateur (+2 à +8 °C)', dlu: 42, dluTxt: '6 semaines non ouvert, 2 semaines après ouverture', ouverture: '2 semaines' },
    mentions: ['agiter', 'ouverture'],
  },
  {
    id: 'bouche', nom: 'Soin de bouche au bicarbonate', forme: 'Solution pour soin de bouche', voie: 'Voie buccale', couleur: '#eef6f8',
    source: { titre: 'Pharmacie des HUG — Soin de bouche aromatisé', url: 'https://hug.ch/sites/interhug/files/structures/pharmacie/infos-medic/utilismedic/soin_bouche_formhug.pdf' },
    base: { q: 100, u: 'mL' },
    composants: [
      { id: 'nahco3', nom: 'Hydrogénocarbonate de sodium', q: 0.7, u: 'g', role: 'alcalinisant', espece: 'bicarbonate' },
      { id: 'nacl', nom: 'Chlorure de sodium', q: 0.45, u: 'g', role: 'isotonisant' },
      { id: 'arome', nom: 'Arôme (banane, framboise ou neutre)', q: 0.125, u: 'mL', role: 'aromatisant', volume: true },
      { id: 'eau', nom: 'Eau distillée', q: 100, u: 'mL', role: 'solvant', qsp: true },
    ],
    ordo: { patient: 'Gérard Lambert, 63 ans (chimiothérapie, mucite de grade 1)', prescripteur: 'Dr Anne Roux, oncologue', qte: 100, texte: 'Soin de bouche au bicarbonate, 100 mL. 4 à 6 soins par jour, après les repas. Renouveler chaque jour.' },
    analyse: { ok: 'oui', pourquoi: 'Soin de bouche simple, sans alcool ni chlorhexidine. Les bains de bouche associant amphotéricine B ou lidocaïne suivent un protocole local du service : ils ne sont pas repris ici.' },
    temp: null,
    etapes: [
      { id: 'dissoudre', txt: 'Dissoudre le bicarbonate et le chlorure de sodium dans environ 80 mL d\'eau', vue: 'ph', anim: 'agiter', teinte: '#eef6f8' },
      { id: 'arome', txt: 'Ajouter l\'arôme à la pipette', vue: 'ph', anim: 'agiter' },
      { id: 'qsp', txt: 'Compléter à 100 mL avec l\'eau distillée', vue: 'ph', qsp: true },
      { id: 'ph', txt: 'Mesurer le pH', vue: 'ph', ph: true },
      { id: 'cond', txt: 'Conditionner en flacon de 100 mL', vue: 'conditionnement', anim: 'conditionner', cond: 'flacon' },
    ],
    pieges: [
      { id: 'chlorhex', txt: 'Ajouter de la chlorhexidine alcoolique « pour désinfecter »', pourquoi: 'En cas de mucite, on évite la chlorhexidine et les produits alcoolisés (recommandations sur les mucites).' },
      { id: 'eau_robinet', txt: 'Compléter avec l\'eau du robinet', pourquoi: 'La formule prévoit de l\'eau distillée ; le patient est fragile (chimiothérapie).' },
    ],
    controles: { aspect: { bon: 'Solution limpide, incolore, légèrement parfumée', faux: ['Solution trouble avec dépôt', 'Solution bleue', 'Liquide visqueux'] }, ph: { min: 7.9, max: 8.6, txt: 'solution de bicarbonate' }, osmo: { valeur: 320, tol: 10 } },
    conservation: { txt: 'À température ambiante (non ouvert)', dlu: null, dluTxt: 'à utiliser dans les 24 h après ouverture', ouverture: '24 heures' },
    mentions: ['ne_pas_avaler', 'ouverture'],
  },
  {
    id: 'minoxidil', nom: 'Solution de minoxidil à 5 %', forme: 'Solution pour application cutanée', voie: 'Voie cutanée (cuir chevelu)', couleur: '#f7fbff',
    source: { titre: 'RCP Minoxidil Viatris Conseil 5 % (composition : minoxidil 5 g, propylène glycol 50 mL, éthanol 31,2 mL, eau qsp 100 mL)', url: 'https://agence-prd.ansm.sante.fr/php/ecodex/rcp/R0440651.htm' },
    proposeMode: true,
    base: { q: 100, u: 'mL' },
    composants: [
      { id: 'minox', nom: 'Minoxidil', q: 5, u: 'g', role: 'substance active' },
      { id: 'pg', nom: 'Propylène glycol', q: 50, u: 'mL', role: 'solvant', volume: true, een: 'propylène glycol' },
      { id: 'ethanol', nom: 'Éthanol à 96 %', q: 31.2, u: 'mL', role: 'solvant', volume: true, een: 'éthanol' },
      { id: 'eau', nom: 'Eau purifiée', q: 100, u: 'mL', role: 'solvant', qsp: true },
    ],
    ordo: { patient: 'Karim Benali, 38 ans', prescripteur: 'Dr Paul Nguyen, dermatologue', qte: 60, texte: 'Minoxidil 5 %, solution, 60 mL. 1 mL matin et soir sur le cuir chevelu sec.' },
    analyse: { ok: 'oui', pourquoi: 'Homme adulte, alopécie androgénétique. La composition suit celle de la spécialité à 5 %.' },
    temp: null,
    etapes: [
      { id: 'dissoudre', txt: 'Dissoudre le minoxidil dans le propylène glycol et l\'éthanol sous agitation', vue: 'ph', anim: 'agiter', teinte: '#f7fbff' },
      { id: 'qsp', txt: 'Transférer en fiole jaugée et compléter à 60 mL avec l\'eau purifiée', vue: 'ph', qsp: true },
      { id: 'homog', txt: 'Homogénéiser', vue: 'ph', anim: 'agiter' },
      { id: 'cond', txt: 'Conditionner en flacon avec pipette doseuse', vue: 'conditionnement', anim: 'conditionner', cond: 'flacon' },
    ],
    pieges: [
      { id: 'eau_dabord', txt: 'Disperser le minoxidil dans l\'eau avant les solvants', pourquoi: 'Le minoxidil est peu soluble dans l\'eau : on le dissout d\'abord dans le propylène glycol et l\'éthanol.' },
      { id: 'flamme', txt: 'Chauffer au bec Bunsen pour accélérer la dissolution', pourquoi: 'Solution alcoolique inflammable : aucune flamme à proximité.' },
    ],
    controles: { aspect: { bon: 'Solution limpide, incolore à jaune très pâle, odeur d\'alcool', faux: ['Cristaux blancs au fond du flacon', 'Deux phases séparées', 'Solution laiteuse'] } },
    conservation: { txt: 'Au plus à 25 °C, flacon bien fermé', dlu: null, dluTxt: 'fixée et justifiée par le pharmacien' },
    mentions: ['een', 'inflammable'], een: 'Propylène glycol, éthanol',
    note: 'Le Formulaire national n\'a pas de monographie de minoxidil : le mode opératoire est proposé pour le TP d\'après la composition de la spécialité.',
  },
];
