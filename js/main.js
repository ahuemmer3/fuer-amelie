import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CONFIG } from '../config.js';
import { detectQuality, FpsGuard } from './core/quality.js';
import { createRenderer } from './core/renderer.js';
import { Sound } from './core/audio.js';
import { Progress } from './core/progress.js';
import { clamp, lerp, ease, tween, heartBeat, thumbUrl, loadImage, rand } from './core/utils.js';
import { Galaxy, omegaAt } from './scene/galaxy.js';
import { Starfield } from './scene/starfield.js';
import { BlackHole } from './scene/blackhole.js';
import { Heart } from './scene/heart.js';
import { TextRings } from './scene/textrings.js';
import { PhotoOrbs } from './scene/photos.js';
import { Floaters } from './scene/floaters.js';
import { ShootingStars } from './scene/shooting-stars.js';
import { Planets } from './scene/planets.js';
import { Fireworks } from './scene/fireworks.js';
import { WishStars } from './scene/wishstars.js';
import { CardDissolve } from './intro/card.js';
import { Warp } from './intro/warp.js';
import { Journey } from './intro/journey.js';
import { Odyssey } from './intro/odyssey.js';
import { Karaoke } from './ui/karaoke.js';
import { buildSong, buildHappyBirthday, buildOdysseyTheme } from './core/songs.js';
import { Overlay } from './ui/overlay.js';
import { PhotoCard } from './ui/photo-card.js';
import { toast, confetti } from './ui/feedback.js';

/* ------------------------------------------------------------------ planets */
const PLANETS = [
  { id: 'fangen', title: 'Herzen fangen', icon: '💗', color: '#ff8a5c', tex: 'mars.webp', kind: 'spiel', module: './games/catch.js' },
  { id: 'torte', title: 'Geburtstagstorte', icon: '🎂', color: '#ffc58f', tex: 'jupiter.webp', kind: 'ueberraschung', module: './pages/cake.js' },
  { id: 'memory', title: 'Foto-Memory', icon: '🃏', color: '#7fc4ff', tex: 'earth.webp', kind: 'spiel', module: './games/memory.js' },
  { id: 'zeit', title: 'Unsere Zeit', icon: '⏳', color: '#d9d4e8', tex: 'moon.webp', kind: 'ueberraschung', module: './pages/counter.js' },
  { id: 'quiz', title: 'Unser Quiz', icon: '💭', color: '#6f8bff', tex: 'neptune.webp', kind: 'spiel', module: './games/quiz.js' },
  { id: 'song', title: 'Dein Song', icon: '🎤', color: '#ffd9a0', tex: 'saturn.webp', ring: true, kind: 'ueberraschung', module: './pages/song.js' },
  { id: 'sternbild', title: 'Sternbild', icon: '✨', color: '#9fe8ff', tex: 'uranus.webp', kind: 'spiel', module: './games/constellation.js' },
  { id: 'momente', title: 'Unsere Momente', icon: '📸', color: '#e8c9b0', tex: 'mercury.webp', kind: 'ueberraschung', module: './pages/timeline.js' },
  { id: 'rubbellos', title: 'Rubbellos', icon: '🎟️', color: '#ffd27a', tex: 'venus.webp', kind: 'spiel', module: './games/scratch.js' },
  { id: 'gruende', title: 'Gründe', icon: '💌', color: '#ff7ab8', tex: 'venus.webp', tint: '#ff9fd0', kind: 'ueberraschung', module: './pages/reasons.js' },
  { id: 'sehtest', title: 'Sehtest', icon: '👓', color: '#8fd0ff', tex: 'neptune.webp', tint: '#a8f0ff', kind: 'ueberraschung', module: './pages/eyetest.js' },
  { id: 'finale', title: 'Das letzte Geheimnis', icon: '💛', color: '#ffcf73', tex: 'jupiter.webp', tint: '#ffe0a0', kind: 'finale', module: './pages/final-letter.js' }
];
const REQUIRED = PLANETS.filter(p => p.kind === 'spiel').map(p => p.id);
const KICKER = { spiel: 'Spiel', ueberraschung: 'Überraschung', finale: 'Finale' };
const EGGS_TOTAL = 5;
const PLANET_TEXTURES = ['earth.webp', 'earth-night.webp', 'earth-clouds.webp', 'moon.webp', 'mars.webp', 'jupiter.webp', 'saturn.webp', 'saturn-ring.webp', 'milkyway.webp', 'neptune.webp', 'venus.webp', 'uranus.webp', 'mercury.webp'];
const planetTextures = {};

/* ------------------------------------------------------------------ setup */
const params = new URLSearchParams(location.search);
// ?reset (oder testModus in config.js) löscht den gespeicherten Fortschritt
if (params.has('reset') || CONFIG.testModus) {
  try { Object.keys(localStorage).filter(k => k.startsWith('gdl_')).forEach(k => localStorage.removeItem(k)); } catch (e) { /* ignore */ }
  Progress.reset();
  if (params.has('reset')) history.replaceState(null, '', location.pathname + location.search.replace(/[?&]reset/, '').replace(/^&/, '?'));
}
if (CONFIG.testModus) document.getElementById('testBadge').hidden = false;
const Q = detectQuality();
const canvas = document.getElementById('scene');
const R = createRenderer(canvas, Q);
const { scene, camera } = R;
const world = new THREE.Group();
scene.add(world);

