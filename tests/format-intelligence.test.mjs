import assert from "node:assert/strict";
import test from "node:test";
import { buildFormatContext, evaluateTheoryEvidence } from "../app/format-intelligence.mjs";

test("Commander theory requires pod intent and commander resilience", () => {
  const incomplete = buildFormatContext("Commander", {});
  assert.equal(incomplete.complete, false);
  const context = buildFormatContext("Commander", { power: "high-power", budget: "300" });
  const result = evaluateTheoryEvidence({ legal: true, copyLimitsPass: true, roleFit: true, supportCount: 8, minimumSupport: 6, commanderDependent: true, commanderRecovery: false }, context);
  assert.equal(result.eligible, false);
  assert.match(result.failures.join(" "), /commander is removed/i);
});

test("Modern theory must pass the early interaction gate", () => {
  const result = evaluateTheoryEvidence({ legal: true, copyLimitsPass: true, roleFit: true, supportCount: 8, minimumSupport: 6, earlyInteraction: false }, buildFormatContext("Modern"));
  assert.equal(result.eligible, false);
  assert.match(result.failures.join(" "), /early-interaction/i);
});

test("theory evidence advances only through named stages", () => {
  const theory = { legal: true, copyLimitsPass: true, roleFit: true, supportCount: 8, minimumSupport: 6, earlyInteraction: true };
  assert.equal(evaluateTheoryEvidence(theory, buildFormatContext("Modern"), {}).stage, "design-supported");
  assert.equal(evaluateTheoryEvidence(theory, buildFormatContext("Modern"), { simulationPass: true }).stage, "simulation-qualified");
  assert.equal(evaluateTheoryEvidence(theory, buildFormatContext("Modern"), { personalMatches: 12 }).stage, "personally-validated");
  assert.equal(evaluateTheoryEvidence(theory, buildFormatContext("Modern"), { fieldMatches: 30 }).stage, "field-validated");
});
