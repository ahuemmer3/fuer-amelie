import * as THREE from 'three';
import { rand, pick } from '../core/utils.js';

const EMOJIS = ['💖', '💕', '✨', '💗', '🌸', '💫', '🥰', '💞', '⭐', '🫶'];

function emojiTexture(ch) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '96px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  g.shadowColor = 'rgba(255,120,190,.9)'; g.shadowBlur = 18;
  g.fillText(ch, 64, 70);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function heartTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 60, 4, 64, 64, 60);
  grd.addColorStop(0, '#fff'); grd.addColorStop(.35, '#ff9fc6'); grd.addColorStop(1, '#ff2f6d');
  g.shadowColor = '#ff4fa3'; g.shadowBlur = 20; g.fillStyle = grd;
  g.beginPath(); g.moveTo(64, 104); g.bezierCurveTo(4, 70, 18, 14, 64, 38); g.bezierCurveTo(110, 14, 124, 70, 64, 104); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Little hearts and emojis drifting up through the galaxy, plus a heart rain for the easter egg. */
export class Floaters {
  constructor({ count }) {
    this.group = new THREE.Group();
    this.textures = EMOJIS.map(emojiTexture);
    this.heartTex = heartTexture();
    this.items = [];
    this.opacity = 0;
    for (let i = 0; i < count; i++) this.items.push(this.make(false, Math.random()));
  }

  make(rain, phase = 0) {
    const useHeart = rain || Math.random() < .45;
    const mat = new THREE.SpriteMaterial({ map: useHeart ? this.heartTex : pick(this.textures), transparent: true, depthWrite: false, opacity: 0 });
    const s = new THREE.Sprite(mat);
    this.group.add(s);
    const it = { s, rain, life: 0, dur: 0, x: 0, z: 0, y0: 0, y1: 0, size: 1, sway: 0 };
    this.reset(it, phase);
    return it;
  }

  reset(it, phase = 0) {
    const a = Math.random() * Math.PI * 2, r = it.rain ? rand(0, 10) : rand(3, 15);
    it.x = Math.cos(a) * r; it.z = Math.sin(a) * r;
    if (it.rain) { it.y0 = rand(12, 16); it.y1 = -2; it.dur = rand(3, 5); }
    else { it.y0 = rand(-1.5, .5); it.y1 = rand(5, 9); it.dur = rand(12, 20); }
    it.life = phase * it.dur;
    it.size = it.rain ? rand(.35, .7) : rand(.28, .55);
    it.sway = Math.random() * 10;
  }

  rain(n = 60) {
    for (let i = 0; i < n; i++) {
      const it = this.make(true, -Math.random() * .8);
      this.items.push(it);
    }
  }

  setOpacity(o) { this.opacity = o; }

  update(t, dt) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.life += dt;
      const p = it.life / it.dur;
      if (p >= 1) {
        if (it.rain) { this.group.remove(it.s); it.s.material.dispose(); this.items.splice(i, 1); continue; }
        this.reset(it); continue;
      }
      if (p < 0) { it.s.material.opacity = 0; continue; }
      const y = it.y0 + (it.y1 - it.y0) * p;
      it.s.position.set(it.x + Math.sin(t * .8 + it.sway) * .4, y, it.z + Math.cos(t * .6 + it.sway) * .4);
      it.s.scale.setScalar(it.size);
      it.s.material.rotation = Math.sin(t + it.sway) * .3;
      const fade = Math.min(1, p * 6, (1 - p) * 4);
      it.s.material.opacity = fade * (it.rain ? 1 : .8) * this.opacity;
    }
  }
}
