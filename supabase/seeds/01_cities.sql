-- ==========================================================================
-- Seed: cities (comprehensive)
-- ==========================================================================
-- 157 cities covering:
--   • All 13 Canadian provinces + territories
--   • All 50 US states + DC
--   • Every European country (UN members + micro-states)
--   • Major destinations across Asia, Oceania, Africa, and the Americas
--
-- Idempotent via ON CONFLICT (country, city) — safe to re-run.
-- ==========================================================================

INSERT INTO public.cities (city, country, state, lat, lon) VALUES
  -- =====================================================================
  -- CANADA (10 provinces + 3 territories)
  -- =====================================================================
  ('Toronto',        'Canada', 'Ontario',                   43.65,  -79.38),
  ('Ottawa',         'Canada', 'Ontario',                   45.42,  -75.70),
  ('Vancouver',      'Canada', 'British Columbia',          49.28, -123.12),
  ('Calgary',        'Canada', 'Alberta',                   51.05, -114.07),
  ('Edmonton',       'Canada', 'Alberta',                   53.55, -113.49),
  ('Montreal',       'Canada', 'Quebec',                    45.50,  -73.57),
  ('Halifax',        'Canada', 'Nova Scotia',               44.65,  -63.58),
  ('Winnipeg',       'Canada', 'Manitoba',                  49.90,  -97.14),
  ('Moncton',        'Canada', 'New Brunswick',             46.09,  -64.78),
  ('St. John''s',    'Canada', 'Newfoundland and Labrador', 47.56,  -52.71),
  ('Charlottetown',  'Canada', 'Prince Edward Island',      46.24,  -63.13),
  ('Saskatoon',      'Canada', 'Saskatchewan',              52.13, -106.67),
  ('Yellowknife',    'Canada', 'Northwest Territories',     62.45, -114.38),
  ('Iqaluit',        'Canada', 'Nunavut',                   63.75,  -68.52),
  ('Whitehorse',     'Canada', 'Yukon',                     60.72, -135.06),

  -- =====================================================================
  -- UNITED STATES (50 states + DC)
  -- =====================================================================
  ('Birmingham',     'United States', 'Alabama',              33.52,  -86.80),
  ('Anchorage',      'United States', 'Alaska',               61.22, -149.90),
  ('Phoenix',        'United States', 'Arizona',              33.45, -112.07),
  ('Little Rock',    'United States', 'Arkansas',             34.75,  -92.29),
  ('San Francisco',  'United States', 'California',           37.77, -122.42),
  ('Denver',         'United States', 'Colorado',             39.74, -104.99),
  ('Hartford',       'United States', 'Connecticut',          41.76,  -72.67),
  ('Wilmington',     'United States', 'Delaware',             39.74,  -75.55),
  ('Washington',     'United States', 'District of Columbia', 38.91,  -77.04),
  ('Miami',          'United States', 'Florida',              25.76,  -80.19),
  ('Atlanta',        'United States', 'Georgia',              33.75,  -84.39),
  ('Honolulu',       'United States', 'Hawaii',               21.31, -157.86),
  ('Boise',          'United States', 'Idaho',                43.62, -116.21),
  ('Chicago',        'United States', 'Illinois',             41.88,  -87.63),
  ('Indianapolis',   'United States', 'Indiana',              39.77,  -86.16),
  ('Des Moines',     'United States', 'Iowa',                 41.59,  -93.62),
  ('Wichita',        'United States', 'Kansas',               37.69,  -97.34),
  ('Louisville',     'United States', 'Kentucky',             38.25,  -85.76),
  ('New Orleans',    'United States', 'Louisiana',            29.95,  -90.07),
  ('Portland',       'United States', 'Maine',                43.66,  -70.26),
  ('Baltimore',      'United States', 'Maryland',             39.29,  -76.61),
  ('Boston',         'United States', 'Massachusetts',        42.36,  -71.06),
  ('Detroit',        'United States', 'Michigan',             42.33,  -83.05),
  ('Minneapolis',    'United States', 'Minnesota',            44.98,  -93.27),
  ('Jackson',        'United States', 'Mississippi',          32.30,  -90.18),
  ('St. Louis',      'United States', 'Missouri',             38.63,  -90.20),
  ('Billings',       'United States', 'Montana',              45.78, -108.50),
  ('Omaha',          'United States', 'Nebraska',             41.26,  -95.93),
  ('Las Vegas',      'United States', 'Nevada',               36.17, -115.14),
  ('Manchester',     'United States', 'New Hampshire',        42.99,  -71.46),
  ('Newark',         'United States', 'New Jersey',           40.73,  -74.17),
  ('Albuquerque',    'United States', 'New Mexico',           35.08, -106.65),
  ('New York',       'United States', 'New York',             40.71,  -74.01),
  ('Charlotte',      'United States', 'North Carolina',       35.23,  -80.84),
  ('Fargo',          'United States', 'North Dakota',         46.88,  -96.79),
  ('Columbus',       'United States', 'Ohio',                 39.96,  -82.99),
  ('Oklahoma City',  'United States', 'Oklahoma',             35.47,  -97.52),
  ('Portland',       'United States', 'Oregon',               45.52, -122.68),
  ('Philadelphia',   'United States', 'Pennsylvania',         39.95,  -75.17),
  ('Providence',     'United States', 'Rhode Island',         41.82,  -71.41),
  ('Charleston',     'United States', 'South Carolina',       32.78,  -79.93),
  ('Sioux Falls',    'United States', 'South Dakota',         43.54,  -96.73),
  ('Nashville',      'United States', 'Tennessee',            36.16,  -86.78),
  ('Austin',         'United States', 'Texas',                30.27,  -97.74),
  ('Salt Lake City', 'United States', 'Utah',                 40.76, -111.89),
  ('Burlington',     'United States', 'Vermont',              44.48,  -73.21),
  ('Richmond',       'United States', 'Virginia',             37.54,  -77.44),
  ('Seattle',        'United States', 'Washington',           47.61, -122.33),
  ('Charleston',     'United States', 'West Virginia',        38.35,  -81.63),
  ('Milwaukee',      'United States', 'Wisconsin',            43.04,  -87.91),
  ('Cheyenne',       'United States', 'Wyoming',              41.14, -104.82),

  -- =====================================================================
  -- EUROPE (all UN member states + micro-states)
  -- =====================================================================
  ('Tirana',           'Albania',                NULL, 41.33,  19.82),
  ('Andorra la Vella', 'Andorra',                NULL, 42.51,   1.52),
  ('Vienna',           'Austria',                NULL, 48.21,  16.37),
  ('Minsk',            'Belarus',                NULL, 53.90,  27.57),
  ('Brussels',         'Belgium',                NULL, 50.85,   4.35),
  ('Sarajevo',         'Bosnia and Herzegovina', NULL, 43.86,  18.41),
  ('Sofia',            'Bulgaria',               NULL, 42.70,  23.32),
  ('Zagreb',           'Croatia',                NULL, 45.82,  15.98),
  ('Nicosia',          'Cyprus',                 NULL, 35.19,  33.36),
  ('Prague',           'Czechia',                NULL, 50.08,  14.44),
  ('Copenhagen',       'Denmark',                NULL, 55.68,  12.57),
  ('Tallinn',          'Estonia',                NULL, 59.44,  24.75),
  ('Helsinki',         'Finland',                NULL, 60.17,  24.94),
  ('Paris',            'France',                 NULL, 48.85,   2.35),
  ('Lyon',             'France',                 NULL, 45.76,   4.84),
  ('Tbilisi',          'Georgia',                NULL, 41.72,  44.79),
  ('Berlin',           'Germany',                NULL, 52.52,  13.40),
  ('Athens',           'Greece',                 NULL, 37.98,  23.73),
  ('Budapest',         'Hungary',                NULL, 47.50,  19.04),
  ('Reykjavik',        'Iceland',                NULL, 64.15, -21.94),
  ('Dublin',           'Ireland',                NULL, 53.35,  -6.26),
  ('Rome',             'Italy',                  NULL, 41.90,  12.50),
  ('Milan',            'Italy',                  NULL, 45.46,   9.19),
  ('Pristina',         'Kosovo',                 NULL, 42.67,  21.17),
  ('Riga',             'Latvia',                 NULL, 56.95,  24.11),
  ('Vaduz',            'Liechtenstein',          NULL, 47.14,   9.52),
  ('Vilnius',          'Lithuania',              NULL, 54.69,  25.28),
  ('Luxembourg',       'Luxembourg',             NULL, 49.61,   6.13),
  ('Valletta',         'Malta',                  NULL, 35.90,  14.51),
  ('Chisinau',         'Moldova',                NULL, 47.01,  28.86),
  ('Monaco',           'Monaco',                 NULL, 43.74,   7.42),
  ('Podgorica',        'Montenegro',             NULL, 42.44,  19.26),
  ('Amsterdam',        'Netherlands',            NULL, 52.37,   4.90),
  ('Skopje',           'North Macedonia',        NULL, 41.99,  21.43),
  ('Oslo',             'Norway',                 NULL, 59.91,  10.75),
  ('Warsaw',           'Poland',                 NULL, 52.23,  21.01),
  ('Lisbon',           'Portugal',               NULL, 38.72,  -9.14),
  ('Bucharest',        'Romania',                NULL, 44.43,  26.10),
  ('Moscow',           'Russia',                 NULL, 55.76,  37.62),
  ('San Marino',       'San Marino',             NULL, 43.94,  12.45),
  ('Belgrade',         'Serbia',                 NULL, 44.79,  20.45),
  ('Bratislava',       'Slovakia',               NULL, 48.15,  17.11),
  ('Ljubljana',        'Slovenia',               NULL, 46.06,  14.51),
  ('Madrid',           'Spain',                  NULL, 40.42,  -3.70),
  ('Barcelona',        'Spain',                  NULL, 41.39,   2.17),
  ('Stockholm',        'Sweden',                 NULL, 59.33,  18.07),
  ('Zurich',           'Switzerland',            NULL, 47.38,   8.54),
  ('Istanbul',         'Turkey',                 NULL, 41.01,  28.98),
  ('Kyiv',             'Ukraine',                NULL, 50.45,  30.52),
  ('London',           'United Kingdom',         NULL, 51.51,  -0.13),
  ('Edinburgh',        'United Kingdom',         NULL, 55.95,  -3.19),
  ('Manchester',       'United Kingdom',         NULL, 53.48,  -2.24),
  ('Vatican City',     'Vatican City',           NULL, 41.90,  12.45),

  -- =====================================================================
  -- ASIA + OCEANIA
  -- =====================================================================
  ('Sydney',           'Australia',   NULL, -33.87, 151.21),
  ('Melbourne',        'Australia',   NULL, -37.81, 144.96),
  ('Beijing',          'China',       NULL,  39.90, 116.40),
  ('Shanghai',         'China',       NULL,  31.23, 121.47),
  ('Hong Kong',        'Hong Kong',   NULL,  22.32, 114.17),
  ('Mumbai',           'India',       NULL,  19.08,  72.88),
  ('Jakarta',          'Indonesia',   NULL,  -6.21, 106.85),
  ('Tel Aviv',         'Israel',      NULL,  32.08,  34.78),
  ('Tokyo',            'Japan',       NULL,  35.68, 139.69),
  ('Osaka',            'Japan',       NULL,  34.69, 135.50),
  ('Kyoto',            'Japan',       NULL,  35.01, 135.77),
  ('Kuala Lumpur',     'Malaysia',    NULL,   3.14, 101.69),
  ('Auckland',         'New Zealand', NULL, -36.85, 174.76),
  ('Wellington',       'New Zealand', NULL, -41.29, 174.78),
  ('Manila',           'Philippines', NULL,  14.60, 120.98),
  ('Singapore',        'Singapore',   NULL,   1.35, 103.82),
  ('Seoul',            'South Korea', NULL,  37.57, 126.98),
  ('Taipei',           'Taiwan',      NULL,  25.03, 121.57),
  ('Bangkok',          'Thailand',    NULL,  13.76, 100.50),
  ('Dubai',            'UAE',         NULL,  25.20,  55.27),
  ('Ho Chi Minh City', 'Vietnam',     NULL,  10.82, 106.63),

  -- =====================================================================
  -- AFRICA
  -- =====================================================================
  ('Cairo',        'Egypt',        NULL,  30.04,  31.24),
  ('Addis Ababa',  'Ethiopia',     NULL,   9.03,  38.74),
  ('Accra',        'Ghana',        NULL,   5.60,  -0.19),
  ('Nairobi',      'Kenya',        NULL,  -1.29,  36.82),
  ('Casablanca',   'Morocco',      NULL,  33.57,  -7.59),
  ('Lagos',        'Nigeria',      NULL,   6.52,   3.38),
  ('Dakar',        'Senegal',      NULL,  14.72, -17.47),
  ('Cape Town',    'South Africa', NULL, -33.92,  18.42),
  ('Johannesburg', 'South Africa', NULL, -26.20,  28.04),

  -- =====================================================================
  -- AMERICAS (non-US/Canada)
  -- =====================================================================
  ('Buenos Aires',   'Argentina', NULL, -34.60, -58.38),
  ('Sao Paulo',      'Brazil',    NULL, -23.55, -46.63),
  ('Rio de Janeiro', 'Brazil',    NULL, -22.91, -43.17),
  ('Santiago',       'Chile',     NULL, -33.45, -70.67),
  ('Bogota',         'Colombia',  NULL,   4.71, -74.07),
  ('Quito',          'Ecuador',   NULL,  -0.18, -78.47),
  ('Mexico City',    'Mexico',    NULL,  19.43, -99.13),
  ('Lima',           'Peru',      NULL, -12.05, -77.04),
  ('Montevideo',     'Uruguay',   NULL, -34.90, -56.16)

ON CONFLICT (country, state, city) DO UPDATE
  SET lat = EXCLUDED.lat, lon = EXCLUDED.lon;
