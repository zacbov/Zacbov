// GPU readbacks validate the compacted draw stream, radiance buffer, and absence
// of shadow passes. Run outside the steady-state performance recording.
export async function checkRendering(){
  const s=window.spore,renderer=s.renderer;
  const saved={manual:s.manual,count:s.spores.count,brightness:s.spores.brightness.value,orbit:s.settings.orbit};
  const results=[];
  const check=(name,pass,detail)=>{results.push({name,pass,detail});if(!pass)throw new Error(name+': '+JSON.stringify(detail));};
  const readArgs=async()=>new Uint32Array(await renderer.getArrayBufferAsync(s.spores.culling.args));
  try{
    s.manual=true;s.settings.orbit=false;s.setCount(1048576);s.advance(1/60);s.render();
    let args=await readArgs();
    check('GPU draw counts remain within the active population',args[0]>0&&args[0]<=s.spores.count&&args[5]<=Math.ceil(s.spores.count/16),Array.from(args));
    let ids=new Uint32Array(await renderer.getArrayBufferAsync(s.spores.culling.pointIDs.value,null,0,args[0]*4));
    check('visible spore IDs are unique and in range',new Set(ids).size===ids.length&&ids.every(id=>id<s.spores.count),{visible:ids.length,total:s.spores.count});
    s.setCount(32768);s.render();args=await readArgs();
    ids=new Uint32Array(await renderer.getArrayBufferAsync(s.spores.culling.pointIDs.value,null,0,args[0]*4));
    check('reducing density removes stale particles immediately',args[0]<=32768&&ids.every(id=>id<32768),Array.from(args));
    s.spores.brightness.value=0;s.render();args=await readArgs();
    const size=s.post.sporeRaster.size.value,bytes=size.x*size.y*3*4;
    const pixels=new Uint32Array(await renderer.getArrayBufferAsync(s.post.sporeRaster.pixels,null,0,bytes));
    check('zero light leaves no stale accumulated radiance',args[0]===0&&pixels.every(value=>value===0),{visible:args[0],pixels:pixels.length/3});
    s.spores.brightness.value=saved.brightness;
    const light=s.lightRig.children.find(x=>x.isSpotLight),render=renderer.render;
    let updates=0;
    renderer.render=function(scene,camera){if(camera===light.shadow.camera)updates++;return render.call(this,scene,camera);};
    try{for(let i=0;i<4;i++){
      await new Promise(resolve=>requestAnimationFrame(resolve));s.render();
      await renderer.backend.device.queue.onSubmittedWorkDone();
    }}finally{renderer.render=render;}
    const shadowLights=[];s.scene.traverse(object=>{if(object.isLight&&object.castShadow)shadowLights.push(object.name);});
    check('shadow casting stays disabled without shadow renders',!renderer.shadowMap.enabled&&updates===0&&shadowLights.length===0,{frames:4,shadowUpdates:updates,shadowLights});
  }finally{
    s.setCount(saved.count);s.spores.brightness.value=saved.brightness;s.settings.orbit=saved.orbit;s.render();s.manual=saved.manual;
  }
  return {date:new Date().toISOString(),viewport:[innerWidth,innerHeight],results};
}
