import { h } from '../core/utils.js';

export const title = 'Dein Song';

const SECTION_NAMES = { verse: 'Strophe', chorus: 'Refrain', bridge: 'Bridge', outro: 'Schluss' };

export default function render(body, api) {
  const lyrics = api.songLyrics();
  const blocks = [];
  let last = null, verse = 0;
  lyrics.forEach(l => {
    if (!last || l.sec !== last.sec || l.secIndex !== last.secIndex) {
      if (l.sec === 'verse') verse++;
      blocks.push({ name: l.sec === 'verse' ? `${verse}. Strophe` : SECTION_NAMES[l.sec] || '', lines: [] });
    }
    blocks[blocks.length - 1].lines.push(l.syl.map((s, k) => s.text + (s.join || k === l.syl.length - 1 ? '' : ' ')).join(''));
    last = l;
  });

  const play = h('button', { class: 'g-btn primary', type: 'button', text: '▶ »Amelie« (mit Karaoke)' });
  const hb = h('button', { class: 'g-btn', type: 'button', text: '🎂 Happy Birthday' });
  const suno = api.sunoSong();
  const real = suno ? h('button', { class: 'g-btn gold', type: 'button', text: `🎶 ${suno.titel || 'Dein Song'}` }) : null;
  if (real) real.addEventListener('click', () => api.playSong('suno'));
  play.addEventListener('click', () => api.playSong('song'));
  hb.addEventListener('click', () => api.playSong('hb'));

  body.append(h('div', { class: 'g song-page' }, [
    h('p', { class: 'g-lead', text: 'Ein eigener Song, nur für dich. Text und Musik von Aaron (mit ein bisschen Hilfe aus dem Universum). Zum Mitsingen, Mitjammern und Mitessen.' }),
    h('div', { class: 'g-row' }, [real, play, hb]),
    h('div', { class: 'song-lyrics' }, blocks.map(b => h('div', { class: 'song-block' }, [h('small', { text: b.name }), ...b.lines.map(t => h('p', { text: t }))])))
  ]));
}
