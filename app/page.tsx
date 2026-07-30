"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { evaluateSimulationGate } from "./goldfish-simulation.mjs";
import { evaluateMatchupMatrix } from "./matchup-simulation.mjs";
import { getMetaIntelligence } from "./meta-intelligence.mjs";
import {
  buildBoundedFailureAnalysis,
} from "./forge-systems-intelligence.mjs";
import {
  buildForgeStructuralAnalysis,
} from "./forge-structural-pipeline.mjs";
import { learnRevisionPreferences } from "./revision-learning.mjs";
import { learnFromForgeInterventions } from "./forge-intervention-learning.mjs";
import { applyControlledSwap, experimentAdditionSynergy, rankExperimentAdditions, rankExperimentCuts } from "./meta-breaker-experiment.mjs";
import { colorPipsFromCost, forgeNativeMasterwork, forgeImportedMasterwork, manaConsistencyReport, parseNativeBlueprintIntent } from "./native-masterwork-engine.mjs";
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
import { buildExperimentTablets } from "./experiment-tablet.mjs";
import { resolveMasterworkVisualProfile } from "./masterwork-visual-profile.mjs";
import { MOTIF_ICONS } from "./masterwork-motif-icons";

type Chamber =
  | "entrance"
  | "commission"
  | "refine"
  | "forging"
  | "masterworks"
  | "workbench";

type MotionMode = "full" | "quiet";
type ForgeAction = "none" | "forge" | "reveal" | "select" | "refine" | "grow";
type MilestoneMotion = {
  kind: "ignition" | "masterwork-ready" | "masterwork-selected" | "experiment-chosen" | "revision-accepted" | "evidence-recorded";
  eyebrow: string;
  label: string;
  glyph: string;
} | null;

const FORGING_STAGES = [
  ["The blueprint is sealed", "Reading the commission marks…", "642"],
  ["Awakening the Great Furnace", "Ancient channels fill with light.", "642"],
  [
    "Consulting the Archive",
    "Rejecting designs with repeated structural failures…",
    "318",
  ],
  [
    "Shaping the strategic core",
    "Aligning every card with the requested strategy…",
    "141",
  ],
  ["Tempering the mana lattice", "Discarding unstable foundations…", "47"],
  [
    "Testing structural integrity",
    "Pressing each design against hostile plans…",
    "9",
  ],
  ["Inspecting imperfections", "Recording every honest weakness…", "3"],
  ["Three designs survived", "Cooling the surviving masterworks…", "3"],
] as const;

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
};
type CommanderOption = {
  name: string;
  colors: string[];
  typeLine: string;
  image: string;
  verifiedFacts: string;
};
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
  revisions: Array<{
    deckText: string;
    note: string;
    createdAt: string;
    evidence?: { wins?: number; losses?: number };
    matches?: Array<{
      id: string;
      result: "win" | "loss";
      opponent: string;
      signal: string;
      playedAt: string;
      revision?: number;
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

const ForgeProcessingLoader = ({ motionMode }: { motionMode: MotionMode }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
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

    void import("@rive-app/canvas").then(({ Alignment, Fit, Layout, Rive }) => {
      if (disposed) return;
      rive = new Rive({
        src: "/assets/forge/animations/metaforge-forging-loader.riv",
        canvas,
        stateMachines: "Forge Loader Machine",
        autoBind: true,
        autoplay: true,
        layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
        onLoad: () => {
          if (disposed) return;
          rive?.resizeDrawingSurfaceToCanvas();
          const processing = rive?.viewModelInstance?.boolean("IsProcessing");
          if (processing) processing.value = motionMode === "full";
          setLoaded(true);
        },
      });
      resizeObserver = new ResizeObserver(() => rive?.resizeDrawingSurfaceToCanvas());
      resizeObserver.observe(canvas);
    });

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      rive?.cleanup();
    };
  }, [motionMode]);

  return (
    <div className={`forging-motion forging-motion--rive${loaded ? " is-loaded" : ""}`} aria-hidden="true">
      <span className="processing-crucible" />
      <span className="processing-index-ring" />
      <span className="processing-heat-ring" />
      <canvas ref={canvasRef} />
      <i>ᛟ</i>
      <span className="processing-sparks"><b /><b /><b /><b /><b /><b /></span>
    </div>
  );
};

const CEREMONY_MOTION_ASSETS = [
  null,
  "furnace-analysis",
  "archive-confirmation",
  "blueprint-reveal",
  "warning-fracture",
  "anvil-impact",
  "recommendation-reveal",
  "masterwork-unlock",
] as const;

