// =============================================================================
// Knowledge — Live tournament observation ingest
// =============================================================================
// Materialize elite tournament deck records from TopDeck live-cache (and optional
// refresh). Feeds Epic 2 fingerprints. Observation only — writesToBrain: false.
// =============================================================================

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  fetchTopDeckTournamentsChunked,
  normalizeTopDeckCorpus,
  TOPDECK_ATTRIBUTION,
} from "../field-intelligence/adapters/topdeck.mjs";
import {
  annotatePerformanceClasses,
  dedupeCorpusRecords,
  DEFAULT_LIVE_SAMPLE,
} from "../field-intelligence/live-sample.mjs";
import { defaultLiveCacheDir } from "../field-intelligence/live-ingest-cache.mjs";
import { enrichCorpusRecords } from "../field-intelligence/card-enrichment.mjs";
import { buildEliteTournamentIntelligence } from "./elite-tournament-intelligence.mjs";

const freeze = (value) => Object.freeze(value);

export function defaultFieldIntelligenceDir() {
  return join(dirname(fileURLToPath(import.meta.url)), "../../tests/field-intelligence");
}

function mergeTournamentsById(lists = []) {
  const byId = new Map();
  for (const list of lists) {
    for (const tournament of list || []) {
      const id = String(tournament?.TID ?? tournament?.id ?? tournament?.tournamentId ?? "");
      if (!id) continue;
      if (!byId.has(id)) byId.set(id, tournament);
    }
  }
  return [...byId.values()];
}

/**
 * Read raw TopDeck tournaments already on disk (no network).
 */
export function loadTournamentsFromLiveCache(cacheDir = null) {
  const dir = cacheDir || defaultLiveCacheDir(defaultFieldIntelligenceDir());
  const root = join(dir, "topdeck");
  if (!existsSync(root)) {
    return freeze({
      ok: false,
      reason: "missing_live_cache",
      tournaments: freeze([]),
      chunksRead: 0,
      cacheDir: dir,
    });
  }
  const files = readdirSync(root)
    .filter((name) => name.startsWith("chunk-") && name.endsWith(".json"))
    .sort();
  const lists = [];
  for (const name of files) {
    try {
      const payload = JSON.parse(readFileSync(join(root, name), "utf8"));
      lists.push(payload.tournaments || []);
    } catch {
      // skip corrupt chunk
    }
  }
  const tournaments = mergeTournamentsById(lists);
  return freeze({
    ok: tournaments.length > 0,
    reason: tournaments.length ? null : "empty_live_cache",
    tournaments: freeze(tournaments),
    chunksRead: files.length,
    cacheDir: dir,
    attribution: TOPDECK_ATTRIBUTION,
  });
}

/**
 * Materialize CorpusDeckRecords from live cache and/or fresh TopDeck fetch.
 * Continuous observation — not a Friday-only ritual.
 */
export async function materializeLiveTournamentRecords(options = {}) {
  const fieldDir = options.fieldIntelligenceDir || defaultFieldIntelligenceDir();
  const cacheDir = options.liveCacheDir || defaultLiveCacheDir(fieldDir);
  const sample = {
    lastDays: options.lastDays ?? 90,
    participantMin: options.participantMin ?? DEFAULT_LIVE_SAMPLE.participantMin,
    maxEvents: options.maxEvents ?? 75,
    maxDecksPerEvent: options.maxDecksPerEvent ?? 24,
  };

  let tournaments = [];
  let ingestMode = "cache";
  let fetchMeta = null;

  if (options.refresh) {
    const fetched = await fetchTopDeckTournamentsChunked({
      apiKey: options.apiKey || process.env.TOPDECK_API_KEY,
      liveCacheDir: cacheDir,
      lastDays: sample.lastDays,
      participantMin: sample.participantMin,
      maxEvents: sample.maxEvents,
      onProgress: options.onProgress,
    });
    fetchMeta = freeze({
      ok: fetched.ok,
      status: fetched.status,
      reason: fetched.reason,
      chunking: fetched.chunking || null,
    });
    if (fetched.ok || (fetched.tournaments || []).length) {
      tournaments = fetched.tournaments || [];
      ingestMode = fetched.status === "ok" ? "refresh" : "refresh_partial";
    }
  }

  if (!tournaments.length) {
    const cached = loadTournamentsFromLiveCache(cacheDir);
    tournaments = cached.tournaments || [];
    ingestMode = tournaments.length ? "cache" : "empty";
    if (!tournaments.length) {
      return freeze({
        writesToBrain: false,
        ok: false,
        reason: cached.reason || fetchMeta?.reason || "no_tournaments",
        records: freeze([]),
        ingestMode,
        fetchMeta,
        cacheDir,
        attribution: TOPDECK_ATTRIBUTION,
      });
    }
  }

  // Cap events by recency when possible (tournament start / TID order is adapter-dependent).
  if (Number.isFinite(sample.maxEvents) && tournaments.length > sample.maxEvents) {
    tournaments = tournaments.slice(0, sample.maxEvents);
  }

  const normalized = normalizeTopDeckCorpus(tournaments, {
    maxDecksPerEvent: sample.maxDecksPerEvent,
    preferTopCut: true,
    includeLowerComparison: true,
  });
  const annotated = annotatePerformanceClasses(normalized.records || []);
  const deduped = dedupeCorpusRecords(annotated);
  let records = deduped.records || [];
  let enrichmentStats = null;

  if (options.enrich !== false && records.length) {
    const enriched = await enrichCorpusRecords(records, {
      fetchImpl: options.fetchImpl,
    });
    records = enriched.records || enriched || [];
    enrichmentStats = enriched.stats || null;
  }

  return freeze({
    writesToBrain: false,
    ok: true,
    reason: null,
    records: freeze(records),
    ingestMode,
    fetchMeta,
    cacheDir,
    sample: freeze(sample),
    stats: freeze({
      tournaments: tournaments.length,
      records: records.length,
      eventsRepresented: new Set(records.map((r) => r.eventId).filter(Boolean)).size,
      uniqueCommanders: new Set(
        records.flatMap((r) => (r.commanders || []).map((c) => c.name || c)).filter(Boolean),
      ).size,
      topCutDecks: records.filter((r) => r.topCut === true).length,
      dedupe: deduped.stats || null,
      enrichment: enrichmentStats,
    }),
    attribution: TOPDECK_ATTRIBUTION,
  });
}

/**
 * Build Epic 2 elite tournament intelligence from live observation records.
 */
export async function buildEliteTournamentIntelligenceFromLive(options = {}) {
  const materialized = await materializeLiveTournamentRecords(options);
  if (!materialized.ok) {
    return freeze({
      writesToBrain: false,
      ok: false,
      reason: materialized.reason,
      brainChanges: 0,
      ingest: materialized,
      intelligence: null,
    });
  }
  const intelligence = buildEliteTournamentIntelligence({
    records: materialized.records,
    label: options.label || `live-topdeck-${materialized.ingestMode}`,
  });
  return freeze({
    writesToBrain: false,
    ok: true,
    reason: null,
    brainChanges: 0,
    ingest: materialized,
    intelligence,
  });
}
