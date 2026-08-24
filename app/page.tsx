"use client";

import { startTransition, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { configureCardTagLookup } from "./strategic-intent.mjs";
import { useForgeSessionState, ForgeSessionProvider } from "./forge-session-context";
import { EntranceChamber } from "./components/forge/entrance-chamber";
import { ForgingChamber } from "./components/forge/forging-chamber";
import { MasterworksChamber } from "./components/forge/masterworks-chamber";
import { ArchiveChamber } from "./components/forge/archive-chamber";
import { CommissionChamber } from "./components/forge/commission-chamber";
import { WorkbenchChamber } from "./components/forge/workbench-chamber";
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
import { occupancyLabelsForOption } from "./commander-lane-scoring.mjs";
import {
  FORMAT_PREVIEWS,
  isCommanderFormat,
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

      {chamber === "archive" && <ArchiveChamber />}
      {(chamber === "commission" || chamber === "refine") && <CommissionChamber />}

      {chamber === "forging" && <ForgingChamber />}

      {chamber === "masterworks" && <MasterworksChamber />}

      {chamber === "workbench" && <WorkbenchChamber />}
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
