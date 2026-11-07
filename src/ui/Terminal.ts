/** Types the "currently evolving" lines when the panel comes into view. */
export function observeTerminal(reduced: boolean) {
  const body = document.querySelector<HTMLElement>('.term__body');
  if (!body) return;
  const lines = [...body.querySelectorAll<HTMLElement>('.term__line')];
  if (reduced) return;
  lines.forEach((l) => l.classList.add('is-pending'));
  const io = new IntersectionObserver(
    async (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      for (const l of lines) {
        const text = l.querySelector<HTMLElement>('.term__text')!;
        const full = l.dataset.text ?? '';
        text.textContent = '';
        l.classList.remove('is-pending');
        for (let i = 1; i <= full.length; i++) {
          text.textContent = full.slice(0, i);
          await new Promise((r) => setTimeout(r, 14 + Math.random() * 22));
        }
        await new Promise((r) => setTimeout(r, 260));
      }
    },
    { threshold: 0.4 },
  );
  io.observe(body);
}
