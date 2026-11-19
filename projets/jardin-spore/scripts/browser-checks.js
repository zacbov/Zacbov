// Run from the live experiment: await (await import('./scripts/browser-checks.js')).checkScene()
import { MUSHROOMS, stemRadius } from '../mushrooms.js';
import { canopySample } from '../canopy-surface.js';

export async function checkScene() {
  const s=window.spore;
  const saved={manual:s.manual,count:s.spores.count,wind:s.spores.wind.value,
    paused:s.settings.paused,orbit:s.settings.orbit,adaptive:s.settings.adaptive,
    position:s.camera.position.clone(),target:s.controls.target.clone()};
  const results=[];
  const check=(name,pass,detail)=>{results.push({name,pass,detail});if(!pass)throw new Error(name+': '+JSON.stringify(detail));};
  const read=async(attribute,start=0,n=4096)=>new Float32Array(await s.renderer.getArrayBufferAsync(attribute.value,null,start*16,n*16));
  const stats=(p,v)=>{
    let up=0,down=0,above=0,maxY=-Infinity,minY=Infinity,finite=true;
    for(let i=0;i<p.length;i+=4){
      for(let k=0;k<4;k++)finite&&=Number.isFinite(p[i+k])&&Number.isFinite(v[i+k]);
      up+=v[i+1]>.003;down+=v[i+1]<-.003;above+=p[i+1]>2.05;
      maxY=Math.max(maxY,p[i+1]);minY=Math.min(minY,p[i+1]);
    }
    return {n:p.length/4,up,down,above,maxY,minY,finite};
  };
  try {
    s.manual=true;s.settings.adaptive=false;s.settings.orbit=false;s.render();
    s.setCount(333333);
    check('density control reflects a non-preset adaptive count',+document.querySelector('#particles').value===s.spores.count,s.spores.count);
    const before=await read(s.spores.positions);
    for(let i=0;i<180;i++)s.advance(1/60);
    const moving=await read(s.spores.positions),velocity=await read(s.spores.velocities);
    const motion=stats(moving,velocity);
    check('GPU motion remains finite and bounded',motion.finite&&motion.maxY<5.1&&motion.minY>0,motion);
    check('the turbulent field has both rising and settling spores',motion.up>100&&motion.down>100,motion);
    check('compute actually moves particles',moving.some((v,i)=>i%4!==3&&Math.abs(v-before[i])>.001),motion);
    let embedded=0;
    for(let i=0;i<moving.length;i+=4){
      const [x,y,z,age]=moving.slice(i,i+4);
      if(age<.05)continue;
      for(const m of MUSHROOMS){
        if(y>=m.h)continue;
        const u=Math.max(0,Math.min(1,(y-.015)/(m.h-m.r*.1)));
        const sx=m.x+m.bend*u*u+Math.sin(u*Math.PI)*.027,sz=m.z+Math.sin(u*Math.PI)*.035;
        const radius=stemRadius(m,u);
        if(Math.hypot(x-sx,z-sz)<radius-.002){embedded++;break;}
      }
    }
    check('airborne spores do not accumulate inside stems',embedded===0,{sampled:moving.length/4,embedded});
    let insideCaps=0;
    for(let i=0;i<moving.length;i+=4){
      const [x,y,z,age]=moving.slice(i,i+4);if(age<.05)continue;
      for(const m of MUSHROOMS){
        const dx=(x-m.x-m.bend)/m.r,dz=(z-m.z)/(m.r*.91);
        if(Math.hypot(dx,dz)>1.2)continue;
        const bounds=canopySample(m,dx,dz);
        if(bounds[3]<.94&&y<m.h+bounds[0]-.006&&y>m.h+bounds[1]+.006){insideCaps++;break;}
      }
    }
    check('spores stay outside the warped cap and fin envelope',insideCaps===0,{sampled:moving.length/4,insideCaps});
    s.spores.wind.value=0;
    for(let i=0;i<240;i++)s.advance(1/60);
    const calm=stats(await read(s.spores.positions),await read(s.spores.velocities));
    check('spores settle when air motion is disabled',calm.down>calm.n*.99&&calm.finite,calm);
    s.setCount(s.spores.maxCount);s.advance(1/60);
    const tail=stats(await read(s.spores.positions,s.spores.maxCount-4096),await read(s.spores.velocities,s.spores.maxCount-4096));
    check('the maximum storage range initializes without NaNs',tail.finite&&tail.minY>0&&tail.maxY<5.1,tail);
    s.setCount(saved.count);s.spores.wind.value=saved.wind;
    document.querySelector('canvas').focus();
    check('canvas focus leaves the image unframed',getComputedStyle(document.querySelector('canvas')).outlineStyle==='none');
    s.settings.paused=true;s.settings.orbit=true;s.render();s.manual=false;
    const pausedTime=s.spores.clock.value;
    await new Promise(resolve=>setTimeout(resolve,400));
    check('pause freezes the simulation clock',s.spores.clock.value===pausedTime,{before:pausedTime,after:s.spores.clock.value});
    s.settings.paused=false;
    const position=s.camera.position.clone();
    await new Promise(resolve=>setTimeout(resolve,700));
    check('automatic orbit moves the camera',s.camera.position.distanceTo(position)>.005,s.camera.position.distanceTo(position));
  } finally {
    s.manual=true;s.setCount(saved.count);s.spores.wind.value=saved.wind;
    s.settings.paused=saved.paused;s.settings.orbit=saved.orbit;s.settings.adaptive=saved.adaptive;
    s.camera.position.copy(saved.position);s.controls.target.copy(saved.target);s.controls.update();s.render();s.manual=saved.manual;
    document.querySelector('#pause').checked=saved.paused;document.querySelector('#orbit').checked=saved.orbit;
  }
  return {date:new Date().toISOString(),viewport:[innerWidth,innerHeight],results};
}
