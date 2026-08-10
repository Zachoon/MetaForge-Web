import assert from "node:assert/strict";
import test from "node:test";
import { forgeNativeMasterwork } from "../app/native-masterwork-engine.mjs";
import {
  compactDeficitSnapshot,
  createConstructionTraceSession,
  recordConstructionPick,
  sealConstructionTrace,
} from "../app/construction-trace.mjs";
import {
  aggregateSelfEvaluationArtifacts,
  attachSelfEvaluationToCandidate,
  compareProspectiveToRetrospective,
  stableSelfEvaluationView,
} from "../app/reasoning-drift.mjs";
import { TORTURE_FIXTURES, fixtureInput } from "./commander-torture-bench/fixtures.mjs";

const pearl = () => TORTURE_FIXTURES.find((entry) => entry.id === "pearl-ear-auras");

test("every live fill pick receives a construction-trace record", () => {
  const report = forgeNativeMasterwork(fixtureInput(pearl(), 11));
  const se = report.selected.selfEvaluation;
  assert.ok(se, "selfEvaluation artifact missing");
  assert.ok(se.liveFillPicks > 0, "expected live_fill picks");
  const live = se.picks.filter((pick) => pick.source === "live_fill");
  assert.equal(live.length, se.liveFillPicks);
  for (const pick of live) {
    assert.ok(pick.pickIndex >= 1);
    assert.ok(pick.prospectiveDelta);
    assert.ok(pick.constructionPhase);
    assert.ok(Array.isArray(pick.rejectedAlternatives));
    assert.ok(pick.rejectedAlternatives.length <= 3);
  }
});

test("pick-time prospective data survives finalization", () => {
  const report = forgeNativeMasterwork(fixtureInput(pearl(), 11));
  const live = report.selected.selfEvaluation.picks.filter((pick) => pick.source === "live_fill");
  assert.ok(live.some((pick) => (pick.prospectiveDelta?.total || 0) !== 0));
  assert.ok(live.every((pick) => pick.prospectiveDelta && Array.isArray(pick.prospectiveDelta.deficitsFilled)));
});

test("surviving cards attach retrospective ledger data", () => {
  const report = forgeNativeMasterwork(fixtureInput(pearl(), 11));
  const survivors = report.selected.selfEvaluation.picks.filter((pick) => pick.outcome?.mutation === "survived_final");
  assert.ok(survivors.length > 20);
  for (const pick of survivors.slice(0, 12)) {
    assert.equal(typeof pick.outcome.justificationStrength, "number");
    assert.ok(Array.isArray(pick.outcome.reasons));
    assert.ok(pick.outcome.flags);
    assert.ok(pick.drift);
    assert.ok(pick.drift.primaryClass);
  }
});

test("removed/repaired cards remain represented with mutation outcome", () => {
  // Induce a package-optimization or bomb path via Pearl-Ear's Ulamog trap:
  // if nothing is removed, synthesize a finalize attachment with a mutation.
  const report = forgeNativeMasterwork(fixtureInput(pearl(), 11));
  const removed = report.selected.selfEvaluation.picks.filter((pick) =>
    String(pick.outcome?.mutation || "").startsWith("removed_"));
  if (removed.length) {
    assert.ok(removed.every((pick) => pick.drift?.primaryClass === "downstream_repair_invalidated_pick"
      || pick.drift?.controlCaseId === "invalidated_by_later_decisions"));
    return;
  }
  // Synthetic path: prove mutation handling without requiring a live repair hit.
  const sealed = sealConstructionTrace(createConstructionTraceSession({ packageIds: ["auras"] }));
  const session = createConstructionTraceSession({ packageIds: ["auras"] });
  recordConstructionPick(session, {
    source: "live_fill",
    name: "Temp Aura",
    constructionPhase: "development",
    rawScore: 40,
    adjustedScore: 50,
    prospectiveDelta: {
      total: 30,
      deficitsFilled: ["package_core:auras"],
      surplusIntroduced: [],
      positives: [{ kind: "package_core", detail: "auras", weight: 26 }],
      negatives: [],
    },
    deficitBefore: compactDeficitSnapshot({}),
  });
  const candidate = attachSelfEvaluationToCandidate({
    rows: [
      { quantity: 1, name: "Pearl-Ear, Imperial Advisor", roles: ["commander"], cmc: 2 },
      { quantity: 40, name: "Plains", roles: ["land"], cmc: 0 },
    ],
    constructionTrace: sealConstructionTrace(session),
    strategicIntent: { packages: [{ id: "auras", coreSemantics: ["aura"], coreMin: 8, supportMin: 2, supportSemantics: [], falseFriendSemantics: [] }] },
    slotJustificationLedger: { byName: {}, slots: [], critique: {} },
    budgetRepair: { removedNames: ["Temp Aura"], alternativesAddedNames: [] },
    strategicCohesionGate: { passed: true },
  });
  const pick = candidate.selfEvaluation.picks.find((entry) => entry.name === "Temp Aura");
  assert.ok(pick);
  assert.equal(pick.outcome.mutation, "removed_budget_repair");
  assert.equal(pick.drift.primaryClass, "downstream_repair_invalidated_pick");
  assert.equal(pick.drift.controlCaseId, "invalidated_by_later_decisions");
  assert.ok(sealed.version);
});

