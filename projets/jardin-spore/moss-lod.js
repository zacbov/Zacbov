import * as THREE from 'three/webgpu';
import { cameraPosition, modelPosition, screenUV, uniform, vec2 } from 'three/tsl';
import { createMeshlets, ready } from 'three/addons/utils/MeshletGeometryUtils.js';

// Explicit detail bands allow the two surfaces to overlap while their coverage
// changes continuously. Automatic meshlet simplification is disabled for these
// geometries: its disconnected-leaf pruning must not introduce a second switch.
export const MOSS_LOD_BANDS = [[1.4,2.2],[2.6,3.2]];
export const MOSS_LOD_RANGES = [
  [-1e20,MOSS_LOD_BANDS[0][1]],
  [MOSS_LOD_BANDS[0][0],MOSS_LOD_BANDS[1][1]],
  [...MOSS_LOD_BANDS[1]],
  [MOSS_LOD_BANDS[1][1],1e20]
];
export { ready as mossLODReady };

export function mossLODCoverage(distance) {
  const smooth=([start,end])=>{const t=Math.max(0,Math.min(1,(distance-start)/(end-start)));return t*t*(3-2*t);};
  const near=smooth(MOSS_LOD_BANDS[0]),far=smooth(MOSS_LOD_BANDS[1]);
  return [1-near,near-far,far];
}

// Reuse the pinned meshoptimizer result rather than asking every rendered
// batch to switch between these very different topologies in a single frame.
export function createMossDetailLevels(near,far) {
  const clusters=createMeshlets(far);
  const extract=level=>{
    const geometry=new THREE.BufferGeometry(),count=clusters.vertexArray.length/(clusters.stride*4);
    const attributes=new Map([['position',{offset:0,itemSize:3}],['normal',{offset:1,itemSize:3}],...clusters.attributeLayout]);
    for(const [name,{offset,itemSize}] of attributes){
      const data=new Float32Array(count*itemSize);
      for(let i=0;i<count;i++)for(let k=0;k<itemSize;k++)data[i*itemSize+k]=clusters.vertexArray[(i*clusters.stride+offset)*4+k];
      geometry.setAttribute(name,new THREE.BufferAttribute(data,itemSize));
    }
    const lod=clusters.lodOffsetValues[level],indices=[];
    for(let i=lod.x*3;i<(lod.x+lod.y)*3;i+=3){
      const [a,b,c]=clusters.indexArray.subarray(i,i+3);
      if(a!==b&&a!==c&&b!==c)indices.push(a,b,c);
    }
    geometry.setIndex(indices);geometry.computeBoundingSphere();
    geometry.userData={mossDetail:level,triangles:indices.length/3};
    return geometry;
  };
  near.userData.mossDetail=0;
  return [near,extract(1),extract(2)];
}

export function createMossLODMaterials(base) {
  const resolution=uniform(new THREE.Vector2(1,1));
  const zoom=uniform(1);
  const distance=cameraPosition.sub(modelPosition).length().div(zoom);
  const near=distance.smoothstep(...MOSS_LOD_BANDS[0]),far=distance.smoothstep(...MOSS_LOD_BANDS[1]);
  // Complementary screen-door masks: a pixel belongs to exactly one level.
  // The same pattern is used by the color and occlusion depth passes.
  const pixel=screenUV.mul(resolution).floor();
  const noise=pixel.dot(vec2(.06711056,.00583715)).fract().mul(52.9829189).fract();
  const masks=[noise.greaterThanEqual(near),noise.lessThan(near).and(noise.greaterThanEqual(far)),noise.lessThan(far)];
  const materials=masks.map((mask,i)=>{
    const material=base.clone();
    material.name=`Blended moss detail ${i}`;
    material.leafTransmissionNode=base.leafTransmissionNode;
    material.groveIrradianceNode=base.groveIrradianceNode;
    material.opacityNode=mask.select(1,0);material.alphaTest=.5;
    return material;
  });
  // Outside the far blend the identical geometry uses the normal opaque
  // shader, restoring early depth rejection for most of the moss carpet.
  materials.push(base);
  return {materials,update(renderer,camera){renderer.getDrawingBufferSize(resolution.value);zoom.value=camera.zoom;}};
}
