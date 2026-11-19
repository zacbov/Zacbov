import test from 'node:test';
import assert from 'node:assert/strict';
import { createDisplayOutput } from '../display-output.js';

function fixture({high=false,supported=true,rejectHDR=false}={}){
  const query=new EventTarget();query.matches=high;
  query.change=high=>{query.matches=high;query.dispatchEvent(new Event('change'));};
  let config={format:'rgba16float',...(supported?{toneMapping:{mode:'extended'}}:{})};
  const calls=[];
  const context={getConfiguration:()=>config,configure(next){
    if(rejectHDR&&next.toneMapping.mode==='extended')throw new Error('Unsupported HDR');
    config=next;calls.push(next);
  }};
  const output=createDisplayOutput({backend:{context}},query);
  return {output,query,context,calls};
}

test('automatic HDR requires both display and canvas support and follows display changes',()=>{
  const {output,query,context}=fixture();
  assert.equal(output.headroom,1);assert.equal(context.getConfiguration().toneMapping.mode,'standard');
  query.change(true);
  assert.equal(output.active,true);assert.equal(output.headroom,4);assert.equal(context.getConfiguration().toneMapping.mode,'extended');
  query.change(false);assert.equal(output.active,false);assert.equal(output.headroom,1);
  output.dispose();query.change(true);assert.equal(output.active,false);
});

test('SDR override survives display changes while automatic restores HDR',()=>{
  const {output,query}=fixture({high:true});
  output.setPeak(6);assert.equal(output.headroom,6);
  output.setMode('sdr');query.change(false);query.change(true);assert.equal(output.headroom,1);
  output.setMode('auto');assert.equal(output.headroom,6);
  output.setPeak(100);assert.equal(output.peak,8);
  assert.throws(()=>output.setPeak(NaN));assert.throws(()=>output.setMode('invalid'));
  output.dispose();
});

test('missing browser HDR support keeps the SDR curve even on a capable display',()=>{
  const {output,calls}=fixture({high:true,supported:false});
  assert.equal(output.active,false);assert.equal(output.supported,false);assert.equal(output.headroom,1);
  assert.equal(calls.length,0);output.dispose();
});

test('a failed HDR presentation change falls back to SDR',()=>{
  const {output,query,context}=fixture({rejectHDR:true});
  query.change(true);assert.equal(output.active,false);assert.equal(output.headroom,1);
  assert.equal(context.getConfiguration().toneMapping.mode,'standard');output.dispose();
});
