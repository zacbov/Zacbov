import type * as THREE from 'three'
import { flags } from './flags'

export type SurfaceKind = 'ground' | 'wall' | 'foliage' | 'stone'

const NOISE = `float h21( vec2 p ) { return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453 ); }
float vnoise( vec2 p ) { vec2 i = floor( p ); vec2 f = fract( p ); f = f * f * ( 3.0 - 2.0 * f ); return mix( mix( h21( i ), h21( i + vec2( 1.0, 0.0 ) ), f.x ), mix( h21( i + vec2( 0.0, 1.0 ) ), h21( i + vec2( 1.0, 1.0 ) ), f.x ), f.y ); }
float fbm( vec2 p ) { float a = 0.5; float s = 0.0; for ( int i = 0; i < 4; i ++ ) { s += a * vnoise( p ); p *= 2.03; a *= 0.5; } return s; }`

/** Variations d'albédo calculées en coordonnées du monde : aucune texture à charger, aucun motif répété visible. */
const FACTORS: Record<SurfaceKind, string> = {
  ground: `float sn = fbm( vSurfaceWorld.xz * 0.55 );
float sm = fbm( vSurfaceWorld.xz * 2.3 + 7.0 );
diffuseColor.rgb *= ( 0.84 + 0.32 * sn ) * ( 0.94 + 0.12 * sm );
diffuseColor.rgb = mix( diffuseColor.rgb, diffuseColor.rgb * vec3( 1.12, 0.95, 0.78 ), smoothstep( 0.6, 0.76, fbm( vSurfaceWorld.xz * 0.3 + 3.0 ) ) * 0.7 );`,
  wall: `float sy = vSurfaceWorld.y;
float wn = fbm( vSurfaceWorld.xz * 9.0 + sy * 5.0 );
float streak = vnoise( vec2( ( vSurfaceWorld.x + vSurfaceWorld.z ) * 8.0, sy * 1.6 ) );
float dirt = 1.0 - ( 1.0 - smoothstep( 0.0, 0.35, sy ) ) * 0.38;
diffuseColor.rgb *= dirt * ( 0.88 + 0.24 * wn ) * ( 0.93 + 0.12 * streak );`,
  foliage: `diffuseColor.rgb *= 0.8 + 0.4 * fbm( vSurfaceWorld.xz * 3.0 + vSurfaceWorld.y * 2.0 );`,
  stone: `diffuseColor.rgb *= 0.82 + 0.36 * fbm( vSurfaceWorld.xz * 4.0 + vSurfaceWorld.y * 3.0 );`,
}

/** Ajoute à un matériau standard le motif procédural `kind` (sans effet si ?tex=0). Renvoie le même matériau. */
export function applySurface<T extends THREE.Material>(material: T, kind: SurfaceKind): T {
  if (!flags.tex) return material
  material.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vSurfaceWorld;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvec4 surfaceWorld = vec4( transformed, 1.0 );\n#ifdef USE_INSTANCING\nsurfaceWorld = instanceMatrix * surfaceWorld;\n#endif\nvSurfaceWorld = ( modelMatrix * surfaceWorld ).xyz;')
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vSurfaceWorld;\n${NOISE}`)
      .replace('#include <color_fragment>', `#include <color_fragment>\n${FACTORS[kind]}`)
  }
  material.customProgramCacheKey = () => `surface-${kind}`
  return material
}
