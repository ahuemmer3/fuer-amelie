import { h, fitCanvas, clamp } from '../core/utils.js';
import { loop, starBackdrop } from '../games/kit.js';

export const title = 'Alles Gute zum Geburtstag';

export default function render(body, api) {
  const cfg = api.config.geburtstag || {};
  const n = clamp(parseInt(cfg.kerzen, 10) || 5, 1, 40);
  const stage = h('div', { class: 'g-stage' });
  const canvas = h('canvas');
  stage.appendChild(canvas);
  const msg = h('p', { class: 'g-msg', text: 'Wünsch dir was und puste die Kerzen aus. Tipp auf die Flammen oder puste ins Mikrofon.' });
  const micBtn = h('button', { class: 'g-btn primary', type: 'button', text: '🎤 Pusten (Mikrofon)' });
  const relight = h('button', { class: 'g-btn', type: 'button', text: 'Kerzen wieder anzünden', hidden: true });
  body.append(h('div', { class: 'g' }, [stage, h('div', { class: 'g-row' }, [micBtn, relight]), msg]));

  let W, H, ctx, bg, candles = [], smoke = [], done = false, stream = null, micCtx = null, analyser = null, buf = null, blowFor = 0;

  function size() {
    ({ w: W, h: H, ctx } = fitCanvas(canvas, w => clamp(w * .8, 320, 470)));
    bg = starBackdrop(W, H, 2600);
    layout();
  }
  function layout() {
    const top = cakeGeom().y0;
    const cw = cakeGeom().w3 * .8;
    candles = Array.from({ length: n }, (_, i) => {
      const prev = candles[i];
      const row = n > 12 ? i % 2 : 0;
      const perRow = n > 12 ? Math.ceil(n / 2) : n;
      const k = n > 12 ? Math.floor(i / 2) : i;
      return { x: W / 2 - cw / 2 + (perRow === 1 ? cw / 2 : k / (perRow - 1) * cw), y: top - 4 + row * 10, lit: prev ? prev.lit : true, phase: Math.random() * 6, color: ['#ff8fc7', '#8fd0ff', '#ffd27a', '#c9a2ff'][i % 4] };
    });
  }
  function cakeGeom() {
    const w1 = Math.min(W * .62, 300), w2 = w1 * .78, w3 = w1 * .58;
    const base = H - 34, t1 = Math.min(H * .2, 78), t2 = t1 * .85, t3 = t1 * .75;
    return { w1, w2, w3, base, t1, t2, t3, y0: base - t1 - t2 - t3 };
  }

  function tier(x, y, w, hgt, c1, c2) {
    const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    g.addColorStop(0, c2); g.addColorStop(.5, c1); g.addColorStop(1, c2);
    ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x - w / 2, y, w, hgt, 10) : ctx.rect(x - w / 2, y, w, hgt); ctx.fill();
    // icing with drips
    ctx.fillStyle = '#fff1f8';
    ctx.beginPath(); ctx.moveTo(x - w / 2, y + 6);
    const drips = Math.round(w / 22);
    for (let i = 0; i <= drips; i++) {
      const px = x - w / 2 + i / drips * w, d = 8 + ((i * 37) % 11);
      ctx.quadraticCurveTo(px - w / drips / 2, y + 6, px - 4, y + d); ctx.quadraticCurveTo(px, y + d + 6, px + 4, y + d);
    }
    ctx.lineTo(x + w / 2, y + 6); ctx.lineTo(x + w / 2, y); ctx.lineTo(x - w / 2, y); ctx.closePath(); ctx.fill();
    // sprinkles
    const cols = ['#ffd27a', '#8fd0ff', '#ff6fb1', '#c9a2ff', '#ffffff'];
    for (let i = 0; i < w / 9; i++) {
      const sx = x - w / 2 + 8 + ((i * 53) % (w - 16)), sy = y + 22 + ((i * 29) % Math.max(4, hgt - 30));
      ctx.save(); ctx.translate(sx, sy); ctx.rotate(i); ctx.fillStyle = cols[i % cols.length]; ctx.fillRect(-3, -1, 6, 2); ctx.restore();
    }
  }

  function draw(now) {
    ctx.drawImage(bg, 0, 0, W, H);
    const G = cakeGeom(), cx = W / 2;
    // glow behind the cake
    const rg = ctx.createRadialGradient(cx, G.base - 60, 10, cx, G.base - 60, W * .6);
    rg.addColorStop(0, `rgba(255,120,190,${done ? .18 : .35})`); rg.addColorStop(1, 'rgba(255,120,190,0)');
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
    // plate
    ctx.fillStyle = 'rgba(255,230,245,.85)'; ctx.beginPath(); ctx.ellipse(cx, G.base + 4, G.w1 * .62, 12, 0, 0, Math.PI * 2); ctx.fill();
    tier(cx, G.base - G.t1, G.w1, G.t1, '#ff8fc7', '#d94b8f');
    tier(cx, G.base - G.t1 - G.t2, G.w2, G.t2, '#ffb3d4', '#e06aa3');
    tier(cx, G.y0, G.w3, G.t3, '#ffd6ea', '#ee8fbd');
    // candles
    for (const c of candles) {
      const ch = 34;
      ctx.fillStyle = c.color; ctx.fillRect(c.x - 3, c.y - ch, 6, ch);
      ctx.fillStyle = 'rgba(255,255,255,.6)';
      for (let s = 0; s < 4; s++) ctx.fillRect(c.x - 3, c.y - ch + 4 + s * 8, 6, 2);
      if (c.lit) {
        const fl = 1 + Math.sin(now * 14 + c.phase) * .12 + Math.sin(now * 23 + c.phase) * .06;
        const fy = c.y - ch - 10;
        const glow = ctx.createRadialGradient(c.x, fy, 0, c.x, fy, 30);
        glow.addColorStop(0, 'rgba(255,210,120,.65)'); glow.addColorStop(1, 'rgba(255,170,80,0)');
        ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(c.x, fy, 30, 0, Math.PI * 2); ctx.fill();
        ctx.save(); ctx.translate(c.x, fy); ctx.scale(1, fl);
        const fg = ctx.createRadialGradient(0, 3, 1, 0, 0, 10);
        fg.addColorStop(0, '#fff'); fg.addColorStop(.4, '#ffe08a'); fg.addColorStop(1, '#ff8a3c');
        ctx.fillStyle = fg; ctx.beginPath(); ctx.moveTo(0, -12); ctx.quadraticCurveTo(7, 0, 0, 7); ctx.quadraticCurveTo(-7, 0, 0, -12); ctx.fill();
        ctx.restore();
      } else {
        ctx.strokeStyle = '#3a2a2a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(c.x, c.y - ch); ctx.lineTo(c.x, c.y - ch - 5); ctx.stroke();
      }
    }
    for (let i = smoke.length - 1; i >= 0; i--) {
      const s = smoke[i]; s.life -= .012; s.y -= .7; s.x += Math.sin(now * 3 + s.p) * .4;
      if (s.life <= 0) { smoke.splice(i, 1); continue; }
      ctx.fillStyle = `rgba(220,210,230,${s.life * .35})`; ctx.beginPath(); ctx.arc(s.x, s.y, 4 + (1 - s.life) * 8, 0, Math.PI * 2); ctx.fill();
    }
    if (done) {
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
      ctx.font = `400 ${Math.round(clamp(W * .075, 28, 46))}px "Great Vibes", cursive`;
      ctx.shadowColor = '#ff4fa3'; ctx.shadowBlur = 18;
      ctx.fillText('Happy Birthday, ' + (api.config.ihrName || 'Schatz') + '!', W / 2, 52);
      ctx.shadowBlur = 0;
    }
  }

  function blowOut(c) {
    if (!c.lit) return;
    c.lit = false;
    for (let i = 0; i < 6; i++) smoke.push({ x: c.x, y: c.y - 44, life: 1, p: Math.random() * 6 });
    api.sfx('blow');
    if (candles.every(k => !k.lit)) celebrate();
  }

  function celebrate() {
    done = true;
    stopMic();
    msg.className = 'g-msg win';
    msg.textContent = cfg.wunsch || 'Alles Gute zum Geburtstag!';
    relight.hidden = false; micBtn.hidden = true;
    api.confetti({ count: 220 });
    api.fireworks(4);
    api.birthdaySong();
  }

  canvas.addEventListener('pointerdown', e => {
    if (done) return;
    const r = canvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    let best = null, bd = 34;
    for (const c of candles) { const d = Math.hypot(c.x - x, c.y - 44 - y); if (c.lit && d < bd) { bd = d; best = c; } }
    if (best) blowOut(best);
  });

  async function startMic() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false } });
      const AC = window.AudioContext || window.webkitAudioContext;
      micCtx = new AC();
      const src = micCtx.createMediaStreamSource(stream);
      analyser = micCtx.createAnalyser(); analyser.fftSize = 512; buf = new Float32Array(analyser.fftSize);
      src.connect(analyser);
      micBtn.textContent = '🎤 Jetzt pusten!';
      micBtn.disabled = true;
    } catch (e) {
      msg.textContent = 'Kein Mikrofon erlaubt. Dann einfach auf die Flammen tippen.';
      micBtn.hidden = true;
    }
  }
  function stopMic() {
    if (stream) stream.getTracks().forEach(t => t.stop());
    if (micCtx) micCtx.close().catch(() => {});
    stream = null; micCtx = null; analyser = null;
  }
  function listen(dt) {
    if (!analyser || done) return;
    analyser.getFloatTimeDomainData(buf);
    let s = 0; for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
    const rms = Math.sqrt(s / buf.length);
    if (rms > .12) {
      blowFor += dt;
      if (blowFor > .12) { const lit = candles.filter(c => c.lit); if (lit.length) blowOut(lit[Math.floor(Math.random() * lit.length)]); blowFor = 0; }
    } else blowFor = Math.max(0, blowFor - dt);
  }

  micBtn.addEventListener('click', startMic);
  relight.addEventListener('click', () => {
    done = false; candles.forEach(c => (c.lit = true)); relight.hidden = true; micBtn.hidden = false; micBtn.disabled = false; micBtn.textContent = '🎤 Pusten (Mikrofon)';
    msg.className = 'g-msg'; msg.textContent = 'Nochmal wünschen? Na klar.';
  });

  const onResize = () => size();
  addEventListener('resize', onResize);
  size();
  const L = loop((dt, now) => { listen(dt); draw(now); });
  return () => { L.stop(); stopMic(); removeEventListener('resize', onResize); };
}
