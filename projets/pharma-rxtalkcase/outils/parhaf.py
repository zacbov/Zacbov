# Conversion des comptes rendus PARHAF (projet PARTAGES, Health Data Hub ; patients fictifs, comptes rendus rédigés et
# relus par des médecins ; licences CC BY 4.0 / Etalab 2.0) en cas cliniques au format de l'outil.
#   python3 parhaf.py patients.json DOSSIER_TXT bdpm.json THESAURUS_DIR LOT SORTIE.json
#   LOT : officine | hospitalier | medecine
# Les réponses modèles sont construites à partir du texte du compte rendu (sections citées), de la BDPM et du thésaurus
# des interactions de l'ANSM (version structurée de sept. 2019, projet scossin/pddiansm).
import json, re, sys, os, unicodedata, random, collections

PJ, DOS, BD, TH, LOT, OUT = sys.argv[1:7]
N = lambda s: unicodedata.normalize('NFD', s or '').encode('ascii', 'ignore').decode().lower()
random.seed(7)

# ---------------------------------------------------------------- lexique des médicaments (BDPM)
B = json.load(open(BD))
SEL = re.compile(r"^(base|du|la|le|bromure|mesylate|besylate|dipropionate|propionate|furoate|xinafoate|fumarate|chlorhydrate|bromhydrate|maleate|fumarate|tartrate|succinate|besilate|mesilate|sulfate|phosphate|acetate|citrate|sodique|potassique|calcique|magnesique|monohydrate|dihydrate|trihydrate|hemihydrate|anhydre|de|d)$")
def dci(s):
    w = [x for x in re.split(r"[\s,()'’]+", N(s)) if x and not SEL.match(x)]
    return ' '.join(w).strip()
LEX = {}          # mot(s) normalisé(s) -> (libellé, frozenset(substances))
for m in B['m']:
    if m[14]: continue                         # homéopathie
    subs = frozenset(dci(s[0]) for s in m[5] if s[0])
    if not subs: continue
    marque = re.split(r'\s+\d|,', m[1])[0].strip()
    k = N(marque)
    if len(k) >= 4 and k not in LEX: LEX[k] = (marque.title() if marque.isupper() else marque, subs)
    for s in subs:
        if len(s) >= 5 and s not in LEX: LEX[s] = (s, frozenset([s]))
CLES = sorted(LEX, key=lambda k: -len(k))
MOTS1 = {k for k in LEX if ' ' not in k}
NON = set('soir matin midi jour jours semaine mois heure heures dose doses fois avant apres pendant puis selon si besoin traitement sortie arret stop'.split())

def reperer(ligne):
    """médicaments d'une ligne : [(libellé, substances)]"""
    t = ' ' + re.sub(r"[^a-z0-9]+", ' ', N(ligne)) + ' '; vus = []
    for k in CLES:
        if ' ' in k and (' ' + k + ' ') in t: vus.append(LEX[k]); t = t.replace(' ' + k + ' ', ' # ')
    for w in t.split():
        if w in MOTS1 and w not in NON: vus.append(LEX[w])
    return vus

# ---------------------------------------------------------------- thésaurus ANSM
TS = json.load(open(os.path.join(TH, 'Thesaurus_09_2019.json')))
IX = {N(x['substance']).replace('-', ' '): {N(c) for c in x['drug_classes']} for x in json.load(open(os.path.join(TH, 'index_des_substances_09_2019.json')))}
def noms(s):
    s2 = s.replace('-', ' '); return {s2} | IX.get(s2, set())
NIV = {'CONTRE-INDICATION': (0, 'contre-indication'), 'Association DECONSEILLEE': (1, 'association déconseillée'), "Précaution d'emploi": (2, "précaution d'emploi"), 'A prendre en compte': (3, 'à prendre en compte'), 'Il convient de prendre en compte': (3, 'à prendre en compte')}
TSN = [(N(x['main_drug']).replace('-', ' '), N(x['plus_drug']).replace('-', ' '), x) for x in TS]
def propre(t): return re.sub(r'\s+', ' ', (t or '').replace('\n', ' ')).strip()
def interactions(meds):
    """meds : [(libellé, substances)] -> liste d'interactions (niveau, a, b, mécanisme, conduite)"""
    out, vus = [], set()
    flat = [(lib, s) for lib, ss in meds for s in ss]
    for i in range(len(flat)):
        for j in range(i + 1, len(flat)):
            (la, a), (lb, b) = flat[i], flat[j]
            if a == b or la == lb: continue
            na, nb = noms(a), noms(b)
            for m, p, x in TSN:
                if (m in na and p in nb) or (m in nb and p in na):
                    cle = (frozenset((a, b)), x['main_drug'], x['plus_drug'])
                    if cle in vus: continue
                    vus.add(cle)
                    lv = sorted((NIV.get(l['level'], (4, l['level'].lower())) + (propre(l['info']),) for l in x['severity_levels']), key=lambda z: z[0])
                    out.append(dict(rang=lv[0][0], niveau=[l[1] for l in lv], a=a, b=b, la=la, lb=lb, rubrique=f"{x['main_drug']} + {x['plus_drug']}",
                                    mecanisme=propre(x['interaction_mechanism']), conduite=' '.join(propre(l[2]).lstrip(': ') for l in lv if l[2]) or ''))
    out.sort(key=lambda d: d['rang'])
    # une seule ligne par couple de substances (la plus grave)
    res, deja = [], set()
    for d in out:
        k = frozenset((d['a'], d['b']))
        if k in deja: continue
        deja.add(k); res.append(d)
    return res

