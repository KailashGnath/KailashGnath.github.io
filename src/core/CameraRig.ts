import * as THREE from 'three';
import type { ScrollFrame } from './Scroll';

/**
 * The journey. Every section is a station along −z; scrolling flies the camera
 * forward from one to the next (and back again when you scroll up). The swarm
 * rides a point just ahead of the camera, framed beside the text.
 */
export interface Shot {
  anchorZ: number; // where the swarm rides (world z)
  dist: number; // camera distance behind the anchor
  scale: number;
  opacity: number;
  frameX: number; // horizontal view offset as a fraction of width (negative = subject sits right)
  frameY: number;
}

/** Holds on each integer, eases quickly between them: 0 → 1 → 2 … */
export function stair(x: number) {
  const k = Math.floor(x);
  const f = x - k;
  return k + smoothstep(0.32, 0.68, f);
}

export function smoothstep(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Maps 0..1 inside a chamber to a 0..(steps-1) value with plateaus at both ends. */
export function chamberStep(inner: number, steps: number) {
  const span = steps - 1;
  return Math.min(span, Math.max(0, inner * (span + 0.6) - 0.15));
}

export const STATION_GAP = 26;
const ORDER = ['hero', 'evolution', 'experiments', 'toolkit', 'about', 'credentials', 'evolving', 'contact'];
export const stationZ = (id: string) => -Math.max(0, ORDER.indexOf(id)) * STATION_GAP;
export const JOURNEY_END = stationZ('contact');
export const CONSTELLATION_CENTER = new THREE.Vector3(0, 0.3, stationZ('toolkit') - 6);

type ShotFn = (inner: number, portrait: boolean) => Shot;

// Desktop: text on the left, swarm on the right. Portrait: swarm on top, text below.
const side = (id: string, inner: number, p: boolean, x = -0.2, creep = 3): Shot => ({
  anchorZ: stationZ(id) - inner * creep,
  dist: p ? 10.4 : 7.8,
  scale: p ? 0.76 : 1,
  opacity: 1,
  frameX: p ? 0 : x,
  frameY: p ? 0.29 : 0,
});

const SHOTS: Record<string, ShotFn> = {
  hero: (i, p) => ({ ...side('hero', i, p, -0.21, 0), frameY: p ? 0.24 : -0.02 }),
  evolution: (i, p) => side('evolution', i, p),
  experiments: (i, p) => side('experiments', i, p),
  // The constellation sits behind the swarm here, so the swarm steps back a little.
  toolkit: (i, p) => ({ ...side('toolkit', i, p, -0.17, 2), scale: p ? 0.6 : 0.72 }),
  about: (i, p) => side('about', i, p),
  // A centred panel: the swarm becomes a faint backdrop.
  credentials: (i, p) => ({ ...side('credentials', i, p, 0, 0), dist: p ? 12 : 9.5, scale: 1.25, opacity: 0.22, frameX: 0, frameY: p ? 0.1 : 0 }),
  evolving: (i, p) => side('evolving', i, p, -0.2, 0),
  contact: (i, p) => side('contact', i, p, -0.22, 0),
};

/** The intro: the name, centred and big, at the first station. */
export const INTRO_SHOT = (portrait: boolean): Shot => ({ anchorZ: 0, dist: portrait ? 13 : 7.8, scale: 1, opacity: 1, frameX: 0, frameY: 0 });

function lerpShot(a: Shot, b: Shot, t: number, out: Shot) {
  out.anchorZ = a.anchorZ + (b.anchorZ - a.anchorZ) * t;
  out.dist = a.dist + (b.dist - a.dist) * t;
  out.scale = a.scale + (b.scale - a.scale) * t;
  out.opacity = a.opacity + (b.opacity - a.opacity) * t;
  out.frameX = a.frameX + (b.frameX - a.frameX) * t;
  out.frameY = a.frameY + (b.frameY - a.frameY) * t;
  return out;
}

const blankShot = (): Shot => ({ anchorZ: 0, dist: 7.8, scale: 1, opacity: 0, frameX: 0, frameY: 0 });

export class CameraRig {
  target = blankShot();
  current = blankShot();
  /** When set, overrides the scroll-driven shot (used by the intro). */
  override: Shot | null = null;
  /** World-space point the swarm rides at, and its velocity (units/s). */
  readonly anchor = new THREE.Vector3();
  readonly anchorVel = new THREE.Vector3();
  /** 0..1 — how fast we're travelling right now. */
  speed = 0;
  private first = true;
  private parallax = new THREE.Vector2();
  private look = new THREE.Vector3();
  private crane = 0;

  constructor(
    private camera: THREE.PerspectiveCamera,
    private ids: string[],
    private reduced: boolean,
  ) {}

  /** Compute where the camera wants to be for this scroll position. */
  resolve(frame: ScrollFrame, portrait: boolean) {
    this.crane = 0;
    if (this.override) return lerpShot(this.override, this.override, 0, this.target);
    const i = frame.index;
    const a = SHOTS[this.ids[i]]?.(frame.inner, portrait) ?? side(this.ids[i], frame.inner, portrait);
    if (frame.t > 0 && i < this.ids.length - 1) {
      const b = SHOTS[this.ids[i + 1]]?.(0, portrait) ?? side(this.ids[i + 1], 0, portrait);
      let t = easeInOut(frame.t);
      if (this.reduced) t = frame.t < 0.5 ? 0 : 1; // cut instead of travel
      lerpShot(a, b, t, this.target);
      if (!this.reduced) this.crane = Math.sin(Math.PI * frame.t) * 0.6;
    } else {
      lerpShot(a, a, 0, this.target);
    }
    return this.target;
  }

  update(dt: number, pointer: THREE.Vector2, time: number) {
    const k = this.first ? 1 : 1 - Math.exp(-dt * (this.reduced ? 20 : 3.2));
    const c = this.current;
    const t = this.target;
    const prevZ = c.anchorZ;
    c.anchorZ += (t.anchorZ - c.anchorZ) * k;
    c.dist += (t.dist - c.dist) * k;
    c.scale += (t.scale - c.scale) * k;
    c.opacity += (t.opacity - c.opacity) * k;
    c.frameX += (t.frameX - c.frameX) * k;
    c.frameY += (t.frameY - c.frameY) * k;

    const vz = this.first || dt <= 0 ? 0 : (c.anchorZ - prevZ) / dt;
    this.first = false;
    this.anchor.set(0, 0, c.anchorZ);
    this.anchorVel.set(0, 0, vz);
    const s = Math.min(1, Math.abs(vz) / 30);
    this.speed += (s - this.speed) * (1 - Math.exp(-dt * 6));

    const pk = 1 - Math.exp(-dt * 2.5);
    const amt = this.reduced ? 0 : 1;
    this.parallax.x += (pointer.x * amt - this.parallax.x) * pk;
    this.parallax.y += (pointer.y * amt - this.parallax.y) * pk;

    const drift = this.reduced ? 0 : 1;
    this.camera.position.set(
      this.parallax.x * 0.45 + Math.sin(time * 0.11) * 0.15 * drift,
      this.parallax.y * 0.3 + Math.cos(time * 0.09) * 0.1 * drift + this.crane,
      c.anchorZ + c.dist,
    );
    this.look.set(0, 0, c.anchorZ);
    this.camera.lookAt(this.look);
    this.applyFrame();
  }

  applyFrame() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.setViewOffset(w, h, this.current.frameX * w, this.current.frameY * h, w, h);
  }
}
