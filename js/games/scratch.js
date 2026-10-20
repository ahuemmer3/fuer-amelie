import { h, pick, store } from '../core/utils.js';
import { loop } from './kit.js';
import { Particles, starPath, TAU } from './fx.js';

export const title = 'Galaktisches Rubbellos';

const FOIL = ['#ff8fc7', '#c77dff', '#8fd0ff', '#ffcf73', '#ffffff'];

export default function render(body, api) {
  const coupons = api.config.rubbellos;
  let prize = store.get('rubbelGewinn', null);
  if (!prize || !coupons.includes(prize)) prize = pick(coupons);

  const field = h('div', { class: 'tk-field' });
  const prizeEl = h('div', { class: 'tk-prize' }, [h('small', { text: 'Du hast gewonnen' }), h('strong', { text: prize }), h('span', { text: `einzulösen bei ${api.config.deinName}` })]);
  const canvas = h('canvas', { class: 'tk-foil' });
  field.append(prizeEl, canvas);
  const ticket = h('div', { class: 'tk' }, [
    h('div', { class: 'tk-head' }, [h('span', { text: '✦ Galaktisches Rubbellos ✦' }), h('small', { text: 'Nr. 24-12-2025 · Gewinnchance 100 %' })]),
    field,
    h('div', { class: 'tk-foot', text: 'Mit dem Finger oder der Maus freirubbeln' })
  ]);
  const scene = h('div', { class: 'tk-scene' }, [ticket]);
  const msg = h('p', { class: 'g-msg', text: api.isDone() ? 'Schon freigerubbelt. Dein Gutschein wartet auf dich.' : 'Rubbel die holografische Folie weg.' });
  body.append(h('div', { class: 'g' }, [scene, msg]));

  // tilt the ticket like a real card (only once it is revealed, so scratching stays precise)
  scene.addEventListener('pointermove', e => {
    if (!ticket.classList.contains('won')) return;
    const r = scene.getBoundingClientRect();
    ticket.style.setProperty('--rx', ((e.clientY - r.top) / r.height - .5) * -16 + 'deg');
    ticket.style.setProperty('--ry', ((e.clientX - r.left) / r.width - .5) * 22 + 'deg');
  });
  scene.addEventListener('pointerleave', () => { ticket.style.setProperty('--rx', '0deg'); ticket.style.setProperty('--ry', '0deg'); });

  if (api.isDone()) { canvas.remove(); ticket.classList.add('won'); return; }

  let ctx, W, H, dpr, mask, mctx, drawing = false, last = null, revealed = false, dissolve = -1, moves = 0, glitter = [];
  const P = new Particles();
  function setup() {
    const r = field.getBoundingClientRect();
    W = r.width; H = r.height; dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    mask = document.createElement('canvas'); mask.width = W * dpr; mask.height = H * dpr;
    mctx = mask.getContext('2d', { willReadFrequently: true }); mctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    mctx.fillStyle = '#fff'; mctx.fillRect(0, 0, W, H);
    mctx.globalCompositeOperation = 'destination-out'; mctx.lineCap = 'round'; mctx.lineJoin = 'round'; mctx.lineWidth = Math.max(34, W * .075);
    glitter = Array.from({ length: Math.round(W * H / 260) }, () => ({ x: Math.random() * W, y: Math.random() * H, p: Math.random() * TAU, s: .6 + Math.random() * 1.6 }));
  }

  function drawFoil(t) {
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, W, H);
    // holographic sheen: diagonal rainbow that slowly travels
    const off = (t * .12) % 1;
    const g = ctx.createLinearGradient(-W * off, 0, W * (2 - off), H);
    ['#ff9ad0', '#c99bff', '#9fd8ff', '#fff0b8', '#ff9ad0', '#c99bff', '#9fd8ff'].forEach((c, i, a) => g.addColorStop(i / (a.length - 1), c));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const shine = ctx.createLinearGradient(0, 0, W, H);
    const sx = (Math.sin(t * .9) * .5 + .5);
    shine.addColorStop(Math.max(0, sx - .12), 'rgba(255,255,255,0)'); shine.addColorStop(sx, 'rgba(255,255,255,.55)'); shine.addColorStop(Math.min(1, sx + .12), 'rgba(255,255,255,0)');
    ctx.fillStyle = shine; ctx.fillRect(0, 0, W, H);
    // embossed star pattern
    ctx.globalAlpha = .18; ctx.fillStyle = '#fff';
    for (let y = 18; y < H; y += 36) for (let x = (y / 36 % 2) * 18 + 18; x < W; x += 36) { ctx.save(); ctx.translate(x, y); starPath(ctx, 5); ctx.fill(); ctx.restore(); }
    ctx.globalAlpha = 1;
    for (const s of glitter) { const a = Math.max(0, Math.sin(t * 3 + s.p)); if (a > .6) { ctx.fillStyle = `rgba(255,255,255,${(a - .6) * 2.2})`; ctx.fillRect(s.x, s.y, s.s, s.s); } }
    ctx.fillStyle = 'rgba(80,20,90,.55)'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `400 ${Math.round(Math.min(W * .11, 58))}px "Great Vibes", cursive`;
    ctx.fillText('Hier rubbeln', W / 2, H / 2 - 6);
    ctx.font = '800 11px Manrope, sans-serif'; ctx.fillText('✦  NUR FÜR DICH  ✦', W / 2, H / 2 + 28);
    // keep only what has not been scratched
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(mask, 0, 0, W, H);
    ctx.restore();
    P.draw(ctx);
  }

  const pos = e => { const r = canvas.getBoundingClientRect(); return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height]; };
  function scratch(p) {
    mctx.beginPath(); mctx.moveTo(...(last || p)); mctx.lineTo(...p); mctx.stroke();
    if (last) P.flakes(p[0], p[1], 2, FOIL);
    last = p;
    if (++moves % 6 === 0) { api.sfx('scratch'); check(); }
  }
  function check() {
    if (revealed) return;
    const data = mctx.getImageData(0, 0, mask.width, mask.height).data;
    let clear = 0, total = 0;
    for (let i = 3; i < data.length; i += 4 * 40) { total++; if (data[i] < 40) clear++; }
    if (clear / total > .5) reveal();
  }
  function reveal() {
    revealed = true; dissolve = 0;
    store.set('rubbelGewinn', prize);
    for (let k = 0; k < 90; k++) P.flakes(Math.random() * W, Math.random() * H * .7, 1, FOIL);
    setTimeout(() => {
      canvas.remove(); ticket.classList.add('won');
      msg.className = 'g-msg win'; msg.textContent = 'Gewonnen! Mach einen Screenshot und lös ihn bei mir ein.';
      api.sfx('win'); api.confetti(); api.complete();
    }, 850);
  }

  canvas.addEventListener('pointerdown', e => { drawing = true; last = null; try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ } scratch(pos(e)); });
  canvas.addEventListener('pointermove', e => { if (drawing && !revealed) scratch(pos(e)); });
  const stop = () => { drawing = false; last = null; check(); };
  canvas.addEventListener('pointerup', stop);
  canvas.addEventListener('pointercancel', stop);

  requestAnimationFrame(setup);
  const L = loop((dt, t) => {
    if (!ctx) return;
    if (dissolve >= 0) {
      dissolve += dt;
      for (let k = 0; k < 6; k++) { mctx.beginPath(); mctx.arc(Math.random() * W, Math.random() * H, 10 + dissolve * 60, 0, TAU); mctx.fill(); }
    }
    P.update(dt);
    drawFoil(t);
  });
  return () => L.stop();
}
