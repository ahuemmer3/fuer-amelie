import { h, pick, store } from '../core/utils.js';

export const title = 'Rubbellos';

export default function render(body, api) {
  const coupons = api.config.rubbellos;
  let prize = store.get('rubbelGewinn', null);
  if (!prize || !coupons.includes(prize)) { prize = pick(coupons); }

  const box = h('div', { class: 'scratch' });
  const prizeEl = h('div', { class: 'scratch-prize' }, [h('small', { text: 'Gutschein' }), h('strong', { text: prize }), h('span', { text: `einzulösen bei ${api.config.deinName}` })]);
  const canvas = h('canvas');
  box.append(prizeEl, canvas);
  const msg = h('p', { class: 'g-msg', text: api.isDone() ? 'Schon freigerubbelt. Dein Gutschein wartet auf dich.' : 'Rubbel mit dem Finger oder der Maus über die Fläche.' });
  body.append(h('div', { class: 'g' }, [box, msg]));

  if (api.isDone()) { canvas.remove(); return; }

  let ctx, W, H, dpr, drawing = false, last = null, revealed = false, moves = 0;
  function paint() {
    const r = box.getBoundingClientRect();
    W = r.width; H = r.height; dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx = canvas.getContext('2d', { willReadFrequently: true }); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, '#ff8fc7'); g.addColorStop(.35, '#c77dff'); g.addColorStop(.7, '#ffb36b'); g.addColorStop(1, '#ff6fb1');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // holographic shimmer + sparkles
    for (let i = 0; i < 260; i++) { ctx.fillStyle = `rgba(255,255,255,${Math.random() * .35})`; ctx.fillRect(Math.random() * W, Math.random() * H, 2, 2); }
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `400 ${Math.round(Math.min(W * .1, 54))}px "Great Vibes", cursive`;
    ctx.fillText('Hier rubbeln', W / 2, H / 2 - 8);
    ctx.font = '700 12px Manrope, sans-serif';
    ctx.fillText('✦  FÜR DICH  ✦', W / 2, H / 2 + 30);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(36, W * .08);
  }

  function pos(e) { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
  function scratch(p) {
    ctx.beginPath(); ctx.moveTo(...(last || p)); ctx.lineTo(...p); ctx.stroke();
    last = p;
    if (++moves % 6 === 0) { api.sfx('scratch'); check(); }
  }
  function check() {
    if (revealed) return;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let clear = 0, total = 0;
    for (let i = 3; i < data.length; i += 4 * 40) { total++; if (data[i] < 40) clear++; }
    if (clear / total > .52) reveal();
  }
  function reveal() {
    revealed = true;
    canvas.style.opacity = '0';
    setTimeout(() => canvas.remove(), 800);
    store.set('rubbelGewinn', prize);
    msg.className = 'g-msg win'; msg.textContent = 'Gewonnen! Mach einen Screenshot und lös ihn bei mir ein.';
    api.sfx('win'); api.confetti(); api.complete();
  }

  canvas.addEventListener('pointerdown', e => { drawing = true; last = null; canvas.setPointerCapture(e.pointerId); scratch(pos(e)); });
  canvas.addEventListener('pointermove', e => { if (drawing) scratch(pos(e)); });
  const stop = () => { drawing = false; last = null; check(); };
  canvas.addEventListener('pointerup', stop);
  canvas.addEventListener('pointercancel', stop);
  requestAnimationFrame(paint);
}
