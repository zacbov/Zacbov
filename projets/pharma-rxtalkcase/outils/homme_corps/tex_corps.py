# Texture du corps : t-shirt de compression du scan repeint en peau (au-dessus du bassin), logos du cuissard effacés.
import bpy, numpy as np, cv2, sys
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
BL, SRC, OUT = sys.argv[-3:]
bpy.ops.wm.open_mainfile(filepath=BL)
o = bpy.data.objects['Corps']; me = o.data; uv = me.uv_layers.active.data
P = np.array([(o.matrix_world @ v.co)[:] for v in me.vertices])
T = 4096; img = np.array(Image.open(SRC).convert('RGB').resize((T, T), Image.LANCZOS)).astype(np.float32)
z3 = np.zeros((T, T), np.uint8); z1 = np.zeros((T, T), np.uint8); z2 = np.zeros((T, T), np.uint8)       # haut du corps (t-shirt) / bassin (cuissard)
for p in me.polygons:
    zc = P[list(p.vertices), 2].mean(); cl = 1 if zc > 0.962 else 2 if zc > 0.62 else 0
    if 0.962 < zc < 1.08: cv2.fillPoly(z3, [np.round((lambda q: np.c_[q[:, 0], T - q[:, 1]])(np.array([uv[l].uv[:] for l in p.loop_indices]) * T)).astype(np.int32)], 1)
    if not cl: continue
    pts = np.array([uv[l].uv[:] for l in p.loop_indices]) * T; pts[:, 1] = T - pts[:, 1]
    cv2.fillPoly(z1 if cl == 1 else z2, [np.round(pts).astype(np.int32)], 1)
z1 = cv2.dilate(z1, np.ones((15, 15), np.uint8)); z2 = cv2.dilate(z2, np.ones((3, 3), np.uint8))
zone = np.where(z2 > 0, 2, np.where(z1 > 0, 1, 0)).astype(np.uint8)          # le cuissard l'emporte
hsv = cv2.cvtColor(img.astype(np.uint8), cv2.COLOR_RGB2HSV).astype(np.float32)
gris = ((hsv[..., 1] < 70) & (hsv[..., 2] < 190)) | (hsv[..., 2] < 60)
m = (((zone == 1) & gris) | (z3 > 0)).astype(np.uint8)   # bas du t-shirt (ourlet, bande sombre) : tout repeint
m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((15, 15), np.uint8)); m = cv2.dilate(m, np.ones((21, 21), np.uint8)) * ((z2 == 0) | (z3 > 0))
print('t-shirt repeint : %.1f %% de la texture' % (100 * m.mean()))
peau = img[(zone == 1) & ~gris.astype(bool) & (hsv[..., 1] > 80)]
base = np.median(peau, 0) if len(peau) > 100 else np.array([200, 150, 120], np.float32); print('teinte peau', base.round())
rng = np.random.default_rng(1)
n1 = cv2.GaussianBlur(rng.normal(0, 1, (T // 4, T // 4)).astype(np.float32), (0, 0), 6); n1 = cv2.resize(n1 / (n1.std() + 1e-6), (T, T))
n2 = cv2.GaussianBlur(rng.normal(0, 1, (T, T)).astype(np.float32), (0, 0), 1.2); n2 /= n2.std() + 1e-6
lumb = cv2.GaussianBlur(img.mean(2), (0, 0), 8); ref = max(float(np.median(lumb[m > 0])), 1)
ombre = np.clip(lumb / ref, 0.6, 1.25) ** 0.6                          # modelé du corps gardé (ombres larges du scan), coutures et logos effacés
fill = base * ombre[..., None] * (1 + 0.045 * n1[..., None] + 0.025 * n2[..., None])
soft = cv2.GaussianBlur(m.astype(np.float32), (0, 0), 3)[..., None]
out = img * (1 - soft) + fill * soft
# teinte accordée à la peau du patient (cou), pour que les raccords cou / avant-bras ne se voient pas
B = [b for b in bpy.data.objects if b.type == 'MESH' and b.data.shape_keys][0]
im = [n.image for n in B.data.materials[0].node_tree.nodes if n.type == 'TEX_IMAGE'][0]
w_, h_ = im.size; tm = np.array(im.pixels[:], np.float32).reshape(h_, w_, 4)[::-1, :, :3] * 255
PBm = np.array([(B.matrix_world @ v.co)[:] for v in B.data.vertices]); uvb = B.data.uv_layers.active.data; mk = np.zeros((h_, w_), np.uint8)
for p in B.data.polygons:
    c_ = PBm[list(p.vertices)].mean(0)
    if 1.38 < c_[2] < 1.47 and abs(c_[0]) < 0.08:
        pts = np.array([uvb[l].uv[:] for l in p.loop_indices]) * [w_, h_]; pts[:, 1] = h_ - pts[:, 1]; cv2.fillPoly(mk, [np.round(pts).astype(np.int32)], 1)
cou = np.median(tm[mk > 0], 0); gain = np.clip(cou / base, 0.75, 1.3); print('cou du patient', cou.round(), 'gain', gain.round(2))
out = out * gain
# cuissard : gris uniforme (logos retirés), plis gardés par la luminance
c = (zone == 2) & gris; lum = img.mean(2)
mc = cv2.GaussianBlur(c.astype(np.float32), (0, 0), 2)[..., None]
g = np.clip(lum / max(lum[c].mean(), 1) * 58, 0, 255)[..., None] * np.array([1, 1, 1.05])
out = out * (1 - mc) + g * mc
Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)).resize((2048, 2048), Image.LANCZOS).save(OUT, quality=90)
print('OK', OUT)
