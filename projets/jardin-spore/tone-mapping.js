import { Fn, mat3, mix, uniform, vec3 } from 'three/tsl';

// ACES fit adapted from Three.js (MIT); see licenses/three.js.txt.
// Three.js's ACES fitted transform, with an additional C1-continuous shoulder.
// This is an artistic extension of the fit, not an ACES HDR output transform.
// Headroom 1 reproduces the stock SDR fit. In AP1, values <= 1 are unchanged;
// the extra shoulder approaches (headroom - 1) without changing the toe.
export const acesHDR = Fn(([rgb, exposure, headroom]) => {
  const input = mat3(.59719,.35458,.04823, .07600,.90834,.01566, .02840,.13383,.83777);
  const output = mat3(1.60475,-.53108,-.07367, -.10208,1.10813,-.00605, -.00327,-.07276,1.07602);
  const x = input.mul(rgb.max(0).mul(exposure).div(.6)).toVar();
  const numerator = x.mul(x.add(.0245786)).sub(.000090537);
  const denominator = x.mul(x.mul(.983729).add(.4329510)).add(.238081);
  const shoulder = x.sub(1).max(0).toVar();
  const extension = shoulder.div(shoulder.add(4)).pow(2).mul(headroom.sub(1));
  return output.mul(numerator.div(denominator).add(extension)).clamp(0,headroom);
});

export const EXPOSURE_DEFAULT = .5;
export const GRADE_DEFAULTS = Object.freeze({saturation:1.1,contrast:1.5,warmth:.25,tint:.43});

export function createToneMapping(){
  const exposure=uniform(EXPOSURE_DEFAULT),headroom=uniform(1);
  const grade=Object.fromEntries(Object.entries(GRADE_DEFAULTS).map(([key,value])=>[key,uniform(value)]));
  const luminance=vec3(.2126,.7152,.0722);
  const applyGrade=Fn(([rgb])=>{
    // Artistic white balance in exposure stops; normalize to keep gray luminance.
    const stops=vec3(grade.warmth.mul(.35).add(grade.tint.mul(.12)),grade.tint.mul(-.20),grade.warmth.mul(-.35).add(grade.tint.mul(.12)));
    const gains=stops.exp2().toVar();
    const balanced=rgb.max(0).mul(gains.div(gains.dot(luminance))).toVar();
    const y=balanced.dot(luminance).toVar();
    const saturated=mix(vec3(y),balanced,grade.saturation).max(0);
    // Contrast pivots around scene-linear 18% gray. The floor prevents 0^negative.
    const scale=y.div(.18).max(.000001).pow(grade.contrast.sub(1));
    return saturated.mul(scale);
  });
  return {exposure,headroom,grade,applyGrade,
    apply:rgb=>acesHDR(applyGrade(rgb),exposure,headroom),
    values:()=>Object.fromEntries(Object.entries(grade).map(([key,node])=>[key,node.value])),
    reset(){for(const [key,value] of Object.entries(GRADE_DEFAULTS))grade[key].value=value;}
  };
}
