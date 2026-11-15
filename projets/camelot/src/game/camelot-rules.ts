export const GRID_WIDTH = 23
export const GRID_HEIGHT = 23
export const CENTER = 11
export const RADIUS = 11
export const ECONOMY_TICK_SECONDS = 10
export const CITY_SAVE_KEY = 'camelot.city.v2'
/** Nombre de bâtiments (hors routes) requis pour ouvrir chaque anneau de la cité. */
export const RING_NEEDS: Record<number, number> = { 1: 0, 2: 6, 3: 14 }

export type Resource = 'wood' | 'stone' | 'food' | 'gold'
export type Resources = Record<Resource, number>
export type Terrain = 'plain' | 'forest' | 'rock' | 'water'
export type KnightId = 'gauvain' | 'lancelot' | 'galaad' | 'tristan' | 'perceval' | 'bohort'
export type BuildingId = 'road' | 'cottage' | 'farm' | 'sawmill' | 'quarry' | 'warehouse' | 'fishery' | 'pasture' | 'lodge' | 'bakery' | 'carpentry' | 'ramparts' | 'keep' | 'cathedral' | 'tavern' | 'market' | 'hall'
export type Building = { id: number; kind: BuildingId; x: number; z: number; level?: number; progress?: number; wear?: number }
export type CrisisId = 'raid' | 'storm' | 'plague'
export type Mood = { hope: number; discontent: number }
export type TickReport = { season: number; starving: boolean; cold: boolean; unpaid: boolean; exhausted?: BuildingId[]; expeditions?: Array<{ knight: KnightId; dest: ExpeditionId; outcome: 'success' | 'wounded' | 'dead' }>; crisis?: { kind: CrisisId; repelled?: boolean } }
export type CityState = { version: 2; resources: Resources; buildings: Building[]; walls: { level: number; hp: number }; won: boolean; tick: number; garrison: number; stance: Stance; priorities: Record<JobCategory, number>; expeditions: Expedition[]; deposits: Record<string, number>; refugees: number; builderShare: number; knights: Record<KnightId, KnightState>; merlin: number; mood: Mood; laws: string[]; next: { kind: CrisisId; at: number }; crises: number; lost?: 'hope' | 'discontent' | 'walls'; report?: TickReport }
export type BuildingDefinition = {
  id: BuildingId; name: string; subtitle: string; description: string; footprint: number
  cost: Resources; output: Partial<Resources>; input?: Partial<Resources>; influence: number
  knight?: KnightId; on?: Terrain; near?: Terrain; needs: BuildingId[]
}

/** Les six sièges de la Table Ronde, dans l'ordre des secteurs (de l'est, dans le sens horaire). */
export const KNIGHTS: readonly { id: KnightId; name: string; role: string }[] = [
  { id: 'gauvain', name: 'Gauvain', role: 'Remparts' },
  { id: 'lancelot', name: 'Lancelot', role: 'Donjon' },
  { id: 'galaad', name: 'Galaad', role: 'Cathédrale' },
  { id: 'tristan', name: 'Tristan', role: 'Port et tavernes' },
  { id: 'perceval', name: 'Perceval', role: 'Marché public' },
  { id: 'bohort', name: 'Bohort', role: 'Hôtel de Ville' },
]

const c = (wood = 0, stone = 0, food = 0, gold = 0): Resources => ({ wood, stone, food, gold })
export const BUILDINGS: readonly BuildingDefinition[] = [
  { id: 'road', name: 'Route', subtitle: 'RÉSEAU', description: 'Relie les bâtiments à la Table Ronde.', footprint: 1, cost: c(2), output: {}, influence: 0, needs: [] },
  { id: 'cottage', name: 'Chaumière', subtitle: 'HABITAT', description: 'Accueille quatre villageois.', footprint: 1, cost: c(24, 12), output: {}, influence: 2, needs: [] },
  { id: 'farm', name: 'Ferme', subtitle: 'VIVRES', description: 'Cultive de quoi nourrir la cité.', footprint: 1, cost: c(30, 8), output: { food: 10 }, influence: 2, needs: [] },
  { id: 'sawmill', name: 'Scierie', subtitle: 'BOIS', description: 'Exploite la forêt voisine.', footprint: 1, cost: c(44, 15), output: { wood: 14 }, influence: 2, near: 'forest', needs: [] },
  { id: 'quarry', name: 'Carrière', subtitle: 'PIERRE', description: 'S’ouvre dans un rocher.', footprint: 1, cost: c(28, 16), output: { stone: 12 }, influence: 1, on: 'rock', needs: [] },
  { id: 'warehouse', name: 'Entrepôt', subtitle: 'STOCKAGE', description: 'Augmente la capacité de stock et raccourcit les trajets.', footprint: 1, cost: c(50, 20), output: {}, influence: 3, needs: ['cottage'] },
  { id: 'fishery', name: 'Pêcherie', subtitle: 'VIVRES · EAU', description: 'Pêche dans le lac voisin : il faut de l’eau à portée.', footprint: 1, cost: c(35, 10), output: { food: 9 }, influence: 3, near: 'water', needs: ['cottage'] },
  { id: 'pasture', name: 'Élevage', subtitle: 'VIVRES · BÉTAIL', description: 'Moutons et vaches : régulier mais modeste. Demande une ferme pour le fourrage.', footprint: 1, cost: c(30, 5), output: { food: 7 }, influence: 2, needs: ['farm'] },
  { id: 'lodge', name: 'Pavillon de chasse', subtitle: 'VIVRES · GIBIER', description: 'Chasse en forêt : du gibier et des peaux vendues. Il faut une forêt à portée.', footprint: 1, cost: c(40, 10), output: { food: 6, gold: 2 }, influence: 3, near: 'forest', needs: [] },
  { id: 'bakery', name: 'Boulangerie', subtitle: 'CHAÎNE · PAIN', description: 'Transforme le grain en pain : 6 vivres deviennent 10 vivres et un peu d’argent.', footprint: 1, cost: c(45, 25), output: { food: 10, gold: 2 }, input: { food: 6 }, influence: 2, needs: ['farm'] },
  { id: 'carpentry', name: 'Charpenterie', subtitle: 'CHAÎNE · PLANCHES', description: 'Transforme le bois brut en planches vendues : 8 bois deviennent 9 deniers.', footprint: 1, cost: c(50, 20), output: { gold: 9 }, input: { wood: 8 }, influence: 2, needs: ['sawmill'] },
  { id: 'ramparts', name: 'Tour des remparts', subtitle: 'GAUVAIN · DÉFENSE', description: 'Renforce la défense contre l’extérieur.', footprint: 1, cost: c(40, 60), output: {}, influence: 3, knight: 'gauvain', needs: ['quarry'] },
  { id: 'keep', name: 'Donjon', subtitle: 'LANCELOT · FORCE', description: 'Le premier bastion de Camelot.', footprint: 2, cost: c(70, 48, 25), output: {}, influence: 4, knight: 'lancelot', needs: ['sawmill', 'quarry'] },
  { id: 'cathedral', name: 'Cathédrale', subtitle: 'GALAAD · PURETÉ', description: 'Un sanctuaire inviolable.', footprint: 2, cost: c(90, 110, 30), output: {}, influence: 5, knight: 'galaad', needs: ['keep'] },
  { id: 'tavern', name: 'Port et tavernes', subtitle: 'TRISTAN · ARTS', description: 'Chants, voyages et mélancolie.', footprint: 1, cost: c(50, 20, 10), output: { gold: 3 }, influence: 3, knight: 'tristan', near: 'water', needs: ['market'] },
  { id: 'market', name: 'Marché public', subtitle: 'PERCEVAL · QUOTIDIEN', description: 'La vie de tous les jours.', footprint: 1, cost: c(40, 20), output: { food: 6, gold: 4 }, influence: 3, knight: 'perceval', needs: ['cottage'] },
  { id: 'hall', name: 'Hôtel de Ville', subtitle: 'BOHORT · JUSTICE', description: 'Sagesse, mémoire et gestion.', footprint: 2, cost: c(80, 70), output: { wood: 4, stone: 4 }, influence: 5, knight: 'bohort', needs: ['keep'] },
] as const

