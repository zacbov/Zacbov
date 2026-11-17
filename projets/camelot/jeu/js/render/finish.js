export const FinishShader = {
    name: 'FinishShader',
    uniforms: {
        tDiffuse: {
            value: null
        },
        exposure: {
            value: 1
        },
        resolution: {
            value: [
                1,
                1
            ]
        },
        time: {
            value: 0
        },
        vignette: {
            value: 0.3
        },
        aberration: {
            value: 0.0013
        },
        grain: {
            value: 0.02
        },
        sharpen: {
            value: 0.3
        }
    },
    vertexShader: `varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }`,
    fragmentShader: `uniform sampler2D tDiffuse;
uniform float exposure, time, vignette, aberration, grain, sharpen;
uniform vec2 resolution;
varying vec2 vUv;
float hash( vec2 p ) { vec3 p3 = fract( vec3( p.xyx ) * 0.1031 ); p3 += dot( p3, p3.yzx + 33.33 ); return fract( ( p3.x + p3.y ) * p3.z ); }
vec3 aces( vec3 x ) { return clamp( ( x * ( 2.51 * x + 0.03 ) ) / ( x * ( 2.43 * x + 0.59 ) + 0.14 ), 0.0, 1.0 ); }
vec3 neutral( vec3 color ) {
  const float startCompression = 0.76;
  const float desaturation = 0.15;
  float x = min( color.r, min( color.g, color.b ) );
  float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
  color -= offset;
  float peak = max( color.r, max( color.g, color.b ) );
  if ( peak < startCompression ) return color;
  float d = 1.0 - startCompression;
  float newPeak = 1.0 - d * d / ( peak + d - startCompression );
  color *= newPeak / peak;
  float g = 1.0 - 1.0 / ( desaturation * ( peak - newPeak ) + 1.0 );
  return mix( color, vec3( newPeak ), g );
}
vec3 toSrgb( vec3 c ) { return mix( c * 12.92, 1.055 * pow( c, vec3( 1.0 / 2.4 ) ) - 0.055, step( 0.0031308, c ) ); }
void main() {
  vec2 c = vUv - 0.5;
  vec2 px = 1.0 / resolution;
  vec3 col = vec3( texture2D( tDiffuse, vUv + c * aberration ).r, texture2D( tDiffuse, vUv ).g, texture2D( tDiffuse, vUv - c * aberration ).b );
  vec3 blur = ( texture2D( tDiffuse, vUv + vec2( px.x, 0.0 ) ).rgb + texture2D( tDiffuse, vUv - vec2( px.x, 0.0 ) ).rgb + texture2D( tDiffuse, vUv + vec2( 0.0, px.y ) ).rgb + texture2D( tDiffuse, vUv - vec2( 0.0, px.y ) ).rgb ) * 0.25;
  col += ( col - blur ) * sharpen;
  col = max( col * exposure, 0.0 );
  vec3 ldr = toSrgb( mix( aces( col ), neutral( col ), 0.25 ) );
  float luma = dot( ldr, vec3( 0.2126, 0.7152, 0.0722 ) );
  ldr = mix( ldr, ldr * ldr * ( 3.0 - 2.0 * ldr ), 0.3 );
  ldr += vec3( -0.012, 0.0, 0.018 ) * ( 1.0 - luma );
  ldr += vec3( 0.02, 0.012, -0.012 ) * smoothstep( 0.55, 1.0, luma );
  ldr = ldr * 0.97 + 0.012;
  float dist = length( c * vec2( resolution.x / resolution.y, 1.0 ) );
  ldr *= mix( 1.0, smoothstep( 0.95, 0.25, dist ), vignette );
  ldr += ( hash( vUv * resolution + time ) - 0.5 ) * grain * ( 1.0 - 0.6 * luma );
  ldr += ( hash( vUv * resolution * 1.37 + 17.0 ) - 0.5 ) / 255.0;
  gl_FragColor = vec4( clamp( ldr, 0.0, 1.0 ), 1.0 );
}`
};
