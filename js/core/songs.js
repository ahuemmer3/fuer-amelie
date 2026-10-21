/**
 * Compositions (all original, except the traditional "Happy Birthday" melody which is public domain).
 *
 * Melody notation: "silbe:NOTE:DAUER" separated by spaces, durations in sixteenths.
 *   "kann~:G4:2"  → syllable joined to the next one without a space ("kann" + "ten")
 *   "_:4"         → rest
 *   "-:A4:2"      → note without lyrics (instrumental)
 *   "lie:B4:4+A4:12" → one syllable sung over two notes
 *   "|"           → starts a new lyric line (inside one string)
 * Lyrics can be changed as long as each line keeps the same number of syllables and durations.
 */
import { createBand } from './band.js';

const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
export function noteNum(s) {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(s);
  if (!m) throw new Error('Unbekannte Note: ' + s);
  return 12 * (parseInt(m[3], 10) + 1) + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}

/** parses a melody string into notes + lyric syllables (times in sixteenths, relative) */
function parseMelody(str, transpose = 0) {
  const notes = [], lines = [];
  let pos = 0, line = null;
  const newLine = () => { line = { syl: [] }; lines.push(line); };
  newLine();
  for (const tok of str.trim().split(/\s+/)) {
    if (tok === '|') { newLine(); continue; }
    const [syl, ...rest] = tok.split(':');
    if (syl === '_') { pos += parseFloat(rest[0]); continue; }
    const parts = rest.join(':').split('+').map(p => { const [n, d] = p.split(':'); return [noteNum(n) + transpose, parseFloat(d)]; });
    const start = pos;
    parts.forEach(([n, d]) => { notes.push({ n, at: pos, d }); pos += d; });
    if (syl !== '-') {
      const join = syl.endsWith('~');
      line.syl.push({ text: join ? syl.slice(0, -1) : syl, join, at: start, end: pos });
    }
  }
  return { notes, lines: lines.filter(l => l.syl.length), length: pos };
}

/* ------------------------------------------------------------------ chords */
const CHORDS = {
  C: [0, [0, 4, 7]], D: [2, [0, 4, 7]], E: [4, [0, 4, 7]], F: [5, [0, 4, 7]], G: [7, [0, 4, 7]], A: [9, [0, 4, 7]], B: [11, [0, 4, 7]],
  Em: [4, [0, 3, 7]], Am: [9, [0, 3, 7]], Bm: [11, [0, 3, 7]], 'F#m': [6, [0, 3, 7]], 'C#m': [1, [0, 3, 7]], Dm: [2, [0, 3, 7]]
};
function chord(name, transpose = 0) {
  const [root, iv] = CHORDS[name];
  const r = (root + transpose + 120) % 12;
  const voice = iv.map(i => { let n = 48 + ((r + i) % 12); while (n < 55) n += 12; while (n >= 67) n -= 12; return n; }).sort((a, b) => a - b);
  let bass = 36 + r; if (bass > 45) bass -= 12;
  return { voice, bass, root: r };
}

