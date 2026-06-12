/* ============================================================
   100K STEP CLUB — WORLD MAP DATA
   Live data from the same Supabase views that power the claim
   board (v_city_claims_all + get_leaderboard_signup_only),
   plus per-country aggregation for the map hover cards.
   SEED holds a real snapshot (2026-06-11) as the offline fallback;
   loadLiveData() replaces it with fresh data before the index builds.
   ============================================================ */

const SEED = {
  // Real snapshot of the live database, 2026-06-11. The page still fetches
  // live data on every load — this is only the offline/slow-network fallback.
  claims: [
    { city: "Kyoto", country: "Japan", lat: 35.01, lon: 135.77, tier: "50K", holder: "Graeme N.", time_seconds: 66720, date: "2019-10-14" },
    { city: "Tokyo", country: "Japan", lat: 35.68, lon: 139.69, tier: "75K", holder: "Graeme N.", time_seconds: 86100, date: "2020-02-22" },
    { city: "New York", country: "United States", state: "New York", lat: 40.71, lon: -74.01, tier: "50K", holder: "Graeme N.", time_seconds: 31980, date: "2022-06-05" },
    { city: "Kyoto", country: "Japan", lat: 35.01, lon: 135.77, tier: "100K", holder: "Graeme N.", time_seconds: 53580, date: "2023-10-11" },
    { city: "Taipei", country: "Taiwan", lat: 25.03, lon: 121.57, tier: "50K", holder: "Graeme N.", time_seconds: 31260, date: "2023-11-10" },
    { city: "Toronto", country: "Canada", state: "Ontario", lat: 43.65, lon: -79.38, tier: "100K", holder: "Graeme N.", time_seconds: 57960, date: "2024-05-20" },
    { city: "Rome", country: "Italy", lat: 41.9, lon: 12.5, tier: "25K", holder: "Graeme N.", time_seconds: 30060, date: "2024-06-07" },
    { city: "Palm Springs", country: "United States", state: "California", lat: 33.83, lon: -116.55, tier: "50K", holder: "Graeme N.", time_seconds: 30120, date: "2024-12-23" },
    { city: "Toronto", country: "Canada", state: "Ontario", lat: 43.65, lon: -79.38, tier: "50K", holder: "Graeme N.", time_seconds: 30420, date: "2026-04-18" },
    { city: "Toronto", country: "Canada", state: "Ontario", lat: 43.65, lon: -79.38, tier: "10K", holder: "Brendan K.", time_seconds: 4500, date: "2026-05-02" },
    { city: "Toronto", country: "Canada", state: "Ontario", lat: 43.65, lon: -79.38, tier: "10K", holder: "Aqsa M.", time_seconds: 9000, date: "2026-05-02" },
    { city: "Vancouver", country: "Canada", state: "British Columbia", lat: 49.28, lon: -123.12, tier: "10K", holder: "Jaclyn L.", time_seconds: 10800, date: "2026-05-02" },
    { city: "San Francisco", country: "United States", state: "California", lat: 37.77, lon: -122.42, tier: "25K", holder: "Nicole L.", time_seconds: 16740, date: "2026-05-02" },
    { city: "Vancouver", country: "Canada", state: "British Columbia", lat: 49.28, lon: -123.12, tier: "25K", holder: "Vlad M.", time_seconds: 37800, date: "2026-05-02" },
    { city: "San Francisco", country: "United States", state: "California", lat: 37.77, lon: -122.42, tier: "25K", holder: "Jason R.", time_seconds: 43260, date: "2026-05-02" },
    { city: "Vancouver", country: "Canada", state: "British Columbia", lat: 49.28, lon: -123.12, tier: "25K", holder: "Zane K.", time_seconds: 43380, date: "2026-05-02" },
    { city: "Toronto", country: "Canada", state: "Ontario", lat: 43.65, lon: -79.38, tier: "25K", holder: "Morgana C.", time_seconds: 47820, date: "2026-05-02" },
    { city: "Pleasanton", country: "United States", state: "California", lat: 37.6624, lon: -121.8747, tier: "25K", holder: "Milda S.", time_seconds: 50460, date: "2026-05-02" },
    { city: "Pleasanton", country: "United States", state: "California", lat: 37.6624, lon: -121.8747, tier: "25K", holder: "Matt O.", time_seconds: 50520, date: "2026-05-02" },
    { city: "Accra", country: "Ghana", lat: 5.6, lon: -0.19, tier: "35K", holder: "Dylan P.", time_seconds: 51780, date: "2026-05-02" },
    { city: "Toronto", country: "Canada", state: "Ontario", lat: 43.65, lon: -79.38, tier: "100K", holder: "Graeme N.", time_seconds: 62040, date: "2026-05-02" }
  ],
  signup_only: [
    { city: "Calgary", country: "Canada", state: "Alberta", lat: 51.05, lon: -114.07 },
    { city: "Halifax", country: "Canada", state: "Nova Scotia", lat: 44.65, lon: -63.58 },
    { city: "London", country: "United Kingdom", lat: 51.51, lon: -0.13 },
    { city: "Montreal", country: "Canada", state: "Quebec", lat: 45.5, lon: -73.57 }
  ]
};

