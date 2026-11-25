import * as THREE from 'three/webgpu';
import { vertexColor, positionLocal, time, vec3, sin, cos, float } from 'three/tsl';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { TAU, clamp, lerp, sstep, mulberry32, noise3, fbm3, mix3, toLin, tubeGeo, lathe, placed, finish, colorize } from './especes.js';

// Plantes herbacées réalistes, construites comme les champignons : géométrie paramétrique + couleurs par sommet
// (dégradés base→pointe, nervures, marbrures, revers plus clair, bords foncés). Unités : mètres.
const rgb=h=>[parseInt(h.slice(1,3),16)/255,parseInt(h.slice(3,5),16)/255,parseInt(h.slice(5,7),16)/255];
const pOv=u=>Math.pow(Math.sin(Math.PI*Math.pow(u,.75)),.85),pLin=u=>Math.min(1,u*9,(1-u)*5),pOvate=u=>Math.pow(Math.sin(Math.PI*Math.pow(u,.6)),.7),pKid=u=>Math.pow(Math.sin(Math.PI*Math.pow(u,.45)),.8),pSword=u=>Math.min(1,u*7)*Math.pow(1-u,.6),pPet=u=>Math.pow(Math.sin(Math.PI*Math.pow(u,.7)),.6);

// limbe à deux faces : nervure centrale, nervures latérales, parallèles, dents, ondulation, échancrure, zonage
function sheet(o){const nu=o.nu||12,nv=o.nv||6,pf=o.pf||pOv,fo=o.fold??.18,dr=o.droop??.14,P=[],Cl=[],I=[],s0=o.seed||0,c0=rgb(o.c0),c1=rgb(o.c1||o.c0),cv=rgb(o.cv||o.c1||o.c0),cu=rgb(o.cu||o.c0);
  for(let s=0;s<2;s++){const b0=P.length/3;
    for(let i=0;i<=nu;i++){const u=i/nu,p=pf(u);
      for(let j=0;j<=nv;j++){const v=j/nv*2-1,av=Math.abs(v),w=o.W*p*(1+(o.tooth||0)*(((u*(o.nt||14))%1)-.5)),a=(o.twist||0)*u,x=v*w+(o.asym||0)*w*u;
        const z=av*w*fo-dr*o.L*u*u+(o.wave||0)*o.W*Math.sin(u*(o.wk||11)+v*2)*av*p,y=u*o.L*(1-.1*dr*u)*(1-(o.notch||0)*sstep(.78,1,u)*Math.exp(-((v*3)**2)));
        P.push(x*Math.cos(a),y,z+x*Math.sin(a)-s*.0012);
        const mid=1-sstep(0,.08,av),lat=Math.pow(Math.abs(Math.sin((u*(o.nl||7)-av*.9)*Math.PI)),10)*sstep(.06,.3,av)*(1-sstep(.8,1,av)),par=o.par?Math.pow(Math.abs(Math.sin(v*o.par*Math.PI)),14):0;
        let c=mix3(c0,c1,sstep(0,1,u));const m=1+(o.mott??.16)*(fbm3(x*(o.nz||9)+s0,y*(o.nz||9),z*(o.nz||9)+s,3)-.5)*2;
        c=mix3(c,cv,clamp(mid*(o.midv??.55)+lat*(o.latv??.4)+par*.45,0,1));c=[c[0]*m,c[1]*m,c[2]*m];const e=1-.16*sstep(.82,1,av);c=[c[0]*e,c[1]*e,c[2]*e];
        if(o.zone){const d=Math.hypot(u-.42,v*.75);c=mix3(c,rgb(o.zone),sstep(.07,0,Math.abs(d-.27))*.6)}
        if(s)c=mix3(c,cu,o.under??.6);
        Cl.push(toLin(c[0]),toLin(c[1]),toLin(c[2]))}}
    for(let i=0;i<nu;i++)for(let j=0;j<nv;j++){const a=b0+i*(nv+1)+j,b=a+1,c=a+nv+1,d=c+1;s?I.push(a,c,b,b,c,d):I.push(a,b,c,b,d,c)}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('color',new THREE.Float32BufferAttribute(Cl,3));g.setIndex(I);g.computeVertexNormals();return g}
// feuille palmée / palmatiséquée : lobes pilotés par des gaussiennes, nervures rayonnantes
function palmate(o){const th=[],n=o.n,sp=o.sp,sg=o.sg,nr=o.nr||6,nf=o.nf||48,P=[],Cl=[],I=[],c0=rgb(o.c0),c1=rgb(o.c1),cv=rgb(o.cv),cu=rgb(o.cu||o.c0);for(let k=0;k<n;k++)th.push((k/(n-1)-.5)*sp);
  for(let s=0;s<2;s++){const b0=P.length/3;
    for(let i=0;i<=nr;i++){const u=i/nr;for(let j=0;j<=nf;j++){const ph=clamp((j/nf-.5)*(sp+sg*3.4),-1.5,1.5);let lb=0,dk=9;for(const t of th){lb=Math.max(lb,Math.exp(-Math.pow((ph-t)/sg,2)));dk=Math.min(dk,Math.abs(ph-t))}
      const r=u*o.L*(o.mn+(1-o.mn)*lb),x=Math.sin(ph)*r,y=Math.cos(ph)*r,z=-r*r*(o.cup??.8)/o.L+(o.crin??.5)*Math.sin(r*120+ph*9)*.003*u-s*.0012;P.push(x,y,z);
      let c=mix3(c0,c1,u);const ray=Math.exp(-Math.pow(dk/(sg*.3),2))*sstep(.04,.35,u),m=1+.14*(fbm3(x*9+(o.seed||0),y*9,z*9+s,3)-.5)*2;c=mix3(c,cv,clamp(ray*.6,0,1));c=[c[0]*m,c[1]*m,c[2]*m];const e=1-.2*(1-lb)*u;c=[c[0]*e,c[1]*e,c[2]*e];if(s)c=mix3(c,cu,.6);Cl.push(toLin(c[0]),toLin(c[1]),toLin(c[2]))}}
    for(let i=0;i<nr;i++)for(let j=0;j<nf;j++){const a=b0+i*(nf+1)+j,b=a+1,c=a+nf+1,d=c+1;s?I.push(a,c,b,b,c,d):I.push(a,b,c,b,d,c)}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('color',new THREE.Float32BufferAttribute(Cl,3));g.setIndex(I);g.computeVertexNormals();return g}

const _f=new THREE.Vector3(),_s=new THREE.Vector3(),_n=new THREE.Vector3(),_u=new THREE.Vector3(0,1,0),_m=new THREE.Matrix4(),_q=new THREE.Quaternion();
// pose une lame dont l'axe Y part vers (azimut, élévation), la face visible vers le haut (roulis pour tourner autour de l'axe)
function put(g,x,y,z,az,el,roll=0,sc=1,dispose=true){_f.set(Math.sin(az)*Math.cos(el),Math.sin(el),Math.cos(az)*Math.cos(el));_s.crossVectors(_f,_u);if(_s.lengthSq()<1e-6)_s.set(1,0,0);_s.normalize();_n.crossVectors(_s,_f);
  if(roll){_q.setFromAxisAngle(_f,roll);_s.applyQuaternion(_q);_n.applyQuaternion(_q)}_m.makeBasis(_s,_f,_n);if(sc!==1)_m.scale(new THREE.Vector3(sc,sc,sc));_m.setPosition(x,y,z);const c=g.clone();c.applyMatrix4(_m);if(dispose)g.dispose();return c}
// pose un objet vertical (corolle, capitule...) : rotation autour de Y puis inclinaison
function at(g,x,y,z,az=0,s=1,rx=0){const m=new THREE.Matrix4().makeRotationY(az).multiply(new THREE.Matrix4().makeRotationX(rx)).scale(new THREE.Vector3(s,s,s)).setPosition(x,y,z);const c=g.clone();c.applyMatrix4(m);g.dispose();return c}
function stem(bag,curve,r0,r1,c0,c1,o={}){const a=rgb(c0),b=rgb(c1);bag.stem.push(tubeGeo(curve,o.n||Math.max(8,Math.round(curve.getLength()*60)),o.sides||6,t=>lerp(r0,r1,t)*(1+(o.swell||0)*Math.pow(Math.max(0,Math.sin(t*(o.nodes||5)*Math.PI)),8)),(t,ang,p)=>{const m=.88+.24*noise3(p.x*60,p.y*60,p.z*60),c=mix3(a,b,t);return[c[0]*m,c[1]*m,c[2]*m]}))}
const curveOf=pts=>new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(...p)));
const axis=(H,lean,az,w,n=10)=>{const pts=[];for(let i=0;i<=n;i++){const t=i/n;pts.push([Math.sin(az)*lean*H*t*t+Math.sin(t*6+az)*w*H*.015,H*t,Math.cos(az)*lean*H*t*t+Math.cos(t*5+az)*w*H*.015])}return pts};
const PHI=2.399963,pCord=u=>Math.pow(Math.sin(Math.PI*Math.pow(u,.55)),.7),pLanc=u=>Math.pow(Math.sin(Math.PI*Math.pow(u,.9)),1.1);
// feuille pennée : rachis + paires de folioles produites par `mk`
function pinnate(bag,x,y,z,az,el,L,n,dr,mk,c0='#4a7a35',c1='#3a6a2c'){const ca=Math.cos(el),f=u=>[x+Math.sin(az)*ca*L*u,y+Math.sin(el)*L*u-dr*L*u*u,z+Math.cos(az)*ca*L*u],p=[];for(let i=0;i<=5;i++)p.push(f(i/5));
  stem(bag,curveOf(p),.0022*(1+L*4),.0006,c0,c1,{sides:4,n:10});for(let k=1;k<=n;k++){const u=.14+.76*k/n,q=f(u),s=.45+.55*Math.sin(Math.PI*Math.min(1,u*.9));for(const sg of [-1,1])mk(q[0],q[1],q[2],az+sg*1.05,el-.08,s)}const e=f(1);mk(e[0],e[1],e[2],az,el-dr*1.2,.85)}
