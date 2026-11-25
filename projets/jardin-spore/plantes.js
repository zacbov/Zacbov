function installerPlantes(fab){const PI=Math.PI,T=THREE;
const D=[
{id:'achillee',nom:'Achillée millefeuille',lat:'Achillea millefolium',fam:'Astéracées',mol:'Azulène',desc:'Vivace de 20 à 60 cm. Feuilles 2 à 3 fois pennatiséquées, très finement découpées ; corymbes denses de petits capitules blancs au cœur jaune.'},
{id:'napel',nom:'Aconit napel',lat:'Aconitum napellus',fam:'Renonculacées',mol:'Aconitine',desc:'Vivace de 50 à 150 cm, extrêmement toxique. Feuilles palmatiséquées vert foncé brillant ; grappe de fleurs bleu-violet en casque bombé.'},
{id:'lycoctonum',nom:'Aconit tue-loup',lat:'Aconitum lycoctonum',fam:'Renonculacées',mol:'Lycoctonine',desc:'Vivace de 50 à 150 cm, très toxique. Feuilles palmatipartites à 5–7 lobes incisés ; grappe de fleurs jaune soufre au casque long et étroit.'},
{id:'erable',nom:'Érable sycomore',lat:'Acer pseudoplatanus',fam:'Sapindacées',mol:'Tanins galliques',desc:'Grand arbre caduc à cime arrondie. Feuilles palmées à 5 lobes dentés ; grappes pendantes de petites fleurs jaune-verdâtre.'},
{id:'actee',nom:'Actée à grappes noires',lat:'Actaea racemosa',fam:'Renonculacées',mol:'Actéine',desc:'Vivace de 50 à 200 cm. Grandes feuilles bipinnées à folioles dentées ; longues grappes de fleurs blanc-crème à houppes d’étamines.'},
{id:'thym',nom:'Thym',lat:'Thymus vulgaris',fam:'Lamiacées',mol:'Thymol',desc:'Sous-arbrisseau de 10 à 30 cm. Minuscules feuilles grisâtres aux bords enroulés ; épis terminaux de petites fleurs rose pâle à lilas.'},
{id:'romarin',nom:'Romarin',lat:'Rosmarinus officinalis',fam:'Lamiacées',mol:'Acide rosmarinique',desc:'Arbuste persistant de 50 à 200 cm. Feuilles linéaires coriaces, vert foncé brillant ; petites fleurs bleu-violacé en grappes axillaires.'},
{id:'florence',nom:'Iris de Florence',lat:'Iris × florentina',fam:'Iridacées',mol:'Irone',desc:'Feuilles ensiformes glauques en éventail ; grandes fleurs blanc nacré très parfumées. Son rhizome fournit l’orris.'},
{id:'dalmatie',nom:'Iris de Dalmatie',lat:'Iris pallida',fam:'Iridacées',mol:'Irone',desc:'Feuilles ensiformes glauques en éventail ; grandes fleurs lilas-bleu pâle très parfumées, source de l’orris.'},
{id:'pelargonium',nom:'Pélargonium ‘Prince of Orange’',lat:'Pelargonium × ‘Prince of Orange’',fam:'Géraniacées',mol:'Limonène',desc:'Feuilles lobées vert vif à forte odeur d’orange ; ombelles de fleurs rose pâle à rose saumon, du printemps à l’automne.'}];

/* ---- géométrie : nappes minces à deux faces, placées par azimut / élévation */
const mk=(P,I)=>{const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(P,3));g.setIndex(I);g.computeVertexNormals();return g};
function grille(nu,nv,fn){const P=[],I=[];for(let s=0;s<2;s++){const b0=P.length/3;for(let i=0;i<=nu;i++)for(let j=0;j<=nv;j++)P.push(...fn(i/nu,j/nv,s));
 for(let i=0;i<nu;i++)for(let j=0;j<nv;j++){const a=b0+i*(nv+1)+j,b=a+1,c=a+nv+1,d=c+1;s?I.push(a,c,b,b,c,d):I.push(a,b,c,b,d,c)}}return mk(P,I)}
