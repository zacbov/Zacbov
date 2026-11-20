import * as THREE from "three";
function mulberry32(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = a + 1831565813 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const UP$1 = new THREE.Vector3(0, 1, 0);
const lerp = (a, b, t) => a + (b - a) * t;
const sstep$2 = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
let Builder$1 = class Builder {
  constructor() {
    this.p = [];
    this.c = [];
    this.uv = [];
    this.i = [];
  }
  get n() {
    return this.p.length / 3;
  }
  /** a tube along `curve`, radius r(t), colour col(t) → THREE.Color */
  tube(curve, segs, radial, r, col) {
    const frames = curve.computeFrenetFrames(segs, false);
    const base = this.n;
    const P = new THREE.Vector3();
    const d = new THREE.Vector3();
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      curve.getPointAt(t, P);
      const N = frames.normals[i];
      const B = frames.binormals[i];
      const rr = r(t);
      const cc = col(t);
      for (let j = 0; j <= radial; j++) {
        const a = j / radial * Math.PI * 2;
        d.copy(N).multiplyScalar(Math.cos(a)).addScaledVector(B, Math.sin(a));
        this.p.push(P.x + d.x * rr, P.y + d.y * rr, P.z + d.z * rr);
        this.c.push(cc.r, cc.g, cc.b);
        this.uv.push(j / radial, t);
      }
    }
    for (let i = 0; i < segs; i++) {
      for (let j = 0; j < radial; j++) {
        const a = base + i * (radial + 1) + j;
        const b = a + radial + 1;
        this.i.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
  }
  /** an ellipsoid (bud, anther) */
  blob(center, rx, ry, rz, col, axis = null, segs = 8, rings = 6) {
    const base = this.n;
    const q = axis ? new THREE.Quaternion().setFromUnitVectors(UP$1, axis) : null;
    const v = new THREE.Vector3();
    for (let i = 0; i <= rings; i++) {
      const th = i / rings * Math.PI;
      for (let j = 0; j <= segs; j++) {
        const ph = j / segs * Math.PI * 2;
        v.set(Math.sin(th) * Math.cos(ph) * rx, Math.cos(th) * ry, Math.sin(th) * Math.sin(ph) * rz);
        if (q) v.applyQuaternion(q);
        this.p.push(center.x + v.x, center.y + v.y, center.z + v.z);
        this.c.push(col.r, col.g, col.b);
        this.uv.push(j / segs, i / rings);
      }
    }
    for (let i = 0; i < rings; i++) {
      for (let j = 0; j < segs; j++) {
        const a = base + i * (segs + 1) + j;
        const b = a + segs + 1;
        this.i.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(this.c, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(this.uv, 2));
    g.setIndex(this.i);
    g.computeVertexNormals();
    return g;
  }
};
function blade(nu, nv, width, fold, colour) {
  const b = new Builder$1();
  for (let i = 0; i <= nu; i++) {
    const u = i / nu;
    const w = width(u);
    for (let j = 0; j <= nv * 2; j++) {
      const v = j / nv - 1;
      const x = v * w;
      b.p.push(x, u, fold(x, u, v));
      const c = colour(u, v);
      b.c.push(c.r, c.g, c.b);
      b.uv.push((v + 1) / 2, u);
    }
  }
  const row = nv * 2 + 1;
  for (let i = 0; i < nu; i++) {
    for (let j = 0; j < nv * 2; j++) {
      const a = i * row + j;
      b.i.push(a, a + 1, a + row, a + 1, a + row + 1, a + row);
    }
  }
  return b.geometry();
}
function petalTexture() {
  const W = 128;
  const H = 256;
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const g = cv.getContext("2d");
  const grad = g.createLinearGradient(0, H, 0, 0);
  grad.addColorStop(0, "#d39cc0");
  grad.addColorStop(0.25, "#efc8e0");
  grad.addColorStop(1, "#f7dceb");
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);
  const rnd = mulberry32(7);
  for (let k = 0; k < 15; k++) {
    const x0 = W / 2 + (k - 7) * 1.5;
    const x1 = W / 2 + (k - 7) * 8.5 + (rnd() - 0.5) * 6;
    g.strokeStyle = `rgba(${100 + rnd() * 30 | 0}, ${30 + rnd() * 20 | 0}, ${85 + rnd() * 30 | 0}, ${0.55 + rnd() * 0.3})`;
    g.lineWidth = 1.6 + rnd() * 1.4;
    g.beginPath();
    g.moveTo(x0, H);
    g.bezierCurveTo(x0, H * 0.7, x1, H * 0.45, x1 + (rnd() - 0.5) * 8, H * (0.08 + rnd() * 0.18));
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
const SWAY_GLSL = (
  /* glsl */
  `
uniform float uPlantTime;
uniform vec3 uPlantBase;
uniform vec2 uWind;
varying float vPlantH;
vec3 plantSway(vec3 w){
  float h = max(w.y - uPlantBase.y, 0.0);
  float ph = dot(w.xz, vec2(1.7, 1.3));
  float s = sin(uPlantTime * 1.1 + ph) * 0.65 + sin(uPlantTime * 1.9 + ph * 0.6) * 0.35;
  w.xz += uWind * s * h * h;
  // the flowers and leaflets tremble a little on their own
  w += vec3(0.6, 0.25, 0.5) * sin(uPlantTime * 6.3 + dot(w, vec3(41.0, 37.0, 29.0))) * 0.0016 * h;
  return w;
}
`
);
const swayAt = (w, base, t, wind) => {
  const h = Math.max(w.y - base.y, 0);
  const ph = w.x * 1.7 + w.z * 1.3;
  const s = Math.sin(t * 1.1 + ph) * 0.65 + Math.sin(t * 1.9 + ph * 0.6) * 0.35;
  w.x += wind.x * s * h * h;
  w.z += wind.y * s * h * h;
  return w;
};
function plantMaterial(params, uniforms) {
  const m = new THREE.MeshStandardMaterial(params);
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = SWAY_GLSL + sh.vertexShader.replace(
      "#include <project_vertex>",
      /* glsl */
      `
vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_INSTANCING
  mvPosition = instanceMatrix * mvPosition;
#endif
vec4 plantW = modelMatrix * mvPosition;
plantW.xyz = plantSway(plantW.xyz);
vPlantH = plantW.y - uPlantBase.y;
mvPosition = viewMatrix * plantW;
gl_Position = projectionMatrix * mvPosition;
`
    );
    sh.fragmentShader = "uniform float uPlantFade;\nvarying float vPlantH;\n" + sh.fragmentShader.replace(
      "#include <clipping_planes_fragment>",
      /* glsl */
      `#include <clipping_planes_fragment>
  float plantIgn = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
  if (smoothstep(0.0, uPlantFade, vPlantH) < plantIgn * 0.98 + 0.01) discard;
`
    );
  };
  m.customProgramCacheKey = () => "fraxinelle";
  return m;
}
function createFraxinelle({ seed = 11, stems = 5, height = 0.8, lite = false, fade = 0.14 } = {}) {
  const rnd = mulberry32(seed);
  const group = new THREE.Group();
  group.name = "fraxinelle";
  const uniforms = {
    uPlantTime: { value: 0 },
    uPlantBase: { value: new THREE.Vector3() },
    uWind: { value: new THREE.Vector2(0.035, 0.018) },
    uPlantFade: { value: fade }
  };
  const stemB = new Builder$1();
  const leaflets = [];
  const leafTint = [];
  const petals = [];
  const stamens = [];
  const buds = [];
  const budTint = [];
  const spots2 = [];
  const cStemLow = new THREE.Color(6982714);
  const cStemHigh = new THREE.Color(9071176);
  const cRachis = new THREE.Color(7771967);
  const cPedicel = new THREE.Color(10119776);
  const tmp = new THREE.Color();
  const m4 = new THREE.Matrix4();
  const X = new THREE.Vector3();
  const Y = new THREE.Vector3();
  const Z = new THREE.Vector3();
  const S2 = new THREE.Vector3();
  const frame = (list, at, dir, face, sx, sy = sx, sz = sx) => {
    Y.copy(dir).normalize();
    Z.copy(face).addScaledVector(Y, -face.dot(Y)).normalize();
    X.crossVectors(Y, Z);
    m4.makeBasis(X.multiplyScalar(sx), Y.multiplyScalar(sy), Z.multiplyScalar(sz));
    m4.setPosition(at);
    list.push(m4.clone());
  };
  const golden = 2.39996;
  const nFlowers = lite ? [7, 10] : [10, 15];
  const leavesPer = lite ? 6 : 9;
  for (let s = 0; s < stems; s++) {
    const az0 = s / stems * Math.PI * 2 + rnd() * 0.8;
    const lean = 0.06 + rnd() * 0.12;
    const hgt = height * (0.72 + rnd() * 0.28) * (s === 0 ? 1 / 0.86 : 1) * 0.86;
    const foot = new THREE.Vector3(Math.cos(az0) * 0.025 * (0.4 + rnd()), 0, Math.sin(az0) * 0.025 * (0.4 + rnd()));
    const out = new THREE.Vector3(Math.cos(az0), 0, Math.sin(az0));
    const pts = [];
    for (let k = 0; k <= 5; k++) {
      const t = k / 5;
      pts.push(foot.clone().addScaledVector(out, lean * hgt * t * t + 0.01 * Math.sin(t * 5 + s)).setY(hgt * t));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const rBase = 45e-4;
    stemB.tube(curve, 18, 6, (t) => lerp(rBase, 17e-4, t), (t) => tmp.copy(cStemLow).lerp(cStemHigh, sstep$2(0.45, 0.8, t)));
    const P = new THREE.Vector3();
    const T = new THREE.Vector3();
    for (let k = 0; k < leavesPer; k++) {
      const t = 0.12 + k / leavesPer * 0.42 + rnd() * 0.02;
      curve.getPointAt(t, P);
      const az = az0 + k * golden * 1.3 + rnd() * 0.5;
      const D = new THREE.Vector3(Math.cos(az), 0, Math.sin(az));
      const elev = lerp(0.1, 0.55, k / leavesPer) + rnd() * 0.15;
      D.multiplyScalar(Math.cos(elev)).addScaledVector(UP$1, Math.sin(elev)).normalize();
      const Nl = UP$1.clone().addScaledVector(D, -D.dot(UP$1)).normalize();
      S2.crossVectors(D, Nl).normalize();
      const len = lerp(0.12, 0.085, k / leavesPer) * (0.85 + rnd() * 0.3);
      const pairs = lite ? 3 : 4;
      const rp = [P.clone()];
      for (let q = 1; q <= 3; q++) rp.push(P.clone().addScaledVector(D, len * q / 3).addScaledVector(Nl, -0.012 * q * q));
      const rc = new THREE.CatmullRomCurve3(rp);
      stemB.tube(rc, 6, 3, (u) => lerp(14e-4, 6e-4, u), () => cRachis);
      const dir = new THREE.Vector3();
      for (let q = 0; q <= pairs; q++) {
        const u = q === pairs ? 1 : 0.28 + q / pairs * 0.68;
        const at = rc.getPointAt(Math.min(u, 0.999));
        const tg = rc.getTangentAt(Math.min(u, 0.999));
        const sides = q === pairs ? [0] : [-1, 1];
        for (const side of sides) {
          const a = side === 0 ? 0 : 0.95 + rnd() * 0.2;
          dir.copy(tg).multiplyScalar(Math.cos(a)).addScaledVector(S2, side * Math.sin(a)).addScaledVector(Nl, -0.15 - rnd() * 0.1);
          const size = (side === 0 ? 0.05 : lerp(0.032, 0.046, q / pairs)) * (0.85 + rnd() * 0.3);
          frame(leaflets, at, dir, Nl, size);
          const j = 0.82 + rnd() * 0.3;
          leafTint.push(j * (0.92 + rnd() * 0.1), j, j * (0.85 + rnd() * 0.15));
          if (k >= leavesPer - 3 && q >= pairs - 1 && side !== -1) {
            spots2.push({ kind: "feuille", pos: at.clone().addScaledVector(dir.clone().normalize(), size * 0.45).addScaledVector(Nl, 3e-3), up: Nl.clone(), fwd: dir.clone().normalize() });
          }
        }
      }
    }
    const nf = nFlowers[0] + Math.floor(rnd() * (nFlowers[1] - nFlowers[0]));
    for (let k = 0; k < nf + 5; k++) {
      const bud = k >= nf;
      const t = lerp(0.6, 0.985, k / (nf + 5));
      curve.getPointAt(t, P);
      curve.getTangentAt(t, T);
      const az = az0 + k * golden;
      const D = new THREE.Vector3(Math.cos(az), 0, Math.sin(az));
      const plen = bud ? 6e-3 : 0.016;
      const C = P.clone().addScaledVector(D, plen * 0.85).addScaledVector(UP$1, plen * 0.45);
      stemB.tube(new THREE.CatmullRomCurve3([P.clone(), P.clone().addScaledVector(D, plen * 0.45).addScaledVector(UP$1, plen * 0.15), C.clone()]), 4, 3, () => 8e-4, () => cPedicel);
      if (bud) {
        const sz = 35e-4 + 15e-4 * (1 - (k - nf) / 5);
        frame(buds, C, D.clone().multiplyScalar(0.6).addScaledVector(UP$1, 0.8), UP$1.clone().cross(D), sz * 0.75, sz * 1.4, sz * 0.75);
        const j = 0.9 + rnd() * 0.2;
        budTint.push(j, j * 0.95, j);
        continue;
      }
      const A = D.clone().multiplyScalar(Math.cos(0.25)).addScaledVector(UP$1, Math.sin(0.25)).normalize();
      const U = UP$1.clone().addScaledVector(A, -A.dot(UP$1)).normalize();
      const Rr = new THREE.Vector3().crossVectors(A, U);
      const open = 1.05 + rnd() * 0.15;
      const psis = [-1.1, -0.36, 0.36, 1.1, Math.PI];
      for (const psi of psis) {
        const lower = psi === Math.PI;
        const op = lower ? 1.5 : open;
        const radial = U.clone().multiplyScalar(Math.cos(psi)).addScaledVector(Rr, Math.sin(psi));
        const dir = A.clone().multiplyScalar(Math.cos(op)).addScaledVector(radial, Math.sin(op));
        const len = (lower ? 0.022 : 0.025) * (0.9 + rnd() * 0.2);
        frame(petals, C, dir, A, len);
      }
      const ns = lite ? 6 : 10;
      for (let q = 0; q < ns; q++) {
        const yaw = (q - (ns - 1) / 2) * (0.63 / ns) + (rnd() - 0.5) * 0.04;
        const fw = A.clone().applyAxisAngle(U, yaw);
        frame(stamens, C, U, fw, 1 + (rnd() - 0.5) * 0.15);
      }
      if (k >= nf - 3) spots2.push({ kind: "fleur", pos: C.clone().addScaledVector(A, 8e-3).addScaledVector(U, 7e-3), up: U.clone().lerp(UP$1, 0.5).normalize(), fwd: A.clone() });
    }
  }
  const stemMat = plantMaterial({ color: 16777215, vertexColors: true, roughness: 0.75 }, uniforms);
  const stemMesh = new THREE.Mesh(stemB.geometry(), stemMat);
  const cLeaf = new THREE.Color(4156970);
  const cMid = new THREE.Color(8823894);
  const leafGeo = blade(
    8,
    3,
    (u) => 0.34 * Math.pow(Math.sin(Math.PI * Math.min(u, 0.999)), 0.8) * (1 - 0.35 * u),
    (x, u) => 0.9 * Math.abs(x) * 0.35 - 0.12 * u * u,
    (u, v) => tmp.copy(cLeaf).lerp(cMid, 1 - sstep$2(0, 0.18, Math.abs(v))).multiplyScalar(0.8 + 0.25 * u)
  );
  const leafMat = plantMaterial({ color: 16777215, vertexColors: true, roughness: 0.42, side: THREE.DoubleSide, emissive: 858630 }, uniforms);
  const leafMesh = new THREE.InstancedMesh(leafGeo, leafMat, leaflets.length);
  leaflets.forEach((m, i) => leafMesh.setMatrixAt(i, m));
  leafMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(leafTint), 3);
  const white = new THREE.Color(1, 1, 1);
  const petalGeo = blade(
    8,
    3,
    (u) => 0.25 * Math.pow(Math.sin(Math.PI * Math.min(Math.pow(u, 0.72), 0.999)), 0.5) + 0.012,
    (x, u) => 2.2 * x * x - 0.16 * u * u * u,
    (u) => tmp.copy(white).multiplyScalar(0.75 + 0.25 * sstep$2(0, 0.3, u))
  );
  const petalTex = petalTexture();
  const petalMat = plantMaterial({ color: 16777215, map: petalTex, vertexColors: true, roughness: 0.62, side: THREE.DoubleSide, emissive: 4864580, emissiveMap: petalTex }, uniforms);
  const petalMesh = new THREE.InstancedMesh(petalGeo, petalMat, petals.length);
  petals.forEach((m, i) => petalMesh.setMatrixAt(i, m));
  const sb = new Builder$1();
  const sc = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, -45e-4, 9e-3),
    new THREE.Vector3(0, -65e-4, 0.019),
    new THREE.Vector3(0, -25e-4, 0.027),
    new THREE.Vector3(0, 3e-3, 0.031)
  ]);
  const cFil = new THREE.Color(11755678);
  sb.tube(sc, lite ? 5 : 8, 3, (t) => lerp(45e-5, 3e-4, t), (t) => tmp.copy(cFil).multiplyScalar(lerp(0.85, 1.1, t)));
  sb.blob(sc.getPointAt(1), 9e-4, 7e-4, 13e-4, new THREE.Color(5910552), null, lite ? 4 : 6, lite ? 3 : 4);
  const stamenMesh = new THREE.InstancedMesh(sb.geometry(), plantMaterial({ color: 16777215, vertexColors: true, roughness: 0.6 }, uniforms), stamens.length);
  stamens.forEach((m, i) => stamenMesh.setMatrixAt(i, m));
  const bb = new Builder$1();
  bb.blob(new THREE.Vector3(0, 0.5, 0), 0.5, 0.5, 0.5, new THREE.Color(1, 1, 1), null, 8, 6);
  const budGeo = bb.geometry();
  {
    const pos = budGeo.attributes.position;
    const col = budGeo.attributes.color;
    const cLow = new THREE.Color(7309884);
    const cTop = new THREE.Color(13998784);
    for (let i = 0; i < pos.count; i++) {
      tmp.copy(cLow).lerp(cTop, sstep$2(0.25, 0.85, pos.getY(i)));
      col.setXYZ(i, tmp.r, tmp.g, tmp.b);
    }
  }
  const budMesh = new THREE.InstancedMesh(budGeo, plantMaterial({ color: 16777215, vertexColors: true, roughness: 0.55 }, uniforms), buds.length);
  buds.forEach((m, i) => budMesh.setMatrixAt(i, m));
  budMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(budTint), 3);
  for (const m of [stemMesh, leafMesh, petalMesh, stamenMesh, budMesh]) {
    m.frustumCulled = false;
    group.add(m);
  }
  const plant = {
    group,
    spots: spots2,
    uniforms,
    /** the wind's push (metres at 1 m above the foot) */
    wind: uniforms.uWind.value,
    counts: { leaflets: leaflets.length, petals: petals.length, stamens: stamens.length, buds: buds.length },
    update(time) {
      uniforms.uPlantTime.value = time;
      group.getWorldPosition(uniforms.uPlantBase.value);
    },
    /** spot i in world space, the wind included */
    spotWorld(i, pos, up, fwd) {
      const s = spots2[i];
      group.updateWorldMatrix(true, false);
      pos.copy(s.pos).applyMatrix4(group.matrixWorld);
      swayAt(pos, uniforms.uPlantBase.value, uniforms.uPlantTime.value, uniforms.uWind.value);
      if (up) up.copy(s.up).transformDirection(group.matrixWorld);
      if (fwd) fwd.copy(s.fwd).transformDirection(group.matrixWorld);
      return pos;
    },
    dispose() {
      group.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          if (o.material.map) o.material.map.dispose();
          o.material.dispose();
        }
      });
    }
  };
  return plant;
}
const ATLAS = { size: 1024, px: 32, fore: [32, 290], hind: [32, 780] };
const FORE_OUTLINE = [
  [0, 0],
  [1.5, 0.95],
  [4, 1.85],
  [8, 2.8],
  [13, 3.55],
  [18, 3.95],
  [22, 3.9],
  [25.4, 3.35],
  [27.9, 2.2],
  [29.3, 0.75],
  [29.6, -0.75],
  [28.7, -2.05],
  [26.55, -3],
  [24.5, -3.9],
  [22.5, -4.9],
  [20.5, -5.95],
  [18.6, -6.95],
  [16.8, -7.55],
  [14.8, -7.4],
  [12, -6.25],
  [8, -4.45],
  [4, -2.5],
  [1.2, -0.9]
];
const HIND_OUTLINE = [
  [0, 0],
  [1.2, 1.25],
  [3.5, 2.8],
  [7, 4.25],
  [11, 4.95],
  [15, 4.8],
  [18, 3.6],
  [19.7, 1.5],
  [20.1, -1.2],
  [19.2, -4],
  [17.1, -6.5],
  [14, -8.5],
  [10.8, -9.6],
  [8, -9.85],
  [5.2, -9.8],
  [2.9, -9.45],
  [1.3, -8.4],
  [0.52, -6.3],
  [0.25, -3.6],
  [0.26, -1.75]
];
const FORE_VEINS = [
  [0.12, 0.07, [0, 0.25], [4, 1.7], [8, 2.65], [13, 3.4], [18, 3.8], [22, 3.75], [25.4, 3.2], [27.9, 2.05], [29.25, 0.7]],
  // costa
  [0.07, 0.04, [0, 0.2], [5, 1.65], [10, 2.65], [15.5, 3.85]],
  // Sc
  [0.085, 0.06, [0, 0], [5, 1.25], [10, 1.95], [15, 2.3], [17.5, 2.2]],
  // R stem: the front of the cell
  [0.052, 0.032, [12, 2.14], [16, 3], [20.4, 4.05]],
  // R1
  [0.052, 0.032, [16.2, 2.3], [19.8, 2.95], [24.2, 3.75]],
  // R2
  [0.06, 0.048, [17.5, 2.2], [20, 2.45], [22.4, 2.5]],
  // the stalk of R3–R5
  [0.046, 0.03, [22.4, 2.5], [24.8, 2.85], [27.4, 2.8]],
  // R3
  [0.046, 0.03, [22.4, 2.5], [25.6, 2.05], [29.2, 1.05]],
  // R4
  [0.046, 0.03, [22.4, 2.5], [26, 1.1], [29.9, -0.6]],
  // R5
  [0.052, 0.032, [17.5, 2.2], [20.5, 1.3], [24.8, -0.1], [29.4, -2.2]],
  // M1
  [0.06, 0.06, [17.5, 2.2], [17.25, 1.2], [16.85, 0.2]],
  // discocellulars: the end of the cell
  [0.06, 0.06, [16.85, 0.2], [16, -1.2], [15.5, -2.6]],
  [0.036, 0.02, [16.85, 0.2], [15.6, 0.15], [14.2, 0]],
  // the recurrent vein, into the cell
  [0.052, 0.032, [16.85, 0.2], [19.7, -0.55], [23.2, -1.85], [26.9, -3.4]],
  // M2
  [0.052, 0.032, [15.5, -2.6], [18.4, -3.1], [21.4, -3.75], [24.3, -4.5]],
  // M3
  [0.085, 0.06, [0, -0.05], [5, -0.9], [10, -1.9], [13, -2.35], [15.5, -2.6]],
  // Cu stem: the back of the cell
  [0.052, 0.032, [13, -2.35], [15.8, -3.3], [18.7, -4.5], [21.7, -5.9]],
  // CuA1
  [0.052, 0.032, [9, -1.72], [12, -2.9], [15.5, -4.8], [19.2, -7.3]],
  // CuA2
  [0.062, 0.036, [0, -0.2], [5, -2.2], [10, -4.3], [14, -6.2], [16.6, -7.9]]
  // 1A+2A
];
const HIND_VEINS = [
  [0.085, 0.05, [0, 0.25], [2.6, 1.95], [6, 3.55], [10.5, 4.6], [15, 5]],
  // Sc+R1
  [0.036, 0.024, [1.3, 1.1], [1.6, 1.75], [2.4, 2.4]],
  // humeral spur
  [0.078, 0.06, [0, 0], [3, 0.9], [6.5, 1.7], [9.5, 2.15]],
  // front of the cell
  [0.052, 0.032, [9.5, 2.15], [13, 2.85], [16.5, 3.3], [19.4, 3.2]],
  // Rs
  [0.06, 0.06, [9.5, 2.15], [10.05, 1.2], [10.2, 0.1]],
  // discocellulars
  [0.06, 0.06, [10.2, 0.1], [9.8, -1.2], [9, -2.3]],
  [0.052, 0.032, [10.05, 1.2], [13.5, 1.3], [17, 1], [20.6, 0.4]],
  // M1
  [0.052, 0.032, [10.2, 0.1], [13.5, -0.85], [17, -2.1], [20.2, -3.2]],
  // M2
  [0.052, 0.032, [9, -2.3], [12, -3.6], [15.2, -5], [18.4, -6.3]],
  // M3
  [0.078, 0.06, [0, -0.05], [4.5, -1.2], [7.5, -1.95], [9, -2.3]],
  // back of the cell
  [0.052, 0.032, [7.5, -1.95], [10, -3.9], [12.6, -6.4], [14.6, -8.7]],
  // CuA1
  [0.052, 0.032, [5, -1.33], [7.2, -3.6], [9, -6.3], [10.5, -10]],
  // CuA2
  [0.056, 0.034, [0, -0.3], [2.6, -2.8], [4.9, -5.9], [7, -10.2]],
  // 1A+2A
  [0.042, 0.026, [0, -0.5], [0.55, -2.6], [1, -5], [1.6, -7.4], [2.5, -9.7]]
  // 3A (along the fold that lies against the abdomen)
];
const FORE_NICKS = [[21.4, -5.5, 0.16, 0.5]];
const HIND_NICKS = [[18.4, -5, 0.2, 0.6]];
function catmull(P, n, closed) {
  const out = [];
  const N = P.length;
  const at = (i) => closed ? P[(i % N + N) % N] : P[Math.max(0, Math.min(N - 1, i))];
  const segs = closed ? N : N - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    for (let k = 0; k < n; k++) {
      const t = k / n;
      const t2 = t * t;
      const t3 = t2 * t;
      const c = (a, b, cc, d) => 0.5 * (2 * b + (cc - a) * t + (2 * a - 5 * b + 4 * cc - d) * t2 + (3 * b - a - 3 * cc + d) * t3);
      out.push([c(p0[0], p1[0], p2[0], p3[0]), c(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  if (!closed) out.push(P[N - 1].slice());
  return out;
}
function resample(poly, n) {
  const N = poly.length;
  const len = [0];
  for (let i = 0; i < N; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % N];
    len.push(len[i] + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  const total = len[N];
  const out = [];
  let j = 0;
  for (let k = 0; k < n; k++) {
    const s = k / n * total;
    while (len[j + 1] < s) j++;
    const f2 = (s - len[j]) / (len[j + 1] - len[j] || 1);
    const a = poly[j];
    const b = poly[(j + 1) % N];
    out.push([a[0] + (b[0] - a[0]) * f2, a[1] + (b[1] - a[1]) * f2]);
  }
  return out;
}
function distToPoly(x, y, poly) {
  let d = Infinity;
  const N = poly.length;
  for (let i = 0; i < N; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % N];
    const ex = b[0] - a[0];
    const ey = b[1] - a[1];
    const h = Math.max(0, Math.min(1, ((x - a[0]) * ex + (y - a[1]) * ey) / (ex * ex + ey * ey || 1)));
    d = Math.min(d, Math.hypot(x - a[0] - ex * h, y - a[1] - ey * h));
  }
  return d;
}
const S = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
function borderAt(hind, x, y) {
  if (!hind) {
    const apex = S(24, 29.2, x) * S(-4.6, -0.6, y);
    const outer2 = S(15.5, 19.5, x) * S(1.5, -1, y);
    const costa2 = S(1, 2.6, y) * (1 - S(23, 27.5, x));
    const sub = S(15.5, 18.5, x) * S(1, 2.6, y);
    const back = S(-0.4, -2.4, y) * S(9, 15.5, x);
    return [0.52 + 0.78 * outer2 + 1.35 * apex - 0.14 * costa2 + 0.42 * sub * (1 - apex), 0.04 + 0.92 * Math.max(outer2, 0.3 * back) * (1 - 0.25 * apex)];
  }
  const outer = Math.max(S(12, 18.5, x), S(-4.5, -8, y) * S(1.6, 5.5, x));
  const costa = S(1, 3.6, y) * (1 - S(15, 19, x));
  return [0.66 + 0.7 * outer * (1 - costa) - 0.24 * costa - 0.2 * (1 - S(1.6, 5.5, x)) * S(-1, -3, y), 0.03 + 0.95 * outer * (1 - costa)];
}
const BAR = { a: [21.5, 3.9], b: [25.1, -1.5], w: 0.92, dc: [[18, 4], [16.9, 0.2], [15.4, -2.8]], dcw: 0.46 };
const OUTLINES = [FORE_OUTLINE, HIND_OUTLINE];
const NICKS = [FORE_NICKS, HIND_NICKS];
const CENTRES = [[9.5, -0.2], [8.2, -1.4]];
const VEINS = [FORE_VEINS, HIND_VEINS];
const VEIN_NAMES = [
  ["C", "Sc", "R", "R1", "R2", "R3-5", "R3", "R4", "R5", "M1", "dc1", "dc2", "rec", "M2", "M3", "Cu", "CuA1", "CuA2", "1A+2A"],
  ["Sc+R1", "h", "R", "Rs", "dc1", "dc2", "M1", "M2", "M3", "Cu", "CuA1", "CuA2", "1A+2A", "3A"]
];
function wingOutline(hind, n = 128, rnd = null, fine = n >= 64) {
  const k = hind ? 1 : 0;
  const outline = resample(catmull(OUTLINES[k], 14, true), n);
  if (!rnd) return outline;
  const centre = CENTRES[k];
  return outline.map(([x, y], i) => {
    let pull = fine ? 0.035 * (rnd() - 0.5) : 0;
    for (const [nx, ny, depth, half] of NICKS[k]) {
      const d = Math.hypot(x - nx, y - ny);
      if (d < half * 1.6) pull += depth * Math.pow(Math.max(0, 1 - d / (half * 1.6)), 1.4) * (0.75 + 0.5 * rnd());
    }
    const dx = centre[0] - x;
    const dy = centre[1] - y;
    const f2 = i === 0 ? 0 : pull / Math.hypot(dx, dy);
    return [x + dx * f2, y + dy * f2];
  });
}
function wingVeins(hind, step = 7) {
  const k = hind ? 1 : 0;
  return VEINS[k].map(([r0, r1, ...pts], i) => ({ name: VEIN_NAMES[k][i], points: catmull(pts, step, false), r0, r1 }));
}
function veinSegments(hind) {
  const out = [];
  for (const v of wingVeins(hind, 7)) {
    const sm2 = v.points;
    for (let i = 0; i + 1 < sm2.length; i++) {
      const t0 = i / (sm2.length - 1);
      const t1 = (i + 1) / (sm2.length - 1);
      out.push({ a: sm2[i], b: sm2[i + 1], ra: v.r0 + (v.r1 - v.r0) * t0, rb: v.r0 + (v.r1 - v.r0) * t1 });
    }
  }
  return out;
}
function sideAttr(geometry, side, hind) {
  const n = geometry.attributes.position.count;
  const w = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    w[i * 2] = side;
    w[i * 2 + 1] = hind;
  }
  geometry.setAttribute("aWing", new THREE.BufferAttribute(w, 2));
  return geometry;
}
function buildWing(hind, { spokes = 128, rings = null, skirt = null, rnd = null } = {}) {
  const k = hind ? 1 : 0;
  const centre = CENTRES[k];
  const fine = spokes >= 64;
  const outline = wingOutline(hind, spokes, rnd, fine);
  if (!rings) rings = fine ? [0.34, 0.6, 0.78, 0.88, 0.95, 1] : [0.55, 0.86, 1];
  else if (typeof rings === "number") rings = Array.from({ length: rings }, (_, i) => Math.pow((i + 1) / rings, 0.8));
  const SKIRT = skirt ?? (fine ? 0.22 : 0.5);
  const R = rings.length + 1;
  const nv = 1 + spokes * R;
  const pos = new Float32Array(nv * 3);
  const edge = new Float32Array(nv * 3);
  const put = (i, x, y, e, bw, rust) => {
    pos[i * 3] = x;
    pos[i * 3 + 1] = y;
    edge[i * 3] = e;
    edge[i * 3 + 1] = bw;
    edge[i * 3 + 2] = rust;
  };
  const cb = borderAt(hind, centre[0] + 6, centre[1]);
  put(0, centre[0], centre[1], distToPoly(centre[0], centre[1], outline), cb[0], cb[1]);
  for (let s = 0; s < spokes; s++) {
    const [ox, oy] = outline[s];
    const [bw, rust] = borderAt(hind, ox, oy);
    const a = outline[(s + spokes - 1) % spokes];
    const b = outline[(s + 1) % spokes];
    let nx = b[1] - a[1];
    let ny = -(b[0] - a[0]);
    const nl = Math.hypot(nx, ny) || 1;
    nx /= nl;
    ny /= nl;
    if (nx * (ox - centre[0]) + ny * (oy - centre[1]) < 0) {
      nx = -nx;
      ny = -ny;
    }
    for (let r = 0; r < R; r++) {
      const i = 1 + s * R + r;
      if (r === R - 1) put(i, ox + nx * SKIRT, oy + ny * SKIRT, -SKIRT, bw, rust);
      else {
        const f2 = rings[r];
        const x = centre[0] + (ox - centre[0]) * f2;
        const y = centre[1] + (oy - centre[1]) * f2;
        put(i, x, y, f2 === 1 ? 0 : distToPoly(x, y, outline), bw, rust);
      }
    }
  }
  const idx = [];
  for (let s = 0; s < spokes; s++) {
    const s1 = (s + 1) % spokes;
    const a = 1 + s * R;
    const b = 1 + s1 * R;
    idx.push(0, a, b);
    for (let r = 0; r < R - 1; r++) idx.push(a + r, a + r + 1, b + r, b + r, a + r + 1, b + r + 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geometry.setAttribute("aEdge", new THREE.BufferAttribute(edge, 3));
  geometry.setIndex(idx);
  sideAttr(geometry, 1, hind ? 1 : 0);
  return { outline, veins: veinSegments(hind), geometry, centre, hind: k };
}
function mirrorWing(geometry, hind) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", geometry.attributes.position);
  g.setAttribute("aEdge", geometry.attributes.aEdge);
  g.setIndex(geometry.index);
  return sideAttr(g, -1, hind ? 1 : 0);
}
function fourWings(wings, Class = THREE.BufferGeometry) {
  const pos = [];
  const edge = [];
  const wing = [];
  const idx = [];
  for (const hind of [0, 1]) {
    const g = wings[hind].geometry;
    for (const side of [1, -1]) {
      const base = pos.length / 3;
      for (const v of g.attributes.position.array) pos.push(v);
      for (const v of g.attributes.aEdge.array) edge.push(v);
      for (let i = 0; i < g.attributes.position.count; i++) wing.push(side, hind);
      for (const i of g.index.array) idx.push(base + i);
    }
  }
  const out = new Class();
  out.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute("aEdge", new THREE.Float32BufferAttribute(edge, 3));
  out.setAttribute("aWing", new THREE.Float32BufferAttribute(wing, 2));
  out.setIndex(idx);
  return out;
}
const SIG_F = 1.2;
const SIG_H = 1.7;
const HINGE_F = [1.35, 0.9, 1.05];
const HINGE_H = [1.25, -0.5, 0.95];
const SPAN_F = 29.5;
const SPAN_H = 20;
const f3 = (x) => Number(x).toFixed(3);
const v3$1 = (a) => `vec3(${a.map(f3).join(", ")})`;
const rigGLSL = (
  /* glsl */
  `
#ifndef BF_RIG
#define BF_RIG
// A point of the flat wing (mm) → the same point of the wing as it is held, still in the wing's own frame.
//   wing = (side ±1, hind 0|1)   pose = (fore, hind, twist, flex)   shape = (unfurl, sweep, -, -)
vec3 bfWingLocal(vec2 p, vec2 wing, vec4 pose, vec4 shape){
  float L = mix(${f3(SPAN_F)}, ${f3(SPAN_H)}, wing.y);
  float z = 0.0;
  float wet = 1.0 - clamp(shape.x, 0.0, 1.0);
  if (wet > 0.0) {
    // fresh out of the chrysalis: a third of its size, and pumped flat from the base outward
    float s0 = clamp(p.x / L, 0.0, 1.2);
    float e = smoothstep(0.0, 0.85, (1.0 - wet) * 1.45 - 0.5 * s0);
    float w = 1.0 - e;
    p *= mix(0.34, 1.0, e * e * (3.0 - 2.0 * e) * 0.6 + 0.4 * (1.0 - wet));
    // pleats across the span like a fan that has not been opened, finer ones along it; and it hangs
    float fan = atan(p.y, p.x + 2.0);
    z += w * (0.9 * sin(fan * 34.0 + wing.y * 2.0) + 0.5 * sin(p.x * 2.3 + p.y * 1.1) * sin(fan * 13.0)) * (0.25 + 0.75 * s0);
    p.y *= 1.0 - 0.28 * w * s0;
    p.y += w * 0.5 * sin(p.x * 1.7 + wing.y * 3.0) * s0;
    z -= w * L * 0.22 * s0 * s0;
  }
  // the wing bends: flex along the span, a shallow dome, a droop toward the edges; then it feathers about its own axis
  float xs = clamp(p.x / L, 0.0, 1.2);
  z += pose.w * L * xs * xs;
  // (and the membrane behind the stiff leading edge trails with it: a beating wing is cupped, never a flat plate)
  float tr = clamp(4.0 - p.y, 0.0, 14.0);
  z += pose.w * 0.075 * tr * tr * (0.35 + 0.65 * min(xs, 1.0));
  z += 0.5 * sin(min(xs, 1.0) * 3.1416);
  z -= 0.011 * p.y * p.y * xs;
  z -= wing.y * 0.16;                                   // the hindwing lies under the forewing
  float psi = pose.z * (0.35 + 0.65 * xs);
  float c = cos(psi), s = sin(psi);
  return vec3(p.x, p.y * c - z * s, p.y * s + z * c);
}
// …→ the body frame (mm): swept on its hinge, raised by the stroke, mirrored for the left side
vec3 bfWingBody(vec3 q, vec2 wing, vec4 pose, vec4 shape){
  float sg = mix(${f3(SIG_F)} + 0.42 * shape.y, ${f3(SIG_H)} + 0.1 * shape.y, wing.y);
  float phi = mix(pose.x, pose.y, wing.y);
  vec3 b = vec3(sin(sg) * q.x - cos(sg) * q.y, cos(sg) * q.x + sin(sg) * q.y, q.z);
  float c = cos(phi), s = sin(phi);
  b = vec3(b.x * c - b.z * s, b.y, b.x * s + b.z * c);
  b += mix(${v3$1(HINGE_F)}, ${v3$1(HINGE_H)}, wing.y);
  b.x *= wing.x;
  return b;
}
// A vertex of the body (bodyGeo.js) as it is held. p, alt = position standing / legs folded; n = normal;
//   part = aPart (which part, along, around, which leg)   limbs, twitch: see the pose   feet: mm each foot is moved
vec3 bfBodyLocal(vec3 p, vec3 alt, vec3 n, vec4 part, vec4 limbs, vec4 twitch, vec3 feet[4]){
  p = mix(p, alt, limbs.x);
  float id = part.x, u = part.y;
  if (id > 0.5 && id < 1.5) {
    p.z -= limbs.y * u * u * 3.2;
    p += n * 0.045 * limbs.w * sin(min(u * 1.6, 1.0) * 3.1416);
  } else if (id > 5.5 && id < 6.5) {
    float t = part.w > 10.5 ? twitch.y : twitch.x;
    float k = u * u;
    p.z += k * (t * 2.4 - limbs.z * 2.2);
    p.y -= k * limbs.z * 5.5;
    p.x += k * t * 0.9 * sign(p.x);
  } else if (id > 6.5 && part.w > -0.5 && part.w < 3.5) {
    // a leg (or its claws) follows its foot: nothing at the hip, everything from the heel down
    float k = id > 7.5 ? 1.0 : smoothstep(0.08, 0.72, u);
    p += feet[int(part.w + 0.5)] * k * (1.0 - limbs.x);
  }
  return p;
}
#endif
`
);
const wingVertexGLSL = (
  /* glsl */
  `
attribute vec3 aEdge;      // mm inside the margin, width of the border (mm), rust
attribute vec2 aWing;      // side (+1 right, -1 left), hind (0 | 1)
#ifdef USE_INSTANCING
attribute vec4 aPose;
attribute vec4 aLook;
#define BF_POSE aPose
#define BF_SHAPE vec4(1.0, 0.0, 0.0, 0.0)
#define BF_LOOK aLook
mat4 bfModel(){ return modelMatrix * instanceMatrix; }
#else
uniform vec4 uPose;
uniform vec4 uShape;
uniform vec4 uLook;
#define BF_POSE uPose
#define BF_SHAPE uShape
#define BF_LOOK uLook
mat4 bfModel(){ return modelMatrix; }
#endif
${rigGLSL}
vec3 bfWing(vec2 p){ return bfWingBody(bfWingLocal(p, aWing, BF_POSE, BF_SHAPE), aWing, BF_POSE, BF_SHAPE); }
void bfWingFrame(out vec3 b, out vec3 tx, out vec3 ty){
  b = bfWing(position.xy);
  tx = bfWing(position.xy + vec2(0.5, 0.0)) - b;
  ty = bfWing(position.xy + vec2(0.0, 0.5)) - b;
}
`
);
const bodyVertexGLSL = (
  /* glsl */
  `
attribute vec3 aAlt;       // the same vertex with the legs folded
attribute vec4 aPart;      // part id (PART in bodyData.js), 0..1 along it, 0..1 around it, which leg (or -1)
#ifdef USE_INSTANCING
attribute vec4 aLook;
#define BF_LOOK aLook
mat4 bfModel(){ return modelMatrix * instanceMatrix; }
${rigGLSL}
vec3 bfBody(){
  vec3 still[4] = vec3[4](vec3(0.0), vec3(0.0), vec3(0.0), vec3(0.0));
  float fly = 1.0 - aLook.y;
  return bfBodyLocal(position, aAlt, normal, aPart, vec4(fly, 0.12 * fly, 0.22 * fly, 0.0), vec4(0.0), still);
}
#else
uniform vec4 uLook;
uniform vec4 uLimbs;
uniform vec4 uTwitch;
uniform vec3 uFeet[4];
#define BF_LOOK uLook
mat4 bfModel(){ return modelMatrix; }
${rigGLSL}
vec3 bfBody(){ return bfBodyLocal(position, aAlt, normal, aPart, uLimbs, uTwitch, uFeet); }
#endif
`
);
function makePose() {
  return {
    wings: new THREE.Vector4(0.6, 0.55, 0, 0),
    shape: new THREE.Vector4(1, 0, 0, 0),
    limbs: new THREE.Vector4(0, 0.1, 0, 0),
    twitch: new THREE.Vector4(0, 0, 0, 0),
    feet: [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]
  };
}
function poseUniforms(pose, look = new THREE.Vector4(0, 0, 0.37, 0.6)) {
  return { uPose: { value: pose.wings }, uShape: { value: pose.shape }, uLimbs: { value: pose.limbs }, uTwitch: { value: pose.twitch }, uFeet: { value: pose.feet }, uLook: { value: look } };
}
function wingFrame(side, hind, phi, origin, axisX, axisY, sweep = 0) {
  const sg = hind ? SIG_H + 0.1 * sweep : SIG_F + 0.42 * sweep;
  const c = Math.cos(phi);
  const s = Math.sin(phi);
  const h = hind ? HINGE_H : HINGE_F;
  origin.set(h[0] * side, h[1], h[2]);
  axisX.set(Math.sin(sg) * c * side, Math.cos(sg), Math.sin(sg) * s);
  axisY.set(-Math.cos(sg) * c * side, Math.sin(sg), -Math.cos(sg) * s);
}
const _m$1 = new THREE.Matrix4();
const _s = new THREE.Vector3();
function bodyMatrix(out, pos, right, fwd, up, size = 1) {
  _m$1.makeBasis(right, fwd, up);
  _m$1.scale(_s.setScalar(1e-3 * size));
  _m$1.setPosition(pos);
  return out.copy(_m$1);
}
const PART = { THORAX: 0, ABDOMEN: 1, HEAD: 2, EYE: 3, PALP: 4, TONGUE: 5, ANTENNA: 6, LEG: 7, CLAW: 8 };
const EYE = [0.6, 4.02, 0.2];
const EYE_R = [0.74, 0.92, 0.98];
const SPOTS = [];
const FEET = [
  [5.7, 4.5, -4],
  [-5.7, 4.5, -4],
  [5.3, -5.9, -4],
  [-5.3, -5.9, -4]
];
const sm = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const dome = (t, a, b) => Math.sqrt(Math.max(0, 1 - Math.pow(1 - Math.min(1, t / a), 2))) * Math.sqrt(Math.max(0, 1 - Math.pow(1 - Math.min(1, (1 - t) / b), 2)));
function thoraxAt(t) {
  const y = 3.05 - 6.3 * t;
  const k = Math.pow(Math.max(0, Math.sin(Math.PI * Math.min(1, Math.max(0, 0.05 + 0.92 * Math.pow(t, 0.85))))), 0.7);
  const d = dome(t, 0.14, 0.1);
  return { y, z: 0.12 + 0.22 * Math.sin(Math.PI * t), rx: (0.5 + 1.02 * k) * d, rz: (0.52 + 1.1 * k) * d };
}
const ABDOMEN = { y0: -2.45, length: 9, segments: 8 };
function abdomenAt(t) {
  const y = ABDOMEN.y0 - ABDOMEN.length * t;
  const r = (0.7 + 0.1 * sm(0, 0.2, t)) * (1 - 0.56 * sm(0.22, 1, t)) * (1 - 0.6 * sm(0.94, 1, t));
  const seg = 1 + 0.022 * Math.cos(t * ABDOMEN.segments * 2 * Math.PI);
  const d = dome(t, 0.03, 0.02);
  return { y, z: 0.1 - 0.45 * t * t - 0.18 * t, rx: r * seg * d, rz: r * seg * 1.08 * d };
}
function headAt(t) {
  const y = 4.95 - 1.95 * t;
  const k = Math.pow(Math.max(0, Math.sin(Math.PI * (0.08 + 0.84 * t))), 0.7);
  const d = dome(t, 0.3, 0.22);
  return { y, z: 0.18, rx: (0.2 + 0.72 * k) * d, rz: (0.2 + 0.84 * k) * d };
}
{
  const on = (fn, t, deg, r) => {
    const s = fn(t);
    const a = deg * Math.PI / 180;
    SPOTS.push([Math.abs(Math.cos(a) * s.rx) < 0.02 ? 0 : Math.cos(a) * s.rx, s.y, s.z + Math.sin(a) * s.rz, r]);
  };
  on(headAt, 0.2, 90, 0.1);
  on(headAt, 0.86, 62, 0.12);
  on(thoraxAt, 0.09, 58, 0.2);
  on(thoraxAt, 0.17, 90, 0.1);
  on(thoraxAt, 0.31, 44, 0.17);
  on(thoraxAt, 0.5, 68, 0.12);
  on(thoraxAt, 0.7, 52, 0.105);
  on(thoraxAt, 0.87, 90, 0.09);
  on(thoraxAt, 0.36, -14, 0.22);
  on(thoraxAt, 0.68, -16, 0.16);
  on(thoraxAt, 0.3, -60, 0.22);
  on(thoraxAt, 0.62, -62, 0.18);
}
function through(pts, at = null) {
  const n = pts.length;
  const ks = at || pts.map((_, i) => i / (n - 1));
  return (t) => {
    let i = 0;
    while (i < n - 2 && t > ks[i + 1]) i++;
    const f2 = Math.max(0, Math.min(1, (t - ks[i]) / (ks[i + 1] - ks[i])));
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(n - 1, i + 2)];
    const f22 = f2 * f2;
    const f32 = f22 * f2;
    return [0, 1, 2].map((c) => 0.5 * (2 * p1[c] + (p2[c] - p0[c]) * f2 + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * f22 + (3 * p1[c] - p0[c] - 3 * p2[c] + p3[c]) * f32));
  };
}
function jointed(pts, at, round = 0.022) {
  const seg = (i, t) => {
    const f2 = (t - at[i]) / (at[i + 1] - at[i]);
    return [0, 1, 2].map((c) => pts[i][c] + (pts[i + 1][c] - pts[i][c]) * f2);
  };
  return (t) => {
    let i = 0;
    while (i < pts.length - 2 && t > at[i + 1]) i++;
    for (const k of [i, i + 1]) {
      if (k > 0 && k < pts.length - 1 && Math.abs(t - at[k]) < round) {
        const s = (t - at[k] + round) / (2 * round);
        const A = seg(k - 1, at[k] - round);
        const C = seg(k, at[k] + round);
        return [0, 1, 2].map((c) => (1 - s) * (1 - s) * A[c] + 2 * s * (1 - s) * pts[k][c] + s * s * C[c]);
      }
    }
    return seg(i, Math.max(at[i], Math.min(at[i + 1], t)));
  };
}
const palpPath = (sx) => through([[0.3 * sx, 4.5, -0.62], [0.33 * sx, 5.02, -0.6], [0.3 * sx, 5.3, -0.3], [0.27 * sx, 5.4, 0.08]]);
const palpRad = (t) => 0.11 * (1 - 0.72 * t * t) * (0.5 + 0.5 * sm(0, 0.15, t));
const LEG_AT = [0, 0.1, 0.4, 0.72, 1];
const LEGS = [
  { stand: [[0.8, 1, -1.2], [1.2, 1.25, -1.62], [3, 2.4, 0.05], [4.5, 3.6, -3.45], FEET[0]], fold: [[0.8, 1, -1.2], [0.9, 0.9, -1.42], [0.95, -1.7, -0.98], [0.75, 1.7, -1.22], [0.65, 0.1, -1.34]] },
  { stand: [[0.8, -0.9, -1.2], [1.15, -1.2, -1.62], [2.8, -2.5, 0.1], [4.2, -4.6, -3.45], FEET[2]], fold: [[0.8, -0.9, -1.2], [0.88, -1.1, -1.38], [0.85, -3.5, -0.72], [0.48, 0.3, -1.4], [0.42, -1.3, -1.3]] }
];
const legRad = (t) => {
  const r = t < 0.1 ? 0.16 : t < 0.4 ? 0.092 - 0.022 * ((t - 0.1) / 0.3) : t < 0.72 ? 0.06 - 0.014 * ((t - 0.4) / 0.32) : 0.04 - 0.014 * ((t - 0.72) / 0.28);
  const knuckle = 1 + 0.26 * Math.exp(-Math.pow((t - 0.4) / 0.014, 2)) + 0.22 * Math.exp(-Math.pow((t - 0.72) / 0.012, 2));
  const beads = t > 0.72 ? 1 + 0.12 * Math.cos((t - 0.72) / 0.28 * 5 * 2 * Math.PI) : 1;
  return [r * knuckle * beads, r * knuckle * beads];
};
const legPath = (k, sx, folded = false) => jointed((folded ? LEGS[k].fold : LEGS[k].stand).map((p) => [p[0] * sx, p[1], p[2]]), LEG_AT);
const brushPath = (sx) => through([[0.5 * sx, 2.2, -1], [0.56 * sx, 2.7, -0.95], [0.5 * sx, 3.1, -0.72], [0.44 * sx, 3.4, -0.58]]);
const brushRad = (t) => 0.1 * (1 - 0.6 * t);
const CLUB = 0.8;
const antennaPath = (sx) => through([[0.42 * sx, 4.5, 0.98], [0.75 * sx, 5.9, 1.9], [1.6 * sx, 8.6, 3], [2.7 * sx, 12, 3.75], [3.6 * sx, 15, 3.95], [4.05 * sx, 16.9, 3.8]]);
const antennaRad = (t) => 0.034 - 0.011 * sm(0, 0.5, t) + 0.097 * sm(CLUB, 0.93, t) * (1 - 0.7 * sm(0.955, 1, t));
const TONGUE_TURNS = 2.6;
const tonguePath = (t) => {
  const a = -0.9 + t * TONGUE_TURNS * Math.PI * 2;
  const r = 0.46 * (1 - 0.74 * t) + 0.04;
  return [0.05 * Math.sin(a * 0.5 + 0.6) * (1 - t), 4.98 + Math.sin(a) * r, -0.86 - Math.cos(a) * r];
};
const tongueRad = (t) => {
  const ring = 1 + 0.07 * Math.cos(t * 150 * 2 * Math.PI);
  return [(0.105 - 0.05 * t) * ring, (0.08 - 0.036 * t) * ring];
};
class Builder2 {
  constructor() {
    this.pos = [];
    this.alt = [];
    this.nrm = [];
    this.part = [];
    this.rad = [];
    this.idx = [];
  }
  /**
   * Sweep a closed section along a path. path(t) → [x, y, z]; rad(t) → [ra, rb] (half-widths across / along `up`).
   * alt: optional second path with the same parameter (a second pose).
   */
  tube(path, rad, n, sides, part, leg = -1, alt = null, up = [0, 0, 1]) {
    const base = this.pos.length / 3;
    const P = new THREE.Vector3();
    const T = new THREE.Vector3();
    const A = new THREE.Vector3();
    const B = new THREE.Vector3();
    const U = new THREE.Vector3(...up);
    const frame = (fn, t) => {
      const a = fn(Math.max(0, t - 1e-3));
      const b = fn(Math.min(1, t + 1e-3));
      T.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize();
      A.crossVectors(T, U);
      if (A.lengthSq() < 1e-6) A.crossVectors(T, new THREE.Vector3(1, 0, 0));
      A.normalize();
      B.crossVectors(A, T).normalize();
      const p = fn(t);
      P.set(p[0], p[1], p[2]);
    };
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const [ra, rb] = rad(t);
      const t0 = Math.max(0, t - 2e-3);
      const t1 = Math.min(1, t + 2e-3);
      const p0 = path(t0);
      const p1 = path(t1);
      const slope = (rad(t1)[0] - rad(t0)[0]) / (Math.hypot(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]) || 1);
      const lean = Math.max(-4, Math.min(4, slope));
      for (let s = 0; s < sides; s++) {
        const a = s / sides * Math.PI * 2;
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        frame(path, t);
        this.pos.push(P.x + A.x * ca * ra + B.x * sa * rb, P.y + A.y * ca * ra + B.y * sa * rb, P.z + A.z * ca * ra + B.z * sa * rb);
        let nx = A.x * ca * rb + B.x * sa * ra;
        let ny = A.y * ca * rb + B.y * sa * ra;
        let nz = A.z * ca * rb + B.z * sa * ra;
        let nl = Math.hypot(nx, ny, nz) || 1;
        nx = nx / nl - T.x * lean;
        ny = ny / nl - T.y * lean;
        nz = nz / nl - T.z * lean;
        nl = Math.hypot(nx, ny, nz) || 1;
        this.nrm.push(nx / nl, ny / nl, nz / nl);
        this.part.push(part, t, s / sides, leg);
        this.rad.push(Math.max(ra, rb));
        if (alt) {
          frame(alt, t);
          this.alt.push(P.x + A.x * ca * ra + B.x * sa * rb, P.y + A.y * ca * ra + B.y * sa * rb, P.z + A.z * ca * ra + B.z * sa * rb);
        } else this.alt.push(this.pos[this.pos.length - 3], this.pos[this.pos.length - 2], this.pos[this.pos.length - 1]);
      }
    }
    for (let i = 0; i < n; i++) {
      for (let s = 0; s < sides; s++) {
        const a = base + i * sides + s;
        const b = base + i * sides + (s + 1) % sides;
        this.idx.push(a, a + sides, b, b, a + sides, b + sides);
      }
    }
    for (const end of [0, 1]) {
      const c = this.pos.length / 3;
      const ring = base + end * n * sides;
      frame(path, end);
      this.pos.push(P.x, P.y, P.z);
      this.nrm.push(T.x * (end ? 1 : -1), T.y * (end ? 1 : -1), T.z * (end ? 1 : -1));
      this.part.push(part, end, 0, leg);
      this.rad.push(0);
      if (alt) frame(alt, end);
      this.alt.push(P.x, P.y, P.z);
      for (let s = 0; s < sides; s++) {
        const a = ring + s;
        const b = ring + (s + 1) % sides;
        if (end) this.idx.push(a, c, b);
        else this.idx.push(a, b, c);
      }
    }
  }
  /** An ellipsoid (the eyes). */
  ball(c, r, nu, nv, part) {
    const base = this.pos.length / 3;
    for (let j = 0; j <= nv; j++) {
      const v = j / nv;
      const th = v * Math.PI;
      for (let i = 0; i <= nu; i++) {
        const u = i / nu;
        const ph = u * Math.PI * 2;
        const d = [Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)];
        this.pos.push(c[0] + d[0] * r[0], c[1] + d[1] * r[1], c[2] + d[2] * r[2]);
        this.alt.push(c[0] + d[0] * r[0], c[1] + d[1] * r[1], c[2] + d[2] * r[2]);
        const nl = Math.hypot(d[0] / r[0], d[1] / r[1], d[2] / r[2]);
        this.nrm.push(d[0] / r[0] / nl, d[1] / r[1] / nl, d[2] / r[2] / nl);
        this.part.push(part, u, v, -1);
        this.rad.push(Math.max(r[0], r[1], r[2]));
      }
    }
    for (let j = 0; j < nv; j++) {
      for (let i = 0; i < nu; i++) {
        const a = base + j * (nu + 1) + i;
        this.idx.push(a, a + 1, a + nu + 1, a + 1, a + nu + 2, a + nu + 1);
      }
    }
  }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute("aAlt", new THREE.Float32BufferAttribute(this.alt, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(this.nrm, 3));
    g.setAttribute("aPart", new THREE.Float32BufferAttribute(this.part, 4));
    g.setAttribute("aRad", new THREE.Float32BufferAttribute(this.rad, 1));
    g.setIndex(this.idx);
    return g;
  }
}
function buildBody(detail = 1) {
  const b = new Builder2();
  const hi = detail > 0;
  const seg = (a, c) => hi ? a : c;
  const lathe = (fn, n, sides, part) => b.tube(
    (t) => {
      const s = fn(t);
      return [0, s.y, s.z];
    },
    (t) => {
      const s = fn(t);
      return [s.rx, s.rz];
    },
    n,
    sides,
    part
  );
  lathe(thoraxAt, seg(40, 7), seg(32, 8), PART.THORAX);
  lathe(abdomenAt, seg(48, 10), seg(16, 6), PART.ABDOMEN);
  lathe(headAt, seg(26, 4), seg(30, 6), PART.HEAD);
  for (const sx of [1, -1]) {
    b.ball([EYE[0] * sx, EYE[1], EYE[2]], EYE_R, seg(56, 8), seg(40, 6), PART.EYE);
    b.tube(palpPath(sx), (t) => [palpRad(t), palpRad(t)], seg(12, 3), seg(8, 4), PART.PALP);
    b.tube(antennaPath(sx), (t) => [antennaRad(t), antennaRad(t)], seg(56, 12), seg(7, 3), PART.ANTENNA, sx > 0 ? 10 : 11);
    for (const k of [0, 1]) {
      const leg = k * 2 + (sx > 0 ? 0 : 1);
      b.tube(legPath(k, sx), legRad, seg(64, 8), seg(8, 3), PART.LEG, leg, legPath(k, sx, true));
      if (hi) {
        const m = (p) => [p[0] * sx, p[1], p[2]];
        const toe = m(LEGS[k].stand[4]);
        const toeF = m(LEGS[k].fold[4]);
        for (const c of [-1, 1]) {
          const claw = (o) => through([o, [o[0] + 0.11 * sx + 0.07 * c, o[1] + 0.1 * (k ? -1 : 1), o[2] + 0.07], [o[0] + 0.2 * sx + 0.14 * c, o[1] + 0.18 * (k ? -1 : 1), o[2] - 0.04]]);
          b.tube(claw(toe), (t) => [0.026 * (1 - 0.85 * t), 0.026 * (1 - 0.85 * t)], 4, 4, PART.CLAW, leg, claw(toeF));
        }
      }
    }
    b.tube(brushPath(sx), (t) => [brushRad(t), brushRad(t)], seg(10, 3), seg(6, 3), PART.LEG, -2);
  }
  if (hi) {
    b.tube(tonguePath, tongueRad, 640, 10, PART.TONGUE, -1, null, [1, 0, 0]);
  }
  return b.build();
}
function splitBody(geometry) {
  const part = geometry.attributes.aPart.array;
  const idx = geometry.index.array;
  const trunk = [];
  const limbs = [];
  for (let i = 0; i < idx.length; i += 3) {
    const to = part[idx[i] * 4] > 5.5 ? limbs : trunk;
    to.push(idx[i], idx[i + 1], idx[i + 2]);
  }
  const make = (index) => {
    const g = new THREE.BufferGeometry();
    for (const k of Object.keys(geometry.attributes)) g.setAttribute(k, geometry.attributes[k]);
    g.setIndex(index);
    return g;
  };
  return { trunk: make(trunk), limbs: make(limbs) };
}
function buildFur(rnd) {
  const pos = [];
  const tip = [];
  const hair = [];
  const idx = [];
  const whiteAt = (x, y, z) => {
    let w = 0;
    for (const [sx, sy, sz, r] of SPOTS) w = Math.max(w, 1 - sm(r * 0.7, r * 1.25, Math.hypot(Math.abs(x) - sx, y - sy, z - sz)));
    return w;
  };
  const add = (p, n, len, lean, white) => {
    const d = [n[0] + (rnd() - 0.5) * 0.9, n[1] - lean * (0.6 + 0.8 * rnd()) + (rnd() - 0.5) * 0.5, n[2] + (rnd() - 0.5) * 0.9];
    const dl = Math.hypot(d[0], d[1], d[2]) || 1;
    const base = pos.length / 3;
    const r = rnd();
    for (const [t, s] of [[0, -1], [0, 1], [1, -1], [1, 1]]) {
      pos.push(p[0], p[1], p[2]);
      tip.push(d[0] / dl * len, d[1] / dl * len, d[2] / dl * len);
      hair.push(t, s, r, white);
    }
    idx.push(base, base + 1, base + 2, base + 2, base + 1, base + 3);
  };
  const coat = (fn, count, len, lean, t0 = 0, t1 = 1, dorsalBias = 0) => {
    for (let i = 0; i < count; i++) {
      const t = t0 + (t1 - t0) * rnd();
      let a = rnd() * Math.PI * 2;
      if (rnd() < dorsalBias) a = Math.PI * (0.15 + 0.7 * rnd());
      const s = fn(t);
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      const p = [ca * s.rx * 0.97, s.y, s.z + sa * s.rz * 0.97];
      const nl = Math.hypot(ca * s.rz, sa * s.rx) || 1;
      if (Math.hypot((Math.abs(p[0]) - EYE[0]) / EYE_R[0], (p[1] - EYE[1]) / EYE_R[1], (p[2] - EYE[2]) / EYE_R[2]) < 1.12) continue;
      const w = whiteAt(p[0], p[1], p[2]);
      add(p, [ca * s.rz / nl, 0, sa * s.rx / nl], len * (0.5 + 1 * rnd() * rnd()) * (1 - 0.6 * w), lean, w > 0.5 ? 1 : 0);
    }
  };
  coat(thoraxAt, 3e3, 0.34, 1.3, 0.03, 0.99, 0.35);
  coat(headAt, 2800, 0.2, 1.1, 0.05, 0.98, 0.5);
  coat(thoraxAt, 1e3, 0.4, 1.2, 0.03, 0.3, 0.3);
  coat(abdomenAt, 420, 0.2, 1.6, 0, 0.25);
  coat(abdomenAt, 260, 0.1, 1.8, 0.25, 1);
  for (const sx of [1, -1]) {
    const path = palpPath(sx);
    for (let i = 0; i < 240; i++) {
      const t = 0.05 + 0.93 * rnd();
      const a = rnd() * Math.PI * 2;
      const c = path(t);
      const c2 = path(Math.min(1, t + 0.02));
      const T = [c2[0] - c[0], c2[1] - c[1], c2[2] - c[2]];
      const tl = Math.hypot(T[0], T[1], T[2]) || 1;
      const A = [T[1] / tl, -T[0] / tl, 0];
      const al = Math.hypot(A[0], A[1]) || 1;
      A[0] /= al;
      A[1] /= al;
      const B = [(T[1] * A[2] - T[2] * A[1]) / tl, (T[2] * A[0] - T[0] * A[2]) / tl, (T[0] * A[1] - T[1] * A[0]) / tl];
      const n = [A[0] * Math.cos(a) + B[0] * Math.sin(a), A[1] * Math.cos(a) + B[1] * Math.sin(a), A[2] * Math.cos(a) + B[2] * Math.sin(a)];
      const r = palpRad(t) * 0.9;
      const base = pos.length / 3;
      const len = 0.13 * (0.5 + rnd());
      const d = [n[0] * 0.5 + T[0] / tl * 1.1, n[1] * 0.5 + T[1] / tl * 1.1, n[2] * 0.5 + T[2] / tl * 1.1];
      const dl = Math.hypot(d[0], d[1], d[2]);
      const white = n[2] < -0.6 ? 1 : 0;
      const rr = rnd();
      for (const [tt, ss] of [[0, -1], [0, 1], [1, -1], [1, 1]]) {
        pos.push(c[0] + n[0] * r, c[1] + n[1] * r, c[2] + n[2] * r);
        tip.push(d[0] / dl * len, d[1] / dl * len, d[2] / dl * len);
        hair.push(tt, ss, rr, white);
      }
      idx.push(base, base + 1, base + 2, base + 2, base + 1, base + 3);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("aTip", new THREE.Float32BufferAttribute(tip, 3));
  g.setAttribute("aHair", new THREE.Float32BufferAttribute(hair, 4));
  g.setIndex(idx);
  return g;
}
const RG = 0.3125;
const WIDE = 1.2;
const atlasGLSL = (
  /* glsl */
  `
#ifndef BF_ATLAS
#define BF_ATLAS
vec2 bfAtlasUV(vec2 p, float hind){
  return (p * ${ATLAS.px}.0 + mix(vec2(${ATLAS.fore[0]}.0, ${ATLAS.fore[1]}.0), vec2(${ATLAS.hind[0]}.0, ${ATLAS.hind[1]}.0), hind)) / ${ATLAS.size}.0;
}
// The direction of the nearest vein, unit, in the wing's flat frame (its sign means nothing). vf = a lookup of the atlas.
vec2 bfVeinDir(vec4 vf){
  vec2 d = vf.ba * 2.0 - 1.0;
  float c = d.x * inversesqrt(max(dot(d, d), 1e-6));
  return vec2(sqrt(max(0.5 + 0.5 * c, 0.0)), (d.y < 0.0 ? -1.0 : 1.0) * sqrt(max(0.5 - 0.5 * c, 0.0)));
}
#endif
`
);
const VEIN_VERT = (
  /* glsl */
  `
attribute vec4 aSeg;      // a.xy, b.xy (mm)
attribute vec4 aRad;      // radius at a, radius at b, atlas origin (px)
attribute vec4 aTan;      // which way the vein runs at a, at b (unit: a vein is a curve, its pieces are not)
varying vec2 vP;
varying vec4 vSeg;
varying vec2 vRad;
varying vec4 vTan;
void main(){
  vTan = aTan;
  vec2 a = aSeg.xy, b = aSeg.zw;
  vec2 t = normalize(b - a + vec2(1e-5, 0.0));
  vec2 n = vec2(-t.y, t.x);
  float pad = max(aRad.x, aRad.y) + ${WIDE.toFixed(3)};
  vec2 p = mix(a, b, position.x * 0.5 + 0.5) + t * position.x * pad + n * position.y * pad;
  vP = p; vSeg = aSeg; vRad = aRad.xy;
  gl_Position = vec4((p * ${ATLAS.px}.0 + aRad.zw) / ${ATLAS.size}.0 * 2.0 - 1.0, 0.0, 1.0);
}`
);
const VEIN_FRAG = (
  /* glsl */
  `
precision highp float;
varying vec2 vP;
varying vec4 vSeg;
varying vec2 vRad;
void main(){
  vec2 pa = vP - vSeg.xy, ba = vSeg.zw - vSeg.xy;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-8), 0.0, 1.0);
  float d = length(pa - ba * h);
  float r = mix(vRad.x, vRad.y, h);
  gl_FragColor = vec4(clamp(0.5 + (r - d) / ${(2 * RG).toFixed(4)}, 0.0, 1.0), clamp(1.0 - d / ${WIDE.toFixed(3)}, 0.0, 1.0), 0.0, 1.0);
}`
);
const DIR_FRAG = (
  /* glsl */
  `
precision highp float;
varying vec2 vP;
varying vec4 vSeg;
varying vec4 vTan;
void main(){
  vec2 pa = vP - vSeg.xy, ba = vSeg.zw - vSeg.xy;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-8), 0.0, 1.0);
  float d = length(pa - ba * h);
  vec2 t = normalize(mix(vTan.xy, vTan.zw, h));
  gl_FragDepth = clamp(d / ${(WIDE + 0.2).toFixed(3)}, 0.0, 1.0);
  gl_FragColor = vec4(0.0, 0.0, 0.5 + 0.5 * (t.x * t.x - t.y * t.y), 0.5 + t.x * t.y);
}`
);
function bakeWingAtlas(renderer, wings, shadeMat) {
  const mk = (size, depthBuffer = false) => new THREE.WebGLRenderTarget(size, size, {
    type: THREE.UnsignedByteType,
    format: THREE.RGBAFormat,
    minFilter: THREE.LinearMipmapLinearFilter,
    magFilter: THREE.LinearFilter,
    generateMipmaps: true,
    depthBuffer,
    stencilBuffer: false
  });
  const veinRT = mk(ATLAS.size, true);
  const shadeRT = mk(512);
  veinRT.texture.anisotropy = 4;
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const scene = new THREE.Scene();
  const segs = [];
  const rads = [];
  const tans = [];
  wings.forEach((w, k) => {
    const org = k === 0 ? ATLAS.fore : ATLAS.hind;
    const dir = w.veins.map((v) => {
      const l = Math.hypot(v.b[0] - v.a[0], v.b[1] - v.a[1]) || 1;
      return [(v.b[0] - v.a[0]) / l, (v.b[1] - v.a[1]) / l];
    });
    w.veins.forEach((v, i) => {
      segs.push(v.a[0], v.a[1], v.b[0], v.b[1]);
      rads.push(v.ra, v.rb, org[0], org[1]);
      const joined = (j, p, q) => j >= 0 && j < dir.length && Math.hypot(p[0] - q[0], p[1] - q[1]) < 1e-6;
      const ta = joined(i - 1, w.veins[i - 1]?.b || [9e9, 0], v.a) ? [dir[i][0] + dir[i - 1][0], dir[i][1] + dir[i - 1][1]] : dir[i];
      const tb = joined(i + 1, w.veins[i + 1]?.a || [9e9, 0], v.b) ? [dir[i][0] + dir[i + 1][0], dir[i][1] + dir[i + 1][1]] : dir[i];
      const la = Math.hypot(ta[0], ta[1]) || 1;
      const lb = Math.hypot(tb[0], tb[1]) || 1;
      tans.push(ta[0] / la, ta[1] / la, tb[0] / lb, tb[1] / lb);
    });
  });
  const geo = new THREE.InstancedBufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]), 3));
  geo.setIndex([0, 1, 2, 0, 2, 3]);
  geo.setAttribute("aSeg", new THREE.InstancedBufferAttribute(new Float32Array(segs), 4));
  geo.setAttribute("aRad", new THREE.InstancedBufferAttribute(new Float32Array(rads), 4));
  geo.setAttribute("aTan", new THREE.InstancedBufferAttribute(new Float32Array(tans), 4));
  geo.instanceCount = segs.length / 4;
  const mat = new THREE.ShaderMaterial({
    vertexShader: VEIN_VERT,
    fragmentShader: VEIN_FRAG,
    depthTest: false,
    depthWrite: false,
    transparent: true,
    blending: THREE.CustomBlending,
    blendEquation: THREE.MaxEquation,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = 0;
  scene.add(mesh);
  const dirMat = new THREE.ShaderMaterial({
    vertexShader: VEIN_VERT,
    fragmentShader: DIR_FRAG,
    depthTest: true,
    depthWrite: true,
    transparent: true,
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.ConstantColorFactor,
    blendDst: THREE.OneMinusConstantColorFactor,
    blendColor: new THREE.Color(0, 0, 1),
    blendAlpha: 1
  });
  const dirMesh = new THREE.Mesh(geo, dirMat);
  dirMesh.frustumCulled = false;
  dirMesh.renderOrder = 1;
  scene.add(dirMesh);
  const prevTarget = renderer.getRenderTarget();
  const prevAuto = renderer.autoClear;
  const prevColor = renderer.getClearColor(new THREE.Color());
  const prevAlpha = renderer.getClearAlpha();
  renderer.autoClear = true;
  renderer.setClearColor(0, 0);
  renderer.setRenderTarget(veinRT);
  renderer.render(scene, cam);
  scene.remove(mesh);
  scene.remove(dirMesh);
  const flats = wings.map((w, k) => {
    const m = shadeMat(k === 1, veinRT.texture);
    const f2 = new THREE.Mesh(w.geometry, m);
    f2.frustumCulled = false;
    scene.add(f2);
    return m;
  });
  renderer.setRenderTarget(shadeRT);
  renderer.render(scene, cam);
  renderer.setRenderTarget(prevTarget);
  renderer.setClearColor(prevColor, prevAlpha);
  renderer.autoClear = prevAuto;
  geo.dispose();
  mat.dispose();
  dirMat.dispose();
  for (const m of flats) m.dispose();
  return {
    veins: veinRT.texture,
    shade: shadeRT.texture,
    dispose() {
      veinRT.dispose();
      shadeRT.dispose();
    }
  };
}
const hash = (
  /* glsl */
  `
#ifndef HL_HASH
#define HL_HASH
float hash11(float p){ p = fract(p * .1031); p *= p + 33.33; p *= p + p; return fract(p); }
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float hash13(vec3 p3){ p3 = fract(p3 * .1031); p3 += dot(p3, p3.zyx + 31.32); return fract((p3.x + p3.y) * p3.z); }
vec2 hash21(float p){ vec3 p3 = fract(vec3(p) * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
vec2 hash22(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
vec2 hash23(vec3 p3){ p3 = fract(p3 * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
vec3 hash31(float p){ vec3 p3 = fract(vec3(p) * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xxy + p3.yzz) * p3.zyx); }
vec3 hash32(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yxz + 33.33); return fract((p3.xxy + p3.yzz) * p3.zyx); }
vec3 hash33(vec3 p3){ p3 = fract(p3 * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yxz + 33.33); return fract((p3.xxy + p3.yxx) * p3.zyx); }
// Interleaved gradient noise (Jimenez) — great per-pixel dither / rotation source. Pass gl_FragCoord.xy.
float ign(vec2 p){ return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
#endif
`
);
const color = (
  /* glsl */
  `
#ifndef HL_COLOR
#define HL_COLOR
float luma(vec3 c){ return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
vec3 toLinear(vec3 c){ return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c)); }
vec3 toSRGB(vec3 c){ c = max(c, 0.0); return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
// IQ cosine palette: a + b*cos(2π(c*t+d))
vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d){ return a + b * cos(6.283185307179586 * (c * t + d)); }
// Approximate black-body colour (linear RGB) for a temperature in Kelvin, 1000..12000.
vec3 blackbody(float k){
  float t = k / 100.0;
  vec3 c;
  c.r = t <= 66.0 ? 1.0 : clamp(1.292936 * pow(t - 60.0, -0.1332047592), 0.0, 1.0);
  c.g = t <= 66.0 ? clamp(0.39008157876 * log(t) - 0.63184144378, 0.0, 1.0) : clamp(1.129890861 * pow(t - 60.0, -0.0755148492), 0.0, 1.0);
  c.b = t >= 66.0 ? 1.0 : (t <= 19.0 ? 0.0 : clamp(0.54320678911 * log(t - 10.0) - 1.19625408914, 0.0, 1.0));
  return c * c; // roughly linearise
}
// Wavelength (380..700nm) → linear RGB, for dispersion / thin-film / spectral tricks.
vec3 spectrum(float nm){
  float x = clamp((nm - 380.0) / 320.0, 0.0, 1.0);
  vec3 c = vec3(
    smoothstep(0.50, 0.72, x) + 0.35 * smoothstep(0.18, 0.0, x) * smoothstep(0.0, 0.08, x) * 2.0,
    smoothstep(0.18, 0.42, x) * smoothstep(0.86, 0.60, x),
    smoothstep(0.0, 0.14, x) * smoothstep(0.48, 0.30, x));
  return c * smoothstep(0.0, 0.06, x) * smoothstep(1.0, 0.88, x);
}
// Thin-film interference tint (soap bubble / oil / beetle shell). cosTheta = N·V, thickness in nm.
vec3 thinFilm(float cosTheta, float thickness, float ior){
  float ct = sqrt(max(0.0, 1.0 - (1.0 - cosTheta * cosTheta) / (ior * ior)));
  float opd = 2.0 * ior * thickness * ct;
  vec3 phase = 6.283185307179586 * opd / vec3(650.0, 532.0, 450.0);
  return 0.5 + 0.5 * cos(phase);
}
mat2 rot2(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
float sat(float x){ return clamp(x, 0.0, 1.0); }
float remap01(float x, float a, float b){ return clamp((x - a) / (b - a), 0.0, 1.0); }
#endif
`
);
const f = (x) => Number(x).toFixed(4);
const v2 = (a) => `vec2(${f(a[0])}, ${f(a[1])})`;
const ORG = (
  /* glsl */
  `mix(vec2(${f(ATLAS.fore[0])}, ${f(ATLAS.fore[1])}), vec2(${f(ATLAS.hind[0])}, ${f(ATLAS.hind[1])}), W.y)`
);
const VERT = (L) => (
  /* glsl */
  `
${wingVertexGLSL}
varying vec2 vP;
varying vec3 vEdge;
varying vec2 vWing;
varying vec3 vWorld;
varying vec3 vTx;
varying vec3 vTy;
varying vec4 vLook;
varying float vSun;
varying float vFar;
varying vec4 vBodyO;       // middle of the thorax (world), world units per millimetre
varying vec3 vBodyF;       // the body's long axis, toward the head (unit)
#if PASS == 4
uniform vec4 uBfLens;
#endif
#if PASS != 3
${hash}
${L.common}
${L.vertex}
#endif
void main(){
  vec2 p = position.xy;
  vec2 W = aWing;
  vP = p; vEdge = aEdge; vWing = W;
#if PASS == 3
  vWorld = vec3(0.0); vTx = vec3(1.0, 0.0, 0.0); vTy = vec3(0.0, 1.0, 0.0); vLook = vec4(0.0); vSun = 0.0; vFar = 0.0;
  vBodyO = vec4(0.0); vBodyF = vec3(0.0, 1.0, 0.0);
  gl_Position = vec4((p * ${f(ATLAS.px)} + ${ORG}) / ${f(ATLAS.size)} * 2.0 - 1.0, 0.0, 1.0);
#else
  vLook = BF_LOOK;
  mat4 m = bfModel();
  vec3 b0, tx, ty;
  bfWingFrame(b0, tx, ty);
  vec4 wp = m * vec4(b0, 1.0);
  vWorld = wp.xyz;
  vTx = normalize(mat3(m) * tx);
  vTy = normalize(mat3(m) * ty);
  vSun = bfSunVisV(wp.xyz);
  // With the wings shut over the back and the lens square to them, the pair on the far side of the body is seen
  // THROUGH the pair on the near side. 1 = this is such a wing; 0 = it is not (the wings are open, or this is the
  // near pair, or the lens looks along the wings and sees the far pair past the near one, not through it).
  vBodyO = vec4(m[3].xyz, length(m[1].xyz));
  vBodyF = m[1].xyz / vBodyO.w;
  vec3 toCam = cameraPosition - m[3].xyz;
  float lat = dot(toCam, m[0].xyz) / max(length(m[0].xyz) * length(toCam), 1e-9);
  vFar = smoothstep(0.55, 0.9, -lat * W.x) * smoothstep(0.8, 1.25, mix(BF_POSE.x, BF_POSE.y, W.y));
  vec4 vp = viewMatrix * wp;
#if PASS == 4
  // (tested against the depth buffer well behind itself: it must not paint over the body or a farther wing)
  vp.xyz *= 1.0 + uBfLens.w / max(-vp.z, 1e-4);
#endif
  gl_Position = projectionMatrix * vp;
#endif
}`
);
const pigmentGLSL = (
  /* glsl */
  `
#ifndef BF_PIGMENT
#define BF_PIGMENT
float bfSdSeg(vec2 p, vec2 a, vec2 b){ vec2 pa = p - a, ba = b - a; return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0)); }

// Where the pigment is.
//   returns  x: vein   y: scaled (the border, the dark band over the end of the cell, the frame of the white bar)
//            z: white (the bar of the forewing, the dots of the margin)   w: rust, how much of the border here is ember
//   band     x: ember 0..1 (the band of amber and crimson inside the border)   y: its heat, 0 the amber core … 1 the
//            crimson of its inner shoulder (0.55 on its outer lip)   z: the white bar alone   w: across the border,
//            0 the margin … 1 its inner contour
//   jit      millimetres every contour is moved by: 0, or each scale's own number, so that an edge is made of whole scales
vec4 bfPigmentBand(vec2 p, vec3 e, float hind, vec4 vf, float px, float jit, out vec4 band){
  float vd = (vf.r - 0.5) * ${f(2 * RG)};
#ifdef BF_VEIN_SOLID
  // (alpha-tested, a vein cannot be faint: it is never drawn thinner than a pixel)
  float grow = clamp(0.5 * px - 0.02, 0.0, 0.2);
  float aa = min(0.75 * px, 0.14);
  float vein = smoothstep(-aa, aa, vd + grow) * mix(1.0, 0.3, smoothstep(0.25, 1.0, px));
#else
  // a vein is hair-fine. Thinner than a pixel it is drawn a pixel wide and as faint as it is thin — never a pixel of
  // solid black: that is what turns a clear wing into smoked glass when the animal is small
  // (a vein is about 0.07 mm across: that much of a pixel is the most it can cover)
  float vein = min(clamp(0.5 + vd / clamp(px, 0.012, 0.5), 0.0, 1.0), clamp(0.065 / px, 0.1, 1.0));
#endif
  float x = e.x + jit;
  // the border reaches a little way inward along every vein that meets it: its inner contour is scalloped
  float bw = e.y * (1.0 + 0.7 * vf.g * vf.g);
  float ea = clamp(0.6 * px, 0.01, 0.45 * bw);
  float cover = 1.0 - smoothstep(bw - ea, bw + ea, x);
  // across it, from the margin inward: a black rim, the ember, black velvet. The ember has an amber core a third of
  // the way in and falls to crimson on both shoulders, and from crimson into the black: no hard line anywhere in it
  float rim = min(0.4, 0.32 * bw);
  float ew = (bw - rim) * 0.6 * e.z;
  float et = (x - rim) / max(ew, 0.001);
  float es = min(ea / max(ew, 0.001), 0.3);
  float ember = smoothstep(-es, 0.16 + es, et) * (1.0 - smoothstep(0.58 - es, 1.0 + es, et));
  // (where the band is thinner than a pixel there is less of it, not a line of it)
  ember *= clamp(ew / max(1.5 * px, 0.03), 0.0, 1.0);
  float heat = clamp(smoothstep(0.3, 1.0, et) + 0.55 * smoothstep(0.3, 0.0, et), 0.0, 1.0);
  // (from far off the band is narrower than a pixel: the border is then the blend the eye would make of it)
  float farK = smoothstep(0.25, 0.7, px / max(bw, 0.05));
  ember = mix(ember, 0.45 * e.z, farK) * cover;
  heat = mix(heat, 0.3, farK);
  // (and none at the root of the wing: the base is plain dark)
  ember *= smoothstep(1.2, 4.0, length(p));
  // a row of very small white dots in the rim of the outer margins
  float s = hind < 0.5 ? p.x * 1.13 : atan(p.y + 1.4, p.x - 8.2) * 11.6;
  float da = clamp(0.6 * px, 0.008, 0.09);
  float dots = 1.0 - smoothstep(0.105 - da, 0.105 + da, length(vec2((fract(s / 1.5) - 0.5) * 1.5, e.x - 0.21)));
  dots *= smoothstep(0.95, 1.15, e.y) * smoothstep(0.3, 0.1, px) * mix(smoothstep(-0.7, -1.7, p.y), 1.0, hind);
  float bar = 0.0;
  if (hind < 0.5) {
    // forewing: a dark band over the end of the cell, narrowing toward the back of it; beyond it the white bar, a
    // lozenge from the leading edge drawn to a point, in a hairline frame
    float dc = min(bfSdSeg(p, ${v2(BAR.dc[0])}, ${v2(BAR.dc[1])}), bfSdSeg(p, ${v2(BAR.dc[1])}, ${v2(BAR.dc[2])})) * (1.0 + 0.5 * smoothstep(0.5, -2.8, p.y));
    cover = max(cover, 1.0 - smoothstep(${f(BAR.dcw)} - ea, ${f(BAR.dcw)} + ea, dc + jit));
    vec2 ab = ${v2(BAR.b)} - ${v2(BAR.a)};
    float along = clamp(dot(p - ${v2(BAR.a)}, ab) / dot(ab, ab), 0.0, 1.0);
    float wdt = ${f(BAR.w)} * (0.55 + 0.45 * smoothstep(0.0, 0.22, along)) * (1.0 - 0.8 * along * sqrt(along));
    float db = bfSdSeg(p, ${v2(BAR.a)}, ${v2(BAR.b)}) + jit;
    bar = (1.0 - smoothstep(wdt - ea, wdt + ea, db)) * smoothstep(0.26 - ea, 0.26 + ea, x);
    cover = max(cover, 1.0 - smoothstep(wdt + 0.13 - ea, wdt + 0.13 + ea, db));
  }
  band = vec4(ember * (1.0 - bar), heat, bar, clamp(x / max(bw, 0.001), 0.0, 1.0));
  return vec4(vein, cover, max(bar, dots) * cover, e.z);
}
vec4 bfPigment(vec2 p, vec3 e, float hind, vec4 vf, float px){
  vec4 band;
  return bfPigmentBand(p, e, hind, vf, px, 0.0, band);
}

// Scales: rows around a point behind the hinge, staggered, each tip rounded and lying over the next row.
// Returns x: 1 on the lit part of a scale → 0 in the shadow under the row before it, y z: two random numbers of this
// scale, w: distance to its tip in rows (for the rim).
vec4 bfScale(vec2 p, float seed){
  vec2 q = p - vec2(-9.0, 0.6);
  float r = length(q), th = atan(q.y, q.x);
  const float ROW = 0.21, COL = 0.15;
  float rf = r / ROW;
  float ri = floor(rf), v = rf - ri;
  float n = floor(6.2831853 * (ri + 0.5) * ROW / COL);
  float cf = th / 6.2831853 * n + 0.5 * mod(ri, 2.0) + hash11(ri + seed) * 0.4;
  float ci = floor(cf), u = cf - ci - 0.5;
  float tip = 1.0 - 2.1 * u * u;                    // the outline of this row's tips, in rows
  float own = tip - v;
  if (own < 0.0) {
    // in the notch between two tips: the scale of the next row out is what shows
    ri += 1.0; v -= 1.0;
    n = floor(6.2831853 * (ri + 0.5) * ROW / COL);
    cf = th / 6.2831853 * n + 0.5 * mod(ri, 2.0) + hash11(ri + seed) * 0.4;
    ci = floor(cf); u = cf - ci - 0.5;
  }
  vec2 h = hash22(vec2(ri, ci) + seed * 31.0);
  // (lit toward its tip, in shadow where the row before lies over it; fine ridges run its length)
  float lit = smoothstep(-0.6, 0.7, v) * (0.88 + 0.12 * cos(u * 44.0));
  return vec4(lit, h, own < 0.0 ? 1.0 : own);
}
#endif
`
);
const FRAG = (L) => (
  /* glsl */
  `
precision highp float;
varying vec2 vP;
varying vec3 vEdge;
varying vec2 vWing;
varying vec3 vWorld;
varying vec3 vTx;
varying vec3 vTy;
varying vec4 vLook;
varying float vSun;
varying float vFar;
varying vec4 vBodyO;
varying vec3 vBodyF;
uniform sampler2D tVein, tNoise;
${hash}
${color}
#if PASS != 3
${L.common}
${L.fragment}
#endif
#if PASS == 4 || defined(BF_SCENE)
uniform sampler2D tBfScene;    // the scene without the insect, with a mip chain; a = distance from the lens (m)
uniform vec2 uBfRes;           // size of the target being drawn into (px)
uniform vec4 uBfLens;          // focus (m), aperture, largest blur (px), how far behind itself the wing is tested (m)
#if PASS == 4
uniform float uBfPre;          // 1 the whole disc of taps … 0.34 two of them, each softer (when the wings fill the frame); under a sixth it fades out
#endif
#endif
#if PASS == 1
#define BF_VEIN_SOLID
#endif
${atlasGLSL}
${pigmentGLSL}
// The film's thickness (nm): thinnest along a vein, thickest in the middle of a cell, so its colours run in bands
// round each cell. g = the atlas's vein field there, wr = the wrinkle that fans out from the hinge through this point.
float bfFilm(vec2 p, float g, float wr, float grain, float seed){
  // (most of the change is slow, across whole cells: a film that changed only beside the veins would give each vein a
  // coloured fringe, like a badly corrected lens)
  return 244.0 + 64.0 * (1.0 - g) * (0.62 + 0.38 * wr) + 20.0 * grain + 60.0 * wr + 66.0 * sin(p.x * 0.21 + p.y * 0.13 + seed * 9.0) + 48.0 * sin(p.x * 0.09 - p.y * 0.33 + seed * 5.0);
}
// The film's colour for an optical path (nm: thickness × the cosine inside the film). Not the whole rainbow, which is
// what a soap bubble or a foil sticker shows: two neighbours, cyan and violet, and a thread of pale gold between them —
// the cool half of the palette, against the ember of the border.
vec3 bfFilmCol(float opd){
  float h = opd / 170.0;
  vec3 c = mix(vec3(0.66, 0.54, 1.0), vec3(0.42, 0.86, 1.0), 0.5 + 0.5 * cos(6.2831853 * h));
  float g = 0.5 + 0.5 * cos(6.2831853 * (h * 0.5 + 0.21));
  return mix(c, vec3(1.0, 0.82, 0.52), g * g * g * 0.7);
}

void main(){
  vec2 W = vWing;
  float px = max(length(dFdx(vP)), length(dFdy(vP)));            // millimetres per pixel
  vec4 n1 = texture2D(tNoise, vP * 0.047 + W.yx * 0.37 + vLook.z);
  vec4 n2 = texture2D(tNoise, vP * 0.33 + W.xy * 0.21);
  // the margin: the tips of the last row of scales, a twentieth of a millimetre of unevenness and no more
  float fringe = (n2.g - 0.5) * 0.05 * smoothstep(0.12, 0.03, px);
  float inside = smoothstep(-0.7 * px, 0.7 * px, vEdge.x + fringe);
  if (inside < 0.004) discard;
  vec2 auv = (vP * ${f(ATLAS.px)} + ${ORG}) / ${f(ATLAS.size)};
  vec4 vf = texture2D(tVein, auv);
  // Single scales. Two distances: from lod inward a scale is two or three pixels and shows only as grain (no two
  // the same value); from fine inward it is many pixels, and then it has its own relief and every contour of the
  // pigment is made of whole scales. (Whole scales at three pixels each would only look like a staircase.)
  vec4 sc = vec4(1.0, 0.5, 0.5, 1.0);
  float lod = 1.0, fine = 0.0;
  vec4 band;
#if !defined(LOD) && PASS != 3 && PASS != 4
  lod = smoothstep(0.03, 0.1, px);
  fine = 1.0 - smoothstep(0.011, 0.028, px);
#endif
  vec4 pg = bfPigmentBand(vP, vEdge, W.y, vf, px, -0.08 * fine, band);
#if !defined(LOD) && PASS != 3 && PASS != 4
  if (lod < 1.0 && pg.y > 0.002) {
    sc = bfScale(vP, vLook.z + W.y * 3.0 + W.x);
    if (fine > 0.0) pg = bfPigmentBand(vP, vEdge, W.y, vf, px, (sc.y - 0.5) * 0.11 * fine, band);
  }
#endif

#if PASS == 3
  float op = max(max(pg.x * 0.92, pg.y * 0.95), 0.1 + 0.05 * n2.g);
  op = mix(op, 0.62, pg.z);
  gl_FragColor = vec4(op * inside);
#elif PASS == 4
  // What is behind the wing, as far out of focus as the lens has it. (The lens's own depth of field cannot do this: to
  // it the wing is one sharp surface.) Drawn before the wing itself; where the room behind is in focus it does nothing.
  vec2 uv = gl_FragCoord.xy / uBfRes;
  float d = textureLod(tBfScene, uv, 0.0).a;
  float coc = clamp((d - uBfLens.x) / max(d, 1e-4) * uBfLens.y, 0.0, 1.0) * uBfLens.z;
  float k = smoothstep(0.5, 2.5, coc);
  vec3 rd = normalize(vWorld - cameraPosition);
  vec3 Nw = normalize(cross(vTx, vTy));
  // (the breath of colour the film lends to what is seen through it is added by the wing itself, pass 0: it does not
  // need the lens to be open)
  float cover = k * clamp(uBfPre * 6.0, 0.0, 1.0);
  if (cover < 0.01) discard;
  // blown glass bends what it shows: by its own curve, by its grain, and most where it rises to a vein
  uv += (Nw.xy * 0.009 + (n1.rg - 0.5) * 0.006) * (0.3 + 0.7 * (1.0 - abs(dot(Nw, rd))));
  uv -= clamp(vec2(dFdx(vf.g), dFdy(vf.g)) * 0.34 / max(px * px, 0.0009), -9.0, 9.0) / uBfRes * (1.0 - pg.x);
  // (a disc of taps, like the lens's own; each tap already as soft as the gaps between them — and where the room behind
  // is in focus anyway, one tap: there is only the colour to add)
  float lodS = max(log2(max(coc, 1.0)) - 1.6, 0.0);
  float rot = ign(gl_FragCoord.xy) * 6.2831853;
  vec3 acc; float tot = 0.6;
  if (uBfPre > 0.999) {
    acc = textureLod(tBfScene, uv, lodS).rgb * 0.6;
    if (k > 0.01) {
      for (int i = 0; i < 6; i++) {
        float a = rot + float(i) * 2.39996323;
        float rr = sqrt((float(i) + 0.6) / 6.0) * coc;
        acc += min(textureLod(tBfScene, uv + vec2(cos(a), sin(a)) * rr / uBfRes, lodS).rgb, vec3(30.0)); tot += 1.0;
      }
    }
  } else {
    // (uBfPre < 1: fewer taps, the outer ones leaving first, and each of those that stay wider and softer for it — for
    // the moment the lens is so close that the wings are most of the frame and four of them lie over one another)
    float taps = 6.0 * uBfPre;
    lodS += 1.9 * (1.0 - uBfPre);
    acc = textureLod(tBfScene, uv, lodS).rgb * 0.6;
    for (int i = 0; i < 6; i++) {
      float wt = clamp(taps - float(i), 0.0, 1.0);
      if (wt <= 0.0 || k <= 0.01) break;
      float a = rot + float(i) * 2.39996323;
      float rr = sqrt((float(i) + 0.6) / max(taps, 1.0)) * coc;
      acc += min(textureLod(tBfScene, uv + vec2(cos(a), sin(a)) * rr / uBfRes, lodS).rgb, vec3(30.0)) * wt; tot += wt;
    }
  }
  gl_FragColor = vec4(acc / tot, cover * inside);
#else
  vec3 V = normalize(cameraPosition - vWorld);
  vec3 N0 = normalize(cross(vTx, vTy));
  float face = dot(N0, V) < 0.0 ? -1.0 : 1.0;
  vec3 Nf = N0 * face;
  float ndv0 = abs(dot(N0, V));
  float species = vLook.x;
  float backlit = max(dot(-V, BF_SUN_DIR), 0.0);
  vec3 sun = BF_SUN_COL * vSun;
  float ndl = dot(Nf, BF_SUN_DIR);
  float seed = vLook.z;
#if PASS == 1
  float mute = 1.0;
#else
  // (the far pair, seen through the near pair: held back, so that the picture is one wing and its echo, not two outlines)
  float mute = 1.0 - 0.5 * vFar;
#endif

  // ---- the membrane's own relief: wrinkles fanned out from the hinge, a rise to every vein, fine grain
  float th = atan(vP.y, vP.x + 3.0), rr = length(vP + vec2(3.0, 0.0));
  float wr = texture2D(tNoise, vec2(th * 2.7 + seed, rr * 0.011)).g;
  vec2 bump = (n1.rg - 0.5) * 0.1 + (n2.ra - 0.5) * 0.04 + vec2(-sin(th), cos(th)) * (wr - 0.5) * 0.16;
#ifndef LOD
  {
    // (the slope of the vein field, per millimetre, from its slope per pixel)
    vec2 dx = dFdx(vP), dy = dFdy(vP);
    float det = dx.x * dy.y - dx.y * dy.x;
    vec2 gs = vec2(dFdx(vf.g), dFdy(vf.g));
    if (abs(det) > 1e-9) bump -= clamp(vec2(dy.y * gs.x - dx.y * gs.y, dx.x * gs.y - dy.x * gs.x) / det, -1.2, 1.2) * 0.09;
  }
#endif
  vec3 Nm = normalize(Nf + (vTx * bump.x + vTy * bump.y) * face);
  float NdV = abs(dot(Nm, V));

  // ---- membrane. Two separate things: what it takes away from what is behind it (next to nothing: 2 % face-on, a
  // sixth edge-on), and what it adds — the room mirrored in a film that colours the mirror image, never the glass.
  // (A glasswing's membrane is the least reflective thing in nature: 1 % face-on, and little until it is well turned.
  // Window glass gives back 8 %, and a wing that did would be a grey sheet in front of anything dark.)
  float graze = pow(1.0 - NdV, 3.0);
  float F = 0.011 + 0.33 * pow(1.0 - NdV, 4.5);
  vec3 R = reflect(-V, Nm);
  vec3 env = bfEnv(vWorld, R, 0.2);
  // (its colours run in bands round each cell, and slide across it as the wing turns: the colour goes with the angle too)
  vec3 film = bfFilmCol(bfFilm(vP, vf.g, wr, n1.r, seed) * sqrt(1.0 - (1.0 - NdV * NdV) / 2.25));
  // (full colour when half turned; edge-on the film is a silver sheen with a quarter of it — foil is what full colour
  // at a grazing angle looks like)
  vec3 tint = mix(vec3(1.0), film * 1.3, 0.85 * mix(0.25, 1.0, smoothstep(0.05, 0.36, NdV)));
  vec3 mem = env * F * tint;
  vec3 H = normalize(BF_SUN_DIR + V);
  float nh = abs(dot(Nm, H));
  float sideL = smoothstep(-0.05, 0.05, ndl);
  // the key light in the film: a hot core, a bloom of the film's colour round it, a wide faint wash beyond that
  mem += sun * (exp(-(1.0 - nh) * 3000.0) * 3.0 + (exp(-(1.0 - nh) * 260.0) * 0.3 + exp(-(1.0 - nh) * 26.0) * 0.025) * tint) * (0.03 + 0.75 * graze) * sideL;
  // lit from behind, the little the membrane holds — its own grain — glows
  float fwd = pow(backlit, 5.0);
  mem += sun * fwd * (0.7 + 0.6 * max(-ndl, 0.0)) * (0.005 + 0.014 * n1.g * n2.g);
  mem *= 1.0 - 0.8 * vFar;
  float aMem = 0.02 + 0.15 * graze;
#ifdef BF_SCENE
  {
    // …and what blown glass does to what is seen through it: it lends it a breath of its own colour. Never a shade:
    // the colour is given at the brightness of what is behind (glass that darkens what it shows is tinted plastic).
    // Most when the film is half turned from the eye; face-on a whisper; edge-on next to none (full colour at a
    // grazing angle is what foil looks like). What is behind is
    // multiplied by (1 + ta (thr - 1)): the part of that below 1 is taken as coverage, the part above it is added.
    vec3 thr = film / dot(film, vec3(0.25, 0.62, 0.13));
    float mn = min(thr.r, min(thr.g, thr.b));
    // (and less on a small animal: there the bands have run together, and a wing of one colour is a tinted wing)
    float ta = (0.17 + 0.36 * smoothstep(1.0, 0.62, NdV) * smoothstep(0.14, 0.5, NdV)) * (0.25 + 0.75 * smoothstep(0.02, 0.3, NdV)) * (1.0 - 0.8 * vFar) * (0.55 + 0.45 * smoothstep(0.4, 0.12, px));
    // (but not where it is its own body that is behind this part of the wing: the picture of the scene has no insect
    // in it, and the body is black. A wing in front of the body is the only kind this is drawn for — one behind it
    // fails the depth test — so it is enough to ask how near the line of sight passes to the body's axis.)
    vec3 bA = vBodyO.xyz - vBodyF * (11.6 * vBodyO.w) - vWorld, bB = vBodyF * (16.4 * vBodyO.w);
    bA -= V * dot(V, bA); bB -= V * dot(V, bB);
    float clearOf = smoothstep(1.1, 2.1, length(bA + bB * clamp(-dot(bA, bB) / max(dot(bB, bB), 1e-12), 0.0, 1.0)) / vBodyO.w);
    mem += min(textureLod(tBfScene, gl_FragCoord.xy / uBfRes, 0.0).rgb, vec3(8.0)) * ta * (thr - mn) * clearOf;
    aMem += ta * (1.0 - mn) * clearOf;
  }
#endif

  vec3 col = mem; float alpha = aMem;
  // ---- pigment (most of a glasswing's wing has none: only where there is a vein or a scale is any of this worked out)
  if (species > 0.5 || pg.x + pg.y > 0.004) {
  // (scales are translucent: besides the light on their far face, they are tinted by whatever is bright behind them
  // along the line of sight — the picture of the scene if the world gave one, else what the rig says is out there)
#ifdef BF_SCENE
  vec3 behind = min(textureLod(tBfScene, gl_FragCoord.xy / uBfRes, 3.5).rgb, vec3(6.0));
#else
  vec3 behind = bfEnv(vWorld, -V, 0.7);
#endif
  // both faces are lit; whatever is behind comes through coloured
  vec3 ambF = bfAmb(vWorld, Nf), ambB = bfAmb(vWorld, -Nf);
  vec3 front = ambF + sun * max(ndl, 0.0) * 0.5;
  vec3 back = ambB * 0.55 + behind * 0.9 + sun * (max(-ndl, 0.0) * 0.3 + fwd * 0.35);

  // veins: glossy tubes. The highlight of a tube is a line across the light — where the vein runs square to the
  // half-vector — so it lies along a length of the vein as a soft warm sheen, and travels along it as the wing turns
  float vd = (vf.r - 0.5) * ${f(2 * RG)};
  float round_ = clamp(vd / 0.05 + 0.4, 0.0, 1.0);
  vec2 td = bfVeinDir(vf);
  // (no vein is quite straight: it wavers with the film it stands on)
  vec3 Tv = normalize(vTx * td.x + vTy * td.y + Nf * (0.16 * sin(vP.x * 0.37 + vP.y * 0.29 + seed * 5.0) + (wr - 0.5) * 0.1));
  // (a tube stands proud of both faces of the film: with the light behind the wing it is the tube's rim that catches
  // it, along the same line — so the light is taken as its mirror image in the wing)
  vec3 Hf = normalize(BF_SUN_DIR - 2.0 * min(ndl, 0.0) * Nf + V);
  float tH = dot(Tv, Hf);
  vec3 veinC = vec3(0.011, 0.009, 0.008) * front * (0.5 + 0.7 * round_) + vec3(0.09, 0.035, 0.012) * back * 0.02;
  // (a third of what it was, a wider lobe, and none at all once a vein is thinner than a pixel: a white dash across a
  // small wing reads as a scratch)
  veinC += env * 0.06 * round_ + sun * exp(-tH * tH * 240.0) * (0.6 + 0.4 * sideL) * 0.085 * smoothstep(0.3, 0.1, px);

  // border scales
  float shade = 1.0 + fine * (-0.5 + 0.62 * sc.x + 0.4 * smoothstep(0.16, 0.0, sc.w) * step(0.01, sc.x));
  // (never the same from one scale to the next; and velvet is never one value even where no scale can be told)
  float vary = mix(sc.y, 0.5, lod), vary2 = mix(sc.z, 0.5, lod);
  float grain = 0.8 + 0.4 * n2.b;
  float white = pg.z;
  // (edge-on, the band is a dark line: light does not come through a scale along its length)
  float eK = band.x * smoothstep(0.03, 0.26, ndv0);
  float heat = band.y;
  vec3 emberT = mix(vec3(1.0, 0.5, 0.07), vec3(0.6, 0.035, 0.012), heat);
  // (lit from the front it is a deep burnt orange, not paint: it is the light THROUGH it that makes it an ember)
  vec3 emberA = mix(vec3(0.25, 0.075, 0.01), vec3(0.1, 0.009, 0.006), heat);
  vec3 scAlb = mix(vec3(0.0095, 0.0075, 0.0075) * (0.6 + 0.8 * vary2), emberA * (0.75 + 0.5 * vary), eK) * grain;
  vec3 scTrans = mix(vec3(0.01, 0.004, 0.003), emberT * (0.72 + 0.56 * vary), eK);
  // white scales: warm pearl, one hue, a little uneven; with the light behind them they glow like milk glass
  scAlb = mix(scAlb, vec3(0.66, 0.64, 0.585) * (0.88 + 0.24 * vary2) * (0.9 + 0.2 * n2.b), white);
  scTrans = mix(scTrans, vec3(1.0, 0.94, 0.82), white);
  vec3 scC = scAlb * front * shade + scTrans * back * mix(0.68, 0.86, white) * (0.6 + 0.4 * shade);
  // (the ember keeps its colour however hard it is lit: it deepens, it does not bleach to peach)
  scC /= 1.0 + 0.7 * max(scC.r - 0.7, 0.0) * eK;
  if (pg.y > 0.004) {
    float blackK = (1.0 - white) * (1.0 - eK);
    float fall0 = 1.0 - ndv0;
    // velvet: the black shows its pile where light rakes across it
    scC += vec3(0.02, 0.018, 0.018) * blackK * fall0 * fall0 * smoothstep(0.0, 0.2, ndv0) * (ambF + ambB + sun * 0.3);
    // …and a structural sheen, the one cold note on the animal: blue-violet, in the key's highlight and faintly in
    // whatever the wing mirrors. Pearl on the white.
    float nhf = abs(dot(Nm, Hf));
    scC += mix(vec3(0.045, 0.07, 0.19), vec3(0.2, 0.24, 0.3), white) * (1.0 - eK) * grain * (sun * pow(nhf, 26.0) * 0.22 + env * 0.1);
    // sparks: every scale lies a little differently, and the few that face the light just so flash. Copper-gold on
    // the ember, where almost all of them are; a rare cold one on the black; white on the white.
    // (taken a scale at a time up close, a pixel at a time from far off: the border glints at any size)
    float cs = max(0.17, 1.6 * px);
    vec2 cq = vP / cs;
    vec2 ci = floor(cq);
    vec2 hs = hash22(ci + seed * 17.0 + W * 7.0);
    vec3 Ns = normalize(Nf + (vTx * (hs.x - 0.5) + vTy * (hs.y - 0.5)) * 1.3);
    float spot = smoothstep(0.36, 0.08, length(fract(cq) - 0.5)) * step(0.7, hash12(ci * 1.37 + 3.1));
    vec3 sparkC = mix(mix(vec3(0.3, 0.42, 1.0), vec3(1.0, 0.62, 0.2), eK), vec3(1.0, 0.96, 0.88), white);
    float tight = mix(1100.0, 170.0, smoothstep(0.1, 0.4, px));
    scC += sparkC * spot * (eK + 0.6 * white + 0.1 * blackK) * (sun * pow(abs(dot(Ns, Hf)), tight) * 4.0 + (ambF + ambB) * pow(abs(dot(Ns, V)), 2600.0) * 1.2);
  }
  float aSc = mix(0.97, 0.86, white) * mute;

  if (species < 0.5) {
    col = mix(col, scC * aSc, pg.y); alpha = mix(alpha, aSc, pg.y);
    col = mix(col, veinC * 0.97 * mute, pg.x); alpha = mix(alpha, 0.97 * mute, pg.x);
  } else {
    // the others in the garden: the same wing, fully scaled. 1: an orange longwing, black veins and tips. 2: a white.
    float tipD = smoothstep(0.62, 0.86, vP.x / mix(29.5, 20.0, W.y) + 0.1 * (n1.g - 0.5));
    vec3 alb, tr;
    if (species < 1.5) {
      float dark = max(max(pg.x, pg.y), tipD * (1.0 - W.y));
      alb = mix(vec3(0.62, 0.19, 0.02), vec3(0.02, 0.012, 0.008), dark); tr = mix(vec3(1.0, 0.4, 0.06), vec3(0.2, 0.08, 0.03), dark);
      alb = mix(alb, vec3(0.7, 0.6, 0.4), pg.z * 0.8);
    } else {
      float dark = max(pg.x * 0.3, max(pg.y * 0.25, tipD * (1.0 - W.y) * 0.8));
      alb = mix(vec3(0.66, 0.64, 0.54), vec3(0.05, 0.045, 0.04), dark); tr = vec3(0.85, 0.8, 0.62);
    }
    col = alb * front * (0.85 + 0.3 * n2.g) + tr * alb * back * 1.6; alpha = 1.0;
  }
  }
#if PASS != 1
  if (species < 0.5) {
    // (a wing seen exactly edge-on is a hairline, and a faint one)
    float thin = 0.2 + 0.8 * smoothstep(0.0, 0.14, ndv0);
    col *= thin; alpha *= thin;
  }
#endif

#if PASS == 1
  if (alpha * inside < 0.5) discard;
  gl_FragColor = bfFinish(max(col / max(alpha, 0.5), 0.0), 1.0, vWorld);
#elif PASS == 2
  if (species > 0.5 || alpha > 0.5) discard;
  gl_FragColor = vec4(bfFinish(max(col, 0.0), 1.0, vWorld).rgb * inside, alpha * inside);
#else
  gl_FragColor = bfFinish(max(col, 0.0) * inside, alpha * inside, vWorld);
#endif
#endif
}`
);
const cache$1 = /* @__PURE__ */ new WeakMap();
function shaders$1(light) {
  let c = cache$1.get(light);
  if (!c) cache$1.set(light, c = { vertexShader: VERT(light), fragmentShader: FRAG(light) });
  return c;
}
const NO_LIGHT = { common: "", vertex: "", fragment: "" };
function makeWingMaterial({ pass = 0, lod = false, scene = false, light = NO_LIGHT, uniforms = {} }) {
  const defines = { PASS: pass };
  if (scene) defines.BF_SCENE = 1;
  if (lod) defines.LOD = 1;
  const premult = { blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor };
  const opts = pass === 0 ? { transparent: true, depthWrite: true, ...premult } : pass === 2 ? { transparent: true, depthWrite: false, ...premult, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor } : pass === 3 ? { depthTest: false, depthWrite: false } : pass === 4 ? { transparent: true, depthWrite: false, ...premult, blendSrc: THREE.SrcAlphaFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor } : {};
  return new THREE.ShaderMaterial({
    ...shaders$1(light),
    defines,
    uniforms: { ...light.uniforms || {}, ...uniforms },
    side: THREE.DoubleSide,
    ...opts
  });
}
function lattice(period, seed) {
  const n = period * period;
  const a = new Float32Array(n);
  let s = seed * 2654435761 >>> 0;
  for (let i = 0; i < n; i++) {
    s = s + 1831565813 >>> 0;
    let t = s;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    a[i] = ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
  return a;
}
function valueNoise(lat, period, x, y) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const fx = x - xi;
  const fy = y - yi;
  const ux = fx * fx * fx * (fx * (fx * 6 - 15) + 10);
  const uy = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
  const x0 = (xi % period + period) % period;
  const y0 = (yi % period + period) % period;
  const x1 = (x0 + 1) % period;
  const y1 = (y0 + 1) % period;
  const a = lat[y0 * period + x0];
  const b = lat[y0 * period + x1];
  const c = lat[y1 * period + x0];
  const d = lat[y1 * period + x1];
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}
function makeNoiseTexture(size = 256) {
  const data = new Uint8Array(size * size * 4);
  const octs = (base, seed, n) => Array.from({ length: n }, (_, i) => ({ p: base << i, lat: lattice(base << i, seed + i * 17) }));
  const lowO = octs(4, 11, 4);
  const hiO = octs(16, 53, 4);
  const white = lattice(size, 97);
  const CP = 16;
  const cx = lattice(CP, 131);
  const cy = lattice(CP, 173);
  const fb = (o, u, v) => {
    let s = 0;
    let a = 0.5;
    let n = 0;
    for (const k of o) {
      s += a * valueNoise(k.lat, k.p, u * k.p, v * k.p);
      n += a;
      a *= 0.5;
    }
    return s / n;
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x + 0.5) / size;
      const v = (y + 0.5) / size;
      const i = (y * size + x) * 4;
      data[i] = Math.max(0, Math.min(255, (fb(lowO, u, v) - 0.5) * 1.9 * 255 + 127.5));
      data[i + 1] = Math.max(0, Math.min(255, (fb(hiO, u, v) - 0.5) * 1.9 * 255 + 127.5));
      data[i + 2] = white[y * size + x] * 255;
      const px = u * CP;
      const py = v * CP;
      const ix = Math.floor(px);
      const iy = Math.floor(py);
      let f1 = 9;
      for (let j = -1; j <= 1; j++) {
        for (let k = -1; k <= 1; k++) {
          const gx = ((ix + k) % CP + CP) % CP;
          const gy = ((iy + j) % CP + CP) % CP;
          const dx = ix + k + cx[gy * CP + gx] - px;
          const dy = iy + j + cy[gy * CP + gx] - py;
          f1 = Math.min(f1, dx * dx + dy * dy);
        }
      }
      data[i + 3] = Math.min(255, Math.sqrt(f1) * 255);
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}
const v3 = (a) => `vec3(${a.map((x) => x.toFixed(3)).join(", ")})`;
const BODY_VERT = (L) => (
  /* glsl */
  `
${bodyVertexGLSL}
attribute float aRad;      // half-width of the part at this vertex (mm)
uniform vec2 uBfRes;       // size of the target being drawn into (px); (0, 0) = not known, draw things as thin as they are
varying vec3 vObj;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec4 vPart;
varying vec4 vLook;
varying float vSun;
varying vec3 vSunB;
varying vec2 vThin;        // half-width as drawn, half-width as it is (px); (0, 0) = not a hair
${hash}
${L.common}
${L.vertex}
void main(){
  mat4 m = bfModel();
  vec3 p = bfBody();
  vObj = p; vPart = aPart; vLook = BF_LOOK;
  vec4 wp = m * vec4(p, 1.0);
  vThin = vec2(0.0);
  bool hair = aPart.x > 5.5;
#ifdef BF_LIMBS
  const float LEAST = 0.8;
#else
  const float LEAST = 0.52;
#endif
  if (hair && aRad > 0.0 && uBfRes.y > 1.0) {
    // an antenna, a leg, a claw: hair-fine, but never thinner than a pixel (it would break up into dashes)
    float pxPerMm = projectionMatrix[1][1] * 0.5 * uBfRes.y / max((projectionMatrix * viewMatrix * wp).w, 1e-4) * length(m[0].xyz);
    float is = aRad * pxPerMm;
    float thin = LEAST / max(is, 1e-3);
    if (thin > 1.0) wp = m * vec4(p + normal * aRad * (thin - 1.0), 1.0);
    vThin = vec2(max(is, LEAST), is);
  }
  vWorld = wp.xyz;
  vNormal = normalize(mat3(m) * normal);
  vSun = bfSunVisV(wp.xyz);
  vSunB = BF_SUN_DIR * mat3(m);                  // the key light as the body sees it (not normalised)
  gl_Position = projectionMatrix * viewMatrix * wp;
#ifdef BF_LIMBS
  if (!hair) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
#endif
#ifdef BF_NO_LIMBS
  if (hair) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
#endif
}`
);
const BODY_FRAG = (L) => (
  /* glsl */
  `
precision highp float;
varying vec3 vObj;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec4 vPart;
varying vec4 vLook;
varying float vSun;
varying vec3 vSunB;
varying vec2 vThin;
uniform sampler2D tNoise;
uniform vec4 uSpots[${SPOTS.length}];
${hash}
${L.common}
${L.fragment}
#ifdef BF_EYE_MAP
uniform sampler2D tBfEye;      // what the eye has in front of it (any picture a world draws for it; linear HDR)
uniform float uBfEye;          // how much of it the eye holds, 0..1
// The eye as a small dark convex mirror with the whole picture in it, the way a bead of water holds a room: the middle
// of the picture in the middle of the dome, its edges gathered in toward the rim.
vec3 eyeGarden(vec3 n, float lod){
  vec3 r = reflect(vec3(0.0, 0.0, -1.0), normalize(mat3(viewMatrix) * n));
  vec2 uv = vec2(0.5) + r.xy * vec2(-0.42, 0.46);
  vec3 g = textureLod(tBfEye, clamp(uv, 0.01, 0.99), lod).rgb;
  // (a dark mirror keeps the picture and loses the glare: highlights are held back, and what is left is given the
  // contrast and the colour a wet black surface gives a reflection)
  float l = dot(g, vec3(0.3, 0.5, 0.2));
  g = g / (1.0 + 0.3 * l);
  l = dot(g, vec3(0.3, 0.5, 0.2));
  g = max(mix(vec3(l), g, 1.6), 0.0);
  return g * sqrt(g) * (0.7 + 1.5 * smoothstep(0.05, 0.9, l));
}
#endif
// ---- what the body hides from itself (body frame, mm)
// the sky, from its own creases: under the thorax among the hips, the neck, the waist, where a leg leaves the body
float bfBodyAO(vec3 P, vec4 part){
  float id = part.x, ao = 1.0;
  if (id < 0.5) {
    ao *= mix(1.0, 0.5, smoothstep(0.1, -1.5, P.z));
    ao *= 1.0 - 0.45 * exp(-pow((P.y - 3.05) / 0.45, 2.0)) - 0.4 * exp(-pow((P.y + 3.1) / 0.5, 2.0));
  } else if (id < 1.5) {
    ao *= 1.0 - 0.45 * (1.0 - smoothstep(0.0, 0.07, part.y));
  } else if (id < 2.5) {
    ao *= 1.0 - 0.4 * smoothstep(3.75, 3.1, P.y);
  } else if (id > 3.5 && id < 5.5) {
    ao *= 0.72;
  } else if (id > 6.5) {
    ao *= mix(0.5, 1.0, smoothstep(0.02, 0.3, part.y));
  }
  return ao;
}
// the key light, from the three big parts: each is an ellipsoid, and what it hides is soft-edged
float bfOcc(vec3 P, vec3 L, vec3 c, vec3 r){
  vec3 o = (c - P) / r, d = normalize(L / r);
  float t = dot(o, d);
  if (t < 0.0) return 0.0;
  return (1.0 - smoothstep(0.72, 1.15, length(o - d * t))) * smoothstep(0.0, 0.7, t);
}
float bfBodyShadow(vec3 P, vec3 L, float id){
  float s = 0.0;
  if (id > 0.5) s = max(s, bfOcc(P, L, vec3(0.0, -0.1, 0.25), vec3(1.52, 3.2, 1.62)));                // the thorax
  if (id < 0.5 || id > 1.5) s = max(s, bfOcc(P, L, vec3(0.0, -6.0, -0.05), vec3(0.82, 3.3, 0.88)));   // the front of the abdomen
  if (id < 1.5 || id > 3.5) s = max(s, bfOcc(P, L, vec3(0.0, 4.0, 0.18), vec3(1.25, 1.0, 1.05)));     // the head and its eyes
  return 1.0 - 0.92 * s;
}
void main(){
  int part = int(vPart.x + 0.5);
  float u = vPart.y, ang = vPart.z * 6.2831853;
  vec3 P = vObj;
  vec3 N = normalize(vNormal);
  vec3 V = normalize(cameraPosition - vWorld);
  float px = length(fwidth(P)) * 0.7;                       // mm per pixel
  vec4 n1 = texture2D(tNoise, P.xy * 0.19 + P.z * 0.11);
  vec4 n2 = texture2D(tNoise, P.yz * 1.9 + P.x * 1.3);
  float species = vLook.x;
  float white = 0.0;
  if (part == ${PART.THORAX} || part == ${PART.HEAD}) {
    for (int i = 0; i < ${SPOTS.length}; i++) {
      vec4 s = uSpots[i];
      // (a tuft of white scales, not a painted disc: its edge is soft and a little ragged)
      white = max(white, 1.0 - smoothstep(s.w - 0.07 - px, s.w + 0.05 + px, length(vec3(abs(P.x), P.yz) - s.xyz) + (n2.g - 0.5) * 0.09));
    }
  }
  vec3 dark = species > 1.5 ? vec3(0.07, 0.065, 0.06) : vec3(0.0105, 0.0095, 0.0105);
  vec3 pale = vec3(0.62, 0.61, 0.56);
  vec3 alb = dark; float rough = 0.6, fuzz = 0.0, gloss = 0.35;
  vec3 lucent = vec3(0.0);                                   // what comes through it when the light is behind
  bool eye = false;
  if (part == ${PART.THORAX}) {
    alb = mix(dark, pale, white); fuzz = 1.0; rough = 0.95; gloss = 0.0;
  } else if (part == ${PART.ABDOMEN}) {
    // black above; underneath a soft grey-buff that comes up over the flank with no line between the two; the joints
    // are hairlines a shade darker. Matt: seen from above it stays black whatever the light does.
    float sa = sin(ang);
    float belly = smoothstep(0.0, -0.95, sa);
    float fs = fract(u * ${ABDOMEN.segments.toFixed(1)});
    alb = mix(dark * 1.2, vec3(0.032, 0.03, 0.027) * (0.85 + 0.3 * n2.g), belly * belly);
    alb = mix(alb, vec3(0.085, 0.08, 0.07), 0.45 * smoothstep(0.12, 0.03, abs(sa + 0.45)) * (1.0 - smoothstep(0.55, 0.95, u)));   // a faint paler line low on each flank
    alb *= 1.0 - 0.22 * smoothstep(0.06, 0.0, min(fs, 1.0 - fs)) * smoothstep(0.2, 0.04, px);                        // the joint between two segments
    fuzz = 0.5 * (1.0 - smoothstep(0.0, 0.3, u)) + 0.12; rough = 0.8; gloss = 0.02;
  } else if (part == ${PART.HEAD}) {
    alb = mix(dark, pale, white); fuzz = 0.8; rough = 0.9; gloss = 0.0;
  } else if (part == ${PART.EYE}) {
    eye = true;
  } else if (part == ${PART.PALP}) {
    alb = mix(dark, pale * 0.6, smoothstep(-0.3, -0.85, sin(ang)) * 0.5); fuzz = 0.6; rough = 0.9; gloss = 0.0;
  } else if (part == ${PART.TONGUE}) {
    // the tongue: two half-tubes zipped together down the middle (a seam on the outside of the coil), ringed like a hose
    float ring = cos(u * 150.0 * 6.2831853);
    float zip = smoothstep(0.16, 0.02, abs(sin(ang * 0.5 + 0.785)));
    alb = vec3(0.075, 0.034, 0.014) * (0.7 + 0.3 * ring * smoothstep(0.05, 0.012, px)) * (1.0 - 0.7 * zip); rough = 0.2; gloss = 0.9;
    N = normalize(N + normalize(dFdx(P) * dFdx(u) + dFdy(P) * dFdy(u) + 1e-6) * sin(u * 150.0 * 6.2831853) * 0.35 * smoothstep(0.05, 0.012, px));
  } else if (part == ${PART.ANTENNA}) {
    float ring = mix(1.0, 0.75 + 0.25 * smoothstep(0.1, 0.3, abs(fract(u * 60.0) - 0.5)), smoothstep(0.03, 0.012, px));
    // the club: pale orange, a little translucent, darker at the very tip
    float club = smoothstep(${(CLUB - 0.02).toFixed(3)}, ${(CLUB + 0.08).toFixed(3)}, u);
    vec3 clubC = mix(vec3(0.82, 0.4, 0.07), vec3(0.5, 0.17, 0.03), smoothstep(0.93, 1.0, u));
    // (thinner than a pixel it has no highlight to show: only its own colour)
    alb = mix(vec3(0.012, 0.01, 0.009), clubC, club) * ring; rough = mix(0.35, 0.5, club); gloss = mix(0.25, 0.5, club) * smoothstep(0.09, 0.025, px);
    lucent = clubC * club * 0.7;
  } else {
    // legs: dark, with a line of pale scales down the outside of femur and tibia; spines; a ringed foot
    float outer = smoothstep(0.8, 0.99, sin(ang)) * step(u, 0.72) * step(0.1, u);
    alb = mix(vec3(0.016, 0.013, 0.012), vec3(0.3, 0.29, 0.26), outer * 0.6);
    alb *= 0.8 + 0.4 * n1.g;
    // the joints: a paler collar of membrane at the knee and at the heel
    alb = mix(alb, vec3(0.09, 0.075, 0.06), 0.6 * max(exp(-pow((u - 0.4) / 0.014, 2.0)), exp(-pow((u - 0.72) / 0.012, 2.0))));
    if (u > 0.72) alb *= 0.7 + 0.3 * smoothstep(0.1, 0.3, abs(fract((u - 0.72) / 0.28 * 5.0) - 0.5));
    if (vPart.w < -1.5) { alb = mix(dark * 1.6, pale * 0.7, smoothstep(0.2, 0.8, sin(ang))); fuzz = 0.6; }
    rough = 0.42; gloss = 0.5 * smoothstep(0.16, 0.05, px);
  }
  if (species > 0.5 && species < 1.5 && part == ${PART.ABDOMEN}) alb = mix(alb, vec3(0.5, 0.2, 0.03), 0.5);

  vec3 sun = BF_SUN_COL * vSun;
  vec3 col;
  float NdV = max(dot(N, V), 0.0);
  vec3 H = normalize(BF_SUN_DIR + V);
  if (eye) {
    // ---- the compound eye: a dome of hexagonal facets, each the lens of one ommatidium
    vec3 c = vec3(sign(P.x) * ${EYE[0].toFixed(3)}, ${EYE[1].toFixed(3)}, ${EYE[2].toFixed(3)});
    vec3 d = normalize((P - c) / ${v3(EYE_R)});
    vec2 e = vec2(d.y, d.z) / (1.0 + abs(d.x));
    const float S = 44.0;
    vec2 h = e * S;
    vec2 r = vec2(1.0, 1.7320508);
    vec2 a = mod(h, r) - r * 0.5, b = mod(h - r * 0.5, r) - r * 0.5;
    vec2 g = dot(a, a) < dot(b, b) ? a : b;                 // where this pixel is within its facet
    vec2 fid = h - g;                                       // which facet
    vec2 ag = abs(g);
    float fd = max(ag.x, ag.x * 0.5 + ag.y * 0.8660254) * 2.0;     // 0 in the middle of the hexagon … 1 on its edge
    float fpx = length(fwidth(h));
    float lodE = smoothstep(0.7, 0.2, fpx);                 // the facets can be told apart
    float big = smoothstep(0.1, 0.025, fpx);                // …and each is many pixels wide (the lens is on the eye)
    float fr = hash12(fid + 7.0);
    vec3 t1 = normalize(cross(N, vec3(0.0, 1.0, 0.0))), t2 = cross(N, t1);
    // each lens is a small dome of its own, flattening toward the seam it shares with its neighbours
    vec3 Ne = normalize(N + (t1 * g.x + t2 * g.y) * mix(0.5, 0.95, big) * lodE);
    float seam = smoothstep(mix(0.74, 0.86, big), 1.0, fd) * lodE;
    // the pseudopupil: the facets that look straight back down the lens swallow its light, and so the dark spot
    // follows the viewer round the eye. Six fainter ones ring it. Its edge is made of whole facets.
    vec3 Nv = mat3(viewMatrix) * N;
    // (from too far off to tell the facets it is a soft round shadow, not a block)
    float pp = smoothstep(mix(0.86, 0.945, lodE), 0.992, NdV + (fr - 0.5) * 0.012 * lodE) * mix(0.75, 1.0, lodE);
    float six = 0.5 + 0.5 * cos(6.0 * atan(Nv.y, Nv.x));
    pp = max(pp, smoothstep(0.035, 0.0, abs(NdV - 0.86)) * smoothstep(0.4, 0.9, six) * 0.5);
    vec3 amb = bfAmb(vWorld, N);
    // dark amber, deeper where the light has to come a long way through it; no two lenses quite the same
    vec3 base = vec3(0.04, 0.016, 0.008) * (0.7 + 0.6 * n1.g) * (0.82 + 0.36 * fr * lodE);
    col = base * (amb + sun * max(dot(N, BF_SUN_DIR), 0.0) * 0.5) * (0.7 + 0.5 * (1.0 - fd * fd) * lodE);
    col += vec3(0.1, 0.035, 0.01) * bfAmb(vWorld, -V) * pow(1.0 - NdV, 2.0) * 0.1;
    col *= (1.0 - 0.9 * pp) * (1.0 - 0.75 * seam);
    // every facet is a lens with the world in it
    vec3 Re = reflect(-V, Ne);
    float Fe = 0.05 + 0.22 * pow(1.0 - NdV, 5.0);
    vec3 envE = bfEnv(vWorld, Re, 0.02);
    // (and the one broad soft light a dark eye is always photographed with, taken as a single pale sheet above and a
    // little to one side of the lens: across the dome it is one soft patch, and in that patch every lens has its own
    // small bright copy of it)
    vec3 Kv = normalize(vec3(-0.45, 0.62, 0.64));
    vec3 Nve = mat3(viewMatrix) * Ne;
    float key = pow(max(dot(Nve, Kv), 0.0), 14.0);
    float glint = pow(max(dot(Nv, Kv), 0.0), 5.0) * pow(max(dot(Nve, Kv), 0.0), 90.0) * 5.0 * lodE;
    // (from too far off to tell the facets apart that patch is one clean catch-light: the point of life in a dark eye.
    // It stays where the light is, so it moves over the eye as the head turns)
    glint += pow(max(dot(Nv, Kv), 0.0), 60.0) * 7.0 * (1.0 - lodE);
    envE += bfEyeKey() * (key + glint);
#ifdef BF_EYE_MAP
    if (uBfEye > 0.001) {
      // the lens is close enough to see what the eye holds. Across the dome, softly, the whole picture as a dark
      // mirror has it; and in every facet the same picture again, small and complete, each from where that facet stands
      vec3 whole = eyeGarden(normalize(mix(N, Ne, 0.3)), 0.0);
      vec3 each = eyeGarden(Ne, 0.5);
      vec3 gdn = mix(whole * 0.8 + each * 0.35, whole * 0.3 + each * 1.0, big) * (0.9 + 0.2 * fr);
      float wg = uBfEye * (1.0 - 0.8 * pp);
      envE = mix(envE, gdn + bfEyeKey() * glint * 0.6, wg);
      Fe = mix(Fe, 0.8 + 0.2 * pow(1.0 - NdV, 3.0), wg);
      col *= 1.0 - 0.55 * wg;                                // (a mirror shows its own colour less)
      col += vec3(0.03, 0.011, 0.003) * (amb + bfEyeKey() * 0.4) * (1.0 - pp) * (0.5 + 0.5 * (1.0 - fd * fd)) * uBfEye;   // amber from inside
    }
#endif
    col += envE * Fe * (1.0 - 0.7 * seam);
    col += sun * (exp(-(1.0 - max(dot(Ne, H), 0.0)) * 900.0) * 14.0 + exp(-(1.0 - max(dot(N, H), 0.0)) * 60.0) * 0.25) * step(0.0, dot(N, BF_SUN_DIR));
  } else {
    float ao = bfBodyAO(P, vPart);
    sun *= bfBodyShadow(P, vSunB, vPart.x);
    // (under the pile the skin is not smooth either: scales, lying back along the body like the fur above them)
    vec4 n3 = texture2D(tNoise, vec2(ang * 1.7, P.y * 0.45) + P.x * 0.07);
    float pile = fuzz * smoothstep(0.12, 0.02, px);
    alb *= 1.0 + pile * (n3.g * 1.1 - 0.55);
    N = normalize(N + (vec3(n3.r, n3.a, n3.g) - 0.5) * 0.7 * pile);
    float ndl = dot(N, BF_SUN_DIR);
    float wrap = mix(max(ndl, 0.0), max((ndl + 0.6) / 1.6, 0.0), fuzz);
    vec3 amb = bfAmb(vWorld, N) * ao;
    col = alb * (amb + sun * wrap * 0.5);
    // velvet: the pile only shows where light rakes across it — a pale edge, lit by whatever is bright beside and behind
    // (it is what draws the body's outline when the body is black and so is what it sits on)
    float rim = pow(1.0 - NdV, 2.6);
    float back = pow(max(dot(-V, BF_SUN_DIR), 0.0), 3.0);
    vec3 beside = bfAmb(vWorld, normalize(N - V * 0.85)) * mix(ao, 1.0, 0.5);
    // (a rim is light from beside that is not also coming from the lens's side: in a room that is bright all round
    // black velvet has no rim, it is black)
    vec3 rimL = max(beside - bfAmb(vWorld, V) * 0.8, 0.0) + beside * 0.2;
    col += fuzz * rim * (alb * 0.9 + vec3(0.05, 0.047, 0.048)) * (rimL * 0.9 + sun * (0.2 + 1.6 * back) * smoothstep(-0.7, 0.2, ndl));
    col += lucent * (bfAmb(vWorld, -N) * 0.5 + sun * (max(-ndl, 0.0) * 0.3 + back * 0.4));
    // chitin
    vec3 Nb = normalize(N + (vec3(n2.r, n2.g, n2.a) - 0.5) * 0.25 * rough);
    vec3 R = reflect(-V, Nb);
    float F = 0.04 + 0.96 * pow(1.0 - max(dot(Nb, V), 0.0), 5.0);
    col += bfEnv(vWorld, R, 0.05 + rough * 0.4) * F * gloss * mix(ao, 1.0, 0.4);
    float a2 = pow(max(rough, 0.12), 4.0);
    float nh = max(dot(Nb, H), 0.0);
    float dd = nh * nh * (a2 - 1.0) + 1.0;
    col += sun * (a2 / (3.14159 * dd * dd)) * max(ndl, 0.0) * 0.06 * gloss;
  }
#ifdef BF_LIMBS
  // a hair: its outline fades over a pixel, and where it is drawn wider than it is, it is as faint as it is thin
  float across = sqrt(max(1.0 - pow(dot(normalize(vNormal), V), 2.0), 0.0));       // 0 on its middle line … 1 on its outline
  float cov = clamp(vThin.x * (1.0 - across) + 0.2, 0.0, 1.0) * clamp(2.0 * vThin.y / max(0.9 * vThin.x, 1e-3), 0.34, 1.0);
  gl_FragColor = bfFinish(max(col, 0.0) * cov, cov, vWorld);
#else
  gl_FragColor = bfFinish(max(col, 0.0), 1.0, vWorld);
#endif
}`
);
const FUR_VERT = (L) => (
  /* glsl */
  `
attribute vec3 aTip;
attribute vec4 aHair;      // 0 root … 1 tip, ±1 across, random, white
uniform vec2 uBfRes;           // size of the target being drawn into (px)
varying vec4 vHair;
varying vec3 vWorld;
varying vec3 vDir;
varying float vAlpha;
varying float vSun;
${hash}
${L.common}
${L.vertex}
void main(){
  vec4 wr = modelMatrix * vec4(position, 1.0);
  vec4 wt = modelMatrix * vec4(position + aTip, 1.0);
  // (a hair is not straight: it lies back a little more toward its tip)
  vec3 wp = mix(wr.xyz, wt.xyz, aHair.x);
  mat4 pv = projectionMatrix * viewMatrix;
  vec4 c0 = pv * wr, c1 = pv * wt, cp = pv * vec4(wp, 1.0);
  vec2 dir = (c1.xy / c1.w - c0.xy / c0.w) * uBfRes;
  dir = normalize(dir + vec2(1e-4, 0.0));
  float mm = length(modelMatrix[0].xyz);                           // metres per millimetre of the model
  float pxPerMm = projectionMatrix[1][1] * 0.5 * uBfRes.y / max(cp.w, 1e-4) * mm;
  float w = 0.0085 * (1.0 - 0.8 * aHair.x) * pxPerMm;              // half-width in pixels: a hair is 17 µm thick at its root
  float use = max(w, 0.7);
  // (thinner than a pixel it is drawn a pixel wide and faint — but never so faint that the coat disappears)
  vAlpha = min(1.0, sqrt(w / use) * 0.75) * smoothstep(5.0, 8.0, pxPerMm);     // (a hair under two pixels long is not fur, only velvet: Glasswing.sort() stops drawing the coat there)
  cp.xy += vec2(-dir.y, dir.x) * aHair.y * use * 2.0 / uBfRes * cp.w;
  vHair = aHair; vWorld = wp; vDir = normalize(wt.xyz - wr.xyz);
  vSun = bfSunVisV(wr.xyz);
  gl_Position = cp;
}`
);
const FUR_FRAG = (L) => (
  /* glsl */
  `
precision highp float;
varying vec4 vHair;
varying vec3 vWorld;
varying vec3 vDir;
varying float vAlpha;
varying float vSun;
${hash}
${L.common}
${L.fragment}
void main(){
  float a = (1.0 - vHair.y * vHair.y) * vAlpha * (1.0 - 0.5 * vHair.x);
  if (a < 0.01) discard;
  vec3 V = normalize(cameraPosition - vWorld);
  vec3 alb = mix(vec3(0.015, 0.013, 0.014) * (0.4 + 1.2 * vHair.z), vec3(0.62, 0.61, 0.56), vHair.w) * (0.3 + 0.7 * vHair.x);
  // a hair is a cylinder: it is lit across its axis, and scatters forward when the light is behind it
  vec3 T = vDir;
  float sinTL = sqrt(max(1.0 - dot(T, BF_SUN_DIR) * dot(T, BF_SUN_DIR), 0.0));
  float back = pow(max(dot(-V, BF_SUN_DIR), 0.0), 4.0);
  vec3 Nh = normalize(V - T * dot(V, T));
  // (light from the lens's side, and light from the side the hair grows toward: the second is what rims the body)
  vec3 col = alb * (bfAmb(vWorld, Nh) * 0.55 + bfAmb(vWorld, T) * 0.75 + BF_SUN_COL * vSun * sinTL * (0.22 + 2.6 * back) * (0.4 + 0.6 * vHair.x));
  // and whatever is bright behind it comes through the tip
  vec3 tint = mix(vec3(0.2, 0.15, 0.12), vec3(0.85, 0.82, 0.74), vHair.w);
  float through = pow(max(dot(-V, BF_SUN_DIR), 0.0), 2.0);
  col += tint * (bfAmb(vWorld, normalize(T - V)) * 0.2 + BF_SUN_COL * vSun * through * 0.16) * (0.15 + 0.85 * vHair.x * vHair.x);
  gl_FragColor = bfFinish(max(col, 0.0) * a, a, vWorld);
}`
);
const spots = () => SPOTS.map((s) => new THREE.Vector4(...s));
const cache = /* @__PURE__ */ new WeakMap();
function shaders(light) {
  let c = cache.get(light);
  if (!c) cache.set(light, c = { body: { vertexShader: BODY_VERT(light), fragmentShader: BODY_FRAG(light) }, fur: { vertexShader: FUR_VERT(light), fragmentShader: FUR_FRAG(light) } });
  return c;
}
function makeBodyMaterial({ light, eyeMap = false, limbs = null, uniforms = {} }) {
  const defines = eyeMap ? { BF_EYE_MAP: 1 } : {};
  if (limbs === "only") defines.BF_LIMBS = 1;
  else if (limbs === "none") defines.BF_NO_LIMBS = 1;
  return new THREE.ShaderMaterial({
    ...shaders(light).body,
    defines,
    uniforms: { ...light.uniforms || {}, ...uniforms, uSpots: { value: spots() } },
    // (the hairs are blended, premultiplied, over whatever is already there — and write depth, so wings sort against them)
    ...limbs === "only" ? { transparent: true, blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor } : {}
  });
}
function makeFurMaterial({ light, uniforms = {} }) {
  return new THREE.ShaderMaterial({
    ...shaders(light).fur,
    uniforms: { ...light.uniforms || {}, ...uniforms },
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor
  });
}
const SIDES = [
  [1, 0],
  [1, 1],
  [-1, 0],
  [-1, 1]
];
const _o = new THREE.Vector3();
const _ax = new THREE.Vector3();
const _ay = new THREE.Vector3();
const _c = new THREE.Vector3();
class Glasswing {
  /**
   * @param kit      from createButterflyKit
   * @param o.light  a light rig (light.js). Required.
   * @param o.detail 'high' (a lens can go right up to it: 128-spoke wings, 17 000-triangle body, 9 000 hairs),
   *                 'mid' (64-spoke wings, 900-triangle body, no fur), 'low' (all four wings in one draw, no single
   *                 scales: for one that is small in frame)
   * @param o.mode   'blend' | 'cutout' (see above)
   * @param o.scene  true: what is seen through a wing is drawn out of focus by the wing itself (the lens's own depth
   *                 of field cannot: to it the wing is one sharp surface). Needs uniforms tBfScene (the scene without
   *                 the insect, mipmapped, a = distance from the lens) and uBfLens. Without it: plain transparency.
   * @param o.eyeMap true: the eyes can hold a picture (uniforms tBfEye, uBfEye)
   * @param o.fur    default: only at 'high' in 'blend' mode
   * @param o.wings  [fore, hind] from kit.buildWings(…) to use instead of the detail level's (dense ones that crumple)
   * @param o.seed, o.wear  0..1 which individual this is; how worn its scales are
   * @param o.pose   another Glasswing's pose to share (its mirror image, its double)
   * @param o.species  0 glasswing, 1 an orange longwing, 2 a small white (the same animal, fully scaled)
   * @param o.order  renderOrder of the body; pre-pass +1, fur +5, antennae and legs +6, wings +10…+13 ('blend'); wings +1 ('cutout')
   * @param o.sheenOrder  renderOrder of the membrane's sheen in 'cutout' mode
   * @param o.uniforms  any of the kit's uniforms you would rather own, as shared { value } objects:
   *                 uBfRes, tBfScene, uBfLens, tBfEye, uBfEye, tNoise
   */
  constructor(kit, { light, detail = "high", mode = "blend", scene = false, eyeMap = false, fur = null, wings = null, seed = 0.37, wear = 0.6, species = 0, order = 0, sheenOrder = order + 20, pose = null, uniforms = {} } = {}) {
    if (!light) throw new Error("Glasswing: a light rig is required (see light.js: standardLight())");
    const parts = kit.parts(detail);
    const cutout = this.cutout = mode === "cutout";
    const low = detail === "low";
    this.group = new THREE.Group();
    this.group.matrixAutoUpdate = false;
    this.pose = pose || makePose();
    this.look = new THREE.Vector4(species, cutout ? 1 : 0, seed, wear);
    this.res = new THREE.Vector2(1920, 1080);
    this.lens = new THREE.Vector4(1, 0, 0, 0.075);
    const u = this.uniforms = {
      tVein: { value: kit.atlas.veins },
      tNoise: { value: kit.noise },
      ...poseUniforms(this.pose, this.look),
      uBfRes: { value: this.res },
      tBfScene: { value: null },
      uBfLens: { value: this.lens },
      /** scene option: how much of its disc of taps the pre-pass takes (1 all six … 0.34 two, softer; see wingMaterial.js pass 4) */
      uBfPre: { value: 1 },
      tBfEye: { value: null },
      uBfEye: { value: 0 },
      ...uniforms
    };
    this.mats = [];
    const mat = (pass) => {
      const m = makeWingMaterial({ pass, lod: low, scene: scene && !cutout, light, uniforms: u });
      this.mats.push(m);
      return m;
    };
    const add = (geo, material, ro) => {
      const mesh = new THREE.Mesh(geo, material);
      mesh.frustumCulled = false;
      mesh.renderOrder = ro;
      this.group.add(mesh);
      return mesh;
    };
    this.order = order;
    const split = cutout ? null : kit.split(detail);
    this.body = add(cutout ? parts.body : split.trunk, makeBodyMaterial({ light, eyeMap, limbs: cutout ? null : "none", uniforms: u }), order);
    this.mats.push(this.body.material);
    this.limbs = null;
    if (!cutout) {
      this.limbs = add(split.limbs, makeBodyMaterial({ light, limbs: "only", uniforms: u }), order + 6);
      this.mats.push(this.limbs.material);
    }
    if (low && !wings) this.geos = [parts.four];
    else {
      const w = wings || parts.wings;
      const left = wings ? wings.map((x, hind) => kit.mirror(x, hind)) : parts.left;
      this.geos = SIDES.map(([side, hind]) => side > 0 ? w[hind].geometry : left[hind]);
    }
    this.pre = null;
    this.fur = null;
    this.sheen = null;
    if (cutout) {
      const opaque = mat(1);
      const sheen = mat(2);
      this.wings = this.geos.map((g) => add(g, opaque, order + 1));
      this.sheen = this.geos.map((g) => add(g, sheen, sheenOrder));
    } else {
      if (scene) {
        const pre = mat(4);
        this.pre = this.geos.map((g) => add(g, pre, order + 1));
      }
      const all = mat(0);
      this.wings = this.geos.map((g) => add(g, all, order + 10));
    }
    if (fur ?? (!cutout && detail === "high")) {
      this.fur = add(kit.parts("high").fur, makeFurMaterial({ light, uniforms: u }), order + 5);
      this.mats.push(this.fur.material);
    }
    this._d = [0, 0, 0, 0];
    kit.ctx.track(this);
  }
  /**
   * @param pos thorax centre   @param right, fwd, up  unit axes of the body (fwd = toward the head, up = out of the back)
   * @param size 1 = life size when the world's unit is a metre (the model is in millimetres: a 59 mm wingspan)
   * A mirror image — its reflection in water — is the same call with pos and the three axes reflected.
   */
  place(pos, right, fwd, up, size = 1) {
    bodyMatrix(this.group.matrix, pos, right, fwd, up, size);
    this.group.matrixWorldNeedsUpdate = true;
  }
  setSize(width, height) {
    this.res.set(width, height);
  }
  /**
   * Far wings first: they are seen through the near ones. Call after place() and after the camera has moved.
   * @param showPre  draw the defocused scene behind the wings this frame? (pass false while the lens is closed)
   */
  sort(camera, showPre = true) {
    if (this.pre) for (const m2 of this.pre) m2.visible = showPre;
    const m = this.group.matrix;
    if (this.fur && camera.isPerspectiveCamera) {
      const e = m.elements;
      const c = camera.matrixWorld.elements;
      const dist = Math.hypot(e[12] - c[12], e[13] - c[13], e[14] - c[14]);
      this.fur.visible = camera.projectionMatrix.elements[5] * 0.5 * this.uniforms.uBfRes.value.y * Math.hypot(e[0], e[1], e[2]) / Math.max(dist, 1e-6) > 5;
    }
    if (this.cutout || this.wings.length < 4) return;
    const d = this._d;
    const w = this.pose.wings;
    for (let i = 0; i < 4; i++) {
      const [side, hind] = SIDES[i];
      wingFrame(side, hind, hind ? w.y : w.x, _o, _ax, _ay, this.pose.shape.y);
      _c.copy(_o).addScaledVector(_ax, hind ? 9 : 13).applyMatrix4(m);
      d[i] = _c.distanceToSquared(camera.position);
    }
    for (let i = 0; i < 4; i++) {
      let rank = 0;
      for (let j = 0; j < 4; j++) if (d[j] > d[i] || d[j] === d[i] && j < i) rank++;
      this.wings[i].renderOrder = this.order + 10 + rank;
    }
  }
  dispose() {
    for (const m of this.mats) m.dispose();
    this.mats.length = 0;
  }
}
const _m = new THREE.Matrix4();
class Flock {
  /**
   * @param kit    from createButterflyKit         @param count  how many
   * @param o.light  a light rig (light.js). Required.
   * @param o.order  renderOrder of both meshes
   */
  constructor(kit, count, { light, order = 0 } = {}) {
    if (!light) throw new Error("Flock: a light rig is required (see light.js: standardLight())");
    const parts = kit.parts("low");
    this.count = count;
    const wg = this.wingGeo = new THREE.InstancedBufferGeometry();
    for (const k of Object.keys(parts.four.attributes)) wg.setAttribute(k, parts.four.attributes[k]);
    wg.setIndex(parts.four.index);
    this.pose = new Float32Array(count * 4);
    this.looks = new Float32Array(count * 4);
    this.poseAttr = new THREE.InstancedBufferAttribute(this.pose, 4).setUsage(THREE.DynamicDrawUsage);
    this.lookAttr = new THREE.InstancedBufferAttribute(this.looks, 4).setUsage(THREE.DynamicDrawUsage);
    wg.setAttribute("aPose", this.poseAttr);
    wg.setAttribute("aLook", this.lookAttr);
    this.res = new THREE.Vector2(1920, 1080);
    const uniforms = { tVein: { value: kit.atlas.veins }, tNoise: { value: kit.noise }, uBfRes: { value: this.res } };
    this.wingMat = makeWingMaterial({ pass: 1, lod: true, light, uniforms });
    this.wings = new THREE.InstancedMesh(wg, this.wingMat, count);
    const bg = this.bodyGeo = new THREE.InstancedBufferGeometry();
    for (const k of Object.keys(parts.body.attributes)) bg.setAttribute(k, parts.body.attributes[k]);
    bg.setIndex(parts.body.index);
    bg.setAttribute("aLook", this.lookAttr);
    this.bodyMat = makeBodyMaterial({ light, uniforms });
    this.bodies = new THREE.InstancedMesh(bg, this.bodyMat, count);
    this.bodies.instanceMatrix = this.wings.instanceMatrix;
    this.group = new THREE.Group();
    for (const m of [this.wings, this.bodies]) {
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.frustumCulled = false;
      m.renderOrder = order;
      this.group.add(m);
    }
    for (let i = 0; i < count; i++) this.look(i, 0, 0, i * 0.618034 % 1);
    kit.ctx.track(this);
  }
  /**
   * Who instance i is. species: 0 glasswing, 1 orange longwing, 2 small white. landed: 1 = legs down, 0 = tucked
   * (flying). seed 0..1: which individual. wear 0..1.
   */
  look(i, species = 0, landed = 0, seed = 0.5, wear = 0.5) {
    this.looks.set([species, landed, seed, wear], i * 4);
    this.lookAttr.needsUpdate = true;
  }
  /**
   * Where instance i is and how its wings are. pos = thorax centre; right, fwd (toward the head), up (out of the
   * back) = unit axes; size 1 = life size (millimetre model in a metre world); fore, hind = stroke angles (rad,
   * 0 spread flat … 1.5 shut); flex = bend along the span. No allocation.
   */
  set(i, pos, right, fwd, up, size, fore, hind, flex = 0, twist = 0) {
    this.wings.setMatrixAt(i, bodyMatrix(_m, pos, right, fwd, up, size));
    const p = this.pose;
    p[i * 4] = fore;
    p[i * 4 + 1] = hind;
    p[i * 4 + 2] = twist;
    p[i * 4 + 3] = flex;
  }
  /** Pixels of the target the flock is drawn into. Optional: without it 1920 × 1080 is assumed. */
  setSize(width, height) {
    this.res.set(width, height);
  }
  /** Send this frame's set() calls to the GPU. */
  commit() {
    this.wings.instanceMatrix.needsUpdate = true;
    this.poseAttr.needsUpdate = true;
  }
  dispose() {
    this.wingGeo.dispose();
    this.bodyGeo.dispose();
    this.wingMat.dispose();
    this.bodyMat.dispose();
  }
}
const sstep$1 = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const hash1 = (n) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
const BEAT = 0.2;
const CYCLE = 1.9;
const TOP = 1.56;
const REST = 1.53;
const BOTTOM = -0.52;
const FLEX = 0.55;
const GLIDE = 0.5;
const stroke = (ph) => {
  ph -= Math.floor(ph);
  return ph < 0.44 ? 0.5 - 0.5 * Math.cos(Math.PI * ph / 0.44) : 0.5 + 0.5 * Math.cos(Math.PI * (ph - 0.44) / 0.56);
};
function wingbeat(t, out) {
  const c = Math.floor(t / CYCLE);
  const local = t - c * CYCLE;
  const beats = 4 + Math.floor(hash1(c) * 2.99);
  const burst = beats * BEAT;
  if (local < burst) {
    const b = Math.floor(local / BEAT);
    const ph = local / BEAT - b;
    const env = Math.min(1, Math.min(local / 0.07, (burst - local) / 0.09));
    const x = stroke(ph);
    const xh = stroke(ph - 0.045);
    out.fore = TOP - (TOP - BOTTOM) * x * env - (TOP - GLIDE) * (1 - env) * 0.9;
    out.hind = TOP - 0.08 - (TOP - 0.08 - BOTTOM * 0.92) * xh * env - (TOP - GLIDE) * (1 - env) * 0.9;
    const v = ph < 0.44 ? Math.sin(Math.PI * ph / 0.44) : -0.8 * Math.sin(Math.PI * (ph - 0.44) / 0.56);
    out.flex = 0.42 * v * env;
    out.twist = -0.26 * Math.sin((ph - 0.06) * 6.2832) * env;
    out.lift = env * 45e-4 * (x - 0.5) + 0.016 * sstep$1(0, burst, local);
    out.pitch = 0.11 * Math.sin((ph - 0.14) * 6.2832) * env;
    out.beating = env;
    out.index = c * 8 + b;
    out.phase = ph;
  } else {
    const g = (local - burst) / (CYCLE - burst);
    out.fore = GLIDE + 0.05 * Math.sin(t * 9);
    out.hind = GLIDE - 0.06 + 0.05 * Math.sin(t * 9 - 0.35);
    out.flex = 0.06;
    out.twist = 0;
    out.lift = 0.016 * (1 - g * g * (3 - 2 * g));
    out.pitch = -0.05 * Math.sin(g * Math.PI);
    out.beating = 0;
    out.index = -1;
    out.phase = 0;
  }
  return out;
}
function fanning(t, seed, out) {
  const a = 0.5 - 0.5 * Math.cos(t * 0.74 + seed * 9);
  const b = 0.5 + 0.5 * Math.sin(t * 0.31 + seed * 4);
  const open = a * a * (0.55 + 0.45 * b);
  out.fore = REST - 0.8 * open;
  out.hind = out.fore - 0.05 - 0.14 * open;
  return out;
}
const _beat = { fore: 0, hind: 0, flex: 0, twist: 0, lift: 0, pitch: 0, beating: 0, index: -1, phase: 0 };
const _fan = { fore: 0, hind: 0 };
function flightPose(pose, t, amount = 1) {
  const wb = wingbeat(t, _beat);
  const g = GLIDE + 0.1;
  pose.wings.set(g + (wb.fore - g) * amount, g - 0.06 + (wb.hind - g + 0.06) * amount, wb.twist * amount, wb.flex * amount * FLEX);
  pose.limbs.set(1, 0.12 - 0.4 * wb.pitch, 0.22, 0);
  pose.twitch.set(0, 0, 0, 0);
  for (const f2 of pose.feet) f2.set(0, 0, 0);
  return wb;
}
function restPose(pose, t, seed = 0.37, open = 1) {
  fanning(t, seed, _fan);
  pose.wings.set(REST + (_fan.fore - REST) * open, REST - 0.05 + (_fan.hind - REST + 0.05) * open, 0, 0);
  pose.limbs.set(0, 0.1, 0, 0.6 + 0.4 * Math.sin(t * 1.9 + seed * 7));
  for (let s = 0; s < 2; s++) {
    const n = t / 2.3 + s * 0.41 + seed;
    const ph = n - Math.floor(n);
    const v = Math.exp(-Math.pow((ph - 0.3) / 0.04, 2)) * (hash1(Math.floor(n) + s * 7) - 0.3) * 0.5 + 0.03 * Math.sin(t * 1.1 + s * 2);
    if (s === 0) pose.twitch.x = v;
    else pose.twitch.y = v;
  }
  return pose;
}
const UP = new THREE.Vector3(0, 1, 0);
function flightBasis(heading, pitch, roll, R, F, U) {
  F.copy(heading).multiplyScalar(Math.cos(pitch)).addScaledVector(UP, Math.sin(pitch));
  R.crossVectors(heading, UP).normalize();
  U.crossVectors(R, F);
  if (roll) {
    R.applyAxisAngle(F, roll);
    U.applyAxisAngle(F, roll);
  }
}
new THREE.Vector3();
function standardLight({ points = 0 } = {}) {
  const n = Math.min(4, Math.max(0, points | 0));
  const handles = {
    sunDir: new THREE.Vector3(0.4, 0.7, 0.5).normalize(),
    sunColor: new THREE.Vector3(4.2, 3.6, 2.8),
    sky: new THREE.Vector3(0.3, 0.38, 0.5),
    ground: new THREE.Vector3(0.08, 0.09, 0.06),
    bounce: new THREE.Vector3(0, 0, 0),
    fog: new THREE.Vector4(0.5, 0.55, 0.6, 0),
    points: Array.from({ length: n }, () => ({ position: new THREE.Vector3(0, -1e3, 0), color: new THREE.Vector3(0, 0, 0), reach: 1 }))
  };
  const pt = Array.from({ length: Math.max(n, 1) }, () => new THREE.Vector4(0, -1e3, 0, 1));
  const ptCol = Array.from({ length: Math.max(n, 1) }, () => new THREE.Vector3());
  const uniforms = {
    uBfSunDir: { value: handles.sunDir },
    uBfSunCol: { value: handles.sunColor },
    uBfSky: { value: handles.sky },
    uBfGround: { value: handles.ground },
    uBfBounce: { value: handles.bounce },
    uBfFog: { value: handles.fog },
    uBfEnvGain: { value: 1 },
    uBfPt: { value: pt },
    uBfPtCol: { value: ptCol }
  };
  const common = (
    /* glsl */
    `
uniform vec3 uBfSunDir, uBfSunCol;
#define BF_SUN_DIR uBfSunDir
#define BF_SUN_COL uBfSunCol
`
  );
  const vertex = (
    /* glsl */
    `
float bfSunVisV(vec3 P){ return 1.0; }
`
  );
  const fragment = (
    /* glsl */
    `
uniform vec3 uBfSky, uBfGround, uBfBounce;
uniform vec4 uBfFog;
uniform float uBfEnvGain;
uniform vec4 uBfPt[${Math.max(n, 1)}];
uniform vec3 uBfPtCol[${Math.max(n, 1)}];
vec3 bfAmb(vec3 P, vec3 N){
  vec3 a = mix(uBfGround, uBfSky, 0.5 + 0.5 * N.y) + uBfBounce * (0.5 - 0.5 * N.y);
  for (int i = 0; i < ${n}; i++) {
    vec3 d = uBfPt[i].xyz - P;
    float r2 = dot(d, d);
    float fall = 1.0 / (1.0 + r2 / (uBfPt[i].w * uBfPt[i].w * 0.04));
    fall *= clamp(1.0 - r2 / (uBfPt[i].w * uBfPt[i].w), 0.0, 1.0);
    a += uBfPtCol[i] * fall * (0.35 + 0.65 * max(dot(N, d) * inversesqrt(r2 + 1e-9), 0.0));
  }
  return a;
}
vec3 bfEnv(vec3 P, vec3 R, float soft){
  vec3 e = mix(uBfGround * 0.8, uBfSky * 1.5, smoothstep(-0.25 - soft, 0.5 + soft, R.y));
  // (the key light itself, as a soft disc: what puts a glint in a wing at night)
  e += BF_SUN_COL * 0.06 * pow(max(dot(R, BF_SUN_DIR), 0.0), mix(900.0, 12.0, soft));
  for (int i = 0; i < ${n}; i++) {
    vec3 d = uBfPt[i].xyz - P;
    float r2 = dot(d, d);
    e += uBfPtCol[i] * clamp(1.0 - r2 / (uBfPt[i].w * uBfPt[i].w), 0.0, 1.0) * pow(max(dot(R, d) * inversesqrt(r2 + 1e-9), 0.0), mix(200.0, 8.0, soft)) * 4.0;
  }
  return e * uBfEnvGain;
}
vec3 bfEyeKey(){ return uBfSky * 1.4 + BF_SUN_COL * 0.02; }
vec4 bfFinish(vec3 col, float a, vec3 P){
  float f = 1.0 - exp(-length(P - cameraPosition) * uBfFog.a);
  return vec4(mix(col, uBfFog.rgb * a, f), a);
}
`
  );
  const rig = {
    ...handles,
    uniforms,
    common,
    vertex,
    fragment,
    get envGain() {
      return uniforms.uBfEnvGain.value;
    },
    set envGain(v) {
      uniforms.uBfEnvGain.value = v;
    },
    /** Copy points[] into the uniforms. Call after moving a point light or changing its colour. No allocation. */
    update() {
      for (let i = 0; i < n; i++) {
        const p = handles.points[i];
        pt[i].set(p.position.x, p.position.y, p.position.z, p.reach);
        ptCol[i].copy(p.color);
      }
      return rig;
    }
  };
  return rig;
}
const DETAIL = {
  high: { spokes: 128, body: 1, fur: true },
  mid: { spokes: 64, body: 0, fur: false },
  low: { spokes: 28, body: 0, fur: false }
};
async function createButterflyKit(ctx, { detail = ["high"], noise = null, seed = 31 } = {}) {
  const track = (x) => ctx.track(x);
  const levels = {};
  const kit = {
    ctx,
    noise: noise || track(makeNoiseTexture(256)),
    atlas: null,
    /** [fore, hind] right wings as { geometry, outline, veins, centre } at your own resolution (see buildWing). */
    buildWings(opts = {}, wingSeed = seed) {
      const w = [buildWing(false, { ...opts, rnd: ctx.rng(wingSeed) }), buildWing(true, { ...opts, rnd: ctx.rng(wingSeed + 1) })];
      for (const x of w) track(x.geometry);
      return w;
    },
    /** The left twin of a right wing (shares its buffers). */
    mirror: (wing, hind) => track(mirrorWing(wing.geometry, hind)),
    /**
     * The meshes of a detail level: { wings: [fore, hind] (right side; .geometry), left: [fore, hind] geometries,
     * four: all four wings as one geometry, body, fur (high only) }. Cached; built on first use.
     */
    parts(level = "high") {
      if (levels[level]) return levels[level];
      const d = DETAIL[level];
      if (!d) throw new Error(`butterfly kit: unknown detail '${level}' (high | mid | low)`);
      const wings = level === "high" ? high : kit.buildWings({ spokes: d.spokes });
      const small = levels.mid || levels.low;
      const body = d.body === 0 && small ? small.body : track(buildBody(d.body));
      const fur = d.fur ? track(buildFur(ctx.rng(seed + 2))) : null;
      return levels[level] = { wings, left: wings.map((w, hind) => kit.mirror(w, hind)), four: track(fourWings(wings)), body, fur };
    },
    /** A level's body as { trunk, limbs }: two geometries over its buffers (see splitBody). Cached; a block of about a millisecond. */
    split(level = "high") {
      const p = kit.parts(level);
      if (!p.split) {
        p.split = splitBody(p.body);
        track(p.split.trunk);
        track(p.split.limbs);
      }
      return p.split;
    },
    glasswing: (opts) => new Glasswing(kit, opts),
    flock: (count, opts) => new Flock(kit, count, opts),
    /** Compile everything under `object` for `camera` without blocking (await it at the end of init). */
    compile: (object, camera) => ctx.renderer.compileAsync(object, camera)
  };
  const high = kit.buildWings({ spokes: 128 });
  await ctx.yield();
  kit.atlas = track(bakeWingAtlas(ctx.renderer, high, (hind, veins) => makeWingMaterial({ pass: 3, uniforms: { tVein: { value: veins }, tNoise: { value: kit.noise } } })));
  await ctx.yield();
  for (const level of detail) {
    if (level === "high") {
      const p = levels.high = { wings: high, left: high.map((w, hind) => kit.mirror(w, hind)), four: track(fourWings(high)), body: null, fur: null };
      await ctx.yield();
      p.body = track(buildBody(1));
      await ctx.yield();
      p.fur = track(buildFur(ctx.rng(seed + 2)));
    } else kit.parts(level);
    await ctx.yield();
  }
  return kit;
}
function pharmaLight() {
  const rig = standardLight({ points: 0 });
  rig.sunDir.set(0.35, 0.85, 0.4).normalize();
  rig.sunColor.set(2.6, 2.4, 2);
  rig.sky.set(0.42, 0.5, 0.45);
  rig.ground.set(0.12, 0.13, 0.08);
  rig.bounce.set(0.05, 0.06, 0.03);
  rig.uniforms.uBfExposure = { value: 0.9 };
  rig.fragment = rig.fragment.replace(
    /vec4 bfFinish\(vec3 col, float a, vec3 P\)\{[\s\S]*?\n\}/,
    /* glsl */
    `uniform float uBfExposure;
vec3 bfAces(vec3 x){
  x *= uBfExposure * 0.6;
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}
vec3 bfSrgb(vec3 c){
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c));
}
vec4 bfFinish(vec3 col, float a, vec3 P){
  vec3 c = col / max(a, 1e-4);
  return vec4(bfSrgb(bfAces(c)) * a, a);
}`
  );
  if (!/bfAces/.test(rig.fragment)) throw new Error("pharmaLight: bfFinish not found in the kit light rig");
  return rig;
}
const sstep = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
async function createButterflies(renderer, { plant = null, species = [0, 2], lite = false, size = 1.25, home = null } = {}) {
  const tracked = [];
  const ctx = {
    renderer,
    track: (x) => (tracked.push(x), x),
    yield: () => new Promise((r) => setTimeout(r, 0)),
    rng: (seed = 1) => mulberry32(seed)
  };
  const detail = lite ? "low" : "mid";
  const kit = await createButterflyKit(ctx, { detail: [detail], seed: 31 });
  const light = pharmaLight();
  const group = new THREE.Group();
  group.name = "papillons";
  const rnd = mulberry32(5);
  const animals = species.map((sp2, i) => {
    const seed = (0.37 + i * 0.618) % 1;
    const gw = kit.glasswing({ light, detail, mode: "blend", species: sp2, seed, wear: 0.3 + 0.4 * rnd(), order: 30 + i * 20 });
    group.add(gw.group);
    return {
      gw,
      seed,
      t0: rnd() * 40,
      pos: new THREE.Vector3(),
      vel: new THREE.Vector3(),
      heading: new THREE.Vector3(1, 0, 0),
      target: new THREE.Vector3(),
      state: "fly",
      until: 0,
      spot: -1,
      roll: 0,
      // where it rests: a fixed heading on the spot
      restFwd: new THREE.Vector3(),
      restUp: new THREE.Vector3(),
      restPos: new THREE.Vector3(),
      // blend into and out of the landing
      settle: 0
    };
  });
  const centre = new THREE.Vector3();
  const R = new THREE.Vector3();
  const F = new THREE.Vector3();
  const U = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  const sp = new THREE.Vector3();
  const spUp = new THREE.Vector3();
  const spFwd = new THREE.Vector3();
  const taken = /* @__PURE__ */ new Set();
  const camPos = { position: new THREE.Vector3(), isPerspectiveCamera: false };
  const res = new THREE.Vector2();
  let time = 0;
  const homePoint = (out) => {
    if (home) return out.copy(home);
    if (plant) {
      plant.group.getWorldPosition(out);
      return out.setY(out.y + 0.55);
    }
    return out.set(0, 1.3, -1);
  };
  const pickTarget = (a) => {
    homePoint(centre);
    const ang = rnd() * Math.PI * 2;
    const r = 0.18 + rnd() * 0.5;
    a.target.set(centre.x + Math.cos(ang) * r, centre.y - 0.15 + rnd() * 0.5, centre.z + Math.sin(ang) * r);
  };
  const freeSpot = () => {
    if (!plant || !plant.spots.length) return -1;
    for (let k = 0; k < 6; k++) {
      const i = Math.floor(rnd() * plant.spots.length);
      if (!taken.has(i)) return i;
    }
    return -1;
  };
  for (const a of animals) {
    homePoint(centre);
    a.pos.copy(centre).add(tmp.set(rnd() - 0.5, rnd() * 0.3, rnd() - 0.5));
    pickTarget(a);
    a.until = 4 + rnd() * 6;
  }
  function update(dt, t, cameraWorld) {
    time = t;
    if (cameraWorld) camPos.position.copy(cameraWorld);
    renderer.getDrawingBufferSize(res);
    for (const a of animals) {
      const lt = t + a.t0;
      a.until -= dt;
      if (a.state === "fly" || a.state === "approach") {
        if (a.state === "approach") {
          plant.spotWorld(a.spot, sp, spUp, spFwd);
          a.target.copy(sp).addScaledVector(spUp, 0.012);
        }
        tmp.subVectors(a.target, a.pos);
        const dist = tmp.length();
        const slow = a.state === "approach" ? sstep(0, 0.25, dist) : 1;
        const vmax = (0.07 + 0.25 * slow) * (a.state === "approach" ? 1 : 1);
        tmp.normalize().multiplyScalar(vmax);
        tmp.x += Math.sin(lt * 1.3 + a.seed * 9) * 0.07 * slow;
        tmp.y += Math.sin(lt * 2.1 + a.seed * 4) * 0.05 * slow;
        tmp.z += Math.cos(lt * 1.1 + a.seed * 7) * 0.07 * slow;
        a.vel.lerp(tmp, 1 - Math.exp(-dt * 2.2));
        a.pos.addScaledVector(a.vel, dt);
        if (a.state === "fly" && dist < 0.08) pickTarget(a);
        if (a.state === "fly" && a.until <= 0) {
          const s = freeSpot();
          if (s >= 0) {
            a.state = "approach";
            a.spot = s;
            taken.add(s);
          } else a.until = 3;
        }
        if (a.state === "approach" && dist < 0.02) {
          a.state = "rest";
          a.until = 7 + rnd() * 10;
          a.restPos.copy(a.pos);
          a.restUp.copy(spUp);
          a.restFwd.copy(spFwd).multiplyScalar(2).add(a.heading);
          a.restFwd.addScaledVector(spUp, -a.restFwd.dot(spUp)).normalize();
          a.settle = 0;
        }
        tmp.copy(a.vel).setY(0);
        if (tmp.lengthSq() > 1e-6) {
          tmp.normalize();
          const turn = a.heading.x * tmp.z - a.heading.z * tmp.x;
          a.roll += (THREE.MathUtils.clamp(-turn * 18, -0.5, 0.5) - a.roll) * (1 - Math.exp(-dt * 3));
          a.heading.lerp(tmp, 1 - Math.exp(-dt * 4)).normalize();
        }
        const wb = flightPose(a.gw.pose, lt, 1);
        const climb = THREE.MathUtils.clamp(a.vel.y * 2, -0.4, 0.5);
        flightBasis(a.heading, 0.42 + wb.pitch + climb, a.roll, R, F, U);
        tmp.copy(a.pos).addScaledVector(U, wb.lift * size);
        a.gw.place(tmp, R, F, U, size);
      } else {
        plant.spotWorld(a.spot, sp, spUp, spFwd);
        a.settle = Math.min(1, a.settle + dt * 2.5);
        a.pos.lerpVectors(a.restPos, tmp.copy(sp).addScaledVector(spUp, 6e-3), sstep(0, 1, a.settle));
        restPose(a.gw.pose, lt, a.seed, 1);
        U.copy(a.restUp).lerp(spUp, 0.5).normalize();
        F.copy(a.restFwd).addScaledVector(U, -a.restFwd.dot(U)).normalize();
        R.crossVectors(F, U);
        a.gw.place(a.pos, R, F, U, size);
        if (a.until <= 0) {
          a.state = "fly";
          taken.delete(a.spot);
          a.spot = -1;
          a.until = 6 + rnd() * 10;
          a.vel.copy(U).multiplyScalar(0.25).addScaledVector(F, 0.1);
          pickTarget(a);
        }
      }
      a.gw.setSize(res.x, res.y);
      a.gw.sort(camPos);
    }
  }
  return {
    group,
    light,
    kit,
    animals,
    update,
    get time() {
      return time;
    },
    dispose() {
      for (const x of tracked) if (x && x.dispose) x.dispose();
    }
  };
}
export {
  createButterflies,
  createFraxinelle,
  mulberry32,
  pharmaLight
};