export const definition = (id: BuildingId): BuildingDefinition => BUILDINGS.find(building => building.id === id)!
const RES = ['wood', 'stone', 'food', 'gold'] as const
const zero = (): Resources => ({ wood: 0, stone: 0, food: 0, gold: 0 })
const NEIGHBORS = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const
const key = (x: number, z: number) => `${x},${z}`
/** Nombre de cycles de travail pour achever un bâtiment (0 = immédiat). */
export const BUILD_TIME: Record<BuildingId, number> = { road: 0, cottage: 2, farm: 3, sawmill: 3, quarry: 3, warehouse: 3, fishery: 3, pasture: 3, lodge: 3, bakery: 3, carpentry: 3, ramparts: 4, market: 3, tavern: 3, keep: 6, cathedral: 6, hall: 6 }
export const MAX_LEVEL = 3
export const SEASONS = ['Printemps', 'Été', 'Automne', 'Hiver'] as const
export const TICKS_PER_SEASON = 12
const FARM_SEASON = [1, 1.3, 1.6, 0.25]
/** Entretien en deniers par cycle, pour chaque bâtiment achevé. */
export const UPKEEP: Record<BuildingId, number> = { road: 0, cottage: 0, farm: 0, sawmill: 1, quarry: 1, warehouse: 1, fishery: 0, pasture: 0, lodge: 0, bakery: 1, carpentry: 1, ramparts: 2, keep: 3, cathedral: 3, tavern: 1, market: 0, hall: 2 }
export const isComplete = (building: Building): boolean => (building.progress ?? BUILD_TIME[building.kind]) >= BUILD_TIME[building.kind]
export const levelOf = (building: Building): number => building.level ?? 1
/** Seuls les bâtiments achevés comptent. */
export const seasonOf = (state: CityState): number => Math.floor(((state.tick ?? 0) % (TICKS_PER_SEASON * 4)) / TICKS_PER_SEASON)
export const countBuildings = (state: CityState, kind: BuildingId): number => state.buildings.filter(building => building.kind === kind && isComplete(building)).length
export const builtCount = (state: CityState): number => state.buildings.filter(building => building.kind !== 'road').length
export const population = (state: CityState): number => state.buildings.filter(b => b.kind === 'cottage' && isComplete(b)).reduce((sum, b) => sum + 4 + 2 * (levelOf(b) - 1), 0) + (state.refugees ?? 0)
export const storageCap = (state: CityState): number => 150 + 150 * countBuildings(state, 'warehouse')
export const builders = (state: CityState): number => Math.max(1, Math.floor(population(state) * (state.builderShare ?? 0.5)))

/** Relief : blobs [terrain, dx, dz, rayon] relatifs au centre, les premiers l'emportent. */
const BLOBS: ReadonlyArray<readonly [Terrain, number, number, number]> = [
  ['water', -7, 1, 2], ['rock', -4, -3, 1.2], ['rock', 4, -6, 1.4], ['rock', -8, 6, 1.4],
  ['forest', 5, 3, 2.2], ['forest', -6, -6, 2.4], ['forest', 2, 8, 2], ['forest', 7, -3, 1.8],
]
export function terrainAt(x: number, z: number): Terrain {
  for (const [terrain, bx, bz, radius] of BLOBS) if (Math.hypot(x - CENTER - bx, z - CENTER - bz) <= radius) return terrain
  return 'plain'
}
/** 0 Table Ronde, 1-3 anneaux de la cité, 4 zone des remparts, -1 hors carte. */
export function ringOf(x: number, z: number): number {
  if (x < 0 || z < 0 || x >= GRID_WIDTH || z >= GRID_HEIGHT) return -1
  const d = Math.hypot(x - CENTER, z - CENTER)
  return d > RADIUS ? -1 : d <= 1.5 ? 0 : d <= 4.5 ? 1 : d <= 7.5 ? 2 : d <= 9.5 ? 3 : 4
}
/** Secteur de 60° de la Table, 0 = Gauvain (est), puis dans le sens horaire. */
export function sectorOf(x: number, z: number): number {
  const angle = (Math.atan2(z - CENTER, x - CENTER) * 180) / Math.PI
  return Math.floor((((angle % 360) + 360 + 30) % 360) / 60) % 6
}
export const ringUnlocked = (state: CityState, ring: number): boolean => ring < 2 || builtCount(state) >= (RING_NEEDS[ring] ?? 0)
export const footprintCells = (x: number, z: number, size: number): Array<[number, number]> =>
  Array.from({ length: size * size }, (_, i) => [x + (i % size), z + Math.floor(i / size)] as [number, number])

const SPOKES: Array<[number, number]> = [[2, 0], [3, 0], [-2, 0], [-3, 0], [0, 2], [0, 3], [0, -2], [0, -3]]
const initialRoads = (): Building[] => SPOKES.map(([dx, dz], index) => ({ id: index + 1, kind: 'road' as const, x: CENTER + dx, z: CENTER + dz }))

export function initialCityState(): CityState {
  return {
    version: 2,
    resources: { wood: 100, stone: 70, food: 40, gold: 20 },
    buildings: [...initialRoads(), { id: SPOKES.length + 1, kind: 'cottage', x: CENTER + 2, z: CENTER + 1 }],
    walls: { level: 1, hp: 100 },
    won: false,
    tick: 0,
    knights: Object.fromEntries(KNIGHTS.map(knight => [knight.id, { loyalty: 70, alive: true }])) as Record<KnightId, KnightState>,
    merlin: 3,
    refugees: 0,
    builderShare: 0.5,
    deposits: {},
    expeditions: [],
    garrison: 0,
    stance: 'hold',
    priorities: { food: 1, materials: 1, services: 1 },
    mood: { hope: 60, discontent: 10 },
    laws: [],
    next: { kind: 'raid', at: 40 },
    crises: 0,
  }
}

function copyState(state: CityState): CityState {
  return { version: 2, resources: { ...state.resources }, buildings: state.buildings.map(building => ({ ...building })), walls: { ...state.walls }, won: state.won, tick: state.tick ?? 0, knights: Object.fromEntries(Object.entries(state.knights).map(([id, knight]) => [id, { ...knight }])) as Record<KnightId, KnightState>, merlin: state.merlin, deposits: { ...state.deposits }, expeditions: state.expeditions.map(trip => ({ ...trip })), garrison: state.garrison ?? 0, stance: state.stance ?? 'hold', priorities: { ...(state.priorities ?? { food: 1, materials: 1, services: 1 }) }, refugees: state.refugees ?? 0, builderShare: state.builderShare ?? 0.5, mood: { ...state.mood }, laws: [...state.laws], next: { ...state.next }, crises: state.crises, ...(state.lost ? { lost: state.lost } : {}) }
}
function occupies(building: Building, x: number, z: number): boolean {
  const size = definition(building.kind).footprint
  return x >= building.x && x < building.x + size && z >= building.z && z < building.z + size
}

export type PlacementError = 'won' | 'outside' | 'plaza' | 'wall' | 'ring' | 'terrain' | 'near' | 'sector' | 'occupied' | 'requirements' | 'road' | 'resources' | 'immovable'
export type PlacementCheck = { ok: true } | { ok: false; reason: PlacementError; detail?: string }
const no = (reason: PlacementError, detail?: string): PlacementCheck => ({ ok: false, reason, detail })

export function isUnlocked(state: CityState, kind: BuildingId): boolean {
  return definition(kind).needs.every(need => countBuildings(state, need) > 0)
}
export function canAfford(state: CityState, kind: BuildingId): boolean {
  const cost = definition(kind).cost
  return RES.every(resource => state.resources[resource] >= cost[resource])
}

function nearTerrain(x: number, z: number, size: number, terrain: Terrain, radius: number): boolean {
  const half = (size - 1) / 2, cx = x + half, cz = z + half, reach = Math.ceil(radius + size)
  for (let a = x - reach; a <= x + reach; a += 1) {
    for (let b = z - reach; b <= z + reach; b += 1) {
      if (ringOf(a, b) >= 0 && terrainAt(a, b) === terrain && Math.hypot(a - cx, b - cz) <= radius + half) return true
    }
  }
  return false
}
function touchesNetwork(state: CityState, cells: Array<[number, number]>): boolean {
  const own = new Set(cells.map(([x, z]) => `${x},${z}`))
  return cells.some(([x, z]) => ([[1, 0], [-1, 0], [0, 1], [0, -1]] as const).some(([dx, dz]) => {
    const nx = x + dx, nz = z + dz
    if (own.has(`${nx},${nz}`)) return false
    return ringOf(nx, nz) === 0 || state.buildings.some(building => building.kind === 'road' && building.x === nx && building.z === nz)
  }))
}

