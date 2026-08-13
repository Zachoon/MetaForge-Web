"use client";

export type WorkbenchMode = "deck" | "tune" | "test";

type Revision = {
  note?: string;
  createdAt?: string;
  recommendationRecord?: unknown;
};

type LivingWorkbenchProps = {
  mode: WorkbenchMode;
  onModeChange: (mode: WorkbenchMode) => void;
  deckName: string;
  deckSubtitle: string;
  cardCount: number;
  revisionCount: number;
  revisions: Revision[];
  coachHeadline: string;
  coachFocus: string;
  activeTest: boolean;
  hasSuggestion: boolean;
  onPrimaryAction: () => void;
};

const MODE_COPY: Record<WorkbenchMode, { label: string; eyebrow: string; description: string }> = {
  deck: { label: "Deck", eyebrow: "SEE THE BUILD", description: "Cards, roles, curve, and structure" },
  tune: { label: "Tune", eyebrow: "MAKE ONE CHANGE", description: "Coach-guided refinement" },
  test: { label: "Test", eyebrow: "LEARN FROM PLAY", description: "Experiments and match evidence" },
};

export function LivingWorkbench({
  mode,
  onModeChange,
  deckName,
  deckSubtitle,
  cardCount,
  revisionCount,
  revisions,
  coachHeadline,
  coachFocus,
  activeTest,
  hasSuggestion,
  onPrimaryAction,
}: LivingWorkbenchProps) {
  const primaryLabel = activeTest
    ? "Continue active test →"
    : mode === "deck"
      ? "Open the deck →"
      : mode === "tune"
        ? hasSuggestion ? "Review suggested change →" : "Ask the coach →"
        : "Prepare my next game →";
  const timeline = [
    { label: "Forged", detail: `${cardCount} cards`, complete: true },
    ...revisions.slice(-3).map((revision, index) => ({
      label: `Revision ${Math.max(1, revisionCount - Math.min(2, revisions.length - index - 1))}`,
      detail: revision.note || (revision.recommendationRecord ? "Coach change" : "Player change"),
      complete: true,
    })),
    { label: activeTest ? "Testing" : "Next test", detail: activeTest ? "Evidence in progress" : "Ready when you are", complete: activeTest },
  ];

  return (
    <section className={`living-workbench mode-${mode}`} aria-label="Living Workbench">
      <header className="living-workbench-command">
        <div>
          <small>THE LIVING WORKBENCH</small>
          <strong>{deckName}</strong>
          <span>{deckSubtitle}</span>
        </div>
        <dl aria-label="Deck status">
          <div><dt>Cards</dt><dd>{cardCount}</dd></div>
          <div><dt>Revision</dt><dd>{Math.max(1, revisionCount)}</dd></div>
          <div><dt>Status</dt><dd>{activeTest ? "Testing" : "Ready"}</dd></div>
        </dl>
      </header>

      <nav id="forge-chapter-rail" className="living-workbench-modes" aria-label="Workbench modes">
        {(Object.keys(MODE_COPY) as WorkbenchMode[]).map((item) => (
          <button
            type="button"
            key={item}
            className={mode === item ? "active" : ""}
            aria-current={mode === item ? "page" : undefined}
            onClick={() => onModeChange(item)}
          >
            <small>{MODE_COPY[item].eyebrow}</small>
            <strong>{MODE_COPY[item].label}</strong>
            <span>{MODE_COPY[item].description}</span>
          </button>
        ))}
      </nav>

      <div className="living-workbench-focus">
        <span><small>COACH FOCUS</small><strong>{coachHeadline}</strong></span>
        <p>{coachFocus}</p>
        <button type="button" onClick={onPrimaryAction}>{primaryLabel}</button>
      </div>

      <ol className="living-workbench-timeline" aria-label="Deck revision history">
        {timeline.map((event, index) => (
          <li key={`${event.label}-${index}`} className={event.complete ? "complete" : "next"}>
            <i>{event.complete ? "✓" : index + 1}</i>
            <span><strong>{event.label}</strong><small>{event.detail}</small></span>
          </li>
        ))}
      </ol>
    </section>
  );
}
