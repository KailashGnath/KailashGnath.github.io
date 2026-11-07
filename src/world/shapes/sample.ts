/**
 * Point samplers. Every shape becomes `n` points packed as [x, y, z, w]:
 * w is emphasis — 0 body, 0.5 outline, 1 accent (drawn warm).
 * An optional second quad animates parts of a shape: [motion, param, pivotX, pivotY].
 */

export type Pt = [number, number, number, number, number?, number?, number?, number?];

/** Per-part animation, run on the GPU. */
export const Motion = {
  None: 0,
  Bob: 1, // drift in z: param = phase (amplitude is global)
  Wag: 2, // swing about the pivot: param = amplitude (radians)
  Spin: 3, // rotate about the pivot: param = speed (rad/s)
  Orbit: 4, // rotate about the local y axis: param = speed (rad/s)
  Blink: 5, // emphasis pulses on and off
} as const;

export interface MotionSpec {
  type: number;
  param?: number;
  /** Pivot in the same coordinates as the points (board units for layers). */
  pivot?: [number, number];
}
export type Rand = () => number;

/** Small seeded PRNG so shapes look the same on every visit. */
export function rng(seed: number): Rand {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 1_000_000) / 1_000_000;
  };
}

// --- 2D raster sampling ------------------------------------------------------

/** A drawing on a 100×100 board (y down). Use `ctx` like a normal canvas. */
export type Draw = (ctx: CanvasRenderingContext2D) => void;

export interface Layer {
  draw: Draw;
  /** Share of this layer's points (relative to the other layers). */
  weight: number;
  /** 0 body, 0.5 outline, 1 accent. Outline pixels get max(emphasis, 0.5). */
  emphasis?: number;
  /** Fraction of points pulled onto the outline. */
  edge?: number;
  /** Extrusion depth in board units. */
  depth?: number;
  /** Extra z offset in board units (to layer things in front/behind). */
  z?: number;
  motion?: MotionSpec;
}

const RES = 2.4; // raster pixels per board unit (100 units → 240px)

interface Raster {
  fill: number[]; // flat [x, y, x, y…] in board units
  edge: number[];
}

let canvas: HTMLCanvasElement | null = null;
function ctx2d(w: number, h: number) {
  canvas ??= document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const c = canvas.getContext('2d', { willReadFrequently: true })!;
  c.clearRect(0, 0, w, h);
  return c;
}

function rasterize(draw: Draw, boardW = 100, boardH = 100): Raster {
  const w = Math.ceil(boardW * RES);
  const h = Math.ceil(boardH * RES);
  const c = ctx2d(w, h);
  c.save();
  c.scale(RES, RES);
  c.fillStyle = '#fff';
  c.strokeStyle = '#fff';
  c.lineCap = 'round';
  c.lineJoin = 'round';
  draw(c);
  c.restore();
  const data = c.getImageData(0, 0, w, h).data;
  const on = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && data[(y * w + x) * 4 + 3] > 110;
  const fill: number[] = [];
  const edge: number[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!on(x, y)) continue;
      const bx = x / RES;
      const by = y / RES;
      fill.push(bx, by);
      if (!on(x - 1, y) || !on(x + 1, y) || !on(x, y - 1) || !on(x, y + 1)) edge.push(bx, by);
    }
  }
  return { fill, edge };
}

function pick(arr: number[], r: Rand): [number, number] {
  const k = ((r() * (arr.length / 2)) | 0) * 2;
  return [arr[k] + r() / RES, arr[k + 1] + r() / RES];
}

