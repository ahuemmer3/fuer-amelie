/**
 * Music (MP3 from config or a generated ambient score), sound effects and an analyser
 * so the heart and the accretion disk can react to the music.
 */
const midi = n => 440 * Math.pow(2, (n - 69) / 12);

const CHORDS = [
  { root: 36, notes: [48, 55, 59, 64, 67] },   // Cmaj7
  { root: 33, notes: [45, 52, 55, 60, 64] },   // Am7
  { root: 29, notes: [41, 48, 52, 57, 60] },   // Fmaj7
  { root: 31, notes: [43, 50, 55, 59, 62] }    // G6
];
const BELLS = [72, 74, 76, 79, 81, 84, 86, 88];
const BAR = 4.8;

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.musicOn = false;
    this.sfxOn = true;
    this.lvl = 0;
    this.mode = 'none';
    this.el = null;
    this.nextBar = 0;
    this.bar = 0;
    this.timer = null;
  }

  /** Must be called from a user gesture (tap on "Öffnen"). */
  start({ file = '', volume = .7 } = {}) {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = this.ctx = new AC();
    ctx.resume();

    this.master = ctx.createGain(); this.master.gain.value = 1;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 3;
    this.analyser = ctx.createAnalyser(); this.analyser.fftSize = 256; this.analyser.smoothingTimeConstant = .7;
    this.bins = new Uint8Array(this.analyser.frequencyBinCount);
    this.master.connect(comp); comp.connect(this.analyser); this.analyser.connect(ctx.destination);

    this.music = ctx.createGain(); this.music.gain.value = 0; this.music.connect(this.master);
    this.sfx = ctx.createGain(); this.sfx.gain.value = .5; this.sfx.connect(this.master);
    this.volume = volume;

    // shared reverb + delay for the generated score
    this.reverb = ctx.createConvolver(); this.reverb.buffer = this.impulse(3.6);
    const rvGain = ctx.createGain(); rvGain.gain.value = .9; this.reverb.connect(rvGain); rvGain.connect(this.music);
    this.delay = ctx.createDelay(1); this.delay.delayTime.value = .45;
    const fb = ctx.createGain(); fb.gain.value = .33; this.delay.connect(fb); fb.connect(this.delay);
    const dlOut = ctx.createGain(); dlOut.gain.value = .45; this.delay.connect(dlOut); dlOut.connect(this.music); dlOut.connect(this.reverb);

    if (file) {
      const el = this.el = new Audio();
      el.src = file; el.loop = true; el.preload = 'auto'; el.playsInline = true;
      const src = ctx.createMediaElementSource(el);
      src.connect(this.music);
      this.mode = 'file';
      el.addEventListener('error', () => { if (this.mode === 'file') this.useGenerated(); }, { once: true });
      el.play().catch(() => { /* will retry on toggle */ });
    } else {
      this.useGenerated();
    }
    this.setMusic(true);
  }

  useGenerated() {
    this.mode = 'gen';
    if (this.el) { this.el.pause(); this.el = null; }
    this.nextBar = this.ctx.currentTime + .1;
    clearInterval(this.timer);
    this.timer = setInterval(() => this.schedule(), 150);
  }

  impulse(seconds) {
    const rate = this.ctx.sampleRate, len = Math.floor(rate * seconds);
    const buf = this.ctx.createBuffer(2, len, rate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    return buf;
  }

  schedule() {
    if (!this.musicOn || this.mode !== 'gen') return;
    const ctx = this.ctx;
    while (this.nextBar < ctx.currentTime + 1.2) {
      const chord = CHORDS[this.bar % CHORDS.length];
      const t = this.nextBar;
      chord.notes.forEach((n, i) => this.pad(midi(n), t + i * .04, BAR + 1.6, i === 0 ? .05 : .035));
      this.bass(midi(chord.root), t, BAR);
      const steps = 8;
      for (let s = 0; s < steps; s++) {
        if (Math.random() < (s % 2 ? .28 : .5)) {
          const choices = BELLS.filter(b => chord.notes.some(n => (b - n) % 12 === 0) || Math.random() < .3);
          const note = choices[Math.floor(Math.random() * choices.length)] || BELLS[0];
          this.bell(midi(note), t + s * (BAR / steps) + Math.random() * .03, .07 + Math.random() * .04);
        }
      }
      this.nextBar += BAR; this.bar++;
    }
  }

  pad(freq, t, dur, vol) {
    const ctx = this.ctx;
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 1.8); g.gain.setValueAtTime(vol, t + dur - 2.2); g.gain.linearRampToValueAtTime(0, t + dur);
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(700, t); f.frequency.linearRampToValueAtTime(1500, t + dur * .5); f.frequency.linearRampToValueAtTime(800, t + dur); f.Q.value = .7;
    [-7, 7].forEach((det, k) => {
      const o = ctx.createOscillator(); o.type = k ? 'sawtooth' : 'triangle'; o.frequency.value = freq; o.detune.value = det;
      const og = ctx.createGain(); og.gain.value = k ? .35 : 1;
      o.connect(og); og.connect(f); o.start(t); o.stop(t + dur + .1);
    });
    f.connect(g); g.connect(this.reverb);
    const dry = ctx.createGain(); dry.gain.value = .35; g.connect(dry); dry.connect(this.music);
  }

  bass(freq, t, dur) {
    const ctx = this.ctx;
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = freq;
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.12, t + .6); g.gain.exponentialRampToValueAtTime(.001, t + dur);
    o.connect(g); g.connect(this.music); o.start(t); o.stop(t + dur + .1);
  }

  bell(freq, t, vol) {
    const ctx = this.ctx;
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = freq;
    const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = freq * 2.01;
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .006); g.gain.exponentialRampToValueAtTime(.0005, t + 2.4);
    const g2 = ctx.createGain(); g2.gain.value = .25;
    o.connect(g); o2.connect(g2); g2.connect(g);
    g.connect(this.delay); g.connect(this.reverb);
    const dry = ctx.createGain(); dry.gain.value = .5; g.connect(dry); dry.connect(this.music);
    o.start(t); o2.start(t); o.stop(t + 2.6); o2.stop(t + 2.6);
  }

  setMusic(on) {
    if (!this.ctx) return false;
    this.musicOn = on;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    const now = this.ctx.currentTime;
    this.music.gain.cancelScheduledValues(now);
    this.music.gain.setTargetAtTime(on ? this.volume : 0, now, on ? .8 : .3);
    if (this.mode === 'file' && this.el) { if (on) this.el.play().catch(() => {}); else setTimeout(() => !this.musicOn && this.el && this.el.pause(), 900); }
    if (this.mode === 'gen' && on) this.nextBar = Math.max(this.nextBar, now + .1);
    return on;
  }
  toggleMusic() { return this.setMusic(!this.musicOn); }
  toggleSfx() { this.sfxOn = !this.sfxOn; return this.sfxOn; }

  /** 0..1, smoothed low-frequency energy */
  level() {
    if (!this.analyser || !this.musicOn) { this.lvl *= .95; return this.lvl; }
    this.analyser.getByteFrequencyData(this.bins);
    let s = 0; for (let i = 1; i < 12; i++) s += this.bins[i];
    const v = s / (11 * 255);
    this.fast = (this.fast || 0) + (v - (this.fast || 0)) * .35;
    this.slow = (this.slow || 0) + (v - (this.slow || 0)) * .02;
    // mostly the "punch" above the running average, plus a little of the overall level
    const target = Math.min(1, Math.max(0, (this.fast - this.slow) * 3) + this.fast * .2);
    this.lvl += (target - this.lvl) * .25;
    return this.lvl;
  }

  tone(freq, dur = .15, type = 'sine', vol = .2, slide = 0, delay = 0) {
    if (!this.ctx || !this.sfxOn) return;
    const ctx = this.ctx, t = ctx.currentTime + delay;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .012); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); g.connect(this.sfx); o.start(t); o.stop(t + dur + .05);
  }

  noise(dur = .3, vol = .1, freq = 2000) {
    if (!this.ctx || !this.sfxOn) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 1.2;
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.sfx); src.start(t);
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
      open: () => { this.tone(392, .5, 'sine', .12, 2); this.noise(.6, .05, 1600); }
    };
    fx[name] && fx[name]();
  }
}

export const Sound = new AudioEngine();
