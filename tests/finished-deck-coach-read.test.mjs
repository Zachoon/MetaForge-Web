import assert from "node:assert/strict";
import test from "node:test";
import { buildHonestCoachSummary } from "../app/honest-coach-summary.mjs";
import { buildPilotStory } from "../app/pilot-model.mjs";
import { forgeNativeMasterwork } from "../app/native-masterwork-engine.mjs";
import { TORTURE_FIXTURES, fixtureInput } from "./commander-torture-bench/fixtures.mjs";

const RESEARCH_VOICE = /structural systems?|metaforge|\bengine\b|overlapping systems|verified enough|your deck is built to get/i;

function summaryFor(commander, rows, extras = {}) {
  return buildHonestCoachSummary({
    selected: {
      rows: [{ name: commander, roles: ["commander"], cmc: 3 }, ...rows],
      strategicIntent: {
        packages: extras.packages || [],
        commanders: [{ name: commander }],
        strategy: extras.strategy || null,
      },
    },
    structuralSystems: extras.structuralSystems || null,
    activeCommanderName: commander,
    deckCardNames: [commander, ...rows.map((row) => row.name)],
    ...extras.summary,
  });
}

function commanderMentions(text, commander) {
  const needle = commander.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text.match(new RegExp(needle, "g")) || [];
}

test("a white aura list names its aura cards once and skips research language", () => {
  const commander = "Pearl-Ear, Imperial Advisor";
  const summary = summaryFor(commander, [
    { name: "Ethereal Armor", roles: [], cmc: 1, typeLine: "Enchantment — Aura", oracleText: "Enchant creature. Enchanted creature gets +1/+1." },
    { name: "Daybreak Coronet", roles: [], cmc: 2, typeLine: "Enchantment — Aura", oracleText: "Enchant creature. Enchanted creature gets +3/+3." },
    { name: "All That Glitters", roles: [], cmc: 2, typeLine: "Enchantment — Aura", oracleText: "Enchant creature. Enchanted creature gets +1/+1 for each artifact and enchantment you control." },
    { name: "Sol Ring", roles: ["ramp"], cmc: 1, typeLine: "Artifact", oracleText: "Add two mana." },
  ], { packages: [{ label: "Aura package" }] });
  const read = summary.finishedDeckRead;
  assert.match(read, /Ethereal Armor/);
  assert.match(read, /Daybreak Coronet/);
  assert.match(read, /stack auras/i);
  assert.equal(commanderMentions(read, commander).length, 1);
  assert.doesNotMatch(read, /Sol Ring/);
  assert.doesNotMatch(read, RESEARCH_VOICE);
  assert.equal(summary.pilotModel.groundedIn[0], summary.strategicRecognition.resolvedSignal);
  assert.equal(summary.finishedDeckLabel, summary.strategicRecognition.planLabel);
});

test("a black sacrifice list and an izzet spell list name different cards", () => {
  const black = summaryFor("Test Aristocrat", [
    { name: "Viscera Seer", roles: ["sacrifice"], cmc: 1, oracleText: "Sacrifice a creature: Scry 1." },
    { name: "Carrion Feeder", roles: ["sacrifice"], cmc: 1, oracleText: "Sacrifice a creature: Put a +1/+1 counter on this creature." },
    { name: "Blood Artist", roles: [], cmc: 2, oracleText: "Whenever a creature dies, target player loses 1 life." },
  ], { packages: [{ label: "Aristocrats package" }] });
  const izzet = summaryFor("Test Spell Echo", [
    { name: "Archmage Emeritus", roles: ["spells"], cmc: 3, oracleText: "Whenever you cast an instant or sorcery spell, draw a card." },
    { name: "Guttersnipe", roles: ["spells"], cmc: 3, oracleText: "Whenever you cast an instant or sorcery spell, this deals 2 damage to each opponent." },
    { name: "Counterspell", roles: ["interaction"], cmc: 2, oracleText: "Counter target spell." },
  ], { packages: [{ label: "Spellslinger package" }] });
  assert.match(black.finishedDeckRead, /Viscera Seer/);
  assert.match(black.finishedDeckRead, /convert deaths/i);
  assert.doesNotMatch(black.finishedDeckRead, /Archmage Emeritus|Guttersnipe|keep cheap spells/i);
  assert.match(izzet.finishedDeckRead, /Archmage Emeritus/);
  assert.match(izzet.finishedDeckRead, /keep cheap spells/i);
  assert.doesNotMatch(izzet.finishedDeckRead, /Viscera Seer|Counterspell/);
  assert.equal(commanderMentions(izzet.finishedDeckRead, "Test Spell Echo").length, 1);
  assert.doesNotMatch(black.finishedDeckRead, RESEARCH_VOICE);
  assert.doesNotMatch(izzet.finishedDeckRead, RESEARCH_VOICE);
});

