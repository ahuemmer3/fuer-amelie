import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const LensShader = {
  uniforms: {
    tDiffuse: { value: null },
    uCenter: { value: new THREE.Vector2(.5, .5) },
    uRadius: { value: .05 },
    uStrength: { value: 0 },
    uAspect: { value: 1 }
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform vec2 uCenter;
    uniform float uRadius, uStrength, uAspect;
    varying vec2 vUv;
    void main() {
      vec2 d = vUv - uCenter;
      d.x *= uAspect;
      float r = length(d);
      float fall = smoothstep(uRadius * 9.0, uRadius * 1.6, r);
      float def = uStrength * uRadius * uRadius / max(r, 1e-4) * fall;
      vec2 off = (d / max(r, 1e-4)) * def;
      off.x /= uAspect;
      gl_FragColor = texture2D(tDiffuse, vUv - off);
    }`
};

const FilmShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uGrain: { value: .045 },
    uVignette: { value: .55 },
    uRes: { value: new THREE.Vector2(1, 1) }
  },
  vertexShader: LensShader.vertexShader,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float uTime, uGrain, uVignette;
    uniform vec2 uRes;
    varying vec2 vUv;
    float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      vec2 q = vUv - .5;
      q.x *= uRes.x / uRes.y;
      float v = smoothstep(1.05, .25, length(q));
      c.rgb *= mix(1.0 - uVignette, 1.0, v);
      float g = hash(floor(vUv * uRes) + fract(uTime * 7.13) * 91.7) - .5;
      c.rgb += g * uGrain * (0.6 + 0.4 * (1.0 - dot(c.rgb, vec3(.333))));
      gl_FragColor = c;
    }`
};

export function createRenderer(canvas, quality) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', alpha: false, stencil: false });
  renderer.setPixelRatio(quality.dpr);
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .95;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x07030d, 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, .1, 600);
  scene.add(camera);

  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(quality.dpr);
  composer.setSize(window.innerWidth, window.innerHeight);
  composer.addPass(new RenderPass(scene, camera));

  const lens = new ShaderPass(LensShader);
  composer.addPass(lens);

  let bloomScale = quality.bloomScale;
  const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), .85, .5, .42);
  const baseSetSize = bloom.setSize.bind(bloom);
  bloom.setSize = (w, h) => baseSetSize(Math.max(64, Math.round(w * bloomScale)), Math.max(64, Math.round(h * bloomScale)));
  composer.addPass(bloom);

  composer.addPass(new OutputPass());
  const film = new ShaderPass(FilmShader);
  composer.addPass(film);

  let dpr = quality.dpr;
  function resize() {
    const w = window.innerWidth, hgt = window.innerHeight;
    camera.aspect = w / hgt;
    camera.fov = camera.aspect < .75 ? 68 : 55;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, hgt, false);
    composer.setPixelRatio(dpr);
    composer.setSize(w, hgt);
    lens.uniforms.uAspect.value = w / hgt;
    film.uniforms.uRes.value.set(w * dpr, hgt * dpr);
  }
  resize();

  const tmp = new THREE.Vector3(), right = new THREE.Vector3();
  /** Projects the black hole into screen space for the lensing pass */
  function updateLens(worldPos, worldRadius, strength) {
    tmp.copy(worldPos).project(camera);
    const behind = tmp.z > 1;
    lens.uniforms.uCenter.value.set(tmp.x * .5 + .5, tmp.y * .5 + .5);
    right.setFromMatrixColumn(camera.matrixWorld, 0).multiplyScalar(worldRadius).add(worldPos).project(camera);
    const rad = Math.abs(right.x - tmp.x) * .5 * (window.innerWidth / window.innerHeight);
    lens.uniforms.uRadius.value = rad;
    lens.uniforms.uStrength.value = behind ? 0 : strength;
  }

  return {
    renderer, scene, camera, composer, bloom, lens, film,
    resize,
    updateLens,
    render(time) { film.uniforms.uTime.value = time; composer.render(); },
    setPixelRatio(v) { dpr = v; resize(); },
    get pixelRatio() { return dpr; },
    setBloomScale(v) { bloomScale = v; composer.setSize(window.innerWidth, window.innerHeight); }
  };
}
