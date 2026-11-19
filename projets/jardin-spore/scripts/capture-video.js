import { FPS, SIZE, DURATION, RENDER_SIZE, PARTICLES, SHOTS, setCaptureCamera } from './capture-sequence.js';
import { Vector2 } from 'three/webgpu';

const nextFrame = () => new Promise(requestAnimationFrame);

// Fixed simulation steps and encoder backpressure preserve every frame, even
// when the supersampled scene takes longer than 1/30 second to render.
export function createCaptureSession({ renderSize=RENDER_SIZE, particles=PARTICLES, overlays=true }={}) {
  const app=window.spore;
  if(!app || !document.querySelector('#status').hidden) throw new Error('Wait for Spore to load');
  if(innerWidth!==SIZE || innerHeight!==SIZE || devicePixelRatio!==1) throw new Error('Use a 1024 × 1024 viewport at scale 1');
  if(!Number.isInteger(renderSize)||renderSize<SIZE||renderSize>2048) throw new RangeError('Render size must be 1024–2048');
  if(!Number.isInteger(particles)||particles<32768||particles>app.spores.maxCount) throw new RangeError('Invalid particle count');
  const { renderer,camera,controls,settings,spores,displayOutput }=app, source=renderer.domElement;
  const previous={settings:{...settings},manual:app.manual,position:camera.position.clone(),target:controls.target.clone(),
    fov:camera.fov,aspect:camera.aspect,ratio:renderer.getPixelRatio(),size:renderer.getSize(new Vector2()),
    count:spores.count,pixelWorld:spores.pixelWorld.value,enabled:controls.enabled,damping:controls.enableDamping,
    autoRotate:controls.autoRotate,hidden:document.body.classList.contains('hide-ui'),display:displayOutput.mode,
    canvasStyle:source.style.cssText};
  const canvas=document.createElement('canvas');canvas.width=canvas.height=SIZE;
  const ctx=canvas.getContext('2d',{alpha:false});ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  const input=new AbortController();
  for(const type of ['keydown','keyup','pointerdown','pointermove','pointerup','wheel'])window.addEventListener(type,event=>{
    event.preventDefault();event.stopImmediatePropagation();
  },{capture:true,passive:false,signal:input.signal});
  app.manual=true;controls.enabled=false;controls.autoRotate=false;controls.enableDamping=false;controls.update();
  Object.assign(settings,{paused:true,orbit:false,adaptive:false,resolution:renderSize/SIZE});
  app.setCount(particles);displayOutput.setMode('sdr');
  renderer.setPixelRatio(renderSize/SIZE);renderer.setSize(SIZE,SIZE,false);
  camera.aspect=1;document.body.classList.add('hide-ui');source.style.pointerEvents='none';
  let nextIndex=0,previousShot=null,restored=false;
  const events=[];

  function snapshot() {
    // Copy before WebGPU's presentation texture is released by the browser.
    ctx.drawImage(source,0,0,SIZE,SIZE);
    if(!overlays)return;
    ctx.save();ctx.font='15px ui-monospace, SFMono-Regular, Menlo, monospace';ctx.letterSpacing='1.7px';
    ctx.textBaseline='middle';ctx.fillStyle='#c9c9b9';ctx.shadowColor='#000';ctx.shadowBlur=12;
    ctx.fillText('CODEVEMBER 2026 / 16 / SPORE',28,32);
    ctx.textAlign='right';ctx.font='14px ui-monospace, SFMono-Regular, Menlo, monospace';ctx.letterSpacing='1px';
    ctx.fillText('SETTINGS',SIZE-28,32);ctx.restore();
  }
  async function settle(time,frames=20) {
    // Let a pending viewport resize finish before enforcing capture resolution.
    await nextFrame();
    if(source.width!==renderSize||source.height!==renderSize){
      renderer.setPixelRatio(renderSize/SIZE);renderer.setSize(SIZE,SIZE,false);
      camera.aspect=1;camera.updateProjectionMatrix();
    }
    setCaptureCamera(app,time);
    // Clear temporal history through the public resize API at cuts. The first
    // resolve copies the new beauty buffer; warm frames settle meshlet culling.
    app.post.temporal?.setSize(1,1);
    for(let i=0;i<frames;i++){await nextFrame();app.render();}
    await renderer.backend.device.queue.onSubmittedWorkDone();
  }
  return {app,canvas,events,renderSize,particles,overlays,
    async preview(time){await settle(time);await nextFrame();app.render();snapshot();return {time,pose:setCaptureCamera(app,time)};},
    async warmup(){
      for(let i=0;i<240;i++){spores.step(renderer,1/FPS);if(i%30===29)await nextFrame();}
      await settle(0,24);nextIndex=0;previousShot=null;events.length=0;
    },
    async draw(frame){
      if(frame!==nextIndex)throw new Error(`Expected frame ${nextIndex}, got ${frame}`);
      if(innerWidth!==SIZE||innerHeight!==SIZE||source.width!==renderSize||source.height!==renderSize)throw new Error('Canvas resized during capture');
      if(frame>0)spores.step(renderer,1/FPS);
      const pose=setCaptureCamera(app,frame/FPS);
      if(pose.shot!==previousShot){
        await settle(frame/FPS);previousShot=pose.shot;
        events.push({frame,name:pose.shot.name,simulationTime:spores.clock.value,position:pose.position,target:pose.target});
      }
      await nextFrame();app.render();snapshot();nextIndex++;
    },
    async restore(){
      if(restored)return;restored=true;input.abort();
      Object.assign(settings,previous.settings);app.setCount(previous.count);displayOutput.setMode(previous.display);
      renderer.setPixelRatio(previous.ratio);renderer.setSize(previous.size.x,previous.size.y,false);
      camera.fov=previous.fov;camera.aspect=previous.aspect;camera.updateProjectionMatrix();
      controls.target.copy(previous.target);camera.position.copy(previous.position);controls.update();
      controls.enabled=previous.enabled;controls.enableDamping=previous.damping;controls.autoRotate=previous.autoRotate;
      spores.pixelWorld.value=previous.pixelWorld;source.style.cssText=previous.canvasStyle;
      document.body.classList.toggle('hide-ui',previous.hidden);
      for(const [id,key] of [['pause','paused'],['orbit','orbit'],['adaptive','adaptive']])document.getElementById(id).checked=settings[key];
      app.post.temporal?.setSize(1,1);await nextFrame();app.render();app.manual=previous.manual;
    },
  };
}

