-- ==========================================================================
-- Seed: cities
-- ==========================================================================
-- The 45 cities the Claim Board V1 understands. Idempotent via ON CONFLICT.
-- Add more rows here whenever a new signup or claim lands in a city we
-- haven't seen before — the leaderboard needs a row for lat/lon geocoding.
-- ==========================================================================

INSERT INTO public.cities (city, country, state, lat, lon) VALUES
  -- Canada
  ('Toronto',     'Canada',         'Ontario',           43.65,  -79.38),
  ('Vancouver',   'Canada',         'British Columbia',  49.28, -123.12),
  ('Calgary',     'Canada',         'Alberta',           51.05, -114.07),
  ('Montreal',    'Canada',         'Quebec',            45.50,  -73.57),
  ('Halifax',     'Canada',         'Nova Scotia',       44.65,  -63.58),
  -- United States
  ('San Francisco','United States', 'California',        37.77, -122.42),
  ('New York',    'United States',  'New York',          40.71,  -74.01),
  ('Chicago',     'United States',  'Illinois',          41.88,  -87.63),
  ('Austin',      'United States',  'Texas',             30.27,  -97.74),
  ('Seattle',     'United States',  'Washington',        47.61, -122.33),
  ('Portland',    'United States',  'Oregon',            45.52, -122.68),
  ('Denver',      'United States',  'Colorado',          39.74, -104.99),
  ('Miami',       'United States',  'Florida',           25.76,  -80.19),
  -- Europe
  ('London',      'United Kingdom', NULL,                51.51,   -0.13),
  ('Edinburgh',   'United Kingdom', NULL,                55.95,   -3.19),
  ('Manchester',  'United Kingdom', NULL,                53.48,   -2.24),
  ('Berlin',      'Germany',        NULL,                52.52,   13.40),
  ('Paris',       'France',         NULL,                48.85,    2.35),
  ('Lyon',        'France',         NULL,                45.76,    4.84),
  ('Amsterdam',   'Netherlands',    NULL,                52.37,    4.90),
  ('Stockholm',   'Sweden',         NULL,                59.33,   18.07),
  ('Oslo',        'Norway',         NULL,                59.91,   10.75),
  ('Copenhagen',  'Denmark',        NULL,                55.68,   12.57),
  ('Zurich',      'Switzerland',    NULL,                47.38,    8.54),
  ('Barcelona',   'Spain',          NULL,                41.39,    2.17),
  ('Milan',       'Italy',          NULL,                45.46,    9.19),
  ('Dublin',      'Ireland',        NULL,                53.35,   -6.26),
  -- Asia + Oceania
  ('Tokyo',       'Japan',          NULL,                35.68,  139.69),
  ('Osaka',       'Japan',          NULL,                34.69,  135.50),
  ('Seoul',       'South Korea',    NULL,                37.57,  126.98),
  ('Singapore',   'Singapore',      NULL,                 1.35,  103.82),
  ('Mumbai',      'India',          NULL,                19.08,   72.88),
  ('Bangkok',     'Thailand',       NULL,                13.76,  100.50),
  ('Jakarta',     'Indonesia',      NULL,                -6.21,  106.85),
  ('Dubai',       'UAE',            NULL,                25.20,   55.27),
  ('Sydney',      'Australia',      NULL,               -33.87,  151.21),
  ('Melbourne',   'Australia',      NULL,               -37.81,  144.96),
  ('Auckland',    'New Zealand',    NULL,               -36.85,  174.76),
  -- Africa + Americas (ex-US)
  ('Cape Town',    'South Africa',  NULL,               -33.92,   18.42),
  ('Nairobi',      'Kenya',         NULL,                -1.29,   36.82),
  ('Mexico City',  'Mexico',        NULL,                19.43,  -99.13),
  ('Sao Paulo',    'Brazil',        NULL,               -23.55,  -46.63),
  ('Buenos Aires', 'Argentina',     NULL,               -34.60,  -58.38),
  ('Lima',         'Peru',          NULL,               -12.05,  -77.04)
ON CONFLICT (country, city) DO UPDATE
  SET lat = EXCLUDED.lat, lon = EXCLUDED.lon, state = EXCLUDED.state;
