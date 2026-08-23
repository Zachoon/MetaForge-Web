import assert from "node:assert/strict";
import test from "node:test";
import { ROLE_PATTERNS } from "../app/blueprint-note-and-mana.mjs";
import { classifyNativeCard } from "../app/card-role-classification.mjs";

// =============================================================================
// Founder #088: the same real "mill"/"mills" third-person verb gap forge-
// interaction-graph.mjs's own PRODUCERS.graveyard already fixed (Founder
// #042) — "mill " (with a trailing space) never matches "mills" (no space
// right after "mill" once the "s" is added) — duplicated here in
// blueprint-note-and-mana.mjs's own parallel role classifier
// (ROLE_PATTERNS.graveyard), found in the same audit pass as #086/#087.
// The bare "/graveyard/i" alternative doesn't rescue this the way it does
// for cards that also separately mention "graveyard" elsewhere: Mindcrank
// and Psychic Corrosion (the same two real mill-payoff cards #042 used)
// never say "graveyard" anywhere in their own real text, so both returned
// zero "graveyard" role at all — confirmed via direct test.
// =============================================================================

const mindcrank = { name: "Mindcrank", typeLine: "Artifact", oracleText: "Whenever an opponent loses life, that player mills that many cards." };
const psychicCorrosion = { name: "Psychic Corrosion", typeLine: "Enchantment", oracleText: "Whenever you draw a card, each opponent mills two cards." };
const imperativeMill = { name: "Test Imperative Mill", typeLine: "Sorcery", oracleText: "Target player mills three cards." };

test("blueprint-note-and-mana.mjs's ROLE_PATTERNS.graveyard recognizes the real third-person 'mills' verb form (Mindcrank, Psychic Corrosion), not just imperative 'mill'", () => {
  const textOf = (card) => `${card.name}\n${card.typeLine}\n${card.oracleText}`;
  assert.equal(ROLE_PATTERNS.graveyard.some((p) => p.test(textOf(mindcrank))), true);
  assert.equal(ROLE_PATTERNS.graveyard.some((p) => p.test(textOf(psychicCorrosion))), true);
});

test("blueprint-note-and-mana.mjs's ROLE_PATTERNS.graveyard still recognizes the pre-existing imperative wording, and the word boundary stops an unrelated 'Millstone'-named card from false-matching on the bare substring", () => {
  const textOf = (card) => `${card.name}\n${card.typeLine}\n${card.oracleText}`;
  assert.equal(ROLE_PATTERNS.graveyard.some((p) => p.test(textOf(imperativeMill))), true);
  assert.equal(/\bmills?\b/i.test("Millstone Guard has vigilance."), false);
});

test("card-role-classification.mjs's classifyNativeCard grants the 'graveyard' role for real mill-payoff cards (Mindcrank, Psychic Corrosion), which returned zero 'graveyard' role at all before this fix", () => {
  assert.ok(classifyNativeCard(mindcrank).includes("graveyard"));
  assert.ok(classifyNativeCard(psychicCorrosion).includes("graveyard"));
});
