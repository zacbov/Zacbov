import json
from idc_index import IDCClient
c=IDCClient(); S=json.load(open('selection.json'))
uids=sorted({p['img'] for p in S}|{p['seg'] for p in S})
c.download_from_selection(downloadDir='/home/claude/tum/dicom', seriesInstanceUID=uids, dirTemplate='%SeriesInstanceUID', show_progress_bar=False, quiet=True, source_bucket_location='gcs')
print('ok', len(uids))
