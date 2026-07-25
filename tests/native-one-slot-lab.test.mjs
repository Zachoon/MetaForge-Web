import assert from "node:assert/strict";
import test from "node:test";
import { runOneSlotCounterfactualLab, rankOneSlotCounterfactuals } from "../app/native-one-slot-lab.mjs";

const base = [
  { quantity: 24, name: "Island", roles: ["land"], cmc: 0 },
  { quantity: 4, name: "Slow Threat", roles: ["threat"], cmc: 6 },
  { quantity: 4, name: "Draw", roles: ["draw"], cmc: 3 },
  { quantity: 4, name: "Answer", roles: ["interaction"], cmc: 2 },
  { quantity: 4, name: "Ramp", roles: ["ramp"], cmc: 2 },
  { quantity: 4, name: "Shield", roles: ["protection"], cmc: 2 },
  { quantity: 4, name: "Return", roles: ["recursion"], cmc: 3 },
  { quantity: 4, name: "Sweep", roles: ["sweeper"], cmc: 4 },
  { quantity: 4, name: "Body", roles: ["threat"], cmc: 3 },
  { quantity: 4, name: "Second Body", roles: ["threat"], cmc: 3 },
];
const improved = base.map((row) => ({ ...row, roles: [...row.roles] }));
improved.find((row) => row.name === "Slow Threat").quantity = 3;
improved.push({ quantity: 1, name: "Flexible Answer", roles: ["draw", "interaction", "protection"], cmc: 2 });
const selected = { id: "selected", rows: base };
const rival = { id: "rival", rows: improved };
const options = { format: "Standard", strategy: "Balanced midrange", target: 60 };

test("advances an exact one-slot improvement deterministically", () => {
  const first = runOneSlotCounterfactualLab(selected, [selected, rival], { rivalId: "rival" }, options);
  const second = runOneSlotCounterfactualLab(selected, [selected, rival], { rivalId: "rival" }, options);
  assert.deepEqual(first, second);
  assert.equal(first.verdict, "advance");
  assert.equal(first.experiment.cut, "Slow Threat");
  assert.equal(first.experiment.add, "Flexible Answer");
  assert.equal(first.experiment.rows.reduce((sum, row) => sum + row.quantity, 0), 60);
  assert.equal(first.experiment.gate.openingHand.verdict, "preserved");
});

test("holds the list when a swap damages a structural floor", () => {
  const bad = base.map((row) => ({ ...row, roles: [...row.roles] }));
  bad.find((row) => row.name === "Answer").quantity = 3;
  bad.push({ quantity: 1, name: "Vanilla Giant", roles: ["threat"], cmc: 8 });
  const report = runOneSlotCounterfactualLab(selected, [selected, { id: "bad", rows: bad }], { rivalId: "bad" }, options);
  assert.equal(report.verdict, "inconclusive");
  assert.match(report.summary, /none cleared every structural gate/i);
});

test("refuses to invent an experiment without a viable rival", () => {
  const report = runOneSlotCounterfactualLab(selected, [selected], { rivalId: null }, options);
  assert.equal(report.experimentsTested, 0);
  assert.equal(report.experiment, null);
  assert.match(report.boundary, /instead of inventing/i);
});

test("keeps claims bounded to a controlled revision", () => {
  const report = runOneSlotCounterfactualLab(selected, [selected, rival], { rivalId: "rival" }, options);
  assert.match(report.contract, /observed match evidence/i);
  assert.match(report.boundary, /not proof/i);
  assert.doesNotMatch(report.summary, /win rate|perfect/i);
});

const multiSwapBase = base.map((row) => ({ ...row, roles: [...row.roles] }));
multiSwapBase.find((row) => row.name === "Draw").name = "Weak Draw";
multiSwapBase.find((row) => row.name === "Answer").name = "Weak Interaction";
const multiSwapRival = multiSwapBase.map((row) => ({ ...row, roles: [...row.roles] }));
multiSwapRival.find((row) => row.name === "Slow Threat").quantity = 3;
multiSwapRival.find((row) => row.name === "Weak Draw").quantity = 3;
multiSwapRival.find((row) => row.name === "Weak Interaction").quantity = 3;
multiSwapRival.push({ quantity: 1, name: "Flexible Draw", roles: ["draw", "interaction"], cmc: 2 });
const multiSwapSelected = { id: "selected", rows: multiSwapBase };
const multiSwapRivalCandidate = { id: "rival", rows: multiSwapRival };

test("ranks up to three distinct-cut passing experiments", () => {
  const report = rankOneSlotCounterfactuals(multiSwapSelected, [multiSwapSelected, multiSwapRivalCandidate], options);
  assert.equal(report.verdict, "advance");
  assert.equal(report.experiments.length, 3);
  const cuts = report.experiments.map((experiment) => experiment.cut);
  assert.equal(new Set(cuts).size, 3, "every tablet should name a different card to cut");
  for (const experiment of report.experiments) {
    assert.equal(experiment.gate.passed, true);
    assert.match(experiment.contract, /observed match evidence/i);
  }
});

test("rankOneSlotCounterfactuals refuses to invent an experiment without a viable rival", () => {
  const report = rankOneSlotCounterfactuals(selected, [selected], options);
  assert.equal(report.experimentsTested, 0);
  assert.deepEqual(report.experiments, []);
  assert.match(report.boundary, /instead of inventing/i);
});

test("rankOneSlotCounterfactuals holds the list when nothing clears the structural gates", () => {
  const bad = base.map((row) => ({ ...row, roles: [...row.roles] }));
  bad.find((row) => row.name === "Answer").quantity = 3;
  bad.push({ quantity: 1, name: "Vanilla Giant", roles: ["threat"], cmc: 8 });
  const report = rankOneSlotCounterfactuals(selected, [selected, { id: "bad", rows: bad }], options);
  assert.equal(report.verdict, "inconclusive");
  assert.deepEqual(report.experiments, []);
});

const rivalARows = base.map((row) => ({ ...row, roles: [...row.roles] }));
rivalARows.find((row) => row.name === "Slow Threat").quantity = 3;
rivalARows.push({ quantity: 1, name: "Flexible Answer", roles: ["draw", "interaction", "protection"], cmc: 2 });
const rivalBRows = base.map((row) => ({ ...row, roles: [...row.roles] }));
rivalBRows.find((row) => row.name === "Draw").quantity = 3;
rivalBRows.push({ quantity: 1, name: "Flexible Card Draw", roles: ["draw", "interaction"], cmc: 2 });
const rivalA = { id: "rivalA", rows: rivalARows };
const rivalB = { id: "rivalB", rows: rivalBRows };

test("pools distinct experiments across every candidate, not just one designated rival", () => {
  const singleRival = rankOneSlotCounterfactuals(selected, [selected, rivalA], options);
  assert.equal(singleRival.experiments.length, 1, "a single close rival only ever offers one honest swap here");

  const allRivals = rankOneSlotCounterfactuals(selected, [selected, rivalA, rivalB], options);
  assert.equal(allRivals.experiments.length, 2);
  const cuts = allRivals.experiments.map((experiment) => experiment.cut).sort();
  assert.deepEqual(cuts, ["Draw", "Slow Threat"]);
});