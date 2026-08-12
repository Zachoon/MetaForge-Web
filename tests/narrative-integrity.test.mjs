import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  bindStructuralSystemsForCoach,
  evaluateNarrativeIntegrityForCoach,
  stampStructuralReportBinding,
  deckFingerprintFromRows,
} from "../app/narrative-integrity.mjs";
import {
  buildHonestCoachSummary,
  buildIntegrityGuardedCoachSummary,
} from "../app/honest-coach-summary.mjs";

describe("Narrative Integrity Gate — cross-analysis contamination", () => {
  it("rejects structural systems bound to a different commander/generation", () => {
    const isshinReport = stampStructuralReportBinding(
      {
        status: "structural-analysis-complete",
        commanderName: "Isshin, Two Heavens as One",
        systems: {
          systems: [{ name: "Evasion Engine" }, { name: "Treasure Engine" }],
          strongestSystem: { name: "Evasion Engine" },
          weakestSystem: { name: "Treasure Engine" },
          confidence: "HIGH",
        },
      },
      {
        generationId: "gen-isshin",
        commanderName: "Isshin, Two Heavens as One",
        deckFingerprint: "deck-isshin",
      },
    );

    const bound = bindStructuralSystemsForCoach({
      report: isshinReport,
      generationId: "gen-tony",
      commanderName: "Tony Stark, Iron Man",
      deckFingerprint: "deck-tony",
    });

    assert.equal(bound.ok, false);
    assert.equal(bound.systems, null);
    assert.match(bound.reason, /mismatch/);
  });

  it("never narrates Isshin / Evasion / Treasure for a Tony Stark analysis", () => {
    const tonySelected = {
      evaluation: { cohesion: 70, roleCoverage: 0.75 },
      strategicIntent: {
        strategy: "Focused",
        packages: [{ id: "equipment", label: "Equipment package" }],
        // Contaminated intent from a previous analysis — must not win.
        commanders: [{ name: "Isshin, Two Heavens as One" }],
      },
      strategicCohesionGate: { ok: true, reasons: [] },
      slotJustificationLedger: {
        critique: {
          weaklyJustified: [],
          redundant: [],
          overSupported: [],
          underSupportedAnchors: [],
          rawPowerDominant: [],
          packageCritical: [],
        },
      },
      rows: [
        { name: "Tony Stark, Iron Man", quantity: 1, roles: ["commander"] },
        { name: "Sol Ring", quantity: 1 },
        { name: "Hammer of Nazahn", quantity: 1 },
      ],
    };

    const staleIsshinSystems = {
      systems: [{ name: "Evasion Engine" }, { name: "Treasure Engine" }],
      strongestSystem: { name: "Evasion Engine" },
      weakestSystem: { name: "Treasure Engine" },
      confidence: "HIGH · REPEATABLE SYSTEMS",
    };

    // Unbound stale systems must not be trusted by the page; guarded builder
    // also regenerates if they somehow leak in.
    const summary = buildIntegrityGuardedCoachSummary({
      selected: tonySelected,
      structuralSystems: staleIsshinSystems,
      generationId: "gen-tony",
      isImported: true,
      activeCommanderName: "Tony Stark, Iron Man",
      deckCardNames: tonySelected.rows.map((row) => row.name),
      foreignSuspectNames: ["Isshin, Two Heavens as One"],
      allowedSystemNames: [], // unbound → no systems allowed in narrative
    });

    const playerFacing = [
      summary.planStory?.title,
      summary.planStory?.plan,
      summary.planStory?.early,
      summary.planStory?.mid,
      summary.planStory?.stop,
      summary.planStory?.commander,
      summary.whatIThink,
      summary.whatLooksStrong,
      summary.whatToFixFirst,
      summary.why,
      summary.observedLead,
      summary.inferredLead,
      summary.guideLine,
      summary.headline,
      ...(summary.strengths || []),
      ...(summary.weaknesses || []),
      ...(summary.observedFindings || []),
      ...(summary.interpretiveGuidance || []),
      summary.strategyVsSystem?.strategy?.label,
      summary.strategyVsSystem?.engine?.label,
      summary.strategyVsSystem?.engine?.why,
    ].join("\n");

    assert.match(summary.planStory.commander, /Tony Stark/i);
    assert.equal(/Isshin/i.test(playerFacing), false, "Isshin must not appear in Tony Stark coach narrative");
    assert.equal(/Evasion Engine/i.test(playerFacing), false, "Evasion Engine must not leak");
    assert.equal(/Treasure Engine/i.test(playerFacing), false, "Treasure Engine must not leak");
    assert.equal(summary.narrativeIntegrity.ok, true);
    assert.equal(summary.narrativeIntegrity.regenerated, true);
    assert.ok(summary.narrativeIntegrity.priorViolations?.length > 0);
  });

  it("fails the gate when narrative names a foreign commander", () => {
    const contaminated = buildHonestCoachSummary({
      selected: {
        evaluation: { cohesion: 70, roleCoverage: 0.7 },
        strategicIntent: {
          packages: [{ id: "equipment", label: "Equipment package" }],
          commanders: [{ name: "Isshin, Two Heavens as One" }],
        },
        strategicCohesionGate: { ok: true, reasons: [] },
        slotJustificationLedger: { critique: { weaklyJustified: [], redundant: [], overSupported: [], underSupportedAnchors: [], rawPowerDominant: [], packageCritical: [] } },
      },
      generationId: "gen-tony",
      activeCommanderName: "Isshin, Two Heavens as One",
      deckCardNames: ["Tony Stark, Iron Man", "Sol Ring"],
    });

    const gate = evaluateNarrativeIntegrityForCoach({
      summary: contaminated,
      activeCommanderNames: ["Tony Stark, Iron Man"],
      deckCardNames: ["Tony Stark, Iron Man", "Sol Ring"],
      allowedPackageLabels: ["Equipment package"],
      allowedSystemNames: [],
      expectedGenerationId: "gen-tony",
      foreignSuspectNames: ["Isshin, Two Heavens as One"],
    });

    assert.equal(gate.ok, false);
    assert.ok(gate.violations.some((v) => v.type === "foreign_commander"));
  });

  it("fingerprints decks so Isshin and Tony Stark lists do not collide", () => {
    const isshin = deckFingerprintFromRows([
      { name: "Isshin, Two Heavens as One" },
      { name: "Lightning Greaves" },
    ]);
    const tony = deckFingerprintFromRows([
      { name: "Tony Stark, Iron Man" },
      { name: "Sol Ring" },
    ]);
    assert.notEqual(isshin, tony);
  });

  it("accepts Megatron display while validating Blightsteel canonical identity", () => {
    const gate = evaluateNarrativeIntegrityForCoach({
      summary: {
        identity: { commanders: ["Tony Stark, Iron Man"], packageLabels: ["Artifact package"] },
        namedCards: ["Blightsteel Colossus"],
        planStory: { commander: "Tony Stark, Iron Man" },
        analysisIds: { analysisId: "a", generationId: "g" },
      },
      activeCommanderNames: ["Tony Stark, Iron Man"],
      deckCardNames: ["Megatron", "Sol Ring", "Tony Stark, Iron Man"],
      allowedPackageLabels: ["Artifact package"],
      allowedSystemNames: [],
      resolutions: [{
        inputName: "Megatron",
        displayName: "Megatron",
        canonicalName: "Blightsteel Colossus",
        oracleId: "oracle-blightsteel",
        resolutionKind: "flavor_name_alias",
      }],
    });
    assert.equal(gate.ok, true);
  });
});
