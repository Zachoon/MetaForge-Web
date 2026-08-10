// =============================================================================
// Field Intelligence v1 — Read-only Corpus Analysis
// =============================================================================
// Runs frozen Brain v1 *observation* systems over human decks without forging
// or mutating construction policy. Decks are evidence case studies, not targets.
// =============================================================================

import { CORPUS_ANALYSIS_VERSION } from "./corpus-schema.mjs";
import { scoreEvidenceQuality } from "./evidence-quality.mjs";
import {
  buildStrategicIntent,
  strategicSemanticsFor,
  validateStrategicCohesion,
} from "../strategic-intent.mjs";
import { buildSlotJustificationLedger } from "../slot-justification-ledger.mjs";
import {
  buildPackageState,
  evaluatePackageHealth,
} from "../package-plan-optimizer.mjs";
import {
  buildInteractionGraph,
  extractMechanicalSignals,
} from "../forge-interaction-graph.mjs";
import {
  classifyNativeCard,
  commanderConnectionSignalsFor,
  commanderMechanicalScopes,
  conceptSignals,
} from "../native-masterwork-engine.mjs";

const freeze = (value) => Object.freeze(value);
const unique = (values) => [...new Set(values)];
const round = (value, digits = 3) => Number(Number(value).toFixed(digits));
const normalized = (value = "") => String(value).normalize("NFKC").trim().toLocaleLowerCase("en");

/**
 * Annotate a raw card into a Brain-compatible row without scoring/popularity
 * construction bias. Observation only.
 */
export function annotateCorpusCard(card, context) {
  const mechanics = extractMechanicalSignals(card);
  const roles = classifyNativeCard(card);
  const strategicSemantics = strategicSemanticsFor(card);
  const commanderConnectionSignals = commanderConnectionSignalsFor(
    card,
    mechanics,
    context.commanderMechanics,
    context.commanderScopes,
  );
  const cmc = Number(card.cmc) || 0;
  const sequenceStages = unique([
    ...(cmc <= 3 && roles.some((role) => ["ramp", "draw", "selection"].includes(role)) ? ["setup"] : []),
    ...(cmc <= 3 && roles.some((role) => ["interaction", "protection"].includes(role)) ? ["stabilize"] : []),
    ...(commanderConnectionSignals.length || mechanics.rewards.length ? ["convert"] : []),
    ...(roles.some((role) => ["recursion", "draw", "protection"].includes(role)) ? ["recover"] : []),
    ...((cmc >= 4 && roles.includes("threat")) || roles.includes("combat") || mechanics.rewards.includes("combat") ? ["close"] : []),
  ]);
  return freeze({
    quantity: Math.max(1, Number(card.quantity) || 1),
    name: card.name,
    roles: freeze([...roles]),
    cmc,
    typeLine: card.typeLine || card.type_line || "",
    oracleText: card.oracleText || card.oracle_text || "",
    manaCost: card.manaCost || card.mana_cost || "",
    colorIdentity: freeze([...(card.colorIdentity || card.color_identity || [])]),
    mechanics: freeze({
      signals: freeze([...(mechanics.signals || [])]),
      produces: freeze([...(mechanics.produces || [])]),
      rewards: freeze([...(mechanics.rewards || [])]),
    }),
    strategicSemantics,
    commanderConnectionSignals: freeze([...commanderConnectionSignals]),
    sequenceStages: freeze([...sequenceStages]),
    score: 0,
    card,
  });
}

function analysisContextFromCommanders(commanders = []) {
  const commanderMechanicRows = commanders.map((commander) => extractMechanicalSignals(commander));
  const commanderScopeRows = commanders.map((commander) => commanderMechanicalScopes(commander));
  return freeze({
    commanderMechanics: freeze({
      produces: unique(commanderMechanicRows.flatMap((mechanics) => mechanics.produces)),
      rewards: unique(commanderMechanicRows.flatMap((mechanics) => mechanics.rewards)),
    }),
    commanderScopes: freeze({
      produces: freeze(Object.assign({}, ...commanderScopeRows.map((row) => row.produces || {}))),
      rewards: freeze(Object.assign({}, ...commanderScopeRows.map((row) => row.rewards || {}))),
    }),
    commanderSignals: unique(commanders.flatMap((commander) => conceptSignals(commander))),
  });
}

function roleDistribution(rows = []) {
  const counts = {};
  for (const row of rows) {
    if ((row.roles || []).includes("land") || (row.roles || []).includes("commander")) continue;
    const qty = Number(row.quantity) || 1;
    for (const role of row.roles || []) {
      counts[role] = (counts[role] || 0) + qty;
    }
  }
  return freeze(counts);
}

