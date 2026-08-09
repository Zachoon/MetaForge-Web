import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const css = await readFile(new URL("../app/forge-polish.css", import.meta.url), "utf8");

test("shows a deck visibly assembling instead of a generic reactor animation", () => {
  assert.match(page, /className={`forge-deck-assembly/);
  assert.match(page, /className="assembly-cards"/);
  assert.match(page, /className="assembly-deck"/);
  assert.doesNotMatch(page, /forge-cinematic-core|cinematic-ingot-float/);
  const processingBlock = page.match(/const ForgeCeremonyMotion[\s\S]*?const ForgeCommissionCard/)?.[0];
  assert.ok(processingBlock);
  assert.doesNotMatch(processingBlock, /entrance-aperture\.mp4|entrance-embers\.mp4|<video/);
  assert.doesNotMatch(page, /CEREMONY_MOTION_ASSETS/);
});

test("does not present invented candidate countdown numbers", () => {
  assert.doesNotMatch(page, /CANDIDATE DESIGNS/);
  assert.doesNotMatch(page, /candidate-count/);
  assert.match(page, /STEP \{stage \+ 1\} OF/);
  assert.match(page, /Creating several playable 100-card decks to compare/);
});

test("provides quiet and reduced-motion versions of the ceremony", () => {
  assert.match(css, /\.forge-deck-assembly\.is-quiet \*\{animation:none!important\}/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
});
