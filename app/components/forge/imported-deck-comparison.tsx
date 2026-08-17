"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cardImage } from "../../card-art";

type DeckRow = { name: string; quantity: number; roles?: string[] };
type Swap = { cut: string; add: string; reason: string; confident?: boolean };
type Adjustment = { name: string; kind: "added" | "trimmed"; cut?: number; reason: string };
type HoverPreview = { name: string; x: number; y: number };
type HoverBind = (name: string) => {
  onMouseEnter: (event: React.MouseEvent) => void;
  onMouseMove: (event: React.MouseEvent) => void;
  onMouseLeave: () => void;
};
type StageSlide =
  | { kind: "plan" }
  | { kind: "swap"; swap: Swap; cutWasForgeAdded: boolean }
  | { kind: "adjustment"; adjustment: Adjustment };

const key = (value = "") => value.trim().toLocaleLowerCase("en");
const PREVIEW_WIDTH = 220;
const PREVIEW_MARGIN = 18;

// A double-faced/flip/split card can be written by its front face alone on
// one side of this diff (whatever the player pasted) and by its full Oracle
// "Front // Back" name on the other (whatever the Forge's own deck text
// renders) - same physical card, never a real swap. Match on the front face
// so a pure naming difference can't masquerade as a change. This is a no-op
// for every ordinary single-faced card, whose name has no "//" to split.
const frontFace = (value = "") => value.split(/\s*\/\/\s*/)[0].trim();
const matchKey = (value = "") => key(frontFace(value));

function quantities(rows: DeckRow[]) {
  return new Map(rows.map((row) => [matchKey(row.name), Number(row.quantity || 0)]));
}

function changedNames(left: DeckRow[], right: DeckRow[]) {
  const rightQuantities = quantities(right);
  return new Set(left.filter((row) => row.quantity > (rightQuantities.get(matchKey(row.name)) || 0)).map((row) => key(row.name)));
}

/**
 * Shared hover-preview state for every card name in this comparison view.
 * A portal to document.body (not a popup positioned relative to its row)
 * because .revision-deck-scroll clips overflow - anything absolutely
 * positioned inside it would get cut off near the top/edges of the list.
 */
function useCardHoverPreview() {
  const [preview, setPreview] = useState<HoverPreview | null>(null);
  const frame = useRef<number | null>(null);

  const move = useCallback((name: string, event: { clientX: number; clientY: number }) => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    const { clientX, clientY } = event;
    frame.current = requestAnimationFrame(() => {
      const maxX = (typeof window !== "undefined" ? window.innerWidth : 1200) - PREVIEW_WIDTH - PREVIEW_MARGIN;
      const x = Math.min(clientX + PREVIEW_MARGIN, Math.max(PREVIEW_MARGIN, maxX));
      const y = clientY + PREVIEW_MARGIN;
      setPreview({ name, x, y });
    });
  }, []);
  const hide = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    setPreview(null);
  }, []);

  const bind = useCallback((name: string) => ({
    onMouseEnter: (event: React.MouseEvent) => move(name, event),
    onMouseMove: (event: React.MouseEvent) => move(name, event),
    onMouseLeave: hide,
  }), [move, hide]);

  const portal = useMemo(() => {
    if (!preview || typeof document === "undefined") return null;
    return createPortal(
      <div className="card-hover-preview" style={{ left: preview.x, top: preview.y }} aria-hidden="true">
        <img src={cardImage(preview.name)} alt="" />
      </div>,
      document.body,
    );
  }, [preview]);

  return { bind, portal };
}

/**
 * A pillar at the edge of the stage: only the cards actually changing
 * appear here (everything retained is deliberately left out - the stage
 * in the middle is where the reasoning lives). Rows tied to a swap the
 * stage can display are clickable, jumping the stage straight to that swap.
 */
