"use client";

import { useEffect, useMemo, useState } from "react";

type Chamber = "entrance" | "commission" | "refine" | "forging" | "masterworks" | "workbench";

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

const ADDITIONAL_MASTERWORKS = [
  { rune: "ᛏ", name: "The Stormbrand Edge", path: "Tempo and Disruption", tone: "rune", verdict: "A precise design that turns small timing advantages into a lead the opponent cannot recover from." },
  { rune: "ᛃ", name: "The Verdant Engine", path: "Synergy and Growth", tone: "steel", verdict: "A connected design whose pieces become more powerful together without depending on a single fragile line." },
  { rune: "ᛇ", name: "The Gravebound Accord", path: "Resilient Attrition", tone: "ember", verdict: "A patient design that treats every exchange as fuel and continues producing value after the first plan is broken." },
  { rune: "ᛋ", name: "The Sunforged Legion", path: "Go-Wide Pressure", tone: "ember", verdict: "A widening battlefield converts modest resources into an attack that demands several answers at once." },
  { rune: "ᛞ", name: "The Mirror Crucible", path: "Engine and Combo", tone: "rune", verdict: "An intricate design that hides a decisive finish inside individually useful cards and overlapping lines." },
  { rune: "ᛉ", name: "The Warden's Oath", path: "Ramp and Inevitability", tone: "steel", verdict: "A grounded design that survives the opening, accelerates past fair exchanges, and ends with overwhelming threats." },
] as const;
const MASTERWORK_POOL = [...MASTERWORKS, ...ADDITIONAL_MASTERWORKS] as const;

type DeckPreview = { card: string; role: string; theme: string; win: string };
type DeckRow = { quantity: number; name: string };
type CardFact = { name: string; type_line?: string; image_uris?: { normal?: string; art_crop?: string }; card_faces?: Array<{ image_uris?: { normal?: string; art_crop?: string } }> };