# ---------------------------------------------------------------- conseils par classe (substances normalisées)
CONSEILS = [
    (r'apixaban|rivaroxaban|dabigatran|edoxaban', "anticoagulant oral direct : prise à heure fixe, ne jamais doubler une dose oubliée, pas d'AINS ni d'aspirine en automédication, signaler tout saignement, carte de porteur d'anticoagulant, prévenir tout soignant avant un geste"),
    (r'warfarine|fluindione|acenocoumarol', "AVK : INR aux dates prévues (carnet), prise le soir à heure fixe, nombreuses interactions (antibiotiques, AINS, millepertuis), alimentation régulière en vitamine K, signaler tout saignement"),
    (r'enoxaparine|tinzaparine|dalteparine|fondaparinux', "anticoagulant injectable : technique d'injection sous-cutanée, alterner les sites, élimination des aiguilles (DASRI), surveillance des plaquettes si prescrite"),
    (r'clopidogrel|prasugrel|ticagrelor|acide acetylsalicylique', "antiagrégant : ne pas arrêter sans avis du cardiologue (risque de thrombose de stent), signaler saignements et selles noires, pas d'AINS"),
    (r'insuline', "insuline : technique et sites d'injection, conservation (stylo entamé à température ambiante), autosurveillance glycémique, reconnaître et resucrer une hypoglycémie (15 g de sucre)"),
    (r'metformine', "metformine : pendant ou à la fin des repas, troubles digestifs fréquents au début, arrêt temporaire avant injection d'iode et en cas de déshydratation"),
    (r'gliclazide|glimepiride|glibenclamide|repaglinide', "sulfamide/glinide : risque d'hypoglycémie, ne pas sauter de repas, attention chez le sujet âgé"),
    (r'empagliflozine|dapagliflozine|canagliflozine', "gliflozine : hygiène intime (infections génitales), boire suffisamment, arrêt en cas de déshydratation ou de jeûne prolongé"),
    (r'prednisone|prednisolone|methylprednisolone|dexamethasone|hydrocortisone', "corticoïde : prise le matin, ne pas arrêter brutalement (décroissance), surveillance glycémie et tension, protection osseuse si traitement prolongé"),
    (r'morphine|oxycodone|tramadol|codeine|fentanyl|hydromorphone|tapentadol', "antalgique opioïde : somnolence (conduite), constipation à prévenir (laxatif), ne pas associer d'alcool ni d'autres sédatifs, signes de surdosage (somnolence, respiration lente)"),
    (r'paracetamol', "paracétamol : maximum 3 à 4 g par jour chez l'adulte (moins si poids < 50 kg, insuffisance hépatique ou alcool), attention aux associations qui en contiennent déjà"),
    (r'amoxicilline|clavulanique|cefpodoxime|ceftriaxone|cefixime|levofloxacine|ofloxacine|ciprofloxacine|moxifloxacine|azithromycine|clarithromycine|doxycycline|sulfamethoxazole|trimethoprime|metronidazole|linezolide|pristinamycine|cefuroxime|nitrofurantoine|fosfomycine|rifampicine|isoniazide|clindamycine', "antibiotique : respecter la durée prescrite même si les symptômes disparaissent, horaires réguliers, consulter en cas de diarrhée importante ou d'éruption"),
    (r'levofloxacine|ofloxacine|ciprofloxacine|moxifloxacine', "fluoroquinolone : éviter le soleil, arrêter et consulter en cas de douleur de tendon (Achille), à distance des sels de fer, calcium, magnésium"),
    (r'furosemide|bumetanide|hydrochlorothiazide|indapamide|spironolactone|eplerenone', "diurétique : prise le matin, pesée régulière (prise de poids rapide = consulter), kaliémie et créatinine à surveiller, attention à la déshydratation (chaleur, diarrhée)"),
    (r'ramipril|perindopril|enalapril|lisinopril|captopril|losartan|valsartan|candesartan|irbesartan|telmisartan|olmesartan|sacubitril', "IEC/sartan : hypotension en se levant, toux sèche (IEC), kaliémie et créatinine à contrôler, pas d'AINS"),
    (r'bisoprolol|metoprolol|nebivolol|carvedilol|atenolol|propranolol|acebutolol', "bêtabloquant : ne jamais arrêter brutalement, fatigue et mains froides au début, peut masquer une hypoglycémie"),
    (r'amiodarone', "amiodarone : photosensibilisation (protection solaire), surveillance thyroïdienne et hépatique, nombreuses interactions"),
    (r'digoxine', "digoxine : signes de surdosage (nausées, troubles visuels, pouls lent), kaliémie et fonction rénale"),
    (r'atorvastatine|rosuvastatine|simvastatine|pravastatine|ezetimibe', "hypolipémiant : signaler toute douleur musculaire inexpliquée, éviter le jus de pamplemousse (certaines statines)"),
    (r'omeprazole|esomeprazole|pantoprazole|lansoprazole|rabeprazole', "IPP : avant le repas du matin, à réévaluer s'il ne s'agit que d'une protection temporaire"),
    (r'salbutamol|terbutaline|formoterol|salmeterol|tiotropium|umeclidinium|glycopyrronium|budesonide|beclometasone|fluticasone|indacaterol|vilanterol|olodaterol|aclidinium', "inhalateur : démonstration de la technique (et contrôle à chaque délivrance), traitement de fond tous les jours, rinçage de la bouche après un corticoïde inhalé, chambre d'inhalation si besoin"),
    (r'levothyroxine', "lévothyroxine : à jeun, 30 minutes avant le petit-déjeuner, à distance du fer et du calcium, TSH à contrôler"),
    (r'zolpidem|zopiclone|alprazolam|bromazepam|oxazepam|lorazepam|diazepam|clorazepate|prazepam|clonazepam', "benzodiazépine/hypnotique : somnolence, risque de chute chez le sujet âgé, durée limitée, pas d'alcool"),
    (r'sertraline|escitalopram|citalopram|paroxetine|fluoxetine|venlafaxine|duloxetine|mirtazapine|vortioxetine|amitriptyline', "antidépresseur : délai d'action de 2 à 4 semaines, ne pas arrêter brutalement, signaler idées noires ou agitation au début"),
    (r'levetiracetam|valproique|valproate|lamotrigine|carbamazepine|oxcarbazepine|lacosamide|phenytoine|topiramate|zonisamide|brivaracetam', "antiépileptique : régularité des prises, ne jamais arrêter brutalement, conduite automobile selon avis, contraception (valproate : programme de prévention des grossesses)"),
    (r'macrogol|lactulose|sennoside|bisacodyl', "laxatif : hydratation, adaptation de la dose selon les selles"),
    (r'fer|ferreux|ferrique|fumarate ferreux', "fer : à distance des repas si toléré, selles noires normales, à distance des quinolones, cyclines, lévothyroxine"),
    (r'methotrexate', "méthotrexate : une seule prise par semaine (jour fixe), acide folique à un autre jour, NFS et bilan hépatique réguliers"),
    (r'capecitabine|imatinib|temozolomide|abemaciclib|palbociclib|ribociclib|osimertinib|anastrozole|letrozole|tamoxifene|exemestane|enzalutamide|abiraterone|olaparib|lenalidomide|ibrutinib|everolimus|sunitinib|cabozantinib', "anticancéreux oral : horaires et prise par rapport aux repas, manipulation (ne pas écraser), interactions (pamplemousse, millepertuis), effets indésirables à signaler, contraception"),
    (r'colchicine', "colchicine : arrêter et consulter en cas de diarrhée, nombreuses interactions (macrolides…)"),
    (r'allopurinol|febuxostat', "hypo-uricémiant : à poursuivre au long cours, signaler toute éruption cutanée"),
]
CONSEILS = [(re.compile(r'\b(' + p + r')\b'), c) for p, c in CONSEILS]
def conseils(subs):
    out = []
    for rx, c in CONSEILS:
        hit = sorted({s for s in subs if rx.search(s)})
        if hit: out.append(f"- {', '.join(hit)} : {c}.")
    return out

