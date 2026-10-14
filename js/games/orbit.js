import { h, fitCanvas, heartPath2D, pick, store } from '../core/utils.js';
import { stats, loop, starBackdrop } from './kit.js';

export const title = 'Umlaufbahn';

/* Levels in a 1000 × 640 world. On portrait screens the world is transposed (x ↔ y). */
const LEVELS = [
  { name: 'Erster Kontakt', hint: 'Zieh vom Herz weg wie bei einer Steinschleuder und lass los.', start: [120, 480], target: [860, 170, 36], holes: [{ x: 500, y: 330, m: 3.2e6 }] },
  { name: 'Im Weg', hint: 'Das Loch liegt genau dazwischen. Nutz seine Anziehung für eine Kurve.', start: [110, 320], target: [880, 320, 36], holes: [{ x: 500, y: 320, m: 5.2e6 }] },
  { name: 'Doppelte Anziehung', hint: 'Zwei Massen, eine Bahn. Fädel dich durch.', start: [100, 550], target: [900, 95, 34], holes: [{ x: 360, y: 230, m: 3.4e6 }, { x: 640, y: 430, m: 3.4e6 }] },
  { name: 'Im Schatten', hint: 'Das Ziel liegt hinter dem Loch. Lass dich drumherum schleudern.', start: [100, 100], target: [540, 555, 32], holes: [{ x: 520, y: 300, m: 5.8e6 }] },
  { name: 'Tanzendes Paar', hint: 'Zwei Löcher umkreisen sich. Hier ist Timing alles.', start: [100, 540], target: [900, 110, 32], holes: [{ orbit: [500, 320, 120, .7, 0], m: 3.4e6 }, { orbit: [500, 320, 120, .7, Math.PI], m: 3.4e6 }] }
];
const DEATH = ['Spaghettifiziert! Zu nah am Ereignishorizont.', 'Verschluckt. Das Loch sagt danke.', 'Hinter dem Horizont. Von dort kommt nichts zurück.'];
const hr = m => 12 + m / 2.6e5;

