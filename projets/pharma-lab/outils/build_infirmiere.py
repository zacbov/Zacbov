# Infirmière (préparatrice) pour le TP habillage : modèle de Tice (nurse_surgical_rigged) remis debout (b1.py -> nurse1.blend),
# matériaux simplifiés, peau cachée sous la tenue, cheveux libres / attachés, bijoux, casaque, surchaussures, 2e paire de gants.
import bpy, bmesh, numpy as np, math, os
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
bpy.ops.wm.open_mainfile(filepath='/home/claude/labo/inf/nurse1.blend')
OUT = '/home/claude/labo/inf/'
arm = [o for o in bpy.data.objects if o.type == 'ARMATURE'][0]
corps = bpy.data.objects['Corps']
def co(o): return np.array([(o.matrix_world @ v.co)[:] for v in o.data.vertices])
def setco(o, Q):
    Mi = o.matrix_world.inverted()
    for v, q in zip(o.data.vertices, Q): v.co = Mi @ Vector(q)
    o.data.update()
def bone(n): return np.array((arm.matrix_world @ arm.data.bones[n].head_local)[:])
def tail(n): return np.array((arm.matrix_world @ arm.data.bones[n].tail_local)[:])
def sm(t): t = np.clip(t, 0, 1); return t * t * (3 - 2 * t)
def bvh(objs):
    bm = bmesh.new()
    for o in objs:
        me = o.data.copy(); me.transform(o.matrix_world); bm.from_mesh(me); bpy.data.meshes.remove(me)
    return BVHTree.FromBMesh(bm)
def lier(o, groupes=None):
    o.parent = arm; o.matrix_parent_inverse = arm.matrix_world.inverted()
    if not any(m.type == 'ARMATURE' for m in o.modifiers):
        md = o.modifiers.new('Armature', 'ARMATURE'); md.object = arm
def poids(o, src=None):
    src = src or corps
    for g in list(o.vertex_groups): o.vertex_groups.remove(g)
    for g in corps.vertex_groups: o.vertex_groups.new(name=g.name)
    md = o.modifiers.new('dt', 'DATA_TRANSFER'); md.object = src; md.use_vert_data = True; md.data_types_verts = {'VGROUP_WEIGHTS'}
    md.vert_mapping = 'POLYINTERP_NEAREST'; md.layers_vgroup_select_src = 'ALL'; md.layers_vgroup_select_dst = 'NAME'
    bpy.context.view_layer.objects.active = o; bpy.ops.object.modifier_apply(modifier='dt'); lier(o)
def tout_os(o, nom):
    for g in list(o.vertex_groups): o.vertex_groups.remove(g)
    g = o.vertex_groups.new(name=nom); g.add(list(range(len(o.data.vertices))), 1.0, 'REPLACE'); lier(o)
def mat_uni(nom, rgb, rough=0.8, metal=0.0):
    m = bpy.data.materials.new(nom); m.use_nodes = True; p = m.node_tree.nodes['Principled BSDF']
    p.inputs['Base Color'].default_value = (*rgb, 1); p.inputs['Roughness'].default_value = rough; p.inputs['Metallic'].default_value = metal
    return m

# ---------- matériaux : couleur (texture réduite à 1024) + normale, rugosité fixe
os.makedirs(OUT + 'tex', exist_ok=True)
ROUGH = {'Body': 0.6, 'Hair': 0.7, 'Glove': 0.5, 'Mask': 0.9, 'material': 0.9, 'material_7': 0.85, 'Bottom': 0.85, 'Shoes': 0.6}
for m in list(bpy.data.materials):
    if not m.node_tree or m.name not in ROUGH: continue
    nt = m.node_tree; P = nt.nodes.get('Principled BSDF')
    base = None
    for l in list(nt.links):
        if l.to_node == P and l.to_socket.name == 'Base Color':
            n = l.from_node
            while n.type != 'TEX_IMAGE' and n.inputs:
                src = [x.links[0].from_node for x in n.inputs if x.is_linked]
                if not src: break
                n = src[0]
            if n.type == 'TEX_IMAGE': base = n
    for l in list(nt.links):
        if l.to_node == P and l.to_socket.name in ('Base Color', 'Roughness', 'Metallic', 'Specular Tint', 'Specular IOR Level'): nt.links.remove(l)
    if base:
        im = base.image; im.scale(min(1024, im.size[0]), min(1024, im.size[1])); nt.links.new(base.outputs['Color'], P.inputs['Base Color'])
        if m.name == 'Hair': nt.links.new(base.outputs['Alpha'], P.inputs['Alpha'])
    P.inputs['Roughness'].default_value = ROUGH[m.name]; P.inputs['Metallic'].default_value = 0
    for n in nt.nodes:
        if n.type == 'TEX_IMAGE' and n.image and n.image.size[0] > 1024: n.image.scale(1024, 1024)
print('matériaux simplifiés')

# ---------- peau cachée sous la tunique, le pantalon et les chaussures (elle les traversait)
CORPS0 = corps.data.copy()
tun, pan, cha = bpy.data.objects['Tunique'], bpy.data.objects['Pantalon'], bpy.data.objects['Chaussures']
BVc = bvh([tun, pan, cha]); PB = co(corps)
N = np.array([(corps.matrix_world.to_3x3() @ v.normal)[:] for v in corps.data.vertices])
cache = np.zeros(len(PB), bool)
for i, (p, n) in enumerate(zip(PB, N)):
    hit = BVc.ray_cast(Vector(p) - Vector(n) * 0.002, Vector(n), 0.06)
    cache[i] = hit[0] is not None
