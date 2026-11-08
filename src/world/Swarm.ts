import * as THREE from 'three';
import { GPUComputationRenderer, type Variable } from 'three/examples/jsm/misc/GPUComputationRenderer.js';
import noise from '../shaders/noise.glsl?raw';
import { SHAPES, getShape, prewarm } from './shapes/library';

/**
 * One particle swarm that becomes whatever the page is talking about, and
 * travels with you through the scene.
 *
 * Positions and velocities live in float textures (GPGPU) in world space.
 * Every particle is springed to its slot in the current shape, placed at the
 * swarm's anchor. When the anchor flies to the next station, particles lag on
 * their springs and stream out like a comet, then pull back into the next shape.
 * Changing shape is just swapping a texture, so it can be interrupted any time.
 */

/**
 * Shared by both passes: where this particle wants to be, in world space.
 * Positions are STORED relative to the anchor (world − anchor) so they stay small:
 * phones that fall back to half-float textures keep full precision deep in the journey.
 */
const targetGlsl = /* glsl */ `
uniform sampler2D uTarget;
uniform sampler2D uAux;
uniform mat4 uMatrix;
uniform float uTime;
uniform float uBobAmp;
vec2 rot2(vec2 p, float a) { float c = cos(a), s = sin(a); return vec2(c * p.x - s * p.y, s * p.x + c * p.y); }
vec3 targetOf(vec2 uv) {
  vec3 lp = texture2D(uTarget, uv).xyz;
  vec4 ax = texture2D(uAux, uv);
  float m = ax.x;
  if (m > 0.5 && m < 1.5) {
    // Bob: layers breathe apart and back together.
    lp.z += ax.y * uBobAmp * (0.5 + 0.5 * sin(uTime * 0.8));
  } else if (m > 1.5 && m < 2.5) {
    // Wag: swing about the pivot.
    lp.xy = rot2(lp.xy - ax.zw, sin(uTime * 7.0) * ax.y) + ax.zw;
  } else if (m > 2.5 && m < 3.5) {
    // Spin about the pivot.
    lp.xy = rot2(lp.xy - ax.zw, uTime * ax.y) + ax.zw;
  } else if (m > 3.5 && m < 4.5) {
    // Orbit about the local y axis.
    lp.xz = rot2(lp.xz, uTime * ax.y);
  }
  return (uMatrix * vec4(lp, 1.0)).xyz;
}`;

const velocityShader = /* glsl */ `
${targetGlsl}
uniform float uDelta;
uniform float uStiff;
uniform float uDamp;
uniform float uNoise;
uniform float uPush;
uniform float uBurst;
uniform float uFollow;
uniform float uSnap;
uniform vec3 uMouse; // relative to the anchor
uniform vec3 uAnchor;
uniform vec3 uAnchorVel;
${noise}
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec3 pos = texture2D(texturePosition, uv).xyz;
  vec3 vel = texture2D(textureVelocity, uv).xyz;
  vec3 frameVel = uAnchorVel * uFollow;
  if (uSnap > 0.5) { gl_FragColor = vec4(frameVel, 1.0); return; }
  vec3 tgt = targetOf(uv) - uAnchor;
  float r = hash(uv);

  // Spring to the slot, damped relative to the moving anchor. Lazy particles trail further: the comet.
  float k = uStiff * (0.45 + r * 1.1);
  vec3 acc = (tgt - pos) * k - (vel - frameVel) * uDamp * (0.8 + r * 0.4);

  // Living drift.
  float t = uTime * 0.22;
  vec3 q = pos * 0.65;
  acc += vec3(snoise(q + vec3(t, 0.0, 0.0)), snoise(q + vec3(13.1, t, 2.7)), snoise(q + vec3(-7.3, 4.1, t))) * uNoise;

  // The cursor pushes particles out of the way.
  vec3 away = pos - uMouse;
  float d = length(away);
  acc += normalize(away + 1e-4) * uPush * exp(-d * d * 2.2) * (0.5 + r);

  // Burst: everything flies outward and springs back.
  acc += normalize(pos + vec3(1e-3)) * uBurst * (8.0 + r * 14.0);

  vel += acc * uDelta;
  gl_FragColor = vec4(vel, 1.0);
}`;

