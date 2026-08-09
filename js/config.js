// Supabase Configuration
// These are public keys — safe for frontend use
// Row Level Security on Supabase protects the data

const SUPABASE_URL = 'https://jnruheqcmqqkdldhicbg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_nGYhnXpeCyhQ_mXrEG6Qwg_XkwIimUK';

// Public runtime configuration only. Deployment replaces this placeholder with the
// Cloudflare Turnstile site key; the secret key belongs only in Supabase Edge secrets.
const TURNSTILE_SITE_KEY = 'REPLACE_WITH_TURNSTILE_SITE_KEY';
