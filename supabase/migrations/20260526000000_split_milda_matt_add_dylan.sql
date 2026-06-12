-- =============================================================================
-- Migration: Split joint 'Milda & Matt' claim + add Dylan P. (Accra, Ghana)
-- Created: 2026-05-26
-- Source: Google Sheet "Master claim board data" (100kstepclub@gmail.com Drive)
--
-- Corrections + late additions to the May 2 (Global 100K Day #1) data:
--
--   (a) Split the joint 'Milda & Matt' Pleasanton 25K claim into two walkers.
--       They walked together but are two separate people; the sheet now lists
--       them as two rows. The joint row carried Milda's time (50,460s = 14h 1m),
--       so that row is renamed in place to 'Milda S.' (preserving her exact
--       record + original timestamps) and 'Matt O.' is added as his own claim
--       (50,520s = 14h 2m, one minute behind). Both hold 25K in Pleasanton;
--       Milda is the (city, tier) leader on time, Matt ranks second.
--
--   (b) Add Dylan P. — Accra, Ghana — 35K — 35,987 steps — 14h 23m (51,780s).
--       The 35K 'Realizing' tier only became valid on 2026-05-17 (see
--       20260517000000_add_35k_tier.sql), after the original May 2 load — which
--       is why this claim lands now. First verified claim in Ghana: adds a new
--       country to the board.
--
--   (c) Add Morgana C. — Toronto, ON — 25K — 33,423 steps — 13h 17m (47,820s).
--       First 25K claim in Toronto, so she leads that (city, tier).
--
--   (d) Add Vlad M. — Vancouver, BC — 25K — 30,910 steps — 10h 30m (37,800s).
--       Faster than Zane K. (12h 3m), so Vlad becomes the Vancouver 25K leader
--       and Zane drops to rank 2. (Sheet state corrected to British Columbia.)
--
-- Morgana, Vlad and Dylan were verified after the 2026-05-05 load, which is why
-- the live board was missing them until now. Toronto and Vancouver already
-- exist in cities.
--
-- Conventions (unchanged from 20260505): display name 'First L.';
-- INSERT..SELECT resolves city_id by composite key; steps captured for the
-- Walk to the Sun collective counter. Both Accra and Pleasanton already exist
-- in cities (Accra via seed 01_cities.sql; Pleasanton via the May 2 migration).
--
-- Idempotent: every write is guarded, so re-running is a safe no-op.
-- =============================================================================

BEGIN;

-- (a) Split the joint claim --------------------------------------------------
-- The joint 'Milda & Matt' row already holds Milda's time (50,460s), so rename
-- it in place rather than delete + reinsert — keeps her id / verified_at intact.
UPDATE public.claims
SET holder = 'Milda S.'
WHERE holder = 'Milda & Matt'
  AND date = '2026-05-02';

-- Add Matt as his own claim (14h 2m). NOT EXISTS guard prevents a re-run dup.
INSERT INTO public.claims (city_id, tier, holder, steps, time_seconds, date, verified, verified_at)
SELECT c.id, '25K', 'Matt O.', 30261, 50520, '2026-05-02', true, now()
FROM public.cities c
WHERE c.country = 'United States' AND c.state = 'California' AND c.city = 'Pleasanton'
  AND NOT EXISTS (
    SELECT 1 FROM public.claims x
    WHERE x.holder = 'Matt O.' AND x.date = '2026-05-02'
  );

-- (b) Add Dylan P. — Accra, Ghana — 35K --------------------------------------
INSERT INTO public.claims (city_id, tier, holder, steps, time_seconds, date, verified, verified_at)
SELECT c.id, '35K', 'Dylan P.', 35987, 51780, '2026-05-02', true, now()
FROM public.cities c
WHERE c.country = 'Ghana' AND c.city = 'Accra'
  AND NOT EXISTS (
    SELECT 1 FROM public.claims x
    WHERE x.holder = 'Dylan P.' AND x.date = '2026-05-02'
  );

-- (c) Add Morgana C. — Toronto, ON — 25K -------------------------------------
INSERT INTO public.claims (city_id, tier, holder, steps, time_seconds, date, verified, verified_at)
SELECT c.id, '25K', 'Morgana C.', 33423, 47820, '2026-05-02', true, now()
FROM public.cities c
WHERE c.country = 'Canada' AND c.state = 'Ontario' AND c.city = 'Toronto'
  AND NOT EXISTS (
    SELECT 1 FROM public.claims x
    WHERE x.holder = 'Morgana C.' AND x.date = '2026-05-02'
  );

-- (d) Add Vlad M. — Vancouver, BC — 25K --------------------------------------
INSERT INTO public.claims (city_id, tier, holder, steps, time_seconds, date, verified, verified_at)
SELECT c.id, '25K', 'Vlad M.', 30910, 37800, '2026-05-02', true, now()
FROM public.cities c
WHERE c.country = 'Canada' AND c.state = 'British Columbia' AND c.city = 'Vancouver'
  AND NOT EXISTS (
    SELECT 1 FROM public.claims x
    WHERE x.holder = 'Vlad M.' AND x.date = '2026-05-02'
  );

COMMIT;

-- Verify after running:
--   SELECT c.city, c.country, cl.tier, cl.holder, cl.steps, cl.time_seconds
--   FROM public.claims cl
--   JOIN public.cities c ON c.id = cl.city_id
--   WHERE cl.date = '2026-05-02'
--   ORDER BY c.country, c.city, cl.time_seconds;
-- Expect: Pleasanton 25K shows 'Milda S.' (50460) + 'Matt O.' (50520);
--         Accra 35K shows 'Dylan P.' (51780);
--         Toronto 25K shows 'Morgana C.' (47820);
--         Vancouver 25K shows 'Vlad M.' (37800, leader) ahead of 'Zane K.' (43380).
