import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { noise, smoothstep } from './random.js';
import { groundHeight } from './terrain.js';

// One unit is roughly ten centimetres. Caps are continuous closed shells;
// lamellae form a continuous pleated surface with alternating shorter ridges.
export const MUSHROOMS = [
  { x:-.64,z:-.10,h:1.65,r:.77,bend:-.35,tilt:-.12,seed:16 },
  { x:.49,z:.03,h:1.20,r:.66,bend:.26,tilt:.12,seed:43 },
  { x:-.05,z:.58,h:.85,r:.49,bend:-.16,tilt:-.09,seed:91 },
  { x:.65,z:-.64,h:.67,r:.36,bend:.19,tilt:.20,seed:112 },
  { x:-1.04,z:.33,h:.44,r:.24,bend:-.04,tilt:-.13,seed:63 },
  { x:.12,z:-.82,h:1.91,r:.68,bend:-.09,tilt:.08,seed:128 },
  { x:1.52,z:-.70,h:1.64,r:.56,bend:.15,tilt:.12,seed:151 },
  { x:-1.25,z:-.76,h:1.10,r:.46,bend:-.13,tilt:-.22,seed:173 },
  { x:-.60,z:-1.25,h:.89,r:.41,bend:.09,tilt:.15,seed:191 },
  { x:.70,z:-1.35,h:1.05,r:.43,bend:.11,tilt:-.10,seed:211 },
  { x:-1.58,z:-.13,h:.65,r:.35,bend:-.09,tilt:.18,seed:237 },
  { x:-1.35,z:.72,h:.54,r:.31,bend:-.08,tilt:-.18,seed:257 },
  { x:-.76,z:1.03,h:.60,r:.38,bend:.06,tilt:.06,seed:281 },
  { x:.54,z:.94,h:.57,r:.32,bend:.09,tilt:.15,seed:307 },
  { x:1.18,z:.47,h:.81,r:.39,bend:.14,tilt:.22,seed:331 },
  { x:1.55,z:-.16,h:.57,r:.29,bend:.05,tilt:-.13,seed:353 },
  { x:-1.79,z:.45,h:.28,r:.17,bend:-.04,tilt:.09,seed:379 },
  { x:-.30,z:1.26,h:.35,r:.21,bend:-.02,tilt:-.14,seed:401 },
  { x:.94,z:1.13,h:.28,r:.19,bend:.06,tilt:.09,seed:421 },
  { x:1.64,z:.69,h:.37,r:.22,bend:.07,tilt:.21,seed:443 },
  { x:1.52,z:-1.06,h:.49,r:.25,bend:-.04,tilt:-.18,seed:467 },
  { x:-1.57,z:-1.20,h:.38,r:.22,bend:-.04,tilt:-.06,seed:487 },
  { x:-.93,z:1.40,h:.22,r:.14,bend:.01,tilt:.18,seed:503 },
  { x:.19,z:1.48,h:.24,r:.15,bend:.04,tilt:-.11,seed:521 },
  { x:-.22,z:-1.62,h:.43,r:.25,bend:-.05,tilt:.08,seed:547 },
].map(m=>({...m,bend:m.bend*1.3,dome:m.r<.3?.48:m.r<.45?.32:.24}));

export const CAP_WAVE_SCALE=.42;
export const capWave=(m,a)=>(Math.sin(a*5+m.seed)*.065+Math.sin(a*9+m.seed*.3)*.023+Math.sin(a*3+m.seed*.8)*.092)*CAP_WAVE_SCALE;
export const stemRadius=(m,u)=>m.r*(.155+.070*Math.exp(-u*9)+.018*Math.sin(u*5+m.seed)+.080*Math.pow(u,8));
export const GILL_RADIUS=.97;
export const gillEdgeTaper=u=>1-smoothstep(.88,GILL_RADIUS,u);

export function capPoint(m, radius, angle, underside = false) {
  const u=radius, a=angle, s=m.seed;
  const wave=capWave(m,a);
  const rim=m.r*(1+wave*u*u);
  const dome=m.dome*Math.pow(Math.max(0,1-u*u),.68)-.06*Math.exp(-u*u*18);
  const lower=-.27*Math.pow(Math.max(0,1-u),1.2)-.008-.024*smoothstep(.92,1,u);
  const fold=(.004*Math.sin(a*(m.r>.5?19:13)+s*.2+u*6)+.002*Math.sin(a*11+s+u*9))*Math.pow(u,4);
  const y=m.h+m.r*(underside?lower:dome)+wave*m.r*Math.pow(u,3)+fold*m.r;
  const x=Math.cos(a)*u*rim, z=Math.sin(a)*u*rim*.91;
  return [m.x+m.bend+x, y+x*m.tilt, m.z+z];
}

