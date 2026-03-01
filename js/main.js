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


/* ========== AMBIENT GLOW ZONES ========== */

(function () {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var sections = document.querySelectorAll('.section--tiers, .section--how, .section--event, .section--signup');
  var mob = innerWidth < 640;

  sections.forEach(function (sec) {
    var count = mob ? 1 : 2 + Math.floor(Math.random() * 2);
    for (var i = 0; i < count; i++) {
      var glow = document.createElement('div');
      glow.className = 'glow-zone';
      var size = 300 + Math.random() * 200;
      glow.style.cssText = 'width:' + size + 'px;height:' + size + 'px;left:' + (Math.random() * 70 + 15) + '%;top:' + (Math.random() * 60 + 20) + '%;animation-delay:' + (Math.random() * -5) + 's';
      sec.appendChild(glow);
    }
  });

  function check() {
    var glows = document.querySelectorAll('.glow-zone');
    for (var i = 0; i < glows.length; i++) {
      var rect = glows[i].parentElement.getBoundingClientRect();
      var visible = rect.top < innerHeight * 0.8 && rect.bottom > innerHeight * 0.2;
      glows[i].classList.toggle('active', visible);
    }
    requestAnimationFrame(check);
  }
  check();
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
  '.step-card',
  '.event-date', '.event-year', '.event-desc', '.countdown-row',
  '.form'
].join(',')).forEach(function (el) { obs.observe(el); });


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


/* ========== SPACE JOURNEY VISUALIZER ========== */

