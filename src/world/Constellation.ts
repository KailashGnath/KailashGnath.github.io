import * as THREE from 'three';
import type { SkillGroup } from '../content/resume';
import { CONSTELLATION_CENTER } from '../core/CameraRig';

const vert = /* glsl */ `
uniform float uTime;
uniform float uActive;
uniform float uPixelRatio;
uniform float uFade;
attribute float aGroup;
attribute float aRand;
attribute float aMajor;
varying float vAlpha;
varying float vHot;
void main() {
  vec3 p = position;
  p.y += sin(uTime * 0.4 + aRand * 20.0) * 0.05;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float hot = 1.0 - step(0.5, abs(aGroup - uActive));
  vHot = hot;
  float size = mix(2.0 + aRand * 3.0, 9.0 + aRand * 3.0, aMajor);
  size *= 1.0 + hot * aMajor * 0.6;
  gl_PointSize = size * uPixelRatio * (12.0 / -mv.z);
  float tw = 0.7 + 0.3 * sin(uTime * (0.8 + aRand * 2.0) + aRand * 50.0);
  vAlpha = uFade * tw * mix(0.35, 1.0, aMajor) * mix(0.55, 1.0, hot);
}`;

const frag = /* glsl */ `
uniform vec3 uCold;
uniform vec3 uHotColor;
varying float vAlpha;
varying float vHot;
void main() {
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  float a = pow(smoothstep(0.5, 0.0, d), 1.6);
  gl_FragColor = vec4(mix(uCold, uHotColor, vHot), a * vAlpha);
}`;

interface Star {
  group: number;
  label: string;
  pos: THREE.Vector3;
}

export class Constellation {
  readonly group = new THREE.Group();
  readonly stars: Star[] = [];
  private material: THREE.ShaderMaterial;
  private lines: THREE.LineSegments[] = [];
  private active = -1;
  private fade = 0;
  private lineFade: number[] = [];

  constructor(groups: SkillGroup[]) {
    this.group.position.copy(CONSTELLATION_CENTER);
    const centers = [
      new THREE.Vector3(-5.2, 1.6, -1),
      new THREE.Vector3(-1.4, 2.4, 1),
      new THREE.Vector3(2.8, 1.5, -1.5),
      new THREE.Vector3(-3.6, -1.6, 1.2),
      new THREE.Vector3(0.8, -1.4, -0.4),
      new THREE.Vector3(4.8, -1.2, 1),
    ];

    const pos: number[] = [];
    const gAttr: number[] = [];
    const rAttr: number[] = [];
    const major: number[] = [];

    groups.forEach((g, gi) => {
      const c = centers[gi % centers.length];
      const placed: THREE.Vector3[] = [];
      g.skills.forEach((label, si) => {
        const a = (si / g.skills.length) * Math.PI * 2 + gi;
        const r = 0.55 + Math.random() * 0.9;
        const p = new THREE.Vector3(
          c.x + Math.cos(a) * r * 1.3,
          c.y + Math.sin(a) * r * 0.8,
          c.z + (Math.random() - 0.5) * 1.6,
        );
        placed.push(p);
        this.stars.push({ group: gi, label, pos: p });
        pos.push(p.x, p.y, p.z);
        gAttr.push(gi);
        rAttr.push(Math.random());
        major.push(1);
      });
      // Faint field stars around each cluster.
      for (let k = 0; k < 70; k++) {
        const p = new THREE.Vector3().randomDirection().multiplyScalar(0.5 + Math.random() * 2.2);
        p.y *= 0.7;
        p.add(c);
        pos.push(p.x, p.y, p.z);
        gAttr.push(gi);
        rAttr.push(Math.random());
        major.push(0);
      }
      // Nearest-neighbour tree between the cluster's skills.
      const seg: number[] = [];
      for (let i = 1; i < placed.length; i++) {
        let best = 0;
        let bd = Infinity;
        for (let j = 0; j < i; j++) {
          const d = placed[i].distanceToSquared(placed[j]);
          if (d < bd) {
            bd = d;
            best = j;
          }
        }
        seg.push(...placed[i].toArray(), ...placed[best].toArray());
      }
      const lg = new THREE.BufferGeometry();
      lg.setAttribute('position', new THREE.Float32BufferAttribute(seg, 3));
      const line = new THREE.LineSegments(
        lg,
        new THREE.LineBasicMaterial({ color: '#6CF0FF', transparent: true, opacity: 0, depthWrite: false }),
      );
      this.lines.push(line);
      this.lineFade.push(0);
      this.group.add(line);
    });

    // Background dust across the whole chamber.
    for (let k = 0; k < 500; k++) {
      pos.push((Math.random() - 0.5) * 22, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10);
      gAttr.push(-9);
      rAttr.push(Math.random());
      major.push(0);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('aGroup', new THREE.Float32BufferAttribute(gAttr, 1));
    geo.setAttribute('aRand', new THREE.Float32BufferAttribute(rAttr, 1));
    geo.setAttribute('aMajor', new THREE.Float32BufferAttribute(major, 1));
    this.material = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uActive: { value: -1 },
        uPixelRatio: { value: 1 },
        uFade: { value: 0 },
        uCold: { value: new THREE.Color('#9fb7bb') },
        uHotColor: { value: new THREE.Color('#6CF0FF') },
      },
    });
    const points = new THREE.Points(geo, this.material);
    points.frustumCulled = false;
    this.group.add(points);
  }

  setPixelRatio(pr: number) {
    this.material.uniforms.uPixelRatio.value = pr;
  }

  setActive(i: number) {
    this.active = i;
    this.material.uniforms.uActive.value = i;
  }

  /** Squeeze horizontally on narrow screens so clusters stay in frame. */
  setAspect(aspect: number) {
    this.group.scale.x = Math.min(1, Math.max(0.42, aspect / 1.55));
  }

  update(dt: number, time: number, visibility: number) {
    const k = 1 - Math.exp(-dt * 4);
    this.fade += (visibility - this.fade) * k;
    this.material.uniforms.uFade.value = this.fade;
    this.material.uniforms.uTime.value = time;
    this.lines.forEach((l, i) => {
      this.lineFade[i] += ((i === this.active ? 0.9 : 0.22) - this.lineFade[i]) * k;
      (l.material as THREE.LineBasicMaterial).opacity = this.lineFade[i] * this.fade;
    });
    this.group.visible = this.fade > 0.01;
  }

  /** World positions of the active cluster's skills, for HTML labels. */
  activeStars() {
    return this.stars.filter((s) => s.group === this.active);
  }
}
