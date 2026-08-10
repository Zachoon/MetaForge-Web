// =============================================================================
// Field Intelligence — EDHREC aggregate adapter (Tier 3 secondary)
// =============================================================================
// Broad structural norms only. high inclusion ≠ high quality.
// Never overrides tournament/expert evidence.
// =============================================================================

import { createCorpusDeckRecord } from "../corpus-schema.mjs";

const freeze = (value) => Object.freeze(value);

export const EDHREC_ATTRIBUTION = Object.freeze({
  name: "EDHREC",
  url: "https://edhrec.com",
  required: true,
});

/**
 * Normalize EDHREC-style aggregate payloads into secondary evidence records.
 * We store relationship summaries, not "play this 99".
 *
 * Expected input (flexible):
 * {
 *   commander: "Name",
 *   synergies: [{ name, synery, num_decks, potential? }],
 *   highSynergy: [...],
 *   cardviews / themes optional
 * }
 */
export function normalizeEdhrecAggregate(payload = {}, options = {}) {
  const commanderName = payload.commander || payload.container?.json_dict?.card?.name;
  const synergies = payload.synergies
    || payload.high_synergy
    || payload.cardviews
    || payload.container?.json_dict?.cardlists?.flatMap((list) => list.cardviews || [])
    || [];

  const relationships = freeze((synergies || []).slice(0, options.limit || 80).map((entry) => freeze({
    card: entry.name || entry.card?.name,
    synergy: Number(entry.synergy ?? entry.synery ?? entry.potential) || 0,
    inclusionDecks: Number(entry.num_decks ?? entry.numDecks ?? entry.decks) || 0,
    inclusionPct: Number(entry.inclusion ?? entry.percent) || null,
    claim: "observed_broadly",
    eliteValidation: false,
  })).filter((row) => row.card));

  // Aggregate "deck" record is a structural summary vessel, not a playable 99.
  const record = createCorpusDeckRecord({
    id: `edhrec-agg:${commanderName || "unknown"}`,
    commanders: commanderName ? [{ name: commanderName }] : [],
    rows: relationships.slice(0, 40).map((rel) => ({
      quantity: 1,
      name: rel.card,
    })),
    format: "Commander",
    sourceType: "edhrec_aggregate",
    sourceKey: commanderName || "unknown",
    sourceUri: commanderName
      ? `https://edhrec.com/commanders/${encodeURIComponent(String(commanderName).toLowerCase().replace(/[^a-z0-9]+/g, "-"))}`
      : "https://edhrec.com",
    evidenceTier: "broad_community",
    popularity: {
      share: relationships[0]?.inclusionPct ? relationships[0].inclusionPct / 100 : 0.2,
      note: "aggregate_inclusion_not_elite_validation",
    },
    provenance: {
      adapter: "edhrec-aggregate",
      attribution: EDHREC_ATTRIBUTION,
      note: "secondary_structural_context_only",
    },
  });

  return freeze({
    source: "edhrec",
    records: freeze([record]),
    relationships,
    attribution: EDHREC_ATTRIBUTION,
    caution: "high_inclusion_is_not_high_quality",
  });
}

/**
 * Optional live fetch of EDHREC commander JSON (public pages / CDN style).
 * Failures are soft — EDHREC is secondary.
 */
export async function fetchEdhrecCommanderAggregate(commanderName, options = {}) {
  const fetchImpl = options.fetchImpl || fetch;
  const slug = String(commanderName || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
  if (!slug) {
    return freeze({ ok: false, reason: "missing_commander", payload: null });
  }
  const url = options.url || `https://json.edhrec.com/pages/commanders/${slug}.json`;
  try {
    const response = await fetchImpl(url, { headers: { Accept: "application/json" } });
    if (!response.ok) {
      return freeze({ ok: false, reason: `http_${response.status}`, payload: null, url });
    }
    const payload = await response.json();
    return freeze({ ok: true, payload, url, attribution: EDHREC_ATTRIBUTION });
  } catch (error) {
    return freeze({ ok: false, reason: error.message || "fetch_failed", payload: null, url });
  }
}
