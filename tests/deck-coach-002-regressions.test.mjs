// MF-DECK-COACH-002 — one regression test per confirmed coaching defect,
// plus the benchmark floor. Card text comes from the Scryfall snapshots in
// tests/fixtures/deck-bench and tests/fixtures/deck-coach, so this is offline.
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import { buildCurveRoleCoaching, classifyPrintedCard } from "../app/curve-role-coach.mjs";
import { buildManaBaseCoaching } from "../app/mana-base-coach.mjs";
import { readCommanderPlan } from "../app/reasoning-engine/deck-profile.mjs";
import { parseDecklist } from "../app/deck-check-parse.mjs";
import { indexFact } from "../app/deck-check-facts.mjs";
import { buildDeckCheckReport } from "../app/deck-check-report.mjs";
import { runBench } from "../scripts/deck-check/run-bench.mjs";

const printed = {};
for (const dir of ["deck-bench", "deck-coach"]) {
  const base = new URL(`./fixtures/${dir}/`, import.meta.url);
  for (const file of readdirSync(base).filter((name) => name.endsWith(".facts.json"))) {
    Object.assign(printed, JSON.parse(readFileSync(new URL(file, base), "utf8")).facts);
  }
}
const card = (name) => {
  assert.ok(printed[name], `${name} is in a fixture snapshot`);
  return classifyPrintedCard(printed[name]);
};

function benchReport(name, format = "commander") {
  const dir = new URL("./fixtures/deck-bench/", import.meta.url);
  const snapshot = JSON.parse(readFileSync(new URL(`${name}.facts.json`, dir), "utf8"));
  const facts = {};
  for (const fact of Object.values(snapshot.facts)) indexFact(facts, fact);
  return buildDeckCheckReport({ parsed: parseDecklist(readFileSync(new URL(`${name}.txt`, dir), "utf8")), facts, notFound: snapshot.notFound, format });
}

// ------------------------------------------------------------ classifier

test("a rock with a free {T}: Add is ramp even when a second ability filters (Prismatic Lens)", () => {
  assert.equal(card("Prismatic Lens").ramp, true);
  assert.equal(card("Coldsteel Heart").ramp, true);
});

test("land auras that add mana when the land taps are ramp", () => {
  for (const name of ["Wild Growth", "Utopia Sprawl", "Fertile Ground", "Overgrowth"]) assert.equal(card(name).ramp, true, name);
});

test("blinking your own creature is not removal", () => {
  for (const name of ["Cloudshift", "Ephemerate", "Restoration Angel", "Felidar Guardian", "Conjurer's Closet", "Soulherder", "Eldrazi Displacer", "Thassa, Deep-Dwelling"]) {
    assert.equal(card(name).interaction, false, name);
  }
  // Real removal on a creature body still counts.
  assert.equal(card("Reflector Mage").interaction, true);
  assert.equal(card("Banisher Priest").interaction, true);
});

test("one-sided and fight-based mass removal is a wipe", () => {
  const predation = card("Ezuri's Predation");
  assert.equal(predation.wipes, true);
  assert.equal(predation.wipeScope, "one-sided");
  const wurm = card("Massacre Wurm");
  assert.equal(wurm.wipes, true);
  assert.equal(wurm.wipeScope, "one-sided");
  assert.equal(card("Pernicious Deed").wipes, true);
  assert.equal(card("Kindred Dominance").wipeScope, "spares-type");
});

test("a static lord is not a win condition; a one-turn team pump and a land-count army are", () => {
  for (const name of ["Elvish Archdruid", "Stromkirk Captain", "Vampire Nocturnus", "Legion Lieutenant"]) assert.equal(card(name).wincon, false, name);
  for (const name of ["Craterhoof Behemoth", "Overrun", "Avenger of Zendikar", "Thassa's Oracle", "Gray Merchant of Asphodel"]) assert.equal(card(name).wincon, true, name);
});

test("a self-named search is not a tutor in a singleton deck (Elvish Clancaller)", () => {
  assert.equal(card("Elvish Clancaller").tutor, false);
  assert.equal(card("Demonic Tutor").tutor, true);
});

test("a counterspell for listed spell types is interaction (Swan Song)", () => {
  assert.equal(card("Swan Song").interaction, true);
  assert.equal(card("Swan Song").counter, true);
});

test("an opponent drawing from your card is not your card draw (Season of the Burrow)", () => {
  assert.equal(card("Season of the Burrow").draw, false);
});

test("draw equal to a creature's power is card advantage, not a loot (Greater Good)", () => {
  const good = card("Greater Good");
  assert.equal(good.draw, true);
  assert.equal(good.loot, false);
});

// ------------------------------------------------------------ crash

