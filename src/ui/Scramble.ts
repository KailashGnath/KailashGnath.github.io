const GLYPHS = '!<>-_\\/[]{}—=+*^?#01ABCDEFX';

/** Decodes an element's text from noise to the real string. */
export function scramble(el: HTMLElement, duration = 1.2, reduced = false): Promise<void> {
  const final = el.dataset.text ?? el.textContent ?? '';
  el.dataset.text = final;
  el.setAttribute('aria-label', final);
  if (reduced) {
    el.textContent = final;
    return Promise.resolve();
  }
  const start = performance.now();
  const order = [...final].map(() => Math.random() * 0.7);
  return new Promise((resolve) => {
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / (duration * 1000));
      let out = '';
      for (let i = 0; i < final.length; i++) {
        const ch = final[i];
        if (ch === ' ' || p >= order[i] + 0.3) out += ch;
        else if (p >= order[i]) out += GLYPHS[(Math.random() * GLYPHS.length) | 0];
        else out += ' ';
      }
      el.textContent = out;
      if (p < 1) requestAnimationFrame(step);
      else {
        el.textContent = final;
        resolve();
      }
    };
    requestAnimationFrame(step);
  });
}

/** Scramble [data-scramble] elements once as they come into view. */
export function observeScramble(root: ParentNode, reduced: boolean) {
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          io.unobserve(e.target);
          scramble(e.target as HTMLElement, 1.1, reduced);
        }
      }
    },
    { threshold: 0.6 },
  );
  root.querySelectorAll<HTMLElement>('[data-scramble]:not(.hero__name)').forEach((el) => io.observe(el));
}
