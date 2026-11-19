import * as THREE from 'three/webgpu';
import { randomSeed, smoothstep } from './random.js';

// Solid, keeled lanceolate leaves. Both faces and the edge are geometry so
// FrontSide rendering can stay on the meshlet path, with no alpha cards.
export function createTuftGeometry(seed, shootCount = 7, segments = 3) {
  const random = randomSeed(seed);
  const positions = [], colors = [], plant = [], indices = [];
  let leaves = 0;
  const olive = new THREE.Color('#123d24');
  const green = new THREE.Color('#30752c');
  const fresh = new THREE.Color('#a0c94a');
  const brown = new THREE.Color('#45371b');
  function vertex(x, y, z, color, age, tissue, ao) {
    const index = positions.length / 3;
    positions.push(x, y, z);
    colors.push(color.r, color.g, color.b);
    plant.push(age, tissue, ao);
    return index;
  }
  for (let shoot = 0; shoot < shootCount; shoot++) {
    const angle = shoot * 2.399963 + random() * .5;
    const radius = shoot === 0 ? 0 : .037 * Math.sqrt(shoot / (shootCount - 1));
    const x = Math.cos(angle) * radius, z = Math.sin(angle) * radius;
    const height = (.038 + random() * .020) * (1.15 - radius * 9);
    const bendX = (random() - .5) * .022, bendZ = (random() - .5) * .022;
    const pigment = olive.clone().lerp(green, random());
    const stem = t => new THREE.Vector3(x + bendX * t * t, height * t, z + bendZ * t * t);
    // Tapered brown rhizoid/stem, turning green at its growing tip.
    const offset = positions.length / 3;
    const sides = 5, rings = 4;
    for (let j = 0; j <= rings; j++) {
      const t = j / rings, p = stem(t), r = .00115 * (1 - t * .77);
      const color = brown.clone().lerp(pigment, t);
      for (let k = 0; k < sides; k++) {
        const a = k * Math.PI * 2 / sides;
        vertex(p.x + Math.cos(a) * r, p.y, p.z + Math.sin(a) * r, color, t, 0, .3 + t * .65);
      }
    }
    for (let j = 0; j < rings; j++) for (let k = 0; k < sides; k++) {
      const a = offset + j * sides + k, b = offset + j * sides + (k + 1) % sides;
      indices.push(a, a + sides, b, b, a + sides, b + sides);
    }
    const bottom = vertex(x, 0, z, brown, 0, 0, .3);
    const tip = stem(1);
    const top = vertex(tip.x, tip.y, tip.z, pigment, 1, 0, .95);
    for (let k = 0; k < sides; k++) {
      const next = (k + 1) % sides;
      indices.push(bottom, offset + k, offset + next);
      indices.push(top, offset + rings * sides + next, offset + rings * sides + k);
    }
    // Spiral phyllotaxis, with a tight star of erect leaves at the tip.
    const count = 15 + Math.floor(random() * 5);
    for (let leaf = 0; leaf < count; leaf++) {
      const t = .13 + .86 * leaf / (count - 1);
      const azimuth = leaf * 2.399963 + angle + random() * .28;
      const length = (.021 + random() * .010) * (.65 + Math.sin(t * Math.PI) * .35);
      const width = length * (.135 + random() * .045) * (segments===2?1.12:1);
      const rising = .17 + t * .64;
      const p = stem(t);
      const outward = new THREE.Vector3(Math.cos(azimuth), 0, Math.sin(azimuth));
      const across = new THREE.Vector3(-Math.sin(azimuth), 0, Math.cos(azimuth));
      const color = pigment.clone().lerp(fresh, smoothstep(.45, 1, t) * (.32 + random() * .24));
      if (t < .3) color.lerp(brown, (1 - t / .3) * .55);
      const start = positions.length / 3;
      const bladePoint = (u, v, side) => {
        const profile = Math.pow(Math.sin(Math.PI * Math.pow(u, .66)), 1.35);
        const extension = length * u * Math.sqrt(1 - rising * rising);
        const lift = length * (u * rising + .20 * Math.sin(Math.PI * u) - .14 * u * u);
        const keel = (1 - Math.abs(v)) * width * profile * .32;
        const thickness = side * .00014 * profile;
        const point = p.clone().addScaledVector(outward, extension).addScaledVector(across, v * width * profile);
        point.y += lift + keel + thickness;
        const leafColor = color.clone().multiplyScalar(v === 0 ? 1.06 : .94);
        return vertex(point.x, point.y, point.z, leafColor, t, 1, .18 + smoothstep(.15, .95, t) * .82);
      };
      // Six segments give close leaves five curved rings (40 triangles).
      // Three segments use 16 triangles; two retain a closed coarse blade (8).
      const base = bladePoint(0, 0, 0);
      for (let j = 1; j < segments; j++) {
        const u = j / segments;
        bladePoint(u, -1, 0); bladePoint(u, 0, 1);
        bladePoint(u, 1, 0); bladePoint(u, 0, -1);
      }
      const tip = bladePoint(1, 0, 0), first = start + 1, last = first + (segments - 2) * 4;
      for (let k = 0; k < 4; k++) {
        const next = (k + 1) % 4;
        indices.push(base, first + next, first + k, tip, last + k, last + next);
        for (let j = 0; j < segments - 2; j++) {
          const a = first + j * 4 + k, b = first + j * 4 + next, c = a + 4, d = b + 4;
          indices.push(a, b, c, b, d, c);
        }
      }
      leaves++;
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('pigment', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('plant', new THREE.Float32BufferAttribute(plant, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  // Conservatively include the maximum shader wind displacement.
  geometry.boundingSphere.radius += .012;
  geometry.userData = { shoots: shootCount, leaves, triangles: indices.length / 3 };
  return geometry;
}

// Sparse woodland accents: closed, cupped sorrel leaflets and violet-tipped
// shoots. They share the moss material, including its transmission and cavity
// attributes, rather than using transparent billboard flowers.
export function createAccentGeometry(seed,kind=0){
  const random=randomSeed(seed),p=[],c=[],t=[],ix=[];
  const tint=new THREE.Color(kind?'#488f96':'#67bf8b'),tipTint=new THREE.Color('#c3b4ff');
  function vertex(point,col,ao=.8,thin=1){
    const index=p.length/3;p.push(...point);c.push(col.r,col.g,col.b);t.push(.5,thin,ao);return index;
  }
  function blade(origin,angle,length,width,rise,col){
    const along=new THREE.Vector3(Math.cos(angle),rise,Math.sin(angle)).normalize();
    const across=new THREE.Vector3(-Math.sin(angle),0,Math.cos(angle));
    const point=(u,v,lift)=>origin.clone().addScaledVector(along,u*length).addScaledVector(across,v*width).add(new THREE.Vector3(0,lift,0));
    const top=vertex(point(.47,0,.07*length),col.clone().multiplyScalar(1.08));
    const bottom=vertex(point(.47,0,.07*length-.0008),col);
    const edge=[];
    for(let k=0;k<12;k++){
      const a=k*Math.PI/6,u=.5+.5*Math.cos(a),v=Math.sin(a);
      edge.push(vertex(point(u,v,.18*length*Math.sin(Math.PI*u)),col.clone().multiplyScalar(.86),.72+.25*u));
    }
    for(let k=0;k<12;k++){
      const a=edge[k],b=edge[(k+1)%12];ix.push(top,b,a,bottom,a,b);
    }
  }
  function stem(height,x,z){
    const col=tint.clone().multiplyScalar(.55),start=p.length/3;
    for(let j=0;j<2;j++)for(let k=0;k<5;k++){
      const a=k*Math.PI*2/5;vertex([x+Math.cos(a)*.0013,j*height,z+Math.sin(a)*.0013],col,.4+j*.5,0);
    }
    for(let k=0;k<5;k++){const a=start+k,b=start+(k+1)%5;ix.push(a,a+5,b,b,a+5,b+5);}
  }
  for(let shoot=0;shoot<(kind?3:4);shoot++){
    const a=shoot*2.39996+random(),r=.035*Math.sqrt(shoot),x=Math.cos(a)*r,z=Math.sin(a)*r;
    const h=(kind?.19:.135)+random()*.065;stem(h,x,z);
    if(kind){
      for(let j=0;j<7;j++){
        const u=j/7,col=tint.clone().lerp(tipTint,Math.max(0,(u-.3)/.7));
        for(let side=0;side<2;side++)blade(new THREE.Vector3(x,h*(.22+u*.78),z),a+j*.65+side*Math.PI,.055*(1-u*.55),.009*(1-u*.3),.35+u*.4,col);
      }
    }else{
      for(let j=0;j<3;j++)blade(new THREE.Vector3(x,h,z),a+j*Math.PI*2/3,.06+random()*.018,.030,.10,tint.clone().multiplyScalar(.8+random()*.4));
    }
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(p,3));
  geometry.setAttribute('pigment',new THREE.Float32BufferAttribute(c,3));geometry.setAttribute('plant',new THREE.Float32BufferAttribute(t,3));
  geometry.setIndex(ix);geometry.computeVertexNormals();geometry.computeBoundingSphere();return geometry;
}
