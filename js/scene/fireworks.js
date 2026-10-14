import * as THREE from 'three';

/** GPU particle fireworks (ring buffer). Bursts can be spheres or hearts. */
export class Fireworks {
  constructor({ max = 9000, pixelRatio }) {
    this.max = max; this.cursor = 0; this.time = 0;
    const geo = new THREE.BufferGeometry();
    this.aStart = new THREE.BufferAttribute(new Float32Array(max * 3), 3);
    this.aVel = new THREE.BufferAttribute(new Float32Array(max * 3), 3);
    this.aColor = new THREE.BufferAttribute(new Float32Array(max * 3), 3);
    this.aBirth = new THREE.BufferAttribute(new Float32Array(max).fill(-100), 1);
    [this.aStart, this.aVel, this.aColor, this.aBirth].forEach(a => a.setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(max * 3), 3));
    geo.setAttribute('aStart', this.aStart);
    geo.setAttribute('aVel', this.aVel);
    geo.setAttribute('aColor', this.aColor);
    geo.setAttribute('aBirth', this.aBirth);
    this.material = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uPixelRatio: { value: pixelRatio } },
      vertexShader: /* glsl */`
        uniform float uTime, uPixelRatio;
        attribute vec3 aStart, aVel, aColor; attribute float aBirth;
        varying vec3 vColor; varying float vAlpha;
        void main() {
          float t = uTime - aBirth;
          float life = 2.6;
          if (t < 0.0 || t > life) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 0.0; vAlpha = 0.0; return; }
          float drag = (1.0 - exp(-t * 1.6)) / 1.6;
          vec3 p = aStart + aVel * drag + vec3(0.0, -1.6, 0.0) * t * t * 0.5;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          float k = t / life;
          float flicker = 0.75 + 0.25 * sin(t * 40.0 + aBirth * 13.0 + aStart.x * 7.0);
          gl_PointSize = clamp(16.0 * uPixelRatio * (1.0 - k * 0.6) / -mv.z, 1.0, 28.0);
          vColor = mix(vec3(1.0), aColor, smoothstep(0.0, 0.25, k));
          vAlpha = (1.0 - smoothstep(0.55, 1.0, k)) * flicker;
        }`,
      fragmentShader: /* glsl */`
        varying vec3 vColor; varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - 0.5) * 2.0;
          if (d > 1.0) discard;
          gl_FragColor = vec4(vColor * 1.6, pow(1.0 - d, 1.5) * vAlpha);
        }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    });
    this.points = new THREE.Points(geo, this.material);
    this.points.frustumCulled = false;
  }

  burst(center, { count = 700, color = '#ff4fa3', speed = 5, heart = false } = {}) {
    const c = new THREE.Color(), base = new THREE.Color(color), white = new THREE.Color('#fff');
    for (let n = 0; n < count; n++) {
      const i = this.cursor; this.cursor = (this.cursor + 1) % this.max;
      let vx, vy, vz;
      if (heart) {
        const t = Math.random() * Math.PI * 2;
        const hx = 16 * Math.pow(Math.sin(t), 3) / 16, hy = (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 16;
        const k = .85 + Math.random() * .2;
        vx = hx * speed * k; vy = hy * speed * k; vz = (Math.random() - .5) * speed * .25;
      } else {
        const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, s = Math.sqrt(1 - u * u);
        const k = speed * (.75 + Math.random() * .3);
        vx = s * Math.cos(th) * k; vy = u * k; vz = s * Math.sin(th) * k;
      }
      c.copy(base).lerp(white, Math.random() * .35);
      this.aStart.setXYZ(i, center.x, center.y, center.z);
      this.aVel.setXYZ(i, vx, vy, vz);
      this.aColor.setXYZ(i, c.r, c.g, c.b);
      this.aBirth.setX(i, this.time + Math.random() * .05);
    }
    [this.aStart, this.aVel, this.aColor, this.aBirth].forEach(a => (a.needsUpdate = true));
  }

  setPixelRatio(v) { this.material.uniforms.uPixelRatio.value = v; }
  update(t) { this.time = t; this.material.uniforms.uTime.value = t; }
}
