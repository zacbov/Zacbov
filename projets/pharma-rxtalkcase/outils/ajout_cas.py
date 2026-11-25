# Ajoute (ou remplace) des cas au format JSON de l'outil dans le classeur, avec les mêmes conventions que cas-xlsx.js.
import openpyxl, json, sys
src, js, out = sys.argv[1:4]
CAS = json.load(open(js))['cas']; ids = {c['id'] for c in CAS}
wb = openpyxl.load_workbook(src)
def hdr(ws): return {c.value: i + 1 for i, c in enumerate(ws[1])}
def purge(ws, col=1):
    for r in range(ws.max_row, 1, -1):
        if ws.cell(r, col).value in ids: ws.delete_rows(r)
TH = {r[0]: r[1] for r in wb['Cas_Cliniques'].iter_rows(min_row=2, max_col=3, values_only=True) if r[0]}
lib_theme = {}
for r in wb['Cas_Cliniques'].iter_rows(min_row=2, values_only=True):
    if r[1]: lib_theme[r[1]] = r[2]
POPLIB = {'officine': 'Officine', 'hospitalier': 'Hospitalier', 'medecine': 'Médecine', 'industrie_recherche': 'Industrie et recherche'}
wc, wq, wd, wm = (wb[n] for n in ('Cas_Cliniques', 'Questions_Reponses', 'Documents_Examens', 'Medicaments_Interactions'))
for ws in (wc, wq, wd, wm): purge(ws)
H, HQ, HD, HM = hdr(wc), hdr(wq), hdr(wd), hdr(wm)
def put(ws, Hh, row, **kv):
    for k, v in kv.items():
        if v is not None and v != '' and v != []: ws.cell(row, Hh[k], v)
for c in CAS:
    r = wc.max_row + 1; f = c['fiche']; p = c.get('patient') or {}; z = p.get('zone') or {}; k = c.get('constantes') or {}
    put(wc, H, r, id=c['id'], theme_id=c['theme'], theme_libelle=c.get('theme_libelle') or lib_theme.get(c['theme'], c['theme']), pop_id=c['pop'], pop_libelle=POPLIB.get(c['pop'], c['pop']), pop_origine=c.get('pop_origine'),
        metier=c.get('metier'), a_valider=c.get('a_valider'), apercu=c['apercu'], enonce=c['enonce'], patient_sexe=f.get('sexe'), patient_age=f.get('age'), patient_age_unite=f.get('age_unite'),
        patient_poids_kg=f.get('poids_kg'), patient_taille_cm=f.get('taille_cm'), patient_allergies=f.get('allergies'), patient_traitements_fiche=' ; '.join(f.get('traitements') or []) or None,
        fiche_origine=f.get('origine'), avatar_plainte=p.get('plainte'), avatar_emotion=p.get('emotion'), avatar_profil=p.get('profil') or None, avatar_zone_partie=z.get('partie'), avatar_zone_cote=z.get('cote'),
        constantes_pas=k.get('pas'), constantes_pad=k.get('pad'), constantes_pouls=k.get('pouls'),
        alertes_conseils='\n'.join(f"Si [{a['si']}] -> {a['rappel']}" for a in c.get('alertes_conseils') or []) or None,
        nb_questions=len(c['questions']), questions_liste='\n'.join(q['question'] for q in c['questions']), nb_documents=len(c['documents']), specialites=' | '.join(c.get('specialites') or []) or None, reponses_modele_liste='\n'.join(f"R{i}: {q['reponse_modele']}" for i, q in enumerate(c['questions'], 1))[:32000],
        documents_types=', '.join(d['type'] for d in c['documents']), documents_titres=', '.join(d.get('titre', '') for d in c['documents']),
        indices_documents_possibles=', '.join(c['indices']['documents_possibles']), indices_valeurs_chiffrees=c['indices']['valeurs_chiffrees'],
        indices_traitement_nomme=c['indices']['traitement_nomme'], indices_question_verif_traitement=c['indices']['question_verification_traitement'],
        nb_medicaments=len(c['connaissances']['medicaments']), medicaments_detectes=', '.join(m['terme'] for m in c['connaissances']['medicaments']),
        nb_interactions=len(c['connaissances']['interactions']), connaissances_origine=c['connaissances']['origine'],
        sources_annales=' ; '.join(f"{s['fichier']}: " + ' | '.join(s['ids']) for s in c['sources']), actif=bool(c.get('actif', True)),
        avatar_symptomes=' | '.join(p.get('symptomes') or []) or None)
    if c['indices']['traitement_nomme'] is False: wc.cell(r, H['indices_traitement_nomme'], False)
    if c.get('a_valider') is False: wc.cell(r, H['a_valider'], False)
    for i, q in enumerate(c['questions'], 1):
        rq = wq.max_row + 1; put(wq, HQ, rq, cas_id=c['id'], theme_id=c['theme'], pop_id=c['pop'], question_ordre=i, question_numero=q['n'], question_type=q['type'], question=q['question'], reponse_modele=q['reponse_modele'])
    for n, d in enumerate(c['documents'], 1):
        for j, l in enumerate(d.get('lignes') or [None], 1):
            rd = wd.max_row + 1; base = dict(cas_id=c['id'], theme_id=c['theme'], doc_num=n, doc_type=d['type'], doc_titre=d.get('titre'), doc_origine=d.get('origine'), ligne_num=j)
            if d['type'] == 'bilan': put(wd, HD, rd, **base, echantillon=l['ech'], analyse_ou_medicament=l['analyse'], resultat_ou_posologie=l['resultat'], unite_ou_duree=l['unite'], valeurs_ref=l['ref'])
            elif d['type'] == 'compte_rendu':
                if j == 1: put(wd, HD, rd, **base, texte_ou_details='texte: ' + d['texte'] + (' ; libre: oui' if d.get('libre') else ''))
            elif d['type'] == 'tableau':
                put(wd, HD, rd, **base, analyse_ou_medicament=d.get('sous_titre') if j == 1 else None, unite_ou_duree=('libre: oui' if d.get('libre') and j == 1 else None),
                    texte_ou_details=' | '.join(f"{c}: {v}" for c, v in zip(d['colonnes'], l)))
            elif d['type'] == 'ordonnance':
                put(wd, HD, rd, **base, analyse_ou_medicament=l['medicament'], resultat_ou_posologie=l['posologie'], unite_ou_duree=l['duree'],
                    texte_ou_details=(' ; '.join(f"{k}: {d[k]}" for k in ('medecin', 'patient', 'date') if d.get(k)) + (' ; libre: oui' if d.get('libre') else '')).strip(' ;') or None if j == 1 else None)
    for m in c['connaissances']['medicaments']:
        rm = wm.max_row + 1; put(wm, HM, rm, cas_id=c['id'], theme_id=c['theme'], categorie='Médicament détecté', terme_ou_couple=m['terme'], substances_ou_rubrique=', '.join(m['substances']), origine=c['connaissances']['origine'])
    for i in c['connaissances']['interactions']:
        rm = wm.max_row + 1; put(wm, HM, rm, cas_id=c['id'], theme_id=c['theme'], categorie='Interaction', terme_ou_couple=' + '.join(i['entre']), substances_ou_rubrique=i['rubrique'] or None,
                                 niveau_interaction=', '.join(i['niveau']), mecanisme=i['mecanisme'], conduite_a_tenir=i['conduite'], origine=c['connaissances']['origine'])
L = openpyxl.utils.get_column_letter; wc.auto_filter.ref = f"A1:{L(wc.max_column)}{wc.max_row}"
wb.save(out); print('ajoutés', len(CAS), '; lignes cas', wc.max_row - 1)
