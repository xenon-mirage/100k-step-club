/* ============================================================
   100K STEP CLUB — CLAIM BOARD
   Globe + list + filter + state toggles
   ============================================================ */
(function () {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Helpers ---------- */
  function fmtTime(sec) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    if (h === 0) return m + 'm';
    return h + 'h ' + String(m).padStart(2, '0') + 'm';
  }
  function fmtDate(iso) {
    const d = new Date(iso + 'T00:00:00Z');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  }
  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  /* ---------- Persist tweaks ---------- */
  function persistState() {
    try {
      window.parent.postMessage({ type: '__edit_mode_set_keys', edits: {
        state: state.state,
        globeStyle: state.globeStyle,
        tierFilter: state.tierFilter,
        showSignup: state.showSignup,
        rotationSpeed: state.rotationSpeed,
        copyVariant: state.copyVariant
      }}, '*');
    } catch (e) {}
  }

  /* ---------- Render hero ---------- */
  function renderHero(stats) {
    const strip = document.getElementById('statStrip');
    const walkers = state.state === 'pre' ? 142 : stats.totalWalkers + 117; // narrative: "142 walkers" verified + signed up in pre
    const walkerCount = state.state === 'pre' ? stats.totalWalkers + 136 : stats.totalWalkers;
    strip.innerHTML =
      '<span class="n">' + stats.claimedCities + '</span> Cities claimed ' +
      '<span class="sep">·</span> ' +
      '<span class="n">' + stats.countryCount + '</span> Countries ' +
      '<span class="sep">·</span> ' +
      '<span class="n">' + walkerCount + '</span> Walkers';

    const variants = HERO_COPY[state.state];
    const idx = Math.min(state.copyVariant || 0, variants.length - 1);
    document.getElementById('heroLine').innerHTML = variants[idx];
  }

  /* ---------- Render list ---------- */
  let currentIndex = null;

  function renderList() {
    const list = document.getElementById('list');
    list.innerHTML = '';
    const data = activeData();
    const idx = buildIndex(data);
    currentIndex = idx;

    renderHero(idx.stats);

    idx.countriesList.forEach(co => {
      const cNode = el('div', 'country');
      cNode.dataset.country = co.country;
      if (co.dominantTier) cNode.dataset.tierColor = co.dominantTier;

      const head = el('button', 'country-head');
      head.type = 'button';
      head.innerHTML = `
        <span class="country-dot" aria-hidden="true"></span>
        <span class="country-name">${co.country}</span>
        <span class="country-frac"><span class="claimed">${co.claimed}</span> Claimed / ${co.members}</span>
        <svg class="caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
      `;
      head.addEventListener('click', () => {
        cNode.classList.toggle('open');
        head.setAttribute('aria-expanded', cNode.classList.contains('open'));
      });
      head.setAttribute('aria-expanded', 'false');
      cNode.appendChild(head);

      const citiesWrap = el('div', 'cities');
      if (co.subdivisions && co.subdivisions.length) {
        co.subdivisions.forEach(sub => {
          const sNode = el('div', 'subdiv');
          sNode.dataset.subdiv = sub.name;
          if (sub.dominantTier) sNode.dataset.tierColor = sub.dominantTier;

          const sHead = el('button', 'subdiv-head');
          sHead.type = 'button';
          sHead.innerHTML = `
            <span class="subdiv-dot" aria-hidden="true"></span>
            <span class="subdiv-name">${sub.name}</span>
            <span class="subdiv-frac"><span class="claimed">${sub.claimed}</span> Claimed / ${sub.members}</span>
            <svg class="caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
          `;
          sHead.addEventListener('click', () => {
            sNode.classList.toggle('open');
            sHead.setAttribute('aria-expanded', sNode.classList.contains('open'));
          });
          sHead.setAttribute('aria-expanded', 'false');
          sNode.appendChild(sHead);

          const sCities = el('div', 'cities');
          sub.cities.forEach(ct => sCities.appendChild(renderCity(ct)));
          sNode.appendChild(sCities);

          citiesWrap.appendChild(sNode);
        });
      } else {
        co.cities.forEach(ct => citiesWrap.appendChild(renderCity(ct)));
      }
      cNode.appendChild(citiesWrap);

      list.appendChild(cNode);
    });

    applyFilter();
  }

  function renderCity(ct) {
    const cNode = el('div', 'city');
    cNode.dataset.city = ct.city;
    cNode.dataset.country = ct.country;

    const head = el('button', 'city-head');
    head.type = 'button';
    const tiersHeld = TIER_ORDER.filter(t => ct.claims[t]);
    const highest = tiersHeld.length ? tiersHeld[tiersHeld.length - 1] : null;

    head.innerHTML = `
      <span class="city-dot" aria-hidden="true" ${highest ? `data-tier="${highest}"` : ''}></span>
      <span class="city-name">${ct.city}</span>
      ${highest
        ? `<span class="tier-pill" data-tier="${highest}"><span class="pill-dot"></span>${highest}<span class="pill-name"> · ${TIER_NAMES[highest]}</span></span>`
        : `<span class="city-none">Unclaimed</span>`}
      <svg class="city-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18"></polyline></svg>
    `;
    head.addEventListener('click', () => {
      cNode.classList.toggle('open');
      head.setAttribute('aria-expanded', cNode.classList.contains('open'));
    });
    head.setAttribute('aria-expanded', 'false');
    cNode.appendChild(head);

    const panel = el('div', 'tiers-panel');
    TIER_ORDER.forEach(tier => {
      const claim = ct.claims[tier];
      const row = el('div', 'tier-row');
      row.dataset.tier = tier;
      if (claim) {
        row.dataset.claimed = 'true';
        row.innerHTML = `
          <span></span>
          <div class="tr-left">
            <div class="tr-label">${tier}</div>
            <div class="tr-name">${TIER_NAMES[tier]}</div>
            <div class="tr-holder">${claim.holder}</div>
          </div>
          <div class="tr-right">
            <div class="tr-time">${fmtTime(claim.time_seconds)}</div>
            <div class="tr-date">${fmtDate(claim.date)}</div>
          </div>
        `;
      } else {
        row.innerHTML = `
          <span></span>
          <div class="tr-left">
            <div class="tr-label">${tier}</div>
            <div class="tr-name">${TIER_NAMES[tier]}</div>
            <div class="tr-sub-unclaimed">Unclaimed. <a href="/#signup" class="tr-unclaimed-cta">Be the first</a></div>
          </div>
          <div class="tr-right"></div>
        `;
      }
      panel.appendChild(row);
    });
    cNode.appendChild(panel);
    return cNode;
  }

  /* ---------- Filter ---------- */
  function applyFilter() {
    const tier = state.tierFilter;
    document.querySelectorAll('.chip').forEach(c => {
      c.classList.toggle('active', c.dataset.tier === (tier || 'all'));
    });

    if (!tier || tier === 'all') {
      document.querySelectorAll('.tier-row, .city, .country, .subdiv').forEach(n => n.classList.remove('filtered-out'));
      document.querySelectorAll('.tier-row').forEach(r => r.style.display = '');
      return;
    }

    document.querySelectorAll('.country').forEach(cn => {
      let countryHasTier = false;
      cn.querySelectorAll('.city').forEach(cityN => {
        const key = cityN.dataset.country + '||' + cityN.dataset.city;
        const ct = currentIndex.cities.get(key);
        const has = ct && ct.claims[tier];
        cityN.classList.toggle('filtered-out', !has);
        if (has) countryHasTier = true;
        cityN.querySelectorAll('.tier-row').forEach(r => {
          r.style.display = r.dataset.tier === tier ? '' : 'none';
        });
      });
      // Filter subdivisions (states/provinces) whose cities are all filtered out
      cn.querySelectorAll('.subdiv').forEach(sub => {
        const anyVisible = Array.from(sub.querySelectorAll('.city')).some(c => !c.classList.contains('filtered-out'));
        sub.classList.toggle('filtered-out', !anyVisible);
      });
      cn.classList.toggle('filtered-out', !countryHasTier);
    });

    updateGlobeDots();
  }

  /* ---------- Search ---------- */
  function initSearch() {
    const wrap = document.getElementById('searchWrap');
    const btn = document.getElementById('searchBtn');
    const input = document.getElementById('searchInput');
    btn.addEventListener('click', () => {
      wrap.classList.toggle('search-open');
      if (wrap.classList.contains('search-open')) {
        setTimeout(() => input.focus(), 50);
      } else { input.value = ''; runSearch(''); }
    });
    input.addEventListener('input', () => runSearch(input.value.trim().toLowerCase()));
    input.addEventListener('keydown', e => {
      if (e.key === 'Escape') { input.value = ''; runSearch(''); wrap.classList.remove('search-open'); }
      if (e.key === 'Enter') {
        const first = document.querySelector('.city:not([style*="display: none"]) .city-head, .country:not([style*="display: none"]) .country-head');
        if (first) first.click();
      }
    });
  }
  function runSearch(q) {
    const clearAll = !q;
    document.querySelectorAll('.country').forEach(cn => {
      const country = cn.dataset.country.toLowerCase();
      let anyMatch = false;
      cn.querySelectorAll('.city').forEach(cityN => {
        const city = cityN.dataset.city.toLowerCase();
        const match = clearAll || country.includes(q) || city.includes(q);
        cityN.style.display = match ? '' : 'none';
        if (match) anyMatch = true;
      });
      cn.style.display = (clearAll || anyMatch) ? '' : 'none';
      if (!clearAll && anyMatch && !cn.classList.contains('open')) cn.classList.add('open');
    });
  }

  /* ---------- Chip bar ---------- */
  function initChips() {
    document.querySelectorAll('#chipbar .chip').forEach(c => {
      c.addEventListener('click', () => {
        state.tierFilter = c.dataset.tier;
        document.querySelectorAll('#twTier button').forEach(b => b.classList.toggle('on', b.dataset.val === state.tierFilter));
        applyFilter();
        persistState();
      });
    });
  }

  /* ---------- Highlight & scroll to a city ---------- */
  function scrollToCity(country, city) {
    // Open country
    const countryNode = document.querySelector(`.country[data-country="${CSS.escape(country)}"]`);
    if (!countryNode) return;
    countryNode.classList.add('open');
    const cityNode = countryNode.querySelector(`.city[data-city="${CSS.escape(city)}"]`);
    if (!cityNode) return;
    cityNode.classList.add('open', 'highlight');
    setTimeout(() => {
      cityNode.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' });
    }, 60);
    setTimeout(() => cityNode.classList.remove('highlight'), 1800);
  }

  /* ============================================================
     GLOBE (Three.js)
     ============================================================ */
  const globe = {
    canvas: null, renderer: null, scene: null, camera: null,
    earth: null, clouds: null, atmosphere: null,
    dotsGroup: null, dots: [],
    countriesGroup: null, countryLines: [],
    geojson: null, geojsonLoading: false,
    raycaster: null, pointer: { x: 0, y: 0 },
    hovered: null,
    rotY: 0, targetSpeed: 0.0010, currentSpeed: 0.0010,
    interactive: true,
    styleMode: 'realistic',
    initialized: false,
    failed: false,
    sphereRadius: 1
  };

  // Expose for debugging
  window.__globe = globe;

  function initGlobe() {
    if (typeof THREE === 'undefined') {
      fallbackToFlatMap();
      return;
    }
    const mount = document.getElementById('globe-mount');
    if (!mount) {
      fallbackToFlatMap();
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.id = 'globe';
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
    mount.appendChild(canvas);
    globe.canvas = canvas;

    try {
      globe.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    } catch (e) {
      console.warn('Globe init failed:', e);
      canvas.remove();
      fallbackToFlatMap();
      return;
    }
    if (!globe.renderer) {
      canvas.remove();
      fallbackToFlatMap();
      return;
    }

    const wrap = document.getElementById('globeWrap');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    globe.renderer.setPixelRatio(dpr);
    globe.renderer.setSize(wrap.clientWidth, wrap.clientHeight, false);
    globe.renderer.setClearColor(0x000000, 0);

    globe.scene = new THREE.Scene();
    globe.camera = new THREE.PerspectiveCamera(40, wrap.clientWidth / wrap.clientHeight, 0.1, 100);
    globe.camera.position.set(0, 0, 2.8);

    // Lighting
    const sun = new THREE.DirectionalLight(0xfff2dd, 0.7);
    sun.position.set(5, 2, 4);
    globe.scene.add(sun);
    globe.scene.add(new THREE.AmbientLight(0x223344, 0.15));

    // Earth — start with a procedural dark globe so we render immediately,
    // then upgrade to a real earth texture when it loads.
    const earthGeo = new THREE.SphereGeometry(1, 64, 64);
    const earthMat = new THREE.MeshPhongMaterial({
      color: 0x020308,
      emissive: 0x000000,
      shininess: 1,
      specular: 0x030508
    });
    globe.earth = new THREE.Mesh(earthGeo, earthMat);
    globe.earth.rotation.x = 23.5 * Math.PI / 180;
    globe.earth.rotation.y = -1.2;
    globe.scene.add(globe.earth);

    // Atmosphere glow
    const atmosVert = `
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;
    const atmosFrag = `
      varying vec3 vNormal;
      void main() {
        float intensity = pow(0.72 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.6);
        gl_FragColor = vec4(1.0, 0.55, 0.2, 1.0) * intensity * 0.9;
      }
    `;
    const atmosMat = new THREE.ShaderMaterial({
      vertexShader: atmosVert, fragmentShader: atmosFrag,
      side: THREE.BackSide, blending: THREE.AdditiveBlending, transparent: true
    });
    globe.atmosphere = new THREE.Mesh(new THREE.SphereGeometry(1.15, 40, 40), atmosMat);
    globe.scene.add(globe.atmosphere);

    // Dots group (attached to earth so they rotate with it)
    globe.dotsGroup = new THREE.Group();
    globe.earth.add(globe.dotsGroup);

    // Raycaster for dot hover/click
    globe.raycaster = new THREE.Raycaster();
    globe.raycaster.params.Points = { threshold: 0.025 };

    buildDots();

    // Earth texture loading SKIPPED: texture alignment with geojson outlines was unreliable,
    // so we stay on the procedural dark-blue earth and let outlines define the continents.

    // Events
    globe.canvas.addEventListener('pointermove', onGlobePointer);
    globe.canvas.addEventListener('pointerleave', () => { hideTip(); globe.hovered = null; });
    globe.canvas.addEventListener('click', onGlobeClick);
    globe.canvas.addEventListener('pointerdown', () => { globe.interactive = false; });
    globe.canvas.addEventListener('pointerup', () => { setTimeout(() => globe.interactive = true, 600); });

    window.addEventListener('resize', resizeGlobe);

    globe.initialized = true;
    animateGlobe();
    applyGlobeStyle();
  }

  function resizeGlobe() {
    if (!globe.renderer) return;
    const wrap = document.getElementById('globeWrap');
    globe.renderer.setSize(wrap.clientWidth, wrap.clientHeight, false);
    globe.camera.aspect = wrap.clientWidth / wrap.clientHeight;
    globe.camera.updateProjectionMatrix();
    if (globe.styleMode === 'flat') sizeFlatMap();
  }

  // lat/lon → 3D point on unit sphere, matching the Earth texture wrapping used by three-globe:
  // phi = (90 - lat) * PI/180, theta = -(lon + 180) * PI/180, x = r sin(phi) cos(theta)
  function latLonToVec3(lat, lon, radius) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = -(lon + 180) * (Math.PI / 180);
    return new THREE.Vector3(
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta)
    );
  }

  function dotColorForTier(tier) {
    const map = { "10K": 0xFBBF24, "25K": 0x60A5FA, "50K": 0xD4602E, "75K": 0x7044B8, "100K": 0xEEEAE3 };
    return map[tier] || 0x444444;
  }

  // Map geojson country names → our data names
  const COUNTRY_NAME_MAP = {
    "United States of America": "United States",
    "USA": "United States",
    "Russian Federation": "Russia",
    "Korea, Republic of": "South Korea",
    "Republic of Korea": "South Korea",
    "United Arab Emirates": "UAE",
    "Czech Republic": "Czechia",
    "United Kingdom of Great Britain and Northern Ireland": "United Kingdom"
  };
  function normalizeCountryName(name) {
    return COUNTRY_NAME_MAP[name] || name;
  }

  // Project lat/lon pair array → Vector3 on sphere
  function coordsToSphere(coords, radius) {
    const pts = [];
    for (let i = 0; i < coords.length; i++) {
      const lon = coords[i][0];
      const lat = coords[i][1];
      pts.push(latLonToVec3(lat, lon, radius));
    }
    return pts;
  }

  // Densify a ring by inserting points along long edges (in lon/lat space)
  // so subsequent triangulation + sphere projection produces triangles that
  // hug the curvature instead of cutting chords through the globe.
  function densifyRing(ring, maxDeg) {
    const out = [];
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i];
      const b = ring[(i + 1) % ring.length];
      out.push(a);
      let dLon = b[0] - a[0];
      // Handle antimeridian crossing
      if (dLon > 180) dLon -= 360;
      else if (dLon < -180) dLon += 360;
      const dLat = b[1] - a[1];
      const dist = Math.sqrt(dLon * dLon + dLat * dLat);
      const segs = Math.ceil(dist / maxDeg);
      for (let s = 1; s < segs; s++) {
        const t = s / segs;
        out.push([a[0] + dLon * t, a[1] + dLat * t]);
      }
    }
    return out;
  }

  // Build a filled mesh for a single polygon (outer ring + holes) projected onto sphere surface
  function makePolyFill(rings, color, opacity, radius) {
    // Densify each ring so edges remain short after projection to the sphere
    const dense = rings.map(r => densifyRing(r, 2.5));
    const flat = [];
    const holeIndices = [];
    let offset = 0;
    dense.forEach((ring, idx) => {
      if (idx > 0) holeIndices.push(offset);
      for (let i = 0; i < ring.length; i++) {
        flat.push(ring[i][0], ring[i][1]);
      }
      offset += ring.length;
    });
    if (!window.earcut) return null;
    const tris = window.earcut(flat, holeIndices.length ? holeIndices : null, 2);
    if (!tris.length) return null;

    // Build per-vertex positions on sphere
    const positions = new Float32Array((flat.length / 2) * 3);
    for (let i = 0; i < flat.length / 2; i++) {
      const lon = flat[i * 2];
      const lat = flat[i * 2 + 1];
      const v = latLonToVec3(lat, lon, radius);
      positions[i * 3] = v.x;
      positions[i * 3 + 1] = v.y;
      positions[i * 3 + 2] = v.z;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setIndex(tris);
    geo.computeVertexNormals();
    const mat = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity,
      side: THREE.DoubleSide, depthWrite: false
    });
    return new THREE.Mesh(geo, mat);
  }

  // Ray-casting point-in-polygon test on lon/lat coordinates.
  // Returns true if [lon, lat] is inside the ring (ignores holes — good enough for US states / CA provinces).
  function pointInRing(lon, lat, ring) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0], yi = ring[i][1];
      const xj = ring[j][0], yj = ring[j][1];
      const intersect = ((yi > lat) !== (yj > lat)) &&
        (lon < (xj - xi) * (lat - yi) / ((yj - yi) || 1e-12) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }
  function pointInFeature(lon, lat, feat) {
    const geom = feat.geometry;
    if (!geom) return false;
    const polys = geom.type === 'Polygon' ? [geom.coordinates] :
                 geom.type === 'MultiPolygon' ? geom.coordinates : [];
    for (let i = 0; i < polys.length; i++) {
      // Only outer ring matters for "inside" tests here
      if (pointInRing(lon, lat, polys[i][0])) return true;
    }
    return false;
  }

  // Build a THREE.Line for a single polygon ring
  function makePolyLine(pts, color, opacity, linewidth) {
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity, linewidth: linewidth || 1 });
    return new THREE.Line(geo, mat);
  }

  // Load geojson once, then build outlines
  async function loadCountryOutlines() {
    if (globe.geojson || globe.geojsonLoading) return globe.geojson;
    globe.geojsonLoading = true;
    // Lightweight world-atlas at ~110m resolution as GeoJSON (< 250KB)
    const urls = [
      'https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json',
      'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson'
    ];
    // Try topojson first, then fall back to geojson
    for (const url of urls) {
      try {
        const r = await fetch(url);
        if (!r.ok) continue;
        const j = await r.json();
        if (j.type === 'Topology') {
          // Need topojson-client to convert
          if (!window.topojson) {
            await new Promise((res, rej) => {
              const s = document.createElement('script');
              s.src = 'https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/dist/topojson-client.min.js';
              s.onload = res; s.onerror = rej;
              document.head.appendChild(s);
            });
          }
          const fc = window.topojson.feature(j, j.objects.countries);
          globe.geojson = fc;
        } else {
          globe.geojson = j;
        }
        break;
      } catch (e) { /* try next */ }
    }
    globe.geojsonLoading = false;
    return globe.geojson;
  }

  // Load US states + Canadian provinces as a separate geojson layer
  async function loadSubdivisions() {
    if (globe.subdivGeojson || globe.subdivLoading) return globe.subdivGeojson;
    globe.subdivLoading = true;
    // us-atlas (states) + canadian provinces geojson
    const urls = [
      'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json', // topojson, US states
      'https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/canada.geojson' // Canadian provinces
    ];
    const combined = { type: 'FeatureCollection', features: [] };
    // US states (topojson)
    try {
      const r = await fetch(urls[0]);
      if (r.ok) {
        const j = await r.json();
        if (!window.topojson) {
          await new Promise((res, rej) => {
            const s = document.createElement('script');
            s.src = 'https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/dist/topojson-client.min.js';
            s.onload = res; s.onerror = rej;
            document.head.appendChild(s);
          });
        }
        const fc = window.topojson.feature(j, j.objects.states);
        fc.features.forEach(f => { f.properties = f.properties || {}; f.properties._parent = 'United States'; });
        combined.features.push(...fc.features);
      }
    } catch (e) {}
    // Canada provinces (geojson)
    try {
      const r = await fetch(urls[1]);
      if (r.ok) {
        const j = await r.json();
        j.features.forEach(f => { f.properties = f.properties || {}; f.properties._parent = 'Canada'; });
        combined.features.push(...j.features);
      }
    } catch (e) {}
    globe.subdivGeojson = combined.features.length ? combined : null;
    globe.subdivLoading = false;
    return globe.subdivGeojson;
  }

  async function buildCountryOutlines() {
    if (!globe.earth) return;
    if (!globe.countriesGroup) {
      globe.countriesGroup = new THREE.Group();
      globe.earth.add(globe.countriesGroup);
    }
    // If geojson not yet loaded, fetch then recurse
    if (!globe.geojson) {
      await loadCountryOutlines();
      if (!globe.geojson) return; // fetch failed
    }
    // Clear
    while (globe.countriesGroup.children.length) {
      const c = globe.countriesGroup.children.pop();
      if (c.material) c.material.dispose();
      if (c.geometry) c.geometry.dispose();
    }

    const fc = globe.geojson;
    if (!fc || !fc.features) return;

    const data = activeData();
    const idx = buildIndex(data);
    const byCountry = new Map();
    idx.countriesList.forEach(co => byCountry.set(co.country, co));

    const surfR = globe.sphereRadius * 1.003;

    fc.features.forEach(feat => {
      const rawName = feat.properties && (feat.properties.name || feat.properties.NAME || feat.properties.ADMIN);
      if (!rawName) return;
      const name = normalizeCountryName(rawName);
      const co = byCountry.get(name);
      const dominant = co && co.dominantTier;
      const claimed = !!dominant;
      // All other countries get a very faint outline
      const color = claimed ? dotColorForTier(dominant) : 0x8a99ad;
      const opacity = claimed ? 0.95 : (co ? 0.55 : 0.38);
      const lineWidth = claimed ? 2 : 1;

      const geom = feat.geometry;
      if (!geom) return;
      const polygons = geom.type === 'Polygon' ? [geom.coordinates] :
                      geom.type === 'MultiPolygon' ? geom.coordinates : [];
      polygons.forEach(poly => {
        poly.forEach(ring => {
          const pts = coordsToSphere(ring, surfR);
          if (pts.length < 2) return;
          const line = makePolyLine(pts, color, opacity, lineWidth);
          line.userData = { country: name, claimed, isOutline: true };
          globe.countriesGroup.add(line);

          // For claimed countries, add a subtle inner glow stroke (thicker, more transparent, slightly above)
          if (claimed) {
            const glowPts = coordsToSphere(ring, globe.sphereRadius * 1.006);
            const glow = makePolyLine(glowPts, color, 0.35, 3);
            glow.userData = { country: name, claimed, isGlow: true };
            globe.countriesGroup.add(glow);
          }
        });
      });
    });

    // ── Sub-national outlines for primary markets (US states + Canadian provinces) ──
    if (!globe.subdivGeojson) {
      loadSubdivisions().then(() => buildCountryOutlines());
    } else {
      const subSurfR = globe.sphereRadius * 1.002; // slightly below country outlines
      // Collect US + Canada cities from the index for point-in-polygon assignment
      const localCities = [];
      idx.cities.forEach(c => {
        if (c.country === 'United States' || c.country === 'Canada') localCities.push(c);
      });

      globe.subdivGeojson.features.forEach(feat => {
        const parent = feat.properties && feat.properties._parent;

        // Find the dominant tier for this subdivision (highest-prestige tier among cities inside it)
        let subDominant = null;
        for (let i = 0; i < localCities.length; i++) {
          const ct = localCities[i];
          if (ct.country !== parent) continue;
          if (!pointInFeature(ct.lon, ct.lat, feat)) continue;
          Object.keys(ct.claims).forEach(tier => {
            if (!subDominant || TIER_PRESTIGE[tier] > TIER_PRESTIGE[subDominant]) subDominant = tier;
          });
        }

        const col = subDominant ? dotColorForTier(subDominant) : 0x6a7888;
        const op = subDominant ? 0.85 : 0.32;
        const lw = subDominant ? 1.5 : 1;

        const geom = feat.geometry;
        if (!geom) return;
        const polys = geom.type === 'Polygon' ? [geom.coordinates] :
                     geom.type === 'MultiPolygon' ? geom.coordinates : [];
        polys.forEach(poly => {
          poly.forEach(ring => {
            const pts = coordsToSphere(ring, subSurfR);
            if (pts.length < 2) return;
            const line = makePolyLine(pts, col, op, lw);
            line.userData = { subdivision: true, parent, tier: subDominant };
            globe.countriesGroup.add(line);
          });
        });
      });
    }
  }

  function buildDots() {
    // Clear existing
    while (globe.dotsGroup.children.length) {
      const d = globe.dotsGroup.children.pop();
      if (d.material) d.material.dispose();
      if (d.geometry) d.geometry.dispose();
    }
    globe.dots = [];

    const data = activeData();
    const idx = buildIndex(data);
    buildCountryOutlines();

    idx.cities.forEach(ct => {
      const tiersHeld = TIER_ORDER.filter(t => ct.claims[t]);
      const isClaimed = tiersHeld.length > 0;
      const highest = isClaimed ? tiersHeld[tiersHeld.length - 1] : null;

      // Base position slightly above surface
      const pos = latLonToVec3(ct.lat, ct.lon, globe.sphereRadius * 1.012);

      if (!isClaimed) {
        if (!state.showSignup) return;
        // Dim dot
        const geo = new THREE.SphereGeometry(0.009, 10, 10);
        const mat = new THREE.MeshBasicMaterial({ color: 0x555555, transparent: true, opacity: 0.85 });
        const m = new THREE.Mesh(geo, mat);
        m.position.copy(pos);
        m.userData = { city: ct, claimed: false };
        globe.dotsGroup.add(m);
        globe.dots.push(m);
      } else {
        // Core dot
        const size = 0.011 + TIER_PRESTIGE[highest] * 0.0025;
        const col = dotColorForTier(highest);
        const geo = new THREE.SphereGeometry(size, 14, 14);
        const mat = new THREE.MeshBasicMaterial({ color: col });
        const m = new THREE.Mesh(geo, mat);
        m.position.copy(pos);
        m.userData = { city: ct, claimed: true, tier: highest, baseSize: size };
        globe.dotsGroup.add(m);
        globe.dots.push(m);

        // Halo sprite
        const haloGeo = new THREE.SphereGeometry(size * 2.4, 14, 14);
        const haloMat = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.25, depthWrite: false });
        const halo = new THREE.Mesh(haloGeo, haloMat);
        halo.position.copy(pos);
        halo.userData.isHalo = true;
        halo.userData.baseSize = size * 2.4;
        halo.userData.phase = Math.random() * Math.PI * 2;
        globe.dotsGroup.add(halo);
      }
    });
  }

  function updateGlobeDots() {
    if (!globe.dotsGroup) return;
    const tier = state.tierFilter;
    globe.dotsGroup.children.forEach(d => {
      if (!d.userData) return;
      if (d.userData.isHalo) {
        // Show halo only if its paired tier matches
        d.visible = true;
        return;
      }
      if (!tier || tier === 'all') {
        d.visible = true;
        if (d.userData.claimed === false && !state.showSignup) d.visible = false;
        return;
      }
      if (d.userData.claimed) {
        const c = d.userData.city;
        d.visible = !!c.claims[tier];
      } else {
        d.visible = false;
      }
    });
    // Hide halos whose paired claimed dot is hidden
    globe.dotsGroup.children.forEach(d => {
      if (d.userData && d.userData.isHalo) {
        // find nearest claimed dot at same position
        const pair = globe.dotsGroup.children.find(o => o !== d && o.userData && o.userData.claimed && o.position.distanceTo(d.position) < 0.001);
        d.visible = pair ? pair.visible : false;
      }
    });
  }

  function onGlobePointer(e) {
    if (!globe.renderer) return;
    const rect = globe.canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    globe.pointer.x = x; globe.pointer.y = y;

    globe.raycaster.setFromCamera({ x, y }, globe.camera);
    const hits = globe.raycaster.intersectObjects(globe.dotsGroup.children.filter(d => !d.userData.isHalo && d.visible));
    if (hits.length) {
      const m = hits[0].object;
      if (globe.hovered !== m) {
        globe.hovered = m;
        showTip(m, e.clientX, e.clientY);
        globe.canvas.style.cursor = 'pointer';
      } else {
        positionTip(e.clientX, e.clientY);
      }
    } else {
      globe.hovered = null;
      hideTip();
      globe.canvas.style.cursor = '';
    }
  }

  function onGlobeClick(e) {
    if (!globe.hovered) return;
    const ct = globe.hovered.userData.city;
    scrollToCity(ct.country, ct.city);
  }

  function showTip(m, cx, cy) {
    const tip = document.getElementById('globeTip');
    const c = m.userData.city;
    const claimed = m.userData.claimed;
    tip.querySelector('.tip-city').textContent = c.city + ', ' + c.country;

    if (claimed) {
      const tier = m.userData.tier;
      // find holder
      const claim = c.claims[tier];
      tip.querySelector('.tip-meta').innerHTML =
        `<span class="pill-inline" style="color: ${tier === '10K' ? '#FBBF24' : tier === '25K' ? '#60A5FA' : tier === '50K' ? '#D4602E' : tier === '75K' ? '#7044B8' : '#EEEAE3'}">${tier}</span>` +
        `${claim.holder} · ${fmtTime(claim.time_seconds)}`;
    } else {
      tip.querySelector('.tip-meta').textContent = 'Signed up · Unclaimed';
    }
    tip.classList.add('on');
    positionTip(cx, cy);
  }
  function positionTip(cx, cy) {
    const tip = document.getElementById('globeTip');
    const rect = document.getElementById('globeWrap').getBoundingClientRect();
    tip.style.left = (cx - rect.left) + 'px';
    tip.style.top = (cy - rect.top) + 'px';
  }
  function hideTip() {
    document.getElementById('globeTip').classList.remove('on');
  }

  function animateGlobe() {
    if (!globe.initialized) return;
    // Smooth speed interpolation
    globe.currentSpeed += (globe.targetSpeed - globe.currentSpeed) * 0.08;
    if (globe.interactive && !reducedMotion) {
      globe.earth.rotation.y += globe.currentSpeed;
    }
    // Halos pulse
    const t = performance.now() * 0.003;
    globe.dotsGroup.children.forEach(d => {
      if (d.userData && d.userData.isHalo) {
        const base = d.userData.baseSize;
        const s = 1 + Math.sin(t + d.userData.phase) * 0.15;
        d.scale.setScalar(s);
        d.material.opacity = 0.18 + Math.sin(t + d.userData.phase) * 0.08;
      }
    });
    globe.renderer.render(globe.scene, globe.camera);
    requestAnimationFrame(animateGlobe);
  }

  function applyGlobeStyle() {
    if (!globe.earth) return;
    const mat = globe.earth.material;
    if (state.globeStyle === 'realistic') {
      mat.wireframe = false;
      if (mat.map) { mat.color = new THREE.Color(0xffffff); mat.emissive = new THREE.Color(0x000000); }
      else         { mat.color = new THREE.Color(0x1a2436); mat.emissive = new THREE.Color(0x0a1020); }
      globe.atmosphere.visible = true;
      if (globe.stipple) globe.stipple.visible = false;
    } else if (state.globeStyle === 'wireframe') {
      mat.wireframe = true;
      mat.color = new THREE.Color(0x2a3040);
      mat.emissive = new THREE.Color(0x10131a);
      globe.atmosphere.visible = true;
      if (globe.stipple) globe.stipple.visible = false;
    } else if (state.globeStyle === 'stippled') {
      mat.wireframe = false;
      mat.color = new THREE.Color(0x050507);
      mat.emissive = new THREE.Color(0x050507);
      mat.map = null;
      mat.needsUpdate = true;
      globe.atmosphere.visible = true;
      buildStipple();
    }
    mat.needsUpdate = true;
  }

  function buildStipple() {
    if (globe.stipple) { globe.stipple.visible = true; return; }
    // Generate a dot grid around the sphere (golden spiral)
    const N = 2000;
    const positions = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const phi = Math.acos(1 - 2 * (i + 0.5) / N);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      positions[i*3]   = Math.sin(phi) * Math.cos(theta) * 1.002;
      positions[i*3+1] = Math.cos(phi) * 1.002;
      positions[i*3+2] = Math.sin(phi) * Math.sin(theta) * 1.002;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ color: 0x6a6a75, size: 0.012, sizeAttenuation: true });
    globe.stipple = new THREE.Points(geo, mat);
    globe.earth.add(globe.stipple);
  }

  /* ---------- 2D Mercator fallback ---------- */
  function fallbackToFlatMap() {
    globe.failed = true;
    globe.styleMode = 'flat';
    const g = document.getElementById('globe');
    if (g) g.style.display = 'none';
    const svg = document.getElementById('globe-fallback');
    svg.style.display = 'block';
    sizeFlatMap();
    renderFlatMap();
  }
  function sizeFlatMap() {
    // No-op; svg uses preserveAspectRatio
  }
  function renderFlatMap() {
    const svg = document.getElementById('globe-fallback');
    if (!svg) return;
    svg.innerHTML = '';
    // Background rect
    svg.insertAdjacentHTML('beforeend', `<rect width="1000" height="500" fill="#080810"/>`);
    // Subtle grid
    for (let lon = -180; lon <= 180; lon += 30) {
      const x = ((lon + 180) / 360) * 1000;
      svg.insertAdjacentHTML('beforeend', `<line x1="${x}" y1="0" x2="${x}" y2="500" stroke="#1a1a22" stroke-width="0.5"/>`);
    }
    for (let lat = -60; lat <= 60; lat += 30) {
      const y = ((90 - lat) / 180) * 500;
      svg.insertAdjacentHTML('beforeend', `<line x1="0" y1="${y}" x2="1000" y2="${y}" stroke="#1a1a22" stroke-width="0.5"/>`);
    }
    // Dots
    const data = activeData();
    const idx = buildIndex(data);
    idx.cities.forEach(ct => {
      const x = ((ct.lon + 180) / 360) * 1000;
      const y = ((90 - ct.lat) / 180) * 500;
      const tiersHeld = TIER_ORDER.filter(t => ct.claims[t]);
      if (tiersHeld.length === 0) {
        if (!state.showSignup) return;
        svg.insertAdjacentHTML('beforeend', `<circle cx="${x}" cy="${y}" r="2.5" fill="#555"/>`);
      } else {
        const highest = tiersHeld[tiersHeld.length - 1];
        const cols = { "10K": "#FBBF24", "25K": "#60A5FA", "50K": "#D4602E", "75K": "#7044B8", "100K": "#EEEAE3" };
        const r = 3 + TIER_PRESTIGE[highest] * 0.8;
        svg.insertAdjacentHTML('beforeend',
          `<circle cx="${x}" cy="${y}" r="${r*2.2}" fill="${cols[highest]}" opacity="0.18"/>
           <circle cx="${x}" cy="${y}" r="${r}" fill="${cols[highest]}" style="cursor:pointer" data-country="${ct.country}" data-city="${ct.city}"/>`);
      }
    });
    svg.querySelectorAll('circle[data-city]').forEach(c => {
      c.addEventListener('click', () => scrollToCity(c.dataset.country, c.dataset.city));
    });
  }

  /* ============================================================
     TWEAKS PANEL
     ============================================================ */
  function initTweaks() {
    const panel = document.getElementById('tweaks');
    const trigger = document.getElementById('twTrigger');

    function openPanel() {
      panel.classList.add('on');
      if (trigger) trigger.classList.add('active');
      trigger && trigger.setAttribute('aria-expanded', 'true');
    }
    function closePanel() {
      panel.classList.remove('on');
      if (trigger) trigger.classList.remove('active');
      trigger && trigger.setAttribute('aria-expanded', 'false');
    }

    // Edit-mode protocol (for in-tool editing — still works if toolbar is present)
    window.addEventListener('message', e => {
      if (!e.data) return;
      if (e.data.type === '__activate_edit_mode') openPanel();
      if (e.data.type === '__deactivate_edit_mode') closePanel();
    });
    try { window.parent.postMessage({ type: '__edit_mode_available' }, '*'); } catch (e) {}

    // User-facing trigger
    if (trigger) {
      trigger.addEventListener('click', () => {
        if (panel.classList.contains('on')) closePanel();
        else openPanel();
      });
    }

    // Close button
    document.getElementById('twClose').addEventListener('click', () => {
      closePanel();
      try { window.parent.postMessage({ type: '__edit_mode_dismissed' }, '*'); } catch (e) {}
    });

    // Tier filter
    document.querySelectorAll('#twTier button').forEach(b => {
      b.classList.toggle('on', b.dataset.val === state.tierFilter);
      b.addEventListener('click', () => {
        state.tierFilter = b.dataset.val;
        document.querySelectorAll('#twTier button').forEach(x => x.classList.toggle('on', x.dataset.val === state.tierFilter));
        applyFilter();
        persistState();
      });
    });

    // Signup toggle
    const sw = document.getElementById('twSignup');
    function renderSwitch() { sw.classList.toggle('on', !!state.showSignup); sw.setAttribute('aria-pressed', !!state.showSignup); }
    renderSwitch();
    sw.addEventListener('click', () => {
      state.showSignup = !state.showSignup;
      renderSwitch();
      if (globe.initialized) { buildDots(); updateGlobeDots(); }
      else if (globe.failed) renderFlatMap();
      persistState();
    });

    // Rotation speed + pause
    const speedBtns = document.querySelectorAll('#twSpeed button');
    const pauseBtn = document.getElementById('twPause');
    let paused = false;

    // Snap persisted rotationSpeed to nearest preset (back-compat for old saved values)
    const PRESETS = [1, 3, 6];
    function nearestPreset(v) {
      let best = PRESETS[0], bd = Infinity;
      PRESETS.forEach(p => { const d = Math.abs(p - v); if (d < bd) { bd = d; best = p; } });
      return best;
    }
    state.rotationSpeed = nearestPreset(Number(state.rotationSpeed) || 1);

    function applySpeed() {
      if (paused) {
        globe.targetSpeed = 0;
      } else {
        // Preserve original mapping: preset 1 → prior baseline, scaled by preset value
        globe.targetSpeed = 0.0004 + state.rotationSpeed * 0.003;
      }
    }
    function renderSpeedUI() {
      speedBtns.forEach(b => {
        b.classList.toggle('on', !paused && parseFloat(b.dataset.val) === state.rotationSpeed);
        b.disabled = paused;
      });
      pauseBtn.classList.toggle('on', paused);
      pauseBtn.setAttribute('aria-pressed', paused ? 'true' : 'false');
      pauseBtn.textContent = paused ? 'Resume' : 'Pause';
    }

    renderSpeedUI();
    applySpeed();

    speedBtns.forEach(b => {
      b.addEventListener('click', () => {
        if (paused) return;
        state.rotationSpeed = parseFloat(b.dataset.val);
        renderSpeedUI();
        applySpeed();
        persistState();
      });
    });
    pauseBtn.addEventListener('click', () => {
      paused = !paused;
      renderSpeedUI();
      applySpeed();
    });
  }

  /* ============================================================
     REVEALS
     ============================================================ */
  function runReveals() {
    if (reducedMotion) {
      document.querySelectorAll('.reveal').forEach(r => r.classList.add('v'));
      return;
    }
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('v'); });
    }, { threshold: 0.1 });
    document.querySelectorAll('.reveal').forEach(r => io.observe(r));
  }

  /* ============================================================
     BOOT
     ============================================================ */
  function boot() {
    renderList();
    initChips();
    initSearch();
    initTweaks();
    initGlobe();
    runReveals();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
