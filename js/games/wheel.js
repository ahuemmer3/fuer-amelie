import { h, store } from '../core/utils.js';

export const title = 'Glücksrad';

export default function render(body, api) {
  const seg = api.config.gluecksrad;
  const n = seg.length;
  const wrapEl = h('div', { class: 'wheel-wrap' });
  const canvas = h('canvas');
  const pin = h('div', { class: 'wheel-pin', html: '<svg viewBox="0 0 30 40"><path d="M15 38 L3 10 A13 13 0 1 1 27 10 Z" fill="#fff"/><circle cx="15" cy="13" r="5" fill="#ff4fa3"/></svg>' });
  wrapEl.append(canvas, pin);
  const btn = h('button', { class: 'g-btn primary', type: 'button', text: 'Drehen' });
  const msg = h('p', { class: 'g-msg', text: 'Dreh am Rad (Knopf drücken oder mit dem Finger anschubsen).' });
  const won = h('ul', { class: 'wish-list' });
  body.append(h('div', { class: 'g' }, [wrapEl, h('div', { class: 'g-row center' }, [btn]), msg, won]));

  const history = store.get('gluecksradGewinne', []);
  const renderWon = () => { won.innerHTML = ''; history.slice(-5).reverse().forEach(x => won.appendChild(h('li', { text: x }))); };
  renderWon();

  let ctx, S, angle = 0, vel = 0, dir = 1, spinning = false, raf = 0, last = 0, tickSeg = -1;
  const colors = ['#ff4fa3', '#7a2a9c', '#ff8fc7', '#4b1e7a', '#ff6b9a', '#9b5cff'];

  function size() {
    S = wrapEl.clientWidth;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = S * dpr; canvas.height = S * dpr;
    ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  function draw() {
    const c = S / 2, r = S / 2 - 10;
    ctx.clearRect(0, 0, S, S);
    ctx.save(); ctx.translate(c, c);
    ctx.shadowColor = 'rgba(255,79,163,.7)'; ctx.shadowBlur = 30;
    ctx.fillStyle = '#1a0624'; ctx.beginPath(); ctx.arc(0, 0, r + 6, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.rotate(angle);
    for (let i = 0; i < n; i++) {
      const a0 = i / n * Math.PI * 2 - Math.PI / 2, a1 = (i + 1) / n * Math.PI * 2 - Math.PI / 2;
      ctx.fillStyle = colors[i % colors.length];
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r, a0, a1); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,220,240,.35)'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.save(); ctx.rotate((a0 + a1) / 2); ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff'; ctx.font = `700 ${Math.max(11, Math.round(S * .033))}px Manrope, sans-serif`;
      wrapText(seg[i], r - 16, Math.round(S * .04));
      ctx.restore();
    }
    // lights around the rim
    for (let i = 0; i < n * 3; i++) {
      const a = i / (n * 3) * Math.PI * 2;
      ctx.fillStyle = i % 2 ? '#ffd6ea' : '#ffcf73';
      ctx.beginPath(); ctx.arc(Math.cos(a) * (r + 1), Math.sin(a) * (r + 1), 3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    // hub
    ctx.save(); ctx.translate(c, c);
    const g = ctx.createRadialGradient(-6, -6, 2, 0, 0, 30);
    g.addColorStop(0, '#fff'); g.addColorStop(1, '#ff4fa3');
    ctx.fillStyle = g; ctx.shadowColor = '#ff4fa3'; ctx.shadowBlur = 20;
    ctx.beginPath(); ctx.arc(0, 0, S * .07, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function wrapText(text, x, lh) {
    const words = text.split(' '), lines = [];
    let line = '';
    const max = S * .28;
    for (const w of words) { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > max && line) { lines.push(line); line = w; } else line = t; }
    lines.push(line);
    lines.slice(0, 3).forEach((l, i) => ctx.fillText(l, x, (i - (Math.min(lines.length, 3) - 1) / 2) * lh));
  }

  function spin(v) {
    if (spinning) return;
    spinning = true; btn.disabled = true;
    const v0 = v || (9 + Math.random() * 5);
    dir = Math.sign(v0) || 1; vel = Math.abs(v0);
    last = performance.now();
    api.sfx('launch');
    raf = requestAnimationFrame(step);
  }

  function step(now) {
    const dt = Math.min(.033, (now - last) / 1000); last = now;
    angle += dir * vel * dt;
    vel *= Math.pow(.42, dt);
    vel -= .25 * dt;
    const pointerSeg = currentSeg();
    if (pointerSeg !== tickSeg) { tickSeg = pointerSeg; api.sfx('tick'); }
    draw();
    if (vel > .02) raf = requestAnimationFrame(step);
    else finish();
  }

  // segment under the pointer at the top
  const currentSeg = () => { const a = ((-angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2); return Math.floor(a / (Math.PI * 2) * n) % n; };

  function finish() {
    spinning = false; btn.disabled = false;
    const prize = seg[currentSeg()];
    history.push(prize); store.set('gluecksradGewinne', history.slice(-20)); renderWon();
    msg.className = 'g-msg win'; msg.textContent = `Gewonnen: ${prize}! Screenshot machen und bei mir einlösen.`;
    api.sfx('win'); api.confetti(); api.complete();
  }

  // flick to spin
  let drag = null;
  canvas.addEventListener('pointerdown', e => { if (spinning) return; const r = canvas.getBoundingClientRect(); drag = { a: Math.atan2(e.clientY - r.top - S / 2, e.clientX - r.left - S / 2), t: performance.now(), start: angle }; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', e => {
    if (!drag) return;
    const r = canvas.getBoundingClientRect();
    const a = Math.atan2(e.clientY - r.top - S / 2, e.clientX - r.left - S / 2);
    let d = a - drag.a; if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2;
    angle += d; drag.v = d / Math.max(.008, (performance.now() - drag.t) / 1000); drag.a = a; drag.t = performance.now();
    draw();
  });
  canvas.addEventListener('pointerup', () => { if (!drag) return; const v = drag.v || 0; drag = null; if (Math.abs(v) > 3) spin(Math.min(22, Math.max(8, Math.abs(v))) * Math.sign(v)); });
  btn.addEventListener('click', () => spin());

  const onResize = () => size();
  addEventListener('resize', onResize);
  requestAnimationFrame(size);
  return () => { cancelAnimationFrame(raf); removeEventListener('resize', onResize); };
}
