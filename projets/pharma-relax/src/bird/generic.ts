import * as THREE from 'three';
import { MOUNTAIN_GEM, type FeatherLook, type Section, type Species } from './species';
import { Loft } from './loft';
import { makePainter, type PaintSpec } from './paint';
import { DEG } from './util';

// Any perching bird as a reshaping of the one loft the engine was built round: the
// mountain-gem's eleven sections leaned forward, fattened, given another head, bill, tail,
// legs and wings, and painted. The topology (which section is the chest, where the eye
// sits, which bone carries what) stays put, so the rig, the feather layout and every
// behaviour work unchanged.

export interface BirdDesc {
  id: string;
  common: string;
  scientific: string;
  /** bill tip to tail tip, metres */
  length: number;
  /** degrees the body leans forward of the hummingbird's upright stance: 15 robin … 40 thrush, crow */
  lean: number;
  /** body girth, depth of belly and back, and length along the spine (1 = the mountain-gem's) */
  girth?: number;
  belly?: number;
  back?: number;
  stretch?: number;
  /** head size, and how far it sits from the shoulders */
  head?: number;
  neck?: number;
  /** degrees the bill points above level */
  billUp?: number;
  bill: { length: number; radius: number; droop?: number; color: number; lower?: number };
  eye?: { radius?: number; iris?: number };
  tail: { length: number; outer?: number; width?: number; cock?: number; n?: number; fan?: number };
  /** wing: overall size, and how far along the tail the folded tips reach (0…1) */
  wing?: { size?: number; reach?: number; point?: number };
  legs: { length: number; color: number; toe?: number; spread?: number; thick?: number };
  paint: PaintSpec;
  /** see Species */
  flapHz?: number;
  crest?: Species['crest'];
  /** behaviour tempo: 1 = small passerine, lower = a calmer, bigger bird */
  tempo?: number;
  /** song posture: degrees the bill lifts, and how wide it opens 0…1 */
  sing?: { up?: number; open?: number };
}

const plain = (l: FeatherLook, over: Partial<FeatherLook> = {}): FeatherLook => ({ ...l, iriStrength: 0, iri: 0x000000, iriGraze: 0x000000, sparkle: 0, fine: false, channel: undefined, iriAim: undefined, iriAlign: 0, ...over });

function looksFor(): Species['looks'] {
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
    crown: head,
  };
}

const TRACTS: Species['tracts'] = [
  { name: 'belly', look: 'belly', region: { kind: 'band', s: [0, 4.6], phi: [0, 0.45], soft: 0.6 } },
  { name: 'flank', look: 'flank', region: { kind: 'band', s: [1.2, 4.2], phi: [0.3, 0.52], soft: 0.5 } },
  { name: 'back', look: 'back', region: { kind: 'band', s: [0.9, 6.2], phi: [0.55, 1] } },
  { name: 'scapular', look: 'scapular', region: { kind: 'band', s: [3.7, 5.6], phi: [0.56, 0.84], soft: 0.3 } },
  { name: 'wingPit', look: 'down', region: { kind: 'blob', at: [3.8, 0.44], r: [0.3, 0.035], soft: 0.5 } },
  { name: 'tailCoverts', look: 'covert', region: { kind: 'band', s: [0, 1.15], phi: [0, 1] } },
  { name: 'undertail', look: 'undertail', region: { kind: 'band', s: [0, 1.35], phi: [0, 0.4], soft: 0.3 } },
  { name: 'head', look: 'head', region: { kind: 'band', s: [6.0, 11], phi: [0, 1], soft: 0.3 } },
  { name: 'face', look: 'face', region: { kind: 'band', s: [8.6, 11], phi: [0, 1], soft: 0.3 } },
];

