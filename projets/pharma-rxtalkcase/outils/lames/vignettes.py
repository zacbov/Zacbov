import json, urllib.request, os, io, sys
import numpy as np, pydicom
from PIL import Image
from concurrent.futures import ThreadPoolExecutor
L=json.load(open('lames_sel.json')); os.makedirs('dcm',exist_ok=True); os.makedirs('jpg',exist_ok=True)
def get(l):
    p=f"dcm/{l['mini']['iu']}.dcm"
    if not os.path.exists(p): urllib.request.urlretrieve(f"https://storage.googleapis.com/{l['bucket']}/{l['cu']}/{l['mini']['iu']}.dcm", p)
    return p
with ThreadPoolExecutor(8) as ex: paths=list(ex.map(get,L))
for i,(l,p) in enumerate(zip(L,paths)):
    ds=pydicom.dcmread(p); W,H=int(ds.TotalPixelMatrixColumns),int(ds.TotalPixelMatrixRows); tw,th=int(ds.Columns),int(ds.Rows)
    img=Image.new('RGB',(W,H),'white'); cols=-(-W//tw)
    frames=pydicom.encaps.generate_frames(ds.PixelData, number_of_frames=int(getattr(ds,'NumberOfFrames',1))) if ds.file_meta.TransferSyntaxUID.is_compressed else None
    if frames is not None:
        for k,fr in enumerate(frames):
            t=Image.open(io.BytesIO(fr)).convert('RGB'); img.paste(t,((k%cols)*tw,(k//cols)*th))
    else:
        arr=ds.pixel_array
        if arr.ndim==3: arr=arr[None]
        for k,a in enumerate(arr): img.paste(Image.fromarray(a),((k%cols)*tw,(k//cols)*th))
    img=img.crop((0,0,W,H)); img.thumbnail((1600,1600))
    l['id']=f"{l['cat']}-{sum(1 for x in L[:i] if x['cat']==l['cat'])+1}"
    img.save(f"jpg/{l['id']}.jpg",quality=82,optimize=True,progressive=True)
    print(l['id'], W,H, os.path.getsize(f"jpg/{l['id']}.jpg")//1024,'Ko', flush=True)
json.dump(L,open('lames_sel.json','w'),indent=1)
