# Patient homme âgé : la tête du patient (MikeAlger, 50 formes de visage) est déformée vers le scan fs1c,
# puis sa texture (atlas) est recuite depuis le scan. Les formes (visèmes, expressions) restent des écarts.
# usage : python3 tete.py <homme_corps.blend> <tete.blend> <tete_Image_0.png> <sortie.blend> [apercu]
import bpy, bmesh, numpy as np, sys, math, cv2
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
BL, SC, TX, OUT = sys.argv[-5:-1] if sys.argv[-1] == 'apercu' else sys.argv[-4:]
APERCU = sys.argv[-1] == 'apercu'
bpy.ops.wm.open_mainfile(filepath=BL)
arm = [o for o in bpy.data.objects if o.type == 'ARMATURE'][0]
body = bpy.data.objects['Body']
def bone(n): return np.array((arm.matrix_world @ arm.data.bones['mixamorig_' + n].head_local)[:])
with bpy.data.libraries.load(SC) as (src, dst): dst.objects = ['Scan']
scan = dst.objects[0]; bpy.context.scene.collection.objects.link(scan)
S = np.array([(scan.matrix_world @ v.co)[:] for v in scan.data.vertices])
if np.ptp(S[:, 2]) > 2: S *= 0.01                                        # centimètres -> mètres
# (le scan regarde déjà vers -y une fois importé)
# ---------- repères : sommet du crâne et bout du nez
B = np.array([(body.matrix_world @ v.co)[:] for v in body.data.vertices])
eyeL, eyeR = bone('LeftEye'), bone('RightEye'); xc = (eyeL[0] + eyeR[0]) / 2; zE = (eyeL[2] + eyeR[2]) / 2
def nez(P, x0, z0):
    m = (np.abs(P[:, 0] - x0) < 0.008) & (P[:, 2] < z0) & (P[:, 2] > z0 - 0.06); return P[m][np.argmin(P[m][:, 1])]
topB = B[:, 2].max(); nB = nez(B, xc, zE)
xs = np.median(S[S[:, 2] > S[:, 2].max() - 0.05][:, 0]); topS = S[:, 2].max()
zEs = topS - (topB - zE) * 1.0; nS = nez(S, xs, zEs)
k = (topB - nB[2]) / (topS - nS[2])
S = (S - np.array([xs, nS[1], topS])) * k + np.array([xc, nB[1], topB])
print('échelle initiale %.3f' % k)
# ---------- recalage fin (similitude, ICP tronqué) des points du scan au-dessus du menton sur la tête du patient
meB = body.data.copy(); meB.transform(body.matrix_world); bmB = bmesh.new(); bmB.from_mesh(meB); TB = BVHTree.FromBMesh(bmB)
zMenton = nB[2] - 0.075
for it in range(25):
    sel = np.nonzero(S[:, 2] > zMenton)[0][::7]; Q = []; Pk = []
    for i in sel:
        loc, nrm, fi, d = TB.find_nearest(Vector(S[i]), 0.05)
        if loc is not None and d < (0.03 if it < 8 else 0.012): Q.append(loc[:]); Pk.append(S[i])
    Pk, Q = np.array(Pk), np.array(Q); mp, mq = Pk.mean(0), Q.mean(0); A_, B_ = Pk - mp, Q - mq
    U, Sg, Vt = np.linalg.svd(B_.T @ A_); D = np.eye(3); D[2, 2] = np.sign(np.linalg.det(U @ Vt)); R = U @ D @ Vt
    s = (Sg * np.diag(D)).sum() / (A_ ** 2).sum(); t = mq - s * R @ mp
    S = (s * (R @ S.T)).T + t
    if it % 6 == 0 or it == 24: print('  icp', it, 'points', len(Pk), 'écart moyen %.1f mm' % (1000 * np.linalg.norm(Q - ((s * (R @ Pk.T)).T + t), axis=1).mean()))
Mi = scan.matrix_world.inverted()
for v, p in zip(scan.data.vertices, S): v.co = Mi @ Vector(p)
scan.data.update()
meS = scan.data.copy(); meS.transform(scan.matrix_world); bmS = bmesh.new(); bmS.from_mesh(meS); bmS.faces.ensure_lookup_table(); TS = BVHTree.FromBMesh(bmS)
if APERCU:
    bpy.ops.wm.save_as_mainfile(filepath=OUT); print('aperçu', OUT); sys.exit()
