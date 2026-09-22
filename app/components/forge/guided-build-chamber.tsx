"use client";

import { useEffect, useRef, useState } from "react";
import { cardImage } from "../../card-art";
import { scryfallFormatTerms } from "../../format-catalog";
import { GUIDED_CATEGORY_COPY, describeGuidedReason, describeLedgerRow, guidedCategoryLabel } from "../../guided-reason-copy.mjs";
import { shellDisplay } from "../../shell-copy.mjs";
import { useForgeSession } from "../../forge-session-context";

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
    finishGuidedBuild,
    exitGuidedBuild,
  } = useForgeSession();

  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Array<{ name: string; typeLine: string; raw: Record<string, unknown> }>>([]);
  const [confirmingRestart, setConfirmingRestart] = useState(false);
  const acceptRef = useRef<HTMLButtonElement>(null);
  const searchSeq = useRef(0);

  const commanderColors = [...new Set([...(selectedCommander?.colors || []), ...(selectedSecondCommander?.colors || [])])];
  const identityClause = commanderColors.length ? `id<=${commanderColors.join("").toLowerCase()}` : "id:c";
  const accepted = session?.accepted || [];

  useEffect(() => {
    const term = search.replace(/["():]/g, " ").trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }
    // A slower response to an earlier keystroke can land after a faster
    // response to a later one — the debounce only stops an unstarted fetch,
    // not one already in flight. Tag each request and drop any response
    // that isn't for the search term still on screen, so a fast typist never
    // sees results for something they've already typed past.
    const seq = ++searchSeq.current;
    const timer = window.setTimeout(async () => {
      try {
        const query = encodeURIComponent(`${scryfallFormatTerms(format)} ${identityClause} ${term}`);
        const response = await fetch(`https://api.scryfall.com/cards/search?q=${query}&order=edhrec`);
        const data = await response.json();
        if (seq !== searchSeq.current) return;
        setResults(
          (data.data || [])
            .slice(0, 6)
            // raw carries the whole Scryfall card so it can be sent to the
            // guided endpoint for real classification if the player adds it
            // (see addGuidedManualCard) — never re-derived from just a name.
            .map((card: { name: string; type_line?: string }) => ({ name: card.name, typeLine: card.type_line || "Card", raw: card })),
        );
      } catch {
        if (seq === searchSeq.current) setResults([]);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search, format, identityClause]);

  // The buttons disable while a request is in flight, which drops keyboard
  // focus to the page body. When the next offer lands, put focus back on
  // "Add to my deck" — but only if focus is homeless, so typing in the
  // search box is never interrupted.
  const offerName = session?.offer?.name;
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
  const isLast = session ? session.categoryIndex + 1 >= session.categories.length : false;
  const struggling = (session?.declined.length || 0) >= 3;

  return (
    <section className="commission-chamber guided-chamber">
      <div className="commission-chamber-sweep" aria-hidden="true" />
      <button className="back-link" onClick={exitGuidedBuild}>
        ← Back to shell choice
      </button>
      {/* The commission chamber's sticky heading card carries a fixed
          "YOUR BLUEPRINT" blurb in CSS; data-summary swaps in this build's
          own commander, shell and pick count (see .guided-chamber rule). */}
      <div
        className="commission-heading"
        data-summary={`${selectedCommander?.name || "Your commander"}${selectedShell ? ` · ${shellDisplay(selectedShell).name}` : ""}\n${accepted.length} ${accepted.length === 1 ? "card" : "cards"} picked so far`}
      >
        <span className="forge-eyebrow">
          <i /> GUIDED BUILD{session ? ` · STEP ${session.categoryIndex + 1} OF ${session.categories.length}` : ""}
        </span>
        <h1>{session ? copy?.label || guidedCategoryLabel(category) : guidedError ? "The guided build stopped" : "Reading your commander…"}</h1>
        <p>
          {session
            ? copy?.blurb
            : guidedError
              ? "Nothing you chose has been lost. You can start the guided build again or go back to your shell choice."
              : "The Forge is gathering every legal card for this commander and reading what each one does. This takes a moment, and only happens once."}
        </p>
      </div>

      {guidedError && (
        <div className="guided-error" role="alert">
          <p>{guidedError}</p>
          <div>
            <button type="button" onClick={() => void startGuidedBuild()}>Start the guided build again</button>
            <button type="button" onClick={exitGuidedBuild}>Back</button>
          </div>
        </div>
      )}

      {!session && !guidedError && (
        <p className="guided-loading" role="status">Building your card pool…</p>
      )}

      {session && (
        <div className="commission-scroll guided-body">
          <ol className="guided-steps" aria-label="Build categories">
            {session.categories.map((id, index) => {
              const state = index < session.categoryIndex ? "done" : index === session.categoryIndex ? "current" : "upcoming";
              return (
                <li key={id} className={`guided-step ${state}`}>
                  <button type="button" disabled={guidedLoading} onClick={() => goToGuidedCategory(index)} aria-current={state === "current" ? "step" : undefined}>
                    <span>{index + 1}</span>
                    {guidedCategoryLabel(id)}
                  </button>
                </li>
              );
            })}
          </ol>

          <div className="guided-grid">
            <div className="guided-main">
              <article className="guided-offer" aria-live="polite" aria-busy={guidedLoading}>
                {offer ? (
                  <>
                    <img src={cardImage(offer.name)} alt={offer.name} loading="lazy" />
                    <div>
                      <small>THE FORGE SUGGESTS</small>
                      <h2>{offer.name}</h2>
                      <em>{offer.typeLine}{offer.manaCost ? ` · ${offer.manaCost}` : ""}</em>
                      {offer.oracleText && (
                        <details className="guided-oracle">
                          <summary>Read the card text</summary>
                          <p>{offer.oracleText}</p>
                        </details>
                      )}
                      <p className="guided-why">{describeGuidedReason(session.reason, offer.name)}</p>
                      <div className="guided-actions">
                        <button type="button" ref={acceptRef} className="guided-accept" disabled={guidedLoading} onClick={acceptGuidedOffer}>
                          Add to my deck
                        </button>
                        <button type="button" disabled={guidedLoading} onClick={declineGuidedOffer}>
                          Show me another
                        </button>
                      </div>
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

              <section className={`guided-search${struggling || !offer ? " emphasized" : ""}`}>
                <label>
                  <span>SEARCH LEGAL {format.toUpperCase()} CARDS IN YOUR COMMANDER'S COLORS</span>
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search by card name…"
                  />
                </label>
                {search.trim().length >= 2 && results.length > 0 && (
                  <div role="listbox">
                    {results.map((card) => (
                      <button
                        type="button"
                        role="option"
                        key={card.name}
                        disabled={guidedLoading || accepted.some((entry) => entry.toLocaleLowerCase("en") === card.name.toLocaleLowerCase("en"))}
                        onClick={() => {
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

              <div className="guided-nav">
                <button type="button" className="guided-next" disabled={guidedLoading} onClick={finishGuidedCategory}>
                  {isLast ? "Finish — the Forge fills the rest" : `Done with ${guidedCategoryLabel(category).toLowerCase()} → next`}
                </button>
                {!isLast && (
                  <button type="button" className="guided-skip-all" disabled={guidedLoading} onClick={() => finishGuidedBuild(true)}>
                    Skip ahead — let the Forge finish from here
                  </button>
                )}
              </div>
            </div>

            <aside className="guided-side">
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
                  <p>Lands and any slots you leave open are filled by the Forge when you finish, and you can edit everything after.</p>
                </header>
                {accepted.length > 0 && (
                  confirmingRestart ? (
                    <div className="guided-restart-confirm" role="group" aria-label="Confirm restart">
                      <p>Start over? Every pick you've made will be discarded.</p>
                      <button type="button" className="guided-restart-yes" disabled={guidedLoading} onClick={() => { setConfirmingRestart(false); void startGuidedBuild(); }}>
                        Yes, start over
                      </button>
                      <button type="button" onClick={() => setConfirmingRestart(false)}>Cancel</button>
                    </div>
                  ) : (
                    <button type="button" className="guided-restart" disabled={guidedLoading} onClick={() => setConfirmingRestart(true)}>
                      Start this build over
                    </button>
                  )
                )}
                {accepted.length ? (
                  <ul>
                    {accepted.map((name) => (
                      <li key={name}>
                        <span>{name}</span>
                        <button type="button" disabled={guidedLoading} onClick={() => removeGuidedPick(name)} aria-label={`Remove ${name}`}>
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
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
