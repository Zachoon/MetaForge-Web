import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const [globals, atmosphere] = await Promise.all([
  readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  readFile(new URL("../app/living-atmosphere.css", import.meta.url), "utf8"),
]);

test("living atmosphere loads last and establishes warm readable roles", () => {
  assert.match(globals, /@import "\.\/living-atmosphere\.css";/);
  assert.ok(
    globals.lastIndexOf("living-atmosphere.css") > globals.lastIndexOf("player-compass.css"),
    "the palette contract must load after component styles",
  );
  assert.match(atmosphere, /--mf-void:\s*#0d0d0e/);
  assert.match(atmosphere, /--mf-ivory:\s*#f5f1e8/);
  assert.match(atmosphere, /--mf-mist:\s*#bbb6ad/);
  assert.match(atmosphere, /--mf-ember:\s*#ef8e42/);
});

test("environment carries atmosphere while teal and copper have semantic jobs", () => {
  assert.match(atmosphere, /url\('\/forge-corridor\.webp'\)/);
  assert.match(atmosphere, /url\('\/forge-hero\.webp'\)/);
  assert.match(atmosphere, /Teal is proof\/selection/);
  assert.match(atmosphere, /Copper belongs to costs and tradeoffs/);
  assert.match(atmosphere, /\.philosophy-card\.is-best-fit/);
  assert.match(atmosphere, /\.philosophy-tradeoff/);
});

test("philosophy and tabletop surfaces receive the living visual hierarchy", () => {
  assert.match(atmosphere, /\.masterwork-reveal:has\(\.philosophy-compare\)/);
  assert.match(atmosphere, /\.tabletop-surface/);
  assert.match(atmosphere, /\.tabletop-zone/);
  assert.match(atmosphere, /@media \(max-width: 760px\)/);
  assert.match(atmosphere, /@media \(prefers-reduced-motion: reduce\)/);
});
