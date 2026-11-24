# Étape 2 : textures web, cheveux et chouchou de patient_femme recalés sur le crâne, vêtements et matériel médical
# recalculés sur le corps (règles de femme/build.py appliquées dans un repère « patiente v5 »), mastectomie, sauvegarde.
import bpy, bmesh, math, sys, numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
S1, TEX, FEM, OUT = sys.argv[-4:]
TEX = TEX.rstrip('/') + '/'
bpy.ops.wm.open_mainfile(filepath=S1)
arm = bpy.data.objects['Armature']; body = bpy.data.objects['Body']; tete = bpy.data.objects['Tete']
with bpy.data.libraries.load(FEM) as (src, dst): dst.objects = ['Body', 'Hair', 'Chouchou']
FB, FH, FC = dst.objects
print('femme', {m.name: None for m in FB.data.materials}, FB.matrix_world.translation, FB.location)
for o in (FB, FH, FC): bpy.context.scene.collection.objects.link(o); o.parent = None
for m in FB.data.materials: m.name = 'F_' + m.name
def co(o): a = np.empty(len(o.data.vertices) * 3, np.float64); o.data.vertices.foreach_get('co', a); return a.reshape(-1, 3)
def bone_h(n): return np.array((arm.matrix_world @ arm.data.bones['mixamorig_' + n].head_local)[:])

# ---------- classes du corps d'Amanda (os dominant) et de la patiente v5 (matériaux)
PA = co(body); NA = len(PA)
W = np.zeros((NA, len(body.vertex_groups))); gn = [g.name for g in body.vertex_groups]
for v in body.data.vertices:
    for g in v.groups: W[v.index, g.group] = g.weight
dom = np.array(gn)[W.argmax(1)]
isA = np.array([any(k in d for k in ('Arm', 'Hand')) for d in dom]); isL = np.array([any(k in d for k in ('UpLeg', 'Leg', 'Foot', 'Toe')) for d in dom])
crA = PA[(np.abs(PA[:, 0]) < 0.006) & (PA[:, 2] > 0.4)][:, 2].min()
isL = isL & ((PA[:, 2] < crA + 0.03) | np.array([not d.endswith('UpLeg') for d in dom]))     # hanches : tronc
CLS = np.where(isA, 'Peau_bras', np.where(isL, 'Peau_jambes', 'Peau_tronc'))
PF = co(FB); print('z femme', PF[:,2].min(), PF[:,2].max()); VMF = np.empty(len(PF), dtype=object)
for p in FB.data.polygons:
    for vi in p.vertices: VMF[vi] = FB.data.materials[p.material_index].name[2:].split('.')[0]

def anchors(P, trunk, leg, knee, armz, top):
    T = P[trunk]; L = P[trunk | leg]
    crotch = T[(np.abs(T[:, 0]) < 0.006) & (T[:, 2] > 0.4)][:, 2].min()
    def sl(Q, z, dz=0.004): return Q[np.abs(Q[:, 2] - z) < dz]
    zs = np.arange(crotch + 0.3, armz - 0.03, 0.005); bust = zs[np.argmin([sl(T, z)[:, 1].min() for z in zs])]
    zs = np.arange(crotch + 0.12, bust - 0.08, 0.005); waist = zs[np.argmin([np.abs(sl(L, z)[:, 0]).max() for z in zs])]
    za = np.array([0.0, knee, crotch, (crotch + bust) / 2, bust, armz, top])
    prm = []
    for z in za:
        if z <= crotch: Q = sl(L, max(z, 0.06) if z < crotch else z - 0.01, 0.006); Q = Q[Q[:, 0] > 0.004]; hx = Q[:, 0].max(); c = Q[:, 0].mean()
        else: Q = sl(L, min(z, armz - 0.03), 0.004); hx = np.abs(Q[:, 0]).max(); c = 0.0
        prm.append((hx, (Q[:, 1].min() + Q[:, 1].max()) / 2, Q[:, 1].max() - Q[:, 1].min()))
    prm = [prm[0]] + prm + [prm[-1]]; za = np.r_[-0.5, za, top + 0.5]
    return za, np.array(prm), dict(crotch=crotch, waist=waist, bust=bust)
