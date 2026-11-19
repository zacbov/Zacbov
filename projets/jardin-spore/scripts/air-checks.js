import { Fn, instanceIndex, instancedArray, vec4 } from 'three/tsl';
import { MUSHROOMS } from '../mushrooms.js';
import { canopySample } from '../canopy-surface.js';

export async function checkAir(){
  const s=window.spore,r=s.renderer,saved={manual:s.manual,wind:s.spores.wind.value};
  const results=[],n=4096;
  const check=(name,pass,detail)=>{results.push({name,pass,detail});if(!pass)throw new Error(name+': '+JSON.stringify(detail));};
  const force=Fn(()=>{s.spores.positions.element(instanceIndex).w.assign(100);})().compute(n);
  const values=instancedArray(n,'vec4');
  const sample=Fn(()=>{values.element(instanceIndex).assign(vec4(s.spores.airField.sample(s.spores.positions.element(instanceIndex).xyz),1));})().compute(n);
  const field=async()=>{r.compute(sample);return new Float32Array(await r.getArrayBufferAsync(values.value));};
  try{
    s.manual=true;s.spores.wind.value=1;r.compute(force);s.advance(1/60);
    const p=new Float32Array(await r.getArrayBufferAsync(s.spores.positions.value,null,0,n*16));
    const populations=Array(MUSHROOMS.length).fill(0);let invalid=0;
    for(let i=0;i<n;i++){
      const id=s.spores.emitterTable[i%s.spores.emitterTable.length],m=MUSHROOMS[id];
      const x=(p[i*4]-m.x-m.bend)/m.r,z=(p[i*4+2]-m.z)/(m.r*.91),bounds=canopySample(m,x,z);
      if(p[i*4+3]>.002||bounds[3]<.23||bounds[3]>.94||p[i*4+1]>m.h+bounds[1]+.003)invalid++;
      populations[id]++;
    }
    check('all 25 mushrooms release fresh spores beneath their own fins',invalid===0&&populations.every(count=>count>0),{populations,invalid});
    r.compute(force);s.advance(1/60);
    const fresh=new Float32Array(await r.getArrayBufferAsync(s.spores.positions.value,null,0,n*16));
    let movedBirths=0;
    for(let i=0;i<n;i++)if(Math.hypot(fresh[i*4]-p[i*4],fresh[i*4+2]-p[i*4+2])>.005)movedBirths++;
    check('rapid respawns choose new positions without quantized-time cohorts',movedBirths>n*.98,{movedBirths,total:n});
    const air=await field();let finite=true,maxSpeed=0,up=0,down=0;
    for(let i=0;i<air.length;i+=4){finite&&=air.slice(i,i+3).every(Number.isFinite);maxSpeed=Math.max(maxSpeed,Math.hypot(...air.slice(i,i+3)));up+=air[i+1]>.003;down+=air[i+1]<-.003;}
    check('shared air is finite and bounded near every emitter',finite&&maxSpeed<.7&&up>0&&down>0,{maxSpeed,up,down});
    s.spores.wind.value=0;s.advance(1/60);const calm=await field();
    check('zero wind disables curl and obstacle deflection together',calm.every((v,i)=>i%4===3||v===0));
  }finally{s.spores.wind.value=saved.wind;s.advance(1/60);s.render();s.manual=saved.manual;force.dispose();sample.dispose();}
  return {date:new Date().toISOString(),results};
}
