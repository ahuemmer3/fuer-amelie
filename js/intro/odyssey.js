import * as THREE from 'three';
import { clamp, rand } from '../core/utils.js';

/**
 * "Interstellar" style flight: sunrise over Earth, past the Moon, Mars and Jupiter,
 * straight through Saturn's rings and into a wormhole that leads to your galaxy.
 * Planet textures: Solar System Scope (CC BY 4.0).
 */
const TEX = './assets/textures/';

const PLANET_VS = /* glsl */`
  varying vec2 vUv; varying vec3 vN; varying vec3 vW;
  void main() { vUv = uv; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;

function planetMaterial(map, { night = null, atmo = '#000000', atmoStrength = 0, ambient = .035, spec = 0, gain = 1 } = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: map }, uNight: { value: night }, uHasNight: { value: night ? 1 : 0 },
      uSun: { value: new THREE.Vector3() }, uAtmo: { value: new THREE.Color(atmo) }, uAtmoK: { value: atmoStrength }, uAmb: { value: ambient }, uSpec: { value: spec }, uReveal: { value: 1 }, uGain: { value: gain }
    },
    vertexShader: PLANET_VS,
    fragmentShader: /* glsl */`
      uniform sampler2D uMap, uNight; uniform float uHasNight, uAtmoK, uAmb, uSpec, uReveal, uGain; uniform vec3 uSun, uAtmo;
      varying vec2 vUv; varying vec3 vN; varying vec3 vW;
      void main() {
        vec3 N = normalize(vN), L = normalize(uSun), V = normalize(cameraPosition - vW);
        float ndl = dot(N, L);
        vec3 day = texture2D(uMap, vUv).rgb;
        float diff = smoothstep(-0.05, 0.6, ndl) * max(ndl, 0.0) * 0.6 + max(ndl, 0.0) * 0.6;
        vec3 col = day * (uAmb + diff * 1.02) * uGain;
        if (uHasNight > 0.5) col += texture2D(uNight, vUv).rgb * vec3(1.0, 0.8, 0.55) * smoothstep(0.08, -0.2, ndl) * 1.4;
        // ocean glint (water is dark blue in the day map)
        float water = smoothstep(0.08, 0.0, day.r - day.b * 0.6);
        col += vec3(1.0, 0.92, 0.8) * pow(max(dot(reflect(-L, N), V), 0.0), 40.0) * uSpec * water * step(0.0, ndl);
        float fr = pow(1.0 - max(dot(N, V), 0.0), 3.0);
        col += uAtmo * fr * uAtmoK * smoothstep(-0.3, 0.45, ndl);
        // warm sunrise band along the terminator
        col += vec3(1.0, 0.45, 0.2) * uAtmoK * 0.35 * fr * exp(-pow(ndl * 6.0, 2.0));
        gl_FragColor = vec4(col * uReveal, 1.0);
      }`
  });
}

function atmosphereShell(radius, color, strength = 1) {
  const mat = new THREE.ShaderMaterial({
    uniforms: { uSun: { value: new THREE.Vector3() }, uCol: { value: new THREE.Color(color) }, uK: { value: strength }, uReveal: { value: 1 } },
    vertexShader: PLANET_VS,
    fragmentShader: /* glsl */`
      uniform vec3 uSun, uCol; uniform float uK, uReveal; varying vec3 vN; varying vec3 vW;
      void main() {
        vec3 N = normalize(vN), V = normalize(cameraPosition - vW);
        float rim = pow(1.0 - abs(dot(N, V)), 4.0);
        float lit = smoothstep(-0.35, 0.5, dot(N, normalize(uSun)));
        float a = rim * lit * uK * uReveal;
        gl_FragColor = vec4(uCol * a * 1.6, a);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.FrontSide
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

/** 1D Catmull-Rom through keyframe values (for smooth speed between keyframes) */
function spline1(keys, t) {
  let i = 0; while (i < keys.length - 2 && t > keys[i + 1][0]) i++;
  const [t1, v1] = keys[i], [t2, v2] = keys[i + 1];
  const v0 = (keys[i - 1] || keys[i])[1], v3 = (keys[i + 2] || keys[i + 1])[1];
  const x = clamp((t - t1) / (t2 - t1), 0, 1), x2 = x * x, x3 = x2 * x;
  return .5 * ((2 * v1) + (-v0 + v2) * x + (2 * v0 - 5 * v1 + 4 * v2 - v3) * x2 + (-v0 + 3 * v1 - 3 * v2 + v3) * x3);
}

export class Odyssey {
  constructor({ camera, quality, captionsEl, lines, textures }) {
    this.camera = camera; this.captionsEl = captionsEl; this.lines = lines || [];
    this.duration = 19.6;
    const low = quality.tier === 'low';
    const scene = this.scene = new THREE.Scene();
    const loader = new THREE.TextureLoader();
    // textures are preloaded in main.js (loading screen); fall back to loading here
    const tex = (f, srgb = true) => { const t = (textures && textures[f]) || loader.load(TEX + f); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
    this.sunDir = new THREE.Vector3(.75, .32, .58).normalize();   // behind the camera, to the right: planets are lit as we pass

    // sky: the real Milky Way + crisp stars
    const sky = new THREE.Mesh(new THREE.SphereGeometry(6000, 64, 32), new THREE.MeshBasicMaterial({ map: tex('milkyway.webp'), side: THREE.BackSide, color: new THREE.Color(.62, .56, .78), depthWrite: false }));
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
    const stars = new THREE.Points(sg, this.starMat); stars.frustumCulled = false; scene.add(stars);

    // the sun with glow
    scene.add(new THREE.AmbientLight('#ffffff', .03));
    this.sunPos = this.sunDir.clone().multiplyScalar(4500);
    const glow = glowTex();
    this.sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: '#fff2dd', blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    this.sun.position.copy(this.sunPos); this.sun.scale.setScalar(900);
    this.sunHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: '#ffb36b', blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: .35 }));
    this.sunHalo.position.copy(this.sunPos); this.sunHalo.scale.setScalar(2200);
    scene.add(this.sunHalo, this.sun);

    // planets (positions in a flight corridor along -z)
    this.planets = [];
    const add = (mesh, spin = .02) => { mesh.userData.spin = spin; scene.add(mesh); this.planets.push(mesh); return mesh; };
    const earth = this.earth = add(new THREE.Mesh(new THREE.SphereGeometry(70, 128, 96), planetMaterial(tex('earth.webp'), { night: tex('earth-night.webp'), atmo: '#6fb4ff', atmoStrength: 1.1, spec: .9, gain: .9 })), .012);
    earth.position.set(0, -78, -30); earth.rotation.set(.35, 2.6, 0);
    const cloudMat = new THREE.ShaderMaterial({
      uniforms: { uMap: { value: tex('earth-clouds.webp', false) }, uSun: { value: new THREE.Vector3() }, uReveal: { value: 1 } },
      vertexShader: PLANET_VS,
      fragmentShader: /* glsl */`uniform sampler2D uMap; uniform vec3 uSun; uniform float uReveal; varying vec2 vUv; varying vec3 vN;
        void main() { float c = texture2D(uMap, vUv).r; float l = max(dot(normalize(vN), normalize(uSun)), 0.0); gl_FragColor = vec4(vec3(1.0) * (0.02 + l * 0.82), c * 0.85 * uReveal); }`,
      transparent: true, depthWrite: false
    });
    this.clouds = new THREE.Mesh(new THREE.SphereGeometry(70.6, 128, 96), cloudMat);
    earth.add(this.clouds);
    this.atmos = [];
    const earthAtmo = atmosphereShell(73.5, '#7fbcff', 1.2); earth.add(earthAtmo); this.atmos.push(earthAtmo);

    const moon = add(new THREE.Mesh(new THREE.SphereGeometry(9, 96, 64), planetMaterial(tex('moon.webp'), { ambient: .01 })), .03);
    moon.position.set(58, 14, -168);

    const mars = add(new THREE.Mesh(new THREE.SphereGeometry(16, 96, 64), planetMaterial(tex('mars.webp'), { atmo: '#ff9a6b', atmoStrength: .45 })), .04);
    mars.position.set(-74, -4, -430);
    const marsAtmo = atmosphereShell(16.7, '#ff9466', .6); mars.add(marsAtmo); this.atmos.push(marsAtmo);

    const jupiter = add(new THREE.Mesh(new THREE.SphereGeometry(80, 128, 96), planetMaterial(tex('jupiter.webp'), { atmo: '#ffd9b0', atmoStrength: .35, gain: .9 })), .05);
    jupiter.position.set(150, -30, -820); jupiter.rotation.z = .05;
    const jupAtmo = atmosphereShell(82.5, '#ffd7a8', .45); jupiter.add(jupAtmo); this.atmos.push(jupAtmo);
    // a few Galilean-moon-like companions
    [[60, 40, -720, 3.2], [250, 10, -900, 2.6], [90, -70, -900, 2.2]].forEach(([x, y, z, r]) => { const m = add(new THREE.Mesh(new THREE.SphereGeometry(r, 48, 32), planetMaterial(tex('moon.webp'))), .05); m.position.set(x, y, z); });

    // Saturn with rings that receive the planet's shadow
    const saturn = this.saturn = new THREE.Group();
    saturn.position.set(-150, 0, -1310); saturn.rotation.set(.12, 0, .38);
    const satBody = new THREE.Mesh(new THREE.SphereGeometry(58, 128, 96), planetMaterial(tex('saturn.webp'), { atmo: '#ffe2b0', atmoStrength: .25, gain: .62 }));
    satBody.userData.spin = .06; saturn.add(satBody); this.planets.push(satBody);
    const ringGeo = new THREE.RingGeometry(58 * 1.24, 58 * 2.3, 256, 4);
    const pos = ringGeo.attributes.position, uv = ringGeo.attributes.uv, v3 = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) { v3.fromBufferAttribute(pos, i); uv.setXY(i, (v3.length() - 58 * 1.24) / (58 * (2.3 - 1.24)), .5); }
    this.ringMat = new THREE.ShaderMaterial({
      uniforms: { uMap: { value: tex('saturn-ring.webp') }, uSun: { value: new THREE.Vector3() }, uCenter: { value: new THREE.Vector3() }, uR: { value: 58 }, uReveal: { value: 1 } },
      vertexShader: /* glsl */`varying vec2 vUv; varying vec3 vW; void main() { vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: /* glsl */`
        uniform sampler2D uMap; uniform vec3 uSun, uCenter; uniform float uR, uReveal; varying vec2 vUv; varying vec3 vW;
        void main() {
          vec4 t = texture2D(uMap, vec2(vUv.x, 0.5));
          // shadow of the planet on the rings
          vec3 L = normalize(uSun), oc = vW - uCenter;
          float b = dot(oc, L), c = dot(oc, oc) - uR * uR;
          float shadow = (b < 0.0 && b * b - c > 0.0) ? 0.12 : 1.0;
          vec3 col = t.rgb * (0.12 + 0.7 * shadow);
          gl_FragColor = vec4(col * uReveal, t.a * 0.95 * uReveal);
        }`,
      transparent: true, side: THREE.DoubleSide, depthWrite: false
    });
    const ring = new THREE.Mesh(ringGeo, this.ringMat); ring.rotation.x = -Math.PI / 2;
    saturn.add(ring); scene.add(saturn); this.satBody = satBody;

    // flight keyframes: [time, position, look target]
    const K = [
      [0, [0, 16, 70], [0, -18, -120]],
      [2.6, [6, 26, -40], [40, 4, -170]],
      [4.6, [40, 20, -150], [58, 14, -168]],
      [7.4, [-44, 4, -390], [-74, -4, -430]],
      [11.2, [62, 4, -760], [150, -30, -820]],
      [15.2, [-52, 2, -1228], [-150, 0, -1310]],
      [17.4, [-30, 14, -1560], [0, 20, -1760]],
      [19.6, [0, 20, -1744], [0, 20, -1760]]
    ];
    this.keys = K;
    this.posCurve = new THREE.CatmullRomCurve3(K.map(k => new THREE.Vector3(...k[1])), false, 'centripetal');
    this.lookCurve = new THREE.CatmullRomCurve3(K.map(k => new THREE.Vector3(...k[2])), false, 'centripetal');
    this.uKeys = K.map((k, i) => [k[0], i / (K.length - 1)]);

    // ring particles where the camera crosses Saturn's ring plane
    const crossing = this.findRingCrossing();
    const pn = low ? 1800 : 4500, rp = new Float32Array(pn * 3), rs = new Float32Array(pn);
    saturn.updateMatrixWorld(true);
    const ringToWorld = ring.matrixWorld;
    const local = crossing ? crossing.clone().applyMatrix4(new THREE.Matrix4().copy(ringToWorld).invert()) : new THREE.Vector3(80, 0, 0);
    for (let i = 0; i < pn; i++) {
      const p = new THREE.Vector3(local.x + rand(-45, 45), local.y + rand(-45, 45), rand(-.8, .8)).applyMatrix4(ringToWorld);
      rp[i * 3] = p.x; rp[i * 3 + 1] = p.y; rp[i * 3 + 2] = p.z; rs[i] = Math.random();
    }
    const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.BufferAttribute(rp, 3)); rg.setAttribute('aS', new THREE.BufferAttribute(rs, 1));
    this.rockMat = new THREE.ShaderMaterial({
      uniforms: { uPR: { value: quality.dpr } },
      vertexShader: /* glsl */`uniform float uPR; attribute float aS; varying float vA;
        void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = clamp((0.3 + pow(aS, 3.0) * 2.2) * 60.0 * uPR / -mv.z, 0.0, 26.0 * uPR); vA = smoothstep(0.0, 6.0, -mv.z) * (1.0 - smoothstep(60.0, 140.0, -mv.z)); }`,
      fragmentShader: /* glsl */`varying float vA; void main() { vec2 c = gl_PointCoord - 0.5; float d = length(c) * 2.0; if (d > 1.0) discard; float shade = 0.55 + 0.45 * (-c.x - c.y); gl_FragColor = vec4(vec3(0.95, 0.84, 0.68) * shade, smoothstep(1.0, 0.7, d) * vA); }`,
      transparent: true, depthWrite: false
    });
    const rocks = new THREE.Points(rg, this.rockMat); rocks.frustumCulled = false; scene.add(rocks);

    // the wormhole: a glowing spherical lens showing another (pink) galaxy
    this.wormPos = new THREE.Vector3(0, 20, -1760); this.wormR = 15;
    this.wormMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uC: { value: this.wormPos }, uReveal: { value: 1 } },
      vertexShader: PLANET_VS,
      fragmentShader: /* glsl */`
        uniform float uTime, uReveal; uniform vec3 uC; varying vec3 vN; varying vec3 vW;
        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float noise(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y); }
        float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.05; a *= 0.5; } return v; }
        void main() {
          vec3 N = normalize(vN), V = normalize(cameraPosition - vW);
          float mu = max(dot(N, V), 0.0);          // 1 = centre, 0 = edge
          // look "through" the lens: polar coordinates swirl towards the edge
          vec3 side = normalize(N - V * dot(N, V) + 1e-4);
          float ang = atan(side.y, side.x);
          float rad = 1.0 - mu;
          float swirl = ang + rad * 6.0 + uTime * 0.25;
          vec2 p = vec2(cos(swirl), sin(swirl)) * (0.4 + rad * 3.0);
          float neb = fbm(p * 2.0 + uTime * 0.05);
          vec3 col = mix(vec3(0.06, 0.01, 0.1), vec3(0.85, 0.28, 0.62), smoothstep(0.4, 0.9, neb));
          float arms = pow(0.5 + 0.5 * sin(2.0 * ang - 9.0 * rad + uTime * 0.5), 3.0);
          col += vec3(1.0, 0.42, 0.74) * arms * smoothstep(0.95, 0.15, rad) * (0.5 + neb);   // spiral arms of the other galaxy
          col += vec3(1.0, 0.86, 0.95) * exp(-rad * 6.0) * 0.9;                              // its bright core
          float st = step(0.985, hash(floor(p * 60.0))) * (0.6 + 0.4 * sin(uTime * 4.0 + p.x * 50.0));
          col += vec3(st) * (1.0 - mu);
          col += vec3(0.85, 0.9, 1.0) * exp(-pow((mu - 0.06) / 0.05, 2.0)) * 1.3;   // Einstein ring at the rim
          col *= uReveal;
          gl_FragColor = vec4(col, 1.0);
        }`
    });
    this.worm = new THREE.Mesh(new THREE.SphereGeometry(this.wormR, 96, 64), this.wormMat);
    this.worm.position.copy(this.wormPos);
    scene.add(this.worm);
    this.wormGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: ringFlareTex(), color: '#cfd9ff', blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: .8 }));
    this.wormGlow.position.copy(this.wormPos); this.wormGlow.scale.setScalar(this.wormR * 2.9);
    scene.add(this.wormGlow);

    // lens flare ghosts (camera space)
    this.flare = new THREE.Group();
    const ghostCols = ['#ff9f6b', '#9fd0ff', '#ffd27a', '#c9a2ff', '#ffffff'];
    this.ghosts = [.25, .5, .72, 1.15, 1.45].map((d, i) => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: i === 3 ? ringFlareTex() : glow, color: ghostCols[i], blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, transparent: true, opacity: 0 }));
      s.userData = { d, size: [.06, .03, .1, .22, .05][i] };
      this.flare.add(s); return s;
    });
    this.streak = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: '#ffd9b0', blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, transparent: true, opacity: 0 }));
    this.flare.add(this.streak);
    this.flare.renderOrder = 20;

    this.reveals = [
      { at: -1, mats: [earth.material, cloudMat, earthAtmo.material] },
      { at: 1.2, mats: [moon.material] },
      { at: 4.0, mats: [mars.material, marsAtmo.material] },
      { at: 7.2, mats: [jupiter.material, jupAtmo.material, ...this.planets.filter(m => m.geometry.parameters.radius < 4).map(m => m.material)] },
      { at: 11.0, mats: [satBody.material, this.ringMat] },
      { at: 14.6, mats: [this.wormMat], sprite: this.wormGlow }
    ];
    this.reveals.forEach(r => r.mats.forEach(m => (m.uniforms.uReveal.value = r.at < 0 ? 1 : 0)));
    this.wormGlow.material.opacity = 0;
    this.t = -1; this.captionAt = -1;
    this.tmp = new THREE.Vector3(); this.tmp2 = new THREE.Vector3();
  }

  findRingCrossing() {
    this.saturn.updateMatrixWorld(true);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.saturn.quaternion);
    const c = this.saturn.position;
    let prev = null, prevP = null;
    for (let i = 0; i <= 400; i++) {
      const p = this.posCurve.getPoint(i / 400), s = Math.sign(p.clone().sub(c).dot(up));
      if (prev !== null && s !== prev) return p.clone().lerp(prevP, .5);
      prev = s; prevP = p;
    }
    return null;
  }

  start() {
    this.t = 0;
    this.camera.far = 9000; this.camera.near = .5; this.camera.updateProjectionMatrix();
    this.camera.add(this.flare);
    this.place(0);
  }

  place(t) {
    const u = clamp(spline1(this.uKeys, t), 0, 1);
    this.camera.position.copy(this.posCurve.getPoint(u));
    this.camera.lookAt(this.lookCurve.getPoint(u));
    // a little cinematic roll
    this.camera.rotateZ(Math.sin(t * .35) * .06 + (t > 14 && t < 16.5 ? Math.sin((t - 14) / 2.5 * Math.PI) * .25 : 0));
  }

  caption(i) {
    const el = this.captionsEl;
    if (!el || !this.lines[i]) return;
    el.classList.remove('in', 'big'); void el.offsetWidth;
    el.textContent = this.lines[i];
    el.classList.toggle('big', this.lines[i].includes('&'));
    el.classList.add('in');
  }

  update(dt) {
    if (this.t < 0) return null;
    this.t += dt;
    const t = this.t, cam = this.camera;
    const times = [.6, 3.0, 6.4, 9.6, 13.4, 17.6];
    for (let i = 0; i < times.length; i++) if (t >= times[i] && this.captionAt < i) { this.captionAt = i; this.caption(i); }
    this.place(t);
    cam.updateMatrixWorld();

    // sun direction for all shaders
    const L = this.sunDir;
    this.planets.forEach(p => { p.rotation.y += p.userData.spin * dt; if (p.material.uniforms && p.material.uniforms.uSun) p.material.uniforms.uSun.value.copy(L); });
    this.atmos.forEach(a => a.material.uniforms.uSun.value.copy(L));
    this.clouds.material.uniforms.uSun.value.copy(L); this.clouds.rotation.y += dt * .01;
    this.ringMat.uniforms.uSun.value.copy(L); this.satBody.getWorldPosition(this.ringMat.uniforms.uCenter.value);
    this.starMat.uniforms.uTime.value = t;
    this.wormMat.uniforms.uTime.value = t;
    this.wormGlow.material.rotation = t * .2;
    this.reveals.forEach(r => {
      if (r.at < 0) return;
      const k = clamp((t - r.at) / 1.8, 0, 1), e = k * k * (3 - 2 * k);
      r.mats.forEach(m => (m.uniforms.uReveal.value = e));
      if (r.sprite) r.sprite.material.opacity = .8 * e;
    });

    // lens flare: visible when the sun is on screen and not hidden behind a planet
    const sp = this.tmp.copy(this.sunPos).project(cam);
    let vis = sp.z < 1 && Math.abs(sp.x) < 1.3 && Math.abs(sp.y) < 1.3 ? 1 : 0;
    if (vis) {
      const dir = this.tmp2.copy(this.sunPos).sub(cam.position).normalize();
      for (const p of this.planets) {
        const c = p.getWorldPosition(new THREE.Vector3()), r = p.geometry.parameters.radius * p.getWorldScale(new THREE.Vector3()).x;
        const oc = cam.position.clone().sub(c), b = oc.dot(dir), cc = oc.lengthSq() - r * r * 1.02;
        if (b < 0 && b * b - cc > 0) { vis = 0; break; }
      }
    }
    this.flareVis = (this.flareVis || 0) + (vis - (this.flareVis || 0)) * Math.min(1, dt * 6);
    const fv = this.flareVis, d = 2; // flare plane distance in camera space
    const hH = d * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)), hW = hH * cam.aspect;
    const sx = sp.x * hW, sy = sp.y * hH;
    this.ghosts.forEach(g => {
      const k = 1 - g.userData.d * 2;
      g.position.set(sx * k, sy * k, -d);
      g.scale.setScalar(g.userData.size * d * 2);
      g.material.opacity = fv * .5;
    });
    this.streak.position.set(sx, sy, -d); this.streak.scale.set(d * 3.2, d * .06, 1); this.streak.material.opacity = fv * .55;

    return t >= this.duration ? 'done' : null;
  }

  finish() {
    if (this.done) return;
    this.done = true;
    this.camera.remove(this.flare);
    this.camera.far = 600; this.camera.near = .1; this.camera.updateProjectionMatrix();
    if (this.captionsEl) this.captionsEl.classList.remove('in');
    this.scene.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      const m = o.material; if (!m) return;
      m.dispose();
    });
  }
}
