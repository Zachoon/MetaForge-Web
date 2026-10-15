"use client";

import { useState } from "react";
import { GlossaryText } from "./glossary-text";

// A static, clearly labelled example of one guided pick, so a first-time
// visitor can see what building "with the coach" looks like before they
// start. Nothing here calls the engine: the card, reasons and follow-ups are
// fixed sample data.
const EXAMPLE = {
  commander: "Atraxa, Praetors' Voice",
  step: "Ramp",
  card: "Cultivate",
  typeLine: "Sorcery · {2}{G}",
  role: "Ramp — puts two lands into play over two turns",
  worksWith: "Your commander's four-color mana needs",
  tradeOff: "Slow on turn three; a two-mana rock is faster but fixes less",
  learned: "You skipped Sol Ring earlier because of power level, so this stays fair",
  declineReasons: ["Wrong plan", "Too expensive", "Too strong for my table", "Just show me another"],
};

type Outcome = { kind: "accepted" } | { kind: "declined"; reason: string } | null;

export function SampleWalkthrough() {
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [askingWhy, setAskingWhy] = useState(false);

  return (
    <section className="sample-walkthrough" aria-labelledby="sample-walkthrough-title">
      <header>
        <span className="sample-badge">EXAMPLE · NOT YOUR DECK</span>
        <h2 id="sample-walkthrough-title">What a guided pick looks like</h2>
        <p>
          Building {EXAMPLE.commander}, step <b><GlossaryText text={EXAMPLE.step} /></b>. You decide every card; the coach explains each
          suggestion and adapts to your answers. Try the buttons — this is sample data only.
        </p>
      </header>
      <article className="sample-card" data-outcome={outcome?.kind || "open"}>
        <div className="sample-card-head">
          <small>SUGGESTED CARD</small>
          <h3>{EXAMPLE.card}</h3>
          <em>{EXAMPLE.typeLine}</em>
        </div>
        <dl className="guided-explanation">
          <div><dt>Role</dt><dd>{EXAMPLE.role}</dd></div>
          <div><dt>Works with</dt><dd>{EXAMPLE.worksWith}</dd></div>
          <div><dt>Trade-off</dt><dd>{EXAMPLE.tradeOff}</dd></div>
          <div><dt>From your choices</dt><dd>{EXAMPLE.learned}</dd></div>
        </dl>
        {outcome ? (
          <div className="sample-result" role="status">
            {outcome.kind === "accepted"
              ? <p><b>Added.</b> Ramp is now 1 of 10 — next the coach looks for card draw that fits.</p>
              : <p><b>Skipped ({outcome.reason}).</b> The coach re-ranks the next suggestions with that in mind.</p>}
            <button type="button" onClick={() => { setOutcome(null); setAskingWhy(false); }}>Reset example</button>
          </div>
        ) : (
          <>
            <div className="guided-actions">
              <button type="button" className="guided-accept" onClick={() => setOutcome({ kind: "accepted" })}>Add to my deck</button>
              <button type="button" aria-expanded={askingWhy} onClick={() => setAskingWhy((open) => !open)}>Not this one</button>
            </div>
            {askingWhy && (
              <div className="guided-decline-reasons" role="group" aria-label="Why not this card? (example)">
                <small>WHY NOT? THE NEXT SUGGESTIONS WILL ADAPT</small>
                {EXAMPLE.declineReasons.map((reason) => (
                  <button type="button" key={reason} onClick={() => setOutcome({ kind: "declined", reason: reason.toLowerCase() })}>{reason}</button>
                ))}
              </div>
            )}
          </>
        )}
      </article>
    </section>
  );
}
