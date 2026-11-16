import type { BirdDesc } from './generic';
import { R, type Col, type FeatherCol, type Patch } from './paint';
import type { Region } from './species';

// The 36 birds PharmaRelax calls from Xeno-canto. Shapes and colours after the reference
// plates (profile, front, back, spread wing) and the species' field marks; adult males
// where the sexes differ.

/** a colour as a feather: a little darker at the root than at the tip */
const sh = (c: number, k = 0.8): [number, number] => {
  const r = Math.round(((c >> 16) & 255) * k);
  const g = Math.round(((c >> 8) & 255) * k);
  const b = Math.round((c & 255) * k);
  return [(r << 16) | (g << 8) | b, c];
};
const p = (r: Region, c: number | Col, more: Partial<Patch> = {}): Patch => ({ r, c: typeof c === 'number' ? sh(c) : c, ...more });
const f = (c: number | Col, more: Partial<FeatherCol> = {}): FeatherCol => ({ c: typeof c === 'number' ? sh(c, 0.88) : c, ...more });
/** a flight feather or covert of one colour with a tip of another (wing bars, tail tips) */
const tipped = (c: number, tip: number, t0 = 0.72): FeatherCol => ({ c: [c, tip], t0, tw: 0.08 });
const blob = (s: number, phi: number, rs: number, rphi: number, soft = 0.1): Region => ({ kind: 'blob', at: [s, phi], r: [rs, rphi], soft });
const band = (s0: number, s1: number, p0: number, p1: number, soft = 0.15): Region => ({ kind: 'band', s: [s0, s1], phi: [p0, p1], soft });
const WHITE = 0xf2efe6;
const BLACK = 0x17140f;

type Shape = Omit<BirdDesc, 'id' | 'common' | 'scientific' | 'paint'>;
const bird = (id: string, common: string, scientific: string, shape: Shape, paint: BirdDesc['paint']): BirdDesc => ({ id, common, scientific, ...shape, paint });

