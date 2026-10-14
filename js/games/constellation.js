import { h, fitCanvas, clamp } from '../core/utils.js';
import { loop, starBackdrop } from './kit.js';

export const title = 'Sternbild verbinden';

/* simple stroke alphabet (0..1 box, y down). Each letter = list of strokes, each stroke = list of stars */
const LETTERS = {
  A: [[[0, 1], [.5, 0], [1, 1]], [[.25, .58], [.75, .58]]],
  B: [[[0, 1], [0, 0], [.62, .03], [.84, .22], [.6, .47]], [[.12, .5], [.7, .52], [.92, .75], [.66, .98], [.12, .99]]],
  C: [[[.95, .15], [.6, 0], [.2, .1], [0, .5], [.2, .9], [.6, 1], [.95, .85]]],
  D: [[[0, 1], [0, 0], [.55, .05], [.9, .35], [.9, .65], [.55, .95], [.1, .99]]],
  E: [[[.9, 0], [0, 0], [0, .5], [0, 1], [.9, 1]], [[.15, .5], [.7, .5]]],
  F: [[[.9, 0], [0, 0], [0, .5], [0, 1]], [[.15, .48], [.7, .48]]],
  G: [[[.95, .15], [.6, 0], [.2, .1], [0, .5], [.2, .9], [.6, 1], [.95, .8], [.95, .55], [.55, .55]]],
  H: [[[0, 0], [0, 1]], [[1, 0], [1, 1]], [[.15, .5], [.85, .5]]],
  I: [[[.5, 0], [.5, .5], [.5, 1]]],
  J: [[[.9, 0], [.9, .7], [.65, 1], [.25, .95], [.05, .7]]],
  K: [[[0, 0], [0, 1]], [[.9, 0], [.15, .52], [.95, 1]]],
  L: [[[0, 0], [0, .5], [0, 1], [.85, 1]]],
  M: [[[0, 1], [0, 0], [.5, .55], [1, 0], [1, 1]]],
  N: [[[0, 1], [0, 0], [1, 1], [1, 0]]],
  O: [[[.5, 0], [.15, .15], [0, .5], [.15, .85], [.5, 1], [.85, .85], [1, .5], [.85, .15], [.5, 0]]],
  P: [[[0, 1], [0, 0], [.65, .03], [.9, .25], [.65, .5], [.1, .52]]],
  Q: [[[.5, 0], [.15, .15], [0, .5], [.15, .85], [.5, 1], [.85, .85], [1, .5], [.85, .15], [.5, 0]], [[.62, .72], [1, 1.05]]],
  R: [[[0, 1], [0, 0], [.65, .03], [.9, .25], [.65, .5], [.1, .52]], [[.4, .56], [.95, 1]]],
  S: [[[.9, .12], [.55, 0], [.15, .1], [.1, .35], [.5, .5], [.9, .65], [.85, .9], [.45, 1], [.08, .88]]],
  T: [[[0, 0], [.5, 0], [1, 0]], [[.5, .18], [.5, .6], [.5, 1]]],
  U: [[[0, 0], [0, .7], [.25, 1], [.75, 1], [1, .7], [1, 0]]],
  V: [[[0, 0], [.5, 1], [1, 0]]],
  W: [[[0, 0], [.25, 1], [.5, .4], [.75, 1], [1, 0]]],
  X: [[[0, 0], [.5, .5], [1, 1]], [[1, 0], [.62, .4]], [[.38, .6], [0, 1]]],
  Y: [[[0, 0], [.5, .5], [1, 0]], [[.5, .65], [.5, 1]]],
  Z: [[[0, 0], [1, 0], [0, 1], [1, 1]]]
};
const normLetter = ch => ({ 'Ä': 'A', 'Ö': 'O', 'Ü': 'U', 'ß': 'S' }[ch] || ch);

function heartPts(n, cx, cy, s) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const t = i / n * Math.PI * 2;
    pts.push([cx + 16 * Math.pow(Math.sin(t), 3) / 17 * s, cy - (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 17 * s]);
  }
  pts.push(pts[0]);
  return pts;
}
function infinityPts(n, cx, cy, s) {
  const pts = [];
  for (let i = 0; i < n; i++) { const t = (i + .5) / n * Math.PI * 2, d = 1 + Math.sin(t) ** 2; pts.push([cx + Math.cos(t) / d * s, cy + Math.sin(t) * Math.cos(t) / d * s]); }
  pts.push(pts[0]);
  return pts;
}

