import * as THREE from 'three/webgpu';
import { vertexColor } from 'three/tsl';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

// Les six espèces de la page « Spore · microscope » (Amanita muscaria, Coprinus comatus, Morchella esculenta,
// Inocybe asterospora, Ganoderma lucidum, Lycoperdon perlatum), reprises avec leur géométrie procédurale
// (unités : cm) et leurs couleurs. Seuls les matériaux changent : nœuds WebGPU, avec une lueur nocturne.
const TAU=Math.PI*2,clamp=(x,a,b)=>x<a?a:x>b?b:x,lerp=(a,b,t)=>a+(b-a)*t,sstep=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)};
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function hash3(i,j,k){let h=(Math.imul(i,374761393)+Math.imul(j,668265263)+Math.imul(k,1274126177))|0;h=Math.imul(h^(h>>>13),1274126177);h^=h>>>16;return(h>>>0)/4294967296}
function noise3(x,y,z){const xi=Math.floor(x),yi=Math.floor(y),zi=Math.floor(z),xf=x-xi,yf=y-yi,zf=z-zi,u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf),w=zf*zf*(3-2*zf);
  const a=hash3(xi,yi,zi),b=hash3(xi+1,yi,zi),c=hash3(xi,yi+1,zi),d=hash3(xi+1,yi+1,zi),e=hash3(xi,yi,zi+1),f=hash3(xi+1,yi,zi+1),g=hash3(xi,yi+1,zi+1),h=hash3(xi+1,yi+1,zi+1);
  return lerp(lerp(lerp(a,b,u),lerp(c,d,u),v),lerp(lerp(e,f,u),lerp(g,h,u),v),w)}
function fbm3(x,y,z,o=4){let s=0,a=.5,n=0;for(let i=0;i<o;i++){s+=a*noise3(x,y,z);n+=a;x*=2.03;y*=2.03;z*=2.03;a*=.5}return s/n}
const mix3=(a,b,t)=>[lerp(a[0],b[0],t),lerp(a[1],b[1],t),lerp(a[2],b[2],t)];
function ramp(st,t){if(t<=st[0][0])return st[0][1];for(let i=1;i<st.length;i++)if(t<=st[i][0])return mix3(st[i-1][1],st[i][1],sstep(0,1,(t-st[i-1][0])/(st[i][0]-st[i-1][0])));return st[st.length-1][1]}
const toLin=c=>Math.pow(clamp(c,0,1),2.2),gauss=r=>Math.sqrt(-2*Math.log(r()+1e-9))*Math.cos(TAU*r());

function finish(g){for(const k of Object.keys(g.attributes))if(k!=='position'&&k!=='color')g.deleteAttribute(k);g=mergeVertices(g,1e-4);g.computeVertexNormals();return g}
function colorize(g,fn){const P=g.attributes.position,n=P.count,col=new Float32Array(n*3);for(let i=0;i<n;i++){const c=fn(P.getX(i),P.getY(i),P.getZ(i));col[i*3]=toLin(c[0]);col[i*3+1]=toLin(c[1]);col[i*3+2]=toLin(c[2])}g.setAttribute('color',new THREE.BufferAttribute(col,3));return g}
function lathe(profile,segs,colorFn,dispFn){const g=new THREE.LatheGeometry(profile.map(p=>new THREE.Vector2(Math.max(p[0],.0004),p[1])),segs),P=g.attributes.position,N=g.attributes.normal,UV=g.attributes.uv,n=P.count,col=new Float32Array(n*3);
  for(let i=0;i<n;i++){const x=P.getX(i),y=P.getY(i),z=P.getZ(i),info={x,y,z,t:UV.getY(i),r:Math.hypot(x,z),a:Math.atan2(z,x)};
    if(dispFn){const d=dispFn(info);P.setXYZ(i,x+N.getX(i)*d,y+N.getY(i)*d,z+N.getZ(i)*d)}
    const c=colorFn(info);col[i*3]=toLin(c[0]);col[i*3+1]=toLin(c[1]);col[i*3+2]=toLin(c[2])}
  g.setAttribute('color',new THREE.BufferAttribute(col,3));return finish(g)}
const smoothProfile=(pts,n)=>new THREE.SplineCurve(pts.map(p=>new THREE.Vector2(p[0],p[1]))).getSpacedPoints(n).map(v=>[v.x,v.y]);
function gridGeo(rows,cols,fn){const nc=cols+1,pos=new Float32Array((rows+1)*nc*3),col=new Float32Array((rows+1)*nc*3),idx=[];
  for(let i=0;i<=rows;i++)for(let j=0;j<nc;j++){const o=fn(i,j),k=(i*nc+j)*3;pos[k]=o.p[0];pos[k+1]=o.p[1];pos[k+2]=o.p[2];col[k]=toLin(o.c[0]);col[k+1]=toLin(o.c[1]);col[k+2]=toLin(o.c[2])}
  for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){const a=i*nc+j,b=a+1,c=a+nc,d=c+1;idx.push(a,c,b,b,c,d)}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('color',new THREE.BufferAttribute(col,3));g.setIndex(idx);g.computeVertexNormals();return g}
