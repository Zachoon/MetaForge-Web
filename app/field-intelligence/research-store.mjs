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

  observations.push({
    kind: "corpus_snapshot",
    decksAnalyzed: artifact.corpus?.decksAnalyzed,
    eventsRepresented: artifact.corpus?.eventsRepresented,
    usableLevelATopology: artifact.levelATopology?.usableCohorts,
    fingerprint: researchFingerprint({
      deckId: `corpus:${generatedAt.slice(0, 10)}:${artifact.corpus?.decksAnalyzed}:${artifact.corpus?.eventsRepresented}`,
    }),
    generatedAt,
  });

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