# ---------- repères du visage (MediaPipe sur des rendus de face, rlm.py + mp/det.py) : déformation RBF de la tête vers le scan
def lift(L, T):
    out = []
    for u_, v_ in L:
        loc, nrm, fi, d = T.ray_cast(Vector((0.015 + (u_ - 0.5) * 0.3, -2.0, 1.66 - (v_ - 0.5) * 0.3)), Vector((0, 1, 0)), 4)
        out.append(loc[:] if loc is not None else (np.nan,) * 3)
    return np.array(out)
P1, P2 = lift(np.load('/home/claude/mh/homme/mp/lm_Body.npy'), TB), lift(np.load('/home/claude/mh/homme/mp/lm_Scan.npy'), TS)
INT = [78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95]   # contour intérieur des lèvres : écarté (il déchire la bouche)
mk = ~np.isnan(P1).any(1) & ~np.isnan(P2).any(1); bouche = (P1[13] + P1[14]) / 2; mk[INT] = False; P1, P2 = P1[mk], P2[mk]
Dl_ = P2 - P1; dd = np.linalg.norm(P1[:, None] - P1[None], axis=2); vois = np.argsort(dd, 1)[:, 1:9]
ecart = np.linalg.norm(Dl_ - Dl_[vois].mean(1), axis=1); garde = ecart < 0.007          # repères aberrants (narines vues au fond du trou, etc.)
print('repères aberrants écartés :', (~garde).sum()); P1, P2 = P1[garde], P2[garde]
K = np.linalg.norm(P1[:, None] - P1[None], axis=2); Pa = np.c_[np.ones(len(P1)), P1]; nP = len(P1)
Msys = np.zeros((nP + 4, nP + 4)); Msys[:nP, :nP] = K + 1e-4 * np.eye(nP); Msys[:nP, nP:] = Pa; Msys[nP:, :nP] = Pa.T
Wr = np.linalg.solve(Msys, np.r_[P2 - P1, np.zeros((4, 3))])
def rbf(X): return np.linalg.norm(X[:, None] - P1[None], axis=2) @ Wr[:nP] + np.c_[np.ones(len(X)), X] @ Wr[nP:]
B0 = B.copy(); regw = np.clip((B[:, 2] - (zMenton - 0.03)) / 0.05, 0, 1) * (np.abs(B[:, 0]) < 0.3)
warp = rbf(B) * regw[:, None]
# pièces détachées de la tête (dents, langue, yeux…) : déplacées d'un bloc (sinon les dents passent devant les lèvres)
_, inv0 = np.unique(np.round(B * 1e5).astype(np.int64), axis=0, return_inverse=True); inv0 = inv0.ravel(); n0 = inv0.max() + 1
E0 = np.unique(np.sort(inv0[np.array([e.vertices[:] for e in body.data.edges])], 1), axis=0)
par = np.arange(n0)
def rac(x):
    while par[x] != x: par[x] = par[par[x]]; x = par[x]
    return x
for a_, b_ in E0:
    ra, rb = rac(a_), rac(b_)
    if ra != rb: par[ra] = rb
lab = np.array([rac(i) for i in range(n0)])[inv0]; tailles = np.bincount(lab); principal = np.argmax(tailles)
nb = 0
for l in np.unique(lab[regw > 0.5]):
    if l == principal: continue
    m_ = lab == l; c_ = B[m_].mean(0)
    if np.linalg.norm(c_ - bouche) < 0.035 and c_[1] > bouche[1] + 0.004: warp[m_] = rbf(bouche[None])[0] + np.array([0, 0.007, 0]); nb += m_.sum()   # comme le centre des lèvres, 7 mm en retrait
    elif min(np.linalg.norm(c_ - eyeL), np.linalg.norm(c_ - eyeR)) < 0.03: warp[m_] = rbf(c_[None])[0]; nb += m_.sum()
print('pièces détachées déplacées en bloc :', nb, 'sommets')
for l in np.unique(lab[regw > 0.5]):
    m_ = lab == l; c_ = B[m_].mean(0)
    if l != principal: print('   pièce', m_.sum(), 'centre-bouche %.1f cm' % (100 * np.linalg.norm(c_ - bouche)), 'dy %.1f mm' % (1000 * (c_[1] - bouche[1])), 'z %.3f' % c_[2])
