import test from 'node:test';
import assert from 'node:assert/strict';
import { MUSHROOMS, GILL_RADIUS, capPoint, createCapGeometry, createGillGeometry, createStemGeometry } from '../mushrooms.js';
import { createCapGrid, createEmitterTable } from '../spatial-grid.js';
import { createTuftGeometry } from '../botany.js';
import { canopySample } from '../canopy-surface.js';
import { groundHeight } from '../terrain.js';

test('distant moss retains every closed leaf with finite geometry',()=>{
  for(let i=0;i<5;i++){
    const near=createTuftGeometry(170+i*17),far=createTuftGeometry(170+i*17,7,2);
    assert.equal(far.userData.leaves,near.userData.leaves);
    assert.equal(near.userData.triangles-far.userData.triangles,near.userData.leaves*8);
    for(const attribute of Object.values(far.attributes))assert.ok(attribute.array.every(Number.isFinite));
    near.dispose();far.dispose();
  }
});

for (const [name,create] of [['cap',createCapGeometry],['gills',createGillGeometry],['stem',createStemGeometry]]) {
  test(`${name}: renderable geometry and physically valid optical attributes for every mushroom`,()=>{
    for(const m of MUSHROOMS) {
      const geometry=create(m),p=geometry.attributes.position,n=geometry.attributes.normal;
      assert.ok(p.count>0);
      for(const attribute of Object.values(geometry.attributes)) {
        assert.equal(attribute.count,p.count);
        assert.ok(attribute.array.every(Number.isFinite),`${name} ${m.seed}: nonfinite attribute`);
      }
      for(const index of geometry.index.array)assert.ok(index<p.count,`${name} ${m.seed}: invalid triangle index`);
      if(name==='stem'){
        for(let i=0;i<p.count;i++)if(geometry.attributes.tissue.getX(i)===0){
          assert.ok(p.getY(i)<groundHeight(p.getX(i),p.getZ(i))-.035,'stem ends above its soil contact');
        }
      }
      const optical=geometry.attributes.optical,axis=geometry.attributes.tissueAxis;
      for(let i=0;i<p.count;i++) {
        assert.ok(optical.getX(i)>0 && optical.getY(i)>0,'nonpositive tissue thickness');
        assert.equal(optical.getW(i),MUSHROOMS.indexOf(m)+1,'diffusion crossed an individual ID');
        assert.ok(Math.hypot(axis.getX(i),axis.getY(i),axis.getZ(i))>.9);
        assert.ok(Math.hypot(n.getX(i),n.getY(i),n.getZ(i))>.9,'zero or invalid surface normal');
      }
      geometry.dispose();
    }
  });
}

test('caps have positive flesh thickness and a continuous angular seam',()=>{
  for(const m of MUSHROOMS)for(let j=0;j<=40;j++) {
    const u=j/40;
    for(let k=0;k<32;k++){
      const angle=k*Math.PI/16;
      assert.ok(capPoint(m,u,angle)[1]>capPoint(m,u,angle,true)[1]);
    }
    for(const underside of [false,true]){
      const a=capPoint(m,u,0,underside),b=capPoint(m,u,Math.PI*2,underside);
      assert.ok(a.every((v,i)=>Math.abs(v-b[i])<1e-10));
    }
  }
});

test('the canopy grid never misses a cap footprint used by GPU collision queries',()=>{
  const grid=createCapGrid(MUSHROOMS);
  for(let index=0;index<MUSHROOMS.length;index++) {
    const m=MUSHROOMS[index];
    for(let j=0;j<=10;j++)for(let i=0;i<72;i++){
      const angle=i/72*Math.PI*2,radius=m.r*1.20*j/10;
      const x=m.x+m.bend+Math.cos(angle)*radius,z=m.z+Math.sin(angle)*radius;
      const cx=Math.floor((x-grid.origin)/grid.cellSize),cz=Math.floor((z-grid.origin)/grid.cellSize);
      assert.ok(cx>=0 && cx<grid.size && cz>=0 && cz<grid.size);
      const cell=cz*grid.size+cx;
      assert.ok(grid.indices.slice(cell*grid.stride,cell*grid.stride+grid.counts[cell]).includes(index));
    }
  }
});

test('canopy collision envelope follows warped caps and excludes points outside their rims',()=>{
  for(const m of MUSHROOMS)for(let i=0;i<48;i++)for(const u of [.05,.3,.6,.9,1]){
    const angle=i*Math.PI/24,p=capPoint(m,u,angle);
    const x=(p[0]-m.x-m.bend)/m.r,z=(p[2]-m.z)/(m.r*.91);
    const bounds=canopySample(m,x,z);
    assert.ok(bounds.every(Number.isFinite));
    assert.ok(Math.abs(bounds[3]-u)<1e-5,'incorrect radial inverse');
    assert.ok(Math.abs(bounds[0]+m.h-p[1])<1e-5,'collision cap differs from visible cap');
    assert.ok(bounds[1]+m.h<capPoint(m,u,angle,true)[1],'fin envelope sits above the fins');
    if(u===1)assert.ok(canopySample(m,x*1.05,z*1.05)[3]>1,'empty space was classified as cap');
  }
});

test('all mushrooms have a continuous emission budget, with remaining particles weighted by area',()=>{
  const table=createEmitterTable(MUSHROOMS),total=MUSHROOMS.reduce((s,m)=>s+m.r*m.r,0);
  assert.equal(new Set(table).size,MUSHROOMS.length);
  for(let index=0;index<MUSHROOMS.length;index++){
    const actual=table.filter(i=>i===index).length;
    const expected=(.35/MUSHROOMS.length+.65*MUSHROOMS[index].r**2/total)*table.length;
    assert.ok(actual>=3,'small mushroom was starved of particles');
    assert.ok(Math.abs(actual-expected)<=1,`emission area error: ${index}`);
  }
});

test('the terminal gill ring tucks inside a closed cap lip',()=>{
  for(const m of MUSHROOMS){
    const g=createGillGeometry(m),p=g.attributes.position,t=g.attributes.tissue;
    for(let i=0;i<p.count;i++)if(t.getX(i)>GILL_RADIUS-.0001){
      const x=p.getX(i)-m.x-m.bend,z=(p.getZ(i)-m.z)/.91,angle=Math.atan2(z,x);
      const rim=capPoint(m,1,angle,true),under=capPoint(m,GILL_RADIUS,angle,true);
      assert.ok(Math.hypot(x,z)<Math.hypot(rim[0]-m.x-m.bend,(rim[2]-m.z)/.91),'fin extends outside cap');
      assert.ok(Math.abs(p.getY(i)-under[1])<.002,'terminal ridge does not tuck into underside');
      assert.ok(capPoint(m,1,angle)[1]>rim[1],'cap lip is inverted or open');
    }
    g.dispose();
  }
});