export function checkPlacement(state: CityState, kind: BuildingId, x: number, z: number): PlacementCheck {
  const def = definition(kind)
  if (kind === 'keep' && (state.won || state.buildings.some(building => building.kind === 'keep'))) return no('won')
  if (!Number.isInteger(x) || !Number.isInteger(z)) return no('outside')
  const cells = footprintCells(x, z, def.footprint)
  const rings = cells.map(([cx, cz]) => ringOf(cx, cz))
  if (rings.includes(-1)) return no('outside')
  if (rings.includes(0)) return no('plaza')
  if (rings.includes(4)) return no('wall')
  for (const ring of rings) if (!ringUnlocked(state, ring)) return no('ring', String(RING_NEEDS[ring]))
  if (def.knight && cells.some(([cx, cz]) => KNIGHTS[sectorOf(cx, cz)].id !== def.knight)) return no('sector', KNIGHTS.find(knight => knight.id === def.knight)!.name)
  const wrong = cells.map(([cx, cz]) => terrainAt(cx, cz)).find(terrain => terrain !== (def.on ?? 'plain'))
  if (wrong) return no('terrain', wrong)
  if (def.near && !nearTerrain(x, z, def.footprint, def.near, def.influence)) return no('near', def.near)
  if (cells.some(([cx, cz]) => state.buildings.some(building => occupies(building, cx, cz)))) return no('occupied')
  const missing = def.needs.filter(need => countBuildings(state, need) === 0)
  if (missing.length) return no('requirements', missing.map(need => definition(need).name.toLowerCase()).join(' et '))
  if (!touchesNetwork(state, cells)) return no('road')
  if (!canAfford(state, kind)) return no('resources')
  return { ok: true }
}

export function placeBuilding(state: CityState, kind: BuildingId, x: number, z: number): { state: CityState; result: PlacementCheck } {
  const result = checkPlacement(state, kind, x, z)
  if (!result.ok) return { state, result }
  const next = copyState(state)
  const cost = definition(kind).cost
  next.resources.wood -= cost.wood
  next.resources.stone -= cost.stone
  next.resources.food -= cost.food
  next.buildings.push({ id: Math.max(0, ...next.buildings.map(building => building.id)) + 1, kind, x, z, ...(BUILD_TIME[kind] ? { progress: 0 } : {}) })
  return { state: next, result }
}

/** Chaque bâtisseur fait avancer un chantier d'un cran ; renvoie les bâtiments achevés. */
export function advanceConstruction(state: CityState): Building[] {
  const sites = state.buildings.filter(building => !isComplete(building))
  for (let i = 0; sites.length && i < builders(state); i += 1) {
    const site = sites[i % sites.length]
    site.progress = Math.min(BUILD_TIME[site.kind], (site.progress ?? 0) + 1)
  }
  const done = sites.filter(isComplete)
  if (done.some(building => building.kind === 'keep')) state.won = true
  return done
}

/** Distance en cases de route jusqu'au stock le plus proche : Table Ronde ou entrepôt achevé. */
export function roadDistances(state: CityState): Map<string, number> {
  const roads = new Set(state.buildings.filter(building => building.kind === 'road').map(building => key(building.x, building.z)))
  const dist = new Map<string, number>(), queue: Array<[number, number]> = []
  const seed = (cells: Array<[number, number]>) => {
    for (const [x, z] of cells) for (const [dx, dz] of NEIGHBORS) {
      const k = key(x + dx, z + dz)
      if (roads.has(k) && !dist.has(k)) { dist.set(k, 1); queue.push([x + dx, z + dz]) }
    }
  }
  seed(footprintCells(CENTER - 1, CENTER - 1, 3))
  for (const building of state.buildings) if (building.kind === 'warehouse' && isComplete(building)) seed([[building.x, building.z]])
  for (let i = 0; i < queue.length; i += 1) {
    const [x, z] = queue[i]
    for (const [dx, dz] of NEIGHBORS) {
      const k = key(x + dx, z + dz)
      if (roads.has(k) && !dist.has(k)) { dist.set(k, dist.get(key(x, z))! + 1); queue.push([x + dx, z + dz]) }
    }
  }
  return dist
}

/** Première route qui touche le bâtiment. */
export function accessCell(state: CityState, building: Building): [number, number] | null {
  for (const [x, z] of footprintCells(building.x, building.z, definition(building.kind).footprint)) {
    for (const [dx, dz] of NEIGHBORS) if (state.buildings.some(other => other.kind === 'road' && other.x === x + dx && other.z === z + dz)) return [x + dx, z + dz]
  }
  return null
}

/** Rendement d'un bâtiment : plus le trajet jusqu'au stock est long, plus on perd de temps (minimum 55 %). */
export function efficiency(state: CityState, building: Building, dist = roadDistances(state)): number {
  let best = Infinity
  for (const [x, z] of footprintCells(building.x, building.z, definition(building.kind).footprint)) {
    for (const [dx, dz] of NEIGHBORS) best = Math.min(best, dist.get(key(x + dx, z + dz)) ?? Infinity)
  }
  return best === Infinity ? 0.55 : Math.max(0.55, 1 - 0.03 * (best - 1))
}

/** Plus court chemin entre deux cases praticables (routes et place de la Table). */
export function roadPath(state: CityState, from: [number, number], to: [number, number]): Array<[number, number]> | null {
  const open = new Set(state.buildings.filter(building => building.kind === 'road').map(building => key(building.x, building.z)))
  for (const [x, z] of footprintCells(CENTER - 1, CENTER - 1, 3)) open.add(key(x, z))
  if (!open.has(key(...from)) || !open.has(key(...to))) return null
  const previous = new Map<string, string>([[key(...from), '']]), queue: Array<[number, number]> = [from]
  for (let i = 0; i < queue.length && !previous.has(key(...to)); i += 1) {
    const [x, z] = queue[i]
    for (const [dx, dz] of NEIGHBORS) {
      const k = key(x + dx, z + dz)
      if (open.has(k) && !previous.has(k)) { previous.set(k, key(x, z)); queue.push([x + dx, z + dz]) }
    }
  }
  if (!previous.has(key(...to))) return null
  const path: Array<[number, number]> = []
  for (let k = key(...to); k; k = previous.get(k)!) { const [x, z] = k.split(',').map(Number); path.unshift([x, z]) }
  return path
}

const clamp100 = (value: number): number => Math.max(0, Math.min(100, Math.round(value)))

export type KnightState = { loyalty: number; alive: boolean }
/** Un chevalier siège à la Table quand sa structure est achevée, qu'il est vivant et loyal (au moins 30). */
export const SEATS: Record<KnightId, BuildingId> = { gauvain: 'ramparts', lancelot: 'keep', galaad: 'cathedral', tristan: 'tavern', perceval: 'market', bohort: 'hall' }
export const KNIGHT_POWERS: Record<KnightId, string> = {
  gauvain: 'Protection du jour : +10 de défense.',
  lancelot: 'Force d’élite : +15 de défense, mais +1 de colère par cycle (vulnérabilité interne).',
  galaad: 'Siège Périlleux : +2 d’espoir par cycle.',
  tristan: 'Arts et voyages : +1 d’espoir et +2 deniers par cycle.',
  perceval: 'Simplicité : +2 vivres par cycle.',
  bohort: 'Sagesse : production +10 %.',
}
export const seated = (state: CityState, id: KnightId): boolean => state.knights[id].alive && !state.expeditions.some(trip => trip.knight === id) && state.knights[id].loyalty >= 30 && countBuildings(state, SEATS[id]) > 0
function knightEffects(state: CityState) {
  const fx = { production: 1, hope: 0, discontent: 0, gold: 0, food: 0, defense: 0 }
  if (seated(state, 'gauvain')) fx.defense += 10
  if (seated(state, 'lancelot')) { fx.defense += 15; fx.discontent += 1 }
  if (seated(state, 'galaad')) fx.hope += 2
  if (seated(state, 'tristan')) { fx.hope += 1; fx.gold += 2 }
  if (seated(state, 'perceval')) fx.food += 2
  if (seated(state, 'bohort')) fx.production *= 1.1
  return fx
}
/** Effets d'un choix du récit sur la cité : loyauté, mort d'un chevalier, humeur. */
export function applyCityEffects(state: CityState, effects: { loyalty?: Partial<Record<KnightId, number>>; fall?: KnightId; hope?: number; discontent?: number; refugees?: number }): void {
  state.refugees = Math.max(0, Math.min(99, (state.refugees ?? 0) + (effects.refugees ?? 0)))
  for (const [id, delta] of Object.entries(effects.loyalty ?? {}) as Array<[KnightId, number]>) state.knights[id].loyalty = clamp100(state.knights[id].loyalty + delta)
  if (effects.fall) state.knights[effects.fall].alive = false
  state.mood = { hope: clamp100(state.mood.hope + (effects.hope ?? 0)), discontent: clamp100(state.mood.discontent + (effects.discontent ?? 0)) }
}

