import bpy, sys
bpy.ops.wm.open_mainfile(filepath=sys.argv[-2])
o = bpy.data.objects['Corps']; m = bpy.data.materials.new('Peau_corps_h'); m.use_nodes = True; nt = m.node_tree
bs = nt.nodes['Principled BSDF']; bs.inputs['Roughness'].default_value = 0.62
if 'Specular IOR Level' in bs.inputs: bs.inputs['Specular IOR Level'].default_value = 0.3
tx = nt.nodes.new('ShaderNodeTexImage'); tx.image = bpy.data.images.load(sys.argv[-1]); nt.links.new(tx.outputs['Color'], bs.inputs['Base Color'])
o.data.materials.clear(); o.data.materials.append(m)
for p in o.data.polygons: p.material_index = 0
bpy.ops.outliner.orphans_purge(do_recursive=True)
bpy.ops.wm.save_as_mainfile(filepath=sys.argv[-2])
