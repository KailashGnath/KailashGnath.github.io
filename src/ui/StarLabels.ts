import type { Experience } from '../core/Experience';

/** HTML labels pinned to the active skill cluster's stars. */
export class StarLabels {
  private root = document.querySelector<HTMLElement>('.star-labels')!;
  private pool: HTMLSpanElement[] = [];
  private tmp = { x: 0, y: 0, visible: false };
  private cluster = -2;

  constructor(private exp: Experience) {}

  update(visible: boolean) {
    const c = this.exp.state.cluster;
    this.root.classList.toggle('is-visible', visible);
    if (!visible) return;
    const stars = this.exp.constellation.activeStars();
    if (c !== this.cluster) {
      this.cluster = c;
      this.pool.forEach((p) => p.classList.remove('is-on'));
      stars.forEach((s, i) => {
        let el = this.pool[i];
        if (!el) {
          el = document.createElement('span');
          el.className = 'star-label mono';
          this.root.appendChild(el);
          this.pool[i] = el;
        }
        el.textContent = s.label;
        el.style.transitionDelay = `${i * 40}ms`;
        requestAnimationFrame(() => el.classList.add('is-on'));
      });
    }
    const g = this.exp.constellation.group;
    stars.forEach((s, i) => {
      const el = this.pool[i];
      const w = g.localToWorld(s.pos.clone());
      this.exp.project(w, this.tmp);
      el.style.transform = `translate3d(${this.tmp.x.toFixed(1)}px, ${this.tmp.y.toFixed(1)}px, 0)`;
      el.style.visibility = this.tmp.visible ? 'visible' : 'hidden';
    });
  }
}
