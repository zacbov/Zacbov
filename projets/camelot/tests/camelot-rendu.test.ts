import { describe, expect, it } from 'vitest'
import { centerWeight, stepExposure, targetExposure } from '../src/engine/exposure'
import { FinishShader } from '../src/render/finish'
import { flags, setFlags } from '../src/render/flags'
import { skyColors } from '../src/render/palette'
import { applySurface } from '../src/render/surface'

const balanced = (code: string, open: string, close: string) => code.split(open).length === code.split(close).length

describe('chaîne de lumière : logique pure', () => {
  it('le ciel s’éclaircit avec le soleil, rougit au crépuscule et suit les saisons', () => {
    const night = skyColors(-0.35, 0), noon = skyColors(0.95, 0), dusk = skyColors(0.05, 0)
    expect(noon.horizon[2]).toBeGreaterThan(night.horizon[2] * 3)
    expect(dusk.horizon[0]).toBeGreaterThan(dusk.horizon[2])
    expect(night.sun).toEqual([0, 0, 0])
    expect(noon.sun[0]).toBeGreaterThan(0.9)
    expect(skyColors(0.95, 2).horizon[0] / skyColors(0.95, 2).horizon[2]).toBeGreaterThan(noon.horizon[0] / noon.horizon[2])
    expect(skyColors(0.95, 3).clouds).toBeGreaterThan(skyColors(0.95, 0).clouds)
  })

  it('l’exposition vise le gris moyen, reste bornée et s’adapte en environ 1,5 s', () => {
    expect(targetExposure(0.05)).toBe(2)
    expect(targetExposure(0.9)).toBe(0.6)
    expect(Math.abs(targetExposure(0.32) - 1) < 1e-9).toBe(true)
    const after = stepExposure(1, 2, 1.5)
    expect(after).toBeGreaterThan(1.6)
    expect(after).toBeLessThan(1.7)
    expect(stepExposure(1, 2, 0)).toBe(1)
    expect(centerWeight(0, 0)).toBeGreaterThan(centerWeight(1, 1))
  })

  it('les shaders de la passe finale sont complets et équilibrés', () => {
    const { fragmentShader, vertexShader, uniforms } = FinishShader
    for (const name of ['tDiffuse', 'exposure', 'vignette', 'aberration', 'grain', 'sharpen', 'resolution', 'time']) {
      expect(Object.keys(uniforms)).toContain(name)
      expect(fragmentShader).toContain(name)
    }
    expect(fragmentShader).toContain('gl_FragColor')
    expect(vertexShader).toContain('gl_Position')
    for (const code of [fragmentShader, vertexShader]) {
      expect(balanced(code, '{', '}') && balanced(code, '(', ')')).toBe(true)
    }
  })

  it('les motifs de surface s’injectent dans les shaders standard, sauf avec ?tex=0', () => {
    const material: any = {}
    applySurface(material, 'wall')
    const shader = { vertexShader: '#include <common>\n#include <begin_vertex>', fragmentShader: '#include <common>\n#include <color_fragment>' }
    material.onBeforeCompile(shader)
    expect(shader.vertexShader).toContain('vSurfaceWorld = ( modelMatrix * surfaceWorld ).xyz;')
    expect(shader.fragmentShader).toContain('diffuseColor.rgb *=')
    expect(material.customProgramCacheKey()).toBe('surface-wall')
    expect(balanced(shader.fragmentShader, '{', '}') && balanced(shader.fragmentShader, '(', ')')).toBe(true)
    setFlags({ tex: false })
    const plain: any = {}
    applySurface(plain, 'ground')
    expect(plain.onBeforeCompile).toBe(undefined)
    setFlags({ tex: true })
    expect(flags.tex).toBe(true)
  })
})
