import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildCommanderProfiles,
  buildEliteTournamentIntelligenceFromFixtures,
  buildStrategicFingerprint,
  summarizeLiveEliteArtifact,
  summarizeLevelAStructuralComparisons,
} from "../../app/knowledge/elite-tournament-intelligence.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("Epic 2 — Elite Tournament Intelligence", () => {
  it("does not import Brain construction mutators", () => {
    const source = readFileSync(join(root, "app/knowledge/elite-tournament-intelligence.mjs"), "utf8");
    assert.match(source, /writesToBrain:\s*false/);
    assert.doesNotMatch(source, /forgeNativeMasterwork|chooseSpells|prospectiveSlotDelta|package-plan-optimizer/);
  });

  it("builds a structural fingerprint without popularity-as-truth", () => {
    const fingerprint = buildStrategicFingerprint({
      record: {
        id: "deck-1",
        commanders: [{ name: "Kinnan, Bonder Prodigy" }],
        evidenceTier: "elite_tournament",
        performanceClass: "converter",
        eventId: "evt-1",
        topCut: true,
        placement: 1,
      },
      analysis: {
        packages: [
          { id: "value_engine", label: "Value Engine", status: "healthy", healthScore: 80, density: { core: 0.4 }, legs: { draw: { current: 8 } } },
        ],
        roleDistribution: { ramp: 10, draw: 8, interaction: 6, threat: 5 },
        curve: { "0-1": 4, "2": 12, "3": 10, "4": 6, "5+": 3 },
        commanderConnection: { ratio: 0.55, connectedCount: 22, totalNonlands: 64 },
        interactionGraph: { edgeCount: 40, coverage: 0.7, enginePairs: [{ a: 1 }], isolated: [] },
        justification: { weaklyJustifiedCount: 2, strongRatio: 0.8 },
        commanderFamily: { familyId: "family:mana_dork_value" },
      },
    });
    assert.equal(fingerprint.writesToBrain, false);
    assert.equal(fingerprint.primaryPlan.id, "value_engine");
    assert.equal(fingerprint.antiNetdeck.frequencyIsNotQuality, true);
    assert.equal(fingerprint.performanceProvenance.eventId, "evt-1");
    assert.ok(fingerprint.interactionComposition.interactionDensity > 0);
  });

  it("aggregates commander profiles with confidence + contradiction detection", () => {
    const fps = [
      buildStrategicFingerprint({
        record: { id: "a", commanders: [{ name: "Tymna the Weaver" }, { name: "Kraum, Ludevic's Opus" }], eventId: "e1", topCut: true, authorKey: "p1" },
        analysis: {
          packages: [{ id: "midrange_control", label: "Midrange", status: "healthy", healthScore: 70, density: { core: 0.3 }, legs: {} }],
          roleDistribution: { interaction: 12, threat: 4, ramp: 6 },
          commanderConnection: { ratio: 0.4, connectedCount: 10, totalNonlands: 64 },
          interactionGraph: { edgeCount: 20, coverage: 0.5, enginePairs: [], isolated: [] },
          justification: {},
        },
      }),
      buildStrategicFingerprint({
        record: { id: "b", commanders: [{ name: "Tymna the Weaver" }, { name: "Kraum, Ludevic's Opus" }], eventId: "e2", topCut: true, authorKey: "p2" },
        analysis: {
          packages: [{ id: "midrange_control", label: "Midrange", status: "healthy", healthScore: 72, density: { core: 0.32 }, legs: {} }],
          roleDistribution: { interaction: 11, threat: 5, ramp: 7 },
          commanderConnection: { ratio: 0.42, connectedCount: 11, totalNonlands: 64 },
          interactionGraph: { edgeCount: 22, coverage: 0.52, enginePairs: [], isolated: [] },
          justification: {},
        },
      }),
      buildStrategicFingerprint({
        record: { id: "c", commanders: [{ name: "Tymna the Weaver" }, { name: "Kraum, Ludevic's Opus" }], eventId: "e3", topCut: false, authorKey: "p3" },
        analysis: {
          packages: [{ id: "turbo_combo", label: "Turbo", status: "healthy", healthScore: 68, density: { core: 0.28 }, legs: {} }],
          roleDistribution: { interaction: 8, threat: 3, ramp: 10 },
          commanderConnection: { ratio: 0.35, connectedCount: 8, totalNonlands: 64 },
          interactionGraph: { edgeCount: 18, coverage: 0.45, enginePairs: [], isolated: [] },
          justification: {},
        },
      }),
      buildStrategicFingerprint({
        record: { id: "d", commanders: [{ name: "Tymna the Weaver" }, { name: "Kraum, Ludevic's Opus" }], eventId: "e4", topCut: true, authorKey: "p4" },
        analysis: {
          packages: [{ id: "turbo_combo", label: "Turbo", status: "healthy", healthScore: 69, density: { core: 0.29 }, legs: {} }],
          roleDistribution: { interaction: 9, threat: 3, ramp: 11 },
          commanderConnection: { ratio: 0.36, connectedCount: 9, totalNonlands: 64 },
          interactionGraph: { edgeCount: 19, coverage: 0.46, enginePairs: [], isolated: [] },
          justification: {},
        },
      }),
    ];
    const profiles = buildCommanderProfiles(fps);
    assert.equal(profiles.length, 1);
    assert.ok(profiles[0].sampleSize >= 4);
    assert.ok(profiles[0].confidence.level === "limited" || profiles[0].confidence.level === "moderate" || profiles[0].confidence.level === "high");
    assert.ok(profiles[0].stronglyReplicated.some((plan) => plan.id === "midrange_control" || plan.id === "turbo_combo"));
    assert.ok(profiles[0].contradictions.length >= 1);
  });

  it("summarizes Level-A deltas as observations, not rules", () => {
    const summary = summarizeLevelAStructuralComparisons({
      usableCohorts: 1,
      cohorts: [{
        ok: true,
        eventId: "evt",
        eventName: "Fixture Open",
        commanderIdentity: "Kinnan, Bonder Prodigy",
        cohortSize: 4,
        highCount: 2,
        lowCount: 2,
        deltas: [
          { feature: "interactionDensity", highMean: 12, lowMean: 8, delta: 4, confidence: 0.55 },
        ],
      }],
    });
    assert.equal(summary.writesToBrain, false);
    assert.equal(summary.usableCohorts, 1);
    assert.match(summary.observations[0].structuralDifferences[0], /interactionDensity/);
    assert.match(summary.observations[0].caveat, /not Brain rules/i);
  });

  it("fixture corpus produces fingerprints, profiles, and Level-A observations", () => {
    const intel = buildEliteTournamentIntelligenceFromFixtures();
    assert.equal(intel.writesToBrain, false);
    assert.equal(intel.brainChanges, 0);
    assert.ok(intel.corpus.fingerprints >= 50);
    assert.ok(intel.commanderProfiles.length >= 3);
    assert.ok(intel.levelA.usableCohorts >= 1);
    assert.equal(intel.antiNetdeck.frequencyIsNotQuality, true);
    assert.ok(intel.comparableCohorts.A >= 1);
  });

  it("live artifact summary is read-only projection when present", () => {
    const path = join(root, "tests/field-intelligence/corpus-intelligence-v1.json");
    if (!existsSync(path)) return;
    const artifact = JSON.parse(readFileSync(path, "utf8"));
    const summary = summarizeLiveEliteArtifact(artifact);
    assert.equal(summary.writesToBrain, false);
    assert.equal(summary.brainPolicyTouched, false);
    assert.equal(summary.constructionMutated, false);
    assert.ok((summary.decksAnalyzed ?? summary.recordsIngested ?? 0) > 0);
  });

  it("program docs and report script exist", () => {
    const docs = readFileSync(join(root, "docs/KNOWLEDGE_EXPANSION_PROGRAM.md"), "utf8");
    assert.match(docs, /Epic 2/);
    assert.match(docs, /Elite Tournament Intelligence/);
    const page = readFileSync(join(root, "tests/knowledge/run-epic2-report.mjs"), "utf8");
    assert.match(page, /Strategic Knowledge Report/);
  });
});
