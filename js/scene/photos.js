import * as THREE from 'three';
import { omegaAt } from './galaxy.js';

/** Round, glowing photo billboards orbiting the centre. */
export class PhotoOrbs {
  constructor({ items, textures, accent }) {
    this.group = new THREE.Group();
    this.orbs = [];
    const geo = new THREE.PlaneGeometry(1, 1);
    const n = items.length;
    items.forEach((item, i) => {
      const tex = textures[i];
      if (!tex) return;
      const mat = new THREE.ShaderMaterial({
        uniforms: { uMap: { value: tex }, uHover: { value: 0 }, uOpacity: { value: 0 }, uGlow: { value: new THREE.Color(accent) }, uTime: { value: 0 } },
        vertexShader: /* glsl */`
          varying vec2 vUv;
          void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: /* glsl */`
          uniform sampler2D uMap; uniform float uHover, uOpacity, uTime; uniform vec3 uGlow;
          varying vec2 vUv;
          void main() {
            vec2 c = vUv - 0.5;
            float d = length(c) * 2.0;
            float R = 0.74;
            vec4 tex = texture2D(uMap, c / R * 0.5 + 0.5);
            float inside = 1.0 - smoothstep(R - 0.015, R, d);
            float rim = exp(-pow((d - R - 0.025) / 0.028, 2.0));
            float glow = exp(-max(d - R, 0.0) / 0.09) * (1.0 - inside);
            float pulse = 0.85 + 0.15 * sin(uTime * 2.0);
            vec3 photo = pow(tex.rgb, vec3(1.12)) * 1.08;
            vec3 col = photo * inside * (0.95 + uHover * 0.12) + uGlow * (rim * 1.3 + glow * 0.45) * pulse * (1.0 + uHover * 0.8);
            float a = max(inside, max(rim, glow * 0.85)) * uOpacity;
            if (a < 0.01) discard;
            gl_FragColor = vec4(col, a);
          }`,
        transparent: true, depthWrite: false
      });
      const mesh = new THREE.Mesh(geo, mat);
      const ring = i % 3;
      const perRing = Math.ceil(n / 3), slot = Math.floor(i / 3);
      const radius = 4.8 + ring * 3.2 + (slot % 2) * .5;
      const size = 1.55 + (ring === 2 ? .35 : ring === 1 ? .2 : 0) + Math.random() * .2;
      mesh.scale.setScalar(size);
      mesh.userData = {
        index: i, item, radius, size,
        angle: (slot / perRing) * Math.PI * 2 + ring * 1.1,
        height: .9 + Math.sin(i * 2.3) * .9 + ring * .35,
        omega: omegaAt(radius) * 1.15,
        bob: Math.random() * Math.PI * 2,
        hover: 0
      };
      mesh.renderOrder = 2;
      this.orbs.push(mesh);
      this.group.add(mesh);
    });
  }

  setOpacity(o) { this.orbs.forEach(m => (m.material.uniforms.uOpacity.value = o)); }

  setHover(mesh) { this.hovered = mesh; }

  update(t, dt, camera) {
    for (const m of this.orbs) {
      const u = m.userData;
      const a = u.angle + t * u.omega;
      m.position.set(Math.cos(a) * u.radius, u.height + Math.sin(t * .7 + u.bob) * .25, Math.sin(a) * u.radius);
      m.quaternion.copy(camera.quaternion);
      u.hover += ((this.hovered === m ? 1 : 0) - u.hover) * Math.min(1, dt * 10);
      m.scale.setScalar(u.size * (1 + u.hover * .18));
      m.material.uniforms.uHover.value = u.hover;
      m.material.uniforms.uTime.value = t + u.bob;
    }
  }
}
