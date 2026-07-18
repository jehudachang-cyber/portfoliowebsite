/* ============================================================
   Hero orbit — Three.js scene.
   The camera does a full 360° orbit around a cutout of Jehuda,
   driven by scroll progress (window.ORBIT.setProgress).
   Emerald rim glow, particle field, holo stat panels, floor grid.
   ============================================================ */
(function () {
  'use strict';

  var api = {
    ready: null,
    setProgress: function () {},
    setActive: function () {},
    ok: false
  };
  window.ORBIT = api;

  var canvas = document.getElementById('orbit-canvas');
  if (!canvas || !window.THREE) { api.ready = Promise.resolve(false); return; }

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false, preserveDrawingBuffer: true });
  } catch (e) {
    api.ready = Promise.resolve(false);
    return;
  }
  api.ok = true;

  var EMERALD = 0x00e676;
  var scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050607);
  scene.fog = new THREE.FogExp2(0x050607, 0.052);

  var camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;

  /* ---------- helpers ---------- */
  function radialTexture(inner, outer, stops) {
    var c = document.createElement('canvas');
    c.width = c.height = 256;
    var g = c.getContext('2d');
    var grad = g.createRadialGradient(128, 128, 10, 128, 128, 128);
    (stops || [[0, inner], [1, outer]]).forEach(function (s) { grad.addColorStop(s[0], s[1]); });
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 256);
    var tex = new THREE.CanvasTexture(c);
    return tex;
  }

  /* ---------- central figure (billboarded group) ---------- */
  var figure = new THREE.Group();
  // sink slightly below the grid so the feet sit inside the floor glow
  figure.position.y = -0.18;
  scene.add(figure);

  // rim glow behind the portrait
  var glowTex = radialTexture(null, null, [
    [0, 'rgba(0,230,118,0.55)'],
    [0.45, 'rgba(0,120,80,0.22)'],
    [1, 'rgba(0,0,0,0)']
  ]);
  var glow = new THREE.Mesh(
    new THREE.PlaneGeometry(3.4, 4.2),
    new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  glow.position.set(0, 1.35, -0.32);
  figure.add(glow);

  var portraitMesh = null;
  var texLoader = new THREE.TextureLoader();
  var readyResolve;
  api.ready = new Promise(function (res) { readyResolve = res; });

  api._portrait = 'pending';
  // Data URI first: file:// pages can't use local images as WebGL textures.
  texLoader.load(window.PORTRAIT_DATA_URI || 'assets/portrait_cutout.png',
    function (tex) {
      try {
        tex.encoding = THREE.sRGBEncoding;
        tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
        var aspect = tex.image.width / tex.image.height;
        var h = 2.75;
        var w = h * aspect;
        portraitMesh = new THREE.Mesh(
          new THREE.PlaneGeometry(w, h),
          new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })
        );
        portraitMesh.position.y = h / 2;
        figure.add(portraitMesh);
        api._portrait = 'loaded ' + tex.image.width + 'x' + tex.image.height;
      } catch (e) {
        api._portrait = 'exception: ' + e.message;
      }
      readyResolve(true);
    },
    undefined,
    function (err) {
      api._portrait = 'error';
      readyResolve(true); // scene still works without the cutout
    }
  );

  // floor spotlight under the figure
  var spot = new THREE.Mesh(
    new THREE.CircleGeometry(1.9, 48),
    new THREE.MeshBasicMaterial({
      map: radialTexture(null, null, [[0, 'rgba(0,230,118,0.35)'], [1, 'rgba(0,0,0,0)']]),
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
    })
  );
  spot.rotation.x = -Math.PI / 2;
  spot.position.y = 0.01;
  scene.add(spot);

  /* ---------- floor grid ---------- */
  var grid = new THREE.GridHelper(50, 50, 0x11453a, 0x0b2019);
  grid.position.y = 0;
  scene.add(grid);

  /* ---------- particle field ---------- */
  var N = 750;
  var pos = new Float32Array(N * 3);
  for (var i = 0; i < N; i++) {
    var r = 2.6 + Math.pow(Math.random(), 0.7) * 7.5;
    var a = Math.random() * Math.PI * 2;
    pos[i * 3] = Math.cos(a) * r;
    pos[i * 3 + 1] = Math.random() * 4.6 - 0.1;
    pos[i * 3 + 2] = Math.sin(a) * r;
  }
  var pgeo = new THREE.BufferGeometry();
  pgeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  var particles = new THREE.Points(pgeo, new THREE.PointsMaterial({
    color: EMERALD, size: 0.035, transparent: true, opacity: 0.5,
    sizeAttenuation: true, blending: THREE.AdditiveBlending, depthWrite: false
  }));
  scene.add(particles);

  /* ---------- wireframe rings ---------- */
  function ring(radius, tilt, opacity) {
    var m = new THREE.Mesh(
      new THREE.TorusGeometry(radius, 0.006, 8, 128),
      new THREE.MeshBasicMaterial({ color: EMERALD, transparent: true, opacity: opacity, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    m.rotation.x = Math.PI / 2 + tilt;
    m.position.y = 1.2;
    scene.add(m);
    return m;
  }
  var ring1 = ring(2.7, 0.12, 0.28);
  var ring2 = ring(3.4, -0.08, 0.16);

  /* ---------- holographic stat panels ---------- */
  function panelTexture(draw) {
    var c = document.createElement('canvas');
    c.width = 512; c.height = 320;
    var g = c.getContext('2d');
    g.fillStyle = 'rgba(4, 18, 13, 0.72)';
    g.fillRect(0, 0, 512, 320);
    g.strokeStyle = 'rgba(0,230,118,0.55)';
    g.lineWidth = 2;
    g.strokeRect(1, 1, 510, 318);
    // faint grid
    g.strokeStyle = 'rgba(0,230,118,0.10)';
    g.lineWidth = 1;
    for (var y = 40; y < 320; y += 40) { g.beginPath(); g.moveTo(0, y); g.lineTo(512, y); g.stroke(); }
    for (var x = 64; x < 512; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 320); g.stroke(); }
    draw(g);
    var tex = new THREE.CanvasTexture(c);
    tex.encoding = THREE.sRGBEncoding;
    return tex;
  }

  function lineChart(g, seed) {
    g.strokeStyle = 'rgba(0,230,118,0.9)';
    g.lineWidth = 3;
    g.beginPath();
    for (var x = 20; x <= 492; x += 8) {
      var t = x / 492;
      var y = 240 - (Math.sin(t * 5 + seed) * 30 + t * 120 + Math.sin(t * 13 + seed * 2) * 14);
      if (x === 20) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.stroke();
  }

  function bigStat(g, value, label) {
    g.fillStyle = 'rgba(242,238,227,0.95)';
    g.font = '700 84px Arial';
    g.fillText(value, 28, 150);
    g.fillStyle = 'rgba(0,230,118,0.9)';
    g.font = '600 26px Arial';
    g.fillText(label, 30, 200);
  }

  function bars(g) {
    var vals = [0.35, 0.6, 0.45, 0.8, 0.65, 0.92, 0.75];
    for (var i = 0; i < vals.length; i++) {
      var h = vals[i] * 200;
      g.fillStyle = 'rgba(0,230,118,' + (0.25 + vals[i] * 0.55) + ')';
      g.fillRect(40 + i * 62, 280 - h, 38, h);
    }
  }

  function codeLines(g) {
    var lines = ['SELECT insight', 'FROM data', 'WHERE effort >', '  average;', '', 'df.groupby(', '  "impact")'];
    g.font = '500 30px Consolas, monospace';
    for (var i = 0; i < lines.length; i++) {
      g.fillStyle = i % 3 === 0 ? 'rgba(0,230,118,0.85)' : 'rgba(242,238,227,0.7)';
      g.fillText(lines[i], 30, 58 + i * 40);
    }
  }

  var panelDefs = [
    function (g) { bigStat(g, '3.75', 'CGPA'); lineChart(g, 1); },
    function (g) { codeLines(g); },
    function (g) { bars(g); bigStat(g, '', ''); g.fillStyle = 'rgba(0,230,118,0.9)'; g.font = '600 26px Arial'; g.fillText('IMPACT / SEMESTER', 40, 50); },
    function (g) { bigStat(g, 'SQL', 'PYTHON · SAS · R'); lineChart(g, 4); },
    function (g) { lineChart(g, 2); lineChart(g, 7); g.fillStyle = 'rgba(0,230,118,0.9)'; g.font = '600 26px Arial'; g.fillText('TREND ANALYSIS', 40, 50); },
    function (g) { bigStat(g, "'27", "DEAN'S LIST ×3"); }
  ];

  // FrontSide + lookAt(center): panels facing away from the camera are culled,
  // so they never occlude the figure and never show mirrored text.
  var panels = new THREE.Group();
  panelDefs.forEach(function (draw, i) {
    var mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.5, 0.94),
      new THREE.MeshBasicMaterial({
        map: panelTexture(draw), transparent: true, opacity: 0.72,
        side: THREE.FrontSide, depthWrite: false
      })
    );
    var angle = (i / panelDefs.length) * Math.PI * 2 + 0.85;
    var radius = 4.2;
    mesh.position.set(Math.cos(angle) * radius, 1.05 + (i % 3) * 0.72, Math.sin(angle) * radius);
    mesh.lookAt(0, mesh.position.y, 0);
    mesh.userData.baseY = mesh.position.y;
    mesh.userData.phase = i * 1.3;
    panels.add(mesh);
  });
  scene.add(panels);

  /* ---------- camera orbit state ---------- */
  var progress = 0;        // scroll target 0..1
  var smooth = 0;          // eased progress
  var idle = 0;            // continuous slow drift
  var mouseX = 0, mouseY = 0;
  var active = true;

  api.setProgress = function (p) { progress = p; };
  api.setActive = function (a) { active = a; };

  window.addEventListener('pointermove', function (e) {
    mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  function resize() {
    var w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width !== w || canvas.height !== h) {
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      // On wide screens shift the scene centre to the right so the
      // headline on the left never covers the figure; keep it centred
      // on narrow screens where the text spans the full width anyway.
      if (w >= 760) camera.setViewOffset(w, h, -w * 0.17, 0, w, h);
      else camera.clearViewOffset();
      camera.updateProjectionMatrix();
    }
  }
  window.addEventListener('resize', resize);

  var clock = new THREE.Clock();

  // debug handles (harmless in production)
  api._scene = scene;
  api._camera = camera;
  api._figure = figure;
  api._getPortrait = function () { return portraitMesh; };
  api._state = function () { return { progress: progress, smooth: smooth, active: active }; };

  function step(dt, t) {
    resize();

    // buttery: ease displayed progress toward scroll target
    smooth += (progress - smooth) * Math.min(1, dt * 9);

    // gentle sway instead of endless drift, so the resting framing stays clean
    var azimuth = smooth * Math.PI * 2 + Math.sin(t * 0.28) * 0.045 + mouseX * 0.07;
    var lift = Math.sin(smooth * Math.PI);
    var radius = 5.7 - lift * 0.8;
    var height = 1.42 + lift * 0.4 - mouseY * 0.12 + Math.sin(t * 0.5) * 0.04;

    camera.position.set(Math.sin(azimuth) * radius, height, Math.cos(azimuth) * radius);
    camera.lookAt(0, 1.15, 0);

    // billboard the figure so the cutout always faces the camera
    figure.rotation.y = Math.atan2(camera.position.x, camera.position.z);

    // ambient life
    particles.rotation.y = t * 0.02 - smooth * 0.6;
    ring1.rotation.z = t * 0.05;
    ring2.rotation.z = -t * 0.035;
    panels.rotation.y = t * 0.02;
    panels.children.forEach(function (m) {
      m.position.y = m.userData.baseY + Math.sin(t * 0.8 + m.userData.phase) * 0.05;
    });
    glow.material.opacity = 0.85 + Math.sin(t * 1.4) * 0.12;

    renderer.render(scene, camera);
  }

  function frame() {
    requestAnimationFrame(frame);
    if (!active) return;
    step(Math.min(clock.getDelta(), 0.05), clock.elapsedTime);
  }

  // deterministic single-frame render, used for automated verification
  api._renderOnce = function (p, t) {
    if (typeof p === 'number') { progress = p; smooth = p; }
    step(1 / 60, typeof t === 'number' ? t : clock.elapsedTime);
  };

  resize();
  frame();
})();
