-- =============================================================================
-- Migration: Post-May 2 (Global 100K Day #1) data load
-- Created: 2026-05-05
-- Source: Google Sheet "Master claim board data" (100kstepclub@gmail.com Drive)
--
-- Four sections inside one transaction (atomic — either all land or none do):
--   (a) Schema change   — add `steps` column to claims (nullable for back-compat)
--   (b) Pre-flight check — abort if May 2 claims already exist (idempotency)
--   (c) Backfill         — historical Graeme claims: 'Graeme' → 'Graeme N.' + tier-floor steps
--   (d) New city         — Pleasanton, CA (sheet had typo 'Pleasonton', corrected on insert)
--   (e) New claims       — 8 verified walkers from Global 100K Day #1 (2026-05-02)
--
-- Conventions established:
--   - Display name format: 'First L.' (e.g. 'Maya R.', 'Graeme N.')
--   - Joint entries allowed: 'Milda & Matt' (no last initial period)
--   - Steps captured for the Walk to the Sun collective counter
--   - Historical claims backfilled with tier-floor steps (decided 2026-05-04)
-- =============================================================================

BEGIN;

-- (a) Schema: add steps column ----------------------------------------------
ALTER TABLE public.claims
  ADD COLUMN IF NOT EXISTS steps INTEGER CHECK (steps IS NULL OR steps > 0);

COMMENT ON COLUMN public.claims.steps IS
  'Raw step count from verification source (Strava/Apple Health/etc.). Required for new claims; nullable for historical seed back-compat. Feeds the Walk to the Sun collective counter.';

-- (b) Pre-flight idempotency check ------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.claims WHERE date = '2026-05-02') THEN
    RAISE EXCEPTION
      'May 2 claims already exist. This migration looks like it ran already. Inspect: SELECT * FROM public.claims WHERE date = ''2026-05-02'';';
  END IF;
END $$;

-- (c) Backfill historical Graeme claims --------------------------------------
-- Display name: 'Graeme' -> 'Graeme N.'
-- Steps: tier-floor (10K=10000, 25K=25000, 50K=50000, 75K=75000, 100K=100000)
UPDATE public.claims
SET holder = 'Graeme N.',
    steps = CASE tier
      WHEN '10K'  THEN 10000
      WHEN '25K'  THEN 25000
      WHEN '50K'  THEN 50000
      WHEN '75K'  THEN 75000
      WHEN '100K' THEN 100000
    END
WHERE holder = 'Graeme';

-- (d) New city: Pleasanton, CA ----------------------------------------------
-- Walker entered 'Pleasonton' (typo) on the sheet; corrected here on insert.
-- Coordinates: standard centre of Pleasanton, CA.
INSERT INTO public.cities (country, state, city, lat, lon)
VALUES ('United States', 'California', 'Pleasanton', 37.6624, -121.8747)
ON CONFLICT (country, state, city) DO NOTHING;

-- (e) New claims: Global 100K Day #1 verified walkers -----------------------
-- 8 rows from sheet 'Master claim board data' as of 2026-05-05.
-- Pattern: each INSERT does a SELECT against cities to fetch city_id by composite key.

-- 1. Nicole L. — San Francisco — 25K — 25,661 steps — 4h 39m
INSERT INTO public.claims (city_id, tier, holder, steps, time_seconds, date, verified, verified_at)
SELECT id, '25K', 'Nicole L.', 25661, 16740, '2026-05-02', true, now()
FROM public.cities
WHERE country = 'United States' AND state = 'California' AND city = 'San Francisco';

-- 2. Aqsa M. — Toronto — 10K — 10,520 steps — 2h 30m
INSERT INTO public.claims (city_id, tier, holder, steps, time_seconds, date, verified, verified_at)
SELECT id, '10K', 'Aqsa M.', 10520, 9000, '2026-05-02', true, now()
FROM public.cities
WHERE country = 'Canada' AND state = 'Ontario' AND city = 'Toronto';

-- 3. Jaclyn L. — Vancouver — 10K — 17,937 steps — 3h 0m
INSERT INTO public.claims (city_id, tier, holder, steps, time_seconds, date, verified, verified_at)
SELECT id, '10K', 'Jaclyn L.', 17937, 10800, '2026-05-02', true, now()
FROM public.cities
WHERE country = 'Canada' AND state = 'British Columbia' AND city = 'Vancouver';

-- 4. Jason R. — San Francisco — 25K — 26,643 steps — 12h 1m
INSERT INTO public.claims (city_id, tier, holder, steps, time_seconds, date, verified, verified_at)
SELECT id, '25K', 'Jason R.', 26643, 43260, '2026-05-02', true, now()
FROM public.cities
WHERE country = 'United States' AND state = 'California' AND city = 'San Francisco';

-- 5. Brendan K. — Toronto — 10K — 12,309 steps — 1h 15m
INSERT INTO public.claims (city_id, tier, holder, steps, time_seconds, date, verified, verified_at)
SELECT id, '10K', 'Brendan K.', 12309, 4500, '2026-05-02', true, now()
FROM public.cities
WHERE country = 'Canada' AND state = 'Ontario' AND city = 'Toronto';

-- 6. Milda & Matt — Pleasanton — 25K — 30,261 steps — 14h 1m (joint claim)
INSERT INTO public.claims (city_id, tier, holder, steps, time_seconds, date, verified, verified_at)
SELECT id, '25K', 'Milda & Matt', 30261, 50460, '2026-05-02', true, now()
FROM public.cities
WHERE country = 'United States' AND state = 'California' AND city = 'Pleasanton';

-- 7. Zane K. — Vancouver — 25K — 26,554 steps — 12h 3m
INSERT INTO public.claims (city_id, tier, holder, steps, time_seconds, date, verified, verified_at)
SELECT id, '25K', 'Zane K.', 26554, 43380, '2026-05-02', true, now()
FROM public.cities
WHERE country = 'Canada' AND state = 'British Columbia' AND city = 'Vancouver';

-- 8. Graeme N. — Toronto — 100K — 100,540 steps — 17h 14m
-- Note: existing 2024 Toronto 100K record (57,960s = 16h 6m) remains the leader.
-- This May 2 attempt becomes rank 2 in the (Toronto, 100K) tier.
INSERT INTO public.claims (city_id, tier, holder, steps, time_seconds, date, verified, verified_at)
SELECT id, '100K', 'Graeme N.', 100540, 62040, '2026-05-02', true, now()
FROM public.cities
WHERE country = 'Canada' AND state = 'Ontario' AND city = 'Toronto';

COMMIT;
