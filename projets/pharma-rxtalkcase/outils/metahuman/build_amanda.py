# Étape 1 : maillages MetaHuman (pkl de bake.py) + squelette mixamorig (noms attendus par avatar.js) recalé sur les
# articulations de la DNA, poids de la DNA regroupés par os mixamo, passage de la pose A à la pose T, sauvegarde .blend
import bpy, pickle, sys, math, numpy as np
from mathutils import Vector, Matrix
sys.path.insert(0, '/home/claude/mh/build')
from mk_blend import build, tex, conv
PKL, OUT = sys.argv[-2], sys.argv[-1]
bpy.ops.wm.read_factory_settings(use_empty=True)
res = pickle.load(open(PKL, 'rb'))

# ---------- articulations (repère Blender)
def wpos(W): return conv(W[:3, 3][None])[0]
BJ = {n: wpos(res['body_world0'][i]) for i, n in enumerate(res['body_joint_names'])}
HJ = {n: wpos(res['joint_world0'][i]) for i, n in enumerate(res['joint_names'])}

MAP = {'pelvis': 'Hips', 'spine_01': 'Spine', 'spine_02': 'Spine', 'spine_03': 'Spine1', 'spine_04': 'Spine1', 'spine_05': 'Spine2',
       'neck_01': 'Neck', 'neck_02': 'Neck', 'head': 'Head', 'FACIAL_L_Eye': 'LeftEye', 'FACIAL_R_Eye': 'RightEye', 'root': 'Hips'}
for s, S in (('l', 'Left'), ('r', 'Right')):
    MAP.update({f'clavicle_{s}': S + 'Shoulder', f'upperarm_{s}': S + 'Arm', f'lowerarm_{s}': S + 'ForeArm', f'hand_{s}': S + 'Hand',
                f'thigh_{s}': S + 'UpLeg', f'calf_{s}': S + 'Leg', f'foot_{s}': S + 'Foot', f'ball_{s}': S + 'ToeBase'})
    for f, F in (('thumb', 'Thumb'), ('index', 'Index'), ('middle', 'Middle'), ('ring', 'Ring'), ('pinky', 'Pinky')):
        for k in (1, 2, 3): MAP[f'{f}_0{k}_{s}'] = f'{S}Hand{F}{k}'

def mapper(names, parents):
    out = []
    for j in range(len(names)):
        k = j
        while names[k] not in MAP:
            p = parents[k]
            if p == k or p < 0: break
            k = p
        out.append('mixamorig_' + MAP.get(names[k], 'Hips'))
    return out
HMAP = mapper(res['joint_names'], res['joint_parent']); BMAP = mapper(res['body_joint_names'], res['body_joint_parent'])

# ---------- maillages
M = {'head': tex('Peau_visage', 'Head_Basecolor.png', normal='Head_Normal.png', rough=.5), 'body': tex('Peau_corps', 'Body_Basecolor.png', normal='Body_Normal.png', rough=.55),
     'teeth': tex('Bouche', 'Teeth_Color.png', rough=.35), 'eye': tex('Yeux', 'Eyes_Color.png', rough=.12), 'eyelashes': tex('Cils', 'Eyelashes_Color.png', alpha=True, rough=.8)}
OBJ = {}
for nm, key, jm in (('head', 'head', HMAP), ('teeth', 'teeth', HMAP), ('eyeLeft', 'eye', HMAP), ('eyeRight', 'eye', HMAP), ('eyelashes', 'eyelashes', HMAP), ('body', 'body', BMAP)):
    o = build(res, nm, M[key]); OBJ[nm] = o
    d = res['meshes'][nm]; groups = {}
    for v, (js, ws) in enumerate(zip(d['wj'], d['ww'])):
        acc = {}
        for j, w in zip(js, ws): acc[jm[j]] = acc.get(jm[j], 0) + float(w)
        for b, w in acc.items(): groups.setdefault(b, []).append((v, w))
    for b, L in groups.items():
        g = o.vertex_groups.new(name=b)
        for v, w in L: g.add([v], w, 'REPLACE')
REN = {'head': 'Tete', 'teeth': 'Bouche', 'eyeLeft': 'Yeux', 'eyelashes': 'Cils', 'body': 'Body'}
# yeux : un seul objet (comme patient_femme.glb), un os par œil
bpy.ops.object.select_all(action='DESELECT'); OBJ['eyeLeft'].select_set(True); OBJ['eyeRight'].select_set(True)
bpy.context.view_layer.objects.active = OBJ['eyeLeft']; bpy.ops.object.join(); OBJ.pop('eyeRight')
for k, o in OBJ.items(): o.name = REN[k]; o.data.name = REN[k]

