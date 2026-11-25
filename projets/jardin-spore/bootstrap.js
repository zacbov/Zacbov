// Démarrage robuste : import dynamique (un CDN inaccessible ou un module cassé affiche une erreur lisible au lieu d'une page blanche).
const fail=error=>{
  console.error(error);
  if(window.__loader)return window.__loader.fail(error);
  const d=document.createElement('div');
  d.style.cssText='position:fixed;inset:0;z-index:99;display:grid;place-items:center;background:#050805;color:#f0a09a;font:14px/1.6 monospace;padding:24px;text-align:center';
  d.innerHTML='<div>Impossible de démarrer : '+((error&&error.message)||error)+'<br><br><button onclick="location.reload()" style="padding:7px 20px;border-radius:18px;border:1px solid #6a5a44;background:transparent;color:#f1d8b0;font:inherit;cursor:pointer">Réessayer</button></div>';
  document.body.appendChild(d);
};
addEventListener('unhandledrejection',e=>fail(e.reason));
import('./main.js').then(m=>m.startExperiment()).catch(fail);
