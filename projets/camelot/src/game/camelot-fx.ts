/** Fumée des cheminées : logique pure (sans Three.js), pour rester testable. */
export type Puff = { x: number; y: number; z: number; age: number; life: number; drift: number }
export type SmokeSource = { x: number; y: number; z: number }

/** Crée `count` particules éteintes. */
export const createSmoke = (count: number): Puff[] => Array.from({ length: count }, () => ({ x: 0, y: 0, z: 0, age: 1, life: 0, drift: 0 }))

/** Les particules montent, dérivent avec le vent, s'éteignent, puis renaissent à une cheminée tirée au hasard. */
export function stepSmoke(puffs: Puff[], sources: SmokeSource[], dt: number, wind: number, random: () => number = Math.random): void {
  for (const puff of puffs) {
    if (puff.age < puff.life) {
      puff.age += dt
      puff.y += 0.42 * dt
      puff.x += (wind + puff.drift) * dt
      puff.z += puff.drift * 0.5 * dt
    } else if (sources.length && random() < Math.min(1, dt * 0.5)) {
      const source = sources[Math.floor(random() * sources.length) % sources.length]
      puff.x = source.x + (random() - 0.5) * 0.1
      puff.y = source.y
      puff.z = source.z + (random() - 0.5) * 0.1
      puff.age = 0
      puff.life = 2.5 + random() * 2
      puff.drift = (random() - 0.5) * 0.12
    }
  }
}
/** Opacité : la fumée apparaît puis se dissipe (0 pour une particule éteinte). */
export const smokeAlpha = (puff: Puff): number => (puff.age >= puff.life || puff.life <= 0 ? 0 : Math.sin((Math.PI * puff.age) / puff.life) * 0.55)
/** Taille : la fumée s'élargit en montant. */
export const smokeSize = (puff: Puff): number => 0.14 + (puff.life > 0 ? 0.32 * (puff.age / puff.life) : 0)
