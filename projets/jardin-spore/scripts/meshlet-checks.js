import * as THREE from 'three/webgpu';
import { MeshletDrawingPipeline } from 'three/addons/pipelines/MeshletDrawingPipeline.js';
import { mossLODCoverage } from '../moss-lod.js';

// Verify actual GPU-selected levels retain the merged PR35560 correction.
// A separate, unlit scene keeps lighting, particles and temporal AA out of it.
export async function checkMeshletLOD(){
  const s=window.spore,renderer=s.renderer;
  const saved={manual:s.manual,pipeline:renderer.drawingPipeline,target:renderer.getRenderTarget(),mrt:renderer.getMRT()};
  s.manual=true;
  const target=new THREE.RenderTarget(1665,1174,{samples:0});
  const scene=new THREE.Scene(),material=new THREE.MeshBasicNodeMaterial({color:'white'});
  const floor=s.forest.group.children.find(o=>o.geometry?.type==='PlaneGeometry');
  const plants=s.forest.group.children.find(o=>o.name==='Sorrel and violet woodland shoots');
  const geometries=[floor.geometry,plants.geometry];
  geometries.forEach(geometry=>scene.add(new THREE.Mesh(geometry,material)));
  const camera=new THREE.PerspectiveCamera(36,1665/1174,.025,35);
  camera.position.set(.12,1.15,4.7);camera.lookAt(0,.9,0);camera.updateMatrixWorld();
  const output={date:new Date().toISOString(),selections:null,checks:[]};
  const check=(name,pass,detail)=>{output.checks.push({name,pass,detail});if(!pass)throw new Error(name+': '+JSON.stringify(detail));};
  try{
    {
      const pipeline=new MeshletDrawingPipeline({lodThreshold:1,occlusionCulling:false});
      try{
        renderer.drawingPipeline=pipeline;
        for(let i=0;i<16;i++){
          await new Promise(requestAnimationFrame);
          renderer.setRenderTarget(target);renderer.setMRT(null);renderer.render(scene,camera);
        }
        const record=[...pipeline._records].map(r=>r.deref()).find(r=>r?.culling&&!r.culling.shadow);
        const c=record.culling,states=new Uint32Array(await renderer.getArrayBufferAsync(c.recordAttribute));
        const levels=geometries.map(g=>{
          const geometryID=c.getGeometry(pipeline._getClusters(g));
          for(const batch of c.batches)for(let slot=batch.objectOffset;slot<batch.objectOffset+batch.count;slot++){
            if(states[slot*4+3]>>>16===geometryID)return states[slot*4+1]&255;
          }
          throw new Error('Missing probe geometry in GPU records');
        });
        output.selections={terrain:levels[0],plants:levels[1]};
      }finally{pipeline.dispose();}
    }
    check('the enclosing terrain retains its finest geometry with the surface-distance fix',output.selections.terrain===0,output.selections);
    check('merged plants retain their finest detail near their bounding surface',output.selections.plants===0,output.selections);
    renderer.drawingPipeline=saved.pipeline;renderer.setRenderTarget(saved.target);renderer.setMRT(saved.mrt);
    await new Promise(requestAnimationFrame);s.render();
    const record=[...s.meshlets._records].map(r=>r.deref()).find(r=>r?.culling&&!r.culling.shadow);
    const c=record.culling,counts=new Uint32Array(await renderer.getArrayBufferAsync(c.countersAttribute));
    const moss=c.batches.filter(b=>b.clusters.geometry.userData.mossDetail!==undefined);
    check('moss has no second automatic topology switch',moss.length>0&&moss.every(b=>b.lodCount===1),{batches:moss.length});
    const overflow=c.batches.filter(b=>counts[b.index*2+1]>b.queueCapacity);
    check('meshlet draw queues do not overflow',overflow.length===0,{overflow:overflow.map(b=>b.index)});
    const near=mossLODCoverage(1.8),far=mossLODCoverage(2.9);
    check('both moss transitions overlap instead of cutting',near[0]>0&&near[1]>0&&far[1]>0&&far[2]>0,{near,far});
  }finally{
    renderer.drawingPipeline=saved.pipeline;renderer.setRenderTarget(saved.target);renderer.setMRT(saved.mrt);
    target.dispose();material.dispose();s.render();s.manual=saved.manual;
  }
  return output;
}
