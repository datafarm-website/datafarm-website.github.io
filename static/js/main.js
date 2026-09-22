/* DATAFARM project page: charts, scroll-spy, copy. No dependencies. */
(function () {
  'use strict';

  var css = getComputedStyle(document.documentElement);
  function v(name) { return css.getPropertyValue(name).trim(); }
  var NS = 'http://www.w3.org/2000/svg';

  // Series follow the entity: the same approach always has the same color.
  var SERIES = {
    pre:   { label: 'π0.5-DROID (pretrained)', color: v('--s-pre') },
    raw:   { label: 'Raw TAMP',                color: v('--s-raw') },
    ours:  { label: 'DATAFARM',                color: v('--s-ours') },
    human: { label: 'Human teleop (oracle)',   color: v('--s-human') }
  };

  var TASKS = ['Geometric Constraints', 'Multi-Step Reasoning', 'Semantic Reasoning', 'Average'];

  function avg(a) { return Math.round((a[0] + a[1] + a[2]) / 3 * 10) / 10; }
  function withAvg(a) { return a.concat([avg(a)]); }

  // Table I
  var MAIN = {
    succ: { pre: withAvg([0, 0, 5]),   raw: withAvg([5, 5, 15]),   ours: withAvg([65, 35, 70]), human: withAvg([50, 45, 90]) },
    prog: { pre: withAvg([18, 13, 50]), raw: withAvg([35, 37, 58]), ours: withAvg([84, 81, 89]), human: withAvg([93, 90, 98]) }
  };

  var ABL_SERIES = {
    style: { label: 'w/o style',       color: '#a2748f' },
    timing:{ label: 'w/o timing',      color: '#b58b2a' },
    joint: { label: 'w/o joint space', color: '#7e9b6f' },
    ours:  { label: 'DATAFARM (full)', color: SERIES.ours.color }
  };
  var ABL = {
    succ: { style: withAvg([10, 0, 35]), timing: withAvg([0, 0, 0]),    joint: withAvg([35, 15, 20]), ours: withAvg([65, 35, 70]) },
    prog: { style: withAvg([39, 31, 54]), timing: withAvg([19, 18, 29]), joint: withAvg([73, 53, 66]), ours: withAvg([84, 81, 89]) }
  };

  // OOD retention on Deformable Object Manipulation, per fine-tuning task
  var RET_CATS = ['Geometric', 'Multi-Step', 'Semantic', 'Average'];
  var RET = { raw: withAvg([85, 70, 75]), ours: withAvg([80, 85, 90]), human: withAvg([95, 95, 95]) };

  // Table II
  var BUDGET = { x: [0, 20, 40, 60, 80], succ: [0, 65, 75, 75, 85], prog: [18, 84, 90, 94, 97] };

  function el(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function fmt(x) { return (Math.round(x * 10) / 10) + '%'; }

  function legend(id, keys, map) {
    var box = document.getElementById(id);
    box.innerHTML = '';
    keys.forEach(function (k) {
      var s = document.createElement('span');
      s.innerHTML = '<i style="background:' + map[k].color + '"></i>' + map[k].label;
      box.appendChild(s);
    });
  }

  // ---------- tooltip ----------
  function tooltip(container) {
    var t = document.createElement('div');
    t.className = 'tip';
    container.appendChild(t);
    return {
      show: function (x, y, html) { t.innerHTML = html; t.style.left = x + 'px'; t.style.top = y + 'px'; t.classList.add('show'); },
      hide: function () { t.classList.remove('show'); }
    };
  }

  // Plain rectangle, flush to the baseline.
  function barPath(x, y, w, h) {
    if (h <= 0) return '';
    return 'M' + x + ',' + (y + h) + 'V' + y + 'H' + (x + w) + 'V' + (y + h) + 'Z';
  }

  // ---------- grouped bar chart ----------
  function groupedBars(container, opts) {
    var tip = tooltip(container);
    var svg = null;

    function draw() {
      if (svg) svg.remove();
      var W = Math.max(container.clientWidth, 280);
      var narrow = W < 560;
      var H = opts.height || (narrow ? 280 : 320);
      var m = { t: 22, r: 1, b: narrow ? 44 : 34, l: 34 };
      var iw = W - m.l - m.r, ih = H - m.t - m.b;
      var cats = opts.cats, keys = opts.keys, data = opts.data();
      var gw = iw / cats.length;
      var pad = Math.max(10, gw * (narrow ? 0.12 : 0.18));
      var gap = 2;
      var bw = Math.max(4, (gw - 2 * pad - gap * (keys.length - 1)) / keys.length);
      var y = function (val) { return m.t + ih - (val / 100) * ih; };

      svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img', 'aria-label': opts.aria });
      container.insertBefore(svg, container.firstChild);

      [0, 25, 50, 75, 100].forEach(function (tk) {
        el('line', { x1: m.l, x2: W - m.r, y1: y(tk), y2: y(tk), class: tk === 0 ? 'baseline' : 'gridline' }, svg);
        var tx = el('text', { x: m.l - 6, y: y(tk) + 4, 'text-anchor': 'end', class: 'tick' }, svg);
        tx.textContent = tk + '%';
      });

      var refEl = null;
      if (opts.refLine != null) {
        refEl = el('line', { x1: m.l, x2: W - m.r, y1: y(opts.refLine), y2: y(opts.refLine), stroke: v('--ink-2'), 'stroke-width': 1.5, 'stroke-dasharray': '5 4' }, svg);
      }

      var bars = [];
      cats.forEach(function (c, ci) {
        var gx = m.l + ci * gw;
        if (ci === cats.length - 1 && opts.avgDivider) {
          el('line', { x1: gx, x2: gx, y1: m.t, y2: m.t + ih, class: 'gridline', 'stroke-dasharray': '3 3' }, svg);
        }
        keys.forEach(function (k, ki) {
          var val = data[k][ci];
          var bx = gx + pad + ki * (bw + gap);
          var p = el('path', { d: barPath(bx, y(val), bw, m.t + ih - y(val)), fill: opts.series[k].color, class: 'bar' }, svg);
          bars.push({ p: p, ci: ci });
          if (opts.labelKeys && opts.labelKeys.indexOf(k) >= 0 && !narrow) {
            var lt = el('text', { x: bx + bw / 2, y: y(val) - 5, 'text-anchor': 'middle', class: 'val' }, svg);
            lt.textContent = fmt(val);
          }
        });
        var label = narrow && opts.shortCats ? opts.shortCats[ci] : c;
        var words = narrow ? label.split(' ') : [label];
        words.forEach(function (w, wi) {
          var ct = el('text', { x: gx + gw / 2, y: m.t + ih + 18 + wi * 14, 'text-anchor': 'middle', class: 'cat' }, svg);
          ct.textContent = w;
        });

        // Hit target covers the whole group; tooltip lists every series.
        var hit = el('rect', { x: gx, y: m.t, width: gw, height: ih, class: 'hit' }, svg);
        function over() {
          container.classList.add('dim');
          bars.forEach(function (b) { b.p.classList.toggle('on', b.ci === ci); });
          var html = '<div class="t">' + c + '</div>' + keys.map(function (k) {
            return '<div class="r"><span><i style="background:' + opts.series[k].color + '"></i>' + opts.series[k].label + '</span><span>' + fmt(data[k][ci]) + '</span></div>';
          }).join('');
          var topVal = Math.max.apply(null, keys.map(function (k) { return data[k][ci]; }));
          tip.show(gx + gw / 2, y(topVal) - 4, html);
        }
        function out() { container.classList.remove('dim'); tip.hide(); }
        hit.addEventListener('mouseenter', over);
        hit.addEventListener('mouseleave', out);
        hit.addEventListener('touchstart', over, { passive: true });
      });
      // reference line sits above the bars
      if (refEl) svg.insertBefore(refEl, null);
      svg.addEventListener('mouseleave', function () { container.classList.remove('dim'); tip.hide(); });
    }

    draw();
    return { draw: draw };
  }

  // ---------- line chart with crosshair ----------
  function lineChart(container) {
    var tip = tooltip(container);
    var svg = null;
    var lines = [
      { key: 'succ', label: 'Success rate', color: SERIES.ours.color, dash: null },
      { key: 'prog', label: 'Task progress', color: '#6f7a85', dash: '6 4' }
    ];
    legend('legend-budget', ['succ', 'prog'], { succ: lines[0], prog: lines[1] });
    // make the legend swatch for progress read as dashed
    var sw = document.querySelectorAll('#legend-budget i');
    if (sw[1]) { sw[1].style.background = 'repeating-linear-gradient(90deg,' + lines[1].color + ' 0 4px,transparent 4px 6px)'; sw[1].style.height = '3px'; sw[1].style.width = '16px'; }
    if (sw[0]) { sw[0].style.height = '3px'; sw[0].style.width = '16px'; }

    function draw() {
      if (svg) svg.remove();
      var W = Math.max(container.clientWidth, 260);
      var H = 280;
      var m = { t: 22, r: 1, b: 40, l: 38 };
      var iw = W - m.l - m.r, ih = H - m.t - m.b;
      // keep the last point's marker inside the right edge
      var x = function (d) { return m.l + (d / 80) * (iw - 5); };
      var y = function (val) { return m.t + ih - (val / 100) * ih; };
      svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img', 'aria-label': 'Success and progress vs. number of DATAFARM demonstrations' });
      container.insertBefore(svg, container.firstChild);

      [0, 25, 50, 75, 100].forEach(function (tk) {
        el('line', { x1: m.l, x2: W - m.r, y1: y(tk), y2: y(tk), class: tk === 0 ? 'baseline' : 'gridline' }, svg);
        el('text', { x: m.l - 6, y: y(tk) + 4, 'text-anchor': 'end', class: 'tick' }, svg).textContent = tk + '%';
      });
      BUDGET.x.forEach(function (d) {
        el('text', { x: x(d), y: m.t + ih + 18, 'text-anchor': 'middle', class: 'tick' }, svg).textContent = d;
      });
      el('text', { x: m.l + iw / 2, y: H - 4, 'text-anchor': 'middle', class: 'tick' }, svg).textContent = 'Number of DATAFARM demonstrations';

      var cross = el('line', { y1: m.t, y2: m.t + ih, stroke: v('--axis'), 'stroke-width': 1, opacity: 0 }, svg);

      lines.forEach(function (L) {
        var d = BUDGET.x.map(function (xx, i) { return (i ? 'L' : 'M') + x(xx) + ',' + y(BUDGET[L.key][i]); }).join('');
        var a = { d: d, fill: 'none', stroke: L.color, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' };
        if (L.dash) a['stroke-dasharray'] = L.dash;
        el('path', a, svg);
        BUDGET.x.forEach(function (xx, i) {
          el('circle', { cx: x(xx), cy: y(BUDGET[L.key][i]), r: 4, fill: L.color, stroke: '#fff', 'stroke-width': 2 }, svg);
        });
      });
      // direct labels on the final point
      el('text', { x: x(80) - 6, y: y(85) + 16, 'text-anchor': 'end', class: 'val' }, svg).textContent = '85%';
      el('text', { x: x(80) - 6, y: y(97) - 8, 'text-anchor': 'end', class: 'val' }, svg).textContent = '97%';

      var hit = el('rect', { x: m.l, y: m.t, width: iw, height: ih, class: 'hit' }, svg);
      function move(clientX) {
        var r = svg.getBoundingClientRect();
        var px = (clientX - r.left) * (W / r.width);
        var best = 0;
        BUDGET.x.forEach(function (d, i) { if (Math.abs(x(d) - px) < Math.abs(x(BUDGET.x[best]) - px)) best = i; });
        var cx = x(BUDGET.x[best]);
        cross.setAttribute('x1', cx); cross.setAttribute('x2', cx); cross.setAttribute('opacity', 1);
        var html = '<div class="t">' + BUDGET.x[best] + ' demonstrations' + (best === 0 ? ' (pretrained)' : '') + '</div>' +
          lines.map(function (L) { return '<div class="r"><span><i style="background:' + L.color + '"></i>' + L.label + '</span><span>' + BUDGET[L.key][best] + '%</span></div>'; }).join('');
        var tx = Math.min(Math.max(cx, 90), W - 90);
        tip.show(tx, y(BUDGET.prog[best]) - 6, html);
      }
      hit.addEventListener('mousemove', function (e) { move(e.clientX); });
      hit.addEventListener('touchstart', function (e) { move(e.touches[0].clientX); }, { passive: true });
      hit.addEventListener('mouseleave', function () { cross.setAttribute('opacity', 0); tip.hide(); });
    }
    draw();
    return { draw: draw };
  }

  // ---------- mount charts ----------
  var charts = [];
  var state = { main: 'succ', abl: 'succ' };
  var mainKeys = ['pre', 'raw', 'ours', 'human'];
  var ablKeys = ['style', 'timing', 'joint', 'ours'];

  legend('legend-main', mainKeys, SERIES);
  charts.push(groupedBars(document.getElementById('chart-main'), {
    cats: TASKS, shortCats: ['Geometric', 'Multi-Step', 'Semantic', 'Average'],
    keys: mainKeys, series: SERIES, labelKeys: ['ours'], avgDivider: true,
    aria: 'Success rate and task progress for task-specific fine-tuning',
    data: function () { return MAIN[state.main]; }
  }));

  legend('legend-abl', ablKeys, ABL_SERIES);
  charts.push(groupedBars(document.getElementById('chart-abl'), {
    cats: TASKS, shortCats: ['Geometric', 'Multi-Step', 'Semantic', 'Average'],
    keys: ablKeys, series: ABL_SERIES, labelKeys: ['ours'], avgDivider: true,
    aria: 'Ablation results',
    data: function () { return ABL[state.abl]; }
  }));

  var retKeys = ['raw', 'ours', 'human'];
  legend('legend-ret', retKeys, SERIES);
  var refLeg = document.createElement('span');
  refLeg.innerHTML = '<i style="background:repeating-linear-gradient(90deg,' + v('--ink-2') + ' 0 5px,transparent 5px 8px);height:2px;width:18px;border-radius:0"></i>π0.5-DROID before fine-tuning (90%)';
  document.getElementById('legend-ret').appendChild(refLeg);
  charts.push(groupedBars(document.getElementById('chart-ret'), {
    cats: RET_CATS, keys: retKeys, series: SERIES, avgDivider: true, height: 280,
    refLine: 90,
    aria: 'Retention of pretrained capabilities on Deformable Object Manipulation',
    data: function () { return RET; }
  }));

  charts.push(lineChart(document.getElementById('chart-budget')));

  document.querySelectorAll('.seg').forEach(function (seg) {
    var target = seg.getAttribute('data-for');
    seg.querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () {
        seg.querySelectorAll('button').forEach(function (o) { o.classList.toggle('active', o === b); });
        state[target] = b.getAttribute('data-metric');
        charts[target === 'main' ? 0 : 1].draw();
      });
    });
  });

  var rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () { charts.forEach(function (c) { c.draw(); }); }, 120);
  });

  // ---------- videos: play only while near the viewport ----------
  var vids = document.querySelectorAll('video[data-autoplay]');
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion || !('IntersectionObserver' in window)) {
    vids.forEach(function (vd) { vd.controls = true; vd.preload = 'metadata'; });
  } else {
    var vio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var vd = e.target;
        if (e.isIntersecting) {
          var p = vd.play();
          if (p && p.catch) p.catch(function () { vd.controls = true; });
        } else {
          vd.pause();
        }
      });
    }, { rootMargin: '200px 0px' });
    vids.forEach(function (vd) { vio.observe(vd); });
  }

  // ---------- autonomous run: swap the 50x preview for the real-time video ----------
  var swap = document.getElementById('auto-swap');
  if (swap) {
    var fast = document.getElementById('auto-50x'), full = document.getElementById('auto-1x');
    swap.addEventListener('click', function () {
      var toFull = full.hidden;
      var show = toFull ? full : fast, hide = toFull ? fast : full;
      hide.pause();
      hide.hidden = true;
      show.hidden = false;
      if (toFull || !reduceMotion) {
        var p = show.play();
        if (p && p.catch) p.catch(function () {});
      }
      swap.textContent = toFull ? 'Back to 50× preview' : 'Watch at 1× speed (14 min)';
    });
  }

  // ---------- TOC scroll-spy ----------
  var links = Array.prototype.slice.call(document.querySelectorAll('.toc-list a'));
  var targets = links.map(function (a) { return document.querySelector(a.getAttribute('href')); });
  function spy() {
    var marker = window.innerHeight * 0.35, cur = -1;
    targets.forEach(function (t, i) { if (t && t.getBoundingClientRect().top <= marker) cur = i; });
    links.forEach(function (a, i) { a.classList.toggle('active', i === cur); });
  }
  window.addEventListener('scroll', spy, { passive: true });
  spy();

  // ---------- copy BibTeX ----------
  var copyBtn = document.querySelector('.copy');
  if (copyBtn) {
    copyBtn.addEventListener('click', function () {
      var text = document.querySelector('.bib code').textContent;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(function () {
          copyBtn.textContent = 'Copied';
          setTimeout(function () { copyBtn.textContent = 'Copy'; }, 1500);
        });
      }
    });
  }
})();
