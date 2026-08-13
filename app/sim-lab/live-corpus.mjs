// =============================================================================
// Sim-Lab — rebuild live Academy corpus from disk cache (no Brain, no network)
// =============================================================================

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { normalizeTopDeckCorpus } from "../field-intelligence/adapters/topdeck.mjs";
import { annotatePerformanceClasses, dedupeCorpusRecords } from "../field-intelligence/live-sample.mjs";

const freeze = (value) => Object.freeze(value);

/** Phase 1 Academy observation bounds (must match live run). */
export const LIVE_ACADEMY_SAMPLE = Object.freeze({
  lastDays: 90,
  participantMin: 16,
  maxEvents: 75,
  maxDecksPerEvent: 24,
  preferTopCut: true,
  includeLowerComparison: true,
  lowerComparisonSlots: 6,
  topCutSlots: 8,
});

/**
 * Load tournaments from Sim-Lab / Academy live-cache directory.
 */
export function loadCachedTopDeckTournaments(cacheDir) {
  const root = join(cacheDir, "topdeck");
  if (!existsSync(root)) {
    return freeze({ ok: false, reason: "missing_live_cache", tournaments: freeze([]) });
  }
  const files = readdirSync(root).filter((f) => f.startsWith("chunk-") && f.endsWith(".json"));
  const byId = new Map();
  for (const file of files) {
    try {
      const payload = JSON.parse(readFileSync(join(root, file), "utf8"));
      for (const tournament of payload.tournaments || []) {
        const id = String(tournament.TID || tournament.tid || tournament.id || "");
        if (!id || byId.has(id)) continue;
        byId.set(id, tournament);
      }
    } catch {
      // skip corrupt chunk
    }
  }
  let tournaments = [...byId.values()];
  // Prefer recent tournaments when capping — approximate Phase 1 merge+slice.
  tournaments.sort((a, b) => (Number(b.startDate) || 0) - (Number(a.startDate) || 0));
  if (Number.isFinite(LIVE_ACADEMY_SAMPLE.maxEvents)) {
    tournaments = tournaments.slice(0, LIVE_ACADEMY_SAMPLE.maxEvents);
  }
  return freeze({
    ok: tournaments.length > 0,
    reason: tournaments.length ? null : "empty_cache",
    tournaments: freeze(tournaments),
    chunkFiles: files.length,
  });
}

/**
 * Materialize live Academy deck records from cache (fixture-free).
 */
export function materializeLiveAcademyCorpus(cacheDir) {
  const cached = loadCachedTopDeckTournaments(cacheDir);
  if (!cached.ok) {
    return freeze({
      ok: false,
      reason: cached.reason,
      records: freeze([]),
      events: 0,
      syntheticFixtures: "NOT_USED",
      corpusMode: "live_cache_miss",
    });
  }
  const normalized = normalizeTopDeckCorpus(cached.tournaments, LIVE_ACADEMY_SAMPLE);
  const classified = annotatePerformanceClasses(normalized.records);
  const deduped = dedupeCorpusRecords(classified);
  const events = new Set(deduped.records.map((r) => r.eventId).filter(Boolean));
  return freeze({
    ok: deduped.records.length > 0,
    reason: null,
    records: freeze(deduped.records),
    events: events.size,
    decks: deduped.records.length,
    syntheticFixtures: "NOT_USED",
    corpusMode: "live",
    source: "topdeck_live_cache",
    sample: LIVE_ACADEMY_SAMPLE,
    dedupe: deduped.stats,
  });
}
