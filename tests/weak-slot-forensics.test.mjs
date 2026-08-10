import assert from "node:assert/strict";
import test from "node:test";
import { forgeNativeMasterwork } from "../app/native-masterwork-engine.mjs";
import {
  aggregateWeakSlotForensics,
  buildWeakSlotForensicRecord,
  classifyWeakSlotCause,
  runWeakSlotCounterfactual,
  WEAK_SLOT_CAUSAL_CLASSES,
} from "../app/weak-slot-forensics.mjs";
import { TORTURE_FIXTURES, fixtureInput } from "./commander-torture-bench/fixtures.mjs";

const pearl = () => TORTURE_FIXTURES.find((entry) => entry.id === "pearl-ear-auras");

function weakSlotStub(overrides = {}) {
  return {
    name: overrides.name || "Weak Filler",
    strength: overrides.strength ?? 10,
    roles: overrides.roles || ["draw"],
    reasons: overrides.reasons || [{ kind: "role", detail: "draw", weight: 8 }],
    footprint: overrides.footprint || { packageCore: [], packageSupport: [] },
    supports: overrides.supports || [],
    supportedBy: overrides.supportedBy || [],
    flags: {
      weaklyJustified: true,
      redundant: false,
      overSupported: false,
      ...(overrides.flags || {}),
    },
  };
}

test("weak-slot causal classes are a closed set", () => {
  assert.ok(WEAK_SLOT_CAUSAL_CLASSES.includes("weak_at_selection"));
  assert.ok(WEAK_SLOT_CAUSAL_CLASSES.includes("constraint_forced_compromise"));
  assert.ok(WEAK_SLOT_CAUSAL_CLASSES.includes("repair_degraded_slot"));
});

test("forensic record points to entry source from construction trace", () => {
  const report = forgeNativeMasterwork(fixtureInput(pearl(), 11));
  const forensics = report.selected.weakSlotForensics;
  assert.ok(forensics, "weakSlotForensics missing");
  assert.equal(forensics.version, "weak-slot-forensics-v1");
  assert.ok(Array.isArray(forensics.records));
  for (const record of forensics.records) {
    assert.ok(record.card);
    assert.ok(record.source);
    assert.ok(WEAK_SLOT_CAUSAL_CLASSES.includes(record.causalClass));
    assert.equal(typeof record.avoidable, "boolean");
    assert.ok(record.counterfactual);
    assert.equal(typeof record.counterfactual.replacementAvailable, "boolean");
  }
});

test("final counterfactual distinguishes avoidable from constraint-forced weakness", () => {
  const rows = [
    { quantity: 1, name: "Commander", roles: ["commander"], cmc: 2, mechanics: { produces: [], rewards: [] } },
    { quantity: 1, name: "Weak Filler", roles: ["draw"], cmc: 3, mechanics: { produces: [], rewards: [] }, score: 5 },
    { quantity: 1, name: "Strong Draw", roles: ["draw"], cmc: 2, mechanics: { produces: ["card_draw"], rewards: [] }, score: 40 },
    { quantity: 36, name: "Plains", roles: ["land"], cmc: 0 },
  ];
  // Inflate to commander-ish nonland count so score floor isn't absurd.
  for (let i = 0; i < 30; i += 1) {
    rows.push({
      quantity: 1,
      name: `Support ${i}`,
      roles: i % 2 ? ["ramp"] : ["interaction"],
      cmc: 2,
      mechanics: { produces: i % 2 ? ["mana"] : [], rewards: [] },
      score: 20,
    });
  }
  const weak = weakSlotStub({ name: "Weak Filler", strength: 8 });
  const pool = [
    {
      card: { name: "Better Draw Engine", cmc: 2 },
      roles: ["draw", "protection"],
      score: 55,
      cmc: 2,
      mechanics: { produces: ["card_draw"], rewards: ["protection"] },
      commanderConnectionSignals: ["draw_payoff"],
      sequenceStages: ["stabilize"],
      strategicSemantics: new Set(["draw"]),
    },
  ];
  const avoidable = runWeakSlotCounterfactual(
    { rows, strategicIntent: { packages: [] }, strategicCohesionGate: { passed: true } },
    weak,
    pool,
    { format: "Commander", strategy: "Balanced midrange", target: rows.reduce((s, r) => s + r.quantity, 0) },
  );
  assert.equal(avoidable.replacementAvailable, true);
  assert.equal(avoidable.bestAlternative, "Better Draw Engine");
  assert.ok(avoidable.justificationGain >= 0 || avoidable.wholeDeckDelta?.structural?.score > 0);
  assert.equal(avoidable.constraintForced, false);

  const forced = runWeakSlotCounterfactual(
    { rows, strategicIntent: { packages: [] }, strategicCohesionGate: { passed: true } },
    weak,
    [],
    { format: "Commander", strategy: "Balanced midrange" },
  );
  assert.equal(forced.replacementAvailable, false);
  assert.equal(forced.constraintForced, true);
});

