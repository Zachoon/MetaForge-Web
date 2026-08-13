// =============================================================================
// Field Intelligence v1.3 — Append-only research store (JSONL)
// =============================================================================
// Longitudinal evidence retention. No API secrets / unnecessary PII.
// Deduplicate by stable event/deck fingerprints.
// =============================================================================

import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const freeze = (value) => Object.freeze(value);

function stableHash(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 24);
}

export function researchFingerprint({ eventId = null, deckId = null, commanders = [], rows = [] } = {}) {
  const names = (rows || []).map((r) => String(r.name || "").toLocaleLowerCase("en")).sort();
  return stableHash({
    eventId: eventId || null,
    deckId: deckId || null,
    commanders: [...(commanders || [])].map((c) => (typeof c === "string" ? c : c.name)).sort(),
    cards: names,
  });
}

function sanitizeRecord(record = {}) {
  // Strip player PII / secrets if present.
  const {
    authorKey: _authorKey,
    playerName: _playerName,
    player: _player,
    email: _email,
    apiKey: _apiKey,
    authorization: _authorization,
    ...rest
  } = record;
  return rest;
}

/**
 * Append research observations. Skips fingerprints already present.
 */
export function appendResearchObservations(storePath, observations = [], options = {}) {
  mkdirSync(dirname(storePath), { recursive: true });
  const existing = new Set();
  if (existsSync(storePath)) {
    const text = readFileSync(storePath, "utf8");
    for (const line of text.split(/\r?\n/)) {
      if (!line.trim()) continue;
      try {
        const row = JSON.parse(line);
        if (row.fingerprint) existing.add(row.fingerprint);
      } catch {
        // skip corrupt lines
      }
    }
  }

  let written = 0;
  let skipped = 0;
  const lines = [];
  for (const observation of observations) {
    const clean = sanitizeRecord(observation);
    const fingerprint = clean.fingerprint
      || researchFingerprint(clean);
    if (existing.has(fingerprint) && options.allowDuplicate !== true) {
      skipped += 1;
      continue;
    }
    existing.add(fingerprint);
    const row = {
      ...clean,
      fingerprint,
      storedAt: new Date().toISOString(),
      storeSchema: "field-intel-research-jsonl-v1",
    };
    lines.push(JSON.stringify(row));
    written += 1;
  }
  if (lines.length) appendFileSync(storePath, `${lines.join("\n")}\n`, "utf8");
  return freeze({ written, skipped, path: storePath });
}

export function readResearchStore(storePath, options = {}) {
  if (!existsSync(storePath)) {
    return freeze({ path: storePath, rows: freeze([]), count: 0 });
  }
  const rows = [];
  const text = readFileSync(storePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      rows.push(JSON.parse(line));
    } catch {
      // skip
    }
  }
  const limit = options.limit || rows.length;
  return freeze({
    path: storePath,
    rows: freeze(rows.slice(-limit)),
    count: rows.length,
  });
}

export function defaultResearchStorePath(baseDir) {
  return join(baseDir, "research-store", "observations.jsonl");
}

/**
 * Build compact observations from a FI artifact for persistence.
 */
export function observationsFromArtifact(artifact = {}) {
  const generatedAt = artifact.generatedAt || new Date().toISOString();
  const observations = [];

  for (const cohort of artifact.levelATopology?.cohorts || []) {
    observations.push({
      kind: "level_a_topology_cohort",
      eventId: cohort.eventId,
      commanderIdentity: cohort.commanderIdentity,
      strongest: (cohort.strongest || []).slice(0, 6),
      highCount: cohort.highCount,
      lowCount: cohort.lowCount,
      fingerprint: researchFingerprint({
        eventId: cohort.eventId,
        deckId: `level-a-topo:${cohort.commanderIdentity}`,
        commanders: [cohort.commanderIdentity],
      }),
      generatedAt,
    });
  }

  for (const seq of artifact.strategicSequences?.evidence || []) {
    observations.push({
      kind: "strategic_sequence",
      sequenceId: seq.sequenceId,
      confidence: seq.confidence,
      eliteTag: seq.eliteTag,
      decksObserved: seq.decksObserved,
      independentEvents: seq.independentEvents,
      fingerprint: researchFingerprint({
        deckId: `seq:${seq.sequenceId}`,
        commanders: seq.commandersObserved || [],
      }),
      generatedAt,
    });
  }

  for (const candidate of artifact.topologyDiscovery?.candidates || []) {
    observations.push({
      kind: "discovery_candidate",
      candidateKind: candidate.kind,
      id: candidate.id,
      confidence: candidate.confidence,
      whatAppearsMissing: candidate.whatAppearsMissing,
      fingerprint: researchFingerprint({
        deckId: candidate.id,
        commanders: [],
      }),
      generatedAt,
    });
  }

  observations.push(...observationsFromPrincipleRegistry(artifact.strategicPrincipleRegistry, { generatedAt }));

  observations.push({
    kind: "corpus_snapshot",
    decksAnalyzed: artifact.corpus?.decksAnalyzed,
    eventsRepresented: artifact.corpus?.eventsRepresented,
    usableLevelATopology: artifact.levelATopology?.usableCohorts,
    principleCount: artifact.strategicPrincipleRegistry?.principleCount || 0,
    fingerprint: researchFingerprint({
      deckId: `corpus:${generatedAt.slice(0, 10)}:${artifact.corpus?.decksAnalyzed}:${artifact.corpus?.eventsRepresented}`,
    }),
    generatedAt,
  });

  return observations;
}

