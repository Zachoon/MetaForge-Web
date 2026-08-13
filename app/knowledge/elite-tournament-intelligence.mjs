// =============================================================================
// Knowledge — Elite Tournament Intelligence (Epic 2)
// =============================================================================
// Transform tournament decks into strategic observations:
// fingerprints · commander/archetype profiles · Level-A structural contrasts.
// Observation only. Does not netdeck. writesToBrain: false
// =============================================================================

import { analyzeCorpus } from "../field-intelligence/corpus-analyze.mjs";
import { buildStructuralEvidence } from "../field-intelligence/structural-evidence.mjs";
import { buildAllLevelAForensics } from "../field-intelligence/level-a-forensics.mjs";
import { buildComparableCohorts } from "../field-intelligence/comparable-cohorts.mjs";
import { resolveCorpusFamilies } from "../field-intelligence/commander-family.mjs";
import { normalizeCommanderIdentity } from "../field-intelligence/level-a-forensics.mjs";
import { materializeCompetitiveFixtureCorpus } from "../field-intelligence/fixtures/competitive-corpus.mjs";

const freeze = (value) => Object.freeze(value);
const round = (value, digits = 3) => Number(Number(value).toFixed(digits));
const mean = (values) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0);
const percentile = (values, p) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * p)));
  return round(sorted[idx]);
};

function rangeOf(values = []) {
  const clean = values.filter((value) => Number.isFinite(value));
  if (!clean.length) return null;
  return freeze({
    n: clean.length,
    mean: round(mean(clean)),
    p25: percentile(clean, 0.25),
    p50: percentile(clean, 0.5),
    p75: percentile(clean, 0.75),
    min: round(Math.min(...clean)),
    max: round(Math.max(...clean)),
  });
}

function primaryPlanFromAnalysis(analysis = {}) {
  const packages = [...(analysis.packages || [])]
    .filter((pkg) => pkg.status === "healthy" || Number(pkg.healthScore) >= 55)
    .sort((a, b) => (b.healthScore || 0) - (a.healthScore || 0));
  if (packages[0]) {
    return freeze({
      id: packages[0].id,
      label: packages[0].label || packages[0].id,
      healthScore: packages[0].healthScore ?? null,
      densityCore: packages[0].density?.core ?? null,
    });
  }
  const roles = analysis.roleDistribution || {};
  const topRole = Object.entries(roles).sort((a, b) => b[1] - a[1])[0];
  return freeze({
    id: topRole ? `role:${topRole[0]}` : "unknown",
    label: topRole ? `${topRole[0]}-forward` : "Unknown plan",
    healthScore: null,
    densityCore: topRole ? topRole[1] : null,
  });
}

/**
 * Normalized strategic fingerprint for one tournament deck analysis.
 * Not a 99-card recipe — structural choices only.
 */
