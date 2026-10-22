import assert from "node:assert/strict";
import test from "node:test";
import { readdir } from "node:fs/promises";
import { describeCardJob, parseOracleMechanics } from "../app/reasoning-engine/oracle-mechanics.mjs";
import { planRoleOf, readCommanderPlan, rolesOf } from "../app/reasoning-engine/deck-profile.mjs";
import { reasonAboutCandidate } from "../app/reasoning-engine/reasoner.mjs";
import { buildReasoningContext } from "../app/reasoning-engine/index.mjs";

// Real printings from app/set-cards. Each snippet is printed Oracle text.
const NAMES = [
  "Muldrotha, the Gravetide",
  "Osteomancer Adept",
  "Daring Waverider",
  "Daretti, Rocketeer Engineer",
  "Rest in Peace",
  "Angel of Finality",
  "Feldon's Cane",
  "Leyline of the Void",
  "Wick, the Whorled Mind",
  "Vampiric Rites",
  "Gas Guzzler",
  "Kalastria Highborn",
  "Aatchik, Emerald Radian",
  "Scavenger's Talent",
  "Embalmed Ascendant",
  "Jackdaw Savior",
  "Inspiring Call",
  "Biogenic Upgrade",
  "Giada, Font of Hope",
  "Prime Speaker Zegana",
  "Ygra, Eater of All",
  "Craterhoof Behemoth",
  "Overrun",
  "Aurelia, the Warleader",
  "Goblin Oriflamme",
  "Wilt-Leaf Liege",
  "Warren Elder",
  "Rabbit Response",
  "Heroic Reinforcements",
  "Dwynen, Gilt-Leaf Daen",
  "Lathril, Blade of the Elves",
  "Krenko, Mob Boss",
  "Mabel, Heir to Cragflame",
  "Cloud, Midgar Mercenary",
  "Adelbert Steiner",
  "Eriette, the Beguiler",
  "Doubling Season",
  "Impact Tremors",
  "Mu Yanling, Wind Rider",
  "Kastral, the Windcrested",
  "Bristlebud Farmer",
  "Beza, the Bounding Spring",
  "Gonti, Night Minister",
  "Imprisoned in the Moon",
  "New Horizons",
  "Winter, Misanthropic Guide",
  "Eluge, the Shoreless Sea",
];

const printed = await loadPrinted(NAMES);

function loadPrinted(names) {
  const want = new Set(names);
  const found = new Map();
  const source = new URL("../app/set-cards/", import.meta.url);
  return readdir(source).then(async (files) => {
    for (const file of files.filter((entry) => entry.endsWith(".mjs"))) {
      const module = await import(new URL(file, source));
      for (const card of module.default?.cards || []) {
        if (want.has(card.name) && !found.has(card.name)) found.set(card.name, card);
      }
      if (found.size === want.size) break;
    }
    return found;
  });
}

function card(name) {
  const entry = printed.get(name);
  assert.ok(entry?.oracleText, `${name} must come from app/set-cards`);
  return entry;
}

function mechanics(name) {
  return parseOracleMechanics(card(name));
}

function plan(name) {
  return readCommanderPlan([card(name)]);
}

function reason(commander, candidate) {
  const ctx = buildReasoningContext({ commanders: [card(commander)], picks: [] });
  const result = reasonAboutCandidate(card(candidate), { ...ctx, category: "synergyPieces" });
  return { ctx, result, text: result.reasons.map((entry) => entry.text).join(" ") };
}

