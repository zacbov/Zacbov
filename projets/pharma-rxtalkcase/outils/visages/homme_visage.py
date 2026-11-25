# Visage de Tice (texture UV) posé sur l'atlas du patient homme (MikeAlger) : TPS repères -> repères, teinte accordée, fondu sur l'ovale du visage
import numpy as np, cv2, sys, subprocess
from PIL import Image
src, src_lm, out = sys.argv[1:4]
X0, Y0, W, H = 0, 0, 1000, 800                       # zone du visage dans l'atlas 2048
atlas = np.array(Image.open('mike.png').convert('RGB')); crop = atlas[Y0:Y0 + H, X0:X0 + W]
subprocess.run(['python3', 'warp.py', src, src_lm, 'mike_face_lm.npy', '/tmp/_w.png'], check=True, capture_output=True)
w = cv2.resize(np.array(Image.open('/tmp/_w.png').convert('RGB')), (W, H), interpolation=cv2.INTER_AREA)
L = np.load('mike_face_lm.npy') * [W, H]
hull = cv2.convexHull(L.astype(np.float32)).astype(np.int32)
m = np.zeros((H, W), np.float32); cv2.fillConvexPoly(m, hull, 1)
m = cv2.erode(m, np.ones((15, 15))); m = cv2.GaussianBlur(m, (0, 0), 14)
# teinte : moyenne / écart de la peau du visage source vers celle du visage d'origine (Lab, sur le masque)
la, lb = cv2.cvtColor(w, cv2.COLOR_RGB2LAB).astype(np.float32), cv2.cvtColor(crop, cv2.COLOR_RGB2LAB).astype(np.float32)
k = m > 0.6
for c, f in ((0, 0.7), (1, 1), (2, 1)):
    sm, ss, rm, rs = la[..., c][k].mean(), la[..., c][k].std(), lb[..., c][k].mean(), lb[..., c][k].std()
    la[..., c] = (la[..., c] - sm) * (1 + f * (min(1.2, rs / ss) - 1)) + sm + f * (rm - sm)
w2 = cv2.cvtColor(np.clip(la, 0, 255).astype(np.uint8), cv2.COLOR_LAB2RGB).astype(np.float32)
# barbe d'origine hors de l'ovale (mâchoire, cou) : poils sombres retirés par retouche (inpainting), sous le niveau du nez
lab0 = cv2.cvtColor(crop, cv2.COLOR_RGB2LAB).astype(np.float32); peauL = np.median(lab0[..., 0][k])
yy = np.mgrid[0:H, 0:W][0]; nezY = L[1, 1]
big = np.zeros((H, W), np.uint8); cv2.fillConvexPoly(big, cv2.convexHull((L + (L - L.mean(0)) * 0.35).astype(np.float32)).astype(np.int32), 1)
barbe = ((big > 0) & (yy > nezY) & (lab0[..., 0] < peauL - 18)).astype(np.uint8)
barbe = cv2.dilate(barbe, np.ones((9, 9)))
crop = cv2.inpaint(crop, barbe, 9, cv2.INPAINT_TELEA)
crop = (crop.astype(np.float32) * 0 + cv2.GaussianBlur(crop, (0, 0), 2).astype(np.float32) * barbe[..., None] + crop.astype(np.float32) * (1 - barbe[..., None]))
GRIS = len(sys.argv) > 4 and sys.argv[4] == 'gris'
if GRIS:                                                   # cheveux peints dans la peau (tempes, nuque) : gris
    ch = np.clip((peauL - 12 - lab0[..., 0]) / 25, 0, 1) * np.clip((nezY + 40 - yy) / 80, 0, 1) * (m < 0.5) * (lab0[..., 1] < 150); ch = cv2.GaussianBlur(ch.astype(np.float32), (0, 0), 2)[..., None]
    g = crop.mean(2, keepdims=True) * 1.3 + 30; crop = crop * (1 - ch) + np.clip(g, 0, 235) * ch
res = atlas.astype(np.float32).copy(); res[Y0:Y0 + H, X0:X0 + W] = w2 * m[..., None] + crop * (1 - m[..., None])
Image.fromarray(np.clip(res,0,255).astype(np.uint8)).save(out, quality=92)
Image.fromarray(np.clip(res[Y0:Y0 + H, X0:X0 + W],0,255).astype(np.uint8)).resize((500, 400)).save(out.replace('.jpg', '_apercu.jpg'))
#:Y0 + H, X0:X0 + W].astype(np.uint8)).resize((500, 400)).save(out.replace('.jpg', '_apercu.jpg'))
print('ok', out)
