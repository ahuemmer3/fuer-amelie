import * as THREE from 'three';
import { ease, clamp, rand } from '../core/utils.js';

/* ------------------------------------------------------------------ painted textures */
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function seeded(seed) { let s = seed * 9301 + 49297; return () => ((s = (s * 9301 + 49297) % 233280) / 233280); }

function cloudTexture(seed) {
  return canvasTex(256, 256, (g, w, h) => {
    const r = seeded(seed);
    for (let i = 0; i < 18; i++) {
      const x = 128 + (r() - .5) * 150, rad = 26 + r() * 46, y = 150 - r() * 40 - (1 - Math.abs(x - 128) / 90) * 25;
      const grd = g.createRadialGradient(x, y - rad * .3, rad * .1, x, y, rad);
      grd.addColorStop(0, 'rgba(255,255,255,.95)'); grd.addColorStop(.55, 'rgba(255,248,252,.7)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grd; g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill();
    }
    g.globalCompositeOperation = 'source-atop';
    const sh = g.createLinearGradient(0, 90, 0, 210);
    sh.addColorStop(0, 'rgba(255,220,200,0)'); sh.addColorStop(1, 'rgba(190,120,170,.45)');
    g.fillStyle = sh; g.fillRect(0, 0, w, h);
  });
}

function castleTexture() {
  return canvasTex(512, 512, g => {
    // cloud island
    for (let i = 0; i < 26; i++) {
      const x = 110 + Math.random() * 290, y = 400 + Math.random() * 40, r = 30 + Math.random() * 45;
      const grd = g.createRadialGradient(x, y - 10, 5, x, y, r);
      grd.addColorStop(0, 'rgba(255,255,255,.95)'); grd.addColorStop(1, 'rgba(255,240,248,0)');
      g.fillStyle = grd; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    }
    const body = g.createLinearGradient(0, 120, 0, 420);
    body.addColorStop(0, '#8a5aa8'); body.addColorStop(1, '#4a2766');
    g.shadowColor = 'rgba(255,150,210,.9)'; g.shadowBlur = 18;
    g.fillStyle = body;
    const tower = (x, w, top, roofH) => {
      g.fillRect(x, top, w, 400 - top);
      g.beginPath(); g.moveTo(x - 8, top); g.lineTo(x + w / 2, top - roofH); g.lineTo(x + w + 8, top); g.closePath(); g.fill();
    };
    g.fillRect(170, 250, 172, 160);
    tower(150, 44, 200, 70); tower(318, 44, 200, 70); tower(226, 60, 150, 95); tower(196, 30, 230, 50); tower(286, 30, 230, 50);
    g.shadowBlur = 0;
    // flags
    g.fillStyle = '#ff6fb1';
    [[172, 130], [340, 130], [256, 55]].forEach(([x, y]) => { g.fillRect(x, y - 24, 2, 26); g.beginPath(); g.moveTo(x + 2, y - 24); g.lineTo(x + 22, y - 17); g.lineTo(x + 2, y - 10); g.fill(); });
    // glowing windows
    g.fillStyle = '#ffd98a'; g.shadowColor = '#ffcf73'; g.shadowBlur = 10;
    [[166, 260], [334, 260], [248, 200], [262, 200], [205, 300], [300, 300], [250, 320], [166, 320], [334, 320]].forEach(([x, y]) => { g.beginPath(); g.roundRect ? g.roundRect(x, y, 10, 16, 5) : g.rect(x, y, 10, 16); g.fill(); });
    g.fillStyle = '#3a1d4f'; g.shadowBlur = 0; g.beginPath(); g.arc(256, 395, 22, Math.PI, 0); g.fill(); g.fillRect(234, 395, 44, 15);
  });
}

function balloonTexture(color) {
  return canvasTex(128, 256, g => {
    g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(64, 150); g.bezierCurveTo(50, 185, 78, 210, 62, 254); g.stroke();
    const grd = g.createRadialGradient(46, 62, 6, 64, 88, 62);
    grd.addColorStop(0, '#ffffff'); grd.addColorStop(.18, color); grd.addColorStop(1, shade(color, -.35));
    g.fillStyle = grd; g.beginPath(); g.ellipse(64, 88, 44, 56, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(58, 148); g.lineTo(70, 148); g.lineTo(64, 140); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.ellipse(44, 62, 9, 16, -.5, 0, Math.PI * 2); g.fill();
  });
}
function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16), f = v => Math.max(0, Math.min(255, Math.round(v * (1 + k))));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

function hatTexture(c1, c2) {
  return canvasTex(128, 160, g => {
    g.save();
    g.beginPath(); g.moveTo(64, 14); g.lineTo(18, 146); g.lineTo(110, 146); g.closePath(); g.clip();
    for (let i = -6; i < 12; i++) { g.fillStyle = i % 2 ? c1 : c2; g.beginPath(); g.moveTo(0, i * 20); g.lineTo(128, i * 20 - 60); g.lineTo(128, i * 20 - 40); g.lineTo(0, i * 20 + 20); g.fill(); }
    g.fillStyle = 'rgba(255,255,255,.85)'; for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(30 + Math.random() * 68, 60 + Math.random() * 80, 3, 0, Math.PI * 2); g.fill(); }
    g.restore();
    g.fillStyle = '#ffcf73'; g.fillRect(16, 138, 96, 10);
    const p = g.createRadialGradient(60, 12, 2, 64, 16, 16); p.addColorStop(0, '#fff'); p.addColorStop(1, '#ffd6ea');
    g.fillStyle = p; g.beginPath(); g.arc(64, 16, 14, 0, Math.PI * 2); g.fill();
  });
}

