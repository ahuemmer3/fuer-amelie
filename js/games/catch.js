import { h, fitCanvas, clamp, store } from '../core/utils.js';
import { stats, veil, loop } from './kit.js';
import { Particles, Rings, Texts, SpaceBackdrop, glint, glossyHeart, starPath, TAU } from './fx.js';

export const title = 'Herzen fangen';

const LEVELS = ['Sanfter Sternenwind', 'Herzschauer', 'Meteoritenregen', 'Gravitationssturm', 'Supernova', 'Unendlichkeit'];

export default function render(body, api) {
  const goal = api.config.herzenFangen.ziel;
  const reward = api.config.herzenFangen.belohnung;
  let best = store.get('catchBest', 0);

  const st = stats({ score: 'Punkte', combo: 'Combo', best: 'Rekord' });
  st.set('best', best); st.set('combo', '×1');
  const stage = h('div', { class: 'g-stage catch-stage' });
  const canvas = h('canvas');
  stage.appendChild(canvas);
  const rewardBox = h('div', { class: 'g-reward reward-ticket', hidden: true }, [h('small', { text: 'Belohnung freigeschaltet' }), h('strong', { text: reward })]);
  body.append(h('div', { class: 'g' }, [
    h('p', { class: 'g-lead', html: `Steuere dein Herz-Raumschiff und sammle Herzen <b>+3</b>, Sterne <b>+1</b>, Snacks <b>+5</b> und goldene Herzen <b>+10</b>. Fängst du mehrere hintereinander, steigt der <b>Combo-Multiplikator</b>. Schwarze Löcher ziehen dich an und kosten ein Leben. Ab <b>${goal} Punkten</b> gibt es eine Belohnung.` }),
    st.el, stage, rewardBox
  ]));
  if (api.isDone()) rewardBox.hidden = false;

  let W, H, ctx, bd, game = null, running = null, rewarded = api.isDone(), idle = null;
  const v = veil(stage);
  const P = new Particles(), RG = new Rings(), TX = new Texts();

  function size() {
    ({ w: W, h: H, ctx } = fitCanvas(canvas, w => clamp(w * 1.05, 380, 560)));
    bd = new SpaceBackdrop(W, H);
  }

  function reset() {
    game = { x: W / 2, tx: W / 2, vx: 0, score: 0, shown: 0, lives: 3, items: [], t: 0, spawn: .5, inv: 0, shake: 0, combo: 0, mult: 1, level: 0, banner: null, flash: 0, flashCol: '255,255,255' };
    st.set('score', 0); st.set('combo', '×1');
  }

  function start() {
    reset(); v.hide(); idle && idle.stop(); idle = null;
    api.epic(true);
    running && running.stop();
    banner(`Level 1 · ${LEVELS[0]}`);
    running = loop(dt => { update(dt); draw(); });
  }

  function end() {
    running && running.stop(); running = null;
    api.epic(false);
    const newBest = game.score > best;
    if (newBest) { best = game.score; store.set('catchBest', best); st.set('best', best); }
    const stars = game.score >= goal * 1.6 ? 3 : game.score >= goal ? 2 : game.score >= goal * .4 ? 1 : 0;
    v.show({ t: stars >= 2 ? 'Großartig!' : 'Spaghettifiziert!', p: `<span class="rating">${'★'.repeat(stars)}<i>${'★'.repeat(3 - stars)}</i></span>${game.score} Punkte.${newBest ? ' <b>Neuer Rekord!</b>' : ''}${game.score >= goal ? '' : ` Noch ${goal - game.score} bis zur Belohnung.`}`, button: 'Nochmal', onClick: start });
    api.sfx(game.score >= goal ? 'win' : 'hit');
    idleLoop();
  }

  function banner(text) { game.banner = { text, t: 0 }; }

  function spawn() {
    const d = Math.min(1, game.t / 50), r = Math.random(), pHole = .2 + d * .17;
    const type = r < pHole ? 'hole' : r < pHole + .28 ? 'heart' : r < pHole + .3 ? 'gold' : r < pHole + .36 ? 'snack' : 'star';
    const sp = (150 + d * 270 + game.level * 18) * (H / 480) * (.8 + Math.random() * .45) * (type === 'gold' ? 1.35 : 1);
    game.items.push({ type, x: 30 + Math.random() * (W - 60), y: -30, vy: sp, rot: Math.random() * TAU, spin: (Math.random() - .5) * 3, sway: Math.random() * TAU, amp: type === 'hole' ? 50 + d * 70 : 18, t: 0,
      emoji: ['🍕', '🍩', '🍔', '🍫', '🧁'][Math.floor(Math.random() * 5)], trail: [] });
  }

  function collect(it) {
    const g = game;
    if (it.type === 'hole') {
      if (g.inv > 0) return;
      g.lives--; g.inv = 1.6; g.shake = 1; g.combo = 0; g.mult = 1; g.flash = .6; g.flashCol = '120,90,255';
      st.set('combo', '×1');
      P.burst(it.x, it.y, { n: 30, colors: ['#9f8bff', '#ffffff', '#5a3bff'], speed: 320 });
      RG.add(it.x, it.y, { color: '#9f8bff', r1: 120, width: 5 });
      TX.add(it.x, it.y - 20, '−1 ♥', { color: '#b9a6ff', size: 22 });
      api.sfx('hit');
      if (g.lives <= 0) end();
      return;
    }
    const base = it.type === 'gold' ? 10 : it.type === 'snack' ? 5 : it.type === 'heart' ? 3 : 1;
    g.combo++; g.mult = Math.min(5, 1 + Math.floor(g.combo / 5));
    const pts = base * g.mult;
    g.score += pts; st.set('score', g.score); st.set('combo', '×' + g.mult);
    const col = it.type === 'star' ? '#ffd27a' : it.type === 'gold' ? '#ffcf73' : it.type === 'snack' ? '#ffb36b' : '#ff6fb1';
    P.burst(it.x, it.y, { n: it.type === 'gold' ? 34 : 18, colors: [col, '#ffffff', '#ffd6ea'], speed: it.type === 'gold' ? 360 : 240 });
    RG.add(it.x, it.y, { color: col, r1: it.type === 'gold' ? 110 : 60 });
    TX.add(it.x, it.y - 18, it.type === 'snack' ? `+${pts} Snack!` : `+${pts}`, { color: col, size: it.type === 'gold' ? 30 : 22 });
    if (it.type === 'gold') { g.flash = .35; g.flashCol = '255,207,115'; }
    if (g.combo % 5 === 0) { TX.add(W / 2, H * .3, `Combo ×${g.mult}!`, { color: '#ffffff', size: 34, life: 1.2, rise: 30 }); api.sfx('magic'); }
    else api.sfx(it.type === 'star' ? 'catch' : 'heart');
    const lvl = Math.min(LEVELS.length - 1, Math.floor(g.score / 25));
    if (lvl > g.level) { g.level = lvl; banner(`Level ${lvl + 1} · ${LEVELS[lvl]}`); api.sfx('win'); g.flash = .5; g.flashCol = '255,140,200'; }
    if (!rewarded && g.score >= goal) {
      rewarded = true; rewardBox.hidden = false; api.complete(); api.confetti({ y: .3 });
      TX.add(W / 2, H * .45, 'Belohnung freigeschaltet!', { color: '#ffcf73', size: 26, life: 2, rise: 20 });
    }
  }

  function update(dt) {
    const g = game;
    g.t += dt; g.spawn -= dt; g.inv = Math.max(0, g.inv - dt); g.shake = Math.max(0, g.shake - dt * 2.5); g.flash = Math.max(0, g.flash - dt);
    g.shown += (g.score - g.shown) * Math.min(1, dt * 8);
    if (g.banner) { g.banner.t += dt; if (g.banner.t > 2.2) g.banner = null; }
    if (g.spawn <= 0) { spawn(); g.spawn = Math.max(.18, .52 - g.t * .007 - g.level * .02) + Math.random() * .1; }
    const shipY = H - 64;
    for (const it of g.items) {
      if (it.type !== 'hole') continue;
      const dx = it.x - g.tx, dy = shipY - it.y;
      if (dy > 0 && dy < 280 && Math.abs(dx) < 180) g.tx = clamp(g.tx + Math.sign(dx) * 210 * (1 - dy / 280) * dt, 36, W - 36);
    }
    const nx = g.x + (g.tx - g.x) * Math.min(1, dt * 14);
    g.vx = (nx - g.x) / Math.max(dt, 1e-3); g.x = nx;
    // engine trail
    P.list.push({ x: g.x + (Math.random() - .5) * 10, y: shipY + 26, px: g.x, py: shipY + 20, vx: (Math.random() - .5) * 40 - g.vx * .05, vy: 140 + Math.random() * 80, life: .4, max: .4, size: 3, color: Math.random() < .5 ? '#ffb36b' : '#ff6fb1', gravity: 0, drag: 1, shape: 'spark', rot: 0, vr: 0 });
    for (let i = g.items.length - 1; i >= 0; i--) {
      const it = g.items[i];
      it.t += dt; it.y += it.vy * dt; it.rot += it.spin * dt;
      it.x = clamp(it.x + Math.sin(g.t * 2.2 + it.sway) * it.amp * dt, 18, W - 18);
      it.trail.push(it.x, it.y); if (it.trail.length > 16) it.trail.splice(0, 2);
      if (it.y > shipY - 30 && it.y < shipY + 18 && Math.abs(it.x - g.x) < 38) { g.items.splice(i, 1); collect(it); if (!running) return; continue; }
      if (it.y > H + 40) {
        g.items.splice(i, 1);
        if (it.type === 'heart' || it.type === 'gold') { g.combo = 0; g.mult = 1; st.set('combo', '×1'); }
      }
    }
    bd.speed = 1 + g.level * .35 + Math.min(1, g.t / 50);
    bd.update(dt); P.update(dt); RG.update(dt); TX.update(dt);
  }

  function drawItem(it) {
    if (it.type !== 'hole') {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let k = 0; k < it.trail.length; k += 2) { ctx.globalAlpha = k / it.trail.length * .25; ctx.fillStyle = it.type === 'star' ? '#ffd27a' : '#ff8fc7'; ctx.beginPath(); ctx.arc(it.trail[k], it.trail[k + 1], 4 * k / it.trail.length + 1, 0, TAU); ctx.fill(); }
      ctx.restore();
    }
    const pulse = 1 + Math.sin(it.t * 7) * .08;
    if (it.type === 'heart') glossyHeart(ctx, it.x, it.y, 13 * pulse, { rot: Math.sin(it.rot) * .25 });
    else if (it.type === 'gold') {
      ctx.save(); ctx.translate(it.x, it.y); ctx.rotate(it.t * 1.5); ctx.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 8; k++) { ctx.rotate(TAU / 8); const g2 = ctx.createLinearGradient(0, 0, 0, -34); g2.addColorStop(0, 'rgba(255,214,120,.5)'); g2.addColorStop(1, 'rgba(255,214,120,0)'); ctx.fillStyle = g2; ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(0, -36); ctx.lineTo(4, 0); ctx.fill(); }
      ctx.restore();
      glossyHeart(ctx, it.x, it.y, 15 * pulse, { c1: '#fff3c4', c2: '#ffb02e', glow: '#ffcf73', rot: Math.sin(it.rot) * .2 });
    } else if (it.type === 'star') {
      ctx.save(); ctx.translate(it.x, it.y); ctx.rotate(it.rot);
      ctx.shadowColor = '#ffb054'; ctx.shadowBlur = 18;
      const g2 = ctx.createRadialGradient(0, -3, 1, 0, 0, 14); g2.addColorStop(0, '#fffbe6'); g2.addColorStop(1, '#ffc24d');
      ctx.fillStyle = g2; starPath(ctx, 13 * pulse); ctx.fill(); ctx.restore();
      glint(ctx, it.x, it.y, 9, '#fff3d0', .7);
    } else if (it.type === 'snack') {
      ctx.save(); ctx.translate(it.x, it.y); ctx.rotate(Math.sin(it.rot) * .4);
      const g2 = ctx.createRadialGradient(0, 0, 4, 0, 0, 26); g2.addColorStop(0, 'rgba(255,190,110,.55)'); g2.addColorStop(1, 'rgba(255,190,110,0)');
      ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(0, 0, 26, 0, TAU); ctx.fill();
      ctx.font = '28px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.scale(pulse, pulse); ctx.fillText(it.emoji, 0, 1); ctx.restore();
    } else drawHole(it.x, it.y, 17, it.t);
  }

  function drawHole(x, y, r, t) {
    ctx.save(); ctx.translate(x, y);
    const halo = ctx.createRadialGradient(0, 0, r * .8, 0, 0, r * 3.4);
    halo.addColorStop(0, 'rgba(150,110,255,.5)'); halo.addColorStop(1, 'rgba(150,110,255,0)');
    ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(0, 0, r * 3.4, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 3; k++) {
      ctx.save(); ctx.rotate(t * 3 + k * TAU / 3);
      const gr = ctx.createLinearGradient(-r * 2.2, 0, r * 2.2, 0); gr.addColorStop(0, 'rgba(255,140,220,0)'); gr.addColorStop(.5, 'rgba(255,200,240,.9)'); gr.addColorStop(1, 'rgba(160,120,255,0)');
      ctx.strokeStyle = gr; ctx.lineWidth = 2.6;
      ctx.beginPath(); for (let a = 0; a < 3.2; a += .2) { const rr = r * .95 + a * r * .38; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr * .55); } ctx.stroke();
      ctx.restore();
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(0, 0, r * .85, 0, TAU); ctx.fill();
    ctx.strokeStyle = `rgba(255,230,250,${.7 + .3 * Math.sin(t * 6)})`; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(0, 0, r * .9, 0, TAU); ctx.stroke();
    ctx.restore();
  }

  function drawShip(x, y, tilt, t) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(tilt);
    const beam = ctx.createLinearGradient(0, -70, 0, 0); beam.addColorStop(0, 'rgba(255,150,210,0)'); beam.addColorStop(1, `rgba(255,170,220,${.16 + .06 * Math.sin(t * 8)})`);
    ctx.fillStyle = beam; ctx.beginPath(); ctx.moveTo(-14, -6); ctx.lineTo(-42, -74); ctx.lineTo(42, -74); ctx.lineTo(14, -6); ctx.fill();
    const fl = 16 + Math.sin(t * 40) * 4 + Math.random() * 4;
    const fg = ctx.createLinearGradient(0, 18, 0, 18 + fl * 1.6); fg.addColorStop(0, '#fff3d0'); fg.addColorStop(.4, '#ffb36b'); fg.addColorStop(1, 'rgba(255,79,163,0)');
    ctx.fillStyle = fg; ctx.beginPath(); ctx.moveTo(-8, 16); ctx.quadraticCurveTo(0, 18 + fl * 1.8, 8, 16); ctx.fill();
    ctx.fillStyle = '#9b5cff'; ctx.shadowColor = '#b78cff'; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.moveTo(-14, 6); ctx.lineTo(-34, 18); ctx.lineTo(-12, 16); ctx.fill();
    ctx.beginPath(); ctx.moveTo(14, 6); ctx.lineTo(34, 18); ctx.lineTo(12, 16); ctx.fill();
    ctx.shadowBlur = 0;
    glossyHeart(ctx, 0, 0, 22, { c1: '#ffd6ea', c2: '#ff3f8e', glow: '#ff4fa3' });
    const cp = ctx.createRadialGradient(-2, -6, 1, 0, -4, 8); cp.addColorStop(0, '#ffffff'); cp.addColorStop(1, '#8fd0ff');
    ctx.fillStyle = cp; ctx.beginPath(); ctx.arc(0, -4, 6.5, 0, TAU); ctx.fill();
    ctx.restore();
  }

  function drawHud() {
    const g = game;
    for (let i = 0; i < 3; i++) glossyHeart(ctx, 22 + i * 26, 24, 9, { alpha: i < g.lives ? 1 : .2, c1: i < g.lives ? '#ff9ec6' : '#665', c2: i < g.lives ? '#ff2f78' : '#333', glow: i < g.lives ? '#ff4fa3' : 'rgba(0,0,0,0)' });
    ctx.save(); ctx.textAlign = 'right'; ctx.font = '800 26px Manrope, sans-serif'; ctx.fillStyle = '#fff'; ctx.shadowColor = '#ff4fa3'; ctx.shadowBlur = 12;
    ctx.fillText(String(Math.round(g.shown)), W - 16, 34);
    if (g.mult > 1) { ctx.font = '800 14px Manrope, sans-serif'; ctx.fillStyle = '#ffcf73'; ctx.fillText(`COMBO ×${g.mult}`, W - 16, 54); }
    ctx.restore();
    const p = Math.min(1, g.score / goal);
    ctx.save(); ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(16, H - 10, W - 32, 3);
    const pg = ctx.createLinearGradient(16, 0, W - 16, 0); pg.addColorStop(0, '#ff4fa3'); pg.addColorStop(1, '#ffcf73');
    ctx.fillStyle = pg; ctx.fillRect(16, H - 10, (W - 32) * p, 3); ctx.restore();
    if (g.banner) {
      const k = g.banner.t, a = k < .3 ? k / .3 : k > 1.8 ? (2.2 - k) / .4 : 1;
      ctx.save(); ctx.globalAlpha = Math.max(0, a); ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(20,4,30,.55)'; ctx.fillRect(0, H * .38 - 30, W, 60);
      ctx.font = `400 ${Math.round(clamp(W * .07, 26, 40))}px "Great Vibes", cursive`; ctx.fillStyle = '#fff'; ctx.shadowColor = '#ff4fa3'; ctx.shadowBlur = 16;
      ctx.fillText(g.banner.text, W / 2 + (1 - Math.min(1, k / .35)) * -60, H * .38 + 10);
      ctx.restore();
    }
  }

  function draw() {
    if (!ctx) return;
    const g = game;
    ctx.save();
    if (g.shake) ctx.translate((Math.random() - .5) * 12 * g.shake, (Math.random() - .5) * 12 * g.shake);
    bd.draw(ctx, g.level * .15);
    g.items.forEach(drawItem);
    P.draw(ctx); RG.draw(ctx);
    const shipY = H - 64;
    if (!(g.inv > 0 && Math.floor(g.inv * 12) % 2)) drawShip(g.x, shipY, clamp(g.vx / 900, -.45, .45), g.t);
    if (g.inv > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = `rgba(160,140,255,${g.inv / 1.6})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(g.x, shipY, 38, 0, TAU); ctx.stroke(); ctx.restore(); }
    TX.draw(ctx);
    if (running) drawHud();
    if (g.flash) { ctx.fillStyle = `rgba(${g.flashCol},${g.flash * .35})`; ctx.fillRect(0, 0, W, H); }
    ctx.restore();
  }

  /** animated scene behind the start / end screen */
  function idleLoop() {
    idle && idle.stop();
    if (!game) reset();
    idle = loop(dt => {
      game.t += dt;
      if (Math.random() < dt * 2) spawn();
      for (let i = game.items.length - 1; i >= 0; i--) { const it = game.items[i]; it.t += dt; it.y += it.vy * .35 * dt; it.rot += it.spin * dt; it.trail.length = 0; if (it.y > H + 40) game.items.splice(i, 1); }
      game.x = W / 2 + Math.sin(game.t * .8) * W * .25; game.vx = Math.cos(game.t * .8) * W * .2;
      bd.update(dt); P.update(dt); RG.update(dt); TX.update(dt);
      draw();
    });
  }

  const setX = e => { if (!game || !running) return; const r = canvas.getBoundingClientRect(); game.tx = clamp(e.clientX - r.left, 36, W - 36); };
  canvas.addEventListener('pointermove', setX);
  canvas.addEventListener('pointerdown', e => { setX(e); try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ } });
  const keys = e => {
    if (!game || !running) return;
    if (e.key === 'ArrowLeft') { game.tx = clamp(game.tx - 70, 36, W - 36); e.preventDefault(); }
    if (e.key === 'ArrowRight') { game.tx = clamp(game.tx + 70, 36, W - 36); e.preventDefault(); }
  };
  addEventListener('keydown', keys);
  const onResize = () => { size(); if (!running) reset(); };
  addEventListener('resize', onResize);

  size(); reset(); idleLoop();
  v.show({ t: 'Herzen fangen', p: 'Mit dem Finger oder der Maus steuern, am Computer auch mit ← →.', button: 'Spiel starten', onClick: start });

  return () => { running && running.stop(); idle && idle.stop(); api.epic(false); removeEventListener('keydown', keys); removeEventListener('resize', onResize); };
}
