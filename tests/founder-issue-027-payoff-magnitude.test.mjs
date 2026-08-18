import assert from "node:assert/strict";
import test from "node:test";
import {
  cardClearsPayoffMagnitudeGate,
  commanderPayoffMagnitudeGates,
  forgeNativeMasterwork,
  payoffMagnitudeHitsFor,
} from "../app/native-masterwork-engine.mjs";

// =============================================================================
// Founder #027 — Payoff-magnitude overcredit
// =============================================================================
// A commander that only rewards a spell/permanent of a given type once it
// clears a numeric bar ("whenever you cast an artifact spell with mana value
// 4 or greater") is not the same promise as "artifacts matter" — a candidate
// that shares the type but misses the bar can never trigger it. This is a
// general parser over the commander's own oracle text, not a name branch:
// every fixture below uses an invented commander name.
// =============================================================================

test("Founder #027: parses a mana-value-qualified artifact payoff off the commander's own text", () => {
  const oracle = "Whenever this enters or attacks, create a tapped Vibranium token. Whenever you cast an artifact spell with mana value 4 or greater, put two +1/+1 counters on this.";
  const gates = commanderPayoffMagnitudeGates(oracle);
  assert.deepEqual(gates, [{ typeWord: "artifact", metric: "manaValue", threshold: 4, direction: "atLeast" }]);
});

test("Founder #027: a candidate that isn't the gated type is untouched (null, not false)", () => {
  const gate = { typeWord: "artifact", metric: "manaValue", threshold: 4, direction: "atLeast" };
  assert.equal(cardClearsPayoffMagnitudeGate({ typeLine: "Instant", manaCost: "{5}{U}", cmc: 6 }, gate), null);
});

test("Founder #027: a type-matched candidate below the bar does not clear it; one at or above does", () => {
  const gate = { typeWord: "artifact", metric: "manaValue", threshold: 4, direction: "atLeast" };
  assert.equal(cardClearsPayoffMagnitudeGate({ typeLine: "Artifact Creature — Construct", manaCost: "{2}", cmc: 2 }, gate), false);
  assert.equal(cardClearsPayoffMagnitudeGate({ typeLine: "Artifact", manaCost: "{4}", cmc: 4 }, gate), true);
  assert.equal(cardClearsPayoffMagnitudeGate({ typeLine: "Artifact", manaCost: "{7}", cmc: 7 }, gate), true);
});

test("Founder #027: an X-cost artifact spell is graded on its real curve window, not printed mana value 0", () => {
  const gate = { typeWord: "artifact", metric: "manaValue", threshold: 4, direction: "atLeast" };
  // curveManaValue treats {X}{X}{2} as 4 (see Founder #026's own curve rule) —
  // the same real-cast-window logic a payoff gate must reuse, not a fresh guess.
  assert.equal(cardClearsPayoffMagnitudeGate({ typeLine: "Artifact", manaCost: "{X}{X}{2}", cmc: 2 }, gate), true);
});

test("Founder #027: generalizes to a different metric — power, not mana value", () => {
  const oracle = "Whenever you cast a creature spell with power 4 or greater, draw a card.";
  const gates = commanderPayoffMagnitudeGates(oracle);
  assert.deepEqual(gates, [{ typeWord: "creature", metric: "power", threshold: 4, direction: "atLeast" }]);
  assert.equal(cardClearsPayoffMagnitudeGate({ typeLine: "Creature — Bear", power: "2", toughness: "2" }, gates[0]), false);
  assert.equal(cardClearsPayoffMagnitudeGate({ typeLine: "Creature — Giant", power: "4", toughness: "4" }, gates[0]), true);
  assert.equal(cardClearsPayoffMagnitudeGate({ typeLine: "Creature — Giant", power: "*", toughness: "*" }, gates[0]), false, "an unresolvable */* stat is withheld, not presumed");
});

test("Founder #027: generalizes to the mirror direction — N or less, a different type and threshold", () => {
  const oracle = "Whenever you cast an enchantment spell with mana value 2 or less, scry 2.";
  const gates = commanderPayoffMagnitudeGates(oracle);
  assert.deepEqual(gates, [{ typeWord: "enchantment", metric: "manaValue", threshold: 2, direction: "atMost" }]);
  assert.equal(cardClearsPayoffMagnitudeGate({ typeLine: "Enchantment", manaCost: "{3}{W}", cmc: 4 }, gates[0]), false);
  assert.equal(cardClearsPayoffMagnitudeGate({ typeLine: "Enchantment", manaCost: "{W}", cmc: 1 }, gates[0]), true);
});

