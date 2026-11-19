import * as THREE from 'three/webgpu';
import { Fn, If, Loop, instancedArray, instanceIndex, vertexIndex, varying, uniformArray, hash, float, uint, uniform, texture, vec2, vec3, vec4, uv, cameraPosition, positionView } from 'three/tsl';
import { MUSHROOMS, CAP_WAVE_SCALE } from './mushrooms.js';
import { createCapGrid, createEmitterTable } from './spatial-grid.js';
import { createParticleCulling } from './particle-culling.js';
import { createCanopySurface } from './canopy-surface.js';
import { createAirField } from './air-field.js';

export function createSpores(maxCount=4194304,lighting=null) {
  const positions=instancedArray(maxCount,'vec4');
  const velocities=instancedArray(maxCount,'vec4');
  const clock=uniform(0),delta=uniform(1/60),wind=uniform(1),brightness=uniform(4);
  const diffusionStep=uniform(0,'uint');
  // Shared light uniforms keep particle illumination aligned with tissue SSS.
  const keyColor=lighting?.keyColor??uniform(new THREE.Color('#ffbd99'));
  const keyPower=lighting?.keyPower??uniform(20);
  const keyDirection=lighting?.keyDirection??uniform(new THREE.Vector3(.4,-.45,2.4).normalize());
  const bluePosition=lighting?.bluePosition??uniform(new THREE.Vector3(2,2.4,-1.6));
  const blueColor=lighting?.blueColor??uniform(new THREE.Color('#83d5ff'));
  const bluePower=lighting?.bluePower??uniform(10);
  const populationWeight=uniform(Math.min(1,786432/Math.min(maxCount,1310720)));
  const focus=uniform(4.7),aperture=uniform(.010),pixelWorld=uniform(.003);
  const culling=createParticleCulling(positions,maxCount,focus,aperture,(p,id,eye)=>{
    const o=optics(p.xyz,hash(id.add(113)),p.w,eye);
    const alpha=o.size.div(o.pixel).pow2().min(1).mul(.21).mul(o.fade).mul(o.defocus.oneMinus()).mul(velocities.element(id).w);
    return vec4(o.light,alpha);
  });
  const lightPosition=uniform(new THREE.Vector3(-.4,.65,-2.4));
  const emitterTable=createEmitterTable(MUSHROOMS),emitterIDs=uniformArray(emitterTable,'uint');
  const emitters=emitterTable.map(i=>MUSHROOMS[i]);
  const sources=uniformArray(emitters.map(m=>new THREE.Vector4(m.x+m.bend,m.h,m.z,m.r)));
  const emitterSeeds=uniformArray(emitters.map(m=>m.seed));
  const obstacles=uniformArray(MUSHROOMS.map(m=>new THREE.Vector4(m.x+m.bend,m.h,m.z,m.r)));
  const obstacleStipes=uniformArray(MUSHROOMS.map(m=>new THREE.Vector2(m.seed,m.bend)));
  const canopy=createCanopySurface(MUSHROOMS),surface=texture(canopy.map);
  const boundsAt=(cap,offset,index)=>surface.sample(offset.div(vec2(cap.w,cap.w.mul(.91))).div(canopy.extent).add(.5)).depth(index);
  const grid=createCapGrid(MUSHROOMS);
  const cellCounts=uniformArray(grid.counts,'uint');
  const packed=[];
  for(let i=0;i<grid.indices.length;i+=4)packed.push(new THREE.Vector4(...grid.indices.slice(i,i+4)));
  const cellIndices=uniformArray(packed);
  const airField=createAirField({clock,wind,obstacles,stipes:obstacleStipes,boundsAt});
  let count=Math.min(maxCount,1310720);
  const compute=Fn(()=>{
    const index=instanceIndex, p=positions.element(index),v=velocities.element(index);
    const seed=hash(index.add(113)).toVar();
    const sourceIndex=index.mod(emitters.length);
    const m=sources.element(sourceIndex),shapeSeed=emitterSeeds.element(sourceIndex);
    const emit=Fn(()=>{
      // Fresh independent samples on every birth, including rapid collision
      // respawns. Quantized birth times previously repeated the same positions.
      const birth=index.bitXor(diffusionStep.mul(uint(747796405)));
      const r=hash(birth).mul(.80).add(.06).sqrt();
      const a=hash(birth.bitXor(uint(2891336453))).mul(Math.PI*2);
      const wave=a.mul(5).add(shapeSeed).sin().mul(.065).add(a.mul(9).add(shapeSeed.mul(.3)).sin().mul(.023)).add(a.mul(3).add(shapeSeed.mul(.8)).sin().mul(.092)).mul(CAP_WAVE_SCALE);
      const radius=m.w.mul(wave.mul(r.pow2()).add(1));
      const x=a.cos().mul(r).mul(radius),z=a.sin().mul(r).mul(radius).mul(.91);
      const bounds=boundsAt(m,vec2(x,z),emitterIDs.element(sourceIndex));
      const y=m.y.add(bounds.y).sub(.004);
      return vec3(m.x.add(x),y,m.z.add(z));
    });
    const production=hash(index.add(1987)).mul(.35).add(.65);
    // Independent of visible point size: bright motes must not all trace the
    // same settling-speed layer through the cloud.
    const settle=hash(index.add(857)).mul(.042).add(.028);
    const disperse=(step,salt)=>{
      const key=index.bitXor(salt.mul(uint(1597334677)));
      const random=vec3(hash(key),hash(key.bitXor(uint(3812015801))),hash(key.bitXor(uint(958282119)))).sub(.5);
      // Unresolved turbulent diffusion for all spores, with constant variance
      // per second. No paths, source phases or age-dependent steering.
      return random.mul(step.mul(.00007*12).sqrt()).mul(wind);
    };
    If(p.w.equal(0),()=>{
      p.assign(vec4(emit(),.001));
      v.assign(vec4(0,settle.negate(),0,production));
      // Short prefill avoids integrating a lifetime through a frozen field.
      const age=hash(index.add(671)).mul(5).toVar();
      const step=age.div(24);
      Loop(24,({i})=>{
        const air=airField.sample(p.xyz);
        p.xyz.addAssign(air.sub(vec3(0,settle,0)).mul(step)).addAssign(disperse(step,uint(i).add(311)));
      });
      p.w.addAssign(age);
    });
    const previous=p.xyz.toVar();
    const cell=p.xz.sub(grid.origin).div(grid.cellSize).floor().clamp(0,grid.size-1).toUVec2();
    const cellID=cell.y.mul(grid.size).add(cell.x),cellCount=cellCounts.element(cellID);
    const neighbor=i=>cellIndices.element(cellID.mul(grid.stride/4).add(i.div(uint(4)))).element(i.mod(uint(4))).toUint();
    // Every particle samples the same world-space flow. Emission only sets a
    // birthplace; neither source, age nor identity influences the air velocity.
    const flow=airField.sample(p.xyz);
    const target=flow.sub(vec3(0,settle,0)).toVar();
    // Stokes-like drag gives each spore a short response time and a distinct
    // settling speed. Fixed time-based integration is independent of FPS.
    v.xyz.addAssign(target.sub(v.xyz).mul(delta.mul(-9).exp().oneMinus()));
    p.xyz.addAssign(v.xyz.mul(delta)).addAssign(disperse(delta,diffusionStep));p.w.addAssign(delta);
    const impact=float(0).toVar();
    Loop({start:uint(0),end:cellCount,type:'uint'},({i})=>{
      const capIndex=neighbor(i);
      const cap=obstacles.element(capIndex),offset=p.xz.sub(cap.xz);
      const bounds=boundsAt(cap,offset,capIndex),radial=bounds.w;
      // A deposited spore leaves the airborne population. Projecting impacts
      // back onto the exact stem surface used to accumulate a bright collar.
      const stemShape=obstacleStipes.element(capIndex);
      const height=p.y.sub(.015).div(cap.y.sub(cap.w.mul(.1))).clamp();
      const stalk=vec2(cap.x.sub(stemShape.y).add(stemShape.y.mul(height.pow2())).add(height.mul(Math.PI).sin().mul(.027)),cap.z.add(height.mul(Math.PI).sin().mul(.035)));
      const stemRadius=cap.w.mul(float(.155).add(height.mul(-9).exp().mul(.070)).add(height.mul(5).add(stemShape.x).sin().mul(.018)).add(height.pow(8).mul(.080)));
      If(p.y.lessThan(cap.y).and(p.xz.sub(stalk).length().lessThan(stemRadius.add(.002))),()=>{impact.assign(1);});
      If(radial.lessThan(.99),()=>{
        const localY=p.y.sub(cap.y),top=bounds.x,bottom=bounds.y;
        If(localY.lessThan(top).and(localY.greaterThan(bottom).or(previous.y.sub(p.y).add(localY).greaterThan(top))),()=>{impact.assign(1);});
      });
    });
    If(p.w.greaterThan(seed.mul(10).add(24)).or(p.y.lessThan(.015)).or(p.xyz.length().greaterThan(5)).or(impact.greaterThan(0)),()=>{
      p.assign(vec4(emit(),.001));v.xyz.assign(vec3(0,settle.negate(),0));
      v.w.assign(production);
    });
  })().compute(count,[128]);
  compute.name='Spore advection and settling';
  const mesh=new THREE.Group();mesh.name='GPU spore rain';
  const pointGeometry=new THREE.BufferGeometry();
  pointGeometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(maxCount*3),3));
  pointGeometry.setDrawRange(0,count);
  pointGeometry.setIndirect(culling.args);
  const plane=new THREE.PlaneGeometry(1,1),geometry=new THREE.InstancedBufferGeometry();
  geometry.index=plane.index;geometry.attributes=plane.attributes;geometry.instanceCount=Math.ceil(count/16);
  geometry.setIndirect(culling.args,16);
  const pointID=culling.pointIDs.element(vertexIndex),spriteID=culling.bokehIDs.element(instanceIndex);
  const spriteState=varying(positions.element(spriteID),'sporeBokehState');
  const spriteSeed=varying(hash(spriteID.add(113)),'sporeBokehSeed');
  const spriteFlux=varying(velocities.element(spriteID).w,'spriteFlux');
  function optics(center,seed,age,eye=cameraPosition){
    const size=seed.pow(3).mul(.0016).add(.00085);
    const distance=center.sub(eye).length();
    const blur=distance.sub(focus).abs().sub(.45).max(0).mul(aperture).min(.065);
    const pixel=pixelWorld.mul(distance.div(4.7));
    const footprint=size.add(pixel).add(blur);
    const view=eye.sub(center).normalize();
    const illuminate=(position,tint,power,spot)=>{
      const toLight=position.sub(center),d2=toLight.dot(toLight).max(.12),direction=toLight.normalize();
      // Henyey-Greenstein forward scattering, g=.55. Particles are neutral;
      // color comes from incident light, with inverse-square attenuation.
      const cosine=direction.dot(view).negate();
      const phase=float(1-.55*.55).div(float(1+.55*.55).sub(cosine.mul(1.1)).pow(1.5)).mul(1/(4*Math.PI));
      const cone=spot?direction.negate().dot(keyDirection).smoothstep(.58,.94):float(1);
      return tint.mul(power).div(d2).mul(phase).mul(cone);
    };
    let incident=illuminate(lightPosition,keyColor,keyPower,true).add(illuminate(bluePosition,blueColor,bluePower,false));
    if(lighting?.groveEmission)incident=incident.add(lighting.groveEmission.sample(center).mul(1/(4*Math.PI)));
    const light=incident.mul(brightness).mul(populationWeight).mul(1.5);
    const fade=age.smoothstep(0,.18).mul(center.y.smoothstep(.02,.12));
    const defocus=blur.smoothstep(.001,.012);
    return {light,size,pixel,blur,footprint,fade,defocus};
  }
  const pointMaterial=new THREE.PointsNodeMaterial({transparent:true,depthWrite:false,depthTest:false,blending:THREE.AdditiveBlending});
  pointMaterial.alphaToCoverage=false;
  pointMaterial.positionNode=positions.element(pointID).xyz;
  const pointLight=varying(culling.pointLight.element(vertexIndex),'sporeRadiance');
  pointMaterial.colorNode=pointLight.rgb;
  pointMaterial.opacityNode=pointLight.a;
  const points=new THREE.Points(pointGeometry,pointMaterial);points.frustumCulled=false;points.name='Single-pixel spore cores';mesh.add(points);
  const material=new THREE.SpriteNodeMaterial({transparent:true,depthWrite:false,depthTest:false,blending:THREE.AdditiveBlending});
  material.positionNode=positions.element(spriteID).xyz;
  const bo=optics(spriteState.xyz,spriteSeed,spriteState.w);
  material.scaleNode=bo.footprint;
  material.colorNode=bo.light;
  const disc=uv().sub(.5).length().mul(2).pow2().mul(-5).exp().sub(.0067).max(0);
  material.opacityNode=disc.mul(bo.size.div(bo.footprint).pow2()).mul(bo.fade).mul(bo.defocus).mul(8).mul(spriteFlux).mul(1.4);
  const bokeh=new THREE.Mesh(geometry,material);bokeh.frustumCulled=false;bokeh.name='Defocused spore sample';mesh.add(bokeh);
  return {mesh,points,bokeh,positions,velocities,compute,culling,clock,wind,brightness,focus,aperture,pixelWorld,lightPosition,maxCount,emitterTable,airField,
    get count(){return count;},
    setCount(n){
      if(!Number.isFinite(n))throw new Error('Expected a finite particle count.');
      count=Math.min(maxCount,Math.max(32768,Math.round(n/128)*128));
      populationWeight.value=Math.min(1,786432/count);
      geometry.instanceCount=Math.ceil(count/16);pointGeometry.setDrawRange(0,count);compute.count=count;
    },
    step(renderer,dt){delta.value=Math.min(.05,dt);clock.value+=delta.value;diffusionStep.value=(diffusionStep.value+1)>>>0;airField.prepare(renderer);renderer.compute(compute);},
    prepareRender(renderer,camera){culling.prepare(renderer,camera,count);},
    setDepth(viewZ){for(const m of [material,pointMaterial])m.opacityNode=m.opacityNode.mul(positionView.z.sub(viewZ).smoothstep(0,.012));},
    dispose(){compute.dispose();airField.dispose();culling.dispose();canopy.map.dispose();geometry.dispose();pointGeometry.dispose();material.dispose();pointMaterial.dispose();}
  };
}
