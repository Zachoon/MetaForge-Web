import assert from "node:assert/strict";
import test from "node:test";
import { evaluateExperiment } from "../app/experiment-evidence.mjs";

const matches = (wins, losses) => [...Array(wins)].map((_, id) => ({ id: `w${id}`, result: "win" })).concat([...Array(losses)].map((_, id) => ({ id: `l${id}`, result: "loss" })));

test("does not overreact to an early losing record", () => {
  const result = evaluateExperiment(matches(1, 2));
  assert.equal(result.decision, "continue");
  assert.equal(result.confidence, "early signal");
});

test("challenges a strategy only when its interval is below break-even", () => {
  const result = evaluateExperiment(matches(1, 11));
  assert.equal(result.decision, "challenge");
  assert.ok(result.interval[1] < .5);
});

test("supports a strategy only after a meaningful positive sample", () => {
  const result = evaluateExperiment(matches(18, 2));
  assert.equal(result.decision, "support");
  assert.ok(result.interval[0] > .5);
});
