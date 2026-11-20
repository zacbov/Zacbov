# Convertit les animations Mixamo (FBX) en données compactes pour la page : pour chaque os et chaque image, la rotation
# « delta » dans le monde (pose animée × pose de repos⁻¹), en Y-haut (repère three.js) ; + déplacement du bassin
# normalisé par la hauteur du bassin au repos. Le reciblage sur le patient se fait dans avatar.js (delta × repos du patient).
import bpy, json, struct, glob, os, sys
from mathutils import Matrix
OUT = sys.argv[-1]; os.makedirs(OUT, exist_ok=True)
M = Matrix(((1, 0, 0), (0, 0, 1), (0, -1, 0)))            # Blender (Z-haut) -> three.js (Y-haut)
SAUTE = ('4', 'Toe_End', 'HeadTop_End')
meta = {'fps': 30, 'clips': {}}
blob = bytearray()
for f in sorted(glob.glob('/home/claude/anim/fbx/*.fbx')):
    nom = os.path.basename(f)[:-4]
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=f)
    a = [o for o in bpy.data.objects if o.type == 'ARMATURE'][0]; act = a.animation_data.action
    f0, f1 = int(act.frame_range[0]), int(act.frame_range[1])
    pref = a.data.bones[0].name.split(':')[0] + ':'
    os_ = [b for b in a.data.bones if not b.name.endswith(SAUTE) and not (b.name[-1] == '4' and 'Hand' in b.name)]
    noms = [b.name.replace(pref, '') for b in os_]
    W = a.matrix_world
    rest = {b.name: (W @ b.matrix_local).to_quaternion() for b in os_}
    hips0 = W @ a.data.bones[pref + 'Hips'].head_local; sol = min((W @ b.head_local).z for b in a.data.bones); hH = hips0.z - sol
    sc = bpy.context.scene; q = []; hp = []
    for fr in range(f0, f1 + 1):
        sc.frame_set(fr)
        for b in os_:
            pb = a.pose.bones[b.name]; d = (W @ pb.matrix).to_quaternion() @ rest[b.name].inverted()
            dm = (M @ d.to_matrix() @ M.transposed()).to_quaternion()
            if dm.w < 0: dm.negate()
            q += [dm.x, dm.y, dm.z, dm.w]
        h = (W @ a.pose.bones[pref + 'Hips'].matrix).translation - hips0; h = M @ h
        hp += [h.x / hH, h.y / hH, h.z / hH]
    off = len(blob); blob += struct.pack('<%dh' % len(q), *[max(-32767, min(32767, round(v * 32767))) for v in q])
    off2 = len(blob); blob += struct.pack('<%dh' % len(hp), *[max(-32767, min(32767, round(v * 8000))) for v in hp])
    meta['clips'][nom] = {'images': f1 - f0 + 1, 'os': noms, 'q': off, 'h': off2}
    print(nom, f1 - f0 + 1, 'images', len(noms), 'os', 'hanches', round(hH, 3))
open(os.path.join(OUT, 'gestes.bin'), 'wb').write(blob)
json.dump(meta, open(os.path.join(OUT, 'gestes.json'), 'w'), separators=(',', ':'))
print('octets', len(blob))
