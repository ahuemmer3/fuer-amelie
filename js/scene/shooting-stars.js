import * as THREE from 'three';
import { rand } from '../core/utils.js';

/** Occasional shooting stars across the sky. They can be tapped (easter egg). */
export class ShootingStars {
  constructor({ pixelRatio }) {
    this.group = new THREE.Group();
    this.stars = [];
    this.timer = rand(4, 8);
    this.enabled = false;
    this.pixelRatio = pixelRatio;
  }

  spawn(camera) {
    const segs = 70;
    const pos = new Float32Array(segs * 3), t = new Float32Array(segs);
    for (let i = 0; i < segs; i++) t[i] = i / (segs - 1);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aT', new THREE.BufferAttribute(t, 1));
    const mat = new THREE.ShaderMaterial({
      uniforms: { uPixelRatio: { value: this.pixelRatio }, uFade: { value: 1 } },
      vertexShader: /* glsl */`
        uniform float uPixelRatio, uFade; attribute float aT; varying float vT;
        void main() {
          vT = aT;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = max(1.0, (1.0 + aT * 4.0) * uPixelRatio);
        }`,
      fragmentShader: /* glsl */`
        uniform float uFade; varying float vT;
        void main() {
          float d = length(gl_PointCoord - 0.5) * 2.0;
          if (d > 1.0) discard;
          vec3 col = mix(vec3(1.0, 0.45, 0.75), vec3(1.0), vT);
          gl_FragColor = vec4(col, pow(1.0 - d, 1.5) * pow(vT, 1.4) * uFade);
        }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    // start somewhere in front of the camera, high in the sky
    const fwd = new THREE.Vector3(); camera.getWorldDirection(fwd);
    const rightV = new THREE.Vector3().crossVectors(fwd, camera.up).normalize();
    const upV = new THREE.Vector3().crossVectors(rightV, fwd).normalize();
    const center = camera.position.clone().add(fwd.multiplyScalar(60));
    const start = center.clone().add(rightV.clone().multiplyScalar(rand(-40, 10))).add(upV.clone().multiplyScalar(rand(12, 26)));
    const dir = rightV.clone().multiplyScalar(rand(.8, 1)).add(upV.clone().multiplyScalar(rand(-.6, -.3))).normalize();
    this.group.add(pts);
    this.stars.push({ pts, geo, mat, start, dir, life: 0, dur: rand(1.1, 1.6), speed: rand(45, 60), head: start.clone() });
  }

  update(dt, camera) {
    if (this.enabled) {
      this.timer -= dt;
      if (this.timer <= 0) { this.spawn(camera); this.timer = rand(6, 13); }
    }
    for (let i = this.stars.length - 1; i >= 0; i--) {
      const s = this.stars[i];
      s.life += dt;
      const p = s.life / s.dur;
      if (p >= 1) { this.group.remove(s.pts); s.geo.dispose(); s.mat.dispose(); this.stars.splice(i, 1); continue; }
      const dist = s.life * s.speed;
      s.head.copy(s.start).addScaledVector(s.dir, dist);
      const arr = s.geo.attributes.position.array, n = arr.length / 3, len = Math.min(dist, 9);
      for (let k = 0; k < n; k++) {
        const back = (1 - k / (n - 1)) * len;
        arr[k * 3] = s.head.x - s.dir.x * back; arr[k * 3 + 1] = s.head.y - s.dir.y * back; arr[k * 3 + 2] = s.head.z - s.dir.z * back;
      }
      s.geo.attributes.position.needsUpdate = true;
      s.mat.uniforms.uFade.value = Math.min(1, p * 8, (1 - p) * 3);
    }
  }

  /** Returns true when a screen tap (px) is close to a flying star's head */
  hitTest(x, y, camera, w, hgt) {
    const v = new THREE.Vector3();
    for (const s of this.stars) {
      v.copy(s.head).project(camera);
      if (v.z > 1) continue;
      const sx = (v.x * .5 + .5) * w, sy = (-v.y * .5 + .5) * hgt;
      if (Math.hypot(sx - x, sy - y) < 70) { s.life = s.dur * .95; return true; }
    }
    return false;
  }

  setPixelRatio(v) { this.pixelRatio = v; }
}
