// =============================================================================
// Field Intelligence v1 — Corpus Schema (expert / tournament hierarchy)
// =============================================================================
// Real decks are evidence, not truth. Brain v1 construction is never mutated.
// Evidence hierarchy:
//   tournament_performance > curated_expert > broad_community > public_user
// =============================================================================

export const CORPUS_SCHEMA_VERSION = "corpus-deck-record-v1";
export const CORPUS_ANALYSIS_VERSION = "corpus-deck-analysis-v1";
export const CORPUS_INTELLIGENCE_VERSION = "corpus-intelligence-v1.2";

/** Teaching hierarchy — lower index = stronger strategic teacher. */
export const EVIDENCE_TIERS = Object.freeze([
  "tournament_performance", // Tier 1 umbrella — event results + decklists
  "curated_expert", // Tier 2 — cEDH DDB and similar curation
  "broad_community", // Tier 3 — EDHREC aggregates (secondary)
  "public_user", // Tier 4 — optional context, never primary teacher
  "alpha_player", // reserved; permissioned separately
  "synthetic_fixture", // offline pipeline fixtures only
]);

/** Finer performance classes inside tournament evidence. */
export const PERFORMANCE_CLASSES = Object.freeze([
  "repeated_converter", // Top-cut/win across multiple independent events
  "single_event_converter", // Top-cut/win in one observed event
  "tournament_participant", // Registered / played, did not convert
  "curated_expert",
  "broad_community",
  "public_user",
  "synthetic_fixture",
]);

export const CORPUS_SOURCE_TYPES = Object.freeze([
  "topdeck_tournament",
  "spicerack_tournament",
  "edhtop16_tournament",
  "cedh_decklist_database",
  "edhrec_aggregate",
  "moxfield_tournament_linked",
  "moxfield_explicit_public",
  "alpha_player_deck",
  "hand_authored_public_seed",
  "synthetic_competitive_fixture",
  "public_list",
]);

const freeze = (value) => Object.freeze(value);
const normalized = (value = "") => String(value).normalize("NFKC").trim().toLocaleLowerCase("en");

/**
 * Create a versioned CorpusDeckRecord.
 * Tournament / curated / popularity fields are optional and stay null when absent.
 */
