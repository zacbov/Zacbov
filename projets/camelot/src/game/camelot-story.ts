import { countBuildings, type KnightId, type BuildingId, type CityState, type Resources } from './camelot-rules'

export const STORY_SAVE_KEY = 'camelot.story.v1'
export const STORY_TICK_SECONDS = 24

export type Gauges = { honneur: number; piete: number; concorde: number }
export type StoryState = { era: number; gauges: Gauges; flags: string[]; seen: string[]; ending?: string }
/** `flag` accepte plusieurs drapeaux séparés par des virgules ; `ending: 'auto'` déclenche la fin du jeu. */
export type Effects = Partial<Resources & Gauges> & { flag?: string; era?: number; loyalty?: Partial<Record<KnightId, number>>; fall?: KnightId; hope?: number; discontent?: number; refugees?: number; ending?: string }
export type StoryChoice = { label: string; result: string; effects: Effects }
export type StoryEvent = {
  id: string; volume: string; era: number; title: string; text: string
  requires?: { buildings?: Partial<Record<BuildingId, number>>; flags?: string[]; notFlags?: string[]; seen?: string[] }
  choices: StoryChoice[]
}

const RESOURCES = ['wood', 'stone', 'food', 'gold'] as const
const GAUGES = ['honneur', 'piete', 'concorde'] as const
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

export const ENDINGS = ['avalon', 'apaise', 'salesbieres']
/** Les cinq volumes du cycle, comme cinq chapitres de la partie. */
export const CHAPTERS = [
  { volume: 'Estoire del Saint Graal', title: 'Les premières pierres', goal: 'Achever une scierie et une carrière.' },
  { volume: 'Estoire de Merlin', title: 'Le donjon d’Arthur', goal: 'Achever le donjon (Lancelot).' },
  { volume: 'Lancelot en prose', title: 'La Table Ronde', goal: 'Achever la cathédrale (Galaad).' },
  { volume: 'Queste del Saint Graal', title: 'La Queste', goal: 'Mener la Queste du Graal à son terme.' },
  { volume: 'Mort le Roi Artu', title: 'Le crépuscule', goal: 'Traverser la chute du royaume jusqu’à Salesbières.' },
] as const
/** Passe au chapitre suivant quand l'objectif du chapitre courant est atteint. */
export function advanceChapter(story: StoryState, city: CityState): StoryState {
  const done = story.era === 1 ? countBuildings(city, 'sawmill') > 0 && countBuildings(city, 'quarry') > 0
    : story.era === 2 ? city.won
    : story.era === 3 ? countBuildings(city, 'cathedral') > 0
    : story.era === 4 ? story.flags.includes('queste-achevee')
    : false
  return done ? { ...story, era: story.era + 1 } : story
}
export function endingFor(story: StoryState): 'avalon' | 'apaise' | 'salesbieres' {
  if (story.flags.includes('graal-trouve') && story.flags.includes('verite-dite') && story.gauges.piete >= 60) return 'avalon'
  if (story.gauges.concorde >= 65 && !story.flags.includes('rumeur-etouffee')) return 'apaise'
  return 'salesbieres'
}

export const initialStory = (): StoryState => ({ era: 1, gauges: { honneur: 50, piete: 50, concorde: 50 }, flags: [], seen: [] })

export function isEligible(event: StoryEvent, story: StoryState, city: CityState): boolean {
  if (story.seen.includes(event.id) || event.era > story.era) return false
  const need = event.requires ?? {}
  return Object.entries(need.buildings ?? {}).every(([kind, count]) => countBuildings(city, kind as BuildingId) >= (count ?? 0))
    && (need.flags ?? []).every(flag => story.flags.includes(flag))
    && (need.seen ?? []).every(id => story.seen.includes(id))
    && !(need.notFlags ?? []).some(flag => story.flags.includes(flag))
}

/** Tire un événement du chapitre courant ; s'il n'en reste aucun, une rumeur du chapitre suivant évite le silence. */
export function pickEvent(events: StoryEvent[], story: StoryState, city: CityState, random = Math.random): StoryEvent | null {
  for (const era of [story.era, story.era + 1]) {
    const pool = events.filter(event => isEligible(event, { ...story, era }, city))
    if (pool.length) return pool[Math.floor(random() * pool.length)]
  }
  return null
}

/** Un choix est jouable si les réserves couvrent ses coûts. */
export function canChoose(choice: StoryChoice, resources: Resources): boolean {
  return RESOURCES.every(resource => resources[resource] + (choice.effects[resource] ?? 0) >= 0)
}

export function applyChoice(event: StoryEvent, choice: StoryChoice, resources: Resources, story: StoryState): { resources: Resources; story: StoryState } {
  const nextResources = { ...resources }
  for (const resource of RESOURCES) nextResources[resource] = clamp(resources[resource] + (choice.effects[resource] ?? 0), 0, 999)
  const gauges = { ...story.gauges }
  for (const gauge of GAUGES) gauges[gauge] = clamp(gauges[gauge] + (choice.effects[gauge] ?? 0), 0, 100)
  const flags = [...new Set([...story.flags, ...(choice.effects.flag ?? '').split(',').filter(Boolean)])]
  const next: StoryState = { era: Math.max(story.era, choice.effects.era ?? 0), gauges, flags, seen: [...story.seen, event.id] }
  if (choice.effects.ending) next.ending = endingFor(next)
  else if (story.ending) next.ending = story.ending
  return { resources: nextResources, story: next }
}

export function restoreStory(raw: string | null): StoryState {
  const fallback = initialStory()
  try {
    const data = JSON.parse(raw ?? 'null') as Partial<StoryState> | null
    if (!data || typeof data !== 'object') return fallback
    const gauges = { ...fallback.gauges }
    for (const gauge of GAUGES) {
      const value = (data.gauges as Record<string, unknown> | undefined)?.[gauge]
      if (typeof value === 'number' && Number.isFinite(value)) gauges[gauge] = clamp(Math.round(value), 0, 100)
    }
    const strings = (list: unknown) => Array.isArray(list) ? list.filter((item): item is string => typeof item === 'string') : []
    return { era: clamp(Number.isInteger(data.era) ? data.era! : 1, 1, 5), gauges, flags: strings(data.flags), seen: strings(data.seen), ...(typeof data.ending === 'string' && ENDINGS.includes(data.ending) ? { ending: data.ending } : {}) }
  } catch { return fallback }
}
