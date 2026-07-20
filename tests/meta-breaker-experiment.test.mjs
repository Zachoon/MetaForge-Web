import test from "node:test";
import assert from "node:assert/strict";
import { applyControlledSwap, rankExperimentCuts } from "../app/meta-breaker-experiment.mjs";

test("ranks isolated nonland flex slots ahead of connected package cards", () => {
  const rows = [{ quantity: 1, name: "Commander" }, { quantity: 1, name: "Engine" }, { quantity: 1, name: "Payoff" }, { quantity: 1, name: "Loose Card" }, { quantity: 20, name: "Island" }];
  const graph = { isolated: ["Loose Card"], edges: [{ from: "Engine", to: "Payoff" }] };
  const ranked = rankExperimentCuts(rows, graph, { commanderName: "Commander", roleOf: (name) => name === "Island" ? "Mana source" : "Threat" });
  assert.equal(ranked[0].name, "Loose Card");
  assert.ok(!ranked.some((row) => row.name === "Commander" || row.name === "Island"));
});

test("applies a one-slot experiment without changing deck size", () => {
  const rows = [{ quantity: 4, name: "Flex" }, { quantity: 56, name: "Island" }];
  const next = applyControlledSwap(rows, "Flex", "Answer");
  assert.equal(next.reduce((sum, row) => sum + row.quantity, 0), 60);
  assert.deepEqual(next.find((row) => row.name === "Flex"), { quantity: 3, name: "Flex" });
  assert.deepEqual(next.find((row) => row.name === "Answer"), { quantity: 1, name: "Answer" });
});

test("refuses a no-op or missing cut", () => {
  assert.equal(applyControlledSwap([{ quantity: 1, name: "A" }], "A", "A"), null);
  assert.equal(applyControlledSwap([{ quantity: 1, name: "A" }], "Missing", "B"), null);
});