test("the mana coach does not throw when a fetch land is listed before the lands it finds", () => {
  const facts = JSON.parse(readFileSync(new URL("./fixtures/deck-bench/sram-voltron.facts.json", import.meta.url), "utf8")).facts;
  const cards = ["Myriad Landscape", "Plains", "Sol Ring", "Arcane Signet"].map((name) => ({ ...facts[name], quantity: name === "Plains" ? 30 : 1 }));
  const commander = facts["Sram, Senior Edificer"];
  assert.doesNotThrow(() => buildManaBaseCoaching({ commanders: [commander], commander, cards }));
  const report = buildManaBaseCoaching({ commanders: [commander], commander, cards });
  assert.ok(report.readable);
});

// ------------------------------------------------------------ plan and advice

test("a Background beside a creature commander is not an enchantment plan", () => {
  const plan = readCommanderPlan([printed["Wilson, Refined Grizzly"], printed["Raised by Giants"]].map((fact) => ({ name: fact.name, oracleText: fact.oracleText, typeLine: fact.typeLine })));
  assert.notEqual(plan.id, "enchantress");
});

test("go-wide plans are not told to run symmetric wipes; Elves and Vampires get no wipe weakness", () => {
  for (const name of ["edgar-vampires", "edgar-no-interaction"]) {
    const report = benchReport(name);
    assert.ok(!report.weaknesses.some((weakness) => weakness.id === "role-wipes"), name);
    assert.ok(!report.comparisons.some((comparison) => ["Blasphemous Act", "Wrath of God", "Damnation", "Toxic Deluge"].includes(comparison.add)), name);
  }
});

test("a cut never removes a tutor, a plan payoff, or a card doing a job the deck still needs", () => {
  const offenders = {
    "meren-aristocrats": ["Demonic Tutor", "Vampiric Tutor", "Butcher of Malakir", "Kokusho, the Evening Star"],
    "tatyova-landfall": ["Avenger of Zendikar", "Ancient Greenwarden", "Scapeshift"],
    "sythis-enchantress": ["Calix, Destiny's Hand", "Elspeth Conquers Death", "Austere Command"],
    "edgar-vampires": ["Patron of the Vein", "Cathars' Crusade", "Kindred Dominance"],
    "thrasios-tymna-partners": ["Force of Will", "Arcane Signet", "Chromatic Lantern"],
    "atraxa-counters": ["Farewell", "Nissa, Who Shakes the World"],
  };
  for (const [name, cards] of Object.entries(offenders)) {
    const report = benchReport(name);
    for (const comparison of report.comparisons) assert.ok(!cards.includes(comparison.cut), `${name}: ${comparison.cut}`);
  }
});

test("a board finisher is not offered to a deck without a board", () => {
  for (const name of ["thrasios-tymna-partners", "atraxa-counters", "oloro-control"]) {
    const report = benchReport(name);
    const adds = [...report.comparisons.map((comparison) => comparison.add), ...report.suggestedAdds.map((entry) => entry.add)];
    for (const add of ["Akroma's Will", "Craterhoof Behemoth", "Overrun", "Skullclamp"]) assert.ok(!adds.includes(add), `${name}: ${add}`);
  }
});