zA, pA, iA = anchors(PA, CLS == 'Peau_tronc', CLS == 'Peau_jambes', bone_h('LeftLeg')[2], bone_h('LeftArm')[2], bone_h('HeadTop_End')[2])
zF, pF, iF = anchors(PF, VMF == 'Peau_tronc', VMF == 'Peau_jambes', 0.465, 1.272, 1.571)
print('repères Amanda', np.round(zA, 3), iA); print('repères v5', np.round(zF, 3), iF)
RX, RY = pF[:, 0] / pA[:, 0], pF[:, 2] / pA[:, 2]
def warp(P):
    z2 = np.interp(P[:, 2], zA, zF); sx = np.interp(z2, zF, RX); sy = np.interp(z2, zF, RY)
    cyA = np.interp(P[:, 2], zA, pA[:, 1]); cyF = np.interp(z2, zF, pF[:, 1])
    return np.c_[P[:, 0] * sx, cyF + (P[:, 1] - cyA) * sy, z2]
def unwarp(Q):
    z = np.interp(Q[:, 2], zF, zA); sx = np.interp(Q[:, 2], zF, RX); sy = np.interp(Q[:, 2], zF, RY)
    cyA = np.interp(z, zA, pA[:, 1]); cyF = np.interp(Q[:, 2], zF, pF[:, 1])
    return np.c_[Q[:, 0] / sx, cyA + (Q[:, 1] - cyF) / sy, z]
assert np.abs(unwarp(warp(PA)) - PA).max() < 1e-6

# ---------- corps « v5 » : copie déformée d'Amanda, matériaux par région
bpy.ops.object.select_all(action='DESELECT'); body.select_set(True); bpy.context.view_layer.objects.active = body
bpy.ops.object.duplicate(); WB = bpy.context.active_object; WB.name = 'BodyW'
WB.data.vertices.foreach_set('co', warp(PA).astype(np.float32).ravel()); WB.data.update()
def matf(name, img=None, alpha=False, color=(0.8, 0.8, 0.8, 1), rough=0.6, spec=0.3):
    m = bpy.data.materials.new(name); m.use_nodes = True
    bs = m.node_tree.nodes['Principled BSDF']; bs.inputs['Roughness'].default_value = rough
    if 'Specular IOR Level' in bs.inputs: bs.inputs['Specular IOR Level'].default_value = spec
    bs.inputs['Base Color'].default_value = color
    return m
WB.data.materials.clear()
for nm in ('Peau_tronc', 'Peau_bras', 'Peau_jambes'): WB.data.materials.append(matf(nm))
idx = {'Peau_tronc': 0, 'Peau_bras': 1, 'Peau_jambes': 2}
for p in WB.data.polygons:
    c = [CLS[v] for v in p.vertices]; p.material_index = idx[max(set(c), key=c.count)]
mat = matf
src_ = open('/home/claude/femme/build.py').read()
code = src_[src_.index('# ---------- vêtements'):src_.index('# ---------- expressions')]
G = dict(globals()); G['body'] = WB; exec(code, G)
NAMES = ['Culotte', 'SoutienGorge', 'Pants', 'Shirt', 'Shoes', 'BasContention', 'CeintureLombaire', 'Corset', 'SoutienGorgeMastectomie', 'ProtheseMammaire_G', 'ProtheseMammaire_D']
bA = bmesh.new(); bA.from_mesh(body.data); BVHA = BVHTree.FromBMesh(bA)
for n in NAMES:
    g = bpy.data.objects[n]; Q = unwarp(co(g))
    g.data.vertices.foreach_set('co', Q.astype(np.float32).ravel()); g.data.update()
    gap = 0.0008 if n.startswith(('Soutien', 'Prothese', 'Bas')) else 0.0015          # rien sous la peau après le retour
    for v in g.data.vertices:
        loc, nrm, fi, dist = BVHA.find_nearest(v.co)
        if loc is not None and dist < 0.03 and (v.co - loc).dot(nrm) < gap: v.co = loc + nrm * gap
    print(n, len(g.data.vertices))
