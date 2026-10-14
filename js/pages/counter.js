import { h, store } from '../core/utils.js';

export const title = 'Unsere Zeit';

export default function render(body, api) {
  const fromConfig = api.config.zusammenSeit;
  let since = fromConfig || store.get('zusammenSeit', '');
  const cells = {};
  const unit = (k, label) => { const b = h('b', { text: '0' }); cells[k] = b; return h('div', {}, [b, h('small', { text: label })]); };
  const lead = h('p', { class: 'g-lead' });
  const facts = h('ul', { class: 'cnt-facts' });
  const picker = h('div', { class: 'g-row', hidden: !!fromConfig }, [
    h('label', { for: 'sinceInput', class: 'ov-kicker', text: 'Wann hat alles angefangen?' }),
    h('input', { type: 'date', id: 'sinceInput', class: 'secret-form-input', style: { padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(255,170,215,.35)', background: 'rgba(0,0,0,.3)', color: '#fff', font: '600 1rem Manrope, sans-serif' } })
  ]);
  body.append(h('div', { class: 'g' }, [lead, h('div', { class: 'cnt' }, [unit('d', 'Tage'), unit('h', 'Stunden'), unit('m', 'Minuten'), unit('s', 'Sekunden')]), facts, picker]));
  const input = picker.querySelector('input');
  if (since) input.value = since;
  input.addEventListener('change', () => { since = input.value; store.set('zusammenSeit', since); tick(); });

  const n = x => Math.floor(x).toLocaleString('de-DE');
  function tick() {
    if (!since) { lead.textContent = 'Wähl unten das Datum, an dem alles angefangen hat. Dann läuft die Uhr.'; return; }
    const start = new Date(since + 'T00:00:00');
    let s = (Date.now() - start.getTime()) / 1000;
    if (isNaN(s)) return;
    if (s < 0) s = 0;
    lead.innerHTML = `Wir sind zusammen seit dem <b>${start.toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })}</b>. Und die Uhr läuft weiter.`;
    cells.d.textContent = n(s / 86400);
    cells.h.textContent = String(Math.floor(s % 86400 / 3600)).padStart(2, '0');
    cells.m.textContent = String(Math.floor(s % 3600 / 60)).padStart(2, '0');
    cells.s.textContent = String(Math.floor(s % 60)).padStart(2, '0');
    facts.innerHTML = '';
    [
      [`<b>${n(s * 29.78)} km</b> sind wir zusammen um die Sonne gereist (die Erde fliegt mit 29,78 km/s).`],
      [`<b>${(s / 86400 / 27.32).toLocaleString('de-DE', { maximumFractionDigits: 1 })}</b> Mal hat der Mond die Erde umkreist, seit es uns gibt.`],
      [`Ungefähr <b>${n(s / 60 * 72)}</b> Herzschläge. Meine schlagen bei dir allerdings schneller.`],
      [`<b>${n(s / 86400 * 3)}</b> Mal „Ich liebe dich“, wenn man großzügig drei pro Tag rechnet. Es waren mehr.`]
    ].forEach(([html]) => facts.appendChild(h('li', { html })));
  }
  tick();
  const timer = setInterval(tick, 1000);
  api.sfx('magic');
  return () => clearInterval(timer);
}