const $ = id => document.getElementById(id);
const loaderPct = $('loaderPct'), loaderFill = $('loaderFill');
let objects = null;
let t = 0, fade = 0, phase = 'loading', introT = 0;
const clock = { last: performance.now(), getDelta() { const n = performance.now(), d = (n - this.last) / 1000; this.last = n; return d; } };

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = .06;
controls.enablePan = false;
controls.rotateSpeed = .55;
controls.zoomSpeed = .7;
controls.minDistance = 9;
controls.maxDistance = 46;
controls.minPolarAngle = .25;
controls.maxPolarAngle = 1.48;
controls.autoRotate = true;
controls.autoRotateSpeed = .35;
controls.enabled = false;

const START_POS = new THREE.Vector3(0, 22, 150);
const START_TARGET = new THREE.Vector3(0, 0, 0);
const homeView = () => (camera.aspect < .75
  ? { pos: new THREE.Vector3(0, 11.5, 28.5), target: new THREE.Vector3(0, 4.6, 0) }
  : { pos: new THREE.Vector3(0, 9.6, 23.5), target: new THREE.Vector3(0, 3.6, 0) });
camera.position.copy(START_POS);
camera.lookAt(START_TARGET);

/* ------------------------------------------------------------------ text from config */
$('cardTitle').textContent = CONFIG.karte.titel;
$('cardSub').textContent = CONFIG.karte.untertitel;
$('openBtn').querySelector('span').textContent = CONFIG.karte.button;
$('cardDate').textContent = CONFIG.karte.datum || new Date().toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });
const TITLES = [].concat(CONFIG.titel);
$('titleText').textContent = TITLES[0];
if (TITLES.length > 1) {
  let ti = 0;
  setInterval(() => {
    if (phase !== 'main' || document.hidden) return;
    const el = $('titleText');
    el.classList.add('swap');
    setTimeout(() => { ti = (ti + 1) % TITLES.length; el.textContent = TITLES[ti]; el.classList.remove('swap'); }, 900);
  }, 8000);
}
document.documentElement.style.setProperty('--pink', CONFIG.farben.akzent);

/* ------------------------------------------------------------------ loading */
function setProgress(p) {
  const v = Math.round(clamp(p, 0, 1) * 100);
  loaderPct.textContent = v;
  loaderFill.setAttribute('y', String(92 - 92 * p));
}

async function preload() {
  const photoItems = CONFIG.fotos.slice(0, Q.photos);
  const fonts = ['400 40px "Great Vibes"', 'italic 600 40px "Cormorant Garamond"', '600 16px "Manrope"'];
  const total = fonts.length + photoItems.length + PLANET_TEXTURES.length;
  let done = 0;
  const tick = () => setProgress(++done / total);
  const fontJobs = fonts.map(f => Promise.race([document.fonts.load(f), new Promise(r => setTimeout(r, 5000))]).catch(() => {}).then(tick));
  const imgJobs = photoItems.map(p => loadImage(thumbUrl(p.datei)).catch(err => { console.warn(err.message); return null; }).then(img => { tick(); return img; }));
  const portraitJobs = ((CONFIG.intro && CONFIG.intro.portraits) || []).map(f => loadImage(thumbUrl(f)).catch(() => null));
  const texLoader = new THREE.TextureLoader();
  const texJobs = PLANET_TEXTURES.map(f => texLoader.loadAsync('./assets/textures/' + f).then(tx => { planetTextures[f] = tx; tick(); }).catch(() => { console.warn('Textur fehlt: ' + f); tick(); }));
  const [, images, portraitImgs] = await Promise.all([Promise.all(fontJobs), Promise.all(imgJobs), Promise.all(portraitJobs), Promise.all(texJobs)]);
  const textures = images.map(img => {
    if (!img) return null;
    const tex = new THREE.Texture(img);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    tex.needsUpdate = true;
    return tex;
  });
  const portraits = portraitImgs.filter(Boolean).map(img => { const tx = new THREE.Texture(img); tx.colorSpace = THREE.SRGBColorSpace; tx.needsUpdate = true; return tx; });
  return { photoItems, textures, portraits };
}

function build({ photoItems, textures }) {
  const starfield = new Starfield({ count: Q.stars, pixelRatio: R.pixelRatio });
  scene.add(starfield.group);

  const galaxy = new Galaxy({ count: Q.galaxy, radius: 15, arms: 4, colors: CONFIG.farben, pixelRatio: R.pixelRatio });
  world.add(galaxy.points);

  const blackHole = new BlackHole({ radius: 1.25, colors: CONFIG.farben, steps: Q.tier === 'high' ? 110 : Q.tier === 'medium' ? 70 : 0 });
  world.add(blackHole.group);

  const heart = new Heart({ count: Q.heart, streamCount: Q.stream, colors: CONFIG.farben, pixelRatio: R.pixelRatio });
  world.add(heart.group);
  world.add(heart.stream);

  const rings = new TextRings({ rings: CONFIG.botschaften, maxTexture: Math.min(4096, R.renderer.capabilities.maxTextureSize) });
  world.add(rings.group);

  const valid = photoItems.map((p, i) => ({ p, tex: textures[i] })).filter(x => x.tex);
  const photos = new PhotoOrbs({ items: valid.map(x => x.p), textures: valid.map(x => x.tex), accent: CONFIG.farben.akzent });
  world.add(photos.group);

  const floaters = new Floaters({ count: Q.floaters });
  world.add(floaters.group);

  const shooting = new ShootingStars({ pixelRatio: R.pixelRatio });
  scene.add(shooting.group);

  const planets = new Planets({ defs: PLANETS, labelRoot: $('labels'), textures: planetTextures, onSelect: id => { if (phase === 'main' && !flying) openPlanet(PLANETS.find(p => p.id === id)); } });
  world.add(planets.group);

  const fireworks = new Fireworks({ max: Q.tier === 'low' ? 5000 : 9000, pixelRatio: R.pixelRatio });
  world.add(fireworks.points);

  const wishes = new WishStars({ pixelRatio: R.pixelRatio });
  world.add(wishes.group);
  Progress.wishes().forEach((w, i) => wishes.add(seedFrom(w.text + i), 0));

  return { starfield, galaxy, blackHole, heart, rings, photos, floaters, shooting, planets, fireworks, wishes };
}

