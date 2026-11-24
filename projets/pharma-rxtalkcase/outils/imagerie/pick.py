import pandas as pd, json, re
q=pd.read_pickle('cand.pkl')
# catégorie : (collection, filtre, libellé, organe, fenêtre)
R = [
 ('poumon_adk', 'tcga_luad', lambda d: d.m.eq('CT') & d.roi.str.contains('Nodule'), "Adénocarcinome pulmonaire", 'poumon'),
 ('poumon_epi', 'tcga_lusc', lambda d: d.m.eq('CT') & d.roi.str.contains('Nodule'), "Carcinome épidermoïde pulmonaire", 'poumon'),
 ('poumon_cbnpc', 'rider_lung_ct', lambda d: d.m.eq('CT') & d.roi.str.contains('Neoplasm'), "Cancer bronchique non à petites cellules", 'poumon'),
 ('rein', 'c4kc_kits', lambda d: d.roi.str.contains('Mass') & d.n.between(40, 150), "Cancer du rein", 'abdomen'),
 ('rein_ccrcc', 'tcga_kirc', lambda d: d.roi.str.contains('Mass') & d.n.between(25, 150), "Carcinome rénal à cellules claires", 'abdomen'),
 ('foie_chc', 'hcc_tace_seg', lambda d: d.roi.str.contains('Mass') & d.n.between(40, 150), "Carcinome hépatocellulaire", 'foie'),
 ('foie_meta', 'colorectal_liver_metastases', lambda d: d.roi.eq('[Liver, Mass]') & d.n.between(40, 150), "Métastases hépatiques d'un cancer colorectal", 'foie'),
 ('sein', 'advanced_mri_breast_lesions', lambda d: d.m.eq('MR'), "Cancer du sein (IRM)", 'irm'),
 ('prostate', 'prostate_mri_us_biopsy', lambda d: d.roi.eq('[Lesion]') & d.d.str.contains('T2', case=False, na=False) & d.n.between(24, 60), "Cancer de la prostate (IRM T2)", 'irm'),
 ('glioblastome', 'upenn_gbm', lambda d: d.d.str.contains('stealth-post', case=False, na=False) & ~d.d.str.contains('TERA', na=False), "Glioblastome (IRM T1 injectée)", 'irm'),
 ('pancreas', 'cptac_pda', lambda d: d.m.eq('CT') & d.roi.eq('[PANCREAS - 1]') & d.n.between(60, 230), "Adénocarcinome du pancréas", 'abdomen'),
 ('endometre', 'cptac_ucec', lambda d: d.m.eq('MR') & d.roi.eq('[UTERUS - 1]'), "Cancer de l'endomètre (IRM)", 'irm'),
 ('col_uterus', 'cc_tumor_heterogeneity', lambda d: d.m.eq('MR') & d.d.str.contains('SAG', case=False, na=False) & d.roi.str.contains('Sag'), "Cancer du col de l'utérus (IRM T2)", 'irm'),
 ('sarcome', 'soft_tissue_sarcoma', lambda d: d.m.eq('MR') & d.d.str.contains('T1toPET', na=False) & d.roi.str.contains('GTV_Mass'), "Sarcome des tissus mous (IRM)", 'irm'),
 ('surrenale', 'adrenal_acc_ki67_seg', lambda d: d.roi.str.contains('Mass') & d.n.between(40, 150), "Corticosurrénalome (carcinome de la surrénale)", 'abdomen'),
 ('ganglions', 'mediastinal_lymph_node_seg', lambda d: d.n.between(40, 150), "Adénopathies médiastinales", 'mediastin'),
]
out=[]
for cat, coll, f, lib, fen in R:
    d=q[q.coll==coll].copy(); d['roi']=d.roi.astype(str); d=d[f(d)].drop_duplicates('img')
    d=d.sort_values('mb'); pick=[]
    # deux patients, sexes différents si possible, tailles médianes
    mid=d.iloc[len(d)//3: 2*len(d)//3+1] if len(d)>6 else d
    for sx in ['M','F',None]:
        for r in mid.itertuples():
            if len(pick)>=2: break
            if r.pid in [p['pid'] for p in pick]: continue
            if sx and r.sx!=sx: continue
            pick.append(dict(cat=cat, coll=coll, lib=lib, fen=fen, pid=r.pid, sx=None if pd.isna(r.sx) else r.sx, age=None if pd.isna(r.age) else r.age, m=r.m, desc=None if pd.isna(r.d) else r.d, n=int(r.n), mb=round(float(r.mb),1), lic=r.lic, img=r.img, seg=r.seg, kind=r.kind, roi=r.roi, st=r.st))
            if sx: break
    print(f"{cat:13} {len(d):4} -> " + ' | '.join(f"{p['pid']} {p['sx']} {p['m']} n{p['n']} {p['mb']}Mo" for p in pick))
    out+=pick
json.dump(out, open('selection.json','w'), ensure_ascii=False, indent=1)
print(len(out), sum(p['mb'] for p in out))
