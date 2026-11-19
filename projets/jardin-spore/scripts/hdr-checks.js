import * as THREE from 'three/webgpu';
import { acesFilmicToneMapping, screenUV, uint, uniformArray, vec3, vec4 } from 'three/tsl';
import { acesHDR, createToneMapping } from '../tone-mapping.js';
import { createDisplayOutput } from '../display-output.js';

export async function checkHDR(s=window.spore){
  const renderer=s.renderer,device=renderer.backend.device;
  const saved={manual:s.manual,target:renderer.getRenderTarget(),mrt:renderer.getMRT(),colorSpace:renderer.outputColorSpace};
  const checks=[],check=(name,pass,detail)=>{checks.push({name,pass,detail});if(!pass)throw new Error(name+': '+JSON.stringify(detail));};
  const levels=[0,.00001,.001,.01,.05,.18,.3,.6,1,2,4,8,16,64,256,4096];
  const samples=levels.map(v=>new THREE.Vector3(v,v,v));
  for(const color of [[8,0,0],[0,8,0],[0,0,8],[4,2,.1],[.3,.12,.05],[128,1,30]])samples.push(new THREE.Vector3(...color));
  const target=new THREE.RenderTarget(samples.length,1,{type:THREE.FloatType,depthBuffer:false});
  const pipeline=new THREE.RenderPipeline(renderer);pipeline.outputColorTransform=false;
  const source=uniformArray(samples).element(uint(screenUV.x.mul(samples.length).floor()));
  const tone=createToneMapping();
  const neutralGrade=()=>{for(const [key,value] of Object.entries({saturation:1,contrast:1,warmth:0,tint:0}))tone.grade[key].value=value;};
  const read=async node=>{
    pipeline.outputNode=vec4(node,1);pipeline.needsUpdate=true;
    await new Promise(requestAnimationFrame);renderer.setRenderTarget(target);renderer.setMRT(null);pipeline.render();
    return await renderer.readRenderTargetPixelsAsync(target,0,0,samples.length,1);
  };
  const difference=(a,b)=>Math.max(...Array.from(a,(v,i)=>Math.abs(v-b[i])));
  let failure,report;
  s.manual=true;device.pushErrorScope('validation');
  try{
    const stock=await read(acesFilmicToneMapping(source,1));
    const sdr=await read(acesHDR(source,1,1));
    check('SDR reproduces the stock Three.js ACES transform',difference(stock,sdr)<.00001,{maximumError:difference(stock,sdr)});
    const hdr=await read(acesHDR(source,1,4));
    check('HDR keeps the ACES toe and midtones',difference(sdr.slice(0,8*4),hdr.slice(0,8*4))<.00001);
    check('HDR highlights exceed SDR white and retain brightness ordering',hdr[10*4]>1&&hdr[11*4]>hdr[10*4]&&hdr[12*4]>hdr[11*4],{linear2:hdr[9*4],linear4:hdr[10*4],linear8:hdr[11*4],linear16:hdr[12*4]});
    check('HDR output is finite, nonnegative and bounded by its selected peak',hdr.every(x=>Number.isFinite(x)&&x>=0&&x<=4));
    check('neutral ramp remains monotonic',levels.every((_,i)=>i===0||hdr[i*4]>=hdr[(i-1)*4]));
    neutralGrade();
    const identity=await read(tone.applyGrade(source));
    check('neutral grading preserves scene radiance',samples.every((v,i)=>Math.max(Math.abs(identity[i*4]-v.x),Math.abs(identity[i*4+1]-v.y),Math.abs(identity[i*4+2]-v.z))<.0005));
    tone.grade.saturation.value=0;
    const gray=await read(tone.applyGrade(source));
    check('zero saturation removes chroma',samples.every((v,i)=>Math.abs(gray[i*4]-gray[i*4+1])+Math.abs(gray[i*4+1]-gray[i*4+2])<.0001));
    neutralGrade();tone.grade.warmth.value=1;
    const warm=await read(tone.applyGrade(source));
    check('warmth raises red relative to blue while preserving neutral luminance',warm[5*4]>warm[5*4+2]&&Math.abs(.2126*warm[5*4]+.7152*warm[5*4+1]+.0722*warm[5*4+2]-.18)<.00001);
    neutralGrade();tone.grade.contrast.value=1.5;
    const contrast=await read(tone.applyGrade(source));
    check('contrast pivots around 18 percent gray',Math.abs(contrast[5*4]-.18)<.00001&&contrast[3*4]<.01&&contrast[8*4]>1);
    neutralGrade();tone.grade.tint.value=1;
    const tint=await read(tone.applyGrade(source));
    check('positive tint moves neutrals toward magenta',tint[5*4]>tint[5*4+1]&&tint[5*4+2]>tint[5*4+1]);

    // Read the actual floating-point canvas texture, after Three.js's sRGB
    // output transform. This proves transport >1; it cannot prove panel nits.
    renderer.setRenderTarget(null);renderer.setMRT(null);
    pipeline.outputColorTransform=true;pipeline.outputNode=vec4(acesHDR(vec3(8),1,4),1);pipeline.needsUpdate=true;
    const readback=device.createBuffer({size:256,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});
    try{
      await new Promise(requestAnimationFrame);pipeline.render();
      const encoder=device.createCommandEncoder();
      encoder.copyTextureToBuffer({texture:renderer.backend.context.getCurrentTexture()},{buffer:readback,bytesPerRow:256},[1,1,1]);
      device.queue.submit([encoder.finish()]);await readback.mapAsync(GPUMapMode.READ);
      const value=THREE.DataUtils.fromHalfFloat(new Uint16Array(readback.getMappedRange())[0]);
      check('the canvas preserves values above white after the output transfer',value>1,{encodedRed:value,format:renderer.backend.context.getConfiguration().format});
    }finally{readback.destroy();}

    const probe=document.createElement('canvas'),context=probe.getContext('webgpu');
    const query=new EventTarget();query.matches=false;
    context.configure({device,format:'rgba16float',toneMapping:{mode:'extended'}});
    const display=createDisplayOutput({backend:{context}},query);
    try{
      check('automatic mode selects SDR for an SDR display',!display.active&&display.headroom===1&&context.getConfiguration().toneMapping.mode==='standard');
      query.matches=true;query.dispatchEvent(new Event('change'));
      check('display changes enable HDR without recreating the device',display.active&&display.headroom===4&&context.getConfiguration().toneMapping.mode==='extended');
      display.setMode('sdr');check('manual SDR override disables extended presentation',!display.active&&context.getConfiguration().toneMapping.mode==='standard');
      display.setMode('auto');query.matches=false;query.dispatchEvent(new Event('change'));
      check('returning to an SDR display restores the SDR curve',!display.active&&display.headroom===1);
    }finally{display.dispose();context.unconfigure();}
    report={date:new Date().toISOString(),display:s.displayOutput.inspect(),checks,ramp:levels.map((input,i)=>({input,sdr:sdr[i*4],hdr:hdr[i*4]}))};
  }catch(error){failure=error;}
  finally{
    const validation=await device.popErrorScope();if(validation)failure||=new Error(validation.message);
    renderer.outputColorSpace=saved.colorSpace;renderer.setRenderTarget(saved.target);renderer.setMRT(saved.mrt);
    pipeline.dispose();target.dispose();await new Promise(requestAnimationFrame);s.render();s.manual=saved.manual;
  }
  if(failure)throw failure;return report;
}
