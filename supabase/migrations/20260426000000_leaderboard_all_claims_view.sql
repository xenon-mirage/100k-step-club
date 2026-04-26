-- ==========================================================================
-- Claim Board — every verified walker per (city, tier), with server-computed rank
-- ==========================================================================
-- Powers the expanded city panel on /leaderboard.html. The existing
-- v_leaderboard_claims view (fastest only, DISTINCT ON) stays untouched —
-- this is additive. RLS on claims already permits anon reads of verified
-- rows, so no new policy is needed.
-- ==========================================================================

CREATE OR REPLACE VIEW public.v_city_claims_all AS
SELECT
  c.city,
  c.country,
  c.state,
  c.lat,
  c.lon,
  cl.tier,
  cl.holder,
  cl.time_seconds,
  to_char(cl.date, 'YYYY-MM-DD') AS date,
  ROW_NUMBER() OVER (
    PARTITION BY c.id, cl.tier
    ORDER BY cl.time_seconds ASC, cl.verified_at ASC NULLS LAST, cl.id ASC
  ) AS rank,
  COUNT(*) OVER (PARTITION BY c.id, cl.tier) AS tier_total
FROM public.cities c
JOIN public.claims cl ON cl.city_id = c.id
WHERE cl.verified = true
ORDER BY c.country, c.state NULLS FIRST, c.city, cl.tier, rank;

GRANT SELECT ON public.v_city_claims_all TO anon, authenticated;
