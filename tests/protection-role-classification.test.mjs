import assert from "node:assert/strict";
import test from "node:test";
import { ROLE_PATTERNS } from "../app/blueprint-note-and-mana.mjs";
import { classifyNativeCard } from "../app/card-role-classification.mjs";

// =============================================================================
// Founder #095: swept every OTHER role in ROLE_PATTERNS against the full
// 4,060-card mined corpus (see project audit history), not just
// interaction. "Ward" — one of the most common protection keywords
// printed since 2021 — had NO coverage at all. 33 real cards in the mined
// corpus alone use it (Sedgemoor Witch, Miirym Sentinel Wyrm, Kitesail
// Larcenist), all returning zero "protection" credit. Confirmed via
// direct test.
// =============================================================================

const sedgemoorWitch = { name: "Sedgemoor Witch", typeLine: "Creature — Human Witch", oracleText: "Menace\nWard—Pay 3 life. (Whenever this creature becomes the target of a spell or ability an opponent controls, counter it unless that player pays 3 life.)\nMagecraft — Whenever you cast or copy an instant or sorcery spell, create a 1/1 black and green Pest creature token with \"When this creature dies, you gain 1 life.\"" };
const miirym = { name: "Miirym, Sentinel Wyrm", typeLine: "Legendary Creature — Dragon", oracleText: "Flying, ward {2}\nWhenever another nontoken Dragon you control enters, create a token that's a copy of it, except the token isn't legendary." };
const hexproofCreature = { name: "Test Hexproof Creature", typeLine: "Creature", oracleText: "This creature has hexproof." };
const award = { name: "Test Award Card", typeLine: "Enchantment", oracleText: "This creature receives an award for bravery." };

test("blueprint-note-and-mana.mjs's ROLE_PATTERNS.protection recognizes the real Ward keyword (Sedgemoor Witch, Miirym, Sentinel Wyrm)", () => {
  const textOf = (card) => `${card.name}\n${card.typeLine}\n${card.oracleText}`;
  assert.equal(ROLE_PATTERNS.protection.some((p) => p.test(textOf(sedgemoorWitch))), true);
  assert.equal(ROLE_PATTERNS.protection.some((p) => p.test(textOf(miirym))), true);
});

test("blueprint-note-and-mana.mjs's ROLE_PATTERNS.protection still recognizes the pre-existing hexproof wording", () => {
  const textOf = (card) => `${card.name}\n${card.typeLine}\n${card.oracleText}`;
  assert.equal(ROLE_PATTERNS.protection.some((p) => p.test(textOf(hexproofCreature))), true);
});

test("card-role-classification.mjs's classifyNativeCard grants the 'protection' role for Sedgemoor Witch and Miirym, which returned no 'protection' role at all before this fix", () => {
  assert.ok(classifyNativeCard(sedgemoorWitch).includes("protection"));
  assert.ok(classifyNativeCard(miirym).includes("protection"));
});

test("the new \\bward\\b shape does not false-positive on the unrelated word 'award'", () => {
  assert.equal(ROLE_PATTERNS.protection.some((p) => p.test(`${award.name}\n${award.typeLine}\n${award.oracleText}`)), false);
});