function glowTexture() {
  return canvasTex(128, 128, g => {
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(.25, 'rgba(255,255,255,.45)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  });
}

const NOISE2 = /* glsl */`
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }
`;

/**
 * A fairy-tale flight: the two of you ride a magic book through sunset clouds,
 * past a castle and birthday balloons, then climb into space.
 */
export class SkyFlight {
  constructor({ camera, portraits, quality, captionsEl, lines }) {
    this.camera = camera; this.captionsEl = captionsEl; this.lines = lines || [];
    this.duration = 12;
    const low = quality.tier === 'low';
    const scene = this.scene = new THREE.Scene();
    this.fogColor = new THREE.Color('#c96a8e');
    scene.fog = new THREE.Fog(this.fogColor.clone(), 70, 420);
    this.disposables = [];

    scene.add(new THREE.HemisphereLight('#ffd6ea', '#6a3a8a', 1.4));
    const sun = new THREE.DirectionalLight('#ffd0a8', 2.2);
    this.sunDir = new THREE.Vector3(-.55, .16, -1).normalize();
    sun.position.copy(this.sunDir).multiplyScalar(50);
    scene.add(sun);

    // sky dome (follows the camera)
    this.domeMat = new THREE.ShaderMaterial({
      uniforms: { uSun: { value: this.sunDir }, uSpace: { value: 0 }, uTime: { value: 0 } },
      vertexShader: /* glsl */`
        varying vec3 vDir;
        void main() { vDir = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`,
      fragmentShader: /* glsl */`
        uniform vec3 uSun; uniform float uSpace, uTime; varying vec3 vDir;
        float h3(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
        void main() {
          vec3 d = normalize(vDir); float h = d.y;
          vec3 col = mix(vec3(0.98, 0.5, 0.36), vec3(0.88, 0.3, 0.52), smoothstep(0.0, 0.14, h));
          col = mix(col, vec3(0.46, 0.18, 0.6), smoothstep(0.12, 0.45, h));
          col = mix(col, vec3(0.14, 0.06, 0.3), smoothstep(0.45, 0.95, h));
          col = mix(col, vec3(0.79, 0.42, 0.56), smoothstep(0.02, -0.08, h));
          float s = max(dot(d, normalize(uSun)), 0.0);
          col += vec3(1.0, 0.72, 0.45) * (pow(s, 600.0) * 5.0 + pow(s, 40.0) * 0.55 + pow(s, 6.0) * 0.18);
          float st = h3(floor(d * 360.0));
          vec3 space = vec3(0.025, 0.01, 0.05) + vec3(0.06, 0.0, 0.07) * (1.0 - abs(h)) + step(0.9965, st) * (0.7 + 0.3 * sin(uTime * 3.0 + st * 300.0));
          gl_FragColor = vec4(mix(col, space, uSpace), 1.0);
        }`,
      side: THREE.BackSide, depthWrite: false, fog: false
    });
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(400, 48, 24), this.domeMat);
    this.dome.renderOrder = -10;
    scene.add(this.dome);

    // sea of clouds below
    this.seaMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uOpacity: { value: 1 }, uFog: { value: this.fogColor.clone() }, uSun: { value: this.sunDir } },
      vertexShader: /* glsl */`varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: /* glsl */`
        uniform float uTime, uOpacity; uniform vec3 uFog, uSun; varying vec3 vW;
        ${NOISE2}
        void main() {
          vec2 p = vW.xz * 0.012 + vec2(uTime * 0.03, uTime * 0.012);
          float n = fbm(p) * 0.62 + fbm(p * 2.3 + 7.1) * 0.38;
          float cover = smoothstep(0.34, 0.64, n);
          float dist = length(vW.xz - cameraPosition.xz);
          vec3 col = mix(vec3(0.5, 0.24, 0.46), vec3(0.98, 0.72, 0.74), smoothstep(0.4, 0.85, n));
          vec3 toP = normalize(vec3(vW.x - cameraPosition.x, 0.0, vW.z - cameraPosition.z) + 1e-4);
          col += vec3(0.3, 0.12, 0.0) * pow(max(dot(toP, normalize(vec3(uSun.x, 0.0, uSun.z))), 0.0), 3.0);
          float haze = smoothstep(110.0, 520.0, dist);
          col = mix(col, uFog, haze);
          gl_FragColor = vec4(col, mix(cover, 1.0, haze) * uOpacity);
        }`,
      transparent: true, depthWrite: false, fog: false
    });
    this.sea = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600), this.seaMat);
    this.sea.rotation.x = -Math.PI / 2; this.sea.position.y = -26;
    scene.add(this.sea);

    // flight path of the book
    this.path = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 4, 150), new THREE.Vector3(-16, -2, 105), new THREE.Vector3(-30, -9, 55), new THREE.Vector3(-10, -6, 8),
      new THREE.Vector3(20, 0, -36), new THREE.Vector3(30, 10, -82), new THREE.Vector3(8, 26, -122), new THREE.Vector3(0, 70, -148),
      new THREE.Vector3(0, 160, -158), new THREE.Vector3(0, 300, -163)
    ], false, 'centripetal');
    this.pathLen = this.path.getLength();

    // clouds: banks along the path (some to fly through) + far clouds
    const cloudTex = [1, 2, 3, 4].map(cloudTexture);
    this.clouds = [];
    const addCloud = (pos, size, op = .95) => {
      const m = new THREE.SpriteMaterial({ map: cloudTex[Math.floor(Math.random() * cloudTex.length)], color: new THREE.Color().setHSL(.93 + Math.random() * .04, .55, .78 + Math.random() * .08), transparent: true, depthWrite: false, opacity: op });
      const s = new THREE.Sprite(m); s.position.copy(pos); s.scale.set(size, size * .62, 1);
      s.userData.op = op; s.userData.drift = rand(-.6, .6);
      scene.add(s); this.clouds.push(s);
    };
    const step = low ? .07 : .045;
    for (let u = .1; u < .74; u += step) {
      const p = this.path.getPointAt(u), tng = this.path.getTangentAt(u);
      const side = new THREE.Vector3(tng.z, 0, -tng.x).normalize();
      for (let k = 0; k < (low ? 2 : 3); k++) {
        const sgn = Math.random() < .5 ? -1 : 1, near = u > .25 && u < .6 && Math.random() < .12;
        const off = near ? rand(2, 5) : rand(9, 30);
        addCloud(p.clone().addScaledVector(side, sgn * off).add(new THREE.Vector3(0, rand(-9, 6), rand(-6, 6))), near ? rand(12, 18) : rand(22, 48), near ? .7 : .92);
      }
    }
    for (let i = 0; i < (low ? 14 : 26); i++) {
      const a = Math.random() * Math.PI * 2, r = rand(140, 330);
      addCloud(new THREE.Vector3(Math.cos(a) * r, rand(-14, 30), Math.sin(a) * r - 40), rand(70, 140), .9);
    }

    // a fairy-tale castle on a cloud
    this.castle = new THREE.Sprite(new THREE.SpriteMaterial({ map: castleTexture(), transparent: true, depthWrite: false, color: '#f0c4d8' }));
    this.castle.position.set(-150, 2, -70); this.castle.scale.set(80, 80, 1);
    scene.add(this.castle);

    // birthday balloons
    const colors = ['#ff4fa3', '#ffcf73', '#b78cff', '#7fe0c8', '#ff6b6b', '#8fd0ff'];
    const balloonTex = colors.map(balloonTexture);
    this.balloons = [];
    for (let i = 0; i < (low ? 14 : 26); i++) {
      const u = rand(.12, .7), p = this.path.getPointAt(u), tng = this.path.getTangentAt(u);
      const side = new THREE.Vector3(tng.z, 0, -tng.x).normalize();
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: balloonTex[i % colors.length], transparent: true, depthWrite: false }));
      s.position.copy(p).addScaledVector(side, (Math.random() < .5 ? -1 : 1) * rand(4, 18)).add(new THREE.Vector3(0, rand(-4, 8), 0));
      const sc = rand(1.6, 2.6); s.scale.set(sc, sc * 2, 1);
      s.userData = { base: s.position.clone(), phase: Math.random() * 6, speed: rand(.6, 1.4) };
      scene.add(s); this.balloons.push(s);
    }

    // the magic book
    const book = this.book = new THREE.Group();
    const coverMat = new THREE.MeshStandardMaterial({ color: '#8b1e5b', roughness: .45, metalness: .35, emissive: '#3a0a24' });
    const goldMat = new THREE.MeshStandardMaterial({ color: '#ffcf73', roughness: .3, metalness: .8, emissive: '#5a3a00' });
    const pageMat = new THREE.MeshStandardMaterial({ color: '#fff4e8', roughness: .9, emissive: '#ffb0d0', emissiveIntensity: .35, side: THREE.DoubleSide });
    [-1, 1].forEach(side => {
      const pivot = new THREE.Group(); pivot.rotation.z = side * -.14;
      const cover = new THREE.Mesh(new THREE.BoxGeometry(1.2, .06, 1.7), coverMat); cover.position.x = side * .6;
      const trim = new THREE.Mesh(new THREE.BoxGeometry(1.22, .05, .06), goldMat); trim.position.set(side * .6, .01, .84);
      const trim2 = trim.clone(); trim2.position.z = -.84;
      const block = new THREE.Mesh(new THREE.BoxGeometry(1.08, .14, 1.56), pageMat); block.position.set(side * .57, .1, 0);
      pivot.add(cover, trim, trim2, block); book.add(pivot);
    });
    const spine = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, 1.7, 12), goldMat); spine.rotation.x = Math.PI / 2; spine.position.y = .02;
    book.add(spine);
    const pageGeo = new THREE.PlaneGeometry(1.06, 1.52); pageGeo.translate(.53, 0, 0); pageGeo.rotateX(-Math.PI / 2);
    this.flips = [0, 1, 2].map(i => { const piv = new THREE.Group(); piv.position.y = .2; const pg = new THREE.Mesh(pageGeo, pageMat); piv.add(pg); book.add(piv); piv.userData.phase = i / 3; return piv; });
    this.bookGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: '#ff9fd0', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .8 }));
    this.bookGlow.scale.setScalar(5.5);
    book.add(this.bookGlow);
    book.scale.setScalar(1.5);
    scene.add(book);

    // the two of you, with party hats
    const rims = ['#8fd0ff', '#ff8fc7'];
    this.riders = (portraits || []).map((tex, i) => {
      const mat = new THREE.ShaderMaterial({
        uniforms: { uMap: { value: tex }, uRim: { value: new THREE.Color(rims[i]) } },
        vertexShader: /* glsl */`varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: /* glsl */`
          uniform sampler2D uMap; uniform vec3 uRim; varying vec2 vUv;
          void main() {
            vec2 c = vUv - 0.5; float d = length(c) * 2.0, R = 0.74;
            vec4 tex = texture2D(uMap, c / R * 0.5 + 0.5);
            float inside = 1.0 - smoothstep(R - 0.02, R, d);
            float rim = exp(-pow((d - R - 0.03) / 0.04, 2.0));
            float a = max(inside, rim);
            if (a < 0.02) discard;
            gl_FragColor = vec4(pow(tex.rgb, vec3(1.15)) * inside * 0.92 + uRim * rim * 1.3, a);
          }`,
        transparent: true, depthWrite: false, fog: false
      });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
      m.renderOrder = 5;
      const hat = new THREE.Sprite(new THREE.SpriteMaterial({ map: hatTexture(i ? '#ff6fb1' : '#8fd0ff', '#ffcf73'), transparent: true, depthWrite: false, fog: false }));
      hat.renderOrder = 6;
      scene.add(m, hat);
      return { m, hat, side: i ? 1 : -1 };
    });

    // magic dust trail
    this.dustN = low ? 260 : 520; this.dustI = 0;
    this.dPos = new Float32Array(this.dustN * 3); this.dVel = new Float32Array(this.dustN * 3); this.dLife = new Float32Array(this.dustN); this.dCol = new Float32Array(this.dustN * 3);
    const dg = new THREE.BufferGeometry();
    dg.setAttribute('position', new THREE.BufferAttribute(this.dPos, 3));
    dg.setAttribute('aLife', new THREE.BufferAttribute(this.dLife, 1));
    dg.setAttribute('aColor', new THREE.BufferAttribute(this.dCol, 3));
    this.dust = new THREE.Points(dg, new THREE.ShaderMaterial({
      uniforms: { uPixelRatio: { value: quality.dpr } },
      vertexShader: /* glsl */`uniform float uPixelRatio; attribute float aLife; attribute vec3 aColor; varying vec3 vC; varying float vA;
        void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = clamp(34.0 * uPixelRatio * aLife / -mv.z, 0.0, 9.0 * uPixelRatio); vC = aColor; vA = aLife; }`,
      fragmentShader: /* glsl */`varying vec3 vC; varying float vA; void main() { float d = length(gl_PointCoord - 0.5) * 2.0; if (d > 1.0) discard; gl_FragColor = vec4(vC * 1.6, pow(1.0 - d, 1.5) * vA); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false
    }));
    this.dust.frustumCulled = false;
    scene.add(this.dust);
    this.dustCols = ['#ffcf73', '#ff8fc7', '#ffffff', '#c9a2ff'].map(c => new THREE.Color(c));

    this.t = -1; this.camPos = new THREE.Vector3(); this.look = new THREE.Vector3(); this.roll = 0; this.captionAt = -1;
    this.tmp = new THREE.Vector3(); this.tmp2 = new THREE.Vector3(); this.up = new THREE.Vector3(); this.right = new THREE.Vector3();
  }

  progress(t) { const x = clamp(t / this.duration, 0, 1); return x * .82 + ease.inCubic(x) * .18; }

  start() {
    this.t = 0;
    const p = this.path.getPointAt(0), tng = this.path.getTangentAt(0);
    this.camPos.copy(p).addScaledVector(tng, -22).add(new THREE.Vector3(6, 7, 0));
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(p);
  }

  caption(i) {
    const el = this.captionsEl;
    if (!el || !this.lines[i]) return;
    el.classList.remove('in', 'big'); void el.offsetWidth;
    el.textContent = this.lines[i];
    el.classList.add('in');
  }

  emitDust(pos) {
    const i = this.dustI; this.dustI = (this.dustI + 1) % this.dustN;
    this.dPos[i * 3] = pos.x + rand(-.5, .5); this.dPos[i * 3 + 1] = pos.y + rand(-.2, .2); this.dPos[i * 3 + 2] = pos.z + rand(-.3, .3);
    this.dVel[i * 3] = rand(-.4, .4); this.dVel[i * 3 + 1] = rand(-.6, .2); this.dVel[i * 3 + 2] = rand(-.4, .4);
    this.dLife[i] = 1;
    const c = this.dustCols[Math.floor(Math.random() * this.dustCols.length)];
    this.dCol[i * 3] = c.r; this.dCol[i * 3 + 1] = c.g; this.dCol[i * 3 + 2] = c.b;
  }

  /** returns 'done' when the book reached space */
  update(dt) {
    if (this.t < 0) return null;
    this.t += dt;
    const t = this.t, u = this.progress(t), cam = this.camera;

    // captions ("Es war einmal …")
    const times = [.9, 3.4, 6.0, 8.5];
    for (let i = 0; i < times.length; i++) if (t >= times[i] && this.captionAt < i) { this.captionAt = i; this.caption(i); }

    // book on the path, banking into the curves
    const pos = this.path.getPointAt(u), tng = this.path.getTangentAt(u);
    const tngAhead = this.path.getTangentAt(Math.min(1, u + .02));
    const turn = tng.x * tngAhead.z - tng.z * tngAhead.x;
    this.roll += (clamp(-turn * 22, -.7, .7) - this.roll) * Math.min(1, dt * 3);
    this.book.position.copy(pos).add(this.tmp.set(0, Math.sin(t * 2.2) * .18, 0));
    this.book.lookAt(this.tmp2.copy(this.book.position).add(tng));
    this.book.rotateZ(this.roll);
    this.flips.forEach(f => { const ph = (t * 1.1 + f.userData.phase) % 1; f.rotation.z = ph * Math.PI; f.visible = ph > .02 && ph < .98; });

    // chase camera: wide reveal, then close behind, then below for the climb
    const reveal = ease.outCubic(clamp(t / 3, 0, 1)), climb = ease.inOutSine(clamp((u - .7) / .2, 0, 1));
    const back = THREE.MathUtils.lerp(18, 5.6, reveal) + climb * 2.5;
    const height = THREE.MathUtils.lerp(6, 1.7, reveal) - climb * 4.2;
    const sideV = this.right.set(tng.z, 0, -tng.x).normalize();
    const want = this.tmp.copy(pos).addScaledVector(tng, -back).add(this.up.set(0, height, 0)).addScaledVector(sideV, Math.sin(t * .55) * 2.2 * (1 - climb) + 1.2);
    this.camPos.lerp(want, 1 - Math.exp(-dt * 5));
    cam.position.copy(this.camPos);
    this.look.lerp(this.tmp2.copy(pos).addScaledVector(tng, 2.5), 1 - Math.exp(-dt * 8));
    cam.lookAt(this.look);

    // riders sit on the pages, always facing the camera
    this.right.setFromMatrixColumn(cam.matrixWorld, 0); this.up.setFromMatrixColumn(cam.matrixWorld, 1);
    this.riders.forEach((r, i) => {
      const local = this.tmp.set(r.side * .42, .6 + Math.sin(t * 3 + i * 1.7) * .05, .1);
      const wp = this.book.localToWorld(local.clone());
      r.m.position.copy(wp); r.m.quaternion.copy(cam.quaternion); r.m.scale.setScalar(1.35);
      r.hat.position.copy(wp).addScaledVector(this.up, .66).addScaledVector(this.right, r.side * .08);
      r.hat.scale.set(.52, .65, 1);
      r.hat.material.rotation = -r.side * .22;
    });

    // magic dust from the back of the book
    const tail = this.book.localToWorld(this.tmp.set(0, .1, -1.1));
    for (let k = 0; k < 3; k++) this.emitDust(tail);
    for (let i = 0; i < this.dustN; i++) {
      if (this.dLife[i] <= 0) continue;
      this.dLife[i] = Math.max(0, this.dLife[i] - dt * .9);
      this.dPos[i * 3] += this.dVel[i * 3] * dt; this.dPos[i * 3 + 1] += this.dVel[i * 3 + 1] * dt; this.dPos[i * 3 + 2] += this.dVel[i * 3 + 2] * dt;
    }
    const da = this.dust.geometry.attributes;
    da.position.needsUpdate = true; da.aLife.needsUpdate = true; da.aColor.needsUpdate = true;

    // balloons rise and sway
    this.balloons.forEach(b => {
      const d = b.userData;
      b.position.set(d.base.x + Math.sin(t * .8 + d.phase) * .6, d.base.y + t * d.speed, d.base.z + Math.cos(t * .6 + d.phase) * .4);
      b.material.rotation = Math.sin(t * .9 + d.phase) * .12;
    });

    // from sunset into space
    const space = ease.inOutSine(clamp((t - 8.4) / 2.8, 0, 1));
    this.domeMat.uniforms.uSpace.value = space;
    this.domeMat.uniforms.uTime.value = t;
    this.dome.position.copy(cam.position);
    this.seaMat.uniforms.uTime.value = t;
    this.seaMat.uniforms.uOpacity.value = 1 - space;
    this.sea.position.x = cam.position.x; this.sea.position.z = cam.position.z;
    const fade = 1 - clamp((t - 8.2) / 1.8, 0, 1);
    this.clouds.forEach(c => { c.material.opacity = c.userData.op * fade; c.position.x += c.userData.drift * dt; });
    this.castle.material.opacity = fade;
    this.balloons.forEach(b => (b.material.opacity = fade));
    this.scene.fog.color.copy(this.fogColor).lerp(new THREE.Color('#07030d'), space);
    this.scene.fog.near = 80 + space * 400; this.scene.fog.far = 520 + space * 2000;
    this.bookGlow.material.opacity = .45 + space * .45;
    this.bookGlow.scale.setScalar(5.5 + clamp((t - 11) / 1, 0, 1) * 14);

    return t >= this.duration ? 'done' : null;
  }

  dispose() {
    if (this.captionsEl) this.captionsEl.classList.remove('in');
    this.scene.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); }
    });
  }
}
