import * as THREE from 'three';

/** Glowing planets that open games and surprises. Done = golden, locked = dim. */
export class Planets {
  constructor({ defs, labelRoot, onSelect, textures = {} }) {
    this.group = new THREE.Group();
    this.list = [];
    this.labelRoot = labelRoot;
    this.hovered = null;
    this.visible = 0;
    this.labelsOn = false;

    const sphere = new THREE.SphereGeometry(.78, 64, 48);
    const hitGeo = new THREE.SphereGeometry(1.5, 10, 8);
    const glowTex = this.glowTexture();
    const ringGeo = new THREE.RingGeometry(1.0, 1.75, 96, 1);
    { const pos = ringGeo.attributes.position, uv = ringGeo.attributes.uv, v = new THREE.Vector3(); for (let k = 0; k < pos.count; k++) { v.fromBufferAttribute(pos, k); uv.setXY(k, (v.length() - 1) / .75, .5); } }
    const orbitDefs = defs.filter(d => d.kind !== 'finale');

    defs.forEach(def => {
      const g = new THREE.Group();
      const map = textures[def.tex] || null;
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uMap: { value: map }, uHasMap: { value: map ? 1 : 0 }, uTint: { value: new THREE.Color(def.tint || '#ffffff') }, uRim: { value: new THREE.Color(def.color) },
          uTime: { value: 0 }, uGold: { value: 0 }, uLocked: { value: 0 }, uHover: { value: 0 }, uOpacity: { value: 0 }
        },
        vertexShader: /* glsl */`
          varying vec3 vN; varying vec3 vW; varying vec2 vUv;
          void main() {
            vUv = uv; vN = normalize(mat3(modelMatrix) * normal);
            vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz;
            gl_Position = projectionMatrix * viewMatrix * w;
          }`,
        fragmentShader: /* glsl */`
          uniform sampler2D uMap; uniform float uHasMap, uTime, uGold, uLocked, uHover, uOpacity; uniform vec3 uTint, uRim;
          varying vec3 vN; varying vec3 vW; varying vec2 vUv;
          void main() {
            vec3 V = normalize(cameraPosition - vW), N = normalize(vN);
            vec3 L = normalize(vec3(0.0, 3.0, 0.0) - vW);              // lit by the galaxy core
            float ndl = dot(N, L);
            vec3 tex = uHasMap > 0.5 ? texture2D(uMap, vUv).rgb : vec3(0.8);
            vec3 base = tex * uTint;
            float lum = dot(tex, vec3(0.3, 0.55, 0.15));
            vec3 gold = vec3(1.0, 0.72, 0.3) * (0.45 + lum * 1.1);
            base = mix(base, gold, uGold);
            float diff = 0.16 + 0.95 * max(ndl, 0.0);
            float fr = pow(1.0 - max(dot(N, V), 0.0), 2.6);
            vec3 rimCol = mix(uRim, vec3(1.0, 0.82, 0.45), uGold);
            vec3 col = base * diff + rimCol * fr * (0.9 + uHover * 1.8) * (0.4 + 0.6 * smoothstep(-0.4, 0.5, ndl));
            col *= mix(1.0, 0.3, uLocked);
            gl_FragColor = vec4(col, uOpacity);
          }`,
        transparent: true
      });
      const mesh = new THREE.Mesh(sphere, mat);
      g.add(mesh);

      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: def.color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
      glow.scale.setScalar(2.5);
      g.add(glow);

      let ring = null;
      if (def.ring) {
        ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ map: textures['saturn-ring.webp'] || null, color: textures['saturn-ring.webp'] ? '#ffffff' : def.color, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
        ring.rotation.x = -Math.PI / 2 + .45;
        g.add(ring);
      }

      const hit = new THREE.Mesh(hitGeo, new THREE.MeshBasicMaterial({ visible: false }));
      hit.userData.planetId = def.id;
      g.add(hit);

      if (def.kind === 'finale') g.position.set(0, 10.2, 0);
      else {
        const i = orbitDefs.indexOf(def), n = orbitDefs.length;
        const a = (i / n) * Math.PI * 2 + .3;
        const r = 18.5 + (i % 2) * 1.6;
        g.position.set(Math.cos(a) * r, 1.2 + Math.sin(i * 1.9) * 2.4, Math.sin(a) * r);
      }
      this.group.add(g);

