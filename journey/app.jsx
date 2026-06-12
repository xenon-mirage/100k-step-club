// Root app — assembles HUD + Hero + Summary + Verified + Journey + Tweaks
// Tweaks expose: spectacle level, density, preview step count, layout direction.

const { useState: aUseState, useEffect: aUseEffect, useMemo: aUseMemo } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "previewSteps": 800000,
  "useRealCount": true,
  "spectacle": "max",
  "density": "smart",
  "hudPercentMode": "scientific"
}/*EDITMODE-END*/;

const TOTAL = 187_000_000_000;
const ACTUAL_CURRENT = 800_000; // Fallback if Supabase fetch hasn't resolved or fails.

// "Pace" assumption for the projection card. Tweak in tweaks panel.
// Default: ~50K verified members each logging an average of one 30K day per week.
// That gives ~78B steps/year. Adjust as the community grows.
// Conservative default for an ~800K start: 8M steps/week  -> 416M/year.
const DEFAULT_WEEKLY_STEPS = 8_000_000;

// ── Supabase data layer ─────────────────────────────────────────────────────
// Live counter from v_step_totals; recent walkers from v_recent_walkers.
// Schema: supabase/migrations/20260518000000_journey_page.sql
function mapWalker(row) {
  const tierNum = parseInt(String(row.tier || "").replace(/[^0-9]/g, ""), 10) || 10;
  const firstName = (row.holder || "").split(" ")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
  const where = row.state
    ? row.city + ", " + row.state
    : (row.city ? row.city + ", " + (row.country || "") : (row.country || "—"));
  const d = row.date ? new Date(row.date + "T00:00:00") : null;
  return {
    name: row.holder || "Walker",
    handle: "@" + (firstName || "walker"),
    tier: tierNum,
    steps: row.steps || 0,
    where: where,
    date: d ? d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "",
    first: false,   // Computed server-side later if needed
    streak: 1,      // Computed server-side later if needed
  };
}

