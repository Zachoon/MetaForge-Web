import assert from "node:assert/strict";
import test from "node:test";
import {
  expandCorpus,
  buildValidationRecord,
  aggregateValidationRecords,
  compareToBaseline,
  suggestNextFocus,
  buildValidationReport,
  renderValidationReportMarkdown,
} from "../app/validation-harness.mjs";
import { TORTURE_FIXTURES, fixtureInput } from "./commander-torture-bench/fixtures.mjs";
import { forgeNativeMasterwork } from "../app/native-masterwork-engine.mjs";

test("expandCorpus is deterministic and respects limit", () => {
  const first = expandCorpus(TORTURE_FIXTURES.slice(0, 3), { seeds: [11, 13], limit: 4 });
  const second = expandCorpus(TORTURE_FIXTURES.slice(0, 3), { seeds: [11, 13], limit: 4 });
  assert.deepEqual(first, second);
  assert.equal(first.length, 4);
  assert.equal(first[0].runId, `${TORTURE_FIXTURES[0].id}::seed-11`);
  assert.equal(first[3].seed, 13);
});

test("buildValidationRecord captures SE and weak-slot forensics without mutating policy", () => {
  const fixture = TORTURE_FIXTURES.find((entry) => entry.id === "pearl-ear-auras");
  const caseSpec = {
    runId: "pearl-ear-auras::seed-11",
    fixtureId: fixture.id,
    archetype: fixture.archetype,
    seed: 11,
    fixture,
  };
  const report = forgeNativeMasterwork(fixtureInput(fixture, 11));
  const record = buildValidationRecord(caseSpec, report, null, 12);
  assert.equal(record.passed, true);
  assert.ok(record.selfEvaluation);
  assert.ok(record.weakSlotForensics);
  assert.equal(typeof record.weakSlotForensics.weakSlotCount, "number");
  assert.equal(record.cohesionPassed, true);
});

