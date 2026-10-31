import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { classifyPrintedCard, buildCurveRoleCoaching, formatCurveRoleCoaching } from "../app/curve-role-coach.mjs";
import { nativeCoachAnswer } from "../worker/native-coach.ts";

function card(name, oracleText, typeLine = "Instant", extra = {}) {
  return classifyPrintedCard({ name, oracleText, typeLine, ...extra });
}

const TALRAND = {
  name: "Talrand, Sky Summoner",
  typeLine: "Legendary Creature — Merfolk Wizard",
  manaCost: "{2}{U}{U}",
  cmc: 4,
  colorIdentity: ["U"],
  oracleText: "Flying\nWhenever you cast an instant or sorcery spell, create a 2/2 blue Drake creature token with flying.",
};

const TROSTANI = {
  name: "Trostani, Selesnya's Voice",
  typeLine: "Legendary Creature — Dryad",
  manaCost: "{G}{G}{W}{W}",
  cmc: 4,
  colorIdentity: ["G", "W"],
  oracleText: "Whenever another creature you control enters, you gain life equal to that creature's toughness.\n{1}{G}{W}, {T}: Populate. (Create a token that's a copy of a creature token you control.)",
};

const GORECLAW = {
  name: "Goreclaw, Terror of Qal Sisma",
  typeLine: "Legendary Creature — Bear",
  manaCost: "{3}{G}",
  cmc: 4,
  colorIdentity: ["G"],
  oracleText: "Goreclaw, Terror of Qal Sisma costs {1} less to cast for each other creature you control with power 4 or greater.\nCreatures you control with power 4 or greater have trample and haste.\nWhenever Goreclaw attacks, other creatures you control with power 4 or greater get +1/+1 and gain haste until end of turn.",
};

const SWORDS = { name: "Swords to Plowshares", typeLine: "Instant", manaCost: "{W}", oracleText: "Exile target creature. Its controller gains life equal to its power." };
const PONGIFY = { name: "Pongify", typeLine: "Instant", manaCost: "{U}", oracleText: "Destroy target creature. It can't be regenerated. Its controller creates a 3/3 green Ape creature token." };
const COUNTERSPELL = { name: "Counterspell", typeLine: "Instant", manaCost: "{U}{U}", oracleText: "Counter target spell." };
const SEAL = { name: "Seal of Cleansing", typeLine: "Enchantment", manaCost: "{1}{W}", oracleText: "Sacrifice Seal of Cleansing: Destroy target artifact or enchantment." };
const FATAL = { name: "Fatal Push", typeLine: "Instant", manaCost: "{B}", oracleText: "Destroy target creature if it has mana value 2 or less.\nRevolt — Destroy that creature if it has mana value 4 or less instead if a permanent you controlled left the battlefield this turn." };
const WRATH = { name: "Wrath of God", typeLine: "Sorcery", manaCost: "{2}{W}{W}", oracleText: "Destroy all creatures. They can't be regenerated." };
const DELUGE = { name: "Toxic Deluge", typeLine: "Sorcery", manaCost: "{2}{B}", oracleText: "As an additional cost to cast this spell, pay X life.\nAll creatures get -X/-X until end of turn." };
const RIFT = { name: "Cyclonic Rift", typeLine: "Instant", manaCost: "{1}{U}", oracleText: "Return target nonland permanent you don't control to its owner's hand.\nOverload {6}{U} (You may cast this spell for its overload cost. If you do, change \"target\" in its text to \"each.\")" };
const WAKE = { name: "In Garruk's Wake", typeLine: "Sorcery", manaCost: "{6}{B}{B}", oracleText: "Destroy all creatures you don't control and all planeswalkers you don't control." };
const AUSTERE = { name: "Austere Command", typeLine: "Sorcery", manaCost: "{4}{W}{W}", oracleText: "Choose two —\n• Destroy all artifacts.\n• Destroy all enchantments.\n• Destroy all creatures with mana value 3 or less.\n• Destroy all creatures with mana value 4 or greater." };
const HARMONIZE = { name: "Harmonize", typeLine: "Sorcery", manaCost: "{2}{G}{G}", oracleText: "Draw three cards." };
const WHISPERER = { name: "Beast Whisperer", typeLine: "Creature — Elf Druid", manaCost: "{2}{G}{G}", oracleText: "Whenever you cast a creature spell, draw a card." };
const RHYSTIC = { name: "Rhystic Study", typeLine: "Enchantment", manaCost: "{2}{U}", oracleText: "Whenever an opponent casts a spell, you may draw a card unless that player pays {1}." };
const LOOTING = { name: "Faithless Looting", typeLine: "Sorcery", manaCost: "{R}", oracleText: "Draw two cards, then discard two cards." };
const IMPULSE = { name: "Reckless Impulse", typeLine: "Sorcery", manaCost: "{1}{R}", oracleText: "Exile the top two cards of your library. Until the end of your next turn, you may play those cards." };
const TUTOR = { name: "Demonic Tutor", typeLine: "Sorcery", manaCost: "{1}{B}", oracleText: "Search your library for a card, put that card into your hand, then shuffle." };
const WORLDLY = { name: "Worldly Tutor", typeLine: "Instant", manaCost: "{G}", oracleText: "Search your library for a creature card, reveal it, then shuffle and put that card on top." };
const HEROIC = { name: "Heroic Intervention", typeLine: "Instant", manaCost: "{1}{W}", oracleText: "Permanents you control gain hexproof and indestructible until end of turn. Untap them." };
const GREAVES = { name: "Lightning Greaves", typeLine: "Artifact — Equipment", manaCost: "{2}", oracleText: "Equipped creature has haste and shroud.\nEquip {0}." };
const SIGNET = { name: "Arcane Signet", typeLine: "Artifact", manaCost: "{2}", oracleText: "{T}: Add one mana of any color in your commander's color identity." };
const HOOF = { name: "Craterhoof Behemoth", typeLine: "Creature — Beast", manaCost: "{5}{G}{G}{G}", oracleText: "Haste\nWhen this creature enters, creatures you control gain trample and get +X/+X until end of turn, where X is the number of creatures you control." };
const RESERVOIR = { name: "Aetherflux Reservoir", typeLine: "Artifact", manaCost: "{4}", oracleText: "Whenever you cast a spell, you gain 1 life for each spell you've cast this turn.\nPay 50 life: This artifact deals 50 damage to any target." };
const FOREST = { name: "Forest", quantity: 18, typeLine: "Basic Land — Forest", oracleText: "{T}: Add {G}." };
const PLAINS = { name: "Plains", quantity: 18, typeLine: "Basic Land — Plains", oracleText: "{T}: Add {W}." };
const ISLAND = { name: "Island", quantity: 36, typeLine: "Basic Land — Island", oracleText: "{T}: Add {U}." };

