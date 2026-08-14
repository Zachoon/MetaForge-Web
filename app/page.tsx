"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { displayRoleFor } from "./adaptive-recommendation.mjs";
import { REVIEW_FOCUS_OPTIONS, REVIEW_FOCUS_LABELS, toggleReviewFocus } from "./review-focus.mjs";
import { resolveAcademyGuideEntry } from "./academy-guide-entry.mjs";
import { getMetaIntelligence } from "./meta-intelligence.mjs";
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
import { manaConsistencyReport, parseNativeBlueprintIntent } from "./native-masterwork-engine.mjs";
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
import { ForgeWalkthrough, hasSeenWalkthrough } from "./forge-walkthrough";
import { prepareStoryBenchRevisions, serializeStoryBenchRevision, restoreStoryBenchRevisions } from "./story-bench-recommendation-ledger.mjs";
import { resolveMasterworkVisualProfile } from "./masterwork-visual-profile.mjs";
import { MOTIF_ICONS } from "./masterwork-motif-icons";
import { buildTcgplayerDeckLink, buildTcgplayerLink, AFFILIATE_DISCLOSURE_TEXT } from "./affiliate-links.mjs";
import { deckFingerprint } from "./deck-fingerprint.mjs";
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
import { deckDisplaySection } from "./deck-display-classification.mjs";
import {
  reasonsCardMatters,
  shouldUseContextCardInspector,
} from "./context-card-inspector.mjs";
import { ForgeCardRef, ForgeCardRefList } from "./forge-card-ref";
import { buildCommissionContract } from "./commission-contract.mjs";
import { tableMeaningFor } from "./strategic-recognition.mjs";
import { LivingWorkbench, type WorkbenchMode } from "./living-workbench";
import { Tabletop, type MatchupCardAdvice, type TabletopCard } from "./tabletop";
import { ProvingGroundsEra } from "./proving-grounds-era";
import {
  ForgeCeremonyMotion,
  ForgeProcessingLoader,
  FORGING_PHASES,
  FORGING_STAGES,
  type MotionMode,
} from "./components/forge/forge-ceremony";
import { RevisionOpinionPanel } from "./components/forge/revision-opinion";
import { PlayerCompassCard } from "./components/forge/player-compass-card";
import { PhilosophyCompare } from "./components/forge/philosophy-compare";
import { DeepForgeDossier } from "./components/forge/deep-forge-dossier";
import {
  playerCompassFromBench,
  readLocalPlayerCompass,
  withPlayerCompassOnBench,
  writeLocalPlayerCompass,
} from "./player-compass.mjs";

type Chamber =
  | "entrance"
  | "commission"
  | "refine"
  | "forging"
  | "masterworks"
  | "workbench";

type ForgeAction = "none" | "forge" | "reveal" | "select" | "refine" | "grow";
type MilestoneMotion = {
  kind: "ignition" | "masterwork-ready" | "masterwork-selected" | "experiment-chosen" | "revision-accepted" | "evidence-recorded";
  eyebrow: string;
  label: string;
  glyph: string;
} | null;

// The real request and the ceremony run concurrently. This is not a delay
// before construction: it is the minimum amount of time the transition gets
// to tell the build story before a fast result is revealed.
const FORGE_CEREMONY_MINIMUM_MS = 9_000;

type DeckPreview = { card: string; role: string; theme: string; win: string };
type DeckRow = { quantity: number; name: string };
type CardFact = {
  name: string;
  cmc?: number;
  color_identity?: string[];
  mana_cost?: string;
  oracle_text?: string;
  type_line?: string;
  set_name?: string;
  games?: string[];
  legalities?: Record<string, string>;
  image_uris?: { normal?: string; art_crop?: string };
  card_faces?: Array<{
    name?: string;
    mana_cost?: string;
    oracle_text?: string;
    type_line?: string;
    image_uris?: { normal?: string; art_crop?: string };
  }>;
  prices?: { usd?: string | null; usd_foil?: string | null };
};
type CardSearchResult = { name: string; typeLine: string; image: string };
// name/typeLine/image are display data only (a Scryfall lookup done purely
// for the card image and type line). reason/roles come directly from
// /api/forge/multi-refill's real package.context.summary and
// package.additions[0].roles — the actual legality/role-fit evidence, not
// re-derived or inferred client-side.
type ReplacementCandidate = CardSearchResult & { reason: string; roles: string[] };
type PrintingOption = {
  id: string;
  setCode: string;
  setName: string;
  collectorNumber: string;
  image: string;
  usd: string | null;
  usd_foil: string | null;
  // Bare Scryfall tcgplayer_id for this exact printing — never Scryfall's
  // own purchase_uris.tcgplayer, which carries Scryfall's affiliate
  // attribution, not MetaForge's. See app/affiliate-links.mjs.
  tcgplayerId: number | null;
};
type MetaBreakerExperiment = {
  cut: string;
  add: CardSearchResult;
  reason: string;
  confidence: string;
  expectedChange: string;
  measurement: string;
};
type ForgeIntervention = {
  id: string;
  kind: string;
  summary: string;
  decision: "accepted" | "dismissed";
  revision: number;
  createdAt: string;
  hypothesisId?: string;
  targetCategory?: string;
  targetGoal?: string | null;
  targetMeasurement?: string;
};
type MultiRefillPackage = {
  id: string;
  label: string;
  additions: DeckRow[];
  rows: any[];
  evaluation?: { score?: number; roleCoverage?: number; curveHealth?: number; cohesion?: number } | null;
  context?: {
    preservationScore: number;
    rolePreservation: number;
    systemPreservation: number;
    removedRoles: string[];
    restoredRoles: string[];
    exposedRoles: string[];
    affectedSystems: string[];
    preservedSystems: string[];
    repairedSystems: string[];
    exposedSystems: string[];
    summary: string;
  } | null;
  boundary?: string;
};
type CommanderOption = {
  name: string;
  colors: string[];
  typeLine: string;
  image: string;
  verifiedFacts: string;
};
type ForgeResumeBrief = {
  version: 1;
  format: string;
  strategy: string;
  complexity: string;
  budget: string;
  maxCardPriceInput: string;
  commonsOnly: boolean;
  targetPowerTier: string;
  commissionNote: string;
  reviewFocus: string;
  deck: string;
  commander: CommanderOption | null;
  secondCommander: CommanderOption | null;
};

function encodeForgeResumeBrief(brief: ForgeResumeBrief) {
  const bytes = new TextEncoder().encode(JSON.stringify(brief));
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodeForgeResumeBrief(value: string): ForgeResumeBrief | null {
  try {
    const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const parsed = JSON.parse(new TextDecoder().decode(bytes));
    return parsed?.version === 1 ? parsed as ForgeResumeBrief : null;
  } catch {
    return null;
  }
}
type Masterwork = {
  rune: string;
  name: string;
  path: string;
  tone: string;
  verdict: string;
};
type SavedFamily = {
  id: string;
  name: string;
  format: string;
  strategy?: string;
  commander?: CommanderOption | null;
  selectedWork?: number;
  path?: string;
  record?: { wins: number; losses: number };
  updatedAt?: string;
  // Written by persistStoryBench on every save; toggled by setFamilyArchived.
  // An archived family is a player-declared "finished" Masterwork — kept
  // visible, just visually distinct, and always reversible.
  archived?: boolean;
  promotedFingerprint?: string;
  // Written by refreshMasterworkMotif whenever a Masterwork is finished;
  // cached so identity reads (here and on /profile) never have to re-run
  // the Scryfall fetch + classification just to know the dominant motif.
  motifWeights?: Record<string, number>;
  playerGoal?: string | null;
  /** Optional commission note — Conversation Contract Stage 1 persistence. */
  commissionNote?: string | null;
  forgeInterventions?: ForgeIntervention[];
  revisions: Array<{
    deckText: string;
    note: string;
    createdAt: string;
    evidence?: { wins?: number; losses?: number };
    matches?: Array<{
      id: string;
      result: "win" | "loss" | "not-recorded";
      opponent: string;
      signal: string;
      playedAt: string;
      revision?: number;
      deckFingerprint?: string;
      fieldTest?: { hypothesisId?: string; question: string; outcome: string; source: string; checkIn?: { issue: string; handled: string; overall: string } };
      coachDebrief?: ReturnType<typeof createPilotingDebrief>;
    }>;
  }>;
};
type EdhrecSignal = {
  name: string;
  category: string;
  decks: number;
  eligibleDecks: number;
  inclusion: number;
  synergy: number;
  confidence: string;
  newCardPotential: boolean;
  reliability?: number;
  shrunkSynergy?: number;
  adoptionFloor?: number;
  evidenceScore?: number;
  evidenceClass?: string;
};
type EdhrecEvidence = {
  available: boolean;
  source?: string;
  methodology?: string;
  reason?: string;
  retrievedAt?: string;
  sourceWindowKnown?: boolean;
  cards: EdhrecSignal[];
};

const FORGE_GLOSSARY: Record<string, string> = {
  aggro: "An aggressive plan that uses efficient early threats to end the game before slower decks stabilize.",
  aggression: "How strongly this deck prioritizes early pressure and shortening the game.",
  tempo: "Gaining time and initiative by advancing your board while delaying the opponent efficiently.",
  midrange: "A flexible strategy that stabilizes early, then wins with efficient threats and sustained value.",
  control: "A reactive strategy that answers opposing threats before winning from a secure late game.",
  combo: "A plan built around cards whose interaction creates a decisive or game-winning result.",
  stax: "A resource-denial strategy that restricts what players can do, often through taxing or limiting permanents.",
  stasis: "A lock-style plan that prevents normal untapping or resource development; often associated with the card Stasis.",
  ramp: "Accelerating mana production so expensive or numerous spells can be played ahead of schedule.",
  synergy: "How strongly the cards improve one another beyond their individual value.",
  interaction: "Cards that disrupt opposing spells, permanents, combat, or game plans.",
  complexity: "The amount of sequencing, rules knowledge, and decision density expected from the pilot.",
  pressure: "Forcing opponents to answer threats quickly instead of freely developing their own plan.",
  inevitability: "The likelihood that a deck becomes favored as the game continues and resources accumulate.",
  engine: "A repeatable interaction among cards that continually produces cards, mana, tokens, or another advantage.",
  "card advantage": "Ending an exchange with access to more useful cards than the opponent.",
  azorius: "White-blue: structure, protection, flying, and controlling interaction.",
  dimir: "Blue-black: information, disruption, graveyards, and evasive threats.",
  rakdos: "Black-red: sacrifice, direct damage, aggression, and risk-for-reward value.",
  gruul: "Red-green: large creatures, combat pressure, and mana acceleration.",
  selesnya: "Green-white: creature communities, tokens, counters, and shared growth.",
  orzhov: "White-black: attrition, sacrifice, life exchange, and recursive value.",
  izzet: "Blue-red: spells, tempo, card selection, and explosive turns.",
  golgari: "Black-green: graveyard value, resilient creatures, and resource growth.",
  boros: "Red-white: coordinated combat, equipment, and proactive pressure.",
  simic: "Green-blue: ramp, card draw, counters, and compounding creature value.",
  bant: "White-blue-green: protection, growth, value creatures, and board development.",
  esper: "White-blue-black: precise interaction, artifacts, and long-game resource control.",
  grixis: "Blue-black-red: disruption, graveyard value, spells, and ruthless card advantage.",
  jund: "Black-red-green: efficient threats, removal, sacrifice, and attrition.",
  naya: "Red-green-white: creatures, tokens, combat, and wide battlefield pressure.",
  abzan: "White-black-green: resilience, counters, recursion, and incremental advantage.",
  jeskai: "Blue-red-white: noncreature spells, tempo, prowess, and flexible interaction.",
  sultai: "Black-green-blue: graveyards, ramp, card advantage, and inevitability.",
  mardu: "White-black-red: aggressive combat, tokens, sacrifice, and removal.",
  temur: "Green-blue-red: ramp, large threats, spells, and explosive tempo swings.",
};
const GLOSSARY_PATTERN = new RegExp(
  `\\b(${Object.keys(FORGE_GLOSSARY)
    .sort((a, b) => b.length - a.length)
    .map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|")})\\b`,
  "gi",
);
const GlossaryText = ({ text }: { text: string }) => (
  <>
    {text.split(GLOSSARY_PATTERN).map((part, index) => {
      const definition = FORGE_GLOSSARY[part.toLowerCase()];
      return definition ? (
        <span
          className="forge-term"
          tabIndex={0}
          aria-label={`${part}: ${definition}`}
          data-definition={definition}
          key={`${part}-${index}`}
        >
          {part}
        </span>
      ) : (
        part
      );
    })}
  </>
);

const ForgeRune = ({ motionMode }: { motionMode: MotionMode }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hoverPropertyRef = useRef<{ value: boolean } | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let disposed = false;
    let rive: {
      cleanup: () => void;
      resizeDrawingSurfaceToCanvas: () => void;
      viewModelInstance: { boolean: (name: string) => { value: boolean } | null } | null;
    } | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let hovering = false;

    const setHovering = (value: boolean) => {
      const nextValue = motionMode === "full" && value;
      if (hovering === nextValue) return;
      hovering = nextValue;
      if (hoverPropertyRef.current) hoverPropertyRef.current.value = nextValue;
    };

    const trackPointer = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect();
      const radius = Math.min(bounds.width, bounds.height) / 2;
      const centerX = bounds.left + bounds.width / 2;
      const centerY = bounds.top + bounds.height / 2;
      setHovering(Math.hypot(event.clientX - centerX, event.clientY - centerY) <= radius);
    };

    const clearHover = () => setHovering(false);

    window.addEventListener("pointermove", trackPointer, { passive: true });
    window.addEventListener("blur", clearHover);
    document.addEventListener("mouseleave", clearHover);

    void import("@rive-app/canvas").then(({ Alignment, Fit, Layout, Rive }) => {
      if (disposed) return;

      rive = new Rive({
        src: "/assets/forge/animations/metaforge-rune.riv",
        canvas,
        stateMachines: "State Machine 1",
        autoBind: true,
        autoplay: motionMode === "full",
        layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
        onLoad: () => {
          if (disposed) return;
          rive?.resizeDrawingSurfaceToCanvas();
          hoverPropertyRef.current = rive?.viewModelInstance?.boolean("isHovering") ?? null;
          setLoaded(true);
        },
      });

      resizeObserver = new ResizeObserver(() => rive?.resizeDrawingSurfaceToCanvas());
      resizeObserver.observe(canvas);
    });

    return () => {
      disposed = true;
      clearHover();
      hoverPropertyRef.current = null;
      window.removeEventListener("pointermove", trackPointer);
      window.removeEventListener("blur", clearHover);
      document.removeEventListener("mouseleave", clearHover);
      resizeObserver?.disconnect();
      rive?.cleanup();
    };
  }, [motionMode]);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="forge-rive-rune"
        aria-hidden="true"
      />
      <i className={loaded ? "rive-loaded" : undefined}>ᛟ</i>
    </>
  );
};

const ForgeConfirmationSeal = ({ motionMode }: { motionMode: MotionMode }) => {
  return (
    <div className={`forge-confirmation-seal${motionMode === "quiet" ? " is-quiet" : ""}`} aria-hidden="true">
      <span className="forge-seal-halo" />
      <span className="forge-seal-orbit" />
      <img src="/assets/forge/animations/forge-confirmation-seal.svg" alt="" />
      <span className="forge-seal-flare" />
      <span className="forge-seal-sparks"><i /><i /><i /><i /><i /><i /></span>
    </div>
  );
};