zH = bone('Neck_04')[2] - 0.03
cache &= PB[:, 2] < zH
cache |= (PB[:, 2] < zH) & (np.abs(PB[:, 0]) < 0.30)          # tronc, jambes et pieds toujours sous la tenue : la peau ne doit jamais traverser
bm = bmesh.new(); bm.from_mesh(corps.data); bm.verts.ensure_lookup_table()
dele = [f for f in bm.faces if all(cache[v.index] for v in f.verts)]
bmesh.ops.delete(bm, geom=dele, context='FACES_ONLY'); bm.to_mesh(corps.data); bm.free(); corps.data.update()
print('peau cachée sous la tenue : %d faces retirées' % len(dele))
PB = co(corps)

# ---------- repères
tete_z = PB[:, 2].max(); H = PB[PB[:, 2] > bone('Head_05')[2] - 0.02]
def crane(P):
    t = P[:, 2].max(); S = P[np.abs(P[:, 2] - (t - 0.06)) < 0.006]
    return t, np.abs(S[:, 0]).max(), S[:, 1].min(), S[:, 1].max()
tA, xwA, y0A, y1A = crane(H)
BT = bvh([corps])
print('crâne : sommet %.3f demi-largeur %.3f prof %.3f..%.3f' % (tA, xwA, y0A, y1A))

def importer(path, filtre):
    avant = set(bpy.data.objects)
    (bpy.ops.import_scene.fbx if path.endswith('.fbx') else bpy.ops.import_scene.gltf)(filepath=path)
    nouv = [o for o in bpy.data.objects if o not in avant]; dg = bpy.context.evaluated_depsgraph_get(); out = []
    for o in nouv:
        if o.type == 'MESH' and filtre(o):
            me = bpy.data.meshes.new_from_object(o.evaluated_get(dg)); me.transform(o.matrix_world)
            n = bpy.data.objects.new(o.name + '_f', me); bpy.context.scene.collection.objects.link(n); out.append(n)
    for o in nouv: bpy.data.objects.remove(o, do_unlink=True)
    return out
def joindre(objs, nom):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    if len(objs) > 1: bpy.ops.object.join()
    o = bpy.context.active_object; o.name = o.data.name = nom; return o
def coiffer(HC, PR, nom, mat=None):
    tS, xwS, y0S, y1S = crane(PR); kx, ky = xwA / xwS, (y1A - y0A) / (y1S - y0S); kz = (kx + ky) / 2
    for o in HC:
        Q = co(o); Q = np.c_[Q[:, 0] * kx, y0A + (Q[:, 1] - y0S) * ky, tA + (Q[:, 2] - tS) * kz]
        ecart = 0.0015 if o.data.materials and o.data.materials[0].name.startswith('Scalp') else 0.003
        for i in range(len(Q)):
            loc, nrm, fi, dist = BT.find_nearest(Vector(Q[i]), 0.05)
            if loc is not None and (Vector(Q[i]) - loc).dot(nrm) < ecart: Q[i] = np.array((loc + nrm * ecart)[:])
        setco(o, Q)
        if mat: o.data.materials.clear(); o.data.materials.append(mat)
    h = joindre(HC, nom); tout_os(h, 'Head_05'); return h

# cheveux attachés : queue de cheval (cartes du pack « pony », texture noire d'Amanda)
AS = '/home/claude/assets/'
ref = importer(AS + 'pony/Female_Herad_Mesh.fbx', lambda o: True)[0]; PRp = co(ref); bpy.data.objects.remove(ref, do_unlink=True)
HCp = importer(AS + 'pony/LODs/Female_Adult_001_HairCard_LOD1.fbx', lambda o: True)
mp = bpy.data.materials.new('CheveuxAttaches'); mp.use_nodes = True; nt = mp.node_tree; P = nt.nodes['Principled BSDF']
tx = nt.nodes.new('ShaderNodeTexImage'); tx.image = bpy.data.images.load('/home/claude/mh/vet/tex/pony_auburn.png')
nt.links.new(tx.outputs['Color'], P.inputs['Base Color']); nt.links.new(tx.outputs['Alpha'], P.inputs['Alpha']); P.inputs['Roughness'].default_value = 0.55
if hasattr(mp, 'surface_render_method'): mp.surface_render_method = 'DITHERED'
att = coiffer(HCp, PRp, 'CheveuxAttaches', mp)
# cheveux libres : coiffure longue du pack (style choisi par LIBRE), tournée nuque en arrière
LIBRE = os.environ.get('LIBRE', '002')
for m_ in bpy.data.materials:
    if m_.name in ('Hair', 'Scalp') or m_.name.startswith(('Hair.', 'Scalp.')): m_.name = 'orig_' + m_.name   # sinon l'import renumérote les matériaux du pack
