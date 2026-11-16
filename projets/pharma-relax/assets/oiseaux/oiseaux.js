var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import * as THREE from "three";
const scale = { round: 1, cup: 0.5, fine: true, spacing: 0.8, fuzz: 0 };
const MOUNTAIN_GEM = {
  name: "Lampornis calolaemus",
  seed: 1207,
  //            y      z      a    w      rd     rv
  sections: [
    { y: -0.07, z: -0.32, a: 60, w: 0.035, rd: 0.03, rv: 0.035 },
    // 0 vent / tail root
    { y: 0.04, z: -0.245, a: 60, w: 0.15, rd: 0.105, rv: 0.13 },
    // 1 rump
    { y: 0.17, z: -0.165, a: 63, w: 0.225, rd: 0.16, rv: 0.2 },
    // 2 hips
    { y: 0.34, z: -0.09, a: 68, w: 0.262, rd: 0.185, rv: 0.25 },
    // 3 belly
    { y: 0.52, z: -0.035, a: 76, w: 0.258, rd: 0.185, rv: 0.245 },
    // 4 chest
    { y: 0.67, z: -5e-3, a: 84, w: 0.236, rd: 0.185, rv: 0.212 },
    // 5 shoulders
    { y: 0.775, z: 8e-3, a: 80, w: 0.205, rd: 0.182, rv: 0.19 },
    // 6 neck
    { y: 0.887, z: 0.052, a: 62, w: 0.15, rd: 0.17, rv: 0.17 },
    // 7 head
    { y: 0.926, z: 0.116, a: 38, w: 0.117, rd: 0.14, rv: 0.14 },
    // 8 crown / chin
    { y: 0.925, z: 0.195, a: 18, w: 0.066, rd: 0.09, rv: 0.07 },
    // 9 forehead / face
    { y: 0.905, z: 0.245, a: 8, w: 0.03, rd: 0.032, rv: 0.028 }
    // 10 bill base
  ],
  throat: [4.5, 7.3],
  spine: { tail: 0.3, hips: 1.9, spine: 3, chest: 4.1, neck1: 5.3, neck2: 5.95, head: 6.55 },
  eye: { s: 7.8, phi: 0.535, radius: 0.037, inset: 0.84 },
  bill: { length: 0.44, radius: 0.02, droop: 0.022, color: 460551 },
  skin: 1840662,
  shading: { flank: 0.6, under: 0.6, patch: 0.3, gold: 5921324, goldAmount: 0.22 },
  looks: {
    // --- soft contour feathers: fibrous, matte, a little unruly ---------------------------
    body: {
      width: 0.03,
      aspect: 2.1,
      rowStep: 0.3,
      tilt: 13,
      lift: 1,
      cup: 0.3,
      round: 0.7,
      loose: 0.55,
      fuzz: 0.3,
      base: 2104356,
      tip: 5195350,
      iri: 4885036,
      iriGraze: 9071132,
      iriStrength: 0.12,
      iriPower: 6,
      iriAlign: 0,
      jitter: 0.5,
      sparkle: 0.6
    },
    belly: {
      width: 0.033,
      aspect: 2.5,
      rowStep: 0.24,
      tilt: 11,
      lift: 1.2,
      cup: 0.25,
      round: 0.65,
      loose: 0.75,
      base: 2630191,
      tip: 6970485,
      iri: 6982186,
      iriGraze: 9071146,
      iriStrength: 0.1,
      iriPower: 5,
      iriAlign: 0,
      jitter: 0.5,
      sparkle: 0.6
    },
    flank: {
      width: 0.036,
      aspect: 2.8,
      rowStep: 0.24,
      tilt: 12,
      lift: 1.3,
      cup: 0.2,
      round: 0.55,
      loose: 0.9,
      base: 2301226,
      tip: 6313066,
      iri: 5925434,
      iriGraze: 6965802,
      iriStrength: 0.06,
      iriPower: 4,
      iriAlign: 0,
      jitter: 0.5,
      sparkle: 0.7
    },
    down: {
      width: 0.04,
      aspect: 2.6,
      rowStep: 0.24,
      tilt: 26,
      lift: 1.4,
      cup: 0.15,
      round: 0.5,
      loose: 1,
      base: 1840664,
      tip: 4207930,
      iri: 16777215,
      iriGraze: 16777215,
      iriStrength: 0,
      iriPower: 2,
      iriAlign: 0,
      jitter: 0.3
    },
    back: {
      width: 0.03,
      aspect: 2,
      rowStep: 0.31,
      tilt: 11,
      lift: 0.9,
      cup: 0.35,
      round: 0.75,
      loose: 0.45,
      fuzz: 0.3,
      base: 2039078,
      tip: 4867669,
      iri: 3840570,
      iriGraze: 9071128,
      iriStrength: 0.24,
      iriPower: 7,
      iriAlign: 0,
      jitter: 0.5,
      sparkle: 0.45
    },
    scapular: {
      width: 0.042,
      aspect: 3.3,
      rowStep: 0.24,
      tilt: 21,
      lift: 0.8,
      cup: 0.3,
      round: 0.6,
      loose: 0.6,
      fuzz: 0.4,
      base: 2170408,
      tip: 5327964,
      iri: 3836474,
      iriGraze: 9071128,
      iriStrength: 0.2,
      iriPower: 6,
      iriAlign: 0,
      jitter: 0.5,
      sparkle: 0.5
    },
    collar: {
      // small rounded fans in neat staggered rows, each a comb of bright strands
      width: 0.027,
      aspect: 1.45,
      rowStep: 0.36,
      tilt: 12,
      lift: 0.8,
      cup: 0.35,
      round: 1,
      loose: 0.3,
      spacing: 0.7,
      fuzz: 0.12,
      base: 1184536,
      tip: 2369580,
      iri: 2072672,
      iriGraze: 678490,
      iriStrength: 0.32,
      iriPower: 12,
      iriAlign: 0.3,
      iriAim: [0, 0.1, 1],
      jitter: 0.55,
      sparkle: 0.6
    },
    head: {
      width: 0.017,
      aspect: 1.8,
      rowStep: 0.34,
      tilt: 12,
      lift: 0.45,
      cup: 0.35,
      round: 0.9,
      loose: 0.4,
      fuzz: 0.22,
      base: 1184279,
      tip: 2763315,
      iri: 1866320,
      iriGraze: 5263386,
      iriStrength: 0.28,
      iriPower: 7,
      iriAlign: 0,
      jitter: 0.45,
      sparkle: 0.4
    },
    mask: {
      width: 0.012,
      aspect: 1.7,
      rowStep: 0.36,
      tilt: 10,
      lift: 0.2,
      cup: 0.3,
      round: 0.9,
      loose: 0.35,
      fuzz: 0.25,
      base: 263173,
      tip: 789517,
      iri: 1054752,
      iriGraze: 0,
      iriStrength: 0.04,
      iriPower: 4,
      iriAlign: 0,
      jitter: 0.2
    },
    velvet: {
      // the dark face: short, soft, matte down between the gorget and the bill and eyes
      width: 0.015,
      aspect: 1.6,
      rowStep: 0.28,
      tilt: 6,
      lift: 0.15,
      cup: 0.2,
      round: 0.7,
      loose: 0.8,
      fuzz: 0.7,
      base: 262915,
      tip: 985865,
      iri: 0,
      iriGraze: 0,
      iriStrength: 0,
      iriPower: 2,
      iriAlign: 0,
      jitter: 0.2
    },
    stripe: {
      // white down, short and soft, lying flush with the cheek
      width: 0.012,
      aspect: 2.6,
      rowStep: 0.24,
      tilt: 6,
      lift: 0.2,
      cup: 0.15,
      round: 0.5,
      loose: 0.95,
      fuzz: 1,
      base: 11841962,
      tip: 15526885,
      iri: 16777215,
      iriGraze: 16777215,
      iriStrength: 0,
      iriPower: 2,
      iriAlign: 0,
      jitter: 0.2
    },
    covert: {
      width: 0.046,
      aspect: 2.6,
      rowStep: 0.33,
      tilt: 9,
      lift: 0.7,
      cup: 0.3,
      round: 0.7,
      loose: 0.4,
      base: 2170151,
      tip: 5129816,
      iri: 3832400,
      iriGraze: 5917226,
      iriStrength: 0.18,
      iriPower: 6,
      iriAlign: 0,
      jitter: 0.4,
      sparkle: 0.5
    },
    undertail: {
      // pale undertail coverts: soft, off-white, lying down over the base of the tail
      width: 0.04,
      aspect: 2.9,
      rowStep: 0.26,
      tilt: 10,
      lift: 0.8,
      cup: 0.2,
      round: 0.6,
      loose: 0.8,
      base: 7827564,
      tip: 13617342,
      iri: 16777215,
      iriGraze: 16777215,
      iriStrength: 0,
      iriPower: 2,
      iriAlign: 0,
      jitter: 0.3
    },
    wingCovert: {
      width: 0.03,
      aspect: 2.3,
      rowStep: 0.4,
      tilt: 7,
      lift: 0,
      cup: 0.3,
      round: 0.8,
      loose: 0.22,
      fuzz: 0,
      base: 1512732,
      tip: 4012104,
      iri: 4872824,
      iriGraze: 5917242,
      iriStrength: 0.06,
      iriPower: 6,
      iriAlign: 0,
      jitter: 0.4,
      sparkle: 0.6
    },
    // --- show scales: crisp, closed, glossy ------------------------------------------------
    gorget: {
      ...scale,
      width: 0.052,
      aspect: 1,
      rowStep: 0.3,
      tilt: 8,
      lift: 0.5,
      spacing: 0.6,
      base: 1706510,
      tip: 4527900,
      iri: 8007935,
      iriGraze: 12595338,
      iriStrength: 2,
      iriPower: 4.2,
      iriAlign: 0.74,
      iriAim: [0, -0.5, 0.87],
      jitter: 0.34,
      channel: "gorget"
    },
    crown: {
      // small, a little ragged, and uneven: a scatter of glints more than a cap
      ...scale,
      width: 0.019,
      aspect: 1.3,
      rowStep: 0.34,
      tilt: 10,
      lift: 0.4,
      fuzz: 0.45,
      sparkle: 0.5,
      loose: 0.12,
      base: 330507,
      tip: 662554,
      iri: 1368772,
      iriGraze: 1726680,
      iriStrength: 2.3,
      iriPower: 5,
      iriAlign: 0.8,
      iriAim: [0, -0.24, 1],
      jitter: 0.55,
      channel: "crown"
    }
  },
  // later entries win
  tracts: [
    { name: "belly", look: "belly", region: { kind: "band", s: [0, 3.7], phi: [0, 0.45], soft: 0.6 } },
    { name: "flank", look: "flank", region: { kind: "band", s: [1.2, 4.2], phi: [0.3, 0.52], soft: 0.5 } },
    { name: "back", look: "back", region: { kind: "band", s: [0.9, 6.2], phi: [0.55, 1] } },
    { name: "scapular", look: "scapular", region: { kind: "band", s: [3.7, 5.6], phi: [0.56, 0.84], soft: 0.3 } },
    { name: "wingPit", look: "down", region: { kind: "blob", at: [3.8, 0.44], r: [0.3, 0.035], soft: 0.5 } },
    { name: "tailCoverts", look: "covert", region: { kind: "band", s: [0, 1.15], phi: [0, 1] } },
    { name: "undertail", look: "undertail", region: { kind: "band", s: [0, 1.35], phi: [0, 0.4], soft: 0.3 } },
    { name: "collar", look: "collar", region: { kind: "blob", at: [4.5, 0], r: [0.72, 0.44], soft: 0.6 } },
    { name: "head", look: "head", region: { kind: "band", s: [6, 11], phi: [0, 1] } },
    { name: "velvet", look: "velvet", region: { kind: "blob", at: [8, 0], r: [2.25, 0.63], pow: 3, soft: 0.2 } },
    { name: "mask", look: "mask", region: { kind: "blob", at: [8.3, 0.5], r: [1, 0.11] } },
    { name: "gorget", look: "gorget", region: { kind: "blob", at: [6.35, 0], r: [1.4, 0.27], pow: 3 } },
    { name: "chin", look: "gorget", region: { kind: "blob", at: [7.7, 0], r: [1.05, 0.17] } },
    { name: "crown", look: "crown", region: { kind: "blob", at: [8.5, 1], r: [1.3, 0.4] } },
    { name: "postocular", look: "stripe", region: { kind: "streak", from: [7.5, 0.57], to: [6.3, 0.6], r: [0.12, 0.025] } }
  ],
  wing: {
    shoulder: [0.185, 0.64, -0.06],
    upper: 0.1,
    fore: 0.13,
    hand: 0.17,
    primaries: 10,
    secondaries: 6,
    primaryLen: [0.34, 0.9],
    secondaryLen: [0.27, 0.2],
    primaryWidth: 0.062,
    secondaryWidth: 0.064,
    rest: { from: [5.1, 93], to: [0.6, 147], width: [0.05, 0.105, 0.04], height: 0.034, cross: [0.8, -0.02] },
    color: 3878193,
    sheen: 8021618
  },
  tail: { rectrices: 5, length: [0.61, 0.66], width: 0.13, droop: 62, restFan: 0.35, maxFan: 11, color: 1909292 },
  legs: { spread: 0.075, hip: [0.085, 0.11, -0.05], toe: 0.085, perchRadius: 0.0405, color: 1446159 },
  behaviour: {
    breathHz: [3.4, 5.2],
    holdCalm: [0.4, 1.8],
    holdAlert: [0.22, 0.9],
    saccade: [0.038, 42e-5],
    neckShare: [0.22, 0.3],
    blinkEvery: [1.8, 5.5],
    ruffleEvery: [60, 110],
    tailEvery: [3, 9],
    wingEvery: [9, 22],
    billUp: 14
  }
};
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = a + 1831565813 >>> 0;
    let t = a;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const clamp = (x, a, b) => x < a ? a : x > b ? b : x;
const saturate = (x) => clamp(x, 0, 1);
const lerp = (a, b, t) => a + (b - a) * t;
const DEG = Math.PI / 180;
function smoothstep(a, b, x) {
  const t = saturate((x - a) / (b - a));
  return t * t * (3 - 2 * t);
}
function catmull(keys, t) {
  const n = keys.length;
  const tt = clamp(t, 0, n - 1);
  const i = Math.min(Math.floor(tt), n - 2);
  const f2 = tt - i;
  const p0 = keys[Math.max(i - 1, 0)];
  const p1 = keys[i];
  const p2 = keys[i + 1];
  const p3 = keys[Math.min(i + 2, n - 1)];
  return 0.5 * (2 * p1 + (-p0 + p2) * f2 + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f2 * f2 + (-p0 + 3 * p1 - 3 * p2 + p3) * f2 * f2 * f2);
}
function damp(current, target, lambda, dt) {
  return lerp(current, target, 1 - Math.exp(-lambda * dt));
}
function hash1(i, seed) {
  let h = i * 374761393 + seed * 668265263 | 0;
  h = Math.imul(h ^ h >>> 13, 1274126177);
  return ((h ^ h >>> 16) >>> 0) / 4294967296;
}
function noise1(x, seed = 0) {
  const i = Math.floor(x);
  const f2 = x - i;
  const u = f2 * f2 * (3 - 2 * f2);
  return lerp(hash1(i, seed), hash1(i + 1, seed), u) * 2 - 1;
}
const rand = (rng, a, b) => a + (b - a) * rng();
function randSkew(rng, min, max, power = 2) {
  return min + (max - min) * Math.pow(rng(), power);
}
class Spring {
  constructor(freq = 6, zeta = 0.5) {
    __publicField(this, "freq");
    __publicField(this, "zeta");
    __publicField(this, "x", 0);
    __publicField(this, "v", 0);
    this.freq = freq;
    this.zeta = zeta;
  }
  step(target, dt) {
    const w = this.freq * Math.PI * 2;
    const n = Math.max(1, Math.ceil(dt * this.freq * 8));
    const h = dt / n;
    for (let i = 0; i < n; i++) {
      this.v += (-w * w * (this.x - target) - 2 * this.zeta * w * this.v) * h;
      this.x += this.v * h;
    }
    return this.x;
  }
  kick(impulse) {
    this.v += impulse;
  }
}
const SPINE_ORDER = ["tail", "hips", "spine", "chest", "neck1", "neck2", "head"];
class Loft {
  constructor(species) {
    __publicField(this, "species");
    __publicField(this, "count");
    __publicField(this, "ys");
    __publicField(this, "zs");
    __publicField(this, "as");
    __publicField(this, "ws");
    __publicField(this, "rds");
    __publicField(this, "rvs");
    __publicField(this, "a", new THREE.Vector3());
    __publicField(this, "b", new THREE.Vector3());
    __publicField(this, "c", new THREE.Vector3());
    __publicField(this, "front", null);
    this.species = species;
    const s = species.sections;
    this.count = s.length;
    this.ys = s.map((k) => k.y);
    this.zs = s.map((k) => k.z);
    this.as = s.map((k) => k.a * DEG);
    this.ws = s.map((k) => k.w);
    this.rds = s.map((k) => k.rd);
    this.rvs = s.map((k) => k.rv);
  }
  get sMax() {
    return this.count - 1;
  }
  center(s, out) {
    return out.set(0, catmull(this.ys, s), catmull(this.zs, s));
  }
  /** axis direction (toward the head) at s */
  axis(s, out) {
    const a = catmull(this.as, s);
    return out.set(0, Math.sin(a), Math.cos(a));
  }
  point(s, ang, out) {
    const a = catmull(this.as, s);
    const w = Math.max(catmull(this.ws, s), 4e-3);
    const rd = Math.max(catmull(this.rds, s), 4e-3);
    const rv = Math.max(catmull(this.rvs, s), 4e-3);
    const ca = Math.cos(ang);
    const sa = Math.sin(ang);
    const k = 1 + 0.06 * Math.sin(ang * 2) ** 2;
    const d = -ca * (ca > 0 ? rv : rd) * k;
    const cy = catmull(this.ys, s);
    const cz = catmull(this.zs, s);
    out.set(sa * w * k, cy + Math.cos(a) * d, cz - Math.sin(a) * d);
    const h = this.wingBulge(s, ang);
    if (h > 0) {
      const l = Math.hypot(out.x, out.y - cy, out.z - cz) || 1;
      const f2 = 1 + h / l;
      out.set(out.x * f2, cy + (out.y - cy) * f2, cz + (out.z - cz) * f2);
    }
    return out;
  }
  surface(s, ang, out) {
    const e = 0.01;
    const s0 = clamp(s, 0, this.sMax);
    this.point(s0, ang, out.p);
    const sa = Math.max(s0 - e, 0);
    const sb = Math.min(s0 + e, this.sMax);
    this.point(sb, ang, this.a).sub(this.point(sa, ang, this.b));
    this.point(s0, ang + e, this.b).sub(this.point(s0, ang - e, this.c));
    out.n.crossVectors(this.b, this.a).normalize();
    out.t.copy(this.a).multiplyScalar(-1);
    out.t.addScaledVector(out.n, -out.t.dot(out.n)).normalize();
    return out;
  }
  // --- the folded wing, as a strip of the body ------------------------------------------
  // Wing space: u runs 0 at the shoulder to 1 at the rump end of the strip, v runs -1 at
  // its leading (belly-side) edge to +1 at its trailing (back-side) edge.
  wingHalfWidth(u) {
    const [w0, w1, w2] = this.species.wing.rest.width;
    return u < 0.35 ? lerp(w0, w1, smoothstep(0, 0.35, u)) : lerp(w1, w2, smoothstep(0.35, 1, u));
  }
  /** Half-width of the strip as an angle round the body at s. */
  wingHalfAngle(s, u) {
    const r = (catmull(this.ws, s) + (catmull(this.rds, s) + catmull(this.rvs, s)) / 2) / 2;
    return this.wingHalfWidth(u) / Math.max(r, 0.03);
  }
  /** Where a point of the loft sits in wing space (either side). v is unbounded. */
  wingUV(s, ang) {
    const R2 = this.species.wing.rest;
    const TAU = Math.PI * 2;
    let a = (ang % TAU + TAU) % TAU;
    if (a > Math.PI) a = TAU - a;
    const u = (R2.from[0] - s) / (R2.from[0] - R2.to[0]);
    const uc = clamp(u, 0, 1);
    const centre = lerp(R2.from[1], R2.to[1], uc) * DEG;
    return { u, v: (a - centre) / this.wingHalfAngle(s, uc) };
  }
  /** The loft coordinates of a wing-space point; sign +1 = left wing, -1 = right. */
  wingAt(u, v, sign) {
    const R2 = this.species.wing.rest;
    const s = lerp(R2.from[0], R2.to[0], u);
    const a = lerp(R2.from[1], R2.to[1], clamp(u, 0, 1)) * DEG + v * this.wingHalfAngle(clamp(s, 0, this.sMax), clamp(u, 0, 1));
    return { s, ang: sign > 0 ? a : Math.PI * 2 - a };
  }
  wingBulge(s, ang) {
    const { u, v } = this.wingUV(s, ang);
    if (u <= 0 || u >= 1 || Math.abs(v) >= 1) return 0;
    const k = 1 - v * v;
    return this.species.wing.rest.height * smoothstep(0, 0.1, u) * (1 - smoothstep(0.8, 1, u)) * k * k;
  }
  /**
   * Distance along the belly line from the tail to s. (Sections are not evenly spaced on the
   * skin: under the chin a whole one fits in a few millimetres.)
   */
  frontLength(s) {
    const N = 20;
    if (!this.front) {
      this.front = [0];
      for (let i2 = 1; i2 <= this.sMax * N; i2++) this.front.push(this.front[i2 - 1] + this.point(i2 / N, 0, this.a).distanceTo(this.point((i2 - 1) / N, 0, this.b)));
    }
    const x = clamp(s, 0, this.sMax) * N;
    const i = Math.min(Math.floor(x), this.front.length - 2);
    return lerp(this.front[i], this.front[i + 1], x - i);
  }
  /** The s that lies `length` along the belly line: the inverse of frontLength. */
  frontAt(length) {
    this.frontLength(0);
    const f2 = this.front;
    let lo = 0;
    let hi = f2.length - 1;
    if (length <= 0) return 0;
    if (length >= f2[hi]) return this.sMax;
    while (hi - lo > 1) {
      const m = lo + hi >> 1;
      if (f2[m] <= length) lo = m;
      else hi = m;
    }
    return (lo + (length - f2[lo]) / Math.max(f2[hi] - f2[lo], 1e-9)) / 20;
  }
  /** Up to two spine bones and their weights for a point at s. */
  weights(s) {
    const sp = this.species.spine;
    for (let i = 0; i < SPINE_ORDER.length - 1; i++) {
      const a = SPINE_ORDER[i];
      const b = SPINE_ORDER[i + 1];
      if (s <= sp[b] || i === SPINE_ORDER.length - 2) {
        const f2 = smoothstep(sp[a], sp[b], s);
        return [a, 1 - f2, b, f2];
      }
    }
    return ["head", 1, "head", 0];
  }
  /**
   * Full skin binding for a surface point: two spine bones plus the sternum,
   * a leaf bone under the breast and flanks that the breath pushes around.
   */
  skin(s, ang) {
    const sp = this.species.spine;
    const belly = 0.5 + 0.5 * Math.cos(ang);
    const w = this.weights(s);
    const along = smoothstep(sp.hips - 0.4, sp.spine, s) * (1 - smoothstep(sp.chest + 0.2, sp.neck1 + 0.3, s));
    const st = 0.6 * along * (0.35 + 0.65 * belly);
    const [t0, t1] = this.species.throat;
    const front = smoothstep(0.25, 0.85, belly) * smoothstep(t0 - 0.9, t0, s);
    const k = clamp((this.frontLength(s) - this.frontLength(t0)) / (this.frontLength(t1) - this.frontLength(t0)), 0, 1);
    const acc = /* @__PURE__ */ new Map();
    const put = (bone, weight) => acc.set(bone, (acc.get(bone) ?? 0) + weight);
    put(w[0], w[1] * (1 - st) * (1 - front));
    put(w[2], w[3] * (1 - st) * (1 - front));
    put("sternum", st * (1 - front * k * (2 - k)));
    put("throat", (1 - st) * front * (1 - k) * (1 - k));
    put("gular", front * 2 * k * (1 - k));
    put("head", front * k * k);
    const top = [...acc].sort((p2, q) => q[1] - p2[1]).slice(0, 4);
    while (top.length < 4) top.push(["root", 0]);
    const sum = top.reduce((n, e) => n + e[1], 0);
    return { bones: top.map((e) => e[0]), weights: top.map((e) => e[1] / sum) };
  }
  /** 0 at the bill, 1 at the tail root: the coordinate the ruffle wave travels along. */
  bodyCoord(s) {
    return 1 - clamp(s / this.sMax, 0, 1);
  }
}
const SIDES = ["L", "R"];
const sideSign = (s) => s === "L" ? 1 : -1;
const V = (a) => new THREE.Vector3(a[0], a[1], a[2]);
const bx = new THREE.Vector3();
const by = new THREE.Vector3();
const bz = new THREE.Vector3();
const bm = new THREE.Matrix4();
function basisQuat(dir, up, out = new THREE.Quaternion()) {
  bz.copy(dir).normalize();
  bx.crossVectors(up, bz).normalize();
  by.crossVectors(bz, bx);
  return out.setFromRotationMatrix(bm.makeBasis(bx, by, bz));
}
const mirror = (v, sign) => new THREE.Vector3(v.x * sign, v.y, v.z);
function buildRig(species) {
  const loft = new Loft(species);
  const bones = {};
  const list = [];
  const rest = {};
  function add(name, parent, worldPos, worldQuat = new THREE.Quaternion()) {
    const b = new THREE.Bone();
    b.name = name;
    const r = { pos: new THREE.Vector3(), quat: new THREE.Quaternion(), worldPos: worldPos.clone(), worldQuat: worldQuat.clone() };
    if (parent) {
      const p2 = rest[parent];
      const inv = p2.worldQuat.clone().invert();
      r.pos.copy(worldPos).sub(p2.worldPos).applyQuaternion(inv);
      r.quat.copy(inv).multiply(worldQuat);
      bones[parent].add(b);
    } else {
      r.pos.copy(worldPos);
      r.quat.copy(worldQuat);
    }
    b.position.copy(r.pos);
    b.quaternion.copy(r.quat);
    bones[name] = b;
    rest[name] = r;
    list.push(b);
    return b;
  }
  const c = (s) => loft.center(s, new THREE.Vector3());
  const sp = species.spine;
  const rootBone = add("root", null, new THREE.Vector3());
  add("hips", "root", c(sp.hips));
  add("spine", "hips", c(sp.spine));
  add("chest", "spine", c(sp.chest));
  add("neck1", "chest", c(sp.neck1));
  add("neck2", "neck1", c(sp.neck2));
  add("head", "neck2", c(sp.head));
  add("throat", "chest", c(sp.head));
  add("gular", "chest", loft.point((species.throat[0] + species.throat[1]) / 2, 0, new THREE.Vector3()));
  add("sternum", "chest", loft.point(sp.spine + 0.4, 0, new THREE.Vector3()));
  const billBase = c(loft.sMax);
  const billDir = loft.axis(loft.sMax, new THREE.Vector3());
  const billQ = basisQuat(billDir, new THREE.Vector3(0, 1, 0));
  add("bill", "head", billBase, billQ);
  add("jaw", "head", billBase.clone().add(new THREE.Vector3(0, -0.012, -0.04)), billQ);
  const billZ = new THREE.Vector3(0, 0, 1).applyQuaternion(billQ);
  const billY = new THREE.Vector3(0, 1, 0).applyQuaternion(billQ);
  const BL = species.bill.length;
  const tongueAt = (k) => billBase.clone().addScaledVector(billZ, k * BL).addScaledVector(billY, -4e-3 - species.bill.droop * k * k);
  add("tongue.1", "jaw", tongueAt(0.06), billQ);
  add("tongue.2", "tongue.1", tongueAt(0.5), billQ);
  add("tongue.3", "tongue.2", tongueAt(0.7), billQ);
  const eyes = {};
  const sfc = { p: new THREE.Vector3(), n: new THREE.Vector3(), t: new THREE.Vector3() };
  for (const side of SIDES) {
    const sg = sideSign(side);
    loft.surface(species.eye.s, species.eye.phi * Math.PI, sfc);
    const out = sfc.n.clone().multiplyScalar(0.7).add(new THREE.Vector3(0.3, 0.02, 0.04)).normalize();
    const center = sfc.p.clone().addScaledVector(out, -species.eye.radius * species.eye.inset);
    out.x *= sg;
    center.x *= sg;
    const q = basisQuat(out, new THREE.Vector3(0, 1, 0));
    eyes[side] = {
      side,
      center,
      out,
      eye: add(`eye.${side}`, "head", center, q),
      lidUpper: add(`lidUpper.${side}`, "head", center, q),
      lidLower: add(`lidLower.${side}`, "head", center, q),
      nict: add(`nict.${side}`, "head", center, q)
    };
  }
  const W = species.wing;
  const wings = {};
  {
    const S = V(W.shoulder);
    const sfc2 = { p: new THREE.Vector3(), n: new THREE.Vector3(), t: new THREE.Vector3() };
    const under = (u, v, depth) => {
      const q = loft.wingAt(u, v, 1);
      loft.surface(q.s, q.ang, sfc2);
      return sfc2.p.clone().addScaledVector(sfc2.n, -depth);
    };
    const ta = species.tail.droop * DEG;
    const tailDir = new THREE.Vector3(0, -Math.sin(ta), -Math.cos(ta));
    const tailUp = new THREE.Vector3(0, Math.cos(ta), -Math.sin(ta));
    const meet = c(sp.tail).addScaledVector(tailDir, species.tail.length[1] * W.rest.cross[0]).addScaledVector(tailUp, 0.03);
    meet.x = W.rest.cross[1];
    const E = under(0.03, 0.4, 0.02);
    const wrist = under(0.2, -0.35, 0.014);
    const N = sfc2.n.clone();
    const hd = meet.clone().sub(wrist).normalize();
    N.addScaledVector(hd, -N.dot(hd)).normalize();
    const trail = new THREE.Vector3().crossVectors(N, hd);
    const caudal = loft.axis(sp.spine, new THREE.Vector3()).multiplyScalar(-1);
    const dorsal = new THREE.Vector3(0, -caudal.z, caudal.y);
    if (dorsal.z > 0) dorsal.multiplyScalar(-1);
    const X2 = new THREE.Vector3(1, 0, 0);
    const rotIn = (dir, n, ang) => dir.clone().applyAxisAngle(n, ang);
    const specs = [];
    specs.push({ name: "shoulder", parent: "chest", pos: S, dir: E.clone().sub(S), n: N, sDir: X2.clone().multiplyScalar(0.85).addScaledVector(caudal, 0.5) });
    specs.push({ name: "forearm", parent: "shoulder", pos: E, dir: wrist.clone().sub(E), n: N, sDir: X2.clone().multiplyScalar(0.9).addScaledVector(caudal, -0.35) });
    specs.push({ name: "hand", parent: "forearm", pos: wrist, dir: hd, n: N, sDir: X2.clone() });
    const np = W.primaries;
    for (let i = 0; i < np; i++) {
      const f2 = i / (np - 1);
      const base = wrist.clone().addScaledVector(hd, W.hand * (i + 0.4) / np).addScaledVector(trail, (1 - f2) * 0.04).addScaledVector(N, (1 - f2) * 4e-3);
      const dir = meet.clone().addScaledVector(trail, (1 - f2) * 0.05).sub(base).normalize();
      specs.push({ name: `primary#${i + 1}`, parent: "hand", pos: base, dir, n: N, sDir: rotIn(X2, dorsal, lerp(58, -4, Math.pow(f2, 0.62)) * DEG) });
    }
    const ns = W.secondaries;
    for (let j = 0; j < ns; j++) {
      const f2 = j / (ns - 1);
      const base = wrist.clone().lerp(E, (j + 0.7) / (ns + 0.4)).addScaledVector(trail, 0.03 + f2 * 0.015);
      specs.push({ name: `secondary#${j + 1}`, parent: "forearm", pos: base, dir: rotIn(hd, N, lerp(7, 16, f2) * DEG), n: N, sDir: rotIn(X2, dorsal, lerp(82, 97, f2) * DEG) });
    }
    for (const side of SIDES) {
      const sg = sideSign(side);
      const nm = (n) => n.includes("#") ? n.replace("#", `.${side}.`) : `${n}.${side}`;
      const wr = { side, bones: [], folded: [], spread: [], primaries: [], secondaries: [] };
      const spreadWorld = { chest: new THREE.Quaternion() };
      for (const s of specs) {
        const name = nm(s.name);
        const parent = s.parent === "chest" ? "chest" : nm(s.parent);
        const q = basisQuat(mirror(s.dir, sg), mirror(s.n, sg));
        const b = add(name, parent, mirror(s.pos, sg), q);
        const qs = basisQuat(mirror(s.sDir, sg), mirror(dorsal, sg));
        spreadWorld[name] = qs;
        wr.bones.push(b);
        wr.folded.push(rest[name].quat.clone());
        wr.spread.push(spreadWorld[parent].clone().invert().multiply(qs));
        if (s.name.startsWith("primary")) wr.primaries.push(b);
        if (s.name.startsWith("secondary")) wr.secondaries.push(b);
      }
      wings[side] = wr;
    }
  }
  const T = species.tail;
  const rectrices = [];
  {
    const a = T.droop * DEG;
    const dir = new THREE.Vector3(0, -Math.sin(a), -Math.cos(a));
    const up = new THREE.Vector3(0, Math.cos(a), -Math.sin(a));
    const q = basisQuat(dir, up);
    const base = c(sp.tail);
    add("tail", "hips", base, q);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(q);
    for (const side of SIDES) {
      for (let i = 0; i < T.rectrices; i++) {
        const k = (i + 0.5) * (side === "L" ? -1 : 1);
        const pos = base.clone().addScaledVector(right, k * 6e-3).addScaledVector(up, -i * 4e-3 - (side === "L" ? 2e-3 : 0)).addScaledVector(dir, 0.02);
        const qk = q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), k * T.restFan * DEG));
        rectrices.push({ bone: add(`rectrix.${side}.${i + 1}`, "tail", pos, qk), k });
      }
    }
  }
  const L = species.legs;
  const hipSocket = {};
  const ankle = {};
  let tarsusLength = 0.1;
  for (const side of SIDES) {
    const sg = sideSign(side);
    const foot = new THREE.Vector3(L.spread * sg, 0, 0);
    add(`foot.${side}`, "root", foot);
    const ank = foot.clone().add(new THREE.Vector3(0, 0.014, -0.012));
    const hipW = new THREE.Vector3(L.hip[0] * sg, L.hip[1], L.hip[2]);
    ankle[side] = ank;
    hipSocket[side] = hipW.clone().sub(rest.hips.worldPos);
    tarsusLength = hipW.distanceTo(ank);
    add(`tarsus.${side}`, `foot.${side}`, ank, basisQuat(hipW.clone().sub(ank), new THREE.Vector3(1, 0, 0)));
    for (let i = 0; i < 4; i++) add(`toe.${side}.${i + 1}`, `foot.${side}`, foot);
  }
  rootBone.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(list);
  const idx = new Map(list.map((b, i) => [b.name, i]));
  return {
    species,
    loft,
    rootBone,
    bones,
    list,
    rest,
    skeleton,
    index: (n) => {
      const i = idx.get(n);
      if (i === void 0) throw new Error(`no bone ${n}`);
      return i;
    },
    wings,
    rectrices,
    eyes,
    hipSocket,
    ankle,
    tarsusLength
  };
}
const CH_NONE = 0;
const CH_GORGET = 1;
const CH_CROWN = 2;
const CH_FLIGHT = 3;
const CH_FUZZ = 4;
const WING_REST_L = 2;
const WING_REST_R = 3;
const WING_REAL_L = 4;
const WING_REAL_R = 5;
class Builder {
  constructor() {
    __publicField(this, "pos", []);
    __publicField(this, "nor", []);
    __publicField(this, "uv", []);
    __publicField(this, "root", []);
    __publicField(this, "hinge", []);
    __publicField(this, "data", []);
    __publicField(this, "pat", []);
    __publicField(this, "iriN", []);
    __publicField(this, "cBase", []);
    __publicField(this, "cTip", []);
    __publicField(this, "cIri", []);
    __publicField(this, "cIri2", []);
    __publicField(this, "si", []);
    __publicField(this, "sw", []);
    __publicField(this, "idx", []);
    __publicField(this, "S", new THREE.Vector3());
    __publicField(this, "H", new THREE.Vector3());
    __publicField(this, "P", new THREE.Vector3());
    __publicField(this, "Nv", new THREE.Vector3());
    __publicField(this, "In", new THREE.Vector3());
  }
  add(f2) {
    const { cols, rows } = f2;
    const S = this.S.crossVectors(f2.normal, f2.dir).normalize();
    const H = this.H.crossVectors(f2.dir, f2.normal).normalize();
    const start = this.pos.length / 3;
    const hw = f2.width / 2;
    for (let r = 0; r < rows; r++) {
      const last = r === rows - 1;
      const v = f2.scallop ? r / (rows - 1) : rows === 4 ? [0, 0.5, 0.82, 0.965][r] : Math.pow(r / (rows - 1), 0.9);
      const pw = lerp(1.25, 2.1, f2.round);
      const tipT = clamp((v - 0.5) / 0.5, 0, 1);
      const close = Math.pow(Math.max(1 - Math.pow(tipT, pw), 0), 1 / pw);
      const prof = f2.scallop ? 1 : rows === 4 ? lerp(0.5, 1, smoothstep(0, 0.5, v)) * close : lerp(0.4, 1, smoothstep(0, f2.widen ?? 0.12, v)) * (last ? 0.42 : Math.pow(Math.max(1 - Math.pow(clamp((v - 0.8) / 0.2, 0, 1), 2.2), 0), 0.45));
      for (let c = 0; c < cols; c++) {
        const u = cols === 1 ? 0 : c / (cols - 1) * 2 - 1;
        const side = u < 0 ? 1 - f2.asym : 1 + f2.asym;
        let x = u * hw * prof * side;
        const vv = last && !f2.scallop ? v + (1 - v) * (1 - u * u) : v;
        let along = vv * f2.length;
        if (f2.scallop) {
          const k = clamp((v - 0.5) / 0.5, 0, 1);
          const al = u * Math.PI / 2;
          x = lerp(u * hw * lerp(0.72, 1, Math.min(v / 0.5, 1)), Math.sin(al) * hw, k);
          along = lerp(Math.min(v, 0.5) * f2.length, 0.5 * f2.length + Math.cos(al) * 0.5 * f2.length, k);
        }
        const drop = f2.cup * hw * (u * prof) * (u * prof) + f2.curl * f2.length * vv * vv;
        this.P.copy(f2.root).addScaledVector(S, x).addScaledVector(f2.dir, along).addScaledVector(f2.normal, -drop);
        this.Nv.copy(f2.normal).addScaledVector(S, 2 * f2.cup * u * prof).addScaledVector(f2.dir, 2 * f2.curl * vv);
        this.In.copy(f2.iriNormal).addScaledVector(S, 0.3 * f2.cup * u * prof).addScaledVector(f2.dir, 0.1 * (vv - 0.6)).normalize();
        if (f2.skinNormal) this.Nv.normalize().lerp(f2.skinNormal, lerp(0.45, 0.8, Math.min(f2.loose * 2, 1)));
        this.Nv.normalize();
        this.pos.push(this.P.x, this.P.y, this.P.z);
        this.nor.push(this.Nv.x, this.Nv.y, this.Nv.z);
        if (f2.scallop) this.uv.push(x / hw, along / f2.length);
        else this.uv.push(u, vv);
        this.root.push(f2.root.x, f2.root.y, f2.root.z);
        this.hinge.push(H.x, H.y, H.z);
        this.data.push(f2.rand, f2.coord, f2.gain, f2.channel ?? CH_NONE);
        if (f2.pat) this.pat.push(f2.pat[0], f2.pat[1], f2.pat[2]);
        else this.pat.push(-1, 0, 0);
        this.iriN.push(this.In.x, this.In.y, this.In.z);
        this.cBase.push(f2.base.r, f2.base.g, f2.base.b, f2.iriStrength / 4);
        this.cTip.push(f2.tip.r, f2.tip.g, f2.tip.b, f2.loose);
        this.cIri.push(f2.iri.r, f2.iri.g, f2.iri.b, f2.iriPower / 32);
        this.cIri2.push(f2.iri2.r, f2.iri2.g, f2.iri2.b, f2.cover);
        const sk = f2.skinAt ? f2.skinAt(this.P) : f2;
        this.si.push(...sk.bones);
        this.sw.push(...sk.weights);
      }
    }
    for (let r = 0; r < rows - 1; r++) {
      for (let c = 0; c < cols - 1; c++) {
        const a = start + r * cols + c;
        const b = a + cols;
        this.idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
  }
  build() {
    const g = new THREE.BufferGeometry();
    const f32 = (a, n) => new THREE.BufferAttribute(new Float32Array(a), n);
    const u16n = (a, n) => {
      const arr = new Uint16Array(a.length);
      for (let i = 0; i < a.length; i++) arr[i] = Math.round(clamp(a[i], 0, 1) * 65535);
      return new THREE.BufferAttribute(arr, n, true);
    };
    const i16n = (a, n) => {
      const arr = new Int16Array(a.length);
      for (let i = 0; i < a.length; i++) arr[i] = Math.round(clamp(a[i], -1, 1) * 32767);
      return new THREE.BufferAttribute(arr, n, true);
    };
    g.setAttribute("position", f32(this.pos, 3));
    g.setAttribute("normal", i16n(this.nor, 3));
    g.setAttribute("uv", f32(this.uv, 2));
    g.setAttribute("aRoot", f32(this.root, 3));
    g.setAttribute("aHinge", i16n(this.hinge, 3));
    g.setAttribute("aData", f32(this.data, 4));
    g.setAttribute("aPat", f32(this.pat, 3));
    g.setAttribute("aIriN", i16n(this.iriN, 3));
    g.setAttribute("aBase", u16n(this.cBase, 4));
    g.setAttribute("aTip", u16n(this.cTip, 4));
    g.setAttribute("aIri", u16n(this.cIri, 4));
    g.setAttribute("aIri2", u16n(this.cIri2, 4));
    g.setAttribute("skinIndex", new THREE.BufferAttribute(new Uint16Array(this.si), 4));
    g.setAttribute("skinWeight", u16n(this.sw, 4));
    g.setIndex(new THREE.BufferAttribute(new Uint32Array(this.idx), 1));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.4, -0.1), 2.5);
    g.boundingBox = new THREE.Box3(new THREE.Vector3(-2, -2, -2), new THREE.Vector3(2, 3, 2));
    return g;
  }
}
function inRegion(r, s, phi2, rnd) {
  if (r.kind === "band") {
    const sj = s + (r.soft ?? 0) * (rnd * 2 - 1);
    return sj >= r.s[0] && sj <= r.s[1] && phi2 >= r.phi[0] && phi2 <= r.phi[1];
  }
  if (r.kind === "blob") {
    const a = (s - r.at[0]) / r.r[0];
    const b = (phi2 - r.at[1]) / r.r[1];
    const e = r.pow ?? 2;
    return Math.pow(Math.abs(a), e) + Math.pow(Math.abs(b), e) <= 1 + (r.soft ?? 0) * (rnd * 2 - 1);
  }
  const ax = r.from[0] / r.r[0];
  const ay = r.from[1] / r.r[1];
  const bx2 = r.to[0] / r.r[0];
  const by2 = r.to[1] / r.r[1];
  const px = s / r.r[0];
  const py = phi2 / r.r[1];
  const dx = bx2 - ax;
  const dy = by2 - ay;
  const t = clamp(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy), 0, 1);
  return Math.hypot(px - ax - dx * t, py - ay - dy * t) <= 1;
}
function lookAt(species, s, phi2, rnd = 0.5) {
  let name = "body";
  for (const t of species.tracts) if (inRegion(t.region, s, phi2, rnd)) name = t.look;
  return species.looks[name];
}
const col = (hex) => new THREE.Color(hex);
function pigmentSpec(pg, j, flight = false) {
  const out = {
    base: col(pg.base).multiplyScalar(j),
    tip: col(pg.tip).multiplyScalar(j),
    pat: [pg.bars ?? 0, pg.t0 ?? (flight ? 0.62 : 0.3), pg.tw ?? (flight ? 0.2 : 0.7)]
  };
  if (pg.iri !== void 0) {
    out.iri = col(pg.iri);
    out.iri2 = col(pg.iri);
    out.iriStrength = pg.iriStrength ?? 0.3;
    out.iriPower = 3;
  }
  return out;
}
const skinIdx = (rig, bones) => bones.map((nm) => rig.index(nm));
const aimV = new THREE.Vector3();
function iriNormal(out, n, look, rng) {
  out.copy(n);
  if (look.iriAim) out.lerp(aimV.set(look.iriAim[0], look.iriAim[1], look.iriAim[2]).normalize(), look.iriAlign).normalize();
  if (!rng) return out;
  out.x += (rng() - 0.5) * look.jitter;
  out.y += (rng() - 0.5) * look.jitter;
  out.z += (rng() - 0.5) * look.jitter;
  return out.normalize();
}
function wingShadow(loft, s, a) {
  const { u, v } = loft.wingUV(s, a);
  if (u < 0.08 || u > 1.05) return 1;
  const along = smoothstep(0.08, 0.3, u) * (1 - smoothstep(0.9, 1.05, u));
  const under = smoothstep(-2, -1.05, v) * (1 - smoothstep(-0.75, -0.55, v));
  const behind = smoothstep(1.6, 1, v) * (1 - smoothstep(0.7, 0.9, -v + 1.6));
  return 1 - along * Math.max(0.62 * under, v > 0.8 ? 0.25 * behind : 0);
}
function toneAt(species, look, sj, phi2) {
  const sh2 = species.shading;
  let shade = 1 + sh2.patch * (0.6 * noise1(sj * 2.7, 5) + 0.6 * noise1(phi2 * 8 + sj * 1.3, 6));
  let gold = 0;
  const glit = look.fine ? 1 : lerp(0.12, 1.7, smoothstep(-0.25, 0.45, 0.7 * noise1(sj * 6.1 + phi2 * 9, 41) + 0.6 * noise1(phi2 * 21 - sj * 3.3, 42)));
  if (!look.fine) {
    gold = look.iriStrength > 0 && sj < 6 ? smoothstep(0.05, 0.6, 0.7 * noise1(sj * 3.4 + phi2 * 5, 31) + 0.5 * noise1(phi2 * 13 - sj * 2, 32)) * sh2.goldAmount : 0;
    const body = 1 - smoothstep(4.6, 5.6, sj);
    shade *= lerp(1, sh2.flank, body * smoothstep(0.2, 0.55, phi2) * (1 - smoothstep(0.72, 0.95, phi2)));
    shade *= lerp(1, sh2.under, smoothstep(2.6, 0.5, sj) * (1 - smoothstep(0.4, 0.7, phi2)));
  }
  return { shade, gold, glit };
}
function specFromLook(look, rng, shade = 1, gold = 0, goldHex = 6972448, glit = 1) {
  const j = (0.8 + rng() * 0.4) * shade;
  const iri = col(look.iri).lerp(col(look.iriGraze), rng() * rng() * 0.45);
  return {
    base: col(look.base).multiplyScalar(j),
    tip: col(look.tip).lerp(col(goldHex), gold * rng()).multiplyScalar(j),
    iri,
    iri2: col(look.iriGraze),
    iriStrength: look.iriStrength * lerp(0.75 + rng() * 0.5, 2.6 * Math.pow(rng(), 2.5), look.sparkle ?? 0) * (1 + gold * 1.5) * glit,
    iriPower: look.iriPower * (0.8 + rng() * 0.5),
    loose: look.loose ?? 0,
    round: look.round,
    cup: look.cup,
    channel: look.channel === "gorget" ? CH_GORGET : look.channel === "crown" ? CH_CROWN : CH_NONE
  };
}
const sheetS = new THREE.Vector3();
const sheetA = new THREE.Vector3();
const sheetD = new THREE.Vector3();
function sheetSkin(rig, s, a, root) {
  const { loft } = rig;
  if (s < loft.species.throat[0] - 1.1 || Math.cos(a) < -0.5) return void 0;
  const s1 = Math.min(s + 0.02, loft.sMax);
  loft.point(s1, a, sheetS).sub(loft.point(s - 0.02, a, sheetD)).multiplyScalar(1 / (s1 - s + 0.02));
  loft.point(s, a + 0.02, sheetA).sub(loft.point(s, a - 0.02, sheetD)).multiplyScalar(1 / 0.04);
  const dS = sheetS.clone().multiplyScalar(1 / sheetS.lengthSq());
  const dA = sheetA.clone().multiplyScalar(1 / sheetA.lengthSq());
  const from = root.clone();
  const up = sheetS.clone().normalize();
  const l0 = loft.frontLength(s);
  return (p2) => {
    sheetD.copy(p2).sub(from);
    const here = sheetD.dot(dS);
    const plain2 = loft.frontAt(l0 + sheetD.dot(up)) - s;
    const sk = loft.skin(clamp(s + (Math.abs(plain2) < Math.abs(here) ? plain2 : here), 0, loft.sMax), a + sheetD.dot(dA));
    return { bones: skinIdx(rig, sk.bones), weights: sk.weights };
  };
}
function addContour(b, rig, rng) {
  const { loft, species } = rig;
  const sfc = { p: new THREE.Vector3(), n: new THREE.Vector3(), t: new THREE.Vector3() };
  const sfc2 = { p: new THREE.Vector3(), n: new THREE.Vector3(), t: new THREE.Vector3() };
  const skinN = new THREE.Vector3();
  const tmpA = new THREE.Vector3();
  const tmpB = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const nrm = new THREE.Vector3();
  const iriN = new THREE.Vector3();
  const root = new THREE.Vector3();
  const eyeR = species.eye.radius;
  const TAU = Math.PI * 2;
  const phiOf = (ang) => {
    const a = (ang % TAU + TAU) % TAU;
    return a <= Math.PI ? a / Math.PI : (TAU - a) / Math.PI;
  };
  const sizeAt = (s2, phi2, rnd = 0.5) => {
    const look = lookAt(species, s2, phi2, rnd);
    let width = look.width;
    if (!look.fine) {
      const la = lookAt(species, s2 - 0.45, phi2);
      const lb = lookAt(species, s2 + 0.45, phi2);
      width = (width * 2 + (la.fine ? width : la.width) + (lb.fine ? width : lb.width)) / 4;
    }
    return { look, width: width * (species.coarse ?? 1) };
  };
  const BINS = 240;
  const COARSE = 40;
  const acc = new Float32Array(BINS).fill(1);
  const count = new Uint16Array(BINS);
  const rowS = [];
  const cS = new Float32Array(COARSE + 1);
  const FINE = 1e-3;
  let s = loft.sMax - 0.015;
  while (s > 0.03) {
    let maxS = 0;
    for (let k = 0; k <= COARSE; k++) {
      const a = k / COARSE * TAU;
      cS[k] = loft.point(Math.min(s + 0.01, loft.sMax), a, tmpA).distanceTo(loft.point(s - 0.01, a, tmpB)) / 0.02;
      maxS = Math.max(maxS, cS[k]);
    }
    const ds = FINE / maxS;
    for (let i = 0; i < BINS; i++) {
      const f2 = i / BINS * COARSE;
      const k = Math.min(Math.floor(f2), COARSE - 1);
      const { look, width } = sizeAt(s, phiOf(i / BINS * TAU));
      const pitch = width * look.aspect * look.rowStep;
      acc[i] += lerp(cS[k], cS[k + 1], f2 - k) * ds;
      if (acc[i] >= pitch) {
        acc[i] = Math.min(acc[i] - pitch, pitch * 0.5);
        const r = count[i]++;
        (rowS[r] ?? (rowS[r] = new Float32Array(BINS).fill(NaN)))[i] = s;
      }
    }
    s -= ds;
  }
  const P0 = new THREE.Vector3();
  const P1 = new THREE.Vector3();
  const plant = (sj, a) => {
    loft.surface(sj, a, sfc);
    for (const side of SIDES) if (sfc.p.distanceTo(rig.eyes[side].center) < eyeR * 1.02) return;
    const wuv = loft.wingUV(sj, a);
    const inWing = wuv.u > 0.04 && wuv.u < 0.97 && Math.abs(wuv.v) < 0.9;
    const drape = inWing && wuv.v < -0.3 && wuv.u < 0.5 && 0.5 + 0.5 * noise1(sj * 53 + a * 91, 77) < 0.75 * smoothstep(-0.3, -0.75, wuv.v) * (1 - smoothstep(0.32, 0.5, wuv.u));
    if (inWing && !drape) return;
    const phi2 = phiOf(a);
    const sized = sizeAt(sj + (rng() - 0.5) * 0.06, clamp(phi2 + (rng() - 0.5) * 0.012, 0, 1), rng());
    const width = sized.width;
    const rise = Math.pow(1 - smoothstep(7.1, 9, sj), 1.4);
    const haircut = species.haircut ?? 1;
    const hair = smoothstep(0.56, 0.86, phi2) * rise * smoothstep(6.25, 7, sj) * haircut;
    const sleek = smoothstep(0.5, 0.8, phi2) * smoothstep(8.5, 9.2, sj);
    const look = drape ? species.looks.flank : sized.look === species.looks.crown && sj < 8.5 && rng() < 0.5 * smoothstep(0.7, 0.9, phi2) ? species.looks.head : sized.look;
    const standing = look.fine ? 0 : hair;
    const unruly = look.fine || look === species.looks.stripe ? 0 : smoothstep(6, 6.7, sj) * smoothstep(0.35, 0.6, phi2) * (0.35 + 0.65 * rise) * haircut;
    const clump = noise1(sj * 11 + phi2 * 37, 51);
    if (unruly > 0 && clump > 0.45 && rng() < 0.4 * unruly) return;
    if (look === species.looks.gorget) return;
    const G = species.looks.gorget;
    const beside = sj > 4.6 && sj < 8.2 && phi2 < 0.5 ? lookAt(species, sj, Math.max(phi2 - 0.035, 0)) === G ? 2 : lookAt(species, sj, Math.max(phi2 - 0.08, 0)) === G ? 1 : 0 : 0;
    if (beside === 2) return;
    const under = beside === 0 && sj > 4.2 && sj < 5.6 && phi2 < 0.4 && lookAt(species, sj + 0.5, phi2) === G;
    const sh2 = species.shading;
    const tone = toneAt(species, look, sj, phi2);
    const { gold, glit } = tone;
    const shade = tone.shade * wingShadow(loft, sj, a);
    const loose = look.loose ?? 0;
    const nA = noise1(sj * 4.3 + phi2 * 17, 21);
    const nB = noise1(sj * 3.1 - phi2 * 23, 22);
    const size = 1 + (rng() - 0.5) * lerp(0.26, 0.65, loose);
    const len = width * look.aspect * size * (1 + standing * (0.3 + 1.3 * rng() * rng()) + unruly * (rng() - 0.5) * 0.5);
    const stray = rng() < 0.035 * loose + 0.14 * standing ? 1 : 0;
    let tilt = (look.tilt + (rng() - 0.5) * lerp(6, 17, loose) + nB * 7 * loose + stray * (8 + rng() * 10)) * DEG;
    const yaw = (rng() - 0.5) * lerp(0.17, 0.72, loose) + nA * 0.4 * loose + stray * (rng() - 0.5) * 0.9 + ((rng() - 0.5) * 0.9 + clump * 0.45) * unruly;
    const roll = ((rng() - 0.5) * 0.7 + nB * 0.3) * loose + ((rng() - 0.5) * 1.1 + clump * 0.5) * unruly;
    if (beside || under) tilt *= 0.35;
    if (drape) tilt += 9 * DEG;
    else if (wuv.u > 0 && wuv.u < 1 && Math.abs(wuv.v) < 1.7 && !stray) {
      const near = 1 - smoothstep(0.9, 1.7, Math.abs(wuv.v));
      tilt *= 1 - 0.6 * near;
    }
    let gain = look.lift + standing * 0.9;
    tilt = tilt * (1 - 0.55 * sleek) + standing * (14 + 30 * rng() * rng() + 9 * clump) * DEG;
    const local = loft.point(Math.min(sj + 0.01, loft.sMax), a, tmpA).distanceTo(loft.point(Math.max(sj - 0.01, 0), a, tmpB)) / 0.02;
    root.copy(sfc.p);
    skinN.copy(sfc.n);
    loft.surface(Math.max(sj - len * 0.85 / Math.max(local, 0.02), 0), a, sfc2);
    dir.copy(sfc2.p).addScaledVector(sfc2.n, len * Math.sin(tilt)).sub(root);
    if (dir.lengthSq() < 1e-8) dir.copy(sfc.t);
    dir.normalize();
    nrm.copy(skinN).add(sfc2.n).addScaledVector(dir, -skinN.dot(dir) - sfc2.n.dot(dir)).normalize();
    dir.applyAxisAngle(nrm, yaw);
    nrm.applyAxisAngle(dir, roll);
    iriNormal(iriN, nrm, look, rng);
    const sk = loft.skin(sj, a);
    const pg = species.paint ? species.paint.body(sj, phi2, rng()) : null;
    b.add({
      ...specFromLook(look, rng, shade, gold, sh2.gold, glit),
      ...pg ? pigmentSpec(pg, (0.9 + rng() * 0.2) * shade) : null,
      root,
      dir,
      normal: nrm,
      skinNormal: skinN,
      iriNormal: iriN,
      width: width * size,
      length: len,
      cols: look.fine ? 5 : 3,
      rows: 4,
      curl: lerp(0.1, 0.02 + rng() * 0.22, loose),
      asym: 0,
      bones: skinIdx(rig, sk.bones),
      weights: sk.weights,
      skinAt: sheetSkin(rig, sj, a, root),
      rand: rng(),
      coord: loft.bodyCoord(sj) * 0.8,
      gain,
      cover: clamp(1 - look.rowStep, 0.1, 0.9)
    });
  };
  for (let r = 0; r < rowS.length; r++) {
    const row = rowS[r];
    for (const sign of [1, -1]) {
      let q = r & 1 ? 0.5 : sign > 0 ? 1 : 0;
      let broken = false;
      for (let i = 0; i < BINS / 2; i++) {
        const b0 = (sign * i % BINS + BINS) % BINS;
        const b1 = (sign * (i + 1) % BINS + BINS) % BINS;
        const s0 = row[b0];
        const s1 = row[b1];
        if (Number.isNaN(s0) || Number.isNaN(s1)) {
          broken = true;
          continue;
        }
        if (broken) {
          q = rng();
          broken = false;
        }
        const a0 = sign * i * TAU / BINS;
        const a1 = sign * (i + 1) * TAU / BINS;
        loft.point(s0, a0, P0);
        loft.point(s1, a1, P1);
        const { look, width } = sizeAt((s0 + s1) / 2, phiOf((a0 + a1) / 2));
        const span = P0.distanceTo(P1) / (width * (look.spacing ?? 0.6));
        while (q + span >= 1) {
          const f2 = (1 - q) / span;
          const jitterS = (rng() - 0.5) * 0.25 * width * look.aspect * look.rowStep / 0.11;
          const lj = lerp(0.12, 0.5, look.loose ?? 0) * (look.fine ? 1 : 1 + 1.8 * (species.haircut ?? 1) * smoothstep(6, 6.7, (s0 + s1) / 2));
          plant(clamp(lerp(s0, s1, f2) + jitterS * (1 + 2 * (look.loose ?? 0)), 0.02, loft.sMax), lerp(a0, a1, f2) + (rng() - 0.5) * lj * width / 0.15);
          q -= 1;
        }
        q += span;
      }
    }
  }
}
function addCrest(b, rig, rng) {
  const C = rig.species.crest;
  if (!C) return;
  const { loft } = rig;
  const p2 = new THREE.Vector3();
  const c = new THREE.Vector3();
  const ax = new THREE.Vector3();
  for (let i = 0; i < C.count; i++) {
    const t = i / (C.count - 1);
    const s = lerp(9.7, 7.2, t);
    const ang = Math.PI + (rng() - 0.5) * 0.5;
    loft.point(s, ang, p2);
    loft.center(s, c);
    loft.axis(s, ax);
    const n = p2.clone().sub(c).normalize();
    const dir = n.clone().multiplyScalar(0.55 + 0.35 * t).addScaledVector(ax, -1).normalize();
    const nrm = n.clone().addScaledVector(dir, -n.dot(dir)).normalize();
    const sk = loft.skin(s, ang);
    const j = 0.92 + 0.16 * rng();
    b.add({
      root: p2.clone().addScaledVector(n, -4e-3),
      dir,
      normal: nrm,
      skinNormal: null,
      iriNormal: nrm,
      width: C.length * 0.2,
      length: C.length * (0.55 + 0.45 * Math.sin(Math.PI * (0.15 + 0.7 * t))),
      cols: 3,
      rows: 5,
      round: 0.75,
      cup: 0.1,
      curl: 0.03,
      asym: 0,
      base: col(C.base).multiplyScalar(j),
      tip: col(C.tip).multiplyScalar(j),
      pat: [0, 0.8, 0.05],
      iri: col(0),
      iri2: col(0),
      iriStrength: 0,
      iriPower: 2,
      loose: 0.1,
      cover: 0.2,
      bones: skinIdx(rig, sk.bones),
      weights: sk.weights,
      rand: rng(),
      coord: 0.95,
      gain: 0.6
    });
  }
}
function addGorget(b, rig, rng) {
  const { loft, species } = rig;
  const look = species.looks.gorget;
  if (!look) return;
  const sfc = { p: new THREE.Vector3(), n: new THREE.Vector3(), t: new THREE.Vector3() };
  const samples = [];
  const d = new THREE.Vector3();
  const e = new THREE.Vector3();
  let sTop = loft.sMax;
  while (sTop > 4.3 && lookAt(species, sTop, 0) !== look) sTop -= 0.02;
  const sC = Math.min(sTop + 0.5, loft.sMax - 0.3);
  let rhoMax = 0;
  let rhoMin = Infinity;
  const DS = 0.02;
  const DA = 0.02;
  const downAt = /* @__PURE__ */ new Map();
  {
    let acc = 0;
    for (let i = 0; ; i++) {
      const s = sC - i * DS;
      if (s < 4.3) break;
      if (i > 0) acc += loft.point(s, 0, d).distanceTo(loft.point(s + DS, 0, e));
      downAt.set(i, acc);
    }
    acc = 0;
    for (let i = -1; ; i--) {
      const s = sC - i * DS;
      if (s > loft.sMax - 0.05) break;
      acc -= loft.point(s, 0, d).distanceTo(loft.point(s - DS, 0, e));
      downAt.set(i, acc);
    }
  }
  for (const [i, y] of downAt) {
    const s = sC - i * DS;
    let lat2 = 0;
    for (let j = 0; j * DA <= 1.3; j++) {
      const a = j * DA;
      if (j > 0) lat2 += loft.point(s, a, d).distanceTo(loft.point(s, a - DA, e));
      if (lookAt(species, s, a / Math.PI) !== look) continue;
      for (const sg of j === 0 ? [1] : [1, -1]) samples.push({ s, a: a * sg, x: lat2 * sg, y });
      rhoMax = Math.max(rhoMax, Math.hypot(lat2, y));
      rhoMin = Math.min(rhoMin, Math.hypot(lat2, y));
    }
  }
  if (!samples.length) return;
  const nearest = (x, y) => {
    let best = samples[0];
    let bd = Infinity;
    for (const q of samples) {
      const e2 = (q.x - x) * (q.x - x) + (q.y - y) * (q.y - y);
      if (e2 < bd) {
        bd = e2;
        best = q;
      }
    }
    return { q: best, miss: Math.sqrt(bd) };
  };
  const lat = new THREE.Vector3();
  const root = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const nrm = new THREE.Vector3();
  const iriN = new THREE.Vector3();
  const indigo = new THREE.Color(3814655);
  const magenta = new THREE.Color(14036168);
  const spacing = look.spacing ?? 0.8;
  let rho = Math.max(rhoMin, look.width * 0.3);
  let row = 0;
  while (rho <= rhoMax + look.width * 0.3) {
    const t = clamp((rho - rhoMin) / (rhoMax - rhoMin), 0, 1);
    const w = look.width * lerp(0.6, 1.3, t);
    const len = w * look.aspect;
    const n = Math.max(1, Math.round(Math.PI * 2 * rho / (w * spacing)));
    for (let j = 0; j < n; j++) {
      const th = (j + (row % 2 ? 0.5 : 0)) / n * Math.PI * 2 - Math.PI + (rng() - 0.5) * 0.12 * (w / Math.max(rho, w));
      const { q, miss } = nearest(rho * Math.sin(th), rho * Math.cos(th));
      if (miss > 0.03) continue;
      const exposed = nearest(rho * Math.sin(th), rho * Math.cos(th) - len * 0.7).miss > 0.02;
      loft.surface(q.s, q.a, sfc);
      const thd = Math.sign(th) * Math.min(Math.abs(th) * 0.5, 0.6) + (rng() - 0.5) * 0.14;
      const tilt = (look.tilt + (rng() - 0.5) * 3) * DEG;
      root.copy(sfc.p);
      lat.crossVectors(sfc.n, sfc.t);
      if (lat.x < 0) lat.multiplyScalar(-1);
      dir.copy(sfc.t).multiplyScalar(Math.cos(thd)).addScaledVector(lat, Math.sin(thd)).normalize();
      nrm.copy(sfc.n).multiplyScalar(Math.cos(tilt)).addScaledVector(dir, -Math.sin(tilt));
      dir.multiplyScalar(Math.cos(tilt)).addScaledVector(sfc.n, Math.sin(tilt));
      iriNormal(iriN, nrm, look, rng);
      const sp = specFromLook(look, rng);
      const h = clamp(t + (rng() - 0.5) * 0.16, 0, 1);
      if (h < 0.45) sp.iri.lerp(indigo, (1 - h / 0.45) * 0.85);
      else sp.iri.lerp(magenta, (h - 0.45) / 0.55 * 0.8);
      const skinAt = sheetSkin(rig, q.s, q.a, root);
      const sk = loft.skin(q.s, q.a);
      const size = 0.94 + rng() * 0.12;
      b.add({
        ...sp,
        root,
        dir,
        normal: nrm,
        skinNormal: sfc.n,
        iriNormal: iriN,
        width: w * size,
        length: len * size,
        cols: 9,
        rows: 6,
        scallop: true,
        cup: 0.16,
        curl: 0.05,
        asym: 0,
        bones: skinIdx(rig, sk.bones),
        weights: sk.weights,
        skinAt,
        rand: rng(),
        coord: loft.bodyCoord(q.s) * 0.8,
        gain: look.lift,
        cover: exposed ? 0.25 : clamp(1 - look.rowStep, 0.1, 0.9)
      });
    }
    rho += w * look.aspect * look.rowStep;
    row++;
  }
}
function addWing(b, rig, side, rng) {
  const W = rig.species.wing;
  const wr = rig.wings[side];
  const sg = sideSign(side);
  const base = col(W.color);
  const sheen = col(W.sheen);
  const X2 = new THREE.Vector3();
  const Y2 = new THREE.Vector3();
  const Z2 = new THREE.Vector3();
  const paint = rig.species.paint;
  const blade = (bone, length, width, asym, pg) => {
    const r = rig.rest[bone.name];
    new THREE.Matrix4().makeRotationFromQuaternion(r.worldQuat).extractBasis(X2, Y2, Z2);
    Z2.applyAxisAngle(Y2, (rng() - 0.5) * 0.02);
    Y2.applyAxisAngle(Z2, (rng() - 0.5) * 0.12);
    const i = rig.index(bone.name);
    const j = 0.7 + rng() * 0.6;
    b.add({
      root: r.worldPos,
      dir: Z2,
      normal: Y2,
      skinNormal: null,
      iriNormal: Y2,
      width,
      length,
      cols: 3,
      rows: 9,
      round: 0.75,
      cup: 0.12,
      curl: 0.012,
      // bone +X is the trailing edge on the left wing and the leading edge on the right
      asym: asym * sg,
      base: base.clone().multiplyScalar(j),
      tip: base.clone().multiplyScalar(j * 0.8),
      iri: sheen,
      iri2: sheen,
      iriStrength: paint ? 0 : 0.22,
      iriPower: 2.5,
      ...pg ? pigmentSpec(pg, 0.92 + 0.16 * rng(), true) : null,
      loose: 0,
      widen: 0.3,
      bones: [i, 0, 0, 0],
      weights: [1, 0, 0, 0],
      rand: rng(),
      // coord doubles as a wing id for the shader: REAL_L/REAL_R blades stay folded away
      // inside the body until the wing spreads
      coord: sg > 0 ? WING_REAL_L : WING_REAL_R,
      gain: 0,
      // for blades the cover slot says which edge is the leading one
      cover: sg > 0 ? 0.2 : 0.8,
      channel: CH_FLIGHT
    });
  };
  wr.primaries.forEach((bone, i) => {
    const f2 = i / (wr.primaries.length - 1);
    blade(bone, lerp(W.primaryLen[0], W.primaryLen[1], Math.pow(f2, 0.75)), W.primaryWidth * lerp(1.15, 0.8, f2), lerp(0.2, 0.5, f2), paint ? paint.wing("primary", f2, rng()) : null);
  });
  wr.secondaries.forEach((bone, j) => {
    const f2 = j / (wr.secondaries.length - 1);
    blade(bone, lerp(W.secondaryLen[0], W.secondaryLen[1], f2), W.secondaryWidth, 0.15, paint ? paint.wing("secondary", f2, rng()) : null);
  });
  const look = rig.species.looks.covert;
  const hand = rig.rest[`hand.${side}`];
  const fore = rig.rest[`forearm.${side}`];
  new THREE.Matrix4().makeRotationFromQuaternion(hand.worldQuat).extractBasis(X2, Y2, Z2);
  const trail = X2.clone().multiplyScalar(sg);
  const N = Y2.clone();
  const hd = Z2.clone();
  const tipOfHand = hand.worldPos.clone().addScaledVector(hd, W.hand);
  const rowsDef = [
    { off: -0.02, len: 0.075, w: 0.034, lift: 6e-3, n: 15 },
    { off: 0, len: 0.1, w: 0.04, lift: 8e-3, n: 14 },
    { off: 0.024, len: 0.13, w: 0.046, lift: 0.01, n: 14 },
    { off: 0.05, len: 0.17, w: 0.05, lift: 0.012, n: 13 }
  ];
  const p2 = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const nrm = new THREE.Vector3();
  for (const [ri, rw] of rowsDef.entries()) {
    for (let k = 0; k < rw.n; k++) {
      const cpg = paint ? paint.wing("covert", ri / (rowsDef.length - 1), rng()) : null;
      const a = lerp(-0.55, 0.9, (k + rng() * 0.7) / rw.n);
      if (a < 0) p2.copy(hand.worldPos).lerp(fore.worldPos, -a / 0.5);
      else p2.copy(hand.worldPos).lerp(tipOfHand, a);
      p2.addScaledVector(trail, rw.off + (rng() - 0.5) * 0.016).addScaledVector(N, rw.lift);
      const tilt = 0.06 + rng() * 0.08;
      dir.copy(hd).applyAxisAngle(N, sg * (0.1 + rng() * 0.3 + (a < 0 ? 0.25 : 0)));
      nrm.copy(N).multiplyScalar(Math.cos(tilt)).addScaledVector(dir, -Math.sin(tilt));
      dir.multiplyScalar(Math.cos(tilt)).addScaledVector(N, Math.sin(tilt));
      const bi = rig.index(a < 0 ? `forearm.${side}` : `hand.${side}`);
      const size = 0.8 + rng() * 0.4;
      b.add({
        ...specFromLook(look, rng, 0.8 + 0.3 * rng()),
        ...cpg ? pigmentSpec(cpg, 0.9 + 0.2 * rng()) : null,
        root: p2,
        dir,
        normal: nrm,
        skinNormal: N,
        iriNormal: nrm,
        width: rw.w * size,
        length: rw.len * size,
        cols: 3,
        rows: 4,
        curl: 0.04 + rng() * 0.1,
        asym: 0,
        bones: [bi, 0, 0, 0],
        weights: [1, 0, 0, 0],
        rand: rng(),
        coord: sg > 0 ? WING_REAL_L : WING_REAL_R,
        gain: 0,
        cover: 0.55
      });
    }
  }
}
function addRestWing(b, rig, side, rng) {
  const { loft, species } = rig;
  const W = species.wing;
  const sg = sideSign(side);
  const id = sg > 0 ? WING_REST_L : WING_REST_R;
  const sfc = { p: new THREE.Vector3(), n: new THREE.Vector3(), t: new THREE.Vector3() };
  const sfc2 = { p: new THREE.Vector3(), n: new THREE.Vector3(), t: new THREE.Vector3() };
  const at = (u, v, out2) => {
    const q = loft.wingAt(u, v, sg);
    loft.surface(clamp(q.s, 0.02, loft.sMax), q.ang, out2);
    return q;
  };
  at(0, 0, sfc);
  at(1, 0, sfc2);
  const span = sfc.p.distanceTo(sfc2.p);
  const root = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const nrm = new THREE.Vector3();
  const base = col(W.color);
  const sheen = col(W.sheen);
  const covert = species.looks.wingCovert;
  const lay = (u, v, len, dv, lift, tiltDeg) => {
    const q = at(u, v, sfc);
    at(u + len / span, v + dv, sfc2);
    root.copy(sfc.p).addScaledVector(sfc.n, lift);
    dir.copy(sfc2.p).addScaledVector(sfc2.n, lift + len * Math.sin(tiltDeg * DEG)).sub(root).normalize();
    nrm.copy(sfc.n).add(sfc2.n).addScaledVector(dir, -sfc.n.dot(dir) - sfc2.n.dot(dir)).normalize();
    const sk = loft.skin(clamp(q.s, 0.02, loft.sMax), q.ang);
    return { bones: skinIdx(rig, sk.bones), weights: sk.weights };
  };
  const rows = 7;
  for (let r = 0; r < rows; r++) {
    const f2 = r / (rows - 1);
    const u = lerp(0.03, 0.3, f2 * f2 * 0.4 + f2 * 0.6);
    const w = lerp(0.024, 0.05, f2);
    const len = w * lerp(2.2, 3.4, f2);
    const half = lerp(W.rest.width[0], W.rest.width[1], smoothstep(0, 0.35, u));
    const n = Math.max(3, Math.round(2 * half / (w * 0.62)));
    for (let k = 0; k < n; k++) {
      const v = clamp(-0.98 + 2 * (k + (r % 2 ? 0.5 : 0) + (rng() - 0.5) * 0.3) / n, -1.02, 1.02);
      const size = 0.85 + rng() * 0.3;
      const skin = lay(u + (rng() - 0.5) * 0.012, v, len * size, -v * 0.12 + (rng() - 0.5) * 0.1, 4e-3 + f2 * 4e-3, 7 + rng() * 5);
      const cpg = species.paint ? species.paint.wing("covert", f2, rng()) : null;
      b.add({
        ...specFromLook(covert, rng, 0.8 + 0.4 * rng()),
        ...cpg ? pigmentSpec(cpg, 0.9 + 0.2 * rng()) : null,
        root,
        dir,
        normal: nrm,
        skinNormal: sfc.n,
        iriNormal: nrm,
        width: w * size,
        length: len * size,
        cols: 3,
        rows: 4,
        curl: 0.05 + rng() * 0.08,
        asym: 0,
        ...skin,
        rand: rng(),
        coord: id,
        gain: 0,
        cover: clamp(1 - covert.rowStep, 0.1, 0.9)
      });
    }
  }
  for (let u = 0.42; u < 0.98; u += 0.04) {
    for (const v0 of [-0.82, -0.3, 0.3, 0.82]) {
      const size = 0.85 + rng() * 0.3;
      const skin = lay(u + (rng() - 0.5) * 0.02, v0 + (rng() - 0.5) * 0.2, 0.085 * size, -v0 * 0.1, 2e-3, 4);
      const upg = species.paint ? species.paint.wing("primary", 0.5, rng()) : null;
      b.add({
        ...specFromLook(covert, rng, 0.7 + 0.3 * rng()),
        ...upg ? pigmentSpec({ base: upg.base, tip: upg.base }, 0.8 + 0.2 * rng()) : null,
        root,
        dir,
        normal: nrm,
        skinNormal: sfc.n,
        iriNormal: nrm,
        width: 0.05 * size,
        length: 0.085 * size,
        cols: 3,
        rows: 4,
        curl: 0.04,
        asym: 0,
        ...skin,
        rand: rng(),
        coord: id,
        gain: 0,
        cover: 0.5
      });
    }
  }
  const grid = [];
  for (let i = 0; i <= 26; i++) {
    for (let j = 0; j <= 14; j++) {
      at(i / 20, lerp(-2.2, 2.2, j / 14), sfc);
      grid.push({ p: sfc.p.clone(), n: sfc.n.clone() });
    }
  }
  const P = new THREE.Vector3();
  const clearance = (pt) => {
    let best = grid[0];
    let bd = Infinity;
    for (const g of grid) {
      const d = g.p.distanceToSquared(pt);
      if (d < bd) {
        bd = d;
        best = g;
      }
    }
    return P.copy(pt).sub(best.p).dot(best.n);
  };
  const T = species.tail;
  const ta = T.droop * DEG;
  const tailDir = new THREE.Vector3(0, -Math.sin(ta), -Math.cos(ta));
  const tailUp = new THREE.Vector3(0, Math.cos(ta), -Math.sin(ta));
  const meet = loft.center(species.spine.tail, new THREE.Vector3()).addScaledVector(tailDir, T.length[1] * W.rest.cross[0]).addScaledVector(tailUp, 0.035);
  meet.x = W.rest.cross[1] * sg;
  if (sg > 0) meet.addScaledVector(tailUp, 0.014);
  const tip = new THREE.Vector3();
  const out = new THREE.Vector3();
  const blades = [];
  const wp = species.paint;
  for (let j = 0; j < W.secondaries; j++) {
    const f2 = j / (W.secondaries - 1);
    blades.push({ u: lerp(0.2, 0.3, f2), v: lerp(0.82, 0.3, f2), w: 0.066, reach: 1, to: null, len: lerp(0.19, 0.27, f2), dv: -0.3, asym: 0.15, pg: wp ? wp.wing("secondary", 1 - f2, rng()) : null });
  }
  for (let i = 0; i < W.primaries; i++) {
    const f2 = i / (W.primaries - 1);
    blades.push({ u: lerp(0.3, 0.42, f2), v: lerp(0.25, -0.8, f2), w: lerp(0.068, 0.05, f2), reach: lerp(0.52, 1, Math.pow(f2, 0.8)), to: meet.clone().addScaledVector(tailUp, (1 - f2) * 0.05).addScaledVector(tailDir, -(1 - f2) * 0.02), len: 0, dv: 0, asym: lerp(0.2, 0.45, f2), pg: wp ? wp.wing("primary", f2, rng()) : null });
  }
  blades.forEach((bl, k) => {
    const q = at(bl.u, bl.v, sfc);
    const lift = 0.016 - k * 7e-4;
    root.copy(sfc.p).addScaledVector(sfc.n, lift);
    out.copy(sfc.n);
    let len = bl.len;
    if (bl.to) {
      tip.copy(bl.to);
      len = tip.distanceTo(root) * bl.reach;
    } else {
      at(bl.u + len / span, bl.v + bl.dv, sfc2);
      tip.copy(sfc2.p).addScaledVector(sfc2.n, lift);
      out.add(sfc2.n).normalize();
    }
    const curl = 0.035;
    for (let it = 0; it < 60; it++) {
      dir.copy(tip).sub(root).normalize();
      nrm.copy(out).addScaledVector(dir, -out.dot(dir)).normalize();
      let ok = true;
      for (const t of [0.25, 0.45, 0.65, 0.85, 1]) {
        P.copy(root).addScaledVector(dir, t * len).addScaledVector(nrm, -curl * len * t * t);
        if (clearance(P.clone()) < 5e-3 + 0.012 * t - k * 3e-4) {
          ok = false;
          break;
        }
      }
      if (ok) break;
      tip.addScaledVector(out, 5e-3);
    }
    const sk = loft.skin(clamp(q.s, 0.02, loft.sMax), q.ang);
    const j = 0.75 + rng() * 0.5;
    b.add({
      root,
      dir,
      normal: nrm,
      skinNormal: null,
      iriNormal: nrm,
      width: bl.w,
      length: len,
      cols: 3,
      rows: 9,
      round: 0.75,
      cup: 0.1,
      curl,
      asym: bl.asym * sg,
      base: base.clone().multiplyScalar(j),
      tip: base.clone().multiplyScalar(j * 0.8),
      iri: sheen,
      iri2: sheen,
      iriStrength: wp ? 0 : 0.22,
      iriPower: 2.5,
      ...bl.pg ? pigmentSpec(bl.pg, 0.92 + 0.16 * rng(), true) : null,
      loose: 0,
      widen: 0.2,
      bones: skinIdx(rig, sk.bones),
      weights: sk.weights,
      rand: rng(),
      coord: id,
      gain: 0,
      cover: sg > 0 ? 0.2 : 0.8,
      channel: CH_FLIGHT
    });
  });
}
function addTail(b, rig, rng) {
  const T = rig.species.tail;
  const base = col(T.color);
  const sheen = col(4609132);
  const X2 = new THREE.Vector3();
  const Y2 = new THREE.Vector3();
  const Z2 = new THREE.Vector3();
  for (const r of rig.rectrices) {
    const rest = rig.rest[r.bone.name];
    new THREE.Matrix4().makeRotationFromQuaternion(rest.worldQuat).extractBasis(X2, Y2, Z2);
    const f2 = (Math.abs(r.k) - 0.5) / Math.max(T.rectrices - 1, 1);
    const j = 0.85 + rng() * 0.3;
    b.add({
      root: rest.worldPos,
      dir: Z2,
      normal: Y2,
      skinNormal: null,
      iriNormal: Y2,
      width: T.width,
      length: lerp(T.length[0], T.length[1], Math.pow(f2, 1.4)),
      cols: 5,
      rows: 14,
      round: 1,
      cup: 0.06,
      curl: 0.01,
      asym: 0.12 * Math.sign(r.k),
      base: base.clone().multiplyScalar(j),
      tip: base.clone().multiplyScalar(j * 0.8),
      // the central pair, uppermost on the closed tail, carries a little of the back's green
      iri: f2 < 0.1 ? col(2058840) : sheen,
      iri2: sheen,
      iriStrength: rig.species.paint ? 0 : f2 < 0.1 ? 0.13 : 0.2,
      iriPower: 3,
      ...rig.species.paint?.tail(f2) ? pigmentSpec(rig.species.paint.tail(f2), 0.94 + 0.12 * rng(), true) : null,
      loose: 0,
      widen: 0.45,
      bones: [rig.index(r.bone.name), 0, 0, 0],
      weights: [1, 0, 0, 0],
      rand: rng(),
      coord: 1,
      gain: 0,
      cover: r.k > 0 ? 0.8 : 0.2,
      channel: CH_FLIGHT
    });
  }
}
function buildFuzz(rig, layers = 3, rings = 120, segs = 80) {
  const { loft, species } = rig;
  const b = new Builder();
  const sfc = { p: new THREE.Vector3(), n: new THREE.Vector3(), t: new THREE.Vector3() };
  const P = new THREE.Vector3();
  const prev = new Float32Array(segs + 1);
  const pts = Array.from({ length: segs + 1 }, () => new THREE.Vector3());
  const iriN = new THREE.Vector3();
  const rng = mulberry32(species.seed + 99);
  const COLUMNS = 560;
  const sTop = loft.sMax - 0.12;
  const grid = [];
  for (let i = 0; i <= rings; i++) {
    const s = sTop - i / rings * (sTop - 0.05);
    for (let j = 0; j <= segs; j++) {
      const a = j / segs * Math.PI * 2;
      loft.surface(s, a, sfc);
      if (i > 0) prev[j] += pts[j].distanceTo(sfc.p);
      pts[j].copy(sfc.p);
      grid.push({ p: sfc.p.clone(), n: sfc.n.clone(), d: prev[j], s, a });
    }
  }
  for (let L = 0; L < layers; L++) {
    const lf = layers > 1 ? L / (layers - 1) : 0;
    const height = lerp(8e-3, 0.03, lf);
    const start = b.pos.length / 3;
    for (let k = 0; k < grid.length; k++) {
      const g = grid[k];
      const j = k % (segs + 1);
      const phi2 = g.a <= Math.PI ? g.a / Math.PI : (2 * Math.PI - g.a) / Math.PI;
      const look = lookAt(species, g.s, phi2);
      const tone = toneAt(species, look, g.s, phi2);
      const { gold, glit } = tone;
      const shade = tone.shade * wingShadow(loft, g.s, g.a);
      let fuzz = look.fuzz ?? Math.min(0.55 + (look.loose ?? 0) * 0.6, 1);
      for (const side of SIDES) fuzz *= smoothstep(species.eye.radius * 1.25, species.eye.radius * 2.1, g.p.distanceTo(rig.eyes[side].center));
      fuzz *= 1 - smoothstep(loft.sMax - 0.7, loft.sMax - 0.2, g.s);
      {
        const wuv = loft.wingUV(g.s, g.a);
        if (wuv.u > 0.02 && wuv.u < 0.99) fuzz *= smoothstep(0.85, 1.15, Math.abs(wuv.v));
      }
      const sp = specFromLook(look, rng, shade, gold, species.shading.gold, glit);
      const fpg = species.paint ? species.paint.body(g.s, phi2, 0.5) : null;
      if (fpg) {
        sp.base.set(fpg.base).multiplyScalar(shade);
        sp.tip.set(fpg.tip).multiplyScalar(shade);
      }
      iriNormal(iriN, g.n, look);
      P.copy(g.p).addScaledVector(g.n, height * (0.5 + 0.5 * Math.min(fuzz * 2, 1)) * clamp(look.width / 0.03, 0.4, 1));
      const sk = loft.skin(g.s, g.a);
      b.pos.push(P.x, P.y, P.z);
      b.nor.push(g.n.x, g.n.y, g.n.z);
      b.uv.push(j / segs * COLUMNS, g.d);
      b.root.push(P.x, P.y, P.z);
      b.hinge.push(1, 0, 0);
      b.data.push(lf, loft.bodyCoord(g.s) * 0.8, look.lift, CH_FUZZ);
      b.pat.push(-1, 0, 0);
      b.iriN.push(iriN.x, iriN.y, iriN.z);
      b.cBase.push(sp.base.r, sp.base.g, sp.base.b, look.fine ? 0 : look.iriStrength * glit * (1 + gold) / 4);
      b.cTip.push(sp.tip.r, sp.tip.g, sp.tip.b, fuzz);
      b.cIri.push(sp.iri.r, sp.iri.g, sp.iri.b, look.iriPower / 32);
      b.cIri2.push(sp.iri2.r, sp.iri2.g, sp.iri2.b, lf);
      b.si.push(...skinIdx(rig, sk.bones));
      b.sw.push(...sk.weights);
    }
    for (let i = 0; i < rings; i++) {
      for (let j = 0; j < segs; j++) {
        const a = start + i * (segs + 1) + j;
        const c = a + segs + 1;
        b.idx.push(a, c, a + 1, c, c + 1, a + 1);
      }
    }
  }
  return b;
}
function buildPlumageGeometry(rig) {
  const rng = mulberry32(rig.species.seed);
  const contour = new Builder();
  addContour(contour, rig, rng);
  addGorget(contour, rig, rng);
  addCrest(contour, rig, rng);
  const flight = new Builder();
  for (const side of SIDES) {
    addWing(flight, rig, side, rng);
    addRestWing(flight, rig, side, rng);
  }
  addTail(flight, rig, rng);
  const fuzz = buildFuzz(rig, rig.species.fuzzLayers ?? 3);
  return {
    contour: contour.build(),
    flight: flight.build(),
    fuzz: fuzz.build()
  };
}
function buildSkinGeometry(rig, rings = 64, segs = 36, inset = 7e-3) {
  const sfc = { p: new THREE.Vector3(), n: new THREE.Vector3(), t: new THREE.Vector3() };
  const { loft } = rig;
  const pos = [];
  const colr = [];
  const paint = rig.species.paint;
  const tint = new THREE.Color();
  const si = [];
  const sw = [];
  const idx = [];
  const p2 = new THREE.Vector3();
  for (let i = 0; i <= rings; i++) {
    const s = i / rings * loft.sMax;
    for (let j = 0; j <= segs; j++) {
      const ang = j / segs * Math.PI * 2;
      const sk = loft.skin(s, ang);
      loft.surface(s, ang, sfc);
      p2.copy(sfc.p).addScaledVector(sfc.n, -inset);
      pos.push(p2.x, p2.y, p2.z);
      if (paint) {
        const pg = paint.body(s, ang <= Math.PI ? ang / Math.PI : 2 - ang / Math.PI, 0.5);
        tint.set(pg ? pg.base : 1840662).multiplyScalar(0.45);
        colr.push(tint.r, tint.g, tint.b);
      }
      si.push(...skinIdx(rig, sk.bones));
      sw.push(...sk.weights);
    }
  }
  for (let i = 0; i < rings; i++) {
    for (let j = 0; j < segs; j++) {
      const sMid = (i + 0.5) / rings * loft.sMax;
      if (!paint && sMid > 4.3 && sMid < 9 && Math.cos((j + 0.5) / segs * Math.PI * 2) > -0.25) continue;
      const a = i * (segs + 1) + j;
      const b = a + segs + 1;
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  if (paint) g.setAttribute("color", new THREE.Float32BufferAttribute(colr, 3));
  g.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(si, 4));
  g.setAttribute("skinWeight", new THREE.Float32BufferAttribute(sw, 4));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
const DEFORM_DECL = (
  /* glsl */
  `
attribute vec3 aRoot;
attribute vec3 aHinge;
attribute vec4 aData; // rand, body coord, lift gain, channel
uniform float uFluff;
uniform float uLift[8];
uniform float uGorget;
uniform float uCrest;
uniform vec2 uWingSpread;
uniform vec2 uWingLift;
uniform vec4 uWingOut;
uniform vec3 uWingPivot;
uniform vec3 uWingSpan;
uniform vec3 uWingChord;
vec3 rotAxis(vec3 v, vec3 k, float c, float s) { return v * c + cross(k, v) * s + k * dot(k, v) * (1.0 - c); }
// the resting wing swung off the flank: twist about its length, then out about its chord
vec3 wingSwing(vec3 v, bool right) {
  vec2 a = right ? vec2(uWingOut.z, -uWingOut.w) : vec2(-uWingOut.x, uWingOut.y);
  vec3 m = vec3(right ? -1.0 : 1.0, 1.0, 1.0);
  v = rotAxis(v, uWingSpan * m, cos(a.y), sin(a.y));
  return rotAxis(v, uWingChord * m, cos(a.x), sin(a.x));
}`
);
const DEFORM_BODY = (
  /* glsl */
  `
float fCoord = clamp(aData.y, 0.0, 1.0) * 7.0;
float fI = floor(min(fCoord, 6.0));
float fWave = mix(uLift[int(fI)], uLift[int(fI) + 1], fCoord - fI);
float fAng = aData.z * (uFluff + fWave) * (0.6 + 0.8 * aData.x);
fAng += (aData.w > 0.5 && aData.w < 1.5 ? uGorget : 0.0) + (aData.w > 1.5 && aData.w < 2.5 ? uCrest : 0.0);
// wings: ids 2/3 = the resting wing on the body (left/right), 4/5 = the real blades
bool fRest = aData.y > 1.5 && aData.y < 3.5;
bool fReal = aData.y > 3.5;
bool fRight = aData.y > 2.5 && aData.y < 3.5 || aData.y > 4.5;
float fSpread = fRight ? uWingSpread.y : uWingSpread.x;
float fUnfold = smoothstep(0.03, 0.35, fSpread);
// past fully spread the wing is beating too fast to see: the blades go, a blur fan stands in
float fBeat = 1.0 - smoothstep(1.2, 1.6, fSpread);
if (fRest) fAng += (fRight ? uWingLift.y : uWingLift.x) * (0.5 + aData.x);
float fC = cos(fAng), fS = sin(fAng);`
);
const DEFORM_WING = (
  /* glsl */
  `
vec3 transformed = aData.w > 3.5 ? position + normal * max(fAng, -0.1) * 0.05 : aRoot + rotAxis(position - aRoot, aHinge, fC, fS);
// as the wing spreads the resting wing sinks into the body and the real blades grow out of it
if (fRest) {
  vec3 fPivot = vec3(fRight ? -uWingPivot.x : uWingPivot.x, uWingPivot.yz);
  transformed = fPivot + wingSwing(transformed - fPivot, fRight);
  transformed = mix(transformed, aRoot - normal * 0.03, fUnfold);
}
if (fReal) transformed = mix(aRoot, transformed, fUnfold * fBeat);
`
);
function createPlumageMaterial() {
  const uniforms = {
    uFluff: { value: 0 },
    uLift: { value: new Float32Array(8) },
    uGorget: { value: 0 },
    uCrest: { value: 0 },
    uWingSpread: { value: new THREE.Vector2() },
    uWingLift: { value: new THREE.Vector2() },
    uWingOut: { value: new THREE.Vector4() },
    uWingPivot: { value: new THREE.Vector3() },
    uWingSpan: { value: new THREE.Vector3(0, 0, -1) },
    uWingChord: { value: new THREE.Vector3(0, 1, 0) },
    uFlash: { value: 1 },
    uGlint: { value: 1 },
    uPal: { value: [new THREE.Matrix3(), new THREE.Matrix3(), new THREE.Matrix3(), new THREE.Matrix3()] }
  };
  const material = new THREE.MeshStandardMaterial({ color: 16777215, roughness: 0.6, metalness: 0, side: THREE.DoubleSide, alphaToCoverage: true });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader.replace(
      "#include <common>",
      /* glsl */
      `#include <common>
${DEFORM_DECL}
attribute vec3 aIriN;
attribute vec4 aBase;
attribute vec4 aTip;
attribute vec4 aIri;
attribute vec4 aIri2;
attribute vec3 aPat;
uniform mat3 uPal[4];
varying vec3 vPat;
varying vec2 vFUv;
varying vec3 vFData;
varying vec4 vBase;
varying vec4 vTip;
varying vec4 vIri;
varying vec4 vIri2;
varying vec3 vIriN;`
    ).replace(
      "#include <beginnormal_vertex>",
      /* glsl */
      `${DEFORM_BODY}
vec3 objectNormal = rotAxis(normal, aHinge, fC, fS);
vec3 fIriN = rotAxis(aIriN, aHinge, fC, fS);
if (fRest) { objectNormal = wingSwing(objectNormal, fRight); fIriN = wingSwing(fIriN, fRight); }
vFUv = uv; vFData = vec3(aData.x, aData.w, fAng); vPat = aPat;
vBase = aBase; vTip = aTip; vIri = aIri; vIri2 = aIri2;
// the palette: per vertex, so it costs nothing in the fragment shader
if (aData.w > 0.5 && aData.w < 2.5) {
  mat3 m = aData.w < 1.5 ? uPal[0] : uPal[1];
  vIri.rgb = max(m * vIri.rgb, 0.0); vIri2.rgb = max(m * vIri2.rgb, 0.0);
  vBase.rgb = max(m * vBase.rgb, 0.0); vTip.rgb = max(m * vTip.rgb, 0.0);
}
else {
  vBase.rgb = max(uPal[2] * vBase.rgb, 0.0); vTip.rgb = max(uPal[2] * vTip.rgb, 0.0);
  vIri.rgb = max(uPal[3] * vIri.rgb, 0.0); vIri2.rgb = max(uPal[3] * vIri2.rgb, 0.0);
}`
    ).replace(
      "#include <skinnormal_vertex>",
      /* glsl */
      `#include <skinnormal_vertex>
#ifdef USE_SKINNING
  fIriN = (skinMatrix * vec4(fIriN, 0.0)).xyz;
#endif
vIriN = normalize(normalMatrix * fIriN);`
    ).replace("#include <begin_vertex>", DEFORM_WING);
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <common>",
      /* glsl */
      `#include <common>
uniform float uFlash;
uniform float uGlint;
varying vec3 vPat;
varying vec2 vFUv;
varying vec3 vFData;
varying vec4 vBase;
varying vec4 vTip;
varying vec4 vIri;
varying vec4 vIri2;
varying vec3 vIriN;
float fIriMask;
float fBarb;
float fEdge;
float fBarbRand;
float fBarbHue;
float fSoft;
float fTilt;
float fFuzz;`
    ).replace(
      "#include <color_fragment>",
      /* glsl */
      `#include <color_fragment>
{
  fFuzz = vFData.y > 3.5 ? 1.0 : 0.0;
  if (fFuzz > 0.5) {
    // hairs: thin tapered dashes in columns that run the way the feathers lie, two
    // sets of columns over each other so no grid shows
    float layer = vIri2.a;
    float density = vTip.a * mix(1.0, 0.55, layer);
    // hairs wander together in slow waves, so the coat has locks, not a comb pattern
    float sway = sin(vFUv.y * 11.0 + floor(vFUv.x * 0.07) * 2.1) * 1.3 + sin(vFUv.y * 4.3 + vFUv.x * 0.021) * 2.2;
    float alpha = 0.0, tone = 0.5, dash = 0.0, pick = 0.5;
    // the plushest tracts (belly, flanks, the velvet face): hairs nearly of one tone
    float plush = smoothstep(0.82, 1.0, vTip.a);
    for (int o = 0; o < 2; o++) {
      float fo = float(o);
      float cx = (vFUv.x + sway) * (1.0 + 0.63 * fo) + fo * 17.3 + layer * 5.7;
      float colId = floor(cx);
      float hc = fract(sin(colId * 12.9898 + fo * 4.1 + layer * 9.7) * 43758.5453);
      float len = mix(0.018, 0.045, hc);
      float sy = vFUv.y / len + hc * 13.0;
      float seg = floor(sy), fy = fract(sy);
      float hs = fract(sin((colId + seg * 57.0) * 78.233 + fo * 1.7) * 24634.6345);
      float fx = fract(cx) - 0.5 + (hs - 0.5) * 0.5 * fy + sin(vFUv.y * 70.0 + hc * 40.0) * 0.12;
      float w = 1.0 - smoothstep(0.14, 0.36, abs(fx));
      float taper = smoothstep(0.0, 0.12, fy) * (1.0 - smoothstep(0.5, 1.0, fy));
      float a = step(1.0 - density, hs) * w * taper;
      if (a > alpha) { alpha = a; tone = fract(hs * 7.31); dash = smoothstep(0.25, 0.5, fy) * (1.0 - smoothstep(0.5, 0.8, fy)) * w; pick = fract(hs * 3.17 + hc); }
    }
    // too far to resolve single hairs: their average
    float lodF = clamp(fwidth(vFUv.x) * 1.3, 0.0, 1.0);
    alpha = mix(alpha, density * 0.45, lodF);
    // seen edge-on a shell is a film, not hairs: let it go, the frayed feathers make the outline
    alpha *= smoothstep(0.34, 0.74, abs(dot(normalize(vNormal), normalize(vViewPosition))));
    diffuseColor.rgb = mix(vBase.rgb, vTip.rgb, 0.75) * mix(mix(0.55, 0.75, plush) + mix(0.9, 0.4, plush) * tone, mix(1.0, 0.95, plush), lodF);
    // break up the coverage steps with a little screen noise, or they show as dotted bands
    float ign = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
    diffuseColor.a = clamp(alpha + (ign - 0.5) * 0.3 * min(alpha * 3.0, 1.0), 0.0, 1.0);
    fBarb = 0.0; fEdge = 0.0; fSoft = 1.0; fTilt = 0.35;
    fBarbRand = mix(pick, 0.5, lodF);
    fBarbHue = mix(tone, 0.5, lodF);
    // glints are short dashes on some hairs, not tiles
    fIriMask = mix(step(0.62, pick) * dash * 2.6, 0.4, lodF);
  } else {
  float u = vFUv.x, v = vFUv.y, au = abs(vFUv.x);
  float rnd = vFData.x;
  bool flight = vFData.y > 2.5;
  bool scale = vFData.y > 0.5 && !flight; // gorget, crown: crisp closed vanes
  // gorget scales are scallops whose uv is their true shape: u across, v along, the free
  // edge a semicircle of radius 1 about (0, 0.5)
  bool scallop = scale && vFData.y < 1.5;
  float loose = flight ? 0.0 : vTip.a;
  // the plush underparts (belly, flanks, down): one soft surface, the feathers only just told apart
  float plush = scale ? 0.0 : smoothstep(0.62, 0.85, loose);
  fEdge = 0.0;
  fBarbRand = 0.5;
  // barbs, one per 2 PI of arg. On a blade they run diagonally off the shaft. On contour
  // feathers and scales they are a fan: fine parallel strands that splay from behind the
  // root, like the teeth of a comb or the ribs of a scallop, the outer ones running off
  // the side of the vane before the tip.
  float outline = mix(0.5, 1.0, smoothstep(0.0, 0.5, v)) * pow(max(1.0 - pow(clamp((v - 0.5) / 0.5, 0.0, 1.0), 1.9), 0.0), 0.53);
  float fanX = u * outline / (v + 0.4) * 1.4;
  // a scallop's ridges are its barbs: they fan out a little from the root, the whole comb
  // bends to one side, the spacing is uneven and every scale has its own count
  float sFan = u / (0.5 + 0.6 * v);
  sFan += (fract(rnd * 23.7) - 0.5) * 0.5 * v * v;
  sFan += 0.035 * sin(sFan * 9.0 + rnd * 40.0 + v * 2.5) + 0.018 * sin(sFan * 23.0 + rnd * 91.0 - v * 4.0);
  float arg = scallop ? sFan * mix(8.0, 12.5, fract(rnd * 57.3)) * 6.2832 + rnd * 6.28 : flight ? v * 520.0 - au * 38.0 + rnd * 6.28 : fanX * (scale ? 7.0 : mix(8.5, 6.5, loose)) * 6.2832 + rnd * 6.28;
  float fw = fwidth(arg);
  float lod = smoothstep(1.2, 3.0, fw); // 0 = barbs resolved, 1 = sub-pixel
  float id = floor(arg / 6.2832 + 0.5);
  // a thin bright strand with a dark gap either side
  float h = fract(sin(id * 12.9898 + rnd * 78.233) * 43758.5453);
  float h2 = fract(sin(id * 39.3468 + rnd * 11.135) * 24634.6345);
  // on a scallop the barbs are broad with a thin groove between, each a little wider or narrower
  float strand = scallop ? smoothstep(0.03 + 0.14 * h, 0.3 + 0.3 * h, 0.5 + 0.5 * cos(arg)) : smoothstep(0.3, 0.78, 0.5 + 0.5 * cos(arg));
  float ridge = 0.5 + 0.5 * cos(arg); // 1 on the barb, 0 in the gap between two
  fBarb = (ridge * 2.0 - 1.0) * (1.0 - lod);
  fBarbRand = mix(h2, 0.5, lod);
  float shaft = 1.0 - smoothstep(0.0, flight ? 0.07 : 0.09, au);
  float fMixK = flight ? 0.5 : mix(smoothstep(0.3, 1.0, v), 0.62 + 0.3 * v, plush);
  // painted species: bars across the vane, or base running into tip where the painter says
  if (vPat.x > 0.5) fMixK = smoothstep(0.3, 0.7, abs(fract(v * vPat.x + 0.25) - 0.5) * 2.0);
  else if (vPat.x > -0.5) fMixK = smoothstep(vPat.y, vPat.y + max(vPat.z, 0.01), v);
  vec3 pig = mix(vBase.rgb, vTip.rgb, fMixK);
  // overlap shadow at the root, where the next feather up covers this one
  // (a lifted feather shows more of itself)
  float cover = vIri2.a * (1.0 - clamp(vFData.z * 1.6, 0.0, 0.8));
  float bare = smoothstep(cover - 0.3, cover + 0.12, v + 0.1 * (1.0 - au));
  float occ = flight ? mix(0.5, 1.0, smoothstep(0.0, 0.25, v)) : mix(scale ? 0.42 : mix(0.74, 0.96, plush), 1.0, bare);
  float edge = scallop ? (v > 0.5 ? length(vec2(u, (v - 0.5) * 2.0)) : au * 0.85) : max(au, (v - 0.55) / 0.45);
  // scales carry a paler fringe on the free edge; soft feathers just vary barb by barb
  float rim = scale ? -smoothstep(0.8, 1.0, edge) * 0.45 : 0.0;
  pig *= occ * (1.0 + (flight ? 0.26 : scale ? 0.35 : 0.0) * fBarb) * (1.0 + rim);
  // soft feathers: the strands carry the colour, between them it is nearly dark
  // (plush feathers: hardly darker between the strands, so no row of them casts a line)
  if (!flight && !scale) pig *= mix(mix(mix(0.3, 0.74, plush), mix(1.3, 1.08, plush), strand), 0.86, lod) * (0.88 + 0.24 * mix(h, 0.5, lod));
  fBarbHue = flight || scale ? 0.5 : mix(0.55 * fract(rnd * 5.31) + 0.45 * fract(h2 * 3.7 + h), 0.5, lod * 0.6);
  if (!flight && !scale) {
    // per feather, subtle: a touch warmer or cooler, lighter or darker,
    // and now and then a worn pale tip
    float r1 = fract(rnd * 17.13);
    float r2 = fract(rnd * 41.71);
    pig *= mix(vec3(1.05, 0.98, 0.93), vec3(0.95, 0.98, 1.06), r1);
    pig *= mix(0.87 + 0.26 * r2, 0.76 + 0.08 * r2, plush);
    pig *= 1.0 + 0.2 * step(0.95, fract(rnd * 7.73)) * smoothstep(0.6, 1.0, v);
  }
  if (flight) {
    // blades lie in a stack: each shows a strip along one edge. Shade across that strip
    // (dark where the neighbour sits on it, a paler line on the free edge) so the stack
    // reads as separate feathers. Seen from underneath the other edge is the free one.
    float lead = u * sign(vIri2.a - 0.5) * (gl_FrontFacing ? 1.0 : -1.0);
    float strip = smoothstep(-0.5, 1.0, lead);
    // each feather its own tone, a touch warmer or cooler than the next
    pig *= mix(vec3(1.12, 0.96, 0.9), vec3(0.9, 0.96, 1.12), rnd);
    pig *= mix(0.42, 1.25, strip * strip);
    // rachis: a pale quill line, fading out toward the tip, with a dark groove beside it
    float quill = 1.0 - smoothstep(0.012, 0.05, au);
    float groove = smoothstep(0.03, 0.07, au) * (1.0 - smoothstep(0.07, 0.16, au));
    pig *= 1.0 - 0.3 * groove;
    pig = mix(pig, vBase.rgb * 2.6 + 0.004, quill * (1.0 - smoothstep(0.55, 0.95, v)) * 0.85);
    // paler worn edge
    pig += vBase.rgb * 1.2 * smoothstep(0.8, 0.98, lead) + vBase.rgb * 0.5 * smoothstep(0.88, 1.0, au);
    // the underside of a blade is paler and catches the light from below
    if (!gl_FrontFacing) pig = pig * 2.0 + vec3(0.006, 0.006, 0.008) * (0.4 + strip);
    fEdge = (smoothstep(0.8, 0.97, lead) + 0.35 * smoothstep(0.9, 1.0, au)) * (gl_FrontFacing ? 0.3 : 1.0);
  } else {
    pig *= mix(1.0, 0.72, shaft * (scallop ? 0.0 : 0.7 - 0.5 * plush));
    if (!scale) {
      // dust: on a few feathers a white speck, a short thread of lint lying any which way,
      // or a wisp of pale down; commoner on the dark upper parts. Each fades out before it
      // gets thinner than a pixel, so it never sparkles.
      float dark = 1.0 - smoothstep(0.004, 0.02, dot(vBase.rgb, vec3(0.3, 0.5, 0.2)));
      float pick = fract(rnd * 91.7);
      float px = fwidth(v) + 1e-5;
      vec2 sc = vec2(fract(rnd * 13.3) * 1.1 - 0.55, 0.45 + 0.4 * fract(rnd * 29.1));
      vec2 d = vec2((u - sc.x) * 0.55, v - sc.y);
      float speck = step(1.0 - mix(0.006, 0.02, dark), pick) * (1.0 - smoothstep(0.035, 0.085, length(d))) * clamp(0.06 / px - 0.4, 0.0, 1.0);
      float la = fract(rnd * 47.3) * 3.1416;
      vec2 ld = vec2(cos(la), sin(la));
      float along = dot(d, ld), across = dot(d, vec2(-ld.y, ld.x)) + 0.05 * sin(along * 9.0 + rnd * 20.0);
      float lint = step(pick, mix(0.004, 0.016, dark)) * (1.0 - smoothstep(0.012, 0.03, abs(across))) * (1.0 - smoothstep(0.2, 0.3, abs(along))) * clamp(0.022 / px - 0.4, 0.0, 1.0);
      float tuft = step(0.5, pick) * step(pick, 0.5 + mix(0.001, 0.004, dark)) * (1.0 - smoothstep(0.1, 0.3, length(d))) * (0.4 + 0.6 * strand) * clamp(0.15 / px - 0.4, 0.0, 1.0);
      pig = mix(pig, vec3(0.5, 0.5, 0.48), max(speck, lint) * 0.9);
      pig = mix(pig, vec3(0.3, 0.27, 0.27), tuft * 0.8);
    }
  }
  diffuseColor.rgb = pig;
  #ifdef ALPHA_TO_COVERAGE
  if (!flight) {
    float aa = max(fwidth(edge), 1e-4);
    // every barb ends at its own length, and now and then the vane splits
    float cut = mix(scale ? 0.7 : mix(0.62, 0.45, loose), 1.03, h * h) - (h2 < 0.05 + 0.1 * loose ? 0.45 : 0.0);
    // a scallop's rim is a comb: each barb stops at its own length, the grooves open between them
    if (scallop) cut = 1.0 - 0.13 * h2 * h2 - (h < 0.07 ? 0.12 : 0.0);
    float alive = 1.0 - smoothstep(cut - aa, cut + aa, edge);
    if (scallop) alive *= 1.0 - (1.0 - strand) * smoothstep(0.78, 0.93, edge);
    // toward the edge of a soft feather the barbs stand apart: you see between them
    float open = scale ? 0.0 : smoothstep(mix(0.55, 0.1, loose), mix(0.95, 0.7, loose), max(edge, v * 0.9)) * mix(0.75, 1.0, loose);
    float gap = (1.0 - strand) * open;
    float fine = alive * (1.0 - gap);
    // too far to resolve barbs: the same thing on average, a soft feathered outline
    float far = 1.0 - smoothstep(mix(0.82, 0.5, loose), 1.06, edge) * mix(0.35, 0.8, loose);
    diffuseColor.a = mix(fine, far, lod);
  } else {
    // a few barbs have come unzipped near the edge of the vane
    float notch = step(h2, 0.035) * smoothstep(0.55, 0.75, au) * (1.0 - lod);
    diffuseColor.a = 1.0 - notch * smoothstep(0.2, 0.5, 1.0 - ridge);
  }
  #endif
  // structural colour: on scales the whole exposed disc; on soft feathers it sits on the
  // barbs, so it glitters in streaks rather than tiling
  // every strand shines, some much more than others; too far to tell them apart, their
  // average, with the odd single-feather sparkle so velvet still glints
  float streak = mix(strand * (0.25 + 2.3 * h * h), 0.55 * (1.0 + 1.6 * step(0.9, fract(rnd * 3.77))), lod);
  // scales: the flash runs in fine ridges with dark lines between, still a hint of them when tiny,
  // and a dark line where the scale's free edge lies over the next
  float scaleEdge = 1.0 - 0.6 * smoothstep(0.8, 1.0, edge);
  // (a scallop's covered root still glows a little, so a gap in the row above is not a black hole)
  fIriMask = flight ? 1.0 : scale ? (scallop ? mix(0.3, 1.0, bare) : bare) * mix((0.3 + 0.95 * strand) * (scallop ? 0.62 + 0.85 * h * h : 1.0), 0.62 + 0.18 * ridge, lod) * (1.0 - (scallop ? 0.0 : 0.3) * shaft) * scaleEdge : bare * streak;
  fSoft = (flight || scale) ? 0.0 : 1.0;
  // every barb of a scallop is its own little mirror too, if a steadier one
  fTilt = scallop ? 0.16 : fSoft * 0.35;
  }
}`
    ).replace(
      "#include <roughnessmap_fragment>",
      /* glsl */
      `#include <roughnessmap_fragment>
roughnessFactor = clamp((vFData.y > 3.5 ? 0.95 : vFData.y > 2.5 ? 0.8 : vFData.y > 0.5 ? 0.55 : 0.92) + 0.06 * fBarb, 0.08, 1.0);`
    ).replace(
      "#include <aomap_fragment>",
      /* glsl */
      `#include <aomap_fragment>
{
  vec3 nI = normalize(vIriN + vec3(0.0, 0.0, 1e-5));
  vec3 V = geometryViewDir;
  // on soft feathers every barb is its own little mirror, tilted a bit differently
  float c = clamp(dot(nI, V) + (fBarbRand - 0.5) * fTilt, 0.0, 1.0);
  float power = vIri.a * 32.0;
  float strength = vBase.a * 4.0;
  // hue slides with the angle of incidence
  vec3 colV = mix(vIri2.rgb, vIri.rgb, smoothstep(0.3, 0.8, c));
  // strand by strand the green leans gold or teal
  float fGold = fSoft * clamp((0.4 - fBarbHue) / 0.4, 0.0, 1.0) * 0.85;
  float fTeal = fSoft * clamp((fBarbHue - 0.68) / 0.32, 0.0, 1.0) * 0.6;
  colV = mix(colV, vec3(colV.g * 1.15, colV.g * 1.05, colV.b * 0.25), fGold);
  colV = mix(colV, vec3(colV.r * 0.5, colV.g * 0.95, colV.g * 0.95), fTeal);
  float lobeV = pow(c, power);
  vec3 ambient = (irradiance + iblIrradiance) * RECIPROCAL_PI;
  vec3 flash = colV * lobeV * (ambient * 2.2 + 0.05) * uFlash;
  #if NUM_DIR_LIGHTS > 0
  for (int i = 0; i < NUM_DIR_LIGHTS; i++) {
    vec3 H = normalize(directionalLights[i].direction + V);
    float nh = max(dot(nI, H), 0.0);
    float cl = max(dot(nI, directionalLights[i].direction), 0.0);
    vec3 colL = mix(vIri2.rgb, vIri.rgb, smoothstep(0.3, 0.8, nh));
    colL = mix(colL, vec3(colL.g * 1.15, colL.g * 1.05, colL.b * 0.25), fGold);
    colL = mix(colL, vec3(colL.r * 0.5, colL.g * 0.95, colL.g * 0.95), fTeal);
    flash += colL * pow(nh, power * 8.0) * cl * directionalLights[i].color * 0.35 * uGlint;
  }
  #endif
  // structural colour saturates, it never goes white: a soft ceiling on the
  // brightest channel, all three scaled alike so the hue holds
  // (the ceiling on the flash itself, the ridge and edge mask after it, so the ridges keep their contrast)
  vec3 fl = max(flash * strength, vec3(0.0));
  float fm = max(max(fl.r, fl.g), fl.b);
  fl *= 1.0 / (1.0 + fm / 0.55);
  totalEmissiveRadiance += fl * fIriMask;
  // the free edge of a blade is thin and a little translucent: it picks up the sky
  totalEmissiveRadiance += vec3(0.55, 0.6, 0.75) * fEdge * (ambient * 0.22 + 0.003);
  // downy edge light: thin barbs scatter at grazing angles
  // (clamped: a dot product a hair over 1 would feed pow a negative base, and one NaN
  // pixel becomes a dotted disc once a depth-of-field pass smears it)
  float fres = pow(clamp(1.0 - dot(normal, V), 0.0, 1.0), 3.0);
  reflectedLight.indirectDiffuse += diffuseColor.rgb * ambient * fres * mix(2.5, 1.6, fSoft);
  // matte coat: soft feathers keep almost no mirror highlight
  bool blade = vFData.y > 2.5 && vFData.y < 3.5;
  // even the show scales only flash through their structural colour, not as mirrors
  reflectedLight.directSpecular *= blade ? 0.18 : fSoft > 0.5 ? 0.06 : 0.22;
  reflectedLight.indirectSpecular *= blade ? 0.12 : fSoft > 0.5 ? 0.06 : 0.3;
}`
    );
  };
  material.customProgramCacheKey = () => "plumage-v47";
  return { material, uniforms };
}
function createPlumageDepthMaterial(uniforms) {
  const m = new THREE.MeshDepthMaterial({ side: THREE.DoubleSide });
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader.replace("#include <common>", `#include <common>${DEFORM_DECL}`).replace("#include <begin_vertex>", DEFORM_BODY + DEFORM_WING);
  };
  m.customProgramCacheKey = () => "plumage-depth-v5";
  return m;
}
class PartBuilder {
  constructor(rig) {
    __publicField(this, "rig");
    __publicField(this, "pos", []);
    __publicField(this, "nor", []);
    __publicField(this, "col", []);
    __publicField(this, "uv", []);
    __publicField(this, "si", []);
    __publicField(this, "sw", []);
    __publicField(this, "idx", []);
    this.rig = rig;
  }
  /**
   * Add a geometry authored in `bone` space. `pick` may send a vertex to another bone and
   * `tint` may give it another colour, both from its position in the authoring space.
   */
  add(g, bone, color, pick2, tint) {
    const r = this.rig.rest[bone];
    const m = new THREE.Matrix4().compose(r.worldPos, r.worldQuat, new THREE.Vector3(1, 1, 1));
    const gg = g.index ? g.toNonIndexed() : g.clone();
    const lp = gg.getAttribute("position").clone();
    gg.applyMatrix4(m);
    const p2 = gg.getAttribute("position");
    const n = gg.getAttribute("normal");
    const uv = gg.getAttribute("uv");
    const start = this.pos.length / 3;
    const bi = this.rig.index(bone);
    const q = new THREE.Vector3();
    for (let i = 0; i < p2.count; i++) {
      q.fromBufferAttribute(lp, i);
      const c = tint?.(q) ?? color;
      this.pos.push(p2.getX(i), p2.getY(i), p2.getZ(i));
      this.nor.push(n.getX(i), n.getY(i), n.getZ(i));
      this.col.push(c.r, c.g, c.b);
      this.uv.push(uv ? uv.getX(i) : 0, uv ? uv.getY(i) : 0);
      this.si.push(pick2 ? this.rig.index(pick2(q)) : bi, 0, 0, 0);
      this.sw.push(1, 0, 0, 0);
      this.idx.push(start + i);
    }
    gg.dispose();
    g.dispose();
  }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(this.si, 4));
    g.setAttribute("skinWeight", new THREE.Float32BufferAttribute(this.sw, 4));
    g.setIndex(this.idx);
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.4, 0), 2.5);
    return g;
  }
}
function tube$1(points, radius, up, segs = 10) {
  const pos = [];
  const idx = [];
  const n = points.length;
  const T = new THREE.Vector3();
  const X2 = new THREE.Vector3();
  const Y2 = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    T.copy(points[Math.min(i + 1, n - 1)]).sub(points[Math.max(i - 1, 0)]).normalize();
    X2.crossVectors(up, T).normalize();
    Y2.crossVectors(T, X2);
    const [rx, ry] = radius(i / (n - 1));
    for (let j = 0; j <= segs; j++) {
      const a = j / segs * Math.PI * 2;
      pos.push(
        points[i].x + X2.x * Math.cos(a) * rx + Y2.x * Math.sin(a) * ry,
        points[i].y + X2.y * Math.cos(a) * rx + Y2.y * Math.sin(a) * ry,
        points[i].z + X2.z * Math.cos(a) * rx + Y2.z * Math.sin(a) * ry
      );
    }
  }
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < segs; j++) {
      const a = i * (segs + 1) + j;
      const b = a + segs + 1;
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
function lidShell(r, a0, a1, beta, aboutY = false) {
  const na = 12;
  const nb = 12;
  const pos = [];
  const nor = [];
  const idx = [];
  for (let i = 0; i <= na; i++) {
    const a = lerp(a0, a1, i / na);
    for (let j = 0; j <= nb; j++) {
      const b = lerp(-beta, beta, j / nb);
      let x = Math.sin(b);
      let y = Math.cos(b) * Math.sin(a);
      const z = Math.cos(b) * Math.cos(a);
      if (aboutY) {
        const t = x;
        x = y;
        y = t;
      }
      pos.push(x * r, y * r, z * r);
      nor.push(x, y, z);
    }
  }
  for (let i = 0; i < na; i++) {
    for (let j = 0; j < nb; j++) {
      const a = i * (nb + 1) + j;
      const b = a + nb + 1;
      if (aboutY) idx.push(a, b, a + 1, b, b + 1, a + 1);
      else idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setIndex(idx);
  return g;
}
const LID = {
  upperOpen: 62 * DEG,
  lowerOpen: -72 * DEG,
  nictOpen: 150 * DEG
};
function buildParts(rig) {
  const sp = rig.species;
  const R2 = sp.eye.radius;
  const skinCol = new THREE.Color(sp.skin);
  const up = new THREE.Vector3(0, 1, 0);
  const skinB = new PartBuilder(rig);
  const lidCol = new THREE.Color(2369067);
  const ringCol = new THREE.Color(7829372);
  const beadCol = new THREE.Color(526346);
  for (const side of SIDES) {
    const front = side === "L" ? -1 : 1;
    const SEG = 96;
    const RINGS = 7;
    const pos = [];
    const col2 = [];
    const idx = [];
    const c = new THREE.Color();
    for (let i = 0; i <= SEG; i++) {
      const phi2 = i / SEG * Math.PI * 2;
      const cx = Math.cos(phi2);
      const sy = Math.sin(phi2);
      const pw = cx * front > 0 ? 1.3 : 1.6;
      const inner = 1 / Math.pow(Math.pow(Math.abs(cx) / (43 * DEG), pw) + Math.pow(Math.abs(sy) / (29 * DEG), pw), 1 / pw);
      const outer = 56 * DEG;
      for (let j = 0; j <= RINGS; j++) {
        const t = j / RINGS;
        const th = lerp(inner, outer, t);
        const lip = Math.pow(Math.sin(Math.PI * Math.min(t / 0.5, 1)), 0.6);
        const bead = Math.max(0, Math.sin(phi2 * 38)) * smoothstep(0.12, 0.2, t) * (1 - smoothstep(0.22, 0.32, t));
        const r = R2 * (1.05 + 0.02 * lip + 4e-3 * bead - 0.035 * smoothstep(0.5, 1, t));
        pos.push(Math.sin(th) * cx * r, Math.sin(th) * sy * r, Math.cos(th) * r);
        c.copy(ringCol).multiplyScalar(0.55 + 0.5 * lip).lerp(beadCol, Math.max(bead * 0.35, smoothstep(0.4, 0.6, t)));
        col2.push(c.r, c.g, c.b);
      }
    }
    for (let i = 0; i < SEG; i++) {
      for (let j = 0; j < RINGS; j++) {
        const a0 = i * (RINGS + 1) + j;
        const b0 = a0 + RINGS + 1;
        idx.push(a0, b0, a0 + 1, b0, b0 + 1, a0 + 1);
      }
    }
    const rim = new THREE.BufferGeometry();
    rim.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    rim.setAttribute("color", new THREE.Float32BufferAttribute(col2, 3));
    rim.setIndex(idx);
    rim.computeVertexNormals();
    const flat = rim.toNonIndexed();
    const flatCol = flat.getAttribute("color");
    let k = 0;
    skinB.add(flat, `eye.${side}`, ringCol, null, () => c.fromBufferAttribute(flatCol, k++).clone());
    skinB.add(lidShell(R2 * 1.04, 12 * DEG, 112 * DEG, 78 * DEG), `lidUpper.${side}`, lidCol);
    skinB.add(lidShell(R2 * 1.036, -106 * DEG, 16 * DEG, 78 * DEG), `lidLower.${side}`, lidCol);
  }
  const legCol = new THREE.Color(sp.legs.color);
  const Rp = sp.legs.perchRadius;
  for (const side of SIDES) {
    const sg = sideSign(side);
    const len = rig.tarsusLength;
    skinB.add(
      tube$1([0, 0.25, 0.5, 0.75, 1, 1.15].map((t) => new THREE.Vector3(0, 0, t * len)), (t) => [lerp(0.011, 0.017, t), lerp(0.011, 0.017, t)], up, 8),
      `tarsus.${side}`,
      legCol
    );
    const rt = 85e-4;
    const toe = (i, th0, th1, x0, x1) => {
      const pts = [];
      const N = 14;
      for (let k = 0; k <= N; k++) {
        const t = k / N;
        const th = lerp(th0, th1, t);
        const hook = smoothstep(0.78, 1, t) * 0.012;
        const lift = (1 - smoothstep(0, 0.2, t)) * 0.012;
        const rr = Rp + rt * 0.9 - hook + lift;
        pts.push(new THREE.Vector3(lerp(x0, x1, t), -Rp + rr * Math.cos(th), rr * Math.sin(th)));
      }
      skinB.add(
        tube$1(pts, (t) => {
          const taper = t > 0.78 ? lerp(0.75, 0.08, (t - 0.78) / 0.22) : 1 + 0.12 * Math.sin(t * 22);
          return [rt * taper, rt * taper * 0.9];
        }, new THREE.Vector3(1, 0, 0), 7),
        `toe.${side}.${i}`,
        // every other toe a shade darker
        legCol.clone().multiplyScalar(1 - i % 2 * 0.12)
      );
    };
    const fwd = sp.legs.toe / (Rp + rt);
    toe(1, -0.12, fwd * 0.95, 0, -0.03 * sg);
    toe(2, -0.12, fwd * 1.1, 0, 2e-3 * sg);
    toe(3, -0.12, fwd * 0.98, 0, 0.034 * sg);
    toe(4, 0.05, -fwd * 0.8, 0, -6e-3 * sg);
  }
  const loftGeo = buildSkinGeometry(rig);
  const skinMat = new THREE.MeshStandardMaterial({ color: 16777215, vertexColors: true, roughness: 0.9, envMapIntensity: 0.4, side: THREE.DoubleSide });
  const loftMat = sp.paint ? new THREE.MeshStandardMaterial({ color: 16777215, vertexColors: true, roughness: 1, envMapIntensity: 0.15, side: THREE.DoubleSide }) : new THREE.MeshStandardMaterial({ color: skinCol.clone().multiplyScalar(0.5), roughness: 1, envMapIntensity: 0.15, side: THREE.DoubleSide });
  const loftMesh = new THREE.SkinnedMesh(loftGeo, loftMat);
  loftMesh.name = "bird.skin";
  const bare = new THREE.SkinnedMesh(skinB.build(), skinMat);
  bare.name = "bird.bare";
  const billB = new PartBuilder(rig);
  const B = sp.bill;
  const billCol = new THREE.Color(B.color);
  const mouthCol = new THREE.Color(2493968);
  const taperAt = (tt) => lerp(1, 0.17, Math.pow(tt, 0.8)) * (tt > 0.95 ? lerp(1, 0.05, (tt - 0.95) / 0.05) : 1);
  const mandible = (yOff, ry, rx, lenK) => {
    const pts = [];
    const N = 26;
    for (let k = 0; k <= N; k++) {
      const z = lerp(-0.07, B.length * lenK, k / N);
      const tt = Math.max(z / B.length, 0);
      pts.push(new THREE.Vector3(0, yOff * B.radius * taperAt(tt) - B.droop * tt * tt, z));
    }
    return tube$1(pts, (t) => {
      const tt = Math.max((t * (B.length * lenK + 0.07) - 0.07) / B.length, 0);
      return [B.radius * rx * taperAt(tt), B.radius * ry * taperAt(tt)];
    }, up, 12);
  };
  const seamY = (z) => {
    const tt = Math.max(z / B.length, 0);
    return -B.droop * tt * tt;
  };
  billB.add(mandible(0.4, 0.58, 1, 1), "bill", billCol, null, (p2) => p2.y < seamY(p2.z) + 0.1 * B.radius * taperAt(Math.max(p2.z / B.length, 0)) ? mouthCol : null);
  billB.add(mandible(-0.36, 0.5, 0.9, 0.985), "bill", sp.billLower !== void 0 ? new THREE.Color(sp.billLower) : billCol, () => "jaw", (p2) => p2.y > seamY(p2.z) - 0.1 * B.radius * taperAt(Math.max(p2.z / B.length, 0)) ? mouthCol : null);
  for (const sx of [1, -1]) {
    const web = new THREE.BufferGeometry();
    const x0 = sx * B.radius * 0.8;
    const x1 = sx * B.radius * 0.72;
    web.setAttribute("position", new THREE.Float32BufferAttribute([x0, 2e-4, -0.05, x1, 2e-4, 0.09, x0, -2e-4, -0.05, x1, 2e-4, 0.09, x1, -2e-4, 0.09, x0, -2e-4, -0.05], 3));
    web.setAttribute("normal", new THREE.Float32BufferAttribute([sx, 0, 0, sx, 0, 0, sx, 0, 0, sx, 0, 0, sx, 0, 0, sx, 0, 0], 3));
    billB.add(web, "bill", new THREE.Color(393731), (p2) => p2.y > 0 ? "bill" : "jaw");
  }
  const tongueB = new PartBuilder(rig);
  {
    const tongueCol = new THREE.Color(15979474);
    const z0 = 0.04;
    const z1 = B.length * 0.8;
    const seg = (p2) => p2.z < B.length * 0.5 ? "tongue.1" : p2.z < B.length * 0.7 ? "tongue.2" : "tongue.3";
    const line = (xa, xb, za, zb) => {
      const pts = [];
      for (let k = 0; k <= 14; k++) {
        const z = lerp(za, zb, k / 14);
        const tt = z / B.length;
        const sag = Math.max((tt - 0.55) / 0.25, 0);
        pts.push(new THREE.Vector3(lerp(xa, xb, k / 14), -8e-4 * (1 - tt * 0.7) - B.droop * tt * tt - 28e-4 * sag * sag, z));
      }
      return pts;
    };
    tongueB.add(tube$1(line(0, 0, z0, z1 - 0.012), (t) => [lerp(36e-4, 27e-4, t), lerp(24e-4, 2e-3, t)], up, 8), "bill", tongueCol, seg);
    for (const sx of [1, -1]) {
      tongueB.add(tube$1(line(sx * 11e-4, sx * 15e-4, z1 - 0.02, z1), (t) => [15e-4 * Math.sqrt(1 - t * t * 0.92), 14e-4 * Math.sqrt(1 - t * t * 0.92)], up, 6), "bill", tongueCol, seg);
    }
  }
  const tongueMat = new THREE.MeshPhysicalMaterial({ color: 16777215, vertexColors: true, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.12, sheen: 0.4, sheenColor: 16770272, emissive: 4863540, envMapIntensity: 1.1, side: THREE.DoubleSide });
  const tongue = new THREE.SkinnedMesh(tongueB.build(), tongueMat);
  tongue.name = "bird.tongue";
  const billMat = new THREE.MeshStandardMaterial({ color: 16777215, vertexColors: true, roughness: 0.68, envMapIntensity: 0.35, side: THREE.DoubleSide });
  const bill = new THREE.SkinnedMesh(billB.build(), billMat);
  bill.name = "bird.bill";
  const eyeB = new PartBuilder(rig);
  for (const side of SIDES) {
    const g = new THREE.SphereGeometry(R2, 40, 28);
    g.rotateX(Math.PI / 2);
    const p2 = g.getAttribute("position");
    for (let i = 0; i < p2.count; i++) {
      const z = p2.getZ(i) / R2;
      const k = 1 + 0.028 * smoothstep(0.55, 1, z);
      p2.setXYZ(i, p2.getX(i) * k, p2.getY(i) * k, p2.getZ(i) * k);
    }
    g.computeVertexNormals();
    const uv = g.getAttribute("uv");
    for (let i = 0; i < p2.count; i++) uv.setXY(i, p2.getZ(i) / R2, 0);
    eyeB.add(g, `eye.${side}`, new THREE.Color(1, 1, 1));
  }
  const eyeMaterial = new THREE.MeshPhysicalMaterial({
    color: 0,
    roughness: 0.35,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    envMapIntensity: 1.1,
    specularIntensity: 0.12,
    ior: 1.4
  });
  eyeMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.uIris = { value: sp.iris !== void 0 ? new THREE.Color(sp.iris).multiplyScalar(0.55) : new THREE.Color().setRGB(3e-3, 35e-4, 6e-3) };
    shader.vertexShader = shader.vertexShader.replace("#include <common>", "#include <common>\nvarying float vEyeCos;").replace("#include <uv_vertex>", "#include <uv_vertex>\nvEyeCos = uv.x;");
    shader.fragmentShader = shader.fragmentShader.replace("#include <common>", "#include <common>\nvarying float vEyeCos; uniform vec3 uIris;").replace(
      "#include <color_fragment>",
      /* glsl */
      `#include <color_fragment>
{
  // a near-black eye: pupil, a very dark umber iris you only catch in strong light, dark limbus
  float iris = smoothstep(0.93, 0.86, vEyeCos) * smoothstep(0.55, 0.7, vEyeCos);
  diffuseColor.rgb = mix(vec3(0.0006, 0.0007, 0.0012), uIris, iris);
}`
    ).replace(
      "#include <aomap_fragment>",
      /* glsl */
      `#include <aomap_fragment>
{
  // What a wet black eye shows is the world: mostly the environment map, plus the canopy
  // overhead as a few pale irregular gaps of sky between leaves (the env map is too soft to
  // carry those), bent by the cornea. No painted catchlight.
  vec3 R = reflect(-geometryViewDir, normal);
  vec3 Rw = normalize((vec4(R, 0.0) * viewMatrix).xyz);
  vec2 q = Rw.xz / (Rw.y + 0.45) * 2.6 + vec2(1.7, 0.4);
  vec2 qi = floor(q), qf = fract(q);
  float gaps = 0.0;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 g = vec2(float(i), float(j));
    vec2 h = fract(sin(vec2(dot(qi + g, vec2(127.1, 311.7)), dot(qi + g, vec2(269.5, 183.3)))) * 43758.5453);
    vec2 d = (g + h - qf) * vec2(1.0, 0.6 + 0.8 * h.y);
    gaps = max(gaps, (1.0 - smoothstep(0.08, 0.3 * h.x + 0.12, length(d))) * step(0.45, h.x));
  }
  float up = smoothstep(0.15, 0.6, Rw.y);
  totalEmissiveRadiance += vec3(0.8, 0.95, 0.85) * gaps * up * 0.55;
  // a mirror-sharp highlight of the sun is thousands of nits on one pixel; a depth-of-field
  // pass turns that into a dotted disc. Keep the glints bright but finite.
  reflectedLight.directSpecular = min(reflectedLight.directSpecular, vec3(1.6));
  #ifdef USE_CLEARCOAT
  clearcoatSpecularDirect = min(clearcoatSpecularDirect, vec3(2.2));
  clearcoatSpecularIndirect = min(clearcoatSpecularIndirect, vec3(2.2));
  #endif
}`
    );
  };
  const eyes = new THREE.SkinnedMesh(eyeB.build(), eyeMaterial);
  eyes.name = "bird.eyes";
  const nictB = new PartBuilder(rig);
  for (const side of SIDES) nictB.add(lidShell(R2 * 1.045, -100 * DEG, 100 * DEG, 80 * DEG, true), `nict.${side}`, new THREE.Color(9348296));
  const nictMat = new THREE.MeshPhysicalMaterial({ color: 16777215, vertexColors: true, roughness: 0.45, transparent: true, opacity: 0.3, clearcoat: 0.2, side: THREE.DoubleSide, depthWrite: false });
  const nict = new THREE.SkinnedMesh(nictB.build(), nictMat);
  nict.name = "bird.nict";
  nict.renderOrder = 2;
  const meshes = [loftMesh, bare, bill, tongue, eyes, nict];
  for (const m of meshes) {
    m.frustumCulled = false;
    m.bind(rig.skeleton, new THREE.Matrix4());
  }
  loftMesh.castShadow = true;
  bill.castShadow = true;
  bare.castShadow = true;
  bare.receiveShadow = true;
  bill.receiveShadow = true;
  return {
    meshes,
    dispose() {
      for (const m of meshes) {
        m.geometry.dispose();
        m.material.dispose();
      }
    }
  };
}
const REST_WING = { spread: 0, lift: 0, droop: 0, sweep: 0, raise: 0, out: 0, twist: 0 };
class Pose {
  constructor() {
    // gaze: where the bill points, in root space. yaw + = bird's left, pitch + = up.
    __publicField(this, "headYaw", 0);
    __publicField(this, "headPitch", 0);
    __publicField(this, "headRoll", 0);
    /** extra head translation, root space */
    __publicField(this, "headShift", new THREE.Vector3());
    /** 1 = head position fully held against body motion */
    __publicField(this, "headStabil", 0.85);
    /**
     * Reach: put the bill TIP on this root-space point. weight 0 = ignore, 1 = exactly there.
     * The solver aims the head so the bill points along the line to the target and slides the
     * head along that line (unfolding or tucking the neck) until the tip arrives.
     */
    __publicField(this, "reachTarget", new THREE.Vector3());
    __publicField(this, "reachWeight", 0);
    /**
     * Reach along a given line: with reachPin 1 the bill lies along reachDir (unit, root space,
     * base to tip) with its tip on the target, wherever that puts the head; the neck gives what
     * it takes. For working the bill into a place it can only enter one way (under a wing).
     * reachRoll turns the head about the bill, radians.
     */
    __publicField(this, "reachDir", new THREE.Vector3(0, 0, 1));
    __publicField(this, "reachPin", 0);
    __publicField(this, "reachRoll", 0);
    // body (hips)
    __publicField(this, "bodyYaw", 0);
    __publicField(this, "bodyPitch", 0);
    // + = lean forward
    __publicField(this, "bodyRoll", 0);
    __publicField(this, "bodyShift", new THREE.Vector3());
    __publicField(this, "chestPitch", 0);
    /** -1 … 1, drives the sternum */
    __publicField(this, "breath", 0);
    // feathers
    __publicField(this, "fluff", 0);
    // radians of lift, global
    __publicField(this, "lift", new Float32Array(8));
    // extra lift along the body: [0] bill … [7] tail
    __publicField(this, "gorget", 0);
    __publicField(this, "crest", 0);
    // eyes: 0 open … 1 closed
    __publicField(this, "lidUpper", 0);
    __publicField(this, "lidLower", 0);
    __publicField(this, "nict", 0);
    // feet: the perch's slope under them (radians, + = rising to the bird's left), its
    // thickness relative to the rest perch, and how closed the toes are (1 gripping … 0 open)
    __publicField(this, "feetSlope", 0);
    __publicField(this, "feetScale", 1);
    __publicField(this, "grip", 1);
    /** 0 shut … 1 wide open (about 18 degrees) */
    __publicField(this, "jaw", 0);
    /** 0 inside the bill … 1 as far out past the tip as it goes */
    __publicField(this, "tongueOut", 0);
    /** tip curled down (+) or up (−), radians */
    __publicField(this, "tongueCurl", 0);
    /** where a carried item sits along the bill: 1 = at the tip, 0 = at the gape, above 1 = out on the tongue */
    __publicField(this, "carryAt", 1);
    __publicField(this, "tailPitch", 0);
    // + = lifted
    __publicField(this, "tailYaw", 0);
    __publicField(this, "tailRoll", 0);
    __publicField(this, "tailFan", 0);
    // 0 folded … 1 fanned
    __publicField(this, "wing", {
      L: { ...REST_WING },
      R: { ...REST_WING }
    });
  }
  /** Back to rest, every frame. (reachTarget and reachDir keep theirs: they only count while reachWeight is up.) */
  reset() {
    Object.assign(this, REST);
    this.headShift.set(0, 0, 0);
    this.bodyShift.set(0, 0, 0);
    this.lift.fill(0);
    for (const s of SIDES) Object.assign(this.wing[s], REST_WING);
  }
  /** Add a bump to the lift profile centred at body coordinate c (0 bill … 1 tail). */
  addLift(c, width, amount) {
    for (let i = 0; i < 8; i++) {
      const d = (i / 7 - c) / width;
      this.lift[i] += amount * Math.exp(-d * d);
    }
  }
}
const REST = Object.fromEntries(Object.entries(new Pose()).filter(([, v]) => typeof v === "number"));
const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);
const I = new THREE.Quaternion();
function createSolver(rig, uniforms) {
  const { bones, rest, species } = rig;
  const e = new THREE.Euler();
  const qHips = new THREE.Quaternion();
  const qChestL = new THREE.Quaternion();
  const qChestW = new THREE.Quaternion();
  const qHead = new THREE.Quaternion();
  const qRel = new THREE.Quaternion();
  const qA = new THREE.Quaternion();
  const qB = new THREE.Quaternion();
  const qC = new THREE.Quaternion();
  const v = new THREE.Vector3();
  const v2 = new THREE.Vector3();
  const pFk = new THREE.Vector3();
  const pStill = new THREE.Vector3();
  const [n1, n2] = species.behaviour.neckShare;
  const wingAxes = {};
  for (const s of SIDES) {
    const hq = rest[`hand.${s}`].quat;
    wingAxes[s] = { out: X.clone().applyQuaternion(hq), fan: Y.clone().applyQuaternion(hq) };
  }
  {
    const sfc = { p: new THREE.Vector3(), n: new THREE.Vector3(), t: new THREE.Vector3() };
    const on = (u, vv) => {
      const q = rig.loft.wingAt(u, vv, 1);
      return rig.loft.surface(q.s, q.ang, sfc);
    };
    const pivot = on(0.03, 0.3).p.clone();
    const span = on(0.95, 0).p.clone().sub(pivot).normalize();
    const n = on(0.4, 0).n.clone();
    n.addScaledVector(span, -n.dot(span)).normalize();
    uniforms.uWingPivot.value.copy(pivot);
    uniforms.uWingSpan.value.copy(span);
    uniforms.uWingChord.value.crossVectors(n, span);
  }
  const billRest = rest.bill;
  const tipLocal = new THREE.Vector3(0, -species.bill.droop, species.bill.length).applyQuaternion(billRest.worldQuat).add(billRest.worldPos).sub(rest.head.worldPos);
  const tipLen = tipLocal.length();
  const tipElev = Math.atan2(tipLocal.y, tipLocal.z);
  const NECK_OUT = 0.34;
  const tip = new THREE.Vector3();
  const carry = new THREE.Vector3();
  const TONGUE_TRAVEL = species.bill.length * 0.65;
  const TONGUE = ["tongue.1", "tongue.2", "tongue.3"];
  const TONGUE_AT = [0.06, 0.5, 0.7].map((k) => k * species.bill.length);
  const TONGUE_CURL = [0, 0.3, 0.7];
  const tonguePath = (z, out) => {
    const L = species.bill.length;
    const zc = Math.min(z, L);
    const slope = -2 * species.bill.droop * zc / (L * L);
    out.set(0, -species.bill.droop * (zc / L) * (zc / L) + slope * (z - zc), z);
    return -Math.atan(slope);
  };
  const tongueRest = TONGUE_AT.map(() => new THREE.Vector3());
  const tongueNow = TONGUE_AT.map(() => new THREE.Vector3());
  const tongueRestA = TONGUE_AT.map((z, i) => tonguePath(z, tongueRest[i]));
  const hWant = new THREE.Vector3();
  const qAim = new THREE.Quaternion();
  const mLook = new THREE.Matrix4();
  const lx = new THREE.Vector3();
  const ly = new THREE.Vector3();
  const throatRest = (() => {
    const [t0, t1] = species.throat;
    const sfc = { p: new THREE.Vector3(), n: new THREE.Vector3(), t: new THREE.Vector3() };
    const o = rest.head.worldPos;
    const chin = rig.loft.point(t1, 0, new THREE.Vector3()).sub(o);
    const rim = rig.loft.point(t0, 0, new THREE.Vector3()).sub(o);
    const mid = rig.loft.surface((t0 + t1) / 2, 0, sfc).p.clone().sub(o);
    const out = sfc.n.clone();
    const down = rig.loft.surface(t0, 0, sfc).t.clone();
    return { chin, rim, mid, out, down, span: chin.distanceTo(rim), pivot: o.clone().sub(rest.chest.worldPos) };
  })();
  const THROAT_POUT = 0.12;
  const qT = new THREE.Quaternion();
  const tA = new THREE.Vector3();
  const tB = new THREE.Vector3();
  const tN = new THREE.Vector3();
  const tS = new THREE.Vector3();
  const sternumDir = rest.sternum.worldPos.clone().sub(rest.chest.worldPos).setX(0).normalize();
  const legs = SIDES.map((s) => ({
    s,
    foot: bones[`foot.${s}`],
    footRest: rest[`foot.${s}`],
    toes: [1, 2, 3, 4].map((i) => bones[`toe.${s}.${i}`]),
    tarsus: bones[`tarsus.${s}`]
  }));
  const solveNeck = () => {
    qRel.copy(qChestW).invert().multiply(qHead);
    qA.copy(I).slerp(qRel, n1);
    qB.copy(I).slerp(qRel, n2);
  };
  function headFk(hipsPos, hipsQ, chestL, neckA, neckB, out) {
    out.copy(rest.head.pos).applyQuaternion(neckB).add(rest.neck2.pos);
    out.applyQuaternion(neckA).add(rest.neck1.pos);
    out.applyQuaternion(chestL).add(rest.chest.pos);
    out.add(rest.spine.pos);
    out.applyQuaternion(hipsQ).add(hipsPos);
    return out;
  }
  const applyPose = function applyPose2(p2) {
    e.set(p2.bodyPitch, p2.bodyYaw, p2.bodyRoll, "YXZ");
    qHips.setFromEuler(e);
    bones.hips.quaternion.copy(qHips);
    bones.hips.position.copy(rest.hips.pos).add(p2.bodyShift);
    qChestL.setFromAxisAngle(X, p2.chestPitch);
    bones.chest.quaternion.copy(qChestL);
    qChestW.copy(qHips).multiply(qChestL);
    bones.sternum.position.copy(rest.sternum.pos).addScaledVector(sternumDir, p2.breath * 0.011);
    bones.sternum.scale.set(1 + p2.breath * 0.028, 1, 1 + p2.breath * 0.012);
    e.set(-p2.headPitch, p2.headYaw, p2.headRoll, "YXZ");
    qHead.setFromEuler(e);
    solveNeck();
    headFk(bones.hips.position, qHips, qChestL, qA, qB, pFk);
    headFk(rest.hips.pos, I, I, qA, qB, pStill);
    v.copy(pStill).sub(pFk).multiplyScalar(clamp(p2.headStabil, 0, 1)).add(p2.headShift);
    const w = clamp(p2.reachWeight, 0, 1);
    if (w > 0) {
      hWant.copy(pFk).add(v);
      v2.copy(p2.reachTarget).sub(hWant);
      const dist = v2.length() || 1e-6;
      const slide2 = clamp(dist - tipLen, -0.24, NECK_OUT);
      hWant.addScaledVector(v2, slide2 / dist);
      const pin = clamp(p2.reachPin, 0, 1);
      if (pin > 0) hWant.lerp(v2.copy(p2.reachDir).multiplyScalar(-tipLen).add(p2.reachTarget), pin);
      v2.copy(p2.reachTarget).sub(hWant).normalize();
      const yaw = clamp(Math.atan2(v2.x, v2.z), -2.2, 2.2);
      const pitch = clamp(Math.asin(clamp(v2.y, -1, 1)) - tipElev, -1.1, 1.25);
      e.set(-pitch, yaw, p2.headRoll * (1 - w), "YXZ");
      qAim.setFromEuler(e);
      if (pin > 0) {
        lx.crossVectors(Y, v2).normalize();
        ly.crossVectors(v2, lx);
        qB.setFromRotationMatrix(mLook.makeBasis(lx, ly, v2));
        qB.multiply(qA.setFromAxisAngle(Z, p2.reachRoll)).multiply(qA.setFromAxisAngle(X, tipElev));
        qAim.slerp(qB, pin);
      }
      qHead.slerp(qAim, w);
      solveNeck();
      headFk(bones.hips.position, qHips, qChestL, qA, qB, pFk);
      v.lerp(hWant.sub(pFk), w);
    }
    bones.neck1.quaternion.copy(qA);
    bones.neck2.quaternion.copy(qB);
    qC.copy(qA).multiply(qB).invert().multiply(qRel);
    bones.head.quaternion.copy(qC);
    tip.copy(pFk).add(v);
    qC.copy(qChestW).invert();
    bones.neck1.position.copy(rest.neck1.pos).add(v2.copy(v).multiplyScalar(0.22).applyQuaternion(qC));
    qC.copy(qChestW).multiply(qA).invert();
    bones.neck2.position.copy(rest.neck2.pos).add(v2.copy(v).multiplyScalar(0.3).applyQuaternion(qC));
    qC.copy(qChestW).multiply(qA).multiply(qB).invert();
    bones.head.position.copy(rest.head.pos).add(v2.copy(v).multiplyScalar(0.48).applyQuaternion(qC));
    qT.set(0, qRel.y, 0, qRel.w);
    if (qT.lengthSq() < 1e-6) qT.set(0, 0, 0, 1);
    qT.normalize();
    bones.throat.quaternion.copy(qT);
    v.copy(bones.head.position).applyQuaternion(bones.neck2.quaternion).add(bones.neck2.position).applyQuaternion(bones.neck1.quaternion).add(bones.neck1.position);
    tA.copy(throatRest.chin).applyQuaternion(qRel).add(v).sub(tB.copy(throatRest.rim).applyQuaternion(qT).add(throatRest.pivot));
    const short = throatRest.span * 0.5 - tA.length();
    const slide = 0.5 * (short + Math.sqrt(short * short + 1e-4));
    tS.copy(throatRest.down).applyQuaternion(qT).multiplyScalar(slide);
    bones.throat.position.copy(rest.throat.pos).add(tS);
    qC.copy(qT).slerp(qRel, 0.5);
    bones.gular.quaternion.copy(qC);
    v2.copy(throatRest.mid).applyQuaternion(qC);
    const pout = clamp(THROAT_POUT * (throatRest.span - tA.length()), -6e-3, 0.03);
    tN.copy(throatRest.out).applyQuaternion(qC);
    bones.gular.position.copy(v).add(throatRest.pivot).add(tS).multiplyScalar(0.5).add(v2).addScaledVector(tN, pout);
    tip.add(v2.copy(tipLocal).applyQuaternion(qHead));
    bones.jaw.quaternion.copy(rest.jaw.quat).multiply(qA.setFromAxisAngle(X, clamp(p2.jaw, 0, 1.1) * 0.31));
    const out = clamp(p2.tongueOut, 0, 1) * TONGUE_TRAVEL;
    let prevA = 0;
    for (let i = 0; i < 3; i++) {
      const a = tonguePath(TONGUE_AT[i] + out, tongueNow[i]) - tongueRestA[i];
      const b = bones[TONGUE[i]];
      b.quaternion.setFromAxisAngle(X, a - prevA + p2.tongueCurl * TONGUE_CURL[i]);
      if (i === 0) b.position.copy(rest[TONGUE[0]].pos).add(tongueNow[0]).sub(tongueRest[0]);
      else b.position.copy(tongueNow[i]).sub(tongueNow[i - 1]).sub(tongueRest[i]).add(tongueRest[i - 1]).add(rest[TONGUE[i]].pos).applyQuaternion(qA.setFromAxisAngle(X, -prevA));
      prevA = a;
    }
    const k = Math.max(p2.carryAt, 0);
    carry.set(0, -species.bill.droop * Math.min(k, 1) * Math.min(k, 1) - (k < 1 ? 3e-3 * (1 - k) : 0), k * species.bill.length).applyQuaternion(billRest.worldQuat).add(billRest.worldPos).sub(rest.head.worldPos);
    carry.applyQuaternion(qHead).add(tip).sub(v2.copy(tipLocal).applyQuaternion(qHead));
    for (const s of SIDES) {
      const eye = rig.eyes[s];
      const up = lerp(LID.upperOpen, 0, smoothstep(0, 1, p2.lidUpper));
      const lo = lerp(LID.lowerOpen, 0, smoothstep(0, 1, p2.lidLower));
      eye.lidUpper.quaternion.copy(rest[eye.lidUpper.name].quat).multiply(qA.setFromAxisAngle(X, -up));
      eye.lidLower.quaternion.copy(rest[eye.lidLower.name].quat).multiply(qA.setFromAxisAngle(X, -lo));
      const na = -sideSign(s) * LID.nictOpen * (1 - clamp(p2.nict, 0, 1));
      eye.nict.quaternion.copy(rest[eye.nict.name].quat).multiply(qA.setFromAxisAngle(Y, na));
      eye.nict.scale.setScalar(p2.nict > 2e-3 ? 1 : 1e-3);
      eye.lidUpper.scale.setScalar(lerp(0.93, 1, smoothstep(0, 0.5, p2.lidUpper)));
      eye.lidLower.scale.setScalar(lerp(0.93, 1, smoothstep(0, 0.5, p2.lidLower)));
    }
    e.set(-p2.tailPitch, p2.tailYaw, p2.tailRoll, "YXZ");
    bones.tail.quaternion.copy(rest.tail.quat).multiply(qA.setFromEuler(e));
    const fan = lerp(species.tail.restFan, species.tail.maxFan, clamp(p2.tailFan, -0.5, 1)) * DEG;
    for (const r of rig.rectrices) r.bone.quaternion.setFromAxisAngle(Y, r.k * fan);
    for (const s of SIDES) {
      const w2 = rig.wings[s];
      const wp = p2.wing[s];
      const k2 = smoothstep(0, 1, wp.spread);
      for (let i = 0; i < w2.bones.length; i++) w2.bones[i].quaternion.copy(w2.folded[i]).slerp(w2.spread[i], k2);
      if (k2 > 0 && (wp.sweep !== 0 || wp.raise !== 0)) {
        qA.setFromAxisAngle(Y, -sideSign(s) * wp.sweep * k2);
        qB.setFromAxisAngle(Z, sideSign(s) * wp.raise * k2);
        w2.bones[0].quaternion.premultiply(qB).premultiply(qA);
      }
      const fold = 1 - k2;
      if (fold > 0) {
        const ax = wingAxes[s];
        const fore = w2.bones[1];
        fore.quaternion.multiply(qA.setFromAxisAngle(ax.out, -wp.lift * 0.3 * fold));
        fore.quaternion.multiply(qA.setFromAxisAngle(ax.fan, -sideSign(s) * wp.droop * fold));
      }
    }
    qA.setFromAxisAngle(Z, p2.feetSlope);
    const open = (1 - clamp(p2.grip, 0, 1)) * 0.6;
    for (const { s, foot, footRest, toes, tarsus: b } of legs) {
      foot.position.copy(footRest.pos).applyQuaternion(qA);
      foot.quaternion.copy(qA);
      foot.scale.setScalar(p2.feetScale);
      for (let i = 0; i < 4; i++) toes[i].quaternion.setFromAxisAngle(X, i === 3 ? open : -open);
      v2.copy(rig.ankle[s]).sub(footRest.worldPos).multiplyScalar(p2.feetScale).applyQuaternion(qA).add(foot.position);
      v.copy(rig.hipSocket[s]).applyQuaternion(qHips).add(bones.hips.position).sub(v2);
      const len = v.length();
      v.applyQuaternion(qB.copy(qA).invert());
      basisQuat(v, X, b.quaternion);
      b.scale.set(1, 1, len / rig.tarsusLength / p2.feetScale);
    }
    uniforms.uFluff.value = p2.fluff;
    uniforms.uLift.value.set(p2.lift);
    uniforms.uLift.value[0] += p2.crest * 0.9;
    uniforms.uLift.value[1] += p2.crest * 0.7;
    uniforms.uGorget.value = p2.gorget;
    uniforms.uCrest.value = p2.crest;
    uniforms.uWingSpread.value.set(p2.wing.L.spread, p2.wing.R.spread);
    uniforms.uWingOut.value.set(p2.wing.L.out, p2.wing.L.twist, p2.wing.R.out, p2.wing.R.twist);
    uniforms.uWingLift.value.set(p2.wing.L.lift, p2.wing.R.lift);
  };
  applyPose.tip = tip;
  applyPose.carry = carry;
  applyPose.billReach = tipLen;
  return applyPose;
}
class Mind {
  constructor(species, seed = 7) {
    __publicField(this, "species");
    __publicField(this, "t", 0);
    __publicField(this, "dt", 0);
    __publicField(this, "rng");
    /** 0 drowsy … 1 on high alert */
    __publicField(this, "arousal", 0.3);
    __publicField(this, "baseline", 0.32);
    /** root-local point of interest, or null */
    __publicField(this, "attention", null);
    /** how fast the point of interest sweeps across the bird's view, rad/s, smoothed */
    __publicField(this, "attentionSpeed", 0);
    /** seconds left of holding dead still after a fright */
    __publicField(this, "freeze", 0);
    /** true while the head is mid-saccade */
    __publicField(this, "saccading", false);
    /** food in the air, root-local, refreshed every frame by the bird */
    __publicField(this, "food", []);
    /** something that outranks the general point of interest: the gaze goes bill-on and keeps re-fixating it */
    __publicField(this, "focus", null);
    /** bumps whenever the focus becomes a different thing */
    __publicField(this, "focusId", 0);
    /** from the strike until the swallow: mouth and neck are spoken for */
    __publicField(this, "eating", false);
    /** the head is busy (a strike): no saccades */
    __publicField(this, "gazeLock", false);
    /** debug: pin the gaze to [yaw, pitch, roll] degrees */
    __publicField(this, "pinGaze", null);
    /** debug: silence the spontaneous behaviours */
    __publicField(this, "quiet", false);
    __publicField(this, "handlers", {});
    __publicField(this, "lastDir", new THREE.Vector3());
    __publicField(this, "dir", new THREE.Vector3());
    __publicField(this, "hasLast", false);
    this.species = species;
    this.rng = mulberry32(seed);
  }
  on(type, fn) {
    var _a;
    ((_a = this.handlers)[type] ?? (_a[type] = [])).push(fn);
  }
  emit(type, e) {
    for (const fn of this.handlers[type] ?? []) fn(e);
  }
  excite(amount) {
    this.arousal = clamp(this.arousal + amount, 0, 1);
  }
  step(dt, headPos) {
    this.dt = dt;
    this.t += dt;
    this.freeze = Math.max(0, this.freeze - dt);
    if (this.attention && dt > 0) {
      this.dir.copy(this.attention).sub(headPos).normalize();
      if (this.hasLast) {
        const w = this.dir.angleTo(this.lastDir) / dt;
        this.attentionSpeed = damp(this.attentionSpeed, Math.min(w, 6), 6, dt);
      }
      this.lastDir.copy(this.dir);
      this.hasLast = true;
    } else {
      this.hasLast = false;
      this.attentionSpeed = damp(this.attentionSpeed, 0, 4, dt);
    }
    this.excite(Math.max(this.attentionSpeed - 0.25, 0) * 0.5 * dt);
    this.arousal = damp(this.arousal, this.baseline, 0.14, dt);
  }
}
class PostureLayer {
  constructor(mind) {
    __publicField(this, "name", "posture");
    __publicField(this, "a", 0.3);
    __publicField(this, "yaw", new Spring(3.2, 0.5));
    __publicField(this, "follow", 0);
    __publicField(this, "pitch", new Spring(5, 0.45));
    __publicField(this, "headYaw", 0);
    mind.on("saccade", (e) => {
      this.yaw.kick(-e.dyaw * 0.5);
      this.pitch.kick(-e.dpitch * 0.4);
    });
    mind.on("fixate", (e) => this.headYaw = e.yaw);
  }
  update(m, p2) {
    this.a = damp(this.a, m.arousal, 2.5, m.dt);
    const a = this.a;
    p2.fluff += lerp(0.2, -0.06, a);
    p2.headShift.y += lerp(-0.032, 0.03, a);
    p2.headShift.z += lerp(-0.014, 0.012, a);
    p2.bodyPitch += lerp(-0.04, 0.05, a);
    p2.bodyShift.y += lerp(-0.012, 8e-3, a);
    p2.crest += lerp(0, 0.22, a);
    p2.wing.L.droop += lerp(0.05, 0, a);
    p2.wing.R.droop += lerp(0.05, 0, a);
    const t = m.t;
    p2.bodyRoll += noise1(t * 0.17, 1) * 0.022;
    p2.bodyShift.x += noise1(t * 0.13, 2) * 6e-3;
    p2.bodyPitch += noise1(t * 0.21, 3) * 0.012;
    this.follow = damp(this.follow, this.headYaw * 0.14, 0.9, m.dt);
    p2.bodyYaw += this.follow + this.yaw.step(0, m.dt) + noise1(t * 0.11, 4) * 0.025;
    p2.chestPitch += this.pitch.step(0, m.dt);
  }
}
class BreathLayer {
  constructor() {
    __publicField(this, "name", "breath");
    __publicField(this, "phase", 0);
  }
  update(m, p2) {
    const [calm, alert] = m.species.behaviour.breathHz;
    this.phase += m.dt * lerp(calm, alert, m.arousal) * Math.PI * 2;
    const b = Math.sin(this.phase + 0.45 * Math.sin(this.phase)) * lerp(0.75, 1.1, m.arousal);
    p2.breath += b;
    p2.addLift(0.42, 0.2, b * 0.014);
    p2.tailPitch += b * 0.011;
    p2.bodyShift.y += b * 12e-4;
    p2.wing.L.lift += b * 5e-3;
    p2.wing.R.lift += b * 5e-3;
  }
}
const minJerk$1 = (u) => u * u * u * (10 + u * (-15 + 6 * u));
class GazeLayer {
  constructor(mind) {
    __publicField(this, "name", "gaze");
    /** widest head turn relative to straight ahead, radians */
    __publicField(this, "maxYaw", 70 * DEG);
    /** chance that a new fixation concerns the point of interest (scaled up by arousal) */
    __publicField(this, "interest", 0.5);
    /** of the fixations on the point of interest, the share made bill-on (the rest turn one eye to it) */
    __publicField(this, "billOn", 0.46);
    /**
     * 0..1: follow a moving point of interest smoothly between saccades (set by
     * the scene while the pointer moves). Near the target the head glides after
     * it with a lag; too far off, it jumps to catch up.
     */
    __publicField(this, "pursuit", 0);
    /** lowest the bill may point (negative is below horizontal): a glance down, never straight down */
    __publicField(this, "minPitch", -45 * DEG);
    /** for food it may dip a little further */
    __publicField(this, "minPitchFood", -50 * DEG);
    __publicField(this, "cur");
    __publicField(this, "from");
    __publicField(this, "to");
    __publicField(this, "moving", false);
    __publicField(this, "t0", 0);
    __publicField(this, "dur", 0.06);
    __publicField(this, "amp", 0);
    __publicField(this, "nextAt", 0.8);
    __publicField(this, "settle", 10);
    __publicField(this, "burst", 0);
    __publicField(this, "attYaw", 0);
    __publicField(this, "attPitch", 0);
    __publicField(this, "seenYaw", 0);
    __publicField(this, "seenPitch", 0);
    __publicField(this, "lastStart", -10);
    __publicField(this, "focusSeen", -1);
    __publicField(this, "focusAt", 0);
    __publicField(this, "head", new THREE.Vector3(0, 0.9, 0.05));
    __publicField(this, "d", new THREE.Vector3());
    const up = mind.species.behaviour.billUp * DEG;
    this.cur = { yaw: 0.9, pitch: up, roll: 0 };
    this.from = { ...this.cur };
    this.to = { ...this.cur };
    mind.on("startle", () => {
      this.nextAt = mind.t + 0.04 + mind.rng() * 0.04;
      this.burst = -1;
    });
  }
  /** Done with what it was looking at: on to something else shortly. */
  moveOn(m) {
    this.burst = 0;
    this.nextAt = Math.min(this.nextAt, m.t + rand(m.rng, 0.12, 0.4));
  }
  lookAtAttention(m) {
    const at = m.focus ?? m.attention;
    if (!at) return false;
    this.d.copy(at).sub(this.head);
    this.attYaw = Math.atan2(this.d.x, this.d.z);
    this.attPitch = Math.atan2(this.d.y, Math.hypot(this.d.x, this.d.z));
    return true;
  }
  pick(m, forceFrontal = false) {
    const r = m.rng;
    const up = m.species.behaviour.billUp * DEG;
    const has = this.lookAtAttention(m);
    const c = this.cur;
    let f2;
    if (!forceFrontal && this.burst > 0) {
      this.burst--;
      f2 = { yaw: c.yaw + rand(r, -1, 1) * 13 * DEG, pitch: c.pitch + rand(r, -1, 1) * 8 * DEG, roll: c.roll * 0.5 + rand(r, -1, 1) * 9 * DEG };
    } else if (has && (forceFrontal || r() < this.interest + 0.4 * m.arousal)) {
      this.seenYaw = this.attYaw;
      this.seenPitch = this.attPitch;
      const mode = forceFrontal ? 0 : r();
      if (mode < this.billOn) {
        f2 = { yaw: this.attYaw + rand(r, -5, 5) * DEG, pitch: this.attPitch * 0.8 + up + rand(r, -4, 14) * DEG, roll: r() < 0.25 ? rand(r, -18, 18) * DEG : rand(r, -5, 5) * DEG };
      } else {
        const off = rand(r, 60, 84) * DEG;
        const near = Math.abs(c.yaw - (this.attYaw + off)) < Math.abs(c.yaw - (this.attYaw - off)) ? 1 : -1;
        let side = r() < 0.6 ? near : -near;
        if (Math.abs(this.attYaw + side * off) > this.maxYaw) side = -side;
        f2 = { yaw: this.attYaw + side * off, pitch: up * 0.6 + rand(r, -8, 12) * DEG, roll: side * (this.attPitch * 0.5 + rand(r, -4, 10) * DEG) };
      }
      if (r() < 0.35) this.burst = 1 + Math.floor(r() * 2);
    } else {
      let yaw = clamp(rand(r, -1, 1) * 105 * DEG, c.yaw - 140 * DEG, c.yaw + 140 * DEG);
      if (Math.abs(yaw - c.yaw) < 22 * DEG) yaw += Math.sign(yaw - c.yaw || 1) * 30 * DEG;
      f2 = { yaw, pitch: up * 0.5 + rand(r, -14, 24) * DEG, roll: rand(r, -9, 9) * DEG };
      if (r() < 0.3) this.burst = 1 + Math.floor(r() * 2);
    }
    f2.yaw = clamp(f2.yaw, -this.maxYaw, this.maxYaw);
    f2.pitch = clamp(f2.pitch, this.minPitch, 52 * DEG);
    f2.roll = clamp(f2.roll, -26 * DEG, 26 * DEG);
    return f2;
  }
  begin(m, f2) {
    const [a, b] = m.species.behaviour.saccade;
    this.from = { ...this.cur };
    this.to = f2;
    const dy = f2.yaw - this.from.yaw;
    const dp = f2.pitch - this.from.pitch;
    const dr = f2.roll - this.from.roll;
    this.amp = Math.hypot(dy * Math.cos((f2.pitch + this.from.pitch) / 2), dp, dr * 0.5);
    this.dur = Math.min(a + b * this.amp / DEG, 0.095);
    this.t0 = m.t;
    this.moving = true;
    this.lastStart = m.t;
    m.saccading = true;
    m.emit("saccade", { amp: this.amp, dur: this.dur, dyaw: dy, dpitch: dp });
  }
  update(m, p2) {
    const B = m.species.behaviour;
    if (m.pinGaze) {
      p2.headYaw += m.pinGaze[0] * DEG;
      p2.headPitch += m.pinGaze[1] * DEG;
      p2.headRoll += m.pinGaze[2] * DEG;
      return;
    }
    if (m.focus && !this.moving && !m.gazeLock && this.lookAtAttention(m)) {
      const off = Math.hypot((this.attYaw - this.cur.yaw) * Math.cos(this.attPitch), this.attPitch - this.cur.pitch);
      const fresh = this.focusSeen !== m.focusId;
      if (fresh && !this.focusAt) this.focusAt = m.t + rand(m.rng, 0.09, 0.24);
      if (fresh && m.t >= this.focusAt || !fresh && off > 6 * DEG && m.t - this.lastStart > 0.16 && m.rng() < m.dt * 9) {
        this.focusSeen = m.focusId;
        this.focusAt = 0;
        this.burst = 0;
        this.begin(m, {
          yaw: clamp(this.attYaw, -this.maxYaw, this.maxYaw),
          pitch: clamp(this.attPitch + (fresh ? rand(m.rng, -3, 3) * DEG : 0), this.minPitchFood, 65 * DEG),
          roll: fresh ? rand(m.rng, -8, 8) * DEG : this.cur.roll * 0.6
        });
      }
    } else if (!this.moving && !m.quiet && !m.focus && !m.gazeLock) {
      if (m.t >= this.nextAt && (m.freeze <= 0 || this.burst < 0)) {
        const startle = this.burst < 0;
        if (startle) this.burst = 0;
        this.begin(m, this.pick(m, startle));
      } else if (m.freeze <= 0 && m.t - this.lastStart > 0.22 && this.lookAtAttention(m)) {
        const moved = Math.hypot((this.attYaw - this.seenYaw) * Math.cos(this.attPitch), this.attPitch - this.seenPitch);
        if (moved > 13 * DEG && m.rng() < m.dt * lerp(3, 9, m.arousal)) {
          this.burst = 0;
          this.begin(m, this.pick(m, m.rng() < 0.5));
          this.seenYaw = this.attYaw;
          this.seenPitch = this.attPitch;
        }
      }
    }
    if (!this.moving && this.pursuit > 0 && !m.focus && !m.gazeLock && m.freeze <= 0 && this.lookAtAttention(m)) {
      const up = B.billUp * DEG;
      const ty = clamp(this.attYaw, -this.maxYaw, this.maxYaw);
      const tp = clamp(this.attPitch * 0.8 + up * 0.6, this.minPitch, 52 * DEG);
      const err = Math.hypot((ty - this.cur.yaw) * Math.cos(tp), tp - this.cur.pitch);
      const snap = err > 14 * DEG && m.t - this.lastStart > 0.3 && m.rng() < m.dt * 5;
      if (err < 28 * DEG && !snap) {
        const g = 1 - Math.exp(-m.dt * 3.2 * this.pursuit * (0.75 + 0.35 * noise1(m.t * 3.1, 31)));
        this.cur = {
          yaw: this.cur.yaw + (ty - this.cur.yaw) * g,
          pitch: this.cur.pitch + (tp - this.cur.pitch) * g,
          roll: this.cur.roll * (1 - g * 0.5)
        };
        this.from = { ...this.cur };
        this.to = { ...this.cur };
        this.seenYaw = this.attYaw;
        this.seenPitch = this.attPitch;
        if (err > 3 * DEG) this.nextAt = Math.max(this.nextAt, m.t + 0.25);
      } else if (snap || m.t - this.lastStart > 0.16 && m.rng() < m.dt * 10) {
        this.burst = 0;
        this.begin(m, this.pick(m, true));
      }
    }
    let yaw;
    let pitch;
    let roll;
    if (this.moving) {
      const u = (m.t - this.t0) / this.dur;
      if (u >= 1) {
        this.moving = false;
        m.saccading = false;
        this.cur = { ...this.to };
        this.settle = 0;
        const frontal = Math.abs(this.cur.yaw - this.attYaw) < 15 * DEG;
        const [h0, h1] = [lerp(B.holdCalm[0], B.holdAlert[0], m.arousal), lerp(B.holdCalm[1], B.holdAlert[1], m.arousal)];
        this.nextAt = m.t + (this.burst < 0 ? 0.05 : this.burst > 0 ? rand(m.rng, 0.14, 0.42) : randSkew(m.rng, h0, h1, 1.8) * (frontal ? 1.15 : 1));
        m.emit("fixate", { yaw: this.cur.yaw, pitch: this.cur.pitch });
      }
      const e = minJerk$1(clamp(u, 0, 1));
      const arc = Math.sin(Math.PI * clamp(u, 0, 1));
      yaw = lerp(this.from.yaw, this.to.yaw, e);
      pitch = lerp(this.from.pitch, this.to.pitch, e) - arc * this.amp * 0.09;
      roll = lerp(this.from.roll, this.to.roll, e);
      p2.headShift.y -= arc * Math.min(this.amp, 1.6) * 0.012;
    } else {
      this.settle += m.dt;
      const ring = Math.exp(-this.settle / 0.032) * Math.cos(this.settle * 24 * Math.PI * 2) * 0.04;
      yaw = this.cur.yaw + (this.to.yaw - this.from.yaw) * ring;
      pitch = this.cur.pitch + (this.to.pitch - this.from.pitch) * ring;
      roll = this.cur.roll + (this.to.roll - this.from.roll) * ring;
    }
    yaw += noise1(m.t * 11, 11) * 28e-4 + noise1(m.t * 0.6, 12) * 8e-3;
    pitch += noise1(m.t * 12, 13) * 28e-4 + noise1(m.t * 0.5, 14) * 7e-3;
    roll += noise1(m.t * 0.7, 15) * 8e-3;
    p2.headYaw += yaw;
    p2.headPitch += pitch;
    p2.headRoll += roll;
    p2.headShift.x += Math.sin(yaw) * 0.014;
    p2.headShift.z += (Math.cos(yaw) - 1) * 0.01 - Math.max(pitch, 0) * 0.018;
  }
}
class BlinkLayer {
  constructor(mind) {
    __publicField(this, "name", "blink");
    __publicField(this, "t0", -10);
    __publicField(this, "full", false);
    __publicField(this, "nextAt", 1.5);
    mind.on("saccade", (e) => {
      if (e.amp > 0.6 && mind.rng() < 0.45 && mind.t - this.t0 > 0.5) this.start(mind, false);
    });
    mind.on("startle", () => {
      this.nextAt = mind.t + 1.2 + mind.rng();
    });
  }
  start(m, full) {
    this.t0 = m.t;
    this.full = full;
    const [a, b] = m.species.behaviour.blinkEvery;
    this.nextAt = m.t + rand(m.rng, a, b) * lerp(1.3, 0.8, m.arousal);
  }
  update(m, p2) {
    if (!m.quiet && m.t >= this.nextAt && m.freeze <= 0) this.start(m, m.rng() < lerp(0.3, 0.08, m.arousal));
    const s = this.full ? 1.7 : 1;
    const x = (m.t - this.t0) / s;
    const k = x < 0 ? 0 : x < 0.045 ? smoothstep(0, 0.045, x) : x < 0.07 ? 1 : 1 - smoothstep(0.07, 0.165, x);
    p2.nict += k;
    p2.lidLower += k * (this.full ? 1 : 0.3);
    p2.lidUpper += k * (this.full ? 0.75 : 0.08);
    const sleepy = smoothstep(0.3, 0.05, m.arousal);
    p2.lidUpper += sleepy * 0.22;
    p2.lidLower += sleepy * 0.18;
  }
}
class RuffleLayer {
  constructor(mind) {
    __publicField(this, "name", "ruffle");
    __publicField(this, "kind", "puff");
    __publicField(this, "t0", -100);
    __publicField(this, "nextAt");
    __publicField(this, "amp", 0.6);
    /** when it last ruffled: the shake-off after a fright waits for the same gap */
    __publicField(this, "last", -1e9);
    const [a, b] = mind.species.behaviour.ruffleEvery;
    this.nextAt = rand(mind.rng, a * 0.5, b * 0.6);
    mind.on("startle", () => {
      this.t0 = -100;
      this.nextAt = Math.max(mind.t + rand(mind.rng, 2.8, 5), this.last + mind.species.behaviour.ruffleEvery[0]);
    });
  }
  /** amp: how hard, 0..1 (random 0.45..0.75 when left out) */
  trigger(m, kind, amp) {
    const r = m.rng();
    this.kind = kind ?? (r < 0.45 ? "puff" : r < 0.7 ? "shake" : "throat");
    this.t0 = m.t;
    this.last = m.t;
    this.amp = amp ?? rand(m.rng, 0.45, 0.75);
    const [a, b] = m.species.behaviour.ruffleEvery;
    this.nextAt = m.t + rand(m.rng, a, b);
    m.emit("ruffle", { kind: this.kind });
  }
  update(m, p2) {
    if (!m.quiet && m.t >= this.nextAt && m.freeze <= 0 && !m.saccading) {
      if (m.arousal < 0.7) this.trigger(m);
      else this.nextAt = m.t + 1;
    }
    const tau = m.t - this.t0;
    if (tau < 0 || tau > 3) return;
    const A = this.amp;
    if (this.kind === "throat") {
      const env = smoothstep(0, 0.12, tau) * (1 - smoothstep(0.7, 1.25, tau));
      p2.gorget += env * 0.42 * A;
      p2.crest += env * 0.38 * A;
      p2.addLift(0.12, 0.14, env * 0.25 * A);
      p2.headShift.y += env * 0.01;
      return;
    }
    for (let i = 0; i < 8; i++) {
      const x = tau - i / 7 * 0.2;
      if (x <= 0) continue;
      const rise = smoothstep(0, 0.13, x);
      const fall = 1 - smoothstep(0.62, 1.5, x);
      const wobble = x > 0.62 ? 0.14 * Math.sin((x - 0.62) * 13) * Math.exp(-(x - 0.62) * 3.5) : 0;
      p2.lift[i] += A * (rise * fall + wobble) * lerp(0.75, 1, i / 7);
    }
    p2.crest += A * 0.25 * smoothstep(0, 0.1, tau) * (1 - smoothstep(0.5, 1.1, tau));
    const win = smoothstep(0.14, 0.24, tau) * (1 - smoothstep(0.55, 0.85, tau));
    const ph = (tau - 0.14) * 14 * Math.PI * 2;
    const s = Math.sin(ph) * win;
    p2.bodyRoll += s * 0.05 * A;
    p2.bodyYaw += Math.cos(ph) * win * 0.035 * A;
    p2.tailYaw += Math.sin(ph - 1.2) * win * 0.16 * A;
    p2.tailFan += win * 0.55 * A + smoothstep(0, 0.2, tau) * (1 - smoothstep(0.6, 1.4, tau)) * 0.25 * A;
    for (const side of ["L", "R"]) {
      p2.wing[side].lift += (win * 0.11 + Math.abs(s) * 0.05) * A + smoothstep(0, 0.2, tau) * (1 - smoothstep(0.7, 1.5, tau)) * 0.06 * A;
      p2.wing[side].droop += win * 0.07 * A;
    }
    p2.bodyShift.y += win * 8e-3;
    if (this.kind === "shake") {
      const hw = smoothstep(0.1, 0.2, tau) * (1 - smoothstep(0.5, 0.75, tau));
      p2.headRoll += Math.sin(ph * 1.15 + 0.8) * hw * 0.3 * A;
      p2.headYaw += Math.cos(ph * 1.15) * hw * 0.16 * A;
      p2.nict += hw;
      p2.lidLower += hw * 0.6;
      p2.headStabil -= hw * 0.5;
    }
  }
}
class TailLayer {
  constructor(mind) {
    __publicField(this, "name", "tail");
    __publicField(this, "pitch", new Spring(6.5, 0.28));
    __publicField(this, "fan", new Spring(4.5, 0.5));
    __publicField(this, "yaw", new Spring(5, 0.4));
    __publicField(this, "nextAt");
    __publicField(this, "pumps", 0);
    __publicField(this, "pumpAt", 0);
    const [a, b] = mind.species.behaviour.tailEvery;
    this.nextAt = rand(mind.rng, a * 0.4, b * 0.5);
    mind.on("startle", (e) => {
      this.pitch.kick(-5 * e.strength);
      this.fan.kick(14 * e.strength);
    });
    mind.on("saccade", (e) => {
      if (e.amp > 0.9) this.yaw.kick(-e.dyaw * 0.5);
    });
  }
  flick(m, strength = 1) {
    this.pitch.kick(-rand(m.rng, 3, 5.5) * strength);
    this.fan.kick(rand(m.rng, 5, 11) * strength);
    this.yaw.kick(rand(m.rng, -1.5, 1.5) * strength);
  }
  update(m, p2) {
    if (!m.quiet && m.t >= this.nextAt && m.freeze <= 0) {
      const [a, b] = m.species.behaviour.tailEvery;
      this.nextAt = m.t + rand(m.rng, a, b);
      this.pumps = m.rng() < 0.4 ? 1 + Math.floor(m.rng() * 2) : 0;
      this.pumpAt = m.t + 0.16;
      this.flick(m);
    }
    if (this.pumps > 0 && m.t >= this.pumpAt) {
      this.pumps--;
      this.pumpAt = m.t + rand(m.rng, 0.13, 0.2);
      this.flick(m, 0.7);
    }
    p2.tailPitch += this.pitch.step(0, m.dt);
    p2.tailFan += Math.max(this.fan.step(0, m.dt), -0.3);
    p2.tailYaw += this.yaw.step(0, m.dt);
  }
}
class WingLayer {
  constructor(mind) {
    __publicField(this, "name", "wings");
    __publicField(this, "t0", -100);
    __publicField(this, "nextAt");
    __publicField(this, "lead", 1);
    __publicField(this, "amp", 1);
    const [a, b] = mind.species.behaviour.wingEvery;
    this.nextAt = rand(mind.rng, a * 0.5, b * 0.6);
  }
  shuffle(m) {
    this.t0 = m.t;
    this.lead = m.rng() < 0.5 ? 1 : -1;
    this.amp = rand(m.rng, 0.7, 1.2);
    const [a, b] = m.species.behaviour.wingEvery;
    this.nextAt = m.t + rand(m.rng, a, b);
  }
  update(m, p2) {
    if (!m.quiet && m.t >= this.nextAt && m.freeze <= 0) this.shuffle(m);
    const tau = m.t - this.t0;
    if (tau < 0 || tau > 1.2) return;
    for (const side of ["L", "R"]) {
      const x = tau - ((side === "L" ? 1 : -1) * this.lead > 0 ? 0 : 0.07);
      if (x <= 0) continue;
      const env = smoothstep(0, 0.07, x) * (1 - smoothstep(0.22, 0.6, x));
      const jig = Math.sin(x * 12 * Math.PI * 2) * smoothstep(0.05, 0.1, x) * (1 - smoothstep(0.2, 0.42, x));
      p2.wing[side].lift += (env * 0.2 + jig * 0.06) * this.amp;
      p2.wing[side].droop += env * 0.1 * this.amp;
    }
    const b = smoothstep(0, 0.08, tau) * (1 - smoothstep(0.15, 0.5, tau));
    p2.bodyShift.y += b * 6e-3;
    p2.addLift(0.5, 0.25, b * 0.12);
  }
}
class StartleLayer {
  constructor(mind) {
    __publicField(this, "mind");
    __publicField(this, "name", "startle");
    __publicField(this, "crouch", new Spring(4.2, 0.42));
    __publicField(this, "t0", -100);
    __publicField(this, "strength", 0);
    this.mind = mind;
  }
  fire(strength) {
    const m = this.mind;
    this.strength = strength;
    this.t0 = m.t;
    m.arousal = Math.max(m.arousal, 0.6 + 0.4 * strength);
    m.freeze = 0.45 + m.rng() * 0.55;
    this.crouch.kick(-0.9 * strength);
    m.emit("startle", { strength });
  }
  update(m, p2) {
    const c = this.crouch.step(0, m.dt);
    p2.bodyShift.y += c;
    p2.bodyPitch += -c * 2.2;
    p2.headShift.y += c * 0.6;
    const tau = m.t - this.t0;
    if (tau < 0 || tau > 8) return;
    const s = this.strength;
    const sleek = Math.exp(-tau / 1.6) * Math.min(tau / 0.05, 1);
    p2.fluff -= 0.13 * sleek * s;
    p2.headShift.y += 0.02 * sleek * s;
    const flick = Math.exp(-tau / 0.09) * Math.min(tau / 0.03, 1);
    p2.wing.L.lift += flick * 0.42 * s;
    p2.wing.R.lift += flick * 0.42 * s;
    p2.lidUpper -= 0.2 * sleek;
    p2.lidLower -= 0.2 * sleek;
  }
}
const minJerk = (u) => u * u * u * (10 + u * (-15 + 6 * u));
const STILL = 0.06;
class ForageLayer {
  constructor(mind, solver, headRest, pick2, swallowed, hop = null) {
    __publicField(this, "mind");
    __publicField(this, "solver");
    __publicField(this, "headRest");
    __publicField(this, "pick");
    __publicField(this, "swallowed");
    __publicField(this, "hop");
    __publicField(this, "name", "forage");
    /** how far the neck will unfold / tuck to bring the bill tip onto a seed */
    __publicField(this, "reachOut", 0.3);
    __publicField(this, "reachIn", 0.2);
    /** how close the tip must be when the bill shuts for it to count */
    __publicField(this, "catchRadius", 0.05);
    __publicField(this, "state", "idle");
    __publicField(this, "id", -1);
    __publicField(this, "t0", 0);
    __publicField(this, "dur", 0.15);
    __publicField(this, "decideAt", 0);
    __publicField(this, "watchUntil", 0);
    __publicField(this, "readyAt", 0);
    __publicField(this, "retried", false);
    __publicField(this, "ignore", /* @__PURE__ */ new Map());
    __publicField(this, "target", new THREE.Vector3());
    __publicField(this, "w", 0);
    __publicField(this, "wFrom", 0);
    __publicField(this, "lean", 0);
    __publicField(this, "yaw", 0);
    __publicField(this, "rel", new THREE.Vector3());
    __publicField(this, "focus", new THREE.Vector3());
    __publicField(this, "licks", 3);
    __publicField(this, "carried", -1);
    __publicField(this, "hopAt", 0);
    __publicField(this, "moved", new THREE.Vector3());
    this.mind = mind;
    this.solver = solver;
    this.headRest = headRest;
    this.pick = pick2;
    this.swallowed = swallowed;
    this.hop = hop;
    mind.on("startle", () => {
      if (this.carried >= 0) this.swallowed(this.carried);
      this.carried = -1;
      this.release(this.mind, "idle");
      this.readyAt = this.mind.t + 1.5;
    });
  }
  seed(m) {
    return m.food.find((f2) => f2.id === this.id);
  }
  /** How much the neck would have to unfold (+) or tuck (−) for the tip to touch p; null if out of reach. */
  slideFor(p2) {
    const r = this.rel.copy(p2).sub(this.headRest);
    const dist = r.length();
    const yaw = Math.atan2(r.x, r.z);
    const elev = Math.asin(clamp(r.y / Math.max(dist, 1e-6), -1, 1));
    if (Math.abs(yaw) > 2 || elev < -0.95 || elev > 1.3 || p2.y < -0.12) return null;
    const slide = dist - this.solver.billReach;
    return slide > this.reachOut || slide < -this.reachIn ? null : slide;
  }
  inView(p2) {
    const r = this.rel.copy(p2).sub(this.headRest);
    return Math.abs(Math.atan2(r.x, r.z)) < 2.2 && r.length() < 2.2 && p2.y > -0.9;
  }
  release(m, to) {
    this.state = to;
    this.t0 = m.t;
    this.wFrom = this.w;
    if (to === "idle") {
      m.focus = null;
      m.gazeLock = false;
      this.id = -1;
    }
  }
  begin(m, to, dur) {
    this.state = to;
    this.t0 = m.t;
    this.dur = dur;
    this.wFrom = this.w;
  }
  update(m, p2) {
    const t = m.t;
    const u = clamp((t - this.t0) / this.dur, 0, 1);
    let seed = this.seed(m);
    m.eating = this.state !== "idle" && this.state !== "watch";
    switch (this.state) {
      case "idle": {
        this.w = damp(this.w, 0, 22, m.dt);
        if (t < this.readyAt) break;
        let best = null;
        let bestD = Infinity;
        for (const f2 of m.food) {
          if (!this.inView(f2.pos)) continue;
          if ((this.ignore.get(f2.id) ?? 0) > t && this.slideFor(f2.pos) === null) continue;
          if (f2.vel.lengthSq() < STILL * STILL && this.slideFor(f2.pos) === null) continue;
          const d = f2.pos.distanceTo(this.headRest) - (this.slideFor(f2.pos) !== null ? 1 : 0);
          if (d < bestD) {
            bestD = d;
            best = f2;
          }
        }
        if (best) {
          this.id = best.id;
          this.state = "watch";
          this.decideAt = 0;
          this.watchUntil = t + rand(m.rng, 0.7, 1.5);
          m.focus = this.focus.copy(best.pos);
          m.focusId++;
          m.excite(0.25);
        }
        break;
      }
      case "watch": {
        this.w = damp(this.w, 0, 22, m.dt);
        if (!seed || !this.inView(seed.pos)) {
          this.release(m, "idle");
          break;
        }
        m.focus = this.focus.copy(seed.pos);
        if (this.hop?.busy) break;
        if (this.slideFor(seed.pos) === null) {
          this.decideAt = 0;
          if (this.hop && m.freeze <= 0) {
            if (!this.hopAt) this.hopAt = t + rand(m.rng, 0.45, 1.1);
            if (t >= this.hopAt) {
              const sp = seed.pos;
              const x = this.hop.spotFor((move) => this.slideFor(this.moved.copy(sp).sub(move)) !== null);
              this.hopAt = t + rand(m.rng, 0.5, 0.9);
              if (x !== null && this.hop.go(m, x)) {
                this.watchUntil = Math.max(this.watchUntil, t + 3);
                break;
              }
            }
          }
          if (seed.vel.lengthSq() < STILL * STILL) this.watchUntil = Math.min(this.watchUntil, t + 0.25);
          if (t > this.watchUntil) {
            this.ignore.set(seed.id, t + rand(m.rng, 25, 45));
            this.release(m, "idle");
            this.readyAt = t + rand(m.rng, 0.3, 1);
          }
          break;
        }
        this.hopAt = 0;
        if (!this.decideAt) this.decideAt = t + rand(m.rng, 0.35, 1.1);
        if (t >= this.decideAt && !m.saccading && m.freeze <= 0) {
          m.gazeLock = true;
          this.retried = false;
          this.begin(m, "windup", rand(m.rng, 0.09, 0.13));
          m.emit("strike", { id: seed.id });
        }
        break;
      }
      case "windup": {
        if (!seed) {
          this.release(m, "idle");
          break;
        }
        const k = Math.sin(u * Math.PI * 0.5);
        this.rel.copy(seed.pos).sub(this.headRest).normalize();
        p2.headShift.addScaledVector(this.rel, -0.03 * k);
        p2.bodyShift.y -= 6e-3 * k;
        if (u >= 1) {
          const slide = this.slideFor(seed.pos) ?? 0;
          this.lean = slide;
          this.yaw = Math.atan2(seed.pos.x - this.headRest.x, seed.pos.z - this.headRest.z);
          this.begin(m, "strike", clamp(0.13 + Math.abs(slide) * 0.2, 0.12, 0.2));
        }
        break;
      }
      case "strike": {
        if (!seed) {
          this.begin(m, "retract", 0.2);
          break;
        }
        this.target.copy(seed.pos).addScaledVector(seed.vel, (1 - u) * this.dur);
        this.w = this.wFrom + (1 - this.wFrom) * (1 - Math.pow(1 - u, 3));
        p2.jaw += smoothstep(0.2, 0.7, u) * (1 - smoothstep(0.92, 1, u) * 0.88) * 0.95;
        if (u >= 1) {
          if (this.solver.tip.distanceTo(seed.pos) < this.catchRadius) {
            this.pick(seed.id);
            this.carried = seed.id;
            m.excite(0.1);
            this.begin(m, "hold", rand(m.rng, 0.06, 0.1));
          } else if (!this.retried && this.slideFor(seed.pos) !== null) {
            this.retried = true;
            this.begin(m, "strike", 0.1);
          } else {
            this.ignore.set(seed.id, t + rand(m.rng, 3, 5));
            this.begin(m, "retract", 0.22);
          }
        }
        break;
      }
      case "hold":
        this.w = 1;
        p2.jaw += 0.1;
        if (u >= 1) {
          m.focus = null;
          this.licks = 2;
          this.begin(m, "eat", this.licks * 0.13 + 0.04);
        }
        break;
      case "retract":
        this.w = this.wFrom * (1 - minJerk(u));
        if (u >= 1) {
          this.release(m, "idle");
          this.readyAt = t + rand(m.rng, 0.3, 0.9);
        }
        break;
      case "eat": {
        this.w = this.wFrom * (1 - minJerk(clamp((t - this.t0) / 0.2, 0, 1)));
        const x = clamp((t - this.t0) / (this.dur - 0.04) * this.licks, 0, this.licks);
        const i = Math.min(Math.floor(x), this.licks - 1);
        const f2 = x >= this.licks ? 1 : x - i;
        const from = 1 - i / this.licks;
        const to = 1 - (i + 1) / this.licks;
        const outK = Math.sin(Math.PI * smoothstep(0, 0.55, f2));
        p2.tongueOut += clamp((from - 0.72) / 0.65 * outK + 0.04 * outK, 0, 1);
        p2.carryAt = lerp(from, to + 0.04, smoothstep(0.35, 1, f2));
        p2.jaw += 0.12 + 0.3 * Math.sin(Math.PI * smoothstep(0, 0.7, f2)) - 0.08 * smoothstep(0.75, 1, f2);
        p2.headPitch += 0.03 * Math.sin(Math.PI * f2);
        if (u >= 1) this.begin(m, "swallow", rand(m.rng, 0.36, 0.44));
        break;
      }
      case "swallow": {
        this.w = 0;
        p2.carryAt = 0.04;
        const toss = Math.sin(Math.PI * smoothstep(0, 0.55, u)) * 0.26;
        p2.headPitch += toss;
        p2.headShift.y += toss * 0.03;
        p2.jaw += Math.sin(Math.PI * smoothstep(0.1, 0.5, u)) * 0.45;
        const bob = Math.sin(Math.PI * smoothstep(0.35, 0.95, u));
        p2.gorget += bob * 0.16;
        p2.addLift(0.2, 0.12, bob * 0.12);
        if (u > 0.18 && this.carried >= 0) {
          this.swallowed(this.carried);
          m.emit("ate", { id: this.carried });
          this.carried = -1;
        }
        if (u >= 1) {
          this.release(m, "idle");
          this.readyAt = t + rand(m.rng, 0.4, 1.3);
        }
        break;
      }
    }
    if (this.w > 1e-3) {
      p2.reachTarget.copy(this.target);
      p2.reachWeight = this.w;
      p2.bodyPitch += this.w * clamp(this.lean * 0.75, -0.16, 0.24);
      p2.bodyYaw += this.w * this.yaw * 0.14;
      p2.bodyShift.y -= this.w * 8e-3;
      p2.headStabil *= 1 - this.w;
    }
  }
}
class MouthLayer {
  constructor(mind) {
    __publicField(this, "name", "mouth");
    /** seconds between idle tongue flicks, min and max */
    __publicField(this, "lickEvery", [14, 36]);
    /** seconds between songs of its own, min and max */
    __publicField(this, "singEvery", [30, 80]);
    /** something else has the bird's attention (off the perch, preening, hopping) */
    __publicField(this, "blocked", () => false);
    /** the bird's own voice heard from outside, 0…1, set every frame (a recording playing): it sings along */
    __publicField(this, "voice", 0);
    /** how wide the bill goes for it, and how far the head lifts (radians) */
    __publicField(this, "voiceOpen", 0.75);
    __publicField(this, "voiceUp", 0.16);
    __publicField(this, "voiced", 0);
    // a run of flicks: start time and reach of each
    __publicField(this, "flicks", []);
    __publicField(this, "nextLick");
    __publicField(this, "singFrom", -10);
    __publicField(this, "singFor", 0);
    __publicField(this, "bursts", []);
    __publicField(this, "nextSing");
    /** the throat, lagging behind the bursts */
    __publicField(this, "pump", 0);
    this.nextLick = rand(mind.rng, 5, 14);
    this.nextSing = rand(mind.rng, 14, 34);
    mind.on("ate", () => {
      if (mind.rng() < 0.7) this.nextLick = mind.t + rand(mind.rng, 0.25, 0.6);
    });
    mind.on("startle", () => {
      this.singFor = 0;
      this.flicks.length = 0;
      this.nextLick = mind.t + rand(mind.rng, 8, 16);
      this.nextSing = Math.max(this.nextSing, mind.t + rand(mind.rng, 12, 30));
    });
  }
  /** Flick the tongue: `count` flicks in a row, the first reaching `amount` (0 … 1 of its travel). */
  lick(m, amount = rand(m.rng, 0.56, 0.68), count = m.rng() < 0.45 ? 1 : m.rng() < 0.6 ? 2 : 3) {
    this.flicks.length = 0;
    let at = m.t;
    for (let i = 0; i < count; i++) {
      this.flicks.push({ at, amp: i === 0 ? amount : amount * rand(m.rng, 0.8, 1.05) });
      at += rand(m.rng, 0.21, 0.3);
    }
    this.nextLick = m.t + rand(m.rng, this.lickEvery[0], this.lickEvery[1]);
  }
  /** Sing for about this long: bursts of bill chatter with the throat pumping. */
  sing(m, seconds = 1.6) {
    this.singFrom = m.t;
    this.bursts.length = 0;
    let at = 0.06;
    while (at < seconds - 0.2 || this.bursts.length === 0) {
      const notes = 3 + Math.floor(m.rng() * 3);
      const hz = rand(m.rng, 13, 16.5);
      this.bursts.push({ at, notes, hz, amp: rand(m.rng, 0.26, 0.4) });
      at += notes / hz + (m.rng() < 0.25 ? rand(m.rng, 0.32, 0.5) : rand(m.rng, 0.1, 0.22));
    }
    const last = this.bursts[this.bursts.length - 1];
    this.singFor = last.at + last.notes / last.hz + 0.25;
    this.nextSing = m.t + this.singFor + rand(m.rng, this.singEvery[0], this.singEvery[1]);
    this.flicks.length = 0;
    this.nextLick = Math.max(this.nextLick, m.t + this.singFor + rand(m.rng, 1.5, 5));
  }
  get singing() {
    return this.singFor > 0;
  }
  update(m, p2) {
    const calm = !m.quiet && !m.gazeLock && !m.focus && !m.eating && m.freeze <= 0 && !this.blocked();
    const own = !m.species.noTongue;
    if (own && calm && m.t >= this.nextLick && m.arousal < 0.6 && !this.singing) this.lick(m);
    if (own && calm && m.t >= this.nextSing && !this.singing) {
      if (m.arousal < 0.42 && this.flicks.length === 0) this.sing(m, rand(m.rng, 1.1, 2.4));
      else this.nextSing = m.t + rand(m.rng, 4, 9);
    }
    let tongue = 0;
    for (const f2 of this.flicks) {
      const x = (m.t - f2.at) / 0.19;
      if (x >= 0 && x <= 1) tongue = Math.max(tongue, f2.amp * Math.sin(Math.PI * Math.pow(smoothstep(0, 1, x), 0.8)));
    }
    if (this.flicks.length && m.t > this.flicks[this.flicks.length - 1].at + 0.2) this.flicks.length = 0;
    if (tongue > 0) {
      p2.tongueOut += Math.min(tongue, 0.7);
      p2.tongueCurl += 0.16 * smoothstep(0.3, 0.6, tongue);
      p2.jaw += 0.02 * smoothstep(0, 0.3, tongue);
    }
    let burst = 0;
    let note = 0;
    let amp = 0;
    const s = m.t - this.singFrom;
    if (this.singFor > 0) {
      if (s > this.singFor || this.blocked()) this.singFor = 0;
      else {
        for (const b of this.bursts) {
          const u = s - b.at;
          const len = b.notes / b.hz;
          if (u < 0 || u > len) continue;
          burst = smoothstep(0, 0.03, u) * (1 - smoothstep(len - 0.03, len, u));
          note = 0.5 - 0.5 * Math.cos(u * b.hz * Math.PI * 2);
          amp = b.amp;
        }
      }
    }
    const heard = this.blocked() ? 0 : this.voice;
    this.voiced = damp(this.voiced, heard > 0.06 ? 1 : 0, heard > 0.06 ? 9 : 1.6, m.dt);
    if (this.voiced > 0.01) {
      burst = Math.max(burst, smoothstep(0.03, 0.2, heard) * this.voiced);
      note = Math.max(note, Math.min(heard * 1.4, 1));
      amp = Math.max(amp, this.voiceOpen);
      p2.headPitch += this.voiced * this.voiceUp;
      p2.headShift.y += this.voiced * 0.012;
      p2.fluff += this.voiced * 0.03;
    }
    this.pump = damp(this.pump, burst, burst > this.pump ? 30 : 11, m.dt);
    const k = this.pump;
    if (k < 2e-3 && burst === 0) return;
    p2.jaw += burst * amp * (0.1 + 0.9 * note);
    p2.gorget += k * 0.2 + burst * note * 0.05;
    p2.addLift(0.2, 0.07, k * 0.16);
    p2.crest -= k * 0.14;
    p2.addLift(0, 0.07, -k * 0.14);
    p2.addLift(0.4, 0.09, -k * 0.3);
    p2.breath -= k * 0.7;
    p2.headPitch += k * 0.035 + burst * note * 0.012;
    p2.headShift.y -= k * 4e-3;
    p2.headShift.z -= k * 3e-3;
    p2.tailPitch -= k * 0.03;
  }
}
const newFrame = () => ({ point: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0), tangent: new THREE.Vector3(1, 0, 0), radius: 0.0405 });
class HopLayer {
  constructor(mind, ground) {
    __publicField(this, "mind");
    __publicField(this, "ground");
    __publicField(this, "name", "hop");
    /** longest single hop along the perch */
    __publicField(this, "maxHop", 0.35);
    /** after this long with nothing to eat, wander back toward the middle (0 = never) */
    __publicField(this, "homeAfter", [14, 30]);
    /** where on the perch it likes to sit, and drifts back to */
    __publicField(this, "home", 0);
    /** something else is moving the bird (it has flown): no hops until released */
    __publicField(this, "hold", false);
    /** where on the perch the bird stands (world x) */
    __publicField(this, "x", 0);
    __publicField(this, "phase", "stand");
    __publicField(this, "t0", 0);
    __publicField(this, "dur", 0.1);
    __publicField(this, "x0", 0);
    __publicField(this, "x1", 0);
    __publicField(this, "apex", 0.05);
    __publicField(this, "from", newFrame());
    __publicField(this, "to", newFrame());
    __publicField(this, "here", newFrame());
    __publicField(this, "tmp", newFrame());
    __publicField(this, "legs", new Spring(5.5, 0.4));
    __publicField(this, "lag", new THREE.Vector3());
    __publicField(this, "anchor", new THREE.Vector3());
    __publicField(this, "off", new THREE.Vector3());
    __publicField(this, "slope", 0);
    __publicField(this, "scale", 1);
    __publicField(this, "placed", false);
    __publicField(this, "homeAt", 20);
    __publicField(this, "lastFood", 0);
    this.mind = mind;
    this.ground = ground;
    mind.on("startle", (e) => {
      if (this.hold || this.phase !== "stand" || mind.eating || mind.rng() > 0.55 * e.strength) return;
      const d = rand(mind.rng, 0.1, 0.2) * (mind.rng() < 0.5 ? -1 : 1);
      const x = this.clampX(this.x + d);
      if (Math.abs(x - this.x) > 0.06) this.go(mind, x, 0.05);
    });
  }
  get busy() {
    return this.phase !== "stand";
  }
  clampX(x) {
    return clamp(x, this.ground.range[0], this.ground.range[1]);
  }
  frame(x, out) {
    const f2 = this.ground.at?.(x, out) ?? null;
    if (!f2) {
      out.point.set(x, this.ground.root.position.y, this.ground.root.position.z);
      out.up.set(0, 1, 0);
      out.tangent.set(1, 0, 0);
      out.radius = this.ground.restRadius;
    }
    return out;
  }
  /** The perch changed under the bird (new twig): stand on it where we are. */
  reseat() {
    this.placed = false;
  }
  /**
   * Where to hop so that `ok` comes to hold: the nearest spot on the perch from which it
   * does, or, if that is more than one hop away, one hop toward it. `ok` is given how far
   * the root would have moved (so the caller can ask "would the seed be in reach from
   * there?"). null if nowhere on the perch will do.
   */
  spotFor(ok) {
    if (!this.ground.at) return null;
    const span = this.ground.range[1] - this.ground.range[0];
    for (let d = 0.1; d <= span + 1e-6; d += 0.05) {
      for (const sgn of [1, -1]) {
        const x = this.x + sgn * d;
        if (x < this.ground.range[0] || x > this.ground.range[1]) continue;
        const f2 = this.ground.at(x, this.tmp);
        if (!f2) continue;
        if (ok(this.off.copy(f2.point).sub(this.here.point))) return this.x + sgn * Math.min(d, this.maxHop);
      }
    }
    return null;
  }
  /** The bird will come down at world x (clamped): from now on that is where it stands. Returns the x, fills in the point. */
  place(x, out) {
    this.x = this.clampX(x);
    this.frame(this.x, this.here);
    this.slope = Math.atan2(this.here.tangent.y, this.here.tangent.x);
    this.scale = this.here.radius / this.ground.restRadius;
    out.copy(this.here.point);
    return this.x;
  }
  /** It just touched down from flight: the legs take it. */
  landed() {
    this.legs.kick(-1.1);
    this.follow();
  }
  /** The root was moved from outside: the head does not lag behind it. */
  follow() {
    this.anchor.copy(this.ground.root.position);
  }
  /** Hop to world x on the perch (clamped to the allowed range and to one hop). */
  go(m, x, crouch = rand(m.rng, 0.07, 0.11)) {
    if (this.hold || this.phase !== "stand") return false;
    x = this.clampX(clamp(x, this.x - this.maxHop, this.x + this.maxHop));
    if (Math.abs(x - this.x) < 0.03) return false;
    this.x0 = this.x;
    this.x1 = x;
    this.frame(this.x0, this.from);
    this.frame(this.x1, this.to);
    const dist = this.from.point.distanceTo(this.to.point);
    this.apex = clamp(0.035 + dist * 0.13, 0.04, 0.08);
    this.phase = "crouch";
    this.t0 = m.t;
    this.dur = crouch;
    m.excite(0.15);
    return true;
  }
  update(m, p2) {
    const root = this.ground.root;
    if (!this.placed) {
      this.placed = true;
      this.x = this.clampX(root.position.x);
      this.frame(this.x, this.here);
      root.position.copy(this.here.point);
      this.anchor.copy(root.position);
      this.slope = Math.atan2(this.here.tangent.y, this.here.tangent.x);
      this.scale = this.here.radius / this.ground.restRadius;
    }
    const t = m.t;
    const u = clamp((t - this.t0) / this.dur, 0, 1);
    let grip = 1;
    if (m.food.length) this.lastFood = t;
    if (this.phase === "stand" && !this.hold && this.homeAfter[1] > 0 && !m.quiet && !m.eating && m.freeze <= 0 && Math.abs(this.x - this.home) > 0.12 && t - this.lastFood > 4 && t > this.homeAt) {
      this.go(m, this.home + (this.x - this.home) * 0.3);
      this.homeAt = t + rand(m.rng, this.homeAfter[0], this.homeAfter[1]);
    }
    switch (this.phase) {
      case "crouch": {
        const k = Math.sin(u * Math.PI * 0.5);
        p2.bodyShift.y -= 0.022 * k;
        p2.bodyPitch += 0.07 * k;
        p2.wing.L.lift += 0.1 * k;
        p2.wing.R.lift += 0.1 * k;
        if (u >= 1) {
          m.emit("perch", { x: this.x0, push: 0.45, on: false, side: 0 });
          this.phase = "air";
          this.t0 = t;
          this.dur = clamp(0.12 + this.from.point.distanceTo(this.to.point) * 0.38, 0.12, 0.25);
        }
        break;
      }
      case "air": {
        root.position.copy(this.from.point).lerp(this.to.point, u);
        root.position.y += 4 * this.apex * u * (1 - u);
        this.slope = lerp(Math.atan2(this.from.tangent.y, this.from.tangent.x), Math.atan2(this.to.tangent.y, this.to.tangent.x), u);
        this.scale = lerp(this.from.radius, this.to.radius, u) / this.ground.restRadius;
        const air = Math.sin(Math.PI * u);
        grip = 1 - smoothstep(0, 0.2, u) * (1 - smoothstep(0.75, 1, u));
        p2.bodyShift.y += 0.014 * (1 - u) - 0.012 * air + 8e-3 * smoothstep(0.7, 1, u);
        p2.bodyPitch += 0.07 * (1 - u) - 0.04 * air;
        const side = Math.sign(this.x1 - this.x0);
        p2.bodyRoll += -side * 0.07 * air;
        p2.wing.L.lift += 0.1 + 0.3 * air;
        p2.wing.R.lift += 0.1 + 0.3 * air;
        p2.wing.L.droop += 0.12 * air;
        p2.wing.R.droop += 0.12 * air;
        p2.tailFan += 0.5 * air;
        p2.tailPitch += 0.12 * air;
        p2.fluff -= 0.05 * air;
        if (u >= 1) {
          this.x = this.x1;
          this.frame(this.x, this.here);
          root.position.copy(this.here.point);
          this.phase = "land";
          this.t0 = t;
          this.dur = 0.28;
          this.legs.kick(-0.75);
          m.emit("perch", { x: this.x1, push: 0.55, on: true, side: 0 });
        }
        break;
      }
      case "land": {
        const k = 1 - smoothstep(0, 1, u);
        p2.wing.L.lift += 0.1 * k;
        p2.wing.R.lift += 0.1 * k;
        p2.tailFan += 0.3 * k;
        p2.tailPitch -= 0.1 * Math.sin(Math.PI * u) * 0.8;
        p2.addLift(0.55, 0.3, 0.14 * Math.sin(Math.PI * smoothstep(0, 0.8, u)));
        if (u >= 1) this.phase = "stand";
        break;
      }
    }
    const c = this.legs.step(0, m.dt);
    p2.bodyShift.y += c;
    p2.bodyPitch += -c * 1.6;
    this.anchor.x = damp(this.anchor.x, root.position.x, this.phase === "air" ? 9 : 16, m.dt);
    this.anchor.y = damp(this.anchor.y, root.position.y, this.phase === "air" ? 9 : 16, m.dt);
    this.anchor.z = damp(this.anchor.z, root.position.z, 16, m.dt);
    this.lag.copy(this.anchor).sub(root.position).clampLength(0, 0.16);
    p2.headShift.add(this.lag);
    p2.feetSlope = this.slope;
    p2.feetScale = this.scale;
    p2.grip = grip;
    p2.bodyRoll += this.slope * 0.12;
  }
}
function createWingBlur(rig) {
  const W = rig.species.wing;
  const R2 = W.hand + W.primaryLen[1] * 0.92;
  const rng = mulberry32(rig.species.seed + 501);
  const TW = 64;
  const TH = 4;
  const data = new Uint8Array(TW * TH * 4);
  for (let x = 0; x < TW; x++) {
    const v = 0.45 + 0.55 * Math.pow(rng(), 2.2) + (rng() < 0.12 ? 0.6 : 0);
    for (let y = 0; y < TH; y++) data.set([255, Math.min(255, v * 200), 255, 255], (y * TW + x) * 4);
  }
  const streaks = new THREE.DataTexture(data, TW, TH);
  streaks.wrapS = THREE.RepeatWrapping;
  streaks.magFilter = streaks.minFilter = THREE.LinearFilter;
  streaks.needsUpdate = true;
  const material = new THREE.MeshBasicMaterial({
    color: new THREE.Color(W.color).multiplyScalar(1.6),
    alphaMap: streaks,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    opacity: 0
  });
  const meshes = [];
  const chest = rig.rest.chest.worldPos;
  for (const side of SIDES) {
    const sg = sideSign(side);
    const pos = [];
    const colr = [];
    const uv = [];
    const idx = [];
    const NA = 28;
    const NR = 6;
    for (const elev of [-24, -8, 8, 24]) {
      const start = pos.length / 3;
      for (let i = 0; i <= NA; i++) {
        const a = i / NA;
        const phi2 = (-98 + 172 * a) * DEG;
        for (let j = 0; j <= NR; j++) {
          const r = j / NR;
          const y = Math.tan(elev * DEG) * r * R2 * (0.6 + 0.4 * Math.cos((a - 0.5) * Math.PI * 2));
          pos.push(sg * Math.cos(phi2) * r * R2, y + 0.04 * r, Math.sin(phi2) * r * R2);
          const env = smoothstep(0.05, 0.4, r) * (1 - smoothstep(0.8, 1, r)) * (0.5 + 0.9 * Math.pow(Math.abs(a * 2 - 1), 2.5)) * smoothstep(0, 0.06, a) * (1 - smoothstep(0.94, 1, a));
          colr.push(1, 1, 1, env * (Math.abs(elev) < 10 ? 0.5 : 0.36));
          uv.push(a * 2.2, r);
        }
      }
      for (let i = 0; i < NA; i++) {
        for (let j = 0; j < NR; j++) {
          const p0 = start + i * (NR + 1) + j;
          const p1 = p0 + NR + 1;
          idx.push(p0, p1, p0 + 1, p1, p1 + 1, p0 + 1);
        }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(colr, 4));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    const m = new THREE.Mesh(g, material);
    m.name = `bird.wingBlur.${side}`;
    m.frustumCulled = false;
    m.visible = false;
    m.renderOrder = 2;
    m.position.copy(rig.rest[`shoulder.${side}`].worldPos).sub(chest);
    rig.bones.chest.add(m);
    meshes.push(m);
  }
  return {
    set(amount, tilt = 0.6) {
      const on = amount > 4e-3;
      for (const m of meshes) {
        m.visible = on;
        m.rotation.set(tilt + (Math.random() - 0.5) * 0.16, (Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.12);
      }
      if (!on) return;
      material.opacity = amount * (0.8 + 0.45 * Math.random());
      streaks.offset.x = Math.random();
    },
    dispose() {
      for (const m of meshes) {
        m.removeFromParent();
        m.geometry.dispose();
      }
      material.dispose();
      streaks.dispose();
    }
  };
}
const BLUR = 2;
class FleeLayer {
  constructor(mind, rig, root, hop, ruffle, tail) {
    __publicField(this, "mind");
    __publicField(this, "rig");
    __publicField(this, "root");
    __publicField(this, "hop");
    __publicField(this, "ruffle");
    __publicField(this, "tail");
    __publicField(this, "name", "flee");
    /** seconds it stays away */
    __publicField(this, "awayFor", [2, 5]);
    /** seconds between leaving of its own accord (it rarely does) */
    __publicField(this, "every", [70, 200]);
    /** stretches every phase of the flight: 1 = a hummingbird's zip, 2.5 = a thrush */
    __publicField(this, "pace", 1);
    /** once off, stay off until arrive() is called */
    __publicField(this, "stay", false);
    /** never leaves of its own accord */
    __publicField(this, "tame", false);
    __publicField(this, "phase", "idle");
    __publicField(this, "t0", 0);
    __publicField(this, "dur", 0.4);
    __publicField(this, "side", 1);
    __publicField(this, "from", new THREE.Vector3());
    __publicField(this, "out", new THREE.Vector3());
    __publicField(this, "hover", new THREE.Vector3());
    __publicField(this, "landAt", new THREE.Vector3());
    __publicField(this, "far", new THREE.Vector3());
    __publicField(this, "landX", 0);
    __publicField(this, "nextAt");
    // made up front, hidden: its shader compiles with the rest while loading, not on the first flight
    __publicField(this, "blur");
    __publicField(this, "shakeAt", -1);
    this.mind = mind;
    this.rig = rig;
    this.root = root;
    this.hop = hop;
    this.ruffle = ruffle;
    this.tail = tail;
    this.nextAt = rand(mind.rng, this.every[0], this.every[1]);
    this.blur = createWingBlur(rig);
  }
  /** off the perch, or about to be */
  get active() {
    return this.phase !== "idle";
  }
  /** not there to be seen or fed */
  /** on the twig: not off it in the air (gathering itself to go and settling after landing count) */
  get perched() {
    return this.phase === "idle" || this.phase === "ready" || this.phase === "land";
  }
  get gone() {
    return this.phase === "away";
  }
  start() {
    const m = this.mind;
    if (this.active || this.hop.busy) return false;
    this.hop.hold = true;
    m.emit("startle", { strength: 1 });
    m.arousal = 1;
    m.freeze = 0;
    this.phase = "ready";
    this.t0 = m.t;
    this.dur = rand(m.rng, 0.3, 0.48);
    this.side = m.rng() < 0.5 ? 1 : -1;
    this.nextAt = m.t + rand(m.rng, this.every[0], this.every[1]);
    return true;
  }
  go(phase, dur) {
    this.phase = phase;
    this.t0 = this.mind.t;
    this.dur = phase === "away" ? dur : dur * this.pace;
  }
  /** Start out of sight, as if it had left already (stay is set: call arrive()). */
  beginAway() {
    this.stay = true;
    this.hop.hold = true;
    this.root.visible = false;
    this.phase = "away";
    this.t0 = this.mind.t;
    this.dur = Infinity;
  }
  /** Come in and land, if it is away. */
  arrive() {
    if (this.phase !== "away") return false;
    this.t0 = this.mind.t - 1;
    this.dur = 1;
    return true;
  }
  /** Leave and do not come back until arrive(). */
  leave() {
    this.stay = true;
    return this.phase === "away" || this.start() || this.active;
  }
  update(m, p2) {
    if (this.phase === "idle") {
      if (!this.tame && !m.quiet && m.t >= this.nextAt && !m.eating && m.freeze <= 0) this.start();
      if (this.shakeAt > 0 && m.t >= this.shakeAt) {
        this.shakeAt = -1;
        this.ruffle.trigger(m, "shake", 0.7);
      }
      if (this.phase === "idle") return;
    }
    const root = this.root;
    const u = clamp((m.t - this.t0) / this.dur, 0, 1);
    let spread = 0;
    let blur = 0;
    let tilt = 0.6;
    m.gazeLock = this.phase !== "land";
    switch (this.phase) {
      case "ready": {
        const k = Math.sin(u * Math.PI * 0.5);
        p2.bodyShift.y -= 0.04 * k;
        p2.bodyShift.z += 0.02 * k;
        p2.bodyPitch += 0.34 * k;
        p2.headShift.y -= 0.012 * k;
        p2.fluff -= 0.12 * k;
        p2.tailFan += 0.35 * k;
        p2.tailPitch -= 0.12 * k;
        spread = 0.42 * smoothstep(0, 0.8, u);
        const tremble = Math.sin(m.t * 46 * Math.PI) * 0.05 * k;
        for (const s of ["L", "R"]) {
          p2.wing[s].lift += 0.25 * k + tremble;
          p2.wing[s].droop += 0.08 * k;
        }
        if (u >= 1) {
          this.from.copy(root.position);
          this.out.set(this.side * 0.55, 1, 0.12).normalize();
          m.emit("perch", { x: this.from.x, push: 1, on: false, side: 0.4 });
          this.go("takeoff", 0.27);
        }
        break;
      }
      case "takeoff": {
        root.position.copy(this.from).addScaledVector(this.out, 0.35 * u + 7.5 * u * u * u);
        spread = BLUR;
        blur = smoothstep(0, 0.12, u);
        p2.grip = 1 - smoothstep(0, 0.15, u);
        p2.bodyShift.y += 0.03 * smoothstep(0, 0.3, u);
        p2.bodyPitch += lerp(0.34, 0.1, smoothstep(0, 0.6, u));
        tilt = 0.95;
        p2.bodyRoll += -this.side * 0.25 * u;
        p2.tailFan += 0.8;
        p2.tailPitch -= 0.25;
        p2.fluff -= 0.14;
        if (u >= 1) {
          root.visible = false;
          this.go("away", this.stay ? Infinity : rand(m.rng, this.awayFor[0], this.awayFor[1]));
        }
        break;
      }
      case "away": {
        spread = BLUR;
        if (u >= 1) {
          this.stay = false;
          this.landX = this.hop.home + rand(m.rng, -0.12, 0.12);
          this.landX = this.hop.place(this.landX, this.landAt);
          this.hover.copy(this.landAt);
          this.hover.y += 0.2;
          this.far.copy(this.hover).add(new THREE.Vector3(-this.side * rand(m.rng, 3.2, 4.4), rand(m.rng, 1.8, 3), rand(m.rng, -1.2, -0.3)));
          root.position.copy(this.far);
          root.visible = true;
          this.go("approach", rand(m.rng, 0.42, 0.55));
        }
        break;
      }
      case "approach": {
        const e = 1 - Math.pow(1 - u, 3);
        root.position.copy(this.far).lerp(this.hover, e);
        spread = BLUR;
        blur = 1;
        p2.grip = 0;
        p2.bodyPitch += lerp(0.5, -0.32, smoothstep(0.35, 1, u));
        tilt = lerp(0.9, 0.35, smoothstep(0.35, 1, u));
        p2.bodyRoll += this.side * 0.3 * (1 - e);
        p2.tailFan += lerp(0.3, 1, smoothstep(0.4, 1, u));
        p2.tailPitch -= 0.3 * smoothstep(0.4, 1, u);
        p2.fluff -= 0.1;
        if (u >= 1) this.go("brake", rand(m.rng, 0.45, 0.62));
        break;
      }
      case "brake": {
        const down = smoothstep(0.6, 1, u);
        tilt = 0.35;
        root.position.copy(this.hover).lerp(this.landAt, down);
        root.position.y += 0.015 * Math.sin(m.t * 31) * (1 - down);
        root.position.x += 8e-3 * Math.sin(m.t * 23) * (1 - down);
        spread = BLUR;
        blur = 1;
        p2.grip = smoothstep(0.8, 1, u) * 0.5;
        p2.bodyPitch -= lerp(0.32, 0.05, down);
        p2.bodyShift.y += 0.02 * (1 - down);
        p2.tailFan += 1;
        p2.tailPitch -= lerp(0.3, 0.1, down);
        if (u >= 1) {
          root.position.copy(this.landAt);
          this.hop.landed();
          m.emit("perch", { x: this.landAt.x, push: 0.85, on: true, side: rand(m.rng, -1, 1) });
          this.tail.flick(m, 1.2);
          this.go("land", 0.5);
        }
        break;
      }
      case "land": {
        root.position.copy(this.landAt);
        spread = u < 0.12 ? BLUR : 1 - smoothstep(0.12, 0.75, u);
        blur = 1 - smoothstep(0, 0.14, u);
        p2.grip = 0.5 + 0.5 * smoothstep(0, 0.25, u);
        p2.tailFan += 0.8 * (1 - smoothstep(0, 0.8, u));
        for (const s of ["L", "R"]) p2.wing[s].lift += 0.3 * Math.sin(Math.PI * smoothstep(0.5, 1, u));
        if (u >= 1) {
          this.phase = "idle";
          this.hop.hold = false;
          m.gazeLock = false;
          this.shakeAt = m.t + rand(m.rng, 0.25, 0.6);
          m.freeze = 0.3;
        }
        break;
      }
    }
    const hz = this.rig.species.flapHz;
    if (hz && spread === BLUR) {
      const braking = this.phase === "brake" || this.phase === "land";
      const ph = m.t * hz * (braking ? 1.25 : 1) * Math.PI * 2;
      const beat = Math.sin(ph + 0.45 * Math.sin(ph));
      spread = 1;
      blur = 0;
      for (const s of ["L", "R"]) {
        p2.wing[s].raise = 0.12 + (braking ? 0.95 : 0.8) * beat + tilt * 0.15;
        p2.wing[s].sweep = (braking ? 0.35 : 0.1) - 0.3 * Math.cos(ph);
      }
      p2.bodyShift.y -= 0.02 * beat;
    }
    if (spread === BLUR && blur > 0.9 && Math.random() < 0.3) {
      spread = 1;
      blur *= 0.55;
      const fwd = Math.random() < 0.5;
      for (const s of ["L", "R"]) {
        p2.wing[s].sweep = fwd ? rand(Math.random, 0.7, 1) : -rand(Math.random, 0.9, 1.25);
        p2.wing[s].raise = (fwd ? -0.1 : 0.45) + tilt * 0.4;
      }
    }
    p2.wing.L.spread = p2.wing.R.spread = spread;
    this.blur.set(blur, tilt);
    this.hop.follow();
  }
  dispose() {
    this.blur.dispose();
  }
}
const SPOTS = [
  [0.44, -0.5],
  [0.52, -0.25],
  [0.38, -0.65]
];
class PreenLayer {
  constructor(mind, rig, billReach) {
    __publicField(this, "billReach");
    __publicField(this, "name", "preen");
    /** spontaneous bouts: off until it has been looked at */
    __publicField(this, "auto", false);
    /** seconds between bouts when calm */
    __publicField(this, "every", [22, 55]);
    /** set by the bird: true when something else has the body (a hop, a flight) */
    __publicField(this, "blocked", () => false);
    /** called when a bout ends, for the shake-out */
    __publicField(this, "onDone", null);
    __publicField(this, "active", false);
    // the shape of it, all in the body's own frame, left side (the right is mirrored)
    /** how far the wing swings out about the shoulder and turns its leading edge up, radians */
    __publicField(this, "wingOut", 0.44);
    __publicField(this, "wingTwist", 0.42);
    /** the line the bill lies along under the wing, base to tip */
    __publicField(this, "billDir", new THREE.Vector3(0.12, -0.86, -0.5).normalize());
    /** and the line it comes in from, the head already in place: tip down beside the flank, clear of the wing's edge */
    __publicField(this, "billOut", new THREE.Vector3(0.3, -0.92, 0.05).normalize());
    /** tip off the skin */
    __publicField(this, "tipOff", 0.03);
    /** the body's twist: yaw toward the wing, roll (the far shoulder drops), radians */
    __publicField(this, "bodyYaw", 0.22);
    __publicField(this, "bodyRoll", 0.1);
    __publicField(this, "bodyPitch", 0.06);
    /** the head turned about the bill while it is under the wing, from crown-up, radians */
    __publicField(this, "headRoll", 1.2);
    __publicField(this, "t0", 0);
    __publicField(this, "dur", 4);
    __publicField(this, "side", "L");
    __publicField(this, "nextAt");
    __publicField(this, "coord");
    __publicField(this, "hips");
    __publicField(this, "headRest");
    __publicField(this, "spots", { L: [], R: [] });
    __publicField(this, "spot", new THREE.Vector3());
    __publicField(this, "seed", 0);
    /** when it draws back mid-bout, and the spot it goes to after */
    __publicField(this, "tBreak", 0);
    __publicField(this, "order", [0, 1, 2]);
    __publicField(this, "q", new THREE.Quaternion());
    __publicField(this, "e", new THREE.Euler());
    __publicField(this, "d", new THREE.Vector3());
    __publicField(this, "a", new THREE.Vector3());
    __publicField(this, "b", new THREE.Vector3());
    this.billReach = billReach;
    this.nextAt = rand(mind.rng, this.every[0] * 0.6, this.every[1] * 0.7);
    const sfc = { p: new THREE.Vector3(), n: new THREE.Vector3(), t: new THREE.Vector3() };
    for (const sd of ["L", "R"]) {
      for (const [u, v] of SPOTS) {
        const at = rig.loft.wingAt(u, v, sideSign(sd));
        rig.loft.surface(at.s, at.ang, sfc);
        this.spots[sd].push(sfc.p.clone().addScaledVector(sfc.n, this.tipOff));
      }
    }
    this.coord = rig.loft.bodyCoord(3.4);
    this.hips = rig.rest.hips.worldPos.clone();
    this.headRest = rig.rest.head.worldPos.clone();
    mind.on("startle", () => {
      if (this.active) mind.gazeLock = false;
      this.active = false;
    });
  }
  start(m, side) {
    if (this.active || this.blocked() || m.eating) return false;
    this.active = true;
    this.t0 = m.t;
    this.dur = rand(m.rng, 4, 5);
    this.side = side ?? (m.rng() < 0.5 ? "L" : "R");
    this.seed = m.rng() * 100;
    this.tBreak = rand(m.rng, 0.42, 0.58);
    this.order = m.rng() < 0.5 ? [0, 1, 2] : [2, 0, 1];
    this.spot.copy(this.spots[this.side][this.order[0]]);
    this.nextAt = m.t + this.dur + rand(m.rng, this.every[0], this.every[1]);
    return true;
  }
  update(m, p2) {
    if (!this.active) {
      if (this.auto && !m.quiet && m.t >= this.nextAt) {
        if (m.arousal < 0.5 && m.freeze <= 0 && !m.focus && !m.saccading) this.start(m);
        else this.nextAt = m.t + 2;
      }
      if (!this.active) return;
    }
    const tau = m.t - this.t0;
    const D = this.dur;
    if (tau >= D || this.blocked()) {
      this.active = false;
      m.gazeLock = false;
      if (tau >= D) this.onDone?.(m);
      return;
    }
    m.gazeLock = true;
    const sg = sideSign(this.side);
    const ss = (a2, b) => smoothstep(a2, b, tau);
    const tOut = D - 1.3;
    const wing = ss(0, 0.42) * (1 - ss(D - 0.6, D - 0.1));
    const twist = ss(0.12, 0.7) * (1 - ss(D - 0.95, D - 0.25));
    const turn = ss(0.22, 0.8) * (1 - ss(tOut + 0.2, tOut + 0.9));
    const reach = ss(0.5, 0.95) * (1 - ss(tOut + 0.18, tOut + 0.65));
    const tA = 0.95;
    const tB = lerp(tA + 0.3, tOut, this.tBreak);
    let ins = ss(tA - 0.1, tA + 0.22) * (1 - ss(tOut, tOut + 0.24));
    ins *= 1 - 0.75 * ss(tB - 0.16, tB) * (1 - ss(tB + 0.08, tB + 0.3));
    const tC = lerp(tB, tOut, 0.55);
    const k = this.order[tau < tB ? 0 : tau < tC ? 1 : 2];
    this.spot.lerp(this.spots[this.side][k], 1 - Math.exp(-m.dt * (tau < tB + 0.3 ? 14 : 7)));
    const work = smoothstep(0.8, 1, ins);
    const ph = tau * 9.5 * Math.PI * 2 + this.seed;
    const burst = smoothstep(-0.15, 0.35, Math.sin(tau * 5.1 + this.seed) + 0.6 * Math.sin(tau * 2.3 + this.seed * 1.7));
    const nib = Math.sin(ph) * work * burst;
    const nib2 = Math.sin(ph * 0.5 + 1.3) * work * burst;
    const yaw = sg * this.bodyYaw * twist;
    const roll = sg * this.bodyRoll * twist;
    const pitch = this.bodyPitch * twist;
    p2.bodyYaw += yaw;
    p2.bodyRoll += roll;
    p2.bodyPitch += pitch;
    p2.bodyShift.x += sg * 0.012 * twist;
    p2.tailYaw += -sg * 0.14 * twist;
    p2.tailFan += 0.12 * twist;
    this.e.set(p2.bodyPitch, p2.bodyYaw, p2.bodyRoll, "YXZ");
    this.q.setFromEuler(this.e);
    const toRoot = (v) => v.sub(this.hips).applyQuaternion(this.q).add(this.hips).add(p2.bodyShift);
    const w = p2.wing[this.side];
    w.out += wing * this.wingOut + nib * 0.012 + 0.03 * work * Math.sin(tau * 3.1 + this.seed);
    w.twist += wing * this.wingTwist + nib2 * 0.015;
    w.lift += wing * 0.05;
    p2.wing[this.side === "L" ? "R" : "L"].lift += 0.05 * twist;
    const d = this.d.copy(this.billDir);
    d.x *= sg;
    const a = this.a.copy(this.spot).addScaledVector(d, -this.billReach);
    this.b.copy(this.billOut);
    this.b.x *= sg;
    d.lerp(this.b, 1 - ins).normalize();
    a.addScaledVector(d, this.billReach + nib * 0.014);
    a.z += nib2 * 6e-3;
    a.y += nib2 * 5e-3;
    toRoot(a);
    d.applyQuaternion(this.q);
    p2.reachTarget.copy(a);
    p2.reachDir.copy(d);
    p2.reachPin = 1;
    p2.reachRoll = sg * (this.headRoll + 0.05 * nib2);
    p2.reachWeight = reach;
    p2.headYaw = lerp(p2.headYaw, sg * 100 * DEG + p2.bodyYaw, turn);
    p2.headPitch = lerp(p2.headPitch, -52 * DEG, turn);
    p2.headRoll = lerp(p2.headRoll, sg * 0.15, turn);
    const hb = this.b.copy(this.spot).addScaledVector(this.d.copy(this.billDir).setX(this.billDir.x * sg), -this.billReach);
    toRoot(hb).sub(this.headRest);
    p2.headShift.addScaledVector(hb, turn * 0.8);
    p2.headStabil = lerp(p2.headStabil, 0.3, turn);
    p2.jaw += (0.1 + 0.16 * (0.5 + 0.5 * Math.sin(ph + 0.6))) * work * burst;
    p2.nict += 0.45 * work;
    p2.lidLower += 0.3 * work;
    p2.lidUpper += 0.15 * work;
    p2.addLift(this.coord, 0.09, work * (0.08 + 0.04 * Math.abs(nib)));
    p2.fluff += 0.04 * twist;
  }
}
function createBird(options = {}) {
  const species = options.species ?? MOUNTAIN_GEM;
  const root = new THREE.Group();
  root.name = "bird";
  const rig = buildRig(species);
  root.add(rig.rootBone);
  const plumageGeo = buildPlumageGeometry(rig);
  const { material: plumageMat, uniforms } = createPlumageMaterial();
  const contour = new THREE.SkinnedMesh(plumageGeo.contour, plumageMat);
  contour.name = "bird.contour";
  const flight = new THREE.SkinnedMesh(plumageGeo.flight, plumageMat);
  flight.name = "bird.flight";
  const fuzz = new THREE.SkinnedMesh(plumageGeo.fuzz, plumageMat);
  fuzz.name = "bird.fuzz";
  fuzz.frustumCulled = false;
  fuzz.bind(rig.skeleton, new THREE.Matrix4());
  fuzz.receiveShadow = true;
  if (!plumageGeo.fuzz.index || plumageGeo.fuzz.index.count === 0) fuzz.visible = false;
  const plumageDepth = createPlumageDepthMaterial(uniforms);
  for (const m of [contour, flight]) {
    m.customDepthMaterial = plumageDepth;
    m.castShadow = true;
    m.frustumCulled = false;
    m.bind(rig.skeleton, new THREE.Matrix4());
    m.receiveShadow = true;
  }
  const parts = buildParts(rig);
  root.add(contour, flight, fuzz, ...parts.meshes);
  const pose = new Pose();
  const solve = createSolver(rig, uniforms);
  const mind = new Mind(species, options.seed ?? species.seed);
  const startle = new StartleLayer(mind);
  const ground = { root, at: null, range: [0, 0], restRadius: species.legs.perchRadius };
  const hop = new HopLayer(mind, ground);
  const forage = new ForageLayer(mind, solve, rig.rest.head.worldPos.clone(), (id) => handle.onPick?.(id), (id) => handle.onSwallow?.(id), hop);
  const mouth = new MouthLayer(mind);
  const ruffle = new RuffleLayer(mind);
  const tail = new TailLayer(mind);
  const flee = new FleeLayer(mind, rig, root, hop, ruffle, tail);
  const wingLayer = new WingLayer(mind);
  const preen = new PreenLayer(mind, rig, solve.billReach);
  mouth.blocked = () => flee.active || hop.busy || preen.active;
  const busy = () => mouth.blocked() || forage.state !== "idle";
  preen.blocked = () => flee.active || hop.busy || mind.eating || forage.state !== "idle";
  preen.onDone = (m) => {
    wingLayer.shuffle(m);
    if (m.rng() < 0.5) ruffle.trigger(m, "puff", 0.35);
  };
  const layers = [new PostureLayer(mind), new BreathLayer(), new GazeLayer(mind), new BlinkLayer(mind), ruffle, tail, wingLayer, forage, mouth, preen, hop, startle, flee];
  let food = [];
  const foodPool = [];
  const headRest = rig.rest.head.worldPos.clone();
  const local = new THREE.Vector3();
  const inv = new THREE.Matrix4();
  let attention = null;
  const handle = {
    root,
    species,
    rig,
    pose,
    mind,
    layers,
    layer: (name) => {
      const l = layers.find((x) => x.name === name);
      if (!l) throw new Error(`no layer ${name}`);
      return l;
    },
    plumage: uniforms,
    feathers: { contour, flight, fuzz },
    headPosition: (out) => rig.bones.head.getWorldPosition(out),
    onPose: null,
    flee: () => flee.start(),
    beginAway: () => flee.beginAway(),
    arrive: () => flee.arrive(),
    leave: () => flee.leave(),
    get voice() {
      return mouth.voice;
    },
    set voice(v) {
      mouth.voice = v;
    },
    preen: (side) => preen.start(mind, side),
    get preening() {
      return preen.active;
    },
    get fleeing() {
      return flee.active;
    },
    get away() {
      return flee.gone;
    },
    get perched() {
      return flee.perched;
    },
    sing: (seconds) => !busy() && (mouth.sing(mind, seconds), true),
    get singing() {
      return mouth.singing;
    },
    lick: (amount, count) => !busy() && (mouth.lick(mind, amount, count), true),
    hopTo: (x) => !busy() && hop.go(mind, x),
    hopBy: (dx) => handle.hopTo(hop.x + dx),
    get busy() {
      return busy();
    },
    // (feathers can lift over anything else it is doing: no busy check)
    ruffle: (kind, amount) => ruffle.trigger(mind, kind, amount),
    update(dt) {
      root.updateWorldMatrix(true, false);
      inv.copy(root.matrixWorld).invert();
      mind.attention = attention ? local.copy(attention).applyMatrix4(inv) : null;
      mind.food.length = 0;
      for (let i = 0; i < (flee.active || preen.active ? 0 : food.length); i++) {
        const f2 = foodPool[i] ?? (foodPool[i] = { id: 0, pos: new THREE.Vector3(), vel: new THREE.Vector3() });
        f2.id = food[i].id;
        f2.pos.copy(food[i].position).applyMatrix4(inv);
        f2.vel.copy(food[i].velocity).transformDirection(inv).multiplyScalar(food[i].velocity.length());
        mind.food.push(f2);
      }
      mind.step(dt, headRest);
      pose.reset();
      for (const l of layers) l.update(mind, pose);
      handle.onPose?.(pose, mind);
      solve(pose);
    },
    setAttention(target) {
      attention = target;
    },
    setFood(items) {
      food = items;
    },
    setPerch(at, range) {
      ground.at = at;
      ground.range = range;
      hop.reseat();
    },
    onPick: null,
    onSwallow: null,
    billTip(out) {
      return out.copy(solve.carry).applyMatrix4(root.matrixWorld);
    },
    startle(strength = 1) {
      if (flee.active) return;
      startle.fire(Math.min(Math.max(strength, 0), 1));
      if (strength >= 0.9 && !mind.quiet && mind.rng() < 0.22) flee.start();
    },
    dispose() {
      plumageGeo.contour.dispose();
      plumageGeo.flight.dispose();
      plumageGeo.fuzz.dispose();
      plumageMat.dispose();
      plumageDepth.dispose();
      flee.dispose();
      parts.dispose();
      rig.skeleton.dispose();
      debugCleanup?.();
    }
  };
  const debugCleanup = installDebug(handle);
  handle.update(0);
  return handle;
}
function installDebug(bird2) {
  if (typeof window === "undefined") return null;
  const q = new URLSearchParams(window.location.search);
  window.__bird = bird2;
  const num = (k) => q.has(k) ? Number(q.get(k)) : null;
  const poses = { front: [0, 22, 0], profile: [88, 16, 0], up: [10, 40, 8], back: [-110, 10, 0], three: [38, 20, -4] };
  const pose = q.get("pose");
  if (pose && poses[pose]) bird2.mind.pinGaze = poses[pose];
  const gaze = q.get("gaze");
  if (gaze) {
    const [y = 0, p2 = 0, r = 0] = gaze.split(",").map(Number);
    bird2.mind.pinGaze = [y, p2, r];
  }
  if (q.has("quiet")) bird2.mind.quiet = true;
  if (q.has("sing")) {
    const prev = bird2.onPose;
    let next = 1;
    bird2.onPose = (p2, mind) => {
      prev?.(p2, mind);
      if (mind.t > next && !bird2.singing && bird2.sing(1.8)) next = mind.t + 4;
    };
  }
  const jawOpen = num("jaw");
  const tongue = num("tongue");
  const arousal = num("arousal");
  const fluff = num("fluff");
  const spread = num("spread");
  const fan = num("fan");
  const blink = num("blink");
  if (arousal !== null || fluff !== null || spread !== null || fan !== null || blink !== null || jawOpen !== null || tongue !== null) {
    const before = bird2.onPose;
    bird2.onPose = (p2, m) => {
      before?.(p2, m);
      if (jawOpen !== null) p2.jaw = jawOpen;
      if (tongue !== null) p2.tongueOut = tongue;
      if (arousal !== null) m.arousal = m.baseline = arousal;
      if (fluff !== null) p2.fluff = fluff;
      if (spread !== null) p2.wing.L.spread = p2.wing.R.spread = spread;
      if (fan !== null) p2.tailFan = fan;
      if (blink !== null) p2.nict = p2.lidLower = p2.lidUpper = blink;
    };
  }
  if (q.has("nofuzz")) bird2.root.traverse((o) => o.name === "bird.fuzz" && (o.visible = false));
  if (q.has("noflash")) bird2.plumage.uFlash.value = bird2.plumage.uGlint.value = 0;
  if (q.has("skin")) bird2.root.traverse((o) => o.name.match(/contour|flight|fuzz/) && (o.visible = false));
  if (q.has("wire")) {
    bird2.root.traverse((o) => {
      const m = o.material;
      if (o.name === "bird.skin" && m) {
        m.wireframe = true;
        m.color.set(16777215);
        m.emissive.set(8947848);
      }
    });
  }
  let helper = null;
  if (q.has("bones")) {
    helper = new THREE.SkeletonHelper(bird2.rig.rootBone);
    helper.material.depthTest = false;
    helper.renderOrder = 10;
    bird2.root.add(helper);
  }
  return () => {
    helper?.dispose();
  };
}
matchMedia("(pointer: coarse)").matches;
let PERCH_R$1 = MOUNTAIN_GEM.legs.perchRadius;
const GRIP_X = 0.2;
function perchRadiusAt(x) {
  return PERCH_R$1 * Math.min(1 - 0.18 * x, 2.2);
}
const PERCH_RANGE = [GRIP_X - 0.45, GRIP_X + 0.45];
function perchFrames(root, range = PERCH_RANGE) {
  root.updateMatrixWorld(true);
  const src = root.getObjectByName("perch");
  const mesh = src ? cropPerch(src, range[0] - 0.1, range[1] + 0.1) : null;
  const pts = mesh ? mesh.geometry.getAttribute("position").clone().applyMatrix4(mesh.matrixWorld).array : new Float32Array();
  const ray = new THREE.Raycaster();
  ray.ray.direction.set(0, -1, 0);
  const hits = [];
  const cache = /* @__PURE__ */ new Map();
  const pa = new THREE.Vector3();
  const pb = new THREE.Vector3();
  function midZ(x) {
    let lo = Infinity;
    let hi = -Infinity;
    for (let i = 0; i < pts.length; i += 3) {
      if (Math.abs(pts[i] - x) > 6e-3) continue;
      lo = Math.min(lo, pts[i + 2]);
      hi = Math.max(hi, pts[i + 2]);
    }
    return lo <= hi ? (lo + hi) / 2 : 0;
  }
  function top(x, out) {
    if (!mesh) return null;
    ray.ray.origin.set(x, 2, midZ(x));
    hits.length = 0;
    ray.intersectObject(mesh, false, hits);
    const h = hits[0];
    return h ? out.copy(h.point) : null;
  }
  return (x, out) => {
    const key = Math.round(x * 1e3);
    let f2 = cache.get(key);
    if (f2 === void 0) {
      f2 = { point: new THREE.Vector3(), up: new THREE.Vector3(), tangent: new THREE.Vector3(), radius: perchRadiusAt(x) };
      if (top(x, f2.point) && top(x - 0.03, pa) && top(x + 0.03, pb)) {
        f2.tangent.copy(pb).sub(pa).normalize();
        f2.up.set(0, 1, 0).addScaledVector(f2.tangent, -f2.tangent.y).normalize();
      } else f2 = null;
      cache.set(key, f2);
    }
    if (!f2) return null;
    out.point.copy(f2.point);
    out.up.copy(f2.up);
    out.tangent.copy(f2.tangent);
    out.radius = f2.radius;
    return out;
  };
}
function cropPerch(mesh, x0, x1) {
  const g = mesh.geometry;
  const pos = g.getAttribute("position");
  const n = g.index ? g.index.count : pos.count;
  const at = (i) => g.index ? g.index.getX(i) : i;
  const out = [];
  for (let t = 0; t < n; t += 3) {
    const a = at(t), b = at(t + 1), c = at(t + 2);
    const lo = Math.min(pos.getX(a), pos.getX(b), pos.getX(c));
    const hi = Math.max(pos.getX(a), pos.getX(b), pos.getX(c));
    if (hi < x0 || lo > x1) continue;
    for (const k of [a, b, c]) out.push(pos.getX(k), pos.getY(k), pos.getZ(k));
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(out, 3));
  const m = new THREE.Mesh(geo, mesh.material);
  m.matrixAutoUpdate = false;
  m.matrixWorld.copy(mesh.matrixWorld);
  return m;
}
function tube(curve, radius, segs, radial, bumpSeed) {
  const frames = curve.computeFrenetFrames(segs, false);
  const pos = [];
  const uv = [];
  const idx = [];
  const rng = mulberry32(bumpSeed);
  const knots = Array.from({ length: 6 }, () => ({ u: rng(), a: rng() * Math.PI * 2, s: 0.25 + rng() * 0.35 }));
  const p2 = new THREE.Vector3();
  const n = new THREE.Vector3();
  for (let i = 0; i <= segs; i++) {
    const u = i / segs;
    curve.getPointAt(u, p2);
    const N = frames.normals[i];
    const B = frames.binormals[i];
    for (let j = 0; j <= radial; j++) {
      const a = j / radial * Math.PI * 2;
      n.copy(N).multiplyScalar(Math.cos(a)).addScaledVector(B, Math.sin(a));
      let r = radius(u);
      r *= 1 + 0.035 * Math.sin(a * 7 + u * 40) + 0.02 * Math.sin(a * 13 - u * 90);
      for (const k of knots) {
        const du = (u - k.u) * 18;
        const da = Math.cos(a - k.a);
        r *= 1 + k.s * Math.exp(-du * du) * Math.max(da, 0) ** 3;
      }
      pos.push(p2.x + n.x * r, p2.y + n.y * r, p2.z + n.z * r);
      uv.push(u, j / radial);
    }
  }
  for (let i = 0; i < segs; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j;
      const b = a + radial + 1;
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
function barkMaterial(length, plain2 = false) {
  const m = new THREE.MeshStandardMaterial({ color: 16777215, roughness: 0.92, metalness: 0 });
  m.onBeforeCompile = (s) => {
    s.uniforms.uLen = { value: length };
    s.vertexShader = s.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vWPos; varying vec3 vWNor; varying vec2 vUv2;").replace(
      "#include <worldpos_vertex>",
      "#include <worldpos_vertex>\n" + (plain2 ? "vWPos = position; vWNor = normalize(normal); vUv2 = uv;" : "vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz; vWNor = normalize(mat3(modelMatrix) * objectNormal); vUv2 = uv;")
    );
    s.fragmentShader = s.fragmentShader.replace(
      "#include <common>",
      `#include <common>
varying vec3 vWPos; varying vec3 vWNor; varying vec2 vUv2; uniform float uLen;
float h3(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719)))*43758.5453); }
float n3(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z); }
float fbm(vec3 p){ float a=.5, s=0.; for(int i=0;i<5;i++){ s+=a*n3(p); p*=2.03; a*=.5; } return s; }`
    ).replace(
      "#include <color_fragment>",
      `#include <color_fragment>
{
  float along = vUv2.x * uLen;
${plain2 ? "float ign = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))); if (smoothstep(0.0, 0.3, vUv2.x) * (1.0 - smoothstep(0.93, 1.0, vUv2.x)) < ign * 0.98 + 0.01) discard;" : ""}
  float streak = fbm(vec3(along * 6.0, vUv2.y * 3.0, 0.0) + vWPos * 2.0);
  vec3 bark = mix(vec3(0.16, 0.085, 0.05), vec3(0.36, 0.2, 0.11), streak);
  bark *= 0.75 + 0.5 * fbm(vWPos * 38.0);
  // moss on the up-facing side, patchy
  float up = clamp(vWNor.y, 0.0, 1.0);
  float moss = smoothstep(0.45, 0.75, fbm(vWPos * 9.0) + up * 0.35 - 0.1) * smoothstep(0.0, 0.5, up + 0.2);
  vec3 mossC = mix(vec3(0.10, 0.17, 0.02), vec3(0.30, 0.42, 0.05), fbm(vWPos * 60.0));
  diffuseColor.rgb = mix(bark, mossC, moss * 0.75);
  // lichen speckle
  float lic = smoothstep(0.78, 0.82, fbm(vWPos * 25.0 + 7.0));
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.55, 0.58, 0.45), lic * 0.5);
}`
    );
  };
  return m;
}
function createBranch(radius = MOUNTAIN_GEM.legs.perchRadius, plain2 = false) {
  PERCH_R$1 = radius;
  const group = new THREE.Group();
  const perch = new THREE.CatmullRomCurve3([
    ...plain2 ? [new THREE.Vector3(-4.4, -1, -0.6)] : [new THREE.Vector3(-6, -1.414, -0.927)],
    new THREE.Vector3(-3.2, -0.709, -0.364),
    new THREE.Vector3(-1.4, -0.312, -0.11),
    new THREE.Vector3(-0.7, -0.199, -0.039),
    new THREE.Vector3(0, -0.041, 0),
    new THREE.Vector3(0.5, 0.059, 0.072),
    new THREE.Vector3(0.9, 0.142, 0.113),
    new THREE.Vector3(1.3, 0.193, 0.077),
    new THREE.Vector3(1.8, 0.24, 0.04)
  ]);
  const len = perch.getLength();
  const bark = barkMaterial(len, plain2);
  const tmp = new THREE.Vector3();
  const gPerch = tube(
    perch,
    (u) => perchRadiusAt(perch.getPointAt(u, tmp).x) * (u > 0.97 ? 1 - (u - 0.97) * 20 : 1),
    320,
    28,
    3
  );
  const mPerch = new THREE.Mesh(gPerch, bark);
  mPerch.name = "perch";
  mPerch.receiveShadow = true;
  group.add(mPerch);
  const shoot = new THREE.CatmullRomCurve3([
    new THREE.Vector3(1.07, 0.11, 0.26),
    new THREE.Vector3(1.18, 0.3, 0.28),
    new THREE.Vector3(1.28, 0.5, 0.2),
    new THREE.Vector3(1.41, 0.7, 0.09)
  ]);
  const shootMat = new THREE.MeshStandardMaterial({ color: 5208600, roughness: 0.65 });
  const mShoot = new THREE.Mesh(tube(shoot, (u) => 0.022 * (1 - u * 0.6), 60, 10, 9), shootMat);
  mShoot.castShadow = true;
  group.add(mShoot);
  const budMat = new THREE.MeshPhysicalMaterial({
    color: 8372762,
    roughness: 0.5,
    sheen: 0.5,
    sheenColor: new THREE.Color(13168720),
    emissive: 2243072
  });
  const budGeo = new THREE.SphereGeometry(1, 16, 12);
  const stemGeo = new THREE.CylinderGeometry(6e-3, 8e-3, 1, 6);
  stemGeo.translate(0, 0.5, 0);
  const rng = mulberry32(21);
  const p2 = new THREE.Vector3();
  const t = new THREE.Vector3();
  for (let i = 0; i < 9; i++) {
    const u = 0.2 + i / 8 * 0.78;
    shoot.getPointAt(u, p2);
    shoot.getTangentAt(u, t);
    const side = new THREE.Vector3(rng() - 0.5, rng() * 0.6, rng() - 0.5).normalize();
    const L = 0.06 + rng() * 0.08;
    const stem = new THREE.Mesh(stemGeo, shootMat);
    stem.position.copy(p2);
    stem.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), side.clone().add(t.clone().multiplyScalar(0.4)).normalize());
    stem.scale.set(1, L, 1);
    group.add(stem);
    const tip = p2.clone().addScaledVector(side.clone().add(t.clone().multiplyScalar(0.4)).normalize(), L);
    for (let k = 0; k < 2 + Math.floor(rng() * 3); k++) {
      const bud = new THREE.Mesh(budGeo, budMat);
      const r = 0.018 + rng() * 0.018;
      bud.scale.set(r, r * 1.25, r);
      bud.position.copy(tip).add(new THREE.Vector3(rng() - 0.5, rng() - 0.5, rng() - 0.5).multiplyScalar(0.05));
      bud.castShadow = true;
      group.add(bud);
    }
  }
  return { group };
}
const XA = -3;
const XT = 1.8;
const INV = 1 / (XT - XA);
function phi(x) {
  const s = Math.max(0, (x - XA) * INV);
  return s * s;
}
function dphi(x) {
  return 2 * Math.max(0, (x - XA) * INV) * INV;
}
const CHUNK = (
  /* glsl */
  `
uniform vec2 uSway;
uniform vec3 uShootRoot;
uniform vec3 uShootAxis;
uniform vec3 uShootMove;
uniform vec3 uShootBend;
uniform vec3 uBudBend;
attribute float aShoot; // 0 twig, 1 the shoot's stem, 2 its flowers
`
);
const VERT = (
  /* glsl */
  `
{
  // the shoot is carried at its root, the rest bends along the twig
  float sx = max(0.0, (mix(transformed.x, uShootRoot.x, min(aShoot, 1.0)) - ${XA.toFixed(3)}) * ${INV.toFixed(5)});
  transformed.yz += sx * sx * uSway;
  if (aShoot > 0.5) {
    vec3 r = position - uShootRoot;
    float u = clamp(dot(r, uShootAxis) / dot(uShootAxis, uShootAxis), 0.0, 1.0);
    transformed += cross(uShootMove, r) + (uShootBend + step(1.5, aShoot) * uBudBend) * u * u;
  }
}`
);
class Lag {
  constructor(freq, zeta) {
    __publicField(this, "freq");
    __publicField(this, "zeta");
    __publicField(this, "p", new THREE.Vector3());
    __publicField(this, "v", new THREE.Vector3());
    this.freq = freq;
    this.zeta = zeta;
  }
  reset(at) {
    this.p.copy(at);
    this.v.set(0, 0, 0);
  }
  step(target, dt) {
    const w = 2 * Math.PI * this.freq;
    const n = Math.max(1, Math.ceil(dt * this.freq * 8));
    const h = dt / n;
    for (let i = 0; i < n; i++) {
      for (const k of ["x", "y", "z"]) this.v[k] += (-w * w * (this.p[k] - target[k]) - 2 * this.zeta * w * this.v[k]) * h;
      this.p.addScaledVector(this.v, h);
    }
    return this.p;
  }
}
function createSway() {
  const up = new Spring(3.4, 0.2);
  const side = new Spring(2.9, 0.22);
  const stem = new Lag(4.5, 0.45);
  const heads = new Lag(2.6, 0.3);
  const SHOOT = 0.5;
  const hand = new Lag(4.2, 0.38);
  const rest = new THREE.Vector3();
  const BRUSH = 20;
  const BRUSH_MAX = 0.4;
  const REACH = 0.11;
  let hasShoot = false;
  const tipAt = new THREE.Vector3();
  const onRay = new THREE.Vector3();
  const carried = new THREE.Vector3();
  const stemAt = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  let first = true;
  let loadX = null;
  const uniforms = {
    uSway: { value: new THREE.Vector2() },
    uShootRoot: { value: new THREE.Vector3(0.95, 0.04, 0.1) },
    uShootAxis: { value: new THREE.Vector3(0.45, 0.65, 0) },
    uShootMove: { value: new THREE.Vector3() },
    uShootBend: { value: new THREE.Vector3() },
    uBudBend: { value: new THREE.Vector3() }
  };
  const sagTarget = () => loadX === null ? 0 : -5e-3 * sway.give * phi(loadX) / phi(GRIP_X) ** 2;
  const KICK = 1;
  const patched = /* @__PURE__ */ new WeakSet();
  function patch(mat) {
    if (patched.has(mat)) return;
    patched.add(mat);
    const prev = mat.onBeforeCompile;
    const key = mat.customProgramCacheKey();
    mat.onBeforeCompile = (s, r) => {
      prev.call(mat, s, r);
      Object.assign(s.uniforms, uniforms);
      s.vertexShader = s.vertexShader.replace("#include <common>", `#include <common>
${CHUNK}`).replace("#include <begin_vertex>", `#include <begin_vertex>
${VERT}`);
    };
    mat.customProgramCacheKey = () => `${key}|sway`;
    mat.needsUpdate = true;
  }
  const sway = {
    uniforms,
    patch,
    reach(ray, out) {
      if (!hasShoot) return false;
      const root = uniforms.uShootRoot.value;
      tipAt.copy(root).add(uniforms.uShootAxis.value);
      return ray.distanceSqToSegment(tmp.copy(root).lerp(tipAt, 0.15), tipAt, onRay, out) < REACH * REACH;
    },
    brush(at, v, dt) {
      const ax = uniforms.uShootAxis.value;
      const u = THREE.MathUtils.clamp(tmp.copy(at).sub(uniforms.uShootRoot.value).dot(ax) / ax.lengthSq(), 0, 1);
      const dir = tmp.copy(ax).normalize();
      const speed = THREE.MathUtils.clamp(v.length(), 0.3, 2);
      hand.v.addScaledVector(v, BRUSH * dt * speed * (0.3 + u)).addScaledVector(dir, -hand.v.dot(dir) * 0.8);
      if (hand.v.length() > BRUSH_MAX) hand.v.setLength(BRUSH_MAX);
    },
    give: 1,
    at(x, out) {
      const f2 = phi(x);
      return out.set(0, up.x * f2, side.x * f2);
    },
    load(x) {
      loadX = x;
    },
    settle() {
      up.x = sagTarget();
      up.v = side.x = side.v = 0;
      first = true;
    },
    push(x, strength, s = 0) {
      const f2 = phi(x) * KICK * strength * sway.give;
      up.kick(-f2);
      side.kick(f2 * 0.35 * s);
    },
    use(root) {
      root.updateMatrixWorld(true);
      const shootMeshes = [];
      root.traverse((o) => {
        const m = o;
        if (!m.isMesh) return;
        for (const mat of Array.isArray(m.material) ? m.material : [m.material]) patch(mat);
        if (/^(shoot|buds|hairs)$/.test(m.name)) shootMeshes.push(m);
      });
      const shoot = shootMeshes.find((m) => m.name === "shoot");
      hasShoot = !!shoot;
      if (shoot) {
        const pos = shoot.geometry.getAttribute("position");
        shoot.geometry.computeBoundingBox();
        const bb = shoot.geometry.boundingBox;
        const lo = new THREE.Vector3();
        const hi = new THREE.Vector3();
        let nl = 0;
        let nh = 0;
        const p2 = new THREE.Vector3();
        for (let i = 0; i < pos.count; i++) {
          p2.fromBufferAttribute(pos, i);
          if (p2.y < bb.min.y + 0.03) lo.add(p2), nl++;
          if (p2.y > bb.max.y - 0.03) hi.add(p2), nh++;
        }
        lo.divideScalar(Math.max(nl, 1));
        hi.divideScalar(Math.max(nh, 1));
        uniforms.uShootRoot.value.copy(lo);
        uniforms.uShootAxis.value.copy(hi).sub(lo);
      }
      for (const m of shootMeshes) {
        const n = m.geometry.getAttribute("position").count;
        m.geometry.setAttribute("aShoot", new THREE.Float32BufferAttribute(new Float32Array(n).fill(m.name === "shoot" ? 1 : 2), 1));
      }
      first = true;
    },
    update(dt) {
      if (dt <= 0) return;
      up.step(sagTarget(), dt);
      side.step(0, dt);
      uniforms.uSway.value.set(up.x, side.x);
      const root = uniforms.uShootRoot.value;
      const axis = uniforms.uShootAxis.value;
      const slope = dphi(root.x);
      const ride = phi(root.x);
      const mv = uniforms.uShootMove.value.set(0, -slope * side.x, slope * up.x);
      carried.copy(axis).add(tmp.crossVectors(mv, axis));
      carried.y += ride * up.x;
      carried.z += ride * side.x;
      if (first) {
        first = false;
        stem.reset(carried);
        heads.reset(carried);
        hand.reset(rest);
      }
      stem.step(carried, dt);
      hand.step(rest, dt);
      stemAt.copy(carried).lerp(stem.p, SHOOT).add(hand.p);
      heads.step(stemAt, dt);
      uniforms.uShootBend.value.copy(stemAt).sub(carried);
      uniforms.uBudBend.value.copy(heads.p).sub(stemAt).multiplyScalar(SHOOT);
    }
  };
  return sway;
}
const R = {
  all: { kind: "band", s: [-1, 12], phi: [0, 1] },
  under: { kind: "band", s: [-1, 6.4], phi: [0, 0.47], soft: 0.25 },
  head: { kind: "band", s: [6.4, 12], phi: [0, 1], soft: 0.25 },
  forehead: { kind: "blob", at: [9.75, 1], r: [0.7, 0.5], soft: 0.1 },
  nape: { kind: "blob", at: [6.5, 1], r: [0.8, 0.42], soft: 0.15 },
  cheek: { kind: "blob", at: [7.45, 0.5], r: [0.95, 0.15], soft: 0.1 },
  lores: { kind: "blob", at: [9.3, 0.52], r: [0.75, 0.1] },
  throat: { kind: "blob", at: [8, 0], r: [1.6, 0.3], pow: 2.5, soft: 0.12 },
  breast: { kind: "blob", at: [5.3, 0], r: [1.35, 0.44], pow: 2.6, soft: 0.15 },
  belly: { kind: "band", s: [0.9, 4.1], phi: [0, 0.3], soft: 0.35 },
  flank: { kind: "band", s: [1.3, 4.6], phi: [0.26, 0.5], soft: 0.3 },
  vent: { kind: "band", s: [-1, 1.25], phi: [0, 0.5], soft: 0.2 },
  rump: { kind: "band", s: [-1, 1.9], phi: [0.55, 1], soft: 0.25 },
  mantle: { kind: "band", s: [1.9, 6.4], phi: [0.55, 1], soft: 0.2 },
  neckSide: { kind: "blob", at: [6.2, 0.5], r: [0.75, 0.2], soft: 0.15 },
  supercilium: { kind: "streak", from: [9.7, 0.69], to: [6.9, 0.72], r: [0.28, 0.045] },
  eyestripe: { kind: "streak", from: [9.8, 0.54], to: [6.7, 0.57], r: [0.24, 0.04] },
  eyering: { kind: "blob", at: [7.8, 0.535], r: [0.42, 0.075] },
  malar: { kind: "streak", from: [9.5, 0.3], to: [7, 0.3], r: [0.22, 0.045] }
};
const pair = (c) => typeof c === "number" ? [c, c] : c;
const pig = (f2) => {
  const [base, tip] = pair(f2.c);
  return { base, tip, bars: f2.bars, t0: f2.t0, tw: f2.tw, iri: f2.iri, iriStrength: f2.iriStrength };
};
const pick = (v, f2) => pig(typeof v === "function" ? v(f2) : v);
function makePainter(spec) {
  return {
    body(s, phi2, rnd) {
      let hit = null;
      for (const p2 of spec.body) if (inRegion(p2.r, s, phi2, rnd)) hit = p2;
      if (!hit) return null;
      const r2 = rnd * 7919.31 % 1;
      const out = pig(hit);
      if (hit.mix && r2 < hit.mix[1]) [out.base, out.tip] = pair(hit.mix[0]);
      return out;
    },
    wing: (kind, f2) => pick(kind === "covert" ? spec.wing.covert : kind === "secondary" ? spec.wing.secondary ?? spec.wing.primary : spec.wing.primary, f2),
    tail: (f2) => pick(spec.tail, f2)
  };
}
const sh = (c, k = 0.8) => {
  const r = Math.round((c >> 16 & 255) * k);
  const g = Math.round((c >> 8 & 255) * k);
  const b = Math.round((c & 255) * k);
  return [r << 16 | g << 8 | b, c];
};
const p = (r, c, more = {}) => ({ r, c: typeof c === "number" ? sh(c) : c, ...more });
const f = (c, more = {}) => ({ c: typeof c === "number" ? sh(c, 0.88) : c, ...more });
const tipped = (c, tip, t0 = 0.72) => ({ c: [c, tip], t0, tw: 0.08 });
const blob = (s, phi2, rs, rphi, soft = 0.1) => ({ kind: "blob", at: [s, phi2], r: [rs, rphi], soft });
const band = (s0, s1, p0, p1, soft = 0.15) => ({ kind: "band", s: [s0, s1], phi: [p0, p1], soft });
const WHITE = 15921126;
const BLACK = 1512463;
const bird = (id, common, scientific, shape, paint) => ({ id, common, scientific, ...shape, paint });
const BIRDS = [
  bird(
    "rougegorge",
    "Rougegorge familier",
    "Erithacus rubecula",
    { length: 0.14, lean: 14, girth: 1.12, belly: 1.05, head: 1.22, neck: 0.9, bill: { length: 0.15, radius: 0.034, color: 2761504 }, eye: { radius: 0.046 }, tail: { length: 0.62, width: 0.1, cock: 8 }, wing: { reach: 0.38 }, legs: { length: 0.3, color: 4862760 } },
    {
      body: [
        p(R.all, 8153673),
        p(R.under, 15657696),
        p(R.flank, 12889480),
        p(blob(5.9, 0, 1.72, 0.47, 0.12), 11186352),
        p(R.neckSide, 10725802),
        p({ kind: "blob", at: [5.75, 0], r: [1.6, 0.42], pow: 2.6, soft: 0.1 }, [13129498, 15235370]),
        p(band(6.3, 12, 0, 0.6), [13129498, 15235370]),
        p(R.forehead, [13129498, 14709288]),
        p({ kind: "blob", at: [8.3, 1], r: [1.5, 0.4], pow: 3, soft: 0.1 }, 8153673)
      ],
      wing: { primary: f(5522735), covert: (k) => k > 0.8 ? tipped(6180152, 10847573, 0.8) : f(7100992) },
      tail: f(5917235)
    }
  ),
  bird(
    "merle",
    "Merle noir",
    "Turdus merula",
    { length: 0.25, lean: 30, girth: 1.06, head: 1, bill: { length: 0.25, radius: 0.047, color: 15901724 }, eye: { radius: 0.04 }, tail: { length: 0.98, width: 0.12, cock: -4 }, wing: { reach: 0.33 }, legs: { length: 0.32, color: 3024416 }, tempo: 0.8 },
    {
      body: [p(R.all, [1052172, 1841430]), p(R.eyering, 15114782)],
      wing: { primary: f(1709586), covert: f(1512463) },
      tail: f(1315086)
    }
  ),
  bird(
    "charbonniere",
    "Mésange charbonnière",
    "Parus major",
    { length: 0.14, lean: 18, girth: 1.08, head: 1.2, neck: 0.9, bill: { length: 0.11, radius: 0.036, color: 1841690 }, tail: { length: 0.68, width: 0.1 }, wing: { reach: 0.36 }, legs: { length: 0.26, color: 5595244 } },
    {
      body: [
        p(R.all, 8359740),
        p(R.rump, 8885408),
        p(R.under, [14271022, 15784252]),
        p(R.vent, WHITE),
        p(band(-1, 6.6, 0, 0.1, 0.25), BLACK),
        p(R.head, [986898, 1776418]),
        p(blob(7.35, 0.47, 1, 0.2, 0.08), WHITE),
        p(blob(6.45, 1, 0.35, 0.2), 14212250)
      ],
      wing: { primary: tipped(3752524, 9412788, 0.5), secondary: tipped(3752524, 10465474, 0.45), covert: (k) => k > 0.78 ? tipped(4872296, WHITE, 0.72) : f(7308956) },
      tail: (k) => k > 0.8 ? f(WHITE) : f(4872296)
    }
  ),
  bird(
    "pinson",
    "Pinson des arbres",
    "Fringilla coelebs",
    { length: 0.145, lean: 22, girth: 1.06, head: 1.12, bill: { length: 0.13, radius: 0.052, color: 8359843 }, tail: { length: 0.7, width: 0.1 }, wing: { reach: 0.38 }, legs: { length: 0.26, color: 8018504 } },
    {
      body: [
        p(R.all, 9067066),
        p(R.rump, 9083466),
        p(R.under, [13207152, 14457988]),
        p(R.vent, 15656668),
        p(R.head, [12876386, 14258038]),
        p({ kind: "blob", at: [8, 1], r: [2.1, 0.36], pow: 3, soft: 0.08 }, 7309992),
        p(R.nape, 7309992),
        p(R.forehead, 1907484)
      ],
      wing: { primary: tipped(2235931, 4867126, 0.6), secondary: tipped(2235931, 14209696, 0.8), covert: (k) => k < 0.4 ? f(WHITE) : k > 0.75 ? tipped(1841431, 15657172, 0.62) : f(1841431) },
      tail: (k) => k > 0.72 ? f(WHITE) : k < 0.2 ? f(6122096) : f(2038810)
    }
  ),
  bird(
    "rossignol",
    "Rossignol philomèle",
    "Luscinia megarhynchos",
    { length: 0.165, lean: 20, girth: 1.05, head: 1.1, bill: { length: 0.16, radius: 0.034, color: 5917244, lower: 11834488 }, eye: { radius: 0.046 }, tail: { length: 0.74, width: 0.11, cock: 6 }, wing: { reach: 0.36 }, legs: { length: 0.32, color: 11569776 } },
    {
      body: [p(R.all, 9071176), p(R.under, 14471356), p(R.breast, 12891292), p(R.flank, 12758672), p(R.throat, 15261904), p(R.rump, 10512442), p(R.eyering, 14208440)],
      wing: { primary: f(8413246), covert: f(8807999) },
      tail: f(11035439)
    }
  ),
  bird(
    "chardonneret",
    "Chardonneret élégant",
    "Carduelis carduelis",
    { length: 0.125, lean: 20, girth: 1.08, head: 1.18, bill: { length: 0.16, radius: 0.046, color: 15260875 }, tail: { length: 0.6, width: 0.1 }, wing: { reach: 0.45 }, legs: { length: 0.22, color: 11044466 } },
    {
      body: [
        p(R.all, 10910800),
        p(R.under, WHITE),
        p(R.flank, 12095074),
        p(blob(5.2, 0.3, 0.9, 0.2, 0.2), 12095074),
        p(R.rump, 15262420),
        p(R.head, WHITE),
        p({ kind: "blob", at: [7.4, 1], r: [1.15, 0.5], pow: 3, soft: 0.06 }, BLACK),
        p(band(6.4, 7, 0.5, 1, 0.1), BLACK),
        p(band(8.75, 12, 0, 1, 0.06), [11539727, 14033432]),
        p(R.lores, BLACK)
      ],
      wing: { primary: { c: [15910926, 1315087], t0: 0.42, tw: 0.06 }, secondary: { c: [15910926, 1315087], t0: 0.5, tw: 0.06 }, covert: (k) => k > 0.7 ? f(15252752) : f(1380879) },
      tail: () => tipped(1380879, WHITE, 0.82)
    }
  ),
  bird(
    "mesangebleue",
    "Mésange bleue",
    "Cyanistes caeruleus",
    { length: 0.115, lean: 16, girth: 1.12, head: 1.25, neck: 0.88, bill: { length: 0.085, radius: 0.033, color: 2302762 }, eye: { radius: 0.04 }, tail: { length: 0.58, width: 0.09 }, wing: { reach: 0.36 }, legs: { length: 0.24, color: 5202548 } },
    {
      body: [
        p(R.all, 9083470),
        p(R.under, [14469428, 15916616]),
        p(band(1.5, 4.6, 0, 0.07, 0.3), 3950168),
        p(R.head, WHITE),
        p({ kind: "blob", at: [8.4, 1], r: [1.25, 0.3], pow: 3, soft: 0.06 }, [2909892, 4163302]),
        p(R.eyestripe, 1713472),
        p(band(6.3, 6.85, 0, 1, 0.08), 1846360),
        p(blob(7.4, 0, 0.9, 0.16), 1844292)
      ],
      wing: { primary: tipped(2838422, 4157376, 0.5), covert: (k) => k > 0.78 ? tipped(3104948, WHITE, 0.74) : f(3830988) },
      tail: f(3434168)
    }
  ),
  bird(
    "sittelle",
    "Sittelle torchepot",
    "Sitta europaea",
    { length: 0.14, lean: 30, girth: 1.12, head: 1.12, neck: 0.75, bill: { length: 0.26, radius: 0.042, color: 4870232 }, tail: { length: 0.38, width: 0.1 }, wing: { reach: 0.75 }, legs: { length: 0.2, color: 9071182, toe: 0.13 } },
    {
      body: [
        p(R.all, 7310756),
        p(R.under, [13667918, 14985062]),
        p(R.flank, 10768940),
        p(R.vent, 10768940, { mix: [WHITE, 0.4] }),
        p(R.throat, WHITE),
        p(R.cheek, WHITE),
        p({ kind: "streak", from: [10.2, 0.56], to: [6, 0.6], r: [0.3, 0.05] }, BLACK)
      ],
      wing: { primary: f(4871520), covert: f(6981790) },
      tail: (k) => k < 0.25 ? f(6981790) : tipped(1842206, WHITE, 0.75)
    }
  ),
  bird(
    "grimpereau",
    "Grimpereau des jardins",
    "Certhia brachydactyla",
    { length: 0.125, lean: 26, girth: 0.98, head: 1.08, neck: 0.8, bill: { length: 0.27, radius: 0.024, droop: 0.05, color: 5917242, lower: 13153434 }, tail: { length: 0.66, width: 0.085 }, wing: { reach: 0.3 }, legs: { length: 0.18, color: 10123872, toe: 0.13 } },
    {
      body: [
        p(R.all, 7232064, { mix: [13352348, 0.3] }),
        p(R.rump, 10120252),
        p(R.under, 15657696),
        p(R.flank, 14208182),
        p(R.supercilium, 15262418)
      ],
      wing: { primary: { c: [4865068, 13481856], bars: 2 }, covert: (k) => k > 0.7 ? tipped(4865068, 14733992, 0.7) : f(6968892) },
      tail: f(8019518)
    }
  ),
  bird(
    "troglodyte",
    "Troglodyte mignon",
    "Troglodytes troglodytes",
    { length: 0.095, lean: 20, girth: 1.22, head: 1.18, neck: 0.8, bill: { length: 0.17, radius: 0.028, droop: 0.012, color: 5916214, lower: 11571312 }, eye: { radius: 0.038 }, tail: { length: 0.34, width: 0.08, cock: 82 }, wing: { reach: 0.5, size: 0.9 }, legs: { length: 0.26, color: 10122328 } },
    {
      body: [
        p(R.all, [5914406, 9069112], { bars: 3 }),
        p(R.mantle, 8806458),
        p(R.head, 8806458),
        p(R.under, [10125408, 13152396]),
        p(R.flank, [5914406, 11570270], { bars: 3 }),
        p(R.vent, [4863008, 12098160], { bars: 3 }),
        p(R.throat, 14208180),
        p(R.supercilium, 14866108)
      ],
      wing: { primary: { c: [4074524, 11041864], bars: 5 }, covert: () => ({ c: [4863007, 9726268], bars: 2 }) },
      tail: { c: [4074524, 10120766], bars: 6 }
    }
  ),
  bird(
    "pouillot",
    "Pouillot véloce",
    "Phylloscopus collybita",
    { length: 0.11, lean: 22, girth: 1, head: 1.15, bill: { length: 0.11, radius: 0.025, color: 3813416 }, eye: { radius: 0.04 }, tail: { length: 0.6, width: 0.09 }, wing: { reach: 0.34 }, legs: { length: 0.24, color: 3024932 } },
    {
      body: [p(R.all, 8289354), p(R.under, 14867648), p(R.breast, 14077084), p(R.flank, 13616020), p(R.supercilium, 14998696), p(R.eyestripe, 5591610), p(R.eyering, 15262400)],
      wing: { primary: tipped(5130804, 8157768, 0.4), covert: f(7631423) },
      tail: f(6183484)
    }
  ),
  bird(
    "fauvette",
    "Fauvette à tête noire",
    "Sylvia atricapilla",
    { length: 0.135, lean: 24, girth: 1.02, head: 1.1, bill: { length: 0.13, radius: 0.03, color: 3816e3 }, tail: { length: 0.66, width: 0.1 }, wing: { reach: 0.38 }, legs: { length: 0.26, color: 4870232 } },
    {
      body: [p(R.all, 8157288), p(R.under, 13224130), p(R.vent, 15000284), p(R.head, 10790566), p(R.nape, 10132632), p({ kind: "blob", at: [8.55, 1], r: [1.55, 0.38], pow: 3, soft: 0.05 }, BLACK)],
      wing: { primary: f(6051916), covert: f(7630946) },
      tail: f(5657160)
    }
  ),
  bird(
    "grivemusicienne",
    "Grive musicienne",
    "Turdus philomelos",
    { length: 0.22, lean: 30, girth: 1.08, head: 1, bill: { length: 0.21, radius: 0.04, color: 4865072, lower: 13150328 }, eye: { radius: 0.042 }, tail: { length: 0.72, width: 0.11 }, wing: { reach: 0.4 }, legs: { length: 0.34, color: 12884608 }, tempo: 0.8 },
    {
      body: [
        p(R.all, 8283204),
        p(R.under, WHITE, { mix: [[15921126, 3023896], 0.5], t0: 0.72, tw: 0.08 }),
        p(R.breast, 15391144, { mix: [[15391144, 3023896], 0.6], t0: 0.7, tw: 0.08 }),
        p(R.flank, 14470048, { mix: [[14470048, 3023896], 0.5], t0: 0.72, tw: 0.08 }),
        p(R.vent, WHITE),
        p(R.throat, 15788244),
        p(R.cheek, 10126432, { mix: [14207136, 0.4] }),
        p(R.malar, 3812896)
      ],
      wing: { primary: f(7363134), covert: (k) => k > 0.75 ? tipped(7363134, 13676656, 0.8) : f(8020548) },
      tail: f(7625018)
    }
  ),
  bird(
    "grivedraine",
    "Grive draine",
    "Turdus viscivorus",
    { length: 0.27, lean: 26, girth: 1.1, head: 0.95, bill: { length: 0.21, radius: 0.042, color: 4865588, lower: 12623992 }, eye: { radius: 0.04 }, tail: { length: 0.86, width: 0.12 }, wing: { reach: 0.42 }, legs: { length: 0.36, color: 12624008 }, tempo: 0.75 },
    {
      body: [
        p(R.all, 9076840),
        p(R.under, WHITE, { mix: [[15921126, 2498586], 0.62], t0: 0.66, tw: 0.08 }),
        p(R.breast, 15260860, { mix: [[15260860, 2498586], 0.7], t0: 0.64, tw: 0.08 }),
        p(R.flank, 14536880, { mix: [[14536880, 2498586], 0.6], t0: 0.66, tw: 0.08 }),
        p(R.throat, 15788760, { mix: [[15788760, 2761242], 0.3], t0: 0.7, tw: 0.08 }),
        p(R.cheek, 11839624, { mix: [6970952, 0.35] }),
        p(R.rump, 10129518)
      ],
      wing: { primary: tipped(6182468, 12103312, 0.86), covert: (k) => k > 0.6 ? tipped(6445640, 14209208, 0.72) : f(8155996) },
      tail: (k) => k > 0.75 ? tipped(6577226, WHITE, 0.8) : f(6577226)
    }
  ),
  bird(
    "etourneau",
    "Étourneau sansonnet",
    "Sturnus vulgaris",
    { length: 0.21, lean: 28, girth: 1.08, head: 0.98, bill: { length: 0.27, radius: 0.04, color: 15255602 }, tail: { length: 0.5, width: 0.11 }, wing: { reach: 0.72, point: 0.8 }, legs: { length: 0.34, color: 11559502 }, tempo: 0.9 },
    {
      body: [
        p(R.all, [1052178, 1710626], { mix: [[1381146, 14208936], 0.38], t0: 0.82, tw: 0.06, iri: 3832394, iriStrength: 0.24 }),
        p(R.head, [1052178, 1841190], { mix: [[1381146, 13616800], 0.25], t0: 0.84, tw: 0.06, iri: 6961824, iriStrength: 0.24 }),
        p(R.breast, [1052178, 1841190], { mix: [[1381146, 14208936], 0.3], t0: 0.82, tw: 0.06, iri: 6961824, iriStrength: 0.24 })
      ],
      wing: { primary: { c: [1841690, 9073736], t0: 0.9, tw: 0.05 }, covert: () => ({ c: [1447194, 12098140], t0: 0.86, tw: 0.05, iri: 3832410, iriStrength: 0.3 }) },
      tail: { c: [1710104, 8022084], t0: 0.92, tw: 0.04 }
    }
  ),
  bird(
    "geai",
    "Geai des chênes",
    "Garrulus glandarius",
    { length: 0.34, lean: 30, girth: 1.1, head: 1.08, bill: { length: 0.21, radius: 0.058, color: 2499103 }, eye: { radius: 0.04, iris: 10466504 }, tail: { length: 0.92, width: 0.14 }, wing: { reach: 0.3 }, legs: { length: 0.34, color: 9071190 }, tempo: 0.7 },
    {
      body: [
        p(R.all, 11831928),
        p(R.under, 12885128),
        p(R.rump, WHITE),
        p(R.vent, WHITE),
        p(R.throat, 15789026),
        p({ kind: "blob", at: [8.9, 1], r: [1.3, 0.34], pow: 3, soft: 0.1 }, 15262422, { mix: [BLACK, 0.45] }),
        p({ kind: "streak", from: [9.9, 0.3], to: [7.3, 0.33], r: [0.3, 0.07] }, BLACK)
      ],
      wing: {
        primary: { c: [1841689, 9208952], t0: 0.3, tw: 0.4 },
        secondary: (k) => k > 0.7 ? f(8010278) : { c: [15789284, 1381138], t0: 0.42, tw: 0.05 },
        covert: (k) => k > 0.62 ? { c: [2060240, 790550], bars: 5 } : f(11831928)
      },
      tail: f(1446931)
    }
  ),
  bird(
    "pie",
    "Pie bavarde",
    "Pica pica",
    { length: 0.46, lean: 30, girth: 1.05, head: 1, bill: { length: 0.27, radius: 0.07, color: 1381138 }, eye: { radius: 0.038 }, tail: { length: 1.75, outer: 0.85, width: 0.15, cock: 6 }, wing: { reach: 0.2 }, legs: { length: 0.38, color: 1710102 }, tempo: 0.65 },
    {
      body: [
        p(R.all, [920846, 1578778], { iri: 2771594, iriStrength: 0.2 }),
        p(band(-1, 4.3, 0, 0.5, 0.12), WHITE),
        p(R.vent, BLACK),
        p(band(3.4, 5.5, 0.56, 0.8, 0.1), WHITE),
        p(R.rump, 9079432, { mix: [BLACK, 0.5] })
      ],
      wing: { primary: { c: [15789542, 1184274], t0: 0.8, tw: 0.06 }, secondary: { c: [1056826, 1718890], iri: 2779840, iriStrength: 0.5 }, covert: (k) => k < 0.35 ? f(WHITE) : { c: [922656, 1451582], iri: 2779840, iriStrength: 0.45 } },
      tail: { c: [793110, 1189918], iri: 2792026, iriStrength: 0.55 }
    }
  ),
  bird(
    "corneille",
    "Corneille noire",
    "Corvus corone",
    { length: 0.47, lean: 32, girth: 1.08, head: 1.02, bill: { length: 0.36, radius: 0.088, droop: 0.012, color: 1184016 }, eye: { radius: 0.036 }, tail: { length: 0.8, width: 0.16 }, wing: { reach: 0.7 }, legs: { length: 0.36, color: 1381395 }, tempo: 0.6 },
    {
      body: [p(R.all, [789518, 1447449], { iri: 2767466, iriStrength: 0.12 })],
      wing: { primary: f(1184276), covert: () => ({ c: [921105, 1579036], iri: 2767466, iriStrength: 0.14 }) },
      tail: f(1052690)
    }
  ),
  bird(
    "choucas",
    "Choucas des tours",
    "Corvus monedula",
    { length: 0.33, lean: 28, girth: 1.1, head: 1.08, bill: { length: 0.21, radius: 0.062, color: 1315602 }, eye: { radius: 0.04, iris: 14674160 }, tail: { length: 0.7, width: 0.14 }, wing: { reach: 0.68 }, legs: { length: 0.34, color: 1447188 }, tempo: 0.7 },
    {
      body: [
        p(R.all, [1184276, 1973794]),
        p(R.under, [1710620, 2763310]),
        p(band(6, 7.6, 0.42, 1, 0.12), 10133156),
        p(blob(7.3, 0.55, 0.8, 0.14), 8685710),
        p({ kind: "blob", at: [8.8, 1], r: [1.35, 0.36], pow: 3, soft: 0.06 }, [789520, 1447452])
      ],
      wing: { primary: f(1250070), covert: () => ({ c: [1052692, 1842210], iri: 3816058, iriStrength: 0.14 }) },
      tail: f(1118483)
    }
  ),
  bird(
    "picepeiche",
    "Pic épeiche",
    "Dendrocopos major",
    { length: 0.23, lean: 6, girth: 1, head: 1.05, bill: { length: 0.3, radius: 0.046, color: 4869718 }, eye: { radius: 0.036, iris: 5905430 }, tail: { length: 0.62, width: 0.1, cock: -14 }, wing: { reach: 0.55 }, legs: { length: 0.2, color: 5922400, toe: 0.14 }, tempo: 0.8 },
    {
      body: [
        p(R.all, BLACK),
        p(R.under, 15394002),
        p(R.vent, [12589588, 14690846]),
        p(band(-1, 2, 0, 0.32, 0.1), [12589588, 14690846]),
        p(band(3.6, 5.6, 0.56, 0.82, 0.08), WHITE),
        p(R.head, 15394002),
        p({ kind: "blob", at: [8.6, 1], r: [1.5, 0.3], pow: 3, soft: 0.05 }, BLACK),
        p(R.forehead, 14734520),
        p(blob(6.75, 1, 0.5, 0.26, 0.05), [12589588, 14690846]),
        p({ kind: "streak", from: [9.8, 0.3], to: [6.2, 0.42], r: [0.3, 0.05] }, BLACK),
        p({ kind: "streak", from: [6.9, 0.42], to: [6.6, 0.8], r: [0.25, 0.06] }, BLACK)
      ],
      wing: { primary: { c: [1315344, 15789280], bars: 5 }, covert: (k) => k > 0.6 ? { c: [1315344, 15789280], bars: 2 } : f(BLACK) },
      tail: (k) => k > 0.6 ? { c: [15789280, 1315344], bars: 3 } : f(BLACK)
    }
  ),
  bird(
    "picvert",
    "Pic vert",
    "Picus viridis",
    { length: 0.32, lean: 10, girth: 1.02, head: 1.05, bill: { length: 0.36, radius: 0.05, color: 5131850 }, eye: { radius: 0.036, iris: 15263968 }, tail: { length: 0.62, width: 0.11, cock: -12 }, wing: { reach: 0.55 }, legs: { length: 0.2, color: 6975078, toe: 0.14 }, tempo: 0.75 },
    {
      body: [
        p(R.all, 7311920),
        p(R.rump, [13158432, 15130682]),
        p(R.under, 12897440),
        p(R.vent, 12897440, { mix: [8029272, 0.4] }),
        p(R.head, 12371610),
        p(blob(8.6, 0.56, 1.15, 0.13, 0.05), BLACK),
        p({ kind: "streak", from: [9.8, 0.3], to: [7.6, 0.32], r: [0.3, 0.05] }, [12064784, 14428700]),
        p({ kind: "blob", at: [8.5, 1], r: [1.75, 0.3], pow: 3, soft: 0.05 }, [12064784, 14690844])
      ],
      wing: { primary: { c: [3815978, 14210224], bars: 6 }, secondary: f(6851120), covert: f(7311920) },
      tail: { c: [2763808, 6976576], bars: 5 }
    }
  ),
  bird(
    "coucou",
    "Coucou gris",
    "Cuculus canorus",
    { length: 0.33, lean: 38, girth: 0.94, head: 0.95, bill: { length: 0.18, radius: 0.042, droop: 0.02, color: 3815474, lower: 13152320 }, eye: { radius: 0.036, iris: 15253536 }, tail: { length: 1.3, outer: 0.9, width: 0.14 }, wing: { reach: 0.62, point: 0.9 }, legs: { length: 0.16, color: 14727200 }, tempo: 0.65 },
    {
      body: [
        p(R.all, 8293014),
        p(R.under, [15789800, 3422270], { bars: 3 }),
        p(R.vent, 15657696),
        p(R.breast, 9082530),
        p(R.head, 9082530)
      ],
      wing: { primary: f(6187122), covert: f(7832463) },
      tail: () => tipped(3356734, WHITE, 0.9)
    }
  ),
  bird(
    "tourterelle",
    "Tourterelle turque",
    "Streptopelia decaocto",
    { length: 0.32, lean: 30, girth: 1.1, head: 0.86, neck: 1.1, bill: { length: 0.15, radius: 0.036, color: 2762276 }, eye: { radius: 0.034, iris: 10496032 }, tail: { length: 1, width: 0.14 }, wing: { reach: 0.45 }, legs: { length: 0.2, color: 11553362 }, tempo: 0.6 },
    {
      body: [
        p(R.all, 12627096),
        p(R.under, 14075062),
        p(R.head, 13943992),
        p(R.vent, 13157052),
        p(band(6.25, 6.75, 0.5, 1, 0.04), BLACK),
        p(band(6.75, 6.9, 0.5, 1, 0.03), WHITE)
      ],
      wing: { primary: f(5918792), secondary: f(11050130), covert: (k) => k > 0.7 ? f(11841710) : f(12363924) },
      tail: (k) => k < 0.25 ? f(11575440) : { c: [4867136, 15789284], t0: 0.55, tw: 0.06 }
    }
  ),
  bird(
    "ramier",
    "Pigeon ramier",
    "Columba palumbus",
    { length: 0.41, lean: 30, girth: 1.22, head: 0.8, neck: 1.15, bill: { length: 0.16, radius: 0.04, color: 14721072 }, eye: { radius: 0.032, iris: 15261856 }, tail: { length: 0.88, width: 0.16 }, wing: { reach: 0.6 }, legs: { length: 0.2, color: 11553368 }, tempo: 0.55 },
    {
      body: [
        p(R.all, 8293016),
        p(R.under, 11052204),
        p(R.breast, [11569816, 12884646]),
        p(R.head, 8162980),
        p(R.vent, 12632776),
        p(band(6.1, 6.9, 0.3, 1, 0.08), [3832410, 5933690], { iri: 9063088, iriStrength: 0.5 }),
        p(blob(6.35, 0.52, 0.5, 0.17, 0.05), WHITE)
      ],
      wing: { primary: tipped(3817030, 9080470, 0.9), secondary: f(7240328), covert: (k) => k > 0.8 ? f(WHITE) : f(8029844) },
      tail: { c: [9082016, 1842722], t0: 0.72, tw: 0.08 }
    }
  ),
  bird(
    "bruantjaune",
    "Bruant jaune",
    "Emberiza citrinella",
    { length: 0.165, lean: 22, girth: 1.06, head: 1.1, bill: { length: 0.12, radius: 0.05, color: 8029326 }, tail: { length: 0.8, width: 0.1 }, wing: { reach: 0.34 }, legs: { length: 0.26, color: 11831920 } },
    {
      body: [
        p(R.all, 10119738, { mix: [3023898, 0.35] }),
        p(R.rump, 11559468),
        p(R.under, [14730792, 16047162]),
        p(R.flank, 15126332, { mix: [9062950, 0.4] }),
        p(R.breast, 15257400, { mix: [11034670, 0.3] }),
        p(R.head, [14994212, 16179260]),
        p(R.eyestripe, 8022576),
        p(blob(7, 0.62, 0.5, 0.1), 9075252),
        p({ kind: "blob", at: [8.2, 1], r: [0.9, 0.2], soft: 0.3 }, 15258682, { mix: [6969898, 0.35] })
      ],
      wing: { primary: tipped(3812898, 10127936, 0.5), covert: (k) => k > 0.6 ? tipped(3023898, 11565632, 0.6) : f(10119738) },
      tail: (k) => k > 0.72 ? tipped(3812898, WHITE, 0.5) : f(4864554)
    }
  ),
  bird(
    "verdier",
    "Verdier d'Europe",
    "Chloris chloris",
    { length: 0.15, lean: 22, girth: 1.16, head: 1.2, neck: 0.85, bill: { length: 0.15, radius: 0.068, color: 14861488 }, tail: { length: 0.6, width: 0.1 }, wing: { reach: 0.44 }, legs: { length: 0.24, color: 12884616 } },
    {
      body: [p(R.all, 8030778), p(R.under, [10135610, 12109384]), p(R.rump, 11057208), p(R.vent, 14211256), p(R.cheek, 8292958), p(R.lores, 4080176)],
      wing: { primary: { c: [15257632, 3355690], t0: 0.35, tw: 0.08 }, secondary: f(7238752), covert: (k) => k > 0.6 ? f(8686208) : f(8030778) },
      tail: (k) => k > 0.4 ? { c: [15257632, 2763298], t0: 0.6, tw: 0.06 } : f(3355690)
    }
  ),
  bird(
    "tarin",
    "Tarin des aulnes",
    "Spinus spinus",
    { length: 0.12, lean: 20, girth: 1.06, head: 1.15, bill: { length: 0.13, radius: 0.04, color: 12101784 }, tail: { length: 0.56, width: 0.09 }, wing: { reach: 0.48 }, legs: { length: 0.2, color: 4865076 } },
    {
      body: [
        p(R.all, 9083444, { mix: [3817504, 0.3] }),
        p(R.rump, [14209064, 15655994]),
        p(R.under, [13945904, 15523648]),
        p(R.belly, WHITE),
        p(R.flank, 15000260, { mix: [5921340, 0.3] }),
        p(R.head, [13156908, 14866490]),
        p(R.cheek, 10134074),
        p({ kind: "blob", at: [8.7, 1], r: [1.5, 0.34], pow: 3, soft: 0.05 }, BLACK),
        p(blob(9.3, 0, 0.6, 0.2), BLACK)
      ],
      wing: { primary: { c: [15259680, 1512719], t0: 0.3, tw: 0.08 }, covert: (k) => k > 0.7 ? tipped(1512719, 15259680, 0.6) : k > 0.35 ? tipped(1512719, 14208040, 0.75) : f(8293936) },
      tail: (k) => k > 0.3 ? { c: [15259680, 1512719], t0: 0.5, tw: 0.06 } : f(1512719)
    }
  ),
  bird(
    "bouvreuil",
    "Bouvreuil pivoine",
    "Pyrrhula pyrrhula",
    { length: 0.155, lean: 20, girth: 1.24, belly: 1.08, head: 1.2, neck: 0.75, bill: { length: 0.095, radius: 0.066, droop: 0.012, color: 1710104 }, tail: { length: 0.62, width: 0.11 }, wing: { reach: 0.4 }, legs: { length: 0.22, color: 4864564 } },
    {
      body: [
        p(R.all, 9081500),
        p(R.rump, WHITE),
        p(R.under, [13781584, 15624808]),
        p(R.vent, WHITE),
        p(R.head, [13781584, 15624808]),
        p({ kind: "blob", at: [9, 1], r: [1.75, 0.52], pow: 3, soft: 0.04 }, [789520, 1579038]),
        p(band(8.9, 12, 0, 1, 0.04), [789520, 1579038])
      ],
      wing: { primary: f(1447452), covert: (k) => k > 0.72 ? tipped(1447452, 15263458, 0.6) : k > 0.4 ? f(1710624) : f(9081500) },
      tail: f(1184280)
    }
  ),
  bird(
    "roitelet",
    "Roitelet huppé",
    "Regulus regulus",
    { length: 0.09, lean: 16, girth: 1.2, head: 1.3, neck: 0.8, bill: { length: 0.08, radius: 0.022, color: 1973274 }, eye: { radius: 0.042 }, tail: { length: 0.46, width: 0.08 }, wing: { reach: 0.4, size: 0.92 }, legs: { length: 0.24, color: 6967864 } },
    {
      body: [
        p(R.all, 8687690),
        p(R.under, 14210236),
        p(R.breast, 13486248),
        p(R.head, 11842708),
        p(blob(7.8, 0.53, 0.8, 0.14), 13618100),
        p({ kind: "blob", at: [8.5, 1], r: [1.5, 0.34], pow: 3, soft: 0.04 }, BLACK),
        p({ kind: "blob", at: [8.4, 1], r: [1.3, 0.17], pow: 3, soft: 0.04 }, [15904784, 16765468])
      ],
      wing: { primary: tipped(3355178, 10133578, 0.4), secondary: { c: [1710614, 9081920], t0: 0.3, tw: 0.08 }, covert: (k) => k > 0.72 ? tipped(2236960, WHITE, 0.66) : k > 0.45 ? tipped(5132848, 15263448, 0.78) : f(8161348) },
      tail: f(5000756)
    }
  ),
  bird(
    "accenteur",
    "Accenteur mouchet",
    "Prunella modularis",
    { length: 0.14, lean: 26, girth: 1.05, head: 1.08, bill: { length: 0.12, radius: 0.027, color: 2762276 }, eye: { iris: 8010274 }, tail: { length: 0.64, width: 0.1 }, wing: { reach: 0.36 }, legs: { length: 0.26, color: 11565660 } },
    {
      body: [
        p(R.all, 9068086, { mix: [2366484, 0.4] }),
        p(R.under, 9213084),
        p(R.belly, 12895942),
        p(R.flank, 11045480, { mix: [5914150, 0.4] }),
        p(R.head, 8292496),
        p(R.cheek, 8020552),
        p({ kind: "blob", at: [8.4, 1], r: [1.4, 0.3], pow: 3, soft: 0.15 }, 7235160, { mix: [3813414, 0.35] })
      ],
      wing: { primary: tipped(3812384, 9068086, 0.4), covert: (k) => k > 0.7 ? tipped(3023384, 12886128, 0.82) : f(8016432) },
      tail: f(5127728)
    }
  ),
  bird(
    "bergeronnette",
    "Bergeronnette grise",
    "Motacilla alba",
    { length: 0.18, lean: 30, girth: 0.96, head: 1.05, bill: { length: 0.13, radius: 0.026, color: 1447188 }, tail: { length: 1.08, width: 0.09, cock: 4 }, wing: { reach: 0.3 }, legs: { length: 0.4, color: 1710360 } },
    {
      body: [
        p(R.all, 10133670),
        p(R.under, WHITE),
        p(R.flank, 13159632),
        p(R.head, WHITE),
        p({ kind: "blob", at: [7.6, 1], r: [1.5, 0.42], pow: 3, soft: 0.04 }, BLACK),
        p({ kind: "blob", at: [6.6, 0], r: [1.75, 0.34], pow: 2.6, soft: 0.05 }, BLACK),
        p(R.forehead, WHITE)
      ],
      wing: { primary: tipped(2500138, 14211288, 0.88), secondary: tipped(2500138, WHITE, 0.6), covert: (k) => k > 0.45 ? tipped(2763310, WHITE, 0.55) : f(9344154) },
      tail: (k) => k > 0.7 ? f(WHITE) : f(1447446)
    }
  ),
  bird(
    "hirondelle",
    "Hirondelle rustique",
    "Hirundo rustica",
    { length: 0.18, lean: 34, girth: 0.92, head: 1.05, neck: 0.8, bill: { length: 0.07, radius: 0.036, color: 1447190 }, tail: { length: 0.5, outer: 1.35, width: 0.075, fan: 12 }, wing: { reach: 0.92, size: 1.25, point: 1 }, legs: { length: 0.12, color: 1710104, toe: 0.08 } },
    {
      body: [
        p(R.all, [1055292, 1846364], { iri: 2771648, iriStrength: 0.5 }),
        p(R.under, 15787732),
        p(band(5, 6.5, 0, 0.5, 0.06), [1055292, 1714258], { iri: 2771648, iriStrength: 0.4 }),
        p(band(6.5, 12, 0, 0.42, 0.06), [10104856, 12076066]),
        p(R.forehead, [10104856, 12076066])
      ],
      wing: { primary: f(1382175), covert: () => ({ c: [1055292, 1714776], iri: 2771648, iriStrength: 0.4 }) },
      tail: f(1316382)
    }
  ),
  bird(
    "huppe",
    "Huppe fasciée",
    "Upupa epops",
    {
      length: 0.27,
      lean: 26,
      girth: 1,
      head: 1.02,
      bill: { length: 0.56, radius: 0.034, droop: 0.07, color: 3814446 },
      eye: { radius: 0.034 },
      tail: { length: 0.74, width: 0.13 },
      wing: { reach: 0.5, size: 1.1 },
      legs: { length: 0.22, color: 5919824 },
      tempo: 0.75,
      crest: { length: 0.5, count: 30, base: 14721136, tip: 1380879 }
    },
    {
      body: [
        p(R.all, [13669480, 14854264]),
        p(R.belly, 15788252),
        p(R.vent, WHITE),
        p(band(1.2, 4, 0.55, 1, 0.06), [1380879, 15789024], { bars: 2 }),
        p(R.rump, WHITE)
      ],
      wing: { primary: { c: [1380879, 15920868], bars: 2 }, secondary: { c: [1380879, 15920868], bars: 4 }, covert: (k) => k > 0.3 ? { c: [1380879, 15786688], bars: 2 } : f(14195824) },
      tail: { c: [15920868, 1380879], bars: 1 }
    }
  ),
  bird(
    "loriot",
    "Loriot d'Europe",
    "Oriolus oriolus",
    { length: 0.24, lean: 30, girth: 1.04, head: 1, bill: { length: 0.25, radius: 0.048, droop: 8e-3, color: 12603466 }, eye: { radius: 0.038, iris: 9051160 }, tail: { length: 0.74, width: 0.12 }, wing: { reach: 0.6 }, legs: { length: 0.24, color: 4870232 }, tempo: 0.8 },
    {
      body: [p(R.all, [15251456, 16766490]), p(R.lores, BLACK)],
      wing: { primary: tipped(1381135, 15259808, 0.93), covert: (k) => k > 0.85 ? tipped(1381135, 16108560, 0.6) : k > 0.3 ? f(1381135) : f(16108560) },
      tail: (k) => k < 0.2 ? f(1381135) : { c: [1381135, 16108560], t0: 0.55 - 0.2 * k, tw: 0.06 }
    }
  ),
  bird(
    "crecerelle",
    "Faucon crécerelle",
    "Falco tinnunculus",
    { length: 0.34, lean: 8, girth: 1, back: 1.05, head: 1, neck: 0.85, bill: { length: 0.115, radius: 0.044, droop: 0.034, color: 4870748 }, eye: { radius: 0.042, iris: 1708556 }, tail: { length: 1.02, width: 0.13, cock: -10 }, wing: { reach: 0.8, point: 1 }, legs: { length: 0.24, color: 15253536, toe: 0.13, thick: 1.3 }, tempo: 0.6 },
    {
      body: [
        p(R.all, 11821612, { mix: [[11821612, 1709072], 0.5], t0: 0.74, tw: 0.08 }),
        p(R.rump, 9083048),
        p(R.under, 15258792, { mix: [[15258792, 2760728], 0.5], t0: 0.6, tw: 0.1 }),
        p(R.vent, 15786692),
        p(R.head, 9083048, { mix: [5924466, 0.3] }),
        p(R.throat, 15787724),
        p({ kind: "streak", from: [9.4, 0.38], to: [7.9, 0.3], r: [0.26, 0.05] }, 2762274),
        p(blob(9.8, 0.5, 0.35, 0.3), 15253536)
      ],
      wing: { primary: { c: [2761760, 3813930] }, secondary: { c: [11033642, 1709072], bars: 3 }, covert: () => ({ c: [11821612, 1709072], t0: 0.76, tw: 0.08 }) },
      tail: { c: [9083048, 1512463], t0: 0.8, tw: 0.04 }
    }
  ),
  bird(
    "buse",
    "Buse variable",
    "Buteo buteo",
    { length: 0.54, lean: 8, girth: 1.16, back: 1.05, head: 0.95, neck: 0.85, bill: { length: 0.14, radius: 0.05, droop: 0.042, color: 2763308 }, eye: { radius: 0.04, iris: 4861976 }, tail: { length: 0.72, width: 0.16, cock: -10 }, wing: { reach: 0.92, size: 1.1 }, legs: { length: 0.22, color: 14859300, toe: 0.14, thick: 1.5 }, tempo: 0.5 },
    {
      body: [
        p(R.all, 5915184, { mix: [9071690, 0.3] }),
        p(R.under, [15260868, 5915184], { bars: 2 }),
        p(R.breast, 6178354, { mix: [14207144, 0.3] }),
        p(band(3.6, 4.6, 0, 0.42, 0.2), 15260868, { mix: [6967352, 0.3] }),
        p(R.head, 6967866, { mix: [12890252, 0.25] }),
        p(R.throat, 13154456, { mix: [5915184, 0.4] }),
        p(blob(9.8, 0.5, 0.35, 0.3), 14859300)
      ],
      wing: { primary: { c: [4864040, 1972242], t0: 0.6, tw: 0.2 }, secondary: { c: [3812384, 6968380], bars: 4 }, covert: () => ({ c: [5126696, 8020034], t0: 0.7, tw: 0.2 }) },
      tail: { c: [4864040, 11573880], bars: 7 }
    }
  )
];
const plain = (l, over = {}) => ({ ...l, iriStrength: 0, iri: 0, iriGraze: 0, sparkle: 0, fine: false, channel: void 0, iriAim: void 0, iriAlign: 0, ...over });
function looksFor() {
  const L = MOUNTAIN_GEM.looks;
  const head = plain(L.head, { width: 0.02, loose: 0.45, fuzz: 0.3, tilt: 10 });
  return {
    body: plain(L.body, { loose: 0.5 }),
    belly: plain(L.belly, { loose: 0.8 }),
    flank: plain(L.flank, { loose: 0.85 }),
    down: plain(L.down),
    back: plain(L.back, { loose: 0.35, tilt: 9 }),
    scapular: plain(L.scapular, { loose: 0.4, tilt: 12 }),
    head,
    face: plain(L.head, { width: 0.014, loose: 0.5, fuzz: 0.4, tilt: 7, lift: 0.2 }),
    covert: plain(L.covert),
    undertail: plain(L.undertail),
    wingCovert: plain(L.wingCovert),
    // names the engine looks up; no tract uses them
    collar: head,
    mask: head,
    velvet: head,
    stripe: head,
    gorget: plain(L.gorget, { round: 0.8, cup: 0.3 }),
    crown: head
  };
}
const TRACTS = [
  { name: "belly", look: "belly", region: { kind: "band", s: [0, 4.6], phi: [0, 0.45], soft: 0.6 } },
  { name: "flank", look: "flank", region: { kind: "band", s: [1.2, 4.2], phi: [0.3, 0.52], soft: 0.5 } },
  { name: "back", look: "back", region: { kind: "band", s: [0.9, 6.2], phi: [0.55, 1] } },
  { name: "scapular", look: "scapular", region: { kind: "band", s: [3.7, 5.6], phi: [0.56, 0.84], soft: 0.3 } },
  { name: "wingPit", look: "down", region: { kind: "blob", at: [3.8, 0.44], r: [0.3, 0.035], soft: 0.5 } },
  { name: "tailCoverts", look: "covert", region: { kind: "band", s: [0, 1.15], phi: [0, 1] } },
  { name: "undertail", look: "undertail", region: { kind: "band", s: [0, 1.35], phi: [0, 0.4], soft: 0.3 } },
  { name: "head", look: "head", region: { kind: "band", s: [6, 11], phi: [0, 1], soft: 0.3 } },
  { name: "face", look: "face", region: { kind: "band", s: [8.6, 11], phi: [0, 1], soft: 0.3 } }
];
function makeSpecies(d, opts = {}) {
  const B = MOUNTAIN_GEM;
  const girth = d.girth ?? 1;
  const headK = d.head ?? 1;
  const stretch = d.stretch ?? 1;
  const neck = d.neck ?? 1;
  const lean = d.lean * DEG;
  const src = B.sections;
  const hip = src[2];
  const nk = src[6];
  let sec = src.map((k, i) => {
    const g = i <= 5 ? girth : i === 6 ? (girth + headK) / 2 : headK;
    const o = { ...k, w: k.w * g, rd: k.rd * g * (i <= 6 ? d.back ?? 1 : 1), rv: k.rv * g * (i <= 6 ? d.belly ?? 1 : 1) };
    if (i <= 6) {
      o.y = hip.y + (k.y - hip.y) * stretch;
      o.z = hip.z + (k.z - hip.z) * stretch;
    } else {
      const ny = hip.y + (nk.y - hip.y) * stretch;
      const nz = hip.z + (nk.z - hip.z) * stretch;
      o.y = ny + (k.y - nk.y) * headK * neck;
      o.z = nz + (k.z - nk.z) * headK * neck;
    }
    return o;
  });
  const rot = (y, z, py, pz, a) => {
    const dy2 = y - py;
    const dz2 = z - pz;
    return [py + dy2 * Math.cos(a) - dz2 * Math.sin(a), pz + dy2 * Math.sin(a) + dz2 * Math.cos(a)];
  };
  const tip = (d.billUp ?? 0) * DEG;
  const back = lean * 0.92 + tip;
  const leanPoint = (y, z) => rot(y, z, sec[2].y, sec[2].z, lean);
  sec = sec.map((k) => {
    const [y, z] = leanPoint(k.y, k.z);
    return { ...k, y, z, a: k.a - d.lean };
  });
  const n6 = sec[6];
  sec = sec.map((k, i) => {
    if (i < 6) return k;
    if (i === 6) return { ...k, a: k.a + back / DEG * 0.5 };
    const [y, z] = rot(k.y, k.z, n6.y, n6.z, -back);
    return { ...k, y, z, a: k.a + back / DEG };
  });
  const s5 = src[5];
  const sh2 = B.wing.shoulder;
  const shY = hip.y + (s5.y - hip.y) * stretch + (sh2[1] - s5.y) * girth;
  const shZ = hip.z + (s5.z - hip.z) * stretch + (sh2[2] - s5.z) * girth;
  const [shy, shz] = leanPoint(shY, shZ);
  const shoulder = [sh2[0] * girth, shy, shz];
  const ws = d.wing?.size ?? 1;
  const point = d.wing?.point ?? 0.5;
  const T = d.tail;
  const droop = Math.max(B.tail.droop - 14 - d.lean * 1.15 - (T.cock ?? 0), -60);
  const species = {
    ...B,
    name: d.scientific,
    seed: [...d.id].reduce((a, c2) => a * 31 + c2.charCodeAt(0) >>> 0, 7),
    sections: sec,
    eye: { ...B.eye, radius: (d.eye?.radius ?? 0.036) * headK },
    bill: { length: d.bill.length, radius: d.bill.radius, droop: d.bill.droop ?? 4e-3, color: d.bill.color },
    billLower: d.bill.lower,
    iris: d.eye?.iris,
    skin: 2366488,
    shading: { flank: 1, under: 1, patch: 0.12, gold: 0, goldAmount: 0 },
    looks: looksFor(),
    tracts: TRACTS,
    wing: {
      shoulder,
      upper: 0.13 * ws,
      fore: 0.17 * ws,
      hand: 0.15 * ws,
      primaries: 10,
      secondaries: 8,
      primaryLen: [0.42 * ws, (0.52 + 0.3 * point) * ws],
      secondaryLen: [0.4 * ws, 0.34 * ws],
      primaryWidth: 0.075 * ws,
      secondaryWidth: 0.085 * ws,
      rest: { ...B.wing.rest, width: [0.05 * girth, 0.105 * girth, 0.04 * girth], height: 0.034 * girth, cross: [d.wing?.reach ?? 0.4, -0.02] },
      color: 3813416,
      sheen: 0
    },
    tail: { rectrices: T.n ?? 6, length: [T.length, T.outer ?? T.length * 0.94], width: T.width ?? 0.11, droop, restFan: 0.5, maxFan: T.fan ?? 9, color: 3813416 },
    legs: { spread: (d.legs.spread ?? 0.085) * girth, hip: [0, 0, 0], toe: d.legs.toe ?? 0.1, perchRadius: 0.07, color: d.legs.color },
    paint: makePainter(d.paint),
    haircut: 0,
    noTongue: true,
    flapHz: d.flapHz ?? (d.length > 0.19 ? Math.min(9, 2.6 / Math.pow(d.length, 0.75)) : void 0),
    crest: d.crest,
    realLength: d.length,
    coarse: opts.lite ? 1.45 : 1,
    fuzzLayers: 0,
    behaviour: tempo(B.behaviour, d.tempo ?? 1)
  };
  const loft = new Loft(species);
  const legS = 1.9 + d.lean / 32;
  const c = loft.center(legS, new THREE.Vector3());
  const p2 = loft.point(legS, 0.5, new THREE.Vector3());
  const hy = c.y + (p2.y - c.y) * 0.55;
  const hz = c.z + (p2.z - c.z) * 0.55;
  const dy = d.legs.length - hy;
  const dz = -0.22 * d.legs.length - hz;
  species.sections = sec.map((k) => ({ ...k, y: k.y + dy, z: k.z + dz }));
  species.wing.shoulder = [shoulder[0], shoulder[1] + dy, shoulder[2] + dz];
  species.legs.hip = [species.legs.spread * 1.05, d.legs.length, -0.22 * d.legs.length];
  return species;
}
function tempo(b, k) {
  const slow = (r) => [r[0] / k, r[1] / k];
  return { ...b, breathHz: [b.breathHz[0] * (0.55 + 0.45 * k), b.breathHz[1] * (0.55 + 0.45 * k)], holdCalm: slow(b.holdCalm), holdAlert: slow(b.holdAlert), blinkEvery: slow(b.blinkEvery), tailEvery: slow(b.tailEvery), wingEvery: slow(b.wingEvery), billUp: 6 };
}
function modelLength(sp) {
  const loft = new Loft(sp);
  const b = loft.center(loft.sMax, new THREE.Vector3());
  const ax = loft.axis(loft.sMax, new THREE.Vector3());
  b.addScaledVector(ax, sp.bill.length);
  const t = loft.center(sp.spine.tail, new THREE.Vector3());
  const a = sp.tail.droop * DEG;
  t.add(new THREE.Vector3(0, -Math.sin(a), -Math.cos(a)).multiplyScalar(Math.max(...sp.tail.length)));
  return b.distanceTo(t);
}
const PERCH_R = 0.07;
const RANGE = [GRIP_X - 0.4, GRIP_X + 0.4];
const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[^a-z]/g, "");
function findBird(name) {
  const n = norm(name);
  return BIRDS.find((b) => b.id === name || norm(b.scientific) === n || norm(b.common) === n) ?? null;
}
async function createPerch(opts = {}) {
  const group = new THREE.Group();
  group.name = "perchoir";
  const scaled = new THREE.Group();
  group.add(scaled);
  const fill = new THREE.DirectionalLight(16774888, opts.fill ?? 0.55);
  fill.position.set(0.2, -1, 0.9);
  group.add(fill, fill.target);
  const sway = createSway();
  const branch = createBranch(PERCH_R, true).group;
  scaled.add(branch);
  sway.use(branch);
  const rider = new THREE.Group();
  scaled.add(rider);
  const frames = perchFrames(branch, RANGE);
  let bird2 = null;
  let desc = null;
  let scale2 = 0.08;
  let scaleTo = 0.08;
  let ride = 0;
  const at = new THREE.Vector3();
  const setScale = (s) => {
    scale2 = s;
    scaled.scale.setScalar(s);
    scaled.position.set(-GRIP_X * s, 0, 0);
  };
  setScale(scale2);
  function dispose() {
    if (!bird2) return;
    rider.remove(bird2.root);
    bird2.dispose();
    bird2 = null;
  }
  const perch = {
    group,
    get bird() {
      return bird2;
    },
    get species() {
      return desc;
    },
    /** metres, bill tip to tail tip, of the bird on (or coming to) the perch */
    get size() {
      return desc?.length ?? 0.14;
    },
    /** a comfortable distance to watch this bird from, metres */
    get viewDistance() {
      return THREE.MathUtils.clamp(0.5 + perch.size * 3.2, 0.8, 2.4);
    },
    /** true once it is on the branch */
    get landed() {
      return !!bird2 && bird2.perched && !bird2.away;
    },
    get away() {
      return !bird2 || bird2.away;
    },
    has: (name) => !!findBird(name),
    /**
     * Build this bird, out of sight, and resize the branch for it. Heavy (it makes every
     * feather): call it while nothing is on the perch. Returns false for a bird it does not know.
     */
    prepare(name) {
      const d = findBird(name);
      if (!d) return false;
      dispose();
      desc = d;
      const sp = makeSpecies(d, { lite: opts.lite });
      scaleTo = d.length / modelLength(sp);
      bird2 = createBird({ species: sp });
      bird2.root.position.x = GRIP_X;
      bird2.layer("hop").home = GRIP_X;
      const flee = bird2.layer("flee");
      flee.tame = true;
      flee.pace = 1.5 + d.length * 5.5;
      if (opts.lite) for (const m of [bird2.feathers.contour, bird2.feathers.flight]) m.castShadow = false;
      rider.add(bird2.root);
      group.updateMatrixWorld(true);
      bird2.setPerch(frames, RANGE);
      bird2.mind.on("perch", (e) => {
        sway.push(e.x, e.push, e.side);
        sway.load(e.on ? e.x : null);
      });
      if (opts.query?.has("quiet")) bird2.mind.quiet = true;
      if (opts.query?.has("stay")) {
        setScale(scaleTo);
        sway.load(GRIP_X);
        sway.settle();
      } else bird2.beginAway();
      return true;
    },
    /** Fly in and land. */
    arrive: () => bird2?.arrive() ?? false,
    /** Take off and stay away. */
    leave: () => bird2?.leave() ?? false,
    /** prepare + arrive */
    show(name) {
      return perch.prepare(name) && (opts.query?.has("stay") || perch.arrive());
    },
    /** loudness of the recording, 0…1, every frame */
    setVoice(v) {
      if (bird2) bird2.voice = v;
    },
    /** something to look at now and then (the visitor's head), world space */
    setAttention(p2) {
      bird2?.setAttention(p2);
    },
    startle() {
      bird2?.startle(0.6);
    },
    headPosition(out) {
      return bird2 ? bird2.headPosition(out) : group.getWorldPosition(out);
    },
    update(dt) {
      if (scale2 !== scaleTo && (!bird2 || bird2.away)) {
        const k = 1 - Math.exp(-dt * 5);
        setScale(Math.abs(scaleTo - scale2) < scaleTo * 4e-3 ? scaleTo : scale2 + (scaleTo - scale2) * k);
      }
      sway.update(dt);
      if (!bird2) return;
      ride += ((bird2.perched ? 1 : 0) - ride) * (1 - Math.exp(-25 * dt));
      sway.at(bird2.root.position.x, at);
      rider.position.copy(at).multiplyScalar(ride);
      bird2.update(dt);
    },
    dispose
  };
  return perch;
}
export {
  BIRDS,
  createPerch,
  findBird
};
