import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { assembleHtml, inlineFonts } from '../tools/assembler-html.mjs'
import { readData } from '../src/engine/data'
import { EventBus } from '../src/engine/events'
import { guard, reportOnce, resetGuard, setErrorSink } from '../src/engine/guard'
import { parseParams } from '../src/engine/params'
import { DynamicResolution, chooseQuality, lowerQuality } from '../src/engine/quality'
import { bevelBox, hexToRgb, mergeMeshes, placeMesh, seededRandom, tintMesh } from '../src/render/shapes'

describe('bus d’événements et gardes', () => {
  it('le bus livre les événements, se désabonne, et isole les erreurs des écouteurs', () => {
    const bus = new EventBus()
    const seen: unknown[] = []
    const off = bus.on('toast', (text: string, tone: string) => seen.push([text, tone]))
    bus.on('toast', () => { throw new Error('écouteur en panne') })
    const mirror: unknown[] = []
    bus.on('toast', (text: string) => mirror.push(text))
    const errors: string[] = []
    setErrorSink(name => errors.push(name))
    resetGuard()
    console.error = () => {}
    bus.emit('toast', 'bonjour', 'good')
    bus.emit('toast', 'encore', 'warn')
    off()
    bus.emit('toast', 'sans écouteur', 'good')
    expect(seen).toEqual([['bonjour', 'good'], ['encore', 'warn']])
    expect(mirror).toEqual(['bonjour', 'encore', 'sans écouteur'])
    expect(errors).toEqual(['événement toast'])
  })

  it('une erreur n’est journalisée qu’une fois par sous-système', () => {
    const names: string[] = []
    setErrorSink(name => names.push(name))
    resetGuard()
    console.error = () => {}
    for (let i = 0; i < 5; i += 1) guard('effet', () => { throw new Error('boum') })
    guard('autre', () => { throw new Error('boum') })
    reportOnce('autre', new Error('encore'))
    expect(names).toEqual(['effet', 'autre'])
    setErrorSink(null)
  })
})

describe('paramètres d’URL et qualité', () => {
  it('lit les paramètres de débogage et ignore les valeurs invalides', () => {
    const defaults = { quality: null, dynamicResolution: true, bloom: true, fps: false, seed: null, light: true, ao: true, tex: true, grade: true, exposure: true, soft: true, vue: null, heure: null, saison: null, key: 0.32 }
    expect(parseParams('')).toEqual(defaults)
    expect(parseParams('?q=ultra&dyn=0&bloom=0&fps=1&seed=42.9')).toEqual({ ...defaults, quality: 'ultra', dynamicResolution: false, bloom: false, fps: true, seed: 42 })
    expect(parseParams('?light=0&ao=0&tex=0&grade=0&exposure=0&soft=0')).toMatchObject({ light: false, ao: false, tex: false, grade: false, exposure: false, soft: false })
    expect(parseParams('?vue=table&heure=0.3&saison=2.9&key=0.4')).toMatchObject({ vue: 'table', heure: 0.3, saison: 2, key: 0.4 })
    expect(parseParams('?heure=7&saison=9&key=abc')).toMatchObject({ heure: 1, saison: 3, key: 0.32 })
    expect(parseParams('?q=extreme&seed=abc').quality).toBe(null)
    expect(parseParams('?seed=abc').seed).toBe(null)
  })

  it('choisit la qualité de départ selon l’appareil', () => {
    expect(chooseQuality({ coarsePointer: true, gpu: 'NVIDIA GeForce RTX 4070' })).toBe('low')
    expect(chooseQuality({ coarsePointer: false, gpu: 'Intel(R) UHD Graphics 620' })).toBe('medium')
    expect(chooseQuality({ coarsePointer: false, gpu: 'Mali-G78' })).toBe('medium')
    expect(chooseQuality({ coarsePointer: false, gpu: 'Intel(R) Arc(TM) A770' })).toBe('high')
    expect(chooseQuality({ coarsePointer: false, gpu: '' })).toBe('high')
    expect([lowerQuality('ultra'), lowerQuality('low')]).toEqual(['high', 'low'])
  })
})

