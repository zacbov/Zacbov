import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createTuftGeometry, createAccentGeometry } from './botany.js';
import { randomSeed, noise } from './random.js';
import { createMossDetailLevels, createMossLODMaterials, mossLODReady } from './moss-lod.js';
import { cushions, groundHeight, pondField } from './terrain.js';
import { MUSHROOMS, stemRadius } from './mushrooms.js';
import { createSubstrate } from './substrate.js';
export { groundHeight, mossHeight } from './terrain.js';

function leafGeometry(seed) {
  const random=randomSeed(seed),p=[],c=[],ix=[],surface=[];
  const dry=random()>.35;
  const tint=new THREE.Color().setHSL(dry?.065+random()*.045:.19+random()*.06,.5+random()*.2,dry?.19+random()*.12:.16+random()*.08);
  const seg=20;
  for(let j=0;j<=seg;j++)for(let k=0;k<3;k++){
    const u=j/seg,v=k-1;
    const w=Math.pow(Math.sin(u*Math.PI),.85)*(.32+(dry?.10:.035)*Math.sin(u*31));
    p.push(u,Math.sin(u*Math.PI)*.13-Math.abs(v)*w*.20+.025*Math.sin(u*23+seed)*Math.abs(v)+u*u*(dry?.2:0),v*w);
    surface.push(u,v);
    const col=tint.clone().multiplyScalar(k===1?1.15:.85+random()*.15);c.push(col.r,col.g,col.b);
  }
  for(let j=0;j<seg;j++)for(let k=0;k<2;k++){
    const a=j*3+k;ix.push(a,a+3,a+1,a+1,a+3,a+4);
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('pigment',new THREE.Float32BufferAttribute(c,3));g.setAttribute('leafSurface',new THREE.Float32BufferAttribute(surface,2));g.setIndex(ix);g.computeVertexNormals();return g;
}

// Keep the whole fallen leaf clear of the curved stipes. Its bounding sphere
// is conservative, so triangles cannot pierce a stem between sampled vertices.
function placeLeafClearOfStems(leaf){
  leaf.geometry.computeBoundingSphere();
  const local=leaf.geometry.boundingSphere,center=new THREE.Vector3();
  const radius=local.radius*leaf.scale.x;
  for(let attempt=0;attempt<32;attempt++){
    leaf.updateMatrix();center.copy(local.center).applyMatrix4(leaf.matrix);
    let overlap=null;
    for(const m of MUSHROOMS){
      if(center.y-radius>m.h||center.y+radius<-.1)continue;
      // Include the bend over the leaf's height as well as the stem radius.
      const low=Math.max(0,(center.y-radius-.03)/m.h),high=Math.min(1,(center.y+radius+.03)/(m.h-m.r*.1));
      for(let j=0;j<=8;j++){
        const u=low+(high-low)*j/8,x=m.x+m.bend*u*u+Math.sin(u*Math.PI)*.027,z=m.z+Math.sin(u*Math.PI)*.035;
        const dx=center.x-x,dz=center.z-z,d=Math.hypot(dx,dz),clearance=radius+stemRadius(m,u)*1.025+.02;
        if(d<clearance){overlap={dx:dx||.001,dz,d,clearance};break;}
      }
      if(overlap)break;
    }
    if(!overlap)return true;
    const {dx,dz,d,clearance}=overlap,amount=(clearance-d+.01)/Math.max(d,.001);
    const oldGround=groundHeight(leaf.position.x,leaf.position.z);
    leaf.position.x+=dx*amount;leaf.position.z+=dz*amount;
    leaf.position.y+=groundHeight(leaf.position.x,leaf.position.z)-oldGround;
  }
  return false;
}

export async function createForest(materials) {
  await mossLODReady;
  const group=new THREE.Group();group.name='Forest floor';
  const geo=new THREE.PlaneGeometry(60,60,400,400);geo.rotateX(-Math.PI/2);
  const p=geo.attributes.position;
  for(let i=0;i<p.count;i++)p.setY(i,groundHeight(p.getX(i),p.getZ(i)));
  geo.computeVertexNormals();const floor=new THREE.Mesh(geo,materials.ground);group.add(floor);
  const random=randomSeed(161611),object=new THREE.Object3D(),moss=new THREE.BundleGroup();
  const buckets=Array.from({length:5},()=>new Map());
  function addTuft(x,z,scale,variant,cell=.8){
    object.position.set(x,groundHeight(x,z)-.009,z);
    object.rotation.set((random()-.5)*.5,random()*Math.PI*2,(random()-.5)*.5);
    object.scale.set(scale,scale*(.65+random()*.3),scale);object.updateMatrix();
    const cx=Math.floor(x/cell),cz=Math.floor(z/cell),key=`${cell}:${cx},${cz}`,bucket=buckets[variant];
    if(!bucket.has(key))bucket.set(key,{center:new THREE.Vector3((cx+.5)*cell,0,(cz+.5)*cell),matrices:[]});
    bucket.get(key).matrices.push(object.matrix.clone());
  }
  for(let i=0;i<5200;i++){
    const clustered=i<1700,colonyCenter=cushions[i%cushions.length];
    const a=random()*Math.PI*2,r=(clustered?colonyCenter.radius:2.7)*Math.sqrt(random());
    const x=Math.cos(a)*r+(clustered?colonyCenter.x:0),z=Math.sin(a)*r+(clustered?colonyCenter.z:0);
    const colony=noise(x*1.3,7,z*1.3);
    if(!clustered&&random()>colony*.95+.15)continue;
    addTuft(x,z,1.2+random()*.65,i%5);
  }
  // La mousse couvre tout le sol du jardin (touffes plus grosses et plus espacées au-delà du bosquet),
  // pour que les plantes poussent dans un tapis et pas sur de la terre nue. Réglages : MOSS_EXTRA, MOSS_R.
  const MOSS_EXTRA=4500,MOSS_R=12;
  for(let i=0;i<MOSS_EXTRA;i++){
    const a=random()*Math.PI*2,r=2.7+(MOSS_R-2.7)*Math.sqrt(random()),x=Math.cos(a)*r,z=Math.sin(a)*r;
    if(pondField(x,z)<.25||groundHeight(x,z)<-.05)continue;
    if(random()>noise(x*.6,3,z*.6)*.9+.35)continue;
    addTuft(x,z,2.6+random()*1.2,i%5,2);
  }
  // Small uneven patches grow right against each stipe, hiding the straight
  // soil intersection without making a continuous artificial ring.
  for(const m of MUSHROOMS){
    const radius=stemRadius(m,0);
    for(let i=0;i<12;i++){
      const a=random()*Math.PI*2,r=radius+.013+random()*.065;
      addTuft(m.x+Math.cos(a)*r,m.z+Math.sin(a)*r,.52+random()*.48,i%5);
    }
  }
  const mossLOD=createMossLODMaterials(materials.moss);
  let leaves=0,tufts=0;
  for(let i=0;i<5;i++){
    // Five curved rings give close leaves 40 triangles instead of 16.
    // The pruned medium/far surfaces still come from the original coarse tuft.
    const near=createTuftGeometry(170+i*17,7,6),far=createTuftGeometry(170+i*17,7,2);
    const details=createMossDetailLevels(near,far);far.dispose();
    for(const {center,matrices} of buckets[i].values()){
      const lod=new THREE.LOD();lod.position.copy(center);lod.autoUpdate=false;
      lod.userData.mossBlend=true;
      for(const [level,geometry] of [...details,details[2]].entries()){
        const mesh=new THREE.InstancedMesh(geometry,mossLOD.materials[level],matrices.length);
        matrices.forEach((matrix,j)=>{
          const local=matrix.clone();local.elements[12]-=center.x;local.elements[14]-=center.z;mesh.setMatrixAt(j,local);
        });
        mesh.instanceMatrix.needsUpdate=true;mesh.name=`Day 5 meshlet moss ${i+1}`;
        mesh.computeBoundingSphere();lod.addLevel(mesh,[0,1.8,2.9,3.2][level]);
      }
      moss.add(lod);leaves+=near.userData.leaves*matrices.length;tufts+=matrices.length;
    }
  }
  group.add(moss);
  const accents=[];
  for(let i=0;i<155;i++){
    const a=random()*Math.PI*2,r=.25+Math.sqrt(random())*2.05,x=Math.cos(a)*r,z=Math.sin(a)*r;
    const geometry=createAccentGeometry(4200+i,i%2===0?0:1);
    object.position.set(x,groundHeight(x,z)+.012,z);object.rotation.set(0,random()*Math.PI*2,0);
    object.scale.setScalar(.65+random()*.55);object.updateMatrix();accents.push(geometry.applyMatrix4(object.matrix));
  }
  const accentMesh=new THREE.Mesh(mergeGeometries(accents),materials.foliage);accentMesh.name='Sorrel and violet woodland shoots';
  group.add(accentMesh);accents.forEach(g=>g.dispose());
  // Fallen branches and slender root fibres embed the grove in real soil.
  for(let i=0;i<28;i++){
    const x=(random()-.5)*5,z=(random()-.5)*5;
    const curve=new THREE.CatmullRomCurve3(Array.from({length:6},(_,j)=>new THREE.Vector3(x+(j/5-.5)*(.4+random()*.5),groundHeight(x,z)+.012+Math.sin(j)*.02,z+j*.025)));
    const twig=new THREE.Mesh(new THREE.TubeGeometry(curve,25,.008+random()*.018,7,false),materials.bark);
    group.add(twig);
  }
  const litter=[];
  for(let i=0;i<45;i++){
    const a=random()*Math.PI*2,r=.75+random()*2.2,x=Math.cos(a)*r,z=Math.sin(a)*r;
    const leaf=new THREE.Mesh(leafGeometry(i+931),materials.leaf);
    leaf.position.set(x,groundHeight(x,z)+.06,z);leaf.rotation.set((random()-.5)*.6,random()*Math.PI*2,(random()-.5)*.8);
    leaf.scale.setScalar(.16+random()*.20);
    if(!placeLeafClearOfStems(leaf)){leaf.geometry.dispose();continue;}
    leaf.updateMatrix();
    litter.push(leaf.geometry.applyMatrix4(leaf.matrix));
  }
  const litterMesh=new THREE.Mesh(mergeGeometries(litter),materials.leaf);
  litterMesh.name='Veined woodland leaf litter';group.add(litterMesh);
  litter.forEach(g=>g.dispose());
  const substrate=createSubstrate(materials);group.add(substrate.group);
  return {group,moss,mossLOD,substrate,stats:{tufts,leaves,...substrate.stats}};
}