// petit cône (filament, soie) avec dégradé
const coneG=(r,h,c0,c1)=>{const g=new THREE.ConeGeometry(r,h,3,1);g.translate(0,h/2,0);const a=rgb(c0),b=rgb(c1);return finish(colorize(g,(x,y)=>mix3(a,b,clamp(y/h,0,1))))};
const dome=(r,h,c0,c1,seed)=>{const a=rgb(c0),b=rgb(c1);return lathe([[.0003,h],[r*.5,h*.97],[r*.85,h*.7],[r,h*.25],[r*1.02,0]],10,info=>{const m=.85+.3*noise3(info.x*400+seed,info.y*400,info.z*400),c=mix3(a,b,clamp(info.r/r,0,1));return[c[0]*m,c[1]*m,c[2]*m]},info=>.0004*(noise3(info.x*500,info.y*500,info.z*500)-.5))};

function species(id,rnd,bag){const R=(a,b)=>a+(b-a)*rnd();
  const leafAt=(g,x,y,z,az,el,roll,s)=>bag.leaf.push(put(g,x,y,z,az,el,roll,s)),petalAt=(g,x,y,z,az,el,roll,s)=>bag.petal.push(put(g,x,y,z,az,el,roll,s));
  const petiole=(x,y,z,az,len,lift,c0,c1)=>{const q=[x+Math.sin(az)*len,y+lift,z+Math.cos(az)*len];stem(bag,curveOf([[x,y,z],[(x+q[0])/2,y+lift*1.2,(z+q[2])/2],q]),.0028,.0016,c0,c1,{sides:5,n:8});return q};
  if(id==='achillee'){
    const fe=(x,y,z,az,el,s)=>leafAt(sheet({L:.016*s,W:.0035*s,pf:pLin,nu:3,nv:2,fold:.4,c0:'#3f6a30',c1:'#6f8f55',cu:'#a9b99a',seed:rnd()*9,nl:3,mott:.1}),x,y,z,az,el,0,1);
    const sub=(x,y,z,a,e,s)=>pinnate(bag,x,y,z,a,e,.034*s,2,.1,fe,'#4a7a35','#4a7a35');
    for(let i=0;i<5;i++){const a=i*PHI+R(0,.3);pinnate(bag,Math.sin(a)*.02,.02,Math.cos(a)*.02,a,R(.45,.7),R(.13,.18),6,.3,sub)}
    for(let n=0;n<3;n++){const H=R(.5,.65),ax=axis(H,.12,n*2.1+R(0,1),1),cv=curveOf(ax);stem(bag,cv,.0036,.0018,'#5a7f3e','#8aa06a',{nodes:6,swell:.25});
      for(let i=0;i<5;i++){const t=.07+.62*i/4,p=cv.getPointAt(t);pinnate(bag,p.x,p.y,p.z,i*PHI+n,.35,.12*(1-.55*t),6,.3,sub)}
      const c=cv.getPointAt(1);for(let k=0;k<22;k++){const a=k*PHI,r=.085*Math.sqrt(k/22),yy=c.y+.02+.03*(1-Math.pow(r/.085,2)),px=c.x+Math.sin(a)*r,pz=c.z+Math.cos(a)*r;
        stem(bag,curveOf([[c.x,c.y-.01,c.z],[(c.x+px)/2,yy-.012,(c.z+pz)/2],[px,yy-.004,pz]]),.0011,.0008,'#6f8f55','#a9b99a',{sides:4,n:4});
        for(let q=0;q<5;q++)petalAt(sheet({L:.0095,W:.0048,pf:pPet,nu:3,nv:2,fold:.2,droop:.2,notch:.35,c0:'#f4f1e8',c1:'#fbfaf4',cv:'#e3dcc8',nl:3,mott:.05}),px,yy,pz,a+q*TAU/5,.45,0,1);
        bag.petal.push(at(dome(.0032,.0028,'#e0b63a','#f0d878',rnd()*9),px,yy+.0005,pz))}}}
  if(id==='napel'||id==='lycoctonum'){const nap=id==='napel',k=nap?1:2.3,c0=nap?'#4a55d8':'#e9dc62',c1=nap?'#1f2a8a':'#b5a028',cvn=nap?'#7a80f0':'#fff3a0';
    const ax=axis(1.15,.08,R(0,6),1),cv=curveOf(ax);stem(bag,cv,.009,.004,'#4f7a3a','#7a8a4a',{nodes:8,swell:.2,sides:7});
    const lf=(x,y,z,a,L)=>{const q=petiole(x,y,z,a,.09,.03,'#4f7a3a','#3f6a30');leafAt(palmate({L,n:7,sp:2.5,sg:nap?.13:.2,mn:.16,c0:'#1d4a22',c1:'#2f6a2c',cv:'#7fb070',cu:'#6f9a68',seed:rnd()*9}),q[0],q[1],q[2],a,.12,0,1)};
    for(let i=0;i<5;i++){const a=i*1.26+R(0,.5);lf(Math.sin(a)*.1,.06,Math.cos(a)*.1,a,.17)}
    for(let i=0;i<10;i++){const t=.06+.5*i/9,p=cv.getPointAt(t),a=i*PHI;lf(p.x,p.y,p.z,a,.15*(1-.55*t)+.03)}
    const fl=(x,y,z,a,s)=>{const gl=lathe([[.0003,0],[.009,.002],[.0125,.011],[.012,.022],[.0085,.031],[.0035,.038],[.0003,.041]].map(p=>[p[0],p[1]*k]),14,info=>{const t=clamp(info.y/(.041*k),0,1),m=.9+.2*noise3(info.x*80,info.y*80,info.z*80),c=mix3(rgb(c1),rgb(c0),sstep(0,.9,t));return[c[0]*m,c[1]*m,c[2]*m]},info=>.0004*Math.sin(info.a*10+info.y*60));
      stem(bag,curveOf([[x,y,z],[x+Math.sin(a)*.006*s,y+.004*s,z+Math.cos(a)*.006*s],[x+Math.sin(a)*.014*s,y+.003*s,z+Math.cos(a)*.014*s]]),.0011,.0009,'#6f8a4a','#6f8a4a',{sides:4,n:5});
      bag.petal.push(at(gl,x+Math.sin(a)*.014*s,y+.002*s,z+Math.cos(a)*.014*s,a,s,-.5));
      for(const sg of [-1,1])petalAt(sheet({L:.017*s,W:.0085*s,pf:pOv,nu:4,nv:4,fold:.45,droop:.25,c0:c0,c1:c1,cv:cvn,nl:5}),x+Math.sin(a)*.014*s,y+.002*s,z+Math.cos(a)*.014*s,a+sg*1.3,.25,0,1)};
    for(let q=0;q<24;q++){const p=cv.getPointAt(.54+.44*q/23);fl(p.x,p.y,p.z,q*PHI,1-.4*q/23)}
    for(let s=0;s<2;s++){const p=cv.getPointAt(.5+.08*s),ab=s*3.1+R(0,.6),g2=curveOf([[p.x,p.y,p.z],[p.x+Math.sin(ab)*.08,p.y+.1,p.z+Math.cos(ab)*.08],[p.x+Math.sin(ab)*.16,p.y+.38,p.z+Math.cos(ab)*.16]]);stem(bag,g2,.004,.002,'#4f7a3a','#6f8a4a',{sides:5});
      for(let q=0;q<7;q++){const pp=g2.getPointAt(.35+.65*q/6);fl(pp.x,pp.y,pp.z,q*PHI+s,.7*(1-.35*q/6))}}}
  if(id==='actee'){const lfl=(x,y,z,a,e,s)=>leafAt(sheet({L:.07*s,W:.032*s,pf:pOvate,nu:6,nv:4,fold:.3,tooth:.35,nt:9,c0:'#1f4a22',c1:'#3a6a2a',cv:'#8fbf80',cu:'#6f9a68',nl:6,seed:rnd()*9}),x,y,z,a,e,0,1),pin=(x,y,z,a,e,s)=>pinnate(bag,x,y,z,a,e,.17*s,2,.15,lfl,'#3a6a2a','#2f5a2a');
    for(let i=0;i<3;i++){const a=i*2.1;pinnate(bag,Math.sin(a)*.05,.03,Math.cos(a)*.05,a,.55,.5,2,.35,pin)}
    for(let n=0;n<2;n++){const ax=axis(1.45-.2*n,.05,n*3.1,1),cv=curveOf(ax);stem(bag,cv,.009,.004,'#5a6a3a','#7f8f55',{nodes:7,swell:.2,sides:7});
      for(let i=0;i<3;i++){const p=cv.getPointAt(.08+.38*i/2);pinnate(bag,p.x,p.y,p.z,i*2.3+n,.15,.42,2,.3,pin)}
      const cn=coneG(.0007,.013,'#f8f4e4','#f3e6a8');for(let k=0;k<44;k++){const t=.7+.3*k/43,p=cv.getPointAt(t),a=k*PHI,s=.5+.5*Math.sin(Math.PI*Math.min(1,(1-k/43)*1.1+.1)),px=p.x+Math.sin(a)*.03,pz=p.z+Math.cos(a)*.03;
        stem(bag,curveOf([[p.x,p.y,p.z],[px,p.y+.008,pz]]),.0009,.0007,'#8f9f70','#a9b99a',{sides:4,n:3});
        for(let j=0;j<8;j++){const aa=rnd()*TAU,el=R(.3,1.3);bag.petal.push(placed(cn,new THREE.Vector3(px,p.y+.01,pz),new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.cos(el)*Math.sin(aa)*1.2,0,-Math.cos(el)*Math.cos(aa)*1.2)),new THREE.Vector3(s,s,s)))}}}}
  if(id==='thym'||id==='romarin'){const th=id==='thym',H=th?.22:1,nb=th?12:9,nr=th?5:6,nl=th?8:9;
    for(let i=0;i<nb;i++){const az=i*PHI+R(0,.5),h=H*R(.7,1),cv=curveOf(axis(h,R(.25,.6)*(th?2.6:.55),az,1));stem(bag,cv,th?.0035:.008,.0014,th?'#7a6a52':'#6a5a44','#5a7a3a',{sides:5});
      for(let k=0;k<nr;k++){const t=.3+.65*k/nr,p=cv.getPointAt(t),a2=az+(k%2?1:-1)*R(.6,1.5)+k,l2=h*R(.22,.4)*(1.15-t*.5),e2=R(.2,.9),c2=Math.cos(e2),q=[p.x+Math.sin(a2)*c2*l2,p.y+Math.sin(e2)*l2,p.z+Math.cos(a2)*c2*l2];
        stem(bag,curveOf([[p.x,p.y,p.z],q]),.0014,.0008,'#6a5a44','#6f8a4a',{sides:4,n:4});
        for(let j=1;j<=nl;j++){const u=j/nl,x=p.x+(q[0]-p.x)*u,y=p.y+(q[1]-p.y)*u,z=p.z+(q[2]-p.z)*u;for(const sg of [-1,1])leafAt(th?sheet({L:.0075,W:.0034,pf:pOv,nu:3,nv:2,fold:.6,c0:'#7d8a62',c1:'#9aa684',cu:'#c4ccb4',nl:2,mott:.1,seed:rnd()*9}):sheet({L:.034,W:.0026,pf:pLin,nu:4,nv:2,fold:.9,droop:.1,c0:'#25502f',c1:'#3f6a45',cu:'#d4d8cc',under:.85,nl:2,mott:.08,seed:rnd()*9}),x,y,z,a2+sg*1.2,e2*.4,0,1)}
        const nfl=th?4:3;for(let j=0;j<nfl;j++){const ox=R(-.012,.012),oy=R(-.01,.012),oz=R(-.012,.012),a3=rnd()*TAU;
          petalAt(sheet({L:th?.0065:.011,W:th?.0035:.0055,pf:pPet,nu:3,nv:3,fold:.4,droop:.3,c0:th?'#d6a0d8':'#7a8fe0',c1:th?'#e8c4ea':'#a9b4f0',cv:th?'#a060a8':'#4a5ab8',nl:2}),q[0]+ox,q[1]+oy,q[2]+oz,a3,.9,0,1);
          petalAt(sheet({L:th?.005:.009,W:th?.0035:.006,pf:pPet,nu:3,nv:3,fold:.2,droop:.6,c0:th?'#d6a0d8':'#6a7ad0',c1:th?'#c080c4':'#8a98e4',cv:th?'#7a3f80':'#2a3a98',nl:2}),q[0]+ox,q[1]+oy-.002,q[2]+oz,a3+.2,.1,0,1)}}}}
  if(id==='florence'||id==='dalmatie'){const fl=id==='florence',pc=fl?'#f8f6f0':'#a9b3ea',pc2=fl?'#ece8dc':'#c9d0f4',fc=fl?'#f2f0ea':'#8d98dc',fv=fl?'#9a8fc0':'#4a4fa0';
    bag.stem.push(placed(finish(colorize(new THREE.SphereGeometry(.03,10,8),(x,y,z)=>mix3(rgb('#8b7a5c'),rgb('#6b7a40'),clamp(noise3(x*60,y*60,z*60),0,1)))),new THREE.Vector3(0,.02,0),new THREE.Quaternion(),new THREE.Vector3(2.8,.8,1.1)));
    for(let i=0;i<10;i++){const sd=i/9*2-1,L=(.7-.22*Math.abs(sd))*R(.88,1.08);leafAt(sheet({L,W:.03,pf:pSword,nu:16,nv:8,fold:.6,droop:.3,twist:R(-.4,.4),par:13,c0:'#b9cfc0',c1:'#6f9b86',cv:'#8fb5a0',cu:'#9fbfae',under:.35,mott:.12,seed:rnd()*9}),sd*.06,.03,R(-.01,.01),sd>=0?Math.PI/2:-Math.PI/2,1.3-.35*Math.abs(sd)+R(-.08,.08),Math.PI/2,1)}
    const cv=curveOf(axis(.95,.07,.8,.6));stem(bag,cv,.008,.004,'#4f7d4a','#7a9a5a',{sides:6,nodes:3,swell:.3});const c=cv.getPointAt(1);
    for(const a of [.3,3.4])leafAt(sheet({L:.09,W:.014,pf:pOv,nu:6,nv:3,fold:.5,c0:'#6a8a50',c1:'#c9d4a8',cu:'#d8dcc0',nl:3}),c.x,c.y-.04,c.z,a,.9,0,1);
    for(let i=0;i<3;i++){const a=i*TAU/3;
      petalAt(sheet({L:.085,W:.04,pf:pPet,nu:10,nv:8,fold:-.2,droop:.25,wave:.14,wk:9,c0:pc2,c1:pc,cv:fv,nl:9,latv:.15,midv:.2,mott:.06}),c.x,c.y,c.z,a,1.2,0,1);
      petalAt(sheet({L:.095,W:.048,pf:pPet,nu:12,nv:10,fold:.1,droop:.85,wave:.35,wk:12,c0:pc2,c1:fc,cv:fv,nl:11,latv:.55,midv:.4,mott:.06}),c.x,c.y,c.z,a+Math.PI/3,-.15,0,1);
      petalAt(sheet({L:.055,W:.02,pf:pOv,nu:5,nv:3,fold:.5,droop:.5,c0:pc2,c1:pc,cv:fv,nl:3}),c.x,c.y+.005,c.z,a+Math.PI/3,.5,0,1);
      const bc=coneG(.0012,.012,'#f2c040','#e8a820');for(let j=0;j<14;j++){const sx=R(-.008,.008),r=R(.02,.058);bag.petal.push(placed(bc,new THREE.Vector3(c.x+Math.sin(a+Math.PI/3)*r+sx,c.y-.006,c.z+Math.cos(a+Math.PI/3)*r),new THREE.Quaternion(),new THREE.Vector3(1,1,1)))}}}
  if(id==='pelargonium'){for(let n=0;n<3;n++){const H=R(.38,.5),cv=curveOf(axis(H,.35,n*2.1,1));stem(bag,cv,.007,.003,'#7a5a48','#5a7f3a',{sides:6,nodes:5,swell:.3});
      for(let i=0;i<16;i++){const t=.16+.8*i/15,p=cv.getPointAt(t),a=i*PHI+n,q=petiole(p.x,p.y,p.z,a,.07,.025,'#6a7a48','#5a7f3a');
        leafAt(sheet({L:.055,W:.034,pf:pKid,nu:12,nv:10,fold:.35,droop:.25,wave:.2,wk:14,tooth:.14,nt:20,nl:7,c0:'#3f7a2a',c1:'#6fa83a',cv:'#a8d070',cu:'#8fb070',zone:'#4a3a28',under:.5,seed:rnd()*9}),q[0],q[1],q[2],a,.15,0,1)}
      const c=cv.getPointAt(1),cy=c.y+.06;stem(bag,curveOf([[c.x,c.y-.1,c.z],[c.x,c.y,c.z],[c.x,cy,c.z]]),.0025,.002,'#6a7a48','#7a8a58',{sides:5,n:6});
      for(let k=0;k<13;k++){const a=k*PHI,r=k?.05*Math.sqrt(k/12):0,px=c.x+Math.sin(a)*r,pz=c.z+Math.cos(a)*r,py=cy+.025-r*.2;stem(bag,curveOf([[c.x,cy,c.z],[px,py,pz]]),.0009,.0007,'#7a8a58','#9a7a68',{sides:4,n:3});
        for(let q=0;q<5;q++){const up=q<2;petalAt(sheet({L:up?.018:.015,W:up?.0115:.01,pf:pPet,nu:5,nv:5,fold:.2,droop:.3,wave:.1,c0:'#f3a785',c1:up?'#ea7f5c':'#f7b89c',cv:'#c8402a',nl:5,latv:up?.55:.2,midv:.15}),px,py,pz,a+(q-2)*.55,.5,0,1)}}}}


  // ---- nouvelles espèces (Plantes_1.json)
  const tuft=(x,y,z,n,c0,c1,len,spread,r=.0005)=>{const cn=coneG(r,len,c0,c1);for(let j=0;j<n;j++){const aa=rnd()*TAU,el=R(.2,spread);bag.petal.push(placed(cn,new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.sin(aa)*el,0,-Math.cos(aa)*el)),new THREE.Vector3(1,1,1)))}};
  const tube1=(len,r0,r1,c0,c1,seg=8)=>{const a=rgb(c0),b=rgb(c1);return lathe([[.0008,0],[r0,len*.12],[r1,len*.7],[r1*.8,len]],seg,info=>{const t=clamp(info.y/len,0,1),c=mix3(a,b,t),m=.9+.2*noise3(info.x*300,info.y*300,info.z*300);return[c[0]*m,c[1]*m,c[2]*m]})};
  if(id==='viperine'){const lf=(L,W,x,y,z,a,e)=>leafAt(sheet({L,W,pf:pLanc,nu:9,nv:4,fold:.4,droop:.3,c0:'#4f6a38',c1:'#8aa070',cv:'#c8d4b0',cu:'#b5c4a0',nl:2,midv:.8,mott:.22,seed:rnd()*9}),x,y,z,a,e,0,1);
    for(let i=0;i<9;i++){const a=i*PHI;lf(R(.16,.24),.026,Math.sin(a)*.02,.02,Math.cos(a)*.02,a,R(.35,.7))}
    const cv=curveOf(axis(.8,.1,R(0,6),1));stem(bag,cv,.006,.003,'#6a7a4a','#8a9a6a',{sides:6,nodes:8,swell:.2});
    for(let i=0;i<10;i++){const t=.1+.5*i/9,p=cv.getPointAt(t);lf(.12*(1-.5*t),.016,p.x,p.y,p.z,i*PHI,.5)}
    for(let s=0;s<7;s++){const p=cv.getPointAt(.45+.5*s/6),ab=s*PHI,g2=curveOf([[p.x,p.y,p.z],[p.x+Math.sin(ab)*.05,p.y+.03,p.z+Math.cos(ab)*.05],[p.x+Math.sin(ab)*.1,p.y+.05,p.z+Math.cos(ab)*.1],[p.x+Math.sin(ab)*.12,p.y+.02,p.z+Math.cos(ab)*.12]]);stem(bag,g2,.0025,.0012,'#6a7a4a','#8a9a6a',{sides:4,n:8});
      for(let k=0;k<8;k++){const q=g2.getPointAt(.2+.8*k/7),bud=k>5;bag.petal.push(at(tube1(.02,.0055,.0075,bud?'#c05080':'#6a80f0',bud?'#e07aa0':'#2f4ad8',8),q.x,q.y,q.z,ab+k,1,-1.1));
        if(!bud)tuft(q.x,q.y+.004,q.z,4,'#c8d0e8','#c83030',.022,1.1,.0004)}}}
  if(id==='rhubarbe'){for(let i=0;i<7;i++){const a=i*PHI,len=R(.45,.7),q=[Math.sin(a)*.18,len,Math.cos(a)*.18];stem(bag,curveOf([[0,0,0],[Math.sin(a)*.06,len*.5,Math.cos(a)*.06],q]),.022,.012,'#a8403a','#7a8a4a',{sides:7,n:14});
      leafAt(sheet({L:R(.4,.55),W:.3,pf:pCord,nu:14,nv:10,fold:.15,droop:.3,wave:.35,wk:7,nl:8,latv:.5,midv:.6,c0:'#2f5a2a',c1:'#4f8a3a',cv:'#a8403a',cu:'#7f9a68',seed:rnd()*9}),q[0],q[1],q[2],a,.35,0,1)}
    const cv=curveOf(axis(1.7,.05,R(0,6),1));stem(bag,cv,.014,.006,'#8a7a4a','#a89a68',{sides:7,nodes:6,swell:.3});
    for(let b=0;b<12;b++){const p=cv.getPointAt(.55+.45*b/11),ab=b*PHI,g2=curveOf([[p.x,p.y,p.z],[p.x+Math.sin(ab)*.07,p.y+.05,p.z+Math.cos(ab)*.07],[p.x+Math.sin(ab)*.13,p.y+.1,p.z+Math.cos(ab)*.13]]);stem(bag,g2,.003,.0015,'#8a7a4a','#a89a68',{sides:4,n:6});
      for(let k=0;k<8;k++){const q=g2.getPointAt(.2+.8*k/7);bag.petal.push(at(dome(.0032,.003,'#e8e0b8','#f4efd0',rnd()*9),q.x+R(-.01,.01),q.y,q.z+R(-.01,.01)))}}}
  if(id==='scille'){bag.stem.push(placed(finish(colorize(new THREE.SphereGeometry(.07,12,10),(x,y,z)=>mix3(rgb('#c9b890'),rgb('#8a6a48'),clamp(noise3(x*40,y*40,z*40)*1.4,0,1)))),new THREE.Vector3(0,.05,0),new THREE.Quaternion(),new THREE.Vector3(1,.9,1)));
    for(let i=0;i<6;i++){const a=i*PHI;leafAt(sheet({L:R(.4,.55),W:.05,pf:pLanc,nu:10,nv:4,fold:.55,droop:.4,c0:'#5f8a6a',c1:'#8fb59a',cv:'#b5d0bc',cu:'#9fbfa8',par:5,mott:.14,seed:rnd()*9}),Math.sin(a)*.03,.08,Math.cos(a)*.03,a,.9,0,1)}
    const cv=curveOf(axis(1.3,.04,R(0,6),.6));stem(bag,cv,.008,.004,'#6a8a5a','#8aa07a',{sides:6});
    for(let k=0;k<46;k++){const p=cv.getPointAt(.42+.58*k/45),a=k*PHI,s=1-.45*k/45,px=p.x+Math.sin(a)*.012,pz=p.z+Math.cos(a)*.012;stem(bag,curveOf([[p.x,p.y,p.z],[px,p.y+.004,pz]]),.0009,.0007,'#8aa07a','#b5c8a0',{sides:4,n:3});
      for(let q=0;q<6;q++)petalAt(sheet({L:.013*s,W:.0045*s,pf:pPet,nu:3,nv:2,fold:.3,droop:.2,c0:'#fbfbf4',c1:'#ffffff',cv:'#8fbf70',nl:2,midv:.5}),px,p.y+.005,pz,a+q*TAU/6,.55,0,1);
      bag.petal.push(at(dome(.0025,.003,'#8fbf70','#b5d890',rnd()*9),px,p.y+.005,pz))}}
  if(id==='aloes'){for(let i=0;i<13;i++){const a=i*PHI,ring=i/13;leafAt(sheet({L:R(.3,.4)*(1-.25*ring),W:.055,pf:u=>Math.min(1,u*5)*Math.pow(1-u,.5),nu:10,nv:6,fold:.9,droop:.4,tooth:.55,nt:18,mott:.35,nz:30,nl:1,c0:'#9ab59a',c1:'#6a9a72',cv:'#d8e8d8',cu:'#a8c4a8',under:.3,seed:rnd()*9}),Math.sin(a)*.02,.03,Math.cos(a)*.02,a,.9-ring*.7,0,1)}
    const cv=curveOf(axis(.85,.06,R(0,6),.5));stem(bag,cv,.008,.004,'#8a7a4a','#a8b070',{sides:6});
    for(let k=0;k<28;k++){const p=cv.getPointAt(.5+.5*k/27),a=k*PHI,t=k/27;bag.petal.push(at(tube1(.04,.006,.0075,t<.5?'#e8e060':'#f0b030',t<.5?'#e07a20':'#e8c040',8),p.x+Math.sin(a)*.012,p.y,p.z+Math.cos(a)*.012,a,1,2.3));tuft(p.x+Math.sin(a)*.02,p.y-.035,p.z+Math.cos(a)*.02,3,'#f0e0a0','#e8c040',.012,.6)}}
  if(id==='marrube'){const lf=(x,y,z,a,t)=>leafAt(sheet({L:.05*(1-.4*t),W:.03*(1-.3*t),pf:pKid,nu:8,nv:6,fold:.3,droop:.2,wave:.3,wk:10,tooth:.25,nt:12,mott:.2,nz:25,c0:'#8a9a80',c1:'#c0ccb4',cv:'#e8eee0',cu:'#dfe6d6',nl:5,seed:rnd()*9}),x,y,z,a,.35,0,1);
    for(let n=0;n<4;n++){const cv=curveOf(axis(R(.3,.55),.25,n*1.6,1));stem(bag,cv,.0045,.002,'#a9b8a0','#d8e0d0',{sides:4,nodes:5,swell:.2});
      for(let i=0;i<9;i++){const t=.1+.8*i/8,p=cv.getPointAt(t);for(const sg of [0,Math.PI])lf(p.x,p.y,p.z,i*1.57+sg,t);
        if(i>=4)for(let q=0;q<10;q++)petalAt(sheet({L:.007,W:.003,pf:pPet,nu:3,nv:2,fold:.3,droop:.3,c0:'#f4f4ea',c1:'#ffffff',cv:'#d8d8c8',nl:2}),p.x,p.y+.003,p.z,q*TAU/10,.7,0,1);
        if(i>=4)tuft(p.x,p.y,p.z,8,'#b0b8a0','#8a9078',.008,1.2,.0006)}}}
  if(id==='rhodiole'){for(let n=0;n<7;n++){const cv=curveOf(axis(R(.18,.32),.15,n*PHI,1));stem(bag,cv,.0035,.002,'#8a6a58','#7aa078',{sides:6});
      for(let i=0;i<10;i++){const p=cv.getPointAt(.1+.8*i/9);leafAt(sheet({L:.035,W:.014,pf:pOv,nu:5,nv:3,fold:.5,droop:.1,tooth:.2,nt:5,mott:.1,c0:'#6a9a82',c1:'#9ac0a8',cv:'#c8e0d0',cu:'#b0d0bc',under:.3,seed:rnd()*9}),p.x,p.y,p.z,i*PHI,.6,0,1)}
      const c=cv.getPointAt(1);for(let k=0;k<18;k++){const a=k*PHI,r=.02*Math.sqrt(k/18),px=c.x+Math.sin(a)*r,pz=c.z+Math.cos(a)*r,py=c.y+.012-r*.3;for(let q=0;q<4;q++)petalAt(sheet({L:.006,W:.003,pf:pPet,nu:2,nv:2,fold:.2,c0:'#d8a020',c1:'#f0d040',cv:'#c05030',nl:2}),px,py,pz,a+q*1.57,.6,0,1)}}}
  if(id==='sanguinaire'){bag.stem.push(placed(finish(colorize(new THREE.SphereGeometry(.012,8,6),(x,y,z)=>mix3(rgb('#a8402a'),rgb('#7a2a20'),clamp(noise3(x*80,y*80,z*80),0,1)))),new THREE.Vector3(0,.005,0),new THREE.Quaternion(),new THREE.Vector3(3,.7,1)));
    stem(bag,curveOf([[0,0,0],[.01,.07,0],[.02,.15,.01]]),.003,.002,'#c8905a','#9ab088',{sides:5,n:8});leafAt(palmate({L:.14,n:7,sp:3.2,sg:.55,mn:.7,crin:.8,cup:.5,c0:'#6a9a82',c1:'#9fc4ad',cv:'#d8ece0',cu:'#b5d4c0',seed:rnd()*9}),.02,.15,.01,0,.35,0,1);
    const cv=curveOf([[-.02,0,.01],[-.025,.1,.01],[-.02,.2,.01]]);stem(bag,cv,.002,.0015,'#d0b090','#b0c0a0',{sides:5,n:8});const c=cv.getPointAt(1);
    for(let r=0;r<2;r++)for(let q=0;q<(r?4:6);q++)petalAt(sheet({L:.04,W:.013,pf:pPet,nu:6,nv:3,fold:.3,droop:.2,c0:'#f8f8f0',c1:'#ffffff',cv:'#e8e0d0',nl:3,midv:.2}),c.x,c.y,c.z,q*TAU/(r?4:6)+r*.5,.5+r*.3,0,1);
    tuft(c.x,c.y+.003,c.z,26,'#f0e080','#e8b820',.012,.9,.0007)}
  if(id==='hydraste'){const cv=curveOf([[0,0,0],[.01,.15,0],[.02,.3,.01]]);stem(bag,cv,.003,.0022,'#a8c060','#8aa060',{sides:5,n:10});
    for(let i=0;i<2;i++){const p=cv.getPointAt(i?.7:.95),a=i*2.6;leafAt(palmate({L:.13,n:5,sp:2.3,sg:.28,mn:.3,crin:1.2,cup:.6,c0:'#2f6a2a',c1:'#5f9a3a',cv:'#a8d080',cu:'#7fb068',seed:rnd()*9}),p.x,p.y,p.z,a,.15,0,1)}
    const c=cv.getPointAt(1);tuft(c.x,c.y+.01,c.z,22,'#f4f8e0','#e8f0c0',.016,1,.0006);for(let q=0;q<3;q++)petalAt(sheet({L:.01,W:.005,pf:pOv,nu:3,nv:2,c0:'#a8c880',c1:'#c8dca0',nl:1}),c.x,c.y+.008,c.z,q*2.09,.7,0,1)}
  if(id==='piment'){const pep=(c0,c1)=>{const a=rgb(c0),b=rgb(c1);return lathe([[.0003,0],[.008,.004],[.01,.02],[.007,.05],[.003,.075],[.0003,.085]],10,info=>{const t=clamp(info.y/.085,0,1),c=mix3(a,b,t),m=.92+.16*noise3(info.x*200,info.y*200,info.z*200);return[c[0]*m,c[1]*m,c[2]*m]})};
    for(let n=0;n<4;n++){const cv=curveOf(axis(R(.5,.8),.3,n*1.6,1));stem(bag,cv,.0045,.0022,'#6a8a4a','#8aa060',{sides:4,nodes:5,swell:.15});
      for(let i=0;i<10;i++){const t=.15+.8*i/9,p=cv.getPointAt(t);leafAt(sheet({L:.085,W:.035,pf:pOvate,nu:8,nv:5,fold:.3,droop:.3,c0:'#2f7a2a',c1:'#5fb040',cv:'#a8e080',cu:'#7fb068',nl:5,seed:rnd()*9}),p.x,p.y,p.z,i*PHI+n,.45,0,1)}
      for(let f=0;f<3;f++){const p=cv.getPointAt(.4+.5*f/2),a=f*PHI+n,ripe=R(0,1),cs=ripe<.34?['#3f8a2a','#2f7a22']:ripe<.7?['#e8601a','#d84a14']:['#d82a1a','#a81a10'];bag.petal.push(at(pep(cs[0],cs[1]),p.x+Math.sin(a)*.02,p.y-.005,p.z+Math.cos(a)*.02,a,1,Math.PI));}
      for(let f=0;f<2;f++){const p=cv.getPointAt(.55+.4*f),a=f*2+n;for(let q=0;q<5;q++)petalAt(sheet({L:.012,W:.005,pf:pPet,nu:3,nv:2,fold:.2,droop:.2,c0:'#f8f8f0',c1:'#ffffff',cv:'#d8e0c0',nl:2}),p.x,p.y,p.z,a+q*TAU/5,.4,0,1);bag.petal.push(at(dome(.0025,.003,'#e8c030','#f0d860',rnd()*9),p.x,p.y+.002,p.z))}}}

  // ---- deuxième série (Plantes_1.json)
  const pea=(x,y,z,az,sc,c0,c1)=>{petalAt(sheet({L:.014*sc,W:.0075*sc,pf:pPet,nu:4,nv:3,fold:.2,droop:-.1,c0,c1,cv:c1,nl:3}),x,y,z,az,1.2,0,1);for(const sg of [-1,1])petalAt(sheet({L:.012*sc,W:.005*sc,pf:pPet,nu:3,nv:2,fold:.2,droop:.3,c0,c1,nl:2}),x,y,z,az+sg*.9,.2,0,1);petalAt(sheet({L:.01*sc,W:.004*sc,pf:pPet,nu:3,nv:2,fold:.4,droop:.6,c0:c1,c1:c0,nl:1}),x,y,z,az,-.3,0,1)};
  const pod=(x,y,z,az,len,c0,c1)=>{const a=rgb(c0),b=rgb(c1);bag.petal.push(at(lathe([[.0005,0],[len*.18,len*.15],[len*.2,len*.6],[len*.08,len*.95],[.0005,len]],8,info=>{const c=mix3(a,b,clamp(info.y/len,0,1)),m=.9+.2*noise3(info.x*200,info.y*200,info.z*200);return[c[0]*m,c[1]*m,c[2]*m]}),x,y,z,az,1,Math.PI))};
  if(id==='crotalaire'){for(let n=0;n<3;n++){const cv=curveOf(axis(R(.7,1),.15,n*2.1,1));stem(bag,cv,.005,.0025,'#6a8a4a','#8aa060',{sides:6,nodes:6,swell:.2});
      for(let i=0;i<11;i++){const t=.1+.55*i/10,p=cv.getPointAt(t);leafAt(sheet({L:.09,W:.045,pf:pOvate,nu:8,nv:5,fold:.3,droop:.3,c0:'#3a7a2f',c1:'#6aa83f',cv:'#b0d888',cu:'#8cb872',nl:6,seed:rnd()*9}),p.x,p.y,p.z,i*PHI+n,.4,0,1)}
      for(let k=0;k<14;k++){const p=cv.getPointAt(.68+.32*k/13);const a=k*PHI;pea(p.x+Math.sin(a)*.012,p.y,p.z+Math.cos(a)*.012,a,1.3,'#f2d020','#e8a810')}
      for(let k=0;k<3;k++){const p=cv.getPointAt(.7+.1*k),a=k*2.1+n;pod(p.x+Math.sin(a)*.02,p.y,p.z+Math.cos(a)*.02,a,.04,'#8aa050','#b09a50')}}}
  if(id==='astragale'){const lfl=(x,y,z,a,e,sc)=>leafAt(sheet({L:.022*sc,W:.01*sc,pf:pOvate,nu:4,nv:3,fold:.3,c0:'#6a8a58',c1:'#9ab888',cv:'#d0e0c0',cu:'#b8ccaa',nl:3,mott:.12,seed:rnd()*9}),x,y,z,a,e,0,1);
    for(let n=0;n<3;n++){const cv=curveOf(axis(R(.6,.85),.12,n*2.1,1));stem(bag,cv,.0045,.0022,'#7a8a5a','#9aaa7a',{sides:6,nodes:6,swell:.15});
      for(let i=0;i<7;i++){const p=cv.getPointAt(.12+.6*i/6);pinnate(bag,p.x,p.y,p.z,i*PHI+n,.4,.12,6,.25,lfl,'#7a8a5a','#6a7a50')}
      for(let r=0;r<2;r++){const p=cv.getPointAt(.6+.2*r),ab=r*3+n,g2=curveOf([[p.x,p.y,p.z],[p.x+Math.sin(ab)*.03,p.y+.05,p.z+Math.cos(ab)*.03],[p.x+Math.sin(ab)*.05,p.y+.1,p.z+Math.cos(ab)*.05]]);stem(bag,g2,.0018,.0012,'#7a8a5a','#9aaa7a',{sides:4,n:6});
        for(let k=0;k<12;k++){const q=g2.getPointAt(.15+.85*k/11);pea(q.x,q.y,q.z,k*PHI,1,'#f4ecb0','#e8dc88')}
        pod(p.x+Math.sin(ab)*.025,p.y+.03,p.z+Math.cos(ab)*.025,ab,.035,'#b8d0a0','#e0e8c8')}}}
  if(id==='gelsemium'){for(let n=0;n<8;n++){const L=R(.9,1.5),cv=curveOf(axis(L,R(.7,1.1),n*PHI,1.4));stem(bag,cv,.0025,.0012,'#7a5a48','#4a6a3a',{sides:4});
      for(let i=0;i<14;i++){const p=cv.getPointAt(.12+.85*i/13);for(const sg of [0,Math.PI])leafAt(sheet({L:.06,W:.02,pf:pLanc,nu:6,nv:3,fold:.35,droop:.2,c0:'#1f5a2a',c1:'#3a8a3a',cv:'#8fc080',cu:'#6a9a60',nl:4,seed:rnd()*9}),p.x,p.y,p.z,i*1.57+sg+n,.3,0,1)}
      for(let k=0;k<4;k++){const p=cv.getPointAt(.3+.6*k/3),a=k*PHI+n,px=p.x+Math.sin(a)*.012,pz=p.z+Math.cos(a)*.012;bag.petal.push(at(tube1(.035,.006,.014,'#d8a808','#f8dc50',10),px,p.y,pz,a,1,-1.2));for(let q=0;q<5;q++)petalAt(sheet({L:.012,W:.008,pf:pPet,nu:3,nv:3,fold:.2,droop:.3,c0:'#f4cc20',c1:'#fae660',cv:'#c89a08',nl:2}),px+Math.sin(a)*.018,p.y+.012,pz+Math.cos(a)*.018,a+(q-2)*.6,.2,0,1)}}}
  if(id==='kalmia'){for(let n=0;n<6;n++){const cv=curveOf(axis(R(1.1,1.5),.22,n*PHI,1));stem(bag,cv,.01,.004,'#6a5a4a','#8a7a62',{sides:6,nodes:5,swell:.2});
      for(let i=0;i<16;i++){const p=cv.getPointAt(.2+.8*i/15);leafAt(sheet({L:.09,W:.035,pf:pOv,nu:8,nv:5,fold:.35,droop:.25,c0:'#1a4a22',c1:'#2f6a30',cv:'#7fa870',cu:'#6a9a60',nl:6,mott:.1,seed:rnd()*9}),p.x,p.y,p.z,i*PHI+n,.35,0,1)}
      if(n<4){const c=cv.getPointAt(1);for(let k=0;k<12;k++){const a=k*PHI,r=.05*Math.sqrt(k/12),px=c.x+Math.sin(a)*r,pz=c.z+Math.cos(a)*r,py=c.y+.02-r*.2,bud=k>8;stem(bag,curveOf([[c.x,c.y,c.z],[px,py-.01,pz]]),.0012,.0009,'#9a8a6a','#c08a8a',{sides:4,n:3});
        bag.petal.push(at(lathe(bud?[[.0005,0],[.005,.003],[.007,.009],[.003,.014],[.0005,.016]]:[[.0008,0],[.008,.003],[.014,.012],[.017,.019]],10,info=>{const t=clamp(info.y/(bud?.016:.019),0,1),c=mix3(rgb(bud?'#d870a0':'#f8c8d8'),rgb(bud?'#f0a0c0':'#fff4f6'),t),m=.92+.16*Math.abs(Math.sin(info.a*5));return[c[0]*m,c[1]*m,c[2]*m]}),px,py,pz,a,1,.3))}}}}
  if(id==='noisetier'){for(let n=0;n<6;n++){const cv=curveOf(axis(R(1.3,1.8),.35,n*PHI,1));stem(bag,cv,.011,.004,'#6a5a4a','#8a7a68',{sides:6,nodes:6,swell:.15});
      for(let i=0;i<14;i++){const p=cv.getPointAt(.2+.8*i/13);leafAt(sheet({L:.09,W:.07,pf:pKid,nu:8,nv:6,fold:.3,droop:.25,tooth:.3,nt:16,nl:7,c0:'#3f7a2a',c1:'#6aa040',cv:'#b0d088',cu:'#a8c488',seed:rnd()*9}),p.x,p.y,p.z,i*PHI+n,.35,0,1)}
      for(let k=0;k<4;k++){const p=cv.getPointAt(.55+.4*k/3),a=k*PHI;bag.petal.push(at(lathe([[.0005,0],[.004,.004],[.0045,.04],[.003,.06],[.0005,.065]],8,info=>{const m=.8+.4*noise3(info.x*300,info.y*300,info.z*300),c=mix3(rgb('#c8b850'),rgb('#e8d870'),clamp(info.y*14,0,1));return[c[0]*m,c[1]*m,c[2]*m]}),p.x+Math.sin(a)*.01,p.y,p.z+Math.cos(a)*.01,a,1,Math.PI))}}}
  if(id==='manioc'){const cv=curveOf(axis(1.8,.05,R(0,6),.5));stem(bag,cv,.014,.007,'#8a8070','#6a8a58',{sides:7,nodes:12,swell:.35});
    for(let i=0;i<10;i++){const t=.5+.5*i/9,p=cv.getPointAt(t),a=i*PHI,len=R(.28,.4),q=[p.x+Math.sin(a)*len,p.y+.08,p.z+Math.cos(a)*len];stem(bag,curveOf([[p.x,p.y,p.z],[(p.x+q[0])/2,p.y+.14,(p.z+q[2])/2],q]),.004,.0025,'#b0485a','#8a8a58',{sides:5,n:10});
      leafAt(palmate({L:.22,n:7,sp:2.6,sg:.14,mn:.1,cup:.5,crin:.2,c0:'#2f5a2a',c1:'#4f8a3a',cv:'#a8d890',cu:'#7fa868',seed:rnd()*9}),q[0],q[1],q[2],a,.1,0,1)}}
  if(id==='mimosa'){const fe=(x,y,z,a,e,sc)=>leafAt(sheet({L:.012*sc,W:.0022*sc,pf:pLin,nu:2,nv:1,fold:.3,c0:'#4a7a38',c1:'#7aa858',cu:'#a8c488',nl:1,mott:.1,seed:rnd()*9}),x,y,z,a,e,0,1),sub=(x,y,z,a,e,sc)=>pinnate(bag,x,y,z,a,e,.045*sc,3,.1,fe,'#6a5a48','#6a5a48');
    for(let n=0;n<4;n++){const cv=curveOf(axis(R(1.6,2.1),.3,n*1.6,1));stem(bag,cv,.011,.004,'#6a4a3a','#8a6a50',{sides:6,nodes:6,swell:.2});
      for(let i=0;i<8;i++){const p=cv.getPointAt(.25+.7*i/7);pinnate(bag,p.x,p.y,p.z,i*PHI+n,.4,.16,5,.3,sub,'#6a5a48','#6a5a48')}
      for(let k=0;k<6;k++){const p=cv.getPointAt(.7+.3*k/5),a=k*PHI;bag.petal.push(at(lathe([[.0005,0],[.005,.003],[.006,.025],[.0045,.05],[.0005,.055]],8,info=>{const m=.85+.3*noise3(info.x*400,info.y*400,info.z*400),c=mix3(rgb('#f8f0d0'),rgb('#fffaf0'),clamp(info.y*20,0,1));return[c[0]*m,c[1]*m,c[2]*m]}),p.x+Math.sin(a)*.02,p.y,p.z+Math.cos(a)*.02,a,1,.25))}}}
  if(id==='hordeum'){for(let i=0;i<26;i++){const a=i*PHI;leafAt(sheet({L:R(.18,.35),W:.008,pf:pLin,nu:8,nv:2,fold:.4,droop:.55,par:3,c0:'#7aa84a',c1:'#a8c868',cv:'#c8e090',cu:'#9ac070',under:.3,nl:1,seed:rnd()*9}),Math.sin(a)*.012,.005,Math.cos(a)*.012,a,R(.7,1.2),0,1)}
    for(let n=0;n<7;n++){const cv=curveOf(axis(R(.3,.5),.25,n*PHI,1));stem(bag,cv,.0012,.0008,'#8aa860','#c8c890',{sides:4,nodes:4,swell:.4});const c=cv.getPointAt(1);
      bag.petal.push(at(lathe([[.0005,0],[.007,.005],[.008,.04],[.004,.06],[.0005,.065]],6,info=>{const m=.85+.3*noise3(info.x*300,info.y*300,info.z*300),c2=mix3(rgb('#b8c070'),rgb('#d8cc88'),clamp(info.y*15,0,1));return[c2[0]*m,c2[1]*m,c2[2]*m]}),c.x,c.y-.01,c.z,0,1,.1));tuft(c.x,c.y+.03,c.z,40,'#d8d0a0','#b8b080',.045,1.3,.0003)}}

  // ---- troisième série : petites herbes, lichen, lianes (Plantes_1.json)
  const petals=(n,x,y,z,a0,L,W,c0,c1,cv,el=.5)=>{for(let q=0;q<n;q++)petalAt(sheet({L,W,pf:pPet,nu:3,nv:2,fold:.2,droop:.3,c0,c1,cv,nl:2}),x,y,z,a0+q*TAU/n,el,0,1)};
  const vine=(H,turns,r,c0,c1)=>{const pts=[];for(let i=0;i<=40;i++){const t=i/40,a=t*turns*TAU;pts.push([.03+Math.cos(a)*r,H*t,Math.sin(a)*r])}const cv=curveOf(pts);stem(bag,curveOf([[.03,0,0],[.03,H*1.02,0]]),.009,.008,'#8a7a62','#7a6a52',{sides:6,n:12});stem(bag,cv,.0045,.003,c0,c1,{sides:5,n:80});return cv};
  if(id==='arabette'){for(let i=0;i<8;i++){const a=i*PHI;leafAt(sheet({L:.035,W:.012,pf:pOv,nu:5,nv:3,fold:.3,droop:.25,tooth:.15,nt:6,c0:'#6a8a50',c1:'#9ab870',cv:'#c8dca8',cu:'#b0c898',nl:3,seed:rnd()*9}),Math.sin(a)*.008,.004,Math.cos(a)*.008,a,R(.1,.5),0,1)}
    for(let n=0;n<2;n++){const cv=curveOf(axis(R(.25,.35),.1,n*3,.6));stem(bag,cv,.0014,.0008,'#7a9a5a','#a8b870',{sides:4});
      for(let k=0;k<12;k++){const p=cv.getPointAt(.4+.6*k/11),a=k*PHI;petals(4,p.x+Math.sin(a)*.004,p.y,p.z+Math.cos(a)*.004,a,.0035,.0016,'#f8f8f2','#ffffff','#e0e8d0',.5);const cn=coneG(.0005,.014,'#7a9a5a','#a8b870');bag.petal.push(placed(cn,new THREE.Vector3(p.x,p.y-.01*(k>6),p.z),new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.sin(a)*.25,0,-Math.cos(a)*.25)),new THREE.Vector3(1,1,1)))}}}
  if(id==='paturin'){for(let i=0;i<20;i++){const a=i*PHI;leafAt(sheet({L:R(.08,.15),W:.004,pf:pLin,nu:6,nv:2,fold:.4,droop:.5,par:2,c0:'#8ac04a',c1:'#b8dc78',cv:'#d0eca0',cu:'#a8d070',under:.3,nl:1,seed:rnd()*9}),Math.sin(a)*.008,.003,Math.cos(a)*.008,a,R(.7,1.2),0,1)}
    for(let n=0;n<6;n++){const cv=curveOf(axis(R(.14,.22),.2,n*PHI,1));stem(bag,cv,.0008,.0005,'#9ac060','#c8d890',{sides:4});const c=cv.getPointAt(1);
      for(let b=0;b<5;b++){const a=b*PHI,q=[c.x+Math.sin(a)*.015,c.y-.01+b*.004,c.z+Math.cos(a)*.015];stem(bag,curveOf([[c.x,c.y-.015,c.z],q]),.0004,.0003,'#b8d080','#c8d890',{sides:3,n:3});for(let k=0;k<3;k++)bag.petal.push(at(dome(.0022,.0035,'#b8d070','#e0e8b0',rnd()*9),q[0]+R(-.003,.003),q[1]+k*.003,q[2]+R(-.003,.003)))}}}
  if(id==='mercuriale'){for(let n=0;n<3;n++){const cv=curveOf(axis(R(.3,.45),.2,n*2.1,1));stem(bag,cv,.0028,.0015,'#8aaa60','#a8c078',{sides:4,nodes:6,swell:.15});
      for(let i=0;i<8;i++){const t=.12+.8*i/7,p=cv.getPointAt(t);for(const sg of [0,Math.PI])leafAt(sheet({L:.05*(1-.35*t),W:.022,pf:pOvate,nu:6,nv:4,fold:.3,droop:.2,tooth:.25,nt:8,c0:'#4a8a38',c1:'#7ab858',cv:'#b8e090',cu:'#9ac878',nl:5,seed:rnd()*9}),p.x,p.y,p.z,i*1.57+sg+n,.4,0,1);
        if(i>3)for(let k=0;k<4;k++)bag.petal.push(at(dome(.0018,.002,'#a8c070','#c8d890',rnd()*9),p.x+R(-.006,.006),p.y+.004+k*.004,p.z+R(-.006,.006)))}}}
  if(id==='heliotrope'){for(let n=0;n<4;n++){const cv=curveOf(axis(R(.2,.32),.35,n*1.6,1));stem(bag,cv,.0022,.0012,'#a8b898','#c8d4b8',{sides:5});
      for(let i=0;i<7;i++){const p=cv.getPointAt(.15+.7*i/6);leafAt(sheet({L:.04,W:.02,pf:pOv,nu:6,nv:4,fold:.3,droop:.3,wave:.15,c0:'#8a9a78',c1:'#b8c6a8',cv:'#e0e8d4',cu:'#d4dcc8',nl:5,mott:.2,seed:rnd()*9}),p.x,p.y,p.z,i*PHI+n,.35,0,1)}
      for(let sp=0;sp<2;sp++){const p=cv.getPointAt(.8+.15*sp),ab=sp*3+n,g2=curveOf([[p.x,p.y,p.z],[p.x+Math.sin(ab)*.03,p.y+.03,p.z+Math.cos(ab)*.03],[p.x+Math.sin(ab)*.06,p.y+.035,p.z+Math.cos(ab)*.06],[p.x+Math.sin(ab)*.075,p.y+.015,p.z+Math.cos(ab)*.075]]);stem(bag,g2,.0012,.0007,'#a8b898','#c8d4b8',{sides:4,n:8});
        for(let k=0;k<12;k++){const q=g2.getPointAt(.1+.9*k/11);petals(5,q.x,q.y+.002,q.z,k,.0035,.0018,'#fafaf4','#ffffff','#e8e8d8',.3)}}}}
  if(id==='tribule'){for(let n=0;n<8;n++){const a=n*PHI,L=R(.25,.45),pts=[];for(let i=0;i<=6;i++){const t=i/6;pts.push([Math.sin(a)*L*t+Math.sin(t*5+n)*.02,.012+.01*Math.sin(t*3),Math.cos(a)*L*t+Math.cos(t*4+n)*.02])}const cv=curveOf(pts);stem(bag,cv,.0022,.0012,'#9a7a58','#8a9a68',{sides:4,n:14});
      for(let i=0;i<6;i++){const p=cv.getPointAt(.15+.8*i/5);pinnate(bag,p.x,p.y,p.z,a+1.4*(i%2?1:-1),.25,.05,5,.1,(x,y,z,aa,ee,sc)=>leafAt(sheet({L:.014*sc,W:.007*sc,pf:pOvate,nu:3,nv:2,fold:.3,c0:'#5a8a48',c1:'#8ab868',cu:'#a8c888',nl:2,seed:rnd()*9}),x,y,z,aa,ee,0,1),'#7a8a58','#6a7a50')}
      const p=cv.getPointAt(.4+.4*(n%3)/2);petals(5,p.x,p.y+.006,p.z,n,.008,.0045,'#f4d020','#f8e460','#d8a808',.45);if(n%2)bag.petal.push(at(dome(.0055,.005,'#8a6a40','#a88858',rnd()*9),p.x+.012,p.y,p.z+.008));}}
  if(id==='lycopode'){for(let n=0;n<6;n++){const a=n*PHI,H=R(.14,.22),lean=R(.1,.3),cv=curveOf(axis(H,lean,a,.5,8));stem(bag,cv,.0035,.0025,'#6a8a4a','#8aa860',{sides:5});
      for(let i=0;i<22;i++){const p=cv.getPointAt(.05+.95*i/21);tuft(p.x,p.y,p.z,6,'#4f7a3a','#8aa858',.011,1.25,.0011)}
      if(n%2){const c=cv.getPointAt(1);stem(bag,curveOf([[c.x,c.y,c.z],[c.x+.012,c.y+.03,c.z],[c.x+.022,c.y+.06,c.z+.01]]),.003,.002,'#6a8a4a','#8aa860',{sides:4,n:6});for(let i=0;i<10;i++)tuft(c.x+.01+i*.001,c.y+.01+i*.005,c.z+.004,5,'#5a8a3a','#9ab860',.009,1.2,.0011)}}}
  if(id==='lichen'){for(let i=0;i<16;i++){const a=i*PHI,r=R(.005,.03);leafAt(sheet({L:R(.025,.05),W:.0065,pf:pLin,nu:6,nv:2,fold:.6,droop:.3,wave:.5,wk:18,tooth:.4,nt:6,c0:'#6a5a34',c1:'#a89860',cv:'#c8b878',cu:'#8a7a48',under:.5,nl:1,mott:.25,seed:rnd()*9}),Math.sin(a)*r,.003,Math.cos(a)*r,a,R(.9,1.4),R(0,6),1)}
    for(let i=0;i<5;i++){const a=rnd()*TAU,r=R(.005,.025);bag.petal.push(at(dome(.003,.0015,'#5a3a24','#7a5030',rnd()*9),Math.sin(a)*r,.02,Math.cos(a)*r))}}
  if(id==='schisandra'||id==='vanille'){const sch=id==='schisandra',cv=vine(2.2,sch?5:4,sch?.022:.02,sch?'#7a5a48':'#6a9a5a',sch?'#6a8a4a':'#5a8a4a');
    for(let i=0;i<(sch?22:14);i++){const t=.1+.88*i/(sch?21:13),p=cv.getPointAt(t),a=i*PHI;
      leafAt(sch?sheet({L:.075,W:.04,pf:pOv,nu:8,nv:5,fold:.3,droop:.3,tooth:.1,nt:8,c0:'#3a7a30',c1:'#6aa84a',cv:'#b0d890',cu:'#8cb872',nl:5,seed:rnd()*9}):sheet({L:.16,W:.045,pf:pLanc,nu:10,nv:5,fold:.5,droop:.3,c0:'#2f6a2a',c1:'#4f9a3f',cv:'#a8d890',cu:'#7ab068',under:.3,nl:6,seed:rnd()*9}),p.x,p.y,p.z,a,.2,0,1)}
    if(sch){const cn=null;for(let k=0;k<6;k++){const p=cv.getPointAt(.35+.12*k),a=k*PHI,gx=p.x+Math.sin(a)*.03,gz=p.z+Math.cos(a)*.03;stem(bag,curveOf([[p.x,p.y,p.z],[gx,p.y-.03,gz],[gx,p.y-.13,gz]]),.0012,.0009,'#a85a48','#c86a58',{sides:4,n:8});for(let j=0;j<16;j++)bag.petal.push(at(dome(.0042,.0045,'#a81a1a','#e83a2a',rnd()*9),gx+R(-.006,.006),p.y-.03-.006*j,gz+R(-.006,.006)))}}
    else{for(let k=0;k<4;k++){const p=cv.getPointAt(.55+.1*k),a=k*PHI,px=p.x+Math.sin(a)*.03,pz=p.z+Math.cos(a)*.03;for(let q=0;q<5;q++)petalAt(sheet({L:.04,W:.008,pf:pLanc,nu:4,nv:2,fold:.4,droop:.2,c0:'#c8d070',c1:'#e8e898',cv:'#a8b850',nl:1}),px,p.y,pz,a+q*1.25,.45,0,1);petalAt(sheet({L:.035,W:.016,pf:pPet,nu:4,nv:3,fold:.5,droop:.3,c0:'#e8e8a8',c1:'#f8f4c0',cv:'#d8c850',nl:3}),px,p.y,pz,a,.05,0,1)}}}
  if(id==='saule'){const H=8.5,tr=curveOf([[0,0,0],[.15,H*.25,.05],[.05,H*.55,-.1],[-.1,H*.75,0]]);stem(bag,tr,.38,.14,'#4f4232','#6a5c48',{sides:9,n:24,nodes:9,swell:.12});
    for(let b=0;b<6;b++){const a=b*PHI+R(0,.5),p=tr.getPointAt(.55+.4*b/5),L=R(2.4,3.4),e=[p.x+Math.sin(a)*L,p.y+L*.55,p.z+Math.cos(a)*L],br=curveOf([[p.x,p.y,p.z],[p.x+Math.sin(a)*L*.4,p.y+L*.4,p.z+Math.cos(a)*L*.4],e]);stem(bag,br,.1,.03,'#4f4232','#7a6a4a',{sides:6,n:20});
      for(let k=0;k<34;k++){const q=br.getPointAt(.25+.75*k/33),d=R(2.5,5),ox=R(-.15,.15),oz=R(-.15,.15),wc=curveOf([[q.x,q.y,q.z],[q.x+Math.sin(a)*.2+ox,q.y-d*.3,q.z+Math.cos(a)*.2+oz],[q.x+Math.sin(a)*.3+ox,q.y-d*.7,q.z+Math.cos(a)*.3+oz],[q.x+Math.sin(a)*.3+ox,q.y-d,q.z+Math.cos(a)*.3+oz]]);
        stem(bag,wc,.007,.003,'#8a9a4a','#b0b860',{sides:4,n:6});
        for(let j=1;j<=9;j++){const p2=wc.getPointAt(j/10),sd=j%2?1:-1;leafAt(sheet({L:.1,W:.011,pf:pOvate,nu:3,nv:2,fold:.3,droop:.3,c0:'#7f9a3a',c1:'#a6b84a',cu:'#c4d08a',cv:'#d4dc8a',nl:4,seed:rnd()*9}),p2.x,p2.y,p2.z,a+sd*1.4,-.9,0,1)}}}}
  if(id==='nenuphar'){for(let i=0;i<5;i++){const a=i*1.3,r=i?R(.3,.7):0,rad=R(.18,.3),pad=lathe([[.0003,.002],[rad*.45,.003],[rad*.9,.007],[rad,.012],[rad*.96,.004]],28,info=>{const v=Math.pow(Math.abs(Math.sin(info.a*11)),12)*sstep(.08,.5,info.r/rad),m=.9+.2*noise3(info.x*20,info.y*20,info.z*20),c=mix3(mix3(rgb('#2f6a30'),rgb('#4f8a3a'),clamp(info.r/rad,0,1)),rgb('#b5c47a'),v*.5);return[c[0]*m,c[1]*m,c[2]*m]});bag.leaf.push(at(pad,Math.sin(a)*r,0,Math.cos(a)*r,R(0,6)))}
    for(let ring=0;ring<3;ring++){const n=ring?8:6;for(let q=0;q<n;q++)petalAt(sheet({L:.07-.012*ring,W:.018,pf:pPet,nu:5,nv:3,fold:.3,droop:.15,c0:'#f4d8e0',c1:'#fff6f6',cv:'#f0a0c0',nl:3,mott:.05}),.12,.012,.05,q*TAU/n+ring*.3,.35+ring*.35,0,1)}
    bag.petal.push(at(dome(.018,.008,'#e8b020','#f4d060',rnd()*9),.12,.014,.05))}
  if(id==='massette'){const sp=lathe([[.0003,0],[.018,.01],[.02,.1],[.02,.15],[.012,.19],[.0003,.2]],10,info=>{const m=.8+.4*noise3(info.x*300,info.y*300,info.z*300),c=mix3(rgb('#5a3a24'),rgb('#7a5030'),clamp(info.y*5,0,1));return[c[0]*m,c[1]*m,c[2]*m]});
    for(let i=0;i<6;i++){const x=R(-.25,.25),z=R(-.25,.25),h=R(1.1,1.6);stem(bag,curveOf([[x,0,z],[x+.03,h*.5,z],[x+.05,h,z]]),.007,.004,'#6a8a45','#8aa05a',{sides:5,n:8});
      if(i<4)bag.petal.push(at(sp,x+.05,h*.8,z));
      for(let b=0;b<2;b++)leafAt(sheet({L:R(1,1.4),W:.014,pf:pSword,nu:12,nv:3,fold:.5,droop:.8,par:5,c0:'#4a7a38',c1:'#7a9a50',cu:'#8fa868',cv:'#9ab870',under:.3,seed:rnd()*9}),x,0,z,rnd()*TAU,1.3,0,1)}}
}

