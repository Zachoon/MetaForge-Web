"use client";

import { useEffect, useMemo, useState } from "react";

type Chamber = "entrance" | "commission" | "refine" | "forging" | "masterworks";

const FORGING_STAGES = [
  ["The blueprint is sealed", "Reading the commission marks…", "642"],
  ["Awakening the Great Furnace", "Ancient channels fill with light.", "642"],
  ["Consulting the Archive", "Rejecting designs with repeated structural failures…", "318"],
  ["Shaping the strategic core", "Aligning every card with the requested strategy…", "141"],
  ["Tempering the mana lattice", "Discarding unstable foundations…", "47"],
  ["Testing structural integrity", "Pressing each design against hostile plans…", "9"],
  ["Inspecting imperfections", "Recording every honest weakness…", "3"],
  ["Three designs survived", "Cooling the surviving masterworks…", "3"],
] as const;

const MASTERWORKS = [
  { rune: "ᛋ", name: "The Ember Vanguard", path: "Aggressive Pressure", tone: "ember", verdict: "The fastest surviving design. Its edge was preserved without sacrificing its ability to recover." },
  { rune: "ᛉ", name: "The Iron Covenant", path: "Adaptive Midrange", tone: "steel", verdict: "The most balanced masterwork. Its strength is refusing to become irrelevant as the battle changes." },
  { rune: "ᛟ", name: "The Rune Bastion", path: "Measured Control", tone: "rune", verdict: "The most defensible design. It survived by answering the widest range of opposing plans." },
] as const;

