"use client";

import { useEffect, useMemo, useState } from "react";

// A first-time guided tour: the gap identified directly from player
// feedback was the jump from "two buttons" to "a form" to "the Forge is
// working" straight into a dense, four-chapter Testing Anvil with no
// explanation of what any of it is. Live-spotlights real elements on the
// Entrance and Blueprint screens (the only ones that exist before a
// generation is even requested), then closes with an informational,
// non-spotlighted step describing the four chapters that come after —
// since those elements don't exist yet and forcing a real generation
// just to tour them would be far more disruptive than describing them.

export type WalkthroughChamber = "entrance" | "commission";

type WalkthroughStep = {
  id: string;
  title: string;
  body: string;
  targetSelector?: string;
  mobileTargetSelector?: string;
  requiredChamber?: WalkthroughChamber;
};

const STEPS: WalkthroughStep[] = [
  {
    id: "welcome",
    title: "Welcome to the Forge",
    body: "A quick tour before you start — four short stops, skip anytime. The Forge builds real, evidence-backed decks; this just shows you where things live.",
  },
  {
    id: "entrance-choices",
    title: "Two ways to begin",
    body: "Forge a new deck starts from a blank blueprint. Refine a current build brings a decklist you already have to the anvil for real testing and evidence-led suggestions.",
    targetSelector: ".entrance-actions",
    requiredChamber: "entrance",
  },
  {
    id: "blueprint-marks",
    title: "Real constraints, not decoration",
    body: "Format, strategy, complexity, and budget all actually shape construction — including the price cap and power-tier options. Nothing here is cosmetic; every mark changes what gets built.",
    targetSelector: ".mark-grid",
    mobileTargetSelector: ".mark-grid > label:first-child",
    requiredChamber: "commission",
  },
  {
    id: "blueprint-note",
    title: "Tell the Forge the one thing it must know",
    body: "A favorite card, a play pattern you love, or something this deck must never become — plain language the Forge reads directly into construction.",
    targetSelector: ".commission-note",
    mobileTargetSelector: ".commission-note textarea",
    requiredChamber: "commission",
  },
  {
    id: "after-forging",
    title: "What happens after you forge",
    body: "You'll land on the Testing Anvil: Chapter 1 is the finished Masterwork itself, Chapter 2 lets you test a real card swap, Chapter 3 explains the essentials in plain language, and Chapter 4 — Deep Forge — holds every deeper number if you want it. Nothing there is required reading; the deck works either way.",
  },
];

const STORAGE_KEY = "metaforge-walkthrough-seen";

export function hasSeenWalkthrough(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    // Private browsing / storage disabled — treat as unseen every visit
    // rather than throwing; the tour is a convenience, not a requirement.
    return false;
  }
}

function markWalkthroughSeen() {
  try {
    window.localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    /* Nothing to persist to; the tour just won't remember next visit. */
  }
}

export function ForgeWalkthrough({
  active,
  chamber,
  setChamber,
  onClose,
}: {
  active: boolean;
  chamber: string;
  setChamber: (chamber: WalkthroughChamber) => void;
  onClose: () => void;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [mobileLayout, setMobileLayout] = useState(false);
  const step = STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === STEPS.length - 1;

  useEffect(() => {
    const query = window.matchMedia("(max-width: 700px)");
    const update = () => setMobileLayout(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  // Drives the underlying app to whichever chamber this step's target
  // actually lives in — the tour moves the player through the real flow
  // rather than asking them to navigate there themselves mid-tour.
  useEffect(() => {
    if (!active) return;
    if (step.requiredChamber && step.requiredChamber !== chamber) {
      setChamber(step.requiredChamber);
    }
  }, [active, step, chamber, setChamber]);

  useEffect(() => {
    if (!active) return;
    const targetSelector = mobileLayout && step.mobileTargetSelector
      ? step.mobileTargetSelector
      : step.targetSelector;
    if (!targetSelector) {
      setRect(null);
      return;
    }
    let positionedTarget = false;
    let positionTimer: number | undefined;
    const measure = () => {
      const el = document.querySelector(targetSelector);
      if (el && mobileLayout && !positionedTarget) {
        positionedTarget = true;
        positionTimer = window.setTimeout(() => {
          el.scrollIntoView({ behavior: "auto", block: "center", inline: "nearest" });
        }, 60);
      }
      setRect(el ? el.getBoundingClientRect() : null);
    };
    // Polls on an interval rather than requestAnimationFrame: rAF only
    // fires on an actual compositor paint, which real background/inactive
    // tabs throttle hard and some automated/headless browser contexts
    // never fire at all — confirmed live (0 callbacks in 1s) while
    // building this. setInterval has no such dependency. The chamber
    // switch above can take a render or two to mount the target element,
    // and layout can shift under this app's own motion effects, so a
    // single one-shot measurement risks spotlighting an empty rect the
    // moment a step activates — measured immediately, then re-checked
    // every 150ms for the rest of the step.
    measure();
    const interval = window.setInterval(measure, 150);
    window.addEventListener("resize", measure);
    return () => {
      if (positionTimer !== undefined) window.clearTimeout(positionTimer);
      window.clearInterval(interval);
      window.removeEventListener("resize", measure);
    };
  }, [active, step, mobileLayout]);

  const tooltipStyle = useMemo(() => {
    if (!rect || mobileLayout) return undefined;
    const preferBelow = rect.bottom + 220 < window.innerHeight;
    return {
      top: preferBelow ? rect.bottom + 16 : Math.max(16, rect.top - 220),
      left: Math.min(Math.max(16, rect.left), window.innerWidth - 380),
    };
  }, [rect, mobileLayout]);

  if (!active) return null;

  function goNext() {
    if (isLast) {
      markWalkthroughSeen();
      onClose();
      return;
    }
    setStepIndex((current) => Math.min(current + 1, STEPS.length - 1));
  }
  function goBack() {
    setStepIndex((current) => Math.max(current - 1, 0));
  }
  function skip() {
    markWalkthroughSeen();
    onClose();
  }

  return (
    <div
      className="forge-walkthrough-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`Guided tour: ${step.title}`}
      onKeyDown={(event) => {
        if (event.key === "Escape") skip();
        if (event.key === "Enter") goNext();
      }}
    >
      {rect ? (
        <div
          className="forge-walkthrough-spotlight"
          style={{
            top: rect.top - 8,
            left: rect.left - 8,
            width: rect.width + 16,
            height: rect.height + 16,
          }}
        />
      ) : (
        <div className="forge-walkthrough-dim" />
      )}
      <div
        className="forge-walkthrough-tooltip"
        style={tooltipStyle}
        data-centered={!rect}
      >
        <small>
          STEP {stepIndex + 1} OF {STEPS.length}
        </small>
        <h3>{step.title}</h3>
        <p>{step.body}</p>
        <div className="forge-walkthrough-actions">
          <button type="button" className="forge-walkthrough-skip" onClick={skip}>
            Skip tour
          </button>
          <div>
            {!isFirst && (
              <button type="button" onClick={goBack}>
                Back
              </button>
            )}
            <button type="button" className="forge-walkthrough-next" onClick={goNext}>
              {isLast ? "Done" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
