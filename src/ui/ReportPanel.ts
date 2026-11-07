import { gsap } from 'gsap';
import { experiments } from '../content/resume';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** A "lab report" for one experiment, shown in a native <dialog>. */
export class ReportPanel {
  private dialog = document.querySelector<HTMLDialogElement>('dialog.report')!;
  private lastFocus: HTMLElement | null = null;
  onOpenChange: (open: boolean) => void = () => {};

  constructor(private reduced: boolean) {
    this.dialog.addEventListener('click', (e) => {
      if (e.target === this.dialog || (e.target as HTMLElement).closest('[data-close]')) this.close();
    });
    this.dialog.addEventListener('cancel', (e) => {
      e.preventDefault();
      this.close();
    });
  }

  open(i: number) {
    const e = experiments[i];
    if (!e) return;
    this.lastFocus = document.activeElement as HTMLElement;
    this.dialog.innerHTML = `
      <div class="report__inner">
        <header class="report__head">
          <p class="mono"><span class="accent">${e.code}</span> <span class="dim">·</span> LAB REPORT <span class="dim">·</span> ${esc(e.domain.toUpperCase())}</p>
          <button type="button" class="report__close mono" data-close data-cursor aria-label="Close report">close ✕</button>
        </header>
        <h2 id="report-title" class="report__title">${esc(e.title)}</h2>
        <p class="mono report__status"><i class="live-dot"></i>${esc(e.status.toUpperCase())}</p>
        <div class="report__grid">
          <section><h3 class="mono">01 / Objective</h3><p>${esc(e.objective)}</p></section>
          <section class="report__build"><h3 class="mono">02 / Build log</h3><ol>${e.build.map((b) => `<li>${esc(b)}</li>`).join('')}</ol></section>
          <section><h3 class="mono">03 / Outcome</h3><p>${esc(e.outcome)}</p></section>
          <section><h3 class="mono">04 / Apparatus</h3><ul class="chips">${e.stack.map((s) => `<li>${esc(s)}</li>`).join('')}</ul></section>
        </div>
        <p class="mono dim report__note">Client names withheld.</p>
      </div>`;
    this.dialog.showModal();
    this.onOpenChange(true);
    if (!this.reduced) {
      gsap.fromTo(this.dialog.querySelector('.report__inner'), { y: 40, opacity: 0, clipPath: 'inset(0 0 100% 0)' }, { y: 0, opacity: 1, clipPath: 'inset(0 0 0% 0)', duration: 0.8, ease: 'expo.out' });
      gsap.fromTo(this.dialog.querySelectorAll('.report__grid > section'), { opacity: 0, y: 16 }, { opacity: 1, y: 0, stagger: 0.07, delay: 0.2, duration: 0.6, ease: 'power3.out' });
    }
    this.dialog.querySelector<HTMLElement>('.report__close')!.focus();
  }

  close() {
    if (!this.dialog.open) return;
    const done = () => {
      this.dialog.close();
      this.onOpenChange(false);
      this.lastFocus?.focus({ preventScroll: true });
    };
    if (this.reduced) return done();
    gsap.to(this.dialog.querySelector('.report__inner'), { opacity: 0, y: 20, duration: 0.3, ease: 'power2.in', onComplete: done });
  }

  get isOpen() {
    return this.dialog.open;
  }
}