test("a counters commission names counter cards and not an incidental treasure card", () => {
  const commander = "Atraxa, Praetors' Voice";
  const summary = summaryFor(commander, [
    { name: "Doubling Season", roles: ["counters"], cmc: 5, typeLine: "Enchantment", oracleText: "If an effect would put one or more counters on a permanent you control, it puts twice that many counters on that permanent instead." },
    { name: "Deepglow Skate", roles: [], cmc: 6, typeLine: "Creature — Fish", oracleText: "When this enters, double the number of counters on target permanents." },
    { name: "Smothering Tithe", roles: ["artifacts"], cmc: 4, typeLine: "Enchantment", oracleText: "Whenever an opponent draws a card, create a Treasure token." },
  ], { packages: [{ label: "Superfriends package" }] });
  assert.match(summary.finishedDeckRead, /Doubling Season/);
  assert.match(summary.finishedDeckRead, /stack counters/i);
  assert.doesNotMatch(summary.finishedDeckRead, /Smothering Tithe|treasure/i);
  assert.equal(summary.pilotModel.groundedIn[0], "counters");
  const pilot = buildPilotStory({ recognition: summary.strategicRecognition, commanderName: commander });
  assert.equal(pilot.groundedIn[0], summary.strategicRecognition.resolvedSignal);
});

test("an ambiguous list names one card from each contender and does not invent a primary plan", () => {
  const commander = "Y'shtola, Night's Blessed";
  const structuralSystems = {
    systems: [
      {
        signal: "spells",
        name: "Spellcraft Engine",
        members: ["Archmage Emeritus", "Guttersnipe"],
        edges: [{}, {}, {}],
        health: { overall: 80 },
      },
      {
        signal: "draw",
        name: "Card Flow Engine",
        members: ["Rhystic Study", "Mystic Remora"],
        edges: [{}, {}, {}],
        health: { overall: 79 },
      },
      {
        signal: "landfall",
        name: "Landfall Engine",
        members: ["Scute Swarm"],
        edges: [{}],
        health: { overall: 20 },
      },
    ],
    strongestSystem: { name: "Spellcraft Engine" },
    weakestSystem: { name: "Landfall Engine" },
  };
  const summary = summaryFor(commander, [
    { name: "Archmage Emeritus", roles: ["spells"], cmc: 3, oracleText: "Whenever you cast an instant or sorcery spell, draw a card." },
    { name: "Guttersnipe", roles: ["spells"], cmc: 3, oracleText: "Whenever you cast an instant or sorcery spell, this deals 2 damage to each opponent." },
    { name: "Rhystic Study", roles: ["draw"], cmc: 3, oracleText: "Whenever an opponent casts a spell, you may draw a card." },
    { name: "Mystic Remora", roles: ["draw"], cmc: 2, oracleText: "Whenever an opponent casts a noncreature spell, you may draw a card." },
    { name: "Scute Swarm", roles: [], cmc: 3, oracleText: "Landfall — create a token." },
  ], { structuralSystems });
  assert.equal(summary.strategicRecognition.ambiguous, true);
  assert.match(summary.finishedDeckRead, /Archmage Emeritus|Guttersnipe/);
  assert.match(summary.finishedDeckRead, /Rhystic Study|Mystic Remora/);
  assert.match(summary.finishedDeckRead, /opening hand/i);
  assert.doesNotMatch(summary.finishedDeckRead, /Scute Swarm|landfall/i);
  assert.doesNotMatch(summary.finishedDeckRead, RESEARCH_VOICE);
  assert.equal(commanderMentions(summary.finishedDeckRead, commander).length, 1);
});

