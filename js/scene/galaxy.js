import * as THREE from 'three';
import { gauss } from '../core/utils.js';

export const GALAXY_SPIN = .045;
/** angular speed at radius r, shared with text rings and photos so everything turns together */
export const omegaAt = r => GALAXY_SPIN * (.35 + 1.6 / (r + 1.5));

export class Galaxy {
  constructor({ count, radius = 15, arms = 4, colors, pixelRatio }) {
    this.radius = radius;
    this.count = count;
    const params = new Float32Array(count * 4);
    const color = new Float32Array(count * 3);
    const size = new Float32Array(count);

    const cIn = new THREE.Color(colors.galaxieInnen);
    const cMid = new THREE.Color(colors.galaxieMitte);
    const cOut = new THREE.Color(colors.galaxieAussen);
    const cEdge = new THREE.Color(colors.galaxieRand);
    const c = new THREE.Color(), white = new THREE.Color('#ffffff');
    const twist = .38;

    for (let i = 0; i < count; i++) {
      let x, z, y;
      const roll = Math.random();
      if (roll < .05) {
        // dense bright core around the black hole
        const r = 1.5 + Math.abs(gauss()) * radius * .1;
        const a = Math.random() * Math.PI * 2;
        x = Math.cos(a) * r; z = Math.sin(a) * r;
        y = gauss() * .32 * Math.max(.2, 1 - r / 5);
      } else if (roll < .17) {
        // haze between the arms
        const r = 1.6 + Math.pow(Math.random(), .9) * radius;
        const a = Math.random() * Math.PI * 2;
        x = Math.cos(a) * r; z = Math.sin(a) * r;
        y = gauss() * .14;
      } else {
        const r = 1.4 + Math.pow(Math.random(), 1.3) * radius;
        const arm = i % arms;
        const base = arm / arms * Math.PI * 2 + r * twist;
        const spread = .16 + r * .048;
        x = Math.cos(base) * r + gauss() * spread * .8;
        z = Math.sin(base) * r + gauss() * spread * .8;
        y = gauss() * (.08 + r * .012);
      }
      const r = Math.hypot(x, z);
      params[i * 4] = r;
      params[i * 4 + 1] = Math.atan2(z, x);
      params[i * 4 + 2] = y;
      params[i * 4 + 3] = Math.random();

      const t = Math.min(1, r / radius);
      if (t < .18) c.copy(cIn).lerp(cMid, t / .18);
      else if (t < .5) c.copy(cMid).lerp(cOut, (t - .18) / .32);
      else c.copy(cOut).lerp(cEdge, Math.min(1, (t - .5) / .45));
      const sparkle = Math.random();
      if (sparkle < .045) c.lerp(white, .75);
      c.offsetHSL((Math.random() - .5) * .03, 0, (Math.random() - .5) * .08);
      color[i * 3] = c.r; color[i * 3 + 1] = c.g; color[i * 3 + 2] = c.b;
      size[i] = (roll < .05 ? .6 : 1) * (.55 + Math.pow(Math.random(), 4) * 2.6) * (sparkle < .045 ? 1.6 : 1);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    geo.setAttribute('aParams', new THREE.BufferAttribute(params, 4));
    geo.setAttribute('aColor', new THREE.BufferAttribute(color, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), radius + 4);

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSize: { value: 27 },
        uPixelRatio: { value: pixelRatio },
        uOpacity: { value: 0 },
        uAudio: { value: 0 },
        uSpin: { value: GALAXY_SPIN }
      },
      vertexShader: /* glsl */`
        uniform float uTime, uSize, uPixelRatio, uOpacity, uAudio, uSpin;
        attribute vec4 aParams;
        attribute vec3 aColor;
        attribute float aSize;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          float r = aParams.x;
          float a = aParams.y + uTime * uSpin * (0.35 + 1.6 / (r + 1.5));
          vec3 p = vec3(cos(a) * r, aParams.z, sin(a) * r);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          float seed = aParams.w;
          float tw = 0.72 + 0.28 * sin(uTime * (1.2 + fract(seed * 7.31) * 3.0) + seed * 90.0);
          float pulse = 1.0 + uAudio * 0.35 * smoothstep(9.0, 0.0, r);
          gl_PointSize = clamp(aSize * uSize * uPixelRatio * tw * pulse / -mv.z, 1.0, 64.0);
          vColor = aColor;
          vAlpha = uOpacity * (0.4 + 0.35 * tw) * smoothstep(1.3, 3.4, r) * (0.55 + 0.45 * smoothstep(2.0, 7.0, r));
        }`,
      fragmentShader: /* glsl */`
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vec2 c = gl_PointCoord - 0.5;
          float d = length(c) * 2.0;
          if (d > 1.0) discard;
          float a = pow(1.0 - d, 1.7) + 0.25 * exp(-d * 9.0);
          gl_FragColor = vec4(vColor, a * vAlpha);
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.points = new THREE.Points(geo, this.material);
    this.points.frustumCulled = false;
  }
  setPixelRatio(v) { this.material.uniforms.uPixelRatio.value = v; }
  setDensity(f) { this.points.geometry.setDrawRange(0, Math.floor(this.count * f)); }
  update(t, audio) {
    this.material.uniforms.uTime.value = t;
    this.material.uniforms.uAudio.value = audio;
  }
}
