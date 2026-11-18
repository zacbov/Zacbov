# Intérieur du patient (homme) : organes HRA VH_F de CorpoAtlas sans les structures propres à la femme, structures masculines du
# calque Homme v31 (HRA VH_M + Z-Anatomy), compléments Z-Anatomy ; recalés sur le patient (tronc : tranches entre la peau
# masculine de l'atlas et les vêtements du patient ; bras et jambes : segment par segment sur ses articulations),
# puis habillés des poids de ses vêtements et de sa peau : ils suivent toutes les postures.
import bpy, bmesh, numpy as np, pickle, re, json, sys
from scipy.spatial import cKDTree
OUT = sys.argv[-1]
W = pickle.load(open('/home/claude/homme_int/warp_h.pkl', 'rb')); JA = pickle.load(open('/home/claude/homme_int/joints_atlas.pkl', 'rb'))
za, zp, ZA, TA, ZP, TP, crotch = W['za'], W['zp'], W['ZA'], W['TA'], W['ZP'], W['TP'], W['crA']
FEMME_SEULE = re.compile(json.load(open('/home/claude/v31in/data/homme/homme_meta.json'))['femme_seule'])
HMETA = json.load(open('/home/claude/v31in/data/homme/homme_meta.json'))['items']
def warp(V):                                                  # tronc : hauteur par repères, largeur et profondeur par tranches
    out = V.copy(); z = V[:, 2]; zn = np.interp(z, za, zp); out[:, 2] = zn
    ga = [np.interp(z, ZA, TA[:, j]) for j in range(4)]; gp = [np.interp(zn, ZP, TP[:, j]) for j in range(4)]
    t = (V[:, 1] - ga[2]) / np.maximum(ga[3] - ga[2], 1e-4); out[:, 1] = gp[2] + t * (gp[3] - gp[2])
    # largeur : symétrique autour de la ligne médiane (le rachis), pour ne pas faire onduler la colonne quand un côté du profil saute
    out[:, 0] = np.interp(zn, CXz, CXx) + V[:, 0] * (gp[1] - gp[0]) / np.maximum(ga[1] - ga[0], 1e-4)
    return out
def sm(t): t = np.clip(t, 0, 1); return t * t * (3 - 2 * t)
nz = lambda v: v / np.linalg.norm(v)

# ---------- patiente : squelette au repos, peau et poids ----------
bpy.ops.wm.read_factory_settings(use_empty=True)
for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
bpy.ops.import_scene.gltf(filepath='/home/claude/work/site/patient_homme.glb')
arm = [o for o in bpy.data.objects if o.type == 'ARMATURE'][0]
_bx = [np.array((arm.matrix_world @ arm.data.bones['mixamorig_' + n].head_local)[:]) for n in ('Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head', 'HeadTop_End')]
CXz = np.array([p[2] for p in _bx]); CXx = np.array([p[0] for p in _bx])
PEAUX = [o for o in bpy.data.objects if o.type == 'MESH' and o.name.split('.')[0] in ('Body', 'Shirt', 'Sweatshirt', 'Pants', 'Shoes')]
for o in list(bpy.data.objects):
    if o.type == 'MESH' and o not in PEAUX: bpy.data.objects.remove(o, do_unlink=True)
body = PEAUX[0]
BJ = lambda n: np.array((arm.matrix_world @ arm.data.bones['mixamorig_' + n].head_local)[:])
deform = {b.name for b in arm.data.bones if b.use_deform}
SK, skinW = [], []
for ob in PEAUX:                                              # le corps du modèle n'a que tête, cou et mains : les vêtements portent le reste
    MW = np.array(ob.matrix_world); kb = ob.data.shape_keys.key_blocks['Basis'] if ob.data.shape_keys else None
    X = np.array([(v.co[:]) for v in (kb.data if kb else ob.data.vertices)]); SK.append(X @ MW[:3, :3].T + MW[:3, 3])
    gname = {g.index: g.name for g in ob.vertex_groups}
    for v in ob.data.vertices:
        skinW.append(sorted([(g.weight, gname[g.group]) for g in v.groups if gname[g.group] in deform and g.weight > 0.01], reverse=True)[:4])
