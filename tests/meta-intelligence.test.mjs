import assert from "node:assert/strict";
import test from "node:test";
import { getMetaIntelligence } from "../app/meta-intelligence.mjs";

test("uses a fresh high-coverage field without inventing a majority", () => {
  const result = getMetaIntelligence({ now: "2026-07-18T12:00:00Z" });
  assert.equal(result.current.sampleSize, 999);
  assert.equal(result.current.confidence, "high");
  assert.ok(result.current.classificationCoverage >= 0.75);
  assert.equal(result.majority, null);
  assert.equal(result.leadingStrategy, "Midrange");
  assert.equal(result.generatorGate, "fresh-field-open");
  assert.match(result.warning, /plurality/i);
  assert.equal(result.generatorTargetBasis, "fresh-current-plurality");
  assert.match(result.current.provenance.url, /^https:/);
});

test("closes current-field generation when the observed snapshot becomes stale", () => {
  const result = getMetaIntelligence({ now: "2026-08-20T12:00:00Z" });
  assert.equal(result.readyForCurrentFieldUse, false);
  assert.equal(result.generatorGate, "historical-only");
  assert.equal(result.leadingStrategy, null);
  assert.equal(result.current.freshness, "stale");
});

test("exposes the high-confidence historical strategic prior", () => {
  const result = getMetaIntelligence();
  assert.equal(result.historicalPrior.confidence, "high");
  assert.equal(result.historicalPrior.sampleSize, 1331);
  assert.ok(result.historicalPrior.strategies.length >= 3);
});

test("derives a response from measured historical transitions", () => {
  const result = getMetaIntelligence();
  assert.equal(result.historicalTransitions.analogCount, 4);
  assert.equal(result.historicalTransitions.favoredResponse, "Control");
  assert.equal(result.historicalTransitions.confidence, "moderate");
});