const pOv=u=>Math.pow(Math.sin(PI*Math.pow(u,.75)),.85),pLin=u=>Math.min(1,u*9,(1-u)*5),pOvate=u=>Math.pow(Math.sin(PI*Math.pow(u,.6)),.7);
const lame=(L,W,o)=>{o=o||{};const pf=o.pf||pOv,fo=o.fold===undefined?.18:o.fold,dr=o.droop===undefined?.14:o.droop,wv=o.wave||0,tw=o.twist||0,as=o.asym||0,th=o.tooth||0;
 return grille(o.nu||6,o.nv||4,(u,v,s)=>{const vv=v*2-1,p=pf(u),w=W*p*(1+th*((u*(o.nt||14))%1-.5)),a=tw*u,x=vv*w+as*w*u,z=Math.abs(vv)*w*fo-dr*L*u*u+wv*W*Math.sin(u*(o.wk||11)+vv*2)*Math.abs(vv)*p;
  return[x*Math.cos(a),u*L*(1-.1*dr*u),z+x*Math.sin(a)-s*.0012]})};
const palme=(L,n,sp,sg,mn,o)=>{o=o||{};const th=[];for(let k=0;k<n;k++)th.push((k/(n-1)-.5)*sp);
 return grille(5,44,(u,v,s)=>{const ph=Math.max(-1.5,Math.min(1.5,(v-.5)*(sp+sg*3.4)));let lb=0;for(const t of th)lb=Math.max(lb,Math.exp(-Math.pow((ph-t)/sg,2)));
  const r=u*L*(mn+(1-mn)*lb);return[Math.sin(ph)*r,Math.cos(ph)*r,-r*r*(o.cup===undefined?.8:o.cup)/L+(o.crin===undefined?.5:o.crin)*Math.sin(r*120+ph*9)*.003*u-s*.0012]})};
const _m=new T.Matrix4(),_e=new T.Euler(),_f=new T.Vector3(),_s=new T.Vector3(),_n=new T.Vector3(),_u=new T.Vector3(0,1,0),_q=new T.Quaternion();
function put(b,mat,g,x,y,z,az,el,roll){_f.set(Math.sin(az)*Math.cos(el),Math.sin(el),Math.cos(az)*Math.cos(el));_s.crossVectors(_f,_u);if(_s.lengthSq()<1e-6)_s.set(1,0,0);_s.normalize();_n.crossVectors(_s,_f);
 if(roll){_q.setFromAxisAngle(_f,roll);_s.applyQuaternion(_q);_n.applyQuaternion(_q)}_m.makeBasis(_s,_f,_n);_e.setFromRotationMatrix(_m,'XYZ');b.geo(mat,g,x,y,z,{rot:[_e.x,_e.y,_e.z]})}
const feuille=(b,mat,x,y,z,az,el,L,W,o,roll)=>{const g=lame(L,W,o);put(b,mat,g,x,y,z,az,el,roll);g.dispose()};
const palmee=(b,mat,x,y,z,az,el,L,n,sp,sg,mn,o)=>{const g=palme(L,n,sp,sg,mn,o);put(b,mat,g,x,y,z,az,el,0);g.dispose()};
const axe=(H,lean,az,w)=>t=>[Math.sin(az)*lean*H*t*t+Math.sin(t*6+az)*w*H*.015,H*t,Math.cos(az)*lean*H*t*t+Math.cos(t*5+az)*w*H*.015];
const tube=(b,mat,f,r0,r1,n,t0,t1)=>{const p=[];t0=t0||0;t1=t1===undefined?1:t1;for(let i=0;i<=n;i++)p.push(f(t0+(t1-t0)*i/n));b.tuyau(mat,p,[r0,r1],{coude:0,seg:5})};
function corolle(b,mat,cm,x,y,z,n,L,W,el,az0,cr){const g=lame(L,W,{nu:3,nv:1,fold:.25,droop:.15});for(let i=0;i<n;i++)put(b,mat,g,x,y,z,az0+i*2*PI/n,el,0);g.dispose();if(cm)b.sphere(cm,cr||L*.45,x,y+L*.1,z,{seg:5,seg2:3})}
function penne(b,mat,x,y,z,az,el,L,n,seg,dr){dr=dr||.25;const ca=Math.cos(el),f=u=>[x+Math.sin(az)*ca*L*u,y+Math.sin(el)*L*u-dr*L*u*u,z+Math.cos(az)*ca*L*u],p=[];
 for(let i=0;i<=5;i++)p.push(f(i/5));b.tuyau(mat,p,[.0022*(1+L*4),.0006],{coude:0,seg:4});
 for(let k=1;k<=n;k++){const u=.14+.76*k/n,q=f(u),s=.45+.55*Math.sin(PI*Math.min(1,u*.9));for(const sg of [-1,1])seg(q[0],q[1],q[2],az+sg*1.05,el-.08,s)}
 const e=f(1);seg(e[0],e[1],e[2],az,el-dr*1.2,.85)}
