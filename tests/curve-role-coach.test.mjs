import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildCurveRoleCoaching,
  formatCurveRoleCoaching,
  questionWantsCurveRoleCoaching,
} from "../app/curve-role-coach.mjs";
import { nativeCoachAnswer } from "../worker/native-coach.ts";

const TALRAND = {
  name: "Talrand, Sky Summoner",
  typeLine: "Legendary Creature — Merfolk Wizard",
  manaCost: "{2}{U}{U}",
  cmc: 4,
  colorIdentity: ["U"],
  oracleText: "Flying\nWhenever you cast an instant or sorcery spell, create a 2/2 blue Drake creature token with flying.",
};

const GORECLAW = {
  name: "Goreclaw, Terror of Qal Sisma",
  typeLine: "Legendary Creature — Bear",
  manaCost: "{3}{G}",
  cmc: 4,
  colorIdentity: ["G"],
  oracleText: "Goreclaw, Terror of Qal Sisma costs {1} less to cast for each other creature you control with power 4 or greater.\nCreatures you control with power 4 or greater have trample and haste.\nWhenever Goreclaw attacks, other creatures you control with power 4 or greater get +1/+1 and gain haste until end of turn.",
};

function pile() {
  const cards = [
    { name: "Island", quantity: 36, typeLine: "Basic Land — Island", oracleText: "{T}: Add {U}.", manaCost: "" },
    { name: "Faithless Looting", quantity: 1, typeLine: "Sorcery", manaCost: "{R}", oracleText: "Draw two cards, then discard two cards." },
    { name: "Merfolk Looter", quantity: 1, typeLine: "Creature — Merfolk Rogue", manaCost: "{1}{U}", oracleText: "{T}: Draw a card, then discard a card." },
    { name: "Frantic Search", quantity: 1, typeLine: "Instant", manaCost: "{2}{U}", oracleText: "Draw two cards, then discard two cards. Untap up to three lands." },
    { name: "Creature Stone", quantity: 1, typeLine: "Artifact", manaCost: "{2}", oracleText: "{T}: Add {U}. Spend this mana only to cast creature spells." },
    { name: "Dragon Stone", quantity: 1, typeLine: "Artifact", manaCost: "{2}", oracleText: "{T}: Add {R}{R}. Spend this mana only to cast Dragon spells." },
    { name: "Smothering Tithe", quantity: 1, typeLine: "Enchantment", manaCost: "{3}{W}", oracleText: "Whenever an opponent draws a card, that player may pay {2}. If the player doesn't, you create a Treasure token." },
    { name: "Dockside Extortionist", quantity: 1, typeLine: "Creature — Goblin Pirate", manaCost: "{2}{R}", oracleText: "When Dockside Extortionist enters, create X Treasure tokens, where X is the number of artifacts and enchantments your opponents control." },
  ];
  for (let index = 1; index <= 56; index += 1) {
    cards.push({
      name: `Late Spell ${index}`,
      quantity: 1,
      typeLine: "Instant",
      manaCost: "{5}{U}",
      oracleText: "Target creature gets +1/+1 until end of turn.",
    });
  }
  return cards;
}

function textOf(commander, cards = pile(), strategy = "") {
  return formatCurveRoleCoaching(buildCurveRoleCoaching({ commander, cards, strategy }));
}

test("curve coaching follows the printed plan and names the cards that are not the missing job", () => {
  const report = buildCurveRoleCoaching({ commander: TALRAND, cards: pile() });
  assert.equal(report.plan.id, "spellslinger");
  assert.equal(report.confidence.level, "high");
  const text = formatCurveRoleCoaching(report);
  assert.match(text, /Plan: Spellslinger/);
  assert.match(text, /Whenever you cast an instant or sorcery spell/);
  assert.match(text, /Theory:/);
  assert.match(text, /do not multiply|actually triggers/);
  assert.match(text, /Cards:/);
  assert.match(text, /Late Spell 1/);
  assert.match(text, /Not counted:[\s\S]*Faithless Looting/);
  assert.match(text, /Not counted:[\s\S]*Creature Stone/);
  assert.match(text, /Not counted:[\s\S]*Smothering Tithe|Dockside Extortionist/);
  assert.match(text, /Swap:/);
  assert.match(text, /Confidence: high/);
  assert.match(text, /Arcane Signet|Mind Stone|Sol Ring/);
  assert.match(text, /Counterspell|Pongify|Cyclonic Rift/);
  assert.doesNotMatch(text, /Cultivate/);
  assert.equal(report.roles.find((role) => role.id === "ramp").actual, 0);
  assert.equal(report.roles.find((role) => role.id === "draw").actual, 0);
  assert.ok(report.lootCards.includes("Faithless Looting"));
  assert.ok(report.excludedRamp.some((card) => card.name === "Creature Stone"));
  assert.ok(report.excludedRamp.some((card) => card.name === "Dockside Extortionist"));
});

