import test from 'node:test';
import assert from 'node:assert/strict';
import { createSpores } from '../spores.js';

test('particle density changes stay within storage capacity and synchronized with draws',()=>{
  const spores=createSpores(65536);
  try{
    assert.equal(spores.count,65536);
    for(const requested of [0,-100,33000,65536,1e8]){
      spores.setCount(requested);
      assert.ok(spores.count>=32768 && spores.count<=65536);
      assert.equal(spores.count%128,0);
      assert.equal(spores.compute.count,spores.count);
      assert.equal(spores.points.geometry.drawRange.count,spores.count);
      assert.equal(spores.bokeh.geometry.instanceCount,Math.ceil(spores.count/16));
    }
    for(const bad of [NaN,Infinity,-Infinity])assert.throws(()=>spores.setCount(bad),/finite/);
  }finally{spores.dispose();}
});
