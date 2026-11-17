// Captures automatiques et mesures de fluidité (Playwright). Usage : npx playwright install chromium && npm run captures
// Variables : BASE (adresse de la page, par défaut dist/camelot.html), LEVELS (ex. low,medium,high,ultra).
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { chromium } from 'playwright'

const base = process.env.BASE ?? pathToFileURL(path.resolve('dist/camelot.html')).href
const levels = (process.env.LEVELS ?? 'high').split(',')
const views = ['plan', 'table', 'foret', 'lac', 'remparts', 'batiments']
const hours = [0.12, 0.3, 0.5, 0.75] // aube, midi, soir, nuit
fs.mkdirSync('captures', { recursive: true })
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const report = []
for (const level of levels) for (const view of views) for (const hour of hours) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } })
  const errors = []
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  page.on('pageerror', error => errors.push(String(error)))
  await page.goto(`${base}${base.includes('?') ? '&' : '?'}vue=${view}&heure=${hour}&q=${level}&dyn=0&seed=1&fps=1`)
  await page.waitForFunction(() => window.__game, null, { timeout: 60000 })
  await page.waitForTimeout(2500)
  const measure = await page.evaluate(() => new Promise(resolve => {
    const times = []
    let last = performance.now()
    const tick = now => {
      times.push(now - last)
      last = now
      if (times.length < 180) return requestAnimationFrame(tick)
      times.shift()
      times.sort((a, b) => a - b)
      resolve({ moyenne: times.reduce((sum, value) => sum + value, 0) / times.length, p95: times[Math.floor(times.length * 0.95)], max: times[times.length - 1] })
    }
    requestAnimationFrame(tick)
  }))
  const file = path.join('captures', `${level}-${view}-${String(hour).replace('.', '')}.png`)
  await page.screenshot({ path: file })
  report.push({ qualité: level, vue: view, heure: hour, ...measure, erreurs: errors })
  console.log(file, `${measure.moyenne.toFixed(1)} ms (p95 ${measure.p95.toFixed(1)}, max ${measure.max.toFixed(1)})`, errors.length ? `ERREUR : ${errors[0]}` : '')
  await page.close()
}
await browser.close()
fs.writeFileSync(path.join('captures', 'mesures.json'), JSON.stringify(report, null, 2))