HC = importer(AS + 'a0949a93-hair_pack_part_1.glb', lambda o: o.data.materials and o.data.materials[0].name in ('Hair.' + LIBRE, 'Scalp.' + LIBRE))
sc_ = [o for o in HC if o.data.materials[0].name.startswith('Scalp')]; cx_ = np.mean([co(o).mean(0) for o in sc_], 0)
gard_ = [o for o in HC if np.linalg.norm(co(o).mean(0)[[0, 1]] - cx_[[0, 1]]) < 0.2]
for o in HC:
    if o not in gard_: bpy.data.objects.remove(o, do_unlink=True)
HC = gard_
PR = np.vstack([co(o) for o in HC if o.data.materials[0].name.startswith('Scalp')]); c0 = PR.mean(0)
bas = PR[PR[:, 2] < PR[:, 2].min() + 0.03] - c0
th = math.pi / 2 - math.atan2(bas[:, 1].mean(), bas[:, 0].mean()); R = np.array([[math.cos(th), -math.sin(th), 0], [math.sin(th), math.cos(th), 0], [0, 0, 1]])
for o in HC: setco(o, (co(o) - c0) @ R.T + c0)
PR = (PR - c0) @ R.T + c0
for o in HC:
    m = o.data.materials[0]
    if hasattr(m, 'surface_render_method'): m.surface_render_method = 'DITHERED'
    for nd in m.node_tree.nodes:                                   # même teinte auburn que la queue de cheval
        if nd.type == 'TEX_IMAGE' and nd.image and nd.image.colorspace_settings.name != 'Non-Color':
            im = nd.image; w_, h_ = im.size; px = np.array(im.pixels[:]).reshape(h_, w_, 4)
            lum = px[..., :3].mean(2, keepdims=True); tgt = np.array([96, 50, 28]) / 255
            px[..., :3] = np.clip(lum / max(lum[px[..., 3] > 0.5].mean(), 1e-3) * tgt * 1.1, 0, 1)
            ni = bpy.data.images.new('tint_' + im.name, w_, h_, alpha=True); ni.pixels = px.ravel(); ni.pack(); nd.image = ni
lib = coiffer(HC, PR, 'CheveuxLibres')
# mèches qui tombent devant le visage (on aurait dit une cicatrice) : retirées
PH = co(lib); yv = H[(np.abs(H[:, 0]) < 0.03) & (H[:, 2] > bone('Head_05')[2])][:, 1].min()
zf0, zf1 = bone('Head_05')[2] - 0.06, bone('Head_05')[2] + 0.12
bmh = bmesh.new(); bmh.from_mesh(lib.data); bmh.verts.ensure_lookup_table()
devant = [f for f in bmh.faces if any((PH[v.index, 1] < yv + 0.035) and (np.abs(PH[v.index, 0]) < 0.065) and (zf0 < PH[v.index, 2] < zf1) for v in f.verts)]
bmesh.ops.delete(bmh, geom=devant, context='FACES_ONLY'); bmh.to_mesh(lib.data); bmh.free(); print('mèches du visage retirées', len(devant))
bpy.data.objects.remove(bpy.data.objects['Cheveux'], do_unlink=True)   # cartes d'origine (courtes, trouées), toujours sous la charlotte
print('cheveux : attachés %d, libres %d sommets' % (len(att.data.vertices), len(lib.data.vertices)))

# ---------- bijoux (accrochés aux os)
or_ = mat_uni('Or', (0.95, 0.72, 0.32), 0.25, 1.0); arg = mat_uni('Argent', (0.85, 0.85, 0.86), 0.25, 1.0); cad = mat_uni('Cadran', (0.08, 0.09, 0.12), 0.4)
def objet(nom, bm_, os_, mats):
    me = bpy.data.meshes.new(nom); bm_.to_mesh(me); bm_.free(); o = bpy.data.objects.new(nom, me); bpy.context.scene.collection.objects.link(o)
    for m in mats: me.materials.append(m)
    tout_os(o, os_); return o
def rayon_a(p, d, maxd=0.06):
    hit = BT.ray_cast(Vector(p), Vector(d), maxd); return np.array(hit[0][:]) if hit[0] is not None else None
# bague : annulaire gauche, entre la 1re et la 2e phalange
a, b = bone('LeftHandRing1_019'), bone('LeftHandRing2_020'); ax = (b - a) / np.linalg.norm(b - a); c = a + (b - a) * 0.45
rs = []
for k in range(12):
    t = 2 * math.pi * k / 12; u = np.cross(ax, [0, 0, 1]); u /= np.linalg.norm(u); v = np.cross(ax, u); d = math.cos(t) * u + math.sin(t) * v
    h = rayon_a(c + d * 0.03, -d, 0.03); rs.append(np.linalg.norm(h - c) if h is not None else 0.008)
