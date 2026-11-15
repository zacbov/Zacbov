import { describe, expect, it } from 'vitest'
import { createSmoke, smokeAlpha, smokeSize, stepSmoke } from '../src/game/camelot-fx'

describe('fumée des cheminées', () => {
  it('sans cheminée, rien ne naît', () => {
    const puffs = createSmoke(10)
    for (let i = 0; i < 50; i += 1) stepSmoke(puffs, [], 0.1, 0.2, () => 0)
    expect(puffs.every(puff => smokeAlpha(puff) === 0)).toBe(true)
  })

  it('avec une cheminée, les particules naissent, montent, dérivent et s’éteignent', () => {
    const puffs = createSmoke(10)
    const chimney = { x: 2, y: 1, z: 3 }
    let calls = 0
    const spawning = () => [0.1, 0.5, 0.5, 0.5, 0.5, 0.5][calls++ % 6] // un tirage pour naître, puis cinq valeurs médianes
    stepSmoke(puffs, [chimney], 1, 0.2, spawning)
    const born = puffs.filter(puff => puff.life > 0 && puff.age === 0)
    expect(born.length).toBeGreaterThan(0)
    expect([born[0].x, born[0].y, born[0].z]).toEqual([2, 1, 3])
    stepSmoke(puffs, [chimney], 1, 0.2, () => 0.5)
    expect(born[0].y).toBeGreaterThan(1)
    expect(born[0].x).toBeGreaterThan(2)
    const alphas: number[] = []
    for (let i = 0; i < 40; i += 1) { stepSmoke(puffs, [], 0.25, 0.2, () => 0.5); alphas.push(smokeAlpha(born[0])) }
    expect(Math.max(...alphas)).toBeGreaterThan(0.3)
    expect(Math.max(...alphas)).toBeLessThanOrEqual(0.55)
    expect(alphas[alphas.length - 1]).toBe(0)
  })

  it('la fumée s’élargit en montant', () => {
    const young = { x: 0, y: 0, z: 0, age: 0, life: 4, drift: 0 }
    const old = { ...young, age: 3.5 }
    expect(smokeSize(old)).toBeGreaterThan(smokeSize(young))
  })
})
