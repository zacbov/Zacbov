import type { Quality } from './save'

export const QUALITY_ORDER: readonly Quality[] = ['low', 'medium', 'high', 'ultra']
export const lowerQuality = (quality: Quality): Quality => QUALITY_ORDER[Math.max(0, QUALITY_ORDER.indexOf(quality) - 1)]

/** Téléphone ou tablette : low ; processeur graphique intégré, mobile ou logiciel : medium ; sinon high. */
export function chooseQuality(env: { coarsePointer: boolean; gpu: string }): Quality {
  if (env.coarsePointer) return 'low'
  const gpu = env.gpu.toLowerCase()
  if (/mali|adreno|powervr|swiftshader|llvmpipe|software|basic render/.test(gpu)) return 'medium'
  if (gpu.includes('intel') && !gpu.includes('arc')) return 'medium'
  return 'high'
}

export type DynamicStep = { scale: number; downgrade: boolean }
const round1 = (value: number): number => Math.round(value * 10) / 10

/**
 * Résolution dynamique : mesure le temps moyen par image sur 45 images (après 3,5 s de stabilisation).
 * Au-dessus de 21,5 ms, l'échelle baisse de 0,1 (0,2 au-dessus de 30 ms, plancher 0,6). En dessous de 17,4 ms,
 * elle remonte de 0,1 après un délai qui double à chaque baisse (jusqu'à 60 s), pour éviter que l'image pompe.
 * Deux fenêtres au plancher avec plus de 26 ms demandent de rétrograder d'un niveau de qualité entier.
 */
export class DynamicResolution {
  scale = 1
  private frames = 0
  private sum = 0
  private lastDrop = -Infinity
  private lastRaise = -Infinity
  private wait = 5
  private floorHits = 0

  constructor(private readonly startSeconds = 0) {}

  /** `ms` : durée de l'image ; `seconds` : horloge de la page. */
  push(ms: number, seconds: number): DynamicStep {
    if (seconds - this.startSeconds < 3.5) return { scale: this.scale, downgrade: false }
    this.sum += ms
    this.frames += 1
    if (this.frames < 45) return { scale: this.scale, downgrade: false }
    const average = this.sum / this.frames
    this.sum = 0
    this.frames = 0
    let downgrade = false
    if (average > 21.5) {
      if (this.scale <= 0.6 + 1e-9) {
        if (average > 26) this.floorHits += 1
        if (this.floorHits >= 2) {
          downgrade = true
          this.floorHits = 0
          this.scale = 1
          this.wait = 5
          this.lastDrop = seconds
        }
      } else {
        this.scale = Math.max(0.6, round1(this.scale - (average > 30 ? 0.2 : 0.1)))
        this.lastDrop = seconds
        this.wait = Math.min(60, this.wait * 2)
      }
    } else if (average < 17.4 && this.scale < 1 && seconds - this.lastDrop >= this.wait && seconds - this.lastRaise >= 1) {
      this.scale = Math.min(1, round1(this.scale + 0.1))
      this.lastRaise = seconds
    }
    return { scale: this.scale, downgrade }
  }
}