const MASTERWORK_STATS = [[94, 46, 70, 48], [72, 78, 76, 68], [28, 96, 64, 86], [76, 88, 72, 78], [62, 54, 94, 72], [44, 82, 88, 76], [86, 48, 90, 58], [38, 68, 98, 96], [42, 58, 82, 66]] as const;
const FORMAT_PREVIEWS: Record<string, DeckPreview[]> = {
  Standard: [
    { card: "Emberheart Challenger", role: "Lynchpin · pressure engine", theme: "Efficient threats turn every combat step into leverage.", win: "Build an early lead, then convert prowess and reach into the final points." },
    { card: "Overlord of the Hauntwoods", role: "Lynchpin · value engine", theme: "Durable threats keep mana and pressure moving together.", win: "Outscale fair decks with resilient bodies and compounding card quality." },
    { card: "Stock Up", role: "Lynchpin · selection engine", theme: "Card selection finds the right answer for each stage of the game.", win: "Stabilize, exhaust opposing resources, and close behind protected threats." },
  ],
  Modern: [
    { card: "Ragavan, Nimble Pilferer", role: "Lynchpin · tempo engine", theme: "Cheap threats create mana, information, and immediate pressure.", win: "Force awkward answers early, then finish through efficient disruption." },
    { card: "Orcish Bowmasters", role: "Lynchpin · value engine", theme: "Flexible threats punish excess cards while controlling small creatures.", win: "Trade efficiently until incremental advantages become overwhelming." },
    { card: "Counterspell", role: "Lynchpin · permission", theme: "Broad answers protect a compact, inevitable endgame.", win: "Deny the opponent's pivotal turn and win once their resources are thin." },
  ],
  Premodern: [
    { card: "Goblin Lackey", role: "Lynchpin · deployment engine", theme: "One opening connects and turns the battlefield into an avalanche.", win: "Overwhelm defenses before slower engines can establish control." },
    { card: "Survival of the Fittest", role: "Lynchpin · toolbox engine", theme: "Every creature can become the exact answer the position demands.", win: "Assemble an adaptable creature chain that opponents cannot trade through." },
    { card: "Counterspell", role: "Lynchpin · permission", theme: "Efficient interaction protects a patient, resource-rich endgame.", win: "Neutralize the few spells that matter and take over with superior cards." },
  ],
  Pioneer: [
    { card: "Monastery Swiftspear", role: "Lynchpin · pressure engine", theme: "Low-cost spells become both interaction and additional damage.", win: "Compress the game until every draw threatens lethal." },
    { card: "Fable of the Mirror-Breaker", role: "Lynchpin · value engine", theme: "Filtering, mana, and copied threats make every stage productive.", win: "Accumulate flexible advantages, then copy the deck's best threat." },
    { card: "Supreme Verdict", role: "Lynchpin · reset", theme: "Unconditional resets buy time for a powerful late game.", win: "Clear committed boards and close once the opponent is out of rebuilds." },
  ],
  Historic: [
    { card: "Ragavan, Nimble Pilferer", role: "Lynchpin · tempo engine", theme: "Early pressure snowballs into mana and stolen resources.", win: "Stay ahead on tempo while disruption protects the attack." },
    { card: "Jarsyl, Dark Age Scion", role: "Lynchpin · recursion engine", theme: "The graveyard turns past exchanges into future value.", win: "Replay efficient spells until one-for-one trades stop being fair." },
    { card: "Mana Drain", role: "Lynchpin · permission", theme: "Premium interaction turns defense into a burst of development.", win: "Counter the pivotal spell and use the mana swing to seize control." },
  ],
  Brawl: [
    { card: "Ragavan, Nimble Pilferer", role: "Commander · treasure tempo", theme: "A compact red raid built around cheap interaction and stolen cards.", win: "Connect early, compound Treasure advantages, and burn through the last defenses." },
    { card: "Kutzil, Malamet Exemplar", role: "Commander · modified creatures", theme: "Counters and combat tricks turn a creature team into a draw engine.", win: "Grow multiple threats, deny combat tricks, and snowball every clean hit." },
    { card: "Braids, Arisen Nightmare", role: "Commander · sacrifice control", theme: "Disposable permanents become cards while opponents face painful choices.", win: "Drain resources turn by turn until sacrifice pressure becomes inevitable." },
  ],
  Commander: [
    { card: "Isshin, Two Heavens as One", role: "Commander · attack triggers", theme: "Every attack trigger fires twice, rewarding a relentless combat plan.", win: "Build one explosive combat step that multiplies tokens, damage, and value." },
    { card: "Muldrotha, the Gravetide", role: "Commander · graveyard value", theme: "The graveyard acts as a second hand full of reusable permanents.", win: "Outlast removal, rebuild repeatedly, and lock in an overwhelming resource edge." },
    { card: "Shorikai, Genesis Engine", role: "Commander · artifact control", theme: "Vehicles, tokens, and card selection support a patient control shell.", win: "Filter into answers, stabilize behind Pilots, then win through inevitability." },
  ],
};
const cardImage = (name: string) => `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}&format=image&version=normal`;
const parseDeckRows = (text: string): DeckRow[] => text.split(/\r?\n/).flatMap(line => { const match = line.trim().match(/^(\d+)\s+(.+?)(?:\s+\([A-Z0-9]{2,6}\)\s+\d+\w*)?$/); return match ? [{ quantity: Number(match[1]), name: match[2].trim() }] : []; });
const cardGroup = (fact?: CardFact, isCommander = false) => { const type = fact?.type_line || ""; if (isCommander) return "Commander"; if (/Land/i.test(type)) return "Lands"; if (/Creature/i.test(type)) return "Creatures"; if (/Planeswalker/i.test(type)) return "Planeswalkers"; if (/Instant/i.test(type)) return "Instants"; if (/Sorcery/i.test(type)) return "Sorceries"; if (/Artifact/i.test(type)) return "Artifacts"; if (/Enchantment/i.test(type)) return "Enchantments"; if (/Battle/i.test(type)) return "Battles"; return "Other"; };

