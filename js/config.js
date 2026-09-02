// Supabase Configuration
// These are public keys — safe for frontend use
// Row Level Security on Supabase protects the data

const SUPABASE_URL = 'https://jnruheqcmqqkdldhicbg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_nGYhnXpeCyhQ_mXrEG6Qwg_XkwIimUK';

// Public runtime configuration only. The Cloudflare Turnstile site key is safe to
// expose in the browser; its matching secret belongs only in Supabase Edge secrets.
const TURNSTILE_SITE_KEY = '0x4AAAAAAElFigaLPuqrXTE9';
