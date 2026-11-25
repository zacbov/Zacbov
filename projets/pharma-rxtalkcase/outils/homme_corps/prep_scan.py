import bpy, sys, numpy as np, bmesh
src, out, nf = sys.argv[-3], sys.argv[-2], int(sys.argv[-1])
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
M=[o for o in bpy.data.objects if o.type=='MESH']
dg=bpy.context.evaluated_depsgraph_get(); objs=[]
for o in M:
    me=bpy.data.meshes.new_from_object(o.evaluated_get(dg)); me.transform(o.matrix_world); n=bpy.data.objects.new('S',me); bpy.context.scene.collection.objects.link(n); objs.append(n)
for o in list(bpy.data.objects):
    if o not in objs: bpy.data.objects.remove(o, do_unlink=True)
bpy.ops.object.select_all(action='DESELECT')
for o in objs: o.select_set(True)
bpy.context.view_layer.objects.active=objs[0]; bpy.ops.object.join(); s=bpy.context.active_object; s.name=s.data.name='Scan'
bm=bmesh.new(); bm.from_mesh(s.data); bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5); bm.to_mesh(s.data); bm.free()
f0=len(s.data.polygons); md=s.modifiers.new('d','DECIMATE'); md.ratio=nf/f0; bpy.ops.object.modifier_apply(modifier='d')
print('faces', f0, '->', len(s.data.polygons), 'verts', len(s.data.vertices))
for im in bpy.data.images:
    print('image', im.name, im.size[:])
    if im.size[0] > 0:
        im.scale(min(4096, im.size[0]), min(4096, im.size[1])); im.filepath_raw = out.replace('.blend', '_tex.png'); im.file_format='PNG'; im.save()
bpy.ops.wm.save_as_mainfile(filepath=out)
