import { h, thumbUrl, photoUrl } from '../core/utils.js';
import { stats } from './kit.js';

export const title = 'Foto-Puzzle';

export default function render(body, api) {
  const file = api.config.puzzleFoto;
  let N = 3;
  const st = stats({ moves: 'Züge', size: 'Größe' });
  const board = h('div', { class: 'puz' });
  const ref = h('img', { class: 'puz-ref', src: thumbUrl(file), alt: 'Vorlage' });
  const msg = h('p', { class: 'g-msg', text: 'Tippe ein Teil neben der Lücke an, um es zu verschieben.' });
  const shuffleBtn = h('button', { class: 'g-btn', type: 'button', text: 'Neu mischen' });
  const sizeBtn = h('button', { class: 'g-btn', type: 'button', text: '4 × 4 (schwer)' });
  body.append(h('div', { class: 'g' }, [st.el, board, h('div', { class: 'g-row' }, [ref, shuffleBtn, sizeBtn]), msg]));

  // square crop of the big photo for crisp tiles
  let src = thumbUrl(file);
  const big = new Image();
  big.onload = () => {
    const s = Math.min(big.width, big.height), c = document.createElement('canvas');
    c.width = c.height = Math.min(1024, s);
    c.getContext('2d').drawImage(big, (big.width - s) / 2, (big.height - s) * .38, s, s, 0, 0, c.width, c.height);
    try { src = c.toDataURL('image/jpeg', .85); tiles.forEach(t => (t.style.backgroundImage = `url("${src}")`)); } catch (e) { /* keep thumb */ }
  };
  big.src = photoUrl(file);

  let tiles = [], pos = [], empty = 0, moves = 0, solved = false;

  function build() {
    board.innerHTML = ''; board.classList.remove('solved');
    tiles = []; pos = []; moves = 0; solved = false;
    st.set('moves', 0); st.set('size', `${N} × ${N}`);
    msg.className = 'g-msg'; msg.textContent = 'Tippe ein Teil neben der Lücke an, um es zu verschieben.';
    for (let i = 0; i < N * N - 1; i++) {
      const t = h('button', { class: 'puz-tile', type: 'button', 'aria-label': `Teil ${i + 1}` });
      const gx = i % N, gy = Math.floor(i / N);
      Object.assign(t.style, {
        width: `calc(${100 / N}% - 3px)`, height: `calc(${100 / N}% - 3px)`,
        backgroundImage: `url("${src}")`, backgroundSize: `${N * 100}% ${N * 100}%`,
        backgroundPosition: `${gx / (N - 1) * 100}% ${gy / (N - 1) * 100}%`
      });
      t.addEventListener('click', () => move(i));
      tiles.push(t); board.appendChild(t);
      pos[i] = i;
    }
    empty = N * N - 1;
    shuffle();
    place();
  }

  function place() {
    tiles.forEach((t, i) => {
      const p = pos[i];
      t.style.left = `calc(${(p % N) * 100 / N}% + 1.5px)`;
      t.style.top = `calc(${Math.floor(p / N) * 100 / N}% + 1.5px)`;
    });
  }

  const neighbours = p => [p - N, p + N, p % N ? p - 1 : -1, (p + 1) % N ? p + 1 : -1].filter(q => q >= 0 && q < N * N);

  function shuffle() {
    let prev = -1;
    for (let k = 0; k < N * N * 30; k++) {
      const opts = neighbours(empty).filter(q => q !== prev);
      const q = opts[Math.floor(Math.random() * opts.length)];
      const ti = pos.indexOf(q);
      pos[ti] = empty; prev = empty; empty = q;
    }
    if (pos.every((p, i) => p === i)) shuffle();
  }

  function move(i) {
    if (solved) return;
    const p = pos[i];
    if (!neighbours(empty).includes(p)) { api.sfx('wrong'); tiles[i].classList.remove('shake'); void tiles[i].offsetWidth; tiles[i].classList.add('shake'); return; }
    pos[i] = empty; empty = p; moves++;
    st.set('moves', moves); api.sfx('tap');
    place();
    if (pos.every((q, k) => q === k)) win();
  }

  function win() {
    solved = true;
    const last = h('div', { class: 'puz-tile' });
    Object.assign(last.style, {
      width: `calc(${100 / N}% - 3px)`, height: `calc(${100 / N}% - 3px)`, left: `calc(${(N - 1) * 100 / N}% + 1.5px)`, top: `calc(${(N - 1) * 100 / N}% + 1.5px)`,
      backgroundImage: `url("${src}")`, backgroundSize: `${N * 100}% ${N * 100}%`, backgroundPosition: '100% 100%', opacity: 0, transition: 'opacity .6s'
    });
    board.appendChild(last);
    requestAnimationFrame(() => (last.style.opacity = 1));
    setTimeout(() => board.classList.add('solved'), 400);
    msg.className = 'g-msg win'; msg.textContent = `Gelöst in ${moves} Zügen! Wir zwei, wieder komplett.`;
    api.sfx('win'); api.confetti(); api.complete();
  }

  shuffleBtn.addEventListener('click', build);
  sizeBtn.addEventListener('click', () => { N = N === 3 ? 4 : 3; sizeBtn.textContent = N === 3 ? '4 × 4 (schwer)' : '3 × 3 (leicht)'; build(); });
  build();
}
