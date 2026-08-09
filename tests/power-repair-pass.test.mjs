import assert from "node:assert/strict";
import test from "node:test";
import { auditPowerSubstitutions, classifyNativeCard, colorPipsFromCost, repairPowerOffenders } from "../app/native-masterwork-engine.mjs";

const commander = { name: "Ayula, Test Bear", colors: ["G"], oracleText: "Other Bears get +1/+1.", typeLine: "Legendary Creature — Bear", manaCost: "{1}{G}" };
const card = (name, oracleText, manaCost = "{2}{G}", typeLine = "Creature — Bear", priceUsd = 0.2) => ({ name, oracleText, manaCost, typeLine, colorIdentity: ["G"], priceUsd });
const row = (entry) => ({ quantity: 1, name: entry.name, roles: classifyNativeCard(entry), cmc: 3, colorPips: colorPipsFromCost(entry.manaCost) });
const filler = [
  ...Array.from({ length: 12 }, (_, i) => card(`Flow ${i}`, "When this enters, draw a card.")),
  ...Array.from({ length: 12 }, (_, i) => card(`Answer ${i}`, "Exile target nonland permanent.")),
  ...Array.from({ length: 10 }, (_, i) => card(`Stone ${i}`, "Add one mana. Create a Treasure token.", "{2}", "Artifact")),
  ...Array.from({ length: 6 }, (_, i) => card(`Ward ${i}`, "Target creature gains hexproof and indestructible until end of turn.")),
];
const offenderA = card("Test Grand Engine A", "Whenever you cast a creature spell, draw a card.");
const offenderB = card("Test Grand Engine B", "Whenever you cast an artifact spell, draw a card.");
const safeA = card("Test Gentle Bear A", "When this enters, draw a card.");
const safeB = card("Test Gentle Bear B", "When this enters, draw a card. Scry 1.");
const budgetCut = card("Badgermole Cub", "When this enters, draw a card.", "{2}{G}", "Creature — Badger", 20);
const otherBudgetCuts = ["Toph, the First Metalbender", "Umezawa's Jitte", "Scythecat Cub", "The Aetherspark"].map((name) => card(name, "When this enters, draw a card.", "{2}{G}", "Artifact Creature — Bear", 20));

function input(extra = [], overrides = {}) {
  return { format: "Commander", target: 100, strategy: "Balanced midrange", seed: 21, commander, cards: [...filler, offenderA, offenderB, safeA, safeB, ...extra], targetPowerTier: "Casual", ...overrides };
}
function candidate(id = "cohesion", extraRows = [], budgetRepair = undefined) {
  const nonlands = [{ quantity: 1, name: commander.name, roles: ["commander"], cmc: 2 }, ...filler.map(row), row(offenderA), row(offenderB), ...extraRows];
  const rows = [...nonlands, { quantity: 100 - nonlands.length, name: "Forest", roles: ["land"], cmc: 0, colorIdentity: ["G"] }];
  return { id, label: id, rows, evaluation: { score: 70, roleCoverage: 1, curveHealth: 80 }, score: 70, ...(budgetRepair ? { budgetRepair } : {}) };
}

test("safe substitutes are claim-aware, deterministic, singleton-safe, and protect every non-offender", () => {
  const before = candidate();
  const first = repairPowerOffenders(input(), before);
  const secondIndependent = repairPowerOffenders(input(), before);
  assert.equal(first.powerRepair.attempted, true);
  assert.equal(first.powerRepair.appliedCount, 2);
  assert.ok(!first.candidate.rows.some((r) => [offenderA.name, offenderB.name].includes(r.name)));
  assert.deepEqual(new Set(first.powerRepair.alternativesAddedNames), new Set([safeA.name, safeB.name]));
  assert.equal(new Set(first.candidate.rows.map((r) => r.name)).size, first.candidate.rows.length);
  assert.deepEqual(first.candidate.rows, secondIndependent.candidate.rows);
  for (const protectedCard of filler) assert.deepEqual(first.candidate.rows.find((r) => r.name === protectedCard.name), before.rows.find((r) => r.name === protectedCard.name));
  assert.ok(first.candidate.evaluation.roleCoverage >= 0.45 && first.candidate.evaluation.curveHealth >= 45);
});