export const SPELLS = {
  moisson: { name: 'Moisson enchantée', text: '+40 vivres et +3 d’espoir.' },
  muraille: { name: 'Muraille enchantée', text: 'Les remparts retrouvent toute leur solidité.' },
  serenite: { name: 'Sérénité', text: 'La colère retombe de 25 points.' },
} as const
export type SpellId = keyof typeof SPELLS
/** Merlin n'offre que trois enchantements, à 15 deniers chacun, avant que Viviane ne l'enferme. */
export function castSpell(state: CityState, id: SpellId): { state: CityState; ok: boolean; reason?: 'gone' | 'gold' } {
  if (state.merlin <= 0) return { state, ok: false, reason: 'gone' }
  if (state.resources.gold < 15) return { state, ok: false, reason: 'gold' }
  const next = copyState(state)
  next.resources.gold -= 15
  next.merlin -= 1
  if (id === 'moisson') {
    next.resources.food = Math.min(storageCap(next), next.resources.food + 40)
    next.mood.hope = clamp100(next.mood.hope + 3)
  } else if (id === 'muraille') next.walls.hp = 100
  else next.mood.discontent = clamp100(next.mood.discontent - 25)
  return { state: next, ok: true }
}

export type Law = { id: string; group: string; name: string; text: string; production?: number; consumption?: number; hope?: number; discontent?: number; gold?: number }
/** Codex d'Arthur : une loi par groupe, définitive. */
export const LAWS: readonly Law[] = [
  { id: 'corvee', group: 'Travail', name: 'Corvée royale', text: 'Production +25 %, mais le peuple gronde.', production: 1.25, discontent: 2, hope: -1 },
  { id: 'repos', group: 'Travail', name: 'Jours chômés', text: 'Production −10 %, mais l’espoir revient.', production: 0.9, hope: 1, discontent: -1 },
  { id: 'rationnement', group: 'Greniers', name: 'Rationnement', text: 'On mange 40 % de moins, mais la colère monte.', consumption: 0.6, hope: -1, discontent: 1 },
  { id: 'festin', group: 'Greniers', name: 'Festins du roi', text: 'On mange 30 % de plus, mais l’espoir grandit.', consumption: 1.3, hope: 2 },
  { id: 'serment', group: 'Ordre', name: 'Serment de chevalerie', text: 'La colère recule, mais la solde coûte 2 deniers par cycle.', discontent: -2, gold: -2 },
  { id: 'dime', group: 'Ordre', name: 'Dîme', text: '+3 deniers par cycle, mais la colère monte.', gold: 3, discontent: 1.5 },
]
export function lawEffects(state: CityState) {
  const fx = { production: 1, consumption: 1, hope: 0, discontent: 0, gold: 0 }
  for (const law of LAWS.filter(candidate => state.laws.includes(candidate.id))) {
    fx.production *= law.production ?? 1
    fx.consumption *= law.consumption ?? 1
    fx.hope += law.hope ?? 0
    fx.discontent += law.discontent ?? 0
    fx.gold += law.gold ?? 0
  }
  return fx
}
export function adoptLaw(state: CityState, id: string): { state: CityState; ok: boolean; reason?: 'unknown' | 'hall' | 'group' } {
  const law = LAWS.find(candidate => candidate.id === id)
  if (!law) return { state, ok: false, reason: 'unknown' }
  if (countBuildings(state, 'hall') === 0) return { state, ok: false, reason: 'hall' }
  if (state.laws.some(other => LAWS.find(candidate => candidate.id === other)?.group === law.group)) return { state, ok: false, reason: 'group' }
  const next = copyState(state)
  next.laws.push(id)
  return { state: next, ok: true }
}

export const CRISES: Record<CrisisId, string> = { raid: 'Assaut saxon', storm: 'Grande tempête', plague: 'Fièvre noire' }
/** Force de défense : remparts, tours et donjon, pondérés par l'état des murs. */
export function defense(state: CityState): number {
  const towers = state.buildings.filter(building => building.kind === 'ramparts' && isComplete(building)).reduce((sum, building) => sum + levelOf(building), 0)
  return Math.round((state.walls.level * 25 + towers * 10 + (countBuildings(state, 'keep') ? 20 : 0) + knightEffects(state).defense + state.garrison * 8 + STANCE_BONUS[state.stance]) * (state.walls.hp / 100))
}
/** Sans tour de guet, les crises surprennent ; chaque tour allonge l'avertissement. */
export const warningLead = (state: CityState): number => {
  const towers = countBuildings(state, 'ramparts')
  return towers ? 8 + 2 * towers : 0
}
export function nextThreat(state: CityState): { kind: CrisisId; inTicks: number } | null {
  const left = state.next.at - (state.tick ?? 0)
  return warningLead(state) && left <= warningLead(state) ? { kind: state.next.kind, inTicks: Math.max(0, left) } : null
}
const scheduleNext = (tick: number, count: number): { kind: CrisisId; at: number } => ({
  kind: (['raid', 'storm', 'raid', 'plague', 'raid', 'storm'] as const)[(count * 5 + tick) % 6],
  at: tick + 30 + ((tick * 7 + count * 3) % 14),
})
function resolveCrisis(state: CityState): TickReport['crisis'] {
  const kind = state.next.kind
  const lose = (resource: Resource, share: number) => { state.resources[resource] = Math.floor(state.resources[resource] * (1 - share)) }
  const mood = (hope: number, discontent: number) => { state.mood = { hope: clamp100(state.mood.hope + hope), discontent: clamp100(state.mood.discontent + discontent) } }
  let repelled: boolean | undefined
  if (kind === 'raid') {
    const strength = 20 + 12 * state.crises, power = defense(state)
    repelled = power >= strength
    if (repelled) {
      state.walls.hp = Math.max(0, state.walls.hp - 10)
      mood(state.stance === 'sortie' ? 8 : 5, 0)
    } else {
      state.walls.hp = Math.max(0, state.walls.hp - Math.round((strength - power) * 1.5))
      const loot = state.stance === 'barricade' ? 0.5 : 1
      lose('wood', 0.25 * loot); lose('food', 0.3 * loot); lose('gold', 0.3 * loot)
      state.garrison = Math.max(0, state.garrison - (state.stance === 'sortie' ? 2 : 1))
      mood(-10, 15)
    }
    state.stance = 'hold'
    if (state.walls.hp <= 0 && !state.lost) state.lost = 'walls'
  } else if (kind === 'storm') {
    const share = countBuildings(state, 'warehouse') ? 0.15 : 0.3
    lose('wood', share); lose('food', share / 2)
    mood(-3, 0)
  } else {
    lose('food', 0.2)
    mood(-8, 8)
  }
  state.crises += 1
  state.next = scheduleNext(state.tick, state.crises)
  return { kind, repelled }
}

