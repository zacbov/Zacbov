# Bas de contention réel (U.CR Achill, modèle de Tice) ajusté sur les jambes d'un patient (.blend) :
# repère jambe + repère pied (cheville -> orteils) transportés du bas vers le corps, puis plaqué sur la peau (+1,5 mm),
# lissage du déplacement, poids de peau interpolés du corps. Remplace le maillage de l'objet BasContention.
# python3 fit_bas.py -- in=X.blend out=Y.blend
import bpy, bmesh, sys, numpy as np, mathutils
from mathutils.bvhtree import BVHTree
A = dict(a.split('=', 1) for a in sys.argv[sys.argv.index('--') + 1:])
SRC = '/home/claude/labo/src/9f4f40db-U.CR_Achill_Long_Compression_Socks/model_1.obj'
TEX = '/home/claude/mh/bas/achill_1024.png'
GAP = float(A.get('gap', 0.0015))
bpy.ops.wm.open_mainfile(filepath=A['in'])
body = bpy.data.objects['Body']; bas = bpy.data.objects['BasContention']; arm = [m.object for m in body.modifiers if m.type == 'ARMATURE'][0]
MW = body.matrix_world
B = np.array([MW @ v.co for v in body.data.vertices])
gname = {g.index: g.name for g in body.vertex_groups}

def bone(n, tail=False):
    b = arm.data.bones['mixamorig_' + n]; return np.array(arm.matrix_world @ (b.tail_local if tail else b.head_local))

# sommets de peau des jambes (poids jambe/pied dominant) et leur BVH
LEG = lambda s: {'mixamorig_%s%s' % (s, k) for k in ('UpLeg', 'Leg', 'Foot', 'ToeBase', 'Toe_End')}
def leg_weight(side):
    w = np.zeros(len(B)); names = LEG(side)
    for v in body.data.vertices:
        for g in v.groups:
            if gname[g.group] in names: w[v.index] += g.weight
    return w

# bas source
bpy.ops.wm.obj_import(filepath=SRC, forward_axis='Y', up_axis='Z')
src = bpy.context.selected_objects[0]
S = np.array([v.co[:] for v in src.data.vertices]) / 100.0            # cm -> m
bm = bmesh.new(); bm.from_mesh(src.data); bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.02); bm.verts.ensure_lookup_table(); bm.faces.ensure_lookup_table()
S = np.array([v.co[:] for v in bm.verts]) / 100.0
# trous du talon (grandes boucles de bord hors ouverture) : bouchés, subdivisés, UV sur une zone unie du tricot
def boucles():
    adj = {}
    for e in bm.edges:
        if e.is_boundary: a_, b_ = e.verts; adj.setdefault(a_, []).append(e)
    seen = set(); out = []
    for v0 in adj:
        if v0 in seen: continue
        st = [v0]; seen.add(v0); c = []
        while st:
            u = st.pop(); c.append(u)
            for e in u.link_edges:
                if e.is_boundary:
                    w = e.other_vert(u)
                    if w not in seen: seen.add(w); st.append(w)
        out.append(c)
    return out
faits = 0
for it in range(10):
    cand = []
    for c in boucles():
        P_ = np.array([v.co[:] for v in c]) / 100; r_ = np.linalg.norm(P_ - P_.mean(0), axis=1).mean()
        if len(c) > 30 and 0.02 < r_ < 0.05: cand.append(c)
    if not cand: break
    c = cand[0]; es = list({e for v in c for e in v.link_edges if e.is_boundary})
    nf = bmesh.ops.holes_fill(bm, edges=es, sides=0)['faces']
    nf = bmesh.ops.triangulate(bm, faces=nf)['faces']
    bmesh.ops.subdivide_edges(bm, edges=list({e for f in nf for e in f.edges}), cuts=3, use_grid_fill=True)
    faits += 1