const ForgeCommissionCard = ({
  eyebrow,
  title,
  description,
  cta,
  tone,
  motionMode,
  onActivate,
}: {
  eyebrow: string;
  title: string;
  description: string;
  cta: string;
  tone: "teal" | "ember";
  motionMode: MotionMode;
  onActivate: () => void;
}) => {
  const cardRef = useRef<HTMLButtonElement>(null);
  const sheenRef = useRef<HTMLSpanElement>(null);
  const emberRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const card = cardRef.current;
    const sheen = sheenRef.current;
    const ember = emberRef.current;
    if (!card || !sheen || !ember || motionMode !== "full") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let disposed = false;
    let removeListeners: (() => void) | undefined;

    void import("gsap").then(({ gsap }) => {
      if (disposed) return;

      gsap.set(card, { transformPerspective: 850, transformOrigin: "50% 50%" });
      gsap.set(sheen, { xPercent: -85, opacity: 0 });
      gsap.set(ember, { xPercent: -50, yPercent: -50, opacity: 0 });

      const move = (event: PointerEvent) => {
        const bounds = card.getBoundingClientRect();
        const x = event.clientX - bounds.left;
        const y = event.clientY - bounds.top;
        const horizontal = x / bounds.width - 0.5;
        const vertical = y / bounds.height - 0.5;

        gsap.to(card, {
          rotationY: horizontal * 8,
          rotationX: vertical * -6,
          x: horizontal * 3,
          y: -5 + vertical * 2,
          duration: 0.28,
          ease: "power2.out",
          overwrite: "auto",
        });
        gsap.to(sheen, {
          xPercent: horizontal * 65,
          opacity: 0.72,
          duration: 0.25,
          overwrite: "auto",
        });
        gsap.to(ember, {
          x,
          y,
          opacity: 0.9,
          scale: 1,
          duration: 0.18,
          overwrite: "auto",
        });
      };

      const enter = () => {
        gsap.to(card, {
          y: -5,
          borderColor: tone === "ember" ? "#f49a45" : "#6dddf0",
          boxShadow:
            tone === "ember"
              ? "0 24px 65px #000c, inset 0 0 58px #d66f2038"
              : "0 24px 65px #000c, inset 0 0 58px #2acde02b",
          duration: 0.28,
          ease: "power2.out",
        });
      };

      const leave = () => {
        gsap.to(card, {
          rotationX: 0,
          rotationY: 0,
          x: 0,
          y: 0,
          scale: 1,
          borderColor: "#3c4743",
          boxShadow: "0 0 0 transparent, inset 0 0 0 transparent",
          duration: 0.48,
          ease: "power3.out",
          overwrite: "auto",
        });
        gsap.to(sheen, { opacity: 0, xPercent: -85, duration: 0.35, overwrite: "auto" });
        gsap.to(ember, { opacity: 0, scale: 0.35, duration: 0.3, overwrite: "auto" });
      };

      const press = () => gsap.to(card, { scale: 0.975, duration: 0.08, overwrite: "auto" });
      const release = () => gsap.to(card, { scale: 1, duration: 0.2, ease: "back.out(2)" });
      let active = false;

      const track = (event: PointerEvent) => {
        const bounds = card.getBoundingClientRect();
        const inside =
          event.clientX >= bounds.left &&
          event.clientX <= bounds.right &&
          event.clientY >= bounds.top &&
          event.clientY <= bounds.bottom;

        if (!inside) {
          if (active) {
            active = false;
            leave();
          }
          return;
        }

        if (!active) {
          active = true;
          enter();
        }
        move(event);
      };

      const clear = () => {
        if (!active) return;
        active = false;
        leave();
      };

      window.addEventListener("pointermove", track, { passive: true });
      window.addEventListener("blur", clear);
      document.addEventListener("mouseleave", clear);
      card.addEventListener("pointerdown", press);
      card.addEventListener("pointerup", release);
      card.addEventListener("pointercancel", clear);

      removeListeners = () => {
        window.removeEventListener("pointermove", track);
        window.removeEventListener("blur", clear);
        document.removeEventListener("mouseleave", clear);
        card.removeEventListener("pointerdown", press);
        card.removeEventListener("pointerup", release);
        card.removeEventListener("pointercancel", clear);
        gsap.killTweensOf([card, sheen, ember]);
      };
    });

    return () => {
      disposed = true;
      removeListeners?.();
    };
  }, [motionMode, tone]);

  return (
    <button ref={cardRef} className={`forge-commission-card ${tone}`} onClick={onActivate}>
      <span ref={sheenRef} className="forge-card-sheen" aria-hidden="true" />
      <span ref={emberRef} className="forge-card-ember" aria-hidden="true" />
      <small>{eyebrow}</small>
      <strong>{title}</strong>
      <span className="forge-card-description">{description}</span>
      <b>{cta}</b>
    </button>
  );
};

const colorIdentityName = (colors: string[]) => {
  const order = "WUBRG";
  const key = [...colors].sort((a, b) => order.indexOf(a) - order.indexOf(b)).join("");
  const names: Record<string, string> = {
    "": "Colorless",
    W: "White",
    U: "Blue",
    B: "Black",
    R: "Red",
    G: "Green",
    WU: "Azorius",
    UB: "Dimir",
    BR: "Rakdos",
    RG: "Gruul",
    WG: "Selesnya",
    WB: "Orzhov",
    UR: "Izzet",
    BG: "Golgari",
    WR: "Boros",
    UG: "Simic",
    WUG: "Bant",
    WUB: "Esper",
    UBR: "Grixis",
    BRG: "Jund",
    WRG: "Naya",
    WBG: "Abzan",
    WUR: "Jeskai",
    UBG: "Sultai",
    WBR: "Mardu",
    URG: "Temur",
  };
  return names[key] || `${key} color identity`;
};
const NOTE_COLOR_NAMES: Record<string, string[]> = {
  white: ["W"], blue: ["U"], black: ["B"], red: ["R"], green: ["G"],
  azorius: ["W", "U"], dimir: ["U", "B"], rakdos: ["B", "R"], gruul: ["R", "G"], selesnya: ["G", "W"],
  orzhov: ["W", "B"], izzet: ["U", "R"], golgari: ["B", "G"], boros: ["R", "W"], simic: ["G", "U"],
  bant: ["W", "U", "G"], esper: ["W", "U", "B"], grixis: ["U", "B", "R"], jund: ["B", "R", "G"], naya: ["R", "G", "W"],
  abzan: ["W", "B", "G"], jeskai: ["U", "R", "W"], sultai: ["B", "G", "U"], mardu: ["R", "W", "B"], temur: ["G", "U", "R"],
};
const colorsFromNote = (note = ""): string[] => {
  for (const word of note.toLowerCase().match(/[a-z]+/g) || []) {
    const colors = NOTE_COLOR_NAMES[word];
    if (colors) return colors;
  }
  return [];
};

const commanderOracleText = (commander?: CommanderOption | null) =>
  String(commander?.verifiedFacts || "")
    .split("Oracle text:\n")
    .slice(1)
    .join("Oracle text:\n")
    .trim();
