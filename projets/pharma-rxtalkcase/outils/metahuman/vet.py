# Étape 3 : vêtements et coiffure fournis (t-shirt / haut, jean, ponytail ou coiffure du pack) ajustés sur le patient MetaHuman.
# usage : python3 vet.py -- in=<s2.blend> out=<s3.blend> haut=tshirt|top coul_haut=r,g,b cheveux=pony|pack:004 coul_chev=r,g,b tex_pony=<png>
import bpy, bmesh, numpy as np, sys, os, math
from mathutils import Vector, Quaternion, Matrix
from mathutils.bvhtree import BVHTree
A = dict(x.split('=', 1) for x in sys.argv[sys.argv.index('--') + 1:])
AS, VT = '/home/claude/assets/', '/home/claude/mh/vet/tex/'
bpy.ops.wm.open_mainfile(filepath=A['in']); bpy.ops.file.make_paths_absolute()
for im in bpy.data.images:                                               # chemins relatifs au dossier de travail de l'étape 2
    if im.filepath and not im.filepath.startswith('/'):
        d0 = os.path.dirname(os.path.abspath(A['in'])); rel = im.filepath.lstrip('/')
        for d in (d0, os.path.dirname(d0), '/home/claude/mh/build'):
            if os.path.exists(os.path.join(d, rel)): im.filepath = os.path.join(d, rel); im.reload(); break
arm = [o for o in bpy.data.objects if o.type == 'ARMATURE'][0]
body, tete = bpy.data.objects['Body'], bpy.data.objects['Tete']
def co(o): return np.array([(o.matrix_world @ v.co)[:] for v in o.data.vertices])
def setco(o, Q):
    Mi = o.matrix_world.inverted()
    for v, q in zip(o.data.vertices, Q): v.co = Mi @ Vector(q)
    o.data.update()
def bone(n): return np.array((arm.matrix_world @ arm.data.bones['mixamorig_' + n].head_local)[:])
def sm(t): t = np.clip(t, 0, 1); return t * t * (3 - 2 * t)
def bvh(objs):
    bm = bmesh.new()
    dg = bpy.context.evaluated_depsgraph_get()
    for o in objs:
        me = bpy.data.meshes.new_from_object(o.evaluated_get(dg)); me.transform(o.matrix_world); bm.from_mesh(me); bpy.data.meshes.remove(me)
    return BVHTree.FromBMesh(bm)

def importer(path, filtre):
    """importe un glb/fbx ; renvoie des objets maillage figés (modificateurs appliqués, repère monde, sans parent)"""
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

def aretes(o):
    E = np.array([e.vertices[:] for e in o.data.edges]); return E
def lisse(D, E, n, it):
    for _ in range(it):
        acc = np.zeros_like(D); c = np.zeros(n)
        np.add.at(acc, E[:, 0], D[E[:, 1]]); np.add.at(acc, E[:, 1], D[E[:, 0]]); np.add.at(c, E[:, 0], 1); np.add.at(c, E[:, 1], 1)
        D = 0.5 * D + 0.5 * acc / np.maximum(c, 1)[:, None]
    return D

BV = bvh([body, tete]); PB = co(body)
def souder(o, dist=2e-5):
    bm = bmesh.new(); bm.from_mesh(o.data); bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=dist); bm.to_mesh(o.data); bm.free(); o.data.update()
def ajuster(o, dmax, unders=(), it=22):
    """aisance : chaque sommet entre (épaisseur des couches dessous + 4 mm) et dmax au-dessus du corps ;
       la correction est lissée sur le maillage (les plis du vêtement sont gardés)"""
    trees = [bvh([bpy.data.objects[u]]) for u in unders if u in bpy.data.objects]
    E = aretes(o); P = co(o); n = len(P)
    for k in range(it):
        D = np.zeros_like(P); m = np.zeros(n, bool)
        for i in range(n):
            loc, nrm, fi, dist = BV.find_nearest(Vector(P[i]), 0.4)
            if loc is None: continue
            need = 0.004
            for tr in trees:
                u, un, ui, ud = tr.find_nearest(loc, 0.03)
                if u is not None and (u - loc).dot(nrm) > 0 and ((u - loc) - nrm * (u - loc).dot(nrm)).length < 0.006: need = max(need, (u - loc).dot(nrm) + 0.003)
            d = (Vector(P[i]) - loc).dot(nrm); dm = dmax(P[i][2]) if callable(dmax) else dmax
            if k >= it - 2: need += 0.002
            if d < need: D[i] = np.array(nrm[:]) * (need - d); m[i] = True
            elif d > dm: D[i] = -np.array(nrm[:]) * (d - dm) * 0.7; m[i] = True
        if k < it - 2: D = lisse(D, E, n, 10)
        P = P + D
        print('  ajustement', k, 'sommets hors aisance', int(m.sum()))
    setco(o, P)

