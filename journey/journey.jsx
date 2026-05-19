// The cosmic ribbon — long-scroll journey through all 148 milestones.
// Each phase = a section. Milestones alternate left/right on desktop.
// Tap any milestone to expand a detail panel inline.

const { useState: jUseState, useEffect: jUseEffect, useMemo: jUseMemo, useRef: jUseRef } = React;

function PhaseAtmosphere({ phase, isCurrent }) {
  // Subtle wash specific to each phase
  return (
    <div className="phase-atmo" aria-hidden="true"
         style={{
           top: "10%",
           height: "60%",
           background:
             `radial-gradient(closest-side at 50% 30%, ${phase.subtle}, transparent 70%)`,
         }} />
  );
}

function MilestoneRow({ m, phase, isYou, isPast, isExpanded, onToggle, side }) {
  const cls = [
    "milestone",
    side === "left" ? "left" : "right",
    isYou ? "you" : isPast ? "past" : "future",
    m.marker ? "marker" : "",
    m.planet ? "with-planet planet-" + m.planet : "",
  ].filter(Boolean).join(" ");

  return (
    <React.Fragment>
      <div className={cls}
           onClick={() => onToggle(m.id)}
           role="button"
           aria-expanded={isExpanded}
           tabIndex={0}
           onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(m.id); } }}>

        {/* Planet artwork beside major planetary milestones */}
        {m.planet && m.planet !== "sun" && (
          <div className={"planet-art " + m.planet}
               style={{
                 [side === "left" ? "left" : "right"]: "calc(50% + 60px)",
                 top: "50%", transform: "translateY(-50%)"
               }}
               aria-hidden="true" />
        )}

        {side === "left" ? (
          <React.Fragment>
            <div className="card-col">
              <MilestoneCard m={m} />
            </div>
            <div className="node-col">
              <div className="node"></div>
              {isYou && <YouLabel />}
            </div>
            <div className="other-col"></div>
          </React.Fragment>
        ) : (
          <React.Fragment>
            <div className="other-col"></div>
            <div className="node-col">
              <div className="node"></div>
              {isYou && <YouLabel />}
            </div>
            <div className="card-col">
              <MilestoneCard m={m} />
            </div>
          </React.Fragment>
        )}
      </div>

      {isExpanded && <MilestoneDetail m={m} phase={phase} />}
    </React.Fragment>
  );
}

function YouLabel() {
  return (
    <div style={{
      position: "absolute",
      top: "calc(50% + 22px)",
      left: "50%",
      transform: "translateX(-50%)",
      whiteSpace: "nowrap",
      font: "700 10px 'DM Sans'",
      letterSpacing: ".18em",
      textTransform: "uppercase",
      color: "var(--warm)",
      textShadow: "0 0 12px rgba(255,107,0,.6)",
      pointerEvents: "none",
    }}>
      ★ You are here
    </div>
  );
}

function MilestoneCard({ m }) {
  return (
    <div className="mcard">
      <div className="name">{m.name}</div>
      <div className="meta">
        <b>{commaNumber(m.steps)}</b>
        <span>·</span>
        <span>{m.eq}</span>
      </div>
    </div>
  );
}

function MilestoneDetail({ m, phase }) {
  const pctOfSun = (m.steps / 187_000_000_000) * 100;
  return (
    <div className="detail">
      <div className="meta">{phase.tag} · {phase.name}</div>
      <div className="name">{m.name}</div>
      <p className="blurb">{m.blurb}</p>
      <div className="stats">
        <div className="stat">
          <div className="lab">Cumulative steps</div>
          <div className="val">{commaNumber(m.steps)}</div>
        </div>
        <div className="stat">
          <div className="lab">Equivalent distance</div>
          <div className="val">{m.eq}</div>
        </div>
        <div className="stat">
          <div className="lab">Of the way to the Sun</div>
          <div className="val">
            {pctOfSun < 0.001 ? pctOfSun.toExponential(2) + "%" :
             pctOfSun < 1     ? pctOfSun.toFixed(4) + "%" :
                                pctOfSun.toFixed(2) + "%"}
          </div>
        </div>
      </div>
      {m.duo && (
        <span className="duo-tag">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="8" cy="12" r="4" /><circle cx="16" cy="12" r="4" />
          </svg>
          Duo with {m.duo}
        </span>
      )}
      {m.pct && (
        <span className="duo-tag" style={{
          background: "rgba(255,107,0,.12)", borderColor: "rgba(255,107,0,.25)", color: "var(--fire-mid)"
        }}>{m.pct}% checkpoint</span>
      )}
    </div>
  );
}

