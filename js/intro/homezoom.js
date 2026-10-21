import * as THREE from 'three';
import { clamp } from '../core/utils.js';
import { RM } from '../scene/earth.js';

/** monotone cubic through [t, value] keys, flat at both ends (no overshoot) */
function mono(keys) {
  const n = keys.length, x = keys.map(k => k[0]), y = keys.map(k => k[1]);
  const d = [], m = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) d[i] = (y[i + 1] - y[i]) / (x[i + 1] - x[i]);
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
    if (s > 9) { const k = 3 / Math.sqrt(s); m[i] = k * a * d[i]; m[i + 1] = k * b * d[i]; }
  }
  return t => {
    if (t <= x[0]) return y[0];
    if (t >= x[n - 1]) return y[n - 1];
    let i = 0; while (t > x[i + 1]) i++;
    const h = x[i + 1] - x[i], s = (t - x[i]) / h, s2 = s * s, s3 = s2 * s;
    return (2 * s3 - 3 * s2 + 1) * y[i] + (s3 - 2 * s2 + s) * h * m[i] + (-2 * s3 + 3 * s2) * y[i + 1] + (s3 - s2) * h * m[i + 1];
  };
}
const smooth = (a, b, x) => { const k = clamp((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };
const smoother = k => { k = clamp(k, 0, 1); return k * k * k * (k * (k * 6 - 15) + 10); };
const wrap = a => a - Math.PI * 2 * Math.floor((a + Math.PI) / (Math.PI * 2));

const H1 = 2 * RM;          // altitude where the dive starts (the whole Earth in view)
const SWITCH = .3 * RM;     // below this (inside the bounding shell) the planet is drawn full-screen

/**
 * From the galaxy down to the roof of your house and back out again.
 * Phases: approach (galaxy) → descent → hold (heart pin) → ascent → back to the galaxy view.
 */
export class HomeZoom {
  constructor({ earth, camera, captionsEl, geoEl, pinEl, places = [], lines = [], intro = true, onScreen, onFade }) {
    Object.assign(this, { earth, camera, captionsEl, geoEl, pinEl, places, lines, intro, onScreen, onFade });
    const k = intro ? 1 : .85;
    this.T = { A: 1.9 * k, D: 7.4 * k, H: 2.8, U: 2.2, B: 1.8 * k };
    const D = this.T.D / 7.4;
    this.hF = camera.aspect < .75 ? 215 : 150;
    const LF = Math.log10(this.hF), L1 = Math.log10(H1);
    this.descent = mono([[0, L1], [.9 * D, 6.92], [2 * D, 6.25], [3.2 * D, 5.2], [4.3 * D, 4.2], [5.3 * D, 3.35], [6.3 * D, 2.62], [7.4 * D, LF]]);
    this.ascent = mono([[0, Math.log10(this.hF * .92)], [.45, 2.55], [1, 4], [1.6, 6], [this.T.U, L1]]);
    this.t = -1; this.done = false; this.screen = false; this.events = {};
    this.v = { p: new THREE.Vector3(), r: new THREE.Vector3(), u: new THREE.Vector3(), f: new THREE.Vector3() };
    this.m4 = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.q2 = new THREE.Quaternion();
    this.placeAt = -1; this.lastHud = '';
  }

  /** from: the current camera pose; back: { pos, target } to fly to at the end */
  start({ look, back }) {
    const e = this.earth, cam = this.camera;
    this.t = 0;
    e.freeze = true;
    this.c = e.center();
    this.p0 = cam.position.clone();
    this.look0 = look.clone();
    this.back = { pos: back.pos.clone(), target: back.target.clone() };
    this.dir0 = this.p0.clone().sub(this.c).normalize();
    this.d0 = this.p0.distanceTo(this.c);
    this.d1 = e.radius * (1 + H1 / RM);
    // turn the Earth so that home faces us, a little from above and in the light
    const want = this.dir0.clone().add(new THREE.Vector3(0, .45, 0)).normalize();
    this.spin0 = e.spin;
    this.spin1 = this.spin0 + wrap(e.spinFacing(want) - this.spin0);
    if (this.geoEl) { this.geoEl.hidden = false; this.geoEl.classList.remove('out'); }
  }

  caption(text, big = false) {
    const el = this.captionsEl;
    if (!el || !text) return;
    el.classList.remove('in', 'big'); void el.offsetWidth;
    el.textContent = text; el.classList.toggle('big', big); el.classList.add('in');
  }

  /** places the camera from a pose in local metres (pos, heading psi, tilt alpha, distance rho) */
  pose(psi, alpha, rho) {
    const { p, r, u, f } = this.v;
    const hx = Math.sin(psi), hy = Math.cos(psi);
    const sa = Math.sin(alpha), ca = Math.cos(alpha);
    p.set(-hx * rho * sa, -hy * rho * sa, rho * ca);
    f.set(hx * sa, hy * sa, -ca);
    u.set(hx * ca, hy * ca, sa);
    r.set(hy, -hx, 0);
    return this.v;
  }

  apply(alt) {
    const e = this.earth, cam = this.camera, { p, r, u, f } = this.v;
    const screen = alt < SWITCH;
    if (screen !== this.screen) { this.screen = screen; e.setMode(screen ? 'screen' : 'mesh'); this.onScreen && this.onScreen(screen); }
    if (screen) e.setScreenView(p, r, u, f, cam);
    else {
      e.toWorld(p, cam.position);
      const rw = e.dirToWorld(r, new THREE.Vector3()), uw = e.dirToWorld(u, new THREE.Vector3()), bw = e.dirToWorld(f, new THREE.Vector3()).negate();
      cam.quaternion.setFromRotationMatrix(this.m4.makeBasis(rw, uw, bw));
      cam.updateMatrixWorld();
    }
  }

  hud(alt) {
    if (!this.geoEl) return;
    let place = '';
    for (const [km, name] of this.places) if (alt < km * 1000) place = name;
    const dec = clamp(Math.round(Math.log10(1e7 / Math.max(alt, 1))), 1, 5);
    const h = this.earth.home;
    const altTxt = alt >= 1000 ? `${Math.round(alt / 1000).toLocaleString('de-DE')} km` : `${Math.round(alt)} m`;
    const line = `${h.lat.toFixed(dec).replace('.', ',')}° N · ${h.lon.toFixed(dec).replace('.', ',')}° O · Höhe ${altTxt}`;
    if (line !== this.lastHud) { this.lastHud = line; this.geoEl.querySelector('.geo-coords').textContent = line; }
    if (place !== this.place) {
      this.place = place;
      const el = this.geoEl.querySelector('.geo-place');
      el.classList.remove('in'); void el.offsetWidth;
      el.textContent = place; if (place) el.classList.add('in');
    }
  }

  fire(name) { if (this.events[name]) return false; this.events[name] = true; return true; }

  /** returns 'touch' | 'up' | 'arrive' once each */
  update(dt) {
    if (this.t < 0 || this.done) return null;
    this.t += dt;
    const { A, D, H, U, B } = this.T, e = this.earth, cam = this.camera, t = this.t;
    let event = null;

    if (t < A) {
      // 1 · approach in the galaxy, the Earth turns home towards us
      const k = smoother(t / A);
      e.spin = this.spin0 + (this.spin1 - this.spin0) * smoother(t / (A * .85));
      e.computeFrames();
      const hd = e.homeDir();
      this.q.setFromUnitVectors(this.dir0, hd);
      this.q2.identity().slerp(this.q, k);
      const dist = this.d0 * Math.pow(this.d1 / this.d0, k);
      cam.position.copy(this.dir0).applyQuaternion(this.q2).multiplyScalar(dist).add(this.c);
      cam.lookAt(this.look0.clone().lerp(this.c, smoother(t / (A * .8))));
      cam.updateMatrixWorld();
      this.onFade && this.onFade(1 - smooth(0, .7, t / A));
      if (t + dt >= A) {
        const uw = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 1);
        const ue = e.dirToEnu(uw);
        this.psi0 = Math.atan2(ue.x, ue.y);
        this.psiF = this.psi0 + wrap(-.5 - this.psi0);
      }
      this.hud(Math.max(0, (dist / e.radius - 1) * RM));
      if (this.intro && this.fire('cap0')) this.caption(this.lines[0]);
      return null;
    }
    if (this.psi0 === undefined) { this.psi0 = 0; this.psiF = -.5; }

    let alt;
    if (t < A + D) {
      // 2 · straight down, faster and faster through the powers of ten, then gently onto the house
      const s = t - A;
      if (this.intro && s > .3 && this.fire('cap1')) this.caption(this.lines[1]);
      const rho = Math.pow(10, this.descent(s));
      const psi = this.psi0 + (this.psiF - this.psi0) * smoother(s / D);
      const alpha = .62 * smoother((s - .72 * D) / (.28 * D));
      this.pose(psi, alpha, rho);
      alt = this.v.p.z;
    } else if (t < A + D + H) {
      // 3 · above the roof: the heart pin drops, a slow orbit
      const s = t - A - D;
      if (this.fire('touch')) { event = 'touch'; this.showPin(true); }
      this.pose(this.psiF + s * .07, .62, this.hF * (1 - .08 * smoother(s / H)));
      alt = this.v.p.z;
      e.uniforms.uSpot.value = smooth(0, .8, s) * (1 - smooth(H - .5, H, s));
    } else if (t < A + D + H + U) {
      // 4 · back up, much faster
      const s = t - A - D - H;
      if (this.fire('up')) { event = 'up'; this.showPin(false); e.uniforms.uSpot.value = 0; }
      const rho = Math.pow(10, this.ascent(s));
      this.pose(this.psiF + H * .07 + .5 * smoother(s / U), .62 * (1 - smoother(s / .9)), rho);
      alt = this.v.p.z;
    } else {
      // 5 · out into the galaxy and back to where we started
      const s = t - A - D - H - U, k = smoother(s / B);
      if (this.fire('back')) {
        this.pose(this.psiF + H * .07 + .5, 0, H1); this.apply(H1);
        this.q1 = cam.quaternion.clone();
        this.dir1 = cam.position.clone().sub(this.c).normalize();
        this.dirH = this.back.pos.clone().sub(this.c).normalize();
        this.dH = this.back.pos.distanceTo(this.c);
        e.freeze = false;
        if (this.intro) this.caption(this.lines[2]);
        if (this.geoEl) this.geoEl.classList.add('out');
      }
      this.q.setFromUnitVectors(this.dir1, this.dirH);
      this.q2.identity().slerp(this.q, k);
      cam.position.copy(this.dir1).applyQuaternion(this.q2).multiplyScalar(this.d1 * Math.pow(this.dH / this.d1, k)).add(this.c);
      const tgt = this.c.clone().lerp(this.back.target, smoother(s / (B * .9)));
      this.m4.lookAt(cam.position, tgt, cam.up);
      const look = new THREE.Quaternion().setFromRotationMatrix(this.m4);
      cam.quaternion.copy(this.q1).slerp(look, smooth(0, .55, k));
      cam.updateMatrixWorld();
      this.onFade && this.onFade(smooth(.25, 1, k));
      if (s >= B && this.fire('arrive')) { event = 'arrive'; this.finish(); }
      return event;
    }
    this.apply(alt);
    this.hud(alt);
    return event;
  }

  showPin(on) {
    const el = this.pinEl;
    if (!el) return;
    if (on) { el.hidden = false; el.classList.remove('out'); void el.offsetWidth; el.classList.add('show'); }
    else { el.classList.remove('show'); el.classList.add('out'); setTimeout(() => { if (!el.classList.contains('show')) el.hidden = true; }, 700); }
  }

  /** ends the zoom immediately (skip) or after the flight back */
  finish() {
    if (this.done) return;
    this.done = true;
    const e = this.earth;
    e.freeze = false;
    e.uniforms.uSpot.value = 0;
    if (this.screen) { this.screen = false; e.setMode('mesh'); this.onScreen && this.onScreen(false); }
    this.showPin(false);
    if (this.geoEl) { this.geoEl.classList.add('out'); setTimeout(() => { this.geoEl.hidden = true; }, 900); }
    this.onFade && this.onFade(1);
  }
}