# ---------------------------------------------------------------- pharmacie hospitalière : anticancéreux, péri-opératoire, biomarqueurs
ONCO = [
    (r'cisplatine', "cisplatine : néphrotoxicité (hydratation, magnésium, créatinine), ototoxicité, neuropathie, fortement émétisant (aprépitant + sétron + dexaméthasone)"),
    (r'carboplatine', "carboplatine : dose selon la formule de Calvert (AUC, DFG), myélotoxicité (thrombopénie), réactions d'hypersensibilité après plusieurs cycles"),
    (r'oxaliplatine', "oxaliplatine : neuropathie aggravée par le froid (éviter boissons et contacts froids), réactions d'hypersensibilité, à diluer dans du glucose 5 %"),
    (r'paclitaxel', "paclitaxel : prémédication anti-hypersensibilité (corticoïde + antihistaminiques), tubulure sans PVC avec filtre, neuropathie, alopécie"),
    (r'docetaxel', "docétaxel : prémédication par corticoïde (rétention hydrique, hypersensibilité), neutropénie, atteinte des ongles"),
    (r'fluorouracile|capecitabine', "fluoropyrimidine : recherche du déficit en DPD (uracilémie) obligatoire avant traitement, mucite, diarrhée, syndrome main-pied"),
    (r'irinotecan', "irinotécan : diarrhée précoce (atropine) et tardive (lopéramide à forte dose, consulter si fièvre), neutropénie ; génotypage UGT1A1 à discuter"),
    (r'doxorubicine|epirubicine|daunorubicine', "anthracycline : cardiotoxicité (FEVG avant traitement, dose cumulée maximale), vésicante (voie centrale, risque d'extravasation)"),
    (r'cyclophosphamide|ifosfamide', "oxazaphosphorine : cystite hémorragique (hydratation, mesna pour l'ifosfamide et les fortes doses), émétisant"),
    (r'methotrexate', "méthotrexate à forte dose : sauvetage par acide folinique, alcalinisation des urines, dosages de méthotrexatémie, interactions (IPP, AINS, cotrimoxazole)"),
    (r'gemcitabine', "gemcitabine : myélotoxicité, syndrome pseudo-grippal, toxicité pulmonaire"),
    (r'etoposide', "étoposide : myélotoxicité, hypotension si perfusion rapide"),
    (r'vincristine|vinorelbine|vinblastine', "vinca-alcaloïde : voie intraveineuse stricte (mortel en intrathécal), neuropathie, constipation, vésicant"),
    (r'pemetrexed', "pémétrexed : supplémentation en acide folique et vitamine B12, dexaméthasone la veille, le jour et le lendemain"),
    (r'pembrolizumab|nivolumab|atezolizumab|durvalumab|ipilimumab|cemiplimab|dostarlimab', "immunothérapie (anti-PD-1/PD-L1/CTLA-4) : effets immunologiques (colite, hépatite, pneumopathie, endocrinopathies : TSH, cortisol, glycémie) à signaler sans délai"),
    (r'trastuzumab|pertuzumab', "anti-HER2 : surveillance de la FEVG (échographie cardiaque régulière), réactions à la perfusion"),
    (r'bevacizumab', "bévacizumab : hypertension, protéinurie, troubles de la cicatrisation (arrêt avant chirurgie), saignements"),
    (r'cetuximab|panitumumab', "anti-EGFR : toxicité cutanée (rash acnéiforme), hypomagnésémie ; seulement si RAS sauvage"),
    (r'rituximab|obinutuzumab', "anti-CD20 : réactions à la perfusion (prémédication), dépistage et prévention de la réactivation de l'hépatite B"),
    (r'azacitidine|cytarabine|daratumumab|lenalidomide|bortezomib|venetoclax|ibrutinib|blinatumomab', "hémopathie : surveillance de la NFS, prévention infectieuse (prophylaxies), syndrome de lyse tumorale à prévenir à l'initiation (hydratation, rasburicase/allopurinol)"),
    (r'tamoxifene|letrozole|anastrozole|exemestane', "hormonothérapie du cancer du sein : observance sur 5 ans ou plus ; tamoxifène : risque thromboembolique, interactions CYP2D6 ; anti-aromatases : ostéodensitométrie, arthralgies"),
    (r'triptoreline|leuproreline|degarelix|enzalutamide|abiraterone|apalutamide|darolutamide', "hormonothérapie du cancer de la prostate : bouffées de chaleur, ostéoporose, risque cardio-métabolique ; abiratérone avec prednisone"),
    (r'\w+nib', "inhibiteur de kinase oral : observance, prise par rapport aux repas, interactions (inhibiteurs et inducteurs du CYP3A4, pamplemousse, millepertuis, IPP pour certains), toxicités cutanées et digestives, hypertension"),
    (r'bleomycine', "bléomycine : toxicité pulmonaire (dose cumulée, EFR), fièvre à la perfusion"),
    (r'dacarbazine|temozolomide', "alkylant : myélotoxicité, émétisant ; témozolomide : prophylaxie de la pneumocystose si associé à la radiothérapie"),
    (r'filgrastim|pegfilgrastim|lipegfilgrastim', "facteur de croissance (G-CSF) : prévention de la neutropénie fébrile, douleurs osseuses"),
    (r'ondansetron|granisetron|palonosetron|aprepitant|fosaprepitant', "antiémétique : à adapter au potentiel émétisant du protocole (aigu et retardé)"),
]
ONCO = [(re.compile(r'\b(' + p + r')\b'), c) for p, c in ONCO]
PERIOP = [
    (r'cefazoline|cefuroxime|cefamandole|amoxicilline clavulanique|amoxicilline|clindamycine|vancomycine|gentamicine|metronidazole', 'antibioprophylaxie', "antibioprophylaxie : dose unique (céfazoline 2 g, 4 g si IMC > 35) dans l'heure avant l'incision, réinjection selon la durée, pas de prolongation au-delà de 24 à 48 h (recommandations SFAR)"),
    (r'enoxaparine|tinzaparine|dalteparine|fondaparinux|heparine|calciparine', 'thromboprophylaxie', "prévention thromboembolique : HBPM à dose prophylactique, durée selon la chirurgie (jusqu'à 4 à 5 semaines en orthopédie majeure ou chirurgie carcinologique abdomino-pelvienne), plaquettes si héparine"),
    (r'paracetamol|nefopam|ketoprofene|tramadol|morphine|oxycodone|ibuprofene|ketamine|lidocaine', 'antalgie', "antalgie post-opératoire multimodale : paracétamol systématique, AINS si pas de contre-indication (rénale, digestive), morphiniques en relais avec prévention de la constipation et des nausées"),
    (r'apixaban|rivaroxaban|dabigatran|warfarine|fluindione|acenocoumarol|clopidogrel|ticagrelor|prasugrel', 'antithrombotiques au long cours', "gestion péri-opératoire des antithrombotiques : fenêtre d'arrêt selon la molécule et la fonction rénale, relais éventuel, reprise selon le risque hémorragique"),
]
PERIOP = [(re.compile(r'\b(' + p + r')\b'), k, c) for p, k, c in PERIOP]
BIOMARQ = [
    (r'HER2[^.\n]{0,25}(3\+|positi|amplifi)', "HER2 positif : traitement anti-HER2 (trastuzumab ± pertuzumab, trastuzumab emtansine/déruxtécan) avec surveillance cardiaque"),
    (r"(RE|r[ée]cepteurs? (aux )?(o|œ)strog[èe]nes?)[^.\n]{0,25}(positi|\d{2,3}\s*%)", "récepteurs hormonaux positifs : hormonothérapie (tamoxifène ou anti-aromatase selon le statut ménopausique)"),
    (r'EGFR[^.\n]{0,40}(mut|exon)', "mutation EGFR : inhibiteur de tyrosine kinase (osimertinib)"),
    (r'\bALK\b[^.\n]{0,30}(r[ée]arrang|positi|translocation)', "réarrangement ALK : inhibiteur d'ALK (alectinib, lorlatinib)"),
    (r'PD-?L1[^.\n]{0,30}\d', "PD-L1 exprimé : immunothérapie anti-PD-1/PD-L1 selon le taux d'expression et la localisation"),
    (r'\b(MSI|dMMR|instabilit[ée] microsatellitaire)\b', "instabilité microsatellitaire / dMMR : immunothérapie efficace ; rechercher un syndrome de Lynch"),
    (r'KRAS[^.\n]{0,30}(mut|G12)', "mutation KRAS : pas d'anti-EGFR dans le cancer colorectal (inhibiteur KRAS G12C possible)"),
    (r'BRAF[^.\n]{0,20}V600', "mutation BRAF V600 : association d'inhibiteurs BRAF et MEK selon la tumeur"),
    (r'BRCA', "mutation BRCA : inhibiteur de PARP (olaparib) ; consultation d'oncogénétique"),
    (r'Ki-?67', "Ki67 : indice de prolifération, oriente l'indication de chimiothérapie (cancer du sein)"),
]
BIOMARQ = [(re.compile(p, re.I), c) for p, c in BIOMARQ]
PROTOCOLES = {r'folfirinox': ['fluorouracile', 'irinotecan', 'oxaliplatine', 'acide folinique'], r'folfox': ['fluorouracile', 'oxaliplatine', 'acide folinique'], r'folfiri': ['fluorouracile', 'irinotecan', 'acide folinique'],
              r'xelox|capox': ['capecitabine', 'oxaliplatine'], r'r-?chop': ['rituximab', 'cyclophosphamide', 'doxorubicine', 'vincristine', 'prednisone'], r'\bchop\b': ['cyclophosphamide', 'doxorubicine', 'vincristine', 'prednisone'],
              r'abvd': ['doxorubicine', 'bleomycine', 'vinblastine', 'dacarbazine'], r'\bec\s*\d{2,3}\b|\bfec\b': ['epirubicine', 'cyclophosphamide'], r'carbo[- ]?taxol': ['carboplatine', 'paclitaxel'],
              r'\bbep\b': ['bleomycine', 'etoposide', 'cisplatine'], r'r-?benda|\bbr\b': ['rituximab', 'bendamustine'], r'\bvrd\b': ['bortezomib', 'lenalidomide', 'dexamethasone'], r'\bdara\b': ['daratumumab']}
