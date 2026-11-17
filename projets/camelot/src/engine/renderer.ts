import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { FinishShader } from '../render/finish'
import { flags } from '../render/flags'
import { centerWeight } from './exposure'
import { reportOnce } from './guard'
import { chooseQuality } from './quality'
import type { Quality } from './save'

type Preset = { pixelRatio: number; shadows: boolean; shadowMap: number; bloom: boolean; antialias: boolean }
export const QUALITY_PRESETS: Record<Quality, Preset> = {
  low: { pixelRatio: 1, shadows: false, shadowMap: 512, bloom: false, antialias: false },
  medium: { pixelRatio: 1.5, shadows: true, shadowMap: 1024, bloom: false, antialias: true },
  high: { pixelRatio: 2, shadows: true, shadowMap: 2048, bloom: true, antialias: true },
  ultra: { pixelRatio: 2, shadows: true, shadowMap: 4096, bloom: true, antialias: true },
}

/** Nom du processeur graphique (vide si indisponible), pour choisir la qualité de départ. */
function detectGpu(): string {
  try {
    const canvas = document.createElement('canvas')
    const gl = (canvas.getContext('webgl') ?? canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null
    const info = gl?.getExtension('WEBGL_debug_renderer_info')
    const name = gl && info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : ''
    gl?.getExtension('WEBGL_lose_context')?.loseContext()
    return name
  } catch { return '' }
}

/** Qualité de départ : téléphone, processeur intégré ou machine puissante. Le joueur peut la changer. */
export function suggestQuality(): Quality {
  return chooseQuality({ coarsePointer: matchMedia('(pointer: coarse)').matches, gpu: detectGpu() })
}

/**
 * Possède le moteur WebGL et la chaîne de rendu : scène en HDR linéaire (MSAA) → bloom → passe finale
 * (exposition, étalonnage, vignette, grain). Si la chaîne échoue, repli sur le rendu direct.
 */
export class Renderer {
  readonly gl: THREE.WebGLRenderer
  private composer?: EffectComposer
  private bloom?: UnrealBloomPass
  private finish?: ShaderPass
  private preset: Preset
  private scene?: THREE.Scene
  private camera?: THREE.PerspectiveCamera
  private readonly handleResize = (): void => this.resize()
  private renderScale = 1
  private readonly bloomAllowed: boolean
  private chainBroken = false
  private clockSeconds = 0
  private meter?: { target: THREE.WebGLRenderTarget; buffer: Uint8Array }

  constructor(readonly canvas: HTMLCanvasElement, quality: Quality, options: { bloom?: boolean } = {}) {
    this.bloomAllowed = options.bloom !== false
    this.preset = QUALITY_PRESETS[quality]
    this.gl = new THREE.WebGLRenderer({ canvas, antialias: this.preset.antialias, powerPreference: 'high-performance' })
    this.gl.outputColorSpace = THREE.SRGBColorSpace
    this.gl.toneMapping = THREE.ACESFilmicToneMapping
    this.gl.toneMappingExposure = 1
    // Ombres douces : variance (VSM) dès 2048, sinon filtrage PCF. Un shader en échec déclenche le repli et un bandeau d'erreur.
    this.gl.shadowMap.type = flags.soft && this.preset.shadowMap >= 2048 ? THREE.VSMShadowMap : THREE.PCFSoftShadowMap
    this.gl.debug.onShaderError = () => {
      reportOnce('shader', new Error('Un shader n’a pas compilé (voir la console). Essayez l’adresse avec ?tex=0, ?grade=0 ou ?light=0 pour situer le défaut.'))
      this.chainBroken = true
    }
    this.applyQuality(quality)
    window.addEventListener('resize', this.handleResize)
  }

  get shadowMapSize(): number {
    return this.preset.shadowMap
  }

  /** Vrai quand la chaîne HDR (bloom et passe finale) est active. */
  get postProcessing(): boolean {
    return !!this.composer && !this.chainBroken
  }

  applyQuality(quality: Quality): void {
    this.preset = QUALITY_PRESETS[quality]
    this.gl.shadowMap.enabled = this.preset.shadows
    this.applyPixelRatio()
    this.disposeChain()
    this.resize()
  }

  private disposeChain(): void {
    this.bloom?.dispose()
    this.composer?.dispose()
    this.composer = undefined
    this.bloom = undefined
    this.finish = undefined
  }

  get scale(): number {
    return this.renderScale
  }

  private applyPixelRatio(): void {
    this.gl.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.preset.pixelRatio) * this.renderScale)
  }

  /** Résolution dynamique : échelle de rendu entre 0,6 et 1 (le HUD reste net, c'est un élément DOM). */
  setRenderScale(scale: number): void {
    this.renderScale = Math.max(0.6, Math.min(1, scale))
    this.applyPixelRatio()
    this.resize()
  }

  /** Exposition (ouverture de l'objectif), appliquée à la passe finale ou au rendu direct. */
  setExposure(value: number): void {
    this.gl.toneMappingExposure = value
    if (this.finish) this.finish.uniforms.exposure.value = value
  }

  /**
   * Luminance moyenne de la scène (0..1, linéaire, centre favorisé) mesurée sur une image de 32 × 18 :
   * sert l'exposition automatique. Les ombres ne sont pas recalculées pendant la mesure.
   */
  measureLuminance(scene: THREE.Scene, camera: THREE.PerspectiveCamera): number {
    const width = 32, height = 18
    this.meter ??= { target: new THREE.WebGLRenderTarget(width, height, { type: THREE.UnsignedByteType }), buffer: new Uint8Array(width * height * 4) }
    const previous = this.gl.getRenderTarget()
    const autoUpdate = this.gl.shadowMap.autoUpdate
    this.gl.shadowMap.autoUpdate = false
    this.gl.setRenderTarget(this.meter.target)
    this.gl.render(scene, camera)
    this.gl.readRenderTargetPixels(this.meter.target, 0, 0, width, height, this.meter.buffer)
    this.gl.setRenderTarget(previous)
    this.gl.shadowMap.autoUpdate = autoUpdate
    let sum = 0, weights = 0
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const at = (y * width + x) * 4, weight = centerWeight((x / (width - 1)) * 2 - 1, (y / (height - 1)) * 2 - 1)
        sum += weight * (0.2126 * this.meter.buffer[at] + 0.7152 * this.meter.buffer[at + 1] + 0.0722 * this.meter.buffer[at + 2]) / 255
        weights += weight
      }
    }
    return sum / weights
  }

  private ensureComposer(scene: THREE.Scene, camera: THREE.PerspectiveCamera): EffectComposer | undefined {
    if (this.chainBroken || !this.preset.bloom || !this.bloomAllowed) return undefined
    if (this.composer && this.scene === scene && this.camera === camera) return this.composer
    this.scene = scene
    this.camera = camera
    const size = this.gl.getSize(new THREE.Vector2())
    const pixel = this.gl.getPixelRatio()
    const target = new THREE.WebGLRenderTarget(Math.max(1, Math.floor(size.x * pixel)), Math.max(1, Math.floor(size.y * pixel)), { type: THREE.HalfFloatType, samples: 4 })
    this.composer = new EffectComposer(this.gl, target)
    this.composer.addPass(new RenderPass(scene, camera))
    this.bloom = new UnrealBloomPass(size, 0.16, 0.5, 1.0)
    this.composer.addPass(this.bloom)
    if (flags.grade) {
      this.finish = new ShaderPass(FinishShader as never)
      this.finish.uniforms.exposure.value = this.gl.toneMappingExposure
      this.composer.addPass(this.finish)
    } else {
      this.composer.addPass(new OutputPass())
    }
    this.composer.setSize(size.x, size.y)
    return this.composer
  }

  resize(): void {
    const w = this.canvas.clientWidth || window.innerWidth
    const h = this.canvas.clientHeight || window.innerHeight
    this.gl.setSize(w, h, false)
    this.composer?.setSize(w, h)
    if (this.camera) {
      this.camera.aspect = w / h
      this.camera.updateProjectionMatrix()
    }
  }

  render(scene: THREE.Scene, camera: THREE.PerspectiveCamera, seconds = 0): void {
    const w = this.canvas.clientWidth || window.innerWidth
    const h = this.canvas.clientHeight || window.innerHeight
    if (Math.abs(camera.aspect - w / h) > 1e-3) {
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    const composer = this.ensureComposer(scene, camera)
    if (!composer) {
      this.gl.render(scene, camera)
      return
    }
    try {
      this.clockSeconds += seconds
      if (this.finish) {
        const pixel = this.gl.getPixelRatio()
        this.finish.uniforms.time.value = this.clockSeconds % 100
        this.finish.uniforms.resolution.value = [w * pixel, h * pixel]
      }
      composer.render()
    } catch (error) {
      this.chainBroken = true
      reportOnce('chaîne de rendu', error)
      this.gl.setRenderTarget(null)
      this.gl.render(scene, camera)
    }
  }

  dispose(): void {
    window.removeEventListener('resize', this.handleResize)
    this.disposeChain()
    this.meter?.target.dispose()
    this.gl.dispose()
  }
}