const reg=(id,fn)=>{const d=D.find(x=>x.id===id);fab.enregistrer('p_'+id,{titre:d.nom,groupe:'Plantes',surface:'bois',univers:[]},fn)};
const cire=(m,c,r)=>m('cire',{couleur:c,rugosite:r||.5,salete:0});

/* ---- achillée */
reg('achillee',(b,o,m)=>{const st=m('feuillage',{couleur:'#4a6b2e',rugosite:.6,echelle:3}),fe=m('feuillage',{couleur:'#2c5a26',couleur2:'#4f7a30',rugosite:.5,echelle:6}),bl=cire(m,'#f4f1e8'),jn=cire(m,'#e8b923',.6);
 const sub=(x,y,z,a,e,s)=>penne(b,fe,x,y,z,a,e,.035*s,3,(x2,y2,z2,a2,e2,s2)=>feuille(b,fe,x2,y2,z2,a2,e2,.014*s2,.0025*s2,{pf:pLin,nu:2,nv:1}),.1);
 for(let i=0;i<8;i++){const a=i*2.4;penne(b,fe,Math.sin(a)*.02,.02,Math.cos(a)*.02,a,.55,.17,9,sub,.3)}
 for(let n=0;n<3;n++){const H=b.hasard(.5,.65),f=axe(H,.12,n*2.1+b.hasard(0,1),1);tube(b,st,f,.0035,.002,10);
  for(let i=0;i<11;i++){const t=.07+.62*i/10,p=f(t);penne(b,fe,p[0],p[1],p[2],i*2.4+n,.35,.13*(1-.55*t),7,sub,.3)}
  const c=f(1);for(let k=0;k<38;k++){const a=k*2.4,r=.085*Math.sqrt(k/38),yy=c[1]+.02+.03*(1-Math.pow(r/.085,2)),px=c[0]+Math.sin(a)*r,pz=c[2]+Math.cos(a)*r;
   b.tuyau(st,[[c[0],c[1]-.01,c[2]],[px,yy-.004,pz]],.0012,{coude:0,seg:4});corolle(b,bl,jn,px,yy,pz,5,.0075,.0045,.35,a,.0028)}}});

/* ---- aconits */
function casque(b,mat,st,x,y,z,az,k,s){b.groupe([x,y,z],[0,az,0],c=>{c.tuyau(st,[[0,0,0],[0,.004*s,.014*s]],.0011,{coude:0,seg:4});
 c.sphere(mat,.011*s,0,.018*s,.02*s,{s:[.6,1.25*k,.85],seg:8,seg2:6,rot:[.5,0,0]});
 for(const sg of [-1,1])c.sphere(mat,.008*s,sg*.014*s,.012*s,.02*s,{s:[.3,1,1],seg:6,seg2:4})})}
function aconit(b,m,o){const st=m('feuillage',{couleur:'#3f6b2c',rugosite:.5,echelle:4}),fe=m('feuillage',{couleur:'#1f4a22',couleur2:'#2f6a2c',rugosite:.32,echelle:5}),fl=cire(m,o.fl,.42),f=axe(1.15,.08,b.hasard(0,6),1);
 tube(b,st,f,.009,.004,14);
 for(let i=0;i<5;i++){const a=i*1.26+b.hasard(0,.5),q=[Math.sin(a)*.14,.09,Math.cos(a)*.14];b.tuyau(st,[[0,0,0],[q[0]*.5,.09,q[2]*.5],q],.003,{coude:.03,seg:4});palmee(b,fe,q[0],q[1],q[2],a,.1,.17,7,2.6,o.sg,.16,{cup:1})}
 for(let i=0;i<11;i++){const t=.06+.5*i/10,p=f(t),a=i*2.4,L=.15*(1-.55*t)+.03,q=[p[0]+Math.sin(a)*.09*(1-t),p[1]+.03,p[2]+Math.cos(a)*.09*(1-t)];
  b.tuyau(st,[p,[(p[0]+q[0])/2,p[1]+.045,(p[2]+q[2])/2],q],.0025,{coude:.02,seg:4});palmee(b,fe,q[0],q[1],q[2],a,.12,L,7,2.5,o.sg,.16,{cup:.9})}
 for(let k=0;k<24;k++){const p=f(.54+.44*k/23);casque(b,fl,st,p[0],p[1],p[2],k*2.4,o.k,1-.4*k/23)}
 for(let s=0;s<2;s++){const p=f(.5+.08*s),ab=s*3.1+b.hasard(0,.6),g2=t=>[p[0]+Math.sin(ab)*.16*t,p[1]+.1+.28*t,p[2]+Math.cos(ab)*.16*t];tube(b,st,g2,.004,.002,6);
  for(let k=0;k<7;k++){const q=g2(.35+.65*k/6);casque(b,fl,st,q[0],q[1],q[2],k*2.4+s,o.k,.7*(1-.35*k/6))}}
 const e=f(1);b.sphere(fl,.008,e[0],e[1]+.004,e[2],{seg:6,seg2:4})}
