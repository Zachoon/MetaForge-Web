import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [page, css] = await Promise.all([
  readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/forge-polish.css", import.meta.url), "utf8"),
]);

test("shows a deck visibly assembling instead of a generic reactor animation", () => {
  // Current ceremony: forge-process-focus pipeline (retired forge-deck-assembly
  // class name, same job — visible structural pass, not a reactor swirl).
  assert.match(page, /className=\{`forge-process-focus/);
  assert.match(page, /className="forge-card-pipeline"/);
  assert.match(page, /className="forge-process-materials"/);
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
  assert.match(page, /forge-process-focus\$\{motionMode === "quiet" \? " is-quiet"/);
  assert.match(css, /prefers-reduced-motion:reduce/);
});
