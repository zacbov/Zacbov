import { describe, expect, it } from 'vitest'
import { CENTER, DEPOSITS, advanceConstruction, depositAt, depositCells, forecast, initialCityState, isComplete, placeBuilding, produceResources, restoreCityState, type BuildingId, type CityState } from '../src/game/camelot-rules'

const at = (dx: number, dz: number) => [CENTER + dx, CENTER + dz] as const
const place = (state: CityState, kind: BuildingId, dx: number, dz: number) => {
  const step = placeBuilding(state, kind, ...at(dx, dz))
  expect(step.result).toEqual({ ok: true })
  return step.state
}
const finish = (state: CityState) => { while (state.buildings.some(building => !isComplete(building))) advanceConstruction(state) }
const sawmillCity = () => {
  const state = place(initialCityState(), 'sawmill', 3, 1)
  finish(state)
  return state
}

describe('forêts et gisements finis', () => {
  it('la scierie voit les parcelles de forêt à sa portée, la carrière celles du rocher', () => {
    const state = initialCityState()
    const found = depositCells(state, 'sawmill', ...at(3, 1))!
    expect(found.terrain).toBe('forest')
    expect(found.cells.length).toBeGreaterThan(2)
    expect(depositAt(state, 'sawmill', ...at(3, 1))).toEqual({ resource: 'wood', stock: found.cells.length * DEPOSITS.forest.max })
    expect(depositAt(state, 'quarry', ...at(-4, -2))).toEqual({ resource: 'stone', stock: 2 * DEPOSITS.rock.max })
    expect(depositAt(state, 'farm', ...at(2, -1))).toBe(null)
  })

  it('produire vide la forêt, et la prévision n’y touche pas', () => {
    const state = sawmillCity()
    const before = JSON.stringify(state.deposits)
    forecast(state)
    expect(JSON.stringify(state.deposits)).toBe(before)
    const produced = produceResources(state)
    const taken = Object.values(state.deposits).reduce((sum, stock) => sum + (DEPOSITS.forest.max - stock), 0)
    expect(Math.abs(taken - (produced.wood + 0.0)) < 3).toBe(true)
    expect(Object.keys(state.deposits).length).toBeGreaterThan(0)
  })

  it('une forêt épuisée arrête la scierie, puis repousse lentement', () => {
    const state = sawmillCity()
    for (const cell of depositCells(state, 'sawmill', ...at(3, 1))!.cells) state.deposits[cell.key] = 0
    const wood = state.resources.wood
    produceResources(state)
    expect(state.resources.wood).toBe(wood)
    expect(state.report?.exhausted).toEqual(['sawmill'])
    for (const stock of Object.values(state.deposits)) expect(stock).toBe(DEPOSITS.forest.regrow)
    const faraway = `${CENTER - 6},${CENTER - 6}` // une autre forêt, hors de portée de la scierie
    state.deposits[faraway] = DEPOSITS.forest.max - 1
    produceResources(state)
    expect(state.deposits[faraway]).toBe(undefined)
  })

  it('le rocher, lui, ne repousse pas', () => {
    const state = initialCityState()
    const [cell] = depositCells(state, 'quarry', ...at(-4, -2))!.cells
    state.deposits[cell.key] = 10
    produceResources(state)
    expect(state.deposits[cell.key]).toBe(10)
  })

  it('la sauvegarde conserve les réserves et rejette les parcelles invalides', () => {
    const state = initialCityState()
    const [cell] = depositCells(state, 'sawmill', ...at(3, 1))!.cells
    state.deposits[cell.key] = 12
    expect(restoreCityState(JSON.stringify(state)).deposits[cell.key]).toBe(12)
    const messy = restoreCityState(JSON.stringify({ ...state, deposits: { [cell.key]: 9999, '11,11': 5, 'abc': 3, '0,0': 4 } }))
    expect(messy.deposits).toEqual({ [cell.key]: DEPOSITS.forest.max })
  })
})
