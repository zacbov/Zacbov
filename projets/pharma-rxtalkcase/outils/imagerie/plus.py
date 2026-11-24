import pandas as pd, json
from idc_index import IDCClient
c=IDCClient()
q=pd.read_pickle('cand.pkl'); S=json.load(open('selection.json')); deja={p['pid'] for p in S}
u=q.seg.unique().tolist()
sz=c.sql_query("select SeriesInstanceUID seg, series_size_MB segmb from index where SeriesInstanceUID in (%s)"%','.join("'"+x+"'" for x in u))
q=q.merge(sz,on='seg'); q['roi']=q.roi.astype(str)
add=[]
def prendre(cat,coll,f,lib,fen,k):
    d=q[(q.coll==coll)]; d=d[f(d)&~d.pid.isin(deja)].sort_values('segmb',ascending=False).drop_duplicates('pid')
    d=d.iloc[2:2+k]   # pas les 2 plus gros (souvent extrêmes)
    for r in d.itertuples():
        add.append(dict(cat=cat, coll=coll, lib=lib, fen=fen, pid=r.pid, sx=None if pd.isna(r.sx) else r.sx, age=None if pd.isna(r.age) else r.age, m=r.m, desc=None if pd.isna(r.d) else r.d, n=int(r.n), mb=round(float(r.mb),1), lic=r.lic, img=r.img, seg=r.seg, kind=r.kind, roi=r.roi, st=r.st))
    print(cat, [(r.pid, r.sx, round(r.segmb,2)) for r in d.itertuples()])
prendre('sein','advanced_mri_breast_lesions',lambda d: d.m.eq('MR'),"Cancer du sein (IRM)",'irm',4)
prendre('poumon_adk','tcga_luad',lambda d: d.m.eq('CT') & d.roi.str.contains('Nodule'),"Adénocarcinome pulmonaire",'poumon',2)
prendre('prostate','prostate_mri_us_biopsy',lambda d: d.roi.eq('[Lesion]') & d.d.str.contains('T2', case=False, na=False) & d.n.between(24, 60),"Cancer de la prostate (IRM T2)",'irm',2)
prendre('ganglions','mediastinal_lymph_node_seg',lambda d: d.n.between(40,150),"Adénopathies médiastinales",'mediastin',2)
prendre('foie_chc','hcc_tace_seg',lambda d: d.roi.str.contains('Mass') & d.n.between(40,150),"Carcinome hépatocellulaire",'foie',1)
json.dump(add,open('selection2.json','w'),ensure_ascii=False,indent=1)
uids=sorted({p['img'] for p in add}|{p['seg'] for p in add})
c.download_from_selection(downloadDir='/home/claude/tum/dicom', seriesInstanceUID=uids, dirTemplate='%SeriesInstanceUID', show_progress_bar=False, quiet=True, source_bucket_location='gcs')
print('ok',len(uids))
