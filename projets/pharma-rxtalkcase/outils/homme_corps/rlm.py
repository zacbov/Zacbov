# rendus de face (orthographiques, même caméra) de la tête du patient et du scan recalé, pour la détection des repères du visage
import bpy, math, mathutils, sys
bpy.ops.wm.open_mainfile(filepath=sys.argv[-1])
sc = bpy.context.scene; sc.render.engine = 'BLENDER_WORKBENCH'; sc.display.shading.light = 'FLAT'; sc.display.shading.color_type = 'TEXTURE'
sc.render.resolution_x = sc.render.resolution_y = 1024
cam = bpy.data.cameras.new('c'); cam.type = 'ORTHO'; cam.ortho_scale = 0.3; c = bpy.data.objects.new('c', cam); sc.collection.objects.link(c); sc.camera = c
c.location = (0.015, -2.0, 1.66); c.rotation_euler = (math.pi / 2, 0, 0)
for nom in ('Body', 'Scan'):
    for o in bpy.data.objects:
        if o.type == 'MESH': o.hide_render = o.name != nom
    sc.render.filepath = '/home/claude/mh/homme/mp/face_%s.png' % nom; bpy.ops.render.render(write_still=True)
