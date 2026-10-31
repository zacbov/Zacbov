const vm=require('vm'),fs=require('fs');
let code=fs.readFileSync('/tmp/main.js','utf8');
code+=`
;globalThis.__test=function(){
  const out=[];
  for(const id of ORDRE_NIVEAUX){
    try{
      Jeu.phase='lobby';
      choisirNiveau(id);
      if(!Jeu.joueurs.size){ for(let i=0;i<2;i++){ try{ accueillir("pad"+i,"J"+i,null,null);}catch(e){out.push('ajout '+id+': '+e.message);} } }
      demarrer();
      for(let f=0;f<9000;f++){ __t+=33; boucle(); }
      out.push(id+' OK phase='+Jeu.phase);
    }catch(e){ out.push(id+' ERR '+e.stack.split('\\n').slice(0,4).join(' | ')); }
  }
  return out;
};`;
function mk(name){
  const f=function(){};
  return new Proxy(f,{
    get(t,k){ if(k===Symbol.toPrimitive) return ()=>0; if(k==='then') return undefined;
      if(k==='length') return 0; if(k===Symbol.iterator) return function*(){};
      if(!(k in t)) t[k]=mk(name+'.'+String(k)); return t[k]; },
    set(t,k,v){t[k]=v;return true;},
    apply(){return mk(name+'()');},
    construct(){return mk('new '+name);},
  });
}
let raf=[];
const ctx={console,Math,Date,JSON,Object,Array,Number,String,Boolean,Map,Set,Promise,parseFloat,parseInt,isNaN,Float32Array,Uint8Array,Uint8ClampedArray,Float64Array,Int32Array,Uint32Array,ArrayBuffer,Error,RegExp,Symbol,
 setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},
 requestAnimationFrame:(f)=>{return 1},
 __t:1000,
 THREE:mk('THREE'),document:mk('document'),location:{origin:'https://x',pathname:'/index.html',search:'',host:'x',protocol:'https:',href:'https://x/'},
 navigator:{},WebSocket:function(){return mk('ws')},URLSearchParams,AudioContext:function(){return mk('ac')},
 localStorage:{getItem(){return null},setItem(){}},QRCode:mk('QR'),Image:function(){return mk('img')},
 innerWidth:1280,innerHeight:720,devicePixelRatio:1,addEventListener(){},
};
ctx.performance={now:()=>ctx.__t};
ctx.window=ctx;ctx.globalThis=ctx;
vm.createContext(ctx);
try{
  vm.runInContext(code,ctx,{timeout:20000});
  console.log('LOAD OK');
}catch(e){console.log('LOAD ERR',e.stack.split('\n').slice(0,5).join('\n'));process.exit()}

// ---------- Faux navigateur pour la manette ----------
class El{
  constructor(t){this.tag=t;this.children=[];this.style={setProperty(){}};this.className='';this.handlers={};this.hidden=false;this._in='';this.textContent='';this.attrs={};this.value='';this.src='';
    this.classList={add:()=>{},remove:()=>{},toggle:()=>{},contains:()=>false};}
  appendChild(c){this.children.push(c);return c}
  addEventListener(n,f){(this.handlers[n]=this.handlers[n]||[]).push(f)}
  set innerHTML(v){this.children=[];this._in=v} get innerHTML(){return this._in}
  querySelector(){return new El('q')} setAttribute(k,v){this.attrs[k]=v}
  getBoundingClientRect(){return{left:0,top:0,width:100,height:100}}
  click(){(this.handlers.click||[]).forEach(f=>f({preventDefault(){}}))}
}
const els={}; const doc={getElementById:(id)=>els[id]||(els[id]=new El(id)),createElement:(t)=>new El(t),addEventListener(){},documentElement:{style:{setProperty(){}}}};
let wsPad=null; const envoyesPad=[];
class FakeWS{constructor(u){wsPad=this;this.readyState=1;setTimeout(()=>{},0)} send(x){envoyesPad.push(JSON.parse(x))}}
const ctxC={console,JSON,Math,Date,Object,Array,Number,String,Boolean,parseInt,parseFloat,Promise,Set,Map,RegExp,Error,
  document:doc,localStorage:{getItem:()=>null,setItem(){}},location:{search:'?room=ABCD',protocol:'https:',host:'x'},
  WebSocket:FakeWS,navigator:{},performance:{now:()=>0},setInterval(){},setTimeout(){return 0},clearTimeout(){},
  URLSearchParams,Image:function(){},FileReader:function(){},window:{addEventListener(){}},addEventListener(){}};
ctxC.window=ctxC;
vm.createContext(ctxC);
vm.runInContext(fs.readFileSync('/tmp/ctrl.js','utf8'),ctxC);
els['salon'].value='ABCD'; els['nom'].value='Anna';
els['rejoindre'].click(); wsPad.onopen();

// ---------- Boucle relais simulée (host <-> pad) ----------
const verif=[];
vm.runInContext(`
  var __pour=[]; sock={readyState:1,send:(x)=>__pour.push(JSON.parse(x))};
  Jeu.joueurs.clear(); Jeu.phase='lobby'; choisirNiveau('labo');
  accueillir('tel0','Anna',null,null); accueillir('tel1','Ben',null,null);
`,ctx);
function hostVersPad(){ const q=vm.runInContext('__pour.splice(0)',ctx); q.filter(m=>m.to==='tel0').forEach(m=>wsPad.onmessage({data:JSON.stringify(m)})); return q; }
hostVersPad();
verif.push('bouton Apparence visible='+(els['btApparence'].hidden===false));
verif.push('accessoires='+els['persoAcc'].children.length+' coloris='+els['persoCol'].children.length);
verif.push('coloris sélectionné='+(els['persoNomCol'].textContent));
// Anna clique « Haut-de-forme »
els['persoAcc'].children[1].click();
const msg1=envoyesPad.pop(); verif.push('envoi='+JSON.stringify(msg1));
ctx.__m=Object.assign({id:'tel0'},msg1); vm.runInContext('persoDepuisManette(__m)',ctx); hostVersPad();
verif.push('hôte: accessoire Anna='+vm.runInContext("[...Jeu.joueurs.values()].find(j=>j.nom==='Anna').accessoireId",ctx));
// Anna tente un coloris déjà pris par Ben (violet, index 5)
const idxViolet=5; els['persoCol'].children[idxViolet].click();
verif.push('clic sur coloris pris -> envoi='+(envoyesPad.length?JSON.stringify(envoyesPad.pop()):'aucun (grisé)'));
// Anna choisit orange (index 6)
els['persoCol'].children[6].click(); const msg2=envoyesPad.pop();
ctx.__m=Object.assign({id:'tel0'},msg2); vm.runInContext('persoDepuisManette(__m)',ctx); hostVersPad();
verif.push('hôte: coloris Anna='+vm.runInContext("[...Jeu.joueurs.values()].find(j=>j.nom==='Anna').coloris",ctx)+' nom affiché='+els['persoNomCol'].textContent);
// Début de partie
vm.runInContext('demarrer()',ctx); hostVersPad();
verif.push('partie lancée -> bouton caché='+els['btApparence'].hidden+' panneau caché='+els['perso'].hidden);
console.log(verif.join('\n'));
