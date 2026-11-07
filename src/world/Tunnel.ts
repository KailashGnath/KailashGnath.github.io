import * as THREE from 'three';
import { JOURNEY_END } from '../core/CameraRig';

interface Ring {
  line: THREE.LineLoop;
  mat: THREE.LineBasicMaterial;
  base: number;
  z: number;
  spin: number;
}

/**
 * A corridor of hexagonal rings along the whole journey. Faint while you read,
 * bright and streaming past while you travel between sections.
 */
export class Tunnel {
  readonly group = new THREE.Group();
  private rings: Ring[] = [];
  private arcs: { mesh: THREE.Line; mat: THREE.LineBasicMaterial; spin: number; z: number }[] = [];
  private railMat: THREE.LineBasicMaterial;
  private glow = 0;

  constructor() {
    const hex: THREE.Vector3[] = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
      hex.push(new THREE.Vector3(Math.cos(a), Math.sin(a), 0));
    }
    const hexGeo = new THREE.BufferGeometry().setFromPoints(hex);
    const start = 4;
    const end = JOURNEY_END - 24;
    const gap = 2.2;
    const count = Math.ceil((start - end) / gap);

    const arcPts: THREE.Vector3[] = [];
    for (let k = 0; k <= 20; k++) {
      const a = (k / 20) * Math.PI * 0.6;
      arcPts.push(new THREE.Vector3(Math.cos(a) * 3.0, Math.sin(a) * 3.0, 0));
    }
    const arcGeo = new THREE.BufferGeometry().setFromPoints(arcPts);

    for (let i = 0; i < count; i++) {
      const z = start - i * gap;
      const major = i % 4 === 0;
      const mat = new THREE.LineBasicMaterial({ color: major ? '#6CF0FF' : '#3d6d75', transparent: true, opacity: 0, depthWrite: false });
      const line = new THREE.LineLoop(hexGeo, mat);
      const r = 3.4 + Math.sin(i * 0.7) * 0.25;
      line.scale.set(r, r * 0.92, 1);
      line.position.set(0, 0, z);
      line.rotation.z = i * 0.06;
      this.group.add(line);
      this.rings.push({ line, mat, base: major ? 0.9 : 0.5, z, spin: (i % 2 ? 1 : -1) * 0.05 });

      if (i % 3 === 1) {
        const am = new THREE.LineBasicMaterial({ color: '#FFB547', transparent: true, opacity: 0, depthWrite: false });
        const arc = new THREE.Line(arcGeo, am);
        arc.position.z = z;
        this.group.add(arc);
        this.arcs.push({ mesh: arc, mat: am, spin: 0.25 + (i % 5) * 0.05, z });
      }
    }

    // Rails running the length of the corridor.
    const rails: number[] = [];
    hex.forEach((p) => rails.push(p.x * 3.5, p.y * 3.2, start, p.x * 3.5, p.y * 3.2, end));
    const rg = new THREE.BufferGeometry();
    rg.setAttribute('position', new THREE.Float32BufferAttribute(rails, 3));
    this.railMat = new THREE.LineBasicMaterial({ color: '#2a4a50', transparent: true, opacity: 0, depthWrite: false });
    this.group.add(new THREE.LineSegments(rg, this.railMat));
  }

  /** Narrow (portrait) screens: squeeze the corridor so the rings stay in view. */
  setAspect(aspect: number) {
    this.group.scale.x = Math.min(1, Math.max(0.5, aspect * 1.25));
  }

  /** `speed` is 0..1 travel speed; the corridor lights up while you move. */
  update(dt: number, time: number, cameraZ: number, speed: number, reduced: boolean) {
    const target = reduced ? 0 : speed;
    // Light up fast, dim slowly so a flight leaves an afterglow.
    this.glow += (target - this.glow) * (1 - Math.exp(-dt * (target > this.glow ? 8 : 1.6)));
    const level = 0.12 + this.glow * 0.88;
    const spinBoost = 1 + this.glow * 6;

    for (const r of this.rings) {
      const d = r.z - cameraZ; // negative = in front
      const fade = smoothstep(4, -1, d) * smoothstep(-34, -8, d);
      r.mat.opacity = r.base * level * fade;
      r.line.visible = fade > 0.001;
      if (!reduced && r.line.visible) r.line.rotation.z += r.spin * dt * spinBoost;
    }
    for (const a of this.arcs) {
      const d = a.z - cameraZ;
      const fade = smoothstep(4, -1, d) * smoothstep(-34, -8, d);
      a.mat.opacity = 0.8 * (0.35 + this.glow * 0.65) * fade;
      a.mesh.visible = fade > 0.001;
      a.mesh.rotation.z = reduced ? 0 : time * a.spin;
    }
    this.railMat.opacity = 0.25 + this.glow * 0.45;
  }
}

function smoothstep(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
