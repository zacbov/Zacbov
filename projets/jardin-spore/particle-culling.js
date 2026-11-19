import * as THREE from 'three/webgpu';
import { Fn, If, atomicAdd, atomicLoad, atomicStore, hash, instancedArray, instanceIndex, localId, storage, uint, uniform, vec4, workgroupArray, workgroupBarrier } from 'three/tsl';

// Keep every simulated spore alive. Compact only the draw streams, on the GPU,
// using one global reservation per workgroup instead of one per particle.
export function createParticleCulling(positions, maxCount, focus, aperture, pointRadiance) {
  const pointIDs=instancedArray(maxCount,'uint');
  const pointLight=instancedArray(maxCount,'vec4');
  const bokehIDs=instancedArray(Math.ceil(maxCount/16),'uint');
  const args=new THREE.IndirectStorageBufferAttribute(new Uint32Array([0,1,0,0,6,0,0,0,0]),1);
  const counters=storage(args,'uint',9).toAtomic();
  const viewProjection=uniform(new THREE.Matrix4()),eye=uniform(new THREE.Vector3());
  const localCounts=workgroupArray('uint',2).toAtomic();
  const bases=workgroupArray('uint',2);
  const reset=Fn(()=>{
    atomicStore(counters.element(0),uint(0));
    atomicStore(counters.element(5),uint(0));
  })().compute(1);
  const cull=Fn(()=>{
    const id=instanceIndex,p=positions.element(id),clip=viewProjection.mul(vec4(p.xyz,1));
    const inside=clip.w.greaterThan(0).and(clip.xy.abs().lessThan(clip.ww.mul(1.06)).all()).and(clip.z.greaterThan(0)).and(clip.z.lessThan(clip.w)).and(p.w.greaterThan(0));
    const blur=p.xyz.sub(eye).length().sub(focus).abs().sub(.45).max(0).mul(aperture);
    const radiance=vec4(0).toVar();
    If(inside.and(blur.lessThan(.012)),()=>{radiance.assign(pointRadiance(p,id,eye));});
    const peak=radiance.rgb.max(radiance.gbr).max(radiance.brg).x.mul(radiance.a);
    const point=inside.and(blur.lessThan(.012)).and(peak.greaterThan(.0002));
    // Only defocused spores need a sprite; in-focus spores use tiny cores.
    // One stable random sample per 16 IDs. A fixed modulo selected only 16 of
    // the 256 emission slots, biasing bright defocused motes to a few sources.
    const bokehSample=id.mod(16).equal(hash(id.div(uint(16))).mul(16).toUint());
    const bokeh=inside.and(blur.greaterThan(.001)).and(bokehSample);
    // Invisible particles must reach the barriers, but need not contend for
    // the workgroup counters. In particular only 1/16 can enter the bokeh list.
    const localPoint=uint(0).toVar(),localBokeh=uint(0).toVar();
    If(point,()=>{localPoint.assign(atomicAdd(localCounts.element(uint(0)),uint(1)));});
    If(bokeh,()=>{localBokeh.assign(atomicAdd(localCounts.element(uint(1)),uint(1)));});
    workgroupBarrier();
    If(localId.x.equal(0),()=>{
      bases.element(uint(0)).assign(atomicAdd(counters.element(0),atomicLoad(localCounts.element(uint(0)))));
      bases.element(uint(1)).assign(atomicAdd(counters.element(5),atomicLoad(localCounts.element(uint(1)))));
    });
    workgroupBarrier();
    If(point,()=>{
      const offset=bases.element(uint(0)).add(localPoint);
      pointIDs.element(offset).assign(id);pointLight.element(offset).assign(radiance);
    });
    If(bokeh,()=>{bokehIDs.element(bases.element(uint(1)).add(localBokeh)).assign(id);});
  })().compute(262144,[128]);
  reset.name='Reset spore draw commands';cull.name='Compact visible spore draw streams';
  return {pointIDs,pointLight,bokehIDs,args,cull,
    prepare(renderer,camera,count){
      camera.updateMatrixWorld();viewProjection.value.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
      eye.value.copy(camera.position);cull.count=count;renderer.compute([reset,cull]);
    },
    dispose(){reset.dispose();cull.dispose();}
  };
}
