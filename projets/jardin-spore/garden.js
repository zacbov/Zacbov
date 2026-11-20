import * as THREE from 'three/webgpu';
import { color, float, positionLocal, positionWorld, uniform, time, vec2, vec3, sin, cos, texture, normalMap } from 'three/tsl';
import { randomSeed } from './random.js';
import { createSpeciesMushrooms } from './especes.js';
import { Tree } from './eztree/index.js';   // EZ-Tree (MIT, Daniel Greenheck) : arbres procéduraux avec écorce et feuilles texturées
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { groundHeight, pondField, POND } from './terrain.js';

// Jardin des simples : 10 plantes générées (Fabrique), arbres et bassin, habillés avec les matériaux
// translucides (SSS) de Spore et éclairés par les mêmes lumières. 1 mètre réel = 9 unités de Spore (les champignons de Spore font ~10 unités par mètre : 1 unité ≈ 10 cm).
const S=9;
export async function createGarden(materials){
  globalThis.THREE=THREE;
  const night=uniform(1),nf=night.mul(.85).add(.15),lamps=[];   // nuit=1 : lueur pleine ; jour : lueur réduite
  const fab=FAB.creer(THREE),D=installerPlantes(fab),group=new THREE.Group(),cache=new Map(),own=[];group.name='Jardin des simples';
  const skin=m=>{const f=m.userData.fabFamille,k=f+m.color.getHexString();if(cache.has(k))return cache.get(k);let r;
    if(f==='ecorce')r=new THREE.MeshStandardNodeMaterial({color:m.color,roughness:.86});
    else{const petal=f!=='feuillage',base=m.color.clone();
      r=new THREE.MeshSSSNodeMaterial({color:base,roughness:.55,side:THREE.DoubleSide});
      // La lumière traverse feuilles et pétales avec leur propre teinte (jaune-vert pour les feuilles).
      r.thicknessColorNode=color(base.clone().lerp(new THREE.Color(petal?'#ffffff':'#d9ec7a'),petal?.25:.4).multiplyScalar(petal?1.5:1.6));
      r.thicknessAttenuationNode=materials.sss.mul(.7);r.thicknessDistortionNode=float(.28);r.thicknessPowerNode=float(3);
      const hy=positionLocal.y.clamp(0,2);   // vent : oscillation croissante avec la hauteur
      r.positionNode=positionLocal.add(vec3(sin(time.mul(1.3).add(positionLocal.x.mul(4)).add(positionLocal.z.mul(3))),0,cos(time.mul(1.1).add(positionLocal.z.mul(4)))).mul(hy.mul(hy).mul(.012)));
      r.thicknessScaleNode=float(petal?1.6:1.2);r.thicknessAmbientNode=float(.06);r.specularIntensity=.25;
      // Lueur : les fleurs rayonnent de leur couleur, les feuilles brillent de plus en plus vers la pointe (comme les pieds de champignon).
      r.emissiveNode=petal?color(base.clone().multiplyScalar(.7)).mul(nf):color(base.clone().lerp(new THREE.Color('#9dffb0'),.35)).mul(positionLocal.y.mul(.5).clamp(0,1).mul(.22).add(.05)).mul(nf)}
    cache.set(k,r);own.push(r);return r};
  const dress=o=>{o.traverse(c=>{if(c.isMesh){c.material=skin(c.material);c.castShadow=c.receiveShadow=false}});return o};
  const rnd=randomSeed(171717),put=(o,x,z,s)=>{const c=o.clone();c.position.set(x,groundHeight(x,z),z);c.rotation.y=rnd()*6.283;c.scale.setScalar(s);group.add(c);return c};
  const tpl={};D.forEach((d,i)=>{tpl[d.id]=dress(fab.objet('p_'+d.id,{graine:i*5+1,etat:.15}))});
  // Massifs : chaque espèce pousse en deux petits groupes, comme dans un vrai jardin.
  for(const id of ['actee','napel','lycoctonum','florence','dalmatie','achillee','romarin','thym','pelargonium'])
    for(let d=0;d<2;d++){let cx,cz,k=0;do{const a=rnd()*6.283,r=5.5+rnd()*8;cx=Math.cos(a)*r;cz=Math.sin(a)*r;k++}while(pondField(cx,cz)<.6&&k<60);
      for(let i=0;i<(id==='thym'?3:2);i++){const x=cx+(rnd()-.5)*3.2,z=cz+(rnd()-.5)*3.2;if(pondField(x,z)<.35)continue;put(tpl[id],x,z,S*(.8+rnd()*.5))}}
  // Grands arbres en toile de fond (EZ-Tree : chênes, frênes, trembles), bien plus hauts que tout le reste.
  const leafSSS=(m0)=>{const m=new THREE.MeshSSSNodeMaterial({map:m0.map,color:m0.color,alphaTest:m0.alphaTest,side:THREE.DoubleSide,roughness:.65});
    m.thicknessColorNode=color('#cfe86a');m.thicknessAttenuationNode=materials.sss.mul(.7);m.thicknessDistortionNode=float(.28);m.thicknessPowerNode=float(3);m.thicknessScaleNode=float(1.2);m.thicknessAmbientNode=float(.06);
    const hy=positionLocal.y.div(100).clamp(0,1);m.positionNode=positionLocal.add(vec3(sin(time.mul(1.1).add(positionLocal.y.mul(.15)).add(positionLocal.x.mul(.2))),float(0),cos(time.mul(.9).add(positionLocal.z.mul(.2)).add(positionLocal.y.mul(.1)))).mul(hy.mul(.9)));return m};
  const ezTree=(preset,seed,h)=>{const t=new Tree();t.loadPreset(preset);t.options.seed=seed;t.generate();const b=t.branchesMesh.material;
    t.branchesMesh.material=new THREE.MeshStandardNodeMaterial({map:b.map,normalMap:b.normalMap,roughnessMap:b.roughnessMap,aoMap:b.aoMap,color:b.color,roughness:1});
    t.leavesMesh.material=leafSSS(t.leavesMesh.material);own.push(t.branchesMesh.material,t.leavesMesh.material);
    t.userData.k=h/Math.max(1,new THREE.Box3().setFromObject(t).max.y);return t};
  const ezs=[ezTree('Oak Large',11,62),ezTree('Ash Large',23,56),ezTree('Aspen Large',37,52),ezTree('Oak Medium',5,46)];
  for(let i=0;i<6;i++){const a=i*1.05+.5,r=19+rnd()*5,x=Math.cos(a)*r,z=Math.sin(a)*r;if(pondField(x,z)<.8)continue;const t=ezs[i%4];put(t,x,z,t.userData.k*(.85+rnd()*.3))}
  put(tpl.erable,-15,13,S*.9);
  // Les six champignons de la page « Spore · microscope » (unités en cm : 1 cm = SM unités), au pied des massifs et des arbres.
  const esp=createSpeciesMushrooms(night),SM=.13;own.push(...esp.materials);
  const places={amanita:[[5.3,-3.6],[-6.2,5.1]],coprinus:[[-8.4,-6.6],[8.8,6.2]],morchella:[[-4.7,9.6]],inocybe:[[6.9,4.6],[-10.5,1.4]],ganoderma:[[-17.2,3.2],[16.4,-12.6]],lycoperdon:[[-3.3,-5.1],[9.7,-1.6]]};
  for(const k of Object.keys(places))for(const[x,z]of places[k])if(pondField(x,z)>.6)put(esp[k],x,z,SM*(k==='ganoderma'?1.6:1)*(.9+rnd()*.3));
  const saule=dress(fab.objet('saule',{graine:2,etat:.2}));
  for(const [dx,dz] of [[-1.5,-.9],[.2,-1.5],[1.5,.7]]){const x=POND.x+dx*POND.rx,z=POND.z+dz*POND.rz;if(pondField(x,z)>.4)put(saule,x,z,S*.5)}
  const nen=dress(fab.objet('nenuphar',{graine:1,etat:.1})),mas=dress(fab.objet('massette',{graine:1,etat:.1}));
  for(let i=0,n=0;n<18&&i<300;i++){const x=POND.x+(rnd()*2-1)*POND.rx,z=POND.z+(rnd()*2-1)*POND.rz;if(pondField(x,z)>-.4)continue;n++;const c=nen.clone();c.position.set(x,-.09,z);c.rotation.y=rnd()*6.283;c.scale.setScalar(S*.55*(.8+rnd()*.5));group.add(c)}
  for(let i=0,n=0;n<30&&i<600;i++){const a=rnd()*6.283,x=POND.x+Math.cos(a)*POND.rx*1.12,z=POND.z+Math.sin(a)*POND.rz*1.12,d=pondField(x,z);if(d<.05||d>.5)continue;n++;put(mas,x,z,S*(.7+rnd()*.4))}
  // Rochers au bord du bassin et fleurs de prairie (modèles GLB de l'app EZ-Tree ; le décodeur Draco est téléchargé depuis gstatic).
  const gl=new GLTFLoader(),dr=new DRACOLoader();dr.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');gl.setDRACOLoader(dr);
  const load=async f=>{try{const o=(await gl.loadAsync('./assets/'+f+'.glb')).scene;o.traverse(c=>{if(c.isMesh)own.push(c.material)});return o}catch(e){console.warn('GLB',f,e);return null}};
  const fit=(o,size)=>{const b=new THREE.Box3().setFromObject(o),s=size/Math.max(b.max.x-b.min.x,b.max.y-b.min.y,b.max.z-b.min.z);o.userData.k=s;o.userData.minY=b.min.y;return o};
  const rocks=(await Promise.all(['rock1','rock2','rock3'].map(load))).filter(Boolean).map(o=>fit(o,1));
  for(let i=0,n=0;rocks.length&&n<22&&i<600;i++){const a=rnd()*6.283,x=POND.x+Math.cos(a)*POND.rx*1.05,z=POND.z+Math.sin(a)*POND.rz*1.05,d=pondField(x,z);if(d<-.05||d>.35)continue;n++;
    const o=rocks[n%rocks.length],s=o.userData.k*(1.6+rnd()*3.4),c=put(o,x,z,s);c.position.y-=o.userData.minY*c.scale.x+.18*s}
  const fl=(await Promise.all(['flower_white','flower_blue','flower_yellow'].map(load))).filter(Boolean).map(o=>fit(o,3.2));
  for(let i=0;fl.length&&i<90;i++){const a=rnd()*6.283,r=4+rnd()*11,x=Math.cos(a)*r,z=Math.sin(a)*r;if(pondField(x,z)<.5)continue;const o=fl[i%fl.length];{const c=put(o,x,z,o.userData.k*(.7+rnd()*.7));c.position.y-=o.userData.minY*c.scale.x}}
  // Quelques lumières colorées dans le massif, pour que les plantes ne restent pas dans le noir autour des champignons.
  [['#ffc58a',.9,7,5],['#7dffd4',3.6,8,4.5],['#8fb4ff',5.3,9,5.5],['#ffa0c8',2.4,8,4]].forEach(([c,a,r,y])=>{const l=new THREE.PointLight(c,26,18,2);l.position.set(Math.cos(a)*r,y,Math.sin(a)*r);group.add(l);lamps.push(l)});
  const w=new THREE.Mesh(new THREE.CircleGeometry(1,64),new THREE.MeshPhysicalNodeMaterial({color:'#0b2a28',roughness:.04,metalness:0,ior:1.33,transparent:true,opacity:.92}));
  // Rides : deux couches de la carte de normales d'eau de Three.js qui défilent, pour des reflets qui bougent.
  const wn=new THREE.TextureLoader().load('./assets/waternormals.jpg');wn.wrapS=wn.wrapT=THREE.RepeatWrapping;
  w.material.normalNode=normalMap(texture(wn,positionWorld.xz.mul(.09).add(time.mul(vec2(.012,.018)))).add(texture(wn,positionWorld.xz.mul(.17).sub(time.mul(vec2(.016,.011))))).mul(.5),vec2(.45,.45));
  w.material.envMap=materials.ground.envMap;w.material.envMapIntensity=1.4;w.rotation.x=-Math.PI/2;w.position.set(POND.x,-.1,POND.z);w.scale.set(POND.rx*1.15,POND.rz*1.15,1);group.add(w);own.push(w.material);
  return {group,materials:own,night,lamps};
}
