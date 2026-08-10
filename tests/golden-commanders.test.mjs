import assert from "node:assert/strict";
import test from "node:test";
import {
  GOLDEN_SUITE_VERSION,
  listGoldenCommanders,
  evaluateGoldenRates,
  evaluateGoldenArchetypes,
  BRAIN_V1_FROZEN_RATES,
  GOLDEN_ARCHETYPE_WEAK_CEILINGS,
} from "./validation-harness/golden-commanders.mjs";

test("golden suite covers the Brain v1 canary archetypes", () => {
  const goldens = listGoldenCommanders();
  assert.equal(GOLDEN_SUITE_VERSION, "golden-commanders-v1");
  assert.equal(goldens.length, 13);
  const archetypes = new Set(goldens.map((entry) => entry.archetype));
  for (const archetype of Object.keys(GOLDEN_ARCHETYPE_WEAK_CEILINGS)) {
    assert.ok(archetypes.has(archetype), `missing golden archetype ${archetype}`);
  }
  assert.ok(goldens.every((entry) => entry.stresses.length > 0));
});

test("evaluateGoldenRates accepts frozen Brain v1 rates", () => {
  const result = evaluateGoldenRates(BRAIN_V1_FROZEN_RATES, { passRate: 1 });
  assert.equal(result.passed, true);
  assert.equal(result.violations.length, 0);
});

test("evaluateGoldenRates flags avoidable-weak and emergence collapse", () => {
  const avoidable = evaluateGoldenRates({
    ...BRAIN_V1_FROZEN_RATES,
    avoidable_weak_slots: 1.0,
  }, { passRate: 1 });
  assert.equal(avoidable.passed, false);
  assert.ok(avoidable.violations.some((entry) => entry.metric === "avoidable_weak_slots"));

  const emergence = evaluateGoldenRates({
    ...BRAIN_V1_FROZEN_RATES,
    beneficial_emergence: 8,
  }, { passRate: 1 });
  assert.equal(emergence.passed, false);
  assert.ok(emergence.violations.some((entry) => entry.metric === "beneficial_emergence"));
});

test("evaluateGoldenArchetypes flags blink ceiling breach and hard fails", () => {
  const ok = evaluateGoldenArchetypes({
    blink: { runs: 1, weakSlots: 6, hardFailureRuns: 0 },
    tokens: { runs: 1, weakSlots: 8, hardFailureRuns: 0 },
  });
  assert.equal(ok.passed, true);

  const bad = evaluateGoldenArchetypes({
    blink: { runs: 1, weakSlots: 9, hardFailureRuns: 0 },
    spellslinger: { runs: 1, weakSlots: 0, hardFailureRuns: 1 },
  });
  assert.equal(bad.passed, false);
  assert.ok(bad.violations.some((entry) => entry.metric === "archetype_weak:blink"));
  assert.ok(bad.violations.some((entry) => entry.metric === "archetype_hard:spellslinger"));
});
