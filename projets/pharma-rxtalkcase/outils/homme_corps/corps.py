# Corps complet du patient homme : scan « fredi » (corps entier) recalé sur le squelette de patient_homme (MikeAlger),
# poids pris sur le patient posé comme le scan (vêtements + peau = mandataire), skinning inverse -> pose T,
# tête et mains du scan retirées (celles du patient sont gardées).
# usage : python3 corps.py <patient_homme.glb> <fredi.blend> <sortie.blend>
import bpy, bmesh, numpy as np, math, sys
from mathutils import Vector, Matrix, kdtree
from mathutils.bvhtree import BVHTree
GLB, SCAN, OUT = sys.argv[-3:]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=GLB)
for o in list(bpy.data.objects):
    if o.name.startswith('Icosphere'): bpy.data.objects.remove(o, do_unlink=True)
arm = [o for o in bpy.data.objects if o.type == 'ARMATURE'][0]
body = [o for o in bpy.data.objects if o.type == 'MESH' and o.data.shape_keys][0]
with bpy.data.libraries.load(SCAN) as (src, dst): dst.objects = ['Scan']
scan = dst.objects[0]; bpy.context.scene.collection.objects.link(scan)
def co(o): return np.array([(o.matrix_world @ v.co)[:] for v in o.data.vertices])
def bone(n): return np.array((arm.matrix_world @ arm.data.bones['mixamorig_' + n].head_local)[:])
PS = co(scan)
# ---------- angles du scan (pose A) : bras et jambes
ang = {}
for s_, nm in ((1, 'Left'), (-1, 'Right')):
    piv = bone(nm + 'Arm'); sl = PS[(PS[:, 0] * s_ > abs(piv[0]) + 0.12) & (PS[:, 2] > 0.8)]
    bout = sl[sl[:, 0] * s_ >= np.percentile(sl[:, 0] * s_, 90)]; d = bout.mean(0) - piv
    ang[nm + 'Arm'] = math.atan2(-d[2], abs(d[0]))
    hip = bone(nm + 'UpLeg'); ft = PS[(PS[:, 2] < 0.1) & (PS[:, 0] * s_ > 0.02)].mean(0)
    ang[nm + 'UpLeg'] = math.atan2(abs(ft[0]) - abs(hip[0]), hip[2] - ft[2]) - math.atan2(abs(bone(nm + 'Foot')[0]) - abs(hip[0]), hip[2] - bone(nm + 'Foot')[2])
print('angles (°)', {k: round(math.degrees(v), 1) for k, v in ang.items()})
def poser(fac):
    bpy.context.view_layer.objects.active = arm; bpy.ops.object.mode_set(mode='POSE')
    for pb in arm.pose.bones: pb.matrix_basis.identity()
    bpy.context.view_layer.update()
    for nm, a in ang.items():
        s_ = 1 if nm.startswith('Left') else -1
        pb = arm.pose.bones['mixamorig_' + nm]; h = arm.matrix_world @ pb.head
        best = None
        for sg in (1, -1):                                      # sens de rotation : celui qui abaisse le bras / écarte la jambe
            R = Matrix.Translation(h) @ Matrix.Rotation(sg * a * fac, 4, 'Y') @ Matrix.Translation(-h)
            t = R @ (arm.matrix_world @ pb.tail)
            sc = -t.z if 'Arm' in nm else t.x * s_
            if best is None or sc > best[0]: best = (sc, R)
        pb.matrix = arm.matrix_world.inverted() @ best[1] @ arm.matrix_world @ pb.matrix; bpy.context.view_layer.update()
    bpy.ops.object.mode_set(mode='OBJECT'); bpy.context.view_layer.update()
poser(1)
# ---------- mandataire : peau + vêtements posés, poids par os (la capuche et la tête exclues hors de la peau)
dg = bpy.context.evaluated_depsgraph_get()
bn = [b.name for b in arm.data.bones]; bi = {n: i for i, n in enumerate(bn)}
PP, WP = [], []
for o in [o for o in bpy.data.objects if o.type == 'MESH' and o.parent == arm and o.name not in ('Hair', 'Bracelet')]:
    me = bpy.data.meshes.new_from_object(o.evaluated_get(dg)); me.transform(o.matrix_world)
    gn = [g.name for g in o.vertex_groups]
    for v, vp in zip(o.data.vertices, me.vertices):
        w = np.zeros(len(bn))
        for g in v.groups:
            if gn[g.group] in bi: w[bi[gn[g.group]]] += g.weight
        if w.sum() < 1e-6: continue
        if o != body and bn[int(w.argmax())] in ('mixamorig_Head', 'mixamorig_HeadTop_End'): continue
        PP.append(vp.co[:]); WP.append(w / w.sum())
