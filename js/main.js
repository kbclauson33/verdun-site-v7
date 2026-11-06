import { BarFilm, projectBox, loadImage } from './barfilm.js';

const { gsap, ScrollTrigger, SplitText, CustomEase, Lenis } = window;
gsap.registerPlugin(ScrollTrigger, SplitText, CustomEase);
CustomEase.create('vOut', '0.16,1,0.3,1');
CustomEase.create('vIo', '0.7,0,0.2,1');

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const html = document.documentElement;
const params = new URLSearchParams(location.search);
const REDUCE = html.classList.contains('reduce-motion');
const AUDIT = params.has('audit');
const AUDIT_T = parseFloat(params.get('t'));
const mqPhone = matchMedia('(max-width: 640px)');
const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
const IMG = [1920, 1080];
const BOX = {
  person: { x: 0.553, y: 0.727, w: 0.038, h: 0.078 },
  vehicle: { x: 0.473, y: 0.558, w: 0.152, h: 0.299 },
};
const DEMOS = [
  { where: 'TRUCK CAB / DEMO 02', title: 'Possible vehicle break-in', tag: 'AI: Dispatch', tone: 'red', text: 'Person repeatedly trying the cab door. Immediate operator review.', pt: [0.572, 0.762] },
  { where: 'LOADING AREA / DEMO 01', title: 'Maintenance', tag: 'AI: Non-threatening', tone: 'blue', text: 'Forklift operator carrying out routine yard maintenance. No threat identified.', pt: [0.503, 0.548] },
  { where: 'RIGHT GARAGE / DEMO 03', title: 'Loitering by garage', tag: 'AI: Voice down', tone: 'amber', text: 'Person lingering near the garage door. Operator voice-down requested.', pt: [0.629, 0.342] },
];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const timeout = (ms) => new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms));
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

/* ------------------------------------------------------------------ */
/* Smooth scroll                                                       */
/* ------------------------------------------------------------------ */
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
const lenis = new Lenis({ lerp: REDUCE ? 1 : 0.085, smoothWheel: !REDUCE, wheelMultiplier: 0.95, touchMultiplier: 1.4 });
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((t) => lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);

function scrollToTarget(target, opts = {}) {
  lenis.scrollTo(target, Object.assign({ duration: REDUCE ? 0 : 1.6, easing: (t) => 1 - Math.pow(1 - t, 4), offset: 0, force: true }, opts));
}
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const id = a.getAttribute('href');
  if (id.length < 2) return;
  const el = document.querySelector(id);
  if (!el) return;
  e.preventDefault();
  if (!$('#menu').hidden) closeMenu();
  const off = id === '#top' ? 0 : (id === '#approach' || id === '#platform') ? -20 : -40;
  scrollToTarget(id === '#top' ? 0 : el, { offset: off });
  history.replaceState(null, '', id);
  setTimeout(() => { el.setAttribute('tabindex', '-1'); el.focus({ preventScroll: true }); }, REDUCE ? 0 : 1300);
});

/* ------------------------------------------------------------------ */
/* Wordmarks: fit SVG viewBox to the rendered glyphs                   */
/* ------------------------------------------------------------------ */
let stripeP = 7;
function fitWordmarks() {
  // Vertical ink bounds from canvas metrics (SVG bbox includes the whole em box).
  const cx = document.createElement('canvas').getContext('2d');
  cx.font = '600 300px Geist';
  const m = cx.measureText('verdun');
  const asc = m.actualBoundingBoxAscent || 222;
  const desc = m.actualBoundingBoxDescent || 4;
  let vbw = 1000;
  $$('[data-wm-text]').forEach((t) => {
    try {
      const b = t.getBBox();
      if (b.width < 10) return;
      const left = b.x + 6, w = b.width - 6 + 18 * 0.2;
      vbw = w;
      t.ownerSVGElement.setAttribute('viewBox', `${left} ${200 - asc - 2} ${w} ${asc + desc + 4}`);
    } catch (e) { /* ignore */ }
  });
  // Keep the stripe period near 6–8 screen px whatever the wordmark size.
  const svg = $('.wordmark__svg');
  const px = (svg && svg.clientWidth) || window.innerWidth;
  const target = px < 500 ? 4.2 : px < 900 ? 5.5 : 7.5;
  stripeP = Math.max(3, (target * vbw) / px);
  const pat = $('#stripes');
  pat.setAttribute('width', stripeP.toFixed(2));
  const r = $('.stripe-rect');
  if (+r.getAttribute('width') > stripeP * 0.2) r.setAttribute('width', (stripeP * 0.64).toFixed(2));
}
// Separate filter for the footer so the two marks animate independently.
(function cloneFilter() {
  const f = $('#jag');
  const c = f.cloneNode(true); c.id = 'jag-foot';
  f.parentNode.appendChild(c);
  $('.footer__mark text').setAttribute('filter', 'url(#jag-foot)');
})();
const jagHero = $('#jag feDisplacementMap');
const jagFoot = $('#jag-foot feDisplacementMap');
const stripeRect = $('.stripe-rect');

/* ------------------------------------------------------------------ */
/* Hero film                                                           */
/* ------------------------------------------------------------------ */
const stage = $('[data-stage]');
const film = new BarFilm($('[data-film]'), {
  col: mqPhone.matches ? 5 : 7, ink: '#2f4c78', inkHi: '#dcebff', gamma: 1.7, grain: 0.018, detail: 2.4, accent: 0.75, value: 0.65,
});
if (!film.ok) html.classList.add('no-webgl');
film.onLost = () => html.classList.add('no-webgl');
const fallbackImg = $('[data-fallback]');

const cam = { x: 0.5, y: 0.5, z: 1 };
const world = { x: 0.52, y: 0.5, z: 1.32 };
const fx = { reveal: 1, bars: 1, sweep: 0, scan: -1, world: 0, dim: 0 };
const rect = { s: 1, cy: 0.5 };
let heroVisible = true;
new IntersectionObserver((es) => { heroVisible = es[0].isIntersecting; }).observe(stage);

function keys() {
  const phone = stage.clientWidth / stage.clientHeight < 0.8;
  return phone
    ? { p: [0.572, 0.762, 2.15], v: [0.552, 0.71, 1.3], w: [0.565, 0.56, 1.0] }
    : { p: [0.572, 0.752, 3.1], v: [0.552, 0.705, 1.75], w: [0.5, 0.5, 1.0] };
}

const annoEls = { person: $('[data-anno="person"]'), vehicle: $('[data-anno="vehicle"]') };
const pinEls = $$('[data-pin]');
const pinsWrap = $('[data-pins]');
const card = $('[data-event-card]');
let activeDemo = 0;

function stageRes() { return [stage.clientWidth || 1, stage.clientHeight || 1]; }

