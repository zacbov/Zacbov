export async function benchmark(counts=[262144,524288,1048576,2097152,4194304],frames=60) {
  const s=window.spore,old={manual:s.manual,adaptive:s.settings.adaptive,count:s.spores.count,orbit:s.settings.orbit};
  const results=[];
  s.manual=true;s.settings.adaptive=false;s.settings.orbit=false;
  try{
    for(const count of counts){
      s.setCount(count);
      for(let i=0;i<12;i++){await new Promise(requestAnimationFrame);s.advance(1/60);s.render();await s.renderer.backend.device.queue.onSubmittedWorkDone();}
      const times=[];
      for(let i=0;i<frames;i++){
        // Frame-scoped render nodes must actually advance.
        await new Promise(requestAnimationFrame);
        const start=performance.now();s.advance(1/60);s.render();
        await s.renderer.backend.device.queue.onSubmittedWorkDone();times.push(performance.now()-start);
      }
      times.sort((a,b)=>a-b);const mean=times.reduce((a,b)=>a+b,0)/times.length;
      results.push({count:s.spores.count,meanMs:mean,p95Ms:times[Math.floor(times.length*.95)],fps:1000/mean});
    }
  }finally{s.setCount(old.count);s.manual=old.manual;s.settings.adaptive=old.adaptive;s.settings.orbit=old.orbit;}
  return {viewport:[innerWidth,innerHeight],pixelRatio:s.renderer.getPixelRatio(),results};
}
