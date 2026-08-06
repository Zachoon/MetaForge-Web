import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { describeCardTiming } from "../app/card-timing-reasoning.mjs";

// Voice regression guard: every player-facing string in the two data
// tables (POWER_CATEGORY_TIMING and DISPLAY_ROLE_INTENT/WHY) must never
// lean on a bare MTG term without translating it first — a real slip that
// happened once already (repeatableValueEngine's intent originally read
// "This card is a repeatable value engine," and several fallback entries
// used "board," "resolves," "ramp," "tutor," "tempo," and "counterspell"
// as unexplained nouns). Scans only the data-table source text, not the
// whole file, since the file's own code comments are for developers and
// are allowed to use real MTG vocabulary freely.
test("the coaching data tables never lean on bare MTG jargon without translating it first", async () => {
  const source = await readFile(new URL("../app/card-timing-reasoning.mjs", import.meta.url), "utf8");
  const tableBlocks = [...source.matchAll(/const (?:POWER_CATEGORY_TIMING|DISPLAY_ROLE_INTENT|DISPLAY_ROLE_WHY) = Object\.freeze\(\{[\s\S]*?\n\}\);/g)].map((match) => match[0]);
  assert.equal(tableBlocks.length, 3, "expected to find all three data tables — this test's own regex may need updating if they were renamed");
  // Object keys (fastMana:, tutor:, "Card advantage":) are internal
  // identifiers, not player-facing text — only a string immediately after
  // a colon is a property VALUE (a quoted key is always followed by ":",
  // never preceded by one), so only those are scanned.
  const stringLiterals = tableBlocks.flatMap((block) => [...block.matchAll(/:\s*"((?:[^"\\]|\\.)*)"/g)].map((match) => match[1]));
  assert.ok(stringLiterals.length > 20, "sanity check: expected many string literals across three data tables, not a parsing miss");
  const forbidden = [/\bboard\b/i, /\bresolves\b/i, /\bramp\b/i, /\btutor'?s?\b/i, /\btempo\b/i, /\bcounterspell\b/i, /\bengine\b/i, /\bcard advantage\b/i];
  for (const text of stringLiterals) {
    for (const pattern of forbidden) {
      assert.doesNotMatch(text, pattern, `found bare jargon ${pattern} in coaching copy: "${text}"`);
    }
  }
});

// Reuses the exact same real/synthetic card shapes as
// tests/commander-power-signal.test.mjs, so this file is checking the
// coaching read on top of the same fixtures already proven to trigger
// each detector, not a second, drifting set of examples.
const card = (name, typeLine, oracleText, cmc, isCommander = false, quantity = 1) =>
  ({ name, typeLine, oracleText, cmc, isCommander, quantity });

const solRing = card("Sol Ring", "Artifact", "{T}: Add {C}{C}.", 1);
const demonicTutor = card("Demonic Tutor", "Sorcery", "Search your library for a card, put that card into your hand, then shuffle.", 2);
const timeWarp = card("Time Warp", "Sorcery", "Target player takes an extra turn after this one.", 4);
const armageddon = card("Armageddon", "Sorcery", "Destroy all lands.", 3);
const efficientBolt = card("Test Efficient Removal", "Instant", "Destroy target creature.", 2);
const dualSignalCard = card("Test Dual Signal Rock", "Artifact", "Add {C}. Sacrifice a creature: Draw a card.", 0);
const manaDoubler = card("Test Mana Doubler", "Artifact", "Double the amount of mana this land produces.", 2);
const vanillaBear = card("Grizzly Bears", "Creature — Bear", "", 2);
const plains = card("Plains", "Basic Land — Plains", "({T}: Add {W}.)", 0);
const expensiveRemoval = card("Test Expensive Removal", "Instant", "Destroy target creature.", 5);

test("never returns null and always has all five fields, for any real card", () => {
  for (const fixture of [solRing, demonicTutor, timeWarp, armageddon, efficientBolt, dualSignalCard, manaDoubler, vanillaBear, plains, expensiveRemoval]) {
    const timing = describeCardTiming(fixture);
    assert.ok(timing, `${fixture.name} must never get a null timing read`);
    for (const field of ["intent", "clockLabel", "clock", "whyItMatters", "source"]) {
      assert.ok(typeof timing[field] === "string" && timing[field].length > 0, `${fixture.name}'s timing.${field} must be a real, non-empty string`);
    }
  }
});

test("Sol Ring (fastMana): Immediate clock, tied to its actual castable turn", () => {
  const timing = describeCardTiming(solRing);
  assert.equal(timing.source, "power-signal:fastMana");
  assert.match(timing.intent, /accelerate your mana/i);
  assert.equal(timing.clockLabel, "Immediate");
  assert.match(timing.clock, /turn 1/);
  assert.match(timing.whyItMatters, /judge it by what it enables/i);
});

test("Demonic Tutor (tutor): a Flexible clock, never a fabricated turn number", () => {
  const timing = describeCardTiming(demonicTutor);
  assert.equal(timing.source, "power-signal:tutor");
  assert.match(timing.intent, /finds exactly the piece/i);
  assert.equal(timing.clockLabel, "Flexible");
  assert.doesNotMatch(timing.clock, /turn \d/);
});

test("Time Warp (extraTurn): Late-game clock, framed as a multiplier not a plan", () => {
  const timing = describeCardTiming(timeWarp);
  assert.equal(timing.source, "power-signal:extraTurn");
  assert.equal(timing.clockLabel, "Late-game");
  assert.match(timing.whyItMatters, /multiplier/i);
});

test("Armageddon (massLandDenial): Late-game clock regardless of its own mana value", () => {
  // Armageddon is mana value 3 — a naive CMC bucket would call that
  // "Early." The real clock is about board state, not casting cost, which
  // is exactly why this category overrides the CMC-based bucket instead of
  // reusing it.
  const timing = describeCardTiming(armageddon);
  assert.equal(timing.source, "power-signal:massLandDenial");
  assert.equal(timing.clockLabel, "Late-game");
  assert.match(timing.clock, /once you're already ahead/i);
});

test("cheap unconditional removal (efficientInteraction): Reactive clock, not turn-bucketed", () => {
  const timing = describeCardTiming(efficientBolt);
  assert.equal(timing.source, "power-signal:efficientInteraction");
  assert.equal(timing.clockLabel, "Reactive");
  assert.doesNotMatch(timing.clock, /turn \d/);
});

test("a sacrifice engine (repeatableValueEngine): plain-language intent, no bare jargon, clock notes compounding value not just its cast turn", () => {
  const timing = describeCardTiming(dualSignalCard);
  assert.equal(timing.source, "power-signal:repeatableValueEngine");
  assert.match(timing.intent, /keeps paying off every time it triggers/i);
  assert.doesNotMatch(timing.intent, /\bengine\b/i, "the coaching copy must never lean on the bare term \"engine\" without translating it first");
  assert.match(timing.clock, /compounding|survives/i);
});

test("a mana doubler (resourceMultiplier): clock is explicitly conditional on the rest of the plan", () => {
  const timing = describeCardTiming(manaDoubler);
  assert.equal(timing.source, "power-signal:resourceMultiplier");
  assert.equal(timing.clockLabel, "Scales with your plan");
  assert.match(timing.whyItMatters, /only ever as strong as/i);
});

test("a vanilla creature with no power-signal category falls back to its display role (Threat), turn-bucketed by real mana value", () => {
  const timing = describeCardTiming(vanillaBear);
  assert.equal(timing.source, "display-role:Threat");
  assert.match(timing.intent, /trying to win you the game/i);
  assert.equal(timing.clockLabel, "Immediate"); // cmc 2
});

test("a plain land falls back to Mana source, never confused for a spell's timing", () => {
  const timing = describeCardTiming(plains);
  assert.equal(timing.source, "display-role:Mana source");
  assert.match(timing.intent, /develops your mana base/i);
});

test("expensive removal that misses the efficientInteraction cost bar still gets a Reactive clock via its display role, not a fabricated Late-game turn number", () => {
  // At mana value 5, evaluateCommanderPowerSignal's efficientInteraction
  // detector explicitly excludes this card (see
  // tests/commander-power-signal.test.mjs) — proving the fallback path
  // still recognizes it as reactive removal rather than turn-bucketing it
  // by its high cost, which would misrepresent when it actually matters.
  const timing = describeCardTiming(expensiveRemoval);
  assert.equal(timing.source, "display-role:Interaction");
  assert.equal(timing.clockLabel, "Reactive");
});

test("is a pure, deterministic function of the card alone", () => {
  const first = describeCardTiming(solRing);
  const second = describeCardTiming(solRing);
  assert.deepEqual(first, second);
});
