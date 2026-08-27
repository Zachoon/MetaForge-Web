import assert from "node:assert/strict";
import test from "node:test";
import { validateCompanion, manaValueOf, cardTypesOf, isLand, isPermanent } from "../app/companion-legality.mjs";

const FOREST = { name: "Forest", mana_cost: "", type_line: "Basic Land — Forest", oracle_text: "" };
const SOL_RING = { name: "Sol Ring", mana_cost: "{1}", type_line: "Artifact", oracle_text: "{T}: Add {C}{C}." };
const LIGHTNING_BOLT = { name: "Lightning Bolt", mana_cost: "{R}", type_line: "Instant", oracle_text: "Lightning Bolt deals 3 damage to any target." };
const SWORDS = { name: "Swords to Plowshares", mana_cost: "{W}", type_line: "Instant", oracle_text: "Exile target creature." };
const COUNTERSPELL = { name: "Counterspell", mana_cost: "{U}{U}", type_line: "Instant", oracle_text: "Counter target spell." };
const WRATH_OF_GOD = { name: "Wrath of God", mana_cost: "{2}{W}{W}", type_line: "Sorcery", oracle_text: "Destroy all creatures." };
const RHYSTIC_STUDY = { name: "Rhystic Study", mana_cost: "{2}{U}", type_line: "Enchantment", oracle_text: "Whenever an opponent casts a spell, you may draw a card unless that player pays {1}." };
const LLANOWAR_ELVES = { name: "Llanowar Elves", mana_cost: "{G}", type_line: "Creature — Elf Druid", oracle_text: "{T}: Add {G}." };
const GRIZZLY_BEARS = { name: "Grizzly Bears", mana_cost: "{1}{G}", type_line: "Creature — Bear", oracle_text: "" };
const COLOSSAL_DREADMAW = { name: "Colossal Dreadmaw", mana_cost: "{4}{G}{G}", type_line: "Creature — Dinosaur", oracle_text: "Trample" };

test("mana value / type helpers", () => {
  assert.equal(manaValueOf(FOREST), 0);
  assert.equal(manaValueOf(WRATH_OF_GOD), 4);
  assert.equal(manaValueOf(COUNTERSPELL), 2);
  assert.deepEqual(cardTypesOf(LLANOWAR_ELVES), ["Creature"]);
  assert.equal(isLand(FOREST), true);
  assert.equal(isPermanent(SOL_RING), true);
  assert.equal(isPermanent(LIGHTNING_BOLT), false);
});

test("unrecognized companion name is treated as not a legality concern", () => {
  const result = validateCompanion("Not a Companion", [SOL_RING]);
  assert.equal(result.recognized, false);
  assert.equal(result.legal, true);
});

test("Gyruda requires every card to have an even mana value", () => {
  const legal = validateCompanion("Gyruda, Doom of Depths", [FOREST, WRATH_OF_GOD, COUNTERSPELL]);
  assert.equal(legal.legal, true);
  const illegal = validateCompanion("Gyruda, Doom of Depths", [FOREST, LIGHTNING_BOLT]);
  assert.equal(illegal.legal, false);
  assert.deepEqual(illegal.violations, ["Lightning Bolt"]);
});

test("Jegantha forbids any card from repeating a colored mana symbol in its own cost", () => {
  const legal = validateCompanion("Jegantha, the Wellspring", [SOL_RING, LIGHTNING_BOLT, SWORDS]);
  assert.equal(legal.legal, true);
  const illegal = validateCompanion("Jegantha, the Wellspring", [COUNTERSPELL, WRATH_OF_GOD]);
  assert.equal(illegal.legal, false);
  assert.deepEqual(illegal.violations.sort(), ["Counterspell", "Wrath of God"]);
});

test("Kaheera restricts creature cards to its five allowed creature types", () => {
  const legal = validateCompanion("Kaheera, the Orphanguard", [COLOSSAL_DREADMAW, SOL_RING, FOREST]);
  assert.equal(legal.legal, true);
  const illegal = validateCompanion("Kaheera, the Orphanguard", [LLANOWAR_ELVES, GRIZZLY_BEARS]);
  assert.equal(illegal.legal, false);
  assert.deepEqual(illegal.violations.sort(), ["Grizzly Bears", "Llanowar Elves"]);
});

test("Keruga requires every nonland card to cost 3 or more (lands exempt)", () => {
  const legal = validateCompanion("Keruga, the Macrosage", [FOREST, WRATH_OF_GOD, COLOSSAL_DREADMAW]);
  assert.equal(legal.legal, true);
  const illegal = validateCompanion("Keruga, the Macrosage", [FOREST, LIGHTNING_BOLT, SOL_RING]);
  assert.equal(illegal.legal, false);
  assert.deepEqual(illegal.violations.sort(), ["Lightning Bolt", "Sol Ring"]);
});

test("Lurrus restricts permanents to mana value 2 or less, but not instants/sorceries", () => {
  const legal = validateCompanion("Lurrus of the Dream-Den", [SOL_RING, GRIZZLY_BEARS, WRATH_OF_GOD, COUNTERSPELL]);
  assert.equal(legal.legal, true);
  const illegal = validateCompanion("Lurrus of the Dream-Den", [COLOSSAL_DREADMAW]);
  assert.equal(illegal.legal, false);
  assert.deepEqual(illegal.violations, ["Colossal Dreadmaw"]);
});

test("Lutri is always satisfied because Commander singleton already guarantees it", () => {
  const result = validateCompanion("Lutri, the Spellchaser", [SOL_RING, GRIZZLY_BEARS, COLOSSAL_DREADMAW]);
  assert.equal(result.legal, true);
});

test("Obosh requires every nonland card to have an odd mana value (lands exempt)", () => {
  const legal = validateCompanion("Obosh, the Preypiercer", [FOREST, SOL_RING, LIGHTNING_BOLT]);
  assert.equal(legal.legal, true);
  const illegal = validateCompanion("Obosh, the Preypiercer", [FOREST, COUNTERSPELL, GRIZZLY_BEARS]);
  assert.equal(illegal.legal, false);
  assert.deepEqual(illegal.violations.sort(), ["Counterspell", "Grizzly Bears"]);
});

test("Umori requires every nonland card to share one card type", () => {
  const legal = validateCompanion("Umori, the Collector", [LIGHTNING_BOLT, SWORDS, COUNTERSPELL]);
  assert.equal(legal.legal, true);
  const illegal = validateCompanion("Umori, the Collector", [LIGHTNING_BOLT, GRIZZLY_BEARS, SOL_RING]);
  assert.equal(illegal.legal, false);
  assert.ok(illegal.violations.length > 0);
});

test("Yorion is structurally impossible as a Commander companion regardless of deck contents", () => {
  const result = validateCompanion("Yorion, Sky Nomad", [FOREST, SOL_RING]);
  assert.equal(result.legal, false);
  assert.match(result.structuralIssue, /never|impossible|cannot/i);
});

test("Zirda requires every permanent card to have an activated ability", () => {
  const legal = validateCompanion("Zirda, the Dawnwaker", [SOL_RING, LLANOWAR_ELVES, LIGHTNING_BOLT]);
  assert.equal(legal.legal, true);
  const illegal = validateCompanion("Zirda, the Dawnwaker", [GRIZZLY_BEARS, COLOSSAL_DREADMAW]);
  assert.equal(illegal.legal, false);
  assert.deepEqual(illegal.violations.sort(), ["Colossal Dreadmaw", "Grizzly Bears"]);
});
