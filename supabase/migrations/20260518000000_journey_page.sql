-- 20260518000000_journey_page.sql
-- Adds the data layer for the new "Journey to the Sun" page:
--   1. v_step_totals view  → live collective step counter (sum of verified claims)
--   2. event_id + event_name columns on claims + index
--   3. Backfill May 2 2026 Global 100K Day #1 event tag on existing claims
--   4. v_recent_walkers view → last 30 days of verified walkers for the "featured" section
--
-- Both views are public-read so the journey.html frontend can fetch with anon key.
-- No new tables — claims remains the single source of truth.

BEGIN;

------------------------------------------------------------------------------
-- 1. v_step_totals  (collective counter)
------------------------------------------------------------------------------
-- One row, multiple columns. Frontend: sb.from('v_step_totals').select('*').single()

CREATE OR REPLACE VIEW public.v_step_totals AS
SELECT
  COUNT(*) FILTER (WHERE verified = true)                                   AS verified_claims_count,
  COALESCE(SUM(steps) FILTER (WHERE verified = true), 0)                    AS total_steps,
  COALESCE(SUM(steps) FILTER (WHERE verified = true AND date = CURRENT_DATE), 0) AS today_steps,
  MIN(date) FILTER (WHERE verified = true)                                  AS first_claim_date,
  MAX(date) FILTER (WHERE verified = true)                                  AS last_claim_date
FROM public.claims;

GRANT SELECT ON public.v_step_totals TO anon, authenticated;

COMMENT ON VIEW public.v_step_totals IS
  'Live aggregate of verified claim steps. Used by /journey.html for the collective counter.';

------------------------------------------------------------------------------
-- 2. event_id + event_name on claims
------------------------------------------------------------------------------
-- Tags a claim with an event (e.g. Global 100K Day) for grouping. NULL is allowed
-- so historical claims and casual day-of claims don't need an event association.

ALTER TABLE public.claims
  ADD COLUMN IF NOT EXISTS event_id   text,
  ADD COLUMN IF NOT EXISTS event_name text;

CREATE INDEX IF NOT EXISTS idx_claims_event_id ON public.claims (event_id);

COMMENT ON COLUMN public.claims.event_id IS
  'Slug for grouping claims by event, e.g. ''global-100k-day-2026-05-02''. NULL if unassociated.';
COMMENT ON COLUMN public.claims.event_name IS
  'Display name for the event, e.g. ''Global 100K Day #1''. Mirrors event_id for UI rendering.';

------------------------------------------------------------------------------
-- 3. Backfill May 2 2026 claims with event tag
------------------------------------------------------------------------------

UPDATE public.claims
   SET event_id   = 'global-100k-day-2026-05-02',
       event_name = 'Global 100K Day #1'
 WHERE date = '2026-05-02'
   AND verified = true
   AND event_id IS NULL;

------------------------------------------------------------------------------
-- 4. v_recent_walkers  (last 30 days, joined with cities for display)
------------------------------------------------------------------------------
-- Powers the "featured walkers" section on /journey.html. Returns every verified
-- claim from the last 30 days with city/country context. Frontend can filter,
-- group, or limit further; the rolling-window logic lives here in SQL.

CREATE OR REPLACE VIEW public.v_recent_walkers AS
SELECT
  cl.id,
  cl.holder,
  cl.tier,
  cl.steps,
  cl.date,
  cl.time_seconds,
  cl.event_id,
  cl.event_name,
  c.city,
  c.country,
  c.state,
  c.lat,
  c.lon
FROM public.claims cl
JOIN public.cities c ON c.id = cl.city_id
WHERE cl.verified = true
  AND cl.date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY cl.date DESC, cl.steps DESC NULLS LAST, cl.holder ASC;

GRANT SELECT ON public.v_recent_walkers TO anon, authenticated;

COMMENT ON VIEW public.v_recent_walkers IS
  'Verified claims from the last 30 days with city context. Powers the featured walkers section on /journey.html.';

COMMIT;

------------------------------------------------------------------------------
-- Verification queries (run after applying):
--   SELECT * FROM public.v_step_totals;
--   SELECT COUNT(*) FROM public.v_recent_walkers;
--   SELECT DISTINCT event_id, event_name FROM public.claims WHERE event_id IS NOT NULL;
------------------------------------------------------------------------------
