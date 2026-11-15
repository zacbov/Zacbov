import { describe, expect, it } from 'vitest'
import { CENTER, advanceConstruction, caravanIn, caravanOpen, initialCityState, isComplete, marketPrice, placeBuilding, produceResources, repairBuilding, restoreCityState, trade, tradeQuote, upgradeBuilding, wearOf, type CityState } from '../src/game/camelot-rules'

const marketCity = (tick = 0): CityState => {
  const state = initialCityState()
  state.buildings.push({ id: 80, kind: 'market', x: CENTER + 7, z: CENTER + 7 })
  state.tick = tick
  return state
}
const farmCity = () => {
  const step = placeBuilding(initialCityState(), 'farm', CENTER + 2, CENTER - 1)
  expect(step.result).toEqual({ ok: true })
  while (step.state.buildings.some(building => !isComplete(building))) advanceConstruction(step.state)
  return step.state
}

describe('marchands, prix et usure', () => {
  it('les caravanes ne passent qu’avec un marché, six cycles sur vingt', () => {
    expect(caravanOpen(initialCityState())).toBe(false)
    expect([0, 5, 6, 19, 20, 25].map(tick => caravanOpen(marketCity(tick)))).toEqual([true, true, false, false, true, true])
    expect(caravanIn(marketCity(2))).toBe(4)
    expect(caravanIn(marketCity(8))).toBe(12)
  })

  it('les vivres coûtent plus cher l’hiver qu’à l’automne', () => {
    expect(marketPrice(marketCity(40), 'food')).toBeGreaterThan(marketPrice(marketCity(30), 'food'))
  })

  it('acheter et vendre par lots de dix, avec leurs limites', () => {
    let state = marketCity(0)
    const sold = trade(state, 'sell', 'stone')
    expect(sold.state.resources).toMatchObject({ stone: 60, gold: 32 })
    state = trade(sold.state, 'buy', 'wood').state
    expect(state.resources).toMatchObject({ wood: 110, gold: 20 })
    expect(trade(marketCity(10), 'buy', 'wood')).toMatchObject({ ok: false, reason: 'closed' })
    state.resources.gold = 5
    expect(trade(state, 'buy', 'wood')).toMatchObject({ ok: false, reason: 'gold' })
    state.resources.gold = 50
    state.resources.wood = 145
    expect(trade(state, 'buy', 'wood')).toMatchObject({ ok: false, reason: 'cap' })
    state.resources.stone = 5
    expect(trade(state, 'sell', 'stone')).toMatchObject({ ok: false, reason: 'stock' })
    expect(tradeQuote(marketCity(0), 'buy', 'wood')).toBeGreaterThan(tradeQuote(marketCity(0), 'sell', 'wood'))
  })

  it('l’usure grimpe à chaque cycle et ampute la production', () => {
    const fresh = farmCity()
    const worn = JSON.parse(JSON.stringify(fresh)) as CityState
    worn.buildings.find(building => building.kind === 'farm')!.wear = 100
    expect(produceResources(fresh).food).toBe(9)
    expect(produceResources(worn).food).toBe(4)
    expect(wearOf(fresh.buildings.find(building => building.kind === 'farm')!)).toBe(1)
    expect(fresh.buildings.find(building => building.kind === 'road')!.wear).toBe(undefined)
  })

  it('réparer remet à neuf pour une partie du prix, améliorer rénove aussi', () => {
    const state = farmCity()
    const farm = state.buildings.find(building => building.kind === 'farm')!
    expect(repairBuilding(state, farm.id)).toMatchObject({ ok: false, reason: 'fine' })
    farm.wear = 50
    const fixed = repairBuilding(state, farm.id)
    expect(fixed.ok).toBe(true)
    expect(fixed.state.resources).toMatchObject({ wood: state.resources.wood - 5, stone: state.resources.stone - 1 })
    expect(fixed.state.buildings.find(building => building.id === farm.id)!.wear).toBe(undefined)
    expect(upgradeBuilding(state, farm.id).state.buildings.find(building => building.id === farm.id)!.wear).toBe(undefined)
    state.buildings.push({ id: 90, kind: 'cottage', x: CENTER + 3, z: CENTER - 1, progress: 0 })
    expect(repairBuilding(state, 90)).toMatchObject({ ok: false, reason: 'site' })
  })

  it('la sauvegarde borne l’usure', () => {
    const state = farmCity()
    const farm = state.buildings.find(building => building.kind === 'farm')!
    farm.wear = 42
    expect(restoreCityState(JSON.stringify(state)).buildings.find(building => building.kind === 'farm')!.wear).toBe(42)
    farm.wear = 900
    expect(restoreCityState(JSON.stringify(state)).buildings.find(building => building.kind === 'farm')!.wear).toBe(100)
  })
})