export default function render(body, api) {
  const st = stats({ level: 'Bahn', tries: 'Versuche' });
  const stage = h('div', { class: 'g-stage' });
  const canvas = h('canvas');
  stage.appendChild(canvas);
  const msg = h('p', { class: 'g-msg' });
  const dots = h('div', { class: 'g-row' });
  body.append(h('div', { class: 'g' }, [h('p', { class: 'g-lead', text: 'Schleuder das Herz zum Herzplaneten. Schwarze Löcher krümmen die Bahn. Kommt es ihnen zu nah, wird es spaghettifiziert.' }), st.el, stage, msg, dots]));

  let W, H, ctx, bg, k = 1, ox = 0, oy = 0, portrait = false, VW = 1000, VH = 640;
  let lvl = 0, unlocked = Math.min(LEVELS.length, store.get('orbitUnlocked', 1)), tries = 0, t = 0;
  let ball, aim = null, phase = 'aim', phaseT = 0, trail = [], hitHole = 0;

  const P = ([x, y]) => (portrait ? [y, x] : [x, y]);
  const holes = time => LEVELS[lvl].holes.map(o => {
    let x, y;
    if (o.orbit) { const [ox, oy, rad, sp, ph] = o.orbit; x = ox + Math.cos(time * sp + ph) * rad; y = oy + Math.sin(time * sp + ph) * rad * .8; }
    else { x = o.x; y = o.y; }
    const [px, py] = P([x, y]);
    return { x: px, y: py, m: o.m, r: hr(o.m) };
  });
  const accel = (x, y, hs) => {
    let ax = 0, ay = 0;
    for (const o of hs) { const dx = o.x - x, dy = o.y - y, d2 = dx * dx + dy * dy + 400, d = Math.sqrt(d2), a = o.m / d2; ax += a * dx / d; ay += a * dy / d; }
    return [ax, ay];
  };
  const start = () => P(LEVELS[lvl].start);
  const target = () => { const [x, y, r] = LEVELS[lvl].target; const [px, py] = P([x, y]); return [px, py, r]; };

  function size() {
    portrait = (body.clientWidth || 600) < 560;
    VW = portrait ? 640 : 1000; VH = portrait ? 1000 : 640;
    ({ w: W, h: H, ctx } = fitCanvas(canvas, w => Math.min(w * VH / VW, Math.max(320, innerHeight - 330))));
    k = Math.min(W / VW, H / VH); ox = (W - VW * k) / 2; oy = (H - VH * k) / 2;
    bg = starBackdrop(W, H, 2400);
    canvas.style.touchAction = 'none';
  }

  function say(s) { msg.textContent = s; }
  function hud() { st.set('level', `${lvl + 1}/${LEVELS.length}`); st.set('tries', tries); }
  function renderDots() {
    dots.innerHTML = '';
    LEVELS.forEach((L, i) => {
      const b = h('button', { class: 'g-btn' + (i === lvl ? ' primary' : ''), type: 'button', text: String(i + 1), title: L.name, disabled: i >= unlocked });
      b.style.padding = '10px 16px';
      b.addEventListener('click', () => load(i));
      dots.appendChild(b);
    });
  }
  function resetBall() { const [x, y] = start(); ball = { x, y, vx: 0, vy: 0 }; trail = []; phase = 'aim'; aim = null; }
  function load(i) { lvl = i; tries = 0; t = 0; resetBall(); renderDots(); hud(); say(`Bahn ${i + 1}: ${LEVELS[i].name}. ${LEVELS[i].hint}`); }

  const world = e => { const r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left - ox) / k, y: (e.clientY - r.top - oy) / k }; };
  function launchVel() {
    if (!aim) return null;
    const [sx, sy] = start(); const dx = sx - aim.x, dy = sy - aim.y, len = Math.hypot(dx, dy);
    if (len < 14) return null;
    const sp = Math.min(len * 3.4, 820);
    return [dx / len * sp, dy / len * sp];
  }
  canvas.addEventListener('pointerdown', e => { if (phase !== 'aim') return; canvas.setPointerCapture(e.pointerId); aim = world(e); });
  canvas.addEventListener('pointermove', e => { if (aim) aim = world(e); });
  canvas.addEventListener('pointerup', () => {
    const v = launchVel(); aim = null;
    if (!v || phase !== 'aim') return;
    ball.vx = v[0]; ball.vy = v[1]; phase = 'fly'; phaseT = 0; tries++; hud(); api.sfx('launch');
  });
  canvas.addEventListener('pointercancel', () => (aim = null));

  function win() {
    api.sfx('win');
    unlocked = Math.max(unlocked, Math.min(LEVELS.length, lvl + 2)); store.set('orbitUnlocked', unlocked);
    if (lvl === LEVELS.length - 1) { msg.className = 'g-msg win'; say('Alle Umlaufbahnen gemeistert! Du hast sogar die Gravitation um den Finger gewickelt.'); api.confetti(); api.complete(); }
    else say(`Angekommen nach ${tries} ${tries === 1 ? 'Versuch' : 'Versuchen'}! Nächste Bahn …`);
    renderDots();
  }

  function update(dt) {
    t += dt;
    if (phase === 'fly') {
      phaseT += dt;
      const n = 5, s = dt / n;
      for (let i = 0; i < n && phase === 'fly'; i++) {
        const hs = holes(t - dt + s * (i + 1));
        const [ax, ay] = accel(ball.x, ball.y, hs);
        ball.vx += ax * s; ball.vy += ay * s; ball.x += ball.vx * s; ball.y += ball.vy * s;
        hs.forEach((o, j) => { if (phase === 'fly' && Math.hypot(o.x - ball.x, o.y - ball.y) < o.r) { phase = 'dead'; phaseT = 0; hitHole = j; msg.className = 'g-msg'; say(pick(DEATH)); api.sfx('swallow'); } });
        const [tx, ty, tr] = target();
        if (phase === 'fly' && Math.hypot(tx - ball.x, ty - ball.y) < tr + 10) { phase = 'win'; phaseT = 0; ball.x = tx; ball.y = ty; win(); }
      }
      if (phase === 'fly') {
        trail.push([ball.x, ball.y]); if (trail.length > 120) trail.shift();
        if (ball.x < -220 || ball.x > VW + 220 || ball.y < -220 || ball.y > VH + 220 || phaseT > 14) { phase = 'lost'; phaseT = 0; msg.className = 'g-msg'; say('Ins Leere geflogen. Noch ein Versuch?'); }
      }
    } else if (phase === 'dead' || phase === 'lost') { phaseT += dt; if (phaseT > 1.3) resetBall(); }
    else if (phase === 'win') { phaseT += dt; if (phaseT > 1.8) { if (lvl < LEVELS.length - 1) load(lvl + 1); else phase = 'done'; } }
  }

  function drawHole(o) {
    const r = o.r;
    const g = ctx.createRadialGradient(o.x, o.y, r * .8, o.x, o.y, r * 4.6);
    g.addColorStop(0, 'rgba(255,120,190,.38)'); g.addColorStop(1, 'rgba(255,120,190,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(o.x, o.y, r * 4.6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(200,170,255,.14)'; ctx.lineWidth = 1; ctx.setLineDash([3, 8]);
    for (const m of [3, 5.5]) { ctx.beginPath(); ctx.arc(o.x, o.y, r * m, 0, Math.PI * 2); ctx.stroke(); }
    ctx.setLineDash([]);
    ctx.lineWidth = r * .32; ctx.strokeStyle = 'rgba(255,140,200,.75)';
    ctx.beginPath(); ctx.ellipse(o.x, o.y, r * 2, r * .5, -.15, Math.PI, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = r * .14; ctx.strokeStyle = 'rgba(255,220,240,.9)';
    ctx.beginPath(); ctx.arc(o.x, o.y, r * 1.15, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(o.x, o.y, r, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = r * .32; ctx.strokeStyle = 'rgba(255,214,234,.95)';
    ctx.beginPath(); ctx.ellipse(o.x, o.y, r * 2, r * .5, -.15, 0, Math.PI); ctx.stroke();
  }

  function heart(x, y, s, alpha = 1) {
    ctx.save(); ctx.globalAlpha = alpha; ctx.shadowColor = '#ff4fa3'; ctx.shadowBlur = 16; ctx.fillStyle = '#ff6fb1';
    heartPath2D(ctx, x, y, s); ctx.fill(); ctx.restore();
  }

  function draw(now) {
    ctx.drawImage(bg, 0, 0, W, H);
    ctx.save(); ctx.translate(ox, oy); ctx.scale(k, k);
    const hs = holes(t);
    // target planet
    const [tx, ty, tr] = target(), pulse = .5 + .5 * Math.sin(now * 3);
    const tg = ctx.createRadialGradient(tx, ty, 0, tx, ty, tr * 3);
    tg.addColorStop(0, 'rgba(255,207,115,.35)'); tg.addColorStop(1, 'rgba(255,207,115,0)');
    ctx.fillStyle = tg; ctx.beginPath(); ctx.arc(tx, ty, tr * 3, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = `rgba(255,214,150,${.3 + pulse * .3})`; ctx.lineWidth = 2; ctx.setLineDash([5, 7]);
    ctx.beginPath(); ctx.arc(tx, ty, tr + 9 + pulse * 4, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    const pg = ctx.createRadialGradient(tx - tr * .3, ty - tr * .3, tr * .1, tx, ty, tr * .8);
    pg.addColorStop(0, '#fff3d6'); pg.addColorStop(.5, '#ffb36b'); pg.addColorStop(1, '#a8405f');
    ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(tx, ty, tr * .75, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; heartPath2D(ctx, tx, ty + 1, tr * .25); ctx.fill();
    hs.forEach(drawHole);
    const [sx, sy] = start();
    ctx.strokeStyle = 'rgba(255,143,199,.5)'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 5]);
    ctx.beginPath(); ctx.arc(sx, sy, 26, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    trail.forEach((p, i) => { ctx.globalAlpha = i / trail.length * .7; ctx.fillStyle = '#ff9fc6'; ctx.beginPath(); ctx.arc(p[0], p[1], 2.4, 0, Math.PI * 2); ctx.fill(); });
    ctx.globalAlpha = 1;
    if (phase === 'aim' && aim) {
      const v = launchVel();
      ctx.strokeStyle = 'rgba(255,111,177,.65)'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(aim.x, aim.y); ctx.stroke();
      if (v) {
        let px = sx, py = sy, vx = v[0], vy = v[1]; const s = 1 / 120;
        ctx.fillStyle = 'rgba(255,241,214,.9)';
        for (let i = 0; i < 66; i++) {
          const [ax, ay] = accel(px, py, holes(t + i * s));
          vx += ax * s; vy += ay * s; px += vx * s; py += vy * s;
          if (i % 4 === 0) { ctx.globalAlpha = 1 - i / 66; ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2); ctx.fill(); }
        }
        ctx.globalAlpha = 1;
      }
    }
    if (phase === 'dead') {
      const o = hs[hitHole], p = Math.min(1, phaseT / .8);
      ctx.save(); ctx.translate(ball.x + (o.x - ball.x) * p, ball.y + (o.y - ball.y) * p);
      ctx.rotate(Math.atan2(o.y - ball.y, o.x - ball.x) - Math.PI / 2);
      ctx.scale(Math.max(.05, 1 - p), 1 + p * 5);
      heart(0, 0, 12, 1 - p); ctx.restore();
    } else if (phase !== 'lost') heart(ball.x, ball.y, 12);
    if (phase === 'win' || phase === 'done') {
      const p = phase === 'done' ? (now % 1.6) / 1.6 : Math.min(1, phaseT / 1.2);
      ctx.strokeStyle = `rgba(255,207,115,${1 - p})`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(tx, ty, tr + p * 130, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }

  const onResize = () => { size(); resetBall(); };
  addEventListener('resize', onResize);
  size();
  load(Math.min(unlocked, LEVELS.length) - 1 === LEVELS.length - 1 && api.isDone() ? 0 : Math.min(unlocked - 1, LEVELS.length - 1));
  const L = loop((dt, now) => { update(dt); draw(now); });
  return () => { L.stop(); removeEventListener('resize', onResize); };
}
