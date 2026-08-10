import test from "node:test";
import assert from "node:assert/strict";
import {
  createStrategicPrinciple,
  derivePrincipleStatus,
  isInactivePrinciple,
  principleFingerprint,
  liftStrategicPrinciples,
  rejectFrequencyOnlyPrinciple,
  mergePrincipleEvidence,
  buildPrincipleRegistry,
  priorPrinciplesFromStore,
  renderAcademyLessons,
  buildCorpusIntelligenceArtifact,
  createCorpusDeckRecord,
} from "../app/field-intelligence/index.mjs";
import { forgeNativeMasterwork } from "../app/native-masterwork-engine.mjs";
import { TORTURE_FIXTURES, fixtureInput } from "./commander-torture-bench/fixtures.mjs";

test("principles originate only from FI evidence objects", () => {
  const registry = buildPrincipleRegistry({
    performanceHypotheses: {
      hypotheses: [{
        id: "psh:test:interaction",
        kind: "PerformanceStructureHypothesis",
        commanderFamily: "Test Spell Echo",
        familyKey: "test spell echo",
        feature: "interactionDensity",
        featureFamily: "interaction",
        observedDirection: "high_greater",
        levelAEventsSupporting: ["e1", "e2"],
        levelAEventsContradicting: [],
        totalHighDecks: 6,
        totalLowDecks: 8,
        weightedEffect: 26,
        confidence: 0.9,
        replicationStatus: "replicated",
      }],
    },
    topologyDiscovery: { candidates: [] },
  });
  assert.ok(registry.principleCount >= 1);
  assert.ok(registry.principles.every((p) => (p.origins || []).length > 0));
  assert.ok(registry.principles[0].lesson.includes("Candidate") || registry.principles[0].lesson.includes("Academy"));
});

test("card frequency alone cannot mint a principle", () => {
  const rejected = rejectFrequencyOnlyPrinciple({
    cardName: "Fierce Guardianship",
    frequency: 0.92,
    semanticSupport: false,
  });
  assert.equal(rejected.accepted, false);
  assert.equal(rejected.reason, "card_frequency_or_cooccurrence_alone");

  const empty = buildPrincipleRegistry({
    performanceHypotheses: { hypotheses: [] },
    topologyDiscovery: { candidates: [] },
  });
  assert.equal(empty.principleCount, 0);
});

test("supporting and contradicting events are both recorded", () => {
  const principles = liftStrategicPrinciples({
    performanceHypotheses: {
      hypotheses: [{
        id: "psh:k:interaction",
        commanderFamily: "Kraum / Tymna",
        familyKey: "kraum / tymna",
        feature: "interactionDensity",
        featureFamily: "interaction",
        observedDirection: "high_greater",
        levelAEventsSupporting: ["e1", "e2"],
        levelAEventsContradicting: ["e3"],
        totalHighDecks: 4,
        totalLowDecks: 4,
        weightedEffect: 12,
        confidence: 0.5,
        replicationStatus: "mixed",
      }],
    },
  });
  assert.equal(principles.length, 1);
  assert.deepEqual(principles[0].evidence.supportingEvents, ["e1", "e2"]);
  assert.deepEqual(principles[0].evidence.contradictingEvents, ["e3"]);
  assert.equal(principles[0].status, "mixed");
});

test("confidence history grows across simulated registry merges", () => {
  const first = createStrategicPrinciple({
    id: "sp:structure::interactiondensity::high_greater::test",
    title: "Connected interaction",
    kind: "structure",
    status: "candidate",
    confidence: 0.41,
    feature: "interactionDensity",
    evidence: {
      supportingEvents: ["e1"],
      contradictingEvents: [],
      sampleSize: 4,
      independentEvents: 1,
      commanderFamilies: ["Test"],
      transferClass: "commander_specific",
      weightedEffect: 10,
    },
    origins: ["psh:test:interaction"],
    lesson: "Academy lesson.",
  });
  const second = createStrategicPrinciple({
    ...first,
    confidence: 0.67,
    evidence: {
      ...first.evidence,
      supportingEvents: ["e1", "e2", "e3"],
      independentEvents: 3,
      sampleSize: 12,
    },
  });
  const merged = mergePrincipleEvidence(first, second, { at: "2026-08-10T00:00:00.000Z" });
  assert.ok(merged.confidenceHistory.length >= 2);
  assert.ok(merged.evidence.supportingEvents.length >= 3);
  assert.equal(merged.writesToBrain, false);
  assert.equal(merged.activated, false);
  assert.equal(merged.promoted, false);
  assert.ok(["replicated_candidate", "promotable"].includes(merged.status));
});

