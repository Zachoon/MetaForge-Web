// =============================================================================
// Validation Harness <-> Field Intelligence corpus bridge
// =============================================================================
// Field Validation milestone step 2: real / tournament-shaped Commander lists
// into the **same** harness report shape as synthetic fixtures.
//
// Observational only. Does not change Brain construction weights or planning.
// writesToBrain: false
// =============================================================================

import { TORTURE_FIXTURES } from "../tests/commander-torture-bench/fixtures.mjs";
import { materializeCompetitiveFixtureCorpus } from "./field-intelligence/fixtures/competitive-corpus.mjs";

const freeze = (value) => Object.freeze(value);

export const CORPUS_HARNESS_ADAPTER_VERSION = "validation-harness-corpus-v1";

function fixtureForCommander(name = "") {
  const key = String(name || "").trim().toLowerCase();
  return TORTURE_FIXTURES.find((fixture) => String(fixture.commander?.name || "").toLowerCase() === key) || null;
}

function archetypeForRecord(record, fixture) {
  return (
    record?.statedArchetype
    || record?.archetypeTags?.[0]
    || fixture?.archetype
    || "corpus_untyped"
  );
}

/**
 * Observation fixture: structural gates only — no torture-matrix assertions.
 * Those assertions lock synthetic construction; corpus lists are evidence.
 */
export function observationFixtureFromRecord(record, poolFixture = null) {
  const commander = record?.commanders?.[0] || poolFixture?.commander || null;
  return freeze({
    id: String(record?.id || "corpus-unknown"),
    archetype: archetypeForRecord(record, poolFixture),
    why: "Tournament-shaped / community corpus list observed through the import path.",
    commander,
    assertions: freeze([]),
    note: record?.provenance?.note || "corpus_observation",
  });
}

/**
 * Map one CorpusDeckRecord into a harness caseSpec + forge input.
 * Returns null when the record cannot be forged offline (no matching pool).
 */
export function corpusRecordToHarnessCase(record, options = {}) {
  if (!record?.rows?.length || !record?.commanders?.[0]?.name) return null;
  const seed = Number.isFinite(options.seed) ? Number(options.seed) : 11;
  const commander = record.commanders[0];
  const poolFixture = fixtureForCommander(commander.name);
  if (!poolFixture?.cards?.length) return null;

  const fixture = observationFixtureFromRecord(record, poolFixture);
  const importedRows = record.rows
    .map((row) => ({
      quantity: Math.max(1, Number(row.quantity) || 1),
      name: String(row.name || "").trim(),
    }))
    .filter((row) => row.name);

  if (!importedRows.length) return null;

  return freeze({
    runId: `${record.id}::seed-${seed}`,
    fixtureId: fixture.id,
    archetype: fixture.archetype,
    seed,
    fixture,
    corpus: freeze({
      recordId: record.id,
      evidenceTier: record.evidenceTier || null,
      sourceType: record.sourceType || null,
      performanceClass: record.performanceClass || null,
      placement: record.placement ?? null,
      topCut: Boolean(record.topCut),
      eventId: record.eventId || null,
      eventName: record.eventName || null,
      adapter: record.provenance?.adapter || null,
      note: record.provenance?.note || null,
    }),
    forgePath: "imported",
    forgeInput: freeze({
      format: record.format || "Commander",
      target: 100,
      strategy: "Balanced midrange",
      seed,
      commander,
      note: "",
      cards: poolFixture.cards,
      importedRows: freeze(importedRows),
    }),
  });
}

/**
 * Expand corpus deck records into harness cases (deterministic order).
 */
export function expandCorpusRecords(records = [], options = {}) {
  const seeds = (options.seeds || [11]).map(Number).filter(Number.isFinite);
  const limit = Number.isFinite(options.limit) ? options.limit : Infinity;
  const preferTopCut = options.preferTopCut !== false;
  const sorted = [...(Array.isArray(records) ? records : [])].sort((a, b) => {
    if (preferTopCut && Boolean(a.topCut) !== Boolean(b.topCut)) {
      return a.topCut ? -1 : 1;
    }
    const placeA = Number.isFinite(a.placement) ? a.placement : 9999;
    const placeB = Number.isFinite(b.placement) ? b.placement : 9999;
    return placeA - placeB || String(a.id).localeCompare(String(b.id));
  });

  const cases = [];
  for (const seed of seeds) {
    for (const record of sorted) {
      if (cases.length >= limit) return freeze(cases);
      const entry = corpusRecordToHarnessCase(record, { seed });
      if (entry) cases.push(entry);
    }
  }
  return freeze(cases);
}

