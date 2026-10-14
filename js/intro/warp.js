import * as THREE from 'three';

/** Warp tunnel: thousands of pink and white streaks rushing past the camera. */
export class Warp {
  constructor({ camera, count }) {
    this.camera = camera;
    const n = count;
    const start = new Float32Array(n * 2 * 3), end = new Float32Array(n * 2), speed = new Float32Array(n * 2), col = new Float32Array(n * 2 * 3);
    const pink = new THREE.Color('#ff4fa3'), rose = new THREE.Color('#ffb3d4'), white = new THREE.Color('#ffffff'), violet = new THREE.Color('#b78cff'), c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = .6 + Math.pow(Math.random(), .6) * 14;
      const x = Math.cos(a) * r, y = Math.sin(a) * r, z = Math.random() * 220;
      const sp = .55 + Math.random() * .9;
      const roll = Math.random();
      c.copy(roll < .4 ? white : roll < .75 ? pink : roll < .92 ? rose : violet);
      for (let k = 0; k < 2; k++) {
        const j = i * 2 + k;
        start[j * 3] = x; start[j * 3 + 1] = y; start[j * 3 + 2] = z;
        end[j] = k; speed[j] = sp;
        col[j * 3] = c.r; col[j * 3 + 1] = c.g; col[j * 3 + 2] = c.b;
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(start, 3));
    geo.setAttribute('aEnd', new THREE.BufferAttribute(end, 1));
    geo.setAttribute('aSpeed', new THREE.BufferAttribute(speed, 1));
    geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    this.material = new THREE.ShaderMaterial({
      uniforms: { uDist: { value: 0 }, uLen: { value: 0 }, uOpacity: { value: 0 } },
      vertexShader: /* glsl */`
        uniform float uDist, uLen, uOpacity;
        attribute float aEnd, aSpeed; attribute vec3 aColor;
        varying vec3 vColor; varying float vAlpha;
        void main() {
          float z = -220.0 + mod(position.z + uDist * aSpeed, 220.0);
          float zz = z - aEnd * (0.2 + uLen * aSpeed);
          vec3 p = vec3(position.xy, zz);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
          vColor = aColor;
          vAlpha = uOpacity * smoothstep(-220.0, -140.0, z) * (1.0 - aEnd * 0.9) * smoothstep(0.0, -4.0, z);
        }`,
      fragmentShader: /* glsl */`
        varying vec3 vColor; varying float vAlpha;
        void main() { gl_FragColor = vec4(vColor * 1.8, vAlpha); }`,
      transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending
    });
    this.lines = new THREE.LineSegments(geo, this.material);
    this.lines.frustumCulled = false;
    this.lines.renderOrder = 9;
    this.active = false;
    this.t = 0;
  }

  start() { this.camera.add(this.lines); this.active = true; this.t = 0; }

  /** Timeline (seconds): ramp up 0–1.4, cruise, slow down 2.4–4.2 */
  update(dt) {
    if (!this.active) return;
    this.t += dt;
    const t = this.t, u = this.material.uniforms;
    let speed;
    if (t < 1.4) speed = Math.pow(t / 1.4, 2) * 240;
    else if (t < 2.4) speed = 240;
    else speed = Math.max(0, 240 * (1 - (t - 2.4) / 1.8));
    u.uDist.value += speed * dt;
    u.uLen.value = speed * .09;
    u.uOpacity.value = Math.min(1, t / .5) * (t > 2.8 ? Math.max(0, 1 - (t - 2.8) / 1.4) : 1);
    if (t > 4.4) this.stop();
  }

  stop() {
    this.active = false;
    this.camera.remove(this.lines);
    this.lines.geometry.dispose(); this.material.dispose();
  }
}
