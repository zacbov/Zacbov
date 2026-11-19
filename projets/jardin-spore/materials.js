import * as THREE from 'three/webgpu';
import { TissueMaterial, createTissueOptics } from './tissue.js';
import { createReflectionEnvironment } from './reflection-environment.js';
import { createTissueNoise } from './tissue-noise.js';
import { ThinLeafMaterial } from './leaf-material.js';
import { createGroveLight } from './grove-light.js';
import { Fn, attribute, cameraPosition, color, float, mix, normalView, normalWorld, positionView, positionWorld, positionLocal, refract, uniform, vec3 } from 'three/tsl';

// Position-based procedural height needs screen-space derivatives. The stock
// bumpMap node offsets UVs, which does not differentiate a 3D noise field.
const organicBump=Fn(([height])=>{
  const sx=positionView.dFdx(),sy=positionView.dFdy(),n=normalView;
  const r1=sy.cross(n),r2=n.cross(sx),det=sx.dot(r1);
  const gradient=r1.mul(height.dFdx()).add(r2.mul(height.dFdy())).mul(det.sign());
  return n.mul(det.abs()).sub(gradient).normalize();
});

export function createMaterials() {
  const sss=uniform(2.5),glow=uniform(1);
  const optics=createTissueOptics(sss,glow);
  const tissueNoise=createTissueNoise();
  const p=positionWorld;
  const n=tissueNoise(p.mul(5.5)).mul(.5).add(.5);
  const fine=tissueNoise(p.mul(185)).mul(.5).add(.5);
  const pores=tissueNoise(p.mul(75)).smoothstep(.46,.78);
  const tissue=attribute('tissue','vec3');
  // Stable individual traits are shared by each mushroom's cap, fins and
  // stem. Pigment stays in the flesh rather than changing with the camera.
  const mushroomID=attribute('optical','vec4').w;
  const individual=mushroomID.mul(12.9898).sin().mul(43758.5453).fract();
  const moisture=mushroomID.mul(78.233).sin().mul(19341.37).fract();
  // Separate rose/copper individuals from the honey/ivory palette. The broad
  // stable trait follows the whole mushroom, including its transmitted flesh.
  const blush=mushroomID.mul(2.399963).sub(.2).sin().mul(.5).add(.5).smoothstep(.62,.96);
  const pigmentPatch=tissueNoise(p.mul(vec3(6,3,6)).add(individual.mul(19))).smoothstep(-.5,.5);
  const fleshTint=mix(color('#cbdbe0'),color('#e5c6ca'),pigmentPatch.mul(.7).add(individual.mul(.3)));
  function organic(name,tint,attenuation,isTissue=false) {
    const m=new (isTissue?TissueMaterial:THREE.MeshSSSNodeMaterial)({roughness:.68,color:tint});m.name=name;
    if(!isTissue){
      m.thicknessColorNode=color('#efd4a0');
      m.thicknessAttenuationNode=sss.mul(attenuation);
      m.thicknessDistortionNode=float(.28);
      m.thicknessPowerNode=float(3.5);
      m.thicknessScaleNode=float(1.9);
      m.thicknessAmbientNode=float(.025);
    }
    m.ior=1.38;m.specularIntensity=.25;
    return m;
  }
  const cap=organic('Terracotta and coral cap tissue','#a65c3b',.28,true);cap.side=THREE.DoubleSide;
  const rim=tissue.x.smoothstep(.78,1);
  const capSkin=mix(color('#55221e'),color('#a54e2d'),n);
  const capTint=mix(mix(color('#742c39'),color('#b26838'),individual),color('#c24e4a'),blush.mul(.72));
  const capPigment=mix(mix(capSkin,capTint,.35),mix(color('#d6a06c'),color('#ee9f85'),blush),.06).mul(mix(.72,1.12,pigmentPatch));
  cap.colorNode=mix(capPigment,mix(color('#ad653b'),color('#db9a56'),individual),rim.pow(3).mul(.55)).mul(mix(1,.88,pores)).mul(tissue.y.greaterThan(.5).select(.72,1)).mul(1.25);
  cap.roughnessNode=mix(.35,.51,moisture.mul(.7).add(n.mul(.3)));
  const surfaceWarp=tissueNoise(p.mul(vec3(11,18,11)).add(n.mul(4))).mul(.5).add(.5);
  const surfaceGrain=tissueNoise(p.mul(vec3(48,8,48)).add(vec3(surfaceWarp.mul(5),n.mul(3),surfaceWarp.mul(3)))).mul(.5).add(.5);
  cap.clearcoat=.22;cap.clearcoatRoughness=.27;cap.specularIntensity=.35;
  cap.normalNode=organicBump(fine.mul(.00065).add(tissueNoise(p.mul(vec3(18,5,18))).mul(.0015)).add(surfaceGrain.mul(.0012)));
  cap.transportDensityNode=n.mul(.20).add(.50);
  cap.transportScaleNode=float(3.3);
  // A pigmented skin over pale flesh keeps the crown dark while thin margins
  // transmit warm light. Reflectance and transmitted flesh have distinct tints.
  cap.transportColorNode=mix(mix(color('#9b552c'),color('#be6657'),blush),mix(color('#ffd087'),color('#ffb797'),blush),rim).mul(mix(.18,.85,rim));
  const gills=organic('Luminous amber orange folds','#e8a553',.48,true);gills.side=THREE.DoubleSide;
  const edge=tissue.x.smoothstep(.82,1);
  const membrane=mix(color('#ad4310'),color('#e98a29'),tissue.x);
  const lamella=mix(membrane,color('#ffd183'),tissue.z.pow(3).mul(.62).add(n.mul(.08)));
  const finTint=mix(mix(color('#e87c22'),color('#ffb64a'),individual.mul(.75).add(tissue.x.mul(.25))),color('#ed713b'),blush.mul(.65));
  gills.colorNode=mix(mix(lamella,finTint,.30),color('#f6b55d'),edge.mul(.14)).mul(mix(.88,1.08,pigmentPatch));
  gills.aoNode=tissue.z.mul(.55).add(.45);
  gills.roughness=.55;gills.specularIntensity=.18;
  gills.normalNode=organicBump(fine.mul(.0004));
  gills.transportDensityNode=mix(2.3,.40,tissue.z).mul(mix(.88,1.12,moisture));
  gills.transportScaleNode=mix(.7,4.1,tissue.z.pow(1.5));
  const stem=organic('Translucent ivory stipe','#e2d8c7',.13,true);stem.side=THREE.DoubleSide;
  const fibre=tissueNoise(p.mul(vec3(95,4,95))).mul(.5).add(.5);
  const strand=tissueNoise(p.mul(vec3(28,2.2,28)).add(n.mul(2))).mul(.5).add(.5);
  const fleck=tissueNoise(p.mul(vec3(90,170,90))).smoothstep(.35,.72);
  const base=tissue.x.smoothstep(0,.3);
  const stemIvory=mix(color('#d6c3aa'),mix(color('#eadfd1'),color('#fff4db'),fibre.mul(.25).add(.5)),base);
  const stemTint=mix(mix(color('#e7d6c2'),color('#f1cfac'),individual.mul(.8).add(strand.mul(.2))),color('#dc8e91'),blush.mul(.78));
  const contact=attribute('soilContact','float');
  const damp=contact.add(n.mul(.025)).smoothstep(-.005,.14).oneMinus();
  const dirt=contact.add(tissueNoise(p.mul(90)).mul(.016)).smoothstep(.015,.10).oneMinus()
    .mul(strand.mul(.25).add(.75));
  const ivory=mix(mix(stemIvory,stemTint,blush.mul(.25).add(.45)),fleshTint,pigmentPatch.mul(.13)).mul(mix(1,.94,fleck));
  stem.colorNode=mix(ivory.mul(mix(1,.76,damp)),mix(color('#302917'),color('#81714b'),fine),dirt.mul(.88));
  stem.roughnessNode=mix(mix(.38,.52,fleck),.86,dirt);stem.specularIntensity=.3;
  stem.normalNode=organicBump(fibre.mul(.00040).add(fine.mul(.00035)).add(fine.mul(damp).mul(.0012)));
  stem.transportDensityNode=strand.mul(2.2).add(n.mul(.4)).add(.35);
  stem.transportScaleNode=tissue.x.smoothstep(.1,.9).mul(.65).add(.35).mul(1.6);
  const moss=new ThinLeafMaterial({color:'#526e15',roughness:.55,ior:1.38});moss.name='Soft translucent moss leaves';
  moss.colorNode=attribute('pigment','vec3').mul(.95);
  moss.leafTransmissionNode=attribute('pigment','vec3').pow(.8).mul(attribute('plant','vec3').y).mul(sss.min(1)).mul(.65);
  moss.aoNode=attribute('plant','vec3').z.pow(1.1);
  moss.specularIntensity=.30;
  moss.clearcoat=0;
  const ground=new THREE.MeshStandardNodeMaterial({roughness:.97});
  const carpet=p.xz.length().smoothstep(2.3,3.0).oneMinus();
  ground.colorNode=mix(mix(color('#090604'),color('#211809'),n),mix(color('#062817'),color('#1c4b24'),n),carpet).mul(fine.mul(.55).add(.5));
  ground.normalNode=organicBump(tissueNoise(p.mul(95)).mul(.006).add(tissueNoise(p.mul(40)).mul(.006)));
  const bark=new THREE.MeshStandardNodeMaterial({roughness:.86});
  const wood=tissueNoise(positionLocal.mul(vec3(3,70,70))).mul(.5).add(.5);
  bark.colorNode=mix(color('#0d0a06'),color('#6b4727'),wood.pow(1.5)).mul(n.mul(.4).add(.6));
  bark.normalNode=organicBump(wood.mul(.023).add(fine.mul(.003)));
  const leaf=organic('Thin woodland leaves','#597721',.075);
  const leafUV=attribute('leafSurface','vec2');
  const midrib=leafUV.y.abs().smoothstep(.015,.05).oneMinus();
  const veins=leafUV.x.sub(leafUV.y.abs().mul(.22)).mul(65).sin().abs().smoothstep(.1,.2).oneMinus();
  leaf.colorNode=attribute('pigment','vec3').mul(fine.mul(.2).add(.8)).mul(veins.mul(.18).add(midrib.mul(.3)).add(1));
  leaf.normalNode=organicBump(veins.mul(.0007).add(midrib.mul(.0012)).add(fine.mul(.0003)));
  leaf.thicknessColorNode=attribute('pigment','vec3').pow(.65);
  leaf.roughness=.82;leaf.specularIntensity=.12;leaf.side=THREE.DoubleSide;
  const reflectionEnvironment=createReflectionEnvironment();
  for(const [material,intensity] of [[ground,.06],[bark,.04],[leaf,.10]]){material.envMap=reflectionEnvironment;material.envMapIntensity=intensity;}
  const groveEmission=createGroveLight(glow),groveLight=groveEmission.surface;
  optics.groveEmission=groveEmission;
  const mycelium=new THREE.MeshStandardNodeMaterial({roughness:.76});mycelium.name='Matte cream mycelial threads';
  mycelium.colorNode=attribute('pigment','vec3').mul(fine.mul(.12).add(.88));
  mycelium.lightMapNode=groveLight.mul(.55);mycelium.envMap=reflectionEnvironment;mycelium.envMapIntensity=.16;
  const substrate=new THREE.MeshStandardNodeMaterial({roughness:.92});substrate.name='Damp granular humus';
  substrate.colorNode=attribute('pigment','vec3').mul(fine.mul(.35).add(.65));
  substrate.lightMapNode=groveLight.mul(.4);substrate.envMap=reflectionEnvironment;substrate.envMapIntensity=.08;
  ground.lightMapNode=groveLight.mul(.20);
  for(const material of [cap,gills,stem]){
    material.groveIrradianceNode=material===stem?groveLight.mul(.55).mul(dirt.mul(.75).oneMinus()):groveLight;
    optics.apply(material);material.envMap=reflectionEnvironment;material.envMapIntensity=material===cap?.22:material===gills?.07:.10;
  }
  // A refracted lookup inside the flesh gives the translucent stipe internal
  // parallax. Broad and fine density strands sit below the smooth skin rather
  // than turning its exterior into bark-like grooves.
  const eye=cameraPosition.sub(p).normalize(),inside=refract(eye.negate(),normalWorld,1/1.38);
  const internal=p.add(inside.mul(attribute('optical','vec4').x.mul(.9)));
  const warp=tissueNoise(internal.mul(vec3(9,2,9)));
  const near=p.add(inside.mul(attribute('optical','vec4').x.mul(.35)));
  const fibres=tissueNoise(internal.mul(vec3(72,3.2,72)).add(warp.mul(2)))
    .add(tissueNoise(near.mul(vec3(65,2.5,65)))).mul(.25).add(.5);
  const innerColor=mix(mix(color('#ffc38b'),color('#fff0c6'),attribute('anatomy','vec3').x.smoothstep(-.6,.6)),color('#ffa095'),blush.mul(.65));
  stem.emissiveNode=stem.emissiveNode.add(innerColor.mul(fibres.pow(3)).mul(glow).mul(.15).mul(tissue.x.mul(.65).add(.35)));
  // Warm internal light fades down from the fin attachment into the stipe.
  const neckGlow=tissue.x.smoothstep(.58,1).pow(1.4);
  const neckTint=mix(color('#ffd28a'),color('#ffae88'),blush.mul(.55));
  stem.emissiveNode=stem.emissiveNode.add(neckTint.mul(neckGlow).mul(fibres.mul(.3).add(.7)).mul(glow).mul(1.8));
  // Measure above the local soil, not as a fraction of the mushroom's height.
  // A small stable variation keeps neighboring stems from sharing a hard band.
  const rootHeight=mix(.28,.36,moisture);
  const rootGlow=contact.smoothstep(.012,rootHeight).oneMinus().pow(1.4);
  const rootTint=mix(color('#c5ff72'),color('#65ffc5'),individual);
  stem.emissiveNode=stem.emissiveNode.add(rootTint.mul(rootGlow).mul(fibres.mul(.35).add(.65)).mul(glow).mul(.85));
  // Soil adhering to the outside absorbs the glow; exposed flesh stays luminous.
  stem.emissiveNode=stem.emissiveNode.mul(dirt.mul(.92).oneMinus());
  stem.volumeTransportNode=stem.volumeTransportNode.mul(dirt.mul(.90).oneMinus());
  const gillHeart=tissue.x.smoothstep(.16,.78).oneMinus().pow(1.6);
  gills.emissiveNode=gills.emissiveNode.add(mix(color('#ffb438'),color('#ff913b'),blush.mul(.55)).mul(gillHeart).mul(tissue.z.mul(.45).add(.55)).mul(glow).mul(4));
  moss.envMap=reflectionEnvironment;moss.envMapIntensity=.35;
  moss.groveIrradianceNode=groveLight;
  const growing=attribute('plant','vec3').x;
  moss.emissiveNode=groveLight.mul(color('#beff8c')).mul(growing.smoothstep(.72,.99).pow2()).mul(.82)
    .add(attribute('pigment','vec3').mul(glow).mul(growing.pow(4)).mul(1.8));
  // Broad leaves and woodland shoots have a softer cuticle than the tiny moss
  // tips. Share transmission and glow, without inheriting a polished finish.
  const foliage=moss.clone();foliage.name='Matte sorrel and violet foliage';
  foliage.leafTransmissionNode=moss.leafTransmissionNode;
  foliage.groveIrradianceNode=moss.groveIrradianceNode;
  foliage.roughness=.70;foliage.specularIntensity=.18;
  return {cap,gills,stem,moss,foliage,ground,bark,leaf,mycelium,substrate,sss,glow,optics};
}