function DeckColumn({
  title,
  eyebrow,
  rows,
  changed,
  tone,
  bindHover,
  jumpable,
  onJump,
}: {
  title: string;
  eyebrow: string;
  rows: DeckRow[];
  changed: Set<string>;
  tone: "cut" | "add";
  bindHover: HoverBind;
  jumpable: Map<string, number>;
  onJump: (name: string) => void;
}) {
  const changedRows = rows.filter((row) => changed.has(key(row.name)));
  const totalCount = rows.reduce((sum, row) => sum + row.quantity, 0);
  return (
    <section className={`revision-deck-column is-${tone}`} aria-label={title}>
      <header>
        <small>{eyebrow}</small>
        <h2>{title}</h2>
        <span>{changedRows.length} of {totalCount} cards {tone === "cut" ? "leaving" : "entering"}</span>
      </header>
      <div className="revision-deck-scroll">
        {changedRows.length ? changedRows.map((row) => {
          const canJump = jumpable.has(key(row.name));
          return (
            <div
              key={row.name}
              className={canJump ? "revision-deck-row is-changed is-jumpable" : "revision-deck-row is-changed"}
              role={canJump ? "button" : undefined}
              tabIndex={canJump ? 0 : undefined}
              onClick={canJump ? () => onJump(row.name) : undefined}
              onKeyDown={canJump ? (event) => {
                if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onJump(row.name); }
              } : undefined}
            >
              <b>{row.quantity}</b><span {...bindHover(row.name)}>{row.name}</span><em>{tone === "cut" ? "OUT" : "IN"}</em>
            </div>
          );
        }) : (
          <p className="revision-deck-empty">Nothing {tone === "cut" ? "leaves" : "enters"} the list.</p>
        )}
      </div>
    </section>
  );
}

/** One stage slide: a single swap, cards enlarged and centered on the reason between them. */
function SwapSlide({
  swap,
  cutWasForgeAdded,
  bindHover,
}: {
  swap: Swap;
  cutWasForgeAdded: boolean;
  bindHover: HoverBind;
}) {
  return (
    <article className={swap.confident === false ? "stage-swap is-speculative" : "stage-swap"}>
      <figure className="stage-card is-cut">
        <img src={cardImage(swap.cut)} alt="" />
        <figcaption>
          <small>REMOVE</small>
          <b {...bindHover(swap.cut)}>{swap.cut}</b>
          {cutWasForgeAdded && <em className="stage-card-note">Added to complete your list — not one of your submitted cards</em>}
        </figcaption>
      </figure>
      <div className="stage-reason">
        <i>→</i>
        <p>{swap.reason}</p>
        {swap.confident === false && <em>Consider, don’t apply yet</em>}
      </div>
      <figure className="stage-card is-add">
        <img src={cardImage(swap.add)} alt="" />
        <figcaption>
          <small>ADD</small>
          <b {...bindHover(swap.add)}>{swap.add}</b>
        </figcaption>
      </figure>
    </article>
  );
}

/** One stage slide: a single list-completion change, one card, one real (if mechanical) reason. */
function AdjustmentSlide({
  adjustment,
  bindHover,
}: {
  adjustment: Adjustment;
  bindHover: HoverBind;
}) {
  const tone = adjustment.kind === "added" ? "add" : "cut";
  return (
    <article className={`stage-adjustment is-${tone}`}>
      <figure className={`stage-card is-${tone}`}>
        <img src={cardImage(adjustment.name)} alt="" />
        <figcaption>
          <small>{adjustment.kind === "added" ? "ADD" : "TRIM"}</small>
          <b {...bindHover(adjustment.name)}>{adjustment.name}</b>
        </figcaption>
      </figure>
      <div className="stage-reason">
        <i>{adjustment.kind === "added" ? "+" : "−"}</i>
        <p>{adjustment.reason}</p>
      </div>
    </article>
  );
}