function renderHero() {
  const res = stageRes();
  const c = [cam.x, cam.y, cam.z];
  const s = rect.s;
  if (film.ok) {
    film.set({
      cam: c, camR: c, camW: [world.x, world.y, world.z],
      reveal: fx.reveal, bars: fx.bars, sweep: fx.sweep, scan: fx.scan, world: fx.world, dim: fx.dim,
      rectOn: s < 0.9995 ? 1 : 0, rect: [0.5 - s / 2, rect.cy - s / 2, 0.5 + s / 2, rect.cy + s / 2],
    });
    film.draw();
  } else {
    // Photographic fallback keeps the same camera framing.
    const z = c[2];
    const ar = res[0] / res[1], ir = IMG[0] / IMG[1];
    const s0 = ar > ir ? [1, ir / ar] : [ar / ir, 1];
    const sx = s0[0] / z, sy = s0[1] / z;
    const cx = clamp(c[0], sx / 2, 1 - sx / 2), cy = clamp(c[1], sy / 2, 1 - sy / 2);
    fallbackImg.style.transform = `scale(${z}) translate(${(-(cx - 0.5) / s0[0]) * 100}%, ${(-(cy - 0.5) / s0[1]) * 100}%)`;
    fallbackImg.style.opacity = String(fx.reveal);
    fallbackImg.style.clipPath = s < 0.9995 ? `inset(${(rect.cy - s / 2) * 100}% ${(0.5 - s / 2) * 100}% ${(1 - rect.cy - s / 2) * 100}% ${(0.5 - s / 2) * 100}%)` : '';
  }
  for (const k of ['person', 'vehicle']) {
    const el = annoEls[k];
    if (+el.style.opacity === 0 && !el._live) continue;
    const r = projectBox(BOX[k], res, IMG, c);
    el.style.left = r.x + '%'; el.style.top = r.y + '%'; el.style.width = r.w + '%'; el.style.height = r.h + '%';
  }
  if (+pinsWrap.style.opacity !== 0 || pinsWrap._live) {
    pinEls.forEach((p, i) => {
      const r = projectBox({ x: DEMOS[i].pt[0], y: DEMOS[i].pt[1], w: 0, h: 0 }, res, IMG, c);
      p.style.left = r.x + '%'; p.style.top = r.y + '%';
      p._x = (r.x / 100) * res[0]; p._y = (r.y / 100) * res[1];
      p.style.visibility = r.x < 2 || r.x > 98 || r.y < 2 || r.y > 98 ? 'hidden' : 'visible';
    });
    placeCard(res);
  }
}
gsap.ticker.add(() => { if (heroVisible) renderHero(); });

function placeCard(res) {
  if (!card) return;
  const p = pinEls[activeDemo];
  if (!p || p._x == null) return;
  const w = card.offsetWidth || 272, h = card.offsetHeight || 150;
  let x = p._x + 26, y = p._y - h - 14;
  if (x + w > res[0] - 24) x = p._x - w - 26;
  if (y < 90) y = p._y + 22;
  y = Math.min(y, res[1] - h - 200);
  if (!card._placed) { card.style.transition = 'none'; card._placed = true; card.style.visibility = 'visible'; requestAnimationFrame(() => { card.style.transition = ''; }); }
  card.style.left = Math.max(16, x) + 'px';
  card.style.top = Math.max(84, y) + 'px';
}

function showDemo(i) {
  activeDemo = i;
  const d = DEMOS[i];
  pinEls.forEach((p, j) => p.classList.toggle('is-active', j === i));
  if (!card) return;
  const inner = [$('[data-ev-where]', card), $('[data-ev-title]', card), $('[data-ev-tag]', card), $('[data-ev-text]', card)];
  gsap.to(inner, {
    opacity: 0, y: -6, duration: 0.25, stagger: 0.03, ease: 'power2.in',
    onComplete: () => {
      inner[0].textContent = d.where; inner[1].textContent = d.title;
      inner[2].textContent = d.tag; inner[2].className = 'tag tag--' + d.tone;
      inner[3].textContent = d.text;
      gsap.fromTo(inner, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.05, ease: 'vOut' });
    },
  });
  gsap.fromTo('[data-ev-progress]', { width: '0%' }, { width: '100%', duration: 5, ease: 'none' });
}
let demoCall = null;
function cycleDemos() {
  demoCall && demoCall.kill();
  const next = () => { showDemo((activeDemo + 1) % DEMOS.length); demoCall = gsap.delayedCall(5, next); };
  showDemo(0);
  demoCall = gsap.delayedCall(5, next);
}
pinEls.forEach((p, i) => p.addEventListener('click', () => {
  demoCall && demoCall.kill();
  showDemo(i);
  demoCall = gsap.delayedCall(7, function n() { showDemo((activeDemo + 1) % DEMOS.length); demoCall = gsap.delayedCall(5, n); });
}));

let idleTween = null;
function startIdle() {
  idleTween && idleTween.kill();
  const k = keys().w;
  idleTween = gsap.to(cam, { z: k[2] * 1.07, x: k[0] + 0.012, duration: 18, ease: 'sine.inOut', yoyo: true, repeat: -1 });
}

/* ------------------------------------------------------------------ */
/* Opening sequence                                                    */
/* ------------------------------------------------------------------ */
const beats = $$('[data-beat]');
const caps = $$('[data-cap]');
const beatSplits = beats.map((b) => SplitText.create(b, { type: 'chars', charsClass: 'ch', mask: 'chars' }));
gsap.set(beats, { opacity: 1 });
gsap.set('.beat-words', { visibility: 'visible' });
beatSplits.forEach((s) => gsap.set(s.chars, { yPercent: 115 }));
gsap.set(caps, { opacity: 0 });
const heroTitle = $('.hero__title');
let heroSplit = SplitText.create(heroTitle, { type: 'lines', mask: 'lines', linesClass: 'split-line' });
const stepEl = $('[data-step]');
const countEl = $('[data-count]');
const clockEl = $('[data-clock]');
const counter = { v: 0 };
setInterval(() => {
  const d = new Date();
  clockEl.textContent = [d.getHours(), d.getMinutes(), d.getSeconds()].map((n) => String(n).padStart(2, '0')).join(':');
}, 1000);

function annoIn(tl, el, t) {
  tl.fromTo(el, { opacity: 0, scale: 1.6 }, { opacity: 1, scale: 1, duration: 0.7, ease: 'vOut', onStart: () => { el._live = true; } }, t);
}
function annoOut(tl, el, t) {
  tl.to(el, { opacity: 0, scale: 0.92, duration: 0.35, ease: 'power2.in', onComplete: () => { el._live = false; } }, t);
}
function beatIn(tl, i, t) {
  tl.call(() => { stepEl.textContent = `0${i + 1} / 03`; }, null, t);
  tl.fromTo(beatSplits[i].chars, { yPercent: 115 }, { yPercent: 0, duration: 0.95, stagger: 0.035, ease: 'vOut' }, t);
  tl.fromTo(caps[i], { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.7, ease: 'vOut' }, t + 0.25);
}
function beatOut(tl, i, t) {
  tl.to(beatSplits[i].chars, { yPercent: -115, duration: 0.5, stagger: 0.02, ease: 'power2.in' }, t);
  tl.to(caps[i], { opacity: 0, y: -8, duration: 0.35, ease: 'power2.in' }, t);
}

