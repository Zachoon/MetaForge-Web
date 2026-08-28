import assert from "node:assert/strict";
import test from "node:test";
import CARD_MECHANICS from "../app/card-mechanics.mjs";
import { ROLE_PATTERNS, OFF_TARGET_SPELL_TYPE_CAST } from "../app/blueprint-note-and-mana.mjs";
import { classifyNativeCard, configureCardRoleTagLookup } from "../app/card-role-classification.mjs";
import { strategicSemanticsFor, configureCardTagLookup } from "../app/strategic-intent.mjs";

// Founder #059: Founder #056/#057 found and fixed a real bug in
// forge-interaction-graph.mjs — a bare "whenever you cast" match, and an
// unguarded "spell_payoff" database tag, both falsely connected off-target
// archetypes (enchantment/artifact/colorless/legendary spell payoffs, real
// cards: Sythis, Harvest's Hand; Smith/T'Challa; Ugin, Eye of the Storms;
// Chronicle Thief) to the instant/sorcery spellslinger signal. This file
// verifies the same real bug was found duplicated in two parallel
// classifiers — blueprint-note-and-mana.mjs's ROLE_PATTERNS.spells (a bare
// "whenever you cast" regex) and strategic-intent.mjs's/card-role-
// classification.mjs's own unguarded "spell_payoff" tag checks — and that
// all three now correctly exclude the same real off-target cards while
// still recognizing real spellslinger cards (Mizzix).
const lookup = (name) => CARD_MECHANICS[name] || [];
configureCardRoleTagLookup(lookup);
configureCardTagLookup(lookup);

const sythis = { name: "Sythis, Harvest's Hand", typeLine: "Legendary Creature", oracleText: "Whenever you cast an enchantment spell, you gain 1 life and draw a card." };
const ugin = { name: "Ugin, Eye of the Storms", typeLine: "Legendary Planeswalker — Ugin", oracleText: "Whenever you cast a colorless spell, exile up to one target permanent that's one or more colors." };
const mizzix = { name: "Mizzix of the Izmagnus", typeLine: "Legendary Creature", oracleText: "Whenever you cast an instant or sorcery spell with mana value greater than the number of experience counters you have, you get an experience counter." };

test("blueprint-note-and-mana.mjs's ROLE_PATTERNS.spells excludes the same off-target enchantment/colorless spell-cast triggers #056 fixed, but still matches real instant/sorcery triggers", () => {
  const textOf = (card) => `${card.name}\n${card.typeLine}\n${card.oracleText}`;
  assert.equal(ROLE_PATTERNS.spells.some((p) => p.test(textOf(sythis))), false);
  assert.equal(ROLE_PATTERNS.spells.some((p) => p.test(textOf(ugin))), false);
  assert.equal(ROLE_PATTERNS.spells.some((p) => p.test(textOf(mizzix))), true);
});

test("card-role-classification.mjs's classifyNativeCard doesn't grant the 'spells' role via the mistagged 'spell_payoff' tag for real off-target cards (Sythis, Ugin both carry the tag in the real database)", () => {
  assert.ok(CARD_MECHANICS["sythis, harvest's hand"].includes("spell_payoff"), "test assumption: Sythis really carries this tag");
  assert.ok(CARD_MECHANICS["ugin, eye of the storms"].includes("spell_payoff"), "test assumption: Ugin really carries this tag");
  assert.equal(classifyNativeCard(sythis).includes("spells"), false);
  assert.equal(classifyNativeCard(ugin).includes("spells"), false);
  assert.equal(classifyNativeCard(mizzix).includes("spells"), true);
});

test("strategic-intent.mjs's strategicSemanticsFor doesn't grant 'spell_payoff' via the mistagged tag either — this is the semantic cardSatisfiesSpellslingerSupport reads directly for real package-density occupancy", () => {
  assert.equal(strategicSemanticsFor(sythis).has("spell_payoff"), false);
  assert.equal(strategicSemanticsFor(ugin).has("spell_payoff"), false);
  assert.equal(strategicSemanticsFor(mizzix).has("spell_payoff"), true);
});

test("the shared OFF_TARGET_SPELL_TYPE_CAST export still recognizes untyped and instant/sorcery/noncreature triggers as NOT off-target — the exclusion doesn't over-narrow", () => {
  const joriEn = "Whenever you cast your second spell each turn, draw a card.";
  const saheeli = "Whenever you cast a noncreature spell, create a 1/1 colorless Servo artifact creature token.";
  assert.equal(OFF_TARGET_SPELL_TYPE_CAST.test(joriEn), false);
  assert.equal(OFF_TARGET_SPELL_TYPE_CAST.test(saheeli), false);
  assert.equal(OFF_TARGET_SPELL_TYPE_CAST.test(sythis.oracleText), true);
  assert.equal(OFF_TARGET_SPELL_TYPE_CAST.test(ugin.oracleText), true);
});

// Founder #101: Niv-Mizzet, Parun's real "Whenever a player casts an
// instant or sorcery spell, you draw a card." never matched any of the
// three parallel classifiers — all three only ever accepted first-person
// "you cast", never the real third-person "a player casts" template a
// political/symmetric spellslinger commander uses (verified 9 real cards
// via Scryfall: Bonus Round, Hive Mind, Rod of Absorption, and Niv-Mizzet
// himself among them). Same duplicated-classifier shape #059 already
// documented for the off-target-type guard — fixed in the same three
// places in the same round.
const nivMizzet = { name: "Niv-Mizzet, Parun", typeLine: "Legendary Creature", oracleText: "This spell can't be countered.\nFlying\nWhenever you draw a card, Niv-Mizzet deals 1 damage to any target.\nWhenever a player casts an instant or sorcery spell, you draw a card." };

test("Founder #101: all three parallel classifiers recognize the real third-person \"a player casts\" spellslinger-payoff subject (Niv-Mizzet, Parun), and the off-target exclusion still applies to it", () => {
  const textOf = (card) => `${card.name}\n${card.typeLine}\n${card.oracleText}`;
  assert.equal(ROLE_PATTERNS.spells.some((p) => p.test(textOf(nivMizzet))), true);
  assert.equal(classifyNativeCard(nivMizzet).includes("spells"), true);
  assert.equal(strategicSemanticsFor(nivMizzet).has("spell_payoff"), true);
  // A hypothetical off-target "a player casts an artifact spell" trigger
  // must stay excluded the same way the "you cast" form already is.
  const offTargetThirdPerson = "Whenever a player casts an artifact spell, this creature deals 1 damage to that player.";
  assert.equal(ROLE_PATTERNS.spells.some((p) => p.test(offTargetThirdPerson)), false);
});
