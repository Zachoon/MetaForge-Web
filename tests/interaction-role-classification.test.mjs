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

// =============================================================================
// Founder #094: broadened the mined corpus with 15 fresh real Moxfield
// decklists across previously-uncovered archetypes (aristocrats, blink,
// poison/infect, stax, spellslinger, graveyard) per Zach's "broaden then
// find gaps". 4,060 unique cards total, 226 zero-role results. Four more
// real, distinct gaps, all validated against the full corpus before
// shipping.
// (1) Digit-only damage missed the real X-cost burn template (Blaze:
// "deals X damage to any target") since "X" isn't \d+.
// (2) #093's power-based-damage pattern required "damage" immediately
// followed by "equal to its power", but Wave of Reckoning (a real board
// wipe) and Justice Strike insert "to itself"/"to himself"/"to herself".
// (3) The whole Pacifism-class/vanilla-ify removal archetype (Arrest,
// Witness Protection, Frogify) had no coverage — but an open character
// window between "all" and "abilities" would have wrongly credited
// Hammerheim ("loses all LANDWALK abilities", a narrow keyword-strip
// utility) and Ultima, Origin of Oblivion ("loses all LAND TYPES and
// abilities", a land-only effect). Scoped to the real "other (card types
// and)? abilities" qualifier instead.
// (4) "Can't attack or block" (Bound in Silence, Arrest) is real
// single-target lockdown removal, but a bare match would have wrongly
// credited Mogg Flunkies ("can't attack or block ALONE" — a totally
// different, non-removal drawback) and Wayward Swordtooth ("can't attack
// or block UNLESS you have the city's blessing" — a self-restriction).
// Excluded both qualifiers with a negative lookahead.
// =============================================================================

const blaze = { name: "Blaze", typeLine: "Sorcery", oracleText: "Blaze deals X damage to any target." };
const waveOfReckoning = { name: "Wave of Reckoning", typeLine: "Sorcery", oracleText: "Each creature deals damage to itself equal to its power." };
const arrest = { name: "Arrest", typeLine: "Enchantment — Aura", oracleText: "Enchant creature\nEnchanted creature can't attack or block, and its activated abilities can't be activated." };
const witnessProtection = { name: "Witness Protection", typeLine: "Enchantment — Aura", oracleText: "Enchant creature\nEnchanted creature loses all abilities and is a green and white Citizen creature with base power and toughness 1/1 named Public Enemy." };
const imprisonedInTheMoon = { name: "Imprisoned in the Moon", typeLine: "Enchantment — Aura", oracleText: "Enchant creature, land, or planeswalker\nEnchanted permanent is a colorless land with \"{T}: Add {C}\" and loses all other card types and abilities." };
const hammerheim = { name: "Hammerheim", typeLine: "Land", oracleText: "{T}: Add {R}.\n{T}: Target creature loses all landwalk abilities until end of turn." };
const moggFlunkies = { name: "Mogg Flunkies", typeLine: "Creature — Goblin", oracleText: "This creature can't attack or block alone." };
const waywardSwordtooth = { name: "Wayward Swordtooth", typeLine: "Creature — Dinosaur", oracleText: "Ascend (If you control ten or more permanents, you get the city's blessing for the rest of the game.)\nYou may play an additional land on each of your turns.\nThis creature can't attack or block unless you have the city's blessing." };

// =============================================================================
// Founder #096: broadened the mined corpus with 15 more fresh real
// Moxfield decklists (dwarf tribal, egg/token, life-payment, voltron,
// merfolk typal, aristocrats) — 4,409 unique cards / 110 decklists total,
// 230 zero-role results. Two more real, distinct gaps, both confirmed via
// direct test to have returned ZERO roles beforehand.
// (1) "Redirect" spells (Bolt Bend, Imp's Mischief: "Change the target of
// target spell...") are a real stack-interaction sub-archetype with no
// coverage at all.
// (2) "Shuffle/tuck target permanent into library" removal (Chaos Warp,
// one of the format's most popular removal spells) has two real
// grammatical templates. A loose verb-first pattern would have wrongly
// credited the "Zenith" spell cycle (White Sun's Zenith: "Shuffle White
// Sun's Zenith into its owner's library" — shuffles ITSELF, not a
// target) and Fblthp, the Lost's own graveyard-hate-immunity trigger.
// Resolved by requiring the literal word "target" immediately after the
// put/shuffle verb.
// =============================================================================

