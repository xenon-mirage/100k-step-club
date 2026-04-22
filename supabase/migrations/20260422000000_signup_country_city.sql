-- ==========================================================================
-- Signup form — structured country + city capture
-- ==========================================================================
-- Replaces the free-text `city` field on `landingpage_signups` with a
-- cascading Country → City dropdown on the frontend. Adds:
--   • country text            — display country from the Country select
--   • city_id bigint FK       — references public.cities(id); null when the
--                               user picks "Other city" and types free-form
--   • idx_landingpage_signups_city_id  for the signup-only JOIN
--   • get_leaderboard_signup_only()   rewritten to prefer city_id match
--                                     with a transitional text fallback for
--                                     legacy rows inserted before this ran
--   • v_city_suggestions       review queue for "Other city" entries that
--                               don't yet exist in the cities seed
--
-- `city` (the existing free-text column) is retained as the display name
-- fallback for "Other city" rows and for legacy signups. Not authoritative.
-- ==========================================================================

ALTER TABLE public.landingpage_signups
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS city_id bigint REFERENCES public.cities(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_landingpage_signups_city_id
  ON public.landingpage_signups (city_id);

-- --------------------------------------------------------------------------
-- Rewrite: signup-only cities — prefer FK, fall back to text for legacy rows
-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_leaderboard_signup_only()
RETURNS TABLE (
  city    text,
  country text,
  state   text,
  lat     double precision,
  lon     double precision
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT c.city, c.country, c.state, c.lat, c.lon
  FROM public.cities c
  WHERE (
    -- Preferred: FK match on signups captured via the new dropdown
    EXISTS (SELECT 1 FROM public.landingpage_signups s WHERE s.city_id = c.id)
    -- Transitional: legacy free-text signups where city_id is null
    OR EXISTS (
      SELECT 1 FROM public.landingpage_signups s
      WHERE s.city_id IS NULL
        AND lower(trim(s.city)) = lower(c.city)
    )
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.claims cl
    WHERE cl.city_id = c.id AND cl.verified = true
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_leaderboard_signup_only() TO anon, authenticated;

-- --------------------------------------------------------------------------
-- Review queue: "Other city" entries awaiting seed addition
-- --------------------------------------------------------------------------
-- Grouped so repeat submissions for the same city show up once with a count.
-- Graeme reviews from the Supabase dashboard:
--   SELECT * FROM public.v_city_suggestions;
-- Not exposed to anon — could reveal patterns adjacent to PII.
-- Intentionally omits the timestamp column — the source table's timestamp
-- predates these migrations and the column name is uncertain; if Graeme
-- wants recency, he can query the base table directly.
-- --------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.v_city_suggestions AS
SELECT
  city,
  country,
  count(*) AS signup_count
FROM public.landingpage_signups
WHERE city_id IS NULL
  AND city IS NOT NULL
  AND trim(city) <> ''
GROUP BY city, country
ORDER BY signup_count DESC, country, city;

GRANT SELECT ON public.v_city_suggestions TO authenticated;
