import * as THREE from 'three/webgpu';
import { Fn, instanceIndex, instancedArray, uniformArray, vec4 } from 'three/tsl';
import { MUSHROOMS } from '../mushrooms.js';

export async function checkLighting(){
  const s=window.spore,renderer=s.renderer,saved={manual:s.manual,glow:s.materials.glow.value};
  const results=[];
  const check=(name,pass,detail)=>{results.push({name,pass,detail});if(!pass)throw new Error(name+': '+JSON.stringify(detail));};
  let sample;
  try{
    s.manual=true;s.materials.glow.value=1;s.render();
    const lights=[];s.scene.traverse(o=>{if(o.isLight)lights.push(o.type);});
    check('standard lighting uses the warm spot and blue fill',renderer.lighting.constructor.name==='Lighting'&&lights.length===2&&lights.includes('SpotLight')&&lights.includes('PointLight'),{renderer:renderer.lighting.constructor.name,lights});
    const points=uniformArray(MUSHROOMS.map(m=>new THREE.Vector3(m.x,.14,m.z))),values=instancedArray(MUSHROOMS.length,'vec4');
    sample=Fn(()=>{values.element(instanceIndex).assign(vec4(s.materials.optics.groveEmission.sample(points.element(instanceIndex)),1));})().compute(MUSHROOMS.length);
    const read=async()=>{renderer.compute(sample);return new Float32Array(await renderer.getArrayBufferAsync(values.value));};
    const lit=await read();let green=0,finite=true;
    for(let i=0;i<lit.length;i+=4){finite&&=lit.slice(i,i+3).every(v=>Number.isFinite(v)&&v>0);green+=lit[i+1]>lit[i];}
    check('every stem base has finite green-dominant illumination',finite&&green===MUSHROOMS.length,{greenBases:green,total:MUSHROOMS.length});
    s.materials.glow.value=0;s.render();const dark=await read();
    check('Glow zero removes all cached emission',dark.every((v,i)=>i%4===3||v===0));
  }finally{s.materials.glow.value=saved.glow;s.render();s.manual=saved.manual;sample?.dispose();}
  return {date:new Date().toISOString(),results};
}