let intro = null;
function buildIntro() {
  const K = keys();
  const tl = gsap.timeline({ paused: true, defaults: { ease: 'vIo' }, onComplete: introDone });
  const ui = ['.intro-ui__tl', '.intro-ui__tr', '.intro-ui__count'];
  tl.set(cam, { x: K.p[0], y: K.p[1], z: K.p[2] * 1.14 }, 0)
    .set(fx, { reveal: 0, bars: 1, sweep: 0, scan: -1, world: 0, dim: 0 }, 0)
    .set(rect, { s: 1, cy: 0.5 }, 0)
    .set(['.stage__shade', pinsWrap], { opacity: 0 }, 0)
    .set(['.wordmark', '.hero__content [data-hero-in]'], { opacity: 0 }, 0)
    .set(heroSplit.lines, { yPercent: 110 }, 0)
    .set(heroTitle, { opacity: 1 }, 0)
    .set([...ui, stepEl, '.skip-intro'], { opacity: 0 }, 0)
    .set(jagHero, { attr: { scale: 220 } }, 0)
    .set(stripeRect, { attr: { width: () => stripeP * 0.12 } }, 0);

  tl.fromTo('.stage__corner', { opacity: 0, scale: 2.4 }, { opacity: 0.9, scale: 1, duration: 0.9, stagger: 0.05, ease: 'vOut' }, 0.05);
  tl.to([...ui, '.skip-intro'], { opacity: 1, duration: 0.8, stagger: 0.07, ease: 'vOut' }, 0.15);
  tl.to(stepEl, { opacity: 1, duration: 0.5 }, 0.75);
  tl.to(fx, { reveal: 1, duration: 1.5, ease: 'power2.inOut' }, 0.12);
  tl.to(cam, { z: K.p[2], duration: 2.7, ease: 'power2.out' }, 0.12);
  tl.fromTo(fx, { scan: -0.2 }, { scan: 1.2, duration: 2.1, ease: 'none', immediateRender: false }, 0.65);
  tl.set(fx, { scan: -1 }, 2.76);
  tl.to(counter, { v: 100, duration: 5.9, ease: 'power1.inOut', onUpdate: () => { countEl.textContent = String(Math.round(counter.v)).padStart(2, '0'); } }, 0);

  // 01 Watch — person beside the truck
  beatIn(tl, 0, 0.85);
  annoIn(tl, annoEls.person, 1.3);
  beatOut(tl, 0, 2.5);
  annoOut(tl, annoEls.person, 2.45);

  // 02 Verify — the vehicle
  tl.to(cam, { x: K.v[0], y: K.v[1], z: K.v[2], duration: 1.3 }, 2.55);
  beatIn(tl, 1, 2.85);
  annoIn(tl, annoEls.vehicle, 3.6);
  beatOut(tl, 1, 4.25);
  annoOut(tl, annoEls.vehicle, 4.3);

  // 03 Respond — the whole property, bars resolve into the photograph
  tl.to(cam, { x: K.w[0], y: K.w[1], z: K.w[2], duration: 1.7 }, 4.35);
  tl.to(fx, { sweep: 1, duration: 1.55, ease: 'power2.inOut' }, 4.5);
  beatIn(tl, 2, 4.7);
  tl.addLabel('outro', 5.85);
  beatOut(tl, 2, 5.9);
  tl.to([...ui, stepEl, '.skip-intro'], { opacity: 0, y: -10, duration: 0.5, stagger: 0.04, ease: 'power2.in' }, 5.95);
  tl.to('.stage__shade', { opacity: 1, duration: 1.1, ease: 'power2.out' }, 5.9);

  // Wordmark forms from scattered bars
  tl.to('.wordmark', { opacity: 1, duration: 0.35, ease: 'none' }, 6.0);
  tl.to(jagHero, { attr: { scale: 9 }, duration: 1.5, ease: 'expo.out' }, 6.0);
  tl.to(stripeRect, { attr: { width: () => stripeP * 0.64 }, duration: 1.4, ease: 'power3.out' }, 6.05);
  tl.fromTo('.wordmark', { y: 40 }, { y: 0, duration: 1.4, ease: 'vOut', immediateRender: false }, 6.0);

  // Homepage copy
  tl.to(heroSplit.lines, { yPercent: 0, duration: 1.15, stagger: 0.09, ease: 'vOut' }, 6.35);
  tl.fromTo('.hero__content [data-hero-in]', { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 1, stagger: 0.08, ease: 'vOut', immediateRender: false }, 6.45);
  tl.to(pinsWrap, { opacity: 1, duration: 0.8, ease: 'power2.out', onStart: () => { pinsWrap._live = true; cycleDemos(); } }, 6.7);
  tl.call(() => { html.classList.remove('is-intro'); }, null, 6.75);
  return tl;
}

function introDone() {
  html.classList.remove('is-intro', 'intro-pending');
  lenis.start();
  startIdle();
  setupRecede();
  ScrollTrigger.refresh();
}

function finalizeNow() {
  // No opening: reduced motion, ?skip, or the photo failed to load.
  const K = keys();
  Object.assign(cam, { x: K.w[0], y: K.w[1], z: K.w[2] });
  Object.assign(fx, { reveal: 1, bars: 0, sweep: 1, scan: -1 });
  gsap.set(['.stage__shade', pinsWrap, '.wordmark', heroTitle, '.hero__content [data-hero-in]'], { opacity: 1 });
  gsap.set(heroSplit.lines, { yPercent: 0 });
  gsap.set(jagHero, { attr: { scale: 9 } });
  gsap.set(stripeRect, { attr: { width: stripeP * 0.64 } });
  pinsWrap._live = true;
  html.classList.remove('is-intro', 'intro-pending');
  html.classList.add('no-intro');
  lenis.start();
  cycleDemos();
  if (!REDUCE) startIdle();
  setupRecede();
}

$('[data-skip]').addEventListener('click', () => {
  if (!intro) return;
  const t = intro.labels.outro;
  if (intro.time() < t) intro.seek(t);
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && html.classList.contains('is-intro') && intro && intro.time() < intro.labels.outro) intro.seek(intro.labels.outro);
});

function playIntro() {
  html.classList.add('is-intro');
  html.classList.remove('intro-pending');
  lenis.stop();
  window.scrollTo(0, 0);
  idleTween && idleTween.kill();
  demoCall && demoCall.kill();
  pinsWrap._live = false;
  intro = intro || buildIntro();
  if (AUDIT && !isNaN(AUDIT_T)) { intro.pause(AUDIT_T, false); return; }
  intro.restart();
}

