import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { applyCityEffects, castSpell, initialCityState, produceResources, restoreCityState, seated } from '../src/game/camelot-rules'
import { advanceChapter, applyChoice, endingFor, initialStory, isEligible, type StoryEvent } from '../src/game/camelot-story'

const events: StoryEvent[] = JSON.parse(readFileSync('jeu/assets/data/evenements.json', 'utf8'))

describe('récit : chapitres, chevaliers, Merlin, fins', () => {
  it('les cinq chapitres avancent avec leurs objectifs', () => {
    const city = initialCityState()
    let story = initialStory()
    expect(advanceChapter(story, city).era).toBe(1)
    city.buildings.push({ id: 90, kind: 'sawmill', x: 1, z: 1 }, { id: 91, kind: 'quarry', x: 2, z: 1 })
    story = advanceChapter(story, city)
    expect(story.era).toBe(2)
    city.won = true
    story = advanceChapter(story, city)
    expect(story.era).toBe(3)
    city.buildings.push({ id: 92, kind: 'cathedral', x: 3, z: 3 })
    story = advanceChapter(story, city)
    expect(story.era).toBe(4)
    expect(advanceChapter(story, city).era).toBe(4)
    story.flags.push('queste-achevee')
    expect(advanceChapter(story, city).era).toBe(5)
    expect(advanceChapter({ ...story, era: 5 }, city).era).toBe(5)
  })

  it('un chevalier ne siège que s’il est vivant, loyal et que sa structure est achevée', () => {
    const state = initialCityState()
    expect(seated(state, 'galaad')).toBe(false)
    state.buildings.push({ id: 90, kind: 'cathedral', x: 5, z: 5 })
    expect(seated(state, 'galaad')).toBe(true)
    const hopeWith = () => { const copy = JSON.parse(JSON.stringify(state)); produceResources(copy); return copy.mood.hope }
    expect(hopeWith()).toBe(60 + 1 + 1 + 2)
    applyCityEffects(state, { loyalty: { galaad: -50 } })
    expect(seated(state, 'galaad')).toBe(false)
    expect(hopeWith()).toBe(60 + 1 + 1)
    state.knights.galaad.loyalty = 90
    applyCityEffects(state, { fall: 'galaad' })
    expect(seated(state, 'galaad')).toBe(false)
  })

  it('Merlin n’offre que trois enchantements payants', () => {
    let state = initialCityState()
    state.resources.gold = 20
    const first = castSpell(state, 'moisson')
    expect(first.ok).toBe(true)
    expect(first.state.resources).toMatchObject({ gold: 5, food: 80 })
    expect(castSpell(first.state, 'serenite')).toMatchObject({ ok: false, reason: 'gold' })
    state = first.state
    state.resources.gold = 100
    state.mood.discontent = 60
    state = castSpell(state, 'serenite').state
    expect(state.mood.discontent).toBe(35)
    state.walls.hp = 20
    state = castSpell(state, 'muraille').state
    expect(state.walls.hp).toBe(100)
    expect(state.merlin).toBe(0)
    expect(castSpell(state, 'moisson')).toMatchObject({ ok: false, reason: 'gone' })
  })

  it('les événements forment une campagne cohérente', () => {
    const ids = events.map(event => event.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const event of events) {
      expect(event.era >= 1 && event.era <= 5).toBe(true)
      for (const id of event.requires?.seen ?? []) expect(ids).toContain(id)
    }
    expect(events.filter(event => event.choices.some(choice => choice.effects.ending))).toHaveLength(1)
    const story = initialStory()
    const needsSeen = events.find(event => event.id === 'graal-trouve')!
    expect(isEligible(needsSeen, { ...story, era: 4 }, initialCityState())).toBe(false)
    expect(isEligible(needsSeen, { ...story, era: 4, seen: ['vision-graal', 'galaad-siege'] }, initialCityState())).toBe(true)
  })

  it('la fin dépend de la Queste, de la vérité dite et de la concorde', () => {
    const base = initialStory()
    expect(endingFor({ ...base, flags: ['graal-trouve', 'verite-dite'], gauges: { honneur: 50, piete: 70, concorde: 20 } })).toBe('avalon')
    expect(endingFor({ ...base, gauges: { honneur: 50, piete: 50, concorde: 70 } })).toBe('apaise')
    expect(endingFor({ ...base, flags: ['rumeur-etouffee'], gauges: { honneur: 50, piete: 50, concorde: 90 } })).toBe('salesbieres')
    const finale = events.find(event => event.id === 'salesbieres')!
    const result = applyChoice(finale, finale.choices[1], initialCityState().resources, { ...base, era: 5, gauges: { honneur: 50, piete: 50, concorde: 60 } })
    expect(result.story.ending).toBe('apaise')
  })

  it('la sauvegarde conserve chevaliers et Merlin', () => {
    const state = initialCityState()
    state.knights.tristan = { loyalty: 12, alive: false }
    state.merlin = 1
    const loaded = restoreCityState(JSON.stringify(state))
    expect(loaded.knights.tristan).toEqual({ loyalty: 12, alive: false })
    expect(loaded.knights.gauvain).toEqual({ loyalty: 70, alive: true })
    expect(loaded.merlin).toBe(1)
    expect(restoreCityState(JSON.stringify({ ...state, knights: { gauvain: { loyalty: 900 } }, merlin: 9 })).knights.gauvain.loyalty).toBe(100)
  })
})
