-- ==========================================================================
-- Seed: claims (Graeme's actual attempts — fill in real values)
-- ==========================================================================
-- Replace every [REPLACE] token with a real value and run the block.
-- Only rows with verified = true appear on the public leaderboard.
--
-- time_seconds reference:
--     10K  ≈  5400  (1h 30m)       75K ≈ 50400 (14h 00m)
--     25K  ≈ 15300  (4h 15m)      100K ≈ 68820 (19h 07m)
--     50K  ≈ 32400  (9h 00m)
-- Convert your real wall-clock time: hours*3600 + minutes*60.
-- ==========================================================================

-- Example: Graeme's April 11 Toronto attempt.
-- If you hit 100K, leave the tier as '100K'. If you stopped earlier (e.g. at
-- 75K), change the tier and time_seconds to match the tier you actually
-- completed. Claims only count for tiers fully reached.
INSERT INTO public.claims (city_id, tier, holder, time_seconds, date, verified, verified_at)
SELECT c.id, '100K'::text, 'Graeme'::text, 68820::integer, '2026-04-11'::date, true, now()
FROM public.cities c
WHERE c.country = 'Canada' AND c.city = 'Toronto'
ON CONFLICT DO NOTHING;

-- Add a row per tier you actually completed (you can hold multiple tiers in
-- the same city simultaneously — one claim per tier).
-- INSERT INTO public.claims (city_id, tier, holder, time_seconds, date, verified, verified_at)
-- SELECT c.id, '[TIER]'::text, '[HOLDER]'::text, [SECONDS]::integer, '[YYYY-MM-DD]'::date, true, now()
-- FROM public.cities c
-- WHERE c.country = '[COUNTRY]' AND c.city = '[CITY]'
-- ON CONFLICT DO NOTHING;

-- ==========================================================================
-- After seeding, sanity-check:
--   SELECT * FROM public.v_leaderboard_claims;
-- Should return one row per (city, tier) with holder + time.
-- ==========================================================================