test("Founder #027: payoffMagnitudeHitsFor counts only cleared gates, never penalizes a type-only match", () => {
  const gates = [
    { typeWord: "artifact", metric: "manaValue", threshold: 4, direction: "atLeast" },
  ];
  assert.equal(payoffMagnitudeHitsFor({ typeLine: "Artifact", manaCost: "{1}", cmc: 1 }, gates), 0);
  assert.equal(payoffMagnitudeHitsFor({ typeLine: "Artifact", manaCost: "{6}", cmc: 6 }, gates), 1);
  assert.equal(payoffMagnitudeHitsFor({ typeLine: "Sorcery", manaCost: "{6}", cmc: 6 }, gates), 0, "not the gated type at all");
});

// -----------------------------------------------------------------------------
// Full construction: the structured gate above must actually change what gets
// selected, not just exist as inert metadata. Two artifacts identical in every
// scoring dimension except mana value — one clears the commander's own
// magnitude-qualified trigger, one does not.
// -----------------------------------------------------------------------------

const payoffCommander = {
  name: "Circuitwright, Vibranium Heir",
  colors: ["G", "W"],
  oracleText: "Whenever this enters or attacks, create a tapped Vibranium token. (It's an artifact with indestructible and \"{T}: Add {C}. This mana can't be spent to cast a nonartifact spell.\") Whenever you cast an artifact spell with mana value 4 or greater, put two +1/+1 counters on this.",
};

const belowBarArtifact = {
  name: "Dormant Cog",
  typeLine: "Artifact",
  oracleText: "This artifact enters tapped.",
  manaCost: "{2}",
  cmc: 2,
  colorIdentity: [],
  popularityRank: 40,
  priceUsd: 1,
};

const atBarArtifact = {
  name: "Overclocked Forge",
  typeLine: "Artifact",
  oracleText: "This artifact enters tapped.",
  manaCost: "{5}",
  cmc: 5,
  colorIdentity: [],
  popularityRank: 40,
  priceUsd: 1,
};

const gwFiller = [
  ...Array.from({ length: 28 }, (_, i) => ({ name: `Flow ${i}`, oracleText: "When this enters, draw a card. Scry 1.", typeLine: "Creature — Test", manaCost: "{2}{G}{W}", colorIdentity: ["G", "W"] })),
  ...Array.from({ length: 24 }, (_, i) => ({ name: `Answer ${i}`, oracleText: "Exile target nonland permanent.", typeLine: "Instant", manaCost: "{1}{G}", colorIdentity: ["G"] })),
  ...Array.from({ length: 18 }, (_, i) => ({ name: `Shield ${i}`, oracleText: "Target creature gains hexproof and indestructible until end of turn.", typeLine: "Instant", manaCost: "{1}{W}", colorIdentity: ["W"] })),
  ...Array.from({ length: 18 }, (_, i) => ({ name: `Stone ${i}`, oracleText: "Add one mana. Create a Treasure token.", typeLine: "Artifact", manaCost: "{2}", colorIdentity: [] })),
];

const gwDuals = Array.from({ length: 20 }, (_, i) => ({
  name: `Canopy Gate ${i}`,
  oracleText: "This land enters the battlefield tapped. {T}: Add {G} or {W}.",
  typeLine: "Land",
  manaCost: "",
  colorIdentity: ["G", "W"],
  producedMana: ["G", "W"],
  popularityRank: 5,
  priceUsd: 0.5,
}));

test("Founder #027: construction favors the same-type artifact that actually clears the commander's magnitude bar", () => {
  const report = forgeNativeMasterwork({
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    seed: 11,
    commander: payoffCommander,
    cards: [...gwFiller, belowBarArtifact, atBarArtifact, ...gwDuals],
  });
  const names = new Set(report.selected.rows.map((row) => row.name));
  assert.ok(names.has("Overclocked Forge"), "the mana-value-4+ artifact that actually triggers the commander clears the bar and should be picked");
  assert.ok(!names.has("Dormant Cog"), "an otherwise-identical cheap artifact that never triggers the commander should not win the same slot");
});

test("Founder #027: a live-flavor T'Challa-shaped commander scores its own mana-value-4 artifact above an identical cheap one", () => {
  const gates = commanderPayoffMagnitudeGates(payoffCommander.oracleText);
  assert.equal(gates.length, 1);
  assert.equal(payoffMagnitudeHitsFor(belowBarArtifact, gates), 0);
  assert.equal(payoffMagnitudeHitsFor(atBarArtifact, gates), 1);
});