function copies(entry, quantity, manaCost) {
  return { ...entry, quantity, manaCost: manaCost || entry.manaCost };
}

function fill(cards, manaCost) {
  const count = cards.reduce((sum, entry) => sum + (entry.quantity || 1), 0);
  const next = cards.slice();
  for (let index = 0; next.reduce((sum, entry) => sum + (entry.quantity || 1), 0) < 96; index += 1) {
    next.push({
      name: `Filler ${index}`,
      quantity: 1,
      typeLine: "Instant",
      manaCost,
      oracleText: "Target creature gets +1/+1 until end of turn.",
    });
  }
  assert.ok(count >= 0);
  return next;
}

function row(report, id) {
  return report.answerRead.rows.find((entry) => entry.id === id);
}

function weakness(report, id) {
  return report.weaknesses.find((entry) => entry.id === id);
}

test("targeted removal, narrow removal, counters, and protection stay different jobs", () => {
  const swords = card(SWORDS.name, SWORDS.oracleText);
  assert.equal(swords.interaction, true);
  assert.equal(swords.removalFlexible, true);
  assert.equal(swords.counter, false);
  assert.equal(swords.protection, false);
  assert.equal(swords.wipes, false);

  const push = card(FATAL.name, FATAL.oracleText);
  assert.equal(push.interaction, true);
  assert.equal(push.removalFlexible, false);
  assert.match(push.removalNote, /mana value 2 or less/i);
  assert.match(push.removalNote, /4 or less/i);

  const seal = card(SEAL.name, SEAL.oracleText, SEAL.typeLine);
  assert.equal(seal.removalFlexible, false);
  assert.match(seal.removalNote, /artifact or enchantment/i);

  const plank = card("Walk the Plank", "Destroy target non-Merfolk creature.", "Sorcery");
  assert.equal(plank.removalFlexible, false);
  assert.match(plank.removalNote, /Merfolk/i);

  const small = card("Smother", "Destroy target creature with power 3 or less.");
  assert.equal(small.removalFlexible, false);
  assert.match(small.removalNote, /power 3 or less/i);

  const bolt = card("Lightning Bolt", "Lightning Bolt deals 3 damage to any target.");
  assert.equal(bolt.interaction, true);
  assert.equal(bolt.removalFlexible, false);
  assert.match(bolt.removalNote, /3 damage/i);

  const negate = card("Negate", "Counter target noncreature spell.");
  assert.equal(negate.counter, true);
  assert.equal(negate.counterFlexible, false);
  assert.equal(negate.removal, false);
  assert.match(negate.counterNote, /noncreature/i);

  const counter = card(COUNTERSPELL.name, COUNTERSPELL.oracleText);
  assert.equal(counter.counterFlexible, true);
  assert.equal(counter.removal, false);
  assert.equal(counter.protection, false);

  const heroic = card(HEROIC.name, HEROIC.oracleText);
  assert.equal(heroic.protection, true);
  assert.equal(heroic.interaction, false);

  const greaves = card(GREAVES.name, GREAVES.oracleText, GREAVES.typeLine);
  assert.equal(greaves.protection, true);
  assert.match(greaves.protectionNote, /equip/i);

  const bogle = card("Slippery Bogle", "Hexproof", "Creature — Beast");
  assert.equal(bogle.protection, false);

  const self = card("Gladecover Scout", "This creature has hexproof.", "Creature — Elf Scout");
  assert.equal(self.protection, false);

  const warp = card("Chaos Warp", "The owner of target permanent shuffles it into their library, then reveals the top card of their library. If it's a permanent card, they put it onto the battlefield.");
  assert.equal(warp.interaction, true);
  assert.equal(warp.removalFlexible, true);

  const edict = card("Diabolic Edict", "Target opponent sacrifices a creature.", "Sorcery");
  assert.equal(edict.interaction, true);
  assert.equal(edict.removalFlexible, false);
  assert.match(edict.removalNote, /chooses/i);
  assert.equal(edict.wipes, false);
});

