import * as THREE from 'three/webgpu';

// Soft canopy openings and a low green bounce replace the hemisphere,
// frontal fill and moss spot. The two local backlights still drive SSS.
export function createReflectionEnvironment(){
  const width=512,height=256,data=new Uint16Array(width*height*4);
  const lobes=[
    {direction:[.8,.45,-.65],color:'#9bd8ff',power:3.4,width:9},
    {direction:[-.5,.9,.25],color:'#e1edff',power:2.4,width:4},
    {direction:[-.7,.3,.65],color:'#d6e3ef',power:.75,width:3},
    {direction:[-.5,.3,-1],color:'#ffcea1',power:2.6,width:11},
    {direction:[-.65,-.18,-.5],color:'#d2ed99',power:1.0,width:5},
    {direction:[.5,-.35,.4],color:'#7caa83',power:.22,width:2},
  ].map(l=>({...l,direction:new THREE.Vector3(...l.direction).normalize(),color:new THREE.Color(l.color)}));
  const direction=new THREE.Vector3(),value=new THREE.Color();
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const theta=(y+.5)/height*Math.PI,phi=((x+.5)/width-.5)*Math.PI*2;
    direction.set(Math.sin(theta)*Math.cos(phi),Math.cos(theta),Math.sin(theta)*Math.sin(phi));
    const sky=Math.max(0,direction.y);
    value.setRGB(.006+sky*.018,.009+sky*.024,.010+sky*.035);
    for(const l of lobes){
      const energy=Math.exp((direction.dot(l.direction)-1)*l.width)*l.power;
      value.r+=l.color.r*energy;value.g+=l.color.g*energy;value.b+=l.color.b*energy;
    }
    const i=(y*width+x)*4;
    data[i]=THREE.DataUtils.toHalfFloat(value.r);data[i+1]=THREE.DataUtils.toHalfFloat(value.g);
    data[i+2]=THREE.DataUtils.toHalfFloat(value.b);data[i+3]=THREE.DataUtils.toHalfFloat(1);
  }
  const texture=new THREE.DataTexture(data,width,height,THREE.RGBAFormat,THREE.HalfFloatType);
  texture.mapping=THREE.EquirectangularReflectionMapping;texture.needsUpdate=true;
  texture.name='Soft canopy and woodland bounce environment';
  return texture;
}
