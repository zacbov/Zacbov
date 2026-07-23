#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""fetch_ontology.py — récupère l'ontologie UBERON via l'API HRA et la filtre
sur les 72 organes de CorpoAtlas.

Sortie : data/ontology.json
   {
     "byOrgan": {
        "reins": {
           "iri": "http://purl.obolibrary.org/obo/UBERON_0002113",
           "label": "kidney",
           "syn": ["ren", "renal organ", ...],
           "parents": [{"iri":..., "label":"excretory system"}],
           "children": [{"iri":..., "label":"renal cortex"}, ...]
        }, ...
     },
     "_meta": {...}
   }

Usage :
    python3 fetch_ontology.py            # récupère et filtre
    python3 fetch_ontology.py --dump     # écrit aussi l'arbre brut (debug)

Aucune dépendance externe : urllib seulement.
"""

import json, os, sys, urllib.request, urllib.error, unicodedata, re

API   = 'https://apps.humanatlas.io/hra-api/v1'
OUT   = 'data/ontology.json'
RAW   = 'data/_ontology_raw.json'
UA    = 'CorpoAtlas/1.0 (educational; contact: your-email@example.com)'

# ── Amorce : organe CorpoAtlas → terme(s) anglais UBERON ──────────────
# L'API renvoie des labels anglais ; cette table fait le pont avec les
# clés françaises. Plusieurs candidats possibles, le 1er trouvé gagne.
SEED = {
 'coeur':['heart'], 'ventricule_g':['left ventricle','heart left ventricle'],
 'ventricule_d':['right ventricle','heart right ventricle'],
 'oreillettes':['cardiac atrium','heart atrium'],
 'valves':['heart valve','cardiac valve'], 'aorte':['aorta'],
 'coronaires':['coronary artery'], 'carotides':['carotid artery','common carotid artery'],
 'art_pulmonaire':['pulmonary artery'], 'veines_mi':['vein of lower extremity','femoral vein'],
 'art_mi':['artery of lower extremity','femoral artery'], 'pericarde':['pericardium'],
 'poumons':['lung'], 'poumon_g':['left lung'], 'bronches':['bronchus'],
 'trachee':['trachea'], 'plevre':['pleura'], 'diaphragme':['diaphragm'],
 'larynx':['larynx'],
 'foie':['liver'], 'vesicule':['gallbladder'], 'pancreas':['pancreas'],
 'estomac':['stomach'], 'oesophage':['esophagus'],
 'intestin_grele':['small intestine'], 'colon':['colon','large intestine'],
 'appendice':['vermiform appendix','appendix'], 'rectum':['rectum'],
 'rate':['spleen'], 'peritoine':['peritoneum'],
 'reins':['kidney'], 'uretere':['ureter'], 'vessie':['urinary bladder'],
 'urethre':['urethra'], 'prostate':['prostate gland','prostate'],
 'cerveau':['brain','cerebral hemisphere'], 'cervelet':['cerebellum'],
 'tronc_cerebral':['brainstem','brain stem'], 'moelle':['spinal cord'],
 'meninges':['meninx','meninges'], 'hippocampe':['hippocampal formation','hippocampus'],
 'noyaux_gris':['basal ganglion','basal ganglia'],
 'nerfs_craniens':['cranial nerve'], 'nerfs_periph':['peripheral nerve','nerve'],
 'oeil':['eye','eyeball of camera-type eye'], 'oreille':['ear','inner ear'],
 'thyroide':['thyroid gland'], 'parathyroides':['parathyroid gland'],
 'surrenales':['adrenal gland'], 'hypophyse':['pituitary gland'],
 'hypothalamus':['hypothalamus'], 'thymus':['thymus'],
 'uterus':['uterus'], 'ovaires':['ovary'], 'trompes':['fallopian tube','uterine tube'],
 'placenta':['placenta'], 'vagin':['vagina'], 'testicules':['testis'],
 'ganglions':['lymph node'], 'moelle_osseuse':['bone marrow'],
 'rachis':['vertebral column'], 'crane':['skull'],
 'thorax_os':['rib cage','rib'], 'bassin':['pelvis','bony pelvis'],
 'os_mi':['bone of lower limb','hindlimb bone'],
 'os_ms':['bone of upper limb','forelimb bone'],
 'muscles_mi':['muscle of lower limb'], 'muscles_ms':['muscle of upper limb'],
 'muscles_abdo':['abdominal muscle','muscle of abdomen'],
 'peau':['skin of body','skin'], 'tissu_adipeux':['adipose tissue'],
 'sein':['breast','mammary gland'],
}

def norm(s):
    s = unicodedata.normalize('NFKD', str(s)).encode('ascii','ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+',' ',s).strip()

def get(path, tries=3):
    url = f'{API}/{path}'
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA,
                                                       'Accept':'application/json'})
            with urllib.request.urlopen(req, timeout=90) as r:
                return json.loads(r.read().decode('utf-8'))
        except urllib.error.HTTPError as e:
            print(f'  HTTP {e.code} sur {path}')
            if e.code < 500: return None
        except Exception as e:
            print(f'  tentative {i+1}/{tries} échouée : {e}')
    return None

def main():
    os.makedirs('data', exist_ok=True)
    organs = json.load(open('/tmp/organs72.json', encoding='utf-8')) \
             if os.path.exists('/tmp/organs72.json') else None

    print('→ récupération de l\'arbre UBERON…')
    tree = get('ontology-tree-model')
    if not tree or 'nodes' not in tree:
        print('ÉCHEC : arbre indisponible.')
        print('Vérifier https://apps.humanatlas.io/hra-api/v1/ontology-tree-model')
        sys.exit(1)

    nodes = tree['nodes']
    print(f'  {len(nodes)} nœuds reçus')

    if '--dump' in sys.argv:
        json.dump(tree, open(RAW,'w',encoding='utf-8'), ensure_ascii=False)
        print(f'  arbre brut → {RAW}')

    # index label/synonyme normalisé → nœud
    idx = {}
    for iri, n in nodes.items():
        for lab in [n.get('label','')] + list(n.get('synonymLabels') or []):
            k = norm(lab)
            if k and k not in idx:
                idx[k] = iri

    out, missing = {}, []
    for key, candidates in SEED.items():
        hit = None
        for c in candidates:
            hit = idx.get(norm(c))
            if hit: break
        if not hit:
            missing.append(key); continue

        n = nodes[hit]
        def brief(iri):
            m = nodes.get(iri)
            return {'iri': iri, 'label': m.get('label','')} if m else None

        parents = [b for b in [brief(n.get('parent'))] if b]
        children = [b for b in (brief(c) for c in (n.get('children') or [])) if b]

        out[key] = {
            'iri': hit,
            'label': n.get('label',''),
            'syn': sorted({s for s in (n.get('synonymLabels') or []) if s})[:12],
            'parents': parents,
            'children': children[:25],
        }

    meta = {
        'source': 'HRA API — /ontology-tree-model (UBERON)',
        'url': f'{API}/ontology-tree-model',
        'nodes_total': len(nodes),
        'organs_mapped': len(out),
        'organs_missing': missing,
        'note': "Récupéré une fois puis stocké en local : aucun appel réseau à l'exécution.",
    }
    json.dump({'byOrgan': out, '_meta': meta},
              open(OUT,'w',encoding='utf-8'), ensure_ascii=False, indent=1)

    print(f'\n{len(out)}/{len(SEED)} organes rattachés à UBERON → {OUT}')
    if missing:
        print(f'non trouvés ({len(missing)}) : {", ".join(missing)}')
        print('  → ajuster les termes anglais dans SEED puis relancer')
    syn = sum(len(v['syn']) for v in out.values())
    ch  = sum(len(v['children']) for v in out.values())
    print(f'synonymes récupérés : {syn} · sous-structures : {ch}')

if __name__ == '__main__':
    main()
