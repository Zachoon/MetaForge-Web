"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { cardArtCrop } from "../../card-art";
import {
  isCommanderFormat,
  scryfallFormatTerms,
} from "../../format-catalog";
import { blueprintDefinition } from "../../deck-row-helpers";
import { occupancyLabelsForOption } from "../../commander-lane-scoring.mjs";
import { useForgeSession } from "../../forge-session-context";

export function CommissionChamber() {
  const {
    chamber,
    setChamber,
    buildPath,
    format,
    setFormat,
    setSelectedCommander,
    setCommanderQuery,
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
    guestMode,
    turnstileToken,
    awaken,
    revealOccupancyLabels,
  } = useForgeSession();

  const [scratchSearch, setScratchSearch] = useState("");
  const [scratchResults, setScratchResults] = useState<Array<{ name: string; typeLine: string }>>([]);
  const isScratch = chamber === "refine" && buildPath === "scratch";
  const isComplete = chamber === "refine" && buildPath === "complete";
  const deckCardCount = deck.split(/\r?\n/).reduce((total, line) => {
    const match = line.trim().match(/^(\d+)\s+/);
    return total + (match ? Number(match[1]) : line.trim() ? 1 : 0);
  }, 0);

  useEffect(() => {
    if (!isScratch || scratchSearch.trim().length < 2) return;
    const timer = window.setTimeout(async () => {
      try {
        const query = encodeURIComponent(`${scryfallFormatTerms(format)} name:${scratchSearch.trim()}`);
        const response = await fetch(`https://api.scryfall.com/cards/search?q=${query}&order=edhrec`);
        const data = await response.json();
        setScratchResults((data.data || []).slice(0, 6).map((card: { name: string; type_line?: string }) => ({ name: card.name, typeLine: card.type_line || "Card" })));
      } catch {
        setScratchResults([]);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [format, isScratch, scratchSearch]);

  function addScratchCard(name: string) {
    setDeck((current) => `${current.trim()}${current.trim() ? "\n" : ""}1 ${name}`);
    setScratchSearch("");
    setScratchResults([]);
  }

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
          {isScratch ? "BUILD A DECK · EMPTY WORKSPACE" : isComplete ? "COMPLETE A DECK · IMPORT YOUR LIST" : "DISCOVER A DECK · FORMAT + COMMANDER"}
        </span>
        <h1>
          {isScratch ? "Start with any card." : isComplete ? "Bring the deck you already started." : "What do you want to play?"}
        </h1>
        <p>
          {isScratch ? "Search and add cards into a clean list. When you want help, the Forge can complete the legal slots around what you chose." : isComplete ? "Paste a full or partial list. The Forge reads its existing plan, keeps the pieces that belong, and fills the missing legal slots." : "Choose a format. For Commander formats, bring a commander or let the Forge suggest one using your Player Compass."}
        </p>
      </div>
      <div className={`commission-scroll build-path-${buildPath}`}>
        {chamber === "refine" && (
          <label className="deck-offering">
            <span>{isScratch ? `YOUR DECKLIST · ${deckCardCount} CARDS` : "YOUR CURRENT OR PARTIAL DECKLIST"}</span>
            <textarea
              value={deck}
              onChange={(event) => setDeck(event.target.value)}
              placeholder={isScratch ? "Your cards will appear here…\n1 Sol Ring\n1 Command Tower" : "Paste your Arena, MTGO, Archidekt, or Moxfield list here…"}
            />
          </label>
        )}
        {isScratch && (
          <div className="scratch-card-search">
            <label><span>SEARCH LEGAL {format.toUpperCase()} CARDS</span><input type="search" value={scratchSearch} onChange={(event) => setScratchSearch(event.target.value)} placeholder="Search by card name…" /></label>
            {scratchSearch.trim().length >= 2 && scratchResults.length > 0 && <div role="listbox">{scratchResults.map((card) => <button type="button" role="option" key={card.name} onClick={() => addScratchCard(card.name)}><b>{card.name}</b><small>{card.typeLine}</small><i>＋</i></button>)}</div>}
          </div>
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
                  <button
                    type="button"
                    disabled={randomizingCommander}
                    onClick={chooseRandomCommander}
                  >
                    {randomizingCommander
                      ? "Finding commanders…"
                      : selectedCommander ? "Choose another for me" : "Suggest a commander for me"}
                  </button>
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
          <strong>{isScratch ? "COMPLETE THIS DECK" : isComplete ? "COMPLETE MY DECKLIST" : "BUILD MY DECK"}</strong>
          <b>→</b>
        </button>
        {revealOccupancyLabels.length > 0 && (
          <p className="awaken-occupancy">
            Occupancy engines: {revealOccupancyLabels.join(" · ")}. Named from commander oracle, before the 99 exists.
          </p>
        )}
      </div>
    </section>
  );
}
