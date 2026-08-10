// =============================================================================
// Field Intelligence — cEDH Decklist Database adapter (Tier 2 curated expert)
// =============================================================================
// Provenance: curated_expert — NOT tournament_proven.
// Prefer explicit curated snapshots / metadata files over scraping Moxfield.
// =============================================================================

import { createCorpusDeckRecord } from "../corpus-schema.mjs";
import { calculateCompetitiveEvidenceWeight } from "../evidence-quality.mjs";
import { parseTournamentDeckText } from "../decklist-parse.mjs";

const freeze = (value) => Object.freeze(value);

export const CEDH_DDB_ATTRIBUTION = Object.freeze({
  name: "cEDH Decklist Database",
  url: "https://cedh-decklist-database.com/",
  required: true,
});

/**
 * Normalize curated DDB entries.
 * Expected entry shape (flexible):
 * {
 *   id, name, commanders: [{name, colors?}], archetype, section,
 *   deckText? | rows?, sourceUri?, updatedAt?
 * }
 */
export function normalizeCedhDdbEntries(entries = [], options = {}) {
  const records = [];
  for (const entry of entries) {
    const commanders = Array.isArray(entry.commanders)
      ? entry.commanders
      : entry.commander
        ? [entry.commander]
        : [];
    let rows = entry.rows || [];
    let deckText = entry.deckText || "";
    if (!rows.length && deckText) {
      const parsed = parseTournamentDeckText(deckText);
      rows = parsed.rows;
      if (!commanders.length) commanders.push(...parsed.commanders);
      deckText = parsed.deckText;
    }
    if (!rows.length && !options.allowEmptyDecklists) continue;

    const curatedStatus = entry.section === "Competitive" || entry.curatedStatus === "competitive_main"
      ? "competitive_main"
      : entry.section === "Historic" || entry.curatedStatus === "historic"
        ? "historic"
        : entry.curatedStatus || "database";

    const draft = {
      id: `cedh-ddb:${entry.id || entry.name || commanders[0]?.name}`,
      commanders,
      rows,
      deckText,
      format: "Commander",
      sourceType: "cedh_decklist_database",
      sourceKey: String(entry.id || entry.name || ""),
      sourceUri: entry.sourceUri || entry.url || null,
      observedAt: entry.updatedAt || entry.observedAt || null,
      statedArchetype: entry.archetype || entry.name || null,
      archetypeTags: freeze([
        ...(entry.tags || []),
        entry.archetype,
        "cedh",
        curatedStatus,
      ].filter(Boolean)),
      evidenceTier: "curated_expert",
      curatedStatus,
      tournamentSource: null,
      provenance: {
        adapter: "cedh-decklist-database",
        attribution: CEDH_DDB_ATTRIBUTION,
        note: "curated_expert_not_tournament_proven",
      },
    };
    const weight = calculateCompetitiveEvidenceWeight(draft, {
      independentEventCount: options.independentEventCount || 1,
    });
    records.push(createCorpusDeckRecord({ ...draft, performanceWeight: weight.weight }));
  }
  return freeze({
    source: "cedh_decklist_database",
    records: freeze(records),
    attribution: CEDH_DDB_ATTRIBUTION,
  });
}
