"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { cardImage } from "../../card-art";
import { scryfallFormatTerms } from "../../format-catalog";
import { GUIDED_CATEGORY_COPY, describeGuidedReason, describeLedgerRow, guidedCategoryLabel } from "../../guided-reason-copy.mjs";
import { shellDisplay } from "../../shell-copy.mjs";
import { centeredRailScrollLeft } from "../../guided-step-rail.mjs";
import { DECLINE_REASONS } from "../../guided-preference-learning.mjs";
import { PlayerCompassCard } from "./player-compass-card";
import { GuidedFinishPanel } from "./guided-finish-panel";
import { useForgeSession, type GuidedDeckProfile, type GuidedListAnalysis } from "../../forge-session-context";

const REASON_KIND_LABEL: Record<string, string> = {
  gap: "Gap",
  synergy: "Synergy",
  plan: "Plan",
  curve: "Curve",
  color: "Color",
  "trade-off": "Trade-off",
};

// The running deck profile from the reasoning engine: plan, curve and the
// roles still short of Commander norms. Read-only evidence.
const PLAN_BALANCE_COPY: Record<string, string> = {
  "needs-enablers": "Payoffs are ahead of the cards that feed them.",
  "needs-payoffs": "Fuel is ahead of the cards that pay it off.",
};

function DeckProfileCard({ profile }: { profile: NonNullable<GuidedDeckProfile> }) {
  const peak = Math.max(1, ...profile.curve.buckets, ...profile.curve.targets);
  return (
    <section className="guided-profile" aria-label="Your deck so far">
      <header>
        <small>YOUR DECK SO FAR</small>
        <p><b>{profile.plan.label}</b>{profile.plan.confidence > 0 ? ` · ${Math.round(profile.plan.confidence * 100)}% sure` : ""}</p>
        {PLAN_BALANCE_COPY[profile.planBalance] && <p className="guided-gaps">{PLAN_BALANCE_COPY[profile.planBalance]}</p>}
      </header>
      <div className="guided-curve" aria-label="Mana curve">
        {profile.curve.buckets.map((count, index) => (
          <div key={profile.curve.labels[index]} title={`${count} at ${profile.curve.labels[index]} (aim for about ${profile.curve.targets[index]})`}>
            <span style={{ height: `${Math.round((count / peak) * 100)}%` }} />
            <em>{profile.curve.labels[index]}</em>
          </div>
        ))}
      </div>
      {profile.gaps.length > 0 && (
        <p className="guided-gaps">Still short on: {profile.gaps.map((gap) => `${gap.label} (${gap.missing})`).join(", ")}</p>
      )}
      {profile.curve.issues.length > 0 && <p className="guided-gaps">Curve: {profile.curve.issues.join(", ")}</p>}
    </section>
  );
}

// A pasted list's review: what plan it reads as, which cards look weak or
// off-plan and why, and which steps to walk through first. Advice only.
function ListReview({ analysis }: { analysis: NonNullable<GuidedListAnalysis> }) {
  return (
    <section className="guided-list-review" aria-label="Review of your list">
      <header>
        <small>YOUR LIST · {analysis.recognized} OF {analysis.submitted} CARDS READ</small>
        <p>Reads as <b>{analysis.plan.label}</b>.</p>
      </header>
      {analysis.flagged.length > 0 && (
        <details open>
          <summary>Worth a second look ({analysis.flagged.length})</summary>
          <ul>{analysis.flagged.map((entry) => <li key={entry.name}><b>{entry.name}</b> {entry.reasons.join(" ")}</li>)}</ul>
        </details>
      )}
      {analysis.strengths.length > 0 && (
        <details>
          <summary>Already working well ({analysis.strengths.length})</summary>
          <ul>{analysis.strengths.map((entry) => <li key={entry.name}><b>{entry.name}</b> {entry.text}</li>)}</ul>
        </details>
      )}
      {analysis.nextSteps.length > 0 && (
        <p className="guided-gaps">Walk through next: {analysis.nextSteps.map((step) => `${guidedCategoryLabel(step.category)} (${step.why})`).join("; ")}</p>
      )}
      {analysis.notes.map((note) => <p key={note} className="guided-gaps">{note}</p>)}
    </section>
  );
}