const seedFrom = s => { let x = 0; for (const ch of s) x = (x * 31 + ch.charCodeAt(0)) % 100003; return (x % 1000) / 1000; };

function refreshPlanetStates() {
  for (const p of PLANETS) {
    if (p.kind === 'finale') objects.planets.setState(p.id, { locked: !Progress.allDone(REQUIRED), done: Progress.isDone('finale') });
    else objects.planets.setState(p.id, { done: Progress.isDone(p.id) });
  }
  const n = Progress.doneCount(REQUIRED);
  $('mapCount').textContent = `${n}/${REQUIRED.length}`;
  $('mapBtn').classList.toggle('all', n === REQUIRED.length);
}

/* ------------------------------------------------------------------ quality guard */
const guard = new FpsGuard((step, fps) => {
  if (!objects) return;
  if (params.has('debug')) console.info(`[Qualität] Stufe ${step} bei ${fps.toFixed(0)} FPS`);
  if (step === 1) setPixelRatio(Math.max(1, R.pixelRatio * .75));
  if (step === 2) { objects.galaxy.setDensity(.65); objects.heart.setDensity(.8); }
  if (step === 3) R.setBloomScale(Q.bloomScale * .6);
  if (step === 4) { objects.galaxy.setDensity(.45); setPixelRatio(1); }
}, { enabled: !Q.forced });

function setPixelRatio(v) {
  R.setPixelRatio(v);
  const o = objects;
  [o.galaxy, o.starfield, o.heart, o.fireworks, o.wishes, o.shooting].forEach(x => x.setPixelRatio(v));
}

/* ------------------------------------------------------------------ overlays */
let frozen = false, freezeTimer = 0, savedView = null, flying = false;
const overlay = new Overlay({
  onOpen: () => { freezeSoon(overlay.live ? -1 : .35); },
  onClose: id => { Sound.setEpic(false); unfreeze(); flyHome(); if (id && pendingWishes.length) setTimeout(flyWishes, 600); }
});
const photoCard = new PhotoCard({ photos: CONFIG.fotos, onOpen: () => freezeSoon(.35), onClose: () => unfreeze() });

function freezeSoon(sec) { clearTimeout(freezeTimer); if (sec < 0) return; freezeTimer = setTimeout(() => { frozen = true; }, sec * 1000); }
function unfreeze() { clearTimeout(freezeTimer); frozen = false; guard.pause(2); clock.getDelta(); }

function makeApi(def) {
  return {
    config: CONFIG,
    sfx: name => Sound.play(name),
    toast, confetti,
    close: () => overlay.close(),
    complete: () => markComplete(def.id),
    isDone: () => Progress.isDone(def.id),
    openPhoto: file => { const i = CONFIG.fotos.findIndex(f => f.datei === file); if (i >= 0) photoCard.open(i); },
    addWish: text => { Progress.addWish(text); pendingWishes.push(text); },
    wishes: () => Progress.wishes(),
    fireworks: (count = 3) => celebrate(count),
    heartRain: () => objects.floaters.rain(70),
    epic: on => Sound.setEpic(on),
    songLyrics: () => buildSong(Sound).lyrics,
    playSong: which => { Sound.ensureStarted({ file: CONFIG.musik.datei, volume: CONFIG.musik.lautstaerke }); overlay.close(); setTimeout(() => playKaraoke(which, () => Sound.releaseAmbient()), 420); },
    birthdaySong: () => Sound.happyBirthday(),
    eggCount: () => Progress.eggs().length,
    eggsTotal: EGGS_TOTAL
  };
}

async function openPlanet(def, { fly = true } = {}) {
  if (flying || overlay.isOpen) return;
  const p = objects.planets.get(def.id);
  if (def.kind === 'finale' && !Progress.allDone(REQUIRED)) {
    const left = REQUIRED.length - Progress.doneCount(REQUIRED);
    toast(`Noch verschlossen. Schaff erst alle Spiele, dann öffnet sich dieses Geheimnis. Es fehlen noch <b>${left}</b>.`);
    Sound.play('wrong');
    return;
  }
  hideHint();
  if (Sound.seqPlaying()) { Sound.stopSeq(); karaoke.hide(); Sound.releaseAmbient(); }
  Sound.play('whoosh');
  const modPromise = import(def.module);
  if (fly) await flyTo(p);
  let mod;
  try { mod = await modPromise; } catch (err) { console.error(err); toast('Dieses Spiel konnte nicht geladen werden.'); flyHome(); return; }
  overlay.open({ id: def.id, title: mod.title || def.title, kicker: KICKER[def.kind], live: !!mod.live, render: mod.default, api: makeApi(def) });
  Sound.play('open');
}

