import { h, shuffle } from '../core/utils.js';

export const title = 'Hawking-Strahlung';

export default function render(body, api) {
  const reasons = api.config.gruende;
  const order = shuffle(reasons.map((_, i) => i));
  let pos = 0;
  const bh = h('div', { class: 'rs-bh', 'aria-hidden': 'true' });
  const text = h('p', { class: 'rs-text', 'aria-live': 'polite', text: 'Drück den Knopf. Das Loch ist bereit.' });
  const count = h('p', { class: 'rs-count' });
  const btn = h('button', { class: 'g-btn primary', type: 'button', text: 'Strahlung auslösen' });
  body.append(h('div', { class: 'rs' }, [
    h('p', { class: 'g-lead', text: 'Eigentlich entkommt einem schwarzen Loch nichts. Stephen Hawking hat aber gezeigt, dass es ganz leise strahlt. Aus diesem hier kommen Gründe, warum ich dich liebe.' }),
    bh, text, btn, count
  ]));
  const seen = new Set();
  btn.addEventListener('click', () => {
    const i = order[pos++ % order.length];
    seen.add(i);
    text.textContent = reasons[i];
    text.classList.remove('pop'); void text.offsetWidth; text.classList.add('pop');
    bh.classList.remove('burst'); void bh.offsetWidth; bh.classList.add('burst');
    count.textContent = `${seen.size} von ${reasons.length} Gründen entkommen`;
    api.sfx('magic');
    if (seen.size === reasons.length) api.confetti({ count: 120 });
  });
}
