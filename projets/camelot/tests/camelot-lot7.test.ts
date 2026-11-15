import { describe, expect, it } from 'vitest'
import { CENTER, advanceConstruction, applyCityEffects, checkMove, initialCityState, isComplete, moveBuilding, placeBuilding, population, produceResources, restoreCityState, workforceInfo, type BuildingId, type CityState } from '../src/game/camelot-rules'

const at = (dx: number, dz: number) => [CENTER + dx, CENTER + dz] as const
const place = (state: CityState, kind: BuildingId, dx: number, dz: number) => {
  const step = placeBuilding(state, kind, ...at(dx, dz))
  expect(step.result).toEqual({ ok: true })
  return step.state
}
const finish = (state: CityState) => { while (state.buildings.some(building => !isComplete(building))) advanceConstruction(state) }

describe('main-d’œuvre, réfugiés et déménagements', () => {
  it('les bâtisseurs et les ouvriers se partagent les habitants', () => {
    let state = place(initialCityState(), 'farm', 2, -1)
    state = place(state, 'sawmill', 3, 1)
    expect(workforceInfo(state)).toMatchObject({ population: 4, builders: 2, workers: 2, jobs: 0 })
    finish(state)
    expect(workforceInfo(state)).toMatchObject({ builders: 0, workers: 4, jobs: 4, staffing: 1 })
    state = place(state, 'cottage', 3, -1)
    expect(workforceInfo(state)).toMatchObject({ builders: 2, workers: 2, staffing: 0.5 })
    state.builderShare = 0.25
    expect(workforceInfo(state)).toMatchObject({ builders: 1, workers: 3, staffing: 0.75 })
  })

  it('un atelier sous-équipé produit moins', () => {
    const full = place(place(initialCityState(), 'farm', 2, -1), 'sawmill', 3, 1)
    finish(full)
    const busy = JSON.parse(JSON.stringify(full)) as CityState
    busy.buildings.push({ id: 99, kind: 'cottage', x: CENTER + 3, z: CENTER - 1, progress: 0 })
    expect(produceResources(full).food).toBe(9)
    expect(produceResources(busy).food).toBe(4)
  })

  it('les réfugiés grossissent la population, et la faim avec', () => {
    const state = initialCityState()
    applyCityEffects(state, { refugees: 6 })
    expect(population(state)).toBe(10)
    produceResources(state)
    expect(state.resources.food).toBe(37)
    applyCityEffects(state, { refugees: 500 })
    expect(state.refugees).toBe(99)
  })

  it('déplacer coûte un quart du prix et relance un chantier', () => {
    let state = place(initialCityState(), 'farm', 2, -1)
    finish(state)
    const farm = state.buildings[state.buildings.length - 1]
    expect(checkMove(state, farm.id, ...at(4, 2))).toMatchObject({ reason: 'terrain' })
    expect(checkMove(state, farm.id, ...at(0, 6))).toMatchObject({ reason: 'ring' })
    const moved = moveBuilding(state, farm.id, ...at(3, -1))
    expect(moved.result).toEqual({ ok: true })
    state = moved.state
    const after = state.buildings.find(building => building.id === farm.id)!
    expect([after.x, after.z]).toEqual([CENTER + 3, CENTER - 1])
    expect(isComplete(after)).toBe(false)
    expect(state.resources).toMatchObject({ wood: 100 - 30 - 8, stone: 70 - 8 - 2 })
    expect(checkMove(state, farm.id, ...at(2, -1))).toMatchObject({ reason: 'immovable' })
    state.buildings.push({ id: 98, kind: 'keep', x: CENTER + 1, z: CENTER + 2 })
    expect(checkMove(state, 98, ...at(-2, 2))).toMatchObject({ reason: 'immovable' })
  })

  it('la sauvegarde conserve réfugiés et part de bâtisseurs', () => {
    const state = initialCityState()
    state.refugees = 7
    state.builderShare = 0.75
    const loaded = restoreCityState(JSON.stringify(state))
    expect([loaded.refugees, loaded.builderShare]).toEqual([7, 0.75])
    const messy = restoreCityState(JSON.stringify({ ...state, refugees: 5000, builderShare: 9 }))
    expect([messy.refugees, messy.builderShare]).toEqual([99, 0.75])
  })
})