export default function Home() {
  const [chamber, setChamber] = useState<Chamber>("entrance");
  const [stage, setStage] = useState(0);
  const [format, setFormat] = useState("Standard");
  const [strategy, setStrategy] = useState("Balanced midrange");
  const [deck, setDeck] = useState("");
  const [selectedWork, setSelectedWork] = useState(0);
  const [masterworkPage, setMasterworkPage] = useState(0);
  const [forgedDeck, setForgedDeck] = useState("");
  const [forgeReply, setForgeReply] = useState("");
  const [playerSignal, setPlayerSignal] = useState("");
  const [benchStatus, setBenchStatus] = useState<"idle" | "forging" | "testing" | "thinking">("idle");
  const [record, setRecord] = useState({ wins: 0, losses: 0 });
  const [revisions, setRevisions] = useState<Array<{ deck: string; note: string; createdAt: string }>>([]);
  const [cardFacts, setCardFacts] = useState<Record<string, CardFact>>({});
  const [hoveredCard, setHoveredCard] = useState("");

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
  const awaken = () => { setStage(0); setMasterworkPage(0); setSelectedWork(0); setChamber("forging"); };
  const chapter = chamber === "entrance" ? 0 : chamber === "commission" || chamber === "refine" ? 1 : chamber === "forging" ? 2 : 3;
  const visibleMasterworks = useMemo(() => MASTERWORK_POOL.slice(masterworkPage * 3, masterworkPage * 3 + 3), [masterworkPage]);
  const chosenPreview = (FORMAT_PREVIEWS[format] ?? FORMAT_PREVIEWS.Standard)[selectedWork % 3];
  const chosenWork = MASTERWORK_POOL[selectedWork];
  const deckRows = useMemo(() => parseDeckRows(forgedDeck), [forgedDeck]);
  const groupedDeck = useMemo(() => { const groups: Record<string, DeckRow[]> = {}; for (const row of deckRows) { const group = cardGroup(cardFacts[row.name.toLowerCase()], (format === "Commander" || format === "Brawl") && row.name.toLowerCase() === chosenPreview.card.toLowerCase()); (groups[group] ||= []).push(row); } return groups; }, [deckRows, cardFacts, format, chosenPreview.card]);
  const activeCard = hoveredCard || chosenPreview.card || deckRows[0]?.name || "";
  const activeFact = cardFacts[activeCard.toLowerCase()];
  const activeImage = activeFact?.image_uris?.normal || activeFact?.card_faces?.[0]?.image_uris?.normal || (activeCard ? cardImage(activeCard) : "");

  useEffect(() => {
    const names = [...new Set(parseDeckRows(forgedDeck).map(row => row.name))]; if (!names.length) { setCardFacts({}); return; }
    let cancelled = false;
    (async () => { const next: Record<string, CardFact> = {}; for (let index = 0; index < names.length; index += 75) { try { const response = await fetch("https://api.scryfall.com/cards/collection", { method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" }, body: JSON.stringify({ identifiers: names.slice(index, index + 75).map(name => ({ name })) }) }); const data = await response.json(); for (const fact of data.data || []) next[String(fact.name).toLowerCase()] = fact; } catch { /* Named image fallback remains available. */ } if (index + 75 < names.length) await new Promise(resolve => window.setTimeout(resolve, 120)); } if (!cancelled) setCardFacts(next); })();
    return () => { cancelled = true; };
  }, [forgedDeck]);

  async function inspectMasterwork(index: number) {
    const work = MASTERWORK_POOL[index];
    const preview = (FORMAT_PREVIEWS[format] ?? FORMAT_PREVIEWS.Standard)[index % 3];
    setSelectedWork(index); setChamber("workbench"); setBenchStatus("forging"); setForgeReply("");
    const prompt = `Forge the complete ${format} deck represented by ${work.name}. Its identity is ${work.path}; featured ${format === "Commander" || format === "Brawl" ? "commander" : "lynchpin"}: ${preview.card}; requested play style: ${strategy}. Return a concise pilot brief followed by one complete import-ready decklist. This is a founder-test candidate: never claim legality or performance that has not been verified, and explicitly identify any uncertainty.`;
    try {
      const response = await fetch("/api/forge/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ depth: "deep", messages: [{ role: "user", content: prompt }], context: { game: "mtg", deckName: work.name, format, deckText: "", coachingProfile: "Prefers concise, testable deck guidance." } }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Forge unavailable");
      const answer = String(data.answer || ""); setForgedDeck(answer); setRevisions([{ deck: answer, note: "Original Forge candidate", createdAt: new Date().toISOString() }]);
    } catch {
      setForgedDeck(`FOUNDER-TEST CANDIDATE\n\n${work.name} · ${format}\nFeatured ${format === "Commander" || format === "Brawl" ? "commander" : "lynchpin"}: ${preview.card}\n\nThe Forge brain could not complete the list on this attempt. Your commission is preserved; retry forging before beginning a legality-sensitive test.`);
    } finally { setBenchStatus("idle"); }
  }

  async function persistStoryBench(nextRevisions = revisions, nextRecord = record) {
    const snapshot = { format, strategy, selectedWork, forgedDeck, revisions: nextRevisions, record: nextRecord, updatedAt: new Date().toISOString() };
    window.localStorage.setItem("metaforge.storyBench", JSON.stringify(snapshot));
    try {
      const response = await fetch("/api/account/deck-bench", { cache: "no-store" }); if (!response.ok) return;
      const current = await response.json(); const bench = current.bench || { schemaVersion: 1, families: [] };
      const id = `story-${format.toLowerCase()}-${selectedWork}`;
      const family = { id, name: chosenWork.name, format, archived: false, promotedFingerprint: `story-${nextRevisions.length}`, revisions: nextRevisions.map((revision, index) => ({ fingerprint: `story-${index + 1}-${revision.createdAt}`, version: index + 1, source: index ? "forge" : "original", deckText: revision.deck, note: revision.note, createdAt: revision.createdAt, evidence: { wins: nextRecord.wins, losses: nextRecord.losses, sampleSize: nextRecord.wins + nextRecord.losses, confidence: nextRecord.wins + nextRecord.losses < 3 ? "early signal" : "developing" } })) };
      const families = [...(bench.families || []).filter((item: { id?: string }) => item.id !== id), family];
      await fetch("/api/account/deck-bench", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bench: { schemaVersion: 1, families }, baseRevision: current.revision || 0 }) });
    } catch { /* Browser recovery remains available if account sync is interrupted. */ }
  }

  function beginTesting() {
    setBenchStatus("testing");
    void persistStoryBench();
  }

  function recordMatch(result: "win" | "loss") {
    const next = result === "win" ? { ...record, wins: record.wins + 1 } : { ...record, losses: record.losses + 1 };
    setRecord(next); void persistStoryBench(revisions, next);
  }

  async function consultForge() {
    if (!playerSignal.trim() || benchStatus === "thinking") return;
    setBenchStatus("thinking"); setForgeReply("");
    const prompt = `I tested revision ${revisions.length || 1} of ${chosenWork.name}. My signal: ${playerSignal.trim()}\n\nDiagnose the most likely issue without overreacting to one result. Give 2-3 precise replacement packages or alternatives with what comes out, what comes in, the tradeoff, and the smallest next test. Preserve the deck's ${chosenWork.path} identity and my ${strategy} preference.`;
    try {
      const response = await fetch("/api/forge/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ depth: "balanced", messages: [{ role: "user", content: prompt }], context: { game: "mtg", deckName: chosenWork.name, format, deckText: forgedDeck, coachingProfile: "Prefers concise alternatives and testable changes." } }) });
      const data = await response.json(); if (!response.ok) throw new Error(data?.error || "Forge unavailable"); setForgeReply(String(data.answer || ""));
    } catch { setForgeReply("The Forge could not complete this refinement. Your feedback is still preserved locally; retry when the furnace reconnects."); }
    finally { setBenchStatus("testing"); }
  }

  function preserveRevision() {
    if (!forgeReply.trim()) return;
    const next = [...revisions, { deck: forgedDeck, note: forgeReply, createdAt: new Date().toISOString() }]; setRevisions(next);
    void persistStoryBench(next, record); setPlayerSignal(""); setForgeReply("");
  }

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
          <label><span>FORMAT</span><select value={format} onChange={(event) => setFormat(event.target.value)}><option>Standard</option><option>Brawl</option><option>Commander</option><option>Modern</option><option>Premodern</option><option>Pioneer</option><option>Historic</option></select></label>
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
      <div className="masterwork-grid">{visibleMasterworks.map((work, index) => { const poolIndex = masterworkPage * 3 + index; const preview = (FORMAT_PREVIEWS[format] ?? FORMAT_PREVIEWS.Standard)[poolIndex % 3]; return <article className={`masterwork-card ${work.tone}`} key={work.name} style={{ "--delay": `${index * 140}ms` } as React.CSSProperties}><span>MASTERWORK {String(poolIndex + 1).padStart(2, "0")}</span><div className="masterwork-title"><i>{work.rune}</i><div><small>{work.path} · {format}</small><h2>{work.name}</h2></div></div><div className="masterwork-glimpse"><img src={cardImage(preview.card)} alt={`${preview.card} card`} loading="lazy" /><div><small>{preview.role}</small><strong>{preview.card}</strong><p>{preview.theme}</p><em><b>WIN CONDITION</b>{preview.win}</em></div></div><div className="masterwork-stats">{["Aggression", "Interaction", "Synergy", "Complexity"].map((label, statIndex) => <span key={label}><small>{label}</small><b>{MASTERWORK_STATS[poolIndex][statIndex]}</b></span>)}</div><p className="masterwork-verdict">{work.verdict}</p><button onClick={() => inspectMasterwork(poolIndex)}>Inspect this Masterwork <b>→</b></button></article>; })}</div>
      <footer><button onClick={() => { setMasterworkPage(0); setChamber("entrance"); }}>Begin a new commission</button><span>THREE OF 642 DESIGNS SURVIVED</span><button className="masterwork-recycle" disabled={(masterworkPage + 1) * 3 >= MASTERWORK_POOL.length} onClick={() => setMasterworkPage(page => page + 1)}>{(masterworkPage + 1) * 3 >= MASTERWORK_POOL.length ? "All unseen Masterworks revealed" : "Recycle these · Forge three new Masterworks →"}</button></footer>
    </section>}

    {chamber === "workbench" && <section className="testing-anvil">
      <button className="back-link" onClick={() => setChamber("masterworks")}>← Return to the three Masterworks</button>
      <header><span className="forge-eyebrow"><i /> MASTERWORK CHOSEN · THE TESTING ANVIL</span><h1>{chosenWork.name}</h1><p>{chosenWork.path} · {format} · Revision {Math.max(1, revisions.length)}</p></header>
      <div className="testing-layout"><article className="deck-manuscript"><header><div><small>THE FORGED LIST · TYPE GALLERY</small><h2>{benchStatus === "forging" ? "The Forge is producing your deck…" : `${deckRows.reduce((sum, row) => sum + row.quantity, 0)} cards · ${Object.keys(groupedDeck).length} sections`}</h2></div><button disabled={!forgedDeck || benchStatus === "forging"} onClick={() => navigator.clipboard.writeText(forgedDeck)}>Copy deck</button></header>{benchStatus === "forging" ? <pre>Tempering curve, roles, interaction, and the mana lattice…</pre> : deckRows.length ? <div className="deck-gallery"><aside className="card-preview-stage"><div>{activeImage && <img src={activeImage} alt={`${activeCard} card preview`} />}</div><small>HOVER OR FOCUS A CARD</small><strong>{activeCard}</strong><span>{activeFact?.type_line || "Card details awaken on inspection"}</span></aside><div className="type-columns">{["Commander", "Creatures", "Planeswalkers", "Instants", "Sorceries", "Artifacts", "Enchantments", "Battles", "Lands", "Other"].filter(group => groupedDeck[group]?.length).map(group => <section className="type-column" key={group}><header><b>{group}</b><span>{groupedDeck[group].reduce((sum, row) => sum + row.quantity, 0)}</span></header>{groupedDeck[group].map(row => <button type="button" key={row.name} onMouseEnter={() => setHoveredCard(row.name)} onFocus={() => setHoveredCard(row.name)} className={activeCard === row.name ? "active" : ""}><span>{row.quantity}</span><strong>{row.name}</strong></button>)}</section>)}</div></div> : <pre>{forgedDeck}</pre>}<details className="raw-decklist"><summary>View complete Forge response / import text</summary><pre>{forgedDeck}</pre></details><footer><span>Featured {format === "Commander" || format === "Brawl" ? "commander" : "lynchpin"}: <b>{chosenPreview.card}</b></span><button disabled={benchStatus === "forging" || !forgedDeck} onClick={beginTesting}>{benchStatus === "testing" ? "Testing is active ✓" : "Choose this deck & begin testing"}</button></footer></article>
      <aside className="testing-loop"><header><small>THE FORGE LEARNS WITH YOU</small><h2>Test. Signal. Reforge.</h2><p>One match is a signal—not proof. Tell the Forge what felt strong, awkward, missing, or simply unlike you.</p></header><div className="test-record"><button onClick={() => recordMatch("win")}>Record a win <b>{record.wins}</b></button><button onClick={() => recordMatch("loss")}>Record a loss <b>{record.losses}</b></button></div><label><span>WHAT WORKED OR FELT WRONG?</span><textarea value={playerSignal} onChange={event => setPlayerSignal(event.target.value)} placeholder="Example: I keep running out of threats after the first board wipe, but the early pressure feels exactly right…" /></label><button className="consult-forge" disabled={!playerSignal.trim() || benchStatus === "thinking"} onClick={consultForge}>{benchStatus === "thinking" ? "The Forge is studying your signal…" : "Ask the Forge for alternatives →"}</button>{forgeReply && <section className="forge-refinement"><small>REFINEMENT OPTIONS · FORGE THEORY</small><pre>{forgeReply}</pre><button onClick={preserveRevision}>Preserve as revision {revisions.length + 1}</button></section>}<footer><b>{revisions.length || 1}</b><span>REVISION{revisions.length === 1 ? "" : "S"} PRESERVED · PRIVATE BENCH SYNC</span></footer></aside></div>
    </section>}
  </main>;
}
