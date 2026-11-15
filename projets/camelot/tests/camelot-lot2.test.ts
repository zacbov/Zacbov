import { describe, expect, it } from 'vitest'
import { CENTER, advanceConstruction, demolishBuilding, efficiency, initialCityState, isComplete, placeBuilding, produceResources, roadPath, storageCap, upgradeBuilding, type BuildingId, type CityState } from '../src/game/camelot-rules'

const at = (dx: number, dz: number) => [CENTER + dx, CENTER + dz] as const
const place = (state: CityState, kind: BuildingId, dx: number, dz: number) => {
  const step = placeBuilding(state, kind, ...at(dx, dz))
  expect(step.result).toEqual({ ok: true })
  return step.state
}
const finish = (state: CityState) => { while (state.buildings.some(building => !isComplete(building))) advanceConstruction(state) }

describe('chantiers, logistique et gestion', () => {
  it('un bâtiment est d’abord un chantier que les bâtisseurs achèvent', () => {
    const state = place(initialCityState(), 'farm', 2, -1)
    const farm = state.buildings[state.buildings.length - 1]
    expect(isComplete(farm)).toBe(false)
    produceResources(state)
    expect(state.resources.food).toBe(39)
    finish(state)
    produceResources(state)
    expect(state.resources.food).toBe(48)
  })

  it('les trajets longs réduisent le rendement et l’entrepôt agrandit le stock', () => {
    let state = place(initialCityState(), 'road', -3, -1)
    state = place(state, 'farm', 2, -1)
    state = place(state, 'farm', -4, -1)
    const [near, far] = state.buildings.slice(-2)
    expect(efficiency(state, near)).toBe(1)
    expect(efficiency(state, far)).toBeLessThan(1)
    expect(storageCap(state)).toBe(150)
    state.resources = { wood: 200, stone: 100, food: 40, gold: 20 }
    state = place(state, 'warehouse', 3, 1)
    finish(state)
    expect(storageCap(state)).toBe(300)
  })

  it('démolir rend la moitié des matériaux, améliorer coûte et multiplie la production', () => {
    const state = place(initialCityState(), 'farm', 2, -1)
    finish(state)
    const farm = state.buildings[state.buildings.length - 1]
    const up = upgradeBuilding(state, farm.id)
    expect(up.ok).toBe(true)
    expect(up.state.resources).toEqual({ wood: 100 - 30 - 18, stone: 70 - 8 - 5, food: 40, gold: 20 })
    produceResources(up.state)
    expect(up.state.resources.food).toBe(54)
    const second = upgradeBuilding(up.state, farm.id)
    expect(upgradeBuilding(second.state, farm.id)).toMatchObject({ ok: false, reason: 'max' })
    const gone = demolishBuilding(up.state, farm.id)
    expect(gone.ok).toBe(true)
    expect(gone.state.buildings.some(building => building.id === farm.id)).toBe(false)
    expect(gone.refund).toEqual({ wood: 24, stone: 6, food: 0, gold: 0 })
  })

  it('les villageois suivent les routes', () => {
    const state = initialCityState()
    const path = roadPath(state, [CENTER + 2, CENTER], [CENTER, CENTER - 3])!
    expect(path[0]).toEqual([CENTER + 2, CENTER])
    expect(path[path.length - 1]).toEqual([CENTER, CENTER - 3])
    expect(roadPath(state, [CENTER + 2, CENTER], [CENTER + 5, CENTER + 5])).toBe(null)
  })
})
