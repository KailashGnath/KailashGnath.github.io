import '@fontsource/geist-sans/300.css';
import '@fontsource/geist-sans/400.css';
import '@fontsource/geist-sans/500.css';
import '@fontsource/geist-mono/400.css';
import '@fontsource/geist-mono/500.css';
import 'lenis/dist/lenis.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/hud.css';
import './styles/sections.css';
import './styles/overlays.css';

import { gsap } from 'gsap';
import { renderSections, COPY_HINT } from './ui/Sections';
import { stepInner, chamberStep } from './core/steps';
import { Scroll } from './core/Scroll';
import { getQuality, supportsWebGL } from './core/Quality';
import { Intro } from './ui/Intro';
import { Hud } from './ui/Hud';
import { Cursor } from './ui/Cursor';
import { scramble, observeScramble } from './ui/Scramble';
import { ReportPanel } from './ui/ReportPanel';
import { LabConsole } from './ui/Console';
import { LabAudio } from './ui/Audio';
import { loadMemory, saveMemory, hueShiftFor } from './ui/Memory';
import { observeTerminal } from './ui/Terminal';
import { ShapeNotes } from './ui/ShapeNotes';
import { StarLabels } from './ui/StarLabels';
import { stages, experiments, skillGroups, about } from './content/resume';
import type { Experience } from './core/Experience';
import { EXPERIMENT_SHAPES } from './core/ShapeDirector';

// Tell the index.html safety net we're alive (it shows a plain page if this never runs).
(window as unknown as { __labStarted: boolean }).__labStarted = true;

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const root = document.documentElement;
if (reduced) root.classList.add('reduced-motion');

const main = document.getElementById('main')!;
const sections = renderSections(main);
const memory = loadMemory();
const webgl = supportsWebGL();
if (!webgl) root.classList.add('no-webgl');

const scroll = new Scroll(sections, !reduced);
scroll.enableSnap({ evolution: stages.length, experiments: experiments.length, toolkit: skillGroups.length, about: about.interests.length });
window.scrollTo(0, 0);
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

const audio = new LabAudio();
const soundBtn = document.querySelector<HTMLButtonElement>('.hud__sound')!;
const cursor = new Cursor(() => audio.blip(1320));
const hud = new Hud(scroll);
const report = new ReportPanel(reduced);
const intro = new Intro(reduced);

let exp = null as Experience | null;
let notes: ShapeNotes | null = null;
let labels: StarLabels | null = null;

// --- Intro: the name in particles, then straight into the page -------------

const returning = memory.visits > 1;

/** The loading screen's status line shows the real boot step. */
const statusEl = document.querySelector<HTMLElement>('#intro [data-status]');
const bootStatus = (text: string) => {
  if (statusEl) statusEl.textContent = text;
};
// Let the status paint before the next (possibly blocking) step starts.
const nextPaint = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));

async function bootRenderer() {
  if (!webgl) return;
  try {
    // The name is sampled from Geist; give the font a moment, but never wait long.
    bootStatus('loading type');
    await Promise.race([document.fonts.load('500 96px "Geist Sans"'), new Promise((r) => setTimeout(r, 900))]);
    bootStatus('building the scene');
    const { Experience } = await import('./core/Experience');
    bootStatus('growing ' + getQuality().particles.toLocaleString() + ' particles');
    await nextPaint();
    // Build the two shapes the intro needs one at a time, letting the loader breathe in between.
    const { getShape } = await import('./world/shapes/library');
    const n = Math.round(Math.sqrt(getQuality().particles)) ** 2;
    for (const id of ['name', 'phone']) {
      getShape(id, n);
      await nextPaint();
    }
    const e = new Experience(document.getElementById('webgl') as HTMLCanvasElement, getQuality(), scroll, reduced, hueShiftFor(memory.visits));
    if (reduced) e.swarm.snap();
    else e.setIntro(true);
    bootStatus('compiling shaders');
    await nextPaint();
    await e.warmup();
    bootStatus('entering');
    e.start();
    exp = e;
  } catch (err) {
    console.warn('Renderer unavailable, falling back to text mode.', err);
    root.classList.add('no-webgl');
  }
}

const booting = bootRenderer();
await Promise.race([booting, intro.done]);
intro.handoff();
if (exp && !reduced) intro.play(returning ? 700 : 1500, returning ? 400 : 1000);
else intro.finish();
await intro.done;

// --- Enter --------------------------------------------------------------------

function enter() {
  exp?.setIntro(false);
  root.classList.remove('is-intro');
  root.classList.add('is-entered');
  if (!reduced) {
    gsap.from('.hero > *:not(.hero__name)', { opacity: 0, y: 18, stagger: 0.1, duration: 1, delay: 0.25, ease: 'power3.out', clearProps: 'all' });
  }
  scramble(document.querySelector<HTMLElement>('.hero__name')!, 1.4, reduced);
  observeScramble(main, reduced);
  observeTerminal(reduced);
}
enter();
// Pre-build the other shapes once the intro has settled, so they never steal intro frames.
setTimeout(() => exp?.swarm.prewarm(), 1500);


