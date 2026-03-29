/* ========================================================
   100K STEP CLUB — MAIN JS
   Star field, scroll reveals, countdown, signup
   ======================================================== */


/* ========== STAR FIELD — Dense Milky Way canvas ========== */

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
    // Very dense star field — Milky Way intensity
    var n = Math.floor(w * h / 1500);
    for (var i = 0; i < n; i++) {
      // Milky Way band: cluster 35% of stars in a diagonal band
      var inBand = Math.random() < 0.35;
      var bandAngle = 0.2; // slight tilt
      stars.push({
        x: Math.random() * w,
        y: inBand ? h * 0.4 + (Math.random() - 0.5) * h * 0.25 : Math.random() * h,
        r: Math.random() < 0.85 ? Math.random() * 0.9 + 0.15 : Math.random() * 1.8 + 0.5,
        a: Math.random() * 0.7 + 0.12,
        ph: Math.random() * Math.PI * 2,
        sp: Math.random() * 0.003 + 0.001,
        // Colour tint: blue-white, white, warm
        tint: Math.random() < 0.25 ? 0 : Math.random() < 0.6 ? 1 : 2
      });
    }
  }

  var t = 0;
  var tintColors = [
    [210, 220, 255],  // blue-white
    [238, 234, 227],  // neutral white
    [255, 230, 200]   // warm yellow
  ];

  function draw() {
    x.clearRect(0, 0, w, h);
    var sy = scrollY;

    for (var i = 0; i < stars.length; i++) {
      var p = stars[i];
      var tw = Math.sin(t * p.sp * 60 + p.ph) * 0.3 + 0.7;
      var col = tintColors[p.tint];
      x.beginPath();
      x.arc(p.x, p.y + sy * -0.008, p.r, 0, Math.PI * 2);
      x.fillStyle = 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ',' + Math.min(p.a * tw, 1) + ')';
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
    if (span) span.textContent = on ? 'Signing up...' : "Join me";
  }
})();
