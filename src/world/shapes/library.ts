import { sampleLayers, finish, rng, onSphere, inSphere, lerp3, TAU, Motion, type Layer, type Pt, type Rand, type Shape } from './sample';

/**
 * Every shape the swarm can become. Each one is about what's on screen:
 * 2D silhouettes are drawn on a 100×100 board (y down) and given depth;
 * true 3D forms are built parametrically.
 */

export interface ShapeNote {
  /** Anchor in the shape's raw (flat) space — see `b()` for board coords. */
  at: [number, number, number?];
  text: string;
}

export interface ShapeDef {
  build: (n: number, r: Rand) => Pt[];
  size?: number;
  /** How much the shape is allowed to turn (radians of sway). 3D forms turn more. */
  sway?: number;
  /** Base turn (radians) so 3D forms show their depth. */
  yaw?: number;
  notes?: ShapeNote[];
}

// --- Board helpers -----------------------------------------------------------

/** Board (100×100, y down) → flat space (centred, y up, ~4 units wide). */
const b = (x: number, y: number, z = 0): [number, number, number] => [(x - 50) / 25, -(y - 50) / 25, z / 25];

function flat(layers: Layer[], n: number, r: Rand, board: [number, number] = [100, 100]): Pt[] {
  return sampleLayers(layers, n, r, board).map((p) => {
    const [x, y, z] = b(p[0], p[1], p[2]);
    if (!p[4]) return [x, y, z, p[3]];
    const [px, py] = b(p[6] ?? 0, p[7] ?? 0);
    return [x, y, z, p[3], p[4], p[5], px, py];
  });
}

/** Rounded rectangle path (manual, so it works where ctx.roundRect doesn't: Safari < 16, Chrome < 99). */
function rr(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, rad: number) {
  const r = Math.min(rad, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

function circle(c: CanvasRenderingContext2D, x: number, y: number, rad: number) {
  c.beginPath();
  c.arc(x, y, rad, 0, TAU);
}

function stroke(c: CanvasRenderingContext2D, d: string, width: number, dash?: number[]) {
  c.lineWidth = width;
  c.setLineDash(dash ?? []);
  c.stroke(new Path2D(d));
  c.setLineDash([]);
}

function phoneFrame(c: CanvasRenderingContext2D, x = 30, y = 8, w = 40, h = 84) {
  c.lineWidth = 2.4;
  rr(c, x, y, w, h, w * 0.2);
  c.stroke();
}

// --- Parametric pieces ---------------------------------------------------------

/** A disk (cylinder) along the x axis — plates, dumbbell heads. */
function plate(r: Rand, x: number, radius: number, thick: number, edgeShare = 0.45): Pt {
  const th = r() * TAU;
  const onRim = r() < edgeShare;
  const rad = onRim ? radius : radius * Math.sqrt(r());
  const face = r() < 0.5 ? -0.5 : 0.5;
  const dx = onRim ? (r() - 0.5) * thick : face * thick;
  return [x + dx, Math.cos(th) * rad, Math.sin(th) * rad, onRim ? 0.5 : 0.1];
}

/** A rod along the x axis. */
function rod(r: Rand, x0: number, x1: number, radius: number, em = 0.2): Pt {
  const th = r() * TAU;
  return [x0 + (x1 - x0) * r(), Math.cos(th) * radius, Math.sin(th) * radius, em];
}

function segment(r: Rand, a: number[], c: number[], jitter = 0.02, em = 0.5): Pt {
  const p = lerp3(a, c, r());
  return [p[0] + (r() - 0.5) * jitter, p[1] + (r() - 0.5) * jitter, p[2] + (r() - 0.5) * jitter, em];
}

function rotY(p: Pt, a: number): Pt {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c, p[3]];
}

function rotX(p: Pt, a: number): Pt {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c, p[3]];
}

/** Cylinder stack — a database. */
function dbStack(n: number, r: Rand, layers = 3): Pt[] {
  const out: Pt[] = [];
  const R = 1.25;
  const h = 0.62;
  const gap = 0.16;
  const top = ((layers - 1) * (h + gap)) / 2;
  for (let i = 0; i < n; i++) {
    const k = (r() * layers) | 0;
    const cy = top - k * (h + gap);
    const th = r() * TAU;
    const t = r();
    let p: Pt;
    if (t < 0.32) p = [Math.cos(th) * R, cy + h / 2, Math.sin(th) * R, 0.5]; // top rim
    else if (t < 0.5) p = [Math.cos(th) * R, cy - h / 2, Math.sin(th) * R, 0.5]; // bottom rim
    else if (t < 0.85) p = [Math.cos(th) * R, cy + (r() - 0.5) * h, Math.sin(th) * R, 0.08]; // wall
    else {
      // lid (only the top one is solid)
      const rad = R * Math.sqrt(r());
      p = [Math.cos(th) * rad, cy + h / 2, Math.sin(th) * rad, k === 0 ? 0.15 : 0.04];
    }
    // A status light on each disk.
    if (r() < 0.02) p = [R * 0.72 + (r() - 0.5) * 0.06, cy + (r() - 0.5) * 0.08, R * 0.7, 1];
    out.push(p);
  }
  return out;
}

