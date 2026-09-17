import assert from "node:assert/strict";
import test from "node:test";
import { analyzeForgePool, classifyNativeCard } from "../app/native-masterwork-engine.mjs";

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

const aura = (name, cmc = 2) => card(name, "Enchantment — Aura", "Enchant creature. Enchanted creature gets +1/+1 and has hexproof.", cmc);
const draw = (name) => card(name, "Instant", "Draw two cards.", 3);
const ramp = (name) => card(name, "Artifact", "Add one mana. Create a Treasure token.", 2, 0.2, "{2}");
const forest = { name: "Forest", typeLine: "Basic Land — Forest", oracleText: "({T}: Add {G}.)", cmc: 0, manaCost: "", colorIdentity: ["W"], priceUsd: 0.1 };

function pool() {
  return [
    ...Array.from({ length: 20 }, (_, i) => aura(`Aura ${i}`, 1 + (i % 3))),
    ...Array.from({ length: 12 }, (_, i) => draw(`Flow ${i}`)),
    ...Array.from({ length: 12 }, (_, i) => ramp(`Stone ${i}`)),
    forest,
  ];
}

function baseInput() {
  return {
    format: "Commander",
    strategy: "Balanced midrange",
    target: 100,
    commander: pearlEar,
    note: "focus on auras",
    cards: pool(),
  };
}

test("throws the same guard forgeNativeMasterwork uses when there's no card pool", () => {
  assert.throws(() => analyzeForgePool({ format: "Commander" }), /verified card pool/);
  assert.throws(() => analyzeForgePool(null), /verified card pool/);
});

test("returns classified spells/lands and a real strategicIntent, without running construction", () => {
  const analysis = analyzeForgePool(baseInput());
  assert.ok(analysis.strategicIntent);
  assert.ok(analysis.strategicIntent.packageIds.includes("auras"));
  assert.ok(analysis.spells.length > 0);
  assert.ok(analysis.lands.length > 0);
  // No construction happened — this is analysis only.
  assert.equal(analysis.selected, undefined);
  assert.equal(analysis.candidates, undefined);
  const auraEntry = analysis.spells.find((entry) => entry.card.name === "Aura 0");
  assert.ok(auraEntry, "expected the aura fixture to survive analysis");
  assert.ok(Array.isArray(auraEntry.roles));
  assert.ok(auraEntry.mechanics);
});

test("focusPackageId flows through to the returned strategicIntent, same as one-shot construction", () => {
  const analysis = analyzeForgePool({ ...baseInput(), focusPackageId: "auras" });
  assert.deepEqual(analysis.strategicIntent.packageIds, ["auras"]);
});

test("uses the same real classifier construction itself uses, not a separate/simplified copy", () => {
  const analysis = analyzeForgePool(baseInput());
  const fromAnalysis = analysis.spells.find((entry) => entry.card.name === "Aura 0");
  const expectedRoles = classifyNativeCard(pool().find((c) => c.name === "Aura 0"));
  assert.deepEqual([...fromAnalysis.roles].sort(), [...expectedRoles].sort());
});
