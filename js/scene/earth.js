import * as THREE from 'three';

/**
 * The Earth in the centre of the galaxy, ray-traced in a local frame around your home
 * (east/north/up in metres). That frame keeps full precision from space down to the roof,
 * so the same shader draws the globe in the galaxy and the zoom down to the house.
 * Aerial images: assets/zoom/z1–z9 (Web Mercator squares centred on the house).
 */
export const RM = 6378137;
const DEG = Math.PI / 180;
const LEVELS = 9;
/** aerial images in assets/zoom/ and their half width on the ground (m): Europe → the roof */
export const ZOOM_LEVELS = [['z1.webp', 1250e3], ['z2.webp', 320e3], ['z3.webp', 80e3], ['z4.webp', 20e3], ['z5.webp', 5e3],
  ['z6.webp', 1250], ['z7.webp', 410], ['z8.webp', 205], ['z9.webp', 102.5]];

const NOISE = /* glsl */`
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y); }
  float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + 17.1; a *= 0.5; } return v; }
`;

function fragmentShader(screen) {
  const samplers = Array.from({ length: LEVELS }, (_, i) => `uniform sampler2D uZ${i};`).join('\n');
  // z1/z2 are large: exact Mercator from lat/lon. The finer ones: Mercator from the local metres (precise).
  const levels = Array.from({ length: LEVELS }, (_, i) => /* glsl */`
    { vec2 uv = 0.5 + ${i < 2 ? 'mg' : 'ml'} / (2.0 * uZH[${i}]); vec2 d = abs(uv - 0.5);
      float w = smoothstep(0.5, 0.44, max(d.x, d.y)) * uZW[${i}];
      vec3 zc = ${i >= LEVELS - 2 ? `sharpTex(uZ${i}, uv, fp / (2.0 * uZH[${i}] / uK / 1024.0))` : `texture2D(uZ${i}, uv).rgb`};
      ground = mix(ground, zc, w); wsum = max(wsum, w); }`).join('');
  return /* glsl */`
    #define RM 6378137.0
    uniform vec3 uCamPos, uSun, uHomeCol, uSky;
    uniform mat3 uE2C;
    ${screen ? 'uniform vec3 uRight, uUp, uFwd; uniform vec2 uTan; varying vec2 vNdc;' : 'uniform mat3 uDirMat; varying vec3 vW;'}
    uniform sampler2D uDay, uNight, uCloud;
    ${samplers}
    uniform float uZH[${LEVELS}], uZW[${LEVELS}];
    uniform float uLon0, uPsi0, uK, uTanLat, uCamAlt;
    uniform float uTime, uOpacity, uClouds, uLocal, uMark, uPin, uSpot, uWisp, uGain, uExpo;
    uniform vec2 uOut[8];
    ${NOISE}

    // unsharp mask for magnified aerial photos (mag = screen pixel / texel; < 1 means magnified)
    vec3 sharpTex(sampler2D T, vec2 uv, float mag) {
      vec3 c = texture2D(T, uv).rgb;
      float px = 1.0 / 1024.0;
      vec3 n = texture2D(T, uv + vec2(px, 0.0)).rgb + texture2D(T, uv - vec2(px, 0.0)).rgb
             + texture2D(T, uv + vec2(0.0, px)).rgb + texture2D(T, uv - vec2(0.0, px)).rgb;
      return max(c + (c - n * 0.25) * 0.7 * smoothstep(1.3, 0.5, mag), 0.0);
    }

    float sdPoly(vec2 p, out float inside) {
      float d = 1e9; inside = 0.0;
      for (int i = 0; i < 7; i++) {
        vec2 a = uOut[i], b = uOut[i + 1], e = b - a, w = p - a;
        vec2 q = w - e * clamp(dot(w, e) / max(dot(e, e), 1e-6), 0.0, 1.0);
        d = min(d, dot(q, q));
        if ((a.y > p.y) != (b.y > p.y) && p.x < a.x + (p.y - a.y) * e.x / e.y) inside = 1.0 - inside;
      }
      return sqrt(d);
    }

    void main() {
      ${screen ? 'vec3 rd = normalize(uFwd + vNdc.x * uTan.x * uRight + vNdc.y * uTan.y * uUp);' : 'vec3 rd = normalize(uDirMat * (vW - cameraPosition));'}
      vec3 ro = uCamPos;
      // ray against the planet (centre at (0, 0, -RM)), written so nothing cancels near the ground
      float s = dot(ro, rd);
      float b = s + RM * rd.z;
      float c = dot(ro.xy, ro.xy) + ro.z * (ro.z + 2.0 * RM);
      float disc = b * b - c;
      float hitM = step(0.0, disc) * step(b, 0.0);
      float t = hitM > 0.5 ? c / (-b + sqrt(max(disc, 0.0))) : 0.0;
      vec3 p = ro + rd * t;                    // ground point, metres from home
      vec3 q = p + vec3(0.0, 0.0, RM);         // from the Earth's centre
      vec3 N = normalize(q);
      float fp = max(length(dFdx(p.xy)), length(dFdy(p.xy))) + 1e-3;   // metres per pixel
      // coverage at the silhouette (antialiased edge)
      float cov = hitM * clamp(0.5 + disc / (fwidth(disc) + 1.0), 0.0, 1.0);

      // geographic coordinates
      vec3 ecef = uE2C * N;
      float lat = asin(clamp(ecef.z, -1.0, 1.0)), lon = atan(ecef.y, ecef.x);
      float u1 = lon / 6.2831853 + 0.5, u2 = fract(lon / 6.2831853);
      float gu = fwidth(u1) <= fwidth(u2) + 1e-6 ? u1 : u2 + 0.5;   // no seam at the date line
      vec2 guv = vec2(gu, lat / 3.14159265 + 0.5);

      // Mercator offset from home: exact (for the big images) and local (precise near the house)
      float dl = lon - uLon0; dl -= 6.2831853 * floor((dl + 3.14159265) / 6.2831853);
      vec2 mg = vec2(RM * dl, RM * (log(tan(0.78539816 + lat * 0.5)) - uPsi0));
      vec2 ml = vec2(p.x * uK * (1.0 + p.y * uTanLat / RM), p.y * uK + p.y * p.y * uTanLat * uK / (2.0 * RM));

      vec3 gday = texture2D(uDay, guv).rgb;
      vec3 ground = gday;
      float wsum = 0.0;
      ${levels}

      // light: the globe has day and night, close up the photos are already lit
      float ndl = dot(N, uSun);
      float diff = smoothstep(-0.05, 0.6, ndl) * max(ndl, 0.0) * 0.6 + max(ndl, 0.0) * 0.6;
      vec3 col = ground * mix(0.035 + diff * 1.02, 1.0, uLocal) * uGain;
      col += texture2D(uNight, guv).rgb * vec3(1.0, 0.8, 0.55) * smoothstep(0.08, -0.2, ndl) * 1.4 * (1.0 - uLocal);
      float water = smoothstep(0.06, 0.0, gday.r - gday.b * 0.6) * (1.0 - wsum);
      col += vec3(1.0, 0.92, 0.8) * pow(max(dot(reflect(-uSun, N), -rd), 0.0), 60.0) * 0.55 * water * step(0.0, ndl) * (1.0 - uLocal);

      // clouds (clear sky around home, gone once we are low)
      float homeD = RM * acos(clamp(N.z, -1.0, 1.0));
      float cl = texture2D(uCloud, guv + vec2(uTime * 0.0012, 0.0)).r * uClouds * smoothstep(220e3, 900e3, homeD);
      col = mix(col * (1.0 - cl * 0.3), vec3(0.96, 0.97, 1.0) * (0.02 + max(ndl, 0.0) * 0.72), cl * 0.8);

      // wisps of cloud we fall through (a layer 3 km above home)
      if (uWisp > 0.001) {
        float tc = max((3000.0 - ro.z) / min(rd.z, -1e-3), 0.0);
        vec2 pc = ro.xy + rd.xy * tc;
        float dens = fbm(pc / 2400.0 + vec2(uTime * 0.02, 0.0));
        float wa = smoothstep(0.5, 0.78, dens) * smoothstep(700.0, 2600.0, length(pc)) * uWisp * step(3000.0, ro.z);
        col = mix(col, vec3(0.92, 0.94, 1.0) * (0.5 + 0.5 * dens), wa * 0.92);
      }

      // air: haze grows with the column of air below us and towards the limb
      float mu = max(dot(N, -rd), 0.0);
      float tau = 0.11 * (1.0 - exp(-uCamAlt / 8000.0)) / max(mu, 0.07);
      float lit = smoothstep(-0.15, 0.35, ndl);
      float tr = exp(-tau);
      col = col * tr + mix(uSky, vec3(0.8, 0.86, 1.0), 0.5) * (1.0 - tr) * lit * 0.5;
      col += uSky * pow(1.0 - mu, 5.0) * lit * 0.4 * (1.0 - uLocal);

      // home: a pink beacon from space, the glowing outline of the house up close
      float front = step(0.6, N.z);
      float dHome = length(p.xy);
      float beacon = exp(-pow(dHome / (fp * 5.0), 2.0)) * front;
      float rp = fract(uTime * 0.55);
      float ring = exp(-pow((dHome - fp * (5.0 + 26.0 * rp)) / (fp * 1.4), 2.0)) * (1.0 - rp) * front;
      col += uHomeCol * (beacon * 1.8 + ring * 0.9) * uMark;
      float inside;
      float dOut = sdPoly(p.xy, inside);
      float pulse = 0.75 + 0.25 * sin(uTime * 3.0);
      col *= mix(1.0, 0.42, smoothstep(26.0, 150.0, dHome) * uSpot);
      col += uHomeCol * (exp(-dOut / (fp * 1.8)) * 1.25 * pulse + inside * 0.06) * uPin;
      float rr = fract(uTime * 0.45);
      col += uHomeCol * exp(-pow((dHome - 14.0 - rr * 70.0) / (fp * 2.5 + 1.2), 2.0)) * (1.0 - rr) * 0.55 * uPin;

      // halo around the planet for rays that miss it
      float hmin = max(-disc, 0.0) / (sqrt(RM * RM + max(-disc, 0.0)) + RM);
      vec3 cpt = ro + vec3(0.0, 0.0, RM) - rd * b;
      float litc = smoothstep(-0.35, 0.4, dot(normalize(cpt), uSun));
      float g1 = exp(-hmin / 60000.0), g2 = exp(-hmin / 420000.0) * 0.26;
      vec3 halo = (uSky * g1 * 0.85 + mix(uSky, uHomeCol, 0.35) * g2) * litc * step(0.0, -b);

      vec3 outc = (col * cov + halo * (1.0 - cov)) * uExpo;
      gl_FragColor = vec4(outc * uOpacity, cov * uOpacity);
    }`;
}

