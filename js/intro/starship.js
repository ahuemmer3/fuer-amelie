import * as THREE from 'three';
import { createPilot } from './pilots.js';

/**
 * Our own little starfighter (Star Wars style, own design): pearl-white hull, a glass bubble
 * cockpit for two, four wings in an X, glowing pink engines and a big heart as the tail fin.
 * Forward is +Z. The sparkle trail lives in world space (add ship.trail to the scene).
 */
export function heartShape(s = 1) {
  const h = new THREE.Shape();
  h.moveTo(0, -.9 * s);
  h.bezierCurveTo(-.15 * s, -.62 * s, -1 * s, -.22 * s, -1 * s, .34 * s);
  h.bezierCurveTo(-1 * s, .86 * s, -.36 * s, 1.06 * s, 0, .62 * s);
  h.bezierCurveTo(.36 * s, 1.06 * s, 1 * s, .86 * s, 1 * s, .34 * s);
  h.bezierCurveTo(1 * s, -.22 * s, .15 * s, -.62 * s, 0, -.9 * s);
  return h;
}

function heartDecal() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  const path = () => { g.beginPath(); g.moveTo(128, 214); g.bezierCurveTo(108, 186, 26, 150, 26, 92); g.bezierCurveTo(26, 46, 86, 26, 128, 72); g.bezierCurveTo(170, 26, 230, 46, 230, 92); g.bezierCurveTo(230, 150, 148, 186, 128, 214); g.closePath(); };
  g.shadowColor = 'rgba(255, 60, 150, .9)'; g.shadowBlur = 18;
  path(); g.fillStyle = '#ff3f98'; g.fill();
  g.shadowBlur = 0; g.lineWidth = 10; g.strokeStyle = '#ffffff'; path(); g.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

