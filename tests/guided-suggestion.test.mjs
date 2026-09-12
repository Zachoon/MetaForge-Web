import assert from "node:assert/strict";
import test from "node:test";
import { buildStrategicIntent, strategicSemanticsFor } from "../app/strategic-intent.mjs";
import { extractMechanicalSignals } from "../app/forge-interaction-graph.mjs";
import { classifyNativeCard, colorPipsFromCost } from "../app/native-masterwork-engine.mjs";
import { suggestCardForCategory } from "../app/guided-suggestion.mjs";

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

const aura = (name, cmc = 2, oracle = "Enchant creature. Enchanted creature gets +1/+1 and has hexproof.") =>
  card(name, "Enchantment — Aura", oracle, cmc);
const draw = (name) => card(name, "Instant", "Draw two cards.", 3);
const removal = (name) => card(name, "Instant", "Exile target nonland permanent.", 3);
const ramp = (name, cmc = 2) => card(name, "Artifact", "Add one mana. Create a Treasure token.", cmc, 0.2, `{${cmc}}`);
const beater = (name) => card(name, "Creature — Angel", "Flying. Vigilance.", 4);
const altWin = (name) => card(name, "Enchantment",
  "At the beginning of your upkeep, if you control no permanents other than this enchantment and you have no cards in hand, you win the game.", 5);

function intentForPearl() {
  return buildStrategicIntent(
    { format: "Commander", strategy: "Balanced midrange", commander: pearlEar, note: "focus on auras" },
    {
      blueprint: { source: "focus on auras", requestedMechanics: ["voltron"], desiredRoles: [], packageSignals: [], promises: [] },
      roleTargets: { ramp: 10, draw: 10, interaction: 10, protection: 5, recursion: 4, sweeper: 2 },
    },
  );
}

function enriched(entry, commander = pearlEar) {
  const commanderSignals = extractMechanicalSignals(commander);
  const mechanics = extractMechanicalSignals(entry);
  return {
    quantity: 1,
    name: entry.name,
    card: entry,
    typeLine: entry.typeLine,
    oracleText: entry.oracleText,
    roles: classifyNativeCard(entry),
    cmc: entry.cmc,
    colorPips: colorPipsFromCost(entry.manaCost),
    strategicSemantics: strategicSemanticsFor(entry),
    mechanics,
    commanderConnectionSignals: commanderSignals.rewards.filter((signal) => mechanics.produces.includes(signal)),
    sequenceStages: entry.cmc <= 2 ? ["setup"] : entry.cmc >= 5 ? ["close"] : ["convert"],
    score: 50,
  };
}

function mixedPool() {
  return [
    ...Array.from({ length: 6 }, (_, i) => enriched(aura(`Aura ${i}`, 1 + (i % 3)))),
    ...Array.from({ length: 6 }, (_, i) => enriched(draw(`Flow ${i}`))),
    ...Array.from({ length: 6 }, (_, i) => enriched(removal(`Answer ${i}`))),
    ...Array.from({ length: 6 }, (_, i) => enriched(ramp(`Stone ${i}`))),
    enriched(beater("Big Angel")),
    enriched(altWin("Barren Glory")),
  ];
}

test("suggests the highest-scoring eligible card for a fundamentals category", () => {
  const intent = intentForPearl();
  const partial = Array.from({ length: 8 }, (_, i) => enriched(aura(`Have Aura ${i}`)));
  const suggestion = suggestCardForCategory({ category: "ramp", partialRows: partial, pool: mixedPool(), intent });
  assert.equal(suggestion.exhausted, false);
  assert.ok(suggestion.offer.roles.includes("ramp"), "offer should actually be a ramp card");
  assert.ok(suggestion.reason.nearestAlternative, "should report a nearest alternative when more than one ramp card exists");
});

test("declining excludes that name and the next call offers a different card", () => {
  const intent = intentForPearl();
  const partial = Array.from({ length: 8 }, (_, i) => enriched(aura(`Have Aura ${i}`)));
  const pool = mixedPool();
  const first = suggestCardForCategory({ category: "ramp", partialRows: partial, pool, intent });
  const second = suggestCardForCategory({
    category: "ramp",
    partialRows: partial,
    pool,
    intent,
    declinedNames: [first.offer.name],
  });
  assert.notEqual(second.offer.name, first.offer.name);
  assert.ok(second.offer.roles.includes("ramp"));
});

test("a card already in the partial deck is never re-offered (singleton)", () => {
  const intent = intentForPearl();
  const pool = mixedPool();
  const alreadyIn = pool.find((c) => c.roles.includes("ramp"));
  const partial = [alreadyIn];
  const suggestion = suggestCardForCategory({ category: "ramp", partialRows: partial, pool, intent });
  assert.notEqual(suggestion.offer.name, alreadyIn.name);
});

test("winConditions category only offers threat/explicit-win-condition cards", () => {
  const intent = intentForPearl();
  const suggestion = suggestCardForCategory({ category: "winConditions", partialRows: [], pool: mixedPool(), intent });
  assert.equal(suggestion.exhausted, false);
  assert.ok(["Big Angel", "Barren Glory"].includes(suggestion.offer.name));
});

test("synergyPieces category only offers package core/support cards", () => {
  const intent = intentForPearl();
  const suggestion = suggestCardForCategory({ category: "synergyPieces", partialRows: [], pool: mixedPool(), intent });
  assert.equal(suggestion.exhausted, false);
  assert.equal(suggestion.offer.typeLine, "Enchantment — Aura");
});

test("reports exhausted when no eligible candidate remains", () => {
  const intent = intentForPearl();
  const pool = [enriched(draw("Only Draw"))];
  const suggestion = suggestCardForCategory({ category: "sweeper", partialRows: [], pool, intent });
  assert.equal(suggestion.exhausted, true);
  assert.equal(suggestion.offer, null);
});

test("declining every eligible card in turn eventually exhausts the category", () => {
  const intent = intentForPearl();
  const pool = Array.from({ length: 3 }, (_, i) => enriched(ramp(`Stone ${i}`)));
  const declined = [];
  let suggestion = suggestCardForCategory({ category: "ramp", partialRows: [], pool, intent, declinedNames: declined });
  let guard = 0;
  while (!suggestion.exhausted && guard < 10) {
    declined.push(suggestion.offer.name);
    suggestion = suggestCardForCategory({ category: "ramp", partialRows: [], pool, intent, declinedNames: declined });
    guard += 1;
  }
  assert.equal(suggestion.exhausted, true);
  assert.equal(declined.length, 3);
});
