// =============================================================================
// Field Intelligence — Package & semantic discovery candidates
// =============================================================================
// Evidence first. Never auto-create Brain packages or mutate semantics.
// =============================================================================

const freeze = (value) => Object.freeze(value);
const round = (value, digits = 3) => Number(Number(value).toFixed(digits));
const normalized = (value = "") => String(value).normalize("NFKC").trim().toLocaleLowerCase("en");

/**
 * Find repeated structural clusters that do not map cleanly to known packages.
 */
export function discoverPackageCandidates(analyses = [], records = [], options = {}) {
  const knownPackages = new Set(analyses.flatMap((a) => (a.inferredIntent?.packageIds || [])));
  const clusters = new Map();

  for (const analysis of analyses) {
    const record = records.find((r) => r.id === analysis.deckId);
    const weight = analysis.evidenceQuality?.weight ?? 0.4;
    if (weight < (options.minWeight || 0.35)) continue;

    // Role triad signature as a crude unknown-package probe.
    const roles = Object.entries(analysis.roleDistribution || {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([role]) => role);
    const mechanics = [
      ...Object.keys(analysis.signals?.produces || {}),
      ...Object.keys(analysis.signals?.rewards || {}),
    ].sort().slice(0, 4);
    if (roles.length < 2) continue;

    const signature = `${roles.join("+")}::${mechanics.join("+")}`;
    const mapped = (analysis.packages || []).some((pkg) => pkg.status === "healthy" || pkg.status === "strained");
    const entry = clusters.get(signature) || {
      signature,
      roles,
      mechanics,
      decks: new Set(),
      commanders: new Set(),
      weighted: 0,
      mappedToKnownPackage: mapped,
      interactionDensity: [],
    };
    entry.decks.add(analysis.deckId);
    for (const commander of analysis.commanders || []) entry.commanders.add(commander);
    entry.weighted += weight;
    entry.interactionDensity.push(analysis.interactionGraph?.edgeCount || 0);
    entry.mappedToKnownPackage = entry.mappedToKnownPackage || mapped;
    clusters.set(signature, entry);
  }

  const candidates = [...clusters.values()]
    .filter((entry) => entry.decks.size >= (options.minDecks || 5))
    .filter((entry) => entry.commanders.size >= (options.minCommanders || 2))
    .filter((entry) => !entry.mappedToKnownPackage || options.includeMapped)
    .map((entry, index) => freeze({
      id: `unknown_cluster_${index + 1}`,
      signature: entry.signature,
      roles: freeze(entry.roles),
      mechanics: freeze(entry.mechanics),
      decks: entry.decks.size,
      commanders: entry.commanders.size,
      weightedEvidence: round(entry.weighted),
      meanInteractionEdges: round(
        entry.interactionDensity.reduce((a, b) => a + b, 0) / Math.max(1, entry.interactionDensity.length),
      ),
      knownPackageOverlap: entry.mappedToKnownPackage,
      autoCreateBrainPackage: false,
      reviewStatus: "needs_human_engineering_review",
      knownPackagesObserved: freeze([...knownPackages].sort()),
    }))
    .sort((a, b) => b.weightedEvidence - a.weightedEvidence || b.decks - a.decks);

  return freeze({
    version: "package-discovery-v1",
    candidates: freeze(candidates.slice(0, 30)),
  });
}

/**
 * Flag semantic blind spots: repeated human pairings Brain does not connect.
 */
export function discoverSemanticBlindSpots(analyses = [], contrasts = [], options = {}) {
  const candidates = [];

  for (const analysis of analyses) {
    if (!analysis.cohesion?.passed) continue;
    const edgeCount = analysis.interactionGraph?.edgeCount || 0;
    const produces = analysis.signals?.produces || {};
    const rewards = analysis.signals?.rewards || {};
    for (const signal of Object.keys(rewards)) {
      const produceCount = produces[signal] || 0;
      if (produceCount >= 3 && (rewards[signal] || 0) >= 3 && edgeCount <= 2) {
        candidates.push(freeze({
          id: `semantic_blind_spot_${normalized(signal)}`,
          kind: "semantic_blind_spot_candidate",
          affectedMechanics: freeze([signal]),
          affectedCards: freeze([]),
          corpusSupport: freeze({
            deckId: analysis.deckId,
            commanders: analysis.commanders,
            produceCount,
            rewardCount: rewards[signal],
            cohesionPassed: true,
          }),
          existingBrainInterpretation: "signals_present_but_interaction_graph_sparse",
          likelyMissingRelationship: `${signal}_producer_payoff_wiring`,
          confidence: round(Math.min(0.85, 0.35 + (produceCount + rewards[signal]) / 40)),
          autoMutateBrain: false,
        }));
      }
    }
  }

  for (const contrast of contrasts) {
    for (const delta of (contrast.structuralDeltas || []).slice(0, 5)) {
      if (Math.abs(delta.delta) < 2) continue;
      if (!String(delta.feature).includes("::")) continue;
      candidates.push(freeze({
        id: `semantic_blind_spot_contrast_${normalized(delta.feature)}`,
        kind: "semantic_blind_spot_candidate",
        affectedMechanics: freeze([delta.feature]),
        affectedCards: freeze([]),
        corpusSupport: freeze({
          eventId: contrast.eventId,
          commanderFamily: contrast.commanderFamily,
          highMean: delta.highMean,
          lowMean: delta.lowMean,
          delta: delta.delta,
        }),
        existingBrainInterpretation: "performance_contrast_feature",
        likelyMissingRelationship: "performance_associated_structure_not_modeled",
        confidence: round(Math.min(0.8, Math.abs(delta.delta) / 10)),
        autoMutateBrain: false,
      }));
    }
  }

  // Dedupe by id, keep highest confidence.
  const byId = new Map();
  for (const row of candidates) {
    const prev = byId.get(row.id);
    if (!prev || row.confidence > prev.confidence) byId.set(row.id, row);
  }

  return freeze({
    version: "semantic-blind-spot-v1",
    candidates: freeze([...byId.values()]
      .filter((row) => row.confidence >= (options.minConfidence || 0.4))
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 40)),
  });
}
