import assert from "node:assert/strict";
import test from "node:test";

import { learnFromForgeInterventions } from "../app/forge-intervention-learning.mjs";

const matches = (revision, results) =>
  results.map((result, index) => ({
    id: `${revision}-${index}`,
    revision,
    result,
  }));

test("does not learn from one accepted change or an undersized sample", () => {
  const report = learnFromForgeInterventions(
    [{ id: "one", kind: "more interaction", decision: "accepted", revision: 2 }],
    [...matches(1, ["loss", "loss"]), ...matches(2, ["win", "win"])],
  );

  assert.equal(report.experiments[0].comparable, false);
  assert.equal(report.reusable.length, 0);
  assert.match(report.reusableGuidance, /earned reuse/i);
});

test("requires repeated controlled improvement before reusing a pattern", () => {
  const report = learnFromForgeInterventions(
    [
      { id: "one", kind: "more interaction", decision: "accepted", revision: 2 },
      { id: "two", kind: "more interaction", decision: "accepted", revision: 4 },
    ],
    [
      ...matches(1, ["loss", "loss", "loss", "win"]),
      ...matches(2, ["win", "win", "win", "loss"]),
      ...matches(3, ["loss", "loss", "win", "loss"]),
      ...matches(4, ["win", "win", "win", "loss"]),
    ],
  );

  assert.equal(report.patterns[0].promising, 2);
  assert.equal(report.patterns[0].reusable, true);
  assert.match(report.reusableGuidance, /more interaction/i);
});

test("records dismissals without treating them as performance evidence", () => {
  const report = learnFromForgeInterventions(
    [{ id: "no", kind: "lower curve", decision: "dismissed", revision: 2 }],
    [...matches(1, ["loss", "loss", "loss", "loss"]), ...matches(2, ["win", "win", "win", "win"])],
  );

  assert.equal(report.experiments[0].verdict, "player-declined");
  assert.equal(report.patterns[0].dismissed, 1);
  assert.equal(report.patterns[0].comparable, 0);
  assert.equal(report.reusable.length, 0);
});

test("returns deterministic immutable reports", () => {
  const input = [{ id: "one", kind: "resilience", decision: "accepted", revision: 2 }];
  const evidence = [...matches(1, ["loss", "loss", "loss", "win"]), ...matches(2, ["win", "win", "win", "loss"])];
  const first = learnFromForgeInterventions(input, evidence);
  const second = learnFromForgeInterventions(input, evidence);

  assert.deepEqual(first, second);
  assert.equal(Object.isFrozen(first), true);
  assert.equal(Object.isFrozen(first.experiments), true);
});
