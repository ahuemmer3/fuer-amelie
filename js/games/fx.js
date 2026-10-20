/**
 * Shared 2D effects for the games: particles, shockwaves, floating texts,
 * a painted animated nebula background and glinting stars.
 */
import { heartPath2D } from '../core/utils.js';

export const TAU = Math.PI * 2;

/* ------------------------------------------------------------------ particles */
export class Particles {
  constructor() { this.list = []; }
  burst(x, y, { n = 18, colors = ['#ffd27a', '#ff8fc7', '#ffffff'], speed = 220, life = .8, size = 3, gravity = 260, drag = 1.6, shape = 'spark' } = {}) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, s = speed * (.35 + Math.random() * .75);
      this.list.push({ x, y, px: x, py: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - speed * .2, life: life * (.6 + Math.random() * .6), max: life, size: size * (.6 + Math.random() * .8),
        color: colors[i % colors.length], gravity, drag, shape, rot: Math.random() * TAU, vr: (Math.random() - .5) * 10 });
    }
  }
  /** flakes that flutter down (scratch card foil) */
  flakes(x, y, n, colors) {
    for (let i = 0; i < n; i++) this.list.push({ x, y, px: x, py: y, vx: (Math.random() - .5) * 140, vy: -40 - Math.random() * 80, life: 1.2 + Math.random() * .6, max: 1.8, size: 3 + Math.random() * 4,
      color: colors[Math.floor(Math.random() * colors.length)], gravity: 420, drag: 2.2, shape: 'flake', rot: Math.random() * TAU, vr: (Math.random() - .5) * 16 });
  }
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.px = p.x; p.py = p.y;
      p.vx *= 1 - p.drag * dt; p.vy = p.vy * (1 - p.drag * dt) + p.gravity * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; p.life -= dt;
      if (p.life <= 0) this.list.splice(i, 1);
    }
  }
  draw(ctx) {
    ctx.save();
    for (const p of this.list) {
      const k = Math.max(0, p.life / p.max);
      ctx.globalAlpha = Math.min(1, k * 1.6);
      if (p.shape === 'spark') {
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = p.color; ctx.lineWidth = p.size * k + .5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(p.px - (p.x - p.px) * 2, p.py - (p.y - p.py) * 2); ctx.lineTo(p.x, p.y); ctx.stroke();
      } else if (p.shape === 'heart') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = p.color; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot * .3); heartPath2D(ctx, 0, 0, p.size * 1.4); ctx.fill(); ctx.restore();
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(1, Math.abs(Math.cos(p.rot * 1.7)) * .8 + .2);
        ctx.fillStyle = p.color; ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * .7); ctx.restore();
      }
    }
    ctx.restore();
  }
}

/* ------------------------------------------------------------------ rings & floating texts */
export class Rings {
  constructor() { this.list = []; }
  add(x, y, { color = '#ffd27a', r0 = 6, r1 = 70, life = .5, width = 3 } = {}) { this.list.push({ x, y, color, r0, r1, life, max: life, width }); }
  update(dt) { for (let i = this.list.length - 1; i >= 0; i--) { this.list[i].life -= dt; if (this.list[i].life <= 0) this.list.splice(i, 1); } }
  draw(ctx) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const r of this.list) {
      const k = 1 - r.life / r.max, e = 1 - Math.pow(1 - k, 3);
      ctx.globalAlpha = 1 - k; ctx.strokeStyle = r.color; ctx.lineWidth = r.width * (1 - k) + .5;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r0 + (r.r1 - r.r0) * e, 0, TAU); ctx.stroke();
    }
    ctx.restore();
  }
}

export class Texts {
  constructor() { this.list = []; }
  add(x, y, text, { color = '#fff', size = 20, life = 1, rise = 60 } = {}) { this.list.push({ x, y, text, color, size, life, max: life, rise }); }
  update(dt) { for (let i = this.list.length - 1; i >= 0; i--) { const t = this.list[i]; t.life -= dt; t.y -= t.rise * dt; if (t.life <= 0) this.list.splice(i, 1); } }
  draw(ctx) {
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const t of this.list) {
      const k = 1 - t.life / t.max;
      const pop = k < .15 ? .6 + k / .15 * .6 : 1.2 - Math.min(.2, (k - .15) * .6);
      ctx.globalAlpha = Math.min(1, (1 - k) * 2.2);
      ctx.font = `800 ${Math.round(t.size * pop)}px Manrope, sans-serif`;
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(40,0,40,.55)'; ctx.strokeText(t.text, t.x, t.y);
      ctx.shadowColor = t.color; ctx.shadowBlur = 14; ctx.fillStyle = t.color; ctx.fillText(t.text, t.x, t.y);
      ctx.shadowBlur = 0;
    }
    ctx.restore();
  }
}

/* ------------------------------------------------------------------ painted nebula background */
function paintNebula(w, h, palette, seed) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  let s = seed; const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < 26; i++) {
    const x = r() * w, y = r() * h, rad = (.12 + r() * .35) * Math.max(w, h), col = palette[i % palette.length];
    const a0 = (.05 + r() * .12).toFixed(3);
    // painted three times so the texture tiles seamlessly in y
    for (const dy of [-h, 0, h]) {
      const grd = g.createRadialGradient(x, y + dy, 0, x, y + dy, rad);
      grd.addColorStop(0, col.replace('A', a0)); grd.addColorStop(1, col.replace('A', '0'));
      g.fillStyle = grd; g.fillRect(0, 0, w, h);
    }
  }
  // dust lanes
  g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 8; i++) {
    const x = r() * w, y = r() * h, rad = (.08 + r() * .18) * w;
    for (const dy of [-h, 0, h]) {
      const grd = g.createRadialGradient(x, y + dy, 0, x, y + dy, rad);
      grd.addColorStop(0, 'rgba(0,0,0,.35)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grd; g.fillRect(0, 0, w, h);
    }
  }
  return c;
}

