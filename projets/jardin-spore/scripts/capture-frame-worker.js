// Keep lossless frame encoding and uploads off the scene's main thread.
// One acknowledged frame is in flight at a time; no frame queue accumulates.
const canvas=new OffscreenCanvas(1024,1024),context=canvas.getContext('2d',{alpha:false});
self.onmessage=async({data:{bitmap,frame,receiver}})=>{
  try{
    context.drawImage(bitmap,0,0);bitmap.close();
    const blob=await canvas.convertToBlob({type:'image/png'});
    const response=await fetch(`${receiver}/frame/${frame}`,{method:'POST',body:await blob.arrayBuffer(),signal:AbortSignal.timeout(120000)});
    const receipt=await response.json();
    if(!response.ok)throw new Error(receipt.error||`Capture receiver ${response.status}`);
    self.postMessage({receipt});
  }catch(error){bitmap.close();self.postMessage({error:error.message});}
};