export class Earth {
  /**
   * @param textures {day, night, clouds}
   * @param zoom     [{ tex, half }] for z1..z9 (half = half width on the ground in metres)
   * @param home     { lat, lon, outline: [[east, north], ...] } (outline in metres around the point)
   */
  constructor({ textures, zoom = [], home, radius = 1.9 }) {
    this.radius = radius;
    this.home = home;
    const lat = home.lat * DEG, lon = home.lon * DEG;
    this.E = new THREE.Vector3(-Math.sin(lon), Math.cos(lon), 0);
    this.N = new THREE.Vector3(-Math.sin(lat) * Math.cos(lon), -Math.sin(lat) * Math.sin(lon), Math.cos(lat));
    this.U = new THREE.Vector3(Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat));
    this.K = 1 / Math.cos(lat);
    this.zoom = zoom;
    this.zoomPx = zoom.map(z => (2 * z.half) / 1024);

    // group → axial tilt → spin; inside: Three's sphere convention (lon 0 → +X, 90°E → −Z, north → +Y)
    this.group = new THREE.Group();
    this.tilt = new THREE.Group(); this.tilt.rotation.z = -.41;
    this.spinNode = new THREE.Group();
    this.group.add(this.tilt); this.tilt.add(this.spinNode);
    this.spin = 2.2;