test("one-pass idempotence preserves rows, evaluation, variant id, and original diagnostics", () => {
  const first = repairPowerOffenders(input(), candidate("precision"));
  const second = repairPowerOffenders(input(), first.candidate);
  assert.deepEqual(second.candidate.rows, first.candidate.rows);
  assert.deepEqual(second.candidate.evaluation, first.candidate.evaluation);
  assert.equal(second.candidate.id, "precision");
  assert.deepEqual(second.powerRepair, first.powerRepair);
});

test("actual candidate variant is authoritative for all three independent variants", () => {
  for (const id of ["cohesion", "resilience", "precision"]) {
    const audit = auditPowerSubstitutions(input(), { candidate: candidate(id), variantId: id === "cohesion" ? "precision" : "cohesion" });
    assert.equal(audit.variantId, id);
    assert.equal(repairPowerOffenders(input(), candidate(id)).candidate.id, id);
  }
});

test("no safe substitute leaves the offender and records the skip", () => {
  const noAlternatives = input([], { cards: [...filler, offenderA, offenderB] });
  const built = candidate();
  const result = repairPowerOffenders(noAlternatives, built);
  assert.equal(result.powerRepair.appliedCount, 0);
  assert.ok(result.powerRepair.skippedNoSafeAlternative >= 1, JSON.stringify(result.powerRepair));
  assert.ok(result.candidate.rows.some((r) => r.name === offenderA.name));
});

test("budget-repaired names are forbidden alternatives and stay absent without a second budget pass", () => {
  const budgetRepair = { completed: true, budgetIntent: "Budget conscious", thresholdUsd: 7.5, removedNames: [budgetCut.name, ...otherBudgetCuts.map((entry) => entry.name)] };
  const result = repairPowerOffenders(input([budgetCut, ...otherBudgetCuts], { budget: "Budget conscious" }), candidate("resilience", [], budgetRepair));
  for (const name of budgetRepair.removedNames) assert.ok(!result.candidate.rows.some((r) => r.name === name), `${name} must stay absent`);
  assert.deepEqual(result.candidate.budgetRepair, budgetRepair, "power repair must not rerun or rewrite budget analysis");
});

test("whole-batch role-floor failure rolls every proposed swap back", () => {
  const interactionEngines = Array.from({ length: 3 }, (_, i) => card(`Test Interaction Engine ${i}`, "Exile target nonland permanent. Whenever you cast a creature spell, draw a card."));
  const interactionFiller = Array.from({ length: 9 }, (_, i) => card(`Floor Answer ${i}`, "Exile target nonland permanent."));
  const drawAlts = Array.from({ length: 3 }, (_, i) => card(`Floor Gentle ${i}`, "When this enters, draw a card."));
  const base = candidate().rows.filter((r) => ![offenderA.name, offenderB.name].includes(r.name) && !r.name.startsWith("Answer ") && !r.roles.includes("land"));
  const nonlands = [...base, ...interactionFiller.map(row), ...interactionEngines.map(row)];
  const rows = [...nonlands, { quantity: 100 - nonlands.length, name: "Forest", roles: ["land"], cmc: 0 }];
  const original = { ...candidate(), rows };
  const result = repairPowerOffenders(input([...interactionFiller, ...interactionEngines, ...drawAlts]), original);
  assert.equal(result.powerRepair.revertedByFinalValidation, true, JSON.stringify(result.powerRepair));
  assert.equal(result.powerRepair.appliedCount, 0);
  assert.deepEqual(result.candidate.rows, original.rows);
});

test("non-Casual targets bypass the pass", () => {
  for (const targetPowerTier of [undefined, "Focused", "High-Power", "Maximum"]) {
    const original = candidate();
    const result = repairPowerOffenders(input([], { targetPowerTier }), original);
    assert.equal(result.powerRepair.attempted, false);
    assert.deepEqual(result.candidate.rows, original.rows);
  }
});