test("casting from the graveyard is a graveyard plan, and graveyard exile is not a board wipe", () => {
  assert.ok(card("Muldrotha, the Gravetide").oracleText.includes("cast a permanent spell of each permanent type from your graveyard"));
  const muldrotha = plan("Muldrotha, the Gravetide");
  assert.equal(muldrotha.id, "graveyard");
  assert.ok(muldrotha.confidence >= 0.7);
  assert.ok(mechanics("Muldrotha, the Gravetide").produces.includes("recursion"));
  assert.match(describeCardJob(card("Muldrotha, the Gravetide")), /graveyard/);

  assert.ok(card("Osteomancer Adept").oracleText.includes("cast creature spells from your graveyard"));
  assert.ok(mechanics("Osteomancer Adept").produces.includes("recursion"));
  assert.equal(plan("Osteomancer Adept").id, "graveyard");

  assert.ok(card("Daring Waverider").oracleText.includes("from your graveyard without paying its mana cost"));
  assert.ok(mechanics("Daring Waverider").produces.includes("recursion"));

  assert.ok(card("Daretti, Rocketeer Engineer").oracleText.includes("artifact card in your graveyard"));
  assert.ok(card("Daretti, Rocketeer Engineer").oracleText.includes("return the chosen card to the battlefield"));
  const daretti = mechanics("Daretti, Rocketeer Engineer");
  assert.ok(daretti.produces.includes("recursion"));
  assert.ok(daretti.consumes.includes("artifact"));
  assert.equal(plan("Daretti, Rocketeer Engineer").id, "graveyard");
  assert.equal(plan("Daretti, Rocketeer Engineer").secondary.id, "artifacts");

  const rest = card("Rest in Peace");
  assert.ok(rest.oracleText.includes("exile all graveyards"));
  assert.ok(rest.oracleText.includes("exile it instead"));
  assert.equal(mechanics("Rest in Peace").graveyardHate, "replacement");
  assert.ok(!mechanics("Rest in Peace").effects.includes("wipe"));
  assert.ok(!rolesOf(rest).has("wipes"));
  const restReason = reason("Muldrotha, the Gravetide", "Rest in Peace");
  assert.match(restReason.result.summary, /cuts off a graveyard plan/);
  assert.doesNotMatch(restReason.text, /board wipe|wipes/i);
  assert.ok(restReason.result.delta < 0);
  assert.equal(restReason.result.confidenceLabel, "high");

  const angel = card("Angel of Finality");
  assert.ok(angel.oracleText.includes("exile target player's graveyard"));
  assert.equal(mechanics("Angel of Finality").graveyardHate, "any-player");
  assert.ok(!rolesOf(angel).has("removal"));
  const angelReason = reason("Muldrotha, the Gravetide", "Angel of Finality");
  assert.match(angelReason.result.summary, /your graveyard as well as an opponent/);
  assert.match(angelReason.result.confidenceNote, /not only an opponent/);
  assert.ok(angelReason.result.delta < 0);
  assert.doesNotMatch(angelReason.text, /board wipe/i);

  assert.ok(card("Feldon's Cane").oracleText.includes("Shuffle your graveyard into your library"));
  assert.equal(mechanics("Feldon's Cane").graveyardHate, "shuffle");
  const cane = reason("Muldrotha, the Gravetide", "Feldon's Cane");
  assert.match(cane.result.summary, /takes those cards out of a graveyard plan/);
  assert.ok(cane.result.delta < 0);

  const leyline = card("Leyline of the Void");
  assert.ok(leyline.oracleText.includes("opponent's graveyard"));
  assert.equal(mechanics("Leyline of the Void").graveyardHate, null);
  const leylineReason = reason("Muldrotha, the Gravetide", "Leyline of the Void");
  assert.doesNotMatch(leylineReason.text, /cuts off|your graveyard as well/);
});