/**
 * Offline Field Validation corpus: tournament-shaped competitive fixtures.
 * Provenance stays synthetic_competitive_fixture — not live EDHREC truth.
 */
export function loadOfflineFieldCorpusCases(options = {}) {
  const corpus = materializeCompetitiveFixtureCorpus();
  const cases = expandCorpusRecords(corpus.records, options);
  return freeze({
    version: CORPUS_HARNESS_ADAPTER_VERSION,
    writesToBrain: false,
    source: freeze({
      kind: "competitive_fixture_corpus",
      corpusVersion: corpus.version,
      stats: corpus.stats,
      honesty: "Tournament-shaped offline sample. Not live community truth.",
    }),
    cases,
  });
}

/**
 * Annotate a validation record with corpus provenance (same report family).
 */
export function withCorpusProvenance(record, caseSpec) {
  if (!caseSpec?.corpus) return record;
  return freeze({
    ...record,
    corpus: caseSpec.corpus,
    forgePath: caseSpec.forgePath || "imported",
  });
}

/**
 * Summarize corpus provenance across a run for the shared report object.
 */
export function summarizeCorpusObservation(records = []) {
  const withCorpus = (records || []).filter((record) => record?.corpus);
  if (!withCorpus.length) {
    return freeze({
      present: false,
      note: "No corpus-backed cases in this run.",
    });
  }
  const byTier = {};
  const bySource = {};
  let topCut = 0;
  for (const record of withCorpus) {
    const tier = record.corpus.evidenceTier || "unknown";
    const source = record.corpus.sourceType || "unknown";
    byTier[tier] = (byTier[tier] || 0) + 1;
    bySource[source] = (bySource[source] || 0) + 1;
    if (record.corpus.topCut) topCut += 1;
  }
  return freeze({
    present: true,
    adapterVersion: CORPUS_HARNESS_ADAPTER_VERSION,
    cases: withCorpus.length,
    topCutCases: topCut,
    evidenceTierDistribution: freeze(byTier),
    sourceTypeDistribution: freeze(bySource),
    forgePath: "imported",
    honesty: "Corpus observation uses the import path. Construction policy unchanged.",
  });
}


/**
 * Read-only bridge for Opinion Engine (and Mentor shadow).
 * Returns weak, provenance-honest evidence tips from a harness report's
 * corpusObservation — never live Commander truth, never Brain authority.
 */
export function opinionEvidenceFromCorpusObservation(corpusObservation = null) {
  if (!corpusObservation?.present) {
    return freeze({
      usable: false,
      writesToBrain: false,
      authorityClass: "competitive_fixture_corpus",
      note: "No corpusObservation on this harness report.",
      claims: freeze([]),
    });
  }
  const sourceTypes = Object.keys(corpusObservation.sourceTypeDistribution || {});
  const fixtureOnly = sourceTypes.length > 0
    && sourceTypes.every((type) => /fixture|synthetic/i.test(type));
  return freeze({
    usable: true,
    writesToBrain: false,
    authorityClass: fixtureOnly ? "competitive_fixture_corpus" : "community_observation",
    maxConfidenceHint: fixtureOnly ? 0.3 : 0.5,
    liveTruth: false,
    cases: corpusObservation.cases,
    topCutCases: corpusObservation.topCutCases,
    evidenceTierDistribution: corpusObservation.evidenceTierDistribution,
    sourceTypeDistribution: corpusObservation.sourceTypeDistribution,
    forgePath: corpusObservation.forgePath,
    honesty: corpusObservation.honesty,
    claims: freeze([
      freeze({
        direction: "uncertain",
        statement: fixtureOnly
          ? "Tournament-shaped fixture corpus exercised the import path; it does not establish live Commander truth."
          : "Corpus observation is available for contextual judgment; weigh by evidence tier and independence.",
        sourceKind: fixtureOnly ? "competitive_fixture_corpus" : "community_observation",
      }),
    ]),
  });
}
