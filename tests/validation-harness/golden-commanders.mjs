// =============================================================================
// Golden Commander Suite (Brain v1 canaries)
// =============================================================================
// Not "best commanders" — a fixed set that collectively stress reasoning systems.
// Expected rates come from brain-v1-frozen-benchmark.json (seed-stable).
// Failures here block brain changes. Harness may grow; expectations stay tight.
// =============================================================================

import { TORTURE_FIXTURES } from "../commander-torture-bench/fixtures.mjs";

export const GOLDEN_SUITE_VERSION = "golden-commanders-v1";

/**
 * Per-forge rates from the frozen 104-forge field benchmark.
 * Absolute totals are not used for pass/fail — rates are.
 */
export const BRAIN_V1_FROZEN_RATES = Object.freeze({
  hard_failure_runs: 0,
  pass_rate: 1,
  ledger_weak_slots: 2.385,
  avoidable_weak_slots: 0.154,
  constraint_forced_weak_slots: 1.923,
  final_weak_justification: 1.385,
  later_package_oversupply: 2.481,
  genuine_bad_belief: 0.538,
  beneficial_emergence: 11.24,
  unclassified: 18.923,
});

/**
 * Allowed drift vs frozen rates before a golden run is considered a regression.
 * Tight on hard fails / avoidable weak / pass rate; looser on unclassified.
 */
export const GOLDEN_TOLERANCES = Object.freeze({
  hard_failure_runs: 0,
  pass_rate: 0,
  avoidable_weak_slots: 0.05,
  ledger_weak_slots: 0.25,
  final_weak_justification: 0.25,
  later_package_oversupply: 0.35,
  genuine_bad_belief: 0.15,
  beneficial_emergence_min: 10.5, // must not collapse below this per forge
  constraint_forced_weak_slots: 0.35,
  unclassified: 2.0,
  mean_runtime_ms_max_multiplier: 1.75,
});

/**
 * Archetype weak-slot totals observed per seed in the frozen field run
 * (identical across all 8 seeds). Used as canary ceilings for single-seed golden.
 */
export const GOLDEN_ARCHETYPE_WEAK_CEILINGS = Object.freeze({
  aura_voltron: 0,
  equipment_voltron: 4,
  typal: 0,
  tokens: 8,
  aristocrats: 2,
  reanimator: 2,
  spellslinger: 0,
  landfall: 2,
  blink: 6,
  artifacts: 0,
  stax: 0,
  combo: 7,
  multi_direction: 0,
});

/**
 * Brain v1 golden canaries = torture fixtures (13).
 * Future expansion adds real commanders without changing the report contract.
 */
export function listGoldenCommanders() {
  return TORTURE_FIXTURES.map((fixture) => Object.freeze({
    id: fixture.id,
    archetype: fixture.archetype,
    why: fixture.why,
    stresses: inferStressTags(fixture),
    fixture,
  }));
}

function inferStressTags(fixture) {
  const tags = new Set([fixture.archetype]);
  if (fixture.commanderRole) tags.add(fixture.commanderRole);
  if (/aura|equipment|voltron/i.test(fixture.archetype)) tags.add("voltron");
  if (/token|aristocrat|reanimator|spell|landfall|blink|artifact|stax|combo|typal/i.test(fixture.archetype)) {
    tags.add("package_identity");
  }
  if (/multi/i.test(fixture.archetype)) tags.add("plan_competition");
  return Object.freeze([...tags].sort());
}

/**
 * Evaluate golden rates against frozen Brain v1 expectations.
 * Returns { passed, violations[] }.
 */
export function evaluateGoldenRates(controlRates = {}, options = {}) {
  const tolerances = { ...GOLDEN_TOLERANCES, ...(options.tolerances || {}) };
  const frozen = { ...BRAIN_V1_FROZEN_RATES, ...(options.frozenRates || {}) };
  const violations = [];

  const checkMax = (key, actual, ceiling, label) => {
    if (actual == null) return;
    if (actual > ceiling + 1e-9) {
      violations.push({
        metric: key,
        actual,
        expectedMax: ceiling,
        note: label || `${key} exceeded golden ceiling`,
      });
    }
  };

  const checkMin = (key, actual, floor, label) => {
    if (actual == null) return;
    if (actual + 1e-9 < floor) {
      violations.push({
        metric: key,
        actual,
        expectedMin: floor,
        note: label || `${key} collapsed below golden floor`,
      });
    }
  };

  checkMax("hard_failure_runs", controlRates.hard_failure_runs, frozen.hard_failure_runs + tolerances.hard_failure_runs);
  checkMin("pass_rate", options.passRate, frozen.pass_rate - tolerances.pass_rate, "pass rate regressed");
  checkMax("avoidable_weak_slots", controlRates.avoidable_weak_slots, frozen.avoidable_weak_slots + tolerances.avoidable_weak_slots);
  checkMax("ledger_weak_slots", controlRates.ledger_weak_slots, frozen.ledger_weak_slots + tolerances.ledger_weak_slots);
  checkMax("final_weak_justification", controlRates.final_weak_justification, frozen.final_weak_justification + tolerances.final_weak_justification);
  checkMax("later_package_oversupply", controlRates.later_package_oversupply, frozen.later_package_oversupply + tolerances.later_package_oversupply);
  checkMax("genuine_bad_belief", controlRates.genuine_bad_belief, frozen.genuine_bad_belief + tolerances.genuine_bad_belief);
  checkMin("beneficial_emergence", controlRates.beneficial_emergence, tolerances.beneficial_emergence_min);
  checkMax("constraint_forced_weak_slots", controlRates.constraint_forced_weak_slots, frozen.constraint_forced_weak_slots + tolerances.constraint_forced_weak_slots);
  checkMax("unclassified", controlRates.unclassified, frozen.unclassified + tolerances.unclassified);

  if (Number.isFinite(options.meanRuntimeMs) && Number.isFinite(options.baselineMeanRuntimeMs)) {
    const maxRuntime = options.baselineMeanRuntimeMs * tolerances.mean_runtime_ms_max_multiplier;
    if (options.meanRuntimeMs > maxRuntime) {
      violations.push({
        metric: "mean_runtime_ms",
        actual: options.meanRuntimeMs,
        expectedMax: maxRuntime,
        note: "mean runtime exceeded golden multiplier vs frozen benchmark",
      });
    }
  }

  return Object.freeze({
    passed: violations.length === 0,
    violations: Object.freeze(violations),
  });
}

/**
 * Per-archetype canary: weak-slot count must not exceed frozen ceiling.
 */
export function evaluateGoldenArchetypes(byArchetype = {}) {
  const violations = [];
  for (const [archetype, ceiling] of Object.entries(GOLDEN_ARCHETYPE_WEAK_CEILINGS)) {
    const stats = byArchetype[archetype];
    if (!stats) continue;
    const perRun = stats.runs ? stats.weakSlots / stats.runs : stats.weakSlots;
    if (perRun > ceiling + 1e-9) {
      violations.push({
        metric: `archetype_weak:${archetype}`,
        actual: perRun,
        expectedMax: ceiling,
        note: `${archetype} weak slots per run exceeded golden ceiling`,
      });
    }
    if (stats.hardFailureRuns > 0) {
      violations.push({
        metric: `archetype_hard:${archetype}`,
        actual: stats.hardFailureRuns,
        expectedMax: 0,
        note: `${archetype} produced hard-failure runs`,
      });
    }
  }
  return Object.freeze({
    passed: violations.length === 0,
    violations: Object.freeze(violations),
  });
}