SK = np.vstack(SK)
def famille(n):
    for s in ('Left', 'Right'):
        if re.search(s + r'(Arm|ForeArm|Hand)', n): return 'bras' + s[0]
        if re.search(s + r'(UpLeg|Leg|Foot|ToeBase)', n): return 'jambe' + s[0]
    return 'tronc'
regS = np.array([famille(ws[0][1]) if ws else 'tronc' for ws in skinW])
tree = {r: (cKDTree(SK[regS == r]), np.where(regS == r)[0]) for r in set(regS)}
print('peau', len(SK), {r: int((regS == r).sum()) for r in set(regS)})

# ---------- articulations des bras : atlas (bras le long du corps) et patiente (T) ----------
bpy.ops.import_scene.gltf(filepath='/home/claude/atlas/src/corpo-atlas/3d-vh-f-united-custom.glb')
bpy.ops.import_scene.gltf(filepath='/home/claude/v13in/3b9f8c74-za_complements.glb')
bpy.ops.import_scene.gltf(filepath='/home/claude/v31in/data/homme/homme.glb')
OBJ = {o.name: o for o in bpy.data.objects if o.type == 'MESH' and o not in PEAUX}
def pts(n): o = OBJ[n]; return np.array([o.matrix_world @ v.co for v in o.data.vertices])
def ends(n):
    P = pts(n); c = P.mean(0); a = np.linalg.svd(P - c)[2][0]; t = (P - c) @ a; e = 0.15 * (t.max() - t.min())
    lo, hi = P[t < t.min() + e].mean(0), P[t > t.max() - e].mean(0)
    return (lo, hi) if lo[2] > hi[2] else (hi, lo)
SEG = {}
for s, S in (('L', 'Left'), ('R', 'Right')):
    hu, ul, ra, mc3 = ends(f'ZA_humerus_{s}'), ends(f'ZA_ulna_{s}'), ends(f'ZA_radius_{s}'), ends(f'ZA_third_metacarpal_bone_{s}')
    A = dict(S=hu[0], E=(hu[1] + ul[0]) / 2, W=(ul[1] + ra[1]) / 2, M=mc3[1], T=pts(f'ZA_first_metacarpal_bone_{s}').mean(0))
    P = dict(S=BJ(S + 'Arm'), E=BJ(S + 'ForeArm'), W=BJ(S + 'Hand'), M=BJ(S + 'HandMiddle1'), T=BJ(S + 'HandThumb1'))
    SEG[s] = (A, P)
    print(s, {k: np.round(v, 3).tolist() for k, v in A.items()}, {k: np.round(v, 3).tolist() for k, v in P.items()})
ANT = np.array([0, -1.0, 0])
def cadre(ax, ref):
    ax = nz(ax); r = nz(ref - ax * (ref @ ax)); return np.stack([ax, r, np.cross(ax, r)])   # lignes : axe, référence, 3e
def lateral(J):                                               # direction du pouce, perpendiculaire à l'axe de la main
    a = nz(J['M'] - J['W']); t = J['T'] - J['W']; return t - a * (t @ a)
def mapper(s):
    A, P = SEG[s]; kr = 0.95
    def seg(V, a0, a1, p0, p1, refA, refP, refA1=None, refP1=None):
        La, Lp = np.linalg.norm(a1 - a0), np.linalg.norm(p1 - p0)
        Fa, Fp = cadre(a1 - a0, refA), cadre(p1 - p0, refP)
        loc = (V - a0) @ Fa.T; t = loc[:, 0] / La
        loc[:, 0] *= Lp / La; loc[:, 1:] *= kr
        if refA1 is not None:                                 # torsion le long du segment (pronation de l'avant-bras)
            Fa1, Fp1 = cadre(a1 - a0, refA1), cadre(p1 - p0, refP1)
            v = Fp.T @ (Fa @ Fa1[1]); w = Fp1[1]; ax = Fp[0]
            phi = np.arctan2(np.cross(v, w) @ ax, v @ w)
            ang = phi * np.clip(t, 0, 1); c, s_ = np.cos(ang), np.sin(ang)
            y, z = loc[:, 1].copy(), loc[:, 2].copy(); loc[:, 1] = c * y - s_ * z; loc[:, 2] = s_ * y + c * z
        return p0 + loc @ Fp, t
    def f(V):
        up, tu = seg(V, A['S'], A['E'], P['S'], P['E'], ANT, ANT)
        fo, tf = seg(V, A['E'], A['W'], P['E'], P['W'], ANT, ANT, lateral(A), lateral(P))
        ha, th = seg(V, A['W'], A['M'], P['W'], P['M'], lateral(A), lateral(P))
        b1 = sm((tf + 0.04) / 0.08)[:, None]; b2 = sm((th + 0.04) / 0.08)[:, None]
        return (1 - b1) * up + b1 * ((1 - b2) * fo + b2 * ha)
    return f
