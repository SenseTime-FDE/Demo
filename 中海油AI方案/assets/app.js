/* 中海油 × 商汤 · 共享脚本 —— 导航 / 滚动揭示 / 交互工具 */
(function () {
  'use strict';

  /* ---- mobile nav toggle ---- */
  function initNav() {
    var toggle = document.querySelector('.nav-toggle');
    var links = document.querySelector('.nav-links');
    if (toggle && links) {
      toggle.addEventListener('click', function () {
        links.classList.toggle('open');
      });
      links.querySelectorAll('a').forEach(function (a) {
        a.addEventListener('click', function () { links.classList.remove('open'); });
      });
    }
  }

  /* ---- scroll reveal ---- */
  function initReveal() {
    var els = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window) || !els.length) {
      els.forEach(function (e) { e.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    els.forEach(function (e, i) {
      e.style.transitionDelay = ((i % 4) * 70) + 'ms';
      io.observe(e);
    });
  }

  /* ---- count-up numbers ---- */
  function initCounters() {
    var nums = document.querySelectorAll('[data-count]');
    if (!nums.length) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target, target = parseFloat(el.dataset.count),
            suffix = el.dataset.suffix || '', dec = (el.dataset.dec ? parseInt(el.dataset.dec) : 0),
            t0 = null, dur = 1200;
        function step(ts) {
          if (!t0) t0 = ts;
          var p = Math.min((ts - t0) / dur, 1), e = 1 - Math.pow(1 - p, 3);
          el.textContent = (target * e).toFixed(dec) + suffix;
          if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
        io.unobserve(el);
      });
    }, { threshold: 0.5 });
    nums.forEach(function (n) { io.observe(n); });
  }

  /* ---- expose small helper for demos: typewriter ---- */
  window.CNOOC = window.CNOOC || {};
  window.CNOOC.type = function (el, text, speed, done) {
    speed = speed || 22; var i = 0; el.textContent = '';
    (function tick() {
      if (i <= text.length) { el.textContent = text.slice(0, i); i++; setTimeout(tick, speed); }
      else if (done) done();
    })();
  };

  document.addEventListener('DOMContentLoaded', function () {
    initNav(); initReveal(); initCounters();
  });
})();
