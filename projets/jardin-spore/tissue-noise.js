import * as THREE from 'three/webgpu';
import { texture3D } from 'three/tsl';
import { randomSeed } from './random.js';

// A small periodic volume retains continuous, seam-free 3D tissue grain while
// replacing repeated procedural noise evaluations in every shaded fragment.
export function createTissueNoise(){
  const cells=32,size=64,random=randomSeed(160326),lattice=new Float32Array(cells**3);
  for(let i=0;i<lattice.length;i++)lattice[i]=random();
  const value=(x,y,z)=>lattice[((z&31)*cells+(y&31))*cells+(x&31)];
  const data=new Uint8Array(size**3),smooth=x=>x*x*(3-2*x),lerp=(a,b,t)=>a+(b-a)*t;
  for(let z=0;z<size;z++)for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const px=(x+.5)*.5,py=(y+.5)*.5,pz=(z+.5)*.5;
    const ix=Math.floor(px),iy=Math.floor(py),iz=Math.floor(pz),fx=smooth(px-ix),fy=smooth(py-iy),fz=smooth(pz-iz);
    const a=lerp(lerp(value(ix,iy,iz),value(ix+1,iy,iz),fx),lerp(value(ix,iy+1,iz),value(ix+1,iy+1,iz),fx),fy);
    const b=lerp(lerp(value(ix,iy,iz+1),value(ix+1,iy,iz+1),fx),lerp(value(ix,iy+1,iz+1),value(ix+1,iy+1,iz+1),fx),fy);
    data[(z*size+y)*size+x]=Math.round(lerp(a,b,fz)*255);
  }
  const volume=new THREE.Data3DTexture(data,size,size,size);
  volume.format=THREE.RedFormat;volume.type=THREE.UnsignedByteType;
  volume.minFilter=volume.magFilter=THREE.LinearFilter;
  volume.wrapS=volume.wrapT=volume.wrapR=THREE.RepeatWrapping;volume.unpackAlignment=1;volume.needsUpdate=true;
  volume.name='Continuous fungal tissue grain';
  const node=texture3D(volume);
  return position=>node.sample(position.div(cells)).r.mul(2).sub(1);
}
