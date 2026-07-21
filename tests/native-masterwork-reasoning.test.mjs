import assert from "node:assert/strict";
import test from "node:test";
import { explainNativeMasterworkDecision } from "../app/native-masterwork-reasoning.mjs";

const rows = (prefix) => [{ quantity: 24, name: "Island", roles: ["land"] }, ...Array.from({ length: 9 }, (_, index) => ({ quantity: 4, name: `${prefix} ${index}`, roles: ["draw", "interaction"] }))];
const candidates = [
  { id: "winner", label: "Resilient Temper", rows: rows("Winner") },
  { id: "rival", label: "Precision Temper", rows: rows("Rival") },
];
const tournament = {
  selectedId: "winner",
  similarities: [{ pair: ["winner", "rival"], similarity: 0.4 }],
  results: [
    { id: "winner", gate: { passed: true }, axes: { coverage: 85, curve: 80, flexibility: 70, cohesion: 75, resilience: 90 } },
    { id: "rival", gate: { passed: true }, axes: { coverage: 80, curve: 88, flexibility: 65, cohesion: 72, resilience: 75 } },
  ],
};

test("explains gains and tradeoffs against the closest viable rival", () => {
  const report = explainNativeMasterworkDecision(candidates, tournament);
  assert.equal(report.rivalId, "rival");
  assert.equal(report.gains[0].label, "structural resilience");
  assert.equal(report.tradeoffs[0].label, "curve health");
  assert.match(report.summary, /testing question/i);
});

test("keeps counterfactual claims bounded and immutable", () => {
  const report = explainNativeMasterworkDecision(candidates, tournament);
  assert.equal(Object.isFrozen(report), true);
  assert.match(report.boundary, /does not prove causation/i);
  assert.doesNotMatch(report.summary, /win rate|perfect deck/i);
});