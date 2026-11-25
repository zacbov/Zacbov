"""Ajoute aux cas de cancérologie un document « imagerie » (scanner ou IRM d'illustration, visionneuse imagerie/visionneuse.js).
usage : python3 -I ajout_imagerie.py classeur.xlsx imagerie/tumeurs.json sortie.xlsx [--essai]
- Parcours hospitalier : document remis d'emblée (libre) ; médecine : à demander au patient (diagnostic masqué, légende neutre).
- Officine : rien (l'imagerie n'y est pas utile).
- Un cas reçoit une seule imagerie : le type de tumeur le plus cité (au moins deux mentions, ou une dans les réponses attendues).
"""
import sys, re, json, zlib, collections, openpyxl

CLASSEUR, CATALOGUE, SORTIE = sys.argv[1:4]
ESSAI = '--essai' in sys.argv
CAT = json.load(open(CATALOGUE))['series']
PAR = collections.defaultdict(list)
for s in CAT: PAR[s['cat']].append(s)

R = [  # (catégorie, motif) : l'ordre départage les égalités
    ('poumon_adk', r"adénocarcinome (?:bronchique|pulmonaire|du poumon|broncho-pulmonaire)|adénocarcinome (?:du )?lobe (?:supérieur|inférieur|moyen)"),
    ('poumon_epi', r"carcinome épidermoïde (?:bronchique|pulmonaire|du poumon|broncho)"),
    ('poumon_cbnpc', r"\bCBNPC\b|\bCBPC\b|cancer (?:bronchique|bronchopulmonaire|broncho-pulmonaire|du poumon|pulmonaire)|carcinome bronchique|néoplasie (?:bronchique|pulmonaire)|tumeur (?:bronchique|pulmonaire)|carcinome (?:neuroendocrine )?à petites cellules|tumeur maligne (?:de|des) (?:bronche|bronches|lobe)[^.;\n]{0,40}|tumeur maligne[^.;\n]{0,25}poumon"),
    ('rein_ccrcc', r"(?:carcinome|cancer) (?:rénal )?à cellules claires"),
    ('rein', r"carcinome rénal|cancer du rein|adénocarcinome rénal|tumeur (?:du rein|rénale)|néoplasie rénale|tumeur maligne du rein"),
    ('foie_chc', r"carcinome hépatocellulaire|hépatocarcinome|\bCHC\b|tumeur maligne (?:primitive )?du foie(?! et des voies biliaires intra)"),
    ('foie_meta', r"métastases? hépatiques?|lésions? (?:secondaires )?hépatiques? secondaires?|tumeur maligne secondaire du foie"),
    ('sein', r"cancer du sein|carcinome (?:canalaire|lobulaire|mammaire)|adénocarcinome mammaire|néoplasie mammaire|tumeur du sein|néoplasme du sein|tumeur maligne du sein"),
    ('prostate', r"adénocarcinome (?:de la )?prostat|cancer de la prostate|cancer prostatique|néoplasie prostatique|tumeur maligne de la prostate"),
    ('glioblastome', r"glioblastome|gliome de haut grade|astrocytome (?:de )?grade (?:IV|4)"),
    ('pancreas', r"(?:adéno)?carcinome (?:canalaire )?(?:du |de la tête du |de la queue du |du corps du )?pancréa|cancer du pancréas|néoplasie pancréatique|tumeur (?:de la tête )?du pancréas|tumeur maligne (?:de la tête |du corps |de la queue )?du pancréas"),
    ('endometre', r"(?:adéno)?carcinome (?:de l'|de l’)endomètre|cancer de l['’]endomètre|adénocarcinome endométrioïde|carcinome endométrioïde|tumeur maligne (?:du corps de l['’]utérus|de l['’]endomètre)"),
    ('sarcome', r"(?<!ostéo)(?<!rhabdomyo)\b(?:lipo|léiomyo|fibro)?sarcome(?! de kaposi| d'ewing)"),
    ('surrenale', r"corticosurrénalome|carcinome (?:cortico-?)?surrénalien|carcinome de la surrénale"),
    ('ovaire', r"(?:adéno)?carcinome (?:séreux )?(?:de l['’]|de l’)?ovair|cancer de l['’]ovaire|tumeur (?:maligne )?de l['’]ovaire|carcinome ovarien|néoplasie ovarienne|cancer ovarien|tumeur maligne de l['’]ovaire"),
    ('colon_rectum', r"(?:adéno)?carcinome (?:du |de la )?(?:côlon|colon|colique|rect|sigmo|caecum|colorectal)|cancer (?:du |de la )?(?:côlon|colon|rectum|colorectal|sigmoïde)|tumeur (?:du |de la )?(?:côlon|colon|rectum|sigmoïde)|néoplasie (?:colique|rectale|colorectale)|tumeur maligne (?:du |de la )(?:côlon|colon|rectum|caecum|jonction recto-sigmoïdienne|canal anal)"),
    ('estomac', r"(?:adéno)?carcinome (?:gastrique|de l['’]estomac)|cancer (?:gastrique|de l['’]estomac)|linite|tumeur gastrique|néoplasie gastrique|adénocarcinome (?:de la jonction|du cardia|oeso-gastrique|œso-gastrique)|tumeur maligne (?:de l['’]estomac|du cardia|de l['’]antre)"),
    ('vessie', r"carcinome urothélial|tumeur (?:de (?:la )?vessie|vésicale)|cancer (?:de la vessie|vésical)|néoplasie vésicale|carcinome vésical|tumeur maligne (?:de (?:la )?)?(?:paroi [^.;\n]{0,25})?(?:de la )?vessie"),
    ('orl', r"carcinome épidermoïde (?:de l['’]oropharynx|du larynx|de l['’]hypopharynx|de la cavité buccale|de la langue|de l['’]amygdale|du pharynx|ORL|des VADS|du cavum)|cancer (?:ORL|des VADS|du larynx|de l['’]oropharynx|du cavum|de la langue)|tumeur ORL|carcinome du nasopharynx|tumeur maligne (?:du sinus piriforme|de la cavité buccale|de la base de la langue|de l['’]amygdale|de l['’]oropharynx|du larynx|de l['’]hypopharynx|de la langue|du plancher de la bouche|de la bouche|du rhinopharynx|du nasopharynx|de la glotte)"),
    ('os_rachis', r"myélome(?: multiple)?|maladie de kahler|plasmocytome|métastases? osseuses? (?:vertébrales?|rachidiennes?)|lésions? lytiques?"),
    ('ganglions', r"\blymphomes?\b(?! cutané)|maladie de hodgkin|\bLDGCB\b"),
]
RX = [(c, re.compile(m, re.I)) for c, m in R]
ONCO = re.compile(r'oncolog|cancérolog|anatomopatho|hématolog|onco_', re.I)
FAMILLE = re.compile(r"(famil|s[oœ]eur|mère|père|frère|fille|fils|oncle|tante|grand-|cousin|conjoint|époux|épouse|mari)[^.\n]{0,60}$", re.I)
NEG = re.compile(r"(pas de|absence d[e']|sans |élimin|exclu|recherche d|évoqu|différentiel|suspicion d|hypothèse d)[^.;\n]{0,50}$", re.I)
def compte(rx, t):                                # mentions du patient lui-même (antécédents familiaux et négations écartés)
    return sum(1 for m in rx.finditer(t) if not FAMILLE.search(t[max(0, m.start() - 70):m.start()]) and not NEG.search(t[max(0, m.start() - 60):m.start()]))
