// Shared response contract for POST /api/forge/structural-analyze
// (worker/forge-structural-analyze.ts). Type-only plus one small data
// constant — no engine logic lives here, so importing this file into the
// client never re-introduces the interaction graph, systems intelligence,
// or causality engine to the browser bundle.

export interface ForgeAnalysisReport {
  engine: string;
  status: "empty-card-set" | "insufficient-structure" | "graph-only" | "structural-analysis-complete";
  commanderName: string;
  cardCount: number;
  uniqueCardCount: number;
  // Nested per-system/per-edge/per-card records below are typed loosely
  // (any) rather than exhaustively modeled — these engines' internal
  // record shapes are read through many different destructuring patterns
  // across page.tsx's JSX (mirroring how the rest of this codebase already
  // treats these engine outputs). The fields that matter for the
  // idle/loading/ready/error gating itself — status, the array-vs-null
  // top-level shape, and the string fields below — are precisely typed.
  graph: {
    nodes: unknown[];
    edges: any[];
    packages: any[];
    isolated: string[];
    nonbos: any[];
    amplifiers: any[];
    enginePairs: Array<{ cards: string[]; strength: number; reason: string; evidence: string }>;
    commanderLinks: unknown[];
    coverage: number;
    confidence: string;
    methodology: string;
    commanderName: string;
  };
  systems: {
    systems: any[];
    strongestSystem: any | null;
    weakestSystem: any | null;
    bridgeCards: any[];
    isolatedCards: unknown[];
    conflicts: unknown[];
    amplifiers: unknown[];
    systemCoverage: number;
    graphCoverage: number;
    confidence: string;
    methodology: string;
  };
  causality: {
    status: string;
    systems: any[];
    strongestSystem: any | null;
    mostFragileSystem: any | null;
    criticalNodes: any[];
    bottlenecks: any[];
    amplifiers: any[];
    isolatedCards: unknown[];
    structuralResilience: number;
    collapseRisk: number;
    recoveryPotential: number;
    highestValueUpgrade: { systemId: string; systemName: string; targetCard: string; priority: number; recommendation: string; contract: string } | null;
    confidence: string;
    headline: string;
    evidence: string;
    methodology: string;
  };
  cardEvaluations: {
    engine: string;
    cards: Array<{
      name: string;
      quantity: number;
      role: string;
      systems: string[];
      partners: string[];
      alternatives: string[];
      scores: { synergy: number; planFit: number; reliability: number; structuralImpact: number; replaceability: number };
      whyHere: string;
      cutImpact: string;
      evidence: string;
    }>;
    methodology: string;
  };
  failureAnalysis: {
    status: string;
    headline: string;
    chain: string[];
    nextTest: string;
    evidence: string;
  };
  // null when the request didn't ask for simulation (computeSimulation:
  // false — mirrors the client's own deckIntegrity.passed gate, which
  // this endpoint doesn't replicate; the client still decides whether a
  // simulation is meaningful to request) rather than when the deck is
  // simply empty, which instead returns the engine's own real
  // "unsupported gate" output for zero cards.
  simulationDossier: {
    goldfish: any;
    matrix: any;
    roleCounts: Record<string, number>;
    averageCmc: number;
  } | null;
  revisionLearning: {
    revision: number;
    sampleSize: number;
    patterns: any[];
    matchups: any[];
    actionable: any[];
    guidance: string;
  };
  interventionLearning: {
    experiments: any[];
    patterns: any[];
    reusable: any[];
    reusableGuidance: string;
    evidenceBoundary: string;
  };
  coachingDiagnosis: {
    engine: string;
    revision: number;
    sampleSize: number;
    primary: {
      category: "construction-pressure" | "piloting-decision" | "matchup-pressure" | "ordinary-variance" | "revision-effect" | "collect-more-evidence";
      label: string;
      confidence: string;
      evidence: readonly string[];
      recommendation: string;
      measurement: string;
    };
    alternatives: readonly any[];
    evidenceBoundary: string;
    confidence: number;
  };
  provingGrounds: {
    engine: string;
    source: string;
    question: string;
    watchFor: string;
    why: string;
    successPrompt: string;
    missedPrompt: string;
    boundary: string;
  };
  methodology: string;
}