function tubeGeo(curve,n,radial,radiusFn,colorFn){const fr=curve.computeFrenetFrames(n,false),nc=radial,pos=new Float32Array((n+1)*nc*3),col=new Float32Array((n+1)*nc*3),idx=[];
  for(let i=0;i<=n;i++){const t=i/n,p=curve.getPointAt(t),N=fr.normals[i],B=fr.binormals[i];for(let j=0;j<nc;j++){const a=j/nc*TAU,r=radiusFn(t,a,p),v=p.clone().addScaledVector(N,Math.cos(a)*r).addScaledVector(B,Math.sin(a)*r),c=colorFn(t,a,v),k=(i*nc+j)*3;
    pos[k]=v.x;pos[k+1]=v.y;pos[k+2]=v.z;col[k]=toLin(c[0]);col[k+1]=toLin(c[1]);col[k+2]=toLin(c[2])}}
  for(let i=0;i<n;i++)for(let j=0;j<nc;j++){const j1=(j+1)%nc,a=i*nc+j,b=i*nc+j1,c=(i+1)*nc+j,d=(i+1)*nc+j1;idx.push(a,c,b,b,c,d)}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('color',new THREE.BufferAttribute(col,3));g.setIndex(idx);g.computeVertexNormals();return g}
const alignQuat=(n,yaw)=>new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),n).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),yaw));
const placed=(geo,pos,q,s)=>{const g=geo.clone();g.applyMatrix4(new THREE.Matrix4().compose(pos,q,s));return g};
function blobGeo(rng,det=1,flat=.5,col=[.93,.9,.78],lift=.25){let g=new THREE.IcosahedronGeometry(1,det);g.deleteAttribute('normal');g.deleteAttribute('uv');g=mergeVertices(g);const P=g.attributes.position,s=rng()*100;
  for(let i=0;i<P.count;i++){const x=P.getX(i),y=P.getY(i),z=P.getZ(i),k=.72+.55*noise3(x*1.6+s,y*1.6,z*1.6);P.setXYZ(i,x*k,(y*k+lift)*flat,z*k)}
  colorize(g,(x,y)=>{const t=.9+.1*y;return[col[0]*t,col[1]*t,col[2]*t]});return finish(g)}
function gillsGeo(rng,o){const pos=[],col=[],idx=[],K=14;let vi=0;
  for(let i=0;i<o.n;i++){const a=i/o.n*TAU+(rng()-.5)*.4/o.n*TAU,lvl=i%4===0?0:(i%2===0?1:2),rs=o.r0+(o.r1-o.r0)*[0,.42,.7][lvl],ca=Math.cos(a),sa=Math.sin(a),base=vi;
    for(let k=0;k<=K;k++){const r=rs+(o.r1-rs)*k/K,top=o.yTop(r)+.02,d=o.depth(r)*sstep(0,.35,r-rs),w=.012*Math.sin(r*9+i);
      pos.push(r*ca-sa*w,top,r*sa+ca*w,r*ca-sa*w,top-d,r*sa+ca*w);const ct=o.col(0,r),cb=o.col(1,r);col.push(toLin(ct[0]),toLin(ct[1]),toLin(ct[2]),toLin(cb[0]),toLin(cb[1]),toLin(cb[2]));
      if(k>0){const b=base+2*k;idx.push(b-2,b-1,b+1,b-2,b+1,b)}vi+=2}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));g.setIndex(idx);g.computeVertexNormals();return g}

