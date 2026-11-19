import * as THREE from 'three/webgpu';
import { normalWorld, positionWorld, texture3D, vec3 } from 'three/tsl';
import { MUSHROOMS } from './mushrooms.js';

// Cache steady bioluminescent bounce from the stem bases and gill centers.
// This volume approximates diffuse area emission without another per-leaf light
// loop. Only the warm spotlight and blue fill are real-time scene lights.
export function createGroveLight(glow){
  const width=64,height=24,depth=64,energy=new Uint16Array(width*height*depth*4),direction=new Uint16Array(energy.length);
  const lights=[['#c7ff78',.22,-.9,.19,.45,1.1],['#57ffd5',.19,.85,.16,.65,1.1],['#76ffb0',.12,-.15,.22,-.75,1.1]]
    .map(([tint,power,x,y,z,range])=>({color:new THREE.Color(tint),power,range,position:new THREE.Vector3(x,y,z)}));
  for(const [index,m] of MUSHROOMS.entries()){
    const trait=Math.sin((index+1)*12.9898)*43758.5453,individual=trait-Math.floor(trait);
    const tint=new THREE.Color('#c5ff72').lerp(new THREE.Color('#65ffc5'),individual);
    lights.push({color:tint,power:.018+.10*m.r*m.r,range:.35+.60*m.r,position:new THREE.Vector3(m.x,.14,m.z)});
    lights.push({color:new THREE.Color('#ffb74d'),power:.09*m.r*m.r,range:.10+1.6*m.r,position:new THREE.Vector3(m.x+m.bend,m.h-m.r*.28,m.z)});
  }
  const p=new THREE.Vector3(),offset=new THREE.Vector3(),sum=new THREE.Color(),axis=new THREE.Vector3();
  for(let z=0;z<depth;z++)for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    p.set((x+.5)/width*6-3,(y+.5)/height*2.4-.2,(z+.5)/depth*6-3);sum.setRGB(0,0,0);axis.set(0,0,0);
    for(const light of lights){
      offset.copy(light.position).sub(p);const d2=offset.lengthSq(),fade=Math.max(0,1-(d2/(light.range*light.range))**2)**2;
      const flux=light.power*fade/(d2+.025);
      sum.r+=light.color.r*flux;sum.g+=light.color.g*flux;sum.b+=light.color.b*flux;
      axis.addScaledVector(offset.normalize(),flux*(light.color.r*.2126+light.color.g*.7152+light.color.b*.0722));
    }
    axis.normalize();const i=((z*height+y)*width+x)*4;
    for(const [buffer,values] of [[energy,[sum.r,sum.g,sum.b,1]],[direction,[axis.x,axis.y,axis.z,1]]])
      for(let k=0;k<4;k++)buffer[i+k]=THREE.DataUtils.toHalfFloat(values[k]);
  }
  function volume(data,name){
    const map=new THREE.Data3DTexture(data,width,height,depth);map.type=THREE.HalfFloatType;map.format=THREE.RGBAFormat;
    map.minFilter=map.magFilter=THREE.LinearFilter;map.needsUpdate=true;map.name=name;return texture3D(map);
  }
  const energyNode=volume(energy,'Grove diffuse irradiance');
  const coord=point=>point.add(vec3(3,.2,3)).div(vec3(6,2.4,6));
  const irradiance=point=>energyNode.sample(coord(point)).rgb.mul(glow.mul(5));
  const lightDirection=volume(direction,'Grove dominant light direction').sample(coord(positionWorld)).xyz;
  const facing=normalWorld.dot(lightDirection).max(0).mul(.65).add(.35);
  return {surface:irradiance(positionWorld).mul(facing),sample:irradiance};
}
