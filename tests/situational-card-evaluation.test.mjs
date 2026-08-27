import test from "node:test";
import assert from "node:assert/strict";
import {
  additionalCostRequirements,
  battlefieldRequirements,
  conditionalCostMechanics,
  evaluateSituationalCard,
  isManaFilterOnly,
  minimumUsefulMana,
  modalChoicePressure,
  opponentDependencies,
  repeatableCastMechanics,
  resourceCompetitionFactor,
  restrictedManaUses,
  timingConstraints,
} from "../app/situational-card-evaluation.mjs";
import { displayRoleFor } from "../app/adaptive-recommendation.mjs";
import { evaluateMulliganHand } from "../app/mulligan-coach.mjs";

const card = (name, typeLine, oracleText, manaCost = "{2}", cmc = 2) => ({ name, typeLine, oracleText, manaCost, cmc });
const land = (name = "Mountain") => card(name, "Basic Land — Mountain", "{T}: Add {R}.", "", 0);

test("paid mana filtering is not acceleration", () => {
  const prism = card("Prophetic Prism", "Artifact", "When this artifact enters, draw a card. {1}, {T}: Add one mana of any color.");
  assert.equal(isManaFilterOnly(prism), true);
  assert.notEqual(displayRoleFor(prism), "Acceleration");
});

test("additional costs expose the exact missing resource", () => {
  const dispute = card("Deadly Dispute", "Instant", "As an additional cost to cast this spell, sacrifice an artifact or creature. Draw two cards and create a Treasure token.", "{1}{B}", 2);
  const bigScore = card("Big Score", "Instant", "As an additional cost to cast this spell, discard a card. Draw two cards and create two Treasure tokens.", "{3}{R}", 4);
  assert.deepEqual(additionalCostRequirements(dispute), ["sacrifice-permanent"]);
  assert.deepEqual(additionalCostRequirements(bigScore), ["discard-card"]);
});

test("creature Auras are not creatureless opening development", () => {
  const aura = card("Rancor", "Enchantment — Aura", "Enchant creature. Enchanted creature gets +2/+0 and has trample.", "{G}", 1);
  assert.ok(battlefieldRequirements(aura).includes("creature-target"));
  const result = evaluateMulliganHand([land(), land("Mountain 2"), land("Mountain 3"), aura, card("Four", "Creature", "", "{3}{R}", 4), card("Five", "Creature", "", "{4}{R}", 5), card("Six", "Creature", "", "{5}{R}", 6)]);
  assert.equal(result.counts.earlyPlays, 0);
  assert.notEqual(result.sequence.recommendedCard, "Rancor");
});

test("tapped, delayed, once-per-turn, and summoning-sick resources carry timing constraints", () => {
  assert.ok(timingConstraints(card("Tapped Treasure", "Sorcery", "Create a tapped Treasure token.")).includes("created-resource-tapped"));
  assert.ok(timingConstraints(card("Slow Rock", "Artifact", "This artifact enters tapped. At the beginning of your next upkeep, add {C}.")).includes("delayed-trigger"));
  assert.ok(timingConstraints(card("Dork", "Creature", "{T}: Add {G}.", "{G}", 1)).includes("summoning-sickness"));
  assert.ok(timingConstraints(card("Limiter", "Artifact", "{T}: Add {C}. Activate only once each turn.")).includes("once-per-turn"));
});

test("restricted mana records what it may actually pay for", () => {
  const galazeth = card("Galazeth Prismari", "Creature", "Artifacts you control have ‘{T}: Add one mana of any color. Spend this mana only to cast an instant or sorcery spell.’");
  assert.deepEqual(restrictedManaUses(galazeth), ["an instant or sorcery spell"]);
  const powerstone = card("Powerstone", "Artifact", "{T}: Add {C}. This mana can't be spent to cast a nonartifact spell.");
  assert.ok(restrictedManaUses(powerstone).some((line) => /artifact/i.test(line)));
});

test("conditional cost mechanics never silently replace printed cost", () => {
  const mechanics = conditionalCostMechanics(card("Resourceful Spell", "Sorcery", "Convoke, improvise, delve. This spell costs {1} less to cast for each artifact you control.", "{8}", 8));
  for (const expected of ["convoke", "improvise", "delve", "conditional-discount"]) assert.ok(mechanics.includes(expected));
});

test("X spells carry a minimum useful mana instead of counting as free", () => {
  assert.equal(minimumUsefulMana(card("Hangarback Walker", "Artifact Creature", "This enters with X counters.", "{X}{X}", 0)), 2);
  assert.equal(minimumUsefulMana(card("Fireball", "Sorcery", "Fireball deals X damage.", "{X}{R}", 1)), 1);
});

test("repeatable and alternate casting mechanics remain distinct", () => {
  const read = repeatableCastMechanics(card("Many Lives", "Instant — Adventure", "Flashback. Buyback. Rebound. Escape. Plot. Foretell."));
  for (const expected of ["flashback", "buyback", "rebound", "escape", "adventure", "plot", "foretell"]) assert.ok(read.includes(expected));
});

test("opponent-dependent bursts are explicitly conditional", () => {
  const dockside = card("Dockside Extortionist", "Creature", "When this enters, create X Treasure tokens, where X is the number of artifacts and enchantments your opponents control.");
  assert.ok(opponentDependencies(dockside).includes("opponent-board"));
});

test("life, hand, and graveyard are treated as limited prerequisites", () => {
  const read = evaluateSituationalCard(card("Demanding Spell", "Sorcery", "As an additional cost to cast this spell, discard a card. Pay 3 life. Exile a card from your graveyard."));
  assert.ok(read.zoneRequirements.includes("hand-stock"));
  assert.ok(read.zoneRequirements.includes("graveyard-stock"));
  assert.ok(read.lifeRequirements.includes("life-payment"));
});

test("mutually exclusive and escalating modes are not additive promises", () => {
  const read = modalChoicePressure(card("Modal Spell", "Sorcery", "Spree. Choose one — • Draw a card. • Create a token. • Destroy target artifact."));
  assert.equal(read.mutuallyExclusive, true);
  assert.equal(read.escalatingCost, true);
  assert.ok(read.modeSignals >= 3);
});

test("multiple consumers competing for too little fodder are discounted", () => {
  const consumer = card("Artifact Eater", "Creature", "Sacrifice an artifact: Draw a card.");
  const scarce = { producerCounts: new Map([["artifacts", 1]]), claimCounts: new Map([["artifact-fodder", 3]]) };
  const abundant = { producerCounts: new Map([["artifacts", 5]]), claimCounts: new Map([["artifact-fodder", 1]]) };
  assert.ok(resourceCompetitionFactor(consumer, scarce) < resourceCompetitionFactor(consumer, abundant));
});