// ---- Amanita muscaria
const AM_RAMP=[[0,[.36,.03,.025]],[.3,[.6,.045,.03]],[.7,[.76,.09,.035]],[.9,[.84,.26,.06]],[1,[.87,.44,.13]]];
function amanita(rng,o,M){const grp=new THREE.Group(),R=o.R,cy=o.capY,yu=r=>cy+o.uD*(1-Math.pow(r/R,1.8))-o.inc*Math.pow(r/R,7),yt=r=>cy+.2+o.capH*Math.pow(Math.max(0,1-Math.pow(r/R,2.3)),.62)-o.inc*Math.pow(r/R,7);
  const prof=[],NU=14,NT=44;for(let i=0;i<=NU;i++){const r=.02+(R-.02)*i/NU;prof.push([r,yu(r)])}prof.push([R+.07,(yu(R)+yt(R))*.5]);for(let i=NT;i>=0;i--){const u=i/NT,r=R*(1-Math.pow(1-u,1.5));prof.push([r,yt(r)])}
  const tU=(NU+.5)/(prof.length-1),stri=(info,rr)=>rr>.76?(.5+.5*Math.sin(info.a*118+3*noise3(info.x*2,info.y*2,info.z*2)))*sstep(.76,.97,rr):0;
  grp.add(new THREE.Mesh(lathe(prof,128,info=>{if(info.t<tU)return[.93,.91,.84];const rr=info.r/R,c=ramp(AM_RAMP,rr),k=(.84+.3*fbm3(info.x*1.3,info.y*1.3,info.z*1.3,3))*(1-.22*stri(info,rr));return[c[0]*k,c[1]*k,c[2]*k]},
    info=>info.t<tU?0:.035*(fbm3(info.x*2.5,info.y*2.5,info.z*2.5,3)-.5)-.014*stri(info,info.r/R)),M.cap));
  const wv=[0,1,2,3].map(i=>blobGeo(rng,1,.42+.2*rng(),mix3([.94,.9,.76],[.8,.74,.58],i/3*.8),.1+.3*rng())),wl=[],pl=[];
  for(let a=0;a<4000&&pl.length<o.nW;a++){const rr=Math.pow(rng(),.7)*.94,r=rr*R,th=rng()*TAU,x=r*Math.cos(th),z=r*Math.sin(th),md=o.wD*(1-.55*rr);
    if(pl.some(p=>(p[0]-x)**2+(p[1]-z)**2<(md*.5+p[2]*.5)**2))continue;pl.push([x,z,md]);const e=.01,dy=(yt(r+e)-yt(Math.max(0,r-e)))/(2*e),n=new THREE.Vector3(-dy*Math.cos(th),1,-dy*Math.sin(th)).normalize(),s=md*.5*(.75+.5*rng());
    wl.push(placed(wv[(rng()*4)|0],new THREE.Vector3(x,yt(r)-.02,z),alignQuat(n,rng()*TAU),new THREE.Vector3(s,s*(.7+.5*rng()),s)))}
  const sr=y=>{const s=o.stemR*(1.18-.22*clamp(y/cy,0,1)),bt=(y-o.bY)/o.bRy,b=Math.abs(bt)<1?o.bulbR*Math.sqrt(1-bt*bt):0,k=.15;return k*Math.log(Math.exp(s/k)+Math.exp(b/k))};
  const y0=o.bY-o.bRy*.9,sp=[[.01,y0]];for(let i=0;i<=50;i++){const y=y0+(cy+.5-y0)*i/50;sp.push([sr(y),y])}sp.push([.01,cy+.5]);
  grp.add(new THREE.Mesh(lathe(sp,48,info=>{const f=.9+.12*noise3(info.x*7,info.y*.7,info.z*7);return mix3([.94*f,.92*f,.86*f],[.48,.38,.28],sstep(o.bY-.1,o.bY-.75,info.y)*.85)},info=>.012*(noise3(info.x*9,info.y*.8,info.z*9)-.5)),M.flesh));
  for(let ring=0;ring<3;ring++){const y=o.bY+o.bRy*(.35+ring*.2),r=sr(y)+.02,cnt=Math.round(TAU*r/.25);for(let i=0;i<cnt;i++){const th=(i+rng()*.6)/cnt*TAU,n=new THREE.Vector3(Math.cos(th),.55,Math.sin(th)).normalize(),s=.08+.06*rng();
    wl.push(placed(wv[(rng()*4)|0],new THREE.Vector3(Math.cos(th)*r,y,Math.sin(th)*r),alignQuat(n,rng()*TAU),new THREE.Vector3(s*1.4,s,s)))}}
  grp.add(new THREE.Mesh(mergeGeometries(wl),M.matte));
  grp.add(new THREE.Mesh(gillsGeo(rng,{n:Math.round(R*40),r0:o.stemR*1.1,r1:R-.06,yTop:yu,depth:r=>o.gD*Math.pow(Math.sin(Math.PI*clamp((r-o.stemR)/(R-o.stemR),0,1)),.5),col:e=>e?[.96,.94,.88]:[.9,.88,.8]}),M.matte));
  if(o.ring){const yA=cy-o.ring,s0=sr(yA),ap=smoothProfile([[s0-.02,yA],[s0+.22,yA-.12],[s0+.5,yA-.55],[s0+.66,yA-1.05],[s0+.6,yA-1.45]],20);ap.reverse();
    grp.add(new THREE.Mesh(lathe(ap,72,info=>mix3([.95,.94,.89],[.93,.86,.55],sstep(yA-.9,yA-1.32,info.y)*.8),info=>sstep(yA-.5,yA-1.32,info.y)*(.14*Math.sin(info.a*11+2.5*noise3(info.x*1.5,info.y,info.z*1.5))+.03*Math.sin(info.a*47))),M.flesh))}
  return grp}

