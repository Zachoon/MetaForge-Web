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

// =============================================================================
// Founder #091: the "return target...owner's hand" bounce alternative had
// a {0,25} character window between "target" and "owner's hand" — too
// narrow for Cyclonic Rift's real text ("target nonland permanent you
// don't control to its owner's hand", 41 characters), arguably THE single
// most iconic and powerful card in the entire Commander format. Confirmed
// via direct test: Cyclonic Rift returned ZERO roles at all, not just
// missing "interaction". Widened to {0,45}.
// =============================================================================

const cyclonicRift = { name: "Cyclonic Rift", typeLine: "Instant", oracleText: "Return target nonland permanent you don't control to its owner's hand.\nOverload {6}{U} (You may cast this spell for its overload cost. If you do, change \"target\" in its text to \"each.\")" };
const boomerang = { name: "Boomerang", typeLine: "Instant", oracleText: "Return target permanent to its owner's hand." };

// =============================================================================
// Founder #092: sourced a real, top-rated Kinnan, Bonder Prodigy cEDH
// decklist from Moxfield to verify #086-#091's real-deck impact. The bare
// "exile target" alternative required "exile" immediately adjacent to
// "target", missing the real "mass exile" template that inserts a
// quantifier between them — "Exile any number of target spells" (Mindbreak
// Trap, a real free counterspell played in this exact decklist). Confirmed
// via direct test: Mindbreak Trap returned ZERO roles at all before this
// fix, the same failure class as #091's Cyclonic Rift.
// =============================================================================

const mindbreakTrap = { name: "Mindbreak Trap", typeLine: "Instant — Trap", oracleText: "If an opponent cast three or more spells this turn, you may pay {0} rather than pay this spell's mana cost.\nExile any number of target spells." };
const exileTargetCreature = { name: "Test Exile Removal", typeLine: "Instant", oracleText: "Exile target creature." };

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

test("blueprint-note-and-mana.mjs's ROLE_PATTERNS.interaction recognizes Cyclonic Rift's real, longer 'return target...owner's hand' clause (41 characters), not just Boomerang's short pre-existing wording", () => {
  const textOf = (card) => `${card.name}\n${card.typeLine}\n${card.oracleText}`;
  assert.equal(ROLE_PATTERNS.interaction.some((p) => p.test(textOf(cyclonicRift))), true);
  assert.equal(ROLE_PATTERNS.interaction.some((p) => p.test(textOf(boomerang))), true);
});

test("card-role-classification.mjs's classifyNativeCard grants the 'interaction' role for Cyclonic Rift, which returned ZERO roles at all before this fix", () => {
  assert.ok(classifyNativeCard(cyclonicRift).includes("interaction"));
});

test("blueprint-note-and-mana.mjs's ROLE_PATTERNS.interaction recognizes Mindbreak Trap's real 'exile any number of target' shape, not just bare 'exile target'", () => {
  const textOf = (card) => `${card.name}\n${card.typeLine}\n${card.oracleText}`;
  assert.equal(ROLE_PATTERNS.interaction.some((p) => p.test(textOf(mindbreakTrap))), true);
  assert.equal(ROLE_PATTERNS.interaction.some((p) => p.test(textOf(exileTargetCreature))), true);
});

test("card-role-classification.mjs's classifyNativeCard grants the 'interaction' role for Mindbreak Trap, which returned ZERO roles at all before this fix", () => {
  assert.ok(classifyNativeCard(mindbreakTrap).includes("interaction"));
});
