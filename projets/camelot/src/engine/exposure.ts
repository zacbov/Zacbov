export const EXPOSURE_MIN = 0.6
export const EXPOSURE_MAX = 2

/** Exposition visée pour amener la luminance moyenne mesurée (0..1, linéaire) vers le gris moyen `key`. */
export const targetExposure = (luminance: number, key = 0.32): number => Math.max(EXPOSURE_MIN, Math.min(EXPOSURE_MAX, key / Math.max(luminance, 0.02)))

/** Adaptation progressive de l'œil : constante de temps d'environ 1,5 s, jamais de saut brutal. */
export function stepExposure(current: number, target: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-dt / 1.5))
}

/** Poids d'une cellule de mesure (centre de l'image favorisé), `x` et `y` dans [-1, 1]. */
export const centerWeight = (x: number, y: number): number => Math.exp(-(x * x + y * y) * 2)