MAP = {s: mapper(s) for s in SEG}
LAT = np.array([1.0, 0, 0])
def mapperJambe(s):                                           # hanche -> genou -> cheville -> tête du 2e métatarsien
    S = 'Left' if s == 'L' else 'Right'
    A = dict(H=JA['hip' + s], K=JA['knee' + s], C=JA['ankle' + s], M=JA['mtp' + s])
    P = dict(H=BJ(S + 'UpLeg'), K=BJ(S + 'Leg'), C=BJ(S + 'Foot'), M=BJ(S + 'ToeBase')); kr = 0.92
    def seg(V, a0, a1, p0, p1, ref):
        La, Lp = np.linalg.norm(a1 - a0), np.linalg.norm(p1 - p0); Fa, Fp = cadre(a1 - a0, ref), cadre(p1 - p0, ref)
        loc = (V - a0) @ Fa.T; t = loc[:, 0] / La; loc[:, 0] *= Lp / La; loc[:, 1:] *= kr; return p0 + loc @ Fp, t
    def f(V):
        cu, tc = seg(V, A['H'], A['K'], P['H'], P['K'], ANT); ja, tj = seg(V, A['K'], A['C'], P['K'], P['C'], ANT); pi, tp = seg(V, A['C'], A['M'], P['C'], P['M'], LAT)
        b1 = sm((tj + 0.04) / 0.08)[:, None]; zc = (V[:, 2] - A['C'][2]) / 0.05; b2 = sm(0.5 - zc)[:, None]   # pied : sous la cheville
        return (1 - b1) * cu + b1 * ((1 - b2) * ja + b2 * pi)
    return f
MAPJ = {s: mapperJambe(s) for s in 'LR'}
print('jambes', {s: (np.round(JA['hip' + s], 3).tolist(), np.round(BJ(('Left' if s == 'L' else 'Right') + 'UpLeg'), 3).tolist()) for s in 'LR'})
def appartenance(V, s):                                      # 1 dans le bras (capsule autour de l'axe épaule-coude-poignet-main), 0 dans le tronc
    A = SEG[s][0]; best = np.full(len(V), 9.0); tS = None
    for a0, a1, r in ((A['S'], A['E'], 0.075), (A['E'], A['W'], 0.065), (A['W'], A['M'] + 1.8 * (A['M'] - A['W']), 0.07)):
        d = a1 - a0; L = np.linalg.norm(d); d = d / L; t = np.clip((V - a0) @ d, 0, L)
        dist = np.linalg.norm(V - (a0 + t[:, None] * d), axis=1) - r; best = np.minimum(best, dist)
        if tS is None: tS = ((V - a0) @ d) / L
    return (1 - sm(best / 0.015 + 0.5)) * sm((tS + 0.02) / 0.12)

# ---------- sélection et groupes ----------
SYS_A = {'VH_F_skeletal_system': 'squelette', 'VH_F_circulatory_system': 'vaisseaux', 'VH_F_respiratory_system': 'poumons', 'VH_F_digestive_system': 'digestif', 'VH_F_urinary_system': 'urinaire', 'VH_F_reproductive_system': 'genital', 'VH_F_nervous_system': 'nerveux'}
SYS_Z = {'skeletal': 'squelette', 'muscular': 'muscles', 'nervous': 'nerfs', 'circulatory': 'vaisseaux', 'lymphatic': 'lymphe', 'digestive': 'digestif', 'endocrine': 'glandes', 'respiratory': 'poumons'}
META = json.load(open('/home/claude/v13in/0994f74b-za_meta.json'))['items']
GROSSESSE = re.compile(r'amnion|placent|umbilical|chorion|basal_plate|decidua|fetus|fetal', re.I)
def sysA(o):
    p = o.parent
    while p:
        if p.name in SYS_A: return SYS_A[p.name]
        p = p.parent
    return None
