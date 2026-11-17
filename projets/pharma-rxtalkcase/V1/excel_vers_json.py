#!/usr/bin/env python3
"""Reconstruit cas_cliniques.json à partir du classeur Excel.

Usage :  python excel_vers_json.py cas_cliniques_complet.xlsx [cas_cliniques.json]

- Le classeur est la source de vérité : tout ce qu'il contient écrase l'ancien JSON.
- Ce que le classeur ne peut pas porter (symptômes du patient, médecin/date d'une ordonnance,
  identifiants des lames et de l'imagerie, drapeau « libre ») est repris de l'ancien JSON
  s'il existe déjà (même id de cas). Pour un nouveau cas, ces champs restent vides.
- Un rapport s'affiche à la fin : nouveaux cas, cas retirés, avertissements.
Dépendance : pip install openpyxl
"""
import json, os, re, sys
from collections import defaultdict
import openpyxl

XLSX = sys.argv[1] if len(sys.argv) > 1 else 'cas_cliniques_complet.xlsx'
OUT = sys.argv[2] if len(sys.argv) > 2 else 'cas_cliniques.json'
warn = []


def vide(v):
    return v is None or (isinstance(v, str) and v.strip() == '')


def txt(v):
    return None if vide(v) else str(v)


def entier(v):
    if vide(v): return None
    try:
        f = float(str(v).replace(',', '.'))
        return int(f) if f == int(f) else f
    except ValueError:
        return str(v)


def booleen(v):
    if vide(v): return None
    return v if isinstance(v, bool) else str(v).strip().lower() in ('true', 'vrai', '1', 'oui')


def liste(v, sep=', '):
    return None if vide(v) else [x.strip() for x in str(v).split(sep) if x.strip()]


def feuille(wb, nom):
    rows = list(wb[nom].iter_rows(values_only=True))
    h = rows[0]
    return [dict(zip(h, r)) for r in rows[1:] if any(not vide(c) for c in r)]


wb = openpyxl.load_workbook(XLSX, read_only=True, data_only=True)
cas_rows, qr, docs, meds = (feuille(wb, n) for n in ('Cas_Cliniques', 'Questions_Reponses', 'Documents_Examens', 'Medicaments_Interactions'))

base = {}
if os.path.exists(OUT):
    try:
        old = json.load(open(OUT, encoding='utf-8'))
        base = {c['id']: c for c in old['cas']}
    except Exception as e:
        old = None; warn.append(f'ancien {OUT} illisible ({e}) : reconstruction sans reprise des champs non portés par Excel')
else:
    old = None

Q = defaultdict(list); D = defaultdict(lambda: defaultdict(list)); M = defaultdict(list)
for r in qr: Q[r['cas_id']].append(r)
for r in docs: D[r['cas_id']][str(r['doc_num'])].append(r)
for r in meds: M[r['cas_id']].append(r)


def paires(s):  # « cle: valeur ; cle: valeur »
    out = {}
    for part in re.split(r' ; (?=[a-z_]+: )', s or ''):
        if ': ' in part:
            k, v = part.split(': ', 1); out[k.strip()] = v
    return out


def document(lignes):
    r0 = lignes[0]; t = r0['doc_type']
    d = {'type': t}
    if not vide(r0['doc_titre']): d['titre'] = r0['doc_titre']
    if t == 'bilan':
        d['lignes'] = [{'ech': r['echantillon'] or '', 'analyse': r['analyse_ou_medicament'] or '', 'resultat': txt(r['resultat_ou_posologie']) or '', 'unite': r['unite_ou_duree'] or '', 'ref': r['valeurs_ref'] or ''} for r in lignes]
    elif t == 'dp':
        d['lignes'] = [{'medicament': r['analyse_ou_medicament'] or '', 'substances': r['resultat_ou_posologie'] or ''} for r in lignes]
    elif t == 'ordonnance':
        d.update({'medecin': '', 'patient': '', 'date': ''})
        d.update({k: v for k, v in paires(r0['texte_ou_details']).items() if k in ('medecin', 'patient', 'date')})  # optionnel : « medecin: Dr X ; patient: Mme Y ; date: 12/03 »
        d['lignes'] = [{'medicament': r['analyse_ou_medicament'] or '', 'posologie': r['resultat_ou_posologie'] or '', 'duree': r['unite_ou_duree'] or ''} for r in lignes]
    elif t == 'compte_rendu':
        d['texte'] = re.sub(r'^texte: ', '', r0['texte_ou_details'] or '')
    elif t == 'tableau':
        d['sous_titre'] = r0['analyse_ou_medicament'] or ''
        cols = [c.split(': ', 1)[0] for c in (r0['texte_ou_details'] or '').split(' | ')]
        d['colonnes'] = cols
        d['lignes'] = [[c.split(': ', 1)[1] if ': ' in c else '' for c in (r['texte_ou_details'] or '').split(' | ')] for r in lignes]
    else:  # image, lame, imagerie : champs texte
        d.update(paires(r0['texte_ou_details']))
    d['origine'] = r0['doc_origine']
    return d


