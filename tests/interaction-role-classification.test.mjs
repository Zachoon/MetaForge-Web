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

// =============================================================================
// Founder #093: mined all ~3,568 unique cards across ~80 already-scraped
// real Moxfield decklists through classifyNativeCard directly, looking for
// zero-role results the same way #092 found Mindbreak Trap — the
// highest-yield single pass of the whole audit thread. Two more real,
// distinct gaps surfaced in this exact array.
// (1) The bounce alternative required literal singular "target" right
// after "return" and singular "owner's hand". Real mass-bounce templates
// drop "target" entirely (Evacuation: "Return all creatures to their
// owners' hands") or pluralize to "owners' hands" (apostrophe after the
// s — Undo: "Return two target creatures to their owners' hands").
// Confirmed via direct test: Evacuation and Whelming Wave, two of the
// format's most reprinted mass-bounce board wipes, both returned ZERO
// roles. Validated the widened pattern against the full mined corpus: 63
// newly-matching real cards, zero false positives.
// (2) "Fight" effects (Savage Punch, Outmuscle) and their "deals damage
// equal to its power" cousins (Infectious Bite, Ram Through) are a real
// green/red removal sub-archetype with no coverage at all. A bare
// "fights?" word-boundary match would false-positive on Food Fight (a
// real card with an unrelated damage ability — cardText scans the card's
// own name too, and "Fight" is a whole word inside "Food Fight"), so
// scoped to "fights target/another/up to/a different" instead — the real
// templates fight effects use. Validated against the full mined corpus:
// 25 real fight/power-damage removal cards matched, Food Fight correctly
// excluded, zero other false positives.
// =============================================================================

const evacuation = { name: "Evacuation", typeLine: "Instant", oracleText: "Return all creatures to their owners' hands." };
const whelmingWave = { name: "Whelming Wave", typeLine: "Sorcery", oracleText: "Return all creatures to their owners' hands except for Krakens, Leviathans, Octopuses, and Serpents." };
const savagePunch = { name: "Savage Punch", typeLine: "Sorcery", oracleText: "Target creature you control fights target creature you don't control.\nFerocious — The creature you control gets +2/+2 until end of turn before it fights if it has power 4 or greater." };
const infectiousBite = { name: "Infectious Bite", typeLine: "Instant", oracleText: "Target creature you control deals damage equal to its power to target creature you don't control. Each opponent gets a poison counter." };
const foodFight = { name: "Food Fight", typeLine: "Enchantment", oracleText: "Artifacts you control have \"{2}, Sacrifice this artifact: It deals damage to any target equal to 1 plus the number of permanents named Food Fight you control.\"" };

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

test("blueprint-note-and-mana.mjs's ROLE_PATTERNS.interaction recognizes real mass-bounce shapes without a literal 'target' word or with plural 'owners'' hands (Evacuation, Whelming Wave)", () => {
  const textOf = (card) => `${card.name}\n${card.typeLine}\n${card.oracleText}`;
  assert.equal(ROLE_PATTERNS.interaction.some((p) => p.test(textOf(evacuation))), true);
  assert.equal(ROLE_PATTERNS.interaction.some((p) => p.test(textOf(whelmingWave))), true);
});

test("card-role-classification.mjs's classifyNativeCard grants the 'interaction' role for Evacuation and Whelming Wave, which returned ZERO roles at all before this fix", () => {
  assert.ok(classifyNativeCard(evacuation).includes("interaction"));
  assert.ok(classifyNativeCard(whelmingWave).includes("interaction"));
});

test("blueprint-note-and-mana.mjs's ROLE_PATTERNS.interaction recognizes real fight-based and power-based-damage removal (Savage Punch, Infectious Bite)", () => {
  const textOf = (card) => `${card.name}\n${card.typeLine}\n${card.oracleText}`;
  assert.equal(ROLE_PATTERNS.interaction.some((p) => p.test(textOf(savagePunch))), true);
  assert.equal(ROLE_PATTERNS.interaction.some((p) => p.test(textOf(infectiousBite))), true);
});

test("card-role-classification.mjs's classifyNativeCard grants the 'interaction' role for Savage Punch and Infectious Bite, which returned ZERO roles at all before this fix", () => {
  assert.ok(classifyNativeCard(savagePunch).includes("interaction"));
  assert.ok(classifyNativeCard(infectiousBite).includes("interaction"));
});

test("the new bare 'fights?' shape does not false-positive on Food Fight, a real card whose own NAME contains the word 'Fight' but has an unrelated damage ability", () => {
  assert.equal(ROLE_PATTERNS.interaction.some((p) => p.test(`${foodFight.name}\n${foodFight.typeLine}\n${foodFight.oracleText}`)), false);
});
