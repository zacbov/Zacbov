import * as THREE from 'three/webgpu';

// Écran de chargement : barre de progression, étape en cours, attente des textures/modèles en réseau,
// affichage d'une erreur claire avec bouton « Réessayer ». Les étapes lourdes rendent la main au navigateur
// entre deux blocs (report() attend une image) pour que la page reste fluide et ne soit jamais signalée comme bloquée.
const CSS=`#loader{position:fixed;inset:0;z-index:50;display:grid;place-items:center;background:#050805;color:#d8e8cc;font-family:Georgia,'Times New Roman',serif;transition:opacity .9s ease}
#loader.out{opacity:0;pointer-events:none}#loader .box{width:min(440px,82vw);text-align:center}
#loader h1{margin:0 0 26px;font:500 13px/1 Georgia,serif;letter-spacing:.34em;text-transform:uppercase;color:#e4f2d8}
#loader .bar{height:2px;border-radius:2px;background:#ffffff1f;overflow:hidden}#loader .fill{height:100%;width:0;background:linear-gradient(90deg,#7ec962,#e9a84a);transition:width .4s ease}
#loader .row{display:flex;justify-content:space-between;gap:12px;margin-top:12px;font:11px/1.4 monospace;letter-spacing:.06em;color:#8fae84}
#loader .tip{margin-top:34px;font-size:12px;line-height:1.7;color:#6b7f62}
#loader.err .fill{background:#d9534f}#loader.err .row{color:#f0a09a}#loader button{display:none;margin-top:22px;padding:7px 20px;border-radius:18px;border:1px solid #6a5a44;background:transparent;color:#f1d8b0;font:inherit;letter-spacing:.1em;cursor:pointer}#loader.err button{display:inline-block}
#status{display:none!important}`;
const nextFrame=()=>new Promise(r=>requestAnimationFrame(()=>setTimeout(r,0)));
export function createLoader(){
  const st=document.createElement('style');st.textContent=CSS;document.head.appendChild(st);
  const el=document.createElement('div');el.id='loader';
  el.innerHTML='<div class="box"><h1>Jardin des simples</h1><div class="bar"><div class="fill"></div></div><div class="row"><span class="lab">Démarrage…</span><span class="pct">0 %</span></div><div class="tip">Glisser pour tourner · molette pour approcher<br>Le curseur d’heure fait passer du jour à la nuit</div><button>Réessayer</button></div>';
  document.body.appendChild(el);el.querySelector('button').onclick=()=>location.reload();
  const fill=el.querySelector('.fill'),lab=el.querySelector('.lab'),pct=el.querySelector('.pct');let shown=0,pending=0,waiters=[],failed=false;
  // Tout ce que Three.js charge par le réseau (textures d'écorce et de feuilles, modèles GLB, carte de normales de l'eau) est suivi ici.
  const M=THREE.DefaultLoadingManager;M.onStart=()=>{pending=1};M.onLoad=()=>{pending=0;waiters.splice(0).forEach(f=>f())};
  const idle=()=>new Promise(r=>{if(!pending)return r();waiters.push(r);setTimeout(r,20000)});   // au plus 20 s d'attente réseau
  setTimeout(()=>{if(!failed&&document.body.contains(el)&&!el.classList.contains('out'))el.querySelector('.tip').textContent='Le chargement est long : connexion lente ou GPU très sollicité. Patiente encore un peu, ou recharge la page.'},45000);
  return{
    async report(p,label){if(failed)return;shown=Math.max(shown,p);fill.style.width=(shown*100).toFixed(1)+'%';pct.textContent=Math.round(shown*100)+' %';if(label)lab.textContent=label;await nextFrame()},
    idle,
    async done(){if(failed)return;await idle();await this.report(1,'Prêt');await nextFrame();await nextFrame();el.classList.add('out');setTimeout(()=>el.remove(),1200)},
    fail(err){failed=true;el.classList.remove('out');el.classList.add('err');lab.textContent=(err&&err.message)||String(err);pct.textContent='Erreur';console.error(err)}
  };
}
