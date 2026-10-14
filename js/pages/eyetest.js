import { h } from '../core/utils.js';

export const title = 'Sehtest für Profis';

// rows of an eye chart: [visus, text, size in rem]
const ROWS = [
  ['0,1', 'E', 4.2],
  ['0,2', 'I C H', 2.9],
  ['0,3', 'L I E B E', 2.2],
  ['0,5', 'D I C H', 1.65],
  ['0,7', 'A M E L I E', 1.2],
  ['0,8', 'DU BIST DIE BESTE MFA', .78],
  ['1,0', 'UND DIE SÜSSESTE NERVENSÄGE DER WELT', .52],
  ['1,25', 'ps: ich hab hunger. du bestimmt auch.', .36]
];

export default function render(body, api) {
  const name = api.config.ihrName || 'Schatz';
  const chart = h('div', { class: 'eye-chart' }, ROWS.map(([v, t, s]) => h('div', { class: 'eye-row' }, [
    h('span', { class: 'eye-v', text: v }),
    h('span', { class: 'eye-t', text: t.replace('AMELIE', name.toUpperCase().split('').join(' ')).replace('A M E L I E', name.toUpperCase().split('').join(' ')), style: { fontSize: s + 'rem' } })
  ])));
  const result = h('div', { class: 'eye-result', hidden: true }, [
    h('h3', { text: 'Befund' }),
    h('p', { html: '<b>Visus:</b> 1,0 beidseits. Durchblick: hervorragend (beruflich bedingt).' }),
    h('p', { html: '<b>Diagnose:</b> unheilbar verliebt, seit dem 24.12.2025. Bekannt seit der Kindheit.' }),
    h('p', { html: '<b>Nebenbefunde:</b> akuter Hunger, gelegentliches Jammern, chronisches Mir-auf-die-Nerven-Gehen.' }),
    h('p', { html: '<b>Therapie:</b> lebenslang Aaron. Keine Nebenwirkungen bekannt. Außer Küsse.' })
  ]);
  const btn = h('button', { class: 'g-btn primary', type: 'button', text: 'Befund anzeigen' });
  btn.addEventListener('click', () => { result.hidden = false; btn.hidden = true; api.sfx('magic'); api.confetti({ count: 90 }); });
  body.append(h('div', { class: 'g' }, [
    h('p', { class: 'g-lead', text: `Kleiner Sehtest unter Profis. Lies die Zeilen von oben nach unten, so weit du kommst. Für eine MFA aus der Augenklinik sollte das ja ein Klacks sein, ${name}.` }),
    chart, h('div', { class: 'g-row center' }, [btn]), result
  ]));
}
