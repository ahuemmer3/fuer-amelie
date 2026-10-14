import { h } from '../core/utils.js';

export const title = 'Wunschstern';

export default function render(body, api) {
  const area = h('textarea', { class: 'wish-area', id: 'wishText', maxlength: '140', rows: '3', placeholder: 'Ich wünsche mir …' });
  const send = h('button', { class: 'g-btn gold', type: 'button', text: 'Wunsch in die Galaxie schicken' });
  const msg = h('p', { class: 'g-msg' });
  const list = h('ul', { class: 'wish-list' });
  const stage = h('div', { style: { position: 'relative', minHeight: '0' } });
  body.append(h('div', { class: 'g' }, [
    h('p', { class: 'g-lead', text: 'Schreib einen Wunsch auf. Er wird zu einem goldenen Stern und fliegt in unsere Galaxie, wo er für immer weiterleuchtet.' }),
    area, h('div', { class: 'g-row' }, [send]), stage, msg, list
  ]));

  const renderList = () => {
    list.innerHTML = '';
    api.wishes().slice(-6).reverse().forEach(w => list.appendChild(h('li', { text: w.text })));
  };
  renderList();

  let closeTimer = 0;
  send.addEventListener('click', () => {
    const text = area.value.trim();
    if (text.length < 2) { area.classList.remove('shake'); void area.offsetWidth; area.classList.add('shake'); area.focus(); return; }
    send.disabled = true; area.disabled = true;
    // text collapses into a star
    const fly = h('div', { text, style: {
      position: 'absolute', left: '0', right: '0', top: '-120px', textAlign: 'center', font: 'italic 600 1.3rem "Cormorant Garamond", serif', color: '#ffe7b0',
      transition: 'transform 1.4s cubic-bezier(.6,0,.3,1), opacity 1.4s, filter 1.4s, letter-spacing 1.4s', textShadow: '0 0 18px #ffcf73'
    } });
    stage.appendChild(fly);
    area.style.opacity = '.3';
    requestAnimationFrame(() => requestAnimationFrame(() => {
      Object.assign(fly.style, { transform: 'translateY(-60px) scale(.05)', opacity: '0', filter: 'blur(6px)', letterSpacing: '-0.5em' });
    }));
    api.sfx('magic');
    api.addWish(text);
    api.complete();
    area.value = '';
    msg.className = 'g-msg win';
    msg.textContent = 'Dein Wunsch ist unterwegs. Schau ihm hinterher …';
    renderList();
    closeTimer = setTimeout(() => api.close(), 2200);
  });

  return () => clearTimeout(closeTimer);
}