// --- The library -----------------------------------------------------------------


export const SHAPES: Record<string, ShapeDef> = {
  // Intro: the name, in particles.
  name: {
    size: 5.6,
    sway: 0.05,
    build: (n, r) =>
      flat(
        [
          {
            weight: 1,
            edge: 0.4,
            depth: 6,
            draw: (c) => {
              c.font = '500 96px "Geist Sans", ui-sans-serif, system-ui, sans-serif';
              (c as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = '4px';
              c.textBaseline = 'middle';
              c.textAlign = 'center';
              c.fillText('KAILASH', 230, 56);
            },
          },
        ],
        n,
        r,
        [460, 112],
      ),
  },

  // Hero: an exploded phone — its layers float apart and back, two orbits around it.
  phone: {
    size: 4.3,
    sway: 0.38,
    yaw: -0.55,
    notes: [{ at: b(70, 14, 0), text: 'one codebase → iOS + Android' }],
    build: (n, r) => {
      const bob = (k: number) => ({ type: Motion.Bob, param: k });
      const layers: Layer[] = [
        // Back plate + camera bump.
        { weight: 0.1, edge: 0.55, depth: 1, z: -22, emphasis: 0.05, motion: bob(-2), draw: (c) => (rr(c, 30, 8, 40, 84, 8), c.fill()) },
        {
          weight: 0.03,
          edge: 0.5,
          depth: 1,
          z: -23,
          emphasis: 1,
          motion: bob(-2),
          draw: (c) => {
            rr(c, 52, 12, 14, 14, 4);
            c.lineWidth = 1.6;
            c.stroke();
            circle(c, 56.5, 16.5, 2.2);
            c.fill();
            circle(c, 61.5, 21.5, 2.2);
            c.fill();
          },
        },
        // Frame.
        { weight: 0.2, edge: 0.75, depth: 3, z: -9, emphasis: 0.5, motion: bob(-1), draw: (c) => phoneFrame(c) },
        // Screen glass with the notch.
        {
          weight: 0.17,
          edge: 0.3,
          depth: 0.5,
          z: 2,
          emphasis: 0,
          motion: bob(0),
          draw: (c) => {
            rr(c, 33, 11, 34, 78, 6);
            c.fill();
            c.globalCompositeOperation = 'destination-out';
            rr(c, 44.5, 13.5, 11, 3.2, 1.6);
            c.fill();
            c.globalCompositeOperation = 'source-over';
          },
        },
        // UI: hero card.
        {
          weight: 0.12,
          edge: 0.5,
          depth: 1,
          z: 13,
          emphasis: 0.35,
          motion: bob(1),
          draw: (c) => {
            rr(c, 36, 20, 28, 20, 3.5);
            c.fill();
          },
        },
        // UI: list rows.
        {
          weight: 0.14,
          edge: 0.5,
          depth: 1,
          z: 23,
          emphasis: 0.2,
          motion: bob(2),
          draw: (c) => {
            for (let k = 0; k < 3; k++) {
              rr(c, 36, 45 + k * 10.5, 28, 7.5, 2.5);
              c.fill();
            }
          },
        },
        // UI: tab bar icons, one active.
        {
          weight: 0.05,
          edge: 0.4,
          depth: 1,
          z: 32,
          emphasis: 0.5,
          motion: bob(3),
          draw: (c) => [39, 46.5, 53.5, 61].forEach((x, k) => k !== 1 && (circle(c, x, 82, 2.4), c.fill())),
        },
        { weight: 0.015, edge: 0, depth: 1, z: 32, emphasis: 1, motion: bob(3), draw: (c) => (circle(c, 46.5, 82, 2.6), c.fill()) },
      ];
      const pts = flat(layers, Math.round(n * 0.86), r);
      // Two orbits — iOS and Android — circling the stack.
      while (pts.length < n) {
        const top = r() < 0.5;
        const th = r() * TAU;
        const rad = (top ? 1.75 : 1.95) + (r() - 0.5) * 0.04;
        const y = top ? 1.35 : -1.25;
        const bright = r() < 0.06;
        pts.push([Math.cos(th) * rad, y + (r() - 0.5) * 0.03, Math.sin(th) * rad, bright ? 1 : 0.3, Motion.Orbit, top ? 0.45 : -0.32, 0, 0]);
      }
      return pts;
    },
  },

  // Evolution v0.1 — support engineer: fixing records in live databases.
  db: { size: 3.6, sway: 0.7, notes: [{ at: [1.25, 0.8, 0], text: 'v0.1 — fixing records in live systems' }], build: (n, r) => dbStack(n, r) },

  // v1.0 — first shipped apps: a phone showing a real screen.
  phoneList: {
    size: 3.9,
    sway: 0.35,
    notes: [{ at: b(66, 26), text: 'first two apps, shipped' }],
    build: (n, r) =>
      flat(
        [
          {
            weight: 1,
            edge: 0.45,
            depth: 5,
            draw: (c) => {
              phoneFrame(c);
              rr(c, 36, 20, 28, 18, 3);
              c.fill();
              for (let k = 0; k < 4; k++) {
                circle(c, 39, 46 + k * 9, 2.4);
                c.fill();
                stroke(c, `M45 ${46 + k * 9} L${62 - (k % 2) * 6} ${46 + k * 9}`, 1.8);
              }
              stroke(c, 'M43 85 L57 85', 1.6);
            },
          },
          { weight: 0.08, emphasis: 1, edge: 0, depth: 2, draw: (c) => (circle(c, 62, 22, 2.6), c.fill()) },
        ],
        n,
        r,
      ),
  },

  // v2.0 — state management: layered stores.
  layers: {
    size: 3.9,
    sway: 0.55,
    notes: [{ at: [1.6, 1.0, 0], text: 'v2.0 — state in layers (Redux)' }],
    build: (n, r) => {
      const out: Pt[] = [];
      const S = 1.6;
      for (let i = 0; i < n; i++) {
        const t = r();
        if (t < 0.06) {
          // vertical data lines between layers
          const corner = [[-1, -1], [1, -1], [1, 1], [-1, 1]][(r() * 4) | 0];
          out.push(segment(r, [corner[0] * S * 0.55, 1.1, corner[1] * S * 0.55], [corner[0] * S * 0.55, -1.1, corner[1] * S * 0.55], 0.02, 1));
          continue;
        }
        const k = (r() * 3) | 0;
        const y = 1.1 - k * 1.1;
        const onEdge = r() < 0.5;
        let x: number, z: number;
        if (onEdge) {
          const e = r() * 4;
          const s = (e % 1) * 2 - 1;
          const side = e | 0;
          x = side === 0 ? s : side === 1 ? 1 : side === 2 ? -s : -1;
          z = side === 0 ? -1 : side === 1 ? s : side === 2 ? 1 : -s;
        } else {
          x = r() * 2 - 1;
          z = r() * 2 - 1;
          // a sparse grid on each plane
          if (r() < 0.6) x = Math.round(x * 4) / 4;
          else z = Math.round(z * 4) / 4;
        }
        out.push(rotY([x * S, y, z * S, onEdge ? 0.5 : 0.1], Math.PI / 4));
      }
      return out;
    },
  },

  // v4.5 — lead mobile dev: two phones, one bridge.
  twoPhones: {
    size: 4.6,
    sway: 0.3,
    notes: [{ at: [0, 1.75, 0], text: 'v4.5 — iOS + Android, end to end' }],
    build: (n, r) => {
      const half = Math.round(n * 0.42);
      const frame: Layer[] = [
        {
          weight: 1,
          edge: 0.5,
          depth: 4,
          draw: (c) => {
            phoneFrame(c);
            rr(c, 45, 12.5, 10, 3, 1.5);
            c.fill();
            for (let k = 0; k < 3; k++) {
              rr(c, 36, 24 + k * 17, 28, 12, 3);
              c.fill();
            }
          },
        },
      ];
      const left = flat(frame, half, r).map((p) => rotY([p[0] - 0.05, p[1], p[2], p[3]], 0.45)).map((p): Pt => [p[0] - 1.45, p[1], p[2], p[3]]);
      const right = flat(frame, half, r).map((p) => rotY([p[0] + 0.05, p[1], p[2], p[3]], -0.45)).map((p): Pt => [p[0] + 1.45, p[1], p[2], p[3]]);
      const out = [...left, ...right];
      while (out.length < n) {
        const t = r();
        const x = -0.9 + t * 1.8;
        const y = 1.05 + Math.sin(t * Math.PI) * 0.55;
        out.push([x, y + (r() - 0.5) * 0.04, (r() - 0.5) * 0.06, r() < 0.15 ? 1 : 0.5]);
      }
      return out;
    },
  },

  // --- Experiments ---
  pin: {
    size: 4,
    sway: 0.35,
    notes: [{ at: b(50, 38), text: 'live trips, even with the app closed' }],
    build: (n, r) =>
      flat(
        [
          {
            weight: 0.78,
            edge: 0.45,
            depth: 6,
            draw: (c) => {
              const p = new Path2D('M50 6 C35 6 25 18 25 32 C25 50 50 72 50 72 C50 72 75 50 75 32 C75 18 65 6 50 6 Z');
              p.arc(50, 32, 9, 0, TAU);
              c.fill(p, 'evenodd');
            },
          },
          {
            weight: 0.22,
            edge: 0.2,
            depth: 2,
            emphasis: 0.5,
            draw: (c) => {
              stroke(c, 'M50 80 C36 80 28 90 14 92', 2, [3.5, 4]);
              stroke(c, 'M50 80 C64 80 72 86 86 86', 2, [3.5, 4]);
              circle(c, 50, 80, 2.8);
              c.fill();
              circle(c, 86, 86, 2.4);
              c.fill();
            },
          },
          { weight: 0.04, emphasis: 1, edge: 0, depth: 1, draw: (c) => (circle(c, 14, 92, 2.6), c.fill()) },
        ],
        n,
        r,
      ),
  },

  play: {
    size: 4.1,
    sway: 0.3,
    notes: [{ at: b(84, 22), text: 'next 4 videos, already loaded' }],
    build: (n, r) =>
      flat(
        [
          {
            weight: 0.55,
            edge: 0.6,
            depth: 4,
            draw: (c) => {
              c.lineWidth = 2.6;
              rr(c, 14, 20, 72, 56, 9);
              c.stroke();
              c.fill(new Path2D('M42 36 L64 48 L42 60 Z'));
            },
          },
          {
            weight: 0.15,
            edge: 0.1,
            depth: 2,
            draw: (c) => stroke(c, 'M14 88 L86 88', 1.6),
          },
          {
            weight: 0.08,
            emphasis: 1,
            edge: 0.1,
            depth: 2,
            draw: (c) => {
              stroke(c, 'M14 88 L48 88', 2.4);
              circle(c, 48, 88, 3);
              c.fill();
            },
          },
        ],
        n,
        r,
      ),
  },

  dumbbell: {
    size: 4.2,
    sway: 0.6,
    notes: [{ at: [1.45, 0.75, 0], text: 'live 1:1 coaching over video' }],
    build: (n, r) => {
      const out: Pt[] = [];
      for (let i = 0; i < n; i++) {
        const t = r();
        if (t < 0.18) out.push(rod(r, -1.1, 1.1, 0.12, 0.25));
        else {
          const side = r() < 0.5 ? -1 : 1;
          const k = (r() * 3) | 0;
          const x = side * (1.2 + k * 0.2);
          const rad = [0.62, 0.75, 0.62][k];
          // hexagonal heads
          const p = plate(r, x, rad, 0.18);
          const th = Math.atan2(p[2], p[1]);
          const hex = Math.cos(Math.PI / 6) / Math.cos(((th % (TAU / 6)) + TAU / 6) % (TAU / 6) - Math.PI / 6);
          out.push([p[0], p[1] * hex, p[2] * hex, p[3]]);
        }
      }
      return out;
    },
  },

  calendar: {
    size: 4,
    sway: 0.3,
    notes: [{ at: b(62, 66), text: 'shift times that are always right' }],
    build: (n, r) =>
      flat(
        [
          {
            weight: 0.85,
            edge: 0.5,
            depth: 4,
            draw: (c) => {
              c.lineWidth = 2.4;
              rr(c, 14, 18, 72, 70, 6);
              c.stroke();
              c.fillRect(14, 18, 72, 12);
              stroke(c, 'M30 10 L30 24', 4);
              stroke(c, 'M70 10 L70 24', 4);
              for (let row = 0; row < 4; row++) {
                for (let col = 0; col < 5; col++) {
                  if (row === 2 && col === 3) continue;
                  rr(c, 21 + col * 12.6, 38 + row * 12, 7, 7, 1.5);
                  c.fill();
                }
              }
            },
          },
          { weight: 0.1, emphasis: 1, edge: 0.3, depth: 3, draw: (c) => (rr(c, 58.8, 62, 9, 9, 2), c.fill()) },
        ],
        n,
        r,
      ),
  },

  pen: {
    size: 4.2,
    sway: 0.3,
    notes: [{ at: b(84, 30), text: 'design data → working UI code' }],
    build: (n, r) =>
      flat(
        [
          {
            weight: 0.6,
            edge: 0.5,
            depth: 5,
            draw: (c) => {
              const p = new Path2D('M50 18 L66 52 L58 82 L42 82 L34 52 Z');
              p.arc(50, 50, 4.5, 0, TAU);
              c.fill(p, 'evenodd');
              c.clearRect(49, 18, 2, 28);
              c.fillRect(40, 84, 20, 8);
            },
          },
          {
            weight: 0.3,
            edge: 0.1,
            depth: 2,
            emphasis: 0.5,
            draw: (c) => {
              stroke(c, 'M8 70 C18 30 82 30 92 70', 1.6, [2, 3]);
              stroke(c, 'M8 70 L4 40', 1);
              stroke(c, 'M92 70 L96 40', 1);
            },
          },
          {
            weight: 0.1,
            emphasis: 1,
            edge: 0.5,
            depth: 2,
            draw: (c) => {
              c.fillRect(5, 67, 6, 6);
              c.fillRect(89, 67, 6, 6);
              circle(c, 4, 40, 2.2);
              c.fill();
              circle(c, 96, 40, 2.2);
              c.fill();
            },
          },
        ],
        n,
        r,
      ),
  },

  network: {
    size: 4,
    sway: 1.2,
    notes: [{ at: [1.45, 0.95, 0.2], text: 'an AI that can query your API' }],
    build: (n, r) => {
      const nodes: [number, number, number][] = [
        [0, 0, 0],
        [1.5, 0.9, 0.2],
        [-1.4, 1.0, -0.4],
        [-1.2, -1.1, 0.6],
        [1.3, -1.0, -0.5],
        [0.2, 1.7, 0.9],
        [0.1, -1.7, -0.8],
        [1.9, 0.0, 1.0],
        [-1.9, -0.1, 0.9],
      ];
      const edges = [[0, 1], [0, 2], [0, 3], [0, 4], [1, 5], [2, 5], [3, 6], [4, 6], [1, 7], [4, 7], [2, 8], [3, 8], [5, 7], [6, 8]];
      const out: Pt[] = [];
      for (let i = 0; i < n; i++) {
        if (r() < 0.42) {
          const k = (r() * nodes.length) | 0;
          const rad = k === 0 ? 0.42 : 0.24;
          const p = r() < 0.6 ? onSphere(r, rad, nodes[k]) : inSphere(r, rad * 0.8, nodes[k]);
          out.push([...p, k === 0 ? 1 : 0.5]);
        } else {
          const e = edges[(r() * edges.length) | 0];
          out.push(segment(r, nodes[e[0]], nodes[e[1]], 0.03, 0.25));
        }
      }
      return out;
    },
  },

  // --- Toolkit ---
  devices: {
    size: 4.3,
    sway: 0.3,
    build: (n, r) =>
      flat(
        [
          {
            weight: 0.55,
            edge: 0.55,
            depth: 4,
            draw: (c) => {
              c.lineWidth = 2.2;
              rr(c, 8, 18, 60, 74, 6);
              c.stroke();
              for (let k = 0; k < 3; k++) {
                rr(c, 15, 28 + k * 19, 46, 13, 2);
                c.fill();
              }
            },
          },
          {
            weight: 0.45,
            edge: 0.55,
            depth: 4,
            z: 6,
            draw: (c) => {
              c.lineWidth = 2.2;
              rr(c, 62, 34, 30, 58, 6);
              c.stroke();
              rr(c, 73, 37, 8, 2.5, 1.25);
              c.fill();
              for (let k = 0; k < 4; k++) {
                rr(c, 67, 46 + k * 10, 20, 6, 2);
                c.fill();
              }
            },
          },
        ],
        n,
        r,
      ),
  },

  braces: {
    size: 4.3,
    sway: 0.3,
    build: (n, r) =>
      flat(
        [
          {
            weight: 0.8,
            edge: 0.45,
            depth: 6,
            draw: (c) => {
              c.font = '400 80px "Geist Mono", ui-monospace, monospace';
              c.textBaseline = 'middle';
              c.textAlign = 'center';
              c.fillText('{', 18, 48);
              c.fillText('}', 82, 48);
            },
          },
          {
            weight: 0.2,
            emphasis: 1,
            edge: 0.3,
            depth: 3,
            draw: (c) => {
              for (let k = 0; k < 3; k++) {
                circle(c, 36 + k * 14, 50, 3.4);
                c.fill();
              }
            },
          },
        ],
        n,
        r,
      ),
  },

  motion: {
    size: 4.3,
    sway: 0.35,
    build: (n, r) =>
      flat(
        [
          ...[0, 1, 2, 3].map(
            (k): Layer => ({
              weight: 0.3 - k * 0.06,
              edge: 0,
              depth: 2,
              z: -k * 6,
              emphasis: k === 0 ? 0.5 : 0.1,
              draw: (c) => stroke(c, 'M6 78 C30 78 34 22 58 22 C74 22 80 40 94 40', 2.6 - k * 0.4, k ? [2, 3 + k * 2] : undefined),
            }),
          ),
          { weight: 0.12, emphasis: 1, edge: 0.5, depth: 6, draw: (c) => (circle(c, 94, 40, 5.5), c.fill()) },
        ],
        n,
        r,
      ),
  },

  bell: {
    size: 3.9,
    sway: 0.4,
    build: (n, r) =>
      flat(
        [
          {
            weight: 0.85,
            edge: 0.45,
            depth: 6,
            draw: (c) => {
              c.fill(new Path2D('M50 14 C36 14 28 26 28 40 L28 60 L20 70 L80 70 L72 60 L72 40 C72 26 64 14 50 14 Z'));
              circle(c, 50, 78, 6);
              c.fill();
              c.fillRect(47, 8, 6, 8);
            },
          },
          { weight: 0.15, emphasis: 1, edge: 0.4, depth: 4, z: 3, draw: (c) => (circle(c, 76, 20, 8), c.fill()) },
        ],
        n,
        r,
      ),
  },

  shield: {
    size: 3.9,
    sway: 0.4,
    build: (n, r) =>
      flat(
        [
          {
            weight: 0.7,
            edge: 0.6,
            depth: 6,
            draw: (c) => {
              c.lineWidth = 3;
              c.stroke(new Path2D('M50 8 L84 20 L84 46 C84 70 68 84 50 92 C32 84 16 70 16 46 L16 20 Z'));
            },
          },
          { weight: 0.3, emphasis: 1, edge: 0.2, depth: 4, draw: (c) => stroke(c, 'M33 50 L45 62 L68 36', 6) },
        ],
        n,
        r,
      ),
  },

  spark: {
    size: 4,
    sway: 0.5,
    build: (n, r) =>
      flat(
        [
          {
            weight: 0.82,
            edge: 0.4,
            depth: 7,
            draw: (c) => c.fill(new Path2D('M44 12 C47 40 56 49 82 52 C56 55 47 64 44 92 C41 64 32 55 6 52 C32 49 41 40 44 12 Z')),
          },
          {
            weight: 0.18,
            emphasis: 1,
            edge: 0.3,
            depth: 4,
            z: 6,
            draw: (c) => c.fill(new Path2D('M80 8 C81 18 84 21 94 22 C84 23 81 26 80 36 C79 26 76 23 66 22 C76 21 79 18 80 8 Z')),
          },
        ],
        n,
        r,
      ),
  },

  // --- About ---
  palm: {
    size: 4.2,
    sway: 0.35,
    notes: [{ at: b(26, 90), text: 'home — Kerala, India' }],
    build: (n, r) =>
      flat(
        [
          {
            weight: 0.22,
            edge: 0.2,
            depth: 5,
            draw: (c) => {
              stroke(c, 'M50 90 C48 72 52 52 61 34', 4.5);
            },
          },
          {
            weight: 0.55,
            edge: 0.35,
            depth: 10,
            emphasis: 0.1,
            draw: (c) => {
              const fronds = ['M61 32 Q44 16 22 26', 'M61 32 Q46 30 32 46', 'M61 32 Q66 12 86 12', 'M61 32 Q80 24 94 40', 'M61 32 Q74 38 78 56', 'M61 32 Q56 14 42 8'];
              fronds.forEach((d) => stroke(c, d, 3.2));
              // leaflets
              fronds.forEach((d) => stroke(c, d, 7, [0.8, 2.2]));
            },
          },
          {
            weight: 0.08,
            emphasis: 1,
            edge: 0.4,
            depth: 4,
            draw: (c) => {
              circle(c, 57, 37, 3);
              c.fill();
              circle(c, 63, 38, 3);
              c.fill();
              circle(c, 60, 41, 3);
              c.fill();
            },
          },
          {
            weight: 0.15,
            edge: 0,
            depth: 14,
            emphasis: 0.5,
            draw: (c) => {
              stroke(c, 'M6 92 Q14 88 22 92 T38 92 T54 92 T70 92 T86 92 T96 92', 1.4);
              stroke(c, 'M16 97 Q24 93 32 97 T48 97 T64 97 T80 97', 1.2, [3, 3]);
            },
          },
        ],
        n,
        r,
      ),
  },

  // Tyson: a sitting German Shepherd — tan coat, dark saddle and muzzle, wagging tail.
  tyson: {
    size: 4.3,
    sway: 0.3,
    yaw: -0.15,
    notes: [
      { at: b(57, 5), text: 'Tyson — German Shepherd' },
      { at: b(76, 95), text: 'head of security' },
    ],
    build: (n, r) => {
      const BODY =
        'M46 18 L52 3 L57 14 L61 2 L66 15 C69 16 71 18 73 20 C78 21 85 23 89 25 C92 26 92 29 90 31 C86 33 82 33 78 33 C74 34 71 35 68 37 C69 42 71 48 72 54 C73 58 72 60 70 62 L70 90 C72 92 76 92 77 94 L77 96 L63 96 L64 66 C62 68 60 70 58 72 C59 80 60 88 61 92 C63 93 64 94 64 96 L40 96 C30 96 24 90 23 80 C22 70 25 60 31 54 C35 48 40 40 43 33 C44 26 45 22 46 18 Z';
      // The dark parts of a GSD coat: saddle, muzzle, ears.
      const DARK = (c: CanvasRenderingContext2D) => {
        c.fill(new Path2D('M30 56 C34 48 39 40 43 33 C47 36 52 40 57 42 C60 50 56 62 46 68 C38 70 30 66 30 56 Z'));
        c.fill(new Path2D('M79 21 C84 22 88 24 90 26 C92 29 88 33 80 33 C78 29 78 25 79 21 Z'));
        c.fill(new Path2D('M46 18 L52 3 L57 14 L61 2 L66 15 L60 18 Z'));
      };
      const clip = (c: CanvasRenderingContext2D) => c.clip(new Path2D(BODY));
      return flat(
        [
          {
            // Tan coat: everything except the dark parts.
            weight: 0.4,
            edge: 0.32,
            depth: 12,
            emphasis: 0.86,
            draw: (c) => {
              c.fill(new Path2D(BODY));
              c.globalCompositeOperation = 'destination-out';
              DARK(c);
              circle(c, 74, 24, 1.8);
              c.fill();
              c.globalCompositeOperation = 'source-over';
            },
          },
          {
            weight: 0.44,
            edge: 0.2,
            depth: 13,
            emphasis: 0.22,
            draw: (c) => {
              c.save();
              clip(c);
              DARK(c);
              c.restore();
            },
          },
          {
            // A few fur strokes on the chest and haunch.
            weight: 0.04,
            edge: 0,
            depth: 6,
            z: 4,
            emphasis: 0.5,
            draw: (c) => {
              stroke(c, 'M69 42 C68 48 69 54 70 58', 1, [1.5, 2]);
              stroke(c, 'M28 74 C32 70 40 70 46 74', 1, [1.5, 2]);
            },
          },
          {
            weight: 0.03,
            edge: 0,
            depth: 3,
            z: 5,
            emphasis: 1,
            draw: (c) => {
              circle(c, 90, 28, 2.4);
              c.fill();
              circle(c, 74, 24, 1.6);
              c.fill();
            },
          },
          {
            // The tail drapes to the floor and wags.
            weight: 0.09,
            edge: 0.2,
            depth: 5,
            z: -5,
            emphasis: 0.05,
            motion: { type: Motion.Wag, param: 0.32, pivot: [27, 80] },
            draw: (c) => {
              stroke(c, 'M27 80 C16 82 9 88 9 94', 6.5);
              stroke(c, 'M9 94 C10 96 16 97 22 96', 4.5);
            },
          },
        ],
        n,
        r,
      );
    },
  },

  barbell: {
    size: 4.8,
    sway: 0.55,
    notes: [{ at: [2.0, 1.15, 0], text: 'regular gym sessions' }],
    build: (n, r) => {
      const out: Pt[] = [];
      for (let i = 0; i < n; i++) {
        const t = r();
        if (t < 0.14) out.push(rod(r, -2.6, 2.6, 0.05, 0.3));
        else if (t < 0.2) {
          const side = r() < 0.5 ? -1 : 1;
          out.push(rod(r, side * 1.15, side * 1.3, 0.12, 0.6));
        } else {
          const side = r() < 0.5 ? -1 : 1;
          const k = r() < 0.62 ? 0 : 1;
          const x = side * (1.48 + k * 0.3);
          out.push(plate(r, x, k === 0 ? 1.12 : 0.85, 0.2, 0.5));
        }
      }
      return out.map((p) => (r() < 0.01 ? [p[0], p[1], p[2], 1] : p));
    },
  },

  coupe: {
    size: 4.6,
    sway: 0.3,
    notes: [{ at: b(56, 30), text: 'cars, bikes — anything with an engine' }],
    build: (n, r) =>
      flat(
        [
          {
            weight: 0.68,
            edge: 0.45,
            depth: 16,
            draw: (c) => {
              const body = new Path2D(
                'M6 66 L7 57 C8 53 14 51 24 50 L38 39 C43 35 50 33 58 33 L68 34 C75 35 80 40 86 48 C92 50 96 53 96 58 L96 66 Z',
              );
              body.moveTo(41, 48);
              body.lineTo(48, 40);
              body.bezierCurveTo(51, 37.5, 54, 37, 58, 37);
              body.lineTo(66, 37.5);
              body.bezierCurveTo(70, 38, 73, 42, 77, 48);
              body.closePath();
              c.fill(body, 'evenodd');
              // wheel arches
              c.globalCompositeOperation = 'destination-out';
              circle(c, 26, 66, 11.5);
              c.fill();
              circle(c, 78, 66, 11.5);
              c.fill();
              c.globalCompositeOperation = 'source-over';
            },
          },
          {
            weight: 0.14,
            edge: 0.55,
            depth: 12,
            emphasis: 0.1,
            motion: { type: Motion.Spin, param: -2.6, pivot: [26, 66] },
            draw: (c) => {
              c.lineWidth = 3;
              circle(c, 26, 66, 9);
              c.stroke();
              for (let k = 0; k < 5; k++) {
                const a = (k / 5) * TAU;
                stroke(c, `M26 66 L${26 + Math.cos(a) * 6} ${66 + Math.sin(a) * 6}`, 1.6);
              }
            },
          },
          {
            weight: 0.14,
            edge: 0.55,
            depth: 12,
            emphasis: 0.1,
            motion: { type: Motion.Spin, param: -2.6, pivot: [78, 66] },
            draw: (c) => {
              c.lineWidth = 3;
              circle(c, 78, 66, 9);
              c.stroke();
              for (let k = 0; k < 5; k++) {
                const a = (k / 5) * TAU;
                stroke(c, `M78 66 L${78 + Math.cos(a) * 6} ${66 + Math.sin(a) * 6}`, 1.6);
              }
            },
          },
          {
            weight: 0.04,
            emphasis: 1,
            edge: 0,
            depth: 10,
            draw: (c) => {
              rr(c, 91, 52, 5, 3, 1.5);
              c.fill();
            },
          },
        ],
        n,
        r,
      ),
  },

  planet: {
    size: 4.6,
    sway: 0.9,
    notes: [{ at: [2.3, 1.15, 0], text: 'space, physics, how we got here' }],
    build: (n, r) => {
      const out: Pt[] = [];
      for (let i = 0; i < n; i++) {
        const t = r();
        if (t < 0.55) {
          const p = onSphere(r, 1.2);
          // latitude bands
          const band = Math.abs(Math.sin(p[1] * 7)) < 0.18;
          out.push([p[0], p[1], p[2], band ? 0.35 : 0.08]);
        } else if (t < 0.93) {
          const th = r() * TAU;
          const rad = 1.65 + Math.pow(r(), 1.4) * 0.75;
          const gap = rad > 2.0 && rad < 2.08;
          if (gap) {
            i--;
            continue;
          }
          const p: Pt = [Math.cos(th) * rad, (r() - 0.5) * 0.03, Math.sin(th) * rad, rad > 2.15 ? 0.5 : 0.2];
          out.push(rotX(rotY(p, 0.2), 0.42));
        } else {
          const p = onSphere(r, 0.2, [2.25, 1.0, -0.4]);
          out.push([...p, 1, Motion.Orbit, 0.5, 0, 0]);
        }
      }
      return out;
    },
  },

  gear: {
    size: 4,
    sway: 0.45,
    notes: [{ at: b(84, 80), text: 'built from scratch, for the fun of it' }],
    build: (n, r) => {
      const gearPath = (cx: number, cy: number, R: number, teeth: number, hole: number) => {
        const p = new Path2D();
        const steps = teeth * 4;
        for (let k = 0; k <= steps; k++) {
          const a = (k / steps) * TAU;
          const phase = k % 4;
          const rad = phase === 1 || phase === 2 ? R : R * 0.8;
          const x = cx + Math.cos(a) * rad;
          const y = cy + Math.sin(a) * rad;
          if (k === 0) p.moveTo(x, y);
          else p.lineTo(x, y);
        }
        p.closePath();
        p.moveTo(cx + hole, cy);
        p.arc(cx, cy, hole, 0, TAU);
        return p;
      };
      return flat(
        [
          { weight: 0.68, edge: 0.45, depth: 8, draw: (c) => c.fill(gearPath(40, 42, 34, 12, 11), 'evenodd') },
          { weight: 0.32, edge: 0.45, depth: 8, z: 4, emphasis: 0.1, draw: (c) => c.fill(gearPath(80, 80, 17, 8, 5), 'evenodd') },
        ],
        n,
        r,
      );
    },
  },

  // --- Closing chambers ---
  cap: {
    size: 4.3,
    sway: 0.4,
    build: (n, r) =>
      flat(
        [
          { weight: 0.55, edge: 0.45, depth: 5, draw: (c) => c.fill(new Path2D('M50 22 L94 38 L50 54 L6 38 Z')) },
          {
            weight: 0.33,
            edge: 0.45,
            depth: 6,
            draw: (c) => {
              c.fill(new Path2D('M26 46 L50 55 L74 46 L74 62 C74 72 26 72 26 62 Z'));
            },
          },
          {
            weight: 0.12,
            emphasis: 1,
            edge: 0.2,
            depth: 2,
            z: 3,
            draw: (c) => {
              stroke(c, 'M50 38 L84 46 L84 66', 1.6);
              c.fill(new Path2D('M80 66 L88 66 L86 78 L82 78 Z'));
            },
          },
        ],
        n,
        r,
      ),
  },

  terminal: {
    size: 4.3,
    sway: 0.3,
    notes: [{ at: b(64, 64), text: 'still compiling' }],
    build: (n, r) =>
      flat(
        [
          {
            weight: 0.82,
            edge: 0.5,
            depth: 4,
            draw: (c) => {
              c.lineWidth = 2.4;
              rr(c, 8, 18, 84, 66, 5);
              c.stroke();
              stroke(c, 'M8 29 L92 29', 1.4);
              [15, 21, 27].forEach((x) => (circle(c, x, 23.5, 1.8), c.fill()));
              stroke(c, 'M17 41 L25 47 L17 53', 2.8);
              stroke(c, 'M31 47 L62 47', 2);
              stroke(c, 'M17 59 L48 59', 2);
              stroke(c, 'M17 69 L40 69', 2);
            },
          },
          { weight: 0.18, emphasis: 1, edge: 0.3, depth: 3, motion: { type: Motion.Blink }, draw: (c) => c.fillRect(46, 64, 6, 10) },
        ],
        n,
        r,
      ),
  },

  plane: {
    size: 4.4,
    sway: 0.35,
    notes: [{ at: b(92, 14), text: 'goes straight to my inbox' }],
    build: (n, r) =>
      flat(
        [
          {
            weight: 0.7,
            edge: 0.5,
            depth: 6,
            draw: (c) => {
              c.fill(new Path2D('M6 48 L94 12 L70 86 L50 62 Z'));
              c.globalCompositeOperation = 'destination-out';
              stroke(c, 'M94 12 L50 62', 1.6);
              c.globalCompositeOperation = 'source-over';
            },
          },
          { weight: 0.12, edge: 0.4, depth: 8, z: -4, emphasis: 0.3, draw: (c) => c.fill(new Path2D('M50 62 L46 84 L60 70 Z')) },
          {
            weight: 0.18,
            emphasis: 0.5,
            edge: 0,
            depth: 2,
            draw: (c) => stroke(c, 'M42 80 C30 92 16 90 6 96', 1.6, [2.5, 4]),
          },
        ],
        n,
        r,
      ),
  },
};

export type ShapeId = keyof typeof SHAPES;

// --- Cache -------------------------------------------------------------------------

const cache = new Map<string, Shape>();

/** Build (or fetch) a shape for `n` particles. Deterministic per id. */
export function getShape(id: string, n: number): Shape {
  const key = `${id}:${n}`;
  let s = cache.get(key);
  if (!s) {
    const def = SHAPES[id] ?? SHAPES.phone;
    const seed = [...id].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
    const r = rng(seed);
    s = finish(def.build(n, r), n, r, { size: def.size });
    cache.set(key, s);
  }
  return s;
}

/** Warm the cache during idle time so morphs never hitch. */
export function prewarm(n: number, ids = Object.keys(SHAPES)) {
  const queue = ids.slice();
  const idle = (window as Window & { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 40));
  const next = () => {
    const id = queue.shift();
    if (!id) return;
    getShape(id, n);
    idle(next);
  };
  idle(next);
}