/* Replay: a bar wipe covers the page, returns to the top, plays again. */
const wipe = $('[data-wipe]');
for (let i = 0; i < 16; i++) wipe.appendChild(document.createElement('i'));
function barWipe(mid) {
  const bars = $$('i', wipe);
  wipe.style.visibility = 'visible';
  return gsap.timeline()
    .set(bars, { transformOrigin: '50% 100%' })
    .to(bars, { scaleY: 1, duration: 0.55, stagger: { each: 0.025, from: 'end' }, ease: 'vIo' })
    .call(mid)
    .set(bars, { transformOrigin: '50% 0%' })
    .to(bars, { scaleY: 0, duration: 0.55, stagger: { each: 0.025, from: 'end' }, ease: 'vIo' }, '+=0.12')
    .set(wipe, { visibility: 'hidden' });
}
$$('[data-replay]').forEach((b) => b.addEventListener('click', () => {
  if (REDUCE) { lenis.scrollTo(0, { immediate: true }); return; }
  if (!$('#menu').hidden) closeMenu(true);
  barWipe(() => {
    lenis.scrollTo(0, { immediate: true, force: true });
    ScrollTrigger.update();
    playIntro();
  });
}));

/* ------------------------------------------------------------------ */
/* Hero → receding photograph → bar world                              */
/* ------------------------------------------------------------------ */
let recedeST = null;
function setupRecede() {
  if (recedeST) return;
  const phone = () => stage.clientWidth / stage.clientHeight < 0.8;
  const tl = gsap.timeline({ defaults: { ease: 'none' } });
  tl.to('.hero__content', { opacity: 0, y: -70, duration: 0.2, ease: 'power1.in' }, 0)
    .to(pinsWrap, { opacity: 0, duration: 0.1 }, 0)
    .to('.stage__shade', { opacity: 0, duration: 0.2 }, 0.04)
    .to(rect, { s: () => (phone() ? 0.6 : 0.4), cy: 0.42, duration: 0.55, ease: 'power2.inOut' }, 0.06)
    .to(fx, { world: 1, duration: 0.5, ease: 'power1.inOut' }, 0.12)
    .to(world, { z: 1.12, x: 0.5, duration: 1, ease: 'none' }, 0)
    .fromTo('.recede-copy', { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.2, ease: 'power2.out' }, 0.4)
    .to(rect, { s: () => (phone() ? 0.34 : 0.2), cy: 0.36, duration: 0.3, ease: 'power2.in' }, 0.7)
    .to(fx, { dim: 0.35, duration: 0.3 }, 0.7);
  recedeST = ScrollTrigger.create({
    trigger: '.hero', start: 'top top', end: 'bottom bottom', scrub: 0.6, animation: tl, invalidateOnRefresh: true,
    onUpdate: (self) => { if (self.progress > 0.01 && demoCall) { demoCall.paused(true); } else if (demoCall) demoCall.paused(false); },
  });
}

/* ------------------------------------------------------------------ */
/* Generic reveals                                                     */
/* ------------------------------------------------------------------ */
function initReveals() {
  $$('[data-split="lines"]').forEach((el) => {
    if (el === heroTitle) return;
    SplitText.create(el, {
      type: 'lines', mask: 'lines', linesClass: 'split-line', autoSplit: true,
      onSplit(self) {
        if (REDUCE) return;
        return gsap.from(self.lines, { yPercent: 108, duration: 1.25, stagger: 0.09, ease: 'vOut', scrollTrigger: { trigger: el, start: 'top 86%', once: true } });
      },
    });
  });
  if (REDUCE) return;
  const items = $$('[data-reveal]');
  gsap.set(items, { opacity: 0, y: 30 });
  ScrollTrigger.batch(items, {
    start: 'top 90%', once: true,
    onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 1.1, stagger: 0.08, ease: 'vOut', overwrite: true }),
  });
}

/* Bar drips between dark and pale-blue chapters */
function initDrips() {
  $$('[data-drip]').forEach((d) => {
    const n = window.innerWidth < 700 ? 14 : 28;
    d.innerHTML = '';
    for (let i = 0; i < n; i++) d.appendChild(document.createElement('i'));
    const bars = $$('i', d);
    const down = d.classList.contains('drip--down');
    const rnd = bars.map(() => 0.55 + Math.random() * 0.45);
    gsap.set(bars, { scaleY: down ? 0 : 1 });
    ScrollTrigger.create({
      trigger: d.parentElement,
      start: down ? 'top bottom' : 'bottom bottom',
      end: down ? 'top 25%' : 'bottom top',
      scrub: 0.4,
      onUpdate: (self) => {
        const p = self.progress;
        bars.forEach((b, i) => {
          const order = down ? 1 - i / (bars.length - 1) : i / (bars.length - 1);
          const local = clamp((p * 1.6 - order * 0.6) / 1.0);
          const v = down ? local * rnd[i] : (1 - local) * rnd[i];
          b.style.transform = `scaleY(${v})`;
        });
      },
    });
  });
}

