import { describe, expect, it } from 'vitest'
import { CENTER, advanceConstruction, checkPlacement, initialCityState, isComplete, placeBuilding, produceResources, type BuildingId, type CityState } from '../src/game/camelot-rules'

const at = (dx: number, dz: number) => [CENTER + dx, CENTER + dz] as const
const place = (state: CityState, kind: BuildingId, dx: number, dz: number) => {
  const step = placeBuilding(state, kind, ...at(dx, dz))
  expect(step.result).toEqual({ ok: true })
  return step.state
}

describe('élevage, pêche et chasse', () => {
  it('la pêcherie demande de l’eau, le pavillon une forêt, l’élevage une ferme', () => {
    const state = initialCityState()
    expect(checkPlacement(state, 'lodge', ...at(-2, -2))).toMatchObject({ reason: 'near', detail: 'forest' })
    expect(checkPlacement(state, 'pasture', ...at(2, -1))).toMatchObject({ reason: 'requirements' })
    expect(checkPlacement(state, 'fishery', ...at(2, -1))).toMatchObject({ reason: 'near', detail: 'water' })
  })

  it('une pêcherie au bord du lac nourrit la cité', () => {
    let state = place(initialCityState(), 'road', -4, 0)
    state = place(state, 'fishery', -4, 1)
    while (state.buildings.some(building => !isComplete(building))) advanceConstruction(state)
    expect(produceResources(state).food).toBe(8 - 1)
  })

  it('le pavillon de chasse ne vide pas la forêt', () => {
    let state = place(initialCityState(), 'lodge', 3, 1)
    while (state.buildings.some(building => !isComplete(building))) advanceConstruction(state)
    const produced = produceResources(state)
    expect(produced.food).toBe(6 - 1)
    expect(Object.keys(state.deposits)).toHaveLength(0)
  })
})
