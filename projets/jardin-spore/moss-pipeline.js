import { MeshletDrawingPipeline } from 'three/addons/pipelines/MeshletDrawingPipeline.js';
import { Vector3 } from 'three/webgpu';
import { MOSS_LOD_RANGES } from './moss-lod.js';

// The pipeline calibrates draw-queue capacity from one view, then drops overflowing
// meshlets until its 30-frame readback catches up. Macro zooms can expose many
// more clusters immediately. Keep a complete queue for each botanical variant.
// These hooks target the commit pinned in index.html and package.json.
export class MossDrawingPipeline extends MeshletDrawingPipeline {
  createBatch(entry, capacity, view, culling) {
    const batch = super.createBatch(entry, capacity, view, culling);
    // The automatic simplifier prunes most disconnected leaves at level 2.
    // Moss now fades between explicit detail geometries. Other plants use the
    // upstream surface-distance correction rather than locking all detail.
    if (!culling.shadow && entry.clusters.geometry.userData.mossDetail!==undefined) {
      batch.lodCount = 1;
      // The pipeline registers the batch inside its constructor, before this hook
      // returns. Update row 2.z of that table as well as the retained setting.
      if (batch.added) culling.tableArray[batch.index * 12 + 10] = batch.lodCount;
    }
    return batch;
  }

  _projectLOD(lod,camera,groupOrder,renderList,clippingContext) {
    if(!lod.userData.mossBlend)return super._projectLOD(lod,camera,groupOrder,renderList,clippingContext);
    let ranges=this._lodRanges.get(lod);
    if(!ranges){ranges=lod.levels.map(()=>({position:new Vector3(),near:0,far:1e20,switchDistance:1e20,farMaterial:null}));this._lodRanges.set(lod,ranges);}
    const previous=this._lodRange;
    try{
      for(let i=0;i<lod.levels.length;i++){
        const range=ranges[i],object=lod.levels[i].object;
        range.position.setFromMatrixPosition(lod.matrixWorld);
        [range.near,range.far]=MOSS_LOD_RANGES[i];
        const visible=object.visible;object.visible=true;this._lodRange=range;
        try{this.project(object,camera,groupOrder,renderList,clippingContext);}finally{object.visible=visible;}
      }
    }finally{this._lodRange=previous;}
  }

  _getBatchKey(clusters) {
    // Separate variants keep each full queue below r187's 2^20-item limit.
    return clusters.hasAttribute('plant') ? clusters : super._getBatchKey(clusters);
  }

  _getCullingCapacity(entries, capacities, occlusion, shadow, clusterBudget = 0) {
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (!entry.clusters.hasAttribute('plant')) continue;
      if (capacities[i] * entry.maxChunks > 2 ** 20) {
        throw new Error('A moss batch exceeds the safe meshlet queue size. Split its instances.');
      }
      entry.queueBudget = Infinity;
      entry.queueMeasured = true;
    }
    return super._getCullingCapacity(entries, capacities, occlusion, shadow, clusterBudget);
  }
}
