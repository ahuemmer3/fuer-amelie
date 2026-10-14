import { h, shuffle, thumbUrl } from '../core/utils.js';
import { stats } from './kit.js';

export const title = 'Foto-Memory';

export default function render(body, api) {
  const files = api.config.memoryFotos.slice(0, 8);
  const st = stats({ moves: 'Züge', pairs: 'Paare', time: 'Zeit' });
  const grid = h('div', { class: 'mem-grid' });
  const msg = h('p', { class: 'g-msg', text: 'Dreh zwei Karten um und finde die Paare.' });
  const again = h('button', { class: 'g-btn', type: 'button', text: 'Neu mischen' });
  body.append(h('div', { class: 'g' }, [st.el, grid, msg, h('div', { class: 'g-row' }, [again])]));

  let first = null, lock = false, moves = 0, pairs = 0, start = 0, timer = 0;
  const fmt = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  function deal() {
    clearInterval(timer); timer = 0; start = 0; first = null; lock = false; moves = 0; pairs = 0;
    st.set('moves', 0); st.set('pairs', `0/${files.length}`); st.set('time', '0:00');
    msg.className = 'g-msg'; msg.textContent = 'Dreh zwei Karten um und finde die Paare.';
    grid.innerHTML = '';
    shuffle([...files, ...files]).forEach(file => {
      const img = h('img', { src: thumbUrl(file), alt: '', draggable: 'false', loading: 'eager' });
      const card = h('button', { class: 'mem-card', type: 'button', 'aria-label': 'Verdeckte Karte' }, [
        h('span', { class: 'mem-in' }, [h('span', { class: 'mem-face mem-back' }), h('span', { class: 'mem-face mem-front' }, [img])])
      ]);
      card.dataset.k = file;
      card.addEventListener('click', () => flip(card));
      grid.appendChild(card);
    });
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
      setTimeout(() => {
        a.classList.add('matched'); card.classList.add('matched');
        a.classList.remove('open'); card.classList.remove('open');
      }, 250);
      pairs++; st.set('pairs', `${pairs}/${files.length}`);
      api.sfx('match');
      if (pairs === files.length) {
        clearInterval(timer);
        const secs = Math.floor((Date.now() - start) / 1000);
        setTimeout(() => {
          msg.className = 'g-msg win';
          msg.textContent = `Alle Paare in ${moves} Zügen und ${fmt(secs)} Minuten! Das schönste Paar bleibt aber unseres.`;
          api.confetti(); api.sfx('win'); api.complete();
        }, 700);
      }
    } else {
      lock = true;
      setTimeout(() => {
        a.classList.remove('open'); card.classList.remove('open');
        a.setAttribute('aria-label', 'Verdeckte Karte'); card.setAttribute('aria-label', 'Verdeckte Karte');
        lock = false;
      }, 900);
    }
  }

  again.addEventListener('click', deal);
  deal();
  return () => clearInterval(timer);
}