function markComplete(id) {
  if (!Progress.complete(id)) return;
  const def = PLANETS.find(p => p.id === id);
  refreshPlanetStates();
  if (def && def.kind === 'spiel') {
    const n = Progress.doneCount(REQUIRED);
    setTimeout(() => toast(`<b>${def.title}</b> geschafft! Der Planet leuchtet jetzt golden. (${n}/${REQUIRED.length})`), 400);
    if (Progress.allDone(REQUIRED)) {
      setTimeout(() => {
        toast('Alle Spiele geschafft! Über dem Herz ist gerade etwas aufgegangen …', 6500);
        celebrate(4);
        Sound.play('magic');
      }, 2200);
    }
  }
}

/* ------------------------------------------------------------------ camera moves */
async function flyTo(p) {
  flying = true;
  controls.enabled = false;
  savedView = { pos: camera.position.clone(), target: controls.target.clone() };
  const wp = p.group.getWorldPosition(new THREE.Vector3());
  let dir;
  if (p.def.kind === 'finale') dir = new THREE.Vector3(camera.position.x, 0, camera.position.z).normalize().multiplyScalar(6).add(new THREE.Vector3(0, .8, 0));
  else dir = new THREE.Vector3(wp.x, 0, wp.z).normalize().multiplyScalar(4.6).add(new THREE.Vector3(0, 1.6, 0));
  const to = wp.clone().add(dir);
  const from = camera.position.clone(), fromT = controls.target.clone(), tgt = new THREE.Vector3();
  await tween({ duration: 1.35, ease: ease.inOutCubic, onUpdate: k => {
    camera.position.lerpVectors(from, to, k);
    // arc the path a little upwards
    camera.position.y += Math.sin(k * Math.PI) * 2.5;
    tgt.lerpVectors(fromT, wp, k);
    camera.lookAt(tgt);
  } });
  flying = false;
}

async function flyHome() {
  if (!savedView) { controls.enabled = phase === 'main'; return; }
  flying = true;
  const from = camera.position.clone(), to = savedView.pos.clone();
  const fromT = new THREE.Vector3(); camera.getWorldDirection(fromT); fromT.multiplyScalar(5).add(camera.position);
  const toT = savedView.target.clone(), tgt = new THREE.Vector3();
  savedView = null;
  await tween({ duration: 1.2, ease: ease.inOutCubic, onUpdate: k => {
    camera.position.lerpVectors(from, to, k);
    tgt.lerpVectors(fromT, toT, k);
    camera.lookAt(tgt);
  } });
  controls.target.copy(toT);
  controls.enabled = true;
  flying = false;
}

/* ------------------------------------------------------------------ celebrations & wishes */
function celebrate(n = 3) {
  const cols = ['#ff4fa3', '#ffcf73', '#ff8fc7', '#b78cff', '#ffffff'];
  for (let i = 0; i < n; i++) {
    setTimeout(() => {
      const c = new THREE.Vector3(rand(-7, 7), rand(7, 12), rand(-5, 5));
      objects.fireworks.burst(c, { count: Q.tier === 'low' ? 450 : 800, color: cols[i % cols.length], speed: rand(4.5, 6.5), heart: i % 2 === 0 });
    }, i * 520);
  }
}

const pendingWishes = [];
function flyWishes() {
  const text = pendingWishes.shift();
  if (!text) return;
  const seed = seedFrom(text + Progress.wishes().length);
  const r = 3 + seed * 11, y = .4 + Math.sin(seed * 40) * .6, ang = seed * 1000 % (Math.PI * 2);
  const target = new THREE.Vector3(Math.cos(ang) * r, y, Math.sin(ang) * r);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: objects.planets.glowTexture(), color: '#ffd98a', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  const fwd = new THREE.Vector3(); camera.getWorldDirection(fwd);
  const from = camera.position.clone().add(fwd.multiplyScalar(4)).add(new THREE.Vector3(0, -.6, 0));
  world.add(sprite);
  Sound.play('magic');
  const dur = 2.4;
  tween({ duration: dur, ease: ease.inOutSine, onUpdate: k => {
    sprite.position.lerpVectors(from, target, k);
    sprite.position.y += Math.sin(k * Math.PI) * 3;
    sprite.scale.setScalar(lerp(1.6, .8, k) * (1 + Math.sin(k * 30) * .08));
  } }).then(() => {
    world.remove(sprite); sprite.material.dispose();
    objects.wishes.add(seed, t);
    objects.fireworks.burst(target, { count: 220, color: '#ffcf73', speed: 2.2 });
    toast('Dein Wunsch leuchtet jetzt als goldener Stern in der Galaxie.');
    if (pendingWishes.length) setTimeout(flyWishes, 500);
  });
}

/* ------------------------------------------------------------------ easter eggs */
function egg(id, text) {
  const isNew = Progress.findEgg(id);
  const n = Progress.eggs().length;
  toast(isNew ? `<b>Easter Egg ${n}/${EGGS_TOTAL}</b><br>${text}` : text, 6000);
  Sound.play('magic');
}

