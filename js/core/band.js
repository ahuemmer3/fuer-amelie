/**
 * A tiny synthesizer band for the songs (everything generated with Web Audio).
 * Each instrument takes a start time (AudioContext time) and writes into a bus,
 * optionally with a reverb send.
 */
export const midi = n => 440 * Math.pow(2, (n - 69) / 12);

export function createBand(S) {
  const ctx = S.ctx;
  const noise = () => S.noiseBuf();

  function route(node, bus, verb, wet) {
    node.connect(bus);
    if (verb && wet) { const w = ctx.createGain(); w.gain.value = wet; node.connect(w); w.connect(verb); }
  }

  return {
    /** singing lead voice: triangle + saw, soft filter, delayed vibrato, glide from the previous note */
    lead(t, n, d, { bus, verb, vel = .15, from = null, wet = .35 }) {
      const f = midi(n);
      const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), g2 = ctx.createGain();
      o1.type = 'triangle'; o2.type = 'sawtooth'; o2.detune.value = 7; g2.gain.value = .22;
      [o1, o2].forEach(o => {
        if (from) { o.frequency.setValueAtTime(midi(from), t); o.frequency.exponentialRampToValueAtTime(f, t + .05); }
        else o.frequency.setValueAtTime(f, t);
      });
      const vib = ctx.createOscillator(), vg = ctx.createGain();
      vib.frequency.value = 5.4;
      vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(f * .007, t + Math.min(.4, d * .7));
      vib.connect(vg); vg.connect(o1.frequency); vg.connect(o2.frequency);
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600; lp.Q.value = .7;
      const env = ctx.createGain();
      env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(vel, t + .025);
      env.gain.linearRampToValueAtTime(vel * .72, t + Math.min(.25, d * .5));
      env.gain.setValueAtTime(vel * .72, t + Math.max(.04, d - .07));
      env.gain.linearRampToValueAtTime(0, t + d + .08);
      o1.connect(lp); o2.connect(g2); g2.connect(lp); lp.connect(env);
      route(env, bus, verb, wet);
      [o1, o2, vib].forEach(o => { o.start(t); o.stop(t + d + .15); });
    },

    /** soft electric piano chord */
    keys(t, notes, d, { bus, verb, vel = .045, wet = .25 }) {
      notes.forEach(n => {
        const f = midi(n), o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), g2 = ctx.createGain();
        o.type = 'sine'; o.frequency.value = f; o2.type = 'sine'; o2.frequency.value = f * 2.002; g2.gain.value = .28;
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel, t + .008); g.gain.exponentialRampToValueAtTime(vel * .3, t + Math.min(d, .5)); g.gain.exponentialRampToValueAtTime(.0005, t + d + .4);
        o.connect(g); o2.connect(g2); g2.connect(g);
        route(g, bus, verb, wet);
        o.start(t); o2.start(t); o.stop(t + d + .5); o2.stop(t + d + .5);
      });
    },

    bass(t, n, d, { bus, vel = .13 }) {
      const o = ctx.createOscillator(), o2 = ctx.createOscillator(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = midi(n); o2.type = 'sawtooth'; o2.frequency.value = midi(n);
      lp.type = 'lowpass'; lp.frequency.value = 420;
      const g2 = ctx.createGain(); g2.gain.value = .35;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel, t + .01); g.gain.exponentialRampToValueAtTime(vel * .5, t + d * .8); g.gain.linearRampToValueAtTime(0, t + d);
      o.connect(lp); o2.connect(g2); g2.connect(lp); lp.connect(g); g.connect(bus);
      o.start(t); o2.start(t); o.stop(t + d + .05); o2.stop(t + d + .05);
    },

    /** string / choir pad */
    strings(t, notes, d, { bus, verb, vel = .022, attack = .35, wet = .5, cutoff = 1700 }) {
      const lp = ctx.createBiquadFilter(), g = ctx.createGain();
      lp.type = 'lowpass'; lp.frequency.value = cutoff;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel, t + attack); g.gain.setValueAtTime(vel, t + Math.max(attack, d - .3)); g.gain.linearRampToValueAtTime(0, t + d + .25);
      notes.forEach(n => [-8, 8].forEach(det => {
        const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = midi(n); o.detune.value = det;
        o.connect(lp); o.start(t); o.stop(t + d + .3);
      }));
      lp.connect(g); route(g, bus, verb, wet);
    },

    /** short string note for ostinatos */
    pluck(t, n, d, { bus, verb, vel = .05, wet = .2 }) {
      const o = ctx.createOscillator(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
      o.type = 'sawtooth'; o.frequency.value = midi(n);
      lp.type = 'lowpass'; lp.frequency.setValueAtTime(2400, t); lp.frequency.exponentialRampToValueAtTime(700, t + d);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel, t + .006); g.gain.exponentialRampToValueAtTime(.0008, t + d);
      o.connect(lp); lp.connect(g); route(g, bus, verb, wet);
      o.start(t); o.stop(t + d + .05);
    },

    bell(t, n, { bus, verb, vel = .07, wet = .5, len = 1.8 }) {
      const f = midi(n), o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), g2 = ctx.createGain();
      o.type = 'sine'; o.frequency.value = f; o2.type = 'sine'; o2.frequency.value = f * 2.76; g2.gain.value = .18;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel, t + .004); g.gain.exponentialRampToValueAtTime(.0004, t + len);
      o.connect(g); o2.connect(g2); g2.connect(g); route(g, bus, verb, wet);
      o.start(t); o2.start(t); o.stop(t + len + .05); o2.stop(t + len + .05);
    },

    brass(t, notes, d, { bus, verb, vel = .06, wet = .35, cutoff = 2200 }) {
      const lp = ctx.createBiquadFilter(), g = ctx.createGain();
      lp.type = 'lowpass'; lp.frequency.setValueAtTime(cutoff * .3, t); lp.frequency.linearRampToValueAtTime(cutoff, t + .07); lp.frequency.linearRampToValueAtTime(cutoff * .7, t + d);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel, t + .03); g.gain.setValueAtTime(vel * .85, t + Math.max(.05, d - .05)); g.gain.linearRampToValueAtTime(0, t + d + .12);
      notes.forEach(n => [-9, 0, 9].forEach(det => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = midi(n); o.detune.value = det; o.connect(lp); o.start(t); o.stop(t + d + .2); }));
      lp.connect(g); route(g, bus, verb, wet);
    },

    kick(t, { bus, vel = .55 }) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(45, t + .12);
      g.gain.setValueAtTime(vel, t); g.gain.exponentialRampToValueAtTime(.0008, t + .38);
      o.connect(g); g.connect(bus); o.start(t); o.stop(t + .42);
    },

    snare(t, { bus, verb, vel = .22, wet = .25 }) {
      const n = ctx.createBufferSource(); n.buffer = noise();
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = .7;
      const g = ctx.createGain(); g.gain.setValueAtTime(vel, t); g.gain.exponentialRampToValueAtTime(.0008, t + .2);
      n.connect(f); f.connect(g); route(g, bus, verb, wet); n.start(t, Math.random() * .5, .25);
      const o = ctx.createOscillator(), og = ctx.createGain();
      o.frequency.setValueAtTime(210, t); o.frequency.exponentialRampToValueAtTime(140, t + .08);
      og.gain.setValueAtTime(vel * .7, t); og.gain.exponentialRampToValueAtTime(.0008, t + .12);
      o.connect(og); og.connect(bus); o.start(t); o.stop(t + .14);
    },

    clap(t, { bus, verb, vel = .16, wet = .3 }) {
      [0, .011, .023].forEach((dt, i) => {
        const n = ctx.createBufferSource(); n.buffer = noise();
        const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1300; f.Q.value = 1.4;
        const g = ctx.createGain(); g.gain.setValueAtTime(vel * (i === 2 ? 1 : .6), t + dt); g.gain.exponentialRampToValueAtTime(.0008, t + dt + (i === 2 ? .16 : .02));
        n.connect(f); f.connect(g); route(g, bus, verb, wet); n.start(t + dt, Math.random() * .5, .2);
      });
    },

    hat(t, { bus, vel = .045, open = false }) {
      const n = ctx.createBufferSource(); n.buffer = noise();
      const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7500;
      const g = ctx.createGain(); g.gain.setValueAtTime(vel, t); g.gain.exponentialRampToValueAtTime(.0008, t + (open ? .3 : .045));
      n.connect(f); f.connect(g); g.connect(bus); n.start(t, Math.random() * .5, .35);
    },

    crash(t, { bus, verb, vel = .1, wet = .4, len = 2 }) {
      const n = ctx.createBufferSource(); n.buffer = noise(); n.loop = true;
      const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 3500;
      const g = ctx.createGain(); g.gain.setValueAtTime(vel, t); g.gain.exponentialRampToValueAtTime(.0008, t + len);
      n.connect(f); f.connect(g); route(g, bus, verb, wet); n.start(t, 0, len + .05);
    },

    /** rising noise swell ("whoosh" into a new section) */
    swell(t, d, { bus, verb, vel = .1 }) {
      const n = ctx.createBufferSource(); n.buffer = noise(); n.loop = true;
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = .8; f.frequency.setValueAtTime(400, t); f.frequency.exponentialRampToValueAtTime(6000, t + d);
      const g = ctx.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vel, t + d); g.gain.linearRampToValueAtTime(0, t + d + .05);
      n.connect(f); f.connect(g); route(g, bus, verb, .3); n.start(t); n.stop(t + d + .1);
    },

    timp(t, n, { bus, verb, vel = .5, wet = .4 }) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(midi(n) * 1.6, t); o.frequency.exponentialRampToValueAtTime(midi(n), t + .06);
      g.gain.setValueAtTime(vel, t); g.gain.exponentialRampToValueAtTime(.0008, t + 1.1);
      o.connect(g); route(g, bus, verb, wet); o.start(t); o.stop(t + 1.15);
      const s = ctx.createBufferSource(); s.buffer = noise();
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700;
      const sg = ctx.createGain(); sg.gain.setValueAtTime(vel * .5, t); sg.gain.exponentialRampToValueAtTime(.0008, t + .15);
      s.connect(f); f.connect(sg); sg.connect(bus); s.start(t, Math.random() * .5, .2);
    },

    /* ---------------- surprise party ---------------- */
    pop(t, { bus, vel = .5 }) {
      const n = ctx.createBufferSource(); n.buffer = noise();
      const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1200;
      const g = ctx.createGain(); g.gain.setValueAtTime(vel, t); g.gain.exponentialRampToValueAtTime(.0008, t + .07);
      n.connect(f); f.connect(g); g.connect(bus); n.start(t, Math.random() * .5, .1);
      const o = ctx.createOscillator(), og = ctx.createGain();
      o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(50, t + .05);
      og.gain.setValueAtTime(vel * .8, t); og.gain.exponentialRampToValueAtTime(.0008, t + .08);
      o.connect(og); og.connect(bus); o.start(t); o.stop(t + .1);
    },

    /** party horn ("Tröte") */
    horn(t, d, { bus, pitch = 1, vel = .09 }) {
      const base = 340 * pitch, lp = ctx.createBiquadFilter(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
      lp.type = 'lowpass'; lp.frequency.value = 3200; bp.type = 'peaking'; bp.frequency.value = 1300; bp.gain.value = 9;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel, t + .03); g.gain.setValueAtTime(vel, t + d - .08); g.gain.linearRampToValueAtTime(0, t + d);
      ['square', 'sawtooth'].forEach((type, i) => {
        const o = ctx.createOscillator(); o.type = type; o.detune.value = i ? 14 : -14;
        o.frequency.setValueAtTime(base * .82, t); o.frequency.exponentialRampToValueAtTime(base, t + .09); o.frequency.setValueAtTime(base, t + d * .7); o.frequency.exponentialRampToValueAtTime(base * 1.06, t + d);
        const v = ctx.createOscillator(), vg = ctx.createGain(); v.frequency.value = 9; vg.gain.value = base * .012; v.connect(vg); vg.connect(o.frequency);
        o.connect(bp); o.start(t); v.start(t); o.stop(t + d + .05); v.stop(t + d + .05);
      });
      bp.connect(lp); lp.connect(g); g.connect(bus);
    },

    applause(t, d, { bus, vel = .1 }) {
      const n = Math.round(d * 80);
      for (let i = 0; i < n; i++) {
        const tt = t + Math.random() * d;
        const amp = Math.min(1, (tt - t) / .25) * Math.min(1, (t + d - tt) / (d * .45));
        const s = ctx.createBufferSource(); s.buffer = noise();
        const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900 + Math.random() * 2000; f.Q.value = 1.3;
        const g = ctx.createGain();
        g.gain.setValueAtTime(.0001, tt); g.gain.exponentialRampToValueAtTime(vel * (.4 + Math.random() * .6) * amp + .0002, tt + .003);
        g.gain.exponentialRampToValueAtTime(.0001, tt + .025 + Math.random() * .035);
        s.connect(f); f.connect(g); g.connect(bus); s.start(tt, Math.random() * .8, .08);
      }
    },

    whistle(t, { bus, vel = .07 }) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(1700, t); o.frequency.exponentialRampToValueAtTime(2900, t + .22);
      o.frequency.setValueAtTime(2300, t + .32); o.frequency.exponentialRampToValueAtTime(3000, t + .45); o.frequency.exponentialRampToValueAtTime(2100, t + .7);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel, t + .03); g.gain.setValueAtTime(vel, t + .22); g.gain.linearRampToValueAtTime(0, t + .27);
      g.gain.setValueAtTime(0, t + .32); g.gain.linearRampToValueAtTime(vel, t + .35); g.gain.linearRampToValueAtTime(0, t + .72);
      o.connect(g); g.connect(bus); o.start(t); o.stop(t + .75);
    },

    /** a few synthetic voices going "woo!" */
    woo(t, { bus, vel = .045 }) {
      for (let i = 0; i < 4; i++) {
        const st = t + Math.random() * .25, d = .8 + Math.random() * .5, base = 200 + Math.random() * 160;
        const o = ctx.createOscillator(); o.type = 'sawtooth';
        o.frequency.setValueAtTime(base, st); o.frequency.exponentialRampToValueAtTime(base * 1.6, st + d * .45); o.frequency.exponentialRampToValueAtTime(base * 1.1, st + d);
        const f1 = ctx.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 700; f1.Q.value = 4;
        const f2 = ctx.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 1150; f2.Q.value = 4;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, st); g.gain.linearRampToValueAtTime(vel, st + .08); g.gain.linearRampToValueAtTime(0, st + d);
        o.connect(f1); o.connect(f2); f1.connect(g); f2.connect(g); g.connect(bus); o.start(st); o.stop(st + d + .05);
      }
    }
  };
}