COUL = {'squelette': (0.93, 0.89, 0.8), 'muscles': (0.62, 0.17, 0.15), 'nerfs': (0.98, 0.85, 0.25), 'nerveux': (0.95, 0.82, 0.62), 'lymphe': (0.45, 0.78, 0.45),
        'glandes': (0.85, 0.6, 0.35), 'poumons': (0.85, 0.55, 0.55), 'digestif': (0.8, 0.55, 0.45), 'urinaire': (0.75, 0.45, 0.35), 'genital': (0.85, 0.55, 0.6)}
def couleur(o, g):
    n = o.name.lower()
    if g == 'vaisseaux': return (0.25, 0.35, 0.85) if re.search(r'vein|sinus|venous', n) else (0.85, 0.15, 0.15)
    if o.data.materials and o.data.materials[0] and g not in ('squelette', 'muscles', 'nerfs'):
        m = o.data.materials[0]
        if m.use_nodes:
            for nd in m.node_tree.nodes:
                if nd.type == 'BSDF_PRINCIPLED': return tuple(nd.inputs['Base Color'].default_value[:3])
    return COUL.get(g, (0.8, 0.8, 0.8))
sel = []
for n, o in OBJ.items():
    if n in HMETA:                                            # calque Homme (v31)
        g = {'reproductive': 'genital', 'urinary': 'urinaire', 'circulatory': 'vaisseaux'}.get(HMETA[n]['sys'])
        if g: sel.append((o, g, 'hra' if n.startswith('VH_M') else 'za'))
    elif n.startswith('ZA_'):
        it = META.get(n); g = SYS_Z.get(it['sys']) if it else None
        if g: sel.append((o, g, 'za'))
    else:
        g = sysA(o)
        if g and not GROSSESSE.search(n) and not FEMME_SEULE.match(n.split('.')[0]): sel.append((o, g, 'hra'))
keep = {o.name for o, _, _ in sel}
for o in list(bpy.data.objects):
    if o.type == 'MESH' and o is not body and o.name not in keep: bpy.data.objects.remove(o, do_unlink=True)
tri = lambda o: sum(len(p.vertices) - 2 for p in o.data.polygons)
TOT = {k: sum(tri(o) for o, _, s in sel if s == k) for k in ('hra', 'za')}; BUD = {'hra': 230000, 'za': 240000}
print('objets', len(sel), TOT)