export default function Home() {
  const [chamber, setChamber] = useState<Chamber>("entrance");
  const [stage, setStage] = useState(0);
  const [format, setFormat] = useState("Standard");
  const [strategy, setStrategy] = useState("Balanced midrange");
  const [deck, setDeck] = useState("");

  useEffect(() => {
    if (chamber !== "forging") return;
    if (stage >= FORGING_STAGES.length - 1) {
      const reveal = window.setTimeout(() => setChamber("masterworks"), 1500);
      return () => window.clearTimeout(reveal);
    }
    const timer = window.setTimeout(() => setStage((value) => value + 1), 1150);
    return () => window.clearTimeout(timer);
  }, [chamber, stage]);

  const progress = useMemo(() => ((stage + 1) / FORGING_STAGES.length) * 100, [stage]);
  const awaken = () => { setStage(0); setChamber("forging"); };
  const chapter = chamber === "entrance" ? 0 : chamber === "commission" || chamber === "refine" ? 1 : chamber === "forging" ? 2 : 3;

  return <main className={`great-forge chamber-${chamber}`}>
    <div className="forge-textures" aria-hidden="true"><i /><b /></div>
    <header className="forge-bar">
      <button className="forge-brand" onClick={() => setChamber("entrance")} aria-label="Return to Forge entrance"><i>MF</i><span>METAFORGE<small>THE GREAT FORGE</small></span></button>
      <nav className="forge-steps" aria-label="Commission progress">{[["01", "Entrance"], ["02", "Blueprint"], ["03", "The Forge"], ["04", "Masterworks"]].map(([number, label], index) => <span className={chapter >= index ? "lit" : ""} key={label}><b>{number}</b>{label}</span>)}</nav>
      <button className="quiet-action" onClick={() => setChamber("entrance")}>New commission</button>
    </header>

    {chamber === "entrance" && <section className="forge-entrance">
      <div className="entrance-copy">
        <span className="forge-eyebrow"><i /> THE GREAT FORGE AWAITS</span>
        <h1>What do you want<br />to <em>create today?</em></h1>
        <p>Every legendary deck begins as a blueprint. Commission a new design or bring an existing build to the anvil for refinement.</p>
        <div className="entrance-actions">
          <button onClick={() => setChamber("commission")}><small>COMMISSION I</small><strong>Forge a new deck</strong><span>Shape a masterwork from a fresh blueprint.</span><b>Enter the drafting chamber →</b></button>
          <button onClick={() => setChamber("refine")}><small>COMMISSION II</small><strong>Refine a current build</strong><span>Bring an existing deck to the anvil.</span><b>Enter the refinement chamber →</b></button>
        </div>
      </div>
      <div className="entrance-visual" aria-label="The blue rune archive"><div className="forge-sigil"><i>ᛟ</i><span /><b /></div><p>THE ARCHIVE IS LISTENING<small>Every lesson. Every failure. Every masterwork.</small></p></div>
    </section>}

    {(chamber === "commission" || chamber === "refine") && <section className="commission-chamber">
      <button className="back-link" onClick={() => setChamber("entrance")}>← Return to the Forge Entrance</button>
      <div className="commission-heading"><span className="forge-eyebrow"><i /> {chamber === "commission" ? "COMMISSION I · THE BLUEPRINT" : "COMMISSION II · THE ANVIL"}</span><h1>{chamber === "commission" ? "Describe the weapon you want to wield." : "Bring your deck to the anvil."}</h1><p>{chamber === "commission" ? "These marks become constraints—not decoration. The Forge will honor how you want to play." : "The Forge will preserve what works, expose the fracture, and temper one deliberate change."}</p></div>
      <div className="commission-scroll">
        {chamber === "refine" && <label className="deck-offering"><span>YOUR CURRENT DECKLIST</span><textarea value={deck} onChange={(event) => setDeck(event.target.value)} placeholder="Paste your Arena, MTGO, or Moxfield list here…" /></label>}
        <div className="mark-grid">
          <label><span>FORMAT</span><select value={format} onChange={(event) => setFormat(event.target.value)}><option>Standard</option><option>Commander</option><option>Modern</option><option>Pioneer</option><option>Historic</option></select></label>
          <label><span>HOW SHOULD IT FIGHT?</span><select value={strategy} onChange={(event) => setStrategy(event.target.value)}><option>Aggressive pressure</option><option>Balanced midrange</option><option>Reactive control</option><option>Synergy and combo</option><option>Tempo and disruption</option></select></label>
          <label><span>COMPLEXITY</span><select><option>Accessible</option><option>Balanced</option><option>Technical</option><option>Maximum depth</option></select></label>
          <label><span>BUDGET</span><select><option>No strict limit</option><option>Budget conscious</option><option>Moderate investment</option><option>Competitive optimization</option></select></label>
        </div>
        <label className="commission-note"><span>THE ONE THING THE FORGE MUST UNDERSTAND</span><textarea placeholder="Favorite cards, play patterns you love, or anything this deck must never become…" /></label>
        <button className="awaken-button" disabled={chamber === "refine" && !deck.trim()} onClick={awaken}><span>Seal the commission</span><strong>AWAKEN THE GREAT FORGE</strong><b>→</b></button>
      </div>
    </section>}

    {chamber === "forging" && <section className="forging-ceremony" aria-live="polite">
      <div className="furnace-core" aria-hidden="true"><div><span>ᛟ</span></div></div>
      <div className="ceremony-copy"><span className="forge-eyebrow"><i /> COMMISSION ACCEPTED</span><h1>{FORGING_STAGES[stage][0]}</h1><p>{FORGING_STAGES[stage][1]}</p><div className="candidate-count"><strong>{FORGING_STAGES[stage][2]}</strong><span>CANDIDATE DESIGNS<br />REMAINING</span></div><div className="ceremony-progress"><span><b style={{ width: `${progress}%` }} /></span><small>FORGING STAGE {stage + 1} OF {FORGING_STAGES.length}</small></div></div>
    </section>}

    {chamber === "masterworks" && <section className="masterwork-reveal">
      <header><span className="forge-eyebrow"><i /> THE GREAT FORGE ANSWERS <i /></span><h1>Steel bends. Runes awaken.<br /><em>Three designs endure.</em></h1><p>The Forge honored your {format} commission and shaped three paths around <strong>{strategy.toLowerCase()}</strong>. Choose the one that feels like yours.</p></header>
      <div className="masterwork-grid">{MASTERWORKS.map((work, index) => <article className={`masterwork-card ${work.tone}`} key={work.name} style={{ "--delay": `${index * 140}ms` } as React.CSSProperties}><span>MASTERWORK 0{index + 1}</span><i>{work.rune}</i><small>{work.path}</small><h2>{work.name}</h2><p>{work.verdict}</p><button>Inspect this Masterwork <b>→</b></button></article>)}</div>
      <footer><button onClick={() => setChamber("entrance")}>Begin a new commission</button><span>THREE OF 642 DESIGNS SURVIVED</span></footer>
    </section>}
  </main>;
}