export async function createHerbs(night,sssNode,own,tick){
  const nf=night.mul(.85).add(.15),wind=()=>{const hy=positionLocal.y.clamp(0,2);return positionLocal.add(vec3(sin(time.mul(1.3).add(positionLocal.x.mul(4)).add(positionLocal.z.mul(3))),0,cos(time.mul(1.1).add(positionLocal.z.mul(4)))).mul(hy.mul(hy).mul(.012)))};
  const sss=(thick,scale,em)=>{const m=new THREE.MeshSSSNodeMaterial({vertexColors:true,side:THREE.DoubleSide,roughness:.5});m.thicknessColorNode=vertexColor().mul(thick);m.thicknessAttenuationNode=sssNode.mul(.7);m.thicknessDistortionNode=float(.28);m.thicknessPowerNode=float(3);m.thicknessScaleNode=float(scale);m.thicknessAmbientNode=float(.06);m.emissiveNode=em;m.positionNode=wind();m.specularIntensity=.25;return m};
  const leafM=sss(1.6,1.2,vertexColor().mul(positionLocal.y.mul(.5).clamp(0,1).mul(.22).add(.05)).mul(nf)),petalM=sss(1.7,1.6,vertexColor().mul(.7).mul(nf)),stemM=new THREE.MeshStandardNodeMaterial({vertexColors:true,roughness:.7});stemM.positionNode=wind();
  own.push(leafM,petalM,stemM);
  const make=(id,seed)=>{const bag={leaf:[],stem:[],petal:[]};species(id,mulberry32(seed),bag);const g=new THREE.Group();
    for(const [k,m] of [['leaf',leafM],['stem',stemM],['petal',petalM]])if(bag[k].length)g.add(new THREE.Mesh(mergeGeometries(bag[k]),m));return g};
  const ids=['achillee','napel','lycoctonum','actee','thym','romarin','florence','dalmatie','pelargonium','viperine','rhubarbe','scille','aloes','marrube','rhodiole','sanguinaire','hydraste','piment','crotalaire','astragale','gelsemium','kalmia','noisetier','manioc','mimosa','hordeum','arabette','paturin','mercuriale','heliotrope','tribule','lycopode','lichen','schisandra','vanille','saule','nenuphar','massette'],out={};
  for(let i=0;i<ids.length;i++){const id=ids[i];out[id]=[make(id,100+id.length*13),make(id,900+id.length*29)];if(tick)await tick(id,i+1,ids.length)}
  return out}
