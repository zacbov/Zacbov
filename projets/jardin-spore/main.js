import * as THREE from 'three/webgpu';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MossDrawingPipeline } from './moss-pipeline.js';
import { createMaterials } from './materials.js';
import { createMushrooms } from './mushrooms.js';
import { createForest, groundHeight } from './forest.js';
import { createGarden } from './garden.js';
import { createTimeline } from './timeline.js';
import { createSpores } from './spores.js';
import { createPostProcessing } from './post-processing.js';
import { createDisplayRenderer, createDisplayOutput } from './display-output.js';
import { EXPOSURE_DEFAULT } from './tone-mapping.js';

export async function startExperiment(){
  const canvas=document.querySelector('canvas'),status=document.querySelector('#status');
  if(!navigator.gpu)throw new Error('This scene needs WebGPU. Open it in a WebGPU-capable browser.');
  const renderer=await createDisplayRenderer({canvas,antialias:false,powerPreference:'high-performance'});
  const displayOutput=createDisplayOutput(renderer);
  renderer.toneMapping=THREE.NoToneMapping;renderer.toneMappingExposure=EXPOSURE_DEFAULT;
  window.addEventListener('pagehide',()=>displayOutput.dispose(),{once:true});
  renderer.shadowMap.enabled=false;
  const meshlets=new MossDrawingPipeline({lodThreshold:1,occlusionCulling:true});
  renderer.drawingPipeline=meshlets;
  const scene=new THREE.Scene();scene.background=new THREE.Color('#010302');scene.fog=new THREE.FogExp2('#010302',.036);
  const camera=new THREE.PerspectiveCamera(36,innerWidth/innerHeight,.025,90);
  const controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.dampingFactor=.07;
  controls.minDistance=1.1;controls.maxDistance=18;controls.maxPolarAngle=Math.PI*.53;
  controls.autoRotate=true;controls.autoRotateSpeed=.32;controls.zoomSpeed=.65;
  function resetView(){controls.target.set(1.6,.9,1.4);camera.position.set(1.7,2.3,9.2);camera.position.sub(controls.target).multiplyScalar(Math.max(1,.95/camera.aspect)).add(controls.target);controls.update();}
  resetView();
  const materials=createMaterials(),mushrooms=createMushrooms(materials),forest=await createForest(materials),garden=createGarden(materials);
  const environmentMaterials=[...Object.values(materials).filter(value=>value.isMaterial),...forest.mossLOD.materials];
  scene.add(forest.group,mushrooms.group,garden.group);environmentMaterials.push(...garden.materials);
  const back=new THREE.SpotLight('#ffbd99',30,20,Math.PI*.40,.65,2);back.position.set(-.4,1.6,-2.4);back.target.position.set(0,1.15,0);
  scene.add(back,back.target);
  const blue=new THREE.PointLight('#83d5ff',16,14,2);blue.position.set(2,2.4,-1.6);scene.add(blue);
  const lightRig=new THREE.Group();lightRig.name='Orbiting macro light';lightRig.add(back,back.target,blue);scene.add(lightRig);
  status.textContent='Filling the air with spores…';
  await new Promise(resolve=>setTimeout(resolve,30));
  const spores=createSpores(4194304,materials.optics);
  const post=createPostProcessing(renderer,scene,camera,spores,materials,displayOutput);
  const inkButton=document.getElementById('ink');inkButton.addEventListener('click',()=>{const on=post.ink.value<.5;post.ink.value=on?1:0;inkButton.setAttribute('aria-pressed',String(on))});
  const timeline=createTimeline({scene,renderer,materials,spores,post,lights:{back,blue},garden,target:controls.target});
  const settings={paused:matchMedia('(prefers-reduced-motion: reduce)').matches,adaptive:true,orbit:true,resolution:1.5};
  const metrics={frames:0,fps:0,frameMs:0,particleCount:spores.count,adjustments:[],device:renderer.backend.device.adapterInfo??null};
  let manual=false,last=0,frameWindow=[],windowStart=0,settleUntil=performance.now()+7000,ceiling=spores.maxCount,ceilingUntil=0;
  function resize(){
    const previousFit=Math.max(1,.95/camera.aspect);
    camera.aspect=innerWidth/innerHeight;
    camera.position.sub(controls.target).multiplyScalar(Math.max(1,.95/camera.aspect)/previousFit).add(controls.target);
    const ratio=Math.min(devicePixelRatio,settings.resolution,Math.sqrt(4194304/(innerWidth*innerHeight)));
    camera.updateProjectionMatrix();renderer.setPixelRatio(ratio);renderer.setSize(innerWidth,innerHeight);
    document.getElementById('resolution-value').textContent=ratio.toFixed(2)+'×';
    spores.pixelWorld.value=2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*4.7/(innerHeight*ratio);settleUntil=performance.now()+4000;
  }
  resize();window.addEventListener('resize',resize);
  function sync(){
    forest.mossLOD.update(renderer,camera);
    spores.focus.value=camera.position.distanceTo(controls.target);controls.autoRotate=settings.orbit&&!settings.paused;
    const angle=Math.atan2(camera.position.x-controls.target.x,camera.position.z-controls.target.z);
    lightRig.rotation.y=angle;lightRig.updateMatrixWorld(true);back.getWorldPosition(spores.lightPosition.value);
    for(const material of environmentMaterials)material.envMapRotation.y=angle;
    materials.optics.keyPosition.value.copy(spores.lightPosition.value);blue.getWorldPosition(materials.optics.bluePosition.value);
    back.target.getWorldPosition(materials.optics.keyDirection.value).sub(materials.optics.keyPosition.value).normalize();
    materials.optics.keyPower.value=back.intensity;materials.optics.bluePower.value=blue.intensity;
    materials.optics.keyColor.value.copy(back.color);materials.optics.blueColor.value.copy(blue.color);
  }
  function render(){sync();spores.prepareRender(renderer,camera);post.render();metrics.frames++;}
  function advance(dt){if(!Number.isFinite(dt)||dt<0)throw new Error('Expected a finite, nonnegative timestep.');spores.step(renderer,Math.min(dt,.05));controls.update(dt);}
  function setCount(count){
    spores.setCount(count);metrics.particleCount=spores.count;
    const select=document.querySelector('#particles'),value=String(spores.count);
    select.querySelector('[data-adaptive]')?.remove();
    if(![...select.options].some(option=>option.value===value)){
      const option=new Option(spores.count.toLocaleString(),value);option.dataset.adaptive='';select.append(option);
    }
    select.value=value;
  }
  setCount(spores.count);document.querySelector('#pause').checked=settings.paused;
  const api=window.spore={renderer,scene,camera,controls,materials,mushrooms,forest,spores,post,meshlets,lightRig,settings,metrics,displayOutput,resetView,render,advance,setCount,
    get manual(){return manual;},set manual(v){manual=!!v;last=0;},
    inspect(){return {fps:metrics.fps,frameMs:metrics.frameMs,particles:spores.count,moss:forest.stats,adapter:renderer.backend.device.adapterInfo,draws:renderer.info.render.drawCalls,triangles:renderer.info.render.triangles,display:displayOutput.inspect(),grading:{exposure:renderer.toneMappingExposure,...post.tone.values()}};}
  };
  document.querySelector('#settings-toggle').onclick=()=>{const panel=document.querySelector('#settings');panel.hidden=!panel.hidden;document.querySelector('#settings-toggle').setAttribute('aria-expanded',String(!panel.hidden));};
  const bind=(id,cb)=>document.querySelector('#'+id).addEventListener('input',e=>cb(e.target));
  bind('orbit',el=>settings.orbit=el.checked);bind('pause',el=>settings.paused=el.checked);
  bind('wind',el=>spores.wind.value=+el.value);bind('brightness',el=>spores.brightness.value=+el.value);
  bind('sss',el=>materials.sss.value=+el.value);
  bind('glow',el=>materials.glow.value=+el.value);
  bind('resolution',el=>{settings.resolution=+el.value;resize();});
  const updateGradeValues=()=>{
    for(const [key,value] of Object.entries({exposure:renderer.toneMappingExposure,...post.tone.values()})){
      document.getElementById(key).value=value;document.getElementById(key+'-value').textContent=value.toFixed(2);
    }
  };
  bind('exposure',el=>{renderer.toneMappingExposure=+el.value;updateGradeValues();});
  for(const key of Object.keys(post.tone.grade))bind(key,el=>{post.tone.grade[key].value=+el.value;updateGradeValues();});
  document.querySelector('#reset-grade').onclick=()=>{post.tone.reset();renderer.toneMappingExposure=EXPOSURE_DEFAULT;updateGradeValues();};
  document.querySelector('#copy-grade').onclick=async()=>{
    const button=document.querySelector('#copy-grade');
    try{await navigator.clipboard.writeText(JSON.stringify({exposure:renderer.toneMappingExposure,...post.tone.values(),hdrPeak:displayOutput.peak},null,2));button.textContent='Copied';}
    catch{button.textContent='Copy unavailable';}
    setTimeout(()=>button.textContent='Copy values',1600);
  };
  bind('display-mode',el=>displayOutput.setMode(el.value));
  bind('hdr-peak',el=>displayOutput.setPeak(+el.value));
  displayOutput.onChange(()=>{
    document.querySelector('#display-status').textContent=displayOutput.active?'HDR output':'SDR output';
    document.querySelector('#hdr-peak').disabled=!displayOutput.active;
    document.querySelector('#hdr-peak-value').textContent=displayOutput.peak.toFixed(1)+'×';
  });
  updateGradeValues();
  bind('adaptive',el=>{settings.adaptive=el.checked;ceiling=spores.maxCount;settleUntil=performance.now()+4000;});
  bind('particles',el=>{settings.adaptive=false;document.querySelector('#adaptive').checked=false;setCount(+el.value);});
  bind('meshlets',el=>meshlets.debug=el.checked);document.querySelector('#reset').onclick=resetView;
  window.addEventListener('keydown',e=>{
    if(/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)||e.target.closest?.('button, summary'))return;
    if(e.code==='Space'){e.preventDefault();settings.paused=!settings.paused;document.querySelector('#pause').checked=settings.paused;}
    if(e.code==='KeyR')resetView();if(e.code==='KeyH')document.body.classList.toggle('hide-ui');
  });
  document.addEventListener('visibilitychange',()=>{last=0;frameWindow=[];settleUntil=performance.now()+4000;});
  renderer.onDeviceLost=info=>{status.hidden=false;status.textContent=`Graphics device lost: ${info.message}. Reload to restart.`;};
  status.textContent='Preparing light and meshlets…';
  spores.step(renderer,1/60);render();
  await renderer.backend.device.queue.onSubmittedWorkDone();
  status.hidden=true;
  function frame(now){
    requestAnimationFrame(frame);
    if(document.hidden||manual){last=0;return;}
    const dt=last?Math.min(.1,(now-last)/1000):1/60;last=now;
    if(!settings.paused)advance(dt);else controls.update(dt);
    if(camera.position.y<groundHeight(camera.position.x,camera.position.z)+.12)camera.position.y=groundHeight(camera.position.x,camera.position.z)+.12;
    timeline.update(dt);render();
    if(dt>0&&dt<.1)frameWindow.push(dt*1000);
    if(now-windowStart>2000&&frameWindow.length>20){
      const sorted=frameWindow.slice().sort((a,b)=>a-b),trim=Math.floor(sorted.length*.08);
      const measured=sorted.slice(trim,sorted.length-trim);
      const mean=measured.reduce((a,b)=>a+b,0)/measured.length;
      metrics.frameMs=mean;metrics.fps=1000/mean;
      document.querySelector('#metrics').textContent=`${spores.count.toLocaleString()} spores · ${metrics.fps.toFixed(1)} fps\n${forest.stats.leaves.toLocaleString()} moss leaves`;
      if(settings.adaptive&&!settings.paused&&now>settleUntil){
        if(now>ceilingUntil)ceiling=spores.maxCount;
        let next=spores.count;
        if(mean>32.5){ceiling=Math.min(ceiling,Math.floor(spores.count*.92));ceilingUntil=now+30000;next=Math.floor(spores.count*.82);}
        else if(mean<29.8&&spores.count<ceiling)next=Math.min(ceiling,Math.floor(spores.count*1.25));
        if(next!==spores.count){setCount(next);metrics.adjustments.push({seconds:now/1000,count:spores.count,fps:metrics.fps});settleUntil=now+5000;}
      }
      frameWindow=[];windowStart=now;
    }
  }
  requestAnimationFrame(frame);
  return api;
}
