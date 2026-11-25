# corps coupé en deux (haut : montré buste découvert ; bas : jambes découvertes), noms rétablis
import bpy, bmesh, sys
bpy.ops.wm.open_mainfile(filepath=sys.argv[-2])
c = bpy.data.objects['Corps']
from mathutils import Vector
from mathutils.bvhtree import BVHTree
bmC = bmesh.new(); mC = c.data.copy(); mC.transform(c.matrix_world); bmC.from_mesh(mC); TC = BVHTree.FromBMesh(bmC)
pa = bpy.data.objects['Pants']; n = 0                                     # haut du pantalon glissé sous la peau : son bord (jamais vu d'origine) disparaît
for v in pa.data.vertices:
    p = pa.matrix_world @ v.co
    if p.z < 0.9: continue
    u, un, ui, ud = TC.find_nearest(p, 0.04)
    if u is None: continue
    w = min(1, (p.z - 0.9) / 0.05); d = (p - u).dot(un)
    if d > -0.004: v.co = pa.matrix_world.inverted() @ (p + un * (-0.004 - d) * w); n += 1
print('pantalon rentré sous la peau :', n)
bm = bmesh.new(); bm.from_mesh(pa.data)                                   # bord haut du pantalon (déchiré, prévu pour être caché) : coupé net
bmesh.ops.delete(bm, geom=[f for f in bm.faces if (pa.matrix_world @ f.calc_center_median()).z > 0.985], context='FACES'); bm.to_mesh(pa.data); bm.free()
for nom, garde in (('CorpsHaut', lambda p: p.z > 0.97 and abs(p.x) < 0.6), ('CorpsBas', lambda p: p.z <= 0.97)):
    o = c.copy(); o.data = c.data.copy(); o.name = o.data.name = nom; bpy.context.scene.collection.objects.link(o)
    bm = bmesh.new(); bm.from_mesh(o.data)
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if not garde(c.matrix_world @ f.calc_center_median())], context='FACES')
    bm.to_mesh(o.data); bm.free(); print(nom, len(o.data.vertices))
bpy.data.objects.remove(c, do_unlink=True)
from mathutils import Vector
from mathutils.bvhtree import BVHTree
import numpy as np
B = [o for o in bpy.data.objects if o.type == 'MESH' and o.data.shape_keys][0]     # avant-bras du patient retirés : ceux du corps les remplacent jusqu'au poignet
bm = bmesh.new(); bm.from_mesh(B.data)
bmesh.ops.delete(bm, geom=[f for f in bm.faces if 0.33 < abs((B.matrix_world @ f.calc_center_median()).x) < 0.52], context='FACES')
bm.to_mesh(B.data); bm.free(); print('Body', len(B.data.vertices))
for o in bpy.data.objects:
    if o.name == 'Body' and o.type != 'MESH': o.name = 'Body_noeud'
for o in bpy.data.objects:
    if o.type == 'MESH' and o.data.shape_keys: o.name = 'Body'
bpy.ops.wm.save_as_mainfile(filepath=sys.argv[-1]); print('OK')
