// Hero + Top HUD + Summary cards + Verified gallery
// Loaded as Babel; exports to window for app.jsx.

const { useState, useEffect, useMemo, useRef } = React;

// ─────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────

function formatSteps(n) {
  if (n >= 1e9) {
    const v = n / 1e9;
    return v >= 100 ? v.toFixed(0) : v.toFixed(2).replace(/\.?0+$/, "");
  }
  if (n >= 1e6) {
    const v = n / 1e6;
    return v >= 100 ? v.toFixed(0) : v.toFixed(1).replace(/\.0$/, "");
  }
  if (n >= 1e3) return (n / 1e3).toFixed(0);
  return String(n);
}
function formatStepsUnit(n) {
  if (n >= 1e9) return "B";
  if (n >= 1e6) return "M";
  if (n >= 1e3) return "K";
  return "";
}
function commaNumber(n) { return n.toLocaleString("en-US"); }

// Animated count-up using requestAnimationFrame, mobile-cheap.
function useCountUp(target, duration = 2000, deps = []) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let raf;
    const start = performance.now();
    const from = 0;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      // ease-out
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(Math.floor(from + (target - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return val;
}

// ─────────────────────────────────────────────────────────────────────────
// Top HUD
// ─────────────────────────────────────────────────────────────────────────

function fmtSmartPct(p) {
  if (p >= 1)     return p.toFixed(2) + "%";
  if (p >= 0.01)  return p.toFixed(3) + "%";
  if (p >= 0.0001) return p.toFixed(4) + "%";
  return p.toExponential(1).replace("e", "e") + "%";
}

function ScrollProgress() {
  const ref = useRef(null);
  useEffect(() => {
    let raf = 0;
    let dirty = false;
    const update = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      if (ref.current) ref.current.style.width = (p * 100).toFixed(2) + "%";
      dirty = false;
    };
    const onScroll = () => {
      if (dirty) return;
      dirty = true;
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);
  return (
    <div className="scroll-progress" aria-hidden="true">
      <div className="bar" ref={ref}></div>
    </div>
  );
}

function Hud({ currentSteps, percent }) {
  return (
    <div className="hud">
      <div className="hud-inner">
        <a href="/" className="brand"
           style={{ textDecoration: "none", color: "inherit" }}
           aria-label="100K Step Club — home">
          <div className="brand-mark">100K</div>
          <div className="brand-text">
            Step Club <span className="sep">/</span>
            <span className="tab">Journey to the Sun</span>
          </div>
        </a>
        <div className="hud-stats">
          <div className="hud-stat">
            <div className="num">{commaNumber(currentSteps)}</div>
            <div className="lab">Verified steps</div>
          </div>
          <div className="hud-stat">
            <div className="num">{fmtSmartPct(percent)}</div>
            <div className="lab">To the Sun</div>
          </div>
          <div className="hud-stat">
            <div className="num">187B</div>
            <div className="lab">Target</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Hero
// ─────────────────────────────────────────────────────────────────────────

function Hero({ currentSteps, percent, nextMilestone, nextProgress }) {
  const animated = useCountUp(currentSteps, 2400, [currentSteps]);
  const fmtPct = fmtSmartPct;

  return (
    <section className="hero">
      <div className="eyebrow">The Journey to the Sun · Live tracker</div>
      <h1>Walking to&nbsp;the&nbsp;Sun.</h1>
      <p className="hero-sub">
        Every verified step, from every member, climbs the same counter. The destination
        is 187 billion steps away. Together, we have already taken —
      </p>

      <div className="counter-wrap">
        <div className="counter mono">{commaNumber(animated)}</div>
        <div className="counter-cap">
          <span>steps logged</span><span>·</span><b>{fmtPct(percent)}</b><span>of the way</span>
        </div>
      </div>

      <div className="hero-meter">
        <div className="hero-meter-row">
          <span>Next milestone</span>
          <b>{nextMilestone.name} · {commaNumber(nextMilestone.steps)} steps</b>
        </div>
        <div className="hero-meter-track">
          <div className="hero-meter-fill"
               style={{ width: Math.max(2, nextProgress * 100) + "%" }} />
        </div>
        <div className="hero-meter-row">
          <span>{(nextProgress * 100).toFixed(1)}% to next</span>
          <b>{commaNumber(Math.max(0, nextMilestone.steps - currentSteps))} steps to go</b>
        </div>
      </div>

      <div className="cta-row">
        <button className="btn btn-primary">Log your steps</button>
        <button className="btn btn-secondary"
                onClick={() => {
                  const el = document.getElementById("journey");
                  if (el) window.scrollTo({ top: el.offsetTop - 60, behavior: "smooth" });
                }}>
          Walk the journey ↓
        </button>
      </div>

      <div className="hero-arrow">Scroll to travel</div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Summary cards
// ─────────────────────────────────────────────────────────────────────────

function MilestoneCounterRibbon({ currentSteps, nextMilestone }) {
  const total = window.MILESTONES.length;
  const completed = useMemo(
    () => window.MILESTONES.filter(m => currentSteps >= m.steps).length,
    [currentSteps]
  );
  const pct = (completed / total) * 100;
  const remaining = total - completed;

  return (
    <div className="mc-ribbon" role="group" aria-label="Milestones completed">
      <div className="mc-left">
        <div className="eyebrow">
          <span className="dot"></span> Milestones reached
        </div>
        <div className="mc-count mono">
          <span className="done">{completed}</span>
          <span className="sep">/</span>
          <span className="total">{total}</span>
        </div>
        <div className="mc-sub">
          <b>{remaining}</b> ahead on the path to the&nbsp;Sun
        </div>
      </div>
      <div className="mc-right">
        <div className="mc-bar" aria-hidden="true">
          <span style={{ width: Math.max(1.5, pct) + "%" }}></span>
        </div>
        <div className="mc-ticks">
          <span><b>{pct < 1 ? pct.toFixed(2) : pct.toFixed(1)}%</b> of milestones unlocked</span>
          <span>{completed} → {total}</span>
        </div>
        {nextMilestone && (
          <div className="mc-next">
            Up next: <b>{nextMilestone.name}</b> · {commaNumber(nextMilestone.steps)} steps
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCards({ currentSteps, percent, nextMilestone, lastMilestone, nextProgress, etaYears }) {
  return (
    <section className="section">
      <div className="section-head">
        <div className="eyebrow">At a glance</div>
        <h2>Where the&nbsp;community is right&nbsp;now</h2>
        <p>A snapshot of the collective walk to the Sun. Updates after every verified event day.</p>
      </div>

      <MilestoneCounterRibbon currentSteps={currentSteps} nextMilestone={nextMilestone} />

      <div className="summary">
        <div className="sumcard">
          <div className="eyebrow" style={{ color: "var(--warm)" }}>
            <span className="dot"></span> Collective
          </div>
          <h3>Verified steps</h3>
          <div className="big mono">{commaNumber(currentSteps)}</div>
          <p>{percent < 1
            ? `${percent.toFixed(4)}% of the way to the Sun`
            : `${percent.toFixed(2)}% of the way to the Sun`}</p>
        </div>

        <div className="sumcard">
          <div className="eyebrow" style={{ color: "var(--fire-mid)" }}>
            <span className="dot"></span> Up next
          </div>
          <h3>{nextMilestone.name}</h3>
          <div className="big mono">{formatSteps(nextMilestone.steps)}{formatStepsUnit(nextMilestone.steps)}</div>
          <div className="meter">
            <span style={{ width: Math.max(2, nextProgress * 100) + "%" }}></span>
          </div>
          <p>{commaNumber(Math.max(0, nextMilestone.steps - currentSteps))} steps to go</p>
        </div>

        <div className="sumcard">
          <div className="eyebrow" style={{ color: "var(--tier-25)" }}>
            <span className="dot"></span> Just crossed
          </div>
          <h3>{lastMilestone ? lastMilestone.name : "—"}</h3>
          <div className="big mono">
            {lastMilestone ? `${formatSteps(lastMilestone.steps)}${formatStepsUnit(lastMilestone.steps)}` : "0"}
          </div>
          <p>{lastMilestone ? lastMilestone.eq : "The journey is just starting."}</p>
        </div>

        <div className="sumcard">
          <div className="eyebrow" style={{ color: "var(--tier-75)" }}>
            <span className="dot"></span> Projection
          </div>
          <h3>At today's pace</h3>
          <div className="big mono">
            {etaYears > 999 ? "999+" : etaYears.toFixed(0)} <span style={{ fontSize: ".55em", color: "var(--fg-mid)", WebkitTextFillColor: "var(--fg-mid)" }}>yrs</span>
          </div>
          <p>Until the community reaches the Sun. Every new walker pulls it closer.</p>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Verified walks gallery
// ─────────────────────────────────────────────────────────────────────────

function VerifiedGallery({ verified }) {
  const [filter, setFilter] = useState("all");
  const list = useMemo(() => {
    if (filter === "all") return verified;
    if (filter === "100") return verified.filter(v => v.tier === 100);
    if (filter === "first") return verified.filter(v => v.first);
    return verified;
  }, [filter, verified]);

  return (
    <section className="section">
      <div className="section-head" style={{ width: "100%" }}>
        <div className="eyebrow">Recently verified</div>
        <h2>This week, these&nbsp;walkers fed the&nbsp;counter</h2>
        <p>
          Every verified day, every tier. You can be on this wall — log your next event with
          Strava, Garmin, or Apple Health.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
          {[
            { id: "all", lab: "All recent" },
            { id: "100", lab: "Beat Midnight (100K)" },
            { id: "first", lab: "First-timers" },
          ].map(b => (
            <button key={b.id}
              onClick={() => setFilter(b.id)}
              className={"chip" + (filter === b.id ? " active" : "")}
              style={{
                appearance: "none", border: "1px solid rgba(255,255,255,.08)",
                background: filter === b.id ? "rgba(255,107,0,.14)" : "rgba(255,255,255,.03)",
                color: filter === b.id ? "var(--fire-mid)" : "var(--fg-mid)",
                padding: "8px 14px", borderRadius: 100,
                font: "600 12px 'DM Sans'", letterSpacing: ".04em", cursor: "pointer",
                transition: "all .25s var(--ease)",
              }}>
              {b.lab}
            </button>
          ))}
        </div>
      </div>

      <div className="verified">
        {list.map((v, i) => <VerifiedCard key={v.handle + i} v={v} />)}
      </div>

      <div className="verified-foot">
        Want your walk on here? <a href="#log">Submit a verified day →</a>
      </div>
    </section>
  );
}

function VerifiedCard({ v }) {
  const tier = window.TIER_INFO[v.tier];
  const initials = v.name.split(" ").map(s => s[0]).join("").slice(0, 2);
  return (
    <div className={"vcard tier-" + v.tier}>
      <div className="avatar" style={{ color: tier.color, background: tier.bg }}>
        {initials}
      </div>
      <div className="vmeta">
        <div className="name-row">
          <span className="name">{v.name}</span>
          <span className="tier-pill"
                style={{ color: tier.color, background: tier.bg,
                         boxShadow: tier.ring ? `inset 0 0 0 1px ${tier.ring}` : "none" }}>
            {v.tier}K
          </span>
        </div>
        <div className="sub">
          <span>{v.handle}</span><span className="dot"></span>
          <span>{v.where}</span><span className="dot"></span>
          <span>{v.date}</span>
        </div>
        <div className="bot-row">
          <span className="steps">{commaNumber(v.steps)} steps</span>
          {v.first && <span className="flag">★ First!</span>}
          {!v.first && v.streak >= 3 && <span className="flag streak">{v.streak}× streak</span>}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Scene Backdrop — atmospheric layers crossfade by current phase
// ─────────────────────────────────────────────────────────────────────────

function SceneBackdrop() {
  const [activePhase, setActivePhase] = useState(0);

  useEffect(() => {
    let io;
    const phaseTopMap = new Map();
    let raf = 0;

    const recompute = () => {
      // Find the phase whose top is nearest the viewport's vertical centre.
      const targetY = window.scrollY + window.innerHeight * 0.45;
      const phases = document.querySelectorAll(".phase[data-phase]");
      if (!phases.length) return;
      let best = 0;
      let bestDist = Infinity;
      phases.forEach(p => {
        const r = p.getBoundingClientRect();
        const top = r.top + window.scrollY;
        const bottom = top + r.height;
        // distance: 0 if inside, otherwise gap to nearest edge
        const inside = targetY >= top && targetY <= bottom;
        const dist = inside ? 0 : Math.min(Math.abs(targetY - top), Math.abs(targetY - bottom));
        if (dist < bestDist) {
          bestDist = dist;
          best = parseInt(p.dataset.phase, 10);
        }
      });
      setActivePhase(best);
    };

    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        recompute();
      });
    };

    // Defer a tick so journey.jsx's .phase elements are mounted.
    const t = setTimeout(() => {
      recompute();
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll);
    }, 60);

    return () => {
      clearTimeout(t);
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (io) io.disconnect();
    };
  }, []);

  return (
    <div className="scene-backdrop" aria-hidden="true">
      {[1,2,3,4,5,6,7,8,9,10].map(p => (
        <div key={p}
             className={"scene-layer" + (p === activePhase ? " active" : "")}
             data-phase={p}></div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// User-facing Tweaks FAB — opens the TweaksPanel without host edit-mode.
// Watches the DOM to know when the panel is open (so the button can hide).
// ─────────────────────────────────────────────────────────────────────────

function UserTweaksFab() {
  const [panelOpen, setPanelOpen] = useState(false);

  useEffect(() => {
    const check = () => {
      setPanelOpen(!!document.querySelector(".twk-panel"));
    };
    check();
    const mo = new MutationObserver(check);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, []);

  const open = () => {
    // Same-window postMessage triggers the TweaksPanel's host-protocol listener.
    window.postMessage({ type: "__activate_edit_mode" }, "*");
  };

  if (panelOpen) return null;
  return (
    <button className="user-fab" type="button" onClick={open}
            aria-label="Open tweaks" title="Adjust the dashboard">
      <span className="gear" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none"
             stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
        </svg>
      </span>
      <span className="lab">Tweaks</span>
    </button>
  );
}

// Export
Object.assign(window, { Hud, Hero, SummaryCards, MilestoneCounterRibbon,
  VerifiedGallery, ScrollProgress, SceneBackdrop, UserTweaksFab,
  formatSteps, formatStepsUnit, commaNumber, useCountUp, fmtSmartPct });
