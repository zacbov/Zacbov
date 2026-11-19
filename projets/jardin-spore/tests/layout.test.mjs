import test from 'node:test';
import assert from 'node:assert/strict';
import { MUSHROOMS, stemRadius } from '../mushrooms.js';
import { canopySample } from '../canopy-surface.js';

test('mushroom caps and stems do not penetrate neighboring mushroom envelopes',()=>{
  for(let i=0;i<MUSHROOMS.length;i++)for(let j=i+1;j<MUSHROOMS.length;j++){
    const a=MUSHROOMS[i],b=MUSHROOMS[j];
    const minX=Math.max(a.x+a.bend-a.r*1.2,b.x+b.bend-b.r*1.2),maxX=Math.min(a.x+a.bend+a.r*1.2,b.x+b.bend+b.r*1.2);
    const minZ=Math.max(a.z-a.r*1.1,b.z-b.r*1.1),maxZ=Math.min(a.z+a.r*1.1,b.z+b.r*1.1);
    for(let x=minX;x<maxX;x+=.015)for(let z=minZ;z<maxZ;z+=.015){
      const ca=canopySample(a,(x-a.x-a.bend)/a.r,(z-a.z)/(a.r*.91)),cb=canopySample(b,(x-b.x-b.bend)/b.r,(z-b.z)/(b.r*.91));
      if(ca[3]>=1||cb[3]>=1)continue;
      const overlap=Math.min(a.h+ca[0],b.h+cb[0])-Math.max(a.h+ca[1],b.h+cb[1]);
      assert.ok(overlap<.001,`caps ${i}/${j} intersect`);
    }
  }
  for(const [i,m] of MUSHROOMS.entries())for(const [j,cap] of MUSHROOMS.entries()){
    if(i===j)continue;
    for(let n=1;n<56;n++){
      const u=n/56,y=.015+(m.h-m.r*.1)*u,cx=m.x+m.bend*u*u+Math.sin(u*Math.PI)*.027,cz=m.z+Math.sin(u*Math.PI)*.035,r=stemRadius(m,u);
      for(let k=0;k<16;k++){
        const x=cx+r*Math.cos(k*Math.PI/8),z=cz+r*Math.sin(k*Math.PI/8),c=canopySample(cap,(x-cap.x-cap.bend)/cap.r,(z-cap.z)/(cap.r*.91));
        assert.ok(c[3]>=.98||y>=cap.h+c[0]||y<=cap.h+c[1],`stem ${i} penetrates cap ${j}`);
      }
    }
  }
});
