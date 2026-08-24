"use client";

import type { CSSProperties } from "react";

export type MotionMode = "full" | "quiet";

export const FORGING_STAGES = [
  ["Reading your choices", "Confirming your format, commander, goals, and preferences.", "SETUP"],
  ["Finding cards that fit", "Matching legal cards to the jobs your deck needs.", "CARD FIT"],
  ["Building complete options", "Creating several playable 100-card decks to compare.", "DECKS"],
  ["Balancing the mana", "Checking lands, color access, and when your spells can be cast.", "MANA"],
  ["Checking the whole deck", "Verifying legality, deck size, curve, and essential roles.", "VERIFY"],
  ["Comparing the strongest builds", "Measuring which complete deck best matches your goal.", "COMPARE"],
  ["Finishing your deck", "Preparing the list and your first coaching step.", "READY"],
] as const;

export const FORGING_PHASES = [
  "Setup",
  "Card pool",
  "Candidates",
  "Mana",
  "Integrity",
  "Tournament",
  "Deck",
] as const;

/** Short / two-line rail labels. Full words like TOURNAMENT+DECK collide
 *  when this rail is squeezed into the ceremony copy column. */
export const FORGING_PHASE_RAIL_LABELS = [
  ["Setup"],
  ["Card", "pool"],
  ["Builds"],
  ["Mana"],
  ["Check"],
  ["Field"],
  ["Seal"],
] as const;

// Plain CSS loader (static rune glyph, no canvas). Previously this rendered
// a Rive-authored animation (metaforge-forging-loader.riv)
// whose baked-in "Forge Processing Loop" timeline included a spark/ember
// burst at step transitions that Zach asked to have removed — that burst
// isn't a separate controllable layer (only one bindable boolean,
// "IsProcessing", is exposed), so the only way to guarantee it's gone is to
// drop the Rive canvas entirely rather than try to suppress just that layer.
export function ForgeProcessingLoader({ motionMode: _motionMode }: { motionMode: MotionMode }) {
  // .forging-motion b/span (the orbit rings) are unconditionally hidden by
  // the SS2 "no expanding ceremony ring" rule in site-frame.css, so this
  // renders only the rune glyph.
  return (
    <div className="forging-motion" aria-hidden="true">
      <i>ᛟ</i>
    </div>
  );
}

export function ForgeCeremonyMotion({ stage, motionMode }: { stage: number; motionMode: MotionMode }) {
  return (
    <div
      className={`forge-process-focus${motionMode === "quiet" ? " is-quiet" : ""}`}
      data-phase={stage + 1}
      style={{ "--forge-progress": `${((stage + 1) / FORGING_STAGES.length) * 100}%` } as CSSProperties}
      aria-hidden="true"
    >
      <div className="forge-card-pipeline">
        {FORGING_PHASES.map((phase, index) => (
          <i key={phase} style={{ "--pipeline-index": index } as CSSProperties}>
            <b>MF</b><span /><em />
          </i>
        ))}
      </div>
      <span className="forge-process-core"><i>MF</i><b /></span>
      <div className="forge-process-materials">
        {FORGING_PHASES.map((phase, index) => (
          <i key={phase} className={index < stage ? "is-complete" : index === stage ? "is-active" : ""} />
        ))}
      </div>
      <small>STRUCTURAL PASS {stage + 1} OF {FORGING_STAGES.length}</small>
    </div>
  );
}