(function () {
  var sec = document.getElementById('sj');
  if (!sec) return;

  var ew = document.getElementById('ew');
  var orb = document.getElementById('orbitRing');
  var pa = document.getElementById('sjPath');
  var sunV = document.getElementById('sunVis');
  var moonO = document.getElementById('moonObj');
  var venusO = document.getElementById('venusObj');
  var marsO = document.getElementById('marsObj');
  var ph = document.getElementById('sjPhase');
  var co = document.getElementById('sjCo');
  var cn = document.getElementById('sjNum');
  var meCity = document.getElementById('meCity');
  var me0 = document.getElementById('me0');
  var me1 = document.getElementById('me1');
  var me2 = document.getElementById('me2');
  var finale = document.getElementById('sjFinale');
  var ms = [];
  for (var i = 0; i < 6; i++) ms.push(document.getElementById('ms' + i));

  function cl(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lr(a, b, t) { return a + (b - a) * t; }
  function ease(t) { return t < .5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }
  function fmt(n) {
    if (n >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(0) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(0) + 'K';
    return String(n);
  }

  var spaceMS = [
    { idx: 0, trigger: .14, pos: .10, above: true },
    { idx: 1, trigger: .20, pos: .16, above: false, obj: moonO, objSize: 16 },
    { idx: 2, trigger: .32, pos: .32, above: true },
    { idx: 3, trigger: .44, pos: .46, above: false, obj: venusO, objSize: 11 },
    { idx: 4, trigger: .55, pos: .58, above: true, obj: marsO, objSize: 10 },
    { idx: 5, trigger: .68, pos: .78, above: false }
  ];

  // Sun position - constant so path can reference it
  var sunXRatio_mob = .88;
  var sunXRatio_desk = .90;

  function update() {
    var rect = sec.getBoundingClientRect();
    var scrollable = sec.offsetHeight - innerHeight;
    var p = cl(-rect.top / scrollable, 0, 1);
    var vw = innerWidth;
    var vh = innerHeight;
    var mob = vw < 640;

    var sunX = mob ? vw * sunXRatio_mob : vw * sunXRatio_desk;

    // Earth zoom-out
    var zoomOut = ease(cl((p - .04) / .12, 0, 1));
    var earthBig = mob ? 140 : 240;
    var earthSmall = mob ? 22 : 36;
    var earthSize = lr(earthBig, earthSmall, zoomOut);
    var earthCX = lr(vw / 2, mob ? vw * .08 : vw * .06, zoomOut);
    var earthCY = vh / 2;

    ew.style.cssText = 'width:' + earthSize + 'px;height:' + earthSize + 'px;left:' + earthCX + 'px;top:' + earthCY + 'px;transform:translate(-50%,-50%)';

    // Orbit ring
    var orbShow = cl((p - .03) * 14, 0, 1);
    var orbFade = 1 - cl((p - .1) * 10, 0, 1);
    var orbSize = earthSize * 1.3;
    orb.style.cssText = 'width:' + orbSize + 'px;height:' + orbSize + 'px;left:' + earthCX + 'px;top:' + earthCY + 'px;transform:translate(-50%,-50%);opacity:' + (orbShow * orbFade * .4);

    // Toronto city marker (shows during close-up)
    var cityShow = p >= .005 && p < .10;
    meCity.classList.toggle('on', cityShow);
    // Position on the North America part of the globe
    var cityAngle = -20 * Math.PI / 180;
    var cityDist = earthSize * .32;
    meCity.style.left = (earthCX + Math.cos(cityAngle) * cityDist) + 'px';
    meCity.style.top = (earthCY + Math.sin(cityAngle) * cityDist) + 'px';

    // Earth-surface milestones (zoom-out phase)
    var meShow0 = p >= .03 && p < .14;
    var meShow1 = p >= .05 && p < .14;
    var meShow2 = p >= .07 && p < .16;
    me0.classList.toggle('on', meShow0);
    me1.classList.toggle('on', meShow1);
    me2.classList.toggle('on', meShow2);
    var dist0 = earthSize * .55 + 10;
    var rad0 = -40 * Math.PI / 180;
    me0.style.left = (earthCX + Math.cos(rad0) * dist0) + 'px';
    me0.style.top = (earthCY + Math.sin(rad0) * dist0) + 'px';
    var rad1 = 15 * Math.PI / 180;
    me1.style.left = (earthCX + Math.cos(rad1) * dist0) + 'px';
    me1.style.top = (earthCY + Math.sin(rad1) * dist0) + 'px';
    var rad2 = 50 * Math.PI / 180;
    me2.style.left = (earthCX + Math.cos(rad2) * dist0) + 'px';
    me2.style.top = (earthCY + Math.sin(rad2) * dist0) + 'px';

    // Path line - stops at the sun, not past it
    var pathShow = cl((p - .1) * 5, 0, 1);
    var earthEdge = earthCX + earthSize / 2;
    // Path should only extend from earth to sun, clamp scaleX
    var maxPathTarget = sunX;
    var fullPageWidth = vw;
    // The path element spans 0 to vw. We want it to scale to reach sunX at most.
    var maxScale = maxPathTarget / fullPageWidth;
    var pathProgress = cl((p - .1) / .65, 0, 1);
    var pathScale = pathProgress * maxScale;
    pa.style.opacity = pathShow;
    pa.style.transform = 'scaleX(' + pathScale + ')';

    // Sun - grows bigger, more intense
    var sunPhase = ease(cl((p - .45) / .35, 0, 1));
    var sunSize = lr(3, mob ? 70 : 130, sunPhase);
    sunV.style.cssText = 'width:' + sunSize + 'px;height:' + sunSize + 'px;left:' + sunX + 'px;top:' + (vh / 2) + 'px;transform:translate(-50%,-50%);opacity:' + cl(sunPhase * 1.5, 0, 1);

    // Milestones along path
    var sunEdge = sunX - sunSize / 2;
    var trackW = Math.max(sunEdge - earthEdge, 80);

    for (var i = 0; i < spaceMS.length; i++) {
      var m = spaceMS[i];
      var active = p >= m.trigger && zoomOut > .4;
      ms[m.idx].classList.toggle('on', active);
      var mX = earthEdge + trackW * m.pos;
      var yOff = m.above ? (mob ? -50 : -60) : (mob ? 45 : 55);
      ms[m.idx].style.left = cl(mX, 40, vw - 80) + 'px';
      ms[m.idx].style.top = (vh / 2 + yOff) + 'px';
      if (m.obj) {
        var sz = mob ? m.objSize * .65 : m.objSize;
        m.obj.style.cssText = 'width:' + sz + 'px;height:' + sz + 'px;left:' + mX + 'px;top:' + (vh / 2) + 'px;transform:translate(-50%,-50%);opacity:' + (active ? 1 : 0);
      }
    }

    // Phase label
    var phaseText = '';
    if (p < .1) phaseText = 'Toronto, Canada';
    else if (p < .18) phaseText = 'Earth Surface';
    else if (p < .30) phaseText = 'Near Space';
    else if (p < .55) phaseText = 'Inner Solar System';
    else if (p < .85) phaseText = 'Journey to the Sun';
    else phaseText = '';
    ph.textContent = phaseText;
    ph.classList.toggle('on', p > .005 && p < .85);

    // Step counter - visible during journey, hidden during finale
    var showCounter = p > .01 && p < .85;
    co.classList.toggle('on', showCounter);
    var currentSteps;
    if (p < .1) currentSteps = lr(0, 100e6, ease(p / .1));
    else currentSteps = lr(100e6, 187e9, ease(cl((p - .1) / .7, 0, 1)));
    cn.textContent = fmt(Math.floor(currentSteps)) + ' steps';

    // 187B Finale - magnifies at end of scroll
    var finalePhase = cl((p - .82) / .15, 0, 1);
    var showFinale = finalePhase > 0;
    finale.classList.toggle('on', showFinale);

    requestAnimationFrame(update);
  }

  requestAnimationFrame(update);
})();


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
          showError("You're already signed up. We've got you.");
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
