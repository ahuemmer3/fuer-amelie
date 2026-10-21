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
        await page.waitForFunction(() => window.__galaxy.zoomReady() === 9, null, { timeout: 60000 });
        await page.waitForTimeout(2500);
        console.log(`  ${device}: ${(await fps(page)).toFixed(1)} FPS, Qualität ${await page.evaluate(() => window.__galaxy.quality.tier)}, GPU ${await page.evaluate(() => window.__galaxy.quality.gpu)}`);
        await shot('main');
      });
    }
  },
  async intro() {
    const devs = (process.argv[3] || 'desktop,iphone').split(',');
    for (const device of devs) {
      await session('intro-' + device, { device, query: device === 'iphone' ? '?q=medium' : '?q=high' }, async (page, shot) => {
        await page.waitForSelector('#intro:not([hidden])');
        await page.waitForTimeout(1200); await shot('01-card');
        await page.click('#openBtn');
        const at = async (sec, label) => {
          await page.waitForFunction(x => window.__galaxy.introT() >= x || window.__galaxy.phase() === 'main', sec, { timeout: 60000 });
          await shot(label);
        };
        await at(.6, '02-dissolve'); await at(4, '03-sonnensystem'); await at(15.4, '04-zum-schiff'); await at(17.4, '05-hinterher'); await at(20.6, '06-cockpit');
        await at(25.6, '07-saturn'); await at(30.9, '08-jupiter'); await at(37.8, '09-mars'); await at(43, '10-erde'); await at(47.5, '11-sturzflug');
        await at(55.6, '12-zuhause'); await at(59.8, '13-abflug'); await at(62.5, '14-galaxie');
        await waitPhase(page, 'main', 90000); await page.waitForTimeout(700); await shot('15-party');
        await page.waitForTimeout(5000); await shot('16-happy-birthday');
        await page.waitForFunction(() => ['»Amelie«', 'Alles Gute, Amelie'].includes((document.querySelector('.kar-title') || {}).textContent), null, { timeout: 40000 });
        await page.waitForTimeout(2500); await shot('17-song');
        console.log('  Song-Titel: ' + await page.$eval('.kar-title', e => e.textContent));
        const playing = await page.evaluate(() => !document.getElementById('karaoke').hidden);
        console.log(`  Karaoke sichtbar: ${playing ? 'ja' : 'nein'}`);
      });
    }
  },
  /** tap on the Earth in the galaxy: the zoom down to the house and back (easter egg) */
  async zoom() {
    for (const device of ['desktop', 'iphone']) {
      await session('zoom-' + device, { device, query: '?skip&reset&q=' + (device === 'iphone' ? 'medium' : 'high') }, async (page, shot) => {
        await waitPhase(page, 'main');
        await page.waitForFunction(() => window.__galaxy.zoomReady() === 9, null, { timeout: 60000 });
        await page.waitForTimeout(1500);
        await page.evaluate(() => window.__galaxy.zoom());
        for (const [sec, label] of [[1.2, 'a-earth'], [3.4, 'b-europe'], [5.4, 'c-region'], [7.2, 'd-village'], [9.4, 'e-home'], [11.6, 'f-up']]) {
          await page.waitForFunction(x => window.__galaxy.zoomT() >= x, sec, { timeout: 60000 }); await shot(label);
        }
        await waitPhase(page, 'main', 60000); await page.waitForTimeout(1200); await shot('g-back');
        const eggs = await page.evaluate(() => JSON.parse(localStorage.getItem('gdl_progress') || '{}').eggs || []);
        console.log(`  Zoom zum Haus → Easter Eggs: ${eggs.join(', ') || 'keins'}`);
      });
    }
  },
  /** the flight through the solar system with the starship */
  async flug() {
    await session('flug-' + (process.argv[3] || 'desktop'), { device: process.argv[3] || 'desktop', query: '?q=high' }, async (page, shot) => {
      await page.waitForSelector('#intro:not([hidden])'); await page.waitForTimeout(800);
      await page.click('#openBtn');
      for (const [sec, label] of [[3, 'a-oben'], [9, 'b-oben'], [15.4, 'c-sturz'], [17.4, 'd-hinterher'], [20.2, 'e-cockpit'], [21.6, 'f-cockpit'], [25.6, 'g-saturn'],
        [30.9, 'h-jupiter'], [34.6, 'i-asteroiden'], [37.8, 'j-mars'], [41.4, 'k-mond'], [44.5, 'l-erde'], [48, 'm-sturzflug'], [53.6, 'n-landung'], [59.8, 'o-abflug'], [62.4, 'p-ins-herz']]) {
        await page.waitForFunction(x => window.__galaxy.introT() >= x, sec, { timeout: 60000 }); await shot(label);
      }
    });
  },
  async games() {
    const ids = (process.argv[3] || 'fangen,torte,song,sehtest,memory,quiz,sternbild,rubbellos,zeit,momente,gruende,finale').split(',');
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
  async finale() {
    for (const device of ['desktop', 'iphone']) {
      await session('finale-' + device, { device, query: '?skip&q=' + (device === 'iphone' ? 'medium' : 'high') }, async (page, shot) => {
        await waitPhase(page, 'main');
        await page.evaluate(() => localStorage.setItem('gdl_progress', JSON.stringify({ done: ['fangen', 'memory', 'quiz', 'sternbild', 'rubbellos'], eggs: [], wishes: [] })));
        await page.reload(); await waitPhase(page, 'main'); await page.waitForTimeout(2000);
        await shot('unlocked');
        await page.evaluate(() => window.__galaxy.open('finale'));
        await page.waitForTimeout(2500); await shot('letter-1');
        await page.waitForTimeout(6000); await shot('letter-2');
      });
    }
  },
  async tap() {
    for (const device of ['desktop', 'iphone']) {
      await session('tap-' + device, { device, query: '?skip&reset&q=medium' }, async (page, shot) => {
        await waitPhase(page, 'main');
        await page.waitForTimeout(1500);
        // tap the planet above a visible label (the label sits just below its planet)
        const box = await page.$eval('.plabel.show:not(.locked)', el => { const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, name: el.textContent }; });
        if (device === 'iphone') await page.touchscreen.tap(box.x, box.y); else await page.mouse.click(box.x, box.y);
        await page.waitForTimeout(2200);
        const opened = await page.$eval('#overlay', el => !el.hidden).catch(() => false);
        console.log(`  Label „${box.name.trim()}“ angetippt → Overlay ${opened ? 'geöffnet' : 'NICHT geöffnet'}`);
        await shot('opened');
        await page.mouse.click(5, 5); // tap next to the panel closes it
        await page.waitForTimeout(1800);
        const closed = await page.$eval('#overlay', el => el.hidden);
        console.log(`  Klick daneben → Overlay ${closed ? 'geschlossen' : 'NICHT geschlossen'}`);
        // tap the heart
        const heart = await page.evaluate(() => ({ x: innerWidth / 2, y: innerHeight * (innerWidth < 600 ? .46 : .4) }));
        for (let i = 0; i < 5; i++) { if (device === 'iphone') await page.touchscreen.tap(heart.x, heart.y); else await page.mouse.click(heart.x, heart.y); await page.waitForTimeout(150); }
        await page.waitForTimeout(700);
        await shot('heart-egg');
        const eggs = await page.evaluate(() => JSON.parse(localStorage.getItem('gdl_progress') || '{}').eggs || []);
        console.log(`  5× Herz → Easter Eggs: ${eggs.join(', ') || 'keins'}`);
      });
    }
  },
  async birthday() {
    await session('birthday', { device: 'iphone', query: '?skip&reset&q=low' }, async (page, shot) => {
      await waitPhase(page, 'main');
      // cake: tap across the area where the flames are
      await page.evaluate(() => window.__galaxy.open('torte'));
      await page.waitForTimeout(1000);
      const box = await page.$('.g-stage canvas').then(e => e.boundingBox());
      for (let y = box.y + box.height * .15; y < box.y + box.height * .6; y += 18)
        for (let x = box.x + box.width * .2; x < box.x + box.width * .8; x += 18) await page.touchscreen.tap(x, y);
      await page.waitForTimeout(1200);
      const won = await page.$eval('.g-msg', el => el.classList.contains('win'));
      console.log(`  Torte: alle Kerzen aus → ${won ? 'Geburtstagswunsch angezeigt' : 'NICHT geschafft'}`);
      await shot('cake'); await page.keyboard.press('Escape'); await page.waitForTimeout(700);
      // catch game runs
      await page.evaluate(() => window.__galaxy.open('fangen'));
      await page.waitForTimeout(900);
      await page.click('.g-veil .g-btn'); await page.waitForTimeout(4000);
      await shot('catch'); await page.keyboard.press('Escape'); await page.waitForTimeout(700);
      // secret: hold the planet counter for 3 s
      const m = await page.$('#mapBtn').then(e => e.boundingBox());
      await page.mouse.move(m.x + m.width / 2, m.y + m.height / 2); await page.mouse.down();
      await page.waitForTimeout(3300); await page.mouse.up(); await page.waitForTimeout(800);
      const prog = await page.evaluate(() => JSON.parse(localStorage.getItem('gdl_progress')));
      const overlayOpen = await page.$eval('#overlay', el => !el.hidden);
      console.log(`  Geheim-Lösen: ${prog.done.length} Spiele erledigt, Übersicht ungewollt geöffnet: ${overlayOpen ? 'ja' : 'nein'}`);
      await shot('solved');
    });
  },
  /** renders assets/og-image.jpg (link preview) */
  async og() {
    const browser = await chromium.launch({ args: GPU_ARGS });
    const page = await (await browser.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 })).newPage();
    await page.goto(ORIGIN + '?skip&q=high');
    await waitPhase(page, 'main');
    await page.addStyleTag({ content: '#labels,#hud,#mapBtn,#hint,#toasts,#testBadge{display:none!important}' });
    await page.waitForTimeout(3500);
    await page.screenshot({ path: path.join(ROOT, 'assets', 'og-image.jpg'), type: 'jpeg', quality: 82 });
    await browser.close();
    console.log('✓ assets/og-image.jpg erstellt');
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

for (const [name, fn] of Object.entries(scenarios)) if (only ? only === name : name !== 'og') await fn();
server.close();
console.log(problems.length ? `\n${problems.length} Szenario(s) mit Meldungen.` : '\nAlles sauber.');
process.exit(0);