let heartTaps = [];
function onHeartTap() {
  objects.heart.explode();
  Sound.play('heart');
  const now = performance.now();
  heartTaps = heartTaps.filter(x => now - x < 2600);
  heartTaps.push(now);
  if (heartTaps.length >= 5) {
    heartTaps = [];
    objects.heart.gold(10);
    objects.floaters.rain(80);
    celebrate(2);
    egg('herz', CONFIG.easterEggs.herz);
  }
}

const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
let keyBuf = [], typed = '';
window.addEventListener('keydown', e => {
  if (phase !== 'main' || e.target.closest && e.target.closest('input, textarea')) return;
  keyBuf.push(e.key.length === 1 ? e.key.toLowerCase() : e.key); keyBuf = keyBuf.slice(-KONAMI.length);
  if (KONAMI.every((k, i) => keyBuf[i] === k)) { keyBuf = []; celebrate(5); objects.floaters.rain(60); egg('konami', CONFIG.easterEggs.konami); }
  if (e.key.length === 1) {
    typed = (typed + e.key.toLowerCase()).slice(-30);
    const words = [CONFIG.easterEggs.codewort, CONFIG.ihrName].filter(Boolean).map(w => w.toLowerCase());
    if (words.some(w => w.length > 2 && typed.endsWith(w))) { typed = ''; objects.heart.gold(8); celebrate(3); egg('wort', CONFIG.easterEggs.wort); }
  }
});

/* ------------------------------------------------------------------ pointer input */
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const pointers = new Map();
let down = null, longTimer = 0, hoverDirty = false, lastMove = { x: 0, y: 0 };

function pick(x, y) {
  ndc.set(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const o = objects, hits = [];
  ray.intersectObjects(o.planets.hitMeshes(), false).forEach(hh => hits.push({ type: 'planet', id: hh.object.userData.planetId, d: hh.distance }));
  ray.intersectObjects(o.photos.orbs, false).forEach(hh => { if (hh.uv && Math.hypot(hh.uv.x - .5, hh.uv.y - .5) < .42) hits.push({ type: 'photo', mesh: hh.object, d: hh.distance }); });
  ray.intersectObject(o.heart.hit, false).forEach(hh => hits.push({ type: 'heart', d: hh.distance + 1.5 }));
  hits.sort((a, b) => a.d - b.d);
  if (hits.length) return hits[0];
  if (ray.intersectObject(o.blackHole.hit, false).length) return { type: 'blackhole' };
  return null;
}

canvas.addEventListener('pointerdown', e => {
  pointers.set(e.pointerId, e);
  if (phase !== 'main' || overlay.isOpen || photoCard.isOpen) return;
  if (pointers.size > 1) { down = null; clearTimeout(longTimer); return; }
  down = { x: e.clientX, y: e.clientY, t: performance.now() };
  clearTimeout(longTimer);
  longTimer = setTimeout(() => {
    if (!down) return;
    const hit = pick(down.x, down.y);
    if (hit && hit.type === 'blackhole') { down = null; objects.heart.pull(); Sound.play('swallow'); egg('schwarzesloch', CONFIG.easterEggs.schwarzesLoch); }
  }, 700);
});
canvas.addEventListener('pointermove', e => {
  if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 10) { down = null; clearTimeout(longTimer); }
  if (e.pointerType === 'mouse') { lastMove = { x: e.clientX, y: e.clientY }; hoverDirty = true; parallax.tx = (e.clientX / innerWidth - .5) * 2; parallax.ty = (e.clientY / innerHeight - .5) * 2; }
});
const endPointer = e => {
  pointers.delete(e.pointerId);
  clearTimeout(longTimer);
  if (!down || phase !== 'main') { down = null; return; }
  const d = down; down = null;
  if (performance.now() - d.t > 550) return;
  onTap(e.clientX, e.clientY);
};
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', e => { pointers.delete(e.pointerId); down = null; clearTimeout(longTimer); });

function onTap(x, y) {
  if (overlay.isOpen || photoCard.isOpen || flying) return;
  if (objects.shooting.hitTest(x, y, camera, innerWidth, innerHeight)) { celebrate(1); egg('sternschnuppe', CONFIG.easterEggs.sternschnuppe); return; }
  const hit = pick(x, y);
  if (!hit) return;
  if (hit.type === 'planet') openPlanet(PLANETS.find(p => p.id === hit.id));
  else if (hit.type === 'photo') { Sound.play('tap'); photoCard.open(CONFIG.fotos.indexOf(hit.mesh.userData.item)); }
  else if (hit.type === 'heart') onHeartTap();
}

function updateHover() {
  if (!hoverDirty || phase !== 'main' || overlay.isOpen || photoCard.isOpen) return;
  hoverDirty = false;
  const hit = pick(lastMove.x, lastMove.y);
  objects.planets.setHover(hit && hit.type === 'planet' ? hit.id : null);
  objects.photos.setHover(hit && hit.type === 'photo' ? hit.mesh : null);
  canvas.style.cursor = hit && hit.type !== 'blackhole' ? 'pointer' : 'grab';
}

/* parallax from mouse or device tilt */
const parallax = { x: 0, y: 0, tx: 0, ty: 0 };
function enableTilt() {
  const onTilt = e => {
    if (e.gamma == null) return;
    parallax.tx = clamp(e.gamma / 25, -1, 1);
    parallax.ty = clamp((e.beta - 50) / 25, -1, 1);
  };
  const D = window.DeviceOrientationEvent;
  if (D && typeof D.requestPermission === 'function') D.requestPermission().then(s => s === 'granted' && addEventListener('deviceorientation', onTilt)).catch(() => {});
  else if (D) addEventListener('deviceorientation', onTilt);
}

