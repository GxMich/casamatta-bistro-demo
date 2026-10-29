/* ==========================================================================
   Casamatta bistrò e design — motion & interaction (restyle)
   GSAP 3.12 core + ScrollTrigger + ScrollToPlugin (loaded from cdnjs before this file).
   Plain ES2020, no modules, runs from file://.

   Direction: one orchestrated moment (preloader → hero, the logo letters go "matte"),
   then scroll-linked motion that means something (day timeline colours, spinning
   plate, drawing ornaments, materials) and motion that answers the visitor
   (hover, tabs, lightbox, velvet sheen).

   Every feature no-ops when its hook is absent, never leaves content hidden,
   and respects prefers-reduced-motion. Without GSAP the practical features
   (preloader removal, nav, anchors, tabs, lightbox, booking, open-now,
   materials, mobile bar) still work.
   Hook contract: see restyle SPEC.md §4.
   ========================================================================== */
(function () {
  'use strict';

  /* ---------- helpers ---------- */
  var qs = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var qsa = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };
  var mq = function (q) { return !!(window.matchMedia && window.matchMedia(q).matches); };
  var raf = function (fn) { return (window.requestAnimationFrame || function (f) { return setTimeout(f, 16); })(fn); };

  var REDUCE = mq('(prefers-reduced-motion: reduce)');
  var HOVER_FINE = mq('(hover: hover) and (pointer: fine)');
  var DESKTOP = '(min-width: 1024px)';
  var DESKTOP_MOTION = '(min-width: 1024px) and (prefers-reduced-motion: no-preference)';
  var DESKTOP_POINTER = '(min-width: 1024px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)';

  var gsap = window.gsap || null;
  var ST = null;
  var HAS_SCROLLTO = false;
  var mm = null;
  if (gsap) {
    if (window.ScrollTrigger) { gsap.registerPlugin(window.ScrollTrigger); ST = window.ScrollTrigger; }
    if (window.ScrollToPlugin) { gsap.registerPlugin(window.ScrollToPlugin); HAS_SCROLLTO = true; }
    mm = gsap.matchMedia();
  }
  var MOTION = !!gsap && !REDUCE;   // the animated path
  var EASE = 'power3.out';
  var EXPO = 'expo.out';

  function safe(name, fn) {
    try { return fn(); } catch (err) { console.warn('[casamatta] ' + name + ' failed:', err); }
  }
  function onReady(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
    else fn();
  }

  /* ---------- Rome time + opening hours (from the venue's own menu) ---------- */
  // Minutes from midnight; values > 1440 spill into the next day.
  var SCHEDULE = {
    1: [[420, 870], [1110, 1440]],   // lunedì   7:00–14:30, 18:30–24:00
    2: [[420, 870], [1110, 1440]],
    3: [[420, 870], [1110, 1440]],
    4: [[420, 870], [1110, 1440]],
    5: [[420, 870], [1110, 1500]],   // venerdì  fino all'1:00
    6: [[420, 870], [1110, 1560]],   // sabato   fino alle 2:00
    7: [[450, 900], [1110, 1440]]    // domenica 7:30–15:00, 18:30–24:00
  };

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  function romeNow() {
    var d = new Date();
    var out = null;
    try {
      var parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit',
        weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false
      }).formatToParts(d);
      var o = {};
      parts.forEach(function (p) { o[p.type] = p.value; });
      var map = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
      var h = parseInt(o.hour, 10) % 24;
      out = { dow: map[o.weekday], min: h * 60 + parseInt(o.minute, 10), iso: o.year + '-' + o.month + '-' + o.day };
    } catch (err) { out = null; }
    if (!out || !out.dow || !isFinite(out.min)) {
      out = {
        dow: d.getDay() || 7,
        min: d.getHours() * 60 + d.getMinutes(),
        iso: d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate())
      };
    }
    return out;
  }

  // "alle 14:30", "all’1:00", "a mezzanotte"
  function alle(min) {
    var m = ((min % 1440) + 1440) % 1440;
    if (m === 0) return 'a mezzanotte';
    var h = Math.floor(m / 60);
    var t = h + ':' + pad2(m % 60);
    return (h === 1 ? 'all’' : 'alle ') + t;
  }

  function openStatus(now) {
    var dow = now.dow;
    var min = now.min;
    var prev = dow === 1 ? 7 : dow - 1;
    var next = dow === 7 ? 1 : dow + 1;
    var i, iv;
    var y = SCHEDULE[prev];
    for (i = 0; i < y.length; i++) {
      iv = y[i];
      if (iv[1] > 1440 && min < iv[1] - 1440) return { open: true, text: 'Aperto ora, chiude ' + alle(iv[1]) };
    }
    var t = SCHEDULE[dow];
    for (i = 0; i < t.length; i++) {
      iv = t[i];
      if (min >= iv[0] && min < iv[1]) return { open: true, text: 'Aperto ora, chiude ' + alle(iv[1]) };
    }
    for (i = 0; i < t.length; i++) {
      iv = t[i];
      if (iv[0] > min) return { open: false, text: 'Chiuso ora, riapre ' + alle(iv[0]) };
    }
    return { open: false, text: 'Chiuso ora, riapre domani ' + alle(SCHEDULE[next][0][0]) };
  }

  /* ==========================================================================
     Features that work with or without GSAP
     ========================================================================== */

  var heroPlay = function () {};

  function initPreloader() {
    var pre = qs('[data-preloader]');
    var done = false;
    var finish = function () {
      if (done) return;
      done = true;
      if (pre && pre.parentNode) pre.parentNode.removeChild(pre);
      document.body.classList.add('is-loaded');
      heroPlay();
    };
    if (!pre || !MOTION) { finish(); return; }

    pre.style.animation = 'none'; // JS owns it now; the CSS fallback is for when JS fails
    var letters = qsa('.wordmark__letters > span', pre);
    var jump = qs('.wm-jump', pre);
    var flip = qs('.wm-flip', pre);
    var tagline = qs('.tagline', pre);
    var jumpY = jump ? (parseFloat(gsap.getProperty(jump, 'y')) || 0) : 0;

    if (letters.length) gsap.set(letters, { autoAlpha: 0, yPercent: 60 });
    if (jump) gsap.set(jump, { y: 0 });
    if (flip) gsap.set(flip, { rotation: 0, transformOrigin: '50% 50%' });
    if (tagline) gsap.set(tagline, { autoAlpha: 0, y: 8 });

    var tl = gsap.timeline({ paused: true, onComplete: finish });
    if (letters.length) tl.to(letters, { autoAlpha: 1, yPercent: 0, duration: 0.45, stagger: 0.035, ease: EXPO }, 0);
    if (tagline) tl.to(tagline, { autoAlpha: 1, y: 0, duration: 0.4, ease: EASE }, 0.3);
    if (jump) tl.to(jump, { y: jumpY || -6, duration: 0.45, ease: 'back.out(3)' }, 0.55);
    if (flip) tl.to(flip, { rotation: 180, duration: 0.55, ease: 'back.out(1.7)' }, 0.55);
    tl.call(function () { heroPlay(); }, null, 1.05);
    tl.to(pre, { yPercent: -100, duration: 0.6, ease: 'expo.inOut' }, 1.0);

    // Give the webfonts a moment so the wordmark doesn't reflow mid-animation.
    var fonts = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
    var wait = new Promise(function (res) { setTimeout(res, 400); });
    Promise.race([fonts, wait]).then(function () { tl.play(); });
    // Hard cap: the page is usable within 2s whatever happens.
    setTimeout(function () { if (!done) { tl.kill(); finish(); } }, 2000);
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
        nav.classList.toggle('is-scrolled', y > 40);
        if (!isOpen) {
          var delta = y - lastY;
          if (y < 400) nav.classList.remove('is-hidden');
          else if (delta > 4) nav.classList.add('is-hidden');
          else if (delta < -4) nav.classList.remove('is-hidden');
        }
        lastY = y;
      };
      window.addEventListener('scroll', function () {
        if (!ticking) { ticking = true; raf(update); }
      }, { passive: true });
      update();
    }

    if (!toggle || !overlay) return;
    overlay.setAttribute('aria-hidden', 'true');
    if ('inert' in overlay) overlay.inert = true;

    var setOpen = function (open) {
      isOpen = open;
      overlay.classList.toggle('is-open', open);
      document.body.classList.toggle('nav-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      overlay.setAttribute('aria-hidden', open ? 'false' : 'true');
      if ('inert' in overlay) overlay.inert = !open;
      if (nav) nav.classList.remove('is-hidden');
      if (open) {
        var first = qs('[data-nav-close]', overlay) || links[0];
        if (first && first.focus) setTimeout(function () { first.focus({ preventScroll: true }); }, 60);
        if (MOTION && links.length) {
          gsap.fromTo(links, { autoAlpha: 0, y: 40 },
            { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.07, ease: EASE, delay: 0.12, overwrite: true });
        }
      } else {
        if (MOTION && links.length) {
          gsap.killTweensOf(links);
          gsap.delayedCall(0.5, function () { if (!isOpen) gsap.set(links, { clearProps: 'all' }); });
        }
        if (toggle.focus && overlay.contains(document.activeElement)) toggle.focus({ preventScroll: true });
      }
    };
    toggle.addEventListener('click', function () { setOpen(!isOpen); });
    qsa('[data-nav-close]', overlay).forEach(function (b) { b.addEventListener('click', function () { setOpen(false); }); });
    links.forEach(function (a) { a.addEventListener('click', function () { if (isOpen) setOpen(false); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && isOpen) setOpen(false); });
    window.__casamattaNavClose = function () { if (isOpen) setOpen(false); };
  }

  function initMobilebar() {
    var bar = qs('[data-mobilebar]');
    if (!bar) return;
    var target = qs('#prenota');
    var inTarget = false;
    var ticking = false;
    var update = function () {
      ticking = false;
      var y = window.pageYOffset || 0;
      var show = y > window.innerHeight * 0.7 && !inTarget && !document.body.classList.contains('nav-open');
      bar.classList.toggle('is-visible', show);
      bar.setAttribute('aria-hidden', show ? 'false' : 'true');
      if ('inert' in bar) bar.inert = !show;
    };
    if (target && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        inTarget = entries[0].isIntersecting;
        update();
      }, { rootMargin: '0px 0px -20% 0px' }).observe(target);
    }
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; raf(update); } }, { passive: true });
    window.addEventListener('resize', update);
    update();
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
      var tab = a.getAttribute('data-open-tab');
      if (tab && typeof window.__casamattaOpenTab === 'function') window.__casamattaOpenTab(tab);
      var offset = nav ? nav.offsetHeight : 0;
      var done = function () {
        try { history.replaceState(null, '', hash); } catch (err) { /* noop */ }
        if (target.hasAttribute('tabindex') || /^(A|BUTTON|INPUT|SELECT|TEXTAREA)$/.test(target.tagName)) {
          target.focus({ preventScroll: true });
        }
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

  function initTabs() {
    var roots = qsa('[data-tabs]');
    if (!roots.length) return;
    var openers = {};
    roots.forEach(function (root) {
      var buttons = qsa('[data-tab]', root);
      var panels = qsa('[data-panel]', root);
      if (!buttons.length || !panels.length) return;

      var centerTab = function (btn) {
        var list = btn.parentElement;
        if (!list || list.scrollWidth <= list.clientWidth + 2) return;
        var left = btn.offsetLeft - (list.clientWidth - btn.offsetWidth) / 2;
        if (list.scrollTo) list.scrollTo({ left: Math.max(0, left), behavior: REDUCE ? 'auto' : 'smooth' });
        else list.scrollLeft = left;
      };

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
        if (activePanel && animate && MOTION) {
          var items = qsa('[data-menu-item]', activePanel);
          if (items.length) {
            gsap.fromTo(items, { autoAlpha: 0, y: 16 },
              { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.04, ease: EASE, overwrite: true, clearProps: 'transform,opacity,visibility' });
          }
        }
        centerTab(btn);
        if (ST) ST.refresh();
      };

      buttons.forEach(function (btn, i) {
        openers[btn.getAttribute('data-tab')] = function () { activate(btn, true); };
        btn.addEventListener('click', function () { if (!btn.classList.contains('is-active')) activate(btn, true); });
        btn.addEventListener('keydown', function (e) {
          var dir = 0;
          if (e.key === 'ArrowRight') dir = 1;
          else if (e.key === 'ArrowLeft') dir = -1;
          else if (e.key === 'Home') { e.preventDefault(); buttons[0].focus(); activate(buttons[0], true); return; }
          else if (e.key === 'End') { e.preventDefault(); buttons[buttons.length - 1].focus(); activate(buttons[buttons.length - 1], true); return; }
          if (!dir) return;
          e.preventDefault();
          var next = buttons[(i + dir + buttons.length) % buttons.length];
          next.focus();
          activate(next, true);
        });
      });
      var initial = buttons.filter(function (b) { return b.classList.contains('is-active'); })[0] || buttons[0];
      activate(initial, false);
    });
    window.__casamattaOpenTab = function (id) { if (openers[id]) openers[id](); };
  }

  function initMaterials() {
    qsa('[data-materials]').forEach(function (root) {
      var items = qsa('[data-material]', root);
      var medias = qsa('[data-material-media]', root);
      if (!items.length) return;
      var current = null;
      var setActive = function (id) {
        if (!id || id === current) return;
        current = id;
        items.forEach(function (it) {
          var on = it.getAttribute('data-material') === id;
          it.classList.toggle('is-active', on);
          var b = qs('.material__btn', it);
          if (b) b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        medias.forEach(function (m) { m.classList.toggle('is-active', m.getAttribute('data-material-media') === id); });
      };
      var initial = items.filter(function (i) { return i.classList.contains('is-active'); })[0] || items[0];
      setActive(initial.getAttribute('data-material'));

      items.forEach(function (it) {
        var id = it.getAttribute('data-material');
        var btn = qs('.material__btn', it) || it;
        btn.addEventListener('click', function () { setActive(id); });
        btn.addEventListener('focus', function () { setActive(id); });
        if (HOVER_FINE) btn.addEventListener('mouseenter', function () { setActive(id); });
      });

      // Desktop: the active material follows the scroll (class toggles only, no motion).
      if (ST && mm) {
        mm.add(DESKTOP, function () {
          var triggers = items.map(function (it) {
            return ST.create({
              trigger: it, start: 'top center', end: 'bottom center',
              onToggle: function (self) { if (self.isActive) setActive(it.getAttribute('data-material')); }
            });
          });
          return function () { triggers.forEach(function (t) { t.kill(); }); };
        });
      }
    });
  }

  function initLightbox() {
    var dialog = qs('[data-lightbox-dialog]');
    var openers = qsa('[data-lightbox]');
    if (!dialog || !openers.length) return;
    var img = qs('[data-lightbox-img]', dialog);
    var cap = qs('[data-lightbox-caption]', dialog);
    var count = qs('[data-lightbox-count]', dialog);
    var prev = qs('[data-lightbox-prev]', dialog);
    var next = qs('[data-lightbox-next]', dialog);
    var close = qs('[data-lightbox-close]', dialog);
    var canModal = typeof dialog.showModal === 'function';
    var index = 0;
    var opener = null;

    var altOf = function (btn) {
      var t = qs('img', btn);
      return (t && t.getAttribute('alt')) || btn.getAttribute('data-caption') || '';
    };
    var preload = function (i) {
      var b = openers[(i + openers.length) % openers.length];
      if (b) { var im = new Image(); im.src = b.getAttribute('data-lightbox'); }
    };
    var show = function (i, dir) {
      index = (i + openers.length) % openers.length;
      var btn = openers[index];
      if (img) {
        img.src = btn.getAttribute('data-lightbox');
        img.alt = altOf(btn);
      }
      if (cap) cap.textContent = btn.getAttribute('data-caption') || altOf(btn);
      if (count) count.textContent = (index + 1) + ' / ' + openers.length;
      if (MOTION && img) {
        gsap.fromTo(img, { autoAlpha: 0, x: (dir || 0) * 40, scale: dir ? 1 : 0.96 },
          { autoAlpha: 1, x: 0, scale: 1, duration: 0.5, ease: EASE, overwrite: true });
      }
      preload(index + 1);
      preload(index - 1);
    };
    var onClosed = function () {
      document.documentElement.classList.remove('lightbox-open');
      if (opener && opener.focus) opener.focus({ preventScroll: true });
    };
    var open = function (i, btn) {
      opener = btn || null;
      show(i, 0);
      if (!dialog.open) {
        if (canModal) dialog.showModal();
        else dialog.setAttribute('open', '');
      }
      document.documentElement.classList.add('lightbox-open');
      if (MOTION) gsap.fromTo(dialog, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.35, ease: 'power2.out' });
    };
    var shut = function () {
      if (canModal) { if (dialog.open) dialog.close(); }
      else { dialog.removeAttribute('open'); onClosed(); }
    };

    dialog.addEventListener('close', onClosed);
    openers.forEach(function (btn, i) {
      btn.addEventListener('click', function (e) { e.preventDefault(); open(i, btn); });
    });
    if (prev) prev.addEventListener('click', function () { show(index - 1, -1); });
    if (next) next.addEventListener('click', function () { show(index + 1, 1); });
    if (close) close.addEventListener('click', shut);
    dialog.addEventListener('click', function (e) { if (e.target === dialog) shut(); });
    dialog.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); show(index - 1, -1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); show(index + 1, 1); }
      else if (e.key === 'Escape' && !canModal) shut();
    });
    var sx = null;
    var sy = null;
    dialog.addEventListener('touchstart', function (e) {
      var t = e.touches[0]; sx = t.clientX; sy = t.clientY;
    }, { passive: true });
    dialog.addEventListener('touchend', function (e) {
      if (sx === null) return;
      var t = e.changedTouches[0];
      var dx = t.clientX - sx;
      var dy = t.clientY - sy;
      sx = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) show(index + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
    }, { passive: true });
  }

  function initBooking() {
    var forms = qsa('form[data-booking]');
    if (!forms.length) return;
    var fmtDay = null;
    try { fmtDay = new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }); } catch (err) { fmtDay = null; }
    var listIt = function (arr) {
      if (arr.length < 2) return arr.join('');
      return arr.slice(0, -1).join(', ') + ' e ' + arr[arr.length - 1];
    };

    forms.forEach(function (form) {
      var field = function (n) { return form.elements[n] || null; };
      var giorno = field('giorno');
      var ora = field('ora');
      var persone = field('persone');
      var nome = field('nome');
      var note = field('note');
      var out = qs('[data-booking-error]', form) || qs('[data-booking-error]');
      var today = romeNow();
      if (giorno) {
        giorno.min = today.iso;
        if (!giorno.value) giorno.value = today.iso;
      }
      [giorno, ora, persone, nome].forEach(function (el) {
        if (!el) return;
        el.addEventListener('input', function () { el.removeAttribute('aria-invalid'); });
        el.addEventListener('change', function () { el.removeAttribute('aria-invalid'); });
      });

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var problems = [];
        var first = null;
        var flag = function (el, msg) {
          if (el) el.setAttribute('aria-invalid', 'true');
          if (!first) first = el;
          problems.push(msg);
        };
        [giorno, ora, persone, nome].forEach(function (el) { if (el) el.removeAttribute('aria-invalid'); });

        var now = romeNow();
        var g = giorno ? giorno.value : '';
        if (!g) flag(giorno, 'scegli il giorno');
        else if (g < now.iso) flag(giorno, 'scegli un giorno da oggi in poi');
        if (ora && !ora.value) flag(ora, 'scegli l’ora');
        var p = persone ? parseInt(persone.value, 10) : 2;
        if (!(p >= 1 && p <= 20)) flag(persone, 'indica da 1 a 20 persone');
        var n = nome ? nome.value.trim() : '';
        if (n.length < 2) flag(nome, 'scrivi il nome per la prenotazione');

        if (problems.length) {
          if (out) {
            out.textContent = 'Prima di inviare, ' + listIt(problems) + '.';
            out.setAttribute('data-state', 'error');
          }
          if (first && first.focus) first.focus();
          return;
        }

        var dayLabel = g;
        if (fmtDay) {
          var parts = g.split('-');
          var d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 12, 0, 0);
          dayLabel = fmtDay.format(d);
        }
        var lines = [
          'Ciao Casamatta, vorrei prenotare un tavolo.',
          'Giorno: ' + dayLabel,
          'Ora: ' + (ora ? ora.value : ''),
          'Persone: ' + (isFinite(p) ? p : 2),
          'Nome: ' + n
        ];
        var extra = note ? note.value.trim() : '';
        if (extra) lines.push('Note/allergie: ' + extra);
        var url = 'https://wa.me/393515386154?text=' + encodeURIComponent(lines.join('\n'));
        window.open(url, '_blank', 'noopener');
        if (out) {
          out.textContent = 'Si apre WhatsApp con il messaggio pronto.';
          out.setAttribute('data-state', 'ok');
        }
      });
    });
  }

  function initOpenNow() {
    var els = qsa('[data-open-status]');
    var rows = qsa('[data-hours] [data-dow]');
    if (!els.length && !rows.length) return;
    var update = function () {
      var now = romeNow();
      var s = openStatus(now);
      els.forEach(function (el) {
        el.textContent = s.text;
        el.setAttribute('data-state', s.open ? 'open' : 'closed');
      });
      rows.forEach(function (r) {
        var today = parseInt(r.getAttribute('data-dow'), 10) === now.dow;
        r.classList.toggle('is-today', today);
        if (today) r.setAttribute('aria-current', 'date'); else r.removeAttribute('aria-current');
      });
    };
    update();
    setInterval(update, 60000);
  }

  function initVelvet() {
    var sec = qs('[data-velvet]');
    if (!sec || !HOVER_FINE) return; // touch devices keep the CSS default sheen
    var cur = { x: 30, y: 20 };
    var target = null;
    var pending = false;
    var paint = function () {
      sec.style.setProperty('--vx', cur.x.toFixed(2) + '%');
      sec.style.setProperty('--vy', cur.y.toFixed(2) + '%');
    };
    var flush = function () {
      pending = false;
      if (!target) return;
      if (MOTION) {
        gsap.to(cur, { x: target.x, y: target.y, duration: 0.9, ease: EASE, overwrite: true, onUpdate: paint });
      } else {
        cur.x = target.x; cur.y = target.y; paint();
      }
    };
    sec.addEventListener('pointermove', function (e) {
      var r = sec.getBoundingClientRect();
      if (!r.width || !r.height) return;
      target = {
        x: Math.max(0, Math.min(100, (e.clientX - r.left) / r.width * 100)),
        y: Math.max(0, Math.min(100, (e.clientY - r.top) / r.height * 100))
      };
      if (!pending) { pending = true; raf(flush); }
    }, { passive: true });
  }

  /* ==========================================================================
     GSAP-only features (motion path)
     ========================================================================== */

  // Stroke length that fully covers a path drawn with pathLength="1",
  // whether or not the browser applies non-scaling-stroke to dashes.
  function dashFor(svg, use) {
    var k = 1;
    try {
      var vb = (svg.viewBox && svg.viewBox.baseVal && svg.viewBox.baseVal.width) ? svg.viewBox.baseVal : null;
      if (!vb) {
        var ref = (use.getAttribute('href') || use.getAttribute('xlink:href') || '').trim();
        var sym = ref ? document.querySelector(ref) : null;
        vb = (sym && sym.viewBox && sym.viewBox.baseVal && sym.viewBox.baseVal.width) ? sym.viewBox.baseVal : null;
      }
      var r = svg.getBoundingClientRect();
      if (vb && vb.width && vb.height && r.width) k = Math.max(r.width / vb.width, r.height / vb.height);
    } catch (err) { k = 1; }
    return Math.max(1, Math.min(k, 12)) * 1.05;
  }

  function initHero() {
    var hero = qs('[data-hero]');
    if (!hero || !MOTION) return;
    var arch = qs('[data-hero-arch]', hero);
    var archImg = arch ? qs('img', arch) : null;
    var plate = qs('[data-hero-plate]', hero);
    var plateImg = plate ? qs('img', plate) : null;
    var lines = qsa('[data-hero-line]', hero);
    var jump = qs('.matta .m-jump', hero);
    var flip = qs('.matta .m-flip', hero);
    var fades = qsa('[data-hero-fade]', hero);
    var ornSvgs = qsa('svg[data-draw]', hero);
    var jumpY = jump ? (parseFloat(gsap.getProperty(jump, 'y')) || 0) : 0;
    var jumpRot = jump ? (parseFloat(gsap.getProperty(jump, 'rotation')) || 0) : 0;
    var flipRot = flip ? (parseFloat(gsap.getProperty(flip, 'rotation')) || 0) : 0;
    // The a lands at its CSS resting angle after a full somersault.
    var flipEnd = flipRot > 90 ? flipRot : 360 + flipRot;

    if (arch) gsap.set(arch, { clipPath: 'inset(100% 0% 0% 0%)' });
    if (archImg) gsap.set(archImg, { scale: 1.18, transformOrigin: '50% 60%' });
    if (lines.length) gsap.set(lines, { yPercent: 110 });
    if (jump) gsap.set(jump, { y: 0, rotation: 0 });
    if (flip) gsap.set(flip, { rotation: 0, transformOrigin: '50% 70%' });
    if (plate) gsap.set(plate, { autoAlpha: 0, rotation: -60, scale: 0.7 });
    if (fades.length) gsap.set(fades, { autoAlpha: 0, y: 24 });
    var ornUses = [];
    ornSvgs.forEach(function (svg) {
      qsa('use', svg).forEach(function (u) {
        var d = dashFor(svg, u);
        gsap.set(u, { strokeDasharray: d + ' ' + d, strokeDashoffset: d });
        ornUses.push(u);
      });
    });

    var tl = gsap.timeline({ paused: true, defaults: { ease: EXPO } });
    if (arch) tl.to(arch, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4 }, 0);
    if (archImg) tl.to(archImg, { scale: 1.08, duration: 2.2 }, 0);
    if (ornUses.length) {
      tl.to(ornUses, {
        strokeDashoffset: 0, duration: 2.4, ease: 'power2.inOut', stagger: 0.2,
        onComplete: function () { gsap.set(ornUses, { clearProps: 'strokeDasharray,strokeDashoffset' }); }
      }, 0.2);
    }
    if (lines.length) tl.to(lines, { yPercent: 0, duration: 1.2, stagger: 0.08 }, 0.15);
    if (plate) tl.to(plate, { autoAlpha: 1, rotation: 0, scale: 1, duration: 1.4 }, 0.55);
    if (fades.length) tl.to(fades, { autoAlpha: 1, y: 0, duration: 1, stagger: 0.1, ease: EASE }, 0.75);
    if (jump) tl.to(jump, { y: jumpY || -8, rotation: jumpRot, duration: 0.55, ease: 'back.out(3)' }, 1.15);
    if (flip) tl.to(flip, { rotation: flipEnd, duration: 0.95, ease: 'back.out(1.5)' }, 1.2);
    if (arch) tl.set(arch, { clearProps: 'clipPath' });

    var played = false;
    heroPlay = function () { if (played) return; played = true; tl.play(); };

    // Desktop: the plate keeps turning and the photo drifts as the hero scrolls away.
    if (ST) {
      mm.add(DESKTOP_MOTION, function () {
        if (plateImg) {
          gsap.to(plateImg, {
            rotation: 90, ease: 'none',
            scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true }
          });
        }
        if (archImg) {
          gsap.to(archImg, {
            yPercent: 4, ease: 'none',
            scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true }
          });
        }
      });
    }
  }

  function initDraw() {
    if (!ST) return;
    qsa('svg[data-draw]').forEach(function (svg) {
      if (svg.closest('[data-hero]')) return; // the hero timeline draws its own
      var uses = qsa('use', svg);
      if (!uses.length) return;
      uses.forEach(function (u) {
        var d = dashFor(svg, u);
        gsap.set(u, { strokeDasharray: d + ' ' + d, strokeDashoffset: d });
      });
      gsap.to(uses, {
        strokeDashoffset: 0, duration: 2.4, ease: 'power2.inOut', stagger: 0.15,
        scrollTrigger: { trigger: svg, start: 'top 85%', once: true },
        onComplete: function () { gsap.set(uses, { clearProps: 'strokeDasharray,strokeDashoffset' }); }
      });
    });
  }

  function initWordmark() {
    if (!HOVER_FINE) return;
    qsa('[data-wordmark]').forEach(function (link) {
      var flip = qs('.wm-flip', link);
      var jump = qs('.wm-jump', link);
      if (!flip && !jump) return;
      var busy = false;
      var play = function () {
        if (busy) return;
        busy = true;
        var tl = gsap.timeline({ onComplete: function () { busy = false; } });
        if (flip) tl.to(flip, { rotation: '+=360', duration: 0.9, ease: 'back.out(1.4)', transformOrigin: '50% 50%' }, 0);
        if (jump) tl.to(jump, { y: '-=7', duration: 0.16, ease: 'power2.out', yoyo: true, repeat: 3 }, 0);
      };
      link.addEventListener('mouseenter', play);
      link.addEventListener('focus', play);
    });
  }

  function initClip() {
    if (!ST) return;
    qsa('[data-clip]').forEach(function (wrap) {
      if (wrap.closest('[data-hero]') && wrap.hasAttribute('data-hero-arch')) return;
      var img = qs('img', wrap);
      gsap.set(wrap, { clipPath: 'inset(100% 0% 0% 0%)' });
      if (img) gsap.set(img, { scale: 1.2 });
      var tl = gsap.timeline({ scrollTrigger: { trigger: wrap, start: 'top 85%', once: true } });
      tl.to(wrap, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.2, ease: EXPO }, 0);
      if (img) tl.to(img, { scale: 1, duration: 1.6, ease: EXPO }, 0);
      tl.set(wrap, { clearProps: 'clipPath' });
    });
  }

  function initParallax() {
    var els = qsa('[data-parallax]');
    if (!els.length || !ST) return;
    mm.add(DESKTOP_MOTION, function () {
      els.forEach(function (el) {
        var f = parseFloat(el.getAttribute('data-parallax'));
        if (!isFinite(f) || f === 0) f = 0.12;
        var amp = f * 50; // yPercent from -amp to +amp
        var parent = el.parentElement || el;
        gsap.fromTo(el, { yPercent: -amp }, {
          yPercent: amp, ease: 'none',
          scrollTrigger: { trigger: parent, start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true }
        });
      });
    });
  }

  function initDay() {
    if (!ST) return;
    qsa('[data-day]').forEach(function (section) {
      var track = qs('[data-day-track]', section);
      var cards = qsa('[data-day-card]', section);
      if (!track || !cards.length) return;
      var colors = cards.map(function (c) {
        return { bg: (c.getAttribute('data-bg') || '').trim(), ink: (c.getAttribute('data-ink') || '').trim() };
      });
      var n = cards.length;

      mm.add(DESKTOP_MOTION, function () {
        // The track sits inside a centred container: keep the same margin on the right at the end.
        var dist = function () {
          var x = parseFloat(gsap.getProperty(track, 'x')) || 0;
          var left = track.getBoundingClientRect().left - x;
          return Math.max(0, left * 2 + track.scrollWidth - window.innerWidth);
        };
        if (colors[0].bg) gsap.set(section, { '--day-bg': colors[0].bg, '--day-ink': colors[0].ink || 'inherit' });

        var tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: section, pin: true, start: 'top top',
            end: function () { return '+=' + Math.max(dist(), window.innerHeight * 0.6); },
            scrub: 1, invalidateOnRefresh: true, anticipatePin: 1,
            onUpdate: function (self) {
              var idx = Math.round(self.progress * (n - 1));
              cards.forEach(function (c, i) { c.classList.toggle('is-current', i === idx); });
            }
          }
        });
        tl.to(track, { x: function () { return -dist(); }, duration: 1 }, 0);
        if (n > 1) {
          for (var i = 1; i < n; i++) {
            if (!colors[i].bg) continue;
            var vars = { '--day-bg': colors[i].bg, duration: 1 / (n - 1) };
            if (colors[i].ink) vars['--day-ink'] = colors[i].ink;
            tl.to(section, vars, (i - 1) / (n - 1));
          }
        }
        cards[0].classList.add('is-current');
        return function () {
          section.style.removeProperty('--day-bg');
          section.style.removeProperty('--day-ink');
          cards.forEach(function (c) { c.classList.remove('is-current'); });
        };
      });
    });
  }

  function initSpin() {
    if (!ST) return;
    qsa('[data-spin]').forEach(function (el) {
      var sec = el.closest('section') || el.parentElement || el;
      gsap.fromTo(el, { rotation: 0 }, {
        rotation: 160, ease: 'none',
        scrollTrigger: { trigger: sec, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });
  }

  function initMarquee() {
    qsa('[data-marquee]').forEach(function (wrap) {
      var track = qs('[data-marquee-track]', wrap);
      if (!track) return;
      var speed = parseFloat(wrap.getAttribute('data-marquee-speed')) || 40;
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
          gsap.to(tween, {
            timeScale: 1 + v, duration: 0.3, overwrite: true,
            onComplete: function () { gsap.to(tween, { timeScale: 1, duration: 1.2, ease: 'power2.out', overwrite: true }); }
          });
        }
      });
    });
  }

  function initMenuPreview() {
    if (!mm) return;
    mm.add(DESKTOP_POINTER, function () {
      var items = qsa('[data-menu-item][data-img]');
      if (!items.length) return;
      var box = document.createElement('div');
      box.className = 'menu-preview';
      box.setAttribute('aria-hidden', 'true');
      box.style.position = 'fixed';
      box.style.left = '0';
      box.style.top = '0';
      box.style.pointerEvents = 'none';
      var img = document.createElement('img');
      img.alt = '';
      img.decoding = 'async';
      box.appendChild(img);
      document.body.appendChild(box);
      gsap.set(box, { x: -9999, y: -9999 });
      var xTo = gsap.quickTo(box, 'x', { duration: 0.5, ease: 'power3' });
      var yTo = gsap.quickTo(box, 'y', { duration: 0.5, ease: 'power3' });
      var visible = false;
      var last = { x: 0, y: 0 };

      var place = function (cx, cy, instant) {
        var w = box.offsetWidth || 240;
        var h = box.offsetHeight || 320;
        var x = Math.max(8, Math.min(window.innerWidth - w - 8, cx + 24));
        var y = Math.max(8, Math.min(window.innerHeight - h - 8, cy - h / 2));
        if (instant) { gsap.set(box, { x: x, y: y }); xTo(x, x); yTo(y, y); }
        else { xTo(x); yTo(y); }
      };
      var hide = function () { visible = false; box.classList.remove('is-visible'); };
      var onMove = function (e) { last.x = e.clientX; last.y = e.clientY; if (visible) place(e.clientX, e.clientY, false); };
      var enters = [];
      items.forEach(function (it) {
        var enter = function (e) {
          var src = it.getAttribute('data-img');
          if (!src) return;
          if (img.getAttribute('src') !== src) img.setAttribute('src', src);
          img.alt = it.getAttribute('data-img-alt') || '';
          var first = !visible;
          visible = true;
          box.classList.add('is-visible');
          place(e.clientX, e.clientY, first);
        };
        it.addEventListener('pointerenter', enter);
        it.addEventListener('pointerleave', hide);
        enters.push([it, enter]);
      });
      document.addEventListener('pointermove', onMove, { passive: true });
      window.addEventListener('scroll', hide, { passive: true });
      return function () {
        enters.forEach(function (pair) { pair[0].removeEventListener('pointerenter', pair[1]); pair[0].removeEventListener('pointerleave', hide); });
        document.removeEventListener('pointermove', onMove);
        window.removeEventListener('scroll', hide);
        if (box.parentNode) box.parentNode.removeChild(box);
      };
    });
  }

  function initTilt() {
    var els = qsa('[data-tilt]');
    if (!els.length || !HOVER_FINE) return;
    mm.add(DESKTOP_MOTION, function () {
      var cleanups = [];
      els.forEach(function (el) {
        var MAX = 6;
        gsap.set(el, { transformPerspective: 900, transformOrigin: 'center center' });
        var move = function (e) {
          var r = el.getBoundingClientRect();
          var px = (e.clientX - r.left) / r.width - 0.5;
          var py = (e.clientY - r.top) / r.height - 0.5;
          gsap.to(el, { rotateX: -py * MAX * 2, rotateY: px * MAX * 2, duration: 0.5, ease: 'power2.out', overwrite: 'auto' });
          el.style.setProperty('--tx', ((px + 0.5) * 100).toFixed(1) + '%');
          el.style.setProperty('--ty', ((py + 0.5) * 100).toFixed(1) + '%');
        };
        var leave = function () { gsap.to(el, { rotateX: 0, rotateY: 0, duration: 0.9, ease: EASE, overwrite: 'auto' }); };
        el.addEventListener('mousemove', move);
        el.addEventListener('mouseleave', leave);
        cleanups.push(function () {
          el.removeEventListener('mousemove', move);
          el.removeEventListener('mouseleave', leave);
          gsap.set(el, { clearProps: 'transform' });
        });
      });
      return function () { cleanups.forEach(function (fn) { fn(); }); };
    });
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
  }

  /* ---------- boot ---------- */
  onReady(function () {
    // Practical features first: they work with or without GSAP and with reduced motion.
    safe('nav', initNav);
    safe('mobilebar', initMobilebar);
    safe('anchors', initAnchors);
    safe('tabs', initTabs);
    safe('lightbox', initLightbox);
    safe('booking', initBooking);
    safe('openNow', initOpenNow);
    safe('materials', initMaterials);
    safe('velvet', initVelvet);

    if (MOTION) {
      // In page order where it matters; ScrollTrigger.sort() fixes the rest.
      safe('hero', initHero);
      safe('clip', initClip);
      safe('draw', initDraw);
      safe('parallax', initParallax);
      safe('day', initDay);
      safe('spin', initSpin);
      safe('marquee', initMarquee);
      safe('menuPreview', initMenuPreview);
      safe('wordmark', initWordmark);
      safe('tilt', initTilt);
    }
    safe('refresh', initRefresh);
    safe('preloader', initPreloader); // last: it starts the hero timeline
    if (ST && MOTION) safe('sort', function () { ST.sort(); ST.refresh(); });

    window.__casamatta = {
      refresh: function () { if (ST) ST.refresh(); },
      status: function () { return openStatus(romeNow()); }
    };
  });
})();
