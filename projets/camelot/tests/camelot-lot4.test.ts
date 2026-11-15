import { describe, expect, it } from 'vitest'
import { CENTER, adoptLaw, advanceConstruction, initialCityState, isComplete, nextThreat, placeBuilding, produceResources, restoreCityState } from '../src/game/camelot-rules'

const farmCity = () => {
  const step = placeBuilding(initialCityState(), 'farm', CENTER + 2, CENTER - 1)
  expect(step.result).toEqual({ ok: true })
  while (step.state.buildings.some(building => !isComplete(building))) advanceConstruction(step.state)
  return step.state
}

describe('tension : humeur, lois, crises', () => {
  it('une seule loi par groupe, et seulement avec l’Hôtel de Ville', () => {
    const state = initialCityState()
    expect(adoptLaw(state, 'corvee')).toMatchObject({ ok: false, reason: 'hall' })
    state.buildings.push({ id: 77, kind: 'hall', x: CENTER + 6, z: CENTER + 6 })
    const first = adoptLaw(state, 'corvee')
    expect(first.ok).toBe(true)
    expect(adoptLaw(first.state, 'repos')).toMatchObject({ ok: false, reason: 'group' })
    expect(adoptLaw(first.state, 'festin').ok).toBe(true)
    expect(adoptLaw(state, 'inconnue')).toMatchObject({ reason: 'unknown' })
  })

  it('les lois changent la production sans bouger l’humeur de la corvée', () => {
    const state = farmCity()
    state.laws = ['corvee']
    produceResources(state)
    expect(state.resources.food).toBe(52)
    expect(state.mood).toEqual({ hope: 60, discontent: 10 })
  })

  it('la famine ronge l’espoir et nourrit la colère, jusqu’à la chute', () => {
    const state = initialCityState()
    state.resources.food = 0
    produceResources(state)
    expect(state.mood).toEqual({ hope: 54, discontent: 18 })
    state.mood.hope = 3
    produceResources(state)
    expect(state.lost).toBe('hope')
  })

  it('un assaut est repoussé par des remparts solides, sinon la cité est pillée', () => {
    const strong = initialCityState()
    strong.tick = 39
    produceResources(strong)
    expect(strong.report?.crisis).toEqual({ kind: 'raid', repelled: true })
    expect(strong.walls.hp).toBe(90)
    expect(strong.crises).toBe(1)
    expect(strong.next.at).toBeGreaterThan(40)

    const weak = initialCityState()
    weak.tick = 39
    weak.crises = 1
    weak.resources.wood = 100
    produceResources(weak)
    expect(weak.report?.crisis).toEqual({ kind: 'raid', repelled: false })
    expect(weak.resources.wood).toBe(Math.floor((100 - 1) * 0.75)) // 1 bois brûlé (le cycle 39 est en hiver), puis 25 % pillés
    expect(weak.walls.hp).toBeLessThan(100)

    const guarded = initialCityState()
    guarded.tick = 39
    guarded.crises = 1
    guarded.buildings.push({ id: 80, kind: 'ramparts', x: CENTER + 8, z: CENTER })
    produceResources(guarded)
    expect(guarded.report?.crisis).toEqual({ kind: 'raid', repelled: true })
  })

  it('seules les tours de guet annoncent les crises', () => {
    const state = initialCityState()
    state.tick = 35
    expect(nextThreat(state)).toBe(null)
    state.buildings.push({ id: 80, kind: 'ramparts', x: CENTER + 8, z: CENTER })
    state.tick = 29
    expect(nextThreat(state)).toBe(null)
    state.tick = 30
    expect(nextThreat(state)).toEqual({ kind: 'raid', inTicks: 10 })
  })

  it('la sauvegarde conserve humeur, lois et menace, et reste assainie', () => {
    const state = initialCityState()
    state.laws = ['dime']
    state.mood = { hope: 42, discontent: 77 }
    state.next = { kind: 'storm', at: 55 }
    const loaded = restoreCityState(JSON.stringify(state))
    expect(loaded.laws).toEqual(['dime'])
    expect(loaded.mood).toEqual({ hope: 42, discontent: 77 })
    expect(loaded.next).toEqual({ kind: 'storm', at: 55 })
    const messy = restoreCityState(JSON.stringify({ ...state, laws: ['dime', 'serment', 'bidon'], mood: { hope: 500 }, next: { kind: 'inconnu' }, lost: 'walls' }))
    expect(messy.laws).toEqual(['dime'])
    expect(messy.mood).toEqual({ hope: 100, discontent: 10 })
    expect(messy.next.kind).toBe('raid')
    expect(messy.lost).toBe('walls')
  })
})
