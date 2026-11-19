import * as THREE from 'three/webgpu';
import { Fn, attribute, color, diffuseColor, float, mix, mrt, normalWorld, positionWorld, property, uniform, vec3, vec4, vertexStage } from 'three/tsl';

const tissueDiffuse = property('vec3', 'tissueDiffuse');

// Keep diffuse transport separate from the microfacet reflection. The diffusion
// pass spreads only the former, so moist highlights and gill edges stay sharp.
class TissueLightingModel extends THREE.PhysicalLightingModel {
  constructor(material) {
    super(material.useClearcoat, material.useSheen, false,
      material.useAnisotropy, material.useTransmission, material.useDispersion);
  }
  indirectSpecular(builder) {
    // The studio environment supplies broad reflections; local lights provide
    // the diffuse illumination. Keep that fill separate so colored
    // reflections do not wash the transmitted flesh into flat white.
    const irradiance=builder.context.iblIrradiance;
    builder.context.iblIrradiance=irradiance.mul(.35);
    super.indirectSpecular(builder);
    builder.context.iblIrradiance=irradiance;
  }
  finish(builder) {
    const transport = builder.material.volumeTransportNode.toVar('tissueTransmission');
    builder.lightsNode.totalDiffuseNode.addAssign(transport);
    builder.context.outgoingLight.addAssign(transport);
    tissueDiffuse.assign(builder.lightsNode.totalDiffuseNode);
    super.finish(builder);
  }
}

export class TissueMaterial extends THREE.MeshPhysicalNodeMaterial {
  constructor(parameters = {}) {
    super(parameters);
    this.volumeTransportNode = vec3(0);
    this.groveIrradianceNode = vec3(0);
    this.fog = false;
  }
  setupLightingModel() { return new TissueLightingModel(this); }
  setupLightMap(){return new THREE.IrradianceNode(this.groveIrradianceNode);}
}

export function createTissueOptics(sss, glow) {
  const keyPosition = uniform(new THREE.Vector3(-.4,1.6,-2.4));
  const bluePosition = uniform(new THREE.Vector3(2,2.4,-1.6));
  const keyDirection = uniform(new THREE.Vector3(.4,-.45,2.4).normalize());
  const keyPower = uniform(48), bluePower = uniform(10);
  const keyColor = uniform(new THREE.Color('#ffb49d'));
  const blueColor = uniform(new THREE.Color('#65cfff'));
  const optical = attribute('optical', 'vec4'); // radius, vertical thickness, part, individual ID
  const axis = attribute('tissueAxis', 'vec3').normalize();
  const anatomy = attribute('anatomy', 'vec3');

  const irradiance = Fn(([lightPosition, tint, power, spotlight, density]) => {
    const toLight = lightPosition.sub(positionWorld);
    const distance2 = toLight.dot(toLight).max(.09);
    const direction = toLight.normalize();
    const facing = normalWorld.dot(direction);
    const back = facing.negate().max(0);
    const axial = axis.dot(direction);
    // The analytic chord through the local cylinder varies from its full
    // diameter to zero at the silhouette. This is physical path length, not
    // the view/light half-vector used by the earlier thin-surface shader.
    const stemPath = optical.x.mul(2).mul(back).div(axial.pow2().oneMinus().max(.06));
    const radial = vec3(anatomy.x,0,anatomy.z.mul(.91)).mul(optical.x);
    const lateral = direction.sub(axis.mul(axial));
    const a = lateral.dot(lateral).max(.005), b = radial.dot(lateral);
    const c = radial.dot(radial).sub(optical.x.pow2());
    const edgePath = b.negate().add(b.pow2().sub(a.mul(c)).max(0).sqrt()).div(a).max(.001);
    const slabPath = optical.y.div(axial.abs().max(.08));
    const isGill=optical.z.greaterThan(.5).and(optical.z.lessThan(1.5));
    // Geometry supplies local thickness; no light-depth/shadow render is used.
    const path = optical.z.greaterThan(1.5).select(stemPath,isGill.select(slabPath,slabPath.min(edgePath))).clamp(.001,2);

    // Reduced scattering + absorption give a wavelength-dependent effective
    // extinction coefficient (diffusion approximation). Units match geometry:
    // one scene unit is approximately 10 cm. These are artistic tissue values,
    // not measured mushroom optical constants.
    const sigmaA = vec3(.25,2.8,5.5);
    const sigmaS = vec3(14,21,28);
    const sigmaTr = sigmaA.mul(sigmaA.add(sigmaS)).mul(3).sqrt().div(sss.mul(1.2).add(.8));
    const transmittance = path.mul(sigmaTr).mul(density).negate().exp();
    const cone = direction.negate().dot(keyDirection).smoothstep(.58,.94);
    const light = tint.mul(power).div(distance2).mul(mix(1,cone,spotlight));
    // Diffuse exit radiance includes the Lambertian 1/pi normalization and
    // an entry-angle term. It therefore cannot brighten without incident light.
    // The pleated exit normal is not the entry normal of a cap. Use its
    // macroscopic surface for incident irradiance: otherwise every fin turns
    // transmission off as it bends, making illuminated flesh look opaque.
    const capEntry=axial.abs().mul(.7).add(.3);
    const stemEntry=back.smoothstep(0,.3).mul(back.mul(.5).add(.5));
    const entry=optical.z.greaterThan(1.5).select(stemEntry,capEntry);
    return light.mul(transmittance).mul(entry).mul(.55/Math.PI).mul(sss.clamp(0,1));
  });

  function apply(material) {
    const density=material.transportDensityNode??float(1);
    const transport=irradiance(keyPosition,keyColor,keyPower,float(1),density)
      .add(irradiance(bluePosition,blueColor,bluePower,float(0),density));
    material.volumeTransportNode = vertexStage(transport.mul(material.transportScaleNode??float(1)))
      .mul(material.transportColorNode ?? material.colorNode ?? diffuseColor.rgb);
    const halfAlbedo = diffuseColor.rgb.max(.02).sqrt();
    const radius = optical.z.greaterThan(1.5).select(.055,optical.z.greaterThan(.5).select(.012,.065));
    material.mrtNode = mrt({
      scatter: vec4(tissueDiffuse.div(halfAlbedo),float(radius).mul(sss.sqrt())),
      tissue: vec4(halfAlbedo,optical.w.div(32)),
    });
    const bioluminescence = mix(color('#ff626f'),color('#52b8ff'),anatomy.x.smoothstep(-.6,.6));
    const tissue=attribute('tissue','vec3');
    const thinRim=tissue.x.smoothstep(.7,1);
    const lamellaGlow=mix(color('#ff982b'),color('#ffcc78'),tissue.x.smoothstep(.12,.85));
    const luminousFlesh=optical.z.greaterThan(.5).and(optical.z.lessThan(1.5)).select(lamellaGlow,
      mix(bioluminescence,color('#64edff'),thinRim.mul(optical.z.lessThan(1.5)).mul(.35)));
    const glowShape=optical.z.greaterThan(1.5).select(.12,
      optical.z.greaterThan(.5).select(tissue.z.smoothstep(.88,1).mul(4).add(.10),tissue.x.smoothstep(.965,1).pow2().mul(1.2).add(.035)));
    material.emissiveNode = luminousFlesh.mul(glow).mul(glowShape).mul(.10);
    return material;
  }
  return {apply,keyPosition,bluePosition,keyDirection,keyPower,bluePower,keyColor,blueColor};
}