test("aggregate + report suggest evidence focus without inventing layers", () => {
  const records = [
    {
      runId: "a::1",
      fixtureId: "a",
      archetype: "aura_voltron",
      seed: 11,
      passed: true,
      hardFailures: [],
      warnings: [],
      failureClasses: [],
      runtimeMs: 10,
      selfEvaluation: {
        totalTracedPicks: 60,
        meaningfulDisagreements: 10,
        disagreementsByClass: { final_weak_justification: 4, unclassified: 20 },
        controlCaseCounts: {
          beneficial_emergence: 12,
          genuine_bad_belief: 2,
          invalidated_by_later_decisions: 5,
        },
        meanAbsDriftMagnitude: 40,
        phaseDistributionOfDrift: {},
        packageDistributionOfDrift: {},
      },
      weakSlotForensics: {
        weakSlotCount: 4,
        aggregate: {
          weakSlotCount: 4,
          avoidableCount: 1,
          constraintForcedCount: 3,
          causalClassCounts: { became_weak_downstream: 3, weak_at_selection: 1 },
          sourceCounts: { live_fill: 4 },
        },
        records: [
          { causalClass: "became_weak_downstream", source: "live_fill", constructionPhase: "foundation", avoidable: false, constraintForced: true, counterfactual: { candidateDepth: 1 } },
          { causalClass: "became_weak_downstream", source: "live_fill", constructionPhase: "foundation", avoidable: false, constraintForced: true, counterfactual: { candidateDepth: 0 } },
          { causalClass: "became_weak_downstream", source: "live_fill", constructionPhase: "development", avoidable: false, constraintForced: true, counterfactual: { candidateDepth: 2 } },
          { causalClass: "weak_at_selection", source: "live_fill", constructionPhase: "development", avoidable: true, constraintForced: false, counterfactual: { candidateDepth: 8 } },
        ],
      },
      weakSlotRepair: { applied: true, appliedCount: 2 },
      justification: { weaklyJustified: 4 },
      cohesionPassed: true,
    },
  ];

  const aggregate = aggregateValidationRecords(records);
  assert.equal(aggregate.runCount, 1);
  assert.equal(aggregate.controlMetrics.ledger_weak_slots, 4);
  assert.equal(aggregate.controlMetrics.avoidable_weak_slots, 1);
  assert.equal(aggregate.controlRates.ledger_weak_slots, 4);

  const baseline = {
    runCount: 13,
    controlMetrics: {
      hard_failure_runs: 0,
      ledger_weak_slots: 31,
      avoidable_weak_slots: 2,
      final_weak_justification: 18,
      later_package_oversupply: 33,
      genuine_bad_belief: 7,
      beneficial_emergence: 146,
      constraint_forced_weak_slots: 25,
      invalidated_by_later_decisions: 89,
      unclassified: 246,
    },
    controlRates: {
      hard_failure_runs: 0,
      ledger_weak_slots: 2.385,
      avoidable_weak_slots: 0.154,
      final_weak_justification: 1.385,
      later_package_oversupply: 2.538,
      genuine_bad_belief: 0.538,
      beneficial_emergence: 11.231,
      constraint_forced_weak_slots: 1.923,
      invalidated_by_later_decisions: 6.846,
      unclassified: 18.923,
    },
  };
  const comparison = compareToBaseline(aggregate, baseline);
  assert.equal(comparison.compared, true);
  assert.equal(comparison.normalized, true);

  const focus = suggestNextFocus({
    runCount: 104,
    controlMetrics: {
      hard_failure_runs: 0,
      avoidable_weak_slots: 16,
      final_weak_justification: 144,
      later_package_oversupply: 258,
      genuine_bad_belief: 56,
      constraint_forced_weak_slots: 200,
      unclassified: 1968,
      beneficial_emergence: 1169,
    },
    controlRates: {
      hard_failure_runs: 0,
      avoidable_weak_slots: 0.154,
      final_weak_justification: 1.385,
      later_package_oversupply: 2.481,
      genuine_bad_belief: 0.538,
      constraint_forced_weak_slots: 1.923,
      unclassified: 18.923,
      beneficial_emergence: 11.24,
    },
  });
  assert.equal(focus.primary.id, "pool_scarcity_and_real_corpora");

  const report = buildValidationReport(records, { mode: "smoke", baseline });
  const markdown = renderValidationReportMarkdown(report);
  assert.match(markdown, /MetaForge Validation Report/);
  assert.match(markdown, /Next focus/i);
  assert.match(markdown, /Architecture frozen/);
});

test("field vs smoke absolute totals are not false regressions when rate-normalized", () => {
  const smoke = {
    runCount: 13,
    controlMetrics: {
      hard_failure_runs: 0,
      ledger_weak_slots: 31,
      avoidable_weak_slots: 2,
      final_weak_justification: 18,
      later_package_oversupply: 33,
      genuine_bad_belief: 7,
      beneficial_emergence: 146,
    },
    controlRates: {
      hard_failure_runs: 0,
      ledger_weak_slots: 2.385,
      avoidable_weak_slots: 0.154,
      final_weak_justification: 1.385,
      later_package_oversupply: 2.538,
      genuine_bad_belief: 0.538,
      beneficial_emergence: 11.231,
    },
  };
  const field = {
    runCount: 104,
    controlMetrics: {
      hard_failure_runs: 0,
      ledger_weak_slots: 248,
      avoidable_weak_slots: 16,
      final_weak_justification: 144,
      later_package_oversupply: 258,
      genuine_bad_belief: 56,
      beneficial_emergence: 1169,
    },
    controlRates: {
      hard_failure_runs: 0,
      ledger_weak_slots: 2.385,
      avoidable_weak_slots: 0.154,
      final_weak_justification: 1.385,
      later_package_oversupply: 2.481,
      genuine_bad_belief: 0.538,
      beneficial_emergence: 11.24,
    },
  };
  const comparison = compareToBaseline(field, smoke);
  assert.equal(comparison.normalized, true);
  assert.equal(comparison.regressions.length, 0);
});

test("hard failures dominate suggested focus", () => {
  const focus = suggestNextFocus({
    controlMetrics: {
      hard_failure_runs: 2,
      avoidable_weak_slots: 50,
      final_weak_justification: 40,
    },
  });
  assert.equal(focus.primary.id, "hard_failures");
});