export function createCorpusDeckRecord(input = {}) {
  const commanders = normalizeCommanders(input.commanders || input.commander);
  const rows = normalizeRows(input.rows || []);
  const evidenceTier = EVIDENCE_TIERS.includes(input.evidenceTier)
    ? input.evidenceTier
    : inferEvidenceTier(input);
  const id = String(input.id || [
    evidenceTier,
    input.eventId || "no-event",
    commanders[0]?.name || "unknown",
    input.sourceKey || "anon",
  ].join("::"));

  const performance = normalizePerformance(input);
  const performanceWeight = Number.isFinite(input.performanceWeight)
    ? input.performanceWeight
    : null;

  return freeze({
    version: CORPUS_SCHEMA_VERSION,
    id,
    commanders,
    rows,
    deckText: input.deckText || rowsToDeckText(rows),
    colorIdentity: freeze([...(input.colorIdentity || commanders.flatMap((c) => c.colors || []))]),
    format: input.format || "Commander",
    sourceType: CORPUS_SOURCE_TYPES.includes(input.sourceType) ? input.sourceType : "public_list",
    sourceKey: input.sourceKey || null,
    sourceUri: input.sourceUri || null,
    observedAt: input.observedAt || null,
    archetypeTags: freeze([...(input.archetypeTags || [])].map(String).sort()),
    statedArchetype: input.statedArchetype || null,
    powerLevel: Number.isFinite(input.powerLevel) ? input.powerLevel : null,
    budgetBand: input.budgetBand || null,
    popularity: input.popularity ? freeze({ ...input.popularity }) : null,
    authorKey: input.authorKey || null,
    // --- Competitive / expert evidence fields ---
    evidenceTier,
    eventId: input.eventId || null,
    eventName: input.eventName || null,
    eventSize: Number.isFinite(input.eventSize) ? input.eventSize : null,
    placement: Number.isFinite(input.placement) ? input.placement : null,
    topCut: input.topCut === true || input.topCut === false
      ? input.topCut
      : (Number.isFinite(input.topCutSize) && Number.isFinite(input.placement)
        ? input.placement <= input.topCutSize
        : null),
    topCutSize: Number.isFinite(input.topCutSize) ? input.topCutSize : null,
    matchRecord: input.matchRecord
      ? freeze({
        wins: Number(input.matchRecord.wins) || 0,
        losses: Number(input.matchRecord.losses) || 0,
        draws: Number(input.matchRecord.draws) || 0,
        winsSwiss: Number.isFinite(input.matchRecord.winsSwiss) ? input.matchRecord.winsSwiss : null,
        lossesSwiss: Number.isFinite(input.matchRecord.lossesSwiss) ? input.matchRecord.lossesSwiss : null,
        winsBracket: Number.isFinite(input.matchRecord.winsBracket) ? input.matchRecord.winsBracket : null,
        lossesBracket: Number.isFinite(input.matchRecord.lossesBracket) ? input.matchRecord.lossesBracket : null,
      })
      : null,
    tournamentSource: input.tournamentSource || null,
    curatedStatus: input.curatedStatus || null, // e.g. competitive_main | database | historic
    deckImportSource: input.deckImportSource || null,
    selectionRole: input.selectionRole || null, // converter_or_top | lower_comparison
    performanceClass: PERFORMANCE_CLASSES.includes(input.performanceClass)
      ? input.performanceClass
      : null,
    independentConverterEvents: Number.isFinite(input.independentConverterEvents)
      ? input.independentConverterEvents
      : null,
    performance,
    performanceWeight,
    evidenceClaims: freeze({
      observedBroadly: evidenceTier === "broad_community" || evidenceTier === "public_user",
      observedAmongExperts: evidenceTier === "curated_expert" || evidenceTier === "tournament_performance",
      observedAmongTournamentPerformers: evidenceTier === "tournament_performance",
      associatedWithStrongerResults: Boolean(performance?.strongFinish),
    }),
    provenance: freeze({
      adapter: input.provenance?.adapter || "manual",
      note: input.provenance?.note || null,
      ingestedAt: input.provenance?.ingestedAt || new Date().toISOString().slice(0, 10),
      attribution: input.provenance?.attribution || null,
      tournamentId: input.provenance?.tournamentId || input.eventId || null,
      eventDate: input.provenance?.eventDate || input.observedAt || null,
      eventSize: Number.isFinite(input.provenance?.eventSize) ? input.provenance.eventSize : (Number.isFinite(input.eventSize) ? input.eventSize : null),
      placement: Number.isFinite(input.provenance?.placement) ? input.provenance.placement : (Number.isFinite(input.placement) ? input.placement : null),
      topCut: input.provenance?.topCut ?? input.topCut ?? null,
      matchRecord: input.provenance?.matchRecord || input.matchRecord || null,
      deckImportSource: input.provenance?.deckImportSource || input.deckImportSource || null,
      hasDeckObj: input.provenance?.hasDeckObj ?? null,
    }),
    evidenceQualityHints: freeze({ ...(input.evidenceQualityHints || {}) }),
  });
}

function inferEvidenceTier(input = {}) {
  if (input.curatedStatus) return "curated_expert";
  if (input.eventId || input.tournamentSource || input.sourceType?.includes("tournament")) {
    return "tournament_performance";
  }
  if (input.sourceType === "edhrec_aggregate") return "broad_community";
  if (input.sourceType === "alpha_player_deck") return "alpha_player";
  if (input.sourceType === "synthetic_competitive_fixture") return "synthetic_fixture";
  return "public_user";
}

