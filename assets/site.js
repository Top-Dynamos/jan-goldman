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