trous = range(faits)
print('trous bouchés', len(trous))
bm.verts.ensure_lookup_table(); bm.faces.ensure_lookup_table(); bm.verts.index_update(); bm.faces.index_update()
uvl_ = bm.loops.layers.uv.active
for f in bm.faces:
    for l in f.loops:
        if l[uvl_].uv.length == 0: l[uvl_].uv = (0.5, 0.93)
S = np.array([v.co[:] for v in bm.verts]) / 100.0
uvl = bm.loops.layers.uv.active

def comps():
    seen = set(); out = []
    for v in bm.verts:
        if v.index in seen: continue
        st = [v]; seen.add(v.index); c = []
        while st:
            u = st.pop(); c.append(u.index)
            for e in u.link_edges:
                w = e.other_vert(u)
                if w.index not in seen: seen.add(w.index); st.append(w)
        out.append(np.array(c))
    return out
C0 = comps(); C = [np.concatenate([c for c in C0 if (S[c][:, 0].mean() < 0) == neg]) for neg in (True, False)]   # pièces regroupées par chaussette
print('chaussettes', [len(c) for c in C])

def frame(u, f):
    u = u / np.linalg.norm(u); f = f - u * (f @ u); f /= np.linalg.norm(f); s = np.cross(u, f); return np.stack([u, f, s])

