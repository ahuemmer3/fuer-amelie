import { h } from '../core/utils.js';

/** Row of small stat tiles. stats({ score: 'Punkte' }) → { el, set(key, value) } */
export function stats(defs) {
  const cells = {};
  const el = h('div', { class: 'g-stats' }, Object.entries(defs).map(([k, label]) => {
    const b = h('b', { text: '0' });
    cells[k] = b;
    return h('div', { class: 'g-stat' }, [h('small', { text: label }), b]);
  }));
  return { el, set: (k, v) => { if (cells[k]) cells[k].textContent = v; } };
}

/** Veil over a stage with a title, text and a button. */
export function veil(stage) {
  const title = h('h3'), text = h('p'), btn = h('button', { class: 'g-btn primary', type: 'button' });
  const el = h('div', { class: 'g-veil' }, [title, text, btn]);
  stage.appendChild(el);
  let handler = null;
  btn.addEventListener('click', () => handler && handler());
  return {
    el,
    show({ t = '', p = '', button = 'Los', onClick }) {
      title.textContent = t; text.innerHTML = p; btn.textContent = button; handler = onClick;
      el.hidden = false;
      setTimeout(() => btn.focus({ preventScroll: true }), 50);
    },
    hide() { el.hidden = true; }
  };
}

/** requestAnimationFrame loop with dt (s) that can be stopped */
export function loop(fn) {
  let raf = 0, last = performance.now(), running = true;
  const step = now => {
    if (!running) return;
    const dt = Math.min(.033, (now - last) / 1000); last = now;
    fn(dt, now / 1000);
    raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
  return { stop() { running = false; cancelAnimationFrame(raf); } };
}

export function drawStar(ctx, x, y, r, rot = 0, color = '#ffd27a', glow = '#ffb054') {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.shadowColor = glow; ctx.shadowBlur = 14; ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) { const rr = i % 2 ? r * .45 : r, a = i * Math.PI / 5 - Math.PI / 2; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  ctx.closePath(); ctx.fill(); ctx.restore();
}

export function glowDot(ctx, x, y, r, color) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}

/** A static star field drawn once into an offscreen canvas */
export function starBackdrop(w, hgt, density = 2600) {
  const c = document.createElement('canvas');
  const dpr = Math.min(devicePixelRatio || 1, 2);
  c.width = w * dpr; c.height = hgt * dpr;
  const g = c.getContext('2d'); g.scale(dpr, dpr);
  const grd = g.createRadialGradient(w * .5, hgt * .1, 0, w * .5, hgt * .4, Math.max(w, hgt));
  grd.addColorStop(0, '#2d0c34'); grd.addColorStop(1, '#0a0312');
  g.fillStyle = grd; g.fillRect(0, 0, w, hgt);
  const n = Math.round(w * hgt / density);
  for (let i = 0; i < n; i++) {
    g.globalAlpha = .25 + Math.random() * .6;
    g.fillStyle = Math.random() < .2 ? '#ffc6e2' : '#ffffff';
    const s = Math.random() < .9 ? 1 : 2;
    g.fillRect(Math.random() * w, Math.random() * hgt, s, s);
  }
  g.globalAlpha = 1;
  return c;
}