test("the win-condition finding is worded as a heuristic and names a combo finish", () => {
  const report = benchReport("thrasios-tymna-partners");
  const wincon = report.weaknesses.find((weakness) => weakness.id === "role-wincon");
  assert.ok(wincon);
  assert.equal(wincon.title, "Few cards whose printed text ends the game");
  assert.equal(wincon.strength, "heuristic");
  assert.match(wincon.notes.join(" "), /Thassa's Oracle and \d+ tutors/);
});

test("a commander that draws cards is credited in the draw finding (Sram)", () => {
  const report = benchReport("sram-voltron");
  const draw = report.weaknesses.find((weakness) => weakness.id === "role-draw");
  assert.ok(draw);
  assert.match(draw.notes.join(" "), /Sram, Senior Edificer draws cards itself/);
  assert.equal(draw.strength, "heuristic");
});

test("the plan sentence says when MetaForge could not read a plan, or used general bands", () => {
  // MF-DECK-COACH-003 reads Sram's plan (its text names Equipment), so the
  // honest "did not match" case is now a deck with no single plan.
  assert.match(benchReport("wilson-background").plan.sentence, /^MetaForge did not match the printed text of Wilson, Refined Grizzly \+ Raised by Giants to one of its plans/);
  assert.equal(benchReport("sram-voltron").plan.sentence, "Sram, Senior Edificer reads as Equipment.");
  assert.equal(benchReport("atraxa-counters").plan.sentence, "Atraxa, Praetors' Voice reads as +1/+1 counters. MetaForge has no separate role bands for that plan yet, so the counts below use its general midrange bands.");
});

test("a strong finding is listed before a heuristic one", () => {
  const report = benchReport("edgar-no-interaction");
  assert.equal(report.weaknesses[0].id, "role-interaction");
  assert.equal(report.weaknesses[0].strength, "strong");
});

test("an add with no safe cut is offered as an add the player tests", () => {
  const report = benchReport("edgar-no-interaction");
  assert.ok(report.suggestedAdds.some((entry) => entry.add === "Chaos Warp" && entry.source === "role-interaction"));
  const interaction = report.weaknesses.find((weakness) => weakness.id === "role-interaction");
  assert.match(interaction.change, /^Add Chaos Warp\. .* the cut is your call/);
});

// ------------------------------------------------------------ structure

test("a companion is checked against the commander's color identity and its condition is quoted", () => {
  const report = benchReport("meren-broken");
  const codes = report.structure.issues.map((issue) => issue.code);
  assert.ok(codes.includes("companion-identity"));
  const condition = report.structure.issues.find((issue) => issue.code === "companion-condition");
  assert.match(condition.message, /does not check its deck-building condition: “Each permanent card in your starting deck has mana value 2 or less\.”/);
});

test("Partner and Background pairs are legal; two unpaired legends are not", () => {
  assert.equal(benchReport("thrasios-tymna-partners").structure.legal, true);
  assert.equal(benchReport("wilson-background").structure.legal, true);
  assert.deepEqual(benchReport("atraxa-edgar-bad-pair").structure.issues.filter((issue) => issue.severity === "error").map((issue) => issue.code), ["commander-pair"]);
});

// ------------------------------------------------------------ parsing

test("a spreadsheet (CSV) export is read by its columns, not as card names", () => {
  const parsed = parseDecklist([
    "Count,Name,Edition,Board",
    "1,\"Ezuri, Renegade Leader\",c21,commander",
    "1,\"Fire // Ice\",mh2,mainboard",
    "4,Forest,lea,mainboard",
    "1,Swords to Plowshares,sta,sideboard",
    "1,Lotus Petal,tmp,maybeboard",
  ].join("\n"));
  assert.deepEqual(parsed.entries.map((entry) => [entry.name, entry.quantity, entry.section]), [
    ["Ezuri, Renegade Leader", 1, "commander"],
    ["Fire // Ice", 1, "main"],
    ["Forest", 4, "main"],
    ["Swords to Plowshares", 1, "sideboard"],
  ]);
  assert.deepEqual(parsed.commanderNames, ["Ezuri, Renegade Leader"]);
  assert.equal(parsed.problems.length, 0);
});

test("a quantity written after the name is read, and names with digits or commas survive", () => {
  const parsed = parseDecklist("Command Tower x1\nSol Ring 1x\nArcane Signet x 2\nSeven Dwarves x7\n1 Borrowing 100,000 Arrows\n1 Ezuri’s Predation");
  assert.deepEqual(parsed.entries.map((entry) => [entry.name, entry.quantity]), [
    ["Command Tower", 1], ["Sol Ring", 1], ["Arcane Signet", 2], ["Seven Dwarves", 7], ["Borrowing 100,000 Arrows", 1], ["Ezuri’s Predation", 1],
  ]);
  assert.equal(parsed.entries[5].key, "ezuri's predation", "a curly apostrophe matches the Scryfall name");
});

// ------------------------------------------------------------ benchmark floor

test("the benchmark (24 cases from 002, 8 from 003) holds its floor", async () => {
  const result = await runBench();
  assert.equal(result.cases.length, 32);
  // MF-DECK-COACH-003 dimensions: every mana and player-intent check holds.
  assert.equal(result.dimensions.mana.passed, result.dimensions.mana.total, "land band, count and assumptions");
  assert.equal(result.dimensions["player-intent"].passed, result.dimensions["player-intent"].total, "protected cards and confirmed plans");
  assert.equal(result.falsePositives.length, 0, result.falsePositives.join("\n"));
  assert.equal(result.dimensions.runs.passed, result.dimensions.runs.total, "every case builds a report");
  assert.equal(result.dimensions.legality.passed, result.dimensions.legality.total, "every legality expectation holds");
  assert.equal(result.dimensions.roles.passed, result.dimensions.roles.total, "every golden card role holds");
  assert.equal(result.dimensions["before-after"].passed, result.dimensions["before-after"].total);
  assert.equal(result.dimensions["swap-validity"].passed, result.dimensions["swap-validity"].total);
  assert.ok(result.falsePositives.length <= 1, result.falsePositives.join("\n"));
  assert.ok(result.score >= 98, `score ${result.score}`);
});

// Keep the curve-role coach's public entry point callable with no cards.
test("buildCurveRoleCoaching still answers an empty input", () => {
  assert.equal(buildCurveRoleCoaching({}).readable, false);
});