test("deliberately redundant later build produces became_redundant or later_package_oversupply", () => {
  const pick = {
    source: "live_fill",
    prospectiveDelta: {
      total: 40,
      deficitsFilled: ["package_core:auras"],
      surplusIntroduced: [],
      positives: [{ kind: "package_core", key: "auras", weight: 26 }],
      negatives: [],
    },
    commanderConnectionSignals: ["auras"],
  };
  const outcome = {
    mutation: "survived_final",
    justificationStrength: 35,
    reasons: ["package_core:auras"],
    flags: { redundant: true, weaklyJustified: false, rawPowerDominant: false },
    packageHealth: { auras: { status: "healthy", densityDeficit: 0, densitySurplus: 6, issues: [] } },
  };
  const drift = compareProspectiveToRetrospective(pick, outcome, { laterSameDeficitFills: 3 });
  assert.ok(["became_redundant", "later_package_oversupply"].includes(drift.primaryClass));
  assert.equal(drift.controlCaseId, "invalidated_by_later_decisions");
});

test("repair invalidation distinguishes bad belief from downstream invalidation", () => {
  const pick = {
    source: "live_fill",
    prospectiveDelta: { total: 28, deficitsFilled: ["role:draw"], surplusIntroduced: [], positives: [], negatives: [] },
  };
  const removed = compareProspectiveToRetrospective(pick, {
    mutation: "removed_budget_repair",
    justificationStrength: 0,
    reasons: [],
    flags: { removed: true },
    packageHealth: {},
  }, { laterSameDeficitFills: 0 });
  assert.equal(removed.primaryClass, "downstream_repair_invalidated_pick");
  assert.equal(removed.controlCaseId, "invalidated_by_later_decisions");

  const badBelief = compareProspectiveToRetrospective(pick, {
    mutation: "survived_final",
    justificationStrength: 8,
    reasons: [],
    flags: { weaklyJustified: true, redundant: false, rawPowerDominant: false },
    packageHealth: {},
  }, { laterSameDeficitFills: 0 });
  assert.ok(["final_weak_justification", "genuine_bad_belief"].includes(badBelief.primaryClass)
    || badBelief.controlCaseId === "genuine_bad_belief");
});

test("beneficial emergence produces positive retrospective drift", () => {
  const drift = compareProspectiveToRetrospective({
    source: "live_fill",
    prospectiveDelta: { total: 6, deficitsFilled: [], surplusIntroduced: [], positives: [], negatives: [] },
    commanderConnectionSignals: [],
  }, {
    mutation: "survived_final",
    justificationStrength: 72,
    reasons: ["package_core:auras", "commander_connection:auras"],
    flags: {},
    packageHealth: {},
  }, { laterSameDeficitFills: 0 });
  assert.equal(drift.primaryClass, "retrospective_gain_not_seen_prospectively");
  assert.equal(drift.controlCaseId, "beneficial_emergence");
  assert.ok(drift.driftMagnitude > 0);
});

test("stable good prediction is recognized without disagreement noise", () => {
  const drift = compareProspectiveToRetrospective({
    source: "live_fill",
    prospectiveDelta: {
      total: 32,
      deficitsFilled: ["package_core:auras"],
      surplusIntroduced: [],
      positives: [{ kind: "package_core", key: "auras", weight: 20 }],
      negatives: [],
    },
    commanderConnectionSignals: ["auras"],
  }, {
    mutation: "survived_final",
    justificationStrength: 55,
    reasons: ["package_core:auras", "commander_connection:auras"],
    flags: { weaklyJustified: false, redundant: false, rawPowerDominant: false },
    packageHealth: { auras: { status: "healthy", densityDeficit: 0, densitySurplus: 0, issues: [] } },
  }, { laterSameDeficitFills: 0 });
  assert.equal(drift.primaryClass, "stable_good_prediction");
  assert.equal(drift.controlCaseId, "stable");
});

test("ambiguous cases can remain unclassified", () => {
  const drift = compareProspectiveToRetrospective({
    source: "live_fill",
    prospectiveDelta: { total: 14, deficitsFilled: [], surplusIntroduced: [], positives: [], negatives: [] },
  }, {
    mutation: "survived_final",
    justificationStrength: 28,
    reasons: ["tracked_role:draw"],
    flags: {},
    packageHealth: {},
  }, { laterSameDeficitFills: 0 });
  assert.ok(["unclassified", "ambiguous", "stable_good_prediction"].includes(drift.primaryClass));
});

test("aggregate counts equal underlying per-pick records", () => {
  const report = forgeNativeMasterwork(fixtureInput(pearl(), 11));
  const artifact = {
    ...report.selected.selfEvaluation,
    archetype: "aura_voltron",
    meta: { ...report.selected.selfEvaluation.meta, archetype: "aura_voltron" },
  };
  const aggregate = aggregateSelfEvaluationArtifacts([artifact]);
  const classSum = Object.values(aggregate.driftClassCounts).reduce((sum, n) => sum + n, 0);
  assert.equal(classSum, artifact.totalTracedPicks);
  assert.equal(aggregate.totalTracedPicks, artifact.totalTracedPicks);
  assert.equal(aggregate.forgeCount, 1);
});

test("same deterministic forge produces stable self-eval aside from timing", () => {
  const a = forgeNativeMasterwork(fixtureInput(pearl(), 11));
  const b = forgeNativeMasterwork(fixtureInput(pearl(), 11));
  assert.deepEqual(
    stableSelfEvaluationView(a.selected.selfEvaluation),
    stableSelfEvaluationView(b.selected.selfEvaluation),
  );
});