/**
 * Persist principle snapshots + evidence deltas for longitudinal confidence.
 */
export function observationsFromPrincipleRegistry(registry = null, options = {}) {
  if (!registry) return [];
  const generatedAt = options.generatedAt || registry.generatedAt || new Date().toISOString();
  const observations = [];

  for (const principle of registry.principles || []) {
    observations.push({
      kind: "strategic_principle",
      principleId: principle.id,
      status: principle.status,
      confidence: principle.confidence,
      kindPrinciple: principle.kind,
      principle: {
        id: principle.id,
        title: principle.title,
        description: principle.description,
        kind: principle.kind,
        status: principle.status,
        feature: principle.feature,
        featureFamily: principle.featureFamily,
        observedDirection: principle.observedDirection,
        confidence: principle.confidence,
        confidenceHistory: principle.confidenceHistory,
        evidence: principle.evidence,
        origins: principle.origins,
        whatBrainV1Understands: principle.whatBrainV1Understands,
        whatAppearsMissing: principle.whatAppearsMissing,
        lesson: principle.lesson,
        writesToBrain: false,
        activated: false,
        promoted: false,
        rejected: principle.rejected,
      },
      fingerprint: researchFingerprint({
        deckId: `principle:${principle.id}:${generatedAt.slice(0, 10)}:${principle.confidence}`,
        commanders: principle.evidence?.commanderFamilies || [],
      }),
      generatedAt,
    });

    observations.push({
      kind: "principle_evidence_delta",
      principleId: principle.id,
      supportingEvents: principle.evidence?.supportingEvents || [],
      contradictingEvents: principle.evidence?.contradictingEvents || [],
      confidence: principle.confidence,
      status: principle.status,
      fingerprint: researchFingerprint({
        deckId: `principle-delta:${principle.id}:${(principle.evidence?.supportingEvents || []).join(",")}:${(principle.evidence?.contradictingEvents || []).join(",")}`,
      }),
      generatedAt,
    });
  }

  return observations;
}

export function writeResearchIndex(storeDir, summary = {}) {
  mkdirSync(storeDir, { recursive: true });
  const path = join(storeDir, "index.json");
  writeFileSync(path, JSON.stringify({
    version: "research-store-index-v1",
    updatedAt: new Date().toISOString(),
    ...summary,
  }, null, 2));
  return path;
}

export function readResearchIndex(storeDir) {
  const path = join(storeDir, "index.json");
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

/**
 * Answer: "What changed since last run?"
 */
export function summarizeResearchDelta({
  priorIndex = null,
  appendResult = null,
  currentArtifact = null,
} = {}) {
  const current = {
    events: currentArtifact?.corpus?.eventsRepresented || 0,
    decks: currentArtifact?.corpus?.decksAnalyzed || 0,
    commanders: currentArtifact?.corpus?.uniqueCommanders || 0,
    principles: currentArtifact?.strategicPrincipleRegistry?.principleCount || 0,
    corpusMode: currentArtifact?.provenance?.corpusMode || null,
    generatedAt: currentArtifact?.generatedAt || null,
  };
  const prior = {
    events: priorIndex?.snapshot?.events ?? priorIndex?.events ?? 0,
    decks: priorIndex?.snapshot?.decks ?? priorIndex?.decks ?? 0,
    commanders: priorIndex?.snapshot?.commanders ?? 0,
    principles: priorIndex?.snapshot?.principles ?? priorIndex?.principleCount ?? 0,
    totalRows: priorIndex?.totalRows ?? 0,
    generatedAt: priorIndex?.lastRun || priorIndex?.updatedAt || null,
    corpusMode: priorIndex?.snapshot?.corpusMode || priorIndex?.corpusMode || null,
  };

  return freeze({
    version: "research-delta-v1",
    questionAnswered: "What changed since last run?",
    priorRunAt: prior.generatedAt,
    currentRunAt: current.generatedAt,
    append: freeze({
      written: appendResult?.written ?? 0,
      skipped: appendResult?.skipped ?? 0,
      path: appendResult?.path || null,
    }),
    deltas: freeze({
      events: current.events - prior.events,
      decks: current.decks - prior.decks,
      commanders: current.commanders - prior.commanders,
      principles: current.principles - prior.principles,
      storeRowsWritten: appendResult?.written ?? 0,
    }),
    current: freeze(current),
    prior: freeze(prior),
  });
}
