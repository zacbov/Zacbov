import * as THREE from 'three/webgpu';
import { capPoint, capWave, gillEdgeTaper } from './mushrooms.js';

// The wavy cap is not a circular collision disc. Bake its upper surface and
// the lower envelope of the fins once, so particle collision and emission need
// one filtered lookup instead of recomputing all the folds per spore.
export function canopySample(m,x,z){
  const radial=Math.hypot(x,z),angle=Math.atan2(z,x),wave=capWave(m,angle);
  let u=Math.min(radial,1);
  if(radial>1+wave)u=1+(radial-1-wave);
  else for(let i=0;i<5;i++)u=Math.max(0,Math.min(1,u-(u*(1+wave*u*u)-radial)/(1+3*wave*u*u)));
  const q=Math.min(u,1),top=capPoint(m,q,angle),bottom=capPoint(m,q,angle,true);
  const depth=m.r*(.026+.135*Math.sin(Math.PI*q))*gillEdgeTaper(q);
  return [top[1]-m.h,bottom[1]-m.h-depth-.002,0,u];
}

export function createCanopySurface(layouts,size=96){
  const data=new Uint16Array(size*size*layouts.length*4),extent=2.4;
  for(let layer=0;layer<layouts.length;layer++)for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const bounds=canopySample(layouts[layer],((x+.5)/size-.5)*extent,((y+.5)/size-.5)*extent);
    const offset=((layer*size+y)*size+x)*4;
    for(let k=0;k<4;k++)data[offset+k]=THREE.DataUtils.toHalfFloat(bounds[k]);
  }
  const map=new THREE.DataArrayTexture(data,size,size,layouts.length);
  map.type=THREE.HalfFloatType;map.minFilter=map.magFilter=THREE.LinearFilter;
  map.needsUpdate=true;map.name='Wavy cap surfaces and fin envelope';
  return {map,extent};
}