EXAMEN = {s['cat']: s['examen'].split(' (')[0] for s in CAT}

wb = openpyxl.load_workbook(CLASSEUR)
wc, wd, wq = wb['Cas_Cliniques'], wb['Documents_Examens'], wb['Questions_Reponses']
H = {h: i for i, h in enumerate(next(wc.iter_rows(min_row=1, max_row=1, values_only=True)))}
HD = [c.value for c in wd[1]]
rep = collections.defaultdict(str)
for r in wq.iter_rows(min_row=2, values_only=True):
    if r[0]: rep[r[0]] += ' ' + str(r[7] or '') + ' ' + str(r[6] or '')
docs = collections.defaultdict(list)
for r in wd.iter_rows(min_row=2, values_only=True):
    if r[0]: docs[r[0]].append(r)

stats, ajouts = collections.Counter(), []
for row in wc.iter_rows(min_row=2):
    v = lambda k: row[H[k]].value
    cid, pop = v('id'), v('pop_id')
    if not cid or pop not in ('hospitalier', 'medecine'): continue
    if any(d[3] == 'imagerie' for d in docs[cid]): stats['déjà'] += 1; continue
    A, E, Rp = str(v('apercu') or ''), str(v('enonce') or ''), rep[cid]
    onco = bool(ONCO.search(str(v('specialites') or '') + ' ' + str(v('theme_id') or '')))
    score = {}
    for i, (c, rx) in enumerate(RX):
        a, e = compte(rx, A), compte(rx, E)
        if not (a or e): continue                 # cité seulement dans les réponses : souvent un diagnostic différentiel
        score[c] = (3 * a + e + len(rx.findall(Rp)), -i)
    if not score: continue
    c = max(score, key=lambda k: score[k])
    if score[c][0] < (1 if onco else 3): stats['trop peu cité'] += 1; continue
    sx = {'Homme': 'M', 'Femme': 'F'}.get(v('patient_sexe'))
    L = [s for s in PAR[c] if s['sexe'] == sx] or PAR[c]
    s = L[zlib.crc32(cid.encode()) % len(L)]
    libre = pop == 'hospitalier'
    leg = ('Illustration : ' + re.sub(r' \(.*\)$', '', s['titre']).lower()) if libre else "Images remises par le patient (sans compte rendu)"
    n = max([int(d[2]) for d in docs[cid]] or [0]) + 1
    ligne = {'cas_id': cid, 'theme_id': v('theme_id'), 'doc_num': n, 'doc_type': 'imagerie', 'doc_titre': EXAMEN[c], 'doc_origine': 'TCIA / NCI Imaging Data Commons (illustration)',
             'ligne_num': 1, 'texte_ou_details': f"serie: {s['id']} ; legende: {leg} ; libre: {'oui' if libre else 'non'}"}
    ajouts.append(ligne); stats[(pop, c)] += 1
    if not ESSAI:
        wd.append([ligne.get(h) for h in HD])
        row[H['nb_documents']].value = (int(v('nb_documents') or 0)) + 1
        row[H['documents_types']].value = ', '.join([x for x in [v('documents_types')] if x] + ['imagerie'])
        row[H['documents_titres']].value = ' ; '.join([x for x in [v('documents_titres')] if x] + [f'[imagerie] {EXAMEN[c]}'])
for k, n in sorted(stats.items(), key=lambda x: str(x[0])): print(k, n)
print('total', len(ajouts))
if ESSAI:
    import random; random.seed(1)
    for a in random.sample(ajouts, min(12, len(ajouts))): print(a['cas_id'], a['doc_titre'], a['texte_ou_details'])
else:
    wb.save(SORTIE)