const ForgeCeremonyMotion = ({
  stage,
  motionMode,
}: {
  stage: number;
  motionMode: MotionMode;
}) => {
  if (stage === 0) return <ForgeConfirmationSeal motionMode={motionMode} />;
  const asset = CEREMONY_MOTION_ASSETS[stage] ?? "furnace-analysis";
  return (
    <div
      key={`${asset}-${stage}`}
      className={`forge-ceremony-motion forge-ceremony-motion--${asset}${motionMode === "quiet" ? " is-quiet" : ""}`}
      aria-hidden="true"
    >
      <span className="forge-motion-aura" />
      <span className="forge-motion-crucible" />
      <span className="forge-motion-index" />
      <img src={`/assets/forge/animations/${asset}.svg`} alt="" />
      <span className="forge-motion-scan" />
      <span className="forge-motion-embers"><i /><i /><i /><i /></span>
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

const MASTERWORK_STATS = [
  [94, 46, 70, 48],
  [72, 78, 76, 68],
  [28, 96, 64, 86],
  [76, 88, 72, 78],
  [62, 54, 94, 72],
  [44, 82, 88, 76],
  [86, 48, 90, 58],
  [38, 68, 98, 96],
  [42, 58, 82, 66],
] as const;
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
const alignRandomMasterwork = (work: Masterwork, commander: CommanderOption | null, index: number) => {
  if (!commander) return work;
  const lane = MASTERWORK_LANES[index % MASTERWORK_LANES.length];
  const identity = commander.name.split(/[ ,/]+/)[0] || "Forge";
  const noun = lane.nouns[Math.floor(index / 3) % lane.nouns.length];
  return {
    ...work,
    name: `The ${identity} ${noun}`,
    path: lane.path,
    tone: lane.tone,
    verdict: lane.verdict,
  };
};
const masterworkStats = (commander: CommanderOption | null, index: number) => {
  if (!commander) return MASTERWORK_STATS[index];
  const lane = FORGE_LANES[index % 3];
  const scores = commanderLaneScores(commander);
  const base: Record<ForgeLane, [number, number, number, number]> = {
    pressure: [82, 54, 72, 54],
    engine: [54, 66, 90, 78],
    inevitability: [34, 88, 76, 82],
  };
  const result = [...base[lane]] as [number, number, number, number];
  result[0] = Math.min(98, result[0] + Math.min(12, scores.pressure));
  result[1] = Math.min(98, result[1] + Math.min(10, scores.inevitability));
  result[2] = Math.min(98, result[2] + Math.min(8, scores.engine));
  return result;
};
const masterworkInsight = (
  work: Masterwork,
  preview: DeckPreview,
  commander: CommanderOption | null,
  note = "",
) => {
  const blueprint = parseNativeBlueprintIntent({ note });
  const blueprintPromise = blueprint.promises.join(" plus ");
  const oracle = commanderOracleText(commander);
  const mechanics = [
    [/sacrifice|dies|graveyard/i, "graveyard and sacrifice value"],
    [/\bcounter|proliferate/i, "counter-based scaling"],
    [/draw|look at|exile.+play/i, "repeatable card selection"],
    [/token|create/i, "token production"],
    [/attack|combat|damage/i, "combat conversion"],
    [/artifact|vehicle|equipment/i, "artifact synergies"],
    [/instant|sorcery|\bcast\b/i, "spell sequencing"],
    [/\bland|mana/i, "mana and land development"],
  ]
    .filter(([pattern]) => (pattern as RegExp).test(oracle))
    .map(([, label]) => String(label))
    .slice(0, 2);
  const identity = mechanics.length
    ? mechanics.join(" plus ")
    : commander
      ? "the commander's verified rules text"
      : preview.theme.toLowerCase();
  const path = work.path.toLowerCase();
  const pressure = /aggress|pressure|tempo|go-wide/.test(path);
  const control = /control|reactive|bastion|precision/.test(path);
  const engine = /synergy|engine|combo|alchemy|growth/.test(path);
  const attrition = /attrition|graveyard|inevitability|resource|ramp/.test(path);
  const baseOpening = pressure
    ? "Play useful threats early, then protect the lead and keep attacking."
    : control
      ? "Build your mana, answer the most dangerous cards, and play the commander when it is safer."
      : engine
        ? "Play the smaller cards that support your theme, then let the commander connect them into a stronger whole."
        : "Build your mana, keep a useful answer ready, and choose between attacking or rebuilding as the game changes.";
  const baseWin = pressure
      ? `Use ${identity} to keep dealing damage and finish before slower decks recover.`
      : control
      ? `Use ${identity} to gain an advantage after trading cards, then win with a threat you can protect.`
      : engine
        ? `Combine several cards that reward ${identity}; each card should still do something useful on its own.`
        : attrition
          ? `Trade resources carefully until ${identity} gives you more useful cards and choices than your opponents.`
          : preview.win;
  const opening = blueprintPromise
    ? `This version puts ${blueprintPromise} first. ${baseOpening}`
    : baseOpening;
  const win = blueprintPromise
    ? `${baseWin} The finished deck must include enough ${blueprintPromise} cards for that request to matter in normal games.`
    : baseWin;
  const packages = (pressure
    ? ["Early attackers", "Ways to protect them", "Damage after combat stalls"]
    : control
      ? ["Early answers", "Ways to draw more cards", "Reliable finishers"]
      : engine
        ? ["Theme starters", "Cards that reward the theme", "Backup ways to win"]
        : ["Reliable mana", "Flexible answers", "A strong late game"]);
  if (blueprintPromise) packages.unshift(`Your request · ${blueprintPromise}`);
  const weakness = pressure
    ? "A board wipe can undo the early lead, so keep some threats back when possible."
    : control
      ? "Very fast threats can arrive before the deck has the right answer."
      : engine
        ? "Removing the key reward cards can slow the theme, so the deck needs more than one card that fills each important job."
        : "Very fast starts can punish the turns spent building mana and preparing for a longer game.";
  return { opening, win, packages, weakness, oracle };
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
const isCommanderFormat = (format: string) =>
  ["Commander", "Brawl", "Standard Brawl"].includes(format);
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
const commanderOption = (card: any): CommanderOption => {
  const faceFacts = (card.card_faces || [])
    .map(
      (face: any) =>
        `${face.name} ${face.mana_cost || ""}\n${face.type_line || ""}\n${face.oracle_text || ""}`,
    )
    .join("\nTRANSFORMS TO\n");
  return {
    name: card.name,
    colors: card.color_identity || [],
    typeLine: card.type_line || "Legendary card",
    image:
      card.image_uris?.small || card.card_faces?.[0]?.image_uris?.small || "",
    verifiedFacts: `LIVE SCRYFALL RECORD\nName: ${card.name}\nMana cost: ${card.mana_cost || card.card_faces?.[0]?.mana_cost || "None"}\nType: ${card.type_line || ""}\nColor identity: ${(card.color_identity || []).join("") || "Colorless"}\nSet: ${card.set_name || ""} (${card.set || ""})\nAvailable games: ${(card.games || []).join(", ")}\nBrawl legality: ${card.legalities?.brawl || "unknown"}\nCommander legality: ${card.legalities?.commander || "unknown"}\nOracle text:\n${faceFacts || card.oracle_text || ""}`,
  };
};
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
const formatEdhrecEvidence = (
  evidence: EdhrecEvidence | null,
  format: string,
) => {
  if (!evidence?.available || !evidence.cards.length)
    return "EDHREC has no usable commander evidence for this commission yet. Do not penalize new or sparsely indexed cards; evaluate them from verified rules text and the Blueprint.";
  const signals = evidence.cards
    .slice(0, 45)
    .map(
      (card) =>
        `${card.name} | ${card.category} | conservative evidence score ${((card.evidenceScore || 0) * 100).toFixed(0)}/100 | adoption ${(card.inclusion * 100).toFixed(1)}% (lower bound ${((card.adoptionFloor || 0) * 100).toFixed(1)}%; ${card.decks}/${card.eligibleDecks || "?"} eligible decks) | raw synergy ${(card.synergy * 100).toFixed(1)}% | sample-adjusted synergy ${((card.shrunkSynergy || 0) * 100).toFixed(1)}% | ${card.evidenceClass || "descriptive signal"} | confidence ${card.confidence}${card.newCardPotential ? " | PROMISING NEW-CARD HYPOTHESIS" : ""}`,
    )
    .join("\n");
  return `EDHREC COMMANDER EVIDENCE (descriptive, not a legality source)\n${evidence.methodology || "Adoption and commander-relative synergy evidence."}\n${format.includes("Brawl") ? `This is cross-format Commander evidence only. Every candidate must still pass current Arena ${format} legality and color-identity checks in Scryfall.` : "Every candidate must still pass current Commander legality and color-identity checks in Scryfall."}\nDo not treat popularity as proof of quality. Weight low-sample signals cautiously, but do not suppress a new card merely because adoption is young when its mechanics and synergy fit are strong.\n${signals}`;
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
const BASIC_LANDS: Record<string, string> = {
  W: "Plains",
  U: "Island",
  B: "Swamp",
  R: "Mountain",
  G: "Forest",
};
const BASIC_LAND_KEYS = new Set(
  [...Object.values(BASIC_LANDS), "Wastes"].map(cardFactKey),
);
type NativeForgeCard = {
  name: string;
  manaCost: string;
  cmc: number;
  typeLine: string;
  oracleText: string;
  colorIdentity: string[];
  keywords: string[];
  popularityRank?: number;
  priceUsd?: number;
  producedMana?: string[];
};

const nativeCardFact = (card: any): NativeForgeCard => {
  const priceUsd = Number(card.prices?.usd ?? card.prices?.usd_foil ?? NaN);
  return {
    name: String(card.name || ""),
    manaCost: String(card.mana_cost || card.card_faces?.[0]?.mana_cost || ""),
    cmc: Number(card.cmc || 0),
    typeLine: String(card.type_line || ""),
    oracleText: String(
      card.oracle_text ||
        (card.card_faces || []).map((face: any) => face.oracle_text || "").join("\n"),
    ),
    colorIdentity: card.color_identity || [],
    keywords: card.keywords || [],
    ...(Number.isFinite(priceUsd) ? { priceUsd } : {}),
    // Scryfall's authoritative "what this permanent actually taps for" —
    // more precise than color_identity, which also counts colored costs on
    // activated abilities that don't produce mana at all.
    ...(Array.isArray(card.produced_mana) ? { producedMana: card.produced_mana } : {}),
  };
};

const loadNativeForgePool = async (
  format: string,
  commander: CommanderOption | null,
  lynchpin: string,
  note = "",
  secondCommander: CommanderOption | null = null,
) => {
  let anchor: any = null;
  if (!commander && lynchpin) {
    const anchorResponse = await fetch(
      `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(lynchpin)}`,
      { headers: { Accept: "application/json" } },
    );
    if (anchorResponse.ok) anchor = await anchorResponse.json();
  }
  const noteColors = colorsFromNote(note);
  const commanderColors = [
    ...new Set([...(commander?.colors || []), ...(secondCommander?.colors || [])]),
  ];
  const colors = commanderColors.length
    ? commanderColors
    : noteColors.length
      ? noteColors
      : anchor?.color_identity?.length
        ? anchor.color_identity
        : [];
  const colorQuery = colors.length
    ? ` id<=${colors.join("").toLowerCase()}`
    : commander
      ? " id:c"
      : "";
  const query = encodeURIComponent(
    `${scryfallFormatTerms(format)}${colorQuery} -is:funny`,
  );
  const cards: NativeForgeCard[] = [];
  const seen = new Set<string>();
  const addRawCard = (rawCard: any, popularityRank?: number) => {
    const card = nativeCardFact(rawCard);
    const key = cardFactKey(card.name);
    if (!card.name || seen.has(key)) return;
    seen.add(key);
    if (popularityRank !== undefined) card.popularityRank = popularityRank;
    cards.push(card);
  };
  let nextUrl = `https://api.scryfall.com/cards/search?q=${query}&order=edhrec&unique=cards`;

  // Scryfall's edhrec ordering is a real, already-fetched signal for "how
  // good/played is this card" — free popularity evidence the engine used to
  // discard entirely for every non-Commander format. Rank position (not the
  // raw page) is threaded through so the engine can weigh it later.
  let popularityRank = 0;
  for (let page = 0; nextUrl && page < 4; page += 1) {
    const response = await fetch(nextUrl, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error("The verified card catalog is unavailable");
    const result = await response.json();
    for (const rawCard of result.data || []) {
      addRawCard(rawCard, popularityRank);
      popularityRank += 1;
    }
    nextUrl = result.has_more ? String(result.next_page || "") : "";
  }

  // Popularity pages are intentionally broad, but explicit player identity is
  // fetched directly so niche/lore themes cannot disappear before scoring.
  const blueprint = parseNativeBlueprintIntent({ note });
  const roleQueries: Record<string, string> = {
    counters: 'o:"+1/+1 counter"',
    tokens: "o:create o:token",
    sacrifice: "o:sacrifice",
    graveyard: "o:graveyard",
    artifacts: "(t:artifact OR o:artifact)",
    spells: '(o:"instant or sorcery" OR o:"noncreature spell")',
    lifegain: '(o:"gain life" OR kw:lifelink)',
    combat: "(o:combat OR o:attack)",
    discard: "o:discard",
  };
  const identityQueries = [
    ...blueprint.tribalTypes.map((term: string) => `(t:"${term}" OR o:"${term}" OR name:"${term}")`),
    ...blueprint.desiredRoles.map((role: string) => roleQueries[role]).filter(Boolean),
  ].slice(0, 6);
  for (const identityQuery of identityQueries) {
    const targetedUrl = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(`${scryfallFormatTerms(format)}${colorQuery} ${identityQuery} -is:funny`)}&order=name&unique=cards`;
    const response = await fetch(targetedUrl, { headers: { Accept: "application/json" } });
    if (!response.ok) continue;
    const result = await response.json();
    for (const rawCard of result.data || []) addRawCard(rawCard);
  }

  const anchorFitsColors =
    !anchor ||
    !colors.length ||
    (anchor.color_identity || []).every((color: string) => colors.includes(color));
  if (anchor && anchorFitsColors) {
    const fact = nativeCardFact(anchor);
    if (!seen.has(cardFactKey(fact.name))) cards.unshift(fact);
  }
  return { cards, colors };
};
const normalizeCommanderDeck = (
  text: string,
  commander: CommanderOption | null,
  format: string,
  secondCommander: CommanderOption | null = null,
) => {
  if (!commander || !isCommanderFormat(format)) return null;
  const target = targetDeckSize(format);
  const parsed = parseDeckRows(text).filter(
    (row) => Number.isFinite(row.quantity) && row.quantity > 0 && row.name,
  );
  const commanders = [commander, ...(secondCommander ? [secondCommander] : [])];
  const commanderKeys = new Set(
    commanders.flatMap((entry) => [entry.name, entry.name.split(" // ")[0]].map(cardFactKey)),
  );
  const merged = new Map<string, DeckRow>();
  for (const row of parsed) {
    const key = cardFactKey(row.name);
    if (commanderKeys.has(key)) continue;
    const basic = BASIC_LAND_KEYS.has(key);
    const existing = merged.get(key);
    if (existing) {
      if (basic) existing.quantity += row.quantity;
      continue;
    }
    merged.set(key, {
      name: row.name,
      quantity: basic ? row.quantity : 1,
    });
  }
  const rows: DeckRow[] = [
    ...commanders.map((entry) => ({ quantity: 1, name: entry.name })),
    ...merged.values(),
  ];
  let total = rows.reduce((sum, row) => sum + row.quantity, 0);

  // A near-complete list is repairable deterministically. A genuinely empty or
  // abbreviated answer should still retry instead of becoming a pile of basics.
  if (total < target - 20) return null;

  for (let index = rows.length - 1; total > target && index >= commanders.length; index -= 1) {
    const row = rows[index];
    const removable = BASIC_LAND_KEYS.has(cardFactKey(row.name))
      ? row.quantity
      : 1;
    const cut = Math.min(removable, total - target);
    row.quantity -= cut;
    total -= cut;
    if (row.quantity === 0) rows.splice(index, 1);
  }

  const combinedColors = [
    ...new Set(commanders.flatMap((entry) => entry.colors)),
  ];
  const colors = combinedColors.length ? combinedColors : ["C"];
  for (let index = 0; total < target; index += 1) {
    const land = BASIC_LANDS[colors[index % colors.length]] || "Wastes";
    const existing = rows.find((row) => cardFactKey(row.name) === cardFactKey(land));
    if (existing) existing.quantity += 1;
    else rows.push({ quantity: 1, name: land });
    total += 1;
  }
  return rows.map((row) => `${row.quantity} ${row.name}`).join("\n");
};
// Resolves a player's pasted decklist against the already-fetched pool plus
// one bulk Scryfall lookup for names not already present, honoring the
// project's "never fabricate" rule: unresolved or illegal-in-format names
// are excluded from construction and returned separately for disclosure,
// never silently dropped or auto-corrected.
const resolveImportedDecklist = async (
  text: string,
  poolCards: NativeForgeCard[],
  format: string,
  commander: CommanderOption | null,
): Promise<{
  importedRows: DeckRow[];
  pool: NativeForgeCard[];
  unresolvedNames: string[];
  illegalNames: string[];
}> => {
  const parsed = parseDeckRows(text).filter(
    (row) => Number.isFinite(row.quantity) && row.quantity > 0 && row.name,
  );
  const commanderKeys = commander
    ? new Set([commander.name, commander.name.split(" // ")[0]].map(cardFactKey))
    : new Set<string>();
  const merged = new Map<string, DeckRow>();
  for (const row of parsed) {
    const key = cardFactKey(row.name);
    if (commanderKeys.has(key)) continue;
    const existing = merged.get(key);
    if (existing) existing.quantity += row.quantity;
    else merged.set(key, { name: row.name, quantity: row.quantity });
  }
  const rows = [...merged.values()];

  const poolByKey = new Map(poolCards.map((card) => [cardFactKey(card.name), card]));
  const needsLookup = rows.filter((row) => {
    const key = cardFactKey(row.name);
    return !BASIC_LAND_KEYS.has(key) && !poolByKey.has(key);
  });

  const rawByKey = new Map<string, any>();
  const notFoundKeys = new Set<string>();
  for (let index = 0; index < needsLookup.length; index += 75) {
    const chunk = needsLookup.slice(index, index + 75);
    try {
      const response = await fetch("https://api.scryfall.com/cards/collection", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ identifiers: chunk.map((row) => ({ name: row.name })) }),
      });
      const data = await response.json();
      for (const rawCard of data.data || []) rawByKey.set(cardFactKey(rawCard.name), rawCard);
      for (const entry of data.not_found || []) if (entry?.name) notFoundKeys.add(cardFactKey(entry.name));
    } catch {
      for (const row of chunk) notFoundKeys.add(cardFactKey(row.name));
    }
  }

  const legalityKey = scryfallLegality(format);
  const arenaRequired = format === "Brawl" || format === "Standard Brawl";
  const importedRows: DeckRow[] = [];
  const additionalPoolCards: NativeForgeCard[] = [];
  const unresolvedNames: string[] = [];
  const illegalNames: string[] = [];
  for (const row of rows) {
    const key = cardFactKey(row.name);
    if (BASIC_LAND_KEYS.has(key)) {
      importedRows.push(row);
      continue;
    }
    if (poolByKey.has(key)) {
      // Already present in the verified, format-filtered pool — legal by
      // construction of the pool's own search query.
      importedRows.push({ name: poolByKey.get(key)!.name, quantity: row.quantity });
      continue;
    }
    const raw = rawByKey.get(key);
    if (!raw) {
      unresolvedNames.push(row.name);
      continue;
    }
    const legality = raw.legalities?.[legalityKey];
    if (legality !== "legal" || (arenaRequired && !raw.games?.includes("arena"))) {
      illegalNames.push(row.name);
      continue;
    }
    importedRows.push({ name: raw.name, quantity: row.quantity });
    additionalPoolCards.push(nativeCardFact(raw));
  }

  return {
    importedRows,
    pool: [...poolCards, ...additionalPoolCards],
    unresolvedNames,
    illegalNames,
  };
};

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
const cardGroup = (fact?: CardFact, isCommander = false) => {
  const type = [
    fact?.type_line,
    ...(fact?.card_faces || []).map((face) => face.type_line),
  ]
    .filter(Boolean)
    .join(" // ");
  if (isCommander) return "Commander";
  if (/Land/i.test(type)) return "Lands";
  if (/Enchantment/i.test(type)) return "Enchantments";
  if (/Creature/i.test(type)) return "Creatures";
  if (/Planeswalker/i.test(type)) return "Planeswalkers";
  if (/Instant/i.test(type)) return "Instants";
  if (/Sorcery/i.test(type)) return "Sorceries";
  if (/Artifact/i.test(type)) return "Artifacts";
  if (/Battle/i.test(type)) return "Battles";
  return "Other";
};
// Nonfoil market price is preferred; foil-only cards (some promos/showcase
// treatments) fall back to the foil price rather than reading as free.
// Basics and other truly priceless cards correctly return null, not 0 — a
// real $0.00 card and "no price data yet" are different things.
const cardPriceUsd = (fact?: CardFact): number | null => {
  const raw = fact?.prices?.usd ?? fact?.prices?.usd_foil;
  const value = Number(raw);
  return raw != null && Number.isFinite(value) ? value : null;
};
const cardRole = (fact?: CardFact) => {
  const text = [
    fact?.type_line,
    fact?.oracle_text,
    ...(fact?.card_faces || []).flatMap((face) => [face.type_line, face.oracle_text]),
  ]
    .filter(Boolean)
    .join(" ");
  if (/Land/i.test(text)) return "Mana source";
  if (/destroy all|exile all|all creatures|get -\d+\/-\d+/i.test(text)) return "Board reset";
  if (/counter target spell|destroy target|exile target|deals? \d+ damage/i.test(text)) return "Interaction";
  if (/add .+ mana|search your library for .+ land|treasure token/i.test(text)) return "Acceleration";
  if (/draw (?:a|one|two|three|\d+)|look at the top|exile .+ you may play/i.test(text)) return "Card advantage";
  if (/hexproof|indestructible|protection from|phase out|regenerate/i.test(text)) return "Protection";
  if (/create .+ token|whenever|for each|double|copy/i.test(text)) return "Engine piece";
  if (/Creature|Planeswalker/i.test(text)) return "Threat";
  return "Flexible support";
};
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
} as const;

const blueprintDefinition = (
  category: keyof typeof BLUEPRINT_DEFINITIONS,
  value: string,
) => (BLUEPRINT_DEFINITIONS[category] as Record<string, string>)[value] || "The Forge will explain this choice as its card pool and rules are verified.";

// Sealed -> revealed ceremony for one Masterwork in the three-reveal chamber.
// Kept at module level (not nested inside Home) so it mounts once per card
// instead of being redefined — and its local `revealed` state — every render.
type MasterworkCardProps = {
  poolIndex: number;
  featured?: boolean;
  alignedWork: Masterwork;
  preview: DeckPreview;
  commander: CommanderOption | null;
  insight: ReturnType<typeof masterworkInsight>;
  format: string;
  onInspect: () => void;
};

function MasterworkCard({ poolIndex, featured = false, alignedWork, preview, commander, insight, format, onInspect }: MasterworkCardProps) {
  const [revealed, setRevealed] = useState(featured);
  return (
    <article
      className={`masterwork-card ${alignedWork.tone}${featured ? " is-featured" : ""}`}
      data-state={revealed ? "revealed" : "sealed"}
    >
      {revealed ? (
        <>
          <div className="masterwork-card-kicker">
            <span>{featured ? "THE FORGE'S RECOMMENDATION" : `ALTERNATE MASTERWORK ${String(poolIndex + 1).padStart(2, "0")}`}</span>
            {featured && <b>BEST BLUEPRINT MATCH</b>}
          </div>
          <div className="masterwork-title">
            <i>{alignedWork.rune}</i>
            <div>
              <small>
                <GlossaryText text={alignedWork.path} /> · {format}
              </small>
              <h2>{alignedWork.name}</h2>
            </div>
          </div>
          <div className="masterwork-glimpse">
            <span
              className="commander-inspector"
              tabIndex={0}
              aria-label={`Inspect ${preview.card} rules`}
            >
              <img
                src={commander?.image || cardImage(preview.card)}
                alt={`${preview.card} card`}
                loading="lazy"
              />
              <span className="commander-zoom" role="tooltip">
                <img
                  src={cardImage(preview.card)}
                  alt={`${preview.card} enlarged card`}
                />
                <span>
                  <b>{preview.card}</b>
                  <small>{commander?.typeLine || preview.role}</small>
                  <em>
                    {insight.oracle ||
                      "The full card image contains the verified rules text."}
                  </em>
                </span>
              </span>
            </span>
            <div>
              <small>{preview.role}</small>
              <strong>{preview.card}</strong>
              {commander && (
                <small className="identity-name">
                  <GlossaryText text={colorIdentityName(commander.colors)} /> · {commander.colors.join("") || "C"}
                </small>
              )}
              <p><b>HOW IT STARTS</b><GlossaryText text={insight.opening} /></p>
              <em>
                <b>HOW IT WINS</b>
                <GlossaryText text={insight.win} />
              </em>
            </div>
          </div>
          <div className="masterwork-plan">
            <span>
              <small>IMPORTANT PIECES</small>
              <b><GlossaryText text={insight.packages.join(" · ")} /></b>
            </span>
            <span>
              <small>MAIN TRADEOFF</small>
              <b><GlossaryText text={insight.weakness} /></b>
            </span>
          </div>
          <div className="masterwork-stats">
            {["Aggression", "Interaction", "Synergy", "Complexity"].map(
              (label, statIndex) => (
                <span key={label}>
                  <small><GlossaryText text={label} /> · estimate</small>
                  <b>{masterworkStats(commander, poolIndex)[statIndex]}</b>
                </span>
              ),
            )}
          </div>
          <p className="masterwork-verdict"><GlossaryText text={alignedWork.verdict} /></p>
          <button onClick={onInspect}>
            {featured ? "Enter the recommended Masterwork" : "Compare this Masterwork"} <b>→</b>
          </button>
        </>
      ) : (
        <button
          type="button"
          className="masterwork-seal"
          onClick={() => setRevealed(true)}
          aria-label={`Reveal Masterwork ${poolIndex + 1}`}
        >
          <small>MASTERWORK {String(poolIndex + 1).padStart(2, "0")}</small>
          <i>{alignedWork.rune}</i>
          <b>Reveal this Masterwork</b>
        </button>
      )}
    </article>
  );
}

export default function Home() {
  const [chamber, setChamber] = useState<Chamber>("entrance");
  const [stage, setStage] = useState(0);
  const [format, setFormat] = useState("Standard");
  const [strategy, setStrategy] = useState("Balanced midrange");
  const [complexity, setComplexity] = useState("Balanced");
  const [budget, setBudget] = useState("No strict limit");
  const [readingSize, setReadingSize] = useState<ReadingSize>("comfortable");
  const [motionMode, setMotionMode] = useState<MotionMode>("full");
  const [forgeAction, setForgeAction] = useState<ForgeAction>("none");
  const [actionPulse, setActionPulse] = useState(0);
  const [actionPoint, setActionPoint] = useState({ x: 50, y: 52 });
  const [deck, setDeck] = useState("");
  const [commissionNote, setCommissionNote] = useState("");
  const [commanderQuery, setCommanderQuery] = useState("");
  const [commanderResults, setCommanderResults] = useState<CommanderOption[]>(
    [],
  );
  const [selectedCommander, setSelectedCommander] =
    useState<CommanderOption | null>(null);
  const [commanderSearching, setCommanderSearching] = useState(false);
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
  const [secondCommanderSearching, setSecondCommanderSearching] =
    useState(false);
  const [randomizingCommander, setRandomizingCommander] = useState(false);
  const [randomCommanderMode, setRandomCommanderMode] = useState(false);
  const [randomCommanderOptions, setRandomCommanderOptions] = useState<
    CommanderOption[]
  >([]);
  const [seenRandomCommanders, setSeenRandomCommanders] = useState<string[]>(
    [],
  );
  const [selectedWork, setSelectedWork] = useState(0);
  const [masterworkPage, setMasterworkPage] = useState(0);
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
  const [opponentArchetype, setOpponentArchetype] = useState("Unknown / not sure");
  const [matchLog, setMatchLog] = useState<Array<{
    id: string;
    result: "win" | "loss";
    opponent: string;
    signal: string;
    playedAt: string;
    revision?: number;
  }>>([]);
  const [revisions, setRevisions] = useState<
    Array<{ deck: string; note: string; createdAt: string; recommendationRecord?: any }>
  >([]);
  // Holds the current native engine pass (selected candidate and all ranked
  // candidates) so the experiment tablets can run the one-slot laboratory
  // against every candidate without recomputing the Forge. Only available
  // after a fresh inspectMasterwork() call; null for restored saved decks,
  // which carry no live engine context.
  const [nativeMasterworkContext, setNativeMasterworkContext] = useState<{
    selected: any;
    candidates: any[];
    options: { format: string; strategy: string; target: number };
    manaConsistency?: any;
    unusedEnginePartners?: any[];
  } | null>(null);
  // Non-fatal disclosure for the decklist-import path: names the Forge could
  // not verify or that aren't legal in this format, left out rather than
  // silently dropped or auto-corrected. Distinct from forgeGenerationError,
  // which means generation failed entirely.
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [cardFacts, setCardFacts] = useState<Record<string, CardFact>>({});
  const [hoveredCard, setHoveredCard] = useState("");
  const [cardOrder, setCardOrder] = useState<string[]>([]);
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
  const [benchOpen, setBenchOpen] = useState(false);
  const [cardSearch, setCardSearch] = useState("");
  const [cardSearchResults, setCardSearchResults] = useState<
    CardSearchResult[]
  >([]);
  const [consideringCards, setConsideringCards] = useState<DeckRow[]>([]);
  const [removedCards, setRemovedCards] = useState<DeckRow[]>([]);
  const [editAnvilOpen, setEditAnvilOpen] = useState(false);
  const [forgeGenerationError, setForgeGenerationError] = useState("");
  const [forgeStartedAt, setForgeStartedAt] = useState<number | null>(null);
  const [forgeElapsedSeconds, setForgeElapsedSeconds] = useState(0);
  const [replacementRecommendations, setReplacementRecommendations] = useState<
    CardSearchResult[]
  >([]);
  const [replacementLoading, setReplacementLoading] = useState(false);
  const [lastCutCard, setLastCutCard] = useState("");
  const [metaBreakerExperiments, setMetaBreakerExperiments] = useState<MetaBreakerExperiment[]>([]);
  const [metaBreakerLoading, setMetaBreakerLoading] = useState(false);
  const [selectedSystemId, setSelectedSystemId] = useState("");
  const [resultViewMode, setResultViewMode] = useState<"guided" | "full">("guided");
  const [intelligenceOpen, setIntelligenceOpen] = useState(false);
  const [forgeInterventions, setForgeInterventions] = useState<ForgeIntervention[]>([]);
  const [interventionLearningReady, setInterventionLearningReady] = useState(false);
  const [showAllSystems, setShowAllSystems] = useState(false);
  const [matchEvidenceOpen, setMatchEvidenceOpen] = useState(false);
  const [activeForgeChapter, setActiveForgeChapter] = useState<1 | 2 | 3 | 4>(1);
  const [deckViewMode, setDeckViewMode] = useState<"workbench" | "ledger">("workbench");
  const [openingExperimentPending, setOpeningExperimentPending] = useState(false);
  const [openingExperimentFocus, setOpeningExperimentFocus] = useState("");
  const [furthestCommissionStep, setFurthestCommissionStep] = useState(0);

  useEffect(() => {
    try {
      const preferredView = window.localStorage.getItem("metaforge.resultViewMode");
      if (preferredView === "full" || preferredView === "guided") {
        setResultViewMode(preferredView);
      }
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
      setMilestoneMotion({
        kind: "masterwork-ready",
        eyebrow: "THE GREAT FORGE ANSWERS",
        label: "Three Masterworks Survived",
        glyph: "ᛞ",
      });
    }
  }, [chamber]);

  useEffect(() => {
    window.localStorage.setItem("metaforge.resultViewMode", resultViewMode);
    setIntelligenceOpen(resultViewMode === "full");
    setMatchEvidenceOpen(resultViewMode === "full");
  }, [resultViewMode]);

  useEffect(() => {
    if (!interventionLearningReady) return;
    window.localStorage.setItem(
      "metaforge.interventionLearning",
      JSON.stringify(forgeInterventions.slice(-80)),
    );
  }, [forgeInterventions, interventionLearningReady]);

  const randomCommission =
    randomCommanderMode &&
    Boolean(
      selectedCommander &&
      seenRandomCommanders.includes(selectedCommander.name),
    );
  useEffect(() => {
    if (chamber !== "forging") return;
    if (stage >= FORGING_STAGES.length - 1) {
      const reveal = window.setTimeout(() => {
        // A pasted decklist or a commander already locked in (outside the
        // "surprise me" flow, where the reveal is three different
        // commanders) means there's no real ambiguity to resolve with three
        // alternates — build the one deck the player actually asked for.
        if (deck.trim()) {
          void commitDirectForge("decklist");
          return;
        }
        if (isCommanderFormat(format) && selectedCommander && !randomCommission) {
          void commitDirectForge("commander");
          return;
        }
        setChamber("masterworks");
      }, 1500);
      return () => window.clearTimeout(reveal);
    }
    const timer = window.setTimeout(() => setStage((value) => value + 1), 1150);
    return () => window.clearTimeout(timer);
  }, [chamber, stage, deck, format, selectedCommander, randomCommission]);

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
    setMilestoneMotion({ kind: "ignition", eyebrow: "BLUEPRINT SEALED", label: "Awakening the Great Forge", glyph: "ᚠ" });
    setCommissionSeed(Date.now());
    setStage(0);
    setMasterworkPage(0);
    setSelectedWork(0);
    setChamber("forging");
  };
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
  useEffect(() => {
    setFurthestCommissionStep((current) => Math.max(current, chapter));
  }, [chapter]);
  const visitCommissionStep = (step: number) => {
    if (step > furthestCommissionStep) return;
    if (step === 0) setChamber("entrance");
    if (step === 1) setChamber(deck.trim() ? "refine" : "commission");
    if (step === 2) {
      setStage(Math.max(0, FORGING_STAGES.length - 1));
      setChamber("forging");
    }
    if (step === 3) setChamber("masterworks");
  };
  const masterworks = useMemo(
    () => createMasterworks(commissionSeed, selectedCommander?.name, commissionNote),
    [commissionSeed, selectedCommander?.name, commissionNote],
  );
  const visibleMasterworks = useMemo(
    () => masterworks.slice(masterworkPage * 3, masterworkPage * 3 + 3),
    [masterworkPage, masterworks],
  );
  const commanderFor = (index: number) =>
    randomCommission && randomCommanderOptions.length === 3
      ? randomCommanderOptions[index % 3]
      : selectedCommander;
  const workFor = (index: number) => {
    const work = masterworks[index];
    return randomCommission
      ? alignRandomMasterwork(work, commanderFor(index), index)
      : work;
  };
  const previewFor = (index: number) => {
    const base = (FORMAT_PREVIEWS[
      format === "Standard Brawl" ? "Brawl" : format
    ] ?? FORMAT_PREVIEWS.Standard)[index % 3];
    const commander = commanderFor(index);
    return commander && isCommanderFormat(format)
      ? {
          ...base,
          card: commander.name,
          role: randomCommission
            ? "Commander · discovered by the Forge"
            : "Commander · chosen in your Blueprint",
          theme:
            commissionNote.trim() ||
            `A ${commander.colors.join("")} identity commission built around this commander.`,
        }
      : base;
  };
  const chosenPreview = previewFor(selectedWork);
  const chosenWork = restoredWork || workFor(selectedWork);
  const currentFamilyArchived = Boolean(
    savedMasterworks.find((family) => family.id === deckId)?.archived,
  );
  const deckRows = useMemo(() => parseDeckRows(forgedDeck), [forgedDeck]);
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
      [chosenPreview.card, selectedSecondCommander?.name]
        .filter(Boolean)
        .map((name) => cardFactKey(name as string)),
    );
    const groups: Record<string, DeckRow[]> = {};
    for (const row of orderedDeckRows) {
      const group = cardGroup(
        cardFacts[cardFactKey(row.name)],
        isCommanderFormat(format) && commanderKeys.has(cardFactKey(row.name)),
      );
      (groups[group] ||= []).push(row);
    }
    return groups;
  }, [orderedDeckRows, cardFacts, format, chosenPreview.card, selectedSecondCommander?.name]);
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
      const price = cardPriceUsd(cardFacts[cardFactKey(row.name)]);
      if (price === null) {
        unpricedCards += row.quantity;
        continue;
      }
      total += price * row.quantity;
      pricedCards += row.quantity;
    }
    return { total, pricedCards, unpricedCards };
  }, [deckRows, cardFacts]);
  const activeCard =
    hoveredCard || chosenPreview.card || deckRows[0]?.name || "";
  const activeFact = cardFacts[cardFactKey(activeCard)];
  const activeImage =
    activeFact?.image_uris?.normal ||
    activeFact?.card_faces?.[0]?.image_uris?.normal ||
    (activeCard ? cardImage(activeCard) : "");
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
    const commanderKey = cardFactKey(chosenPreview.card);
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
  }, [deckRows, cardFacts, format, chosenPreview.card, selectedCommander, selectedSecondCommander]);
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
          cmc: Number(fact?.cmc || 0),
          isCommander:
            isCommanderFormat(format) &&
            cardFactKey(row.name) ===
              cardFactKey(chosenPreview.card),
        };
      }),
    [
      deckRows,
      cardFacts,
      format,
      chosenPreview.card,
    ],
  );

  const baseStructuralAnalysis = useMemo(
    () =>
      buildForgeStructuralAnalysis(
        structuralCards,
        {
          commanderName: chosenPreview.card,
        },
      ),
    [
      structuralCards,
      chosenPreview.card,
    ],
  );

  const interactionGraph =
    baseStructuralAnalysis.graph;

  const forgeSystemsReport =
    baseStructuralAnalysis.systems;


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
  const simulationDossier = useMemo(() => {
    if (!deckIntegrity.passed) return null;
    const roleMap: Record<string, string> = {
      "Mana source": "land",
      "Board reset": "sweeper",
      Interaction: "removal",
      Acceleration: "stabilizer",
      "Card advantage": "draw",
      Protection: "counter",
      "Engine piece": "finisher",
      Threat: "finisher",
      "Flexible support": "stabilizer",
    };
    const model = deckRows.map((row) => {
      const fact = cardFacts[cardFactKey(row.name)];
      const role = roleMap[cardRole(fact)] || "stabilizer";
      return {
        quantity: row.quantity,
        card: row.name,
        role,
        cmc: Number(fact?.cmc || 0),
        // Real color data lets the goldfish sim tell a genuine color-screw
        // risk apart from an ordinary mulligan — land rows carry which
        // colors they can tap for, spell rows carry their actual pip cost.
        colorIdentity: role === "land" ? fact?.color_identity || [] : undefined,
        colorPips: role === "land" ? undefined : colorPipsFromCost(fact?.mana_cost || ""),
      };
    });
    const strategyName = /aggro|pressure/i.test(strategy)
      ? "Aggro"
      : /control/i.test(strategy)
        ? "Control"
        : /tempo/i.test(strategy)
          ? "Tempo"
          : "Midrange";
    return {
      goldfish: evaluateSimulationGate(model, strategyName, 1200, 8128),
      matrix: evaluateMatchupMatrix(model, undefined, 900, 991),
    };
  }, [deckIntegrity.passed, deckRows, cardFacts, strategy]);

  const forgeFailureAnalysis = useMemo(
    () =>
      buildBoundedFailureAnalysis(
        forgeSystemsReport,
        simulationDossier,
      ),
    [forgeSystemsReport, simulationDossier],
  );

  const structuralAnalysis = useMemo(
    () =>
      buildForgeStructuralAnalysis(
        structuralCards,
        {
          commanderName:
            chosenPreview.card,
          simulationDossier,
        },
      ),
    [
      structuralCards,
      chosenPreview.card,
      simulationDossier,
    ],
  );

  const forgeCausalityReport =
    structuralAnalysis.causality;

  const experimentTablets = useMemo(() => {
    if (!nativeMasterworkContext) return null;
    return buildExperimentTablets({
      selected: nativeMasterworkContext.selected,
      candidates: nativeMasterworkContext.candidates,
      causalityReport: forgeCausalityReport,
      matchLog,
      options: nativeMasterworkContext.options,
    });
  }, [nativeMasterworkContext, forgeCausalityReport, matchLog]);

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
  const revisionLearning = useMemo(
    () => learnRevisionPreferences(matchLog, Math.max(1, revisions.length)),
    [matchLog, revisions.length],
  );
  const interventionLearning = useMemo(
    () => learnFromForgeInterventions(forgeInterventions, matchLog),
    [forgeInterventions, matchLog],
  );
  const verifiedDeckFacts = useMemo(
    () =>
      [
        ...new Map(
          Object.values(cardFacts).map((fact) => [fact.name, fact]),
        ).values(),
      ]
        .map((fact) => {
          const faces = fact.card_faces
            ?.map(
              (face) =>
                `${face.name || fact.name} ${face.mana_cost || ""} · ${face.type_line || ""}\n${face.oracle_text || ""}`,
            )
            .join("\nTRANSFORMS TO\n");
          return `${fact.name} · ${fact.mana_cost || ""} · ${fact.type_line || ""} · Set: ${fact.set_name || "Unknown"} · Games: ${(fact.games || []).join(", ")} · ${format} legality: ${fact.legalities?.[scryfallLegality(format)] || "ruleset review required"}\n${faces || fact.oracle_text || ""}`;
        })
        .join("\n\n")
        .slice(0, 10000),
    [cardFacts, format],
  );

  useEffect(() => {
    const names = [
      ...new Set(parseDeckRows(forgedDeck).map((row) => row.name)),
    ];
    if (!names.length) {
      setCardFacts({});
      return;
    }
    let cancelled = false;
    (async () => {
      const next: Record<string, CardFact> = {};
      for (let index = 0; index < names.length; index += 75) {
        try {
          const response = await fetch(
            "https://api.scryfall.com/cards/collection",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
              },
              body: JSON.stringify({
                identifiers: names
                  .slice(index, index + 75)
                  .map((name) => ({ name })),
              }),
            },
          );
          const data = await response.json();
          for (const fact of data.data || []) indexCardFact(next, fact);
          for (const requestedName of names.slice(index, index + 75)) {
            if (next[cardFactKey(requestedName)]) continue;
            try {
              const fallback = await fetch(
                `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(requestedName)}`,
              );
              if (fallback.ok)
                indexCardFact(next, await fallback.json(), requestedName);
            } catch {
              /* A later deck refresh can retry this individual card. */
            }
            await new Promise((resolve) => window.setTimeout(resolve, 80));
          }
        } catch {
          /* Named image fallback remains available. */
        }
        if (index + 75 < names.length)
          await new Promise((resolve) => window.setTimeout(resolve, 120));
      }
      if (!cancelled) setCardFacts(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [forgedDeck]);

  useEffect(() => {
    setCardOrder(deckRows.map((row) => row.name));
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
      } catch {
        /* History remains available after the account reconnects. */
      }
    })();
  }, []);

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
    if (
      !isCommanderFormat(format) ||
      commanderQuery.trim().length < 2 ||
      selectedCommander?.name === commanderQuery.trim()
    ) {
      setCommanderResults([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      setCommanderSearching(true);
      try {
        const query = encodeURIComponent(
          `${scryfallFormatTerms(format)} is:commander name:${commanderQuery.trim()}`,
        );
        const response = await fetch(
          `https://api.scryfall.com/cards/search?q=${query}&order=name`,
        );
        const data = await response.json();
        setCommanderResults((data.data || []).slice(0, 8).map(commanderOption));
      } catch {
        setCommanderResults([]);
      } finally {
        setCommanderSearching(false);
      }
    }, 320);
    return () => window.clearTimeout(timer);
  }, [commanderQuery, format, selectedCommander?.name]);

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
        .querySelectorAll<HTMLButtonElement>(".type-column>button")
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
    setReplacementLoading(true);
    try {
      const prompt = `A player cut ${cut.name} from this ${format} deck. Recommend exactly three legal one-card replacements that best preserve or deliberately improve its role in this specific deck. Respect the commander, color identity, strategy, and current list. Return ONLY three lines formatted exactly as: 1 Card Name.`;
      const response = await fetch("/api/forge/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          depth: "balanced",
          messages: [{ role: "user", content: prompt }],
          context: {
            game: "mtg",
            deckName: chosenWork.name,
            format,
            deckText: nextDeck,
            verifiedFacts:
              verifiedDeckFacts ||
              selectedCommander?.verifiedFacts ||
              "Use conservative legal candidates.",
            coachingProfile: `Strategy: ${strategy}`,
          },
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error();
      const names = parseDeckRows(String(data.answer || ""))
        .map((row) => row.name)
        .slice(0, 3);
      const resolved: CardSearchResult[] = [];
      for (const name of names) {
        const cardResponse = await fetch(
          `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(name)}`,
        );
        if (!cardResponse.ok) continue;
        const card = await cardResponse.json();
        if (
          card.legalities?.[scryfallLegality(format)] !== "legal" ||
          ((format === "Brawl" || format === "Standard Brawl") &&
            !(card.games || []).includes("arena")) ||
          (format === "Standard Brawl" && card.legalities?.standard !== "legal")
        )
          continue;
        resolved.push({
          name: card.name,
          typeLine: card.type_line || "Card",
          image:
            card.image_uris?.small ||
            card.card_faces?.[0]?.image_uris?.small ||
            "",
        });
      }
      setReplacementRecommendations(resolved.slice(0, 3));
    } catch {
      setReplacementRecommendations([]);
    } finally {
      setReplacementLoading(false);
    }
  }

  async function chooseRandomCommander() {
    setRandomizingCommander(true);
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
      setSelectedCommander(starters[0]);
      setCommanderQuery("");
      setRandomCommanderMode(true);
      setRandomCommanderOptions(starters);
      setSeenRandomCommanders([...exclusions]);
      setCommissionSeed(Date.now());
      setStage(0);
      setMasterworkPage(0);
      setSelectedWork(0);
      setChamber("forging");
    } catch {
      setCommanderQuery("");
    } finally {
      setRandomizingCommander(false);
    }
  }

  async function recycleMasterworks() {
    if (randomizingCommander) return;
    if (!randomCommission) {
      setMasterworkPage((page) => page + 1);
      return;
    }
    setRandomizingCommander(true);
    try {
      const query = encodeURIComponent(
          `${scryfallFormatTerms(format)} is:commander`,
        ),
        exclusions = new Set(seenRandomCommanders),
        candidates: CommanderOption[] = [];
      for (let attempts = 0; candidates.length < 9 && attempts < 30; attempts += 1) {
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
      const next = arrangeCommanderStarters(candidates).slice(0, 3);
      if (next.length !== 3)
        throw new Error("Could not draw three unique commanders");
      setRandomCommanderOptions(next);
      setSeenRandomCommanders([...exclusions]);
      setMasterworkPage((page) => page + 1);
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
    });
    void persistStoryBench(
      firstRevision,
      { wins: 0, losses: 0 },
      opts.generationId,
      { work: opts.work, commander: opts.commander, index: opts.index },
    );
  }

  async function inspectMasterwork(index: number) {
    const work = workFor(index);
    const preview = previewFor(index);
    const commander = commanderFor(index);
    // Only carry a Partner/Background over when this masterwork actually
    // uses the commander it was chosen for — a "surprise me" reveal can
    // preview a different randomly-suggested commander per candidate, and
    // a partner picked for one shouldn't silently attach to another.
    const secondCommander =
      commander?.name === selectedCommander?.name ? selectedSecondCommander : null;
    const generationId = crypto.randomUUID();
    setRestoredWork(null);
    setDeckId(generationId);
    setSelectedWork(index);
    if (commander) setSelectedCommander(commander);
    setMilestoneMotion({ kind: "masterwork-selected", eyebrow: "DESIGN CHOSEN", label: work.name, glyph: work.rune || "ᛞ" });
    setChamber("workbench");
    setBenchStatus("forging");
    setForgeStartedAt(Date.now());
    setForgeElapsedSeconds(0);
    setForgeReply("");
    setForgeGenerationError("");
    setImportWarnings([]);
    setConsideringCards([]);
    setRemovedCards([]);
    setReplacementRecommendations([]);
    setLastCutCard("");
    setOpeningExperimentPending(true);
    setOpeningExperimentFocus("");
    setActiveForgeChapter(1);
    setDeckViewMode("workbench");

    let evidence: EdhrecEvidence | null = null;
    if (commander && isCommanderFormat(format)) {
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
      const pool = await loadNativeForgePool(format, commander, preview.card, commissionNote, secondCommander);
      const nativeReport = forgeNativeMasterwork({
        format,
        target: targetDeckSize(format),
        strategy,
        path: work.path,
        note: `${commissionNote}\n${interventionLearning.reusableGuidance}`.trim(),
        seed: hashText(`${commissionSeed}|${index}|${work.name}`),
        colors: pool.colors,
        commander: commander
          ? {
              name: commander.name,
              colors: commander.colors,
              oracleText: commander.verifiedFacts,
            }
          : null,
        secondCommander: secondCommander
          ? {
              name: secondCommander.name,
              colors: secondCommander.colors,
              oracleText: secondCommander.verifiedFacts,
            }
          : null,
        cards: pool.cards,
        evidence: evidence?.cards || [],
        budget,
        complexity,
      });
      await applyForgeResult(nativeReport, {
        generationId,
        work,
        commander,
        index,
        replyText: `${nativeReport.methodology}\n\n${nativeReport.selected.tournament.reason}\n${nativeReport.reasoning.summary}\n${nativeReport.laboratory.summary}${nativeReport.laboratory.verdict === "advance" ? `\nTest contract: ${nativeReport.laboratory.contract}` : ""}\nStructural read: ${nativeReport.selected.evaluation.cohesion}/100 cohesion, ${nativeReport.selected.evaluation.resilience}/100 resilience. ${nativeReport.tournament.frontier.length} of 3 candidates reached the tradeoff frontier. ${nativeReport.reasoning.boundary} ${nativeReport.laboratory.boundary}`,
        revisionNote: `Original native Forge candidate · ${nativeReport.selected.label}`,
      });
    } catch (error) {
      setForgedDeck("");
      setNativeMasterworkContext(null);
      setForgeGenerationError(
        error instanceof Error
          ? `${error.message}. Your commission is safe—strike the anvil again when verified card data is available.`
          : "The native Forge could not complete this candidate. Your commission is safe—strike the anvil again.",
      );
    } finally {
      setBenchStatus("idle");
      setForgeStartedAt(null);
    }
  }

  // Skips the three-masterwork reveal entirely: a pasted decklist or a
  // commander already locked in gives the Forge one clear thing to build,
  // so there's no real ambiguity to resolve with three alternates.
  async function commitDirectForge(mode: "decklist" | "commander") {
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
    setChamber("workbench");
    setBenchStatus("forging");
    setForgeStartedAt(Date.now());
    setForgeElapsedSeconds(0);
    setForgeReply("");
    setForgeGenerationError("");
    setImportWarnings([]);
    setConsideringCards([]);
    setRemovedCards([]);
    setReplacementRecommendations([]);
    setLastCutCard("");
    setOpeningExperimentPending(mode === "commander");
    setOpeningExperimentFocus("");
    setActiveForgeChapter(1);
    setDeckViewMode("workbench");

    let evidence: EdhrecEvidence | null = null;
    if (commander && isCommanderFormat(format)) {
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
      const pool = await loadNativeForgePool(format, commander, "", commissionNote, secondCommander);
      const commanderInput = commander
        ? { name: commander.name, colors: commander.colors, oracleText: commander.verifiedFacts }
        : null;
      const secondCommanderInput = secondCommander
        ? { name: secondCommander.name, colors: secondCommander.colors, oracleText: secondCommander.verifiedFacts }
        : null;

      if (mode === "decklist") {
        const resolution = await resolveImportedDecklist(deck, pool.cards, format, commander);
        setImportWarnings([
          ...resolution.unresolvedNames.map((name) => `"${name}" could not be verified and was left out.`),
          ...resolution.illegalNames.map((name) => `"${name}" is not legal in ${format} and was left out.`),
        ]);
        const nativeReport = forgeImportedMasterwork({
          format,
          target: targetDeckSize(format),
          strategy,
          path: "",
          note: `${commissionNote}\n${interventionLearning.reusableGuidance}`.trim(),
          seed: hashText(`${commissionSeed}|import|${deck.length}`),
          colors: pool.colors,
          commander: commanderInput,
          secondCommander: secondCommanderInput,
          cards: resolution.pool,
          importedRows: resolution.importedRows,
          evidence: evidence?.cards || [],
          budget,
          complexity,
        });
        await applyForgeResult(nativeReport, {
          generationId,
          work: directWork,
          commander,
          index: 0,
          replyText: `${nativeReport.methodology}\n\n${nativeReport.reasoning.summary}\n${nativeReport.laboratory.summary}${nativeReport.laboratory.verdict === "advance" ? `\nTest contract: ${nativeReport.laboratory.contract}` : ""}\n${nativeReport.reasoning.boundary} ${nativeReport.laboratory.boundary}`,
          revisionNote: "Adapted directly from your submitted list",
        });
      } else {
        const nativeReport = forgeNativeMasterwork({
          format,
          target: targetDeckSize(format),
          strategy,
          path: "",
          note: `${commissionNote}\n${interventionLearning.reusableGuidance}`.trim(),
          seed: hashText(`${commissionSeed}|commander|${commander?.name || ""}`),
          colors: pool.colors,
          commander: commanderInput,
          secondCommander: secondCommanderInput,
          cards: pool.cards,
          evidence: evidence?.cards || [],
          budget,
          complexity,
        });
        await applyForgeResult(nativeReport, {
          generationId,
          work: directWork,
          commander,
          index: 0,
          replyText: `${nativeReport.methodology}\n\n${nativeReport.selected.tournament.reason}\n${nativeReport.reasoning.summary}\n${nativeReport.laboratory.summary}${nativeReport.laboratory.verdict === "advance" ? `\nTest contract: ${nativeReport.laboratory.contract}` : ""}\nStructural read: ${nativeReport.selected.evaluation.cohesion}/100 cohesion, ${nativeReport.selected.evaluation.resilience}/100 resilience. ${nativeReport.reasoning.boundary} ${nativeReport.laboratory.boundary}`,
          revisionNote: `Built directly for ${commander?.name || "your commander"} · ${nativeReport.selected.label}`,
        });
      }
    } catch (error) {
      setForgedDeck("");
      setNativeMasterworkContext(null);
      setForgeGenerationError(
        error instanceof Error
          ? `${error.message}. Your commission is safe—strike the anvil again when verified card data is available.`
          : "The native Forge could not complete this candidate. Your commission is safe—strike the anvil again.",
      );
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
    setForgeReply("");
    setSwapFlourish(null);
    setImportWarnings([]);
    setBenchStatus("testing");
    setOpeningExperimentPending(false);
    setOpeningExperimentFocus("");
    setMilestoneMotion({ kind: "masterwork-selected", eyebrow: "MASTERWORK REOPENED", label: family.name, glyph: "ᛞ" });
    setChamber("workbench");
  }

  async function deleteSavedMasterwork(id: string) {
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
      activeCommander = meta?.commander ?? selectedCommander,
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

  async function repairDeckIntegrity() {
    if (benchStatus === "forging" || deckIntegrity.checking || !deckRows.length) return;
    setBenchStatus("forging");
    setForgeGenerationError("");
    const failedCards = [
      ...deckIntegrity.illegal,
      ...deckIntegrity.identityBreaks,
      ...deckIntegrity.copyBreaks,
      ...deckIntegrity.unresolved,
    ].map((row) => row.name);
    const prompt = `Repair this ${format} deck so every hard constraint passes. Preserve ${chosenWork.name}, its ${chosenWork.path} plan, and ${selectedCommander?.name || chosenPreview.card}. Problems detected by the deterministic validator: ${deckIntegrity.issues.join(" ")} Failed or unresolved card names: ${[...new Set(failedCards)].join(", ") || "none"}. Return the entire corrected import-ready list. Every decklist line must begin with a numeric quantity. Use exactly ${deckIntegrity.target} total cards. Do not include an incomplete alternative.`;
    try {
      const response = await fetch("/api/forge/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task: "deck_generation",
          depth: "deep",
          messages: [{ role: "user", content: prompt }],
          context: {
            game: "mtg",
            deckName: chosenWork.name,
            format,
            deckText: forgedDeck,
            verifiedFacts: `${selectedCommander?.verifiedFacts || ""}\n\n${verifiedDeckFacts}\n\n${formatEdhrecEvidence(edhrecEvidence, format)}`,
            coachingProfile: `Repair only failed constraints; preserve the player's ${strategy} intent.`,
          },
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Repair unavailable");
      let repaired = String(data.answer || "");
      const normalized = normalizeCommanderDeck(repaired, selectedCommander, format, selectedSecondCommander);
      if (normalized) repaired = normalized;
      const total = parseDeckRows(repaired).reduce((sum, row) => sum + row.quantity, 0);
      if (total !== deckIntegrity.target) throw new Error("Repair remained incomplete");
      const next = [
        ...revisions,
        { deck: repaired, note: `Deterministic integrity repair after revision ${revisions.length || 1}`, createdAt: new Date().toISOString() },
      ];
      setForgedDeck(repaired);
      setRevisions(next);
      void persistStoryBench(next, record);
    } catch {
      setForgeGenerationError("The repair did not clear every hard constraint. The current revision is preserved; strike the repair again or edit the flagged slots manually.");
    } finally {
      setBenchStatus("idle");
    }
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
            body: JSON.stringify({ identifiers: names.map((name) => ({ name })) }),
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
    setForgeInterventions((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        kind,
        summary,
        decision,
        revision,
        createdAt: new Date().toISOString(),
      },
    ]);
  }

  function recordMatch(result: "win" | "loss", signal = "No single lesson isolated") {
    const next =
      result === "win"
        ? { ...record, wins: record.wins + 1 }
        : { ...record, losses: record.losses + 1 };
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
        revision: Math.max(1, revisions.length),
      },
    ];
    setMatchLog(nextMatches);
    setPendingMatchResult(null);
    setMilestoneMotion({
      kind: "evidence-recorded",
      eyebrow: "EVIDENCE PRESERVED",
      label: `${result === "win" ? "WIN" : "LOSS"} · ${opponentArchetype}`,
      glyph: "ᛇ",
    });
    void persistStoryBench(revisions, next, "", undefined, nextMatches);
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
          <i>MF</i>
          <span>
            METAFORGE<small>THE GREAT FORGE</small>
          </span>
        </button>
        <nav className="forge-steps" aria-label="Commission progress">
          {[
            ["01", "Entrance"],
            ["02", "Blueprint"],
            ["03", "The Forge"],
            ["04", "Masterworks"],
          ].map(([number, label], index) => (
            <button
              type="button"
              className={`${chapter >= index ? "lit" : ""} ${chapter === index ? "current" : ""}`}
              key={label}
              disabled={index > furthestCommissionStep}
              aria-current={chapter === index ? "step" : undefined}
              onClick={() => visitCommissionStep(index)}
            >
              <b>{number}</b>
              {label}
            </button>
          ))}
        </nav>
        <div className="forge-reading-tools">
          <span>TEXT</span>
          {(["compact", "comfortable", "large"] as ReadingSize[]).map((size, index) => (
            <button
              type="button"
              key={size}
              className={readingSize === size ? "active" : ""}
              aria-label={`Use ${size} text`}
              aria-pressed={readingSize === size}
              onClick={() => setReadingSize(size)}
            >
              A{index === 0 ? "−" : index === 2 ? "+" : ""}
            </button>
          ))}
          <button
            type="button"
            className={`motion-toggle ${motionMode === "full" ? "active" : ""}`}
            aria-label={motionMode === "full" ? "Use quiet Forge motion" : "Use full Forge motion"}
            aria-pressed={motionMode === "full"}
            title={motionMode === "full" ? "Quiet Forge motion" : "Full Forge motion"}
            onClick={() => setMotionMode((current) => current === "full" ? "quiet" : "full")}
          >
            FX
          </button>
          <IdentityBadge
            depth={playerIdentity.depth}
            totalMilestones={playerIdentity.allMilestones.length}
            dominantMotif={playerIdentity.dominantMotif}
            accent={playerIdentity.accent}
            celebrating={Boolean(identityCelebration)}
            celebrationLabel={identityCelebration?.label ?? null}
          />
          <button className="quiet-action" onClick={() => setChamber("entrance")}>
            New commission
          </button>
        </div>
      </header>

      {chamber === "entrance" && (
        <section className="forge-entrance">
          <div className="entrance-copy">
            <span className="forge-eyebrow">
              <i /> THE GREAT FORGE AWAITS
            </span>
            <h1>
              What do you want
              <br />
              to <em>create today?</em>
            </h1>
            <p>
              Every legendary deck begins as a blueprint. Commission a new
              design or bring an existing build to the anvil for refinement.
            </p>
            <div className="entrance-actions">
              <ForgeCommissionCard
                eyebrow="COMMISSION I"
                title="Forge a new deck"
                description="Shape a masterwork from a fresh blueprint."
                cta="Enter the drafting chamber →"
                tone="ember"
                motionMode={motionMode}
                onActivate={() => {
                  // A blank commission must actually be blank — a decklist
                  // pasted in an earlier refinement session should never
                  // silently carry over and skip the three-reveal here.
                  setDeck("");
                  setChamber("commission");
                }}
              />
              <ForgeCommissionCard
                eyebrow="COMMISSION II"
                title="Refine a current build"
                description="Bring an existing deck to the anvil."
                cta="Enter the refinement chamber →"
                tone="teal"
                motionMode={motionMode}
                onActivate={() => setChamber("refine")}
              />
            </div>
          </div>
          <div className="entrance-visual" aria-label="The Great Forge, ever-burning">
            <div className="entrance-living-forge" aria-hidden="true">
              <video
                className="entrance-ember-film"
                src="/assets/forge/vfx/entrance-embers.mp4"
                poster="/forge-hero.webp"
                autoPlay
                loop
                muted
                playsInline
              />
              <video
                className="entrance-aperture-film"
                src="/assets/forge/vfx/entrance-aperture.mp4"
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
              THE ARCHIVE IS LISTENING
              <small>Every lesson. Every failure. Every masterwork.</small>
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
          <button className="back-link" onClick={() => setChamber("entrance")}>
            ← Return to the Forge Entrance
          </button>
          <div className="commission-heading">
            <span className="forge-eyebrow">
              <i />{" "}
              {chamber === "commission"
                ? "COMMISSION I · THE BLUEPRINT"
                : "COMMISSION II · THE ANVIL"}
            </span>
            <h1>
              {chamber === "commission"
                ? "Describe the weapon you want to wield."
                : "Bring your deck to the anvil."}
            </h1>
            <p>
              {chamber === "commission"
                ? "These marks become constraints—not decoration. The Forge will honor how you want to play."
                : "The Forge will preserve what works, expose the fracture, and temper one deliberate change."}
            </p>
          </div>
          <div className="commission-scroll">
            {chamber === "refine" && (
              <label className="deck-offering">
                <span>YOUR CURRENT DECKLIST</span>
                <textarea
                  value={deck}
                  onChange={(event) => setDeck(event.target.value)}
                  placeholder="Paste your Arena, MTGO, or Moxfield list here…"
                />
              </label>
            )}
            <div className="mark-grid">
              <label>
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
              <label>
                <span>
                  HOW SHOULD IT FIGHT?
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
              <label>
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
              <label>
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
            </div>
            {isCommanderFormat(format) && (
              <section className="commander-blueprint">
                <header>
                  <div>
                    <span>COMMANDER · LEGAL {format.toUpperCase()} INDEX</span>
                    <strong>
                      {selectedCommander
                        ? "Commander bound to this Blueprint"
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
                    <img src={selectedCommander.image} alt="" />
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
                  <div className="commander-search">
                    <div className="commander-choice">
                      <input
                        value={commanderQuery}
                        onChange={(event) =>
                          setCommanderQuery(event.target.value)
                        }
                        placeholder={`Search legal ${format} commanders…`}
                        aria-label={`Search legal ${format} commanders`}
                      />
                      <button
                        type="button"
                        disabled={randomizingCommander}
                        onClick={chooseRandomCommander}
                      >
                        {randomizingCommander
                          ? "Drawing three starter legends…"
                          : "Surprise me · reveal three commanders"}
                      </button>
                    </div>
                    {(commanderSearching ||
                      commanderResults.length > 0 ||
                      commanderQuery.trim().length > 1) && (
                      <div role="listbox">
                        {commanderSearching ? (
                          <p>The Archive is searching…</p>
                        ) : commanderResults.length ? (
                          commanderResults.map((option) => (
                            <button
                              type="button"
                              role="option"
                              key={option.name}
                              onClick={() => {
                                setSelectedCommander(option);
                                setCommanderQuery(option.name);
                                setCommanderResults([]);
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
                        ) : (
                          <p>
                            No legal {format} commander matches that search.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {selectedCommander && partnerEligibility && (
                  <div className="commander-search">
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
                        {(secondCommanderSearching ||
                          secondCommanderResults.length > 0) && (
                          <div role="listbox">
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
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </section>
            )}
            <label className="commission-note">
              <span>THE ONE THING THE FORGE MUST UNDERSTAND</span>
              <textarea
                value={commissionNote}
                onChange={(event) => setCommissionNote(event.target.value)}
                placeholder="Favorite cards, play patterns you love, or anything this deck must never become…"
              />
            </label>
            <button
              className="awaken-button"
              disabled={
                (chamber === "refine" && !deck.trim()) ||
                (isCommanderFormat(format) && !selectedCommander)
              }
              onClick={awaken}
            >
              <span>
                {isCommanderFormat(format) && !selectedCommander
                  ? "Choose a legal commander to seal the Blueprint"
                  : "Seal the commission"}
              </span>
              <strong>AWAKEN THE GREAT FORGE</strong>
              <b>→</b>
            </button>
          </div>
        </section>
      )}

      {chamber === "forging" && (
        <section className="forging-ceremony" aria-live="polite">
          <ForgeCeremonyMotion stage={stage} motionMode={motionMode} />
          <div className="ceremony-copy">
            <span className="forge-eyebrow">
              <i /> COMMISSION ACCEPTED
            </span>
            <h1>{FORGING_STAGES[stage][0]}</h1>
            <p>{FORGING_STAGES[stage][1]}</p>
            <div className="candidate-count">
              <strong>{FORGING_STAGES[stage][2]}</strong>
              <span>
                CANDIDATE DESIGNS
                <br />
                REMAINING
              </span>
            </div>
            <div className="ceremony-progress">
              <span>
                <b style={{ width: `${progress}%` }} />
              </span>
              <small>
                FORGING STAGE {stage + 1} OF {FORGING_STAGES.length}
              </small>
            </div>
          </div>
        </section>
      )}

      {chamber === "masterworks" && (
        <section className="masterwork-reveal">
          <header>
            <span className="forge-eyebrow">
              <i /> THE GREAT FORGE ANSWERS <i />
            </span>
            <h1>
              The Forge has chosen.
              <br />
              <em>One design leads.</em>
            </h1>
            <p>
              This recommendation best matches your {format} commission and
              <strong> {strategy.toLowerCase()}</strong> direction. Two alternate
              paths remain available when you want a different tradeoff.
            </p>
          </header>
          {commissionNote.trim() && (
            <section className="blueprint-promise" aria-label="Blueprint promise">
              <span>
                <small>THE FORGE HEARD YOU</small>
                <b>{commissionNote.trim()}</b>
              </span>
              <p>
                Every Masterwork below must honor this identity before general
                optimization. If the verified legal pool cannot support part of
                it, the Forge will say so instead of silently replacing it.
              </p>
            </section>
          )}
          <div className="masterwork-actions">
            <span>
              REVEAL {masterworkPage + 1} · {masterworkPage * 3 + 1}–
              {masterworkPage * 3 + visibleMasterworks.length} SEEN THIS
              COMMISSION
            </span>
            <button
              className="masterwork-recycle"
              disabled={
                randomizingCommander ||
                (masterworkPage + 1) * 3 >= masterworks.length
              }
              onClick={recycleMasterworks}
            >
              {randomizingCommander
                ? "Drawing three unseen commanders…"
                : (masterworkPage + 1) * 3 >= masterworks.length
                  ? "All unseen Masterworks revealed"
                  : randomCommission
                    ? "None feel right? Draw three new commanders →"
                    : "None feel right? Forge three different Masterworks →"}
            </button>
          </div>
          <div className="masterwork-grid">
            {visibleMasterworks.map((work, index) => {
              const poolIndex = masterworkPage * 3 + index;
              const preview = previewFor(poolIndex);
              const commander = commanderFor(poolIndex);
              const alignedWork = randomCommission
                ? alignRandomMasterwork(work, commander, poolIndex)
                : work;
              const insight = masterworkInsight(alignedWork, preview, commander, commissionNote);
              return (
                <MasterworkCard
                  key={`masterwork-${poolIndex}`}
                  poolIndex={poolIndex}
                  featured={index === 0}
                  alignedWork={alignedWork}
                  preview={preview}
                  commander={commander}
                  insight={insight}
                  format={format}
                  onInspect={() => inspectMasterwork(poolIndex)}
                />
              );
            })}
          </div>
          <footer>
            <button
              onClick={() => {
                setMasterworkPage(0);
                setChamber("entrance");
              }}
            >
              Begin a new commission
            </button>
            <span>THREE OF 642 DESIGNS SURVIVED</span>
            <button
              className="masterwork-recycle"
              disabled={
                randomizingCommander ||
                (masterworkPage + 1) * 3 >= masterworks.length
              }
              onClick={recycleMasterworks}
            >
              {randomizingCommander
                ? "Drawing three unseen commanders…"
                : (masterworkPage + 1) * 3 >= masterworks.length
                  ? "All unseen Masterworks revealed"
                  : randomCommission
                    ? "Recycle these · Draw three new commanders →"
                    : "Recycle these · Forge three new Masterworks →"}
            </button>
          </footer>
        </section>
      )}

      {chamber === "workbench" && (
        <section className={`testing-anvil progressive-results ${resultViewMode}-results ${openingExperimentPending && benchStatus !== "forging" ? "opening-experiment-pending" : ""}`}>
          <button
            className="back-link"
            onClick={() => setChamber("masterworks")}
          >
            ← Return to the three Masterworks
          </button>
          <header>
            <span className="forge-eyebrow">
              <i /> MASTERWORK CHOSEN · THE TESTING ANVIL
            </span>
            <div className="masterwork-heading">
              {masterworkVisualProfile.primaryMotif && (
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
                <h1>{chosenWork.name}</h1>
                <p>
                  {chosenWork.path} · {format} · Revision{" "}
                  {Math.max(1, revisions.length)}
                </p>
              </div>
            </div>
          </header>
          {openingExperimentPending && benchStatus !== "forging" && openingExperimentChoices.length > 0 && (
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
          <nav className="result-view-controls" aria-label="Forge result detail level">
            <span>
              <small>RESULT VIEW</small>
              <b>
                {resultViewMode === "guided"
                  ? "Deck first. Deeper intelligence opens when you ask."
                  : "Every Forge instrument is awake."}
              </b>
            </span>
            <div>
              <button
                type="button"
                className={resultViewMode === "guided" ? "active" : ""}
                aria-pressed={resultViewMode === "guided"}
                onClick={() => setResultViewMode("guided")}
              >
                Guided View
              </button>
              <button
                type="button"
                className={resultViewMode === "full" ? "active" : ""}
                aria-pressed={resultViewMode === "full"}
                onClick={() => setResultViewMode("full")}
              >
                Full Forge
              </button>
            </div>
          </nav>
          <nav
            id="forge-chapter-rail"
            className="forge-chapter-rail"
            aria-label="Masterwork journey chapters"
          >
            {[
              [1, "The Masterwork", `${deckRows.reduce((sum, row) => sum + row.quantity, 0)} cards`],
              [2, "Shape", forgeReply ? "Options ready" : benchStatus === "testing" ? "Testing active" : "Choose a question"],
              [3, "Understand", forgeSystemsReport.strongestSystem?.name || "Essential reading"],
              [4, "Deep Forge", deckIntegrity.passed ? "Evidence ready" : "Review integrity"],
            ].map(([chapterNumber, label, status]) => (
              <button
                type="button"
                key={chapterNumber}
                className={activeForgeChapter === chapterNumber ? "active" : ""}
                aria-current={activeForgeChapter === chapterNumber ? "step" : undefined}
                onClick={() => setActiveForgeChapter(chapterNumber as 1 | 2 | 3 | 4)}
              >
                <small>CHAPTER {chapterNumber}</small>
                <b>{label}</b>
                <span>{status}</span>
              </button>
            ))}
          </nav>
          {openingExperimentFocus && resultViewMode === "guided" && (
            <aside className="forge-journey-guide" aria-live="polite">
              <span>
                <small>GUIDED FORGE · STEP {activeForgeChapter + 1} OF 5</small>
                <strong>
                  {activeForgeChapter === 1 && `Your ${openingExperimentFocus} experiment is set. Review the complete build it lives inside.`}
                  {activeForgeChapter === 2 && `Define what success looks like for ${openingExperimentFocus}, then carry that question into a match.`}
                  {activeForgeChapter === 3 && "Understand the machine before judging one card in isolation."}
                  {activeForgeChapter === 4 && "Use the Deep Forge only when you want the evidence behind the recommendation."}
                </strong>
              </span>
              {activeForgeChapter < 4 ? (
                <button type="button" onClick={() => setActiveForgeChapter((activeForgeChapter + 1) as 1 | 2 | 3 | 4)}>
                  {activeForgeChapter === 1 ? "I understand the build · Prepare the test →" : activeForgeChapter === 2 ? "Test defined · Understand the machine →" : "Continue into the Deep Forge →"}
                </button>
              ) : (
                <button type="button" onClick={() => setActiveForgeChapter(2)}>Return to the experiment →</button>
              )}
            </aside>
          )}
          {!openingExperimentPending && benchStatus !== "forging" && deckRows.length > 0 && (
            <section className="forge-path" aria-labelledby="forge-path-title">
              <header>
                <span>
                  <small>YOUR FORGE PATH</small>
                  <strong id="forge-path-title">
                    {currentFamilyArchived
                      ? "This Masterwork is sealed."
                      : revisionLearning.sampleSize > 0
                        ? "Evidence is on the anvil."
                        : benchStatus === "testing"
                          ? "The experiment is ready for the table."
                          : openingExperimentFocus
                            ? "Your first experiment is set."
                            : "Begin with the complete Masterwork."}
                  </strong>
                </span>
                <b>{currentFamilyArchived ? "5 OF 5" : revisionLearning.sampleSize > 0 ? "4 OF 5" : benchStatus === "testing" ? "3 OF 5" : openingExperimentFocus ? "2 OF 5" : "1 OF 5"}</b>
              </header>
              <ol>
                {[
                  ["Masterwork", true],
                  ["Experiment", Boolean(openingExperimentFocus) || benchStatus === "testing" || revisionLearning.sampleSize > 0 || currentFamilyArchived],
                  ["Table test", benchStatus === "testing" || revisionLearning.sampleSize > 0 || currentFamilyArchived],
                  ["Evidence", revisionLearning.sampleSize > 0 || currentFamilyArchived],
                  ["Seal", currentFamilyArchived],
                ].map(([label, complete], index) => {
                  const active = !complete && [
                    true,
                    Boolean(openingExperimentFocus) || benchStatus === "testing" || revisionLearning.sampleSize > 0 || currentFamilyArchived,
                    benchStatus === "testing" || revisionLearning.sampleSize > 0 || currentFamilyArchived,
                    revisionLearning.sampleSize > 0 || currentFamilyArchived,
                    currentFamilyArchived,
                  ].slice(0, index).every(Boolean);
                  return <li key={String(label)} className={complete ? "complete" : active ? "active" : ""}><i>{complete ? "✓" : index + 1}</i><span>{label}</span></li>;
                })}
              </ol>
              <footer>
                <p>
                  {currentFamilyArchived
                    ? "The full journey is preserved on your private Bench."
                    : revisionLearning.sampleSize > 0
                      ? `${revisionLearning.sampleSize} match ${revisionLearning.sampleSize === 1 ? "result is" : "results are"} attached to this exact revision. Seal it when the lesson feels complete.`
                      : benchStatus === "testing"
                        ? "Play the list, then record the result. One honest match is more useful than a guessed conclusion."
                        : openingExperimentFocus
                          ? `Carry ${openingExperimentFocus} into a match as a question—not a verdict.`
                          : "Read the finished list, then begin a recorded test when you understand what it is trying to do."}
                </p>
                {currentFamilyArchived ? (
                  <button type="button" onClick={startNewForge}>Start another Forge →</button>
                ) : revisionLearning.sampleSize > 0 ? (
                  <button type="button" onClick={finishCurrentMasterwork}>Seal this Masterwork →</button>
                ) : benchStatus === "testing" ? (
                  <button type="button" onClick={() => { setActiveForgeChapter(2); setMatchEvidenceOpen(true); window.requestAnimationFrame(() => document.getElementById("match-evidence")?.scrollIntoView({ behavior: "smooth", block: "center" })); }}>Record match evidence →</button>
                ) : (
                  <button type="button" disabled={!deckIntegrity.passed} onClick={beginTesting}>Begin the first table test →</button>
                )}
              </footer>
            </section>
          )}
          <div className={`testing-layout chapter-${activeForgeChapter}-active ${deckViewMode}-deck-view`}>
            <div className="deck-reference-strip">
              <img src={cardImage(chosenPreview.card)} alt="" />
              <div>
                <strong>{chosenWork.name}</strong>
                <span>{deckRows.reduce((sum, row) => sum + row.quantity, 0)} cards · {format}</span>
              </div>
              <button type="button" onClick={() => setActiveForgeChapter(1)}>View full deck →</button>
            </div>
            <article className="deck-manuscript">
              <header>
                <div>
                  <small>CHAPTER I · THE MASTERWORK</small>
                  <h2>
                    {benchStatus === "forging"
                      ? "The Forge is producing your deck…"
                      : `${deckRows.reduce((sum, row) => sum + row.quantity, 0)} cards · ${Object.keys(groupedDeck).length} sections`}
                  </h2>
                </div>
                <div className="deck-header-actions">
                  <span className="deck-view-toggle" aria-label="Deck presentation">
                    <button
                      type="button"
                      className={deckViewMode === "workbench" ? "active" : ""}
                      aria-pressed={deckViewMode === "workbench"}
                      onClick={() => setDeckViewMode("workbench")}
                    >
                      Workbench
                    </button>
                    <button
                      type="button"
                      className={deckViewMode === "ledger" ? "active" : ""}
                      aria-pressed={deckViewMode === "ledger"}
                      onClick={() => setDeckViewMode("ledger")}
                    >
                      Full ledger
                    </button>
                  </span>
                  <button
                    disabled={!deckRows.length || benchStatus === "forging"}
                    onClick={() => navigator.clipboard.writeText(forgedDeck)}
                  >
                    Copy deck
                  </button>
                </div>
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
              <section className="forge-quick-read" aria-label="Why the Forge built this deck">
                <span>
                  <small>WHY THIS MASTERWORK</small>
                  <b>{chosenWork.verdict}</b>
                </span>
                <span>
                  <small>PLAN</small>
                  <b>{chosenWork.path}</b>
                </span>
                <span>
                  <small>PLAYER INTENT</small>
                  <b>{strategy}</b>
                </span>
              </section>
              <section className="forge-understanding-bridge" aria-label="Essential deck understanding">
                <header>
                  <small>CHAPTER III · UNDERSTAND THE MASTERWORK</small>
                  <h2>The essential reading, without the instrument panel.</h2>
                </header>
                <div>
                  <span><small>LEGALITY</small><b>{deckIntegrity.passed ? "Verified" : deckIntegrity.checking ? "Checking" : "Attention required"}</b></span>
                  <span><small>OPENING HANDS</small><b>{simulationDossier ? `${(simulationDossier.goldfish.expert.keepableRate * 100).toFixed(0)}% keepable` : "Awaiting trials"}</b></span>
                  <span><small>STRONGEST MACHINE</small><b>{forgeSystemsReport.strongestSystem?.name || "Still resolving"}</b></span>
                  <span><small>WATCH FIRST</small><b>{forgeSystemsReport.weakestSystem?.name || simulationDossier?.matrix.weakest?.opponent || "Collect match evidence"}</b></span>
                </div>
              </section>
              <details
                className="forge-intelligence-vault"
                open={
                  resultViewMode === "full" ||
                  intelligenceOpen ||
                  (!deckIntegrity.checking && !deckIntegrity.passed)
                }
                onToggle={(event) =>
                  setIntelligenceOpen(event.currentTarget.open)
                }
              >
                <summary>
                  <span>
                    <small>CHAPTER IV · ENTER THE DEEP FORGE</small>
                    <b>Deck health, systems, causality, field pressure, and experiments</b>
                  </span>
                  <strong>
                    {!deckIntegrity.checking && !deckIntegrity.passed
                      ? "ATTENTION REQUIRED"
                      : resultViewMode === "full" || intelligenceOpen
                        ? "HIDE DETAILS"
                        : "EXPLORE DETAILS"}
                  </strong>
                </summary>
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
                          <b>{entry.name}</b>
                          <em>{(entry.probability * 100).toFixed(0)}% chance on time</em>
                        </span>
                      ))}
                      <p>Counts land sources only today — mana rocks and dorks are a deliberate later refinement — and treats multi-color needs as independent draws, so real odds run slightly higher than shown.</p>
                    </section>
                  )}
                  {simulationDossier && (
                    <section className="stress-dossier">
                      <span>
                        <small>OPENING-HAND GATE</small>
                        <b>{(simulationDossier.goldfish.expert.keepableRate * 100).toFixed(1)}% keepable</b>
                        <em>{simulationDossier.goldfish.gate.replaceAll("-", " ")}</em>
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
                        <em>{((simulationDossier.matrix.weakest?.scenarioPassRate || 0) * 100).toFixed(1)}% scenario pass</em>
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
                              : "The machinery has not connected yet."}
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
                              : "Resolve more card records or strengthen connected packages before the Forge names an engine."}
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
                            <article>
                              <small>STRONGEST MACHINE</small>
                              <strong>
                                {forgeSystemsReport.strongestSystem?.name ||
                                  "Unresolved"}
                              </strong>
                              <span>
                                {forgeSystemsReport.strongestSystem?.health
                                  ?.overall || 0}
                                /100 structural health
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
                                          SYSTEM {String(systemIndex + 1).padStart(2, "0")}
                                        </small>
                                        <strong>{system.name}</strong>
                                        <em>
                                          {system.members.length} components ·{" "}
                                          {system.edges.length} internal links
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
                              </div>
                              <span className="causality-confidence-seal">
                                <b>{forgeCausalityReport.structuralResilience}</b>
                                <small>DECK RESILIENCE</small>
                              </span>
                            </header>

                            <div className="causality-vitals">
                              {[
                                ["Structural Resilience", forgeCausalityReport.structuralResilience, false],
                                ["Collapse Risk", forgeCausalityReport.collapseRisk, true],
                                ["Recovery Potential", forgeCausalityReport.recoveryPotential, false],
                                ["System Redundancy", activeCausalitySystem?.redundancy || 0, false],
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
                                  <small>ACTIVE MACHINE</small>
                                  <strong>{activeCausalitySystem.name}</strong>
                                  <em>{activeCausalitySystem.status.toUpperCase()} · {activeCausalitySystem.confidence}</em>
                                </span>
                                <span><small>RESILIENCE</small><b>{activeCausalitySystem.structuralResilience}</b></span>
                                <span><small>COLLAPSE RISK</small><b>{activeCausalitySystem.collapseRisk}</b></span>
                                <span><small>RECOVERY</small><b>{activeCausalitySystem.recoveryPotential}</b></span>
                              </div>
                            )}

                            <div className="causality-panels">
                              <article className="causality-panel critical-nodes-panel">
                                <header><span>⚒</span><div><small>CRITICAL NODES</small><strong>Components carrying structural load</strong></div></header>
                                <div>
                                  {(activeCausalitySystem?.criticalNodes || []).length ? (
                                    activeCausalitySystem?.criticalNodes.map((card) => (
                                      <button type="button" key={card.name} onClick={() => setHoveredCard(card.name)}>
                                        <span><b>{card.name}</b><small>{card.primaryRole}</small></span>
                                        <em>{card.collapseRisk}<small> RISK</small></em>
                                      </button>
                                    ))
                                  ) : <p>No card in this machine crosses the critical-node threshold.</p>}
                                </div>
                              </article>

                              <article className="causality-panel amplifier-panel">
                                <header><span>✦</span><div><small>AMPLIFIERS</small><strong>Cards strengthening multiple roles</strong></div></header>
                                <div>
                                  {(activeCausalitySystem?.amplifiers || []).length ? (
                                    activeCausalitySystem?.amplifiers.map((card) => (
                                      <button type="button" key={card.name} onClick={() => setHoveredCard(card.name)}>
                                        <span><b>{card.name}</b><small>{card.systems.join(" · ")}</small></span>
                                        <em>{card.amplifierScore}<small> AMP</small></em>
                                      </button>
                                    ))
                                  ) : <p>No concentrated amplifier is currently supported by this model.</p>}
                                </div>
                              </article>

                              <article className="causality-panel bottleneck-panel">
                                <header><span>⛓</span><div><small>BOTTLENECKS</small><strong>Responsibility concentrated in one slot</strong></div></header>
                                <div>
                                  {(activeCausalitySystem?.bottlenecks || []).length ? (
                                    activeCausalitySystem?.bottlenecks.map((card) => (
                                      <button type="button" key={card.name} onClick={() => setHoveredCard(card.name)}>
                                        <span><b>{card.name}</b><small>{card.alternatives.length} modeled alternative{card.alternatives.length === 1 ? "" : "s"}</small></span>
                                        <em>{card.bottleneckScore}<small> LOAD</small></em>
                                      </button>
                                    ))
                                  ) : <p>No responsibility bottleneck crosses the current threshold.</p>}
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
                          <strong>No repeatable system can be named honestly.</strong>
                          <p>
                            The Forge will not manufacture an engine claim from
                            isolated cards. Complete the card record and strengthen
                            producer-to-payoff relationships first.
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
                            <p key={group.signal}><b>{group.signal.toUpperCase()}</b><span>{group.members.slice(0, 4).join(" · ")}{group.members.length > 4 ? ` +${group.members.length - 4}` : ""}</span></p>
                          ))}
                          {!focusedInteractionGraph.packages.length && <em>No multi-card package is verified yet.</em>}
                        </article>
                        <article>
                          <small>STRONGEST RELATIONSHIPS</small>
                          {focusedInteractionGraph.edges.slice(0, 3).map((edge) => (
                            <p key={`${edge.from}-${edge.to}`}><b>{edge.strength}% · {edge.signals.join(" + ")}</b><span>{edge.from} ↔ {edge.to}</span></p>
                          ))}
                          {!focusedInteractionGraph.edges.length && <em>No oracle-derived relationship is strong enough to claim.</em>}
                        </article>
                        <article className={focusedInteractionGraph.nonbos.length ? "graph-warning" : ""}>
                          <small>CONFLICT + ISOLATION AUDIT</small>
                          {focusedInteractionGraph.nonbos.slice(0, 2).map((conflict) => <p key={`${conflict.source}-${conflict.signal}`}><b>NONBO · {conflict.source}</b><span>{conflict.reason}</span></p>)}
                          {!focusedInteractionGraph.nonbos.length && <p><b>NO VERIFIED NONBO</b><span>No symmetrical oracle-text conflict was detected.</span></p>}
                          <em>{focusedInteractionGraph.isolated.length ? `${focusedInteractionGraph.isolated.length} isolated slot${focusedInteractionGraph.isolated.length === 1 ? "" : "s"}: ${focusedInteractionGraph.isolated.slice(0, 4).join(" · ")}` : activeSystem ? "Every card in this machine has at least one modeled relationship." : "Every nonland slot has at least one modeled relationship."}</em>
                        </article>
                      </div>
                      <footer>{interactionGraph.methodology}</footer>
                    </section>
                  )}
                  {!deckIntegrity.checking && deckIntegrity.issues.length > 0 && (
                    <footer>
                      <ul>{deckIntegrity.issues.map((issue) => <li key={issue}>{issue}</li>)}</ul>
                      <button onClick={repairDeckIntegrity} disabled={benchStatus === "forging"}>
                        {benchStatus === "forging" ? "Reforging failed slots…" : "Reforge failed constraints"}
                      </button>
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
                  {experimentTablets && experimentTablets.status === "advance" ? (
                    experimentTablets.tablets.map((tablet: any, index: number) => {
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
                                  <img src={cardImage(tablet.change.cut)} alt={tablet.change.cut} loading="lazy" />
                                  <figcaption>CUT · {tablet.change.cut}</figcaption>
                                </figure>
                                <span className="tablet-swap-arrow">→</span>
                                <figure>
                                  <img src={cardImage(tablet.change.add)} alt={tablet.change.add} loading="lazy" />
                                  <figcaption>ADD · {tablet.change.add}</figcaption>
                                </figure>
                              </div>
                              <dl>
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
                                onClick={() => applyExperimentTablet(tablet)}
                              >
                                {applying ? "Applying…" : "Accept this experiment →"}
                              </button>
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
              ) : deckRows.length ? (
                <div className="deck-gallery">
                  <aside className="card-preview-stage">
                    <div>
                      {activeImage && (
                        <img
                          src={activeImage}
                          alt={`${activeCard} card preview`}
                        />
                      )}
                    </div>
                    <small>HOVER OR FOCUS A CARD</small>
                    <strong>{activeCard}</strong>
                    <span>
                      {activeFact?.type_line ||
                        "Card details awaken on inspection"}
                    </span>
                    <span className="slot-justification">
                      <small>SLOT DUTY · {activeRole.toUpperCase()}</small>
                      {activeSlotReason}
                      {activeGraphEdges.map((edge) => (
                        <em key={`${edge.from}-${edge.to}`}>{edge.signals.join(" + ")} · {edge.from === activeCard ? edge.to : edge.from}</em>
                      ))}
                    </span>
                  </aside>
                  <div className="type-columns">
                    {[
                      "Commander",
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
                            const rowPrice = cardPriceUsd(cardFacts[cardFactKey(row.name)]);
                            return (
                              <button
                                type="button"
                                key={row.name}
                                draggable
                                onDragStart={(event) => {
                                  event.dataTransfer.setData(
                                    "text/plain",
                                    row.name,
                                  );
                                }}
                                onMouseEnter={() => setHoveredCard(row.name)}
                                onFocus={() => setHoveredCard(row.name)}
                                style={swapFlourish ? ({ "--motif-accent": masterworkVisualProfile.accent } as React.CSSProperties) : undefined}
                                className={[
                                  activeCard === row.name ? "active" : "",
                                  swapFlourish?.stage === "out" && row.name === swapFlourish.cut ? "card-row-cutting" : "",
                                  swapFlourish?.stage === "in" && row.name === swapFlourish.add ? "card-row-materializing" : "",
                                ].filter(Boolean).join(" ")}
                              >
                                <span>{row.quantity}</span>
                                <strong>{row.name}</strong>
                                {rowPrice !== null && (
                                  <em className="card-row-price">
                                    ${(rowPrice * row.quantity).toFixed(2)}
                                  </em>
                                )}
                              </button>
                            );
                          })}
                        </section>
                      ))}
                  </div>
                </div>
              ) : forgeGenerationError ? (
                <div className="forge-generation-failure" role="alert">
                  <small>THE METAL DID NOT SET</small>
                  <h3>No incomplete deck was saved.</h3>
                  <p>{forgeGenerationError}</p>
                  <button
                    onClick={() => {
                      if (deck.trim()) {
                        void commitDirectForge("decklist");
                        return;
                      }
                      if (isCommanderFormat(format) && selectedCommander && !randomCommission) {
                        void commitDirectForge("commander");
                        return;
                      }
                      void inspectMasterwork(selectedWork);
                    }}
                  >
                    Strike the Anvil Again
                  </button>
                </div>
              ) : (
                <pre>The Forge is waiting for a valid commission.</pre>
              )}
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
              <details className="raw-decklist">
                <summary>View complete Forge response / import text</summary>
                <pre>{forgedDeck}</pre>
              </details>
              <footer>
                <span>
                  Featured{" "}
                  {format === "Commander" || format === "Brawl"
                    ? "commander"
                    : "lynchpin"}
                  : <b>{chosenPreview.card}</b>
                </span>
                <button
                  disabled={benchStatus === "forging" || !deckIntegrity.passed}
                  title={deckIntegrity.passed ? "Begin a recorded test with this verified revision" : "Every legality and structural check must pass before testing"}
                  onClick={beginTesting}
                >
                  {benchStatus === "testing"
                    ? "Testing is active ✓"
                    : "Choose this deck & begin testing"}
                </button>
              </footer>
            </article>
            <aside className="testing-loop">
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
                  <button type="button" className="deep-forge-redirect-link" onClick={() => setActiveForgeChapter(4)}>
                    Chapter IV · Deep Forge
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
                      {["The plan came together", "Too slow to stabilize", "Mana helped or hurt", "Interaction arrived at the wrong time", "A key card overperformed", "No single lesson isolated"].map((signal) => (
                        <button type="button" key={signal} onClick={() => recordMatch(pendingMatchResult, signal)}>{signal}<i>→</i></button>
                      ))}
                    </fieldset>
                    <small>Choose the closest honest observation. The Forge preserves it as one clue—not a verdict.</small>
                  </div>
                )}
              </section>
              <section className="revision-learning-dossier">
                <header><small>REVISION {Math.max(1, revisions.length)} LEARNING</small><b>{revisionLearning.sampleSize} recorded match{revisionLearning.sampleSize === 1 ? "" : "es"}</b></header>
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
          </div>
        </section>
      )}
      {chamber !== "forging" && (
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
                    <button
                      key={family.id}
                      className={[family.id === deckId ? "active" : "", family.archived ? "finished" : ""].filter(Boolean).join(" ")}
                      onClick={() => {
                        openSavedMasterwork(family);
                        setBenchOpen(false);
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
                    </button>
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
            {deckPriceTotal.unpricedCards > 0 && (
              <em>
                {deckPriceTotal.unpricedCards} card{deckPriceTotal.unpricedCards === 1 ? "" : "s"} without price data
              </em>
            )}
          </div>
          {!editAnvilOpen && (
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
          lastCutCard) && (
          <section className="forge-replacements">
            <header>
              <div>
                <small>THE FORGE ANSWERS THE CUT</small>
                <h2>
                  {replacementLoading
                    ? `Studying what ${lastCutCard} was doing…`
                    : replacementRecommendations.length
                      ? `Three paths can fill ${lastCutCard}'s place.`
                      : `Search the Archive for ${lastCutCard}'s successor.`}
                </h2>
              </div>
              <button
                onClick={() => {
                  setLastCutCard("");
                  setReplacementRecommendations([]);
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
                {replacementRecommendations.map((card, index) => (
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
                      <p>
                        Drag this option into the deck, or add it immediately.
                      </p>
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
                    </div>
                  </article>
                ))}
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
            ) : (
              <p className="replacement-empty">
                The Forge did not force a weak suggestion. Use the legal card
                search above to choose the replacement yourself.
              </p>
            )}
          </section>
        )}
    </main>
  );
}