// ---- Coprinus comatus
function coprinus(rng,o,M){const grp=new THREE.Group(),Hc=o.Hc,Rc=o.Rc,my=o.my,oR=s=>Rc*Math.pow(Math.max(0,1-Math.pow(s,4.2)),.42)*(1+o.flare*Math.pow(1-s,4));
  const prof=[[.01,my+Hc*.88]];for(let i=0;i<=24;i++){const s=.86*(1-i/24);prof.push([Math.max(o.stemR+.05,oR(s)-.18),my+s*Hc])}prof.push([oR(0)-.08,my-.07]);const tM=prof.length-1;for(let i=0;i<=60;i++){const s=i/60;prof.push([oR(s),my+s*Hc])}
  const tMargin=tM/(prof.length-1),ink=.06+.32*o.ink;
  grp.add(new THREE.Mesh(lathe(prof,96,info=>{const s=(info.y-my)/Hc;if(info.t<tMargin)return mix3([.2,.15,.16],[.05,.04,.05],sstep(.4,.05,s)*.5+o.ink*.5);
    const nn=noise3(info.x*3,info.y*3,info.z*3),f=.93+.09*noise3(info.x*9,info.y*1.2,info.z*9);let c=[.95*f,.94*f,.9*f];c=mix3(c,[.72,.56,.4],sstep(.86,.96,s));c=mix3(c,[.78,.6,.58],sstep(ink+.14,ink+.02,s+nn*.05));return mix3(c,[.05,.045,.05],sstep(ink+.02,ink-.04,s+nn*.05))},
    info=>info.t<tMargin?.04*Math.sin(info.a*80):.025*(fbm3(info.x*3,info.y*3,info.z*3,3)-.5)),M.flesh));
  const shV=[0,1].map(v=>{let g=new THREE.PlaneGeometry(1,1,3,4);g.translate(0,-.5,0);const P=g.attributes.position;for(let i=0;i<P.count;i++){const x=P.getX(i),y=P.getY(i),t=-y,jag=t>.8?.25*Math.sin(x*23+v*3)*(t-.8)/.2:0;P.setXYZ(i,x*(1-.7*t)+.1*t*t*(v-.5),y+jag*.4,.55*t*t*t+.06*Math.abs(x))}
    return finish(colorize(g,(x,y)=>mix3([.94,.92,.87],[.76,.65,.52],sstep(.55,1.1,-y))))});
  const sl=[],rows=Math.round(Hc*.72/.4);
  for(let r=0;r<rows;r++){const s=.15+.72*r/rows,rad=oR(s),cnt=Math.max(6,Math.round(TAU*rad/(.45+.15*s)*(.7+.5*rng())));
    for(let k=0;k<cnt;k++){const ss=s+(rng()-.5)*.035,th=(k+(r%2)*.5+(rng()-.5)*.9)/cnt*TAU,e=.005,rr=oR(ss),dr=(oR(ss+e)-oR(ss-e))/(2*e),T=new THREE.Vector3(-Math.sin(th),0,Math.cos(th)),U=new THREE.Vector3(dr*Math.cos(th),Hc,dr*Math.sin(th)).normalize(),N=new THREE.Vector3().crossVectors(U,T).normalize(),k2=1-.5*s,w=(.26+.16*rng())*k2,l=(.4+.3*rng())*k2;
      const m=new THREE.Matrix4().makeBasis(T.clone().multiplyScalar(w),U.clone().multiplyScalar(l),N.clone().multiplyScalar(l));m.setPosition(rr*Math.cos(th)+N.x*.01,my+ss*Hc,rr*Math.sin(th)+N.z*.01);m.multiply(new THREE.Matrix4().makeRotationZ((rng()-.5)*.5));const g=shV[(rng()*2)|0].clone();g.applyMatrix4(m);sl.push(g)}}
  grp.add(new THREE.Mesh(mergeGeometries(sl),M.flesh));
  const sp=[[.01,-.3]],top=my+Hc*.86;for(let i=0;i<=30;i++){const y=-.3+(top+.3)*i/30;sp.push([o.stemR*(1.05-.22*(y/top))+.22*Math.exp(-(((y-.1)/.5)**2)),y])}sp.push([.01,top]);
  grp.add(new THREE.Mesh(lathe(sp,40,info=>{const f=.92+.1*noise3(info.x*12,info.y*.6,info.z*12);return mix3([.95*f,.94*f,.91*f],[.5,.42,.32],sstep(.3,-.2,info.y))}),M.flesh));
  if(o.ringY){const tg=new THREE.TorusGeometry(o.stemR*.98+.06,.07,8,32);tg.rotateX(Math.PI/2);tg.translate(0,o.ringY,0);grp.add(new THREE.Mesh(finish(colorize(tg,(x,y)=>y<o.ringY?[.82,.74,.62]:[.95,.94,.9])),M.flesh))}
  return grp}

