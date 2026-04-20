-- ==========================================================================
-- Claim Board leaderboard — schema
-- ==========================================================================
-- Three objects power the public /leaderboard.html page:
--   cities                              — canonical place list with lat/lon
--   claims                              — verified tier completions (history preserved)
--   v_leaderboard_claims                — view: fastest verified claim per (city, tier)
--   get_leaderboard_signup_only()       — fn: signup-only cities (reads landingpage_signups)
--
-- RLS: cities + verified claims are public-readable. Writes are service-role only.
-- The signup-only lookup uses a SECURITY DEFINER function so anon can see which
-- cities have signups without getting read access to the underlying email data.
-- ==========================================================================

-- --------------------------------------------------------------------------
-- cities
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.cities (
  id         bigserial PRIMARY KEY,
  city       text NOT NULL,
  country    text NOT NULL,
  state      text,
  lat        double precision NOT NULL CHECK (lat BETWEEN -90 AND 90),
  lon        double precision NOT NULL CHECK (lon BETWEEN -180 AND 180),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cities_country_city_key UNIQUE (country, city),
  CONSTRAINT cities_state_required_for_us_ca CHECK (
    state IS NOT NULL OR country NOT IN ('United States', 'Canada')
  )
);

CREATE INDEX IF NOT EXISTS idx_cities_country       ON public.cities (country);
CREATE INDEX IF NOT EXISTS idx_cities_country_state ON public.cities (country, state);

-- --------------------------------------------------------------------------
-- claims
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.claims (
  id           bigserial PRIMARY KEY,
  city_id      bigint NOT NULL REFERENCES public.cities(id) ON DELETE RESTRICT,
  tier         text NOT NULL CHECK (tier IN ('10K','25K','50K','75K','100K')),
  holder       text NOT NULL,
  time_seconds integer NOT NULL CHECK (time_seconds > 0),
  date         date NOT NULL,
  verified     boolean NOT NULL DEFAULT false,
  verified_at  timestamptz,
  submitted_at timestamptz NOT NULL DEFAULT now()
);

-- Hot query: fastest verified claim per (city, tier)
CREATE INDEX IF NOT EXISTS idx_claims_city_tier_time
  ON public.claims (city_id, tier, time_seconds ASC);

CREATE INDEX IF NOT EXISTS idx_claims_verified
  ON public.claims (verified) WHERE verified = true;

-- --------------------------------------------------------------------------
-- RLS on base tables
-- --------------------------------------------------------------------------

ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cities public read"  ON public.cities;
DROP POLICY IF EXISTS "claims public read verified" ON public.claims;

CREATE POLICY "cities public read" ON public.cities
  FOR SELECT
  USING (true);

-- Only verified claims are visible to anon/authenticated.
-- Unverified submissions stay invisible until a moderator flips the flag.
CREATE POLICY "claims public read verified" ON public.claims
  FOR SELECT
  USING (verified = true);

-- --------------------------------------------------------------------------
-- View: leaderboard claims (fastest verified per city, tier)
-- --------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.v_leaderboard_claims AS
SELECT DISTINCT ON (c.id, cl.tier)
  c.city,
  c.country,
  c.state,
  c.lat,
  c.lon,
  cl.tier,
  cl.holder,
  cl.time_seconds,
  to_char(cl.date, 'YYYY-MM-DD') AS date
FROM public.cities c
JOIN public.claims cl ON cl.city_id = c.id
WHERE cl.verified = true
ORDER BY c.id, cl.tier, cl.time_seconds ASC;

-- Explicit grant for PostgREST-via-anon access.
GRANT SELECT ON public.v_leaderboard_claims TO anon, authenticated;

-- --------------------------------------------------------------------------
-- Function: signup-only cities
-- --------------------------------------------------------------------------
-- Returns cities that have at least one row in landingpage_signups matching
-- by (lower-cased) city name AND zero verified claims. Runs as SECURITY DEFINER
-- so anon can read the aggregated result without getting SELECT on the
-- email-bearing landingpage_signups table.
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
  SELECT c.city, c.country, c.state, c.lat, c.lon
  FROM public.cities c
  WHERE EXISTS (
    SELECT 1 FROM public.landingpage_signups s
    WHERE lower(trim(s.city)) = lower(c.city)
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.claims cl
    WHERE cl.city_id = c.id AND cl.verified = true
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_leaderboard_signup_only() TO anon, authenticated;

-- --------------------------------------------------------------------------
-- Updated-at trigger for cities
-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS cities_set_updated_at ON public.cities;
CREATE TRIGGER cities_set_updated_at
  BEFORE UPDATE ON public.cities
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
