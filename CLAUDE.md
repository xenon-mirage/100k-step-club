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
- Supabase Edge Function `loops-signup` sends new signups to Loops for email drip
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

The website repo lives at `~/Desktop/100k-step-club/` but Claude sessions typically start from `~/Desktop/Graude/100K-Step-Club/` for context stacking. The session's working directory is the Graude folder, not the website repo — this used to break python's `http.server` because it calls `os.getcwd()` before parsing the `-d` flag.

**Preferred — use `preview_start`.** The repo has `.claude/launch.json` configured to wrap the server in `bash -c "cd /Users/graemenixon/Desktop/100k-step-club && exec python3 -m http.server 8080"`. The shell `cd` runs before python, so `getcwd` returns the right path and the server serves the right files. `preview_start` also surfaces the page in the IDE's preview panel and unlocks the `mcp__Claude_Preview__*` tools (screenshot, click, snapshot, console logs, eval) for verification.

**Fallback — direct Bash.** If `preview_start` ever fails or the launch.json gets removed, run:
```bash
cd /Users/graemenixon/Desktop/100k-step-club && python3 -m http.server 8080
```
via Bash with `run_in_background: true`. The `cd` is mandatory.

**Port conflicts:** If port 8080 is already held by a non-preview server, `preview_start` will refuse to start. Free the port first:
```bash
lsof -ti:8080 | xargs kill -9 2>/dev/null
```

**Access:** `http://localhost:8080` in the browser, or via `mcp__Claude_Preview__preview_screenshot` in the session.

**Verifying changes — IMPORTANT:**
Python's `http.server` aggressively caches CSS and JS files. After editing CSS/JS, always:
1. Kill and restart the server: `lsof -ti:8080 | xargs kill -9 2>/dev/null; cd /Users/graemenixon/Desktop/100k-step-club && python3 -m http.server 8080`
2. Hard-refresh the browser (`Cmd+Shift+R`) — a normal reload will serve stale files.
3. Confirm the new CSS/JS is loaded before debugging (check via DevTools or `document.styleSheets` inspection).

Do this **before** scrolling through to verify visual changes. Don't waste cycles debugging when the browser is running old code.

## Sharing SQL migrations and ad-hoc SQL

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
