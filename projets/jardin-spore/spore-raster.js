import * as THREE from 'three/webgpu';
import { Fn, If, atomicAdd, atomicStore, float, instanceIndex, perspectiveDepthToViewZ, screenUV, storage, uint, uniform, vec2, vec3, vec4 } from 'three/tsl';

// Single-pixel spores do not need triangle/point raster setup. Accumulate their
// linear radiance directly into a screen buffer; keep the defocused sprites on
// the normal raster path. Integer additions make overlapping grains stable and
// order-independent. 16 fractional bits preserve dim colored particles.
export class SporeRasterNode extends THREE.Node {
  constructor(spores,scenePass,camera){
    super('vec3');
    this.updateBeforeType=THREE.NodeUpdateType.FRAME;
    this.spores=spores;this.scenePass=scenePass;this.camera=camera;
    this.capacity=4194304;
    this.size=uniform(new THREE.Vector2(1,1));
    this.pixelFlux=uniform(1);
    this.projection=uniform(new THREE.Matrix4());
    const pixels=new THREE.StorageBufferAttribute(this.capacity*3,1,Uint32Array);
    this.pixels=pixels;
    const accumulator=storage(pixels,'uint',this.capacity*3).toAtomic();
    const resolved=storage(pixels,'uint',this.capacity*3).toReadOnly();
    const commands=storage(spores.culling.args,'uint',9).toReadOnly();
    const depth=scenePass.getTextureNode('depth');
    this.clear=Fn(()=>{
      const i=instanceIndex.mul(3);
      atomicStore(accumulator.element(i),uint(0));
      atomicStore(accumulator.element(i.add(1)),uint(0));
      atomicStore(accumulator.element(i.add(2)),uint(0));
    })().compute(1,[128]);
    this.draw=Fn(()=>{
      const i=instanceIndex;
      If(i.lessThan(commands.element(0)),()=>{
        const id=spores.culling.pointIDs.element(i);
        const clip=this.projection.mul(vec4(spores.positions.element(id).xyz,1));
        const at=vec2(clip.x,clip.y.negate()).div(clip.w).mul(.5).add(.5);
        If(at.greaterThanEqual(0).all().and(at.lessThan(1).all()),()=>{
          const xy=at.mul(this.size).floor().toUVec2(),offset=xy.y.mul(this.size.x.toUint()).add(xy.x).mul(3);
          const pixelUV=vec2(xy).add(.5).div(this.size);
          const surfaceZ=perspectiveDepthToViewZ(depth.sample(pixelUV),camera.near,camera.far);
          const particleZ=perspectiveDepthToViewZ(clip.z.div(clip.w),camera.near,camera.far);
          const light=spores.culling.pointLight.element(i);
          const energy=light.rgb.mul(light.a).mul(this.pixelFlux).mul(particleZ.sub(surfaceZ).smoothstep(0,.012));
          const value=energy.mul(65536).add(.5).toUVec3();
          atomicAdd(accumulator.element(offset),value.r);
          atomicAdd(accumulator.element(offset.add(1)),value.g);
          atomicAdd(accumulator.element(offset.add(2)),value.b);
        });
      });
    })().compute(262144,[128]);
    const xy=screenUV.mul(this.size).floor().min(this.size.sub(1)).toUVec2();
    const offset=xy.y.mul(this.size.x.toUint()).add(xy.x).mul(3);
    this.result=vec3(float(resolved.element(offset)),float(resolved.element(offset.add(1))),float(resolved.element(offset.add(2)))).div(65536);
    this.clear.name='Clear spore radiance buffer';this.draw.name='Compute-rasterized spore cores';
  }
  setup(){return this.result;}
  updateBefore(frame){
    frame.updateBeforeNode(this.scenePass);
    frame.renderer.getDrawingBufferSize(this.size.value);
    const fullArea=this.size.value.x*this.size.value.y;
    if(fullArea>this.capacity)this.size.value.multiplyScalar(Math.sqrt(this.capacity/fullArea)).floor();
    const area=this.size.value.x*this.size.value.y;
    this.pixelFlux.value=area/fullArea;
    this.camera.updateMatrixWorld();this.projection.value.multiplyMatrices(this.camera.projectionMatrix,this.camera.matrixWorldInverse);
    this.clear.count=area;this.draw.count=this.spores.count;
    frame.renderer.compute([this.clear,this.draw]);
  }
  dispose(){this.clear.dispose();this.draw.dispose();super.dispose();}
}
