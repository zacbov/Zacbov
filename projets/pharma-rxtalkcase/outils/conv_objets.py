import bpy, sys, os, math, mathutils
exec(open('/home/claude/mh/obj/prev.py').read().split("def shot")[0])
OUT='/home/claude/v13/chat/avatar/equip/'
A='/home/claude/assets/obj/'
import glob
g=lambda s: glob.glob(A+s)[0]
JOBS=[ # nom, source, plus grande dimension (m), rotation (deg xyz), faces max
 ('gants_boite', g('*nitrile_glove_box_v2.glb'), 0.24, (0,0,0), 2000),
 ('gant', g('*rubber_med_gloves*.glb'), 0.25, (0,0,0), 5000),
 ('tire_lait', g('*manual_breast_pump.glb'), 0.2, (0,0,0), 24000),
 ('ciseaux', g('*tactical__scissors.glb'), 0.19, (0,90,0), 3000),
 ('stethoscope', g('*doctors_stethoscope.glb'), 0.55, (90,0,0), 6000),
 ('otoscope', g('*otoscope.glb'), 0.15, (0,0,0), 6000),
 ('fauteuil_roulant', g('*wheelchair.glb'), 1.05, (0,0,0), 14000),
 ('sha', g('Purell*/model_0.obj'), 0.3, (0,0,0), 1100),
 ('poche_urine', g('Urine_Bag/model_0.obj'), 0.32, (0,0,0), 1000),
 ('sonde_ng', g('S01*/model_1.obj'), 0.3, (90,0,0), 4600),
 ('change_complet', g('Pediatric_Pullup/model_0.obj'), 0.28, (0,0,0), 7000),
 ('bracelet_id', g('Infant*/model_0.obj'), 0.085, (0,0,0), 6000),
 ('bas_produit', g('U.CR*/model_0.obj'), 0.5, (0,0,0), 9000),
]
only=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
for nom,src,L,rot,fmax in JOBS:
    if only and nom not in only: continue
    ms,mn,mx,tris,imgs=load(src); texture(src,ms)
    bpy.ops.object.select_all(action='DESELECT')
    for o in ms: o.select_set(True)
    bpy.context.view_layer.objects.active=ms[0]
    for o in bpy.data.objects:
        if o.type!='MESH': o.select_set(False)
    bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM'); bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    if len(ms)>1: bpy.ops.object.join()
    o=bpy.context.view_layer.objects.active
    for x in [x for x in bpy.data.objects if x!=o]: bpy.data.objects.remove(x)
    if tris>fmax:
        d=o.modifiers.new('d','DECIMATE'); d.ratio=fmax/tris; bpy.ops.object.modifier_apply(modifier='d')
    R=mathutils.Euler([math.radians(r) for r in rot]).to_matrix()
    for x in o.data.vertices: x.co=R@(o.matrix_world@x.co)
    o.matrix_world=mathutils.Matrix()
    v=[o.matrix_world@x.co for x in o.data.vertices]; mn=mathutils.Vector([min(p[i] for p in v) for i in range(3)]); mx=mathutils.Vector([max(p[i] for p in v) for i in range(3)])
    s=L/max(mx-mn); c=(mn+mx)/2
    for x in o.data.vertices: p=(x.co-mathutils.Vector((c.x,c.y,mn.z)))*s; x.co=p
    o.name=nom
    bpy.ops.object.shade_smooth()
    for p_ in o.data.polygons: p_.use_smooth=True
    for im in bpy.data.images:
        if im.size[0]>1024: im.scale(1024,1024)
    bpy.ops.export_scene.gltf(filepath=OUT+nom+'.glb', export_format='GLB', export_draco_mesh_compression_enable=True, export_image_format='JPEG', export_jpeg_quality=85, export_yup=True)
    print('OK',nom, os.path.getsize(OUT+nom+'.glb')//1024,'Ko', 'faces',len(o.data.polygons), 'dims', tuple(round(t*s,3) for t in (mx-mn)))
