import assert from "node:assert/strict";
import test from "node:test";
import { buildStrategicIntent, strategicSemanticsFor } from "../app/strategic-intent.mjs";
import { extractMechanicalSignals } from "../app/forge-interaction-graph.mjs";
import { classifyNativeCard, colorPipsFromCost } from "../app/native-masterwork-engine.mjs";
import { scoreGuidedCandidate, suggestCardForCategory } from "../app/guided-suggestion.mjs";
import { threeWayComparison } from "../app/slot-comparison.mjs";

const commander = {
  name: "Titania, Protector of Argoth",
  colors: ["G"],
  oracleText: "When Titania enters, create a 5/3 green Elemental creature token. Whenever a land you control is put into a graveyard from the battlefield, create a 5/3 green Elemental creature token.",
  typeLine: "Legendary Creature — Elemental",
  manaCost: "{3}{G}{G}",
};

const card = (name, typeLine, oracleText, cmc, manaCost, priceUsd = 0.25) => ({
  name, typeLine, oracleText, cmc, manaCost, priceUsd, colorIdentity: ["G"],
});

function enriched(entry) {
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
    commanderConnectionSignals: [],
    sequenceStages: entry.cmc <= 2 ? ["setup"] : entry.cmc >= 5 ? ["close"] : ["convert"],
    score: 40,
  };
}

const parade = () => enriched(card(
  "Springleaf Parade",
  "Enchantment",
  "When this enchantment enters, create X 1/1 colorless Shapeshifter creature tokens with changeling. (They're every creature type.)\nCreature tokens you control have \"{T}: Add one mana of any color.\"",
  2,
  "{X}{G}{G}",
  7.02,
));
const cabbage = () => enriched(card(
  "The Cabbage Merchant",
  "Legendary Creature — Human Citizen",
  "Whenever an opponent casts a noncreature spell, create a Food token. (It's an artifact with \"{2}, {T}, Sacrifice this token: You gain 3 life.\")\nWhenever a creature deals combat damage to you, sacrifice a Food token.\nTap two untapped Foods you control: Add one mana of any color.",
  3,
  "{2}{G}",
  30.56,
));
const awaken = () => enriched(card(
  "Awaken the Woods",
  "Sorcery",
  "Create X 1/1 green Forest Dryad land creature tokens. (They're affected by summoning sickness.)",
  2,
  "{X}{G}{G}",
  12.98,
));

function intent() {
  return buildStrategicIntent(
    { format: "Commander", strategy: "Balanced midrange", commander, note: "" },
    { blueprint: { source: "", requestedMechanics: [], desiredRoles: [], packageSignals: [], promises: [] }, roleTargets: { ramp: 10, draw: 10, interaction: 10 } },
  );
}

test("a same-job runner-up is shown with real factor gaps, and a different job is hidden", () => {
  const suggestion = suggestCardForCategory({
    category: "ramp",
    partialRows: [],
    pool: [parade(), cabbage(), enriched(card("Cancel", "Instant", "Counter target spell.", 3, "{1}{U}{U}"))],
    intent: intent(),
  });
  assert.equal(suggestion.exhausted, false);
  assert.ok(suggestion.comparison, "both ramp cards compete for the slot even when one also draws");
  const names = [suggestion.comparison.winner.name, suggestion.comparison.runnerUp.name].sort();
  assert.deepEqual(names, ["Springleaf Parade", "The Cabbage Merchant"]);
  assert.match(suggestion.comparison.sharedSlot, /ramp slot/);
  assert.ok(suggestion.comparison.winnerReasons.length >= 2);
  assert.ok(suggestion.comparison.winnerReasons.length <= 3);
  const onlyDifferent = suggestCardForCategory({
    category: "ramp",
    partialRows: [],
    pool: [parade()],
    intent: intent(),
  });
  assert.equal(onlyDifferent.comparison, null);
});

test("a player's own card is ranked against the top two and still included when it fills another role", () => {
  const built = intent();
  const pool = [parade(), cabbage()];
  const suggestion = suggestCardForCategory({ category: "ramp", partialRows: [], pool, intent: built });
  const user = awaken();
  const scored = scoreGuidedCandidate("ramp", user, {}, [], built);
  const comparison = threeWayComparison("ramp", scored, suggestion.contenders, {
    competes: (candidate) => (candidate.roles || []).includes("ramp"),
  });
  assert.equal(comparison.ranked.length, 3);
  assert.deepEqual(comparison.ranked.map((card) => card.place), [1, 2, 3]);
  const names = comparison.ranked.map((card) => card.name);
  assert.ok(names.includes("Springleaf Parade"));
  assert.ok(names.includes("The Cabbage Merchant"));
  assert.ok(names.includes("Awaken the Woods"));
  const picked = comparison.ranked.find((card) => card.picked);
  assert.equal(picked.name, "Awaken the Woods");
  for (const card of comparison.ranked) {
    for (const key of ["roleFit", "synergy", "manaEfficiency", "gapFilled", "bracketImpact"]) {
      assert.equal(typeof card.factors[key], "number");
    }
  }
  const ranks = comparison.ranked.map((card) => card.rank);
  assert.deepEqual(ranks, [...ranks].sort((left, right) => right - left));
  if (!picked.sameSlot) assert.match(comparison.differentRole, /Awaken the Woods/);
  else assert.equal(comparison.differentRole, null);
});
