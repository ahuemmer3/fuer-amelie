import { h } from '../core/utils.js';

export const title = 'Wie gut kennst du uns?';

export default function render(body, api) {
  const Q = api.config.quiz;
  const results = [...api.config.quizErgebnisse].sort((a, b) => b.ab - a.ab);
  const wrap = h('div', { class: 'g' });
  body.appendChild(wrap);
  let i = 0, score = 0, answers = [];

  function question() {
    wrap.innerHTML = '';
    const q = Q[i];
    const dots = h('div', { class: 'quiz-dots' }, Q.map((_, k) => h('i', { class: k < i ? (answers[k] ? 'ok' : 'no') : k === i ? 'now' : '' })));
    const list = h('div', { class: 'quiz-a' });
    const note = h('p', { class: 'g-msg' });
    const next = h('button', { class: 'g-btn primary', type: 'button', hidden: true, text: i < Q.length - 1 ? 'Nächste Frage' : 'Ergebnis' });
    q.antworten.forEach((a, k) => {
      const b = h('button', { type: 'button', text: a });
      b.addEventListener('click', () => {
        const right = k === q.richtig;
        answers[i] = right; if (right) score++;
        [...list.children].forEach((c, n) => { c.disabled = true; if (n === q.richtig) c.classList.add('right'); else if (n === k) c.classList.add('wrong'); });
        note.textContent = (right ? 'Richtig! ' : 'Nicht ganz. ') + (q.kommentar || '');
        api.sfx(right ? 'right' : 'wrong');
        next.hidden = false; next.focus({ preventScroll: true });
      });
      list.appendChild(b);
    });
    next.addEventListener('click', () => { i++; if (i < Q.length) question(); else result(); });
    wrap.append(dots, h('p', { class: 'ov-kicker', text: `Frage ${i + 1} von ${Q.length}` }), h('h3', { class: 'quiz-q', text: q.frage }), list, note, h('div', { class: 'g-row' }, [next]));
  }

  function result() {
    wrap.innerHTML = '';
    const r = results.find(x => score >= x.ab) || results[results.length - 1];
    wrap.append(
      h('p', { class: 'quiz-score', text: `${score} / ${Q.length}` }),
      h('p', { class: 'g-msg win', style: { textAlign: 'center' }, text: r.text }),
      h('div', { class: 'g-row center' }, [h('button', { class: 'g-btn', type: 'button', text: 'Nochmal spielen', onclick: () => { i = 0; score = 0; answers = []; question(); } })])
    );
    api.sfx('win'); api.confetti({ count: 80 + score * 30 }); api.complete();
  }

  question();
}
