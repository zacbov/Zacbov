import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BUILDINGS, BUILD_TIME, LAWS, UPKEEP, definition, forecast, initialCityState, loadBuildings, loadLaws, produceResources } from '../src/game/camelot-rules'

const buildings = JSON.parse(readFileSync('jeu/assets/data/batiments.json', 'utf8'))
const laws = JSON.parse(readFileSync('jeu/assets/data/lois.json', 'utf8'))

describe('tendances et données', () => {
  it('la prévision annonce la variation du prochain cycle sans rien modifier', () => {
    const state = initialCityState()
    const before = JSON.stringify(state)
    const net = forecast(state)
    expect(JSON.stringify(state)).toBe(before)
    expect(net).toEqual(produceResources(state))
    expect(net.food).toBe(-1)
  })

  it('les fichiers JSON reproduisent exactement les valeurs par défaut', () => {
    const snapshot = structuredClone({ buildings: BUILDINGS, laws: LAWS, time: BUILD_TIME, upkeep: UPKEEP })
    loadBuildings(buildings)
    loadLaws(laws)
    expect({ buildings: BUILDINGS, laws: LAWS, time: BUILD_TIME, upkeep: UPKEEP }).toEqual(snapshot)
    expect(buildings).toHaveLength(BUILDINGS.length)
  })

  it('on peut rééquilibrer le jeu par les données, et ignorer ce qui est invalide', () => {
    try {
      loadBuildings([{ id: 'farm', cost: { wood: 99 }, upkeep: 2, buildTime: 1.9 }, { id: 'inconnu', cost: { wood: 1 } }, null, { id: 'cottage', cost: { wood: 'beaucoup' } }])
      expect(definition('farm').cost).toEqual({ wood: 99, stone: 8, food: 0, gold: 0 })
      expect(UPKEEP.farm).toBe(2)
      expect(BUILD_TIME.farm).toBe(1)
      expect(definition('cottage').cost.wood).toBe(24)
      loadLaws([{ id: 'x' }])
      expect(LAWS).toHaveLength(6)
    } finally {
      loadBuildings(buildings)
    }
    expect(definition('farm').cost.wood).toBe(30)
  })
})
