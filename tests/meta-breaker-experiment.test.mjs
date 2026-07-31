import test from "node:test";
import assert from "node:assert/strict";
import { applyControlledSwap, experimentAdditionSynergy, rankExperimentAdditions, rankExperimentCuts } from "../app/meta-breaker-experiment.mjs";

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

test("counts a real deck connection in either direction", () => {
  const producesGraph = { nodes: [{ name: "Existing Producer", mechanics: { produces: ["tokens"], rewards: [] } }] };
  assert.equal(experimentAdditionSynergy({ name: "Reward", type_line: "Sorcery", oracle_text: "Tokens you control get +1/+1." }, producesGraph), 1);

  const rewardsGraph = { nodes: [{ name: "Existing Payoff", mechanics: { produces: [], rewards: ["tokens"] } }] };
  assert.equal(experimentAdditionSynergy({ name: "Maker", type_line: "Sorcery", oracle_text: "Create a 1/1 white Soldier creature token." }, rewardsGraph), 1);

  const unrelatedGraph = { nodes: [{ name: "Unrelated", mechanics: { produces: ["lifegain"], rewards: ["combat"] } }] };
  assert.equal(experimentAdditionSynergy({ name: "Vanilla", type_line: "Sorcery", oracle_text: "Nothing happens." }, unrelatedGraph), 0);
});

test("credits a candidate an existing trigger amplifier would reach, even with no ordinary producer/payoff connection", () => {
  const graph = {
    nodes: [],
    amplifiers: [{ source: "Panharmonicon", signal: "etb", side: "rewards", amplifies: [] }],
  };
  const caught = { name: "Soul Warden", type_line: "Creature", oracle_text: "Whenever another creature enters the battlefield under your control, you gain 1 life." };
  const unrelated = { name: "Vanilla", type_line: "Sorcery", oracle_text: "Nothing happens." };
  assert.equal(experimentAdditionSynergy(caught, graph), 1);
  assert.equal(experimentAdditionSynergy(unrelated, graph), 0);
});

test("ranks a candidate that connects to the existing deck ahead of one that doesn't", () => {
  const graph = { nodes: [{ name: "Token Maker", mechanics: { produces: ["tokens"], rewards: [] } }] };
  const connected = { name: "Token Reward", type_line: "Sorcery", oracle_text: "Tokens you control get +1/+1." };
  const unrelated = { name: "Vanilla", type_line: "Sorcery", oracle_text: "Nothing happens." };
  const ranked = rankExperimentAdditions([unrelated, connected], graph);
  assert.deepEqual(ranked.map((card) => card.name), ["Token Reward", "Vanilla"]);
});

test("keeps Scryfall's original popularity order among equally-synergistic candidates", () => {
  const graph = { nodes: [] };
  const a = { name: "A", type_line: "Sorcery", oracle_text: "Nothing happens." };
  const b = { name: "B", type_line: "Sorcery", oracle_text: "Nothing happens either." };
  assert.deepEqual(rankExperimentAdditions([a, b], graph).map((card) => card.name), ["A", "B"]);
});
