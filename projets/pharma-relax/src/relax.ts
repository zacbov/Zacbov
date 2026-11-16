// The perch for PharmaRelax: one branch, and whichever bird Xeno-canto is playing flies in,
// lands, lives there, sings along with its own recording and leaves.
import * as THREE from 'three';
import { createBird, type BirdHandle } from './bird';
import { createBranch, GRIP_X, perchFrames } from './env/branch';
import { createSway } from './env/sway';
import type { HopLayer } from './bird/motion/hop';
import type { FleeLayer } from './bird/motion/flee';
import { BIRDS } from './bird/birds';
import { makeSpecies, modelLength, type BirdDesc } from './bird/generic';

export { BIRDS };

export interface PerchOptions {
  /** the light build (Quest, phones): bigger and fewer feathers, no fuzz */
  lite?: boolean;
  query?: URLSearchParams;
  /** strength of the perch's own fill light from below (default 0.55; 0 = none) */
  fill?: number;
}

/** radius of the perch in model units: what every bird's toes are built round */
const PERCH_R = 0.07;
const RANGE: [number, number] = [GRIP_X - 0.4, GRIP_X + 0.4];
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[^a-z]/g, '');

export function findBird(name: string): BirdDesc | null {
  const n = norm(name);
  return BIRDS.find((b) => b.id === name || norm(b.scientific) === n || norm(b.common) === n) ?? null;
}

export async function createPerch(opts: PerchOptions = {}) {
  /** the host places and turns this: its origin is where the bird's feet are, +Z is the way the bird faces */
  const group = new THREE.Group();
  group.name = 'perchoir';
  const scaled = new THREE.Group();
  group.add(scaled);
  // light from below and in front: a white belly in the shade of its own bird stays white
  const fill = new THREE.DirectionalLight(0xfff6e8, opts.fill ?? 0.55);
  fill.position.set(0.2, -1, 0.9);
  group.add(fill, fill.target);
  const sway = createSway();
  const branch: THREE.Object3D = createBranch(PERCH_R, true).group;
  scaled.add(branch);
  sway.use(branch);
  const rider = new THREE.Group();
  scaled.add(rider);
  const frames = perchFrames(branch, RANGE);

  let bird: BirdHandle | null = null;
  let desc: BirdDesc | null = null;
  let scale = 0.08;
  let scaleTo = 0.08;
  let ride = 0;
  const at = new THREE.Vector3();
  const setScale = (s: number) => {
    scale = s;
    scaled.scale.setScalar(s);
    scaled.position.set(-GRIP_X * s, 0, 0);
  };
  setScale(scale);

  function dispose() {
    if (!bird) return;
    rider.remove(bird.root);
    bird.dispose();
    bird = null;
  }

  const perch = {
    group,
    get bird() {
      return bird;
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
      return !!bird && bird.perched && !bird.away;
    },
    get away() {
      return !bird || bird.away;
    },
    has: (name: string) => !!findBird(name),
    /**
     * Build this bird, out of sight, and resize the branch for it. Heavy (it makes every
     * feather): call it while nothing is on the perch. Returns false for a bird it does not know.
     */
    prepare(name: string) {
      const d = findBird(name);
      if (!d) return false;
      dispose();
      desc = d;
      const sp = makeSpecies(d, { lite: opts.lite });
      scaleTo = d.length / modelLength(sp);
      bird = createBird({ species: sp });
      bird.root.position.x = GRIP_X;
      bird.layer<HopLayer>('hop').home = GRIP_X;
      const flee = bird.layer<FleeLayer>('flee');
      flee.tame = true;
      flee.pace = 1.5 + d.length * 5.5;
      if (opts.lite) for (const m of [bird.feathers.contour, bird.feathers.flight]) m.castShadow = false;
      rider.add(bird.root);
      group.updateMatrixWorld(true);
      bird.setPerch(frames, RANGE);
      bird.mind.on('perch', (e) => {
        sway.push(e.x, e.push, e.side);
        sway.load(e.on ? e.x : null);
      });
      if (opts.query?.has('quiet')) bird.mind.quiet = true;
      if (opts.query?.has('stay')) {
        setScale(scaleTo);
        sway.load(GRIP_X);
        sway.settle();
      } else bird.beginAway();
      return true;
    },
    /** Fly in and land. */
    arrive: () => bird?.arrive() ?? false,
    /** Take off and stay away. */
    leave: () => bird?.leave() ?? false,
    /** prepare + arrive */
    show(name: string) {
      return perch.prepare(name) && (opts.query?.has('stay') || perch.arrive());
    },
    /** loudness of the recording, 0…1, every frame */
    setVoice(v: number) {
      if (bird) bird.voice = v;
    },
    /** something to look at now and then (the visitor's head), world space */
    setAttention(p: THREE.Vector3 | null) {
      bird?.setAttention(p);
    },
    startle() {
      bird?.startle(0.6);
    },
    headPosition(out: THREE.Vector3) {
      return bird ? bird.headPosition(out) : group.getWorldPosition(out);
    },
    update(dt: number) {
      // the branch takes the next bird's size while nobody is on it
      if (scale !== scaleTo && (!bird || bird.away)) {
        const k = 1 - Math.exp(-dt * 5);
        setScale(Math.abs(scaleTo - scale) < scaleTo * 0.004 ? scaleTo : scale + (scaleTo - scale) * k);
      }
      sway.update(dt);
      if (!bird) return;
      ride += ((bird.perched ? 1 : 0) - ride) * (1 - Math.exp(-25 * dt));
      sway.at(bird.root.position.x, at);
      rider.position.copy(at).multiplyScalar(ride);
      bird.update(dt);
    },
    dispose,
  };
  return perch;
}