r = float(np.median(rs)) + 0.0012
bm_ = bmesh.new(); bmesh.ops.create_circle(bm_, cap_ends=False, segments=24, radius=1)
ring = bmesh.ops.extrude_edge_only(bm_, edges=bm_.edges[:]);
bm_.free(); bm_ = bmesh.new()
geo = bmesh.ops.create_cone(bm_, cap_ends=False, segments=24, radius1=r, radius2=r, depth=0.004)
bmesh.ops.create_icosphere(bm_, subdivisions=1, radius=0.0022, matrix=Matrix.Translation((0, r + 0.0012, 0)))
Rm = Vector((0, 0, 1)).rotation_difference(Vector(ax)).to_matrix().to_4x4(); bmesh.ops.transform(bm_, matrix=Matrix.Translation(Vector(c)) @ Rm, verts=bm_.verts)
for f in bm_.faces: f.smooth = True
bague = objet('Bague', bm_, 'LeftHandRing1_019', [or_])
# montre : poignet gauche (bracelet + cadran sur le dessus)
a, b = bone('LeftForeArm_08'), bone('LeftHand_09'); ax = (b - a) / np.linalg.norm(b - a); c = b - ax * 0.035
rs = []
for k in range(16):
    t = 2 * math.pi * k / 16; u = np.array([0., 0, 1]); u -= ax * (u @ ax); u /= np.linalg.norm(u); v = np.cross(ax, u); d = math.cos(t) * u + math.sin(t) * v
    h = rayon_a(c + d * 0.06, -d, 0.06); rs.append(np.linalg.norm(h - c) if h is not None else 0.03)
r = float(np.percentile(rs, 75)) + 0.002
bm_ = bmesh.new(); bmesh.ops.create_cone(bm_, cap_ends=False, segments=32, radius1=r, radius2=r, depth=0.018)
for f in bm_.faces: f.material_index = 0
d0 = len(bm_.faces)
bmesh.ops.create_cone(bm_, cap_ends=True, segments=32, radius1=0.016, radius2=0.016, depth=0.006, matrix=Matrix.Translation((0, 0, 0)) @ Matrix.Rotation(math.pi / 2, 4, 'Y') @ Matrix.Translation((-(r + 0.003), 0, 0)))
for f in bm_.faces[d0:]: f.material_index = 1
up = np.array([0., 0, 1]); up -= ax * (up @ ax); up /= np.linalg.norm(up)
Rm = Matrix((list(np.cross(up, ax)) + [0], list(up) + [0], list(ax) + [0], [0, 0, 0, 1])).transposed()
bmesh.ops.transform(bm_, matrix=Matrix.Translation(Vector(c)) @ Rm, verts=bm_.verts)
for f in bm_.faces: f.smooth = True
montre = objet('Montre', bm_, 'LeftForeArm_08', [cad, arg])
# boucles d'oreilles : lobe = point de la peau le plus bas de l'oreille (x extrême à hauteur des yeux - 3 cm)
zo = bone('Head_05')[2] + 0.02
for s, nom in ((1, 'BoucleG'), (-1, 'BoucleD')):
    S = H[(np.sign(H[:, 0]) == s) & (np.abs(H[:, 2] - zo) < 0.03)]
    e = S[np.argmax(np.abs(S[:, 0]))]; L = H[(np.linalg.norm(H[:, [0, 1]] - e[[0, 1]], axis=1) < 0.02) & (np.sign(H[:, 0]) == s)]
    lobe = L[np.argmin(L[:, 2])] + np.array([s * 0.001, 0, 0.004])
    bm_ = bmesh.new(); bmesh.ops.create_icosphere(bm_, subdivisions=2, radius=0.0035, matrix=Matrix.Translation(Vector(lobe)))
    for f in bm_.faces: f.smooth = True
    objet(nom, bm_, 'Head_05', [or_])
print('bijoux posés')

# ---------- surchaussures : chaussures gonflées de 6 mm, bleu clair non tissé
def gonfle(src, nom, e, mat):
    me = src.data.copy(); o = bpy.data.objects.new(nom, me); bpy.context.scene.collection.objects.link(o); o.matrix_world = src.matrix_world
    for v in me.vertices: v.co += v.normal * e
    me.materials.clear(); me.materials.append(mat)
    for m in list(o.modifiers): o.modifiers.remove(m)
    for g in src.vertex_groups: o.vertex_groups.new(name=g.name)
    lier(o); return o
sur = gonfle(cha, 'Surchaussures', 0.006, mat_uni('Tissu_surchaussures', (0.45, 0.66, 0.86), 0.95))
gants2 = gonfle(bpy.data.objects['Gants'], 'Gants2', 0.0012, mat_uni('Nitrile_bleu', (0.30, 0.42, 0.86), 0.45))
g1 = bpy.data.objects['Gants']; g1.data.materials.clear(); g1.data.materials.append(mat_uni('Gants_blancs', (0.92, 0.92, 0.9), 0.45))

# ---------- casaque : tissu tombant (anneaux par tranche, enveloppe convexe du corps et de la tenue), sans le relief du corps
from scipy.spatial import ConvexHull
BVt = bvh([tun, pan])
P0 = np.array([v.co[:] for v in CORPS0.vertices]); PT = co(tun); PL = co(pan)
xs_lim = abs(bone('LeftArm_07')[0]) + 0.01
zbas = bone('LeftLeg_045')[2] - 0.14
sh_band = P0[(np.abs(P0[:, 0]) > xs_lim - 0.07) & (np.abs(P0[:, 0]) < xs_lim - 0.01)]
zTop = sh_band[:, 2].max() - 0.005
zNeck = bone('Neck_04')[2] + 0.02
zAis = bone('LeftArm_07')[2] - 0.015
NA = 56; TH = np.linspace(0, 2 * math.pi, NA, endpoint=False); DIRS = np.c_[np.cos(TH), np.sin(TH)]
def rayon_hull(poly, c):
    out = np.zeros(NA)
    for k, d in enumerate(DIRS):
        best = 0
        for a_, b_ in zip(poly, np.roll(poly, -1, 0)):
            M_ = np.array([[d[0], a_[0] - b_[0]], [d[1], a_[1] - b_[1]]])
            try: r_, u_ = np.linalg.solve(M_, a_ - c)
            except np.linalg.LinAlgError: continue
            if r_ > 0 and -1e-6 <= u_ <= 1 + 1e-6: best = max(best, r_)
        out[k] = best
    return out
