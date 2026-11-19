import * as THREE from 'three/webgpu';
import { normalView, vec3 } from 'three/tsl';

class ThinLeafLightingModel extends THREE.PhysicalLightingModel {
  constructor(material){
    super(material.useClearcoat,material.useSheen,false,
      material.useAnisotropy,material.useTransmission,material.useDispersion);
  }
  indirectSpecular(builder){
    const irradiance=builder.context.iblIrradiance;
    builder.context.iblIrradiance=irradiance.mul(.22);
    super.indirectSpecular(builder);
    builder.context.iblIrradiance=irradiance;
  }
  indirectDiffuse(builder){
    super.indirectDiffuse(builder);
    // The local irradiance also passes through thin growing leaves. It is
    // attenuated by plant cavity AO alongside the reflected diffuse term.
    builder.context.reflectedLight.indirectDiffuse.addAssign(
      builder.material.groveIrradianceNode.mul(builder.material.leafTransmissionNode).mul(.30/Math.PI));
  }
  direct(input,builder){
    super.direct(input,builder);
    const entry=normalView.dot(input.lightDirection).negate().max(0);
    input.reflectedLight.directDiffuse.addAssign(input.lightColor.mul(entry)
      .mul(builder.material.leafTransmissionNode).mul(1/Math.PI));
  }
}

export class ThinLeafMaterial extends THREE.MeshPhysicalNodeMaterial {
  static get type(){return 'ThinLeafMaterial';}
  constructor(parameters={}){
    super(parameters);this.leafTransmissionNode=vec3(0);this.groveIrradianceNode=vec3(0);
  }
  setupLightMap(){return new THREE.IrradianceNode(this.groveIrradianceNode);}
  setupLightingModel(){return new ThinLeafLightingModel(this);}
}