const FLAME_VS = /* glsl */`varying float vK; varying vec2 vUv; void main() { vUv = uv; vK = uv.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const FLAME_FS = /* glsl */`
  uniform float uTime, uThrust; uniform vec3 uCol; varying float vK; varying vec2 vUv;
  void main() {
    float k = vK;                                   // 1 at the nozzle, 0 at the end
    float flick = 0.85 + 0.15 * sin(uTime * 47.0 + vUv.x * 18.0) * sin(uTime * 31.0);
    float a = pow(k, 1.6) * (0.35 + 0.65 * uThrust) * flick;
    vec3 col = mix(uCol, vec3(1.0, 0.92, 0.98), pow(k, 5.0));
    gl_FragColor = vec4(col * a * 0.85, a);
  }`;

export class Starship {
  constructor({ maxSparks = 900 } = {}) {
    const g = this.group = new THREE.Group();
    // (no environment map: lit by the sun, a fill light and the cabin light only)
    const pearl = new THREE.MeshStandardMaterial({ color: '#e6e0ec', metalness: .12, roughness: .34 });
    const steel = new THREE.MeshStandardMaterial({ color: '#a7a2b8', metalness: .35, roughness: .35 });
    const dark = new THREE.MeshStandardMaterial({ color: '#2c2738', metalness: .5, roughness: .45 });
    const pink = new THREE.MeshStandardMaterial({ color: '#ff4fa3', metalness: .1, roughness: .32, emissive: '#ff2f8e', emissiveIntensity: .35 });
    const glowPink = new THREE.MeshBasicMaterial({ color: '#ffd1ea' });

    // hull: a lathe along the ship's axis with an opening for the cockpit
    const prof = [[0, -2.5], [.3, -2.45], [.46, -2.1], [.55, -1.4], [.58, -.6], [.56, .2], [.5, .9], [.4, 1.5], [.27, 2.05], [.13, 2.5], [.03, 2.78], [0, 2.82]];
    let hull = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 56, -Math.PI / 2);
    hull.rotateX(Math.PI / 2);
    hull.scale(1.2, .78, 1);
    hull = this.cutCockpit(hull);
    g.add(new THREE.Mesh(hull, pearl));
    [-1.6, -.55, 1.35].forEach(z => {
      const r = this.radiusAt(prof, z);
      const seam = new THREE.Mesh(new THREE.TorusGeometry(r, .012, 6, 56), dark);
      seam.scale.set(1.2, .78, 1); seam.position.z = z;
      g.add(seam);
    });
    const noseRing = new THREE.Mesh(new THREE.TorusGeometry(this.radiusAt(prof, 2.15), .03, 8, 48), pink);
    noseRing.scale.set(1.2, .78, 1); noseRing.position.z = 2.15;
    g.add(noseRing);
    const noseLight = new THREE.Mesh(new THREE.ExtrudeGeometry(heartShape(.07), { depth: .02, bevelEnabled: false }), glowPink);
    noseLight.position.set(0, .05, 2.79); noseLight.rotation.x = 0;
    g.add(noseLight);

    // cockpit: dark tub, rim, dashboard, seats, the two of you, glass bubble
    const tub = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#251f30', roughness: .7, side: THREE.DoubleSide }));
    tub.scale.set(.47, .36, .52); tub.position.set(0, .36, .4);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(1, .065, 10, 64), steel);
    rim.scale.set(.47, .52, 1); rim.rotation.x = Math.PI / 2; rim.position.set(0, .37, .4);
    const dash = new THREE.Mesh(new THREE.BoxGeometry(.74, .11, .13), dark);
    dash.position.set(0, .36, .84); dash.rotation.x = -.5;
    g.add(tub, rim, dash);
    const screenMat = [new THREE.MeshBasicMaterial({ color: '#7fe6ff' }), new THREE.MeshBasicMaterial({ color: '#ff7ab8' })];
    [-.24, 0, .24].forEach((x, i) => {
      const sc = new THREE.Mesh(new THREE.PlaneGeometry(.15, .06), screenMat[i % 2]);
      sc.position.set(x, .39, .79); sc.rotation.x = -.5 - Math.PI;
      g.add(sc);
    });
    [-1, 1].forEach(s => {
      const seat = new THREE.Mesh(new THREE.BoxGeometry(.3, .44, .08), dark);
      seat.position.set(s * .23, .52, .1); seat.rotation.x = -.18;
      g.add(seat);
    });
    this.aaron = createPilot('aaron');
    this.amelie = createPilot('amelie');
    this.aaron.group.position.set(-.23, .6, .3);    // seen from the front, Aaron on the left like in your photo
    this.amelie.group.position.set(.23, .6, .3);
    g.add(this.aaron.group, this.amelie.group);
    this.glass = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.ShaderMaterial({
        vertexShader: /* glsl */`varying vec3 vN, vW; void main() { vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
        fragmentShader: /* glsl */`varying vec3 vN, vW; void main() { vec3 V = normalize(cameraPosition - vW); float f = pow(1.0 - abs(dot(normalize(vN), V)), 3.0);
          float streak = smoothstep(0.92, 1.0, sin(dot(vW, vec3(3.0, 5.0, 2.0)) * 1.3) * 0.5 + 0.5) * 0.25;
          gl_FragColor = vec4(vec3(0.85, 0.92, 1.0), 0.05 + f * 0.55 + streak); }`,
        transparent: true, depthWrite: false }));
    this.glass.scale.set(.47, .52, .52); this.glass.position.set(0, .37, .4);
    this.glass.renderOrder = 3;
    g.add(this.glass);
    const strut = new THREE.Mesh(new THREE.TorusGeometry(1, .012, 6, 40, Math.PI), steel);
    strut.scale.set(.47, .52, .52); strut.rotation.y = Math.PI / 2; strut.position.set(0, .37, .4);
    g.add(strut);
    const cabin = this.cabin = new THREE.PointLight('#ffe0ee', 1.3, 2.4, 2);
    cabin.position.set(0, 1.0, .9);
    g.add(cabin);

    // wings in an X with engines at the root and light pods at the tips
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, .25); wingShape.lineTo(2.3, 1.05); wingShape.lineTo(2.3, 1.62); wingShape.lineTo(0, 1.95); wingShape.closePath();
    const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: .06, bevelEnabled: true, bevelThickness: .015, bevelSize: .02, bevelSegments: 2 });
    wingGeo.rotateX(-Math.PI / 2); wingGeo.translate(0, -.03, 0);
    const stripeShape = new THREE.Shape();
    stripeShape.moveTo(0, .25); stripeShape.lineTo(2.3, 1.05); stripeShape.lineTo(2.3, 1.17); stripeShape.lineTo(0, .4); stripeShape.closePath();
    const stripeGeo = new THREE.ExtrudeGeometry(stripeShape, { depth: .11, bevelEnabled: false });
    stripeGeo.rotateX(-Math.PI / 2); stripeGeo.translate(0, -.055, 0);
    const wingMat = pearl.clone(); wingMat.side = THREE.DoubleSide;
    const pinkD = pink.clone(); pinkD.side = THREE.DoubleSide;
    const decal = new THREE.MeshBasicMaterial({ map: heartDecal(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, side: THREE.DoubleSide });
    this.engines = []; this.navLights = []; this.flames = [];
    const flameGeo = new THREE.CylinderGeometry(.13, .02, 1, 16, 1, true);
    flameGeo.translate(0, -.5, 0); flameGeo.rotateX(Math.PI / 2);    // from the nozzle backwards (−Z), uv.y = 1 at the nozzle
    for (const sx of [1, -1]) for (const sy of [1, -1]) {
      const w = new THREE.Group();
      w.position.set(sx * .45, sy * .06, 0);
      w.rotation.z = sx * sy * .27;
      w.scale.x = sx;
      const wing = new THREE.Mesh(wingGeo, wingMat);
      const stripe = new THREE.Mesh(stripeGeo, pinkD);
      w.add(wing, stripe);
      if (sy > 0) {
        const d = new THREE.Mesh(new THREE.PlaneGeometry(.62, .62), decal);
        d.rotation.x = -Math.PI / 2; d.rotation.z = Math.PI; d.scale.x = sx;   // the round top of the heart points forward
        d.position.set(1.55, .05, -1.28);
        w.add(d);
      }
      // engine
      const eng = new THREE.Group();
      eng.position.set(.32, sy * .02, -1.25);
      const body = new THREE.Mesh(new THREE.CylinderGeometry(.17, .15, 1.35, 24), pearl);
      body.rotation.x = Math.PI / 2;
      const intake = new THREE.Mesh(new THREE.TorusGeometry(.16, .03, 8, 24), steel);
      intake.position.z = .68;
      const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(.13, .16, .16, 24, 1, true), steel);
      nozzle.rotation.x = Math.PI / 2; nozzle.position.z = -.72;
      const glow = new THREE.Mesh(new THREE.CircleGeometry(.12, 24), glowPink);
      glow.position.z = -.7; glow.rotation.y = Math.PI;
      const flame = new THREE.Mesh(flameGeo, new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uThrust: { value: 0 }, uCol: { value: new THREE.Color('#ff4fa3') } },
        vertexShader: FLAME_VS, fragmentShader: FLAME_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide
      }));
      flame.position.z = -.72;
      eng.add(body, intake, nozzle, glow, flame);
      w.add(eng);
      this.engines.push(eng); this.flames.push(flame);
      // pod with a light at the wing tip
      const pod = new THREE.Mesh(new THREE.CylinderGeometry(.045, .05, 1.5, 12), steel);
      pod.rotation.x = Math.PI / 2; pod.position.set(2.32, 0, -1.05);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(.05, 12, 8), new THREE.MeshBasicMaterial({ color: sx > 0 ? '#ff4a6a' : '#5dff9c' }));
      tip.userData.base = tip.material.color.clone();
      tip.position.set(2.32, 0, -.28);
      w.add(pod, tip);
      this.navLights.push(tip);
      g.add(w);
    }

    // the big heart as the tail fin
    const fin = new THREE.Mesh(new THREE.ExtrudeGeometry(heartShape(.34), { depth: .07, bevelEnabled: true, bevelThickness: .03, bevelSize: .03, bevelSegments: 3 }), pink);
    fin.geometry.center();
    fin.rotation.y = Math.PI / 2; fin.rotation.x = -.15;
    fin.position.set(0, .78, -1.85);
    const finMount = new THREE.Mesh(new THREE.BoxGeometry(.06, .4, .5), pearl);
    finMount.position.set(0, .5, -1.85);
    g.add(finMount, fin);
    this.fin = fin;

    // sparkle trail in world space
    this.sparkN = maxSparks; this.sparkI = 0;
    this.sPos = new Float32Array(maxSparks * 3); this.sVel = new Float32Array(maxSparks * 3); this.sLife = new Float32Array(maxSparks); this.sSize = new Float32Array(maxSparks);
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(this.sPos, 3));
    sg.setAttribute('aLife', new THREE.BufferAttribute(this.sLife, 1));
    sg.setAttribute('aSize', new THREE.BufferAttribute(this.sSize, 1));
    this.trail = new THREE.Points(sg, new THREE.ShaderMaterial({
      uniforms: { uPR: { value: 1 } },
      vertexShader: /* glsl */`uniform float uPR; attribute float aLife, aSize; varying float vL;
        void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; vL = aLife;
          gl_PointSize = clamp(aSize * 90.0 * uPR * (0.4 + aLife) / -mv.z, 0.0, 12.0 * uPR); }`,
      fragmentShader: /* glsl */`varying float vL; void main() { float d = length(gl_PointCoord - 0.5) * 2.0; if (d > 1.0) discard;
        vec3 c = mix(vec3(0.75, 0.45, 1.0), vec3(1.0, 0.85, 0.95), vL); gl_FragColor = vec4(c * 0.9, pow(1.0 - d, 1.6) * vL * 0.75); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    }));
    this.trail.frustumCulled = false;
    this.thrust = 0;
    this.tmp = new THREE.Vector3();
  }

  /** scales the ship; the cabin light keeps its brightness (lights fall off with distance squared) */
  setScale(k) {
    this.group.scale.setScalar(k);
    this.cabin.intensity = 1.3 * k * k; this.cabin.distance = 2.4 * k;
  }

  radiusAt(prof, z) {
    for (let i = 0; i < prof.length - 1; i++) {
      const [r0, z0] = prof[i], [r1, z1] = prof[i + 1];
      if (z >= z0 && z <= z1) return r0 + (r1 - r0) * (z - z0) / (z1 - z0);
    }
    return .3;
  }

  /** removes the hull's triangles above the cockpit (an ellipse on the top) */
  cutCockpit(geo) {
    const pos = geo.attributes.position, idx = geo.index.array, keep = [];
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    for (let i = 0; i < idx.length; i += 3) {
      a.fromBufferAttribute(pos, idx[i]); b.fromBufferAttribute(pos, idx[i + 1]); c.fromBufferAttribute(pos, idx[i + 2]);
      const x = (a.x + b.x + c.x) / 3, y = (a.y + b.y + c.y) / 3, z = (a.z + b.z + c.z) / 3;
      if (y > .2 && (x / .45) ** 2 + ((z - .4) / .5) ** 2 < 1) continue;
      keep.push(idx[i], idx[i + 1], idx[i + 2]);
    }
    geo.setIndex(keep);
    return geo;
  }

  emit(pos, spread, drift = null) {
    const i = this.sparkI; this.sparkI = (this.sparkI + 1) % this.sparkN;
    this.sPos[i * 3] = pos.x; this.sPos[i * 3 + 1] = pos.y; this.sPos[i * 3 + 2] = pos.z;
    this.sVel[i * 3] = (Math.random() - .5) * spread; this.sVel[i * 3 + 1] = (Math.random() - .5) * spread; this.sVel[i * 3 + 2] = (Math.random() - .5) * spread;
    if (drift) { this.sVel[i * 3] += drift.x; this.sVel[i * 3 + 1] += drift.y; this.sVel[i * 3 + 2] += drift.z; }
    this.sLife[i] = 1; this.sSize[i] = .4 + Math.random() * .8;
  }

  /** thrust 0..1; look: world point the two of you look at (camera close-ups); wave: Amelie waves; drift: extra sparkle velocity */
  update(t, dt, { thrust = this.thrust, look = null, wave = 0, pixelRatio = 1, sparkle = 1, drift = null } = {}) {
    this.thrust += (thrust - this.thrust) * Math.min(1, dt * 4);
    const k = this.thrust;
    this.flames.forEach((f, i) => {
      f.material.uniforms.uTime.value = t + i * .37; f.material.uniforms.uThrust.value = k;
      f.scale.set(1, 1, .5 + k * 2.8 + Math.sin(t * 40 + i) * .08);
    });
    this.navLights.forEach((l, i) => l.material.color.copy(l.userData.base).multiplyScalar(Math.sin(t * 5 + i * 1.7) > .55 ? 1 : .25));
    this.fin.material.emissiveIntensity = .3 + .2 * Math.sin(t * 3);
    this.aaron.update(t, dt, { look, steer: Math.sin(t * .8) });
    this.amelie.update(t, dt, { look, wave });
    // sparkles from the engines
    this.group.updateMatrixWorld();
    if (k > .05 && sparkle > 0) this.engines.forEach(e => {
      for (let n = 0; n < 2; n++) if (Math.random() < k * sparkle) this.emit(e.localToWorld(this.tmp.set(0, 0, -.8 - Math.random() * .4)), .5, drift);
    });
    for (let i = 0; i < this.sparkN; i++) {
      if (this.sLife[i] <= 0) continue;
      this.sLife[i] = Math.max(0, this.sLife[i] - dt * (sparkle > 0 ? .9 : 3));
      this.sPos[i * 3] += this.sVel[i * 3] * dt; this.sPos[i * 3 + 1] += this.sVel[i * 3 + 1] * dt; this.sPos[i * 3 + 2] += this.sVel[i * 3 + 2] * dt;
    }
    const at = this.trail.geometry.attributes;
    at.position.needsUpdate = true; at.aLife.needsUpdate = true; at.aSize.needsUpdate = true;
    this.trail.material.uniforms.uPR.value = pixelRatio;
  }

  dispose() {
    [this.group, this.trail].forEach(o => o.traverse(m => { if (m.geometry) m.geometry.dispose(); if (m.material) { if (m.material.map) m.material.map.dispose(); m.material.dispose(); } }));
  }
}
