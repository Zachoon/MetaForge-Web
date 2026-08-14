"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

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
  "Blueprint",
  "Card pool",
  "Candidates",
  "Mana",
  "Integrity",
  "Tournament",
  "Masterwork",
] as const;

/** Short / two-line rail labels. Full words like TOURNAMENT+MASTERWORK collide
 *  when this rail is squeezed into the ceremony copy column. */
export const FORGING_PHASE_RAIL_LABELS = [
  ["Blueprint"],
  ["Card", "pool"],
  ["Builds"],
  ["Mana"],
  ["Check"],
  ["Field"],
  ["Seal"],
] as const;

export function ForgeProcessingLoader({ motionMode }: { motionMode: MotionMode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let disposed = false;
    let rive: {
      cleanup: () => void;
      resizeDrawingSurfaceToCanvas: () => void;
      viewModelInstance: { boolean: (name: string) => { value: boolean } | null } | null;
    } | null = null;
    let resizeObserver: ResizeObserver | null = null;

    void import("@rive-app/canvas").then(({ Alignment, Fit, Layout, Rive }) => {
      if (disposed) return;
      rive = new Rive({
        src: "/assets/forge/animations/metaforge-forging-loader.riv",
        canvas,
        stateMachines: "State Machine 1",
        autoBind: true,
        autoplay: true,
        layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
        onLoad: () => {
          if (disposed) return;
          rive?.resizeDrawingSurfaceToCanvas();
          const processing = rive?.viewModelInstance?.boolean("IsProcessing");
          if (processing) processing.value = motionMode === "full";
          setLoaded(true);
        },
      });
      resizeObserver = new ResizeObserver(() => rive?.resizeDrawingSurfaceToCanvas());
      resizeObserver.observe(canvas);
    });

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      rive?.cleanup();
    };
  }, [motionMode]);

  return (
    <div className={`forging-motion forging-motion--rive${loaded ? " is-loaded" : ""}`} aria-hidden="true">
      <canvas ref={canvasRef} />
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