// ---- Morchella esculenta
function morel(rng,o,M){const grp=new THREE.Group(),hb=o.hb,Hh=o.Hh,Rm=o.Rm,rs=s=>Rm*Math.pow(Math.sin(Math.PI*(.16+.84*s)),.8),prof=[[.01,hb]];for(let i=0;i<=110;i++){const s=i/110;prof.push([rs(s),hb+s*Hh])}
  const seeds=[],rows=9;for(let r=0;r<rows;r++){const s=clamp((r+.5)/rows*.97+(rng()-.5)*.04,0,1),rad=rs(s),cnt=Math.max(3,Math.round(TAU*rad/1.15)),off=rng()*TAU;for(let k=0;k<cnt;k++){const ss=clamp(s+(rng()-.5)*.06,0,1),th=off+(k+(rng()-.5)*.5)/cnt*TAU,rr=rs(ss);seeds.push([rr*Math.sin(th),(hb+ss*Hh)*.55,rr*Math.cos(th)])}}
  grp.add(new THREE.Mesh(lathe(prof,144,info=>{const p=info.pit||0,f=.88+.2*noise3(info.x*5,info.y*5,info.z*5),c=ramp([[0,[.8,.74,.62]],[.25,[.66,.53,.33]],[.7,[.52,.37,.17]],[1,[.34,.22,.1]]],p);return[c[0]*f,c[1]*f,c[2]*f]},
    info=>{let f1=1e9,f2=1e9;const py=info.y*.55;for(const s of seeds){const d=Math.hypot(info.x-s[0],py-s[1],info.z-s[2]);if(d<f1){f2=f1;f1=d}else if(d<f2)f2=d}
      const s=(info.y-hb)/Hh,fade=sstep(0,.05,s)*sstep(1,.92,s),pit=sstep(.03,.42,f2-f1)*fade;info.pit=pit;return-o.depth*Math.pow(pit,.55)+.03*(fbm3(info.x*6,info.y*6,info.z*6,3)-.5)}),M.flesh));
  const sp=smoothProfile([[.01,-.4],[1.9,-.35],[2.05,.15],[1.85,.8],[1.62,1.8],[1.5,3],[1.47,hb+.3],[.01,hb+.35]],40);
  grp.add(new THREE.Mesh(lathe(sp,72,info=>{const f=.86+.18*noise3(info.x*14,info.y*14,info.z*14);return mix3([.92*f,.87*f,.75*f],[.45,.36,.26],sstep(.3,-.3,info.y))},info=>.1*Math.sin(info.a*6+2.5*noise3(info.x*.8,info.y*.8,info.z*.8))*sstep(2.4,.1,info.y)),M.flesh));
  return grp}

