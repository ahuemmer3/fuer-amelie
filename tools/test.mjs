/**
 * Lokaler Test mit Playwright.
 *   cd tools && npm install && npx playwright install chromium webkit
 *   node test.mjs              → alle Szenarien
 *   node test.mjs scene        → nur ein Szenario
 * Screenshots landen in tools/screenshots/
 */
import { chromium, webkit, devices } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'tools', 'screenshots');
fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.txt': 'text/plain' };

// serve under a sub path like GitHub Pages does (/galaxie-der-liebe/)
const BASE = '/galaxie-der-liebe/';
const server = http.createServer((req, res) => {
  let url = decodeURIComponent(req.url.split('?')[0]);
  if (!url.startsWith(BASE)) { res.writeHead(404); res.end('outside base: ' + url); return; }
  let file = path.join(ROOT, url.slice(BASE.length));
  if (file.endsWith(path.sep) || url === BASE) file = path.join(file, 'index.html');
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('404'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
});
await new Promise(r => server.listen(5173, r));
const ORIGIN = 'http://localhost:5173' + BASE;

const GPU_ARGS = ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'];
const only = process.argv[2];
const problems = [];

async function session(name, { device = 'desktop', engine = 'chromium', query = '' } = {}, fn) {
  const browserType = engine === 'webkit' ? webkit : chromium;
  const browser = await browserType.launch({ args: engine === 'chromium' ? GPU_ARGS : [] });
  const ctxOpts = device === 'iphone' ? { ...devices['iPhone 14'] } : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 };
  if (engine === 'chromium' && device === 'iphone') delete ctxOpts.defaultBrowserType;
  const context = await browser.newContext(ctxOpts);
  const page = await context.newPage();
  const logs = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') logs.push(`[${m.type()}] ${m.text()}`); });
  page.on('pageerror', e => logs.push('[pageerror] ' + e.message));
  page.on('requestfailed', r => logs.push('[requestfailed] ' + r.url()));
  page.on('response', r => { if (r.status() >= 400) logs.push(`[http ${r.status()}] ${r.url()}`); });
  await page.goto(ORIGIN + query, { waitUntil: 'load' });
  const shot = async label => page.screenshot({ path: path.join(OUT, `${name}-${label}.png`) });
  try { await fn(page, shot); } catch (e) { logs.push('[test] ' + e.message); }
  const tag = `${name} (${engine}, ${device})`;
  if (logs.length) { problems.push(tag); console.log(`✗ ${tag}\n  ` + logs.join('\n  ')); } else console.log(`✓ ${tag}`);
  await browser.close();
}

const waitPhase = (page, p, timeout = 30000) => page.waitForFunction(ph => window.__galaxy && window.__galaxy.phase() === ph, p, { timeout });
const fps = async page => page.evaluate(() => new Promise(res => { let n = 0; const s = performance.now(); (function f() { n++; if (performance.now() - s < 2000) requestAnimationFrame(f); else res(n / ((performance.now() - s) / 1000)); })(); }));

const scenarios = {
  async scene() {
    for (const device of ['desktop', 'iphone']) {
      await session('scene-' + device, { device, query: '?skip&q=' + (device === 'iphone' ? 'medium' : 'high') }, async (page, shot) => {
        await waitPhase(page, 'main');
        await page.waitForTimeout(2500);
        console.log(`  ${device}: ${(await fps(page)).toFixed(1)} FPS, Qualität ${await page.evaluate(() => window.__galaxy.quality.tier)}, GPU ${await page.evaluate(() => window.__galaxy.quality.gpu)}`);
        await shot('main');
      });
    }
  },
  async intro() {
    for (const device of ['desktop', 'iphone']) {
      await session('intro-' + device, { device, query: device === 'iphone' ? '?q=medium' : '?q=high' }, async (page, shot) => {
        await page.waitForSelector('#intro:not([hidden])');
        await page.waitForTimeout(1600);
        await shot('1-card');
        await page.click('#openBtn');
        await page.waitForTimeout(500); await shot('2-dissolve');
        await page.waitForTimeout(1300); await shot('3-warp');
        await page.waitForTimeout(1600); await shot('4-fly');
        await waitPhase(page, 'main');
        await page.waitForTimeout(1500); await shot('5-main');
      });
    }
  },
  async games() {
    const ids = (process.argv[3] || 'fangen,memory,quiz,sternbild,rubbellos,gluecksrad,puzzle,wunschstern,herzsuche,geheimfach,umlaufbahn,zeit,momente,gruende,finale').split(',');
    for (const device of ['desktop', 'iphone']) {
      await session('games-' + device, { device, query: '?skip&q=low' }, async (page, shot) => {
        await waitPhase(page, 'main');
        for (const id of ids) {
          await page.evaluate(i => window.__galaxy.open(i), id);
          await page.waitForTimeout(1100);
          await shot(id);
          await page.keyboard.press('Escape');
          await page.waitForTimeout(500);
        }
      });
    }
  },
  async webkit() {
    await session('webkit-iphone', { device: 'iphone', engine: 'webkit', query: '?skip&q=medium' }, async (page, shot) => {
      await waitPhase(page, 'main');
      await page.waitForTimeout(2500);
      await shot('main');
      await page.evaluate(() => window.__galaxy.open('memory'));
      await page.waitForTimeout(1200);
      await shot('memory');
    });
  }
};

for (const [name, fn] of Object.entries(scenarios)) if (!only || only === name) await fn();
server.close();
console.log(problems.length ? `\n${problems.length} Szenario(s) mit Meldungen.` : '\nAlles sauber.');
process.exit(0);