/* Fetch the exact same data the claim board renders. Requires the
   Supabase CDN + js/config.js to be loaded first. Returns null on
   any failure so the engine can boot with whatever SEED holds. */
async function loadLiveData() {
  if (typeof window.supabase === 'undefined' || typeof SUPABASE_URL === 'undefined') return null;
  try {
    const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const timeout = new Promise(resolve => setTimeout(() => resolve(null), 6000));
    const fetchAll = Promise.all([
      sb.from('v_city_claims_all').select('*'),
      sb.rpc('get_leaderboard_signup_only')
    ]).then(([claimsRes, signupRes]) => {
      if (claimsRes.error) throw claimsRes.error;
      if (signupRes.error) throw signupRes.error;
      return { claims: claimsRes.data || [], signup_only: signupRes.data || [] };
    });
    return await Promise.race([fetchAll, timeout]);
  } catch (e) {
    console.warn('[worldmap] live data fetch failed:', e);
    return null;
  }
}

const TIER_ORDER    = ["10K", "25K", "35K", "50K", "75K", "100K"];
const TIER_NAMES    = { "10K": "First Light", "25K": "In The Flow", "35K": "Realizing", "50K": "Heating Up", "75K": "Enter Night", "100K": "Beat Midnight" };
const TIER_PRESTIGE = { "10K": 1, "25K": 2, "35K": 3, "50K": 4, "75K": 5, "100K": 6 };
const TIER_HEX      = { "10K": "#FBBF24", "25K": "#3B82F6", "35K": "#10B981", "50K": "#D4602E", "75K": "#8B5CF6", "100K": "#EEEAE3" };
// Slightly brightened blue/purple vs. the list page so they radiate against the dark map.
const TIER_STEPS    = { "10K": 10000, "25K": 25000, "35K": 35000, "50K": 50000, "75K": 75000, "100K": 100000 };

// geojson country name → our data name
const COUNTRY_NAME_MAP = {
  "United States of America": "United States",
  "USA": "United States",
  "United Arab Emirates": "UAE",
  "Russian Federation": "Russia",
  "Korea, Republic of": "South Korea",
  "Republic of Korea": "South Korea",
  "Czech Republic": "Czechia",
  "United Kingdom of Great Britain and Northern Ireland": "United Kingdom"
};
function normalizeCountryName(name) { return COUNTRY_NAME_MAP[name] || name; }