/* ------------------------------------------------------------------ */
/* The queue — scroll-told, illustrative                               */
/* ------------------------------------------------------------------ */
function initQueue() {
  const root = $('[data-queue]');
  const list = $('[data-clips]', root);
  const countEl = $('[data-qcount]', root);
  const chip = $('[data-qchip]', root);
  const qlabel = $('[data-qlabel]', root);
  const sites = Object.fromEntries($$('.site', root).map((el) => [el.dataset.site, el]));
  const SRC = { garage: 'assets/garage.webp', warehouse: 'assets/warehouse.webp', yard: 'assets/yard.webp', verify: 'assets/product-verify.webp' };
  const thumbs = { A: ['garage', '40% 40%'], B: ['warehouse', '30% 62%'], C: ['yard', '56% 74%'] };
  Object.entries(thumbs).forEach(([k, [img, pos]]) => {
    const t = $('.site__thumb', sites[k]);
    t.style.backgroundImage = `url(${SRC[img]})`; t.style.backgroundPosition = pos;
  });
  const ops = $$('.op', root).map((el) => ({ el, st: $('[data-opstate]', el), screen: $('.op__screen', el), clip: null, t: 0, dur: 1 }));
  const ROUTINE = [
    { l: 'Wind-blown foliage', s: 'B', img: 'warehouse', pos: '92% 70%' },
    { l: 'Employee leaving', s: 'B', img: 'warehouse', pos: '70% 46%' },
    { l: 'Headlights', s: 'A', img: 'garage', pos: '22% 30%' },
    { l: 'Scheduled delivery', s: 'C', img: 'yard', pos: '18% 42%' },
    { l: 'Glare on entrance', s: 'A', img: 'garage', pos: '62% 58%' },
    { l: 'Branches moving', s: 'B', img: 'warehouse', pos: '98% 62%' },
    { l: 'Cashier closing up', s: 'A', img: 'garage', pos: '45% 22%' },
    { l: 'Car headlights', s: 'B', img: 'warehouse', pos: '40% 40%' },
    { l: 'Truck arriving', s: 'C', img: 'yard', pos: '10% 46%' },
    { l: 'Forklift moving', s: 'C', img: 'yard', pos: '50% 55%' },
  ];
  const THREAT = { l: 'Catalytic converter theft', s: 'C', img: 'yard', pos: '57% 80%', threat: true };
  const AGENT = [
    { l: 'Glare on a store door', s: 'A', img: 'garage', pos: '62% 58%', out: 'Dismiss', cls: 'is-dismiss' },
    { l: 'Truck at the loading dock', s: 'C', img: 'yard', pos: '18% 42%', out: 'Log only', cls: 'is-log' },
    { l: 'Wind-blown foliage', s: 'B', img: 'warehouse', pos: '92% 70%', out: 'Dismiss', cls: 'is-dismiss' },
    { l: 'Employee leaving', s: 'B', img: 'warehouse', pos: '70% 46%', out: 'Dismiss', cls: 'is-dismiss' },
    { l: 'Person cutting under a truck', s: 'C', img: 'yard', pos: '57% 80%', out: 'Escalate · Voice down', cls: 'is-esc', threat: true },
  ];
  const P = [
    { every: 1.7, review: 2.4, chip: 'Today', label: 'Clips sent for review' },
    { every: 0.32, review: 3.2, chip: 'Peak hours', label: 'Clips sent for review' },
    { every: 99, review: 99, chip: 'Workarounds', label: 'Clips sent for review', paused: true },
    { every: 1.05, review: 1.6, chip: 'Verdun', label: 'Agent review', agents: true },
    { every: 1.25, review: 1.6, chip: 'The result', label: 'Agent review', agents: true },
  ];
  let step = -1, queue = [], acc = 0, extra = 0, threatAdded = false, seq = 0, agentSeq = 0, inView = false, threatWait = 0;

  function el(c) {
    const li = document.createElement('li');
    li.className = 'clip' + (c.threat && !c.agent ? ' is-threat' : '');
    const camNo = ((seq * 7) % 9) + 1;
    li.innerHTML = `<span class="clip__thumb" style="background-image:url(${SRC[c.img]});background-position:${c.pos}"></span><span><b>${c.l}</b><small>Site ${c.s} · Cam 0${camNo}</small></span><span class="clip__st">${c.agent ? 'Agent reviewing' : 'Waiting'}</span>`;
    return li;
  }
  function flip(fn) {
    const items = $$('.clip', list);
    const before = new Map(items.map((i) => [i, i.getBoundingClientRect().top]));
    fn();
    $$('.clip', list).forEach((i) => {
      const b = before.get(i);
      if (b == null) return;
      const d = b - i.getBoundingClientRect().top;
      if (Math.abs(d) > 0.5) gsap.fromTo(i, { y: d }, { y: 0, duration: 0.55, ease: 'vOut' });
    });
  }
  function fire(s) {
    const x = sites[s]; if (!x) return;
    x.classList.add('is-firing');
    setTimeout(() => x.classList.remove('is-firing'), 450);
  }
  function add(type, agent) {
    seq++;
    const c = Object.assign({}, type, { agent: !!agent, id: seq, born: performance.now() });
    c.node = el(c);
    list.appendChild(c.node);
    gsap.fromTo(c.node, { opacity: 0, x: -24 }, { opacity: 1, x: 0, duration: 0.5, ease: 'vOut' });
    fire(c.s);
    queue.push(c);
    if (agent) {
      gsap.delayedCall(0.95, () => resolveAgent(c));
    }
    return c;
  }
  function removeClip(c, how = 'take') {
    const i = queue.indexOf(c);
    if (i > -1) queue.splice(i, 1);
    const node = c.node;
    if (how === 'fade') {
      gsap.to(node, { opacity: 0, x: 24, duration: 0.45, ease: 'power2.in', onComplete: () => flip(() => node.remove()) });
    } else {
      flip(() => node.remove());
    }
  }
  function resolveAgent(c) {
    if (!c.node.isConnected) return;
    const st = $('.clip__st', c.node);
    st.textContent = c.out;
    c.node.classList.add(c.cls);
    if (c.threat) {
      gsap.delayedCall(0.5, () => { removeClip(c); assign(c, true); });
    } else {
      gsap.delayedCall(1.1, () => removeClip(c, 'fade'));
    }
  }
  function assign(c, live) {
    const op = ops.find((o) => !o.clip) || (live ? ops[0] : null);
    if (!op) return false;
    op.clip = c; op.t = 0; op.dur = c.threat ? (live ? 4.2 : 4) : P[Math.max(0, step)].review;
    op.el.classList.add('is-busy');
    op.el.classList.toggle('is-threat', !!c.threat);
    op.st.textContent = live ? 'Live view · 0:38' : c.l;
    op.screen.style.backgroundImage = `url(${SRC[c.img]})`;
    op.screen.style.backgroundPosition = c.pos;
    return true;
  }
  function freeOp(o) {
    o.clip = null; o.el.classList.remove('is-busy', 'is-threat');
    o.st.textContent = 'Idle'; o.screen.style.backgroundImage = ''; o.screen.style.setProperty('--p', '0%');
  }
  function updateCount() {
    const n = P[Math.max(0, step)].agents ? queue.length : queue.filter((c) => !c.agent).length + extra;
    countEl.textContent = String(n);
    const t = queue.find((c) => c.threat && !c.agent);
    if (t) {
      const pos = queue.indexOf(t) + 1 + (extra > 0 ? 0 : 0);
      $('.clip__st', t.node).textContent = threatWait > 3 ? `#${Math.max(pos, 20)} in line · 20+ min` : `#${pos} in line`;
    }
  }
  function reset() {
    queue.forEach((c) => c.node.remove());
    queue = []; extra = 0; threatAdded = false; threatWait = 0; acc = 0;
    ops.forEach(freeOp);
  }
  function setStep(i) {
    if (i === step) return;
    const prev = step;
    step = i;
    root.dataset.step = String(i);
    chip.textContent = P[i].chip;
    qlabel.textContent = P[i].label;
    $$('[data-qgo]').forEach((b, j) => b.setAttribute('aria-selected', String(j === i)));
    $$('.qstep', root).forEach((s, j) => s.classList.toggle('is-active', j === i));
    if (i === 0 && prev > 0) reset();
    if (i >= 3 && (prev < 3)) {
      // Agents clear the legacy backlog.
      const legacy = queue.filter((c) => !c.agent);
      legacy.forEach((c, k) => gsap.delayedCall(k * 0.06, () => {
        if (!c.node.isConnected) return;
        $('.clip__st', c.node).textContent = c.threat ? 'Escalated' : 'Dismissed';
        c.node.classList.add(c.threat ? 'is-esc' : 'is-dismiss');
        gsap.delayedCall(0.4, () => removeClip(c, 'fade'));
      }));
      extra = 0;
      ops.forEach((o) => { if (o.clip && !o.clip.threat) freeOp(o); });
    }
    if (i < 3 && prev >= 3) reset();
    if (i === 1) { threatWait = 0; }
  }
  function tick(dt) {
    if (step < 0 || !inView) return;
    const p = P[step];
    if (!p.paused) {
      acc += dt;
      if (acc >= p.every) {
        acc = 0;
        if (p.agents) {
          const t = AGENT[agentSeq++ % AGENT.length];
          add(t, true);
        } else {
          const legacyCount = queue.length;
          if (legacyCount >= 22) { extra++; fire(ROUTINE[seq % ROUTINE.length].s); seq++; }
          else add(ROUTINE[(seq * 3) % ROUTINE.length]);
          if (step === 1 && !threatAdded && queue.length >= 9) { add(THREAT); threatAdded = true; }
        }
      }
      ops.forEach((o) => {
        if (o.clip) {
          o.t += dt;
          o.screen.style.setProperty('--p', (Math.min(1, o.t / o.dur) * 100).toFixed(1) + '%');
          if (o.t >= o.dur) freeOp(o);
        } else if (!p.agents) {
          const next = queue[0];
          if (next && !next.agent) { removeClip(next); assign(next); }
        }
      });
      if (step === 1 && threatAdded) threatWait += dt;
    }
    updateCount();
  }
  let last = performance.now();
  gsap.ticker.add(() => { const n = performance.now(); const dt = Math.min(0.1, (n - last) / 1000); last = n; tick(dt); });
  new IntersectionObserver((es) => { inView = es[0].isIntersecting; }).observe(root);

  const steps = $$('.qstep', root);
  const mm = gsap.matchMedia();
  mm.add({ phone: '(max-width: 900px)', wide: '(min-width: 901px)' }, (ctx) => {
    const line = ctx.conditions.phone ? '72%' : '55%';
    steps.forEach((s, i) => ScrollTrigger.create({
      trigger: s, start: `top ${line}`, end: `bottom ${line}`,
      onToggle: (self) => { if (self.isActive) setStep(i); },
    }));
  });
  setStep(0);
  $$('[data-qgo]').forEach((b) => b.addEventListener('click', () => {
    const s = steps[+b.dataset.qgo];
    const phone = window.innerWidth <= 900;
    scrollToTarget(s, { offset: phone ? -window.innerHeight * 0.6 : -window.innerHeight * 0.18 });
  }));
}