def fusion(neuf, ancien):
    """Complète 'neuf' avec ce qu'Excel ne porte pas (clés absentes ou vides)."""
    for k, v in ancien.items():
        if k not in neuf: neuf[k] = v
        elif isinstance(neuf[k], dict) and isinstance(v, dict): fusion(neuf[k], v)
        elif vide(neuf[k]) and not vide(v) and k in ('medecin', 'patient', 'date', 'symptomes'): neuf[k] = v
    return neuf


cas = []
for r in cas_rows:
    i = r['id']
    c = {'id': i, 'theme': r['theme_id'], 'specialites': [r['specialites']] if not vide(r['specialites']) else [],
         'apercu': r['apercu'] or '', 'enonce': r['enonce'] or ''}
    qs = sorted(Q.get(i, []), key=lambda x: int(x['question_ordre']))
    c['questions'] = [{'n': None if vide(q['question_numero']) else str(q['question_numero']), 'type': q['question_type'], 'question': q['question'], 'reponse_modele': q['reponse_modele']} for q in qs]
    c['indices'] = {'documents_possibles': liste(r['indices_documents_possibles']) or [], 'valeurs_chiffrees': entier(r['indices_valeurs_chiffrees']) or 0,
                    'traitement_nomme': bool(booleen(r['indices_traitement_nomme'])), 'question_verification_traitement': bool(booleen(r['indices_question_verif_traitement']))}
    c['documents'] = [document(D[i][k]) for k in sorted(D[i], key=int)]
    if not vide(r['sources_annales']):
        c['sources'] = []
        for s in r['sources_annales'].split(' ; '):
            f, _, ids = s.partition(': ')
            ref = next((b for b in base.get(i, {}).get('sources', []) if b['fichier'] == f and ', '.join(b['ids']) == ids), None)
            c['sources'].append({'fichier': f, 'ids': ref['ids'] if ref else ([x.strip() for x in ids.split(', ')] if ids else [])})
    else: c['sources'] = []
    mm, ii = [], []
    for m in M.get(i, []):
        if m['categorie'] == 'Interaction ANSM':
            ii.append({'entre': [x.strip() for x in str(m['terme_ou_couple']).split(' + ')], 'rubrique': m['substances_ou_rubrique'] or '',
                       'niveau': re.split(r', (?=contre|association|précaution|à prendre)', str(m['niveau_interaction'])) if not vide(m['niveau_interaction']) else [], 'mecanisme': m['mecanisme'] or '', 'conduite': m['conduite_a_tenir'] or ''})
        else:
            mm.append({'terme': m['terme_ou_couple'], 'substances': liste(m['substances_ou_rubrique']) or []})
    c['connaissances'] = {'medicaments': mm, 'interactions': ii, 'origine': r['connaissances_origine']}
    c['pop'] = r['pop_id']; c['pop_origine'] = r['pop_origine']
    raw = r['patient_traitements_fiche']
    if isinstance(raw, str) and len(raw) % 3 == 1 and len(raw) >= 7 and all(raw[k:k + 2] == ', ' for k in range(1, len(raw) - 1, 3)):
        trait = raw[::3]  # texte libre écrit lettre par lettre dans Excel (« a, u, c, u, n ») : on le recompose (« aucun »)
        n_lettres = globals().get('n_lettres', 0) + 1; globals()['n_lettres'] = n_lettres
    else:
        trait = liste(raw)
    c['fiche'] = {'sexe': txt(r['patient_sexe']), 'age': entier(r['patient_age']), 'age_unite': txt(r['patient_age_unite']), 'poids_kg': entier(r['patient_poids_kg']),
                  'taille_cm': entier(r['patient_taille_cm']), 'grossesse': booleen(r['patient_grossesse']) if not isinstance(r['patient_grossesse'], str) or r['patient_grossesse'].lower() in ('true', 'false') else txt(r['patient_grossesse']),
                  'allaitement': booleen(r['patient_allaitement']) if not isinstance(r['patient_allaitement'], str) or r['patient_allaitement'].lower() in ('true', 'false') else txt(r['patient_allaitement']),
                  'allergies': txt(r['patient_allergies']), 'traitements': trait, 'origine': txt(r['fiche_origine'])}
    if not vide(r['metier']): c['metier'] = r['metier']
    for k in ('a_valider', 'corrige', 'extraction_a_relire'):
        if not vide(r[k]): c[k] = booleen(r[k])
    if not vide(r['auteurs_corrige']): c['auteurs_corrige'] = r['auteurs_corrige']
    if not vide(r['avatar_plainte']) or not vide(r['avatar_emotion']):
        c['patient'] = {'emotion': r['avatar_emotion'] or '', 'profil': r['avatar_profil'] or '', 'zone': {'partie': r['avatar_zone_partie'], 'cote': r['avatar_zone_cote']} if not (vide(r['avatar_zone_partie']) and vide(r['avatar_zone_cote'])) else None, 'plainte': r['avatar_plainte'] or ''}
        c['constantes'] = {'pas': entier(r['constantes_pas']), 'pad': entier(r['constantes_pad']), 'pouls': entier(r['constantes_pouls'])} if not vide(r['constantes_pas']) else None
    if not vide(r['fiche_source_nom']):
        c['fiche_source'] = {'nom': r['fiche_source_nom'], 'type': r['fiche_source_type'], 'niveau': entier(r['fiche_source_niveau'])}
    if not vide(r['atlas']): c['atlas'] = r['atlas']
    if not vide(r['peau_maladie']): c['peau'] = {'maladie': r['peau_maladie'], 'stade': entier(r['peau_stade'])}
    if not vide(r['visage_cote']): c['visage'] = {'side': r['visage_cote']}
    if not vide(r['decouvrir']): c['decouvrir'] = r['decouvrir']
    if not vide(r['gestes_attendus']): c['gestes_attendus'] = liste(r['gestes_attendus'])
    if not vide(r['alertes_conseils']):
        c['alertes_conseils'] = []
        for a in re.split(r'\n| ; (?=Si \[)', str(r['alertes_conseils'])):
            m = re.match(r'Si \[(.*?)\] -> (.*)$', a.strip(), re.S)
            if m: c['alertes_conseils'].append({'si': m.group(1), 'rappel': m.group(2)})
            elif a.strip(): warn.append(f'{i} : alerte non reconnue « {a[:40]} »')
    if i in base:
        ancien = base[i]
        for k in ('documents',):  # documents : on reprend les champs absents, document par document
            for n, dn in enumerate(c[k]):
                if n < len(ancien.get(k, [])) and ancien[k][n].get('type') == dn['type']: fusion(dn, ancien[k][n])
        fusion(c, {k: v for k, v in ancien.items() if k not in ('documents',)})
    cas.append(c)