/* ------------------------------------------------------------------ "Amelie" */
const SONG_BPM = 112;
const VERSE_CHORDS = ['G', 'D', 'Em', 'C', 'G', 'D', 'C', 'D'];
const CHORUS_CHORDS = ['C', 'D', 'G', 'Em', 'C', 'D', 'G', 'G'];
const CHORUS = [
  'Hap~:E5:3 py:D5:1 Birth~:E5:4 day,:D5:4 A~:A4:2 me~:B4:2 lie,:D5:8 _:8',
  'du:B4:2 bist:B4:2 mein:C5:2 Lieb~:D5:4 lings~:B4:2 mensch,:G4:2 mein:A4:2 Licht,:B4:8 _:8',
  'auch:E5:2 wenn:E5:2 du:E5:2 jam~:G5:4 merst:E5:2 und:D5:2 mich:C5:2 nervst:D5:8 _:8',
  'oh~:D5:2 ne:E5:2 dich:D5:4 geht\'s:B4:2 ein~:A4:2 fach:B4:2 nicht!:G4:14 _:4'
];
const SECTIONS = [
  { name: 'intro', chords: ['G', 'D'], energy: 0, hook: true },
  { name: 'verse', chords: VERSE_CHORDS, energy: 1, lines: [
    'Wir:G4:2 kann~:G4:2 ten:A4:2 uns:B4:2 schon:B4:2 als:A4:2 Kin~:B4:4 der,:A4:8 _:8',
    'ha~:G4:2 ben:G4:2 zu~:B4:2 sam~:B4:2 men:B4:2 ge~:A4:2 spielt:G4:4 und:G4:2 ge~:A4:2 lacht,:G4:8 _:4',
    'doch:B4:2 erst:B4:2 Jah~:D5:4 re:B4:2 spä~:D5:2 ter:E5:2 an:D5:2 Weih~:D5:4 nach~:E5:2 ten:D5:8 _:2',
    'hat\'s:C5:2 bei:C5:2 uns:C5:2 bei~:B4:2 den:A4:2 end~:G4:2 lich:A4:2 Klick:D5:4 ge~:C5:2 macht.:A4:10 _:2'
  ] },
  { name: 'chorus', chords: CHORUS_CHORDS, energy: 2, lines: CHORUS },
  { name: 'verse', chords: VERSE_CHORDS, energy: 1, lines: [
    'Den:G4:2 gan~:G4:2 zen:A4:2 Tag:B4:2 schaust:B4:2 du:A4:2 in:B4:2 _:2 Au~:A4:4 gen,:F#4:4 _:8',
    'M~:D5:2 F~:D5:2 A:E5:2 mit:D5:2 Bril~:B4:2 le:G4:2 und:G4:2 _:2 Durch~:G4:4 blick,:E4:4 _:8',
    'doch:B4:2 kommt:B4:2 das:C5:2 Es~:D5:4 sen:B4:2 auf:A4:2 den:B4:2 Tisch,:A4:8 _:8',
    'dann:C5:2 hat:C5:2 nur:C5:2 noch:B4:2 dein:A4:2 Tel~:G4:2 ler:A4:2 dei~:B4:2 nen:A4:2 Blick.:D5:8 _:6'
  ] },
  { name: 'bridge', chords: ['Em', 'C', 'G', 'D'], energy: 1.5, lines: [
    'Heu~:E5:2 te:E5:2 wird:E5:2 ge~:D5:2 fei~:E5:2 ert,:D5:2 nur:B4:2 für:C5:2 dich,:E5:8 _:8',
    'Ku~:D5:2 chen,:B4:2 Ker~:D5:2 zen:B4:2 und:D5:2 na~:E5:2 tür~:F#5:2 lich:G5:2 ICH!:A5:8 _:8'
  ] },
  { name: 'chorus', chords: CHORUS_CHORDS, energy: 3, lines: CHORUS, transpose: 2 },
  { name: 'outro', chords: ['C', 'D', 'G'], energy: .5, transpose: 2, lines: [
    'Hap~:E5:3 py:D5:1 Birth~:E5:4 day,:D5:4 A~:C5:2 me~:B4:2 lie!:A4:4+G4:28'
  ] }
];