export async function captureVideo({receiver='http://127.0.0.1:8036',duration=DURATION,...options}={}) {
  if(['preparing','capturing','encoding'].includes(window.captureProgress?.status))throw new Error('Capture already running');
  const totalFrames=Math.round(duration*FPS);
  if(!Number.isFinite(duration)||duration<=0||duration>DURATION||Math.abs(totalFrames/FPS-duration)>1e-8)throw new RangeError('Invalid duration');
  const session=createCaptureSession(options),device=session.app.renderer.backend.device;
  const worker=new Worker(new URL('./capture-frame-worker.js',import.meta.url),{type:'module'});
  const upload=async frame=>{
    const bitmap=await createImageBitmap(session.canvas);
    return new Promise((resolve,reject)=>{
      worker.onmessage=({data})=>data.error?reject(new Error(data.error)):resolve(data.receipt);
      worker.onerror=event=>reject(new Error(event.message));
      worker.postMessage({bitmap,frame,receiver},[bitmap]);
    });
  };
  const state=window.captureProgress={status:'preparing',frame:0,totalFrames,started:performance.now(),cancelled:false,cancel(){this.cancelled=true;}};
  const post=async(path,body)=>{
    const response=await fetch(receiver+path,{method:'POST',body,signal:AbortSignal.timeout(120000)});
    const result=await response.json();if(!response.ok)throw new Error(result.error||`Capture receiver ${response.status}`);return result;
  };
  let started=false,scope=false;
  try{
    device.pushErrorScope('validation');scope=true;await session.warmup();
    await post('/start',JSON.stringify({fps:FPS,totalFrames,width:SIZE,height:SIZE,renderSize:session.renderSize,
      particles:session.particles,duration,shots:SHOTS,overlays:session.overlays,cursor:false,audio:false,
      display:'SDR video from scene-linear HDR lighting',grading:session.app.inspect().grading,
      initialSimulationTime:session.app.spores.clock.value,method:`Fixed 30 Hz simulation, ${SHOTS.length} camera shots, supersampled render, ordered lossless PNG frames with encoder backpressure`}));
    started=true;state.status='capturing';
    for(let frame=0;frame<totalFrames;frame++){
      if(state.cancelled)throw new Error('Capture cancelled');
      await session.draw(frame);const receipt=await upload(frame);
      if(receipt.frame!==frame)throw new Error('Out-of-order frame receipt');state.frame=frame+1;
    }
    const validation=await device.popErrorScope();scope=false;if(validation)throw new Error(validation.message);
    state.status='encoding';state.result=await post('/finish',JSON.stringify({elapsedSeconds:(performance.now()-state.started)/1000,events:session.events}));
    state.status='complete';return state.result;
  }catch(error){state.status=state.cancelled?'cancelled':'failed';state.error=error.message;if(started)await post('/abort','').catch(()=>{});throw error;}
  finally{worker.terminate();try{if(scope)await device.popErrorScope();}finally{await session.restore();}}
}
