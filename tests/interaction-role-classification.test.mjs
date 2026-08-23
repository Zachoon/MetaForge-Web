import assert from "node:assert/strict";
import test from "node:test";
import { ROLE_PATTERNS } from "../app/blueprint-note-and-mana.mjs";
import { classifyNativeCard } from "../app/card-role-classification.mjs";

// =============================================================================
// Founder #090: the "deals N damage to" alternative missed the real
// "divided damage" removal template — "deals N damage divided as you
// choose among...targets" (Arc Lightning, Boulderfall: 73 real cards via
// Scryfall) has no "to" immediately after "damage" at all. Confirmed via
// direct test: Fire Covenant (a real, popular EDH removal spell — see
// Founder #041's earlier fix, which used this same card for a different
// signal) returned no "interaction" role at all.
// =============================================================================

const fireCovenant = { name: "Fire Covenant", typeLine: "Instant", oracleText: "As an additional cost to cast this spell, you may sacrifice a creature. Fire Covenant deals 8 damage divided as you choose among one or two target creatures and/or planeswalkers. If a creature was sacrificed this way, this spell costs {6} less to cast." };
const arcLightning = { name: "Arc Lightning", typeLine: "Sorcery", oracleText: "Arc Lightning deals 3 damage divided as you choose among one, two, or three targets." };
const lightningBolt = { name: "Lightning Bolt", typeLine: "Instant", oracleText: "Lightning Bolt deals 3 damage to any target." };

test("blueprint-note-and-mana.mjs's ROLE_PATTERNS.interaction recognizes the real 'damage divided among targets' shape (Fire Covenant, Arc Lightning), not just 'damage to'", () => {
  const textOf = (card) => `${card.name}\n${card.typeLine}\n${card.oracleText}`;
  assert.equal(ROLE_PATTERNS.interaction.some((p) => p.test(textOf(fireCovenant))), true);
  assert.equal(ROLE_PATTERNS.interaction.some((p) => p.test(textOf(arcLightning))), true);
});

test("blueprint-note-and-mana.mjs's ROLE_PATTERNS.interaction still recognizes the pre-existing 'damage to' wording (Lightning Bolt)", () => {
  const textOf = (card) => `${card.name}\n${card.typeLine}\n${card.oracleText}`;
  assert.equal(ROLE_PATTERNS.interaction.some((p) => p.test(textOf(lightningBolt))), true);
});

test("card-role-classification.mjs's classifyNativeCard grants the 'interaction' role for real divided-damage removal (Fire Covenant, Arc Lightning), which returned no 'interaction' role at all before this fix", () => {
  assert.ok(classifyNativeCard(fireCovenant).includes("interaction"));
  assert.ok(classifyNativeCard(arcLightning).includes("interaction"));
});
