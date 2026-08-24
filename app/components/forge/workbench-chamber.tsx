"use client";

import { createPortal } from "react-dom";
import { cardImage, cardArtCrop } from "../../card-art";
import { isCommanderFormat } from "../../format-catalog";
import {
  cardFactKey,
  cardPriceUsd,
  cheapestCardPriceUsd,
  relativeUpdatedLabel,
} from "../../deck-row-helpers";
import { ForgeCardRef } from "../../forge-card-ref";
import { ImportedDeckComparison } from "./imported-deck-comparison";
import { ForgeProcessingLoader } from "./forge-ceremony";
import { Tabletop } from "../../tabletop";
import { ProvingGroundsEra } from "../../proving-grounds-era";
import { RevisionOpinionPanel } from "./revision-opinion";
import { MOTIF_ICONS } from "../../masterwork-motif-icons";
import { AFFILIATE_DISCLOSURE_TEXT, buildTcgplayerLink } from "../../affiliate-links.mjs";
import {
  HONEST_COACH_FEEDBACK_OPTIONS,
  HONEST_COACH_NOT_HELPFUL_REASONS,
} from "../../honest-coach-summary.mjs";
import { createPilotingDebrief } from "../../piloting-debrief.mjs";
import { formatDeckForArenaExport } from "../../deck-export-format.mjs";
import { trackLaunchEvent } from "../../launch-telemetry";
import { useForgeSession } from "../../forge-session-context";

