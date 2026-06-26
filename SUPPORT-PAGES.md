# Support Pages — build log

Privacy, Terms, and the email-confirmation landing page. Built to look native to the live
site (same shell, nav, tokens, footer). **Committed locally only — never pushed. Graeme reviews + ships.**

Source drafts (read-only, app repo): `~/Developer/100k-step-club-app/docs/privacy-policy.md`,
`~/Developer/100k-step-club-app/docs/terms-of-service.md`. Legal text is kept faithful to the drafts.

---

## Status — ✅ built + verified (uncommitted → ready for Graeme's review)

| Page | File | Route (prod) | State |
|------|------|--------------|-------|
| Privacy Policy | `privacy.html` | `/privacy` | ✅ built + screenshot-verified |
| Terms of Service | `terms.html` | `/terms` | ✅ built + screenshot-verified |
| Email confirmation | `confirm.html` | `/auth/confirm` | ✅ built — both states (confirmed / expired) verified |
| Prose styles | `css/legal.css` | — | ✅ |
| Clean-URL routing | `vercel.json` | — | ✅ |
| Footer legal links | `index.html`, `tiers.html`, + 3 new pages | — | ✅ (`.f-legal` style added to shared `css/style.css`) |

**Verification (local, `serve.py` on :8080):** all pages return HTTP 200, HTML tag-balance is
clean on every page, `legal.css` loads, the flag chips render in brand amber, the confirm page's
hash logic resolves correctly to the **confirmed** state (on `access_token` / `type` / `code`) and
the **expired** state (on `error`, surfacing Supabase's decoded `error_description`). Screenshots
taken at desktop + mobile (375). No console errors.

---

## ⚑ FLAGS — Graeme's calls before publish (do NOT ship with these unfilled)

These are the `[bracketed]` blanks from the drafts. On the pages they render as **amber dashed
chips** so they're impossible to miss in review. I did not invent legal or contact details.

1. **Effective date** (privacy + terms) — set to the publish date. Currently a flag chip.
2. **Minimum age / children's age** (privacy "Children" + terms §2) — draft offers `13 / 16 / 18`.
   Pick one and keep it **consistent across both pages**. 13 is the common App Store floor for a
   general-audience app, but this is a legal call — your decision.
3. **Data-processing region** (privacy "International note") — the Supabase project region. Not in
   any file I can read, so flagged. Fill with the actual region (Supabase dashboard → Project Settings).
4. **Legal entity** (privacy "Who we are") — draft had `[legal entity, if any]`. Conservatively
   **omitted** (no entity assumed); reads "100K Step Club, Toronto, Canada." Add an entity name if one exists.
5. **"Return to the app" deep link** (confirm.html) — copy is a plain line + a safe link back to
   `100kstepclub.com`. If the app has a URL scheme (e.g. `stepclub://`), wire it to an "Open the app"
   button. I didn't invent a scheme.

---

## Routing — how the clean URLs work

The site has no `vercel.json` today; pages are flat `*.html` files linked with the `.html` extension
(e.g. `/tiers.html`). The goal wants clean paths (`/privacy`, `/terms`, `/auth/confirm`). `/auth/confirm`
can't be served from a flat file without routing config, so I added a **minimal, additive** `vercel.json`:

```json
{ "rewrites": [
  { "source": "/privacy", "destination": "/privacy.html" },
  { "source": "/terms",   "destination": "/terms.html" },
  { "source": "/auth/confirm", "destination": "/confirm.html" }
] }
```

- **Additive only.** Vercel checks the filesystem *before* rewrites, so every existing route
  (`/`, `/tiers.html`, `/journey/`, `/leaderboard.html`, …) is completely unaffected.
- All three new pages use **absolute asset paths** (`/css/…`, `/js/…`, `/assets/…`) so they render
  correctly even under the nested `/auth/confirm` path.
- **Supabase Site-URL config** that points the email flow at `/auth/confirm` is Graeme's dashboard
  step — this repo just builds the destination.

### Local testing note
`serve.py` is plain `http.server` — it does **not** apply `vercel.json` rewrites. Locally the pages
are reached at `/privacy.html`, `/terms.html`, `/confirm.html`. The clean URLs (`/privacy` etc.) are a
**production (Vercel) behaviour** and will work once deployed.

---

## Authored prose (mine, not from the drafts)

Legal text is faithful to the drafts. The few lines I wrote myself, in brand voice, none of which
change any legal substance:

- **Page headers** — eyebrows ("Privacy Policy" / "Terms of Service"), the H1s ("Your data,
  plainly." / "The deal."), and the effective-date meta lines.
- **Terms lead paragraph** — *"Short version: walk honestly, know that big days are hard on your
  body, and be decent to the other people in here. The full version is below."* The privacy draft
  ships with its own plain-language lead; I added a matching one to terms so the two pages feel like
  a set. Plain framing, not a legal statement — delete it if you'd rather terms open cold.
- **Terms §6 voice** — the draft slipped into first person ("We're building this in the open").
  The rest of both documents speak as the operator "we", so I kept "we" for consistency (the public
  brand's first-person-singular rule is for marketing copy, not a ToS).
- **confirm.html copy** — all of it (both states + the return-to-app lines).

## Done — ready for review
- [x] privacy.html + css/legal.css + shared `.f-legal` style → verified → commit
- [x] terms.html → verified → commit
- [x] confirm.html (confirmed + expired states) + vercel.json → verified → commit
- [x] footer legal links on index.html + tiers.html → verified → commit
- [ ] **Graeme:** clear the 5 flags above, set the Supabase Site-URL → `/auth/confirm`, then push to ship.
