import * as THREE from 'three'
import type { SkyPalette } from './palette'

const VERTEX = `varying vec3 vDir;
void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); gl_Position.z = gl_Position.w; }`
const FRAGMENT = `uniform vec3 uZenith; uniform vec3 uHorizon; uniform vec3 uGround; uniform vec3 uSunColor; uniform vec3 uSunDir;
uniform float uTime; uniform float uClouds; uniform float uDisc;
varying vec3 vDir;
float h21( vec2 p ) { return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453 ); }
float vnoise( vec2 p ) { vec2 i = floor( p ); vec2 f = fract( p ); f = f * f * ( 3.0 - 2.0 * f ); return mix( mix( h21( i ), h21( i + vec2( 1.0, 0.0 ) ), f.x ), mix( h21( i + vec2( 0.0, 1.0 ) ), h21( i + vec2( 1.0, 1.0 ) ), f.x ), f.y ); }
float fbm( vec2 p ) { float a = 0.5; float s = 0.0; for ( int i = 0; i < 4; i ++ ) { s += a * vnoise( p ); p *= 2.03; a *= 0.5; } return s; }
void main() {
  vec3 d = normalize( vDir );
  vec3 col = mix( uHorizon, uZenith, pow( max( d.y, 0.0 ), 0.55 ) );
  col = mix( col, uGround, smoothstep( 0.0, -0.2, d.y ) );
  float sd = max( dot( d, normalize( uSunDir ) ), 0.0 );
  col += uSunColor * ( pow( sd, 900.0 ) * 6.0 * uDisc + pow( sd, 24.0 ) * 0.35 );
  vec2 p = d.xz / ( d.y + 0.35 ) * 1.4 + vec2( uTime * 0.01, 0.0 );
  float c = smoothstep( 0.5, 0.85, fbm( p ) * uClouds + ( 1.0 - uClouds ) * 0.2 );
  vec3 cloud = mix( vec3( 1.0 ), uHorizon, 0.25 ) * ( 0.55 + 0.45 * smoothstep( -0.2, 0.4, uSunDir.y ) );
  col = mix( col, cloud, c * smoothstep( 0.0, 0.25, d.y ) * 0.85 );
  gl_FragColor = vec4( col, 1.0 );
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`

/** Ciel procédural (dégradé, soleil, nuages) et éclairage d'ambiance : le même ciel est cuit en carte d'environnement (PMREM). */
export class SkyRig {
  readonly mesh: THREE.Mesh
  private readonly material: THREE.ShaderMaterial
  private readonly environmentScene = new THREE.Scene()
  private readonly pmrem: THREE.PMREMGenerator | null
  private target: THREE.WebGLRenderTarget | null = null

  constructor(gl?: THREE.WebGLRenderer) {
    this.material = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false, vertexShader: VERTEX, fragmentShader: FRAGMENT,
      uniforms: {
        uZenith: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() }, uGround: { value: new THREE.Color() }, uSunColor: { value: new THREE.Color() },
        uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uTime: { value: 0 }, uClouds: { value: 0.55 }, uDisc: { value: 1 },
      },
    })
    const sphere = new THREE.SphereGeometry(1, 32, 16)
    this.mesh = new THREE.Mesh(sphere, this.material)
    this.mesh.scale.setScalar(160)
    this.mesh.renderOrder = -10
    this.mesh.frustumCulled = false
    this.environmentScene.add(new THREE.Mesh(sphere, this.material))
    this.pmrem = gl ? new THREE.PMREMGenerator(gl) : null
  }

  update(sunDirection: THREE.Vector3, palette: SkyPalette, time: number): void {
    const uniforms = this.material.uniforms
    uniforms.uZenith.value.setRGB(...palette.zenith)
    uniforms.uHorizon.value.setRGB(...palette.horizon)
    uniforms.uGround.value.setRGB(...palette.ground)
    uniforms.uSunColor.value.setRGB(...palette.sun)
    uniforms.uSunDir.value.copy(sunDirection)
    uniforms.uClouds.value = palette.clouds
    uniforms.uTime.value = time
  }

  /** Le ciel suit la caméra : il reste à l'infini. */
  follow(position: THREE.Vector3): void {
    this.mesh.position.copy(position)
  }

  /** Cuit le ciel actuel (sans disque solaire, déjà rendu par la lumière directe) en éclairage d'environnement. */
  bake(scene: THREE.Scene): void {
    if (!this.pmrem) return
    this.material.uniforms.uDisc.value = 0
    const next = this.pmrem.fromScene(this.environmentScene, 0, 0.1, 200)
    this.material.uniforms.uDisc.value = 1
    this.target?.dispose()
    this.target = next
    scene.environment = next.texture
  }

  dispose(): void {
    this.target?.dispose()
    this.pmrem?.dispose()
    this.material.dispose()
  }
}
