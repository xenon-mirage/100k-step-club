-- Migration: Add 35K "Realizing" tier to the claims_tier_check constraint
-- Date: 2026-05-17
--
-- Adds 35K as a valid tier value (slotted between 25K and 50K in the step ladder).
-- Existing claims data is unaffected — this only widens the allowed set.
--
-- Tier metadata (for reference, not enforced in schema):
--   35K — Realizing — Emerald Clear #10B981 / ring #047857 — ~28 km / 5-7 hrs

ALTER TABLE public.claims DROP CONSTRAINT IF EXISTS claims_tier_check;

ALTER TABLE public.claims
  ADD CONSTRAINT claims_tier_check
  CHECK (tier IN ('10K','25K','35K','50K','75K','100K'));
