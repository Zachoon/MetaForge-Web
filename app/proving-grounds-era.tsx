"use client";

type CheckIn = {
  issue: "yes" | "no" | null;
  handled: "better" | "same" | "unsure" | null;
};

type Evidence = {
  id: string;
  signal?: string | null;
  opponent?: string | null;
  result?: string | null;
};

export function ProvingGroundsEra({
  revision,
  title,
  question,
  watchFor,
  boundary,
  active,
  read,
  checkIn,
  evidence,
  supporting,
  contradicting,
  canBegin,
  onBegin,
  onIssue,
  onHandled,
  onFinish,
  onRerun,
  onOpenHistory,
}: {
  revision: number;
  title: string;
  question: string;
  watchFor: string;
  boundary: string;
  active: boolean;
  read: { headline: string; guidance: string } | null;
  checkIn: CheckIn;
  evidence: Evidence[];
  supporting: number;
  contradicting: number;
  canBegin: boolean;
  onBegin: () => void;
  onIssue: (issue: "yes" | "no") => void;
  onHandled: (handled: "better" | "same" | "unsure") => void;
  onFinish: (overall: "better" | "about the same" | "worse") => void;
  onRerun: () => void;
  onOpenHistory: () => void;
}) {
  const useful = supporting + contradicting;
  const phase = read ? 3 : active ? 2 : 1;
  const verdict = useful === 0
    ? "Awaiting the first useful game"
    : supporting === contradicting
      ? "Evidence is mixed"
      : supporting > contradicting && supporting >= 2
        ? "A repeat signal is emerging"
        : supporting > contradicting
          ? "An early clue is forming"
          : "The current idea needs pressure-testing";

  return (
    <section className={`proving-grounds proving-era phase-${phase}`} aria-labelledby="proving-era-title">
      <header className="proving-era-masthead">
        <div><small>ERA VI · THE PROVING GROUNDS</small><h2 id="proving-era-title">Turn play into proof.</h2></div>
        <span><i aria-hidden="true" /> REVISION {revision} · LIVE TRIAL</span>
      </header>

      <nav className="trial-route" aria-label="Trial progress">
        {["Brief", "Play", "Debrief", "Evidence"].map((label, index) => (
          <span key={label} className={index + 1 < phase ? "complete" : index + 1 === phase ? "active" : ""}>
            <i>{index + 1 < phase ? "✓" : index + 1}</i><b>{label}</b>
          </span>
        ))}
      </nav>

      <div className="trial-stage">
        <article className="trial-brief">
          <small>THE QUESTION UNDER FIRE</small>
          <h3>{question}</h3>
          <dl>
            <div><dt>Watch for</dt><dd>{watchFor}</dd></div>
            <div><dt>Why this trial</dt><dd>{title}</dd></div>
          </dl>
          <aside>{boundary}</aside>
          {!active && !read && <button type="button" disabled={!canBegin} onClick={onBegin}>Carry this question into a game <span>→</span></button>}
        </article>

        <aside className="evidence-forge" aria-label="Evidence from this revision">
          <header><small>REVISION EVIDENCE</small><strong>{useful}</strong><span>useful game{useful === 1 ? "" : "s"}</span></header>
          <div className="evidence-orbit" aria-hidden="true">
            <i className="orbit-core">{revision}</i>
            {Array.from({ length: Math.min(8, Math.max(3, useful)) }).map((_, index) => (
              <i key={index} className={`orbit-mark ${index < supporting ? "supports" : index < useful ? "questions" : "empty"}`} style={{ "--mark": index } as React.CSSProperties} />
            ))}
          </div>
          <div className="evidence-balance"><span><b>{supporting}</b> supports</span><span><b>{contradicting}</b> questions</span></div>
          <p>{verdict}</p>
          <button type="button" onClick={onOpenHistory}>Inspect the evidence ledger →</button>
        </aside>
      </div>

      {active && !read && (
        <article className="trial-debrief" aria-live="polite">
          <header><span><small>AFTER THE GAME</small><h3>Three taps. Keep the memory fresh.</h3></span><em>{checkIn.issue ? checkIn.handled ? "3 / 3" : "2 / 3" : "1 / 3"}</em></header>
          {!checkIn.issue ? <div><b>Did the issue appear?</b><button onClick={() => onIssue("yes")}>Yes, I noticed it</button><button onClick={() => onIssue("no")}>No, it did not</button></div>
            : !checkIn.handled ? <div><b>How did the deck handle that moment?</b><button onClick={() => onHandled("better")}>Better than before</button><button onClick={() => onHandled("same")}>About the same</button><button onClick={() => onHandled("unsure")}>I’m not sure</button></div>
              : <div><b>How did the deck feel overall?</b><button onClick={() => onFinish("better")}>Better</button><button onClick={() => onFinish("about the same")}>About the same</button><button onClick={() => onFinish("worse")}>Worse</button></div>}
        </article>
      )}

      {read && (
        <article className="trial-verdict" aria-live="polite">
          <div className="verdict-seal" aria-hidden="true">VI</div>
          <div><small>IMMEDIATE COACHING READ</small><h3>{read.headline}</h3><p>{read.guidance}</p></div>
          <button type="button" onClick={onRerun}>Test this signal again →</button>
        </article>
      )}

      {evidence.length > 0 && <footer className="trial-ledger-preview">{evidence.slice(-3).reverse().map((entry) => <span key={entry.id}><i /> <b>{entry.opponent || "Open table"}</b><small>{entry.signal || entry.result || "Observation preserved"}</small></span>)}</footer>}
    </section>
  );
}
