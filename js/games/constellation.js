import { h, fitCanvas, clamp } from '../core/utils.js';
import { loop } from './kit.js';
import { Particles, Rings, SpaceBackdrop, glint, TAU } from './fx.js';

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

  let W, H, ctx, bd, fi = 0, stars = [], seq = [], idx = 0, done = false, doneAt = 0, hover = null, wrong = null, comet = null, now = 0, cx = 0, cy = 0;
  const P = new Particles(), RG = new Rings();

  function size() {
    ({ w: W, h: H, ctx } = fitCanvas(canvas, w => clamp(w * .86, 330, 540)));
    bd = new SpaceBackdrop(W, H, { hue: 'blue', density: 1.4 });
    bd.speed = .15;
    layout();
  }

  function setFigure(i) {
    fi = i; idx = 0; done = false; wrong = null; comet = null; next.hidden = true;
    head.innerHTML = `Sternbild <b>${i + 1} von ${FIG.length}</b>. Tippe die Sterne in der Reihenfolge der Zahlen an und lass am Himmel etwas entstehen.`;
    msg.className = 'g-msg'; msg.textContent = '';
    layout();
  }

  function layout() {
    if (!W) return;
    const f = FIG[fi], s = Math.min(W, H) * .9, ox = (W - s) / 2, oy = (H - s) / 2;
    stars = []; seq = [];
    f.strokes.forEach(stroke => stroke.forEach((p, k) => {
      const x = ox + p[0] * s, y = oy + p[1] * s;
      let si = stars.findIndex(q => Math.hypot(q.x - x, q.y - y) < 3);
      if (si < 0) { stars.push({ x, y, tw: Math.random() * 6 }); si = stars.length - 1; }
      seq.push({ star: si, jump: k === 0 });
    }));
    cx = stars.reduce((a, q) => a + q.x, 0) / stars.length; cy = stars.reduce((a, q) => a + q.y, 0) / stars.length;
    stars.forEach(q => { const dx = q.x - cx, dy = q.y - cy, d = Math.hypot(dx, dy) || 1; q.lx = dx / d * 17; q.ly = dy / d * 17; });
  }
  const numberOf = si => seq.findIndex(q => q.star === si) + 1;

  function finish() {
    done = true; doneAt = now;
    const f = FIG[fi];
    msg.className = 'g-msg win'; msg.textContent = `${f.name}: ${f.text}`;
    api.sfx('magic');
    stars.forEach((s, k) => setTimeout(() => P.burst(s.x, s.y, { n: 10, colors: ['#ffd27a', '#ffffff', '#ff8fc7'], speed: 140, gravity: 40 }), k * 50));
    RG.add(cx, cy, { color: '#ffcf73', r1: Math.min(W, H) * .6, width: 5, life: 1.2 });
    if (fi === FIG.length - 1) { api.complete(); api.confetti(); next.textContent = 'Nochmal von vorn'; }
    else next.textContent = 'Nächstes Sternbild ✦';
    next.hidden = false;
  }

  canvas.addEventListener('pointermove', e => { const r = canvas.getBoundingClientRect(); hover = [e.clientX - r.left, e.clientY - r.top]; });
  canvas.addEventListener('pointerleave', () => (hover = null));
  canvas.addEventListener('pointerdown', e => {
    if (done || comet) return;
    const r = canvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    const hitR = W < 520 ? 26 : 22;
    const want = stars[seq[idx].star];
    if (Math.hypot(want.x - x, want.y - y) < hitR) {
      const prev = idx > 0 && !seq[idx].jump ? stars[seq[idx - 1].star] : null;
      api.sfx('tick');
      P.burst(want.x, want.y, { n: 14, colors: ['#bfe2ff', '#ffffff', '#ff8fc7'], speed: 160, gravity: 30 });
      RG.add(want.x, want.y, { color: '#bfe2ff', r1: 34 });
      if (prev) comet = { from: prev, to: want, t: 0 };
      idx++;
      if (idx >= seq.length) setTimeout(finish, prev ? 300 : 0);
      return;
    }
    const near = stars.findIndex(s => Math.hypot(s.x - x, s.y - y) < hitR);
    if (near >= 0) { wrong = { i: near, t: now }; api.sfx('wrong'); msg.className = 'g-msg'; msg.textContent = `Fast! Als Nächstes kommt Stern ${numberOf(seq[idx].star)}.`; }
  });
  next.addEventListener('click', () => setFigure((fi + 1) % FIG.length));

  function strokeLayers(fnPath, k) {
    [[10 + k * 8, `rgba(255,110,190,${.12 + k * .12})`], [3 + k * 2, `rgba(255,190,230,${.6 + k * .3})`], [1.2, 'rgba(255,255,255,.9)']].forEach(([w, c]) => { ctx.lineWidth = w; ctx.strokeStyle = c; fnPath(); ctx.stroke(); });
  }

  function draw(dt) {
    bd.update(dt); bd.draw(ctx, .3);
    const f = FIG[fi], k = done ? Math.min(1, (now - doneAt) / 1.2) : 0;
    const drawn = comet ? idx - 1 : idx;
    if (done) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(W, H) * .5);
      gr.addColorStop(0, `rgba(255,120,190,${.28 * k * (.8 + .2 * Math.sin(now * 3))})`); gr.addColorStop(1, 'rgba(255,120,190,0)');
      ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H); ctx.restore();
    }
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.globalCompositeOperation = 'lighter';
    strokeLayers(() => {
      ctx.beginPath();
      for (let n = 0; n < Math.min(drawn, seq.length); n++) { const s = stars[seq[n].star]; if (seq[n].jump) ctx.moveTo(s.x, s.y); else ctx.lineTo(s.x, s.y); }
    }, k);
    if (comet) {
      comet.t += dt / .28;
      const e = Math.min(1, comet.t), x = comet.from.x + (comet.to.x - comet.from.x) * e, y = comet.from.y + (comet.to.y - comet.from.y) * e;
      strokeLayers(() => { ctx.beginPath(); ctx.moveTo(comet.from.x, comet.from.y); ctx.lineTo(x, y); }, 0);
      glint(ctx, x, y, 12, '#ffffff', 1);
      P.list.push({ x, y, px: x, py: y, vx: (Math.random() - .5) * 60, vy: (Math.random() - .5) * 60, life: .5, max: .5, size: 2, color: '#ffd6ea', gravity: 0, drag: 2, shape: 'spark', rot: 0, vr: 0 });
      if (e >= 1) comet = null;
    }
    if (done) {
      const total = seq.length, pos = (now * .25) % 1;
      for (let m = 0; m < 3; m++) {
        const q = (pos + m / 3) % 1, j = Math.floor(q * (total - 1)), fr = q * (total - 1) - j;
        if (seq[j + 1] && !seq[j + 1].jump) { const a = stars[seq[j].star], b = stars[seq[j + 1].star]; glint(ctx, a.x + (b.x - a.x) * fr, a.y + (b.y - a.y) * fr, 9, '#ffe6a8', .9); }
      }
    }
    if (!done && !comet && idx > 0 && hover && !seq[idx].jump) {
      const s = stars[seq[idx - 1].star];
      ctx.setLineDash([3, 8]); ctx.lineWidth = 1.4; ctx.strokeStyle = 'rgba(255,200,235,.4)';
      ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(hover[0], hover[1]); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.restore();
    const visited = new Set(seq.slice(0, idx).map(q => q.star));
    const nextStar = !done && seq[idx] ? seq[idx].star : -1;
    stars.forEach((s, i) => {
      const on = visited.has(i) || done, tw = .75 + .25 * Math.sin(now * 2.5 + s.tw);
      glint(ctx, s.x, s.y, (on ? 11 : 8) * tw + k * 4, on ? '#ffe6c4' : '#cfe0ff', on ? 1 : .8);
      ctx.save(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s.x, s.y, on ? 2.6 : 2, 0, TAU); ctx.fill(); ctx.restore();
      if (i === nextStar) {
        const p = (now % 1.2) / 1.2;
        ctx.save(); ctx.strokeStyle = `rgba(255,140,200,${1 - p})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(s.x, s.y, 8 + p * 18, 0, TAU); ctx.stroke(); ctx.restore();
      }
      if (wrong && wrong.i === i && now - wrong.t < .6) {
        ctx.save(); ctx.strokeStyle = `rgba(150,170,255,${1 - (now - wrong.t) / .6})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(s.x, s.y, 14, 0, TAU); ctx.stroke(); ctx.restore();
      }
      if (!done) {
        const lx = s.x + s.lx, ly = s.y + s.ly;
        ctx.save(); ctx.font = '700 11px Manrope, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = i === nextStar ? 'rgba(255,79,163,.45)' : 'rgba(10,10,30,.5)';
        ctx.beginPath(); ctx.arc(lx, ly, 9, 0, TAU); ctx.fill();
        ctx.fillStyle = i === nextStar ? '#fff' : on ? 'rgba(255,214,150,.6)' : 'rgba(225,215,245,.9)';
        ctx.fillText(String(numberOf(i)), lx, ly + .5); ctx.restore();
      }
    });
    P.update(dt); RG.update(dt); P.draw(ctx); RG.draw(ctx);
    if (done) {
      const name = f.name, shown = Math.ceil(Math.min(1, (now - doneAt) / 1.4) * name.length);
      ctx.save(); ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
      ctx.font = `400 ${Math.round(clamp(W * .085, 30, 50))}px "Great Vibes", cursive`;
      ctx.shadowColor = '#ff4fa3'; ctx.shadowBlur = 20;
      ctx.fillText(name.slice(0, shown), W / 2, H - 30);
      ctx.restore();
    }
  }

  const onResize = () => size();
  addEventListener('resize', onResize);
  size(); setFigure(0);
  const L = loop((dt, t) => { now = t; draw(dt); });
  return () => { L.stop(); removeEventListener('resize', onResize); };
}
