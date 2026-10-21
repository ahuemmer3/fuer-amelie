import { h, thumbUrl } from '../core/utils.js';
import { loop } from './kit.js';
import { Particles, Rings } from './fx.js';

export const title = 'Wie gut kennst du uns?';

export default function render(body, api) {
  const Q = api.config.quiz;
  const results = [...api.config.quizErgebnisse].sort((a, b) => b.ab - a.ab);
  const avatar = thumbUrl(api.config.quizBild || api.config.memoryFotos[0]);
  const root = h('div', { class: 'qz' });
  const fxCanvas = h('canvas', { class: 'qz-fx' });
  body.append(root, fxCanvas);
  let i = 0, score = 0, answers = [], timers = [];
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));

  // sparkles on top of the panel
  const P = new Particles(), RG = new Rings();
  let fctx = null, FW = 0, FH = 0;
  function sizeFx() {
    const r = body.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
    FW = r.width; FH = Math.max(r.height, body.scrollHeight); fxCanvas.width = FW * dpr; fxCanvas.height = FH * dpr;
    fxCanvas.style.height = FH + 'px';
    fctx = fxCanvas.getContext('2d'); fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  const fx = loop(dt => { if (!fctx) return; P.update(dt); RG.update(dt); fctx.clearRect(0, 0, FW, FH); RG.draw(fctx); P.draw(fctx); });
  function burstAt(el, colors) {
    sizeFx();
    const r = el.getBoundingClientRect(), b = body.getBoundingClientRect();
    const x = r.left - b.left + r.width / 2, y = r.top - b.top + body.scrollTop + r.height / 2;
    P.burst(x, y, { n: 30, colors, speed: 300, gravity: 200 });
    RG.add(x, y, { color: colors[0], r1: r.width * .55, width: 4, life: .6 });
  }

  function track() {
    return h('div', { class: 'qz-track' }, Q.map((_, k) => h('span', { class: 'qz-planet' + (k < i ? (answers[k] ? ' ok' : ' no') : k === i ? ' now' : '') }, [h('i')])));
  }

  function typewriter(el, text) {
    el.textContent = '';
    [...text].forEach((ch, k) => { const s = h('span', { text: ch }); s.style.animationDelay = (k * 22) + 'ms'; el.appendChild(s); });
  }

  function question() {
    root.innerHTML = '';
    const q = Q[i];
    const qText = h('h3', { class: 'qz-q' });
    const list = h('div', { class: 'qz-answers' });
    const bubble = h('div', { class: 'qz-bubble', hidden: true }, [h('img', { src: avatar, alt: '' }), h('p')]);
    const next = h('button', { class: 'g-btn primary qz-next', type: 'button', hidden: true, text: i < Q.length - 1 ? 'Nächste Frage →' : 'Zum Ergebnis ✦' });
    q.antworten.forEach((a, k) => {
      const b = h('button', { type: 'button', class: 'qz-a' }, [h('b', { text: 'ABCD'[k] }), h('span', { text: a })]);
      b.style.animationDelay = (200 + k * 90 + q.frage.length * 18) + 'ms';
      b.addEventListener('click', () => choose(k, b));
      list.appendChild(b);
    });
    function choose(k, btn) {
      const right = k === q.richtig;
      answers[i] = right; if (right) score++;
      [...list.children].forEach((c, n) => { c.disabled = true; if (n === q.richtig) c.classList.add('right'); else if (n === k) c.classList.add('wrong'); else c.classList.add('dim'); });
      api.sfx(right ? 'right' : 'wrong');
      if (right) burstAt(btn, ['#ffcf73', '#ffffff', '#ff8fc7']);
      bubble.querySelector('p').textContent = (right ? 'Richtig! ' : 'Knapp daneben! ') + (q.kommentar || '');
      later(() => { bubble.hidden = false; }, 350);
      later(() => { next.hidden = false; next.focus({ preventScroll: true }); }, 650);
    }
    next.addEventListener('click', () => { i++; if (i < Q.length) question(); else result(); });
    root.append(track(), h('p', { class: 'qz-kicker', text: `Frage ${i + 1} von ${Q.length}` }), qText, list, bubble, h('div', { class: 'g-row' }, [next]));
    typewriter(qText, q.frage);
    sizeFx();
  }

  function result() {
    root.innerHTML = '';
    const r = results.find(x => score >= x.ab) || results[results.length - 1];
    const pct = score / Q.length;
    const C = 2 * Math.PI * 54;
    const ring = h('div', { class: 'qz-result', html: `
      <svg viewBox="0 0 120 120" class="qz-ring"><defs><linearGradient id="qzg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff4fa3"/><stop offset="1" stop-color="#ffcf73"/></linearGradient></defs>
        <circle cx="60" cy="60" r="54" class="qz-ring-bg"/><circle cx="60" cy="60" r="54" class="qz-ring-fg" style="stroke-dasharray:${C};stroke-dashoffset:${C}"/></svg>
      <div class="qz-score"><span class="qz-num">0</span><small>von ${Q.length}</small></div>` });
    root.append(track(), ring, h('p', { class: 'g-msg win qz-text', text: r.text }),
      h('div', { class: 'g-row center' }, [h('button', { class: 'g-btn', type: 'button', text: 'Nochmal spielen', onclick: () => { i = 0; score = 0; answers = []; question(); } })]));
    requestAnimationFrame(() => { ring.querySelector('.qz-ring-fg').style.strokeDashoffset = C * (1 - pct); });
    const num = ring.querySelector('.qz-num');
    for (let k = 0; k <= score; k++) later(() => { num.textContent = k; num.classList.remove('bump'); void num.offsetWidth; num.classList.add('bump'); if (k) api.sfx('tick'); }, 300 + k * 220);
    later(() => { api.sfx('win'); api.confetti({ count: 80 + score * 30 }); burstAt(ring, ['#ffcf73', '#ff8fc7', '#ffffff']); }, 400 + score * 220);
    api.complete();
  }

  question();
  return () => { timers.forEach(clearTimeout); fx.stop(); };
}