# ---------- squelette
arm_d = bpy.data.armatures.new('Armature'); arm = bpy.data.objects.new('Armature', arm_d); bpy.context.scene.collection.objects.link(arm)
bpy.context.view_layer.objects.active = arm; bpy.ops.object.mode_set(mode='EDIT')
E = arm_d.edit_bones
top = max((v.co for v in OBJ['head'].data.vertices if abs(v.co.x) < 0.01), key=lambda c: c.z)
HEADS = {'Hips': BJ['pelvis'], 'Spine': BJ['spine_01'], 'Spine1': BJ['spine_03'], 'Spine2': BJ['spine_05'], 'Neck': BJ['neck_01'], 'Head': BJ['head'],
         'HeadTop_End': np.array([0, BJ['head'][1], top.z]), 'LeftEye': HJ['FACIAL_L_Eye'], 'RightEye': HJ['FACIAL_R_Eye']}
foot_front = {}
for s, S in (('l', 'Left'), ('r', 'Right')):
    for a, b in (('clavicle', 'Shoulder'), ('upperarm', 'Arm'), ('lowerarm', 'ForeArm'), ('hand', 'Hand'), ('thigh', 'UpLeg'), ('calf', 'Leg'), ('foot', 'Foot'), ('ball', 'ToeBase')):
        HEADS[S + b] = BJ[f'{a}_{s}']
    for f, F in (('thumb', 'Thumb'), ('index', 'Index'), ('middle', 'Middle'), ('ring', 'Ring'), ('pinky', 'Pinky')):
        for k in (1, 2, 3): HEADS[f'{S}Hand{F}{k}'] = BJ[f'{f}_0{k}_{s}']
    sg = 1 if s == 'l' else -1
    P = np.array([v.co[:] for v in OBJ['body'].data.vertices]); sel = P[(np.sign(P[:, 0]) == sg) & (P[:, 2] < 0.04)]
    tip = sel[np.argmin(sel[:, 1])]; HEADS[S + 'Toe_End'] = np.array([HEADS[S + 'ToeBase'][0], tip[1], HEADS[S + 'ToeBase'][2]])
PARENT = {'Spine': 'Hips', 'Spine1': 'Spine', 'Spine2': 'Spine1', 'Neck': 'Spine2', 'Head': 'Neck', 'HeadTop_End': 'Head', 'LeftEye': 'Head', 'RightEye': 'Head'}
CHILD = {'Hips': 'Spine', 'Spine': 'Spine1', 'Spine1': 'Spine2', 'Spine2': 'Neck', 'Neck': 'Head', 'Head': 'HeadTop_End'}
for S in ('Left', 'Right'):
    PARENT.update({S + 'Shoulder': 'Spine2', S + 'Arm': S + 'Shoulder', S + 'ForeArm': S + 'Arm', S + 'Hand': S + 'ForeArm',
                   S + 'UpLeg': 'Hips', S + 'Leg': S + 'UpLeg', S + 'Foot': S + 'Leg', S + 'ToeBase': S + 'Foot', S + 'Toe_End': S + 'ToeBase'})
    CHILD.update({S + 'Shoulder': S + 'Arm', S + 'Arm': S + 'ForeArm', S + 'ForeArm': S + 'Hand', S + 'Hand': S + 'HandMiddle1',
                  S + 'UpLeg': S + 'Leg', S + 'Leg': S + 'Foot', S + 'Foot': S + 'ToeBase', S + 'ToeBase': S + 'Toe_End'})
    for F in ('Thumb', 'Index', 'Middle', 'Ring', 'Pinky'):
        for k in (1, 2, 3):
            PARENT[f'{S}Hand{F}{k}'] = f'{S}Hand' if k == 1 else f'{S}Hand{F}{k - 1}'
            if k < 3: CHILD[f'{S}Hand{F}{k}'] = f'{S}Hand{F}{k + 1}'
ORDER = ['Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head', 'HeadTop_End', 'RightEye', 'LeftEye']
for S in ('Left', 'Right'):
    ORDER += [S + 'Shoulder', S + 'Arm', S + 'ForeArm', S + 'Hand'] + [f'{S}Hand{F}{k}' for F in ('Middle', 'Thumb', 'Index', 'Ring', 'Pinky') for k in (1, 2, 3)]