function geometryFrom(pos,ind,tissue,m,lamellae=false) {
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  if(tissue)g.setAttribute('tissue',new THREE.Float32BufferAttribute(tissue,3));
  // Coordinates within each individual cap keep the scattering gradient local
  // to its anatomy, including when the camera and illumination orbit the grove.
  const anatomy=[];
  for(let i=0;i<pos.length;i+=3)anatomy.push((pos[i]-m.x-m.bend)/m.r,pos[i+1]/m.h,(pos[i+2]-m.z)/(m.r*.91));
  g.setAttribute('anatomy',new THREE.Float32BufferAttribute(anatomy,3));
  const optical=[],axes=[],id=MUSHROOMS.indexOf(m)+1;
  for(let i=0;i<pos.length;i+=3){
    const u=tissue[i],part=tissue[i+1]===2?2:lamellae?1:0;
    if(part===2){
      const cx=m.x+m.bend*u*u+Math.sin(u*Math.PI)*.027;
      const cz=m.z+Math.sin(u*Math.PI)*.035;
      const radius=Math.hypot(pos[i]-cx,pos[i+2]-cz);
      optical.push(radius,radius*2,2,id);
      axes.push((m.bend*2*u+.027*Math.PI*Math.cos(u*Math.PI))/(m.h-m.r*.10),1,.035*Math.PI*Math.cos(u*Math.PI)/(m.h-m.r*.10));
    }else if(lamellae){
      // Broad folds are continuous flesh, not isolated thin membranes. Their
      // optical path includes both the cap and the depth of the local ridge.
      const angle=Math.atan2((pos[i+2]-m.z)/.91,pos[i]-m.x-m.bend);
      const upper=capPoint(m,u,angle)[1];
      optical.push(m.r,Math.max(.001,upper-pos[i+1]),1,id);
      axes.push(-m.tilt,1,0);
    }else{
      const angle=Math.atan2((pos[i+2]-m.z)/.91,pos[i]-m.x-m.bend);
      const thickness=capPoint(m,u,angle)[1]-capPoint(m,u,angle,true)[1];
      optical.push(m.r,thickness,part,id);axes.push(-m.tilt,1,0);
    }
  }
  g.setAttribute('optical',new THREE.Float32BufferAttribute(optical,4));
  g.setAttribute('tissueAxis',new THREE.Float32BufferAttribute(axes,3));
  g.setIndex(ind);g.computeVertexNormals();g.computeBoundingSphere();return g;
}

export function createCapGeometry(m,segments=m.r>.5?256:128,rings=m.r>.5?40:24) {
  const p=[],ix=[],t=[],stride=segments+1,half=1+rings*stride;
  for(let side=0;side<2;side++){
    const center=capPoint(m,0,0,side===1);p.push(...center);t.push(0,side,.5);
    for(let j=1;j<=rings;j++)for(let i=0;i<=segments;i++){
      const u=j/rings,a=i/segments*Math.PI*2;
      const point=capPoint(m,u,a,side===1);
      if(side===0)point[1]+=.0006*Math.sin(a*23+u*4)*u*u;
      p.push(...point);t.push(u,side,noise(point[0]*18,m.seed,point[2]*18));
    }
    const centerIndex=side*half,first=centerIndex+1;
    for(let i=0;i<segments;i++){
      if(side===0)ix.push(centerIndex,first+i+1,first+i);
      else ix.push(centerIndex,first+i,first+i+1);
    }
    for(let j=0;j<rings-1;j++)for(let i=0;i<segments;i++){
      const a=first+j*stride+i,b=a+stride;
      if(side===0)ix.push(a,a+1,b,b,a+1,b+1);else ix.push(a,b,a+1,b,b+1,a+1);
    }
  }
  for(let i=0;i<segments;i++){
    const a=1+(rings-1)*stride+i,b=a+half;
    ix.push(a,a+1,b,a+1,b+1,b);
  }
  return geometryFrom(p,ix,t,m);
}

