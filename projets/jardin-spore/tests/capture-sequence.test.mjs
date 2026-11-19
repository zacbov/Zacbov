import test from 'node:test';
import assert from 'node:assert/strict';
import { cameraPoseAt, DURATION, FPS } from '../scripts/capture-sequence.js';
import { MUSHROOMS, stemRadius } from '../mushrooms.js';
import { canopySample } from '../canopy-surface.js';
import { groundHeight } from '../terrain.js';

test('the complete camera sequence clears the terrain, stems and cap envelopes',()=>{
  for(let frame=0;frame<DURATION*FPS;frame++){
    const pose=cameraPoseAt(frame/FPS),p=pose.position;
    assert.ok([...p,...pose.target,pose.fov].every(Number.isFinite));
    assert.ok(p[1]-groundHeight(p[0],p[2])>.12,`camera enters the floor at frame ${frame}`);
    for(const m of MUSHROOMS){
      const u=p[1]/(m.h-m.r*.1);
      if(u>=0&&u<=1){
        const x=m.x+m.bend*u*u+Math.sin(u*Math.PI)*.027,z=m.z+Math.sin(u*Math.PI)*.035;
        assert.ok(Math.hypot(p[0]-x,p[2]-z)>stemRadius(m,u)+.04,`camera enters stem ${m.seed} at frame ${frame}`);
      }
      const bounds=canopySample(m,(p[0]-m.x-m.bend)/m.r,(p[2]-m.z)/(m.r*.91));
      assert.ok(bounds[3]>1.05||p[1]<m.h+bounds[1]-.04||p[1]>m.h+bounds[0]+.04,
        `camera enters cap ${m.seed} at frame ${frame}`);
    }
  }
});
