import * as THREE from 'three';
import { clamp, mono, smoother } from '../core/utils.js';
import { Starship } from './starship.js';

/**
 * The opening film: the solar system seen from above, then our starship comes in from the
 * outside and flies past Saturn (through the rings), Jupiter, the asteroid belt, Mars and
 * the Moon to the Earth. The Earth is the real zoomable one (js/scene/earth.js).
 * Planet textures: Solar System Scope (CC BY 4.0).
 */
const TEX = './assets/textures/';
const SHIP = .3;                 // ship scale: a tiny fighter next to giant planets
const OVERVIEW = 9, SWOOP = 3.6, LAUNCH = OVERVIEW + SWOOP, END = 36;

const PLANET_VS = /* glsl */`
  varying vec2 vUv; varying vec3 vN; varying vec3 vW;
  void main() { vUv = uv; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;

function planetMaterial(map, { atmo = '#000000', atmoStrength = 0, ambient = .04, gain = 1 } = {}) {
  return new THREE.ShaderMaterial({
    uniforms: { uMap: { value: map }, uSun: { value: new THREE.Vector3(1, 0, 0) }, uAtmo: { value: new THREE.Color(atmo) }, uAtmoK: { value: atmoStrength }, uAmb: { value: ambient }, uGain: { value: gain } },
    vertexShader: PLANET_VS,
    fragmentShader: /* glsl */`
      uniform sampler2D uMap; uniform float uAtmoK, uAmb, uGain; uniform vec3 uSun, uAtmo;
      varying vec2 vUv; varying vec3 vN; varying vec3 vW;
      void main() {
        vec3 N = normalize(vN), L = normalize(uSun), V = normalize(cameraPosition - vW);
        float ndl = dot(N, L);
        vec3 day = texture2D(uMap, vUv).rgb;
        float diff = smoothstep(-0.05, 0.6, ndl) * max(ndl, 0.0) * 0.6 + max(ndl, 0.0) * 0.6;
        vec3 col = day * (uAmb + diff * 1.02) * uGain;
        float fr = pow(1.0 - max(dot(N, V), 0.0), 3.0);
        col += uAtmo * fr * uAtmoK * smoothstep(-0.3, 0.45, ndl);
        gl_FragColor = vec4(col, 1.0);
      }`
  });
}

function atmosphereShell(radius, color, strength = 1) {
  const mat = new THREE.ShaderMaterial({
    uniforms: { uSun: { value: new THREE.Vector3(1, 0, 0) }, uCol: { value: new THREE.Color(color) }, uK: { value: strength } },
    vertexShader: PLANET_VS,
    fragmentShader: /* glsl */`
      uniform vec3 uSun, uCol; uniform float uK; varying vec3 vN; varying vec3 vW;
      void main() {
        vec3 N = normalize(vN), V = normalize(cameraPosition - vW);
        float rim = pow(1.0 - abs(dot(N, V)), 4.0);
        float a = rim * smoothstep(-0.35, 0.5, dot(N, normalize(uSun))) * uK;
        gl_FragColor = vec4(uCol * a * 1.6, a);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  });
  return new THREE.Mesh(new THREE.SphereGeometry(radius, 64, 48), mat);
}