for S in ('Right', 'Left'): ORDER += [S + 'UpLeg', S + 'Leg', S + 'Foot', S + 'ToeBase', S + 'Toe_End']
for n in ORDER:
    b = E.new('mixamorig_' + n); h = Vector(HEADS[n]); b.head = h
    if n in CHILD: t = Vector(HEADS[CHILD[n]])
    elif n in ('LeftEye', 'RightEye'): t = h + Vector((0, -0.02, 0))
    elif n.endswith('End'): pr = Vector(HEADS[PARENT[n]]); t = h + (h - pr).normalized() * 0.03
    else: pr = Vector(HEADS[PARENT[n]]); t = h + (h - pr) * 0.8          # dernière phalange
    if (t - h).length < 1e-3: t = h + Vector((0, 0, 0.02))
    b.tail = t
for n in ORDER:
    if n in PARENT: E['mixamorig_' + n].parent = E['mixamorig_' + PARENT[n]]
bpy.ops.object.mode_set(mode='OBJECT')
for o in OBJ.values():
    o.parent = arm; md = o.modifiers.new('Armature', 'ARMATURE'); md.object = arm
print('os', len(arm_d.bones), 'groupes corps', sorted(g.name for g in OBJ['body'].vertex_groups)[:8], '…')

# ---------- pose A -> pose T : bras à l'horizontale, coude et poignet tendus
bpy.context.view_layer.objects.active = arm; bpy.ops.object.mode_set(mode='POSE')
PB = arm.pose.bones
def head_w(n): return arm.matrix_world @ PB['mixamorig_' + n].head
def aim(n, child, target_dir):
    pb = PB['mixamorig_' + n]; bpy.context.view_layer.update()
    h = pb.head.copy(); cur = (PB['mixamorig_' + child].head - h).normalized()
    q = cur.rotation_difference(target_dir.normalized())
    pb.matrix = Matrix.Translation(h) @ q.to_matrix().to_4x4() @ Matrix.Translation(-h) @ pb.matrix
    bpy.context.view_layer.update()
for S, sg in (('Left', 1), ('Right', -1)):
    aim(S + 'Arm', S + 'ForeArm', Vector((sg, 0, 0)))
    aim(S + 'ForeArm', S + 'Hand', Vector((sg, 0, 0)))
    aim(S + 'Hand', S + 'HandMiddle1', Vector((sg, 0, 0)))
    bpy.context.view_layer.update()
    i1, p1, h = PB[f'mixamorig_{S}HandIndex1'].head, PB[f'mixamorig_{S}HandPinky1'].head, PB[f'mixamorig_{S}Hand'].head
    f = (PB[f'mixamorig_{S}HandMiddle1'].head - h).normalized(); side = (i1 - p1).normalized(); n = f.cross(side).normalized()
    print(S, 'normale paume', [round(x, 2) for x in n])
bpy.ops.object.mode_set(mode='OBJECT')
for k, o in OBJ.items():
    if not o.data.shape_keys:
        bpy.context.view_layer.objects.active = o; bpy.ops.object.modifier_apply(modifier='Armature'); continue
    kbs = o.data.shape_keys.key_blocks                       # maillage à formes : la pose est reportée sur chaque forme
    for kb in kbs: kb.value = 0
    dg = bpy.context.evaluated_depsgraph_get(); ev = o.evaluated_get(dg); n = len(o.data.vertices)
    Pe = np.empty(n * 3, np.float32); ev.data.vertices.foreach_get('co', Pe)
    P0 = np.empty(n * 3, np.float32); kbs[0].data.foreach_get('co', P0); Dd = Pe - P0
    print(k, 'déplacement pose T max', float(np.abs(Dd).max()))
    for kb in kbs:
        c = np.empty(n * 3, np.float32); kb.data.foreach_get('co', c); kb.data.foreach_set('co', c + Dd)
    o.modifiers.remove(o.modifiers['Armature'])
bpy.context.view_layer.objects.active = arm; bpy.ops.object.mode_set(mode='POSE'); bpy.ops.pose.armature_apply(selected=False); bpy.ops.object.mode_set(mode='OBJECT')
for o in OBJ.values():
    if not any(m.type == 'ARMATURE' for m in o.modifiers): md = o.modifiers.new('Armature', 'ARMATURE'); md.object = arm
bpy.ops.wm.save_as_mainfile(filepath=OUT)
print('OK', OUT)
