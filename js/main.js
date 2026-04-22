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
  var countrySel = document.getElementById('country');
  var citySel = document.getElementById('city');
  var cityOther = document.getElementById('city-other');
  if (!form) return;

  var OTHER = '__other__';
  var SUBDIV_COUNTRIES = { 'United States': true, 'Canada': true };

  var supabase;
  try {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (e) {
    console.error('Supabase init failed:', e);
    return;
  }

  // Fetch cities once, build {country -> City[]} map, populate country select.
  var citiesByCountry = new Map();
  (async function loadCities() {
    try {
      var res = await supabase
        .from('cities')
        .select('id, city, country, state')
        .order('country', { ascending: true })
        .order('state', { ascending: true, nullsFirst: true })
        .order('city', { ascending: true });
      if (res.error) throw res.error;
      (res.data || []).forEach(function (c) {
        if (!citiesByCountry.has(c.country)) citiesByCountry.set(c.country, []);
        citiesByCountry.get(c.country).push(c);
      });
      populateCountries();
    } catch (err) {
      console.error('Failed to load cities:', err);
      // Fallback: let users type city free-form if the fetch fails so we
      // never block a signup on a network hiccup.
      countrySel.innerHTML = '<option value="" disabled selected>Pick your country</option>';
      enableCityOtherFallback();
    }
  })();

  function populateCountries() {
    var countries = Array.from(citiesByCountry.keys()).sort(function (a, b) { return a.localeCompare(b); });
    var frag = document.createDocumentFragment();
    var placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.disabled = true;
    placeholder.selected = true;
    placeholder.textContent = 'Pick your country';
    frag.appendChild(placeholder);
    countries.forEach(function (name) {
      var opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      frag.appendChild(opt);
    });
    countrySel.innerHTML = '';
    countrySel.appendChild(frag);
  }

  function populateCities(country) {
    var list = citiesByCountry.get(country) || [];
    var frag = document.createDocumentFragment();
    var placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.disabled = true;
    placeholder.selected = true;
    placeholder.textContent = 'Pick your city';
    frag.appendChild(placeholder);
    list.forEach(function (c) {
      var opt = document.createElement('option');
      var label = SUBDIV_COUNTRIES[c.country] && c.state ? c.city + ', ' + c.state : c.city;
      opt.value = String(c.id);
      opt.textContent = label;
      opt.dataset.cityId = String(c.id);
      opt.dataset.cityName = c.city;
      frag.appendChild(opt);
    });
    var other = document.createElement('option');
    other.value = OTHER;
    other.textContent = '— My city isn\u2019t listed';
    frag.appendChild(other);
    citySel.innerHTML = '';
    citySel.appendChild(frag);
    citySel.disabled = false;
    hideCityOther();
  }

  function showCityOther() {
    cityOther.hidden = false;
    cityOther.required = true;
    setTimeout(function () { cityOther.focus(); }, 30);
  }

  function hideCityOther() {
    cityOther.hidden = true;
    cityOther.required = false;
    cityOther.value = '';
  }

  function enableCityOtherFallback() {
    // Used when cities fetch fails — collapse to a free-text city so signups
    // never break. city_id stays null; signup flows through the legacy
    // text-match path in get_leaderboard_signup_only().
    citySel.innerHTML = '<option value="' + OTHER + '" selected>Type your city below</option>';
    citySel.disabled = true;
    showCityOther();
  }

  countrySel.addEventListener('change', function () {
    if (!countrySel.value) return;
    populateCities(countrySel.value);
  });

  citySel.addEventListener('change', function () {
    if (citySel.value === OTHER) showCityOther();
    else hideCityOther();
  });

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    hideError();

    var firstName = form.first_name.value.trim();
    var email = form.email.value.trim();
    var tier = form.tier.value;
    var country = countrySel.value;
    var cityVal = citySel.value;
    var isOther = cityVal === OTHER;
    var newsletter = document.getElementById('newsletter').checked;

    var cityId = null;
    var cityDisplay = '';
    if (isOther) {
      cityDisplay = cityOther.value.trim();
    } else if (cityVal) {
      var selected = citySel.selectedOptions[0];
      cityId = selected ? Number(selected.dataset.cityId) : null;
      cityDisplay = selected ? selected.dataset.cityName : '';
    }

    if (!firstName) return showError('Name is missing.');
    if (!email || !email.includes('@')) return showError("That email didn't work. Try again?");
    if (!tier) return showError('Pick a tier.');
    if (!country) return showError('Pick your country.');
    if (!cityVal) return showError('Pick your city.');
    if (isOther && !cityDisplay) return showError('Type your city.');

    setLoading(true);

    try {
      var result = await supabase
        .from('landingpage_signups')
        .insert([{
          name: firstName,
          email: email,
          tier: tier,
          country: country,
          city: cityDisplay,
          city_id: cityId,
          newsletter_opt_in: newsletter
        }]);

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