type ForgeLane = "pressure" | "engine" | "inevitability";
const FORGE_LANES: ForgeLane[] = ["pressure", "engine", "inevitability"];
const commanderLaneScores = (commander: CommanderOption) => {
  const text = `${commander.typeLine} ${commanderOracleText(commander)}`;
  const count = (pattern: RegExp) => (text.match(pattern) || []).length;
  return {
    pressure:
      count(/attack|attacking|combat|haste|power|double strike|first strike|deals? damage|firebend/gi) * 3 +
      count(/creature|counter on|can(?:not|'t) block/gi),
    engine:
      count(/create|token|copy|cast|sacrifice|whenever|trigger|draw|counter on|proliferate|food|treasure/gi) * 2 +
      count(/artifact|enchantment|graveyard|exile.+play/gi),
    inevitability:
      count(/counter target|destroy|exile target|return target|tap target|opponent|each player|life|ward|prevent/gi) * 2 +
      count(/draw|graveyard|end step|upkeep/gi),
  };
};
const arrangeCommanderStarters = (candidates: CommanderOption[]) => {
  const available = [...candidates];
  return FORGE_LANES.flatMap((lane) => {
    if (!available.length) return [];
    let bestIndex = 0;
    for (let index = 1; index < available.length; index += 1)
      if (commanderLaneScores(available[index])[lane] > commanderLaneScores(available[bestIndex])[lane])
        bestIndex = index;
    return available.splice(bestIndex, 1);
  });
};
const FORMAT_PREVIEWS: Record<string, DeckPreview[]> = {
  Standard: [
    {
      card: "Emberheart Challenger",
      role: "Lynchpin · pressure engine",
      theme: "Efficient threats turn every combat step into leverage.",
      win: "Build an early lead, then convert prowess and reach into the final points.",
    },
    {
      card: "Overlord of the Hauntwoods",
      role: "Lynchpin · value engine",
      theme: "Durable threats keep mana and pressure moving together.",
      win: "Outscale fair decks with resilient bodies and compounding card quality.",
    },
    {
      card: "Stock Up",
      role: "Lynchpin · selection engine",
      theme:
        "Card selection finds the right answer for each stage of the game.",
      win: "Stabilize, exhaust opposing resources, and close behind protected threats.",
    },
  ],
  Modern: [
    {
      card: "Ragavan, Nimble Pilferer",
      role: "Lynchpin · tempo engine",
      theme: "Cheap threats create mana, information, and immediate pressure.",
      win: "Force awkward answers early, then finish through efficient disruption.",
    },
    {
      card: "Orcish Bowmasters",
      role: "Lynchpin · value engine",
      theme:
        "Flexible threats punish excess cards while controlling small creatures.",
      win: "Trade efficiently until incremental advantages become overwhelming.",
    },
    {
      card: "Counterspell",
      role: "Lynchpin · permission",
      theme: "Broad answers protect a compact, inevitable endgame.",
      win: "Deny the opponent's pivotal turn and win once their resources are thin.",
    },
  ],
  Premodern: [
    {
      card: "Goblin Lackey",
      role: "Lynchpin · deployment engine",
      theme:
        "One opening connects and turns the battlefield into an avalanche.",
      win: "Overwhelm defenses before slower engines can establish control.",
    },
    {
      card: "Survival of the Fittest",
      role: "Lynchpin · toolbox engine",
      theme: "Every creature can become the exact answer the position demands.",
      win: "Assemble an adaptable creature chain that opponents cannot trade through.",
    },
    {
      card: "Counterspell",
      role: "Lynchpin · permission",
      theme: "Efficient interaction protects a patient, resource-rich endgame.",
      win: "Neutralize the few spells that matter and take over with superior cards.",
    },
  ],
  Pioneer: [
    {
      card: "Monastery Swiftspear",
      role: "Lynchpin · pressure engine",
      theme: "Low-cost spells become both interaction and additional damage.",
      win: "Compress the game until every draw threatens lethal.",
    },
    {
      card: "Fable of the Mirror-Breaker",
      role: "Lynchpin · value engine",
      theme: "Filtering, mana, and copied threats make every stage productive.",
      win: "Accumulate flexible advantages, then copy the deck's best threat.",
    },
    {
      card: "Supreme Verdict",
      role: "Lynchpin · reset",
      theme: "Unconditional resets buy time for a powerful late game.",
      win: "Clear committed boards and close once the opponent is out of rebuilds.",
    },
  ],
  Historic: [
    {
      card: "Ragavan, Nimble Pilferer",
      role: "Lynchpin · tempo engine",
      theme: "Early pressure snowballs into mana and stolen resources.",
      win: "Stay ahead on tempo while disruption protects the attack.",
    },
    {
      card: "Jarsyl, Dark Age Scion",
      role: "Lynchpin · recursion engine",
      theme: "The graveyard turns past exchanges into future value.",
      win: "Replay efficient spells until one-for-one trades stop being fair.",
    },
    {
      card: "Mana Drain",
      role: "Lynchpin · permission",
      theme: "Premium interaction turns defense into a burst of development.",
      win: "Counter the pivotal spell and use the mana swing to seize control.",
    },
  ],
  Brawl: [
    {
      card: "Ragavan, Nimble Pilferer",
      role: "Commander · treasure tempo",
      theme:
        "A compact red raid built around cheap interaction and stolen cards.",
      win: "Connect early, compound Treasure advantages, and burn through the last defenses.",
    },
    {
      card: "Kutzil, Malamet Exemplar",
      role: "Commander · modified creatures",
      theme:
        "Counters and combat tricks turn a creature team into a draw engine.",
      win: "Grow multiple threats, deny combat tricks, and snowball every clean hit.",
    },
    {
      card: "Braids, Arisen Nightmare",
      role: "Commander · sacrifice control",
      theme:
        "Disposable permanents become cards while opponents face painful choices.",
      win: "Drain resources turn by turn until sacrifice pressure becomes inevitable.",
    },
  ],
  Commander: [
    {
      card: "Isshin, Two Heavens as One",
      role: "Commander · attack triggers",
      theme:
        "Every attack trigger fires twice, rewarding a relentless combat plan.",
      win: "Build one explosive combat step that multiplies tokens, damage, and value.",
    },
    {
      card: "Muldrotha, the Gravetide",
      role: "Commander · graveyard value",
      theme: "The graveyard acts as a second hand full of reusable permanents.",
      win: "Outlast removal, rebuild repeatedly, and lock in an overwhelming resource edge.",
    },
    {
      card: "Shorikai, Genesis Engine",
      role: "Commander · artifact control",
      theme:
        "Vehicles, tokens, and card selection support a patient control shell.",
      win: "Filter into answers, stabilize behind Pilots, then win through inevitability.",
    },
  ],
};
const cardImage = (name: string) =>
  `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}&format=image&version=normal`;
/** Square illustration crop for commander portraits — intentional, readable on mobile. */
const cardArtCrop = (name: string) =>
  `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}&format=image&version=art_crop`;
const isCommanderFormat = (format: string) =>
  ["Commander", "Brawl", "Standard Brawl"].includes(format);
// The commission chamber's own copy must never claim every format needs a
// commander — only the singleton, commander-led formats isCommanderFormat
// already recognizes actually do. Small lookups, not scattered inline
// ternaries, so every commander-vs-format string branches off the exact
// same real predicate.
const commissionHeadingFor = (format: string) =>
  isCommanderFormat(format)
    ? "Choose your commander and game plan."
    : "Choose your format and game plan.";
const buildStepLabelsFor = (format: string) =>
  isCommanderFormat(format)
    ? ["Commander", "Strategy", "Preferences"]
    : ["Format", "Strategy", "Preferences"];
const targetDeckSize = (format: string) =>
  format === "Commander" || format === "Brawl"
    ? 100
    : format === "Standard Brawl"
      ? 60
      : 60;
const scryfallLegality = (format: string) =>
  format === "Commander"
    ? "commander"
    : format === "Brawl" || format === "Standard Brawl"
      ? "brawl"
      : format.toLowerCase();
const scryfallFormatTerms = (format: string) =>
  format === "Standard Brawl"
    ? "legal:brawl legal:standard game:arena"
    : format === "Brawl"
      ? "legal:brawl game:arena"
      : `legal:${format.toLowerCase()}`;
const MASTERWORK_LANES = [
  {
    path: "Fast Start · Focused Pressure",
    tone: "ember",
    nouns: ["Vanguard", "Breakthrough", "Charge"],
    verdict: "Best for players who want to act early, keep attacking, and make opponents answer them.",
  },
  {
    path: "Theme Engine · Compounding Growth",
    tone: "rune",
    nouns: ["Engine", "Confluence", "Workshop"],
    verdict: "Best for players who enjoy combining related cards so each new piece makes the others stronger.",
  },
  {
    path: "Patient Defense · Reliable Finish",
    tone: "steel",
    nouns: ["Bastion", "Bulwark", "Long Game"],
    verdict: "Best for players who prefer to survive the early fight, protect key cards, and win once the table slows down.",
  },
] as const;
const hashText = (value: string) =>
  Array.from(value).reduce(
    (hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0,
    2166136261,
  );
const masterworkIdentityWord = (commander = "", note = "") => {
  const promise = parseNativeBlueprintIntent({ note }).tribalTypes[0];
  if (promise) return promise.charAt(0).toUpperCase() + promise.slice(1);
  const colors = colorsFromNote(note);
  if (colors.length) return colorIdentityName(colors);
  return commander.split(/[ ,/]+/)[0] || "Forge";
};
const createMasterworks = (seed: number, commander = "", note = ""): Masterwork[] => {
  const base = hashText(`${seed}-${commander}-${note}`);
  const identity = masterworkIdentityWord(commander, note);
  return Array.from({ length: 9 }, (_, index) => {
    const lane = MASTERWORK_LANES[index % MASTERWORK_LANES.length];
    const noun = lane.nouns[(Math.floor(index / 3) + base) % lane.nouns.length];
    return {
      rune: ["ᛋ", "ᛉ", "ᛟ", "ᚷ", "ᚱ", "ᛇ", "ᚾ", "ᛞ", "ᛜ"][index],
      name: `The ${identity} ${noun}`,
      path: lane.path,
      tone: lane.tone,
      verdict: lane.verdict,
    };
  });
};
const commanderOption = (card: any): CommanderOption => commanderOptionFromCard(card);
// Reads the same verifiedFacts oracle-text block already built for every
// commander to detect Partner, "Partner with <name>", and Background
// eligibility — no separate fetch needed, since the text is already on hand
// the moment a commander is chosen.
type PartnerEligibility =
  | { kind: "partner" }
  | { kind: "partner-with"; specificName: string }
  | { kind: "background" };
const partnerEligibilityFor = (
  commander: CommanderOption | null,
): PartnerEligibility | null => {
  if (!commander) return null;
  const text = commander.verifiedFacts || "";
  const specificMatch = text.match(/partner with ([^.\n]+)/i);
  if (specificMatch) return { kind: "partner-with", specificName: specificMatch[1].trim() };
  if (/\bpartner\b/i.test(text)) return { kind: "partner" };
  if (/choose a background/i.test(text)) return { kind: "background" };
  return null;
};
const formatMetaEvidence = (format: string) => {
  if (format !== "Standard") return "No verified format-wide tournament snapshot is connected for this format. Do not invent a field claim.";
  const meta = getMetaIntelligence();
  if (!meta.readyForCurrentFieldUse)
    return `STANDARD FIELD EVIDENCE CLOSED\n${meta.warning}\n${meta.recommendation}`;
  return `STANDARD FIELD EVIDENCE (${meta.current.freshness}; observed ${meta.current.provenance.observedAt}; ${meta.current.ageDays} days old)\nSample: ${meta.current.sampleSize} lists; ${(meta.current.classificationCoverage * 100).toFixed(1)}% classified; confidence ${meta.current.confidence}.\nLargest measured family: ${meta.leadingStrategy} at ${(meta.current.strategies[0].share * 100).toFixed(1)}%, a plurality rather than a majority.\n${meta.recommendation}\nDo not overfit all three candidates to one matchup: every candidate must retain a legal, coherent proactive plan against the mixed field.`;
};
const parseDeckRows = (text: string): DeckRow[] =>
  text.split(/\r?\n/).flatMap((line) => {
    const match = line
      .trim()
      .match(/^(\d+)\s+(.+?)(?:\s+\([A-Z0-9]{2,6}\)\s+\d+\w*)?$/);
    return match ? [{ quantity: Number(match[1]), name: match[2].trim() }] : [];
  });
const cardFactKey = (name: string) =>
  name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[‘’`]/g, "'")
    .replace(/\s*\/\/\s*/g, " // ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
const scryfallLookupName = (name: string) => String(name || "").split(/\s*\/\/\s*/)[0].trim();
const BASIC_LANDS: Record<string, string> = {
  W: "Plains",
  U: "Island",
  B: "Swamp",
  R: "Mountain",
  G: "Forest",
};
const BASIC_LAND_KEYS = new Set(
  [
    ...Object.values(BASIC_LANDS), "Wastes",
    "Snow-Covered Plains", "Snow-Covered Island", "Snow-Covered Swamp", "Snow-Covered Mountain", "Snow-Covered Forest",
  ].map(cardFactKey),
);
const indexCardFact = (
  target: Record<string, CardFact>,
  fact: CardFact,
  requestedName = "",
) => {
  const aliases = [
    requestedName,
    String(fact.name || ""),
    String(fact.name || "").split(" // ")[0],
    ...(fact.card_faces || []).map((face) => String(face.name || "")),
  ];
  for (const alias of aliases) if (alias) target[cardFactKey(alias)] = fact;
};
const cardFactFromNativeRow = (row: any): CardFact | null => {
  const card = row?.card;
  if (!row?.name || !card) return null;
  return {
    name: String(card.name || row.name),
    cmc: Number(card.cmc ?? row.cmc ?? 0),
    color_identity: Array.isArray(card.colorIdentity) ? card.colorIdentity : card.color_identity || [],
    mana_cost: String(card.manaCost || card.mana_cost || ""),
    oracle_text: String(card.oracleText || card.oracle_text || ""),
    type_line: String(card.typeLine || card.type_line || ""),
    ...(Number.isFinite(Number(card.priceUsd)) ? { prices: { usd: String(card.priceUsd) } } : {}),
  };
};
const cardGroup = (fact?: CardFact, isCommander = false) =>
  // Founder #017: primary (front) face drives display sections — not joined
  // Oracle faces. Analysis still uses full type lines elsewhere.
  deckDisplaySection(fact || {}, isCommander);
// Reads whichever price the player actually wants — foil or nonfoil — and
// falls back to the other printing's price only when the requested one
// doesn't exist at all (foil-only promos have no usd price; some older or
// bulk commons have no usd_foil price). Basics and other truly priceless
// cards correctly return null, not 0 — a real $0.00 card and "no price
// data yet" are different things.
const cardPriceUsd = (fact?: CardFact, foil = false): number | null => {
  const preferred = foil ? fact?.prices?.usd_foil : fact?.prices?.usd;
  const fallback = foil ? fact?.prices?.usd : fact?.prices?.usd_foil;
  const raw = preferred ?? fallback;
  const value = Number(raw);
  return raw != null && Number.isFinite(value) ? value : null;
};
// The cheaper of this same printing's nonfoil/foil prices — a lightweight
// "budget bling" reading that reuses prices already on hand, distinct from
// searching every printing a card has ever had (a separate, heavier feature).
const cheapestCardPriceUsd = (fact?: CardFact): number | null => {
  const candidates = [fact?.prices?.usd, fact?.prices?.usd_foil]
    .map((raw) => (raw != null ? Number(raw) : null))
    .filter((value): value is number => value !== null && Number.isFinite(value));
  return candidates.length ? Math.min(...candidates) : null;
};
// displayRoleFor lives in adaptive-recommendation.mjs alongside the
// server-side simulation role vocabulary it's the display counterpart
// of, so the two stay derived from one place instead of drifting. It
// already reads both typeLine/type_line and oracleText/oracle_text, so
// a raw Scryfall-shaped CardFact passes through directly.
const cardRole = (fact?: CardFact) => displayRoleFor(fact);
const BASIC_CARD_NAMES = new Set(["plains", "island", "swamp", "mountain", "forest", "wastes"]);

type ReadingSize = "compact" | "comfortable" | "large";

const BLUEPRINT_DEFINITIONS = {
  format: {
    Standard: "A rotating 60-card format using recent Magic sets.",
    Brawl: "A 100-card singleton Arena format led by a commander.",
    "Standard Brawl": "A rotating 60-card singleton format led by a commander.",
    Commander: "A 100-card singleton multiplayer format led by a legendary commander.",
    Modern: "A nonrotating 60-card format using cards from Eighth Edition forward.",
    Premodern: "A community format using Fourth Edition through Scourge-era cards.",
    Pioneer: "A nonrotating 60-card format using Return to Ravnica forward.",
    Historic: "A broad, nonrotating digital format played on MTG Arena.",
  },
  strategy: {
    "Aggressive pressure": "Deploy threats quickly and shorten the game before slower plans stabilize.",
    "Balanced midrange": "Blend efficient threats, interaction, and staying power so the deck can adapt.",
    "Reactive control": "Trade resources, answer key threats, and win after taking control of the game.",
    "Synergy and combo": "Assemble cards whose combined effect is substantially stronger than each card alone.",
    "Tempo and disruption": "Advance an efficient threat while delaying the opponent just long enough to win.",
  },
  complexity: {
    Accessible: "Favor clear play patterns, forgiving sequencing, and fewer hidden dependencies.",
    Balanced: "Allow meaningful decisions without making every turn mechanically demanding.",
    Technical: "Welcome precise sequencing, layered interactions, and more matchup-dependent choices.",
    "Maximum depth": "Prioritize intricate lines and high decision density, even when they require more practice.",
  },
  budget: {
    "No strict limit": "Choose the strongest fitting cards without a price ceiling.",
    "Budget conscious": "Prefer affordable substitutes while preserving the deck's central promise.",
    "Moderate investment": "Allow selective premium cards when they materially improve the deck.",
    "Competitive optimization": "Prioritize performance and consistency over card cost.",
  },
  targetPowerTier: {
    "": "Let structure and strategy decide, with no power-level pressure either way.",
    Casual: "Lean away from fast mana, unrestricted tutors, extra turns, and mass land denial.",
    Focused: "Allow a modest amount of real power signals — a build with teeth, not a stax or combo-first list.",
    "High-Power": "Lean toward fast mana, tutors, and extra turns where they otherwise fit.",
    Maximum: "Actively seek fast mana, unrestricted tutors, extra turns, and mass land denial wherever legal.",
  },
} as const;

const blueprintDefinition = (
  category: keyof typeof BLUEPRINT_DEFINITIONS,
  value: string,
) => (BLUEPRINT_DEFINITIONS[category] as Record<string, string>)[value] || "The Forge will explain this choice as its card pool and rules are verified.";

// A production walkthrough proved that three genuinely different failure
// classes — an expired Turnstile token, the network anti-abuse limiter,
// and a truly incomplete generation — used to collapse into one
// indistinguishable "Forge failed" screen, because every guest-forge
// failure was caught in one place and rendered from a single message
// string. That's why "the engine didn't build anything" felt impossible
// to kill: most of those reports were never construction failures at
// all. callForgeGenerate now throws a ForgeGenerationError carrying the
// server's machine-readable code; normalizeForgeFailure maps every known
// code to how the UI must treat it, once, here — never re-derive this by
// comparing message strings at a render site.
type GuestForgeErrorCode =
  | "GUEST_PREVIEW_ALREADY_USED"
  | "NETWORK_RATE_LIMITED"
  | "HUMAN_VERIFICATION_REQUIRED"
  | "INCOMPLETE_GENERATION"
  | "CATALOG_UNAVAILABLE"
  | "GENERATION_FAILED";

class ForgeGenerationError extends Error {
  code?: string;
  claimToken?: string;
  constructor(message: string, code?: string, claimToken?: string) {
    super(message);
    this.code = code;
    this.claimToken = claimToken;
  }
}

type NormalizedForgeFailure = {
  code: GuestForgeErrorCode | "UNKNOWN";
  message: string;
  claimToken?: string;
  // Whether "Strike the Anvil Again" may ever work against this exact
  // failure. GUEST_PREVIEW_ALREADY_USED and NETWORK_RATE_LIMITED are both
  // permanent-for-now rejections under the same guest identity/network —
  // no fresh Turnstile token changes that, so retry must not be offered.
  retryable: boolean;
  // Whether this specific response means the guest's one free preview
  // was actually spent. Only GUEST_PREVIEW_ALREADY_USED may ever say so —
  // every other code, including the network limiter, must say the
  // opposite plainly.
  previewConsumed: boolean;
  // Whether a fresh Turnstile challenge is the correct next step. False
  // for both non-retryable codes (retrying can't work regardless of
  // verification) and true for every retryable one (a Turnstile token is
  // single-use server-side the moment it's checked, spent whether or not
  // the attempt that follows succeeds).
  requiresVerification: boolean;
};

const GUEST_FORGE_ERROR_META: Record<GuestForgeErrorCode, Omit<NormalizedForgeFailure, "code" | "message" | "claimToken">> = {
  GUEST_PREVIEW_ALREADY_USED: { retryable: false, previewConsumed: true, requiresVerification: false },
  NETWORK_RATE_LIMITED: { retryable: false, previewConsumed: false, requiresVerification: false },
  HUMAN_VERIFICATION_REQUIRED: { retryable: true, previewConsumed: false, requiresVerification: true },
  INCOMPLETE_GENERATION: { retryable: true, previewConsumed: false, requiresVerification: true },
  CATALOG_UNAVAILABLE: { retryable: true, previewConsumed: false, requiresVerification: true },
  GENERATION_FAILED: { retryable: true, previewConsumed: false, requiresVerification: true },
};

function normalizeForgeFailure(error: unknown): NormalizedForgeFailure {
  const message = error instanceof Error ? error.message : "The native Forge could not complete this candidate.";
  const rawCode = error instanceof ForgeGenerationError ? error.code : undefined;
  const code: GuestForgeErrorCode | "UNKNOWN" =
    rawCode && Object.prototype.hasOwnProperty.call(GUEST_FORGE_ERROR_META, rawCode) ? (rawCode as GuestForgeErrorCode) : "UNKNOWN";
  const claimToken = error instanceof ForgeGenerationError ? error.claimToken : undefined;
  // An unrecognized/missing code (an older deploy, a network-level error
  // never touched by this contract) defaults to the same treatment as
  // GENERATION_FAILED — retryable, preview preserved — never to "already
  // used," since that is the one claim this function must never guess at.
  const meta = code === "UNKNOWN" ? GUEST_FORGE_ERROR_META.GENERATION_FAILED : GUEST_FORGE_ERROR_META[code];
  return { code, message, claimToken, ...meta };
}


export default function Home() {
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
  // Auto-opens once per browser (localStorage-gated) for a first-time
  // visitor landing on the entrance screen; always replayable via the
  // header's tour button regardless of that flag.
  const [walkthroughActive, setWalkthroughActive] = useState(false);
  useEffect(() => {
    if (!hasSeenWalkthrough()) setWalkthroughActive(true);
  }, []);
  const [stage, setStage] = useState(0);
  const [buildStep, setBuildStep] = useState<0 | 1 | 2>(0);
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
  } | null>(null);
  useLayoutEffect(() => {
    if (!commanderSearchOpen) return;
    const updateRect = () => {
      const el = commanderSearchRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setCommanderSearchRect({
        top: rect.bottom + 5,
        left: rect.left,
        width: rect.width,
      });
    };
    updateRect();
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);
    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
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
  } | null>(null);
  const secondCommanderDropdownOpen =
    secondCommanderSearching || secondCommanderResults.length > 0;
  useLayoutEffect(() => {
    if (!secondCommanderDropdownOpen) return;
    const updateRect = () => {
      const el = secondCommanderSearchRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setSecondCommanderSearchRect({
        top: rect.bottom + 5,
        left: rect.left,
        width: rect.width,
      });
    };
    updateRect();
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);
    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
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
  const [coachWhyOpen, setCoachWhyOpen] = useState(false);
  const [coachConfidenceOpen, setCoachConfidenceOpen] = useState(false);
  const coachBriefViewedRef = useRef(false);
  const [coachingGoal, setCoachingGoal] = useState("");
  const [cardFacts, setCardFacts] = useState<Record<string, CardFact>>({});
  const [cardFactsLoading, setCardFactsLoading] = useState(false);
  const [cardFactsError, setCardFactsError] = useState("");
  const [cardFactsPending, setCardFactsPending] = useState(0);
  const [cardFactsRetry, setCardFactsRetry] = useState(0);
  const [hoveredCard, setHoveredCard] = useState("");
  const [contextInspectCard, setContextInspectCard] = useState("");
  const [matchupCardAdvice, setMatchupCardAdvice] = useState<MatchupCardAdvice | null>(null);
  const [deckPreviewInView, setDeckPreviewInView] = useState(true);
  const contextInspectDismissedRef = useRef("");
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
  const [selectedSystemId, setSelectedSystemId] = useState("");
  const [intelligenceOpen, setIntelligenceOpen] = useState(false);
  const [forgeInterventions, setForgeInterventions] = useState<ForgeIntervention[]>([]);
  const [interventionLearningReady, setInterventionLearningReady] = useState(false);
  const [showAllSystems, setShowAllSystems] = useState(false);
  const [matchEvidenceOpen, setMatchEvidenceOpen] = useState(false);
  const [activeForgeChapter, setActiveForgeChapter] = useState<1 | 2 | 5>(1);
  const [deckViewMode, setDeckViewMode] = useState<"workbench" | "ledger">("workbench");
  const [openingExperimentPending, setOpeningExperimentPending] = useState(false);
  const [openingExperimentFocus, setOpeningExperimentFocus] = useState("");

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

  const previousChamberRef = useRef<Chamber>(chamber);
  useEffect(() => {
    const previous = previousChamberRef.current;
    previousChamberRef.current = chamber;
    if (previous === "forging" && chamber === "masterworks") {
      // The gate-filtering audit (native-masterwork-engine.mjs) confirmed
      // candidates can honestly survive as 1 or 2, not just 3 — this must
      // never claim "three" when fewer construction attempts passed their
      // own gate, or it's promising a choice that isn't actually there.
      const survivorCount = pendingCandidateChoice?.nativeReport?.candidates?.length || 1;
      setMilestoneMotion({
        kind: "masterwork-ready",
        eyebrow: "THE GREAT FORGE ANSWERS",
        label: survivorCount === 1 ? "Your experience is ready" : `${survivorCount} experiences survived`,
        glyph: "ᛞ",
      });
    }
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
    setIntelligenceOpen(true);
    window.requestAnimationFrame(() =>
      document
        .querySelector(".forge-intelligence-vault")
        ?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
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
        ".entrance-copy, .entrance-visual, .masterwork-history, .commission-panel, .forging-ceremony > *, .masterwork-reveal > header, .masterwork-reveal > section, .masterwork-reveal > div",
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
    setMilestoneMotion({ kind: "ignition", eyebrow: "BLUEPRINT SEALED", label: "Awakening the Great Forge", glyph: "ᚠ" });
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
    chamber === "entrance"
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
          : chamber === "entrance"
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
          role: "Commander · chosen in your Blueprint",
          theme:
            commissionNote.trim() ||
            `A ${commander.colors.join("")} identity commission built around this commander.`,
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
      const commanderRows = orderedDeckRows.filter(isCommanderRow);
      const mainDeckRows = orderedDeckRows.filter((row) => !isCommanderRow(row));
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
    return groups;
  }, [orderedDeckRows, cardFacts, cardFactsLoading, cardFactsError, format, activeCommanderName, selectedSecondCommander?.name]);
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
  const activeCard =
    hoveredCard || activeCommanderName || deckRows[0]?.name || "";
  const activeFact = cardFacts[cardFactKey(activeCard)];
  const activePrinting = printingOverrides[cardFactKey(activeCard)];
  const activeImage =
    activePrinting?.image ||
    activeFact?.image_uris?.normal ||
    activeFact?.card_faces?.[0]?.image_uris?.normal ||
    (activeCard ? cardImage(activeCard) : "");
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

  const showContextCardInspector =
    Boolean(contextInspectCard) &&
    shouldUseContextCardInspector({
      previewInView: deckPreviewInView,
      activeForgeChapter,
    });
  const contextCardReasons = useMemo(
    () => reasonsCardMatters(contextInspectCard || hoveredCard, forgeSystemsReport),
    [contextInspectCard, hoveredCard, forgeSystemsReport],
  );
  const contextInspectFact = cardFacts[cardFactKey(contextInspectCard)];
  const contextInspectPrinting = printingOverrides[cardFactKey(contextInspectCard)];
  const contextInspectImage =
    contextInspectPrinting?.image ||
    contextInspectFact?.image_uris?.normal ||
    contextInspectFact?.card_faces?.[0]?.image_uris?.normal ||
    (contextInspectCard ? cardImage(contextInspectCard) : "");

  useEffect(() => {
    if (typeof window === "undefined" || !hasValidatedDeck) {
      setDeckPreviewInView(true);
      return;
    }
    const stage = document.querySelector(".card-preview-stage");
    if (!stage) {
      setDeckPreviewInView(false);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setDeckPreviewInView(Boolean(entry?.isIntersecting)),
      { threshold: 0.18, rootMargin: "-48px 0px 0px 0px" },
    );
    observer.observe(stage);
    return () => observer.disconnect();
  }, [hasValidatedDeck, deckViewMode, activeForgeChapter, forgedDeck]);

  useEffect(() => {
    if (deckPreviewInView && activeForgeChapter === 1) {
      setContextInspectCard("");
    }
  }, [deckPreviewInView, activeForgeChapter]);

  useEffect(() => {
    if (!hoveredCard) return;
    if (contextInspectDismissedRef.current === hoveredCard) return;
    if (
      !shouldUseContextCardInspector({
        previewInView: deckPreviewInView,
        activeForgeChapter,
      })
    ) {
      return;
    }
    // Also reopen when the gallery scrolls away with a live selection —
    // Founder #021: never leave the reader staring at an off-screen pane.
    setContextInspectCard(hoveredCard);
  }, [hoveredCard, deckPreviewInView, activeForgeChapter]);

  useEffect(() => {
    if (hoveredCard && hoveredCard !== contextInspectDismissedRef.current) {
      contextInspectDismissedRef.current = "";
    }
  }, [hoveredCard]);

  const closeContextCardInspector = () => {
    contextInspectDismissedRef.current = contextInspectCard;
    setContextInspectCard("");
  };

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

  const activeSystem = useMemo(
    () =>
      forgeSystemsReport.systems.find(
        (system) => system.id === selectedSystemId,
      ) || null,
    [forgeSystemsReport.systems, selectedSystemId],
  );
  const visibleForgeSystems = useMemo(() => {
    if (showAllSystems) return forgeSystemsReport.systems;
    const strongest = forgeSystemsReport.systems.slice(0, 3);
    if (activeSystem && !strongest.some((system) => system.id === activeSystem.id)) {
      return [activeSystem, ...strongest.slice(0, 2)];
    }
    return strongest;
  }, [activeSystem, forgeSystemsReport.systems, showAllSystems]);

  const focusedInteractionGraph = useMemo(() => {
    if (!activeSystem) {
      return {
        packages: interactionGraph.packages,
        edges: interactionGraph.edges,
        nonbos: interactionGraph.nonbos,
        amplifiers: interactionGraph.amplifiers,
        isolated: interactionGraph.isolated,
      };
    }

    const members = new Set(activeSystem.members);

    return {
      packages: interactionGraph.packages.filter((group) =>
        group.members.some((name) => members.has(name)),
      ),
      edges: interactionGraph.edges.filter(
        (edge) => members.has(edge.from) || members.has(edge.to),
      ),
      nonbos: interactionGraph.nonbos.filter(
        (conflict) =>
          members.has(conflict.source) ||
          ("target" in conflict &&
            typeof conflict.target === "string" &&
            members.has(conflict.target)),
      ),
      amplifiers: interactionGraph.amplifiers.filter(
        (amplifier) =>
          members.has(amplifier.source) ||
          amplifier.amplifies.some((name) => members.has(name)),
      ),
      isolated: interactionGraph.isolated.filter((name) =>
        members.has(name),
      ),
    };
  }, [activeSystem, interactionGraph]);

  useEffect(() => {
    if (
      selectedSystemId &&
      !forgeSystemsReport.systems.some(
        (system) => system.id === selectedSystemId,
      )
    ) {
      setSelectedSystemId("");
    }
  }, [forgeSystemsReport.systems, selectedSystemId]);

  const inspectSystem = (systemId: string, firstCard = "") => {
    setSelectedSystemId(systemId);

    if (firstCard) {
      setHoveredCard(firstCard);
    }

    window.requestAnimationFrame(() => {
      document
        .getElementById("interaction-graph-dossier")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
    });
  };

  const activeGraphEdges = interactionGraph.edges
    .filter((edge) => edge.from === activeCard || edge.to === activeCard)
    .slice(0, 2);
  const activeSlotReason =
    activeRole === "Mana source"
      ? "Supports the deck's colored-mana and land-count requirements."
      : activeRole === "Interaction" || activeRole === "Board reset"
        ? "Protects the Masterwork's plan by answering opposing development."
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
  const inspectedConnections = inspectedCard
    ? interactionGraph.edges.filter(
        (edge) => edge.from === inspectedCard || edge.to === inspectedCard,
      )
    : [];
  const inspectedSystems = inspectedCard
    ? forgeSystemsReport.systems.filter((system) =>
        system.members.includes(inspectedCard),
      )
    : [];
  const inspectedEvaluation = inspectedCard
    ? activeStructuralReport.cardEvaluations.cards.find(
        (evaluation) => cardFactKey(evaluation.name) === cardFactKey(inspectedCard),
      ) || null
    : null;
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
        ? "Protects the Masterwork's plan by answering opposing development."
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

  const activeCausalitySystem = useMemo(
    () =>
      forgeCausalityReport.systems.find(
        (system) => system.id === activeSystem?.id,
      ) || forgeCausalityReport.mostFragileSystem || null,
    [forgeCausalityReport, activeSystem],
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
  }, []);

  async function persistPlayerCompass(nextCompass: ReturnType<typeof readLocalPlayerCompass>) {
    const saved = writeLocalPlayerCompass(nextCompass);
    setPlayerCompass(saved);
    setPlayerCompassSynced(false);
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
    const timer = window.setTimeout(async () => {
      setCommanderSearching(true);
      setCommanderSearchError("");
      try {
        const response = await fetch(
          `/api/cards/commanders?format=${encodeURIComponent(format)}&q=${encodeURIComponent(commanderQuery.trim())}`,
        );
        if (!response.ok) throw new Error("Commander search unavailable");
        const data = await response.json();
        setCommanderResults((data.cards || []).slice(0, 8).map(commanderOption));
      } catch {
        setCommanderResults([]);
        setCommanderSearchError("The commander index is temporarily unavailable. Your search is preserved—try again in a moment.");
      } finally {
        setCommanderSearching(false);
      }
    }, 320);
    return () => window.clearTimeout(timer);
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
          mapCard: commanderOption,
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
        if (!cancelled) setSecondCommanderResults([commanderOption(card)]);
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
        setSecondCommanderResults((data.data || []).slice(0, 8).map(commanderOption));
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
        const option = commanderOption(await response.json());
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
    setNativeMasterworkContext({
      selected: nativeReport.selected,
      candidates: nativeReport.candidates,
      options: { format, strategy, target: targetDeckSize(format) },
      manaConsistency: nativeReport.manaConsistency,
      unusedEnginePartners: nativeReport.unusedEnginePartners,
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
          ? "Your session needs to be refreshed. Reload the page and try again — your commission and decklist are still here."
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
      name: claimed.nativeReport.selected?.label || "Your First Masterwork",
      path: "Claimed Preview Masterwork",
      tone: "steel",
      verdict: "Your guest Forge, now preserved in your account.",
    };
    const localGenerationId = crypto.randomUUID();
    setDeckId(localGenerationId);
    setRestoredWork(claimedWork);
    setSelectedWork(0);
    setChamber("workbench");
    setActiveForgeChapter(1);
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
    setDeckViewMode("workbench");
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
          ? `${failure.message} Your commission is safe—strike the anvil again when verified card data is available.`
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
      path: family.path || "Preserved Masterwork",
      tone: "steel",
      verdict:
        "A preserved commission, reopened with its complete testing history.",
    });
    setForgedDeck(latest?.deck || "");
    setRevisions(restoredRevisions);
    setNativeMasterworkContext(null);
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
    setMilestoneMotion({ kind: "masterwork-selected", eyebrow: "MASTERWORK REOPENED", label: family.name, glyph: "ᛞ" });
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
    setChamber("commission");
  }
  function showFullArchive() {
    setBenchOpen(false);
    setChamber("entrance");
    window.setTimeout(
      () =>
        document
          .querySelector(".masterwork-history")
          ?.scrollIntoView({ behavior: "smooth", block: "start" }),
      80,
    );
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

  return (
    <main
      className={`great-forge chamber-${chamber} reading-${readingSize}`}
      data-forge-state={forgeState}
      data-forge-stage={chamber === "forging" ? stage + 1 : undefined}
      data-motion={motionMode}
      data-guest-mode={guestMode ? "true" : "false"}
      data-forge-action={forgeAction}
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
          className={`guest-forge-pass${turnstileToken ? " verified" : ""}${walkthroughActive ? " tour-hidden" : ""}`}
          aria-label="Free Forge preview verification"
        >
          <div>
            <small>ONE FREE FORGE · NO ACCOUNT REQUIRED</small>
            <b>{turnstileToken ? "The Forge is ready for you." : "Confirm you’re human, then build your Blueprint."}</b>
            {turnstileError ? <p className="guest-turnstile-error" role="alert">{turnstileError}</p> : null}
          </div>
          <div
            className={`turnstile-host${turnstileToken ? " verified" : ""}`}
            ref={turnstileHostRef}
          />
        </aside>
      )}
      {guestMode && forgedDeck && guestClaimToken && chamber !== "workbench" && (
        <aside className="guest-result-gate" role="region" aria-label="Save this Masterwork">
          <div>
            <small>YOUR PREVIEW MASTERWORK IS READY</small>
            <b>Create your free account to save it, edit cards, run experiments, and record matches.</b>
          </div>
          <a onClick={() => trackLaunchEvent("save_continue_clicked", { format })} href={`https://app.metaforge.gg/?claim=${encodeURIComponent(guestClaimToken)}`}>Save and continue →</a>
        </aside>
      )}
      <div className="forge-motion-layer" aria-hidden="true" key={`${chamber}-${stage}-${actionPulse}`}>
        <div className="forge-heat-haze" />
        <div className="forge-ash-field">
          {Array.from({ length: 14 }, (_, index) => <i key={index} />)}
        </div>
        <div className="forge-rune-current">
          <i>ᛟ</i><i>ᚱ</i><i>ᛞ</i><i>ᚷ</i><i>ᛏ</i><i>ᚲ</i>
        </div>
        <div className="forge-energy-rails"><i /><i /><i /></div>
        <div className="forge-impact-wave" />
        <div className="forge-action-burst">
          <i /><i /><i /><i /><i /><i /><b />
        </div>
        <div className="forge-vignette" />
      </div>
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
        <details className="forge-menu">
          <summary>Menu</summary>
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
            <button type="button" onClick={() => setWalkthroughActive(true)}>Replay guided tour</button>
            <IdentityBadge depth={playerIdentity.depth} totalMilestones={playerIdentity.allMilestones.length} dominantMotif={playerIdentity.dominantMotif} accent={playerIdentity.accent} celebrating={Boolean(identityCelebration)} celebrationLabel={identityCelebration?.label ?? null} />
            <button type="button" onClick={() => setChamber("entrance")}>Start a new deck</button>
            <nav aria-label="Learn, legal, and support"><a href="/academy">Academy</a><a href="/terms">Terms</a><a href="/privacy">Privacy</a><a href="mailto:support@metaforge.gg">Support</a></nav>
          </div>
        </details>
      </header>

      <ForgeWalkthrough
        active={walkthroughActive}
        chamber={chamber}
        setChamber={setChamber}
        onClose={() => setWalkthroughActive(false)}
      />

      {chamber === "entrance" && (
        <section className="forge-entrance">
          <div className="entrance-copy">
            <span className="forge-eyebrow">
              <i /> MAGIC: THE GATHERING · DECK COACH
            </span>
            <h1>
              Understand your deck.
              <br />
              <em>Build with confidence.</em>
            </h1>
            <p>
              Choose your format and game plan. MetaForge explains how your
              deck works, shows what to improve, and helps you make
              confident changes.
            </p>
            <div className="entrance-actions">
              <ForgeCommissionCard
                eyebrow="START HERE"
                title="Build a deck"
                description="Choose a format and strategy. Shape a deck around a real game plan."
                cta="Build my deck →"
                tone="ember"
                motionMode={motionMode}
                onActivate={() => {
                  // A blank commission must actually be blank — a decklist
                  // pasted in an earlier refinement session should never
                  // silently carry over and skip the three-reveal here.
                  // reviewFocus is Review-session state in the same way, so
                  // it gets cleared alongside deck for the same reason.
                  setDeck("");
                  setReviewFocus("");
                  setBuildStep(0);
                  setChamber("commission");
                }}
              />
              <ForgeCommissionCard
                eyebrow="ALREADY HAVE A DECK?"
                title="Review my decklist"
                description="Paste a list to check it and find useful improvements."
                cta="Review my deck →"
                tone="teal"
                motionMode={motionMode}
                onActivate={() => setChamber("refine")}
              />
            </div>
            <PlayerCompassCard
              value={playerCompass}
              signedIn={!guestMode}
              synced={playerCompassSynced}
              onChange={(next) => { void persistPlayerCompass(next); }}
            />
          </div>
          <div className="entrance-visual" aria-label="The Great Forge, ever-burning">
            <div className="entrance-living-forge" aria-hidden="true">
              <video
                className="entrance-ember-film"
                src="/assets/forge/vfx/entrance-embers.mp4"
                poster="/forge-hero.webp"
                preload="metadata"
                autoPlay
                loop
                muted
                playsInline
              />
              <video
                className="entrance-aperture-film"
                src="/assets/forge/vfx/entrance-aperture.mp4"
                preload="none"
                autoPlay
                loop
                muted
                playsInline
              />
              <span className="entrance-furnace-bloom" />
              <span className="entrance-heat-lens" />
              <span className="entrance-forge-rails" />
            </div>
            <div className="forge-sigil">
              <ForgeRune motionMode={motionMode} />
              <span />
              <b />
            </div>
            <p>
              A DECK COACH FOR EVERY FORMAT
              <small>Complete deck first. Clear reasons second.</small>
            </p>
          </div>
          {savedMasterworks.length > 0 && (
            <section className="masterwork-history">
              <header>
                <div>
                  <small>YOUR PRIVATE ARCHIVE</small>
                  <h2>Return to a Masterwork</h2>
                </div>
                <span>{savedMasterworks.length} PRESERVED</span>
              </header>
              <div>
                {savedMasterworks.map((family) => {
                  const evidence =
                    family.record || family.revisions.at(-1)?.evidence || {};
                  return (
                    <article key={family.id} className={family.archived ? "finished" : ""}>
                      <button
                        className="history-open"
                        onClick={() => openSavedMasterwork(family)}
                      >
                        <small>
                          {family.archived ? "FINISHED MASTERWORK · " : ""}
                          {family.format} · {family.path || "FORGED DECK"}
                        </small>
                        <strong>{family.name}</strong>
                        <span>{family.commander?.name || "No commander"}</span>
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
            </section>
          )}
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
                <small className="blueprint-choice-definition">A hard cap, not a preference — dial in your own group's budget rule. Combine with Commons Only for a Pauper-style build.</small>
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
                  <small id="power-tier-definition" className="blueprint-choice-definition">{blueprintDefinition("targetPowerTier", targetPowerTier)} A nudge, not a guarantee — the Forge honestly reports the tier the finished deck actually reaches.</small>
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
                          {randomCommanderOptions.map((option) => (
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
                            </button>
                          ))}
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
                            commanderResults.map((option) => (
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
                                </b>
                                <em>{option.colors.join("") || "C"}</em>
                              </button>
                            ))
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
                              }}
                            >
                              {secondCommanderSearching ? (
                                <p>The Archive is searching…</p>
                              ) : (
                                secondCommanderResults.map((option) => (
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
                                    </b>
                                    <em>{option.colors.join("") || "C"}</em>
                                  </button>
                                ))
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
          </div>
        </section>
      )}

      {chamber === "forging" && (
        <section className="forging-ceremony" aria-live="polite">
          <ForgeCeremonyMotion stage={stage} motionMode={motionMode} />
          <div className="ceremony-copy" data-phase={stage + 1}>
            <span className="forge-eyebrow">
              <i /> BUILDING YOUR DECK
            </span>
            <div className="ceremony-stage-copy" key={stage}>
              <h1>{FORGING_STAGES[stage][0]}</h1>
              <p>{FORGING_STAGES[stage][1]}</p>
            </div>
            <div className="ceremony-phase">
              <small>STEP {stage + 1} OF {FORGING_STAGES.length}</small>
              <strong>
                {FORGING_STAGES[stage][2]}
                <time dateTime={`PT${forgeElapsedSeconds}S`}>
                  {String(Math.floor(forgeElapsedSeconds / 60)).padStart(2, "0")}:
                  {String(forgeElapsedSeconds % 60).padStart(2, "0")}
                </time>
              </strong>
            </div>
            <div className="ceremony-progress">
              <span>
                <b style={{ width: `${progress}%` }} />
              </span>
              <small>
                YOU CAN LEAVE THIS TAB OPEN — YOUR DECK WILL APPEAR HERE
              </small>
            </div>
            <ol className="ceremony-phase-rail" aria-label="Forge build phases">
              {FORGING_PHASES.map((phase, index) => (
                <li key={phase} className={index < stage ? "is-complete" : index === stage ? "is-active" : ""}>
                  <i>{index < stage ? "✓" : index + 1}</i>
                  <span>{phase}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {chamber === "masterworks" && (
        <section className="masterwork-reveal">
          {pendingCandidateChoice ? (
            <>
              {(masterworksCommissionContract?.hasContract || commissionNote.trim()) && (
                <aside className="request-recognition masterworks-request-recognition is-loud commission-contract" aria-label="Commission contract">
                  <header>
                    <small>1 · I HEARD YOU</small>
                    <strong>You asked for</strong>
                  </header>
                  {masterworksCommissionContract?.youAskedFor?.length > 0 ? (
                    <ul className="request-recognition-checklist commission-ask-chips">
                      {masterworksCommissionContract.youAskedFor
                        .filter((clause: any) => clause.role !== "commander")
                        .map((clause: any) => (
                          <li key={clause.id} className="status-detected">
                            <b>✓ {clause.label}</b>
                          </li>
                        ))}
                    </ul>
                  ) : (
                    <p className="request-recognition-note">
                      <small>YOUR REQUEST</small>
                      {commissionNote.trim()}
                    </p>
                  )}
                  {((pendingCandidateChoice.nativeReport.candidates?.length || 1) <= 1) && (masterworksCommissionContract?.matchHonesty
                    || masterworksCommissionContract?.matchLabel
                    || Number.isFinite(masterworksCommissionContract?.matchPercent)) && (
                    <p className="commission-verdict">
                      <small>VERDICT · THIS EXPERIENCE</small>
                      {masterworksCommissionContract.matchHonesty
                        || (Number.isFinite(masterworksCommissionContract.matchPercent)
                          ? `${masterworksCommissionContract.matchPercent}% match · ${masterworksCommissionContract.matchLabel || "heard"}`
                          : masterworksCommissionContract.matchLabel)}
                    </p>
                  )}
                  {((pendingCandidateChoice.nativeReport.candidates?.length || 1) > 1) && masterworksCommissionContract?.hasContract && (
                    <p className="commission-verdict commission-fit-per-philosophy">
                      <small>COMMISSION FIT</small>
                      Each philosophy below is graded against your contract. The score is never shared across options.
                    </p>
                  )}
                  {masterworksRequestRecognition?.adjustments?.length > 0 && (
                    <p className="commission-why">
                      <small>WHY</small>
                      {masterworksRequestRecognition.adjustments[0].reason
                        || masterworksRequestRecognition.adjustments[0].headline}
                    </p>
                  )}
                </aside>
              )}
              {(strategyBuildComparison?.builds?.length > 0) && (
                <PhilosophyCompare
                  builds={strategyBuildComparison.builds}
                  decidedBy={strategyBuildComparison.decidedBy || null}
                  commanderName={
                    pendingCandidateChoice.nativeReport.selected?.strategicIntent?.commanders?.[0]?.name
                    || activeCommanderName
                    || selectedCommander?.name
                    || ""
                  }
                  onChoose={(candidateId) => enterMasterwork(candidateId)}
                  onInspectCard={setHoveredCard}
                />
              )}
              <footer>
                <button
                  onClick={() => {
                    setPendingCandidateChoice(null);
                    setChamber("entrance");
                  }}
                >
                  Begin a new commission
                </button>
              </footer>
            </>
          ) : (
            <div className="masterwork-reveal-empty">
              <p>There&rsquo;s no build waiting for a choice right now.</p>
              <button type="button" onClick={() => setChamber("entrance")}>
                Return to start
              </button>
            </div>
          )}
        </section>
      )}

      {chamber === "workbench" && (
        <section className={`testing-anvil progressive-results ${openingExperimentGateActive ? "opening-experiment-pending" : ""}`}>
          <button
            className="back-link"
            onClick={() => setChamber(deck.trim() ? "refine" : "commission")}
          >
            ← Change build
          </button>
          <header>
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
          </header>
          {hasValidatedDeck && (
            <LivingWorkbench
              mode={(activeForgeChapter === 2 ? "tune" : activeForgeChapter === 5 ? "test" : "deck") as WorkbenchMode}
              onModeChange={(mode) => {
                const chapter = mode === "deck" ? 1 : mode === "tune" ? 2 : 5;
                setActiveForgeChapter(chapter);
                if (mode === "tune") trackLaunchEvent("coaching_opened", { format });
                window.requestAnimationFrame(() => {
                  const target = mode === "deck"
                    ? document.getElementById("deck-gallery")
                    : mode === "test"
                      ? document.getElementById("proving-era-title")
                      : document.querySelector(".testing-loop");
                  target?.scrollIntoView({ behavior: "smooth", block: "start" });
                });
              }}
              deckName={displayDeckName}
              deckSubtitle={`${honestCoachSummary.planStory?.title || honestCoachSummary.intentions.title}${activeCommanderName ? ` · ${activeCommanderName}` : ""}`}
              cardCount={deckRows.reduce((sum, row) => sum + row.quantity, 0)}
              revisionCount={revisions.length}
              revisions={revisions}
              coachHeadline={honestCoachSummary.headline}
              coachFocus={honestCoachSummary.intentions.firstVulnerability}
              activeTest={Boolean(activeFieldTest)}
              hasSuggestion={Boolean(forgeReply)}
              onPrimaryAction={() => {
                if (activeForgeChapter === 1) {
                  document.getElementById("deck-gallery")?.scrollIntoView({ behavior: "smooth", block: "start" });
                  return;
                }
                if (activeForgeChapter === 2) {
                  document.querySelector(".testing-loop")?.scrollIntoView({ behavior: "smooth", block: "start" });
                  return;
                }
                if (!activeFieldTest) beginProvingGroundsTest();
                setActiveForgeChapter(5);
                trackLaunchEvent("coaching_opened", { format });
                window.requestAnimationFrame(() =>
                  document.getElementById("proving-era-title")?.scrollIntoView({ behavior: "smooth", block: "start" }),
                );
              }}
            />
          )}
          {openingExperimentGateActive && (
            <section className="opening-experiment-gate" aria-labelledby="opening-experiment-title">
              <header>
                <span>
                  <small>YOUR FIRST OFFICIAL EXPERIMENT</small>
                  <h2 id="opening-experiment-title">Choose the first card this Masterwork will test.</h2>
                </span>
                <b>1 OF 3 · PLAYER DECISION</b>
              </header>
              <p>
                The Forge has completed the structure, but the final list stays veiled until you choose its first flex decision. Pick the hypothesis you want to carry into your opening matches.
              </p>
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
            <>
              <section className="forge-understanding-bridge coach-brief honest-coach-v0" id="coach-brief" aria-label="Coach's brief">
                <header>
                  <small>YOUR COACH</small>
                  <h2>{honestCoachSummary.headline}</h2>
                  {honestCoachSummary.commissionContract?.hasContract && (
                    <aside
                      className={`request-recognition commission-contract is-loud${honestCoachSummary.commissionMismatch ? " is-mismatch" : ""}`}
                      aria-label="Commission contract"
                    >
                      <header>
                        <small>1 · I HEARD YOU</small>
                        <strong>You asked for</strong>
                      </header>
                      <ul className="request-recognition-checklist commission-ask-chips">
                        {honestCoachSummary.commissionContract.youAskedFor
                          .filter((clause: any) => clause.role !== "commander")
                          .map((clause: any) => (
                            <li key={clause.id} className="status-detected">
                              <b>✓ {clause.label}</b>
                            </li>
                          ))}
                      </ul>
                      {(honestCoachSummary.commissionContract.matchHonesty
                        || honestCoachSummary.commissionContract.matchLabel
                        || Number.isFinite(honestCoachSummary.commissionContract.matchPercent)) && (
                        <p className="commission-verdict">
                          <small>VERDICT</small>
                          {honestCoachSummary.commissionContract.matchHonesty
                            || (Number.isFinite(honestCoachSummary.commissionContract.matchPercent)
                              ? `${honestCoachSummary.commissionContract.matchPercent}% match · ${honestCoachSummary.commissionContract.matchLabel || "heard"}`
                              : honestCoachSummary.commissionContract.matchLabel)}
                        </p>
                      )}
                      {honestCoachSummary.commissionContract.whatIBuilt?.some((entry: any) => entry.status !== "met") && (
                        <div className="commission-change">
                          <small>WHAT STILL NEEDS WORK</small>
                          <ul className="request-recognition-checklist commission-built-list">
                            {honestCoachSummary.commissionContract.whatIBuilt
                              .filter((entry: any) => entry.status !== "met")
                              .map((entry: any) => (
                                <li key={entry.id} className={`status-${entry.status}`}>
                                  <b>{entry.status === "partial" ? "~" : "·"} {entry.label}</b>
                                </li>
                              ))}
                          </ul>
                        </div>
                      )}
                      {(honestCoachSummary.commissionContract.playerFantasy?.supportLine
                        || honestCoachSummary.requestRecognition?.adjustments?.[0]?.reason) && (
                        <p className="commission-why">
                          <small>WHY</small>
                          {honestCoachSummary.commissionContract.playerFantasy?.supportLine
                            || honestCoachSummary.requestRecognition.adjustments[0].reason}
                        </p>
                      )}
                      {honestCoachSummary.commissionContract.whatIBuilt?.length > 0 && (
                        <details className="request-recognition-receipts">
                          <summary>Full commission breakdown →</summary>
                          <ul className="request-recognition-checklist commission-built-list">
                            {honestCoachSummary.commissionContract.whatIBuilt.map((entry: any) => (
                              <li key={entry.id} className={`status-${entry.status}`}>
                                <b>{entry.status === "met" ? "✓" : entry.status === "partial" ? "~" : "·"} {entry.label}</b>
                                <span>{entry.detail}</span>
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
                      <button
                        type="button"
                        className="conversation-evidence-link"
                        onClick={openDeepForgeEvidence}
                      >
                        How do you know? → Deep Forge evidence
                      </button>
                    </aside>
                  )}
                  {!honestCoachSummary.commissionContract?.hasContract
                    && honestCoachSummary.requestRecognition?.heard?.length > 0 && (
                    <aside className="request-recognition" aria-label="Request recognition">
                      <header>
                        <small>1 · I HEARD YOU</small>
                        <strong>Did I hear you?</strong>
                      </header>
                      <ul className="request-recognition-heard">
                        {honestCoachSummary.requestRecognition.heard.map((theme: any) => (
                          <li key={theme.id} className={`status-${theme.status}`}>
                            <b>{theme.status === "present" || theme.status === "partial" || theme.status === "detected" ? "✓" : "·"} {theme.label}</b>
                          </li>
                        ))}
                      </ul>
                      {honestCoachSummary.requestRecognition.adjustments?.length > 0 && (
                        <p className="commission-why">
                          <small>WHY</small>
                          {honestCoachSummary.requestRecognition.adjustments[0].reason
                            || honestCoachSummary.requestRecognition.adjustments[0].headline}
                        </p>
                      )}
                      <button
                        type="button"
                        className="conversation-evidence-link"
                        onClick={openDeepForgeEvidence}
                      >
                        How do you know? → Deep Forge evidence
                      </button>
                    </aside>
                  )}
                  {honestCoachSummary.deckUnderstanding && (
                    <aside className={`honest-coach-understanding ${honestCoachSummary.deckUnderstanding.reliability.state}`} aria-label="Deck understanding">
                      <strong>{honestCoachSummary.deckUnderstanding.playerSummary.headline}</strong>
                      <p>{honestCoachSummary.deckUnderstanding.playerSummary.detail}</p>
                      {honestCoachSummary.deckUnderstanding.playerSummary.unresolvedNames?.length > 0 && (
                        <ul>
                          {honestCoachSummary.deckUnderstanding.playerSummary.unresolvedNames.map((name: string) => (
                            <li key={name}>{name}</li>
                          ))}
                        </ul>
                      )}
                    </aside>
                  )}
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
                  <details
                    className={`honest-coach-confidence ${honestCoachSummary.confidence.level}`}
                    open={coachConfidenceOpen}
                    onToggle={(event) => {
                      const open = (event.currentTarget as HTMLDetailsElement).open;
                      setCoachConfidenceOpen(open);
                      if (open) {
                        trackLaunchEvent("coach_confidence_opened", {
                          format,
                          confidence: honestCoachSummary.confidence.level,
                        });
                      }
                    }}
                  >
                    <summary>
                      <strong>{honestCoachSummary.confidence.label}</strong>
                      <span>{honestCoachSummary.confidence.detail}</span>
                    </summary>
                    <p>{honestCoachSummary.confidence.reason}</p>
                  </details>
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
                {honestCoachSummary.coachingAllowed && (
                <details
                  className="honest-coach-drilldown"
                  open={coachWhyOpen}
                  onToggle={(event) => {
                    const open = (event.currentTarget as HTMLDetailsElement).open;
                    setCoachWhyOpen(open);
                    if (open) {
                      trackLaunchEvent("coach_why_opened", {
                        format,
                        analysis: honestCoachSummary.analysisIds.analysisId,
                      });
                    }
                  }}
                >
                  <summary>{honestCoachSummary.whyPrompt}</summary>
                  <div className="honest-coach-drilldown-grid">
                    <div>
                      <small>OBSERVED</small>
                      <ul>
                        {honestCoachSummary.observedFindings.map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <small>INTERPRETIVE</small>
                      <ul>
                        {honestCoachSummary.interpretiveGuidance.map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  {honestCoachSummary.intentions?.dependsOn && (
                    <p className="honest-coach-packages">
                      When it becomes dangerous: {honestCoachSummary.intentions.dependsOn}
                    </p>
                  )}
                  {honestCoachSummary.planStory?.planLabel && (
                    <p className="honest-coach-packages">
                      Plan label: {honestCoachSummary.planStory.planLabel}
                    </p>
                  )}
                  {honestCoachSummary.identity.packageLabels.length > 0 && (
                    <p className="honest-coach-packages">
                      Packages detected: {honestCoachSummary.identity.packageLabels.join(" · ")}
                    </p>
                  )}
                  <p className="honest-coach-id-chip" aria-label="Analysis id">
                    Analysis {honestCoachSummary.analysisIds.analysisId}
                  </p>
                </details>
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

              <RevisionOpinionPanel
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

            </>
          ) : (
            !openingExperimentGateActive &&
            benchStatus !== "forging" &&
            forgeGenerationError && (
              <p className="forge-map-intro">
                <span>NOT READY</span> This attempt did not produce a complete deck. See the failure details below — your commission and any preview are unaffected.
              </p>
            )
          )}
          <div className={`testing-layout chapter-${activeForgeChapter}-active ${deckViewMode}-deck-view${isImportedDeckReview ? " imported-deck-review" : ""}`}>
            {hasValidatedDeck && (
              <div className="deck-reference-strip">
                <img
                  className="commander-art-crop"
                  src={cardArtCrop(activeCommanderName || chosenPreview.card)}
                  alt=""
                />
                <div>
                  <strong>{displayDeckName}</strong>
                  <span>
                    {honestCoachSummary.planStory?.title
                      ? `${honestCoachSummary.planStory.title} · `
                      : ""}
                    {deckRows.reduce((sum, row) => sum + row.quantity, 0)} cards · {format}
                  </span>
                </div>
                <button type="button" onClick={() => setActiveForgeChapter(1)}>View full deck →</button>
              </div>
            )}
            <article className="deck-manuscript">
              <header>
                <div>
                  <small>YOUR DECK</small>
                  <h2>
                    {benchStatus === "forging"
                      ? "The Forge is producing your deck…"
                      : hasValidatedDeck
                        ? `${deckRows.reduce((sum, row) => sum + row.quantity, 0)} cards · ${Object.keys(groupedDeck).length} ${Object.keys(groupedDeck).length === 1 ? "section" : "sections"}`
                        : "Build not completed"}
                  </h2>
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
                      onClick={() => navigator.clipboard.writeText(forgedDeck)}
                    >
                      Copy deck
                    </button>
                    <details className="deck-view-options">
                      <summary>View options</summary>
                      <button type="button" className={deckViewMode === "workbench" ? "active" : ""} onClick={() => setDeckViewMode("workbench")}>Visual deck</button>
                      <button type="button" className={deckViewMode === "ledger" ? "active" : ""} onClick={() => setDeckViewMode("ledger")}>Text list</button>
                    </details>
                    {guestMode && guestClaimToken && <a onClick={() => trackLaunchEvent("save_continue_clicked", { format })} className="save-masterwork-link" href={`https://app.metaforge.gg/?claim=${encodeURIComponent(guestClaimToken)}`}>Save deck</a>}
                  </div>
                )}
              </header>
              {postAcceptChoice && (
                <div className="post-accept-choice" role="status">
                  <span>
                    <strong>Change applied.</strong> What's next for this Masterwork?
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
                        This Is The One — Preserve as Finished Masterwork
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

              <details
                className="forge-intelligence-vault"
                open={
                  intelligenceOpen ||
                  (!deckIntegrity.checking && !deckIntegrity.passed)
                }
                onToggle={(event) =>
                  setIntelligenceOpen(event.currentTarget.open)
                }
              >
                <summary>
                  <span>
                    <small>DEEP FORGE · HOW DO YOU KNOW?</small>
                    <b>What MetaForge noticed — and how sure it is</b>
                  </span>
                  <strong>
                    {!deckIntegrity.checking && !deckIntegrity.passed
                      ? "ATTENTION REQUIRED"
                      : intelligenceOpen
                        ? "HIDE DETAILS"
                        : "EXPLORE DETAILS"}
                  </strong>
                </summary>
              <div className="deep-forge-quick-stats">
                <span><small>MARKET TOTAL</small><b>${deckPriceTotal.total.toFixed(2)}</b></span>
                {nativeMasterworkContext?.powerSignal && <span><small>POWER</small><b>{nativeMasterworkContext.powerSignal.tier}</b></span>}
                <span><small>COHESION</small><b>{nativeMasterworkContext?.selected?.evaluation?.cohesion ?? "—"}</b></span>
                <span><small>RESILIENCE</small><b>{nativeMasterworkContext?.selected?.evaluation?.resilience ?? "—"}</b></span>
                <button type="button" className={cheapestPrintings ? "active" : ""} aria-pressed={cheapestPrintings} onClick={() => setCheapestPrintings((current) => !current)}>Compare cheapest printings</button>
              </div>
              <DeepForgeDossier
                understanding={honestCoachSummary.deepForgeUnderstanding}
                principles={honestCoachSummary.deepForgePrinciples}
              />
              {deckRows.length > 0 && (
                <section className={`integrity-dossier ${deckIntegrity.passed ? "passed" : deckIntegrity.checking ? "checking" : "held"}`}>
                  <header>
                    <span>
                      <small>STRUCTURAL INTEGRITY GATE</small>
                      <b>
                        {deckIntegrity.checking
                          ? `Verifying ${deckIntegrity.unresolved.length} card record${deckIntegrity.unresolved.length === 1 ? "" : "s"}…`
                          : deckIntegrity.passed
                            ? "This Masterwork is cleared for testing."
                            : "Testing is held until every hard constraint passes."}
                      </b>
                    </span>
                    <strong>{deckIntegrity.passed ? "VERIFIED" : deckIntegrity.checking ? "CHECKING" : "REPAIR REQUIRED"}</strong>
                  </header>
                  <div>
                    <span><small>DECK SIZE</small><b>{deckIntegrity.total} / {deckIntegrity.target}</b></span>
                    <span><small>AVG. SPELL VALUE</small><b>{deckIntegrity.averageCmc.toFixed(2)}</b></span>
                    <span><small>MANA SOURCES</small><b>{deckIntegrity.roles["Mana source"] || 0}</b></span>
                    <span><small>INTERACTION</small><b>{(deckIntegrity.roles.Interaction || 0) + (deckIntegrity.roles["Board reset"] || 0)}</b></span>
                    <span><small>ADVANTAGE + ENGINES</small><b>{(deckIntegrity.roles["Card advantage"] || 0) + (deckIntegrity.roles["Engine piece"] || 0)}</b></span>
                  </div>
                  {nativeMasterworkContext?.manaConsistency && (
                    <section className="stress-dossier">
                      <span>
                        <small>MANA CONSISTENCY</small>
                        <b>{(nativeMasterworkContext.manaConsistency.overall * 100).toFixed(0)}% on-curve</b>
                        <em>Real hypergeometric odds, not a heuristic guess</em>
                      </span>
                      {nativeMasterworkContext.manaConsistency.risky.slice(0, 3).map((entry: { name: string; turn: number; colors: string[]; probability: number }) => (
                        <span key={entry.name}>
                          <small>{entry.colors.join("")} by turn {entry.turn}</small>
                          <b>
                            <ForgeCardRef
                              name={entry.name}
                              surface="mana-risky"
                              onInspect={setHoveredCard}
                            />
                          </b>
                          <em>{(entry.probability * 100).toFixed(0)}% chance on time</em>
                        </span>
                      ))}
                      <p>Counts lands, mana rocks, and dorks as real color sources, but treats multi-color needs as independent draws, so real odds run slightly higher than shown.</p>
                    </section>
                  )}
                  {nativeMasterworkContext?.powerSignal && (
                    <section className="stress-dossier">
                      <span>
                        <small>COMMANDER POWER SIGNAL</small>
                        <b>{nativeMasterworkContext.powerSignal.tier}</b>
                        <em>{nativeMasterworkContext.powerSignal.note}</em>
                      </span>
                      {nativeMasterworkContext.requestedPowerTier && (
                        <span>
                          <small>TARGETED</small>
                          <b>{nativeMasterworkContext.requestedPowerTier}</b>
                          <em>
                            {nativeMasterworkContext.powerAudit?.rebuildReachedTarget
                              ? `Rebuilt to reach it: the first pass measured ${nativeMasterworkContext.powerAudit.originalMeasuredTier}, so the Forge excluded the flagged cards and rebuilt to the requested tier.`
                              : !nativeMasterworkContext.powerAudit || !nativeMasterworkContext.powerAudit.mismatch
                                ? "The finished deck reached the requested tier."
                                : nativeMasterworkContext.powerAudit.rebuildImproved
                                  ? `Improved but not fully resolved: rebuilding brought it from ${nativeMasterworkContext.powerAudit.originalMeasuredTier} to ${nativeMasterworkContext.powerAudit.measured}, still above the requested tier — disclosed honestly, not relabeled.`
                                  : "A nudge, not a guarantee — the finished deck landed here instead, honestly disclosed rather than relabeled."}
                          </em>
                        </span>
                      )}
                      <span>
                        <small>FAST MANA</small>
                        <b>{nativeMasterworkContext.powerSignal.fastMana.length}</b>
                        <em>{nativeMasterworkContext.powerSignal.fastMana.slice(0, 3).join(", ") || "None detected"}</em>
                      </span>
                      <span>
                        <small>UNRESTRICTED TUTORS</small>
                        <b>{nativeMasterworkContext.powerSignal.tutors.unrestricted.length}</b>
                        <em>{nativeMasterworkContext.powerSignal.tutors.unrestricted.slice(0, 3).join(", ") || "None detected"}</em>
                      </span>
                      <span>
                        <small>EXTRA TURNS + LAND DENIAL</small>
                        <b>{nativeMasterworkContext.powerSignal.extraTurns.length + nativeMasterworkContext.powerSignal.massLandDenial.length}</b>
                        <em>{[...nativeMasterworkContext.powerSignal.extraTurns, ...nativeMasterworkContext.powerSignal.massLandDenial].slice(0, 3).join(", ") || "None detected"}</em>
                      </span>
                      <span>
                        <small>REPEATABLE ENGINES + MULTIPLIERS</small>
                        <b>{nativeMasterworkContext.powerSignal.repeatableValueEngine.length + nativeMasterworkContext.powerSignal.resourceMultiplier.length}</b>
                        <em>{[...nativeMasterworkContext.powerSignal.repeatableValueEngine, ...nativeMasterworkContext.powerSignal.resourceMultiplier].slice(0, 3).join(", ") || "None detected"}</em>
                      </span>
                      <span>
                        <small>EFFICIENT INTERACTION</small>
                        <b>{nativeMasterworkContext.powerSignal.efficientInteraction.length}</b>
                        <em>{nativeMasterworkContext.powerSignal.efficientInteraction.slice(0, 3).join(", ") || "None detected"}</em>
                      </span>
                      {nativeMasterworkContext.powerSignal.comboProximity.count > 0 && (
                        <span>
                          <small>COMPACT COMBO PROXIMITY</small>
                          <b>{nativeMasterworkContext.powerSignal.comboProximity.count} verified pair{nativeMasterworkContext.powerSignal.comboProximity.count === 1 ? "" : "s"}</b>
                          <em>{nativeMasterworkContext.powerSignal.comboProximity.pairs.slice(0, 2).join(" · ")} · counted toward the tier above</em>
                        </span>
                      )}
                      {(nativeMasterworkContext.powerSignal.commanderSynergy.ownSignal || nativeMasterworkContext.powerSignal.commanderSynergy.amplifiedCards.length > 0 || nativeMasterworkContext.powerSignal.commanderSynergy.spellSynergy) && (
                        <span>
                          <small>COMMANDER SYNERGY</small>
                          <b>
                            {[
                              nativeMasterworkContext.powerSignal.commanderSynergy.ownSignal && "carries its own signal",
                              nativeMasterworkContext.powerSignal.commanderSynergy.amplifiedCards.length > 0 && `combines with ${nativeMasterworkContext.powerSignal.commanderSynergy.amplifiedCards.length} card${nativeMasterworkContext.powerSignal.commanderSynergy.amplifiedCards.length === 1 ? "" : "s"}`,
                              nativeMasterworkContext.powerSignal.commanderSynergy.spellSynergy && "amplifies this shell's spells",
                            ].filter(Boolean).join(" · ")}
                          </b>
                          <em>Verified from the commander's own text and this build's actual composition — counted toward the tier above</em>
                        </span>
                      )}
                      {(nativeMasterworkContext.powerSignal.interconnection.comboLoopTotal > 0 || nativeMasterworkContext.powerSignal.interconnection.amplifiers.length > 0) && (
                        <span>
                          <small>REAL INTERCONNECTION</small>
                          <b>
                            {nativeMasterworkContext.powerSignal.interconnection.comboLoopTotal} mutual loop{nativeMasterworkContext.powerSignal.interconnection.comboLoopTotal === 1 ? "" : "s"}
                            {nativeMasterworkContext.powerSignal.interconnection.amplifiers.length ? ` · ${nativeMasterworkContext.powerSignal.interconnection.amplifiers.length} amplifier${nativeMasterworkContext.powerSignal.interconnection.amplifiers.length === 1 ? "" : "s"}` : ""}
                          </b>
                          <em>
                            {[...nativeMasterworkContext.powerSignal.interconnection.amplifiers, ...nativeMasterworkContext.powerSignal.interconnection.comboLoops].slice(0, 3).join(" · ") || "Detected"} · informational only, not counted toward the tier above (see Compact Combo Proximity for the subset that is)
                          </em>
                        </span>
                      )}
                      <p>{nativeMasterworkContext.powerSignal.evidence}</p>
                    </section>
                  )}
                  {simulationDossier && (
                    <section className="stress-dossier">
                      <span>
                        <small>OPENING-HAND GATE</small>
                        <b>{(simulationDossier.goldfish.expert.keepableRate * 100).toFixed(1)}% keepable</b>
                        <em>{simulationDossier.goldfish.gate.replaceAll("-", " ")} · avg {simulationDossier.goldfish.expert.averageMulligans.toFixed(1)} mulligans</em>
                      </span>
                      <span>
                        <small>PLAN REALIZATION</small>
                        <b>{(simulationDossier.goldfish.expert.planRealizationRate * 100).toFixed(1)}%</b>
                        <em>Average turn {simulationDossier.goldfish.expert.averageRealizationTurn?.toFixed(1) || "—"}</em>
                      </span>
                      <span>
                        <small>PILOT SENSITIVITY</small>
                        <b>{simulationDossier.goldfish.sensitivityLabel}</b>
                        <em>Sequencing impact, not player rating</em>
                      </span>
                      <span>
                        <small>HARDEST STRESS PROFILE</small>
                        <b>{simulationDossier.matrix.weakest?.opponent || "Unresolved"}</b>
                        <em>{((simulationDossier.matrix.weakest?.scenarioPassRate || 0) * 100).toFixed(1)}% scenario pass · avg {(simulationDossier.matrix.weakest?.averageMulligans || 0).toFixed(1)} mulligans</em>
                      </span>
                      {simulationDossier.goldfish.expert.colorScrewRate !== null && (
                        <span>
                          <small>COLOR SCREW RISK</small>
                          <b>{(simulationDossier.goldfish.expert.colorScrewRate * 100).toFixed(1)}%</b>
                          <em>Games that never cast a colored spell at all</em>
                        </span>
                      )}
                      <p>Modeled Forge trials test mana, role density, and sequencing under pressure. They are viability gates—not predicted match win rates.</p>
                    </section>
                  )}
                  {!deckIntegrity.checking && (
                    <section
                      className={`forge-systems-chamber ${
                        forgeSystemsReport.systems.length
                          ? "systems-awakened"
                          : "systems-dormant"
                      } ${activeSystem ? "has-active-system" : ""}`}
                    >
                      <header className="systems-chamber-heading">
                        <div>
                          <small>SYSTEMS OF THE FORGE</small>
                          <h2>
                            {forgeSystemsReport.systems.length
                              ? "The deck's internal machinery is awake."
                              : honestCoachSummary.strategyVsSystem?.incompleteEvidence
                                ? "Repeatable systems are not fully verified yet."
                                : "No repeatable system can be verified on this complete card set."}
                          </h2>
                          <p>
                            {forgeSystemsReport.systems.length
                              ? `${forgeSystemsReport.systems.length} repeatable system${
                                  forgeSystemsReport.systems.length === 1
                                    ? ""
                                    : "s"
                                } detected across ${Math.round(
                                  forgeSystemsReport.systemCoverage * 100,
                                )}% of nonland cards.`
                              : honestCoachSummary.deepForgeEmpty.system}
                          </p>
                        </div>

                        <div className="systems-chamber-seal">
                          <i>ᛞ</i>
                          <span>
                            <small>STRUCTURAL CONFIDENCE</small>
                            <strong>{forgeSystemsReport.confidence}</strong>
                          </span>
                        </div>
                      </header>

                      {forgeSystemsReport.systems.length > 0 ? (
                        <>
                          <section className="systems-overview">
                            {honestCoachSummary.strategicRecognition?.primaryPlan
                              && !honestCoachSummary.strategicRecognition?.ambiguous && (
                              <article className="systems-primary-plan">
                                <small>WHAT THIS MEANS AT THE TABLE</small>
                                <strong>
                                  {honestCoachSummary.strategicRecognition.tableWhy
                                    || honestCoachSummary.strategicRecognition.planLabel}
                                </strong>
                                <p>{honestCoachSummary.strategicRecognition.primaryPlan}</p>
                                <span>
                                  Supporting evidence · powered by{" "}
                                  {[
                                    honestCoachSummary.strategicRecognition.hierarchy?.primary?.name,
                                    ...(honestCoachSummary.strategicRecognition.hierarchy?.supporting || [])
                                      .slice(0, 2)
                                      .map((entry: any) => entry.name),
                                  ].filter(Boolean).join(" · ") || "verified systems"}
                                </span>
                              </article>
                            )}
                            <article>
                              <small>STRONGEST AT THE TABLE</small>
                              <strong>
                                {honestCoachSummary.strategicRecognition?.tableMeaning
                                  || honestCoachSummary.strategicRecognition?.playerSystemLines?.[0]
                                  || forgeSystemsReport.strongestSystem?.name
                                  || "Unresolved"}
                              </strong>
                              <span>
                                Supporting evidence · {forgeSystemsReport.strongestSystem?.name || "system"} ·{" "}
                                {forgeSystemsReport.strongestSystem?.health?.overall || 0}/100 health
                              </span>
                            </article>

                            <article>
                              <small>CLEAREST PRESSURE POINT</small>
                              <strong>
                                {forgeSystemsReport.weakestSystem?.name ||
                                  "Unresolved"}
                              </strong>
                              <span>
                                {forgeSystemsReport.weakestSystem?.health
                                  ?.dependencyRisk || 0}
                                /100 dependency risk
                              </span>
                            </article>

                            <article>
                              <small>BRIDGE NETWORK</small>
                              <strong>
                                {forgeSystemsReport.bridgeCards.length}
                                {" "}
                                bridge card
                                {forgeSystemsReport.bridgeCards.length === 1
                                  ? ""
                                  : "s"}
                              </strong>
                              <span>
                                Cards serving more than one detected system
                              </span>
                            </article>
                          </section>

                          {interactionGraph.enginePairs.length > 0 && (
                            <span className="slot-justification">
                              <small>POTENTIAL TWO-CARD ENGINES · PATTERN-INFERRED, NOT A VERIFIED COMBO</small>
                              {interactionGraph.enginePairs.slice(0, 3).map((pair: { cards: string[]; reason: string }) => (
                                <em key={pair.cards.join("+")}>{pair.cards.join(" + ")} — {pair.reason}</em>
                              ))}
                            </span>
                          )}
                          {nativeMasterworkContext?.unusedEnginePartners && nativeMasterworkContext.unusedEnginePartners.length > 0 && (
                            <span className="slot-justification">
                              <small>SITTING UNUSED IN YOUR POOL · SAME PATTERN-INFERRED CAVEAT</small>
                              {nativeMasterworkContext.unusedEnginePartners.slice(0, 3).map((entry: { card: string; partner: string; reason: string }) => (
                                <em key={`${entry.card}+${entry.partner}`}>{entry.card} — {entry.reason}</em>
                              ))}
                            </span>
                          )}

                          <div className="systems-blueprint-grid">
                            {visibleForgeSystems.map(
                              (system, systemIndex) => {
                                const gauges = [
                                  [
                                    "Overall Health",
                                    system.health.overall,
                                    false,
                                  ],
                                  [
                                    "Consistency",
                                    system.health.consistency,
                                    false,
                                  ],
                                  [
                                    "Resilience",
                                    system.health.resilience,
                                    false,
                                  ],
                                  [
                                    "Leverage",
                                    system.health.leverage,
                                    false,
                                  ],
                                  [
                                    "Cohesion",
                                    system.health.cohesion,
                                    false,
                                  ],
                                  [
                                    "Dependency Risk",
                                    system.health.dependencyRisk,
                                    true,
                                  ],
                                ] as const;

                                return (
                                  <details
                                    className={`system-blueprint ${
                                      activeSystem?.id === system.id
                                        ? "active-system-blueprint"
                                        : ""
                                    }`}
                                    key={system.id}
                                    open={activeSystem?.id === system.id}
                                    onToggle={(event) => {
                                      if (event.currentTarget.open) {
                                        setSelectedSystemId(system.id);
                                      } else if (activeSystem?.id === system.id) {
                                        setSelectedSystemId("");
                                      }
                                    }}
                                    style={
                                      {
                                        "--system-order": systemIndex,
                                      } as React.CSSProperties
                                    }
                                  >
                                    <summary>
                                      <span className="system-rune">
                                        {["ᛟ", "ᛉ", "ᛞ", "ᚱ", "ᛇ"][
                                          systemIndex % 5
                                        ]}
                                      </span>

                                      <span className="system-identity">
                                        <small>
                                          WHAT THIS MEANS · SYSTEM {String(systemIndex + 1).padStart(2, "0")}
                                        </small>
                                        <strong>
                                          {tableMeaningFor(system.signal)
                                            || system.name}
                                        </strong>
                                        <em>
                                          Supporting evidence · {system.name} ·{" "}
                                          {system.members.length} cards ·{" "}
                                          {system.edges.length} links · Health{" "}
                                          {system.health?.overall ?? 0}
                                        </em>
                                      </span>

                                      <span className="system-health-medallion">
                                        <b>{system.health.overall}</b>
                                        <small>HEALTH</small>
                                      </span>

                                      <span
                                        className="blueprint-toggle"
                                        aria-current={
                                          activeSystem?.id === system.id
                                            ? "true"
                                            : undefined
                                        }
                                      >
                                        {activeSystem?.id === system.id
                                          ? "Machine selected"
                                          : "Open blueprint"}
                                      </span>
                                    </summary>

                                    <div className="system-blueprint-body">
                                      <section className="system-health-board">
                                        <header>
                                          <small>STRUCTURAL HEALTH</small>
                                          <span>{system.confidence}</span>
                                        </header>

                                        {gauges.map(
                                          ([label, value, danger]) => (
                                            <div
                                              className={`system-gauge ${
                                                danger ? "risk-gauge" : ""
                                              }`}
                                              key={label}
                                            >
                                              <span>
                                                <small>{label}</small>
                                                <b>{value}</b>
                                              </span>
                                              <i>
                                                <b
                                                  style={{
                                                    width: `${Math.max(
                                                      0,
                                                      Math.min(100, value),
                                                    )}%`,
                                                  }}
                                                />
                                              </i>
                                            </div>
                                          ),
                                        )}
                                      </section>

                                      <section className="system-component-board">
                                        <article>
                                          <small>CORE COMPONENTS</small>
                                          <div>
                                            {system.core.map((name) => (
                                              <button
                                                type="button"
                                                key={name}
                                                data-card-inspect-surface="system-core"
                                                className={
                                                  forgeSystemsReport.bridgeCards.some(
                                                    (bridge) =>
                                                      bridge.name === name,
                                                  )
                                                    ? "bridge-component"
                                                    : ""
                                                }
                                                aria-label={`Inspect ${name}`}
                                                onClick={() =>
                                                  setHoveredCard(name)
                                                }
                                              >
                                                {name}
                                              </button>
                                            ))}
                                          </div>
                                        </article>

                                        <article>
                                          <small>SUPPORT COMPONENTS</small>
                                          <div>
                                            {system.support.length ? (
                                              system.support.map((name) => (
                                                <button
                                                  type="button"
                                                  key={name}
                                                  data-card-inspect-surface="system-support"
                                                  onClick={() =>
                                                    setHoveredCard(name)
                                                  }
                                                >
                                                  {name}
                                                </button>
                                              ))
                                            ) : (
                                              <em>
                                                No separate support layer detected.
                                              </em>
                                            )}
                                          </div>
                                        </article>

                                        <article>
                                          <small>PRODUCERS</small>
                                          <div>
                                            {system.producers.length ? (
                                              system.producers.map((name) => (
                                                <button
                                                  type="button"
                                                  key={name}
                                                  data-card-inspect-surface="system-producers"
                                                  onClick={() =>
                                                    setHoveredCard(name)
                                                  }
                                                >
                                                  {name}
                                                </button>
                                              ))
                                            ) : (
                                              <em>
                                                Producer role remains distributed.
                                              </em>
                                            )}
                                          </div>
                                        </article>

                                        <article>
                                          <small>PAYOFFS</small>
                                          <div>
                                            {system.payoffs.length ? (
                                              system.payoffs.map((name) => (
                                                <button
                                                  type="button"
                                                  key={name}
                                                  data-card-inspect-surface="system-payoffs"
                                                  onClick={() =>
                                                    setHoveredCard(name)
                                                  }
                                                >
                                                  {name}
                                                </button>
                                              ))
                                            ) : (
                                              <em>
                                                Payoff role remains distributed.
                                              </em>
                                            )}
                                          </div>
                                        </article>
                                      </section>

                                      <section className="system-engineering-notes">
                                        <article>
                                          <small>REDUNDANCY</small>
                                          <strong>
                                            {system.redundancy.repeatedCards
                                              .length
                                              ? `${system.redundancy.repeatedCards.length} repeated component${
                                                  system.redundancy
                                                    .repeatedCards.length === 1
                                                    ? ""
                                                    : "s"
                                                }`
                                              : "Singleton structure"}
                                          </strong>
                                          <p>
                                            {system.redundancy.producerCount}{" "}
                                            producers ·{" "}
                                            {system.redundancy.payoffCount}{" "}
                                            payoffs
                                          </p>
                                        </article>

                                        <article
                                          className={
                                            system.criticalFailures.length
                                              ? "engineering-warning"
                                              : ""
                                          }
                                        >
                                          <small>CRITICAL FAILURE AUDIT</small>
                                          {system.criticalFailures.length ? (
                                            system.criticalFailures.map(
                                              (failure) => (
                                                <p key={failure.name}>
                                                  <b>{failure.name}</b>
                                                  <span>
                                                    Removing this component breaks{" "}
                                                    {Math.round(
                                                      failure.impact * 100,
                                                    )}
                                                    % of measured internal links.
                                                  </span>
                                                </p>
                                              ),
                                            )
                                          ) : (
                                            <p>
                                              <b>NO SINGLE COLLAPSE POINT</b>
                                              <span>
                                                The current graph does not isolate
                                                one component carrying a critical
                                                share of internal connections.
                                              </span>
                                            </p>
                                          )}
                                        </article>
                                      </section>

                                      <footer>
                                        <span>{system.evidence}</span>

                                        <div className="system-blueprint-actions">
                                          <b>
                                            {system.health.dependencyRisk >= 55
                                              ? "DEPENDENCY WATCH"
                                              : "STRUCTURE TEMPERED"}
                                          </b>

                                          <button
                                            type="button"
                                            onClick={() =>
                                              inspectSystem(
                                                system.id,
                                                system.core[0] ||
                                                  system.members[0] ||
                                                  "",
                                              )
                                            }
                                          >
                                            Inspect machine in graph
                                            <span aria-hidden="true">→</span>
                                          </button>
                                        </div>
                                      </footer>
                                    </div>
                                  </details>
                                );
                              },
                            )}
                          </div>
                          {forgeSystemsReport.systems.length > 3 && (
                            <button
                              type="button"
                              className="system-disclosure-toggle"
                              onClick={() => setShowAllSystems((visible) => !visible)}
                            >
                              {showAllSystems
                                ? "Return to the three strongest systems"
                                : `Reveal all ${forgeSystemsReport.systems.length} detected systems`}
                            </button>
                          )}

                          <section className="systems-bridge-foundry">
                            <header>
                              <div>
                                <small>BRIDGE CARDS</small>
                                <h3>
                                  Components carrying more than one machine
                                </h3>
                              </div>
                              <span>
                                {forgeSystemsReport.bridgeCards.length} FOUND
                              </span>
                            </header>

                            {forgeSystemsReport.bridgeCards.length ? (
                              <div>
                                {forgeSystemsReport.bridgeCards.map(
                                  (bridge) => (
                                    <button
                                      type="button"
                                      key={bridge.name}
                                      data-card-inspect-surface="bridge-card"
                                      className={
                                        activeSystem &&
                                        bridge.systems.includes(
                                          activeSystem.name,
                                        )
                                          ? "active-bridge-card"
                                          : ""
                                      }
                                      aria-label={`Inspect bridge card ${bridge.name}`}
                                      onClick={() =>
                                        setHoveredCard(bridge.name)
                                      }
                                    >
                                      <i>◇</i>
                                      <span>
                                        <strong>{bridge.name}</strong>
                                        <small>
                                          {bridge.systems.join(" · ")}
                                        </small>
                                      </span>
                                      <b>{bridge.score}</b>
                                    </button>
                                  ),
                                )}
                              </div>
                            ) : (
                              <p>
                                No card currently bridges two named systems.
                                That is not inherently a flaw, but it reduces
                                cross-engine leverage.
                              </p>
                            )}
                          </section>

                          <section className="structural-intelligence-chamber">
                            <header className="structural-intelligence-heading">
                              <div>
                                <small>STRUCTURAL INTELLIGENCE · BOUNDED MODEL</small>
                                <h3>
                                  {activeCausalitySystem
                                    ? `${activeCausalitySystem.name} under load`
                                    : "The Forge is mapping structural consequences."}
                                </h3>
                                <p>{forgeCausalityReport.headline}</p>
                                {forgeCausalityReport.nextTest && (
                                  <p className="causality-next-test">{forgeCausalityReport.nextTest}</p>
                                )}
                              </div>
                              <span className="causality-confidence-seal">
                                <b>{forgeCausalityReport.structuralResilience}</b>
                                <small>DECK RESILIENCE</small>
                              </span>
                            </header>

                            <div className="causality-vitals">
                              {[
                                ["Survives disruption", forgeCausalityReport.structuralResilience, false],
                                ["Depends on key cards", forgeCausalityReport.collapseRisk, true],
                                ["Can rebuild", forgeCausalityReport.recoveryPotential, false],
                                ["Has backup pieces", activeCausalitySystem?.redundancy || 0, false],
                              ].map(([label, value, risk]) => (
                                <article className={risk ? "causality-risk" : ""} key={String(label)}>
                                  <span><small>{label}</small><b>{Number(value)}</b></span>
                                  <i><b style={{ width: `${Math.max(0, Math.min(100, Number(value)))}%` }} /></i>
                                </article>
                              ))}
                            </div>

                            {activeCausalitySystem && (
                              <div className="causality-machine-summary">
                                <span>
                                  <small>ACTIVE CARD GROUP</small>
                                  <strong>{activeCausalitySystem.name}</strong>
                                  <em>{activeCausalitySystem.status.toUpperCase()} · {activeCausalitySystem.confidence}</em>
                                </span>
                                <span><small>SURVIVES DISRUPTION</small><b>{activeCausalitySystem.structuralResilience}</b></span>
                                <span><small>KEY-CARD DEPENDENCE</small><b>{activeCausalitySystem.collapseRisk}</b></span>
                                <span><small>CAN REBUILD</small><b>{activeCausalitySystem.recoveryPotential}</b></span>
                              </div>
                            )}

                            <div className="causality-panels">
                              <article className="causality-panel critical-nodes-panel">
                                <header><span>⚒</span><div><small>CARDS THIS PLAN LEANS ON</small><strong>The hardest pieces to lose or replace</strong></div></header>
                                <div>
                                  {(activeCausalitySystem?.criticalNodes || []).length ? (
                                    activeCausalitySystem?.criticalNodes.map((card) => (
                                      <button type="button" key={card.name} data-card-inspect-surface="causality-critical" onClick={() => setHoveredCard(card.name)}>
                                        <span><b>{card.name}</b><small>{card.primaryRole}</small></span>
                                        <em>{card.collapseRisk}<small> RISK</small></em>
                                      </button>
                                    ))
                                  ) : <p>No single card appears essential to keeping this plan working.</p>}
                                </div>
                              </article>

                              <article className="causality-panel amplifier-panel">
                                <header><span>✦</span><div><small>CARDS THAT HELP SEVERAL PIECES</small><strong>One card improving more than one part of the plan</strong></div></header>
                                <div>
                                  {(activeCausalitySystem?.amplifiers || []).length ? (
                                    activeCausalitySystem?.amplifiers.map((card) => (
                                      <button type="button" key={card.name} data-card-inspect-surface="causality-amplifier" onClick={() => setHoveredCard(card.name)}>
                                        <span><b>{card.name}</b><small>{card.systems.join(" · ")}</small></span>
                                        <em>{card.amplifierScore}<small> AMP</small></em>
                                      </button>
                                    ))
                                  ) : <p>No single card is clearly boosting several parts of this plan at once.</p>}
                                </div>
                              </article>

                              <article className="causality-panel bottleneck-panel">
                                <header><span>⛓</span><div><small>JOBS WITH TOO FEW BACKUPS</small><strong>Important work handled by only one or two cards</strong></div></header>
                                <div>
                                  {(activeCausalitySystem?.bottlenecks || []).length ? (
                                    activeCausalitySystem?.bottlenecks.map((card) => (
                                      <button type="button" key={card.name} data-card-inspect-surface="causality-bottleneck" onClick={() => setHoveredCard(card.name)}>
                                        <span><b>{card.name}</b><small>{card.alternatives.length} modeled alternative{card.alternatives.length === 1 ? "" : "s"}</small></span>
                                        <em>{card.bottleneckScore}<small> LOAD</small></em>
                                      </button>
                                    ))
                                  ) : <p>No important job appears to depend on too few cards.</p>}
                                </div>
                              </article>
                            </div>

                            {forgeCausalityReport.highestValueUpgrade && (
                              <p className="deep-forge-redirect">
                                The Forge's single highest-value read on this
                                system: <b>{forgeCausalityReport.highestValueUpgrade.recommendation}</b> This is
                                structural-only context — for an exact, gated
                                one-card experiment, see the tournament-rival
                                experiments below, or the Deck Stress Lab in{" "}
                                <button type="button" className="deep-forge-redirect-link" onClick={() => setActiveForgeChapter(2)}>
                                  Chapter II · Shape
                                </button>.
                              </p>
                            )}

                            <footer className="causality-methodology">
                              <span>{forgeCausalityReport.confidence}</span>
                              <p>{forgeCausalityReport.methodology}</p>
                            </footer>
                          </section>

                          <section
                            className={`systems-failure-reading ${
                              forgeFailureAnalysis.status ===
                              "bounded-hypothesis"
                                ? "has-hypothesis"
                                : ""
                            }`}
                          >
                            <header>
                              <span>⚒</span>
                              <div>
                                <small>BOUNDED FAILURE ANALYSIS</small>
                                <h3>{forgeFailureAnalysis.headline}</h3>
                              </div>
                            </header>

                            {forgeFailureAnalysis.chain.length > 0 && (
                              <ol>
                                {forgeFailureAnalysis.chain.map(
                                  (step, index) => (
                                    <li key={`${index}-${step}`}>
                                      <span>{index + 1}</span>
                                      <p>{step}</p>
                                    </li>
                                  ),
                                )}
                              </ol>
                            )}

                            <footer>
                              <span>
                                <small>NEXT HONEST TEST</small>
                                <b>{forgeFailureAnalysis.nextTest}</b>
                              </span>
                              <em>{forgeFailureAnalysis.evidence}</em>
                            </footer>
                          </section>

                          <footer className="systems-masterwork-reveal">
                            <i />
                            <span>
                              <small>THE SYSTEM MAP IS COMPLETE</small>
                              <strong>Masterwork Intelligence Awakened</strong>
                            </span>
                            <i />
                          </footer>
                        </>
                      ) : (
                        <div className="systems-empty-state">
                          <i>ᛞ</i>
                          <strong>{honestCoachSummary.deepForgeEmpty.system}</strong>
                          <p>
                            {honestCoachSummary.strategyVsSystem?.incompleteEvidence
                              ? "Unknown is not absent: missing or unresolved card records prevent naming a repeatable engine. Strategy recognition can still be stronger than system verification."
                              : "The Forge will not manufacture an engine claim from isolated cards on a complete verified set."}
                          </p>
                        </div>
                      )}

                      <footer className="systems-methodology">
                        {forgeSystemsReport.methodology}
                      </footer>
                    </section>
                  )}

                  {!deckIntegrity.checking && (
                    <section
                      id="interaction-graph-dossier"
                      className={`interaction-graph-dossier ${
                        activeSystem ? "system-graph-focus" : ""
                      }`}
                      aria-label={
                        activeSystem
                          ? `Interaction graph focused on ${activeSystem.name}`
                          : "Complete interaction graph"
                      }
                    >
                      <header>
                        <span>
                          <small>
                            {activeSystem
                              ? "FOCUSED MACHINE GRAPH · ORACLE REASONING"
                              : "INTERACTION GRAPH · ORACLE REASONING"}
                          </small>
                          <b>{interactionGraph.confidence}</b>
                        </span>

                        <div className="interaction-graph-focus-heading">
                          <strong>
                            {activeSystem
                              ? activeSystem.name
                              : `${Math.round(
                                  interactionGraph.coverage * 100,
                                )}% connected`}
                          </strong>

                          {activeSystem && (
                            <button
                              type="button"
                              onClick={() => setSelectedSystemId("")}
                            >
                              Show complete graph
                            </button>
                          )}
                        </div>
                      </header>

                      {activeSystem && (
                        <div className="active-system-graph-banner">
                          <span className="system-rune" aria-hidden="true">
                            ᛞ
                          </span>

                          <span>
                            <small>INSPECTING MACHINE</small>
                            <strong>{activeSystem.name}</strong>
                            <em>
                              {activeSystem.members.length} components ·{" "}
                              {focusedInteractionGraph.edges.length} visible
                              relationships
                            </em>
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              setHoveredCard(
                                activeSystem.core[0] ||
                                  activeSystem.members[0] ||
                                  "",
                              )
                            }
                          >
                            Inspect core card
                          </button>
                        </div>
                      )}
                      <div>
                        <article>
                          <small>STRONGEST PACKAGES</small>
                          {focusedInteractionGraph.packages.slice(0, 4).map((group) => (
                            <p key={group.signal}>
                              <b>{group.signal.toUpperCase()}</b>
                              <span>
                                <ForgeCardRefList
                                  names={group.members}
                                  surface="graph-package"
                                  onInspect={setHoveredCard}
                                  limit={4}
                                />
                                {group.members.length > 4 ? ` +${group.members.length - 4}` : ""}
                              </span>
                            </p>
                          ))}
                          {!focusedInteractionGraph.packages.length && <em>{honestCoachSummary.deepForgeEmpty.package}</em>}
                        </article>
                        <article>
                          <small>STRONGEST RELATIONSHIPS</small>
                          {focusedInteractionGraph.edges.slice(0, 3).map((edge) => (
                            <p key={`${edge.from}-${edge.to}`}>
                              <b>{edge.strength}% · {edge.signals.join(" + ")}</b>
                              <span>
                                <ForgeCardRef name={edge.from} surface="graph-edge" onInspect={setHoveredCard} />
                                {" ↔ "}
                                <ForgeCardRef name={edge.to} surface="graph-edge" onInspect={setHoveredCard} />
                              </span>
                            </p>
                          ))}
                          {!focusedInteractionGraph.edges.length && <em>{honestCoachSummary.deepForgeEmpty.relationship}</em>}
                        </article>
                        <article className={focusedInteractionGraph.nonbos.length ? "graph-warning" : ""}>
                          <small>RULES AUDIT + ISOLATION</small>
                          {focusedInteractionGraph.nonbos.slice(0, 2).map((conflict) => (
                            <p key={`${conflict.source}-${conflict.signal}`}>
                              <b>
                                NONBO ·{" "}
                                <ForgeCardRef name={conflict.source} surface="graph-nonbo" onInspect={setHoveredCard} />
                              </b>
                              <span>{conflict.reason}</span>
                            </p>
                          ))}
                          {!focusedInteractionGraph.nonbos.length && <p><b>NO VERIFIED NONBO</b><span>No symmetrical oracle-text conflict was detected.</span></p>}
                          {focusedInteractionGraph.amplifiers.slice(0, 2).map((amplifier: { source: string; reason: string }) => (
                            <p key={amplifier.source}>
                              <b>
                                AMPLIFIER ·{" "}
                                <ForgeCardRef name={amplifier.source} surface="graph-amplifier" onInspect={setHoveredCard} />
                              </b>
                              <span>{amplifier.reason}</span>
                            </p>
                          ))}
                          <em>
                            {focusedInteractionGraph.isolated.length ? (
                              <>
                                {`${focusedInteractionGraph.isolated.length} isolated slot${focusedInteractionGraph.isolated.length === 1 ? "" : "s"}: `}
                                <ForgeCardRefList
                                  names={focusedInteractionGraph.isolated}
                                  surface="graph-isolated"
                                  onInspect={setHoveredCard}
                                  limit={4}
                                />
                              </>
                            ) : activeSystem ? "Every card in this machine has at least one modeled relationship." : "Every nonland slot has at least one modeled relationship."}
                          </em>
                        </article>
                      </div>
                      <footer>{interactionGraph.methodology}</footer>
                    </section>
                  )}
                  {!deckIntegrity.checking && deckIntegrity.issues.length > 0 && (
                    <footer>
                      <ul>{deckIntegrity.issues.map((issue) => <li key={issue}>{issue}</li>)}</ul>
                      {/* Automatic repair used to route through /api/forge/chat's
                          now-deliberately-retired "deck_generation" task (that
                          endpoint has hardcoded a 503 for it since the native
                          engine migration — see worker/forge-chat.ts). The old
                          button always failed, and its failure wrote into
                          forgeGenerationError, which made an already-valid deck
                          disappear behind "No deck was completed." No automatic
                          repair exists today; this is the honest state instead. */}
                      <p className="deck-integrity-manual-note">
                        Automatic repair isn&rsquo;t available for these — open the Editing Anvil to fix the flagged slots by hand.
                      </p>
                    </footer>
                  )}
                </section>
              )}
              <section className="refinement-starters-vault" aria-label="Tournament-rival controlled experiments">
                <header className="vault-experiments-header">
                  <small>ADVANCED · TOURNAMENT-RIVAL EXPERIMENTS</small>
                  <b>A second, independent read: this exact build vs. its closest rival from generation.</b>
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
                                Seal it as a Finished Masterwork →
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
                              <span>{tablet.change.add} enters the Masterwork</span>
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
                            : "Re-forge this Masterwork to generate fresh evidence-led experiments."}
                    </p>
                  )}
                </div>
              </section>
              </details>
              {benchStatus === "forging" ? (
                <section
                  className="masterwork-forging-progress"
                  role="status"
                  aria-live="polite"
                  aria-label="The native Forge is building your complete deck"
                >
                  <ForgeProcessingLoader motionMode={motionMode} />
                  <small>METAFORGE NATIVE ENGINE · MASTERWORK IN PROGRESS</small>
                  <strong>
                    {forgeElapsedSeconds < 5
                      ? "Reading your Blueprint"
                      : forgeElapsedSeconds < 12
                        ? "Classifying roles and synergy packages"
                        : forgeElapsedSeconds < 22
                          ? "Forging three competing candidates"
                          : forgeElapsedSeconds < 35
                            ? "Testing curve, resilience, and legality"
                            : "Selecting the strongest complete Masterwork"}
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
                    <span>{cardFactsLoading ? "Organizing card types in the background…" : "Showing the complete deck in its saved order while card details reconnect."}</span>
                    {cardFactsError && <button type="button" onClick={() => setCardFactsRetry((current) => current + 1)}>Retry details</button>}
                  </div>
                )}
                {!cardFactsLoading && !cardFactsError && cardFactsPending > 0 && (
                  <div className="deck-gallery-notice" role="status" aria-live="polite">
                    <span>{cardFactsPending} card detail{cardFactsPending === 1 ? " is" : "s are"} still being matched. The rest of your deck is fully organized.</span>
                  </div>
                )}
                {deckViewMode === "workbench" && (
                  <Tabletop
                    cards={tabletopCards}
                    edges={interactionGraph.edges}
                    previousCardNames={previousRevisionCardNames}
                    activeCard={activeCard}
                    onSelectCard={(name) => {
                      setHoveredCard(name);
                      setContextInspectCard(name);
                    }}
                    onMatchupContext={setMatchupCardAdvice}
                    onOpenList={() => setDeckViewMode("ledger")}
                    strategy={strategy}
                  />
                )}
                <div className="deck-gallery" id="deck-gallery">
                  <aside className="card-preview-stage">
                    <button
                      type="button"
                      className="card-preview-open"
                      onClick={() => activeCard && setInspectedCard(activeCard)}
                      aria-label={`Inspect ${activeCard}`}
                    >
                      {activeImage && (
                        <img
                          src={activeImage}
                          alt={`${activeCard} card preview`}
                        />
                      )}
                    </button>
                    <div className="card-preview-summary">
                      <small>ACTIVE CARD · TAP FOR DOSSIER</small>
                      <strong>{activeCard}</strong>
                      <span>
                        {activeFact?.type_line ||
                          "Card details awaken on inspection"}
                      </span>
                    </div>
                    <span className="slot-justification">
                      <small>SLOT DUTY · {activeRole.toUpperCase()}</small>
                      {activeSlotReason}
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
                    </span>
                  </aside>
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
                                aria-haspopup="menu"
                                aria-expanded={cardActionMenu?.name === row.name}
                                onClick={(event) => {
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
                                  setCardActionMenu({
                                    name: row.name,
                                    x: Math.min(event.clientX, window.innerWidth - 250),
                                    y: Math.min(event.clientY, window.innerHeight - 260),
                                  });
                                }}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter" || event.key === " ") {
                                    event.preventDefault();
                                    const bounds = event.currentTarget.getBoundingClientRect();
                                    setCardActionMenu({
                                      name: row.name,
                                      x: Math.min(bounds.left + 20, window.innerWidth - 250),
                                      y: Math.min(bounds.bottom + 6, window.innerHeight - 260),
                                    });
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
                </>
              ) : forgeGenerationError ? (
                <div className="forge-generation-failure" role="alert">
                  {forgeGenerationFailure?.code === "GUEST_PREVIEW_ALREADY_USED" ? (
                    <>
                      <small>YOUR FREE PREVIEW IS SPENT</small>
                      <h3>This free preview Forge has already been used.</h3>
                      <p>{forgeGenerationError}</p>
                      {/* Non-retryable: a fresh Turnstile token cannot make an
                          already-consumed guest entitlement available again,
                          so no retry action is offered here — only a real
                          path forward (open the saved result, or sign in). */}
                      <div className="forge-generation-failure-actions">
                        {forgeGenerationFailure.claimToken && (
                          <a href={`https://app.metaforge.gg/?claim=${encodeURIComponent(forgeGenerationFailure.claimToken)}`}>
                            Open your saved result →
                          </a>
                        )}
                        <a href={signInResumeHref}>Sign in and continue this Forge →</a>
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
                <pre>The Forge is waiting for a valid commission.</pre>
              )}
              {showContextCardInspector &&
                contextInspectCard &&
                createPortal(
                  <aside
                    key={contextInspectCard}
                    className="forge-context-card-inspector"
                    role="complementary"
                    aria-label={`Inspecting ${contextInspectCard}`}
                  >
                    <header>
                      <small>CARD IN CONTEXT</small>
                      <button
                        type="button"
                        className="forge-context-card-inspector-close"
                        onClick={closeContextCardInspector}
                        aria-label="Close contextual card inspector"
                      >
                        ×
                      </button>
                    </header>
                    <button
                      type="button"
                      className="forge-context-card-inspector-art"
                      onClick={() => {
                        setInspectedCard(contextInspectCard);
                        closeContextCardInspector();
                      }}
                      aria-label={`Open full dossier for ${contextInspectCard}`}
                    >
                      {contextInspectImage ? (
                        <img
                          src={contextInspectImage}
                          alt={`${contextInspectCard} card`}
                        />
                      ) : (
                        <span>Art loading…</span>
                      )}
                    </button>
                    <div className="forge-context-card-inspector-body">
                      <strong>{contextInspectCard}</strong>
                      <span>
                        {contextInspectFact?.type_line ||
                          "Card details awaken on inspection"}
                      </span>
                      {matchupCardAdvice
                        && matchupCardAdvice.cardName === contextInspectCard && (
                        <div className={`forge-context-matchup-coach${matchupCardAdvice.priority ? " is-priority" : " is-secondary"}`}>
                          <small>VS {matchupCardAdvice.matchup.toUpperCase()}</small>
                          <p>
                            <em>Verdict</em>
                            {matchupCardAdvice.verdict}
                          </p>
                          <p>
                            <em>Change</em>
                            {matchupCardAdvice.change}
                          </p>
                          <p>
                            <em>Why</em>
                            {matchupCardAdvice.why}
                          </p>
                        </div>
                      )}
                      {matchupCardAdvice
                        && matchupCardAdvice.cardName === contextInspectCard
                        && contextCardReasons.length > 0 ? (
                        <details className="forge-context-structural-evidence">
                          <summary>Structural evidence →</summary>
                          <ul>
                            {contextCardReasons.map((reason) => (
                              <li key={reason}>{reason}</li>
                            ))}
                          </ul>
                        </details>
                      ) : (
                        <>
                          <small>WHY IT MATTERS</small>
                          {contextCardReasons.length ? (
                            <ul>
                              {contextCardReasons.map((reason) => (
                                <li key={reason}>{reason}</li>
                              ))}
                            </ul>
                          ) : (
                            <p>Referenced in Deep Forge evidence for this build.</p>
                          )}
                        </>
                      )}
                      {matchupCardAdvice
                        && matchupCardAdvice.cardName === contextInspectCard
                        && contextCardReasons.length === 0 && (
                        <p className="forge-context-structural-empty">
                          No structural engines tagged yet — matchup seat advice above still applies.
                        </p>
                      )}
                      <button
                        type="button"
                        className="forge-context-card-inspector-dossier"
                        onClick={() => {
                          setInspectedCard(contextInspectCard);
                          closeContextCardInspector();
                        }}
                      >
                        Open full dossier →
                      </button>
                    </div>
                  </aside>,
                  document.body,
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
                      {inspectedPrinting && (
                        <small>
                          SELECTED PRINTING · {inspectedPrinting.setName} ({inspectedPrinting.setCode.toUpperCase()}) #{inspectedPrinting.collectorNumber}
                        </small>
                      )}
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
                    </div>
                    <div className="card-inspector-dossier">
                      <small>CONTEXTUAL CARD DOSSIER</small>
                      <h3 id="card-inspector-title">{inspectedCard}</h3>
                      <p className="card-inspector-type">{inspectedFact?.type_line || "Card type unavailable"}</p>
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
                        <small>ORACLE TEXT</small>
                        <p className="card-inspector-oracle">
                          {inspectedFact?.oracle_text || inspectedFact?.card_faces?.map((face) => face.oracle_text).filter(Boolean).join("\n\n") || "Oracle text is not available for this card."}
                        </p>
                      </div>
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
                <p>Start with MetaForge&rsquo;s strongest safe experiment. Generation reasoning and match history stay optional.</p>
              </header>
              {forgeReply && (
                <details className="why-this-masterwork">
                  <summary>
                    <small>WHY THIS MASTERWORK</small>
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
                  generation. Find it in{" "}
                  <button type="button" className="deep-forge-redirect-link" onClick={() => {
                    setActiveForgeChapter(1);
                    setIntelligenceOpen(true);
                    window.requestAnimationFrame(() => document.querySelector(".forge-intelligence-vault")?.scrollIntoView({ behavior: "smooth", block: "start" }));
                  }}>
                    Deep Forge
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
                        <small>A loss does not make the chosen line wrong. MetaForge preserves the alternative so repeated decision pressure can be coached without rewriting the deck.</small>
                      </section>
                    )}
                    <small>Choose the closest honest observation. The Forge preserves it as one clue—not a verdict.</small>
                  </div>
                )}
              </section>
              <section className="revision-learning-dossier">
                <header><small>REVISION {Math.max(1, revisions.length)} LEARNING</small><b>{revisionLearning.sampleSize} recorded match{revisionLearning.sampleSize === 1 ? "" : "es"}</b></header>
                <article className={`coaching-diagnosis diagnosis-${coachingDiagnosis.primary.category}`}>
                  <header>
                    <span><small>COACHING READ</small><b>{coachingDiagnosis.primary.label}</b></span>
                    <em>{coachingDiagnosis.primary.confidence}</em>
                  </header>
                  <p><b>What supports it</b><span>{coachingDiagnosis.primary.evidence.join(" · ")}</span></p>
                  <p><b>What to do</b><span>{coachingDiagnosis.primary.recommendation}</span></p>
                  <p><b>How to test it</b><span>{coachingDiagnosis.primary.measurement}</span></p>
                  {coachingDiagnosis.alternatives.length > 0 && (
                    <details>
                      <summary>{coachingDiagnosis.alternatives.length} other evidence-backed read{coachingDiagnosis.alternatives.length === 1 ? "" : "s"}</summary>
                      {coachingDiagnosis.alternatives.map((alternative) => (
                        <span key={alternative.category}><b>{alternative.label}</b>{alternative.recommendation}</span>
                      ))}
                    </details>
                  )}
                  <small>{coachingDiagnosis.evidenceBoundary}</small>
                </article>
                {revisionLearning.actionable.length ? revisionLearning.actionable.slice(0, 3).map((pattern) => (
                  <p key={pattern.preference}><b>{pattern.preference}</b><span>{pattern.confidence} · {pattern.count} matching signals</span></p>
                )) : <p><b>NO PERSISTENT PREFERENCE YET</b><span>Two matching signals are required before the Forge treats a feeling as a revision pattern.</span></p>}
                {revisionLearning.matchups.filter((matchup) => matchup.actionable).slice(0, 2).map((matchup) => (
                  <p key={matchup.opponent}><b>{matchup.opponent} matchup</b><span>{matchup.wins}–{matchup.losses} observed · {matchup.confidence}, not a predicted win rate</span></p>
                ))}
                <details className="intervention-learning-readout">
                  <summary>
                    CONTINUAL FORGE LEARNING · {interventionLearning.experiments.length} EXPERIMENT{interventionLearning.experiments.length === 1 ? "" : "S"}
                  </summary>
                  <p>
                    <b>{interventionLearning.reusable.length ? `${interventionLearning.reusable.length} reusable player pattern${interventionLearning.reusable.length === 1 ? "" : "s"}` : "NO INTERVENTION PROMOTED YET"}</b>
                    <span>{interventionLearning.reusableGuidance}</span>
                  </p>
                  <small>{interventionLearning.evidenceBoundary}</small>
                </details>
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
                      Preserve as Finished Masterwork
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
        </section>
      )}
      {chamber !== "forging" && savedMasterworks.length > 0 && (
        <aside
          className={`bench-dock ${benchOpen ? "open" : ""}`}
          aria-label="Your Masterwork Bench"
        >
          <div className="bench-tray" aria-hidden={!benchOpen}>
            <header>
              <div>
                <small>THE PRIVATE BENCH</small>
                <strong>Your preserved Masterworks</strong>
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
                      </span>
                      <span className="bench-card-vitals">
                        <em><b>{family.revisions.length || 1}</b> revision{family.revisions.length === 1 ? "" : "s"}</em>
                        <em><b>{evidenceCount}</b> match{evidenceCount === 1 ? "" : "es"}</em>
                      </span>
                      <span className="bench-card-open">Open Masterwork <i>→</i></span>
                      <button
                        type="button"
                        className="bench-card-delete"
                        aria-label={`Delete ${family.name}`}
                        title="Delete this Masterwork permanently"
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
                Your first completed Masterwork will appear here.
              </p>
            )}
            <footer>
              <button onClick={showFullArchive}>View full Archive</button>
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
                    ? `${savedMasterworks.length} Masterwork${savedMasterworks.length === 1 ? "" : "s"} preserved`
                    : forgeGenerationError
                      // This floating launcher is always mounted (gated only on
                      // chamber !== "forging"), independent of whether the
                      // current attempt succeeded — so an empty archive used to
                      // say "Ready for your first Masterwork" even while the
                      // main panel displayed "No deck was completed" right next
                      // to it. Neither claim was individually false, but shown
                      // together they read as contradictory chrome. Only the
                      // invitation language is suppressed here; the rest of the
                      // panel (saved-deck navigation, "Start a New Forge") stays
                      // fully available during a failure.
                      ? "Nothing preserved yet"
                      : "Ready for your first Masterwork"}
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
  );
}
