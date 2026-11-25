"""Ajoute aux cas hospitaliers qui contiennent un compte rendu d'anatomopathologie une vraie lame de tumeur (TCGA, via NCI
Imaging Data Commons), du même type que la tumeur du cas, consultable en zoom dans la page (document « lame »).
usage : python3 -I ajout_lames.py classeur.xlsx imagerie/lames.json sortie.xlsx [--essai]
Un cas reçoit une lame si son compte rendu cite un type de tumeur du catalogue (règles proches d'ajout_imagerie.py)."""
import sys, re, json, zlib, collections, openpyxl

CLASSEUR, CATALOGUE, SORTIE = sys.argv[1:4]
ESSAI = '--essai' in sys.argv
CAT = json.load(open(CATALOGUE))['lames']
PAR = collections.defaultdict(list)
for s in CAT: PAR[s['cat']].append(s)
R = [
    ('poumon_adk', r"adénocarcinome (?:bronchique|pulmonaire|du poumon|broncho-pulmonaire|lépidique|acineux)|adénocarcinome[^.;\n]{0,40}(?:TTF1|TTF-1)"),
    ('poumon_epi', r"carcinome épidermoïde (?:bronchique|pulmonaire|du poumon|broncho)|biopsies? bronchiques?[^.]{0,80}carcinome épidermoïde"),
    ('rein_ccrcc', r"carcinome (?:rénal )?à cellules claires"), ('rein_papillaire', r"carcinome (?:rénal )?papillaire|carcinome tubulo-papillaire"),
    ('foie_chc', r"carcinome hépatocellulaire|hépatocarcinome"), ('cholangio', r"cholangiocarcinome|carcinome cholangiocellulaire"),
    ('sein', r"carcinome (?:canalaire|lobulaire|mammaire)|carcinome infiltrant de type non spécifique|adénocarcinome mammaire|carcinome (?:du|de) sein"),
    ('prostate', r"adénocarcinome (?:de la )?prostat|adénocarcinome acinaire|score de gleason|grade ISUP"),
    ('glioblastome', r"glioblastome|gliome de haut grade"), ('gliome', r"gliome (?:diffus )?de bas grade|astrocytome (?:de )?grade (?:2|II)|oligodendrogliome"),
    ('pancreas', r"adénocarcinome (?:canalaire )?(?:du |de la tête du |du corps du |de la queue du )?pancréa"),
    ('endometre', r"carcinome endométrioïde|adénocarcinome (?:de l['’]|de l’)?endomètr|carcinome (?:de l['’]|de l’)endomètre"),
    ('col_uterus', r"carcinome épidermoïde (?:du col|cervical)|adénocarcinome (?:du col|endocervical)|cancer du col"),
    ('sarcome', r"(?<!ostéo)(?<!rhabdomyo)\b(?:lipo|léiomyo|fibro|myxofibro)?sarcome(?! de kaposi| d'ewing)"),
    ('surrenale', r"corticosurrénalome|carcinome corticosurrénalien"), ('ovaire', r"carcinome séreux|adénocarcinome (?:séreux )?(?:de l['’]|de l’)?ovair|carcinome (?:de l['’]|de l’)ovaire"),
    ('colon_rectum', r"adénocarcinome (?:lieberkühnien|liberkühnien|colique|rectal|du côlon|du colon|du rectum|colorectal|sigmoïdien|du caecum)|adénocarcinome[^.;\n]{0,60}(?:côlon|colon|rectum|caecum|sigmoïde)"),
    ('estomac', r"adénocarcinome (?:gastrique|de l['’]estomac|tubuleux gastrique)|carcinome à cellules indépendantes|linite"),
    ('oesophage', r"(?:carcinome épidermoïde|adénocarcinome) (?:de l['’]|du |de l’)?(?:œsophage|oesophage|bas œsophage|cardia)|endobrachyœsophage"),
    ('vessie', r"carcinome urothélial|carcinome (?:de la )?vessie|tumeur (?:urothéliale|vésicale) infiltrante"),
    ('orl', r"carcinome épidermoïde (?:de l['’]oropharynx|du larynx|de l['’]hypopharynx|de la cavité buccale|de la langue|de l['’]amygdale|du pharynx|du sinus piriforme|de la glotte|du plancher)|carcinome épidermoïde[^.;\n]{0,40}(?:ORL|VADS|p16)"),
    ('thyroide', r"carcinome (?:papillaire|vésiculaire) (?:de la |thyroïdien)|carcinome papillaire de la thyroïde|carcinome thyroïdien"),
    ('melanome', r"mélanome(?! uvéal)(?! choroïdien)"), ('uveal', r"mélanome (?:uvéal|choroïdien)"),
    ('lymphome', r"lymphome (?:B )?diffus à grandes cellules|lymphome B à grandes cellules|\bLBDGC\b|\bDLBCL\b"),
    ('testicule', r"séminome|tumeur germinale (?:non séminomateuse|du testicule)|carcinome embryonnaire"),
    ('mesotheliome', r"mésothéliome"), ('thymus', r"thymome|carcinome thymique"),
]
RX = [(c, re.compile(m, re.I)) for c, m in R if c in PAR]
NEG = re.compile(r"(pas de|absence d[e']|sans |élimin|exclu|recherche d|évoqu|différentiel|antécédents? d[e']|ATCD)[^.;\n]{0,50}$", re.I)
def compte(rx, t): return sum(1 for m in rx.finditer(t) if not NEG.search(t[max(0, m.start() - 60):m.start()]))

