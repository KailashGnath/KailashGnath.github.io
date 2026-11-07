import { gsap } from 'gsap';
import { experiments } from '../content/resume';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const pad = (n: number) => String(n).padStart(2, '0');

/**
 * A "lab report" for one project, shown in a native <dialog>.
 * Sticky header with reading progress, summary, details strip, build log,
 * an outcome callout, the stack, and previous / next navigation (also ← →).
 */
export class ReportPanel {
  private dialog = document.querySelector<HTMLDialogElement>('dialog.report')!;
  private lastFocus: HTMLElement | null = null;
  private index = -1;
  onOpenChange: (open: boolean) => void = () => {};
  /** The visible project changed (open, or previous / next). */
  onShow: (index: number) => void = () => {};

  constructor(private reduced: boolean) {
    this.dialog.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      if (e.target === this.dialog || t.closest('[data-close]')) return this.close();
      const go = t.closest<HTMLElement>('[data-go]');
      if (go) this.show(Number(go.dataset.go), Number(go.dataset.go) > this.index ? 1 : -1);
    });
    this.dialog.addEventListener('cancel', (e) => {
      e.preventDefault();
      this.close();
    });
    this.dialog.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') this.step(1);
      else if (e.key === 'ArrowLeft') this.step(-1);
    });
    // Reading progress along the top of the report.
    this.dialog.addEventListener('scroll', () => this.progress(), { passive: true });
  }

  open(i: number) {
    if (!experiments[i]) return;
    if (!this.dialog.open) {
      this.lastFocus = document.activeElement as HTMLElement;
      this.render(i);
      this.dialog.showModal();
      this.dialog.scrollTop = 0;
      this.onOpenChange(true);
      this.animateIn(0);
      this.dialog.querySelector<HTMLElement>('.report__close')!.focus({ preventScroll: true });
    } else {
      this.show(i, i > this.index ? 1 : -1);
    }
  }

  private step(dir: 1 | -1) {
    const next = this.index + dir;
    if (experiments[next]) this.show(next, dir);
  }

  /** Swap to another project while open. */
  private show(i: number, dir: number) {
    if (!experiments[i] || i === this.index) return;
    const swap = () => {
      this.render(i);
      this.dialog.scrollTop = 0;
      this.animateIn(dir);
      this.dialog.querySelector<HTMLElement>(dir > 0 ? '[data-go].report__nav--next' : '[data-go].report__nav--prev')?.focus({ preventScroll: true });
    };
    if (this.reduced) return swap();
    gsap.to(this.dialog.querySelector('.report__inner'), { opacity: 0, x: -24 * dir, duration: 0.22, ease: 'power2.in', onComplete: swap });
  }

  private render(i: number) {
    this.index = i;
    const e = experiments[i];
    const [area, focus] = e.domain.split('·').map((x) => x.trim());
    const navBtn = (k: number, label: string, cls: string) => {
      const x = experiments[k];
      return x
        ? `<button type="button" class="report__nav ${cls}" data-go="${k}" data-cursor>
             <span class="mono report__nav-k">${label}</span>
             <span class="report__nav-t">${esc(x.title)}</span>
           </button>`
        : `<span class="report__nav report__nav--empty ${cls}" aria-hidden="true"></span>`;
    };
    this.dialog.innerHTML = `
      <header class="report__bar">
        <p class="mono report__crumb"><span class="accent">${e.code}</span><span class="dim">·</span>LAB REPORT<span class="dim report__count">${pad(i + 1)} / ${pad(experiments.length)}</span></p>
        <button type="button" class="report__close mono" data-close data-cursor aria-label="Close report">close <span aria-hidden="true">✕</span></button>
        <i class="report__progress" aria-hidden="true"></i>
      </header>
      <div class="report__inner">
        <h2 id="report-title" class="report__title">${esc(e.title)}</h2>
        <p class="report__lede">${esc(e.summary)}</p>

        <dl class="report__meta mono">
          <div><dt>Status</dt><dd><i class="live-dot"></i>${esc(e.status)}</dd></div>
          <div><dt>Area</dt><dd>${esc(area)}</dd></div>
          ${focus ? `<div><dt>Focus</dt><dd>${esc(focus)}</dd></div>` : ''}
          <div><dt>Stack</dt><dd>${e.stack.length} tools</dd></div>
        </dl>

        <section class="report__sec">
          <h3 class="mono"><span>01</span>Objective</h3>
          <p class="report__objective">${esc(e.objective)}</p>
        </section>

        <section class="report__sec report__build">
          <h3 class="mono"><span>02</span>Build log</h3>
          <ol>${e.build.map((b, k) => `<li><span class="mono report__step">${pad(k + 1)}</span><p>${esc(b)}</p></li>`).join('')}</ol>
        </section>

        <section class="report__sec">
          <h3 class="mono"><span>03</span>Outcome</h3>
          <p class="report__outcome">${esc(e.outcome)}</p>
        </section>

        <section class="report__sec">
          <h3 class="mono"><span>04</span>Stack</h3>
          <ul class="chips report__chips">${e.stack.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
        </section>

        <p class="mono dim report__note">Client names withheld · use ← → to browse projects</p>

        <nav class="report__navs" aria-label="Other projects">
          ${navBtn(i - 1, '← Previous', 'report__nav--prev')}
          ${navBtn(i + 1, 'Next →', 'report__nav--next')}
        </nav>
      </div>`;
    this.progress();
    this.onShow(i);
  }

  private animateIn(dir: number) {
    if (this.reduced) return;
    const inner = this.dialog.querySelector('.report__inner');
    if (dir === 0) {
      gsap.fromTo(inner, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: 'expo.out' });
    } else {
      gsap.fromTo(inner, { x: 32 * dir, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5, ease: 'expo.out' });
    }
    gsap.fromTo(
      this.dialog.querySelectorAll('.report__meta, .report__sec'),
      { opacity: 0, y: 14 },
      { opacity: 1, y: 0, stagger: 0.06, delay: 0.12, duration: 0.55, ease: 'power3.out', clearProps: 'transform' },
    );
  }

  private progress() {
    const max = this.dialog.scrollHeight - this.dialog.clientHeight;
    const p = max > 0 ? this.dialog.scrollTop / max : 0;
    this.dialog.querySelector<HTMLElement>('.report__progress')?.style.setProperty('--p', p.toFixed(3));
  }

  close() {
    if (!this.dialog.open) return;
    const done = () => {
      this.dialog.close();
      this.onOpenChange(false);
      this.index = -1;
      this.lastFocus?.focus({ preventScroll: true });
    };
    if (this.reduced) return done();
    gsap.to(this.dialog.querySelector('.report__inner'), { opacity: 0, y: 20, duration: 0.3, ease: 'power2.in', onComplete: done });
  }

  get isOpen() {
    return this.dialog.open;
  }

  get current() {
    return this.index;
  }
}
