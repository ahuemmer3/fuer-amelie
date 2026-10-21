import * as THREE from 'three';
import { clamp, mono, smoother } from '../core/utils.js';
import { Sound } from '../core/audio.js';
import { RM } from '../scene/earth.js';

const smooth = (a, b, x) => { const k = clamp((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };
const wrap = a => a - Math.PI * 2 * Math.floor((a + Math.PI) / (Math.PI * 2));

const H1 = 2 * RM;          // altitude where the dive starts (the whole Earth in view)
const SWITCH = .3 * RM;     // below this (inside the bounding shell) the planet is drawn full-screen

/**
 * From space down to the roof of your house and back out again.
 * Phases: approach → descent → hold (heart pin) → ascent → back to the galaxy view.
 * In the intro our starship flies along: down in front of the camera, it lands at the house,
 * takes off again and finally flies into the heart.
 */
export class HomeZoom {
  constructor({ earth, camera, captionsEl, geoEl, pinEl, places = [], lines = [], intro = true, onScreen, onFade }) {
    Object.assign(this, { earth, camera, captionsEl, geoEl, pinEl, places, lines, intro, onScreen, onFade });
    this.T = intro ? { A: 1.9, D: 8.6, H: 3.8, U: 3, B: 2.8 } : { A: 1.6, D: 6.3, H: 2.8, U: 2.2, B: 1.5 };
    const D = this.T.D / 7.4, U = this.T.U / 2.2;
    this.hF = camera.aspect < .75 ? 215 : 150;
    const LF = Math.log10(this.hF), L1 = Math.log10(H1);
    this.descent = mono([[0, L1], [.9 * D, 6.92], [2 * D, 6.25], [3.2 * D, 5.2], [4.3 * D, 4.2], [5.3 * D, 3.35], [6.3 * D, 2.62], [7.4 * D, LF]]);
    this.ascent = mono([[0, Math.log10(this.hF * .92)], [.45 * U, 2.55], [1 * U, 4], [1.6 * U, 6], [this.T.U, L1]]);
    this.t = -1; this.done = false; this.screen = false; this.events = {};
    this.v = { p: new THREE.Vector3(), r: new THREE.Vector3(), u: new THREE.Vector3(), f: new THREE.Vector3() };
    this.m4 = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.q2 = new THREE.Quaternion();
    this.placeAt = -1; this.lastHud = '';
    this.tmp = new THREE.Vector3(); this.tmp2 = new THREE.Vector3(); this.tmp3 = new THREE.Vector3();
  }

  /**
   * look: where the camera looks now; back: { pos, target } to fly to at the end;
   * ship (intro): { ship, vel, scale, light, heart } – the starship, its velocity, scale, a light that follows the camera, the heart's position
   */
  start({ look, back, ship = null }) {
    const e = this.earth, cam = this.camera;
    this.t = 0;
    e.freeze = true;
    this.c = e.center();
    this.p0 = cam.position.clone();
    this.look0 = look.clone();
    this.back = { pos: back.pos.clone(), target: back.target.clone() };
    this.dir0 = this.p0.clone().sub(this.c).normalize();
    this.d0 = this.p0.distanceTo(this.c);
    this.d1 = e.worldRadius() * (1 + H1 / RM);
    // turn the Earth so that home faces us, a little from above and in the light
    const want = this.dir0.clone().add(new THREE.Vector3(0, .45, 0)).addScaledVector(e.light, .9).normalize();
    this.spin0 = e.spin;
    this.spin1 = this.spin0 + wrap(e.spinFacing(want) - this.spin0);
    if (this.geoEl) { this.geoEl.hidden = false; this.geoEl.classList.remove('out'); }
    if (ship) {
      this.sh = { ...ship, p: ship.ship.group.position.clone(), q: ship.ship.group.quaternion.clone(), vel: ship.vel.clone() };
      this.sh.dist = cam.aspect < .75 ? 6.2 : 4.4;
    }
  }

  caption(text, dur = 4.6) {
    const el = this.captionsEl;
    if (!el || !text) return;
    el.classList.remove('in', 'big'); void el.offsetWidth;
    el.textContent = text; el.style.setProperty('--dur', dur + 's');
    el.classList.toggle('big', text.includes('&')); el.classList.add('in');
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
      // 1 · approach, the Earth turns home towards us
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
      const alt = Math.max(0, (dist / e.worldRadius() - 1) * RM);
      this.hud(alt);
      if (this.intro && this.fire('cap0')) this.caption(this.lines[0]);
      this.shipUpdate('approach', t, dt, alt);
      return null;
    }
    if (this.psi0 === undefined) { this.psi0 = 0; this.psiF = -.5; }

    let alt, phase, ps;
    if (t < A + D) {
      // 2 · straight down, faster and faster through the powers of ten, then gently onto the house
      const s = t - A;
      if (this.intro && s > .3 && this.fire('cap1')) this.caption(this.lines[1]);
      const rho = Math.pow(10, this.descent(s));
      const psi = this.psi0 + (this.psiF - this.psi0) * smoother(s / D);
      const alpha = .62 * smoother((s - .72 * D) / (.28 * D));
      this.pose(psi, alpha, rho);
      alt = this.v.p.z; phase = 'descent'; ps = s;
    } else if (t < A + D + H) {
      // 3 · above the roof: the heart pin drops, a slow orbit
      const s = t - A - D;
      if (this.fire('touch')) { event = 'touch'; this.showPin(true); }
      this.pose(this.psiF + s * .07, .62, this.hF * (1 - .08 * smoother(s / H)));
      alt = this.v.p.z; phase = 'hold'; ps = s;
      e.uniforms.uSpot.value = smooth(0, .8, s) * (1 - smooth(H - .5, H, s));
    } else if (t < A + D + H + U) {
      // 4 · back up, much faster
      const s = t - A - D - H;
      if (this.fire('up')) { event = 'up'; this.showPin(false); e.uniforms.uSpot.value = 0; }
      const rho = Math.pow(10, this.ascent(s));
      this.pose(this.psiF + H * .07 + .5 * smoother(s / U), .62 * (1 - smoother(s / .9)), rho);
      alt = this.v.p.z; phase = 'ascent'; ps = s;
    } else {
      // 5 · out into the galaxy and back to where we started
      const s = t - A - D - H - U, k = smoother(s / B);
      if (this.fire('back')) {
        this.pose(this.psiF + H * .07 + .5, 0, H1); this.apply(H1);
        this.c = e.center();
        this.d1 = e.worldRadius() * (1 + H1 / RM);
        this.q1 = cam.quaternion.clone();
        this.dir1 = cam.position.clone().sub(this.c).normalize();
        this.dirH = this.back.pos.clone().sub(this.c).normalize();
        this.dH = this.back.pos.distanceTo(this.c);
        e.freeze = false;
        if (this.intro) this.caption(this.lines[2]);
        if (this.geoEl) this.geoEl.classList.add('out');
        Sound.wind(false);
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
      this.shipUpdate('back', s, dt, 0);
      if (s >= B && this.fire('arrive')) { event = 'arrive'; this.finish(); }
      return event;
    }
    this.apply(alt);
    this.hud(alt);
    // the wind roars while we fall through the air
    Sound.wind(alt < 90e3 && alt > 1800);
    this.shipUpdate(phase, ps, dt, alt);
    return event;
  }

  /* ------------------------------------------------ the starship flies along (intro) */
  /** puts the ship at a pose given in camera space: position, forward and up directions */
  shipAtCam(px, py, pz, fx, fy, fz, roll = 0) {
    const cam = this.camera, sh = this.sh;
    sh.camPos = sh.camPos || new THREE.Vector3();
    sh.camPos.set(px, py, pz).applyMatrix4(cam.matrixWorld);
    const fw = this.tmp.set(fx, fy, fz).normalize().transformDirection(cam.matrixWorld);
    const up = this.tmp2.set(-Math.sin(roll), Math.cos(roll), 0).transformDirection(cam.matrixWorld);
    const x = this.tmp3.crossVectors(up, fw).normalize();
    up.crossVectors(fw, x);
    sh.camQ = sh.camQ || new THREE.Quaternion();
    sh.camQ.setFromRotationMatrix(this.m4.makeBasis(x, up, fw));
  }

  shipUpdate(phase, s, dt, alt) {
    const sh = this.sh;
    if (!sh) return;
    const cam = this.camera, ship = sh.ship, g = ship.group, d = sh.dist, t = this.t, { A, D, U, B } = this.T;
    const sway = Math.sin(t * 1.1) * .16, bob = Math.sin(t * 1.7) * .07, roll = Math.sin(t * .9) * .16;
    let thrust = 1, level = .85, pitch = .6, look = null, wave = 0, drift = null, visible = true;
    const camZ = this.tmp.setFromMatrixColumn(cam.matrixWorld, 2).clone();   // points from the screen towards us
    if (phase === 'approach') {
      // from the free flight into formation in front of the camera
      const home = this.earth.toWorld(this.tmp2.set(0, 0, 0), new THREE.Vector3());
      sh.vel.lerp(home.sub(sh.p).normalize().multiplyScalar(sh.vel.length() + 30 * dt), Math.min(1, dt * 2));
      sh.p.addScaledVector(sh.vel, dt);
      this.m4.lookAt(sh.p.clone().add(sh.vel), sh.p, new THREE.Vector3(0, 1, 0));
      const free = new THREE.Quaternion().setFromRotationMatrix(this.m4);
      sh.q.copy(free);
      this.shipAtCam(sway, -.36 + bob, -d, 0, -.12, -1, roll);
      const w = smoother((s - .2) / (A - .2));
      g.position.lerpVectors(sh.p, sh.camPos, w);
      g.quaternion.copy(free).slerp(sh.camQ, w);
      pitch = .7;
    } else if (phase === 'descent') {
      // in formation, nose down towards the ground; in the end it flies ahead and lands at the house
      const land = smoother((s - (D - 1.8)) / 1.8);
      this.shipAtCam(sway * (1 - land), (-.36 + bob) * (1 - land), -d * (1 + 13 * land * land), 0, -.12 * (1 - land), -1, roll * (1 - land));
      g.position.copy(sh.camPos); g.quaternion.copy(sh.camQ);
      drift = camZ.multiplyScalar(7 * (1 - land));
      pitch = .55 + .35 * smooth(D * .2, D * .6, s) - .4 * land;
      thrust = 1 - .5 * land; level = .9 * (1 - .8 * land);
      visible = land < .995;
      if (land >= .995 && this.fire('land')) Sound.shipTouch(false);
    } else if (phase === 'hold') {
      visible = false; level = 0;
    } else if (phase === 'ascent') {
      // takes off from the roof, comes up to us and climbs with us, the two of you wave
      if (this.fire('lift')) Sound.shipTouch(true);
      const k = smoother(s / 1.5), far = 1 - k;
      this.shipAtCam(.2 * k + sway * .4 * k, (-.22 + bob * .6) * k, -d * (.78 + 13 * far * far), 0, .3, 1, -roll * k * .6);
      g.position.copy(sh.camPos); g.quaternion.copy(sh.camQ);
      drift = camZ.multiplyScalar(-6);
      look = cam.position; wave = smooth(.9, 1.4, s) * (1 - smooth(U - .5, U, s));
      thrust = .6 + .4 * k; level = .25 + .65 * k; pitch = .45 + .4 * k;
    } else if (phase === 'back') {
      // out into the galaxy and straight into the heart
      if (!sh.backFrom) { sh.backFrom = g.position.clone(); sh.backQ = g.quaternion.clone(); }
      const k = smoother(s / (B * .92));
      const heart = sh.heart;
      const mid = sh.backFrom.clone().lerp(heart, .5).add(new THREE.Vector3(0, 3, 0));
      const a = sh.backFrom, p = new THREE.Vector3().copy(a).multiplyScalar((1 - k) * (1 - k)).addScaledVector(mid, 2 * (1 - k) * k).addScaledVector(heart, k * k);
      const tan = mid.clone().sub(a).multiplyScalar(2 * (1 - k)).addScaledVector(heart.clone().sub(mid), 2 * k);
      g.position.copy(p);
      this.m4.lookAt(p.clone().add(tan), p, new THREE.Vector3(0, 1, 0));
      g.quaternion.copy(sh.backQ).slerp(new THREE.Quaternion().setFromRotationMatrix(this.m4), smooth(0, .35, k));
      ship.setScale(sh.scale * (1 - .85 * smooth(.6, 1, k)));
      visible = k < .97;
      level = clamp(3 / Math.max(.1, cam.position.distanceTo(p)), 0, 1) * (1 - smooth(.8, 1, k)); pitch = .8;
    }
    g.visible = visible;
    ship.update(t, dt, { thrust, look, wave, drift, sparkle: visible ? 1 : 0, pixelRatio: sh.pixelRatio || 1 });
    // light from the upper left of the camera
    if (sh.light) {
      sh.light.position.copy(this.tmp2.set(-4, 5, 3).applyMatrix4(cam.matrixWorld));
      sh.light.target.position.copy(g.position); sh.light.target.updateMatrixWorld();
    }
    const ndc = this.tmp2.copy(g.position).project(cam);
    Sound.setEngine(visible ? level : 0, pitch, ndc.z < 1 ? clamp(ndc.x * .7, -1, 1) : 0);
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
    Sound.wind(false);
    if (this.sh) { this.sh.ship.group.visible = false; Sound.engineStop(1.4); }
  }
}
