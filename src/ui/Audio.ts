/** A quiet synthesized ambience. No audio files. Off unless the visitor opts in. */
export class LabAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  enabled = false;

  private ensure() {
    if (this.ctx) return this.ctx;
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    const ctx = new Ctx();
    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    filter.Q.value = 6;
    filter.connect(master);

    [55, 82.41, 110.3].forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = i === 1 ? 'triangle' : 'sine';
      o.frequency.value = f;
      o.detune.value = (i - 1) * 6;
      const g = ctx.createGain();
      g.gain.value = i === 2 ? 0.08 : 0.22;
      o.connect(g).connect(filter);
      o.start();
    });
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.05;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 180;
    lfo.connect(lfoGain).connect(filter.frequency);
    lfo.start();

    this.ctx = ctx;
    this.master = master;
    return ctx;
  }

  set(on: boolean) {
    this.enabled = on;
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    if (on) ctx.resume();
    const now = ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(on ? 0.09 : 0, now, on ? 1.2 : 0.3);
  }

  blip(freq = 880) {
    if (!this.enabled || !this.ctx || !this.master) return;
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = freq;
    g.gain.value = 0;
    o.connect(g).connect(ctx.destination);
    const t = ctx.currentTime;
    g.gain.linearRampToValueAtTime(0.025, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    o.start(t);
    o.stop(t + 0.2);
  }
}
