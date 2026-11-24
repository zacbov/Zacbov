import pandas as pd, json, re
from idc_index import IDCClient
c=IDCClient(); [c.fetch_index(t) for t in ('rtstruct_index','seg_index')]
deja={p['pid'] for p in json.load(open('selection_tout.json'))}
q=c.sql_query("""select s.SeriesInstanceUID seg, s.ROINames r, i.PatientID pid, i.PatientSex sx, i.PatientAge age, i.Modality m, i.SeriesDescription d, i.SeriesInstanceUID img,
  i.instanceCount n, i.series_size_MB mb, i.license_short_name lic, i.StudyInstanceUID st
  from rtstruct_index s join index i on s.referenced_SeriesInstanceUID=i.SeriesInstanceUID where i.collection_id='eay131' and i.Modality='CT'""")
CAT=[('ovaire', r'(LT |RT )?(OVARY|ADNEXA)$', "Masse ovarienne (lésion tumorale annotée)", 'abdomen', 'F'),
     ('colon_rectum', r'(COLON|SIGMOID|RECTUM)$', "Tumeur colorectale (lésion annotée)", 'abdomen', None),
     ('estomac', r'STOMACH$', "Tumeur gastrique (lésion annotée)", 'abdomen', None),
     ('vessie', r'(URINARY )?BLADDER$', "Tumeur de la vessie (lésion annotée)", 'abdomen', None),
     ('orl', r'(NASOPHARYNX|PHARYNX|LT NECK|RT NECK|NECK)$', "Tumeur cervicale ORL (lésion annotée)", 'mediastin', None),
     ('os_rachis', r'SPINE$', "Lésion osseuse tumorale du rachis", 'os', None)]
out=[]
for cat, rx, lib, fen, sexe in CAT:
    R=re.compile(r'^\d+ - '+rx.replace('$','')+r' - \d+$')
    d=q[q.r.apply(lambda L: any(R.match(x) for x in L)) & q.n.between(40,260) & ~q.pid.isin(deja)].drop_duplicates('pid').sort_values('mb')
    if sexe: d=d[d.sx==sexe]
    pick=[]
    for sx in ['M','F',None]:
        for r in d.itertuples():
            if len(pick)>=2: break
            if r.pid in [p['pid'] for p in pick] or (sx and r.sx!=sx): continue
            pick.append(dict(cat=cat, coll='eay131', lib=lib, fen=fen, pid=r.pid, sx=None if pd.isna(r.sx) else r.sx, age=None if pd.isna(r.age) else r.age, m=r.m, desc=None if pd.isna(r.d) else r.d,
                 n=int(r.n), mb=round(float(r.mb),1), lic=r.lic, img=r.img, seg=r.seg, kind='RT', roi=str(list(r.r)), st=r.st, roi_re=R.pattern)); break
    print(cat, len(d), [(p['pid'],p['sx'],p['n']) for p in pick]); out+=pick
# sein : IRM de diffusion ACRIN 6698 (tumeur segmentée)
s=c.sql_query("""select s.SeriesInstanceUID seg, i.PatientID pid, i.PatientSex sx, i.PatientAge age, i.Modality m, i.SeriesDescription d, i.SeriesInstanceUID img, i.instanceCount n, i.series_size_MB mb, i.license_short_name lic, i.StudyInstanceUID st
 from seg_index s join index i on s.segmented_SeriesInstanceUID=i.SeriesInstanceUID where i.collection_id='acrin_6698' and i.instanceCount between 20 and 400 order by i.series_size_MB""")
s=s[~s.pid.isin(deja)].drop_duplicates('pid')
for r in list(s.itertuples())[len(s)//2: len(s)//2+3]:
    out.append(dict(cat='sein', coll='acrin_6698', lib="Cancer du sein (IRM de diffusion)", fen='irm', pid=r.pid, sx='F', age=None if pd.isna(r.age) else r.age, m=r.m, desc=r.d, n=int(r.n), mb=round(float(r.mb),1), lic=r.lic, img=r.img, seg=r.seg, kind='SEG', roi='[DWI Tumor]', st=r.st))
print('sein', [(p['pid'],p['n'],p['desc']) for p in out if p['cat']=='sein'])
json.dump(out,open('selection3.json','w'),ensure_ascii=False,indent=1)
uids=sorted({p['img'] for p in out}|{p['seg'] for p in out})
c.download_from_selection(downloadDir='/home/claude/tum/dicom', seriesInstanceUID=uids, dirTemplate='%SeriesInstanceUID', show_progress_bar=False, quiet=True, source_bucket_location='gcs')
print('ok', len(uids))
