import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { MUSHROOMS, stemRadius } from './mushrooms.js';
import { groundHeight } from './terrain.js';
import { randomSeed } from './random.js';

// Fine mycelial cords and adhering humus connect fruiting bodies to substrate.
// Everything is opaque geometry, merged into two draws rather than alpha cards.
export function createSubstrate(materials){
  const group=new THREE.Group();group.name='Mycelium and damp stem contacts';
  const fibres=[],clods=[],stone=new THREE.IcosahedronGeometry(1,0);
  const object=new THREE.Object3D();let cords=0,grains=0;
  const stipePoint=(m,a,y)=>{
    const u=THREE.MathUtils.clamp((y-.015)/(m.h-m.r*.1),0,1),r=stemRadius(m,u);
    return new THREE.Vector3(m.x+m.bend*u*u+Math.sin(u*Math.PI)*.027+Math.cos(a)*r,
      y,m.z+Math.sin(u*Math.PI)*.035+Math.sin(a)*r);
  };
  function filament(points,radius,tint){
    const curve=new THREE.CatmullRomCurve3(points),segments=14,sides=5;
    const g=new THREE.TubeGeometry(curve,segments,1,sides,false),p=g.attributes.position,c=[];
    const end=new THREE.Color('#4a4930');
    for(let j=0;j<=segments;j++){
      const u=j/segments,center=curve.getPointAt(u),r=radius*(.10+.90*Math.pow(1-u,.9));
      const col=tint.clone().lerp(end,Math.pow(u,2)*.65);
      for(let k=0;k<=sides;k++){
        const i=j*(sides+1)+k;
        p.setXYZ(i,center.x+(p.getX(i)-center.x)*r,center.y+(p.getY(i)-center.y)*r,center.z+(p.getZ(i)-center.z)*r);
        c.push(col.r,col.g,col.b);
      }
    }
    g.setAttribute('pigment',new THREE.Float32BufferAttribute(c,3));g.computeVertexNormals();fibres.push(g);cords++;
  }
  for(const m of MUSHROOMS){
    const random=randomSeed(m.seed+9173),soil=groundHeight(m.x,m.z);
    for(let i=0;i<14+Math.floor(m.r*16);i++){
      const a=random()*Math.PI*2,start=stipePoint(m,a,soil+.018+random()*.045);
      const length=.035+random()*(.045+m.r*.16),bend=(random()-.5)*.8;
      const points=Array.from({length:7},(_,j)=>{
        const u=j/6,angle=a+bend*u;
        const x=start.x+Math.cos(angle)*length*u,z=start.z+Math.sin(angle)*length*u;
        const ground=groundHeight(x,z)+.001;
        return new THREE.Vector3(x,ground+(start.y-ground)*Math.pow(1-u,3)+Math.sin(u*Math.PI)*.003,z);
      });
      const tint=new THREE.Color('#b7b699').lerp(new THREE.Color('#e2d6b5'),random()*.5);
      filament(points,.0008+random()*.0012+m.r*.0008,tint);
      if(i%2===0){
        const from=points[3],branch=a+(random()>.5?.65:-.65),l=length*.55;
        filament(Array.from({length:5},(_,j)=>{
          const u=j/4,x=from.x+Math.cos(branch)*l*u,z=from.z+Math.sin(branch)*l*u;
          return new THREE.Vector3(x,groundHeight(x,z)+.0015+(from.y-groundHeight(from.x,from.z))*(1-u),z);
        }),.0005+random()*.0005,tint);
      }
    }
    // Short downy fibres sit against the lower stipe, above the irregular soil line.
    for(let i=0;i<24;i++){
      const a=random()*Math.PI*2,h=.015+random()*.085,start=stipePoint(m,a,soil+h);
      const end=stipePoint(m,a+(random()-.5)*.05,soil+h+.008+random()*.020);
      const mid=start.clone().lerp(end,.5).add(new THREE.Vector3(Math.cos(a)*.002,.001,Math.sin(a)*.002));
      filament([start,mid,end],.00035+random()*.0003,new THREE.Color('#cfceb4'));
    }
    for(let i=0;i<30+Math.floor(m.r*50);i++){
      const a=random()*Math.PI*2,offset=Math.pow(random(),2)*(.045+m.r*.12);
      const base=stipePoint(m,a,soil+.012),x=base.x+Math.cos(a)*offset,z=base.z+Math.sin(a)*offset;
      const size=.002+Math.pow(random(),2)*.010;
      object.position.set(x,groundHeight(x,z)+size*.25,z);
      if(i%4===0){
        const stuck=stipePoint(m,a,soil+.007+random()*.024);
        object.position.copy(stuck).add(new THREE.Vector3(Math.cos(a)*size*.35,0,Math.sin(a)*size*.35));
      }
      object.rotation.set(random()*3,random()*6,random()*3);
      object.scale.set(size*(.6+random()),size*(.3+random()*.6),size*(.6+random()));object.updateMatrix();
      const g=stone.clone().applyMatrix4(object.matrix),c=[];
      const tint=new THREE.Color('#17120b').lerp(new THREE.Color('#68513a'),random()*.8);
      for(let j=0;j<g.attributes.position.count;j++)c.push(tint.r,tint.g,tint.b);
      g.setAttribute('pigment',new THREE.Float32BufferAttribute(c,3));clods.push(g);grains++;
    }
  }
  for(const [geometries,material,name] of [[fibres,materials.mycelium,'Fine basal mycelium'],[clods,materials.substrate,'Adhering humus and soil crumbs']]){
    const mesh=new THREE.Mesh(mergeGeometries(geometries),material);mesh.name=name;group.add(mesh);
    geometries.forEach(g=>g.dispose());
  }
  stone.dispose();
  return {group,stats:{mycelialCords:cords,soilGrains:grains}};
}
