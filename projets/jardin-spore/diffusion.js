import * as THREE from 'three/webgpu';
import { Fn, If, Loop, rtt, uniform, uniformArray, uv, vec3, vec4 } from 'three/tsl';

// Burley's normalized radial profile is a mixture of two exponentials:
// R(r) = (exp(-r/d) + exp(-r/(3d))) / (8*pi*d*r).
// Sampling the radial mixture cancels the 1/r singularity and concentrates
// samples near the exit point. RGB mean free paths preserve wavelength spread.
export function createDiffusion(scatter, tissue, viewDepth, camera) {
  const projection = uniform(new THREE.Vector2());
  const samples = [];
  for (let i=0;i<24;i++) {
    const u=(Math.floor(i/4)+.5)/6;
    const radius=-Math.log(1-u)*(i%4===0?1:3);
    const angle=i*2.399963229728653;
    samples.push(new THREE.Vector3(Math.cos(angle)*radius,Math.sin(angle)*radius,radius));
  }
  const kernel=uniformArray(samples);
  const gather=Fn(()=>{
    const at=uv(),surface=tissue.sample(at),center=scatter.sample(at);
    const sum=center.rgb.toVar(),weights=vec3(1).toVar();
    If(surface.a.greaterThan(0).and(center.a.greaterThan(.0001)),()=>{
      const z=viewDepth(at),d=center.a;
      Loop(24,({i})=>{
        const k=kernel.element(i);
        const tap=at.add(k.xy.mul(d).mul(projection).div(z));
        const neighbor=tissue.sample(tap);
        If(neighbor.a.sub(surface.a).abs().lessThan(.005),()=>{
          const dz=viewDepth(tap).sub(z);
          const distance=k.z.mul(d).pow2().add(dz.pow2()).sqrt();
          const mfp=vec3(1,.72,.48).mul(d);
          const profile=distance.div(mfp).negate().exp().add(distance.div(mfp.mul(3)).negate().exp()).div(mfp);
          const pdf=k.z.negate().exp().add(k.z.div(-3).exp()).div(d);
          const weight=profile.div(pdf.max(.0001));
          sum.addAssign(scatter.sample(tap).rgb.mul(weight));weights.addAssign(weight);
        });
      });
    });
    return vec4(sum.div(weights),surface.a);
  });
  const filtered=rtt(gather(),null,null,{resolutionScale:.5,depthBuffer:false});
  return {filtered,
    update(){projection.value.set(camera.projectionMatrix.elements[0]*.5,camera.projectionMatrix.elements[5]*.5);},
    dispose(){filtered.dispose();}};
}