test("wipes record one-sided, symmetric, choice, and size", () => {
  const wrath = card(WRATH.name, WRATH.oracleText, "Sorcery");
  assert.equal(wrath.wipes, true);
  assert.equal(wrath.interaction, false);
  assert.equal(wrath.wipeScope, "symmetric");
  assert.ok(wrath.wipeHits.includes("creatures"));

  const wake = card(WAKE.name, WAKE.oracleText, "Sorcery");
  assert.equal(wake.wipeScope, "one-sided");
  assert.equal(wake.interaction, false);

  const rift = card(RIFT.name, RIFT.oracleText);
  assert.equal(rift.interaction, true);
  assert.equal(rift.wipes, true);
  assert.equal(rift.wipeScope, "one-sided");
  assert.equal(rift.removalFlexible, true);

  const deluge = card(DELUGE.name, DELUGE.oracleText, "Sorcery");
  assert.equal(deluge.wipeScalable, true);
  assert.equal(deluge.wipeScope, "symmetric");

  const austere = card(AUSTERE.name, AUSTERE.oracleText, "Sorcery");
  assert.equal(austere.wipes, true);
  assert.equal(austere.wipeScope, "choice");

  const vandal = card("Vandalblast", "Destroy target artifact you don't control.\nOverload {4}{R} (You may cast this spell for its overload cost. If you do, change its text by replacing all instances of \"target\" with \"each.\")", "Sorcery");
  assert.equal(vandal.wipes, true);
  assert.equal(vandal.interaction, true);
  assert.equal(vandal.wipeScope, "one-sided");
  assert.equal(vandal.removalFlexible, false);
});

