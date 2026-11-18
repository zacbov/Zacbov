# Construit chat/bdpm.json (base publique des médicaments, ANSM, licence Etalab 2.0) à partir des fichiers
# officiels CIS_*.txt. Usage :
#   python3 bdpm_build.py DOSSIER_TXT SORTIE.json            # fichiers déjà présents
#   python3 bdpm_build.py --telecharger DOSSIER_TXT SORTIE.json  # télécharge d'abord (machine avec accès Internet,
#                                                               # p. ex. l'action GitHub fournie)
# Seules les spécialités commercialisées sont gardées. Format compact (tableaux) décrit dans "schema".
import sys, os, json, csv, datetime, urllib.request

FICHIERS = ['CIS_bdpm.txt', 'CIS_CIP_bdpm.txt', 'CIS_COMPO_bdpm.txt', 'CIS_HAS_SMR_bdpm.txt', 'CIS_HAS_ASMR_bdpm.txt',
            'CIS_GENER_bdpm.txt', 'CIS_CPD_bdpm.txt', 'CIS_CIP_Dispo_Spec.txt', 'CIS_MITM.txt']
URL = 'https://base-donnees-publique.medicaments.gouv.fr/download/file/'
URL2 = 'https://base-donnees-publique.medicaments.gouv.fr/telechargement.php?fichier='

args = sys.argv[1:]
tele = '--telecharger' in args
args = [a for a in args if a != '--telecharger']
DOS, OUT = args

if tele:
    os.makedirs(DOS, exist_ok=True)
    for f in FICHIERS:
        for base in (URL, URL2):
            try:
                req = urllib.request.Request(base + f, headers={'User-Agent': 'Mozilla/5.0 (cas-cliniques)'})
                data = urllib.request.urlopen(req, timeout=60).read()
                if len(data) < 1000 and f != 'CIS_CIP_Dispo_Spec.txt': raise ValueError('fichier trop court')
                open(os.path.join(DOS, f), 'wb').write(data); print('téléchargé', f, len(data)); break
            except Exception as e:
                print('échec', base + f, e)
        else:
            sys.exit('téléchargement impossible : ' + f)

def lire(nom):
    p = os.path.join(DOS, nom)
    if not os.path.exists(p): print('absent :', nom); return []
    b = open(p, 'rb').read()
    try: t = b.decode('utf-8')
    except UnicodeDecodeError: t = b.decode('cp1252', errors='replace')
    return [l.split('\t') for l in t.replace('\r\n', '\n').split('\n') if l.strip()]

C1 = {i: bytes([i]).decode('cp1252', errors='ignore') or ' ' for i in range(0x80, 0xA0)}
def s(x): return (x or '').translate(C1).replace('<br>', ' ').replace('  ', ' ').strip()
def prix(x):
    x = s(x).replace(',', '.')
    if x.count('.') > 1: a, b = x.rsplit('.', 1); x = a.replace('.', '') + '.' + b   # « 1.234,56 »
    try: return round(float(x), 2)
    except ValueError: return None
def date8(x): x = s(x); return f'{x[:4]}-{x[4:6]}-{x[6:8]}' if len(x) == 8 and x.isdigit() else x
def datefr(x):
    x = s(x)
    try: return datetime.datetime.strptime(x, '%d/%m/%Y').strftime('%Y-%m-%d')
    except ValueError: return x

SPE = {}
for r in lire('CIS_bdpm.txt'):
    r += [''] * 12
    if s(r[6]) != 'Commercialisée': continue
    SPE[s(r[0])] = dict(n=s(r[1]), f=s(r[2]), v=s(r[3]).replace(';', ', '), proc=s(r[5]), t=s(r[10]), sr=s(r[11]).lower() == 'oui',
                        sa=[], pr=[], g=None, smr=None, asmr=None, cpd=[], dispo=None, atc=None)

compo = {}
for r in lire('CIS_COMPO_bdpm.txt'):
    r += [''] * 9; c = s(r[0])
    if c not in SPE: continue
    compo.setdefault(c, []).append(r)
