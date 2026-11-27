# Ajoute la forme « BoucheOuverte » (vraie ouverture : lèvre inférieure, menton et arcade du bas pivotent) à femme_rig.blend
import bpy, bmesh, numpy as np, sys
import scipy.sparse as sp_, scipy.sparse.csgraph as cg_
bpy.ops.wm.open_mainfile(filepath='/home/claude/femme/v11/femme_rig.blend')
body = [o for o in bpy.data.objects if o.type == 'MESH' and o.data.shape_keys and 'Jaw_Down' in o.data.shape_keys.key_blocks][0]
me = body.data; N = len(me.vertices); kb = me.shape_keys.key_blocks
X = np.array([v.co[:] for v in kb['Basis'].data])
vm = np.empty(N, dtype=object)
for poly in me.polygons:
    for vi in poly.vertices: vm[vi] = me.materials[poly.material_index].name
HEAD = np.isin(vm, ('Peau_visage', 'Bouche', 'Cils', 'Peau_tronc'))
def sm(t): t = np.clip(t, 0, 1); return t * t * (3 - 2 * t)
SL = 1.412
x, y, z = X[:, 0], X[:, 1], X[:, 2]
bmF = bmesh.new(); bmF.from_mesh(me); bmF.verts.ensure_lookup_table()
fi_ = [i for i, m in enumerate(me.materials) if m.name == 'Peau_visage'][0]
loop = sorted({v.index for e in bmF.edges if e.is_boundary and any(f.material_index == fi_ for f in e.link_faces)
               and any(abs(w.co.x) < 0.035 and 1.39 < w.co.z < 1.43 and w.co.y < -0.04 for w in e.verts) for v in e.verts})
ls_ = set(loop); adj = {i: [] for i in loop}
for e in bmF.edges:
    a_, b_ = e.verts[0].index, e.verts[1].index
    if e.is_boundary and a_ in ls_ and b_ in ls_: adj[a_].append(b_); adj[b_].append(a_)
comps, seen = [], set()
for st in loop:
    if st in seen: continue
    cmp_, stack = [], [st]; seen.add(st)
    while stack:
        u = stack.pop(); cmp_.append(u)
        for n in adj[u]:
            if n not in seen: seen.add(n); stack.append(n)
    comps.append(cmp_)
L_ = np.array(loop); zm = np.empty(len(L_))
for i, v in enumerate(L_):                                # bord haut / bas de la fente : au-dessus ou au-dessous du milieu local
    near_ = L_[np.abs(X[L_, 0] - X[v, 0]) < 0.0018]; zm[i] = (X[near_, 2].max() + X[near_, 2].min()) / 2
zc_ = (X[L_, 2].min() + X[L_, 2].max()) / 2; gap_ = sorted(X[L_, 2]); jmp = int(np.argmax(np.diff(gap_))); zc_ = (gap_[jmp] + gap_[jmp + 1]) / 2   # plus grand saut en z entre les deux bords
upS = [int(v) for v, m in zip(L_, zm) if X[v, 2] > m]; loS = [int(v) for v, m in zip(L_, zm) if X[v, 2] <= m]
print('fente haut', len(upS), 'bas', len(loS))
_, uid, inv = np.unique(np.round(X / 3e-4).astype(np.int64), axis=0, return_index=True, return_inverse=True); inv = inv.ravel(); NU = len(uid)   # sommets soudés (coutures UV)
SK_ = np.zeros(N, bool); _sk = {i for i, m in enumerate(me.materials) if m.name in ('Peau_visage', 'Peau_tronc')}
for poly in me.polygons:
    if poly.material_index in _sk: SK_[list(poly.vertices)] = True
ed = np.array([(e.verts[0].index, e.verts[1].index) for e in bmF.edges if SK_[e.verts[0].index] and SK_[e.verts[1].index]]); ln = np.linalg.norm(X[ed[:, 0]] - X[ed[:, 1]], axis=1) + 1e-7
G_ = sp_.coo_matrix((np.r_[ln, ln], (np.r_[inv[ed[:, 0]], inv[ed[:, 1]]], np.r_[inv[ed[:, 1]], inv[ed[:, 0]]])), shape=(NU, NU)).tocsr()
dU = cg_.dijkstra(G_, indices=np.unique(inv[upS]), min_only=True, limit=0.06)[inv]; dL = cg_.dijkstra(G_, indices=np.unique(inv[loS]), min_only=True, limit=0.06)[inv]
dU[~np.isfinite(dU)] = 1; dL[~np.isfinite(dL)] = 1
wl_ = sm((dU - dL) / 0.003 + 0.5)                       # 1 côté lèvre inférieure
skin = SK_ & ~np.isin(vm, ('Bouche',)) | (SK_ & np.isin(vm, ('Bouche',)))
# côté bas de la fente : au-dessous de la ligne des lèvres (interpolée le long de x), atténué au-delà des commissures
o_ = np.argsort(X[L_, 0]); xs = X[L_, 0][o_]; zs_ = np.convolve(np.pad(zm[o_], 3, mode='edge'), np.ones(7) / 7, mode='valid')   # ligne médiane de la fente, lissée
zs = np.interp(x, xs, zs_); xc = np.abs(xs).max()
region = skin * HEAD * sm((0.02 - y) / 0.04) * (np.abs(x) < 0.09)
below = sm((zs - z) / 0.0025 + 0.5)
corner = 1 - sm((np.abs(x) - xc) / 0.05)
side = below
near = 1 - sm((np.minimum(dU, dL) - 0.015) / 0.01)        # près de la fente : côté choisi par la distance le long de la peau (lèvre sup. retroussée vers l'intérieur = haut)
side = near * wl_ + (1 - near) * below
w = region * side * corner * sm((z - 1.30) / 0.07)
teeth = np.isin(vm, ('Bouche',)); tid = set(np.where(teeth)[0].tolist()); seenT = set()
for st in sorted(tid):                                   # pièces de la bouche : arcade, gencive et langue du bas suivent la mâchoire ; la poche buccale se déforme
    if st in seenT: continue
    cmp_, stack = [], [st]; seenT.add(st)
    while stack:
        u = stack.pop(); cmp_.append(u)
        for e in bmF.verts[u].link_edges:
            n = e.other_vert(bmF.verts[u]).index
            if n in tid and n not in seenT: seenT.add(n); stack.append(n)
    zr = z[cmp_].max() - z[cmp_].min()
    if zr > 0.03: w[cmp_] = 0.0
    else: w[cmp_] = 1.0 if z[cmp_].mean() < 1.4158 else 0.0
print('pieces bouche', len(tid), 'poids>0.5', int((w > 0.5).sum()))
piv = np.array([0, 0.004, 1.446]); ang = 0.24 * w
d = X - piv; c, s_ = np.cos(ang), np.sin(ang); P = X.copy()
P[:, 1] = piv[1] + d[:, 1] * c - d[:, 2] * s_; P[:, 2] = piv[2] + d[:, 1] * s_ + d[:, 2] * c
up = skin * HEAD * (1 - wl_) * (1 - sm((dU - 0.012) / 0.012)) * (np.abs(x) < 0.04) * (y < -0.04)
P[:, 2] += 0.004 * up                                  # la lèvre supérieure se relève un peu
kb['BoucheOuverte'].data.foreach_set('co', P.astype(np.float32).ravel())
print('BoucheOuverte recalculée, max', float(np.abs(P - X).max()))
bpy.ops.wm.save_as_mainfile(filepath='/home/claude/femme/v37/etape1.blend')
