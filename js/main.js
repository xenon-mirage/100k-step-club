/* ========================================================
   100K STEP CLUB — MAIN JS
   Stars, scroll reveals, space journey, countdown, signup
   ======================================================== */


/* ========== STAR FIELD ========== */

(function () {
  var c = document.getElementById('stars');
  if (!c) return;
  var x = c.getContext('2d');
  var stars = [];
  var w, h;

  function resize() {
    w = c.width = innerWidth;
    h = c.height = innerHeight;
  }

  function make() {
    stars = [];
    var n = Math.floor(w * h / 5000);
    for (var i = 0; i < n; i++) {
      stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.1 + .15,
        a: Math.random() * .45 + .08,
        ph: Math.random() * Math.PI * 2,
        sp: Math.random() * .003 + .001
      });
    }
  }

  var t = 0;

  function draw() {
    x.clearRect(0, 0, w, h);
    var sy = scrollY;
    var mx = document.body.scrollHeight - innerHeight;
    var sp = Math.min(sy / (mx || 1), 1);
    var bm = .35 + sp * 1.5;

    for (var i = 0; i < stars.length; i++) {
      var p = stars[i];
      var tw = Math.sin(t * p.sp * 60 + p.ph) * .3 + .7;
      x.beginPath();
      x.arc(p.x, p.y + sy * -.012, p.r, 0, Math.PI * 2);
      x.fillStyle = 'rgba(238,234,227,' + Math.min(p.a * tw * bm, 1) + ')';
      x.fill();
    }

    t++;
    requestAnimationFrame(draw);
  }

  resize();
  make();
  draw();
  addEventListener('resize', function () { resize(); make(); });
})();


/* ========== FLOATING EMBER PARTICLES ========== */

(function () {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var canvas = document.createElement('canvas');
  canvas.id = 'embers';
  document.body.insertBefore(canvas, document.querySelector('.page'));
  var ctx = canvas.getContext('2d');
  var embers = [];
  var w, h;

  function resize() {
    w = canvas.width = innerWidth;
    h = canvas.height = innerHeight;
  }

  function init() {
    embers = [];
    var count = Math.floor(w * h / 25000);
    for (var i = 0; i < count; i++) {
      embers.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 2 + 0.5,
        vx: (Math.random() - 0.5) * 0.2,
        vy: -(Math.random() * 0.4 + 0.1),
        alpha: Math.random() * 0.35 + 0.08,
        hue: Math.random() * 30 + 15,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  var mob = innerWidth < 640;
  var frame = 0;

  function draw() {
    frame++;
    if (mob && frame % 2 !== 0) { requestAnimationFrame(draw); return; }

    ctx.clearRect(0, 0, w, h);
    var scrollFraction = scrollY / (document.body.scrollHeight - innerHeight || 1);
    canvas.style.opacity = Math.min(scrollFraction * 2.5, 0.7);

    for (var i = 0; i < embers.length; i++) {
      var e = embers[i];
      e.x += e.vx + Math.sin(Date.now() * 0.0004 + e.phase) * 0.08;
      e.y += e.vy;
      if (e.y < -10) { e.y = h + 10; e.x = Math.random() * w; }
      if (e.x < -10) e.x = w + 10;
      if (e.x > w + 10) e.x = -10;

      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,' + Math.floor(107 + e.hue) + ',0,' + e.alpha + ')';
      ctx.fill();
    }
    requestAnimationFrame(draw);
  }

  resize();
  init();
  draw();
  addEventListener('resize', function () {
    resize();
    mob = innerWidth < 640;
    init();
  });
})();


/* Ambient glow zones removed — lava shader provides warmth */


/* ========== INTERSECTION OBSERVER — SCROLL REVEALS ========== */

var obs = new IntersectionObserver(function (entries) {
  entries.forEach(function (entry) {
    if (entry.isIntersecting) {
      entry.target.classList.add('v');
      setTimeout(function () { entry.target.style.willChange = 'auto'; }, 1000);
    }
  });
}, { threshold: .1, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll([
  '.st-line', '.st-body',
  '.eyebrow', '.section-title', '.section-sub',
  '.what-grid',
  '.mi-title', '.mi-sub',
  '.mi-close-num', '.mi-pills', '.mi-close-body',
  '.tier-card',
  '.about-name', '.about-body', '.about-stats', '.about-cities',
  '.founder-photo', '.founder-text',
  '.event-date', '.event-year', '.event-desc', '.countdown-row',
  '.form'
].join(',')).forEach(function (el) { obs.observe(el); });


/* ========== TIER STAT BAR ANIMATION ========== */
(function () {
  var cards = document.querySelectorAll('.tier-card');
  cards.forEach(function (card) {
    var fill = card.querySelector('.tier-bar-fill');
    if (!fill) return;
    var targetWidth = parseFloat(fill.dataset.width) || 0;
    var visualWidth;
    if (targetWidth >= 10) visualWidth = targetWidth;
    else if (targetWidth >= 1) visualWidth = 8 + (targetWidth / 10) * 20;
    else if (targetWidth >= 0.01) visualWidth = 3 + (targetWidth / 1) * 5;
    else visualWidth = 1.5;

    var animated = false;
    var barObs = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting && !animated) {
        animated = true;
        setTimeout(function () {
          fill.style.width = visualWidth + '%';
        }, 300);
      }
    }, { threshold: 0.3 });
    barObs.observe(card);
  });
})();