test("card facts name the flying creatures when the rows themselves have no oracle text", () => {
  const commander = "Giada, Font of Hope";
  const angels = ["Aegis Angel", "Sephara, Sky's Blade", "Resplendent Angel", "Restoration Angel"];
  const summary = buildHonestCoachSummary({
    selected: {
      rows: [
        { name: commander, roles: ["commander"] },
        ...angels.map((name) => ({ name, roles: [] })),
        { name: "Sol Ring", roles: [] },
      ],
      strategicIntent: { packages: [], commanders: [{ name: commander }] },
    },
    activeCommanderName: commander,
    deckCardNames: [commander, ...angels, "Sol Ring"],
    cardFacts: Object.fromEntries([
      ...angels.map((name) => [name.toLowerCase(), { oracle_text: "Flying", type_line: "Creature — Angel", cmc: 4 }]),
      ["sol ring", { oracle_text: "{T}: Add {C}{C}.", type_line: "Artifact", cmc: 1 }],
    ]),
  });
  assert.match(summary.finishedDeckRead, /Aegis Angel/);
  assert.match(summary.finishedDeckRead, /get through blockers/i);
  assert.doesNotMatch(summary.finishedDeckRead, /Sol Ring/);
  assert.equal(summary.finishedDeckLabel, "Evasive combat-value");
  assert.equal(commanderMentions(summary.finishedDeckRead, commander).length, 1);
});

test("a watch card is named only when it is actually in the list", () => {
  const summary = summaryFor("Giada, Font of Hope", [
    { name: "Bishop of Wings", roles: ["combat"], cmc: 2, oracleText: "Flying. Whenever this creature attacks, create a 1/1 token." },
    { name: "Resplendent Angel", roles: ["combat"], cmc: 3, oracleText: "Flying. Whenever you attack, you may pay {1}. If you do, create a token." },
    { name: "Lyra Dawnbringer", roles: [], cmc: 5, oracleText: "Flying, lifelink." },
  ], {
    packages: [{ label: "Evasion package" }],
    summary: {},
  });
  const watched = buildHonestCoachSummary({
    selected: {
      rows: [
        { name: "Giada, Font of Hope", roles: ["commander"], cmc: 3 },
        { name: "Bishop of Wings", roles: ["combat"], cmc: 2, oracleText: "Flying. Whenever this creature attacks, create a 1/1 token." },
        { name: "Resplendent Angel", roles: ["combat"], cmc: 3, oracleText: "Flying. Whenever you attack, you may pay {1}." },
        { name: "Lyra Dawnbringer", roles: [], cmc: 5, oracleText: "Flying, lifelink." },
      ],
      strategicIntent: { packages: [{ label: "Evasion package" }], commanders: [{ name: "Giada, Font of Hope" }] },
      slotJustificationLedger: { critique: { weaklyJustified: ["Lyra Dawnbringer"] } },
    },
    activeCommanderName: "Giada, Font of Hope",
    deckCardNames: ["Giada, Font of Hope", "Bishop of Wings", "Resplendent Angel", "Lyra Dawnbringer"],
  });
  assert.match(summary.finishedDeckRead, /Bishop of Wings/);
  assert.doesNotMatch(summary.finishedDeckRead, /Not In This Deck/);
  assert.match(watched.finishedDeckRead, /Lyra Dawnbringer/);
  assert.equal(commanderMentions(watched.finishedDeckRead, "Giada, Font of Hope").length, 1);
});

test("real forged lists for three color identities each name cards from that list", () => {
  const ids = ["pearl-ear-auras", "aristocrats", "spellslinger"];
  const reads = ids.map((id) => {
    const fixture = TORTURE_FIXTURES.find((entry) => entry.id === id);
    const report = forgeNativeMasterwork(fixtureInput(fixture, 11));
    const commander = fixture.commander.name;
    const summary = buildHonestCoachSummary({
      selected: report.selected,
      activeCommanderName: commander,
      deckCardNames: report.selected.rows.map((row) => row.name),
    });
    return { id, commander, colors: fixture.commander.colors, summary, names: new Set(report.selected.rows.map((row) => row.name)) };
  });
  const texts = new Set(reads.map((entry) => entry.summary.finishedDeckRead));
  assert.equal(texts.size, 3, "each build gets its own read");
  for (const entry of reads) {
    const read = entry.summary.finishedDeckRead;
    assert.equal(commanderMentions(read, entry.commander).length, 1, entry.id);
    assert.doesNotMatch(read, RESEARCH_VOICE, entry.id);
    assert.equal(entry.summary.pilotModel.groundedIn[0], entry.summary.strategicRecognition.resolvedSignal);
    const mentioned = [...entry.names].filter((name) => name !== entry.commander && read.includes(name));
    assert.ok(mentioned.length >= 1, `${entry.id} should name a card from its own list`);
    for (const other of reads) {
      if (other.id === entry.id) continue;
      const foreign = [...other.names].filter((name) => name !== other.commander && !entry.names.has(name) && read.includes(name));
      assert.deepEqual(foreign, [], `${entry.id} named a card from ${other.id}`);
    }
  }
});
