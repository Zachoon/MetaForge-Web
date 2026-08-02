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

const cohesionBase = base.map((row) => ({ ...row, roles: [...row.roles] }));
cohesionBase.find((row) => row.name === "Answer").mechanics = { produces: ["tokens"], rewards: [] };
const cohesionRival = cohesionBase.map((row) => ({ ...row, roles: [...row.roles] }));
cohesionRival.find((row) => row.name === "Slow Threat").quantity = 3;
cohesionRival.push({ quantity: 1, name: "Token Payoff", roles: ["draw"], cmc: 2, mechanics: { produces: [], rewards: ["tokens"] } });

test("credits a swap that connects to an existing producer with a cohesion gain", () => {
  const report = runOneSlotCounterfactualLab(
    { id: "selected", rows: cohesionBase },
    [{ id: "selected", rows: cohesionBase }, { id: "rival", rows: cohesionRival }],
    { rivalId: "rival" },
    options,
  );
  assert.equal(report.verdict, "advance");
  assert.equal(report.experiment.add, "Token Payoff");
  // Both the new payoff and the pre-existing producer it connects to should
  // flip to "connected", not just the one card that was added.
  assert.ok(report.experiment.after.cohesion > report.experiment.before.cohesion);
  assert.equal(report.experiment.before.cohesion, 0);
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

test("rankOneSlotCounterfactuals exposes the exact resulting row list for each experiment, not just its summary", () => {
  const report = rankOneSlotCounterfactuals(selected, [selected, rival], options);
  const [experiment] = report.experiments;
  assert.ok(Array.isArray(experiment.rows));
  assert.equal(experiment.rows.reduce((sum, row) => sum + row.quantity, 0), 60);
  assert.ok(experiment.rows.some((row) => row.name === experiment.add));
  assert.ok(!experiment.rows.some((row) => row.name === experiment.cut) || experiment.rows.find((row) => row.name === experiment.cut).quantity < base.find((row) => row.name === experiment.cut).quantity);
});

test("rankOneSlotCounterfactuals refuses to invent an experiment without a viable rival", () => {
  const report = rankOneSlotCounterfactuals(selected, [selected], options);
  assert.equal(report.experimentsTested, 0);
  assert.deepEqual(report.experiments, []);
  assert.match(report.boundary, /instead of inventing/i);
});

test("rankOneSlotCounterfactuals backfills with the next-best speculative swap instead of going silent", () => {
  // A build that has run out of confident upgrades should still offer its
  // next-best considered change, honestly marked as not having cleared the
  // gate — never a wall of silence just because nothing is a slam dunk.
  const bad = base.map((row) => ({ ...row, roles: [...row.roles] }));
  bad.find((row) => row.name === "Answer").quantity = 3;
  bad.push({ quantity: 1, name: "Vanilla Giant", roles: ["threat"], cmc: 8 });
  const report = rankOneSlotCounterfactuals(selected, [selected, { id: "bad", rows: bad }], options);
  assert.equal(report.verdict, "advance");
  assert.equal(report.experiments.length, 1);
  assert.equal(report.experiments[0].confident, false);
  assert.equal(report.experiments[0].cut, "Answer");
  assert.match(report.experiments[0].summary, /speculative/i);
  // A live production deck hit exactly this shape — "advance" with fewer
  // than 3 experiments — and buildExperimentTablets' confidence-tablet
  // fallback reads this top-level summary unconditionally, rendering
  // "undefined ..." when it was missing. Every verdict branch must set it.
  assert.equal(typeof report.summary, "string");
  assert.ok(report.summary.length > 0);
});

test("rankOneSlotCounterfactuals reports truly nothing only when no distinct candidate pair exists at all", () => {
  const identicalRival = { id: "identical", rows: base.map((row) => ({ ...row, roles: [...row.roles] })) };
  const report = rankOneSlotCounterfactuals(selected, [selected, identicalRival], options);
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

test("scales the minimum meaningful score gain to the deck's real size instead of a flat bar", () => {
  const makeDeck = (nonlandCount, landCount) => {
    const rows = [{ quantity: landCount, name: "Island", roles: ["land"], cmc: 0 }];
    for (let i = 0; i < nonlandCount; i++) rows.push({ quantity: 1, name: `Card ${i}`, roles: ["threat"], cmc: 3 });
    return rows;
  };
  const upgrade = (rows) => {
    const next = rows.map((row) => ({ ...row, roles: [...row.roles] }));
    next.find((row) => row.name === "Card 0").quantity = 0;
    next.push({ quantity: 1, name: "Better Interaction", roles: ["interaction", "protection"], cmc: 3 });
    return next.filter((row) => row.quantity > 0);
  };
  const standardBase = makeDeck(36, 24);
  const standardRival = upgrade(standardBase);
  const standardReport = runOneSlotCounterfactualLab(
    { id: "selected", rows: standardBase },
    [{ id: "selected", rows: standardBase }, { id: "rival", rows: standardRival }],
    { rivalId: "rival" },
    { format: "Standard", strategy: "Balanced midrange", target: 60 },
  );

  const commanderBase = makeDeck(63, 36).concat([{ quantity: 1, name: "Cmdr", roles: ["commander"], cmc: 3 }]);
  const commanderRival = upgrade(commanderBase);
  const commanderReport = runOneSlotCounterfactualLab(
    { id: "selected", rows: commanderBase },
    [{ id: "selected", rows: commanderBase }, { id: "rival", rows: commanderRival }],
    { rivalId: "rival" },
    { format: "Commander", strategy: "Balanced midrange", target: 100 },
  );

  // The identical relative upgrade scores meaningfully lower in the larger
  // deck (the score formula is normalized by nonland count) — proving the
  // dilution effect this fix compensates for is real.
  assert.ok(commanderReport.experiment.delta.score < standardReport.experiment.delta.score * 0.75);
  // Both still clear their (now deck-size-scaled) gate — the fix widens the
  // floor for large decks without inventing a pass where nothing real exists.
  assert.equal(standardReport.verdict, "advance");
  assert.equal(commanderReport.verdict, "advance");
});

const matchupBaseA = base.map((row) => ({ ...row, roles: [...row.roles] }));
matchupBaseA.find((row) => row.name === "Slow Threat").quantity = 3;
matchupBaseA.push({ quantity: 1, name: "Better Generalist", roles: ["draw", "protection"], cmc: 2 });
const matchupBaseB = base.map((row) => ({ ...row, roles: [...row.roles] }));
matchupBaseB.find((row) => row.name === "Slow Threat").quantity = 3;
matchupBaseB.push({ quantity: 1, name: "Matching Interaction", roles: ["interaction"], cmc: 2 });
const matchupRivalGeneralist = { id: "generalist", rows: matchupBaseA };
const matchupRivalMatching = { id: "matching", rows: matchupBaseB };

test("without a matchup preference, the broader structural upgrade wins the same cut", () => {
  const report = rankOneSlotCounterfactuals(selected, [selected, matchupRivalGeneralist, matchupRivalMatching], options);
  assert.equal(report.experiments[0].add, "Better Generalist");
  assert.equal(report.experiments[0].matchupRelevant, false);
});

test("a recorded matchup weakness reorders the recommendation toward the role that actually addresses it", () => {
  const report = rankOneSlotCounterfactuals(
    selected,
    [selected, matchupRivalGeneralist, matchupRivalMatching],
    { ...options, preferredRoles: ["interaction"], matchupOpponent: "Aggro" },
  );
  assert.equal(report.experiments[0].add, "Matching Interaction");
  assert.equal(report.experiments[0].matchupRelevant, true);
  assert.match(report.experiments[0].summary, /losing to against Aggro/i);
});

test("pools distinct experiments across every candidate, not just one designated rival", () => {
  const singleRival = rankOneSlotCounterfactuals(selected, [selected, rivalA], options);
  assert.equal(singleRival.experiments.length, 1, "a single close rival only ever offers one honest swap here");

  const allRivals = rankOneSlotCounterfactuals(selected, [selected, rivalA, rivalB], options);
  assert.equal(allRivals.experiments.length, 2);
  const cuts = allRivals.experiments.map((experiment) => experiment.cut).sort();
  assert.deepEqual(cuts, ["Draw", "Slow Threat"]);
});

// excludedCards is the one-slot lab's future-proofing hook for the
// (not-yet-built) multi-slot cut-and-refill feature: a player-declared
// "never suggest this again" list. One-slot swaps only ever add a single
// copy, so a flat name list is enough today — a name is either excluded
// or it isn't. Cutting an already-excluded card that's already in the
// deck is unaffected; only proposing it as a new addition is blocked.
test("excludedCards filters an otherwise-winning addition out of the ranking entirely", () => {
  const withoutExclusion = rankOneSlotCounterfactuals(selected, [selected, rival], options);
  assert.equal(withoutExclusion.experiments[0].add, "Flexible Answer");

  const withExclusion = rankOneSlotCounterfactuals(selected, [selected, rival], { ...options, excludedCards: ["Flexible Answer"] });
  assert.deepEqual(withExclusion.experiments, []);
  assert.equal(withExclusion.verdict, "inconclusive");
});

test("excludedCards only blocks the excluded card from being added, not from remaining as a cut candidate", () => {
  // multiSwapRival's only addition is Flexible Draw; excluding a
  // different, unrelated name should change nothing.
  const report = rankOneSlotCounterfactuals(multiSwapSelected, [multiSwapSelected, multiSwapRivalCandidate], {
    ...options,
    excludedCards: ["Some Unrelated Card"],
  });
  assert.equal(report.verdict, "advance");
  assert.equal(report.experiments.length, 3);
});

test("excludedCards compares names case- and accent-insensitively, matching every other name comparison in this module", () => {
  const report = rankOneSlotCounterfactuals(selected, [selected, rival], { ...options, excludedCards: ["  flexible ANSWER  "] });
  assert.deepEqual(report.experiments, []);
});