PP, WP = np.array(PP), np.array(WP); kd = kdtree.KDTree(len(PP))
for i, p in enumerate(PP): kd.insert(p, i)
kd.balance(); print('mandataire', len(PP), 'sommets')
W = np.zeros((len(PS), len(bn)))
for i, p in enumerate(PS):
    nb = kd.find_n(Vector(p), 8); d = np.array([x[2] for x in nb]); ix = [x[1] for x in nb]
    w = 1 / (d + 0.01) ** 2; W[i] = (WP[ix] * w[:, None]).sum(0) / w.sum()
# poids par chaleur des os (Blender) sur une copie du squelette dont la pose A devient le repos ; mandataire en secours
arm2 = arm.copy(); arm2.data = arm.data.copy(); bpy.context.scene.collection.objects.link(arm2)
bpy.ops.object.select_all(action='DESELECT'); bpy.context.view_layer.objects.active = arm2; arm2.select_set(True)
bpy.ops.object.mode_set(mode='POSE'); bpy.ops.pose.armature_apply(selected=False); bpy.ops.object.mode_set(mode='OBJECT')
for b in arm2.data.bones: b.use_deform = not b.name.endswith(('_End', 'End')) and 'HeadTop' not in b.name
sc2 = scan.copy(); sc2.data = scan.data.copy(); bpy.context.scene.collection.objects.link(sc2)
bpy.ops.object.select_all(action='DESELECT'); sc2.select_set(True); arm2.select_set(True); bpy.context.view_layer.objects.active = arm2
try:
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')
except Exception as e: print('chaleur des os :', e)
gn2 = [g.name for g in sc2.vertex_groups]; Wh = np.zeros_like(W)
for v in sc2.data.vertices:
    for g in v.groups:
        if gn2[g.group] in bi: Wh[v.index, bi[gn2[g.group]]] = g.weight
ok = Wh.sum(1) > 1e-4; print('poids par chaleur : %d / %d sommets' % (ok.sum(), len(ok)))
W[ok] = Wh[ok] / Wh[ok].sum(1, keepdims=True)
bpy.data.objects.remove(sc2, do_unlink=True); bpy.data.objects.remove(arm2, do_unlink=True)
# lissage des poids sur le maillage du scan (transitions douces aux articulations)
E = np.array([e.vertices[:] for e in scan.data.edges])
for _ in range(2):
    acc = np.zeros_like(W); c = np.zeros(len(W)); np.add.at(acc, E[:, 0], W[E[:, 1]]); np.add.at(acc, E[:, 1], W[E[:, 0]]); np.add.at(c, E[:, 0], 1); np.add.at(c, E[:, 1], 1)
    W = 0.5 * W + 0.5 * acc / np.maximum(c, 1)[:, None]
top = np.argsort(-W, 1)[:, :4]; W4 = np.take_along_axis(W, top, 1); W4 /= W4.sum(1, keepdims=True)
# ---------- skinning inverse -> pose T
MB = [np.array(arm.matrix_world @ pb.matrix @ pb.bone.matrix_local.inverted() @ arm.matrix_world.inverted()) for pb in [arm.pose.bones[n] for n in bn]]
R = PS.copy(); MBi = [np.linalg.inv(m) for m in MB]
for i in range(len(PS)):
    R[i] = sum(W4[i, k] * (MBi[top[i, k]] @ np.r_[PS[i], 1])[:3] for k in range(4))   # inverses rigides mélangées (pas de bulle à l'aisselle)
