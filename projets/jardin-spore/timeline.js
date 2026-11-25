import * as THREE from 'three/webgpu';

// Cycle jour / nuit. La nuit reproduit exactement l'ambiance de Spore (champignons, mousse et spores lumineux) ;
// le jour éteint la bioluminescence, allume le soleil et un ciel, et laisse les plantes à leurs vraies couleurs.
const DAY_EXPOSURE=1.2,DAY_SAT=.9,DAY_WARM=.75;   // le jour : exposition ×1,2, saturation +0,9, chaleur +0,75 (en plus de vos curseurs)
const PAL=[[-.25,'#010302','#010302'],[-.02,'#0c1633','#7a3f3a'],[.1,'#26396b','#e0825a'],[.3,'#4a7ac4','#f0c8a0'],[.7,'#5b93d8','#cfe0ee']];
const ss=(a,b,x)=>{x=Math.max(0,Math.min(1,(x-a)/(b-a)));return x*x*(3-2*x)};
export function createTimeline({scene,renderer,materials,spores,post,lights,garden,target}){
  const $=id=>document.getElementById(id),slider=$('hour'),clock=$('clock'),play=$('play');
  const sun=new THREE.DirectionalLight('#fff1d6',0),hemi=new THREE.HemisphereLight('#a8c8ff','#2e3a1e',0);
  sun.target.position.copy(target);scene.add(sun,sun.target,hemi);
  const back0=lights.back.intensity,blue0=lights.blue.intensity,lamp0=garden.lamps.map(l=>l.intensity);
  const hor=new THREE.Color(),zen=new THREE.Color(),tmp=new THREE.Color(),dir=new THREE.Vector3();
  const pal=(y,j,out)=>{y=Math.max(PAL[0][0],Math.min(PAL[PAL.length-1][0],y));let i=0;while(i<PAL.length-2&&y>PAL[i+1][0])i++;
    return out.set(PAL[i][j]).lerp(tmp.set(PAL[i+1][j]),(y-PAL[i][0])/(PAL[i+1][0]-PAL[i][0]))};
  const q=/[?&]time=(\d+)(?::(\d+))?/.exec(location.search);let hour=q?+q[1]+(+q[2]||0)/60:23,playing=false;
  function apply(){
    const t=(hour-6)/12*Math.PI;dir.set(Math.cos(t),Math.sin(t)*.92+.05,-.35).normalize();
    const y=dir.y,d=ss(-.1,.28,y),n=1-d;
    pal(y,2,hor);pal(y,1,zen);scene.background.copy(hor).lerp(zen,.35);scene.fog.color.copy(hor);scene.fog.density=.036-.02*d;
    sun.color.set('#ff9a55').lerp(tmp.set('#fff1d6'),ss(0,.5,y));sun.intensity=4.5*d;sun.position.copy(target).addScaledVector(dir,30);
    hemi.color.copy(zen).lerp(tmp.set('#ffffff'),.4);hemi.intensity=2*d;
    lights.back.intensity=back0*(.08+.92*n);lights.blue.intensity=blue0*(.08+.92*n);
    garden.lamps.forEach((l,i)=>{l.intensity=lamp0[i]*(.05+.95*n)});garden.night.value=n;
    materials.glow.value=(+$('glow').value||1)*(.1+.9*n);
    spores.brightness.value=(+$('brightness').value||4)*(.25+.75*n);
    renderer.toneMappingExposure=(+$('exposure').value||.5)*(1+(DAY_EXPOSURE-1)*d);
    const gr=post&&post.tone&&post.tone.grade;if(gr){gr.saturation.value=(+$('saturation').value||1)+DAY_SAT*d;gr.warmth.value=(+$('warmth').value||0)+DAY_WARM*d}
    if(post&&post.glow&&post.glow.strength)post.glow.strength.value=.3*(.4+.6*n);
    const m=Math.round(hour*60)%1440;clock.textContent=String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');
  }
  slider.addEventListener('input',()=>{hour=+slider.value;apply()});
  play.addEventListener('click',()=>{playing=!playing;play.textContent=playing?'❚❚':'▶';play.setAttribute('aria-pressed',String(playing))});
  slider.value=hour;apply();
  return {update(dt){if(playing){hour=(hour+dt*.25)%24;slider.value=hour}apply()},set(h){hour=h;slider.value=h;apply()},get hour(){return hour}};
}
