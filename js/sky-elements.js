(function () {
  'use strict';

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var canvas = document.createElement('canvas');
  canvas.id = 'skyElements';
  canvas.style.cssText = 'position:fixed;inset:0;z-index:1;pointer-events:none';
  document.body.insertBefore(canvas, document.querySelector('.page'));
  var ctx = canvas.getContext('2d');

  var w, h;
  var isMobile = window.innerWidth < 768;
  var frame = 0;

  // === CLOUD SYSTEM ===
  var clouds = [];
  var CLOUD_COUNT = isMobile ? 4 : 7;

  function makeCloud(i, total) {
    var layer = i / total; // 0 = near (fast, big), 1 = far (slow, small)
    return {
      x: Math.random() * 1.6 - 0.3, // normalized 0-1, can be offscreen
      y: 0.15 + Math.random() * 0.5,
      scale: 0.35 + (1 - layer) * 0.45 + Math.random() * 0.2,
      speed: (0.002 + (1 - layer) * 0.005) * (0.8 + Math.random() * 0.4),
      puffs: [],
      opacity: 0.35 + Math.random() * 0.3
    };
  }

  function generatePuffs(cloud) {
    var count = isMobile ? 3 : 5;
    cloud.puffs = [];
    for (var i = 0; i < count; i++) {
      cloud.puffs.push({
        ox: (Math.random() - 0.5) * 55 * cloud.scale,
        oy: (Math.random() - 0.5) * 18 * cloud.scale,
        r: (15 + Math.random() * 22) * cloud.scale
      });
    }
  }

  function initClouds() {
    clouds = [];
    for (var i = 0; i < CLOUD_COUNT; i++) {
      var c = makeCloud(i, CLOUD_COUNT);
      generatePuffs(c);
      clouds.push(c);
    }
  }

  function drawCloud(c, sp) {
    // Clouds visible during blue sky phase (0.10 - 0.55)
    // White in blue sky, dark silhouettes during sunset
    var cloudVis = 0;
    if (sp < 0.10) cloudVis = sp / 0.10;
    else if (sp < 0.45) cloudVis = 1;
    else if (sp < 0.62) cloudVis = 1 - (sp - 0.45) / 0.17;
    if (cloudVis <= 0) return;

    var isDark = sp > 0.40;
    var darkT = Math.max(0, Math.min(1, (sp - 0.40) / 0.15));

    var cx = c.x * w;
    var cy = c.y * h;

    for (var i = 0; i < c.puffs.length; i++) {
      var p = c.puffs[i];
      var px = cx + p.ox;
      var py = cy + p.oy;

      ctx.beginPath();
      ctx.arc(px, py, p.r, 0, Math.PI * 2);

      if (isDark) {
        // Dark silhouette clouds against sunset
        var a = c.opacity * cloudVis * darkT * 0.2;
        ctx.fillStyle = 'rgba(40,20,50,' + a + ')';
      } else {
        // White fluffy clouds
        var a2 = c.opacity * cloudVis * 0.4;
        ctx.fillStyle = 'rgba(255,255,255,' + a2 + ')';
      }
      ctx.fill();
    }
  }

  // === BIRD SYSTEM ===
  var birds = [];
  var BIRD_COUNT = isMobile ? 3 : 5;

  function makeBird() {
    return {
      x: -0.1 - Math.random() * 0.3, // start offscreen left
      y: 0.15 + Math.random() * 0.3,
      speed: 0.0004 + Math.random() * 0.0003,
      wingPhase: Math.random() * Math.PI * 2,
      wingSpeed: 3 + Math.random() * 2,
      size: 4 + Math.random() * 5,
      drift: Math.random() * 0.5 + 0.3
    };
  }

  function initBirds() {
    birds = [];
    for (var i = 0; i < BIRD_COUNT; i++) {
      var b = makeBird();
      b.x = Math.random(); // spread initial positions
      birds.push(b);
    }
  }

  function drawBird(b, sp) {
    // Birds visible during sunrise and blue sky (0.0 - 0.40)
    var birdVis = 0;
    if (sp < 0.30) birdVis = 1;
    else if (sp < 0.42) birdVis = 1 - (sp - 0.30) / 0.12;
    if (birdVis <= 0) return;

    var bx = b.x * w;
    var by = b.y * h + Math.sin(Date.now() * 0.001 * b.drift + b.wingPhase) * 15;
    var wing = Math.sin(Date.now() * 0.001 * b.wingSpeed + b.wingPhase);
    var wingY = wing * b.size * 0.8;

    var isDark = sp < 0.25;
    var alpha = birdVis * 0.6;
    ctx.strokeStyle = isDark ? 'rgba(40,30,50,' + alpha + ')' : 'rgba(60,50,70,' + alpha + ')';
    ctx.lineWidth = 1.2;
    ctx.lineCap = 'round';

    // Left wing
    ctx.beginPath();
    ctx.moveTo(bx - b.size, by + wingY);
    ctx.quadraticCurveTo(bx - b.size * 0.4, by + wingY * 0.3, bx, by);
    ctx.stroke();

    // Right wing
    ctx.beginPath();
    ctx.moveTo(bx + b.size, by + wingY);
    ctx.quadraticCurveTo(bx + b.size * 0.4, by + wingY * 0.3, bx, by);
    ctx.stroke();
  }

  // === LIGHT PARTICLES ===
  var particles = [];
  var PARTICLE_COUNT = isMobile ? 12 : 25;

  function makeParticle() {
    return {
      x: Math.random(),
      y: Math.random(),
      r: 0.5 + Math.random() * 1.5,
      vx: (Math.random() - 0.5) * 0.1,
      vy: -(Math.random() * 0.2 + 0.05),
      alpha: Math.random() * 0.25 + 0.05,
      phase: Math.random() * Math.PI * 2
    };
  }

  function initParticles() {
    particles = [];
    for (var i = 0; i < PARTICLE_COUNT; i++) {
      particles.push(makeParticle());
    }
  }

  function drawParticles(sp) {
    // Warm particles during sunrise (0.0 - 0.25), twilight particles (0.55 - 0.80)
    var warmVis = sp < 0.25 ? 1 : sp < 0.35 ? 1 - (sp - 0.25) / 0.10 : 0;
    var coolVis = sp > 0.55 ? Math.min(1, (sp - 0.55) / 0.10) : 0;
    if (sp > 0.80) coolVis = Math.max(0, 1 - (sp - 0.80) / 0.10);
    var vis = Math.max(warmVis, coolVis);
    if (vis <= 0) return;

    var isWarm = warmVis > coolVis;

    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.x += p.vx / w;
      p.y += p.vy / h;
      if (p.y < -0.05) { p.y = 1.05; p.x = Math.random(); }
      if (p.x < -0.05) p.x = 1.05;
      if (p.x > 1.05) p.x = -0.05;

      var twinkle = Math.sin(Date.now() * 0.002 + p.phase) * 0.3 + 0.7;
      var a = p.alpha * vis * twinkle;

      ctx.beginPath();
      ctx.arc(p.x * w, p.y * h, p.r, 0, Math.PI * 2);

      if (isWarm) {
        ctx.fillStyle = 'rgba(255,200,100,' + a + ')';
      } else {
        ctx.fillStyle = 'rgba(180,170,220,' + a * 0.5 + ')';
      }
      ctx.fill();
    }
  }


  // === INIT & DRAW LOOP ===
  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
    isMobile = window.innerWidth < 768;
  }

  function init() {
    resize();
    CLOUD_COUNT = isMobile ? 4 : 7;
    BIRD_COUNT = isMobile ? 3 : 5;
    PARTICLE_COUNT = isMobile ? 12 : 25;
    initClouds();
    initBirds();
    initParticles();
  }

  function draw() {
    frame++;
    if (isMobile && frame % 2 !== 0) { requestAnimationFrame(draw); return; }

    ctx.clearRect(0, 0, w, h);
    var sp = window.__skyProgress || 0;

    // Overall canvas fades out as we reach night
    canvas.style.opacity = sp < 0.70 ? 1 : sp < 0.90 ? 1 - (sp - 0.70) / 0.20 : 0;
    if (sp >= 0.90) { requestAnimationFrame(draw); return; }

    // Update cloud positions (parallax with scroll)
    for (var i = 0; i < clouds.length; i++) {
      clouds[i].x += clouds[i].speed * 0.016; // ~60fps movement
      if (clouds[i].x > 1.4) {
        clouds[i].x = -0.4;
        clouds[i].y = 0.2 + Math.random() * 0.45;
      }
      drawCloud(clouds[i], sp);
    }

    // Update and draw birds
    for (var j = 0; j < birds.length; j++) {
      birds[j].x += birds[j].speed;
      if (birds[j].x > 1.2) {
        birds[j].x = -0.15;
        birds[j].y = 0.15 + Math.random() * 0.3;
      }
      drawBird(birds[j], sp);
    }

    // Draw particles
    drawParticles(sp);

    requestAnimationFrame(draw);
  }

  init();
  draw();
  window.addEventListener('resize', function () { init(); });
})();
