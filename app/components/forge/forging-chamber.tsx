"use client";

import { useEffect, useLayoutEffect } from "react";
import { cardArtCrop } from "../../card-art";
import {
  ForgeCeremonyMotion,
  FORGING_PHASES,
  FORGING_PHASE_RAIL_LABELS,
  FORGING_STAGES,
} from "./forge-ceremony";
import { useForgeSession } from "../../forge-session-context";

export function ForgingChamber() {
  const {
    stage,
    setStage,
    setForgingCeremonyMounted,
    selectedCommander,
    motionMode,
    revealOccupancyLabels,
    forgeElapsedSeconds,
    progress,
  } = useForgeSession();

  // The stage timer used to live in session state, which keeps running while
  // this chunk is still the Suspense fallback. Starting it here means the
  // ceremony opens on its first step. Narrative progress only: the real build
  // already started, and this timing must never become a second loading gate.
  useEffect(() => {
    if (stage >= FORGING_STAGES.length - 1) return;
    const timer = window.setTimeout(() => setStage((value) => value + 1), 1150);
    return () => window.clearTimeout(timer);
  }, [stage, setStage]);

  useLayoutEffect(() => {
    setForgingCeremonyMounted(true);
    return () => setForgingCeremonyMounted(false);
  }, [setForgingCeremonyMounted]);

  return (
    <section className="forging-ceremony" data-phase={stage + 1} aria-live="polite">
      {selectedCommander ? (
        <div
          className="ceremony-commander-emergence"
          style={{ backgroundImage: `url("${cardArtCrop(selectedCommander.name)}")` }}
          aria-hidden="true"
        />
      ) : null}
      <ForgeCeremonyMotion stage={stage} motionMode={motionMode} />
      <div className="ceremony-copy" data-phase={stage + 1}>
        <span className="forge-eyebrow">
          <i /> BUILDING YOUR DECK
        </span>
        <div className="ceremony-stage-copy" key={stage}>
          <h1>{FORGING_STAGES[stage][0]}</h1>
          <p>{FORGING_STAGES[stage][1]}</p>
        </div>
        {revealOccupancyLabels.length > 0 && (
          <p className="ceremony-occupancy">
            From this commander's card: {revealOccupancyLabels.join(" · ")}. The rest of the deck is still being built.
          </p>
        )}
        <div className="ceremony-phase">
          <small>STEP {stage + 1} OF {FORGING_STAGES.length}</small>
          <strong>
            {FORGING_STAGES[stage][2]}
            <time dateTime={`PT${forgeElapsedSeconds}S`}>
              {String(Math.floor(forgeElapsedSeconds / 60)).padStart(2, "0")}:
              {String(forgeElapsedSeconds % 60).padStart(2, "0")}
            </time>
          </strong>
        </div>
        <div className="ceremony-progress">
          <span>
            <b style={{ width: `${progress}%` }} />
          </span>
          <small>
            YOU CAN LEAVE THIS TAB OPEN — YOUR DECK WILL APPEAR HERE
          </small>
        </div>
      </div>
      <ol className="ceremony-phase-rail" aria-label="Forge build phases">
        {FORGING_PHASES.map((phase, index) => (
          <li key={phase} className={index < stage ? "is-complete" : index === stage ? "is-active" : ""}>
            <i>{index < stage ? "✓" : index + 1}</i>
            <span>
              {FORGING_PHASE_RAIL_LABELS[index].map((line, lineIndex) => (
                <em key={line}>{lineIndex > 0 ? <br /> : null}{line}</em>
              ))}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