/** Un cycle d'économie : production, chaînes, impôts, entretien, repas, chauffage et saison. */
export function produceResources(state: CityState, multiplier = 1): Resources {
  const season = seasonOf(state), dist = roadDistances(state), cap = storageCap(state), before = state.report, fx = lawEffects(state), kf = knightEffects(state)
  const penalty = (before?.starving ? 0.6 : 1) * (before?.cold ? 0.8 : 1) * (before?.unpaid ? 0.7 : 1) * (state.mood.discontent >= 70 ? 0.85 : 1) * fx.production * kf.production
  const produced = zero(), pool = { ...state.resources }, staffs = staffingByCategory(state)
  const exhausted: BuildingId[] = []
  const run = (converters: boolean) => {
    for (const building of state.buildings) {
      const def = definition(building.kind)
      if (!isComplete(building) || Boolean(def.input) !== converters) continue
      let ratio = 1
      for (const resource of RES) if (def.input?.[resource]) ratio = Math.min(ratio, pool[resource] / def.input[resource]!)
      const rate = (1 + 0.5 * (levelOf(building) - 1)) * efficiency(state, building, dist) * penalty * multiplier * (JOBS[building.kind] ? staffs[jobCategory(building.kind)!] : 1) * (1 - wearOf(building) / 200) * (building.kind === 'farm' ? FARM_SEASON[season] : 1)
      let scale = 1
      const found = depositCells(state, building.kind, building.x, building.z)
      if (found) {
        const want = (def.output[DEPOSITS[found.terrain].resource] ?? 0) * rate * ratio
        const available = found.cells.reduce((sum, cell) => sum + cell.stock, 0)
        scale = want > 0 ? Math.min(1, available / want) : 1
        if (scale === 0 && !exhausted.includes(building.kind)) exhausted.push(building.kind)
        let remaining = want * scale
        for (const cell of [...found.cells].sort((a, b) => b.stock - a.stock)) {
          const take = Math.min(cell.stock, remaining)
          if (take > 0) state.deposits[cell.key] = cell.stock - take
          remaining -= take
        }
      }
      for (const resource of RES) {
        const delta = (def.output[resource] ?? 0) * rate * ratio * scale - (def.input?.[resource] ?? 0) * ratio
        produced[resource] += delta
        pool[resource] += delta
      }
    }
  }
  run(false)
  run(true)
  for (const cellKey of Object.keys(state.deposits)) {
    const [cx, cz] = cellKey.split(',').map(Number), terrain = terrainAt(cx, cz)
    if (terrain !== 'forest' && terrain !== 'rock') { delete state.deposits[cellKey]; continue }
    const grown = Math.min(DEPOSITS[terrain].max, state.deposits[cellKey] + DEPOSITS[terrain].regrow)
    if (grown >= DEPOSITS[terrain].max) delete state.deposits[cellKey]
    else state.deposits[cellKey] = grown
  }
  const homes = state.buildings.filter(building => building.kind === 'cottage' && isComplete(building)).length
  produced.food += kf.food - Math.ceil((population(state) / 4) * fx.consumption)
  if (season === 3) produced.wood -= homes
  produced.gold += fx.gold + kf.gold - state.garrison + Math.floor(population(state) / 2) - state.buildings.reduce((sum, building) => sum + (isComplete(building) ? UPKEEP[building.kind] : 0), 0)
  const report: TickReport = { season, starving: false, cold: false, unpaid: false, ...(exhausted.length ? { exhausted } : {}) }
  for (const resource of RES) {
    produced[resource] = Math.round(produced[resource])
    const total = state.resources[resource] + produced[resource]
    if (total < 0) {
      if (resource === 'food') report.starving = true
      if (resource === 'wood') report.cold = true
      if (resource === 'gold') report.unpaid = true
    }
    state.resources[resource] = Math.max(0, Math.min(cap, total))
  }
  const good = !report.starving && !report.cold && !report.unpaid
  state.mood = {
    hope: clamp100(state.mood.hope + (good ? 1 : 0) - (report.starving ? 6 : 0) - (report.cold ? 4 : 0) - (report.unpaid ? 3 : 0) - (season === 3 ? 1 : 0) + countBuildings(state, 'cathedral') + countBuildings(state, 'tavern') + fx.hope + kf.hope),
    discontent: clamp100(state.mood.discontent + (report.starving ? 8 : 0) + (report.cold ? 5 : 0) + (report.unpaid ? 3 : 0) - (good ? 2 : 0) + fx.discontent + kf.discontent),
  }
  state.walls.hp = Math.min(100, state.walls.hp + 1 + countBuildings(state, 'ramparts'))
  for (const building of state.buildings) if (isComplete(building) && wearRate(building.kind) > 0) building.wear = Math.min(100, wearOf(building) + wearRate(building.kind))
  state.tick = (state.tick ?? 0) + 1
  if (state.tick >= state.next.at) report.crisis = resolveCrisis(state)
  const returned = resolveExpeditions(state)
  if (returned.length) report.expeditions = returned
  if (!state.lost) {
    if (state.mood.hope <= 0) state.lost = 'hope'
    else if (state.mood.discontent >= 100) state.lost = 'discontent'
  }
  state.report = report
  return produced
}

const scaled = (cost: Resources, factor: number, round: (value: number) => number = Math.round): Resources => ({
  wood: round(cost.wood * factor), stone: round(cost.stone * factor), food: round(cost.food * factor), gold: round(cost.gold * factor),
})
/** Démolir rend la moitié des matériaux investis (le donjon est indestructible). */
export function demolishBuilding(state: CityState, id: number): { state: CityState; ok: boolean; refund: Resources } {
  const target = state.buildings.find(building => building.id === id)
  if (!target || target.kind === 'keep') return { state, ok: false, refund: zero() }
  const next = copyState(state), cap = storageCap(next)
  next.buildings = next.buildings.filter(building => building.id !== id)
  const refund = scaled(scaled(definition(target.kind).cost, 1 + 0.6 * (levelOf(target) - 1)), 0.5, Math.floor)
  for (const resource of RES) next.resources[resource] = Math.min(cap, next.resources[resource] + refund[resource])
  return { state: next, ok: true, refund }
}
export const upgradeCost = (building: Building): Resources => scaled(definition(building.kind).cost, 0.6 * levelOf(building))
/** Améliore par paliers (niveau 3 maximum) : +50 % de production par niveau, +2 habitants pour une chaumière. */
export function upgradeBuilding(state: CityState, id: number): { state: CityState; ok: boolean; reason?: 'kind' | 'site' | 'max' | 'resources' } {
  const target = state.buildings.find(building => building.id === id)
  if (!target || target.kind === 'road') return { state, ok: false, reason: 'kind' }
  if (!isComplete(target)) return { state, ok: false, reason: 'site' }
  if (levelOf(target) >= MAX_LEVEL) return { state, ok: false, reason: 'max' }
  const cost = upgradeCost(target)
  if (RES.some(resource => state.resources[resource] < cost[resource])) return { state, ok: false, reason: 'resources' }
  const next = copyState(state), built = next.buildings.find(building => building.id === id)!
  for (const resource of RES) next.resources[resource] -= cost[resource]
  built.level = levelOf(target) + 1
  delete built.wear
  if (built.kind === 'ramparts') next.walls = { level: Math.min(9, next.walls.level + 1), hp: 100 }
  return { state: next, ok: true }
}

