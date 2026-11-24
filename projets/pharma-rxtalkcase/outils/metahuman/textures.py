# Textures web d'Amanda : brassière peinte retirée (corps), sourcils peints (tête), réductions.
# usage : python3 textures.py <dossier DCC> <pkl> <sortie>
import sys, os, numpy as np, cv2, pickle
from PIL import Image
SRC, PKL, OUT = sys.argv[1].rstrip('/') + '/Maps/', sys.argv[2], sys.argv[3]
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(7)

# ---------- sous-vêtements gris peints (corps, et bretelles au bas de la texture de la tête) -> peau
def depaint(bc, nm, box, label):
    Hh, Ww = bc.shape[:2]; r, g, b = bc[..., 0], bc[..., 1], bc[..., 2]
    grey = (np.abs(r - g) < 14) & (np.abs(g - b) < 14) & (r < 215)
    mask = (grey & box).astype(np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8)); mask = cv2.dilate(mask, np.ones((13, 13), np.uint8))
    print(label, ': %.1f %% de la texture repeinte' % (100 * mask.mean()))
    small = cv2.resize(bc.astype(np.uint8), (Ww // 4, Hh // 4), interpolation=cv2.INTER_AREA)
    msmall = cv2.resize(mask, (Ww // 4, Hh // 4), interpolation=cv2.INTER_NEAREST)
    fill = cv2.resize(cv2.inpaint(small, msmall, 12, cv2.INPAINT_TELEA), (Ww, Hh), interpolation=cv2.INTER_CUBIC).astype(np.float32)
    std = bc[(mask == 0) & ~grey].std(0) * 0.35
    grain = cv2.GaussianBlur(rng.normal(0, 1, (Hh, Ww)).astype(np.float32), (0, 0), 1.2)[..., None] * std
    soft = cv2.GaussianBlur(mask.astype(np.float32), (0, 0), 4)[..., None]
    out = bc * (1 - soft) + (fill + grain) * soft
    if nm is not None:
        nm = cv2.resize(nm, (Ww, Hh)) * (1 - soft) + np.array([128, 128, 255], np.float32) * soft
    return out, nm
bc = np.array(Image.open(SRC + 'Body_Basecolor.png').convert('RGB')).astype(np.float32)
nm = np.array(Image.open(SRC + 'Body_Normal.png').convert('RGB')).astype(np.float32)
out, nm = depaint(bc, nm, np.ones(bc.shape[:2], bool), 'corps')
Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)).save(OUT + 'corps.png')
Image.fromarray(np.clip(nm, 0, 255).astype(np.uint8)).resize((1024, 1024), Image.LANCZOS).save(OUT + 'corps_n.png')

# ---------- tête : sourcils peints d'après la position 3D de chaque texel
res = pickle.load(open(PKL, 'rb')); d = res['meshes']['head']
P = d['P'].astype(np.float64) * 0.01; P = np.c_[P[:, 0], -P[:, 2], P[:, 1]]           # repère Blender (m)
U, LP, LT = d['U'], d['LP'], d['LT']
eyes = {}
for i, n in enumerate(res['joint_names']):
    if n in ('FACIAL_L_Eye', 'FACIAL_R_Eye'):
        w = res['joint_world0'][i][:3, 3] * 0.01; eyes[n[7]] = np.array([w[0], -w[2], w[1]])
hc = np.array(Image.open(SRC + 'Head_Basecolor.png').convert('RGB')).astype(np.float32)
hbox = np.zeros(hc.shape[:2], bool); hbox[int(.78 * hc.shape[0]):] = True
hn = np.array(Image.open(SRC + 'Head_Normal.png').convert('RGB')).astype(np.float32)
hc, hn = depaint(hc, hn, hbox, 'tête')
T = hc.shape[0]
pos = np.zeros((T, T, 3), np.float32); cov = np.zeros((T, T), bool)
SD = np.load(OUT + 'scalp_dist.npy') if os.path.exists(OUT + 'scalp_dist.npy') else None; sdt = np.full((T, T), 9, np.float32)
for f in d['F']:                                                       # rastérisation UV -> position 3D
    for a, bq, c in [(0, k, k + 1) for k in range(1, len(f) - 1)]:
        ia, ib, ic = f[a], f[bq], f[c]
        uv = np.array([U[LT[ia]], U[LT[ib]], U[LT[ic]]]) * [T, T]; uv[:, 1] = T - uv[:, 1]
        p3 = np.array([P[LP[ia]], P[LP[ib]], P[LP[ic]]])
        x0, y0 = np.floor(uv.min(0)).astype(int); x1, y1 = np.ceil(uv.max(0)).astype(int)
        if x1 - x0 > 200 or y1 - y0 > 200: continue
        xs, ys = np.meshgrid(np.arange(max(x0, 0), min(x1 + 1, T)), np.arange(max(y0, 0), min(y1 + 1, T)))
        if xs.size == 0: continue
        px = np.stack([xs.ravel() + .5, ys.ravel() + .5], 1)
        v0, v1 = uv[1] - uv[0], uv[2] - uv[0]; den = v0[0] * v1[1] - v1[0] * v0[1]
        if abs(den) < 1e-9: continue
        q = px - uv[0]; l1 = (q[:, 0] * v1[1] - v1[0] * q[:, 1]) / den; l2 = (v0[0] * q[:, 1] - q[:, 0] * v0[1]) / den; l0 = 1 - l1 - l2
        ok = (l0 >= -.01) & (l1 >= -.01) & (l2 >= -.01)
        if not ok.any(): continue
        xx, yy = xs.ravel()[ok], ys.ravel()[ok]
        pos[yy, xx] = l0[ok, None] * p3[0] + l1[ok, None] * p3[1] + l2[ok, None] * p3[2]; cov[yy, xx] = True
        if SD is not None: sdt[yy, xx] = l0[ok] * SD[LP[ia]] + l1[ok] * SD[LP[ib]] + l2[ok] * SD[LP[ic]]
print('texels couverts %.0f %%' % (100 * cov.mean()))
alpha = np.zeros((T, T), np.float32)
X, Y, Z = pos[..., 0], pos[..., 1], pos[..., 2]
def sm(t): t = np.clip(t, 0, 1); return t * t * (3 - 2 * t)
# poils : bruit étiré le long du sourcil (direction latérale, légèrement montante vers l'intérieur)
noise = rng.random((T, T)).astype(np.float32)
strands = cv2.GaussianBlur(noise, (0, 0), sigmaX=2.2, sigmaY=0.45)
strands = (strands - strands.min()) / (np.ptp(strands) + 1e-6)
for side, sg in (('L', 1), ('R', -1)):
    e = eyes[side]; t = sg * (X - e[0])                                # >0 vers l'extérieur
    u = (t + 0.018) / 0.048                                            # 0 tête du sourcil -> 1 queue
    zc = e[2] + 0.0128 + 0.0042 * np.sin(np.pi * np.clip(u, 0, 1) ** 0.8) - 0.004 * sm((u - 0.75) / 0.25)
    hw = 0.0066 * (1 - u) + 0.0026 * u                                 # demi-épaisseur
    a = sm(u / 0.12) * sm((1 - u) / 0.1) * sm(1 - np.abs(Z - zc) / hw) * (Y < e[1] - 0.004) * cov
    a *= 0.55 + 0.45 * sm((0.6 - u) / 0.6)                             # plus dense vers la tête du sourcil
    alpha = np.maximum(alpha, a)
alpha = alpha * (0.8 + 0.6 * strands)
alpha = cv2.GaussianBlur(np.clip(alpha, 0, 1), (0, 0), 0.6)
col = np.array([34, 23, 18], np.float32)                               # brun foncé (cheveux d'Amanda)
hc = hc * (1 - 0.92 * alpha[..., None]) + col * 0.92 * alpha[..., None]
if True:                                                                # cuir chevelu (cheveux tirés en arrière) : ligne des cheveux d'après le visage
    el = (eyes['L'] + eyes['R']) / 2
    yf = P[(np.abs(P[:, 0]) < 0.012) & (np.abs(P[:, 2] - el[2] - 0.05) < 0.006)][:, 1].min()
    yb = P[P[:, 2] > el[2]][:, 1].max()
    t = np.clip((Y - yf) / (yb - yf), 0, 1); ax = np.abs(X)
    H = el[2] + 0.068 - 0.03 * sm((ax - 0.02) / 0.045) * (1 - t) - 0.13 * sm((t - 0.25) / 0.55)    # front, tempes, puis nuque
    oreille = (ax > 0.06) & (t > 0.3) & (t < 0.75) & (Z < el[2] + 0.035)
    a = sm((Z - H) / 0.008) * cov * ~oreille
    a = cv2.GaussianBlur(a.astype(np.float32), (0, 0), 2.5) * (0.7 + 0.3 * strands)
    hcol = np.array([int(x) for x in os.environ.get('MH_HAIR', '62,37,24').split(',')], np.float32)
    hc = hc * (1 - 0.9 * a[..., None]) + hcol * 0.9 * a[..., None]
    print('cuir chevelu peint : %.1f %% de la texture' % (100 * (a > 0.3).mean()))
Image.fromarray(np.clip(hc, 0, 255).astype(np.uint8)).save(OUT + 'visage.png')
Image.fromarray(np.clip(hn, 0, 255).astype(np.uint8)).resize((1024, 1024), Image.LANCZOS).save(OUT + 'visage_n.png')
ey = np.array(Image.open(SRC + 'Eyes_Color.png').convert('RGB')).astype(np.float32); n_ = ey.shape[0]
yy_, xx_ = np.mgrid[0:n_, 0:n_]; cx = (n_ - 1) / 2; r = np.hypot(xx_ - cx, yy_ - cx) / n_; th = np.arctan2(yy_ - cx, xx_ - cx)
K, R0 = 1.25, 0.14                                                      # iris : rayon divisé par K ; le blanc de l'œil s'étire jusqu'au bord
rs = np.where(r < R0 / K, r * K, R0 + (r - R0 / K) * (0.5 - R0) / (0.5 - R0 / K))
mx, my = (cx + rs * n_ * np.cos(th)).astype(np.float32), (cx + rs * n_ * np.sin(th)).astype(np.float32)
ey = cv2.remap(ey, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
Image.fromarray(np.clip(ey, 0, 255).astype(np.uint8)).resize((512, 512), Image.LANCZOS).save(OUT + 'yeux.png')
for a_, b_, s_ in (('Teeth_Color.png', 'bouche.png', 512), ('Eyelashes_Color.png', 'cils.png', 512)):
    im = Image.open(SRC + a_); im = im.convert('RGBA' if 'lash' in a_.lower() else 'RGB'); im.resize((s_, s_), Image.LANCZOS).save(OUT + b_)
if 'MH_HAIR' in os.environ:
    h = Image.open('/home/claude/femme/tex/cheveux.png').convert('RGBA'); a_ = np.array(h).astype(np.float32)
    lum = a_[..., :3].mean(2, keepdims=True) / np.array([74, 42, 25], np.float32).mean()
    tgt = np.array([int(x) for x in os.environ['MH_HAIR'].split(',')], np.float32) * 1.25
    a_[..., :3] = np.clip(lum * tgt, 0, 255); Image.fromarray(a_.astype(np.uint8)).save(OUT + 'cheveux.png')
print('OK')
