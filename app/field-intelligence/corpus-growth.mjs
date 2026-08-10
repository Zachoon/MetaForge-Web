// =============================================================================
// Field Intelligence v1.3 — Corpus growth / marginal evidence instrumentation
// =============================================================================

const freeze = (value) => Object.freeze(value);
const round = (value, digits = 3) => Number(Number(value).toFixed(digits));

/**
 * Compare current artifact coverage against a prior snapshot (if any).
 * Prefer Level-A / replicated hypothesis gains over raw deck count.
 */
export function measureCorpusGrowth({
  currentArtifact = null,
  priorSnapshot = null,
  liveSample = null,
} = {}) {
  const current = {
    events: currentArtifact?.corpus?.eventsRepresented || 0,
    decks: currentArtifact?.corpus?.decksAnalyzed || 0,
    commanders: currentArtifact?.corpus?.uniqueCommanders || 0,
    levelACohorts: currentArtifact?.levelAForensics?.usableCohorts
      || currentArtifact?.levelATopology?.usableCohorts
      || 0,
    levelATopologyCohorts: currentArtifact?.levelATopology?.usableCohorts || 0,
    replicatedHypotheses: currentArtifact?.performanceHypotheses?.byStatus?.replicated || 0,
    discoveryCandidates: currentArtifact?.topologyDiscovery?.candidates?.length || 0,
    principles: currentArtifact?.strategicPrincipleRegistry?.principleCount || 0,
    promotablePrinciples: currentArtifact?.strategicPrincipleRegistry?.promotable?.length || 0,
  };

  const prior = priorSnapshot || {
    events: 0,
    decks: 0,
    commanders: 0,
    levelACohorts: 0,
    levelATopologyCohorts: 0,
    replicatedHypotheses: 0,
    discoveryCandidates: 0,
    principles: 0,
    promotablePrinciples: 0,
  };

  const deltaEvents = Math.max(0, current.events - (prior.events || 0));
  const deltaLevelA = current.levelACohorts - (prior.levelACohorts || 0);
  const deltaTopo = current.levelATopologyCohorts - (prior.levelATopologyCohorts || 0);
  const deltaReplicated = current.replicatedHypotheses - (prior.replicatedHypotheses || 0);
  const deltaDiscovery = current.discoveryCandidates - (prior.discoveryCandidates || 0);
  const deltaPrinciples = current.principles - (prior.principles || 0);

  const marginalPerEvent = deltaEvents > 0
    ? freeze({
      levelACohorts: round(deltaLevelA / deltaEvents),
      levelATopologyCohorts: round(deltaTopo / deltaEvents),
      replicatedHypotheses: round(deltaReplicated / deltaEvents),
      discoveryCandidates: round(deltaDiscovery / deltaEvents),
      principles: round(deltaPrinciples / deltaEvents),
      decks: round((current.decks - (prior.decks || 0)) / deltaEvents),
    })
    : freeze({
      levelACohorts: 0,
      levelATopologyCohorts: 0,
      replicatedHypotheses: 0,
      discoveryCandidates: 0,
      principles: 0,
      decks: 0,
      note: "No new events vs prior snapshot — marginal gains undefined.",
    });

  return freeze({
    version: "corpus-growth-v1",
    liveSample: liveSample || null,
    current: freeze(current),
    prior: freeze(prior),
    deltas: freeze({
      events: deltaEvents,
      decks: current.decks - (prior.decks || 0),
      commanders: current.commanders - (prior.commanders || 0),
      levelACohorts: deltaLevelA,
      levelATopologyCohorts: deltaTopo,
      replicatedHypotheses: deltaReplicated,
      discoveryCandidates: deltaDiscovery,
      principles: deltaPrinciples,
      promotablePrinciples: current.promotablePrinciples - (prior.promotablePrinciples || 0),
    }),
    marginalEvidencePerNewEvent: marginalPerEvent,
    preferControlledComparisonsOverVolume: true,
  });
}
