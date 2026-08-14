import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("a completed deck receives a customizable Masterwork identity", async () => {
  const page = await read("app/page.tsx");
  assert.match(page, /YOUR MASTERWORK/);
  assert.match(page, /Personalize Masterwork/);
  assert.match(page, /Masterwork Identity/);
  assert.match(page, /Featured art/);
  assert.match(page, /Stained Glass/);
  assert.match(page, /Etched Metal/);
  assert.match(page, /Clean Art/);
  assert.match(page, /Focus position/);
  assert.match(page, /Glow intensity/);
});

test("identity is deck-scoped local presentation state and never construction input", async () => {
  const page = await read("app/page.tsx");
  assert.match(page, /metaforge\.masterworkIdentity\.\$\{deckId \|\| activeCommanderName \|\| chosenWork\.name\}/);
  assert.match(page, /localStorage\.setItem\(masterworkIdentityKey/);
  assert.doesNotMatch(page, /buildPreChoiceCoaching\([\s\S]{0,180}masterworkIdentity/);
});

test("the deck hero keeps art atmospheric and content readable", async () => {
  const css = await read("app/testing-anvil.css");
  assert.match(css, /\.masterwork-deck-hero:before/);
  assert.match(css, /\.masterwork-glass/);
  assert.match(css, /\.masterwork-deck-hero:after/);
  assert.match(css, /\.masterwork-identity-panel/);
  assert.match(css, /@media\(max-width:560px\).*masterwork-deck-hero/s);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
});
