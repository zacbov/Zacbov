import { describe, expect, it } from 'vitest'
import { CENTER, DESTINATIONS, expeditionRisk, initialCityState, isAway, produceResources, resolveExpeditions, restoreCityState, seated, sendExpedition } from '../src/game/camelot-rules'

describe('expéditions de chevaliers', () => {
  it('envoyer un chevalier a des conditions, et lui retire son siège', () => {
    const state = initialCityState()
    state.buildings.push({ id: 80, kind: 'ramparts', x: CENTER + 8, z: CENTER })
    expect(seated(state, 'gauvain')).toBe(true)
    const sent = sendExpedition(state, 'gauvain', 'forest')
    expect(sent.ok).toBe(true)
    expect(sent.state.expeditions).toEqual([{ knight: 'gauvain', dest: 'forest', back: DESTINATIONS.forest.duration }])
    expect(isAway(sent.state, 'gauvain')).toBe(true)
    expect(seated(sent.state, 'gauvain')).toBe(false)
    expect(sendExpedition(sent.state, 'gauvain', 'ruins')).toMatchObject({ ok: false, reason: 'away' })
    state.knights.tristan.loyalty = 20
    expect(sendExpedition(state, 'tristan', 'forest')).toMatchObject({ ok: false, reason: 'loyalty' })
    state.knights.perceval.alive = false
    expect(sendExpedition(state, 'perceval', 'forest')).toMatchObject({ ok: false, reason: 'dead' })
  })

  it('le risque monte avec la défiance et l’hiver', () => {
    const state = initialCityState()
    const base = expeditionRisk(state, 'bohort', 'ruins')
    state.knights.bohort.loyalty = 35
    expect(expeditionRisk(state, 'bohort', 'ruins')).toBeGreaterThan(base)
    const winter = initialCityState()
    winter.tick = 36
    expect(expeditionRisk(winter, 'bohort', 'ruins')).toBeGreaterThan(base)
    expect(expeditionRisk(state, 'bohort', 'chapel')).toBeGreaterThan(expeditionRisk(state, 'bohort', 'forest'))
  })

  it('au retour : butin, blessure ou mort selon le jet', () => {
    const make = (dest: 'forest' | 'village') => {
      const state = sendExpedition(initialCityState(), 'lancelot', dest).state
      state.tick = DESTINATIONS[dest].duration
      return state
    }
    const won = make('forest')
    expect(resolveExpeditions(won, [0.99])).toEqual([{ knight: 'lancelot', dest: 'forest', outcome: 'success' }])
    expect(won.resources).toMatchObject({ wood: 140, food: 70 })
    expect(won.expeditions).toHaveLength(0)
    const village = make('village')
    resolveExpeditions(village, [0.99])
    expect(village.refugees).toBe(4)
    expect(village.mood.hope).toBe(65)
    const hurt = make('forest')
    const risk = expeditionRisk(hurt, 'lancelot', 'forest')
    expect(resolveExpeditions(hurt, [risk * 0.6])[0].outcome).toBe('wounded')
    expect(hurt.knights.lancelot.loyalty).toBe(60)
    const dead = make('forest')
    expect(resolveExpeditions(dead, [0])[0].outcome).toBe('dead')
    expect(dead.knights.lancelot.alive).toBe(false)
  })

  it('le cycle d’économie ramène les chevaliers à l’heure', () => {
    let state = sendExpedition(initialCityState(), 'galaad', 'forest').state
    let seen = 0
    for (let tick = 0; tick < DESTINATIONS.forest.duration; tick += 1) {
      produceResources(state)
      seen += state.report?.expeditions?.length ?? 0
    }
    expect(seen).toBe(1)
    expect(state.expeditions).toHaveLength(0)
  })

  it('la sauvegarde conserve les expéditions valides', () => {
    const state = sendExpedition(initialCityState(), 'tristan', 'chapel').state
    expect(restoreCityState(JSON.stringify(state)).expeditions).toEqual(state.expeditions)
    const messy = restoreCityState(JSON.stringify({ ...state, expeditions: [{ knight: 'tristan', dest: 'chapel', back: 9 }, { knight: 'tristan', dest: 'forest', back: 3 }, { knight: 'inconnu', dest: 'forest', back: 3 }, { knight: 'gauvain', dest: 'mars', back: 3 }, null] }))
    expect(messy.expeditions).toEqual([{ knight: 'tristan', dest: 'chapel', back: 9 }])
  })
})
