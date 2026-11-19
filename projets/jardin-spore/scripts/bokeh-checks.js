import * as THREE from 'three/webgpu';
import { Fn, instancedArray, instanceIndex, uniform, vec4 } from 'three/tsl';
import { createParticleCulling } from '../particle-culling.js';
import { createEmitterTable } from '../spatial-grid.js';
import { MUSHROOMS } from '../mushrooms.js';

// An isolated draw-list fixture tests sampling without camera occlusion or
// mushroom placement hiding some sources in the actual scene.
export async function checkBokeh(){
  const renderer=spore.renderer,count=65536,positions=instancedArray(count,'vec4');
  const fill=Fn(()=>positions.element(instanceIndex).assign(vec4(0,0,-2,1)))().compute(count);
  const cull=createParticleCulling(positions,count,uniform(4),uniform(.01),()=>vec4(1));
  const camera=new THREE.PerspectiveCamera(40,1,.01,10);camera.updateMatrixWorld();
  const results=[],check=(name,pass,detail)=>{results.push({name,pass,detail});if(!pass)throw new Error(name);};
  try{
    renderer.compute(fill);cull.prepare(renderer,camera,count);
    const args=new Uint32Array(await renderer.getArrayBufferAsync(cull.args));
    const ids=new Uint32Array(await renderer.getArrayBufferAsync(cull.bokehIDs.value,null,0,args[5]*4));
    const blocks=new Set(ids.map(id=>Math.floor(id/16))),table=createEmitterTable(MUSHROOMS);
    const populations=Array(MUSHROOMS.length).fill(0);for(const id of ids)populations[table[id%table.length]]++;
    check('one defocused sample per block stays within draw capacity',ids.length===count/16&&blocks.size===count/16&&ids.every(id=>id<count),{samples:ids.length,blocks:blocks.size});
    check('defocused samples include every mushroom emitter',populations.every(n=>n>20),{populations});
  }finally{fill.dispose();cull.dispose();}
  return {date:new Date().toISOString(),results};
}