reg('napel',(b,o,m)=>aconit(b,m,{fl:'#3b46cf',k:1,sg:.13}));
reg('lycoctonum',(b,o,m)=>aconit(b,m,{fl:'#e6d65a',k:2.3,sg:.2}));

/* ---- actée */
reg('actee',(b,o,m)=>{const st=m('feuillage',{couleur:'#3a5a2a',rugosite:.5,echelle:4}),fe=m('feuillage',{couleur:'#244a22',couleur2:'#3a6a2a',rugosite:.34,echelle:6}),fl=cire(m,'#f6f1de',.6);
 const fol=(x,y,z,a,e,s)=>feuille(b,fe,x,y,z,a,e,.07*s,.032*s,{pf:pOvate,nu:3,nv:2,fold:.3}),pin=(x,y,z,a,e,s)=>penne(b,fe,x,y,z,a,e,.17*s,3,fol,.15);
 for(let i=0;i<4;i++){const a=i*1.6;penne(b,fe,Math.sin(a)*.05,.03,Math.cos(a)*.05,a,.55,.5,3,pin,.35)}
 for(let n=0;n<2;n++){const f=axe(1.45-.2*n,.05,n*3.1,1);tube(b,st,f,.009,.004,14);
  for(let i=0;i<5;i++){const p=f(.08+.38*i/4);penne(b,fe,p[0],p[1],p[2],i*2.3+n,.15,.42,3,pin,.3)}
  for(let k=0;k<52;k++){const t=.7+.3*k/51,p=f(t),a=k*2.4,s=.5+.5*Math.sin(PI*Math.min(1,(1-k/37)*1.1+.1)),px=p[0]+Math.sin(a)*.03,pz=p[2]+Math.cos(a)*.03;
   b.tuyau(st,[p,[px,p[1]+.008,pz]],.0009,{coude:0,seg:4});for(let j=0;j<4;j++)b.sphere(fl,.0032*s,px+b.hasard(-.008,.008),p[1]+.01+b.hasard(0,.012),pz+b.hasard(-.008,.008),{seg:4,seg2:3})}}});

/* ---- thym et romarin */
function arbuste(b,m,o){const bo=m('ecorce',{couleur:o.bois,couleur3:'#6a7a3a',usure:.2,salete:.1}),fe=m('feuillage',{couleur:o.feu,couleur2:o.feu2,rugosite:o.rug,echelle:8}),fl=cire(m,o.fl);
 for(let i=0;i<o.nb;i++){const az=i*2.4+b.hasard(0,.5),h=o.H*b.hasard(.7,1),f=axe(h,b.hasard(.25,.6)*o.etale,az,1);tube(b,bo,f,o.r,o.r*.35,8);
  for(let k=0;k<o.nr;k++){const t=.3+.65*k/o.nr,p=f(t),a2=az+(k%2?1:-1)*b.hasard(.6,1.5)+k,l2=h*b.hasard(.22,.4)*(1.15-t*.5),e2=b.hasard(.2,.9),c2=Math.cos(e2),
   q=[p[0]+Math.sin(a2)*c2*l2,p[1]+Math.sin(e2)*l2,p[2]+Math.cos(a2)*c2*l2];b.tuyau(bo,[p,q],[o.r*.4,o.r*.2],{coude:0,seg:4});
   for(let j=1;j<=o.nl;j++){const u=j/o.nl;for(const sg of [-1,1])feuille(b,fe,p[0]+(q[0]-p[0])*u,p[1]+(q[1]-p[1])*u,p[2]+(q[2]-p[2])*u,a2+sg*1.2,e2*.4,o.fL,o.fW,{pf:o.pf,nu:2,nv:1,fold:.5})}
   for(let j=0;j<o.nfl;j++)b.sphere(fl,o.fr,q[0]+b.hasard(-o.sp,o.sp),q[1]+b.hasard(-o.sp,o.sp),q[2]+b.hasard(-o.sp,o.sp),{s:[1.2,.8,1],seg:5,seg2:3})}}}
