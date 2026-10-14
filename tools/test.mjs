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
  async interact() {
    await session('interact', { device: 'iphone', query: '?skip&q=low' }, async (page, shot) => {
      await waitPhase(page, 'main');
      await page.evaluate(() => localStorage.clear());
      const open = async id => { await page.evaluate(i => window.__galaxy.open(i), id); await page.waitForTimeout(900); };
      const close = async () => { await page.keyboard.press('Escape'); await page.waitForTimeout(600); };
      // memory: click matching pairs
      await open('memory');
      const keys = await page.$$eval('.mem-card', cs => cs.map(c => c.dataset.k));
      const seen = {};
      keys.forEach((k, i) => (seen[k] = seen[k] || []).push(i));
      for (const [a, b] of Object.values(seen)) {
        const cards = await page.$$('.mem-card');
        await cards[a].click(); await cards[b].click(); await page.waitForTimeout(350);
      }
      await page.waitForTimeout(900); await shot('memory-done'); await close();
      // quiz: always the configured answer
      await open('quiz');
      for (let q = 0; q < 5; q++) {
        const answers = await page.$$('.quiz-a button');
        const idx = await page.evaluate(n => import('./config.js').then(m => m.CONFIG.quiz[n].richtig), q);
        await answers[idx].click(); await page.waitForTimeout(250);
        await page.click('.g-row .g-btn.primary'); await page.waitForTimeout(250);
      }
      await shot('quiz-done'); await close();
      // secret
      await open('geheimfach');
      await page.fill('#secretInput', 'falsch'); await page.press('#secretInput', 'Enter'); await page.waitForTimeout(400);
      await page.fill('#secretInput', 'Liebe'); await page.press('#secretInput', 'Enter'); await page.waitForTimeout(900);
      await shot('secret-done'); await close();
      // hidden heart: 3 rounds
      await open('herzsuche');
      for (let r = 0; r < 3; r++) { await page.click('.hh-grid button[aria-label="Herz"]'); await page.waitForTimeout(1100); }
      await shot('herz-done'); await close();
      // wheel
      await open('gluecksrad');
      await page.click('.g-row .g-btn.primary'); await page.waitForTimeout(9000);
      await shot('wheel-done'); await close();
      // scratch
      await open('rubbellos');
      const box = await page.$('.scratch canvas').then(e => e.boundingBox());
      for (let y = box.y + 8; y < box.y + box.height; y += 22) {
        await page.mouse.move(box.x + 4, y); await page.mouse.down();
        await page.mouse.move(box.x + box.width - 4, y, { steps: 6 }); await page.mouse.up();
      }
      await page.waitForTimeout(900); await shot('scratch-done'); await close();
      // wish
      await open('wunschstern');
      await page.fill('#wishText', 'Ein Wochenende am Meer mit dir');
      await page.click('.g-btn.gold'); await page.waitForTimeout(5200);
      await shot('wish-flight');
      const prog = await page.evaluate(() => JSON.parse(localStorage.getItem('gdl_progress')));
      console.log('  erledigt:', prog.done.join(', '), '| Wünsche:', prog.wishes.length);
      await page.waitForTimeout(1500); await shot('after');
    });
  },
  async finale() {
    for (const device of ['desktop', 'iphone']) {
      await session('finale-' + device, { device, query: '?skip&q=' + (device === 'iphone' ? 'medium' : 'high') }, async (page, shot) => {
        await waitPhase(page, 'main');
        await page.evaluate(() => localStorage.setItem('gdl_progress', JSON.stringify({ done: ['fangen', 'memory', 'quiz', 'sternbild', 'rubbellos', 'gluecksrad', 'puzzle', 'wunschstern', 'herzsuche', 'geheimfach', 'umlaufbahn'], eggs: [], wishes: [] })));
        await page.reload(); await waitPhase(page, 'main'); await page.waitForTimeout(2000);
        await shot('unlocked');
        await page.evaluate(() => window.__galaxy.open('finale'));
        await page.waitForTimeout(2500); await shot('letter-1');
        await page.waitForTimeout(6000); await shot('letter-2');
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
