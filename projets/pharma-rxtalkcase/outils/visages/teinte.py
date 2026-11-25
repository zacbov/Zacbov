# Teinte d'un visage recalé rapprochée de la texture d'origine (Lab, peau seulement), puis mélange léger avec l'original
import numpy as np, cv2, sys
from PIL import Image
src, ref, out, k = sys.argv[1], sys.argv[2], sys.argv[3], float(sys.argv[4]) if len(sys.argv) > 4 else 0.75
S = np.array(Image.open(src).convert('RGB')); R = np.array(Image.open(ref).convert('RGB').resize(S.shape[1::-1]))
Ls, Lr = cv2.cvtColor(S, cv2.COLOR_RGB2LAB).astype(np.float32), cv2.cvtColor(R, cv2.COLOR_RGB2LAB).astype(np.float32)
h, w = S.shape[:2]; yy, xx = np.mgrid[0:h, 0:w] / h
zone = (np.hypot((xx - 0.5) / 0.28, (yy - 0.55) / 0.3) < 1)               # ovale du visage (joues, front, menton) : sans cheveux ni fond
def peau(L): a, b = L[..., 1] - 128, L[..., 2] - 128; return zone & (a > 2) & (b > 4) & (L[..., 0] > 60)
ms, mr = peau(Ls), peau(Lr)
o = Ls.copy()
for c, f in ((0, 0.6), (1, 1.0), (2, 1.0)):                               # luminance : 60 % de la correction ; couleur : entière
    s_m, s_s, r_m, r_s = Ls[..., c][ms].mean(), Ls[..., c][ms].std(), Lr[..., c][mr].mean(), Lr[..., c][mr].std()
    t = (Ls[..., c] - s_m) * (1 + f * (min(1.2, r_s / max(s_s, 1e-3)) - 1)) + s_m + f * (r_m - s_m); o[..., c] = t
print(src, 'peau  L a b : %.0f %.0f %.0f -> %.0f %.0f %.0f' % tuple([Ls[..., c][ms].mean() for c in range(3)] + [o[..., c][ms].mean() for c in range(3)]))
O = cv2.cvtColor(np.clip(o, 0, 255).astype(np.uint8), cv2.COLOR_LAB2RGB).astype(np.float32)
O = O * k + R.astype(np.float32) * (1 - k)                                 # « légère transparence » : un peu du visage d'origine
Image.fromarray(np.clip(O, 0, 255).astype(np.uint8)).save(out, quality=90)
