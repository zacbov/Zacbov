import test from 'node:test';
import assert from 'node:assert/strict';
import { createTuftGeometry } from '../botany.js';
import { createMossDetailLevels, mossLODReady, mossLODCoverage, MOSS_LOD_BANDS, MOSS_LOD_RANGES } from '../moss-lod.js';

test('moss detail coverage stays continuous and sums to one across each boundary',()=>{
  for(let d=0;d<8;d+=.001){
    const weights=mossLODCoverage(d);
    assert.ok(weights.every(w=>w>=0&&w<=1));
    assert.ok(Math.abs(weights.reduce((a,b)=>a+b)-1)<1e-12);
    for(let i=0;i<3;i++)if(weights[i]>0){
      const range=i===2&&d>=MOSS_LOD_RANGES[3][0]?MOSS_LOD_RANGES[3]:MOSS_LOD_RANGES[i];
      assert.ok(d>=range[0]&&d<=range[1],'visible coverage is outside the GPU draw range');
    }
  }
  for(const d of MOSS_LOD_BANDS.flat()){
    const a=mossLODCoverage(d-1e-5),b=mossLODCoverage(d+1e-5);
    assert.ok(a.every((v,i)=>Math.abs(v-b[i])<1e-7),'coverage jumps at the transition');
  }
});

test('extracted moss detail levels preserve vertex attributes and valid triangle indices',async()=>{
  await mossLODReady;
  for(let i=0;i<5;i++){
    const near=createTuftGeometry(170+i*17,7,6),far=createTuftGeometry(170+i*17,7,2);
    assert.equal(near.userData.leaves,far.userData.leaves,'close detail must retain the same leaves');
    assert.equal(near.userData.triangles-far.userData.triangles,near.userData.leaves*32);
    const levels=createMossDetailLevels(near,far);
    assert.ok(levels[0].index.count>levels[1].index.count&&levels[1].index.count>levels[2].index.count);
    for(const [level,g] of levels.entries()){
      assert.equal(g.userData.mossDetail,level);
      for(const name of ['position','normal','plant','pigment']){
        assert.equal(g.attributes[name].count,g.attributes.position.count);
        assert.ok(g.attributes[name].array.every(Number.isFinite));
      }
      assert.ok(g.index.array.every(index=>index<g.attributes.position.count));
      g.dispose();
    }
    far.dispose();
  }
});
