import * as THREE from 'three';

const NOISE = /* glsl */`
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }
`;

export class BlackHole {
  constructor({ radius = 1, colors, steps = 0 }) {
    this.radius = radius;
    this.group = new THREE.Group();

    // event horizon
    this.horizon = new THREE.Mesh(new THREE.SphereGeometry(radius, 48, 32), new THREE.MeshBasicMaterial({ color: 0x000000 }));
    this.group.add(this.horizon);

    // accretion disk
    const inner = radius * 1.32, outer = radius * 3.8;
    this.diskMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 }, uPulse: { value: 0 }, uOpacity: { value: 0 },
        uInner: { value: inner }, uOuter: { value: outer },
        uColIn: { value: new THREE.Color('#fff4fa') },
        uColMid: { value: new THREE.Color(colors.herz2) },
        uColOut: { value: new THREE.Color(colors.galaxieAussen) }
      },
      vertexShader: /* glsl */`
        varying vec3 vWorld; varying vec2 vPos;
        void main() {
          vPos = position.xy;
          vec4 w = modelMatrix * vec4(position, 1.0);
          vWorld = w.xyz;
          gl_Position = projectionMatrix * viewMatrix * w;
        }`,
      fragmentShader: /* glsl */`
        uniform float uTime, uPulse, uOpacity, uInner, uOuter;
        uniform vec3 uColIn, uColMid, uColOut;
        varying vec3 vWorld; varying vec2 vPos;
        ${NOISE}
        void main() {
          float r = length(vPos);
          float t = clamp((r - uInner) / (uOuter - uInner), 0.0, 1.0);
          float ang = atan(vPos.y, vPos.x);
          float a2 = ang + uTime * (1.4 / (0.35 + t)) - t * 3.0;
          vec2 q = vec2(cos(a2), sin(a2)) * (1.5 + t * 5.0);
          float n = fbm(q + vec2(t * 3.0, uTime * 0.05));
          float streak = smoothstep(0.25, 0.85, n);
          float profile = smoothstep(0.0, 0.06, t) * pow(1.0 - t, 1.5);
          vec3 col = mix(uColIn, uColMid, smoothstep(0.0, 0.35, t));
          col = mix(col, uColOut, smoothstep(0.35, 1.0, t));
          vec3 tang = normalize(vec3(-vWorld.z, 0.0, vWorld.x));
          float dop = dot(tang, normalize(cameraPosition - vWorld));
          float beam = 1.0 + 0.6 * dop;
          float b = profile * (0.3 + 1.1 * streak) * beam * (1.0 + uPulse * 0.7);
          b += exp(-t * 14.0) * 1.4;
          gl_FragColor = vec4(col * b * 1.1, clamp(b, 0.0, 1.0) * uOpacity);
        }`,
      transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending
    });
    this.disk = new THREE.Mesh(new THREE.RingGeometry(inner, outer, 192, 6), this.diskMat);
    this.disk.rotation.x = -Math.PI / 2;
    this.group.add(this.disk);

    // camera-facing photon ring + lensed arc (fakes the light bent around the hole)
    this.haloMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uPulse: { value: 0 }, uRadius: { value: radius }, uOpacity: { value: 0 }, uCol: { value: new THREE.Color(colors.herz2) } },
      vertexShader: /* glsl */`
        varying vec2 vP;
        void main() {
          vec3 center = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
          vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
          vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
          vec3 wp = center + right * position.x + up * position.y;
          vP = position.xy;
          gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
        }`,
      fragmentShader: /* glsl */`
        uniform float uTime, uPulse, uRadius, uOpacity;
        uniform vec3 uCol;
        varying vec2 vP;
        void main() {
          float r = length(vP) / uRadius;
          if (r < 0.985) discard;
          float ang = atan(vP.y, vP.x);
          float photon = exp(-pow((r - 1.04) / 0.03, 2.0)) * (1.2 + 0.4 * sin(ang * 3.0 - uTime * 2.0));
          float arcMask = smoothstep(-0.1, 0.7, vP.y / max(length(vP), 1e-3));
          float arc = exp(-pow((r - 1.22) / 0.13, 2.0)) * (0.35 + 0.9 * arcMask) * (0.85 + 0.15 * sin(ang * 8.0 + uTime * 3.0));
          float glow = 0.22 / (1.0 + pow((r - 1.0) * 3.4, 2.0));
          vec3 col = vec3(1.0, 0.93, 0.97) * photon + mix(uCol, vec3(1.0, 0.85, 0.92), 0.4) * arc + uCol * glow * 0.6;
          col *= (1.0 + uPulse * 0.8);
          float a = clamp(photon + arc + glow, 0.0, 1.0) * uOpacity;
          gl_FragColor = vec4(col, a);
        }`,
      transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending
    });
    this.halo = new THREE.Mesh(new THREE.PlaneGeometry(radius * 6, radius * 6), this.haloMat);
    this.halo.renderOrder = 5;
    this.halo.frustumCulled = false;
    this.group.add(this.halo);

    // invisible, larger target for long-press detection
    this.hit = new THREE.Mesh(new THREE.SphereGeometry(radius * 2.2, 12, 8), new THREE.MeshBasicMaterial({ visible: false }));
    this.group.add(this.hit);

    // "Gargantua": ray-marched light bending around the hole (Schwarzschild photon paths)
    this.gargantua = null;
    if (steps > 0) {
      const rs = radius * .58, bound = rs * 6.8;
      this.gMat = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 }, uPulse: { value: 0 }, uOpacity: { value: 0 }, uInv: { value: new THREE.Matrix4() },
          uRs: { value: rs }, uBound: { value: 6.8 }, uIn: { value: 2.3 }, uOut: { value: 6.4 },
          uHot: { value: new THREE.Color('#fff2f6') }, uMid: { value: new THREE.Color(colors.herz2) }, uOuter: { value: new THREE.Color(colors.galaxieAussen) }
        },
        vertexShader: /* glsl */`varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
        fragmentShader: /* glsl */`
          uniform float uTime, uPulse, uOpacity, uRs, uBound, uIn, uOut; uniform mat4 uInv; uniform vec3 uHot, uMid, uOuter;
          varying vec3 vW;
          ${NOISE}
          void main() {
            // ray in the black hole's local frame, in units of the horizon radius
            vec3 ro = (uInv * vec4(cameraPosition, 1.0)).xyz / uRs;
            vec3 rd = normalize((uInv * vec4(vW, 1.0)).xyz / uRs - ro);
            float b = dot(ro, rd), c = dot(ro, ro) - uBound * uBound, disc = b * b - c;
            if (disc < 0.0) discard;
            vec3 p = ro + rd * max(-b - sqrt(disc), 0.0), v = rd;
            float h2 = dot(cross(p, v), cross(p, v));
            vec3 col = vec3(0.0); float alpha = 0.0;
            for (int i = 0; i < ${steps}; i++) {
              float r2 = dot(p, p), r = sqrt(r2);
              if (r < 1.0) { alpha = 1.0; break; }
              float dt = clamp(0.09 * r, 0.025, 0.45);
              vec3 prev = p;
              v += -1.5 * h2 * p / (r2 * r2 * r) * dt;
              p += v * dt;
              if (prev.y * p.y < 0.0) {
                vec3 q = mix(prev, p, prev.y / (prev.y - p.y));
                float rq = length(q.xz);
                if (rq > uIn && rq < uOut) {
                  float t = (rq - uIn) / (uOut - uIn);
                  float ang = atan(q.z, q.x) + uTime * (0.9 / (0.4 + t)) - t * 2.5;
                  float n = fbm(vec2(cos(ang), sin(ang)) * (1.6 + t * 4.0) + vec2(t * 3.0, uTime * 0.05));
                  float dens = smoothstep(0.0, 0.05, t) * pow(1.0 - t, 1.6) * (0.45 + 1.0 * smoothstep(0.25, 0.85, n));
                  vec3 vel = normalize(vec3(-q.z, 0.0, q.x));
                  float dop = clamp(1.0 + 0.75 * dot(vel, -normalize(v)), 0.25, 2.2);
                  vec3 dc = mix(uHot, uMid, smoothstep(0.0, 0.4, t));
                  dc = mix(dc, uOuter, smoothstep(0.4, 1.0, t)) * dens * dop * (1.05 + uPulse * 0.5);
                  float a = clamp(dens * 1.1, 0.0, 1.0);
                  col += dc * (1.0 - alpha); alpha += a * (1.0 - alpha);
                  if (alpha > 0.97) break;
                }
              }
              if (r > uBound + 0.02 && dot(p, v) > 0.0) break;
            }
            // thin photon ring where rays graze the photon sphere
            float bImpact = sqrt(h2);
            col += uHot * exp(-pow((bImpact - 2.6) / 0.05, 2.0)) * 0.6 * (1.0 - alpha);
            gl_FragColor = vec4(col * uOpacity, alpha * uOpacity);
          }`,
        transparent: true, depthWrite: false,
        blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor
      });
      this.gargantua = new THREE.Mesh(new THREE.SphereGeometry(bound, 48, 32), this.gMat);
      this.gargantua.renderOrder = 6;
      this.group.add(this.gargantua);
      this.disk.visible = false; this.halo.visible = false; this.horizon.visible = false;
    }
  }

  setOpacity(o) {
    this.diskMat.uniforms.uOpacity.value = o; this.haloMat.uniforms.uOpacity.value = o;
    if (this.gMat) this.gMat.uniforms.uOpacity.value = o;
  }
  update(t, pulse) {
    this.diskMat.uniforms.uTime.value = t;
    this.diskMat.uniforms.uPulse.value = pulse;
    this.haloMat.uniforms.uTime.value = t;
    this.haloMat.uniforms.uPulse.value = pulse;
    if (this.gMat) {
      this.gMat.uniforms.uTime.value = t;
      this.gMat.uniforms.uPulse.value = pulse;
      this.group.updateMatrixWorld();
      this.gMat.uniforms.uInv.value.copy(this.group.matrixWorld).invert();
    }
  }
}
