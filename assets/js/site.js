/* Manvith Belame Yogesh: site interactions. Vanilla JS, no dependencies. */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var toArray = function (list) { return Array.prototype.slice.call(list); };
  var SVG_NS = 'http://www.w3.org/2000/svg';

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

  /* ---------- Roving-tabindex tabs (used by the DAG view switcher and the task nodes) ---------- */
  function makeTabs(tabs, onSelect) {
    function select(tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        var panel = document.getElementById(t.getAttribute('aria-controls'));
        if (panel) panel.hidden = !on;
      });
      if (focus) tab.focus();
      if (onSelect) onSelect(tab);
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
  }

  /* ---------- Airflow-style career DAG ---------- */
  var dag = document.querySelector('.dag');
  if (dag) {
    var graph = dag.querySelector('.dag-graph');
    var svg = dag.querySelector('.dag-edges');
    var tasks = toArray(dag.querySelectorAll('.task'));
    var runBtn = dag.querySelector('.dag-run');
    var byTask = {};
    tasks.forEach(function (t) { byTask[t.getAttribute('data-task')] = t; });

    var edges = graph.getAttribute('data-edges').trim().split(/\s+/).map(function (pair) {
      var p = pair.split('>');
      var path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('class', 'edge');
      path.setAttribute('marker-end', 'url(#arrow)');
      svg.appendChild(path);
      return { from: p[0], to: p[1], el: path };
    });

    // Draw edges from real node positions so the same code handles the wide
    // (left→right) layout and the stacked (top→bottom) mobile layout.
    function drawEdges() {
      var box = graph.getBoundingClientRect();
      var vertical = window.matchMedia('(max-width: 1023px)').matches;
      edges.forEach(function (e) {
        var a = byTask[e.from].getBoundingClientRect();
        var b = byTask[e.to].getBoundingClientRect();
        var d;
        if (vertical) {
          var ax = a.left - box.left + 22, ay = a.bottom - box.top;
          var bx = b.left - box.left + 22, by = b.top - box.top - 2;
          var my = (by - ay) / 2;
          d = 'M' + ax + ' ' + ay + ' C' + ax + ' ' + (ay + my) + ' ' + bx + ' ' + (by - my) + ' ' + bx + ' ' + by;
        } else {
          var sx = a.right - box.left, sy = a.top + a.height / 2 - box.top;
          var ex = b.left - box.left - 2, ey = b.top + b.height / 2 - box.top;
          var mx = (ex - sx) / 2;
          d = 'M' + sx + ' ' + sy + ' C' + (sx + mx) + ' ' + sy + ' ' + (ex - mx) + ' ' + ey + ' ' + ex + ' ' + ey;
        }
        e.el.setAttribute('d', d);
      });
    }
    drawEdges();
    if ('ResizeObserver' in window) new ResizeObserver(drawEdges).observe(graph);
    else window.addEventListener('resize', drawEdges);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawEdges);

    function setEdges(doneSet) {
      edges.forEach(function (e) {
        var on = !!doneSet[e.from];
        e.el.classList.toggle('is-on', on);
        e.el.setAttribute('marker-end', on ? 'url(#arrow-on)' : 'url(#arrow)');
      });
    }

    makeTabs(tasks);

    // Tasks are listed in topological order, so running them in DOM order respects dependencies.
    var timers = [];
    function run() {
      timers.forEach(clearTimeout);
      timers = [];
      var done = {};
      if (reduceMotion) {
        tasks.forEach(function (t) { t.classList.add('is-success'); done[t.getAttribute('data-task')] = true; });
        setEdges(done);
        return;
      }
      tasks.forEach(function (t) { t.classList.remove('is-running', 'is-success'); });
      setEdges(done);
      if (runBtn) runBtn.disabled = true;

      var step = 480;
      tasks.forEach(function (t, i) {
        timers.push(setTimeout(function () { t.classList.add('is-running'); }, i * step));
        timers.push(setTimeout(function () {
          t.classList.remove('is-running');
          t.classList.add('is-success');
          done[t.getAttribute('data-task')] = true;
          setEdges(done);
          if (i === tasks.length - 1 && runBtn) runBtn.disabled = false;
        }, i * step + step * 0.85));
      });
    }
    if (runBtn) runBtn.addEventListener('click', function () {
      showView(dag.querySelector('#view-graph-tab'));
      run();
    });

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) { run(); io.disconnect(); }
      }, { threshold: 0.3 });
      io.observe(graph);
    } else {
      run();
    }

    // Graph / Code view switcher
    var viewTabs = toArray(dag.querySelectorAll('.view-tab'));
    function showView(tab) {
      viewTabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
      });
      if (tab.id === 'view-graph-tab') drawEdges();
    }
    makeTabs(viewTabs, function (tab) { if (tab.id === 'view-graph-tab') drawEdges(); });

    // Tiny Python highlighter for the Code view (runs on already-escaped HTML)
    var code = dag.querySelector('.code code');
    if (code) {
      var kw = /\b(from|import|with|as|True|False|None)\b/;
      var re = /(#[^\n]*)|("(?:[^"\\]|\\.)*")|(&gt;&gt;)|\b(\d+(?:\.\d+)?)\b|\b(from|import|with|as|True|False|None)\b|\b([A-Za-z_]\w*)(?=\()/g;
      code.innerHTML = code.innerHTML.replace(re, function (m, com, str, op, num, k, fn) {
        if (com) return '<span class="tk-com">' + com + '</span>';
        if (str) return '<span class="tk-str">' + str + '</span>';
        if (op) return '<span class="tk-op">' + op + '</span>';
        if (num) return '<span class="tk-num">' + num + '</span>';
        if (k && kw.test(k)) return '<span class="tk-kw">' + k + '</span>';
        if (fn) return '<span class="tk-fn">' + fn + '</span>';
        return m;
      });
    }
  }

  /* ---------- Avatar: eyes follow the cursor ---------- */
  var avatar = document.querySelector('.avatar');
  if (avatar && !reduceMotion && window.matchMedia('(hover: hover)').matches) {
    var pupils = toArray(avatar.querySelectorAll('.av-pupil'));
    var pending = false, px = 0, py = 0;
    window.addEventListener('pointermove', function (e) {
      px = e.clientX; py = e.clientY;
      if (pending) return;
      pending = true;
      requestAnimationFrame(function () {
        pending = false;
        var r = avatar.getBoundingClientRect();
        var cx = r.left + r.width / 2, cy = r.top + r.height * 0.36;
        var dx = px - cx, dy = py - cy;
        var dist = Math.sqrt(dx * dx + dy * dy) || 1;
        var k = Math.min(dist / 300, 1);
        var tx = (dx / dist) * 3.2 * k, ty = (dy / dist) * 2 * k;
        pupils.forEach(function (p) { p.style.transform = 'translate(' + tx + 'px,' + ty + 'px)'; });
      });
    }, { passive: true });
  }

  /* ---------- Project filters ---------- */
  var chips = toArray(document.querySelectorAll('.filters .chip'));
  var projects = toArray(document.querySelectorAll('.project'));
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
  var navLinks = toArray(document.querySelectorAll('.site-nav a'));
  if ('IntersectionObserver' in window && navLinks.length) {
    var byId = {};
    navLinks.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });
    function mark(link) {
      navLinks.forEach(function (a) { a.classList.remove('is-current'); });
      if (link) link.classList.add('is-current');
    }
    var navIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) mark(byId[e.target.id]); });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(byId).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) navIo.observe(el);
    });
    // the last section is too short to reach the viewport midline, so mark it at the page bottom
    window.addEventListener('scroll', function () {
      if (window.innerHeight + window.scrollY >= root.scrollHeight - 4) mark(navLinks[navLinks.length - 1]);
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
    toArray(items).forEach(function (el) {
      el.classList.add('reveal');
      revealIo.observe(el);
    });
  }

  /* ---------- Footer year ---------- */
  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
})();