      const label = document.createElement('div');
      label.className = 'plabel';
      label.innerHTML = `<span class="ic">${def.icon}</span><span class="tx"></span>`;
      label.querySelector('.tx').textContent = def.title;
      label.setAttribute('role', 'button');
      label.addEventListener('click', () => onSelect && onSelect(def.id));
      labelRoot.appendChild(label);

      this.list.push({ def, group: g, mesh, mat, glow, ring, hit, label, base: g.position.clone(), bob: Math.random() * 6, hover: 0, gold: 0, locked: 0 });
    });
  }

  glowTexture() {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, 'rgba(255,255,255,.9)'); grd.addColorStop(.25, 'rgba(255,255,255,.35)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }

  get(id) { return this.list.find(p => p.def.id === id); }
  hitMeshes() { return this.list.filter(p => !p.def.hidden).map(p => p.hit); }

  setState(id, { done, locked }) {
    const p = this.get(id); if (!p) return;
    if (done !== undefined) { p.targetGold = done ? 1 : 0; p.label.classList.toggle('done', !!done); }
    if (locked !== undefined) { p.targetLocked = locked ? 1 : 0; p.label.classList.toggle('locked', !!locked); p.label.querySelector('.ic').textContent = locked ? '🔒' : p.def.icon; }
  }

  setVisible(v) { this.visible = v; }
  setHover(id) {
    if (this.hovered === id) return;
    this.hovered = id;
    this.list.forEach(p => p.label.classList.toggle('hover', p.def.id === id));
  }

  update(t, dt, camera, w, hgt) {
    const v = new THREE.Vector3();
    for (const p of this.list) {
      p.group.position.y = p.base.y + Math.sin(t * .9 + p.bob) * .25;
      p.mesh.rotation.y = t * .15 + p.bob;
      if (p.ring) p.ring.rotation.z = t * .2;
      p.gold += ((p.targetGold || 0) - p.gold) * Math.min(1, dt * 3);
      p.locked += ((p.targetLocked || 0) - p.locked) * Math.min(1, dt * 3);
      p.hover += ((this.hovered === p.def.id ? 1 : 0) - p.hover) * Math.min(1, dt * 10);
      const u = p.mat.uniforms;
      u.uTime.value = t; u.uGold.value = p.gold; u.uLocked.value = p.locked; u.uHover.value = p.hover; u.uOpacity.value = this.visible;
      const pulse = .85 + .15 * Math.sin(t * 2 + p.bob);
      p.glow.material.opacity = this.visible * (.16 + p.gold * .35 + p.hover * .35) * (1 - p.locked * .75) * pulse;
      p.glow.material.color.set(p.gold > .5 ? '#ffc861' : p.def.color);
      if (p.ring) p.ring.material.opacity = this.visible * .9 * (1 - p.locked * .6);
      const s = 1 + p.hover * .2 + (p.def.kind === 'finale' ? .1 + (1 - p.locked) * .45 : 0);
      p.group.scale.setScalar(s);

      p.group.getWorldPosition(v);
      p.depth = v.distanceTo(camera.position);
      v.y -= 1.05 * s;
      v.project(camera);
      p.screen = { x: (v.x * .5 + .5) * w, y: (-v.y * .5 + .5) * hgt, on: v.z < 1 && Math.abs(v.x) < 1.02 && Math.abs(v.y) < .98 && this.visible > .5 };
    }
    this.placeLabels(w, hgt);
  }

  /** Greedy label placement: nearest planets first, overlapping labels are hidden. */
  placeLabels(w, hgt) {
    const order = [...this.list].sort((a, b) => (b.def.id === this.hovered) - (a.def.id === this.hovered) || a.depth - b.depth);
    const placed = [];
    for (const p of order) {
      let show = p.screen.on && this.labelsOn;
      if (show) {
        if (!p.labelW) p.labelW = p.label.offsetWidth;
        const lw = p.labelW || 110, lh = 26;
        const x = Math.min(Math.max(p.screen.x, lw / 2 + 6), w - lw / 2 - 6), y = Math.min(p.screen.y, hgt - 90);
        const r = { l: x - lw / 2 - 4, r: x + lw / 2 + 4, t: y - 3, b: y + lh + 3 };
        if (placed.some(q => r.l < q.r && r.r > q.l && r.t < q.b && r.b > q.t)) show = false;
        else {
          placed.push(r);
          p.label.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, 0)`;
        }
      }
      p.label.classList.toggle('show', show);
    }
  }
}