def fit_one(ci, side):
    idx = C[ci]; P = S[idx]
    # repères du bas : ouverture (bord libre le plus haut), pointe = sommet le plus loin de l'ouverture
    bset = set(idx.tolist()); adj = {}
    for e in bm.edges:
        if e.is_boundary and e.verts[0].index in bset:
            x_, y_ = e.verts[0].index, e.verts[1].index; adj.setdefault(x_, []).append(y_); adj.setdefault(y_, []).append(x_)
    seen = set(); loops = []
    for s0 in adj:
        if s0 in seen: continue
        st = [s0]; seen.add(s0); c = []
        while st:
            u = st.pop(); c.append(u)
            for n in adj[u]:
                if n not in seen: seen.add(n); st.append(n)
        loops.append(c)
    bv = max(loops, key=lambda c: np.linalg.norm(S[c] - S[c].mean(0), axis=1).mean() * (len(c) > 10))   # ouverture : la plus large boucle de bord
    T = S[bv].mean(0)
    import scipy.sparse as sp, scipy.sparse.csgraph as cg
    ed = np.array([(e.verts[0].index, e.verts[1].index) for e in bm.edges if e.verts[0].index in bset])
    ln = np.linalg.norm(S[ed[:, 0]] - S[ed[:, 1]], axis=1)
    G = sp.coo_matrix((np.r_[ln, ln], (np.r_[ed[:, 0], ed[:, 1]], np.r_[ed[:, 1], ed[:, 0]])), shape=(len(S), len(S))).tocsr()
    gd = cg.dijkstra(G, indices=bv, min_only=True)[idx]; gd[~np.isfinite(gd)] = 0
    E = P[np.argmax(gd)]                                            # pointe : le plus loin de l'ouverture le long du tissu
    # axe de jambe : normale du plan de l'ouverture, orientée vers l'intérieur
    Q = S[bv] - T; nrm = np.linalg.svd(Q)[2][2]
    if (P.mean(0) - T) @ nrm < 0: nrm = -nrm
    p = (P - T) @ nrm
    toe_dir = E - T; toe_dir -= nrm * (toe_dir @ nrm)
    te = (E - T) / np.linalg.norm(E - T); rel = P - T; tpar = rel @ te
    dl = np.linalg.norm(rel - np.outer(tpar, te), axis=1); Lte = np.linalg.norm(E - T)
    m = (tpar > 0.35 * Lte) & (tpar < 0.85 * Lte) & ((rel @ toe_dir) < (rel @ toe_dir).mean())
    H = P[m][np.argmax(dl[m])]                                     # talon : coin du L, le plus loin de la droite ouverture-pointe
    Ak = T + nrm * ((H - T) @ nrm - 0.035)                          # cheville sur l'axe de jambe, 3,5 cm au-dessus du talon
    print(side, 'T', T.round(3), 'E', E.round(3), 'H', H.round(3), 'Ak', Ak.round(3), 'L jambe %.3f pied %.3f' % (np.linalg.norm(T - Ak), np.linalg.norm(E - Ak)))
    # repères du corps
    s = side; knee = bone(s + 'Leg'); ank = bone(s + 'Foot'); toe = bone(s + 'Toe_End') if ('mixamorig_' + s + 'Toe_End') in arm.data.bones else bone(s + 'ToeBase', True)
    fwd_b = toe - ank; leg_len_s = np.linalg.norm(T - Ak)
    # le haut du bas sous le genou : longueur de jambe du bas à l'échelle de la jambe du patient (ouverture à 5 cm sous le genou au plus)
    Lb = min(np.linalg.norm(knee - ank) - 0.05, leg_len_s * 1.0)
    Tb = ank + (knee - ank) / np.linalg.norm(knee - ank) * Lb; TOPZ.append(Tb[2])
    Rs_leg = frame(T - Ak, toe_dir); Rb_leg = frame(Tb - ank, fwd_b)
    Rs_ft = frame(E - Ak, -(T - Ak)); Rb_ft = frame(toe - ank, -(Tb - ank))
    k_leg = Lb / leg_len_s; k_ft = np.linalg.norm(toe - ank) / np.linalg.norm(E - Ak)
    loc = P - Ak
    a_leg = loc @ Rs_leg.T; a_ft = loc @ Rs_ft.T
    # poids pied : selon l'angle entre l'axe jambe et la direction du sommet depuis la cheville
    ul = Rs_leg[0]; uf = Rs_ft[0]; dn = loc / (np.linalg.norm(loc, axis=1, keepdims=True) + 1e-9)
    hf = (loc @ uf) / np.linalg.norm(E - Ak); hl = (loc @ ul) / np.linalg.norm(T - Ak)
    wf = np.clip((hf - 0.18) / 0.2, 0, 1) * np.clip((0.25 - hl) / 0.2, 0, 1); wf = wf * wf * (3 - 2 * wf)   # pied : en avant de la cheville et pas haut sur la jambe ; talon = repère jambe
    # plaqué sur la peau de la jambe
    lw = leg_weight(s); keep = lw > 0.5
    faces = [list(pl.vertices) for pl in body.data.polygons if all(keep[i] for i in pl.vertices)]; print(side, 'peau jambe', int(keep.sum()), len(faces))
    tree = BVHTree.FromPolygons([mathutils.Vector(b) for b in B], faces)
    fn = [mathutils.Vector(np.cross(B[f[1]] - B[f[0]], B[f[2]] - B[f[0]])).normalized() for f in faces]
    def cast(c0, dirs, ax):
        R = np.empty((len(c0), 3)); ok = np.zeros(len(c0), bool)
        for i, (c, d) in enumerate(zip(c0, dirs)):
            hit = tree.ray_cast(mathutils.Vector(c), mathutils.Vector(d), 0.4)
            if hit[0] is not None: R[i] = np.array(hit[0]) + np.array(hit[1]) * GAP; ok[i] = True
        return R, ok
    def project(Rs, Rb, k, origin_b):
        h = loc @ Rs[0]                                    # abscisse le long de l'axe du segment (bas)
        cs = np.outer(h, Rs[0]); ds = loc - cs; ds /= np.linalg.norm(ds, axis=1, keepdims=True) + 1e-9
        db = (ds @ Rs.T) @ Rb                              # direction exprimée dans le repère du corps
        cb = origin_b + np.outer(h * k, Rb[0])
        return cast(cb, db, Rb[0])
    Pl, okl = project(Rs_leg, Rb_leg, k_leg, ank)
    Pf, okf = project(Rs_ft, Rb_ft, k_ft, ank)
    Pl0 = ank + (a_leg * k_leg) @ Rb_leg; Pf0 = ank + (a_ft * k_ft) @ Rb_ft
    Pl[~okl] = Pl0[~okl]; Pf[~okf] = Pf0[~okf]
    print(side, 'rayons sans impact : jambe %d pied %d' % ((~okl & (wf < 0.5)).sum(), (~okf & (wf > 0.5)).sum()))
    wf2 = wf.copy(); wf2[~okf] = 0; wf2[~okl & okf] = 1
    X0 = Pl * (1 - wf2[:, None]) + Pf * wf2[:, None]
    def snap(X):
        Y = np.empty_like(X); fi = np.empty(len(X), int); H = np.empty_like(X)
        for i, x in enumerate(X):
            co, n, f, dd = tree.find_nearest(mathutils.Vector(x)); H[i] = co; fi[i] = f; Y[i] = np.array(co) + np.array(n) * GAP
        return Y, fi, H
    Y, fi, H = snap(X0)
    dd = np.linalg.norm(Y - X0, axis=1); print(side, 'écart cadre->peau mm : médiane %.1f  p90 %.1f  max %.1f' % tuple(np.percentile(dd, [50, 90, 100]) * 1000))
    small = np.zeros(len(idx)); pos = {g: i for i, g in enumerate(idx)}
    for c in C0:
        if len(c) < 3000 and c[0] in pos: small[[pos[g] for g in c]] = 1
    np.save('/home/claude/mh/bas/dbg_%s.npy' % side, np.c_[X0, Y, wf, small, P])
    # lissage du déplacement (graphe du bas), puis plaquage strict
    sub = {g: i for i, g in enumerate(idx)}
    nb = [[] for _ in idx]
    for e in bm.edges:
        a, b = e.verts[0].index, e.verts[1].index
        if a in sub and b in sub: nb[sub[a]].append(sub[b]); nb[sub[b]].append(sub[a])
    D = Y - X0
    for _ in range(8): D = 0.5 * D + 0.5 * np.array([D[n].mean(0) if n else D[i] for i, n in enumerate(nb)])
    Y, fi, H = snap(X0 + D)
    return idx, Y, fi, faces

