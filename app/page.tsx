"use client";

import { startTransition, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { configureCardTagLookup } from "./strategic-intent.mjs";
import { useForgeSessionState, ForgeSessionProvider } from "./forge-session-context";
import { EntranceChamber } from "./components/forge/entrance-chamber";
import { ForgingChamber } from "./components/forge/forging-chamber";
import { MasterworksChamber } from "./components/forge/masterworks-chamber";
import { REVIEW_FOCUS_OPTIONS, REVIEW_FOCUS_LABELS, toggleReviewFocus } from "./review-focus.mjs";
import { resolveAcademyGuideEntry } from "./academy-guide-entry.mjs";
import { commanderOptionForSlug } from "./commanders/data.mjs";
import { getMetaIntelligence } from "./meta-intelligence.mjs";
import { cardImage, cardArtCrop } from "./card-art";
// The interaction graph, systems intelligence, causality engine, bounded
// failure analysis, goldfish/matchup simulation, and revision/
// intervention learning all now run server-side
// (worker/forge-structural-analyze.ts, called via a debounced fetch to
// /api/forge/structural-analyze) rather than shipping their full
// reasoning to the browser. This type-only import (plus one small real
// "no cards yet" data constant) carries zero engine logic into the
// client bundle.
import type { ForgeAnalysisReport } from "./forge-analysis-contract";
import { EMPTY_FORGE_ANALYSIS_REPORT } from "./forge-analysis-contract";
import type { ForgeExperimentReport } from "./forge-experiment-contract";
import { runDebouncedAnalysis } from "./debounced-analysis-request.mjs";
import { applyControlledSwap, experimentAdditionSynergy, rankExperimentAdditions, rankExperimentCuts } from "./meta-breaker-experiment.mjs";
// forgeNativeMasterwork/forgeImportedMasterwork deliberately NOT imported
// here anymore — the actual deck-construction algorithm now runs
// server-side only (worker/forge-generate.ts, called via
// callForgeGenerate's fetch to /api/forge/generate), so it no longer
// ships in this client bundle. These two remain: they're small,
// self-contained utilities still used elsewhere in this file (blueprint
// note parsing and the post-swap mana-consistency refresh on the Testing
// Anvil), not part of the construction algorithm itself. colorPipsFromCost
// moved out entirely once the simulation dossier that was its only
// caller became server-side too.
import { manaConsistencyReport } from "./blueprint-note-and-mana.mjs";
import { explainCardAsMentor, explainOccupiedPackagesAsMentor, explainPairsForCardAsMentor, occupancyEngineLabelsForCommander, occupancyEngineLabelsForCommanders } from "./knowledge/mentor-shadow.mjs";
import { commanderOptionFromCard, resolvePastedCommanderCandidate } from "./deck-import-commander.mjs";
import { updateFamily, setFamilyMotifWeights } from "./deck-bench.mjs";
import {
  resolveDeckStructuralCards,
  motifWeightsFromStructuralCards,
} from "./deck-motif-scan.mjs";
import {
  computePlayerIdentity,
  diffPlayerIdentity,
} from "./player-identity.mjs";
import { IdentityBadge } from "./identity-badge";
import { prepareStoryBenchRevisions, serializeStoryBenchRevision, restoreStoryBenchRevisions } from "./story-bench-recommendation-ledger.mjs";
import { resolveMasterworkVisualProfile } from "./masterwork-visual-profile.mjs";
import { MOTIF_ICONS } from "./masterwork-motif-icons";
import { buildTcgplayerDeckLink, buildTcgplayerLink, AFFILIATE_DISCLOSURE_TEXT } from "./affiliate-links.mjs";
import { deckFingerprint } from "./deck-fingerprint.mjs";
import { formatDeckForArenaExport } from "./deck-export-format.mjs";
import { createPilotingDebrief } from "./piloting-debrief.mjs";
import { buildCoachingSession } from "./coaching-session.mjs";
import { trackLaunchEvent } from "./launch-telemetry";
import {
  buildIntegrityGuardedCoachSummary,
  enrichTabletWithHonestWhy,
  HONEST_COACH_FEEDBACK_OPTIONS,
  HONEST_COACH_NOT_HELPFUL_REASONS,
} from "./honest-coach-summary.mjs";
import {
  bindStructuralSystemsForCoach,
  deckFingerprintFromRows,
  stampStructuralReportBinding,
} from "./narrative-integrity.mjs";
import { reasonsCardMatters } from "./context-card-inspector.mjs";
import { ForgeCardRef } from "./forge-card-ref";
import { ImportedDeckComparison } from "./components/forge/imported-deck-comparison";
import { buildCommissionContract } from "./commission-contract.mjs";
import { Tabletop, type MatchupCardAdvice, type TabletopCard } from "./tabletop";
import { ProvingGroundsEra } from "./proving-grounds-era";
import {
  ForgeCeremonyMotion,
  ForgeProcessingLoader,
  FORGING_PHASES,
  FORGING_PHASE_RAIL_LABELS,
  FORGING_STAGES,
  type MotionMode,
} from "./components/forge/forge-ceremony";
import { ForgeRune } from "./components/forge/forge-motion-flourishes";
import { ForgeCommissionCard } from "./components/forge/forge-commission-card";
import { RevisionOpinionPanel } from "./components/forge/revision-opinion";
import { PlayerCompassCard } from "./components/forge/player-compass-card";
import { PhilosophyCompare } from "./components/forge/philosophy-compare";
import {
  playerCompassFromBench,
  readLocalPlayerCompass,
  withPlayerCompassOnBench,
  writeLocalPlayerCompass,
} from "./player-compass.mjs";
import { colorsFromNote } from "./color-identity-labels.mjs";
import {
  commanderOracleText,
  occupancyLabelsForOption,
  arrangeCommanderStarters,
  partnerEligibilityFor,
} from "./commander-lane-scoring.mjs";
import {
  FORMAT_PREVIEWS,
  isCommanderFormat,
  commissionHeadingFor,
  buildStepLabelsFor,
  targetDeckSize,
  scryfallLegality,
  scryfallFormatTerms,
} from "./format-catalog";
import {
  hashText,
  extractPlanIdentitySnapshot,
  relativeUpdatedLabel,
  createMasterworks,
  parseDeckRows,
  cardFactKey,
  scryfallLookupName,
  indexCardFact,
  cardFactFromNativeRow,
  cardGroup,
  cardPriceUsd,
  cheapestCardPriceUsd,
  cardRole,
  BASIC_CARD_NAMES,
  blueprintDefinition,
} from "./deck-row-helpers";
import { ForgeGenerationError, normalizeForgeFailure, type NormalizedForgeFailure } from "./forge-failure";
import type {
  Chamber,
  ForgeAction,
  MilestoneMotion,
  DeckPreview,
  DeckRow,
  DeckViewMode,
  CardFact,
  CardSearchResult,
  ReplacementCandidate,
  PrintingOption,
  MetaBreakerExperiment,
  ForgeIntervention,
  MultiRefillPackage,
  CommanderOption,
  Masterwork,
  SavedFamily,
  EdhrecSignal,
  EdhrecEvidence,
  ReadingSize,
} from "./forge-types";
import { FORGE_CEREMONY_MINIMUM_MS, preferredDecklistView } from "./forge-types";
import type { ForgeResumeBrief } from "./forge-resume-brief";
import { encodeForgeResumeBrief, decodeForgeResumeBrief } from "./forge-resume-brief";

// Search-result coaching runs in the browser, where the construction-only
// card-mechanics database is deliberately not bundled. The semantic engine
// still has its rules-text classifiers; configure an empty tag lookup so a
// three-character commander search cannot throw while labeling its results.
configureCardTagLookup(() => [], { onlyIfMissing: true });

export default function Home() {
  const session = useForgeSessionState();
  const {
    chamber,
    setChamber,
    guestMode,
    playerCompass,
    playerCompassSynced,
    turnstileToken,
    turnstileError,
    guestClaimToken,
    turnstileHostRef,
    stage,
    buildStep,
    setBuildStep,
    format,
    setFormat,
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
    readingSize,
    setReadingSize,
    motionMode,
    setMotionMode,
    forgeAction,
    actionPoint,
    deck,
    setDeck,
    commissionNote,
    setCommissionNote,
    reviewFocus,
    setReviewFocus,
    commanderQuery,
    setCommanderQuery,
    commanderResults,
    commanderSearchOpen,
    setCommanderSearchOpen,
    commanderSearchRef,
    commanderSearchRect,
    selectedCommander,
    setSelectedCommander,
    commanderSearching,
    commanderSearchError,
    setCommanderSearchRetry,
    secondCommanderQuery,
    setSecondCommanderQuery,
    secondCommanderResults,
    setSecondCommanderResults,
    selectedSecondCommander,
    setSelectedSecondCommander,
    secondCommanderSearching,
    secondCommanderSearchRef,
    secondCommanderSearchRect,
    secondCommanderDropdownOpen,
    randomizingCommander,
    randomCommanderOptions,
    setRandomCommanderOptions,
    forgedDeck,
    forgeReply,
    swapFlourish,
    sealBurst,
    setSealBurst,
    milestoneMotion,
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
    matchupCardAdvice,
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
    setCheapestPrintings,
    printingOverrides,
    setPrintingOverrides,
    printingMenu,
    setPrintingMenu,
    printingOptions,
    printingOptionsLoading,
    tcgplayerAffiliateEnabled,
    deckId,
    savedMasterworks,
    archiveFeaturedArt,
    playerIdentity,
    identityCelebration,
    pendingCandidateChoice,
    setPendingCandidateChoice,
    benchOpen,
    setBenchOpen,
    cardSearch,
    setCardSearch,
    cardSearchResults,
    consideringCards,
    setConsideringCards,
    removedCards,
    setRemovedCards,
    editAnvilOpen,
    setEditAnvilOpen,
    forgeGenerationError,
    forgeGenerationFailure,
    forgeElapsedSeconds,
    replacementRecommendations,
    setReplacementRecommendations,
    replacementLoading,
    replacementError,
    setReplacementError,
    lastCutCard,
    setLastCutCard,
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
    strategyBuildComparison,
    masterworksCommissionContract,
    masterworksRequestRecognition,
    openDeepForgeEvidence,
    progress,
    awaken,
    signInResumeHref,
    forgeState,
    captureForgeAction,
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
    activeFact,
    activeImage,
    activePriceUsd,
    activePurchaseLink,
    inspectedFact,
    inspectedPrinting,
    inspectedImage,
    deckIntegrity,
    activeRole,
    structuralAnalysisStatus,
    boundStructural,
    activeStructuralReport,
    interactionGraph,
    activeCardReasons,
    honestCoachSummary,
    submitHonestCoachFeedback,
    activeGraphEdges,
    activeSlotReason,
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
    activeOccupancyLabels,
    commissionOccupancyLabels,
    secondCommissionOccupancyLabels,
    revealOccupancyLabels,
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
    persistPlayerCompass,
    partnerEligibility,
    stageDeckCard,
    addCardToDeck,
    selectCommander,
    chooseRandomCommander,
    enterMasterwork,
    commitDirectForge,
    openSavedMasterwork,
    deleteSavedMasterwork,
    setFamilyArchived,
    startNewForge,
    openPrivateArchive,
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
  } = session;

  return (
    <ForgeSessionProvider value={session}>
    <main
      className={`great-forge chamber-${chamber} reading-${readingSize}`}
      data-forge-state={forgeState}
      data-forge-stage={chamber === "forging" ? stage + 1 : undefined}
      data-motion={motionMode}
      data-guest-mode={guestMode ? "true" : "false"}
      data-forge-action={forgeAction}
      data-swap-station-active={hasValidatedDeck && isImportedDeckReview && siteRail === "decklist" && !swapStationReviewed ? "true" : "false"}
      onClickCapture={captureForgeAction}
      style={{ "--mf-action-x": `${actionPoint.x}%`, "--mf-action-y": `${actionPoint.y}%` } as CSSProperties}
    >
      {/*
        Ambient background layer, shared across every chamber (this div is
        rendered once, outside the chamber-specific JSX below). Real curated
        textures/animations — see public/assets/forge/asset-registry.json:
          i    embers.svg drift (existing)
          b    furnace_glow.svg base glow (existing)
          u    molten-iron.png floor band
          s    flare-strip.webp flame licks (+::before/::after for two more)
          em   steam-drift.png wisps (+::before/::after for two more)
          mark spark-01.jpg periodic ember burst
          q    rune-medallion.png (cropped, CC0) ambient glow accent
      */}
      <div className="forge-textures" aria-hidden="true">
        <i />
        <b />
        <u />
        <s />
        <em />
        <mark />
        <q />
      </div>
      {guestMode && !forgedDeck && !pendingCandidateChoice && (
        <aside
          className={`guest-forge-pass${turnstileToken ? " verified" : ""}`}
          aria-label="Free Forge preview verification"
        >
          <div>
            <small>ONE FREE FORGE · NO ACCOUNT REQUIRED</small>
            <b>{turnstileToken ? "The Forge is ready for you." : "Confirm you’re human, then build your deck."}</b>
            {turnstileError ? <p className="guest-turnstile-error" role="alert">{turnstileError}</p> : null}
          </div>
          <div
            className={`turnstile-host${turnstileToken ? " verified" : ""}`}
            ref={turnstileHostRef}
          />
        </aside>
      )}
      {guestMode && forgedDeck && guestClaimToken && chamber !== "workbench" && (
        <aside className="guest-result-gate" role="region" aria-label="Save this deck">
          <div>
            <small>YOUR PREVIEW DECK IS READY</small>
            <b>Create your free account to save it, edit cards, run experiments, and record matches.</b>
            {coachOccupancyLabels.length > 0 && (
              <p className="guest-result-occupancy">
                Occupancy engines: {coachOccupancyLabels.join(" · ")}. Named from commander oracle, not from the 99.
              </p>
            )}
          </div>
          <a onClick={() => trackLaunchEvent("save_continue_clicked", { format })} className="save-deck-link" href={`https://app.metaforge.gg/?claim=${encodeURIComponent(guestClaimToken)}`}>Save deck →</a>
        </aside>
      )}
      {milestoneMotion && motionMode === "full" && (
        <div className={`forge-milestone-motion milestone-${milestoneMotion.kind}`} role="status" aria-live="polite">
          <div className="milestone-shutter milestone-shutter-left" />
          <div className="milestone-shutter milestone-shutter-right" />
          <div className="milestone-smoke" />
          <div className="milestone-flare" />
          <div className="milestone-sparks" aria-hidden="true"><i /><i /><i /><i /></div>
          <div className="milestone-seal">
            <span /><span />
            <i>{milestoneMotion.glyph}</i>
          </div>
          <div className="milestone-copy">
            <small>{milestoneMotion.eyebrow}</small>
            <strong>{milestoneMotion.label}</strong>
          </div>
        </div>
      )}
      <header className="forge-bar">
        <button
          className="forge-brand"
          onClick={() => setChamber("entrance")}
          aria-label="Return to Forge entrance"
        >
          <img
            className="forge-brand-logo"
            src="/assets/brand/metaforge-mf-anvil.webp"
            alt=""
            aria-hidden="true"
          />
          <span>
            METAFORGE<small>THE GREAT FORGE</small>
          </span>
        </button>
        <nav className="forge-global-nav" aria-label="MetaForge workspace">
          <button type="button" className={chamber === "entrance" ? "active" : ""} onClick={() => setChamber("entrance")}>Explore</button>
          <button type="button" disabled={!hasValidatedDeck} onClick={openDeepForgeEvidence}>Evidence</button>
          <button type="button" className="coming-soon" disabled>Community</button>
          <button type="button" className="coming-soon" disabled>Premium</button>
        </nav>
        <label className="forge-global-search">
          <i aria-hidden="true">⌕</i>
          <input type="search" placeholder="Search cards, decks, users…" aria-label="Search cards, decks, and users" />
        </label>
        <details className="forge-menu">
          <summary><i>✦</i><span>Forgemaster</span><b>⌄</b></summary>
          <div>
            <section aria-label="Text size">
              <small>TEXT SIZE</small>
              {(["compact", "comfortable", "large"] as ReadingSize[]).map((size, index) => (
                <button type="button" key={size} className={readingSize === size ? "active" : ""} aria-label={`Use ${size} text`} aria-pressed={readingSize === size} onClick={() => setReadingSize(size)}>
                  A{index === 0 ? "−" : index === 2 ? "+" : ""}
                </button>
              ))}
            </section>
            <button type="button" onClick={() => setMotionMode((current) => current === "full" ? "quiet" : "full")}>{motionMode === "full" ? "Reduce motion" : "Use full motion"}</button>
            <IdentityBadge depth={playerIdentity.depth} totalMilestones={playerIdentity.allMilestones.length} dominantMotif={playerIdentity.dominantMotif} accent={playerIdentity.accent} celebrating={Boolean(identityCelebration)} celebrationLabel={identityCelebration?.label ?? null} />
            <button type="button" onClick={() => setChamber("entrance")}>Start a new deck</button>
            <nav aria-label="Learn, legal, and support"><a href="/commanders">Commander Guides</a><a href="/academy">Deckbuilding Academy</a><a href="/terms">Terms</a><a href="/privacy">Privacy</a><a href="mailto:support@metaforge.gg">Support</a></nav>
          </div>
        </details>
      </header>
      <aside className="forge-global-rail" aria-label="Site navigation">
        <button type="button" className={(!hasValidatedDeck && chamber === "entrance") || (hasValidatedDeck && chamber === "workbench" && siteRail === "overview") ? "active" : ""} onClick={() => {
          if (!hasValidatedDeck) {
            setChamber("entrance");
            return;
          }
          setChamber("workbench");
          setActiveForgeChapter(1);
          setSiteRail("overview");
          window.requestAnimationFrame(() => {
            if (coachBriefDetailsRef.current) coachBriefDetailsRef.current.open = true;
            document.getElementById("coach-brief")?.scrollIntoView({ behavior: "smooth", block: "start" });
          });
        }}><i>⌂</i><span>Overview</span></button>
        <button type="button" className={chamber === "workbench" && activeForgeChapter === 1 && siteRail === "decklist" ? "active" : ""} disabled={!hasValidatedDeck} onClick={() => { setChamber("workbench"); setActiveForgeChapter(1); setDeckViewMode((current) => current === "playtest" ? preferredDecklistView() : current); setSiteRail("decklist"); if (coachBriefDetailsRef.current) coachBriefDetailsRef.current.open = false; window.requestAnimationFrame(() => document.getElementById("deck-gallery")?.scrollIntoView({ behavior: "smooth", block: "start" })); }}><i>☷</i><span>Decklist</span></button>
        <button type="button" className={chamber === "workbench" && activeForgeChapter === 2 ? "active" : ""} disabled={!hasValidatedDeck} onClick={() => { setChamber("workbench"); setActiveForgeChapter(2); setSiteRail("analysis"); }}><i>◇</i><span>Analysis</span></button>
        <button type="button" className={chamber === "archive" ? "active" : ""} onClick={openPrivateArchive}><i className="forge-rail-cardback" aria-hidden="true">MF</i><span>Decks</span></button>
        <button type="button" disabled={!hasValidatedDeck} onClick={() => { setChamber("workbench"); setActiveForgeChapter(1); setDeckViewMode("playtest"); setSiteRail("playtest"); window.requestAnimationFrame(() => document.querySelector(".tabletop-surface")?.scrollIntoView({ behavior: "smooth", block: "start" })); }}><i>⚔</i><span>Playtest</span></button>
        <button type="button" disabled={!hasValidatedDeck || guestMode || !nativeMasterworkContext?.generationId || publicReportStatus === "publishing"} onClick={() => publicReportUrl && publicReportGenerationId === nativeMasterworkContext?.generationId ? void navigator.clipboard.writeText(publicReportUrl) : setPublicReportPromptOpen(true)}><i>⌁</i><span>{publicReportStatus === "publishing" ? "Publishing" : publicReportStatus === "ready" && publicReportGenerationId === nativeMasterworkContext?.generationId ? "Link copied" : "Share"}</span></button>
        <button type="button" disabled={!hasValidatedDeck} onClick={() => { setMasterworkIdentityDraft(masterworkIdentity); setMasterworkIdentityOpen(true); }}><i>⚙</i><span>Settings</span></button>
        <div className="forge-rail-embers" aria-hidden="true"><i /><i /><i /></div>
        <div className="forge-rail-version" aria-label="MetaForge version 2.1.0"><i>MF</i><span>v2.1.0</span></div>
      </aside>
      <aside className="forge-card-rail" aria-label="Card preview">
        <div className="forge-card-mold" aria-label={activeCard ? `Card preview: ${activeCard}` : "Card preview"}>
          <button
            type="button"
            className="forge-card-mold-socket"
            onClick={() => activeCard && setInspectedCard(activeCard)}
            disabled={!activeCard}
            aria-label={activeCard ? `Open full dossier for ${activeCard}` : "No card selected yet"}
          >
            {activeImage ? (
              <img src={activeImage} alt={`${activeCard} card`} />
            ) : (
              <span className="forge-card-mold-empty">Hover or tap a card to preview it here</span>
            )}
          </button>
          {activeCard && (
            <div className="forge-card-mold-body">
              <strong>{activeCard}</strong>
              <span>{activeFact?.type_line || "Card details awaken on inspection"}</span>
              {(activePriceUsd !== null || activePurchaseLink) && (
                <div className="forge-card-mold-price">
                  {activePriceUsd !== null && <b>${activePriceUsd.toFixed(2)}</b>}
                  {activePurchaseLink && (
                    <a
                      href={activePurchaseLink.url}
                      target={activePurchaseLink.target}
                      rel={activePurchaseLink.rel}
                      onClick={(event) => event.stopPropagation()}
                    >
                      Buy on TCGplayer
                    </a>
                  )}
                </div>
              )}
              {activeOccupancyLabels.length > 0 && (
                <p className="forge-card-mold-occupancy">Occupancy: {activeOccupancyLabels.join(" · ")}</p>
              )}
              <details className="forge-card-mold-more">
                <summary>Why it&rsquo;s here →</summary>
                <p className="forge-card-mold-slot-duty">
                  <small>SLOT DUTY · {activeRole.toUpperCase()}</small>
                  {activeSlotReason}
                </p>
                {activeGraphEdges.map((edge) => (
                  <em key={`${edge.from}-${edge.to}`}>
                    {edge.signals.join(" + ")} ·{" "}
                    <ForgeCardRef
                      name={edge.from === activeCard ? edge.to : edge.from}
                      surface="gallery-companion"
                      onInspect={setHoveredCard}
                    />
                  </em>
                ))}
                {matchupCardAdvice && matchupCardAdvice.cardName === activeCard && (
                  <div className={`forge-card-mold-matchup${matchupCardAdvice.priority ? " is-priority" : " is-secondary"}`}>
                    <small>VS {matchupCardAdvice.matchup.toUpperCase()}</small>
                    <p><em>Verdict</em>{matchupCardAdvice.verdict}</p>
                    <p><em>Change</em>{matchupCardAdvice.change}</p>
                    <p><em>Why</em>{matchupCardAdvice.why}</p>
                  </div>
                )}
                {activeCardReasons.length > 0 && (
                  <ul className="forge-card-mold-reasons">
                    {activeCardReasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                )}
                {explainPairsForCardAsMentor({
                  cardName: activeCard,
                  enginePairs: interactionGraph.enginePairs || [],
                  resetPairs: interactionGraph.resetPairs || [],
                  limit: 1,
                }).map((explanation: { cards: string[]; paragraph: string }) => (
                  <p key={explanation.cards.join("+")} className="forge-card-mold-pair">
                    {explanation.paragraph}
                  </p>
                ))}
              </details>
              <button type="button" className="forge-card-mold-dossier" onClick={() => setInspectedCard(activeCard)}>
                Open full dossier →
              </button>
            </div>
          )}
        </div>
      </aside>

      {chamber === "entrance" && <EntranceChamber />}

      {chamber === "archive" && (
        <section className="masterwork-archive" aria-label="Your private archive">
          <section className="masterwork-history">
            <header>
              <div>
                <small>YOUR PRIVATE ARCHIVE</small>
                <h2>Return to a deck</h2>
              </div>
              <span>{savedMasterworks.length} SAVED</span>
            </header>
            {savedMasterworks.length > 0 ? (
              <div>
                {savedMasterworks.map((family) => {
                  const evidence =
                    family.record || family.revisions.at(-1)?.evidence || {};
                  const occupancy = occupancyLabelsForOption(family.commander);
                  return (
                    <article key={family.id} className={family.archived ? "finished" : ""}>
                      <button
                        className="history-open"
                        onClick={() => openSavedMasterwork(family)}
                      >
                        {archiveFeaturedArt[family.id] && (
                          <img src={cardArtCrop(archiveFeaturedArt[family.id])} alt="" />
                        )}
                        <small>
                          {family.archived ? "FINISHED MASTERWORK · " : ""}
                          {family.format} · {family.path || "FORGED DECK"}
                        </small>
                        <strong>{family.name}</strong>
                        <span>{family.commander?.name || "No commander"}</span>
                        {occupancy.length > 0 && (
                          <p className="archive-occupancy">Occupancy: {occupancy.join(" · ")}</p>
                        )}
                        <em>
                          {Number(evidence.wins || 0)}W ·{" "}
                          {Number(evidence.losses || 0)}L ·{" "}
                          {family.revisions.length} revision
                          {family.revisions.length === 1 ? "" : "s"}
                        </em>
                      </button>
                      {family.archived ? (
                        <button
                          className="history-restore"
                          onClick={() => setFamilyArchived(family.id, false)}
                          aria-label={`Return ${family.name} to the Forge`}
                        >
                          Return to the Forge
                        </button>
                      ) : (
                        <button
                          className="history-finish"
                          onClick={() => setFamilyArchived(family.id, true)}
                          aria-label={`Preserve ${family.name} as finished`}
                        >
                          Preserve as Finished
                        </button>
                      )}
                      <button
                        className="history-delete"
                        onClick={() => deleteSavedMasterwork(family.id)}
                        aria-label={`Delete ${family.name}`}
                      >
                        Delete
                      </button>
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="empty-archive">
                No decks saved yet. Build or review a deck and it will live here.
              </p>
            )}
            <footer>
              <button type="button" className="new-forge" onClick={startNewForge}>
                ＋ Start a New Forge
              </button>
            </footer>
          </section>
        </section>
      )}

      {(chamber === "commission" || chamber === "refine") && (
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
      )}

      {chamber === "forging" && <ForgingChamber />}

      {chamber === "masterworks" && <MasterworksChamber />}

      {chamber === "workbench" && (
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
      )}
      {chamber !== "forging" && savedMasterworks.length > 0 && benchOpen && (
        <aside
          className={`bench-dock ${benchOpen ? "open" : ""}`}
          aria-label="Your deck bench"
        >
          <div className="bench-tray" aria-hidden={!benchOpen}>
            <header>
              <div>
                <small>THE PRIVATE BENCH</small>
                <strong>Your saved decks</strong>
                {savedMasterworks.length > 0 && (
                  <p>
                    <b>{savedMasterworks.filter((family) => family.archived).length} sealed</b>
                    <span>·</span>
                    <b>{savedMasterworks.filter((family) => !family.archived).length} still on the anvil</b>
                  </p>
                )}
              </div>
              <button
                onClick={() => setBenchOpen(false)}
                aria-label="Collapse deck bench"
              >
                Close
              </button>
            </header>
            {savedMasterworks.length ? (
              <div className="bench-decks">
                {savedMasterworks.slice(0, 10).map((family) => {
                  const evidence =
                    family.record || family.revisions.at(-1)?.evidence || {};
                  const evidenceCount = Number(evidence.wins || 0) + Number(evidence.losses || 0);
                  const dominantMotif = Object.entries(family.motifWeights || {}).sort((a, b) => b[1] - a[1])[0]?.[0];
                  const occupancy = occupancyLabelsForOption(family.commander);
                  return (
                    <div
                      key={family.id}
                      role="button"
                      tabIndex={0}
                      className={["bench-card", family.id === deckId ? "active" : "", family.archived ? "finished" : ""].filter(Boolean).join(" ")}
                      onClick={() => {
                        openSavedMasterwork(family);
                        setBenchOpen(false);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          openSavedMasterwork(family);
                          setBenchOpen(false);
                        }
                      }}
                    >
                      <span className="bench-card-art">
                        {family.commander?.image ? (
                          <img src={family.commander.image} alt="" />
                        ) : (
                          <i>ᛞ</i>
                        )}
                        <em>{family.archived ? "SEALED" : family.id === deckId ? "ON THE ANVIL" : "IN PROGRESS"}</em>
                        {dominantMotif && <small>{dominantMotif}</small>}
                      </span>
                      <span className="bench-card-copy">
                        <b>{family.name}</b>
                        <small>{family.commander?.name || family.format}</small>
                        {occupancy.length > 0 && (
                          <small className="bench-occupancy">{occupancy.join(" · ")}</small>
                        )}
                      </span>
                      <span className="bench-card-vitals">
                        <em><b>{family.revisions.length || 1}</b> revision{family.revisions.length === 1 ? "" : "s"}</em>
                        <em><b>{evidenceCount}</b> match{evidenceCount === 1 ? "" : "es"}</em>
                      </span>
                      <span className="bench-card-open">Open deck <i>→</i></span>
                      <button
                        type="button"
                        className="bench-card-delete"
                        aria-label={`Delete ${family.name}`}
                        title="Delete this deck permanently"
                        onClick={(event) => {
                          event.stopPropagation();
                          void deleteSavedMasterwork(family.id);
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="empty-bench">
                Your first completed deck will appear here.
              </p>
            )}
            <footer>
              <button onClick={openPrivateArchive}>View full Archive</button>
              <button className="new-forge" onClick={startNewForge}>
                ＋ Start a New Forge
              </button>
            </footer>
          </div>
          <div className="bench-handle">
            <button
              className="bench-toggle"
              onClick={() => setBenchOpen((value) => !value)}
              aria-expanded={benchOpen}
            >
              <i>ᛞ</i>
              <span>
                <small>YOUR BENCH</small>
                <b>
                  {savedMasterworks.length
                    ? `${savedMasterworks.length} deck${savedMasterworks.length === 1 ? "" : "s"} saved`
                    : forgeGenerationError
                      // This floating launcher is always mounted (gated only on
                      // chamber !== "forging"), independent of whether the
                      // current attempt succeeded — so an empty archive used to
                      // say "Ready for your first deck" even while the
                      // main panel displayed "No deck was completed" right next
                      // to it. Neither claim was individually false, but shown
                      // together they read as contradictory chrome. Only the
                      // invitation language is suppressed here; the rest of the
                      // panel (saved-deck navigation, "Start a New Forge") stays
                      // fully available during a failure.
                      ? "Nothing saved yet"
                      : "Ready for your first deck"}
                </b>
              </span>
              <em>{benchOpen ? "Lower the Bench" : "Raise the Bench"}</em>
            </button>
          {savedMasterworks[0]?.commander?.image && (
            <img src={savedMasterworks[0].commander?.image} alt="" />
          )}
        </div>
      </aside>
      )}
      {chamber === "workbench" && deckRows.length > 0 && (
        <>
          <div className="deck-price-bar" role="status" aria-label="Deck market price total">
            <span>
              <small>MARKET TOTAL</small>
              <strong>${deckPriceTotal.total.toFixed(2)}</strong>
            </span>
            {nativeMasterworkContext?.powerSignal && (
              <span title={nativeMasterworkContext.powerSignal.note}>
                <small>{nativeMasterworkContext.requestedPowerTier ? `POWER SIGNAL · TARGETED ${nativeMasterworkContext.requestedPowerTier.toUpperCase()}` : "POWER SIGNAL"}</small>
                <strong>{nativeMasterworkContext.powerSignal.tier}</strong>
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
      {chamber === "workbench" &&
        (replacementLoading ||
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
    </main>
    </ForgeSessionProvider>
  );
}
