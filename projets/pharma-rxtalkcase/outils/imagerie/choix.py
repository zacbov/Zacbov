from idc_index import IDCClient
import pandas as pd, json
pd.set_option('display.width',250); pd.set_option('display.max_colwidth',40); pd.set_option('display.max_rows',500)
c=IDCClient(); [c.fetch_index(t) for t in ('seg_index','rtstruct_index')]
SEG = ['rider_lung_ct','tcga_luad','tcga_lusc','c4kc_kits','tcga_kirc','hcc_tace_seg','colorectal_liver_metastases','advanced_mri_breast_lesions','prostate_mri_us_biopsy','upenn_gbm','adrenal_acc_ki67_seg','mediastinal_lymph_node_seg']
RT = ['cptac_pda','cptac_ucec','soft_tissue_sarcoma','cc_tumor_heterogeneity']
q1=c.sql_query(f"""SELECT i.collection_id coll, i.PatientID pid, i.PatientSex sx, i.PatientAge age, i.Modality m, i.SeriesDescription d, i.instanceCount n, i.series_size_MB mb, i.license_short_name lic,
  i.SeriesInstanceUID img, s.SeriesInstanceUID seg, 'SEG' kind, CAST(s.SegmentedPropertyType_CodeMeanings AS VARCHAR) roi, i.StudyInstanceUID st
FROM seg_index s JOIN index i ON s.segmented_SeriesInstanceUID=i.SeriesInstanceUID
WHERE i.collection_id IN ({','.join("'"+x+"'" for x in SEG)}) AND i.Modality IN ('CT','MR') AND i.license_short_name NOT LIKE '%NC%'""")
q2=c.sql_query(f"""SELECT i.collection_id coll, i.PatientID pid, i.PatientSex sx, i.PatientAge age, i.Modality m, i.SeriesDescription d, i.instanceCount n, i.series_size_MB mb, i.license_short_name lic,
  i.SeriesInstanceUID img, s.SeriesInstanceUID seg, 'RT' kind, CAST(s.ROINames AS VARCHAR) roi, i.StudyInstanceUID st
FROM rtstruct_index s JOIN index i ON s.referenced_SeriesInstanceUID=i.SeriesInstanceUID
WHERE i.collection_id IN ({','.join("'"+x+"'" for x in RT)}) AND i.Modality IN ('CT','MR') AND i.license_short_name NOT LIKE '%NC%'""")
q=pd.concat([q1,q2]); q.to_pickle('cand.pkl')
g=q.groupby('coll').agg(n=('img','nunique'),mbmed=('mb','median'),sx=('sx',lambda s:''.join(sorted(set(map(str,s))))),lic=('lic','first'))
print(g)
for coll in q.coll.unique():
    d=q[q.coll==coll].sort_values('mb').head(4)
    print(coll); print(d[['pid','sx','age','m','d','n','mb','roi']].to_string(index=False))