export function makeSpecies(d: BirdDesc, opts: { lite?: boolean } = {}): Species {
  const B = MOUNTAIN_GEM;
  const girth = d.girth ?? 1;
  const headK = d.head ?? 1;
  const stretch = d.stretch ?? 1;
  const neck = d.neck ?? 1;
  const lean = d.lean * DEG;

  // 1. reshape in the hummingbird's own frame: girth, spine length, head size
  const src = B.sections;
  const hip = src[2];
  const nk = src[6];
  let sec: Section[] = src.map((k, i) => {
    const g = i <= 5 ? girth : i === 6 ? (girth + headK) / 2 : headK;
    const o: Section = { ...k, w: k.w * g, rd: k.rd * g * (i <= 6 ? (d.back ?? 1) : 1), rv: k.rv * g * (i <= 6 ? (d.belly ?? 1) : 1) };
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
  // 2. lean the whole bird forward about the hips, then set the head level again about the neck
  const rot = (y: number, z: number, py: number, pz: number, a: number): [number, number] => {
    const dy = y - py;
    const dz = z - pz;
    return [py + dy * Math.cos(a) - dz * Math.sin(a), pz + dy * Math.sin(a) + dz * Math.cos(a)];
  };
  const tip = (d.billUp ?? 0) * DEG;
  const back = lean * 0.92 + tip;
  const leanPoint = (y: number, z: number) => rot(y, z, sec[2].y, sec[2].z, lean);
  sec = sec.map((k) => {
    const [y, z] = leanPoint(k.y, k.z);
    return { ...k, y, z, a: k.a - d.lean };
  });
  const n6 = sec[6];
  sec = sec.map((k, i) => {
    if (i < 6) return k;
    if (i === 6) return { ...k, a: k.a + (back / DEG) * 0.5 };
    const [y, z] = rot(k.y, k.z, n6.y, n6.z, -back);
    return { ...k, y, z, a: k.a + back / DEG };
  });

  // shoulder: carried with section 5
  const s5 = src[5];
  const sh = B.wing.shoulder;
  const shY = hip.y + (s5.y - hip.y) * stretch + (sh[1] - s5.y) * girth;
  const shZ = hip.z + (s5.z - hip.z) * stretch + (sh[2] - s5.z) * girth;
  const [shy, shz] = leanPoint(shY, shZ);
  const shoulder: [number, number, number] = [sh[0] * girth, shy, shz];

  const ws = d.wing?.size ?? 1;
  const point = d.wing?.point ?? 0.5;
  const T = d.tail;
  const droop = Math.max(B.tail.droop - 14 - d.lean * 1.15 - (T.cock ?? 0), -60);
  const species: Species = {
    ...B,
    name: d.scientific,
    seed: [...d.id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7),
    sections: sec,
    eye: { ...B.eye, radius: (d.eye?.radius ?? 0.036) * headK },
    bill: { length: d.bill.length, radius: d.bill.radius, droop: d.bill.droop ?? 0.004, color: d.bill.color },
    billLower: d.bill.lower,
    iris: d.eye?.iris,
    skin: 0x241c18,
    shading: { flank: 1, under: 1, patch: 0.12, gold: 0x000000, goldAmount: 0 },
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
      color: 0x3a3028,
      sheen: 0x000000,
    },
    tail: { rectrices: T.n ?? 6, length: [T.length, T.outer ?? T.length * 0.94], width: T.width ?? 0.11, droop, restFan: 0.5, maxFan: T.fan ?? 9, color: 0x3a3028 },
    legs: { spread: (d.legs.spread ?? 0.085) * girth, hip: [0, 0, 0], toe: d.legs.toe ?? 0.1, perchRadius: 0.07, color: d.legs.color },
    paint: makePainter(d.paint),
    haircut: 0,
    noTongue: true,
    flapHz: d.flapHz ?? (d.length > 0.19 ? Math.min(9, 2.6 / Math.pow(d.length, 0.75)) : undefined),
    crest: d.crest,
    realLength: d.length,
    coarse: opts.lite ? 1.45 : 1,
    fuzzLayers: 0,
    behaviour: tempo(B.behaviour, d.tempo ?? 1),
  };

  // 3. stand it on its legs: they leave the belly a little behind the middle, the further
  // forward the more the body leans, and the feet (the origin) go under that point
  const loft = new Loft(species);
  const legS = 1.9 + d.lean / 32;
  const c = loft.center(legS, new THREE.Vector3());
  const p = loft.point(legS, 0.5, new THREE.Vector3());
  const hy = c.y + (p.y - c.y) * 0.55;
  const hz = c.z + (p.z - c.z) * 0.55;
  const dy = d.legs.length - hy;
  const dz = -0.22 * d.legs.length - hz;
  species.sections = sec.map((k) => ({ ...k, y: k.y + dy, z: k.z + dz }));
  species.wing.shoulder = [shoulder[0], shoulder[1] + dy, shoulder[2] + dz];
  species.legs.hip = [species.legs.spread * 1.05, d.legs.length, -0.22 * d.legs.length];
  return species;
}

function tempo(b: Species['behaviour'], k: number): Species['behaviour'] {
  const slow = (r: [number, number]): [number, number] => [r[0] / k, r[1] / k];
  return { ...b, breathHz: [b.breathHz[0] * (0.55 + 0.45 * k), b.breathHz[1] * (0.55 + 0.45 * k)], holdCalm: slow(b.holdCalm), holdAlert: slow(b.holdAlert), blinkEvery: slow(b.blinkEvery), tailEvery: slow(b.tailEvery), wingEvery: slow(b.wingEvery), billUp: 6 };
}

/** Bill tip to tail tip of the model in its own units, at rest. */
export function modelLength(sp: Species) {
  const loft = new Loft(sp);
  const b = loft.center(loft.sMax, new THREE.Vector3());
  const ax = loft.axis(loft.sMax, new THREE.Vector3());
  b.addScaledVector(ax, sp.bill.length);
  const t = loft.center(sp.spine.tail, new THREE.Vector3());
  const a = sp.tail.droop * DEG;
  t.add(new THREE.Vector3(0, -Math.sin(a), -Math.cos(a)).multiplyScalar(Math.max(...sp.tail.length)));
  return b.distanceTo(t);
}
