import assert from "node:assert/strict";
import test from "node:test";
import { analyzeForgePool } from "../app/native-masterwork-engine.mjs";
import { suggestCardForCategory } from "../app/guided-suggestion.mjs";
import { buildCategoryBudgetLedger, CATEGORY_SEQUENCE } from "../app/category-budget-ledger.mjs";
import { flattenAnalyzedEntries, flattenAnalyzedEntry } from "../app/guided-build-rows.mjs";

const pearlEar = {
  name: "Pearl-Ear, Imperial Advisor",
  colors: ["W"],
  oracleText: "Enchantment spells you cast have affinity for Auras. Whenever an Aura you control becomes attached to a nonland permanent, draw a card.",
  typeLine: "Legendary Creature — Fox Advisor",
  manaCost: "{1}{W}",
};

const card = (name, typeLine, oracleText, cmc, priceUsd = 0.2, manaCost) => ({
  name,
  typeLine,
  oracleText,
  cmc,
  manaCost: manaCost || `{${Math.max(0, cmc - 1)}}{W}`,
  colorIdentity: ["W"],
  priceUsd,
});

function pool() {
  return [
    ...Array.from({ length: 12 }, (_, i) => card(`Aura ${i}`, "Enchantment — Aura", "Enchant creature. Enchanted creature gets +1/+1 and has hexproof.", 1 + (i % 3))),
    ...Array.from({ length: 8 }, (_, i) => card(`Flow ${i}`, "Instant", "Draw two cards.", 3)),
    ...Array.from({ length: 8 }, (_, i) => card(`Stone ${i}`, "Artifact", "Add one mana. Create a Treasure token.", 2, 0.2, "{2}")),
    ...Array.from({ length: 4 }, (_, i) => card(`Beater ${i}`, "Creature — Angel", "Flying. Vigilance.", 4)),
    { name: "Forest", typeLine: "Basic Land — Forest", oracleText: "({T}: Add {G}.)", cmc: 0, manaCost: "", colorIdentity: ["W"], priceUsd: 0.1 },
  ];
}

const baseInput = () => ({
  format: "Commander",
  strategy: "Balanced midrange",
  target: 100,
  commander: pearlEar,
  note: "",
  focusPackageId: "auras",
  targetPowerTier: "Focused",
  cards: pool(),
});

test("flattenAnalyzedEntry lifts name/quantity/typeLine/oracleText out of the nested card without dropping analysis fields", () => {
  const analysis = analyzeForgePool(baseInput());
  const nested = analysis.spells.find((entry) => entry.card.name === "Aura 0");
  const flat = flattenAnalyzedEntry(nested);
  assert.equal(flat.name, "Aura 0");
  assert.equal(flat.quantity, 1);
  assert.equal(flat.typeLine, "Enchantment — Aura");
  assert.deepEqual(flat.roles, nested.roles);
  assert.ok(flat.mechanics);
  assert.equal(flattenAnalyzedEntries([nested, nested]).length, 2);
});

test("the existing ledger runs unchanged against live guided picks once flattened (no crash, real counts)", () => {
  const analysis = analyzeForgePool(baseInput());
  const byName = new Map(analysis.cards.map((entry) => [entry.card.name, entry]));
  const accepted = ["Stone 0", "Stone 1", "Flow 0", "Aura 0", "Aura 1", "Beater 0"].map((name) => byName.get(name));
  const ledger = buildCategoryBudgetLedger({ rows: flattenAnalyzedEntries(accepted) }, analysis.strategicIntent, { targetPowerTier: "Focused" });
  assert.equal(ledger.categories.length, CATEGORY_SEQUENCE.length);
  assert.equal(ledger.byCategory.ramp.actual, 2);
  assert.ok(ledger.byCategory.draw.actual >= 1);
  assert.ok(ledger.byCategory.ramp.target, "Focused tier should give ramp a target");
  assert.ok(ledger.byCategory.winConditions.names.includes("Beater 0"));
  assert.ok(ledger.byCategory.synergyPieces.actual >= 2, "the two Auras should register as auras-package pieces");
});

test("an empty guided session produces a full, all-zero ledger rather than throwing", () => {
  const analysis = analyzeForgePool(baseInput());
  const ledger = buildCategoryBudgetLedger({ rows: [] }, analysis.strategicIntent, { targetPowerTier: "Focused" });
  assert.equal(ledger.categories.length, CATEGORY_SEQUENCE.length);
  for (const row of ledger.categories) assert.equal(row.actual, 0);
});

test("a full simulated guided walk: suggest, accept, ledger moves, every category eventually answerable", () => {
  const analysis = analyzeForgePool(baseInput());
  const byName = new Map(analysis.cards.map((entry) => [entry.card.name, entry]));
  const accepted = [];
  for (const category of CATEGORY_SEQUENCE) {
    const partialRows = accepted.map((name) => byName.get(name));
    const suggestion = suggestCardForCategory({ category, partialRows, pool: analysis.spells, intent: analysis.strategicIntent });
    if (suggestion.exhausted) continue;
    accepted.push(suggestion.offer.card.name);
  }
  assert.ok(accepted.length >= 3, `expected several categories to yield a pick, got ${accepted.length}`);
  assert.equal(new Set(accepted).size, accepted.length, "no card may be offered twice across categories");
  const ledger = buildCategoryBudgetLedger(
    { rows: flattenAnalyzedEntries(accepted.map((name) => byName.get(name))) },
    analysis.strategicIntent,
    { targetPowerTier: "Focused" },
  );
  const total = ledger.categories.reduce((sum, row) => sum + (row.category === "synergyPieces" ? 0 : row.actual), 0);
  assert.ok(total >= 1);
});
