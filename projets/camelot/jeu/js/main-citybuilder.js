import { Input } from './engine/input.js';
import { GameLoop } from './engine/loop.js';
import { Renderer } from './engine/renderer.js';
import { SaveStore } from './engine/save.js';
import { loadGameData } from './game/camelot-rules.js';
import { CamelotCity } from './game/camelot-world.js';
import { CamelotUI } from './ui/camelot-ui.js';
async function boot() {
    const canvas = document.querySelector('#game');
    const root = document.getElementById('ui');
    if (!canvas || !root) throw new Error('La scène de Camelot est introuvable.');
    document.documentElement.lang = 'fr';
    const save = new SaveStore();
    const renderer = new Renderer(canvas, save.data.quality);
    const input = new Input(canvas);
    await loadGameData();
    const city = new CamelotCity(canvas, renderer, input);
    const ui = new CamelotUI(root, city);
    ui.setLoading(0.04, 'Le conseil prépare les plans…');
    try {
        await city.load((fraction, label)=>ui.setLoading(fraction, label));
    } catch (error) {
        console.error(error);
        ui.failure('Un asset du jeu n’a pas pu être chargé. Vérifiez la connexion et réessayez.');
        ui.dispose();
        city.dispose();
        renderer.dispose();
        return;
    }
    ui.ready();
    const loop = new GameLoop({
        beforeFrame: (frameSeconds)=>input.update(frameSeconds),
        step: (dt)=>city.step(dt),
        render: (alpha, frameSeconds)=>city.render(alpha, frameSeconds)
    });
    loop.start();
    document.addEventListener('visibilitychange', ()=>{
        loop.paused = document.hidden;
    });
    window.addEventListener('pagehide', ()=>{
        loop.stop();
        ui.dispose();
        city.dispose();
        renderer.dispose();
    }, {
        once: true
    });
    window.__game = {
        game: city,
        ui,
        input,
        save
    };
}
boot().catch(showFatal);
function showFatal(error) {
    console.error(error);
    const root = document.getElementById('ui');
    if (root) {
        root.innerHTML = `<div class="fatal-error" role="alert"><p>${escapeText(error?.message ?? String(error))}</p><button class="primary-button" type="button" data-retry>Réessayer</button></div>`;
        root.querySelector('[data-retry]')?.addEventListener('click', ()=>{
            root.replaceChildren();
            boot().catch(showFatal);
        }, {
            once: true
        });
    }
}
function escapeText(value) {
    return value.replace(/[<>&]/g, (character)=>({
            '<': '&lt;',
            '>': '&gt;',
            '&': '&amp;'
        })[character]);
}