// architecture/GUIDED_CONSTRUCTION_FLOW.md flow step 3: the player and the
// Forge build the deck together, one decision at a time. Every suggestion
// and every ledger number is computed server-side (worker/forge-guided-
// build.ts); this component only renders that evidence and relays the
// player's accept / decline / search / done choices.
export function GuidedBuildChamber() {
  const {
    guidedSession: session,
    guidedLoading,
    guidedError,
    guidedSaveStatus,
    guidedConflict,
    guidedBuildLocked,
    refreshGuidedPool,
    retryGuidedBuild,
    exportGuidedPicks,
    maxCardPrice,
    commonsOnly,
    selectedCommander,
    selectedSecondCommander,
    selectedShell,
    format,
    startGuidedBuild,
    acceptGuidedOffer,
    declineGuidedOffer,
    addGuidedManualCard,
    removeGuidedPick,
    goToGuidedCategory,
    finishGuidedCategory,
    enterGuidedFinish,
    guidedFinishStatus,
    guestGuidedClaimToken,
    signInResumeHref,
    exitGuidedBuild,
    playerCompass,
    guestMode,
    playerCompassSynced,
    persistPlayerCompass,
  } = useForgeSession();

  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Array<{ name: string; typeLine: string; raw: Record<string, unknown> }>>([]);
  const [confirmingRestart, setConfirmingRestart] = useState(false);
  // "Not this one" opens one-tap reasons; picking one (or "Just show me
  // another") declines with that reason so later suggestions adapt.
  // Keyed to the offer on screen, so a new offer closes it without an effect.
  const [reasonsOpenFor, setReasonsOpenFor] = useState<string | null>(null);
  const acceptRef = useRef<HTMLButtonElement>(null);
  const stepRailRef = useRef<HTMLOListElement>(null);
  const searchSeq = useRef(0);
  const [searchState, setSearchState] = useState("idle");
  const [searchRetry, setSearchRetry] = useState(0);

  const commanderColors = [...new Set([...(selectedCommander?.colors || []), ...(selectedSecondCommander?.colors || [])])];
  const identityClause = commanderColors.length ? `id<=${commanderColors.join("").toLowerCase()}` : "id:c";
  const accepted = useMemo(() => session?.accepted || [], [session?.accepted]);

  // Presentation only: remember which step each pick was made on so the
  // sidebar can group picks by role. The server's session has no per-pick
  // category, so this is a best-effort, tab-local record (sessionStorage);
  // anything unknown is listed under "Other picks".
  const pickRolesKey = session ? `metaforge-guided-pick-roles:${session.key}` : "";
  const readPickRoles = (key: string): Record<string, string> => {
    if (!key || typeof window === "undefined") return {};
    try { return JSON.parse(window.sessionStorage.getItem(key) || "{}"); } catch { return {}; }
  };
  const [pickRolesFor, setPickRolesFor] = useState(pickRolesKey);
  const [pickRoles, setPickRoles] = useState<Record<string, string>>(() => readPickRoles(pickRolesKey));
  if (pickRolesFor !== pickRolesKey) {
    setPickRolesFor(pickRolesKey);
    setPickRoles(readPickRoles(pickRolesKey));
  }
  const currentCategory = session ? session.categories[session.categoryIndex] : "";
  const rememberPickRole = (name: string) => {
    if (!pickRolesKey || !currentCategory) return;
    const next = { ...pickRoles, [name]: currentCategory };
    setPickRoles(next);
    try { window.sessionStorage.setItem(pickRolesKey, JSON.stringify(next)); } catch { /* storage unavailable: grouping stays in memory */ }
  };
  const groupedPicks = useMemo(() => {
    const order = session?.categories || [];
    const groups = new Map<string, string[]>();
    for (const name of accepted) {
      const role = pickRoles[name] && order.includes(pickRoles[name]) ? pickRoles[name] : "other";
      groups.set(role, [...(groups.get(role) || []), name]);
    }
    return [...order, "other"].filter((id) => groups.has(id)).map((id) => ({ id, names: groups.get(id) || [] }));
  }, [accepted, pickRoles, session?.categories]);
  const targetRows = (session?.ledger || []).filter((row) => row.target && row.status !== "no-target");
  const rolesFilled = targetRows.filter((row) => row.target && row.actual >= row.target.min).length;
  const rolesNeeded = targetRows.length;

  useEffect(() => {
    const seq = ++searchSeq.current;
    const term = search.replace(/["():]/g, " ").trim();
    if (term.length < 2) {
      setResults([]);
      setSearchState("idle");
      return;
    }
    // A slower response to an earlier keystroke can land after a faster
    // response to a later one — the debounce only stops an unstarted fetch,
    // not one already in flight. Tag each request and drop any response
    // that isn't for the search term still on screen, so a fast typist never
    // sees results for something they've already typed past.
    const controller = new AbortController();
    setSearchState("loading");
    setResults([]);
    const timer = window.setTimeout(async () => {
      try {
        const constraints = `${commonsOnly ? "r:c" : ""} ${maxCardPrice != null ? `usd<=${maxCardPrice}` : ""}`;
        const query = encodeURIComponent(`${scryfallFormatTerms(format)} ${identityClause} ${constraints} ${term}`);
        const response = await fetch(`https://api.scryfall.com/cards/search?q=${query}&order=edhrec`, { signal: controller.signal });
        if (response.status === 404) {
          if (seq === searchSeq.current) { setResults([]); setSearchState("empty"); }
          return;
        }
        if (!response.ok) throw new Error("Card search unavailable");
        const data = await response.json();
        if (!Array.isArray(data.data)) throw new Error("Invalid card search response");
        if (seq !== searchSeq.current) return;
        setResults(
          (data.data || [])
            .slice(0, 6)
            // raw carries the whole Scryfall card so it can be sent to the
            // guided endpoint for real classification if the player adds it
            // (see addGuidedManualCard) — never re-derived from just a name.
            .map((card: { name: string; type_line?: string }) => ({ name: card.name, typeLine: card.type_line || "Card", raw: card })),
        );
        setSearchState(data.data.length ? "ready" : "empty");
      } catch {
        if (seq === searchSeq.current && !controller.signal.aborted) { setResults([]); setSearchState("error"); }
      }
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [search, format, identityClause, maxCardPrice, commonsOnly, searchRetry]);

  // The buttons disable while a request is in flight, which drops keyboard
  // focus to the page body. When the next offer lands, put focus back on
  // "Add to my deck" — but only if focus is homeless, so typing in the
  // search box is never interrupted.
  const offerName = session?.offer?.name;
  useLayoutEffect(() => {
    const rail = stepRailRef.current;
    const current = rail?.querySelector<HTMLElement>(".guided-step.current");
    if (!rail || !current) return;
    const railBox = rail.getBoundingClientRect();
    const stepBox = current.getBoundingClientRect();
    const left = centeredRailScrollLeft(
      { scrollLeft: rail.scrollLeft, left: railBox.left, right: railBox.right },
      { left: stepBox.left, right: stepBox.right },
    );
    if (Math.abs(left - rail.scrollLeft) < 1) return;
    const reduce = typeof globalThis.matchMedia === "function" && globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches;
    rail.scrollTo({ left, behavior: reduce ? "auto" : "smooth" });
  }, [session?.categoryIndex, session?.key]);

  useEffect(() => {
    if (!guidedLoading && offerName && document.activeElement === document.body) acceptRef.current?.focus();
  }, [guidedLoading, offerName]);

  // Restarting discards every pick, so it gets the same two-step confirm
  // every other bulk/destructive action on a deck uses in this codebase —
  // never a silent one-click reset. Dropped automatically if the player
  // picks up any other action instead of confirming.
  useEffect(() => {
    setConfirmingRestart(false);
  }, [session?.accepted.length, session?.categoryIndex, guidedLoading]);

  const category = session ? session.categories[session.categoryIndex] : "";
  const copy = GUIDED_CATEGORY_COPY[category as keyof typeof GUIDED_CATEGORY_COPY];
  const offer = session?.offer || null;
  const choosingReason = Boolean(offer) && reasonsOpenFor === `${session?.categoryIndex}:${offer?.name}`;
  const isLast = session ? session.categoryIndex + 1 >= session.categories.length : false;
  const struggling = (session?.declined.length || 0) >= 3;
  const finishing = Boolean(session?.finish) && !session?.finish?.suspended;
  const finishHeading = session?.finish?.stage === "mana" ? "Your mana base" : session?.finish?.stage === "slots" ? "Fill the open slots" : "Review your deck";

  return (
    <section className="commission-chamber guided-chamber">
      <div className="commission-chamber-sweep" aria-hidden="true" />
      <button className="back-link" onClick={exitGuidedBuild}>
        ← Back
      </button>
      {/* The commission chamber's sticky heading card carries a fixed
          "YOUR BLUEPRINT" blurb in CSS; data-summary swaps in this build's
          own commander, shell and pick count (see .guided-chamber rule). */}
      <div
        className="commission-heading"
        data-summary={`${selectedCommander?.name || "Your commander"}${selectedShell ? ` · ${shellDisplay(selectedShell).name}` : ""}\n${accepted.length} ${accepted.length === 1 ? "card" : "cards"} picked so far`}
      >
        <span className="forge-eyebrow">
          <i /> GUIDED BUILD{session ? (finishing ? " · FINISH" : ` · STEP ${session.categoryIndex + 1} OF ${session.categories.length}`) : ""}
        </span>
        <h1>{finishing ? finishHeading : session ? copy?.label || guidedCategoryLabel(category) : guidedError ? "The guided build stopped" : "Reading your commander…"}</h1>
        <p>
          {finishing
            ? `${guidedFinishStatus.confirmed} of ${guidedFinishStatus.deckTarget} cards confirmed. You choose every one; the Forge only suggests.`
            : session
            ? copy?.blurb
            : guidedError
              ? "Your current choices are kept. Reconnect or retry to continue, or export your picks."
              : "Your first card is next. The Forge is gathering every legal card for this commander. This takes a moment, and only happens once."}
        </p>
      </div>

      {guidedError && (
        <div className="guided-error" role="alert">
          <p>{guidedError}</p>
          <div>
            <button type="button" disabled={guidedLoading || Boolean(guidedConflict)} onClick={() => void retryGuidedBuild()}>Retry without losing picks</button>
            {session && <button type="button" disabled={guidedLoading || guidedBuildLocked} onClick={() => void refreshGuidedPool()}>Refresh card pool</button>}
            {session && <button type="button" onClick={exportGuidedPicks}>Export my picks</button>}
            <button type="button" onClick={exitGuidedBuild}>Back</button>
          </div>
        </div>
      )}
      {session && <p className="guided-save-status" role="status">{guidedSaveStatus || "Your picks are kept while you build."}</p>}
      {session && guestMode && (
        <p className="guided-guest-note">
          Building as a guest. <a href={signInResumeHref}>{guestGuidedClaimToken ? "Sign in to keep this build" : "Sign in"}</a> any time; your picks come with you.
        </p>
      )}
      {guidedBuildLocked && !guidedConflict && <p role="status">A finish request is saved. Check its result before changing your picks.</p>}

      {!session && !guidedError && (
        <p className="guided-loading" role="status">Building your card pool…</p>
      )}

      {session && (
        <div className="commission-scroll guided-body">
          {rolesNeeded > 0 && (
            <div className="guided-progress" role="group" aria-label="Build progress">
              <div className="guided-progress-copy">
                <b>{rolesFilled} of {rolesNeeded} roles filled</b>
                <span>{accepted.length} {accepted.length === 1 ? "card" : "cards"} picked</span>
              </div>
              <progress max={rolesNeeded} value={rolesFilled} aria-label={`${rolesFilled} of ${rolesNeeded} roles filled`} />
            </div>
          )}
          <ol className="guided-steps" aria-label="Build categories" ref={stepRailRef}>
            {session.categories.map((id, index) => {
              const state = index < session.categoryIndex ? "done" : index === session.categoryIndex ? "current" : "upcoming";
              return (
                <li key={id} className={`guided-step ${finishing ? "done" : state}`}>
                  <button type="button" disabled={guidedLoading || guidedBuildLocked} onClick={() => goToGuidedCategory(index)} aria-current={state === "current" ? "step" : undefined}>
                    <span>{index + 1}</span>
                    {guidedCategoryLabel(id)}
                  </button>
                </li>
              );
            })}
          </ol>

          <div className="guided-grid">
            <div className="guided-main">
              {finishing ? <GuidedFinishPanel /> : (
              <article key={offer ? `${session.categoryIndex}:${offer.name}` : "empty"} className="guided-offer" aria-live="polite" aria-busy={guidedLoading}>
                {offer ? (
                  <>
                    <img src={cardImage(offer.name)} alt={offer.name} loading="lazy" />
                    <div>
                      <small>SUGGESTED CARD</small>
                      <h2>{offer.name}</h2>
                      <em>{offer.typeLine}{offer.manaCost ? ` · ${offer.manaCost}` : ""}</em>
                      {offer.oracleText && (
                        <details className="guided-oracle">
                          <summary>Read the card text</summary>
                          <p>{offer.oracleText}</p>
                        </details>
                      )}
                      {session.explanation && (
                        <dl className="guided-explanation">
                          <div><dt>Role</dt><dd>{session.explanation.role}</dd></div>
                          {session.explanation.worksWith.length > 0 && (
                            <div><dt>Works with</dt><dd>{session.explanation.worksWith.join(", ")}</dd></div>
                          )}
                          {session.explanation.tradeOff && (
                            <div><dt>Trade-off</dt><dd>{session.explanation.tradeOff}</dd></div>
                          )}
                          {session.explanation.learned.length > 0 && (
                            <div><dt>From your choices</dt><dd>{session.explanation.learned.join("; ")}</dd></div>
                          )}
                        </dl>
                      )}
                      {session.reasoning && session.reasoning.reasons.length > 0 && (
                        <section className="guided-reasoning" aria-label="Why the Forge suggests this">
                          <header>
                            <small>WHY THIS CARD</small>
                            <span className={`guided-confidence ${session.reasoning.confidenceLabel}`}>
                              {session.reasoning.confidenceLabel} confidence
                            </span>
                          </header>
                          <ul>
                            {session.reasoning.reasons.map((reason, index) => (
                              <li key={`${reason.kind}-${index}`} className={`guided-reason-${reason.kind}`}>
                                <b>{REASON_KIND_LABEL[reason.kind] || reason.kind}</b> {reason.text}
                              </li>
                            ))}
                          </ul>
                        </section>
                      )}
                      <p className="guided-why">{describeGuidedReason(session.reason, offer.name)}</p>
                      <div className="guided-actions">
                        <button type="button" ref={acceptRef} className="guided-accept" disabled={guidedLoading || guidedBuildLocked} onClick={() => { if (offer) rememberPickRole(offer.name); acceptGuidedOffer(); }}>
                          Add to my deck
                        </button>
                        <button type="button" aria-expanded={choosingReason} disabled={guidedLoading || guidedBuildLocked} onClick={() => setReasonsOpenFor(choosingReason ? null : `${session.categoryIndex}:${offer.name}`)}>
                          Not this one
                        </button>
                      </div>
                      {choosingReason && (
                        <div className="guided-decline-reasons" role="group" aria-label="Why not this card?">
                          <small>WHY NOT? THE NEXT SUGGESTIONS WILL ADAPT</small>
                          {DECLINE_REASONS.map((reason) => (
                            <button type="button" key={reason.id} disabled={guidedLoading || guidedBuildLocked} onClick={() => declineGuidedOffer(reason.id)}>
                              {reason.label}
                            </button>
                          ))}
                          <button type="button" className="guided-decline-skip" disabled={guidedLoading || guidedBuildLocked} onClick={() => declineGuidedOffer(null)}>
                            Just show me another
                          </button>
                        </div>
                      )}
                      {struggling && <p className="guided-hint">Not seeing it? Search for the card you want below.</p>}
                    </div>
                  </>
                ) : (
                  <div className="guided-empty">
                    <h2>{session.exhausted ? `No more ${guidedCategoryLabel(category).toLowerCase()} suggestions right now` : "Nothing to suggest yet"}</h2>
                    <p>
                      {session.declined.length
                        ? "You've seen everything the Forge would offer for this slot. Search for a card yourself, or move on."
                        : "The Forge has nothing more to suggest here. Search for a card yourself, or move on to the next step."}
                    </p>
                  </div>
                )}
              </article>
              )}

              <section className={`guided-search${struggling || !offer ? " emphasized" : ""}`}>
                <label>
                  <span>SEARCH LEGAL {format.toUpperCase()} CARDS IN YOUR COMMANDER&rsquo;S COLORS</span>
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search by card name…"
                  />
                </label>
                {searchState === "loading" && <p role="status">Searching legal cards…</p>}
                {searchState === "empty" && <p role="status">No matching cards within this build’s colors and preferences. Try another name.</p>}
                {searchState === "error" && <div role="alert"><p>Card search is unavailable. Your picks are safe.</p><button type="button" onClick={() => setSearchRetry((value) => value + 1)}>Retry card search</button></div>}
                {search.trim().length >= 2 && results.length > 0 && (
                  <div role="listbox">
                    {results.map((card) => (
                      <button
                        type="button"
                        role="option"
                        key={card.name}
                        disabled={guidedLoading || guidedBuildLocked || accepted.some((entry) => entry.toLocaleLowerCase("en") === card.name.toLocaleLowerCase("en"))}
                        onClick={() => {
                          rememberPickRole(card.name);
                          addGuidedManualCard(card.raw);
                          setSearch("");
                          setResults([]);
                        }}
                      >
                        <b>{card.name}</b>
                        <small>{card.typeLine}</small>
                        <i>＋</i>
                      </button>
                    ))}
                  </div>
                )}
              </section>

              {!finishing && (
                <div className="guided-nav">
                  <button type="button" className="guided-next" disabled={guidedLoading} onClick={finishGuidedCategory}>
                    {guidedBuildLocked ? "Check saved finish" : isLast ? "Done → choose your mana base" : `Done with ${guidedCategoryLabel(category).toLowerCase()} → next`}
                  </button>
                  {!isLast && (
                    <button type="button" className="guided-skip-all" disabled={guidedLoading || guidedBuildLocked} onClick={() => void enterGuidedFinish()}>
                      Skip to the mana base and open slots
                    </button>
                  )}
                </div>
              )}
            </div>

            <aside className="guided-side">
              {/* Answers apply to the very next suggestion, one at a time. */}
              <PlayerCompassCard
                value={playerCompass}
                signedIn={!guestMode}
                synced={playerCompassSynced}
                onChange={(next) => { void persistPlayerCompass(next); }}
              />
              {session.listAnalysis && <ListReview analysis={session.listAnalysis} />}
              {session.deckProfile && <DeckProfileCard profile={session.deckProfile} />}
              <section className="guided-ledger" aria-label="Budget ledger">
                <header>
                  <small>YOUR BUDGET SO FAR</small>
                  <p>Typical counts for your power level. These are guidance, never limits — you can always pick more or fewer.</p>
                </header>
                <ul>
                  {session.categories.map((id) => {
                    const row = session.ledger.find((entry) => entry.category === id);
                    return (
                      <li key={id} className={`guided-ledger-row ${row?.status || "no-target"}${id === category ? " current" : ""}`}>
                        <b>{guidedCategoryLabel(id)}</b>
                        <span>{row ? describeLedgerRow(row) : "0 picked"}</span>
                      </li>
                    );
                  })}
                </ul>
              </section>

              <section className="guided-picks" aria-label="Your picks">
                <header>
                  <small>YOUR PICKS · {accepted.length}</small>
                  <p>You&apos;ll choose your lands and fill any open slots together with the Forge before finishing. Nothing is added without you.</p>
                </header>
                {accepted.length > 0 && (
                  confirmingRestart ? (
                    <div className="guided-restart-confirm" role="group" aria-label="Confirm restart">
                      <p>Start over? Every pick you&rsquo;ve made will be discarded.</p>
                      <button type="button" className="guided-restart-yes" disabled={guidedLoading || guidedBuildLocked} onClick={() => { setConfirmingRestart(false); void startGuidedBuild(); }}>
                        Yes, start over
                      </button>
                      <button type="button" onClick={() => setConfirmingRestart(false)}>Cancel</button>
                    </div>
                  ) : (
                    <button type="button" className="guided-restart" disabled={guidedLoading || guidedBuildLocked} onClick={() => setConfirmingRestart(true)}>
                      Start this build over
                    </button>
                  )
                )}
                {accepted.length ? (
                  <div className="guided-pick-groups">
                    {groupedPicks.map((group) => (
                      <section key={group.id} className="guided-pick-group" aria-label={group.id === "other" ? "Other picks" : guidedCategoryLabel(group.id)}>
                        <h3>{group.id === "other" ? "Other picks" : guidedCategoryLabel(group.id)} <span>{group.names.length}</span></h3>
                        <ul>
                          {group.names.map((name) => (
                            <li key={name}>
                              <span>{name}</span>
                              <button type="button" disabled={guidedLoading || guidedBuildLocked} onClick={() => removeGuidedPick(name)} aria-label={`Remove ${name}`}>
                                ×
                              </button>
                            </li>
                          ))}
                        </ul>
                      </section>
                    ))}
                  </div>
                ) : (
                  <p className="guided-picks-empty">Nothing yet — accept a suggestion or search for a card.</p>
                )}
              </section>
            </aside>
          </div>
        </div>
      )}
    </section>
  );
}
