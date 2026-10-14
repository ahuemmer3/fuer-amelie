import { heartPath2D } from '../core/utils.js';

/** Small glass toasts at the top of the screen */
export function toast(html, ms = 4200) {
  const root = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = html;
  root.appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 420); }, ms);
}

/** Full-screen 2D confetti (hearts + ribbons) used by the games */
let parts = [], raf = 0, last = 0;
const cv = () => document.getElementById('confetti');
export function confetti({ count = 160, x = .5, y = .35 } = {}) {
  const c = cv(), dpr = Math.min(devicePixelRatio || 1, 2);
  c.width = innerWidth * dpr; c.height = innerHeight * dpr;
  const ctx = c.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const cols = ['#ff4fa3', '#ffd3e7', '#ffcf73', '#b78cff', '#ff8fc7', '#ffffff'];
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2, sp = 250 + Math.random() * 520;
    parts.push({ x: innerWidth * x, y: innerHeight * y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 260, r: Math.random() * 6, vr: (Math.random() - .5) * 12,
      s: 5 + Math.random() * 7, c: cols[i % cols.length], heart: Math.random() < .45, life: 2.4 + Math.random() });
  }
  c.hidden = false;
  if (!raf) { last = performance.now(); raf = requestAnimationFrame(loop); }
}
function loop(now) {
  const c = cv(), ctx = c.getContext('2d');
  const dt = Math.min(.033, (now - last) / 1000); last = now;
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.vx *= 1 - 1.6 * dt; p.vy = p.vy * (1 - 1.2 * dt) + 520 * dt;
    p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt; p.life -= dt;
    if (p.life <= 0 || p.y > innerHeight + 40) { parts.splice(i, 1); continue; }
    ctx.save(); ctx.globalAlpha = Math.min(1, p.life * 1.5); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c;
    if (p.heart) { heartPath2D(ctx, 0, 0, p.s * .8); ctx.fill(); } else ctx.fillRect(-p.s / 2, -p.s / 5, p.s, p.s / 2.5);
    ctx.restore();
  }
  if (parts.length) raf = requestAnimationFrame(loop); else { raf = 0; c.hidden = true; }
}