/** builds the full song: audio events (lazy scheduled) + timed lyrics for the karaoke view */
export function buildSong(S) {
  const band = createBand(S), bus = S.song, verb = S.songVerb;
  const s16 = 60 / SONG_BPM / 4, bar = 16 * s16;
  const events = [], lyrics = [];
  const ev = (t, fn) => events.push({ t, fn });
  let barIdx = 0, prevNote = null;

  for (const sec of SECTIONS) {
    const tr = sec.transpose || 0, e = sec.energy, secStart = barIdx * bar;
    // melody + lyrics
    (sec.lines || []).forEach((str, li) => {
      const m = parseMelody(str, tr);
      const lineStart = secStart + li * 2 * bar;
      if (Math.round(m.length) !== 32 && sec.name !== 'outro') console.warn('Song-Zeile hat nicht 32 Sechzehntel:', str);
      m.notes.forEach(nt => {
        const t = lineStart + nt.at * s16, d = nt.d * s16 * .95, from = prevNote && Math.abs(prevNote - nt.n) <= 4 ? prevNote : null;
        ev(t, at => band.lead(at, nt.n, d, { bus, verb, vel: e >= 2 ? .16 : .14, from }));
        if (e >= 2) ev(t, at => band.lead(at, nt.n - 12, d, { bus, verb, vel: .05 }));
        prevNote = nt.n;
      });
      m.lines.forEach(l => lyrics.push({ sec: sec.name, secIndex: SECTIONS.indexOf(sec), t0: lineStart + l.syl[0].at * s16, t1: lineStart + l.syl[l.syl.length - 1].end * s16, syl: l.syl.map(x => ({ text: x.text, join: x.join, t0: lineStart + x.at * s16, t1: lineStart + x.end * s16 })) }));
    });
    // accompaniment, bar by bar
    sec.chords.forEach((name, bi) => {
      const c = chord(name, tr), t0 = (barIdx + bi) * bar, last = bi === sec.chords.length - 1;
      const isEnd = sec.name === 'outro' && last;
      if (isEnd) {
        ev(t0, at => { band.keys(at, [...c.voice, c.voice[0] + 12], 3.5, { bus, verb, vel: .05 }); band.strings(at, c.voice.map(n => n + 12), 3.5, { bus, verb, vel: .02 }); band.bass(at, c.bass, 3, { bus }); band.crash(at, { bus, verb, vel: .1, len: 2.5 }); band.bell(at, c.voice[2] + 24, { bus, verb, vel: .06 }); });
        return;
      }
      // drums
      for (let s = 0; s < 16; s++) {
        const t = t0 + s * s16;
        if (e === 0) { if (s === 0) ev(t, at => band.kick(at, { bus, vel: .3 })); if (s % 4 === 2) ev(t, at => band.hat(at, { bus, vel: .03 })); continue; }
        if (e === 1.5) {
          if (s === 0) ev(t, at => band.kick(at, { bus, vel: .5 }));
          if (s === 8) ev(t, at => band.snare(at, { bus, verb, vel: .2 }));
          if (last && s >= 8) ev(t, at => band.snare(at, { bus, verb, vel: .06 + (s - 8) * .025 }));
          if (s % 2 === 0) ev(t, at => band.hat(at, { bus, vel: .03 }));
          continue;
        }
        if (e <= .5) continue;
        const kicks = e >= 2 ? [0, 6, 8] : [0, 8];
        if (kicks.includes(s)) ev(t, at => band.kick(at, { bus, vel: e >= 2 ? .6 : .48 }));
        if (s === 4 || s === 12) ev(t, at => band.snare(at, { bus, verb, vel: e >= 2 ? .24 : .17 }));
        if (e >= 2 && s === 12) ev(t, at => band.clap(at, { bus, verb }));
        if (e >= 2 || s % 2 === 0) ev(t, at => band.hat(at, { bus, vel: e >= 2 ? (s % 2 ? .025 : .045) : .04 }));
      }
      if (bi === 0 && e >= 2) ev(t0, at => band.crash(at, { bus, verb, vel: .1 }));
      if (sec.name === 'chorus' && bi === 0 && tr) ev(t0 - 2 * bar, at => band.swell(at, 2 * bar, { bus, verb, vel: .06 }));
      // bass
      if (e > 0) for (let s = 0; s < 16; s += 2) {
        const oct = e >= 2 && (s === 6 || s === 14) ? 12 : 0;
        ev(t0 + s * s16, at => band.bass(at, c.bass + oct, s16 * 1.8, { bus, vel: e >= 2 ? .13 : .1 }));
      } else ev(t0, at => band.bass(at, c.bass, bar * .9, { bus, vel: .08 }));
      // keys
      if (e >= 2) for (let s = 0; s < 16; s += 2) { const n = [...c.voice, c.voice[0] + 12][(s / 2) % 4]; ev(t0 + s * s16, at => band.keys(at, [n + 12], s16 * 2, { bus, verb, vel: .035 })); }
      else { ev(t0, at => band.keys(at, c.voice, bar * .5, { bus, verb, vel: .045 })); ev(t0 + 6 * s16, at => band.keys(at, c.voice, s16 * 2, { bus, verb, vel: .03 })); ev(t0 + 12 * s16, at => band.keys(at, c.voice, s16 * 3, { bus, verb, vel: .03 })); }
      // strings
      if (e >= 1.5) ev(t0, at => band.strings(at, c.voice.map(n => n + 12), bar, { bus, verb, vel: e >= 3 ? .022 : .016 }));
      // sparkle bells in the last chorus and the intro hook
      if (e >= 3) for (let s = 0; s < 16; s += 4) { const n = c.voice[(s / 4) % 3] + 24; ev(t0 + s * s16, at => band.bell(at, n, { bus, verb, vel: .03 })); }
    });
    if (sec.hook) {
      // intro: glockenspiel plays the chorus hook
      const m = parseMelody('-:E5:3 -:D5:1 -:E5:4 -:D5:4 -:A4:2 -:B4:2 -:D5:8 _:8', 12);
      m.notes.forEach(nt => ev(secStart + nt.at * s16, at => band.bell(at, nt.n, { bus, verb, vel: .07 })));
    }
    barIdx += sec.chords.length;
  }
  events.sort((a, b) => a.t - b.t);
  return { title: 'Amelie', events, lyrics, duration: barIdx * bar + 3 };
}

