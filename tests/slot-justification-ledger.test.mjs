import assert from "node:assert/strict";
import test from "node:test";
import {
  buildStrategicIntent,
  strategicSemanticsFor,
} from "../app/strategic-intent.mjs";
import {
  buildJustificationFootprint,
  buildSlotJustification,
  buildSlotJustificationLedger,
  compareReplacementJustification,
  justificationPreservationScore,
} from "../app/slot-justification-ledger.mjs";
import { extractMechanicalSignals } from "../app/forge-interaction-graph.mjs";
import {
  classifyNativeCard,
  colorPipsFromCost,
  forgeMultiSlotRefills,
  forgeNativeMasterwork,
  repairBudgetOffenders,
  repairPowerOffenders,
} from "../app/native-masterwork-engine.mjs";

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

const aura = (name, cmc = 2, priceUsd = 0.2, oracle = "Enchant creature. Enchanted creature gets +1/+1 and has hexproof.") =>
  card(name, "Enchantment — Aura", oracle, cmc, priceUsd);
const genericEnchantment = (name, cmc = 3, priceUsd = 0.2) =>
  card(name, "Enchantment", "Creatures you control get +1/+1.", cmc, priceUsd);
const protection = (name) =>
  card(name, "Instant", "Target creature gains hexproof and indestructible until end of turn.", 2);
const ramp = (name, cmc = 2) =>
  card(name, "Artifact", "Add one mana. Create a Treasure token.", cmc, 0.2, `{${cmc}}`);
const draw = (name) =>
  card(name, "Instant", "Draw two cards.", 3);
const removal = (name) =>
  card(name, "Instant", "Exile target nonland permanent.", 3);
const ulamog = card("Ulamog, the Ceaseless Hunger", "Legendary Creature — Eldrazi", "When you cast this spell, exile two target permanents.", 10, 25, "{10}");

function pearlPool({ auras = 24, enchantments = 0 } = {}) {
  return [
    ...Array.from({ length: auras }, (_, i) => aura(`Aura Piece ${i}`, 1 + (i % 3))),
    ...Array.from({ length: enchantments }, (_, i) => genericEnchantment(`Enchant Soup ${i}`, 3)),
    ...Array.from({ length: 12 }, (_, i) => draw(`Flow ${i}`)),
    ...Array.from({ length: 12 }, (_, i) => removal(`Answer ${i}`)),
    ...Array.from({ length: 12 }, (_, i) => ramp(`Stone ${i}`)),
    ...Array.from({ length: 10 }, (_, i) => protection(`Ward ${i}`)),
    ...Array.from({ length: 8 }, (_, i) => card(`Threat ${i}`, "Creature — Fox", "Vigilance", 3 + (i % 3))),
  ];
}

function intentForPearl() {
  return buildStrategicIntent(
    { format: "Commander", strategy: "Balanced midrange", commander: pearlEar, note: "focus on auras" },
    { blueprint: { source: "focus on auras", requestedMechanics: ["voltron"], desiredRoles: [], packageSignals: [], promises: [] } },
  );
}

function enriched(entry, commander = pearlEar) {
  const commanderSignals = extractMechanicalSignals(commander);
  const mechanics = extractMechanicalSignals(entry);
  return {
    quantity: 1,
    name: entry.name,
    roles: classifyNativeCard(entry),
    cmc: entry.cmc,
    colorPips: colorPipsFromCost(entry.manaCost),
    strategicSemantics: strategicSemanticsFor(entry),
    mechanics,
    commanderConnectionSignals: commanderSignals.rewards.filter((signal) => mechanics.produces.includes(signal)),
    sequenceStages: entry.cmc <= 2 ? ["setup"] : entry.cmc >= 5 ? ["close"] : ["convert"],
  };
}

test("every final selected nonland has a justification entry", () => {
  const report = forgeNativeMasterwork({
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    seed: 41,
    commander: pearlEar,
    note: "focus on auras",
    cards: pearlPool(),
  });
  const nonlands = report.selected.rows.filter((row) => !row.roles.includes("land") && !row.roles.includes("commander"));
  const ledger = report.selected.slotJustificationLedger;
  assert.ok(ledger, "selected candidate must carry a slot justification ledger");
  assert.equal(ledger.slotCount, nonlands.length);
  for (const row of nonlands) {
    assert.ok(ledger.byName[row.name.toLocaleLowerCase("en")], `missing justification for ${row.name}`);
  }
});