test("draw, loot, impulse, selection, and tutors are not the same kind of card", () => {
  const whisperer = card(WHISPERER.name, WHISPERER.oracleText, WHISPERER.typeLine);
  assert.equal(whisperer.draw, true);
  assert.equal(whisperer.drawKind, "engine");

  const harmonize = card(HARMONIZE.name, HARMONIZE.oracleText, "Sorcery");
  assert.equal(harmonize.draw, true);
  assert.equal(harmonize.drawKind, "burst");

  const opt = card("Opt", "Scry 1.\nDraw a card.");
  assert.equal(opt.draw, true);
  assert.equal(opt.drawKind, "cantrip");

  const looting = card(LOOTING.name, LOOTING.oracleText, "Sorcery");
  assert.equal(looting.draw, false);
  assert.equal(looting.loot, true);
  assert.equal(looting.impulse, false);

  const impulse = card(IMPULSE.name, IMPULSE.oracleText, "Sorcery");
  assert.equal(impulse.draw, false);
  assert.equal(impulse.impulse, true);
  assert.match(impulse.impulseNote, /end of your next turn/i);

  const jeska = card("Jeska's Will", "Choose one. If you control a commander as you cast this spell, you may choose both instead.\n• Add {R} for each card in target opponent's hand.\n• Exile the top three cards of your library. You may play them this turn.");
  assert.equal(jeska.impulse, true);
  assert.equal(jeska.draw, false);
  assert.equal(jeska.ramp, false);

  const paid = card("Paid Impulse", "You may discard a card. If you do, draw two cards.");
  assert.equal(paid.draw, true);
  assert.equal(paid.impulse, false);

  const dig = card("Dig Through Time", "Delve (Each card you exile from your graveyard while casting this spell pays for {1}.)\nLook at the top seven cards of your library. Put two of them into your hand and the rest on the bottom of your library.");
  assert.equal(dig.draw, true);
  assert.equal(dig.drawKind, "burst");
  assert.equal(dig.tutor, false);

  const anticipate = card("Anticipate", "Look at the top three cards of your library. Put one of them into your hand and the rest on the bottom of your library.");
  assert.equal(anticipate.draw, false);
  assert.equal(anticipate.selection, true);

  const tutor = card(TUTOR.name, TUTOR.oracleText, "Sorcery");
  assert.equal(tutor.draw, false);
  assert.equal(tutor.tutor, true);
  assert.equal(tutor.tutorOpen, true);
  assert.match(tutor.tutorNote, /hand does not get larger/i);

  const worldly = card(WORLDLY.name, WORLDLY.oracleText);
  assert.equal(worldly.tutor, true);
  assert.equal(worldly.tutorOpen, false);
  assert.match(worldly.tutorNote, /creature card/i);
  assert.match(worldly.tutorNote, /not a draw/i);

  const cultivate = card("Cultivate", "Search your library for up to two basic land cards, reveal those cards, put one onto the battlefield tapped and the other into your hand, then shuffle.", "Sorcery");
  assert.equal(cultivate.ramp, true);
  assert.equal(cultivate.tutor, false);
  assert.equal(cultivate.draw, false);

  const regrowth = card("Regrowth", "Return target card from your graveyard to your hand.", "Sorcery");
  assert.equal(regrowth.draw, false);
  assert.equal(regrowth.tutor, false);
  assert.equal(regrowth.selection, false);
});

test("a token deck is told that Fatal Push, Wrath, a loot, an impulse, and a tutor are not the missing jobs", () => {
  const report = buildCurveRoleCoaching({
    commander: TROSTANI,
    cards: [
      FOREST,
      PLAINS,
      copies(SEAL, 8),
      copies(WRATH, 2),
      LOOTING,
      IMPULSE,
      TUTOR,
      copies(HARMONIZE, 6),
      copies(SIGNET, 12),
      copies(HOOF, 3),
      copies(HEROIC, 3),
    ],
  });
  assert.equal(report.plan.id, "tokens");
  const text = formatCurveRoleCoaching(report);
  assert.match(text, /Interaction and card advantage/);
  assert.match(text, /Seal of Cleansing/);
  assert.match(text, /artifact or enchantment/i);
  assert.match(text, /Wrath of God/);
  assert.match(text, /your creatures|including yours|own board/i);
  assert.match(text, /Faithless Looting/);
  assert.match(text, /Reckless Impulse/);
  assert.match(text, /Demonic Tutor/);
  assert.match(text, /not card advantage/i);
  assert.match(text, /about \d+–\d+/i);
  const removal = row(report, "removal");
  assert.equal(removal.actual, 0);
  assert.equal(removal.status, "short");
  assert.ok(removal.min >= 1);
  const conditional = row(report, "conditional");
  assert.equal(conditional.actual, 8);
  const engines = row(report, "engines");
  assert.equal(engines.actual, 0);
  assert.equal(row(report, "wipes").status, "short");
  assert.match(report.answerRead.confidence.level, /low|medium|high/);
  assert.match(text, /Confidence: (low|medium|high)/);
});

