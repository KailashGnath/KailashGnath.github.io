import * as THREE from 'three';
import { JOURNEY_END } from '../core/CameraRig';

const dustVert = /* glsl */ `
uniform float uTime;
uniform float uPixelRatio;
attribute float aRand;
varying float vAlpha;
void main() {
  vec3 p = position;
  p.y += sin(uTime * 0.2 + aRand * 30.0) * 0.35;
  p.x += cos(uTime * 0.15 + aRand * 20.0) * 0.25;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = min((1.0 + aRand * 2.2) * uPixelRatio * (10.0 / max(-mv.z, 0.05)), 18.0 * uPixelRatio);
  float d = -mv.z;
  vAlpha = smoothstep(0.5, 3.0, d) * smoothstep(30.0, 8.0, d) * (0.2 + aRand * 0.4);
}`;

const dustFrag = /* glsl */ `
varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  gl_FragColor = vec4(vec3(0.82, 0.92, 0.95), smoothstep(0.5, 0.0, d) * vAlpha);
}`;

/** Drifting dust along the route — the parallax that sells forward and backward travel. */
export class Environment {
  readonly group = new THREE.Group();
  private dust: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;

  constructor(dustCount: number) {
    // Spread along the whole journey: near specks rush past while you travel.
    const n = Math.round(dustCount * 1.6);
    const len = 6 - (JOURNEY_END - 30);
    const pos = new Float32Array(n * 3);
    const r = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 34;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 2] = 6 - Math.random() * len;
      r[i] = Math.random();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aRand', new THREE.BufferAttribute(r, 1));
    this.dust = new THREE.Points(
      geo,
      new THREE.ShaderMaterial({
        vertexShader: dustVert,
        fragmentShader: dustFrag,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uTime: { value: 0 }, uPixelRatio: { value: 1 } },
      }),
    );
    this.dust.frustumCulled = false;
    this.group.add(this.dust);
  }

  setPixelRatio(pr: number) {
    this.dust.material.uniforms.uPixelRatio.value = pr;
  }

  update(time: number) {
    this.dust.material.uniforms.uTime.value = time;
  }
}