/* ------------------------------------------------------------------ Happy Birthday (party version) */
export function buildHappyBirthday(S) {
  const band = createBand(S), bus = S.song, verb = S.songVerb;
  const bpm = 132, s16 = 60 / bpm / 4, bar = 12 * s16;
  const mel = parseMelody(
    'Hap~:D4:3 py:D4:1 Birth~:E4:4 day:D4:4 to:G4:4 you,:F#4:8 | ' +
    'Hap~:D4:3 py:D4:1 Birth~:E4:4 day:D4:4 to:A4:4 you,:G4:8 | ' +
    'Hap~:D4:3 py:D4:1 Birth~:D5:4 day,:B4:4 lie~:G4:2 be:G4:2 A~:F#4:2 me~:F#4:2 lie,:E4:4 | ' +
    'Hap~:C5:3 py:C5:1 Birth~:B4:4 day:G4:4 to:A4:4 you!:G4:12');
  // first sixteenths are the pickup; bars start after 4 sixteenths
  const pickup = 4 * s16, events = [], ev = (t, fn) => events.push({ t, fn });
  mel.notes.forEach(nt => {
    const t = nt.at * s16, d = nt.d * s16 * .92;
    ev(t, at => { band.lead(at, nt.n, d, { bus, verb, vel: .15 }); band.bell(at, nt.n + 12, { bus, verb, vel: .03, len: .8 }); });
  });
  const chords = ['G', 'D', 'D', 'G', 'G', 'C', 'D', 'G'];
  chords.forEach((nm, i) => {
    const c = chord(nm), t0 = pickup + i * bar;
    const end = i === chords.length - 1;
    ev(t0, at => { band.bass(at, c.bass, s16 * 3.6, { bus, vel: .13 }); band.kick(at, { bus, vel: .45 }); });
    if (end) { ev(t0, at => { band.keys(at, c.voice, 2.5, { bus, verb, vel: .05 }); band.crash(at, { bus, verb, vel: .1 }); band.strings(at, c.voice.map(n => n + 12), 2, { bus, verb, vel: .02 }); }); return; }
    [4, 8].forEach(s => ev(t0 + s * s16, at => { band.keys(at, c.voice, s16 * 2.5, { bus, verb, vel: .04 }); band.hat(at, { bus, vel: .04 }); }));
    ev(t0 + 8 * s16, at => band.snare(at, { bus, verb, vel: .12 }));
  });
  ev(0, at => band.hat(at, { bus, vel: .05 }));
  // the name line, then a big finish with horns
  const endT = pickup + chords.length * bar;
  ev(endT - bar + 2 * s16, at => { band.horn(at, .5, { bus, pitch: 1 }); band.horn(at + .15, .7, { bus, pitch: 1.26 }); });
  ev(endT, at => { band.applause(at, 2.2, { bus, vel: .08 }); band.whistle(at + .3, { bus }); });
  const lyrics = mel.lines.map(l => ({ t0: l.syl[0].at * s16, t1: l.syl[l.syl.length - 1].end * s16, syl: l.syl.map(x => ({ text: x.text, join: x.join, t0: x.at * s16, t1: x.end * s16 })) }));
  events.sort((a, b) => a.t - b.t);
  return { title: 'Happy Birthday', events, lyrics, duration: endT + 2.5 };
}