def poids(o):
    for g in list(o.vertex_groups): o.vertex_groups.remove(g)
    for g in body.vertex_groups: o.vertex_groups.new(name=g.name)
    md = o.modifiers.new('dt', 'DATA_TRANSFER'); md.object = body; md.use_vert_data = True; md.data_types_verts = {'VGROUP_WEIGHTS'}
    md.vert_mapping = 'POLYINTERP_NEAREST'; md.layers_vgroup_select_src = 'ALL'; md.layers_vgroup_select_dst = 'NAME'
    bpy.context.view_layer.objects.active = o; bpy.ops.object.modifier_apply(modifier='dt')
    lier(o)
def lier(o):
    o.parent = arm; o.matrix_parent_inverse = arm.matrix_world.inverted()
    md = o.modifiers.new('Armature', 'ARMATURE'); md.object = arm

def materiau(nom, img, coul=(1, 1, 1, 1), rough=0.8, alpha=False):
    m = bpy.data.materials.get(nom) or bpy.data.materials.new(nom); m.use_nodes = True; nt = m.node_tree
    for nd in list(nt.nodes): nt.nodes.remove(nd)
    out = nt.nodes.new('ShaderNodeOutputMaterial'); bs = nt.nodes.new('ShaderNodeBsdfPrincipled'); nt.links.new(bs.outputs[0], out.inputs[0])
    bs.inputs['Roughness'].default_value = rough
    if 'Specular IOR Level' in bs.inputs: bs.inputs['Specular IOR Level'].default_value = 0.25
    if coul[:3] != (1, 1, 1):
        from PIL import Image as PI
        a_ = np.array(PI.open(img).convert('RGB')).astype(np.float32) * np.array(coul[:3], np.float32)
        img = img.rsplit('.', 1)[0] + '_%02x%02x%02x.jpg' % tuple(int(255 * c) for c in coul[:3]); PI.fromarray(np.clip(a_, 0, 255).astype(np.uint8)).save(img, quality=88); coul = (1, 1, 1, 1)
    tx = nt.nodes.new('ShaderNodeTexImage'); tx.image = bpy.data.images.load(img)
    if coul[:3] != (1, 1, 1):
        mx = nt.nodes.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.blend_type = 'MULTIPLY'; mx.inputs['Factor'].default_value = 1
        nt.links.new(tx.outputs['Color'], mx.inputs[6]); mx.inputs[7].default_value = coul; nt.links.new(mx.outputs[2], bs.inputs['Base Color'])
    else: nt.links.new(tx.outputs['Color'], bs.inputs['Base Color'])
    if alpha:
        nt.links.new(tx.outputs['Alpha'], bs.inputs['Alpha'])
        if hasattr(m, 'surface_render_method'): m.surface_render_method = 'DITHERED'
        if hasattr(m, 'blend_method'): m.blend_method = 'CLIP'
    return m

def remplacer(ancien, nouveau):
    if ancien in bpy.data.objects: bpy.data.objects.remove(bpy.data.objects[ancien], do_unlink=True)
    nouveau.name = nouveau.data.name = ancien

# ---------- repères du corps
zN, zA, xA = bone('Neck')[2], bone('LeftArm')[2], bone('LeftArm')[0]
C = PB[(np.abs(PB[:, 0]) < 0.01) & (PB[:, 2] > 0.55) & (PB[:, 2] < 1.05)]; zC = C[:, 2].min()     # entrejambe
print('cou %.3f épaule %.3f (x %.3f) entrejambe %.3f' % (zN, zA, xA, zC))
def centre(P, z, cote=0, dz=0.01):
    S = P[(np.abs(P[:, 2] - z) < dz) & (np.abs(P[:, 0]) < 0.3)]
    if cote: S = S[S[:, 0] * cote > 0.01]
    return S[:, :2].mean(0) if len(S) > 5 else None
