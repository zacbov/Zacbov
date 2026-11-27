# v37 : intérieur de bouche de la patiente v5 — jupe des lèvres vers l'intérieur, cavité sombre, poche d'origine retirée
import bpy, bmesh, numpy as np, math
bpy.ops.wm.open_mainfile(filepath='/home/claude/femme/v37/etape1.blend')
body=[o for o in bpy.data.objects if o.type=='MESH' and o.data.shape_keys and 'BoucheOuverte' in o.data.shape_keys.key_blocks][0]
me=body.data; keys=[k.name for k in me.shape_keys.key_blocks]
MAT={m.name:i for i,m in enumerate(me.materials)}
bm=bmesh.new(); bm.from_mesh(me); bm.verts.ensure_lookup_table(); bm.faces.ensure_lookup_table()
SH={k:bm.verts.layers.shape[k] for k in keys}; DF=bm.verts.layers.deform.active
X=np.array([v[SH['Basis']][:] for v in bm.verts]); BO=np.array([v[SH['BoucheOuverte']][:] for v in bm.verts])
piv=np.array([0,0.004,1.446])
def angle_of(i):
    a=X[i]-piv; b=BO[i]-piv
    return math.atan2(b[2],b[1])-math.atan2(a[2],a[1]) if np.linalg.norm(a[1:])>1e-6 else 0.0
# 1) poche buccale d'origine : la plus grande pièce de matériau Bouche qui monte haut (z > 1.43)
vmat=np.full(len(X),-1)
for f in bm.faces:
    for v in f.verts: vmat[v.index]=f.material_index
F=MAT['Peau_visage']; B=MAT['Bouche']; seen=set(); dele=[]
for v in bm.verts:
    if vmat[v.index]!=B or v.index in seen: continue
    comp=[]; st=[v]; seen.add(v.index)
    while st:
        u=st.pop(); comp.append(u)
        for e in u.link_edges:
            w=e.other_vert(u)
            if vmat[w.index]==B and w.index not in seen: seen.add(w.index); st.append(w)
    zz=[X[u.index,2] for u in comp]
    if max(zz)-min(zz)>0.03: dele=comp
print('poche retirée', len(dele))
bmesh.ops.delete(bm, geom=dele, context='VERTS')
bm.faces.ensure_lookup_table()
ANG=np.array([angle_of(i) for i in range(len(X))])/0.24
br=[]
for f in bm.faces:
    if f.material_index!=F: continue
    ids=[v.index for v in f.verts]
    if np.all(np.abs(X[ids,0])<0.015) and np.all(X[ids,1]<-0.045) and np.all(np.abs(X[ids,2]-1.414)<0.012) and ANG[ids].max()-ANG[ids].min()>0.45: br.append(f)
print('ponts retirés', len(br))
bmesh.ops.delete(bm, geom=br, context='FACES_ONLY')
newmat=len(me.materials); m2=bpy.data.materials.new('Bouche_interieur'); m2.use_nodes=True
p=m2.node_tree.nodes['Principled BSDF']; p.inputs['Base Color'].default_value=(0.07,0.015,0.017,1); p.inputs['Roughness'].default_value=0.85; m2.use_backface_culling=True
me.materials.append(m2)
# 3) cavité sombre : ellipsoïde aux normales vers l'intérieur, liée à la tête ; la moitié basse suit la mâchoire
hv=body.vertex_groups['mixamorig_Head'].index
ret=bmesh.ops.create_uvsphere(bm,u_segments=24,v_segments=16,radius=1.0)
C=np.array([0,-0.030,1.411]); R=np.array([0.030,0.032,0.023])
angC=0.24
for v in ret['verts']:
    q=np.array(v.co[:])*R+C; v.co=q.tolist()
    w=1/(1+math.exp(-(C[2]-q[2])/0.004))      # bas -> 1
    a=angC*w; d=q-piv; c,s=math.cos(a),math.sin(a); P=np.array([q[0],piv[1]+d[1]*c-d[2]*s,piv[2]+d[1]*s+d[2]*c])
    for kn in keys:
        v[SH[kn]]=(P if kn=='BoucheOuverte' else q).tolist()
    v[DF][hv]=1.0
fs=list({f for v in ret['verts'] for f in v.link_faces})
for f in fs: f.material_index=newmat; f.smooth=True
bmesh.ops.reverse_faces(bm,faces=fs)
bm.to_mesh(me); me.update(); bm.free()
print('cavité', len(ret['verts']))
bpy.ops.wm.save_as_mainfile(filepath='/home/claude/femme/v37/femme_rig.blend')