test("a finished token list whose removal is only Seal of Cleansing is coached on that gate", () => {
  const report = buildCurveRoleCoaching({
    commander: TROSTANI,
    cards: fill([
      FOREST,
      PLAINS,
      copies(SEAL, 10),
      copies(AUSTERE, 2),
      copies(WHISPERER, 6),
      copies(HARMONIZE, 6),
      copies(SIGNET, 11),
      copies(HOOF, 3),
      copies(HEROIC, 3),
    ], "{G}"),
  });
  assert.equal(report.plan.id, "tokens");
  const hole = weakness(report, "answers-conditional");
  assert.ok(hole, report.weaknesses.map((entry) => entry.id).join(", "));
  assert.match(hole.plain, /Seal of Cleansing/);
  assert.match(hole.plain, /artifact or enchantment/i);
  assert.match(hole.plain, /about \d+–\d+/);
  assert.match(hole.citations[0].quote, /Destroy target artifact or enchantment/);
  assert.match(hole.confidence, /low|medium|high/);
  assert.match(hole.swaps[0].add, /Swords to Plowshares|Beast Within|Generous Gift|Anguished Unmaking/);
  assert.notEqual(hole.swaps[0].add, "Seal of Cleansing");
});

test("Talrand with removal and no counterspells is short on counters, and a counter suite is not", () => {
  const short = buildCurveRoleCoaching({
    commander: TALRAND,
    cards: fill([
      ISLAND,
      copies(PONGIFY, 10),
      copies(RIFT, 2),
      copies(RHYSTIC, 12),
      copies(SIGNET, 10),
      copies(RESERVOIR, 3),
    ], "{U}"),
  });
  assert.equal(short.plan.id, "spellslinger");
  const counters = weakness(short, "answers-counters");
  assert.ok(counters, short.weaknesses.map((entry) => entry.id).join(", "));
  assert.match(counters.plain, /counterspell/i);
  assert.match(counters.plain, /about \d+–\d+/);
  assert.match(counters.plain, /Talrand|instant/i);
  assert.equal(counters.swaps[0].add, "Counterspell");
  assert.equal(row(short, "counters").actual, 0);
  assert.equal(row(short, "counters").status, "short");
  assert.ok(row(short, "removal").actual >= 2);

  const healthy = buildCurveRoleCoaching({
    commander: TALRAND,
    cards: [
      ISLAND,
      copies(COUNTERSPELL, 10),
      copies(RIFT, 3),
      copies(RHYSTIC, 12),
      copies(SIGNET, 10),
      copies(RESERVOIR, 3),
    ],
  });
  assert.equal(healthy.weaknessHeading, "How this plan is doing");
  assert.equal(weakness(healthy, "answers-counters"), undefined);
  assert.notEqual(row(healthy, "counters").status, "short");
  assert.notEqual(row(healthy, "wipes").status, "short");
});

test("Wrath fights a token plan and Toxic Deluge can spare a big-creature plan", () => {
  const tokens = buildCurveRoleCoaching({
    commander: TROSTANI,
    cards: fill([
      FOREST,
      PLAINS,
      copies(SWORDS, 10),
      copies(WRATH, 2),
      copies(WHISPERER, 6),
      copies(HARMONIZE, 6),
      copies(SIGNET, 11),
      copies(HOOF, 3),
      copies(HEROIC, 3),
    ], "{W}"),
  });
  const wipe = weakness(tokens, "wipes-own-board");
  assert.ok(wipe, tokens.weaknesses.map((entry) => entry.id).join(", "));
  assert.match(wipe.plain, /Wrath of God/);
  assert.match(wipe.plain, /your creatures|own board|leaves your/i);
  assert.match(wipe.plain, /about \d+–\d+/);
  assert.match(wipe.citations[0].quote, /Destroy all creatures/);
  assert.equal(row(tokens, "wipes").status, "short");

  const big = buildCurveRoleCoaching({
    commander: GORECLAW,
    cards: [
      { ...FOREST, quantity: 36 },
      DELUGE,
      copies(SIGNET, 8),
    ],
  });
  assert.equal(big.plan.id, "big-creatures");
  const described = row(big, "wipes");
  assert.match(described.detail, /Toxic Deluge/);
  assert.match(described.detail, /toughness|choose/i);
  assert.equal(described.status, "ok");
  const wrathList = buildCurveRoleCoaching({
    commander: GORECLAW,
    cards: [{ ...FOREST, quantity: 36 }, WRATH],
  });
  assert.match(row(wrathList, "wipes").detail, /your creatures|board this commander/i);
  assert.equal(row(wrathList, "wipes").status, "short");
});

