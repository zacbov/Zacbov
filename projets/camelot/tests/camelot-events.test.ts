import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BUILDINGS } from '../src/game/camelot-rules'
import type { StoryEvent } from '../src/game/camelot-story'

const events: StoryEvent[] = JSON.parse(readFileSync('jeu/assets/data/evenements.json', 'utf8'))
const KEYS = ['wood', 'stone', 'food', 'gold', 'honneur', 'piete', 'concorde', 'hope', 'discontent', 'refugees', 'flag', 'era', 'loyalty', 'fall', 'ending']
const KNIGHTS = ['gauvain', 'lancelot', 'galaad', 'tristan', 'perceval', 'bohort']

describe('données des événements', () => {
  it('chaque événement est complet et cohérent', () => {
    const ids = events.map(event => event.id)
    expect(new Set(ids).size).toBe(ids.length)
    const buildings = BUILDINGS.map(building => building.id as string)
    for (const event of events) {
      expect(event.choices).toHaveLength(2)
      expect(event.title.length > 3 && event.text.length > 40).toBe(true)
      for (const kind of Object.keys(event.requires?.buildings ?? {})) expect(buildings).toContain(kind)
      for (const choice of event.choices) {
        expect(choice.label.length > 3 && choice.result.length > 10).toBe(true)
        for (const key of Object.keys(choice.effects)) expect(KEYS).toContain(key)
        for (const knight of Object.keys(choice.effects.loyalty ?? {})) expect(KNIGHTS).toContain(knight)
        if (choice.effects.fall) expect(KNIGHTS).toContain(choice.effects.fall)
      }
    }
  })

  it('les drapeaux exigés sont posés par un autre événement', () => {
    const produced = new Set(events.flatMap(event => event.choices.flatMap(choice => (choice.effects.flag ?? '').split(',').filter(Boolean))))
    for (const event of events) for (const flag of [...(event.requires?.flags ?? []), ...(event.requires?.notFlags ?? [])]) expect([...produced]).toContain(flag)
  })

  it('les cinq chapitres ont assez d’épisodes', () => {
    for (const era of [1, 2, 3, 4, 5]) expect(events.filter(event => event.era === era).length).toBeGreaterThan(9)
    expect(events.length).toBe(100)
  })
})
