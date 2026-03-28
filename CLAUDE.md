# 100K Step Club — Website

## What This Repo Is
The public website for 100K Step Club, deployed at [100kstepclub.com](https://100kstepclub.com).

## Context (from Graude)
Full project brief, brand voice, tier system, and design references live in the Graude knowledge base:
- Project brief: `@~/Desktop/Graude/100K-Step-Club/CLAUDE.md`
- Brand voice: `@~/Desktop/Graude/100K-Step-Club/brand-voice.md`
- Design system: Google Drive → Design System/100K-Design-System-v1.html

## Tech Stack
- Plain HTML / CSS / JavaScript — no frameworks, no build tools
- Supabase for database (`landingpage_signups` table with RLS)
- Supabase Edge Function for welcome email (via Resend)
- Hosted on Vercel — auto-deploys from GitHub on push to `main`
- Mobile-first design

## File Structure
```
index.html        ← Single-page site
css/style.css     ← All styles
js/main.js        ← Stars, scroll reveals, space journey, countdown, signup form
js/lava.js        ← WebGL lava metaball shader (scroll-reactive background)
js/config.js      ← Supabase public keys (safe for frontend, RLS protects data)
favicon.svg       ← Site icon
```

## Deploy Process
1. Push to `main` on GitHub
2. Vercel auto-builds and deploys
3. No build step — Vercel serves static files directly
4. Domain: 100kstepclub.com (DNS A → 76.76.21.21, CNAME www → cname.vercel-dns.com)

## Rules
1. All copy follows the brand voice guide. No exceptions.
2. Must work perfectly on mobile.
3. No unnecessary dependencies. Keep it simple.
4. Never commit API keys, tokens, or secrets. `js/config.js` contains only public Supabase keys.
5. Kilometres first, miles in brackets for all distances.
