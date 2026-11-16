import type { Painter, Pigment, Region } from './species';
import { inRegion } from './plumageGeometry';

// Plumage as a short list of patches. Every species shares the same loft (11 sections, the
// same anatomy at the same coordinates), so the places have names: a robin is "breast and
// face orange, a grey edge round it, olive-brown above, white belly".
//
// Loft space: s = 0 tail root … 10 bill base; phi = 0 belly line … 1 back line.

export const R = {
  all: { kind: 'band', s: [-1, 12], phi: [0, 1] },
  under: { kind: 'band', s: [-1, 6.4], phi: [0, 0.47], soft: 0.25 },
  upper: { kind: 'band', s: [-1, 6.4], phi: [0.47, 1] },
  head: { kind: 'band', s: [6.4, 12], phi: [0, 1], soft: 0.25 },
  crown: { kind: 'blob', at: [8.6, 1], r: [1.75, 0.36], pow: 3, soft: 0.1 },
  forehead: { kind: 'blob', at: [9.75, 1], r: [0.7, 0.5], soft: 0.1 },
  nape: { kind: 'blob', at: [6.5, 1], r: [0.8, 0.42], soft: 0.15 },
  cheek: { kind: 'blob', at: [7.45, 0.5], r: [0.95, 0.15], soft: 0.1 },
  lores: { kind: 'blob', at: [9.3, 0.52], r: [0.75, 0.1] },
  throat: { kind: 'blob', at: [8.0, 0], r: [1.6, 0.3], pow: 2.5, soft: 0.12 },
  chin: { kind: 'blob', at: [9.2, 0], r: [0.9, 0.3] },
  breast: { kind: 'blob', at: [5.3, 0], r: [1.35, 0.44], pow: 2.6, soft: 0.15 },
  belly: { kind: 'band', s: [0.9, 4.1], phi: [0, 0.3], soft: 0.35 },
  flank: { kind: 'band', s: [1.3, 4.6], phi: [0.26, 0.5], soft: 0.3 },
  vent: { kind: 'band', s: [-1, 1.25], phi: [0, 0.5], soft: 0.2 },
  rump: { kind: 'band', s: [-1, 1.9], phi: [0.55, 1], soft: 0.25 },
  mantle: { kind: 'band', s: [1.9, 6.4], phi: [0.55, 1], soft: 0.2 },
  neckSide: { kind: 'blob', at: [6.2, 0.5], r: [0.75, 0.2], soft: 0.15 },
  supercilium: { kind: 'streak', from: [9.7, 0.69], to: [6.9, 0.72], r: [0.28, 0.045] },
  eyestripe: { kind: 'streak', from: [9.8, 0.54], to: [6.7, 0.57], r: [0.24, 0.04] },
  eyering: { kind: 'blob', at: [7.8, 0.535], r: [0.42, 0.075] },
  malar: { kind: 'streak', from: [9.5, 0.3], to: [7.0, 0.3], r: [0.22, 0.045] },
  bib: { kind: 'blob', at: [7.9, 0], r: [1.0, 0.2] },
} satisfies Record<string, Region>;

export type Col = number | [base: number, tip: number];

export interface Patch {
  r: Region;
  c: Col;
  /** a share of the feathers here take this colour instead: speckles, streaks, mottling */
  mix?: [Col, number];
  bars?: number;
  /** where along the feather the tip colour starts, and over how much of it */
  t0?: number;
  tw?: number;
  iri?: number;
  iriStrength?: number;
}

export interface FeatherCol {
  c: Col;
  bars?: number;
  t0?: number;
  tw?: number;
  iri?: number;
  iriStrength?: number;
}

export interface PaintSpec {
  /** later patches win */
  body: Patch[];
  wing: {
    primary: FeatherCol | ((f: number) => FeatherCol);
    secondary?: FeatherCol | ((f: number) => FeatherCol);
    /** f = 0 lesser coverts at the shoulder … 1 greater coverts */
    covert: FeatherCol | ((f: number) => FeatherCol);
  };
  tail: FeatherCol | ((f: number) => FeatherCol);
}

const pair = (c: Col): [number, number] => (typeof c === 'number' ? [c, c] : c);
const pig = (f: FeatherCol): Pigment => {
  const [base, tip] = pair(f.c);
  return { base, tip, bars: f.bars, t0: f.t0, tw: f.tw, iri: f.iri, iriStrength: f.iriStrength };
};
const pick = (v: FeatherCol | ((f: number) => FeatherCol), f: number) => pig(typeof v === 'function' ? v(f) : v);

export function makePainter(spec: PaintSpec): Painter {
  return {
    body(s, phi, rnd) {
      let hit: Patch | null = null;
      for (const p of spec.body) if (inRegion(p.r, s, phi, rnd)) hit = p;
      if (!hit) return null;
      const r2 = (rnd * 7919.31) % 1;
      const out = pig(hit);
      if (hit.mix && r2 < hit.mix[1]) [out.base, out.tip] = pair(hit.mix[0]);
      return out;
    },
    wing: (kind, f) => pick(kind === 'covert' ? spec.wing.covert : kind === 'secondary' ? (spec.wing.secondary ?? spec.wing.primary) : spec.wing.primary, f),
    tail: (f) => pick(spec.tail, f),
  };
}
