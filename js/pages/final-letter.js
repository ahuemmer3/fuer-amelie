import { h, photoUrl } from '../core/utils.js';

export const title = 'Das letzte Geheimnis';
/** keep the 3D scene running behind this overlay so the fireworks are visible */
export const live = true;

export default function render(body, api) {
  const L = api.config.liebesbrief;
  const paras = L.absaetze.map(t => h('p', { text: t }));
  const sign = h('p', { class: 'sign' }, [h('small', { text: L.gruss }), api.config.deinName]);
  sign.style.opacity = '0'; sign.style.transition = 'opacity 1.4s ease';
  const kids = [];
  if (L.foto) kids.push(h('img', { class: 'letter-photo', src: photoUrl(L.foto), alt: '' }));
  kids.push(h('h3', { text: L.anrede }), ...paras, sign);
  body.append(h('article', { class: 'letter' }, kids));

  const timers = [];
  paras.forEach((p, i) => timers.push(setTimeout(() => p.classList.add('in'), 700 + i * 1600)));
  timers.push(setTimeout(() => { sign.style.opacity = '1'; api.heartRain(); }, 900 + paras.length * 1600));

  api.sfx('magic');
  api.fireworks(6);
  let n = 0;
  const fw = setInterval(() => { if (++n > 6) clearInterval(fw); api.fireworks(2); }, 2600);
  timers.push(setTimeout(() => api.complete(), 1500));
  return () => { timers.forEach(clearTimeout); clearInterval(fw); };
}
