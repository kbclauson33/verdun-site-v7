// Integrators page: the hero photo forms from bars, chips land on it,
// the highlights stagger in, and the sample daily report fills in.
import { BarFilm, loadImage } from './barfilm.js';

const { gsap, ScrollTrigger } = window;
gsap.registerPlugin(ScrollTrigger);
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
const phone = matchMedia('(max-width: 640px)').matches;
const ease = 'expo.out';

/* Hero: warehouse photo drawn as bars, with a slow drift and a scan line */
const hero = $('[data-ig-hero]');
const canvas = $('[data-ig-film]');
const film = new BarFilm(canvas, { col: phone ? 6 : 7, ink: '#22385c', inkHi: '#9cc6ff', bg: '#080b10', gamma: 1.45, grain: 0, dpr: Math.min(window.devicePixelRatio || 1, 1.25) });
if (film.ok) {
  const s = { reveal: REDUCE ? 1 : 0, scan: -0.3, z: 1.12, x: 0.5, sweep: 0 };
  loadImage('static/media/warehouse.webp').then((img) => {
    film.setSource(img);
    hero.classList.add('is-gl');
    film.start();
    gsap.ticker.add(() => film.set({ cam: [s.x, 0.52, s.z], bars: 1, reveal: s.reveal, sweep: s.sweep, scan: REDUCE ? -1 : s.scan }));
    if (REDUCE) return;
    gsap.to(s, { reveal: 1, duration: 2.2, ease: 'power2.out', delay: 0.15 });
    gsap.to(s, { scan: 1.3, duration: 6.5, ease: 'none', repeat: -1, delay: 0.6 });
    gsap.to(s, { x: 0.56, z: 1.24, duration: 22, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    gsap.to(s, { z: 1.4, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 0.6 } });
  }).catch(() => {});
} else {
  canvas.remove();
}

if (!REDUCE) {
  gsap.from('[data-ig-in]', { y: 28, opacity: 0, duration: 1.2, stagger: 0.09, ease, delay: 0.25 });
  gsap.from('.ig-chip', { opacity: 0, scale: 0.92, y: 12, duration: 0.9, stagger: 0.35, ease, delay: 1.3 });
  gsap.from('.ig-chip .c', { scale: 1.8, opacity: 0, duration: 0.7, stagger: 0.05, ease, delay: 1.45 });
  gsap.to('.ig-hero__chips', { yPercent: -12, opacity: 0.2, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 0.5 } });
}

/* Highlights: cards rise in; their bar texture draws up */
if (!REDUCE) {
  gsap.from('.perks__head', { y: 20, opacity: 0, duration: 1, ease, scrollTrigger: { trigger: '[data-perks]', start: 'top 85%', once: true } });
  gsap.from('.perk', { y: 40, opacity: 0, duration: 1.1, stagger: 0.08, ease, scrollTrigger: { trigger: '.perks__grid', start: 'top 85%', once: true } });
  gsap.from('.perk__bars', { scaleY: 0, transformOrigin: '50% 100%', duration: 1.4, stagger: 0.08, ease: 'power3.out', delay: 0.3, scrollTrigger: { trigger: '.perks__grid', start: 'top 85%', once: true } });
}

/* Sample report: hourly chart, numbers count up, events slide in */
const chart = $('[data-rep-chart]');
const HOURS = [9, 7, 5, 4, 3, 3, 4, 8, 14, 16, 12, 10, 11, 13, 15, 17, 21, 26, 30, 24, 19, 16, 18, 13];
const max = Math.max(...HOURS);
HOURS.forEach((v, i) => {
  const b = document.createElement('i');
  b.style.height = `${(v / max) * 100}%`;
  if (i === 23) b.classList.add('is-hit');
  chart.appendChild(b);
});
if (!REDUCE) {
  const rep = $('[data-report]');
  const nums = $$('[data-to]', rep);
  nums.forEach((n) => { n.textContent = '0'; });
  const tl = gsap.timeline({ scrollTrigger: { trigger: rep, start: 'top 80%', once: true } });
  tl.from(rep, { y: 40, opacity: 0, duration: 1.1, ease })
    .from($$('.rep__head > *', rep), { y: 10, opacity: 0, duration: 0.7, stagger: 0.08, ease }, 0.25)
    .from($$('i', chart), { scaleY: 0, transformOrigin: '50% 100%', duration: 0.9, stagger: 0.025, ease: 'power3.out' }, 0.4)
    .from($$('.rep__events li', rep), { x: -16, opacity: 0, duration: 0.8, stagger: 0.15, ease }, 0.9);
  nums.forEach((n) => {
    const o = { v: 0 };
    tl.to(o, { v: +n.dataset.to, duration: 1.4, ease: 'power2.out', onUpdate: () => { n.textContent = String(Math.round(o.v)); } }, 0.35);
  });
}
