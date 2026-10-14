import { h, photoUrl } from '../core/utils.js';

export const title = 'Geheimfach';

const WRONG = ['Leider nein. Versuch es nochmal.', 'Hmm, fast? Denk an die Frage.', 'Tipp: Groß- und Kleinschreibung ist egal.', 'Nicht aufgeben. Du weißt es!', 'Ich kann dir auch einen Hinweis geben. Frag mich einfach.'];

export default function render(body, api) {
  const cfg = api.config.geheimnis;
  const answers = [].concat(cfg.passwort).map(norm);
  const wrap = h('div', { class: 'g' });
  body.appendChild(wrap);

  if (api.isDone()) { reveal(false); return; }

  const input = h('input', { type: 'text', id: 'secretInput', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', placeholder: 'Passwort', 'aria-label': 'Passwort' });
  const btn = h('button', { class: 'g-btn primary', type: 'submit', text: 'Öffnen' });
  const form = h('form', { class: 'secret-form' }, [input, btn]);
  const msg = h('p', { class: 'g-msg' });
  wrap.appendChild(h('div', { class: 'secret-lock' }, [
    h('div', { class: 'secret-orb', text: '🔐' }),
    h('p', { class: 'g-lead', text: 'Dieses Fach öffnet sich nur mit der richtigen Antwort auf eine Frage, die nur du kennst:' }),
    h('p', { class: 'secret-q', text: cfg.frage }),
    form, msg
  ]));
  let tries = 0;
  form.addEventListener('submit', e => {
    e.preventDefault();
    if (answers.includes(norm(input.value))) { api.sfx('magic'); reveal(true); return; }
    msg.textContent = WRONG[Math.min(tries++, WRONG.length - 1)];
    api.sfx('wrong');
    form.classList.remove('shake'); void form.offsetWidth; form.classList.add('shake');
    input.select();
  });

  function reveal(fresh) {
    wrap.innerHTML = '';
    const kids = [h('h3', { text: cfg.titel })];
    if (cfg.foto) kids.push(h('img', { src: photoUrl(cfg.foto), alt: '' }));
    kids.push(h('p', { text: cfg.text }));
    wrap.appendChild(h('div', { class: 'secret-open' }, kids));
    if (fresh) { api.confetti(); api.complete(); }
  }
}

function norm(s) { return String(s).trim().toLowerCase().replace(/\s+/g, ' '); }