const boltBend = { name: "Bolt Bend", typeLine: "Instant", oracleText: "This spell costs {3} less to cast if you control a creature with power 4 or greater.\nChange the target of target spell or ability with a single target." };
const chaosWarp = { name: "Chaos Warp", typeLine: "Instant", oracleText: "The owner of target permanent shuffles it into their library, then reveals the top card of their library. If it's a permanent card, they put it onto the battlefield." };
const synchronizedEviction = { name: "Synchronized Eviction", typeLine: "Instant", oracleText: "This spell costs {2} less to cast if you control at least two creatures that share a creature type.\nPut target nonland permanent into its owner's library second from the top." };
const whiteSunsZenith = { name: "White Sun's Zenith", typeLine: "Sorcery", oracleText: "Create X 2/2 white Cat creature tokens. Shuffle White Sun's Zenith into its owner's library." };
const fblthp = { name: "Fblthp, the Lost", typeLine: "Creature — Homunculus", oracleText: "When Fblthp enters, draw a card. If it entered from your library or was cast from your library, draw two cards instead.\nWhen Fblthp becomes the target of a spell, shuffle Fblthp into its owner's library." };

// =============================================================================
// Founder #097: broadened the mined corpus with 15 more fresh real
// Moxfield decklists (group hug, stax/tax, +1/+1 counters, storm/
// spellslinger, mill) — 4,838 unique cards / 125 decklists total, 257
// zero-role results. "Whenever [this creature/you] becomes the target of a
// spell..., counter that spell" (Boromir Warden of the Tower, Frost Titan,
// Lavinia Azorius Renegade) is a real, distinct mini-counterspell ability
// with no coverage — the existing "counter target" alternative requires
// "target" right after "counter", but this archetype says "counter THAT
// spell" instead. Deliberately scoped to that exact phrase, not a broader
// "counter it", because "counter it unless...pays" is also the exact
// reminder-text wording #095's Ward keyword uses to explain itself
// (Sedgemoor Witch) — crediting every Ward card a second time via its own
// reminder text would be noise, not a real gap.
// =============================================================================

const boromirWarden = { name: "Boromir, Warden of the Tower", typeLine: "Legendary Creature — Human Soldier", oracleText: "Vigilance\nWhenever an opponent casts a spell, if no mana was spent to cast it, counter that spell.\nSacrifice Boromir: Creatures you control get +1/+1 until end of turn." };
const frostTitan = { name: "Frost Titan", typeLine: "Creature — Giant", oracleText: "Whenever this creature becomes the target of a spell or ability an opponent controls, counter that spell or ability unless its controller pays {2}." };
const sedgemoorWitchCounterReminder = { name: "Sedgemoor Witch", typeLine: "Creature — Human Witch", oracleText: "Menace\nWard—Pay 3 life. (Whenever this creature becomes the target of a spell or ability an opponent controls, counter it unless that player pays 3 life.)" };

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

test("blueprint-note-and-mana.mjs's ROLE_PATTERNS.interaction recognizes real X-cost burn (Blaze) and the 'deals damage to itself equal to its power' variant (Wave of Reckoning)", () => {
  const textOf = (card) => `${card.name}\n${card.typeLine}\n${card.oracleText}`;
  assert.equal(ROLE_PATTERNS.interaction.some((p) => p.test(textOf(blaze))), true);
  assert.equal(ROLE_PATTERNS.interaction.some((p) => p.test(textOf(waveOfReckoning))), true);
});

test("card-role-classification.mjs's classifyNativeCard grants the 'interaction' role for Blaze and Wave of Reckoning, which returned ZERO roles at all before this fix", () => {
  assert.ok(classifyNativeCard(blaze).includes("interaction"));
  assert.ok(classifyNativeCard(waveOfReckoning).includes("interaction"));
});

test("blueprint-note-and-mana.mjs's ROLE_PATTERNS.interaction recognizes the real Pacifism-class and vanilla-ify removal archetype (Arrest, Witness Protection, Imprisoned in the Moon)", () => {
  const textOf = (card) => `${card.name}\n${card.typeLine}\n${card.oracleText}`;
  assert.equal(ROLE_PATTERNS.interaction.some((p) => p.test(textOf(arrest))), true);
  assert.equal(ROLE_PATTERNS.interaction.some((p) => p.test(textOf(witnessProtection))), true);
  assert.equal(ROLE_PATTERNS.interaction.some((p) => p.test(textOf(imprisonedInTheMoon))), true);
});

