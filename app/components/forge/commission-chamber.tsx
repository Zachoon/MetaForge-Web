"use client";

import { createPortal } from "react-dom";
import { cardArtCrop } from "../../card-art";
import {
  isCommanderFormat,
  commissionHeadingFor,
  buildStepLabelsFor,
} from "../../format-catalog";
import { blueprintDefinition } from "../../deck-row-helpers";
import { occupancyLabelsForOption } from "../../commander-lane-scoring.mjs";
import { REVIEW_FOCUS_OPTIONS, REVIEW_FOCUS_LABELS, toggleReviewFocus } from "../../review-focus.mjs";
import { useForgeSession } from "../../forge-session-context";

export function CommissionChamber() {
  const {
    chamber,
    setChamber,
    buildStep,
    setBuildStep,
    format,
    setFormat,
    setSelectedCommander,
    setCommanderQuery,
    strategy,
    setStrategy,
    complexity,
    setComplexity,
    budget,
    setBudget,
    maxCardPriceInput,
    setMaxCardPriceInput,
    commonsOnly,
    setCommonsOnly,
    targetPowerTier,
    setTargetPowerTier,
    selectedCommander,
    commissionOccupancyLabels,
    commanderSearchRef,
    commanderSearchOpen,
    setCommanderSearchOpen,
    commanderSearching,
    commanderSearchError,
    commanderResults,
    commanderSearchRect,
    setCommanderSearchRetry,
    randomizingCommander,
    chooseRandomCommander,
    randomCommanderOptions,
    setRandomCommanderOptions,
    selectCommander,
    commanderQuery,
    secondCommanderSearchRef,
    partnerEligibility,
    selectedSecondCommander,
    setSelectedSecondCommander,
    secondCommissionOccupancyLabels,
    secondCommanderQuery,
    setSecondCommanderQuery,
    secondCommanderDropdownOpen,
    secondCommanderSearchRect,
    secondCommanderSearching,
    secondCommanderResults,
    setSecondCommanderResults,
    deck,
    setDeck,
    reviewFocus,
    setReviewFocus,
    commissionNote,
    setCommissionNote,
    guestMode,
    turnstileToken,
    awaken,
    revealOccupancyLabels,
  } = useForgeSession();

  return (
    <section className="commission-chamber">
      {/* A decorative sibling, not an ancestor: the sweep animation needs
          its own overflow:hidden so it doesn't bleed past the chamber's
          edges, but putting that on the chamber itself clipped the
          commander-search results dropdown, which must render below the
          input regardless of how tall the chamber's own box is. */}
      <div className="commission-chamber-sweep" aria-hidden="true" />
      <button className="back-link" onClick={() => setChamber("entrance")}>
        ← Back to start
      </button>
      <div className="commission-heading">
        <span className="forge-eyebrow">
          <i />{" "}
          {chamber === "commission"
            ? "BUILD A DECK · YOUR CHOICES"
            : "REVIEW A DECK · PASTE YOUR LIST"}
        </span>
        <h1>
          {chamber === "commission"
            ? commissionHeadingFor(format)
            : "Paste the deck you want to improve."}
        </h1>
        <p>
          {chamber === "commission"
            ? "Start with the two choices that matter. Preferences are optional, and you can change them later."
            : "MetaForge keeps what works, checks the list, and suggests one clear change at a time."}
        </p>
      </div>
      <div className={`commission-scroll build-step-${buildStep}`}>
        {chamber === "commission" && (
          <nav className="build-stepper" aria-label="Deck setup progress">
            {buildStepLabelsFor(format).map((label, index) => (
              <button type="button" key={label} className={buildStep === index ? "current" : buildStep > index ? "complete" : ""} aria-current={buildStep === index ? "step" : undefined} disabled={index > buildStep} onClick={() => index < buildStep && setBuildStep(index as 0 | 1 | 2)}>
                <i>{buildStep > index ? "✓" : index + 1}</i><span>{label}</span>
              </button>
            ))}
          </nav>
        )}
        {chamber === "refine" && (
          <label className="deck-offering">
            <span>1 · YOUR CURRENT DECKLIST</span>
            <textarea
              value={deck}
              onChange={(event) => setDeck(event.target.value)}
              placeholder="Paste your Arena, MTGO, or Moxfield list here…"
            />
          </label>
        )}
        {chamber === "refine" && (
          <div className="review-required-heading">
            <span>2 · CONFIRM THE BASICS</span>
            <p>We only need the format, game plan, and commander to begin. The rest is optional.</p>
          </div>
        )}
        {chamber === "refine" && (
          <details className="review-preferences-disclosure">
            <summary>
              <span><b>Fine-tune the review</b><small>Optional · complexity, budget, price limits, rarity, and power</small></span>
              <i aria-hidden="true">+</i>
            </summary>
            <p>Use these only when the deck must follow a specific table, budget, or power constraint.</p>
          </details>
        )}
        <div className="mark-grid">
          <label className="build-choice-format">
            <span>
              FORMAT
              <button type="button" className="blueprint-glossary-tip" data-definition={blueprintDefinition("format", format)} aria-label={`Explain ${format}`}>?</button>
            </span>
            <select
              aria-describedby="format-definition"
              value={format}
              onChange={(event) => {
                setFormat(event.target.value);
                setSelectedCommander(null);
                setCommanderQuery("");
              }}
            >
              <option>Standard</option>
              <option>Brawl</option>
              <option>Standard Brawl</option>
              <option>Commander</option>
              <option>Modern</option>
              <option>Premodern</option>
              <option>Pioneer</option>
              <option>Historic</option>
            </select>
            <small id="format-definition" className="blueprint-choice-definition">{blueprintDefinition("format", format)}</small>
          </label>
          <label className="build-choice-strategy">
            <span>
              STRATEGY
              <button type="button" className="blueprint-glossary-tip" data-definition={blueprintDefinition("strategy", strategy)} aria-label={`Explain ${strategy}`}>?</button>
            </span>
            <select
              aria-describedby="strategy-definition"
              value={strategy}
              onChange={(event) => setStrategy(event.target.value)}
            >
              <option>Aggressive pressure</option>
              <option>Balanced midrange</option>
              <option>Reactive control</option>
              <option>Synergy and combo</option>
              <option>Tempo and disruption</option>
            </select>
            <small id="strategy-definition" className="blueprint-choice-definition">{blueprintDefinition("strategy", strategy)}</small>
          </label>
          <label className="build-choice-preference">
            <span>
              COMPLEXITY
              <button type="button" className="blueprint-glossary-tip" data-definition={blueprintDefinition("complexity", complexity)} aria-label={`Explain ${complexity} complexity`}>?</button>
            </span>
            <select aria-describedby="complexity-definition" value={complexity} onChange={(event) => setComplexity(event.target.value)}>
              <option>Accessible</option>
              <option>Balanced</option>
              <option>Technical</option>
              <option>Maximum depth</option>
            </select>
            <small id="complexity-definition" className="blueprint-choice-definition">{blueprintDefinition("complexity", complexity)}</small>
          </label>
          <label className="build-choice-preference">
            <span>
              BUDGET
              <button type="button" className="blueprint-glossary-tip" data-definition={blueprintDefinition("budget", budget)} aria-label={`Explain ${budget}`}>?</button>
            </span>
            <select aria-describedby="budget-definition" value={budget} onChange={(event) => setBudget(event.target.value)}>
              <option>No strict limit</option>
              <option>Budget conscious</option>
              <option>Moderate investment</option>
              <option>Competitive optimization</option>
            </select>
            <small id="budget-definition" className="blueprint-choice-definition">{blueprintDefinition("budget", budget)}</small>
          </label>
          <label className="build-choice-preference">
            <span>
              MAX PRICE PER CARD
              <button type="button" className="blueprint-glossary-tip" data-definition="A hard $ ceiling — no card in the build will ever cost more than this, at its cheapest known printing. Leave blank for no limit. A card with no known price is never excluded." aria-label="Explain max price per card">?</button>
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              placeholder="No limit"
              value={maxCardPriceInput}
              onChange={(event) => setMaxCardPriceInput(event.target.value)}
            />
            <small className="blueprint-choice-definition">A hard cap on price per card. Combine with Commons Only for a Pauper-style build.</small>
          </label>
          <label className="blueprint-checkbox-field build-choice-preference">
            <span>
              COMMONS ONLY
              <button type="button" className="blueprint-glossary-tip" data-definition="Only common-rarity cards are eligible, including nonbasic lands — a hard restriction, the same rarity rule Pauper-style formats use. A card with no known rarity is never excluded." aria-label="Explain commons only">?</button>
            </span>
            <input type="checkbox" checked={commonsOnly} onChange={(event) => setCommonsOnly(event.target.checked)} />
            <small className="blueprint-choice-definition">Restricts every card, including nonbasic lands, to common rarity.</small>
          </label>
          {isCommanderFormat(format) && (
            <label className="build-choice-preference">
              <span>
                TARGET POWER TIER
                <button type="button" className="blueprint-glossary-tip" data-definition={blueprintDefinition("targetPowerTier", targetPowerTier)} aria-label={`Explain ${targetPowerTier || "No preference"} target power tier`}>?</button>
              </span>
              <select aria-describedby="power-tier-definition" value={targetPowerTier} onChange={(event) => setTargetPowerTier(event.target.value)}>
                <option value="">No preference</option>
                <option>Casual</option>
                <option>Focused</option>
                <option>High-Power</option>
                <option>Maximum</option>
              </select>
              <small id="power-tier-definition" className="blueprint-choice-definition">{blueprintDefinition("targetPowerTier", targetPowerTier)} A target, not a guarantee — the deck's actual power tier is always reported honestly.</small>
            </label>
          )}
        </div>
        {isCommanderFormat(format) && (
          <section className="commander-blueprint build-choice-commander">
            <header>
              <div>
                <span>COMMANDER · LEGAL {format.toUpperCase()} INDEX</span>
                <strong>
                  {selectedCommander
                    ? "Commander selected"
                    : chamber === "refine"
                      ? "Confirm the commander from your list"
                      : "Choose a legend—or let the Forge discover one"}
                </strong>
              </div>
              {selectedCommander && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCommander(null);
                    setCommanderQuery("");
                  }}
                >
                  Change
                </button>
              )}
            </header>
            {selectedCommander ? (
              <article>
                <img
                  className="commander-art-crop"
                  src={cardArtCrop(selectedCommander.name)}
                  alt=""
                />
                <div>
                  <b>{selectedCommander.name}</b>
                  <span>{selectedCommander.typeLine}</span>
                  <em>
                    {selectedCommander.colors.length
                      ? selectedCommander.colors.join(" · ")
                      : "COLORLESS"}{" "}
                    IDENTITY
                  </em>
                  {commissionOccupancyLabels.length > 0 && (
                    <small className="commander-occupancy">
                      Occupancy engines: {commissionOccupancyLabels.join(" · ")}. Named from commander oracle, before the 99 exists.
                    </small>
                  )}
                </div>
              </article>
            ) : (
              <div
                className="commander-search"
                ref={commanderSearchRef}
                onBlur={(event) => {
                  // The results listbox is portaled to <body> now (see
                  // commanderSearchRect above), so a click on an option
                  // moves focus to an element this box no longer
                  // contains in the DOM tree — check the portal too, or
                  // every option click would blur-close the dropdown
                  // before its own onClick had a chance to fire.
                  const related = event.relatedTarget as Node | null;
                  const inPortal =
                    related instanceof HTMLElement &&
                    related.closest(".commander-search-portal");
                  if (!event.currentTarget.contains(related) && !inPortal) {
                    setCommanderSearchOpen(false);
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setCommanderSearchOpen(false);
                    event.currentTarget.querySelector("input")?.blur();
                  }
                }}
              >
                <div className="commander-choice">
                  <input
                    value={commanderQuery}
                    onFocus={() => setCommanderSearchOpen(true)}
                    onChange={(event) => {
                      setCommanderQuery(event.target.value);
                      setCommanderSearchOpen(true);
                    }}
                    placeholder={
                      chamber === "refine"
                        ? `Search for the commander from your list…`
                        : `Search legal ${format} commanders…`
                    }
                    aria-label={`Search legal ${format} commanders`}
                  />
                  {chamber !== "refine" && (
                  <button
                    type="button"
                    disabled={randomizingCommander}
                    onClick={chooseRandomCommander}
                  >
                    {randomizingCommander
                      ? "Finding commanders…"
                      : "Suggest a commander for me"}
                  </button>
                  )}
                </div>
                {randomCommanderOptions.length > 0 && (
                  <div className="commander-suggestions" role="group" aria-label="Suggested commanders">
                    <p>The Forge drew three legal options. Pick one to continue — nothing is chosen yet.</p>
                    <div className="commander-suggestions-grid">
                      {randomCommanderOptions.map((option) => {
                        const occupancy = occupancyLabelsForOption(option);
                        return (
                        <button
                          type="button"
                          key={option.name}
                          className="commander-suggestion-card"
                          onClick={() => selectCommander(option)}
                        >
                          {option.image ? (
                            <img src={option.image} alt="" />
                          ) : (
                            "◆"
                          )}
                          <b>
                            {option.name}
                            <small>{option.typeLine}</small>
                          </b>
                          <em>{option.colors.join("") || "C"}</em>
                          {occupancy.length > 0 && (
                            <small className="commander-occupancy">{occupancy.join(" · ")}</small>
                          )}
                        </button>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      className="commander-suggestions-dismiss"
                      onClick={() => setRandomCommanderOptions([])}
                    >
                      None of these — search instead
                    </button>
                  </div>
                )}
                {commanderSearchOpen && (commanderSearching ||
                  commanderSearchError ||
                  commanderResults.length > 0 ||
                  commanderQuery.trim().length > 1) &&
                  commanderSearchRect &&
                  createPortal(
                    <div
                      role="listbox"
                      className="commander-search-portal"
                      style={{
                        position: "fixed",
                        top: commanderSearchRect.top,
                        left: commanderSearchRect.left,
                        width: commanderSearchRect.width,
                        maxHeight: commanderSearchRect.maxHeight,
                      }}
                    >
                      {commanderSearching ? (
                        <p>The Archive is searching…</p>
                      ) : commanderSearchError ? (
                        <div className="commander-search-recovery" role="status">
                          <p>{commanderSearchError}</p>
                          <button type="button" onClick={() => setCommanderSearchRetry((value) => value + 1)}>Retry commander search</button>
                        </div>
                      ) : commanderResults.length ? (
                        commanderResults.map((option) => {
                          const occupancy = occupancyLabelsForOption(option);
                          return (
                          <button
                            type="button"
                            role="option"
                            key={option.name}
                            // Touch browsers can blur the search input with
                            // relatedTarget === null before synthesizing the
                            // click. The blur handler would then close and
                            // unmount this portal, swallowing the player's
                            // tap. Keep focus in place until click selects
                            // the option; keyboard activation still uses the
                            // normal click path.
                            onPointerDown={(event) => event.preventDefault()}
                            onClick={() => selectCommander(option)}
                          >
                            <span>
                              {option.image ? (
                                <img src={option.image} alt="" />
                              ) : (
                                "◆"
                              )}
                            </span>
                            <b>
                              {option.name}
                              <small>{option.typeLine}</small>
                              {occupancy.length > 0 && (
                                <small className="commander-occupancy">{occupancy.join(" · ")}</small>
                              )}
                            </b>
                            <em>{option.colors.join("") || "C"}</em>
                          </button>
                          );
                        })
                      ) : (
                        <p>
                          No legal {format} commander matches that search.
                        </p>
                      )}
                    </div>,
                    document.body,
                  )}
              </div>
            )}
            {selectedCommander && partnerEligibility && (
              <div className="commander-search" ref={secondCommanderSearchRef}>
                <span>
                  OPTIONAL ·{" "}
                  {partnerEligibility.kind === "background"
                    ? "CHOOSE A BACKGROUND"
                    : "CHOOSE A PARTNER"}
                </span>
                {selectedSecondCommander ? (
                  <article>
                    <img src={selectedSecondCommander.image} alt="" />
                    <div>
                      <b>{selectedSecondCommander.name}</b>
                      <span>{selectedSecondCommander.typeLine}</span>
                      {secondCommissionOccupancyLabels.length > 0 && (
                        <small className="commander-occupancy">
                          Occupancy engines: {secondCommissionOccupancyLabels.join(" · ")}. Named from commander oracle, before the 99 exists.
                        </small>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSecondCommander(null);
                        setSecondCommanderQuery("");
                      }}
                    >
                      Change
                    </button>
                  </article>
                ) : (
                  <>
                    {partnerEligibility.kind !== "partner-with" && (
                      <div className="commander-choice">
                        <input
                          value={secondCommanderQuery}
                          onChange={(event) =>
                            setSecondCommanderQuery(event.target.value)
                          }
                          placeholder={
                            partnerEligibility.kind === "background"
                              ? "Search legal Backgrounds…"
                              : "Search legal Partner commanders…"
                          }
                          aria-label={
                            partnerEligibility.kind === "background"
                              ? "Search legal Backgrounds"
                              : "Search legal Partner commanders"
                          }
                        />
                      </div>
                    )}
                    {secondCommanderDropdownOpen &&
                      secondCommanderSearchRect &&
                      createPortal(
                        <div
                          role="listbox"
                          className="commander-search-portal"
                          style={{
                            position: "fixed",
                            top: secondCommanderSearchRect.top,
                            left: secondCommanderSearchRect.left,
                            width: secondCommanderSearchRect.width,
                            maxHeight: secondCommanderSearchRect.maxHeight,
                          }}
                        >
                          {secondCommanderSearching ? (
                            <p>The Archive is searching…</p>
                          ) : (
                            secondCommanderResults.map((option) => {
                              const occupancy = occupancyLabelsForOption(option);
                              return (
                              <button
                                type="button"
                                role="option"
                                key={option.name}
                                onClick={() => {
                                  setSelectedSecondCommander(option);
                                  setSecondCommanderQuery(option.name);
                                  setSecondCommanderResults([]);
                                }}
                              >
                                <span>
                                  {option.image ? (
                                    <img src={option.image} alt="" />
                                  ) : (
                                    "◆"
                                  )}
                                </span>
                                <b>
                                  {option.name}
                                  <small>{option.typeLine}</small>
                                  {occupancy.length > 0 && (
                                    <small className="commander-occupancy">{occupancy.join(" · ")}</small>
                                  )}
                                </b>
                                <em>{option.colors.join("") || "C"}</em>
                              </button>
                              );
                            })
                          )}
                        </div>,
                        document.body,
                      )}
                  </>
                )}
              </div>
            )}
          </section>
        )}
        {chamber === "refine" ? (
          <details className="review-context-disclosure">
            <summary>
              <span><b>3 · Tell us what feels wrong</b><small>Optional · helps the coach focus its first answer</small></span>
              <i aria-hidden="true">+</i>
            </summary>
            <div className="review-focus-picker">
              <p id="review-focus-question">WHAT’S HAPPENING WHEN YOU PLAY THIS DECK?</p>
              <div className="review-focus-chips" role="group" aria-labelledby="review-focus-question">
                {REVIEW_FOCUS_OPTIONS.map((option) => (
                  <button type="button" key={option} className={reviewFocus === option ? "review-focus-chip is-selected" : "review-focus-chip"} aria-pressed={reviewFocus === option} onClick={() => setReviewFocus((current) => toggleReviewFocus(current, option))}>
                    {REVIEW_FOCUS_LABELS[option]}
                  </button>
                ))}
              </div>
              <p className="review-focus-academy-link">Not sure what the problem is? That is a valid starting point—or <a href="/academy">browse the guides →</a></p>
            </div>
            <label className="commission-note">
              <span>ANYTHING THE COACH SHOULD PRESERVE OR AVOID?</span>
              <textarea value={commissionNote} onChange={(event) => setCommissionNote(event.target.value)} placeholder="Favorite cards, play patterns you love, or anything this deck must never become…" />
            </label>
          </details>
        ) : (
          <label className="commission-note">
            <span>OPTIONAL · CARDS OR PLAY STYLES YOU WANT</span>
            <textarea value={commissionNote} onChange={(event) => setCommissionNote(event.target.value)} placeholder="Favorite cards, play patterns you love, or anything this deck must never become…" />
          </label>
        )}
        {chamber === "commission" && buildStep < 2 && (
          <div className="build-step-actions">
            {buildStep > 0 && <button type="button" className="build-back" onClick={() => setBuildStep((buildStep - 1) as 0 | 1)}>← Back</button>}
            <button type="button" className="build-next" disabled={buildStep === 0 && isCommanderFormat(format) && !selectedCommander} onClick={() => setBuildStep((buildStep + 1) as 1 | 2)}>
              {buildStep === 0 ? "Next · Choose strategy →" : "Next · Optional preferences →"}
            </button>
          </div>
        )}
        {chamber === "commission" && buildStep === 2 && (
          <button type="button" className="build-back build-final-back" onClick={() => setBuildStep(1)}>← Back to strategy</button>
        )}
        <button
          className="awaken-button"
          data-block-reason={
            isCommanderFormat(format) && !selectedCommander
              ? "commander"
              : guestMode && !turnstileToken
                ? "verification"
                : chamber === "refine" && !deck.trim()
                  ? "deck"
                  : ""
          }
          disabled={
            (chamber === "refine" && !deck.trim()) ||
            (isCommanderFormat(format) && !selectedCommander) ||
            (guestMode && !turnstileToken)
          }
          onClick={awaken}
        >
          <span>
            {isCommanderFormat(format) && !selectedCommander
              ? "Choose a legal commander to continue"
              : guestMode && !turnstileToken
                ? "Confirm you're human above, then build your deck"
                : "Your choices are ready"}
          </span>
          <strong>{chamber === "refine" ? "REVIEW MY DECK" : "BUILD MY COMPLETE DECK"}</strong>
          <b>→</b>
        </button>
        {(chamber !== "commission" || buildStep === 2) && revealOccupancyLabels.length > 0 && (
          <p className="awaken-occupancy">
            Occupancy engines: {revealOccupancyLabels.join(" · ")}. Named from commander oracle, before the 99 exists.
          </p>
        )}
      </div>
    </section>
  );
}
