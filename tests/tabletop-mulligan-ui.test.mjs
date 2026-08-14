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
  assert.match(source, /decisions aligned/);
  assert.match(source, /counts\.lands/);
  assert.match(source, /counts\.otherMana/);
  assert.match(coach, /This is a close decision/);
  assert.match(coach, /not a prediction that the game will be won/);
  assert.match(coach, /writesToBrain: false/);
});

test("mobile decisions remain full-size tap targets", async () => {
  const css = await read("app/tabletop.css");
  assert.match(css, /\.mulligan-trainer button\{[^}]*min-height:48px/);
  assert.match(css, /grid-template-columns:repeat\(7,minmax\(112px,1fr\)\)/);
  assert.match(css, /flex-basis:148px/);
});
