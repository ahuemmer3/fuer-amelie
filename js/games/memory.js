import { h, shuffle, thumbUrl } from '../core/utils.js';
import { stats, loop } from './kit.js';
import { Particles, Rings } from './fx.js';

export const title = 'Foto-Memory';

const EMBLEM = `<svg viewBox="0 0 100 100" aria-hidden="true">
  <defs><linearGradient id="mg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff3c4"/><stop offset=".5" stop-color="#ffcf73"/><stop offset="1" stop-color="#c98a2e"/></linearGradient></defs>
  <ellipse cx="50" cy="52" rx="42" ry="15" fill="none" stroke="url(#mg)" stroke-width="2.2" transform="rotate(-18 50 52)" opacity=".9"/>
  <path d="M50 74 C30 60 22 50 22 39 C22 30 29 24 37 24 C43 24 47 27 50 32 C53 27 57 24 63 24 C71 24 78 30 78 39 C78 50 70 60 50 74Z" fill="url(#mg)"/>
  <circle cx="83" cy="40" r="3" fill="#fff"/><circle cx="17" cy="64" r="2" fill="#fff" opacity=".8"/>
</svg>`;

export default function render(body, api) {
  const files = api.config.memoryFotos.slice(0, 8);
  const st = stats({ moves: 'Züge', pairs: 'Paare', time: 'Zeit' });
  const wrap = h('div', { class: 'mem2-wrap' });
  const grid = h('div', { class: 'mem2' });
  const fxCanvas = h('canvas', { class: 'mem2-fx' });
  wrap.append(grid, fxCanvas);
  const msg = h('p', { class: 'g-msg', text: 'Dreh zwei Karten um und finde die Paare.' });
  const again = h('button', { class: 'g-btn', type: 'button', text: 'Neu mischen' });
  body.append(h('div', { class: 'g' }, [st.el, wrap, msg, h('div', { class: 'g-row' }, [again])]));

  let first = null, lock = false, moves = 0, pairs = 0, start = 0, timer = 0, cards = [];
  const fmt = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  // particle overlay
  const P = new Particles(), RG = new Rings();
  let fctx = null, FW = 0, FH = 0;
  function sizeFx() {
    const r = wrap.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
    FW = r.width; FH = r.height; fxCanvas.width = FW * dpr; fxCanvas.height = FH * dpr;
    fctx = fxCanvas.getContext('2d'); fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  const fx = loop(dt => { if (!fctx) return; P.update(dt); RG.update(dt); fctx.clearRect(0, 0, FW, FH); RG.draw(fctx); P.draw(fctx); });
  function sparkleAt(card, colors) {
    const r = card.getBoundingClientRect(), w = wrap.getBoundingClientRect();
    const x = r.left - w.left + r.width / 2, y = r.top - w.top + r.height / 2;
    P.burst(x, y, { n: 26, colors, speed: 260, gravity: 120 });
    RG.add(x, y, { color: colors[0], r1: r.width * .9, width: 4, life: .6 });
  }

  function deal() {
    clearInterval(timer); timer = 0; start = 0; first = null; lock = false; moves = 0; pairs = 0;
    st.set('moves', 0); st.set('pairs', `0/${files.length}`); st.set('time', '0:00');
    msg.className = 'g-msg'; msg.textContent = 'Dreh zwei Karten um und finde die Paare.';
    grid.innerHTML = ''; grid.classList.remove('won');
    cards = shuffle([...files, ...files]).map((file, i) => {
      const card = h('button', { class: 'mc dealing', type: 'button', 'aria-label': 'Verdeckte Karte' }, [
        h('span', { class: 'mc-in' }, [
          h('span', { class: 'mc-face mc-back', html: `<span class="mc-sheen"></span>${EMBLEM}` }),
          h('span', { class: 'mc-face mc-front' }, [h('img', { src: thumbUrl(file), alt: '', draggable: 'false' }), h('span', { class: 'mc-badge', text: '♥' })])
        ])
      ]);
      card.dataset.k = file;
      card.style.setProperty('--i', i);
      card.addEventListener('click', () => flip(card));
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--rx', ((e.clientY - r.top) / r.height - .5) * -18 + 'deg');
        card.style.setProperty('--ry', ((e.clientX - r.left) / r.width - .5) * 18 + 'deg');
      });
      card.addEventListener('pointerleave', () => { card.style.setProperty('--rx', '0deg'); card.style.setProperty('--ry', '0deg'); });
      grid.appendChild(card);
      return card;
    });
    // fly in from the middle of the board
    requestAnimationFrame(() => {
      const g = grid.getBoundingClientRect();
      cards.forEach(c => {
        const r = c.getBoundingClientRect();
        c.style.setProperty('--dx', (g.left + g.width / 2 - (r.left + r.width / 2)) + 'px');
        c.style.setProperty('--dy', (g.top + g.height / 2 - (r.top + r.height / 2)) + 'px');
        c.style.setProperty('--dr', (Math.random() * 40 - 20) + 'deg');
      });
      requestAnimationFrame(() => cards.forEach(c => c.classList.remove('dealing')));
      sizeFx();
    });
    api.sfx('whoosh');
  }

  function flip(card) {
    if (lock || card.classList.contains('open') || card.classList.contains('matched')) return;
    if (!start) { start = Date.now(); timer = setInterval(() => st.set('time', fmt(Math.floor((Date.now() - start) / 1000))), 1000); }
    card.classList.add('open'); card.setAttribute('aria-label', 'Foto');
    api.sfx('flip');
    if (!first) { first = card; return; }
    moves++; st.set('moves', moves);
    const a = first; first = null;
    if (a.dataset.k === card.dataset.k) {
      lock = true;
      setTimeout(() => {
        [a, card].forEach(c => { c.classList.add('matched'); sparkleAt(c, ['#ffcf73', '#ffffff', '#ff8fc7']); });
        api.sfx('match');
        lock = false;
        pairs++; st.set('pairs', `${pairs}/${files.length}`);
        if (pairs === files.length) win();
      }, 420);
    } else {
      lock = true;
      setTimeout(() => { [a, card].forEach(c => c.classList.add('miss')); api.sfx('wrong'); }, 520);
      setTimeout(() => {
        [a, card].forEach(c => { c.classList.remove('open', 'miss'); c.setAttribute('aria-label', 'Verdeckte Karte'); });
        lock = false;
      }, 1150);
    }
  }

  function win() {
    clearInterval(timer);
    const secs = Math.floor((Date.now() - start) / 1000);
    grid.classList.add('won');
    cards.forEach((c, i) => setTimeout(() => sparkleAt(c, ['#ff8fc7', '#ffd6ea', '#ffcf73']), i * 60));
    setTimeout(() => {
      msg.className = 'g-msg win';
      msg.textContent = `Alle Paare in ${moves} Zügen und ${fmt(secs)} Minuten! Das schönste Paar bleibt aber unseres.`;
      api.confetti(); api.sfx('win'); api.complete();
    }, 900);
  }

  again.addEventListener('click', deal);
  const onResize = () => sizeFx();
  addEventListener('resize', onResize);
  deal();
  return () => { clearInterval(timer); fx.stop(); removeEventListener('resize', onResize); };
}
