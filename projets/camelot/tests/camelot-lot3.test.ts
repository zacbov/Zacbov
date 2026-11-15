import { describe, expect, it } from 'vitest'
import { CENTER, advanceConstruction, initialCityState, isComplete, placeBuilding, produceResources, seasonOf, type BuildingId, type CityState } from '../src/game/camelot-rules'

const at = (dx: number, dz: number) => [CENTER + dx, CENTER + dz] as const
const place = (state: CityState, kind: BuildingId, dx: number, dz: number) => {
  const step = placeBuilding(state, kind, ...at(dx, dz))
  expect(step.result).toEqual({ ok: true })
  return step.state
}
const finish = (state: CityState) => { while (state.buildings.some(building => !isComplete(building))) advanceConstruction(state) }

describe('saisons, chaînes et trésor', () => {
  it('les saisons tournent tous les douze cycles', () => {
    const state = initialCityState()
    const seasons = [0, 12, 24, 36, 48].map(tick => { state.tick = tick; return seasonOf(state) })
    expect(seasons).toEqual([0, 1, 2, 3, 0])
  })

  it('la récolte dépend de la saison, l’hiver brûle du bois et chacun mange', () => {
    const state = place(initialCityState(), 'farm', 2, -1)
    finish(state)
    state.tick = 24
    produceResources(state)
    expect(state.resources.food).toBe(40 + 16 - 1)
    state.tick = 36
    state.resources.wood = 10
    produceResources(state)
    expect(state.resources.wood).toBe(9)
    expect(state.report).toMatchObject({ season: 3, starving: false, cold: false })
  })

  it('la famine ralentit la production du cycle suivant', () => {
    const state = place(initialCityState(), 'farm', 2, -1)
    finish(state)
    state.resources.food = 0
    state.report = { season: 0, starving: true, cold: false, unpaid: false }
    produceResources(state)
    expect(state.resources.food).toBe(5)
    expect(state.report).toMatchObject({ starving: false })
  })

  it('le marché rapporte des deniers et la caisse vide pèse sur la production', () => {
    let state = place(initialCityState(), 'market', -1, -3)
    finish(state)
    produceResources(state)
    expect(state.resources.gold).toBe(20 + 2 + 4)
    state = initialCityState()
    for (let i = 0; i < 3; i += 1) state.buildings.push({ id: 90 + i, kind: 'warehouse', x: CENTER + 5, z: CENTER + 5 + i })
    state.resources.gold = 0
    produceResources(state)
    expect(state.resources.gold).toBe(0)
    expect(state.report).toMatchObject({ unpaid: true })
  })

  it('la charpenterie transforme le bois en deniers selon le bois disponible', () => {
    const state = initialCityState()
    state.buildings.push({ id: 50, kind: 'carpentry', x: CENTER + 6, z: CENTER + 6 })
    state.resources.wood = 5
    produceResources(state)
    expect(state.resources.wood).toBe(0)
    expect(state.resources.gold).toBe(20 + 3 + 2 - 1)
  })
})