export function createGillGeometry(m,count=Math.max(32,Math.round(64*m.r/.77/8)*8)) {
  const p=[],ix=[],t=[],segments=count*(m.r>.3?20:16),rings=m.r>.5?56:m.r>.3?40:24;
  // A continuous fluted hymenium keeps the valleys fleshy. Fine, irregular
  // ridges branch into half-length lamellulae without triangular open holes.
  for(let j=0;j<=rings;j++)for(let i=0;i<=segments;i++){
    const u=.115+(GILL_RADIUS-.115)*j/rings,baseAngle=i/segments*Math.PI*2;
    const a=baseAngle+(1.5*Math.sin(u*5+baseAngle*3+m.seed)+.35*Math.sin(u*11+baseAngle*7))/count;
    const phase=baseAngle*count;
    const variation=.5+.5*Math.sin(baseAngle*7+m.seed),begin=.12+.12*variation;
    const taper=smoothstep(begin,begin+.16,u);
    // A second fold grows out of a primary fold, then opens into the valley.
    // Different fork positions break the evenly spaced umbrella-rib pattern.
    const fork=smoothstep(.29+variation*.22,.85+variation*.1,u);
    const primary=Math.pow(.5+.5*Math.cos(phase),3.5);
    const branch=Math.pow(.5+.5*Math.cos(phase-Math.PI*fork),4.5)*smoothstep(0,.22,fork);
    const ridge=Math.max(primary,branch);
    const depth=m.r*(.026+.135*Math.sin(Math.PI*u))*(.85+.15*Math.sin(a*7+m.seed))*gillEdgeTaper(u);
    const q=capPoint(m,u,a,true);
    q[1]-=m.r*.002+depth*ridge*taper;
    p.push(...q);t.push(u,1,.25+.75*Math.pow(ridge,.35));
  }
  for(let j=0;j<rings;j++)for(let i=0;i<segments;i++){
    const a=j*(segments+1)+i,b=a+segments+1;
    ix.push(a,b,a+1,b,b+1,a+1);
  }
  return geometryFrom(p,ix,t,m,true);
}

export function createStemGeometry(m) {
  const p=[],ix=[],t=[],contact=[],rings=56,sides=72;
  for(let j=0;j<=rings;j++){
    const u=j/rings;
    const r=stemRadius(m,u);
    for(let i=0;i<=sides;i++){
      const a=i/sides*Math.PI*2;
      const grain=1+.002*Math.sin(a*23+u*2)+.0015*Math.sin(a*37-u*3)
        +(.012*Math.sin(a*7+m.seed)+.008*Math.sin(a*13-m.seed))*Math.exp(-u*20);
      const x=m.x+m.bend*u*u+Math.sin(u*Math.PI)*.027+Math.cos(a)*r*grain;
      const z=m.z+Math.sin(u*Math.PI)*.035+Math.sin(a)*r*grain;
      const soil=groundHeight(x,z),buried=Math.min(0,soil-.05-.015);
      const y=.015+(m.h-m.r*.10)*u+buried*Math.pow(1-u,12);
      p.push(x,y,z);contact.push(y-soil);
      t.push(u,2,noise(Math.cos(a)*8,m.seed,Math.sin(a)*8));
    }
  }
  for(let j=0;j<rings;j++)for(let i=0;i<sides;i++){
    const a=j*(sides+1)+i,b=a+sides+1;ix.push(a,b,a+1,b,b+1,a+1);
  }
  const geometry=geometryFrom(p,ix,t,m);
  geometry.setAttribute('soilContact',new THREE.Float32BufferAttribute(contact,1));
  return geometry;
}

export function createMushrooms(materials) {
  const group=new THREE.Group();group.name='Mushroom grove';
  const caps=[],lamellae=[],stipes=[];
  for(const m of MUSHROOMS){
    caps.push(createCapGeometry(m));lamellae.push(createGillGeometry(m));stipes.push(createStemGeometry(m));
  }
  for(const [geometries,material,name] of [[caps,materials.cap,'Caps'],[lamellae,materials.gills,'Lamellae'],[stipes,materials.stem,'Stipes']]){
    const mesh=new THREE.Mesh(mergeGeometries(geometries),material);mesh.name=name;
    group.add(mesh);
    geometries.forEach(geometry=>geometry.dispose());
  }
  return {group,layouts:MUSHROOMS};
}
