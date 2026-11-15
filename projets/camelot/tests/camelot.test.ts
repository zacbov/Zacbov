import { describe, expect, it } from 'vitest'
import { CENTER, advanceConstruction, checkPlacement, isComplete, initialCityState, placeBuilding, produceResources, restoreCityState, ringOf, sectorOf, type BuildingId, type CityState } from '../src/game/camelot-rules'

const at = (dx: number, dz: number) => [CENTER + dx, CENTER + dz] as const
const check = (state: CityState, kind: BuildingId, dx: number, dz: number) => checkPlacement(state, kind, ...at(dx, dz))

describe('cité ronde de Camelot', () => {
  it('commence avec huit routes, un foyer et des réserves finies', () => {
    const state = initialCityState()
    expect(state.buildings.filter(building => building.kind === 'road')).toHaveLength(8)
    expect(state.buildings.find(building => building.kind === 'cottage')).toMatchObject({ x: CENTER + 2, z: CENTER + 1 })
    expect(state.resources).toEqual({ wood: 100, stone: 70, food: 40, gold: 20 })
    expect(check(state, 'keep', 1, 2)).toMatchObject({ ok: false, reason: 'requirements' })
    expect([ringOf(...at(0, 0)), ringOf(...at(3, 0)), ringOf(...at(0, 6)), ringOf(...at(10, 0)), ringOf(...at(12, 0))]).toEqual([0, 1, 2, 4, -1])
    expect([sectorOf(...at(5, 0)), sectorOf(...at(2, 3)), sectorOf(...at(-5, 0)), sectorOf(...at(-1, -3))]).toEqual([0, 1, 3, 4])
  })

  it('refuse les parcelles interdites avec la bonne raison', () => {
    const state = initialCityState()
    expect(checkPlacement(state, 'cottage', -1, 0)).toMatchObject({ reason: 'outside' })
    expect(check(state, 'cottage', 0, 0)).toMatchObject({ reason: 'plaza' })
    expect(check(state, 'cottage', 10, 0)).toMatchObject({ reason: 'wall' })
    expect(check(state, 'cottage', 0, 6)).toMatchObject({ reason: 'ring', detail: '6' })
    expect(check(state, 'cottage', 4, 2)).toMatchObject({ reason: 'terrain', detail: 'forest' })
    expect(check(state, 'cottage', -2, -2)).toMatchObject({ reason: 'road' })
    expect(check(state, 'cottage', 2, 1)).toMatchObject({ reason: 'occupied' })
    expect(check(state, 'tavern', -1, -3)).toMatchObject({ reason: 'sector', detail: 'Tristan' })
    expect(check(state, 'market', -1, -3)).toEqual({ ok: true })
    state.resources.wood = 0
    expect(check(state, 'sawmill', 3, 1)).toMatchObject({ reason: 'resources' })
  })

  it('produit bois et pierre, puis dresse le donjon dans le secteur de Lancelot', () => {
    let state = initialCityState()
    const build = (kind: BuildingId, dx: number, dz: number) => {
      const step = placeBuilding(state, kind, ...at(dx, dz))
      expect(step.result).toEqual({ ok: true })
      state = step.state
    }
    build('road', -3, -1); build('road', -3, -2); build('sawmill', 3, 1); build('quarry', -4, -2)
    while (state.buildings.some(building => !isComplete(building))) advanceConstruction(state)
    for (let tick = 0; tick < 4; tick += 1) produceResources(state)
    expect(state.resources).toEqual({ wood: 78, stone: 83, food: 36, gold: 20 })
    build('keep', 1, 2)
    expect(state.won).toBe(false)
    while (!state.won) advanceConstruction(state)
    expect(check(state, 'keep', -2, 2)).toMatchObject({ reason: 'won' })
  })

  it('borne et assainit les sauvegardes locales', () => {
    const recovered = restoreCityState(JSON.stringify({
      version: 2, resources: { wood: 1200, stone: -4, food: 'beaucoup' }, walls: { level: 2, hp: 80 }, won: false,
      buildings: [
        { id: 2, kind: 'sawmill', x: CENTER + 3, z: CENTER + 1 },
        { id: 3, kind: 'quarry', x: CENTER + 3, z: CENTER + 1 },
        { id: 4, kind: 'introuvable', x: 1, z: 1 },
      ],
    }))
    expect(recovered.resources).toEqual({ wood: 999, stone: 0, food: 40, gold: 20 })
    expect(recovered.walls).toEqual({ level: 2, hp: 80 })
    expect(recovered.buildings.filter(building => building.kind !== 'road').map(building => building.kind)).toEqual(['sawmill', 'cottage'])
    expect(new Set(recovered.buildings.map(building => building.id)).size).toBe(recovered.buildings.length)
    expect(restoreCityState('{invalide').buildings).toHaveLength(9)
    expect(restoreCityState(null).resources).toEqual({ wood: 100, stone: 70, food: 40, gold: 20 })
  })
})