# contrôles
ids = [c['id'] for c in cas]
for x in {i for i in ids if ids.count(i) > 1}: warn.append(f'identifiant en double : {x}')
themes_ok = {c['theme'] for c in cas}
for c in cas:
    if c['pop'] not in ('officine', 'hospitalier', 'industrie_recherche'): warn.append(f"{c['id']} : parcours inconnu « {c['pop']} »")
    if not c['questions']: warn.append(f"{c['id']} : aucune question dans l'onglet Questions_Reponses")
    if not c['enonce']: warn.append(f"{c['id']} : énoncé vide")

meta = dict(old['meta']) if old else {'version': '1.2', 'themes': []}
lib = {}
try:
    for r in cas_rows: lib[r['theme_id']] = r['theme_libelle']
except Exception: pass
anciens = {t['id']: t for t in meta.get('themes', [])}
ordre = [t for t in anciens if t in themes_ok] + sorted(t for t in themes_ok if t not in anciens)
meta['themes'] = [{**anciens.get(t, {'id': t}), 'id': t, 'libelle': anciens.get(t, {}).get('libelle') or lib.get(t) or t, 'nb_cas': sum(c['theme'] == t for c in cas)} for t in ordre]
meta['nb_cas'] = len(cas)
if 'pops' in meta:
    for p in meta['pops']:
        if isinstance(p, dict) and 'id' in p: p['nb_cas'] = sum(c['pop'] == p['id'] for c in cas)

json.dump({'meta': meta, 'cas': cas}, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
nouveaux = [i for i in ids if i not in base]; retires = [i for i in base if i not in ids]
print(f'{len(cas)} cas écrits dans {OUT}')
if base: print(f'  nouveaux : {len(nouveaux)} {nouveaux[:10]}\n  retirés : {len(retires)} {retires[:10]}')
if globals().get('n_lettres'): print(f'  ℹ {n_lettres} cas ont la colonne patient_traitements_fiche écrite lettre par lettre (« a, u, c, u, n ») : recomposée automatiquement, à nettoyer dans Excel si tu veux')
for w in warn[:40]: print('  ⚠', w)
if len(warn) > 40: print(f'  ... et {len(warn) - 40} autres avertissements')
