import * as THREE from 'three/webgpu';
import { color, float, positionLocal, positionWorld, uniform, time, vec2, vec3, sin, cos, texture, normalMap } from 'three/tsl';
import { randomSeed } from './random.js';
import { createSpeciesMushrooms } from './especes.js';
import { createHerbs } from './vegetal.js';
import { Tree } from './eztree/index.js';   // EZ-Tree (MIT, Daniel Greenheck) : arbres procéduraux avec écorce et feuilles texturées
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { groundHeight, pondField, POND } from './terrain.js';

// Jardin des simples : 10 plantes générées (Fabrique), arbres et bassin, habillés avec les matériaux
// translucides (SSS) de Spore et éclairés par les mêmes lumières. 1 mètre réel = 9 unités de Spore (les champignons de Spore font ~10 unités par mètre : 1 unité ≈ 10 cm).
const S=9;
export async function createGarden(materials,onStep){
  globalThis.THREE=THREE;
  const step=async(p,l)=>{if(onStep)await onStep(p,l)};   // progression 0..1 + rend la main au navigateur
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
  // Herbacées : géométrie à couleurs par sommet (vegetal.js) ; le sycomore reste un objet Fabrique.
  await step(0,'Plantes');const tpl=await createHerbs(night,materials.sss,own,(id,i,n)=>step(.02+.3*i/n,'Plantes : '+id));
  // Habitat compact et ordonné, vu depuis la caméra par défaut (qui regarde vers -z) : plantes hautes au fond,
  // prairie fleurie à gauche, bordure basse à droite, petites plantes sur les côtés, couloir central dégagé
  // devant le bosquet, bassin à droite avec ses iris. [espèce, centre x, centre z, nombre, étalement]
  const PARTERRES=[
    ['actee',-9,-9.5,3,2.2],['napel',-5,-10.5,3,2],['lycoctonum',-1.5,-10.5,3,2],['rhubarbe',2.5,-10.5,2,2.2],['manioc',-12.5,-6,2,1.8],['mimosa',-12,-10,2,2],['noisetier',-7.5,-12.5,2,2],['kalmia',-3.5,-12.5,2,2],['schisandra',-.5,-8.5,1,.5],['vanille',1.5,-8.5,1,.5],['piment',-10,-2.5,3,2],
    ['florence',5,-2,3,1.6],['dalmatie',6.5,-9.5,3,1.6],
    ['achillee',-9.5,-1,3,2],['viperine',-12,2,3,1.8],['marrube',-7,2.5,3,1.8],['astragale',-10,5,3,1.8],['crotalaire',-13,-2,3,1.5],['scille',-6.5,-4.5,2,1.2],['aloes',-12.5,6.5,2,1.2],['hordeum',-8,5.5,3,1.6],['romarin',-5.5,-7.5,3,2],
    ['pelargonium',5.5,3.5,3,1.5],['thym',8.5,5.5,4,1.6],['rhodiole',6,6.5,4,1.4],['sanguinaire',4.2,5.5,3,1.1],['hydraste',9,2.5,3,1.2],['mercuriale',7,8.5,5,1.5],
    ['lichen',-4.5,7,6,1.4],['tribule',-6.5,8,6,1.6],['arabette',-8.5,8.3,6,1.2],['lycopode',-3,5,5,1.2],['paturin',-10,7.5,6,1.6],['heliotrope',4,7.5,5,1.2]];
  for(const [id,cx,cz,n,sp] of PARTERRES)for(let i=0;i<n;i++){const x=cx+(rnd()-.5)*2*sp,z=cz+(rnd()-.5)*2*sp;if(pondField(x,z)<.5)continue;put(tpl[id][(rnd()*2)|0],x,z,S*(.85+rnd()*.3))}
  // Grands arbres en toile de fond (EZ-Tree : chênes, frênes, trembles), bien plus hauts que tout le reste.
  await step(.34,'Arbres');
  const leafSSS=(m0)=>{const m=new THREE.MeshSSSNodeMaterial({map:m0.map,color:m0.color,alphaTest:m0.alphaTest,side:THREE.DoubleSide,roughness:.65});
    m.thicknessColorNode=color('#cfe86a');m.thicknessAttenuationNode=materials.sss.mul(.7);m.thicknessDistortionNode=float(.28);m.thicknessPowerNode=float(3);m.thicknessScaleNode=float(1.2);m.thicknessAmbientNode=float(.06);
    const hy=positionLocal.y.div(100).clamp(0,1);m.positionNode=positionLocal.add(vec3(sin(time.mul(1.1).add(positionLocal.y.mul(.15)).add(positionLocal.x.mul(.2))),float(0),cos(time.mul(.9).add(positionLocal.z.mul(.2)).add(positionLocal.y.mul(.1)))).mul(hy.mul(.9)));return m};
  const ezTree=(preset,seed,h)=>{const t=new Tree();t.loadPreset(preset);t.options.seed=seed;t.generate();const b=t.branchesMesh.material;
    t.branchesMesh.material=new THREE.MeshStandardNodeMaterial({map:b.map,normalMap:b.normalMap,roughnessMap:b.roughnessMap,aoMap:b.aoMap,color:b.color,roughness:1});
    t.leavesMesh.material=leafSSS(t.leavesMesh.material);own.push(t.branchesMesh.material,t.leavesMesh.material);
    t.userData.k=h/Math.max(1,new THREE.Box3().setFromObject(t).max.y);return t};
  const ezs=[ezTree('Oak Large',11,62),ezTree('Ash Large',23,56),ezTree('Aspen Large',37,52),ezTree('Oak Medium',5,46)];
  [[-17,-5],[-13,-15],[-4,-19],[6,-19],[16,-12],[19,-2],[-19,6],[17,8]].forEach(([x,z],i)=>{if(pondField(x,z)<.8)return;const t=ezs[i%4];put(t,x,z,t.userData.k*(.85+rnd()*.3))});
  {const t=ezTree('Oak Medium',41,44);put(t,13,-17,t.userData.k)}   // sycomore : chêne moyen d'EZ-Tree (pas de préréglage d'érable)
  // Les six champignons de la page « Spore · microscope » (unités en cm : 1 cm = SM unités), au pied des massifs et des arbres.
  await step(.4,'Champignons');const esp=await createSpeciesMushrooms(night,(id,i,n)=>step(.4+.15*i/n,'Champignons : '+id)),SM=.22;own.push(...esp.materials);
  const places={amanita:[[-4.2,3.2],[4.4,4.2]],coprinus:[[-5.5,.2],[5.8,1.2]],morchella:[[-3,5.4],[3.6,6]],inocybe:[[-6.2,3.6],[2.3,5.2]],ganoderma:[[-6.5,-2.4],[7,-2.2]],lycoperdon:[[-1.6,4.4],[1.2,3.6],[5.2,-.6]]};
  for(const k of Object.keys(places))for(const[x,z]of places[k])if(pondField(x,z)>.6)put(esp[k],x,z,SM*(k==='ganoderma'?1.3:1)*(.9+rnd()*.3));
  const saule=tpl.saule[0];
  for(const [dx,dz] of [[-1.5,-.9],[.2,-1.5],[1.5,.7]]){const x=POND.x+dx*POND.rx,z=POND.z+dz*POND.rz;if(pondField(x,z)>.4)put(saule,x,z,S*.5)}
  const nen=tpl.nenuphar[0],mas=tpl.massette[0];
  for(let i=0,n=0;n<14&&i<400;i++){const x=POND.x+(rnd()*2-1)*POND.rx,z=POND.z+(rnd()*2-1)*POND.rz;if(pondField(x,z)>-.4)continue;n++;const c=nen.clone();c.position.set(x,-.09,z);c.rotation.y=rnd()*6.283;c.scale.setScalar(S*.55*(.8+rnd()*.5));group.add(c)}
  for(let i=0,n=0;n<26&&i<800;i++){const a=rnd()*6.283,x=POND.x+Math.cos(a)*POND.rx*1.12,z=POND.z+Math.sin(a)*POND.rz*1.12,d=pondField(x,z);if(d<.05||d>.5)continue;n++;put(mas,x,z,S*(.7+rnd()*.4))}
  // Rochers au bord du bassin et fleurs de prairie (modèles GLB de l'app EZ-Tree ; le décodeur Draco est téléchargé depuis gstatic).
  await step(.65,'Rochers et fleurs');
  const gl=new GLTFLoader(),dr=new DRACOLoader();dr.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');gl.setDRACOLoader(dr);
  const load=async f=>{try{const o=(await gl.loadAsync('./assets/'+f+'.glb')).scene;o.traverse(c=>{if(c.isMesh)own.push(c.material)});return o}catch(e){console.warn('GLB',f,e);return null}};
  const fit=(o,size)=>{const b=new THREE.Box3().setFromObject(o),s=size/Math.max(b.max.x-b.min.x,b.max.y-b.min.y,b.max.z-b.min.z);o.userData.k=s;o.userData.minY=b.min.y;return o};
  const rocks=(await Promise.all(['rock1','rock2','rock3'].map(load))).filter(Boolean).map(o=>fit(o,1));
  for(let i=0,n=0;rocks.length&&n<18&&i<800;i++){const a=rnd()*6.283,x=POND.x+Math.cos(a)*POND.rx*1.05,z=POND.z+Math.sin(a)*POND.rz*1.05,d=pondField(x,z);if(d<-.05||d>.35)continue;n++;
    const o=rocks[n%rocks.length],s=o.userData.k*(1.6+rnd()*3.4),c=put(o,x,z,s);c.position.y-=o.userData.minY*c.scale.x+.18*s}
  const fl=(await Promise.all(['flower_white','flower_blue','flower_yellow'].map(load))).filter(Boolean).map(o=>fit(o,3.2));
  for(let i=0;fl.length&&i<130;i++){const a=rnd()*6.283,r=4+rnd()*9,x=Math.cos(a)*r,z=Math.sin(a)*r;if(pondField(x,z)<.5||(z>6&&Math.abs(x)<3))continue;const o=fl[i%fl.length];{const c=put(o,x,z,o.userData.k*(.7+rnd()*.7));c.position.y-=o.userData.minY*c.scale.x}}
  await step(.95,'Lumières');
  // Quelques lumières colorées dans le massif, pour que les plantes ne restent pas dans le noir autour des champignons.
  [['#ffc58a',.9,8,5],['#7dffd4',3.6,9,4.5],['#8fb4ff',5.3,10,5.5],['#ffa0c8',2.4,9,4],['#ffc58a',2.1,14,5],['#7dffd4',4.3,14,4.5],['#8fb4ff',.2,14,5.5],['#ffa0c8',5.6,14,4]].forEach(([c,a,r,y])=>{const l=new THREE.PointLight(c,40,20,2);l.position.set(Math.cos(a)*r,y,Math.sin(a)*r);group.add(l);lamps.push(l)});
  // Eau : surface opaque et réfléchissante (un matériau transparent ne s'affichait pas avec le pipeline de Spore).
  const wm=new THREE.MeshStandardNodeMaterial({color:'#1c4f4c',roughness:.07,metalness:0,side:THREE.DoubleSide});wm.emissive=new THREE.Color('#06201e');
  wm.envMap=materials.ground.envMap;wm.envMapIntensity=1.6;
  const w=new THREE.Mesh(new THREE.CircleGeometry(1,64),wm);w.rotation.x=-Math.PI/2;w.position.set(POND.x,-.1,POND.z);w.scale.set(POND.rx*1.15,POND.rz*1.15,1);group.add(w);own.push(wm);
  await step(1,'Jardin prêt');
  return {group,materials:own,night,lamps};
}
