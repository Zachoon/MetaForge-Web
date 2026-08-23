import assert from "node:assert/strict";
import test from "node:test";
import { ROLE_PATTERNS } from "../app/blueprint-note-and-mana.mjs";
import { classifyNativeCard } from "../app/card-role-classification.mjs";

// =============================================================================
// Founder #087: the same real third-person "draws" verb gap forge-
// interaction-graph.mjs's own PRODUCERS.draw already fixed (Founder #043)
// — the imperative "draw a card" phrasing missed the third-person "draws"
// verb real wheel effects use (no space right after "draw" once an "s" is
// added), duplicated here in blueprint-note-and-mana.mjs's own parallel
// role classifier (ROLE_PATTERNS.draw), found right after #086 shipped the
// sibling "sacrifice" fix in the same file. Confirmed via direct test:
// Wheel of Fortune ("draws seven cards") and Nekusar, the Mindrazer's own
// trigger ("that player draws an additional card") — two of the format's
// most iconic wheel/draw-punisher cards — both failed to register the
// "draw" role at all. Reused forge-interaction-graph.mjs's exact
// already-verified pattern rather than re-deriving it.
// =============================================================================

const wheelOfFortune = { name: "Wheel of Fortune", typeLine: "Sorcery", oracleText: "Each player discards their hand, then draws seven cards." };
const nekusar = { name: "Nekusar, the Mindrazer", typeLine: "Legendary Creature", oracleText: "At the beginning of each player's draw step, that player draws an additional card.\nWhenever an opponent draws a card, Nekusar deals 1 damage to that player." };
const simpleDraw = { name: "Test Draw a Card", typeLine: "Instant", oracleText: "Draw a card." };
const windfall = { name: "Windfall", typeLine: "Sorcery", oracleText: "Each player discards their hand, then draws cards equal to the greatest number of cards a player discarded this way." };

test("blueprint-note-and-mana.mjs's ROLE_PATTERNS.draw recognizes the real third-person 'draws' verb form (Wheel of Fortune, Nekusar's own trigger, Windfall's variable-count phrasing), not just imperative 'draw'", () => {
  const textOf = (card) => `${card.name}\n${card.typeLine}\n${card.oracleText}`;
  assert.equal(ROLE_PATTERNS.draw.some((p) => p.test(textOf(wheelOfFortune))), true);
  assert.equal(ROLE_PATTERNS.draw.some((p) => p.test(textOf(nekusar))), true);
  assert.equal(ROLE_PATTERNS.draw.some((p) => p.test(textOf(windfall))), true);
});

test("blueprint-note-and-mana.mjs's ROLE_PATTERNS.draw still recognizes the pre-existing imperative wording", () => {
  const textOf = (card) => `${card.name}\n${card.typeLine}\n${card.oracleText}`;
  assert.equal(ROLE_PATTERNS.draw.some((p) => p.test(textOf(simpleDraw))), true);
});

test("card-role-classification.mjs's classifyNativeCard grants the 'draw' role for real wheel effects (Wheel of Fortune, Nekusar), which failed to register the role at all before this fix", () => {
  assert.ok(classifyNativeCard(wheelOfFortune).includes("draw"));
  assert.ok(classifyNativeCard(nekusar).includes("draw"));
});
