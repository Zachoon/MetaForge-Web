"use client";

import { startTransition, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { configureCardTagLookup } from "./strategic-intent.mjs";
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
  BuildPath,
} from "./forge-types";
import { FORGE_CEREMONY_MINIMUM_MS, preferredDecklistView } from "./forge-types";
import type { ForgeResumeBrief } from "./forge-resume-brief";
import { encodeForgeResumeBrief, decodeForgeResumeBrief } from "./forge-resume-brief";

// Search-result coaching runs in the browser, where the construction-only
// card-mechanics database is deliberately not bundled. The semantic engine
// still has its rules-text classifiers; configure an empty tag lookup so a
// three-character commander search cannot throw while labeling its results.
configureCardTagLookup(() => [], { onlyIfMissing: true });
import { createContext, useContext, type ReactNode } from "react";

export function useForgeSessionState() {
  const router = useRouter();
  const [chamber, setChamber] = useState<Chamber>("entrance");
  const [guestMode, setGuestMode] = useState(true);
  const [playerCompass, setPlayerCompass] = useState(() => readLocalPlayerCompass());
  const [playerCompassSynced, setPlayerCompassSynced] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileError, setTurnstileError] = useState("");
  const [guestClaimToken, setGuestClaimToken] = useState("");
  // The claim response mirrors the server-owned Forge report contract.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [pendingClaimResult, setPendingClaimResult] = useState<any>(null);
  const [resumeForgeAfterAuth, setResumeForgeAfterAuth] = useState(false);
  const turnstileHostRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetRef = useRef<string | null>(null);
  useEffect(() => {
    const host = window.location.hostname.toLowerCase();
    // app.metaforge.gg is the Cloudflare Access-protected account surface.
    // Treating it as public guest mode discards the authenticated UI state
    // immediately after Access sends the player back, creating a sign-in loop.
    const isPublicForgeHost = host === "metaforge.gg" || host === "www.metaforge.gg" || host.endsWith(".chatgpt.site");
    const isGuest = isPublicForgeHost || new URLSearchParams(window.location.search).get("guest") === "1";
    queueMicrotask(() => setGuestMode(isGuest));
  }, []);
  useEffect(() => {
    if (!guestMode || !turnstileHostRef.current || turnstileWidgetRef.current) return;
    let cancelled = false;
    const render = () => {
      // Turnstile attaches its explicit-render API to window after its
      // asynchronously-loaded script becomes ready.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const turnstile = (window as any).turnstile;
      if (cancelled || !turnstile || !turnstileHostRef.current || turnstileWidgetRef.current) return;
      turnstileWidgetRef.current = turnstile.render(turnstileHostRef.current, {
        // Public sitekey. Cloudflare error 110200 means this hostname is not
        // in the widget's Hostname Management allowlist (Dashboard → Turnstile
        // → this widget). Code cannot authorize domains; add metaforge.gg,
        // www.metaforge.gg, and app.metaforge.gg there. Alternate Sites hosts
        // need their own allowlist entries or they will keep failing.
        sitekey: "0x4AAAAAAEEl7173Degrwsrc",
        theme: "dark",
        size: "flexible",
        appearance: "interaction-only",
        callback: (token: string) => { setTurnstileToken(token); setTurnstileError(""); },
        // A token that expires while the player is still configuring their
        // build (Cloudflare's own ~5-minute window) used to only clear
        // React state here — the widget itself could be left showing a
        // stale "verified" appearance instead of a fresh, actionable
        // challenge, so a click on Forge minutes later silently failed with
        // a confusing verification error after the whole forging animation
        // had already played. Explicitly reset() alongside clearing state
        // so the widget always re-renders a real, interactive challenge —
        // never a stale checkmark the player can't act on.
        "expired-callback": () => {
          setTurnstileToken("");
          if (turnstileWidgetRef.current) turnstile.reset(turnstileWidgetRef.current);
        },
        "error-callback": () => {
          setTurnstileToken("");
          // Cloudflare error 110200 = hostname not authorized for this sitekey.
          setTurnstileError("Verification could not load on this domain. Use metaforge.gg, or ask an admin to authorize this hostname for Turnstile.");
          if (turnstileWidgetRef.current) turnstile.reset(turnstileWidgetRef.current);
        },
      });
    };
    const interval = window.setInterval(render, 250);
    render();
    return () => { cancelled = true; window.clearInterval(interval); };
  }, [guestMode]);
  const [stage, setStage] = useState(0);
  const [buildStep, setBuildStep] = useState<0 | 1 | 2>(0);
  const [buildPath, setBuildPath] = useState<BuildPath>("discover");
  const [format, setFormat] = useState("Commander");
  const [strategy, setStrategy] = useState("Balanced midrange");
  const [complexity, setComplexity] = useState("Balanced");
  const [budget, setBudget] = useState("No strict limit");
  // A hard $ ceiling per card, generic across every format — the player
  // dials in whatever real-world budget rule their pod actually uses
  // (a $5 cap, a Pauper-adjacent commons restriction, or both together)
  // rather than the Forge trying to name and encode a specific named
  // community format it can't verify the exact rules of. Empty string
  // means no cap; parsed to a number only at generation time.
  const [maxCardPriceInput, setMaxCardPriceInput] = useState("");
  const [commonsOnly, setCommonsOnly] = useState(false);
  // Only meaningful for the singleton commander-style formats
  // (Commander/Brawl/Standard Brawl) — the same set powerSignal itself
  // already reports for. "" means no target: the existing, unbiased
  // behavior.
  const [targetPowerTier, setTargetPowerTier] = useState("");
  // Parsed once and reused at every generation call site rather than
  // re-parsing the raw text input three times — blank or non-numeric
  // text means no cap, matching maxCardPriceInput's own "" default.
  const maxCardPrice = maxCardPriceInput.trim() !== "" && Number.isFinite(Number(maxCardPriceInput))
    ? Number(maxCardPriceInput)
    : undefined;
  const [readingSize, setReadingSize] = useState<ReadingSize>("comfortable");
  const [motionMode, setMotionMode] = useState<MotionMode>("full");
  const [forgeAction, setForgeAction] = useState<ForgeAction>("none");
  const [actionPulse, setActionPulse] = useState(0);
  const [actionPoint, setActionPoint] = useState({ x: 50, y: 52 });
  const [deck, setDeck] = useState("");
  const [commissionNote, setCommissionNote] = useState("");
  // The player's one-click coaching focus for a pasted-decklist review —
  // deliberately separate from commissionNote (their own free text) so
  // neither silently overwrites the other. See colorsFromNote for why
  // note-field scanning already exists; this is threaded into the same
  // note sent to callForgeGenerate, not a new backend contract.
  const [reviewFocus, setReviewFocus] = useState("");
  const [commanderQuery, setCommanderQuery] = useState("");
  const [commanderResults, setCommanderResults] = useState<CommanderOption[]>(
    [],
  );
  const [commanderSearchOpen, setCommanderSearchOpen] = useState(false);
  // .commander-search lives deep inside .commission-chamber, which — like
  // every other direct child of .great-forge — gets position:relative plus
  // a real z-index from the app's global layering rule. That combination
  // creates a stacking context, and position:fixed does NOT escape an
  // ancestor's stacking context (only its containing block) — so no
  // z-index on the dropdown itself can ever win against a fixed sibling
  // like the bench dock. Portaling the listbox straight to <body>, sized
  // and positioned from the real input's on-screen rect, sidesteps the
  // trap entirely instead of fighting it.
  const commanderSearchRef = useRef<HTMLDivElement>(null);
  const [commanderSearchRect, setCommanderSearchRect] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);
  useLayoutEffect(() => {
    if (!commanderSearchOpen) return;
    const updateRect = () => {
      const el = commanderSearchRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const viewportBottom = window.visualViewport
        ? window.visualViewport.offsetTop + window.visualViewport.height
        : window.innerHeight;
      const top = rect.bottom + 5;
      setCommanderSearchRect({
        top,
        left: rect.left,
        width: rect.width,
        maxHeight: Math.max(96, viewportBottom - top - 12),
      });
    };
    updateRect();
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);
    window.visualViewport?.addEventListener("resize", updateRect);
    window.visualViewport?.addEventListener("scroll", updateRect);
    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
      window.visualViewport?.removeEventListener("resize", updateRect);
      window.visualViewport?.removeEventListener("scroll", updateRect);
    };
  }, [commanderSearchOpen]);
  const [selectedCommander, setSelectedCommander] =
    useState<CommanderOption | null>(null);
  const [commanderSearching, setCommanderSearching] = useState(false);
  const [commanderSearchError, setCommanderSearchError] = useState("");
  const [commanderSearchRetry, setCommanderSearchRetry] = useState(0);
  // A second card in the command zone — a Partner commander or a
  // Background — combines its color identity and physical slot with the
  // primary commander rather than replacing it. Optional and independent
  // of the primary commander's own search state.
  const [secondCommanderQuery, setSecondCommanderQuery] = useState("");
  const [secondCommanderResults, setSecondCommanderResults] = useState<
    CommanderOption[]
  >([]);
  const [selectedSecondCommander, setSelectedSecondCommander] =
    useState<CommanderOption | null>(null);

  // Authentication used to return players to an empty app root. Carry the
  // compact commission brief through Cloudflare Access in the original URL,
  // restore it once the authenticated app loads, then continue the strike.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get("resumeForge");
    if (!encoded) return;
    const brief = decodeForgeResumeBrief(encoded);
    params.delete("resumeForge");
    const cleanQuery = params.toString();
    window.history.replaceState({}, "", `${window.location.pathname}${cleanQuery ? `?${cleanQuery}` : ""}`);
    if (!brief) return;
    setFormat(brief.format);
    setStrategy(brief.strategy);
    setComplexity(brief.complexity);
    setBudget(brief.budget);
    setMaxCardPriceInput(brief.maxCardPriceInput);
    setCommonsOnly(brief.commonsOnly);
    setTargetPowerTier(brief.targetPowerTier);
    setCommissionNote(brief.commissionNote);
    setReviewFocus(brief.reviewFocus);
    setDeck(brief.deck);
    setSelectedCommander(brief.commander);
    setSelectedSecondCommander(brief.secondCommander);
    setBuildStep(2);
    setChamber("commission");
    setResumeForgeAfterAuth(true);
  }, []);
  const [secondCommanderSearching, setSecondCommanderSearching] =
    useState(false);
  // Same portal treatment as commanderSearchRef above, for the same reason:
  // this search box is just as deeply nested inside .commission-chamber's
  // stacking-context trap.
  const secondCommanderSearchRef = useRef<HTMLDivElement>(null);
  const [secondCommanderSearchRect, setSecondCommanderSearchRect] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);
  const secondCommanderDropdownOpen =
    secondCommanderSearching || secondCommanderResults.length > 0;
  useLayoutEffect(() => {
    if (!secondCommanderDropdownOpen) return;
    const updateRect = () => {
      const el = secondCommanderSearchRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const viewportBottom = window.visualViewport
        ? window.visualViewport.offsetTop + window.visualViewport.height
        : window.innerHeight;
      const top = rect.bottom + 5;
      setSecondCommanderSearchRect({
        top,
        left: rect.left,
        width: rect.width,
        maxHeight: Math.max(96, viewportBottom - top - 12),
      });
    };
    updateRect();
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);
    window.visualViewport?.addEventListener("resize", updateRect);
    window.visualViewport?.addEventListener("scroll", updateRect);
    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
      window.visualViewport?.removeEventListener("resize", updateRect);
      window.visualViewport?.removeEventListener("scroll", updateRect);
    };
  }, [secondCommanderDropdownOpen]);
  const [randomizingCommander, setRandomizingCommander] = useState(false);
  const [randomCommanderOptions, setRandomCommanderOptions] = useState<
    CommanderOption[]
  >([]);
  const [seenRandomCommanders, setSeenRandomCommanders] = useState<string[]>(
    [],
  );
  const [selectedWork, setSelectedWork] = useState(0);
  const [forgedDeck, setForgedDeck] = useState("");
  const [forgeReply, setForgeReply] = useState("");
  // Populated once, informationally, when a Masterwork is forged — the
  // "why this build" rationale. No longer a two-way refinement composer:
  // accepting an experiment tablet applies its exact change directly.
  const [swapFlourish, setSwapFlourish] = useState<{
    cut: string;
    add: string;
    motif: string | null;
    stage: "out" | "in";
  } | null>(null);
  // Plays once, screen-blended over black, when a Masterwork is sealed as
  // finished. Real footage reserved for this one rare climax so it never
  // wears out from repetition the way a per-action effect would.
  const [sealBurst, setSealBurst] = useState(false);
  const [milestoneMotion, setMilestoneMotion] = useState<MilestoneMotion>(null);
  // Surfaced right after an experiment finishes applying, in the same
  // chapter as the deck list that just changed — a forced decision instead
  // of silently sitting on the tablets screen with nothing to do next.
  const [postAcceptChoice, setPostAcceptChoice] = useState(false);
  // The real, persisted revision count at the moment an experiment was
  // accepted — shown to close the loop with the Forge Mastery record on
  // /profile instead of leaving that growth invisible until a separate visit.
  const [lastAcceptedRevisionCount, setLastAcceptedRevisionCount] = useState<number | null>(null);
  const [benchStatus, setBenchStatus] = useState<
    "idle" | "forging" | "testing" | "thinking"
  >("idle");
  const [record, setRecord] = useState({ wins: 0, losses: 0 });
  const [pendingMatchResult, setPendingMatchResult] = useState<"win" | "loss" | null>(null);
  const [pendingDecisionSignal, setPendingDecisionSignal] = useState("");
  const [pilotingDebrief, setPilotingDebrief] = useState({
    window: "mulligan", role: "uncertain", knownInformation: "", chosenLine: "", alternativeLine: "", observedPunishment: "",
  });
  const [opponentArchetype, setOpponentArchetype] = useState("Unknown / not sure");
  const [matchLog, setMatchLog] = useState<Array<{
    id: string;
    result: "win" | "loss" | "not-recorded";
    opponent: string;
    signal: string;
    playedAt: string;
    revision?: number;
    deckFingerprint?: string;
    fieldTest?: { hypothesisId?: string; question: string; outcome: string; source: string };
    coachDebrief?: ReturnType<typeof createPilotingDebrief>;
  }>>([]);
  const [activeFieldTest, setActiveFieldTest] = useState<null | {
    deckId: string;
    revision: number;
    question: string;
    watchFor: string;
    why: string;
    source: string;
    hypothesisId: string;
    startedAt: string;
  }>(null);
  const [fieldTestResult, setFieldTestResult] = useState<"win" | "loss" | null>(null);
  const [fieldTestRead, setFieldTestRead] = useState<null | { headline: string; guidance: string }>(null);
  const [coachingCheckin, setCoachingCheckin] = useState<{
    issue: "yes" | "no" | null;
    handled: "better" | "same" | "unsure" | null;
  }>({ issue: null, handled: null });
  const [revisions, setRevisions] = useState<
    Array<{ deck: string; note: string; createdAt: string; fingerprint?: string; recommendationRecord?: any }>
  >([]);
  // Holds the current native engine pass (selected candidate and all ranked
  // candidates) so the experiment tablets can run the one-slot laboratory
  // against every candidate without recomputing the Forge. Only available
  // after a fresh applyForgeResult() call (commitDirectForge/enterMasterwork);
  // null for restored saved decks, which carry no live engine context.
  const [nativeMasterworkContext, setNativeMasterworkContext] = useState<{
    selected: any;
    candidates: any[];
    options: { format: string; strategy: string; target: number };
    // Opaque server-issued handle for this generation's cached context
    // (forge-generation-store.ts) — lets the Testing Anvil one-slot lab
    // ask for fresh experiments without resending the ranked candidates
    // or the verified card pool. Undefined for a restored/older saved
    // Masterwork, same as cardPool below — both fall back to the same
    // honest "no live engine context" degradation.
    generationId?: string;
    manaConsistency?: any;
    unusedEnginePartners?: any[];
    // Imported-list comparison surface: the engine's exact, gated one-slot
    // experiment plus its complete accounting of additions/trims.
    laboratory?: any;
    changes?: { added?: string[]; trimmed?: Array<{ name: string; cut: number }>; addedDetail?: Array<{ name: string; reason: string }> } | null;
    // Submitted printed/flavor title -> canonical gameplay title. This is
    // presentation identity only; it lets comparison rows address the
    // canonical swap/adjustment generated by the engine.
    identityAliases?: Record<string, string>;
    // The exact verified pool this generation used — needed so a later
    // refinement pass (buildExperimentTablets' practical simulation gate)
    // can reconnect a swap's rows back to real card text, the same
    // reconnection buildSimulationModel already does server-side.
    cardPool?: any[];
    // Set only when the tournament's structural pick was close enough to
    // a rival that the Forge ran a real goldfish/matchup check to settle
    // it (see applyPracticalTiebreak in native-masterwork-engine.mjs).
    // null the rest of the time — most generations never trigger it.
    practicalTiebreak?: any;
    // Commander-only: fast-mana/tutor/extra-turn/mass-land-denial signals
    // and interaction-graph interconnection data for this exact build.
    // Unlike manaConsistency below, this is not recomputed after a
    // one-slot swap — an accepted simplification, since the signals
    // driving the tier (fast mana, tutors, extra turns, mass land denial)
    // rarely change on a single swap and a full recompute needs the
    // interaction graph rebuilt too.
    powerSignal?: any;
    // The independent post-construction audit of requestedPowerTier vs.
    // the real measured powerSignal.tier — null for imported decks
    // (never rebuilt, never audited against a target that doesn't exist
    // for that path) and for non-Commander-family formats. See
    // native-masterwork-engine.mjs's auditPowerTier/
    // the bounded server-side Casual power repair.
    powerAudit?: {
      requested: string;
      measured: string;
      mismatch: boolean;
      direction: "higherThanRequested" | "lowerThanRequested" | null;
      // Kept as three separately-honest claims, never one "rebuilt"
      // boolean: a rebuild can be attempted and genuinely improve the
      // measured tier without ever reaching the requested one (Maximum
      // rebuilding down to High-Power while targeting Casual, say) —
      // that must render as "improved but still disclosed as
      // mismatched," never as "reached it."
      rebuildAttempted: boolean;
      rebuildImproved: boolean;
      rebuildReachedTarget: boolean;
      originalMeasuredTier?: string;
    } | null;
    // The target power tier this exact generation was biased toward, if
    // any — captured at generation time (not read live from the
    // Blueprint's own state) so it stays accurate even if the player
    // changes the selector afterward without regenerating.
    requestedPowerTier?: string;
    // Free-text commission note for this generation — kept so Request
    // Recognition (#023) can answer "Did I hear you?" after the note
    // field is cleared by a later New Forge.
    commissionNote?: string;
  } | null>(null);
  const [publicReportStatus, setPublicReportStatus] = useState<"idle" | "publishing" | "ready" | "error">("idle");
  const [publicReportUrl, setPublicReportUrl] = useState("");
  const [publicReportError, setPublicReportError] = useState("");
  const [publicReportGenerationId, setPublicReportGenerationId] = useState("");
  const [publicReportSlug, setPublicReportSlug] = useState("");
  const [publicReportPromptOpen, setPublicReportPromptOpen] = useState(false);
  // Non-fatal disclosure for the decklist-import path: names the Forge could
  // not verify or that aren't legal in this format, left out rather than
  // silently dropped or auto-corrected. Distinct from forgeGenerationError,
  // which means generation failed entirely.
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [deckUnderstanding, setDeckUnderstanding] = useState<any>(null);
  // The server's real, evidence-backed answer to the coaching focus the
  // player picked in the Review chamber (worker/review-focus-reasoning
  // .mjs's evaluateReviewFocus) — previously only its .concise field was
  // even typed, folded into the reasoning-drawer reply text and then
  // discarded; asked/evidence/nextStep never reached the UI at all. Kept
  // as its own state so the first-run coaching panel (chapter 1) can
  // surface it immediately instead of burying it in a text blob.
  const [reviewFocusResult, setReviewFocusResult] = useState<{
    focus: string;
    asked: string;
    evidence: string;
    nextStep: string;
    insufficientEvidence?: boolean;
    concise: string;
  } | null>(null);
  const [coachFeedbackStatus, setCoachFeedbackStatus] = useState<
    "idle" | "saving" | "saved" | "error" | "auth" | "need-reason"
  >("idle");
  const [coachFeedbackNote, setCoachFeedbackNote] = useState("");
  const [coachFeedbackPendingOption, setCoachFeedbackPendingOption] = useState<string | null>(null);
  const [coachFeedbackTargetTablet, setCoachFeedbackTargetTablet] = useState<any>(null);
  const coachBriefViewedRef = useRef(false);
  const [coachingGoal, setCoachingGoal] = useState("");
  const [cardFacts, setCardFacts] = useState<Record<string, CardFact>>({});
  const [cardFactsLoading, setCardFactsLoading] = useState(false);
  const [cardFactsError, setCardFactsError] = useState("");
  const [cardFactsPending, setCardFactsPending] = useState(0);
  const [cardFactsRetry, setCardFactsRetry] = useState(0);
  // Drives the persistent card-preview slot in the frame's left rail — the
  // one place a card's art shows on hover/click anywhere on the site.
  const [hoveredCard, setHoveredCard] = useState("");
  const deckHoverTimerRef = useRef<number | null>(null);
  // Crossing a dense Commander list can fire dozens of mouseenter events in
  // a second. Each used to synchronously rerender this entire results page
  // and replace the large preview image, which made scrolling visibly hitch.
  // A short intent window discards rows the pointer merely passes through;
  // the surviving preview update is a transition so direct input and scroll
  // painting stay ahead of the non-essential hover treatment.
  const scheduleDeckHover = useCallback((name: string) => {
    if (deckHoverTimerRef.current !== null) {
      window.clearTimeout(deckHoverTimerRef.current);
    }
    deckHoverTimerRef.current = window.setTimeout(() => {
      deckHoverTimerRef.current = null;
      startTransition(() => setHoveredCard(name));
    }, 70);
  }, []);
  useEffect(() => () => {
    if (deckHoverTimerRef.current !== null) {
      window.clearTimeout(deckHoverTimerRef.current);
    }
  }, []);
  const [matchupCardAdvice, setMatchupCardAdvice] = useState<MatchupCardAdvice | null>(null);
  const [inspectedCard, setInspectedCard] = useState("");
  const [cardActionMenu, setCardActionMenu] = useState<{
    name: string;
    x: number;
    y: number;
  } | null>(null);
  const [refillCuts, setRefillCuts] = useState<Record<string, number>>({});
  const [multiRefillSelecting, setMultiRefillSelecting] = useState(false);
  const [multiRefillStatus, setMultiRefillStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [multiRefillError, setMultiRefillError] = useState("");
  const [multiRefillResult, setMultiRefillResult] = useState<{
    slots: number;
    summary: string;
    boundary: string;
    packages: MultiRefillPackage[];
  } | null>(null);
  const [cardOrder, setCardOrder] = useState<string[]>([]);
  // Which cards the player wants priced (and eventually printed) as foil.
  // Purely a pricing preference for now — doesn't change what card is in
  // the deck, only which of its two market prices gets used.
  const [foilCards, setFoilCards] = useState<Set<string>>(new Set());
  // Deck-wide "show me the budget build" reading: prices every card at
  // whichever of its fetched nonfoil/foil prices is cheaper, overriding
  // individual foil selections for the total (those selections aren't
  // lost — they just aren't the active pricing mode while this is on).
  const [cheapestPrintings, setCheapestPrintings] = useState(false);
  // Which specific printing a player has chosen for a card (right-click on
  // a deck row), keyed by cardFactKey — only overrides the printing whose
  // prices get used, not which card is in the deck.
  const [printingOverrides, setPrintingOverrides] = useState<
    Record<string, PrintingOption>
  >({});
  const [printingMenu, setPrintingMenu] = useState<{
    name: string;
    x: number;
    y: number;
  } | null>(null);
  const [printingOptions, setPrintingOptions] = useState<PrintingOption[]>([]);
  const [printingOptionsLoading, setPrintingOptionsLoading] = useState(false);
  // Server-controlled, fails closed to false (no purchase CTA, no nearby
  // disclosure) until /api/forge/status confirms the flag is on — never
  // defaulted true, never read from a client-bundled constant. See
  // worker/index.ts and app/affiliate-links.mjs.
  const [tcgplayerAffiliateEnabled, setTcgplayerAffiliateEnabled] = useState(false);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/forge/status")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!cancelled && data?.tcgplayerAffiliateEnabled === true) setTcgplayerAffiliateEnabled(true);
      })
      .catch(() => {
        /* Stays fail-closed (false) on any error. */
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [edhrecEvidence, setEdhrecEvidence] = useState<EdhrecEvidence | null>(
    null,
  );
  const [commissionSeed, setCommissionSeed] = useState(() => Date.now());
  const [deckId, setDeckId] = useState("");
  const [savedMasterworks, setSavedMasterworks] = useState<SavedFamily[]>([]);
  // Each saved family's own chosen banner art (Personalize Masterwork's
  // featuredCard, stored per-deck under the same key format used for the
  // active deck), falling back to its commander when never personalized.
  const [archiveFeaturedArt, setArchiveFeaturedArt] = useState<Record<string, string>>({});
  // Brain's own plan identity from the last time this deck had a live
  // generation context — see extractPlanIdentitySnapshot. Only relevant
  // when nativeMasterworkContext is null (a reopened saved deck); a fresh
  // generation always has real, live data and never needs this fallback.
  const [restoredPlanIdentity, setRestoredPlanIdentity] = useState<SavedFamily["planIdentity"]>(null);
  // motifWeightsByFamily/playerIdentity are computed straight from the
  // already-loaded savedMasterworks state — no extra fetch. This mirrors
  // /profile's own computation exactly, so the two never disagree.
  const motifWeightsByFamily = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    for (const family of savedMasterworks) {
      if (family.motifWeights) map[family.id] = family.motifWeights;
    }
    return map;
  }, [savedMasterworks]);
  const playerIdentity = useMemo(
    () =>
      computePlayerIdentity({
        families: savedMasterworks,
        motifWeightsByFamily,
      }),
    [savedMasterworks, motifWeightsByFamily],
  );
  const previousIdentityRef = useRef<ReturnType<
    typeof computePlayerIdentity
  > | null>(null);
  const [identityCelebration, setIdentityCelebration] = useState<{
    label: string;
  } | null>(null);
  const [restoredWork, setRestoredWork] = useState<Masterwork | null>(null);
  // Holds a completed generation's full result — including every real
  // candidate the engine already built — between the moment generation
  // succeeds and the moment the player explicitly enters one. Nothing in
  // workbench state (forgedDeck, nativeMasterworkContext, etc.) is touched
  // until enterMasterwork runs; a pending choice the player never acts on
  // simply never becomes a deck.
  const [pendingCandidateChoice, setPendingCandidateChoice] = useState<{
    nativeReport: any;
    cardPool: any[];
    generationId: string;
    serverGenerationId?: string;
    work: Masterwork;
    commander: CommanderOption | null;
    persist: boolean;
    preChoiceCoaching: any;
  } | null>(null);
  const [benchOpen, setBenchOpen] = useState(false);
  const [cardSearch, setCardSearch] = useState("");
  const [cardSearchResults, setCardSearchResults] = useState<
    CardSearchResult[]
  >([]);
  const [consideringCards, setConsideringCards] = useState<DeckRow[]>([]);
  const [removedCards, setRemovedCards] = useState<DeckRow[]>([]);
  const [editAnvilOpen, setEditAnvilOpen] = useState(false);
  const [forgeGenerationError, setForgeGenerationError] = useState("");
  // The normalized shape (see normalizeForgeFailure above) — drives every
  // decision the failure UI makes (retry button, "preview not used"
  // copy, sign-in/claim path). forgeGenerationError above stays the raw
  // display message; this is never re-derived from it by string-matching.
  const [forgeGenerationFailure, setForgeGenerationFailure] = useState<NormalizedForgeFailure | null>(null);
  const [forgeStartedAt, setForgeStartedAt] = useState<number | null>(null);
  const [forgeElapsedSeconds, setForgeElapsedSeconds] = useState(0);
  const [replacementRecommendations, setReplacementRecommendations] = useState<
    ReplacementCandidate[]
  >([]);
  const [replacementLoading, setReplacementLoading] = useState(false);
  // Scoped entirely to this optional workbench tool — never written by, or
  // read into, forgeGenerationError/hasValidatedDeck. A lookup failing here
  // must never make an already-complete deck look like it disappeared.
  const [replacementError, setReplacementError] = useState<
    "" | "no-legal-replacement" | "operational"
  >("");
  const [lastCutCard, setLastCutCard] = useState("");
  const [metaBreakerExperiments, setMetaBreakerExperiments] = useState<MetaBreakerExperiment[]>([]);
  const [metaBreakerLoading, setMetaBreakerLoading] = useState(false);
  const [forgeInterventions, setForgeInterventions] = useState<ForgeIntervention[]>([]);
  const [interventionLearningReady, setInterventionLearningReady] = useState(false);
  const [matchEvidenceOpen, setMatchEvidenceOpen] = useState(false);
  const [experimentLabOpen, setExperimentLabOpen] = useState(false);
  const [activeForgeChapter, setActiveForgeChapter] = useState<1 | 2 | 5>(1);
  const [siteRail, setSiteRail] = useState<"overview" | "decklist" | "analysis" | "playtest">("decklist");
  // An imported review's own step in the flow: submit -> ceremony -> swap
  // station -> decklist. Resets to false only when a fresh generation lands
  // (landOnCompletedDecklist) - navigating away and back to the Decklist
  // rail afterward must not force the player back through it again.
  const [swapStationReviewed, setSwapStationReviewed] = useState(false);
  const coachBriefDetailsRef = useRef<HTMLDetailsElement | null>(null);
  const [deckViewMode, setDeckViewMode] = useState<DeckViewMode>("ledger");
  const [masterworkIdentityOpen, setMasterworkIdentityOpen] = useState(false);
  const [masterworkIdentity, setMasterworkIdentity] = useState({
    title: "",
    featuredCard: "",
    treatment: "stained" as "stained" | "etched" | "clean",
    focus: "center" as "left" | "center" | "right",
    glow: 36,
  });
  const [masterworkIdentityDraft, setMasterworkIdentityDraft] = useState(masterworkIdentity);
  const [tabletopReviewActive, setTabletopReviewActive] = useState(true);
  const forgeDescentRef = useRef<HTMLElement | null>(null);
  const [openingExperimentPending, setOpeningExperimentPending] = useState(false);
  const [openingExperimentFocus, setOpeningExperimentFocus] = useState("");

  useEffect(() => {
    setDeckViewMode(preferredDecklistView());
  }, []);

  // Card inspection is page-local UI, not deck state. Changing workspace
  // sections must not carry a hovered card, open dossier, or printing menu
  // into the next screen (especially Explore / a fresh commission).
  useEffect(() => {
    if (deckHoverTimerRef.current !== null) {
      window.clearTimeout(deckHoverTimerRef.current);
      deckHoverTimerRef.current = null;
    }
    setHoveredCard("");
    setInspectedCard("");
    setCardActionMenu(null);
    setPrintingMenu(null);
    setMatchupCardAdvice(null);
  }, [chamber, siteRail]);

  useEffect(() => {
    try {
      const preferredReadingSize = window.localStorage.getItem("metaforge.readingSize");
      if (["compact", "comfortable", "large"].includes(preferredReadingSize || "")) {
        setReadingSize(preferredReadingSize as ReadingSize);
      }
      const preferredMotion = window.localStorage.getItem("metaforge.motionMode");
      if (preferredMotion === "quiet" || preferredMotion === "full") {
        setMotionMode(preferredMotion);
      } else if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setMotionMode("quiet");
      }
      const savedLearning = JSON.parse(
        window.localStorage.getItem("metaforge.interventionLearning") || "[]",
      );
      if (Array.isArray(savedLearning)) setForgeInterventions(savedLearning);
    } catch {
      /* A private browsing boundary should never block the Forge. */
    } finally {
      setInterventionLearningReady(true);
    }
  }, []);

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem("metaforge.activeFieldTest") || "null");
      if (saved?.hypothesisId && saved?.deckId === (deckId || "unsaved-masterwork") && Number(saved?.revision) === Math.max(1, revisions.length)) {
        setActiveFieldTest(saved);
      } else {
        setActiveFieldTest(null);
      }
    } catch {
      setActiveFieldTest(null);
    }
  }, [deckId, revisions.length]);

  useEffect(() => {
    window.localStorage.setItem("metaforge.readingSize", readingSize);
  }, [readingSize]);

  useEffect(() => {
    window.localStorage.setItem("metaforge.motionMode", motionMode);
  }, [motionMode]);

  useEffect(() => {
    if (forgeAction === "none") return;
    const reset = window.setTimeout(() => setForgeAction("none"), 950);
    return () => window.clearTimeout(reset);
  }, [forgeAction, actionPulse]);

  useEffect(() => {
    if (!milestoneMotion) return;
    const reset = window.setTimeout(() => setMilestoneMotion(null), 2100);
    return () => window.clearTimeout(reset);
  }, [milestoneMotion]);

  useLayoutEffect(() => {
    if (chamber !== "masterworks" || !pendingCandidateChoice) return;
    // The forging ceremony is much taller than the decision screen. Browsers
    // preserve that old scroll offset across the React chamber swap, which can
    // strand the player halfway through a philosophy card with its heading and
    // recommendation context above the viewport. Reset before paint, then once
    // more after layout settles so the result always opens at its true start.
    window.scrollTo(0, 0);
    const settle = window.requestAnimationFrame(() => window.scrollTo(0, 0));
    return () => window.cancelAnimationFrame(settle);
  }, [chamber, pendingCandidateChoice]);

  const strategyBuildComparison = pendingCandidateChoice?.preChoiceCoaching || null;

  const masterworksCommissionContract = useMemo(() => {
    if (!pendingCandidateChoice?.nativeReport?.selected) return null;
    const note = String(commissionNote || "").trim();
    if (!note) return null;
    const selected = pendingCandidateChoice.nativeReport.selected;
    return buildCommissionContract({
      note,
      commanderName:
        selected?.strategicIntent?.commanders?.[0]?.name
        || selectedCommander
        || "",
      blueprint:
        selected?.strategicIntent?.blueprint ||
        pendingCandidateChoice.nativeReport.blueprintIntent ||
        null,
      selected,
      deckCardNames: (selected?.rows || []).map((row: any) => row.name),
    });
  }, [pendingCandidateChoice, commissionNote, selectedCommander]);

  const masterworksRequestRecognition = masterworksCommissionContract?.requestRecognition
    || null;

  const openDeepForgeEvidence = () => {
    router.push(`/research?deckId=${encodeURIComponent(deckId || "unsaved-masterwork")}`);
  };

  useEffect(() => {
    if (!interventionLearningReady) return;
    window.localStorage.setItem(
      "metaforge.interventionLearning",
      JSON.stringify(forgeInterventions.slice(-80)),
    );
  }, [forgeInterventions, interventionLearningReady]);

  useEffect(() => {
    if (chamber !== "forging") return;
    // Narrative progress only: awaken() starts the real build immediately.
    // Animation timing must never become a second loading gate.
    if (stage >= FORGING_STAGES.length - 1) return;
    const timer = window.setTimeout(() => setStage((value) => value + 1), 1150);
    return () => window.clearTimeout(timer);
  }, [chamber, stage]);

  useEffect(() => {
    if (benchStatus !== "forging" || forgeStartedAt === null) return;
    const updateElapsed = () => {
      setForgeElapsedSeconds(Math.max(0, Math.floor((Date.now() - forgeStartedAt) / 1000)));
    };
    updateElapsed();
    const timer = window.setInterval(updateElapsed, 250);
    return () => window.clearInterval(timer);
  }, [benchStatus, forgeStartedAt]);

  const progress = useMemo(
    () => ((stage + 1) / FORGING_STAGES.length) * 100,
    [stage],
  );

  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".great-forge");
    if (!root) return;

    let frame = 0;
    const trackPointer = (event: PointerEvent) => {
      if (motionMode === "quiet") return;
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        root.style.setProperty("--mf-pointer-x", `${event.clientX}px`);
        root.style.setProperty("--mf-pointer-y", `${event.clientY}px`);
      });
    };

    const revealTargets = Array.from(
      root.querySelectorAll<HTMLElement>(
        ".entrance-copy, .entrance-visual, .masterwork-history, .commission-panel, .forging-ceremony > :not(.ceremony-commander-emergence), .masterwork-reveal > header, .masterwork-reveal > section, .masterwork-reveal > div",
      ),
    );
    revealTargets.forEach((target, index) => {
      target.classList.add("mf-living-reveal");
      target.style.setProperty("--mf-reveal-delay", `${Math.min(index * 70, 280)}ms`);
    });
    const revealFrame = window.requestAnimationFrame(() => {
      revealTargets.forEach((target) => target.classList.add("is-visible"));
    });

    window.addEventListener("pointermove", trackPointer, { passive: true });
    return () => {
      window.cancelAnimationFrame(frame);
      window.cancelAnimationFrame(revealFrame);
      window.removeEventListener("pointermove", trackPointer);
      revealTargets.forEach((target) => {
        target.classList.remove("mf-living-reveal", "is-visible");
        target.style.removeProperty("--mf-reveal-delay");
      });
    };
  }, [chamber, stage, motionMode]);

  const awaken = () => {
    const seed = Date.now();
    // Enter the ceremony directly. The former ignition milestone painted a
    // full-screen rune, crosshair, smoke, and spark burst over the first step.
    setMilestoneMotion(null);
    setCommissionSeed(seed);
    setStage(0);
    setSelectedWork(0);
    setChamber("forging");
    void commitDirectForge(deck.trim() ? "decklist" : "commander", seed);
  };
  useEffect(() => {
    if (!resumeForgeAfterAuth || guestMode) return;
    setResumeForgeAfterAuth(false);
    awaken();
    // State restored from the handoff has landed by this render; awaken now
    // uses that exact brief and the authenticated generation endpoint.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeForgeAfterAuth, guestMode]);

  const signInResumeHref = (() => {
    const brief: ForgeResumeBrief = {
      version: 1,
      format,
      strategy,
      complexity,
      budget,
      maxCardPriceInput,
      commonsOnly,
      targetPowerTier,
      commissionNote,
      reviewFocus,
      deck,
      commander: selectedCommander,
      secondCommander: selectedSecondCommander,
    };
    return `https://app.metaforge.gg/?resumeForge=${encodeURIComponent(encodeForgeResumeBrief(brief))}`;
  })();
  const chapter =
    chamber === "entrance" || chamber === "archive"
      ? 0
      : chamber === "commission" || chamber === "refine"
        ? 1
        : chamber === "forging"
          ? 2
          : 3;
  const forgeState =
    chamber === "forging"
      ? "forging"
      : chamber === "masterworks"
        ? "reveal"
        : chamber === "commission" || chamber === "refine"
          ? "thinking"
          : chamber === "entrance" || chamber === "archive"
            ? "dormant"
            : "idle";
  const wakeForge = (action: Exclude<ForgeAction, "none">) => {
    if (motionMode === "quiet") return;
    setForgeAction(action);
    setActionPulse((current) => current + 1);
  };
  // Reactive by design: this watches the *computed* identity result rather
  // than being called from inside each mastery-affecting handler, so it
  // correctly fires no matter which code path actually crossed a threshold
  // (including a milestone reached via a plain manual deck edit, which
  // intentionally doesn't fire its own "grow" pulse — see
  // applyExperimentTablet/applyMetaBreakerExperiment/recordMatch/
  // setFamilyArchived).
  useEffect(() => {
    const previous = previousIdentityRef.current;
    previousIdentityRef.current = playerIdentity;
    if (!previous) return;
    const diff = diffPlayerIdentity(previous, playerIdentity);
    if (!diff.changed) return;
    const label =
      diff.motifRevealed || diff.motifChanged
        ? `Identity revealed: ${playerIdentity.dominantMotif}`
        : diff.newMilestones.length
          ? diff.newMilestones[0].label
          : diff.styleChanged
            ? `Style: ${playerIdentity.style}`
            : `Temper: ${playerIdentity.temper}`;
    setIdentityCelebration({ label });
    wakeForge("grow");
    const timeout = window.setTimeout(
      () => setIdentityCelebration(null),
      2600,
    );
    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerIdentity]);
  const captureForgeAction = (event: React.MouseEvent<HTMLElement>) => {
    const button = (event.target as HTMLElement).closest("button");
    if (!button || button.disabled) return;
    const bounds = button.getBoundingClientRect();
    setActionPoint({
      x: ((bounds.left + bounds.width / 2) / window.innerWidth) * 100,
      y: ((bounds.top + bounds.height / 2) / window.innerHeight) * 100,
    });
    if (button.closest(".masterwork-seal")) wakeForge("reveal");
    else if (button.closest(".masterwork-card")) wakeForge("select");
    else if (button.closest(".experiment-tablets, .testing-anvil")) wakeForge("refine");
    else if (button.closest(".awaken-button")) wakeForge("forge");
  };
  // createMasterworks/workFor/previewFor now serve one purpose only: a
  // safe, non-null default for chosenWork/chosenPreview before any real
  // generation has happened yet (chamber !== "workbench"). Every reachable
  // workbench state sets restoredWork itself (commitDirectForge, for both
  // the decklist and commander paths) before the player can ever see this
  // fallback — see chosenWork below. There is no live "three masterworks"
  // reveal anymore; that's what pendingCandidateChoice + the masterworks
  // chamber now do, with the engine's own real candidates.
  const masterworks = useMemo(
    () => createMasterworks(commissionSeed, selectedCommander?.name, commissionNote),
    [commissionSeed, selectedCommander?.name, commissionNote],
  );
  const commanderFor = (_index: number) => selectedCommander;
  const workFor = (index: number) => masterworks[index];
  const previewFor = (index: number) => {
    const base = (FORMAT_PREVIEWS[
      format === "Standard Brawl" ? "Brawl" : format
    ] ?? FORMAT_PREVIEWS.Standard)[index % 3];
    const commander = commanderFor(index);
    return commander && isCommanderFormat(format)
      ? {
          ...base,
          card: commander.name,
          role: "Commander · chosen in your deck",
          theme:
            commissionNote.trim() ||
            `A ${commander.colors.join("")} identity deck built around this commander.`,
        }
      : base;
  };
  const chosenPreview = previewFor(selectedWork);
  const chosenWork = restoredWork || workFor(selectedWork);
  const isImportedDeckReview = chosenWork.path === "Adapted From Your List";
  const currentFamilyArchived = Boolean(
    savedMasterworks.find((family) => family.id === deckId)?.archived,
  );
  const deckRows = useMemo(() => parseDeckRows(forgedDeck), [forgedDeck]);
  const importedOriginalRows = useMemo(() => parseDeckRows(deck), [deck]);
  const importedComparisonExperiment = nativeMasterworkContext?.laboratory?.verdict === "advance"
    ? nativeMasterworkContext.laboratory.experiment
    : null;
  const importedProposedRows = useMemo(
    () => importedComparisonExperiment?.rows?.length
      ? importedComparisonExperiment.rows.map((row: any) => ({ name: row.name, quantity: Number(row.quantity || 1), roles: row.roles || [] }))
      : deckRows,
    [importedComparisonExperiment, deckRows],
  );
  const importedComparisonSwaps = useMemo(() => importedComparisonExperiment
    ? [{
        cut: importedComparisonExperiment.cut,
        add: importedComparisonExperiment.add,
        reason: nativeMasterworkContext?.laboratory?.summary || "This one-slot revision improved the structural read while preserving the deck's required floors.",
        confident: true,
      }]
    : [], [importedComparisonExperiment, nativeMasterworkContext?.laboratory?.summary]);
  const importedOriginalQuantityByName = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of importedOriginalRows) {
      const rowKey = cardFactKey(row.name);
      map.set(rowKey, (map.get(rowKey) || 0) + Number(row.quantity || 0));
    }
    return map;
  }, [importedOriginalRows]);
  const importedComparisonAdjustments = useMemo(() => {
    const additions = nativeMasterworkContext?.changes?.added || [];
    // addedDetail carries a real per-card reason sourced from the same
    // construction-time evidence (roles, deficits filled, nearest
    // alternative) chooseSpells() already records for every pick — see
    // describeImportedAdditions in native-masterwork-engine.mjs. Falls back
    // to the old generic sentence only for an older cached generation from
    // before that evidence was captured on this path.
    const addedReasonByName = new Map(
      (nativeMasterworkContext?.changes?.addedDetail || []).map((entry: { name: string; reason: string }) => [entry.name, entry.reason]),
    );
    const trims = nativeMasterworkContext?.changes?.trimmed || [];
    const singleton = isCommanderFormat(format);
    return [
      ...additions.map((name: string) => ({
        name,
        kind: "added" as const,
        reason: addedReasonByName.get(name) || "Added to fill a role or curve gap the submitted list left open.",
      })),
      ...trims.map((entry: { name: string; cut: number }) => {
        const originalQuantity = importedOriginalQuantityByName.get(cardFactKey(entry.name)) ?? entry.cut;
        const remaining = originalQuantity - entry.cut;
        // A full cut (remaining 0) means the card lost its slot on the
        // merits, competing against every other card the Forge could have
        // played there — never a deck-size bookkeeping matter, so it gets
        // an honest "didn't make the cut" framing instead of implying a
        // mechanical size rule forced the Forge's hand. A partial trim
        // (some copies remain) really is mechanical: the format's copy
        // limit, not deck size, is what's actually binding here.
        const reason = remaining > 0
          ? (singleton
            ? `Reduced from ${originalQuantity} to ${remaining} — Commander allows only one copy of most cards.`
            : `Reduced from ${originalQuantity} to ${remaining} copies to stay within this format's legal copy limit.`)
          : "Cut entirely — didn't earn a slot against the cards competing for it.";
        return { name: entry.name, kind: "trimmed" as const, cut: entry.cut, reason };
      }),
    ];
  }, [nativeMasterworkContext?.changes, importedOriginalQuantityByName, format]);
  const activeCommanderName = useMemo(() => {
    if (!isCommanderFormat(format)) return "";
    const rowNames = new Map(deckRows.map((row) => [cardFactKey(row.name), row.name]));
    const engineCommander = nativeMasterworkContext?.selected?.rows?.find((row: any) =>
      Array.isArray(row.roles) && row.roles.includes("commander"),
    )?.name;
    if (engineCommander && rowNames.has(cardFactKey(engineCommander))) return rowNames.get(cardFactKey(engineCommander)) || engineCommander;
    for (const selected of [selectedCommander?.name, selectedSecondCommander?.name]) {
      if (selected && rowNames.has(cardFactKey(selected))) return rowNames.get(cardFactKey(selected)) || selected;
    }
    // Older preserved decks can carry stale setup metadata. A commander-direct
    // Masterwork's title records the chosen commander, so use it only when that
    // exact card is present in the currently opened deck.
    const titleCandidate = chosenWork.name.endsWith(", Forged")
      ? chosenWork.name.slice(0, -", Forged".length)
      : "";
    return titleCandidate && rowNames.has(cardFactKey(titleCandidate))
      ? rowNames.get(cardFactKey(titleCandidate)) || titleCandidate
      : deckRows[0]?.name || "";
  }, [format, deckRows, nativeMasterworkContext, selectedCommander?.name, selectedSecondCommander?.name, chosenWork.name]);
  const displayDeckName = activeCommanderName
    ? `${activeCommanderName} deck`
    : chosenWork.name;
  const deckPurchaseLink = buildTcgplayerDeckLink({ rows: deckRows, enabled: tcgplayerAffiliateEnabled });
  // The success/failure boundary itself: chamber === "workbench" only means
  // a build was requested, not that a real, complete deck exists — it's
  // also true for the few seconds a generation is still in flight, and
  // (until the request resolves) for a generation that's about to fail.
  // Success chrome (the "ready to play" framing, card counts, copy/price
  // actions) must gate on this, never on chamber alone, so a forging-in-
  // progress or failed attempt is never dressed up as a finished deck.
  const hasValidatedDeck =
    benchStatus !== "forging" &&
    !forgeGenerationError &&
    deckRows.length > 0 &&
    deckRows.reduce((sum, row) => sum + row.quantity, 0) === targetDeckSize(format);
  const masterworkIdentityKey = `metaforge.masterworkIdentity.${deckId || activeCommanderName || chosenWork.name}`;
  const featuredMasterworkCard = deckRows.some((row) => row.name === masterworkIdentity.featuredCard)
    ? masterworkIdentity.featuredCard
    : activeCommanderName || deckRows[0]?.name || chosenPreview.card;
  const featuredMasterworkArt = featuredMasterworkCard ? cardArtCrop(featuredMasterworkCard) : "";
  const masterworkFeaturedChoices = [activeCommanderName, ...deckRows.map((row) => row.name)]
    .filter((name, index, names): name is string => Boolean(name) && names.indexOf(name) === index)
    .slice(0, 3);

  useEffect(() => {
    if (!hasValidatedDeck) return;
    try {
      const saved = JSON.parse(window.localStorage.getItem(masterworkIdentityKey) || "null");
      const next = saved && typeof saved === "object"
        ? {
            featuredCard: typeof saved.featuredCard === "string" ? saved.featuredCard : "",
            title: typeof saved.title === "string" ? saved.title : "",
            treatment: ["stained", "etched", "clean"].includes(saved.treatment) ? saved.treatment : "stained",
            focus: ["left", "center", "right"].includes(saved.focus) ? saved.focus : "center",
            glow: Math.max(0, Math.min(100, Number(saved.glow) || 36)),
          }
        : { title: "", featuredCard: "", treatment: "stained", focus: "center", glow: 36 };
      setMasterworkIdentity(next as typeof masterworkIdentity);
      setMasterworkIdentityDraft(next as typeof masterworkIdentity);
    } catch {
      /* Personalization must never block access to a finished deck. */
    }
  }, [hasValidatedDeck, masterworkIdentityKey]);
  useEffect(() => {
    if (chamber !== "archive" || !savedMasterworks.length) return;
    const next: Record<string, string> = {};
    for (const family of savedMasterworks) {
      let art = family.commander?.name || "";
      try {
        const saved = JSON.parse(window.localStorage.getItem(`metaforge.masterworkIdentity.${family.id}`) || "null");
        if (saved && typeof saved.featuredCard === "string" && saved.featuredCard) art = saved.featuredCard;
      } catch {
        /* Archive art is cosmetic only — never block the list on a bad localStorage value. */
      }
      if (art) next[family.id] = art;
    }
    setArchiveFeaturedArt(next);
  }, [chamber, savedMasterworks]);
  useEffect(() => {
    if (chamber !== "workbench") return;
    const section = forgeDescentRef.current;
    if (!section) return;
    let frame = 0;
    const updateForgeDepth = () => {
      frame = 0;
      const rect = section.getBoundingClientRect();
      const traveled = Math.max(0, -rect.top + window.innerHeight * 0.3);
      const available = Math.max(1, section.scrollHeight - window.innerHeight * 0.7);
      const depth = Math.min(1, traveled / available);
      section.style.setProperty("--forge-depth", depth.toFixed(3));
    };
    const requestUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(updateForgeDepth);
    };
    updateForgeDepth();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
    };
  }, [chamber, activeForgeChapter, hasValidatedDeck]);
  const orderedDeckRows = useMemo(
    () =>
      [...deckRows].sort((a, b) => {
        const ai = cardOrder.indexOf(a.name),
          bi = cardOrder.indexOf(b.name);
        return (ai < 0 ? 9999 : ai) - (bi < 0 ? 9999 : bi);
      }),
    [deckRows, cardOrder],
  );
  const groupedDeck = useMemo(() => {
    const alphabetize = (rows: DeckRow[]) => [...rows].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base", numeric: true }),
    );
    const commanderKeys = new Set(
      [activeCommanderName, selectedSecondCommander?.name]
        .filter(Boolean)
        .map((name) => cardFactKey(name as string)),
    );
    const isCommanderRow = (row: DeckRow) =>
      isCommanderFormat(format) && commanderKeys.has(cardFactKey(row.name));
    // Card metadata improves the presentation, but it must never gate access to
    // a finished deck. Restored decks can open while the external catalog is
    // unavailable. The commander remains separate from the other 99 cards even
    // while the rest stay in one honest, stable-order section.
    if (cardFactsLoading || cardFactsError) {
      const commanderRows = alphabetize(orderedDeckRows.filter(isCommanderRow));
      const mainDeckRows = alphabetize(orderedDeckRows.filter((row) => !isCommanderRow(row)));
      return {
        ...(commanderRows.length ? { Commander: commanderRows } : {}),
        "Complete deck": mainDeckRows,
      };
    }
    const groups: Record<string, DeckRow[]> = {};
    for (const row of orderedDeckRows) {
      const fact = cardFacts[cardFactKey(row.name)];
      const group = isCommanderRow(row)
        ? "Commander"
        : fact
        ? cardGroup(fact, false)
        : "Details pending";
      (groups[group] ||= []).push(row);
    }
    for (const group of Object.keys(groups)) groups[group] = alphabetize(groups[group]);
    return groups;
  }, [orderedDeckRows, cardFacts, cardFactsLoading, cardFactsError, format, activeCommanderName, selectedSecondCommander?.name]);
  // Real WUBRG pip totals across the list (mana symbols × row quantity, hybrid
  // and Phyrexian symbols counted toward every color they name) — not a
  // stand-in for color identity, which the commander badge already covers.
  const colorPipCounts = useMemo(() => {
    const totals: Record<"W" | "U" | "B" | "R" | "G", number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
    for (const row of deckRows) {
      const fact = cardFacts[cardFactKey(row.name)];
      const cost = fact?.mana_cost
        || fact?.card_faces?.map((face) => face.mana_cost).filter(Boolean).join("")
        || "";
      const symbols = cost.match(/\{[^}]+\}/g) || [];
      for (const symbol of symbols) {
        for (const color of ["W", "U", "B", "R", "G"] as const) {
          if (symbol.includes(color)) totals[color] += row.quantity;
        }
      }
    }
    return totals;
  }, [deckRows, cardFacts]);
  // The card fact used for pricing: the player's chosen specific printing
  // (right-click on a row) if they picked one, otherwise whatever printing
  // Scryfall returned by default. Only the prices differ; everything else
  // about the card stays the same.
  const effectivePriceFact = (name: string): CardFact | undefined => {
    const key = cardFactKey(name);
    const override = printingOverrides[key];
    const base = cardFacts[key];
    if (!override) return base;
    return { ...base, prices: { usd: override.usd, usd_foil: override.usd_foil } };
  };
  // Real market price, not a model guess — the same prices.usd Scryfall
  // already returns for every card fetched into cardFacts, just never
  // surfaced to the player before. Cards with no known price (never
  // fetched yet, or genuinely no listed price) are counted separately
  // rather than silently treated as free, so the total is honest about
  // what it does and doesn't cover.
  const deckPriceTotal = useMemo(() => {
    let total = 0;
    let pricedCards = 0;
    let unpricedCards = 0;
    for (const row of deckRows) {
      const fact = effectivePriceFact(row.name);
      const price = cheapestPrintings
        ? cheapestCardPriceUsd(fact)
        : cardPriceUsd(fact, foilCards.has(cardFactKey(row.name)));
      if (price === null) {
        unpricedCards += row.quantity;
        continue;
      }
      total += price * row.quantity;
      pricedCards += row.quantity;
    }
    return { total, pricedCards, unpricedCards };
  }, [deckRows, cardFacts, foilCards, cheapestPrintings, printingOverrides]);
  // Never silently resurrect the prior deck's commander after navigation.
  // The preview represents an explicit hover/tap in the current section.
  const activeCard = hoveredCard;
  const activeFact = cardFacts[cardFactKey(activeCard)];
  const activePrinting = printingOverrides[cardFactKey(activeCard)];
  const activeImage =
    activePrinting?.image ||
    activeFact?.image_uris?.normal ||
    activeFact?.card_faces?.[0]?.image_uris?.normal ||
    (activeCard ? cardImage(activeCard) : "");
  const activePriceUsd = cardPriceUsd(activeFact, foilCards.has(cardFactKey(activeCard)));
  const activePurchaseLink = activeCard
    ? buildTcgplayerLink({
        cardName: activeCard,
        tcgplayerProductId: activePrinting?.tcgplayerId ?? null,
        enabled: tcgplayerAffiliateEnabled,
      })
    : null;
  const inspectedFact = cardFacts[cardFactKey(inspectedCard)];
  const inspectedPrinting = printingOverrides[cardFactKey(inspectedCard)];
  const inspectedImage =
    inspectedPrinting?.image ||
    inspectedFact?.image_uris?.normal ||
    inspectedFact?.card_faces?.[0]?.image_uris?.normal ||
    (inspectedCard ? cardImage(inspectedCard) : "");
  const deckIntegrity = useMemo(() => {
    const target = targetDeckSize(format);
    const total = deckRows.reduce((sum, row) => sum + row.quantity, 0);
    const unresolved = deckRows.filter((row) => !cardFacts[cardFactKey(row.name)]);
    const illegal = deckRows.filter((row) => {
      const fact = cardFacts[cardFactKey(row.name)];
      if (!fact) return false;
      const legality = fact.legalities?.[scryfallLegality(format)];
      const arenaRequired = format === "Brawl" || format === "Standard Brawl";
      return (
        legality !== "legal" ||
        (arenaRequired && !fact.games?.includes("arena")) ||
        (format === "Standard Brawl" && fact.legalities?.standard !== "legal")
      );
    });
    const commanderKey = cardFactKey(activeCommanderName);
    const commanderQuantity = deckRows
      .filter((row) => cardFactKey(row.name) === commanderKey)
      .reduce((sum, row) => sum + row.quantity, 0);
    const commanderColors = new Set([
      ...(selectedCommander?.colors || []),
      ...(selectedSecondCommander?.colors || []),
    ]);
    const identityBreaks = isCommanderFormat(format)
      ? deckRows.filter((row) => {
          const colors = cardFacts[cardFactKey(row.name)]?.color_identity || [];
          return colors.some((color) => !commanderColors.has(color));
        })
      : [];
    const copyBreaks = isCommanderFormat(format)
      ? deckRows.filter(
          (row) =>
            row.quantity > 1 && !BASIC_CARD_NAMES.has(cardFactKey(row.name)),
        )
      : deckRows.filter(
          (row) =>
            row.quantity > 4 && !BASIC_CARD_NAMES.has(cardFactKey(row.name)),
        );
    const issues: string[] = [];
    if (total !== target) issues.push(`Deck contains ${total} cards; ${format} requires exactly ${target}.`);
    if (isCommanderFormat(format) && commanderQuantity !== 1)
      issues.push(`The selected commander must appear exactly once; found ${commanderQuantity}.`);
    if (illegal.length)
      issues.push(`${illegal.length} card${illegal.length === 1 ? " is" : "s are"} not currently legal and available for ${format}.`);
    if (identityBreaks.length)
      issues.push(`${identityBreaks.length} card${identityBreaks.length === 1 ? " breaks" : "s break"} the commander's color identity.`);
    if (copyBreaks.length)
      issues.push(`${copyBreaks.length} nonbasic card${copyBreaks.length === 1 ? " exceeds" : "s exceed"} the format copy limit.`);
    const roles: Record<string, number> = {};
    let cmcTotal = 0;
    let spellCount = 0;
    for (const row of deckRows) {
      const fact = cardFacts[cardFactKey(row.name)];
      const role = cardRole(fact);
      roles[role] = (roles[role] || 0) + row.quantity;
      if (role !== "Mana source") {
        cmcTotal += Number(fact?.cmc || 0) * row.quantity;
        spellCount += row.quantity;
      }
    }
    return {
      target,
      total,
      checking: Boolean(deckRows.length && unresolved.length),
      unresolved,
      illegal,
      identityBreaks,
      copyBreaks,
      issues,
      roles,
      averageCmc: spellCount ? cmcTotal / spellCount : 0,
      passed: Boolean(deckRows.length && !unresolved.length && !issues.length),
    };
  }, [deckRows, cardFacts, format, activeCommanderName, selectedCommander, selectedSecondCommander]);
  const activeRole = cardRole(activeFact);
  const structuralCards = useMemo(
    () =>
      deckRows.map((row) => {
        const fact = cardFacts[cardFactKey(row.name)];

        return {
          name: row.name,
          quantity: row.quantity,
          typeLine: [
            fact?.type_line,
            ...(fact?.card_faces || []).map(
              (face) => face.type_line,
            ),
          ]
            .filter(Boolean)
            .join(" // "),
          oracleText: [
            fact?.oracle_text,
            ...(fact?.card_faces || []).map(
              (face) => face.oracle_text,
            ),
          ]
            .filter(Boolean)
            .join(" // "),
          cmc: (() => {
            const raw = fact?.cmc;
            const value = raw == null || raw === "" ? NaN : Number(raw);
            return Number.isFinite(value) ? value : 0;
          })(),
          isCommander:
            isCommanderFormat(format) &&
            cardFactKey(row.name) ===
              cardFactKey(activeCommanderName),
          colorIdentity: fact?.color_identity || [],
          manaCost: fact?.mana_cost || "",
        };
      }),
    [
      deckRows,
      cardFacts,
      format,
      activeCommanderName,
    ],
  );

  // Debounced server-side structural analysis. Deck editing (cut/add/drag)
  // stays instant and purely client-side; only this — the interaction
  // graph, systems intelligence, causality engine, and bounded failure
  // analysis, all now server-only — waits briefly after the player stops
  // editing before refreshing. structuralAnalysisReport keeps its last
  // real value across a refresh (no flash back to "0 systems" on every
  // edit); structuralAnalysisStatus tracks idle/loading/ready/error
  // explicitly for anything that wants to show that state. The actual
  // fetch effect is defined further below, once simulationDossier (one of
  // its inputs) exists — this block only owns state and the values every
  // earlier hook in this component reads from it.
  const [structuralAnalysisStatus, setStructuralAnalysisStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [structuralAnalysisReport, setStructuralAnalysisReport] =
    useState<ForgeAnalysisReport | null>(null);

  const structuralReportReady = structuralAnalysisReport !== null;
  const activeDeckFingerprint = useMemo(
    () => deckFingerprintFromRows(deckRows),
    [deckRows],
  );
  const boundStructural = useMemo(
    () =>
      bindStructuralSystemsForCoach({
        report: structuralAnalysisReport,
        generationId: nativeMasterworkContext?.generationId || "",
        commanderName: activeCommanderName,
        deckFingerprint: activeDeckFingerprint,
      }),
    [
      structuralAnalysisReport,
      nativeMasterworkContext?.generationId,
      activeCommanderName,
      activeDeckFingerprint,
    ],
  );
  const activeStructuralReport =
    boundStructural.ok && structuralAnalysisReport
      ? structuralAnalysisReport
      : EMPTY_FORGE_ANALYSIS_REPORT;

  const interactionGraph =
    activeStructuralReport.graph;

  const forgeSystemsReport =
    activeStructuralReport.systems;

  // Founder #021's original scroll/chapter suppression logic (only surface
  // a card when the reader's primary preview scrolled off-screen) is gone:
  // the card-preview slot is now a fixed frame fixture, always visible, so
  // there is no "off-screen pane" to protect a scrolling reader from.
  const activeCardReasons = useMemo(
    () => reasonsCardMatters(activeCard, forgeSystemsReport),
    [activeCard, forgeSystemsReport],
  );

  const foreignSuspectNames = useMemo(() => {
    const suspects = [
      selectedCommander?.name,
      selectedSecondCommander?.name,
      structuralAnalysisReport?.commanderName,
      structuralAnalysisReport?._boundCommander,
      ...(FORMAT_PREVIEWS.Commander || []).map((preview) => preview.card),
    ].filter(Boolean) as string[];
    const activeKey = String(activeCommanderName || "").toLocaleLowerCase("en");
    return [...new Set(suspects)].filter(
      (name) => String(name).toLocaleLowerCase("en") !== activeKey,
    );
  }, [
    selectedCommander?.name,
    selectedSecondCommander?.name,
    structuralAnalysisReport,
    activeCommanderName,
  ]);

  const honestCoachSummary = useMemo(
    () =>
      buildIntegrityGuardedCoachSummary({
        selected: nativeMasterworkContext?.selected || null,
        structuralSystems: boundStructural.ok ? forgeSystemsReport : null,
        reviewFocusResult,
        isImported: isImportedDeckReview,
        generationId: nativeMasterworkContext?.generationId || "",
        deckUnderstanding,
        activeCommanderName,
        deckCardNames: deckRows.map((row) => row.name),
        foreignSuspectNames,
        allowedSystemNames: boundStructural.ok
          ? [
              forgeSystemsReport.strongestSystem?.name,
              forgeSystemsReport.weakestSystem?.name,
              ...(forgeSystemsReport.systems || []).map((system: any) => system?.name),
            ].filter(Boolean)
          : [],
        commissionNote: nativeMasterworkContext?.commissionNote || commissionNote,
        cardFacts,
        restoredPlanIdentity,
      }),
    [
      nativeMasterworkContext?.selected,
      nativeMasterworkContext?.generationId,
      nativeMasterworkContext?.commissionNote,
      boundStructural.ok,
      forgeSystemsReport,
      reviewFocusResult,
      isImportedDeckReview,
      deckUnderstanding,
      activeCommanderName,
      deckRows,
      foreignSuspectNames,
      commissionNote,
      cardFacts,
      restoredPlanIdentity,
    ],
  );

  useEffect(() => {
    coachBriefViewedRef.current = false;
  }, [nativeMasterworkContext?.generationId]);

  // Narrative Integrity: never keep a previous analysis's structural report
  // when the active generation changes. Keep-last-value is only valid within
  // the same analysis (edit debounce), not across deck/commander switches.
  useEffect(() => {
    setStructuralAnalysisReport(null);
    setStructuralAnalysisStatus("idle");
    setExperimentTablets(null);
    setExperimentReportStatus("idle");
  }, [nativeMasterworkContext?.generationId]);

  useEffect(() => {
    if (!hasValidatedDeck || !honestCoachSummary.analysisIds?.analysisId) return;
    if (coachBriefViewedRef.current) return;
    coachBriefViewedRef.current = true;
    trackLaunchEvent("coach_brief_viewed", {
      format,
      imported: isImportedDeckReview ? "yes" : "no",
      confidence: honestCoachSummary.confidence.level,
    });
  }, [
    hasValidatedDeck,
    honestCoachSummary.analysisIds?.analysisId,
    honestCoachSummary.confidence.level,
    format,
    isImportedDeckReview,
  ]);

  useEffect(() => {
    if (!hasValidatedDeck || !isImportedDeckReview) return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById("coach-brief")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [hasValidatedDeck, isImportedDeckReview, nativeMasterworkContext?.generationId]);

  async function submitHonestCoachFeedback(
    optionId: string,
    tablet: any = null,
    notHelpfulReason: string | null = null,
  ) {
    const option = HONEST_COACH_FEEDBACK_OPTIONS.find((entry) => entry.id === optionId);
    if (!option) return;
    if (option.needsFollowUp && !notHelpfulReason) {
      setCoachFeedbackPendingOption(optionId);
      setCoachFeedbackTargetTablet(tablet);
      setCoachFeedbackStatus("need-reason");
      return;
    }
    setCoachFeedbackStatus("saving");
    try {
      const recommendationIds = tablet?.recommendationIds || null;
      const response = await fetch("/api/coach/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          optionId: option.id,
          note: coachFeedbackNote.trim() || undefined,
          notHelpfulReason: notHelpfulReason || undefined,
          analysisId: honestCoachSummary.analysisIds.analysisId,
          recommendationId: recommendationIds?.recommendationId || undefined,
          diagnosticClass: recommendationIds?.diagnosticClass || undefined,
          reasonClass: recommendationIds?.reasonClass || undefined,
          brainVersion: "brain_v1",
          confidence: honestCoachSummary.confidence.level,
          commander: activeCommanderName || honestCoachSummary.identity.commanders[0] || undefined,
          packageLabels: honestCoachSummary.identity.packageLabels,
          context: {
            analysisId: honestCoachSummary.analysisIds.analysisId,
            recommendationId: recommendationIds?.recommendationId || null,
            generationId: nativeMasterworkContext?.generationId || null,
            brainVersion: "brain_v1",
            confidence: honestCoachSummary.confidence.level,
            commander: activeCommanderName || honestCoachSummary.identity.commanders[0] || null,
            packageLabels: honestCoachSummary.identity.packageLabels,
          },
        }),
      });
      if (!response.ok) {
        if (response.status === 401) {
          setCoachFeedbackStatus("auth");
          return;
        }
        setCoachFeedbackStatus("error");
        return;
      }
      trackLaunchEvent("coach_feedback_submitted", {
        format,
        option: option.id,
        reason: notHelpfulReason || "none",
        guest: "unknown",
      });
      setCoachFeedbackStatus("saved");
      setCoachFeedbackNote("");
      setCoachFeedbackPendingOption(null);
      setCoachFeedbackTargetTablet(null);
    } catch {
      setCoachFeedbackStatus("error");
    }
  }

  // Was a plain filter over the whole deck's interaction-edge graph, rerun
  // on every render of this ~9,000-line single component - not just every
  // hover (activeCard changing is real work), but every unrelated state
  // change anywhere else on the page too (typing in search, toggling a
  // setting, anything). Memoized so it only reruns when what it actually
  // reads changes.
  const activeGraphEdges = useMemo(
    () => interactionGraph.edges
      .filter((edge) => edge.from === activeCard || edge.to === activeCard)
      .slice(0, 2),
    [interactionGraph.edges, activeCard],
  );
  const activeSlotReason =
    activeRole === "Mana source"
      ? "Supports the deck's colored-mana and land-count requirements."
      : activeRole === "Interaction" || activeRole === "Board reset"
        ? "Protects the deck's plan by answering opposing development."
        : activeRole === "Acceleration"
          ? "Moves the commander and expensive payoff turns ahead of schedule."
          : activeRole === "Card advantage"
            ? "Keeps the Forge supplied after early resources are exchanged."
            : activeRole === "Engine piece"
              ? "Connects multiple cards so the deck produces compounding value."
              : activeRole === "Protection"
                ? "Preserves a commander, engine, or decisive threat through interaction."
              : "Advances the primary plan while maintaining useful battlefield presence.";
  const tabletopCards = useMemo<TabletopCard[]>(
    () => orderedDeckRows.map((row) => {
      const fact = cardFacts[cardFactKey(row.name)];
      const isCommander = isCommanderFormat(format) && [activeCommanderName, selectedSecondCommander?.name]
        .filter(Boolean)
        .some((name) => cardFactKey(name as string) === cardFactKey(row.name));
      const rawCmc = fact?.cmc;
      const cmc = rawCmc == null || rawCmc === "" ? null : Number(rawCmc);
      return {
        name: row.name,
        quantity: row.quantity,
        role: isCommander ? "Commander" : cardRole(fact),
        image: fact?.image_uris?.normal || fact?.card_faces?.[0]?.image_uris?.normal || cardImage(row.name),
        cmc: cmc != null && Number.isFinite(cmc) ? cmc : null,
        typeLine: fact?.type_line || fact?.card_faces?.map((face) => face.type_line).filter(Boolean).join(" // ") || "",
        manaCost: fact?.mana_cost || fact?.card_faces?.map((face) => face.mana_cost).filter(Boolean).join(" // ") || "",
        colorIdentity: fact?.color_identity || [],
        oracleText: fact?.oracle_text || fact?.card_faces?.map((face) => face.oracle_text).filter(Boolean).join(" // ") || "",
        producedMana: fact?.produced_mana || [],
      };
    }),
    [orderedDeckRows, cardFacts, format, activeCommanderName, selectedSecondCommander?.name],
  );
  const previousRevisionCardNames = useMemo(
    () => revisions.length > 1
      ? parseDeckRows(revisions[revisions.length - 2]?.deck || "").map((row) => row.name)
      : [],
    [revisions],
  );
  const inspectedRole = inspectedCard ? cardRole(inspectedFact) : "";
  const inspectedIsCommander = isCommanderFormat(format) && [activeCommanderName, selectedSecondCommander?.name]
    .filter(Boolean)
    .some((name) => cardFactKey(name as string) === cardFactKey(inspectedCard));
  // The same repeated-filter-over-a-potentially-large-array pattern as
  // activeGraphEdges above, but for the inspected-card panel: unmemoized,
  // so leaving a card's readable details open while doing anything else on
  // the page (typing, scrolling, toggling settings) reran every one of
  // these on every render, not just when the inspected card itself changed.
  const inspectedConnections = useMemo(
    () => inspectedCard
      ? interactionGraph.edges.filter(
          (edge) => edge.from === inspectedCard || edge.to === inspectedCard,
        )
      : [],
    [inspectedCard, interactionGraph.edges],
  );
  const inspectedSystems = useMemo(
    () => inspectedCard
      ? forgeSystemsReport.systems.filter((system) =>
          system.members.includes(inspectedCard),
        )
      : [],
    [inspectedCard, forgeSystemsReport.systems],
  );
  const inspectedEvaluation = useMemo(
    () => inspectedCard
      ? activeStructuralReport.cardEvaluations.cards.find(
          (evaluation) => cardFactKey(evaluation.name) === cardFactKey(inspectedCard),
        ) || null
      : null,
    [inspectedCard, activeStructuralReport.cardEvaluations.cards],
  );
  // Atlas seat language, parallel to the construction-native "WHY IT IS
  // HERE" reasoning above — never a construction input (writesToBrain:
  // false throughout). Only rendered when Mentor actually has a seat for
  // this card; "unknown is not absent" means most cards show nothing here.
  const inspectedMentor = useMemo(() => inspectedCard
    ? explainCardAsMentor({
        cardName: inspectedCard,
        oracleText: inspectedFact?.oracle_text
          || inspectedFact?.card_faces?.map((face: { oracle_text?: string }) => face.oracle_text).filter(Boolean).join("\n\n")
          || "",
        typeLine: inspectedFact?.type_line || "",
      })
    : null, [inspectedCard, inspectedFact]);
  // Checked dynamically over every "*Seating" array Mentor returns, rather
  // than naming each axis here, so this stays correct as new seat families
  // (counter, life, protection, ...) get added on the Atlas side.
  const inspectedMentorHasSeat = Boolean(
    inspectedMentor?.ok
      && (inspectedMentor.seats.length
        || Object.entries(inspectedMentor).some(
          ([key, value]) => key.endsWith("Seating") && Array.isArray(value) && value.length > 0,
        )),
  );
  // Occupancy-opened packages only. Health is commentary, never a cohesion
  // score, and never shown when live forge rows/intent are gone (reopened
  // archive) — unknown is not absent.
  const inspectedPackageMentors = useMemo(() => {
    if (!inspectedIsCommander) return [];
    const rows = nativeMasterworkContext?.selected?.rows || [];
    const intent = nativeMasterworkContext?.selected?.strategicIntent || {};
    if (!rows.length || !(intent.packages || []).length) return [];
    return explainOccupiedPackagesAsMentor({
      rows,
      intent,
      commanderName: String(inspectedCard || ""),
      commanderOracleText: inspectedFact?.oracle_text
        || inspectedFact?.card_faces?.map((face: { oracle_text?: string }) => face.oracle_text).filter(Boolean).join("\n\n")
        || "",
    }).filter((row: { commentary?: string }) => Boolean(row.commentary));
  }, [inspectedIsCommander, inspectedCard, inspectedFact, nativeMasterworkContext]);
  const inspectedPairMentors = useMemo(() => {
    if (!inspectedCard) return [];
    const oracleFor = (name: string) => {
      const fact = cardFacts[cardFactKey(name)] || {};
      return fact.oracle_text
        || fact.card_faces?.map((face: { oracle_text?: string }) => face.oracle_text).filter(Boolean).join("\n\n")
        || "";
    };
    return explainPairsForCardAsMentor({
      cardName: inspectedCard,
      enginePairs: interactionGraph.enginePairs || [],
      resetPairs: interactionGraph.resetPairs || [],
      oracleFor,
      limit: 2,
    });
  }, [inspectedCard, cardFacts, interactionGraph.enginePairs, interactionGraph.resetPairs]);
  const coachOccupancyLabels = useMemo(() => {
    const names = [];
    for (const row of nativeMasterworkContext?.selected?.rows || []) {
      if (Array.isArray(row.roles) && row.roles.includes("commander") && row.name) names.push(row.name);
    }
    for (const name of [activeCommanderName, selectedSecondCommander?.name]) {
      if (name && !names.some((existing) => cardFactKey(existing) === cardFactKey(name))) names.push(name);
    }
    const cards = names.filter(Boolean).map((name) => {
      const fact = cardFacts[cardFactKey(name)] || {};
      return {
        name,
        oracleText: fact.oracle_text
          || fact.card_faces?.map((face: { oracle_text?: string }) => face.oracle_text).filter(Boolean).join("\n\n")
          || "",
      };
    });
    return occupancyEngineLabelsForCommanders(cards);
  }, [activeCommanderName, selectedSecondCommander, cardFacts, nativeMasterworkContext]);
  // Inspector occupancy is bound to the inspected commander oracle, not
  // the live coach commander — archive reopen can still name occupancy.
  const inspectedOccupancyLabels = useMemo(() => {
    if (!inspectedIsCommander || !inspectedCard) return [];
    return occupancyEngineLabelsForCommander({
      name: String(inspectedCard || ""),
      oracleText: inspectedFact?.oracle_text
        || inspectedFact?.card_faces?.map((face: { oracle_text?: string }) => face.oracle_text).filter(Boolean).join("\n\n")
        || "",
    });
  }, [inspectedIsCommander, inspectedCard, inspectedFact]);
  const activeIsCommander = isCommanderFormat(format) && [activeCommanderName, selectedSecondCommander?.name]
    .filter(Boolean)
    .some((name) => cardFactKey(name as string) === cardFactKey(activeCard));
  const activeOccupancyLabels = useMemo(() => {
    if (!activeIsCommander || !activeCard) return [];
    return occupancyEngineLabelsForCommander({
      name: String(activeCard || ""),
      oracleText: activeFact?.oracle_text
        || activeFact?.card_faces?.map((face: { oracle_text?: string }) => face.oracle_text).filter(Boolean).join("\n\n")
        || "",
    });
  }, [activeIsCommander, activeCard, activeFact]);
  const commissionOccupancyLabels = useMemo(
    () => occupancyLabelsForOption(selectedCommander),
    [selectedCommander],
  );
  const secondCommissionOccupancyLabels = useMemo(
    () => occupancyLabelsForOption(selectedSecondCommander),
    [selectedSecondCommander],
  );
  const revealOccupancyLabels = useMemo(() => {
    const seen = new Set<string>();
    const labels: string[] = [];
    for (const label of [...commissionOccupancyLabels, ...secondCommissionOccupancyLabels]) {
      if (seen.has(label)) continue;
      seen.add(label);
      labels.push(label);
    }
    return labels;
  }, [commissionOccupancyLabels, secondCommissionOccupancyLabels]);

  // Prefers the exact printing the player already chose via the printing
  // picker (inspectedPrinting.tcgplayerId); falls back to a name-only
  // search when no printing has been selected yet. Same shared helper the
  // decklist row and printing picker already use — never a second,
  // ad-hoc URL construction.
  const inspectorPurchaseLink = inspectedCard
    ? buildTcgplayerLink({
        cardName: inspectedCard,
        tcgplayerProductId: inspectedPrinting?.tcgplayerId ?? null,
        enabled: tcgplayerAffiliateEnabled,
      })
    : null;
  const inspectedSlotReason =
    inspectedRole === "Mana source"
      ? "Supports the deck's colored-mana and land-count requirements."
      : inspectedRole === "Interaction" || inspectedRole === "Board reset"
        ? "Protects the deck's plan by answering opposing development."
        : inspectedRole === "Acceleration"
          ? "Moves the commander and expensive payoff turns ahead of schedule."
          : inspectedRole === "Card advantage"
            ? "Keeps the Forge supplied after early resources are exchanged."
            : inspectedRole === "Engine piece"
              ? "Connects multiple cards so the deck produces compounding value."
              : inspectedRole === "Protection"
                ? "Preserves a commander, engine, or decisive threat through interaction."
                : "Advances the primary plan while maintaining useful battlefield presence.";

  useEffect(() => {
    if (!inspectedCard) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setInspectedCard("");
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [inspectedCard]);
  // Union-of-triggers: this single debounced request now covers both
  // simulation (live-editing reactive — deckRows/cardFacts/strategy) and
  // revision/intervention learning (event reactive — matchLog/
  // forgeInterventions/revisions.length change on match-recording and
  // intervention accept/dismiss, not on card edits). Either trigger
  // refetches everything; both computations are cheap and pure, so
  // recomputing the other section redundantly costs nothing real, and
  // this avoids a second parallel endpoint/state machine for a boundary
  // that's otherwise identical in shape.
  //
  // runDebouncedAnalysis (debounced-analysis-request.mjs) owns the
  // debounce timer, AbortController, and stale-response guard as a
  // plain, framework-free function specifically so that race behavior
  // (rapid edits collapsing into one request, an out-of-order late
  // response never overwriting newer state) is directly unit-testable
  // without rendering this component. Its returned cancel function is
  // this effect's cleanup — React always runs the previous effect's
  // cleanup before the next one fires, so a superseded call is always
  // canceled (timer cleared, fetch aborted) before a new one starts.
  useEffect(() => {
    if (guestMode) {
      setStructuralAnalysisStatus("idle");
      setStructuralAnalysisReport(null);
      return;
    }
    if (!structuralCards.length) {
      setStructuralAnalysisStatus("idle");
      setStructuralAnalysisReport(null);
      return;
    }
    return runDebouncedAnalysis({
      url: "/api/forge/structural-analyze",
      delayMs: 800,
      fetchImpl: fetch,
      requestBody: {
        cards: structuralCards,
        commanderName: activeCommanderName,
        strategy,
        computeSimulation: deckIntegrity.passed,
        matchLog,
        forgeInterventions,
        revisionsCount: revisions.length,
        playerGoal: coachingGoal || undefined,
      },
      onLoading: () => setStructuralAnalysisStatus("loading"),
      onSuccess: (data: { report: ForgeAnalysisReport }) => {
        setStructuralAnalysisReport(
          stampStructuralReportBinding(data.report, {
            generationId: nativeMasterworkContext?.generationId || "",
            commanderName: activeCommanderName,
            deckFingerprint: activeDeckFingerprint,
          }) as ForgeAnalysisReport,
        );
        setStructuralAnalysisStatus("ready");
      },
      onError: () => setStructuralAnalysisStatus("error"),
    });
  }, [guestMode, structuralCards, activeCommanderName, strategy, deckIntegrity.passed, matchLog, forgeInterventions, revisions.length, coachingGoal, nativeMasterworkContext?.generationId, activeDeckFingerprint]);

  const forgeFailureAnalysis = activeStructuralReport.failureAnalysis;

  const forgeCausalityReport =
    activeStructuralReport.causality;

  const simulationDossier = activeStructuralReport.simulationDossier;

  // The one-slot counterfactual lab (native-one-slot-lab.mjs), the
  // practical goldfish/matchup gate, and tablet assembly
  // (experiment-tablet.mjs) now run server-side (forge-one-slot.ts)
  // against the cached generation context behind nativeMasterworkContext.
  // generationId — no candidates or card pool round-trip from here.
  // Same debounced/race-safe fetch pattern as the structural-analysis
  // effect above, and the same union-of-triggers reasoning: causality
  // and matchLog changing are the real signals a new experiment read is
  // worth asking for, not per-keystroke deck edits.
  const [experimentTablets, setExperimentTablets] = useState<ForgeExperimentReport | null>(null);
  const [experimentReportStatus, setExperimentReportStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");

  useEffect(() => {
    if (!nativeMasterworkContext?.generationId || !boundStructural.ok) {
      setExperimentTablets(null);
      setExperimentReportStatus("idle");
      return;
    }
    return runDebouncedAnalysis({
      url: "/api/forge/one-slot-experiment",
      delayMs: 800,
      fetchImpl: fetch,
      requestBody: {
        generationId: nativeMasterworkContext.generationId,
        currentRows: (nativeMasterworkContext.selected?.rows || []).map((row: any) => ({
          quantity: row.quantity,
          name: row.name,
        })),
        matchLog,
        causalityReport: forgeCausalityReport,
      },
      onLoading: () => setExperimentReportStatus("loading"),
      onSuccess: (data: { report: ForgeExperimentReport }) => {
        setExperimentTablets(data.report);
        setExperimentReportStatus("ready");
      },
      onError: () => setExperimentReportStatus("error"),
    });
  }, [nativeMasterworkContext, forgeCausalityReport, matchLog, boundStructural.ok]);

  const honestCoachTablets = useMemo(() => {
    if (!experimentTablets?.tablets?.length) return [];
    const selected = nativeMasterworkContext?.selected || {};
    return experimentTablets.tablets.map((tablet: any) =>
      enrichTabletWithHonestWhy(tablet, selected, honestCoachSummary.analysisIds),
    );
  }, [experimentTablets, nativeMasterworkContext?.selected, honestCoachSummary.analysisIds]);

  const openingExperimentChoices = useMemo(() => {
    if (!nativeMasterworkContext || !experimentTablets) return [];
    const experiments: any[] = [];
    const proposedCards = new Set<string>();
    for (const tablet of experimentTablets.tablets.filter((entry: any) => entry.type === "experiment")) {
      if (proposedCards.has(tablet.change.add) || experiments.length >= 3) continue;
      proposedCards.add(tablet.change.add);
      experiments.push({
        id: tablet.id,
        kind: "swap" as const,
        card: tablet.change.add,
        eyebrow: tablet.confident === false ? "SPECULATIVE FLEX" : "FORGE RECOMMENDATION",
        title: `Test ${tablet.change.add}`,
        detail: `Rotate out ${tablet.change.cut}. ${tablet.expectedBenefit}`,
        tablet,
      });
    }
    const used = new Set(experiments.map((choice: any) => choice.card));
    const controls = (nativeMasterworkContext.selected?.rows || [])
      .filter((row: any) =>
        !row.roles?.includes("land") &&
        !row.roles?.includes("commander") &&
        !used.has(row.name),
      )
      .sort((left: any, right: any) =>
        Number(left.quantity || 0) - Number(right.quantity || 0) ||
        Number(right.cmc || 0) - Number(left.cmc || 0),
      );
    for (const row of controls) {
      if (experiments.length >= 3) break;
      used.add(row.name);
      experiments.push({
        id: `control-${row.name}`,
        kind: "control" as const,
        card: row.name,
        eyebrow: "CONTROL EXPERIMENT",
        title: `Keep ${row.name}`,
        detail: "Keep the Forge's original flex choice and make this the card you watch first in real matches.",
        tablet: null,
      });
    }
    return experiments.slice(0, 3);
  }, [nativeMasterworkContext, experimentTablets]);

  // Never veil the completed deck unless there is a real decision to render.
  // The one-slot report can be unavailable or legitimately return no tablets;
  // leaving `openingExperimentPending` alone in that case created an empty,
  // unclickable Masterwork shell.
  const openingExperimentGateActive =
    openingExperimentPending &&
    benchStatus !== "forging" &&
    openingExperimentChoices.length > 0;

  const masterworkVisualProfile = useMemo(
    () =>
      resolveMasterworkVisualProfile({
        selectedRows: nativeMasterworkContext?.selected?.rows || [],
        colors: selectedCommander?.colors || [],
        revisionCount: revisions.length,
      }),
    [nativeMasterworkContext, selectedCommander, revisions.length],
  );

  const metaBreakerDossier = useMemo(() => {
    if (!simulationDossier) return null;
    const weakestRow = simulationDossier.matrix.weakest;
    const weakest = weakestRow?.opponent || "Unknown";
    const weakestRate = Math.round((weakestRow?.scenarioPassRate || 0) * 100);
    const stabilizationRate = Math.round((weakestRow?.stabilizationRate || 0) * 100);
    const coverage = Math.round((weakestRow?.modelCoverage || 0) * 100);
    const repairs: Record<string, { pressure: string; test: string }> = {
      Aggro: {
        pressure: "The build is most vulnerable before its engine stabilizes.",
        test: "Challenge two expensive flex slots with early interaction or stabilizers, then rerun the same opening-hand and Aggro stress gates.",
      },
      Control: {
        pressure: "The build needs threats that remain valuable through one-for-one exchanges.",
        test: "Test a resilient engine or protected threat package without lowering proactive threat density.",
      },
      Midrange: {
        pressure: "The build can be outclassed when both decks exchange resources fairly.",
        test: "Add a repeatable advantage engine or an asymmetric answer and measure whether the weakest scenario improves.",
      },
      Tempo: {
        pressure: "The build is losing initiative while its more expensive cards wait in hand.",
        test: "Lower the interaction curve in two slots and test whether plan realization improves without sacrificing the late game.",
      },
    };
    const repair = repairs[weakest] || {
      pressure: "The current model has not isolated a reliable structural pressure point.",
      test: "Collect classified match evidence before changing the list.",
    };
    if (format === "Standard") {
      const meta = getMetaIntelligence();
      if (!meta.readyForCurrentFieldUse) return {
        source: `${meta.current.provenance.name} · last observed ${meta.current.provenance.observedAt}`,
        field: `${weakest} was this deck's hardest modeled stress test: ${weakestRate}% of trials cleared the full pressure test and ${stabilizationRate}% stabilized.`,
        confidence: `FIELD GATE CLOSED · ${meta.current.freshness} · ${meta.current.ageDays} days old`,
        hypothesis: repair.pressure,
        test: `${repair.test} Compare against the current ${weakestRate}% stress-test baseline; do not call it a metagame improvement until field data is refreshed.`,
      };
      return {
        source: `${meta.current.provenance.name} · observed ${meta.current.provenance.observedAt}`,
        field: `${meta.current.leadingStrategy} is the largest measured strategic family at ${(meta.current.strategies[0].share * 100).toFixed(1)}%; it is a plurality, not a majority.`,
        confidence: `${meta.current.confidence} · ${meta.current.freshness} (${meta.current.ageDays}d) · ${meta.current.sampleSize} lists · ${(meta.current.classificationCoverage * 100).toFixed(1)}% classified`,
        hypothesis: repair.pressure,
        test: repair.test,
      };
    }
    const observedSignals = edhrecEvidence?.cards.filter((card) => ["high", "moderate"].includes(card.confidence)).length || 0;
    const discoverySignals = edhrecEvidence?.cards.filter((card) => card.newCardPotential).length || 0;
    return {
      source: edhrecEvidence?.available
        ? `Commander adoption evidence · ${edhrecEvidence.cards.length} signals`
        : "No format-wide tournament field is connected for this format yet",
      field: edhrecEvidence?.available
        ? `${weakest} was this deck's hardest modeled stress test: ${weakestRate}% cleared the full pressure test and ${stabilizationRate}% stabilized.`
        : `${weakest} was this deck's hardest modeled stress test: ${weakestRate}% cleared it with ${coverage}% of the deck represented by supported roles. This is deck-specific—not a claim about today's metagame.`,
      confidence: edhrecEvidence?.available ? `${observedSignals} stronger-sample signals · ${discoverySignals} new-card hypotheses · not a win-rate source` : "insufficient field evidence",
      hypothesis: repair.pressure,
      test: `${repair.test} The next revision must beat the ${weakestRate}% baseline without lowering opening-hand consistency.`,
    };
  }, [simulationDossier, format, edhrecEvidence]);
  const revisionLearning = activeStructuralReport.revisionLearning;
  const interventionLearning = activeStructuralReport.interventionLearning;
  const coachingDiagnosis = activeStructuralReport.coachingDiagnosis;
  const provingGrounds = activeStructuralReport.provingGrounds;
  const coachingSession = useMemo(() => buildCoachingSession({
    coachingDiagnosis,
    provingGrounds,
    experimentTablets,
    activeFieldTest,
  }), [coachingDiagnosis, provingGrounds, experimentTablets, activeFieldTest]);
  // /research reads this mirror instead of recomputing the structural
  // report client-side — see the comment at the top of this file. Debounced
  // so it doesn't fire on every keystroke, gated on hasValidatedDeck per
  // the same success boundary as the rest of the finished-deck chrome.
  useEffect(() => {
    if (!hasValidatedDeck) return;
    const timer = window.setTimeout(() => {
      try {
        const bundleDeckId = deckId || "unsaved-masterwork";
        const bundle = {
          deckId: bundleDeckId,
          updatedAt: new Date().toISOString(),
          commander: activeCommanderName,
          format,
          strategy,
          deckPriceTotal,
          deckIntegrity: {
            total: deckIntegrity.total,
            target: deckIntegrity.target,
            averageCmc: deckIntegrity.averageCmc,
            roles: deckIntegrity.roles,
            checking: deckIntegrity.checking,
            passed: deckIntegrity.passed,
            issues: deckIntegrity.issues,
          },
          evaluation: nativeMasterworkContext?.selected?.evaluation || null,
          powerSignal: nativeMasterworkContext?.powerSignal || null,
          manaConsistency: nativeMasterworkContext?.manaConsistency || null,
          practicalTiebreak: nativeMasterworkContext?.practicalTiebreak || null,
          recoveryNote: nativeMasterworkContext?.selected?.recoveryNote || "",
          unusedEnginePartners: nativeMasterworkContext?.unusedEnginePartners || [],
          requestedPowerTier: nativeMasterworkContext?.requestedPowerTier || "",
          powerAudit: nativeMasterworkContext?.powerAudit || null,
          simulationDossier,
          forgeSystemsReport,
          interactionGraph,
          forgeCausalityReport,
          forgeFailureAnalysis,
          coachOccupancyLabels,
          honestCoachSummary,
          coachingDiagnosis,
          revisionLearning: {
            actionable: revisionLearning.actionable,
            matchups: revisionLearning.matchups,
            sampleSize: revisionLearning.sampleSize,
          },
          interventionLearning,
        };
        window.localStorage.setItem(`metaforge.research.${bundleDeckId}`, JSON.stringify(bundle));
        window.localStorage.setItem("metaforge.research.latest", bundleDeckId);
      } catch {
        /* The Research tab is a read-only mirror — never block the deck page on it. */
      }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [
    hasValidatedDeck,
    deckId,
    activeCommanderName,
    format,
    strategy,
    deckPriceTotal,
    deckIntegrity,
    nativeMasterworkContext,
    simulationDossier,
    forgeSystemsReport,
    interactionGraph,
    forgeCausalityReport,
    forgeFailureAnalysis,
    coachOccupancyLabels,
    honestCoachSummary,
    coachingDiagnosis,
    revisionLearning,
    interventionLearning,
  ]);
  useEffect(() => {
    const names = [
      ...new Set(parseDeckRows(forgedDeck).map((row) => row.name)),
    ];
    if (!names.length) {
      setCardFacts({});
      setCardFactsLoading(false);
      setCardFactsError("");
      setCardFactsPending(0);
      return;
    }
    setCardFactsLoading(true);
    setCardFactsError("");
    let cancelled = false;
    let retryTimer: number | undefined;
    const scheduleDetailsRetry = () => {
      if (cardFactsRetry < 3) {
        retryTimer = window.setTimeout(() => setCardFactsRetry((current) => current + 1), 8000);
      }
    };
    (async () => {
      const next: Record<string, CardFact> = {};
      // A native generation already carries the verified card record used by
      // construction. Seed the gallery from it so a partial supplemental
      // Scryfall response can never turn known cards into "Other".
      for (const row of nativeMasterworkContext?.selected?.rows || []) {
        const fact = cardFactFromNativeRow(row);
        if (fact) indexCardFact(next, fact, row.name);
      }
      if (selectedCommander) {
        indexCardFact(next, {
          name: selectedCommander.name,
          type_line: selectedCommander.typeLine,
          color_identity: selectedCommander.colors,
        }, selectedCommander.name);
      }
      if (selectedSecondCommander) {
        indexCardFact(next, {
          name: selectedSecondCommander.name,
          type_line: selectedSecondCommander.typeLine,
          color_identity: selectedSecondCommander.colors,
        }, selectedSecondCommander.name);
      }
      try {
        const response = await fetch("/api/cards/facts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ names }),
          signal: AbortSignal.timeout(25000),
        });
        if (!response.ok) throw new Error("catalog unavailable");
        const data = await response.json();
        for (const fact of data.cards || []) indexCardFact(next, fact);
        const missing = names.filter((name) => !next[cardFactKey(name)]).length;
        if (!cancelled) setCardFactsPending(missing);
        if (missing > 0) scheduleDetailsRetry();
      } catch {
        if (!cancelled && names.some((name) => !next[cardFactKey(name)])) {
          setCardFactsError("Card details are temporarily unavailable. Your deck is safe; retry when the Archive reconnects.");
          setCardFactsPending(names.filter((name) => !next[cardFactKey(name)]).length);
          scheduleDetailsRetry();
        }
      }
      if (!cancelled) {
        setCardFacts(next);
        setCardFactsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
    };
  }, [forgedDeck, nativeMasterworkContext, selectedCommander, selectedSecondCommander, cardFactsRetry]);

  useEffect(() => {
    setCardOrder(deckRows.map((row) => row.name));
    setCardFactsRetry(0);
    setCardFactsPending(0);
  }, [forgedDeck]);

  useEffect(() => {
    if (guestMode) return;
    (async () => {
      try {
        const response = await fetch("/api/account/deck-bench", {
          cache: "no-store",
        });
        if (!response.ok) return;
        const data = await response.json();
        setSavedMasterworks(
          (data.bench?.families || [])
            .filter(
              (family: SavedFamily) => family.id && family.revisions?.length,
            )
            .sort((a: SavedFamily, b: SavedFamily) =>
              String(b.updatedAt || "").localeCompare(
                String(a.updatedAt || ""),
              ),
            ),
        );
        if (data.bench?.playerCompass) {
          const fromBench = playerCompassFromBench(data.bench);
          writeLocalPlayerCompass(fromBench);
          setPlayerCompass(fromBench);
          setPlayerCompassSynced(true);
        }
      } catch {
        /* History remains available after the account reconnects. */
      }
    })();
  }, [guestMode]);

  async function persistPlayerCompass(nextCompass: ReturnType<typeof readLocalPlayerCompass>) {
    const saved = writeLocalPlayerCompass(nextCompass);
    setPlayerCompass(saved);
    setPlayerCompassSynced(false);
    if (guestMode) return;
    try {
      const response = await fetch("/api/account/deck-bench", { cache: "no-store" });
      if (!response.ok) return;
      const current = await response.json();
      const bench = withPlayerCompassOnBench(
        current.bench || { schemaVersion: 1, families: [] },
        saved,
      );
      const savedResponse = await fetch("/api/account/deck-bench", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bench, baseRevision: current.revision || 0 }),
      });
      if (savedResponse.ok) setPlayerCompassSynced(true);
    } catch {
      /* Local Compass remains available if account sync is interrupted. */
    }
  }

  useEffect(() => {
    if (chamber !== "workbench" || cardSearch.trim().length < 2) {
      setCardSearchResults([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      try {
        const combinedIdentity = [
          ...new Set([
            ...(selectedCommander?.colors || []),
            ...(selectedSecondCommander?.colors || []),
          ]),
        ];
        const identity = combinedIdentity.length
          ? ` id<=${combinedIdentity.join("").toLowerCase()}`
          : "";
        const query = encodeURIComponent(
          `${scryfallFormatTerms(format)}${identity} name:${cardSearch.trim()}`,
        );
        const response = await fetch(
          `https://api.scryfall.com/cards/search?q=${query}&order=edhrec`,
        );
        const data = await response.json();
        setCardSearchResults(
          (data.data || [])
            .slice(0, 8)
            .map((card: any) => ({
              name: card.name,
              typeLine: card.type_line || "Card",
              image:
                card.image_uris?.small ||
                card.card_faces?.[0]?.image_uris?.small ||
                "",
            })),
        );
      } catch {
        setCardSearchResults([]);
      }
    }, 280);
    return () => window.clearTimeout(timer);
  }, [cardSearch, chamber, format, selectedCommander?.name, selectedSecondCommander?.name]);

  useEffect(() => {
    if (!printingMenu) {
      setPrintingOptions([]);
      return;
    }
    let cancelled = false;
    setPrintingOptionsLoading(true);
    (async () => {
      try {
        const query = encodeURIComponent(`!"${printingMenu.name}"`);
        const response = await fetch(
          `https://api.scryfall.com/cards/search?q=${query}&unique=prints&order=released&dir=desc`,
        );
        const data = await response.json();
        if (cancelled) return;
        setPrintingOptions(
          (data.data || []).map((card: any) => ({
            id: card.id,
            setCode: (card.set || "").toUpperCase(),
            setName: card.set_name || card.set || "",
            collectorNumber: card.collector_number || "",
            image:
              card.image_uris?.small ||
              card.card_faces?.[0]?.image_uris?.small ||
              "",
            usd: card.prices?.usd ?? null,
            usd_foil: card.prices?.usd_foil ?? null,
            // Bare numeric ID only — never card.purchase_uris, which
            // wraps Scryfall's own TCGplayer affiliate attribution.
            tcgplayerId: Number.isInteger(card.tcgplayer_id) ? card.tcgplayer_id : null,
          })),
        );
      } catch {
        if (!cancelled) setPrintingOptions([]);
      } finally {
        if (!cancelled) setPrintingOptionsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [printingMenu]);

  // A preview/upcoming printing can be the default card record even though an
  // older reprint is already purchasable. Walk the card's real paper printings
  // and automatically use the least-expensive priced version. This runs for
  // guest decks too: pricing correctness cannot depend on account state.
  // printingOverrides is intentionally read via the functional updater
  // below, not listed as a dependency — including it would re-run this
  // effect (and re-scan every card) on every single card it fixes.
  useEffect(() => {
    if (!deckRows.length || !Object.keys(cardFacts).length) return;
    const unpriced = deckRows.filter((row) => {
      const key = cardFactKey(row.name);
      if (printingOverrides[key]) return false;
      const fact = cardFacts[key];
      return Boolean(fact) && cardPriceUsd(fact) === null;
    });
    if (!unpriced.length) return;
    let cancelled = false;
    (async () => {
      for (const row of unpriced) {
        if (cancelled) return;
        try {
          const query = encodeURIComponent(`!"${row.name}"`);
          const response = await fetch(
            `https://api.scryfall.com/cards/search?q=${query}&unique=prints&order=released&dir=desc`,
            { cache: "no-store" },
          );
          if (!response.ok) continue;
          const data = await response.json();
          const priced = (data.data || [])
            .filter((card: any) => card.games?.includes("paper"))
            .map((card: any) => ({ card, price: cheapestCardPriceUsd(card) }))
            .filter((entry: any) => entry.price !== null)
            .reduce((cheapest: any, entry: any) =>
              !cheapest || entry.price < cheapest.price ? entry : cheapest, null)?.card;
          if (!priced || cancelled) continue;
          const key = cardFactKey(row.name);
          setPrintingOverrides((current) =>
            current[key]
              ? current
              : {
                  ...current,
                  [key]: {
                    id: priced.id,
                    setCode: (priced.set || "").toUpperCase(),
                    setName: priced.set_name || priced.set || "",
                    collectorNumber: priced.collector_number || "",
                    image: priced.image_uris?.small || priced.card_faces?.[0]?.image_uris?.small || "",
                    usd: priced.prices?.usd ?? null,
                    usd_foil: priced.prices?.usd_foil ?? null,
                    tcgplayerId: Number.isInteger(priced.tcgplayer_id) ? priced.tcgplayer_id : null,
                  },
                },
          );
        } catch {
          /* Best-effort background repricing — leave the card unpriced on failure. */
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [deckRows, cardFacts]);

  useEffect(() => {
    if (!printingMenu) return;
    const dismiss = () => setPrintingMenu(null);
    const dismissOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPrintingMenu(null);
    };
    window.addEventListener("click", dismiss);
    window.addEventListener("keydown", dismissOnEscape);
    return () => {
      window.removeEventListener("click", dismiss);
      window.removeEventListener("keydown", dismissOnEscape);
    };
  }, [printingMenu]);

  useEffect(() => {
    if (!cardActionMenu) return;
    const dismiss = () => setCardActionMenu(null);
    const dismissOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setCardActionMenu(null);
    };
    window.addEventListener("click", dismiss);
    window.addEventListener("keydown", dismissOnEscape);
    return () => {
      window.removeEventListener("click", dismiss);
      window.removeEventListener("keydown", dismissOnEscape);
    };
  }, [cardActionMenu]);

  useEffect(() => {
    if (
      !isCommanderFormat(format) ||
      commanderQuery.trim().length < 2 ||
      selectedCommander?.name === commanderQuery.trim()
    ) {
      setCommanderResults([]);
      setCommanderSearchError("");
      return;
    }
    const controller = new AbortController();
    const requestedQuery = commanderQuery.trim();
    const timer = window.setTimeout(async () => {
      setCommanderSearching(true);
      setCommanderSearchError("");
      try {
        const response = await fetch(
          `/api/cards/commanders?format=${encodeURIComponent(format)}&q=${encodeURIComponent(requestedQuery)}&client_schema=2`,
          { signal: controller.signal, cache: "no-store" },
        );
        if (!response.ok) throw new Error("Commander search unavailable");
        const data = await response.json();
        setCommanderResults((data.cards || []).slice(0, 8).map(commanderOptionFromCard));
      } catch {
        if (controller.signal.aborted) return;
        setCommanderResults([]);
        setCommanderSearchError("The commander index is temporarily unavailable. Your search is preserved—try again in a moment.");
      } finally {
        setCommanderSearching(false);
      }
    }, 320);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [commanderQuery, format, selectedCommander?.name, commanderSearchRetry]);

  // Reviewing a pasted decklist (chamber "refine") never asks the player to
  // choose or discover a commander the way a fresh build does — if their
  // paste already names one in the trailing-block shape Moxfield/Arena/MTGO
  // exports use, resolve and reserve it automatically so the commander
  // section below renders its "Commander selected" summary instead of the
  // discovery UI. A paste that doesn't take that shape leaves selectedCommander
  // unset and falls back to the manual picker, which still omits the
  // fresh-build-only "Suggest a commander for me" ceremony in this chamber.
  useEffect(() => {
    if (chamber !== "refine" || !isCommanderFormat(format) || selectedCommander) return;
    const timer = window.setTimeout(async () => {
      try {
        const resolved = await resolvePastedCommanderCandidate({
          deckText: deck,
          format,
          mapCard: commanderOptionFromCard,
        });
        if (resolved) setSelectedCommander(resolved);
      } catch {
        /* Auto-detection is a convenience only; the manual picker remains available. */
      }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [chamber, format, deck, selectedCommander]);

  const partnerEligibility = useMemo(
    () => partnerEligibilityFor(selectedCommander),
    [selectedCommander],
  );

  // Whenever the primary commander changes (including being cleared), any
  // second-commander choice made for the PREVIOUS one is no longer
  // necessarily legal — reset rather than silently carry it forward.
  useEffect(() => {
    setSelectedSecondCommander(null);
    setSecondCommanderQuery("");
    setSecondCommanderResults([]);
  }, [selectedCommander?.name]);

  // "Partner with <name>" names one specific card, so there's nothing to
  // type — fetch that exact card once and offer it as a single suggestion.
  useEffect(() => {
    if (partnerEligibility?.kind !== "partner-with" || selectedSecondCommander) {
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(
          `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(partnerEligibility.specificName)}`,
        );
        if (!response.ok || cancelled) return;
        const card = await response.json();
        if (!cancelled) setSecondCommanderResults([commanderOptionFromCard(card)]);
      } catch {
        /* The specific partner suggestion is optional; nothing to fall back to here. */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [partnerEligibility, selectedSecondCommander]);

  // Plain "Partner" and "Choose a Background" both search-as-you-type,
  // scoped to whichever legality the primary commander's ability actually
  // grants (any other Partner card, or specifically a Background).
  useEffect(() => {
    if (
      !partnerEligibility ||
      partnerEligibility.kind === "partner-with" ||
      secondCommanderQuery.trim().length < 2 ||
      selectedSecondCommander?.name === secondCommanderQuery.trim()
    ) {
      setSecondCommanderResults([]);
      return;
    }
    const eligibilityTerm =
      partnerEligibility.kind === "background" ? "t:background" : "is:commander o:partner";
    const timer = window.setTimeout(async () => {
      setSecondCommanderSearching(true);
      try {
        const query = encodeURIComponent(
          `${scryfallFormatTerms(format)} ${eligibilityTerm} name:${secondCommanderQuery.trim()}`,
        );
        const response = await fetch(
          `https://api.scryfall.com/cards/search?q=${query}&order=name`,
        );
        const data = await response.json();
        setSecondCommanderResults((data.data || []).slice(0, 8).map(commanderOptionFromCard));
      } catch {
        setSecondCommanderResults([]);
      } finally {
        setSecondCommanderSearching(false);
      }
    }, 320);
    return () => window.clearTimeout(timer);
  }, [secondCommanderQuery, format, partnerEligibility, selectedSecondCommander?.name]);

  useEffect(() => {
    if (chamber !== "workbench") return;
    const frame = window.requestAnimationFrame(() => {
      document
        .querySelectorAll<HTMLElement>(".type-column>.type-column-row")
        .forEach((button) => {
          button.draggable = true;
          button.title = "Drag to reorder this card within the deck gallery";
          button.ondragstart = (event) => {
            const name = button.querySelector("strong")?.textContent || "";
            event.dataTransfer?.setData("text/plain", name);
            button.classList.add("dragging");
          };
          button.ondragend = () => button.classList.remove("dragging");
          button.ondragover = (event) => event.preventDefault();
          button.ondrop = (event) => {
            event.preventDefault();
            const source = event.dataTransfer?.getData("text/plain") || "";
            const target = button.querySelector("strong")?.textContent || "";
            moveCard(source, target);
          };
        });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [chamber, groupedDeck]);

  function moveCard(source: string, target: string) {
    if (!source || source === target) return;
    setCardOrder((current) => {
      const next = current.filter((name) => name !== source);
      const targetIndex = next.indexOf(target);
      next.splice(targetIndex < 0 ? next.length : targetIndex, 0, source);
      return next;
    });
  }
  function deckWithout(name: string) {
    return forgedDeck
      .split(/\r?\n/)
      .filter((line) => {
        const match = line
          .trim()
          .match(/^(\d+)\s+(.+?)(?:\s+\([A-Z0-9]{2,6}\)\s+\d+\w*)?$/);
        return !match || match[2].trim().toLowerCase() !== name.toLowerCase();
      })
      .join("\n");
  }
  function preserveDeckEdit(nextDeck: string, note: string) {
    const nextRevisions = [
      ...revisions,
      { deck: nextDeck, note, createdAt: new Date().toISOString() },
    ];
    setForgedDeck(nextDeck);
    setRevisions(nextRevisions);
    void persistStoryBench(nextRevisions, record);
  }
  function stageDeckCard(name: string, destination: "consider" | "remove") {
    const row = deckRows.find(
      (card) => card.name.toLowerCase() === name.toLowerCase(),
    );
    if (!row || name.toLowerCase() === chosenPreview.card.toLowerCase()) return;
    const nextDeck = deckWithout(name);
    if (destination === "consider")
      setConsideringCards((current) => [
        ...current.filter((card) => card.name !== name),
        row,
      ]);
    else
      setRemovedCards((current) => [
        ...current.filter((card) => card.name !== name),
        row,
      ]);
    preserveDeckEdit(
      nextDeck,
      `${destination === "consider" ? "Staged for consideration" : "Removed"}: ${row.quantity} ${row.name}`,
    );
    void recommendReplacements(row, nextDeck);
  }
  function addCardToDeck(row: DeckRow, note = "Added from the workbench") {
    const existing = deckRows.find(
      (card) => card.name.toLowerCase() === row.name.toLowerCase(),
    );
    const quantity = existing ? existing.quantity + row.quantity : row.quantity;
    let replaced = false;
    const lines = forgedDeck.split(/\r?\n/).map((line) => {
      const match = line
        .trim()
        .match(/^(\d+)\s+(.+?)(?:\s+\([A-Z0-9]{2,6}\)\s+\d+\w*)?$/);
      if (match && match[2].trim().toLowerCase() === row.name.toLowerCase()) {
        replaced = true;
        return `${quantity} ${row.name}`;
      }
      return line;
    });
    if (!replaced) lines.push(`${row.quantity} ${row.name}`);
    setConsideringCards((current) =>
      current.filter((card) => card.name !== row.name),
    );
    preserveDeckEdit(lines.join("\n"), `${note}: ${row.quantity} ${row.name}`);
  }
  async function recommendReplacements(cut: DeckRow, nextDeck: string) {
    setLastCutCard(cut.name);
    setReplacementRecommendations([]);
    setReplacementError("");
    setReplacementLoading(true);
    // deckRows here is this render's pre-edit snapshot: stageDeckCard calls
    // preserveDeckEdit (which schedules the post-cut state for the *next*
    // render) immediately before calling this function, and everything
    // below runs synchronously up to the first await — so deckRows still
    // includes the cut card, exactly matching what /api/forge/multi-refill
    // expects to validate and subtract the cut against.
    const currentRows = deckRows.map((row) => ({ name: row.name, quantity: row.quantity }));
    try {
      const response = await fetch("/api/forge/multi-refill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          generationId: nativeMasterworkContext?.generationId,
          currentRows,
          cuts: [{ name: cut.name, quantity: cut.quantity }],
        }),
      });
      const data = await response.json().catch(() => null);
      // 422 is the engine's own honest "no legal card can fill this slot"
      // verdict (worker/forge-multi-refill.ts) — a real strategic result,
      // distinct from a transport/parse failure below.
      if (response.status === 422) {
        setReplacementError("no-legal-replacement");
        return;
      }
      if (!response.ok || !data || !Array.isArray(data.packages)) {
        setReplacementError("operational");
        return;
      }
      // Structured engine output only — never free-text prose, never run
      // through parseDeckRows. Legality and role fit are already real,
      // engine-verified facts on each package; nothing here re-derives or
      // guesses at them.
      const resolved: ReplacementCandidate[] = [];
      for (const pkg of data.packages as Array<{ additions?: Array<{ name?: string; roles?: string[] }>; context?: { summary?: string } }>) {
        const addition = pkg?.additions?.[0];
        if (!addition?.name || resolved.some((candidate) => candidate.name === addition.name)) continue;
        resolved.push({
          name: addition.name,
          typeLine: "Card",
          image: "",
          reason: pkg.context?.summary || "",
          roles: Array.isArray(addition.roles) ? addition.roles : [],
        });
      }
      if (!resolved.length) {
        setReplacementError("no-legal-replacement");
        return;
      }
      // Display polish only, run after the real candidates are already
      // decided — a slow or failed image lookup must never drop an
      // otherwise-legal, already-engine-verified candidate from the list.
      await Promise.all(resolved.map(async (candidate) => {
        try {
          const cardResponse = await fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(candidate.name)}`);
          if (!cardResponse.ok) return;
          const card = await cardResponse.json();
          candidate.typeLine = card.type_line || "Card";
          candidate.image = card.image_uris?.small || card.card_faces?.[0]?.image_uris?.small || "";
        } catch {
          /* image/type line stay blank; the candidate remains legal and usable without them */
        }
      }));
      setReplacementRecommendations(resolved.slice(0, 3));
    } catch {
      setReplacementError("operational");
    } finally {
      setReplacementLoading(false);
    }
  }

  // The one path every commander choice must go through — a typed search
  // result and a drawn suggestion must carry identical side effects, never
  // a second, drifting copy. Selecting a suggestion is not a commitment to
  // build with it; it's exactly the same act as typing its name and
  // clicking it in the search results, nothing more.
  function selectCommander(option: CommanderOption) {
    setSelectedCommander(option);
    setCommanderQuery(option.name);
    setCommanderResults([]);
    setCommanderSearchOpen(false);
    setRandomCommanderOptions([]);
  }

  // Draws three suggested commanders and stops — it must never select one,
  // never advance buildStep, never touch chamber, and never call
  // generation. Those are exactly the four things a "suggest for me" click
  // must never silently do on the player's behalf; the player still picks
  // one (or none) through the picker this populates, via the same
  // selectCommander path a manual search result uses.
  async function chooseRandomCommander() {
    setRandomizingCommander(true);
    setCommanderSearchOpen(false);
    setCommanderResults([]);
    try {
      const query = encodeURIComponent(
          `${scryfallFormatTerms(format)} is:commander`,
        ),
        exclusions = new Set(seenRandomCommanders),
        candidates: CommanderOption[] = [];
      for (
        let attempts = 0;
        candidates.length < 9 && attempts < 30;
        attempts += 1
      ) {
        const response = await fetch(
          `https://api.scryfall.com/cards/random?q=${query}`,
        );
        if (!response.ok) continue;
        const option = commanderOptionFromCard(await response.json());
        if (!exclusions.has(option.name)) {
          exclusions.add(option.name);
          candidates.push(option);
        }
      }
      const starters = arrangeCommanderStarters(candidates).slice(0, 3);
      if (starters.length !== 3)
        throw new Error("Could not draw three unique commanders");
      setRandomCommanderOptions(starters);
      setSeenRandomCommanders([...exclusions]);
    } catch {
      setCommanderQuery("");
    } finally {
      setRandomizingCommander(false);
    }
  }

  // Shared tail for every "one deck is ready" path (the classic three-reveal
  // selection, the pasted-decklist import, and the commander-direct build):
  // validate size, populate revision/tablet state, and persist. Only the
  // reply copy and revision note differ per caller.
  async function applyForgeResult(
    nativeReport: any,
    opts: {
      generationId: string;
      work: Masterwork;
      commander: CommanderOption | null;
      index: number;
      replyText: string;
      revisionNote: string;
      cardPool?: any[];
      // The server-issued Testing Anvil handle (forge-generate.ts's
      // response) — distinct from opts.generationId above, which is the
      // client-generated deckId-like grouping ID used by persistStoryBench.
      serverGenerationId?: string;
      persist?: boolean;
    },
  ) {
    const answer = nativeReport.selected.deckText;
    const rows = parseDeckRows(answer);
    const total = rows.reduce((sum, row) => sum + row.quantity, 0);
    if (total !== targetDeckSize(format)) {
      throw new Error("Native Forge produced an incomplete candidate");
    }
    const firstRevision = [
      {
        deck: answer,
        note: opts.revisionNote,
        createdAt: new Date().toISOString(),
        recommendationRecord: nativeReport.recommendationRecord || null,
      },
    ];
    setForgedDeck(answer);
    setForgeReply(opts.replyText);
    setRevisions(firstRevision);
    // A brand-new generation always has real, live Brain data — never let a
    // previously-reopened deck's restored plan identity leak into this one.
    setRestoredPlanIdentity(null);
    setNativeMasterworkContext({
      selected: nativeReport.selected,
      candidates: nativeReport.candidates,
      options: { format, strategy, target: targetDeckSize(format) },
      manaConsistency: nativeReport.manaConsistency,
      unusedEnginePartners: nativeReport.unusedEnginePartners,
      laboratory: nativeReport.laboratory || null,
      changes: nativeReport.changes || null,
      identityAliases: nativeReport.identityAliases || undefined,
      cardPool: opts.cardPool,
      generationId: opts.serverGenerationId,
      practicalTiebreak: nativeReport.practicalTiebreak || null,
      powerSignal: nativeReport.powerSignal || null,
      powerAudit: nativeReport.powerAudit || null,
      requestedPowerTier: isCommanderFormat(format) && targetPowerTier ? targetPowerTier : undefined,
      commissionNote: String(commissionNote || "").trim() || undefined,
    });
    if (opts.persist !== false) {
      void persistStoryBench(
        firstRevision,
        { wins: 0, losses: 0 },
        opts.generationId,
        { work: opts.work, commander: opts.commander, index: opts.index },
      );
    }
  }

  // The only way a pending choice ever becomes the workbench's actual
  // deck — an explicit click on one of the three real candidates already
  // sitting in pendingCandidateChoice.nativeReport.candidates. No network
  // call: every candidate was already fully built by the one generation
  // call that produced pendingCandidateChoice.
  //
  // manaConsistency, powerSignal, powerAudit, unusedEnginePartners, and
  // practicalTiebreak are all computed server-side against nativeReport
  // .selected specifically (the tournament winner), not per-candidate —
  // carrying them forward unchanged for a different, player-chosen
  // candidate would misattribute analysis of one deck to another. When
  // the player picks the recommended candidate, nothing changes. When
  // they pick an alternate, this recomputes the one field that has a
  // real, pure, client-safe equivalent (manaConsistencyReport, the same
  // function already used for post-acceptance revisions) and honestly
  // clears the rest rather than showing analysis for a deck that isn't
  // this one — the workbench's own downstream structural/consistency
  // panels already re-derive fresh from whatever deck is actually loaded.
  function landOnCompletedDecklist() {
    // Opening a deck should be immediate. In particular, do not carry a
    // forge milestone overlay (rune, crosshair, smoke, flare, or sparks)
    // across the transition into either a new or a saved Masterwork.
    // Lands on the plain decklist first — review the actual list before
    // anything else. Coaching and rival experiments are reached by an
    // explicit choice from there ("Want to conduct an experiment?" /
    // "This list is a masterwork!"), not shown by default.
    setMilestoneMotion(null);
    setActiveForgeChapter(1);
    setDeckViewMode(preferredDecklistView());
    setSiteRail("decklist");
    setSwapStationReviewed(false);
    if (coachBriefDetailsRef.current) coachBriefDetailsRef.current.open = false;
    window.scrollTo(0, 0);
    window.requestAnimationFrame(() => window.scrollTo(0, 0));
  }

  function enterMasterwork(candidateId: string) {
    if (!pendingCandidateChoice) return;
    const { nativeReport, cardPool, generationId, serverGenerationId, work, commander, persist } = pendingCandidateChoice;
    const candidates = nativeReport.candidates || [];
    const chosen = candidates.find((candidate: any) => candidate.id === candidateId) || nativeReport.selected;
    const isRecommended = chosen.id === nativeReport.selected.id;
    const reportForChosen = isRecommended
      ? nativeReport
      : {
          ...nativeReport,
          selected: chosen,
          manaConsistency: manaConsistencyReport(chosen.rows, targetDeckSize(format)),
          unusedEnginePartners: [],
          practicalTiebreak: null,
          powerSignal: null,
          powerAudit: null,
          recommendationRecord: null,
        };
    setChamber("workbench");
    landOnCompletedDecklist();
    setBenchStatus("idle");
    void applyForgeResult(reportForChosen, {
      generationId,
      work,
      commander,
      index: 0,
      replyText: isRecommended
        ? `${nativeReport.methodology}\n\n${nativeReport.selected.tournament.reason}\n${nativeReport.reasoning.summary}\n${nativeReport.laboratory.summary}${nativeReport.laboratory.verdict === "advance" ? `\nTest contract: ${nativeReport.laboratory.contract}` : ""}\nStructural read: ${nativeReport.selected.evaluation.cohesion}/100 cohesion, ${nativeReport.selected.evaluation.resilience}/100 resilience. ${nativeReport.tournament.frontier.length} of 3 candidates reached the tradeoff frontier. ${nativeReport.reasoning.boundary} ${nativeReport.laboratory.boundary}`
        : `${nativeReport.methodology}\n\nYou chose ${chosen.label} over the Forge's recommended ${nativeReport.selected.label}.\nStructural read: ${chosen.evaluation.cohesion}/100 cohesion, ${chosen.evaluation.resilience}/100 resilience.\n${chosen.boundary}`,
      revisionNote: isRecommended
        ? `Built directly for ${commander?.name || "your commander"} · ${nativeReport.selected.label}`
        : `Built directly for ${commander?.name || "your commander"} · ${chosen.label} (chosen over the recommendation)`,
      cardPool,
      serverGenerationId,
      persist,
    });
    setPendingCandidateChoice(null);
  }

  // Cloudflare Turnstile tokens are single-use server-side (guest-forge.ts's
  // validateTurnstile calls Cloudflare's siteverify, which spends the token
  // on that call alone) regardless of whether the deck-construction attempt
  // that follows it succeeds or fails. turnstileToken is only cleared on a
  // full success (below, after the response.ok check) — so a construction
  // failure for any unrelated reason (a transient Scryfall hiccup, an
  // engine edge case, anything) leaves the browser still holding that
  // now-dead token, and the widget itself never fires expired-callback for
  // this since nothing expired on its end. Left alone, "Strike the Anvil
  // Again" resends the same spent token forever, which Cloudflare correctly
  // rejects every time — surfacing "complete the human verification" on
  // every retry and permanently hiding whatever the real first failure was.
  // Call this on any guest-mode generation failure so the retry gets an
  // actual fresh token instead of repeating a doomed one.
  function resetGuestVerificationAfterFailure() {
    if (!guestMode) return;
    setTurnstileToken("");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const turnstile = (window as any).turnstile;
    if (turnstile && turnstileWidgetRef.current) turnstile.reset(turnstileWidgetRef.current);
  }

  // The actual deck-construction algorithm (forgeNativeMasterwork /
  // forgeImportedMasterwork — the tournament, every scoring weight, every
  // gate) runs server-side now, not in this bundle. This is the one call
  // site that reaches it: the browser sends commission parameters, the
  // Worker runs the real engine, and only the finished result — plus the
  // card pool itself, which is public Scryfall data, not the algorithm —
  // crosses back over the network.
  async function callForgeGenerate(payload: Record<string, unknown>): Promise<{
    nativeReport: any;
    cardPool?: any[];
    colors: string[];
    generationId?: string;
    importWarnings?: { unresolvedNames: string[]; illegalNames: string[]; unresolvedDetails?: Array<{ name: string; reasonCode: string }> };
    deckUnderstanding?: any;
    claimToken?: string;
    reviewFocusResult?: {
      focus: string;
      asked: string;
      evidence: string;
      nextStep: string;
      insufficientEvidence?: boolean;
      concise: string;
    } | null;
    preChoiceCoaching?: any;
  }> {
    if (guestMode && !turnstileToken) throw new ForgeGenerationError("Complete the human verification before striking the Forge", "HUMAN_VERIFICATION_REQUIRED");
    const response = await fetch(guestMode ? "/api/forge/guest-generate" : "/api/forge/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(guestMode ? { ...payload, turnstileToken } : payload),
    });
    // Read the body as text exactly once and only parse it as JSON when the
    // server actually says it sent JSON. A bare response.json() here throws
    // "Unexpected token '<'" on anything else (an expired-session redirect
    // to an HTML login page, a platform-level HTML error page, a proxy
    // timeout page) and that raw parse error is what the player sees
    // instead of a real diagnosis — the commission and pasted decklist
    // survive either way since neither is touched until a result comes back.
    const rawBody = await response.text();
    const isJson = (response.headers.get("content-type") || "").toLowerCase().includes("application/json");
    let data: any = null;
    if (isJson) {
      try { data = JSON.parse(rawBody); } catch { data = null; }
    }
    if (data === null) {
      console.error("Forge generate returned a non-JSON response", {
        status: response.status,
        redirected: response.redirected,
        finalUrl: response.url,
        contentType: response.headers.get("content-type"),
        bodyPreview: rawBody.slice(0, 500),
      });
      throw new ForgeGenerationError(
        response.redirected || response.status === 401
          ? "Your session needs to be refreshed. Reload the page and try again — your notes and decklist are still here."
          : "The native Forge could not complete this candidate (unexpected server response). Try again in a moment.",
        "GENERATION_FAILED",
      );
    }
    if (!response.ok) {
      throw new ForgeGenerationError(
        data?.error || "The native Forge could not complete this candidate.",
        typeof data?.code === "string" ? data.code : "GENERATION_FAILED",
        typeof data?.claimToken === "string" ? data.claimToken : undefined,
      );
    }
    if (guestMode) {
      setTurnstileToken("");
      setGuestClaimToken(data.claimToken || "");
    }
    return data;
  }

  // Academy guide handoff (?guide=cast-spells): a public, stable key —
  // never the canonical reviewFocus string itself — resolved through the
  // one small allowlist in academy-guide-entry.mjs. Runs once on mount,
  // same shape as the claim-token effect below (read the param, apply it,
  // scrub the URL via replaceState so a later reload can never reapply
  // it). Deliberately does NOT fire if this browser tab is already mid-
  // session — a stray or reloaded ?guide= must never clobber a decklist
  // or focus the player already started working with. Never auto-submits
  // or triggers generation: setting chamber/reviewFocus is exactly what
  // clicking the entrance card and a chip already does, and the player
  // can change or clear the preselected focus normally afterward.
  useEffect(() => {
    const intent = new URLSearchParams(window.location.search).get("intent");
    if (intent !== "build" && intent !== "analyze") return;
    window.history.replaceState({}, "", window.location.pathname);
    if (chamber !== "entrance" || deck.trim()) return;
    setBuildPath(intent === "build" ? "discover" : "complete");
    setChamber(intent === "build" ? "commission" : "refine");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Academy guide handoff (?guide=cast-spells): a public, stable key —
  // never the canonical reviewFocus string itself — resolved through the
  // one small allowlist in academy-guide-entry.mjs.
  useEffect(() => {
    const guideKey = new URLSearchParams(window.location.search).get("guide");
    if (!guideKey) return;
    window.history.replaceState({}, "", window.location.pathname);
    const entry = resolveAcademyGuideEntry(guideKey);
    if (!entry) return;
    if (chamber !== "entrance" || deck.trim() || reviewFocus) return;
    setChamber(entry.chamber);
    if (entry.reviewFocus) setReviewFocus(entry.reviewFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A commander guide page's "Build a deck" CTA sends a stable, public slug
  // (?commander=korvold-fae-cursed-king) — never internal engine state — so
  // this pre-selects the commander and skips straight to the strategy step,
  // the same shape as the ?guide= effect above. Same non-clobber guard: a
  // stray or reloaded param must never override a session already in
  // progress.
  useEffect(() => {
    const commanderSlug = new URLSearchParams(window.location.search).get("commander");
    if (!commanderSlug) return;
    window.history.replaceState({}, "", window.location.pathname);
    const commander = commanderOptionForSlug(commanderSlug);
    if (!commander) return;
    if (chamber !== "entrance" || deck.trim() || selectedCommander) return;
    setChamber("commission");
    setFormat("Commander");
    setSelectedCommander(commander);
    setBuildStep(2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (guestMode) return;
    const claimToken = new URLSearchParams(window.location.search).get("claim");
    if (!claimToken) return;
    let cancelled = false;
    void fetch("/api/account/claim-guest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ claimToken }),
    }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "This preview could not be restored");
      if (cancelled) return;
      setFormat(data.claimContext.format);
      setStrategy(data.claimContext.strategy);
      setPendingClaimResult(data);
      window.history.replaceState({}, "", window.location.pathname);
    }).catch((error) => {
      if (!cancelled) setForgeGenerationError(error instanceof Error ? error.message : "This preview could not be restored");
    });
    return () => { cancelled = true; };
  }, [guestMode]);

  useEffect(() => {
    if (!pendingClaimResult || format !== pendingClaimResult.claimContext.format) return;
    const claimed = pendingClaimResult;
    setPendingClaimResult(null);
    const claimedWork: Masterwork = {
      rune: "ᛞ",
      name: claimed.nativeReport.selected?.label || "Your First Deck",
      path: "Claimed Preview Deck",
      tone: "steel",
      verdict: "Your guest Forge, now saved to your account.",
    };
    const localGenerationId = crypto.randomUUID();
    setDeckId(localGenerationId);
    setRestoredWork(claimedWork);
    setSelectedWork(0);
    setChamber("workbench");
    landOnCompletedDecklist();
    void applyForgeResult(claimed.nativeReport, {
      generationId: localGenerationId,
      work: claimedWork,
      commander: null,
      index: 0,
      replyText: `${claimed.nativeReport.methodology}\n\n${claimed.nativeReport.reasoning.summary}`,
      revisionNote: "Claimed from your free Forge preview",
      cardPool: claimed.cardPool,
      serverGenerationId: claimed.generationId,
    });
  }, [pendingClaimResult, format]);

  // Skips the three-masterwork reveal entirely: a pasted decklist or a
  // commander already locked in gives the Forge one clear thing to build,
  // so there's no real ambiguity to resolve with three alternates.
  async function commitDirectForge(mode: "decklist" | "commander", seed = commissionSeed) {
    const launchStartedAt = Date.now();
    const ceremonyReady = new Promise<void>((resolve) => {
      window.setTimeout(resolve, FORGE_CEREMONY_MINIMUM_MS);
    });
    const commander = selectedCommander;
    const secondCommander = selectedSecondCommander;
    const generationId = crypto.randomUUID();
    const directWork: Masterwork = {
      rune: "ᛞ",
      name: mode === "decklist" ? "Your List, Forged" : `${commander?.name || "Your Commander"}, Forged`,
      path: mode === "decklist" ? "Adapted From Your List" : "Built For Your Commander",
      tone: "steel",
      verdict:
        mode === "decklist"
          ? "Adapted directly from the list you submitted, gaps filled to complete a legal deck."
          : "Built directly around the commander you chose, no alternates to sort through.",
    };
    setRestoredWork(directWork);
    setDeckId(generationId);
    setSelectedWork(0);
    setBenchStatus("forging");
    setForgeStartedAt(Date.now());
    setForgeElapsedSeconds(0);
    setForgeReply("");
    setForgeGenerationError("");
    setForgeGenerationFailure(null);
    setImportWarnings([]);
    setReviewFocusResult(null);
    setConsideringCards([]);
    setRemovedCards([]);
    setReplacementRecommendations([]);
    setLastCutCard("");
    setOpeningExperimentPending(false);
    setOpeningExperimentFocus("");
    setActiveForgeChapter(1);
    setDeckViewMode(preferredDecklistView());
    trackLaunchEvent("forge_started", { mode, format, budget, targetPowerTier });

    let evidence: EdhrecEvidence | null = null;
    if (!guestMode && commander && isCommanderFormat(format)) {
      try {
        const evidenceResponse = await fetch(
          `/api/forge/edhrec?commander=${encodeURIComponent(commander.name)}`,
        );
        if (evidenceResponse.ok) evidence = await evidenceResponse.json();
      } catch {
        /* Adoption evidence is optional; native construction remains available. */
      }
    }
    setEdhrecEvidence(evidence);

    try {
      const commanderInput = commander
        ? { name: commander.name, colors: commander.colors, oracleText: commander.verifiedFacts }
        : null;
      const secondCommanderInput = secondCommander
        ? { name: secondCommander.name, colors: secondCommander.colors, oracleText: secondCommander.verifiedFacts }
        : null;

      if (mode === "decklist") {
        // Deliberately omits maxCardPrice/commonsOnly/targetPowerTier:
        // forgeImportedMasterwork preserves whatever the player actually
        // pasted in (that's its whole contract — "the Forge never
        // silently substitutes its own optimization for what the player
        // submitted"), and those hard filters would silently drop an
        // over-budget or non-common card straight out of their own list
        // instead. A budget/rarity/power target is a construction-time
        // preference for cards the Forge is choosing, not a retroactive
        // filter on cards the player already chose themselves.
        // reviewFocus is a one-click coaching-intent signal, not a deck
        // characteristic, so it travels as its own validated request field
        // (worker/forge-generate.ts) rather than inside the free-text note
        // the engine scans for other signals (colorsFromNote, blueprint
        // intent) — sending it as text there risked exactly that
        // misreading. The server evaluates it against this generation's
        // own evidence and returns reviewFocusResult, rendered below.
        const { nativeReport, cardPool, generationId: newGenerationId, importWarnings, reviewFocusResult, deckUnderstanding: understanding } = await callForgeGenerate({
          mode: "imported",
          format,
          strategy,
          complexity,
          budget,
          note: `${commissionNote}\n${interventionLearning.reusableGuidance}`.trim(),
          seed: hashText(`${seed}|import|${deck.length}`),
          commander: commanderInput,
          secondCommander: secondCommanderInput,
          deck,
          evidenceCards: evidence?.cards || [],
          reviewFocus: reviewFocus || undefined,
        });
        trackLaunchEvent("forge_succeeded", { mode, format, durationMs: Date.now() - launchStartedAt });
        setImportWarnings([
          ...(importWarnings?.unresolvedNames || []).map((name) => `"${name}" could not be verified and was left out.`),
          ...(importWarnings?.illegalNames || []).map((name) => `"${name}" is not legal in ${format} and was left out.`),
        ]);
        setDeckUnderstanding(understanding || null);
        setReviewFocusResult(reviewFocusResult || null);
        setCoachingGoal(reviewFocusResult?.focus || reviewFocus || "");
        await applyForgeResult(nativeReport, {
          generationId,
          work: directWork,
          commander,
          index: 0,
          replyText: `${nativeReport.methodology}\n\n${nativeReport.reasoning.summary}\n${nativeReport.laboratory.summary}${nativeReport.laboratory.verdict === "advance" ? `\nTest contract: ${nativeReport.laboratory.contract}` : ""}\n${nativeReport.reasoning.boundary} ${nativeReport.laboratory.boundary}${reviewFocusResult ? `\n\nCoaching focus — ${reviewFocusResult.focus}:\n${reviewFocusResult.concise}` : ""}`,
          revisionNote: "Adapted directly from your submitted list",
          cardPool,
          serverGenerationId: newGenerationId,
          persist: !guestMode,
        });
        await ceremonyReady;
        setChamber("workbench");
        landOnCompletedDecklist();
      } else {
        const { nativeReport, cardPool, generationId: newGenerationId, preChoiceCoaching } = await callForgeGenerate({
          mode: "direct",
          format,
          strategy,
          complexity,
          budget,
          note: `${commissionNote}\n${interventionLearning.reusableGuidance}`.trim(),
          seed: hashText(`${seed}|commander|${commander?.name || ""}`),
          commander: commanderInput,
          secondCommander: secondCommanderInput,
          // Only meaningful when there's no commander to anchor color/pool
          // retrieval around (loadNativeForgePool only reads it in that
          // case) — a curated flagship card for the chosen format so a
          // non-Commander build still gets a targeted, identity-driven
          // pool instead of an unweighted popularity dump.
          lynchpin: commander ? undefined : previewFor(0).card,
          evidenceCards: evidence?.cards || [],
          maxCardPrice,
          commonsOnly,
          targetPowerTier: isCommanderFormat(format) ? targetPowerTier || undefined : undefined,
          playerCompass,
        });
        trackLaunchEvent("forge_succeeded", { mode, format, durationMs: Date.now() - launchStartedAt });
        // A fresh build never auto-enters a Masterwork. The one generation
        // call above already produced all three real candidates
        // (nativeReport.candidates — the same synergy/resilience/precision
        // tempers the old three-reveal ceremony promised, just computed
        // together instead of one at a time) — no second generation call
        // happens here or in enterMasterwork below. The player explicitly
        // chooses one on the masterworks screen next; nothing is applied
        // to the workbench until they do.
        setPendingCandidateChoice({
          nativeReport,
          cardPool,
          generationId,
          serverGenerationId: newGenerationId,
          work: directWork,
          commander,
          persist: !guestMode,
          preChoiceCoaching,
        });
        await ceremonyReady;
        setChamber("masterworks");
      }
    } catch (error) {
      const failure = normalizeForgeFailure(error);
      setForgedDeck("");
      trackLaunchEvent("forge_failed", { mode, format, code: failure.code, retryable: failure.retryable });
      setNativeMasterworkContext(null);
      // A Turnstile token is single-use server-side the moment it's
      // checked, spent whether or not the attempt that follows it
      // succeeds — but only reset it when a fresh one could actually
      // help. GUEST_PREVIEW_ALREADY_USED and NETWORK_RATE_LIMITED are
      // both rejections no new token changes; resetting there would
      // dress retry up as viable when it categorically isn't.
      if (failure.requiresVerification) resetGuestVerificationAfterFailure();
      setForgeGenerationFailure(failure);
      setForgeGenerationError(
        failure.retryable
          ? `${failure.message} Your notes are safe — try again when verified card data is available.`
          : failure.message,
      );
      setChamber("workbench");
    } finally {
      setBenchStatus("idle");
      setForgeStartedAt(null);
    }
  }
  function openSavedMasterwork(family: SavedFamily) {
    const restoredRevisions = restoreStoryBenchRevisions(family.revisions).map((revision: any) => ({
      deck: revision.deck,
      note: revision.note,
      createdAt: revision.createdAt,
      fingerprint: revision.fingerprint,
      recommendationRecord: revision.recommendationRecord,
    }));
    const latest = restoredRevisions.at(-1);
    setDeckId(family.id);
    setFormat(family.format);
    setStrategy(family.strategy || "Balanced midrange");
    setSelectedWork(family.selectedWork || 0);
    setSelectedCommander(family.commander || null);
    setRestoredWork({
      rune: "ᛞ",
      name: family.name,
      path: family.path || "Saved Deck",
      tone: "steel",
      verdict:
        "A saved deck, reopened with its complete testing history.",
    });
    setForgedDeck(latest?.deck || "");
    setRevisions(restoredRevisions);
    setNativeMasterworkContext(null);
    setRestoredPlanIdentity(family.planIdentity || null);
    setRecord(
      family.record || {
        wins: Number(family.revisions.at(-1)?.evidence?.wins || 0),
        losses: Number(family.revisions.at(-1)?.evidence?.losses || 0),
      },
    );
    setMatchLog(
      family.revisions.flatMap((revision) => revision.matches || []),
    );
    setForgeInterventions(Array.isArray(family.forgeInterventions) ? family.forgeInterventions : []);
    setCoachingGoal(family.playerGoal || "");
    const restoredNote = String(family.commissionNote || "").trim();
    if (restoredNote) setCommissionNote(restoredNote);
    setForgeReply("");
    setSwapFlourish(null);
    setImportWarnings([]);
    setReviewFocusResult(null);
    setBenchStatus("testing");
    setOpeningExperimentPending(false);
    setOpeningExperimentFocus("");
    landOnCompletedDecklist();
    setChamber("workbench");
  }

  async function deleteSavedMasterwork(id: string) {
    // A confirmation wasn't strictly needed when this only lived at the
    // bottom of the full Archive list, but it's about to become a single
    // click away from the always-visible bench dock too — a permanent,
    // unrecoverable delete deserves a guard once it's that easy to reach.
    const family = savedMasterworks.find((entry) => entry.id === id);
    if (
      family &&
      !window.confirm(`Delete "${family.name}" permanently? This can't be undone.`)
    ) {
      return;
    }
    if (guestMode) return;
    try {
      const response = await fetch("/api/account/deck-bench", {
        cache: "no-store",
      });
      if (!response.ok) return;
      const data = await response.json();
      const families = (data.bench?.families || []).filter(
        (family: SavedFamily) => family.id !== id,
      );
      const saved = await fetch("/api/account/deck-bench", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bench: { schemaVersion: 1, families },
          baseRevision: data.revision || 0,
        }),
      });
      if (saved.ok) setSavedMasterworks(families);
    } catch {
      /* A failed delete leaves the preserved deck untouched. */
    }
  }

  // Distinct from delete: marks a Masterwork "finished" (or returns it to
  // in-progress) without ever removing it. Reuses the archive/restore state
  // machine already implemented and tested in deck-bench.mjs.
  async function setFamilyArchived(id: string, archived: boolean) {
    if (guestMode) return;
    try {
      const response = await fetch("/api/account/deck-bench", {
        cache: "no-store",
      });
      if (!response.ok) return;
      const data = await response.json();
      const bench = updateFamily(
        { schemaVersion: 1, families: data.bench?.families || [] },
        id,
        archived ? "archive" : "restore",
      );
      const saved = await fetch("/api/account/deck-bench", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bench,
          baseRevision: data.revision || 0,
        }),
      });
      if (saved.ok) {
        setSavedMasterworks(bench.families as SavedFamily[]);
        if (archived) {
          wakeForge("grow");
          const family = (bench.families as SavedFamily[]).find(
            (item) => item.id === id,
          );
          const latest = family?.revisions?.at(-1);
          if (latest) {
            void refreshMasterworkMotif(
              id,
              latest.deckText,
              family?.commander?.name || "",
            );
          }
        }
      }
    } catch {
      /* A failed archive/restore leaves the preserved deck untouched. */
    }
  }

  // Fire-and-forget: finishing a Masterwork silently reveals its dominant
  // motif using the same Scryfall-backed read /profile's manual "inspect"
  // already does, caching the result onto the family so no page ever has to
  // redo this fetch. Always recomputes on a finish (not only when missing) —
  // a re-finished deck may have changed since it was last preserved.
  // nativeMasterworkContext can't be reused here: it's nulled out whenever a
  // saved deck is reopened, so a freshly-finished deck may not have one.
  // Best-effort — a network failure or a concurrent edit elsewhere simply
  // leaves the deck uncached until the next finish, or a manual /profile
  // inspect.
  async function refreshMasterworkMotif(
    id: string,
    deckText: string,
    commanderName: string,
  ) {
    if (guestMode) return;
    try {
      const structuralCards = await resolveDeckStructuralCards({
        deckText,
        commanderName,
      });
      const motifWeights = motifWeightsFromStructuralCards(structuralCards);
      if (!Object.keys(motifWeights).length) return;
      const response = await fetch("/api/account/deck-bench", {
        cache: "no-store",
      });
      if (!response.ok) return;
      const data = await response.json();
      const bench = setFamilyMotifWeights(
        { schemaVersion: 1, families: data.bench?.families || [] },
        id,
        motifWeights,
      );
      const saved = await fetch("/api/account/deck-bench", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bench,
          baseRevision: data.revision || 0,
        }),
      });
      if (saved.ok) setSavedMasterworks(bench.families as SavedFamily[]);
    } catch {
      /* Best-effort cache — see comment above. */
    }
  }

  function startNewForge() {
    setBenchOpen(false);
    setRestoredWork(null);
    setSelectedCommander(null);
    setCommanderQuery("");
    setCommissionNote("");
    setDeck("");
    setReviewFocus("");
    setCoachingGoal("");
    setForgeInterventions([]);
    setRecord({ wins: 0, losses: 0 });
    setMatchLog([]);
    setOpponentArchetype("Unknown / not sure");
    setRevisions([]);
    setForgedDeck("");
    setDeckId("");
    setBuildPath("discover");
    setChamber("entrance");
  }
  function openPrivateArchive() {
    setBenchOpen(false);
    setChamber("archive");
  }

  async function persistStoryBench(
    nextRevisions = revisions,
    nextRecord = record,
    idOverride = "",
    meta?: {
      work: Masterwork;
      commander: CommanderOption | null;
      index: number;
    },
    nextMatches = matchLog,
  ) {
    const activeId = idOverride || deckId || crypto.randomUUID();
    if (!deckId) setDeckId(activeId);
    const activeWork = meta?.work || chosenWork,
      // An explicit null means this deck has no confirmed commander metadata.
      // Do not replace it with a commander left over from the previous deck.
      activeCommander = meta ? meta.commander : selectedCommander,
      activeIndex = meta?.index ?? selectedWork;
    const snapshot = {
      id: activeId,
      format,
      strategy,
      selectedWork,
      forgedDeck,
      revisions: nextRevisions,
      record: nextRecord,
      updatedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(
      "metaforge.storyBench",
      JSON.stringify(snapshot),
    );
    if (guestMode) return;
    try {
      const response = await fetch("/api/account/deck-bench", {
        cache: "no-store",
      });
      if (!response.ok) return;
      const current = await response.json();
      const bench = current.bench || { schemaVersion: 1, families: [] };
      const existingFamily = (bench.families || []).find(
        (item: { id?: string }) => item.id === activeId,
      );
      // prepareStoryBenchRevisions computes comparisonToPrevious between
      // consecutive revisions that both carry a real engine
      // recommendationRecord — it never invents one for a manual refinement.
      const preparedRevisions = prepareStoryBenchRevisions(nextRevisions);
      const serializedRevisions = preparedRevisions.map((revision: any, index: number) =>
        serializeStoryBenchRevision(revision, {
          index,
          record: nextRecord,
          matches: nextMatches,
          revisionCount: nextRevisions.length,
        }),
      );
      const family = {
        id: activeId,
        name: activeWork.name,
        format,
        strategy,
        commander: activeCommander,
        selectedWork: activeIndex,
        path: activeWork.path,
        record: nextRecord,
        updatedAt: new Date().toISOString(),
        // A save must never silently un-finish a Masterwork the player
        // already marked archived from a different action.
        archived: existingFamily?.archived ?? false,
        promotedFingerprint:
          serializedRevisions.at(-1)?.fingerprint ||
          existingFamily?.promotedFingerprint ||
          "",
        playerGoal: coachingGoal || null,
        commissionNote: String(commissionNote || "").trim() || null,
        forgeInterventions,
        planIdentity:
          extractPlanIdentitySnapshot(nativeMasterworkContext?.selected, activeCommander?.name || "")
          || existingFamily?.planIdentity
          || null,
        revisions: serializedRevisions,
      };
      const families = [
        ...(bench.families || []).filter(
          (item: { id?: string }) => item.id !== activeId,
        ),
        family,
      ];
      await fetch("/api/account/deck-bench", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bench: { schemaVersion: 1, families },
          baseRevision: current.revision || 0,
        }),
      });
      setSavedMasterworks(families as SavedFamily[]);
    } catch {
      /* Browser recovery remains available if account sync is interrupted. */
    }
  }

  function beginTesting() {
    setBenchStatus("testing");
    setActiveForgeChapter(2);
    void persistStoryBench();
    window.requestAnimationFrame(() => {
      document.getElementById("forge-chapter-rail")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  async function forgeMetaBreakerExperiments() {
    if (!metaBreakerDossier || metaBreakerLoading || !deckIntegrity.passed) return;
    setMetaBreakerLoading(true);
    setMetaBreakerExperiments([]);
    try {
      const currentNames = new Set(deckRows.map((row) => cardFactKey(row.name)));
      const commanderColors = new Set([
        ...(selectedCommander?.colors || []),
        ...(selectedSecondCommander?.colors || []),
      ]);
      let candidates: Array<any> = [];
      if (isCommanderFormat(format) && edhrecEvidence?.available) {
        const names = edhrecEvidence.cards
          .filter((signal) => !currentNames.has(cardFactKey(signal.name)))
          .slice(0, 20)
          .map((signal) => signal.name);
        if (names.length) {
          const response = await fetch("https://api.scryfall.com/cards/collection", {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({ identifiers: names.map((name) => ({ name: scryfallLookupName(name) })) }),
          });
          const data = await response.json();
          candidates = data.data || [];
        }
      } else {
        const weakest = simulationDossier?.matrix.weakest?.opponent || "Midrange";
        const pressureQuery: Record<string, string> = {
          Aggro: "(o:\"gain life\" or o:\"destroy target creature\") cmc<=3",
          Control: "(o:ward or o:hexproof or o:\"can't be countered\")",
          Midrange: "(o:\"draw a card\" or o:\"exile target\")",
          Tempo: "(o:\"counter target\" or o:\"return target\") cmc<=2",
        };
        const query = `${scryfallFormatTerms(format)} ${pressureQuery[weakest] || pressureQuery.Midrange}`;
        const response = await fetch(`https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}&order=edhrec`);
        const data = await response.json();
        candidates = data.data || [];
      }
      const legal = candidates.filter((card) => {
        if (currentNames.has(cardFactKey(card.name))) return false;
        if (card.legalities?.[scryfallLegality(format)] !== "legal") return false;
        if ((format === "Brawl" || format === "Standard Brawl") && !card.games?.includes("arena")) return false;
        return !isCommanderFormat(format) || (card.color_identity || []).every((color: string) => commanderColors.has(color));
      });
      const cuts = rankExperimentCuts(deckRows, interactionGraph, {
        commanderName: chosenPreview.card,
        roleOf: (name: string) => cardRole(cardFacts[cardFactKey(name)]),
      }).slice(0, 3);
      // Scryfall's own order is popularity only — it has no idea what's
      // actually in this deck. Re-rank by how well each legal candidate
      // mechanically connects to the cards already here before taking the
      // top 3, so a one-card test proposes something that plugs into the
      // deck's existing plan rather than just whatever is broadly popular.
      const ranked = rankExperimentAdditions(legal, interactionGraph).slice(0, 3);
      const experiments = ranked.map((card, index) => {
        const evidence = edhrecEvidence?.cards.find((signal) => cardFactKey(signal.name) === cardFactKey(card.name));
        const cut = cuts[index % Math.max(1, cuts.length)]?.name || "Unresolved flex slot";
        const cutLinks = interactionGraph.edges.filter((edge) => edge.from === cut || edge.to === cut).length;
        const addLinks = experimentAdditionSynergy(card, interactionGraph);
        const oracle = String(card.oracle_text || (card.card_faces || []).map((face: any) => face.oracle_text || "").join(" "));
        const addJob = /gain life|lifelink/i.test(oracle)
          ? "help the deck recover life"
          : /destroy|exile|damage to target/i.test(oracle)
            ? "answer an opposing threat"
            : /counter target|return target/i.test(oracle)
              ? "interact earlier"
              : /draw|look at the top/i.test(oracle)
                ? "keep useful cards flowing"
                : "test a different role in the weakest matchup";
        const weakest = simulationDossier?.matrix.weakest?.opponent || "modeled matchup";
        const baseline = Math.round((simulationDossier?.matrix.weakest?.scenarioPassRate || 0) * 100);
        const connectionNote = addLinks
          ? ` ${card.name} also mechanically connects to ${addLinks} card${addLinks === 1 ? "" : "s"} already in the deck.`
          : "";
        return {
          cut,
          add: { name: card.name, typeLine: card.type_line || "Card", image: card.image_uris?.small || card.card_faces?.[0]?.image_uris?.small || cardImage(card.name) },
          reason: `${cut} has ${cutLinks} modeled deck connection${cutLinks === 1 ? "" : "s"}, making it a lower-risk card to challenge. ${card.name}'s verified text may ${addJob}.${connectionNote}`,
          expectedChange: `Keep the deck at the same size while testing whether ${card.name} improves the ${weakest} pressure point.`,
          measurement: `Rerun the same opening-hand and ${weakest} trials. Advance only if the ${baseline}% baseline improves without damaging the deck's central plan.`,
          confidence: evidence ? `${evidence.confidence} commander signal · score ${Math.round((evidence.evidenceScore || 0) * 100)}/100` : "legal card discovery · mechanical fit still requires testing",
        };
      });
      setMetaBreakerExperiments(experiments);
    } catch {
      setMetaBreakerExperiments([]);
    } finally {
      setMetaBreakerLoading(false);
    }
  }

  function applyMetaBreakerExperiment(experiment: MetaBreakerExperiment) {
    if (experiment.cut === "Unresolved flex slot") return;
    const rows = applyControlledSwap(deckRows, experiment.cut, experiment.add.name);
    if (!rows) return;
    const nextDeck = rows.map((row) => `${row.quantity} ${row.name}`).join("\n");
    recordForgeIntervention(
      "controlled one-slot experiment",
      `−1 ${experiment.cut}; +1 ${experiment.add.name}`,
      "accepted",
      revisions.length + 1,
    );
    wakeForge("grow");
    preserveDeckEdit(nextDeck, `Meta Breaker experiment: −1 ${experiment.cut}, +1 ${experiment.add.name}`);
    setMetaBreakerExperiments([]);
  }

  function recordForgeIntervention(
    kind: string,
    summary: string,
    decision: "accepted" | "dismissed",
    revision = Math.max(1, revisions.length),
  ) {
    const next = [
      ...forgeInterventions,
      {
        id: crypto.randomUUID(),
        kind,
        summary,
        decision,
        revision,
        hypothesisId: provingGrounds.hypothesisId,
        targetCategory: coachingDiagnosis.primary.category,
        targetGoal: coachingDiagnosis.playerGoal,
        targetMeasurement: coachingDiagnosis.primary.measurement,
        createdAt: new Date().toISOString(),
      },
    ];
    setForgeInterventions(next);
    window.localStorage.setItem("metaforge.interventionLearning", JSON.stringify(next.slice(-80)));
    void persistInterventionHistory(next);
  }

  async function persistInterventionHistory(next: ForgeIntervention[]) {
    if (!deckId) return;
    if (guestMode) return;
    try {
      const response = await fetch("/api/account/deck-bench", { cache: "no-store" });
      if (!response.ok) return;
      const current = await response.json();
      const families = (current.bench?.families || []).map((family: SavedFamily) =>
        family.id === deckId ? { ...family, forgeInterventions: next, playerGoal: coachingGoal || family.playerGoal || null, updatedAt: new Date().toISOString() } : family,
      );
      const saved = await fetch("/api/account/deck-bench", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bench: { schemaVersion: 1, families }, baseRevision: current.revision || 0 }),
      });
      if (saved.ok) setSavedMasterworks(families as SavedFamily[]);
    } catch {
      /* Local coaching history remains available when account sync is interrupted. */
    }
  }

  async function recordMatch(
    result: "win" | "loss" | "not-recorded",
    signal = "No single lesson isolated",
    fieldTest?: { hypothesisId?: string; question: string; outcome: string; source: string; checkIn?: { issue: string; handled: string; overall: string } },
    coachDebrief?: ReturnType<typeof createPilotingDebrief>,
  ) {
    const activeFingerprint = await deckFingerprint(parseDeckRows(forgedDeck));
    const activeRevision = Math.max(1, revisions.length);
    const fingerprintedRevisions = revisions.map((revision, index) =>
      index === activeRevision - 1
        ? { ...revision, fingerprint: activeFingerprint }
        : revision,
    );
    const next = result === "win"
      ? { ...record, wins: record.wins + 1 }
      : result === "loss"
        ? { ...record, losses: record.losses + 1 }
        : record;
    setRecord(next);
    wakeForge("grow");
    const nextMatches = [
      ...matchLog,
      {
        id: crypto.randomUUID(),
        result,
        opponent: opponentArchetype,
        signal,
        playedAt: new Date().toISOString(),
        revision: activeRevision,
        deckFingerprint: activeFingerprint,
        ...(fieldTest ? { fieldTest } : {}),
        ...(coachDebrief ? { coachDebrief } : {}),
      },
    ];
    setRevisions(fingerprintedRevisions);
    setMatchLog(nextMatches);
    setPendingMatchResult(null);
    setPendingDecisionSignal("");
    setPilotingDebrief({ window: "mulligan", role: "uncertain", knownInformation: "", chosenLine: "", alternativeLine: "", observedPunishment: "" });
    setMilestoneMotion({
      kind: "evidence-recorded",
      eyebrow: "EVIDENCE PRESERVED",
      label: result === "not-recorded" ? "TABLE QUESTION RECORDED" : `${result === "win" ? "WIN" : "LOSS"} · ${opponentArchetype}`,
      glyph: "ᛇ",
    });
    void persistStoryBench(fingerprintedRevisions, next, "", undefined, nextMatches);
  }

  function beginProvingGroundsTest() {
    const next = {
      deckId: deckId || "unsaved-masterwork",
      revision: Math.max(1, revisions.length),
      question: provingGrounds.question,
      watchFor: provingGrounds.watchFor,
      why: provingGrounds.why,
      source: provingGrounds.source,
      hypothesisId: provingGrounds.hypothesisId,
      startedAt: new Date().toISOString(),
    };
    setActiveFieldTest(next);
    setFieldTestResult(null);
    setFieldTestRead(null);
    setCoachingCheckin({ issue: null, handled: null });
    window.localStorage.setItem("metaforge.activeFieldTest", JSON.stringify(next));
    setBenchStatus("testing");
    trackLaunchEvent("experiment_started", { format, source: provingGrounds.source });
  }

  async function finishProvingGroundsTest(outcome: "observed" | "missed" | "not-tested" | "unsure", checkIn?: { issue: string; handled: string; overall: string }) {
    if (!activeFieldTest) return;
    await recordMatch(fieldTestResult || "not-recorded", "No single lesson isolated", {
      hypothesisId: activeFieldTest.hypothesisId,
      question: activeFieldTest.question,
      outcome,
      source: activeFieldTest.source,
      ...(checkIn ? { checkIn } : {}),
    });
    const read = outcome === "observed"
      ? { headline: "The test produced a supporting clue.", guidance: "Keep this revision stable and look for the same observation once more before acting on it." }
      : outcome === "missed"
        ? { headline: "The expected signal did not appear.", guidance: "That weakens the hypothesis for this game, but one miss is not enough to discard it. Repeat the same test once before changing the deck." }
        : outcome === "not-tested"
          ? { headline: "This game did not test the question.", guidance: "No conclusion is the honest conclusion. Carry the same test into the next relevant game." }
          : { headline: "The clue was not clear enough to classify.", guidance: "Keep the deck unchanged. Next game, watch only the named moment instead of diagnosing everything at once." };
    setFieldTestRead(read);
    setFieldTestResult(null);
    setCoachingCheckin({ issue: null, handled: null });
    setActiveFieldTest(null);
    window.localStorage.removeItem("metaforge.activeFieldTest");
  }

  // Accepting an experiment tablet applies the exact card-for-card swap it
  // already named directly to the deck — no free-text/LLM round-trip, since
  // the change is already fully specified and evidence-gated. A brief
  // two-stage flourish (fade the outgoing card, then materialize the
  // incoming one) makes the change visible, not just logged.
  async function applyExperimentTablet(tablet: {
    change: { cut: string; add: string };
    motif: string | null;
    expectedBenefit: string;
    tradeoff: string;
  }) {
    if (swapFlourish || !nativeMasterworkContext) return;
    // Jump to the deck-list chapter first: the cut/materialize animation
    // below writes into the actual card rows there, and that chapter is
    // display:none while the tablets chapter is active. Without this the
    // swap happens entirely off-screen.
    setActiveForgeChapter(1);
    setSwapFlourish({ cut: tablet.change.cut, add: tablet.change.add, motif: tablet.motif, stage: "out" });
    await new Promise((resolve) => window.setTimeout(resolve, 650));

    const rows = parseDeckRows(forgedDeck).map((row) => ({ ...row }));
    const cutRow = rows.find((row) => row.name === tablet.change.cut);
    if (cutRow) cutRow.quantity -= 1;
    const remaining = rows.filter((row) => row.quantity > 0);
    const addRow = remaining.find((row) => row.name === tablet.change.add);
    if (addRow) addRow.quantity += 1;
    else remaining.push({ quantity: 1, name: tablet.change.add });
    const nextDeck = remaining.map((row) => `${row.quantity} ${row.name}`).join("\n");

    const note = `Accepted evidence-led experiment: cut ${tablet.change.cut}, add ${tablet.change.add}. ${tablet.expectedBenefit} ${tablet.tradeoff}`;
    const nextRevisions = [
      ...revisions,
      { deck: nextDeck, note, createdAt: new Date().toISOString(), recommendationRecord: null },
    ];

    // Advance the tablet engine's own view of the deck too. Without this,
    // buildExperimentTablets keeps re-diffing the ORIGINAL forged deck on
    // every render, so the same three tablets (some now stale or already
    // applied) just kept reappearing after every accept.
    const knownRows = new Map<string, { roles?: string[]; cmc?: number; colorPips?: Record<string, number>; colorIdentity?: string[] }>();
    for (const row of nativeMasterworkContext.selected?.rows || []) knownRows.set(row.name, row);
    for (const candidate of nativeMasterworkContext.candidates || []) {
      for (const row of candidate.rows || []) {
        if (!knownRows.has(row.name)) knownRows.set(row.name, row);
      }
    }
    const nextSelectedRows = remaining.map((row) => {
      const known = knownRows.get(row.name);
      return {
        quantity: row.quantity,
        name: row.name,
        roles: known?.roles || [],
        cmc: known?.cmc ?? 0,
        colorPips: known?.colorPips,
        colorIdentity: known?.colorIdentity,
      };
    });
    setNativeMasterworkContext({
      ...nativeMasterworkContext,
      selected: { ...nativeMasterworkContext.selected, rows: nextSelectedRows, deckText: nextDeck },
      manaConsistency: manaConsistencyReport(nextSelectedRows, nativeMasterworkContext.options.target),
    });

    setForgedDeck(nextDeck);
    setRevisions(nextRevisions);
    setSwapFlourish({ cut: tablet.change.cut, add: tablet.change.add, motif: tablet.motif, stage: "in" });
    recordForgeIntervention(
      "evidence-led experiment",
      `−1 ${tablet.change.cut}; +1 ${tablet.change.add}`,
      "accepted",
      nextRevisions.length,
    );
    wakeForge("grow");
    void persistStoryBench(nextRevisions, record);
    window.setTimeout(() => {
      setSwapFlourish(null);
      setLastAcceptedRevisionCount(nextRevisions.length);
      setPostAcceptChoice(true);
      setMilestoneMotion({ kind: "revision-accepted", eyebrow: "THE ANVIL REMEMBERS", label: "Revision Accepted", glyph: "ᛏ" });
    }, 1800);
  }

  async function forgeMultiRefill() {
    if (!nativeMasterworkContext?.generationId || !Object.keys(refillCuts).length) return;
    setMultiRefillStatus("loading");
    setMultiRefillError("");
    setMultiRefillResult(null);
    try {
      const response = await fetch("/api/forge/multi-refill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          generationId: nativeMasterworkContext.generationId,
          currentRows: deckRows,
          cuts: Object.entries(refillCuts).map(([name, quantity]) => ({ name, quantity })),
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "The refill experiment could not complete.");
      setMultiRefillResult(data);
      setMultiRefillStatus("ready");
    } catch (error) {
      setMultiRefillError(error instanceof Error ? error.message : "The refill experiment could not complete.");
      setMultiRefillStatus("error");
    }
  }

  function applyMultiRefillPackage(refill: MultiRefillPackage) {
    if (!nativeMasterworkContext || !refill.rows?.length) return;
    const nextDeck = refill.rows.map((row) => `${row.quantity} ${row.name}`).join("\n");
    const cutSummary = Object.entries(refillCuts).map(([name, quantity]) => `−${quantity} ${name}`).join("; ");
    const addSummary = refill.additions.map((row) => `+${row.quantity} ${row.name}`).join("; ");
    const note = `Accepted multi-slot refill: ${cutSummary}; ${addSummary}. ${multiRefillResult?.boundary || "Real match performance remains unproven."}`;
    const nextRevisions = [...revisions, { deck: nextDeck, note, createdAt: new Date().toISOString(), recommendationRecord: null }];
    setNativeMasterworkContext({
      ...nativeMasterworkContext,
      selected: { ...nativeMasterworkContext.selected, rows: refill.rows, deckText: nextDeck },
      manaConsistency: manaConsistencyReport(refill.rows, nativeMasterworkContext.options.target),
    });
    setForgedDeck(nextDeck);
    setRevisions(nextRevisions);
    recordForgeIntervention("multi-slot refill", `${cutSummary}; ${addSummary}`, "accepted", nextRevisions.length);
    setRefillCuts({});
    setMultiRefillSelecting(false);
    setMultiRefillResult(null);
    setMultiRefillStatus("idle");
    setInspectedCard("");
    wakeForge("grow");
    void persistStoryBench(nextRevisions, record);
    setMilestoneMotion({ kind: "revision-accepted", eyebrow: "THE ANVIL REMEMBERS", label: `${refill.additions.reduce((sum, row) => sum + row.quantity, 0)} Slots Reforged`, glyph: "ᛏ" });
  }

  function finishCurrentMasterwork() {
    if (!deckId || currentFamilyArchived) return;
    setSealBurst(true);
    setFamilyArchived(deckId, true);
    window.setTimeout(() => setSealBurst(false), 2200);
  }

  function acceptOpeningControl(cardName: string) {
    const note = `Opening control experiment: keep ${cardName} in the first build and watch its performance before rotating the slot.`;
    const nextRevisions = [
      ...revisions,
      { deck: forgedDeck, note, createdAt: new Date().toISOString(), recommendationRecord: null },
    ];
    setRevisions(nextRevisions);
    setOpeningExperimentPending(false);
    setOpeningExperimentFocus(cardName);
    setMilestoneMotion({ kind: "experiment-chosen", eyebrow: "FIRST EXPERIMENT", label: cardName, glyph: "ᚲ" });
    setActiveForgeChapter(1);
    recordForgeIntervention("opening control experiment", `Keep ${cardName} and observe the flex slot`, "accepted", nextRevisions.length);
    void persistStoryBench(nextRevisions, record);
  }

  async function publishPublicDeckReport() {
    if (publicReportUrl && publicReportGenerationId === nativeMasterworkContext?.generationId) {
      await navigator.clipboard.writeText(publicReportUrl).catch(() => undefined);
      return;
    }
    const generationId = nativeMasterworkContext?.generationId;
    if (guestMode || !generationId) {
      setPublicReportStatus("error");
      setPublicReportError("Finish this deck while signed in before publishing a public report.");
      return;
    }
    setPublicReportStatus("publishing");
    setPublicReportError("");
    setPublicReportUrl("");
    try {
      const response = await fetch("/api/decks/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          generationId,
          title: masterworkIdentity.title || `${activeCommanderName || chosenWork.name} ${format} Deck`,
        }),
      });
      const payload = await response.json() as { url?: string; slug?: string; error?: string };
      if (!response.ok || !payload.url) throw new Error(payload.error || "The public report could not be published.");
      setPublicReportUrl(payload.url);
      setPublicReportSlug(payload.slug || "");
      setPublicReportGenerationId(generationId);
      setPublicReportStatus("ready");
      setPublicReportPromptOpen(false);
      await navigator.clipboard.writeText(payload.url).catch(() => undefined);
    } catch (error) {
      setPublicReportStatus("error");
      setPublicReportError(error instanceof Error ? error.message : "The public report could not be published.");
    }
  }

  async function unpublishPublicDeckReport() {
    if (!publicReportSlug) return;
    setPublicReportStatus("publishing");
    setPublicReportError("");
    try {
      const response = await fetch("/api/decks/publish", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: publicReportSlug }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "The public report could not be unpublished.");
      setPublicReportStatus("idle");
      setPublicReportUrl("");
      setPublicReportSlug("");
      setPublicReportGenerationId("");
    } catch (error) {
      setPublicReportStatus("error");
      setPublicReportError(error instanceof Error ? error.message : "The public report could not be unpublished.");
    }
  }

  return {
    chamber,
    setChamber,
    guestMode,
    setGuestMode,
    playerCompass,
    setPlayerCompass,
    playerCompassSynced,
    setPlayerCompassSynced,
    turnstileToken,
    setTurnstileToken,
    turnstileError,
    setTurnstileError,
    guestClaimToken,
    setGuestClaimToken,
    pendingClaimResult,
    setPendingClaimResult,
    resumeForgeAfterAuth,
    setResumeForgeAfterAuth,
    turnstileHostRef,
    turnstileWidgetRef,
    stage,
    setStage,
    buildStep,
    setBuildStep,
    buildPath,
    setBuildPath,
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
    maxCardPrice,
    readingSize,
    setReadingSize,
    motionMode,
    setMotionMode,
    forgeAction,
    setForgeAction,
    actionPulse,
    setActionPulse,
    actionPoint,
    setActionPoint,
    deck,
    setDeck,
    commissionNote,
    setCommissionNote,
    reviewFocus,
    setReviewFocus,
    commanderQuery,
    setCommanderQuery,
    commanderResults,
    setCommanderResults,
    commanderSearchOpen,
    setCommanderSearchOpen,
    commanderSearchRef,
    commanderSearchRect,
    setCommanderSearchRect,
    selectedCommander,
    setSelectedCommander,
    commanderSearching,
    setCommanderSearching,
    commanderSearchError,
    setCommanderSearchError,
    commanderSearchRetry,
    setCommanderSearchRetry,
    secondCommanderQuery,
    setSecondCommanderQuery,
    secondCommanderResults,
    setSecondCommanderResults,
    selectedSecondCommander,
    setSelectedSecondCommander,
    secondCommanderSearching,
    setSecondCommanderSearching,
    secondCommanderSearchRef,
    secondCommanderSearchRect,
    setSecondCommanderSearchRect,
    secondCommanderDropdownOpen,
    randomizingCommander,
    setRandomizingCommander,
    randomCommanderOptions,
    setRandomCommanderOptions,
    seenRandomCommanders,
    setSeenRandomCommanders,
    selectedWork,
    setSelectedWork,
    forgedDeck,
    setForgedDeck,
    forgeReply,
    setForgeReply,
    swapFlourish,
    setSwapFlourish,
    sealBurst,
    setSealBurst,
    milestoneMotion,
    setMilestoneMotion,
    postAcceptChoice,
    setPostAcceptChoice,
    lastAcceptedRevisionCount,
    setLastAcceptedRevisionCount,
    benchStatus,
    setBenchStatus,
    record,
    setRecord,
    pendingMatchResult,
    setPendingMatchResult,
    pendingDecisionSignal,
    setPendingDecisionSignal,
    pilotingDebrief,
    setPilotingDebrief,
    opponentArchetype,
    setOpponentArchetype,
    matchLog,
    setMatchLog,
    activeFieldTest,
    setActiveFieldTest,
    fieldTestResult,
    setFieldTestResult,
    fieldTestRead,
    setFieldTestRead,
    coachingCheckin,
    setCoachingCheckin,
    revisions,
    setRevisions,
    nativeMasterworkContext,
    setNativeMasterworkContext,
    publicReportStatus,
    setPublicReportStatus,
    publicReportUrl,
    setPublicReportUrl,
    publicReportError,
    setPublicReportError,
    publicReportGenerationId,
    setPublicReportGenerationId,
    publicReportSlug,
    setPublicReportSlug,
    publicReportPromptOpen,
    setPublicReportPromptOpen,
    importWarnings,
    setImportWarnings,
    deckUnderstanding,
    setDeckUnderstanding,
    reviewFocusResult,
    setReviewFocusResult,
    coachFeedbackStatus,
    setCoachFeedbackStatus,
    coachFeedbackNote,
    setCoachFeedbackNote,
    coachFeedbackPendingOption,
    setCoachFeedbackPendingOption,
    coachFeedbackTargetTablet,
    setCoachFeedbackTargetTablet,
    coachBriefViewedRef,
    coachingGoal,
    setCoachingGoal,
    cardFacts,
    setCardFacts,
    cardFactsLoading,
    setCardFactsLoading,
    cardFactsError,
    setCardFactsError,
    cardFactsPending,
    setCardFactsPending,
    cardFactsRetry,
    setCardFactsRetry,
    hoveredCard,
    setHoveredCard,
    deckHoverTimerRef,
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
    setMultiRefillError,
    multiRefillResult,
    setMultiRefillResult,
    cardOrder,
    setCardOrder,
    foilCards,
    setFoilCards,
    cheapestPrintings,
    setCheapestPrintings,
    printingOverrides,
    setPrintingOverrides,
    printingMenu,
    setPrintingMenu,
    printingOptions,
    setPrintingOptions,
    printingOptionsLoading,
    setPrintingOptionsLoading,
    tcgplayerAffiliateEnabled,
    setTcgplayerAffiliateEnabled,
    edhrecEvidence,
    setEdhrecEvidence,
    commissionSeed,
    setCommissionSeed,
    deckId,
    setDeckId,
    savedMasterworks,
    setSavedMasterworks,
    archiveFeaturedArt,
    setArchiveFeaturedArt,
    restoredPlanIdentity,
    setRestoredPlanIdentity,
    motifWeightsByFamily,
    playerIdentity,
    previousIdentityRef,
    identityCelebration,
    setIdentityCelebration,
    restoredWork,
    setRestoredWork,
    pendingCandidateChoice,
    setPendingCandidateChoice,
    benchOpen,
    setBenchOpen,
    cardSearch,
    setCardSearch,
    cardSearchResults,
    setCardSearchResults,
    consideringCards,
    setConsideringCards,
    removedCards,
    setRemovedCards,
    editAnvilOpen,
    setEditAnvilOpen,
    forgeGenerationError,
    setForgeGenerationError,
    forgeGenerationFailure,
    setForgeGenerationFailure,
    forgeStartedAt,
    setForgeStartedAt,
    forgeElapsedSeconds,
    setForgeElapsedSeconds,
    replacementRecommendations,
    setReplacementRecommendations,
    replacementLoading,
    setReplacementLoading,
    replacementError,
    setReplacementError,
    lastCutCard,
    setLastCutCard,
    metaBreakerExperiments,
    setMetaBreakerExperiments,
    metaBreakerLoading,
    setMetaBreakerLoading,
    forgeInterventions,
    setForgeInterventions,
    interventionLearningReady,
    setInterventionLearningReady,
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
    tabletopReviewActive,
    setTabletopReviewActive,
    forgeDescentRef,
    openingExperimentPending,
    setOpeningExperimentPending,
    openingExperimentFocus,
    setOpeningExperimentFocus,
    strategyBuildComparison,
    masterworksCommissionContract,
    masterworksRequestRecognition,
    openDeepForgeEvidence,
    progress,
    awaken,
    signInResumeHref,
    chapter,
    forgeState,
    wakeForge,
    captureForgeAction,
    masterworks,
    commanderFor,
    workFor,
    previewFor,
    chosenPreview,
    chosenWork,
    isImportedDeckReview,
    currentFamilyArchived,
    deckRows,
    importedOriginalRows,
    importedComparisonExperiment,
    importedProposedRows,
    importedComparisonSwaps,
    importedOriginalQuantityByName,
    importedComparisonAdjustments,
    activeCommanderName,
    displayDeckName,
    deckPurchaseLink,
    hasValidatedDeck,
    masterworkIdentityKey,
    featuredMasterworkCard,
    featuredMasterworkArt,
    masterworkFeaturedChoices,
    orderedDeckRows,
    groupedDeck,
    colorPipCounts,
    effectivePriceFact,
    deckPriceTotal,
    activeCard,
    activeFact,
    activePrinting,
    activeImage,
    activePriceUsd,
    activePurchaseLink,
    inspectedFact,
    inspectedPrinting,
    inspectedImage,
    deckIntegrity,
    activeRole,
    structuralCards,
    structuralAnalysisStatus,
    setStructuralAnalysisStatus,
    structuralAnalysisReport,
    setStructuralAnalysisReport,
    structuralReportReady,
    activeDeckFingerprint,
    boundStructural,
    activeStructuralReport,
    interactionGraph,
    forgeSystemsReport,
    activeCardReasons,
    foreignSuspectNames,
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
    activeIsCommander,
    activeOccupancyLabels,
    commissionOccupancyLabels,
    secondCommissionOccupancyLabels,
    revealOccupancyLabels,
    inspectorPurchaseLink,
    inspectedSlotReason,
    forgeFailureAnalysis,
    forgeCausalityReport,
    simulationDossier,
    experimentTablets,
    setExperimentTablets,
    experimentReportStatus,
    setExperimentReportStatus,
    honestCoachTablets,
    openingExperimentChoices,
    openingExperimentGateActive,
    masterworkVisualProfile,
    metaBreakerDossier,
    revisionLearning,
    interventionLearning,
    coachingDiagnosis,
    provingGrounds,
    coachingSession,
    persistPlayerCompass,
    partnerEligibility,
    moveCard,
    deckWithout,
    preserveDeckEdit,
    stageDeckCard,
    addCardToDeck,
    recommendReplacements,
    selectCommander,
    chooseRandomCommander,
    applyForgeResult,
    landOnCompletedDecklist,
    enterMasterwork,
    resetGuestVerificationAfterFailure,
    callForgeGenerate,
    commitDirectForge,
    openSavedMasterwork,
    deleteSavedMasterwork,
    setFamilyArchived,
    refreshMasterworkMotif,
    startNewForge,
    openPrivateArchive,
    persistStoryBench,
    beginTesting,
    forgeMetaBreakerExperiments,
    applyMetaBreakerExperiment,
    recordForgeIntervention,
    persistInterventionHistory,
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
  };
}

type ForgeSessionValue = ReturnType<typeof useForgeSessionState>;

const ForgeSessionContext = createContext<ForgeSessionValue | null>(null);

export function ForgeSessionProvider({ value, children }: { value: ForgeSessionValue; children: ReactNode }) {
  return <ForgeSessionContext.Provider value={value}>{children}</ForgeSessionContext.Provider>;
}

export function useForgeSession(): ForgeSessionValue {
  const ctx = useContext(ForgeSessionContext);
  if (!ctx) throw new Error("useForgeSession must be used within a ForgeSessionProvider");
  return ctx;
}
