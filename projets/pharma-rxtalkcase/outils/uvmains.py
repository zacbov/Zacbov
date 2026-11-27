import bpy, sys, numpy as np, os
src, nom = sys.argv[-2], sys.argv[-1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
from PIL import Image, ImageDraw
for o in bpy.context.scene.objects:
    if o.type != 'MESH': continue
    me = o.data; vg = {g.index: g.name for g in o.vertex_groups}
    hand = np.zeros(len(me.vertices))
    for v in me.vertices:
        for g in v.groups:
            if 'Hand' in vg[g.group]: hand[v.index] += g.weight
    if hand.max() < 0.5: continue
    uv = me.uv_layers.active.data
    for mi, mat in enumerate(me.materials):
        polys = [p for p in me.polygons if p.material_index == mi and hand[list(p.vertices)].mean() > 0.5]
        if len(polys) < 50: continue
        tex = [n for n in mat.node_tree.nodes if n.type == 'TEX_IMAGE' and n.image]
        base = None
        for n in tex:
            for l in n.outputs[0].links:
                if l.to_socket.name == 'Base Color': base = n.image
        base = base or (tex[0].image if tex else None)
        if not base: continue
        W, H = base.size; px = np.array(base.pixels[:]).reshape(H, W, base.channels)[::-1]
        im = Image.fromarray((np.clip(px[..., :3], 0, 1) ** (1 / 2.2 if base.colorspace_settings.name == 'Linear Rec.709' else 1) * 255).astype(np.uint8))
        out = '%s_%s' % (nom, mat.name)
        im.save(out + '_texture.png')
        ov = im.convert('RGBA'); d = ImageDraw.Draw(ov); xs = []; ys = []
        for p in polys:
            pts = [((uv[li].uv[0] % 1) * W, (1 - (uv[li].uv[1] % 1)) * H) for li in p.loop_indices]; d.line(pts + [pts[0]], fill=(255, 0, 255, 255), width=max(1, W // 2048))
            xs += [q[0] for q in pts]; ys += [q[1] for q in pts]
        ov.save(out + '_zone_mains.png')
        x0, x1, y0, y1 = int(min(xs)), int(max(xs)), int(min(ys)), int(max(ys))
        print(out, W, H, 'zone mains', x0, y0, x1, y1, len(polys), 'faces', base.name)
