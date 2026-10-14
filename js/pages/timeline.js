import { h, thumbUrl } from '../core/utils.js';

export const title = 'Unsere Momente';

export default function render(body, api) {
  const items = api.config.zeitstrahl;
  const tl = h('div', { class: 'tl' });
  items.forEach((it, i) => {
    const kids = [h('div', {}, [h('small', { text: it.datum }), h('h3', { text: it.titel }), h('p', { text: it.text })])];
    if (it.foto) {
      const img = h('img', { src: thumbUrl(it.foto), alt: it.titel, loading: 'lazy' });
      img.addEventListener('click', () => api.openPhoto(it.foto));
      kids.push(img);
    }
    const el = h('div', { class: 'tl-item' }, kids);
    el.style.animationDelay = `${i * 120}ms`;
    tl.appendChild(el);
  });
  body.append(h('div', { class: 'g' }, [h('p', { class: 'g-lead', text: 'Ein paar unserer wichtigsten Momente. Tippe auf ein Foto, um es groß zu sehen.' }), tl]));
}
