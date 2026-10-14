export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
export const pick = arr => arr[Math.floor(Math.random() * arr.length)];
export const shuffle = arr => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
export function gauss() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export const ease = {
  inOutCubic: t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outCubic: t => 1 - Math.pow(1 - t, 3),
  inCubic: t => t * t * t,
  outQuint: t => 1 - Math.pow(1 - t, 5),
  inOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2,
  outBack: t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }
};

/** Heartbeat: two short pulses, then a pause. Returns 0..~1 */
export function heartBeat(t, period = 1.5) {
  const p = t % period;
  const a = Math.exp(-Math.pow((p - .12) / .055, 2));
  const b = Math.exp(-Math.pow((p - .38) / .07, 2)) * .65;
  return a + b;
}

/** Simple promise-based tween driven by rAF */
export function tween({ duration = 1, ease: e = ease.inOutCubic, onUpdate, delay = 0 }) {
  return new Promise(resolve => {
    const start = performance.now() + delay * 1000;
    function step(now) {
      const t = clamp((now - start) / (duration * 1000), 0, 1);
      if (now >= start) onUpdate(e(t), t);
      if (t < 1) requestAnimationFrame(step); else resolve();
    }
    requestAnimationFrame(step);
  });
}

export const wait = s => new Promise(r => setTimeout(r, s * 1000));

export const store = {
  get(key, fallback) {
    try { const v = localStorage.getItem('gdl_' + key); return v === null ? fallback : JSON.parse(v); } catch (e) { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem('gdl_' + key, JSON.stringify(value)); } catch (e) { /* private mode */ }
  }
};

/** Tiny DOM helper: h('div', {class:'x', onclick}, [children]) */
export function h(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of [].concat(children)) if (c !== null && c !== undefined && c !== false) el.append(c.nodeType ? c : document.createTextNode(c));
  return el;
}

export const photoUrl = file => './assets/photos/' + file;
export const thumbUrl = file => './assets/photos/thumbs/' + file;

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Bild fehlt: ' + src));
    img.src = src;
  });
}

/** Fit a canvas to its parent width with a height function; returns ctx scaled for DPR */
export function fitCanvas(canvas, heightFor) {
  const w = canvas.parentElement.clientWidth || 320;
  const hgt = Math.round(heightFor(w));
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(hgt * dpr);
  canvas.style.height = hgt + 'px';
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { w, h: hgt, ctx, dpr };
}

export function heartPath2D(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * .9);
  ctx.bezierCurveTo(x - s * 1.45, y - s * .1, x - s * .62, y - s * 1.15, x, y - s * .42);
  ctx.bezierCurveTo(x + s * .62, y - s * 1.15, x + s * 1.45, y - s * .1, x, y + s * .9);
  ctx.closePath();
}

export const isTouch = () => matchMedia('(pointer: coarse)').matches;
export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