ZL = np.arange(zbas, zTop + 1e-6, 0.012)
CEN, RAD = [], []
for z in ZL:
    xl_ = 0.165 if z > 1.345 else 0.16         # sous l'aisselle : pas la section du bras (en T, il est à la même hauteur)
    U = np.vstack([Q_[(np.abs(Q_[:, 2] - z) < 0.01) & (np.abs(Q_[:, 0]) < xl_)] for Q_ in (P0, PT, PL)])
    pts = U[:, [0, 1]]
    h = ConvexHull(pts); poly = pts[h.vertices]; c = poly.mean(0)
    CEN.append(c); RAD.append((poly, c))
CEN = np.array(CEN)
for _ in range(6): CEN[1:-1] = 0.25 * CEN[:-2] + 0.5 * CEN[1:-1] + 0.25 * CEN[2:]      # axe du tissu lissé
CEN[:, 0] = 0
R_ = np.array([rayon_hull(poly, CEN[i]) for i, (poly, c) in enumerate(RAD)])
zt_ = bone('Spine2_03')[2] + 0.06                                                      # sous la poitrine : le tissu tombe
marge = np.where(ZL < bone('Spine_01')[2], 0.022, np.where(ZL > zAis - 0.05, 0.022, 0.016))[:, None]
R_ = R_ + marge
for i in range(len(ZL) - 2, -1, -1):
    if ZL[i] < zt_: R_[i] = np.maximum(R_[i], R_[i + 1] - (0.0015 if ZL[i] > bone('LeftUpLeg_044')[2] else 0.0008))
for _ in range(4):                                                                     # lissage autour et le long
    R_ = 0.5 * R_ + 0.25 * (np.roll(R_, 1, 1) + np.roll(R_, -1, 1))
    R_[1:-1] = 0.5 * R_[1:-1] + 0.25 * (R_[:-2] + R_[2:])
# empiècement : des épaules au col (anneau du cou + 1,2 cm)
Nk = P0[(np.abs(P0[:, 2] - zNeck) < 0.01) & (np.abs(P0[:, 0]) < 0.1)][:, [0, 1]]
hn = ConvexHull(Nk); cn = Nk[hn.vertices].mean(0); cn[0] = 0; Rn = rayon_hull(Nk[hn.vertices], cn) + 0.008
rings_xyz = [np.c_[CEN[i][0] + R_[i] * DIRS[:, 0], CEN[i][1] + R_[i] * DIRS[:, 1], np.full(NA, ZL[i])] for i in range(len(ZL))]
for k in range(1, 5):
    t_ = k / 4; e_ = t_ * t_ * (3 - 2 * t_)
    c_ = CEN[-1] * (1 - e_) + cn * e_; r_ = R_[-1] * (1 - e_) + Rn * e_; z_ = zTop + (zNeck - zTop) * t_
    rings_xyz.append(np.c_[c_[0] + r_ * DIRS[:, 0], c_[1] + r_ * DIRS[:, 1], np.full(NA, z_)])
CEN_all = np.vstack([CEN] + [CEN[-1] * (1 - (k / 4) ** 2 * (3 - 2 * k / 4)) + cn * ((k / 4) ** 2 * (3 - 2 * k / 4)) for k in range(1, 5)])
bmc = bmesh.new(); RV = [[bmc.verts.new(tuple(p)) for p in ring] for ring in rings_xyz]
for r0, r1 in zip(RV, RV[1:]):
    for k in range(NA): bmc.faces.new([r0[k], r0[(k + 1) % NA], r1[(k + 1) % NA], r1[k]])
bmesh.ops.recalc_face_normals(bmc, faces=bmc.faces[:])
mc = bpy.data.meshes.new('Casaque'); bmc.to_mesh(mc); bmc.free(); cas = bpy.data.objects.new('Casaque', mc); bpy.context.scene.collection.objects.link(cas)
Q = co(cas)
for it in range(2):                                    # garde-fou : au-dessus de la tunique et du pantalon
    for i in range(len(Q)):
        loc, nrm, fi, dist = BVt.find_nearest(Vector(Q[i]), 0.1)
        if loc is not None and (Vector(Q[i]) - loc).dot(nrm) < 0.01: Q[i] = np.array((loc + nrm * 0.011)[:])
    G_ = Q.reshape(len(rings_xyz), NA, 3)                          # lissage vertical (efface les marches entre anneaux), on ne rentre jamais
    for _ in range(8):
        S_ = G_.copy(); S_[1:-1] = 0.5 * G_[1:-1] + 0.25 * (G_[:-2] + G_[2:])
        S_ = 0.6 * S_ + 0.2 * (np.roll(S_, 1, 1) + np.roll(S_, -1, 1))
        ax_ = np.c_[CEN_all, np.zeros(len(rings_xyz))][:, None, :]
        r0 = np.linalg.norm((G_ - ax_)[..., :2], axis=2); r1 = np.linalg.norm((S_ - ax_)[..., :2], axis=2)
        k_ = np.maximum(r1, r0 * 0.995) / np.maximum(r1, 1e-6)
        S_[..., :2] = ax_[..., :2] + (S_ - ax_)[..., :2] * k_[..., None]; S_[..., 2] = G_[..., 2]
        G_ = S_
    Q = G_.reshape(-1, 3)
