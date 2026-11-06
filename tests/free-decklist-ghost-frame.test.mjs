import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../app/free-decklist.css", import.meta.url), "utf8");
const ui = readFileSync(new URL("../app/components/forge/free-decklist.tsx", import.meta.url), "utf8");
const props = readFileSync(new URL("../app/components/tripo-assets.tsx", import.meta.url), "utf8");

test("visual ghosts wear a wax frame and smoked glass instead of a fade", () => {
  assert.match(ui, /className="ghost-wax-frame"/);
  assert.match(ui, /className="ghost-glass"/);
  assert.match(css, /\.ghost-wax-frame\s*\{/);
  assert.match(css, /\.ghost-glass\s*\{/);
  assert.match(css, /rgba\(16,\s*15,\s*13,\s*0\.95\)/);
  assert.doesNotMatch(css, /opacity:\s*0\.72/);
  assert.doesNotMatch(css, /\.visual-deck-card\.ghost-pick \.visual-deck-card-art img\s*\{[^}]*opacity:\s*0\.78/);
});

test("text ghosts stay readable on an opaque panel with a wax seal", () => {
  assert.match(ui, /className="ghost-row-mark"/);
  assert.match(ui, /className="ghost-unfinished"/);
  assert.match(css, /\.type-column-row\.ghost-pick[\s\S]*rgba\(16,\s*15,\s*13,\s*0\.95\)/);
  assert.doesNotMatch(css, /\.type-column-row\.ghost-pick[^{]*\{[^}]*border-left/);
});

test("pause and step use the existing anvil still", () => {
  assert.match(props, /anvil:\s*\{\s*file:\s*"hero-512\.webp"/);
  const controls = ui.slice(ui.indexOf('aria-label="Ghost picks"'), ui.indexOf("Reading printed cards"));
  const pause = controls.indexOf(">Pause<") === -1
    ? controls.slice(controls.indexOf("Paused"), controls.indexOf("Show all"))
    : controls;
  assert.match(pause, /kind="anvil"/);
  assert.match(pause, /Step/);
  const anvilUses = controls.match(/kind="anvil"/g) || [];
  assert.equal(anvilUses.length, 2);
});

test("reduced motion and the in-app quiet setting keep ghosts static", () => {
  assert.match(ui, /staticMotion/);
  assert.match(ui, /data-motion=\{staticMotion \? "static" : "full"\}/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /\.free-decklist\[data-motion="static"\] \.ghost-pick\s*\{\s*animation:\s*none/);
  assert.match(css, /\.free-decklist \.ghost-pick\s*\{\s*animation:\s*none/);
});

test("section counts still ignore proposed ghosts", () => {
  assert.match(ui, /Proposed cards stay out of that count/);
  const counts = ui.match(/group === "Commander" \? 1 : entries\.filter[\s\S]*?reduce\([\s\S]*?\)/g) || [];
  assert.equal(counts.length, 2);
  for (const count of counts) assert.doesNotMatch(count, /shownGhosts|ghost/);
});
