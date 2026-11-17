import { setErrorSink } from './guard.js';
export function installFatalPanel() {
    let shown = false;
    const show = (name, error)=>{
        if (shown) return;
        shown = true;
        const panel = document.createElement('div');
        panel.className = 'fatal-banner';
        panel.setAttribute('role', 'alert');
        const detail = String(error?.message ?? error).replace(/[<>&]/g, '');
        panel.innerHTML = `<b>Une erreur est survenue (${name.replace(/[<>&]/g, '')}).</b> ${detail} <button type="button">Recharger</button>`;
        panel.querySelector('button').addEventListener('click', ()=>location.reload());
        document.body.appendChild(panel);
    };
    setErrorSink(show);
    window.addEventListener('error', (event)=>show('script', event.error ?? event.message));
    window.addEventListener('unhandledrejection', (event)=>show('promesse', event.reason));
}
