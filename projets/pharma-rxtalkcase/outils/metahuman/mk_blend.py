# construit les maillages Blender depuis amanda.pkl (repère Blender : X gauche du personnage, -Y avant, Z haut, mètres)
import bpy, pickle, numpy as np, sys
import os
D = os.environ.get('MH_SRC', '/home/claude/mh/zip/AmandaBlack').rstrip('/') + '/'
def conv(P): P = np.asarray(P, dtype=np.float64) * 0.01; return np.c_[P[:, 0], -P[:, 2], P[:, 1]]
def build(res, name, mat=None, shapes=True):
    d = res['meshes'][name]; P = conv(d['P']); LP, LT, U = d['LP'], d['LT'], d['U']
    faces = [[int(LP[i]) for i in f] for f in d['F']]
    me = bpy.data.meshes.new(name); me.from_pydata(P.tolist(), [], faces); me.validate()
    uv = me.uv_layers.new(name='UVMap'); k = 0
    loops_uv = np.concatenate([U[LT[f]] for f in d['F']])
    uv.data.foreach_set('uv', loops_uv.astype(np.float32).ravel())
    for p in me.polygons: p.use_smooth = True
    o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o)
    if mat: me.materials.append(mat)
    if shapes and d['shapes']:
        o.shape_key_add(name='Basis', from_mix=False)
        for k_, dl in d['shapes'].items():
            kb = o.shape_key_add(name=k_, from_mix=False); kb.data.foreach_set('co', (P + conv(dl)).astype(np.float32).ravel())
    return o
def tex(name, img, alpha=False, normal=None, rough=0.55, col=None):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; b = nt.nodes['Principled BSDF']
    b.inputs['Roughness'].default_value = rough
    if img:
        t = nt.nodes.new('ShaderNodeTexImage'); t.image = bpy.data.images.load(D + 'Maps/' + img); nt.links.new(t.outputs['Color'], b.inputs['Base Color'])
        if alpha: nt.links.new(t.outputs['Alpha'], b.inputs['Alpha'])
    if col: b.inputs['Base Color'].default_value = col
    if normal:
        n = nt.nodes.new('ShaderNodeTexImage'); n.image = bpy.data.images.load(D + 'Maps/' + normal); n.image.colorspace_settings.name = 'Non-Color'
        nm = nt.nodes.new('ShaderNodeNormalMap'); nt.links.new(n.outputs['Color'], nm.inputs['Color']); nt.links.new(nm.outputs['Normal'], b.inputs['Normal'])
    return m
