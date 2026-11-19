import * as THREE from 'three/webgpu';
import { Fn, Loop, float, instanceIndex, mix, texture3D, textureStore, uint, uniformArray, vec2, vec3, vec4, wgslFn } from 'three/tsl';
import { MUSHROOMS } from './mushrooms.js';
import { createCapGrid } from './spatial-grid.js';

// Curl of an analytic multiscale potential. The obstacle corrections below
// gently turn this field near tissue; they do not depend on particle identity,
// age or emitter. This is a kinematic approximation, not a fluid solver.
export const ambientAir=wgslFn(`fn ambientAir(p:vec3<f32>,t:f32,wind:f32)->vec3<f32>{
  let q=p*2.8+vec3<f32>(t*0.10,t*-0.045,t*0.06);
  let b=vec3<f32>(cos(q.y+cos(q.x))+sin(q.z)*cos(q.x+cos(q.z)),
    cos(q.z+cos(q.y))+sin(q.x)*cos(q.y+cos(q.x)),
    cos(q.x+cos(q.z))+sin(q.y)*cos(q.z+cos(q.y)));
  let k=p*9.0+vec3<f32>(t*.31,-t*.23,t*.17);
  let small=vec3<f32>(cos(k.y)*sin(k.z),cos(k.z)*sin(k.x),cos(k.x)*sin(k.y));
  // Almost neutral vertical drift lets settling compete with the updrafts.
  let drift=vec3<f32>(.035+.022*sin(t*.17),.008+.018*sin(t*.13+p.x*1.5),.025*sin(t*.11));
  return (drift+b*.085+small*.043)*wind;
}`);

export function createAirField({clock,wind,obstacles,stipes,boundsAt}){
  // Include the entire soft transition outside the collision footprint.
  const grid=createCapGrid(MUSHROOMS,{padding:.23}),cellCounts=uniformArray(grid.counts,'uint'),packed=[];
  for(let i=0;i<grid.indices.length;i+=4)packed.push(new THREE.Vector4(...grid.indices.slice(i,i+4)));
  const cellIndices=uniformArray(packed);
  const nx=96,ny=56,nz=96,origin=vec3(-5,-.2,-5),extent=vec3(10,5.6,10);
  const field=new THREE.Storage3DTexture(nx,ny,nz);field.type=THREE.HalfFloatType;
  field.minFilter=field.magFilter=THREE.LinearFilter;field.name='Shared air current around the grove';
  const compute=Fn(()=>{
    const index=instanceIndex,x=index.mod(nx),y=index.div(nx).mod(ny),z=index.div(nx*ny);
    const p=vec3(x,y,z).add(.5).div(vec3(nx,ny,nz)).mul(extent).add(origin);
    const velocity=ambientAir({p,t:clock,wind}).toVar();
    const correction=vec3(0).toVar();
    const cell=p.xz.sub(grid.origin).div(grid.cellSize).floor().clamp(0,grid.size-1).toUVec2();
    const cellID=cell.y.mul(grid.size).add(cell.x),count=cellCounts.element(cellID);
    const deflect=(normal,distance)=>{
      const influence=distance.smoothstep(0,.20).oneMinus().pow2();
      // Reduce inward velocity gradually without adding an outward source.
      // Sum corrections from the original field so neighbor order is irrelevant.
      // Partial deflection avoids a stagnant boundary layer collecting spores
      // into ridges. Remaining impacts deposit instead of sticking to a shell.
      correction.addAssign(normal.mul(velocity.dot(normal).min(0).negate()).mul(influence).mul(.65));
    };
    Loop({start:uint(0),end:count,type:'uint'},({i})=>{
      const id=cellIndices.element(cellID.mul(grid.stride/4).add(i.div(uint(4)))).element(i.mod(uint(4))).toUint();
      const cap=obstacles.element(id),shape=stipes.element(id),offset=p.xz.sub(cap.xz);
      const bounds=boundsAt(cap,offset,id);
      const middle=cap.y.add(bounds.x.add(bounds.y).mul(.5)),half=bounds.x.sub(bounds.y).mul(.5);
      // Outside the texture domain, use true distance as a lower bound: a
      // clamped border texel must not extend a cap's influence indefinitely.
      const radialDistance=offset.div(vec2(1,.91)).length().sub(cap.w.mul(1.12));
      const dy=p.y.sub(middle),vertical=dy.abs().sub(half),radial=bounds.w.sub(1).mul(cap.w).max(radialDistance);
      const side=radial.sub(vertical).smoothstep(-.10,.10);
      const radialNormal=offset.div(offset.length().max(.001));
      const capNormal=mix(vec3(0,dy.greaterThanEqual(0).select(1,-1),0),vec3(radialNormal.x,0,radialNormal.y),side);
      deflect(capNormal.div(capNormal.length().max(.001)),radial.max(vertical));

      const height=p.y.sub(.015).div(cap.y.sub(cap.w.mul(.1))).clamp();
      const center=vec2(cap.x.sub(shape.y).add(shape.y.mul(height.pow2())).add(height.mul(Math.PI).sin().mul(.027)),cap.z.add(height.mul(Math.PI).sin().mul(.035)));
      const radius=cap.w.mul(float(.155).add(height.mul(-9).exp().mul(.070)).add(height.mul(5).add(shape.x).sin().mul(.018)).add(height.pow(8).mul(.080)));
      const delta=p.xz.sub(center),length=delta.length(),normal=vec3(delta.x,0,delta.y).div(length.max(.001));
      const endDistance=p.y.negate().max(p.y.sub(cap.y.sub(cap.w.mul(.18))));
      deflect(normal,length.sub(radius).max(endDistance));
    });
    // Bound overlap corrections where caps touch; avoid a concentrated jet.
    correction.mulAssign(float(.11).div(correction.length().max(.11)));
    textureStore(field,vec3(x,y,z),vec4(velocity.add(correction),1));
  })().compute(nx*ny*nz,[128]);compute.name='Shared curl field with soft mushroom avoidance';
  const node=texture3D(field);
  return {field,compute,sample:p=>node.sample(p.sub(origin).div(extent)).xyz,
    prepare:renderer=>renderer.compute(compute),dispose(){compute.dispose();field.dispose();}};
}
