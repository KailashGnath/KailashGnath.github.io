import * as THREE from 'three';
import type { Experience } from '../core/Experience';

interface Note {
  el: HTMLElement;
  line: SVGPathElement;
  dot: SVGCircleElement;
  local: THREE.Vector3;
  side: 1 | -1;
  width: number;
}

/**
 * Small hand-written callouts pinned to the active shape
 * ("Tyson — German Shepherd", "v0.1 — fixing records in live systems").
 */
export class ShapeNotes {
  private root = document.querySelector<HTMLElement>('.shape-notes')!;
  private svg = this.root.querySelector<SVGSVGElement>('svg')!;
  private notes: Note[] = [];
  private tmp = { x: 0, y: 0, visible: false };
  private world = new THREE.Vector3();
  private timer = 0;
  private enabled = true;

  /** Phones get one compact note per shape instead of the full set. */
  private compact = false;

  constructor(private exp: Experience) {
    const mq = matchMedia('(max-width: 899px)');
    this.compact = mq.matches;
    mq.addEventListener('change', () => {
      this.compact = mq.matches;
      this.show();
    });
  }

  /** Called when the swarm changes shape. Notes appear once the shape has formed. */
  show() {
    this.clear();
    clearTimeout(this.timer);
    if (!this.enabled) return;
    this.timer = window.setTimeout(() => this.build(), 1100);
  }

  private clear() {
    this.notes.forEach((n) => {
      n.el.remove();
      n.line.remove();
      n.dot.remove();
    });
    this.notes = [];
  }

  private build() {
    const ns = 'http://www.w3.org/2000/svg';
    const all = this.exp.swarm.notes();
    this.root.classList.toggle('is-compact', this.compact);
    this.notes = (this.compact ? all.slice(0, 1) : all).map((n, i) => {
      const el = document.createElement('span');
      el.className = 'shape-note';
      el.textContent = n.text;
      el.style.transitionDelay = `${0.35 + i * 0.15}s`;
      this.root.appendChild(el);
      const line = document.createElementNS(ns, 'path');
      line.setAttribute('class', 'shape-note__line');
      line.style.animationDelay = `${i * 0.15}s`;
      const dot = document.createElementNS(ns, 'circle');
      dot.setAttribute('r', '2.5');
      dot.setAttribute('class', 'shape-note__dot');
      this.svg.append(line, dot);
      return { el, line, dot, local: n.local, side: n.local.x >= 0 ? 1 : -1, width: 0 } as Note;
    });
    this.update();
    requestAnimationFrame(() => this.notes.forEach((n) => n.el.classList.add('is-on')));
  }

  /** Re-pin to the (moving, swaying) shape every frame. */
  update() {
    // Notes fade with the swarm (e.g. while text scrolls over it on phones).
    this.root.style.opacity = String(Math.min(1, this.exp.visibility * 1.2));
    if (!this.notes.length) return;
    const frame = this.exp.swarm.frame;
    for (const n of this.notes) {
      this.world.copy(n.local).applyMatrix4(frame.matrixWorld);
      this.exp.project(this.world, this.tmp);
      const ax = this.tmp.x;
      const ay = this.tmp.y;
      // Keep labels on screen: flip to the other side when they'd run off the edge.
      n.width ||= n.el.offsetWidth;
      const pad = this.compact ? 12 : 40;
      if (n.side > 0 && ax + 80 + n.width > innerWidth - pad) n.side = -1;
      else if (n.side < 0 && ax - 80 - n.width < pad) n.side = 1;
      // Leader line: a short hand-drawn hook out and up.
      const reach = this.compact ? 0.6 : 1;
      // Hook up and out — or down if that would run under the header.
      const up = ay - 34 * reach > (this.compact ? 96 : 70);
      let lx = ax + n.side * 46 * reach;
      const ly = ay + (up ? -34 : 34) * reach;
      let tx = lx + n.side * 18 * reach;
      if (this.compact) {
        // Phones: keep the whole label on screen.
        const pad = 12;
        tx = n.side > 0 ? Math.min(tx, innerWidth - pad - n.width - 8) : Math.max(tx, pad + n.width + 8);
        // Pushed inward: end the hook at the label instead of running under it.
        if ((tx - lx) * n.side < 0) lx = tx;
      }
      n.line.setAttribute('d', `M${ax.toFixed(1)} ${ay.toFixed(1)} Q${(ax + n.side * 10).toFixed(1)} ${(ly + 4).toFixed(1)} ${lx.toFixed(1)} ${ly.toFixed(1)} L${tx.toFixed(1)} ${ly.toFixed(1)}`);
      n.dot.setAttribute('cx', ax.toFixed(1));
      n.dot.setAttribute('cy', ay.toFixed(1));
      const labelX = n.side > 0 ? tx + 8 : tx - 8;
      n.el.style.transform = `translate3d(${labelX.toFixed(1)}px, ${ly.toFixed(1)}px, 0) translate(${n.side > 0 ? '0' : '-100%'}, -50%)`;
      const vis = this.tmp.visible ? '' : 'hidden';
      n.el.style.visibility = vis;
      n.line.style.visibility = vis;
      n.dot.style.visibility = vis;
    }
  }
}