test("card-role-classification.mjs's classifyNativeCard grants the 'interaction' role for Arrest, Witness Protection, and Imprisoned in the Moon, which returned ZERO roles at all before this fix", () => {
  assert.ok(classifyNativeCard(arrest).includes("interaction"));
  assert.ok(classifyNativeCard(witnessProtection).includes("interaction"));
  assert.ok(classifyNativeCard(imprisonedInTheMoon).includes("interaction"));
});

test("the new 'loses all abilities' and 'can't attack or block' shapes do not false-positive on Hammerheim (strips only landwalk), Mogg Flunkies ('can't attack or block ALONE'), or Wayward Swordtooth ('can't attack or block UNLESS...')", () => {
  const textOf = (card) => `${card.name}\n${card.typeLine}\n${card.oracleText}`;
  assert.equal(ROLE_PATTERNS.interaction.some((p) => p.test(textOf(hammerheim))), false);
  assert.equal(ROLE_PATTERNS.interaction.some((p) => p.test(textOf(moggFlunkies))), false);
  assert.equal(ROLE_PATTERNS.interaction.some((p) => p.test(textOf(waywardSwordtooth))), false);
});

test("blueprint-note-and-mana.mjs's ROLE_PATTERNS.interaction recognizes real redirect spells (Bolt Bend) and shuffle-into-library removal (Chaos Warp, Synchronized Eviction)", () => {
  const textOf = (card) => `${card.name}\n${card.typeLine}\n${card.oracleText}`;
  assert.equal(ROLE_PATTERNS.interaction.some((p) => p.test(textOf(boltBend))), true);
  assert.equal(ROLE_PATTERNS.interaction.some((p) => p.test(textOf(chaosWarp))), true);
  assert.equal(ROLE_PATTERNS.interaction.some((p) => p.test(textOf(synchronizedEviction))), true);
});

test("card-role-classification.mjs's classifyNativeCard grants the 'interaction' role for Bolt Bend, Chaos Warp, and Synchronized Eviction, which returned ZERO roles at all before this fix", () => {
  assert.ok(classifyNativeCard(boltBend).includes("interaction"));
  assert.ok(classifyNativeCard(chaosWarp).includes("interaction"));
  assert.ok(classifyNativeCard(synchronizedEviction).includes("interaction"));
});

test("the new shuffle-into-library shapes do not false-positive on the Zenith spell cycle (White Sun's Zenith shuffles ITSELF, not a target) or Fblthp, the Lost's own graveyard-hate-immunity trigger", () => {
  const textOf = (card) => `${card.name}\n${card.typeLine}\n${card.oracleText}`;
  assert.equal(ROLE_PATTERNS.interaction.some((p) => p.test(textOf(whiteSunsZenith))), false);
  assert.equal(ROLE_PATTERNS.interaction.some((p) => p.test(textOf(fblthp))), false);
});

test("blueprint-note-and-mana.mjs's ROLE_PATTERNS.interaction recognizes the real 'counter that spell' mini-counterspell ability (Boromir, Warden of the Tower; Frost Titan)", () => {
  const textOf = (card) => `${card.name}\n${card.typeLine}\n${card.oracleText}`;
  assert.equal(ROLE_PATTERNS.interaction.some((p) => p.test(textOf(boromirWarden))), true);
  assert.equal(ROLE_PATTERNS.interaction.some((p) => p.test(textOf(frostTitan))), true);
});

test("card-role-classification.mjs's classifyNativeCard grants the 'interaction' role for Boromir, Warden of the Tower and Frost Titan, which returned ZERO roles at all before this fix", () => {
  assert.ok(classifyNativeCard(boromirWarden).includes("interaction"));
  assert.ok(classifyNativeCard(frostTitan).includes("interaction"));
});

test("'counter that spell' is deliberately scoped narrower than 'counter it' — Sedgemoor Witch's Ward reminder text ('counter it unless that player pays 3 life') does not get a second, redundant interaction credit", () => {
  const textOf = (card) => `${card.name}\n${card.typeLine}\n${card.oracleText}`;
  assert.equal(ROLE_PATTERNS.interaction.some((p) => p.test(textOf(sedgemoorWitchCounterReminder))), false);
});
