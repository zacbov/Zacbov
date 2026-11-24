import json, pandas as pd
from idc_index import IDCClient
c=IDCClient(); c.fetch_index('sm_index'); c.fetch_index('sm_instance_index')
import glob as _g; print(_g.glob('/root/.local/share/idc_index_data/*/*sm_inst*')+_g.glob('/usr/local/lib/python3.13/dist-packages/idc_index_data/*sm_inst*'), flush=True)
CAT = {  # catégorie -> (collections, libellé)
 'sein': (['tcga_brca'], "Carcinome mammaire infiltrant"), 'poumon_adk': (['tcga_luad'], "Adénocarcinome pulmonaire"), 'poumon_epi': (['tcga_lusc'], "Carcinome épidermoïde pulmonaire"),
 'rein_ccrcc': (['tcga_kirc'], "Carcinome rénal à cellules claires"), 'rein_papillaire': (['tcga_kirp'], "Carcinome rénal papillaire"), 'foie_chc': (['tcga_lihc'], "Carcinome hépatocellulaire"),
 'prostate': (['tcga_prad'], "Adénocarcinome prostatique"), 'glioblastome': (['tcga_gbm'], "Glioblastome"), 'gliome': (['tcga_lgg'], "Gliome de bas grade"),
 'pancreas': (['tcga_paad'], "Adénocarcinome canalaire du pancréas"), 'endometre': (['tcga_ucec'], "Carcinome de l'endomètre"), 'col_uterus': (['tcga_cesc'], "Carcinome du col utérin"),
 'sarcome': (['tcga_sarc'], "Sarcome des tissus mous"), 'surrenale': (['tcga_acc'], "Corticosurrénalome"), 'ovaire': (['tcga_ov'], "Carcinome séreux de l'ovaire"),
 'colon_rectum': (['tcga_coad', 'tcga_read'], "Adénocarcinome colorectal"), 'estomac': (['tcga_stad'], "Adénocarcinome gastrique"), 'oesophage': (['tcga_esca'], "Carcinome de l'œsophage"),
 'vessie': (['tcga_blca'], "Carcinome urothélial de la vessie"), 'orl': (['tcga_hnsc'], "Carcinome épidermoïde des voies aérodigestives supérieures"), 'thyroide': (['tcga_thca'], "Carcinome papillaire de la thyroïde"),
 'melanome': (['tcga_skcm'], "Mélanome"), 'lymphome': (['tcga_dlbc'], "Lymphome B diffus à grandes cellules"), 'testicule': (['tcga_tgct'], "Tumeur germinale du testicule"),
 'cholangio': (['tcga_chol'], "Cholangiocarcinome"), 'mesotheliome': (['tcga_meso'], "Mésothéliome"), 'thymus': (['tcga_thym'], "Thymome"), 'uveal': (['tcga_uvm'], "Mélanome uvéal"),
}
import duckdb
cand=[]
for cat,(colls,lib) in CAT.items():
    d=c.sql_query(f"""select s.SeriesInstanceUID series, i.StudyInstanceUID study, i.collection_id coll, s.ContainerIdentifier cont, i.license_short_name lic, i.PatientID pid,
      i.series_size_MB mb, i.crdc_series_uuid cu, i.aws_bucket bucket
      from sm_index s join index i using (SeriesInstanceUID) where i.collection_id in ({','.join("'"+x+"'" for x in colls)}) and s.ContainerIdentifier like '%-DX%'
      and i.license_short_name not like '%NC%' and s.max_TotalPixelMatrixColumns between 30000 and 120000 order by i.series_size_MB""")
    d=d.drop_duplicates('pid'); d=d.iloc[len(d)//3:].head(3)
    for r in d.itertuples(): cand.append((cat,lib,r))
    print(cat, len(d), flush=True)
uids=[r.series for _,_,r in cand]
import glob, os
pq=[p for p in glob.glob(os.path.expanduser('~/.local/share/idc_index_data/*/sm_instance_index.parquet'))+glob.glob('/usr/local/lib/python3.13/dist-packages/idc_index_data/sm_instance_index.parquet')][0]
con=duckdb.connect()
lv=con.execute(f"""select SeriesInstanceUID series, SOPInstanceUID sop, TotalPixelMatrixColumns w, TotalPixelMatrixRows h, CAST(ImageType AS VARCHAR) t, crdc_instance_uuid iu, instance_size sz
   from read_parquet('{pq}') where SeriesInstanceUID in ({','.join("'"+u+"'" for u in uids)}) order by w desc""").df()
out=[]
for cat,lib,r in cand:
    vol=lv[(lv.series==r.series) & lv.t.str.contains('VOLUME')]
    if len(vol) < 2: continue
    out.append(dict(cat=cat, nom=lib, study=r.study, series=r.series, coll=r.coll.upper().replace('_','-'), lic=r.lic, cont=r.cont,
                    levels=[dict(sop=x.sop, w=int(x.w), h=int(x.h)) for x in vol.itertuples()][:5],
                    mini=dict(sop=vol.iloc[-1].sop, iu=vol.iloc[-1].iu, sz=int(vol.iloc[-1].sz), w=int(vol.iloc[-1].w), h=int(vol.iloc[-1].h)), cu=r.cu, bucket=r.bucket))
json.dump(out,open('lames_sel.json','w'),indent=1)
print(len(out), sum(o['mini']['sz'] for o in out)/1e6,'Mo pour les vignettes')
