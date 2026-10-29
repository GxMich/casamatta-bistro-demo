/* ==========================================================================
   Casamatta bistrò e design — motion system
   GSAP 3.12 core + ScrollTrigger + ScrollToPlugin (loaded from cdnjs before this file).
   Plain ES2020, no modules, runs from file://.
   Direction: slow, elegant, editorial. Every feature no-ops when its hook is absent,
   never leaves content invisible, and respects prefers-reduced-motion.
   Hooks (see HOOK CONTRACT): [data-preloader] [data-nav] [data-nav-toggle] [data-nav-overlay]
   [data-nav-link] [data-reveal] [data-stagger] [data-split] [data-parallax] [data-clip]
   [data-counter] [data-marquee] [data-hscroll] [data-tabs] [data-magnetic] [data-tilt]
   [data-hero-media] [data-hero-title] [data-hero-sub] [data-hero-cta] [data-hero-scroll]
   ========================================================================== */
(function () {
  'use strict';

  /* ---------- helpers ---------- */
  var qs = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var qsa = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };
  var mq = function (q) { return !!(window.matchMedia && window.matchMedia(q).matches); };
  var REDUCE = mq('(prefers-reduced-motion: reduce)');
  var HOVER_FINE = mq('(hover: hover) and (pointer: fine)');
  var DESKTOP_MQ = '(min-width: 1024px) and (prefers-reduced-motion: no-preference)';
  var VISIBLE_HOOKS = '[data-reveal],[data-stagger] > *,[data-split],[data-split] *,[data-clip],[data-clip] img,' +
    '[data-hero-media],[data-hero-title],[data-hero-title] *,[data-hero-sub],[data-hero-cta] > *,[data-hero-scroll],' +
    '[data-counter],[data-nav-link],[data-parallax],[data-hscroll-track],[data-marquee-track]';

  function safe(name, fn) {
    try { return fn(); } catch (err) { console.warn('[casamatta] ' + name + ' failed:', err); }
  }

  function onReady(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
    else fn();
  }

  /* Force the final, visible state on every hooked element (used by fallbacks). */
  function showEverything() {
    qsa(VISIBLE_HOOKS).forEach(function (el) {
      el.style.opacity = '';
      el.style.visibility = '';
      el.style.transform = '';
      el.style.clipPath = '';
      el.style.webkitClipPath = '';
    });
  }

  /* ---------- no GSAP available: minimal, dependency-free behaviour ---------- */
  function fallbackNoGsap() {
    onReady(function () {
      safe('fallback-preloader', function () {
        var pre = qs('[data-preloader]');
        if (pre) pre.remove();
        document.body.classList.add('is-loaded');
      });
      showEverything();
      safe('fallback-nav', function () {
        var toggle = qs('[data-nav-toggle]');
        var overlay = qs('[data-nav-overlay]');
        if (!toggle || !overlay) return;
        var setOpen = function (open) {
          overlay.classList.toggle('is-open', open);
          document.body.classList.toggle('nav-open', open);
          toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        };
        toggle.addEventListener('click', function () { setOpen(!overlay.classList.contains('is-open')); });
        qsa('[data-nav-link]', overlay).forEach(function (a) { a.addEventListener('click', function () { setOpen(false); }); });
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setOpen(false); });
      });
      safe('fallback-tabs', function () {
        qsa('[data-tabs]').forEach(function (root) {
          var buttons = qsa('[data-tab]', root);
          var panels = qsa('[data-panel]', root);
          buttons.forEach(function (btn) {
            btn.addEventListener('click', function () {
              var id = btn.getAttribute('data-tab');
              buttons.forEach(function (b) { b.classList.toggle('is-active', b === btn); b.setAttribute('aria-selected', b === btn ? 'true' : 'false'); });
              panels.forEach(function (p) { var on = p.getAttribute('data-panel') === id; p.classList.toggle('is-active', on); if (on) p.removeAttribute('hidden'); else p.setAttribute('hidden', ''); });
            });
          });
        });
      });
      document.documentElement.style.scrollBehavior = 'smooth';
    });
  }

  if (!window.gsap) { fallbackNoGsap(); return; }

  var gsap = window.gsap;
  if (window.ScrollTrigger) gsap.registerPlugin(window.ScrollTrigger);
  if (window.ScrollToPlugin) gsap.registerPlugin(window.ScrollToPlugin);
  var ST = window.ScrollTrigger || null;
  var HAS_SCROLLTO = !!window.ScrollToPlugin;
  var mm = gsap.matchMedia();

  var EASE_IN = 'power3.out';
  var EASE_EXPO = 'expo.out';

  /* ---------- split text ---------- */
  /*
   * Splits plain text (+ <br>) into masked spans.
   *  words : <span class="split-line"(mask)><span class="split-word">word</span></span>
   *  chars : <span class="split-word"(nowrap)><span class="split-line"(mask)><span class="split-char">c</span></span>…</span>
   *  lines : words grouped by offsetTop into <span class="split-line"(mask, block)><span class="split-line-inner">…</span></span>
   * Returns the array of animatable targets (inner spans). Stores them on el._splitTargets.
   */
  function maskSpan(className) {
    var m = document.createElement('span');
    m.className = className;
    m.style.display = 'inline-block';
    m.style.overflow = 'hidden';
    m.style.verticalAlign = 'top';
    m.style.paddingBottom = '0.14em';
    m.style.marginBottom = '-0.14em';
    m.setAttribute('aria-hidden', 'true');
    return m;
  }
  function innerSpan(className, text) {
    var s = document.createElement('span');
    s.className = className;
    s.style.display = 'inline-block';
    s.style.willChange = 'transform';
    s.textContent = text;
    s.setAttribute('aria-hidden', 'true');
    return s;
  }

  function splitElement(el, mode) {
    if (el._splitTargets) return el._splitTargets;
    mode = mode || 'words';
    var original = Array.prototype.map.call(el.childNodes, function (n) {
      return (n.nodeType === 1 && n.tagName === 'BR') ? ' ' : (n.textContent || '');
    }).join('').replace(/\s+/g, ' ').trim();
    if (!el.getAttribute('aria-label')) el.setAttribute('aria-label', original);

    var nodes = Array.prototype.slice.call(el.childNodes);
    var frag = document.createDocumentFragment();
    var targets = [];
    var wordSpans = [];

    nodes.forEach(function (node) {
      if (node.nodeType === 1 && node.tagName === 'BR') { frag.appendChild(node.cloneNode(false)); return; }
      var text = node.textContent || '';
      var parts = text.split(/(\s+)/);
      parts.forEach(function (part) {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
        if (mode === 'chars') {
          var w = document.createElement('span');
          w.className = 'split-word';
          w.style.display = 'inline-block';
          w.style.whiteSpace = 'nowrap';
          w.setAttribute('aria-hidden', 'true');
          Array.prototype.forEach.call(part, function (ch) {
            var m = maskSpan('split-line');
            var c = innerSpan('split-char', ch);
            m.appendChild(c); w.appendChild(m); targets.push(c);
          });
          frag.appendChild(w);
        } else if (mode === 'lines') {
          var ws = innerSpan('split-word', part);
          ws.style.willChange = '';
          frag.appendChild(ws); wordSpans.push(ws);
        } else {
          var mask = maskSpan('split-line');
          var inner = innerSpan('split-word', part);
          mask.appendChild(inner); frag.appendChild(mask); targets.push(inner);
        }
      });
    });

    el.innerHTML = '';
    el.appendChild(frag);

    if (mode === 'lines') {
      // Group word spans by their rendered line (offsetTop), then wrap each group.
      var groups = [];
      var lastTop = null;
      wordSpans.forEach(function (ws) {
        var top = ws.offsetTop;
        if (lastTop === null || Math.abs(top - lastTop) > 2) { groups.push([]); lastTop = top; }
        groups[groups.length - 1].push(ws);
      });
      groups.forEach(function (group) {
        var mask = maskSpan('split-line');
        mask.style.display = 'block';
        var inner = document.createElement('span');
        inner.className = 'split-line-inner';
        inner.style.display = 'block';
        inner.style.willChange = 'transform';
        inner.setAttribute('aria-hidden', 'true');
        var first = group[0];
        first.parentNode.insertBefore(mask, first);
        mask.appendChild(inner);
        group.forEach(function (ws, i) {
          // Carry the following whitespace along with the word.
          var next = ws.nextSibling;
          inner.appendChild(ws);
          if (i < group.length - 1 && next && next.nodeType === 3) inner.appendChild(next);
        });
        targets.push(inner);
      });
      // Remove stray <br> / whitespace left between blocks.
      Array.prototype.slice.call(el.childNodes).forEach(function (n) {
        if (n.nodeType === 3 && !n.textContent.trim()) el.removeChild(n);
        else if (n.nodeType === 1 && n.tagName === 'BR') el.removeChild(n);
      });
    }

    el._splitTargets = targets;
    el.classList.add('is-split');
    return targets;
  }

  /* ---------- features ---------- */
  var heroPlay = null; // set by initHero, called by initPreloader

  function initPreloader() {
    var pre = qs('[data-preloader]');
    var finished = false;
    var finish = function () {
      if (finished) return;
      finished = true;
      if (pre && pre.parentNode) pre.parentNode.removeChild(pre);
      document.body.classList.add('is-loaded');
      if (typeof heroPlay === 'function') heroPlay();
    };
    if (!pre || REDUCE) { finish(); return; }

    var mark = qs('.preloader__mark', pre);
    var tl = gsap.timeline({ onComplete: finish });
    if (mark) {
      tl.fromTo(mark, { autoAlpha: 0, clipPath: 'inset(0 100% 0 0)', y: 10 },
        { autoAlpha: 1, clipPath: 'inset(0 0% 0 0)', y: 0, duration: 0.5, ease: EASE_EXPO }, 0);
    }
    // Wait briefly for fonts so the hero title does not reflow mid-reveal, but never beyond the cap.
    var fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
    var timeout = new Promise(function (res) { setTimeout(res, 300); });
    tl.addPause(0.5, function () {
      Promise.race([fontsReady, timeout]).then(function () { tl.play(); });
    });
    tl.to(pre, { yPercent: -100, duration: 0.6, ease: 'expo.inOut' }, 0.5);
    tl.to(mark, { autoAlpha: 0, y: -20, duration: 0.3, ease: 'power2.in' }, 0.5);

    // Hard cap: whatever happens, the page is usable by 1.5s.
    setTimeout(function () { if (!finished) { tl.kill(); finish(); } }, 1500);
  }

  function initNav() {
    var nav = qs('[data-nav]');
    var toggle = qs('[data-nav-toggle]');
    var overlay = qs('[data-nav-overlay]');
    var links = overlay ? qsa('[data-nav-link]', overlay) : [];
    var isOpen = false;

    if (nav) {
      var lastY = window.pageYOffset || 0;
      var ticking = false;
      var update = function () {
        ticking = false;
        var y = window.pageYOffset || 0;
        nav.classList.toggle('is-scrolled', y > 60);
        if (!isOpen) {
          var delta = y - lastY;
          if (y < 300) nav.classList.remove('is-hidden');
          else if (delta > 4) nav.classList.add('is-hidden');
          else if (delta < -4) nav.classList.remove('is-hidden');
        }
        lastY = y;
      };
      window.addEventListener('scroll', function () {
        if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
      }, { passive: true });
      update();
    }

    if (!toggle || !overlay) return;

    var setOpen = function (open) {
      isOpen = open;
      overlay.classList.toggle('is-open', open);
      document.body.classList.toggle('nav-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (nav) nav.classList.remove('is-hidden');
      if (open) {
        if (REDUCE) { gsap.set(links, { clearProps: 'all' }); return; }
        gsap.fromTo(links, { autoAlpha: 0, y: 40 },
          { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.07, ease: EASE_IN, delay: 0.12, overwrite: true });
      } else {
        gsap.killTweensOf(links);
        gsap.delayedCall(0.5, function () { if (!isOpen) gsap.set(links, { clearProps: 'all' }); });
      }
    };
    toggle.addEventListener('click', function () { setOpen(!isOpen); });
    qsa('[data-nav-close]', overlay).forEach(function (b) { b.addEventListener('click', function () { setOpen(false); }); });
    links.forEach(function (a) { a.addEventListener('click', function () { if (isOpen) setOpen(false); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && isOpen) setOpen(false); });
    window.__casamattaNavClose = function () { if (isOpen) setOpen(false); };
  }

  function initAnchors() {
    var nav = qs('[data-nav]');
    document.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
      if (!a) return;
      var hash = a.getAttribute('href');
      if (!hash || hash === '#' || hash.length < 2) return;
      var target = null;
      try { target = document.querySelector(hash); } catch (err) { target = null; }
      if (!target) return;
      e.preventDefault();
      var offset = nav ? nav.offsetHeight : 0;
      var done = function () {
        try { history.replaceState(null, '', hash); } catch (err) { /* noop */ }
      };
      if (!HAS_SCROLLTO || REDUCE) {
        var top = target.getBoundingClientRect().top + (window.pageYOffset || 0) - offset;
        window.scrollTo({ top: top, behavior: REDUCE ? 'auto' : 'smooth' });
        done();
        return;
      }
      gsap.to(window, {
        scrollTo: { y: target, offsetY: offset, autoKill: false },
        duration: 1.1, ease: 'power3.inOut', overwrite: 'auto', onComplete: done
      });
    });
  }

  function initReveal() {
    var els = qsa('[data-reveal]');
    if (!els.length) return;
    if (REDUCE || !ST) { gsap.set(els, { clearProps: 'all' }); return; }
    els.forEach(function (el) {
      var variant = (el.getAttribute('data-reveal') || 'up').trim();
      var delay = parseFloat(el.getAttribute('data-reveal-delay')) || 0;
      var from = { autoAlpha: 0 };
      if (variant === 'left') from.x = -40;
      else if (variant === 'right') from.x = 40;
      else if (variant === 'scale') { from.scale = 0.94; from.y = 24; }
      else from.y = 40;
      gsap.set(el, from);
      gsap.to(el, {
        autoAlpha: 1, x: 0, y: 0, scale: 1, duration: 1.2, delay: delay, ease: EASE_IN, overwrite: 'auto',
        scrollTrigger: { trigger: el, start: 'top 85%', once: true }
      });
    });
  }

  function initStagger() {
    var groups = qsa('[data-stagger]');
    if (!groups.length) return;
    groups.forEach(function (group) {
      var kids = Array.prototype.slice.call(group.children);
      if (!kids.length) return;
      if (REDUCE || !ST) { gsap.set(kids, { clearProps: 'all' }); return; }
      gsap.set(kids, { autoAlpha: 0, y: 32 });
      gsap.to(kids, {
        autoAlpha: 1, y: 0, duration: 1.1, stagger: 0.08, ease: EASE_IN, overwrite: 'auto',
        scrollTrigger: { trigger: group, start: 'top 85%', once: true }
      });
    });
  }

  function initSplit() {
    var els = qsa('[data-split]');
    if (!els.length) return;
    if (REDUCE || !ST) return; // leave text untouched and visible
    els.forEach(function (el) {
      var mode = (el.getAttribute('data-split') || 'words').trim();
      var targets = splitElement(el, mode);
      if (!targets.length) return;
      gsap.set(targets, { yPercent: 110, rotate: 2, transformOrigin: '0% 100%' });
      if (el.hasAttribute('data-hero-title')) return; // the hero timeline owns this one
      gsap.to(targets, {
        yPercent: 0, rotate: 0, duration: 1.2, ease: EASE_EXPO,
        stagger: mode === 'chars' ? 0.015 : (mode === 'lines' ? 0.12 : 0.04),
        scrollTrigger: { trigger: el, start: 'top 85%', once: true }
      });
    });
  }

  function initParallax() {
    var els = qsa('[data-parallax]');
    if (!els.length || !ST) return;
    mm.add(DESKTOP_MQ, function () {
      els.forEach(function (el) {
        var f = parseFloat(el.getAttribute('data-parallax'));
        if (!isFinite(f) || f === 0) f = 0.15;
        var amp = f * 50; // yPercent from -amp to +amp
        var parent = el.parentElement || el;
        gsap.fromTo(el, { yPercent: -amp }, {
          yPercent: amp, ease: 'none',
          scrollTrigger: { trigger: parent, start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true }
        });
      });
    });
  }

  function initClip() {
    var wraps = qsa('[data-clip]');
    if (!wraps.length) return;
    wraps.forEach(function (wrap) {
      var img = qs('img', wrap);
      if (REDUCE || !ST) { gsap.set([wrap, img], { clearProps: 'all' }); return; }
      gsap.set(wrap, { clipPath: 'inset(0 0 100% 0)' });
      if (img) gsap.set(img, { scale: 1.2 });
      var tl = gsap.timeline({ scrollTrigger: { trigger: wrap, start: 'top 80%', once: true } });
      tl.to(wrap, { clipPath: 'inset(0 0 0% 0)', duration: 1.2, ease: EASE_EXPO }, 0);
      if (img) tl.to(img, { scale: 1, duration: 1.6, ease: EASE_EXPO }, 0);
    });
  }

  function initCounters() {
    var els = qsa('[data-counter]');
    if (!els.length) return;
    els.forEach(function (el) {
      var raw = (el.getAttribute('data-counter') || '0').trim();
      var suffix = el.getAttribute('data-counter-suffix') || '';
      var thousands = /^\d{1,3}(\.\d{3})+$/.test(raw); // "1.200" = Italian thousands separator
      var decimals = raw.indexOf(',') > -1 ? raw.split(',')[1].length
        : (!thousands && raw.indexOf('.') > -1 ? raw.split('.')[1].length : 0);
      var target = parseFloat(thousands ? raw.replace(/\./g, '') : raw.replace(',', '.'));
      if (!isFinite(target)) return;
      var format = function (v) {
        var s = v.toFixed(decimals);
        if (decimals) s = s.replace('.', ',');
        else s = s.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        return s + suffix;
      };
      if (REDUCE || !ST) { el.textContent = format(target); return; }
      el.textContent = format(0);
      var obj = { v: 0 };
      gsap.to(obj, {
        v: target, duration: 1.6, ease: 'power2.out',
        onUpdate: function () { el.textContent = format(obj.v); },
        onComplete: function () { el.textContent = format(target); },
        scrollTrigger: { trigger: el, start: 'top 90%', once: true }
      });
    });
  }

  function initMarquee() {
    var wraps = qsa('[data-marquee]');
    if (!wraps.length || REDUCE) return;
    wraps.forEach(function (wrap) {
      var track = qs('[data-marquee-track]', wrap);
      if (!track) return;
      var speed = parseFloat(wrap.getAttribute('data-marquee-speed')) || 30;
      var reverse = wrap.hasAttribute('data-marquee-reverse');
      var tween = gsap.fromTo(track, { xPercent: reverse ? -50 : 0 },
        { xPercent: reverse ? 0 : -50, ease: 'none', duration: speed, repeat: -1 });
      if (!ST) return;
      ST.create({
        trigger: wrap, start: 'top bottom', end: 'bottom top',
        onToggle: function (self) { if (self.isActive) tween.play(); else tween.pause(); },
        onUpdate: function (self) {
          // Subtle speed-up with scroll velocity, easing back to 1.
          var v = Math.min(Math.abs(self.getVelocity()) / 1200, 2.5);
          gsap.to(tween, { timeScale: 1 + v, duration: 0.3, overwrite: true, onComplete: function () {
            gsap.to(tween, { timeScale: 1, duration: 1.2, ease: 'power2.out', overwrite: true });
          } });
        }
      });
    });
  }

  function initHScroll() {
    var sections = qsa('[data-hscroll]');
    if (!sections.length || !ST) return;
    sections.forEach(function (section) {
      var track = qs('[data-hscroll-track]', section);
      if (!track) return;
      mm.add(DESKTOP_MQ, function () {
        var dist = function () {
          // Track sits inside a centred container: include its untransformed left offset
          var x = parseFloat(gsap.getProperty(track, 'x')) || 0;
          var left = track.getBoundingClientRect().left - x;
          return Math.max(0, left + track.scrollWidth - window.innerWidth);
        };
        gsap.to(track, {
          x: function () { return -dist(); },
          ease: 'none',
          scrollTrigger: {
            trigger: section, pin: true, start: 'top top',
            end: function () { return '+=' + dist(); },
            scrub: 1, invalidateOnRefresh: true, anticipatePin: 1
          }
        });
      });
    });
  }

  function initTabs() {
    var roots = qsa('[data-tabs]');
    if (!roots.length) return;
    roots.forEach(function (root) {
      var buttons = qsa('[data-tab]', root);
      var panels = qsa('[data-panel]', root);
      if (!buttons.length || !panels.length) return;
      var activate = function (btn, animate) {
        var id = btn.getAttribute('data-tab');
        buttons.forEach(function (b) {
          var on = b === btn;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-selected', on ? 'true' : 'false');
          b.setAttribute('tabindex', on ? '0' : '-1');
        });
        var activePanel = null;
        panels.forEach(function (p) {
          var on = p.getAttribute('data-panel') === id;
          p.classList.toggle('is-active', on);
          if (on) { p.removeAttribute('hidden'); activePanel = p; } else p.setAttribute('hidden', '');
        });
        if (activePanel && animate && !REDUCE) {
          var items = qsa('[data-menu-item]', activePanel);
          if (items.length) {
            gsap.fromTo(items, { autoAlpha: 0, y: 16 },
              { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.05, ease: EASE_IN, overwrite: true, clearProps: 'transform' });
          }
        }
        if (ST) ST.refresh();
      };
      buttons.forEach(function (btn, i) {
        btn.addEventListener('click', function () { if (!btn.classList.contains('is-active')) activate(btn, true); });
        btn.addEventListener('keydown', function (e) {
          var dir = e.key === 'ArrowRight' ? 1 : (e.key === 'ArrowLeft' ? -1 : 0);
          if (!dir) return;
          e.preventDefault();
          var next = buttons[(i + dir + buttons.length) % buttons.length];
          next.focus(); activate(next, true);
        });
      });
      // Make sure exactly one tab is active at start without animating.
      var initial = buttons.filter(function (b) { return b.classList.contains('is-active'); })[0] || buttons[0];
      activate(initial, false);
    });
  }

  function initMagnetic() {
    var els = qsa('[data-magnetic]');
    if (!els.length || REDUCE || !HOVER_FINE) return;
    mm.add(DESKTOP_MQ, function () {
      var cleanups = [];
      els.forEach(function (el) {
        var MAX = 12;
        var move = function (e) {
          var r = el.getBoundingClientRect();
          var dx = e.clientX - (r.left + r.width / 2);
          var dy = e.clientY - (r.top + r.height / 2);
          var x = gsap.utils.clamp(-MAX, MAX, dx * 0.35);
          var y = gsap.utils.clamp(-MAX, MAX, dy * 0.35);
          gsap.to(el, { x: x, y: y, duration: 0.6, ease: EASE_IN, overwrite: 'auto' });
        };
        var leave = function () { gsap.to(el, { x: 0, y: 0, duration: 1, ease: 'elastic.out(1, .5)', overwrite: 'auto' }); };
        el.addEventListener('mousemove', move);
        el.addEventListener('mouseleave', leave);
        cleanups.push(function () { el.removeEventListener('mousemove', move); el.removeEventListener('mouseleave', leave); });
      });
      return function () { cleanups.forEach(function (fn) { fn(); }); };
    });
  }

  function initTilt() {
    var els = qsa('[data-tilt]');
    if (!els.length || REDUCE || !HOVER_FINE) return;
    mm.add(DESKTOP_MQ, function () {
      var cleanups = [];
      els.forEach(function (el) {
        var MAX = 6;
        gsap.set(el, { transformPerspective: 900, transformOrigin: 'center center' });
        var move = function (e) {
          var r = el.getBoundingClientRect();
          var px = (e.clientX - r.left) / r.width - 0.5;
          var py = (e.clientY - r.top) / r.height - 0.5;
          gsap.to(el, { rotateX: -py * MAX * 2, rotateY: px * MAX * 2, duration: 0.5, ease: 'power2.out', overwrite: 'auto' });
        };
        var leave = function () { gsap.to(el, { rotateX: 0, rotateY: 0, duration: 0.9, ease: EASE_IN, overwrite: 'auto' }); };
        el.addEventListener('mousemove', move);
        el.addEventListener('mouseleave', leave);
        cleanups.push(function () { el.removeEventListener('mousemove', move); el.removeEventListener('mouseleave', leave); });
      });
      return function () { cleanups.forEach(function (fn) { fn(); }); };
    });
  }

  function initHero() {
    var media = qs('[data-hero-media]');
    var title = qs('[data-hero-title]');
    var sub = qs('[data-hero-sub]');
    var cta = qs('[data-hero-cta]');
    var hint = qs('[data-hero-scroll]');
    if (!media && !title && !sub && !cta && !hint) return;
    var ctaKids = cta ? Array.prototype.slice.call(cta.children) : [];

    if (REDUCE) {
      gsap.set([media, title, sub, hint].concat(ctaKids).filter(Boolean), { clearProps: 'all' });
      heroPlay = function () {};
      return;
    }

    var titleTargets = [];
    if (title) {
      titleTargets = title._splitTargets || splitElement(title, (title.getAttribute('data-split') || 'words').trim());
      gsap.set(titleTargets, { yPercent: 110, rotate: 2, transformOrigin: '0% 100%' });
    }
    if (media) gsap.set(media, { scale: 1.15, transformOrigin: 'center center' });
    if (sub) gsap.set(sub, { autoAlpha: 0, y: 24 });
    if (ctaKids.length) gsap.set(ctaKids, { autoAlpha: 0, y: 24 });
    if (hint) gsap.set(hint, { autoAlpha: 0 });

    var tl = gsap.timeline({ paused: true, defaults: { ease: EASE_IN } });
    if (media) tl.to(media, { scale: 1, duration: 2.4, ease: EASE_EXPO }, 0);
    if (titleTargets.length) tl.to(titleTargets, { yPercent: 0, rotate: 0, duration: 1.3, stagger: 0.06, ease: EASE_EXPO }, 0.1);
    if (sub) tl.to(sub, { autoAlpha: 1, y: 0, duration: 1 }, 0.7);
    if (ctaKids.length) tl.to(ctaKids, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.1 }, 0.9);
    if (hint) {
      tl.to(hint, { autoAlpha: 1, duration: 0.8 }, 1.3);
      tl.call(function () { gsap.to(hint, { y: 8, duration: 1.3, ease: 'sine.inOut', yoyo: true, repeat: -1 }); }, null, 1.3);
    }
    var played = false;
    heroPlay = function () { if (!played) { played = true; tl.play(); } };

    // Scroll-linked exit (desktop only): media drifts down, title fades.
    if (ST) {
      var heroSection = (media || title).closest('section, header, [data-hero]') || (media || title).parentElement;
      mm.add(DESKTOP_MQ, function () {
        if (media) gsap.to(media, { yPercent: 15, ease: 'none', scrollTrigger: { trigger: heroSection, start: 'top top', end: 'bottom top', scrub: true } });
        if (title) gsap.to(title, { autoAlpha: 0, ease: 'none', scrollTrigger: { trigger: heroSection, start: 'top top', end: 'bottom top', scrub: true } });
      });
    }
  }

  function initRefresh() {
    if (!ST) return;
    var timer = null;
    var refresh = function () {
      clearTimeout(timer);
      timer = setTimeout(function () { ST.refresh(); }, 150);
    };
    qsa('img').forEach(function (img) {
      if (!img.complete) img.addEventListener('load', refresh, { once: true });
    });
    window.addEventListener('load', refresh);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
    window.__casamatta = { refresh: function () { ST.refresh(); } };
  }

  /* ---------- boot ---------- */
  onReady(function () {
    if (REDUCE) {
      // Reduced motion: everything visible, no scroll effects; nav, anchors and tabs keep working.
      safe('showEverything', showEverything);
      safe('reveal', initReveal);
      safe('stagger', initStagger);
      safe('clip', initClip);
      safe('counters', initCounters);
      safe('hero', initHero);
    } else {
      // Created top-to-bottom in page order where it matters; ScrollTrigger.sort() fixes the rest.
      safe('hero', initHero);
      safe('split', initSplit);
      safe('reveal', initReveal);
      safe('stagger', initStagger);
      safe('clip', initClip);
      safe('counters', initCounters);
      safe('parallax', initParallax);
      safe('marquee', initMarquee);
      safe('hscroll', initHScroll);
      safe('magnetic', initMagnetic);
      safe('tilt', initTilt);
    }
    safe('tabs', initTabs);
    safe('nav', initNav);
    safe('anchors', initAnchors);
    safe('refresh', initRefresh);
    safe('preloader', initPreloader);
    if (ST && !REDUCE) { safe('sort', function () { ST.sort(); ST.refresh(); }); }
    if (!window.__casamatta) window.__casamatta = { refresh: function () { if (ST) ST.refresh(); } };
  });
})();