setco(cas, Q)
print('casaque : %d anneaux, ourlet à %.2f m, col à %.2f m' % (len(rings_xyz), zbas, zNeck))
mcas = mat_uni('Casaque_non_tisse', (0.78, 0.86, 0.95), 0.95); mcas.use_backface_culling = False
cas.data.materials.append(mcas)
# manches : tubes de l'épaule au poignet, au-dessus de la peau du bras et des manches de la tunique
PT = co(tun); P0 = np.array([v.co[:] for v in CORPS0.vertices]); manches = []
for s_, n in ((1, 'Left'), (-1, 'Right')):
    sh = bone(n + 'Arm_' + ('07' if s_ > 0 else '026')); wr_ = bone(n + 'Hand_' + ('09' if s_ > 0 else '028'))
    xs0, xs1 = abs(sh[0]) - 0.06, abs(wr_[0]) - 0.015
    bmm = bmesh.new(); rings = []
    for x in np.linspace(xs0, xs1, 22):
        t_ = (x - abs(sh[0])) / (abs(wr_[0]) - abs(sh[0])); c_ = sh + (wr_ - sh) * np.clip(t_, 0, 1)
        S = P0[(np.sign(P0[:, 0]) == s_) & (np.abs(np.abs(P0[:, 0]) - x) < 0.022) & (np.abs(P0[:, 2] - c_[2]) < 0.15) & (np.abs(P0[:, 1]) < 0.15)]
        St = PT[(np.sign(PT[:, 0]) == s_) & (np.abs(np.abs(PT[:, 0]) - x) < 0.02) & (np.abs(PT[:, 2] - c_[2]) < 0.15) & (np.abs(PT[:, 1]) < 0.15)]
        U = np.vstack([S, St]) if len(St) else S
        if len(U) >= 4:                                       # seulement autour de l'axe du bras (pas le flanc ni l'épaule)
            S2 = S[np.abs(S[:, 2] - c_[2]) < 0.07]; m_ = np.median(S2 if len(S2) >= 3 else U, 0)
            U = U[np.hypot(U[:, 1] - m_[1], U[:, 2] - m_[2]) < 0.075]
        if len(U) < 4:
            if rings: rings.append([bmm.verts.new(v.co + Vector((s_ * (x - prevx), 0, 0))) for v in rings[-1]]); prevx = x
            continue
        prevx = x
        cy, cz = (U[:, 1].min() + U[:, 1].max()) / 2, (U[:, 2].min() + U[:, 2].max()) / 2
        ry, rz = (U[:, 1].max() - U[:, 1].min()) / 2 + 0.02, (U[:, 2].max() - U[:, 2].min()) / 2 + 0.02
        if x < abs(sh[0]) + 0.03: ry, rz = ry + 0.006, rz + 0.006
        rings.append([bmm.verts.new((s_ * x, cy + ry * math.cos(a_), cz + rz * math.sin(a_))) for a_ in np.linspace(0, 2 * math.pi, 28, endpoint=False)])
    # lissage des rayons le long du bras (pas de marches)
    R_ = np.array([[v.co[:] for v in r] for r in rings])
    for _ in range(8): R_[1:-1] = 0.25 * R_[:-2] + 0.5 * R_[1:-1] + 0.25 * R_[2:]
    for r, rr in zip(rings, R_):
        for v, q in zip(r, rr): v.co = Vector(q)
    for r0, r1 in zip(rings, rings[1:]):
        for k in range(28): bmm.faces.new([r0[k], r0[(k + 1) % 28], r1[(k + 1) % 28], r1[k]])
    bmesh.ops.recalc_face_normals(bmm, faces=bmm.faces[:])
    for f in bmm.faces: f.smooth = True
    mm = bpy.data.meshes.new('Manche' + n); bmm.to_mesh(mm); bmm.free(); om = bpy.data.objects.new('Manche' + n, mm); bpy.context.scene.collection.objects.link(om)
    om.data.materials.append(mcas); manches.append(om)