const positionShader = /* glsl */ `
${targetGlsl}
uniform float uDelta;
uniform float uSnap;
uniform vec3 uAnchor;
uniform vec3 uAnchorDelta; // how far the anchor moved this frame
uniform float uMaxLag;
void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec4 pos = texture2D(texturePosition, uv);
  vec3 vel = texture2D(textureVelocity, uv).xyz;
  float em = texture2D(uTarget, uv).w;
  // Blink: emphasis pulses on and off.
  if (texture2D(uAux, uv).x > 4.5) em *= step(0.45, fract(uTime * 1.1));
  if (uSnap > 0.5) {
    pos.xyz = targetOf(uv) - uAnchor;
    pos.w = em;
  } else {
    pos.xyz += vel * uDelta - uAnchorDelta;
    // Cap the comet tail: on a fast flick particles may never trail back into the lens.
    vec3 tgt = targetOf(uv) - uAnchor;
    vec3 off = pos.xyz - tgt;
    float len = length(off);
    if (len > uMaxLag) pos.xyz = tgt + off * (uMaxLag / len);
    pos.w = mix(pos.w, em, clamp(uDelta * 6.0, 0.0, 1.0));
  }
  gl_FragColor = pos;
}`;

const renderVert = /* glsl */ `
uniform sampler2D uPos;
uniform sampler2D uVel;
uniform vec3 uAnchor;
uniform float uTime;
uniform float uSize;
uniform float uPixelRatio;
uniform float uOpacity;
attribute vec2 aRef;
attribute float aRand;
varying float vAlpha;
varying float vTone;
varying float vEm;
void main() {
  vec4 p = texture2D(uPos, aRef);
  float speed = length(texture2D(uVel, aRef).xyz);
  vec4 mv = modelViewMatrix * vec4(p.xyz + uAnchor, 1.0);
  gl_Position = projectionMatrix * mv;
  float tw = 0.75 + 0.25 * sin(uTime * (1.0 + aRand * 3.0) + aRand * 40.0);
  float em = p.w;
  // Clamp: a particle streaming past the lens must not become a screen-sized quad.
  gl_PointSize = min(uSize * (0.35 + aRand * aRand * 1.2) * (1.0 + em * 0.6) * tw * uPixelRatio / max(-mv.z, 0.05), 14.0 * uPixelRatio);
  // Fade out anything drifting close to the lens instead of letting it blot the screen.
  vAlpha = uOpacity * (0.3 + 0.7 * tw) * (0.5 + em * 0.7 + min(speed * 0.02, 0.35)) * smoothstep(1.5, 4.5, -mv.z);
  vTone = aRand;
  vEm = em;
}`;

const renderFrag = /* glsl */ `
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uColorC;
varying float vAlpha;
varying float vTone;
varying float vEm;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  if (d > 0.5) discard;
  float core = pow(smoothstep(0.5, 0.0, d), 1.8);
  vec3 col = mix(uColorA, uColorB, smoothstep(0.6, 1.0, vTone));
  col = mix(col, uColorB, smoothstep(0.3, 0.6, vEm) * 0.3);
  col = mix(col, uColorC, smoothstep(0.78, 0.95, vEm));
  gl_FragColor = vec4(col * (0.4 + 0.75 * core), core * vAlpha * 0.8);
}`;

export interface SwarmParams {
  opacity: number;
  scale: number;
  anchor: THREE.Vector3;
  anchorVel: THREE.Vector3;
}

interface Target {
  data: THREE.DataTexture;
  aux: THREE.DataTexture;
}

export class Swarm {
  readonly points: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
  /** Carries the swarm's transform (anchor, sway, yaw, scale). Particles live in world space. */
  readonly frame = new THREE.Object3D();
  readonly size: number;
  readonly count: number;
  shape = '';

  private gpu: GPUComputationRenderer;
  private pos: Variable;
  private vel: Variable;
  private shared: Record<string, THREE.IUniform>;
  private targets = new Map<string, Target>();
  private mouse = new THREE.Vector3(999, 999, 999);
  private mouseRel = new THREE.Vector3(999, 999, 999);
  private prevAnchor = new THREE.Vector3();
  private anchorDelta = new THREE.Vector3();
  private hasAnchor = false;
  private push = 0;
  private burstAmt = 0;
  private snapFrames = 0;
  private sway = 0.3;
  private swayCur = 0.3;
  private yaw = 0;
  private yawCur = 0;
  private plane = new THREE.Plane();
  private hit = new THREE.Vector3();
  private normal = new THREE.Vector3(0, 0, 1);
  /** Lower stiffness makes the next assembly slower and more dramatic. */
  stiffness = 14;
  noise = 0.55;
  /** Share of the anchor's velocity particles inherit (1 = rigid, lower = longer comet). */
  follow = 0.86;

