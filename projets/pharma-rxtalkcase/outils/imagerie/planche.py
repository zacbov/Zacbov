import json, sys
from PIL import Image, ImageDraw, ImageFont
D=sys.argv[1]; C=json.load(open(D+'/series.json'))
T=384; W=6; out=Image.new('RGB',(W*T, -(-len(C)//W)*T),'black'); dr=ImageDraw.Draw(out)
for k,s in enumerate(C):
    im=Image.open(f"{D}/{s['id']}.jpg"); j=s['max']; x0=(j%s['cols'])*T; y0=(j//s['cols'])*T
    t=im.crop((x0,y0,x0+T,y0+T)).convert('RGB'); d=ImageDraw.Draw(t)
    for cls,col in (('oedeme',(255,220,0)),('tumeur',(255,40,40))):
        for poly in s['tranches'][j].get(cls,[]): d.line([tuple(p) for p in poly]+[tuple(poly[0])],fill=col,width=2)
    d.text((5,5),f"{s['id']} {s['diam_mm']}mm",fill=(0,255,0))
    out.paste(t,((k%W)*T,(k//W)*T))
out.save(sys.argv[2],quality=80)
