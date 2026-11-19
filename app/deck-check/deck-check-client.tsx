"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { parseDecklist, playedCount } from "../deck-check-parse.mjs";
import { factFor, fetchCardFacts } from "../deck-check-facts.mjs";
import { buildDeckCheckReport, comparePlayerSwap, DECK_CHECK_FORMATS } from "../deck-check-report.mjs";
import { DECK_CHECK_SAMPLES } from "../deck-check-samples.mjs";
import type { Comparison as ComparisonData, DeckCheckReport, FactIndex, PlayerSwapResult } from "./deck-check-types";

// Inside a status-guarded branch every field the branch reads is present
// (tests/deck-check.test.mjs pins this), so the view drops the optionality.
type ReportView = { [K in keyof DeckCheckReport]-?: NonNullable<DeckCheckReport[K]> };

type Phase = "idle" | "reading" | "done" | "error";

const STORAGE_KEY = "metaforge.deckCheck.draft.v1";

// Where to learn more about the top weakness. Only guides that exist.
const ACADEMY_FOR: Record<string, { href: string; label: string }> = {
  "role-draw": { href: "/academy/why-do-i-run-out-of-cards", label: "Why do I run out of cards?" },
  "role-interaction": { href: "/academy/how-much-interaction-do-i-actually-need", label: "How much interaction do I actually need?" },
  "role-ramp": { href: "/academy/why-cant-i-cast-my-spells", label: "Why can't I cast my spells?" },
  "role-wincon": { href: "/academy/why-do-i-lose-after-getting-ahead", label: "Why do I lose after getting ahead?" },
  "role-wipes": { href: "/academy/how-much-interaction-do-i-actually-need", label: "How much interaction do I actually need?" },
};

function readDraft() {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeDraft(value: { text: string; format: string; strategy: string }) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    /* Private windows can refuse storage. The page works without it. */
  }
}

function statusWord(status: string) {
  if (status === "short") return "Short";
  if (status === "over") return "Above range";
  if (status === "tight") return "Close";
  return "In range";
}

function confidenceLabel(level?: string) {
  if (level === "high") return "High confidence";
  if (level === "low") return "Low confidence";
  return "Medium confidence";
}

// What each part of the report rests on, so a reader can tell a verified
// rule from a counted read, a heuristic, or a measured replay.
const BASIS: Record<string, { label: string; title: string }> = {
  verified: { label: "Verified", title: "Checked against the Commander rules and Scryfall's legality data." },
  counted: { label: "Rules-based count", title: "Counted from each card's printed text with MetaForge's own rules." },
  heuristic: { label: "Heuristic", title: "MetaForge's starting bands for this kind of plan, not rules of the game." },
  strong: { label: "Strong finding", title: "Far outside MetaForge's band, on a plan read with high confidence." },
  measured: { label: "Measured", title: "Replayed through the same checks on your list." },
};

function Basis({ kind }: { kind: keyof typeof BASIS }) {
  const basis = BASIS[kind];
  return <span className={`dc-basis is-${kind}`} title={basis.title}>{basis.label}</span>;
}

function CurveBars({ buckets }: { buckets: Array<{ label: string; actual: number; target?: number; status?: string }> }) {
  const max = Math.max(1, ...buckets.map((bucket) => Math.max(bucket.actual, bucket.target || 0)));
  return (
    <div className="dc-curve" role="table" aria-label="Spells by mana value">
      <div role="row" className="dc-curve-row dc-curve-head">
        <span role="columnheader">Mana value</span>
        <span role="columnheader">Spells</span>
        {buckets.some((bucket) => bucket.target != null) && <span role="columnheader">Plan wants about</span>}
      </div>
      {buckets.map((bucket) => (
        <div role="row" className={`dc-curve-row is-${bucket.status || "ok"}`} key={bucket.label}>
          <span role="rowheader">{bucket.label}</span>
          <span role="cell" className="dc-curve-cell">
            <span className="dc-curve-bar" style={{ width: `${(bucket.actual / max) * 100}%` }} aria-hidden="true" />
            <b>{bucket.actual}</b>
            {bucket.status && bucket.status !== "ok" && <em>{bucket.status === "short" ? "light" : "heavy"}</em>}
          </span>
          {bucket.target != null && <span role="cell">{bucket.target}</span>}
        </div>
      ))}
    </div>
  );
}