PROTOCOLES = [(re.compile(p, re.I), v) for p, v in PROTOCOLES.items()]
PAS_MEDOC = {'sodium', 'potassium', 'calcium', 'magnesium', 'phosphore', 'fer', 'glucose', 'albumine', 'chlorure', 'bicarbonate', 'zinc', 'oxygene', 'eau', 'cuivre', 'iode', 'azote', 'uree', 'lactose', 'sodium chlorure', 'potassium chlorure', 'chlorure sodium', 'chlorure potassium', 'sodium bicarbonate', 'bicarbonate sodium'}
def cites(textes):
    """médicaments cités dans les textes : {substance: (libellé, phrase)} ; protocoles de chimiothérapie dépliés"""
    out = {}
    for tx in textes:
        for ph in re.split(r'(?<=[.!?\n])\s+', tx):
            if len(ph) > 400: continue
            bio = re.search(r'\d\s*(mmol|µmol|umol|mg/l|g/l|meq)', ph, re.I)
            for lib, subs in reperer(ph):
                for s in subs:
                    if s in PAS_MEDOC and (bio or True): continue
                    if s not in out: out[s] = (lib, resume(ph.strip(), 220))
            for rx, subs in PROTOCOLES:
                m = rx.search(ph)
                if m:
                    for s in subs:
                        if s not in out: out[s] = (f"{s} (protocole {m.group(0).upper()})", resume(ph.strip(), 220))
    return out

# ---------------------------------------------------------------- sections du compte rendu
TITRES = [('motif', r"motif d['’]hospitalisation|motif de l['’]hospitalisation|motif de consultation|motif"),
          ('atcd', r"ant[ée]c[ée]dents?( m[ée]dicaux| personnels)?"), ('allergies', r"allergies?( connues)?"), ('vie', r"mode de vie|habitus"),
          ('entree', r"traitements? (à|a) l['’]entr[ée]e|traitements? habituels?|traitements? (en cours|personnels?|ant[ée]rieurs?)"),
          ('histoire', r"histoire de la maladie"), ('clinique', r"examen clinique.*"), ('examens', r"examens? compl[ée]mentaires?|biologie|bilan biologique|imagerie"),
          ('evolution', r"[ée]volution( dans le service| pendant le s[ée]jour)?|prise en charge"), ('conclusion', r"conclusion|au total|synth[èe]se"),
          ('sortie', r"traitements? (de|à la|a la) sortie|ordonnance de sortie|prescriptions?( m[ée]dicamenteuses?)? de sortie|prescription\(s\) de sortie"),
          ('suivi', r"suivi|en pratique|rendez[- ]vous|consignes"), ('fin', r"bien (confraternellement|cordialement)|en vous remerciant.*|restant (à|a) votre.*|signataire.*")]
TITRES = [(k, re.compile(r'^\s*(?P<t>' + p + r')\s*(:|-)?\s*(?P<r>.*)$', re.I)) for k, p in TITRES]
def sections(txt):
    S = collections.OrderedDict(); cur = 'debut'; S[cur] = []
    for l in txt.split('\n'):
        s = l.strip()
        hit = None
        if s and len(s) < 70:
            for k, rx in TITRES:
                m = rx.match(s)
                if m and (len(m.group('t')) >= len(s) - len(m.group('r')) - 3):
                    hit = (k, m.group('r')); break
        if hit:
            cur = hit[0]
            while cur in S: cur += '+'
            S[cur] = [hit[1]] if hit[1] else []
        else: S[cur].append(l)
    out = collections.OrderedDict()
    for k, v in S.items():
        t = '\n'.join(v).strip()
        if t: out[k.rstrip('+')] = (out.get(k.rstrip('+'), '') + '\n' + t).strip()
    return out

def lignes_trt(bloc):
    """lignes de traitement : [(texte, médicaments)]"""
    res = []
    for l in re.split(r'\n|;(?=\s*[A-ZÉ])', bloc or ''):
        s = re.sub(r'^[\s·•\-–\*\d\.\)]+', '', l).strip()
        if not s or len(s) > 220: continue
        m = reperer(s)
        if m: res.append((s, m))
    return res

DOSE = re.compile(r"^\s*((?:\d+[\d,\.]*\s*(?:mg|g|µg|ug|mcg|ui|u|ml|%|mmol|meq|microgrammes?|milligrammes?|gouttes?)(?:\s*/\s*\d*[\d,\.]*\s*(?:mg|g|µg|ml|h|24\s*h|dose|kg|jour))?)|(?:\d+/\d+(?:\s*µg)?))\b", re.I)
def poso(ligne, lib):
    """« Eliquis 5 mg : 1 cp matin et soir » -> (« Eliquis 5 mg », « 1 cp matin et soir »)"""
    s = re.sub(r'\s+', ' ', ligne).strip(' .;')
    i = N(s).find(N(lib).split(' ')[0])
    if i < 0: i = 0
    debut = s[:i].strip(' :-'); mot = s[i:].split(' ')[0]; reste = s[i + len(mot):]
    nom = (debut + ' ' + mot).strip() if debut and len(debut) < 25 and not re.search(r'\d', debut) else mot
    m = DOSE.match(reste)
    dose = m.group(1).strip() if m else ''
    if m: reste = reste[m.end():]
    if ':' in reste: reste = reste.split(':', 1)[1] if len(reste.split(':', 1)[0]) < 25 else reste
    pos = re.sub(r'^[\s,:\-–]+', '', reste).strip()
    nom = nom.strip(' :,;-') or lib
    return (nom + (' ' + dose if dose else '')).strip(), pos or 'selon prescription'

