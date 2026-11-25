# Recale une texture de visage (même disposition approximative) sur la disposition UV MetaHuman : TPS repères -> repères
import numpy as np, cv2, sys
from scipy.interpolate import RBFInterpolator
from PIL import Image
src, lms, ref_lm, out = sys.argv[1:5]; N = 2048
A = np.load(ref_lm); Bl = np.load(lms)                    # A : repères dans la référence, Bl : dans l'image à recaler (coordonnées 0..1)
b = np.linspace(0, 1, 9); bord = np.array([[x, y] for x in b for y in b if x in (0, 1) or y in (0, 1)])
# repères du pourtour du visage moins fiables pour la mise en page des oreilles : on garde tout, on ancre les bords
P_ref = np.r_[A, bord]; P_src = np.r_[Bl, bord]
f = RBFInterpolator(P_ref, P_src, kernel='thin_plate_spline', smoothing=1e-5)
g = 256; yy, xx = np.mgrid[0:g, 0:g] / (g - 1); Q = f(np.c_[xx.ravel(), yy.ravel()]).reshape(g, g, 2)
Q = cv2.resize(Q.astype(np.float32), (N, N), interpolation=cv2.INTER_CUBIC)
im = np.array(Image.open(src).convert('RGB')); h, w = im.shape[:2]
res = cv2.remap(im, Q[..., 0] * (w - 1), Q[..., 1] * (h - 1), cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT)
Image.fromarray(res).save(out); print('ok', out, 'déplacement max %.1f px' % (np.abs(Q - np.dstack([cv2.resize(xx.astype(np.float32), (N, N)), cv2.resize(yy.astype(np.float32), (N, N))])).max() * N))