    [textures.day, textures.night, textures.clouds].forEach((tx, i) => {
      if (!tx) return;
      tx.wrapS = THREE.RepeatWrapping; tx.anisotropy = 8;
      if (i < 2) tx.colorSpace = THREE.SRGBColorSpace;
      tx.needsUpdate = true;
    });
    const outline = (home.outline || []).slice(0, 7).map(([e, n]) => new THREE.Vector2(e, n));
    while (outline.length < 7) outline.push(outline.length ? outline[outline.length - 1].clone() : new THREE.Vector2(1e5, 1e5));
    outline.push(outline[0].clone());

    const u = this.uniforms = {
      uCamPos: { value: new THREE.Vector3(0, 0, 1e8) }, uSun: { value: new THREE.Vector3(0, 0, 1) },
      uHomeCol: { value: new THREE.Color('#ff5fae') }, uSky: { value: new THREE.Color('#5d9bff') },
      uE2C: { value: new THREE.Matrix3().set(this.E.x, this.N.x, this.U.x, this.E.y, this.N.y, this.U.y, this.E.z, this.N.z, this.U.z) },
      uDirMat: { value: new THREE.Matrix3() },
      uRight: { value: new THREE.Vector3(1, 0, 0) }, uUp: { value: new THREE.Vector3(0, 1, 0) }, uFwd: { value: new THREE.Vector3(0, 0, -1) }, uTan: { value: new THREE.Vector2(1, 1) },
      uDay: { value: textures.day }, uNight: { value: textures.night }, uCloud: { value: textures.clouds },
      uZH: { value: Array.from({ length: LEVELS }, (_, i) => (zoom[i] ? zoom[i].half * this.K : 1)) },
      uZW: { value: new Array(LEVELS).fill(0) },
      uLon0: { value: lon }, uPsi0: { value: Math.log(Math.tan(Math.PI / 4 + lat / 2)) }, uK: { value: this.K }, uTanLat: { value: Math.tan(lat) },
      uCamAlt: { value: 1e8 }, uTime: { value: 0 }, uOpacity: { value: 0 }, uClouds: { value: 1 }, uLocal: { value: 0 },
      uMark: { value: 1 }, uPin: { value: 0 }, uSpot: { value: 0 }, uWisp: { value: 0 }, uGain: { value: 1 }, uExpo: { value: 1 },
      uOut: { value: outline }
    };
    for (let i = 0; i < LEVELS; i++) u['uZ' + i] = { value: zoom[i] ? zoom[i].tex : null };