wb = openpyxl.load_workbook(CLASSEUR)
wc, wd = wb['Cas_Cliniques'], wb['Documents_Examens']
H = {h: i for i, h in enumerate(next(wc.iter_rows(min_row=1, max_row=1, values_only=True)))}
HD = [c.value for c in wd[1]]
docs = collections.defaultdict(list)
for r in wd.iter_rows(min_row=2, values_only=True):
    if r[0]: docs[r[0]].append(r)
# 1) Site primitif d'après l'intitulé du cas (libellé CIM-10), 2) histologie d'après le compte rendu (énoncé).
SITE = [  # (motif sur l'intitulé, catégorie ou fonction de choix)
    (r"in situ|évolution imprévisible|leucémie|myélome|myélodysplas|polyglobulie|anémie|waldenstr|hodgkin|folliculaire|zone marginale|lymphoblastique", None),
    (r"lymphome diffus à grandes cellules", 'lymphome'),
    (r"secondaire", 'HISTO'),                                        # métastase : type de la tumeur primitive cité dans le compte rendu
    (r"bronche|poumon|trachée", 'POUMON'),
    (r"\brein\b", 'REIN'), (r"bassinet|uretère|vessie", 'vessie'),
    (r"oesophage|œsophage|cardia", 'oesophage'), (r"estomac|fundus|antre|pylore|petite courbure|grande courbure", 'estomac'),
    (r"canal anal", 'ANUS'), (r"côlon|colon|rectum|caecum|recto-sigmo|sigmoïde", 'colon_rectum'),
    (r"pancréas", 'PANCREAS'), (r"canal biliaire|voies biliaires|cholangio", 'cholangio'), (r"hépatocellulaire|\bfoie\b", 'foie_chc'),
    (r"\bsein\b", 'sein'), (r"prostate", 'prostate'), (r"ovaire", 'ovaire'),
    (r"endomètre|corps de l['’]utérus", 'endometre'), (r"col de l['’]utérus|exocol|endocol", 'col_uterus'),
    (r"testicule", 'testicule'), (r"thyroïde", 'THYROIDE'), (r"mésothéliome", 'mesotheliome'), (r"tissus mous|tissu conjonctif", 'sarcome'),
    (r"mélanome", 'melanome'), (r"\bpeau\b", 'PEAU'),
    (r"langue|plancher de la bouche|oropharynx|hypopharynx|sinus piriforme|glotte|sus-glottique|larynx|rhinopharynx|amygdale|rétromolaire|cavité buccale", 'orl'),
    (r"cerveau|encéphale", 'CERVEAU'),
]
SITE = [(re.compile(m, re.I), c) for m, c in SITE]
def h(rx, t): return compte(re.compile(rx, re.I), t)
def choix(titre, E):
    for rx, c in SITE:
        if not rx.search(titre): continue
        if c is None: return None, 'hors catalogue (hémopathie, in situ, incertain…)'
        if c == 'POUMON':
            if h(r"petites cellules|neuroendocrine|carcinoïde", E) and not h(r"adénocarcinome|épidermoïde", E): return None, 'poumon neuroendocrine'
            if re.search(r"TTF-?1\s*(?:[-–]|négati)|localisation (?:pulmonaire|secondaire) d|origine (?:colique|digestive|prostatique|mammaire|extra-?pulmonaire)", E, re.I):
                if re.search(r"SATB2\s*\+|CDX2\s*\+|CK20\s*\+|origine (?:colique|digestive)", E, re.I): return 'colon_rectum', 'primitif'
                if re.search(r"NKX3|PSA\s*\+|prostati", E, re.I): return 'prostate', 'primitif'
                if re.search(r"GATA3\s*\+|mammaire", E, re.I): return 'sein', 'primitif'
                return None, 'poumon : métastase d\'origine indéterminée'
            e, a = h(r"épidermoïde|malpighien", E), h(r"adénocarcinome|lépidique|acineux", E)
            if not (e or a): return None, 'poumon sans type histologique'
            return ('poumon_epi' if e > a else 'poumon_adk'), ''
        if c == 'REIN': return ('rein_papillaire' if h(r"papillaire", E) and not h(r"cellules claires", E) else 'rein_ccrcc'), ''
        if c == 'ANUS': return ('colon_rectum', '') if h(r"adénocarcinome", E) else (None, 'canal anal épidermoïde')
        if c == 'PANCREAS': return (None, 'pancréas neuroendocrine') if h(r"neuroendocrine", E) and not h(r"adénocarcinome", E) else ('pancreas', '')
        if c == 'THYROIDE': return ('thyroide', '') if h(r"papillaire", E) else (None, 'thyroïde non papillaire')
        if c == 'PEAU': return ('melanome', '') if h(r"mélanome", E) else (None, 'peau non mélanome')
        if c == 'CERVEAU': return ('glioblastome', '') if h(r"glioblastome|haut grade", E) else ('gliome', '') if h(r"gliome|astrocytome|oligodendro", E) else (None, 'cerveau sans gliome')
        if c == 'HISTO': break
        return c, ''
    sc = {}
    for i, (c, rx) in enumerate(RX):
        k = compte(rx, E)
        if k: sc[c] = (k, -i)
    if not sc: return None, 'aucun type reconnu'
    return max(sc, key=lambda k: sc[k]), 'primitif'
