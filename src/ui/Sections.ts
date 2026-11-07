import { profile, stages, experiments, skillGroups, credentials, evolving, about } from '../content/resume';

export const CHAMBERS = [
  { id: 'hero', code: 'CH.00', name: 'Hello' },
  { id: 'evolution', code: 'CH.01', name: 'Career log' },
  { id: 'experiments', code: 'CH.02', name: 'Shipped work' },
  { id: 'toolkit', code: 'CH.03', name: 'Toolkit' },
  { id: 'about', code: 'CH.04', name: 'Off the clock' },
  { id: 'credentials', code: 'CH.05', name: 'Credentials' },
  { id: 'evolving', code: 'CH.06', name: 'Exploring now' },
  { id: 'contact', code: 'CH.07', name: 'Say hello' },
] as const;

export const COPY_HINT = matchMedia('(pointer: coarse)').matches ? 'tap to copy' : 'click to copy';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function eyebrow(i: number, extra = '') {
  const c = CHAMBERS[i];
  return `<p class="eyebrow mono"><span class="accent">${c.code}</span> — ${c.name.toUpperCase()}${extra}</p>`;
}

function hero() {
  return `
  <section id="hero" class="chamber chamber--hero" aria-label="Introduction">
    <div class="hero">
      <p class="eyebrow mono">KOCHI, KERALA <span class="dim">·</span> SHIPPING APPS SINCE 2021</p>
      <h1 class="hero__name" data-scramble>${esc(profile.name)}</h1>
      <p class="hero__role">${esc(profile.role)}<span class="dim"> / </span><span class="hero__focus">${esc(profile.focus)}</span></p>
      <p class="hero__summary">${esc(profile.summary)}</p>
      <dl class="hero__stats mono">
        <div><dt>EXPERIENCE</dt><dd>${profile.years} yrs</dd></div>
        <div><dt>PLATFORMS</dt><dd>iOS · Android</dd></div>
        <div><dt>BASE</dt><dd>Kochi, IN</dd></div>
      </dl>
    </div>
    <div class="scroll-cue mono" aria-hidden="true"><span>scroll — the particles follow along</span><i></i></div>
  </section>`;
}

function evolution() {
  const rail = stages
    .map(
      (s, i) => `<li class="evo__node" data-stage="${i}"><span class="evo__ver mono">${s.version}</span><span class="evo__year mono dim">${s.period.slice(-4) === 'sent' ? 'NOW' : s.period.slice(-4)}</span></li>`,
    )
    .join('');
  const cards = stages
    .map(
      (s, i) => `
      <article class="evo__card" data-stage="${i}">
        <p class="mono evo__meta"><span class="accent">${s.version}</span> <span class="dim">·</span> ${esc(s.period)} <span class="dim">·</span> ${esc(s.mode)}</p>
        <h3 class="evo__role">${esc(s.role)}</h3>
        <p class="evo__org">${esc(s.org)}</p>
        <ul class="evo__notes">${s.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>
        
      </article>`,
    )
    .join('');
  return `
  <section id="evolution" class="chamber chamber--tall" style="--screens:${stages.length + 1}" aria-labelledby="evo-title">
    <div class="sticky">
      <div class="panel panel--left">
        ${eyebrow(1)}
        <h2 id="evo-title" class="chamber__title">From signal <br/>to structure.</h2>
        <p class="lede">Every version shipped something. Every version learned something. Each one has its own shape.</p>
        <ol class="evo__rail" aria-hidden="true">${rail}<span class="evo__track"><i></i></span></ol>
        <div class="evo__cards">${cards}</div>
      </div>
    </div>
  </section>`;
}

function experimentsSection() {
  const cards = experiments
    .map(
      (e, i) => `
      <article class="exp__card" data-exp="${i}" aria-labelledby="exp-${i}-title">
        <p class="mono exp__meta"><span class="accent">${e.code}</span> <span class="dim">·</span> ${esc(e.domain)}</p>
        <h3 id="exp-${i}-title" class="exp__title">${esc(e.title)}</h3>
        <p class="exp__summary">${esc(e.summary)}</p>
        <ul class="chips" aria-label="Stack">${e.stack.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
        <div class="exp__foot">
          <button type="button" class="btn btn--ghost exp__open" data-open="${i}" data-cursor data-cursor-label="OPEN">
            <span class="btn__label">Open lab report</span><span class="btn__key mono" aria-hidden="true">↗</span>
          </button>
          <span class="mono exp__status"><i class="live-dot"></i>${esc(e.status.toUpperCase())}</span>
        </div>
      </article>`,
    )
    .join('');
  const index = experiments
    .map(
      (e, i) => `<li><button type="button" class="exp__jump mono" data-jump="${i}" data-cursor aria-label="Go to ${esc(e.title)}">${e.code.slice(-2)}</button></li>`,
    )
    .join('');
  return `
  <section id="experiments" class="chamber chamber--tall" style="--screens:${experiments.length + 1}" aria-labelledby="exp-title">
    <div class="sticky">
      <div class="panel panel--left">
        ${eyebrow(2)}
        <h2 id="exp-title" class="chamber__title">Experiments <br/>that shipped.</h2>
        <div class="exp__cards">${cards}</div>
        <ol class="exp__index" aria-label="Experiments">${index}</ol>
      </div>
    </div>
  </section>`;
}

