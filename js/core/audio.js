/**
 * Everything audible, generated with Web Audio (no files needed):
 *  - ambient score (or an MP3 from config) in the galaxy
 *  - cinematic music for the intro (through the galaxy, down to your house, into the party)
 *  - an epic driving track that plays only in "Herzen fangen"
 *  - "Happy Birthday" (public domain melody) for the cake
 *  - small sound effects
 * An analyser lets the heart and the accretion disk react to the music.
 */
import { createBand } from './band.js';

const midi = n => 440 * Math.pow(2, (n - 69) / 12);

const CHORDS = [
  { root: 36, notes: [48, 55, 59, 64, 67] },   // Cmaj7
  { root: 33, notes: [45, 52, 55, 60, 64] },   // Am7
  { root: 29, notes: [41, 48, 52, 57, 60] },   // Fmaj7
  { root: 31, notes: [43, 50, 55, 59, 62] }    // G6
];
const BELLS = [72, 74, 76, 79, 81, 84, 86, 88];
const BAR = 4.8;

// epic track: D minor, i – VI – III – VII
const EPIC = [
  { root: 38, chord: [50, 53, 57, 62] },  // Dm
  { root: 34, chord: [46, 50, 53, 58] },  // Bb
  { root: 41, chord: [53, 57, 60, 65] },  // F
  { root: 36, chord: [48, 52, 55, 60] }   // C
];
const EPIC_BPM = 136;

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.musicOn = false;
    this.sfxOn = true;
    this.lvl = 0;
    this.mode = 'none';
    this.el = null;
    this.nextBar = 0; this.bar = 0; this.timer = null;
    this.epicOn = false; this.epicStep = 0; this.epicNext = 0; this.epicTimer = null;
    this.ambientHold = 0;
  }

  /** Must be called from a user gesture (tap on "Öffnen"). */
  start({ file = '', volume = .7, holdAmbient = 0 } = {}) {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    // iPhone: play sound even when the silent switch is on (Safari 17+)
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* older iOS */ }
    const ctx = this.ctx = new AC();
    ctx.resume();
    this.volume = volume;

    this.master = ctx.createGain(); this.master.gain.value = 1;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -12; comp.ratio.value = 3;
    this.analyser = ctx.createAnalyser(); this.analyser.fftSize = 256; this.analyser.smoothingTimeConstant = .7;
    this.bins = new Uint8Array(this.analyser.frequencyBinCount);
    this.master.connect(comp); comp.connect(this.analyser); this.analyser.connect(ctx.destination);

    const bus = () => { const g = ctx.createGain(); g.gain.value = 0; g.connect(this.master); return g; };
    this.music = bus();     // ambient / MP3
    this.cine = bus();      // intro swell
    this.epic = bus();      // catch game track
    this.song = bus();      // happy birthday + the song for Amelie
    this.sfx = ctx.createGain(); this.sfx.gain.value = .5; this.sfx.connect(this.master);

    // reverb + delay shared by the generated music
    this.reverb = ctx.createConvolver(); this.reverb.buffer = this.impulse(3.6);
    const rv = ctx.createGain(); rv.gain.value = .9; this.reverb.connect(rv); rv.connect(this.music);
    this.delay = ctx.createDelay(1); this.delay.delayTime.value = .45;
    const fb = ctx.createGain(); fb.gain.value = .33; this.delay.connect(fb); fb.connect(this.delay);
    const dl = ctx.createGain(); dl.gain.value = .45; this.delay.connect(dl); dl.connect(this.music); dl.connect(this.reverb);
    this.bigVerb = ctx.createConvolver(); this.bigVerb.buffer = this.impulse(5);
    const bv = ctx.createGain(); bv.gain.value = .8; this.bigVerb.connect(bv); bv.connect(this.cine);
    this.epicVerb = ctx.createConvolver(); this.epicVerb.buffer = this.impulse(1.8);
    const ev = ctx.createGain(); ev.gain.value = .35; this.epicVerb.connect(ev); ev.connect(this.epic);
    this.songVerb = ctx.createConvolver(); this.songVerb.buffer = this.impulse(2.4);
    const sv = ctx.createGain(); sv.gain.value = .6; this.songVerb.connect(sv); sv.connect(this.song);

    // the ambient score can be held back until releaseAmbient() (intro, party, songs)
    this.ambientHold = holdAmbient === Infinity ? Infinity : ctx.currentTime + holdAmbient;
    if (file) {
      const el = this.el = new Audio();
      el.src = file; el.loop = true; el.preload = 'auto'; el.playsInline = true;
      ctx.createMediaElementSource(el).connect(this.music);
      this.mode = 'file';
      el.addEventListener('error', () => { if (this.mode === 'file') this.useGenerated(); }, { once: true });
      if (holdAmbient === 0) el.play().catch(() => {});
    } else this.useGenerated();
    this.musicOn = true;
    this.band = createBand(this);
    this.mix();
  }

  /** used when the intro was skipped via ?skip: a tap later still starts the audio */
  ensureStarted(cfg) { if (!this.ctx) this.start({ ...cfg, holdAmbient: 0 }); else if (this.ctx.state === 'suspended') this.ctx.resume(); }

  ambientAllowed() { return this.ctx && this.ctx.currentTime >= this.ambientHold && !this.songOn && !this.epicOn; }

  /** lets the calm galaxy score play (after intro / party / songs) */
  releaseAmbient() {
    if (!this.ctx) return;
    this.ambientHold = this.ctx.currentTime;
    if (this.mode === 'gen') this.nextBar = this.ctx.currentTime + .2;
    this.mix();
  }

  useGenerated() {
    this.mode = 'gen';
    if (this.el) { this.el.pause(); this.el = null; }
    this.nextBar = this.ctx.currentTime + .1;
    clearInterval(this.timer);
    this.timer = setInterval(() => this.schedule(), 150);
  }

  /** Sets the bus levels for the current state (music on/off, epic track active) */
  mix(delay = 0) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const set = (g, v, tc, d = 0) => { g.gain.cancelScheduledValues(now); g.gain.setValueAtTime(g.gain.value, now); g.gain.setTargetAtTime(v, now + d, tc); };
    const ambient = this.musicOn && this.ambientAllowed();
    set(this.music, ambient ? this.volume : 0, this.epicOn || this.songOn ? .4 : 1.2, delay);
    set(this.epic, this.musicOn && this.epicOn ? this.volume * .85 : 0, .3);
    set(this.cine, this.musicOn && now > (this.cineMutedUntil || 0) ? this.volume : 0, .05);
    set(this.song, this.musicOn ? this.volume : 0, .08);
    if (this.el) { if (ambient) this.el.play().catch(() => {}); else if (this.songOn || this.epicOn) setTimeout(() => !this.ambientAllowed() && this.el && this.el.pause(), 700); }
  }

  impulse(seconds) {
    const rate = this.ctx.sampleRate, len = Math.floor(rate * seconds);
    const buf = this.ctx.createBuffer(2, len, rate);
    for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    return buf;
  }

  /* ------------------------------------------------ ambient score */
  schedule() {
    if (!this.musicOn || this.mode !== 'gen' || !this.ambientAllowed()) return;
    const ctx = this.ctx;
    if (this.nextBar < ctx.currentTime) this.nextBar = ctx.currentTime + .05;
    while (this.nextBar < ctx.currentTime + 1.2) {
      const chord = CHORDS[this.bar % CHORDS.length], t = this.nextBar;
      chord.notes.forEach((n, i) => this.pad(midi(n), t + i * .04, BAR + 1.6, i === 0 ? .05 : .035));
      this.bass(midi(chord.root), t, BAR);
      for (let s = 0; s < 8; s++) {
        if (Math.random() < (s % 2 ? .28 : .5)) {
          const choices = BELLS.filter(b => chord.notes.some(n => (b - n) % 12 === 0) || Math.random() < .3);
          this.bell(midi(choices[Math.floor(Math.random() * choices.length)] || 72), t + s * (BAR / 8) + Math.random() * .03, .07 + Math.random() * .04);
        }
      }
      this.nextBar += BAR; this.bar++;
    }
  }
  pad(freq, t, dur, vol, out = this.reverb, dryOut = this.music) {
    const ctx = this.ctx, g = ctx.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 1.8); g.gain.setValueAtTime(vol, t + dur - 2.2); g.gain.linearRampToValueAtTime(0, t + dur);
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(700, t); f.frequency.linearRampToValueAtTime(1500, t + dur * .5); f.frequency.linearRampToValueAtTime(800, t + dur);
    [-7, 7].forEach((det, k) => {
      const o = ctx.createOscillator(); o.type = k ? 'sawtooth' : 'triangle'; o.frequency.value = freq; o.detune.value = det;
      const og = ctx.createGain(); og.gain.value = k ? .35 : 1; o.connect(og); og.connect(f); o.start(t); o.stop(t + dur + .1);
    });
    f.connect(g); g.connect(out);
    const dry = ctx.createGain(); dry.gain.value = .35; g.connect(dry); dry.connect(dryOut);
  }
  bass(freq, t, dur) {
    const ctx = this.ctx, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.12, t + .6); g.gain.exponentialRampToValueAtTime(.001, t + dur);
    o.connect(g); g.connect(this.music); o.start(t); o.stop(t + dur + .1);
  }
  bell(freq, t, vol, out = this.music) {
    const ctx = this.ctx, o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), g2 = ctx.createGain();
    o.type = 'sine'; o.frequency.value = freq; o2.type = 'sine'; o2.frequency.value = freq * 2.01; g2.gain.value = .25;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .006); g.gain.exponentialRampToValueAtTime(.0005, t + 2.4);
    o.connect(g); o2.connect(g2); g2.connect(g);
    if (out === this.music) { g.connect(this.delay); g.connect(this.reverb); } else g.connect(this.bigVerb);
    const dry = ctx.createGain(); dry.gain.value = .5; g.connect(dry); dry.connect(out);
    o.start(t); o2.start(t); o.stop(t + 2.6); o2.stop(t + 2.6);
  }

  /* ------------------------------------------------ drums & hits (shared) */
  noiseBuf() {
    if (this._nb) return this._nb;
    const b = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return (this._nb = b);
  }
  boom(t, vol, out, f0 = 70, len = 1.6) {
    const ctx = this.ctx, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(f0 * 2.2, t); o.frequency.exponentialRampToValueAtTime(f0 * .5, t + len * .6);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0008, t + len);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + len + .05);
    const n = ctx.createBufferSource(); n.buffer = this.noiseBuf();
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900;
    const ng = ctx.createGain(); ng.gain.setValueAtTime(vol * .5, t); ng.gain.exponentialRampToValueAtTime(.0008, t + .35);
    n.connect(f); f.connect(ng); ng.connect(out); n.start(t); n.stop(t + .4);
  }
  hit(t, vol, out, type) {
    const ctx = this.ctx, n = ctx.createBufferSource(); n.buffer = this.noiseBuf();
    const f = ctx.createBiquadFilter(), g = ctx.createGain();
    if (type === 'hat') { f.type = 'highpass'; f.frequency.value = 7000; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0008, t + .05); }
    else { f.type = 'bandpass'; f.frequency.value = 1900; f.Q.value = .8; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0008, t + .22);
      const o = ctx.createOscillator(), og = ctx.createGain(); o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(140, t + .1);
      og.gain.setValueAtTime(vol * .6, t); og.gain.exponentialRampToValueAtTime(.0008, t + .14); o.connect(og); og.connect(out); o.start(t); o.stop(t + .16); }
    n.connect(f); f.connect(g); g.connect(out); n.start(t); n.stop(t + .3);
  }
  brass(notes, t, dur, vol, out, cutoff = 2200) {
    const ctx = this.ctx, f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = 'lowpass'; f.frequency.setValueAtTime(cutoff * .35, t); f.frequency.linearRampToValueAtTime(cutoff, t + .08); f.frequency.exponentialRampToValueAtTime(cutoff * .5, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .03); g.gain.exponentialRampToValueAtTime(.001, t + dur);
    notes.forEach(n => [-9, 0, 9].forEach(det => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = midi(n); o.detune.value = det; o.connect(f); o.start(t); o.stop(t + dur + .05); }));
    f.connect(g); g.connect(out);
  }

  /* ------------------------------------------------ intro: from the wormhole down to your house and into the party */
  /** times in seconds from now (the dive starts now): touchdown on the roof, back up, arrival */
  homecoming({ dive = 0, touch = 9.3, up = 12.1, arrive = 16.1 } = {}) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + .05, out = this.cine, verb = this.bigVerb;
    // the dive: a long falling whoosh, strings rising towards home, a heartbeat that gets faster
    this.sweep(t0 + dive, touch - dive + .4, 3200, 240, .1);
    this.strings(t0 + Math.max(0, dive - .3), touch - dive + 3, [43, 55, 59, 62, 66, 69, 71], 300, 3400, .16);
    for (let x = dive + .6, k = 0; x < touch - .25; k++) { this.boom(t0 + x, .16 + .03 * Math.min(k, 6), out, 58, .45); x += Math.max(.42, 1.05 - k * .07); }
    // touchdown on the roof: a warm chord and a music box
    this.boom(t0 + touch, .35, verb, 45, 2.4);
    [55, 59, 62, 67].forEach((n, i) => this.pad(midi(n), t0 + touch + i * .03, up - touch + 1.8, .04, verb, out));
    [79, 83, 86, 91, 95, 91, 86, 83].forEach((n, i) => this.bell(midi(n), t0 + touch + .05 + i * .16, .085 - i * .004, out));
    // back up: a rising whoosh and a timpani roll into the arrival
    this.sweep(t0 + up, arrive - up, 220, 3600, .1);
    this.strings(t0 + up - .2, arrive - up + .4, [38, 50, 57, 62, 64, 69, 76], 400, 5200, .2);
    for (let k = 0; k < 18; k++) this.boom(t0 + arrive - 1.8 + k * .1, .07 + k * .028, out, 60, .3);
    // arrival: big hit + bright D major chord + bells
    const ta = t0 + arrive;
    this.boom(ta, 1, out, 38, 3.5); this.boom(ta, .5, verb, 38, 3.5);
    this.brass([50, 54, 57, 62, 66], ta, 3.2, .16, out, 3200);
    this.brass([50, 54, 57, 62, 66], ta, 3.2, .1, verb, 3200);
    [74, 78, 81, 86, 90].forEach((n, i) => this.bell(midi(n), ta + .15 + i * .09, .1, out));
  }

  /** detuned string section whose low-pass slowly opens */
  strings(t, dur, notes, f0, f1, vol) {
    const ctx = this.ctx;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 1.1;
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur * .9);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol * .6, t + Math.min(2.5, dur * .3));
    g.gain.linearRampToValueAtTime(vol, t + dur - .6); g.gain.linearRampToValueAtTime(0, t + dur);
    notes.forEach((n, i) => [-10, 0, 10].forEach(det => {
      const o = ctx.createOscillator(); o.type = i < 2 ? 'triangle' : 'sawtooth'; o.frequency.value = midi(n); o.detune.value = det + Math.random() * 4;
      const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 5 + Math.random(); lg.gain.value = 6; lfo.connect(lg); lg.connect(o.detune);
      const og = ctx.createGain(); og.gain.value = .14;
      o.connect(og); og.connect(f); o.start(t); lfo.start(t); o.stop(t + dur + .1); lfo.stop(t + dur + .1);
    }));
    f.connect(g); g.connect(this.cine); g.connect(this.bigVerb);
  }

  /** band-passed noise gliding between two frequencies (whoosh) */
  sweep(t, dur, fa, fb, vol) {
    const ctx = this.ctx, n = ctx.createBufferSource(); n.buffer = this.noiseBuf(); n.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = .9;
    f.frequency.setValueAtTime(fa, t); f.frequency.exponentialRampToValueAtTime(fb, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + dur * .35); g.gain.linearRampToValueAtTime(vol * .8, t + dur * .8); g.gain.linearRampToValueAtTime(0, t + dur);
    n.connect(f); f.connect(g); g.connect(this.cine); g.connect(this.bigVerb); n.start(t); n.stop(t + dur + .05);
  }

  /** Intro skipped: silence the swell and start the ambient score right away */
  skipCinematic() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.cineMutedUntil = now + 30;
    this.wind(false);
    this.mix();
  }

  /* ------------------------------------------------ sequencer (songs, karaoke) */
  /** plays a list of {t, fn(time)} events with a look-ahead scheduler; returns the AudioContext start time */
  playSeq(seq, { onEnd, song = true } = {}) {
    if (!this.ctx) return -1;
    this.stopSeq(false);
    const start = this.ctx.currentTime + .15;
    const s = this.seq = { events: seq.events, i: 0, start, end: start + seq.duration, onEnd, song };
    s.timer = setInterval(() => this.pumpSeq(s), 40);
    this.pumpSeq(s);
    if (song) { this.songOn = true; this.mix(); }
    return start;
  }
  pumpSeq(s) {
    if (this.seq !== s) return;
    const now = this.ctx.currentTime;
    while (s.i < s.events.length && s.start + s.events[s.i].t < now + .35) { const e = s.events[s.i++]; try { e.fn(s.start + e.t); } catch (err) { console.error(err); } }
    if (s.i >= s.events.length && now > s.end) { this.stopSeq(false); s.onEnd && s.onEnd(); }
  }
  stopSeq(fade = true) {
    const s = this.seq;
    if (!s) return;
    if (s.src) { try { s.src.stop(this.ctx.currentTime + (fade ? .6 : 0)); } catch (e) { /* not started */ } }
    clearInterval(s.timer); this.seq = null;
    if (fade && this.ctx) {
      const now = this.ctx.currentTime, g = this.song.gain;
      g.cancelScheduledValues(now); g.setValueAtTime(g.value, now); g.linearRampToValueAtTime(0, now + .5);
      setTimeout(() => { this.songOn = false; this.mix(); }, 700);
    } else { this.songOn = false; this.mix(); }
  }
  seqTime() { return this.seq && this.ctx ? this.ctx.currentTime - this.seq.start : -1; }
  /** schedules a short piece completely right now (intro music) */
  playNow(seq) { if (!this.ctx) return; const t0 = this.ctx.currentTime + .05; seq.events.forEach(e => { try { e.fn(t0 + e.t); } catch (err) { console.error(err); } }); }
  seqPlaying() { return !!this.seq; }

  /** fetch + decode a song file in the background (started from the "Öffnen" tap) */
  loadSong(url) {
    if (!this.ctx || !url) return Promise.resolve(null);
    if (!this.songBuffers) this.songBuffers = {};
    if (!this.songBuffers[url]) {
      this.songBuffers[url] = fetch(url).then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
        .then(b => new Promise((res, rej) => this.ctx.decodeAudioData(b, res, rej)))
        .catch(err => { console.warn('Song konnte nicht geladen werden: ' + url); return null; });
    }
    return this.songBuffers[url];
  }

  /** plays a decoded song file like a sequence (karaoke time, stop button, ambient pause) */
  async playSongFile(url, { onEnd } = {}) {
    const buf = await this.loadSong(url);
    if (!buf) return false;
    const src = this.ctx.createBufferSource();
    src.buffer = buf; src.connect(this.song);
    const seq = { events: [{ t: 0, fn: at => src.start(at) }], duration: buf.duration + .3 };
    this.playSeq(seq, { onEnd });
    const s = this.seq; s.src = src;
    return true;
  }

  /** wind noise while flying through the clouds */
  wind(on) {
    if (!this.ctx) return;
    const ctx = this.ctx, now = ctx.currentTime;
    if (on && !this.windSrc) {
      const src = ctx.createBufferSource(); src.buffer = this.noiseBuf(); src.loop = true;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520; lp.Q.value = .6;
      const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = .23; lg.gain.value = 260; lfo.connect(lg); lg.connect(lp.frequency);
      const g = ctx.createGain(); g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(.16, now + 1.5);
      src.connect(lp); lp.connect(g); g.connect(this.cine); src.start(now); lfo.start(now);
      this.windSrc = { src, lfo, g };
    } else if (!on && this.windSrc) {
      const w = this.windSrc; this.windSrc = null;
      w.g.gain.cancelScheduledValues(now); w.g.gain.setValueAtTime(w.g.gain.value, now); w.g.gain.linearRampToValueAtTime(0, now + 1.2);
      w.src.stop(now + 1.3); w.lfo.stop(now + 1.3);
    }
  }

  /** the surprise party: poppers, party horns, applause, whistles and a few "woo!"s */
  party() {
    if (!this.ctx) return;
    const b = this.band, bus = this.sfxOn ? this.sfx : this.song, t = this.ctx.currentTime + .03;
    [0, .07, .16, .5].forEach((d, i) => b.pop(t + d, { bus, vel: .55 - i * .08 }));
    b.horn(t + .05, .9, { bus, pitch: 1 });
    b.horn(t + .3, .7, { bus, pitch: 1.26 });
    b.horn(t + 1.25, 1, { bus, pitch: 1.12 });
    b.applause(t + .1, 2.8, { bus, vel: .11 });
    b.whistle(t + .45, { bus }); b.whistle(t + 1.4, { bus, vel: .05 });
    b.woo(t + .2, { bus }); b.woo(t + 1.1, { bus, vel: .035 });
  }

  /* ------------------------------------------------ epic track (catch game only) */
  setEpic(on) {
    if (!this.ctx || this.epicOn === on) return;
    this.epicOn = on;
    if (on) {
      this.epicStep = 0; this.epicNext = this.ctx.currentTime + .08;
      this.boom(this.epicNext, .8, this.epic, 45, 2);
      clearInterval(this.epicTimer);
      this.epicTimer = setInterval(() => this.scheduleEpic(), 60);
    } else {
      clearInterval(this.epicTimer); this.epicTimer = null;
      if (this.mode === 'gen') this.nextBar = this.ctx.currentTime + .6;
    }
    this.mix();
  }
  scheduleEpic() {
    if (!this.epicOn) return;
    const ctx = this.ctx, s16 = 60 / EPIC_BPM / 4, out = this.epic;
    while (this.epicNext < ctx.currentTime + .3) {
      const t = this.epicNext, step = this.epicStep, inBar = step % 16, bar = Math.floor(step / 16);
      const ch = EPIC[bar % EPIC.length];
      // drums
      if (inBar === 0 || inBar === 7 || inBar === 10) this.boom(t, .55, out, 55, .45);
      if (inBar === 4 || inBar === 12) this.hit(t, .3, out, 'snare');
      if (inBar % 2 === 0) this.hit(t, .07, out, 'hat');
      if (inBar === 0 && bar % 4 === 0) { this.boom(t, .7, out, 42, 1.6); this.boom(t, .3, this.epicVerb, 42, 1.6); }
      // galloping bass ostinato
      if (inBar % 4 !== 3) {
        const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
        o.type = 'sawtooth'; o.frequency.value = midi(ch.root - 12 + (inBar % 8 === 6 ? 12 : 0));
        f.type = 'lowpass'; f.frequency.value = 700;
        g.gain.setValueAtTime(.16, t); g.gain.exponentialRampToValueAtTime(.001, t + s16 * .9);
        o.connect(f); f.connect(g); g.connect(out); o.start(t); o.stop(t + s16);
      }
      // brass stabs and long chord
      if (inBar === 0) { this.brass(ch.chord, t, s16 * 14, .07, out, 1800); this.brass(ch.chord, t, s16 * 14, .04, this.epicVerb, 1800); }
      if (inBar === 10 || inBar === 14) this.brass(ch.chord.map(n => n + 12), t, s16 * 2, .05, out, 2600);
      // shimmering arpeggio
      const arp = [...ch.chord, ...ch.chord.map(n => n + 12)];
      const n = arp[(step * 3) % arp.length] + 12;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'square'; o.frequency.value = midi(n);
      g.gain.setValueAtTime(.022, t); g.gain.exponentialRampToValueAtTime(.0008, t + s16 * 1.6);
      o.connect(g); g.connect(out); g.connect(this.epicVerb); o.start(t); o.stop(t + s16 * 1.7);
      this.epicNext += s16; this.epicStep++;
    }
  }

  /* ------------------------------------------------ Happy Birthday (traditional, public domain) */
  happyBirthday() {
    if (!this.ctx) return 0;
    const ctx = this.ctx, b = .42, t0 = ctx.currentTime + .15;
    const song = [[67, .75], [67, .25], [69, 1], [67, 1], [72, 1], [71, 2],
      [67, .75], [67, .25], [69, 1], [67, 1], [74, 1], [72, 2],
      [67, .75], [67, .25], [79, 1], [76, 1], [72, 1], [71, 1], [69, 2],
      [77, .75], [77, .25], [76, 1], [72, 1], [74, 1], [72, 3]];
    const chords = [[48, 55, 64], [43, 50, 59], [43, 50, 59], [48, 55, 64], [48, 55, 64], [53, 57, 65], [48, 55, 64], [43, 50, 59], [48, 55, 64]];
    let t = t0;
    const out = this.cine;
    song.forEach(([n, d]) => { this.bell(midi(n), t, .16, out); this.bell(midi(n - 12), t, .05, out); t += d * b; });
    const total = t - t0;
    chords.forEach((c, i) => c.forEach(n => this.pad(midi(n), t0 + i * total / chords.length, total / chords.length + 1.4, .03, this.bigVerb, out)));
    // play it even when the music is muted (it's the birthday moment) and duck the ambient score meanwhile
    const now = ctx.currentTime;
    this.cine.gain.cancelScheduledValues(now); this.cine.gain.setTargetAtTime(this.volume || .7, now, .1);
    this.music.gain.cancelScheduledValues(now); this.music.gain.setTargetAtTime((this.musicOn ? this.volume : 0) * .15, now, .3);
    clearTimeout(this.duckTimer);
    this.duckTimer = setTimeout(() => this.mix(), (total + 1.5) * 1000);
    return total;
  }

  /* ------------------------------------------------ controls */
  setMusic(on) {
    if (!this.ctx) return false;
    this.musicOn = on;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    if (this.mode === 'file' && this.el && !on) setTimeout(() => !this.musicOn && this.el && this.el.pause(), 900);
    if (this.mode === 'gen' && on) this.nextBar = Math.max(this.nextBar, this.ctx.currentTime + .1);
    this.mix();
    return on;
  }
  toggleMusic() { return this.setMusic(!this.musicOn); }
  toggleSfx() { this.sfxOn = !this.sfxOn; return this.sfxOn; }

  /** 0..1 musical "punch" for visuals */
  level() {
    if (!this.analyser || !this.musicOn) { this.lvl *= .95; return this.lvl; }
    this.analyser.getByteFrequencyData(this.bins);
    let s = 0; for (let i = 1; i < 12; i++) s += this.bins[i];
    const v = s / (11 * 255);
    this.fast = (this.fast || 0) + (v - (this.fast || 0)) * .35;
    this.slow = (this.slow || 0) + (v - (this.slow || 0)) * .02;
    const target = Math.min(1, Math.max(0, (this.fast - this.slow) * 3) + this.fast * .2);
    this.lvl += (target - this.lvl) * .25;
    return this.lvl;
  }

  tone(freq, dur = .15, type = 'sine', vol = .2, slide = 0, delay = 0) {
    if (!this.ctx || !this.sfxOn) return;
    const ctx = this.ctx, t = ctx.currentTime + delay, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .012); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); g.connect(this.sfx); o.start(t); o.stop(t + dur + .05);
  }
  noise(dur = .3, vol = .1, freq = 2000) {
    if (!this.ctx || !this.sfxOn) return;
    const ctx = this.ctx, t = ctx.currentTime, src = ctx.createBufferSource(); src.buffer = this.noiseBuf();
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 1.2;
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.sfx); src.start(t); src.stop(t + dur);
  }
  play(name) {
    const fx = {
      tap: () => this.tone(1100, .07, 'sine', .12),
      catch: () => this.tone(880, .12, 'sine', .18, 1.5),
      heart: () => { this.tone(660, .16, 'triangle', .18, 1.3); this.tone(990, .2, 'triangle', .15, 1.2, .07); },
      hit: () => this.tone(170, .4, 'sawtooth', .08, .35),
      flip: () => this.noise(.12, .08, 3200),
      match: () => { this.tone(784, .2, 'triangle', .16); this.tone(1175, .3, 'triangle', .14, 1, .09); },
      wrong: () => this.tone(220, .22, 'square', .05, .7),
      right: () => { this.tone(660, .14, 'sine', .16); this.tone(880, .22, 'sine', .16, 1, .1); },
      scratch: () => this.noise(.08, .05, 5000),
      tick: () => this.tone(1500, .04, 'square', .03),
      whoosh: () => this.noise(.9, .12, 900),
      swallow: () => this.tone(260, 1, 'sine', .25, .12),
      launch: () => this.tone(320, .3, 'sine', .14, 2.4),
      magic: () => [988, 1319, 1568, 1976].forEach((f, i) => this.tone(f, .5, 'sine', .09, 1, i * .07)),
      win: () => [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, .45, 'triangle', .14, 1, i * .1)),
      open: () => { this.tone(392, .5, 'sine', .12, 2); this.noise(.6, .05, 1600); },
      blow: () => this.noise(.5, .1, 600)
    };
    fx[name] && fx[name]();
  }
}

export const Sound = new AudioEngine();
