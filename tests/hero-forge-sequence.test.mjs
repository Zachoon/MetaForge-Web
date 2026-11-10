import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

const anvil = await read("../app/components/hero-anvil.tsx");
const tripo = await read("../app/tripo-assets.css");

test("the sequence is one anvil: sword still, then hammer, one flash, then the deck", () => {
  assert.match(anvil, /SWORD_SRC = "\/assets\/forge\/tripo\/hero-512\.webp"/);
  assert.match(anvil, /DECK_SRC = "\/assets\/forge\/tripo\/hero-deck-512\.webp"/);
  assert.match(anvil, /HAMMER_SRC = "\/assets\/forge\/tripo\/prop_hammer-512\.webp"/);
  assert.match(anvil, /hero-anvil-flash/);
  assert.match(anvil, /hero-anvil-sparks/);
  assert.doesNotMatch(anvil, /hero-turntable|entrance-living-forge|forge-sigil/);
  const sparks = [...anvil.matchAll(/\[(-?\d+),\s*(-?\d+)\]/g)];
  assert.ok(sparks.length >= 8 && sparks.length <= 16, `expected one spark burst, got ${sparks.length}`);
});

test("full motion plays once and can be replayed from the deck", () => {
  assert.match(anvil, /motionMode === "full" && !query\.matches/);
  assert.match(anvil, /setPhase\("playing"\)/);
  assert.match(anvil, /phaseRef\.current !== "deck"/);
  assert.match(anvil, /onClick=\{replay\}/);
  assert.match(anvil, /onMouseEnter=\{replay\}/);
  assert.match(anvil, /animationName !== "hero-forge-deck"/);
  assert.match(tripo, /--forge-time: 2\.6s/);
  for (const name of ["hero-forge-sword", "hero-forge-hammer", "hero-forge-flash", "hero-forge-spark", "hero-forge-deck"]) {
    assert.match(tripo, new RegExp(`${name} var\\(--forge-time\\) linear forwards`));
  }
  assert.doesNotMatch(tripo, /infinite|alternate/);
  const flash = tripo.slice(tripo.indexOf("@keyframes hero-forge-flash"), tripo.indexOf("@keyframes hero-forge-spark"));
  assert.equal((flash.match(/opacity: 1/g) || []).length, 1);
});

test("reduced motion and quiet mode settle on the deck with no strike or flash", () => {
  assert.match(anvil, /prefers-reduced-motion: reduce/);
  assert.match(anvil, /if \(!allow\)/);
  assert.match(anvil, /setPhase\("deck"\)/);
  assert.match(tripo, /@media \(prefers-reduced-motion: reduce\) \{\s*\.hero-anvil-forge,\s*\.hero-anvil-replay \{ display: none !important; \}/);
  assert.match(tripo, /\.great-forge\[data-motion="quiet"\] \.hero-anvil-forge/);
  assert.match(tripo, /\.hero-anvil\[data-deck="ready"\] \.hero-anvil-deck \{ opacity: 1 !important; filter: none; \}/);
  assert.match(tripo, /\.hero-anvil \{\s*position: relative;\s*width: 96px;\s*height: 96px;/);
  assert.match(tripo, /width: min\(100%, 400px\)/);
  assert.match(tripo, /aspect-ratio: 1/);
});
