import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { initialCityState } from '../src/game/camelot-rules'
import { applyChoice, canChoose, initialStory, pickEvent, restoreStory, type StoryEvent } from '../src/game/camelot-story'

const events: StoryEvent[] = JSON.parse(readFileSync('jeu/assets/data/evenements.json', 'utf8'))
const broke = { wood: 0, stone: 0, food: 0, gold: 0 }

describe('récit de Camelot', () => {
  it('chaque événement offre au moins un choix sans coût', () => {
    for (const event of events) expect(event.choices.some(choice => canChoose(choice, broke))).toBe(true)
  })
  it('propose les événements de l’ère courante, une seule fois, et borne les jauges', () => {
    const city = initialCityState()
    const first = pickEvent(events, initialStory(), city, () => 0)!
    expect(first.era).toBe(1)
    const free = first.choices.find(choice => canChoose(choice, broke))!
    const next = applyChoice(first, { ...free, effects: { ...free.effects, honneur: 500, era: 3 } }, city.resources, initialStory())
    expect(next.story).toMatchObject({ era: 3, seen: [first.id] })
    expect(next.story.gauges.honneur).toBe(100)
    expect(pickEvent(events, next.story, city, () => 0)?.id).not.toBe(first.id)
  })
  it('quand le chapitre est épuisé, une rumeur du suivant évite le silence', () => {
    const city = initialCityState()
    const story = initialStory()
    story.seen = events.filter(event => event.era === 1).map(event => event.id)
    const next = pickEvent(events, story, city, () => 0)
    expect(next?.era).toBe(2)
    story.seen = events.filter(event => event.era <= 2 && !(event.requires?.buildings)).map(event => event.id)
    expect(pickEvent(events, story, city, () => 0)?.era ?? 9).toBeGreaterThan(1)
  })

  it('assainit la sauvegarde du récit', () => {
    expect(restoreStory('{invalide')).toEqual(initialStory())
    expect(restoreStory(JSON.stringify({ era: 9, gauges: { honneur: -4, piete: 'x' }, flags: [1, 'a'], seen: 'z' }))).toMatchObject({ era: 5, gauges: { honneur: 0, piete: 50 }, flags: ['a'], seen: [] })
  })
})