reg('thym',(b,o,m)=>arbuste(b,m,{H:.22,nb:16,r:.0035,nr:7,nl:10,fL:.008,fW:.0036,bois:'#7a6a52',feu:'#8f9a7e',feu2:'#a9b296',rug:.8,fl:'#d6a0d8',fr:.0036,nfl:9,sp:.012,etale:2.6,pf:pOv}));
reg('romarin',(b,o,m)=>arbuste(b,m,{H:1,nb:12,r:.008,nr:8,nl:11,fL:.034,fW:.0026,bois:'#6a5a44',feu:'#2f5a3d',feu2:'#7f9a88',rug:.38,fl:'#7a8fe0',fr:.006,nfl:6,sp:.02,etale:.55,pf:pLin}));

/* ---- iris */
function iris(b,m,o){const g=m('feuillage',{couleur:'#5f8f78',couleur2:'#7aa690',rugosite:.45,echelle:3}),st=m('feuillage',{couleur:'#4f7d4a',rugosite:.5,echelle:4}),rh=m('ecorce',{couleur:'#8b7a5c',couleur3:'#6b7a40',usure:.3,salete:.2}),pe=cire(m,o.pe),ch=cire(m,o.ch),ba=cire(m,'#e8b520',.6);
 b.sphere(rh,.03,0,.02,0,{s:[2.8,.8,1.1],seg:8,seg2:6});b.sphere(rh,.022,.1,.02,.01,{s:[1.6,.8,1],seg:6,seg2:5});
 for(let i=0;i<10;i++){const sd=i/9*2-1,L=(.7-.22*Math.abs(sd))*b.hasard(.88,1.08);feuille(b,g,sd*.06,.03,b.hasard(-.01,.01),sd>=0?PI/2:-PI/2,1.3-.35*Math.abs(sd)+b.hasard(-.08,.08),L,.03,{pf:u=>Math.min(1,u*7)*Math.pow(1-u,.6),nu:10,nv:4,fold:.6,droop:.3,twist:b.hasard(-.4,.4)},PI/2)}
 const f=axe(.95,.07,.8,.6);tube(b,st,f,.008,.004,12);const c=f(1);
 for(const a of [.3,3.4])feuille(b,st,c[0],c[1]-.04,c[2],a,.9,.09,.014,{nu:4,nv:2,fold:.5});
 const sd=lame(.085,.04,{nu:6,nv:4,fold:-.2,droop:.25,wave:.12,wk:9}),fa=lame(.095,.048,{nu:7,nv:4,fold:.1,droop:.85,wave:.35,wk:12,pf:u=>Math.pow(Math.sin(PI*Math.pow(u,.65)),.7)}),sy=lame(.055,.02,{nu:5,nv:2,fold:.5,droop:.5});
 for(let i=0;i<3;i++){const a=i*2*PI/3;put(b,pe,sd,c[0],c[1],c[2],a,1.2,0);put(b,ch,fa,c[0],c[1],c[2],a+PI/3,-.15,0);put(b,pe,sy,c[0],c[1]+.005,c[2],a+PI/3,.5,0);
  b.tuyau(ba,[[c[0]+Math.sin(a+PI/3)*.02,c[1]+.004,c[2]+Math.cos(a+PI/3)*.02],[c[0]+Math.sin(a+PI/3)*.055,c[1]-.008,c[2]+Math.cos(a+PI/3)*.055]],.0034,{coude:0,seg:5})}
 sd.dispose();fa.dispose();sy.dispose()}
reg('florence',(b,o,m)=>iris(b,m,{pe:'#f8f6f0',ch:'#f2f0ea'}));
reg('dalmatie',(b,o,m)=>iris(b,m,{pe:'#a9b3ea',ch:'#8d98dc'}));