// --- Wiring -------------------------------------------------------------------

const evoCards = [...document.querySelectorAll<HTMLElement>('.evo__card')];
const evoNodes = [...document.querySelectorAll<HTMLElement>('.evo__node')];
const evoTrack = document.querySelector<HTMLElement>('.evo__track i')!;
const expCards = [...document.querySelectorAll<HTMLElement>('.exp__card')];
const expJumps = [...document.querySelectorAll<HTMLButtonElement>('.exp__jump')];
const tkGroups = [...document.querySelectorAll<HTMLElement>('.tk__group')];
const abItems = [...document.querySelectorAll<HTMLElement>('.ab__item')];

let lastStage = -1;
let lastExp = -1;
let lastCluster = -1;
let lastInterest = -1;
const fallbackOverrides = { cluster: -1, interest: -1 };

function setActive(list: HTMLElement[], i: number) {
  list.forEach((el, k) => el.classList.toggle('is-active', k === i));
}

/** Without WebGL, derive section state from scroll directly. */
function fallbackState() {
  const f = scroll.frame;
  const id = sections[f.index]?.id;
  const inner = (name: string) => (id === name ? f.inner : sections.findIndex((s) => s.id === name) < f.index ? 1 : 0);
  return {
    stage: chamberStep(inner('evolution'), stages.length),
    experiment: chamberStep(inner('experiments'), experiments.length),
    cluster: fallbackOverrides.cluster >= 0 ? fallbackOverrides.cluster : Math.round(chamberStep(inner('toolkit'), tkGroups.length)),
    interest: fallbackOverrides.interest >= 0 ? fallbackOverrides.interest : Math.round(chamberStep(inner('about'), abItems.length)),
  };
}

function frame() {
  const s = exp ? exp.state : fallbackState();

  const stage = Math.round(s.stage);
  if (stage !== lastStage) {
    lastStage = stage;
    setActive(evoCards, stage);
    evoNodes.forEach((n, k) => {
      n.classList.toggle('is-active', k === stage);
      n.classList.toggle('is-past', k < stage);
    });
  }
  evoTrack.style.transform = `scaleX(${s.stage / (stages.length - 1)})`;

  const ex = Math.round(s.experiment);
  if (ex !== lastExp) {
    lastExp = ex;
    setActive(expCards, ex);
    expJumps.forEach((b, k) => b.classList.toggle('is-active', k === ex));
  }

  if (s.cluster !== lastCluster) {
    lastCluster = s.cluster;
    tkGroups.forEach((g, k) => {
      g.classList.toggle('is-active', k === s.cluster);
      g.querySelector('button')?.setAttribute('aria-expanded', String(k === s.cluster));
    });
  }

  if (s.interest !== lastInterest) {
    lastInterest = s.interest;
    abItems.forEach((g, k) => {
      g.classList.toggle('is-active', k === s.interest);
      g.querySelector('button')?.setAttribute('aria-expanded', String(k === s.interest));
    });
  }

  notes?.update();

  // Skill names on the constellation while the Toolkit is on screen.
  const f0 = scroll.frame;
  const toolkitIndex = sections.findIndex((x) => x.id === 'toolkit');
  labels?.update(f0.index === toolkitIndex && f0.t < 0.4 && innerWidth > 720);

  // Version readout follows the career log, then locks at the latest.
  const f = scroll.frame;
  const evoIndex = sections.findIndex((x) => x.id === 'evolution');
  const inEvo = f.index === evoIndex || (f.index === evoIndex - 1 && f.t > 0.5);
  hud.update(inEvo ? stages[Math.max(0, stage)].version : stages[stages.length - 1].version);
}

/** Phones: tilt to look around. iOS needs a tap first to ask permission. */
function enableTilt(e: Experience) {
  if (reduced || !matchMedia('(pointer: coarse)').matches) return;
  const DOE = (window as unknown as { DeviceOrientationEvent?: { requestPermission?: unknown } }).DeviceOrientationEvent;
  if (DOE && typeof DOE.requestPermission === 'function') {
    window.addEventListener('touchend', () => e.enableTilt(), { once: true });
  } else e.enableTilt();
}

