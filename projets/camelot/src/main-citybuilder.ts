import './styles/camelot.css'
import { installFatalPanel } from './engine/fatal'
import { setFlags } from './render/flags'
import { guard } from './engine/guard'
import { Input } from './engine/input'
import { GameLoop } from './engine/loop'
import { parseParams } from './engine/params'
import { DynamicResolution, lowerQuality } from './engine/quality'
import { Renderer, suggestQuality } from './engine/renderer'
import { SAVE_KEY, SaveStore } from './engine/save'
import { loadGameData } from './game/camelot-rules'
import { CamelotCity } from './game/camelot-world'
import { CamelotUI } from './ui/camelot-ui'

installFatalPanel()

/** Compteur d'images (?fps=1) : temps moyen par image, échelle de rendu et niveau de qualité. */
function installMeter(renderer: Renderer, level: () => string): (ms: number) => void {
  const node = document.createElement('div')
  node.className = 'fps-meter'
  document.body.appendChild(node)
  let sum = 0, frames = 0, last = performance.now()
  return ms => {
    sum += ms
    frames += 1
    const now = performance.now()
    if (now - last < 500) return
    node.textContent = `${(sum / frames).toFixed(1)} ms · échelle ${renderer.scale.toFixed(1)} · qualité ${level()}`
    sum = 0
    frames = 0
    last = now
  }
}

async function boot(): Promise<void> {
  const canvas = document.querySelector<HTMLCanvasElement>('#game')
  const root = document.getElementById('ui')
  if (!canvas || !root) throw new Error('La scène de Camelot est introuvable.')
  document.documentElement.lang = 'fr'
  const params = parseParams(location.search)

  const save = new SaveStore()
  let firstRun = false
  try { firstRun = !localStorage.getItem(SAVE_KEY) } catch { /* stockage indisponible */ }
  if (firstRun && !params.quality) save.update({ quality: suggestQuality() })
  let level = params.quality ?? save.data.quality

  setFlags({ light: params.light, ao: params.ao, tex: params.tex && level !== 'low', grade: params.grade, exposure: params.exposure, soft: params.soft })
  const renderer = new Renderer(canvas, level, { bloom: params.bloom })
  const input = new Input(canvas)
  await loadGameData()
  const city = new CamelotCity(canvas, renderer, input)
  city.seed = params.seed ?? 1
  city.fixedTime = params.heure
  city.debugSeason = params.saison
  city.exposureKey = params.key
  const ui = new CamelotUI(root, city)
  ui.setLoading(0.04, 'Le conseil prépare les plans…')

  try {
    await city.load((fraction, label) => ui.setLoading(fraction, label))
  } catch (error) {
    console.error(error)
    ui.failure('Le jeu n’a pas pu être préparé. Rechargez la page et réessayez.')
    ui.dispose()
    city.dispose()
    renderer.dispose()
    return
  }
  if (params.vue) city.debugView(params.vue)
  ui.ready()

  const meter = params.fps ? installMeter(renderer, () => level) : null
  const dynamic = new DynamicResolution(performance.now() / 1000)
  const loop = new GameLoop({
    beforeFrame: frameSeconds => guard('entrées', () => input.update(frameSeconds)),
    step: dt => city.step(dt),
    render: (alpha, frameSeconds) => {
      guard('rendu', () => city.render(alpha, frameSeconds))
      meter?.(frameSeconds * 1000)
      if (!params.dynamicResolution || loop.paused) return
      const result = dynamic.push(frameSeconds * 1000, performance.now() / 1000)
      if (result.scale !== renderer.scale) renderer.setRenderScale(result.scale)
      if (result.downgrade && lowerQuality(level) !== level) {
        level = lowerQuality(level)
        renderer.applyQuality(level)
        renderer.setRenderScale(1)
        city.bus.emit('toast', `Qualité abaissée (${level}) pour garder la fluidité.`, 'warn')
      }
    },
  })
  loop.start()
  document.addEventListener('visibilitychange', () => { loop.paused = document.hidden })
  window.addEventListener('pagehide', () => {
    loop.stop()
    ui.dispose()
    city.dispose()
    renderer.dispose()
  }, { once: true })
  ;(window as unknown as { __game: unknown }).__game = { game: city, ui, input, save, params }
}

boot().catch(showFatal)

function showFatal(error: unknown): void {
  console.error(error)
  const root = document.getElementById('ui')
  if (root) {
    root.innerHTML = `<div class="fatal-error" role="alert"><p>${escapeText((error as Error)?.message ?? String(error))}</p><button class="primary-button" type="button" data-retry>Réessayer</button></div>`
    root.querySelector<HTMLButtonElement>('[data-retry]')?.addEventListener('click', () => {
      root.replaceChildren()
      boot().catch(showFatal)
    }, { once: true })
  }
}

function escapeText(value: string): string {
  return value.replace(/[<>&]/g, character => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[character]!)
}