OVER = {'Shirt': ['SoutienGorge', 'SoutienGorgeMastectomie', 'ProtheseMammaire_G', 'ProtheseMammaire_D', 'Culotte'], 'Pants': ['Culotte'],
        'Corset': ['Culotte', 'SoutienGorge'], 'CeintureLombaire': ['Culotte']}
for n, unders in OVER.items():                                    # au-dessus du corps et des couches recouvertes, le long de la normale du corps
    g = bpy.data.objects[n]; bm = bmesh.new(); bm.from_mesh(g.data)
    inner = [v for v in bm.verts if not v.is_boundary]
    trees = [BVHTree.FromObject(bpy.data.objects[u], bpy.context.evaluated_depsgraph_get()) for u in unders]
    for it in range(5):
        if it: bmesh.ops.smooth_vert(bm, verts=inner, factor=0.4, use_axis_x=True, use_axis_y=True, use_axis_z=True)
        for v in bm.verts:
            loc, nrm, fi, dist = BVHA.find_nearest(v.co)
            if loc is None or dist > 0.05: continue
            need = 0.004
            for tr in trees:
                u, un, ui, ud = tr.find_nearest(loc)                  # épaisseur des couches sous ce point du corps
                if u is not None and ud < 0.03 and (u - loc).dot(nrm) > 0 and ((u - loc) - nrm * (u - loc).dot(nrm)).length < 0.006:
                    need = max(need, (u - loc).dot(nrm) + 0.003)
            d_ = (v.co - loc).dot(nrm)
            if d_ < need: v.co = v.co + nrm * (need - d_)
    bm.to_mesh(g.data); bm.free(); g.data.update()

# ---------- mastectomie (formule de la patiente v5, calculée dans son repère puis ramenée)
X = warp(PA); x, y, z = X.T; vm = CLS
body.shape_key_add(name='Basis', from_mix=False)
for side, sg in (('Left', 1), ('Right', -1)):
    ins = (sg * x > 0.005) * (sg * x < 0.17) * (z > 1.05) * (z < 1.26) * (y < 0.0) * (vm == 'Peau_tronc')
    yl = np.interp(z, [1.03, 1.07, 1.24, 1.26], [0, 1, 1, 0])
    yt = -0.092 + 0.19 * (z - 1.08) + 2.5 * np.maximum(0, np.abs(x) - 0.05) ** 2
    w = ins * yl * np.clip(1 - np.maximum(0, sg * x - 0.13) / 0.04, 0, 1)
    Pm = X.copy(); Pm[:, 1] = np.where(w > 0, y + (np.maximum(y, yt) - y) * w, y)
    k = body.shape_key_add(name='Mastectomie_' + side, from_mix=False); k.data.foreach_set('co', unwarp(Pm).astype(np.float32).ravel()); k.value = 0
    print('mastectomie', side, 'sommets', int((w > 0).sum()), 'recul max %.3f' % float(np.abs(unwarp(Pm) - PA).max()))

# ---------- cheveux : crâne de la v5 -> crâne d'Amanda (échelles par axe), puis hors du cuir chevelu
def cranium(P, eye_z):
    C = P[P[:, 2] > eye_z + 0.012]; return C[:, 0].max(), C[:, 1].min(), C[:, 1].max(), C[:, 2].max()
eA = bone_h('LeftEye')[2]; PT = co(tete)
xA, y0A, y1A, tA = cranium(PT, eA)
xF, y0F, y1F, tF = cranium(PF[VMF == 'Peau_visage'], 1.4725)
def front(P, ez):                                    # avant du front, 5 cm au-dessus des yeux
    Q = P[(np.abs(P[:, 0]) < 0.012) & (np.abs(P[:, 2] - ez - 0.05) < 0.006)]; return Q[:, 1].min()