B = B + warp
print('repères appariés', nP, '; déplacement RBF moyen %.1f mm' % (1000 * np.linalg.norm(warp[regw > 0.9], axis=1).mean()))
# ---------- déformation de la tête : vers la surface du scan, sauf yeux et intérieur de la bouche ; fondu vers le cou
N = np.array([(body.matrix_world.to_3x3() @ v.normal).normalized()[:] for v in body.data.vertices])
w = np.clip((B[:, 2] - (zMenton - 0.03)) / 0.05, 0, 1)                   # 0 sous le cou, 1 au-dessus du menton
for e in (eyeL, eyeR):
    d = np.linalg.norm(B - e, axis=1); w *= np.clip((d - 0.016) / 0.012, 0, 1)   # globes et paupières gardés
w *= (np.abs(B[:, 0]) < 0.3)                                             # pas les mains
Dsp = np.zeros_like(B); ok = np.zeros(len(B), bool)
for i in np.nonzero(w > 0)[0]:                                           # projection le long de la normale (le plus proche écrase le nez et les lèvres)
    o_, n_ = Vector(B[i]), Vector(N[i]); best = None
    for sg in (1, -1):
        loc, nrm, fi, d = TS.ray_cast(o_ - n_ * 0.0005 * sg, n_ * sg, 0.012)
        if loc is not None and np.dot(nrm[:], N[i]) > 0.3 and (best is None or d < best[1]): best = (loc, d)
    if best is None: continue
    Dsp[i] = np.array(best[0][:]) - B[i]; ok[i] = True
w *= ok
# sommets dédoublés aux coutures d'UV (import glTF) : on travaille sur les positions uniques, sinon la tête se fend
_, inv = np.unique(np.round(B * 1e5).astype(np.int64), axis=0, return_inverse=True); inv = inv.ravel(); n = inv.max() + 1
cnt = np.bincount(inv, minlength=n).astype(float)
def u(X): Y = np.zeros((n,) + X.shape[1:]); np.add.at(Y, inv, X); return Y / (cnt[:, None] if X.ndim == 2 else cnt)
E = np.unique(np.sort(inv[np.array([e.vertices[:] for e in body.data.edges])], 1), axis=0); E = E[E[:, 0] != E[:, 1]]
def lisse(X, it):
    for _ in range(it):
        acc = np.zeros_like(X); c = np.zeros(n); np.add.at(acc, E[:, 0], X[E[:, 1]]); np.add.at(acc, E[:, 1], X[E[:, 0]]); np.add.at(c, E[:, 0], 1); np.add.at(c, E[:, 1], 1)
        X = 0.5 * X + 0.5 * acc / np.maximum(c, 1)[:, None] if X.ndim == 2 else 0.5 * X + 0.5 * acc / np.maximum(c, 1)
    return X
# champ de déplacement : mesuré là où la projection a réussi, prolongé ailleurs (yeux, narines, intérieur de la bouche) par diffusion
reg = np.clip((B[:, 2] - (zMenton - 0.03)) / 0.05, 0, 1) * (np.abs(B[:, 0]) < 0.3)
fixe = (np.linalg.norm(B - bouche, axis=1) < 0.028) | (np.linalg.norm(B0 - nB, axis=1) < 0.03)   # bouche, dessous du nez : RBF seule (affinage nul, pas de diffusion du nez)
Dsp[fixe] = 0; ok[fixe] = True
ru = u(reg); vu = u(ok.astype(float) * (w > 0.5)) > 0.5; Du = u(Dsp)
Df = Du * vu[:, None]
nb_acc = lambda X: (lambda acc, c: acc / np.maximum(c, 1)[:, None])(*(lambda acc, c: (np.add.at(acc, E[:, 0], X[E[:, 1]]) or np.add.at(acc, E[:, 1], X[E[:, 0]]) or acc, np.bincount(E[:, 0], minlength=n) + np.bincount(E[:, 1], minlength=n)))(np.zeros_like(X), None))
for _ in range(300): Df = np.where(vu[:, None], Du, nb_acc(Df))
Df = lisse(Df, 4)
wl_u = lisse(ru, 3); wl = wl_u[inv]; delta = (Df * wl_u[:, None])[inv] + warp; wl = np.maximum(wl, regw)
F = B0 + delta; inb = np.argmin(np.linalg.norm(B0 - nB, axis=1)); nez_f = F[inb]; nr = 0
for i in np.nonzero(np.linalg.norm(F - nez_f, axis=1) < 0.04)[0]:          # rien ne dépasse de la surface du scan autour du nez (lambeaux des narines)
    loc, nrm, fi, d = TS.find_nearest(Vector(F[i]), 0.03)
    if loc is not None and np.dot(F[i] - np.array(loc[:]), nrm[:]) > 0.0015: F[i] = np.array(loc[:]) - np.array(nrm[:]) * 0.0008; nr += 1