/* ------------------------------------------------------------------ */
/* Bar art: static luminance bars drawn from a real photo (2D canvas)  */
/* ------------------------------------------------------------------ */
function drawBarArt(canvas, img, { width, height, col = 6, ink = [139, 188, 255], alpha = 0.55, gamma = 0.9, crop = [0, 0, 1, 1] }) {
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
  canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
  const ctx = canvas.getContext('2d');
  const cols = Math.ceil(width / col), rows = Math.ceil(height / 3);
  const sm = document.createElement('canvas'); sm.width = cols; sm.height = rows;
  const sx = sm.getContext('2d', { willReadFrequently: true });
  const iw = img.naturalWidth, ih = img.naturalHeight;
  // cover crop
  const cw = crop[2] * iw, ch = crop[3] * ih;
  const ar = width / height, car = cw / ch;
  let w = cw, h = ch, x = crop[0] * iw, y = crop[1] * ih;
  if (car > ar) { w = ch * ar; x += (cw - w) / 2; } else { h = cw / ar; y += (ch - h) / 2; }
  sx.drawImage(img, x, y, w, h, 0, 0, cols, rows);
  const d = sx.getImageData(0, 0, cols, rows).data;
  ctx.scale(dpr, dpr);
  ctx.fillStyle = `rgba(${ink[0]},${ink[1]},${ink[2]},${alpha})`;
  for (let c = 0; c < cols; c++) {
    const xc = c * col + col / 2;
    for (let r = 0; r < rows; r++) {
      const i = (r * cols + c) * 4;
      let l = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
      l = Math.pow(Math.min(1, Math.max(0, l * 1.4)), gamma);
      const bw = Math.max(0.5, l * col * 0.92);
      ctx.fillRect(xc - bw / 2, r * 3, bw, 3.2);
    }
  }
}

/* ------------------------------------------------------------------ */
/* Approach: horizontal procession                                     */
/* ------------------------------------------------------------------ */
function initProc() {
  const proc = $('[data-proc]');
  const track = $('[data-track]');
  const chaps = $$('.chap', track);
  const label = $('[data-proc-label]');
  const prog = $('[data-proc-progress]');
  const dots = $$('[data-chap]');
  const ground = $('[data-ground]');
  const names = ['01 / Watch', '02 / Verify', '03 / Respond'];
  let groundW = 0;
  const video = $('[data-field]');
  const toggle = $('[data-video-toggle]');
  let userPaused = false;

  loadImage('assets/warehouse.webp').then((img) => {
    const draw = () => {
      groundW = Math.round(window.innerWidth * 2.2);
      drawBarArt(ground, img, { width: groundW, height: Math.round(window.innerHeight * 0.34), col: 6, alpha: 0.5, gamma: 1.1, crop: [0, 0.18, 1, 0.82] });
    };
    draw();
    let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(draw, 250); });
  }).catch(() => {});

  const mm = gsap.matchMedia();
  mm.add('(min-width: 1001px) and (min-height: 641px)', () => {
    let lastIdx = -1;
    const st = ScrollTrigger.create({
      trigger: proc, start: 'top top', end: 'bottom bottom', scrub: true, invalidateOnRefresh: true,
      onUpdate: (self) => render(self.progress),
      onRefresh: (self) => render(self.progress),
    });
    function render(p) {
      const vw = window.innerWidth;
      const maxX = track.scrollWidth - vw;
      const x = -maxX * p;
      gsap.set(track, { x });
      chaps.forEach((c) => {
        const dx = (c.offsetLeft + x) / vw;
        if (dx > 1.4 || dx < -1.4) return;
        $$('[data-depth]', c).forEach((el) => {
          const d = +el.dataset.depth;
          const isMedia = el.classList.contains('chap__media');
          gsap.set(el, { x: dx * (d - 1) * -vw * 0.42, rotation: isMedia ? dx * -5 : el.classList.contains('chap__float') ? dx * 7 + 2 : 0, y: isMedia ? Math.abs(dx) * 40 : 0 });
        });
      });
      gsap.set(ground, { x: -p * Math.max(0, groundW - vw) });
      prog.style.transform = `scaleX(${p})`;
      const idx = Math.round(p * 2);
      if (idx !== lastIdx) {
        lastIdx = idx;
        label.textContent = names[idx];
        dots.forEach((b, i) => b.classList.toggle('is-on', i === idx));
      }
    }
    dots.forEach((b, i) => { b.onclick = () => scrollToTarget(st.start + (st.end - st.start) * (i / 2) + 2); });
    return () => { gsap.set(track, { clearProps: 'transform' }); $$('[data-depth]', track).forEach((e) => gsap.set(e, { clearProps: 'transform' })); };
  });
  mm.add('(max-width: 1000px), (max-height: 640px)', () => {
    if (REDUCE) return;
    const tweens = $$('.chap__media, .chap__float', track).map((m) => gsap.fromTo(m, { y: 60, rotation: m.classList.contains('chap__float') ? 4 : -2 }, { y: 0, rotation: 0, ease: 'none', scrollTrigger: { trigger: m, start: 'top bottom', end: 'top 40%', scrub: 0.5 } }));
    return () => tweens.forEach((t) => { t.scrollTrigger && t.scrollTrigger.kill(); t.kill(); });
  });

  // Silent field footage plays only when visible; respects user pause.
  new IntersectionObserver((es) => {
    if (es[0].isIntersecting && !userPaused && !REDUCE) { video.preload = 'auto'; video.play().catch(() => {}); }
    else video.pause();
  }, { threshold: 0.2 }).observe(video);
  toggle.addEventListener('click', () => {
    if (video.paused) { userPaused = false; video.play().catch(() => {}); toggle.setAttribute('aria-pressed', 'false'); toggle.setAttribute('aria-label', 'Pause field video'); }
    else { userPaused = true; video.pause(); toggle.setAttribute('aria-pressed', 'true'); toggle.setAttribute('aria-label', 'Play field video'); }
  });
}