export function restoreCityState(raw: string | null): CityState {
  const fallback = initialCityState()
  try {
    const data = JSON.parse(raw ?? 'null') as Record<string, unknown> | null
    if (!data || data.version !== 2 || !Array.isArray(data.buildings) || !data.resources || typeof data.resources !== 'object') return fallback
    const stored = data.resources as Record<string, unknown>
    const resources: Resources = {
      wood: safeNumber(stored.wood, fallback.resources.wood, 999),
      stone: safeNumber(stored.stone, fallback.resources.stone, 999),
      food: safeNumber(stored.food, fallback.resources.food, 999),
      gold: safeNumber(stored.gold, fallback.resources.gold, 999),
    }
    const accepted = initialRoads()
    for (const entry of data.buildings as Array<Record<string, unknown> | null>) {
      if (!entry || !BUILDINGS.some(def => def.id === entry.kind) || !Number.isInteger(entry.x) || !Number.isInteger(entry.z)) continue
      const kind = entry.kind as BuildingId, x = Number(entry.x), z = Number(entry.z)
      const cells = footprintCells(x, z, definition(kind).footprint)
      if (cells.some(([cx, cz]) => ringOf(cx, cz) < 1 || ringOf(cx, cz) > 3)) continue
      if (cells.some(([cx, cz]) => accepted.some(other => occupies(other, cx, cz)))) continue
      const level = safeNumber(entry.level, 1, MAX_LEVEL) || 1
      const progress = entry.progress === undefined ? BUILD_TIME[kind] : safeNumber(entry.progress, BUILD_TIME[kind], BUILD_TIME[kind])
      const wear = typeof entry.wear === 'number' && Number.isFinite(entry.wear) ? Math.max(0, Math.min(100, entry.wear)) : 0
      accepted.push({ id: 0, kind, x, z, ...(level > 1 ? { level } : {}), ...(progress < BUILD_TIME[kind] ? { progress } : {}), ...(wear > 0 ? { wear } : {}) })
    }
    if (!accepted.some(building => building.kind === 'cottage')) accepted.push({ id: 0, kind: 'cottage', x: CENTER + 2, z: CENTER + 1 })
    accepted.forEach((building, index) => { building.id = index + 1 })
    const walls = (data.walls ?? {}) as Record<string, unknown>
    const savedKnights = (data.knights ?? {}) as Record<string, Record<string, unknown> | undefined>
    const mood = (data.mood ?? {}) as Record<string, unknown>, upcoming = (data.next ?? {}) as Record<string, unknown>
    const groups = new Set<string>(), laws = (Array.isArray(data.laws) ? data.laws : []).filter((id): id is string => {
      const law = LAWS.find(candidate => candidate.id === id)
      if (!law || groups.has(law.group)) return false
      groups.add(law.group)
      return true
    })
    return {
      version: 2, resources, buildings: accepted,
      walls: { level: safeNumber(walls.level, 1, 9), hp: safeNumber(walls.hp, 100, 100) },
      tick: safeNumber(data.tick, 0, 1e9),
      knights: Object.fromEntries(KNIGHTS.map(knight => [knight.id, { loyalty: safeNumber(savedKnights[knight.id]?.loyalty, 70, 100), alive: savedKnights[knight.id]?.alive !== false }])) as Record<KnightId, KnightState>,
      merlin: safeNumber(data.merlin, 3, 3),
      refugees: safeNumber(data.refugees, 0, 99),
      deposits: restoreDeposits(data.deposits),
      expeditions: restoreExpeditions(data.expeditions),
      garrison: safeNumber(data.garrison, 0, 10),
      stance: STANCES.find(candidate => candidate === data.stance) ?? 'hold',
      priorities: Object.fromEntries(JOB_CATEGORIES.map(category => [category, Math.max(0, Math.min(2, Math.round(Number((data.priorities as Record<string, unknown> | undefined)?.[category] ?? 1)) || 0))])) as Record<JobCategory, number>,
      builderShare: typeof data.builderShare === 'number' && Number.isFinite(data.builderShare) ? Math.max(0.25, Math.min(0.75, data.builderShare)) : 0.5,
      mood: { hope: safeNumber(mood.hope, 60, 100), discontent: safeNumber(mood.discontent, 10, 100) },
      laws,
      next: { kind: (['raid', 'storm', 'plague'] as const).find(kind => kind === upcoming.kind) ?? 'raid', at: safeNumber(upcoming.at, 40, 1e9) },
      crises: safeNumber(data.crises, 0, 999),
      ...(data.lost === 'hope' || data.lost === 'discontent' || data.lost === 'walls' ? { lost: data.lost } : {}),
      won: data.won === true && accepted.some(building => building.kind === 'keep' && isComplete(building)),
    }
  } catch {
    return fallback
  }
}

function safeNumber(value: unknown, fallback: number, max: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(max, Math.floor(value))) : fallback
}

/** Variation nette prévue au prochain cycle (hors crise), pour afficher les tendances. */
export function forecast(state: CityState): Resources {
  const copy = copyState(state)
  copy.report = state.report
  copy.next = { kind: 'raid', at: Infinity }
  return produceResources(copy)
}

const num = (value: unknown, fallback: number): number => (typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : fallback)
const partial = (value: unknown): Partial<Resources> => {
  const raw = (value ?? {}) as Record<string, unknown>
  return Object.fromEntries(RES.filter(resource => num(raw[resource], 0) > 0).map(resource => [resource, num(raw[resource], 0)]))
}
/** Équilibrage par données : applique batiments.json aux bâtiments connus (nom, coût, production, entretien, durée…). */
export function loadBuildings(list: unknown): void {
  if (!Array.isArray(list)) return
  for (const entry of list as Array<Record<string, unknown> | null>) {
    const def = BUILDINGS.find(building => building.id === entry?.id) as BuildingDefinition | undefined
    if (!entry || !def) continue
    if (typeof entry.name === 'string') def.name = entry.name
    if (typeof entry.subtitle === 'string') def.subtitle = entry.subtitle
    if (typeof entry.description === 'string') def.description = entry.description
    if (entry.cost && typeof entry.cost === 'object') {
      const raw = entry.cost as Record<string, unknown>
      def.cost = { wood: num(raw.wood, def.cost.wood), stone: num(raw.stone, def.cost.stone), food: num(raw.food, def.cost.food), gold: num(raw.gold, def.cost.gold) }
    }
    if (entry.output && typeof entry.output === 'object') def.output = partial(entry.output)
    if (entry.input === null) delete def.input
    else if (entry.input && typeof entry.input === 'object') def.input = partial(entry.input)
    def.influence = num(entry.influence, def.influence)
    BUILD_TIME[def.id] = Math.floor(num(entry.buildTime, BUILD_TIME[def.id]))
    UPKEEP[def.id] = Math.floor(num(entry.upkeep, UPKEEP[def.id]))
  }
}
/** Remplace le Codex par lois.json (au moins une loi valide requise). */
export function loadLaws(list: unknown): void {
  if (!Array.isArray(list)) return
  const valid = list.filter((law): law is Law => !!law && ['id', 'group', 'name', 'text'].every(field => typeof law[field] === 'string'))
  if (valid.length) (LAWS as Law[]).splice(0, LAWS.length, ...valid)
}
/** Charge batiments.json et lois.json ; en cas d'échec, les valeurs par défaut restent en place. */
export async function loadGameData(): Promise<void> {
  try { loadBuildings(await (await fetch('assets/data/batiments.json')).json()) } catch { /* valeurs par défaut */ }
  try { loadLaws(await (await fetch('assets/data/lois.json')).json()) } catch { /* valeurs par défaut */ }
}

/** Postes à pourvoir par bâtiment productif. */
export const JOBS: Record<BuildingId, number> = { road: 0, cottage: 0, farm: 2, sawmill: 2, quarry: 2, warehouse: 0, fishery: 2, pasture: 1, lodge: 1, bakery: 2, carpentry: 2, ramparts: 0, keep: 0, cathedral: 0, tavern: 1, market: 1, hall: 1 }
/** Habitants, bâtisseurs (seulement s'il y a des chantiers), ouvriers disponibles, postes et taux d'occupation. */
export function workforceInfo(state: CityState) {
  const people = population(state)
  const crew = state.buildings.some(building => !isComplete(building)) ? builders(state) : 0
  const workers = Math.max(0, people - crew)
  const jobs = state.buildings.reduce((sum, building) => sum + (isComplete(building) ? JOBS[building.kind] : 0), 0)
  return { population: people, builders: crew, workers, jobs, staffing: jobs ? Math.min(1, workers / jobs) : 1 }
}

/** Déplacer coûte 25 % du prix de base et relance un chantier (le niveau est conservé). */
export const moveCost = (building: Building): Resources => scaled(definition(building.kind).cost, 0.25)
export function checkMove(state: CityState, id: number, x: number, z: number): PlacementCheck {
  const target = state.buildings.find(building => building.id === id)
  if (!target || target.kind === 'keep' || target.kind === 'road' || !isComplete(target)) return no('immovable')
  const probe = copyState(state)
  probe.buildings = probe.buildings.filter(building => building.id !== id)
  probe.resources = { wood: 999, stone: 999, food: 999, gold: 999 }
  const check = checkPlacement(probe, target.kind, x, z)
  if (!check.ok) return check
  const cost = moveCost(target)
  return RES.every(resource => state.resources[resource] >= cost[resource]) ? check : no('resources')
}
export function moveBuilding(state: CityState, id: number, x: number, z: number): { state: CityState; result: PlacementCheck } {
  const result = checkMove(state, id, x, z)
  if (!result.ok) return { state, result }
  const next = copyState(state), moved = next.buildings.find(building => building.id === id)!, cost = moveCost(moved)
  for (const resource of RES) next.resources[resource] -= cost[resource]
  moved.x = x
  moved.z = z
  if (BUILD_TIME[moved.kind] > 0) moved.progress = 0
  return { state: next, result }
}

