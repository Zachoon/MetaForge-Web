// =============================================================================
// Field Intelligence v1.3 — Contextual card function
// =============================================================================
// Same card may perform different strategic jobs in different decks.
// Prefer: card + strategic context → observed function
// =============================================================================

import { EDGE_STRENGTH } from "./strategic-edge-ontology.mjs";
import { normalizeCommanderIdentity } from "./level-a-forensics.mjs";

const freeze = (value) => Object.freeze(value);
const round = (value, digits = 3) => Number(Number(value).toFixed(digits));
const normalized = (value = "") => String(value).normalize("NFKC").trim().toLocaleLowerCase("en");

function primaryFunctionFromEdges(cardName, topology) {
  const key = normalized(cardName);
  const edges = (topology.edges || []).filter((e) =>
    normalized(e.from) === key && e.strength === EDGE_STRENGTH.strong);
  const counts = {};
  for (const edge of edges) {
    counts[edge.type] = (counts[edge.type] || 0) + 1;
  }
  const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (!ranked.length) {
    const node = (topology.nodes || []).find((n) => normalized(n.name) === key);
    if (node?.roles?.includes("interaction")) return "generic_interaction";
    if (node?.roles?.includes("protection")) return "generic_protection";
    return "unclassified";
  }
  const [type] = ranked[0];
  if (type === "protects_commander") return "commander_protection";
  if (type === "protects_engine") return "engine_protection";
  if (type === "protects_combo_or_close") return "combo_protection";
  if (type === "clears_path_for") return "path_clear_for_win";
  if (type === "disrupts_for") return "plan_preserving_disruption";
  if (type === "tutors_for") return "tutor_for_plan_piece";
  if (type === "recovers") return "recovery_for_plan_piece";
  if (type === "multifunction_with") return "multifunction_interaction";
  if (type === "enables" || type === "feeds") return "engine_enabler";
  return type;
}

function contextKey(topology, analysis) {
  const packages = (analysis?.packages || []).map((p) => p.id).sort().slice(0, 4).join("+") || "none";
  const identity = normalizeCommanderIdentity(topology.commanders || analysis?.commanders || []);
  return `${identity}::${packages}`;
}

/**
 * Build observational contextual functions across the corpus.
 */
export function mineContextualCardFunctions(topologies = [], analyses = [], options = {}) {
  const analysisById = new Map(analyses.map((a) => [a.deckId, a]));
  const byCard = new Map();

  for (const topology of topologies) {
    const analysis = analysisById.get(topology.deckId);
    const ctx = contextKey(topology, analysis);
    for (const node of topology.nodes || []) {
      if (!node.interactive) continue;
      const fn = primaryFunctionFromEdges(node.name, topology);
      const cardKey = normalized(node.name);
      const entry = byCard.get(cardKey) || {
        cardName: node.name,
        functions: new Map(),
        contexts: new Map(),
        decks: new Set(),
      };
      entry.decks.add(topology.deckId);
      entry.functions.set(fn, (entry.functions.get(fn) || 0) + 1);
      const ctxEntry = entry.contexts.get(ctx) || { context: ctx, functionCounts: {} };
      ctxEntry.functionCounts[fn] = (ctxEntry.functionCounts[fn] || 0) + 1;
      entry.contexts.set(ctx, ctxEntry);
      byCard.set(cardKey, entry);
    }
  }

  const rows = [...byCard.values()]
    .map((entry) => {
      const functionDistribution = Object.fromEntries(
        [...entry.functions.entries()].sort((a, b) => b[1] - a[1]),
      );
      const distinctFunctions = Object.keys(functionDistribution).length;
      const contexts = [...entry.contexts.values()].map((ctx) => {
        const ranked = Object.entries(ctx.functionCounts).sort((a, b) => b[1] - a[1]);
        return freeze({
          context: ctx.context,
          primaryFunction: ranked[0]?.[0] || "unclassified",
          functionCounts: freeze(ctx.functionCounts),
        });
      });
      return freeze({
        cardName: entry.cardName,
        decksObserved: entry.decks.size,
        distinctFunctions,
        functionDistribution: freeze(functionDistribution),
        contexts: freeze(contexts.slice(0, 12)),
        contextDependent: distinctFunctions >= 2,
        globalSingleMeaningForbidden: true,
      });
    })
    .filter((row) => row.decksObserved >= (options.minDecks || 2))
    .sort((a, b) => Number(b.contextDependent) - Number(a.contextDependent)
      || b.distinctFunctions - a.distinctFunctions
      || b.decksObserved - a.decksObserved);

  return freeze({
    version: "contextual-card-function-v1",
    cards: freeze(rows.slice(0, options.limit || 80)),
    contextDependentCards: rows.filter((r) => r.contextDependent).length,
    note: "Do not learn a single global strategic meaning for cards.",
    brainPolicyTouched: false,
  });
}