test("live-fill weak slot with superior final alternative is identified as avoidable", () => {
  const record = classifyWeakSlotCause({
    survivalPath: "live_fill",
    pickTimeProspectiveTotal: 8,
    pickTimeRawScore: 42,
    finalJustificationStrength: 9,
    expectedReasons: [],
    finalReasons: ["role:draw"],
    flags: { weaklyJustified: true, redundant: false },
    counterfactual: {
      replacementAvailable: true,
      constraintForced: false,
      candidateDepth: 12,
      bestAlternative: "Better Card",
    },
  });
  assert.equal(record.avoidable, true);
  assert.ok(["raw_score_leak", "weak_at_selection"].includes(record.causalClass));
});

test("budget-forced weak slot is not mislabeled as avoidable", () => {
  const record = classifyWeakSlotCause({
    survivalPath: "live_fill",
    pickTimeProspectiveTotal: 20,
    pickTimeRawScore: 22,
    finalJustificationStrength: 10,
    expectedReasons: ["package_core:auras"],
    finalReasons: [],
    flags: { weaklyJustified: true, redundant: false },
    finalPackageState: {},
    counterfactual: {
      replacementAvailable: false,
      constraintForced: true,
      candidateDepth: 1,
      note: "alternatives_blocked_by_constraints",
    },
  });
  assert.equal(record.avoidable, false);
  assert.equal(record.constraintForced, true);
  assert.ok(["constraint_forced_compromise", "became_weak_downstream"].includes(record.causalClass));
});

test("repair-degraded slot is correctly attributed", () => {
  const record = classifyWeakSlotCause({
    survivalPath: "budget_repair",
    pickTimeProspectiveTotal: null,
    pickTimeRawScore: null,
    finalJustificationStrength: 7,
    expectedReasons: [],
    finalReasons: [],
    flags: { weaklyJustified: true },
    counterfactual: { replacementAvailable: true, constraintForced: false, candidateDepth: 9 },
  });
  assert.equal(record.causalClass, "repair_degraded_slot");
  assert.ok(record.causalTags.includes("repair_degraded_slot"));
});

test("redundant-at-finish differs from weak-at-selection", () => {
  const redundant = classifyWeakSlotCause({
    survivalPath: "live_fill",
    pickTimeProspectiveTotal: 24,
    pickTimeRawScore: 30,
    finalJustificationStrength: 12,
    expectedReasons: ["package_core:tokens"],
    finalReasons: ["package_core:tokens"],
    flags: { weaklyJustified: true, redundant: true },
    counterfactual: { replacementAvailable: false, constraintForced: false, candidateDepth: 8 },
  });
  assert.ok(redundant.causalTags.includes("redundant_at_finish"));

  const weakAtSel = classifyWeakSlotCause({
    survivalPath: "live_fill",
    pickTimeProspectiveTotal: 4,
    pickTimeRawScore: 18,
    finalJustificationStrength: 8,
    expectedReasons: [],
    finalReasons: [],
    flags: { weaklyJustified: true, redundant: false },
    counterfactual: { replacementAvailable: false, constraintForced: false, candidateDepth: 10 },
  });
  assert.equal(weakAtSel.causalClass, "weak_at_selection");
  assert.ok(!weakAtSel.causalTags.includes("redundant_at_finish"));
});