/** Réserves finies : chaque parcelle de forêt ou de rocher contient un stock ; la forêt repousse, le rocher non. */
export const DEPOSITS = {
  forest: { max: 90, regrow: 2, resource: 'wood' as Resource },
  rock: { max: 400, regrow: 0, resource: 'stone' as Resource },
}
type DepositTerrain = keyof typeof DEPOSITS
/** Parcelles de forêt ou de rocher à portée d'un bâtiment (réel ou prévu) et leur stock. */
export function depositCells(state: CityState, kind: BuildingId, x: number, z: number): { terrain: DepositTerrain; cells: Array<{ key: string; stock: number }> } | null {
  const def = definition(kind), terrain = def.near ?? def.on
  if (terrain !== 'forest' && terrain !== 'rock') return null
  const half = (def.footprint - 1) / 2, reach = Math.ceil(def.influence + def.footprint), cells: Array<{ key: string; stock: number }> = []
  for (let a = x - reach; a <= x + reach; a += 1) {
    for (let b = z - reach; b <= z + reach; b += 1) {
      if (ringOf(a, b) >= 0 && terrainAt(a, b) === terrain && Math.hypot(a - x - half, b - z - half) <= def.influence + half) cells.push({ key: key(a, b), stock: state.deposits[key(a, b)] ?? DEPOSITS[terrain].max })
    }
  }
  return { terrain, cells }
}
export function depositAt(state: CityState, kind: BuildingId, x: number, z: number): { resource: Resource; stock: number } | null {
  const found = depositCells(state, kind, x, z)
  return found ? { resource: DEPOSITS[found.terrain].resource, stock: Math.round(found.cells.reduce((sum, cell) => sum + cell.stock, 0)) } : null
}
function restoreDeposits(raw: unknown): Record<string, number> {
  const restored: Record<string, number> = {}
  for (const [cellKey, value] of Object.entries((raw ?? {}) as Record<string, unknown>)) {
    const match = /^(\d+),(\d+)$/.exec(cellKey)
    if (!match || typeof value !== 'number' || !Number.isFinite(value)) continue
    const terrain = terrainAt(Number(match[1]), Number(match[2]))
    if (terrain === 'forest' || terrain === 'rock') restored[cellKey] = Math.max(0, Math.min(DEPOSITS[terrain].max, value))
  }
  return restored
}

export const wearOf = (building: Building): number => building.wear ?? 0
/** Usure gagnée par cycle : les ateliers s'usent vite, les routes et les remparts (qui ont leurs propres murs) pas du tout. */
const wearRate = (kind: BuildingId): number => (kind === 'road' || kind === 'ramparts' ? 0 : JOBS[kind] > 0 ? 1 : kind === 'cottage' ? 0.3 : 0.4)
/** Réparer coûte 30 % du prix de base, au prorata de l'usure ; la production perd jusqu'à 50 % à usure maximale. */
export const repairCost = (building: Building): Resources => scaled(definition(building.kind).cost, (0.3 * wearOf(building)) / 100)
export function repairBuilding(state: CityState, id: number): { state: CityState; ok: boolean; reason?: 'site' | 'fine' | 'resources' } {
  const target = state.buildings.find(building => building.id === id)
  if (!target || !isComplete(target)) return { state, ok: false, reason: 'site' }
  if (wearOf(target) < 5) return { state, ok: false, reason: 'fine' }
  const cost = repairCost(target)
  if (RES.some(resource => state.resources[resource] < cost[resource])) return { state, ok: false, reason: 'resources' }
  const next = copyState(state)
  for (const resource of RES) next.resources[resource] -= cost[resource]
  delete next.buildings.find(building => building.id === id)!.wear
  return { state: next, ok: true }
}

export const CARAVAN_PERIOD = 20
export const CARAVAN_STAY = 6
export const LOT = 10
type Tradable = 'wood' | 'stone' | 'food'
const BASE_PRICE: Record<Tradable, number> = { wood: 1, stone: 1.6, food: 1.2 }
const SEASON_PRICE: Record<Tradable, number[]> = { wood: [1, 0.9, 1, 1.4], stone: [1, 1, 1, 1], food: [1.2, 0.9, 0.7, 1.5] }
/** Les marchands ne passent qu'avec un marché achevé, 6 cycles sur 20. */
export const caravanOpen = (state: CityState): boolean => countBuildings(state, 'market') > 0 && (state.tick ?? 0) % CARAVAN_PERIOD < CARAVAN_STAY
/** Cycles avant le départ de la caravane si elle est là, avant son arrivée sinon. */
export const caravanIn = (state: CityState): number => {
  const phase = (state.tick ?? 0) % CARAVAN_PERIOD
  return phase < CARAVAN_STAY ? CARAVAN_STAY - phase : CARAVAN_PERIOD - phase
}
/** Prix du marché par unité : varie avec la saison (les vivres coûtent cher l'hiver) et un léger aléa déterministe. */
export const marketPrice = (state: CityState, resource: Tradable): number =>
  Math.round(BASE_PRICE[resource] * SEASON_PRICE[resource][seasonOf(state)] * (1 + 0.1 * Math.sin((state.tick ?? 0) / 3)) * 100) / 100
/** Un lot de 10 unités : achat à 115 % du prix, vente à 80 %. */
export const tradeQuote = (state: CityState, action: 'buy' | 'sell', resource: Tradable): number =>
  action === 'buy' ? Math.ceil(LOT * marketPrice(state, resource) * 1.15) : Math.floor(LOT * marketPrice(state, resource) * 0.8)
export function trade(state: CityState, action: 'buy' | 'sell', resource: Tradable): { state: CityState; ok: boolean; reason?: 'closed' | 'gold' | 'stock' | 'cap' } {
  if (!caravanOpen(state)) return { state, ok: false, reason: 'closed' }
  const price = tradeQuote(state, action, resource)
  if (action === 'buy' && state.resources.gold < price) return { state, ok: false, reason: 'gold' }
  if (action === 'buy' && state.resources[resource] + LOT > storageCap(state)) return { state, ok: false, reason: 'cap' }
  if (action === 'sell' && state.resources[resource] < LOT) return { state, ok: false, reason: 'stock' }
  const next = copyState(state)
  next.resources[resource] += action === 'buy' ? LOT : -LOT
  next.resources.gold = Math.min(storageCap(next), next.resources.gold + (action === 'buy' ? -price : price))
  return { state: next, ok: true }
}

export type ExpeditionId = 'forest' | 'ruins' | 'village' | 'chapel'
export type Expedition = { knight: KnightId; dest: ExpeditionId; back: number }
type Reward = Partial<Resources> & { refugees?: number; hope?: number }
/** Destinations hors de la carte : durée en cycles, danger de base et butin. */
export const DESTINATIONS: Record<ExpeditionId, { name: string; short: string; text: string; duration: number; danger: number; reward: Reward }> = {
  forest: { name: 'Battue en forêt profonde', short: 'Forêt', text: '+40 bois, +30 vivres', duration: 3, danger: 0.15, reward: { wood: 40, food: 30 } },
  ruins: { name: 'Fouille des ruines saxonnes', short: 'Ruines', text: '+40 pierre, +30 deniers', duration: 5, danger: 0.35, reward: { stone: 40, gold: 30 } },
  village: { name: 'Secours d’un hameau isolé', short: 'Hameau', text: '+4 habitants, +5 espoir', duration: 4, danger: 0.25, reward: { refugees: 4, hope: 5 } },
  chapel: { name: 'Quête de la chapelle perdue', short: 'Chapelle', text: '+12 espoir, +20 deniers', duration: 6, danger: 0.4, reward: { hope: 12, gold: 20 } },
}
export const isAway = (state: CityState, id: KnightId): boolean => state.expeditions.some(trip => trip.knight === id)
/** Risque d'échec : plus fort pour un chevalier peu loyal, et en hiver. */
export const expeditionRisk = (state: CityState, knight: KnightId, dest: ExpeditionId): number =>
  Math.max(0.02, Math.min(0.9, DESTINATIONS[dest].danger * (1.4 - state.knights[knight].loyalty / 125) + (seasonOf(state) === 3 ? 0.1 : 0)))
