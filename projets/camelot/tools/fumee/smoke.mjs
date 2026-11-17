// Test de fumée : exécute la couche 3D du jeu sans navigateur, avec un faux Three.js (voir ghost.mjs).
// Usage : node --import ./tools/fumee/register.mjs tools/fumee/smoke.mjs (après node tools/construire.mjs)
import fs from 'node:fs'
import path from 'node:path'
import { ghost } from './ghost.mjs'
const root = new URL('../../jeu', import.meta.url).pathname
const storage = new Map()
globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, String(value)), removeItem: key => storage.delete(key) }
globalThis.window = { addEventListener() {}, removeEventListener() {}, devicePixelRatio: 1 }
globalThis.document = { createElement: () => ({ getContext: () => ghost(), width: 0, height: 0 }), getElementById: () => null }
globalThis.fetch = async url => ({ json: async () => JSON.parse(fs.readFileSync(path.join(root, url), 'utf8')) })
const rules = await import(new URL('../../jeu/js/game/camelot-rules.js', import.meta.url).href)
await rules.loadGameData()
const { CamelotCity } = await import(new URL('../../jeu/js/game/camelot-world.js', import.meta.url).href)
const toasts = []
const city = new CamelotCity(ghost(), { render() {}, shadowMapSize: 1024 }, { move: { x: 0, y: 0 }, dispose() {} })
globalThis.HTMLElement = class {}
globalThis.HTMLButtonElement = class {}
window.setTimeout = () => 0
window.clearTimeout = () => {}
const { CamelotUI } = await import(new URL('../../jeu/js/ui/camelot-ui.js', import.meta.url).href)
const ui = new CamelotUI(ghost(), city)
// L'interface prend les rappels du monde ; on les enveloppe pour garder une trace et résoudre les événements.
city.bus.on('toast', (text, kind) => toasts.push(`[${kind}] ${text}`))
city.bus.on('event', () => {
  const affordable = choice => Object.entries(choice.effects).every(([key, value]) => !(['wood', 'stone', 'food', 'gold'].includes(key) && value < 0 && city.state.resources[key] + value < 0))
  city.resolveEvent(Math.max(0, city.pendingEvent.choices.findIndex(affordable)))
})
city.bus.on('ending', id => toasts.push(`FIN : ${id}`))
city.bus.on('defeat', reason => toasts.push(`DÉFAITE : ${reason}`))
await city.load(() => {})
const { CENTER } = rules
const click = (kind, dx, dz) => {
  city.selectBuilding(kind)
  city.setTool('build')
  city.selectBuilding(kind)
  city.hoverCell = { x: CENTER + dx, z: CENTER + dz }
  city.handleCanvasClick({ button: 0 })
}
let frames = 0, spent = 0, worst = 0
const wait = seconds => { for (let i = 0; i < seconds; i += 1) { const start = performance.now(); city.step(1); city.render(1, 0.016); const took = performance.now() - start; spent += took; worst = Math.max(worst, took); frames += 1 } }
click('farm', 2, -1); click('sawmill', 3, 1); click('road', -3, -1); click('road', -3, -2); click('quarry', -4, -2)
wait(60)
city.setOverlay('logistics'); city.setOverlay('sectors'); city.setOverlay('resources'); city.setOverlay('wear'); city.setOverlay('none')
click('keep', 1, 2); click('market', -1, -3); click('warehouse', 3, -2)
wait(120)
for (const tool of ['upgrade', 'repair', 'demolish', 'move']) {
  city.setTool(tool); city.hoverCell = { x: CENTER + 2, z: CENTER - 1 }; city.handleCanvasClick({ button: 0 }); city.updateHover?.()
}
city.setTool('move'); city.hoverCell = { x: CENTER + 3, z: CENTER - 1 }; city.handleCanvasClick({ button: 0 })
city.setTool('view'); city.setSpeed(0); city.setSpeed(3); city.setBuilderShare(0.75); city.cyclePriority('food')
for (const action of ['recruit', 'fortify', 'mend', 'sortie', 'barricade', 'hold']) city.defend(action)
for (const spell of ['moisson', 'muraille', 'serenite']) city.castSpell(spell)
city.trade('sell', 'stone'); city.trade('buy', 'wood')
city.sendExpedition('gauvain', 'forest'); city.sendExpedition('tristan', 'ruins')
city.adoptLaw('corvee')
wait(600)
console.log('SMOKE OK — cycle', city.state.tick, '| chapitre', city.story.era, '| bâtiments', city.state.buildings.length, '| ressources', JSON.stringify(city.state.resources))
console.log(toasts.slice(-14).join('\n'))
console.log('--- diagnostic')
console.log('bâtiments :', city.state.buildings.filter(b => b.kind !== 'road').map(b => `${b.kind}${rules.isComplete(b) ? '' : '(chantier)'}`).join(', '))
console.log('événements vus :', city.story.seen.length, city.story.seen.join(','))
console.log('toasts d’échec :', toasts.filter(t => t.startsWith('[warn]')).slice(0, 12).join(' | '))
console.log('lost :', city.state.lost, '| humeur', JSON.stringify(city.state.mood), '| murs', JSON.stringify(city.state.walls), '| garnison', city.state.garrison)

if (city.state.buildings.length < 10) { console.error('Le test de fumée n’a presque rien construit : quelque chose cloche.'); process.exit(1) }

// --- interface : cartes et clics simulés (le faux DOM accepte tout ; on vérifie qu'aucune erreur ne se produit)
const uiClick = dataset => ui.handleClick({ target: { closest: () => ({ dataset }) } })
for (const method of ['showCodex', 'showTable', 'showDefense', 'showExpeditions', 'showTrade', 'update']) ui[method]()
ui.showEnding('avalon'); ui.showEnding('salesbieres'); ui.showDefeat('walls'); ui.showDefeat('hope')
for (const dataset of [
  { build: 'farm' }, { build: 'keep' }, { tool: 'view' }, { tool: 'build' }, { tool: 'upgrade' }, { tool: 'repair' }, { tool: 'move' }, { tool: 'demolish' }, { tool: 'view' },
  { overlay: 'logistics' }, { overlay: 'sectors' }, { overlay: 'resources' }, { overlay: 'wear' }, { overlay: 'none' },
  { speed: '0' }, { speed: '2' }, { share: '0.25' }, { priority: 'materials' },
  { defense: 'recruit' }, { defense: 'fortify' }, { defense: 'mend' }, { defense: 'sortie' },
  { trade: 'sell:stone' }, { trade: 'buy:food' }, { expedition: 'perceval:village' }, { law: 'dime' }, { spell: 'serenite' },
  { action: 'codex' }, { action: 'table' }, { action: 'trade' }, { action: 'expeditions' }, { action: 'defense' }, { action: 'close-card' },
]) uiClick(dataset)
ui.hint('test', 10, 10); ui.hint(null, 0, 0); ui.setLoading(0.5, 'test'); ui.ready()
console.log('INTERFACE OK')
console.log(`MESURE (logique seule, sans GPU) : ${(spent / frames).toFixed(2)} ms par image en moyenne, pire image ${worst.toFixed(2)} ms, sur ${frames} images`)