function curveDistribution(rows = []) {
  const curve = { "0-1": 0, "2": 0, "3": 0, "4": 0, "5+": 0 };
  for (const row of rows) {
    if ((row.roles || []).includes("land") || (row.roles || []).includes("commander")) continue;
    const qty = Number(row.quantity) || 1;
    const cmc = Number(row.cmc) || 0;
    if (cmc <= 1) curve["0-1"] += qty;
    else if (cmc === 2) curve["2"] += qty;
    else if (cmc === 3) curve["3"] += qty;
    else if (cmc === 4) curve["4"] += qty;
    else curve["5+"] += qty;
  }
  return freeze(curve);
}

function producedRewardedSignals(rows = []) {
  const produces = {};
  const rewards = {};
  for (const row of rows) {
    if ((row.roles || []).includes("land") || (row.roles || []).includes("commander")) continue;
    const qty = Number(row.quantity) || 1;
    for (const signal of row.mechanics?.produces || []) produces[signal] = (produces[signal] || 0) + qty;
    for (const signal of row.mechanics?.rewards || []) rewards[signal] = (rewards[signal] || 0) + qty;
  }
  return freeze({ produces: freeze(produces), rewards: freeze(rewards) });
}

/**
 * Analyze one CorpusDeckRecord with frozen Brain observation systems.
 * Does not forge, repair, or mutate construction policy.
 */