/* ---- pélargonium */
reg('pelargonium',(b,o,m)=>{const bo=m('ecorce',{couleur:'#6b5a3e',couleur3:'#5a7a35',usure:.1}),st=m('feuillage',{couleur:'#5a7f33',rugosite:.6,echelle:5}),fe=m('feuillage',{couleur:'#4f8f2a',couleur2:'#6fa83a',rugosite:.5,echelle:6}),pe=cire(m,'#f3a785'),pe2=cire(m,'#ea7f5c'),ce=cire(m,'#f6e3a0',.6);
 for(let n=0;n<3;n++){const H=b.hasard(.38,.5),f=axe(H,.35,n*2.1,1);tube(b,bo,f,.007,.005,8,0,.4);tube(b,st,f,.005,.003,8,.4,1);
  for(let i=0;i<16;i++){const t=.16+.8*i/15,p=f(t),a=i*2.4+n,q=[p[0]+Math.sin(a)*.07,p[1]+.025,p[2]+Math.cos(a)*.07];b.tuyau(st,[p,[(p[0]+q[0])/2,p[1]+.04,(p[2]+q[2])/2],q],.0016,{coude:.02,seg:4});
   palmee(b,fe,q[0],q[1],q[2],a,.15,.055,5,2.3,.5,.8,{cup:1.4,crin:1})}
  const c=f(1);b.tuyau(st,[f(.9),[c[0],c[1]+.06,c[2]]],.002,{coude:0,seg:4});const cy=c[1]+.06;
  for(let k=0;k<13;k++){const a=k*2.4,r=k?.05*Math.sqrt(k/12):0,px=c[0]+Math.sin(a)*r,pz=c[2]+Math.cos(a)*r,py=cy+.025-r*.2;b.tuyau(st,[[c[0],cy,c[2]],[px,py,pz]],.0009,{coude:0,seg:4});
   corolle(b,pe,ce,px,py,pz,5,.017,.012,.45,a,.003);corolle(b,pe2,null,px,py+.002,pz,2,.014,.009,.7,a,0)}}});

/* ---- érable */
reg('erable',(b,o,m)=>{const ec=m('ecorce',{couleur:'#6e665a',couleur3:'#4f6a2a'}),fe=m('feuillage',{couleur:'#2f5d27',couleur2:'#4d7a2e',rugosite:.55}),fl=cire(m,'#c9d36a',.6),H=5.2,R=.16,tr=axe(H*.55,.12,.6,1);
 b.tour(ec,[[R*1.9,0],[R*1.35,.15],[R*1.05,.5]],0,0,0,{seg:10,lisse:true});tube(b,ec,tr,R,R*.62,10);
 const top=tr(1),bl=[[top[0],top[1]+H*.1,top[2],H*.2]];
 for(let i=0;i<6;i++){const t=.5+.5*i/5,p=tr(t),a=i*2.4+b.hasard(-.3,.3),L=H*b.hasard(.2,.3),e=[p[0]+Math.sin(a)*L,p[1]+L*.7,p[2]+Math.cos(a)*L];
  b.tuyau(ec,[p,[p[0]+Math.sin(a)*L*.4,p[1]+L*.15,p[2]+Math.cos(a)*L*.4],e],[R*.4,R*.1],{coude:L*.3,seg:6});bl.push([e[0],e[1]+H*.04,e[2],H*.15])}
 for(const [x,y,z,r] of bl){fab.accessoires.blob(b,fe,r,x,y,z,{graine:b.entier(999),amp:.3,freq:1.9,s:[1.1,.8,1.1]});
  for(let j=0;j<8;j++){const a=b.hasard(0,2*PI),e=b.hasard(-.3,1),c=Math.cos(e),d=[Math.sin(a)*c,Math.sin(e),Math.cos(a)*c];
   palmee(b,fe,x+d[0]*r*.95,y+d[1]*r*.8,z+d[2]*r*.95,a,e*.5-.15,.16,5,2,.3,.3,{cup:1.2})}
  for(let j=0;j<2;j++){const a=b.hasard(0,2*PI),px=x+Math.sin(a)*r*.7,pz=z+Math.cos(a)*r*.7,py=y-r*.5;b.tuyau(ec,[[px,py+.08,pz],[px,py-.1,pz]],.003,{coude:0,seg:4});
   for(let k=0;k<9;k++)b.sphere(fl,.007,px+b.hasard(-.02,.02),py-.12*k/9+.06,pz+b.hasard(-.02,.02),{seg:4,seg2:3})}}
 b.collision(-R,0,-R,R,H*.5,R)});