fA, fF = front(PT, eA), front(PF[VMF == 'Peau_visage'], 1.4725)
def hair_map(P):                                     # recalé sur le front (la ligne des cheveux), échelles du crâne
    return np.c_[P[:, 0] * xA / xF, fA + (P[:, 1] - fF) * (y1A - y0A) / (y1F - y0F), eA + (P[:, 2] - 1.4725) * (tA - eA) / (tF - 1.4725)]
bT = bmesh.new(); bT.from_mesh(tete.data); BVHT = BVHTree.FromBMesh(bT)
for o in (FH, FC):
    Q = hair_map(co(o)); o.data.vertices.foreach_set('co', Q.astype(np.float32).ravel()); o.data.update()
    n_in = 0
    for v in o.data.vertices:
        loc, nrm, fi, dist = BVHT.find_nearest(v.co)
        if loc is not None and dist < 0.04 and (v.co - loc).dot(nrm) < 0.002: v.co = loc + nrm * 0.002; n_in += 1
    print(o.name, 'sommets ramenés hors du crâne', n_in, '/', len(o.data.vertices))
    for g in list(o.vertex_groups): o.vertex_groups.remove(g)
    for m in list(o.modifiers): o.modifiers.remove(m)
    o.parent = arm; md = o.modifiers.new('Armature', 'ARMATURE'); md.object = arm
    g = o.vertex_groups.new(name='mixamorig_Head'); g.add(list(range(len(o.data.vertices))), 1.0, 'REPLACE')
FH.name = FH.data.name = 'Hair'; FC.name = FC.data.name = 'Chouchou'
bH = bmesh.new(); bH.from_mesh(FH.data); BVHH = BVHTree.FromBMesh(bH); scalp = np.zeros(len(tete.data.vertices), np.float32)
for v in tete.data.vertices:
    loc, nrm, fi, dist = BVHH.find_nearest(v.co)
    if loc is not None: scalp[v.index] = dist
np.save(TEX + 'scalp_dist.npy', scalp); print('cuir chevelu : sommets à moins de 1 cm des cheveux', int((scalp < 0.01).sum()))

# ---------- nettoyage, textures web
for o in (FB, WB): bpy.data.objects.remove(o, do_unlink=True)
def setimg(matname, base, normal=None):
    m = bpy.data.materials[matname]; nt = m.node_tree
    for nd in nt.nodes:
        if nd.type == 'TEX_IMAGE':
            col = nd.image.colorspace_settings.name == 'Non-Color'
            if col and normal: nd.image = bpy.data.images.load(TEX + normal); nd.image.colorspace_settings.name = 'Non-Color'
            elif not col: nd.image = bpy.data.images.load(TEX + base)
setimg('Peau_visage', 'visage.png', 'visage_n.png'); setimg('Peau_corps', 'corps.png', 'corps_n.png')
setimg('Bouche', 'bouche.png'); setimg('Yeux', 'yeux.png'); setimg('Cils', 'cils.png')
for nm, img in (('Cheveux', 'cheveux.png'), ('Chouchou', 'chouchou.png')):
    import os
    for nd in bpy.data.materials[nm].node_tree.nodes:
        if nd.type == 'TEX_IMAGE': nd.image = bpy.data.images.load((TEX if os.path.exists(TEX + img) else '/home/claude/femme/tex/') + img)   # cheveux teintés si présents dans tex/
for nm in ('Cils', 'Cheveux'):
    m = bpy.data.materials[nm]
    if hasattr(m, 'surface_render_method'): m.surface_render_method = 'BLENDED' if nm == 'Cils' else 'DITHERED'
for o in bpy.data.objects:
    if o.type == 'MESH': o.data.name = o.name
bpy.ops.outliner.orphans_purge(do_recursive=True) if hasattr(bpy.ops.outliner, 'orphans_purge') else None
bpy.ops.wm.save_as_mainfile(filepath=OUT)
print('OK', OUT, sorted(o.name for o in bpy.data.objects))