test("strong early scaffolding is not automatically a bad weak slot class", () => {
  // Anchors with no prospective belief that somehow land weak should stay low-confidence /
  // weak_at_selection — not raw_score_leak and not repair.
  const record = classifyWeakSlotCause({
    survivalPath: "anchor_reservation",
    pickTimeProspectiveTotal: 0,
    pickTimeRawScore: 50,
    finalJustificationStrength: 10,
    expectedReasons: [],
    finalReasons: [],
    flags: { weaklyJustified: true, redundant: false },
    counterfactual: { replacementAvailable: false, constraintForced: true, candidateDepth: 0 },
  });
  assert.notEqual(record.causalClass, "raw_score_leak");
  assert.notEqual(record.causalClass, "repair_degraded_slot");
  assert.ok(["weak_at_selection", "constraint_forced_compromise", "ambiguous"].includes(record.causalClass));
});

test("aggregate surfaces source/phase/causal distributions", () => {
  const aggregate = aggregateWeakSlotForensics([
    {
      causalClass: "raw_score_leak",
      source: "live_fill",
      constructionPhase: "development",
      avoidable: true,
      constraintForced: false,
      counterfactual: { candidateDepth: 10 },
    },
    {
      causalClass: "raw_score_leak",
      source: "live_fill",
      constructionPhase: "completion",
      avoidable: true,
      constraintForced: false,
      counterfactual: { candidateDepth: 8 },
    },
    {
      causalClass: "constraint_forced_compromise",
      source: "anchor_reservation",
      constructionPhase: "foundation",
      avoidable: false,
      constraintForced: true,
      counterfactual: { candidateDepth: 1 },
    },
  ]);
  assert.equal(aggregate.weakSlotCount, 3);
  assert.equal(aggregate.causalClassCounts.raw_score_leak, 2);
  assert.equal(aggregate.sourceCounts.live_fill, 2);
  assert.equal(aggregate.avoidableCount, 2);
  assert.equal(aggregate.constraintForcedCount, 1);
  assert.equal(aggregate.highestImpactCausalClass, "raw_score_leak");
});

test("final cleanup preserves cohesion and package floors when applied", () => {
  const report = forgeNativeMasterwork(fixtureInput(pearl(), 11));
  const repair = report.selected.weakSlotRepair;
  assert.ok(repair);
  if (repair.applied) {
    assert.ok(repair.appliedCount >= 1);
    assert.ok(repair.appliedCount <= 6);
    assert.equal(report.selected.strategicCohesionGate?.passed, true);
    const weakAfter = report.selected.slotJustificationLedger?.critique?.weaklyJustified?.length || 0;
    assert.ok(weakAfter < 5, `expected cleanup to reduce pearl weak slots, got ${weakAfter}`);
  }
  // Always: forensics still present and deterministic.
  assert.ok(report.selected.weakSlotForensics);
});

test("buildWeakSlotForensicRecord is deterministic for same seed forge", () => {
  const a = forgeNativeMasterwork(fixtureInput(pearl(), 11));
  const b = forgeNativeMasterwork(fixtureInput(pearl(), 11));
  assert.deepEqual(
    a.selected.weakSlotForensics.aggregate,
    b.selected.weakSlotForensics.aggregate,
  );
  assert.deepEqual(
    a.selected.weakSlotForensics.records.map((r) => ({ card: r.card, causalClass: r.causalClass, source: r.source })),
    b.selected.weakSlotForensics.records.map((r) => ({ card: r.card, causalClass: r.causalClass, source: r.source })),
  );
});