export function buildStrategicFingerprint({
  record = null,
  analysis = null,
} = {}) {
  if (!record || !analysis) return null;
  const primary = primaryPlanFromAnalysis(analysis);
  const supporting = (analysis.packages || [])
    .filter((pkg) => pkg.id !== primary.id)
    .slice(0, 4)
    .map((pkg) => freeze({
      id: pkg.id,
      label: pkg.label || pkg.id,
      healthScore: pkg.healthScore ?? null,
      densityCore: pkg.density?.core ?? null,
    }));

  const roles = analysis.roleDistribution || {};
  const interactionCount = Number(roles.interaction || 0) + Number(roles.protection || 0);
  const threatCount = Number(roles.threat || 0) + Number(roles.combat || 0);
  const rampCount = Number(roles.ramp || 0);
  const nonlands = Number(analysis.commanderConnection?.totalNonlands || 0) || 99;

  return freeze({
    writesToBrain: false,
    version: "strategic-fingerprint-v1",
    deckId: record.id,
    commanderIdentity: normalizeCommanderIdentity(record.commanders),
    commanders: freeze((record.commanders || []).map((c) => c.name || c)),
    commanderFamily: analysis.commanderFamily?.familyId || null,
    primaryPlan: primary,
    supportingPlans: freeze(supporting),
    roleDistribution: freeze({ ...roles }),
    curveProfile: freeze({ ...(analysis.curve || {}) }),
    manaProfile: freeze({
      rampSlots: rampCount,
      rampDensity: round(rampCount / nonlands),
    }),
    interactionComposition: freeze({
      interactionSlots: Number(roles.interaction || 0),
      protectionSlots: Number(roles.protection || 0),
      interactionDensity: round(interactionCount / nonlands),
    }),
    threatDensity: freeze({
      threatSlots: threatCount,
      density: round(threatCount / nonlands),
    }),
    packageLegs: freeze(
      Object.fromEntries(
        (analysis.packages || []).flatMap((pkg) =>
          Object.entries(pkg.legs || {}).map(([leg, state]) => [
            `${pkg.id}::${leg}`,
            state.current ?? 0,
          ]),
        ),
      ),
    ),
    commanderDependence: freeze({
      connectedRatio: analysis.commanderConnection?.ratio ?? null,
      connectedCount: analysis.commanderConnection?.connectedCount ?? null,
    }),
    structuralRelationships: freeze({
      edgeCount: analysis.interactionGraph?.edgeCount ?? null,
      coverage: analysis.interactionGraph?.coverage ?? null,
      enginePairCount: (analysis.interactionGraph?.enginePairs || []).length,
      isolatedCount: (analysis.interactionGraph?.isolated || []).length,
    }),
    multifunctionHint: freeze({
      weaklyJustifiedCount: analysis.justification?.weaklyJustifiedCount ?? null,
      strongRatio: analysis.justification?.strongRatio ?? null,
    }),
    performanceProvenance: freeze({
      evidenceTier: record.evidenceTier || null,
      performanceClass: record.performanceClass || null,
      eventId: record.eventId || null,
      eventName: record.eventName || null,
      eventSize: record.eventSize ?? null,
      placement: record.placement ?? null,
      topCut: record.topCut ?? null,
      matchRecord: record.matchRecord || record.performance?.matchRecord || null,
      observedAt: record.observedAt || null,
      authorKey: record.authorKey || null,
      sourceType: record.sourceType || null,
    }),
    antiNetdeck: freeze({
      frequencyIsNotQuality: true,
      note: "Fingerprint stores structure + provenance, never popularity rank as truth.",
    }),
  });
}

function confidenceForProfile({ sampleSize = 0, independentEvents = 0, converters = 0 } = {}) {
  if (sampleSize < 3 || independentEvents < 1) {
    return freeze({ level: "insufficient_sample", score: 0.15 });
  }
  if (independentEvents >= 3 && converters >= 2 && sampleSize >= 8) {
    return freeze({ level: "high", score: 0.85 });
  }
  if (independentEvents >= 2 && sampleSize >= 5) {
    return freeze({ level: "moderate", score: 0.6 });
  }
  return freeze({ level: "limited", score: 0.35 });
}

/**
 * Aggregate fingerprints into evidence-backed commander profiles.
 * These are observed structural ranges — not deck templates.
 */
