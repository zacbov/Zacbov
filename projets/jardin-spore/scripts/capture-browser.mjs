// Optional recorder for a dedicated Chrome instance. Uses Node's built-in
// WebSocket and never enables network inspection for the large frame uploads.
import { setTimeout as delay } from 'node:timers/promises';

export async function connectPage(port=9226){
  const pages=await(await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const page=pages.find(p=>p.type==='page'&&p.url.startsWith('http://localhost:8016/'));
  if(!page)throw new Error('Open http://localhost:8016/ in the recording browser first');
  const socket=new WebSocket(page.webSocketDebuggerUrl),pending=new Map();let id=0;
  await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
  socket.onmessage=({data})=>{
    const message=JSON.parse(data),request=pending.get(message.id);
    if(request){pending.delete(message.id);message.error?request.reject(new Error(message.error.message)):request.resolve(message.result);}
  };
  socket.onclose=()=>{for(const p of pending.values())p.reject(new Error('Recording browser disconnected'));pending.clear();};
  const send=(method,params={})=>new Promise((resolve,reject)=>{
    const current=++id;pending.set(current,{resolve,reject});socket.send(JSON.stringify({id:current,method,params}));
  });
  const evaluate=async expression=>{
    const result=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});
    if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);
    return result.result.value;
  };
  return {send,evaluate,close:()=>socket.close()};
}

if(import.meta.url===new URL(process.argv[1],'file:').href){
  const port=Number(process.argv[2]||9226),receiver=process.argv[3]||'http://127.0.0.1:8036';
  const browser=await connectPage(port);
  try{
    await browser.send('Emulation.setDeviceMetricsOverride',{width:1024,height:1024,deviceScaleFactor:1,mobile:false});
    await browser.evaluate(`(async()=>{for(let i=0;i<240&&!window.spore;i++)await new Promise(r=>setTimeout(r,250));
      if(!window.spore)throw new Error('Spore failed to initialize');
      for(let i=0;i<240&&!document.querySelector('#status').hidden;i++)await new Promise(r=>setTimeout(r,250));
      window.capturePromise=(await import('./scripts/capture-video.js')).captureVideo({receiver:${JSON.stringify(receiver)}});
      capturePromise.catch(console.error);return true;})()`);
    for(;;){
      await delay(5000);
      const progress=await browser.evaluate('({status:captureProgress.status,frame:captureProgress.frame,total:captureProgress.totalFrames,error:captureProgress.error,result:captureProgress.result})');
      console.log(JSON.stringify(progress));
      if(progress.status==='complete'){await browser.evaluate('capturePromise');break;}
      if(['failed','cancelled'].includes(progress.status))throw new Error(progress.error);
    }
  }finally{
    await browser.send('Emulation.clearDeviceMetricsOverride').catch(()=>{});
    browser.close(); // Leave Chrome and the development server running.
  }
}
