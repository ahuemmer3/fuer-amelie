import * as THREE from 'three';
import { omegaAt } from './galaxy.js';

/** Rings of glowing love notes lying flat on the galaxy and turning with it. */
export class TextRings {
  constructor({ rings, maxTexture = 4096 }) {
    this.group = new THREE.Group();
    this.rings = [];
    const layout = [
      { radius: 5.4, width: .62 },
      { radius: 8.6, width: .74 },
      { radius: 12.2, width: .9 }
    ];
    rings.forEach((messages, i) => {
      if (!messages || !messages.length) return;
      const L = layout[i] || { radius: 12.2 + (i - 2) * 3, width: .9 };
      this.rings.push(this.makeRing(messages, L.radius, L.width, maxTexture, i));
    });
  }

  makeRing(messages, radius, width, maxTex, idx) {
    const text = messages.join('   ♥   ') + '   ♥   ';
    const H = 128;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    let fontPx = 72;
    const font = px => `italic 600 ${px}px "Cormorant Garamond", Georgia, serif`;
    ctx.font = font(fontPx);
    let tw = Math.ceil(ctx.measureText(text).width) + 20;
    if (tw > maxTex) { fontPx = Math.floor(fontPx * maxTex / tw); ctx.font = font(fontPx); tw = Math.ceil(ctx.measureText(text).width) + 20; }
    canvas.width = Math.min(maxTex, tw); canvas.height = H;
    ctx.font = font(fontPx);
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.shadowColor = 'rgba(255,140,200,1)';
    ctx.shadowBlur = 14;
    ctx.fillText(text, 10, H / 2 + 4);
    ctx.shadowBlur = 0;
    ctx.fillText(text, 10, H / 2 + 4);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.anisotropy = 4;
    tex.colorSpace = THREE.SRGBColorSpace;

    const circ = Math.PI * 2 * radius;
    const stripLen = canvas.width / H * width;
    const repeats = Math.max(1, Math.round(circ / stripLen));

    const segs = 320;
    const geo = new THREE.RingGeometry(radius - width / 2, radius + width / 2, segs, 1);
    const uv = geo.attributes.uv;
    for (let i = 0; i <= 1; i++) {
      for (let j = 0; j <= segs; j++) {
        const k = i * (segs + 1) + j;
        uv.setXY(k, (j / segs) * repeats, 1 - i);
      }
    }
    uv.needsUpdate = true;

    const mat = new THREE.ShaderMaterial({
      uniforms: { uMap: { value: tex }, uTime: { value: 0 }, uOpacity: { value: 0 }, uColor: { value: new THREE.Color(idx === 1 ? '#ffc0e0' : '#ff8fc7') } },
      vertexShader: /* glsl */`
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */`
        uniform sampler2D uMap; uniform float uTime, uOpacity; uniform vec3 uColor;
        varying vec2 vUv;
        void main() {
          vec4 t = texture2D(uMap, vUv);
          float shimmer = 0.75 + 0.25 * sin(uTime * 1.6 + vUv.x * 2.5);
          vec3 col = mix(uColor, vec3(1.0, 0.95, 0.98), smoothstep(0.62, 1.0, t.g)) * t.a * shimmer;
          gl_FragColor = vec4(col * 1.25, t.a * uOpacity);
        }`,
      transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    const holder = new THREE.Group();
    holder.position.y = .06 + idx * .05;
    holder.add(mesh);
    this.group.add(holder);
    return { holder, mat, omega: omegaAt(radius), phase: Math.random() * Math.PI * 2 };
  }

  setOpacity(o) { this.rings.forEach(r => (r.mat.uniforms.uOpacity.value = o)); }
  update(t) {
    for (const r of this.rings) {
      r.holder.rotation.y = -(r.phase + t * r.omega);
      r.mat.uniforms.uTime.value = t;
    }
  }
}
