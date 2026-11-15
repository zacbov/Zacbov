import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync('src/styles/camelot.css', 'utf8')
const rule = (selector: string) => css.split('}').find(block => block.trim().startsWith(selector + '{')) ?? ''

describe('interface : éléments cliquables', () => {
  it('la couche d’interface laisse passer les clics, donc chaque élément interactif doit les réactiver', () => {
    for (const selector of ['.speed-bar', '.alert-pill', '.mood-pill']) expect(rule(selector)).toContain('pointer-events:auto')
    expect(css).toContain('.event-overlay.is-visible{display:grid;pointer-events:auto}')
  })
})
