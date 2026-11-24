import json, shutil, sys
S = json.load(open('out/series.json')); SD = {r['collection_id']: r for r in json.load(open('segdoi.json'))}
DOI = {'tcga_luad': '10.7937/K9/TCIA.2016.JGNIHEP5', 'tcga_lusc': '10.7937/K9/TCIA.2016.TYGKKFMQ', 'tcga_kirc': '10.7937/K9/TCIA.2016.V6PBVTDR',
       'cptac_pda': '10.7937/K9/TCIA.2018.SC20FO18', 'cptac_ucec': '10.7937/K9/TCIA.2018.3R3JUISW'}
DOI0 = {r['collection_id']: r['doi'] for r in json.load(open('doi.json'))}
NOM = {'tcga_luad': 'TCGA-LUAD', 'tcga_lusc': 'TCGA-LUSC', 'rider_lung_ct': 'RIDER Lung CT', 'c4kc_kits': 'C4KC-KiTS', 'tcga_kirc': 'TCGA-KIRC', 'hcc_tace_seg': 'HCC-TACE-Seg',
       'colorectal_liver_metastases': 'Colorectal-Liver-Metastases', 'advanced_mri_breast_lesions': 'Advanced-MRI-Breast-Lesions', 'prostate_mri_us_biopsy': 'Prostate-MRI-US-Biopsy',
       'upenn_gbm': 'UPENN-GBM', 'cptac_pda': 'CPTAC-PDA', 'cptac_ucec': 'CPTAC-UCEC', 'soft_tissue_sarcoma': 'Soft-tissue-Sarcoma', 'adrenal_acc_ki67_seg': 'Adrenal-ACC-Ki67-Seg',
       'mediastinal_lymph_node_seg': 'Mediastinal-Lymph-Node-SEG', 'eay131': 'NCI-MATCH (EAY131)', 'acrin_6698': 'ACRIN 6698'}
EXAMEN = {'poumon_adk': 'Scanner thoracique', 'poumon_epi': 'Scanner thoracique', 'poumon_cbnpc': 'Scanner thoracique', 'ganglions': 'Scanner thoracique',
          'rein': 'Scanner abdominal', 'rein_ccrcc': 'Scanner abdominal', 'foie_chc': 'Scanner abdominal', 'foie_meta': 'Scanner abdominal', 'pancreas': 'Scanner abdominal',
          'surrenale': 'Scanner abdominal', 'ovaire': 'Scanner abdomino-pelvien', 'colon_rectum': 'Scanner abdomino-pelvien', 'estomac': 'Scanner abdominal', 'vessie': 'Scanner abdomino-pelvien', 'orl': 'Scanner cervical', 'os_rachis': 'Scanner (fenêtre osseuse)', 'sein': 'IRM mammaire', 'prostate': 'IRM prostatique', 'glioblastome': 'IRM cérébrale', 'endometre': 'IRM pelvienne', 'sarcome': 'IRM des parties molles'}
TITRE = {'poumon_cbnpc': 'Cancer bronchique (tumeur primitive)', 'foie_meta': "Métastases hépatiques (ici d'un cancer colorectal)"}
FEN = {'poumon_adk': 'fenêtre pulmonaire', 'poumon_epi': 'fenêtre pulmonaire', 'poumon_cbnpc': 'fenêtre pulmonaire', 'ganglions': 'fenêtre médiastinale'}
out = []
for s in S:
    if s['cat'] == 'col_uterus' or s['id'] in ('poumon_adk-3', 'foie_chc-3', 'prostate-3', 'sein-8'): continue   # écartés à la relecture (lésion de 7 mm, foie entier contouré, coupe oblique)      # contours « Ut- » : utérus entier ou tumeur, ambigu -> écarté
    sd = SD.get(s['coll'], {}); ia = str(sd.get('analysis_result_id') or '').startswith('bamf')
    src = f"Images : collection {NOM[s['coll']]} (The Cancer Imaging Archive, doi:{DOI.get(s['coll'], DOI0.get(s['coll']))}), via NCI Imaging Data Commons, {s['lic']}."
    seg = ("Contour : segmentation automatique (IA) BAMF – AIMI Annotations (doi:10.5281/zenodo.8345959), CC BY 4.0." if ia else
           f"Contour : annotation d'expert de la collection (doi:{sd.get('source_DOI')}), {sd.get('license_short_name')}.")
    s2 = {k: s[k] for k in ('id', 'cat', 'mod', 'sexe', 'age', 'taille', 'cols', 'n', 'max', 'mm_px', 'diam_mm', 'epaisseur', 'tranches')}
    if s['coll'] == 'eay131': seg = "Contour : annotation de la lésion par les radiologues de l'essai NCI-MATCH (doi:" + str(sd.get('source_DOI')) + "), CC BY 4.0. Patient d'un essai de cancérologie avancée : l'histologie exacte de la lésion n'est pas fournie."
    s2.update(titre=TITRE.get(s['cat'], s['titre']), examen=EXAMEN[s['cat']] + (' (' + FEN[s['cat']] + ')' if s['cat'] in FEN else ''), contour_ia=ia, source=src + ' ' + seg)
    out.append(s2); shutil.copy(f"out/{s['id']}.jpg", f"{sys.argv[1]}/{s['id']}.jpg")
json.dump({'_meta': {'note': "Images de patients réels anonymisés (bases publiques), sans lien avec les patients fictifs des cas.", 'version': 1}, 'series': out},
          open(f"{sys.argv[1]}/tumeurs.json", 'w'), ensure_ascii=False, separators=(',', ':'))
print(len(out))