test("repeatable draw is the engine, and a burst that fills the draw count is still called once", () => {
  const report = buildCurveRoleCoaching({
    commander: TROSTANI,
    cards: fill([
      FOREST,
      PLAINS,
      copies(SWORDS, 10),
      copies(AUSTERE, 2),
      copies(HARMONIZE, 12),
      copies(SIGNET, 11),
      copies(HOOF, 3),
      copies(HEROIC, 3),
    ], "{G}"),
  });
  const hole = weakness(report, "draw-engines");
  assert.ok(hole, report.weaknesses.map((entry) => entry.id).join(", "));
  assert.match(hole.plain, /Harmonize/);
  assert.match(hole.plain, /once/i);
  assert.match(hole.plain, /about \d+–\d+/);
  assert.match(hole.swaps[0].add, /Beast Whisperer|Skullclamp|Phyrexian Arena/);
  assert.equal(row(report, "engines").actual, 0);
  assert.equal(row(report, "engines").status, "short");
  const text = formatCurveRoleCoaching(report);
  assert.match(text, /Repeatable card draw: 0/);
});

test("a short draw list quotes the impulse and the tutor ahead of a card that is merely expensive", () => {
  const report = buildCurveRoleCoaching({
    commander: GORECLAW,
    cards: [
      { ...FOREST, quantity: 20 },
      LOOTING,
      IMPULSE,
      WORLDLY,
      { name: "Gigantosaurus", quantity: 1, typeLine: "Creature — Dinosaur", manaCost: "{5}{G}{G}{G}{G}", oracleText: "" },
    ],
  });
  const draw = weakness(report, "role-draw");
  assert.ok(draw);
  const quotes = draw.citations.map((cite) => `${cite.name} ${cite.quote} ${cite.says}`).join("\n");
  assert.match(quotes, /Faithless Looting/);
  assert.match(quotes, /not card advantage/i);
  assert.match(quotes, /Reckless Impulse|Worldly Tutor/);
  const text = formatCurveRoleCoaching(report);
  assert.match(text, /Not card advantage:[\s\S]*Reckless Impulse/);
  assert.match(text, /Not card advantage:[\s\S]*Worldly Tutor/);
  assert.doesNotMatch(text, /name the format|format selector/i);
});

test("the interaction question reaches this read and does not ask for a format", () => {
  const cards = [ISLAND, COUNTERSPELL, IMPULSE, TUTOR];
  const deckText = cards.map((entry) => `${entry.quantity || 1} ${entry.name}`).join("\n");
  const answer = nativeCoachAnswer(
    [{ role: "user", content: "How is my interaction and card advantage?" }],
    { game: "Magic: The Gathering", format: "Commander", deckText, commander: TALRAND, cards },
  );
  assert.match(answer, /Interaction and card advantage/);
  assert.match(answer, /Counterspell/);
  assert.match(answer, /Reckless Impulse/);
  assert.match(answer, /Demonic Tutor/);
  assert.doesNotMatch(answer, /name the format|format selector|Standard/i);
});

test("the coach panel stacks the new read on a phone and has no format selector", () => {
  const panel = readFileSync(new URL("../app/components/forge/curve-role-coach.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../app/testing-anvil.css", import.meta.url), "utf8");
  assert.match(panel, /Interaction and card advantage/);
  assert.match(panel, /curve-role-answers/);
  assert.doesNotMatch(panel, /<select|format selector/i);
  assert.match(css, /\.curve-role-answers\{[^}]*grid-template-columns:minmax\(0,1fr\)/);
  assert.match(css, /\.curve-role-answers li\{[^}]*overflow-wrap:anywhere/);
  assert.match(css, /\.curve-role-answers small\{[^}]*overflow-wrap:anywhere/);
  assert.doesNotMatch(css, /\.curve-role-answers\{[^}]*grid-template-columns:repeat\((?:[3-9]|\d\d)/);
});
