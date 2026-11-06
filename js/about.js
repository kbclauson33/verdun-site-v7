// About page: smooth scroll, header, menu, dossier reveal.
(function () {
  const { gsap, ScrollTrigger, Lenis } = window;
  gsap.registerPlugin(ScrollTrigger);
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ease = 'expo.out';

  const lenis = new Lenis({ lerp: REDUCE ? 1 : 0.085, smoothWheel: !REDUCE });
  lenis.on('scroll', ScrollTrigger.update);
  window.__lenis = lenis;
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);

  // Footer wordmark: fit to the glyphs, stripe width ~7px on screen.
  function fitWordmark() {
    const t = $('[data-wm-text]');
    if (!t) return;
    const cx = document.createElement('canvas').getContext('2d');
    cx.font = '600 300px Geist';
    const m = cx.measureText('verdun');
    const asc = m.actualBoundingBoxAscent || 222, desc = m.actualBoundingBoxDescent || 4;
    try {
      const b = t.getBBox();
      const w = b.width - 6 + 3.6;
      t.ownerSVGElement.setAttribute('viewBox', `${b.x + 6} ${200 - asc - 2} ${w} ${asc + desc + 4}`);
      const px = t.ownerSVGElement.clientWidth || window.innerWidth;
      const p = Math.max(3, ((px < 500 ? 4.2 : 7.5) * w) / px);
      $('#stripes').setAttribute('width', p.toFixed(2));
      $('.stripe-rect').setAttribute('width', (p * 0.64).toFixed(2));
    } catch (e) { /* ignore */ }
  }
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(fitWordmark);
  window.addEventListener('resize', fitWordmark);

  // Header hides on scroll down, returns on scroll up.
  const header = $('[data-header]');
  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate: (self) => {
      header.classList.toggle('is-hidden', self.direction === 1 && self.scroll() > 200 && $('#menu').hidden);
      header.classList.toggle('is-solid', self.scroll() > 40);
    },
  });

  // Menu
  const menu = $('#menu');
  const btn = $('[data-menu-open]');
  const bars = $('.menu__bars', menu);
  for (let i = 0; i < 12; i++) bars.appendChild(document.createElement('i'));
  function open() {
    menu.hidden = false; btn.setAttribute('aria-expanded', 'true'); lenis.stop();
    if (!REDUCE) {
      gsap.timeline()
        .fromTo($$('i', bars), { scaleY: 0 }, { scaleY: 1, transformOrigin: '50% 0%', duration: 0.6, stagger: { each: 0.03, from: 'random' }, ease: 'power3.inOut' })
        .fromTo('.menu__inner', { opacity: 0 }, { opacity: 1, duration: 0.3 }, 0.35)
        .fromTo($$('.menu__t', menu), { yPercent: 110 }, { yPercent: 0, duration: 0.9, stagger: 0.05, ease }, 0.4);
    }
    setTimeout(() => $('.menu__list a', menu).focus(), 400);
  }
  function close() { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); lenis.start(); btn.focus({ preventScroll: true }); }
  btn.addEventListener('click', open);
  $('[data-menu-close]').addEventListener('click', close);
  menu.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  $$('.menu__list a', menu).forEach((a) => a.addEventListener('click', () => { menu.hidden = true; lenis.start(); }));

  if (REDUCE) return;

  // Generic reveals for sub pages.
  const rev = $$('.page [data-reveal]');
  if (rev.length) {
    gsap.set(rev, { opacity: 0, y: 26 });
    ScrollTrigger.batch(rev, { start: 'top 92%', once: true, onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 1.05, stagger: 0.08, ease }) });
  }
  // Dossier: files slide in, photos form from vertical bars, bullets type in.
  if ($('.dossier__head')) gsap.from('.dossier__head > *', { y: 24, opacity: 0, duration: 1.1, stagger: 0.08, ease, delay: 0.1 });
  $$('.file').forEach((f, i) => {
    const tl = gsap.timeline({ delay: 0.35 + i * 0.18 });
    tl.from(f, { y: 40, opacity: 0, duration: 1.1, ease })
      .fromTo($('.file__photo img', f), { '--bw': '0.6px' }, { '--bw': '7px', duration: 1.6, ease: 'power2.out' }, 0.15)
      .from($$('.file__photo .c', f), { scale: 1.8, opacity: 0, duration: 0.7, stagger: 0.05, ease }, 0.3)
      .from($$('.file__list li', f), { x: -14, opacity: 0, duration: 0.7, stagger: 0.07, ease }, 0.45);
  });
  if ($('.dossier__foot')) gsap.from('.dossier__foot', { y: 20, opacity: 0, duration: 1, ease, scrollTrigger: { trigger: '.dossier__foot', start: 'top 95%', once: true } });
  gsap.fromTo('#jag feDisplacementMap', { attr: { scale: 200 } }, { attr: { scale: 9 }, ease: 'none', scrollTrigger: { trigger: '.footer', start: 'top bottom', end: 'bottom bottom', scrub: 0.5 } });
})();