/** Figures are defined in a 0..1 square; the closing star repeats the first and is merged later. */
function figures(initials) {
  const list = [{ name: 'Cor Nostrum', text: 'Lateinisch für „unser Herz“. Hellster Stern darin: du.', strokes: [heartPts(14, .5, .5, .42)] }];
  const [a, b] = initials.map(s => normLetter((s || '').trim().toUpperCase().charAt(0)));
  if (LETTERS[a] && LETTERS[b]) {
    const place = (L, ox) => L.map(st => st.map(([x, y]) => [ox + x * .28, .3 + y * .4]));
    list.push({ name: `${a} + ${b}`, text: 'Unser eigenes Sternbild. Ab heute offiziell am Himmel.', strokes: [...place(LETTERS[a], .04), heartPts(8, .5, .52, .1), ...place(LETTERS[b], .68)] });
  } else {
    list.push({ name: 'Semper', text: 'Lateinisch für „immer“. Ohne Anfang und ohne Ende, so wie wir.', strokes: [infinityPts(16, .5, .5, .44)] });
  }
  return list;
}

export default function render(body, api) {
  const FIG = figures(api.config.initialen || []);
  const stage = h('div', { class: 'g-stage' });
  const canvas = h('canvas');
  stage.appendChild(canvas);
  const head = h('p', { class: 'g-lead' });
  const msg = h('p', { class: 'g-msg' });
  const next = h('button', { class: 'g-btn primary', type: 'button', hidden: true });
  body.append(h('div', { class: 'g' }, [head, stage, msg, h('div', { class: 'g-row' }, [next])]));

  let W, H, ctx, bg, fi = 0, stars = [], seq = [], idx = 0, done = false, doneAt = 0, hover = null, wrong = null;

  function size() {
    ({ w: W, h: H, ctx } = fitCanvas(canvas, w => clamp(w * .82, 320, 520)));
    bg = starBackdrop(W, H, 2200);
    layout();
  }

  // stars = unique points; seq = order of taps with pen-up flags
  function setFigure(i) {
    fi = i; idx = 0; done = false; wrong = null; next.hidden = true;
    head.innerHTML = `Sternbild <b>${i + 1} von ${FIG.length}</b>. Tippe die Sterne in der Reihenfolge der Zahlen an.`;
    msg.className = 'g-msg'; msg.textContent = '';
    layout();
  }
  function layout() {
    if (!W) return;
    const f = FIG[fi], s = Math.min(W, H) * .92, ox = (W - s) / 2, oy = (H - s) / 2;
    stars = []; seq = [];
    f.strokes.forEach(stroke => {
      stroke.forEach((p, k) => {
        const x = ox + p[0] * s, y = oy + p[1] * s;
        let si = stars.findIndex(q => Math.hypot(q.x - x, q.y - y) < 3);
        if (si < 0) { stars.push({ x, y, tw: Math.random() * 6 }); si = stars.length - 1; }
        seq.push({ star: si, jump: k === 0 });
      });
    });
    const cx = stars.reduce((a, q) => a + q.x, 0) / stars.length, cy = stars.reduce((a, q) => a + q.y, 0) / stars.length;
    stars.forEach(q => { const dx = q.x - cx, dy = q.y - cy, d = Math.hypot(dx, dy) || 1; q.lx = dx / d * 14; q.ly = dy / d * 14; });
  }

  function finish() {
    done = true; doneAt = performance.now();
    const f = FIG[fi];
    msg.className = 'g-msg win';
    msg.textContent = `${f.name}: ${f.text}`;
    api.sfx('magic');
    if (fi === FIG.length - 1) { api.complete(); api.confetti(); next.textContent = 'Nochmal von vorn'; }
    else next.textContent = 'Nächstes Sternbild';
    next.hidden = false;
  }

  canvas.addEventListener('pointermove', e => { const r = canvas.getBoundingClientRect(); hover = [e.clientX - r.left, e.clientY - r.top]; });
  canvas.addEventListener('pointerleave', () => (hover = null));
  canvas.addEventListener('pointerdown', e => {
    if (done) return;
    const r = canvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    const hitR = W < 520 ? 24 : 20;
    const want = stars[seq[idx].star];
    if (Math.hypot(want.x - x, want.y - y) < hitR) {
      idx++; api.sfx('tick');
      // skip the closing star when it is the same as the very first one
      while (idx < seq.length && idx > 0 && seq[idx].star === seq[idx - 1].star) idx++;
      if (idx >= seq.length) finish();
      return;
    }
    const near = stars.findIndex(s => Math.hypot(s.x - x, s.y - y) < hitR);
    if (near >= 0) { wrong = { i: near, t: performance.now() }; api.sfx('wrong'); msg.className = 'g-msg'; msg.textContent = `Fast! Als Nächstes kommt Stern ${numberOf(seq[idx].star)}.`; }
  });
  next.addEventListener('click', () => setFigure((fi + 1) % FIG.length));

  // the number shown on a star = first time it appears in the sequence
  const numberOf = si => seq.findIndex(q => q.star === si) + 1;

  function draw(now) {
    if (!ctx) return;
    ctx.drawImage(bg, 0, 0, W, H);
    const k = done ? Math.min(1, (now - doneAt) / 900) : 0;
    // lines
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = done ? `rgba(255,${200 - k * 40},${150 + k * 40},.95)` : 'rgba(255,214,150,.9)';
    ctx.lineWidth = 1.8 + k * 1.2; ctx.shadowColor = done ? '#ff4fa3' : '#ffb054'; ctx.shadowBlur = 10 + k * 16;
    ctx.beginPath();
    for (let n = 0; n < Math.min(idx, seq.length); n++) {
      const s = stars[seq[n].star];
      if (seq[n].jump) ctx.moveTo(s.x, s.y); else ctx.lineTo(s.x, s.y);
    }
    ctx.stroke();
    if (!done && idx > 0 && hover && !seq[idx].jump) {
      const s = stars[seq[idx - 1].star];
      ctx.setLineDash([4, 7]); ctx.globalAlpha = .45; ctx.shadowBlur = 0;
      ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(hover[0], hover[1]); ctx.stroke();
    }
    ctx.restore();
    // stars
    const visited = new Set(seq.slice(0, idx).map(q => q.star));
    const nextStar = !done && seq[idx] ? seq[idx].star : -1;
    ctx.font = '700 11px Manrope, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    stars.forEach((s, i) => {
      const on = visited.has(i) || done;
      const tw = .75 + .25 * Math.sin(now / 400 + s.tw);
      ctx.save(); ctx.shadowColor = on ? '#ffcf73' : '#cfe0ff'; ctx.shadowBlur = 12 + k * 10;
      ctx.fillStyle = on ? '#fff3d6' : '#eef2ff';
      ctx.beginPath(); ctx.arc(s.x, s.y, (on ? 3.6 : 2.8) * tw + k * 1.5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      if (i === nextStar) {
        const p = (now % 1200) / 1200;
        ctx.strokeStyle = `rgba(255,120,190,${1 - p})`; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(s.x, s.y, 7 + p * 15, 0, Math.PI * 2); ctx.stroke();
      }
      if (wrong && wrong.i === i && now - wrong.t < 600) {
        ctx.strokeStyle = `rgba(150,170,255,${1 - (now - wrong.t) / 600})`; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(s.x, s.y, 13, 0, Math.PI * 2); ctx.stroke();
      }
      if (!done) {
        ctx.fillStyle = i === nextStar ? '#ff8fc7' : on ? 'rgba(255,214,150,.45)' : 'rgba(225,215,245,.85)';
        ctx.fillText(String(numberOf(i)), s.x + s.lx, s.y + s.ly);
      }
    });
    if (done) {
      ctx.globalAlpha = k; ctx.fillStyle = '#fff';
      ctx.font = `400 ${Math.round(clamp(W * .07, 26, 42))}px "Great Vibes", cursive`; ctx.textAlign = 'center';
      ctx.shadowColor = '#ff4fa3'; ctx.shadowBlur = 16;
      ctx.fillText(FIG[fi].name, W / 2, H - 26);
      ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    }
  }

  const onResize = () => size();
  addEventListener('resize', onResize);
  size(); setFigure(0);
  const L = loop((dt, t) => draw(t * 1000));
  return () => { L.stop(); removeEventListener('resize', onResize); };
}
