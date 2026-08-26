"use client";

import { cardFactKey } from "../../deck-row-helpers";
import { buildTcgplayerLink } from "../../affiliate-links.mjs";
import { useForgeSession } from "../../forge-session-context";

export function WorkbenchEditorChamber() {
  const {
    guestMode,
    format,
    nativeMasterworkContext,
    cheapestPrintings,
    setCheapestPrintings,
    printingOverrides,
    setPrintingOverrides,
    printingMenu,
    setPrintingMenu,
    printingOptions,
    printingOptionsLoading,
    tcgplayerAffiliateEnabled,
    cardSearch,
    setCardSearch,
    cardSearchResults,
    consideringCards,
    setConsideringCards,
    removedCards,
    setRemovedCards,
    editAnvilOpen,
    setEditAnvilOpen,
    replacementRecommendations,
    setReplacementRecommendations,
    replacementLoading,
    replacementError,
    setReplacementError,
    lastCutCard,
    setLastCutCard,
    deckRows,
    deckPriceTotal,
    stageDeckCard,
    addCardToDeck,
    recommendReplacements,
  } = useForgeSession();

  return (
    <>
      {deckRows.length > 0 && (
        <>
          <div className="deck-price-bar" role="status" aria-label="Deck market price total">
            <span>
              <small>MARKET TOTAL</small>
              <strong>${deckPriceTotal.total.toFixed(2)}</strong>
            </span>
            {nativeMasterworkContext?.powerSignal && (
              <span title={nativeMasterworkContext.powerSignal.note}>
                <small>{nativeMasterworkContext.requestedPowerTier ? `POWER SIGNAL · TARGETED ${nativeMasterworkContext.requestedPowerTier.toUpperCase()}` : "POWER SIGNAL"}</small>
                <strong>{nativeMasterworkContext.powerSignal.assessedRange?.length > 1 ? nativeMasterworkContext.powerSignal.assessedRange.join("–") : nativeMasterworkContext.powerSignal.tier}</strong>
                {nativeMasterworkContext.powerSignal.confidence && <small>{nativeMasterworkContext.powerSignal.confidence.toUpperCase()} CONFIDENCE</small>}
              </span>
            )}
            {deckPriceTotal.unpricedCards > 0 && (
              <em>
                {deckPriceTotal.unpricedCards} card{deckPriceTotal.unpricedCards === 1 ? "" : "s"} without price data
              </em>
            )}
            <button
              type="button"
              className={`cheapest-printings-toggle${cheapestPrintings ? " active" : ""}`}
              aria-pressed={cheapestPrintings}
              title="Price every card at its cheapest fetched printing, to see the deck regardless of bling"
              onClick={() => setCheapestPrintings((current) => !current)}
            >
              Compare Printings
            </button>
          </div>
          {printingMenu && (
            <div
              className="printing-picker"
              style={{ left: printingMenu.x, top: printingMenu.y }}
              onClick={(event) => event.stopPropagation()}
              onContextMenu={(event) => event.preventDefault()}
            >
              <header>
                <b>{printingMenu.name}</b>
                <span>Choose a printing</span>
              </header>
              {printingOverrides[cardFactKey(printingMenu.name)] && (
                <button
                  type="button"
                  className="printing-picker-reset"
                  onClick={() => {
                    const key = cardFactKey(printingMenu.name);
                    setPrintingOverrides((current) => {
                      const next = { ...current };
                      delete next[key];
                      return next;
                    });
                    setPrintingMenu(null);
                  }}
                >
                  Use default printing
                </button>
              )}
              {printingOptionsLoading ? (
                <p>Loading printings…</p>
              ) : printingOptions.length === 0 ? (
                <p>No other printings found.</p>
              ) : (
                <ul>
                  {printingOptions.map((option) => {
                    const optionPurchaseLink = buildTcgplayerLink({
                      cardName: printingMenu.name,
                      tcgplayerProductId: option.tcgplayerId,
                      enabled: tcgplayerAffiliateEnabled,
                    });
                    return (
                      <li key={option.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setPrintingOverrides((current) => ({
                              ...current,
                              [cardFactKey(printingMenu.name)]: option,
                            }));
                            setPrintingMenu(null);
                          }}
                        >
                          {option.image && <img src={option.image} alt="" />}
                          <span>
                            <b>{option.setName}</b>
                            <small>
                              {option.setCode} · #{option.collectorNumber}
                            </small>
                          </span>
                          <em>
                            {option.usd ? `$${option.usd}` : "—"}
                            {option.usd_foil ? ` / ✦$${option.usd_foil}` : ""}
                          </em>
                        </button>
                        {optionPurchaseLink && (
                          <a
                            className={`printing-option-purchase-link${optionPurchaseLink.isExactPrinting ? " exact-printing" : ""}`}
                            href={optionPurchaseLink.url}
                            target={optionPurchaseLink.target}
                            rel={optionPurchaseLink.rel}
                            title={optionPurchaseLink.isExactPrinting ? "Opens this exact printing on TCGplayer — does not select it here" : "Opens a TCGplayer search for this card — does not select this printing here"}
                            onClick={(event) => event.stopPropagation()}
                          >
                            {optionPurchaseLink.label}
                          </a>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
          {!guestMode && !editAnvilOpen && (
            <button
              className="edit-anvil-launcher"
              onClick={() => setEditAnvilOpen(true)}
              aria-label="Raise the Editing Anvil"
            >
              <i>⚒</i>
              <span>Raise Editing Anvil</span>
            </button>
          )}
          <section
            className={`forge-edit-workbench ${editAnvilOpen ? "open" : ""}`}
            hidden={!editAnvilOpen}
          >
          <button
            className="edit-anvil-toggle"
            onClick={() => setEditAnvilOpen((open) => !open)}
            aria-expanded={editAnvilOpen}
          >
            <i>⚒</i>
            {editAnvilOpen ? "Lower Editing Anvil" : "Raise Editing Anvil"}
          </button>
          <header>
            <div>
              <small>THE EDITING ANVIL</small>
              <h2>Shape the list with your own hands.</h2>
              <p>
                Drag a deck card into Considering or Quench it completely.
                Search the legal card archive to stage replacements.
              </p>
            </div>
            <span>
              {deckRows.reduce((sum, row) => sum + row.quantity, 0)} CARDS NOW
            </span>
          </header>
          <div className="edit-anvil-grid">
            <section className="card-finder">
              <label>
                <span>SEARCH LEGAL {format.toUpperCase()} CARDS</span>
                <input
                  value={cardSearch}
                  onChange={(event) => setCardSearch(event.target.value)}
                  placeholder="Try Opt, Lightning Bolt, Sol Ring…"
                />
              </label>
              {cardSearchResults.length > 0 && (
                <div>
                  {cardSearchResults.map((card) => (
                    <article key={card.name}>
                      {card.image ? <img src={card.image} alt="" /> : <i>◆</i>}
                      <span>
                        <b>{card.name}</b>
                        <small>{card.typeLine}</small>
                      </span>
                      <button
                        onClick={() =>
                          setConsideringCards((current) => [
                            ...current.filter(
                              (item) => item.name !== card.name,
                            ),
                            { quantity: 1, name: card.name },
                          ])
                        }
                      >
                        Consider
                      </button>
                      <button
                        onClick={() =>
                          addCardToDeck({ quantity: 1, name: card.name })
                        }
                      >
                        Add
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </section>
            <section
              className="drop-pool considering-pool"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                stageDeckCard(
                  event.dataTransfer.getData("text/plain"),
                  "consider",
                );
              }}
            >
              <header>
                <span>◇</span>
                <div>
                  <small>CONSIDERING</small>
                  <b>Possible cuts and replacements</b>
                </div>
              </header>
              {consideringCards.length ? (
                consideringCards.map((card) => (
                  <article key={card.name}>
                    <span>{card.quantity}</span>
                    <b>{card.name}</b>
                    <button
                      onClick={() =>
                        addCardToDeck(card, "Restored from consideration")
                      }
                    >
                      Add to deck
                    </button>
                    <button
                      onClick={() =>
                        setConsideringCards((current) =>
                          current.filter((item) => item.name !== card.name),
                        )
                      }
                    >
                      Dismiss
                    </button>
                  </article>
                ))
              ) : (
                <p>Drag a deck card here, or stage one from search.</p>
              )}
            </section>
            <section
              className="drop-pool remove-pool"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                stageDeckCard(
                  event.dataTransfer.getData("text/plain"),
                  "remove",
                );
              }}
            >
              <header>
                <span>×</span>
                <div>
                  <small>THE QUENCH</small>
                  <b>Removed from this revision</b>
                </div>
              </header>
              {removedCards.length ? (
                removedCards.map((card) => (
                  <article key={card.name}>
                    <span>{card.quantity}</span>
                    <b>{card.name}</b>
                    <button
                      onClick={() => {
                        addCardToDeck(card, "Restored from the Quench");
                        setRemovedCards((current) =>
                          current.filter((item) => item.name !== card.name),
                        );
                      }}
                    >
                      Undo
                    </button>
                  </article>
                ))
              ) : (
                <p>
                  Drop a card here to remove it. The change remains reversible.
                </p>
              )}
            </section>
          </div>
          </section>
        </>
      )}
      {(replacementLoading ||
        replacementRecommendations.length > 0 ||
        replacementError ||
        lastCutCard) && (
          <section className="forge-replacements">
            <header>
              <div>
                <small>THE FORGE ANSWERS THE CUT</small>
                <h2>
                  {replacementLoading
                    ? `Studying what ${lastCutCard} was doing…`
                    : replacementRecommendations.length
                      ? `${replacementRecommendations.length} path${replacementRecommendations.length === 1 ? "" : "s"} can fill ${lastCutCard}'s place.`
                      : replacementError === "no-legal-replacement"
                        ? `No legal replacement for ${lastCutCard}.`
                        : replacementError === "operational"
                          ? "The replacement engine didn't respond."
                          : `Search the Archive for ${lastCutCard}'s successor.`}
                </h2>
              </div>
              <button
                onClick={() => {
                  setLastCutCard("");
                  setReplacementRecommendations([]);
                  setReplacementError("");
                }}
              >
                Dismiss
              </button>
            </header>
            {replacementLoading ? (
              <div className="replacement-thinking">
                <i />
                <span>
                  The Forge is comparing role, curve, synergy, and legality.
                </span>
              </div>
            ) : replacementRecommendations.length > 0 ? (
              <div className="replacement-grid">
                {replacementRecommendations.map((card, index) => {
                  // Search-fallback only: replacement candidates come back
                  // from recommendReplacements as a name/typeLine/image
                  // CardSearchResult, never a specific printing — same
                  // honest fallback the decklist row and card inspector
                  // already use for unselected printings.
                  const replacementPurchaseLink = buildTcgplayerLink({
                    cardName: card.name,
                    tcgplayerProductId: null,
                    enabled: tcgplayerAffiliateEnabled,
                  });
                  return (
                  <article
                    key={card.name}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData(
                        "application/x-metaforge-card",
                        card.name,
                      );
                      event.dataTransfer.setData("text/plain", card.name);
                    }}
                  >
                    <span>
                      {card.image ? <img src={card.image} alt="" /> : <i>◆</i>}
                      <em>FORGE OPTION {index + 1}</em>
                    </span>
                    <div>
                      <b>{card.name}</b>
                      <small>{card.typeLine}</small>
                      {card.reason && <p className="replacement-reason">{card.reason}</p>}
                      {card.roles.length > 0 && (
                        <small className="replacement-roles">{card.roles.join(" · ")}</small>
                      )}
                      <button
                        onClick={() =>
                          addCardToDeck(
                            { quantity: 1, name: card.name },
                            `Forge replacement for ${lastCutCard}`,
                          )
                        }
                      >
                        Add to deck
                      </button>
                      {replacementPurchaseLink && (
                        <a
                          className="replacement-purchase-link"
                          href={replacementPurchaseLink.url}
                          target={replacementPurchaseLink.target}
                          rel={replacementPurchaseLink.rel}
                          onClick={(event) => event.stopPropagation()}
                        >
                          Buy on TCGplayer
                        </a>
                      )}
                    </div>
                  </article>
                  );
                })}
                <aside
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    const name = event.dataTransfer.getData(
                      "application/x-metaforge-card",
                    );
                    if (name)
                      addCardToDeck(
                        { quantity: 1, name },
                        `Forge replacement for ${lastCutCard}`,
                      );
                  }}
                >
                  <i>＋</i>
                  <b>DROP INTO THE DECK</b>
                  <span>The candidate becomes part of this revision.</span>
                </aside>
              </div>
            ) : replacementError === "operational" ? (
              <p className="replacement-empty replacement-error">
                We couldn&rsquo;t reach the replacement engine. Try again, or use
                the legal card search above to choose the replacement yourself.
              </p>
            ) : (
              <p className="replacement-empty">
                No legal replacement was found for this slot. Use the legal
                card search above to choose the replacement yourself.
              </p>
            )}
          </section>
      )}
    </>
  );
}