stats, n = collections.Counter(), 0
for row in wc.iter_rows(min_row=2):
    v = lambda k: row[H[k]].value
    cid = v('id')
    if not cid or not any('ANATOMO' in str(d[4] or '').upper() for d in docs[cid]): continue
    if any(d[3] == 'lame' for d in docs[cid]): stats['déjà'] += 1; continue
    titre = re.sub(r'^[^:]*: ', '', str(v('apercu') or '')); E = str(v('enonce') or '')
    c, pourquoi = choix(titre, E)
    if not c: stats['sans lame : ' + pourquoi] += 1; continue
    L = PAR[c]; s = L[zlib.crc32(cid.encode()) % len(L)]
    num = max([int(d[2]) for d in docs[cid]] or [0]) + 1
    ligne = {'cas_id': cid, 'theme_id': v('theme_id'), 'doc_num': num, 'doc_type': 'lame', 'doc_titre': 'Lame histologique (HES)', 'doc_origine': 'TCGA / NCI Imaging Data Commons (illustration)',
             'ligne_num': 1, 'texte_ou_details': f"lame: {s['id']} ; legende: Illustration : {s['nom'][0].lower() + s['nom'][1:]}{' (tumeur primitive)' if pourquoi == 'primitif' else ''}, lame d'un autre patient ; libre: oui"}
    stats[c] += 1; n += 1
    if ESSAI and n % 9 == 0: print('  ex.', cid, titre[:60], '->', c, pourquoi)
    if not ESSAI:
        wd.append([ligne.get(h) for h in HD])
        row[H['nb_documents']].value = int(v('nb_documents') or 0) + 1
        row[H['documents_types']].value = ', '.join([x for x in [v('documents_types')] if x] + ['lame'])
        row[H['documents_titres']].value = ' ; '.join([x for x in [v('documents_titres')] if x] + ['[lame] Lame histologique (HES)'])
for k, x in stats.most_common(): print(k, x)
print('total', n)
if not ESSAI: wb.save(SORTIE)
