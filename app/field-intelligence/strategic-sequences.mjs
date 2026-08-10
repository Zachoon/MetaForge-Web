// =============================================================================
// Field Intelligence v1.3 — Structural sequence mining
// =============================================================================
// Identifies structural stage dependencies — NEVER decklist / play order.
// =============================================================================

import { SEQUENCE_STAGE_ORDER } from "./strategic-edge-ontology.mjs";
import { isHighPerformer } from "./level-a-forensics.mjs";
import { normalizeCommanderIdentity } from "./level-a-forensics.mjs";

const freeze = (value) => Object.freeze(value);
const round = (value, digits = 3) => Number(Number(value).toFixed(digits));
const normalized = (value = "") => String(value).normalize("NFKC").trim().toLocaleLowerCase("en");

const SEQUENCE_PATTERNS = Object.freeze([
  freeze({ id: "setup_engine_payoff", stages: freeze(["setup", "convert", "close"]), requiredEdgeTypes: freeze(["enables", "feeds", "payoff_for"]) }),
  freeze({ id: "tutor_win_protection", stages: freeze(["setup", "close", "stabilize"]), requiredEdgeTypes: freeze(["tutors_for", "protects_combo_or_close", "protects_engine"]) }),
  freeze({ id: "gy_fill_reanimate_protect", stages: freeze(["setup", "recover", "stabilize"]), requiredEdgeTypes: freeze(["recovers", "protects_engine", "feeds"]) }),
  freeze({ id: "mana_commander_payoff", stages: freeze(["setup", "convert", "close"]), requiredEdgeTypes: freeze(["enables", "sequence_precedes"]) }),
  freeze({ id: "silence_combo_sequence", stages: freeze(["stabilize", "close"]), requiredEdgeTypes: freeze(["clears_path_for", "protects_combo_or_close"]) }),
]);

function stagesPresent(rows = []) {
  const present = new Set();
  for (const row of rows) {
    for (const stage of row.sequenceStages || []) present.add(stage);
  }
  return present;
}

function deckMatchesPattern(topology, rows, pattern) {
  const present = stagesPresent(rows);
  if (!pattern.stages.every((stage) => present.has(stage))) return false;
  const edgeTypes = new Set((topology.edges || []).filter((e) => e.semanticSupport).map((e) => e.type));
  const hit = pattern.requiredEdgeTypes.filter((type) => edgeTypes.has(type));
  return hit.length >= Math.min(2, pattern.requiredEdgeTypes.length);
}

/**
 * Mine StrategicSequenceEvidence from topologies + analyses + records.
 * Explicitly does not use decklist ordering as play order.
 */
export function mineStrategicSequences(topologies = [], analyses = [], records = [], options = {}) {
  const analysisById = new Map(analyses.map((a) => [a.deckId, a]));
  const recordById = new Map(records.map((r) => [r.id, r]));
  const buckets = new Map();

  for (const topology of topologies) {
    const analysis = analysisById.get(topology.deckId);
    const record = recordById.get(topology.deckId);
    if (!analysis || !record) continue;
    const rows = analysis.annotatedRows || [];
    for (const pattern of SEQUENCE_PATTERNS) {
      if (!deckMatchesPattern(topology, rows, pattern)) continue;
      const key = pattern.id;
      const entry = buckets.get(key) || {
        sequenceId: pattern.id,
        stages: pattern.stages,
        requiredRelationships: pattern.requiredEdgeTypes,
        decks: new Set(),
        events: new Set(),
        commanders: new Set(),
        families: new Set(),
        converterDecks: 0,
        participantDecks: 0,
        repeatedConverterDecks: 0,
      };
      entry.decks.add(topology.deckId);
      if (record.eventId) entry.events.add(record.eventId);
      const identity = normalizeCommanderIdentity(record.commanders || analysis.commanders);
      if (identity) entry.commanders.add(identity);
      const family = analysis.commanderFamily?.familyId || identity;
      if (family) entry.families.add(family);
      if (record.performanceClass === "repeated_converter") entry.repeatedConverterDecks += 1;
      if (isHighPerformer(record)) entry.converterDecks += 1;
      else entry.participantDecks += 1;
      buckets.set(key, entry);
    }
  }

  const evidence = [...buckets.values()].map((entry) => {
    const independentEvents = entry.events.size;
    const commanderDiversity = entry.commanders.size;
    const confidence = round(Math.min(0.92,
      0.25
      + Math.log2(1 + entry.decks.size) * 0.12
      + Math.log2(1 + independentEvents) * 0.14
      + Math.log2(1 + commanderDiversity) * 0.08
      + (entry.converterDecks > entry.participantDecks ? 0.1 : 0)));
    const enrichment = entry.converterDecks + entry.participantDecks > 0
      ? entry.converterDecks / (entry.converterDecks + entry.participantDecks)
      : 0;
    return freeze({
      kind: "StrategicSequenceEvidence",
      sequenceId: entry.sequenceId,
      stages: entry.stages,
      requiredRelationships: entry.requiredRelationships,
      decksObserved: entry.decks.size,
      independentEvents: independentEvents,
      commandersObserved: freeze([...entry.commanders].sort().slice(0, 24)),
      familiesObserved: freeze([...entry.families].sort().slice(0, 24)),
      converterEvidence: entry.converterDecks,
      participantEvidence: entry.participantDecks,
      repeatedConverterEvidence: entry.repeatedConverterDecks,
      converterEnrichmentRate: round(enrichment),
      eliteTag: enrichment >= 0.55
        ? (entry.repeatedConverterDecks >= 2 ? "repeated_converter_enriched" : "converter_enriched")
        : "common_tournament",
      confidence,
      impliesObservedGameOrder: false,
      note: "Structural stage dependencies only — not reconstructed play order.",
    });
  }).sort((a, b) => b.confidence - a.confidence || b.decksObserved - a.decksObserved);

  return freeze({
    version: "strategic-sequences-v1",
    sequenceStageOrder: SEQUENCE_STAGE_ORDER,
    patternsConsidered: SEQUENCE_PATTERNS.length,
    evidence: freeze(evidence.slice(0, options.limit || 40)),
    brainPolicyTouched: false,
  });
}
