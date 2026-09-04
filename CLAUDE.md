# 100K Step Club — Website

## What This Repo Is
The public website for 100K Step Club, deployed at [100kstepclub.com](https://100kstepclub.com).

## Context (from Sophie)
Full project brief, brand voice, tier system, and design references live in the private Sophie repository:
- Project brief: `@/Users/graemenixon/Developer/sophie/100K-Step-Club/CLAUDE.md`
- Brand voice: `@/Users/graemenixon/Developer/sophie/100K-Step-Club/brand-voice.md`
- Design system: Google Drive → Design System/100K-Design-System-v1.html

## Tech Stack
- Plain HTML / CSS / JavaScript — no frameworks, no build tools
- Supabase for database (`landingpage_signups` table with RLS)
- Supabase Edge Function `loops-signup` sends new signups to Loops for email drip
- Hosted on Vercel — auto-deploys from GitHub on push to `main`
- Mobile-first design

## Site Architecture (v3 — live since 2026-06-12)

Split architecture: **the landing page converts; depth pages serve the converted.**
One shared nav (pill links + mobile Menu) across every page. Decided 2026-06-11
(see Graude `_shared/decisions-log.md`); built in `~/Desktop/100k-step-club-v3/`
(now merged here — that folder is retired, THIS repo is canon).

| Page | Job | Live data (anon key, client-side) |
|------|-----|-----------------------------------|
| `index.html` | Convert: what is this → tiers → proof → September 28 signup | Proof stats ← `v_step_totals` + `v_city_claims_all`; form → Turnstile-verified `website-signup` Edge endpoint; dropdowns ← `cities` |
| `tiers.html` | Tier deep-dive + The Wall (verified names per tier) | Wall ← `v_city_claims_all` |
| `journey/` | Walk-to-the-Sun live tracker (React via Babel) | Counter ← `v_step_totals`; gallery ← `claims` direct, 60-day window, first-timer flags from full holder history |
| `leaderboard.html` | Claim Board: globe + list + embedded flat world map | `v_city_claims_all` + `get_leaderboard_signup_only` RPC |
| `world-map.html` | Flat 2D map (D3, Miller/Equal/Mercator) — standalone + iframed into the Claim Board (`?embed=1`, postMessage settings bridge) | Same views as the Claim Board |
| `sun.html` | 700vh Three.js space-journey visualization (the old landing-page showpiece) | None (scroll-narrative counter) |

Every people-displaying surface has a **real-data fallback** baked in (snapshot
2026-06-11) — live fetch always wins; the fallback only shows on network failure.
Never put fictional names in a fallback.

## File Structure
```
index.html             ← Conversion landing page
tiers.html             ← Tier guide + The Wall
sun.html               ← Walk-to-the-sun visualization (Three.js)
world-map.html         ← Flat world map (standalone + iframe embed)
leaderboard.html       ← Claim Board (globe + list + world-map embed + merged settings)
leaderboard-app.js     ← Claim Board logic
journey/               ← Journey to the Sun (React via Babel CDN)
css/style.css          ← Shared styles (token-driven custom properties)
css/sun.css            ← sun.html visualizer styles
map/                   ← World map engine (data.js, world-map.js, world-map.css)
js/main.js             ← Stars, reveals, countdown, sticky CTA, nav menu, signup form, live stats, tier walls
js/space-journey.js    ← Three.js space journey (used by sun.html)
js/three.min.js        ← Three.js library (r152)
js/config.js           ← Supabase public keys (safe for frontend, RLS protects data)
js/sky.js, js/sky-elements.js, js/lava.js  ← ORPHANED (v2 landing effects, kept for history)
textures/              ← Earth/cloud/moon textures (1k mobile, 2k desktop)
img/                   ← Badges (360px web), founder-poster.jpg, friends-1..4.jpg
assets/                ← Favicons: self-adapting favicon.svg (light/dark), PNG ladder, .ico, site.webmanifest
serve.py               ← Local no-cache dev server (python3 serve.py [port], default 8080)
supabase/
  functions/
    loops-signup/
      index.ts         ← Edge Function: sends new signups to Loops API
```

## Deploy Process
1. Push to `main` on GitHub
2. Vercel auto-builds and deploys
3. No build step — Vercel serves static files directly
4. Domain: 100kstepclub.com (DNS A → 76.76.21.21, CNAME www → cname.vercel-dns.com)

## Dev Server & Preview

The website repo lives at `~/Desktop/100k-step-club/`, while the planning context lives at `/Users/graemenixon/Developer/sophie/100K-Step-Club/`. A session may start from that context folder rather than the website repo — this used to break python's `http.server` because it calls `os.getcwd()` before parsing the `-d` flag.

**Preferred — use `preview_start`.** The repo has `.claude/launch.json` configured to wrap the server in `bash -c "cd /Users/graemenixon/Desktop/100k-step-club && exec python3 serve.py 8080"`. `serve.py` sends `Cache-Control: no-store` on every response, which kills the stale-CSS/JS problem below at the root. `preview_start` also surfaces the page in the IDE's preview panel and unlocks the `mcp__Claude_Preview__*` tools (screenshot, click, snapshot, console logs, eval) for verification.

**Fallback — direct Bash.** If `preview_start` ever fails or the launch.json gets removed, run:
```bash
cd /Users/graemenixon/Desktop/100k-step-club && python3 serve.py 8080
```
via Bash with `run_in_background: true`. The `cd` is mandatory.

**Port conflicts:** If port 8080 is already held by a non-preview server, `preview_start` will refuse to start. Free the port first:
```bash
lsof -ti:8080 | xargs kill -9 2>/dev/null
```

**Access:** `http://localhost:8080` in the browser, or via `mcp__Claude_Preview__preview_screenshot` in the session.

**Verifying changes:** `serve.py` sends no-store headers, so stale-cache debugging
is largely a solved problem. If the browser somehow still shows old code (e.g. a
tab that predates the server restart), one hard refresh (`Cmd+Shift+R`) clears it.
Confirm the new CSS/JS is loaded before debugging visual issues.

## Sharing SQL migrations and ad-hoc SQL

> **⚠️ Schema now lives in the dedicated backend repo (as of 2026-05-31).** The shared Supabase DB's migrations + Edge Functions are managed from **`~/Desktop/100k-step-club-backend/`** — the single source of truth, shared by this website and the new mobile app. **Ship schema changes with `supabase db push` from that repo; do NOT paste schema-changing SQL into the Supabase dashboard** (it desyncs the CLI migration ledger — that already bit us once). This repo's `supabase/migrations/` is now **historical** — don't add new migrations here. (The mobile-app plan + the backend-repo setup runbook live in the private hub at `/Users/graemenixon/Developer/sophie/100K-Step-Club/app/`.) Inline-pasting is still fine for **ad-hoc read / sanity-check queries** (below) — just not schema changes.

When creating any `.sql` file Graeme will run manually in the Supabase SQL editor (migrations, one-off seeds, sanity-check queries), do BOTH:

1. **Write the canonical file** to `supabase/migrations/<timestamp>_<slug>.sql` in this repo so it's version-controlled with the code that depends on it.
2. **Paste the SQL inline in chat** so Graeme can copy it straight into Supabase without leaving his current workspace.

Why: Graeme typically has the Graude folder (`~/Desktop/Graude/`) open as his VSCode workspace, not this repo. Files written only to `~/Desktop/100k-step-club/supabase/migrations/` are effectively invisible to him in the editor. Inline-paste removes the file-hunting step. The canonical file still gets created so the migration ships with the code on `git push`.

Same pattern applies to throwaway test inserts, schema-check queries, and cleanup statements — paste them inline rather than burying them in a file.

## Rules
1. All copy follows the brand voice guide. No exceptions.
2. Must work perfectly on mobile.
3. No unnecessary dependencies. Keep it simple.
4. Never commit API keys, tokens, or secrets. `js/config.js` contains only public Supabase keys.
5. Kilometres first, miles in brackets for all distances.