test("Aura card carries Aura-density/package contribution and multiple reasons", () => {
  const intent = intentForPearl();
  const row = enriched(aura("All-Purpose Aura", 2));
  const slot = buildSlotJustification(row, intent, [row]);
  assert.ok(slot.densityContribution.auras?.core >= 1);
  assert.ok(slot.footprint.packageCore.includes("auras"));
  assert.ok(slot.reasons.some((reason) => reason.kind === "package_core"));
  assert.ok(slot.reasons.some((reason) => reason.kind === "commander_connection" || reason.kind === "semantic"));
  assert.ok(slot.reasons.length >= 3, `multifunction aura should record multiple reasons, got ${slot.reasons.length}`);
});

test("replacement preserving only one obligation scores worse than preserving most", () => {
  const intent = intentForPearl();
  const original = enriched(aura("Original Aura", 2));
  const fullPreserve = enriched(aura("Sibling Aura", 2));
  const protectionOnly = enriched(protection("Only Protection"));
  const full = compareReplacementJustification(original, fullPreserve, intent);
  const partial = compareReplacementJustification(original, protectionOnly, intent);
  assert.ok(full.score > partial.score, `full ${full.score} should beat partial ${partial.score}`);
  assert.ok(partial.score < 0.55, `protection-only replacement must score poorly, got ${partial.score}`);
  assert.ok(partial.lost.some((token) => token.startsWith("packageCore:")), "must lose package core obligation");
});

test("raw-power card with little strategic contribution is flagged weakly justified", () => {
  const intent = intentForPearl();
  const bomb = enriched(ulamog);
  bomb.commanderConnectionSignals = [];
  bomb.roles = ["threat"];
  const shell = [
    ...Array.from({ length: 16 }, (_, i) => enriched(aura(`Aura ${i}`))),
    ...Array.from({ length: 8 }, (_, i) => enriched(draw(`Flow ${i}`))),
    bomb,
  ];
  const slot = buildSlotJustification(bomb, intent, shell, { rawPowerSignal: true });
  assert.ok(slot.flags.weaklyJustified || slot.flags.rawPowerDominant);
  assert.ok(slot.strength < 30);
});

test("package-critical card shows meaningful removal consequence", () => {
  const intent = intentForPearl();
  const auras = Array.from({ length: intent.packages.find((pkg) => pkg.id === "auras").coreMin }, (_, i) =>
    enriched(aura(`Floor Aura ${i}`)));
  const critical = auras[0];
  const slot = buildSlotJustification(critical, intent, auras);
  assert.ok(slot.flags.packageCritical);
  assert.deepEqual(slot.removalConsequence.packageCollapses, ["auras"]);
  assert.ok(slot.removalConsequence.severity >= 35);
});

test("final cohesion and ledger agree on package counts", () => {
  const report = forgeNativeMasterwork({
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    seed: 19,
    commander: pearlEar,
    note: "focus on auras",
    cards: pearlPool({ enchantments: 8 }),
  });
  const ledger = report.selected.slotJustificationLedger;
  const cohesion = report.selected.strategicCohesionGate;
  assert.equal(ledger.agreesWithCohesion, true);
  const auraPkg = cohesion.packages.find((pkg) => pkg.id === "auras");
  assert.equal(ledger.packageCounts.auras.core, auraPkg.coreCount);
});