/** First stage slide: what the Forge read, what it implemented, and why — the orientation before stepping through each individual change. */
function PlanSlide({
  strategyTitle,
  strategySummary,
  coreSummary,
  occupancyEngines,
  swapsCount,
  adjustmentsCount,
  showEmptyNotice,
}: {
  strategyTitle: string;
  strategySummary: string;
  coreSummary: string;
  occupancyEngines: string[];
  swapsCount: number;
  adjustmentsCount: number;
  showEmptyNotice: boolean;
}) {
  const totalChanges = swapsCount + adjustmentsCount;
  return (
    <article className="stage-plan">
      {showEmptyNotice && (
        <div className="swap-station-empty">
          <b>No confident swap cleared every gate.</b>
          <p>The Forge retained the submitted list rather than manufacturing a recommendation.</p>
        </div>
      )}
      <header>
        <small>WHAT THE FORGE READ</small>
        <h3>{strategyTitle}</h3>
        <p>{strategySummary}</p>
      </header>
      <div className="stage-plan-facts">
        <div><b>Core to retain</b><span>{coreSummary}</span></div>
        {occupancyEngines.length > 0 && (
          <div><b>Occupancy</b><span>{occupancyEngines.join(" · ")}</span></div>
        )}
      </div>
      {totalChanges > 0 && (
        <aside className="revision-adjustments">
          <b>List completion adjustments</b>
          <p>
            {totalChanges} card{totalChanges === 1 ? "" : "s"} change{totalChanges === 1 ? "s" : ""} in this revision
            {swapsCount > 0 && adjustmentsCount > 0 && ` — ${swapsCount} tested swap${swapsCount === 1 ? "" : "s"} with a measured reason, ${adjustmentsCount} list-completion adjustment${adjustmentsCount === 1 ? "" : "s"}`}
            {swapsCount > 0 && !adjustmentsCount && ` — ${swapsCount} tested swap${swapsCount === 1 ? "" : "s"} with a measured reason`}
            {!swapsCount && adjustmentsCount > 0 && ` to complete the submitted list to a legal size`}
            . Step forward to see each one.
          </p>
        </aside>
      )}
    </article>
  );
}

