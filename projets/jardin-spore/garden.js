import * as THREE from 'three/webgpu';
import { color, float, positionLocal, uniform } from 'three/tsl';
import { randomSeed } from './random.js';
import { groundHeight, pondField, POND } from './terrain.js';

// Jardin des simples : 10 plantes générées (Fabrique), arbres et bassin, habillés avec les matériaux
// translucides (SSS) de Spore et éclairés par les mêmes lumières. 1 mètre réel = 2,2 unités de Spore.
const S=2.2;
export function createGarden(materials){
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
      r.thicknessScaleNode=float(petal?1.6:1.2);r.thicknessAmbientNode=float(.06);r.specularIntensity=.25;
      // Lueur : les fleurs rayonnent de leur couleur, les feuilles brillent de plus en plus vers la pointe (comme les pieds de champignon).
      r.emissiveNode=petal?color(base.clone().multiplyScalar(.7)).mul(nf):color(base.clone().lerp(new THREE.Color('#9dffb0'),.35)).mul(positionLocal.y.mul(.5).clamp(0,1).mul(.22).add(.05)).mul(nf)}
    cache.set(k,r);own.push(r);return r};
  const dress=o=>{o.traverse(c=>{if(c.isMesh){c.material=skin(c.material);c.castShadow=c.receiveShadow=false}});return o};
  const rnd=randomSeed(171717),put=(o,x,z,s)=>{const c=o.clone();c.position.set(x,groundHeight(x,z),z);c.rotation.y=rnd()*6.283;c.scale.setScalar(s);group.add(c)};
  const tpl={};D.forEach((d,i)=>{tpl[d.id]=dress(fab.objet('p_'+d.id,{graine:i*5+1,etat:.15}))});
  const ring=['actee','napel','lycoctonum','florence','dalmatie','achillee','romarin','thym','pelargonium'];
  for(let i=0,n=0;n<36&&i<400;i++){const a=rnd()*6.283,r=3.6+rnd()*3.6,x=Math.cos(a)*r,z=Math.sin(a)*r;if(pondField(x,z)<.4)continue;put(tpl[ring[n++%ring.length]],x,z,S*(.8+rnd()*.5))}
  for(let i=0;i<5;i++){const a=i*1.26+.4,x=Math.cos(a)*8.2,z=Math.sin(a)*8.2;if(pondField(x,z)<.8)continue;put(dress(fab.objet('arbre',{espece:'feuillu',hauteur:3.5,graine:i+3})),x,z,S)}
  put(tpl.erable,-6.6,6.2,S*.8);
  const saule=dress(fab.objet('saule',{graine:2,etat:.2}));
  for(const [x,z] of [[POND.x-3.7,POND.z-1.6],[POND.x+.8,POND.z-3.3],[POND.x+3.4,POND.z+2.7]])if(pondField(x,z)>.5)put(saule,x,z,S*.55);
  const nen=dress(fab.objet('nenuphar',{graine:1,etat:.1})),mas=dress(fab.objet('massette',{graine:1,etat:.1}));
  for(let i=0,n=0;n<26&&i<300;i++){const x=POND.x+(rnd()*2-1)*POND.rx,z=POND.z+(rnd()*2-1)*POND.rz;if(pondField(x,z)>-.4)continue;n++;const c=nen.clone();c.position.set(x,-.09,z);c.rotation.y=rnd()*6.283;c.scale.setScalar(S*(.8+rnd()*.5));group.add(c)}
  for(let i=0,n=0;n<24&&i<500;i++){const a=rnd()*6.283,x=POND.x+Math.cos(a)*POND.rx*1.12,z=POND.z+Math.sin(a)*POND.rz*1.12,d=pondField(x,z);if(d<.05||d>.5)continue;n++;put(mas,x,z,S*(.8+rnd()*.5))}
  // Quelques lumières dans l'anneau de plantes, pour qu'elles ne restent pas dans le noir autour des champignons.
  [['#ffc58a',.9,4.6,2.2],['#7dffd4',3.6,4.4,1.9],['#8fb4ff',5.3,4.8,2.4],['#ffa0c8',2.4,5.2,1.8]].forEach(([c,a,r,y])=>{const l=new THREE.PointLight(c,9,8,2);l.position.set(Math.cos(a)*r,y,Math.sin(a)*r);group.add(l);lamps.push(l)});
  const w=new THREE.Mesh(new THREE.CircleGeometry(1,64),new THREE.MeshPhysicalNodeMaterial({color:'#0b2a28',roughness:.04,metalness:0,ior:1.33,transparent:true,opacity:.92}));
  w.material.envMap=materials.ground.envMap;w.material.envMapIntensity=1.4;w.rotation.x=-Math.PI/2;w.position.set(POND.x,-.1,POND.z);w.scale.set(POND.rx*1.15,POND.rz*1.15,1);group.add(w);own.push(w.material);
  return {group,materials:own,night,lamps};
}
