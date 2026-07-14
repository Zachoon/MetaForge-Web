import assert from "node:assert/strict";
import test from "node:test";
import { getMetaIntelligence } from "../app/meta-intelligence.mjs";

test("refuses to infer a current majority from an insufficient sample", () => {
  const result = getMetaIntelligence();
  assert.equal(result.current.sampleSize, 3);
  assert.equal(result.majority, null);
  assert.equal(result.generatorGate, "historical-only");
  assert.match(result.warning, /not enough/i);
});

test("exposes the high-confidence historical strategic prior", () => {
  const result = getMetaIntelligence();
  assert.equal(result.historicalPrior.confidence, "high");
  assert.equal(result.historicalPrior.sampleSize, 1331);
  assert.ok(result.historicalPrior.strategies.length >= 3);
});
