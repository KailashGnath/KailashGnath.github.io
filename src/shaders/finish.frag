uniform sampler2D tDiffuse;
uniform float uTime;
uniform float uCA;
uniform float uGrain;
uniform float uVignette;
uniform float uFlash;
varying vec2 vUv;

float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

void main() {
  vec2 dir = vUv - 0.5;
  float d = length(dir);
  vec2 off = dir * uCA * d;
  vec3 col;
  col.r = texture2D(tDiffuse, vUv + off).r;
  col.g = texture2D(tDiffuse, vUv).g;
  col.b = texture2D(tDiffuse, vUv - off).b;

  col *= mix(1.0, smoothstep(0.95, 0.25, d), uVignette);
  float g = hash(vUv * vec2(1931.0, 1213.0) + fract(uTime * 7.13)) - 0.5;
  col += g * uGrain;
  col += uFlash * vec3(0.42, 0.94, 1.0) * 0.25;
  gl_FragColor = vec4(col, 1.0);
}
