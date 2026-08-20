import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("the Hand lens requires a keep-or-mulligan answer before revealing coaching", async () => {
  const source = await read("app/tabletop.tsx");
  assert.match(source, /Yes, keep it/);
  assert.match(source, /No, take a mulligan/);
  assert.match(source, /Make your call before MetaForge reveals its read/);
  assert.match(source, /handDecision \? \(/);
  assert.match(source, /Try another hand/);
});

test("the command zone is never dealt into an opening seven", async () => {
  const source = await read("app/tabletop.tsx");
  assert.match(source, /cards\.filter\(\(card\) => card\.role !== "Commander"\)/);
});

test("the player sees teaching, uncertainty, and a non-predictive boundary", async () => {
  const source = await read("app/tabletop.tsx");
  const coach = await read("app/mulligan-coach.mjs");
  assert.match(source, /METAFORGE CONFIDENCE/);
  assert.match(source, /keep calls aligned/);
  assert.match(source, /counts\.lands/);
  assert.match(source, /counts\.otherMana/);
  assert.match(coach, /This is a close decision/);
  assert.match(coach, /not a prediction that the game will be won/);
  assert.match(coach, /writesToBrain: false/);
});

test("goldfishing adds a card-specific sequencing decision after the mulligan call", async () => {
  const source = await read("app/tabletop.tsx");
  const coach = await read("app/mulligan-coach.mjs");
  assert.match(source, /SEQUENCING CHALLENGE/);
  assert.match(source, /handEvaluation\.sequence\.options/);
  assert.match(source, /chooseSequence/);
  assert.match(coach, /recommendedCard/);
  assert.match(coach, /Deploy \$\{bridge\.name\}/);
  assert.doesNotMatch(coach, /make (?:this|the) deck better/i);
});

test("entering Playtest goes straight to goldfishing an opening hand, not a visual deck-review stop first", async () => {
  // The "deck" lens (a visual card-grid review, distinct from the ledger
  // view's own Visual deck/Text list toggle) used to be the forced first
  // stop on every Playtest entry. Per direct user feedback, it's now
  // reached only by choice, via Tabletop's own lens tabs or the "← Review
  // deck" link from the hand lens — never the default landing.
  const page = await read("app/page.tsx");
  assert.match(page, /key="goldfish-tabletop"[\s\S]*?initialLens="hand"/);
  const tabletop = await read("app/tabletop.tsx");
  assert.match(tabletop, /Review deck/);
});

test("mobile decisions remain full-size tap targets", async () => {
  const css = await read("app/tabletop.css");
  assert.match(css, /\.mulligan-trainer button\{[^}]*min-height:48px/);
  assert.match(css, /grid-template-columns:repeat\(7,minmax\(112px,1fr\)\)/);
  assert.match(css, /flex-basis:148px/);
});
