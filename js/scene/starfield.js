import * as THREE from 'three';

/** Three layers of stars on spherical shells, plus a soft pink nebula made of glowing billboards. */
export class Starfield {
  constructor({ count, pixelRatio }) {
    this.group = new THREE.Group();
    const layers = [
      { n: Math.round(count * .55), r: 160, size: 1.2 },
      { n: Math.round(count * .3), r: 110, size: 1.8 },
      { n: Math.round(count * .15), r: 70, size: 2.6 }
    ];
    const palette = ['#ffffff', '#ffe3f1', '#d9e4ff', '#ffd1e8', '#e7d6ff'].map(c => new THREE.Color(c));
    this.materials = [];

    for (const L of layers) {
      const pos = new Float32Array(L.n * 3), col = new Float32Array(L.n * 3), seed = new Float32Array(L.n), size = new Float32Array(L.n);
      for (let i = 0; i < L.n; i++) {
        const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, s = Math.sqrt(1 - u * u);
        const rr = L.r * (.85 + Math.random() * .3);
        pos[i * 3] = s * Math.cos(th) * rr; pos[i * 3 + 1] = u * rr; pos[i * 3 + 2] = s * Math.sin(th) * rr;
        const c = palette[Math.floor(Math.random() * palette.length)];
        col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
        seed[i] = Math.random();
        size[i] = L.size * (.5 + Math.pow(Math.random(), 3) * 1.8);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
      geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
      geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
      const mat = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uPixelRatio: { value: pixelRatio }, uOpacity: { value: 1 } },
        vertexShader: /* glsl */`
          uniform float uTime, uPixelRatio, uOpacity;
          attribute vec3 aColor; attribute float aSeed; attribute float aSize;
          varying vec3 vColor; varying float vAlpha;
          void main() {
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * mv;
            float tw = 0.6 + 0.4 * sin(uTime * (0.8 + aSeed * 2.5) + aSeed * 60.0);
            gl_PointSize = max(1.0, aSize * uPixelRatio * (0.8 + 0.4 * tw));
            vColor = aColor; vAlpha = uOpacity * tw;
          }`,
        fragmentShader: /* glsl */`
          varying vec3 vColor; varying float vAlpha;
          void main() {
            float d = length(gl_PointCoord - 0.5) * 2.0;
            if (d > 1.0) discard;
            gl_FragColor = vec4(vColor, pow(1.0 - d, 2.0) * vAlpha);
          }`,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
      });
      this.materials.push(mat);
      const pts = new THREE.Points(geo, mat);
      pts.frustumCulled = false;
      this.group.add(pts);
    }

    // nebula
    const tex = this.makeNebulaTexture();
    const nebColors = ['#ff4fa3', '#9b5cff', '#ff7ab8', '#6a2cff', '#ff2e93', '#c86bff'];
    this.nebula = [];
    for (let i = 0; i < 9; i++) {
      const mat = new THREE.SpriteMaterial({ map: tex, color: nebColors[i % nebColors.length], transparent: true, opacity: .022 + Math.random() * .03, depthWrite: false, blending: THREE.AdditiveBlending, rotation: Math.random() * Math.PI });
      const s = new THREE.Sprite(mat);
      const a = (i / 9) * Math.PI * 2 + Math.random() * .5;
      const dist = 55 + Math.random() * 40;
      s.position.set(Math.cos(a) * dist, (Math.random() - .35) * 40, Math.sin(a) * dist);
      const sc = 70 + Math.random() * 60;
      s.scale.set(sc, sc * (.6 + Math.random() * .4), 1);
      s.userData.spin = (Math.random() - .5) * .02;
      this.nebula.push(s);
      this.group.add(s);
    }
  }

  makeNebulaTexture() {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d');
    for (let i = 0; i < 28; i++) {
      const x = 128 + (Math.random() - .5) * 120, y = 128 + (Math.random() - .5) * 90, r = 30 + Math.random() * 70;
      const grd = g.createRadialGradient(x, y, 0, x, y, r);
      grd.addColorStop(0, `rgba(255,255,255,${.08 + Math.random() * .1})`);
      grd.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
    }
    const mask = g.createRadialGradient(128, 128, 40, 128, 128, 128);
    mask.addColorStop(0, 'rgba(0,0,0,0)'); mask.addColorStop(1, 'rgba(0,0,0,1)');
    g.globalCompositeOperation = 'destination-out'; g.fillStyle = mask; g.fillRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  setPixelRatio(v) { this.materials.forEach(m => (m.uniforms.uPixelRatio.value = v)); }
  update(t) {
    this.materials.forEach(m => (m.uniforms.uTime.value = t));
    this.group.rotation.y = t * .004;
    for (const s of this.nebula) s.material.rotation += s.userData.spin * .016;
  }
}
