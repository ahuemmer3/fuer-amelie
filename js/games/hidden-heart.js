import { h } from '../core/utils.js';
import { stats } from './kit.js';

export const title = 'Finde das versteckte Herz';

const ROUNDS = [
  { n: 6, find: '❤️', among: ['🧡'], hint: 'Ein rotes Herz versteckt sich zwischen den orangenen.' },
  { n: 8, find: '💖', among: ['💗'], hint: 'Jetzt wird’s kniffliger: Welches Herz funkelt?' },
  { n: 9, find: '❤️', among: ['🍓', '🌹', '🍒'], hint: 'Letzte Runde: Ein Herz zwischen lauter roten Dingen.' }
];

export default function render(body, api) {
  const st = stats({ round: 'Runde', time: 'Zeit', miss: 'Daneben' });
  const lead = h('p', { class: 'g-lead' });
  const grid = h('div', { class: 'hh-grid' });
  const msg = h('p', { class: 'g-msg' });
  const again = h('button', { class: 'g-btn', type: 'button', text: 'Nochmal spielen', hidden: true });
  body.append(h('div', { class: 'g' }, [st.el, lead, grid, msg, h('div', { class: 'g-row' }, [again])]));

  let r = 0, misses = 0, start = 0, timer = 0, locked = false;

  function round() {
    const R = ROUNDS[r];
    locked = false;
    lead.textContent = R.hint;
    st.set('round', `${r + 1}/${ROUNDS.length}`); st.set('miss', misses);
    grid.innerHTML = '';
    grid.style.gridTemplateColumns = `repeat(${R.n}, 1fr)`;
    const target = Math.floor(Math.random() * R.n * R.n);
    for (let i = 0; i < R.n * R.n; i++) {
      const isTarget = i === target;
      const b = h('button', { type: 'button', text: isTarget ? R.find : R.among[Math.floor(Math.random() * R.among.length)], 'aria-label': isTarget ? 'Herz' : 'Kein Herz' });
      b.style.transform = `rotate(${(Math.random() - .5) * 24}deg)`;
      b.addEventListener('click', () => {
        if (locked) return;
        if (isTarget) {
          locked = true; b.classList.add('found'); api.sfx('match');
          if (r < ROUNDS.length - 1) { msg.textContent = 'Gefunden!'; setTimeout(() => { r++; msg.textContent = ''; round(); }, 900); }
          else finish();
        } else {
          misses++; st.set('miss', misses); api.sfx('wrong');
          b.classList.remove('miss'); void b.offsetWidth; b.classList.add('miss');
        }
      });
      grid.appendChild(b);
    }
  }

  function finish() {
    clearInterval(timer);
    const secs = Math.round((Date.now() - start) / 1000);
    msg.className = 'g-msg win';
    msg.textContent = `Alle Herzen gefunden in ${secs} Sekunden${misses ? ` (${misses}× daneben)` : ', ohne Fehler'}! Meins hast du übrigens schon lange gefunden.`;
    again.hidden = false;
    api.sfx('win'); api.confetti(); api.complete();
  }

  function begin() {
    r = 0; misses = 0; start = Date.now(); again.hidden = true; msg.className = 'g-msg'; msg.textContent = '';
    clearInterval(timer);
    timer = setInterval(() => st.set('time', `${Math.round((Date.now() - start) / 1000)} s`), 500);
    round();
  }
  again.addEventListener('click', begin);
  begin();
  return () => clearInterval(timer);
}
