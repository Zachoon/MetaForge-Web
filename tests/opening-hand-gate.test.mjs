import assert from "node:assert/strict";
import test from "node:test";
import { evaluateOpeningHandComparison } from "../app/forge-simulation.mjs";

const baseline = { keepableRate: .78, averageOpeningLands: 2.8, nextSpellRate: .61, fetchActivationRate: .32 };

test("rejects a proposal with material opening-hand regression", () => {
  const result = evaluateOpeningHandComparison(baseline, { ...baseline, keepableRate: .74, nextSpellRate: .58 });
  assert.equal(result.verdict, "reject");
  assert.match(result.guidance, /do not start/i);
});

test("advances a measurable improvement and labels a tie", () => {
  assert.equal(evaluateOpeningHandComparison(baseline, { ...baseline, keepableRate: .80 }).verdict, "advance");
  assert.equal(evaluateOpeningHandComparison(baseline, { ...baseline, keepableRate: .785 }).verdict, "inconclusive");
});