export function buildCommanderProfiles(fingerprints = []) {
  const byCommander = new Map();
  for (const fp of fingerprints) {
    if (!fp?.commanderIdentity) continue;
    const bucket = byCommander.get(fp.commanderIdentity) || [];
    bucket.push(fp);
    byCommander.set(fp.commanderIdentity, bucket);
  }

  const profiles = [];
  for (const [commanderIdentity, rows] of byCommander) {
    const events = new Set(rows.map((row) => row.performanceProvenance.eventId).filter(Boolean));
    const authors = new Set(rows.map((row) => row.performanceProvenance.authorKey).filter(Boolean));
    const converters = rows.filter((row) =>
      row.performanceProvenance.topCut === true
      || row.performanceProvenance.placement === 1
      || /converter/i.test(row.performanceProvenance.performanceClass || ""),
    );
    const planCounts = {};
    for (const row of rows) {
      const key = row.primaryPlan?.id || "unknown";
      planCounts[key] = (planCounts[key] || 0) + 1;
    }
    const replicatedPlans = Object.entries(planCounts)
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .map(([id, count]) => freeze({ id, count, share: round(count / rows.length) }));

    const mixedPlans = Object.entries(planCounts)
      .filter(([, count]) => count === 1)
      .map(([id, count]) => freeze({ id, count }));

    const confidence = confidenceForProfile({
      sampleSize: rows.length,
      independentEvents: events.size,
      converters: converters.length,
    });

    profiles.push(
      freeze({
        writesToBrain: false,
        version: "commander-profile-v1",
        commanderIdentity,
        sampleSize: rows.length,
        independentEvents: events.size,
        independentAuthors: authors.size,
        converters: converters.length,
        confidence,
        observedSuccessfulStructures: freeze({
          primaryPlans: freeze(replicatedPlans),
          interactionDensity: rangeOf(rows.map((row) => row.interactionComposition.interactionDensity)),
          threatDensity: rangeOf(rows.map((row) => row.threatDensity.density)),
          rampDensity: rangeOf(rows.map((row) => row.manaProfile.rampDensity)),
          commanderDependence: rangeOf(rows.map((row) => row.commanderDependence.connectedRatio)),
          graphCoverage: rangeOf(rows.map((row) => row.structuralRelationships.coverage)),
        }),
        stronglyReplicated: freeze(replicatedPlans.filter((plan) => plan.count >= Math.max(2, Math.ceil(rows.length * 0.4)))),
        mixed: freeze(mixedPlans.slice(0, 8)),
        unknown: confidence.level === "insufficient_sample"
          ? freeze(["insufficient_sample — do not treat ranges as strategy truth"])
          : freeze([]),
        contradictions: freeze(
          replicatedPlans.length >= 2
            && replicatedPlans[0].share < 0.7
            && replicatedPlans[1].share >= 0.25
            ? [`Competing primary plans observed: ${replicatedPlans.slice(0, 2).map((p) => p.id).join(" vs ")}`]
            : [],
        ),
      }),
    );
  }

  return freeze(
    profiles.sort((a, b) =>
      b.sampleSize - a.sampleSize
      || b.independentEvents - a.independentEvents
      || a.commanderIdentity.localeCompare(b.commanderIdentity),
    ),
  );
}

/**
 * Summarize Level-A forensics into structural comparison observations.
 */
export function summarizeLevelAStructuralComparisons(levelAForensics = null) {
  const cohorts = levelAForensics?.cohorts || levelAForensics?.forensics || [];
  const observations = [];
  for (const cohort of cohorts) {
    if (!cohort?.ok) continue;
    const notable = [];
    for (const delta of (cohort.deltas || []).slice(0, 8)) {
      if (!delta?.feature) continue;
      const direction = Number(delta.delta) > 0 ? "higher in converters" : "lower in converters";
      notable.push(
        `${delta.feature}: converters ${round(delta.highMean)} vs field ${round(delta.lowMean)} (${direction}, conf ${round(delta.confidence)})`,
      );
    }
    observations.push(
      freeze({
        eventId: cohort.eventId,
        eventName: cohort.eventName || null,
        commanderIdentity: cohort.commanderIdentity,
        cohortSize: cohort.cohortSize,
        highCount: cohort.highCount,
        lowCount: cohort.lowCount,
        confidence: "level_a_same_commander_same_event",
        structuralDifferences: freeze(notable),
        caveat: "Associative evidence only — not Brain rules.",
      }),
    );
  }
  return freeze({
    writesToBrain: false,
    usableCohorts: levelAForensics?.usableCohorts ?? observations.length,
    observations,
  });
}

/**
 * Full Epic 2 intelligence artifact from corpus records.
 */
