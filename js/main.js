/* ============================================================
   Jehuda Chang — Portfolio
   Lenis smooth scroll + GSAP ScrollTrigger + WebGL orbit scrub
   ============================================================ */
(function () {
  'use strict';

  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  gsap.registerPlugin(ScrollTrigger);

  /* ---------- Lenis smooth scroll ---------- */
  var lenis = null;
  if (!prefersReduced && window.Lenis) {
    lenis = new Lenis({
      duration: 1.15,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true
    });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  /* ---------- Nav ---------- */
  var nav = document.getElementById('nav');
  ScrollTrigger.create({
    start: 80,
    onUpdate: function (self) { nav.classList.toggle('scrolled', self.scroll() > 80); },
    onToggle: function (self) { nav.classList.toggle('scrolled', self.isActive); }
  });

  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var target = document.querySelector(a.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(target, { offset: 0, duration: 1.4 });
      else target.scrollIntoView({ behavior: 'smooth' });
    });
  });

  /* ---------- Hero title split ---------- */
  document.querySelectorAll('[data-split]').forEach(function (line) {
    var text = line.textContent;
    line.textContent = '';
    text.split('').forEach(function (ch) {
      var span = document.createElement('span');
      span.className = 'char';
      span.textContent = ch;
      line.appendChild(span);
    });
  });

  /* ---------- Loader (waits for the orbit scene portrait) ---------- */
  var loaderEl = document.getElementById('loader');
  var loaderFill = document.getElementById('loader-fill');
  var loaderPct = document.getElementById('loader-pct');
  var loadFinished = false;
  var fakePct = 0;

  var fakeTimer = setInterval(function () {
    if (loadFinished) { clearInterval(fakeTimer); return; }
    fakePct = Math.min(fakePct + 7 + Math.random() * 10, 92);
    loaderFill.style.width = fakePct + '%';
    loaderPct.textContent = Math.round(fakePct) + '%';
  }, 90);

  function finishLoad() {
    if (loadFinished) return;
    loadFinished = true;
    loaderFill.style.width = '100%';
    loaderPct.textContent = '100%';
    setTimeout(function () {
      loaderEl.classList.add('done');
      introTimeline();
    }, 420);
  }

  var orbitReady = (window.ORBIT && window.ORBIT.ready) ? window.ORBIT.ready : Promise.resolve(false);
  Promise.race([
    orbitReady,
    new Promise(function (res) { setTimeout(res, 6000); }) // never hold the page hostage
  ]).then(function () { setTimeout(finishLoad, 250); });

  /* ---------- Hero scrub (drives the WebGL orbit) ----------
     No pin: the hero scrolls away normally with the page, so the figure
     never feels "stuck". The orbit + fade play once over the exit (~1 screen),
     so Snapshot is only one screen-scroll away. */
  var scrubProxy = { p: 0 };
  var scrubTL = gsap.timeline({
    scrollTrigger: {
      trigger: '.hero',
      start: 'top top',
      end: 'bottom top',
      scrub: 0.5,
      onToggle: function (self) {
        if (window.ORBIT) window.ORBIT.setActive(self.isActive || self.progress < 1);
      }
    }
  });

  scrubTL.to(scrubProxy, {
    p: 1,
    ease: 'none',
    duration: 1,
    onUpdate: function () {
      if (window.ORBIT) window.ORBIT.setProgress(scrubProxy.p);
    }
  }, 0);

  // Content + scene dissolve as the hero scrolls up and away
  scrubTL.to('.hero-content', { yPercent: -14, opacity: 0, ease: 'power1.in', duration: 0.5 }, 0);
  scrubTL.to('.hero-scrollhint', { opacity: 0, duration: 0.12 }, 0);
  scrubTL.to(['#orbit-canvas', '.hero-vignette'], { opacity: 0, ease: 'power1.in', duration: 0.55 }, 0.35);

  /* ---------- Intro timeline (after loader) ---------- */
  function introTimeline() {
    if (prefersReduced) {
      gsap.set('.hero-line .char, .hero-eyebrow, .hero-sub, .hero-tag', { opacity: 1, yPercent: 0 });
      return;
    }
    var tl = gsap.timeline();
    tl.fromTo('.hero-line .char',
      { yPercent: 118, rotate: 4, opacity: 0 },
      { yPercent: 0, rotate: 0, opacity: 1, duration: 1.05, stagger: 0.045, ease: 'power4.out' }, 0.1);
    tl.fromTo('.hero-eyebrow', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out' }, 0.55);
    tl.fromTo('.hero-sub', { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' }, 0.8);
    tl.fromTo('.hero-tag', { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' }, 0.95);
  }

  /* ---------- Section reveals ---------- */
  document.querySelectorAll('[data-reveal]').forEach(function (el) {
    gsap.fromTo(el,
      { opacity: 0, y: 46 },
      {
        opacity: 1, y: 0, duration: 1, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 86%', once: true }
      });
  });

  /* ---------- Procedural backdrops ---------- */
  if (window.initViz) window.initViz();

  gsap.to('#builder-canvas', {
    yPercent: -10, ease: 'none',
    scrollTrigger: { trigger: '.skills', start: 'top bottom', end: 'bottom top', scrub: true }
  });

  /* ---------- Project cards expand ---------- */
  document.querySelectorAll('.project-card').forEach(function (card) {
    function toggle() {
      var isOpen = card.classList.toggle('open');
      card.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      setTimeout(function () { ScrollTrigger.refresh(); }, 520);
    }
    card.addEventListener('click', function (e) {
      if (e.target.closest('a')) return;
      toggle();
    });
    card.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    });
  });

  /* ---------- Kinetic section titles ---------- */
  document.querySelectorAll('.section-title, .lead-banner-title').forEach(function (title) {
    gsap.fromTo(title, { letterSpacing: '0.06em' }, {
      letterSpacing: '0.01em', ease: 'none',
      scrollTrigger: { trigger: title, start: 'top 95%', end: 'top 40%', scrub: true }
    });
  });

})();