def recentrer(P, jambes, zmin):
    """translation par tranche (tronc, ou chaque jambe sous l'entrejambe) : centre du vêtement -> centre du corps,
       décalages lissés le long de z puis interpolés (pas de marches)"""
    Q = P.copy(); zs = np.arange(P[:, 2].min(), P[:, 2].max() + 0.02, 0.02)
    for cote in ((-1, 1) if jambes else (0,)):
        zz, dd = [], []
        for z in zs:
            if cote and z > zC + 0.03: continue
            if not cote and jambes and z < zC + 0.03: continue
            g, b = centre(P, z, cote), centre(PB, max(z, zmin), cote)
            if g is None or b is None: continue
            d = b - g
            if not cote: d[0] = 0
            zz.append(z); dd.append(d)
        if not zz: continue
        dd = np.array(dd); k = np.ones(5) / 5
        dd = np.c_[np.convolve(np.pad(dd[:, 0], 2, mode='edge'), k, 'valid'), np.convolve(np.pad(dd[:, 1], 2, mode='edge'), k, 'valid')]
        sel = (np.abs(P[:, 0]) < 0.35) & ((P[:, 0] * cote > 0) if cote else True)
        if cote: sel &= P[:, 2] <= zC + 0.05
        elif jambes: sel &= P[:, 2] > zC + 0.05
        for a in (0, 1): Q[sel, a] += np.interp(P[sel, 2], zz, dd[:, a])
    return Q

# ---------- jean
J = importer(AS + 'd506abee-denim_mom_jean.glb', lambda o: ':Group' not in o.name)
jean = joindre(J, 'Jean'); souder(jean)
md = jean.modifiers.new('dec', 'DECIMATE'); md.ratio = 0.42; bpy.context.view_layer.objects.active = jean; bpy.ops.object.modifier_apply(modifier='dec')
P = co(jean); zt, zh = P[:, 2].max(), P[:, 2].min()
zcG = P[np.abs(P[:, 0]) < 0.01][:, 2]; zcG = zcG[zcG < zt - 0.1].min()
zw = bone('Hips')[2] + 0.10                                             # taille haute du « mom jean »
zhA = zC * zh / zcG
print('jean : haut %.3f entrejambe %.3f ourlet %.3f -> %.3f %.3f %.3f' % (zt, zcG, zh, zw, zC, zhA))
P[:, 2] = np.interp(P[:, 2], [zh - 1, zh, zcG, zt, zt + 1], [zhA - 1, zhA, zC, zw, zw + 1])
P = recentrer(P, True, 0.1); setco(jean, P)
ajuster(jean, lambda z: 0.03 - 0.02 * sm((z - zC - 0.03) / 0.08), unders=('Culotte',))
poids(jean)
materiau('Tissu_Pants', VT + 'denim.jpg', rough=0.85); jean.data.materials.clear(); jean.data.materials.append(bpy.data.materials['Tissu_Pants'])
remplacer('Pants', jean)

# ---------- haut
if A.get('haut', 'tshirt') == 'tshirt':
    H = importer(AS + '503db464-t_shirt_basic.glb', lambda o: True)
else:
    H = importer(AS + '10b96c1e-streetwear_top.glb', lambda o: ':Group' not in o.name)
haut = joindre(H, 'Haut'); souder(haut); P = co(haut)
s = (zN - 0.012) / P[:, 2].max(); P = P * s                              # col au bas du cou (corps du modèle supposé proportionnel)
angs = {}
for cote in (-1, 1):                                                      # angle des manches du vêtement (pose A)
    sl = P[P[:, 0] * cote > xA + 0.06]
    if len(sl) < 30: angs[cote] = 0; continue
    piv = np.array([cote * xA, bone('LeftArm')[1], zA])
    bout = sl[sl[:, 0] * cote >= np.percentile(sl[:, 0] * cote, 85)]; d = bout.mean(0) - piv; d[1] = 0; d /= np.linalg.norm(d)
    angs[cote] = math.degrees(math.atan2(-d[2], d[0] * cote)); print('manche', cote, 'angle %.1f°' % angs[cote])
def poser(angs):
    bpy.context.view_layer.objects.active = arm; bpy.ops.object.mode_set(mode='POSE')
    for cote, nm in ((1, 'LeftArm'), (-1, 'RightArm')):
        pb = arm.pose.bones['mixamorig_' + nm]; h = arm.matrix_world @ pb.head
        R = Matrix.Translation(h) @ Matrix.Rotation(math.radians(angs[cote]) * cote, 4, 'Y') @ Matrix.Translation(-h)
        pb.matrix = arm.matrix_world.inverted() @ R @ arm.matrix_world @ pb.matrix; bpy.context.view_layer.update()
    bpy.ops.object.mode_set(mode='OBJECT'); bpy.context.view_layer.update()