/* ------------------------------------------------------------------ */
/* Platform: warehouse forms from bars, then resolves                  */
/* ------------------------------------------------------------------ */
function initPlatform() {
  const frame = $('[data-field-view]');
  const canvas = $('[data-film2]');
  const cardEl = $('[data-field-card]');
  const f2 = new BarFilm(canvas, { col: 5, ink: '#2f4e7a', inkHi: '#d6e8ff', bg: '#0c1119', gamma: 0.8, grain: 0.015 });
  if (!f2.ok) { canvas.remove(); return; }
  const st2 = { reveal: 0, sweep: 0, scan: -1 };
  loadImage('assets/warehouse.webp').then((img) => {
    f2.setSource(img);
    frame.classList.add('is-gl');
    $('.field__img', frame).style.opacity = '0';
    f2.set({ cam: [0.5, 0.5, 1.0], reveal: 0, bars: 1, sweep: 0 });
    f2.start();
    if (REDUCE) { f2.set({ reveal: 1, sweep: 1 }); return; }
    gsap.set(cardEl, { opacity: 0, y: 16 });
    const tl = gsap.timeline({ scrollTrigger: { trigger: frame, start: 'top 88%', end: 'top 18%', scrub: 0.6 } });
    tl.to(st2, { reveal: 1, duration: 0.45, ease: 'power2.out' }, 0)
      .fromTo(st2, { scan: -0.2 }, { scan: 1.2, duration: 0.5, ease: 'none' }, 0.1)
      .to(st2, { sweep: 1, duration: 0.5, ease: 'power2.inOut' }, 0.45)
      .to(cardEl, { opacity: 1, y: 0, duration: 0.15 }, 0.85);
    gsap.ticker.add(() => f2.set({ reveal: st2.reveal, sweep: st2.sweep, scan: st2.sweep > 0.98 ? -1 : st2.scan }));
  }).catch(() => {});
  if (!REDUCE) {
    gsap.from('.cap', { opacity: 0, y: 30, duration: 1, stagger: 0.08, ease: 'vOut', scrollTrigger: { trigger: '[data-caps]', start: 'top 80%', once: true } });
  }
}

/* Ticker that responds to scroll velocity */
function initTicker() {
  const t = $('[data-ticker]');
  if (!t || REDUCE) return;
  const tw = gsap.to(t, { xPercent: -50, duration: 26, ease: 'none', repeat: -1 });
  let boost = 1;
  lenis.on('scroll', (e) => { boost = 1 + Math.min(5, Math.abs(e.velocity) * 0.25); });
  gsap.ticker.add(() => { tw.timeScale(tw.timeScale() + (boost - tw.timeScale()) * 0.08); boost += (1 - boost) * 0.05; });
}

/* Product deck */
function initDeck() {
  const cards = $$('.deck__card');
  const mm = gsap.matchMedia();
  mm.add('(min-width: 1001px) and (min-height: 641px)', () => {
    gsap.set(cards, { yPercent: -50, y: 0, transformOrigin: '50% 100%' });
    gsap.set(cards.slice(1), { y: () => window.innerHeight * 0.9, rotation: (i) => [6, -5, 4][i] });
    const tl = gsap.timeline({ scrollTrigger: { trigger: '.product', start: 'top top', end: 'bottom bottom', scrub: 0.7 } });
    cards.slice(1).forEach((c, i) => {
      const at = i;
      tl.to(c, { y: 0, rotation: 0, duration: 1, ease: 'power3.out' }, at);
      cards.slice(0, i + 1).forEach((prev, j) => {
        const depth = i + 1 - j;
        tl.to(prev, { y: -depth * 34, scale: 1 - depth * 0.055, filter: `brightness(${1 - depth * 0.22})`, duration: 1, ease: 'power3.out' }, at);
      });
    });
    tl.to({}, { duration: 0.4 });
    return () => gsap.set(cards, { clearProps: 'all' });
  });
}

