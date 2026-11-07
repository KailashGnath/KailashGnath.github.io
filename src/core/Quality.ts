export type Tier = 'high' | 'medium' | 'phone' | 'low';

export interface QualitySettings {
  tier: Tier;
  particles: number;
  dust: number;
  maxDpr: number;
  bloom: boolean;
  chromatic: boolean;
  msaa: number;
}

const PRESETS: Record<Tier, Omit<QualitySettings, 'tier'>> = {
  high: { particles: 22000, dust: 1600, maxDpr: 2, bloom: true, chromatic: true, msaa: 4 },
  medium: { particles: 14000, dust: 1000, maxDpr: 1.5, bloom: true, chromatic: true, msaa: 2 },
  // Modern phones: dense enough that shapes read crisply on a small screen.
  phone: { particles: 13000, dust: 700, maxDpr: 1.75, bloom: true, chromatic: false, msaa: 0 },
  low: { particles: 9000, dust: 500, maxDpr: 1.25, bloom: true, chromatic: false, msaa: 0 },
};

export function detectTier(): Tier {
  const coarse = matchMedia('(pointer: coarse)').matches;
  const small = Math.min(innerWidth, innerHeight) < 600;
  if (coarse || small) {
    // Recent phones (high-density screen, 6+ cores or ≥4 GB) get the phone tier; the
    // FPS governor still steps resolution and bloom down if one can't keep up.
    const cores = navigator.hardwareConcurrency ?? 4;
    const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
    return devicePixelRatio >= 2.5 && (cores >= 6 || mem >= 4) ? 'phone' : 'low';
  }
  const cores = navigator.hardwareConcurrency ?? 4;
  if (cores <= 4) return 'medium';
  return 'high';
}

export function getQuality(tier = detectTier()): QualitySettings {
  return { tier, ...PRESETS[tier] };
}

/**
 * Watches real frame rate (wall clock — not the clamped simulation step, so a
 * 2fps phone is detected in seconds, not minutes) and asks the renderer to step
 * down when it can't keep up. Never steps back up, to avoid oscillating.
 */
export class FpsGovernor {
  private windowStart = 0;
  private frames = 0;
  private slowWindows = 0;
  private cooldownUntil = 0;
  private done = false;

  constructor(private onDowngrade: () => boolean) {}

  tick(now = performance.now()) {
    if (this.done) return;
    if (!this.cooldownUntil) this.cooldownUntil = now + 2500; // let the first frames settle
    if (now < this.cooldownUntil) {
      this.windowStart = now;
      this.frames = 0;
      return;
    }
    this.frames++;
    const span = now - this.windowStart;
    if (span >= 1000) {
      const fps = (this.frames * 1000) / span;
      // Very slow: act after one window. Merely slow: after two.
      this.slowWindows = fps < 42 ? this.slowWindows + (fps < 20 ? 2 : 1) : 0;
      this.windowStart = now;
      this.frames = 0;
      if (this.slowWindows >= 2) {
        this.slowWindows = 0;
        if (this.onDowngrade()) this.cooldownUntil = now + 1500;
        else this.done = true;
      }
    }
  }
}

export function supportsWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}