poser(angs)
BV = bvh([body, tete]); PBr = PB; PB = np.array([v.co[:] for v in body.evaluated_get(bpy.context.evaluated_depsgraph_get()).to_mesh().vertices]) @ np.array(body.matrix_world)[:3, :3].T + np.array(body.matrix_world)[:3, 3]
P = recentrer(P, False, 0.9); setco(haut, P)
ajuster(haut, 0.03 if A.get('haut', 'tshirt') == 'tshirt' else 0.012, unders=('SoutienGorge', 'Culotte', 'Pants'))
# poids : interpolés depuis le corps posé (point le plus proche), puis skinning inverse -> pose de repos
gn = [g.name for g in body.vertex_groups]; WB_ = np.zeros((len(body.data.vertices), len(gn)))
for v in body.data.vertices:
    for g in v.groups: WB_[v.index, g.group] = g.weight
dg = bpy.context.evaluated_depsgraph_get(); meP = bpy.data.meshes.new_from_object(body.evaluated_get(dg)); meP.transform(body.matrix_world)
bmP = bmesh.new(); bmP.from_mesh(meP); bmP.faces.ensure_lookup_table(); bmP.verts.ensure_lookup_table(); BVP = BVHTree.FromBMesh(bmP)
MB = {}
for g in gn:
    if g.startswith('mixamorig_') and g[10:] and ('mixamorig_' + g[10:]) in arm.pose.bones:
        pb = arm.pose.bones[g]; MB[g] = np.array(arm.matrix_world @ pb.matrix @ pb.bone.matrix_local.inverted() @ arm.matrix_world.inverted())
P = co(haut); W = np.zeros((len(P), len(gn)))
for i in range(len(P)):
    loc, nrm, fi, dist = BVP.find_nearest(Vector(P[i]))
    f = bmP.faces[fi]; vs = [v.index for v in f.verts]; pw = np.array([1 / (1e-5 + (Vector(P[i]) - bmP.verts[j].co).length) for j in vs])
    W[i] = (WB_[vs] * pw[:, None]).sum(0) / pw.sum()
top = np.argsort(-W, 1)[:, :4]; W4 = np.take_along_axis(W, top, 1); W4 /= W4.sum(1, keepdims=True)
for i in range(len(P)):
    M = sum(W4[i, k] * MB.get(gn[top[i, k]], np.eye(4)) for k in range(4))
    P[i] = (np.linalg.inv(M) @ np.r_[P[i], 1])[:3]
bpy.context.view_layer.objects.active = arm; bpy.ops.object.mode_set(mode='POSE')
for pb in arm.pose.bones: pb.matrix_basis.identity()
bpy.ops.object.mode_set(mode='OBJECT'); bpy.context.view_layer.update()
setco(haut, P); PB = PBr
for g in list(haut.vertex_groups): haut.vertex_groups.remove(g)
G_ = {}
for i in range(len(P)):
    for k in range(4):
        if W4[i, k] > 1e-3:
            nm = gn[top[i, k]]
            if nm not in G_: G_[nm] = haut.vertex_groups.new(name=nm)
            G_[nm].add([i], float(W4[i, k]), 'REPLACE')
lier(haut)
def rentrer(dessous, dessus, marge=0.003):
    if dessous not in bpy.data.objects or dessus not in bpy.data.objects: return
    o = bpy.data.objects[dessous]; T = bvh([bpy.data.objects[dessus]]); P = co(o); n = 0
    for i in range(len(P)):
        u, un, ui, ud = T.find_nearest(Vector(P[i]), 0.03)
        if u is not None and (Vector(P[i]) - u).dot(un) > -marge: P[i] = np.array((u - un * marge)[:]); n += 1
    setco(o, P); print('  ', dessous, 'sous', dessus, ':', n, 'sommets rentrés')
coul = tuple(float(x) for x in A.get('coul_haut', '0.55,0.63,0.72').split(',')) + (1,)
materiau('Tissu_Shirt', VT + 'jersey.jpg', coul, rough=0.9); haut.data.materials.clear(); haut.data.materials.append(bpy.data.materials['Tissu_Shirt'])
remplacer('Shirt', haut)
for d_ in ('SoutienGorge', 'Culotte'): rentrer(d_, 'Shirt')
rentrer('Culotte', 'Pants')

# ---------- cheveux
def crane(P):                                                             # sommet, demi-largeur et profondeur à 6 cm sous le sommet
    t = P[:, 2].max(); S = P[np.abs(P[:, 2] - (t - 0.06)) < 0.006]
    return t, np.abs(S[:, 0]).max(), S[:, 1].min(), S[:, 1].max()
tA, xwA, y0A, y1A = crane(co(tete))
ch = A.get('cheveux', 'pony')
if ch == 'pony':
    ref = importer(AS + 'pony/Female_Herad_Mesh.fbx', lambda o: True)[0]
    HC = importer(AS + 'pony/LODs/Female_Adult_001_HairCard_LOD1.fbx', lambda o: True)
    PR = co(ref); bpy.data.objects.remove(ref, do_unlink=True)