export const BIRDS: BirdDesc[] = [
  bird('rougegorge', 'Rougegorge familier', 'Erithacus rubecula',
    { length: 0.14, lean: 14, girth: 1.12, belly: 1.05, head: 1.22, neck: 0.9, bill: { length: 0.15, radius: 0.034, color: 0x2a2320 }, eye: { radius: 0.046 }, tail: { length: 0.62, width: 0.1, cock: 8 }, wing: { reach: 0.38 }, legs: { length: 0.3, color: 0x4a3328 } },
    {
      body: [
        p(R.all, 0x7c6a49),
        p(R.under, 0xeeeae0),
        p(R.flank, 0xc4ad88),
        p(blob(5.9, 0, 1.72, 0.47, 0.12), 0xaab0b0),
        p(R.neckSide, 0xa3a9aa),
        p({ kind: 'blob', at: [5.75, 0], r: [1.6, 0.42], pow: 2.6, soft: 0.1 }, [0xc8571a, 0xe8792a]),
        p(band(6.3, 12, 0, 0.6), [0xc8571a, 0xe8792a]),
        p(R.forehead, [0xc8571a, 0xe07228]),
        p({ kind: 'blob', at: [8.3, 1], r: [1.5, 0.4], pow: 3, soft: 0.1 }, 0x7c6a49),
      ],
      wing: { primary: f(0x54452f), covert: (k) => (k > 0.8 ? tipped(0x5e4d38, 0xa58555, 0.8) : f(0x6c5a40)) },
      tail: f(0x5a4a33),
    }),

  bird('merle', 'Merle noir', 'Turdus merula',
    { length: 0.25, lean: 30, girth: 1.06, head: 1.0, bill: { length: 0.25, radius: 0.047, color: 0xf2a41c }, eye: { radius: 0.04 }, tail: { length: 0.98, width: 0.12, cock: -4 }, wing: { reach: 0.33 }, legs: { length: 0.32, color: 0x2e2620 }, tempo: 0.8 },
    {
      body: [p(R.all, [0x100e0c, 0x1c1916]), p(R.eyering, 0xe6a21e)],
      wing: { primary: f(0x1a1612), covert: f(0x17140f) },
      tail: f(0x14110e),
    }),

  bird('charbonniere', 'Mésange charbonnière', 'Parus major',
    { length: 0.14, lean: 18, girth: 1.08, head: 1.2, neck: 0.9, bill: { length: 0.11, radius: 0.036, color: 0x1c1a1a }, tail: { length: 0.68, width: 0.1 }, wing: { reach: 0.36 }, legs: { length: 0.26, color: 0x55606c } },
    {
      body: [
        p(R.all, 0x7f8f3c),
        p(R.rump, 0x8794a0),
        p(R.under, [0xd9c22e, 0xf0d93c]),
        p(R.vent, WHITE),
        p(band(-1, 6.6, 0, 0.1, 0.25), BLACK),
        p(R.head, [0x0f0f12, 0x1b1b22]),
        p(blob(7.35, 0.47, 1.0, 0.2, 0.08), WHITE),
        p(blob(6.45, 1, 0.35, 0.2), 0xd8dc9a),
      ],
      wing: { primary: tipped(0x39424c, 0x8fa0b4, 0.5), secondary: tipped(0x39424c, 0x9fb0c2, 0.45), covert: (k) => (k > 0.78 ? tipped(0x4a5868, WHITE, 0.72) : f(0x6f869c)) },
      tail: (k) => (k > 0.8 ? f(WHITE) : f(0x4a5868)),
    }),

  bird('pinson', 'Pinson des arbres', 'Fringilla coelebs',
    { length: 0.145, lean: 22, girth: 1.06, head: 1.12, bill: { length: 0.13, radius: 0.052, color: 0x7f8fa3 }, tail: { length: 0.7, width: 0.1 }, wing: { reach: 0.38 }, legs: { length: 0.26, color: 0x7a5a48 } },
    {
      body: [
        p(R.all, 0x8a5a3a),
        p(R.rump, 0x8a9a4a),
        p(R.under, [0xc98670, 0xdc9c84]),
        p(R.vent, 0xeee6dc),
        p(R.head, [0xc47a62, 0xd98f76]),
        p({ kind: 'blob', at: [8.0, 1], r: [2.1, 0.36], pow: 3, soft: 0.08 }, 0x6f8aa8),
        p(R.nape, 0x6f8aa8),
        p(R.forehead, 0x1d1b1c),
      ],
      wing: { primary: tipped(0x221e1b, 0x4a4436, 0.6), secondary: tipped(0x221e1b, 0xd8d2a0, 0.8), covert: (k) => (k < 0.4 ? f(WHITE) : k > 0.75 ? tipped(0x1c1917, 0xeee8d4, 0.62) : f(0x1c1917)) },
      tail: (k) => (k > 0.72 ? f(WHITE) : k < 0.2 ? f(0x5d6a70) : f(0x1f1c1a)),
    }),

  bird('rossignol', 'Rossignol philomèle', 'Luscinia megarhynchos',
    { length: 0.165, lean: 20, girth: 1.05, head: 1.1, bill: { length: 0.16, radius: 0.034, color: 0x5a4a3c, lower: 0xb49478 }, eye: { radius: 0.046 }, tail: { length: 0.74, width: 0.11, cock: 6 }, wing: { reach: 0.36 }, legs: { length: 0.32, color: 0xb08a70 } },
    {
      body: [p(R.all, 0x8a6a48), p(R.under, 0xdcd0bc), p(R.breast, 0xc4b49c), p(R.flank, 0xc2ae90), p(R.throat, 0xe8e0d0), p(R.rump, 0xa0683a), p(R.eyering, 0xd8cdb8)],
      wing: { primary: f(0x80603e), covert: f(0x86663f) },
      tail: f(0xa8632f),
    }),

  bird('chardonneret', 'Chardonneret élégant', 'Carduelis carduelis',
    { length: 0.125, lean: 20, girth: 1.08, head: 1.18, bill: { length: 0.16, radius: 0.046, color: 0xe8dccb }, tail: { length: 0.6, width: 0.1 }, wing: { reach: 0.45 }, legs: { length: 0.22, color: 0xa88672 } },
    {
      body: [
        p(R.all, 0xa67c50),
        p(R.under, WHITE),
        p(R.flank, 0xb88e62),
        p(blob(5.2, 0.3, 0.9, 0.2, 0.2), 0xb88e62),
        p(R.rump, 0xe8e2d4),
        p(R.head, WHITE),
        p({ kind: 'blob', at: [7.4, 1], r: [1.15, 0.5], pow: 3, soft: 0.06 }, BLACK),
        p(band(6.4, 7.0, 0.5, 1, 0.1), BLACK),
        p(band(8.75, 12, 0, 1, 0.06), [0xb0150f, 0xd62218]),
        p(R.lores, BLACK),
      ],
      wing: { primary: { c: [0xf2c80e, 0x14110f], t0: 0.42, tw: 0.06 }, secondary: { c: [0xf2c80e, 0x14110f], t0: 0.5, tw: 0.06 }, covert: (k) => (k > 0.7 ? f(0xe8bd10) : f(0x15120f)) },
      tail: () => tipped(0x15120f, WHITE, 0.82),
    }),

  bird('mesangebleue', 'Mésange bleue', 'Cyanistes caeruleus',
    { length: 0.115, lean: 16, girth: 1.12, head: 1.25, neck: 0.88, bill: { length: 0.085, radius: 0.033, color: 0x23232a }, eye: { radius: 0.04 }, tail: { length: 0.58, width: 0.09 }, wing: { reach: 0.36 }, legs: { length: 0.24, color: 0x4f6274 } },
    {
      body: [
        p(R.all, 0x8a9a4e),
        p(R.under, [0xdcc934, 0xf2de48]),
        p(band(1.5, 4.6, 0, 0.07, 0.3), 0x3c4658),
        p(R.head, WHITE),
        p({ kind: 'blob', at: [8.4, 1], r: [1.25, 0.3], pow: 3, soft: 0.06 }, [0x2c66c4, 0x3f86e6]),
        p(R.eyestripe, 0x1a2540),
        p(band(6.3, 6.85, 0, 1, 0.08), 0x1c2c58),
        p(blob(7.4, 0, 0.9, 0.16), 0x1c2444),
      ],
      wing: { primary: tipped(0x2b4f96, 0x3f6fc0, 0.5), covert: (k) => (k > 0.78 ? tipped(0x2f60b4, WHITE, 0.74) : f(0x3a74cc)) },
      tail: f(0x3466b8),
    }),

  bird('sittelle', 'Sittelle torchepot', 'Sitta europaea',
    { length: 0.14, lean: 30, girth: 1.12, head: 1.12, neck: 0.75, bill: { length: 0.26, radius: 0.042, color: 0x4a5058 }, tail: { length: 0.38, width: 0.1 }, wing: { reach: 0.75 }, legs: { length: 0.2, color: 0x8a6a4e, toe: 0.13 } },
    {
      body: [
        p(R.all, 0x6f8da4),
        p(R.under, [0xd08e4e, 0xe4a766]),
        p(R.flank, 0xa4522c),
        p(R.vent, 0xa4522c, { mix: [WHITE, 0.4] }),
        p(R.throat, WHITE),
        p(R.cheek, WHITE),
        p({ kind: 'streak', from: [10.2, 0.56], to: [6.0, 0.6], r: [0.3, 0.05] }, BLACK),
      ],
      wing: { primary: f(0x4a5560), covert: f(0x6a889e) },
      tail: (k) => (k < 0.25 ? f(0x6a889e) : tipped(0x1c1c1e, WHITE, 0.75)),
    }),

  bird('grimpereau', 'Grimpereau des jardins', 'Certhia brachydactyla',
    { length: 0.125, lean: 26, girth: 0.98, head: 1.08, neck: 0.8, bill: { length: 0.27, radius: 0.024, droop: 0.05, color: 0x5a4a3a, lower: 0xc8b49a }, tail: { length: 0.66, width: 0.085 }, wing: { reach: 0.3 }, legs: { length: 0.18, color: 0x9a7a60, toe: 0.13 } },
    {
      body: [
        p(R.all, 0x6e5a40, { mix: [0xcbbd9c, 0.3] }),
        p(R.rump, 0x9a6c3c),
        p(R.under, 0xeeeae0),
        p(R.flank, 0xd8ccb6),
        p(R.supercilium, 0xe8e2d2),
      ],
      wing: { primary: { c: [0x4a3c2c, 0xcdb780], bars: 2 }, covert: (k) => (k > 0.7 ? tipped(0x4a3c2c, 0xe0d2a8, 0.7) : f(0x6a563c)) },
      tail: f(0x7a5e3e),
    }),

  bird('troglodyte', 'Troglodyte mignon', 'Troglodytes troglodytes',
    { length: 0.095, lean: 20, girth: 1.22, head: 1.18, neck: 0.8, bill: { length: 0.17, radius: 0.028, droop: 0.012, color: 0x5a4636, lower: 0xb09070 }, eye: { radius: 0.038 }, tail: { length: 0.34, width: 0.08, cock: 82 }, wing: { reach: 0.5, size: 0.9 }, legs: { length: 0.26, color: 0x9a7458 } },
    {
      body: [
        p(R.all, [0x5a3f26, 0x8a6238], { bars: 3 }),
        p(R.mantle, 0x86603a),
        p(R.head, 0x86603a),
        p(R.under, [0x9a8060, 0xc8b08c]),
        p(R.flank, [0x5a3f26, 0xb08c5e], { bars: 3 }),
        p(R.vent, [0x4a3420, 0xb89a70], { bars: 3 }),
        p(R.throat, 0xd8ccb4),
        p(R.supercilium, 0xe2d6bc),
      ],
      wing: { primary: { c: [0x3e2c1c, 0xa87c48], bars: 5 }, covert: () => ({ c: [0x4a341f, 0x94693c], bars: 2 }) },
      tail: { c: [0x3e2c1c, 0x9a6e3e], bars: 6 },
    }),

  bird('pouillot', 'Pouillot véloce', 'Phylloscopus collybita',
    { length: 0.11, lean: 22, girth: 1.0, head: 1.15, bill: { length: 0.11, radius: 0.025, color: 0x3a3028 }, eye: { radius: 0.04 }, tail: { length: 0.6, width: 0.09 }, wing: { reach: 0.34 }, legs: { length: 0.24, color: 0x2e2824 } },
    {
      body: [p(R.all, 0x7e7c4a), p(R.under, 0xe2dcc0), p(R.breast, 0xd6cc9c), p(R.flank, 0xcfc394), p(R.supercilium, 0xe4dca8), p(R.eyestripe, 0x55523a), p(R.eyering, 0xe8e2c0)],
      wing: { primary: tipped(0x4e4a34, 0x7c7a48, 0.4), covert: f(0x74723f) },
      tail: f(0x5e5a3c),
    }),

  bird('fauvette', 'Fauvette à tête noire', 'Sylvia atricapilla',
    { length: 0.135, lean: 24, girth: 1.02, head: 1.1, bill: { length: 0.13, radius: 0.03, color: 0x3a3a40 }, tail: { length: 0.66, width: 0.1 }, wing: { reach: 0.38 }, legs: { length: 0.26, color: 0x4a5058 } },
    {
      body: [p(R.all, 0x7c7868), p(R.under, 0xc9c8c2), p(R.vent, 0xe4e2dc), p(R.head, 0xa4a6a6), p(R.nape, 0x9a9c98), p({ kind: 'blob', at: [8.55, 1], r: [1.55, 0.38], pow: 3, soft: 0.05 }, BLACK)],
      wing: { primary: f(0x5c584c), covert: f(0x747062) },
      tail: f(0x565248),
    }),

  bird('grivemusicienne', 'Grive musicienne', 'Turdus philomelos',
    { length: 0.22, lean: 30, girth: 1.08, head: 1.0, bill: { length: 0.21, radius: 0.04, color: 0x4a3c30, lower: 0xc8a878 }, eye: { radius: 0.042 }, tail: { length: 0.72, width: 0.11 }, wing: { reach: 0.4 }, legs: { length: 0.34, color: 0xc49a80 }, tempo: 0.8 },
    {
      body: [
        p(R.all, 0x7e6444),
        p(R.under, WHITE, { mix: [[0xf2efe6, 0x2e2418], 0.5], t0: 0.72, tw: 0.08 }),
        p(R.breast, 0xead9a8, { mix: [[0xead9a8, 0x2e2418], 0.6], t0: 0.7, tw: 0.08 }),
        p(R.flank, 0xdccba0, { mix: [[0xdccba0, 0x2e2418], 0.5], t0: 0.72, tw: 0.08 }),
        p(R.vent, WHITE),
        p(R.throat, 0xf0e8d4),
        p(R.cheek, 0x9a8460, { mix: [0xd8c8a0, 0.4] }),
        p(R.malar, 0x3a2e20),
      ],
      wing: { primary: f(0x705a3e), covert: (k) => (k > 0.75 ? tipped(0x705a3e, 0xd0b070, 0.8) : f(0x7a6244)) },
      tail: f(0x74593a),
    }),

  bird('grivedraine', 'Grive draine', 'Turdus viscivorus',
    { length: 0.27, lean: 26, girth: 1.1, head: 0.95, bill: { length: 0.21, radius: 0.042, color: 0x4a3e34, lower: 0xc0a078 }, eye: { radius: 0.04 }, tail: { length: 0.86, width: 0.12 }, wing: { reach: 0.42 }, legs: { length: 0.36, color: 0xc0a088 }, tempo: 0.75 },
    {
      body: [
        p(R.all, 0x8a8068),
        p(R.under, WHITE, { mix: [[0xf2efe6, 0x26201a], 0.62], t0: 0.66, tw: 0.08 }),
        p(R.breast, 0xe8dcbc, { mix: [[0xe8dcbc, 0x26201a], 0.7], t0: 0.64, tw: 0.08 }),
        p(R.flank, 0xddd0b0, { mix: [[0xddd0b0, 0x26201a], 0.6], t0: 0.66, tw: 0.08 }),
        p(R.throat, 0xf0ead8, { mix: [[0xf0ead8, 0x2a221a], 0.3], t0: 0.7, tw: 0.08 }),
        p(R.cheek, 0xb4a888, { mix: [0x6a5e48, 0.35] }),
        p(R.rump, 0x9a906e),
      ],
      wing: { primary: tipped(0x5e5644, 0xb8ae90, 0.86), covert: (k) => (k > 0.6 ? tipped(0x625a48, 0xd8d0b8, 0.72) : f(0x7c735c)) },
      tail: (k) => (k > 0.75 ? tipped(0x645c4a, WHITE, 0.8) : f(0x645c4a)),
    }),

  bird('etourneau', 'Étourneau sansonnet', 'Sturnus vulgaris',
    { length: 0.21, lean: 28, girth: 1.08, head: 0.98, bill: { length: 0.27, radius: 0.04, color: 0xe8c832 }, tail: { length: 0.5, width: 0.11 }, wing: { reach: 0.72, point: 0.8 }, legs: { length: 0.34, color: 0xb0624e }, tempo: 0.9 },
    {
      body: [
        p(R.all, [0x100e12, 0x1a1a22], { mix: [[0x15131a, 0xd8cfa8], 0.38], t0: 0.82, tw: 0.06, iri: 0x3a7a4a, iriStrength: 0.24 }),
        p(R.head, [0x100e12, 0x1c1826], { mix: [[0x15131a, 0xcfc6a0], 0.25], t0: 0.84, tw: 0.06, iri: 0x6a3aa0, iriStrength: 0.24 }),
        p(R.breast, [0x100e12, 0x1c1826], { mix: [[0x15131a, 0xd8cfa8], 0.3], t0: 0.82, tw: 0.06, iri: 0x6a3aa0, iriStrength: 0.24 }),
      ],
      wing: { primary: { c: [0x1c1a1a, 0x8a7448], t0: 0.9, tw: 0.05 }, covert: () => ({ c: [0x16151a, 0xb89a5c], t0: 0.86, tw: 0.05, iri: 0x3a7a5a, iriStrength: 0.3 }) },
      tail: { c: [0x1a1818, 0x7a6844], t0: 0.92, tw: 0.04 },
    }),

  bird('geai', 'Geai des chênes', 'Garrulus glandarius',
    { length: 0.34, lean: 30, girth: 1.1, head: 1.08, bill: { length: 0.21, radius: 0.058, color: 0x26221f }, eye: { radius: 0.04, iris: 0x9fb4c8 }, tail: { length: 0.92, width: 0.14 }, wing: { reach: 0.3 }, legs: { length: 0.34, color: 0x8a6a56 }, tempo: 0.7 },
    {
      body: [
        p(R.all, 0xb48a78),
        p(R.under, 0xc49c88),
        p(R.rump, WHITE),
        p(R.vent, WHITE),
        p(R.throat, 0xf0ebe2),
        p({ kind: 'blob', at: [8.9, 1], r: [1.3, 0.34], pow: 3, soft: 0.1 }, 0xe8e2d6, { mix: [BLACK, 0.45] }),
        p({ kind: 'streak', from: [9.9, 0.3], to: [7.3, 0.33], r: [0.3, 0.07] }, BLACK),
      ],
      wing: {
        primary: { c: [0x1c1a19, 0x8c8478], t0: 0.3, tw: 0.4 },
        secondary: (k) => (k > 0.7 ? f(0x7a3a26) : { c: [0xf0ece4, 0x151312], t0: 0.42, tw: 0.05 }),
        covert: (k) => (k > 0.62 ? { c: [0x1f6fd0, 0x0c1016], bars: 5 } : f(0xb48a78)),
      },
      tail: f(0x161413),
    }),

  bird('pie', 'Pie bavarde', 'Pica pica',
    { length: 0.46, lean: 30, girth: 1.05, head: 1.0, bill: { length: 0.27, radius: 0.07, color: 0x151312 }, eye: { radius: 0.038 }, tail: { length: 1.75, outer: 0.85, width: 0.15, cock: 6 }, wing: { reach: 0.2 }, legs: { length: 0.38, color: 0x1a1816 }, tempo: 0.65 },
    {
      body: [
        p(R.all, [0x0e0d0e, 0x18171a], { iri: 0x2a4a8a, iriStrength: 0.2 }),
        p(band(-1, 4.3, 0, 0.5, 0.12), WHITE),
        p(R.vent, BLACK),
        p(band(3.4, 5.5, 0.56, 0.8, 0.1), WHITE),
        p(R.rump, 0x8a8a88, { mix: [BLACK, 0.5] }),
      ],
      wing: { primary: { c: [0xf0ede6, 0x121212], t0: 0.8, tw: 0.06 }, secondary: { c: [0x10203a, 0x1a3a6a], iri: 0x2a6ac0, iriStrength: 0.5 }, covert: (k) => (k < 0.35 ? f(WHITE) : { c: [0x0e1420, 0x16263e], iri: 0x2a6ac0, iriStrength: 0.45 }) },
      tail: { c: [0x0c1a16, 0x12281e], iri: 0x2a9a5a, iriStrength: 0.55 },
    }),

  bird('corneille', 'Corneille noire', 'Corvus corone',
    { length: 0.47, lean: 32, girth: 1.08, head: 1.02, bill: { length: 0.36, radius: 0.088, droop: 0.012, color: 0x121110 }, eye: { radius: 0.036 }, tail: { length: 0.8, width: 0.16 }, wing: { reach: 0.7 }, legs: { length: 0.36, color: 0x151413 }, tempo: 0.6 },
    {
      body: [p(R.all, [0x0c0c0e, 0x161619], { iri: 0x2a3a6a, iriStrength: 0.12 })],
      wing: { primary: f(0x121214), covert: () => ({ c: [0x0e0e11, 0x18181c], iri: 0x2a3a6a, iriStrength: 0.14 }) },
      tail: f(0x101012),
    }),

  bird('choucas', 'Choucas des tours', 'Corvus monedula',
    { length: 0.33, lean: 28, girth: 1.1, head: 1.08, bill: { length: 0.21, radius: 0.062, color: 0x141312 }, eye: { radius: 0.04, iris: 0xdfe8f0 }, tail: { length: 0.7, width: 0.14 }, wing: { reach: 0.68 }, legs: { length: 0.34, color: 0x161514 }, tempo: 0.7 },
    {
      body: [
        p(R.all, [0x121214, 0x1e1e22]),
        p(R.under, [0x1a1a1c, 0x2a2a2e]),
        p(band(6.0, 7.6, 0.42, 1, 0.12), 0x9a9ea4),
        p(blob(7.3, 0.55, 0.8, 0.14), 0x84888e),
        p({ kind: 'blob', at: [8.8, 1], r: [1.35, 0.36], pow: 3, soft: 0.06 }, [0x0c0c10, 0x16161c]),
      ],
      wing: { primary: f(0x131316), covert: () => ({ c: [0x101014, 0x1c1c22], iri: 0x3a3a7a, iriStrength: 0.14 }) },
      tail: f(0x111113),
    }),

  bird('picepeiche', 'Pic épeiche', 'Dendrocopos major',
    { length: 0.23, lean: 6, girth: 1.0, head: 1.05, bill: { length: 0.3, radius: 0.046, color: 0x4a4e56 }, eye: { radius: 0.036, iris: 0x5a1c16 }, tail: { length: 0.62, width: 0.1, cock: -14 }, wing: { reach: 0.55 }, legs: { length: 0.2, color: 0x5a5e60, toe: 0.14 }, tempo: 0.8 },
    {
      body: [
        p(R.all, BLACK),
        p(R.under, 0xeae4d2),
        p(R.vent, [0xc01a14, 0xe02a1e]),
        p(band(-1, 2.0, 0, 0.32, 0.1), [0xc01a14, 0xe02a1e]),
        p(band(3.6, 5.6, 0.56, 0.82, 0.08), WHITE),
        p(R.head, 0xeae4d2),
        p({ kind: 'blob', at: [8.6, 1], r: [1.5, 0.3], pow: 3, soft: 0.05 }, BLACK),
        p(R.forehead, 0xe0d4b8),
        p(blob(6.75, 1, 0.5, 0.26, 0.05), [0xc01a14, 0xe02a1e]),
        p({ kind: 'streak', from: [9.8, 0.3], to: [6.2, 0.42], r: [0.3, 0.05] }, BLACK),
        p({ kind: 'streak', from: [6.9, 0.42], to: [6.6, 0.8], r: [0.25, 0.06] }, BLACK),
      ],
      wing: { primary: { c: [0x141210, 0xf0ece0], bars: 5 }, covert: (k) => (k > 0.6 ? { c: [0x141210, 0xf0ece0], bars: 2 } : f(BLACK)) },
      tail: (k) => (k > 0.6 ? { c: [0xf0ece0, 0x141210], bars: 3 } : f(BLACK)),
    }),

  bird('picvert', 'Pic vert', 'Picus viridis',
    { length: 0.32, lean: 10, girth: 1.02, head: 1.05, bill: { length: 0.36, radius: 0.05, color: 0x4e4e4a }, eye: { radius: 0.036, iris: 0xe8e8e0 }, tail: { length: 0.62, width: 0.11, cock: -12 }, wing: { reach: 0.55 }, legs: { length: 0.2, color: 0x6a6e66, toe: 0.14 }, tempo: 0.75 },
    {
      body: [
        p(R.all, 0x6f9230),
        p(R.rump, [0xc8c820, 0xe6e03a]),
        p(R.under, 0xc4cca0),
        p(R.vent, 0xc4cca0, { mix: [0x7a8458, 0.4] }),
        p(R.head, 0xbcc69a),
        p(blob(8.6, 0.56, 1.15, 0.13, 0.05), BLACK),
        p({ kind: 'streak', from: [9.8, 0.3], to: [7.6, 0.32], r: [0.3, 0.05] }, [0xb81810, 0xdc2a1c]),
        p({ kind: 'blob', at: [8.5, 1], r: [1.75, 0.3], pow: 3, soft: 0.05 }, [0xb81810, 0xe02a1c]),
      ],
      wing: { primary: { c: [0x3a3a2a, 0xd8d4b0], bars: 6 }, secondary: f(0x688a30), covert: f(0x6f9230) },
      tail: { c: [0x2a2c20, 0x6a7440], bars: 5 },
    }),

  bird('coucou', 'Coucou gris', 'Cuculus canorus',
    { length: 0.33, lean: 38, girth: 0.94, head: 0.95, bill: { length: 0.18, radius: 0.042, droop: 0.02, color: 0x3a3832, lower: 0xc8b040 }, eye: { radius: 0.036, iris: 0xe8c020 }, tail: { length: 1.3, outer: 0.9, width: 0.14 }, wing: { reach: 0.62, point: 0.9 }, legs: { length: 0.16, color: 0xe0b820 }, tempo: 0.65 },
    {
      body: [
        p(R.all, 0x7e8a96),
        p(R.under, [0xf0eee8, 0x34383e], { bars: 3 }),
        p(R.vent, 0xeeeae0),
        p(R.breast, 0x8a96a2),
        p(R.head, 0x8a96a2),
      ],
      wing: { primary: f(0x5e6872), covert: f(0x77838f) },
      tail: () => tipped(0x33383e, WHITE, 0.9),
    }),

  bird('tourterelle', 'Tourterelle turque', 'Streptopelia decaocto',
    { length: 0.32, lean: 30, girth: 1.1, head: 0.86, neck: 1.1, bill: { length: 0.15, radius: 0.036, color: 0x2a2624 }, eye: { radius: 0.034, iris: 0xa02820 }, tail: { length: 1.0, width: 0.14 }, wing: { reach: 0.45 }, legs: { length: 0.2, color: 0xb04a52 }, tempo: 0.6 },
    {
      body: [
        p(R.all, 0xc0ac98),
        p(R.under, 0xd6c4b6),
        p(R.head, 0xd4c4b8),
        p(R.vent, 0xc8c2bc),
        p(band(6.25, 6.75, 0.5, 1, 0.04), BLACK),
        p(band(6.75, 6.9, 0.5, 1, 0.03), WHITE),
      ],
      wing: { primary: f(0x5a5048), secondary: f(0xa89c92), covert: (k) => (k > 0.7 ? f(0xb4b0ae) : f(0xbca894)) },
      tail: (k) => (k < 0.25 ? f(0xb0a090) : { c: [0x4a4440, 0xf0ece4], t0: 0.55, tw: 0.06 }),
    }),

  bird('ramier', 'Pigeon ramier', 'Columba palumbus',
    { length: 0.41, lean: 30, girth: 1.22, head: 0.8, neck: 1.15, bill: { length: 0.16, radius: 0.04, color: 0xe0a030 }, eye: { radius: 0.032, iris: 0xe8e0a0 }, tail: { length: 0.88, width: 0.16 }, wing: { reach: 0.6 }, legs: { length: 0.2, color: 0xb04a58 }, tempo: 0.55 },
    {
      body: [
        p(R.all, 0x7e8a98),
        p(R.under, 0xa8a4ac),
        p(R.breast, [0xb08a98, 0xc49aa6]),
        p(R.head, 0x7c8ea4),
        p(R.vent, 0xc0c2c8),
        p(band(6.1, 6.9, 0.3, 1, 0.08), [0x3a7a5a, 0x5a8a7a], { iri: 0x8a4ab0, iriStrength: 0.5 }),
        p(blob(6.35, 0.52, 0.5, 0.17, 0.05), WHITE),
      ],
      wing: { primary: tipped(0x3a3e46, 0x8a8e96, 0.9), secondary: f(0x6e7a88), covert: (k) => (k > 0.8 ? f(WHITE) : f(0x7a8694)) },
      tail: { c: [0x8a94a0, 0x1c1e22], t0: 0.72, tw: 0.08 },
    }),

  bird('bruantjaune', 'Bruant jaune', 'Emberiza citrinella',
    { length: 0.165, lean: 22, girth: 1.06, head: 1.1, bill: { length: 0.12, radius: 0.05, color: 0x7a848e }, tail: { length: 0.8, width: 0.1 }, wing: { reach: 0.34 }, legs: { length: 0.26, color: 0xb48a70 } },
    {
      body: [
        p(R.all, 0x9a6a3a, { mix: [0x2e241a, 0.35] }),
        p(R.rump, 0xb0622c),
        p(R.under, [0xe0c628, 0xf4dc3a]),
        p(R.flank, 0xe6cf3c, { mix: [0x8a4a26, 0.4] }),
        p(R.breast, 0xe8cf38, { mix: [0xa8602e, 0.3] }),
        p(R.head, [0xe4cb24, 0xf6e03c]),
        p(R.eyestripe, 0x7a6a30),
        p(blob(7.0, 0.62, 0.5, 0.1), 0x8a7a34),
        p({ kind: 'blob', at: [8.2, 1], r: [0.9, 0.2], soft: 0.3 }, 0xe8d43a, { mix: [0x6a5a2a, 0.35] }),
      ],
      wing: { primary: tipped(0x3a2e22, 0x9a8a40, 0.5), covert: (k) => (k > 0.6 ? tipped(0x2e241a, 0xb07a40, 0.6) : f(0x9a6a3a)) },
      tail: (k) => (k > 0.72 ? tipped(0x3a2e22, WHITE, 0.5) : f(0x4a3a2a)),
    }),

  bird('verdier', "Verdier d'Europe", 'Chloris chloris',
    { length: 0.15, lean: 22, girth: 1.16, head: 1.2, neck: 0.85, bill: { length: 0.15, radius: 0.068, color: 0xe2c4b0 }, tail: { length: 0.6, width: 0.1 }, wing: { reach: 0.44 }, legs: { length: 0.24, color: 0xc49a88 } },
    {
      body: [p(R.all, 0x7a8a3a), p(R.under, [0x9aa83a, 0xb8c648]), p(R.rump, 0xa8b838), p(R.vent, 0xd8d8b8), p(R.cheek, 0x7e8a5e), p(R.lores, 0x3e4230)],
      wing: { primary: { c: [0xe8d020, 0x33342a], t0: 0.35, tw: 0.08 }, secondary: f(0x6e7460), covert: (k) => (k > 0.6 ? f(0x848a80) : f(0x7a8a3a)) },
      tail: (k) => (k > 0.4 ? { c: [0xe8d020, 0x2a2a22], t0: 0.6, tw: 0.06 } : f(0x33342a)),
    }),

  bird('tarin', 'Tarin des aulnes', 'Spinus spinus',
    { length: 0.12, lean: 20, girth: 1.06, head: 1.15, bill: { length: 0.13, radius: 0.04, color: 0xb8a898 }, tail: { length: 0.56, width: 0.09 }, wing: { reach: 0.48 }, legs: { length: 0.2, color: 0x4a3c34 } },
    {
      body: [
        p(R.all, 0x8a9a34, { mix: [0x3a4020, 0.3] }),
        p(R.rump, [0xd8d028, 0xeee43a]),
        p(R.under, [0xd4cc30, 0xecdf40]),
        p(R.belly, WHITE),
        p(R.flank, 0xe4e2c4, { mix: [0x5a5a3c, 0.3] }),
        p(R.head, [0xc8c22c, 0xe2d83a]),
        p(R.cheek, 0x9aa23a),
        p({ kind: 'blob', at: [8.7, 1], r: [1.5, 0.34], pow: 3, soft: 0.05 }, BLACK),
        p(blob(9.3, 0, 0.6, 0.2), BLACK),
      ],
      wing: { primary: { c: [0xe8d820, 0x17150f], t0: 0.3, tw: 0.08 }, covert: (k) => (k > 0.7 ? tipped(0x17150f, 0xe8d820, 0.6) : k > 0.35 ? tipped(0x17150f, 0xd8cc28, 0.75) : f(0x7e8e30)) },
      tail: (k) => (k > 0.3 ? { c: [0xe8d820, 0x17150f], t0: 0.5, tw: 0.06 } : f(0x17150f)),
    }),

  bird('bouvreuil', 'Bouvreuil pivoine', 'Pyrrhula pyrrhula',
    { length: 0.155, lean: 20, girth: 1.24, belly: 1.08, head: 1.2, neck: 0.75, bill: { length: 0.095, radius: 0.066, droop: 0.012, color: 0x1a1818 }, tail: { length: 0.62, width: 0.11 }, wing: { reach: 0.4 }, legs: { length: 0.22, color: 0x4a3a34 } },
    {
      body: [
        p(R.all, 0x8a929c),
        p(R.rump, WHITE),
        p(R.under, [0xd24a50, 0xee6a68]),
        p(R.vent, WHITE),
        p(R.head, [0xd24a50, 0xee6a68]),
        p({ kind: 'blob', at: [9.0, 1], r: [1.75, 0.52], pow: 3, soft: 0.04 }, [0x0c0c10, 0x18181e]),
        p(band(8.9, 12, 0, 1, 0.04), [0x0c0c10, 0x18181e]),
      ],
      wing: { primary: f(0x16161c), covert: (k) => (k > 0.72 ? tipped(0x16161c, 0xe8e6e2, 0.6) : k > 0.4 ? f(0x1a1a20) : f(0x8a929c)) },
      tail: f(0x121218),
    }),

  bird('roitelet', 'Roitelet huppé', 'Regulus regulus',
    { length: 0.09, lean: 16, girth: 1.2, head: 1.3, neck: 0.8, bill: { length: 0.08, radius: 0.022, color: 0x1e1c1a }, eye: { radius: 0.042 }, tail: { length: 0.46, width: 0.08 }, wing: { reach: 0.4, size: 0.92 }, legs: { length: 0.24, color: 0x6a5238 } },
    {
      body: [
        p(R.all, 0x84904a),
        p(R.under, 0xd8d4bc),
        p(R.breast, 0xcdc8a8),
        p(R.head, 0xb4b494),
        p(blob(7.8, 0.53, 0.8, 0.14), 0xcfcbb4),
        p({ kind: 'blob', at: [8.5, 1], r: [1.5, 0.34], pow: 3, soft: 0.04 }, BLACK),
        p({ kind: 'blob', at: [8.4, 1], r: [1.3, 0.17], pow: 3, soft: 0.04 }, [0xf2b010, 0xffd21c]),
      ],
      wing: { primary: tipped(0x33322a, 0x9aa04a, 0.4), secondary: { c: [0x1a1a16, 0x8a9440], t0: 0.3, tw: 0.08 }, covert: (k) => (k > 0.72 ? tipped(0x222220, WHITE, 0.66) : k > 0.45 ? tipped(0x4e5230, 0xe8e6d8, 0.78) : f(0x7c8844)) },
      tail: f(0x4c4e34),
    }),

  bird('accenteur', 'Accenteur mouchet', 'Prunella modularis',
    { length: 0.14, lean: 26, girth: 1.05, head: 1.08, bill: { length: 0.12, radius: 0.027, color: 0x2a2624 }, eye: { iris: 0x7a3a22 }, tail: { length: 0.64, width: 0.1 }, wing: { reach: 0.36 }, legs: { length: 0.26, color: 0xb07a5c } },
    {
      body: [
        p(R.all, 0x8a5e36, { mix: [0x241c14, 0.4] }),
        p(R.under, 0x8c949c),
        p(R.belly, 0xc4c6c6),
        p(R.flank, 0xa88a68, { mix: [0x5a3e26, 0.4] }),
        p(R.head, 0x7e8890),
        p(R.cheek, 0x7a6248),
        p({ kind: 'blob', at: [8.4, 1], r: [1.4, 0.3], pow: 3, soft: 0.15 }, 0x6e6658, { mix: [0x3a3026, 0.35] }),
      ],
      wing: { primary: tipped(0x3a2c20, 0x8a5e36, 0.4), covert: (k) => (k > 0.7 ? tipped(0x2e2218, 0xc4a070, 0.82) : f(0x7a5230)) },
      tail: f(0x4e3e30),
    }),

  bird('bergeronnette', 'Bergeronnette grise', 'Motacilla alba',
    { length: 0.18, lean: 30, girth: 0.96, head: 1.05, bill: { length: 0.13, radius: 0.026, color: 0x161514 }, tail: { length: 1.08, width: 0.09, cock: 4 }, wing: { reach: 0.3 }, legs: { length: 0.4, color: 0x1a1918 } },
    {
      body: [
        p(R.all, 0x9aa0a6),
        p(R.under, WHITE),
        p(R.flank, 0xc8ccd0),
        p(R.head, WHITE),
        p({ kind: 'blob', at: [7.6, 1], r: [1.5, 0.42], pow: 3, soft: 0.04 }, BLACK),
        p({ kind: 'blob', at: [6.6, 0], r: [1.75, 0.34], pow: 2.6, soft: 0.05 }, BLACK),
        p(R.forehead, WHITE),
      ],
      wing: { primary: tipped(0x26262a, 0xd8d8d8, 0.88), secondary: tipped(0x26262a, WHITE, 0.6), covert: (k) => (k > 0.45 ? tipped(0x2a2a2e, WHITE, 0.55) : f(0x8e949a)) },
      tail: (k) => (k > 0.7 ? f(WHITE) : f(0x161616)),
    }),

  bird('hirondelle', 'Hirondelle rustique', 'Hirundo rustica',
    { length: 0.18, lean: 34, girth: 0.92, head: 1.05, neck: 0.8, bill: { length: 0.07, radius: 0.036, color: 0x161516 }, tail: { length: 0.5, outer: 1.35, width: 0.075, fan: 12 }, wing: { reach: 0.92, size: 1.25, point: 1 }, legs: { length: 0.12, color: 0x1a1818, toe: 0.08 } },
    {
      body: [
        p(R.all, [0x101a3c, 0x1c2c5c], { iri: 0x2a4ac0, iriStrength: 0.5 }),
        p(R.under, 0xf0e6d4),
        p(band(5.0, 6.5, 0, 0.5, 0.06), [0x101a3c, 0x1a2852], { iri: 0x2a4ac0, iriStrength: 0.4 }),
        p(band(6.5, 12, 0, 0.42, 0.06), [0x9a3018, 0xb84422]),
        p(R.forehead, [0x9a3018, 0xb84422]),
      ],
      wing: { primary: f(0x15171f), covert: () => ({ c: [0x101a3c, 0x1a2a58], iri: 0x2a4ac0, iriStrength: 0.4 }) },
      tail: f(0x14161e),
    }),

  bird('huppe', 'Huppe fasciée', 'Upupa epops',
    { length: 0.27, lean: 26, girth: 1.0, head: 1.02, bill: { length: 0.56, radius: 0.034, droop: 0.07, color: 0x3a342e }, eye: { radius: 0.034 }, tail: { length: 0.74, width: 0.13 }, wing: { reach: 0.5, size: 1.1 }, legs: { length: 0.22, color: 0x5a5450 }, tempo: 0.75,
      crest: { length: 0.5, count: 30, base: 0xe0a070, tip: 0x15120f } },
    {
      body: [
        p(R.all, [0xd09468, 0xe2a878]),
        p(R.belly, 0xf0e8dc),
        p(R.vent, WHITE),
        p(band(1.2, 4.0, 0.55, 1, 0.06), [0x15120f, 0xf0ebe0], { bars: 2 }),
        p(R.rump, WHITE),
      ],
      wing: { primary: { c: [0x15120f, 0xf2eee4], bars: 2 }, secondary: { c: [0x15120f, 0xf2eee4], bars: 4 }, covert: (k) => (k > 0.3 ? { c: [0x15120f, 0xf0e2c0], bars: 2 } : f(0xd89c70)) },
      tail: { c: [0xf2eee4, 0x15120f], bars: 1 },
    }),

  bird('loriot', "Loriot d'Europe", 'Oriolus oriolus',
    { length: 0.24, lean: 30, girth: 1.04, head: 1.0, bill: { length: 0.25, radius: 0.048, droop: 0.008, color: 0xc0504a }, eye: { radius: 0.038, iris: 0x8a1c18 }, tail: { length: 0.74, width: 0.12 }, wing: { reach: 0.6 }, legs: { length: 0.24, color: 0x4a5058 }, tempo: 0.8 },
    {
      body: [p(R.all, [0xe8b800, 0xffd61a]), p(R.lores, BLACK)],
      wing: { primary: tipped(0x15130f, 0xe8d8a0, 0.93), covert: (k) => (k > 0.85 ? tipped(0x15130f, 0xf5cc10, 0.6) : k > 0.3 ? f(0x15130f) : f(0xf5cc10)) },
      tail: (k) => (k < 0.2 ? f(0x15130f) : { c: [0x15130f, 0xf5cc10], t0: 0.55 - 0.2 * k, tw: 0.06 }),
    }),

  bird('crecerelle', 'Faucon crécerelle', 'Falco tinnunculus',
    { length: 0.34, lean: 8, girth: 1.0, back: 1.05, head: 1.0, neck: 0.85, bill: { length: 0.115, radius: 0.044, droop: 0.034, color: 0x4a525c }, eye: { radius: 0.042, iris: 0x1a120c }, tail: { length: 1.02, width: 0.13, cock: -10 }, wing: { reach: 0.8, point: 1 }, legs: { length: 0.24, color: 0xe8c020, toe: 0.13, thick: 1.3 }, tempo: 0.6 },
    {
      body: [
        p(R.all, 0xb4622c, { mix: [[0xb4622c, 0x1a1410], 0.5], t0: 0.74, tw: 0.08 }),
        p(R.rump, 0x8a98a8),
        p(R.under, 0xe8d4a8, { mix: [[0xe8d4a8, 0x2a2018], 0.5], t0: 0.6, tw: 0.1 }),
        p(R.vent, 0xf0e2c4),
        p(R.head, 0x8a98a8, { mix: [0x5a6672, 0.3] }),
        p(R.throat, 0xf0e6cc),
        p({ kind: 'streak', from: [9.4, 0.38], to: [7.9, 0.3], r: [0.26, 0.05] }, 0x2a2622),
        p(blob(9.8, 0.5, 0.35, 0.3), 0xe8c020),
      ],
      wing: { primary: { c: [0x2a2420, 0x3a322a] }, secondary: { c: [0xa85c2a, 0x1a1410], bars: 3 }, covert: () => ({ c: [0xb4622c, 0x1a1410], t0: 0.76, tw: 0.08 }) },
      tail: { c: [0x8a98a8, 0x17140f], t0: 0.8, tw: 0.04 },
    }),

  bird('buse', 'Buse variable', 'Buteo buteo',
    { length: 0.54, lean: 8, girth: 1.16, back: 1.05, head: 0.95, neck: 0.85, bill: { length: 0.14, radius: 0.05, droop: 0.042, color: 0x2a2a2c }, eye: { radius: 0.04, iris: 0x4a3018 }, tail: { length: 0.72, width: 0.16, cock: -10 }, wing: { reach: 0.92, size: 1.1 }, legs: { length: 0.22, color: 0xe2bc24, toe: 0.14, thick: 1.5 }, tempo: 0.5 },
    {
      body: [
        p(R.all, 0x5a4230, { mix: [0x8a6c4a, 0.3] }),
        p(R.under, [0xe8dcc4, 0x5a4230], { bars: 2 }),
        p(R.breast, 0x5e4632, { mix: [0xd8c8a8, 0.3] }),
        p(band(3.6, 4.6, 0, 0.42, 0.2), 0xe8dcc4, { mix: [0x6a5038, 0.3] }),
        p(R.head, 0x6a523a, { mix: [0xc4b08c, 0.25] }),
        p(R.throat, 0xc8b898, { mix: [0x5a4230, 0.4] }),
        p(blob(9.8, 0.5, 0.35, 0.3), 0xe2bc24),
      ],
      wing: { primary: { c: [0x4a3828, 0x1e1812], t0: 0.6, tw: 0.2 }, secondary: { c: [0x3a2c20, 0x6a543c], bars: 4 }, covert: () => ({ c: [0x4e3a28, 0x7a6042], t0: 0.7, tw: 0.2 }) },
      tail: { c: [0x4a3828, 0xb09a78], bars: 7 },
    }),
];