export function buildEliteTournamentIntelligence({
  records = [],
  label = "elite-tournament-intelligence",
} = {}) {
  const analyses = analyzeCorpus(records, { includeHoldout: false });
  const familyResolution = resolveCorpusFamilies(records, analyses);
  const fingerprints = analyses
    .map((analysis) => {
      const record = records.find((entry) => entry.id === analysis.deckId);
      return buildStrategicFingerprint({ record, analysis });
    })
    .filter(Boolean);

  const commanderProfiles = buildCommanderProfiles(fingerprints);
  const structuralEvidence = buildStructuralEvidence(analyses, records);
  const levelAForensics = buildAllLevelAForensics(records, analyses);
  const levelASummary = summarizeLevelAStructuralComparisons(levelAForensics);
  const cohorts = buildComparableCohorts(records, analyses, familyResolution);

  const events = new Set(records.map((record) => record.eventId).filter(Boolean));
  const commanders = new Set(
    records.flatMap((record) => (record.commanders || []).map((c) => c.name || c)).filter(Boolean),
  );

  return freeze({
    writesToBrain: false,
    version: "elite-tournament-intelligence-v1",
    label,
    brainChanges: 0,
    antiNetdeck: freeze({
      policy: "popular card ≠ correct card",
      frequencyIsNotQuality: true,
    }),
    corpus: freeze({
      decks: records.length,
      analyses: analyses.length,
      events: events.size,
      uniqueCommanders: commanders.size,
      fingerprints: fingerprints.length,
    }),
    fingerprints: freeze(fingerprints),
    commanderProfiles,
    archetypeProfiles: freeze(
      Object.values(
        fingerprints.reduce((acc, fp) => {
          const key = fp.primaryPlan?.id || "unknown";
          acc[key] = acc[key] || {
            archetypeId: key,
            label: fp.primaryPlan?.label || key,
            decks: 0,
            commanders: new Set(),
          };
          acc[key].decks += 1;
          acc[key].commanders.add(fp.commanderIdentity);
          return acc;
        }, {}),
      ).map((entry) => freeze({
        archetypeId: entry.archetypeId,
        label: entry.label,
        decks: entry.decks,
        uniqueCommanders: entry.commanders.size,
        confidence: entry.decks >= 5 ? "moderate" : entry.decks >= 2 ? "limited" : "insufficient_sample",
      })),
    ),
    levelA: levelASummary,
    comparableCohorts: freeze({
      counts: cohorts.counts || null,
      A: cohorts.counts?.A ?? 0,
      B: cohorts.counts?.B ?? 0,
      C: cohorts.counts?.C ?? 0,
      D: cohorts.counts?.D ?? 0,
    }),
    structuralEvidence: freeze({
      packageCoreRanges: Object.keys(structuralEvidence.packageCoreRanges || {}).length,
      roleRatioRanges: Object.keys(structuralEvidence.roleRatioRanges || {}).length,
      commanderFamilies: Object.keys(structuralEvidence.commanderFamilies || {}).length,
    }),
    strongestReplicatedObservations: freeze(
      commanderProfiles
        .filter((profile) => profile.stronglyReplicated.length)
        .slice(0, 12)
        .flatMap((profile) =>
          profile.stronglyReplicated.map((plan) =>
            freeze({
              commanderIdentity: profile.commanderIdentity,
              observation: `Primary plan ${plan.id} replicated in ${plan.count}/${profile.sampleSize} decks`,
              confidence: profile.confidence.level,
            }),
          ),
        ),
    ),
    contradictions: freeze(
      commanderProfiles.flatMap((profile) =>
        profile.contradictions.map((text) => freeze({
          commanderIdentity: profile.commanderIdentity,
          text,
        })),
      ),
    ),
  });
}

/**
 * Offline fixture path for deterministic Epic 2 tests/reports.
 */
export function buildEliteTournamentIntelligenceFromFixtures() {
  const materialized = materializeCompetitiveFixtureCorpus();
  const records = materialized.records || materialized || [];
  return buildEliteTournamentIntelligence({
    records,
    label: "competitive-fixtures",
  });
}

/**
 * Summarize a previously generated Field Intelligence artifact for the heartbeat.
 * Does not recompute Brain analysis — read-only projection.
 */
export function summarizeLiveEliteArtifact(artifact = null) {
  if (!artifact) return null;
  const corpus = artifact.corpus || {};
  const levelA = artifact.levelAForensics || {};
  const cohorts = artifact.comparableCohorts || {};
  return freeze({
    writesToBrain: false,
    source: "corpus-intelligence-artifact",
    generatedAt: artifact.generatedAt || null,
    brainPolicyTouched: artifact.brainPolicyTouched === true,
    constructionMutated: artifact.constructionMutated === true,
    decksAnalyzed: corpus.decksAnalyzed ?? null,
    recordsIngested: corpus.recordsIngested ?? null,
    eventsRepresented: corpus.eventsRepresented ?? null,
    uniqueCommanders: corpus.uniqueCommanders ?? (corpus.commanders || []).length ?? null,
    topCutDecks: corpus.topCutDecks ?? null,
    levelAUsableCohorts: levelA.usableCohorts ?? null,
    comparableCohorts: freeze(cohorts.counts || cohorts.summary || null),
    structuralEvidencePackages: Object.keys(artifact.structuralEvidence?.packageCoreRanges || {}).length,
    substitutionCandidates: artifact.substitutionEvidence?.candidates?.length
      ?? artifact.substitutionEvidence?.pairs?.length
      ?? null,
  });
}