// Phase block rendering all its milestones
function PhaseBlock({ phase, milestones, currentSteps, expanded, onToggle, density, youPlacement }) {
  // Decide which milestones to show based on density
  const ms = jUseMemo(() => {
    if (density === "all") return milestones;
    if (density === "markers") return milestones.filter(m => m.marker);
    // "smart": show all in current/adjacent phase, only markers + duos elsewhere
    if (density === "smart") {
      const currentPhase = window.PHASES.findIndex(p => currentSteps < p.max) + 1;
      if (Math.abs(phase.id - (currentPhase || 1)) <= 1) return milestones;
      return milestones.filter(m => m.marker);
    }
    return milestones;
  }, [density, milestones, currentSteps, phase.id]);

  // Phase color variables
  const cssVars = {
    "--phase-color": phase.color,
    "--phase-glow": phase.subtle.replace(",.10", ",.5").replace(",.12", ",.55").replace(",.14", ",.6").replace(",.16", ",.5"),
  };

  // Find adjacent phase colors for ribbon gradient
  const prevPhase = window.PHASES[phase.id - 2];
  const nextPhase = window.PHASES[phase.id];
  if (prevPhase) cssVars["--phase-color-prev"] = prevPhase.color + "40";
  if (nextPhase) cssVars["--phase-color-next"] = nextPhase.color + "40";

  return (
    <div className="phase" style={cssVars} data-phase={phase.id}>
      <PhaseAtmosphere phase={phase} />

      <div className="phase-header"
           style={{ "--phase-color": phase.color, "--phase-glow": phase.subtle.replace(",.10", ",.6") }}>
        <div className="glyph">{phase.glyph}</div>
        <div className="meta">
          <div className="tag">{phase.tag} · {phase.range}</div>
          <div className="name">{phase.name}</div>
        </div>
        <div className="range">
          {formatSteps(phase.min)}{formatStepsUnit(phase.min)} → {formatSteps(phase.max)}{formatStepsUnit(phase.max)}
        </div>
        <div className="vibe">"{phase.vibe}"</div>
      </div>

      <div className="ribbon">
        <div className="ribbon-spine" aria-hidden="true"></div>
        <div className="ribbon-glow" aria-hidden="true"></div>
        {ms.map((m, idx) => {
          const isPast = currentSteps >= m.steps;
          const isYou = youPlacement && youPlacement.beforeId === m.id;
          // Alternate sides; markers always centered text on left
          const side = idx % 2 === 0 ? "left" : "right";
          return (
            <React.Fragment key={m.id}>
              {isYou && <YouMarker />}
              <MilestoneRow
                m={m} phase={phase}
                isYou={false}
                isPast={isPast}
                isExpanded={expanded === m.id}
                onToggle={onToggle}
                side={side} />
            </React.Fragment>
          );
        })}
        {/* if you are AT the end of this phase */}
        {youPlacement && youPlacement.afterPhase === phase.id && <YouMarker />}
      </div>
    </div>
  );
}

function YouMarker() {
  return (
    <div className="milestone you" aria-hidden="true">
      <div className="card-col" style={{ textAlign: "right" }}>
        <div className="mcard">
          <div className="name">You are here</div>
          <div className="meta" style={{ justifyContent: "flex-end" }}>
            <b>{commaNumber(window.__currentSteps || 0)}</b>
            <span>steps logged so far</span>
          </div>
        </div>
      </div>
      <div className="node-col">
        <div className="node"></div>
      </div>
      <div className="other-col"></div>
    </div>
  );
}

// Top-level Journey component
function Journey({ currentSteps, density }) {
  const [expanded, setExpanded] = jUseState(null);
  const onToggle = (id) => setExpanded(prev => prev === id ? null : id);

  // expose currentSteps for the YouMarker (cheap)
  window.__currentSteps = currentSteps;

  // Find where "you" sit — the milestone just AHEAD of currentSteps
  const youBeforeId = jUseMemo(() => {
    for (const m of window.MILESTONES) {
      if (m.steps > currentSteps) return m.id;
    }
    return null;
  }, [currentSteps]);

  return (
    <div className="journey" id="journey">
      <div className="starfield" aria-hidden="true">
        <div className="layer l1"></div>
        <div className="layer l2"></div>
        <div className="layer l3"></div>
        <div className="shooting">
          <span></span><span></span><span></span>
        </div>
      </div>

      <div className="section-head" style={{
        maxWidth: 1080, margin: "0 auto", padding: "60px var(--pad) 0",
      }}>
        <div className="eyebrow">The Journey</div>
        <h2>187 billion steps. <span style={{ color: "var(--fg-mid)", fontWeight: 800 }}>148 milestones.</span></h2>
        <p>Scroll down to travel from your first parkrun all the way to the surface of the Sun.
           Every node is a moment we'll celebrate. Tap any milestone for the full story.</p>
      </div>

      {window.PHASES.map((phase) => {
        const milestones = window.MILESTONES.filter(m => m.phase === phase.id);
        const youPlacement = milestones.some(m => m.id === youBeforeId)
          ? { beforeId: youBeforeId }
          : null;

        return (
          <PhaseBlock
            key={phase.id}
            phase={phase}
            milestones={milestones}
            currentSteps={currentSteps}
            expanded={expanded}
            onToggle={onToggle}
            density={density}
            youPlacement={youPlacement}
          />
        );
      })}

      {/* Sun arrival flourish */}
      <div className="arrival-finale">
        <div className="planet-art sun" style={{
          position: "relative", margin: "0 auto 32px",
        }}></div>
        <div className="eyebrow" style={{ color: "var(--warm)" }}>The destination</div>
        <h2>We walk to the Sun. <br/>Together.</h2>
        <p>93 million miles. Every step verified. Every step earned. <br/>
          The day this counter reads 187,000,000,000 will be one of the most extraordinary
          collective achievements in the history of endurance.</p>
        <div className="cta-row" style={{ margin: "32px auto 0" }}>
          <button className="btn btn-primary">Join the club</button>
          <button className="btn btn-secondary">Log a verified day</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Journey });
