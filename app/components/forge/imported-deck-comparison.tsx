import { cardImage } from "../../card-art";

type DeckRow = { name: string; quantity: number; roles?: string[] };
type Swap = { cut: string; add: string; reason: string; confident?: boolean };

const key = (value = "") => value.trim().toLocaleLowerCase("en");

function quantities(rows: DeckRow[]) {
  return new Map(rows.map((row) => [key(row.name), Number(row.quantity || 0)]));
}

function changedNames(left: DeckRow[], right: DeckRow[]) {
  const rightQuantities = quantities(right);
  return new Set(left.filter((row) => row.quantity > (rightQuantities.get(key(row.name)) || 0)).map((row) => key(row.name)));
}

function DeckColumn({ title, eyebrow, rows, changed, tone }: { title: string; eyebrow: string; rows: DeckRow[]; changed: Set<string>; tone: "cut" | "add" }) {
  return (
    <section className={`revision-deck-column is-${tone}`} aria-label={title}>
      <header><small>{eyebrow}</small><h2>{title}</h2><span>{rows.reduce((sum, row) => sum + row.quantity, 0)} cards</span></header>
      <div className="revision-deck-scroll">
        {rows.map((row) => (
          <div key={row.name} className={changed.has(key(row.name)) ? "revision-deck-row is-changed" : "revision-deck-row"}>
            <b>{row.quantity}</b><span>{row.name}</span>{changed.has(key(row.name)) && <em>{tone === "cut" ? "OUT" : "IN"}</em>}
          </div>
        ))}
      </div>
    </section>
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
  adjustments: string[];
  strategyTitle: string;
  strategySummary: string;
  coreSummary: string;
  occupancyEngines?: string[];
}) {
  const removed = changedNames(originalRows, proposedRows);
  const added = changedNames(proposedRows, originalRows);
  return (
    <section className="imported-revision-comparison" aria-labelledby="revision-comparison-title">
      <header className="revision-comparison-heading">
        <div><small>INITIAL FORGE COMPARISON</small><h1 id="revision-comparison-title">Your list, beside the Forge revision.</h1></div>
        <p>Red marks cards leaving the submitted list. Green marks cards entering the proposed revision. Everything unmarked is retained.</p>
      </header>
      <div className="revision-comparison-grid">
        <DeckColumn title="Your submitted list" eyebrow="BEFORE" rows={originalRows} changed={removed} tone="cut" />
        <section className="swap-station" aria-label="Swap station and strategy read">
          <header><small>RECOMMENDATION CENTER</small><h2>Swap station</h2><p>Each recommendation preserves deck size and the plan’s required structural floors.</p></header>
          <div className="swap-station-list">
            {swaps.length ? swaps.map((swap) => (
              <article key={`${swap.cut}-${swap.add}`} className={swap.confident === false ? "is-speculative" : ""}>
                <div className="swap-card is-cut"><img src={cardImage(swap.cut)} alt="" /><span><small>REMOVE</small><b>{swap.cut}</b></span></div>
                <div className="swap-reason"><i>→</i><p>{swap.reason}</p>{swap.confident === false && <em>Consider, don’t apply yet</em>}</div>
                <div className="swap-card is-add"><img src={cardImage(swap.add)} alt="" /><span><small>ADD</small><b>{swap.add}</b></span></div>
              </article>
            )) : (
              <div className="swap-station-empty"><b>No confident swap cleared every gate.</b><p>The Forge retained the submitted list rather than manufacturing a recommendation.</p></div>
            )}
          </div>
          {adjustments.length > 0 && (
            <aside className="revision-adjustments">
              <b>List completion adjustments</b>
              {adjustments.map((adjustment) => <p key={adjustment}>{adjustment}</p>)}
            </aside>
          )}
          <footer className="strategy-read">
            <small>WHAT THE FORGE READ</small><h3>{strategyTitle}</h3><p>{strategySummary}</p>
            <div><b>Core to retain</b><span>{coreSummary}</span></div>
            {occupancyEngines.length > 0 && (
              <div><b>Occupancy</b><span>{occupancyEngines.join(" · ")}</span></div>
            )}
          </footer>
        </section>
        <DeckColumn title="Forge proposed revision" eyebrow="AFTER" rows={proposedRows} changed={added} tone="add" />
      </div>
      <footer className="revision-comparison-boundary">A proposed revision is a controlled test, not proof of improved match performance. Your original list remains preserved.</footer>
    </section>
  );
}