/** The device can't render the scene even at its lightest: switch to the text version. */
function giveUp() {
  root.classList.add('no-webgl');
  notes = null;
  labels = null;
  document.querySelector('.shape-notes')?.remove();
  exp = null;
  const loop = (t: number) => {
    scroll.update(t);
    frame();
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

function wireScene(e: Experience) {
  e.onGiveUp = giveUp;
  if (import.meta.env.DEV) (window as unknown as { __lab: unknown }).__lab = { exp: e, scroll };
  notes = new ShapeNotes(e);
  labels = new StarLabels(e);
  enableTilt(e);
  e.onFrame = frame;
  e.onShapeChange = () => {
    audio.blip(520 + Math.random() * 380);
    notes?.show();
  };
  notes.show();
}

if (exp) wireScene(exp);
else {
  // No renderer (yet): drive the UI from scroll alone.
  const loop = (t: number) => {
    if (exp) return; // the renderer arrived late; it drives frames now
    scroll.update(t);
    frame();
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  // The visitor skipped the intro before the renderer was ready: hook it up when it lands.
  booting.then(() => {
    if (!exp) return;
    exp.setIntro(false);
    wireScene(exp);
    setTimeout(() => exp?.swarm.prewarm(), 1500);
  });
}

// Experiments: report buttons and jumps.
const expSection = document.getElementById('experiments')!;
function scrollToStep(id: string, i: number, count: number) {
  const m = scroll.metrics.find((x) => x.id === id)!;
  const span = m.exit - m.enter;
  scroll.scrollTo(m.enter + stepInner(i, count) * span + 2);
}
expSection.addEventListener('click', (e) => {
  const t = e.target as HTMLElement;
  const open = t.closest<HTMLElement>('[data-open]');
  if (open) return report.open(Number(open.dataset.open));
  const jump = t.closest<HTMLElement>('[data-jump]');
  if (jump) return scrollToStep('experiments', Number(jump.dataset.jump), experiments.length);
});
let reportFrom = -1;
report.onOpenChange = (open) => {
  // The dialog sits in the top layer; take the cursor with it.
  cursor.mountIn(open ? document.querySelector<HTMLElement>('dialog.report') : null);
  if (open) {
    reportFrom = Math.round(exp?.state.experiment ?? 0);
    scroll.stop();
    return;
  }
  const last = report.current;
  exp?.setFocus('');
  scroll.start();
  // Browsed to another project inside the report: bring the page along so it matches.
  if (last >= 0 && last !== reportFrom) scrollToStep('experiments', last, experiments.length);
};
// The project's particle shape sits beside the report while it's open.
report.onShow = (i) => {
  exp?.setFocus(EXPERIMENT_SHAPES[experiments[i].kind]);
  audio.blip(660 + i * 60);
};

// Toolkit + About: hover/focus an item to take its shape.
function hoverable(items: HTMLElement[], set: (i: number) => void) {
  items.forEach((g, i) => {
    const btn = g.querySelector('button')!;
    const on = () => set(i);
    const off = () => set(-1);
    g.addEventListener('pointerenter', on);
    g.addEventListener('pointerleave', off);
    btn.addEventListener('focus', on);
    btn.addEventListener('blur', off);
    btn.addEventListener('click', on);
  });
}
hoverable(tkGroups, (i) => {
  exp?.setClusterOverride(i);
  fallbackOverrides.cluster = i;
});
hoverable(abItems, (i) => {
  exp?.setInterestOverride(i);
  fallbackOverrides.interest = i;
});

// Contact: copy email.
document.querySelectorAll<HTMLButtonElement>('[data-copy]').forEach((b) => {
  b.addEventListener('click', async () => {
    const hint = b.querySelector<HTMLElement>('.channel__hint')!;
    try {
      await navigator.clipboard.writeText(b.dataset.copy!);
      hint.textContent = 'copied to clipboard';
    } catch {
      window.location.href = `mailto:${b.dataset.copy}`;
      hint.textContent = 'opening mail…';
    }
    exp?.pulse();
    audio.blip(1760);
    setTimeout(() => (hint.textContent = COPY_HINT), 2200);
  });
});

// Sound: off by default, remembered, and only ever started by a gesture.
function setSound(on: boolean) {
  audio.set(on);
  soundBtn.setAttribute('aria-pressed', String(on));
  soundBtn.querySelector('.hud__sound-label')!.textContent = on ? 'SND ON' : 'SND OFF';
  root.classList.toggle('sound-on', on);
}
soundBtn.addEventListener('click', () => {
  const on = !audio.enabled;
  setSound(on);
  memory.sound = on;
  saveMemory(memory);
});
if (memory.sound) {
  const resume = (e: Event) => {
    if ((e.target as HTMLElement).closest?.('.hud__sound')) return; // the toggle handles itself
    setSound(true);
  };
  window.addEventListener('pointerdown', resume, { once: true });
  window.addEventListener('keydown', resume, { once: true });
}

document.querySelector('.build-tag')!.textContent = `build v4.5.${memory.visits}`;

new LabConsole({
  goto: (id) => scroll.scrollTo(document.getElementById(id)!),
  openReport: (i) => report.open(i),
  pulse: () => exp?.pulse(),
  visits: memory.visits,
});

// Deep links (#experiments etc.).
if (location.hash) {
  const target = document.querySelector<HTMLElement>(location.hash);
  if (target) setTimeout(() => scroll.scrollTo(target), 400);
}
