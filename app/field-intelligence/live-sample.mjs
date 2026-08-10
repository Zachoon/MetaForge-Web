// =============================================================================
// Field Intelligence — Cross-source dedupe + live sample bounds
// =============================================================================

import { corpusDeckFingerprint, createCorpusDeckRecord } from "./corpus-schema.mjs";
import { calculateCompetitiveEvidenceWeight } from "./evidence-quality.mjs";

const freeze = (value) => Object.freeze(value);
const normalized = (value = "") => String(value).normalize("NFKC").trim().toLocaleLowerCase("en");

export const DEFAULT_LIVE_SAMPLE = Object.freeze({
  lastDays: 30,
  participantMin: 16,
  maxEvents: 25,
  maxDecksPerEvent: 16,
  // Prefer converters + a comparison sample from the same event.
  preferTopCut: true,
  includeLowerComparison: true,
  lowerComparisonSlots: 6,
  topCutSlots: 8,
  formats: Object.freeze(["EDH"]), // TopDeck format string
  spicerackFormats: Object.freeze(["COMMANDER2"]),
});

/**
 * Select standings for contrast learning: top-cut/winners + lower placers.
 */
export function selectContrastStandings(standings = [], options = {}) {
  const topCutSize = Number(options.topCutSize) || 0;
  const topCutSlots = options.topCutSlots ?? DEFAULT_LIVE_SAMPLE.topCutSlots;
  const lowerSlots = options.lowerComparisonSlots ?? DEFAULT_LIVE_SAMPLE.lowerComparisonSlots;
  const maxDecks = options.maxDecksPerEvent ?? DEFAULT_LIVE_SAMPLE.maxDecksPerEvent;

  const ranked = standings.map((standing, index) => ({
    standing,
    index,
    placement: Number.isFinite(standing.standing) ? standing.standing : index + 1,
  }));

  const converters = ranked.filter((row) => (
    (topCutSize > 0 && row.placement <= topCutSize) || row.placement <= 4
  )).slice(0, topCutSlots);

  const converterIds = new Set(converters.map((row) => row.index));
  const lower = ranked
    .filter((row) => !converterIds.has(row.index))
    .sort((a, b) => b.placement - a.placement)
    .slice(0, lowerSlots);

  const selected = [...converters, ...lower]
    .sort((a, b) => a.placement - b.placement)
    .slice(0, maxDecks);

  return freeze(selected.map((row) => freeze({
    ...row.standing,
    standing: row.placement,
    _selectedAs: converters.includes(row) ? "converter_or_top" : "lower_comparison",
  })));
}

/**
 * Deduplicate records across sources.
 * Prefer higher evidence class / performance weight when fingerprints collide.
 */
export function dedupeCorpusRecords(records = [], options = {}) {
  const byFingerprint = new Map();
  const byEventPlayer = new Map();
  let fingerprintDupes = 0;
  let eventPlayerDupes = 0;

  const classRank = (record) => {
    const order = [
      "repeated_converter",
      "single_event_converter",
      "tournament_participant",
      "tournament_performance",
      "curated_expert",
      "broad_community",
      "public_user",
      "synthetic_fixture",
    ];
    const idx = order.indexOf(record.performanceClass || record.evidenceTier);
    return idx >= 0 ? idx : order.length;
  };

  const prefer = (a, b) => {
    const classDelta = classRank(a) - classRank(b);
    if (classDelta !== 0) return classDelta < 0 ? a : b;
    const weightA = Number(a.performanceWeight) || 0;
    const weightB = Number(b.performanceWeight) || 0;
    if (weightA !== weightB) return weightA > weightB ? a : b;
    // Stable tie-break: source preference TopDeck > Spicerack > other.
    const sourceRank = (r) => (
      r.tournamentSource === "topdeck" ? 0
        : r.tournamentSource === "spicerack" ? 1
          : 2
    );
    if (sourceRank(a) !== sourceRank(b)) return sourceRank(a) < sourceRank(b) ? a : b;
    return a.id <= b.id ? a : b;
  };

  for (const record of records) {
    const eventPlayerKey = [
      normalized(record.eventId || ""),
      normalized((record.commanders || []).map((c) => c.name).sort().join("+")),
      normalized(record.authorKey || record.sourceKey || ""),
      record.placement ?? "",
    ].join("::");

    if (record.eventId && (record.authorKey || record.sourceKey)) {
      const prev = byEventPlayer.get(eventPlayerKey);
      if (prev) {
        eventPlayerDupes += 1;
        byEventPlayer.set(eventPlayerKey, prefer(prev, record));
        continue;
      }
      byEventPlayer.set(eventPlayerKey, record);
    }

    const fp = corpusDeckFingerprint(record);
    const prevFp = byFingerprint.get(fp);
    if (prevFp) {
      fingerprintDupes += 1;
      byFingerprint.set(fp, prefer(prevFp, record));
    } else {
      byFingerprint.set(fp, record);
    }
  }

  // Merge maps: event-player winners first, then remaining fingerprints.
  const kept = new Map();
  for (const record of byEventPlayer.values()) {
    kept.set(record.id, record);
  }
  for (const record of byFingerprint.values()) {
    if (![...kept.values()].some((r) => corpusDeckFingerprint(r) === corpusDeckFingerprint(record))) {
      kept.set(record.id, record);
    }
  }

  const deduped = [...kept.values()].sort((a, b) => a.id.localeCompare(b.id));
  return freeze({
    records: freeze(deduped),
    stats: freeze({
      input: records.length,
      output: deduped.length,
      fingerprintDuplicates: fingerprintDupes,
      eventPlayerDuplicates: eventPlayerDupes,
      duplicateRate: records.length
        ? Number(((records.length - deduped.length) / records.length).toFixed(3))
        : 0,
    }),
  });
}

/**
 * Annotate repeated converters across independent events for the same commander family.
 * Fine performance classes:
 *   repeated_converter > single_event_converter > tournament_participant
 */
export function annotatePerformanceClasses(records = []) {
  const converterEventsByCommander = new Map();
  for (const record of records) {
    if (!record.topCut && record.placement !== 1) continue;
    const commanderKey = (record.commanders || []).map((c) => normalized(c.name)).sort().join("+");
    if (!commanderKey || !record.eventId) continue;
    const set = converterEventsByCommander.get(commanderKey) || new Set();
    set.add(String(record.eventId));
    converterEventsByCommander.set(commanderKey, set);
  }

  return freeze(records.map((record) => {
    const commanderKey = (record.commanders || []).map((c) => normalized(c.name)).sort().join("+");
    const converterEvents = converterEventsByCommander.get(commanderKey)?.size || 0;
    let performanceClass = "tournament_participant";
    if (record.topCut === true || record.placement === 1) {
      performanceClass = converterEvents >= 2 ? "repeated_converter" : "single_event_converter";
    } else if (record.evidenceTier === "curated_expert") {
      performanceClass = "curated_expert";
    } else if (record.evidenceTier === "broad_community") {
      performanceClass = "broad_community";
    } else if (record.evidenceTier === "synthetic_fixture") {
      performanceClass = "synthetic_fixture";
    }

    const draft = {
      ...record,
      commanders: record.commanders,
      rows: record.rows,
      performanceClass,
      independentConverterEvents: converterEvents,
      provenance: record.provenance,
    };
    const weight = calculateCompetitiveEvidenceWeight(draft, {
      independentEventCount: Math.max(converterEvents, 1),
    });
    return createCorpusDeckRecord({ ...draft, performanceWeight: weight.weight });
  }));
}
