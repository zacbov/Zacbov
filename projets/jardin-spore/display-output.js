import { HalfFloatType, WebGPURenderer } from 'three/webgpu';

export async function createDisplayRenderer(options){
  let renderer=new WebGPURenderer({...options,outputType:HalfFloatType});
  await renderer.init();
  if(!renderer.backend.isWebGPUBackend)throw new Error('A WebGPU adapter is required.');
  try{
    // Configure before creating scene resources. Some older browsers reject
    // float presentation; retry their preferred format without losing a scene.
    renderer.backend.context;
  }catch{
    await renderer.dispose();
    renderer=new WebGPURenderer(options);
    await renderer.init();
    if(!renderer.backend.isWebGPUBackend)throw new Error('A WebGPU adapter is required.');
    renderer.backend.context;
  }
  return renderer;
}

// Keep the float canvas format fixed when switching displays. Changing only its
// presentation mode and the final curve preserves GPU resources and spores.
export function createDisplayOutput(renderer,mediaQuery=matchMedia('(dynamic-range: high)')){
  const context=renderer.backend.context;
  const config=context.getConfiguration?.();
  let supported=config?.format==='rgba16float'&&config?.toneMapping?.mode==='extended';
  let mode='auto',peak=4,active=false,listener=()=>{};
  function refresh(){
    active=Boolean(supported&&mediaQuery.matches&&mode==='auto');
    if(supported){
      const presentation=active?'extended':'standard';
      try{
        if(context.getConfiguration().toneMapping?.mode!==presentation){
          context.configure({...config,toneMapping:{mode:presentation}});
        }
      }catch{
        supported=false;active=false;
        context.configure({...config,toneMapping:{mode:'standard'}});
      }
    }
    listener();
  }
  mediaQuery.addEventListener('change',refresh);
  refresh();
  return {
    get supported(){return Boolean(supported);},get displayCapable(){return mediaQuery.matches;},
    get active(){return active;},get mode(){return mode;},get peak(){return peak;},
    get headroom(){return active?peak:1;},
    setMode(value){if(!['auto','sdr'].includes(value))throw new Error('Unknown display mode');mode=value;refresh();},
    setPeak(value){if(!Number.isFinite(value))throw new Error('Expected finite HDR headroom');peak=Math.max(1,Math.min(8,value));listener();},
    onChange(callback){listener=callback;listener();},
    inspect(){return {mode,active,supported:Boolean(supported),displayCapable:mediaQuery.matches,peak,headroom:active?peak:1,format:config?.format};},
    dispose(){mediaQuery.removeEventListener('change',refresh);listener=()=>{};}
  };
}
