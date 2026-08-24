import assert from "node:assert/strict";
import test from "node:test";
import { ROLE_PATTERNS } from "../app/blueprint-note-and-mana.mjs";
import { classifyNativeCard } from "../app/card-role-classification.mjs";

// =============================================================================
// Founder #098: found by cross-referencing this file's role classifications
// against forge-interaction-graph.mjs's independently-built PRODUCERS/
// PAYOFFS.tokens across the full mined corpus (see the construction-
// quality-audit memory) — this one category disagreed in exactly one
// direction across 92 real cards, a strong signal of a real gap rather
// than an intentional semantic difference (most other shared category
// names, like "artifacts"/"spells", genuinely ask different questions in
// each file and were correctly left alone). The old pattern required
// literal imperative "create" (never "creates"), one of a fixed
// quantifier-word list (no "an"), and a {0,45} window — missing the real
// third-person verb form, the "an" quantifier, long type-line descriptors
// exceeding 45 characters, and named/legendary tokens where a proper noun
// intervenes before any quantifier. Also missing the entire payoff side
// of the mechanic (cards that care about tokens they already have).
// =============================================================================

const generousGift = { name: "Generous Gift", typeLine: "Sorcery", oracleText: "Destroy target permanent. Its controller creates a 3/3 green Elephant creature token." };
const sunfall = { name: "Sunfall", typeLine: "Sorcery", oracleText: "Exile all creatures. Incubate X, where X is the number of creatures exiled this way. (Create an Incubator token with X +1/+1 counters on it and \"{2}: Transform this token.\" It transforms into a 0/0 Phyrexian artifact creature.)" };
const vishgraz = { name: "Vishgraz, the Doomhive", typeLine: "Legendary Creature — Phyrexian Insect", oracleText: "Menace, toxic 1 (Players dealt combat damage by this creature also get a poison counter.)\nWhen Vishgraz enters, create three 1/1 colorless Phyrexian Mite artifact creature tokens with toxic 1 and \"This token can't block.\"\nVishgraz gets +1/+1 for each poison counter your opponents have." };
const kariZev = { name: "Kari Zev, Skyship Raider", typeLine: "Legendary Creature — Human Pirate", oracleText: "First strike, menace\nWhenever Kari Zev attacks, create Ragavan, a legendary 2/1 red Monkey creature token. Ragavan enters tapped and attacking. Exile that token at end of combat." };
const neyali = { name: "Neyali, Suns' Vanguard", typeLine: "Legendary Creature — Human Soldier", oracleText: "Attacking tokens you control have double strike.\nWhenever one or more tokens you control attack a player, exile the top card of your library. During any turn you attacked with a token, you may play that card." };
const swanSong = { name: "Swan Song", typeLine: "Instant", oracleText: "Counter target enchantment, instant, or sorcery spell. Its controller creates a 2/2 blue Bird creature token with flying." };
const createABear = { name: "Test Bear Maker", typeLine: "Sorcery", oracleText: "Create a 2/2 green Bear creature token." };

test("blueprint-note-and-mana.mjs's ROLE_PATTERNS.tokens recognizes the real third-person 'creates' verb form (Generous Gift, Swan Song — real removal spells that hand the opponent a token), not just imperative 'create'", () => {
  const textOf = (card) => `${card.name}\n${card.typeLine}\n${card.oracleText}`;
  assert.equal(ROLE_PATTERNS.tokens.some((p) => p.test(textOf(generousGift))), true);
  assert.equal(ROLE_PATTERNS.tokens.some((p) => p.test(textOf(swanSong))), true);
});

test("blueprint-note-and-mana.mjs's ROLE_PATTERNS.tokens recognizes 'an' as a quantifier (Sunfall's real Incubate reminder text: 'Create an Incubator token')", () => {
  assert.equal(ROLE_PATTERNS.tokens.some((p) => p.test(`${sunfall.name}\n${sunfall.typeLine}\n${sunfall.oracleText}`)), true);
});

test("blueprint-note-and-mana.mjs's ROLE_PATTERNS.tokens recognizes a long real type-line descriptor between quantity and 'token' (Vishgraz, the Doomhive: 47 characters, wider than the old {0,45} window)", () => {
  assert.equal(ROLE_PATTERNS.tokens.some((p) => p.test(`${vishgraz.name}\n${vishgraz.typeLine}\n${vishgraz.oracleText}`)), true);
});

test("blueprint-note-and-mana.mjs's ROLE_PATTERNS.tokens recognizes a named/legendary token where a proper noun intervenes before any quantifier (Kari Zev, Skyship Raider's real Ragavan token — one of the format's most iconic token-producing commanders)", () => {
  assert.equal(ROLE_PATTERNS.tokens.some((p) => p.test(`${kariZev.name}\n${kariZev.typeLine}\n${kariZev.oracleText}`)), true);
});

test("blueprint-note-and-mana.mjs's ROLE_PATTERNS.tokens recognizes the payoff side of the mechanic — cards that care about tokens they already have, never creating any themselves (Neyali, Suns' Vanguard)", () => {
  assert.equal(ROLE_PATTERNS.tokens.some((p) => p.test(`${neyali.name}\n${neyali.typeLine}\n${neyali.oracleText}`)), true);
});

test("blueprint-note-and-mana.mjs's ROLE_PATTERNS.tokens still recognizes the pre-existing plain imperative wording", () => {
  assert.equal(ROLE_PATTERNS.tokens.some((p) => p.test(`${createABear.name}\n${createABear.typeLine}\n${createABear.oracleText}`)), true);
});

test("card-role-classification.mjs's classifyNativeCard grants the 'tokens' role for Generous Gift, Sunfall, Vishgraz, Kari Zev, and Neyali, which all returned no 'tokens' role at all before this fix", () => {
  assert.ok(classifyNativeCard(generousGift).includes("tokens"));
  assert.ok(classifyNativeCard(sunfall).includes("tokens"));
  assert.ok(classifyNativeCard(vishgraz).includes("tokens"));
  assert.ok(classifyNativeCard(kariZev).includes("tokens"));
  assert.ok(classifyNativeCard(neyali).includes("tokens"));
});