  constructor(renderer: THREE.WebGLRenderer, particles: number, hueShift = 0) {
    this.size = Math.max(32, Math.round(Math.sqrt(particles)));
    this.count = this.size * this.size;

    this.gpu = new GPUComputationRenderer(this.size, this.size, renderer);
    if (!renderer.extensions.has('EXT_color_buffer_float')) this.gpu.setDataType(THREE.HalfFloatType);

    const pos0 = this.gpu.createTexture();
    const vel0 = this.gpu.createTexture();
    this.scatter(pos0.image.data as Float32Array);

    this.vel = this.gpu.addVariable('textureVelocity', velocityShader, vel0);
    this.pos = this.gpu.addVariable('texturePosition', positionShader, pos0);
    this.gpu.setVariableDependencies(this.vel, [this.pos, this.vel]);
    this.gpu.setVariableDependencies(this.pos, [this.pos, this.vel]);

    const t = this.target('phone');
    // Uniform objects shared by both passes, so one assignment updates both.
    this.shared = {
      uTarget: { value: t.data },
      uAux: { value: t.aux },
      uMatrix: { value: this.frame.matrixWorld },
      uTime: { value: 0 },
      uBobAmp: { value: 0.16 },
      uDelta: { value: 0 },
      uSnap: { value: 0 },
      uAnchor: { value: new THREE.Vector3() },
    };
    Object.assign(this.vel.material.uniforms, this.shared, {
      uStiff: { value: this.stiffness },
      uDamp: { value: 5.6 },
      uNoise: { value: this.noise },
      uPush: { value: 0 },
      uBurst: { value: 0 },
      uFollow: { value: this.follow },
      uMouse: { value: this.mouseRel },
      uAnchorVel: { value: new THREE.Vector3() },
    });
    Object.assign(this.pos.material.uniforms, this.shared, { uAnchorDelta: { value: this.anchorDelta }, uMaxLag: { value: 3.2 } });
    const err = this.gpu.init();
    if (err) throw new Error(err);

    const geo = new THREE.BufferGeometry();
    const ref = new Float32Array(this.count * 2);
    const rand = new Float32Array(this.count);
    for (let i = 0; i < this.count; i++) {
      ref[i * 2] = ((i % this.size) + 0.5) / this.size;
      ref[i * 2 + 1] = (Math.floor(i / this.size) + 0.5) / this.size;
      rand[i] = Math.random();
    }
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.count * 3), 3));
    geo.setAttribute('aRef', new THREE.BufferAttribute(ref, 2));
    geo.setAttribute('aRand', new THREE.BufferAttribute(rand, 1));

    const colorA = new THREE.Color('#6CF0FF').offsetHSL(hueShift, 0, 0);
    const material = new THREE.ShaderMaterial({
      vertexShader: renderVert,
      fragmentShader: renderFrag,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uPos: { value: null },
        uVel: { value: null },
        uAnchor: this.shared.uAnchor,
        uTime: { value: 0 },
        uSize: { value: 28 },
        uPixelRatio: { value: 1 },
        uOpacity: { value: 0 },
        uColorA: { value: colorA },
        uColorB: { value: new THREE.Color('#E8E6E1') },
        uColorC: { value: new THREE.Color('#FFB547') },
      },
    });
    this.points = new THREE.Points(geo, material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 2;

    this.setShape('phone');
  }

  /** Run the simulation once so its shaders compile now, not on the first visible frame. */
  warm() {
    this.gpu.compute();
  }

  /** Build the remaining shapes in idle time. Call after the intro, so it never steals intro frames. */
  prewarm() {
    prewarm(this.count);
  }

  private scatter(a: Float32Array) {
    for (let i = 0; i < this.count; i++) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(4 + Math.random() * 7);
      a[i * 4] = v.x * 1.4;
      a[i * 4 + 1] = v.y;
      a[i * 4 + 2] = v.z - 3;
      a[i * 4 + 3] = 0;
    }
  }

  private target(id: string): Target {
    let t = this.targets.get(id);
    if (!t) {
      const s = getShape(id, this.count);
      const tex = (arr: Float32Array) => {
        const d = new THREE.DataTexture(arr, this.size, this.size, THREE.RGBAFormat, THREE.FloatType);
        d.needsUpdate = true;
        return d;
      };
      t = { data: tex(s.data), aux: tex(s.aux) };
      this.targets.set(id, t);
    }
    return t;
  }

  /** Morph to a shape. Cheap and interruptible. */
  setShape(id: string) {
    if (id === this.shape || !SHAPES[id]) return;
    this.shape = id;
    const t = this.target(id);
    this.shared.uTarget.value = t.data;
    this.shared.uAux.value = t.aux;
    this.sway = SHAPES[id].sway ?? 0.3;
    this.yaw = SHAPES[id].yaw ?? 0;
  }

  /** Jump straight to the current shape (reduced motion, or skipping the intro). */
  snap() {
    this.snapFrames = 2;
    this.yawCur = this.yaw;
    this.swayCur = this.sway;
  }

  /** Notes for the active shape, in the swarm's local space (apply `frame.matrixWorld`). */
  notes() {
    const def = SHAPES[this.shape];
    if (!def?.notes) return [];
    const s = getShape(this.shape, this.count);
    return def.notes.map((n) => ({ text: n.text, local: new THREE.Vector3(...s.map(n.at[0], n.at[1], n.at[2] ?? 0)) }));
  }

  setPixelRatio(pr: number) {
    this.points.material.uniforms.uPixelRatio.value = pr;
  }

  /** Mouse ray in world space → push point on the swarm's plane. */
  setPointerRay(ray: THREE.Ray | null, speed: number) {
    if (!ray) {
      this.mouse.set(999, 999, 999);
      return;
    }
    this.plane.setFromNormalAndCoplanarPoint(this.normal, this.frame.position);
    if (ray.intersectPlane(this.plane, this.hit)) {
      if (this.mouse.x > 900) this.mouse.copy(this.hit);
      else this.mouse.lerp(this.hit, 0.4);
    }
    this.push = Math.min(1.2, this.push + speed * 6);
  }

  burst() {
    this.burstAmt = 1;
  }

  update(dt: number, time: number, p: SwarmParams, reduced: boolean) {
    const step = Math.min(dt, 1 / 30);

    // Place the swarm's frame: ride the anchor, sway, turn to show depth.
    const ease = 1 - Math.exp(-dt * 1.5);
    this.swayCur += (this.sway - this.swayCur) * ease;
    this.yawCur += (this.yaw - this.yawCur) * ease;
    const t = reduced ? 0 : time;
    this.frame.position.copy(p.anchor);
    this.frame.rotation.set(Math.sin(t * 0.21) * 0.06, this.yawCur + Math.sin(t * 0.32) * this.swayCur, 0);
    this.frame.scale.setScalar(p.scale);
    this.frame.updateMatrixWorld();

    const su = this.shared;
    su.uTime.value = time;
    su.uDelta.value = step;
    su.uSnap.value = this.snapFrames > 0 ? 1 : 0;
    if (this.snapFrames > 0) this.snapFrames--;

    const vu = this.vel.material.uniforms;
    vu.uStiff.value = reduced ? 30 : this.stiffness;
    vu.uNoise.value = reduced ? 0.15 : this.noise;
    vu.uFollow.value = reduced ? 1 : this.follow;
    (su.uAnchor.value as THREE.Vector3).copy(p.anchor);
    (vu.uAnchorVel.value as THREE.Vector3).copy(p.anchorVel);
    // Exact anchor travel this frame, so relative positions stay put while the anchor flies.
    if (this.hasAnchor) this.anchorDelta.subVectors(p.anchor, this.prevAnchor);
    else this.anchorDelta.set(0, 0, 0);
    this.prevAnchor.copy(p.anchor);
    this.hasAnchor = true;
    if (this.mouse.x > 900) this.mouseRel.set(999, 999, 999);
    else this.mouseRel.subVectors(this.mouse, p.anchor);
    this.push *= Math.exp(-dt * 1.8);
    vu.uPush.value = (this.push * 0.9 + 0.15) * 28;
    this.burstAmt *= Math.exp(-dt * 5);
    vu.uBurst.value = this.burstAmt;
    this.gpu.compute();

    const u = this.points.material.uniforms;
    u.uPos.value = this.gpu.getCurrentRenderTarget(this.pos).texture;
    u.uVel.value = this.gpu.getCurrentRenderTarget(this.vel).texture;
    u.uTime.value = reduced ? time * 0.15 : time;
    u.uOpacity.value = p.opacity;
    this.points.visible = p.opacity > 0.002;
  }

  dispose() {
    this.gpu.dispose();
    this.targets.forEach((t) => {
      t.data.dispose();
      t.aux.dispose();
    });
    this.points.geometry.dispose();
    this.points.material.dispose();
  }
}