poser(0)
bpy.context.view_layer.objects.active = arm; bpy.ops.object.mode_set(mode='POSE')
for pb in arm.pose.bones: pb.matrix_basis.identity()
bpy.ops.object.mode_set(mode='OBJECT'); bpy.context.view_layer.update()
# ---------- tête et mains : celles du patient (on retire le scan là où sa peau existe, et la tête du scan)
bmB = bmesh.new(); meB = body.data.copy(); meB.transform(body.matrix_world); bmB.from_mesh(meB); TB = BVHTree.FromBMesh(bmB)
dom = [bn[top[i, 0]] for i in range(len(R))]
tete = {'mixamorig_Head', 'mixamorig_HeadTop_End'}
suppr = set()
for i, r in enumerate(R):
    loc, nrm, fi, dist = TB.find_nearest(Vector(r), 0.03)
    if dom[i] in tete or 'Hand' in dom[i] or (r[2] > 1.47 and abs(r[0]) < 0.09) or r[2] > 1.56: suppr.add(i)
# le reste du scan passe sous la peau du patient là où elle existe (cou, avant-bras) : pas de trou, pas de bord déchiqueté visible
bmB.verts.ensure_lookup_table(); bord = np.array([v.co[:] for v in bmB.verts if v.is_boundary]); kdb = kdtree.KDTree(len(bord))
for j, p in enumerate(bord): kdb.insert(p, j)
kdb.balance(); nt = 0
for i, r in enumerate(R):
    if i in suppr: continue
    loc, nrm, fi, dist = TB.find_nearest(Vector(r), 0.035)
    if loc is None: continue
    w = min(1, kdb.find(loc)[2] / 0.02)
    d = (Vector(r) - loc).dot(nrm)
    if abs(r[0]) > 0.33:                                                  # avant-bras : le scan passe au-dessus (le bord de la peau du patient, déchiré, reste caché)
        if d < 0.006: R[i] = R[i] + np.array(nrm[:]) * (0.006 - d); nt += 1
    elif d > -0.003: R[i] = R[i] + np.array(nrm[:]) * (-0.003 - d) * w; nt += 1
print('sommets glissés sous la peau du patient :', nt)
Mi = scan.matrix_world.inverted()
for v, r in zip(scan.data.vertices, R): v.co = Mi @ Vector(r)
scan.data.update()
bm = bmesh.new(); bm.from_mesh(scan.data); bm.verts.ensure_lookup_table()
bmesh.ops.delete(bm, geom=[bm.verts[i] for i in suppr], context='VERTS')
# petits îlots détachés
bm.verts.ensure_lookup_table(); lab = {};
for v in bm.verts:
    if v.index in lab: continue
    st = [v]; lab[v.index] = v.index; grp = [v]
    while st:
        x = st.pop()
        for e in x.link_edges:
            y = e.other_vert(x)
            if y.index not in lab: lab[y.index] = v.index; st.append(y); grp.append(y)
cnt = {}; [cnt.__setitem__(l, cnt.get(l, 0) + 1) for l in lab.values()]
bmesh.ops.delete(bm, geom=[v for v in bm.verts if cnt[lab[v.index]] < 300], context='VERTS')
keep = [v.index for v in bm.verts]   # indices avant to_mesh ? (recalculés ci-dessous)
bm.to_mesh(scan.data); bm.free(); scan.data.update()
print('corps :', len(scan.data.vertices), 'sommets gardés,', len(suppr), 'retirés')
# poids : recalculés sur le maillage coupé (plus proche sommet du scan d'origine en pose T)
kd2 = kdtree.KDTree(len(R))
for i, r in enumerate(R): kd2.insert(r, i)
kd2.balance()
for g in list(scan.vertex_groups): scan.vertex_groups.remove(g)
G = {}
for v in scan.data.vertices:
    j = kd2.find((scan.matrix_world @ v.co))[1]
    for k in range(4):
        if W4[j, k] > 1e-3:
            nm = bn[top[j, k]]
            if nm not in G: G[nm] = scan.vertex_groups.new(name=nm)
            G[nm].add([v.index], float(W4[j, k]), 'REPLACE')
scan.parent = arm; scan.matrix_parent_inverse = arm.matrix_world.inverted()
md = scan.modifiers.new('Armature', 'ARMATURE'); md.object = arm
scan.name = scan.data.name = 'Corps'
bpy.ops.wm.save_as_mainfile(filepath=OUT); print('OK', OUT)