out = {}; TOPZ = []
xs = [S[c][:, 0].mean() for c in C]
order = np.argsort(xs)          # x < 0 : jambe droite du patient (face vers -y)
for ci, side in zip(order, ('Right', 'Left')): out[side] = fit_one(ci, side)

# nouveau maillage : les deux bas, UV d'origine, poids interpolés
old = bas.data
nm = bpy.data.meshes.new('BasContention')
verts = []; vmap = {}
for side in ('Right', 'Left'):
    idx, Y, fi, faces = out[side]
    for j, g in enumerate(idx): vmap[g] = len(verts); verts.append(Y[j])
fl = []; uvs = []
VV = np.array(verts); ndrop = 0
for f in bm.faces:
    if all(v.index in vmap for v in f.verts):
        ii = [v.index for v in f.verts]; jj = [vmap[i] for i in ii]
        ls_ = [np.linalg.norm(S[ii[k]] - S[ii[k - 1]]) for k in range(len(ii))]; lf_ = [np.linalg.norm(VV[jj[k]] - VV[jj[k - 1]]) for k in range(len(jj))]
        if max(lf_) > 3.0 * max(ls_) + 0.002: ndrop += 1; continue     # tissu trop étiré (repli sur le dessus du pied) : la sous-couche unie se voit à la place
        fl.append([vmap[v.index] for v in f.verts]); uvs.append([l[uvl].uv[:] for l in f.loops])
inv = np.linalg.inv(np.array(bas.matrix_world))
VL = [(inv @ np.r_[v, 1])[:3] for v in verts]
print('faces étirées retirées', ndrop); nm.from_pydata(VL, [], fl); nm.update()
uvL = nm.uv_layers.new(name='UVMap'); k = 0
for poly, uv in zip(nm.polygons, uvs):
    for li, u in zip(poly.loop_indices, uv): uvL.data[li].uv = u