export function analyzeCorpusDeck(record, options = {}) {
  const commanders = record.commanders || [];
  const analysisContext = analysisContextFromCommanders(commanders);
  const note = record.statedArchetype || (record.archetypeTags || []).join(" ") || "";
  const intent = buildStrategicIntent({
    format: record.format || "Commander",
    strategy: "Balanced midrange",
    commander: commanders[0],
    secondCommander: commanders[1],
    note,
  }, {
    ...analysisContext,
    blueprint: {
      source: note,
      requestedMechanics: [],
      desiredRoles: [],
      packageSignals: [],
      promises: [],
    },
  });

  const sourceCards = (record.rows || []).map((row) => ({
    name: row.name,
    quantity: row.quantity,
    typeLine: row.typeLine,
    oracleText: row.oracleText,
    cmc: row.cmc,
    manaCost: row.manaCost,
    colorIdentity: row.colorIdentity,
    // Prefer pre-annotated Brain fields when present (seed corpus).
    roles: row.roles,
    mechanics: row.mechanics,
    strategicSemantics: row.strategicSemantics,
    commanderConnectionSignals: row.commanderConnectionSignals,
    sequenceStages: row.sequenceStages,
  }));

  const annotated = sourceCards.map((card) => {
    if (card.roles?.length && card.mechanics && card.strategicSemantics) {
      const semantics = card.strategicSemantics instanceof Set
        ? card.strategicSemantics
        : new Set(card.strategicSemantics || []);
      return freeze({
        quantity: Math.max(1, Number(card.quantity) || 1),
        name: card.name,
        roles: freeze([...(card.roles || [])]),
        cmc: Number(card.cmc) || 0,
        typeLine: card.typeLine || "",
        oracleText: card.oracleText || "",
        manaCost: card.manaCost || "",
        colorIdentity: freeze([...(card.colorIdentity || [])]),
        mechanics: freeze({
          signals: freeze([...(card.mechanics.signals || card.mechanics.produces || [])]),
          produces: freeze([...(card.mechanics.produces || [])]),
          rewards: freeze([...(card.mechanics.rewards || [])]),
        }),
        strategicSemantics: semantics,
        commanderConnectionSignals: freeze([...(card.commanderConnectionSignals || [])]),
        sequenceStages: freeze([...(card.sequenceStages || [])]),
        score: 0,
        card,
      });
    }
    return annotateCorpusCard(card, analysisContext);
  });

  const commanderRows = commanders.map((commander) => freeze({
    quantity: 1,
    name: commander.name,
    roles: freeze(["commander"]),
    cmc: 0,
    typeLine: commander.typeLine || "Legendary Creature",
    oracleText: commander.oracleText || "",
    mechanics: freeze({ produces: freeze([]), rewards: freeze([]) }),
    strategicSemantics: new Set(),
    commanderConnectionSignals: freeze([]),
    sequenceStages: freeze([]),
    score: 100,
  }));

  const rows = freeze([...commanderRows, ...annotated]);
  const candidate = { rows, strategicCohesionGate: null };
  const ledger = buildSlotJustificationLedger(candidate, intent, {});
  const cohesion = validateStrategicCohesion({ rows }, intent, {});
  candidate.strategicCohesionGate = cohesion;

  const packages = (intent.packages || []).map((packageSpec) => {
    const state = buildPackageState(rows, packageSpec, intent, { justifications: ledger });
    const health = evaluatePackageHealth(state, intent);
    return freeze({
      id: packageSpec.id,
      label: packageSpec.label,
      status: health.status,
      healthScore: health.score,
      issues: health.issues,
      density: state.density,
      legs: state.legs,
      interactionDensity: state.interactionDensity,
      commanderContribution: state.commanderContribution,
      weaklyJustified: state.weaklyJustified,
      coreMembers: state.coreMembers,
      supportMembers: state.supportMembers,
      requireBalancedLegs: packageSpec.requireBalancedLegs || [],
      coreMin: packageSpec.coreMin,
      supportMin: packageSpec.supportMin,
    });
  });

  const graphCards = annotated.map((row) => ({
    name: row.name,
    quantity: row.quantity,
    typeLine: row.typeLine,
    oracleText: row.oracleText,
  }));
  const interactionGraph = buildInteractionGraph(graphCards);

  const nonlands = annotated.filter((row) => !(row.roles || []).includes("land"));
  const connected = nonlands.filter((row) => (row.commanderConnectionSignals || []).length > 0);
  const signals = producedRewardedSignals(annotated);

  const draft = {
    justification: {
      slotCount: ledger.slotCount,
      weaklyJustifiedCount: ledger.critique.weaklyJustified.length,
      redundantCount: ledger.critique.redundant.length,
      criticalCount: ledger.critique.packageCritical.length,
      underSupportedAnchors: ledger.critique.underSupportedAnchors,
      weaklyJustified: ledger.critique.weaklyJustified,
      redundant: ledger.critique.redundant,
      packageCritical: ledger.critique.packageCritical,
      strongRatio: ledger.slotCount
        ? round(1 - (ledger.critique.weaklyJustified.length / ledger.slotCount))
        : 0,
    },
    packages,
    cohesion: {
      passed: cohesion.passed !== false,
      reasons: cohesion.reasons || [],
      packageResults: cohesion.packageResults || [],
    },
  };

  const evidenceQuality = scoreEvidenceQuality(record, draft, {
    independentSourceCount: options.independentSourceCount || 1,
    independentEventCount: options.independentEventCount
      || (record.eventId ? 1 : 0)
      || 1,
    patternRepetition: options.patternRepetition || 1,
    semanticallySupported: (draft.packages || []).some((pkg) => pkg.status === "healthy"),
  });

  return freeze({
    version: CORPUS_ANALYSIS_VERSION,
    deckId: record.id,
    commanders: freeze(commanders.map((c) => c.name)),
    statedArchetype: record.statedArchetype || null,
    archetypeTags: freeze([...(record.archetypeTags || [])]),
    sourceType: record.sourceType,
    inferredIntent: freeze({
      packageIds: freeze([...(intent.packageIds || [])]),
      commanderMechanics: analysisContext.commanderMechanics,
      strategy: intent.strategy,
    }),
    roleDistribution: roleDistribution(annotated),
    curve: curveDistribution(annotated),
    signals,
    commanderConnection: freeze({
      connectedCount: connected.length,
      totalNonlands: nonlands.length,
      ratio: nonlands.length ? round(connected.length / nonlands.length) : 0,
      bySignal: freeze(Object.fromEntries(
        unique(connected.flatMap((row) => row.commanderConnectionSignals)).map((signal) => [
          signal,
          connected.filter((row) => row.commanderConnectionSignals.includes(signal))
            .reduce((sum, row) => sum + (Number(row.quantity) || 1), 0),
        ]),
      )),
    }),
    interactionGraph: freeze({
      edgeCount: (interactionGraph.edges || []).length,
      nodeCount: (interactionGraph.nodes || interactionGraph.cards || graphCards).length || graphCards.length,
      topEdges: freeze((interactionGraph.edges || [])
        .slice()
        .sort((a, b) => (b.strength || 0) - (a.strength || 0) || a.from.localeCompare(b.from))
        .slice(0, 12)
        .map((edge) => freeze({
          from: edge.from,
          to: edge.to,
          signals: freeze([...(edge.signals || [])]),
          strength: edge.strength,
          evidence: edge.evidence,
        }))),
    }),
    justification: freeze(draft.justification),
    packages: freeze(packages),
    cohesion: freeze(draft.cohesion),
    evidenceQuality,
    // Explicit freeze marker: analysis never returns construction mutations.
    constructionMutated: false,
    brainPolicyTouched: false,
  });
}

export function analyzeCorpus(records = [], options = {}) {
  return freeze(records.map((record) => analyzeCorpusDeck(record, options)));
}
