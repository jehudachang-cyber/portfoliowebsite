/* ============================================================
   Procedural canvas backdrops.
   dashboardViz — animated analytics dashboard (Skills section)
   networkViz  — drifting collaboration graph (Leadership banner)
   Both run only while visible and respect reduced motion.
   ============================================================ */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function setup(canvas, drawFrame) {
    var ctx = canvas.getContext('2d');
    var running = false;
    var t = 0;

    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    window.addEventListener('resize', function () { resize(); if (reduced) drawFrame(ctx, canvas.clientWidth, canvas.clientHeight, t); });

    function loop() {
      if (!running) return;
      t += 1 / 60;
      drawFrame(ctx, canvas.clientWidth, canvas.clientHeight, t);
      requestAnimationFrame(loop);
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && !reduced) {
          if (!running) { running = true; loop(); }
        } else {
          running = false;
        }
      });
    }, { threshold: 0.05 });
    io.observe(canvas);

    resize();
    drawFrame(ctx, canvas.clientWidth, canvas.clientHeight, 0); // static first frame
  }

  /* ---------- dashboard ---------- */
  function dashboard(ctx, w, h, t) {
    ctx.clearRect(0, 0, w, h);

    // grid
    ctx.strokeStyle = 'rgba(0,230,118,0.06)';
    ctx.lineWidth = 1;
    var step = 64;
    for (var x = (t * 6) % step - step; x < w; x += step) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (var y = 0; y < h; y += step) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // line series
    function series(offset, amp, speed, alpha, lw) {
      ctx.strokeStyle = 'rgba(0,230,118,' + alpha + ')';
      ctx.lineWidth = lw;
      ctx.beginPath();
      for (var x = 0; x <= w; x += 6) {
        var p = x / w;
        var y = h * offset
          - Math.sin(p * 6 + t * speed) * amp
          - Math.sin(p * 17 + t * speed * 1.7) * amp * 0.35
          - p * amp * 0.9;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    series(0.72, 46, 0.9, 0.5, 2);
    series(0.82, 30, 0.6, 0.28, 1.5);

    // bars along the bottom
    var n = Math.floor(w / 90);
    for (var i = 0; i < n; i++) {
      var v = 0.3 + 0.7 * Math.abs(Math.sin(i * 1.7 + t * 0.5));
      var bh = v * h * 0.14;
      ctx.fillStyle = 'rgba(0,230,118,' + (0.06 + v * 0.1) + ')';
      ctx.fillRect(30 + i * 90, h - bh, 44, bh);
    }

    // drifting data points
    for (var d = 0; d < 26; d++) {
      var px = ((d * 137.5 + t * 14) % (w + 40)) - 20;
      var py = (Math.sin(d * 3.1 + t * 0.4) * 0.4 + 0.4) * h;
      ctx.fillStyle = 'rgba(0,230,118,' + (0.12 + (d % 5) * 0.05) + ')';
      ctx.beginPath();
      ctx.arc(px, py, 1.6 + (d % 3), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /* ---------- network graph ---------- */
  var nodes = null;
  function network(ctx, w, h, t) {
    if (!nodes) {
      nodes = [];
      for (var i = 0; i < 42; i++) {
        nodes.push({
          x: Math.random(), y: Math.random(),
          vx: (Math.random() - 0.5) * 0.0006,
          vy: (Math.random() - 0.5) * 0.0006,
          r: 1.5 + Math.random() * 2.5
        });
      }
    }
    ctx.clearRect(0, 0, w, h);

    nodes.forEach(function (nd) {
      nd.x += nd.vx; nd.y += nd.vy;
      if (nd.x < -0.02 || nd.x > 1.02) nd.vx *= -1;
      if (nd.y < -0.02 || nd.y > 1.02) nd.vy *= -1;
    });

    var maxDist = Math.min(w, h) * 0.22;
    for (var a = 0; a < nodes.length; a++) {
      for (var b = a + 1; b < nodes.length; b++) {
        var ax = nodes[a].x * w, ay = nodes[a].y * h;
        var bx = nodes[b].x * w, by = nodes[b].y * h;
        var dx = ax - bx, dy = ay - by;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < maxDist) {
          ctx.strokeStyle = 'rgba(0,230,118,' + (0.16 * (1 - dist / maxDist)) + ')';
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
        }
      }
    }
    nodes.forEach(function (nd, i) {
      var pulse = 0.5 + 0.5 * Math.sin(t * 1.2 + i);
      ctx.fillStyle = 'rgba(0,230,118,' + (0.35 + pulse * 0.4) + ')';
      ctx.beginPath();
      ctx.arc(nd.x * w, nd.y * h, nd.r + pulse * 0.8, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  window.initViz = function () {
    var dash = document.getElementById('builder-canvas');
    var net = document.getElementById('collab-canvas');
    if (dash) setup(dash, dashboard);
    if (net) setup(net, network);
  };
})();