# ---------------------------------------------------------------- correspondances
THEME = {'PNEUMOLOGIE': 'pneumo_orl', 'CANCERO ADULTE': 'cancerologie', 'ANATOMOPATHOLOGIE': 'cancerologie', 'CHIRURGIE VISCERALE': 'hepato_gastro',
         'MALADIES INFECTIEUSES': 'infectiologie', 'NEUROLOGIE': 'neuro_psychiatrie', 'CHIR ORTHO ET TRAUMATO': 'douleur_antalgie', 'MEDECINE INTERNE': 'immuno_rhumato_derma',
         'GYNECOLOGIE': 'pediatrie_gyneco', 'OBSTETRIQUE': 'pediatrie_gyneco', 'UROLOGIE': 'nephro_urologie', 'HEPATO-GASTRO-ENTERO': 'hepato_gastro', 'MEDECINE GERIATRIQUE': 'autres',
         'HEMATOLOGIE CLINIQUE': 'hematologie_hemostase', 'NEPHROLOGIE': 'nephro_urologie', 'CARDIOLOGIE': 'cardiovasculaire', 'MEDECINE INTER-SPECIALITES': 'autres',
         'MEDECINE PEDIATRIQUE': 'pediatrie_gyneco', 'REANIMATION': 'toxico_urgences', 'CHIR.CARDIO-VASC.': 'cardiovasculaire'}
SERVICE = {'CANCERO ADULTE': 'oncologie', 'CHIR ORTHO ET TRAUMATO': 'chirurgie orthopédique', 'HEPATO-GASTRO-ENTERO': 'hépato-gastro-entérologie', 'CHIR.CARDIO-VASC.': 'chirurgie cardiovasculaire',
           'MEDECINE INTER-SPECIALITES': 'médecine polyvalente', 'MEDECINE GERIATRIQUE': 'gériatrie', 'MEDECINE PEDIATRIQUE': 'pédiatrie', 'HEMATOLOGIE CLINIQUE': 'hématologie',
           'CHIRURGIE VISCERALE': 'chirurgie viscérale', 'MALADIES INFECTIEUSES': 'maladies infectieuses', 'MEDECINE INTERNE': 'médecine interne', 'ANATOMOPATHOLOGIE': 'anatomopathologie',
           'NEPHROLOGIE': 'néphrologie', 'GYNECOLOGIE': 'gynécologie', 'OBSTETRIQUE': 'obstétrique', 'REANIMATION': 'réanimation', 'PNEUMOLOGIE': 'pneumologie', 'NEUROLOGIE': 'neurologie',
           'UROLOGIE': 'urologie', 'CARDIOLOGIE': 'cardiologie'}
def service(sp): return SERVICE.get(sp, sp.lower())
EMO = lambda age, sp: 'anxieux' if sp in ('CANCERO ADULTE', 'HEMATOLOGIE CLINIQUE', 'REANIMATION') else ('fatigue' if age >= 80 else 'neutre')
BIO = re.compile(r"((DFG|clairance|cr[ée]atinin[ée]mie|cr[ée]atinine|kali[ée]mie|natr[ée]mie|INR|HbA1c|h[ée]moglobine|plaquettes|CRP|TSH|albumine|NT-?proBNP|troponine)[^\n.;]{0,40}?\d[\d,\.]*\s*[a-zA-Zµ/%²·0-9]*)", re.I)

def resume(t, n=420):
    t = re.sub(r'\s+', ' ', t or '').strip()
    return t if len(t) <= n else t[:n].rsplit(' ', 1)[0] + '…'

# ---------------------------------------------------------------- construction
P = json.load(open(PJ))['data']
FICH = {f: os.path.join(r, f) for r, _, fs in os.walk(DOS) for f in fs}
def lire(doc):
    p = FICH.get(os.path.basename(doc['path']))
    return open(p, encoding='utf-8', errors='ignore').read().replace('\ufeff', '') if p else ''

def civil(sexe): return ('Mme', 'Elle', 'elle', 'e') if sexe == 'F' else ('M.', 'Il', 'il', '')