/* ========== SCROLL CUE HIDE ========== */

(function () {
  var cue = document.querySelector('.scroll-cue');
  if (!cue) return;
  var hidden = false;
  addEventListener('scroll', function () {
    if (!hidden && scrollY > 100) {
      cue.style.opacity = '0';
      hidden = true;
    }
  }, { passive: true });
})();


/* ========== COUNTDOWN TO MAY 2, 2026 ========== */

(function () {
  var target = new Date('2026-05-02T00:00:00').getTime();
  var dEl = document.getElementById('cd-d');
  var hEl = document.getElementById('cd-h');
  var mEl = document.getElementById('cd-m');
  if (!dEl) return;

  function tick() {
    var diff = Math.max(0, target - Date.now());
    dEl.textContent = Math.floor(diff / 864e5);
    hEl.textContent = Math.floor((diff % 864e5) / 36e5);
    mEl.textContent = Math.floor((diff % 36e5) / 6e4);
  }

  tick();
  setInterval(tick, 60000);
})();


/* Space journey visualizer moved to js/space-journey.js */


/* ========== SMOOTH SCROLL FOR ANCHOR LINKS ========== */

document.querySelectorAll('a[href^="#"]').forEach(function (link) {
  link.addEventListener('click', function (e) {
    var target = document.querySelector(this.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});


/* ========== SUPABASE SIGNUP FORM ========== */

(function () {
  var form = document.getElementById('signup-form');
  var errorEl = document.getElementById('form-error');
  var successEl = document.getElementById('form-success');
  var submitBtn = document.getElementById('submit-btn');
  if (!form) return;

  var supabase;
  try {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (e) {
    console.error('Supabase init failed:', e);
    return;
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    hideError();

    var firstName = form.first_name.value.trim();
    var email = form.email.value.trim();
    var tier = form.tier.value;
    var city = form.city.value.trim();
    var newsletter = document.getElementById('newsletter').checked;

    if (!firstName) return showError('Name is missing.');
    if (!email || !email.includes('@')) return showError("That email didn't work. Try again?");
    if (!tier) return showError('Pick a tier.');
    if (!city) return showError('Where are you based?');

    setLoading(true);

    try {
      var result = await supabase
        .from('landingpage_signups')
        .insert([{ name: firstName, email: email, tier: tier, city: city, newsletter_opt_in: newsletter }]);

      if (result.error) {
        if (result.error.code === '23505') {
          showError("You're already in. Check your inbox.");
        } else {
          showError('Something went wrong. Try again?');
          console.error('Supabase error:', result.error);
        }
        setLoading(false);
        return;
      }

      form.hidden = true;
      successEl.hidden = false;
    } catch (err) {
      showError('Connection failed. Check your internet and try again.');
      console.error('Network error:', err);
      setLoading(false);
    }
  });

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.hidden = false;
  }

  function hideError() {
    errorEl.hidden = true;
  }

  function setLoading(on) {
    submitBtn.classList.toggle('btn--loading', on);
    var span = submitBtn.querySelector('span');
    if (span) span.textContent = on ? 'Signing up...' : "I'm in";
  }
})();