for poly in nm.polygons: poly.use_smooth = True
mat = bpy.data.materials.new('Tissu_BasContention'); mat.use_nodes = True
nt = mat.node_tree; tx = nt.nodes.new('ShaderNodeTexImage'); tx.image = bpy.data.images.load(TEX)
pr = nt.nodes['Principled BSDF']; nt.links.new(tx.outputs[0], pr.inputs['Base Color']); pr.inputs['Roughness'].default_value = 0.85
nm.materials.append(mat)
bas.data = nm
for g in list(bas.vertex_groups): bas.vertex_groups.remove(g)
VG = {n: bas.vertex_groups.new(name=n) for n in [g.name for g in body.vertex_groups]}
bw = [{gname[g.group]: g.weight for g in v.groups} for v in body.data.vertices]
for side in ('Right', 'Left'):
    idx, Y, fi, faces = out[side]
    for j, g in enumerate(idx):
        f = faces[fi[j]]; P3 = B[f[:3]]; y = Y[j]
        # barycentriques sur le triangle (premiers 3 sommets) puis moyenne des poids
        v0, v1, v2 = P3[1] - P3[0], P3[2] - P3[0], y - P3[0]
        d00, d01, d11, d20, d21 = v0 @ v0, v0 @ v1, v1 @ v1, v2 @ v0, v2 @ v1
        den = d00 * d11 - d01 * d01 + 1e-12; bv_ = (d11 * d20 - d01 * d21) / den; bw_ = (d00 * d21 - d01 * d20) / den
        lam = np.clip([1 - bv_ - bw_, bv_, bw_], 0, None); lam /= lam.sum() + 1e-12
        acc = {}
        for l_, vi in zip(lam, f[:3]):
            for n, w in bw[vi].items(): acc[n] = acc.get(n, 0) + l_ * w
        tot = sum(acc.values()) or 1
        for n, w in acc.items():
            if w / tot > 1e-3: VG[n].add([vmap[g]], w / tot, 'REPLACE')
bpy.data.objects.remove(src)
# sous-couche : l'ancien bas généré (couvre talon et orteils), coupé sous l'ouverture du bas réel, couleur du tricot uni
if A.get('sous', '1') == '1':
    sub = bpy.data.objects.new('BasSous', old); bpy.context.scene.collection.objects.link(sub); sub.matrix_world = bas.matrix_world
    for g in body.vertex_groups: pass
    sub.parent = bas.parent
    for m in bas.modifiers:
        if m.type == 'ARMATURE': mm = sub.modifiers.new('Armature', 'ARMATURE'); mm.object = m.object
    bmo = bmesh.new(); bmo.from_mesh(old); zt = min(TOPZ) - 0.015; mw = sub.matrix_world
    bmesh.ops.delete(bmo, geom=[v for v in bmo.verts if (mw @ v.co).z > zt], context='VERTS'); bmo.to_mesh(old); bmo.free()
    mo = bpy.data.materials.new('Tissu_BasSous'); mo.use_nodes = True; pr2 = mo.node_tree.nodes['Principled BSDF']
    pr2.inputs['Base Color'].default_value = (0.80, 0.80, 0.79, 1); pr2.inputs['Roughness'].default_value = 0.9
    old.materials.clear(); old.materials.append(mo)
    bpy.ops.object.select_all(action='DESELECT'); sub.select_set(True); bas.select_set(True); bpy.context.view_layer.objects.active = bas
    bpy.ops.object.join()
    print('sous-couche jointe, haut à z = %.3f' % zt)
print('bas ajusté', len(verts), 'sommets', len(fl), 'faces')
bpy.ops.wm.save_as_mainfile(filepath=A['out'])
