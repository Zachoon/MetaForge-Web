import assert from "node:assert/strict";
import test from "node:test";
import {
  auditBudgetSubstitutions,
  classifyNativeCard,
  collectRepairExcludedNames,
  colorPipsFromCost,
  repairBudgetOffenders,
  repairForbidsPowerSignals,
  repairPowerOffenders,
} from "../app/native-masterwork-engine.mjs";

// Strategic intent leak class: an earlier stage excludes or constrains a
// card, then a later repair/rebuild recreates eligibility and reintroduces
// it. These fixtures prove the shared exclusion contract holds in both
// directions and that Casual budget repair cannot smuggle power-signal
// cards back into the deck.

const commander = {
  name: "Ayula, Queen Among Bears",
  colors: ["G"],
  oracleText: "Whenever Ayula, Queen Among Bears or another Bear you control enters, you may have target Bear you control fight another target creature.",
  typeLine: "Legendary Creature — Bear",
  manaCost: "{1}{G}",
};

const gCard = (name, oracleText, cmc, priceUsd, typeLine = "Creature — Bear") => ({
  name,
  oracleText,
  typeLine,
  manaCost: `{${Math.max(0, cmc - 1)}}{G}`,
  cmc,
  colorIdentity: ["G"],
  priceUsd,
});

const buildRow = (card, quantity = 1) => ({
  quantity,
  name: card.name,
  roles: classifyNativeCard(card),
  cmc: card.cmc,
  colorPips: colorPipsFromCost(card.manaCost),
});

const ROLE_TARGETS = { ramp: 10, draw: 10, interaction: 10, protection: 5, recursion: 4, sweeper: 2 };
function evaluationOf(rows) {
  const roleCounts = new Map();
  for (const row of rows) for (const role of row.roles || []) roleCounts.set(role, (roleCounts.get(role) || 0) + row.quantity);
  const roleCoverage = Object.entries(ROLE_TARGETS).reduce((sum, [role, target]) => sum + Math.min(1, (roleCounts.get(role) || 0) / target), 0) / 6;
  const nonlands = rows.filter((row) => !row.roles.includes("land"));
  const avgCmc = nonlands.reduce((sum, row) => sum + row.cmc * row.quantity, 0) / Math.max(1, nonlands.reduce((sum, row) => sum + row.quantity, 0));
  const curveHealth = Math.min(100, Math.max(0, 100 - Math.abs(avgCmc - 3) * 24));
  return { score: roleCoverage * 39 + curveHealth * 0.19, roleCoverage: Number(roleCoverage.toFixed(3)), curveHealth: Math.round(curveHealth) };
}

const filler = [
  ...Array.from({ length: 12 }, (_, i) => gCard(`Flow ${i}`, "When this enters, draw a card.", 3, 0.2)),
  ...Array.from({ length: 12 }, (_, i) => gCard(`Answer ${i}`, "Exile target nonland permanent.", 3, 0.2)),
  ...Array.from({ length: 10 }, (_, i) => gCard(`Stone ${i}`, "Add one mana. Create a Treasure token.", 2, 0.2, "Artifact")),
  ...Array.from({ length: 6 }, (_, i) => gCard(`Ward ${i}`, "Target creature gains hexproof and indestructible until end of turn.", 2, 0.2)),
];

const luxuryOffender = gCard("Test Premium Softbear", "Nothing happens.", 3, 40);
const powerCutCard = gCard(
  "Test Forbidden Grand Engine",
  "Whenever you cast a creature spell, draw a card.",
  3,
  1.5,
);
const safeCheap = gCard("Test Safe Cub", "When this enters, draw a card.", 3, 0.05);
const safeCheap2 = gCard("Test Safe Cub Two", "When this enters, draw a card. Scry 1.", 3, 0.08);

function deckRows(extraSelected = []) {
  const nonlands = [
    { quantity: 1, name: commander.name, roles: ["commander"], cmc: 2 },
    ...filler.map((card) => buildRow(card)),
    ...extraSelected.map((card) => buildRow(card)),
  ];
  return [...nonlands, { quantity: 100 - nonlands.reduce((sum, row) => sum + row.quantity, 0), name: "Forest", roles: ["land"], cmc: 0, colorIdentity: ["G"] }];
}

function candidate(extraSelected = [], overlays = {}) {
  const rows = deckRows(extraSelected);
  return {
    id: "cohesion",
    label: "cohesion",
    rows,
    evaluation: evaluationOf(rows),
    score: evaluationOf(rows).score,
    ...overlays,
  };
}

function input(extraCards = [], overrides = {}) {
  return {
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    seed: 21,
    commander,
    budget: "Budget conscious",
    targetPowerTier: "Casual",
    cards: [...filler, luxuryOffender, powerCutCard, safeCheap, safeCheap2, ...extraCards],
    ...overrides,
  };
}

test("collectRepairExcludedNames unions budget and power removals", () => {
  const names = collectRepairExcludedNames({
    budgetRepair: { removedNames: ["Badgermole Cub"] },
    powerRepair: { removedNames: ["Test Forbidden Grand Engine", "Badgermole Cub"] },
  }, ["Extra Cut"]);
  assert.deepEqual([...names].sort(), ["badgermole cub", "extra cut", "test forbidden grand engine"]);
});