function normalizePerformance(input = {}) {
  if (!input.performance && !Number.isFinite(input.placement) && !input.matchRecord) return null;
  const placement = Number.isFinite(input.placement) ? input.placement : input.performance?.placement ?? null;
  const eventSize = Number.isFinite(input.eventSize) ? input.eventSize : input.performance?.eventSize ?? null;
  const topCut = input.topCut === true || input.topCut === false
    ? input.topCut
    : input.performance?.topCut ?? null;
  const wins = input.matchRecord?.wins ?? input.performance?.wins ?? null;
  return freeze({
    placement,
    eventSize,
    topCut,
    wins,
    strongFinish: Boolean(
      topCut === true
      || (Number.isFinite(placement) && Number.isFinite(eventSize) && placement <= Math.max(1, Math.ceil(eventSize * 0.15)))
      || (Number.isFinite(placement) && placement <= 4),
    ),
    ...((input.performance && typeof input.performance === "object") ? input.performance : {}),
  });
}

function normalizeCommanders(value) {
  const list = Array.isArray(value) ? value : value ? [value] : [];
  return freeze(list.map((entry) => freeze({
    name: entry.name || String(entry),
    colors: freeze([...(entry.colors || [])]),
    oracleText: entry.oracleText || "",
    typeLine: entry.typeLine || "Legendary Creature",
    manaCost: entry.manaCost || "",
  })));
}

function normalizeRows(rows) {
  return freeze([...rows]
    .map((row) => freeze({
      quantity: Number(row.quantity) || 1,
      name: row.name,
      roles: freeze([...(row.roles || [])]),
      cmc: Number(row.cmc) || 0,
      typeLine: row.typeLine || "",
      oracleText: row.oracleText || "",
      manaCost: row.manaCost || "",
      colorIdentity: freeze([...(row.colorIdentity || [])]),
      mechanics: row.mechanics
        ? freeze({
          signals: freeze([...(row.mechanics.signals || [])]),
          produces: freeze([...(row.mechanics.produces || [])]),
          rewards: freeze([...(row.mechanics.rewards || [])]),
        })
        : freeze({ signals: freeze([]), produces: freeze([]), rewards: freeze([]) }),
      strategicSemantics: row.strategicSemantics instanceof Set
        ? freeze([...row.strategicSemantics].sort())
        : freeze([...(row.strategicSemantics || [])].sort()),
      commanderConnectionSignals: freeze([...(row.commanderConnectionSignals || [])]),
      sequenceStages: freeze([...(row.sequenceStages || [])]),
      score: Number(row.score) || 0,
    }))
    .sort((a, b) => a.name.localeCompare(b.name) || a.quantity - b.quantity));
}

function rowsToDeckText(rows) {
  return rows.map((row) => `${row.quantity} ${row.name}`).join("\n");
}

export function parseDeckTextToRows(deckText = "") {
  const rows = [];
  for (const rawLine of String(deckText).split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || /^\/\//.test(line) || /^~+/.test(line) || /^(deck|sideboard|commanders?|companion)\b/i.test(line)) {
      continue;
    }
    const match = line.match(/^(?:(\d+)\s*x?\s+)?(.+?)(?:\s+\([A-Z0-9]{2,6}\)\s+\d+\w*)?$/i);
    if (!match) continue;
    const name = match[2].trim();
    if (!name) continue;
    rows.push({ quantity: Number(match[1]) || 1, name });
  }
  return rows;
}

export function corpusDeckFingerprint(record) {
  const names = (record.rows || [])
    .map((row) => `${row.quantity}x${normalized(row.name)}`)
    .sort()
    .join("|");
  const commanders = (record.commanders || []).map((c) => normalized(c.name)).sort().join("+");
  return `${commanders}::${names}`;
}

export function holdoutBucket(record, modulus = 5) {
  const key = String(record?.id || corpusDeckFingerprint(record));
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = ((hash * 31) + key.charCodeAt(i)) >>> 0;
  }
  return hash % Math.max(1, modulus);
}

export function isHoldoutRecord(record, options = {}) {
  const modulus = options.modulus || 5;
  const holdoutBuckets = new Set(options.holdoutBuckets || [0]);
  return holdoutBuckets.has(holdoutBucket(record, modulus));
}

export function evidenceTierRank(tier) {
  const idx = EVIDENCE_TIERS.indexOf(tier);
  return idx >= 0 ? idx : EVIDENCE_TIERS.length;
}