test("transfer class never auto-promotes cross-family into Brain", () => {
  const registry = buildPrincipleRegistry({
    performanceHypotheses: {
      hypotheses: [{
        id: "psh:a:interaction",
        commanderFamily: "A",
        familyKey: "a",
        feature: "interactionDensity",
        featureFamily: "interaction",
        observedDirection: "high_greater",
        levelAEventsSupporting: ["e1", "e2"],
        levelAEventsContradicting: [],
        totalHighDecks: 4,
        totalLowDecks: 4,
        weightedEffect: 20,
        confidence: 0.8,
        replicationStatus: "replicated",
      }],
    },
    crossCommanderTransfer: {
      results: [{
        hypothesisId: "psh:a:interaction",
        status: "transfer_supported",
        supportingCommanders: ["A", "B"],
        contradictingCommanders: [],
        assumeTransfer: false,
      }],
    },
  });
  const principle = registry.principles[0];
  assert.equal(principle.evidence.transferClass, "cross_family");
  assert.equal(registry.recommendations.activateBrain, false);
  assert.equal(registry.writesToBrain, false);
  assert.ok(registry.allInactive);
});

test("registry candidates remain inactive", () => {
  const registry = buildPrincipleRegistry({
    topologyDiscovery: {
      candidates: [{
        kind: "sequence_blind_spot_candidate",
        id: "seq_blind_setup_engine_payoff",
        observedEvidence: {
          sequenceId: "setup_engine_payoff",
          stages: ["setup", "convert", "close"],
        },
        sampleSize: 32,
        independentEvents: 4,
        commanderFamilyDiversity: 3,
        converterAssociation: "common_tournament",
        contradictions: [],
        confidence: 0.92,
        whatBrainV1Understands: "sequenceStages_as_card_annotations",
        whatAppearsMissing: "construction_preference_for_covered_strategic_sequences",
        transferClass: "cross_family",
        autoMutateBrain: false,
      }],
    },
  });
  assert.ok(registry.principleCount >= 1);
  for (const principle of registry.candidates) {
    assert.equal(isInactivePrinciple(principle), true);
    assert.equal(principle.writesToBrain, false);
    assert.equal(principle.activated, false);
    assert.equal(principle.promoted, false);
  }
  const lessons = renderAcademyLessons(registry.candidates, { limit: 3 });
  assert.ok(lessons[0].candidateOnly);
  assert.equal(lessons[0].writesToBrain, false);
});

test("prior store principles merge into registry", () => {
  const prior = createStrategicPrinciple({
    id: principleFingerprint({
      kind: "structure",
      feature: "interactionDensity",
      featureFamily: "interaction",
      direction: "high_greater",
      scope: "test spell echo",
    }),
    title: "Connected interaction beats raw interaction count",
    kind: "structure",
    status: "candidate",
    confidence: 0.41,
    feature: "interactionDensity",
    featureFamily: "interaction",
    observedDirection: "high_greater",
    evidence: {
      supportingEvents: ["old-e1"],
      contradictingEvents: [],
      sampleSize: 4,
      independentEvents: 1,
      commanderFamilies: ["Test Spell Echo"],
      transferClass: "commander_specific",
      weightedEffect: 10,
    },
    origins: ["psh:test spell echo:interaction"],
    lesson: "Prior academy lesson.",
  });
  const storeRows = [{ kind: "strategic_principle", principle: prior }];
  assert.equal(priorPrinciplesFromStore(storeRows).length, 1);

  const registry = buildPrincipleRegistry({
    priorStoreRows: storeRows,
    performanceHypotheses: {
      hypotheses: [{
        id: "psh:test spell echo:interaction",
        commanderFamily: "Test Spell Echo",
        familyKey: "test spell echo",
        feature: "interactionDensity",
        featureFamily: "interaction",
        observedDirection: "high_greater",
        levelAEventsSupporting: ["e2", "e3"],
        levelAEventsContradicting: [],
        totalHighDecks: 6,
        totalLowDecks: 6,
        weightedEffect: 26,
        confidence: 0.9,
        replicationStatus: "replicated",
      }],
    },
  });
  const matched = registry.principles.find((p) => p.id === prior.id);
  assert.ok(matched);
  assert.ok(matched.evidence.supportingEvents.includes("old-e1"));
  assert.ok(matched.evidence.supportingEvents.includes("e2"));
  assert.ok(matched.confidenceHistory.length >= 2);
});

