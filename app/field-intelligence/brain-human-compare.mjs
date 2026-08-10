// =============================================================================
// Field Intelligence — Human pattern vs MetaForge theory
// =============================================================================

const freeze = (value) => Object.freeze(value);
const round = (value, digits = 3) => Number(Number(value).toFixed(digits));

/**
 * Compare corpus structural evidence to Brain v1 package theory targets.
 */
export function compareCorpusEvidenceToBrainTheory(structuralEvidence = {}, analyses = []) {
  const agreements = [];
  const humanBlindSpots = [];
  const metaforgeDisagreements = [];
  const humanNoise = [];

  for (const [packageId, stats] of Object.entries(structuralEvidence.packageCoreRanges || {})) {
    const theoryAnalyses = analyses.filter((a) => (a.packages || []).some((p) => p.id === packageId));
    const theoryTargets = theoryAnalyses
      .map((a) => (a.packages || []).find((p) => p.id === packageId)?.coreMin)
      .filter((n) => Number.isFinite(n));
    if (!theoryTargets.length || stats.n < 3) continue;
    const theoryMean = theoryTargets.reduce((s, n) => s + n, 0) / theoryTargets.length;
    const humanMean = stats.weightedMean ?? stats.mean;
    const delta = humanMean - theoryMean;
    const healthyShare = theoryAnalyses.filter((a) => {
      const pkg = (a.packages || []).find((p) => p.id === packageId);
      return pkg?.status === "healthy";
    }).length / Math.max(1, theoryAnalyses.length);

    if (Math.abs(delta) <= Math.max(2, theoryMean * 0.2)) {
      agreements.push(freeze({
        kind: "package_core_density",
        packageId,
        brainTheory: round(theoryMean),
        corpusWeightedMean: round(humanMean),
        corpusP25: stats.p25,
        corpusP75: stats.p75,
        n: stats.n,
        note: "human_and_brain_converge",
      }));
    } else if (delta > 0 && healthyShare >= 0.5) {
      humanBlindSpots.push(freeze({
        kind: "package_core_density",
        packageId,
        brainTheory: round(theoryMean),
        corpusWeightedMean: round(humanMean),
        n: stats.n,
        note: "humans_maintain_higher_density_in_cohesive_decks",
        candidateFor: "brain_sprint_2_review",
      }));
    } else if (delta < 0) {
      metaforgeDisagreements.push(freeze({
        kind: "package_core_density",
        packageId,
        brainTheory: round(theoryMean),
        corpusWeightedMean: round(humanMean),
        n: stats.n,
        note: "brain_expects_more_than_corpus_median_investigate",
      }));
    }
  }

  for (const [legKey, stats] of Object.entries(structuralEvidence.packageLegRanges || {})) {
    if (stats.n < 4) continue;
    const [packageId, leg] = legKey.split("::");
    const related = analyses.filter((a) => (a.packages || []).some((p) => p.id === packageId));
    const weakHeavy = related.filter((a) => (a.justification?.weaklyJustifiedCount || 0) > 8).length;
    if (stats.mean >= 3 && weakHeavy / Math.max(1, related.length) >= 0.6) {
      humanNoise.push(freeze({
        kind: "leg_frequency_with_weak_cohesion",
        packageId,
        leg,
        corpusMean: stats.mean,
        note: "popular_or_frequent_but_correlates_with_weak_structure",
        autoTeach: false,
      }));
    }
  }

  // Interaction coverage blind spots: healthy decks with sparse interaction graphs.
  for (const analysis of analyses) {
    if (!analysis.cohesion?.passed) continue;
    if ((analysis.interactionGraph?.edgeCount || 0) <= 2 && (analysis.packages || []).some((p) => p.status === "healthy")) {
      humanBlindSpots.push(freeze({
        kind: "interaction_graph_coverage",
        deckId: analysis.deckId,
        commanders: analysis.commanders,
        packages: (analysis.packages || []).map((p) => p.id),
        edgeCount: analysis.interactionGraph?.edgeCount || 0,
        note: "cohesive_human_deck_underconnected_in_brain_interaction_graph",
        candidateFor: "semantic_blind_spot_review",
      }));
    }
  }

  return freeze({
    version: "brain-human-compare-v1",
    agreements: freeze(agreements.slice(0, 40)),
    humanSupportedBlindSpots: freeze(uniqueBy(humanBlindSpots, (row) => `${row.kind}:${row.packageId || row.deckId}`).slice(0, 40)),
    metaforgeDisagreements: freeze(metaforgeDisagreements.slice(0, 40)),
    humanNoise: freeze(humanNoise.slice(0, 40)),
  });
}

function uniqueBy(rows, keyFn) {
  const seen = new Set();
  const out = [];
  for (const row of rows) {
    const key = keyFn(row);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}
