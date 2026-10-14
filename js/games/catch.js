import { h, fitCanvas, clamp, heartPath2D, store } from '../core/utils.js';
import { stats, veil, loop, drawStar, starBackdrop } from './kit.js';

export const title = 'Herzen fangen';

export default function render(body, api) {
  const goal = api.config.herzenFangen.ziel;
  const reward = api.config.herzenFangen.belohnung;
  let best = store.get('catchBest', 0);

  const st = stats({ score: 'Punkte', lives: 'Leben', best: 'Rekord' });
  st.set('best', best);
  const stage = h('div', { class: 'g-stage' });
  const canvas = h('canvas');
  stage.appendChild(canvas);
  const msg = h('p', { class: 'g-msg' });
  const rewardBox = h('div', { class: 'g-reward', hidden: true, text: reward });
  body.append(h('div', { class: 'g' }, [
    h('p', { class: 'g-lead', html: `Fang Herzen <b>(+3)</b> und Sterne <b>(+1)</b> mit deinem Korb. Goldene Herzen geben <b>+10</b>. Pass auf die schwarzen Löcher auf: Sie ziehen deinen Korb an. Ab <b>${goal} Punkten</b> gibt es eine Belohnung.` }),
    st.el, stage, msg, rewardBox
  ]));
  if (api.isDone()) { rewardBox.hidden = false; }

  let W, H, ctx, bg, game = null, running = null, rewarded = api.isDone();
  const v = veil(stage);

  function size() {
    ({ w: W, h: H, ctx } = fitCanvas(canvas, w => clamp(w * .95, 360, 520)));
    bg = starBackdrop(W, H);
    draw();
  }

  function reset() {
    game = { x: W / 2, tx: W / 2, score: 0, lives: 3, items: [], parts: [], spawn: .4, t: 0, inv: 0, shake: 0 };
    st.set('score', 0); st.set('lives', '♥♥♥');
  }

  function start() {
    reset(); v.hide(); msg.textContent = '';
    api.epic(true);
    running && running.stop();
    running = loop(dt => { update(dt); draw(); });
  }

  function end() {
    running && running.stop(); running = null;
    api.epic(false);
    const newBest = game.score > best;
    if (newBest) { best = game.score; store.set('catchBest', best); st.set('best', best); }
    const reached = game.score >= goal;
    v.show({ t: reached ? 'Großartig!' : 'Fast!', p: `${game.score} Punkte.${newBest ? ' Neuer Rekord!' : ''}${reached ? '' : ` Noch ${goal - game.score} bis zur Belohnung.`}`, button: 'Nochmal', onClick: start });
    api.sfx(reached ? 'win' : 'hit');
  }

  function spawn() {
    const d = Math.min(1, game.t / 45);
    const r = Math.random(), pHole = .22 + d * .16;
    const type = r < pHole ? 'hole' : r < pHole + .3 ? 'heart' : r < pHole + .32 ? 'gold' : 'star';
    const fast = type === 'gold' ? 1.35 : 1;
    game.items.push({ type, x: 24 + Math.random() * (W - 48), y: -24, vy: (150 + d * 260) * (H / 480) * (.8 + Math.random() * .45) * fast, rot: Math.random() * 6, spin: (Math.random() - .5) * 3, sway: Math.random() * 6, amp: type === 'hole' ? 60 + d * 60 : 20 });
  }

  function burst(x, y, color, n = 12) {
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, s = 60 + Math.random() * 160; game.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60, life: .7, color }); }
  }

  function update(dt) {
    const g = game; g.t += dt; g.spawn -= dt; g.inv = Math.max(0, g.inv - dt); g.shake = Math.max(0, g.shake - dt * 3);
    if (g.spawn <= 0) { spawn(); g.spawn = Math.max(.2, .55 - g.t * .008) + Math.random() * .1; }
    // black holes pull the basket towards them
    for (const it of g.items) {
      if (it.type !== 'hole') continue;
      const dx = it.x - g.tx, dy = (H - 42) - it.y;
      if (dy > 0 && dy < 260 && Math.abs(dx) < 170) g.tx = clamp(g.tx + Math.sign(dx) * 190 * (1 - dy / 260) * dt, 40, W - 40);
    }
    g.x += (g.tx - g.x) * Math.min(1, dt * 18);
    const by = H - 42;
    for (let i = g.items.length - 1; i >= 0; i--) {
      const it = g.items[i];
      it.y += it.vy * dt; it.rot += it.spin * dt; it.x = clamp(it.x + Math.sin(g.t * 2.4 + it.sway) * it.amp * dt, 16, W - 16);
      if (it.y > by - 16 && it.y < by + 14 && Math.abs(it.x - g.x) < 40) {
        g.items.splice(i, 1);
        if (it.type === 'hole') {
          if (g.inv > 0) continue;
          g.lives--; g.inv = 1.3; g.shake = 1; burst(it.x, it.y, '#8db4ff', 16); api.sfx('hit');
          st.set('lives', '♥'.repeat(g.lives) + '♡'.repeat(3 - g.lives));
          if (g.lives <= 0) { end(); return; }
        } else {
          const pts = it.type === 'gold' ? 10 : it.type === 'heart' ? 3 : 1;
          g.score += pts; st.set('score', g.score);
          burst(it.x, it.y, it.type === 'star' ? '#ffd27a' : it.type === 'gold' ? '#ffcf73' : '#ff6fb1', it.type === 'gold' ? 26 : 12);
          g.parts.push({ x: it.x, y: it.y - 12, vx: 0, vy: -60, life: .9, text: '+' + pts, color: it.type === 'star' ? '#ffd27a' : '#ffb3d4' });
          api.sfx(it.type === 'star' ? 'catch' : 'heart');
          if (!rewarded && g.score >= goal) {
            rewarded = true; rewardBox.hidden = false; api.complete(); api.confetti({ y: .3 }); api.sfx('win');
            msg.className = 'g-msg win'; msg.textContent = 'Belohnung freigeschaltet! Spiel ruhig weiter für den Rekord.';
          }
        }
        continue;
      }
      if (it.y > H + 30) g.items.splice(i, 1);
    }
    for (let i = g.parts.length - 1; i >= 0; i--) {
      const p = g.parts[i]; p.x += p.vx * dt; p.y += p.vy * dt; if (!p.text) p.vy += 300 * dt; p.life -= dt;
      if (p.life <= 0) g.parts.splice(i, 1);
    }
  }

  function draw() {
    if (!ctx) return;
    ctx.save();
    ctx.drawImage(bg, 0, 0, W, H);
    if (game && game.shake) ctx.translate((Math.random() - .5) * 10 * game.shake, (Math.random() - .5) * 10 * game.shake);
    if (game) {
      for (const it of game.items) {
        if (it.type === 'star') drawStar(ctx, it.x, it.y, 11, it.rot);
        else if (it.type === 'hole') drawHole(it.x, it.y, 15, it.rot);
        else {
          ctx.save(); ctx.translate(it.x, it.y); ctx.rotate(Math.sin(it.rot) * .3);
          ctx.shadowColor = it.type === 'gold' ? '#ffcf73' : '#ff4fa3'; ctx.shadowBlur = 16;
          ctx.fillStyle = it.type === 'gold' ? '#ffd27a' : '#ff5c9d';
          heartPath2D(ctx, 0, 0, it.type === 'gold' ? 14 : 12); ctx.fill(); ctx.restore();
        }
      }
      for (const p of game.parts) {
        ctx.globalAlpha = clamp(p.life * 1.5, 0, 1); ctx.fillStyle = p.color;
        if (p.text) { ctx.font = '700 15px Manrope, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(p.text, p.x, p.y); }
        else ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
      }
      ctx.globalAlpha = 1;
      if (!(game.inv > 0 && Math.floor(game.inv * 10) % 2)) drawBasket(game.x, H - 42);
    }
    ctx.restore();
  }

  function drawBasket(x, y) {
    ctx.save();
    ctx.shadowColor = '#ff4fa3'; ctx.shadowBlur = 22;
    const g = ctx.createLinearGradient(x - 44, y, x + 44, y);
    g.addColorStop(0, '#ff6fb1'); g.addColorStop(.5, '#ffd6ea'); g.addColorStop(1, '#ff6fb1');
    ctx.strokeStyle = g; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.ellipse(x, y - 4, 44, 22, 0, .1, Math.PI - .1); ctx.stroke();
    ctx.lineWidth = 2; ctx.globalAlpha = .6;
    ctx.beginPath(); ctx.moveTo(x - 43, y - 2); ctx.lineTo(x + 43, y - 2); ctx.stroke();
    ctx.restore();
  }

  function drawHole(x, y, r, rot) {
    ctx.save(); ctx.translate(x, y);
    const g = ctx.createRadialGradient(0, 0, r * .6, 0, 0, r * 2.3);
    g.addColorStop(0, 'rgba(160,120,255,.55)'); g.addColorStop(1, 'rgba(160,120,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r * 2.3, 0, Math.PI * 2); ctx.fill();
    ctx.rotate(Math.sin(rot) * .2);
    ctx.strokeStyle = '#c7a6ff'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(0, 0, r * 1.8, r * .45, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(0, 0, r * .8, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#efe4ff'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(0, 0, r * 1.8, r * .45, 0, 0, Math.PI); ctx.stroke();
    ctx.restore();
  }

  const setX = e => { if (!game) return; const r = canvas.getBoundingClientRect(); game.tx = clamp(e.clientX - r.left, 44, W - 44); };
  canvas.addEventListener('pointermove', setX);
  canvas.addEventListener('pointerdown', e => { setX(e); canvas.setPointerCapture(e.pointerId); });
  const keys = e => {
    if (!game || !running) return;
    if (e.key === 'ArrowLeft') { game.tx = clamp(game.tx - 60, 44, W - 44); e.preventDefault(); }
    if (e.key === 'ArrowRight') { game.tx = clamp(game.tx + 60, 44, W - 44); e.preventDefault(); }
  };
  addEventListener('keydown', keys);
  const onResize = () => size();
  addEventListener('resize', onResize);

  size(); reset();
  v.show({ t: 'Bereit?', p: 'Mit dem Finger oder der Maus steuern, am Computer auch mit ← →.', button: 'Spiel starten', onClick: start });

  return () => { running && running.stop(); api.epic(false); removeEventListener('keydown', keys); removeEventListener('resize', onResize); };
}