test("budget repair updates the ledger after replacement", () => {
  const filler = [
    ...Array.from({ length: 12 }, (_, i) => draw(`Flow ${i}`)),
    ...Array.from({ length: 12 }, (_, i) => removal(`Answer ${i}`)),
    ...Array.from({ length: 10 }, (_, i) => ramp(`Stone ${i}`)),
    ...Array.from({ length: 6 }, (_, i) => protection(`Ward ${i}`)),
  ];
  const expensiveAura = aura("Premium Aura", 2, 40);
  const cheapAura = aura("Cheap Aura", 2, 0.05);
  const cards = [...filler, expensiveAura, cheapAura, genericEnchantment("Cheap Enchantment", 2, 0.05)];
  const nonlands = [
    { quantity: 1, name: pearlEar.name, roles: ["commander"], cmc: 2 },
    ...filler.map((entry) => enriched(entry)),
    enriched(expensiveAura),
  ];
  const rows = [...nonlands, { quantity: 100 - nonlands.length, name: "Plains", roles: ["land"], cmc: 0 }];
  const candidate = { id: "cohesion", label: "cohesion", rows, evaluation: { score: 70, roleCoverage: 1, curveHealth: 80 }, score: 70 };
  const repaired = repairBudgetOffenders({
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    seed: 7,
    commander: pearlEar,
    budget: "Budget conscious",
    cards,
  }, candidate);
  if (repaired.budgetRepair.appliedCount > 0) {
    assert.ok(repaired.candidate.slotJustificationLedger);
    assert.ok(!repaired.candidate.slotJustificationLedger.byName["premium aura"]);
    assert.ok(repaired.candidate.slotJustificationLedger.byName["cheap aura"]);
  }
});

test("power repair updates the ledger after replacement", () => {
  const filler = [
    ...Array.from({ length: 12 }, (_, i) => draw(`Flow ${i}`)),
    ...Array.from({ length: 12 }, (_, i) => removal(`Answer ${i}`)),
    ...Array.from({ length: 10 }, (_, i) => ramp(`Stone ${i}`)),
    ...Array.from({ length: 6 }, (_, i) => protection(`Ward ${i}`)),
  ];
  const engineAura = card("Grand Aura Engine", "Enchantment — Aura", "Enchant creature. Whenever you cast a creature spell, draw a card.", 3);
  const safeAura = aura("Gentle Aura");
  const cards = [...filler, engineAura, safeAura, genericEnchantment("Gentle Enchantment")];
  const nonlands = [
    { quantity: 1, name: pearlEar.name, roles: ["commander"], cmc: 2 },
    ...filler.map((entry) => enriched(entry)),
    enriched(engineAura),
  ];
  const rows = [...nonlands, { quantity: 100 - nonlands.length, name: "Plains", roles: ["land"], cmc: 0 }];
  const candidate = { id: "cohesion", label: "cohesion", rows, evaluation: { score: 70, roleCoverage: 1, curveHealth: 80 }, score: 70 };
  const result = repairPowerOffenders({
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    seed: 11,
    commander: pearlEar,
    targetPowerTier: "Casual",
    cards,
  }, candidate);
  if (result.powerRepair.appliedCount > 0) {
    assert.ok(result.candidate.slotJustificationLedger);
    assert.ok(result.candidate.slotJustificationLedger.slotCount > 0);
  }
});

test("refill updates the ledger", () => {
  const filler = [
    ...Array.from({ length: 12 }, (_, i) => draw(`Flow ${i}`)),
    ...Array.from({ length: 12 }, (_, i) => removal(`Answer ${i}`)),
    ...Array.from({ length: 10 }, (_, i) => ramp(`Stone ${i}`)),
    ...Array.from({ length: 6 }, (_, i) => protection(`Ward ${i}`)),
    ...Array.from({ length: 14 }, (_, i) => aura(`Shell Aura ${i}`)),
  ];
  const cutAura = aura("Cut Package Aura", 2);
  const refillAura = aura("Refill Package Aura", 2);
  const cards = [...filler, cutAura, refillAura, genericEnchantment("Refill Enchantment Soup", 2)];
  const keptNonlands = [
    { quantity: 1, name: pearlEar.name, roles: ["commander"], cmc: 2 },
    ...filler.map((entry) => ({ quantity: 1, name: entry.name, roles: classifyNativeCard(entry), cmc: entry.cmc })),
  ];
  const rows = [
    ...keptNonlands,
    { quantity: 99 - keptNonlands.length, name: "Plains", roles: ["land"], cmc: 0 },
  ];
  const report = forgeMultiSlotRefills({
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    seed: 33,
    commander: pearlEar,
    note: "focus on auras",
    cards,
  }, rows, [{ name: cutAura.name, quantity: 1 }]);
  for (const pkg of report.packages) {
    assert.ok(pkg.slotJustificationLedger, `${pkg.id} missing ledger`);
    assert.ok(pkg.slotJustificationLedger.byName["refill package aura"]
      || pkg.additions.some((entry) => entry.name === refillAura.name));
  }
});

