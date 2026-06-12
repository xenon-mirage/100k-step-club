/* ============================================================
   100K STEP CLUB — WORLD MAP ENGINE
   Requires: d3 v7, topojson-client, map/data.js
   ============================================================ */
(function () {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const PARAMS = new URLSearchParams(location.search);
  const DIR = (PARAMS.get('dir') || document.body.dataset.dir || 'night');
  const EMBED = PARAMS.has('embed');
  document.body.dataset.dir = DIR;
  if (EMBED) document.body.classList.add('embedded');

  const GEO_URLS = [
    'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json',
    'https://unpkg.com/world-atlas@2/countries-110m.json'
  ];
  const TEX_SETS = {
    day: {
      base: ['https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-blue-marble.jpg',
             'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg'],
      clouds: ['https://cdn.jsdelivr.net/npm/three-globe/example/clouds/clouds.png',
               'https://unpkg.com/three-globe/example/clouds/clouds.png']
    },
    night: {
      base: ['https://unpkg.com/three-globe/example/img/earth-night.jpg',
             'https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-night.jpg']
    }
  };
  const texSet = TEX_SETS[DIR] || TEX_SETS.night;

  // ---- DOM refs ----
  const stage   = document.querySelector('.map-stage');
  const world   = document.querySelector('.map-world');
  const tex     = document.querySelector('.earth-tex');
  const svg     = document.querySelector('.vec');
  const dotsL   = document.querySelector('.dots-layer');
  const auroraL = document.querySelector('.aurora-layer');
  const hcard   = document.querySelector('.hover-card');
  const detail  = document.querySelector('.detail');
  const loader  = document.querySelector('.loader');
  const SVGNS = 'http://www.w3.org/2000/svg';

  // ---- data ----
  // Filled in boot(): live Supabase first (same views as the claim board),
  // falling back to whatever SEED holds.
  const data = { claims: SEED.claims, signup_only: SEED.signup_only };
  let idx = buildIndex(data);
  const byCountry = new Map();

  function rebuildIndex() {
    idx = buildIndex(data);
    byCountry.clear();
    idx.countriesList.forEach(co => byCountry.set(co.country, co));
  }
  rebuildIndex();

  // ---- state ----
  let worldW = 0, worldH = 0, worldHd = 0, stretch = 1, projection = null, geoPath = null;
  let transform = d3.zoomIdentity;
  let features = [];               // country features
  const litGroups = [];            // {el, country, co, tiers:Set}
  const dots = [];                 // {el, c, bx, by, claimed, tiers:Set, tier}
  let zoom = null;
  let filterTier = null;

  const PREFS_KEY = 'wm_prefs_v1';
  function loadPrefs(){ try { return JSON.parse(localStorage.getItem(PREFS_KEY)) || {}; } catch (e) { return {}; } }
  const prefs = Object.assign({ proj: 'miller', texture: true, clouds: true, aurora: true, labels: false }, loadPrefs());
  let projType = prefs.proj;
  function savePrefs(){ try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch (e) {} }

  function svgEl(tag, attrs) {
    const e = document.createElementNS(SVGNS, tag);
    if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }
  function tint(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`;
  }
  function hotCore(hex) {
    // blend tier color toward white for the crisp neon core
    const n = parseInt(hex.slice(1), 16);
    const r = (n>>16)&255, g = (n>>8)&255, b = n&255;
    const mix = (c) => Math.round(c + (255 - c) * 0.55);
    return `rgb(${mix(r)},${mix(g)},${mix(b)})`;
  }

  /* ============================================================ TEXTURE (reprojected to current projection) */
  const earthImg = new Image();
  const cloudsImg = new Image();
  earthImg.crossOrigin = 'anonymous';
  cloudsImg.crossOrigin = 'anonymous';
  let earthReady = false, cloudsReady = false;

  function loadImgChain(img, urls, onok){
    let i = 0;
    img.onload = onok;
    img.onerror = () => { i++; if (i < urls.length) img.src = urls[i]; };
    img.src = urls[0];
  }
  function loadTextures(){
    loadImgChain(earthImg, texSet.base, () => { earthReady = true; applyEarth(); finishLoad(); });
    if (texSet.clouds) loadImgChain(cloudsImg, texSet.clouds, () => { cloudsReady = true; applyClouds(); });
  }
  // Reproject an equirectangular source image onto a cylindrical projection by
  // remapping each output row to the latitude the projection puts there. Drawn
  // straight onto a display canvas (tainted-OK — we never read it back).
  function reprojectInto(canvas, srcImg, type, copies){
    copies = copies || 1;
    const TW = 2048;
    const mp = makeProjection(type, TW);
    const H = Math.max(2, Math.round(mp.H));
    canvas.width = TW * copies; canvas.height = H;
    const ctx = canvas.getContext('2d');
    const sW = srcImg.naturalWidth, sH = srcImg.naturalHeight;
    if (!sW) return;
    for (let oy = 0; oy < H; oy++){
      const ll = mp.projection.invert([TW / 2, oy + 0.5]);
      if (!ll) continue;
      let lat = ll[1]; if (lat > 90) lat = 90; if (lat < -90) lat = -90;
      let sy = (90 - lat) / 180 * sH; sy = Math.max(0, Math.min(sH - 1, sy));
      for (let cx = 0; cx < copies; cx++) ctx.drawImage(srcImg, 0, sy, sW, 1, cx * TW, oy, TW, 1);
    }
  }
  function applyEarth(){ if (earthReady) reprojectInto(tex, earthImg, projType, 1); }
  function applyClouds(){ const cc = document.querySelector('.clouds-canvas'); if (cc && cloudsReady) reprojectInto(cc, cloudsImg, projType, 2); }

  let loaded = false;
  function finishLoad() {
    if (loaded) return; loaded = true;
    loader && loader.classList.add('gone');
    setTimeout(() => loader && loader.remove(), 700);
  }

  /* ============================================================ GEO */
  async function loadGeo() {
    for (const url of GEO_URLS) {
      try {
        const r = await fetch(url); if (!r.ok) continue;
        const topo = await r.json();
        const fc = topo.type === 'Topology'
          ? topojson.feature(topo, topo.objects.countries) : topo;
        return fc.features;
      } catch (e) { /* next */ }
    }
    return [];
  }

  /* ============================================================ LAYOUT */
  // Build a cylindrical projection fitted to width W, translated to sit in a
  // [0..W] x [0..H] box. Returns the projection + its natural height.
  function makeProjection(type, W){
    let p, north;
    if (type === 'equirect') { p = d3.geoEquirectangular(); north = 85; }
    else if (type === 'mercator') { p = d3.geoMercator(); north = 83; }
    else { p = (d3.geoMiller ? d3.geoMiller() : d3.geoEquirectangular()); north = 85; }
    const south = -60;   // crop Antarctica (southernmost data ≈ Cape Horn -56, NZ -47)
    const bbox = { type: 'Polygon', coordinates: [[[-180, north],[-90, north],[0, north],[90, north],[180, north],[180, south],[90, south],[0, south],[-90, south],[-180, south],[-180, north]]] };
    p.fitWidth(W, bbox);
    const b = d3.geoPath(p).bounds(bbox);
    const H = b[1][1] - b[0][1];
    const t = p.translate();
    p.translate([t[0] - b[0][0], t[1] - b[0][1]]);
    return { projection: p, W: W, H: H, latMax: north };
  }

  function computeSize() {
    const sw = stage.clientWidth, sh = stage.clientHeight;
    const aspect = makeProjection(projType, 1000).H / 1000;   // natural H per width
    // contain-fit the natural map into the stage
    let W, H0;
    if (sw * aspect <= sh) { W = sw; H0 = sw * aspect; }
    else { H0 = sh; W = sh / aspect; }
    // mild vertical fill so we don't sit as a short letterboxed band
    const maxS = projType === 'equirect' ? 1.22 : projType === 'miller' ? 1.08 : 1.04;
    stretch = Math.max(1, Math.min(sh / H0, maxS));
    worldW = W;
    const dp = makeProjection(projType, worldW);
    worldH = dp.H;
    worldHd = worldH * stretch;
    world.style.width = worldW + 'px';
    world.style.height = worldHd + 'px';
    projection = dp.projection;
    projection.clipExtent([[-2, -2], [worldW + 2, worldH + 2]]);
    geoPath = d3.geoPath(projection);
    svg.setAttribute('viewBox', `0 0 ${worldW} ${worldH}`);
    svg.setAttribute('preserveAspectRatio', 'none');
  }

  /* ============================================================ RENDER VECTORS */
  function renderVectors() {
    svg.innerHTML = '';
    // Animated rainbow gradient for "grand slam" countries (all six tiers held).
    // Flows horizontally across the outline; seamless because the tile repeats.
    svg.insertAdjacentHTML('beforeend',
      '<defs><linearGradient id="tierRainbow" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="320" y2="0" spreadMethod="repeat">' +
      '<stop offset="0" stop-color="#FBBF24"/><stop offset="0.17" stop-color="#3B82F6"/>' +
      '<stop offset="0.34" stop-color="#10B981"/><stop offset="0.5" stop-color="#D4602E"/>' +
      '<stop offset="0.66" stop-color="#8B5CF6"/><stop offset="0.83" stop-color="#FFFFFF"/>' +
      '<stop offset="1" stop-color="#FBBF24"/>' +
      (reduced ? '' : '<animateTransform attributeName="gradientTransform" type="translate" from="0 0" to="320 0" dur="4.5s" repeatCount="indefinite"/>') +
      '</linearGradient></defs>');
    // graticule + sphere
    const grat = d3.geoGraticule().step([20, 20]);
    svg.appendChild(svgEl('path', { d: geoPath(grat()), class: 'graticule' }));
    svg.appendChild(svgEl('path', { d: geoPath({ type: 'Sphere' }), class: 'sphere-outline' }));

    const unclaimed = svgEl('g', {});
    const lit = svgEl('g', {});
    litGroups.length = 0;

    features.forEach(f => {
      const raw = f.properties && (f.properties.name || f.properties.NAME || f.properties.ADMIN);
      if (!raw) return;
      const name = normalizeCountryName(raw);
      if (name === 'Antarctica') return;
      const co = byCountry.get(name);
      const d = geoPath(f);
      if (!d) return;

      if (co && co.dominantTier) {
        const hex = TIER_HEX[co.dominantTier];
        const tiers = new Set();
        co.cities.forEach(ct => Object.keys(ct.claims).forEach(t => tiers.add(t)));
        const grand = TIER_ORDER.every(t => tiers.has(t));
        const pinnacle = co.dominantTier === '100K';
        let cls = 'lit';
        if (grand) cls += ' grandslam';
        else if (pinnacle) cls += ' pinnacle';
        const g = svgEl('g', { class: cls });
        g.style.setProperty('--gc', hex);
        g.style.setProperty('--gcore', hotCore(hex));
        g.appendChild(svgEl('path', { d, class: 'fill' }));
        g.appendChild(svgEl('path', { d, class: 'g4' }));
        g.appendChild(svgEl('path', { d, class: 'g3' }));
        g.appendChild(svgEl('path', { d, class: 'g2' }));
        g.appendChild(svgEl('path', { d, class: 'core' }));
        const hit = svgEl('path', { d, class: 'hit' });
        attachCountry(hit, co, f);
        g.appendChild(hit);
        lit.appendChild(g);
        litGroups.push({ el: g, country: name, co, tiers });
      } else if (co) {
        // signup-only country
        const p = svgEl('path', { d, class: 'land-signup' });
        attachCountry(p, co, f);
        unclaimed.appendChild(p);
      } else {
        const p = svgEl('path', { d, class: 'land-un' });
        unclaimed.appendChild(p);
      }
    });
    svg.appendChild(unclaimed);
    svg.appendChild(lit);
  }

  function attachCountry(el, co, feat) {
    el.addEventListener('pointermove', (e) => { showCountryCard(co, e); highlightLit(co.country, true); });
    el.addEventListener('pointerleave', () => { hideCard(); highlightLit(co.country, false); });
    el.addEventListener('click', (e) => { e.stopPropagation(); openCountry(co, feat); });
  }
  function highlightLit(name, on) {
    const g = litGroups.find(l => l.country === name);
    if (g) g.el.classList.toggle('on', on);
  }

  /* ============================================================ AURORA */
  function renderAurora() {
    auroraL.innerHTML = '';
    if (DIR === 'ink') return;
    features.forEach(f => {
      const raw = f.properties && f.properties.name;
      const co = byCountry.get(normalizeCountryName(raw || ''));
      if (!co || !co.dominantTier) return;
      const c = d3.geoCentroid(f);
      const [x, y] = projection(c);
      const b = d3.geoBounds(f); // [[w,s],[e,n]]
      const wDeg = Math.abs(b[1][0] - b[0][0]);
      const hDeg = Math.abs(b[1][1] - b[0][1]);
      const px = (Math.max(wDeg, hDeg) / 360) * worldW;
      const size = Math.max(70, Math.min(px * 1.7, worldW * 0.3));
      const hex = TIER_HEX[co.dominantTier];
      const a = svgDiv('aurora');
      a.style.left = x + 'px'; a.style.top = (y * stretch) + 'px';
      a.style.width = size + 'px'; a.style.height = size + 'px';
      a.style.background = `radial-gradient(circle, ${tint(hex, .55)} 0%, ${tint(hex, .18)} 38%, transparent 70%)`;
      a.style.animationDelay = (-Math.random() * 9) + 's';
      if (reduced) a.style.animation = 'none';
      auroraL.appendChild(a);
    });
  }
  function svgDiv(cls) { const d = document.createElement('div'); d.className = cls; return d; }

  /* ============================================================ DOTS */
  function renderDots() {
    dotsL.innerHTML = '';
    dots.length = 0;
    idx.cities.forEach(c => {
      const [bx, by] = projection([c.lon, c.lat]);
      const tier = cityHighestTier(c);
      const claimed = !!tier;
      const el = document.createElement('div');
      el.className = 'dot' + (claimed ? '' : ' signup');
      if (claimed) {
        const hex = TIER_HEX[tier];
        el.style.setProperty('--dc', hex);
        const sz = 7 + TIER_PRESTIGE[tier] * 1.4;
        el.style.setProperty('--core', sz + 'px');
        if (TIER_PRESTIGE[tier] >= 5) el.classList.add('hot');
        el.innerHTML = '<span class="halo"></span><span class="core"></span><span class="label">' + c.city + '</span>';
      } else {
        el.innerHTML = '<span class="core"></span><span class="label">' + c.city + '</span>';
      }
      const tiers = new Set(Object.keys(c.claims));
      el.addEventListener('pointermove', (e) => { e.stopPropagation(); showCityCard(c, e); });
      el.addEventListener('pointerleave', hideCard);
      el.addEventListener('click', (e) => { e.stopPropagation(); openCity(c); });
      dotsL.appendChild(el);
      dots.push({ el, c, bx, by, claimed, tiers, tier });
    });
    positionDots();
  }

  function positionDots() {
    const k = transform.k;
    const showSignup = k > 1.45;
    const showLabel = k > 1.9;
    dots.forEach(d => {
      const x = transform.x + d.bx * k;
      const y = transform.y + d.by * stretch * k;
      d.el.style.transform = `translate(${x}px,${y}px) translate(-50%,-50%)`;
      let vis = true;
      if (!d.claimed && !showSignup) vis = false;
      if (filterTier && !(d.claimed && d.tiers.has(filterTier))) vis = false;
      d.el.style.display = vis ? '' : 'none';
      d.el.classList.toggle('show-label', showLabel && d.claimed);
    });
  }

  /* ============================================================ ZOOM */
  function setupZoom() {
    zoom = d3.zoom()
      .scaleExtent([1, 11])
      .constrain((t) => {
        const sw = stage.clientWidth, sh = stage.clientHeight;
        const sW = worldW * t.k, sH = worldHd * t.k;
        let x = t.x, y = t.y;
        x = sW <= sw ? (sw - sW) / 2 : Math.max(sw - sW, Math.min(0, x));
        y = sH <= sh ? (sh - sH) / 2 : Math.max(sh - sH, Math.min(0, y));
        return d3.zoomIdentity.translate(x, y).scale(t.k);
      })
      .on('start', () => stage.classList.add('grabbing'))
      .on('end', () => stage.classList.remove('grabbing'))
      .on('zoom', (e) => {
        transform = e.transform;
        world.style.transform = `translate(${transform.x}px,${transform.y}px) scale(${transform.k})`;
        positionDots();
        updateZLevel();
      });
    d3.select(stage).call(zoom).on('dblclick.zoom', null);
    // init / recenter
    d3.select(stage).call(zoom.transform, d3.zoomIdentity);

    // zoom buttons
    document.querySelectorAll('.zbtn').forEach(b => b.addEventListener('click', (e) => {
      e.stopPropagation();
      const sel = d3.select(stage).transition().duration(420).ease(d3.easeCubicOut);
      const kind = b.dataset.zoom;
      if (kind === 'in') sel.call(zoom.scaleBy, 1.6);
      else if (kind === 'out') sel.call(zoom.scaleBy, 0.62);
      else { filterTier = null; const lg = document.querySelector('.legend'); if (lg) applyFilter(lg); sel.call(zoom.transform, d3.zoomIdentity); }
    }));
  }

  function zoomTo(lon, lat, k, ms) {
    const sw = stage.clientWidth, sh = stage.clientHeight;
    const [bx, by] = projection([lon, lat]);
    const tx = sw / 2 - bx * k, ty = sh / 2 - by * stretch * k;
    d3.select(stage).transition().duration(ms || 900).ease(d3.easeCubicInOut)
      .call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(k));
  }
  function zoomToFeature(feat, k) {
    const c = d3.geoCentroid(feat);
    zoomTo(c[0], c[1], k || 3.4);
  }
  function updateZLevel() {
    const z = document.querySelector('.zlevel');
    if (z) z.textContent = transform.k.toFixed(1) + '×';
  }

  /* ============================================================ HOVER CARDS */
  function placeCard(e) {
    const r = stage.getBoundingClientRect();
    let x = e.clientX, y = e.clientY;
    hcard.style.left = x + 'px';
    hcard.style.top = y + 'px';
    // keep on screen
    const cw = hcard.offsetWidth, ch = hcard.offsetHeight;
    if (x - cw / 2 < r.left + 8) hcard.style.left = (r.left + 8 + cw / 2) + 'px';
    if (x + cw / 2 > r.right - 8) hcard.style.left = (r.right - 8 - cw / 2) + 'px';
    if (y - ch - 16 < r.top + 8) hcard.style.transform = 'translate(-50%, 22px)';
    else hcard.style.transform = 'translate(-50%, calc(-100% - 16px))';
  }
  function tierBadge(tier, cls) {
    if (!tier) return '';
    return `<span class="${cls || 'hc-tier'}" style="background:${tint(TIER_HEX[tier],.14)};color:${TIER_HEX[tier]}">
      <span class="pd" style="background:${TIER_HEX[tier]}"></span>${tier} · ${TIER_NAMES[tier]}</span>`;
  }
  function showCountryCard(co, e) {
    const a = co.agg;
    let body;
    if (!co.dominantTier) {
      body = `<div class="hc-top"><span class="hc-name">${co.country}</span></div>
        <div class="hc-unclaimed">${a.members} signed up · no tier claimed yet</div>
        <div class="hc-foot">Be the first <span class="arr">→</span></div>`;
    } else {
      const slam = a.grandSlam ? `<div class="hc-slam">Grand slam · all six tiers</div>` : '';
      body = `<div class="hc-top"><span class="hc-name">${co.country}</span>${tierBadge(co.dominantTier)}</div>
        ${slam}
        <div class="hc-steps"><span class="k">Steps walked</span><span class="v">${fmtSteps(a.steps)}</span></div>
        <div class="hc-grid">
          <div class="hc-cell"><div class="k">Walkers</div><div class="v"><span class="mono">${a.walkers}</span></div></div>
          <div class="hc-cell"><div class="k">Cities lit</div><div class="v"><span class="mono">${a.claimed}</span><span style="color:var(--text-dim)"> / ${a.members}</span></div></div>
          <div class="hc-cell"><div class="k">Top city</div><div class="v">${a.topCity.city}</div></div>
          <div class="hc-cell"><div class="k">Fastest</div><div class="v"><span class="mono">${fmtTime(a.fastest.time_seconds)}</span></div></div>
          <div class="hc-cell full"><div class="k">Most recent</div><div class="v">${a.recent.holder} · ${a.recent.city} <span style="color:var(--text-dim);font-weight:500">${fmtDate(a.recent.date)}</span></div></div>
        </div>
        <div class="hc-foot">Click to explore <span class="arr">→</span></div>`;
    }
    hcard.innerHTML = body;
    hcard.classList.add('on');
    placeCard(e);
  }
  function showCityCard(c, e) {
    const tier = cityHighestTier(c);
    let body;
    if (!tier) {
      body = `<div class="hc-top"><span class="hc-name">${c.city}</span></div>
        <div class="hc-unclaimed">${c.country} · signed up, unclaimed</div>
        <div class="hc-foot">Be the first <span class="arr">→</span></div>`;
    } else {
      const cl = c.claims[tier][0];
      const walkers = cityWalkers(c);
      body = `<div class="hc-top"><span class="hc-name">${c.city}</span>${tierBadge(tier)}</div>
        <div class="hc-steps"><span class="k">Steps walked</span><span class="v">${fmtSteps(citySteps(c))}</span></div>
        <div class="hc-grid">
          <div class="hc-cell"><div class="k">Holder</div><div class="v">${cl.holder}</div></div>
          <div class="hc-cell"><div class="k">Time</div><div class="v"><span class="mono">${fmtTime(cl.time_seconds)}</span></div></div>
          <div class="hc-cell"><div class="k">Walkers</div><div class="v"><span class="mono">${walkers}</span></div></div>
          <div class="hc-cell"><div class="k">Claimed</div><div class="v" style="font-size:.74rem">${fmtDate(cl.date)}</div></div>
        </div>
        <div class="hc-foot">${c.country} · click to explore <span class="arr">→</span></div>`;
    }
    hcard.innerHTML = body;
    hcard.classList.add('on');
    placeCard(e);
  }
  function hideCard() { hcard.classList.remove('on'); }

  /* ============================================================ DETAIL PANEL */
  function openCountry(co, feat) {
    hideCard();
    const a = co.agg;
    const dt = co.dominantTier;
    const tiersHeld = a.tiersHeld;
    let rows = '';
    const claimedCities = co.cities.filter(ct => Object.keys(ct.claims).length).sort((x, y) =>
      TIER_PRESTIGE[cityHighestTier(y)] - TIER_PRESTIGE[cityHighestTier(x)]);
    claimedCities.forEach(ct => {
      const t = cityHighestTier(ct); const cl = ct.claims[t][0];
      rows += drow(TIER_HEX[t], ct.city, t + ' · ' + TIER_NAMES[t], fmtTime(cl.time_seconds), cl.holder);
    });
    const signups = co.cities.filter(ct => !Object.keys(ct.claims).length);
    let signupHtml = '';
    if (signups.length) {
      signupHtml = `<div class="d-sec-h">Signed up</div>` + signups.map(ct =>
        drow('#5c5852', ct.city, 'Unclaimed', '', '')).join('');
    }
    detail.innerHTML = `
      <div class="detail-hd">
        <div class="detail-close" data-close><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></div>
        <div class="detail-eyebrow">${dt ? tiersHeld.length + ' tiers held' : 'Awaiting first claim'}</div>
        <div class="detail-title">${co.country}</div>
        <div class="detail-tierline">${dt ? tierBadge(dt, 'tier-badge') : '<span class="hc-unclaimed">No tier claimed yet</span>'}</div>
      </div>
      <div class="detail-body">
        ${dt ? `<div class="dhero${a.grandSlam ? ' slam' : ''}"><div class="dhero-n">${fmtSteps(a.steps)}</div><div class="dhero-k">steps walked${a.grandSlam ? ' · grand slam' : ''}</div></div>` : ''}
        ${dt ? `<div class="dstat-row">
          <div class="dstat"><div class="k">Walkers</div><div class="v">${a.walkers}</div></div>
          <div class="dstat"><div class="k">Cities lit</div><div class="v">${a.claimed}<small> / ${a.members}</small></div></div>
          <div class="dstat"><div class="k">Fastest</div><div class="v">${fmtTime(a.fastest.time_seconds)}</div></div>
          <div class="dstat"><div class="k">Latest</div><div class="v" style="font-size:1rem">${fmtDate(a.recent.date)}</div></div>
        </div>` : `<div class="dstat-row"><div class="dstat"><div class="k">Signed up</div><div class="v">${a.members}</div></div></div>`}
        ${rows ? `<div class="d-sec-h">Claimed cities</div>` + rows : ''}
        ${signupHtml}
      </div>
      <a class="detail-cta" href="https://www.100kstepclub.com/leaderboard.html" target="_blank" rel="noopener">
        View on the claim board <span class="arr">→</span></a>`;
    revealDetail();
    detail.querySelector('[data-close]').onclick = closeDetail;
    if (feat) zoomToFeature(feat);
  }

  function openCity(c) {
    hideCard();
    const tier = cityHighestTier(c);
    let rows = '';
    TIER_ORDER.forEach(t => {
      if (!c.claims[t]) return;
      c.claims[t].forEach((cl, i) => {
        rows += drow(TIER_HEX[t], i === 0 ? t + ' · ' + TIER_NAMES[t] : '· rank ' + (i + 1),
          i === 0 ? cl.holder : '', fmtTime(cl.time_seconds), '', fmtDate(cl.date));
      });
    });
    if (!rows) rows = `<div style="font-family:var(--sans);color:var(--text-mid);font-style:italic;padding:8px 0">Signed up — no tier claimed yet. Be the first.</div>`;
    detail.innerHTML = `
      <div class="detail-hd">
        <div class="detail-close" data-close><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></div>
        <div class="detail-eyebrow">${c.country}${c.state ? ' · ' + c.state : ''}</div>
        <div class="detail-title">${c.city}</div>
        <div class="detail-tierline">${tier ? tierBadge(tier, 'tier-badge') : '<span class="hc-unclaimed">Unclaimed</span>'}</div>
      </div>
      <div class="detail-body">
        ${tier ? `<div class="dhero"><div class="dhero-n">${fmtSteps(citySteps(c))}</div><div class="dhero-k">steps walked</div></div>` : ''}
        <div class="d-sec-h">Tier holders</div>
        ${rows}
      </div>
      <a class="detail-cta" href="https://www.100kstepclub.com/leaderboard.html" target="_blank" rel="noopener">
        View on the claim board <span class="arr">→</span></a>`;
    revealDetail();
    detail.querySelector('[data-close]').onclick = closeDetail;
    zoomTo(c.lon, c.lat, Math.max(transform.k, 4));
  }

  function drow(color, label, sub, time, holderRight, dateRight) {
    return `<div class="drow">
      <span class="dd" style="color:${color};background:${color}"></span>
      <div class="dl">${label}${sub ? `<span class="sub">${sub}</span>` : ''}</div>
      <div class="dr">${time ? `<div class="tm">${time}</div>` : ''}${(holderRight || dateRight) ? `<div class="dt">${holderRight || dateRight}</div>` : ''}</div>
    </div>`;
  }
  function revealDetail() {
    detail.classList.remove('closing');
    detail.classList.add('on');
  }
  function closeDetail() {
    if (!detail.classList.contains('on')) return;
    detail.classList.remove('on');
    detail.classList.add('closing');
    setTimeout(() => detail.classList.remove('closing'), 360);
  }
  stage.addEventListener('click', () => { if (detail.classList.contains('on')) closeDetail(); });

  /* ============================================================ LEGEND / FILTER */
  function setupLegend() {
    const legend = document.querySelector('.legend');
    if (!legend) return;
    // counts per tier (countries holding tier)
    const countByTier = {};
    TIER_ORDER.forEach(t => countByTier[t] = 0);
    idx.countries.forEach(co => {
      const held = new Set();
      co.cities.forEach(ct => Object.keys(ct.claims).forEach(x => held.add(x)));
      held.forEach(x => countByTier[x]++);
    });
    legend.querySelectorAll('.tier-chip').forEach(chip => {
      const t = chip.dataset.tier;
      chip.addEventListener('click', () => {
        filterTier = (filterTier === t) ? null : t;
        applyFilter(legend);
      });
    });
  }
  function applyFilter(legend) {
    legend.classList.toggle('filtered', !!filterTier);
    legend.querySelectorAll('.tier-chip').forEach(c => c.classList.toggle('active', c.dataset.tier === filterTier));
    world.classList.toggle('dim', !!filterTier);
    litGroups.forEach(l => l.el.classList.toggle('on', !!filterTier && l.tiers.has(filterTier)));
    positionDots();
  }

  /* ============================================================ SEARCH */
  function setupSearch() {
    const input = document.querySelector('.search input');
    const results = document.querySelector('.search-results');
    if (!input) return;
    const entries = [];
    idx.cities.forEach(c => entries.push({ type: 'city', name: c.city, sub: c.country, c, tier: cityHighestTier(c) }));
    idx.countries.forEach(co => entries.push({ type: 'country', name: co.country, sub: co.dominantTier ? co.claimed + ' lit' : 'signed up', co, tier: co.dominantTier }));

    function run(q) {
      q = q.trim().toLowerCase();
      if (!q) { results.classList.remove('on'); return; }
      const hits = entries.filter(e => e.name.toLowerCase().includes(q) || e.sub.toLowerCase().includes(q)).slice(0, 8);
      if (!hits.length) { results.innerHTML = '<div class="sr-item"><span class="sr-name" style="color:var(--text-dim)">No match</span></div>'; results.classList.add('on'); return; }
      results.innerHTML = hits.map((h, i) => `
        <div class="sr-item" data-i="${i}">
          <span class="sr-dot" style="color:${h.tier ? TIER_HEX[h.tier] : '#5c5852'}"></span>
          <span class="sr-name">${h.name}</span>
          <span class="sr-meta">${h.type === 'city' ? h.sub : (h.tier ? TIER_NAMES[h.tier] : 'unclaimed')}</span>
        </div>`).join('');
      results.classList.add('on');
      results.querySelectorAll('.sr-item').forEach((el, i) => el.onclick = () => {
        const h = hits[i];
        results.classList.remove('on'); input.value = h.name;
        if (h.type === 'city') openCity(h.c);
        else { const feat = features.find(f => normalizeCountryName(f.properties.name || '') === h.co.country); if (feat) openCountry(h.co, feat); }
      });
    }
    input.addEventListener('input', () => run(input.value));
    input.addEventListener('focus', () => { if (input.value) run(input.value); });
    document.addEventListener('click', (e) => { if (!e.target.closest('.search')) results.classList.remove('on'); });
  }

  /* ============================================================ CLAIM PINGS */
  function startPings() {
    if (reduced) return;
    const claimed = () => dots.filter(d => d.claimed && d.el.style.display !== 'none');
    setInterval(() => {
      const pool = claimed(); if (!pool.length) return;
      const d = pool[Math.floor(Math.random() * pool.length)];
      const x = transform.x + d.bx * transform.k;
      const y = transform.y + d.by * transform.k;
      if (x < 0 || y < 0 || x > stage.clientWidth || y > stage.clientHeight) return;
      const p = document.createElement('div');
      p.className = 'ping';
      p.style.setProperty('--dc', TIER_HEX[d.tier]);
      p.style.left = x + 'px'; p.style.top = y + 'px';
      p.style.borderColor = TIER_HEX[d.tier];
      dotsL.appendChild(p);
      setTimeout(() => p.remove(), 2600);
    }, DIR === 'aurora' ? 2400 : 3400);
  }

  /* ============================================================ HEADER STATS */
  function fillStats() {
    const s = idx.stats;
    const strip = document.querySelector('.mh-sub');
    if (strip) strip.innerHTML =
      `<span><span class="n">${s.claimedCities}</span> Cities lit</span><span class="sep">·</span>` +
      `<span><span class="n">${s.claimedCountries}</span> Countries</span><span class="sep">·</span>` +
      `<span><span class="n">${s.totalWalkers}</span> Walkers</span>`;
  }

  /* ============================================================ SETTINGS */
  function applyPrefsClasses(){
    document.body.classList.toggle('tex-off', !prefs.texture);
    document.body.classList.toggle('clouds-off', !prefs.clouds);
    document.body.classList.toggle('aurora-off', !prefs.aurora);
    document.body.classList.toggle('labels-on', !!prefs.labels);
  }
  function setProjection(type){
    if (type === projType) return;
    projType = type; prefs.proj = type; savePrefs();
    computeSize();
    applyEarth(); applyClouds();
    renderVectors(); renderAurora(); renderDots();
    d3.select(stage).call(zoom.transform, d3.zoomIdentity);
  }
  function setupSettings(){
    const panel = document.getElementById('settings');
    const gear = document.querySelector('[data-gear]');
    if (!panel || !gear) return;
    const open = () => { panel.classList.add('on'); gear.classList.add('active'); };
    const close = () => { panel.classList.remove('on'); gear.classList.remove('active'); };
    gear.addEventListener('click', (e) => { e.stopPropagation(); panel.classList.contains('on') ? close() : open(); });
    panel.querySelector('[data-setclose]').addEventListener('click', close);
    panel.addEventListener('click', (e) => e.stopPropagation());
    document.addEventListener('click', (e) => { if (!e.target.closest('.settings') && !e.target.closest('[data-gear]')) close(); });

    const syncSeg = (name, val) => panel.querySelectorAll('.seg[data-set="' + name + '"] button')
      .forEach(b => b.classList.toggle('on', b.dataset.val === String(val)));
    syncSeg('proj', prefs.proj);
    syncSeg('texture', prefs.texture ? '1' : '0');
    panel.querySelectorAll('.seg[data-set="proj"] button').forEach(b => b.addEventListener('click', () => { syncSeg('proj', b.dataset.val); setProjection(b.dataset.val); }));
    panel.querySelectorAll('.seg[data-set="texture"] button').forEach(b => b.addEventListener('click', () => {
      prefs.texture = b.dataset.val === '1'; savePrefs(); syncSeg('texture', b.dataset.val); applyPrefsClasses();
    }));
    panel.querySelectorAll('.set-toggle').forEach(row => {
      const name = row.dataset.set; const tgl = row.querySelector('.tgl');
      const sync = () => { tgl.classList.toggle('on', !!prefs[name]); tgl.setAttribute('aria-pressed', String(!!prefs[name])); };
      sync();
      tgl.addEventListener('click', () => { prefs[name] = !prefs[name]; savePrefs(); sync(); applyPrefsClasses(); });
    });
  }

  /* ============================================================ BOOT */
  async function boot() {
    applyPrefsClasses();
    loadTextures();
    computeSize();
    // Live data + geometry in parallel — the map renders real claims.
    const [live, feats] = await Promise.all([
      (typeof loadLiveData === 'function' ? loadLiveData() : Promise.resolve(null)),
      loadGeo()
    ]);
    if (live && (live.claims.length || live.signup_only.length)) {
      data.claims = live.claims;
      data.signup_only = live.signup_only;
      rebuildIndex();
    }
    features = feats;
    fillStats();
    renderVectors();
    renderAurora();
    renderDots();
    setupZoom();
    setupLegend();
    setupSearch();
    setupSettings();
    setupEmbedBridge();
    startPings();
    finishLoad();

    let rt;
    addEventListener('resize', () => {
      clearTimeout(rt);
      rt = setTimeout(() => {
        computeSize();
        renderVectors();
        renderAurora();
        renderDots();
        d3.select(stage).call(zoom.transform, d3.zoomIdentity);
      }, 200);
    });
  }

  /* ============================================================ EMBED BRIDGE
     When the map lives in an iframe at the bottom of the claim board, the
     parent page's merged settings panel drives it via postMessage, and the
     "view on the claim board" CTA scrolls the parent instead of navigating. */
  function setupEmbedBridge() {
    addEventListener('message', (e) => {
      const m = e.data && e.data.wm;
      if (!m || typeof m !== 'object') return;
      if (m.key === 'proj') {
        const panel = document.getElementById('settings');
        if (panel) panel.querySelectorAll('.seg[data-set="proj"] button')
          .forEach(b => b.classList.toggle('on', b.dataset.val === m.val));
        setProjection(m.val);
      } else if (m.key === 'texture') {
        prefs.texture = !!m.val; savePrefs(); applyPrefsClasses();
      } else if (m.key === 'clouds' || m.key === 'aurora' || m.key === 'labels') {
        prefs[m.key] = !!m.val; savePrefs(); applyPrefsClasses();
      } else if (m.key === 'getPrefs') {
        if (e.source) e.source.postMessage({ wmPrefs: Object.assign({}, prefs, { proj: projType }) }, '*');
      }
    });
    if (EMBED) {
      // CTA → tell the parent to scroll back up to the globe
      document.addEventListener('click', (e) => {
        const a = e.target.closest('.detail-cta');
        if (!a) return;
        e.preventDefault();
        try { parent.postMessage({ wmNav: 'board' }, '*'); } catch (err) {}
      });
      // announce readiness so the parent can sync its settings controls
      try { parent.postMessage({ wmReady: true, wmPrefs: Object.assign({}, prefs, { proj: projType }) }, '*'); } catch (err) {}
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.__worldmap = { zoomTo, zoomToFeature, openCity, openCountry, closeDetail, setProjection, get projType() { return projType; }, get transform() { return transform; }, get idx() { return idx; }, byCountry, get features() { return features; } };
})();
