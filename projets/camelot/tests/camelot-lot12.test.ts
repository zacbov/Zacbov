import { describe, expect, it } from 'vitest'
import { CENTER, advanceConstruction, defense, fortifyWalls, garrisonCap, initialCityState, isComplete, mendWalls, placeBuilding, produceResources, recruitSoldier, restoreCityState, setStance, staffingByCategory, type CityState } from '../src/game/camelot-rules'

const at = (dx: number, dz: number) => [CENTER + dx, CENTER + dz] as const
const withTower = (): CityState => {
  const state = initialCityState()
  state.buildings.push({ id: 80, kind: 'ramparts', x: CENTER + 8, z: CENTER })
  return state
}

describe('défense et priorités de main-d’œuvre', () => {
  it('la défense additionne murs, garnison et attitude', () => {
    const state = initialCityState()
    expect(defense(state)).toBe(25)
    state.garrison = 2
    expect(defense(state)).toBe(41)
    expect(defense(setStance(state, 'sortie'))).toBe(61)
    expect(defense(setStance(state, 'barricade'))).toBe(51)
  })

  it('recruter demande une tour ou un donjon, des vivres, des deniers et de la place', () => {
    expect(recruitSoldier(initialCityState())).toMatchObject({ ok: false, reason: 'none' })
    let state = withTower()
    expect(garrisonCap(state)).toBe(4)
    state = recruitSoldier(state).state
    state = recruitSoldier(state).state
    expect(state.garrison).toBe(2)
    expect(state.resources).toMatchObject({ food: 10, gold: 0 })
    expect(recruitSoldier(state)).toMatchObject({ ok: false, reason: 'resources' })
    state.garrison = 4
    state.resources = { wood: 99, stone: 99, food: 99, gold: 99 }
    expect(recruitSoldier(state)).toMatchObject({ ok: false, reason: 'cap' })
  })

  it('fortifier et réparer les murs coûtent des matériaux', () => {
    const state = initialCityState()
    const stronger = fortifyWalls(state)
    expect(stronger.state.walls).toEqual({ level: 2, hp: 100 })
    expect(stronger.state.resources).toMatchObject({ wood: 70, stone: 10 })
    expect(fortifyWalls(stronger.state)).toMatchObject({ ok: false, reason: 'resources' })
    state.walls.level = 5
    expect(fortifyWalls(state)).toMatchObject({ ok: false, reason: 'max' })
    expect(mendWalls(state)).toMatchObject({ ok: false, reason: 'fine' })
    state.walls.hp = 60
    const mended = mendWalls(state)
    expect(mended.state.walls.hp).toBe(100)
    expect(mended.state.resources).toMatchObject({ wood: 84, stone: 54 })
  })

  it('les barricades limitent le pillage, la sortie coûte des soldats, et l’attitude se réinitialise', () => {
    const run = (stance: 'hold' | 'barricade' | 'sortie', garrison = 0) => {
      const state = initialCityState()
      state.tick = 39
      state.crises = 3
      state.garrison = garrison
      state.stance = stance
      produceResources(state)
      return state
    }
    expect(run('hold').resources.wood).toBe(Math.floor(99 * 0.75))
    const barricade = run('barricade')
    expect(barricade.resources.wood).toBe(Math.floor(99 * 0.875))
    expect(barricade.stance).toBe('hold')
    expect(run('hold', 3).garrison).toBe(2)
    const failed = run('sortie', 1)
    expect(failed.report?.crisis?.repelled).toBe(false)
    expect(failed.garrison).toBe(0)
    const won = run('sortie', 3)
    expect(won.report?.crisis?.repelled).toBe(true)
    expect(won.garrison).toBe(3)
  })

  it('les priorités répartissent les ouvriers en cas de pénurie', () => {
    let state = placeBuilding(initialCityState(), 'farm', ...at(2, -1)).state
    state = placeBuilding(state, 'sawmill', ...at(3, 1)).state
    while (state.buildings.some(building => !isComplete(building))) advanceConstruction(state)
    state = placeBuilding(state, 'cottage', ...at(3, -1)).state
    const even = staffingByCategory(state)
    expect([even.food, even.materials]).toEqual([0.5, 0.5])
    state.priorities.food = 2
    const food = staffingByCategory(state)
    expect(Math.abs(food.food - 2 / 3) < 0.01 && Math.abs(food.materials - 1 / 3) < 0.01).toBe(true)
    state.priorities.food = 0
    state.priorities.materials = 2
    expect(staffingByCategory(state).materials).toBeGreaterThan(staffingByCategory(state).food)
  })

  it('la sauvegarde conserve garnison, attitude et priorités', () => {
    const state = initialCityState()
    state.garrison = 3
    state.stance = 'barricade'
    state.priorities = { food: 2, materials: 0, services: 1 }
    const loaded = restoreCityState(JSON.stringify(state))
    expect([loaded.garrison, loaded.stance, loaded.priorities]).toEqual([3, 'barricade', { food: 2, materials: 0, services: 1 }])
    const messy = restoreCityState(JSON.stringify({ ...state, garrison: 99, stance: 'fuite', priorities: { food: 9, materials: -3 } }))
    expect([messy.garrison, messy.stance, messy.priorities]).toEqual([10, 'hold', { food: 2, materials: 0, services: 1 }])
  })
})