function useLiveData() {
  const [data, setData] = aUseState({ steps: null, walkers: null });
  aUseEffect(() => {
    if (typeof window === "undefined" || !window.supabase) return;
    if (typeof SUPABASE_URL === "undefined" || typeof SUPABASE_ANON_KEY === "undefined") return;
    const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    // 60-day window (not 30): event days drift across the calendar month —
    // on June 11 a 30-day window misses May 2 and the gallery goes blank.
    // Queried client-side against claims; mirrors the v_recent_walkers view.
    const since = new Date(Date.now() - 60 * 864e5).toISOString().slice(0, 10);
    Promise.all([
      sb.from("v_step_totals").select("*").single(),
      sb.from("claims")
        .select("holder, tier, steps, date, time_seconds, cities(city, country, state)")
        .eq("verified", true)
        .gte("date", since)
        .order("date", { ascending: false })
        .limit(24),
      // Full holder history (holder + date only) so we can flag first-timers:
      // a walker is "first" if their earliest-ever verified claim falls
      // inside the 60-day window — i.e. they're new to the club this cycle.
      sb.from("claims").select("holder, date").eq("verified", true),
    ]).then(([totalsRes, walkersRes, histRes]) => {
      if (totalsRes.error) console.warn("[journey] v_step_totals:", totalsRes.error.message);
      if (walkersRes.error) console.warn("[journey] recent claims:", walkersRes.error.message);
      if (histRes.error) console.warn("[journey] claim history:", histRes.error.message);
      const steps = totalsRes.data && totalsRes.data.total_steps != null
        ? Number(totalsRes.data.total_steps)
        : null;
      const firstSeen = {};
      (histRes.data || []).forEach(r => {
        if (!firstSeen[r.holder] || r.date < firstSeen[r.holder]) firstSeen[r.holder] = r.date;
      });
      const walkers = (walkersRes.data || []).map(r => {
        const m = mapWalker(Object.assign({}, r, r.cities || {}));
        m.first = firstSeen[r.holder] ? firstSeen[r.holder] >= since : false;
        return m;
      });
      setData({ steps, walkers });
    }).catch(err => console.warn("[journey] supabase fetch error:", err));
  }, []);
  return data;
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const live = useLiveData();

  const currentSteps = t.useRealCount
    ? (live.steps !== null ? live.steps : ACTUAL_CURRENT)
    : t.previewSteps;
  const percent = (currentSteps / TOTAL) * 100;

  const { nextMilestone, lastMilestone, nextProgress } = aUseMemo(() => {
    const past = window.MILESTONES.filter(m => currentSteps >= m.steps);
    const future = window.MILESTONES.filter(m => currentSteps < m.steps);
    const last = past[past.length - 1] || null;
    const next = future[0] || window.MILESTONES[window.MILESTONES.length - 1];
    const prevFloor = last ? last.steps : 0;
    const denom = (next.steps - prevFloor) || 1;
    const np = Math.min(1, Math.max(0, (currentSteps - prevFloor) / denom));
    return { lastMilestone: last, nextMilestone: next, nextProgress: np };
  }, [currentSteps]);

  // ETA in years at current pace
  const stepsRemaining = Math.max(0, TOTAL - currentSteps);
  const yearlySteps = DEFAULT_WEEKLY_STEPS * 52;
  const etaYears = stepsRemaining / yearlySteps;

  // Apply spectacle level
  aUseEffect(() => {
    const root = document.documentElement;
    if (t.spectacle === "off") {
      root.style.setProperty("--motion", "0");
    } else {
      root.style.removeProperty("--motion");
    }
    // Toggle starfield + glow animations via class
    document.body.dataset.spectacle = t.spectacle;
  }, [t.spectacle]);

  return (
    <React.Fragment>
      <SceneBackdrop />
      <ScrollProgress />
      <Hud currentSteps={currentSteps} percent={percent} />
      <Hero
        currentSteps={currentSteps}
        percent={percent}
        nextMilestone={nextMilestone}
        nextProgress={nextProgress}
      />
      <div className="divider"></div>
      <SummaryCards
        currentSteps={currentSteps}
        percent={percent}
        nextMilestone={nextMilestone}
        lastMilestone={lastMilestone}
        nextProgress={nextProgress}
        etaYears={etaYears}
      />
      <div className="divider"></div>
      <VerifiedGallery verified={(live.walkers && live.walkers.length > 0) ? live.walkers : window.VERIFIED} />
      <div className="divider"></div>
      <Journey currentSteps={currentSteps} density={t.density} />

      <footer className="footer">
        <p className="quote">"Every step counts. Every step is counted. Walk to the sun."</p>
        <p className="small">100K Step Club · Journey to the Sun · v1.0</p>
      </footer>

      <TweaksPanel>
        <TweakSection label="Counter preview" />
        <TweakToggle label="Use live count (800K)" value={t.useRealCount}
                     onChange={v => setTweak("useRealCount", v)} />
        {!t.useRealCount && (
          <TweakSelect label="Preview at"
                       value={String(t.previewSteps)}
                       options={[
                         { value: "1000000",    label: "1M — end of Phase 1" },
                         { value: "10000000",   label: "10M — Silk Road" },
                         { value: "50000000",   label: "50M — Around the World" },
                         { value: "480000000",  label: "480M — The Moon" },
                         { value: "1740000000", label: "1.74B — Sun's diameter" },
                         { value: "48750000000",label: "48.75B — Venus" },
                         { value: "68750000000",label: "68.75B — Mars" },
                         { value: "93500000000",label: "93.5B — Halfway to the Sun" },
                         { value: "150000000000",label:"150B — entering Arrival" },
                         { value: "187000000000",label:"187B — THE SUN" },
                       ]}
                       onChange={v => setTweak("previewSteps", parseInt(v, 10))} />
        )}

        <TweakSection label="Spectacle" />
        <TweakRadio label="Effects"
                    value={t.spectacle}
                    options={["off", "med", "max"]}
                    onChange={v => setTweak("spectacle", v)} />

        <TweakSection label="Journey density" />
        <TweakRadio label="Show"
                    value={t.density}
                    options={["smart", "all", "markers"]}
                    onChange={v => setTweak("density", v)} />
      </TweaksPanel>

      <UserTweaksFab />
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