delta = F - B0; print('sommets rentrés sous la surface autour du nez :', nr)
print('sommets déplacés : %d, déplacement moyen %.1f mm, max %.1f mm' % ((wl > 0.01).sum(), 1000 * np.linalg.norm(delta[wl > 0.01], axis=1).mean(), 1000 * np.linalg.norm(delta, axis=1).max()))
M3 = np.array(body.matrix_world.inverted().to_3x3())
dl = delta @ M3.T                                                         # en repère local
kb = body.data.shape_keys.key_blocks
for key in kb:                                                            # la base et chaque forme bougent de la même quantité : les écarts des formes restent
    for i in np.nonzero(wl > 0.001)[0]: key.data[i].co = key.data[i].co + Vector(dl[i])
for v, kv in zip(body.data.vertices, kb[0].data): v.co = kv.co
body.data.update()
# ---------- texture : atlas du patient recuit depuis le scan dans la zone déformée
mt = body.data.materials[0]; im = [nd.image for nd in mt.node_tree.nodes if nd.type == 'TEX_IMAGE' and nd.image][0]
W_, H_ = im.size; atl = (np.array(im.pixels[:], np.float32).reshape(H_, W_, 4)[::-1, :, :3] * 255)
ST = np.array(Image.open(TX).convert('RGB')).astype(np.float32); TH, TW = ST.shape[:2]
uvS = scan.data.uv_layers.active.data
Bn = np.array([(body.matrix_world @ v.co)[:] for v in body.data.vertices]); uvB = body.data.uv_layers.active.data
wbk = np.clip((Bn[:, 2] - (zMenton + 0.005)) / 0.025, 0, 1) * np.clip((0.068 - np.abs(Bn[:, 0] - xc)) / 0.008, 0, 1) * (np.abs(Bn[:, 0]) < 0.3)
yH = bone('Head')[1]
cote_tete = np.clip((Bn[:, 2] - (zMenton + 0.005)) / 0.025, 0, 1) * (np.abs(Bn[:, 0]) < 0.3); nuque = np.clip((Bn[:, 2] - (zMenton + 0.01)) / 0.025, 0, 1) * (Bn[:, 1] > yH + 0.02) * (np.abs(Bn[:, 0]) < 0.3)
oreille = np.zeros(len(Bn))
for sg in (1, -1):
    O = B0[(sg * (B0[:, 0] - xc) > 0.072) & (np.abs(B0[:, 2] - zE) < 0.05) & (np.abs(B0[:, 0]) < 0.3)]
    if len(O): c_ = O.mean(0) + np.array([0, 0, 0]) ; oreille = np.maximum(oreille, np.clip((0.038 - np.linalg.norm(Bn - (c_ + warp[(sg * (B0[:, 0] - xc) > 0.072) & (np.abs(B0[:, 2] - zE) < 0.05) & (np.abs(B0[:, 0]) < 0.3)].mean(0)), axis=1)) / 0.008, 0, 1))
