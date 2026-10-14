/**
 * Picks a quality tier for the device and watches the frame rate at runtime.
 * Override with ?q=high | ?q=medium | ?q=low in the URL.
 */
const TIERS = {
  high:   { galaxy: 170000, heart: 20000, stream: 6000, stars: 9000, photos: 16, warp: 3000, dpr: 2,   bloomScale: 1,   floaters: 26 },
  medium: { galaxy: 100000, heart: 15000, stream: 4000, stars: 6000, photos: 12, warp: 2200, dpr: 2,   bloomScale: .6,  floaters: 18 },
  low:    { galaxy: 55000,  heart: 9000,  stream: 2500, stars: 3500, photos: 9,  warp: 1400, dpr: 1.5, bloomScale: .45, floaters: 12 }
};

export function detectQuality() {
  const ua = navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isMobile = isIOS || /Android|Mobile/.test(ua);
  const cores = navigator.hardwareConcurrency || 4;
  const mem = navigator.deviceMemory || 4;
  let gpu = '';
  try {
    const gl = document.createElement('canvas').getContext('webgl2') || document.createElement('canvas').getContext('webgl');
    const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
    gpu = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
  } catch (e) { /* ignore */ }
  const softwareGpu = /SwiftShader|llvmpipe|Software|Basic Render/i.test(gpu);

  let tier = 'high';
  if (isMobile) tier = (cores >= 6 || isIOS) ? 'medium' : 'low';
  else if (cores < 6 || mem < 4 || /Intel\(R\) (HD|UHD) Graphics [0-9]{3}\b/i.test(gpu)) tier = 'medium';
  if (softwareGpu) tier = 'low';

  const forced = new URLSearchParams(location.search).get('q');
  if (forced && TIERS[forced]) tier = forced;

  const t = { ...TIERS[tier] };
  return { tier, isMobile, isIOS, gpu, forced: !!forced, ...t, dpr: Math.min(window.devicePixelRatio || 1, t.dpr) };
}

/**
 * Measures the average frame time and calls onDowngrade(step) when the device can't keep up.
 * Steps: 1 = lower pixel ratio, 2 = fewer particles, 3 = smaller bloom, 4 = fewer particles again
 */
export class FpsGuard {
  constructor(onDowngrade, { target = 50, enabled = true } = {}) {
    this.onDowngrade = onDowngrade;
    this.target = target;
    this.enabled = enabled;
    this.acc = 0; this.frames = 0; this.step = 0; this.cool = 3; this.fps = 60;
  }
  update(dt) {
    if (!this.enabled) return;
    if (this.cool > 0) { this.cool -= dt; return; }
    this.acc += dt; this.frames++;
    if (this.acc >= 2) {
      this.fps = this.frames / this.acc;
      this.acc = 0; this.frames = 0;
      if (this.fps < this.target && this.step < 4) {
        this.step++;
        this.onDowngrade(this.step, this.fps);
        this.cool = 2.5;
      }
    }
  }
  pause(seconds = 1.5) { this.cool = Math.max(this.cool, seconds); this.acc = 0; this.frames = 0; }
}
