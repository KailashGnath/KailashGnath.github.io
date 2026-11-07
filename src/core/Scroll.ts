import Lenis from 'lenis';

export interface ChamberMetric {
  id: string;
  el: HTMLElement;
  enter: number; // scrollY where the chamber's keyframe begins
  exit: number; // scrollY where it starts handing over to the next chamber
}

export interface ScrollFrame {
  y: number;
  progress: number; // 0..1 over the whole document
  index: number; // current chamber
  inner: number; // 0..1 progress inside a tall (sticky) chamber
  t: number; // 0..1 transition towards the next chamber
  velocity: number;
}

export class Scroll {
  lenis: Lenis | null = null;
  metrics: ChamberMetric[] = [];
  frame: ScrollFrame = { y: 0, progress: 0, index: 0, inner: 0, t: 0, velocity: 0 };
  private maxScroll = 1;
  private lastY = 0;

  constructor(private sections: HTMLElement[], smooth: boolean) {
    if (smooth) {
      this.lenis = new Lenis({ autoRaf: false, lerp: 0.085, wheelMultiplier: 0.9, touchMultiplier: 1.4 });
    }
    this.measure();
    window.addEventListener('resize', () => this.measure());
    // Fonts and late layout can shift section heights.
    new ResizeObserver(() => this.measure()).observe(document.body);
  }

  measure() {
    const vh = window.innerHeight;
    const y = window.scrollY;
    this.metrics = this.sections.map((el) => {
      const top = el.getBoundingClientRect().top + y;
      const height = el.offsetHeight;
      return { id: el.id, el, enter: top, exit: Math.max(top, top + height - vh) };
    });
    this.maxScroll = Math.max(1, document.documentElement.scrollHeight - vh);
    this.lenis?.resize();
  }

  update(time: number) {
    this.lenis?.raf(time);
    const y = window.scrollY;
    const m = this.metrics;
    let i = 0;
    for (let k = 0; k < m.length; k++) if (y >= m[k].enter - 1) i = k;
    const cur = m[i];
    let inner = 0;
    let t = 0;
    if (y <= cur.exit) {
      inner = cur.exit > cur.enter ? (y - cur.enter) / (cur.exit - cur.enter) : 0;
    } else if (i < m.length - 1) {
      inner = 1;
      const next = m[i + 1];
      t = (y - cur.exit) / Math.max(1, next.enter - cur.exit);
    } else {
      inner = 1;
    }
    const f = this.frame;
    f.velocity = y - this.lastY;
    this.lastY = y;
    f.y = y;
    f.index = i;
    f.inner = clamp01(inner);
    f.t = clamp01(t);
    f.progress = clamp01(y / this.maxScroll);
  }

  /** Index of the chamber that currently owns most of the screen. */
  get visibleIndex() {
    return this.frame.t > 0.5 ? Math.min(this.frame.index + 1, this.metrics.length - 1) : this.frame.index;
  }

  scrollTo(target: HTMLElement | number, immediate = false) {
    if (this.lenis) this.lenis.scrollTo(target, { immediate, duration: 2.2 });
    else if (typeof target === 'number') window.scrollTo({ top: target });
    else target.scrollIntoView();
  }

  stop() {
    this.lenis?.stop();
    document.documentElement.classList.add('scroll-locked');
  }

  start() {
    this.lenis?.start();
    document.documentElement.classList.remove('scroll-locked');
  }
}

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
