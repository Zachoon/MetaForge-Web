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
  failureAnalysis: {
    status: string;
    headline: string;
    chain: string[];
    nextTest: string;
    evidence: string;
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
  failureAnalysis: {
    status: "insufficient-structure",
    headline: "The Forge does not yet have enough connected card text to isolate a system pressure point.",
    chain: [],
    nextTest: "Resolve the remaining card records and collect classified match signals before changing the deck.",
    evidence: "Insufficient evidence for a structural hypothesis.",
  },
  methodology: "MetaForge converts verified card text into an interaction graph, interprets repeatable systems, and then forms bounded structural-impact hypotheses. These results do not prove real-game causation or predict match outcomes.",
};
