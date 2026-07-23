#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""fetch_ontology_ols.py — récupère UBERON complet depuis l'API OLS4 (EMBL-EBI)
et le filtre sur les 72 organes de CorpoAtlas.

Pourquoi OLS plutôt que l'API HRA :
  L'arbre HRA est filtré sur le périmètre HuBMAP (4498 nœuds) — il manquait
  28 de nos organes (thyroïde, surrénales, os, muscles…) et ne contenait que
  76 synonymes. OLS sert UBERON non filtré : hiérarchie complète, tous les
  synonymes, et les structures absentes du HRA.

Sortie : data/ontology.json (même schéma que la version HRA, donc le module
         JS de l'atlas fonctionne sans modification)

Usage :
    python3 fetch_ontology_ols.py
    python3 fetch_ontology_ols.py --verbose

Aucune dépendance externe.
"""

import json, os, sys, time, urllib.request, urllib.parse, urllib.error, re, unicodedata

BASE = 'https://www.ebi.ac.uk/ols4/api'
OUT  = 'data/ontology.json'
UA   = 'CorpoAtlas/1.0 (educational; contact: your-email@example.com)'
VERBOSE = '--verbose' in sys.argv

# ── Identifiants UBERON connus ────────────────────────────────────────
# Renseigner l'OBO ID évite toute ambiguïté de recherche textuelle.
# Les entrées à None seront cherchées par libellé (moins fiable).
OBO = {
 'coeur':'UBERON:0000948',            # heart
 'ventricule_g':'UBERON:0002084',     # heart left ventricle
 'ventricule_d':'UBERON:0002080',     # heart right ventricle
 'oreillettes':'UBERON:0002081',      # cardiac atrium
 'valves':'UBERON:0000946',           # cardiac valve
 'aorte':'UBERON:0000947',            # aorta
 'coronaires':'UBERON:0001621',       # coronary artery
 'carotides':'UBERON:0001532',        # common carotid artery
 'art_pulmonaire':'UBERON:0002012',   # pulmonary artery
 'veines_mi':'UBERON:0003713',        # vein of lower limb  (à vérifier)
 'art_mi':'UBERON:0003705',           # artery of lower limb (à vérifier)
 'pericarde':'UBERON:0002407',        # pericardium
 'poumons':'UBERON:0002048',          # lung
 'poumon_g':'UBERON:0002168',         # left lung
 'bronches':'UBERON:0002185',         # bronchus
 'trachee':'UBERON:0003126',          # trachea
 'plevre':'UBERON:0000977',           # pleura
 'diaphragme':'UBERON:0001103',       # diaphragm
 'larynx':'UBERON:0001737',           # larynx
 'foie':'UBERON:0002107',             # liver
 'vesicule':'UBERON:0002110',         # gallbladder
 'pancreas':'UBERON:0001264',         # pancreas
 'estomac':'UBERON:0000945',          # stomach
 'oesophage':'UBERON:0001043',        # esophagus
 'intestin_grele':'UBERON:0002108',   # small intestine
 'colon':'UBERON:0001155',            # colon
 'appendice':'UBERON:0001154',        # vermiform appendix
 'rectum':'UBERON:0001052',           # rectum
 'rate':'UBERON:0002106',             # spleen
 'peritoine':'UBERON:0002358',        # peritoneum
 'reins':'UBERON:0002113',            # kidney
 'uretere':'UBERON:0000056',          # ureter
 'vessie':'UBERON:0001255',           # urinary bladder
 'urethre':'UBERON:0000057',          # urethra
 'prostate':'UBERON:0002367',         # prostate gland
 'cerveau':'UBERON:0000955',          # brain
 'cervelet':'UBERON:0002037',         # cerebellum
 'tronc_cerebral':'UBERON:0002298',   # brainstem
 'moelle':'UBERON:0002240',           # spinal cord
 'meninges':'UBERON:0002360',         # meninx
 'hippocampe':'UBERON:0002421',       # hippocampal formation
 'noyaux_gris':'UBERON:0002420',      # basal ganglion
 'nerfs_craniens':'UBERON:0001785',   # cranial nerve
 'nerfs_periph':'UBERON:0001021',     # nerve
 'oeil':'UBERON:0000970',             # eye
 'oreille':'UBERON:0001690',          # ear
 'thyroide':'UBERON:0002046',         # thyroid gland
 'parathyroides':'UBERON:0001132',    # parathyroid gland
 'surrenales':'UBERON:0002369',       # adrenal gland
 'hypophyse':'UBERON:0000007',        # pituitary gland
 'hypothalamus':'UBERON:0001898',     # hypothalamus
 'thymus':'UBERON:0002370',           # thymus
 'uterus':'UBERON:0000995',           # uterus
 'ovaires':'UBERON:0000992',          # ovary
 'trompes':'UBERON:0003889',          # fallopian tube
 'placenta':'UBERON:0001987',         # placenta
 'vagin':'UBERON:0000996',            # vagina
 'testicules':'UBERON:0000473',       # testis
 'ganglions':'UBERON:0000029',        # lymph node
 'moelle_osseuse':'UBERON:0002371',   # bone marrow
 'rachis':'UBERON:0001130',           # vertebral column
 'crane':'UBERON:0003128',            # cranium
 'thorax_os':'UBERON:0007798',        # rib cage  (à vérifier)
 'bassin':'UBERON:0001270',           # bony pelvis
 'os_mi':'UBERON:0002495',            # bone of lower limb (à vérifier)
 'os_ms':'UBERON:0002494',            # bone of upper limb (à vérifier)
 'muscles_mi':'UBERON:0001383',       # muscle of leg     (à vérifier)
 'muscles_ms':'UBERON:0001497',       # muscle of arm     (à vérifier)
 'muscles_abdo':'UBERON:0002322',     # abdominal muscle  (à vérifier)
 'peau':'UBERON:0002097',             # skin of body
 'tissu_adipeux':'UBERON:0001013',    # adipose tissue
 'sein':'UBERON:0000310',             # breast
}

def get(url, tries=3):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA,
                                                       'Accept': 'application/json'})
            with urllib.request.urlopen(req, timeout=45) as r:
                return json.loads(r.read().decode('utf-8'))
        except urllib.error.HTTPError as e:
            if e.code == 404: return None
            if VERBOSE: print(f'    HTTP {e.code}')
            if e.code < 500 and e.code != 429: return None
            time.sleep(1.5 * (i + 1))
        except Exception as e:
            if VERBOSE: print(f'    {e}')
            time.sleep(1.5 * (i + 1))
    return None

def first_term(payload):
    """OLS renvoie les termes dans _embedded.terms."""
    if not payload: return None
    emb = payload.get('_embedded') or {}
    terms = emb.get('terms') or []
    return terms[0] if terms else None

def term_by_obo(obo_id):
    q = urllib.parse.urlencode({'obo_id': obo_id})
    return first_term(get(f'{BASE}/ontologies/uberon/terms?{q}'))

def term_by_label(label):
    q = urllib.parse.urlencode({'q': label, 'ontology': 'uberon',
                                'exact': 'true', 'rows': 1})
    d = get(f'{BASE}/search?{q}')
    docs = ((d or {}).get('response') or {}).get('docs') or []
    if not docs: return None
    return term_by_obo(docs[0].get('obo_id') or '')

def related(term, rel):
    """rel = 'parents' | 'children' — suit le lien HAL fourni par OLS."""
    link = ((term.get('_links') or {}).get(rel) or {}).get('href')
    if not link: return []
    d = get(link)
    out = []
    for t in ((d or {}).get('_embedded') or {}).get('terms', []):
        out.append({'iri': t.get('iri',''), 'label': t.get('label','')})
    return out

def main():
    os.makedirs('data', exist_ok=True)
    out, missing, notes = {}, [], []
    total = len(OBO)

    for i, (key, obo) in enumerate(OBO.items(), 1):
        print(f'[{i:2d}/{total}] {key:16s}', end=' ', flush=True)
        t = term_by_obo(obo) if obo else None
        if not t and obo:
            notes.append(f'{key}: {obo} introuvable, repli sur recherche')
            t = term_by_label(key)
        if not t:
            print('✗')
            missing.append(key); continue

        syn = [s for s in (t.get('synonyms') or []) if s]
        out[key] = {
            'iri':   t.get('iri',''),
            'obo':   t.get('obo_id',''),
            'label': t.get('label',''),
            'desc':  (t.get('description') or [''])[0][:400],
            'syn':   sorted(set(syn))[:15],
            'parents':  related(t, 'parents')[:5],
            'children': related(t, 'children')[:30],
        }
        print(f"✓ {out[key]['label'][:26]:28s} {len(syn):2d} syn")
        time.sleep(0.15)          # courtoisie envers l'API publique

    meta = {
        'source': 'EMBL-EBI OLS4 — UBERON (non filtré)',
        'url': f'{BASE}/ontologies/uberon',
        'licence': 'UBERON : CC-BY 3.0 — citer Mungall et al. 2012',
        'organs_mapped': len(out),
        'organs_missing': missing,
        'notes': notes,
        'note': "Récupéré une fois puis stocké en local : aucun appel réseau à l'exécution.",
    }
    json.dump({'byOrgan': out, '_meta': meta},
              open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

    syn = sum(len(v['syn']) for v in out.values())
    ch  = sum(len(v['children']) for v in out.values())
    pa  = sum(len(v['parents'])  for v in out.values())
    print(f'\n{len(out)}/{total} organes → {OUT}')
    print(f'synonymes {syn} · parents {pa} · sous-structures {ch}')
    if missing:
        print(f'manquants : {", ".join(missing)}')
        print('  → corriger l\'OBO ID dans le dictionnaire OBO puis relancer')
    if notes:
        print('remarques :'); [print('  '+n) for n in notes]

if __name__ == '__main__':
    main()