test("a big-creature plan keeps its top end and asks for the mana to cast it", () => {
  const report = buildCurveRoleCoaching({ commander: GORECLAW, cards: pile() });
  assert.equal(report.plan.id, "big-creatures");
  const text = formatCurveRoleCoaching(report);
  const curve = report.lessons.find((lesson) => lesson.id === "curve-top");
  assert.ok(curve);
  assert.match(curve.theory, /high top end belongs/i);
  assert.doesNotMatch(curve.theory, /do not multiply|does not feed|against the printed trigger/i);
  assert.match(text, /Theory:/);
  assert.match(text, /Late Spell/);
  assert.match(curve.theory, /early/i);
  assert.doesNotMatch(text, /Counterspell/);
});

test("missing commander text keeps the confidence low", () => {
  const report = buildCurveRoleCoaching({
    commander: { name: "Talrand, Sky Summoner", colorIdentity: ["U"] },
    cards: pile(),
  });
  assert.equal(report.readable, true);
  assert.equal(report.confidence.level, "low");
  assert.match(report.confidence.reason, /printed text is missing/i);
  assert.match(formatCurveRoleCoaching(report), /Confidence: low/);
});

test("names alone are not enough to judge the curve", () => {
  const report = buildCurveRoleCoaching({
    commander: { name: "Talrand, Sky Summoner" },
    cards: [{ name: "Late Spell", quantity: 1 }],
  });
  assert.equal(report.readable, false);
  assert.match(formatCurveRoleCoaching(report), /Paste the decklist with the commander's printed Oracle text/);
  assert.match(formatCurveRoleCoaching(report), /loot is not card advantage/i);
});

test("the curve question is not the recommendation question", () => {
  assert.equal(questionWantsCurveRoleCoaching("Why this change?"), false);
  assert.equal(questionWantsCurveRoleCoaching("I lost my last game. Did I misplay?"), false);
  assert.equal(questionWantsCurveRoleCoaching("How does this mana curve fit the commander?"), true);
  assert.equal(questionWantsCurveRoleCoaching("Is this loot or card advantage?"), true);
});

test("Native Coach teaches the curve from printed text and leaves the recommendation path alone", () => {
  const cards = pile();
  const deckText = cards.map((card) => `${card.quantity} ${card.name}`).join("\n");
  const answer = nativeCoachAnswer(
    [{ role: "user", content: "How does this mana curve fit the commander?" }],
    { game: "Magic: The Gathering", format: "Commander", deckText, commander: TALRAND, cards },
  );
  assert.match(answer, /Theory:/);
  assert.match(answer, /Spellslinger/);
  assert.match(answer, /Faithless Looting/);
  assert.match(answer, /Swap:/);
  assert.match(answer, /Confidence:/);
  assert.doesNotMatch(answer, /Cultivate/);
  assert.doesNotMatch(answer, /2500 opening hands/);

  const recommendation = nativeCoachAnswer(
    [{ role: "user", content: "Why this change?" }],
    { game: "Magic: The Gathering", format: "Standard", deckText: "22 Mountain\n2 Expensive Spell\n36 Core Spell" },
  );
  assert.match(recommendation, /Change:/);
  assert.match(recommendation, /Expected gain:/);
  assert.match(recommendation, /Tradeoff:/);
  assert.match(recommendation, /2500 opening hands/);
  assert.doesNotMatch(recommendation, /Theory:/);

  const empty = nativeCoachAnswer([{ role: "user", content: "Hello" }], { game: "Magic: The Gathering" });
  assert.match(empty, /Paste the decklist/);
  assert.doesNotMatch(empty, /name the format/i);
});

test("the coach panel is in the workbench and wraps on a phone", () => {
  const workbench = readFileSync(new URL("../app/components/forge/workbench-chamber.tsx", import.meta.url), "utf8");
  const panel = readFileSync(new URL("../app/components/forge/curve-role-coach.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../app/testing-anvil.css", import.meta.url), "utf8");
  assert.match(workbench, /<CurveRoleCoach/);
  assert.match(workbench, /YOUR COACH/);
  assert.match(workbench, /honest-coach-brief-stream/);
  assert.match(panel, /curve-role-coach/);
  assert.match(panel, /Reading printed Oracle text/);
  assert.doesNotMatch(panel, /<select|name the format|format selector/i);
  assert.match(css, /\.curve-role-coach\{[^}]*overflow-wrap:anywhere/);
  assert.match(css, /@media \(max-width: 720px\)[\s\S]*\.curve-role-roles\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)\}/);
  assert.match(css, /@media \(max-width: 420px\)[\s\S]*\.curve-role-roles\{grid-template-columns:minmax\(0,1fr\)\}/);
});

test("a stated strategy does not rename a commander the printed text already explains", () => {
  const text = textOf(TALRAND, pile(), "big creatures and stompy");
  assert.match(text, /printed text/i);
  assert.match(text, /Spellslinger/);
});