else:
    suf = ch.split(':')[1]
    HC = importer(AS + 'a0949a93-hair_pack_part_1.glb', lambda o: o.data.materials and o.data.materials[0].name in ('Hair.' + suf, 'Scalp.' + suf))
    sc = [o for o in HC if o.data.materials[0].name.startswith('Scalp')]
    cx = np.mean([co(o).mean(0) for o in sc], 0)
    HC = [o for o in HC if np.linalg.norm(co(o).mean(0)[[0, 1]] - cx[[0, 1]]) < 0.15 or not bpy.data.objects.remove(o, do_unlink=True)]
    PR = np.vstack([co(o) for o in HC if o.data.materials[0].name.startswith('Scalp')])
    PHc = np.vstack([co(o) for o in HC if o.data.materials[0].name.startswith('Hair.')]); c0 = PR.mean(0)
    bas = PR[PR[:, 2] < PR[:, 2].min() + 0.03] - c0                       # bas du cuir chevelu = nuque (l'avant, la ligne du front, est plus haut) ; le visage regarde vers -y
    th = math.pi / 2 - math.atan2(bas[:, 1].mean(), bas[:, 0].mean())
    R = np.array([[math.cos(th), -math.sin(th), 0], [math.sin(th), math.cos(th), 0], [0, 0, 1]])
    print('coiffure : rotation %.0f°' % math.degrees(th))
    for o in HC: setco(o, (co(o) - c0) @ R.T + c0)
    PR = (PR - c0) @ R.T + c0
tS, xwS, y0S, y1S = crane(PR); kx, ky = xwA / xwS, (y1A - y0A) / (y1S - y0S); kz = (kx + ky) / 2
print('crâne : échelles x %.3f y %.3f' % (kx, ky))
BT = bvh([tete])
for o in HC:
    Q = co(o); Q = np.c_[Q[:, 0] * kx, y0A + (Q[:, 1] - y0S) * ky, tA + (Q[:, 2] - tS) * kz]
    ecart = 0.0015 if o.data.materials[0].name.startswith('Scalp') else 0.003
    for i in range(len(Q)):
        loc, nrm, fi, dist = BT.find_nearest(Vector(Q[i]), 0.05)
        if loc is not None and (Vector(Q[i]) - loc).dot(nrm) < ecart: Q[i] = np.array((loc + nrm * ecart)[:])
    setco(o, Q)
if ch == 'pony':
    m = materiau('Cheveux', A['tex_pony'], rough=0.55, alpha=True)
    for o in HC: o.data.materials.clear(); o.data.materials.append(m)
else:
    for o in HC:                                                         # texture du pack teintée (luminance x couleur), alpha gardé
        m = o.data.materials[0]
        for nd in m.node_tree.nodes:
            if nd.type == 'TEX_IMAGE' and nd.image and nd.image.colorspace_settings.name != 'Non-Color' and not nd.image.name.startswith('tint_'):
                im = nd.image; w_, h_ = im.size; px = np.array(im.pixels[:]).reshape(h_, w_, 4)
                lum = px[..., :3].mean(2, keepdims=True); tgt = np.array([float(x) / 255 for x in A.get('coul_chev', '96,50,28').split(',')])
                px[..., :3] = np.clip(lum / max(lum[px[..., 3] > 0.5].mean(), 1e-3) * tgt * 1.1, 0, 1)
                ni = bpy.data.images.new('tint_' + im.name, w_, h_, alpha=True); ni.pixels = px.ravel(); ni.pack(); nd.image = ni
        if hasattr(m, 'surface_render_method'): m.surface_render_method = 'DITHERED'
for o in list(HC):
    for g in list(o.vertex_groups): o.vertex_groups.remove(g)
    g = o.vertex_groups.new(name='mixamorig_Head'); g.add(list(range(len(o.data.vertices))), 1.0, 'REPLACE')
hair = joindre(HC, 'HairN'); lier(hair)
for n in ('Chouchou',):
    if n in bpy.data.objects: bpy.data.objects.remove(bpy.data.objects[n], do_unlink=True)
remplacer('Hair', hair)
print('cheveux', len(hair.data.vertices), 'sommets')
for o in bpy.data.objects:
    if o.type == 'MESH': o.data.name = o.name
bpy.ops.outliner.orphans_purge(do_recursive=True) if hasattr(bpy.ops.outliner, 'orphans_purge') else None
bpy.ops.wm.save_as_mainfile(filepath=A['out'])
print('OK', A['out'])