cas = joindre([cas] + manches, 'Casaque')
# fusion tronc + manches en une seule surface (remaillage voxel), puis épaules lissées posées sur le corps
bmf = bmesh.new(); bmf.from_mesh(cas.data); bmesh.ops.holes_fill(bmf, edges=bmf.edges[:], sides=0); bmf.to_mesh(cas.data); bmf.free()
md = cas.modifiers.new('rm', 'REMESH'); md.mode = 'VOXEL'; md.voxel_size = 0.006
dg = bpy.context.evaluated_depsgraph_get(); mev = bpy.data.meshes.new_from_object(cas.evaluated_get(dg)); cas.modifiers.remove(md)
old = cas.data; cas.data = mev; mev.name = 'Casaque'; bpy.data.meshes.remove(old)
cas.data.materials.clear(); cas.data.materials.append(mcas)
xpoi = abs(bone('LeftHand_09')[0]) - 0.015
bmf = bmesh.new(); bmf.from_mesh(cas.data)
Mw = cas.matrix_world
kill = [f for f in bmf.faces if all(((Mw @ v.co).z < zbas + 0.004) or ((Mw @ v.co).z > zNeck - 0.004) or ((Mw @ v.co).z > zNeck - 0.022 - 0.008 * min(1, max(0, (cn[1] - (Mw @ v.co).y) / 0.05)) and abs((Mw @ v.co).x) < 0.085) or (abs((Mw @ v.co).x) > xpoi - 0.004) for v in f.verts)]
bmesh.ops.delete(bmf, geom=kill, context='FACES')
bmesh.ops.delete(bmf, geom=[v for v in bmf.verts if not v.link_faces], context='VERTS')
vu = set(); iles = []                                   # îlots : on ne garde que le plus grand
for f0 in bmf.faces:
    if f0 in vu: continue
    pile = [f0]; ile = []
    while pile:
        f = pile.pop()
        if f in vu: continue
        vu.add(f); ile.append(f)
        for e in f.edges:
            for g in e.link_faces:
                if g not in vu: pile.append(g)
    iles.append(ile)
iles.sort(key=len)
bmesh.ops.delete(bmf, geom=[f for ile in iles[:-1] for f in ile], context='FACES')
bmesh.ops.delete(bmf, geom=[v for v in bmf.verts if not v.link_faces], context='VERTS')
print('îlots retirés', len(iles) - 1)
bmf.to_mesh(cas.data); bmf.free()
Q = co(cas); E = np.array([e.vertices[:] for e in cas.data.edges]); nV = len(Q)
bord = np.zeros(nV, bool)
bmf = bmesh.new(); bmf.from_mesh(cas.data); bmf.verts.ensure_lookup_table()
for v in bmf.verts: bord[v.index] = v.is_boundary
bmf.free()
deg = np.bincount(E.ravel(), minlength=nV).astype(float)
def lap(X):
    S = np.zeros_like(X); np.add.at(S, E[:, 0], X[E[:, 1]]); np.add.at(S, E[:, 1], X[E[:, 0]]); return S / np.maximum(deg, 1)[:, None] - X
SRC_b = bpy.data.objects.new('Corps0b', CORPS0); bpy.context.scene.collection.objects.link(SRC_b)
BVg = bvh([SRC_b, pan]); bpy.data.objects.remove(SRC_b, do_unlink=True)
BVk = bvh([bpy.data.objects.new('k0', CORPS0)])
pose_ = np.clip((Q[:, 2] - (zAis - 0.01)) / 0.07, 0, 1)            # au-dessus des aisselles : le tissu repose sur les épaules
zone_ = np.clip((Q[:, 2] - (zAis - 0.10)) / 0.07, 0, 1)             # zone lissée (épaules, haut des manches)
def colle(Q, d0, w):
    for i in np.where(w > 0)[0]:
        loc, nrm, fi, dist = BVk.find_nearest(Vector(Q[i]), 0.12)
        if loc is None: continue
        Q[i] = Q[i] * (1 - w[i]) + np.array((loc + nrm * d0)[:]) * w[i]
    return Q
def garde(Q, d0, w):
    for i in np.where(w > 0)[0]:
        loc, nrm, fi, dist = BVk.find_nearest(Vector(Q[i]), 0.08)
        if loc is not None and (Vector(Q[i]) - loc).dot(nrm) < d0: Q[i] = np.array((loc + nrm * d0)[:])
    return Q
z_av = Q[:, 2].copy(); Q = colle(Q, 0.016, pose_); Q[:, 2] = np.minimum(Q[:, 2], z_av + 0.003)
for it in range(5):
    for _ in range(4):
        L = lap(Q); Q[~bord] += (0.5 * zone_[:, None] * L)[~bord]; L = lap(Q); Q[~bord] -= (0.53 * zone_[:, None] * L)[~bord]
    Q = garde(Q, 0.013, zone_); Q[:, 2] = np.minimum(Q[:, 2], z_av + 0.003)
for it in range(4):
    Q = garde(Q, 0.011, np.ones(len(Q)))
    for _ in range(4):
        L = lap(Q); Q[~bord] += 0.5 * L[~bord]; L = lap(Q); Q[~bord] -= 0.53 * L[~bord]