// ---- Inocybe asterospora
function inocybe(rng,o,M){const grp=new THREE.Group(),R=o.R,cy=o.capY,yu=r=>cy+o.uD*(1-r/R),yt=r=>cy+.1+o.capH*Math.pow(Math.max(0,1-r/R),1.05)+o.umbo*Math.exp(-((r/(.24*R))**2)),prof=[],NU=10,NT=48;
  for(let i=0;i<=NU;i++){const r=.02+(R-.02)*i/NU;prof.push([r,yu(r)])}prof.push([R+.04,(yu(R)+yt(R))*.5]);for(let i=NT;i>=0;i--){const u=i/NT,r=R*(1-Math.pow(1-u,1.4));prof.push([r,yt(r)])}
  const tU=(NU+.5)/(prof.length-1),seed=rng()*50,fib=info=>.6*noise3(Math.cos(info.a)*42+seed,Math.sin(info.a)*42,info.r*2.2)+.4*noise3(Math.cos(info.a)*110+seed,Math.sin(info.a)*110,info.r*4),
    crack=info=>sstep(.72,.76,noise3(Math.cos(info.a)*34+seed,Math.sin(info.a)*34,info.r*.3+5))*sstep(.3*R,.75*R,info.r);
  grp.add(new THREE.Mesh(lathe(prof,128,info=>{if(info.t<tU)return[.5,.42,.33];const rr=info.r/R,n=fib(info),cr=crack(info);let c=ramp([[0,[.3,.19,.11]],[.3,[.42,.29,.17]],[.75,[.56,.41,.25]],[1,[.62,.48,.32]]],rr);const k=.62+.62*n;c=[c[0]*k,c[1]*k,c[2]*k];return mix3(c,[.86,.78,.64],cr*.85)},
    info=>info.t<tU?0:-.03*crack(info)+.012*(fib(info)-.5)),M.flesh));
  grp.add(new THREE.Mesh(gillsGeo(rng,{n:Math.round(R*26),r0:o.stemR*1.2,r1:R-.04,yTop:yu,depth:r=>o.gD*Math.pow(Math.sin(Math.PI*clamp((r-o.stemR)/(R-o.stemR),0,1)),.6),col:e=>e?[.74,.68,.6]:[.5,.42,.33]}),M.matte));
  const s=o.stemR,top=cy+.4,sp=smoothProfile([[.01,-.25],[.5*s/.33,-.1],[.66*s/.33,.22],[.62*s/.33,.36],[.44*s/.33,.48],[s*1.08,.8],[s,top*.5],[s*.93,top],[.01,top]],40);
  grp.add(new THREE.Mesh(lathe(sp,40,info=>{const f=.9+.14*noise3(info.x*20,info.y*1.5,info.z*20);let c=[.8*f,.66*f,.56*f];c=mix3(c,[.92,.89,.84],sstep(top-1.4,top,info.y)*.8);c=mix3(c,[.93,.9,.84],sstep(.85,.3,info.y));return mix3(c,[.45,.36,.26],sstep(.1,-.2,info.y))}),M.flesh));
  return grp}

// ---- Ganoderma lucidum
function ganoderma(rng,o,M){const grp=new THREE.Group(),curve=new THREE.CatmullRomCurve3(o.stipe.map(p=>new THREE.Vector3(...p))),tip=curve.getPointAt(1);
  grp.add(new THREE.Mesh(tubeGeo(curve,40,24,t=>o.sR*(1+.5*Math.exp(-t*14)-.15*t),(t,a,p)=>{const f=.85+.2*noise3(p.x*4,p.y*4,p.z*4);return mix3([.22*f,.05*f,.03*f],[.38,.3,.22],sstep(.08,0,t))}),M.lacq));
  if(o.cap){const R0=o.R,phiM=2.25,e=.15,Rf=ph=>R0*Math.pow(Math.max(0,1-Math.pow(Math.abs(ph)/phiM,3)),.6)*(1+.05*Math.sin(3*ph+1)+.06*(noise3(ph*2,3,1)-.5)),
    sulc=(rho,Rp)=>(.13*Math.pow(.5+.5*Math.sin(rho*Rp*3.4+.8*Math.sin(rho*9)),3)+.03*(noise3(rho*4,Rp*.3,.5)-.5))*Math.sqrt(rho)*sstep(1,.85,rho),
    topH=(rho,Rp)=>e+1.15*Math.pow(Math.max(0,1-rho*rho),.7)*Math.pow(Rp/R0,.6)+sulc(rho,Rp),botH=(rho,Rp)=>-e-.38*(1-rho*rho)*Math.pow(Rp/R0,.6),
    capM=new THREE.Matrix4().makeRotationY(o.yaw).multiply(new THREE.Matrix4().makeRotationZ(o.tilt));capM.setPosition(tip.x,tip.y-.05,tip.z);
    const point=(s,ph)=>{const Rp=Rf(ph);if(s<.5){const u=s/.5;if(u<.88){const rho=u/.88;return[rho*Rp,topH(rho,Rp),Rp,rho]}const a=(u-.88)/.12*Math.PI/2;return[Rp+e*.85*Math.sin(a),e*Math.cos(a),Rp,1]}
      const u=(s-.5)/.5;if(u<.12){const a=Math.PI/2+u/.12*Math.PI/2;return[Rp+e*.85*Math.sin(a),e*Math.cos(a),Rp,1]}const rho=1-(u-.12)/.88;return[rho*Rp,botH(rho,Rp),Rp,rho]};
    const build=(s0,s1,colFn)=>gridGeo(60,120,(i,j)=>{const s=s0+(s1-s0)*i/60,ph=-phiM+2*phiM*j/120,[rr,h,Rp,rho]=point(s,ph),v=new THREE.Vector3(rr*Math.cos(ph),h,rr*Math.sin(ph)).applyMatrix4(capM);return{p:[v.x,v.y,v.z],c:colFn(rho,Rp,s,v)}});
    grp.add(new THREE.Mesh(build(0,.5,(rho,Rp,s,v)=>{const n=noise3(v.x*2,v.y*2,v.z*2);let c=ramp([[0,[.12,.022,.018]],[.45,[.26,.04,.028]],[.76,[.42,.07,.03]],[.88,[.66,.2,.05]],[.94,[.84,.48,.12]],[.985,[.93,.8,.48]]],rho+.025*(n-.5));
      const z=.72+.28*Math.sin(rho*Rp*3.4+.8*Math.sin(rho*9)+.6)*sstep(.95,.8,rho);if(s>.47)c=mix3(c,[.94,.86,.6],sstep(.485,.5,s));return[c[0]*z,c[1]*z,c[2]*z]}),M.lacq));
    grp.add(new THREE.Mesh(build(.5,1,(rho,Rp,s,v)=>{const f=.88+.16*noise3(v.x*30,v.y*30,v.z*30);return mix3([.9*f,.84*f,.68*f],[.62,.48,.32],sstep(.35,0,rho)*.7)}),M.matte))}
  else{const tg=new THREE.Vector3().subVectors(tip,curve.getPointAt(.9)).normalize(),tc=new THREE.CatmullRomCurve3([tip.clone().addScaledVector(tg,-.05),tip.clone().addScaledVector(tg,.6).add(new THREE.Vector3(.1,0,0)),tip.clone().addScaledVector(tg,1.15).add(new THREE.Vector3(.25,0,.1))]);
    grp.add(new THREE.Mesh(tubeGeo(tc,16,20,t=>o.sR*.86*Math.pow(Math.max(0,1-t*t),.45)+.02,t=>mix3([.85,.42,.08],[.98,.94,.78],sstep(.05,.75,t))),M.lacq))}
  return grp}