# ---------- déformation, poids, couleurs ----------
parts = {}
for i, (o, g, src) in enumerate(sel):
    M = o.matrix_world.copy(); o.parent = None; o.matrix_world = M
    bpy.context.view_layer.objects.active = o; o.select_set(True); bpy.ops.object.transform_apply(location=True, rotation=True, scale=True); o.select_set(False)
    n = tri(o); r = min(1.0, BUD[src] / TOT[src] * (1.6 if g in ('poumons', 'digestif', 'urinaire') else 1.0))
    if n > 200 and r < 0.97:
        md = o.modifiers.new('d', 'DECIMATE'); md.ratio = max(r, 0.04); bpy.context.view_layer.objects.active = o; bpy.ops.object.modifier_apply(modifier='d')
    V = np.array([v.co[:] for v in o.data.vertices])
    if not len(V): bpy.data.objects.remove(o, do_unlink=True); continue
    out = warp(V)
    jb = sm((crotch + 0.03 - V[:, 2]) / 0.08)                 # jambes : sous l'entrejambe
    jL = jb * (V[:, 0] > 0); jR = jb * (V[:, 0] < 0)
    for m in (jL, jR):
        if m.mean() > 0.5: m[:] = np.where(V[:, 2] < crotch + 0.12, 1.0, m)   # os et muscles de la cuisse : en entier avec la jambe
    if not re.search(r'penis|testi|scrot|epididym|glans|corpus_(cavern|spong)|ductus_def', n0 := o.name.lower()):
        for s, m in (('L', jL), ('R', jR)):
            if (m > 0).any():
                k = m > 0; out[k] = (1 - m[k, None]) * out[k] + m[k, None] * MAPJ[s](V[k])
    else: jL[:] = 0; jR[:] = 0
    mL = appartenance(V, 'L') * (V[:, 0] > 0); mR = appartenance(V, 'R') * (V[:, 0] < 0)
    for m in (mL, mR):                                     # objet surtout dans le bras (os, muscles, nerfs, vaisseaux du membre) : il suit le bras en entier
        if m.mean() > 0.35: m[:] = 1.0
        elif m.max() > 0.5 and m.mean() < 0.35: m[:] = np.where(m > 0.02, np.maximum(m, sm(m / 0.3)), 0)
    for s, m in (('L', mL), ('R', mR)):
        if (m > 0).any():
            k = m > 0; out[k] = (1 - m[k, None]) * out[k] + m[k, None] * MAP[s](V[k])
    o.data.vertices.foreach_set('co', out.astype(np.float32).ravel()); o.data.update()
    reg = np.where(mL > 0.5, 'brasL', np.where(mR > 0.5, 'brasR', np.where(jL > 0.5, 'jambeL', np.where(jR > 0.5, 'jambeR', 'tronc'))))
    vg = {}
    for rg in set(reg):
        idx = np.where(reg == rg)[0]; tr, ids = tree.get(rg, tree['tronc'])
        d, nb = tr.query(out[idx], k=6)
        for j, vi in enumerate(idx):
            acc = {}
            for dd, q in zip(d[j], nb[j]):
                w0 = 1.0 / (dd + 0.004)
                for w, bn in skinW[ids[q]]: acc[bn] = acc.get(bn, 0) + w * w0
            top = sorted(acc.items(), key=lambda x: -x[1])[:4]; s_ = sum(w for _, w in top) or 1
            for bn, w in top: vg.setdefault(bn, []).append((int(vi), w / s_))
    for bn, L in vg.items():
        G = o.vertex_groups.get(bn) or o.vertex_groups.new(name=bn)
        for vi, w in L: G.add([vi], w, 'REPLACE')
    col = couleur(o, g)
    if not o.data.color_attributes.get('Col'): o.data.color_attributes.new('Col', 'BYTE_COLOR', 'CORNER')
    ca = o.data.color_attributes['Col']; ca.data.foreach_set('color', np.tile(np.array([*col, 1.0], np.float32), len(ca.data)))
    parts.setdefault(g, []).append(o)
    if i % 200 == 0: print('...', i, len(sel))

# ---------- un maillage par groupe, habillé sur le squelette de la patiente ----------
for g, L in parts.items():
    for o in L: o.data.materials.clear()
    bpy.ops.object.select_all(action='DESELECT')
    for o in L: o.select_set(True)
    bpy.context.view_layer.objects.active = L[0]
    if len(L) > 1: bpy.ops.object.join()
    o = bpy.context.view_layer.objects.active; o.name = 'Int_' + g; o.data.name = 'Int_' + g; o['groupe'] = g
    mat = bpy.data.materials.new('Int_' + g); mat.use_nodes = True
    nt = mat.node_tree; bs = nt.nodes['Principled BSDF']; vc = nt.nodes.new('ShaderNodeVertexColor'); vc.layer_name = 'Col'
    nt.links.new(vc.outputs['Color'], bs.inputs['Base Color']); bs.inputs['Roughness'].default_value = 0.55
    o.data.materials.append(mat)
    o.parent = arm; md = o.modifiers.new('Armature', 'ARMATURE'); md.object = arm
    print(g, len(o.data.vertices), 'sommets', len(o.data.polygons), 'faces')
for ob in list(bpy.data.objects):
    if ob.type == 'MESH' and not ob.name.startswith('Int_'): bpy.data.objects.remove(ob, do_unlink=True)
bpy.ops.object.select_all(action='DESELECT')
arm.select_set(True)
for o in bpy.data.objects:
    if o.name.startswith('Int_'): o.select_set(True)
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=True, export_skins=True, export_morph=False, export_animations=False,
                          export_extras=True, export_apply=False, export_yup=True, export_vertex_color='ACTIVE', export_all_vertex_colors=False)
print('OK', OUT)