/* ------------------------------------------------------------------ flight theme (original) */
/**
 * Music for the flight through the solar system, following the film's timing:
 * the solar system from above (organ, bells, the clock ticking) · the camera dives to the ship (swell)
 * · the flight with a heroic tune · towards the Earth, leading into the dive.
 */
export function buildFlightTheme(S, { OVERVIEW = 12, LAUNCH = 15.6, END = 42.4 } = {}) {
  const band = createBand(S), bus = S.cine, verb = S.bigVerb;
  const bar = 2.4, events = [], ev = (t, fn) => events.push({ t, fn });
  const pedal = c => 24 + c.root + (c.root > 7 ? 0 : 12);
  // 1 · from above: soft organ chords, twinkling bells
  const intro = ['Am', 'F', 'C', 'G', 'Am', 'F'].slice(0, Math.max(3, Math.round(OVERVIEW / bar)));
  intro.forEach((nm, i) => {
    const c = chord(nm), t0 = i * bar, k = i / (intro.length - 1);
    ev(t0, at => band.organ(at, pedal(c), bar + .2, { bus, verb, vel: .016 + .01 * k, bright: .15 }));
    c.voice.forEach((n, j) => ev(t0 + j * .05, at => band.organ(at, n + 12, bar + .3, { bus, verb, vel: .006 + .006 * k, bright: .4 })));
    [0, 3, 5, 6].forEach((st, j) => ev(t0 + st * bar / 8, at => band.bell(at, c.voice[j % 3] + 24 + (j === 3 ? 12 : 0), { bus, verb, vel: .03 + .015 * k })));
  });
  for (let t = 2.4; t < LAUNCH; t += 1.2) ev(t, at => band.tick(at, { bus, vel: .05 }));
  // 2 · down to the ship: tension and a swell
  const E = chord('E'), sw = LAUNCH - OVERVIEW;
  ev(OVERVIEW, at => band.organ(at, pedal(E), sw + .1, { bus, verb, vel: .03, bright: .3 }));
  ev(OVERVIEW, at => band.strings(at, E.voice.map(n => n + 12), sw, { bus, verb, vel: .016, attack: 1.2, cutoff: 2000 }));
  ev(OVERVIEW + .7, at => band.swell(at, sw - .7, { bus, verb, vel: .16 }));
  for (let k = 0; k < 10; k++) ev(LAUNCH - 1 + k * .1, at => band.timp(at, 33, { bus, verb, vel: .06 + k * .03 }));
  // 3 · we are with the ship
  const A = chord('Am');
  ev(LAUNCH, at => band.timp(at, 33, { bus, verb, vel: .7 }));
  ev(LAUNCH, at => band.brass(at, A.voice.map(n => n + 12), 1.6, { bus, verb, vel: .07 }));
  ev(LAUNCH, at => band.crash(at, { bus, verb, vel: .12 }));
  // 4 · the flight: organ ostinato, strings, a heroic tune on top
  const names = ['Am', 'F', 'C', 'G', 'Am', 'F', 'Dm', 'E'];
  const tune = [[[69, 2], [72, 1], [76, 1]], [[77, 3], [76, 1]], [[76, 2], [74, 1], [72, 1]], [[74, 4]],
    [[69, 2], [72, 1], [76, 1]], [[81, 3], [79, 1]], [[77, 2], [76, 1], [74, 1]], [[76, 2], [68, 2]]];
  const beat = bar / 4, e8 = bar / 8;
  names.forEach((nm, i) => {
    const c = chord(nm), t0 = LAUNCH + i * bar, k = i / (names.length - 1), v = c.voice;
    ev(t0, at => band.organ(at, pedal(c), bar, { bus, verb, vel: .022 + .02 * k, bright: .2 }));
    const pat = [v[0], v[1], v[2], v[0] + 12, v[2], v[1], v[0] + 12, v[1] + 12];
    pat.forEach((n, j) => ev(t0 + j * e8, at => band.organ(at, n, e8 * 1.05, { bus, verb, vel: .014 + .016 * k, bright: .3 + .5 * k })));
    if (i >= 1) ev(t0, at => band.strings(at, v.map(n => n + 12), bar, { bus, verb, vel: .011 + .012 * k, attack: .5, cutoff: 2400 }));
    if (i >= 2) ev(t0 + .02, at => band.organ(at, v[0] + 24, bar, { bus, verb, vel: .006 + .01 * k, bright: .9 }));
    if (i >= 3) [0, 2].forEach(bt => ev(t0 + bt * beat, at => band.timp(at, 33 + (c.root > 7 ? c.root - 12 : c.root), { bus, verb, vel: .2 + .2 * k })));
    let x = 0;
    tune[i].forEach(([n, len]) => { const st = t0 + x * beat; ev(st, at => band.lead(at, n, len * beat - .04, { bus, verb, vel: .05 + .03 * k, wet: .45 })); x += len; });
    if (i === 7) for (let j = 0; j < 16; j++) ev(t0 + j * bar / 16, at => band.timp(at, 33, { bus, verb, vel: .06 + j * .025 }));
  });
  // 5 · towards the Earth: it opens up and leads into the dive (D → G when we fall)
  const app = LAUNCH + names.length * bar, n = Math.max(1, Math.round((END - app) / bar)), len = (END - app) / n;
  [['F', [[69, 2], [72, 2]]], ['C', [[76, 2], [79, 2]]], ['D', [[78, 4]]]].slice(-n).forEach(([nm, mel], i) => {
    const c = chord(nm), t0 = app + i * len, bt = len / 4;
    ev(t0, at => band.organ(at, pedal(c), len + .3, { bus, verb, vel: .04, bright: .35 }));
    ev(t0, at => band.strings(at, c.voice.map(x => x + 12), len + .3, { bus, verb, vel: .026, attack: .4, cutoff: 3000 }));
    ev(t0 + .02, at => band.organ(at, c.voice[0] + 24, len, { bus, verb, vel: .016, bright: .9 }));
    let x = 0;
    mel.forEach(([m, l]) => { const st = t0 + x * bt; ev(st, at => band.lead(at, m, l * bt - .04, { bus, verb, vel: .08, wet: .5 })); x += l; });
  });
  ev(END - 2, at => band.swell(at, 2, { bus, verb, vel: .18 }));
  events.sort((x, y) => x.t - y.t);
  return { events, duration: END + .6 };
}
