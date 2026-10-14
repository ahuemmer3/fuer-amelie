/**
 * Karaoke lyrics in sync with the music: current line with syllables lighting up,
 * the next line underneath, a title card at the start.
 */
export class Karaoke {
  constructor({ root, onStop }) {
    this.root = root;
    this.titleEl = root.querySelector('.kar-title');
    this.subEl = root.querySelector('.kar-sub');
    this.lineEl = root.querySelector('.kar-line');
    this.nextEl = root.querySelector('.kar-next');
    root.querySelector('.kar-hide').addEventListener('click', () => this.hide());
    root.querySelector('.kar-stop').addEventListener('click', () => { this.hide(); onStop && onStop(); });
    this.raf = 0; this.cur = -2; this.spans = [];
  }

  /** time(): seconds since the music started (negative = not yet) */
  play({ title, sub, lines, time }) {
    cancelAnimationFrame(this.raf);
    this.lines = lines; this.time = time; this.cur = -2;
    this.titleEl.textContent = title; this.subEl.textContent = sub || '';
    this.root.hidden = false;
    requestAnimationFrame(() => this.root.classList.add('in'));
    const loop = () => { this.tick(); this.raf = requestAnimationFrame(loop); };
    this.raf = requestAnimationFrame(loop);
  }

  render(i) {
    this.cur = i;
    this.lineEl.textContent = '';
    this.spans = [];
    if (i < 0) { this.lineEl.innerHTML = ''; this.lineEl.classList.add('title'); this.lineEl.textContent = '♪ ' + this.titleEl.textContent + ' ♪'; this.nextEl.textContent = this.lines[0] ? text(this.lines[0]) : ''; return; }
    this.lineEl.classList.remove('title');
    const line = this.lines[i];
    line.syl.forEach((s, k) => {
      const sp = document.createElement('span');
      sp.textContent = s.text + (s.join || k === line.syl.length - 1 ? '' : ' ');
      this.lineEl.appendChild(sp);
      this.spans.push(sp);
    });
    this.lineEl.classList.remove('pop'); void this.lineEl.offsetWidth; this.lineEl.classList.add('pop');
    this.nextEl.textContent = this.lines[i + 1] ? text(this.lines[i + 1]) : '';
  }

  tick() {
    const t = this.time();
    if (t === null) return;
    // which line is on screen: shown slightly before it is sung
    let i = -1;
    for (let k = 0; k < this.lines.length; k++) if (t >= this.lines[k].t0 - .7) i = k;
    if (i !== this.cur) this.render(i);
    if (i < 0) return;
    const line = this.lines[i];
    line.syl.forEach((s, k) => {
      const sp = this.spans[k];
      if (!sp) return;
      const p = t <= s.t0 ? 0 : t >= s.t1 ? 1 : (t - s.t0) / (s.t1 - s.t0);
      sp.style.setProperty('--p', (p * 100).toFixed(1) + '%');
      sp.classList.toggle('now', p > 0 && p < 1);
    });
    if (t > line.t1 + 2.5 && i === this.lines.length - 1) this.lineEl.classList.add('done');
  }

  hide() {
    cancelAnimationFrame(this.raf);
    this.root.classList.remove('in');
    setTimeout(() => { if (!this.root.classList.contains('in')) this.root.hidden = true; }, 500);
  }
  get visible() { return !this.root.hidden && this.root.classList.contains('in'); }
}

function text(line) { return line.syl.map((s, k) => s.text + (s.join || k === line.syl.length - 1 ? '' : ' ')).join(''); }
