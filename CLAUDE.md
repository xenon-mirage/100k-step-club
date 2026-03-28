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
index.html             ← Single-page site
css/style.css          ← All styles
js/main.js             ← Stars, scroll reveals, countdown, signup form
js/space-journey.js    ← Three.js space journey visualizer (Earth, planets, sun)
js/lava.js             ← WebGL lava metaball shader (scroll-reactive background)
js/three.min.js        ← Three.js library (r152)
js/config.js           ← Supabase public keys (safe for frontend, RLS protects data)
textures/              ← Earth day + cloud textures (1k mobile, 2k desktop)
favicon.svg            ← Site icon
```

## Deploy Process
1. Push to `main` on GitHub
2. Vercel auto-builds and deploys
3. No build step — Vercel serves static files directly
4. Domain: 100kstepclub.com (DNS A → 76.76.21.21, CNAME www → cname.vercel-dns.com)

## Dev Server & Preview

The website repo lives at `~/Desktop/100k-step-club/` but Claude sessions typically start from `~/Desktop/Graude/100K-Step-Club/` for context stacking. This causes preview/server tools to fail because they inherit the wrong working directory.

**What works:**
```bash
cd /Users/graemenixon/Desktop/100k-step-club && python3 -m http.server 8080
```
Run this via Bash (with `run_in_background: true`). The `cd` is mandatory — the server must start from the website repo root so it can serve `index.html` and all assets.

**What doesn't work:**
- `preview_start` / launch.json — fails with `getcwd` permission errors when the session CWD is the Graude folder, not the website repo. The Python http.server module calls `os.getcwd()` before parsing the `-d` flag, so even an explicit directory arg won't help.
- Starting the server without `cd` — serves files from the wrong directory.

**Port conflicts:** If port 8080 is already in use, kill it first:
```bash
lsof -ti:8080 | xargs kill -9 2>/dev/null
```

**Access:** `http://localhost:8080` in the browser.

**Verifying changes — IMPORTANT:**
Python's `http.server` aggressively caches CSS and JS files. After editing CSS/JS, always:
1. Kill and restart the server: `lsof -ti:8080 | xargs kill -9 2>/dev/null; cd /Users/graemenixon/Desktop/100k-step-club && python3 -m http.server 8080`
2. Hard-refresh the browser (`Cmd+Shift+R`) — a normal reload will serve stale files.
3. Confirm the new CSS/JS is loaded before debugging (check via DevTools or `document.styleSheets` inspection).

Do this **before** scrolling through to verify visual changes. Don't waste cycles debugging when the browser is running old code.

## Rules
1. All copy follows the brand voice guide. No exceptions.
2. Must work perfectly on mobile.
3. No unnecessary dependencies. Keep it simple.
4. Never commit API keys, tokens, or secrets. `js/config.js` contains only public Supabase keys.
5. Kilometres first, miles in brackets for all distances.