test("sacrifice outlets, death payoffs, and counter direction stay distinct", () => {
  assert.ok(card("Wick, the Whorled Mind").oracleText.includes("Sacrifice a Snail"));
  const wick = mechanics("Wick, the Whorled Mind");
  assert.ok(wick.consumes.includes("creature-body"));
  assert.equal(plan("Wick, the Whorled Mind").id, "aristocrats");
  assert.match(describeCardJob(card("Wick, the Whorled Mind")), /sacrifice outlet/);

  assert.ok(card("Vampiric Rites").oracleText.includes("Sacrifice a creature"));
  assert.equal(planRoleOf(card("Vampiric Rites"), plan("Aatchik, Emerald Radian")), "outlet");
  assert.match(describeCardJob(card("Vampiric Rites")), /sacrifice outlet/);
  assert.ok(card("Gas Guzzler").oracleText.includes("Sacrifice another creature"));
  assert.ok(mechanics("Gas Guzzler").consumes.includes("creature-body"));
  assert.equal(planRoleOf(card("Gas Guzzler"), plan("Aatchik, Emerald Radian")), "outlet");

  assert.ok(card("Kalastria Highborn").oracleText.includes("another Vampire you control dies"));
  assert.ok(mechanics("Kalastria Highborn").listens.includes("creature-dies"));
  assert.equal(planRoleOf(card("Kalastria Highborn"), plan("Aatchik, Emerald Radian")), "payoff");
  assert.ok(mechanics("Scavenger's Talent").listens.includes("creature-dies"));
  assert.ok(mechanics("Embalmed Ascendant").listens.includes("creature-dies"));
  assert.ok(card("Jackdaw Savior").oracleText.includes("another creature you control with flying dies"));
  assert.ok(mechanics("Jackdaw Savior").listens.includes("creature-dies"));
  assert.equal(plan("Aatchik, Emerald Radian").id, "aristocrats");

  const inspiring = card("Inspiring Call");
  assert.ok(inspiring.oracleText.includes("with a +1/+1 counter on it"));
  assert.ok(!mechanics("Inspiring Call").produces.includes("counter"));
  assert.ok(mechanics("Inspiring Call").listens.includes("counter"));
  assert.equal(mechanics("Inspiring Call").typal, null);
  assert.doesNotMatch(describeCardJob(inspiring), /Those/);

  assert.ok(card("Biogenic Upgrade").oracleText.includes("Distribute three +1/+1 counters"));
  assert.ok(mechanics("Biogenic Upgrade").produces.includes("counter"));
  assert.equal(mechanics("Biogenic Upgrade").counterScope, "place");

  const giada = plan("Giada, Font of Hope");
  assert.equal(giada.id, "typal");
  assert.equal(giada.label, "Angels");
  assert.equal(giada.secondary, null);
  assert.equal(mechanics("Giada, Font of Hope").counterScope, "rider");
  assert.ok(mechanics("Giada, Font of Hope").produces.includes("counter"));
  assert.ok(!rolesOf(card("Giada, Font of Hope")).has("ramp"));

  assert.ok(card("Prime Speaker Zegana").oracleText.includes("enters with X +1/+1 counters on it"));
  assert.equal(mechanics("Prime Speaker Zegana").counterScope, "self");
  assert.notEqual(plan("Prime Speaker Zegana").id, "counters");

  assert.equal(mechanics("Ygra, Eater of All").counterScope, "self");
  assert.notEqual(plan("Ygra, Eater of All").id, "counters");
  assert.ok(mechanics("Ygra, Eater of All").listens.includes("artifact-leaves"));
});

test("a mass pump is a finisher only when it is large or scales", () => {
  assert.ok(card("Craterhoof Behemoth").oracleText.includes("get +X/+X"));
  assert.ok(rolesOf(card("Craterhoof Behemoth")).has("winConditions"));
  assert.ok(card("Overrun").oracleText.includes("get +3/+3"));
  assert.ok(rolesOf(card("Overrun")).has("winConditions"));
  assert.ok(card("Aurelia, the Warleader").oracleText.includes("additional combat phase"));
  assert.ok(rolesOf(card("Aurelia, the Warleader")).has("winConditions"));

  for (const [name, snippet] of [
    ["Goblin Oriflamme", "get +1/+0"],
    ["Wilt-Leaf Liege", "get +1/+1"],
    ["Warren Elder", "get +1/+1"],
    ["Rabbit Response", "get +2/+1"],
    ["Heroic Reinforcements", "get +1/+1"],
  ]) {
    assert.ok(card(name).oracleText.includes(snippet), name);
    assert.ok(!rolesOf(card(name)).has("winConditions"), name);
  }
  assert.equal(mechanics("Goblin Oriflamme").typal, null);
});

