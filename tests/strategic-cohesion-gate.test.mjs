import assert from "node:assert/strict";
import test from "node:test";
import {
  buildStrategicIntent,
  expensiveThreatSupport,
  replacementCompatible,
  strategicSemanticsFor,
  validateStrategicCohesion,
} from "../app/strategic-intent.mjs";
import { extractMechanicalSignals } from "../app/forge-interaction-graph.mjs";
import {
  auditBudgetSubstitutions,
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

const aura = (name, cmc = 2, priceUsd = 0.2) =>
  card(name, "Enchantment — Aura", "Enchant creature. Enchanted creature gets +1/+1 and has vigilance.", cmc, priceUsd);
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
const kozilek = card("Kozilek, Butcher of Truth", "Legendary Creature — Eldrazi", "When you cast this spell, draw four cards.", 10, 30, "{10}");

function rowFrom(entry) {
  return {
    quantity: 1,
    name: entry.name,
    roles: classifyNativeCard(entry),
    cmc: entry.cmc,
    colorPips: colorPipsFromCost(entry.manaCost),
    strategicSemantics: strategicSemanticsFor(entry),
    mechanics: extractMechanicalSignals(entry),
    commanderConnectionSignals: extractMechanicalSignals(pearlEar).rewards.filter((signal) =>
      extractMechanicalSignals(entry).produces.includes(signal)),
  };
}

test("Pearl-Ear rewards Auras precisely and does not produce the Aura signal itself", () => {
  const signals = extractMechanicalSignals(pearlEar);
  assert.ok(signals.rewards.includes("auras"));
  assert.ok(!signals.produces.includes("auras"), "commander oracle mentioning Auras must not mark the commander as an Aura producer");
  assert.ok(extractMechanicalSignals(aura("Test Aura")).produces.includes("auras"));
  assert.ok(!extractMechanicalSignals(genericEnchantment("Test Enchant")).produces.includes("auras"));
});

test("semantic precision: Aura ≠ generic enchantment; Equipment ≠ generic artifact", () => {
  assert.ok(strategicSemanticsFor(aura("A")).has("aura"));
  assert.ok(strategicSemanticsFor(genericEnchantment("E")).has("non_aura_enchantment"));
  assert.ok(!strategicSemanticsFor(genericEnchantment("E")).has("aura"));
  const equipment = card("Sword", "Artifact — Equipment", "Equipped creature gets +2/+2. Equip {2}", 3);
  const rock = card("Rock", "Artifact", "Add one mana.", 2, 0.2, "{2}");
  assert.ok(strategicSemanticsFor(equipment).has("equipment"));
  assert.ok(strategicSemanticsFor(rock).has("non_equipment_artifact"));
  assert.ok(!strategicSemanticsFor(rock).has("equipment"));
});

test("Aura commander intent cannot be satisfied by generic enchantment density", () => {
  const intent = buildStrategicIntent(
    { format: "Commander", strategy: "Balanced midrange", commander: pearlEar },
    { blueprint: { source: "", requestedMechanics: [], desiredRoles: [], packageSignals: [], promises: [], excludedRoles: [] }, commanderMechanics: extractMechanicalSignals(pearlEar), ideal: 2.9 },
  );
  assert.ok(intent.packageIds.includes("auras"));
  const fakeAuraDeck = [
    ...Array.from({ length: 20 }, (_, i) => rowFrom(genericEnchantment(`Soft Enchant ${i}`))),
    rowFrom(ulamog),
  ];
  const gate = validateStrategicCohesion({ rows: fakeAuraDeck }, intent, {
    availablePackageCore: { auras: 20 },
  });
  assert.equal(gate.passed, false);
  assert.ok(gate.reasons.some((reason) => /Aura package core density/i.test(reason)));
  assert.ok(gate.reasons.some((reason) => /Ulamog/i.test(reason)));
  assert.ok(gate.unsupportedBombs.includes(ulamog.name));
});

test("broad role match alone is insufficient when package compatibility fails", () => {
  const intent = buildStrategicIntent(
    { format: "Commander", strategy: "Balanced midrange", commander: pearlEar },
    { blueprint: { source: "", requestedMechanics: [], desiredRoles: [], packageSignals: [], promises: [], excludedRoles: [] }, commanderMechanics: extractMechanicalSignals(pearlEar), ideal: 2.9 },
  );
  const offender = {
    card: aura("All That Glitters"),
    roles: ["protection"],
    strategicSemantics: strategicSemanticsFor(aura("All That Glitters")),
    commanderConnectionSignals: ["auras"],
    mechanics: extractMechanicalSignals(aura("All That Glitters")),
  };
  const falseFriend = {
    card: genericEnchantment("Always Watching"),
    roles: ["protection"],
    strategicSemantics: strategicSemanticsFor(genericEnchantment("Always Watching")),
    commanderConnectionSignals: [],
    mechanics: extractMechanicalSignals(genericEnchantment("Always Watching")),
  };
  const trueFriend = {
    card: aura("Ethereal Armor"),
    roles: ["protection"],
    strategicSemantics: strategicSemanticsFor(aura("Ethereal Armor")),
    commanderConnectionSignals: ["auras"],
    mechanics: extractMechanicalSignals(aura("Ethereal Armor")),
  };
  assert.equal(replacementCompatible(offender, falseFriend, intent).compatible, false);
  assert.equal(replacementCompatible(offender, trueFriend, intent).compatible, true);
});

test("unsupported 10-mana bomb is rejected; supported bomb is allowed", () => {
  const intent = buildStrategicIntent(
    { format: "Commander", strategy: "Balanced midrange", commander: pearlEar },
    { blueprint: { source: "", requestedMechanics: [], desiredRoles: [], packageSignals: [], promises: [], excludedRoles: [] }, commanderMechanics: extractMechanicalSignals(pearlEar), ideal: 2.9 },
  );
  const unsupported = expensiveThreatSupport(rowFrom(ulamog), [rowFrom(ulamog), ...Array.from({ length: 10 }, (_, i) => rowFrom(ramp(`Stone ${i}`)))], intent);
  assert.equal(unsupported.needsSupport, true);
  assert.equal(unsupported.supported, false, "ramp alone cannot justify an Eldrazi in an Aura package deck");

  const noPackageIntent = buildStrategicIntent(
    { format: "Commander", strategy: "Balanced midrange", commander: { name: "Generic", colors: ["W"], oracleText: "Vigilance.", typeLine: "Legendary Creature — Human" } },
    { blueprint: { source: "", requestedMechanics: [], desiredRoles: [], packageSignals: [], promises: [], excludedRoles: [] }, commanderMechanics: { produces: [], rewards: [] }, ideal: 2.9 },
  );
  const supported = expensiveThreatSupport(rowFrom(ulamog), [rowFrom(ulamog), ...Array.from({ length: 10 }, (_, i) => rowFrom(ramp(`Stone ${i}`)))], noPackageIntent);
  assert.equal(supported.supported, true);
  assert.ok(supported.reasons.some((reason) => /ramp/i.test(reason)));

  const cheat = card("Quicksilver Fisher", "Creature — Pirate", "You may cast spells with mana value 10 or greater without paying their mana costs.", 3);
  const cheated = expensiveThreatSupport(rowFrom(ulamog), [rowFrom(ulamog), rowFrom(cheat)], intent);
  assert.equal(cheated.supported, true, "cost-cheat remains a valid justification even under an Aura package");
});

test("final cohesion validator passes a synergistic Aura shell and fails a goodstuff pile", () => {
  const intent = buildStrategicIntent(
    { format: "Commander", strategy: "Balanced midrange", commander: pearlEar },
    { blueprint: { source: "", requestedMechanics: [], desiredRoles: [], packageSignals: [], promises: [], excludedRoles: [] }, commanderMechanics: extractMechanicalSignals(pearlEar), ideal: 2.9 },
  );
  const synergistic = [
    ...Array.from({ length: 18 }, (_, i) => rowFrom(aura(`Aura ${i}`))),
    ...Array.from({ length: 6 }, (_, i) => rowFrom(protection(`Ward ${i}`))),
    ...Array.from({ length: 8 }, (_, i) => rowFrom(ramp(`Rock ${i}`))),
  ];
  const goodstuff = [
    ...Array.from({ length: 18 }, (_, i) => rowFrom(genericEnchantment(`Enchant ${i}`))),
    rowFrom(ulamog),
    rowFrom(kozilek),
  ];
  assert.equal(validateStrategicCohesion({ rows: synergistic }, intent, { availablePackageCore: { auras: 18 } }).passed, true);
  assert.equal(validateStrategicCohesion({ rows: goodstuff }, intent, { availablePackageCore: { auras: 18 } }).passed, false);
});

test("budget repair preserves Aura package obligations instead of swapping to generic enchantments", () => {
  const filler = [
    ...Array.from({ length: 12 }, (_, i) => draw(`Flow ${i}`)),
    ...Array.from({ length: 12 }, (_, i) => removal(`Answer ${i}`)),
    ...Array.from({ length: 10 }, (_, i) => ramp(`Stone ${i}`)),
    ...Array.from({ length: 6 }, (_, i) => protection(`Ward ${i}`)),
  ];
  const expensiveAura = aura("Premium Aura", 2, 40);
  const cheapEnchantment = genericEnchantment("Cheap Enchantment", 2, 0.05);
  const cheapAura = aura("Cheap Aura", 2, 0.05);
  const cards = [...filler, expensiveAura, cheapEnchantment, cheapAura];
  const nonlands = [
    { quantity: 1, name: pearlEar.name, roles: ["commander"], cmc: 2 },
    ...filler.map((entry) => rowFrom(entry)),
    rowFrom(expensiveAura),
  ];
  const rows = [...nonlands, { quantity: 100 - nonlands.length, name: "Plains", roles: ["land"], cmc: 0 }];
  const candidate = { id: "cohesion", label: "cohesion", rows, evaluation: { score: 70, roleCoverage: 1, curveHealth: 80 }, score: 70 };
  const input = {
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    seed: 21,
    commander: pearlEar,
    budget: "Budget conscious",
    cards,
  };
  const audit = auditBudgetSubstitutions(input, { candidate, priceThresholdUsd: 7.5 });
  const offender = audit.offenders.find((entry) => entry.name === expensiveAura.name);
  assert.ok(offender, "expensive aura should be audited");
  assert.ok(!(offender.compatibleAlternatives || []).some((alt) => alt.name === cheapEnchantment.name), "generic enchantment must not be a legal Aura replacement");
  assert.ok((offender.compatibleAlternatives || []).some((alt) => alt.name === cheapAura.name), "another Aura must remain eligible");

  const repaired = repairBudgetOffenders(input, candidate);
  if (repaired.budgetRepair.appliedCount > 0) {
    assert.ok(!repaired.candidate.rows.some((row) => row.name === cheapEnchantment.name));
    assert.ok(repaired.candidate.rows.some((row) => row.name === cheapAura.name));
  }
});

test("native generation for Pearl-Ear keeps Aura density and rejects unsupported Eldrazi", () => {
  const auras = Array.from({ length: 24 }, (_, i) => aura(`Aura Piece ${i}`, 1 + (i % 3)));
  const enchantments = Array.from({ length: 12 }, (_, i) => genericEnchantment(`Enchant Soup ${i}`, 3));
  const support = [
    ...Array.from({ length: 10 }, (_, i) => draw(`Flow ${i}`)),
    ...Array.from({ length: 10 }, (_, i) => removal(`Answer ${i}`)),
    ...Array.from({ length: 10 }, (_, i) => ramp(`Stone ${i}`)),
    ...Array.from({ length: 8 }, (_, i) => protection(`Ward ${i}`)),
  ];
  const pool = [...auras, ...enchantments, ...support, ulamog, kozilek];
  const report = forgeNativeMasterwork({
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    seed: 17,
    commander: pearlEar,
    note: "focus on auras",
    cards: pool,
  });
  const nonlands = report.selected.rows.filter((row) => !row.roles.includes("land") && !row.roles.includes("commander"));
  const auraCount = nonlands.filter((row) => strategicSemanticsFor({
    name: row.name,
    typeLine: pool.find((card) => card.name === row.name)?.typeLine,
    oracleText: pool.find((card) => card.name === row.name)?.oracleText,
    cmc: row.cmc,
  }).has("aura")).length;
  const enchantOnly = nonlands.filter((row) => {
    const semantics = strategicSemanticsFor(pool.find((card) => card.name === row.name) || {});
    return semantics.has("non_aura_enchantment");
  }).length;
  assert.ok(auraCount >= 12, `expected meaningful Aura density, got ${auraCount}`);
  assert.ok(auraCount > enchantOnly, `Auras (${auraCount}) must outnumber generic enchantments (${enchantOnly})`);
  assert.ok(!report.selected.rows.some((row) => row.name === ulamog.name || row.name === kozilek.name), "unsupported Eldrazi bombs must not survive");
  assert.equal(report.selected.strategicCohesionGate.passed, true, JSON.stringify(report.selected.strategicCohesionGate));
});

test("power repair preserves Aura package obligations", () => {
  const filler = [
    ...Array.from({ length: 12 }, (_, i) => draw(`Flow ${i}`)),
    ...Array.from({ length: 12 }, (_, i) => removal(`Answer ${i}`)),
    ...Array.from({ length: 10 }, (_, i) => ramp(`Stone ${i}`)),
    ...Array.from({ length: 6 }, (_, i) => protection(`Ward ${i}`)),
  ];
  const engineAura = card("Grand Aura Engine", "Enchantment — Aura", "Enchant creature. Whenever you cast a creature spell, draw a card.", 3);
  const safeAura = aura("Gentle Aura");
  const safeEnchantment = genericEnchantment("Gentle Enchantment");
  const cards = [...filler, engineAura, safeAura, safeEnchantment];
  const nonlands = [
    { quantity: 1, name: pearlEar.name, roles: ["commander"], cmc: 2 },
    ...filler.map((entry) => rowFrom(entry)),
    rowFrom(engineAura),
  ];
  const rows = [...nonlands, { quantity: 100 - nonlands.length, name: "Plains", roles: ["land"], cmc: 0 }];
  const candidate = { id: "cohesion", label: "cohesion", rows, evaluation: { score: 70, roleCoverage: 1, curveHealth: 80 }, score: 70 };
  const result = repairPowerOffenders({
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    seed: 21,
    commander: pearlEar,
    targetPowerTier: "Casual",
    cards,
  }, candidate);
  if (result.powerRepair.appliedCount > 0) {
    assert.ok(!result.candidate.rows.some((row) => row.name === safeEnchantment.name), "power repair must not refill an Aura cut with a generic enchantment");
  }
});

test("refill path prefers package-compatible Aura over generic enchantment", () => {
  const filler = [
    ...Array.from({ length: 12 }, (_, i) => draw(`Flow ${i}`)),
    ...Array.from({ length: 12 }, (_, i) => removal(`Answer ${i}`)),
    ...Array.from({ length: 10 }, (_, i) => ramp(`Stone ${i}`)),
    ...Array.from({ length: 6 }, (_, i) => protection(`Ward ${i}`)),
    ...Array.from({ length: 14 }, (_, i) => aura(`Shell Aura ${i}`)),
  ];
  const cutAura = aura("Cut Package Aura", 2);
  const refillAura = aura("Refill Package Aura", 2);
  const refillEnchantment = genericEnchantment("Refill Enchantment Soup", 2);
  const cards = [...filler, cutAura, refillAura, refillEnchantment];
  // Deck after the cut: one open spell slot (99 cards). Refill must restore Aura package membership.
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
  const addedNames = report.packages.flatMap((pkg) => (pkg.additions || pkg.added || []).map((entry) => entry.name));
  assert.ok(addedNames.includes(refillAura.name), `expected Aura refill, got ${JSON.stringify(addedNames)}`);
  assert.ok(!addedNames.includes(refillEnchantment.name), "generic enchantment must not win an Aura package refill");
});
