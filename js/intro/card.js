import * as THREE from 'three';

/**
 * Turns the DOM start card into particles: the card is redrawn on a canvas, sampled,
 * and each sample becomes a point placed exactly where it was on screen (in camera space).
 */
export class CardDissolve {
  constructor({ camera, pixelRatio, maxCount = 14000 }) {
    this.camera = camera;
    this.pixelRatio = pixelRatio;
    this.maxCount = maxCount;
    this.points = null;
    this.progress = -1;
  }

  build(cardEl) {
    const rect = cardEl.getBoundingClientRect();
    const W = window.innerWidth, H = window.innerHeight;
    const s = .5; // sampling resolution
    const cw = Math.ceil(rect.width * s), ch = Math.ceil(rect.height * s);
    const c = document.createElement('canvas'); c.width = cw; c.height = ch;
    const g = c.getContext('2d');
    g.scale(s, s);
    const r = 28;
    // card body
    g.fillStyle = 'rgba(255,200,230,.35)';
    g.beginPath(); g.roundRect ? g.roundRect(0, 0, rect.width, rect.height, r) : g.rect(0, 0, rect.width, rect.height); g.fill();
    g.strokeStyle = '#ffd3e7'; g.lineWidth = 3; g.stroke();
    // text + button, using the real element positions
    const draw = (sel, fn) => { const el = cardEl.querySelector(sel); if (!el) return; const b = el.getBoundingClientRect(); fn(b.left - rect.left, b.top - rect.top, b.width, b.height, el, getComputedStyle(el)); };
    g.textAlign = 'center'; g.textBaseline = 'middle';
    draw('.card-title', (x, y, w, h, el, cs) => { g.fillStyle = '#fff'; g.font = `${cs.fontSize} "Great Vibes", cursive`; g.fillText(el.textContent, x + w / 2, y + h / 2); });
    draw('.card-date', (x, y, w, h, el, cs) => { g.fillStyle = '#ff8fc7'; g.font = `600 ${cs.fontSize} Manrope, sans-serif`; g.fillText(el.textContent.toUpperCase(), x + w / 2, y + h / 2); });
    draw('.card-sub', (x, y, w, h, el, cs) => { g.fillStyle = '#ffd3e7'; g.font = `italic 500 ${cs.fontSize} "Cormorant Garamond", serif`; g.fillText(el.textContent, x + w / 2, y + h / 2, w); });
    draw('.card-btn', (x, y, w, h) => { g.fillStyle = '#ff7fb8'; g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, h / 2) : g.rect(x, y, w, h); g.fill(); });
    const data = g.getImageData(0, 0, cw, ch).data;

    const samples = [];
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
      const i = (y * cw + x) * 4, a = data[i + 3];
      if (a < 40) continue;
      const bright = (data[i] + data[i + 1] + data[i + 2]) / 765;
      if (Math.random() > (bright > .85 ? .9 : .32)) continue;
      samples.push([x / s, y / s, data[i] / 255, data[i + 1] / 255, data[i + 2] / 255]);
    }
    // keep within budget
    while (samples.length > this.maxCount) samples.splice(Math.floor(Math.random() * samples.length), 1);

    const n = samples.length;
    const start = new Float32Array(n * 3), dir = new Float32Array(n * 3), col = new Float32Array(n * 3), delay = new Float32Array(n);
    const D = 10, halfH = D * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)), aspect = W / H;
    samples.forEach((sm, i) => {
      const sx = rect.left + sm[0], sy = rect.top + sm[1];
      const nx = sx / W * 2 - 1, ny = -(sy / H) * 2 + 1;
      start[i * 3] = nx * halfH * aspect; start[i * 3 + 1] = ny * halfH; start[i * 3 + 2] = -D;
      const a = Math.random() * Math.PI * 2;
      dir[i * 3] = Math.cos(a) * (.5 + Math.random()) + nx * 1.2;
      dir[i * 3 + 1] = Math.sin(a) * (.5 + Math.random()) + .6;
      dir[i * 3 + 2] = (Math.random() - .3) * 2.5;
      col[i * 3] = Math.min(1, sm[2] * 1.2); col[i * 3 + 1] = Math.min(1, sm[3] * 1.1); col[i * 3 + 2] = Math.min(1, sm[4] * 1.1);
      delay[i] = (sm[0] / rect.width) * .55 + Math.random() * .25;
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(start, 3));
    geo.setAttribute('aDir', new THREE.BufferAttribute(dir, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('aDelay', new THREE.BufferAttribute(delay, 1));
    this.material = new THREE.ShaderMaterial({
      uniforms: { uProgress: { value: 0 }, uPixelRatio: { value: this.pixelRatio }, uTime: { value: 0 } },
      vertexShader: /* glsl */`
        uniform float uProgress, uPixelRatio, uTime;
        attribute vec3 aDir, aColor; attribute float aDelay;
        varying vec3 vColor; varying float vAlpha;
        void main() {
          float k = clamp((uProgress * 1.7 - aDelay) / 0.9, 0.0, 1.0);
          float e = 1.0 - pow(1.0 - k, 3.0);
          vec3 p = position + aDir * e * 5.0;
          p.x += sin(k * 6.0 + aDelay * 40.0) * 0.3 * k;
          p.y += cos(k * 5.0 + aDelay * 30.0) * 0.3 * k;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = (2.2 + k * 2.5) * uPixelRatio;
          vColor = mix(aColor, vec3(1.0, 0.5, 0.78), k);
          vAlpha = (1.0 - k) * smoothstep(0.0, 0.04, uProgress + 0.04);
        }`,
      fragmentShader: /* glsl */`
        varying vec3 vColor; varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - 0.5) * 2.0;
          if (d > 1.0) discard;
          gl_FragColor = vec4(vColor, pow(1.0 - d, 1.4) * vAlpha);
        }`,
      transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending
    });
    this.points = new THREE.Points(geo, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 10;
    this.camera.add(this.points);
    this.progress = 0;
  }

  update(dt) {
    if (!this.points || this.progress < 0) return;
    this.progress += dt / 2.2;
    this.material.uniforms.uProgress.value = this.progress;
    if (this.progress >= 1.2) this.dispose();
  }

  dispose() {
    if (!this.points) return;
    this.camera.remove(this.points);
    this.points.geometry.dispose(); this.material.dispose();
    this.points = null; this.progress = -1;
  }
}