wbk = np.maximum(cote_tete, nuque) * (1 - oreille)                       # tout le crâne et le visage, sauf les oreilles (gardées, teinte ajustée)
out = atl.copy(); poids = np.zeros((H_, W_), np.float32); nt = 0
for f in body.data.polygons:
    vi = list(f.vertices); wf = wbk[vi]
    if wf.max() < 0.02: continue
    lo = list(f.loop_indices)
    for a, b2, c2 in [(0, k_, k_ + 1) for k_ in range(1, len(vi) - 1)]:
        uv = np.array([uvB[lo[a]].uv[:], uvB[lo[b2]].uv[:], uvB[lo[c2]].uv[:]]) * [W_, H_]; uv[:, 1] = H_ - uv[:, 1]
        p3 = Bn[[vi[a], vi[b2], vi[c2]]]; w3 = wf[[a, b2, c2]]
        x0, y0 = np.floor(uv.min(0)).astype(int); x1, y1 = np.ceil(uv.max(0)).astype(int)
        if x1 - x0 > 300 or y1 - y0 > 300: continue
        xs_, ys_ = np.meshgrid(np.arange(max(x0 - 1, 0), min(x1 + 2, W_)), np.arange(max(y0 - 1, 0), min(y1 + 2, H_)))
        if xs_.size == 0: continue
        px = np.stack([xs_.ravel() + .5, ys_.ravel() + .5], 1); v0, v1 = uv[1] - uv[0], uv[2] - uv[0]; den = v0[0] * v1[1] - v1[0] * v0[1]
        if abs(den) < 1e-9: continue
        q = px - uv[0]; l1 = (q[:, 0] * v1[1] - v1[0] * q[:, 1]) / den; l2 = (v0[0] * q[:, 1] - q[:, 0] * v0[1]) / den; l0 = 1 - l1 - l2
        okm = (l0 >= -.03) & (l1 >= -.03) & (l2 >= -.03)
        for j in np.nonzero(okm)[0]:
            P = l0[j] * p3[0] + l1[j] * p3[1] + l2[j] * p3[2]; ww = l0[j] * w3[0] + l1[j] * w3[1] + l2[j] * w3[2]
            loc, nrm, fi, d = TS.find_nearest(Vector(P), 0.02)
            if loc is None: continue
            fS = bmS.faces[fi]; ls = fS.loops; a3 = [l.vert.co for l in ls[:3]]
            # barycentriques sur le triangle du scan
            pa, pb, pc = (np.array(x[:]) for x in a3); vv0, vv1, vv2 = pb - pa, pc - pa, np.array(loc[:]) - pa
            d00, d01, d11, d20, d21 = vv0 @ vv0, vv0 @ vv1, vv1 @ vv1, vv2 @ vv0, vv2 @ vv1; dn = d00 * d11 - d01 * d01
            if abs(dn) < 1e-14: continue
            bb = (d11 * d20 - d01 * d21) / dn; cc = (d00 * d21 - d01 * d20) / dn; aa = 1 - bb - cc
            uvs = aa * np.array(uvS[ls[0].index].uv[:]) + bb * np.array(uvS[ls[1].index].uv[:]) + cc * np.array(uvS[ls[2].index].uv[:])
            tx_, ty_ = int(np.clip((uvs[0] % 1) * TW, 0, TW - 1)), int(np.clip((1 - uvs[1] % 1) * TH, 0, TH - 1))
            yy, xx = ys_.ravel()[j], xs_.ravel()[j]
            if ww > poids[yy, xx]: out[yy, xx] = ST[ty_, tx_]; poids[yy, xx] = ww; nt += 1
print('texels recuits', nt)
# teinte : le visage du scan rejoint la peau du cou d'origine (gain sur la bande de fondu)
bande = (poids > 0.05) & (poids < 0.6); plein = poids > 0.9
if bande.sum() > 50 and plein.sum() > 50:
    g = np.clip(np.median(atl[bande], 0) / np.median(out[bande], 0), 0.75, 1.35); print('gain de teinte', g.round(2))
    out = out * (1 + (g - 1) * np.clip((0.95 - poids) / 0.6, 0, 1)[..., None])
pw = cv2.GaussianBlur(poids, (0, 0), 1.5)[..., None]
res = atl * (1 - pw) + out * pw
px_ = np.concatenate([res[::-1] / 255, np.ones((H_, W_, 1), np.float32)], 2).astype(np.float32)
ni = bpy.data.images.new('MikeAlger_age', W_, H_); ni.pixels = px_.ravel(); import os; ni.filepath_raw = os.path.abspath(OUT).replace('.blend', '_atlas.png'); ni.file_format = 'PNG'; ni.save()
for nd in mt.node_tree.nodes:
    if nd.type == 'TEX_IMAGE' and nd.image == im: nd.image = ni
# ---------- cheveux d'origine retirés (ceux du scan sont dans la peau), scan retiré
for nm in ('Hair',):
    if nm in bpy.data.objects: bpy.data.objects.remove(bpy.data.objects[nm], do_unlink=True)
bpy.data.objects.remove(scan, do_unlink=True)
bpy.ops.wm.save_as_mainfile(filepath=OUT); print('OK', OUT)