describe('résolution dynamique', () => {
  const feed = (dynamic: DynamicResolution, ms: number, frames: number, clock: { t: number }) => {
    let step = { scale: dynamic.scale, downgrade: false }
    for (let i = 0; i < frames; i += 1) { clock.t += ms / 1000; step = dynamic.push(ms, clock.t) }
    return step
  }

  it('ignore les 3,5 premières secondes, puis baisse par paliers et remonte après un délai qui double', () => {
    const clock = { t: 0 }, dynamic = new DynamicResolution(0)
    expect(feed(dynamic, 40, 80, clock).scale).toBe(1)
    expect(feed(dynamic, 16, 240, clock).scale).toBe(1)
    const untilChange = (ms: number) => { const from = dynamic.scale; for (let i = 0; i < 300 && dynamic.scale === from; i += 1) feed(dynamic, ms, 1, clock); return dynamic.scale }
    expect(untilChange(25)).toBe(0.9)
    expect(untilChange(25)).toBe(0.8)
    const dropAt = clock.t
    feed(dynamic, 10, 1500, clock)
    expect(clock.t - dropAt).toBeGreaterThan(14)
    expect(dynamic.scale).toBe(0.8)
    feed(dynamic, 10, 1000, clock)
    expect(dynamic.scale).toBeGreaterThan(0.8)
  })

  it('un temps très long baisse de 0,2, et deux passages au plancher demandent de rétrograder', () => {
    const clock = { t: 4 }, dynamic = new DynamicResolution(0)
    expect(feed(dynamic, 35, 45, clock).scale).toBe(0.8)
    expect(feed(dynamic, 35, 45, clock).scale).toBe(0.6)
    expect(feed(dynamic, 35, 45, clock).downgrade).toBe(false)
    const last = feed(dynamic, 35, 45, clock)
    expect(last).toEqual({ scale: 1, downgrade: true })
  })
})

describe('formes procédurales', () => {
  const box = bevelBox(2, 1, 0.5, 0.05)

  it('la boîte chanfreinée a les bonnes dimensions, des normales unitaires et des faces tournées vers l’extérieur', () => {
    expect(box.positions.length / 3).toBe(96)
    expect(box.indices.length).toBe(132)
    const axis = (k: number) => box.positions.filter((_, i) => i % 3 === k)
    expect([Math.max(...axis(0)), Math.min(...axis(1)), Math.max(...axis(2))]).toEqual([1, -0.5, 0.25])
    for (let i = 0; i < box.normals.length; i += 3) expect(Math.abs(Math.hypot(box.normals[i], box.normals[i + 1], box.normals[i + 2]) - 1) < 1e-9).toBe(true)
    for (let t = 0; t < box.indices.length; t += 3) {
      const [a, b, c] = [box.indices[t], box.indices[t + 1], box.indices[t + 2]].map(index => box.positions.slice(index * 3, index * 3 + 3))
      const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]
      const cross = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]
      const n = box.normals.slice(box.indices[t] * 3, box.indices[t] * 3 + 3)
      expect(cross[0] * n[0] + cross[1] * n[1] + cross[2] * n[2] > 0).toBe(true)
    }
    expect(box.uvs.length / 2).toBe(96)
  })

  it('placer, teinter et fusionner', () => {
    const moved = placeMesh(box, 5, 1, -2, Math.PI / 2)
    const axis = (k: number) => moved.positions.filter((_, i) => i % 3 === k)
    expect(Math.abs(Math.max(...axis(0)) - 5.25) < 1e-9 && Math.abs(Math.max(...axis(2)) - -1) < 1e-9).toBe(true)
    const random = seededRandom(7)
    const first = random()
    expect(first >= 0 && first < 1 && seededRandom(7)() === first && seededRandom(8)() !== first).toBe(true)
    const tinted = tintMesh(box, hexToRgb('#808080'), 0.1, seededRandom(3))
    expect(tinted.colors[0]).toBeGreaterThan(0.45)
    expect(tinted.colors[0]).toBeLessThan(0.55)
    const merged = mergeMeshes([box, moved])
    expect(merged.positions.length / 3).toBe(192)
    expect(Math.max(...merged.indices)).toBe(191)
  })
})

describe('données et fichier HTML unique', () => {
  it('lit d’abord les données intégrées, sinon le fichier servi', async () => {
    ;(globalThis as any).document = { getElementById: () => ({ textContent: '{"lois":[1,2]}' }) }
    ;(globalThis as any).fetch = async (url: string) => ({ json: async () => ({ servi: url }) })
    expect(await readData('lois', 'lois.json')).toEqual([1, 2])
    expect(await readData('absent', 'absent.json')).toEqual({ servi: 'absent.json' })
    delete (globalThis as any).document
  })

  it('assemble un HTML sans ressource externe, avec données et polices intégrées', () => {
    const css = inlineFonts(readFileSync('src/styles/camelot.css', 'utf8'), 'jeu')
    expect(css).not.toContain('/fonts/')
    expect(css).toContain('data:font/ttf;base64,')
    const html = assembleHtml({ css, js: 'console.log("</script><b>")', data: { texte: '</script>' }, favicon: '<svg xmlns="http://www.w3.org/2000/svg"/>' })
    expect(html.match(/<script/g)).toHaveLength(2)
    expect(html.match(/<\/script>/g)).toHaveLength(2)
    expect(/(src|href)=["']https?:/i.test(html)).toBe(false)
    expect(html).toContain('lang="fr"')
    expect(html).toContain('id="camelot-data"')
    const json = html.split('id="camelot-data">')[1].split('</script>')[0].replace(/<\\\//g, '</')
    expect(JSON.parse(json)).toEqual({ texte: '</script>' })
  })
})
