import * as THREE from 'three';
import { heartBeat } from '../core/utils.js';

/** Implicit 3D heart: (x² + 9/4 d² + z² − 1)³ − x² z³ − 9/80 d² z³ ≤ 0  (z = up, d = depth) */
const heartF = (x, z, d) => {
  const a = x * x + 2.25 * d * d + z * z - 1;
  return a * a * a - x * x * z * z * z - .1125 * d * d * z * z * z;
};

/** Point on the surface along a direction from an interior point (binary search) */
function surfacePoint(dx, dz, dd, cz) {
  let lo = 0, hi = 2;
  for (let i = 0; i < 22; i++) {
    const m = (lo + hi) / 2;
    if (heartF(dx * m, cz + dz * m, dd * m) <= 0) lo = m; else hi = m;
  }
  return lo;
}

export class Heart {
  constructor({ count, streamCount, colors, pixelRatio, y = 5.1, scale = 2.5, earthR = 2.4, earthY = -.5 }) {
    this.y = y; this.scale = scale;
    this.group = new THREE.Group();
    this.group.position.set(0, y, 0);
    this.group.scale.setScalar(scale);

    const pos = new Float32Array(count * 3), scatter = new Float32Array(count * 3), seed = new Float32Array(count), col = new Float32Array(count * 3), size = new Float32Array(count);
    const c1 = new THREE.Color(colors.herz1), c2 = new THREE.Color(colors.herz2), c = new THREE.Color(), w = new THREE.Color('#fff');
    const cz = .15; // interior reference point (slightly above centre)
    for (let i = 0; i < count; i++) {
      // random direction, find the surface, then place the point inside with a bias towards the shell
      let dx, dz, dd, len;
      do { dx = Math.random() * 2 - 1; dz = Math.random() * 2 - 1; dd = Math.random() * 2 - 1; len = Math.hypot(dx, dz, dd); } while (len > 1 || len < .01);
      dx /= len; dz /= len; dd /= len;
      const s = surfacePoint(dx, dz, dd, cz);
      const shell = Math.random() < .72;
      const k = shell ? 1 - Math.pow(Math.random(), 3) * .12 : Math.cbrt(Math.random()) * .92;
      const x = dx * s * k, z = cz + dz * s * k, d = dd * s * k;
      pos[i * 3] = x; pos[i * 3 + 1] = z; pos[i * 3 + 2] = d * .9;
      const sl = Math.hypot(x, z - .1, d) || 1;
      scatter[i * 3] = x / sl + (Math.random() - .5) * .6;
      scatter[i * 3 + 1] = (z - .1) / sl + (Math.random() - .5) * .6;
      scatter[i * 3 + 2] = d / sl + (Math.random() - .5) * .6;
      seed[i] = Math.random();
      c.copy(c1).lerp(c2, Math.min(1, Math.max(0, (z + 1) / 2.3)) * .8 + Math.random() * .2);
      if (Math.random() < .07) c.lerp(w, .8);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
      size[i] = (shell ? 1 : .75) * (.6 + Math.pow(Math.random(), 3) * 1.5);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aScatter', new THREE.BufferAttribute(scatter, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 }, uBeat: { value: 1 }, uExplode: { value: 0 }, uSize: { value: 34 },
        uPixelRatio: { value: pixelRatio }, uAudio: { value: 0 }, uGold: { value: 0 }, uOpacity: { value: 0 }, uPull: { value: 0 }
      },
      vertexShader: /* glsl */`
        uniform float uTime, uBeat, uExplode, uSize, uPixelRatio, uAudio, uGold, uOpacity, uPull;
        attribute vec3 aScatter; attribute float aSeed; attribute vec3 aColor; attribute float aSize;
        varying vec3 vColor; varying float vAlpha;
        void main() {
          vec3 p = position * uBeat;
          p += 0.018 * vec3(sin(uTime * 2.1 + aSeed * 31.0), cos(uTime * 1.7 + aSeed * 23.0), sin(uTime * 2.4 + aSeed * 17.0));
          float e = uExplode;
          p += aScatter * e * (1.4 + aSeed * 3.2);
          float sw = e * (2.5 + aSeed * 2.0);
          float cs = cos(sw), sn = sin(sw);
          p.xz = mat2(cs, -sn, sn, cs) * p.xz;
          // pulled towards the black hole (easter egg)
          vec3 hole = vec3(0.0, -2.04, 0.0);
          p = mix(p, hole + (p - hole) * 0.15, uPull * (0.5 + 0.5 * aSeed));
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          float tw = 0.75 + 0.25 * sin(uTime * 3.0 + aSeed * 50.0);
          gl_PointSize = clamp(aSize * uSize * uPixelRatio * (1.0 + uAudio * 0.18) * (0.9 + e * 0.4) / -mv.z, 1.0, 48.0);
          vec3 gold = vec3(1.0, 0.78, 0.38) * (0.75 + 0.5 * fract(aSeed * 13.7));
          vColor = mix(aColor, gold, uGold) * (1.2 + uAudio * 0.2);
          vAlpha = uOpacity * tw * (1.0 - e * 0.25);
        }`,
      fragmentShader: /* glsl */`
        varying vec3 vColor; varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - 0.5) * 2.0;
          if (d > 1.0) discard;
          float a = pow(1.0 - d, 1.6) + 0.3 * exp(-d * 8.0);
          gl_FragColor = vec4(vColor, a * vAlpha);
        }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    });
    this.points = new THREE.Points(geo, this.material);
    this.points.frustumCulled = false;
    this.group.add(this.points);
    this.count = count;

    // invisible hit target
    this.hit = new THREE.Mesh(new THREE.SphereGeometry(1.15, 16, 12), new THREE.MeshBasicMaterial({ visible: false }));
    this.hit.position.y = .1;
    this.group.add(this.hit);

    // vortex stream from the heart's tip down onto the Earth, where it spreads out (fully animated on the GPU)
    const sSeed = new Float32Array(streamCount * 3), sCol = new Float32Array(streamCount * 3);
    for (let i = 0; i < streamCount; i++) {
      sSeed[i * 3] = Math.random(); sSeed[i * 3 + 1] = Math.random(); sSeed[i * 3 + 2] = Math.random();
      c.copy(c2).lerp(w, Math.random() * .5); if (Math.random() < .3) c.copy(c1);
      sCol[i * 3] = c.r; sCol[i * 3 + 1] = c.g; sCol[i * 3 + 2] = c.b;
    }
    const sGeo = new THREE.BufferGeometry();
    sGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(streamCount * 3), 3));
    sGeo.setAttribute('aSeed', new THREE.BufferAttribute(sSeed, 3));
    sGeo.setAttribute('aColor', new THREE.BufferAttribute(sCol, 3));
    this.streamMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uTipY: { value: y - scale * .98 }, uEarthR: { value: earthR }, uEarthY: { value: earthY }, uSize: { value: 13 }, uPixelRatio: { value: pixelRatio }, uOpacity: { value: 0 } },
      vertexShader: /* glsl */`
        uniform float uTime, uTipY, uEarthR, uEarthY, uSize, uPixelRatio, uOpacity;
        attribute vec3 aSeed; attribute vec3 aColor;
        varying vec3 vColor; varying float vAlpha;
        void main() {
          float s = fract(aSeed.x + uTime * 0.07);
          float ang = aSeed.y * 6.28318 + s * 13.0 + uTime * 0.5;
          // a narrow vortex down to the top of the globe …
          float k = smoothstep(0.0, 0.7, s);
          float y = mix(uTipY, uEarthY + uEarthR * 1.03, pow(k, 0.9));
          float rad = 0.03 + sin(k * 3.14159) * (0.45 + 0.6 * aSeed.z) * (1.0 - k * 0.6);
          vec3 p = vec3(cos(ang) * rad, y, sin(ang) * rad);
          // … where it lands and flows out over the surface
          float th = smoothstep(0.62, 1.0, s) * (0.55 + 0.75 * aSeed.z);
          vec3 onEarth = vec3(0.0, uEarthY, 0.0) + uEarthR * 1.018 * vec3(sin(th) * cos(ang), cos(th), sin(th) * sin(ang));
          p = mix(p, onEarth, smoothstep(0.58, 0.72, s));
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = clamp((0.6 + aSeed.z) * uSize * uPixelRatio / -mv.z, 1.0, 24.0);
          vColor = aColor;
          vAlpha = uOpacity * smoothstep(0.0, 0.08, s) * (1.0 - smoothstep(0.86, 1.0, s)) * 0.9;
        }`,
      fragmentShader: /* glsl */`
        varying vec3 vColor; varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - 0.5) * 2.0;
          if (d > 1.0) discard;
          gl_FragColor = vec4(vColor, pow(1.0 - d, 1.8) * vAlpha);
        }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    });
    this.stream = new THREE.Points(sGeo, this.streamMat);
    this.stream.frustumCulled = false;

    this.explodeT = -1;
    this.goldT = 0;
    this.pullT = -1;
  }

  explode() { if (this.explodeT < 0) this.explodeT = 0; }
  gold(seconds = 8) { this.goldT = seconds; }
  pull() { this.pullT = 0; }
  setOpacity(o, stream = o) { this.material.uniforms.uOpacity.value = o; this.streamMat.uniforms.uOpacity.value = stream; }
  setPixelRatio(v) { this.material.uniforms.uPixelRatio.value = v; this.streamMat.uniforms.uPixelRatio.value = v; }
  setDensity(f) { this.points.geometry.setDrawRange(0, Math.floor(this.count * f)); }

  update(t, dt, audio) {
    const u = this.material.uniforms;
    u.uTime.value = t; u.uAudio.value = audio;
    this.streamMat.uniforms.uTime.value = t;
    u.uBeat.value = 1 + heartBeat(t) * .07 + audio * .03;
    this.group.rotation.y = Math.sin(t * .25) * .5;
    this.group.position.y = this.y + Math.sin(t * .8) * .12;

    if (this.explodeT >= 0) {
      this.explodeT += dt;
      const p = this.explodeT / 1.9;
      u.uExplode.value = p < .3 ? 1 - Math.pow(1 - p / .3, 3) : Math.max(0, 1 - Math.pow((p - .3) / .7, 2) * (3 - 2 * ((p - .3) / .7)) * 1);
      if (p >= 1) { this.explodeT = -1; u.uExplode.value = 0; }
    }
    if (this.goldT > 0) { this.goldT -= dt; u.uGold.value = Math.min(1, u.uGold.value + dt * 2); }
    else u.uGold.value = Math.max(0, u.uGold.value - dt);
    if (this.pullT >= 0) {
      this.pullT += dt;
      const p = this.pullT / 2.4;
      u.uPull.value = Math.sin(Math.min(1, p) * Math.PI) * .9;
      if (p >= 1) { this.pullT = -1; u.uPull.value = 0; }
    }
  }
}
