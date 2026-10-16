(function () {
  'use strict';

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- year ---------- */
  var yr = document.getElementById('yr');
  if (yr) yr.textContent = new Date().getFullYear();

  /* ---------- mobile menu ---------- */
  var mb = document.getElementById('menuBtn'), nv = document.getElementById('nav');
  if (mb && nv) {
    mb.addEventListener('click', function () {
      var open = nv.classList.toggle('open');
      mb.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  /* ---------- scroll progress ---------- */
  var bar = document.querySelector('.progress');
  if (bar) {
    var tick = function () {
      var de = document.documentElement;
      var max = de.scrollHeight - de.clientHeight;
      bar.style.width = (max > 0 ? (de.scrollTop || document.body.scrollTop) / max * 100 : 0) + '%';
    };
    window.addEventListener('scroll', tick, { passive: true });
    window.addEventListener('resize', tick);
    tick();
  }

  spines();
  parallax();
  cards();

  /* ---------- reveal on scroll ---------- */
  var targets = document.querySelectorAll('.rv');
  if (!targets.length) return;

  if (reduce || !('IntersectionObserver' in window)) {
    Array.prototype.forEach.call(targets, function (el) { el.classList.add('is-in'); });
    runGauge(true);
    return;
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      io.unobserve(e.target);
      if (e.target.classList.contains('gauge-host')) runGauge(false);
      if (e.target.classList.contains('countup')) count(e.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });

  Array.prototype.forEach.call(targets, function (el) { io.observe(el); });

  /* ---------- the points gauge ---------- */
  function runGauge(instant) {
    var g = document.querySelector('.gauge');
    if (!g || g.dataset.done) return;
    g.dataset.done = '1';

    var fill = g.querySelector('.fill');
    var needle = g.querySelector('.needle');
    var readout = g.querySelector('.readout');
    var target = parseFloat(g.dataset.points || '11');
    var max = parseFloat(g.dataset.max || '11');
    var len = parseFloat(fill.dataset.len);
    var frac = Math.min(target / max, 1);

    // One loop drives the arc, the needle and the number, so they cannot drift
    // apart and nothing depends on a CSS transition firing on an SVG child.
    var paint = function (f) {
      fill.style.strokeDashoffset = len * (1 - f);
      needle.style.transform = 'rotate(' + (-135 + 270 * f) + 'deg)';
      if (readout) readout.textContent = Math.round(target * (f / (frac || 1)));
    };

    if (instant) { paint(frac); if (readout) readout.textContent = target; return; }

    paint(0);
    var t0 = null, dur = 1600;
    var step = function (ts) {
      if (t0 === null) t0 = ts;
      var p = Math.min((ts - t0) / dur, 1);
      paint(frac * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
      else if (readout) readout.textContent = target;
    };
    requestAnimationFrame(step);
  }

  /* ---------- the filling spine, and the step dots lighting as you pass ---------- */
  function spines() {
    var all = Array.prototype.slice.call(document.querySelectorAll('.spine'));
    if (!all.length) return;
    all.forEach(function (sp) {
      if (!sp.querySelector('.fillbar')) {
        var f = document.createElement('span');
        f.className = 'fillbar';
        sp.insertBefore(f, sp.firstChild);
      }
    });
    if (reduce) {
      all.forEach(function (sp) {
        sp.querySelector('.fillbar').style.height = '100%';
        sp.querySelectorAll('.step').forEach(function (s) { s.classList.add('lit'); });
      });
      return;
    }
    var frame = null;
    var draw = function () {
      frame = null;
      var vh = window.innerHeight;
      all.forEach(function (sp) {
        var r = sp.getBoundingClientRect();
        var line = vh * 0.55;                       // the reading line, a little above centre
        var p = (line - r.top) / (r.height || 1);
        p = Math.max(0, Math.min(1, p));
        sp.querySelector('.fillbar').style.height = (p * 100) + '%';
        sp.querySelectorAll('.step').forEach(function (step) {
          var d = step.getBoundingClientRect();
          step.classList.toggle('lit', d.top < line);
        });
      });
    };
    var onScroll = function () { if (frame === null) frame = requestAnimationFrame(draw); };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    draw();
  }

  /* ---------- parallax, transform only, and never on a reduced motion setting ---------- */
  function parallax() {
    var els = Array.prototype.slice.call(document.querySelectorAll('.plx'));
    if (!els.length || reduce) return;
    var frame = null;
    var draw = function () {
      frame = null;
      var vh = window.innerHeight;
      els.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        var depth = parseFloat(el.dataset.depth || '0.06');
        var centre = r.top + r.height / 2 - vh / 2;
        el.style.transform = 'translate3d(0,' + (-centre * depth).toFixed(2) + 'px,0)';
      });
    };
    var onScroll = function () { if (frame === null) frame = requestAnimationFrame(draw); };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    draw();
  }

  /* ---------- cards follow the pointer, and ignore it on touch ---------- */
  function cards() {
    if (!window.matchMedia || !window.matchMedia('(hover: hover)').matches) return;
    document.querySelectorAll('.fcard').forEach(function (c) {
      c.addEventListener('pointermove', function (e) {
        var r = c.getBoundingClientRect();
        c.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        c.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
  }

  /* ---------- number count up ---------- */
  function count(el) {
    var node = el.querySelector('[data-to]');
    if (!node || node.dataset.done) return;
    node.dataset.done = '1';
    var to = parseFloat(node.dataset.to);
    var suffix = node.dataset.suffix || '';
    if (reduce) { node.textContent = to + suffix; return; }
    var t0 = null, dur = 1100;
    var step = function (ts) {
      if (t0 === null) t0 = ts;
      var p = Math.min((ts - t0) / dur, 1);
      node.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))) + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
})();
