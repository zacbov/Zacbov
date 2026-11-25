import bpy, math, mathutils, sys
S='/tmp/claude-0/-home-claude/3cbefd70-72fd-56dd-9703-3dcec06b4f76/scratchpad/'
bpy.ops.wm.open_mainfile(filepath=sys.argv[-2]); tag=sys.argv[-1]
for o in bpy.data.objects:
    if o.type=='MESH' and o.name not in ('Body','Scan'): o.hide_render=True
sc=bpy.context.scene; sc.render.engine='BLENDER_WORKBENCH'; sc.display.shading.color_type='TEXTURE' if 'tex' in tag else 'OBJECT'; sc.render.resolution_x=500; sc.render.resolution_y=600
for o in bpy.data.objects: o.color=(0.9,0.5,0.4,1) if o.name=='Scan' else (0.4,0.6,0.9,1)
cam=bpy.data.cameras.new('c'); cam.type='ORTHO'; cam.ortho_scale=0.32; c=bpy.data.objects.new('c',cam); sc.collection.objects.link(c); sc.camera=c
for k,(d,rz) in enumerate(((mathutils.Vector((0,-1,0)),0),(mathutils.Vector((1,0,0)),math.pi/2),(mathutils.Vector((-0.7,-0.7,0)),-math.pi/4))):
    c.location=mathutils.Vector((0.015,-0.02,1.66))+d*3; c.rotation_euler=(math.pi/2,0,rz)
    sc.render.filepath=S+f'{tag}{k}.png'; bpy.ops.render.render(write_still=True)
from PIL import Image
im=Image.new('RGB',(1500,600)); [im.paste(Image.open(S+f'{tag}{k}.png').convert('RGB'),(500*k,0)) for k in range(3)]; im.resize((1200,480)).save(S+tag+'.jpg',quality=82)