/* ---- saule pleureur, nénuphars, massettes (importés du jardin WebGL) */
fab.noms.saule=['feuillage',{couleur:'#86a43a',couleur2:'#b9c75a'}];
/* ---- saule pleureur */
fab.enregistrer('saule',{titre:'Saule pleureur',groupe:'Arbres',surface:'bois',univers:[]},(b,o,m)=>{const ec=m('ecorce',{couleur:'#6b6049',couleur3:'#5a6a30'}),fe=m('saule'),H=8,tr=t=>[Math.sin(t*3)*.35*t,H*t,0];
 b.tuyau(ec,Array.from({length:9},(_,i)=>tr(i/8*.6)),[.38,.22],{coude:0,seg:7});
 const top=tr(.6);fab.accessoires.blob(b,fe,1.6,top[0],top[1]+.9,top[2],{graine:b.entier(99),amp:.25,freq:1.6,s:[1.2,.7,1.2]});
 for(let i=0;i<5;i++){const a=i*2.5+b.hasard(0,.6),p=tr(.45+i*.04),L=b.hasard(2.4,3.4),e=[p[0]+Math.sin(a)*L,p[1]+L*.6,p[2]+Math.cos(a)*L];
  b.tuyau(ec,[p,[(p[0]+e[0])/2,p[1]+L*.45,(p[2]+e[2])/2],e],[.12,.04],{coude:L*.25,seg:5});
  for(let k=0;k<28;k++){const t=.3+.7*k/27,x=p[0]+(e[0]-p[0])*t+b.hasard(-.2,.2),y=p[1]+(e[1]-p[1])*t,z=p[2]+(e[2]-p[2])*t+b.hasard(-.2,.2),d=b.hasard(2,4.5),
   w=[[x,y,z],[x+Math.sin(a)*.15,y-d*.3,z+Math.cos(a)*.15],[x+Math.sin(a)*.2,y-d*.7,z+Math.cos(a)*.2],[x+Math.sin(a)*.2,y-d,z+Math.cos(a)*.2]];
   b.tuyau(fe,w,[.006,.003],{coude:0,seg:3});for(let j=1;j<=9;j++){const q=w[Math.min(3,Math.floor(j/3))];b.sphere(fe,.05,q[0]+b.hasard(-.03,.03),y-d*j/9,q[2]+b.hasard(-.03,.03),{s:[.22,1.3,.05],seg:4,seg2:3})}}}});

/* ---- plantes d’eau : nénuphars et massettes */
fab.enregistrer('nenuphar',{titre:'Nénuphars',groupe:'Plantes',surface:'bois',univers:[]},(b,o,m)=>{const pa=m('feuillage',{couleur:'#3f7a35',couleur2:'#5e9a42',rugosite:.4,echelle:2}),fl=m('cire',{couleur:'#f4c9d6',rugosite:.45,salete:0});
 for(let i=0;i<5;i++){const a=i*1.3,r=i?b.hasard(.3,.7):0;b.sphere(pa,b.hasard(.18,.3),Math.sin(a)*r,.02,Math.cos(a)*r,{s:[1,.05,1],seg:10,seg2:4})}
 b.sphere(fl,.07,.1,.05,.05,{s:[1,.6,1],seg:8,seg2:4})});
fab.enregistrer('massette',{titre:'Massettes',groupe:'Plantes',surface:'bois',univers:[]},(b,o,m)=>{const st=m('feuillage',{couleur:'#5a7a3a',rugosite:.5,echelle:3}),br=m('cire',{couleur:'#5a3a24',rugosite:.8,salete:0});
 for(let i=0;i<6;i++){const x=b.hasard(-.25,.25),z=b.hasard(-.25,.25),h=b.hasard(1.1,1.6);b.tuyau(st,[[x,0,z],[x+.03,h*.5,z],[x+.05,h,z]],.006,{coude:0,seg:4});
  if(i<4)b.sphere(br,.045,x+.05,h*.85,z,{s:[.35,1.6,.35],seg:6,seg2:4});b.tuyau(st,[[x,0,z],[x-.2,h*.5,z+.1],[x-.45,h*.85,z+.15]],[.012,.003],{coude:0,seg:3})}});

return D;}
