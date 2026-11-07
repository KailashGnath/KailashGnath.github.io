import { CHAMBERS } from './Sections';
import { profile } from '../content/resume';
import type { Scroll } from '../core/Scroll';

/** The instrument frame: section nav, clock, progress, career version. */
export class Hud {
  private code = document.querySelector<HTMLElement>('.hud__section-code')!;
  private name = document.querySelector<HTMLElement>('.hud__section-name')!;
  private progress = document.querySelector<HTMLElement>('.hud__progress')!;
  private version = document.querySelector<HTMLElement>('.hud__version')!;
  private clock = document.querySelector<HTMLElement>('.hud__clock')!;
  private nav = document.querySelector<HTMLElement>('.hud__nav')!;
  private links: HTMLAnchorElement[] = [];
  private last = -1;
  private lastPct = -1;
  private lastVersion = '';

  constructor(private scroll: Scroll) {
    this.nav.innerHTML = CHAMBERS.map(
      (c, i) =>
        `<a href="#${c.id}" class="hud__link mono" data-i="${i}" data-cursor><span class="hud__tick"></span><span class="hud__link-label">${c.code} ${c.name}</span></a>`,
    ).join('');
    this.links = [...this.nav.querySelectorAll<HTMLAnchorElement>('a')];
    const jump = (e: Event) => {
      const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
      if (!a) return;
      const el = document.querySelector<HTMLElement>(a.getAttribute('href')!);
      if (!el) return;
      e.preventDefault();
      this.scroll.scrollTo(el);
      history.replaceState(null, '', a.getAttribute('href'));
    };
    this.nav.addEventListener('click', jump);
    document.querySelector('.hud__brand')!.addEventListener('click', jump);

    const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: profile.timezone, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    const tick = () => (this.clock.textContent = `KOCHI ${fmt.format(new Date())}`);
    tick();
    setInterval(tick, 1000);
  }

  update(versionLabel: string) {
    const i = this.scroll.visibleIndex;
    if (i !== this.last) {
      this.last = i;
      const c = CHAMBERS[i];
      this.code.textContent = c.code;
      this.name.textContent = c.name.toUpperCase();
      this.links.forEach((l, k) => {
        l.classList.toggle('is-active', k === i);
        if (k === i) l.setAttribute('aria-current', 'true');
        else l.removeAttribute('aria-current');
      });
      document.body.dataset.chamber = c.id;
    }
    const pct = Math.round(this.scroll.frame.progress * 100);
    if (pct !== this.lastPct) {
      this.lastPct = pct;
      this.progress.textContent = `${String(pct).padStart(3, '0')}%`;
    }
    if (versionLabel !== this.lastVersion) {
      this.lastVersion = versionLabel;
      this.version.textContent = `BUILD ${versionLabel}`;
    }
  }
}
