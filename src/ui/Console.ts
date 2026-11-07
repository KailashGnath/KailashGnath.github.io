import { profile, experiments, skillGroups, stages } from '../content/resume';
import { CHAMBERS } from './Sections';

/** A hidden lab console. Press ` (backtick) or the >_ button. */
export class LabConsole {
  private root = document.querySelector<HTMLElement>('.console')!;
  private out = this.root.querySelector<HTMLElement>('.console__out')!;
  private form = this.root.querySelector<HTMLFormElement>('.console__form')!;
  private input = this.root.querySelector<HTMLInputElement>('.console__input')!;
  private history: string[] = [];
  private hIndex = 0;
  private greeted = false;

  constructor(
    private actions: { goto: (id: string) => void; openReport: (i: number) => void; pulse: () => void; visits: number },
  ) {
    window.addEventListener('keydown', (e) => {
      const typing = (e.target as HTMLElement).closest('input, textarea');
      if ((e.key === '`' || e.key === '~') && (!typing || e.target === this.input)) {
        e.preventDefault();
        this.toggle();
      } else if (e.key === 'Escape' && !this.root.hidden) {
        this.toggle(false);
      }
    });
    document.querySelector('.hud__console-btn')!.addEventListener('click', () => this.toggle());
    this.root.querySelector('.console__close')!.addEventListener('click', () => this.toggle(false));
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      const cmd = this.input.value.trim();
      this.input.value = '';
      if (cmd) {
        this.history.push(cmd);
        this.hIndex = this.history.length;
      }
      this.print(`<span class="accent">›</span> ${escapeHtml(cmd)}`);
      this.exec(cmd);
    });
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowUp' && this.hIndex > 0) this.input.value = this.history[--this.hIndex] ?? '';
      if (e.key === 'ArrowDown') this.input.value = this.history[++this.hIndex] ?? '';
    });
  }

  toggle(force?: boolean) {
    const open = force ?? this.root.hidden;
    this.root.hidden = !open;
    if (open) {
      if (!this.greeted) {
        this.greeted = true;
        this.print(`lab.console — session ${String(this.actions.visits).padStart(2, '0')}. type <span class="accent">help</span>.`);
      }
      this.input.focus();
    }
  }

  private print(html: string) {
    const p = document.createElement('p');
    p.innerHTML = html;
    this.out.appendChild(p);
    this.out.scrollTop = this.out.scrollHeight;
  }

  private exec(raw: string) {
    const [cmd, ...args] = raw.toLowerCase().split(/\s+/);
    const arg = args.join(' ');
    switch (cmd) {
      case '':
        return;
      case 'help':
        return this.print(
          ['whoami', 'stack', 'projects', 'open &lt;01-06&gt;', 'history', 'goto &lt;chamber&gt;', 'contact', 'clear', 'exit']
            .map((c) => `<span class="accent">${c}</span>`)
            .join('  '),
        );
      case 'whoami':
        return this.print(`${profile.name} — ${profile.role}. ${profile.years} years. ${profile.location}.`);
      case 'stack':
      case 'skills':
        return skillGroups.forEach((g) => this.print(`<span class="dim">${g.label.padEnd(14, ' ')}</span>${g.skills.join(', ')}`));
      case 'projects':
      case 'ls':
        return experiments.forEach((e) => this.print(`<span class="accent">${e.code}</span> ${e.title} <span class="dim">— ${e.status}</span>`));
      case 'open': {
        const n = parseInt(arg.replace(/\D/g, ''), 10);
        if (n >= 1 && n <= experiments.length) {
          this.toggle(false);
          return this.actions.openReport(n - 1);
        }
        return this.print('usage: open 01..06');
      }
      case 'history':
      case 'log':
        return stages.forEach((s) => this.print(`<span class="accent">${s.version}</span> ${s.role} @ ${s.org} <span class="dim">(${s.period})</span>`));
      case 'goto':
      case 'cd': {
        const c = CHAMBERS.find((c) => c.id.startsWith(arg) || c.name.toLowerCase().startsWith(arg) || c.code.toLowerCase().endsWith(arg));
        if (!c || !arg) return this.print(`chambers: ${CHAMBERS.map((c) => c.id).join(', ')}`);
        this.toggle(false);
        return this.actions.goto(c.id);
      }
      case 'contact':
      case 'email':
        return this.print(
          `<a href="mailto:${profile.email}">${profile.email}</a> · <a href="${profile.linkedin}" target="_blank" rel="noopener">linkedin</a> · <a href="${profile.github}" target="_blank" rel="noopener">github</a>`,
        );
      case 'sudo':
        if (arg.includes('hire')) {
          this.actions.pulse();
          return this.print('<span class="live">permission granted.</span> routing you to the channel…'), setTimeout(() => this.actions.goto('contact'), 700);
        }
        return this.print('nice try.');
      case 'clear':
        this.out.innerHTML = '';
        return;
      case 'exit':
      case 'quit':
        return this.toggle(false);
      default:
        return this.print(`command not found: ${escapeHtml(cmd)}. try <span class="accent">help</span>`);
    }
  }
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
