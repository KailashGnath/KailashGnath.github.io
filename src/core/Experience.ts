import * as THREE from 'three';
import { experiments, skillGroups, about, stages } from '../content/resume';
import { Swarm } from '../world/Swarm';
import { Environment } from '../world/Environment';
import { Tunnel } from '../world/Tunnel';
import { Constellation } from '../world/Constellation';
import { Post } from '../post/Post';
import { CameraRig, INTRO_SHOT, chamberStep, stair } from './CameraRig';
import { FpsGovernor, type QualitySettings } from './Quality';
import { shapeFor, type DirectorState } from './ShapeDirector';
import type { Scroll } from './Scroll';

export type ExperienceState = DirectorState;

export class Experience {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200);
  readonly swarm: Swarm;
  readonly constellation: Constellation;
  readonly state: ExperienceState = { stage: 0, experiment: 0, cluster: 0, interest: 0 };

  private env: Environment;
  private tunnel: Tunnel;
  private post: Post;
  private rig: CameraRig;
  private governor: FpsGovernor;
  private timer = new THREE.Timer();
  private time = 0;
  private dpr: number;
  private pointer = new THREE.Vector2();
  private pointerActive = false;
  private pointerSpeed = 0;
  /** Phones: device tilt drives the parallax; a touch pushes particles. */
  private tilt = new THREE.Vector2();
  private tiltBase: { beta: number; gamma: number } | null = null;
  private tiltOn = false;
  private touchUntil = 0;
  private raycaster = new THREE.Raycaster();
  private running = true;
  private started = false;
  private ids: string[];
  private clusterOverride = -1;
  private interestOverride = -1;
  private flash = 0;
  private introActive = false;
  private usePost = true;
  /** Called if even the lightest setting can't keep up: the page falls back to text mode. */
  onGiveUp: () => void = () => {};
  /** Dev only: pin a shape regardless of scroll. */
  debugShape = '';

  onFrame: (dt: number) => void = () => {};
  onShapeChange: (id: string) => void = () => {};

  constructor(
    canvas: HTMLCanvasElement,
    private quality: QualitySettings,
    private scroll: Scroll,
    private reduced: boolean,
    hueShift: number,
  ) {
    this.ids = scroll.metrics.map((m) => m.id);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', alpha: false });
    this.renderer.setClearColor('#07080A', 1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.dpr = Math.min(window.devicePixelRatio, quality.maxDpr);

    this.env = new Environment(quality.dust);
    this.scene.add(this.env.group);

    this.tunnel = new Tunnel();
    this.scene.add(this.tunnel.group);

    this.constellation = new Constellation(skillGroups);
    this.scene.add(this.constellation.group);

    this.swarm = new Swarm(this.renderer, quality.particles, hueShift);
    this.scene.add(this.swarm.points);

    this.rig = new CameraRig(this.camera, this.ids, reduced);
    this.post = new Post(this.renderer, this.scene, this.camera, quality);
    this.governor = new FpsGovernor(() => this.downgrade());

    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('pointermove', (e) => this.onPointer(e), { passive: true });
    document.documentElement.addEventListener('mouseleave', () => (this.pointerActive = false));
    // Touch: the finger pushes particles (a tap sends a ripple) — even while it scrolls the page.
    const touch = (e: TouchEvent, start: boolean) => {
      const t = e.touches[0];
      if (!t) return;
      const x = (t.clientX / innerWidth) * 2 - 1;
      const y = -(t.clientY / innerHeight) * 2 + 1;
      this.pointerSpeed = Math.min(1, this.pointerSpeed + (start ? 0.9 : Math.hypot(x - this.pointer.x, y - this.pointer.y)));
      this.pointer.set(x, y);
      this.pointerActive = true;
      this.touchUntil = performance.now() + 700;
    };
    window.addEventListener('touchstart', (e) => touch(e, true), { passive: true });
    window.addEventListener('touchmove', (e) => touch(e, false), { passive: true });
    document.addEventListener('visibilitychange', () => {
      this.running = !document.hidden;
      if (this.running && this.started) {
        this.timer.reset();
        this.loop();
      }
    });
  }

  /** Compile shaders up-front so the first frame doesn't hitch. */
  async warmup() {
    await this.renderer.compileAsync(this.scene, this.camera);
  }

  start() {
    this.started = true;
    this.timer.connect(document);
    this.loop();
  }

  /** Intro mode: the swarm spells the name, centred. */
  setIntro(on: boolean) {
    this.introActive = on;
    this.rig.override = on ? INTRO_SHOT(this.camera.aspect < 0.9) : null;
    if (on) {
      this.swarm.stiffness = 7;
      this.swarm.setShape('name');
    } else {
      this.swarm.stiffness = 14;
    }
  }

  private loop = (ts?: number) => {
    if (!this.running) return;
    requestAnimationFrame(this.loop);
    this.timer.update(ts);
    const dt = Math.min(this.timer.getDelta(), 1 / 20);
    this.time += dt;
    this.tick(dt, performance.now());
  };

  private tick(dt: number, now: number) {
    this.scroll.update(now);
    const f = this.scroll.frame;
    const portrait = this.camera.aspect < 0.9;

    this.rig.resolve(f, portrait);
    // Touch released a moment ago: stop pushing.
    if (this.touchUntil && now > this.touchUntil) {
      this.touchUntil = 0;
      this.pointerActive = false;
    }
    this.rig.update(dt, this.tiltOn && !this.touchUntil ? this.tilt : this.pointer, this.time);
    const cur = this.rig.current;

    // Sub-steps inside the tall chambers.
    const id = this.ids[f.index];
    const inner = (name: string) => (id === name ? f.inner : this.ids.indexOf(name) < f.index ? 1 : 0);
    this.state.stage = stair(chamberStep(inner('evolution'), stages.length));
    this.state.experiment = stair(chamberStep(inner('experiments'), experiments.length));
    const scrollCluster = Math.round(chamberStep(inner('toolkit'), skillGroups.length));
    this.state.cluster = this.clusterOverride >= 0 ? this.clusterOverride : scrollCluster;
    const scrollInterest = Math.round(chamberStep(inner('about'), about.interests.length));
    this.state.interest = this.interestOverride >= 0 ? this.interestOverride : scrollInterest;

    // Pick the shape for whatever owns most of the screen.
    if (!this.introActive) {
      const shape = this.debugShape || shapeFor(this.ids[this.scroll.visibleIndex], this.state);
      if (shape !== this.swarm.shape) {
        this.swarm.setShape(shape);
        this.onShapeChange(shape);
      }
    }

    if (this.pointerActive) {
      this.raycaster.setFromCamera(this.pointer, this.camera);
      this.swarm.setPointerRay(this.raycaster.ray, this.pointerSpeed);
    } else {
      this.swarm.setPointerRay(null, 0);
    }
    this.pointerSpeed *= 0.85;

    this.swarm.update(dt, this.time, { opacity: cur.opacity, scale: cur.scale, anchor: this.rig.anchor, anchorVel: this.rig.anchorVel }, this.reduced);
    this.env.update(this.time);
    this.tunnel.update(dt, this.time, this.camera.position.z, this.rig.speed, this.reduced);
    this.constellation.setActive(this.state.cluster);
    this.constellation.update(dt, this.time, this.near('toolkit', f) ? 1 : 0);

    this.flash *= Math.exp(-dt * 3);
    this.post.finish.uniforms.uFlash.value = this.flash;
    const speed = Math.min(1, Math.abs(f.velocity) / 60);
    this.post.finish.uniforms.uGrain.value = 0.04 + speed * 0.03;
    if (this.quality.chromatic) this.post.finish.uniforms.uCA.value = 0.01 + speed * 0.025;

    if (this.usePost) this.post.render(this.time);
    else this.renderer.render(this.scene, this.camera);
    this.governor.tick(now);
    this.onFrame(dt);
  }

  private near(name: string, f: { index: number; t: number }) {
    const i = this.ids.indexOf(name);
    return f.index === i || (f.index === i - 1 && f.t > 0.35);
  }

  setClusterOverride(i: number) {
    this.clusterOverride = i;
  }

  setInterestOverride(i: number) {
    this.interestOverride = i;
  }

  pulse() {
    this.flash = 0.6;
    this.swarm.burst();
  }

  /** Project a world position to CSS pixels. */
  project(p: THREE.Vector3, out: { x: number; y: number; visible: boolean }) {
    const v = p.clone().project(this.camera);
    out.x = (v.x * 0.5 + 0.5) * innerWidth;
    out.y = (-v.y * 0.5 + 0.5) * innerHeight;
    out.visible = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1;
    return out;
  }

  get aspect() {
    return this.camera.aspect;
  }

  /** Start following device tilt (call from a user gesture on iOS, which asks for permission). */
  async enableTilt() {
    if (this.tiltOn || !('DeviceOrientationEvent' in window)) return;
    const DOE = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
    if (DOE.requestPermission) {
      try {
        if ((await DOE.requestPermission()) !== 'granted') return;
      } catch {
        return;
      }
    }
    this.tiltOn = true;
    window.addEventListener('deviceorientation', (e) => {
      if (e.beta == null || e.gamma == null) return;
      // Relative to how the phone was held at first; re-centres slowly so it never drifts off.
      this.tiltBase ??= { beta: e.beta, gamma: e.gamma };
      this.tiltBase.beta += (e.beta - this.tiltBase.beta) * 0.004;
      this.tiltBase.gamma += (e.gamma - this.tiltBase.gamma) * 0.004;
      const clamp = (v: number) => Math.max(-1, Math.min(1, v));
      this.tilt.set(clamp((e.gamma - this.tiltBase.gamma) / 22), clamp(-(e.beta - this.tiltBase.beta) / 22));
    });
  }

  private onPointer(e: PointerEvent) {
    if (e.pointerType === 'touch') return; // handled by the touch listeners
    const x = (e.clientX / innerWidth) * 2 - 1;
    const y = -(e.clientY / innerHeight) * 2 + 1;
    this.pointerSpeed = Math.min(1, this.pointerSpeed + Math.hypot(x - this.pointer.x, y - this.pointer.y));
    this.pointer.set(x, y);
    this.pointerActive = e.pointerType === 'mouse' || e.pointerType === 'pen';
  }

  private resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.fov = this.camera.aspect < 0.9 ? 52 : 40;
    this.camera.updateProjectionMatrix();
    if (this.introActive) this.rig.override = INTRO_SHOT(this.camera.aspect < 0.9);
    this.rig.applyFrame();
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.setSize(w, h, false);
    this.post.setSize(w, h, this.dpr);
    this.swarm.setPixelRatio(this.dpr * (h / 900));
    this.env.setPixelRatio(this.dpr * (h / 900));
    this.constellation.setPixelRatio(this.dpr * (h / 900));
    this.constellation.setAspect(this.camera.aspect);
    this.tunnel.setAspect(this.camera.aspect);
  }

  /** The quality ladder, lightest last. Each call takes one step. */
  private downgrade(): boolean {
    const floor = 1;
    if (this.dpr > floor) {
      this.dpr = Math.max(floor, this.dpr - 0.375);
      this.resize();
      return true;
    }
    if (this.post.bloom.enabled) {
      this.post.bloom.enabled = false;
      return true;
    }
    const geo = this.swarm.points.geometry;
    if (geo.drawRange.count === Infinity || geo.drawRange.count > this.swarm.count / 2) {
      // Shape slots are shuffled, so half the particles still draw every shape.
      geo.setDrawRange(0, Math.floor(this.swarm.count / 2));
      return true;
    }
    if (this.usePost) {
      this.usePost = false;
      return true;
    }
    if (this.dpr > 0.6) {
      this.dpr = 0.6;
      this.resize();
      return true;
    }
    // Nothing left: hand over to the text version rather than crawl.
    this.running = false;
    this.started = false;
    this.onGiveUp();
    return false;
  }

}
