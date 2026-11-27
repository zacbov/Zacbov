import bpy, sys
bpy.ops.wm.read_factory_settings(use_empty=True)
f='/home/claude/v13/chat/avatar/equip/tire_lait.glb'
bpy.ops.import_scene.gltf(filepath=f)
o=[x for x in bpy.data.objects if x.type=='MESH'][0]; bpy.context.view_layer.objects.active=o; o.select_set(True)
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.separate(type='LOOSE'); bpy.ops.object.mode_set(mode='OBJECT')
k=0
for x in [x for x in bpy.data.objects if x.type=='MESH']:
    v=[x.matrix_world@p.co for p in x.data.vertices]; zmax=max(p.z for p in v); yc=sum(p.y for p in v)/len(v)
    if zmax<0.08 and -0.11<yc<-0.03: bpy.data.objects.remove(x); k+=1
ms=[x for x in bpy.data.objects if x.type=='MESH']
for x in ms: x.select_set(True)
bpy.context.view_layer.objects.active=ms[0]; bpy.ops.object.join()
bpy.ops.export_scene.gltf(filepath=f, export_format='GLB', export_draco_mesh_compression_enable=True, export_image_format='JPEG', export_yup=True)
print('retirés', k)