function Comparison({ comparison }: { comparison: ComparisonData }) {
  const [copied, setCopied] = useState("");
  const moved = comparison.roles.filter((role) => role.before !== role.after);
  async function copy() {
    try {
      await navigator.clipboard.writeText(comparison.afterText);
      setCopied("Updated list copied.");
    } catch {
      setCopied("Copy was blocked by the browser. Select the list below instead.");
    }
  }
  return (
    <div className="dc-compare">
      <p className="dc-swap-line">
        <span className="dc-cut">Cut <b>{comparison.cut}</b></span>
        <span aria-hidden="true"> → </span>
        <span className="dc-add">Add <b>{comparison.add}</b></span>
        {" "}<Basis kind="measured" />
      </p>
      {comparison.cutFlag && <p className="dc-warn">{comparison.cutFlag}</p>}
      <blockquote className="dc-quote">
        <small>{comparison.add}{comparison.addManaCost ? ` · ${comparison.addManaCost}` : ""}{comparison.addTypeLine ? ` · ${comparison.addTypeLine}` : ""}</small>
        {comparison.addQuote}
      </blockquote>
      {comparison.reason && <p>{comparison.reason}</p>}
      <div className="dc-table-wrap">
        <table className="dc-table">
          <caption>Before and after, replayed through the same checks</caption>
          <thead>
            <tr><th scope="col">Job</th><th scope="col">Before</th><th scope="col">After</th><th scope="col">Range for this plan</th></tr>
          </thead>
          <tbody>
            {comparison.roles.map((role) => (
              <tr key={role.id} className={role.before !== role.after ? "is-moved" : ""}>
                <th scope="row">{role.label}</th>
                <td>{role.before} <small>{statusWord(role.beforeStatus)}</small></td>
                <td>{role.after} <small>{statusWord(role.afterStatus)}</small></td>
                <td>{role.min}–{role.max}</td>
              </tr>
            ))}
            {comparison.curve?.before != null && (
              <tr className={comparison.curve.before !== comparison.curve.after ? "is-moved" : ""}>
                <th scope="row">Average mana value</th>
                <td>{comparison.curve.before}</td>
                <td>{comparison.curve.after}</td>
                <td>about {comparison.curve.ideal}</td>
              </tr>
            )}
            {comparison.lands && (
              <tr className={comparison.lands.before !== comparison.lands.after ? "is-moved" : ""}>
                <th scope="row">Lands</th>
                <td>{comparison.lands.before}</td>
                <td>{comparison.lands.after}</td>
                <td>{comparison.lands.targetLow}–{comparison.lands.targetHigh}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="dc-verdict"><b>What changed:</b> {comparison.verdict}</p>
      {moved.length === 0 && <p className="dc-muted">No role count moved. That is a real result: the change is about card quality, or it does not help the way it looks.</p>}
      {comparison.tradeOffs.length > 0 && (
        <div className="dc-tradeoffs">
          <b>What it costs:</b>
          <ul>{comparison.tradeOffs.map((line: string) => <li key={line}>{line}</li>)}</ul>
        </div>
      )}
      {comparison.resolved.length > 0 && <p><b>No longer flagged:</b> {comparison.resolved.join("; ")}.</p>}
      {comparison.introduced.length > 0 && <p><b>Newly flagged:</b> {comparison.introduced.join("; ")}.</p>}
      <div className="dc-actions">
        <button type="button" onClick={copy}>Copy the updated list</button>
        <span role="status" aria-live="polite">{copied}</span>
      </div>
      <details className="dc-after-text">
        <summary>Show the updated list</summary>
        <textarea readOnly value={comparison.afterText} aria-label="Updated decklist" rows={8} />
      </details>
    </div>
  );
}

export function DeckCheck() {
  const [text, setText] = useState("");
  const [format, setFormat] = useState("commander");
  const [strategy, setStrategy] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState("");
  const [progressCount, setProgressCount] = useState<{ done: number; total: number } | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [errorRetryable, setErrorRetryable] = useState(false);
  const [facts, setFacts] = useState<FactIndex>({});
  const [notFound, setNotFound] = useState<string[]>([]);
  const [lookupFailed, setLookupFailed] = useState(false);
  const [checkedText, setCheckedText] = useState("");
  const [checkedFormat, setCheckedFormat] = useState("commander");
  const [checkedStrategy, setCheckedStrategy] = useState("");
  const [commanderOverride, setCommanderOverride] = useState<string[] | null>(null);
  const [pickedCommander, setPickedCommander] = useState("");
  const [activeSwap, setActiveSwap] = useState(0);
  const [customCut, setCustomCut] = useState("");
  const [customAdd, setCustomAdd] = useState("");
  const [customResult, setCustomResult] = useState<PlayerSwapResult | null>(null);
  const [customBusy, setCustomBusy] = useState(false);
  const reportHeading = useRef<HTMLHeadingElement>(null);
  const changeHeading = useRef<HTMLHeadingElement>(null);
  const cutSelect = useRef<HTMLSelectElement>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const abortRef = useRef<AbortController | null>(null);

  // Restore the tab's draft after hydration. Reading sessionStorage during
  // render would make the server and client markup differ.
  useEffect(() => {
    const draft = readDraft();
    if (draft?.text) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time, post-hydration restore from browser storage
      setText(String(draft.text));
      if (DECK_CHECK_FORMATS.some((entry) => entry.id === draft.format)) setFormat(draft.format);
      setStrategy(String(draft.strategy || ""));
    }
    return () => abortRef.current?.abort();
  }, []);

  useEffect(() => {
    writeDraft({ text, format, strategy });
  }, [text, format, strategy]);

  const draftParsed = useMemo(() => parseDecklist(text), [text]);
  const draftCount = playedCount(draftParsed);
  const parsed = useMemo(() => parseDecklist(checkedText), [checkedText]);

  // The report is a plain object from a .mjs module; its shape is pinned by tests/deck-check.test.mjs.
  const builtReport = useMemo(() => {
    if (phase !== "done") return null;
    return buildDeckCheckReport({
      parsed,
      facts,
      notFound,
      format: checkedFormat,
      strategy: checkedStrategy,
      commanderNames: commanderOverride || undefined,
    });
  }, [phase, parsed, facts, notFound, checkedFormat, checkedStrategy, commanderOverride]);
  const report = builtReport as ReportView | null;

  const reportStatus = report?.status;
  useEffect(() => {
    if (reportStatus && reportStatus !== "empty") reportHeading.current?.focus();
  }, [reportStatus, checkedText]);

  async function runCheck(sourceText = text, sourceFormat = format) {
    const nextParsed = parseDecklist(sourceText);
    if (!nextParsed.entries.length) {
      setPhase("error");
      setErrorRetryable(false);
      setErrorMessage(nextParsed.problems.length
        ? `None of the ${nextParsed.problems.length} line${nextParsed.problems.length === 1 ? "" : "s"} could be read as a card. Use one card per line, like “1 Sol Ring”.`
        : "Paste a decklist first: one card per line, like “1 Sol Ring”.");
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setPhase("reading");
    setErrorMessage("");
    setCustomResult(null);
    setActiveSwap(0);
    setCommanderOverride(null);
    setPickedCommander("");
    const names = nextParsed.entries.map((entry) => entry.name);
    const unique = new Set(names.map((name: string) => name.toLowerCase())).size;
    setProgress(`Reading the printed text of ${unique} card${unique === 1 ? "" : "s"} from Scryfall…`);
    setProgressCount({ done: 0, total: unique });
    try {
      const result = await fetchCardFacts(names, {
        signal: controller.signal,
        onProgress: (done: number, total: number) => {
          setProgress(`Read ${done} of ${total} cards…`);
          setProgressCount({ done, total });
        },
      });
      if (controller.signal.aborted) return;
      setProgressCount(null);
      const resolved = Object.keys(result.facts).length;
      if (result.failed && !resolved) {
        setPhase("error");
        setErrorRetryable(true);
        setErrorMessage("Scryfall could not be reached, so the card text could not be read. Your list is still here. Check your connection and try again.");
        return;
      }
      setFacts(result.facts);
      setNotFound(result.notFound);
      setLookupFailed(result.failed);
      setCheckedText(sourceText);
      setCheckedFormat(sourceFormat);
      setCheckedStrategy(strategy.trim());
      setPhase("done");
      setProgress("");
    } catch {
      if (controller.signal.aborted) return;
      setProgressCount(null);
      setPhase("error");
      setErrorRetryable(true);
      setErrorMessage("Something went wrong reading the card text. Your list is still here. Try again.");
    }
  }

  function cancelCheck() {
    abortRef.current?.abort();
    setProgressCount(null);
    setProgress("");
    setPhase(checkedText ? "done" : "idle");
  }

  /** Jump to a measured change from the finding it fixes. */
  function showChange(index: number) {
    setActiveSwap(index);
    changeHeading.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    changeHeading.current?.focus({ preventScroll: true });
  }

  /** Put a suggested add into the player's own test, and ask for the cut. */
  function testAdd(name: string) {
    setCustomAdd(name);
    setCustomResult(null);
    cutSelect.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    cutSelect.current?.focus({ preventScroll: true });
  }

  function onTabKey(event: KeyboardEvent<HTMLButtonElement>, count: number) {
    const keys: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    let next = -1;
    if (event.key in keys) next = (activeSwap + keys[event.key] + count) % count;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = count - 1;
    if (next < 0) return;
    event.preventDefault();
    setActiveSwap(next);
    tabRefs.current[next]?.focus();
  }

  function loadSample(id: string) {
    const sample = DECK_CHECK_SAMPLES.find((entry) => entry.id === id);
    if (!sample) return;
    setText(sample.text);
    setFormat(sample.format);
    setStrategy("");
    void runCheck(sample.text, sample.format);
  }

  async function testCustomSwap(event: FormEvent) {
    event.preventDefault();
    if (!customCut || !customAdd.trim()) {
      setCustomResult({ ok: false, message: "Pick a card to cut and type the card to add." });
      return;
    }
    setCustomBusy(true);
    setCustomResult(null);
    try {
      const known = factFor(facts, customAdd);
      let addFact = known;
      if (!addFact) {
        const lookup = await fetchCardFacts([customAdd.trim()]);
        addFact = factFor(lookup.facts, customAdd.trim()) || Object.values(lookup.facts)[0] || null;
        if (!addFact && lookup.failed) {
          setCustomResult({ ok: false, message: "Scryfall could not be reached to read that card. Try again." });
          return;
        }
        if (addFact) setFacts((current) => ({ ...current, ...lookup.facts }));
      }
      setCustomResult(comparePlayerSwap({
        parsed,
        facts,
        commanderNames: commanderOverride || undefined,
        strategy: checkedStrategy,
        cut: customCut,
        addFact,
        format: checkedFormat,
      }));
    } finally {
      setCustomBusy(false);
    }
  }

  const sizeHint = draftCount > 0
    ? `${draftCount} card${draftCount === 1 ? "" : "s"} read${draftParsed.problems.length ? `, ${draftParsed.problems.length} line${draftParsed.problems.length === 1 ? "" : "s"} not read` : ""}${draftParsed.commanderNames.length ? ` · commander: ${draftParsed.commanderNames.join(" + ")}` : ""}`
    : "One card per line. Moxfield, Archidekt, MTG Arena and plain “1 Sol Ring” lists all work.";

  const topWeakness = report?.status === "ready" ? report.weaknesses?.find((weakness) => weakness.id !== "sound") : null;
  const academy = topWeakness ? ACADEMY_FOR[topWeakness.id] : null;
  const activeComparison = report?.status === "ready" ? report.comparisons?.[activeSwap] : null;
  const errors = report?.structure?.issues?.filter((issue) => issue.severity === "error") || [];
  const infos = report?.structure?.issues?.filter((issue) => issue.severity !== "error") || [];

  return (
    <div className="deck-check">
      <header className="dc-intro">
        <small>DECK CHECK · FREE · NO ACCOUNT</small>
        <h1>Check your deck</h1>
        <p className="dc-lede">
          Paste a decklist. MetaForge reads every card&rsquo;s printed text and tells you what the deck is trying to do,
          what is holding it back, and one change worth testing &mdash; quoting the card text behind each point.
        </p>
      </header>

      <form
        className="dc-form"
        onSubmit={(event) => { event.preventDefault(); void runCheck(); }}
        aria-describedby="dc-privacy"
      >
        <div className="dc-row">
          <label className="dc-field dc-format">
            <span>Format</span>
            <select value={format} onChange={(event) => setFormat(event.target.value)}>
              {DECK_CHECK_FORMATS.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}
            </select>
          </label>
          <label className="dc-field dc-strategy">
            <span>What should the deck do? <i>(optional)</i></span>
            <input value={strategy} onChange={(event) => setStrategy(event.target.value)} placeholder="e.g. tokens, spellslinger, landfall" maxLength={80} />
          </label>
        </div>
        <label className="dc-field">
          <span>Decklist</span>
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={12}
            spellCheck={false}
            placeholder={"Commander\n1 Talrand, Sky Summoner\n\nDeck\n1 Sol Ring\n1 Counterspell\n33 Island"}
            aria-describedby="dc-size-hint"
          />
        </label>
        <p className="dc-hint" id="dc-size-hint" aria-live="polite">{sizeHint}</p>
        <div className="dc-actions">
          <button type="submit" className="dc-primary" disabled={phase === "reading" || !text.trim()}>
            {phase === "reading" ? "Checking…" : "Check my deck"}
          </button>
          {text && phase !== "reading" && (
            <button type="button" className="dc-quiet" onClick={() => { setText(""); setPhase("idle"); setCheckedText(""); }}>Clear</button>
          )}
        </div>
        <div className="dc-samples" role="group" aria-label="Sample decks">
          <span>No list handy? Try a sample:</span>
          {DECK_CHECK_SAMPLES.map((sample) => (
            <button type="button" key={sample.id} onClick={() => loadSample(sample.id)} disabled={phase === "reading"}>
              <b>{sample.label}</b><small>{sample.note}</small>
            </button>
          ))}
        </div>
        <p className="dc-muted" id="dc-privacy">Your list stays in this browser. Only card names are sent to Scryfall to read their printed text.</p>
      </form>

      <div className="dc-status" role="status" aria-live="polite" aria-busy={phase === "reading"}>
        {phase === "reading" && (
          <div className="dc-loading">
            <p><span className="dc-spinner" aria-hidden="true" />{progress}</p>
            {progressCount && progressCount.total > 0 && (
              <progress max={progressCount.total} value={progressCount.done} aria-label="Cards read from Scryfall">{progressCount.done} of {progressCount.total}</progress>
            )}
            <button type="button" className="dc-quiet" onClick={cancelCheck}>Cancel</button>
          </div>
        )}
      </div>
      {phase === "error" && (
        <div className="dc-error" role="alert">
          <p>{errorMessage}</p>
          {errorRetryable && text.trim() && <button type="button" onClick={() => void runCheck()}>Try again</button>}
        </div>
      )}

      {report && report.status !== "empty" && (
        <section className="dc-report" aria-labelledby="dc-report-title">
          <h2 id="dc-report-title" ref={reportHeading} tabIndex={-1}>
            {report.status === "ready" ? `Coaching report: ${report.commanders.map((commander) => commander.name).join(" + ")}` : `${report.format.label} check`}
          </h2>
          {lookupFailed && (
            <div className="dc-warn" role="alert">
              <p>Some cards could not be read because Scryfall did not answer every request. The counts below may be low.</p>
              <button type="button" onClick={() => void runCheck(checkedText, checkedFormat)}>Read the cards again</button>
            </div>
          )}

          {report.status === "ready" && (
            <article className="dc-card dc-glance" aria-labelledby="dc-glance-title">
              <h3 id="dc-glance-title">At a glance</h3>
              <ul className="dc-glance-list">
                <li>
                  <b>{errors.length ? `Not yet legal in ${report.format.label}:` : `Legal in ${report.format.label}.`}</b>
                  {errors.length ? <> {errors.length} problem{errors.length === 1 ? "" : "s"} to fix. <a href="#dc-format-title">See the format check</a></> : null}
                  {" "}<Basis kind="verified" />
                </li>
                <li><b>Plan:</b> {report.plan.sentence}</li>
                {report.weaknesses.filter((weakness) => weakness.id !== "sound").slice(0, 3).map((weakness) => (
                  <li key={`glance-${weakness.id}`}>
                    <b>Fix:</b> <a href={`#dc-finding-${weakness.id}`}>{weakness.title}</a>
                    {" "}<Basis kind={weakness.strength === "strong" ? "strong" : "heuristic"} />
                  </li>
                ))}
                {report.weaknesses.every((weakness) => weakness.id === "sound") && <li><b>No major hole found</b> in the counts MetaForge reads.</li>}
                {report.comparisons.length > 0 && (
                  <li><b>Measured change to try:</b> <a href="#dc-change-title">{report.comparisons[0].cut} → {report.comparisons[0].add}</a></li>
                )}
              </ul>
            </article>
          )}

          {parsed.ignored.length + parsed.problems.length + parsed.notes.length > 0 && (
            <details className="dc-lines">
              <summary>How your list was read: {playedCount(parsed)} cards counted{parsed.ignored.length ? `, ${parsed.ignored.length} line${parsed.ignored.length === 1 ? "" : "s"} set aside` : ""}{parsed.problems.length ? `, ${parsed.problems.length} not readable` : ""}</summary>
              <ul>
                {[...parsed.problems, ...parsed.ignored, ...parsed.notes]
                  .sort((a, b) => a.line - b.line)
                  .map((line) => <li key={`${line.line}-${line.reason}`}><b>Line {line.line}</b> <code>{line.text}</code> — {line.reason}</li>)}
              </ul>
            </details>
          )}

          {report.status === "ready" && (
            <article className="dc-card dc-plan">
              <h3>What this deck is trying to do <Basis kind="counted" /></h3>
              <p className="dc-big">{report.plan.sentence}</p>
              {report.plan.quote && (
                <blockquote className="dc-quote">
                  <small>{report.commanders[0].name} · printed text</small>
                  {report.plan.quote}
                </blockquote>
              )}
              <p className={`dc-confidence is-${report.plan.confidence?.level || "medium"}`}>
                <b>{confidenceLabel(report.plan.confidence?.level)}.</b> {report.plan.confidence?.reason}
              </p>
              {report.plan.strategyNote && <p>{report.plan.strategyNote}</p>}
              {report.strengths.length > 0 && (
                <>
                  <h4>What it already does well</h4>
                  <ul className="dc-strengths">
                    {report.strengths.map((job) => (
                      <li key={job.id}>
                        <b>{job.label}: {job.actual}</b> <small>(this plan wants {job.min}–{job.max})</small>
                        {job.cards.length > 0 && <span> — {job.cards.join(", ")}{job.actual > job.cards.length ? ", and more" : ""}</span>}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </article>
          )}

          <article className={`dc-card dc-format-check ${errors.length ? "has-errors" : "is-legal"}`}>
            <h3 id="dc-format-title">Format check · {report.format.label} <Basis kind="verified" /></h3>
            {errors.length === 0 ? (
              <p className="dc-pass"><span aria-hidden="true">✓ </span>No construction problems found: {report.structure.playedTotal} cards{report.structure.commanders.length ? `, ${report.structure.commanders.join(" + ")} as commander` : ""}, copy limits{report.format.commander ? ", color identity" : ""} and Scryfall legality all check out.</p>
            ) : (
              <>
                <p><b>{errors.length} problem{errors.length === 1 ? "" : "s"} to fix before this is a legal {report.format.label} deck.</b></p>
                <ul className="dc-issues">
                  {errors.map((issue, index) => (
                    <li key={`${issue.code}-${index}`}>
                      {issue.message}{issue.lines?.length ? <small> (line {issue.lines.join(", ")})</small> : null}
                    </li>
                  ))}
                </ul>
              </>
            )}
            {infos.map((issue, index) => <p className="dc-muted" key={`info-${index}`}>{issue.message}</p>)}
          </article>

          {report.status === "needs-commander" && (
            <article className="dc-card">
              <h3>Which card is the commander?</h3>
              {report.candidates.length > 0 ? (
                <form className="dc-row" onSubmit={(event) => { event.preventDefault(); if (pickedCommander) setCommanderOverride([pickedCommander]); }}>
                  <label className="dc-field">
                    <span>Commander</span>
                    <select value={pickedCommander} onChange={(event) => setPickedCommander(event.target.value)}>
                      <option value="">Choose…</option>
                      {report.candidates.map((name: string) => <option key={name} value={name}>{name}</option>)}
                    </select>
                  </label>
                  <button type="submit" className="dc-primary" disabled={!pickedCommander}>Coach this deck</button>
                </form>
              ) : (
                <p>No legendary creature in this list can lead it.{report.structure.playedTotal <= 75 ? " This looks like a 60-card list: try choosing its format above and checking again." : " Add the commander under a “Commander” heading and check again."}</p>
              )}
            </article>
          )}

          {report.status === "structure-only" && (
            <article className="dc-card">
              <h3>Curve and color needs</h3>
              <p>{report.summary.landCount} lands and {report.summary.spellCount} spells. Average mana value of the spells: {report.summary.averageManaValue ?? "unknown"}.</p>
              <CurveBars buckets={report.summary.curve} />
              {report.summary.pips.length > 0 && (
                <p>Colored mana symbols in spell costs: {report.summary.pips.map((pip) => `${pip.word} ${pip.pips}`).join(", ")}.</p>
              )}
            </article>
          )}

          {report.status === "unreadable" && <article className="dc-card"><p>{report.message}</p></article>}

          {report.status === "ready" && (
            <>
              <article className="dc-card dc-weak">
                <h3>{report.weaknesses.some((weakness) => weakness.id !== "sound") ? "What to fix first" : report.weaknessHeading}</h3>
                <p className="dc-muted">
                  {report.weaknesses.some((weakness) => weakness.id !== "sound")
                    ? "Strongest finding first. Each one shows what was counted, the cards behind it, why it matters, what to change, and what that costs."
                    : report.weaknessIntro}
                </p>
                <ol className="dc-weaknesses">
                  {report.weaknesses.map((weakness) => {
                    const swapIndex = report.comparisons.findIndex((comparison) => comparison.source === weakness.id);
                    const suggestion = report.suggestedAdds.find((entry) => entry.source === weakness.id);
                    return (
                      <li key={weakness.id} id={`dc-finding-${weakness.id}`} tabIndex={-1}>
                        <h4>
                          {weakness.title}
                          {weakness.strength && <> <Basis kind={weakness.strength === "strong" ? "strong" : "heuristic"} /></>}
                        </h4>
                        {weakness.detected ? (
                          <dl className="dc-finding">
                            <dt>Detected</dt>
                            <dd>{weakness.detected}</dd>
                            <dt>Why it matters</dt>
                            <dd>{weakness.why || weakness.plain}</dd>
                            {(weakness.notes?.length || 0) > 0 && (
                              <>
                                <dt>Keep in mind</dt>
                                {weakness.notes?.map((note) => <dd key={note}>{note}</dd>)}
                              </>
                            )}
                            <dt>Cards behind it</dt>
                            <dd>
                              <ul className="dc-citations">
                                {weakness.citations.map((citation) => (
                                  <li key={`${weakness.id}-${citation.name}`}>
                                    <b>{citation.name}</b>
                                    {citation.quote && <q>{citation.quote}</q>}
                                    <span>{citation.says}</span>
                                  </li>
                                ))}
                              </ul>
                            </dd>
                            <dt>What to change</dt>
                            <dd>
                              {weakness.change}
                              {swapIndex >= 0 && <> <button type="button" className="dc-link" onClick={() => showChange(swapIndex)}>See the measured change</button></>}
                              {swapIndex < 0 && suggestion && <> <button type="button" className="dc-link" onClick={() => testAdd(suggestion.add)}>Test {suggestion.add} with your own cut</button></>}
                            </dd>
                            {weakness.tradeOff && (
                              <>
                                <dt>What it costs</dt>
                                <dd>{weakness.tradeOff}</dd>
                              </>
                            )}
                            <dt>How sure</dt>
                            <dd className="dc-muted">{weakness.strengthReason} {confidenceLabel(weakness.confidence)} plan read.</dd>
                          </dl>
                        ) : (
                          <>
                            <p>{weakness.plain}</p>
                            {weakness.citations?.length > 0 && (
                              <ul className="dc-citations">
                                {weakness.citations.map((citation) => (
                                  <li key={`${weakness.id}-${citation.name}`}>
                                    <b>{citation.name}</b>
                                    {citation.quote && <q>{citation.quote}</q>}
                                    <span>{citation.says}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </article>

              {report.mana && (
                <article className="dc-card">
                  <h3>Mana <Basis kind="counted" /></h3>
                  <p>{report.mana.summary}</p>
                  <p className="dc-muted">{report.mana.lands.summary}</p>
                  <ul className="dc-colors">
                    {report.mana.colors.map((color) => (
                      <li key={color.color}><b>{statusWord(color.status)}</b> · {color.summary}</li>
                    ))}
                  </ul>
                </article>
              )}

              <article className="dc-card">
                <h3>Curve <Basis kind="counted" /></h3>
                <p>{report.curve.summary}.</p>
                <CurveBars buckets={report.curve.buckets} />
              </article>

              <article className="dc-card dc-change" aria-labelledby="dc-change-title">
                <h3 id="dc-change-title" ref={changeHeading} tabIndex={-1}>Try one change</h3>
                {report.comparisons.length > 0 ? (
                  <>
                    <p className="dc-muted">Each change is replayed through the same checks, so the numbers below are measured on your list, not promised.</p>
                    {report.comparisons.length > 1 && (
                      <div className="dc-tabs" role="tablist" aria-label="Suggested changes">
                        {report.comparisons.map((comparison, index) => (
                          <button
                            type="button"
                            role="tab"
                            id={`dc-tab-${index}`}
                            aria-controls="dc-tabpanel"
                            aria-selected={index === activeSwap}
                            tabIndex={index === activeSwap ? 0 : -1}
                            ref={(element) => { tabRefs.current[index] = element; }}
                            key={`${comparison.cut}-${comparison.add}`}
                            onClick={() => setActiveSwap(index)}
                            onKeyDown={(event) => onTabKey(event, report.comparisons.length)}
                          >
                            {comparison.cut} → {comparison.add}
                          </button>
                        ))}
                      </div>
                    )}
                    <div id="dc-tabpanel" role={report.comparisons.length > 1 ? "tabpanel" : undefined} aria-labelledby={report.comparisons.length > 1 ? `dc-tab-${activeSwap}` : undefined}>
                      {activeComparison && <Comparison comparison={activeComparison} />}
                    </div>
                  </>
                ) : report.suggestedAdds.length === 0 ? (
                  <p>{report.noSwapNote}</p>
                ) : null}
                {report.suggestedAdds.length > 0 && (
                  <div className="dc-suggested">
                    <h4>Worth testing, with a cut you choose</h4>
                    <p className="dc-muted">Every expensive card in this list already does another job or belongs to the plan, so MetaForge will not pick the cut for you.</p>
                    <ul>
                      {report.suggestedAdds.map((entry) => (
                        <li key={entry.add}>
                          <b>{entry.add}</b>{entry.addManaCost ? ` · ${entry.addManaCost}` : ""}{entry.addTypeLine ? ` · ${entry.addTypeLine}` : ""}
                          <q>{entry.addQuote}</q>
                          <button type="button" onClick={() => testAdd(entry.add)}>Test {entry.add}</button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <form className="dc-custom" onSubmit={testCustomSwap}>
                  <h4>Test your own change</h4>
                  <div className="dc-row">
                    <label className="dc-field">
                      <span>Cut</span>
                      <select ref={cutSelect} value={customCut} onChange={(event) => setCustomCut(event.target.value)}>
                        <option value="">Choose a card…</option>
                        {report.deckCards.map((name: string) => <option key={name} value={name}>{name}</option>)}
                      </select>
                    </label>
                    <label className="dc-field">
                      <span>Add</span>
                      <input value={customAdd} onChange={(event) => setCustomAdd(event.target.value)} placeholder="Exact card name" />
                    </label>
                    <button type="submit" className="dc-primary" disabled={customBusy}>{customBusy ? "Testing…" : "Compare"}</button>
                  </div>
                  <div aria-live="polite">
                    {customResult && !customResult.ok && <p className="dc-warn" role="alert">{customResult.message}</p>}
                    {customResult?.ok && <Comparison comparison={customResult.comparison} />}
                  </div>
                </form>
              </article>
            </>
          )}

          <article className="dc-card dc-limits">
            <h3>What this check can and can&rsquo;t tell you</h3>
            <ul>{report.limits.map((line: string) => <li key={line}>{line}</li>)}</ul>
            <p className="dc-legend">
              <Basis kind="verified" /> rules and Scryfall legality ·{" "}
              <Basis kind="counted" /> read from printed text ·{" "}
              <Basis kind="strong" /> / <Basis kind="heuristic" /> MetaForge&rsquo;s judgement ·{" "}
              <Basis kind="measured" /> replayed on your list. Not checked: prices, win rates, matchups, your playgroup.
            </p>
          </article>

          <nav className="dc-next" aria-label="Keep going">
            {academy && <Link href={academy.href}>Learn more: {academy.label} →</Link>}
            <Link href="/?intent=build">Build a deck with the coach, one card at a time →</Link>
            <Link href="/methodology">How MetaForge reads a deck →</Link>
          </nav>
        </section>
      )}
    </div>
  );
}