test("status machine reaches promotable without activating Brain", () => {
  assert.equal(derivePrincipleStatus({
    supportingCount: 5,
    contradictingCount: 0,
    confidence: 0.9,
  }), "promotable");
  const principle = createStrategicPrinciple({
    title: "Protect tutors",
    status: "promotable",
    confidence: 0.93,
    evidence: {
      supportingEvents: Array.from({ length: 11 }, (_, i) => `e${i}`),
      contradictingEvents: [],
      independentEvents: 11,
      sampleSize: 217,
      commanderFamilies: ["Artifact Combo"],
      transferClass: "family_specific",
    },
    lesson: "Successful lists protect tutors/engines/combo turns instead of raising interaction count.",
  });
  assert.equal(principle.promoted, false);
  assert.equal(principle.activated, false);
  assert.equal(principle.writesToBrain, false);
});

test("fixture FI artifact includes inactive principle registry", async () => {
  const record = createCorpusDeckRecord({
    id: "pr-1",
    eventId: "ev-1",
    commanders: [{ name: "Test Spell Echo", oracleText: "Draw a card.", typeLine: "Legendary Creature" }],
    rows: [
      { quantity: 1, name: "Counterspell", typeLine: "Instant", oracleText: "Counter target spell.", cmc: 2, roles: ["interaction"] },
      { quantity: 1, name: "Win", typeLine: "Sorcery", oracleText: "You win the game.", cmc: 4, roles: ["threat"], sequenceStages: ["close"] },
    ],
    placement: 1,
    topCut: true,
    topCutSize: 4,
    evidenceTier: "tournament_performance",
    sourceType: "topdeck_tournament",
  });
  const low = createCorpusDeckRecord({
    id: "pr-2",
    eventId: "ev-1",
    commanders: [{ name: "Test Spell Echo", oracleText: "Draw a card.", typeLine: "Legendary Creature" }],
    rows: [
      { quantity: 1, name: "Shock", typeLine: "Instant", oracleText: "Deal 2 damage.", cmc: 1, roles: ["interaction"] },
    ],
    placement: 16,
    topCut: false,
    topCutSize: 4,
    evidenceTier: "tournament_performance",
    sourceType: "topdeck_tournament",
  });
  const artifact = await buildCorpusIntelligenceArtifact({ records: [record, low] });
  assert.ok(artifact.strategicPrincipleRegistry);
  assert.equal(artifact.strategicPrincipleRegistry.writesToBrain, false);
  assert.equal(artifact.strategicPrincipleEngine.activateBrain, false);
  assert.equal(artifact.brainPolicyTouched, false);
  assert.equal(artifact.constructionMutated, false);
});

test("Brain v1 control identity unchanged by Principle Engine", () => {
  const a = forgeNativeMasterwork(fixtureInput(TORTURE_FIXTURES[0], 11));
  const b = forgeNativeMasterwork({
    ...fixtureInput(TORTURE_FIXTURES[0], 11),
    brainPolicy: "brain_v1_control",
  });
  const names = (report) => (report.selected.rows || []).map((row) => row.name).sort().join("|");
  assert.equal(names(a), names(b));
  assert.equal(a.selected.strategicIntent?.brainPolicy, "brain_v1_control");
});