/** Sample stacked 2D layers into points. Board units; normalised later. */
export function sampleLayers(layers: Layer[], n: number, r: Rand, board: [number, number] = [100, 100]): Pt[] {
  const total = layers.reduce((s, l) => s + l.weight, 0);
  const out: Pt[] = [];
  layers.forEach((l, li) => {
    const count = li === layers.length - 1 ? n - out.length : Math.round((n * l.weight) / total);
    const ras = rasterize(l.draw, board[0], board[1]);
    if (!ras.fill.length) return;
    const edgeShare = l.edge ?? 0.35;
    const depth = l.depth ?? 4;
    const em = l.emphasis ?? 0;
    for (let i = 0; i < count; i++) {
      const onEdge = ras.edge.length > 0 && r() < edgeShare;
      const [x, y] = pick(onEdge ? ras.edge : ras.fill, r);
      // Edges sit on the front/back faces; the body fills the volume.
      const z = (onEdge ? (r() < 0.5 ? -0.5 : 0.5) : r() - 0.5) * depth + (l.z ?? 0);
      const m = l.motion;
      out.push(m ? [x, y, z, onEdge ? Math.max(em, 0.5) : em, m.type, m.param ?? 0, m.pivot?.[0] ?? 0, m.pivot?.[1] ?? 0] : [x, y, z, onEdge ? Math.max(em, 0.5) : em]);
    }
  });
  return out;
}

// --- 3D parametric helpers ---------------------------------------------------

export const TAU = Math.PI * 2;

export function onSphere(r: Rand, radius: number, c: [number, number, number] = [0, 0, 0]): [number, number, number] {
  const u = r() * 2 - 1;
  const th = r() * TAU;
  const s = Math.sqrt(1 - u * u);
  return [c[0] + Math.cos(th) * s * radius, c[1] + u * radius, c[2] + Math.sin(th) * s * radius];
}

export function inSphere(r: Rand, radius: number, c: [number, number, number] = [0, 0, 0]): [number, number, number] {
  const p = onSphere(r, radius * Math.cbrt(r()), [0, 0, 0]);
  return [c[0] + p[0], c[1] + p[1], c[2] + p[2]];
}

export function lerp3(a: number[], b: number[], t: number): [number, number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

// --- Finishing ---------------------------------------------------------------

export interface Shape {
  data: Float32Array; // n * 4
  aux: Float32Array; // n * 4: motion, param, pivotX, pivotY (pivot in shape space)
  /** Shape-space units per raw unit (for scaling amplitudes). */
  scale: number;
  /** Maps board/raw coordinates to the normalised shape space. */
  map: (x: number, y: number, z?: number) => [number, number, number];
}

/**
 * Centre, fit to `size` (largest of width/height), optionally flip y,
 * shuffle so morphs swarm instead of sliding, and pack.
 */
export function finish(pts: Pt[], n: number, r: Rand, opts: { size?: number; flipY?: boolean } = {}): Shape {
  const size = opts.size ?? 3.8;
  const flip = opts.flipY ?? false;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of pts) {
    if (p[0] < minX) minX = p[0];
    if (p[0] > maxX) maxX = p[0];
    if (p[1] < minY) minY = p[1];
    if (p[1] > maxY) maxY = p[1];
  }
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const s = size / Math.max(maxX - minX, maxY - minY, 1e-6);
  const map = (x: number, y: number, z = 0): [number, number, number] => [(x - cx) * s, (y - cy) * s * (flip ? -1 : 1), z * s];

  // Pad or trim to exactly n.
  while (pts.length < n) pts.push(pts[(r() * pts.length) | 0].slice() as Pt);
  pts.length = n;
  for (let i = n - 1; i > 0; i--) {
    const j = (r() * (i + 1)) | 0;
    [pts[i], pts[j]] = [pts[j], pts[i]];
  }

  const data = new Float32Array(n * 4);
  const aux = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const m = map(p[0], p[1], p[2]);
    data[i * 4] = m[0];
    data[i * 4 + 1] = m[1];
    data[i * 4 + 2] = m[2];
    data[i * 4 + 3] = p[3];
    if (p[4]) {
      const pv = map(p[6] ?? 0, p[7] ?? 0);
      aux[i * 4] = p[4];
      aux[i * 4 + 1] = p[5] ?? 0;
      aux[i * 4 + 2] = pv[0];
      aux[i * 4 + 3] = pv[1];
    }
  }
  return { data, aux, map, scale: s };
}