/* ------------------------------------------------------------------ HUD */
const musicBtn = $('musicBtn'), sfxBtn = $('sfxBtn');
musicBtn.addEventListener('click', () => musicBtn.setAttribute('aria-pressed', String(Sound.toggleMusic())));
sfxBtn.addEventListener('click', () => sfxBtn.setAttribute('aria-pressed', String(Sound.toggleSfx())));
// Secret: hold the planet counter for 3 seconds → all games solved (in case it takes too long)
let holdTimer = 0, holdFired = false;
const mapBtn = $('mapBtn');
mapBtn.addEventListener('pointerdown', () => { holdFired = false; clearTimeout(holdTimer); holdTimer = setTimeout(() => { holdFired = true; solveAll(); }, 3000); });
['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => mapBtn.addEventListener(ev, () => clearTimeout(holdTimer)));
mapBtn.addEventListener('contextmenu', e => e.preventDefault());
// Secret: hold the title of an open game for 2 seconds → this game counts as solved
let titleHold = 0;
const ovTitle = $('ovTitle');
ovTitle.addEventListener('pointerdown', () => { clearTimeout(titleHold); titleHold = setTimeout(() => solveCurrent(), 2000); });
['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => ovTitle.addEventListener(ev, () => clearTimeout(titleHold)));
ovTitle.addEventListener('contextmenu', e => e.preventDefault());

function solveAll() {
  if (phase !== 'main') return;
  const before = Progress.doneCount(REQUIRED);
  REQUIRED.forEach(id => Progress.complete(id));
  refreshPlanetStates();
  Sound.play('magic'); celebrate(4);
  toast(before === REQUIRED.length ? 'Schon alles gelöst. Das letzte Geheimnis über dem Herz ist offen.' : 'Alle Spiele gelöst ✨ Das letzte Geheimnis über dem Herz ist jetzt offen.', 6000);
}
function solveCurrent() {
  const id = overlay.id;
  if (!id || !REQUIRED.includes(id)) return;
  if (Progress.isDone(id)) { toast('Dieses Spiel ist schon geschafft.'); return; }
  markComplete(id);
  Sound.play('magic');
}

mapBtn.addEventListener('click', () => {
  if (holdFired) { holdFired = false; return; }
  if (overlay.isOpen || phase !== 'main') return;
  Sound.play('tap');
  overlay.open({ id: null, title: 'Eure Galaxie', kicker: 'Übersicht', render: renderMap, api: {} });
});
function renderMap(body) {
  const sec = (label, list) => {
    const h = document.createElement('p'); h.className = 'map-sec'; h.textContent = label; body.appendChild(h);
    const wrap = document.createElement('div'); wrap.className = 'map-list';
    list.forEach(def => {
      const locked = def.kind === 'finale' && !Progress.allDone(REQUIRED);
      const done = Progress.isDone(def.id);
      const b = document.createElement('button'); b.type = 'button';
      b.className = done ? 'done' : '';
      b.disabled = locked;
      b.innerHTML = `<span class="ic">${locked ? '🔒' : def.icon}</span><span></span><span class="st">${done ? '✓' : ''}</span>`;
      b.children[1].textContent = def.title;
      b.addEventListener('click', () => { overlay.close(true); openPlanet(def); });
      wrap.appendChild(b);
    });
    body.appendChild(wrap);
  };
  const n = Progress.doneCount(REQUIRED);
  const lead = document.createElement('p'); lead.className = 'g-lead';
  lead.textContent = `${n} von ${REQUIRED.length} Spielen geschafft. ${Progress.eggs().length} von ${EGGS_TOTAL} Easter Eggs gefunden. Tipp: Probier ruhig mal Dinge in der Galaxie aus.`;
  body.appendChild(lead);
  sec('Spiele', PLANETS.filter(p => p.kind === 'spiel'));
  sec('Überraschungen', PLANETS.filter(p => p.kind === 'ueberraschung'));
  sec('Finale', PLANETS.filter(p => p.kind === 'finale'));
  const credit = document.createElement('p'); credit.className = 'map-sec'; credit.style.marginTop = '14px';
  credit.innerHTML = 'Planetentexturen: <a href="https://www.solarsystemscope.com/textures/" target="_blank" rel="noopener" style="color:inherit">Solar System Scope</a> (CC BY 4.0)';
  body.appendChild(credit);
}
let hintShown = false;
function hideHint() { if (!hintShown) return; hintShown = false; $('hint').classList.remove('show'); }

/* ------------------------------------------------------------------ intro */
// timeline in seconds after tapping "Öffnen":
// card → particles (0–1.25) · odyssey past Earth, Moon, Mars, Jupiter, Saturn into a wormhole (1.25–20.85)
// · out of the wormhole into the galaxy, the two portraits fly into the heart · surprise party → Happy Birthday → song
let dissolve, warp, journey, odyssey, portraitTextures = [];
let odStarted = false, odEnded = false, arrived = false, flashed = {};
const tmpV = new THREE.Vector3();
const OD_START = 1.25, OD_DUR = 19.6, SPACE_START = OD_START + OD_DUR;
const J_START = SPACE_START + .25, J_DUR = 6.5, J_ARRIVE = .779 * J_DUR + .9;
const ARRIVE_AT = J_START + J_ARRIVE;
const HEART_POS = new THREE.Vector3(0, 5.1, 0);
const BLOOM = { strength: R.bloom.strength, threshold: R.bloom.threshold, exposure: R.renderer.toneMappingExposure };

function startIntro() {
  phase = 'intro'; introT = 0;
  Sound.start({ file: CONFIG.musik.datei, volume: CONFIG.musik.lautstaerke, holdAmbient: Infinity });
  enableTilt();
  Sound.play('open');
  dissolve = new CardDissolve({ camera, pixelRatio: R.pixelRatio, maxCount: Q.tier === 'low' ? 7000 : 13000 });
  dissolve.build($('card'));
  $('intro').classList.add('leaving');
  setTimeout(() => { $('intro').hidden = true; }, 460);
  $('letterbox').classList.add('on');
  const intro = CONFIG.intro || {};
  warp = new Warp({ camera, count: Q.warp });
  odyssey = new Odyssey({ camera, quality: Q, captionsEl: $('cine'), lines: intro.reise || [], textures: planetTextures });
  journey = new Journey({ parent: world, camera, portraits: portraitTextures, home: homeView(), heartPos: HEART_POS, quality: Q, captionsEl: $('cine'), lines: intro.ankunft || [] });
  setTimeout(() => { if (phase === 'intro') $('skipBtn').hidden = false; }, 1500);
}

function flash(kind = 'go') {
  const f = $('flash');
  f.classList.remove('go', 'white'); void f.offsetWidth; f.classList.add(kind);
}

function enterOdyssey() {
  odStarted = true;
  odyssey.scene.add(camera);
  R.setScene(odyssey.scene);
  R.bloom.strength = .55; R.bloom.threshold = .86;
  odyssey.start();
  if (Sound.ctx) Sound.playSeq(buildOdysseyTheme(Sound), { song: false });
}

function leaveOdyssey() {
  odEnded = true;
  scene.add(camera);
  R.setScene(scene);
  R.bloom.strength = BLOOM.strength; R.bloom.threshold = BLOOM.threshold;
  R.renderer.toneMappingExposure = BLOOM.exposure;
  odyssey.finish();
  camera.position.copy(journey.startPos);
  camera.lookAt(journey.beamSamples[Math.round(.06 * (journey.beamSamples.length - 1))]);
  warp.start();
  Sound.play('whoosh');
  Sound.cinematic(ARRIVE_AT - SPACE_START);
}

function updateIntro(dt) {
  introT += dt;
  dissolve && dissolve.update(dt);
  if (!flashed.a && introT >= OD_START - .25) { flashed.a = true; flash('white'); }
  if (!odStarted && introT >= OD_START) enterOdyssey();
  if (odStarted && !odEnded) {
    if (!flashed.b && odyssey.t >= OD_DUR - .3) { flashed.b = true; flash('white'); }
    if (odyssey.update(dt) === 'done') leaveOdyssey();
  }
  if (odEnded) {
    if (warp.active) warp.update(dt);
    if (introT >= J_START) {
      if (journey.t < 0) journey.start(J_DUR);
      if (journey.update(dt) === 'arrive') onArrive();
    } else {
      camera.position.copy(journey.startPos);
      camera.lookAt(journey.beamSamples[Math.round(.06 * (journey.beamSamples.length - 1))]);
    }
  }
  fade = odEnded ? ease.inOutSine(clamp((introT - SPACE_START) / 3.5, 0, 1)) : 0;
  if (introT > J_START + J_DUR + .4) enterMain();
}

/** the two portraits reach the heart: it bursts, then the surprise party starts */
function onArrive() {
  if (arrived) return;
  arrived = true;
  objects.heart.explode();
  const hp = objects.heart.group.getWorldPosition(new THREE.Vector3());
  objects.fireworks.burst(hp, { count: Q.tier === 'low' ? 600 : 1100, color: '#ff4fa3', speed: 6, heart: true });
  objects.fireworks.burst(hp, { count: 400, color: '#ffcf73', speed: 3.5 });
  flash('go');
  $('letterbox').classList.remove('on');
  surpriseParty();
}

function surpriseParty() {
  Sound.party();
  const el = $('surprise');
  el.hidden = false; el.classList.remove('go'); void el.offsetWidth; el.classList.add('go');
  confetti({ count: 150, x: .06, y: .96 });
  setTimeout(() => confetti({ count: 150, x: .94, y: .96 }), 120);
  setTimeout(() => celebrate(5), 300);
  objects.floaters.rain(70);
  setTimeout(() => { el.hidden = true; }, 3000);
  // Happy Birthday, then the song
  setTimeout(() => { if (Sound.ctx) playKaraoke('hb', () => setTimeout(() => playKaraoke('song', () => Sound.releaseAmbient()), 700)); }, 2800);
}

const karaoke = new Karaoke({ root: $('karaoke'), onStop: () => { Sound.stopSeq(); Sound.releaseAmbient(); } });
function playKaraoke(which, onEnd) {
  if (!Sound.ctx) return;
  const hb = which === 'hb';
  const seq = hb ? buildHappyBirthday(Sound) : buildSong(Sound);
  Sound.playSeq(seq, { onEnd: () => { karaoke.hide(); onEnd && onEnd(); } });
  karaoke.play({
    title: hb ? 'Happy Birthday' : '»Amelie«',
    sub: hb ? 'Alle singen mit!' : `Ein Song für dich · Text & Musik: ${CONFIG.deinName}`,
    lines: seq.lyrics,
    time: () => Sound.seqTime()
  });
}

function skipIntro() {
  if (phase !== 'intro') return;
  dissolve && dissolve.dispose();
  if (!odEnded) {
    if (odStarted) { scene.add(camera); R.setScene(scene); R.bloom.strength = BLOOM.strength; R.bloom.threshold = BLOOM.threshold; R.renderer.toneMappingExposure = BLOOM.exposure; }
    odStarted = odEnded = true;
    odyssey.finish();
  }
  Sound.stopSeq(false);
  if (warp && warp.active) warp.stop();
  journey && journey.finish();
  Sound.skipCinematic();
  $('intro').hidden = true;
  $('cine').classList.remove('in', 'big');
  fade = 1;
  enterMain();
  if (!arrived) setTimeout(onArrive, 350);
}
$('skipBtn').addEventListener('click', skipIntro);

function enterMain(home = homeView()) {
  phase = 'main';
  $('skipBtn').hidden = true;
  if (journey && !journey.done) journey.finish();
  objects.planets.labelsOn = true;
  fade = 1;
  controls.target.copy(home.target);
  camera.position.copy(home.pos);
  controls.enabled = true;
  controls.update();
  objects.shooting.enabled = true;
  $('title').classList.add('show'); $('hud').classList.add('show'); $('mapBtn').classList.add('show');
  setTimeout(() => $('letterbox').classList.remove('on'), 400);
  guard.pause(3);
  if (!Progress.doneCount(REQUIRED)) setTimeout(() => { hintShown = true; $('hint').classList.add('show'); }, 900);
}

/* ------------------------------------------------------------------ loop */
function setFade(f) {
  const o = objects;
  o.galaxy.material.uniforms.uOpacity.value = f;
  o.blackHole.setOpacity(f);
  o.heart.setOpacity(f);
  o.rings.setOpacity(ease.inCubic(f));
  o.photos.setOpacity(ease.inCubic(f));
  o.floaters.setOpacity(f);
  o.wishes.setOpacity(f);
  o.planets.setVisible(ease.inCubic(f));
}

function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(.05, clock.getDelta());
  if (!objects) return;
  if (frozen) return;
  t += dt;
  const o = objects;
  const audio = Sound.level();
  const beat = heartBeat(t);

  if (phase === 'intro') updateIntro(dt);
  setFade(fade);

  o.starfield.update(t);
  o.galaxy.update(t, audio);
  o.blackHole.update(t, beat * .45 + audio * .5);
  o.heart.update(t, dt, audio);
  o.rings.update(t);
  o.photos.update(t, dt, camera);
  o.floaters.update(t, dt);
  o.shooting.update(dt, camera);
  o.fireworks.update(t);
  o.wishes.update(t);
  o.planets.update(t, dt, camera, innerWidth, innerHeight);

  parallax.x += (parallax.tx - parallax.x) * Math.min(1, dt * 2.5);
  parallax.y += (parallax.ty - parallax.y) * Math.min(1, dt * 2.5);
  world.rotation.x = parallax.y * .045;
  world.rotation.z = -parallax.x * .035;

  if (phase === 'main' && controls.enabled && !flying) controls.update(dt);
  updateHover();
  if (odStarted && !odEnded) R.updateLens(odyssey.wormPos, odyssey.wormR, 1.1);
  else R.updateLens(o.blackHole.group.getWorldPosition(tmpV), 1.25, .3 * fade);
  R.render(t);
  if (phase === 'main' && !flying) guard.update(dt);
}

let resizeRaf = 0;
addEventListener('resize', () => {
  cancelAnimationFrame(resizeRaf);
  resizeRaf = requestAnimationFrame(() => {
    R.resize();
    if (phase === 'main' && !flying && !savedView) {
      const home = homeView();
      const dist = camera.position.distanceTo(controls.target);
      if (camera.aspect < .75 && dist < 28) camera.position.sub(controls.target).setLength(home.pos.length()).add(controls.target);
    }
  });
});
document.addEventListener('visibilitychange', () => { if (!document.hidden) { clock.getDelta(); guard.pause(2); } });

/* ------------------------------------------------------------------ boot */
(async function boot() {
  try {
    const assets = await preload();
    objects = build(assets);
    portraitTextures = assets.portraits;
    refreshPlanetStates();
    Progress.onChange(refreshPlanetStates);
    window.__galaxy = { quality: Q, fps: () => guard.fps, phase: () => phase, introT: () => introT, open: id => openPlanet(PLANETS.find(p => p.id === id), { fly: false }), party: () => onArrive() };
    clock.getDelta();
    requestAnimationFrame(frame);
    setProgress(1);
    await new Promise(r => setTimeout(r, 350));
    $('loader').classList.add('done');
    if (params.has('skip')) {
      $('intro').hidden = true;
      enterMain();
    } else {
      $('intro').hidden = false;
      $('openBtn').addEventListener('click', startIntro, { once: true });
    }
  } catch (err) {
    console.error(err);
    $('loader').querySelector('.loader-sub').textContent = 'Da ist etwas schiefgelaufen. Bitte Seite neu laden.';
  }
})();