for c, L in compo.items():
    ft = {s(r[7]) for r in L if s(r[6]) == 'FT'}
    vus = set()
    for r in L:
        # « fraction thérapeutique » (FT) quand elle existe, sinon la substance active (SA)
        if s(r[6]) == 'SA' and s(r[7]) in ft: continue
        k = (s(r[3]), s(r[4]))
        if k in vus: continue
        vus.add(k); SPE[c]['sa'].append([s(r[3]).capitalize() if s(r[3]).isupper() else s(r[3]), s(r[4]), s(r[5])])

for r in lire('CIS_CIP_bdpm.txt'):
    r += [''] * 13; c = s(r[0])
    if c not in SPE or 'arrêt' in s(r[4]).lower(): continue
    SPE[c]['pr'].append([s(r[2]), s(r[6]), s(r[8]), prix(r[10]) or prix(r[9])])

GRP = {}
for r in lire('CIS_GENER_bdpm.txt'):
    r += [''] * 5; c = s(r[2])
    if c not in SPE: continue
    GRP[s(r[0])] = s(r[1]); SPE[c]['g'] = [int(s(r[0])) if s(r[0]).isdigit() else s(r[0]), int(s(r[3]) or 0)]

for fic, cle in (('CIS_HAS_SMR_bdpm.txt', 'smr'), ('CIS_HAS_ASMR_bdpm.txt', 'asmr')):
    for r in lire(fic):
        r += [''] * 6; c = s(r[0])
        if c not in SPE: continue
        v = [s(r[4]), date8(r[3]), s(r[5])[:260]]
        if not SPE[c][cle] or v[1] > SPE[c][cle][1]: SPE[c][cle] = v

for r in lire('CIS_CPD_bdpm.txt'):
    r += [''] * 2; c = s(r[0])
    if c in SPE and s(r[1]): SPE[c]['cpd'].append(s(r[1]))

for r in lire('CIS_CIP_Dispo_Spec.txt'):
    r += [''] * 8; c = s(r[0])
    if c not in SPE: continue
    if s(r[6]): continue          # date de remise à disposition renseignée : épisode clos
    SPE[c]['dispo'] = [s(r[3]), datefr(r[4])]

for r in lire('CIS_MITM.txt'):
    r += [''] * 3; c = s(r[0])
    if c in SPE: SPE[c]['atc'] = s(r[1])

TYPES_GEN = {0: 'princeps', 1: 'générique', 2: 'générique (complémentarité posologique)', 4: 'générique substituable'}
lignes = []
for c, d in sorted(SPE.items(), key=lambda kv: kv[1]['n']):
    homeo = 'homéo' in d['proc'].lower()
    lignes.append([c, d['n'], d['f'], d['v'], d['t'], d['sa'], d['pr'], d['g'], d['smr'], d['asmr'], d['cpd'] or None,
                   d['dispo'], d['atc'], 1 if d['sr'] else 0, 1 if homeo else 0])
date = None
mp = os.path.join(DOS, 'meta.json')
if os.path.exists(mp):
    try: date = min(v['downloadedAt'] for v in json.load(open(mp)).values())[:10]
    except Exception: pass
out = dict(
    source='ANSM — Base de données publique des médicaments (licence Etalab 2.0)',
    extraction=date or datetime.date.today().isoformat(),
    schema=['cis', 'nom', 'forme', 'voies', 'titulaire', 'substances[nom,dosage,ref]', 'presentations[libelle,cip13,taux,prix]',
            'generique[groupe,type]', 'smr[valeur,date,texte]', 'asmr[valeur,date,texte]', 'conditions', 'dispo[statut,depuis]',
            'atc', 'surveillance_renforcee', 'homeopathie'],
    types_generique=TYPES_GEN, groupes=GRP, m=lignes)
json.dump(out, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('spécialités', len(lignes), '; groupes', len(GRP), '; octets', os.path.getsize(OUT))