cas, stats = [], collections.Counter()
num = {'officine': 0, 'hospitalier': 0, 'medecine': 0}
PREF = {'officine': 'PO', 'hospitalier': 'PH', 'medecine': 'PM'}
for p in P:
    sc = p['suggested_scenario']; sp = p['specialty']
    docs = [(d, lire(d)) for d in p['documents']]
    docs = [(d, t) for d, t in docs if t.strip()]
    if not docs: stats['sans texte'] += 1; continue
    principal = next(((d, t) for d, t in docs if d['type'] in ('CRH', 'CRC', 'URGENCES', 'MATERNITE')), docs[0])
    S = sections(principal[1])
    sortie = lignes_trt(S.get('sortie', '')); entree = lignes_trt(S.get('entree', ''))
    age = (sc.get('age') or {}).get('value') or 0; unite = (sc.get('age') or {}).get('unit') or 'ans'
    if unite != 'ans': age_ans = 0
    else: age_ans = age
    sexe = sc.get('sex') or 'F'; Ci, Il, il, e = civil(sexe)
    nom = (sc.get('name') or 'X').split(' ')[-1]
    diag = '; '.join(d['description'] for d in (sc.get('primary_diagnosis') or [])) or 'non précisé'
    deces = 'décès' in (sc.get('discharge_mode') or '').lower()
    types = {d['type'] for d, _ in docs}
    # ---- choix du parcours
    if not deces and principal[0]['type'] in ('CRH', 'CRC') and len(sortie) >= 2 and sp not in ('REANIMATION', 'ANATOMOPATHOLOGIE'): pop = 'officine'
    elif sp in ('CANCERO ADULTE', 'HEMATOLOGIE CLINIQUE', 'REANIMATION', 'ANATOMOPATHOLOGIE', 'CHIR.CARDIO-VASC.', 'CHIRURGIE VISCERALE', 'CHIR ORTHO ET TRAUMATO') or types & {'CRO', 'ANAPATH'}: pop = 'hospitalier'
    else: pop = 'medecine'
    stats[pop] += 1
    if pop != LOT: continue
    num[pop] += 1; cid = f"{PREF[pop]}{num[pop]:04d}"
    meds_sortie = [(poso(l, m[0][0])[0], frozenset().union(*[x[1] for x in m]), poso(l, m[0][0])[1]) for l, m in sortie]
    meds_entree = [(poso(l, m[0][0])[0], frozenset().union(*[x[1] for x in m])) for l, m in entree]
    s_sortie = set().union(*[m[1] for m in meds_sortie]) if meds_sortie else set()
    s_entree = set().union(*[m[1] for m in meds_entree]) if meds_entree else set()
    inchange = bool(re.search(r"inchang|poursui|idem|habituel|reprise du traitement|sans changement|sans modification", N(S.get('sortie', ''))))
    nouv = sorted(s_sortie - s_entree); arr = [] if inchange else sorted(s_entree - s_sortie); garde = sorted(s_sortie & s_entree)
    inter = interactions([(m[0], m[1]) for m in meds_sortie])
    bio = sorted({re.sub(r'\s+', ' ', b[0]).strip() for b in BIO.findall(principal[1])})[:12]
    allerg = resume(S.get('allergies', ''), 160) or None
    if allerg and re.match(r'^(aucune?|pas d|nc|non)', N(allerg)): allerg = 'aucune connue'
    motif = resume(S.get('motif') or diag, 300)
    atcd = re.sub(r'(?im)^\s*(m[ée]dicaux|chirurgicaux(?: et traumatiques)?|familiaux|gyn[ée]co[- ]obst[ée]tricaux|personnels)\s*:?\s*$', lambda m: m.group(1).capitalize() + ' :', S.get('atcd', ''))
    atcd = resume(re.sub(r'^(?:[\s,:;]|m[ée]dicaux|chirurgicaux|familiaux|allergies|et\b)+', '', atcd, flags=re.I), 500)
    concl = resume(S.get('conclusion', '') or S.get('evolution', '') or [x for x in principal[1].strip().split('\n\n') if len(x) > 80][-1:] and [x for x in principal[1].strip().split('\n\n') if len(x) > 80][-1], 900)
    cr_txt = principal[1].strip()
    if len(cr_txt) > 30000:                    # une cellule Excel contient au plus 32 767 caractères : tableaux ASCII resserrés, puis coupe
        cr_txt = re.sub(r'[ \t]{2,}', ' ', cr_txt); cr_txt = re.sub(r'(?m)^[|+\- =_]{3,}$\n?', '', cr_txt)
        if len(cr_txt) > 30000: cr_txt = cr_txt[:cr_txt.rfind('\n', 0, 29500)] + '\n[… compte rendu abrégé pour l\'outil]'
    autres_docs = [(d, t) for d, t in docs if d is not principal[0]]
    titre_cr = principal[0].get('header') or "Compte rendu"
    apercu_base = f"{Ci} {nom}, {age} {unite}"
    documents = [{'type': 'compte_rendu', 'titre': resume(titre_cr, 90), 'texte': '@enonce', 'origine': f"PARHAF {p['id']} (CC BY 4.0)"}]   # texte repris de l'énoncé (pas de doublon dans le classeur)
    for d, t in autres_docs[:2]:
        documents.append({'type': 'compte_rendu', 'titre': resume(d.get('header') or d['type'], 90), 'texte': t.strip()[:30000], 'origine': f"PARHAF {p['id']} (CC BY 4.0)"})
    questions = []
    def Q(typ, q, r): questions.append({'n': str(len(questions) + 1), 'type': typ, 'question': q, 'reponse_modele': r})
    l_inter = [f"- {d['la']} + {d['lb']} ({', '.join(d['niveau'])}) : {d['mecanisme']}" + (f" Conduite : {d['conduite']}" if d['conduite'] else '') for d in inter] or ["- Aucune interaction répertoriée dans le thésaurus ANSM entre les médicaments de sortie (vérifier les médicaments pris en automédication)."]
    l_cons = conseils(s_sortie)
    terrain = []
    if age_ans >= 75: terrain.append(f"- Sujet âgé ({age} ans) : risque de chute, iatrogénie, fonction rénale à vérifier.")
    if bio: terrain.append('- Biologie citée dans le compte rendu : ' + ' ; '.join(bio) + '.')
    if allerg and allerg != 'aucune connue': terrain.append(f'- Allergies : {allerg}.')
    if atcd: terrain.append(f'- Antécédents : {atcd}')
    ordonnance = None
    if meds_sortie:
        sg = re.search(r"(?:\bSignataire\s*:?\s*|\b)(?:Dr|Docteur|Pr|Professeur)\.?\s+([A-ZÉ][\w'\-]+(?:\s+[A-ZÉ][\w'\-]+|\s+[a-zé]{2,3}\s+[A-ZÉa-zé][\w'\-]+)?)", principal[1][-700:])
        ordonnance = {'type': 'ordonnance', 'titre': 'Ordonnance de sortie', 'medecin': f"{sg.group(1).strip() if sg else '…'}, service de {service(sp)}", 'patient': f"{Ci} {sc.get('name', '')}, {age} {unite}", 'date': '',
                      'lignes': [{'medicament': m[0], 'posologie': m[2], 'duree': ''} for m in meds_sortie], 'origine': f"traitement de sortie du compte rendu PARHAF {p['id']}"}

    if pop == 'officine':
        documents.insert(0, ordonnance)
        enonce = (f"SORTIE D'HOSPITALISATION. {Ci} {sc.get('name', '')}, {age} {unite}, sort du service de {service(sp)} où {il} a été hospitalisé{e} "
                  f"(motif : {motif}). {Il} vient à la pharmacie avec son ordonnance de sortie et la lettre de sortie de l'hôpital. "
                  f"Le compte rendu d'hospitalisation complet est fourni en document : le patient en connaît le contenu avec ses mots "
                  f"(il sait pourquoi il a été hospitalisé et ce qu'on lui a dit, pas le vocabulaire médical).\n\nCOMPTE RENDU :\n{cr_txt}\n— fin du compte rendu —")
        apercu = f"{apercu_base} : sortie de {service(sp)} avec {len(meds_sortie)} médicaments" + (f" ({len(inter)} interaction{'s' if len(inter) > 1 else ''})" if inter else '')
        plainte = random.choice(["Bonjour, je sors de l'hôpital, voici mon ordonnance.", "Bonjour… je viens de sortir de l'hôpital, ils m'ont donné tout ça.", "Bonjour, on m'a dit de passer à la pharmacie avec l'ordonnance de sortie."])
        if entree or 'entree' in S:
            diff = []
            if nouv: diff.append('- Nouveaux : ' + ', '.join(nouv) + '.')
            if arr: diff.append("- Présents à l'entrée mais absents de l'ordonnance de sortie : " + ', '.join(arr) + " — arrêt volontaire ou oubli de mention ? À vérifier avec le patient (et le prescripteur si besoin) : c'est le cœur de la conciliation de sortie.")
            if garde: diff.append('- Poursuivis : ' + ', '.join(garde) + ' (vérifier un éventuel changement de dose).')
            if inchange:
                mq = re.search(r"[^\n]*(inchang|poursui|idem|habituel|reprise du traitement|sans changement|sans modification)[^\n]*", S['sortie'], re.I)
                diff.append("- Le compte rendu indique que le reste du traitement habituel est poursuivi" + (" (« " + resume(mq.group(0), 160) + " »)" if mq else '') + " : le vérifier avec le patient.")
            r1 = '\n'.join(diff) or "Le traitement d'entrée est vide ou non détaillé : tous les médicaments de sortie sont nouveaux."
        else: r1 = "Le compte rendu ne précise pas le traitement d'entrée : le recueillir auprès du patient (dossier pharmaceutique, ordonnances antérieures) avant de comparer."
        Q('analyse', "Comparez le traitement de sortie au traitement d'avant l'hospitalisation : qu'est-ce qui est nouveau, arrêté ou poursuivi ?", r1)
        Q('interactions', "Relevez les interactions médicamenteuses de l'ordonnance de sortie et la conduite à tenir.", '\n'.join(l_inter) + "\n(Source : thésaurus des interactions médicamenteuses de l'ANSM, version structurée 2019 ; vérifier la version en vigueur.)")
        Q('terrain', "Quels éléments du terrain et de l'hospitalisation imposent une vigilance pour la délivrance ?", '\n'.join(terrain) or "- Pas d'élément particulier relevé dans le compte rendu ; s'assurer de la fonction rénale et des allergies auprès du patient.")
        Q('conseil', "Quels conseils donnez-vous au patient sur ses nouveaux traitements ?", '\n'.join(l_cons) or "- Expliquer le rôle et les horaires de chaque médicament, proposer un plan de prise.")
        Q('suivi', "Quel suivi est prévu et quels signes doivent le faire reconsulter ?", resume(S.get('suivi', ''), 700) or ("Conclusion du compte rendu : " + concl if concl else "Suivi non détaillé : orienter vers le médecin traitant dans la semaine suivant la sortie."))
    elif pop == 'hospitalier':
        if ordonnance: documents.insert(0, ordonnance)
        enonce = (f"PHARMACIE HOSPITALIÈRE. {Ci} {sc.get('name', '')}, {age} {unite}, est pris{'e' if sexe == 'F' else ''} en charge en {service(sp)} (motif : {motif}). "
                  f"Vous êtes pharmacien à l'hôpital : vous échangez avec {'la patiente' if sexe == 'F' else 'le patient'} (conciliation, éducation thérapeutique) et vous analysez son dossier. "
                  f"Le patient connaît son histoire avec ses mots, pas le vocabulaire médical.\n\nCOMPTE RENDU :\n{cr_txt}\n— fin du compte rendu —"
                  + ''.join(f"\n\n{d.get('header') or d['type']} :\n{t.strip()}" for d, t in autres_docs))
        apercu = f"{apercu_base} : {resume(diag, 90)} ({service(sp)})"
        textes = [t for _, t in docs]
        CIT = cites(textes)
        tous = sorted(set(CIT) | s_entree | s_sortie)
        plainte = random.choice(["Bonjour… on m'a dit qu'un pharmacien allait passer.", "Bonjour, vous venez pour mes médicaments ?", "Bonjour. J'ai beaucoup de questions sur mon traitement.", "Bonjour… c'est vous qui vous occupez des médicaments ?"])
        Q('analyse', "Résumez la situation clinique et le diagnostic retenu.", f"Diagnostic principal : {diag}.\n" + (f"Conclusion du dossier : {concl}" if concl else ''))
        lm = []
        if meds_entree: lm.append("Traitement habituel (entrée) : " + ', '.join(m[0] for m in meds_entree) + '.')
        hosp = [s for s in sorted(CIT) if s not in s_entree]
        if hosp: lm += [f"- {s} — « {CIT[s][1]} »" for s in hosp[:14]]
        if meds_sortie: lm.append("Traitement de sortie : " + ', '.join(m[0] for m in meds_sortie) + '.')
        if lm: Q('analyse', "Recensez les médicaments du dossier (traitement habituel, traitements instaurés ou administrés à l'hôpital, traitement de sortie).", '\n'.join(lm))
        it2 = interactions([(CIT[s][0] if s in CIT else s, frozenset([s])) for s in tous]) if len(tous) > 1 else []
        l2 = [f"- {d['la']} + {d['lb']} ({', '.join(d['niveau'])}) : {d['mecanisme']}" + (f" Conduite : {d['conduite']}" if d['conduite'] else '') for d in it2[:10]]
        Q('interactions', "Validation pharmaceutique : quelles interactions et quels points de vigilance liés au terrain relevez-vous ?",
          '\n'.join((l2 or ["- Aucune interaction répertoriée dans le thésaurus ANSM entre les médicaments cités."]) + terrain) + "\n(Thésaurus ANSM, version structurée 2019.)")
        onco = [f"- {c}." for rx, c in ONCO if any(rx.search(s) for s in tous)]
        bm = [f"- {c}." for rx, c in BIOMARQ if any(rx.search(x) for x in textes)]
        per = {}
        for rx, k, c in PERIOP:
            hit = sorted({s for s in tous if rx.search(s)})
            if hit: per[k] = (hit, c)
        chir = bool(types & {'CRO'}) or 'CHIR' in sp
        if onco: Q('vigilance', "Quels sont les points de vigilance pharmaceutiques des traitements anticancéreux et de support de ce dossier (préparation, administration, toxicités, surveillance) ?", '\n'.join(onco))
        if bm: Q('analyse', "Quelles conséquences thérapeutiques ont les résultats anatomopathologiques ou moléculaires du dossier ?", '\n'.join(bm) + (f"\nConclusion : {concl}" if concl else ''))
        elif 'ANAPATH' in types and not onco:
            Q('analyse', "Quelles suites thérapeutiques le résultat anatomopathologique implique-t-il pour le pharmacien (traitements à préparer, bilans préalables) ?", (f"Conclusion du compte rendu : {concl}\n" if concl else '') + "Décision en réunion de concertation pluridisciplinaire (RCP) ; le pharmacien anticipe les bilans préalables (DPD avant fluoropyrimidine, FEVG avant anthracycline ou anti-HER2, sérologies VHB avant anti-CD20) et la préparation centralisée des anticancéreux.")
        if chir:
            Q('analyse', "Quelle prise en charge médicamenteuse péri-opératoire relevez-vous (antibioprophylaxie, prévention thromboembolique, antalgie, antithrombotiques au long cours) ?",
              '\n'.join([f"- {k} ({', '.join(h)}) : {c}." for k, (h, c) in per.items()] + [f"- {k} : non mentionnée dans le dossier — {c}." for rx, k, c in PERIOP if k not in per and k != 'antithrombotiques au long cours']))
        if meds_sortie or onco: Q('conseil', "Quelles informations donnez-vous au patient (éducation thérapeutique, signes d'alerte) ?", '\n'.join(l_cons + [o for o in onco if 'immunothérapie' in o or 'fluoropyrimidine' in o]) or "Expliquer chaque traitement, ses horaires, sa surveillance et les signes qui doivent faire appeler l'équipe (fièvre sous chimiothérapie : appel immédiat).")
        Q('suivi', "Quel suivi est prévu ?", resume(S.get('suivi', ''), 700) or (f"Conclusion : {concl}" if concl else 'Suivi non détaillé dans le dossier.'))
    else:   # medecine
        if ordonnance: documents.insert(0, ordonnance)
        enonce = (f"SITUATION CLINIQUE (compte rendu PARHAF). {Ci} {sc.get('name', '')}, {age} {unite}. Le patient consulte ; il raconte ses symptômes avec ses mots et "
                  f"ne connaît pas le diagnostic final.\n\nCOMPTE RENDU :\n{cr_txt}\n— fin du compte rendu —")
        apercu = f"[diagnostic masqué] {Ci} {nom}, {age} {unite} ({service(sp)})"
        hist = S.get('histoire') or S.get('motif') or ''
        PLA = [(r'douleur[s]? thoraci|douleur[s]? (de la |à la )?poitrine|oppression thoraci', "j'ai mal dans la poitrine"),
               (r'dyspn|essouffl', "je suis essoufflé{e}"), (r'\btoux|tousse', "je tousse"), (r'fièvre|fébri|hyperthermie', "j'ai de la fièvre"),
               (r'douleur[s]? abdomin|mal au ventre|épigastralg', "j'ai mal au ventre"), (r'vomiss', "je vomis"), (r'nausée', "j'ai des nausées"),
               (r'diarrh', "j'ai la diarrhée"), (r'constipation', "je suis constipé{e}"), (r'céphal', "j'ai mal à la tête"), (r'vertige', "j'ai des vertiges"),
               (r'malaise|syncope|perte de connaissance', "j'ai fait un malaise"), (r'asthénie|fatigue', "je suis très fatigué{e}"),
               (r'perte de poids|amaigr', "j'ai perdu du poids"), (r'palpit', "j'ai le cœur qui s'emballe"), (r'œd[eè]me|oed[eè]me|gonfl', "j'ai les jambes qui gonflent"),
               (r'prurit|démangeaison', "ça me gratte"), (r'éruption|rash|lésions cutanées', "j'ai des plaques sur la peau"), (r'ictère|jaunisse', "j'ai la peau qui jaunit"),
               (r'hématurie', "j'ai du sang dans les urines"), (r'rétention|dysurie|brûlures? mictionn', "j'ai du mal à uriner"), (r'hémoptysie', "je crache du sang"),
               (r'rectorragie|méléna|hématémèse', "j'ai saigné en allant aux toilettes"), (r'confusion|désorient', "ma famille me trouve confus{e}"),
               (r'chute', "je suis tombé{e}"), (r'déficit|faiblesse|hémipar|engourd|paresthési', "j'ai une faiblesse ou des fourmillements"),
               (r'douleur[s]? (lombaire|du dos|dorsale)|lombalg', "j'ai mal au dos"), (r'douleur[s]? (articulaire|(des |de l.|du )(deux )?(épaule|hanche|genou|poignet|cheville|main))|arthralg|polyarthr', "j'ai mal aux articulations"),
               (r'métrorragie|saignement vaginal|pertes de sang', "je saigne"), (r'contractions', "j'ai des contractions"), (r'convuls|crise', "j'ai fait une crise")]
        h0 = re.sub(r'\s+', ' ', hist)[:900]
        NEG = re.compile(r"(pas d[e']|absence d[e']|sans|\bni\b|aucun[e]?|ni de|négati|éliminé|apyr)[^.;]{0,90}$", re.I)
        trouves = sorted(((m.start(), t) for rx, t in PLA for m in [next((m for m in re.finditer(rx, h0, re.I) if not NEG.search(h0[max(0, m.start() - 100):m.start()])), None)] if m), key=lambda x: x[0])
        vus = []; [vus.append(t) for _, t in trouves if t not in vus]
        dep = re.search(r'depuis (\d+ (?:jours?|semaines?|mois|heures?|ans?)|plusieurs (?:jours|semaines|mois)|quelques (?:jours|semaines|mois)|la veille|le matin|hier)', h0, re.I)
        ef = 'e' if sexe == 'F' else ''
        if vus:
            sy = [t.format(e=ef) for t in vus[:2]]
            plainte = "Bonjour docteur, " + (' et '.join(sy)) + (f" depuis {dep.group(1)}" if dep else '') + '.'
        else:
            plainte = "Bonjour docteur, je ne me sens pas bien depuis quelques jours."
        hist = ''   # (la plainte est écrite à la 1re personne ; le reste se découvre en interrogeant le patient)
        plainte = "Bonjour docteur… " + plainte[0].lower() + plainte[1:] if hist else plainte
        Q('raisonnement', "Quel est le diagnostic le plus probable et sur quels éléments repose-t-il ?", f"Diagnostic : {diag}.\n" + (f"Éléments du dossier : {resume(S.get('histoire', ''), 500)}" if S.get('histoire') else ''))
        Q('raisonnement', "Quels examens complémentaires demandez-vous et qu'ont-ils montré ?", resume(S.get('examens', ''), 900) or 'Non détaillés dans le compte rendu.')
        Q('raisonnement', "Quelle prise en charge proposez-vous ?", resume(S.get('evolution', '') or S.get('conclusion', ''), 900) or diag)
        if meds_sortie: Q('raisonnement', "Quels traitements sont prescrits et quels points de vigilance s'y rattachent ?", '\n'.join([f"- {m[0]} : {m[2]}" for m in meds_sortie] + l_inter[:6]))
    if len(enonce) > 32000:                    # documents annexes (anapath, biologie moléculaire) : resserrés puis coupés après le compte rendu
        a, m, b = enonce.partition('— fin du compte rendu —')
        b = re.sub(r'(?m)^[|+\- =_]{3,}$\n?', '', re.sub(r'[ \t]{2,}', ' ', b))
        enonce = a + m + (b if len(a + m + b) <= 32000 else b[:max(0, b.rfind('\n', 0, 31500 - len(a + m)))] + '\n[… documents annexes abrégés pour l\'outil]')
    documents = [d for d in documents if d]
    for d in documents:
        d['libre'] = pop != 'medecine'     # le patient apporte ordonnance et lettre de sortie (officine) / dossier consultable (hôpital)
    c = dict(id=cid, theme=THEME.get(sp, 'autres'), specialites=[service(sp)], apercu=apercu, enonce=enonce, questions=questions,
             indices=dict(documents_possibles=sorted({d['type'] for d in documents}), valeurs_chiffrees=len(bio), traitement_nomme=bool(meds_sortie or meds_entree), question_verification_traitement=pop != 'medecine'),
             documents=documents, sources=[{'fichier': 'PARHAF v1.0 (Health Data Hub, CC BY 4.0)', 'ids': [p['id']]}],
             connaissances=dict(medicaments=[{'terme': m[0], 'substances': sorted(m[1])} for m in meds_sortie],
                                interactions=[{'entre': [d['la'], d['lb']], 'rubrique': d['rubrique'], 'niveau': d['niveau'], 'mecanisme': d['mecanisme'], 'conduite': d['conduite']} for d in inter],
                                origine="compte rendu PARHAF ; BDPM ; thésaurus ANSM (version structurée 2019)"),
             pop=pop, pop_origine='PARHAF (comptes rendus fictifs rédigés et relus par des médecins) ; conversion automatique', metier={'officine': 'officine', 'hospitalier': 'hospitalier', 'medecine': 'médecine'}[pop],
             a_valider=False, actif=True,
             fiche=dict(sexe='Femme' if sexe == 'F' else 'Homme', age=age, age_unite=unite, poids_kg=None, taille_cm=None, allergies=allerg,
                        traitements=[m[0] for m in (meds_entree or [])] or None, origine='PARHAF'),
             patient=dict(plainte=plainte, emotion=EMO(age_ans, sp), profil='', zone=None, symptomes=[]))
    cas.append(c)
json.dump({'cas': cas}, open(OUT, 'w'), ensure_ascii=False)
print('répartition', dict(stats), '| lot', LOT, len(cas))