export function ImportedDeckComparison({
  originalRows,
  proposedRows,
  swaps,
  adjustments,
  strategyTitle,
  strategySummary,
  coreSummary,
  occupancyEngines = [],
}: {
  originalRows: DeckRow[];
  proposedRows: DeckRow[];
  swaps: Swap[];
  adjustments: Adjustment[];
  strategyTitle: string;
  strategySummary: string;
  coreSummary: string;
  occupancyEngines?: string[];
}) {
  const removed = changedNames(originalRows, proposedRows);
  const added = changedNames(proposedRows, originalRows);
  // The one-slot lab tests swaps against the Forge-completed list, not the
  // player's raw submission - its "cut" target can be a card the Forge
  // itself added while filling the list out (never in originalRows), which
  // can never show as OUT in the BEFORE column (there's no row for it to
  // decrease from). Both panels were individually correct but looked
  // contradictory with nothing explaining why. Flagging that case here so
  // the swap card itself says so, instead of leaving it to look like a
  // mismatch between the two panels.
  const originalKeys = new Set(originalRows.map((row) => key(row.name)));
  const { bind: bindHover, portal: hoverPortal } = useCardHoverPreview();

  const hasSwaps = swaps.length > 0;
  // The plan comes first — orientation before detail — then every reasoned
  // lab swap, then every mechanical list-completion adjustment, each its
  // own step instead of a bundled dump.
  const slides: StageSlide[] = [
    { kind: "plan" },
    ...swaps.map((swap): StageSlide => ({ kind: "swap", swap, cutWasForgeAdded: !originalKeys.has(key(swap.cut)) })),
    ...adjustments.map((adjustment): StageSlide => ({ kind: "adjustment", adjustment })),
  ];

  const swapIndexByCard = useMemo(() => {
    const map = new Map<string, number>();
    swaps.forEach((swap, index) => {
      map.set(key(swap.cut), index + 1);
      map.set(key(swap.add), index + 1);
    });
    adjustments.forEach((adjustment, index) => {
      map.set(key(adjustment.name), 1 + swaps.length + index);
    });
    return map;
  }, [swaps, adjustments]);

  const [activeIndex, setActiveIndex] = useState(0);
  const clampedIndex = Math.min(activeIndex, slides.length - 1);
  const activeSlide = slides[clampedIndex];

  const goTo = useCallback((index: number) => {
    setActiveIndex(Math.max(0, Math.min(slides.length - 1, index)));
  }, [slides.length]);
  const goPrev = useCallback(() => goTo(clampedIndex - 1), [goTo, clampedIndex]);
  const goNext = useCallback(() => goTo(clampedIndex + 1), [goTo, clampedIndex]);
  const jumpToCard = useCallback((name: string) => {
    const index = swapIndexByCard.get(key(name));
    if (index !== undefined) goTo(index);
  }, [swapIndexByCard, goTo]);

  const labelFor = useCallback((slide: StageSlide, index: number) => {
    if (slide.kind === "plan") return "Commander plan";
    if (slide.kind === "swap") {
      const swapNumber = swaps.findIndex((swap) => swap === slide.swap) + 1;
      return `Swap ${swapNumber} of ${swaps.length}`;
    }
    const adjustmentNumber = adjustments.findIndex((adjustment) => adjustment === slide.adjustment) + 1;
    return `Change ${adjustmentNumber} of ${adjustments.length}`;
  }, [swaps, adjustments]);

  return (
    <section className="imported-revision-comparison" aria-labelledby="revision-comparison-title">
      <header className="revision-comparison-heading">
        <div><small>INITIAL FORGE COMPARISON</small><h1 id="revision-comparison-title">Your list, beside the Forge revision.</h1></div>
        <p>Red marks cards leaving the submitted list. Green marks cards entering the proposed revision. Everything unmarked is retained. The pillars below only show what’s changing — step through the stage to see why.</p>
      </header>
      <div className="revision-comparison-grid">
        <DeckColumn title="Your submitted list" eyebrow="BEFORE" rows={originalRows} changed={removed} tone="cut" bindHover={bindHover} jumpable={swapIndexByCard} onJump={jumpToCard} />
        <section className="swap-station" aria-label="Swap station and strategy read">
          <header><small>RECOMMENDATION CENTER</small><h2>Swap station</h2><p>Each recommendation preserves deck size and the plan’s required structural floors.</p></header>
          <div className="swap-stage">
            {slides.length > 1 && (
              <button type="button" className="stage-arrow is-prev" onClick={goPrev} disabled={clampedIndex === 0} aria-label="Previous step">‹</button>
            )}
            <div
              className="stage-frame"
              tabIndex={0}
              onKeyDown={(event) => {
                if (slides.length <= 1) return;
                if (event.key === "ArrowLeft") goPrev();
                if (event.key === "ArrowRight") goNext();
              }}
            >
              {activeSlide.kind === "swap" ? (
                <SwapSlide swap={activeSlide.swap} cutWasForgeAdded={activeSlide.cutWasForgeAdded} bindHover={bindHover} />
              ) : activeSlide.kind === "adjustment" ? (
                <AdjustmentSlide adjustment={activeSlide.adjustment} bindHover={bindHover} />
              ) : (
                <PlanSlide
                  strategyTitle={strategyTitle}
                  strategySummary={strategySummary}
                  coreSummary={coreSummary}
                  occupancyEngines={occupancyEngines}
                  swapsCount={swaps.length}
                  adjustmentsCount={adjustments.length}
                  showEmptyNotice={!hasSwaps}
                />
              )}
            </div>
            {slides.length > 1 && (
              <button type="button" className="stage-arrow is-next" onClick={goNext} disabled={clampedIndex === slides.length - 1} aria-label="Next step">›</button>
            )}
          </div>
          {slides.length > 1 && (
            <div className="stage-progress" role="tablist" aria-label="Swap steps">
              {slides.map((slide, index) => (
                <button
                  key={index}
                  type="button"
                  role="tab"
                  aria-selected={index === clampedIndex}
                  aria-label={labelFor(slide, index)}
                  className={index === clampedIndex ? "stage-dot is-active" : "stage-dot"}
                  onClick={() => goTo(index)}
                />
              ))}
            </div>
          )}
          <p className="stage-step-label">{labelFor(activeSlide, clampedIndex)}</p>
        </section>
        <DeckColumn title="Forge proposed revision" eyebrow="AFTER" rows={proposedRows} changed={added} tone="add" bindHover={bindHover} jumpable={swapIndexByCard} onJump={jumpToCard} />
      </div>
      <footer className="revision-comparison-boundary">A proposed revision is a controlled test, not proof of improved match performance. Your original list remains preserved.</footer>
      {hoverPortal}
    </section>
  );
}