// The engine's own real "insufficient structure" output for zero cards —
// captured once from buildForgeStructuralAnalysis([], {}) plus
// buildBoundedFailureAnalysis's matching empty case, not hand-invented.
// Used only as the pre-load/idle placeholder before the first analysis
// response arrives, and while a request is in flight after an error.
export const EMPTY_FORGE_ANALYSIS_REPORT: ForgeAnalysisReport = {
  engine: "metaforge-structural-pipeline-v1",
  status: "empty-card-set",
  commanderName: "",
  cardCount: 0,
  uniqueCardCount: 0,
  graph: {
    nodes: [],
    edges: [],
    packages: [],
    isolated: [],
    nonbos: [],
    amplifiers: [],
    enginePairs: [],
    commanderLinks: [],
    coverage: 0,
    confidence: "LOW · INCOMPLETE CARD SET",
    methodology: "Relationships are inferred from current oracle text and type lines; they are not adoption claims or guaranteed combos.",
    commanderName: "",
  },
  systems: {
    systems: [],
    strongestSystem: null,
    weakestSystem: null,
    bridgeCards: [],
    isolatedCards: [],
    conflicts: [],
    amplifiers: [],
    systemCoverage: 0,
    graphCoverage: 0,
    confidence: "LOW · NO REPEATABLE SYSTEM DETECTED",
    methodology: "Systems are inferred from verified card text, producer/payoff relationships, and graph structure. Health scores compare structural support inside this deck; they are not predicted win rates.",
  },
  causality: {
    status: "insufficient-structure",
    systems: [],
    strongestSystem: null,
    mostFragileSystem: null,
    criticalNodes: [],
    bottlenecks: [],
    amplifiers: [],
    isolatedCards: [],
    structuralResilience: 0,
    collapseRisk: 0,
    recoveryPotential: 0,
    highestValueUpgrade: null,
    confidence: "INSUFFICIENT · NO DETECTED SYSTEMS",
    headline: "The Forge cannot form a causal hypothesis without a detected multi-card system.",
    evidence: "The Forge requires at least one detected multi-card system before it can form a bounded structural-impact hypothesis.",
    methodology: "Structural-impact scores are deterministic hypotheses derived from the supplied interaction graph, detected systems, and optional modeled trials. They do not prove real-game causation, card quality, or predicted win rate.",
  },
  cardEvaluations: {
    engine: "",
    cards: [],
    methodology: "Scores compare each card only with this deck's verified Oracle-text graph, detected systems, and bounded structural hypotheses. They are not universal card ratings, price judgments, or predicted win rates.",
  },
  failureAnalysis: {
    status: "insufficient-structure",
    headline: "The Forge does not yet have enough connected card text to isolate a system pressure point.",
    chain: [],
    nextTest: "Resolve the remaining card records and collect classified match signals before changing the deck.",
    evidence: "Insufficient evidence for a structural hypothesis.",
  },
  // Not requested by default (no computeSimulation flag) — this is the
  // idle/pre-load placeholder shape, not a claim that zero cards were
  // analyzed. When a real request does ask for simulation on an empty
  // deck, the engine's own real "unsupported gate" output is used
  // instead (captured the same way, from evaluateSimulationGate([],...)
  // and evaluateMatchupMatrix([],...) directly).
  simulationDossier: null,
  revisionLearning: {
    revision: 1,
    sampleSize: 0,
    patterns: [],
    matchups: [],
    actionable: [],
    guidance: "No repeated preference has cleared the two-signal learning threshold. Preserve the list and collect another explicit match signal.",
  },
  interventionLearning: {
    experiments: [],
    patterns: [],
    reusable: [],
    reusableGuidance: "No intervention has earned reuse yet. Build from the current Blueprint and collect controlled before/after evidence.",
    evidenceBoundary: "MetaForge never rewrites its own rules from one result. An intervention needs four matches before and after, and the same kind must improve twice before it becomes a reusable player prior.",
  },
  coachingDiagnosis: {
    engine: "metaforge-exact-revision-coach-v1",
    revision: 1,
    sampleSize: 0,
    primary: {
      category: "collect-more-evidence",
      label: "Collect more evidence",
      confidence: "insufficient",
      evidence: ["0 matches attached to this revision", "No category has crossed its evidence gate"],
      recommendation: "Preserve the list and record the next honest result, opponent family, and clearest lesson.",
      measurement: "Two repeated issue signals, two explicit decision moments, or four concentrated matchup games can open a diagnosis.",
    },
    alternatives: [],
    evidenceBoundary: "MetaForge diagnoses repeated evidence attached to this exact revision. A loss alone never proves a bad deck or a piloting mistake, and observed samples are not predicted win rates.",
    confidence: 0,
  },
  provingGrounds: {
    engine: "metaforge-proving-grounds-v1",
    source: "collect-more-evidence",
    question: "What is the first repeatable reason this deck succeeds or stalls?",
    watchFor: "Notice the first decisive turn and name only the clearest observable lesson.",
    why: "There is not enough exact-revision evidence for an honest diagnosis yet.",
    successPrompt: "Yes — the thing I watched happened",
    missedPrompt: "No — it did not happen",
    boundary: "One game supplies one clue, not a verdict. The Forge will preserve the exact revision and look for repetition before recommending a change.",
  },
  methodology: "MetaForge converts verified card text into an interaction graph, interprets repeatable systems, and then forms bounded structural-impact hypotheses. These results do not prove real-game causation or predict match outcomes.",
};
