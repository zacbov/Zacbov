// A complete camera orbit while the normal RAF loop and auto-density stay active.
export function startSoak(seconds=210) {
  const s=window.spore;
  s.manual=false;s.settings.paused=false;s.settings.orbit=true;s.settings.adaptive=true;s.resetView();
  for(const [id,value] of [['pause',false],['orbit',true],['adaptive',true]])document.querySelector('#'+id).checked=value;
  const run=window.sporeSoak={startedAt:new Date().toISOString(),duration:seconds,viewport:[innerWidth,innerHeight],samples:[],done:false};
  const start=performance.now();let previous=start,lastSample=start,frames=[];
  function tick(now) {
    const dt=now-previous;previous=now;
    if(!document.hidden)frames.push(dt);
    if(now-lastSample>=1000){
      const sorted=frames.slice().sort((a,b)=>a-b);
      const average=frames.reduce((a,b)=>a+b,0)/Math.max(frames.length,1);
      run.samples.push({seconds:(now-start)/1000,particles:s.spores.count,meanMs:average,p95Ms:sorted[Math.floor(sorted.length*.95)],longFrames:frames.filter(ms=>ms>50).length,camera:s.camera.position.toArray(),hidden:document.hidden});
      frames=[];lastSample=now;
    }
    if(now-start<seconds*1000)requestAnimationFrame(tick);
    else{run.done=true;run.finishedAt=new Date().toISOString();}
  }
  requestAnimationFrame(tick);
  return {startedAt:run.startedAt,duration:seconds};
}