export function sendExpedition(state: CityState, knight: KnightId, dest: ExpeditionId): { state: CityState; ok: boolean; reason?: 'dead' | 'loyalty' | 'away' } {
  if (!state.knights[knight].alive) return { state, ok: false, reason: 'dead' }
  if (state.knights[knight].loyalty < 30) return { state, ok: false, reason: 'loyalty' }
  if (isAway(state, knight)) return { state, ok: false, reason: 'away' }
  const next = copyState(state)
  next.expeditions.push({ knight, dest, back: state.tick + DESTINATIONS[dest].duration })
  return { state: next, ok: true }
}
const pseudoRoll = (state: CityState, trip: Expedition): number => {
  const seed = state.tick * 7 + KNIGHTS.findIndex(knight => knight.id === trip.knight) * 13 + Object.keys(DESTINATIONS).indexOf(trip.dest) * 31
  const x = Math.sin(seed * 12.9898) * 43758.5453
  return x - Math.floor(x)
}
/** Règle les expéditions de retour ce cycle : butin, retour blessé ou mort du chevalier. `rolls` sert aux tests. */
export function resolveExpeditions(state: CityState, rolls: number[] = []): Array<{ knight: KnightId; dest: ExpeditionId; outcome: 'success' | 'wounded' | 'dead' }> {
  const results: Array<{ knight: KnightId; dest: ExpeditionId; outcome: 'success' | 'wounded' | 'dead' }> = []
  const due = state.expeditions.filter(trip => state.tick >= trip.back)
  state.expeditions = state.expeditions.filter(trip => state.tick < trip.back)
  due.forEach((trip, index) => {
    const risk = expeditionRisk(state, trip.knight, trip.dest), roll = rolls[index] ?? pseudoRoll(state, trip)
    let outcome: 'success' | 'wounded' | 'dead' = 'success'
    if (roll < risk * 0.35) outcome = 'dead'
    else if (roll < risk) outcome = 'wounded'
    if (outcome === 'success') {
      const reward = DESTINATIONS[trip.dest].reward, cap = storageCap(state)
      for (const resource of RES) if (reward[resource]) state.resources[resource] = Math.min(cap, state.resources[resource] + reward[resource]!)
      state.refugees = Math.min(99, (state.refugees ?? 0) + (reward.refugees ?? 0))
      state.mood.hope = clamp100(state.mood.hope + (reward.hope ?? 0))
    } else if (outcome === 'wounded') {
      state.knights[trip.knight].loyalty = clamp100(state.knights[trip.knight].loyalty - 10)
      state.mood.hope = clamp100(state.mood.hope - 2)
    } else {
      state.knights[trip.knight].alive = false
      state.mood.hope = clamp100(state.mood.hope - 6)
    }
    results.push({ knight: trip.knight, dest: trip.dest, outcome })
  })
  return results
}
function restoreExpeditions(raw: unknown): Expedition[] {
  const trips: Expedition[] = []
  for (const entry of Array.isArray(raw) ? (raw as Array<Record<string, unknown> | null>) : []) {
    const knight = KNIGHTS.find(candidate => candidate.id === entry?.knight)?.id
    const dest = (Object.keys(DESTINATIONS) as ExpeditionId[]).find(candidate => candidate === entry?.dest)
    if (knight && dest && typeof entry?.back === 'number' && Number.isFinite(entry.back) && !trips.some(trip => trip.knight === knight)) trips.push({ knight, dest, back: Math.max(0, Math.floor(entry.back)) })
  }
  return trips
}

/** Priorités de main-d'œuvre : en cas de pénurie d'ouvriers, les catégories prioritaires sont servies d'abord. */
export type JobCategory = 'food' | 'materials' | 'services'
export const JOB_CATEGORIES: readonly JobCategory[] = ['food', 'materials', 'services']
export function jobCategory(kind: BuildingId): JobCategory | null {
  if (!JOBS[kind]) return null
  return ['farm', 'pasture', 'fishery', 'lodge', 'bakery'].includes(kind) ? 'food' : ['sawmill', 'quarry', 'carpentry'].includes(kind) ? 'materials' : 'services'
}
const PRIORITY_WEIGHT = [0.5, 1, 2]
export function staffingByCategory(state: CityState): Record<JobCategory, number> {
  const demand: Record<JobCategory, number> = { food: 0, materials: 0, services: 0 }, given: Record<JobCategory, number> = { food: 0, materials: 0, services: 0 }
  for (const building of state.buildings) {
    const category = jobCategory(building.kind)
    if (category && isComplete(building)) demand[category] += JOBS[building.kind]
  }
  const weight = (category: JobCategory) => PRIORITY_WEIGHT[state.priorities?.[category] ?? 1] * demand[category]
  let left = workforceInfo(state).workers, open = JOB_CATEGORIES.filter(category => demand[category] > 0)
  for (let round = 0; round < 4 && left > 1e-9 && open.length; round += 1) {
    const total = open.reduce((sum, category) => sum + weight(category), 0)
    let used = 0
    for (const category of open) {
      const share = Math.min(demand[category] - given[category], (left * weight(category)) / total)
      given[category] += share
      used += share
    }
    left -= used
    open = open.filter(category => demand[category] - given[category] > 1e-9)
  }
  return { food: demand.food ? given.food / demand.food : 1, materials: demand.materials ? given.materials / demand.materials : 1, services: demand.services ? given.services / demand.services : 1 }
}

/** Défense : garnison, attitude face à l'assaut, fortification et réparation des murs. */
export type Stance = 'hold' | 'sortie' | 'barricade'
export const STANCES: readonly Stance[] = ['hold', 'sortie', 'barricade']
const STANCE_BONUS: Record<Stance, number> = { hold: 0, sortie: 20, barricade: 10 }
export const MAX_WALL_LEVEL = 5
export const RECRUIT_COST: Resources = { wood: 0, stone: 0, food: 15, gold: 10 }
export const canGarrison = (state: CityState): boolean => countBuildings(state, 'ramparts') + countBuildings(state, 'keep') > 0
export const garrisonCap = (state: CityState): number => Math.min(10, 2 + 2 * countBuildings(state, 'ramparts') + (countBuildings(state, 'keep') ? 2 : 0))
export const wallUpgradeCost = (state: CityState): Resources => ({ wood: 30 * state.walls.level, stone: 60 * state.walls.level, food: 0, gold: 0 })
export const wallRepairCost = (state: CityState): Resources => ({ wood: Math.ceil((100 - state.walls.hp) * 0.4), stone: Math.ceil((100 - state.walls.hp) * 0.4), food: 0, gold: 0 })
function pay(state: CityState, cost: Resources): CityState | null {
  if (RES.some(resource => state.resources[resource] < cost[resource])) return null
  const next = copyState(state)
  for (const resource of RES) next.resources[resource] -= cost[resource]
  return next
}
type DefenseResult = { state: CityState; ok: boolean; reason?: 'none' | 'cap' | 'resources' | 'max' | 'fine' }
export function recruitSoldier(state: CityState): DefenseResult {
  if (!canGarrison(state)) return { state, ok: false, reason: 'none' }
  if (state.garrison >= garrisonCap(state)) return { state, ok: false, reason: 'cap' }
  const next = pay(state, RECRUIT_COST)
  if (!next) return { state, ok: false, reason: 'resources' }
  next.garrison += 1
  return { state: next, ok: true }
}
export function fortifyWalls(state: CityState): DefenseResult {
  if (state.walls.level >= MAX_WALL_LEVEL) return { state, ok: false, reason: 'max' }
  const next = pay(state, wallUpgradeCost(state))
  if (!next) return { state, ok: false, reason: 'resources' }
  next.walls = { level: state.walls.level + 1, hp: 100 }
  return { state: next, ok: true }
}
export function mendWalls(state: CityState): DefenseResult {
  if (state.walls.hp >= 100) return { state, ok: false, reason: 'fine' }
  const next = pay(state, wallRepairCost(state))
  if (!next) return { state, ok: false, reason: 'resources' }
  next.walls = { ...state.walls, hp: 100 }
  return { state: next, ok: true }
}
export function setStance(state: CityState, stance: Stance): CityState {
  const next = copyState(state)
  next.stance = stance
  return next
}
