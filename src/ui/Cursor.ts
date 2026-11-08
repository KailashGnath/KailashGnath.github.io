/**
 * A reticle that trails the pointer and locks onto interactive things.
 *
 * It runs its own animation loop, so it never depends on the WebGL loop being
 * alive. The native cursor is only hidden while this loop is proven to be
 * running; if it stalls, the native cursor comes straight back.
 */
export class Cursor {
  private el = document.querySelector<HTMLElement>('.cursor')!;
  private label = this.el.querySelector<HTMLElement>('.cursor__label')!;
  /** The ring trails slightly behind; the dot (the container) is always exactly on the pointer. */
  private trail = this.el.querySelector<HTMLElement>('.cursor__trail')!;
  private root = document.documentElement;
  private x = innerWidth / 2;
  private y = innerHeight / 2;
  private tx = this.x;
  private ty = this.y;
  private seen = false;
  private lastTick = 0;
  private last = 0;
  private domLabel = '';
  private sceneLabel = '';
  private native = false; // pointer is over a text field: show the native I-beam
  enabled: boolean;

  constructor(private onHoverTick: () => void) {
    this.enabled = matchMedia('(pointer: fine)').matches;
    if (!this.enabled) {
      this.el.remove();
      return;
    }

    window.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') return;
      this.tx = e.clientX;
      this.ty = e.clientY;
      if (!this.seen) {
        // Jump straight to the first position instead of sliding in from the centre.
        this.seen = true;
        this.x = this.tx;
        this.y = this.ty;
      }
      // Place the dot right away, in the event itself: no waiting, no smoothing.
      this.place();
      this.el.classList.add('is-visible');
      // Watchdog: the loop must have ticked recently for the custom cursor to own the screen.
      const alive = performance.now() - this.lastTick < 300;
      this.root.classList.toggle('has-cursor', alive);
    }, { passive: true });

    const hide = () => this.el.classList.remove('is-visible');
    this.root.addEventListener('mouseleave', hide);
    window.addEventListener('blur', hide);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) hide();
    });

    window.addEventListener('pointerdown', () => this.el.classList.add('is-down'));
    window.addEventListener('pointerup', () => this.el.classList.remove('is-down'));
    document.addEventListener('pointerover', (e) => {
      const target = e.target as HTMLElement;
      this.native = !!target.closest?.('input:not([type="checkbox"]):not([type="radio"]), textarea, [contenteditable]');
      const t = target.closest?.<HTMLElement>('a, button, [data-cursor], label');
      const next = t ? (t.dataset.cursorLabel ?? '') || ' ' : '';
      if (next && !this.domLabel) this.onHoverTick();
      this.domLabel = next;
      this.render();
    });

    requestAnimationFrame(this.loop);
  }

  /**
   * Modal dialogs live in the browser's top layer, above any z-index.
   * Move the cursor inside them while they are open so it stays visible.
   */
  mountIn(host: HTMLElement | null) {
    if (!this.enabled) return;
    (host ?? document.body).appendChild(this.el);
  }

  /** Set by the 3D scene when hovering something interactive. */
  setSceneLabel(label: string) {
    if (!this.enabled) return;
    if (label && !this.sceneLabel) this.onHoverTick();
    this.sceneLabel = label;
    this.render();
  }

  private render() {
    const active = this.domLabel || this.sceneLabel;
    this.el.classList.toggle('is-locked', !!active);
    this.el.classList.toggle('is-native', this.native);
    this.label.textContent = (this.sceneLabel || this.domLabel).trim();
  }

  private loop = (now: number) => {
    requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, this.last ? (now - this.last) / 1000 : 1 / 60);
    this.last = now;
    this.lastTick = performance.now();
    // Only the ring eases — quickly — so it reads as a light echo, not weight.
    const k = 1 - Math.exp(-dt * 48);
    this.x += (this.tx - this.x) * k;
    this.y += (this.ty - this.y) * k;
    this.place();
  };

  private place() {
    this.el.style.transform = `translate3d(${this.tx}px, ${this.ty}px, 0)`;
    this.trail.style.transform = `translate3d(${(this.x - this.tx).toFixed(1)}px, ${(this.y - this.ty).toFixed(1)}px, 0)`;
  }
}