/* ---------- formatting ---------- */
function fmtTime(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h === 0) return m + "m";
  return h + "h " + String(m).padStart(2, "0") + "m";
}
function fmtDate(iso) {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

/* ---------- index (mirrors leaderboard buildIndex) ---------- */
function buildIndex(data) {
  const cities = new Map();
  const countries = new Map();
  const cityKey = (r) => r.country + "||" + (r.state || "") + "||" + r.city;

  data.signup_only.forEach(s => {
    const k = cityKey(s);
    if (!cities.has(k)) cities.set(k, { city: s.city, country: s.country, state: s.state || null, lat: s.lat, lon: s.lon, claims: {}, signup_only: true });
  });
  data.claims.forEach(c => {
    const k = cityKey(c);
    if (!cities.has(k)) cities.set(k, { city: c.city, country: c.country, state: c.state || null, lat: c.lat, lon: c.lon, claims: {}, signup_only: false });
    const e = cities.get(k);
    if (c.state && !e.state) e.state = c.state;
    e.signup_only = false;
    if (!e.claims[c.tier]) e.claims[c.tier] = [];
    e.claims[c.tier].push(c);
  });
  cities.forEach(e => Object.keys(e.claims).forEach(t => e.claims[t].sort((a, b) => a.time_seconds - b.time_seconds)));

  cities.forEach(c => {
    if (!countries.has(c.country)) countries.set(c.country, { country: c.country, cities: [] });
    countries.get(c.country).cities.push(c);
  });

  countries.forEach(co => {
    co.claimed = co.cities.filter(ct => Object.keys(ct.claims).length > 0).length;
    co.members = co.cities.length;
    let best = null;
    co.cities.forEach(ct => Object.keys(ct.claims).forEach(t => { if (!best || TIER_PRESTIGE[t] > TIER_PRESTIGE[best]) best = t; }));
    co.dominantTier = best;
    co.agg = aggregateCountry(co);
  });

  const claimedCities = Array.from(cities.values()).filter(c => Object.keys(c.claims).length > 0).length;
  const totalWalkers  = data.claims.length;
  const countryCount  = countries.size;
  const claimedCountries = Array.from(countries.values()).filter(c => c.dominantTier).length;

  const countriesList = Array.from(countries.values()).sort((a, b) => (b.claimed - a.claimed) || a.country.localeCompare(b.country));
  return { cities, countries, countriesList, stats: { claimedCities, totalWalkers, countryCount, claimedCountries } };
}

/* ---------- per-country aggregation for hover cards ---------- */
function aggregateCountry(co) {
  let walkers = 0, steps = 0, fastest = null, recent = null, topCity = null, topPrestige = -1, fastestForTop = Infinity;
  const tiersHeld = new Set();
  co.cities.forEach(ct => {
    Object.keys(ct.claims).forEach(tier => {
      tiersHeld.add(tier);
      ct.claims[tier].forEach(cl => {
        walkers++;
        steps += (TIER_STEPS[tier] || 0);
        if (fastest == null || cl.time_seconds < fastest.time_seconds) fastest = { ...cl, city: ct.city };
        if (recent == null || cl.date > recent.date) recent = { ...cl, city: ct.city };
        const p = TIER_PRESTIGE[tier];
        if (p > topPrestige || (p === topPrestige && cl.time_seconds < fastestForTop)) {
          topPrestige = p; fastestForTop = cl.time_seconds;
          topCity = { city: ct.city, tier, holder: cl.holder, time_seconds: cl.time_seconds };
        }
      });
    });
  });
  return {
    walkers, steps, fastest, recent, topCity,
    tiersHeld: TIER_ORDER.filter(t => tiersHeld.has(t)),
    grandSlam: TIER_ORDER.every(t => tiersHeld.has(t)),
    claimed: co.claimed, members: co.members
  };
}

/* highest tier held by a single city */
function cityHighestTier(ct) {
  const held = TIER_ORDER.filter(t => ct.claims[t]);
  return held.length ? held[held.length - 1] : null;
}

/* total steps walked in a city (sum of every verified claim) */
function citySteps(ct) {
  let s = 0;
  Object.keys(ct.claims).forEach(t => { s += (TIER_STEPS[t] || 0) * ct.claims[t].length; });
  return s;
}
function cityWalkers(ct) {
  return Object.values(ct.claims).reduce((s, arr) => s + arr.length, 0);
}

/* big-number formatting — full commas, with a compact variant for tight UI */
function fmtSteps(n) { return n.toLocaleString('en-US'); }
function fmtStepsShort(n) {
  if (n >= 1e6) { const v = n / 1e6; return (v >= 10 ? v.toFixed(1) : v.toFixed(2)).replace(/\.?0+$/, '') + 'M'; }
  if (n >= 1e3) return Math.round(n / 1e3) + 'K';
  return '' + n;
}