Q = garde(Q, 0.006, np.ones(len(Q)))
# poignets : poignet élastique de la casaque, serré juste au-dessus du gant
PG = co(gants2)
for s_, n in ((1, 'Left'), (-1, 'Right')):
    G_ = PG[np.sign(PG[:, 0]) == s_]; xg0 = np.abs(G_[:, 0]).min()
    fa, ha = bone(n + 'ForeArm_' + ('08' if s_ > 0 else '027')), bone(n + 'Hand_' + ('09' if s_ > 0 else '028'))
    axe = lambda x: fa[1:] + (ha[1:] - fa[1:]) * (x - abs(fa[0])) / (abs(ha[0]) - abs(fa[0]))
    bande = G_[np.abs(np.abs(G_[:, 0]) - (xg0 + 0.006)) < 0.005]
    rg = np.percentile(np.hypot(*(bande[:, 1:] - axe(xg0 + 0.006)).T), 60)
    for i in np.where((np.sign(Q[:, 0]) == s_) & (np.abs(Q[:, 0]) > xg0 - 0.035))[0]:
        x_ = abs(Q[i, 0]); c_ = axe(x_); d_ = Q[i, 1:] - c_; r_ = np.hypot(*d_)
        t_ = sm((x_ - (xg0 - 0.035)) / 0.03); cible = rg + 0.005
        if r_ > cible: Q[i, 1:] = c_ + d_ * ((r_ * (1 - t_) + cible * t_) / r_)
    print('poignet', n, 'gant dès x=%.3f, rayon %.3f' % (xg0, rg))
setco(cas, Q)
md = cas.modifiers.new('dec', 'DECIMATE'); md.ratio = 0.45
dg = bpy.context.evaluated_depsgraph_get(); mev = bpy.data.meshes.new_from_object(cas.evaluated_get(dg)); cas.modifiers.remove(md)
old = cas.data; cas.data = mev; mev.name = 'Casaque'; bpy.data.meshes.remove(old)
# encolure : bord lissé le long de la boucle, sans pointe devant
bmf = bmesh.new(); bmf.from_mesh(cas.data); bmf.transform(cas.matrix_world)
nb0 = [v for v in bmf.verts if v.is_boundary and v.co.z > zAis + 0.02]; vu = set(); boucles = []
for v0 in nb0:
    if v0 in vu: continue
    pile = [v0]; b_ = []
    while pile:
        v = pile.pop()
        if v in vu: continue
        vu.add(v); b_.append(v); pile += [e.other_vert(v) for e in v.link_edges if e.is_boundary]
    boucles.append(b_)
nb = max(boucles, key=len)
for b_ in boucles:
    if b_ is nb or abs(b_[0].co.x) > 0.45: continue
    print('trou rebouché vers', [round(x, 3) for x in sum((v.co for v in b_), Vector()) / len(b_)])
    sb = set(b_); bmesh.ops.holes_fill(bmf, edges=[e for e in bmf.edges if e.is_boundary and e.verts[0] in sb and e.verts[1] in sb], sides=0)
bmesh.ops.triangulate(bmf, faces=[f for f in bmf.faces if len(f.verts) > 4])
print('encolure', len(nb), 'sommets ; autres boucles', [len(b) for b in boucles if b is not nb])
for _ in range(25):
    nv = {}
    for v in nb:
        vs = [e.other_vert(v) for e in v.link_edges if e.is_boundary]
        if len(vs) == 2: nv[v] = (v.co + vs[0].co + vs[1].co) / 3
    for v, p in nv.items(): v.co = p
for v in nb: v.co.z = min(v.co.z, zNeck - 0.018)
bmesh.ops.recalc_face_normals(bmf, faces=bmf.faces[:])
_t = [f for f in bmf.faces if abs(f.calc_center_median().x) < 0.12 and 0.9 < f.calc_center_median().z < 1.3]
if sum(1 for f in _t if (f.calc_center_median().y - 0.05) * f.normal.y + f.calc_center_median().x * f.normal.x > 0) < len(_t) / 2:
    bmesh.ops.reverse_faces(bmf, faces=bmf.faces[:]); print('normales retournées')
bmf.transform(cas.matrix_world.inverted()); bmf.to_mesh(cas.data); bmf.free()
for f in cas.data.polygons: f.use_smooth = True
SRC0 = bpy.data.objects.new('Corps0', CORPS0); bpy.context.scene.collection.objects.link(SRC0)
for g in corps.vertex_groups: SRC0.vertex_groups.new(name=g.name)
poids(cas, SRC0); bpy.data.objects.remove(SRC0, do_unlink=True)
# tronc (hors épaules) : pas d'os du bras ; sinon le tronc gonfle quand les bras descendent
gn = {g.index: g.name for g in cas.vertex_groups}
BRAS = lambda n: any(k in n for k in ('Arm', 'Hand'))
Qc = co(cas)
for v in cas.data.vertices:
    x_, z_ = abs(Qc[v.index, 0]), Qc[v.index, 2]
    manche_ = x_ > 0.16 and abs(z_ - bone('LeftArm_07')[2]) < 0.085
    tronc = (not manche_) and (x_ < 0.125 or z_ < zAis - 0.045)
    if not tronc: continue
    gs = [(g.group, g.weight) for g in v.groups]
    garde_ = [(gi_, w) for gi_, w in gs if not BRAS(gn[gi_])]
    if not garde_: garde_ = [(cas.vertex_groups['Spine2_03'].index, 1.0)]
    tot = sum(w for _, w in garde_) or 1
    for gi_, w in gs: cas.vertex_groups[gi_].remove([v.index])
    for gi_, w in garde_: cas.vertex_groups[gi_].add([v.index], w / tot, 'REPLACE')
print('casaque', len(cas.data.vertices), 'sommets')

for o in bpy.data.objects:
    if o.type == 'MESH': o.data.name = o.name
bpy.ops.wm.save_as_mainfile(filepath=OUT + os.environ.get('SORTIE', 'nurse2.blend'))
print('OK')