/* Team portraits form from bars */
function initTeam() {
  if (REDUCE) { $$('.person__photo img').forEach((i) => { i.style.setProperty('--bw', '7px'); }); return; }
  $$('.person__photo').forEach((ph) => {
    const img = $('img', ph);
    gsap.fromTo(img, { '--bw': '0.6px' }, { '--bw': '7px', ease: 'none', scrollTrigger: { trigger: ph, start: 'top 92%', end: 'top 30%', scrub: 0.5 } });
    gsap.fromTo(img, { yPercent: -10 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: ph, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
}

/* Contact: the yard returns as a bar world with a moving scan */
function initRequest() {
  const canvas = $('[data-film3]');
  const f3 = new BarFilm(canvas, { col: mqPhone.matches ? 6 : 8, ink: '#1f3456', inkHi: '#8bbcff', bg: '#080b10', gamma: 1.9, grain: 0, dpr: Math.min(window.devicePixelRatio || 1, 1.25) });
  if (!f3.ok) { canvas.remove(); return; }
  const s3 = { reveal: REDUCE ? 1 : 0, scan: -0.3, z: 1.18, x: 0.48 };
  loadImage('assets/yard.webp').then((img) => {
    f3.setSource(img);
    f3.start();
    gsap.ticker.add(() => f3.set({ cam: [s3.x, 0.55, s3.z], bars: 1, reveal: s3.reveal, scan: REDUCE ? -1 : s3.scan }));
    if (REDUCE) return;
    gsap.to(s3, { scan: 1.3, duration: 7, ease: 'none', repeat: -1 });
    gsap.to(s3, { x: 0.56, z: 1.3, duration: 24, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    gsap.to(s3, { reveal: 1, ease: 'none', scrollTrigger: { trigger: '.request', start: 'top 85%', end: 'top 15%', scrub: 0.6 } });
  }).catch(() => {});
}

/* Footer wordmark converges as the page ends */
function initFooter() {
  if (REDUCE) { gsap.set(jagFoot, { attr: { scale: 9 } }); return; }
  gsap.fromTo(jagFoot, { attr: { scale: 200 } }, { attr: { scale: 9 }, ease: 'none', scrollTrigger: { trigger: '.footer', start: 'top bottom', end: 'bottom bottom', scrub: 0.5 } });
}

/* ------------------------------------------------------------------ */
/* Header, menu, cake, film, magnetic                                  */
/* ------------------------------------------------------------------ */
const header = $('[data-header]');
const pill = $('[data-cake-open]');
ScrollTrigger.create({
  start: 0, end: 'max',
  onUpdate: (self) => {
    const y = self.scroll();
    header.classList.toggle('is-hidden', self.direction === 1 && y > window.innerHeight * 0.5 && $('#menu').hidden);
    header.classList.toggle('is-solid', y > window.innerHeight * 1.2);
    pill && pill.classList.toggle('is-in', y > window.innerHeight * 1.4);
  },
});

const menu = $('#menu');
const menuBtn = $('[data-menu-open]');
const menuBars = $('.menu__bars', menu);
for (let i = 0; i < 12; i++) menuBars.appendChild(document.createElement('i'));
let menuTl = null;
function openMenu() {
  menu.hidden = false;
  menuBtn.setAttribute('aria-expanded', 'true');
  lenis.stop();
  const links = $$('.menu__list li', menu);
  menuTl && menuTl.kill();
  menuTl = gsap.timeline()
    .fromTo($$('i', menuBars), { scaleY: 0 }, { scaleY: 1, duration: 0.6, stagger: { each: 0.03, from: 'random' }, ease: 'vIo' })
    .fromTo('.menu__inner', { opacity: 0 }, { opacity: 1, duration: 0.3 }, 0.35)
    .fromTo($$('.menu__t', menu), { yPercent: 110 }, { yPercent: 0, duration: 0.9, stagger: 0.05, ease: 'vOut' }, 0.4)
    .fromTo(['.menu__top', '.menu__foot'], { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: 'vOut' }, 0.5);
  setTimeout(() => $('a', links[0]).focus(), 420);
}
function closeMenu(instant) {
  menuBtn.setAttribute('aria-expanded', 'false');
  menuTl && menuTl.kill();
  const done = () => { menu.hidden = true; if (!html.classList.contains('is-intro')) lenis.start(); };
  if (instant || REDUCE) { done(); return; }
  menuTl = gsap.timeline({ onComplete: done })
    .to('.menu__inner', { opacity: 0, duration: 0.25 })
    .to($$('i', menuBars), { scaleY: 0, transformOrigin: '50% 100%', duration: 0.5, stagger: { each: 0.025, from: 'random' }, ease: 'vIo' }, 0.1)
    .set($$('i', menuBars), { transformOrigin: '50% 0%' });
  menuBtn.focus({ preventScroll: true });
}
menuBtn.addEventListener('click', openMenu);
$('[data-menu-close]').addEventListener('click', () => closeMenu());
menu.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeMenu();
  if (e.key === 'Tab') {
    const f = $$('a, button', menu).filter((x) => x.offsetParent !== null);
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  }
});

const dlg = $('[data-film-dialog]');
const filmVideo = $('[data-film-video]');
let lastFocus = null;
$$('[data-open-film]').forEach((b) => b.addEventListener('click', () => {
  lastFocus = b;
  if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
  lenis.stop();
  filmVideo.preload = 'auto';
  const tr = filmVideo.textTracks && filmVideo.textTracks[0];
  if (tr) tr.mode = 'showing';
  filmVideo.play().catch(() => {});
}));
$('[data-film-close]').addEventListener('click', () => dlg.close());
dlg.addEventListener('close', () => { filmVideo.pause(); lenis.start(); lastFocus && lastFocus.focus({ preventScroll: true }); });
dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });

if (FINE && !REDUCE) {
  $$('[data-magnetic]').forEach((b) => {
    const xTo = gsap.quickTo(b, 'x', { duration: 0.6, ease: 'vOut' });
    const yTo = gsap.quickTo(b, 'y', { duration: 0.6, ease: 'vOut' });
    b.addEventListener('pointermove', (e) => {
      const r = b.getBoundingClientRect();
      xTo((e.clientX - r.left - r.width / 2) * 0.22);
      yTo((e.clientY - r.top - r.height / 2) * 0.3);
    });
    b.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
  });
}

/* Toggles: smooth open/close for <details data-more> */
function initToggles() {
  $$('details[data-more]').forEach((d) => {
    const sum = $('summary', d);
    const body = $('.more__body', d);
    sum.addEventListener('click', (e) => {
      e.preventDefault();
      if (d._busy) return;
      d._busy = true;
      const done = () => { d._busy = false; ScrollTrigger.refresh(); };
      if (!d.open) {
        d.open = true;
        if (REDUCE) { done(); return; }
        gsap.fromTo(body, { height: 0, opacity: 0 }, { height: 'auto', opacity: 1, duration: 0.65, ease: 'vOut', onComplete: () => { gsap.set(body, { clearProps: 'height,opacity' }); done(); } });
        gsap.fromTo($$('.more__inner > *', d), { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, stagger: 0.05, ease: 'vOut', delay: 0.05 });
      } else {
        if (REDUCE) { d.open = false; done(); return; }
        gsap.to(body, { height: 0, opacity: 0, duration: 0.45, ease: 'power2.inOut', onComplete: () => { d.open = false; gsap.set(body, { clearProps: 'height,opacity' }); done(); } });
      }
    });
  });
}

/* ------------------------------------------------------------------ */
/* Boot                                                                */
/* ------------------------------------------------------------------ */
async function boot() {
  window.scrollTo(0, 0);
  const skip = html.classList.contains('no-intro');
  if (!skip) lenis.stop();
  let img = null;
  const imgP = loadImage('assets/yard.webp');
  imgP.then((im) => { if (film.ok && !film.source) film.setSource(im); fallbackImg.style.opacity = ''; }).catch(() => {});
  try { img = await Promise.race([imgP, timeout(4500)]); } catch (e) { img = null; }
  try { await Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), timeout(1500)]); } catch (e) { /* continue */ }
  fitWordmarks();
  heroSplit.revert();
  heroSplit = SplitText.create(heroTitle, { type: 'lines', mask: 'lines', linesClass: 'split-line' });
  if (img && film.ok && !film.source) film.setSource(img);
  initReveals();
  initDrips();
  initQueue();
  initProc();
  initPlatform();
  initTicker();
  initDeck();
  initTeam();
  initRequest();
  initFooter();
  initToggles();
  if (skip || !img) finalizeNow();
  else playIntro();
  if (params.get('scene') === 'site') { if (intro) intro.progress(1); }
  ScrollTrigger.refresh();
  // Arriving from another page with a section link: skip the opening and go there.
  if (location.hash.length > 1) {
    const target = document.querySelector(location.hash);
    if (target) setTimeout(() => scrollToTarget(target, { duration: 0.01, offset: -20 }), 120);
  }
  window.__verdun = { intro: () => intro, lenis, film, cam, fx, rect };
}
boot();

let rz;
window.addEventListener('resize', () => {
  clearTimeout(rz);
  rz = setTimeout(() => { fitWordmarks(); ScrollTrigger.refresh(); }, 200);
});
