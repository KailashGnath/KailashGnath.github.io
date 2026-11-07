/**
 * The first few seconds. No log, no button, no gate: the name appears as
 * plain text on first paint, the particles take it over and assemble it,
 * then flow into the hero. Any scroll, click, tap or key skips straight in.
 */
export class Intro {
  private root = document.getElementById('intro');
  private finished = false;
  private resolveDone!: () => void;
  readonly done = new Promise<void>((r) => (this.resolveDone = r));

  constructor(private reduced: boolean) {
    const skip = () => this.finish();
    const opts = { once: true, passive: true } as const;
    window.addEventListener('wheel', skip, opts);
    window.addEventListener('touchstart', skip, opts);
    window.addEventListener('pointerdown', skip, opts);
    window.addEventListener('keydown', skip, opts);
    this.done.then(() => {
      window.removeEventListener('wheel', skip);
      window.removeEventListener('touchstart', skip);
      window.removeEventListener('pointerdown', skip);
      window.removeEventListener('keydown', skip);
    });
  }

  /** The renderer is up; hand the name over to the particles. */
  handoff() {
    this.root?.classList.add('is-handoff');
  }

  /** Assemble, let the visitor play with it for a moment, then continue. */
  async play(assembleMs: number, holdMs: number) {
    if (this.reduced) return this.finish();
    await this.wait(assembleMs);
    this.root?.classList.add('is-hint');
    await this.wait(holdMs);
    this.finish();
  }

  finish() {
    if (this.finished) return;
    this.finished = true;
    this.root?.classList.add('is-gone');
    setTimeout(() => this.root?.remove(), 900);
    this.resolveDone();
  }

  private wait(ms: number) {
    return new Promise<void>((resolve) => {
      if (this.finished) return resolve();
      const t = setTimeout(resolve, ms);
      this.done.then(() => {
        clearTimeout(t);
        resolve();
      });
    });
  }
}