    const blend = { transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor };
    this.meshMat = new THREE.ShaderMaterial({
      uniforms: u, ...blend,
      vertexShader: /* glsl */`varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: fragmentShader(false)
    });
    // bounding sphere for the planet + its glow, and an invisible sphere that writes the planet's depth
    this.shell = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.24, 96, 64), this.meshMat);
    this.shell.renderOrder = -1;
    this.depth = new THREE.Mesh(new THREE.SphereGeometry(radius * .995, 96, 64), new THREE.MeshBasicMaterial({ colorWrite: false }));
    this.depth.renderOrder = -2;
    this.hit = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.12, 16, 12), new THREE.MeshBasicMaterial({ visible: false }));
    this.spinNode.add(this.depth, this.shell, this.hit);

    // full-screen version for the dive, drawn over everything (add screenQuad to the scene)
    this.screenMat = new THREE.ShaderMaterial({
      uniforms: u, ...blend, depthTest: false,
      vertexShader: /* glsl */`varying vec2 vNdc; void main() { vNdc = position.xy; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
      fragmentShader: fragmentShader(true)
    });
    this.screenQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.screenMat);
    this.screenQuad.frustumCulled = false;
    this.screenQuad.renderOrder = 1000;
    this.screenQuad.visible = false;

    this.mode = 'mesh';
    this.light = new THREE.Vector3(.35, .8, .5).normalize();   // from above, where the heart shines
    this.W2E = new THREE.Matrix4(); this.E2W = new THREE.Matrix4();
    this.tmpM = new THREE.Matrix4(); this.tmpV = new THREE.Vector3(); this.tmpQ = new THREE.Quaternion(); this.tmp3 = new THREE.Matrix3();
    // constant part: object space → Earth-fixed (z north) → metres → east/north/up at home
    const s = RM / radius;
    this.objToEnu = new THREE.Matrix4().makeTranslation(0, 0, -RM)
      .multiply(new THREE.Matrix4().makeBasis(this.E, this.N, this.U).transpose())
      .multiply(new THREE.Matrix4().makeScale(s, s, s))
      .multiply(new THREE.Matrix4().makeBasis(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, -1, 0)));
    this.freeze = false;
    this.computeFrames();
  }

  setOpacity(o) { this.uniforms.uOpacity.value = o; this.shell.visible = this.depth.visible = o > .002 && this.mode === 'mesh'; }

  /** moves the Earth into another scene (solar system ↔ galaxy) */
  setParent(parent, { position, scale = 1, quadScene } = {}) {
    parent.add(this.group);
    if (position) this.group.position.copy(position);
    this.group.scale.setScalar(scale);
    if (quadScene) quadScene.add(this.screenQuad);
    this.computeFrames();
  }
  worldRadius() { return this.radius * this.group.scale.x; }
  setZoomTexture(i, tex) { this.uniforms['uZ' + i].value = tex; }

  /** world ↔ local (east/north/up, metres from home), from the current transforms */
  computeFrames() {
    this.spinNode.rotation.y = this.spin;
    this.group.updateMatrixWorld(true);
    const minv = this.tmpM.copy(this.spinNode.matrixWorld).invert();
    this.W2E.multiplyMatrices(this.objToEnu, minv);
    this.E2W.copy(this.W2E).invert();
    this.uniforms.uDirMat.value.setFromMatrix4(this.W2E).multiplyScalar(this.radius / RM);
    this.uniforms.uSun.value.copy(this.light).applyMatrix3(this.uniforms.uDirMat.value).normalize();
  }
  toEnu(v, out = new THREE.Vector3()) { return out.copy(v).applyMatrix4(this.W2E); }
  toWorld(v, out = new THREE.Vector3()) { return out.copy(v).applyMatrix4(this.E2W); }
  dirToWorld(v, out = new THREE.Vector3()) { return out.copy(v).applyMatrix3(this.tmp3.setFromMatrix4(this.E2W)).normalize(); }
  dirToEnu(v, out = new THREE.Vector3()) { return out.copy(v).applyMatrix3(this.uniforms.uDirMat.value).normalize(); }
  center(out = new THREE.Vector3()) { return this.spinNode.getWorldPosition(out); }
  /** world direction from the Earth's centre to home */
  homeDir(out = new THREE.Vector3()) { return this.toWorld(new THREE.Vector3(0, 0, 0), out).sub(this.center(this.tmpV)).normalize(); }

  /** spin angle that turns home towards a world direction */
  spinFacing(dir) {
    const parent = this.tilt.matrixWorld.clone().invert();
    const d = dir.clone().transformDirection(parent);
    const h = new THREE.Vector3(this.U.x, this.U.z, -this.U.y);    // home in object space
    return Math.atan2(d.x * h.z - d.z * h.x, d.x * h.x + d.z * h.z);
  }

  /** altitude-dependent look; call every frame */
  update(t, dt, camera, viewportH) {
    const u = this.uniforms;
    u.uTime.value = t;
    if (!this.freeze) { this.spin += dt * (Math.PI * 2 / 150); this.computeFrames(); }
    if (this.mode === 'mesh') {
      this.toEnu(camera.position, u.uCamPos.value);
    }
    const P = u.uCamPos.value;
    const alt = Math.hypot(P.x, P.y, P.z + RM) - RM;
    u.uCamAlt.value = alt;
    // which aerial images are needed: each one fades in once its parent would be magnified
    const dist = P.length();
    const mpp = dist * 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / Math.max(1, viewportH);
    let parentPx = 15000;
    for (let i = 0; i < LEVELS; i++) {
      const z = this.zoom[i];
      const k = THREE.MathUtils.clamp((parentPx * 1.3 - mpp) / (parentPx * .7), 0, 1);
      u.uZW.value[i] = z && z.tex && z.ready ? k * k * (3 - 2 * k) : 0;
      parentPx = this.zoomPx[i] || parentPx / 4;
    }
    const sm = (a, b, x) => { const k = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };
    u.uLocal.value = sm(400e3, 30e3, alt);
    u.uClouds.value = sm(140e3, 1100e3, alt);
    u.uMark.value = sm(2500, 9000, alt);
    u.uPin.value = sm(2200, 500, alt);
    u.uWisp.value = sm(26e3, 11e3, alt) * sm(2600, 4200, alt);
    u.uGain.value = 1 + .42 * u.uLocal.value;
    u.uExpo.value = .74 + .26 * sm(8 * RM, 3.5 * RM, alt);   // a little darker in the galaxy, where the bloom is strong
    return alt;
  }

  /** dive mode: draw the planet full-screen from a camera given in local metres */
  setScreenView(pos, right, up, fwd, camera) {
    const u = this.uniforms;
    u.uCamPos.value.copy(pos); u.uRight.value.copy(right); u.uUp.value.copy(up); u.uFwd.value.copy(fwd);
    const ty = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    u.uTan.value.set(ty * camera.aspect, ty);
  }
  setMode(mode) { this.mode = mode; this.screenQuad.visible = mode === 'screen'; this.shell.visible = this.depth.visible = mode === 'mesh' && this.uniforms.uOpacity.value > .002; }
}
