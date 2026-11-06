import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("mana symbols and the card back are vendored and used in the UI", () => {
  for (const file of ["W", "U", "B", "R", "G", "C", "T", "WU", "2W"]) {
    assert.equal(existsSync(new URL(`../public/assets/mtg/symbols/${file}.svg`, import.meta.url)), true, file);
  }
  assert.equal(existsSync(new URL("../public/assets/mtg/card-back.webp", import.meta.url)), true);
  assert.equal(existsSync(new URL("../public/assets/mtg/sets/cmd.svg", import.meta.url)), true);
  for (const texture of [
    "dark-rock.webp",
    "stone-block-wall.webp",
    "castle-wall-slates.webp",
    "metal-plate.webp",
    "monastery-stone-floor.webp",
    "green-metal-rust.webp",
    "rusty-metal.webp",
  ]) {
    assert.equal(existsSync(new URL(`../public/assets/workshop/${texture}`, import.meta.url)), true, texture);
  }

  const symbols = read("app/components/mana-symbols.tsx");
  assert.match(symbols, /\/assets\/mtg\/symbols\//);
  assert.match(symbols, /svgs\.scryfall\.io/);
  assert.match(read("app/components/tripo-assets.tsx"), /<ManaSymbol /);
  assert.match(read("app/page.tsx"), /card-back\.webp/);
  assert.match(read("app/components/forge/free-decklist.tsx"), /card-back\.webp/);
  assert.match(read("app/learn/article-view.tsx"), /card-back\.webp/);
  assert.match(read("app/learn/article-view.tsx"), /<ManaText /);
  assert.match(read("app/mtg-chrome.css"), /dark-rock|stone-block-wall|castle-wall-slates|metal-plate|monastery-stone-floor/);
  assert.match(read("app/design-system.css"), /workshop\/dark-rock\.webp/);
});

test("text plates stay opaque and the nav shape is unchanged", () => {
  const chrome = read("app/mtg-chrome.css");
  const legal = read("app/legal.css");
  const globals = read("app/globals.css");
  assert.match(chrome, /rgba\(16,\s*15,\s*13,\s*0\.95\)/);
  assert.match(legal, /rgba\(16,\s*15,\s*13,\s*0\.95\)/);
  assert.match(globals, /rgba\(16,\s*15,\s*13,\s*0\.95\)/);
  assert.doesNotMatch(read("app/site-nav.ts"), /Premium/);
  assert.doesNotMatch(read("app/components/site-chrome.tsx"), /Premium/);
  assert.match(read("app/components/site-chrome.tsx"), /section === "database" \? DATABASE_LINKS : section === "explore" \? EXPLORE_LINKS/);
});

test("sources are written down, including the art that was not found", () => {
  const note = read("public/assets/ATTRIBUTION.md");
  assert.match(note, /Poly Haven/);
  assert.match(note, /CC0/);
  assert.match(note, /Scryfall/);
  assert.match(note, /svgs\.scryfall\.io/);
  assert.match(note, /card back/i);
  assert.match(note, /Kenney/);
  assert.match(note, /smoked-glass/i);
  assert.match(note, /anvil/i);
});
