import assert from "node:assert/strict";
import test from "node:test";
import { classifyNativeCard } from "../app/card-role-classification.mjs";
import { strategicSemanticsFor } from "../app/strategic-intent.mjs";
import { extractMechanicalSignals } from "../app/forge-interaction-graph.mjs";
import { displayRoleFor } from "../app/adaptive-recommendation.mjs";
// Side-effect import: configures the real card-mechanics tag lookup that
// classifyNativeCard/strategicSemanticsFor read from, same as every other
// test file that exercises these classifiers.
import "../app/native-masterwork-engine.mjs";

// =============================================================================
// Land search must fetch to the BATTLEFIELD to be ramp
// =============================================================================
// Reported directly by a user: Many Partings ("Search your library for a
// basic land card, reveal it, put it into your hand, then shuffle. Create
// a Food token.") was showing up as a near-auto-include in green token
// decks, while real, historically-played ramp staples (Farseek, Nature's
// Lore, Three Visits) were not making lists at all.
//
// Root cause, found across four independent regex/tag classifiers: "search
// your library for ... land" was treated as ramp regardless of whether the
// fetched land goes to hand (fixing/selection, no faster than a normal
// land drop) or onto the battlefield (real acceleration). The same bug
// also meant Farseek/Nature's Lore/Three Visits — which don't say the
// literal word "land" at all ("Forest card", "Plains, Island, Swamp, or
// Mountain card") — were getting ZERO ramp credit from any of these four
// paths, the exact opposite problem. Both directions are fixed together:
// require "battlefield" in the same clause as the land search, and widen
// the land/type alternation to cover all three real phrasings.
// =============================================================================

const manyPartings = {
  name: "Many Partings",
  oracleText: "Search your library for a basic land card, reveal it, put it into your hand, then shuffle. Create a Food token. (It's an artifact with \"{2}, {T}, Sacrifice this token: You gain 3 life.\")",
  typeLine: "Sorcery",
  manaCost: "{2}{G}",
};
const sylvanScrying = {
  name: "Sylvan Scrying",
  oracleText: "Search your library for a land card, reveal it, put it into your hand, then shuffle.",
  typeLine: "Sorcery",
  manaCost: "{1}{G}",
};
const rampantGrowth = {
  name: "Rampant Growth",
  oracleText: "Search your library for a basic land card, put that card onto the battlefield tapped, then shuffle.",
  typeLine: "Sorcery",
  manaCost: "{1}{G}",
};
const sakuraTribeElder = {
  name: "Sakura-Tribe Elder",
  oracleText: "Sacrifice this creature: Search your library for a basic land card, put that card onto the battlefield tapped, then shuffle.",
  typeLine: "Creature — Snake",
  manaCost: "{1}{G}",
};
const farseek = {
  name: "Farseek",
  oracleText: "Search your library for a Plains, Island, Swamp, or Mountain card, put it onto the battlefield tapped, then shuffle.",
  typeLine: "Sorcery",
  manaCost: "{1}{G}",
};
const naturesLore = {
  name: "Nature's Lore",
  oracleText: "Search your library for a Forest card, put that card onto the battlefield, then shuffle.",
  typeLine: "Sorcery",
  manaCost: "{1}{G}",
};
const threeVisits = {
  name: "Three Visits",
  oracleText: "Search your library for a Forest card, put it onto the battlefield, then shuffle.",
  typeLine: "Sorcery",
  manaCost: "{2}{G}",
};
const cultivate = {
  name: "Cultivate",
  oracleText: "Search your library for up to two basic land cards, reveal them, put one onto the battlefield tapped and the other into your hand, then shuffle.",
  typeLine: "Sorcery",
  manaCost: "{2}{G}",
};

const HAND_ONLY = [manyPartings, sylvanScrying];
const BATTLEFIELD_RAMP = [rampantGrowth, sakuraTribeElder, farseek, naturesLore, threeVisits, cultivate];

test("classifyNativeCard: a hand-only land search is not the ramp role, a battlefield land search is", () => {
  for (const card of HAND_ONLY) {
    assert.ok(!classifyNativeCard(card).includes("ramp"), `${card.name} fetches to hand, not ramp`);
  }
  for (const card of BATTLEFIELD_RAMP) {
    assert.ok(classifyNativeCard(card).includes("ramp"), `${card.name} fetches to the battlefield, real ramp`);
  }
});

test("strategicSemanticsFor: the ramp semantic follows the same hand-vs-battlefield line", () => {
  for (const card of HAND_ONLY) {
    assert.ok(!strategicSemanticsFor(card).has("ramp"), `${card.name} fetches to hand, not ramp`);
  }
  for (const card of BATTLEFIELD_RAMP) {
    assert.ok(strategicSemanticsFor(card).has("ramp"), `${card.name} fetches to the battlefield, real ramp`);
  }
});

test("extractMechanicalSignals: a hand-only land search does not connect to a landfall commander's payoff", () => {
  for (const card of HAND_ONLY) {
    assert.ok(!extractMechanicalSignals(card).produces.includes("lands"), `${card.name} never fires "whenever a land enters"`);
  }
  for (const card of BATTLEFIELD_RAMP) {
    assert.ok(extractMechanicalSignals(card).produces.includes("lands"), `${card.name} puts a land onto the battlefield, a real landfall trigger`);
  }
});

test("displayRoleFor: the UI badge follows the same hand-vs-battlefield line", () => {
  for (const card of HAND_ONLY) {
    assert.notEqual(displayRoleFor(card), "Acceleration", `${card.name} is not acceleration`);
  }
  for (const card of BATTLEFIELD_RAMP) {
    assert.equal(displayRoleFor(card), "Acceleration", `${card.name} is real acceleration`);
  }
});
