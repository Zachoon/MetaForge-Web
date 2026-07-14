"use client";

import { useEffect, useMemo, useState } from "react";
import { createRecommendation, isLand, parseDeck } from "./deck-analysis.mjs";
import { simulateDeck } from "./forge-simulation.mjs";

const SAMPLE_DECK = `4 Monastery Swiftspear
4 Slickshot Show-Off
4 Emberheart Challenger
4 Lightning Strike
4 Burst Lightning
4 Monstrous Rage
4 Torch the Tower
4 Boltwave
2 Witchstalker Frenzy
22 Mountain`;

export default function Home() {
  const [deckName, setDeckName] = useState("My deck");
  const [format, setFormat] = useState("Standard");
  const [deckText, setDeckText] = useState("");
  const [analyzed, setAnalyzed] = useState(false);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [proposedDeck, setProposedDeck] = useState("");
  const [comparisonReady, setComparisonReady] = useState(false);
  const [arenaStatus, setArenaStatus] = useState<"idle" | "connecting" | "connected" | "needs-logs" | "offline">("idle");
  const [arenaMatches, setArenaMatches] = useState<Array<{ id: string; completedAt: string; gamesWon: number; gamesLost: number; result: "win" | "loss"; mulligans: number; experimentVariant?: "original" | "proposed" | "unmatched" }>>([]);
  const [experiment, setExperiment] = useState<null | {
    id?: string;
    deckName: string;
    originalDeck: string;
    proposedDeck: string;
    status: "testing" | "kept" | "reverted";
    startedAt: string;
    originalFingerprint?: string;
    proposedFingerprint?: string;
  }>(null);

  const rows = useMemo(() => parseDeck(deckText), [deckText]);
  const cardCount = rows.reduce((sum, row) => sum + row.quantity, 0);
  const landCount = rows.filter((row) => isLand(row.name)).reduce((sum, row) => sum + row.quantity, 0);
  const uniqueCount = rows.length;
  const health = Math.max(42, Math.min(94, 78 - Math.abs(24 - landCount) * 2 - Math.abs(60 - cardCount)));
  const recommendation = useMemo(() => createRecommendation(rows, format), [rows, format]);
  const proposedRows = useMemo(() => parseDeck(proposedDeck), [proposedDeck]);
  const originalMetrics = useMemo(() => comparisonReady ? simulateDeck(rows) : null, [comparisonReady, rows]);
  const proposedMetrics = useMemo(() => comparisonReady ? simulateDeck(proposedRows, 2500, 19411) : null, [comparisonReady, proposedRows]);

  useEffect(() => {
    const stored = window.localStorage.getItem("metaforge.activeExperiment");
    if (!stored) return;
    try {
      setExperiment(JSON.parse(stored));
    } catch {
      window.localStorage.removeItem("metaforge.activeExperiment");
    }
  }, []);

  useEffect(() => {
    if (arenaStatus !== "connected") return;
    const refresh = async () => {
      try {
        const response = await fetch("http://127.0.0.1:17831/matches", { cache: "no-store" });
        const data = await response.json();
        setArenaMatches(Array.isArray(data.matches) ? data.matches.slice().reverse() : []);
      } catch {
        setArenaStatus("offline");
      }
    };
    refresh();
    const timer = window.setInterval(refresh, 5000);
    return () => window.clearInterval(timer);
  }, [arenaStatus]);

  async function connectArena() {
    setArenaStatus("connecting");
    try {
      const response = await fetch("http://127.0.0.1:17831/health", { cache: "no-store" });
      const data = await response.json();
      setArenaStatus(data.logFound ? "connected" : "needs-logs");
      if (data.logFound && experiment) {
        const upgraded = experiment.originalFingerprint && experiment.proposedFingerprint ? experiment : {
          ...experiment,
          id: experiment.id || window.crypto.randomUUID(),
          originalFingerprint: await fingerprint(parseDeck(experiment.originalDeck)),
          proposedFingerprint: await fingerprint(parseDeck(experiment.proposedDeck)),
        };
        window.localStorage.setItem("metaforge.activeExperiment", JSON.stringify(upgraded));
        setExperiment(upgraded);
        await registerExperiment(upgraded);
      }
    } catch {
      setArenaStatus("offline");
    }
  }

  function loadSample(moveToForge = false) {
    setDeckName("Red Prowess");
    setFormat("Standard");
    setDeckText(SAMPLE_DECK);
    setAnalyzed(moveToForge);
    if (moveToForge) {
      window.setTimeout(() => document.querySelector("#forge")?.scrollIntoView({ behavior: "smooth" }), 0);
    }
  }

  function analyze() {
    if (cardCount > 0) setAnalyzed(true);
  }

  function prepareComparison() {
    setProposedDeck(recommendation.proposedDeck);
    setComparisonReady(false);
    setComparisonOpen(true);
    window.setTimeout(() => document.querySelector("#test-bench")?.scrollIntoView({ behavior: "smooth" }), 0);
  }

  async function fingerprint(deckRows: Array<{ name: string; quantity: number }>) {
    const totals = new Map<string, number>();
    deckRows.forEach((row) => totals.set(row.name.trim().toLowerCase(), (totals.get(row.name.trim().toLowerCase()) || 0) + row.quantity));
    const canonical = [...totals.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([name, quantity]) => `${quantity} ${name}`).join("\n");
    const digest = await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("").slice(0, 24);
  }

  async function registerExperiment(nextExperiment: NonNullable<typeof experiment>) {
    try {
      await fetch("http://127.0.0.1:17831/experiment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(nextExperiment) });
    } catch {
      // The local experiment remains saved and can be paired when the companion reconnects.
    }
  }

  async function saveExperiment() {
    if (!proposedRows.length || proposedDeck.trim() === deckText.trim()) return;
    const [originalFingerprint, proposedFingerprint] = await Promise.all([fingerprint(rows), fingerprint(proposedRows)]);
    const nextExperiment = {
      id: window.crypto.randomUUID(),
      deckName: deckName || "Untitled deck",
      originalDeck: deckText,
      proposedDeck,
      status: "testing" as const,
      startedAt: new Date().toISOString(),
      originalFingerprint,
      proposedFingerprint,
    };
    window.localStorage.setItem("metaforge.activeExperiment", JSON.stringify(nextExperiment));
    setExperiment(nextExperiment);
    await registerExperiment(nextExperiment);
  }

  function decideExperiment(status: "testing" | "kept" | "reverted") {
    if (!experiment) return;
    const updated = { ...experiment, status };
    if (status === "kept") {
      setDeckText(experiment.proposedDeck);
      setAnalyzed(false);
    }
    window.localStorage.setItem("metaforge.activeExperiment", JSON.stringify(updated));
    setExperiment(updated);
  }

  const proposedEvidence = arenaMatches.filter((match) => (match as typeof match & { experimentVariant?: string }).experimentVariant === "proposed");
  const proposedWins = proposedEvidence.filter((match) => match.result === "win").length;
  const evidenceConfidence = proposedEvidence.length < 5 ? "EARLY SIGNAL" : proposedEvidence.length < 12 ? "DEVELOPING" : "MEANINGFUL SAMPLE";
  const evidenceVerdict = proposedEvidence.length === 0 ? "No Arena matches have been matched to this proposed build yet." : proposedEvidence.length < 5 ? `MetaForge has matched ${proposedEvidence.length} game${proposedEvidence.length === 1 ? "" : "s"} to the proposed build. This is enough to observe, not enough to judge.` : proposedWins / proposedEvidence.length < .4 ? "The proposed build is underperforming so far. The Forge will treat the original recommendation as challenged while gathering matchup and gameplay context." : "The proposed build is holding up in live play. Continue testing while the Forge checks whether the result survives a larger matchup spread.";

  return (
    <main>
      <nav className="nav shell" aria-label="Main navigation">
        <a className="brand" href="#top" aria-label="MetaForge home">
          <span className="brand-mark">MF</span>
          <span>METAFORGE</span>
        </a>
        <div className="nav-links">
          <a href="#how-it-works">How it works</a>
          <a href="#forge">The Forge</a>
        </div>
        <button className="nav-cta" onClick={() => document.querySelector("#forge")?.scrollIntoView({ behavior: "smooth" })}>
          Analyze a deck
        </button>
      </nav>

      <section className="hero shell" id="top">
        <div className="hero-copy">
          <div className="eyebrow"><span /> YOUR DECK, EXPLAINED</div>
          <h1>Stop guessing.<br /><em>Forge a better deck.</em></h1>
          <p className="hero-lede">
            MetaForge finds the pressure points in your Magic deck, explains why they matter,
            and gives you changes worth testing—not a pile of generic card suggestions.
          </p>
          <div className="hero-actions">
            <button className="primary" onClick={() => document.querySelector("#forge")?.scrollIntoView({ behavior: "smooth" })}>
              Analyze my deck <span>→</span>
            </button>
            <button className="text-button" onClick={() => loadSample(true)}>See a sample analysis</button>
          </div>
          <div className="trust-row">
            <span><b>◇</b> Explainable findings</span>
            <span><b>◇</b> Evidence-aware</span>
            <span><b>◇</b> Free to try</span>
          </div>
        </div>
        <div className="hero-visual" aria-label="Example MetaForge diagnosis">
          <div className="forge-aperture"><span>LIVE FORGE SIGNAL</span><i /></div>
          <div className="scan-line" />
          <div className="floating-report">
            <div className="report-top">
              <div><small>FORGE DIAGNOSIS</small><strong>Temur Prowess</strong></div>
              <div className="score"><span>82</span><small>DECK<br />HEALTH</small></div>
            </div>
            <div className="signal critical"><i>01</i><div><small>PRIMARY PRESSURE POINT</small><b>Turn-two color access is inconsistent</b><p>Your opening seven finds both colors in only 61% of measured hands.</p></div></div>
            <div className="confidence"><span>CONFIDENCE</span><div><i /></div><b>HIGH</b></div>
          </div>
        </div>
      </section>

      <section className="proof-strip">
        <div className="shell proof-inner">
          <p>Built to answer the questions that decklists cannot.</p>
          <div><strong>WHAT</strong><span>is going wrong?</span></div>
          <div><strong>WHY</strong><span>does it matter?</span></div>
          <div><strong>WHAT NEXT</strong><span>should I test?</span></div>
        </div>
      </section>

      <section className="process shell" id="how-it-works">
        <div className="section-heading"><div><span>THE METAFORGE METHOD</span><h2>From decklist to direction.</h2></div><p>Useful intelligence in minutes, with the reasoning left intact.</p></div>
        <div className="forge-architecture" aria-label="The three chambers of the MetaForge analysis process">
          <div><span>01</span> INTAKE</div><div><span>02</span> DIAGNOSIS</div><div><span>03</span> COMPARISON</div>
        </div>
        <div className="steps">
          <article><i>01</i><div className="step-icon">＋</div><h3>Add your deck</h3><p>Paste a list from Arena, MTGO, Moxfield, or your notes. No account required.</p></article>
          <article><i>02</i><div className="step-icon">⌁</div><h3>See the pressure points</h3><p>Forge measures composition, consistency, curve, mana, and strategic focus.</p></article>
          <article><i>03</i><div className="step-icon">↗</div><h3>Test a stronger version</h3><p>Compare changes against your original deck and understand every tradeoff.</p></article>
        </div>
      </section>

      <section className="forge-section" id="forge">
        <div className="shell forge-shell">
          <div className="forge-heading"><div><span>ENTER THE FORGE</span><h2>What are you working on?</h2></div><p>Paste a quantity-based decklist. Your first diagnosis appears instantly.</p></div>
          {experiment && (
            <aside className={`experiment-return ${experiment.status}`}>
              <div>
                <small>SAVED FORGE EXPERIMENT</small>
                <h3>{experiment.deckName}</h3>
                <p>{experiment.status === "testing" ? "Did this change earn a place in your deck?" : experiment.status === "kept" ? "Change kept. This version is now loaded into the Forge." : "Change reverted. Your original version remains intact."}</p>
              </div>
              {experiment.status === "testing" && (
                <div className="experiment-actions">
                  <button onClick={() => decideExperiment("kept")}>Keep the change</button>
                  <button onClick={() => decideExperiment("reverted")}>Revert</button>
                  <button onClick={() => decideExperiment("testing")}>Still testing</button>
                </div>
              )}
            </aside>
          )}
          <aside className="arena-bridge">
            <div>
              <small>ARENA COMPANION · PRIVATE ALPHA</small>
              <h3>Let Arena report the test results.</h3>
              <p>{arenaStatus === "connected" ? "Connected. Completed matches will appear here automatically." : arenaStatus === "needs-logs" ? "Companion found. Enable Detailed Logs in Arena, then restart Arena." : arenaStatus === "offline" ? "Companion is not running yet. Start the local MetaForge companion, then reconnect." : "Connect the read-only local companion to track completed Arena matches without manual entry."}</p>
            </div>
            <button onClick={connectArena} disabled={arenaStatus === "connecting"}>{arenaStatus === "connected" ? "Arena connected" : arenaStatus === "connecting" ? "Connecting…" : "Connect Arena"}</button>
          </aside>
          {arenaMatches.length > 0 && (
            <section className="arena-history" aria-label="Arena match history">
              <div className="arena-history-heading"><div><small>PERSONAL PLAY EVIDENCE</small><h3>Recent Arena matches</h3></div><span>{arenaMatches.filter((match) => match.result === "win").length}–{arenaMatches.filter((match) => match.result === "loss").length}</span></div>
              <div className="arena-match-list">{arenaMatches.slice(0, 8).map((match) => <article key={match.id} className={match.result}><b>{match.result === "win" ? "WIN" : "LOSS"}</b><span>{match.gamesWon}–{match.gamesLost} games</span><span>{match.mulligans} mulligans</span><time>{new Date(match.completedAt).toLocaleString()}</time></article>)}</div>
              <p>This evidence belongs to your testing history. It does not alter MetaForge’s global intelligence.</p>
            </section>
          )}
          {experiment && (
            <section className="forge-evidence">
              <div><small>FORGE EXPERIMENT EVIDENCE</small><h3>{evidenceConfidence}</h3></div>
              <div><b>{proposedWins}–{proposedEvidence.length - proposedWins}</b><span>MATCHED PROPOSED BUILD</span></div>
              <p>{evidenceVerdict}</p>
            </section>
          )}
          <div className="workspace">
            <div className="input-panel">
              <div className="field-row">
                <label>DECK NAME<input value={deckName} onChange={(e) => { setDeckName(e.target.value); setAnalyzed(false); }} /></label>
                <label>FORMAT<select value={format} onChange={(e) => { setFormat(e.target.value); setAnalyzed(false); }}><option>Standard</option><option>Pioneer</option><option>Modern</option><option>Legacy</option><option>Pauper</option><option>Vintage</option><option>Commander</option></select></label>
              </div>
              <label className="deck-label">DECKLIST <button onClick={() => loadSample(false)}>Load sample</button></label>
              <textarea value={deckText} onChange={(e) => { setDeckText(e.target.value); setAnalyzed(false); }} placeholder={"4 Lightning Bolt\n4 Monastery Swiftspear\n20 Mountain"} aria-label="Decklist" />
              <div className="input-footer"><span>{cardCount ? `${cardCount} cards · ${uniqueCount} unique entries` : "Use one card entry per line"}</span><span>TXT</span></div>
              <button className="analyze" disabled={!cardCount} onClick={analyze}>Forge my analysis <span>→</span></button>
            </div>

            <div className={`result-panel ${analyzed ? "ready" : ""}`} aria-live="polite">
              {!analyzed ? (
                <div className="empty-result"><div className="anvil">◇</div><small>AWAITING DECKLIST</small><h3>Your diagnosis will appear here.</h3><p>We’ll show your deck health, highest-priority issue, and the first change worth testing.</p></div>
              ) : (
                <div className="analysis-result">
                  <div className="result-header"><div><small>INITIAL DIAGNOSIS · {format.toUpperCase()}</small><h3>{deckName || "Untitled deck"}</h3></div><div className="health"><b>{health}</b><span>/100<br />HEALTH</span></div></div>
                  <div className="metric-row"><div><span>TOTAL CARDS</span><b>{cardCount}</b></div><div><span>LANDS DETECTED</span><b>{landCount}</b></div><div><span>UNIQUE ENTRIES</span><b>{uniqueCount}</b></div></div>
                  <article className="finding"><small>01 · FORGE RECOMMENDATION</small><h4>{recommendation.title}</h4><p>{recommendation.summary}</p><p className="recommendation-reasoning">{recommendation.reasoning}</p></article>
                  {recommendation.mechanics?.landfall_payoff > 0 && <div className="mechanic-tradeoff"><span>LANDFALL TRADEOFF</span><div><b>{recommendation.mechanics.payoffCount}</b><small>PAYOFF CARDS</small></div><div><b>{recommendation.mechanics.fetchCount}</b><small>FETCH LANDS</small></div><div><b>{recommendation.mechanics.slowFetchCount}</b><small>ALWAYS TAPPED</small></div><div><b>{recommendation.mechanics.posture.replaceAll("-", " ")}</b><small>FORGE POSTURE</small></div></div>}
                  {recommendation.changes.length > 0 && <div className="change-set"><span>PROPOSED CHANGE</span>{recommendation.changes.map((change) => <b key={`${change.card}-${change.quantity}`} className={change.quantity > 0 ? "add" : "remove"}>{change.quantity > 0 ? "+" : ""}{change.quantity} {change.card}</b>)}</div>}
                  <div className="next-test"><span>NEXT SAFE TEST</span><p>{recommendation.changes.length ? "Compare Forge’s proposed version against your original, then edit it before saving anything." : "Choose one flex-slot change in the editable proposed version and measure it against the original."}</p><button onClick={prepareComparison}>{recommendation.changes.length ? "Test this recommendation" : "Build a manual experiment"} <b>→</b></button></div>
                  <p className="result-note">This early web preview uses composition evidence. Deeper Forge intelligence will connect as the hosted API comes online.</p>
                </div>
              )}
            </div>
          </div>
          {comparisonOpen && (
            <section className="test-bench-web" id="test-bench">
              <div className="bench-heading">
                <div><small>WORKSHOP TEST BENCH</small><h3>Original versus proposed</h3></div>
                <p>Edit the proposed version, then run the same seeded simulation against both lists.</p>
              </div>
              <div className="bench-grid">
                <div><label>ORIGINAL VERSION</label><textarea value={deckText} readOnly aria-label="Original deck version" /></div>
                <div><label>PROPOSED VERSION</label><textarea value={proposedDeck} onChange={(event) => { setProposedDeck(event.target.value); setComparisonReady(false); }} aria-label="Proposed deck version" /></div>
              </div>
              <button className="run-comparison" disabled={!proposedRows.length} onClick={() => setComparisonReady(true)}>Run 2,500 opening hands <span>→</span></button>
              {comparisonReady && originalMetrics && proposedMetrics && (
                <div className="comparison-results">
                  <div className="comparison-labels"><span>MEASURE</span><span>ORIGINAL</span><span>PROPOSED</span></div>
                  <div><span>Keepable opening hands (2–4 lands)</span><b>{(originalMetrics.keepableRate * 100).toFixed(1)}%</b><b>{(proposedMetrics.keepableRate * 100).toFixed(1)}%</b></div>
                  <div><span>Average lands in opening seven</span><b>{originalMetrics.averageOpeningLands.toFixed(2)}</b><b>{proposedMetrics.averageOpeningLands.toFixed(2)}</b></div>
                  <div><span>Next draw is a spell after available fetches</span><b>{(originalMetrics.nextSpellRate * 100).toFixed(1)}%</b><b>{(proposedMetrics.nextSpellRate * 100).toFixed(1)}%</b></div>
                  <div><span>Hands able to activate a modeled fetch</span><b>{(originalMetrics.fetchActivationRate * 100).toFixed(1)}%</b><b>{(proposedMetrics.fetchActivationRate * 100).toFixed(1)}%</b></div>
                  <p>Fetch simulations remove one eligible basic from the library, shuffle, and continue drawing. Random mill or exile is not treated as an automatic consistency benefit.</p>
                  <button className="save-experiment" disabled={proposedDeck.trim() === deckText.trim()} onClick={saveExperiment}>{proposedDeck.trim() === deckText.trim() ? "Edit the proposed deck to begin" : "Start this experiment"}</button>
                </div>
              )}
            </section>
          )}
        </div>
      </section>

      <footer className="shell"><a className="brand" href="#top"><span className="brand-mark">MF</span><span>METAFORGE</span></a><p>Understand the deck. Respect the evidence. Test the change.</p><span>© 2026 MetaForge</span></footer>
    </main>
  );
}