test("tribes, equipment, and auras are read from printed text", () => {
  assert.ok(card("Dwynen, Gilt-Leaf Daen").oracleText.includes("Other Elf creatures you control"));
  assert.equal(plan("Dwynen, Gilt-Leaf Daen").label, "Elves");
  assert.ok(card("Lathril, Blade of the Elves").oracleText.includes("Elf Warrior creature tokens"));
  assert.ok(card("Lathril, Blade of the Elves").oracleText.includes("Elves you control"));
  assert.equal(plan("Lathril, Blade of the Elves").id, "typal");
  assert.equal(plan("Lathril, Blade of the Elves").label, "Elves");
  assert.equal(plan("Krenko, Mob Boss").label, "Goblins");
  assert.ok(card("Mabel, Heir to Cragflame").oracleText.includes("Other Mice you control"));
  assert.equal(plan("Mabel, Heir to Cragflame").label, "Mice");

  assert.ok(card("Cloud, Midgar Mercenary").oracleText.includes("search your library for an Equipment card"));
  assert.equal(plan("Cloud, Midgar Mercenary").id, "equipment");
  assert.ok(card("Adelbert Steiner").oracleText.includes("for each Equipment you control"));
  assert.equal(plan("Adelbert Steiner").id, "equipment");
  assert.notEqual(plan("Adelbert Steiner").id, "lifegain");
  assert.ok(card("Eriette, the Beguiler").oracleText.includes("Whenever an Aura you control"));
  assert.equal(plan("Eriette, the Beguiler").id, "auras");
  assert.notEqual(plan("Eriette, the Beguiler").id, "lifegain");

  const krenko = plan("Krenko, Mob Boss");
  assert.equal(planRoleOf(card("Doubling Season"), krenko), "enabler");
  assert.equal(planRoleOf(card("Impact Tremors"), krenko), "payoff");
  assert.equal(planRoleOf(card("Craterhoof Behemoth"), krenko), "payoff");
  for (const name of ["Doubling Season", "Impact Tremors", "Craterhoof Behemoth"]) {
    assert.doesNotMatch(reason("Krenko, Mob Boss", name).text, /does not advance/);
  }

  assert.ok(card("Mu Yanling, Wind Rider").oracleText.includes("deal combat damage"));
  assert.ok(mechanics("Mu Yanling, Wind Rider").listens.includes("combat-damage"));
  assert.ok(!mechanics("Mu Yanling, Wind Rider").listens.includes("creature-dies"));
  assert.ok(card("Kastral, the Windcrested").oracleText.includes("deal combat damage"));
  assert.ok(mechanics("Kastral, the Windcrested").listens.includes("combat-damage"));
  assert.ok(!mechanics("Kastral, the Windcrested").listens.includes("creature-dies"));

  assert.ok(card("Bristlebud Farmer").oracleText.includes("create two Food tokens"));
  assert.match(describeCardJob(card("Bristlebud Farmer")), /Food/);
  assert.doesNotMatch(describeCardJob(card("Bristlebud Farmer")), /creature tokens/);
});

test("catch-up text, opponent tokens, and symmetric draw do not define the plan", () => {
  const beza = card("Beza, the Bounding Spring");
  assert.ok(beza.oracleText.includes("if an opponent controls more lands than you"));
  assert.equal(plan("Beza, the Bounding Spring").id, "midrange");
  assert.equal(plan("Beza, the Bounding Spring").confidence, 0);
  assert.ok(mechanics("Beza, the Bounding Spring").catchUp.includes("treasure"));
  assert.match(describeCardJob(beza), /makes Treasure when it enters/);
  assert.ok(!rolesOf(beza).has("draw"));
  assert.equal(mechanics("Beza, the Bounding Spring").typal, null);

  assert.ok(card("Gonti, Night Minister").oracleText.includes("that player creates a Treasure token"));
  assert.ok(!mechanics("Gonti, Night Minister").produces.includes("treasure"));
  assert.notEqual(plan("Gonti, Night Minister").id, "artifacts");

  const moon = card("Imprisoned in the Moon");
  assert.ok(moon.oracleText.includes("loses all other card types"));
  assert.ok(!mechanics("Imprisoned in the Moon").produces.includes("mana"));
  assert.ok(!rolesOf(moon).has("ramp"));
  assert.ok(card("New Horizons").oracleText.includes("Add two mana of any one color"));
  assert.ok(rolesOf(card("New Horizons")).has("ramp"));

  assert.ok(card("Winter, Misanthropic Guide").oracleText.includes("each player draws two cards"));
  assert.equal(mechanics("Winter, Misanthropic Guide").symmetricDraw, true);
  assert.match(reason("Winter, Misanthropic Guide", "Winter, Misanthropic Guide").text, /Each player draws, so your opponents get the cards too/);

  assert.ok(card("Eluge, the Shoreless Sea").oracleText.includes("enters or attacks"));
  assert.ok(!mechanics("Eluge, the Shoreless Sea").listens.includes("attack"));
});
