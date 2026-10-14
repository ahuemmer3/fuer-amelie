import * as THREE from 'three';
import { omegaAt, GALAXY_SPIN } from './galaxy.js';

/** Golden stars made from her wishes. They live in the galaxy and turn with it. */
export class WishStars {
  constructor({ max = 64, pixelRatio }) {
    this.max = max; this.count = 0; this.flying = [];
    const geo = new THREE.BufferGeometry();
    this.aParams = new THREE.BufferAttribute(new Float32Array(max * 4), 4);
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(max * 3), 3));
    geo.setAttribute('aParams', this.aParams);
    geo.setDrawRange(0, 0);
    this.material = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uPixelRatio: { value: pixelRatio }, uOpacity: { value: 0 } },
      vertexShader: /* glsl */`
        uniform float uTime, uPixelRatio, uOpacity;
        attribute vec4 aParams;
        varying float vAlpha;
        void main() {
          float r = aParams.x;
          float a = aParams.y + uTime * ${GALAXY_SPIN.toFixed(4)} * (0.35 + 1.6 / (r + 1.5));
          vec3 p = vec3(cos(a) * r, aParams.z, sin(a) * r);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          float tw = 0.75 + 0.25 * sin(uTime * 2.5 + aParams.w * 40.0);
          gl_PointSize = clamp(110.0 * uPixelRatio * tw / -mv.z, 2.0, 40.0);
          vAlpha = uOpacity * tw;
        }`,
      fragmentShader: /* glsl */`
        varying float vAlpha;
        void main() {
          vec2 c = gl_PointCoord - 0.5;
          float d = length(c) * 2.0;
          float cross = max(exp(-abs(c.x) * 40.0) * exp(-abs(c.y) * 5.0), exp(-abs(c.y) * 40.0) * exp(-abs(c.x) * 5.0));
          float core = exp(-d * 5.0);
          float a = clamp(core + cross * 0.8, 0.0, 1.0);
          gl_FragColor = vec4(vec3(1.0, 0.85, 0.5) * (1.0 + core), a * vAlpha);
        }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    });
    this.points = new THREE.Points(geo, this.material);
    this.points.frustumCulled = false;
    this.group = new THREE.Group();
    this.group.add(this.points);
  }

  add(seed = Math.random(), time = 0) {
    if (this.count >= this.max) return null;
    const r = 3 + seed * 11, y = .4 + Math.sin(seed * 40) * .6;
    // stored angle is compensated so the star lands where the flight ended
    const targetAngle = seed * 1000 % (Math.PI * 2);
    const base = targetAngle - time * omegaAt(r);
    this.aParams.setXYZW(this.count, r, base, y, seed);
    this.aParams.needsUpdate = true;
    this.count++;
    this.points.geometry.setDrawRange(0, this.count);
    return new THREE.Vector3(Math.cos(targetAngle) * r, y, Math.sin(targetAngle) * r);
  }

  setOpacity(o) { this.material.uniforms.uOpacity.value = o; }
  setPixelRatio(v) { this.material.uniforms.uPixelRatio.value = v; }
  update(t) { this.material.uniforms.uTime.value = t; }
}
