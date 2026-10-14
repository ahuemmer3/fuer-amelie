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
  constructor({ radius = 1, colors }) {
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
  }

  setOpacity(o) { this.diskMat.uniforms.uOpacity.value = o; this.haloMat.uniforms.uOpacity.value = o; }
  update(t, pulse) {
    this.diskMat.uniforms.uTime.value = t;
    this.diskMat.uniforms.uPulse.value = pulse;
    this.haloMat.uniforms.uTime.value = t;
    this.haloMat.uniforms.uPulse.value = pulse;
  }
}
