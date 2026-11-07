/** Scroll-step math for the pinned sections. No three.js here: the UI imports it on first load. */

/** Holds on each integer, eases quickly between them: 0 → 1 → 2 … */
export function stair(x: number) {
  const k = Math.floor(x);
  const f = x - k;
  return k + smoothstep(0.2, 0.8, f);
}

export function smoothstep(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** Scroll a pinned section spends per item, in screens. Lower = less scrolling to move on. */
export const SCREENS_PER_ITEM = 0.45;
/** The toolkit list is compact, so it scrolls through faster. */
export const TOOLKIT_SCREENS_PER_ITEM = 0.27;
// Small plateaus at the start and end of a pinned section (in item units).
const STEP_LEAD = 0.1;
const STEP_TAIL = 0.3;

/** Maps 0..1 inside a section to a 0..(steps-1) value with small plateaus at both ends. */
export function chamberStep(inner: number, steps: number) {
  const span = steps - 1;
  return Math.min(span, Math.max(0, inner * (span + STEP_TAIL) - STEP_LEAD));
}

/** Inverse of chamberStep: the 0..1 progress inside a section where item `i` sits. */
export function stepInner(i: number, steps: number) {
  return Math.min(1, Math.max(0, (i + STEP_LEAD) / (steps - 1 + STEP_TAIL)));
}