test("deterministic generation produces deterministic justification data", () => {
  const input = {
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    seed: 55,
    commander: pearlEar,
    note: "focus on auras",
    cards: pearlPool(),
  };
  const first = forgeNativeMasterwork(input).selected.slotJustificationLedger;
  const second = forgeNativeMasterwork(input).selected.slotJustificationLedger;
  assert.deepEqual(
    first.slots.map((slot) => ({ name: slot.name, strength: slot.strength, reasons: slot.reasons, flags: slot.flags })),
    second.slots.map((slot) => ({ name: slot.name, strength: slot.strength, reasons: slot.reasons, flags: slot.flags })),
  );
});

// Founder #049: found while verifying a real Esika, God of the Tree //
// The Prismatic Bridge construction — a real Planeswalker anchored via
// planeswalkerCheatSynergyHit's dedicated reservation loop got silently
// swapped back out by repairWeaklyJustifiedSlots on the very next repair
// pass, because buildJustificationFootprint had no way to see why it was
// there: payoffMagnitudeHits already had its own bucket entry (#027,
// "payoff_magnitude") but selfDamageSynergyHit (#036) and xSpellSynergyHit
// (#046) never got the same treatment, and neither did this new field.
test("footprint helper folds selfDamageSynergyHit, xSpellSynergyHit, and planeswalkerCheatSynergyHit into commanderSignals, the same bucket payoffMagnitudeHits already uses", () => {
  const intent = intentForPearl();
  const base = { name: "Test Anchor", roles: [], cmc: 5, colorPips: {}, strategicSemantics: new Set(), mechanics: { produces: [], rewards: [] }, commanderConnectionSignals: [], sequenceStages: [] };
  const selfDamageFoot = buildJustificationFootprint({ ...base, selfDamageSynergyHit: 1 }, intent);
  const xSpellFoot = buildJustificationFootprint({ ...base, xSpellSynergyHit: 1 }, intent);
  const planeswalkerFoot = buildJustificationFootprint({ ...base, planeswalkerCheatSynergyHit: 1 }, intent);
  const plainFoot = buildJustificationFootprint({ ...base }, intent);
  assert.ok(selfDamageFoot.commanderSignals.includes("self_damage_synergy"));
  assert.ok(xSpellFoot.commanderSignals.includes("x_spell_synergy"));
  assert.ok(planeswalkerFoot.commanderSignals.includes("planeswalker_cheat_synergy"));
  assert.deepEqual(plainFoot.commanderSignals, []);
});

test("footprint helper exposes package membership for Aura vs false-friend enchantment", () => {
  const intent = intentForPearl();
  const auraFoot = buildJustificationFootprint(enriched(aura("Real Aura")), intent);
  const enchantFoot = buildJustificationFootprint(enriched(genericEnchantment("Soup")), intent);
  assert.deepEqual(auraFoot.packageCore, ["auras"]);
  assert.ok(enchantFoot.falseFriend.includes("auras"));
  assert.equal(justificationPreservationScore(auraFoot, enchantFoot) < 0.5, true);
});

test("ledger critique surfaces package-critical and weakly justified buckets", () => {
  const intent = intentForPearl();
  const auras = Array.from({ length: intent.packages.find((pkg) => pkg.id === "auras").coreMin }, (_, i) =>
    enriched(aura(`Floor Aura ${i}`)));
  const filler = [
    ...Array.from({ length: 8 }, (_, i) => enriched(draw(`Flow ${i}`))),
    enriched(ulamog),
  ];
  const rows = [
    { quantity: 1, name: pearlEar.name, roles: ["commander"], cmc: 2 },
    ...auras,
    ...filler,
    { quantity: 40, name: "Plains", roles: ["land"], cmc: 0 },
  ];
  const ledger = buildSlotJustificationLedger({ rows, strategicCohesionGate: { packages: [{ id: "auras", coreCount: auras.length }] } }, intent, {
    rawPowerNames: new Set(["ulamog, the ceaseless hunger"]),
  });
  assert.ok(ledger.critique.packageCritical.length >= 1);
  assert.ok(ledger.critique.rawPowerDominant.includes("Ulamog, the Ceaseless Hunger")
    || ledger.critique.weaklyJustified.includes("Ulamog, the Ceaseless Hunger"));
});
