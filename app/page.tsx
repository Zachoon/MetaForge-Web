"use client";

import { useMemo, useState } from "react";
import { isLand, parseDeck } from "./deck-analysis.mjs";

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

  const rows = useMemo(() => parseDeck(deckText), [deckText]);
  const cardCount = rows.reduce((sum, row) => sum + row.quantity, 0);
  const landCount = rows.filter((row) => isLand(row.name)).reduce((sum, row) => sum + row.quantity, 0);
  const uniqueCount = rows.length;
  const health = Math.max(42, Math.min(94, 78 - Math.abs(24 - landCount) * 2 - Math.abs(60 - cardCount)));

  function loadSample() {
    setDeckName("Red Prowess");
    setFormat("Standard");
    setDeckText(SAMPLE_DECK);
    setAnalyzed(false);
  }

  function analyze() {
    if (cardCount > 0) setAnalyzed(true);
  }

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
            <button className="text-button" onClick={loadSample}>See a sample analysis</button>
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
          <div className="workspace">
            <div className="input-panel">
              <div className="field-row">
                <label>DECK NAME<input value={deckName} onChange={(e) => { setDeckName(e.target.value); setAnalyzed(false); }} /></label>
                <label>FORMAT<select value={format} onChange={(e) => { setFormat(e.target.value); setAnalyzed(false); }}><option>Standard</option><option>Pioneer</option><option>Modern</option><option>Legacy</option><option>Pauper</option><option>Vintage</option><option>Commander</option></select></label>
              </div>
              <label className="deck-label">DECKLIST <button onClick={loadSample}>Load sample</button></label>
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
                  <article className="finding"><small>01 · HIGHEST PRIORITY</small><h4>{landCount < 20 ? "Your mana base needs immediate attention" : cardCount !== 60 ? "Your deck size is costing you consistency" : "Your foundation is ready for deeper testing"}</h4><p>{landCount < 20 ? `Only ${landCount} lands were detected. That increases the risk that your strongest cards arrive without the mana to cast them.` : cardCount !== 60 ? `This list contains ${cardCount} cards. In most constructed formats, staying at the minimum improves access to your best draws.` : "The list clears the first composition checks. Next, Forge will measure curve pressure, colored sources, and strategic concentration."}</p></article>
                  <div className="next-test"><span>NEXT SAFE TEST</span><p>{landCount < 20 ? "Add lands toward the format baseline, then compare opening hands." : cardCount !== 60 ? "Trim toward 60 cards while preserving your core game plan." : "Run 100 opening hands and inspect turn-two color access."}</p><button>Prepare comparison <b>→</b></button></div>
                  <p className="result-note">This early web preview uses composition evidence. Deeper Forge intelligence will connect as the hosted API comes online.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <footer className="shell"><a className="brand" href="#top"><span className="brand-mark">MF</span><span>METAFORGE</span></a><p>Understand the deck. Respect the evidence. Test the change.</p><span>© 2026 MetaForge</span></footer>
    </main>
  );
}