test("Casual requests forbid power-signal alternatives during budget repair", () => {
  assert.equal(repairForbidsPowerSignals({ targetPowerTier: "Casual" }), true);
  assert.equal(repairForbidsPowerSignals({ targetPowerTier: "Maximum" }), false);
  assert.equal(repairForbidsPowerSignals({}), false);
});

test("power-tier exclusions survive a later budget repair (confirmed intent-leak class)", () => {
  // Simulate the historical order bug: power already cut a card, then budget
  // rebuilds eligibility. The cut card is cheap enough to look like an
  // attractive budget alternative for the remaining premium offender.
  const powerRepair = {
    completed: true,
    attempted: true,
    targetTier: "Casual",
    removedNames: [powerCutCard.name],
    alternativesAddedNames: [safeCheap2.name],
    appliedCount: 1,
  };
  const before = candidate([luxuryOffender, safeCheap2], { powerRepair });
  assert.ok(!before.rows.some((row) => row.name === powerCutCard.name), "fixture: power-cut card is already absent");

  const audit = auditBudgetSubstitutions(input(), {
    candidate: before,
    priceThresholdUsd: 7.5,
    excludedNames: collectRepairExcludedNames(before),
    forbidPowerSignals: true,
  });
  const offender = audit.offenders.find((entry) => entry.name === luxuryOffender.name);
  assert.ok(offender, "fixture: premium card must still be an offender");
  assert.ok(
    !(offender.compatibleAlternatives || []).some((alt) => alt.name === powerCutCard.name),
    "budget audit must not propose a power-excluded card as a cheaper alternative",
  );

  const result = repairBudgetOffenders(input(), before);
  assert.ok(!result.candidate.rows.some((row) => row.name === powerCutCard.name), "budget repair must never reintroduce the power-cut card");
  assert.deepEqual(result.candidate.powerRepair, powerRepair, "budget repair must not rewrite power diagnostics");
  if (result.budgetRepair.appliedCount > 0) {
    assert.ok(result.candidate.rows.some((row) => row.name === luxuryOffender.name) === false || result.budgetRepair.removedNames.includes(luxuryOffender.name));
    assert.ok(
      result.budgetRepair.alternativesAddedNames.every((name) => name !== powerCutCard.name),
      "no applied budget alternative may be the excluded power card",
    );
  }
});

test("budget exclusions survive a later power repair", () => {
  const budgetRepair = {
    completed: true,
    budgetIntent: "Budget conscious",
    thresholdUsd: 7.5,
    removedNames: [luxuryOffender.name],
    appliedCount: 1,
  };
  const result = repairPowerOffenders(
    input([], { budget: "Budget conscious" }),
    candidate([powerCutCard, safeCheap], { budgetRepair }),
  );
  assert.ok(!result.candidate.rows.some((row) => row.name === luxuryOffender.name));
  assert.deepEqual(result.candidate.budgetRepair, budgetRepair);
});

test("Casual budget repair refuses power-signal substitutes even when they are cheaper", () => {
  const before = candidate([luxuryOffender]);
  const audit = auditBudgetSubstitutions(input(), {
    candidate: before,
    priceThresholdUsd: 7.5,
    forbidPowerSignals: true,
  });
  const offender = audit.offenders.find((entry) => entry.name === luxuryOffender.name);
  assert.ok(offender);
  assert.ok(
    !(offender.compatibleAlternatives || []).some((alt) => alt.name === powerCutCard.name),
    "a recognized power-signal card must not appear as a Casual budget alternative",
  );
  assert.ok(
    (offender.compatibleAlternatives || []).some((alt) => alt.name === safeCheap.name || alt.name === safeCheap2.name),
    "non-power cheap fillers must remain available",
  );

  const result = repairBudgetOffenders(input(), before);
  assert.ok(!result.candidate.rows.some((row) => row.name === powerCutCard.name));
  if (result.budgetRepair.appliedCount > 0) {
    assert.ok(result.budgetRepair.alternativesAddedNames.every((name) => ![powerCutCard.name].includes(name)));
  }
});

test("repair replacements retain commander/theme metadata fields used by strategy metrics", () => {
  const result = repairBudgetOffenders(input(), candidate([luxuryOffender]));
  if (!result.budgetRepair.appliedCount) return;
  const added = result.candidate.rows.find((row) => result.budgetRepair.alternativesAddedNames.includes(row.name));
  assert.ok(added);
  assert.ok("blueprintMechanicHits" in added, "replacement rows must carry blueprint mechanic hits");
  assert.ok("commanderConnectionSignals" in added, "replacement rows must carry commander connection signals");
  assert.ok("sequenceStages" in added, "replacement rows must carry sequence stages");
  assert.ok(result.candidate.blueprintAlignment, "successful repair must refresh blueprint alignment");
  assert.ok(result.candidate.commanderCompatibility, "successful repair must refresh commander compatibility");
  assert.ok(result.candidate.strategicCoherence, "successful repair must refresh strategic coherence");
});