function toolkit() {
  const groups = skillGroups
    .map(
      (g, i) => `
      <li class="tk__group" data-cluster="${i}">
        <button type="button" class="tk__btn" data-cluster-btn="${i}" data-cursor aria-expanded="false">
          <span class="mono accent">${String(i + 1).padStart(2, '0')}</span>
          <span class="tk__label">${esc(g.label)}</span>
          <span class="mono dim tk__count">${g.skills.length}</span>
        </button>
        <ul class="chips tk__skills">${g.skills.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
      </li>`,
    )
    .join('');
  return `
  <section id="toolkit" class="chamber chamber--tall" style="--screens:2.6" aria-labelledby="tk-title">
    <div class="sticky">
      <div class="panel panel--left panel--narrow">
        ${eyebrow(3)}
        <h2 id="tk-title" class="chamber__title">A constellation <br/>of tools.</h2>
        <p class="lede">Each cluster is a discipline. Hover one and the particles take its shape.</p>
        <ol class="tk__list">${groups}</ol>
      </div>
    </div>
    <div class="star-labels" aria-hidden="true"></div>
  </section>`;
}

function aboutSection() {
  const items = about.interests
    .map(
      (it, i) => `
      <li class="ab__item" data-interest="${i}">
        <button type="button" class="ab__btn" data-cursor aria-expanded="false" aria-controls="ab-note-${i}">
          <span class="mono accent">${String(i + 1).padStart(2, '0')}</span>
          <span class="ab__title">${esc(it.title)}</span>
          <span class="mono dim ab__label">${esc(it.label)}</span>
        </button>
        <p class="ab__note" id="ab-note-${i}">${esc(it.note)}</p>
      </li>`,
    )
    .join('');
  const facts = about.facts.map((f) => `<li>${esc(f)}</li>`).join('');
  return `
  <section id="about" class="chamber chamber--tall" style="--screens:${about.interests.length + 1}" aria-labelledby="about-title">
    <div class="sticky">
      <div class="panel panel--left">
        ${eyebrow(4)}
        <h2 id="about-title" class="chamber__title">The person <br/>behind the commits.</h2>
        <p class="lede ab__intro">${esc(about.intro)}</p>
        <ol class="ab__list">${items}</ol>
        <ul class="ab__facts mono">${facts}</ul>
      </div>
    </div>
  </section>`;
}

function credentialsSection() {
  const cards = credentials
    .map(
      (c) => `
      <li class="cred" data-cursor>
        <span class="mono cred__code">${c.code}</span>
        <span class="cred__title">${esc(c.title)}</span>
        <span class="mono cred__issuer">${esc(c.issuer)}</span>
        <span class="cred__sheen" aria-hidden="true"></span>
      </li>`,
    )
    .join('');
  return `
  <section id="credentials" class="chamber chamber--center" aria-labelledby="cred-title">
    <div class="panel panel--center">
      ${eyebrow(5)}
      <h2 id="cred-title" class="chamber__title">Calibrated &amp; certified.</h2>
      <ul class="cred__grid">${cards}</ul>
    </div>
  </section>`;
}

function evolvingSection() {
  const lines = evolving
    .map((l) => `<li class="term__line" data-text="${esc(l.text)}"><span class="mono term__tag">[${l.tag}]</span> <span class="term__text">${esc(l.text)}</span></li>`)
    .join('');
  return `
  <section id="evolving" class="chamber" aria-labelledby="evolving-title">
    <div class="panel panel--left">
      ${eyebrow(6)}
      <h2 id="evolving-title" class="chamber__title">Still compiling.</h2>
      <p class="lede">What I'm learning and building right now — at work and outside it.</p>
      <div class="term">
        <div class="term__head mono"><i></i><i></i><i></i><span>process: kailash --watch</span></div>
        <ol class="term__body mono">${lines}<li class="term__cursor" aria-hidden="true">▍</li></ol>
      </div>
    </div>
  </section>`;
}

function contact() {
  const year = new Date().getFullYear();
  return `
  <section id="contact" class="chamber chamber--contact" aria-labelledby="contact-title">
    <div class="panel panel--left">
      ${eyebrow(7)}
      <h2 id="contact-title" class="chamber__title chamber__title--xl" data-scramble>Say hello.</h2>
      <p class="lede">Building something for iOS and Android — or something that makes builders faster? Let's talk.</p>
      <div class="channels">
        <button type="button" class="channel channel--email" data-copy="${esc(profile.email)}" data-cursor data-cursor-label="COPY">
          <span class="mono channel__k">EMAIL</span>
          <span class="channel__v">${esc(profile.email)}</span>
          <span class="mono channel__hint" aria-live="polite">${COPY_HINT}</span>
        </button>
        <a class="channel" href="${profile.linkedin}" target="_blank" rel="noopener" data-cursor data-cursor-label="OPEN">
          <span class="mono channel__k">LINKEDIN</span><span class="channel__v">in/kailash-g</span><span class="mono channel__hint">↗</span>
        </a>
        <a class="channel" href="${profile.github}" target="_blank" rel="noopener" data-cursor data-cursor-label="OPEN">
          <span class="mono channel__k">GITHUB</span><span class="channel__v">@kailashGN</span><span class="mono channel__hint">↗</span>
        </a>
      </div>
    </div>
    <footer class="site-foot mono">
      <span>© ${year} ${esc(profile.name)}</span>
      <span class="dim">Built with Three.js · <span class="build-tag">lab build v4.5</span></span>
      <span class="dim">Press <kbd>\`</kbd> for the console</span>
    </footer>
  </section>`;
}

export function renderSections(main: HTMLElement) {
  main.innerHTML = [hero(), evolution(), experimentsSection(), toolkit(), aboutSection(), credentialsSection(), evolvingSection(), contact()].join('');
  return CHAMBERS.map((c) => document.getElementById(c.id)!) as HTMLElement[];
}