/** Multi-layer animated space background (nebula + parallax stars + shooting stars). */
export class SpaceBackdrop {
  constructor(w, h, { hue = 'pink', density = 1 } = {}) {
    this.w = w; this.h = h; this.t = 0;
    const pal = hue === 'blue'
      ? ['rgba(80,120,255,A)', 'rgba(150,90,255,A)', 'rgba(60,200,255,A)', 'rgba(255,120,200,A)']
      : ['rgba(255,70,160,A)', 'rgba(150,80,255,A)', 'rgba(255,150,110,A)', 'rgba(90,60,200,A)'];
    this.layers = [paintNebula(w, h * 2, pal, 7), paintNebula(w, h * 2, pal, 31)];
    this.stars = [];
    const n = Math.round(w * h / 1400 * density);
    for (let i = 0; i < n; i++) this.stars.push({ x: Math.random() * w, y: Math.random() * h, z: Math.random(), tw: Math.random() * TAU });
    this.shoot = null; this.shootT = 2 + Math.random() * 3;
    this.speed = 1; this.off = [0, 0]; this.dt = 0;
  }
  update(dt) {
    this.t += dt; this.dt = dt;
    for (const s of this.stars) { s.y += (8 + s.z * 40) * this.speed * dt; if (s.y > this.h) { s.y = 0; s.x = Math.random() * this.w; } }
    this.shootT -= dt;
    if (this.shootT <= 0) { this.shootT = 3 + Math.random() * 5; this.shoot = { x: Math.random() * this.w * .8, y: Math.random() * this.h * .4, life: .8 }; }
    if (this.shoot) { this.shoot.life -= dt; this.shoot.x += 520 * dt; this.shoot.y += 220 * dt; if (this.shoot.life <= 0) this.shoot = null; }
  }
  draw(ctx, tint = 0) {
    const { w, h } = this;
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, `hsl(${285 + tint * 30}, 60%, 9%)`); bg.addColorStop(1, `hsl(${320 + tint * 25}, 70%, 6%)`);
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    this.layers.forEach((L, i) => {
      this.off[i] = (this.off[i] + (6 + i * 10) * this.speed * this.dt) % (h * 2);
      const y0 = this.off[i] - h * 2;
      ctx.globalAlpha = i ? .9 : 1;
      ctx.drawImage(L, 0, y0, w, h * 2); ctx.drawImage(L, 0, y0 + h * 2, w, h * 2);
    });
    ctx.globalAlpha = 1;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const s of this.stars) {
      const tw = .45 + .55 * Math.sin(this.t * (1.5 + s.z * 3) + s.tw);
      ctx.globalAlpha = (.25 + s.z * .75) * tw;
      ctx.fillStyle = s.z > .85 ? '#ffd6ea' : '#ffffff';
      const sz = .6 + s.z * 1.6; ctx.fillRect(s.x, s.y, sz, sz);
      if (s.z > .93) glint(ctx, s.x, s.y, 5 + s.z * 4, '#ffffff', tw * .6);
    }
    if (this.shoot) {
      const sh = this.shoot, k = sh.life / .8;
      const grd = ctx.createLinearGradient(sh.x - 90, sh.y - 38, sh.x, sh.y);
      grd.addColorStop(0, 'rgba(255,255,255,0)'); grd.addColorStop(1, `rgba(255,230,245,${k})`);
      ctx.globalAlpha = 1; ctx.strokeStyle = grd; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sh.x - 90, sh.y - 38); ctx.lineTo(sh.x, sh.y); ctx.stroke();
    }
    ctx.restore();
    // vignette
    const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * .3, w / 2, h / 2, Math.max(w, h) * .75);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(5,0,10,.65)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, w, h);
  }
}

/** a star glint with four diffraction spikes */
export function glint(ctx, x, y, r, color = '#fff', alpha = 1) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = alpha;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * .7);
  g.addColorStop(0, color); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * .7, 0, TAU); ctx.fill();
  ctx.strokeStyle = color; ctx.lineCap = 'round';
  for (let i = 0; i < 2; i++) {
    const a = i * Math.PI / 2, gr = ctx.createLinearGradient(x - Math.cos(a) * r * 2, y - Math.sin(a) * r * 2, x + Math.cos(a) * r * 2, y + Math.sin(a) * r * 2);
    gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.5, color); gr.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.strokeStyle = gr; ctx.lineWidth = Math.max(1, r * .12);
    ctx.beginPath(); ctx.moveTo(x - Math.cos(a) * r * 2, y - Math.sin(a) * r * 2); ctx.lineTo(x + Math.cos(a) * r * 2, y + Math.sin(a) * r * 2); ctx.stroke();
  }
  ctx.restore();
}

/** glossy gradient heart */
export function glossyHeart(ctx, x, y, s, { c1 = '#ff9ec6', c2 = '#ff2f78', glow = '#ff4fa3', rot = 0, alpha = 1 } = {}) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = alpha;
  ctx.shadowColor = glow; ctx.shadowBlur = s * 1.3;
  const g = ctx.createRadialGradient(-s * .35, -s * .45, s * .1, 0, 0, s * 1.3);
  g.addColorStop(0, c1); g.addColorStop(1, c2);
  ctx.fillStyle = g; heartPath2D(ctx, 0, 0, s); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(-s * .48, -s * .42, s * .24, s * .13, -.6, 0, TAU); ctx.fill();
  ctx.restore();
}

export function starPath(ctx, r, inner = .45, points = 5) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) { const rr = i % 2 ? r * inner : r, a = i * Math.PI / points - Math.PI / 2; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  ctx.closePath();
}