function glowTex(inner = 'rgba(255,255,255,1)', stop = .2) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'), grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grd.addColorStop(0, inner); grd.addColorStop(stop, 'rgba(255,255,255,.35)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function ringFlareTex() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'), grd = g.createRadialGradient(128, 128, 90, 128, 128, 128);
  grd.addColorStop(0, 'rgba(255,255,255,0)'); grd.addColorStop(.6, 'rgba(255,255,255,.35)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function raysTex() {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const g = c.getContext('2d'); g.translate(256, 256);
  for (let i = 0; i < 36; i++) {
    g.rotate(Math.PI * 2 / 36 + (Math.random() - .5) * .06);
    const len = 140 + Math.random() * 110, w = 3 + Math.random() * 7;
    const grd = g.createLinearGradient(0, 0, len, 0);
    grd.addColorStop(0, 'rgba(255,240,215,.55)'); grd.addColorStop(1, 'rgba(255,200,150,0)');
    g.fillStyle = grd; g.beginPath(); g.moveTo(30, -w); g.lineTo(len, 0); g.lineTo(30, w); g.fill();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

const P = (r, a, y = 0) => new THREE.Vector3(r * Math.cos(a), y, r * Math.sin(a));

// name, texture, radius, orbit, angle at the start of the flight, orbit speed in the time lapse
const PLANETS = [
  { name: 'mercury', tex: 'mercury.webp', R: 2.8, orbit: 90, a: 4.3, w: .9 },
  { name: 'venus', tex: 'venus.webp', R: 5, orbit: 135, a: 3.05, w: .62, atmo: '#ffd9a0', atmoK: .5 },
  { name: 'earth', R: 6, orbit: 190, a: 1.8, w: .45 },
  { name: 'mars', tex: 'mars.webp', R: 4.4, orbit: 250, a: 1.08, w: .36, atmo: '#ff9a6b', atmoK: .45, shell: '#ff9466' },
  { name: 'jupiter', tex: 'jupiter.webp', R: 20, orbit: 430, a: .62, w: .2, atmo: '#ffd9b0', atmoK: .35, gain: .9, shell: '#ffd7a8' },
  { name: 'saturn', tex: 'saturn.webp', R: 16, orbit: 600, a: .3, w: .14, gain: .62, atmo: '#ffe2b0', atmoK: .25 },
  { name: 'uranus', tex: 'uranus.webp', R: 8, orbit: 760, a: -.55, w: .09, atmo: '#bff3ff', atmoK: .5 },
  { name: 'neptune', tex: 'neptune.webp', R: 8, orbit: 900, a: 2.4, w: .07, atmo: '#8fb6ff', atmoK: .5 }
];

export class SolarFlight {
  constructor({ camera, quality, captionsEl, lines, textures, earth, pixelRatio = 1 }) {
    this.camera = camera; this.captionsEl = captionsEl; this.lines = lines || []; this.earth = earth; this.pixelRatio = pixelRatio;
    this.portrait = camera.aspect < .75;
    const low = quality.tier === 'low';
    const scene = this.scene = new THREE.Scene();
    const loader = new THREE.TextureLoader();
    const tex = f => { const t = (textures && textures[f]) || loader.load(TEX + f); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };

    // sky: the real Milky Way + crisp stars
    const sky = new THREE.Mesh(new THREE.SphereGeometry(6000, 64, 32), new THREE.MeshBasicMaterial({ map: tex('milkyway.webp'), side: THREE.BackSide, color: new THREE.Color(.6, .54, .76), depthWrite: false }));
    sky.rotation.set(.6, 2.2, .3);
    scene.add(sky); this.sky = sky;
    const n = low ? 1500 : 3500, sp = new Float32Array(n * 3), ss = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, s = Math.sqrt(1 - u * u);
      sp[i * 3] = s * Math.cos(a) * 5000; sp[i * 3 + 1] = u * 5000; sp[i * 3 + 2] = s * Math.sin(a) * 5000; ss[i] = Math.random();
    }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3)); sg.setAttribute('aS', new THREE.BufferAttribute(ss, 1));
    this.starMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uPR: { value: quality.dpr } },
      vertexShader: /* glsl */`uniform float uTime, uPR; attribute float aS; varying float vA;
        void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_PointSize = (0.8 + pow(aS, 6.0) * 2.6) * uPR; vA = 0.55 + 0.45 * sin(uTime * (1.0 + aS * 3.0) + aS * 70.0); }`,
      fragmentShader: /* glsl */`varying float vA; void main() { float d = length(gl_PointCoord - 0.5) * 2.0; if (d > 1.0) discard; gl_FragColor = vec4(vec3(1.0, 0.96, 0.92), pow(1.0 - d, 2.0) * vA); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    });
    const stars = this.stars = new THREE.Points(sg, this.starMat); stars.frustumCulled = false; scene.add(stars);

    // the sun: boiling surface, glow, rays
    this.sunMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: PLANET_VS,
      fragmentShader: /* glsl */`
        uniform float uTime; varying vec3 vN; varying vec3 vW;
        float h3(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
        float n3(vec3 x) { vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(mix(h3(i), h3(i + vec3(1, 0, 0)), f.x), mix(h3(i + vec3(0, 1, 0)), h3(i + vec3(1, 1, 0)), f.x), f.y),
                     mix(mix(h3(i + vec3(0, 0, 1)), h3(i + vec3(1, 0, 1)), f.x), mix(h3(i + vec3(0, 1, 1)), h3(i + vec3(1, 1, 1)), f.x), f.y), f.z); }
        void main() {
          vec3 p = normalize(vW);
          float g = n3(p * 9.0 + uTime * 0.25) * 0.6 + n3(p * 23.0 - uTime * 0.4) * 0.4;
          float mu = max(dot(normalize(vN), normalize(cameraPosition - vW)), 0.0);
          vec3 col = mix(vec3(1.0, 0.42, 0.08), vec3(1.0, 0.9, 0.62), smoothstep(0.3, 0.8, g));
          col *= mix(0.6, 1.3, pow(mu, 0.5));
          gl_FragColor = vec4(col * 2.4, 1.0);
        }`
    });
    this.sun = new THREE.Mesh(new THREE.SphereGeometry(30, 64, 48), this.sunMat);
    scene.add(this.sun);
    const glow = glowTex();
    const sprite = (map, color, size, opacity = 1) => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }));
      s.scale.setScalar(size); scene.add(s); return s;
    };
    this.glows = [[sprite(glow, '#fff1d6', 170), .08, 150], [sprite(glow, '#ffb36b', 520, .5), .24, 170]];
    this.rays = sprite(raysTex(), '#ffe2c0', 380, .7);
    this.glows.push([this.rays, .17, 160]);

    // light for the ship (the planets light themselves in their shaders)
    this.sunLight = new THREE.DirectionalLight('#fff1e2', 2.1);
    this.rimLight = new THREE.DirectionalLight('#b9a2ff', .9);
    scene.add(this.sunLight, this.sunLight.target, this.rimLight, this.rimLight.target, new THREE.HemisphereLight('#c9b8ff', '#2a1430', .55));

    // planets with their orbits
    this.planets = {};
    const orbitMat = col => new THREE.ShaderMaterial({
      uniforms: { uCol: { value: new THREE.Color(col) }, uOpacity: { value: 1 } },
      vertexShader: /* glsl */`varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */`uniform vec3 uCol; uniform float uOpacity; varying vec2 vUv;
        void main() { float a = 1.0 - abs(vUv.y - 0.5) * 2.0; gl_FragColor = vec4(uCol * a * uOpacity * 0.8, a * uOpacity); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide
    });
    this.orbits = [];
    for (const d of PLANETS) {
      const g = new THREE.Group();
      scene.add(g);
      const pl = { ...d, group: g, angle: d.a };
      if (d.name === 'earth') {
        pl.body = null;
      } else {
        const seg = d.R > 10 ? 128 : 72;
        pl.body = new THREE.Mesh(new THREE.SphereGeometry(d.R, seg, seg * .75), planetMaterial(tex(d.tex), { atmo: d.atmo, atmoStrength: d.atmoK || 0, gain: d.gain || 1 }));
        g.add(pl.body);
        if (d.shell) { pl.shell = atmosphereShell(d.R * 1.04, d.shell, .55); g.add(pl.shell); }
      }
      if (d.name === 'saturn') this.buildRings(pl, tex);
      // orbit line (a soft ribbon), flat in the ecliptic
      const ring = new THREE.RingGeometry(d.orbit - 2.6, d.orbit + 2.6, 360, 1);
      const pos = ring.attributes.position, uv = ring.attributes.uv, v = new THREE.Vector3();
      for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i); uv.setXY(i, 0, (v.length() - (d.orbit - 2.6)) / 5.2); }
      const om = new THREE.Mesh(ring, orbitMat(d.name === 'earth' ? '#ff8fc7' : '#c9b8ff'));
      om.rotation.x = -Math.PI / 2;
      scene.add(om); this.orbits.push(om);
      this.planets[d.name] = pl;
    }
    // moon of the Earth
    this.moon = new THREE.Mesh(new THREE.SphereGeometry(1.7, 64, 48), planetMaterial(tex('moon.webp'), { ambient: .02 }));
    scene.add(this.moon);
    this.moonOffset = new THREE.Vector3(10, 3.5, -12);

    // asteroid belt between Mars and Jupiter
    const bn = low ? 2200 : 4200, bp = new Float32Array(bn * 3), bs = new Float32Array(bn);
    for (let i = 0; i < bn; i++) {
      const r = 296 + Math.pow(Math.random(), .8) * 52, a = Math.random() * Math.PI * 2;
      bp[i * 3] = Math.cos(a) * r; bp[i * 3 + 1] = (Math.random() - .5) * 9; bp[i * 3 + 2] = Math.sin(a) * r; bs[i] = Math.random();
    }
    const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.BufferAttribute(bp, 3)); bg.setAttribute('aS', new THREE.BufferAttribute(bs, 1));
    this.rockMat = new THREE.ShaderMaterial({
      uniforms: { uPR: { value: quality.dpr }, uFar: { value: 0 } },
      vertexShader: /* glsl */`uniform float uPR, uFar; attribute float aS; varying float vA; varying float vS;
        void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv;
          gl_PointSize = clamp((0.35 + pow(aS, 3.0) * 2.4) * 70.0 * uPR / -mv.z, 1.0, 30.0 * uPR); vA = smoothstep(0.5, 4.0, -mv.z) * (1.0 - smoothstep(380.0, 900.0, -mv.z) * uFar); vS = aS; }`,
      fragmentShader: /* glsl */`varying float vA; varying float vS; void main() { vec2 c = gl_PointCoord - 0.5; float d = length(c) * 2.0; if (d > 1.0) discard;
        float shade = 0.5 + 0.5 * (-c.x - c.y); gl_FragColor = vec4(mix(vec3(0.62, 0.55, 0.6), vec3(0.95, 0.82, 0.7), vS) * shade, smoothstep(1.0, 0.65, d) * vA); }`,
      transparent: true, depthWrite: false
    });
    this.belt = new THREE.Points(bg, this.rockMat); this.belt.frustumCulled = false; scene.add(this.belt);

    // our ship
    this.ship = new Starship({ maxSparks: low ? 500 : 900 });
    this.ship.setScale(SHIP);
    scene.add(this.ship.group, this.ship.trail);

    // lens flare ghosts (camera space)
    this.flare = new THREE.Group();
    const ghostCols = ['#ff9f6b', '#9fd0ff', '#ffd27a', '#c9a2ff', '#ffffff'];
    this.ghosts = [.25, .5, .72, 1.15, 1.45].map((dd, i) => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: i === 3 ? ringFlareTex() : glow, color: ghostCols[i], blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, transparent: true, opacity: 0 }));
      s.userData = { d: dd, size: [.06, .03, .1, .22, .05][i] };
      this.flare.add(s); return s;
    });
    this.streak = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: '#ffd9b0', blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, transparent: true, opacity: 0 }));
    this.flare.add(this.streak);
    this.flare.renderOrder = 20;

    this.placePlanets(OVERVIEW);
    this.buildPath();
    this.t = -1; this.captionAt = -1; this.events = {};
    this.lookTarget = new THREE.Vector3();
    this.tmp = new THREE.Vector3(); this.tmp2 = new THREE.Vector3(); this.m4 = new THREE.Matrix4(); this.q = new THREE.Quaternion();
    this.ship.update(0, 0, { thrust: .25, pixelRatio });
  }

  buildRings(pl, tex) {
    const R = pl.R;
    pl.tilt = new THREE.Group(); pl.tilt.rotation.set(.42, 0, .22);
    pl.group.add(pl.tilt);
    pl.tilt.add(pl.body); pl.body.position.set(0, 0, 0);
    const ringGeo = new THREE.RingGeometry(R * 1.24, R * 2.3, 256, 4);
    const pos = ringGeo.attributes.position, uv = ringGeo.attributes.uv, v3 = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) { v3.fromBufferAttribute(pos, i); uv.setXY(i, (v3.length() - R * 1.24) / (R * (2.3 - 1.24)), .5); }
    this.ringMat = new THREE.ShaderMaterial({
      uniforms: { uMap: { value: tex('saturn-ring.webp') }, uSun: { value: new THREE.Vector3() }, uCenter: { value: new THREE.Vector3() }, uR: { value: R } },
      vertexShader: /* glsl */`varying vec2 vUv; varying vec3 vW; void main() { vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: /* glsl */`
        uniform sampler2D uMap; uniform vec3 uSun, uCenter; uniform float uR; varying vec2 vUv; varying vec3 vW;
        void main() {
          vec4 t = texture2D(uMap, vec2(vUv.x, 0.5));
          vec3 L = normalize(uSun), oc = vW - uCenter;
          float b = dot(oc, L), c = dot(oc, oc) - uR * uR;
          float shadow = (b < 0.0 && b * b - c > 0.0) ? 0.12 : 1.0;
          gl_FragColor = vec4(t.rgb * (0.12 + 0.7 * shadow), t.a * 0.95);
        }`,
      transparent: true, side: THREE.DoubleSide, depthWrite: false
    });
    const ring = new THREE.Mesh(ringGeo, this.ringMat); ring.rotation.x = -Math.PI / 2;
    pl.tilt.add(ring); pl.ring = ring;
  }

  /** planet angles in the time lapse: they slow down and stop when the flight starts */
  placePlanets(f) {
    const k = Math.pow(1 - clamp(f / OVERVIEW, 0, 1), 3);
    for (const d of PLANETS) {
      const pl = this.planets[d.name];
      pl.angle = d.a - d.w * 3 * k;
      pl.group.position.copy(P(d.orbit, pl.angle));
    }
    const ep = this.planets.earth.group.position;
    this.moon.position.copy(ep).add(this.moonOffset);
    if (this.earth.group.parent === this.scene) { this.earth.group.position.copy(ep); this.earth.light.copy(ep).negate().normalize(); }
  }

  /** the route through the system, with flybys placed from the geometry */
  buildPath() {
    const pp = name => this.planets[name].group.position.clone();
    const S = pp('saturn'), J = pp('jupiter'), M = pp('mars'), E = pp('earth');
    const pr = name => this.planets[name].R;
    const W0 = P(830, .2, 24);
    // Saturn: straight through the ring band at 1.75 R, crossing the tilted ring plane
    this.planets.saturn.tilt.updateMatrixWorld(true);
    const nS = new THREE.Vector3(0, 1, 0).applyQuaternion(this.planets.saturn.tilt.quaternion).normalize();
    const dS = J.clone().sub(W0).normalize();
    const sideS = new THREE.Vector3().crossVectors(nS, dS).normalize();
    const C = S.clone().addScaledVector(sideS, pr('saturn') * 1.75);
    const W1 = C.clone().addScaledVector(dS, -70).addScaledVector(nS, 24), W2 = C.clone().addScaledVector(dS, 70).addScaledVector(nS, -24);
    // Jupiter: close past its sunlit side
    const dJ = M.clone().sub(S).normalize();
    const sunJ = J.clone().negate().normalize(), oJ = sunJ.addScaledVector(dJ, -sunJ.dot(dJ)).normalize();
    const CJ = J.clone().addScaledVector(oJ, pr('jupiter') * 1.85).add(new THREE.Vector3(0, 4, 0));
    const W3 = CJ.clone().addScaledVector(dJ, -75), W4 = CJ, W5 = CJ.clone().addScaledVector(dJ, 75);
    // through the asteroid belt, then close past Mars
    const W6 = P(322, Math.atan2(W5.z, W5.x) + .16, 3);
    const dM = E.clone().sub(M).normalize();
    const sunM = M.clone().negate().normalize(), oM = sunM.addScaledVector(dM, -sunM.dot(dM)).normalize();
    const CM = M.clone().addScaledVector(oM, pr('mars') * 2.6).add(new THREE.Vector3(0, 1.5, 0));
    const W7 = CM.clone().addScaledVector(dM, -30), W8 = CM.clone().addScaledVector(dM, 24);
    // past the Moon, then towards the Earth from the side (the dive swings onto the day side)
    const fromM = M.clone().sub(E).normalize();
    const dirE = fromM.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.sign(fromM.clone().cross(E.clone().negate()).y || 1) * .25).add(new THREE.Vector3(0, .22, 0)).normalize();
    this.moonOffset.copy(dirE).applyAxisAngle(new THREE.Vector3(0, 1, 0), .75).multiplyScalar(17).add(new THREE.Vector3(0, 4, 0));
    this.moon.position.copy(E).add(this.moonOffset);
    const W9 = E.clone().addScaledVector(dirE, 75).add(new THREE.Vector3(0, 6, 0));
    const W10 = E.clone().addScaledVector(dirE, pr('earth') * 4.4);
    const pts = [W0, W1, W2, W3, W4, W5, W6, W7, W8, W9, W10];
    this.curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    // timing: a slow cruise for the cockpit shot, fast between the planets, slower at each flyby
    const WT = [LAUNCH, 19.6, 21.8, 23.6, 25.2, 26.8, 28.6, 30.4, 31.9, 34, END];
    const N = 2400, L = this.curve.getLengths(N), total = L[N];
    const uAt = i => L[Math.round(i / (pts.length - 1) * N)] / total;
    const keys = pts.map((_, i) => [WT[i], uAt(i)]);
    keys.push([END + 1.3, 1.04]);   // keeps the speed up at the end (u is clamped to 1)
    this.uOf = mono(keys);
    const tOf = u => { let lo = LAUNCH, hi = END; for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2; if (this.uOf(m) < u) lo = m; else hi = m; } return lo; };
    // when do we pass the planets? (closest approach)
    const closest = c => { let best = 1e9, bu = 0; for (let i = 0; i <= 900; i++) { const d = this.curve.getPointAt(i / 900).distanceTo(c); if (d < best) { best = d; bu = i / 900; } } return { t: tOf(bu), d: best }; };
    const Mo = this.moon.position.clone();
    this.pass = { saturn: closest(S), jupiter: closest(J), mars: closest(M), moon: closest(Mo) };
    this.S = S; this.J = J; this.M = M; this.E = E;
    // rocks of Saturn's rings around the crossing point
    const rn = 2600, rp = new Float32Array(rn * 3), rs = new Float32Array(rn);
    const ex = new THREE.Vector3().crossVectors(nS, dS).normalize(), ez = new THREE.Vector3().crossVectors(ex, nS).normalize();
    for (let i = 0; i < rn; i++) {
      const q = C.clone().addScaledVector(ex, (Math.random() - .5) * 70).addScaledVector(ez, (Math.random() - .5) * 90).addScaledVector(nS, (Math.random() - .5) * 1.4);
      const dq = q.distanceTo(S);
      if (dq < pr('saturn') * 1.3 || dq > pr('saturn') * 2.25) { i--; continue; }
      rp[i * 3] = q.x; rp[i * 3 + 1] = q.y; rp[i * 3 + 2] = q.z; rs[i] = Math.random();
    }
    const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.BufferAttribute(rp, 3)); rg.setAttribute('aS', new THREE.BufferAttribute(rs, 1));
    const ringRockMat = this.rockMat.clone(); ringRockMat.uniforms.uFar.value = 1;
    const rocks = new THREE.Points(rg, ringRockMat); rocks.frustumCulled = false; this.scene.add(rocks);
  }

  /** ship frame at flight time f */
  shipAt(f) {
    const s = this.sframe || (this.sframe = { p: new THREE.Vector3(), fw: new THREE.Vector3(), up: new THREE.Vector3(), rt: new THREE.Vector3(), roll: 0 });
    const u = clamp(this.uOf(f), 0, 1);
    this.curve.getPointAt(u, s.p);
    const u2 = Math.min(1, u + .002), u1 = Math.max(0, u2 - .004);
    s.fw.copy(this.curve.getPointAt(u2, this.tmp)).sub(this.curve.getPointAt(u1, this.tmp2)).normalize();
    s.rt.crossVectors(s.fw, new THREE.Vector3(0, 1, 0)).normalize();
    s.up.crossVectors(s.rt, s.fw).normalize();
    // bank into the turns
    const fa = this.curve.getTangentAt(Math.max(0, u - .01)), fb = this.curve.getTangentAt(Math.min(1, u + .01));
    const turn = fb.sub(fa).dot(s.rt);
    s.roll += (clamp(turn * 9, -.9, .9) - s.roll) * .08;
    return s;
  }

  start() {
    this.t = 0;
    this.camera.near = .03; this.camera.far = 9000; this.camera.updateProjectionMatrix();
    this.camera.add(this.flare);
    this.earth.setParent(this.scene, { position: this.planets.earth.group.position, scale: this.planets.earth.R / this.earth.radius, quadScene: this.scene });
    this.update(0);
  }

  caption(text, dur) {
    const el = this.captionsEl;
    if (!el || !text) return;
    el.classList.remove('in', 'big'); void el.offsetWidth;
    el.textContent = text;
    el.style.setProperty('--dur', dur + 's');
    el.classList.toggle('big', text.includes('&'));
    el.classList.add('in');
  }

  overviewPose(f, out) {
    const H = this.portrait ? 3100 : 2100, phi = .35 + .03 * f;
    out.pos.set(Math.sin(phi) * H * .45, H * (1 - .1 * f / OVERVIEW), Math.cos(phi) * H * .45);
    out.look.set(0, 0, 0).lerp(this.curve.points[0], .18 * f / OVERVIEW);
    return out;
  }

  /** camera shots; returns pose for shot i at time f (ship frame s) */
  shot(i, f, s, out) {
    const sc = SHIP;
    const p = s.p, fw = s.fw, up = s.up, rt = s.rt;
    switch (this.shots[i].kind) {
      case 'overview': return this.overviewPose(f, out);
      case 'swoop': {
        const k = smoother((f - OVERVIEW) / SWOOP);
        const a = this.overviewPose(OVERVIEW, this.swoopA || (this.swoopA = { pos: new THREE.Vector3(), look: new THREE.Vector3() }));
        const b = this.shot(this.shotIndex('chase'), LAUNCH, s, this.swoopB || (this.swoopB = { pos: new THREE.Vector3(), look: new THREE.Vector3() }));
        const c = this.curve.points[0].clone().multiplyScalar(1.12).add(new THREE.Vector3(0, 520, 0));
        out.pos.copy(a.pos).multiplyScalar((1 - k) * (1 - k)).addScaledVector(c, 2 * (1 - k) * k).addScaledVector(b.pos, k * k);
        out.look.copy(a.look).lerp(b.look, smoother(k * 1.25));
        return out;
      }
      case 'chase': {
        const kick = f > LAUNCH ? Math.sin(clamp((f - LAUNCH) / 1.6, 0, 1) * Math.PI) : 0;
        out.pos.copy(p).addScaledVector(fw, -(9 + 5 * kick) * sc).addScaledVector(up, 2.4 * sc);
        out.look.copy(p).addScaledVector(fw, 14 * sc);
        return out;
      }
      case 'cockpit':
        out.pos.copy(p).addScaledVector(fw, (this.portrait ? 4.9 : 3.9) * sc).addScaledVector(up, (this.portrait ? 1.6 : 1.45) * sc).addScaledVector(rt, (this.portrait ? -.75 : -1.6) * sc);
        out.look.copy(p).addScaledVector(fw, .1 * sc).addScaledVector(up, .62 * sc);
        return out;
      case 'saturn':
        out.pos.copy(p).addScaledVector(fw, -7 * sc).addScaledVector(rt, 4.5 * sc).addScaledVector(up, -1.8 * sc);
        out.look.copy(p).addScaledVector(fw, 18 * sc).lerp(this.S, .02);
        return out;
      case 'jupiter': {
        const side = Math.sign(this.tmp.copy(this.J).sub(p).dot(rt)) || 1;
        out.pos.copy(p).addScaledVector(rt, -side * 8 * sc).addScaledVector(up, 1.8 * sc).addScaledVector(fw, -1.5 * sc);
        out.look.copy(p).addScaledVector(this.tmp.copy(this.J).sub(p).normalize(), 6 * sc);
        return out;
      }
      case 'mars':
        out.pos.copy(p).addScaledVector(fw, -8.5 * sc).addScaledVector(up, -1.5 * sc).addScaledVector(rt, 1.8 * sc);
        out.look.copy(p).addScaledVector(fw, 30 * sc);
        return out;
      case 'earth':
        out.pos.copy(p).addScaledVector(fw, -11 * sc).addScaledVector(up, 3.4 * sc).addScaledVector(rt, -1.2 * sc);
        out.look.copy(p).addScaledVector(fw, 50 * sc);
        return out;
    }
    return out;
  }
  shotIndex(kind) { return this.shots.findIndex(x => x.kind === kind); }

  scheduleShots() {
    const ps = this.pass;
    this.shots = [
      { kind: 'overview', at: 0 }, { kind: 'swoop', at: OVERVIEW, cut: true }, { kind: 'chase', at: LAUNCH, cut: true },
      { kind: 'cockpit', at: LAUNCH + 1.4 }, { kind: 'saturn', at: ps.saturn.t - 3.2 }, { kind: 'chase', at: ps.saturn.t + 1.6 },
      { kind: 'jupiter', at: ps.jupiter.t - 2.6 }, { kind: 'chase', at: ps.jupiter.t + 2.2 }, { kind: 'mars', at: ps.mars.t - 2.4 }, { kind: 'earth', at: ps.mars.t + 1.2 }
    ].sort((a, b) => a.at - b.at);
    // captions: personal lines spread over the flight, each with time to read
    const L = this.lines, want = [[.6, 4.1], [4.9, 4.1], [OVERVIEW + .2, 3.8], [LAUNCH + 1.6, 3.6], [ps.saturn.t - 2.4, 4.8], [ps.jupiter.t - 2.2, 4.6], [ps.jupiter.t + 2.5, 4.2], [ps.mars.t + 1, 4.6]];
    this.caps = []; let free = 0;
    want.forEach(([at, dur], i) => { if (!L[i]) return; const t0 = Math.max(at, free); this.caps.push([t0, i, dur]); free = t0 + dur + .15; });
  }

  /** returns 'launch' | 'saturn' | 'jupiter' | 'mars' | 'dive' once each */
  update(dt) {
    if (this.t < 0) return null;
    if (!this.shots) this.scheduleShots();
    this.t += dt;
    const f = this.t, cam = this.camera;
    let event = null;
    const fire = name => { if (this.events[name]) return false; this.events[name] = true; event = name; return true; };

    this.placePlanets(f);
    if (f >= LAUNCH) fire('launch');
    ['saturn', 'jupiter', 'mars'].forEach(n => { if (f >= this.pass[n].t - .4) fire(n); });

    // ship: waits at the edge of the system, then the flight (and after END the dive into the Earth)
    const s = this.shipAt(Math.min(f, END));
    if (f > END) {
      if (!this.dive) this.dive = { p: s.p.clone(), v: s.fw.clone().multiplyScalar(48), k: 0 };
      const home = this.earth.toWorld(this.tmp.set(0, 0, 0), new THREE.Vector3());
      const want = home.sub(this.dive.p).normalize().multiplyScalar(48 + (f - END) * 40);
      this.dive.v.lerp(want, Math.min(1, dt * 3));
      this.dive.p.addScaledVector(this.dive.v, dt);
      s.p.copy(this.dive.p); s.fw.copy(this.dive.v).normalize();
      s.rt.crossVectors(s.fw, new THREE.Vector3(0, 1, 0)).normalize(); s.up.crossVectors(s.rt, s.fw).normalize();
      const dE = this.dive.p.distanceTo(this.earth.center(this.tmp2)) / this.planets.earth.R;
      this.ship.group.visible = dE > 1.08;
    }
    const g = this.ship.group;
    g.position.copy(s.p);
    this.m4.makeBasis(this.tmp.crossVectors(s.up, s.fw).normalize(), s.up, s.fw);
    g.quaternion.setFromRotationMatrix(this.m4).multiply(this.q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), s.roll));

    // camera
    if (f <= END) {
      let i = 0; while (i < this.shots.length - 1 && f >= this.shots[i + 1].at) i++;
      const cur = this.shot(i, f, s, this.poseA || (this.poseA = { pos: new THREE.Vector3(), look: new THREE.Vector3() }));
      const sh = this.shots[i], blend = 1.2;
      if (i > 0 && !sh.cut && f < sh.at + blend) {
        const prev = this.shot(i - 1, f, s, this.poseB || (this.poseB = { pos: new THREE.Vector3(), look: new THREE.Vector3() }));
        const k = smoother((f - sh.at) / blend);
        cur.pos.lerpVectors(prev.pos, cur.pos, k); cur.look.lerpVectors(prev.look, cur.look, k);
      }
      cam.position.copy(cur.pos);
      cam.up.set(0, 1, 0);
      cam.lookAt(cur.look);
      if (sh.kind !== 'overview' && sh.kind !== 'swoop') cam.rotateZ(-s.roll * .35);
      this.lookTarget.copy(cur.look);
      cam.updateMatrixWorld();
    }
    if (f >= END) fire('dive');

    // the two of you: look into the camera in the cockpit shot, Amelie waves
    const shotNow = this.shots.find((x, k) => f >= x.at && (k === this.shots.length - 1 || f < this.shots[k + 1].at));
    const inCockpit = shotNow && shotNow.kind === 'cockpit';
    const ci = this.shotIndex('cockpit'), cs = this.shots[ci].at;
    const wave = inCockpit ? smoother((f - cs - .5) / .5) * (1 - smoother((f - cs - 3.4) / .6)) : 0;
    this.ship.update(f, dt, { thrust: f < LAUNCH ? .22 : f > END ? .6 : 1, look: inCockpit ? cam.position : null, wave, pixelRatio: this.pixelRatio, sparkle: f < END ? 1 : 0 });

    // captions
    for (let k = 0; k < this.caps.length; k++) {
      const [at, li, dur] = this.caps[k];
      if (f >= at && this.captionAt < k) { this.captionAt = k; this.caption(this.lines[li], dur); }
    }

    // sun-lit shaders, spins, sun, orbits fade out once we fly
    for (const d of PLANETS) {
      const pl = this.planets[d.name];
      if (!pl.body) continue;
      pl.body.rotation.y += dt * (d.R > 10 ? .05 : .03);
      const L = this.tmp.copy(pl.group.position).negate().normalize();
      pl.body.material.uniforms.uSun.value.copy(L);
      if (pl.shell) pl.shell.material.uniforms.uSun.value.copy(L);
    }
    this.moon.material.uniforms.uSun.value.copy(this.planets.earth.group.position).negate().normalize();
    if (this.ringMat) { this.ringMat.uniforms.uSun.value.copy(this.planets.saturn.group.position).negate().normalize(); this.ringMat.uniforms.uCenter.value.copy(this.planets.saturn.group.position); }
    this.sunMat.uniforms.uTime.value = f;
    this.rays.material.rotation = f * .03;
    const dSun = cam.position.length();
    this.glows.forEach(([sp, k, min]) => sp.scale.setScalar(Math.max(min, dSun * k)));
    this.starMat.uniforms.uTime.value = f;
    const orbitK = 1 - smoother((f - OVERVIEW - 1.5) / 2.5);
    this.orbits.forEach(o => (o.material.uniforms.uOpacity.value = orbitK * .9));

    // light on the ship comes from the sun
    const sunDir = this.tmp.copy(s.p).negate().normalize();
    this.sunLight.position.copy(s.p).addScaledVector(sunDir, 10); this.sunLight.target.position.copy(s.p);
    this.rimLight.position.copy(s.p).addScaledVector(sunDir, -10).add(new THREE.Vector3(0, 4, 0)); this.rimLight.target.position.copy(s.p);
    this.sunLight.target.updateMatrixWorld(); this.rimLight.target.updateMatrixWorld();

    // sky and stars travel with the camera (they are infinitely far away)
    this.sky.position.copy(cam.position); this.stars.position.copy(cam.position);
    this.updateFlare(dt, f > LAUNCH + .5 ? 1 : 0);
    return event;
  }

  updateFlare(dt, allow = 1) {
    const cam = this.camera;
    const sp = this.tmp.set(0, 0, 0).project(cam);
    let vis = allow && sp.z < 1 && Math.abs(sp.x) < 1.3 && Math.abs(sp.y) < 1.3 ? 1 : 0;
    if (vis) {
      const dir = this.tmp2.copy(cam.position).negate().normalize();
      const check = (c, r) => { const oc = cam.position.clone().sub(c), b = oc.dot(dir), cc = oc.lengthSq() - r * r; return b < 0 && b * b - cc > 0; };
      for (const d of PLANETS) if (check(this.planets[d.name].group.position, d.R)) { vis = 0; break; }
    }
    this.flareVis = (this.flareVis || 0) + (vis - (this.flareVis || 0)) * Math.min(1, dt * 6);
    const fv = this.flareVis, d = 2;
    const hH = d * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)), hW = hH * cam.aspect;
    const sx = sp.x * hW, sy = sp.y * hH;
    this.ghosts.forEach((gh, i) => { const k = 1 - gh.userData.d * 2; gh.position.set(sx * k, sy * k, -d); gh.scale.setScalar(gh.userData.size * d * 2); gh.material.opacity = fv * (i === 3 ? .06 : .4); });
    this.streak.position.set(sx, sy, -d); this.streak.scale.set(d * 2.2, d * .035, 1); this.streak.material.opacity = fv * .32;
  }

  finish() {
    if (this.done) return;
    this.done = true;
    this.camera.remove(this.flare);
    this.camera.near = .1; this.camera.far = 600; this.camera.updateProjectionMatrix();
    if (this.captionsEl) this.captionsEl.classList.remove('in');
    this.ship.dispose();
    this.scene.traverse(o => {
      if (o === this.earth.group || this.earth.group.getObjectById(o.id)) return;
      if (o.geometry) o.geometry.dispose();
      if (o.material && o.material !== this.earth.screenMat) o.material.dispose();
    });
  }
}
