import { installFatalPanel } from './engine/fatal.js';
import { setFlags } from './render/flags.js';
import { guard } from './engine/guard.js';
import { Input } from './engine/input.js';
import { GameLoop } from './engine/loop.js';
import { parseParams } from './engine/params.js';
import { DynamicResolution, lowerQuality } from './engine/quality.js';
import { Renderer, suggestQuality } from './engine/renderer.js';
import { SAVE_KEY, SaveStore } from './engine/save.js';
import { loadGameData } from './game/camelot-rules.js';
import { CamelotCity } from './game/camelot-world.js';
import { CamelotUI } from './ui/camelot-ui.js';
installFatalPanel();
function installMeter(renderer, level) {
    const node = document.createElement('div');
    node.className = 'fps-meter';
    document.body.appendChild(node);
    let sum = 0, frames = 0, last = performance.now();
    return (ms)=>{
        sum += ms;
        frames += 1;
        const now = performance.now();
        if (now - last < 500) return;
        node.textContent = `${(sum / frames).toFixed(1)} ms · échelle ${renderer.scale.toFixed(1)} · qualité ${level()}`;
        sum = 0;
        frames = 0;
        last = now;
    };
}
async function boot() {
    const canvas = document.querySelector('#game');
    const root = document.getElementById('ui');
    if (!canvas || !root) throw new Error('La scène de Camelot est introuvable.');
    document.documentElement.lang = 'fr';
    const params = parseParams(location.search);
    const save = new SaveStore();
    let firstRun = false;
    try {
        firstRun = !localStorage.getItem(SAVE_KEY);
    } catch  {}
    if (firstRun && !params.quality) save.update({
        quality: suggestQuality()
    });
    let level = params.quality ?? save.data.quality;
    setFlags({
        light: params.light,
        ao: params.ao,
        tex: params.tex && level !== 'low',
        grade: params.grade,
        exposure: params.exposure,
        soft: params.soft
    });
    const renderer = new Renderer(canvas, level, {
        bloom: params.bloom
    });
    const input = new Input(canvas);
    await loadGameData();
    const city = new CamelotCity(canvas, renderer, input);
    city.seed = params.seed ?? 1;
    city.fixedTime = params.heure;
    city.debugSeason = params.saison;
    city.exposureKey = params.key;
    const ui = new CamelotUI(root, city);
    ui.setLoading(0.04, 'Le conseil prépare les plans…');
    try {
        await city.load((fraction, label)=>ui.setLoading(fraction, label));
    } catch (error) {
        console.error(error);
        ui.failure('Le jeu n’a pas pu être préparé. Rechargez la page et réessayez.');
        ui.dispose();
        city.dispose();
        renderer.dispose();
        return;
    }
    if (params.vue) city.debugView(params.vue);
    ui.ready();
    const meter = params.fps ? installMeter(renderer, ()=>level) : null;
    const dynamic = new DynamicResolution(performance.now() / 1000);
    const loop = new GameLoop({
        beforeFrame: (frameSeconds)=>guard('entrées', ()=>input.update(frameSeconds)),
        step: (dt)=>city.step(dt),
        render: (alpha, frameSeconds)=>{
            guard('rendu', ()=>city.render(alpha, frameSeconds));
            meter?.(frameSeconds * 1000);
            if (!params.dynamicResolution || loop.paused) return;
            const result = dynamic.push(frameSeconds * 1000, performance.now() / 1000);
            if (result.scale !== renderer.scale) renderer.setRenderScale(result.scale);
            if (result.downgrade && lowerQuality(level) !== level) {
                level = lowerQuality(level);
                renderer.applyQuality(level);
                renderer.setRenderScale(1);
                city.bus.emit('toast', `Qualité abaissée (${level}) pour garder la fluidité.`, 'warn');
            }
        }
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
        save,
        params
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
