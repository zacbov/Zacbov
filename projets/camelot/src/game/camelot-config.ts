export const DEFAULT_CONFIG = {
  camera: {
    panSpeed: 5.5,
    zoomSpeed: 1,
  },
  economy: {
    productionMultiplier: 1,
  },
} as const

type MutableConfig<T> = { -readonly [K in keyof T]: T[K] extends number ? number : T[K] extends object ? MutableConfig<T[K]> : T[K] }
export const CONFIG: MutableConfig<typeof DEFAULT_CONFIG> = structuredClone(DEFAULT_CONFIG)
