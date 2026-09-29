/* Manvith Belame Yogesh: site interactions. Vanilla JS, no dependencies. */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Theme toggle ---------- */
  var toggle = document.querySelector('.theme-toggle');
  function currentTheme() {
    var set = root.getAttribute('data-theme');
    if (set) return set;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  if (toggle) {
    toggle.addEventListener('click', function () {
      var next = currentTheme() === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) {}
    });
  }

  /* ---------- Career DAG ---------- */
  var dag = document.querySelector('.dag');
  if (dag) {
    var tabs = Array.prototype.slice.call(dag.querySelectorAll('.stage'));
    var pipes = Array.prototype.slice.call(dag.querySelectorAll('.pipe'));
    var runBtn = dag.querySelector('.dag-run');
    var timers = [];

    function select(tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        var panel = document.getElementById(t.getAttribute('aria-controls'));
        if (panel) panel.hidden = !on;
      });
      if (focus) tab.focus();
    }

    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { select(tab, false); });
      tab.addEventListener('keydown', function (e) {
        var next = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = tabs[(i + 1) % tabs.length];
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = tabs[(i - 1 + tabs.length) % tabs.length];
        else if (e.key === 'Home') next = tabs[0];
        else if (e.key === 'End') next = tabs[tabs.length - 1];
        if (next) { e.preventDefault(); select(next, true); }
      });
    });

    function settle() {
      tabs.forEach(function (t) { t.classList.remove('is-running'); t.classList.add('is-success'); });
      pipes.forEach(function (p) { p.classList.add('is-on'); });
    }

    // Airflow-style run: each task goes queued → running → success, then data flows downstream.
    function run() {
      timers.forEach(clearTimeout);
      timers = [];
      if (reduceMotion) { settle(); return; }

      tabs.forEach(function (t) { t.classList.remove('is-running', 'is-success'); });
      pipes.forEach(function (p) { p.classList.remove('is-on'); });
      if (runBtn) runBtn.disabled = true;

      var step = 520;
      tabs.forEach(function (t, i) {
        timers.push(setTimeout(function () {
          t.classList.add('is-running');
        }, i * step));
        timers.push(setTimeout(function () {
          t.classList.remove('is-running');
          t.classList.add('is-success');
          if (pipes[i]) pipes[i].classList.add('is-on');
          if (i === tabs.length - 1 && runBtn) runBtn.disabled = false;
        }, i * step + step * 0.8));
      });
    }

    if (runBtn) runBtn.addEventListener('click', run);

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) { run(); io.disconnect(); }
      }, { threshold: 0.35 });
      io.observe(dag);
    } else {
      settle();
    }
  }

  /* ---------- Project filters ---------- */
  var chips = Array.prototype.slice.call(document.querySelectorAll('.filters .chip'));
  var projects = Array.prototype.slice.call(document.querySelectorAll('.project'));
  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      var f = chip.getAttribute('data-filter');
      chips.forEach(function (c) {
        var on = c === chip;
        c.classList.toggle('is-active', on);
        c.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      projects.forEach(function (p) {
        var tags = (p.getAttribute('data-tags') || '').split(/\s+/);
        p.classList.toggle('is-hidden', f !== 'all' && tags.indexOf(f) === -1);
      });
    });
  });

  /* ---------- Current section in nav ---------- */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.site-nav a'));
  if ('IntersectionObserver' in window && navLinks.length) {
    var byId = {};
    navLinks.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });
    var navIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        navLinks.forEach(function (a) { a.classList.remove('is-current'); });
        var link = byId[e.target.id];
        if (link) link.classList.add('is-current');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(byId).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) navIo.observe(el);
    });
    // the last section is too short to reach the viewport midline, so mark it at the page bottom
    window.addEventListener('scroll', function () {
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
        navLinks.forEach(function (a) { a.classList.remove('is-current'); });
        navLinks[navLinks.length - 1].classList.add('is-current');
      }
    }, { passive: true });
  }

  /* ---------- Scroll reveal ---------- */
  if ('IntersectionObserver' in window && !reduceMotion) {
    var items = document.querySelectorAll('.section-head, .stack-group, .project, .quote, .certs li');
    var revealIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-visible'); revealIo.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    Array.prototype.forEach.call(items, function (el) {
      el.classList.add('reveal');
      revealIo.observe(el);
    });
  }

  /* ---------- Footer year ---------- */
  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
})();
