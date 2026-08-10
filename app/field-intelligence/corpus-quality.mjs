// =============================================================================
// Field Intelligence v1.1 — Corpus quality / interpretability metrics
// =============================================================================

const freeze = (value) => Object.freeze(value);
const round = (value, digits = 3) => Number(Number(value).toFixed(digits));

/**
 * Measure how much of the live corpus Brain v1 can structurally interpret.
 */
export function buildCorpusQualityReport({
  records = [],
  analyses = [],
  enrichmentStats = null,
  familyResolution = null,
  exclusions = [],
} = {}) {
  const total = Math.max(1, records.length);
  const withPackages = analyses.filter((a) => (a.packages || []).length > 0).length;
  const withInteraction = analyses.filter((a) => (a.interactionGraph?.edgeCount || 0) > 0).length;
  const withRoles = analyses.filter((a) => Object.keys(a.roleDistribution || {}).length > 0).length;
  const withCommanderConnection = analyses.filter((a) => (a.commanderConnection?.connectedCount || 0) > 0).length;

  const discounts = records.map((r) => Number(r.evidenceQualityHints?.confidenceDiscount) || 1);
  const meanDiscount = discounts.length ? discounts.reduce((a, b) => a + b, 0) / discounts.length : 1;

  let semanticCoverageRate = enrichmentStats?.semanticCoverageRate;
  if (!Number.isFinite(semanticCoverageRate)) {
    const hinted = records
      .map((r) => Number(r.evidenceQualityHints?.semanticCoverageRate))
      .filter((n) => Number.isFinite(n));
    if (hinted.length) {
      semanticCoverageRate = round(hinted.reduce((a, b) => a + b, 0) / hinted.length);
    } else {
      // Pre-annotated / fixture decks: infer coverage from row richness.
      let rich = 0;
      let cards = 0;
      for (const record of records) {
        for (const row of record.rows || []) {
          cards += 1;
          if (row.oracleText || row.typeLine || (row.roles?.length && row.mechanics)) rich += 1;
        }
      }
      semanticCoverageRate = cards ? round(rich / cards) : 0;
    }
  }

  return freeze({
    version: "corpus-quality-v1",
    decks: records.length,
    semanticCoverageRate,
    commanderResolutionRate: familyResolution?.commanderResolutionRate
      ?? enrichmentStats?.commanderResolutionRate
      ?? null,
    familyResolutionRate: familyResolution?.familyResolutionRate ?? null,
    packageDetectionRate: round(withPackages / total),
    interactionCoverageRate: round(withInteraction / total),
    roleCoverageRate: round(withRoles / total),
    commanderAlignmentRate: round(withCommanderConnection / total),
    meanConfidenceDiscount: round(meanDiscount),
    decksDiscounted: discounts.filter((d) => d < 1).length,
    excludedDecks: exclusions.length,
    exclusionReasons: freeze(Object.fromEntries(
      Object.entries(exclusions.reduce((acc, row) => {
        const key = row.reason || "unknown";
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {})).sort((a, b) => b[1] - a[1]),
    )),
    enrichment: enrichmentStats,
    family: familyResolution && freeze({
      structurallyTyped: familyResolution.structurallyTyped,
      unresolved: familyResolution.unresolved,
      unresolvedDetails: familyResolution.unresolvedDetails,
      familyDistributionTop: freeze(Object.entries(familyResolution.familyDistribution || {})
        .slice(0, 20)
        .map(([key, count]) => freeze({ key, count }))),
    }),
    interpretabilityNote: freeze([
      withPackages === 0
        ? "package_detection_zero_usually_means_missing_commander_oracle_or_catalog_miss"
        : "packages_detected",
      semanticCoverageRate < 0.75
        ? "semantic_enrichment_incomplete"
        : "semantic_enrichment_ok",
    ]),
  });
}