// ---- Lycoperdon perlatum
function lycoperdon(rng,o,M){const grp=new THREE.Group(),prof=smoothProfile([[.01,-.3],[.9,-.25],[1.15,.1],[1.05,.6],[1,1.1],[1.15,1.7],[1.55,2.3],[2,2.9],[2.22,3.5],[2.2,4.1],[1.95,4.7],[1.45,5.2],[.75,5.55],[.25,5.72],[.01,5.76]],60),old=o.old||0;
  grp.add(new THREE.Mesh(lathe(prof,72,info=>{const f=.9+.14*noise3(info.x*9,info.y*9,info.z*9);let c=mix3([.92,.89,.8],[.72,.6,.44],old*sstep(2,5,info.y));c=mix3(c,[.95,.93,.87],sstep(2.2,.8,info.y));c=mix3(c,[.45,.36,.26],sstep(.25,-.2,info.y));
    if(old){c=mix3(c,[.55,.45,.32],sstep(.62,.7,noise3(info.x*6,info.y*6,info.z*6))*sstep(2.6,4,info.y)*.7);c=mix3(c,[.2,.16,.12],sstep(5.5,5.7,info.y))}return[c[0]*f,c[1]*f,c[2]*f]},
    info=>.07*Math.sin(info.a*9+2*fbm3(info.x,info.y,info.z,2))*sstep(1.7,.4,info.y)+.03*(noise3(info.x*4,info.y*4,info.z*4)-.5)-(old?.18*sstep(5.45,5.7,info.y):0)),M.flesh));
  const segs=[];let tot=0;for(let i=1;i<prof.length;i++){const[r0,y0]=prof[i-1],[r1,y1]=prof[i];if(y0<2.2)continue;tot+=(r0+r1)*.5*Math.hypot(r1-r0,y1-y0);segs.push([tot,r0,y0,r1,y1])}
  const pick=()=>{const u=rng()*tot,s=segs.find(q=>q[0]>=u)||segs[segs.length-1],t=rng(),dr=s[3]-s[1],dy=s[4]-s[2],l=Math.hypot(dr,dy);return[lerp(s[1],s[3],t),lerp(s[2],s[4],t),dy/l,-dr/l]};
  const cone=finish(colorize((()=>{const g=new THREE.ConeGeometry(1,1,5,1);g.translate(0,.5,0);return g})(),(x,y)=>mix3([.94,.92,.84],[.62,.52,.4],sstep(.3,1,y)))),gr=finish(colorize(new THREE.IcosahedronGeometry(1,0),()=>[.92,.89,.8])),parts=[],nSp=Math.round(150*(1-old*.75)),nGr=Math.round(350*(1-old*.6));
  for(let i=0;i<nSp+nGr;i++){const[r,y,nr,ny]=pick(),th=rng()*TAU,n=new THREE.Vector3(nr*Math.cos(th),ny,nr*Math.sin(th)).normalize(),p=new THREE.Vector3(r*Math.cos(th),y,r*Math.sin(th)).addScaledVector(n,-.01);
    if(i<nSp){const s=.05+.03*rng(),h=.1+.1*rng();parts.push(placed(cone,p,alignQuat(n,rng()*TAU),new THREE.Vector3(s,h,s)))}else{const s=.025+.025*rng();parts.push(placed(gr,p,alignQuat(n,0),new THREE.Vector3(s,s*.8,s)))}}
  grp.add(new THREE.Mesh(mergeGeometries(parts),M.matte));return grp}