export function WorkbenchChamber() {
  const {
    chamber,
    setChamber,
    guestMode,
    turnstileToken,
    guestClaimToken,
    format,
    strategy,
    motionMode,
    deck,
    selectedCommander,
    selectedSecondCommander,
    forgedDeck,
    forgeReply,
    swapFlourish,
    sealBurst,
    setSealBurst,
    setMilestoneMotion,
    postAcceptChoice,
    setPostAcceptChoice,
    lastAcceptedRevisionCount,
    benchStatus,
    record,
    pendingMatchResult,
    setPendingMatchResult,
    pendingDecisionSignal,
    setPendingDecisionSignal,
    pilotingDebrief,
    setPilotingDebrief,
    opponentArchetype,
    setOpponentArchetype,
    matchLog,
    activeFieldTest,
    fieldTestRead,
    setFieldTestRead,
    coachingCheckin,
    setCoachingCheckin,
    revisions,
    nativeMasterworkContext,
    publicReportStatus,
    publicReportUrl,
    publicReportError,
    publicReportGenerationId,
    publicReportPromptOpen,
    setPublicReportPromptOpen,
    importWarnings,
    deckUnderstanding,
    reviewFocusResult,
    coachFeedbackStatus,
    coachFeedbackNote,
    setCoachFeedbackNote,
    coachFeedbackPendingOption,
    coachFeedbackTargetTablet,
    cardFacts,
    cardFactsLoading,
    cardFactsError,
    cardFactsPending,
    setCardFactsRetry,
    setHoveredCard,
    scheduleDeckHover,
    setMatchupCardAdvice,
    inspectedCard,
    setInspectedCard,
    cardActionMenu,
    setCardActionMenu,
    refillCuts,
    setRefillCuts,
    multiRefillSelecting,
    setMultiRefillSelecting,
    multiRefillStatus,
    setMultiRefillStatus,
    multiRefillError,
    multiRefillResult,
    setMultiRefillResult,
    foilCards,
    setFoilCards,
    cheapestPrintings,
    printingOverrides,
    setPrintingMenu,
    tcgplayerAffiliateEnabled,
    deckId,
    savedMasterworks,
    forgeGenerationError,
    forgeGenerationFailure,
    forgeElapsedSeconds,
    metaBreakerExperiments,
    metaBreakerLoading,
    matchEvidenceOpen,
    setMatchEvidenceOpen,
    experimentLabOpen,
    setExperimentLabOpen,
    activeForgeChapter,
    setActiveForgeChapter,
    siteRail,
    setSiteRail,
    swapStationReviewed,
    setSwapStationReviewed,
    coachBriefDetailsRef,
    deckViewMode,
    setDeckViewMode,
    masterworkIdentityOpen,
    setMasterworkIdentityOpen,
    masterworkIdentity,
    setMasterworkIdentity,
    masterworkIdentityDraft,
    setMasterworkIdentityDraft,
    setTabletopReviewActive,
    forgeDescentRef,
    setOpeningExperimentPending,
    setOpeningExperimentFocus,
    openDeepForgeEvidence,
    signInResumeHref,
    chosenWork,
    isImportedDeckReview,
    currentFamilyArchived,
    deckRows,
    importedOriginalRows,
    importedProposedRows,
    importedComparisonSwaps,
    importedComparisonAdjustments,
    activeCommanderName,
    displayDeckName,
    deckPurchaseLink,
    hasValidatedDeck,
    masterworkIdentityKey,
    featuredMasterworkCard,
    featuredMasterworkArt,
    masterworkFeaturedChoices,
    groupedDeck,
    colorPipCounts,
    effectivePriceFact,
    deckPriceTotal,
    activeCard,
    inspectedFact,
    inspectedPrinting,
    inspectedImage,
    deckIntegrity,
    structuralAnalysisStatus,
    boundStructural,
    activeStructuralReport,
    interactionGraph,
    honestCoachSummary,
    submitHonestCoachFeedback,
    tabletopCards,
    previousRevisionCardNames,
    inspectedRole,
    inspectedIsCommander,
    inspectedConnections,
    inspectedSystems,
    inspectedEvaluation,
    inspectedMentor,
    inspectedMentorHasSeat,
    inspectedPackageMentors,
    inspectedPairMentors,
    coachOccupancyLabels,
    inspectedOccupancyLabels,
    inspectorPurchaseLink,
    inspectedSlotReason,
    experimentTablets,
    experimentReportStatus,
    honestCoachTablets,
    openingExperimentChoices,
    openingExperimentGateActive,
    masterworkVisualProfile,
    metaBreakerDossier,
    revisionLearning,
    provingGrounds,
    coachingSession,
    commitDirectForge,
    setFamilyArchived,
    beginTesting,
    forgeMetaBreakerExperiments,
    applyMetaBreakerExperiment,
    recordForgeIntervention,
    recordMatch,
    beginProvingGroundsTest,
    finishProvingGroundsTest,
    applyExperimentTablet,
    forgeMultiRefill,
    applyMultiRefillPackage,
    finishCurrentMasterwork,
    acceptOpeningControl,
    publishPublicDeckReport,
    unpublishPublicDeckReport,
  } = useForgeSession();

  return (
    <section ref={forgeDescentRef} className={`testing-anvil progressive-results forge-descent ${openingExperimentGateActive ? "opening-experiment-pending" : ""}`}>
      {!hasValidatedDeck && <button
        className="back-link"
        onClick={() => setChamber(deck.trim() ? "refine" : "commission")}
      >← Change build</button>}
      {!hasValidatedDeck && <header>
        <span className="forge-eyebrow">
          <i />{" "}
          {hasValidatedDeck
            ? "READY TO PLAY"
            : benchStatus === "forging"
              ? "BUILDING YOUR DECK · NOT READY YET"
              : "BUILD NOT COMPLETED"}
        </span>
        <div className="masterwork-heading">
          {hasValidatedDeck && masterworkVisualProfile.primaryMotif && (
            <span
              className="masterwork-sigil"
              data-evolved={masterworkVisualProfile.evolved}
              style={{ "--motif-accent": masterworkVisualProfile.accent } as React.CSSProperties}
              title={`${masterworkVisualProfile.primaryMotif} identity, from this deck's real structure`}
            >
              {(() => {
                const Icon = MOTIF_ICONS[masterworkVisualProfile.primaryMotif as keyof typeof MOTIF_ICONS];
                return <Icon size={54} />;
              })()}
            </span>
          )}
          <div>
            <h1>{hasValidatedDeck ? displayDeckName : benchStatus === "forging" ? "Building your deck…" : "No deck was completed"}</h1>
            {hasValidatedDeck ? (
              <p>
                {honestCoachSummary.planStory?.title
                  ? `${honestCoachSummary.planStory.title}${activeCommanderName ? ` · ${activeCommanderName}` : ""}`
                  : activeCommanderName
                    ? `${activeCommanderName}`
                    : "Your completed deck"}{" "}
                · {format} · Revision {Math.max(1, revisions.length)}
              </p>
            ) : (
              <p>{format}</p>
            )}
          </div>
        </div>
      </header>}
      {openingExperimentGateActive && (
        <section className="opening-experiment-gate" aria-labelledby="opening-experiment-title">
          <header>
            <span>
              <small>YOUR FIRST OFFICIAL EXPERIMENT</small>
              <h2 id="opening-experiment-title">Choose the first card this deck will test.</h2>
            </span>
            <b>1 OF 3 · PLAYER DECISION</b>
          </header>
          <p>
            The Forge has completed the structure, but the final list stays veiled until you choose its first flex decision. Pick the hypothesis you want to carry into your opening matches.
          </p>
          {coachOccupancyLabels.length > 0 && (
            <p className="opening-experiment-occupancy">
              Occupancy engines: {coachOccupancyLabels.join(" · ")}. Named from commander oracle, not from this first-card choice.
            </p>
          )}
          <div className="opening-experiment-options">
            {openingExperimentChoices.map((choice: any, index: number) => (
              <article key={choice.id}>
                <figure>
                  <img src={cardImage(choice.card)} alt={choice.card} loading="lazy" />
                  <figcaption>PATH {index + 1}</figcaption>
                </figure>
                <div>
                  <small>{choice.eyebrow}</small>
                  <h3>{choice.title}</h3>
                  <p>{choice.detail}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (choice.kind === "swap") {
                      setOpeningExperimentPending(false);
                      setOpeningExperimentFocus(choice.card);
                      setMilestoneMotion({ kind: "experiment-chosen", eyebrow: "FIRST EXPERIMENT", label: choice.card, glyph: "ᚲ" });
                      void applyExperimentTablet(choice.tablet);
                    } else {
                      acceptOpeningControl(choice.card);
                    }
                  }}
                >
                  Choose this experiment →
                </button>
              </article>
            ))}
          </div>
          <footer>
            <span><strong>WHAT HAPPENS NEXT</strong> Your choice becomes the first official experiment, then the complete deck and its guided testing path are revealed.</span>
            <button
              type="button"
              onClick={() => {
                setOpeningExperimentPending(false);
                setOpeningExperimentFocus("");
                setActiveForgeChapter(1);
                recordForgeIntervention("opening guidance", "Skipped the guided first experiment", "dismissed");
              }}
            >
              Skip guidance · Reveal the full deck
            </button>
          </footer>
        </section>
      )}
      {hasValidatedDeck ? (
        siteRail !== "decklist" && (
        <div className="workbench-coach-stack">
          <details className="coach-below-deck" ref={coachBriefDetailsRef}>
          <summary>Here&rsquo;s the read →</summary>
          <section className="forge-understanding-bridge coach-brief honest-coach-v0" id="coach-brief" aria-label="Coach's brief">
            <header>
              <small>YOUR COACH</small>
              <h2>{honestCoachSummary.headline}</h2>
              {!honestCoachSummary.coachingAllowed ? (
                <p className="honest-coach-insufficient" role="status">
                  I don&apos;t understand enough of this list yet to coach it responsibly. Deterministic checks like deck size and verified mana math can still help while card records catch up.
                </p>
              ) : (
                <p className="honest-coach-guide">{honestCoachSummary.guideLine}</p>
              )}
              {/* Player Surface Law: system counts / Engine names
                  (Counter Engine, Treasure Engine, "14 systems verified")
                  live in Deep Forge — not the coach brief default. */}
              {honestCoachSummary.coachingAllowed && (
                <button
                  type="button"
                  className="conversation-evidence-link strategy-vs-system-evidence"
                  onClick={openDeepForgeEvidence}
                >
                  How do you know? → Deep Forge evidence
                </button>
              )}
              {structuralAnalysisStatus === "loading" && !boundStructural.ok && (
                <p className="structural-analysis-pending" role="status">
                  Analyzing this build&apos;s structure…
                </p>
              )}
              {structuralAnalysisStatus === "error" && !boundStructural.ok && (
                <p className="structural-analysis-pending" role="status">
                  Structural analysis is temporarily unavailable. Deck editing and testing remain unaffected.
                </p>
              )}
              {honestCoachSummary.narrativeIntegrity?.regenerated && (
                <p className="structural-analysis-pending" role="status">
                  Coach narrative was regenerated to match this analysis only.
                </p>
              )}
            </header>
            {honestCoachSummary.coachingAllowed && (
            <div className="honest-coach-brief-stream" aria-label="Coach priorities">
              <article className="honest-coach-plan commission-verdict">
                <small>VERDICT</small>
                <h3>{honestCoachSummary.planStory?.title || honestCoachSummary.intentions.title}</h3>
                <p>{honestCoachSummary.intentions.accomplish}</p>
                {coachOccupancyLabels.length > 0 && (
                  <p className="honest-coach-occupancy">
                    Occupancy engines: {coachOccupancyLabels.join(" · ")}. Named from commander oracle, not a verified system map.
                  </p>
                )}
              </article>
              <article className="commission-why">
                <small>WHY · OPENING PRIORITIES</small>
                <p>{honestCoachSummary.intentions.establish}</p>
              </article>
              <article className="coach-brief-watch commission-change">
                <small>CHANGE</small>
                <strong>Take one thing into the next game.</strong>
                <p>{honestCoachSummary.intentions.firstVulnerability}</p>
                {honestCoachSummary.fixFirst
                  && !/Engine$/i.test(String(honestCoachSummary.fixFirst))
                  && (
                  <p className="coach-fix-first-ref">
                    <small>INSPECT</small>
                    <ForgeCardRef
                      name={honestCoachSummary.fixFirst}
                      surface="coach-fix-first"
                      onInspect={setHoveredCard}
                    />
                  </p>
                )}
                {/* Player Surface Law: hypothesis/principle research voice
                    stays in Deep Forge, not the coach brief default. */}
                {(honestCoachSummary.observedLead || honestCoachSummary.inferredLead) && (
                  <details className="coach-brief-certainty">
                    <summary>How sure is this read? →</summary>
                    {honestCoachSummary.observedLead && (
                      <p className="honest-coach-claim-observed">
                        <em>What we can see</em>
                        {honestCoachSummary.observedLead}
                      </p>
                    )}
                    {honestCoachSummary.inferredLead && (
                      <p className="honest-coach-claim-inferred">
                        <em>What that likely means</em>
                        {honestCoachSummary.inferredLead}
                      </p>
                    )}
                    {honestCoachSummary.uncertaintyLead && (
                      <p className="honest-coach-claim-uncertainty">
                        <em>What we&apos;re not sure of yet</em>
                        {honestCoachSummary.uncertaintyLead}
                      </p>
                    )}
                  </details>
                )}
                {!isImportedDeckReview && (
                  <button
                    type="button"
                    className="coach-change-cta"
                    onClick={() => {
                      if (!activeFieldTest) beginProvingGroundsTest();
                      setActiveForgeChapter(5);
                      trackLaunchEvent("coaching_opened", { format });
                      window.requestAnimationFrame(() =>
                        document.getElementById("proving-era-title")?.scrollIntoView({ behavior: "smooth", block: "start" }),
                      );
                    }}
                  >
                    Prepare my next game →
                  </button>
                )}
              </article>
            </div>
            )}
            {reviewFocusResult && (
              <aside className="coach-question">
                <small>YOUR QUESTION · {reviewFocusResult.focus.toUpperCase()}</small>
                <strong>{reviewFocusResult.evidence}</strong>
                <p>{reviewFocusResult.nextStep}</p>
              </aside>
            )}
            <aside className="honest-coach-feedback" aria-label="Was this analysis helpful?">
              <small>ALPHA FEEDBACK</small>
              <b>Was this coaching read helpful?</b>
              <div className="honest-coach-feedback-actions">
                {HONEST_COACH_FEEDBACK_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    disabled={coachFeedbackStatus === "saving" || coachFeedbackStatus === "saved"}
                    onClick={() => submitHonestCoachFeedback(option.id)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {coachFeedbackStatus === "need-reason" && coachFeedbackPendingOption === "not-helpful" && (
                <div className="honest-coach-not-helpful-reasons" role="group" aria-label="Why was this not helpful?">
                  <small>What went wrong?</small>
                  <div className="honest-coach-feedback-actions">
                    {HONEST_COACH_NOT_HELPFUL_REASONS.map((reason) => (
                      <button
                        key={reason.id}
                        type="button"
                        disabled={coachFeedbackStatus === "saving"}
                        onClick={() =>
                          submitHonestCoachFeedback(
                            "not-helpful",
                            coachFeedbackTargetTablet,
                            reason.id,
                          )
                        }
                      >
                        {reason.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <label className="honest-coach-feedback-note">
                <span>Optional note</span>
                <textarea
                  value={coachFeedbackNote}
                  onChange={(event) => setCoachFeedbackNote(event.target.value)}
                  rows={2}
                  maxLength={500}
                  placeholder="Tell us what felt right or wrong about this read."
                />
              </label>
              {coachFeedbackStatus === "saved" && <p role="status">Thanks — feedback saved for this analysis.</p>}
              {coachFeedbackStatus === "auth" && <p role="status">Could not verify account. Guest feedback may still work — try again.</p>}
              {coachFeedbackStatus === "error" && <p role="status">Could not save feedback just now. Try again in a moment.</p>}
            </aside>
            <footer>
              <span><small>WANT THE RECEIPTS?</small><b>Open exact scores, detected relationships, card lists, and methodology only when you need them.</b></span>
              <button type="button" onClick={openDeepForgeEvidence}>
                How do you know? → Deep Forge evidence
              </button>
            </footer>
          </section>
          </details>

        </div>
        )
      ) : (
        !openingExperimentGateActive &&
        benchStatus !== "forging" &&
        forgeGenerationError && (
          <p className="forge-map-intro">
            <span>NOT READY</span> This attempt did not produce a complete deck. See the failure details below — your notes and any preview are unaffected.
          </p>
        )
      )}
      {/* Global chrome is only .forge-bar + .forge-global-rail. Never remount masterwork-shell-top/rail (Academy header) inside this pane. */}
      {hasValidatedDeck && isImportedDeckReview && siteRail === "decklist" && !swapStationReviewed && (
        <ImportedDeckComparison
          originalRows={importedOriginalRows}
          proposedRows={importedProposedRows}
          swaps={importedComparisonSwaps}
          adjustments={importedComparisonAdjustments}
          strategyTitle={honestCoachSummary.planStory?.title || honestCoachSummary.intentions.title}
          strategySummary={honestCoachSummary.deckUnderstanding?.playerSummary?.detail || honestCoachSummary.intentions.accomplish}
          coreSummary={honestCoachSummary.intentions.establish || honestCoachSummary.planStory?.planLabel || "Retain the cards carrying the deck's primary engine and required structural roles."}
          occupancyEngines={coachOccupancyLabels}
          identityAliases={nativeMasterworkContext.identityAliases}
          onContinue={() => { setSwapStationReviewed(true); window.scrollTo(0, 0); }}
        />
      )}
      <div className={`testing-layout chapter-${activeForgeChapter}-active ${deckViewMode}-deck-view${isImportedDeckReview ? " imported-deck-review" : ""}`}>
        <article className="deck-manuscript">
          <header
            className={hasValidatedDeck ? `masterwork-deck-hero treatment-${masterworkIdentity.treatment} focus-${masterworkIdentity.focus}` : undefined}
            style={hasValidatedDeck ? ({
              "--masterwork-art": `url("${featuredMasterworkArt}")`,
              "--masterwork-glow": masterworkIdentity.glow / 100,
            } as React.CSSProperties) : undefined}
          >
            {hasValidatedDeck && <span className="masterwork-glass" aria-hidden="true" />}
            <div className="masterwork-deck-title">
              {hasValidatedDeck && <img className="masterwork-commander-medallion" src={cardArtCrop(activeCommanderName || featuredMasterworkCard)} alt="" />}
              <div>
                <small>YOUR DECK</small>
                <h2>{hasValidatedDeck ? masterworkIdentity.title || chosenWork.name.replace(/, Forged$/, "") : benchStatus === "forging" ? "The Forge is producing your deck…" : "Build not completed"}</h2>
                {hasValidatedDeck && (
                  <p>{honestCoachSummary.planStory?.title || honestCoachSummary.intentions.title} · Revision {Math.max(1, revisions.length)}</p>
                )}
                {hasValidatedDeck && <div className="masterwork-identity-marks" aria-label={`${selectedCommander?.colors?.join(", ") || "colorless"} color identity`}>
                  {(selectedCommander?.colors?.length ? selectedCommander.colors : ["C"]).map((color) => <i key={color} data-color={color}>{color}</i>)}
                  <span className="masterwork-ready">✓ READY TO TEST</span>
                  {coachOccupancyLabels.length > 0 && (
                    <span className="masterwork-occupancy">Occupancy: {coachOccupancyLabels.join(" · ")}</span>
                  )}
                </div>}
              </div>
            </div>
            {hasValidatedDeck && (
              <div className="deck-header-actions">
                <span className="deck-header-price" aria-label="Estimated deck market price">
                  <small>ESTIMATED MARKET PRICE</small>
                  <strong>${deckPriceTotal.total.toFixed(2)}</strong>
                  {deckPriceTotal.unpricedCards > 0 && <em>{deckPriceTotal.unpricedCards} card{deckPriceTotal.unpricedCards === 1 ? "" : "s"} still pricing</em>}
                </span>
                {deckPurchaseLink && (
                  <a
                    className="buy-deck-link"
                    href={deckPurchaseLink.url}
                    target={deckPurchaseLink.target}
                    rel={deckPurchaseLink.rel}
                  >
                    Buy this deck →
                  </a>
                )}
                <button
                  onClick={() => navigator.clipboard.writeText(formatDeckForArenaExport(forgedDeck))}
                >
                  Copy deck
                </button>
                {!guestMode && nativeMasterworkContext?.generationId && (
                  <button type="button" className="publish-report-link" disabled={publicReportStatus === "publishing"} onClick={() => publicReportUrl && publicReportGenerationId === nativeMasterworkContext?.generationId ? void navigator.clipboard.writeText(publicReportUrl) : setPublicReportPromptOpen(true)}>
                    {publicReportStatus === "publishing" ? "Publishing…" : publicReportStatus === "ready" && publicReportGenerationId === nativeMasterworkContext?.generationId ? "Copy public link" : "Publish public report"}
                  </button>
                )}
                {publicReportUrl && <a className="public-report-status" href={publicReportUrl} target="_blank" rel="noopener noreferrer">Open public report ↗</a>}
                {publicReportUrl && <button type="button" className="unpublish-report-link" disabled={publicReportStatus === "publishing"} onClick={() => void unpublishPublicDeckReport()}>Unpublish</button>}
                {publicReportError && <span className="public-report-error" role="alert">{publicReportError}</span>}
                <button
                  type="button"
                  className="personalize-masterwork"
                  onClick={() => {
                    setMasterworkIdentityDraft(masterworkIdentity);
                    setMasterworkIdentityOpen(true);
                  }}
                >
                  ✦ Personalize deck
                </button>
                {siteRail !== "overview" && (
                  <button
                    type="button"
                    className="conduct-experiment-cta"
                    onClick={() => {
                      setExperimentLabOpen(true);
                    }}
                  >
                    Want to conduct an experiment?
                  </button>
                )}
                {!(siteRail === "playtest" && deckViewMode === "playtest") && (
                  <button
                    type="button"
                    className="next-step-cta"
                    onClick={() => {
                      setMilestoneMotion({
                        kind: "masterwork-selected",
                        eyebrow: "ADDED TO YOUR ARSENAL",
                        label: masterworkIdentity.title || chosenWork.name.replace(/, Forged$/, ""),
                        glyph: "ᛟ",
                      });
                      setChamber("workbench");
                      setActiveForgeChapter(1);
                      setDeckViewMode("playtest");
                      setSiteRail("playtest");
                      window.requestAnimationFrame(() => document.querySelector(".tabletop-surface")?.scrollIntoView({ behavior: "smooth", block: "start" }));
                    }}
                  >
                    This deck is done! →
                  </button>
                )}
                <details className="deck-view-options">
                  <summary>View options</summary>
                  <button type="button" className={deckViewMode === "gallery" ? "active" : ""} onClick={() => setDeckViewMode("gallery")}>Visual deck</button>
                  <button type="button" className={deckViewMode === "ledger" ? "active" : ""} onClick={() => setDeckViewMode("ledger")}>Text list</button>
                </details>
                {guestMode && guestClaimToken && <a onClick={() => trackLaunchEvent("save_continue_clicked", { format })} className="save-deck-link" href={`https://app.metaforge.gg/?claim=${encodeURIComponent(guestClaimToken)}`}>Save deck →</a>}
              </div>
            )}
          </header>
          {hasValidatedDeck && masterworkIdentityOpen && (
            <div className="masterwork-identity-backdrop" role="presentation" onMouseDown={() => setMasterworkIdentityOpen(false)}>
              <section className="masterwork-identity-panel" role="dialog" aria-modal="true" aria-labelledby="masterwork-identity-title" onMouseDown={(event) => event.stopPropagation()}>
                <header>
                  <div><small>MAKE IT YOURS</small><h3 id="masterwork-identity-title">Deck Identity</h3></div>
                  <button type="button" aria-label="Close personalization" onClick={() => setMasterworkIdentityOpen(false)}>×</button>
                </header>
                <label>
                  <span>Deck name</span>
                  <input type="text" maxLength={60} placeholder={chosenWork.name.replace(/, Forged$/, "")} value={masterworkIdentityDraft.title} onChange={(event) => setMasterworkIdentityDraft((current) => ({ ...current, title: event.target.value }))} />
                </label>
                <label>
                  <span>Featured art</span>
                  <div className="identity-featured-art" role="group" aria-label="Featured artwork shortcuts">
                    {masterworkFeaturedChoices.map((name) => (
                      <button type="button" key={name} className={(masterworkIdentityDraft.featuredCard || activeCommanderName) === name ? "active" : ""} aria-label={`Use ${name} artwork`} onClick={() => setMasterworkIdentityDraft((current) => ({ ...current, featuredCard: name }))}>
                        <img src={cardArtCrop(name)} alt="" />
                        <i aria-hidden="true">✓</i>
                      </button>
                    ))}
                  </div>
                  <select value={masterworkIdentityDraft.featuredCard || activeCommanderName} onChange={(event) => setMasterworkIdentityDraft((current) => ({ ...current, featuredCard: event.target.value }))}>
                    {deckRows.map((row) => <option key={row.name} value={row.name}>{row.name}</option>)}
                  </select>
                </label>
                <fieldset>
                  <legend>Treatment</legend>
                  <div className="identity-treatment-options">
                    {(["stained", "etched", "clean"] as const).map((treatment) => (
                      <button type="button" key={treatment} className={masterworkIdentityDraft.treatment === treatment ? "active" : ""} onClick={() => setMasterworkIdentityDraft((current) => ({ ...current, treatment }))}>
                        {treatment === "stained" ? "Stained Glass" : treatment === "etched" ? "Etched Metal" : "Clean Art"}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <fieldset>
                  <legend>Focus position</legend>
                  <div className="identity-focus-options">
                    {(["left", "center", "right"] as const).map((focus) => <button type="button" key={focus} className={masterworkIdentityDraft.focus === focus ? "active" : ""} onClick={() => setMasterworkIdentityDraft((current) => ({ ...current, focus }))}>{focus}</button>)}
                  </div>
                </fieldset>
                <label>
                  <span>Glow intensity <b>{masterworkIdentityDraft.glow}%</b></span>
                  <input type="range" min="0" max="100" value={masterworkIdentityDraft.glow} onChange={(event) => setMasterworkIdentityDraft((current) => ({ ...current, glow: Number(event.target.value) }))} />
                </label>
                <footer>
                  <button type="button" onClick={() => setMasterworkIdentityOpen(false)}>Cancel</button>
                  <button type="button" onClick={() => setMasterworkIdentity(masterworkIdentityDraft)}>Preview</button>
                  <button type="button" className="save-masterwork-identity" onClick={() => {
                    setMasterworkIdentity(masterworkIdentityDraft);
                    try { window.localStorage.setItem(masterworkIdentityKey, JSON.stringify(masterworkIdentityDraft)); } catch { /* local preference only */ }
                    setMasterworkIdentityOpen(false);
                  }}>Save Identity</button>
                </footer>
              </section>
            </div>
          )}
          {hasValidatedDeck && (
            <div className="masterwork-stats-bar" aria-label="Deck summary">
              <span><b>{deckRows.reduce((sum, row) => sum + row.quantity, 0)}</b> Cards</span>
              <span>{isCommanderFormat(format) ? "Commander" : format}</span>
              <div className="masterwork-pip-counts" aria-label="Mana pip totals">
                {(["W", "U", "B", "R", "G"] as const)
                  .filter((color) => colorPipCounts[color] > 0)
                  .map((color) => (
                    <i key={color} data-color={color}>{colorPipCounts[color]}</i>
                  ))}
              </div>
                {coachOccupancyLabels.length > 0 && (
                  <span className="masterwork-stats-occupancy">{coachOccupancyLabels.join(" · ")}</span>
                )}
            </div>
          )}
          {postAcceptChoice && (
            <div className="post-accept-choice" role="status">
              <span>
                <strong>Change applied.</strong> What's next for this deck?
                {coachOccupancyLabels.length > 0 && (
                  <em className="post-accept-occupancy"> Occupancy engines stay {coachOccupancyLabels.join(" · ")} — named from commander oracle, not from this revision.</em>
                )}
                {lastAcceptedRevisionCount != null && (
                  <>
                    {" "}
                    Revision {lastAcceptedRevisionCount} recorded to your{" "}
                    <a href="/profile">Forge Mastery →</a>
                  </>
                )}
              </span>
              <div>
                <button
                  type="button"
                  className="keep-testing"
                  onClick={() => {
                    setPostAcceptChoice(false);
                    setActiveForgeChapter(2);
                  }}
                >
                  Test Another Experiment →
                </button>
                {deckId && !currentFamilyArchived && (
                  <button
                    type="button"
                    className="finish-masterwork"
                    onClick={() => {
                      setPostAcceptChoice(false);
                      setSealBurst(true);
                      setFamilyArchived(deckId, true);
                      window.setTimeout(() => setSealBurst(false), 2200);
                    }}
                  >
                    This Is The One — Save as Finished Deck
                  </button>
                )}
              </div>
            </div>
          )}
          {nativeMasterworkContext?.practicalTiebreak?.overridden && (
            <span className="slot-justification">
              <small>PRACTICAL SIMULATION SETTLED A CLOSE CALL</small>
              <em>{nativeMasterworkContext.practicalTiebreak.reason}</em>
            </span>
          )}
          {nativeMasterworkContext?.selected?.recoveryNote && (
            <span className="slot-justification">
              <small>A PREFERENCE WAS RELAXED TO COMPLETE THIS DECK</small>
              <em>{nativeMasterworkContext.selected.recoveryNote}</em>
            </span>
          )}
          {nativeMasterworkContext?.selected?.budgetRepairNote && (
            <span className="slot-justification">
              <small>BUDGET CONSCIOUS ADJUSTED THIS DECK</small>
              <em>{nativeMasterworkContext.selected.budgetRepairNote}</em>
            </span>
          )}
          {nativeMasterworkContext?.selected?.powerRepairNote && (
            <span className="slot-justification">
              <small>CASUAL POWER ADJUSTED THIS DECK</small>
              <em>{nativeMasterworkContext.selected.powerRepairNote}</em>
            </span>
          )}

          <section className="forge-intelligence-vault" aria-label="Deep Forge evidence">
            <span>
              <small>DEEP FORGE · HOW DO YOU KNOW?</small>
              <b>Per-system evidence, structural intelligence, and the interaction graph moved to their own page so they stop costing memory here.</b>
              {!deckIntegrity.checking && !deckIntegrity.passed && (
                <strong className="deck-integrity-attention">ATTENTION REQUIRED</strong>
              )}
            </span>
            {!deckIntegrity.checking && deckIntegrity.issues.length > 0 && (
              <>
                <ul>{deckIntegrity.issues.map((issue) => <li key={issue}>{issue}</li>)}</ul>
                <p className="deck-integrity-manual-note">
                  Automatic repair isn&rsquo;t available for these — open the Editing Anvil to fix the flagged slots by hand.
                </p>
              </>
            )}
            <a href={`/research?deckId=${encodeURIComponent(deckId || "unsaved-masterwork")}`}>
              Open Research &amp; Evidence →
            </a>
          </section>
          {publicReportPromptOpen && createPortal(
            <div className="public-report-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setPublicReportPromptOpen(false); }}>
              <section className="public-report-dialog" role="dialog" aria-modal="true" aria-labelledby="public-report-title">
                <button type="button" className="public-report-close" onClick={() => setPublicReportPromptOpen(false)} aria-label="Close public report preview">×</button>
                <small>PUBLIC DECK REPORT · PREVIEW</small>
                <h2 id="public-report-title">Publish {masterworkIdentity.title || chosenWork.name.replace(/, Forged$/, "")}?</h2>
                <p>This creates a searchable page anyone can open and share. It will include:</p>
                <ul>
                  <li>The commander, format, strategy, and complete decklist</li>
                  <li>Grouped and alphabetized cards plus structural deck statistics</li>
                  <li>A unique social preview and links to related Commander resources</li>
                </ul>
                <p className="public-report-privacy"><strong>It will not include:</strong> your email, account identity, private notes, saved matches, or unpublished workbench analysis.</p>
                {publicReportError && <p className="public-report-error" role="alert">{publicReportError}</p>}
                <div>
                  <button type="button" onClick={() => setPublicReportPromptOpen(false)}>Keep private</button>
                  <button type="button" className="publish-report-confirm" disabled={publicReportStatus === "publishing"} onClick={() => void publishPublicDeckReport()}>{publicReportStatus === "publishing" ? "Publishing…" : "Publish this report"}</button>
                </div>
                <small>Publishing is optional. You can unpublish the report from this deck afterward.</small>
              </section>
            </div>,
            document.body,
          )}
          {experimentLabOpen && createPortal(
            <div
              className="experiment-lab-backdrop"
              role="presentation"
              onMouseDown={(event) => {
                if (event.currentTarget === event.target) setExperimentLabOpen(false);
              }}
            >
          <section className="refinement-starters-vault experiment-lab-dialog" role="dialog" aria-modal="true" aria-labelledby="experiment-lab-title">
            <button type="button" className="experiment-lab-close" onClick={() => setExperimentLabOpen(false)} aria-label="Close experiment laboratory">×</button>
            <header className="vault-experiments-header">
              <small>ADVANCED · TOURNAMENT-RIVAL EXPERIMENTS</small>
              <b id="experiment-lab-title">Choose one experiment for this deck</b>
              <p>A second, independent read: this exact build vs. its closest rival from generation.</p>
              {coachOccupancyLabels.length > 0 && (
                <p className="experiment-occupancy">
                  Occupancy engines: {coachOccupancyLabels.join(" · ")}. Named from commander oracle. These experiments do not reopen occupancy.
                </p>
              )}
            </header>
            <div className="refinement-starters experiment-tablets" aria-label="Three evidence-led controlled experiments">
              {honestCoachTablets.length > 0 ? (
                honestCoachTablets.map((tablet: any, index: number) => {
                  if (tablet.type === "confidence") {
                    return (
                      <article
                        key={tablet.id}
                        className="experiment-tablet-card confidence-tablet"
                        style={{ "--motif-accent": masterworkVisualProfile.accent } as React.CSSProperties}
                      >
                        <header>
                          <small>EXPERIMENT {index + 1} · THE FORGE'S READ</small>
                        </header>
                        <div className="confidence-tablet-body">
                          <strong>{tablet.headline}</strong>
                          <p>{tablet.detail}</p>
                        </div>
                        {deckId && !currentFamilyArchived && (
                          <button
                            type="button"
                            className="tablet-accept confidence-seal"
                            onClick={() => {
                              setSealBurst(true);
                              setFamilyArchived(deckId, true);
                              window.setTimeout(() => setSealBurst(false), 2200);
                            }}
                          >
                            Save it as a Finished Deck →
                          </button>
                        )}
                      </article>
                    );
                  }
                  const Icon = tablet.motif ? MOTIF_ICONS[tablet.motif as keyof typeof MOTIF_ICONS] : null;
                  const applying =
                    swapFlourish?.cut === tablet.change.cut &&
                    swapFlourish?.add === tablet.change.add;
                  // The ADD side only — tablet.change.cut is the card
                  // leaving the deck and must never get a purchase
                  // action. No printing is known yet at this stage, so
                  // this is always the honest search fallback.
                  const tabletPurchaseLink = buildTcgplayerLink({
                    cardName: tablet.change.add,
                    tcgplayerProductId: null,
                    enabled: tcgplayerAffiliateEnabled,
                  });
                  return (
                    <article
                      key={tablet.id}
                      className={`experiment-tablet-card ${applying ? "applying" : ""} ${tablet.confident === false ? "speculative" : ""}`}
                      style={{ "--motif-accent": masterworkVisualProfile.accent } as React.CSSProperties}
                    >
                      <div className="tablet-flip-inner">
                        <div className="tablet-face tablet-face-front">
                          <header>
                            <small>
                              EXPERIMENT {index + 1}
                              {tablet.confident === false && <em className="speculative-badge">SPECULATIVE</em>}
                            </small>
                            {Icon && (
                              <span className="tablet-motif-icon">
                                <Icon size={30} />
                              </span>
                            )}
                          </header>
                          <div className="tablet-swap-art">
                            <figure>
                              <button
                                type="button"
                                className="tablet-inspect-art"
                                data-card-inspect-surface="experiment-tablet"
                                onClick={() => setHoveredCard(tablet.change.cut)}
                                aria-label={`Inspect ${tablet.change.cut}`}
                              >
                                <img src={cardImage(tablet.change.cut)} alt={tablet.change.cut} loading="lazy" />
                              </button>
                              <figcaption>
                                CUT ·{" "}
                                <ForgeCardRef
                                  name={tablet.change.cut}
                                  surface="experiment-tablet"
                                  onInspect={setHoveredCard}
                                />
                              </figcaption>
                            </figure>
                            <span className="tablet-swap-arrow">→</span>
                            <figure>
                              <button
                                type="button"
                                className="tablet-inspect-art"
                                data-card-inspect-surface="experiment-tablet"
                                onClick={() => setHoveredCard(tablet.change.add)}
                                aria-label={`Inspect ${tablet.change.add}`}
                              >
                                <img src={cardImage(tablet.change.add)} alt={tablet.change.add} loading="lazy" />
                              </button>
                              <figcaption>
                                ADD ·{" "}
                                <ForgeCardRef
                                  name={tablet.change.add}
                                  surface="experiment-tablet"
                                  onInspect={setHoveredCard}
                                />
                              </figcaption>
                              {tabletPurchaseLink && (
                                <a
                                  className="tablet-purchase-link"
                                  href={tabletPurchaseLink.url}
                                  target={tabletPurchaseLink.target}
                                  rel={tabletPurchaseLink.rel}
                                  onClick={(event) => event.stopPropagation()}
                                >
                                  Buy on TCGplayer
                                </a>
                              )}
                            </figure>
                          </div>
                          <dl>
                            {tablet.honestWhy?.summary && (
                              <div className="honest-why">
                                <dt>Why this change</dt>
                                <dd>
                                  {tablet.honestWhy.observed && (
                                    <p className="honest-coach-claim-observed">
                                      <em>Observed</em>
                                      {tablet.honestWhy.observed}
                                    </p>
                                  )}
                                  {tablet.honestWhy.inferred && (
                                    <p className="honest-coach-claim-inferred">
                                      <em>I&apos;d recommend</em>
                                      {tablet.honestWhy.inferred}
                                    </p>
                                  )}
                                  {!tablet.honestWhy.observed && !tablet.honestWhy.inferred && tablet.honestWhy.summary}
                                  {tablet.recommendationIds?.recommendationId && (
                                    <small className="honest-coach-id-chip">
                                      Rec {tablet.recommendationIds.recommendationId}
                                    </small>
                                  )}
                                </dd>
                              </div>
                            )}
                            <div>
                              <dt>Field observation</dt>
                              <dd>{tablet.fieldObservation}</dd>
                            </div>
                            <div>
                              <dt>Structural pressure point</dt>
                              <dd>{tablet.pressurePoint}</dd>
                            </div>
                            <div>
                              <dt>Smallest honest test</dt>
                              <dd>{tablet.testContract}</dd>
                            </div>
                            <div>
                              <dt>Expected benefit</dt>
                              <dd>{tablet.expectedBenefit}</dd>
                            </div>
                            <div>
                              <dt>Tradeoff</dt>
                              <dd>{tablet.tradeoff}</dd>
                            </div>
                            <div>
                              <dt>Evidence status</dt>
                              <dd>{tablet.evidenceStatus}</dd>
                            </div>
                            {tablet.matchupNote && (
                              <div>
                                <dt>Matchup focus</dt>
                                <dd>{tablet.matchupNote}</dd>
                              </div>
                            )}
                          </dl>
                          <button
                            type="button"
                            className="tablet-accept"
                            disabled={!!swapFlourish}
                            onClick={() => {
                              trackLaunchEvent("coach_recommendation_viewed", {
                                format,
                                recommendation: tablet.recommendationIds?.recommendationId || "unknown",
                              });
                              applyExperimentTablet(tablet);
                            }}
                          >
                            {applying ? "Applying…" : "Accept this experiment →"}
                          </button>
                          <div className="honest-coach-tablet-feedback">
                            <small>Was this recommendation helpful?</small>
                            <button type="button" onClick={() => submitHonestCoachFeedback("helpful", tablet)}>Helpful</button>
                            <button type="button" onClick={() => submitHonestCoachFeedback("not-helpful", tablet)}>Not helpful</button>
                            <button type="button" onClick={() => submitHonestCoachFeedback("misunderstands-plan", tablet)}>Misreads my plan</button>
                          </div>
                        </div>
                        <div className="tablet-face tablet-face-back">
                          {Icon && (
                            <span className="tablet-motif-icon">
                              <Icon size={54} />
                            </span>
                          )}
                          <strong>EXPERIMENT ACCEPTED</strong>
                          <span>{tablet.change.add} enters the deck</span>
                        </div>
                      </div>
                    </article>
                  );
                })
              ) : (
                <p className="experiment-tablets-empty">
                  {experimentTablets
                    ? experimentTablets.summary
                    : experimentReportStatus === "loading"
                      ? "Running the one-slot laboratory…"
                      : experimentReportStatus === "error"
                        ? "The one-slot laboratory couldn't complete. It will retry on your next edit or match result."
                        : "Re-forge this deck to generate fresh evidence-led experiments."}
                </p>
              )}
            </div>
          </section>
            </div>,
            document.body,
          )}
          {benchStatus === "forging" ? (
            <section
              className="masterwork-forging-progress"
              role="status"
              aria-live="polite"
              aria-label="The native Forge is building your complete deck"
            >
              <ForgeProcessingLoader motionMode={motionMode} />
              <small>METAFORGE NATIVE ENGINE · DECK IN PROGRESS</small>
              <strong>
                {forgeElapsedSeconds < 5
                  ? "Reading your deck"
                  : forgeElapsedSeconds < 12
                    ? "Classifying roles and synergy packages"
                    : forgeElapsedSeconds < 22
                      ? "Forging three competing candidates"
                      : forgeElapsedSeconds < 35
                        ? "Testing curve, resilience, and legality"
                        : "Selecting the strongest complete deck"}
              </strong>
              <p>
                MetaForge is building locally from verified card evidence.
                The chamber will open automatically when every slot is set.
              </p>
              <time>
                {String(Math.floor(forgeElapsedSeconds / 60)).padStart(2, "0")}:
                {String(forgeElapsedSeconds % 60).padStart(2, "0")}
              </time>
              <div className="forging-progress-rail" aria-hidden="true"><span /></div>
            </section>
          ) : hasValidatedDeck ? (
            <>
              {tcgplayerAffiliateEnabled && (
                <p className="affiliate-disclosure" role="note">
                  {AFFILIATE_DISCLOSURE_TEXT}
                </p>
              )}
            {!guestMode && nativeMasterworkContext?.generationId && (
              <section className="multi-refill-workbench" aria-label="Multi-card cut and refill experiment">
                <div>
                  <small>TEST SEVERAL CHANGES TOGETHER</small>
                  <strong>
                    {Object.keys(refillCuts).length
                      ? `${Object.values(refillCuts).reduce((sum, quantity) => sum + quantity, 0)} slot${Object.values(refillCuts).reduce((sum, quantity) => sum + quantity, 0) === 1 ? "" : "s"} marked for replacement`
                      : multiRefillSelecting
                        ? "Select every card you want the Forge to replace."
                        : "Choose several cards, then compare complete replacement groups."}
                  </strong>
                  <span>Selected cards will stay out of every suggested replacement group.</span>
                </div>
                <button type="button" disabled={multiRefillStatus === "loading"} onClick={() => {
                  if (Object.keys(refillCuts).length) void forgeMultiRefill();
                  else setMultiRefillSelecting((current) => !current);
                }}>
                  {multiRefillStatus === "loading" ? "Finding safe groups…" : Object.keys(refillCuts).length ? "Compare replacement groups" : multiRefillSelecting ? "Stop choosing cards" : "Choose cards to replace"}
                </button>
                {Object.keys(refillCuts).length > 0 && (
                  <button type="button" className="multi-refill-clear" onClick={() => { setRefillCuts({}); setMultiRefillResult(null); setMultiRefillStatus("idle"); setMultiRefillSelecting(false); }}>
                    Clear
                  </button>
                )}
                {multiRefillError && <p role="alert">{multiRefillError}</p>}
                {multiRefillResult && (
                  <div className="multi-refill-packages">
                    <p>{multiRefillResult.summary}</p>
                    {multiRefillResult.packages.map((refill) => (
                      <article key={refill.id}>
                        <header><b>{refill.label}</b><span>{refill.context?.preservationScore?.toFixed?.(0) || "—"}% of the original plan kept</span></header>
                        <p>{refill.additions.map((row) => `+${row.quantity} ${row.name}`).join(" · ")}</p>
                        {refill.context && (
                          <div className="multi-refill-context">
                            <strong>{refill.context.summary}</strong>
                            <span>{refill.context.rolePreservation.toFixed(0)}% of deck jobs kept · {refill.context.systemPreservation.toFixed(0)}% of card groups kept</span>
                          </div>
                        )}
                        <small>{multiRefillResult.boundary}</small>
                        <button type="button" onClick={() => applyMultiRefillPackage(refill)}>Create this revision</button>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            )}
            {(cardFactsLoading || cardFactsError) && (
              <div className="deck-gallery-notice" role="status" aria-live="polite">
                <span>{cardFactsLoading ? "Organizing card types in the background…" : "Showing the complete deck alphabetically while card details reconnect."}</span>
                {cardFactsError && <button type="button" onClick={() => setCardFactsRetry((current) => current + 1)}>Retry details</button>}
              </div>
            )}
            {!cardFactsLoading && !cardFactsError && cardFactsPending > 0 && (
              <div className="deck-gallery-notice" role="status" aria-live="polite">
                <span>{cardFactsPending} card detail{cardFactsPending === 1 ? " is" : "s are"} still being matched. The rest of your deck is fully organized.</span>
              </div>
            )}
            {deckViewMode === "playtest" && (
              <Tabletop
                key="goldfish-tabletop"
                initialLens="hand"
                cards={tabletopCards}
                edges={interactionGraph.edges}
                previousCardNames={previousRevisionCardNames}
                activeCard={activeCard}
                onSelectCard={(name) => setHoveredCard(name)}
                onReviewSelectCard={(name) => setHoveredCard(name)}
                onInspectCard={(name) => setInspectedCard(name)}
                onLensChange={(lens) => setTabletopReviewActive(lens === "deck")}
                onMatchupContext={setMatchupCardAdvice}
                onMulliganDecision={(result) => trackLaunchEvent("mulligan_coach_decision", {
                  format,
                  strategy,
                  decision: result.decision,
                  coachVerdict: result.verdict,
                  confidence: result.confidence,
                  aligned: result.aligned,
                  lands: result.counts.lands,
                  otherMana: result.counts.otherMana,
                  earlyPlays: result.counts.earlyPlays,
                  responses: result.counts.responses,
                  writesToBrain: false,
                })}
                onOpenList={() => {
                  setTabletopReviewActive(false);
                  setDeckViewMode("ledger");
                }}
                strategy={strategy}
                occupancyEngines={coachOccupancyLabels}
              />
            )}
            {deckViewMode === "gallery" && (
              <div className="visual-deck-gallery" id="deck-gallery" aria-label="Card gallery">
                {[
                  "Commander",
                  "Complete deck",
                  "Details pending",
                  "Creatures",
                  "Planeswalkers",
                  "Instants",
                  "Sorceries",
                  "Artifacts",
                  "Enchantments",
                  "Battles",
                  "Lands",
                  "Other",
                ]
                  .filter((group) => groupedDeck[group]?.length)
                  .map((group) => (
                    <section className="visual-deck-group" key={group}>
                      <header>
                        <b>{group}</b>
                        <span>{groupedDeck[group].reduce((sum, row) => sum + row.quantity, 0)}</span>
                      </header>
                      <div className="visual-deck-cards">
                        {groupedDeck[group].map((row) => {
                          const rowFact = cardFacts[cardFactKey(row.name)];
                          const image = printingOverrides[cardFactKey(row.name)]?.image
                            || rowFact?.image_uris?.normal
                            || rowFact?.card_faces?.[0]?.image_uris?.normal
                            || cardImage(row.name);
                          return (
                            <button
                              type="button"
                              className="visual-deck-card"
                              key={row.name}
                              onClick={() => setInspectedCard(row.name)}
                              aria-label={`Preview ${row.name}, ${row.quantity} ${row.quantity === 1 ? "copy" : "copies"}`}
                            >
                              <span className="visual-deck-card-art">
                                <img src={image} alt="" loading="lazy" decoding="async" />
                                {row.quantity > 1 && <b>{row.quantity}×</b>}
                              </span>
                              <strong>{row.name}</strong>
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  ))}
              </div>
            )}
            {deckViewMode === "ledger" && (
            <div className="deck-gallery" id="deck-gallery">
              <div className="type-columns">
                {[
                  "Commander",
                  "Complete deck",
                  "Details pending",
                  "Creatures",
                  "Planeswalkers",
                  "Instants",
                  "Sorceries",
                  "Artifacts",
                  "Enchantments",
                  "Battles",
                  "Lands",
                  "Other",
                ]
                  .filter((group) => groupedDeck[group]?.length)
                  .map((group) => (
                    <section className="type-column" key={group}>
                      <header>
                        <b>{group}</b>
                        <span>
                          {groupedDeck[group].reduce(
                            (sum, row) => sum + row.quantity,
                            0,
                          )}
                        </span>
                      </header>
                      {group === "Commander" && coachOccupancyLabels.length > 0 && (
                        <p className="type-column-occupancy">{coachOccupancyLabels.join(" · ")}</p>
                      )}
                      {groupedDeck[group].map((row) => {
                        const rowKey = cardFactKey(row.name);
                        const isFoil = foilCards.has(rowKey);
                        const rowFact = effectivePriceFact(row.name);
                        const rowPrinting = printingOverrides[rowKey];
                        const rowPrice = cheapestPrintings
                          ? cheapestCardPriceUsd(rowFact)
                          : cardPriceUsd(rowFact, isFoil);
                        // Only the player's explicitly selected printing
                        // carries a reliable TCGplayer product ID here —
                        // an unselected row has no printing identity to
                        // be exact about, so this honestly falls back to
                        // a name search rather than guessing one.
                        const rowPurchaseLink = buildTcgplayerLink({
                          cardName: row.name,
                          tcgplayerProductId: rowPrinting?.tcgplayerId ?? null,
                          enabled: tcgplayerAffiliateEnabled,
                        });
                        const isCommanderRow = [selectedCommander?.name, selectedSecondCommander?.name]
                          .filter(Boolean)
                          .some((name) => cardFactKey(name as string) === rowKey);
                        const refillSelected = Boolean(refillCuts[row.name]);
                        const canSelectForRefill = multiRefillSelecting && !guestMode && Boolean(nativeMasterworkContext?.generationId) && !isCommanderRow;
                        return (
                          <div
                            role="button"
                            tabIndex={0}
                            key={row.name}
                            draggable
                            onDragStart={(event) => {
                              event.dataTransfer.setData(
                                "text/plain",
                                row.name,
                              );
                            }}
                            onFocus={() => setHoveredCard(row.name)}
                            onMouseEnter={() => scheduleDeckHover(row.name)}
                            onClick={() => {
                              setHoveredCard(row.name);
                              if (canSelectForRefill) {
                                setRefillCuts((current) => {
                                  const next = { ...current };
                                  if (next[row.name]) delete next[row.name];
                                  else next[row.name] = row.quantity;
                                  return next;
                                });
                                return;
                              }
                              setInspectedCard(row.name);
                            }}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                if (canSelectForRefill) {
                                  setRefillCuts((current) => {
                                    const next = { ...current };
                                    if (next[row.name]) delete next[row.name];
                                    else next[row.name] = row.quantity;
                                    return next;
                                  });
                                } else setInspectedCard(row.name);
                              }
                            }}
                            onContextMenu={(event) => {
                              event.preventDefault();
                              setPrintingMenu({
                                name: row.name,
                                x: Math.min(event.clientX, window.innerWidth - 270),
                                y: Math.min(event.clientY, window.innerHeight - 350),
                              });
                            }}
                            style={swapFlourish ? ({ "--motif-accent": masterworkVisualProfile.accent } as React.CSSProperties) : undefined}
                            className={[
                              "type-column-row",
                              activeCard === row.name ? "active" : "",
                              refillSelected ? "refill-selected" : "",
                              canSelectForRefill ? "refill-selectable" : "",
                              swapFlourish?.stage === "out" && row.name === swapFlourish.cut ? "card-row-cutting" : "",
                              swapFlourish?.stage === "in" && row.name === swapFlourish.add ? "card-row-materializing" : "",
                            ].filter(Boolean).join(" ")}
                          >
                            <span>{row.quantity}</span>
                            <strong>
                              {row.name}
                              {rowPrinting && (
                                <small
                                  className="card-row-printing-tag"
                                  title={`Priced from ${rowPrinting.setName} (${rowPrinting.setCode}) — right-click to change`}
                                >
                                  {rowPrinting.setCode}
                                </small>
                              )}
                            </strong>
                            {rowPrice !== null && (
                              <em className="card-row-price">
                                ${(rowPrice * row.quantity).toFixed(2)}
                              </em>
                            )}
                            {/* One wrapper occupies the row's fourth grid
                                column so a purchase link never becomes an
                                uncontrolled fifth grid item — see
                                .type-column-row's four-column grid in
                                app/testing-anvil.css. */}
                            <span className="card-row-actions">
                              {canSelectForRefill ? (
                                <button
                                  type="button"
                                  className="card-row-refill-toggle"
                                  aria-pressed={refillSelected}
                                  aria-label={`${refillSelected ? "Keep" : "Replace"} ${row.name}`}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setRefillCuts((current) => {
                                      const next = { ...current };
                                      if (next[row.name]) delete next[row.name];
                                      else next[row.name] = row.quantity;
                                      return next;
                                    });
                                  }}
                                >{refillSelected ? "✓" : "+"}</button>
                              ) : <><button
                                type="button"
                                className="card-row-more"
                                aria-haspopup="menu"
                                aria-expanded={cardActionMenu?.name === row.name}
                                aria-label={`More options for ${row.name}`}
                                title="More card options"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  const bounds = event.currentTarget.getBoundingClientRect();
                                  setCardActionMenu({
                                    name: row.name,
                                    x: Math.min(bounds.right - 12, window.innerWidth - 250),
                                    y: Math.min(bounds.bottom + 6, window.innerHeight - 260),
                                  });
                                }}
                              >•••</button><button
                                type="button"
                                className={`card-row-foil-toggle${isFoil ? " active" : ""}`}
                                aria-pressed={isFoil}
                                disabled={cheapestPrintings}
                                aria-label={`${isFoil ? "Stop pricing" : "Price"} ${row.name} as foil`}
                                title={
                                  cheapestPrintings
                                    ? "Turn off Cheapest Printings to choose foil or nonfoil per card"
                                    : isFoil
                                      ? "Priced as foil"
                                      : "Price as foil"
                                }
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setFoilCards((current) => {
                                    const next = new Set(current);
                                    if (next.has(rowKey)) next.delete(rowKey);
                                    else next.add(rowKey);
                                    return next;
                                  });
                                }}
                              >
                                ✦
                              </button>
                              {rowPurchaseLink && (
                                <a
                                  className={`card-row-purchase-link${rowPurchaseLink.isExactPrinting ? " exact-printing" : ""}`}
                                  href={rowPurchaseLink.url}
                                  target={rowPurchaseLink.target}
                                  rel={rowPurchaseLink.rel}
                                  aria-label={`${rowPurchaseLink.label} — ${row.name}`}
                                  title={rowPurchaseLink.isExactPrinting ? "Opens this exact printing on TCGplayer" : "Opens a TCGplayer search for this card"}
                                  onClick={(event) => event.stopPropagation()}
                                >
                                  ↗
                                </a>
                              )}</>}
                            </span>
                          </div>
                        );
                      })}
                    </section>
                  ))}
              </div>
            </div>
            )}
            <footer className="masterwork-shell-bottom">
              <span>
                <b>{deckRows.reduce((sum, row) => sum + row.quantity, 0)}</b> cards <i /> {activeCommanderName || "Complete deck"}
                {(() => {
                  const label = relativeUpdatedLabel(savedMasterworks.find((family) => family.id === deckId)?.updatedAt);
                  return label ? <em className="masterwork-updated-label"> · {label}</em> : null;
                })()}
                {coachOccupancyLabels.length > 0 && (
                  <em className="masterwork-footer-occupancy"> · {coachOccupancyLabels.join(" · ")}</em>
                )}
              </span>
              <div>
                <button
                  type="button"
                  onClick={() => {
                    const blob = new Blob([formatDeckForArenaExport(forgedDeck)], { type: "text/plain;charset=utf-8" });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = `${(activeCommanderName || chosenWork.name || "metaforge-deck").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.txt`;
                    link.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  Export
                </button>
                <button type="button" onClick={() => navigator.clipboard.writeText(formatDeckForArenaExport(forgedDeck))}>Copy deck</button>
                {!guestMode && nativeMasterworkContext?.generationId && <button type="button" disabled={publicReportStatus === "publishing"} onClick={() => publicReportUrl && publicReportGenerationId === nativeMasterworkContext?.generationId ? void navigator.clipboard.writeText(publicReportUrl) : setPublicReportPromptOpen(true)}>{publicReportStatus === "publishing" ? "Publishing…" : publicReportStatus === "ready" && publicReportGenerationId === nativeMasterworkContext?.generationId ? "Copy public link" : "Publish public report"}</button>}
                {publicReportUrl && <a className="public-report-status" href={publicReportUrl} target="_blank" rel="noopener noreferrer">Open report ↗</a>}
                {publicReportUrl && <button type="button" disabled={publicReportStatus === "publishing"} onClick={() => void unpublishPublicDeckReport()}>Unpublish</button>}
                {deckPurchaseLink && <a href={deckPurchaseLink.url} target={deckPurchaseLink.target} rel={deckPurchaseLink.rel}>Buy deck</a>}
                <button type="button" className="masterwork-playtest" onClick={() => { setActiveForgeChapter(1); setDeckViewMode("playtest"); window.requestAnimationFrame(() => document.querySelector(".tabletop-surface")?.scrollIntoView({ behavior: "smooth", block: "start" })); }}>Goldfish this deck →</button>
              </div>
            </footer>
            </>
          ) : forgeGenerationError ? (
            <div className="forge-generation-failure" role="alert">
              {forgeGenerationFailure?.code === "GUEST_PREVIEW_ALREADY_USED" ? (
                <>
                  <small>FORGE ALREADY IN PROGRESS</small>
                  <h3>This Forge is already running.</h3>
                  <p>Wait a moment, then try again. You can keep building without an account — sign in only if you want to save a deck.</p>
                  <div className="forge-generation-failure-actions">
                    {forgeGenerationFailure.claimToken && (
                      <a href={`https://app.metaforge.gg/?claim=${encodeURIComponent(forgeGenerationFailure.claimToken)}`}>
                        Sign in to save your last preview →
                      </a>
                    )}
                    <button
                      disabled={guestMode && !turnstileToken}
                      onClick={() => {
                        if (deck.trim()) {
                          void commitDirectForge("decklist");
                          return;
                        }
                        void commitDirectForge("commander");
                      }}
                    >
                      Strike the Anvil Again
                    </button>
                  </div>
                </>
              ) : forgeGenerationFailure?.code === "NETWORK_RATE_LIMITED" ? (
                <>
                  <small>TOO MANY ATTEMPTS FROM THIS NETWORK</small>
                  <h3>This network has reached today's Forge limit.</h3>
                  <p>{forgeGenerationError}</p>
                  {/* Also non-retryable, and for a fundamentally different
                      reason than the entitlement case above: this is an
                      anti-abuse signal on the network, not a claim about
                      this player's own preview — a fresh Turnstile token
                      changes nothing about it, so no retry is offered. */}
                  <div className="forge-generation-failure-actions">
                    <a href={signInResumeHref}>Sign in and continue this Forge →</a>
                  </div>
                </>
              ) : (
                <>
                  <small>THE METAL DID NOT SET</small>
                  <h3>No incomplete deck was saved.</h3>
                  <p>{forgeGenerationError}</p>
                  {guestMode && !turnstileToken && (
                    <p className="forge-generation-failure-verify-note">
                      Your preview was not used. Complete the verification above, then try again.
                    </p>
                  )}
                  <button
                    disabled={guestMode && !turnstileToken}
                    onClick={() => {
                      if (deck.trim()) {
                        void commitDirectForge("decklist");
                        return;
                      }
                      void commitDirectForge("commander");
                    }}
                  >
                    Strike the Anvil Again
                  </button>
                </>
              )}
            </div>
          ) : (
            <pre>The Forge is waiting for a valid deck request.</pre>
          )}
          {inspectedCard && createPortal(
            <div
              className="card-inspector-backdrop"
              role="presentation"
              onMouseDown={(event) => {
                if (event.currentTarget === event.target) setInspectedCard("");
              }}
            >
              <section
                className="card-inspector"
                role="dialog"
                aria-modal="true"
                aria-labelledby="card-inspector-title"
              >
                <button
                  type="button"
                  className="card-inspector-close"
                  onClick={() => setInspectedCard("")}
                  aria-label="Close card inspector"
                >
                  ×
                </button>
                <div className="card-inspector-art">
                  {inspectedImage && <img src={inspectedImage} alt={`${inspectedCard} card`} />}
                  {deckRows.length > 1 && (
                    <nav className="card-inspector-navigation" aria-label="Browse deck cards">
                      <button
                        type="button"
                        onClick={() => {
                          const index = deckRows.findIndex((row) => row.name === inspectedCard);
                          setInspectedCard(deckRows[(index - 1 + deckRows.length) % deckRows.length].name);
                        }}
                        aria-label="Preview previous card"
                      >← Previous</button>
                      <button
                        type="button"
                        onClick={() => {
                          const index = deckRows.findIndex((row) => row.name === inspectedCard);
                          setInspectedCard(deckRows[(index + 1) % deckRows.length].name);
                        }}
                        aria-label="Preview next card"
                      >Next →</button>
                    </nav>
                  )}
                  {inspectedPrinting && (
                    <small>
                      SELECTED PRINTING · {inspectedPrinting.setName} ({inspectedPrinting.setCode.toUpperCase()}) #{inspectedPrinting.collectorNumber}
                    </small>
                  )}
                  {(() => {
                    const price = cardPriceUsd(inspectedFact, foilCards.has(cardFactKey(inspectedCard)));
                    return price !== null ? <strong className="card-inspector-price">${price.toFixed(2)}</strong> : null;
                  })()}
                  {inspectorPurchaseLink && (
                    <a
                      className="card-inspector-purchase-link"
                      href={inspectorPurchaseLink.url}
                      target={inspectorPurchaseLink.target}
                      rel={inspectorPurchaseLink.rel}
                      onClick={(event) => event.stopPropagation()}
                    >
                      Buy on TCGplayer
                    </a>
                  )}
                  {inspectedFact?.legalities && (
                    <ul className="card-inspector-legality" aria-label="Format legality">
                      {[
                        ["standard", "Standard"],
                        ["pioneer", "Pioneer"],
                        ["modern", "Modern"],
                        ["premodern", "Premodern"],
                        ["commander", "Commander"],
                        ["brawl", "Brawl"],
                        ["historic", "Historic"],
                      ].map(([key, label]) => {
                        const legal = inspectedFact.legalities?.[key] === "legal";
                        return (
                          <li key={key} className={legal ? "is-legal" : "is-not-legal"}>
                            <i aria-hidden="true">{legal ? "✓" : "✕"}</i>
                            {label}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
                <div className="card-inspector-dossier">
                  <small>CONTEXTUAL CARD DOSSIER</small>
                  <h3 id="card-inspector-title">{inspectedCard}</h3>
                  <p className="card-inspector-type">{inspectedFact?.type_line || "Card type unavailable"}</p>
                  <small>ORACLE TEXT</small>
                  <p className="card-inspector-oracle">
                    {inspectedFact?.oracle_text || inspectedFact?.card_faces?.map((face) => face.oracle_text).filter(Boolean).join("\n\n") || "Oracle text is not available for this card."}
                  </p>
                  <div className="card-inspector-signals">
                    <span><b>{inspectedRole || "Unclassified"}</b> slot duty</span>
                    <span><b>{inspectedConnections.length}</b> verified connection{inspectedConnections.length === 1 ? "" : "s"}</span>
                    <span><b>{inspectedSystems.length}</b> system{inspectedSystems.length === 1 ? "" : "s"}</span>
                  </div>
                  {inspectedEvaluation && (
                    <div className="card-context-scores" aria-label="Contextual deck scores">
                      {[
                        ["Synergy", inspectedEvaluation.scores.synergy],
                        ["Plan fit", inspectedEvaluation.scores.planFit],
                        ["Evidence", inspectedEvaluation.scores.reliability],
                        ["Impact", inspectedEvaluation.scores.structuralImpact],
                        ["Replaceable", inspectedEvaluation.scores.replaceability],
                      ].map(([label, score]) => (
                        <span key={String(label)} title={`${label}: ${score} out of 100 in this deck`}>
                          <small>{label}</small>
                          <b>{score}</b>
                          <i><em style={{ width: `${score}%` }} /></i>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="card-inspector-section">
                    <small>WHY IT IS HERE</small>
                    <p>{inspectedEvaluation?.whyHere || inspectedSlotReason}</p>
                  </div>
                  {inspectedEvaluation && (
                    <div className="card-inspector-section card-inspector-timing">
                      <small>INTENT &amp; CLOCK</small>
                      <p><b>Intent:</b> {inspectedEvaluation.timing.intent}</p>
                      <p><b>Clock:</b> {inspectedEvaluation.timing.clock}</p>
                      <p><b>Why it matters:</b> {inspectedEvaluation.timing.whyItMatters}</p>
                    </div>
                  )}
                  {inspectedEvaluation && (
                    <div className="card-inspector-section">
                      <small>IF YOU CUT IT</small>
                      <p>{inspectedEvaluation.cutImpact}</p>
                      {inspectedEvaluation.alternatives.length > 0 && (
                        <p className="card-context-alternatives"><b>Detected role alternatives:</b> {inspectedEvaluation.alternatives.join(" · ")}</p>
                      )}
                    </div>
                  )}
                  {inspectedMentorHasSeat && inspectedMentor && (
                    <div className="card-inspector-section card-inspector-seat">
                      <small>SEAT LANGUAGE · EXPERIMENTAL</small>
                      <p>{inspectedMentor.paragraph}</p>
                      <p className="card-context-alternatives">{inspectedMentor.openQuestion}</p>
                    </div>
                  )}
                  {inspectedOccupancyLabels.length > 0 && (
                    <div className="card-inspector-section card-inspector-seat">
                      <small>OCCUPANCY LANGUAGE · EXPERIMENTAL</small>
                      <p>Occupancy engines: {inspectedOccupancyLabels.join(" · ")}. Named from commander oracle, not from composition of the 99.</p>
                    </div>
                  )}
                  {inspectedPackageMentors.map((explanation) => (
                    <div key={explanation.packageId} className="card-inspector-section card-inspector-seat">
                      <small>PACKAGE LANGUAGE · EXPERIMENTAL</small>
                      <p>{explanation.commentary}</p>
                    </div>
                  ))}
                  {inspectedPairMentors.map((explanation) => (
                    <div key={explanation.cards.join("+")} className="card-inspector-section card-inspector-seat">
                      <small>PAIR LANGUAGE · EXPERIMENTAL</small>
                      <p>{explanation.paragraph}</p>
                      <p className="card-context-alternatives">{explanation.openQuestion}</p>
                    </div>
                  ))}
                  {!guestMode && nativeMasterworkContext?.generationId && (() => {
                    const inspectedRow = deckRows.find((row) => row.name === inspectedCard);
                    const selectedQuantity = refillCuts[inspectedCard] || 0;
                    if (!inspectedRow || inspectedIsCommander) return null;
                    return (
                      <div className="card-inspector-refill">
                        <div>
                          <small>CUT &amp; REFILL</small>
                          <p>Mark copies to remove. The Forge will fill every open slot without proposing this card as a replacement.</p>
                        </div>
                        <div className="card-inspector-quantity">
                          <button type="button" disabled={selectedQuantity === 0} onClick={() => setRefillCuts((current) => {
                            const next = { ...current };
                            if (selectedQuantity <= 1) delete next[inspectedCard];
                            else next[inspectedCard] = selectedQuantity - 1;
                            return next;
                          })}>−</button>
                          <b>{selectedQuantity}</b>
                          <button type="button" disabled={selectedQuantity >= inspectedRow.quantity} onClick={() => setRefillCuts((current) => ({ ...current, [inspectedCard]: Math.min(inspectedRow.quantity, selectedQuantity + 1) }))}>+</button>
                        </div>
                      </div>
                    );
                  })()}
                  <div className="card-inspector-section">
                    <small>DECK CONNECTIONS</small>
                    {inspectedConnections.length ? (
                      <ul>
                        {inspectedConnections.slice(0, 6).map((edge) => {
                          const counterpart = edge.from === inspectedCard ? edge.to : edge.from;
                          return (
                            <li key={`${edge.from}-${edge.to}`}>
                              <b>
                                <ForgeCardRef
                                  name={counterpart}
                                  surface="dossier-connection"
                                  onInspect={(name) => {
                                    setHoveredCard(name);
                                    setInspectedCard(name);
                                  }}
                                />
                              </b>
                              <span>{edge.signals.join(" + ")}</span>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p>No direct mechanical connection is currently verified. That is evidence to inspect—not proof that the card is useless.</p>
                    )}
                  </div>
                  {inspectedSystems.length > 0 && (
                    <div className="card-inspector-section">
                      <small>SYSTEM MEMBERSHIP</small>
                      <p>{inspectedSystems.map((system) => system.name).join(" · ")}</p>
                    </div>
                  )}
                  <p className="card-inspector-boundary">
                    {activeStructuralReport.cardEvaluations.methodology}
                  </p>
                </div>
              </section>
            </div>,
            document.body,
          )}
          {cardActionMenu && createPortal((() => {
            const menuRow = deckRows.find((row) => row.name === cardActionMenu.name);
            const menuKey = cardFactKey(cardActionMenu.name);
            const menuIsFoil = foilCards.has(menuKey);
            const menuIsCommander = [selectedCommander?.name, selectedSecondCommander?.name]
              .filter(Boolean)
              .some((name) => cardFactKey(name as string) === menuKey);
            const canRefill = !guestMode && Boolean(nativeMasterworkContext?.generationId) && !menuIsCommander && Boolean(menuRow);
            return (
              <div
                className="card-action-menu"
                role="menu"
                aria-label={`${cardActionMenu.name} actions`}
                style={{ left: cardActionMenu.x, top: cardActionMenu.y }}
                onClick={(event) => event.stopPropagation()}
              >
                <header>
                  <small>CARD OPTIONS</small>
                  <b>{cardActionMenu.name}</b>
                </header>
                <button
                  type="button"
                  role="menuitem"
                  autoFocus
                  onClick={() => {
                    setInspectedCard(cardActionMenu.name);
                    setCardActionMenu(null);
                  }}
                >
                  <span>View card dossier</span><i>Oracle text &amp; deck context</i>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setPrintingMenu({ name: cardActionMenu.name, x: cardActionMenu.x, y: cardActionMenu.y });
                    setCardActionMenu(null);
                  }}
                >
                  <span>Choose printing</span><i>Art, set &amp; price</i>
                </button>
                {canRefill && menuRow && (
                  <button
                    type="button"
                    role="menuitem"
                    disabled={(refillCuts[cardActionMenu.name] || 0) >= menuRow.quantity}
                    onClick={() => {
                      setRefillCuts((current) => ({
                        ...current,
                        [cardActionMenu.name]: Math.min(menuRow.quantity, (current[cardActionMenu.name] || 0) + 1),
                      }));
                      setCardActionMenu(null);
                    }}
                  >
                    <span>Mark one for replacement</span><i>{refillCuts[cardActionMenu.name] || 0} of {menuRow.quantity} marked</i>
                  </button>
                )}
                <button
                  type="button"
                  role="menuitem"
                  disabled={cheapestPrintings}
                  onClick={() => {
                    setFoilCards((current) => {
                      const next = new Set(current);
                      if (next.has(menuKey)) next.delete(menuKey);
                      else next.add(menuKey);
                      return next;
                    });
                    setCardActionMenu(null);
                  }}
                >
                  <span>{menuIsFoil ? "Use nonfoil pricing" : "Use foil pricing"}</span><i>{cheapestPrintings ? "Turn off Cheapest Printings first" : "Pricing preference"}</i>
                </button>
              </div>
            );
          })(), document.body)}
          {importWarnings.length > 0 && (
            <div className="import-warnings" role="status">
              <small>SOME CARDS WERE LEFT OUT</small>
              <ul>
                {importWarnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          )}
          {hasValidatedDeck && (
            <details className="raw-decklist">
              <summary>View complete Forge response / import text</summary>
              <pre>{forgedDeck}</pre>
            </details>
          )}
          {hasValidatedDeck && (
            <footer>
              <span>
                Featured{" "}
                {format === "Commander" || format === "Brawl"
                  ? "commander"
                  : "lynchpin"}
                : <b>{activeCommanderName || "Not identified"}</b>
              </span>
              <button
                disabled={!deckIntegrity.passed}
                title={deckIntegrity.passed ? "Begin a recorded test with this verified revision" : "Every legality and structural check must pass before testing"}
                onClick={beginTesting}
              >
                {benchStatus === "testing"
                  ? "Tune this deck →"
                  : "Try one improvement →"}
              </button>
            </footer>
          )}
        </article>
        <aside className="testing-loop">
          <header>
            <small>TUNE</small>
            <h2>Try one evidence-led change.</h2>
            <p>Start with the recommended change. Reasoning and match history are there if you want them.</p>
          </header>
          {forgeReply && (
            <details className="why-this-masterwork">
              <summary>
                <small>WHY THIS DECK</small>
                <b>The Forge's reasoning at generation</b>
              </summary>
              <pre>{forgeReply}</pre>
            </details>
          )}
          {metaBreakerDossier && (
            <section className="meta-breaker-dossier">
              <header>
                <span><small>DECK STRESS LAB · CONTROLLED TEST</small><b>What this deck struggled with, why it matters, and one safe change to compare.</b></span>
                <strong>{metaBreakerDossier.confidence}</strong>
              </header>
              <div>
                <span><small>WHAT THE MODEL SAW</small><b>{metaBreakerDossier.field}</b><em>{metaBreakerDossier.source}</em></span>
                <span><small>WHY IT MATTERS</small><b>{metaBreakerDossier.hypothesis}</b></span>
                <span><small>ONE CHANGE TO TEST</small><b>{metaBreakerDossier.test}</b></span>
              </div>
              <footer className="meta-breaker-workflow">
                <button onClick={forgeMetaBreakerExperiments} disabled={metaBreakerLoading || !deckIntegrity.passed}>
                  {metaBreakerLoading ? "Searching the legal card pool…" : "Show three one-card tests"}
                </button>
                {metaBreakerExperiments.length > 0 && <div>
                  {metaBreakerExperiments.map((experiment) => (
                    <article key={`${experiment.cut}-${experiment.add.name}`}>
                      <img src={experiment.add.image} alt="" />
                      <span>
                        <small>ONE-CARD TEST</small>
                        <b>−1 {experiment.cut}<br />+1 {experiment.add.name}</b>
                        <p><strong>WHY THIS SWAP</strong>{experiment.reason}</p>
                        <p><strong>EXPECTED CHANGE</strong>{experiment.expectedChange}</p>
                        <p><strong>HOW TO JUDGE IT</strong>{experiment.measurement}</p>
                        <em>{experiment.confidence}</em>
                      </span>
                      <button onClick={() => applyMetaBreakerExperiment(experiment)}>Create revision</button>
                    </article>
                  ))}
                </div>}
                {!metaBreakerLoading && metaBreakerExperiments.length === 0 && <small>Every proposed add is checked against live format legality, Arena availability when required, and commander color identity before it appears here.</small>}
              </footer>
            </section>
          )}
          <details className="deep-forge-redirect-drawer">
            <summary>
              <small>ADVANCED</small>
              <b>Tournament-rival one-card experiments</b>
            </summary>
            <p>
              A second, independent set of gated one-card tests compares
              this exact build against its closest tournament rival from
               generation. Find it in the{" "}
               <button type="button" className="deep-forge-redirect-link" onClick={() => {
                setExperimentLabOpen(true);
               }}>
                tournament-rival experiments
              </button>.
            </p>
          </details>
          <details
            id="match-evidence"
            className="match-evidence-drawer"
            open={matchEvidenceOpen}
            onToggle={(event) => setMatchEvidenceOpen(event.currentTarget.open)}
          >
            <summary>
              <span><small>MATCH EVIDENCE · OPTIONAL</small><b>Record games and inspect what the Forge has learned</b></span>
              <strong>{matchEvidenceOpen ? "HIDE" : `${revisionLearning.sampleSize} RECORDED`}</strong>
            </summary>
          <section className="evidence-ritual" aria-label="Record one match">
            <header>
              <span><small>STEP 1 · THE RESULT</small><b>What happened at the table?</b></span>
              <em>REVISION {Math.max(1, revisions.length)}</em>
            </header>
            <div className="test-record">
              <button className={pendingMatchResult === "win" ? "selected" : ""} onClick={() => setPendingMatchResult("win")}>
                I won this match <b>{record.wins}</b>
              </button>
              <button className={pendingMatchResult === "loss" ? "selected" : ""} onClick={() => setPendingMatchResult("loss")}>
                I lost this match <b>{record.losses}</b>
              </button>
            </div>
            {pendingMatchResult && (
              <div className="evidence-context">
                <label className="opponent-signal">
                  <span>STEP 2 · WHAT DID YOU FACE?</span>
                  <select value={opponentArchetype} onChange={(event) => setOpponentArchetype(event.target.value)}>
                    {["Unknown / not sure", "Aggro", "Tempo", "Midrange", "Control", "Ramp", "Combo", "Tokens", "Graveyard", "Other / rogue"].map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </label>
                <fieldset>
                  <legend>STEP 3 · WHAT WAS THE CLEAREST LESSON?</legend>
                  {["The plan came together", "Too slow to stabilize", "Mana helped or hurt", "Interaction arrived at the wrong time", "My mulligan decision mattered", "I found a sequencing mistake", "A key card overperformed", "No single lesson isolated"].map((signal) => (
                    <button type="button" key={signal} onClick={() => {
                      if (/mulligan|sequencing/i.test(signal)) {
                        setPendingDecisionSignal(signal);
                        setPilotingDebrief((current) => ({ ...current, window: /mulligan/i.test(signal) ? "mulligan" : "sequencing" }));
                      } else {
                        void recordMatch(pendingMatchResult, signal);
                      }
                    }}>{signal}<i>→</i></button>
                  ))}
                </fieldset>
                {pendingDecisionSignal && (
                  <section className="piloting-debrief" aria-label="Capture the decision for coaching">
                    <header><small>DECISION REVIEW</small><b>Give the coach the branch—not just the result.</b></header>
                    <div>
                      <label><span>Decision window</span><select value={pilotingDebrief.window} onChange={(event) => setPilotingDebrief((current) => ({ ...current, window: event.target.value }))}>{["mulligan", "sequencing", "combat", "resource", "interaction", "other"].map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
                      <label><span>Your role</span><select value={pilotingDebrief.role} onChange={(event) => setPilotingDebrief((current) => ({ ...current, role: event.target.value }))}>{["uncertain", "pressure", "defense", "pivot"].map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
                    </div>
                    <label><span>What did you know at the time?</span><textarea value={pilotingDebrief.knownInformation} onChange={(event) => setPilotingDebrief((current) => ({ ...current, knownInformation: event.target.value }))} maxLength={800} /></label>
                    <label><span>What line did you choose?</span><textarea value={pilotingDebrief.chosenLine} onChange={(event) => setPilotingDebrief((current) => ({ ...current, chosenLine: event.target.value }))} maxLength={500} /></label>
                    <label><span>Name one legal alternative.</span><textarea value={pilotingDebrief.alternativeLine} onChange={(event) => setPilotingDebrief((current) => ({ ...current, alternativeLine: event.target.value }))} maxLength={500} /></label>
                    <label><span>What punished the choice, if anything?</span><textarea value={pilotingDebrief.observedPunishment} onChange={(event) => setPilotingDebrief((current) => ({ ...current, observedPunishment: event.target.value }))} maxLength={800} /></label>
                    <footer>
                      <button type="button" onClick={() => setPendingDecisionSignal("")}>Cancel</button>
                      <button type="button" disabled={!pilotingDebrief.chosenLine.trim() || !pilotingDebrief.alternativeLine.trim()} onClick={() => {
                        const debrief = createPilotingDebrief({ ...pilotingDebrief, read: pendingDecisionSignal });
                        void recordMatch(pendingMatchResult, pendingDecisionSignal, undefined, debrief);
                      }}>Save decision review →</button>
                    </footer>
                    <small>A loss doesn't mean the choice was wrong — this stays saved so recurring decisions can be coached without editing the deck.</small>
                  </section>
                )}
                <small>Choose the closest honest observation. The Forge preserves it as one clue—not a verdict.</small>
              </div>
            )}
          </section>
          <section className="revision-learning-dossier">
            <header><small>REVISION {Math.max(1, revisions.length)} LEARNING</small><b>{revisionLearning.sampleSize} recorded match{revisionLearning.sampleSize === 1 ? "" : "es"}</b></header>
            <p className="revision-learning-dossier-teaser">
              The full coaching diagnosis, revision patterns, and continual-learning readout moved to{" "}
              <a href={`/research?deckId=${encodeURIComponent(deckId || "unsaved-masterwork")}`}>Research &amp; Evidence →</a>
            </p>
          </section>
          </details>
          {swapFlourish && (
            <div
              className={`swap-flourish-banner stage-${swapFlourish.stage}`}
              role="status"
              style={{ "--motif-accent": masterworkVisualProfile.accent } as React.CSSProperties}
            >
              {swapFlourish.stage === "out" ? (
                <>
                  <span>PULLING</span>
                  <b>{swapFlourish.cut}</b>
                </>
              ) : (
                <>
                  <span>FORGED IN</span>
                  <b>{swapFlourish.add}</b>
                  <em>Revision {revisions.length} preserved · private bench sync</em>
                </>
              )}
            </div>
          )}
          <footer>
            <b>{revisions.length || 1}</b>
            <span>
              REVISION{revisions.length === 1 ? "" : "S"} PRESERVED ·
              PRIVATE BENCH SYNC
            </span>
            {deckId && (
              currentFamilyArchived ? (
                <button
                  type="button"
                  className="unfinish-masterwork"
                  onClick={() => setFamilyArchived(deckId, false)}
                >
                  Return to the Forge
                </button>
              ) : (
                <button
                  type="button"
                  className="finish-masterwork"
                  onClick={finishCurrentMasterwork}
                >
                  Save as Finished Deck
                </button>
              )
            )}
          </footer>
          {sealBurst && (
            <div className="masterwork-seal-burst" role="status" aria-live="polite">
              <video
                className="seal-burst-video"
                src="/assets/forge/vfx/ring-seal.mp4"
                autoPlay
                muted
                playsInline
                preload="auto"
              />
              <strong>MASTERWORK SEALED</strong>
            </div>
          )}
        </aside>
        <ProvingGroundsEra
          occupancyEngines={coachOccupancyLabels}
          revision={Math.max(1, revisions.length)}
          title={coachingSession.title}
          question={activeFieldTest?.question || coachingSession.action || provingGrounds.question}
          watchFor={activeFieldTest?.watchFor || coachingSession.measurement || provingGrounds.watchFor}
          boundary={provingGrounds.boundary}
          active={Boolean(activeFieldTest)}
          read={fieldTestRead}
          checkIn={coachingCheckin}
          evidence={matchLog.filter((entry) => entry.revision === Math.max(1, revisions.length))}
          supporting={coachingSession.progress.supporting}
          contradicting={coachingSession.progress.contradicting}
          canBegin={deckIntegrity.passed || Boolean(nativeMasterworkContext?.generationId)}
          onBegin={beginProvingGroundsTest}
          onIssue={(issue) => setCoachingCheckin({ issue, handled: null })}
          onHandled={(handled) => setCoachingCheckin((current) => ({ ...current, handled }))}
          onFinish={(overall) => finishProvingGroundsTest(
            coachingCheckin.issue === "yes" ? "observed" : "missed",
            { issue: coachingCheckin.issue!, handled: coachingCheckin.handled!, overall },
          )}
          onRerun={() => { setFieldTestRead(null); beginProvingGroundsTest(); }}
          onOpenHistory={() => { setActiveForgeChapter(2); setMatchEvidenceOpen(true); window.requestAnimationFrame(() => document.getElementById("match-evidence")?.scrollIntoView({ behavior: "smooth", block: "center" })); }}
        />
      </div>
      {hasValidatedDeck && siteRail !== "decklist" && (
        <RevisionOpinionPanel
          occupancyEngines={coachOccupancyLabels}
          familyId={deckId || null}
          fingerprint={
            revisions.at(-1)?.fingerprint
            || (savedMasterworks.find((family) => family.id === deckId)?.revisions?.at(-1) as { fingerprint?: string; id?: string } | undefined)?.fingerprint
            || (savedMasterworks.find((family) => family.id === deckId)?.revisions?.at(-1) as { fingerprint?: string; id?: string } | undefined)?.id
            || null
          }
          revisionId={
            (savedMasterworks.find((family) => family.id === deckId)?.revisions?.at(-1) as { id?: string } | undefined)?.id
            || null
          }
          signedIn={!guestMode}
          enabled={hasValidatedDeck}
        />
      )}
    </section>
  );
}
