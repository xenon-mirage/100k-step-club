/* ========================================================
   100K STEP CLUB — V3 MAIN JS
   Star field, scroll reveals, countdown, sticky CTA, signup,
   live tier walls. One file serves index.html + tiers.html
   (null-guarded). One shared Supabase client per page.
   ======================================================== */

/* ========== SHARED SUPABASE CLIENT ========== */

var SB = (function () {
  if (typeof window.supabase === 'undefined' || typeof SUPABASE_URL === 'undefined') return null;
  try {
    // persistSession off: the marketing site never authenticates, so skip
    // the auth-token storage (and the GoTrue multiple-instance warnings).
    return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
  } catch (e) {
    console.error('Supabase init failed:', e);
    return null;
  }
})();


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
    var n = Math.floor(w * h / 1500);
    for (var i = 0; i < n; i++) {
      // Milky Way band: cluster 35% of stars in a diagonal band
      var inBand = Math.random() < 0.35;
      stars.push({
        x: Math.random() * w,
        y: inBand ? h * 0.4 + (Math.random() - 0.5) * h * 0.25 : Math.random() * h,
        r: Math.random() < 0.85 ? Math.random() * 0.9 + 0.15 : Math.random() * 1.8 + 0.5,
        a: Math.random() * 0.7 + 0.12,
        ph: Math.random() * Math.PI * 2,
        sp: Math.random() * 0.003 + 0.001,
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
  '.eyebrow', '.section-title', '.section-sub',
  '.what-lead', '.step-card',
  '.proof-stats',
  '.ladder-row',
  '.founder-photo', '.founder-text',
  '.event-date', '.event-year', '.event-desc', '.countdown-row',
  '.form',
  '.club-card',
  '.tier-block', '.rule-card'
].join(',')).forEach(function (el) { obs.observe(el); });


/* ========== TIER BAR ANIMATION (tiers page) ========== */

(function () {
  document.querySelectorAll('.tier-bar-fill').forEach(function (fill) {
    var block = fill.closest('.tier-block') || fill.parentElement;
    var targetWidth = parseFloat(fill.dataset.width) || 0;
    // Map tiny percentages to visible widths so 0.002% still draws a sliver
    var visualWidth;
    if (targetWidth >= 25) visualWidth = targetWidth;
    else if (targetWidth >= 1.5) visualWidth = 11 + (targetWidth - 1.5) / 23.5 * 14;
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
    barObs.observe(block);
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


/* ========== COUNTDOWN TO SEPTEMBER 28, 2026 ========== */

(function () {
  var target = new Date('2026-09-28T00:00:00').getTime();
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


/* ========== STICKY MOBILE CTA ==========
   Shows after the hero scrolls away, hides while the signup
   section (or the success state) is on screen. */

(function () {
  var cta = document.getElementById('sticky-cta');
  var hero = document.getElementById('hero');
  var signup = document.getElementById('signup');
  if (!cta || !hero || !signup) return;

  var pastHero = false;
  var atSignup = false;

  function update() {
    cta.classList.toggle('on', pastHero && !atSignup);
  }

  new IntersectionObserver(function (entries) {
    pastHero = !entries[0].isIntersecting;
    update();
  }, { threshold: 0.15 }).observe(hero);

  new IntersectionObserver(function (entries) {
    atSignup = entries[0].isIntersecting;
    update();
  }, { threshold: 0.05 }).observe(signup);
})();


/* ========== MOBILE NAV MENU ========== */

(function () {
  var btn = document.getElementById('nav-menu-btn');
  var menu = document.getElementById('nav-menu');
  if (!btn || !menu) return;

  function close() {
    menu.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
  }

  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    var open = menu.classList.toggle('open');
    btn.setAttribute('aria-expanded', String(open));
  });

  document.addEventListener('click', function (e) {
    if (!e.target.closest('#nav-menu') && !e.target.closest('#nav-menu-btn')) close();
  });

  addEventListener('scroll', close, { passive: true });
})();


/* ========== LIVE PROOF STATS (landing page) ==========
   Same sources as the rest of the site: v_step_totals powers the
   Journey counter; v_city_claims_all powers the Claim Board.
   Static numbers in the HTML are the offline fallback. */

(function () {
  var stepsEl = document.querySelector('[data-live="steps"]');
  if (!stepsEl || !SB) return;
  var walkersEl = document.querySelector('[data-live="walkers"]');
  var citiesEl = document.querySelector('[data-live="cities"]');

  SB.from('v_step_totals').select('*').single().then(function (res) {
    if (res.error || !res.data) return;
    if (res.data.total_steps != null) stepsEl.textContent = Number(res.data.total_steps).toLocaleString('en-US');
    if (walkersEl && res.data.verified_claims_count != null) walkersEl.textContent = res.data.verified_claims_count;
  });

  if (citiesEl) {
    SB.from('v_city_claims_all').select('city, country, state').then(function (res) {
      if (res.error || !res.data || !res.data.length) return;
      var seen = new Set();
      res.data.forEach(function (r) { seen.add(r.country + '||' + (r.state || '') + '||' + r.city); });
      citiesEl.textContent = seen.size;
    });
  }
})();


/* ========== THE WALL — live verified claims (tiers page) ==========
   Fetches every verified claim from v_city_claims_all (the same view
   the Claim Board reads) and rebuilds each tier's wall with real names.
   On any failure the static fallback chips stay. */

(function () {
  var walls = document.querySelectorAll('.wall[data-wall]');
  if (!walls.length || !SB) return;
  var sb = SB;

  var MAX_CHIPS = 30;

  function fmtDuration(secs) {
    if (!secs && secs !== 0) return '';
    var h = Math.floor(secs / 3600);
    var m = Math.round((secs % 3600) / 60);
    return h + 'h ' + (m < 10 ? '0' : '') + m + 'm';
  }

  function makeChip(claim) {
    var chip = document.createElement('span');
    chip.className = 'wall-chip';
    var name = document.createElement('strong');
    name.textContent = claim.holder;
    chip.appendChild(name);
    chip.appendChild(document.createTextNode(' — ' + claim.city));
    var dur = fmtDuration(claim.time_seconds);
    chip.title = claim.tier + (claim.date ? ' · ' + claim.date : '') + (dur ? ' · ' + dur : '');
    return chip;
  }

  function makeYouChip() {
    var you = document.createElement('a');
    you.className = 'wall-chip wall-chip--you';
    you.href = '/#signup';
    you.innerHTML = 'Your name &rarr;';
    return you;
  }

  Promise.race([
    sb.from('v_city_claims_all').select('holder, city, state, country, tier, time_seconds, date'),
    new Promise(function (resolve) { setTimeout(function () { resolve(null); }, 4000); })
  ]).then(function (res) {
    if (!res || res.error || !res.data || !res.data.length) {
      if (res && res.error) console.warn('[wall] live fetch failed, keeping static chips:', res.error);
      return;
    }

    var byTier = {};
    res.data.forEach(function (c) {
      if (!byTier[c.tier]) byTier[c.tier] = [];
      byTier[c.tier].push(c);
    });

    walls.forEach(function (wall) {
      var claims = byTier[wall.dataset.wall] || [];
      if (!claims.length) return; // leave the static "Nobody yet" line alone

      claims.sort(function (a, b) {
        if (a.date !== b.date) return a.date < b.date ? -1 : 1;
        return (a.time_seconds || 0) - (b.time_seconds || 0);
      });

      // One chip per name+city — it's a wall of names, not a walk log.
      // Repeat walks live on the Claim Board.
      var seen = {};
      claims = claims.filter(function (c) {
        var key = c.holder + '||' + c.city;
        if (seen[key]) return false;
        seen[key] = true;
        return true;
      });

      wall.innerHTML = '';
      claims.slice(0, MAX_CHIPS).forEach(function (c) {
        wall.appendChild(makeChip(c));
      });
      if (claims.length > MAX_CHIPS) {
        var more = document.createElement('a');
        more.className = 'wall-chip';
        more.href = '/leaderboard.html';
        more.textContent = '+' + (claims.length - MAX_CHIPS) + ' more on the Claim Board';
        wall.appendChild(more);
      }
      wall.appendChild(makeYouChip());
    });
  });
})();


/* ========== TURNSTILE-VERIFIED SIGNUP FORM ========== */

(function () {
  var form = document.getElementById('signup-form');
  var errorEl = document.getElementById('form-error');
  var successEl = document.getElementById('form-success');
  var submitBtn = document.getElementById('submit-btn');
  var countrySel = document.getElementById('country');
  var citySel = document.getElementById('city');
  var cityOther = document.getElementById('city-other');
  var turnstileStatus = document.getElementById('turnstile-status');
  var turnstileWidget = document.getElementById('turnstile-widget');
  if (!form) return;

  var OTHER = '__other__';
  var SUBDIV_COUNTRIES = { 'United States': true, 'Canada': true };

  var supabase = SB;
  var loading = false;
  var turnstileToken = '';
  var turnstileWidgetId = null;
  var verificationUnavailable = false;

  setLoading(false);
  initializeTurnstile();

  if (!supabase) {
    enableCountryOtherFallback();
    setVerificationUnavailable();
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
      console.error('City list unavailable');
      // Preserve a fully usable free-text country/city path when the catalogue is down.
      enableCountryOtherFallback();
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
    other.textContent = '— My city isn’t listed';
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

  function enableCountryOtherFallback() {
    var replacement = document.createElement('input');
    replacement.type = 'text';
    replacement.id = 'country';
    replacement.name = 'country';
    replacement.className = 'form-input';
    replacement.placeholder = 'Type your country';
    replacement.autocomplete = 'country-name';
    replacement.required = true;
    countrySel.replaceWith(replacement);
    countrySel = replacement;
    enableCityOtherFallback();
  }

  function initializeTurnstile() {
    if (typeof SignupAPI === 'undefined' || typeof TURNSTILE_SITE_KEY === 'undefined' ||
      !SignupAPI.isConfiguredSiteKey(TURNSTILE_SITE_KEY)) {
      setVerificationUnavailable();
      return;
    }

    var checks = 0;
    var readyTimer = setInterval(function () {
      checks += 1;
      if (window.turnstile && typeof window.turnstile.render === 'function') {
        clearInterval(readyTimer);
        try {
          turnstileWidgetId = window.turnstile.render(turnstileWidget, {
            sitekey: TURNSTILE_SITE_KEY,
            action: 'website_signup',
            theme: 'dark',
            callback: function (token) {
              turnstileToken = token;
              verificationUnavailable = false;
              turnstileStatus.textContent = 'Secure verification complete.';
              hideError();
              updateSubmitState();
            },
            'expired-callback': function () {
              turnstileToken = '';
              turnstileStatus.textContent = 'Verification expired. Please check the box again.';
              updateSubmitState();
            },
            'error-callback': function () {
              turnstileToken = '';
              turnstileStatus.textContent = 'Verification could not load. Please try again.';
              updateSubmitState();
              return true;
            },
            'unsupported-callback': function () {
              turnstileToken = '';
              turnstileStatus.textContent = 'This browser cannot run secure verification.';
              updateSubmitState();
            }
          });
          turnstileStatus.textContent = 'Complete the security check to join.';
        } catch (_err) {
          setVerificationUnavailable();
        }
        return;
      }
      if (checks >= 100) {
        clearInterval(readyTimer);
        setVerificationUnavailable();
      }
    }, 100);
  }

  function setVerificationUnavailable() {
    verificationUnavailable = true;
    turnstileToken = '';
    if (turnstileStatus) {
      turnstileStatus.textContent = 'Signups are briefly unavailable. Please try again soon.';
    }
    updateSubmitState();
  }

  function resetVerification() {
    turnstileToken = '';
    if (turnstileWidgetId !== null && window.turnstile &&
      typeof window.turnstile.reset === 'function') {
      window.turnstile.reset(turnstileWidgetId);
      turnstileStatus.textContent = 'Complete the security check to try again.';
    }
    updateSubmitState();
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
    if (verificationUnavailable) return showError('Signups are briefly unavailable. Please try again soon.');
    if (!turnstileToken) return showError('Complete the security check first.');

    setLoading(true);

    try {
      var result = await SignupAPI.submit(fetch, {
        supabaseUrl: SUPABASE_URL,
        anonKey: SUPABASE_ANON_KEY
      }, SignupAPI.buildPayload({
        name: firstName,
        email: email,
        tier: tier,
        country: country,
        city: cityDisplay,
        cityId: cityId,
        newsletterOptIn: newsletter
      }, turnstileToken));

      if (!result.ok) {
        if (result.reason === 'rate_limited') {
          showError('A few too many tries. Take a breath and try again in 15 minutes.');
        } else if (result.reason === 'verification') {
          showError('That security check expired. Please try it again.');
        } else {
          showError('Signups are briefly unavailable. Please try again soon.');
        }
        resetVerification();
        setLoading(false);
        return;
      }

      form.hidden = true;
      successEl.hidden = false;
    } catch (err) {
      showError('Signups are briefly unavailable. Please try again soon.');
      resetVerification();
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
    loading = on;
    submitBtn.classList.toggle('btn--loading', on);
    var span = submitBtn.querySelector('span');
    if (span) span.textContent = on ? 'Signing up...' : "Join me";
    updateSubmitState();
  }

  function updateSubmitState() {
    submitBtn.disabled = loading || verificationUnavailable || !turnstileToken;
  }
})();
