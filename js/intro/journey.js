import * as THREE from 'three';
import { ease, clamp } from '../core/utils.js';

const NOISE3 = /* glsl */`
  float h3(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float n3(vec3 x) {
    vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(h3(i), h3(i + vec3(1, 0, 0)), f.x), mix(h3(i + vec3(0, 1, 0)), h3(i + vec3(1, 1, 0)), f.x), f.y),
               mix(mix(h3(i + vec3(0, 0, 1)), h3(i + vec3(1, 0, 1)), f.x), mix(h3(i + vec3(0, 1, 1)), h3(i + vec3(1, 1, 1)), f.x), f.y), f.z);
  }
  float fbm3(vec3 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * n3(p); p *= 2.07; a *= 0.5; } return v; }
`;

/** Banded gas giant / ice planet lit by the galaxy in the centre */
function planetMaterial({ c1, c2, c3, bands = 22, turbulence = 3.5, rim = '#ff8fc7' }) {
  return new THREE.ShaderMaterial({
    uniforms: { uC1: { value: new THREE.Color(c1) }, uC2: { value: new THREE.Color(c2) }, uC3: { value: new THREE.Color(c3) }, uRim: { value: new THREE.Color(rim) }, uTime: { value: 0 }, uOpacity: { value: 1 } },
    vertexShader: /* glsl */`
      varying vec3 vN; varying vec3 vW; varying vec3 vP;
      void main() { vP = position; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`
      uniform vec3 uC1, uC2, uC3, uRim; uniform float uTime, uOpacity;
      varying vec3 vN; varying vec3 vW; varying vec3 vP;
      ${NOISE3}
      void main() {
        vec3 p = normalize(vP);
        float n = fbm3(p * 3.0 + vec3(uTime * 0.03, 0.0, 0.0));
        float band = 0.5 + 0.5 * sin(p.y * ${bands.toFixed(1)} + n * ${turbulence.toFixed(1)});
        vec3 col = mix(uC1, uC2, band);
        col = mix(col, uC3, smoothstep(0.55, 0.85, fbm3(p * 7.0 + 3.1)));
        vec3 N = normalize(vN), V = normalize(cameraPosition - vW), L = normalize(-vW + vec3(0.0, 4.0, 0.0));
        float diff = max(dot(N, L), 0.0);
        float fr = pow(1.0 - max(dot(N, V), 0.0), 3.0);
        col = col * (0.12 + 0.95 * diff) + uRim * fr * (0.4 + 1.2 * diff);
        gl_FragColor = vec4(col, uOpacity);
      }`,
    transparent: true
  });
}

function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(.18, 'rgba(255,255,255,.6)'); grd.addColorStop(.45, 'rgba(255,255,255,.12)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/**
 * Cinematic journey: the camera follows a beam of light past giant planets into the galaxy.
 * Two portraits (Aaron & Amelie) dance around the head of the beam and fly into the heart.
 */
export class Journey {
  constructor({ parent, camera, portraits, home, heartPos, quality, captionsEl, lines }) {
    this.parent = parent; this.camera = camera; this.captionsEl = captionsEl; this.lines = lines || [];
    this.group = new THREE.Group();
    parent.add(this.group);
    this.t = -1; this.done = false; this.arrived = false;
    this.heartPos = heartPos.clone();

    // short approach: from the wormhole exit into the heart of the galaxy
    const A = new THREE.Vector3(0, 34, 112), B = new THREE.Vector3(-12, 24, 84), C = new THREE.Vector3(10, 16, 58), D = new THREE.Vector3(6, 12, 42), E = new THREE.Vector3(2, 11, 32);
    this.camCurve = new THREE.CatmullRomCurve3([A, B, C, D, E, home.pos.clone()], false, 'centripetal');
    this.beamCurve = new THREE.CatmullRomCurve3([A.clone().add(new THREE.Vector3(0, -2, -8)), B, C, D, E, this.heartPos], false, 'centripetal');
    this.home = home;
    this.startPos = A.clone();
    this.beamSamples = this.beamCurve.getSpacedPoints(1600);

    // planets along the way
    this.giant = new THREE.Mesh(new THREE.SphereGeometry(11, 72, 48), planetMaterial({ c1: '#3a1450', c2: '#d9709e', c3: '#ffd0b0', bands: 26, rim: '#ff8fc7' }));
    this.giant.position.set(-46, -1, 103); this.giant.rotation.z = .35;
    const ringMat = new THREE.ShaderMaterial({
      uniforms: { uIn: { value: 14.5 }, uOut: { value: 24 }, uOpacity: { value: 1 } },
      vertexShader: /* glsl */`varying vec2 vP; void main() { vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */`
        uniform float uIn, uOut, uOpacity; varying vec2 vP;
        float h(float x) { return fract(sin(x * 91.7) * 43758.5); }
        void main() {
          float t = (length(vP) - uIn) / (uOut - uIn);
          float k = floor(t * 60.0);
          float band = 0.35 + 0.65 * mix(h(k), h(k + 1.0), fract(t * 60.0));
          float gap = smoothstep(0.58, 0.6, t) * (1.0 - smoothstep(0.64, 0.66, t));
          float a = band * smoothstep(0.0, 0.05, t) * (1.0 - smoothstep(0.9, 1.0, t)) * (1.0 - gap * 0.9);
          gl_FragColor = vec4(mix(vec3(1.0, 0.72, 0.84), vec3(0.95, 0.82, 0.7), t) * 0.8, a * 0.5 * uOpacity);
        }`,
      transparent: true, side: THREE.DoubleSide, depthWrite: false
    });
    this.ring = new THREE.Mesh(new THREE.RingGeometry(14.5, 24, 160, 1), ringMat);
    this.ring.rotation.x = -Math.PI / 2 + .32; this.ring.rotation.y = .2;
    this.giant.add(this.ring);
    this.ring.rotation.set(-Math.PI / 2 + .3, 0, 0);
    this.group.add(this.giant);

    this.ice = new THREE.Mesh(new THREE.SphereGeometry(5, 56, 40), planetMaterial({ c1: '#20255e', c2: '#7f8cff', c3: '#e8dcff', bands: 12, turbulence: 5, rim: '#9fb6ff' }));
    this.ice.position.set(31, -1, 57);
    this.group.add(this.ice);
    this.moon = new THREE.Mesh(new THREE.SphereGeometry(1.3, 32, 24), planetMaterial({ c1: '#3b3346', c2: '#a89bb5', c3: '#ffffff', bands: 4, turbulence: 9, rim: '#ffd6ea' }));
    this.group.add(this.moon);
    this.planetMats = [this.giant.material, this.ice.material, this.moon.material, ringMat];
    // the real planets live in the odyssey now
    this.giant.visible = this.ice.visible = this.moon.visible = false;

    // beam: head glow, flare and a twisting trail
    const glow = glowTexture();
    this.head = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: '#ffe6f3', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.head.scale.setScalar(4);
    this.halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: '#ff4fa3', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .55 }));
    this.halo.scale.setScalar(12);
    this.flare = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: '#ffc6e2', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .5 }));
    this.flare.scale.set(26, .9, 1);
    this.group.add(this.halo, this.head, this.flare);

    const N = quality.tier === 'low' ? 1400 : 2600;
    this.trailN = N;
    const tPos = new Float32Array(N * 3), tA = new Float32Array(N), tS = new Float32Array(N);
    this.ages = new Float32Array(N); this.jit = new Float32Array(N); this.ang0 = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const a = Math.pow(Math.random(), 1.6);   // denser near the head
      tA[i] = a; this.ages[i] = a; tS[i] = Math.random(); this.jit[i] = .3 + Math.random() * .7; this.ang0[i] = Math.random() * Math.PI * 2;
    }
    const tGeo = new THREE.BufferGeometry();
    tGeo.setAttribute('position', new THREE.BufferAttribute(tPos, 3));
    tGeo.setAttribute('aAge', new THREE.BufferAttribute(tA, 1));
    tGeo.setAttribute('aSeed', new THREE.BufferAttribute(tS, 1));
    this.trailMat = new THREE.ShaderMaterial({
      uniforms: { uPixelRatio: { value: quality.dpr }, uOpacity: { value: 0 } },
      vertexShader: /* glsl */`
        uniform float uPixelRatio, uOpacity; attribute float aAge, aSeed; varying vec3 vColor; varying float vAlpha;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = clamp((1.0 - aAge * 0.75) * (0.5 + aSeed) * 55.0 * uPixelRatio / -mv.z, 1.0, 7.0 * uPixelRatio);
          vColor = mix(mix(vec3(1.0, 0.95, 1.0), vec3(1.0, 0.36, 0.7), smoothstep(0.0, 0.25, aAge)), vec3(0.55, 0.35, 1.0), smoothstep(0.4, 1.0, aAge));
          vAlpha = uOpacity * pow(1.0 - aAge, 1.3);
        }`,
      fragmentShader: /* glsl */`
        varying vec3 vColor; varying float vAlpha;
        void main() { float d = length(gl_PointCoord - 0.5) * 2.0; if (d > 1.0) discard; gl_FragColor = vec4(vColor * 1.4, pow(1.0 - d, 1.6) * vAlpha); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    });
    this.trail = new THREE.Points(tGeo, this.trailMat);
    this.trail.frustumCulled = false;
    this.group.add(this.trail);

    // sparkles left behind by the two portraits
    this.sparkN = 500; this.sparkI = 0;
    const sGeo = new THREE.BufferGeometry();
    this.sPos = new Float32Array(this.sparkN * 3); this.sVel = new Float32Array(this.sparkN * 3); this.sLife = new Float32Array(this.sparkN); this.sCol = new Float32Array(this.sparkN * 3);
    sGeo.setAttribute('position', new THREE.BufferAttribute(this.sPos, 3));
    sGeo.setAttribute('aLife', new THREE.BufferAttribute(this.sLife, 1));
    sGeo.setAttribute('aColor', new THREE.BufferAttribute(this.sCol, 3));
    this.sparkMat = new THREE.ShaderMaterial({
      uniforms: { uPixelRatio: { value: quality.dpr } },
      vertexShader: /* glsl */`
        uniform float uPixelRatio; attribute float aLife; attribute vec3 aColor; varying vec3 vColor; varying float vAlpha;
        void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv;
          gl_PointSize = clamp(40.0 * uPixelRatio * aLife / -mv.z, 0.0, 6.0 * uPixelRatio); vColor = aColor; vAlpha = aLife; }`,
      fragmentShader: /* glsl */`
        varying vec3 vColor; varying float vAlpha;
        void main() { float d = length(gl_PointCoord - 0.5) * 2.0; if (d > 1.0) discard; gl_FragColor = vec4(vColor * 1.5, pow(1.0 - d, 1.5) * vAlpha); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    });
    this.sparks = new THREE.Points(sGeo, this.sparkMat);
    this.sparks.frustumCulled = false;
    this.group.add(this.sparks);

    // the two of you
    const rims = ['#8fd0ff', '#ff8fc7'];
    this.orbs = portraits.map((tex, i) => {
      const mat = new THREE.ShaderMaterial({
        uniforms: { uMap: { value: tex }, uRim: { value: new THREE.Color(rims[i]) }, uOpacity: { value: 0 } },
        vertexShader: /* glsl */`varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: /* glsl */`
          uniform sampler2D uMap; uniform vec3 uRim; uniform float uOpacity; varying vec2 vUv;
          void main() {
            vec2 c = vUv - 0.5; float d = length(c) * 2.0, R = 0.7;
            vec4 tex = texture2D(uMap, c / R * 0.5 + 0.5);
            float inside = 1.0 - smoothstep(R - 0.02, R, d);
            float rim = exp(-pow((d - R - 0.03) / 0.04, 2.0));
            float glow = exp(-max(d - R, 0.0) / 0.12) * (1.0 - inside);
            vec3 photo = pow(tex.rgb, vec3(1.25)) * 0.9;
            vec3 col = photo * inside + uRim * (rim * 1.4 + glow * 0.55);
            float a = max(inside, max(rim, glow)) * uOpacity;
            if (a < 0.01) discard;
            gl_FragColor = vec4(col, a);
          }`,
        transparent: true, depthWrite: false
      });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
      m.renderOrder = 8;
      m.userData.color = new THREE.Color(rims[i]);
      this.group.add(m);
      return m;
    });
    if (!portraits.length) this.orbs = [];

    this.tmp = new THREE.Vector3(); this.right = new THREE.Vector3(); this.up = new THREE.Vector3(); this.look = new THREE.Vector3();
    this.captionAt = -1;
  }

  /** camera progress 0..1 for a journey time in seconds */
  progress(t) { return ease.inOutSine(clamp(t / this.duration, 0, 1)); }

  start(duration = 9.4) {
    this.t = 0; this.duration = duration;
    this.camera.position.copy(this.startPos);
  }

  caption(i) {
    const el = this.captionsEl;
    if (!el || !this.lines[i]) return;
    el.classList.remove('in'); void el.offsetWidth;
    el.textContent = this.lines[i];
    el.classList.toggle('big', this.lines[i].includes('&'));
    el.classList.add('in');
  }

  emitSpark(pos, color, spread = .6) {
    const i = this.sparkI; this.sparkI = (this.sparkI + 1) % this.sparkN;
    this.sPos[i * 3] = pos.x; this.sPos[i * 3 + 1] = pos.y; this.sPos[i * 3 + 2] = pos.z;
    this.sVel[i * 3] = (Math.random() - .5) * spread; this.sVel[i * 3 + 1] = (Math.random() - .5) * spread; this.sVel[i * 3 + 2] = (Math.random() - .5) * spread;
    this.sLife[i] = 1; this.sCol[i * 3] = color.r; this.sCol[i * 3 + 1] = color.g; this.sCol[i * 3 + 2] = color.b;
  }

  /** returns 'arrive' once when the two portraits reach the heart */
  update(dt) {
    if (this.t < 0 || this.done) return null;
    this.t += dt;
    const t = this.t, cam = this.camera;
    const u = this.progress(t);
    let event = null;

    // captions, spread over the flight
    const times = [.6, 2.6, 4.7, 6.4, 8.0];
    for (let i = 0; i < times.length; i++) if (t >= times[i] && this.captionAt < i) { this.captionAt = i; this.caption(i); }

    // camera on its path, looking at the beam
    cam.position.copy(this.camCurve.getPointAt(u));
    const bu = clamp(u + .05 + (u > .7 ? (u - .7) * .35 : 0), 0, 1);
    const headIdx = Math.round(bu * (this.beamSamples.length - 1));
    const head = this.beamSamples[headIdx];
    const k = ease.inOutCubic(clamp((u - .78) / .22, 0, 1));
    this.look.copy(head).lerp(this.home.target, k);
    cam.lookAt(this.look);

    // fade in, then out once the heart is reached
    const fadeIn = clamp(t / .8, 0, 1);
    const arriveT = this.arriveT ?? Infinity;
    const after = clamp((t - arriveT) / 1.2, 0, 1);
    const vis = fadeIn * (1 - after);
    this.trailMat.uniforms.uOpacity.value = vis;
    [this.head, this.halo, this.flare].forEach((s, i) => { s.material.opacity = vis * [.75, .38, .45][i] * (.85 + .15 * Math.sin(t * 20)); s.position.copy(head); });
    this.head.scale.setScalar(2.4 + Math.sin(t * 9) * .25 + after * 6);

    // trail with a slow twist
    const arr = this.trail.geometry.attributes.position.array;
    const span = 420, S = this.beamSamples;
    this.right.setFromMatrixColumn(cam.matrixWorld, 0); this.up.setFromMatrixColumn(cam.matrixWorld, 1);
    const fp = this.tmp;
    for (let i = 0; i < this.trailN; i++) {
      const a = this.ages[i];
      const f = Math.max(0, headIdx - a * span), i0 = Math.floor(f), i1 = Math.min(S.length - 1, i0 + 1);
      const p = fp.copy(S[i0]).lerp(S[i1], f - i0);
      const core = i % 10 < 8;
      const r = core ? a * .35 * this.jit[i] : (.25 + a * 2.4) * this.jit[i];
      const ang = this.ang0[i] + t * (core ? 6 : 1.5) - a * 14;
      arr[i * 3] = p.x + (this.right.x * Math.cos(ang) + this.up.x * Math.sin(ang)) * r;
      arr[i * 3 + 1] = p.y + (this.right.y * Math.cos(ang) + this.up.y * Math.sin(ang)) * r;
      arr[i * 3 + 2] = p.z + (this.right.z * Math.cos(ang) + this.up.z * Math.sin(ang)) * r;
    }
    this.trail.geometry.attributes.position.needsUpdate = true;

    // the two portraits circle each other around the head, then spiral into the heart
    const reach = bu >= 1;
    if (reach && this.arriveT === undefined) this.arriveT = t + .9;
    const spiral = this.arriveT !== undefined ? clamp(1 - (t - (this.arriveT - .9)) / .9, 0, 1) : 1;
    const rad = 1.9 * spiral;
    this.orbs.forEach((m, i) => {
      const ang = t * 2.4 + i * Math.PI;
      m.position.copy(head).addScaledVector(this.right, Math.cos(ang) * rad).addScaledVector(this.up, Math.sin(ang) * rad * .8);
      m.quaternion.copy(cam.quaternion);
      m.scale.setScalar((2.4 + .1 * Math.sin(t * 3 + i)) * (.3 + .7 * spiral));
      m.material.uniforms.uOpacity.value = clamp((t - .4) / 1, 0, 1) * (spiral > 0 ? 1 : 0);
      if (spiral > 0 && Math.random() < .9) this.emitSpark(m.position, m.userData.color, .5);
    });
    if (this.arriveT !== undefined && t >= this.arriveT && !this.arrived) { this.arrived = true; event = 'arrive'; }

    // sparks
    for (let i = 0; i < this.sparkN; i++) {
      if (this.sLife[i] <= 0) continue;
      this.sLife[i] = Math.max(0, this.sLife[i] - dt * .8);
      this.sPos[i * 3] += this.sVel[i * 3] * dt; this.sPos[i * 3 + 1] += this.sVel[i * 3 + 1] * dt; this.sPos[i * 3 + 2] += this.sVel[i * 3 + 2] * dt;
    }
    const sg = this.sparks.geometry.attributes;
    sg.position.needsUpdate = true; sg.aLife.needsUpdate = true; sg.aColor.needsUpdate = true;

    // planets turn slowly; moon orbits the ice planet
    this.giant.rotation.y += dt * .05;
    this.ice.rotation.y += dt * .08;
    this.moon.position.set(this.ice.position.x + Math.cos(t * .4) * 9, this.ice.position.y + 1.5, this.ice.position.z + Math.sin(t * .4) * 9);
    this.planetMats.forEach(m => { if (m.uniforms.uTime) m.uniforms.uTime.value = t; });

    if (t > this.duration + 1.5) this.finish();
    return event;
  }

  finish() {
    if (this.done) return;
    this.done = true;
    if (this.captionsEl) this.captionsEl.classList.remove('in');
    this.parent.remove(this.group);
    this.group.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
  }
}
