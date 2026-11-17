import type { Quality } from './save'

export type DebugParams = {
  /** ?q=low|medium|high|ultra force le niveau de qualité. */
  quality: Quality | null
  /** ?dyn=0 coupe la résolution dynamique (captures et mesures). */
  dynamicResolution: boolean
  /** ?bloom=0 coupe le bloom. */
  bloom: boolean
  /** ?fps=1 affiche le temps par image, l'échelle de rendu et le niveau de qualité. */
  fps: boolean
  /** ?seed=42 fixe la graine des variations aléatoires. */
  seed: number | null
  /** ?light=0 coupe le ciel procédural ; ?ao=0 les ombres de contact ; ?tex=0 les motifs de surface ; ?grade=0 la passe finale ; ?exposure=0 l'exposition automatique ; ?soft=0 les ombres douces. */
  light: boolean
  ao: boolean
  tex: boolean
  grade: boolean
  exposure: boolean
  soft: boolean
  /** ?vue=plan|table|foret|lac|remparts|batiments, ?heure=0..1, ?saison=0..3, ?key=0.32 : vues et réglages reproductibles pour les captures. */
  vue: string | null
  heure: number | null
  saison: number | null
  key: number
}

const LEVELS: readonly string[] = ['low', 'medium', 'high', 'ultra']

function number(raw: string | null, min: number, max: number, integer = false): number | null {
  if (raw === null || raw === '') return null
  const value = Number(raw)
  if (!Number.isFinite(value)) return null
  const bounded = Math.max(min, Math.min(max, value))
  return integer ? Math.floor(bounded) : bounded
}

export function parseParams(search: string): DebugParams {
  const query = new URLSearchParams(search)
  const quality = query.get('q')
  const seed = Number(query.get('seed'))
  return {
    quality: quality && LEVELS.includes(quality) ? (quality as Quality) : null,
    dynamicResolution: query.get('dyn') !== '0',
    bloom: query.get('bloom') !== '0',
    fps: query.get('fps') === '1',
    seed: query.get('seed') !== null && Number.isFinite(seed) ? Math.floor(seed) : null,
    light: query.get('light') !== '0',
    ao: query.get('ao') !== '0',
    tex: query.get('tex') !== '0',
    grade: query.get('grade') !== '0',
    exposure: query.get('exposure') !== '0',
    soft: query.get('soft') !== '0',
    vue: query.get('vue'),
    heure: number(query.get('heure'), 0, 1),
    saison: number(query.get('saison'), 0, 3, true),
    key: number(query.get('key'), 0.05, 1) ?? 0.32,
  }
}