// ---- matériaux (nœuds WebGPU, couleurs de sommet ; lueur nocturne via l'uniforme `night`)
function materiaux(night){const glow=night.mul(.2).add(.02),mk=(rough,coat)=>{const m=new THREE.MeshPhysicalNodeMaterial({vertexColors:true,roughness:rough,clearcoat:coat||0,clearcoatRoughness:.4,side:THREE.DoubleSide});m.emissiveNode=vertexColor().mul(glow);return m};
  return{cap:mk(.4,.18),flesh:mk(.62),matte:mk(.92),lacq:mk(.3,1)}}

export function createSpeciesMushrooms(night){
  const M=materiaux(night),R=mulberry32,out={};
  const grp=(seed,fn)=>{const g=new THREE.Group();fn(R(seed),g);return g};
  const add=(g,f,x,z,ry,rx=0,rz=0)=>{f.position.set(x,0,z);f.rotation.set(rx,ry,rz);g.add(f)};
  out.amanita=grp(1000,(r,g)=>{add(g,amanita(r,{R:5,capY:9.2,capH:1.7,uD:.7,inc:.25,stemR:1,bulbR:1.95,bY:.55,bRy:1.25,nW:200,wD:.6,gD:.75,ring:1.6},M),0,0,.4,.04,-.05);add(g,amanita(r,{R:2.5,capY:2.4,capH:1.9,uD:1.1,inc:.95,stemR:.85,bulbR:1.5,bY:.4,bRy:.95,nW:140,wD:.42,gD:.4,ring:0},M),5.2,-2.6,1.4,.12,.1)});
  out.coprinus=grp(1077,(r,g)=>{add(g,coprinus(r,{Hc:9.5,Rc:2.3,my:5.4,stemR:.62,ink:.15,flare:0,ringY:2.4},M),0,0,.3,.03,-.03);add(g,coprinus(r,{Hc:6.4,Rc:1.95,my:2,stemR:.52,ink:0,flare:0,ringY:0},M),3.4,2.4,1.2,.08,.1);add(g,coprinus(r,{Hc:7.4,Rc:2.35,my:4.6,stemR:.56,ink:.85,flare:.4,ringY:1.2},M),-3.6,-1.6,2.2,-.06,.12)});
  out.morchella=grp(1154,(r,g)=>{add(g,morel(r,{hb:4.2,Hh:7.6,Rm:2.7,depth:.42},M),0,0,.5,0,-.04);const b=morel(r,{hb:4.2,Hh:7,Rm:2.5,depth:.42},M);b.scale.setScalar(.62);add(g,b,-4.4,-2.6,2,.05,.1)});
  out.inocybe=grp(1231,(r,g)=>{add(g,inocybe(r,{R:2,capY:5.3,capH:1.35,uD:.25,umbo:.38,stemR:.34,gD:.4},M),0,0,.2,.05,-.08);add(g,inocybe(r,{R:1.5,capY:3.6,capH:1.15,uD:.2,umbo:.32,stemR:.27,gD:.3},M),2.6,1.6,1,.12,.14);add(g,inocybe(r,{R:.95,capY:2,capH:.95,uD:.12,umbo:.25,stemR:.2,gD:.2},M),-1.8,2,2.3,-.1,.06)});
  out.ganoderma=grp(1308,(r,g)=>{add(g,ganoderma(r,{stipe:[[0,-.4,0],[.15,1.6,.1],[.6,3.4,0],[1.4,4.7,-.2]],sR:.62,cap:true,R:5,yaw:-.15,tilt:.1},M),0,0,0);add(g,ganoderma(r,{stipe:[[0,-.3,0],[-.2,1.3,.1],[-.1,2.4,.4],[.3,3.2,.8]],sR:.42,cap:false},M),-3.2,2.8,0)});
  out.lycoperdon=grp(1385,(r,g)=>{const p=(o,x,z,s,ry,rx,rz)=>{const f=lycoperdon(r,o,M);f.scale.setScalar(s);add(g,f,x,z,ry,rx,rz)};p({},0,0,1,0,.03,-.05);p({old:1},3.6,-1.6,.92,1,-.08,.1);p({},-2.9,1.9,.68,2,.12,.08);p({},1.7,3.1,.45,3,-.1,-.15)});
  out.materials=Object.values(M);return out}
