import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [page, ceremony, css] = await Promise.all([
  readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/components/forge/forge-ceremony.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/forge-polish.css", import.meta.url), "utf8"),
]);

test("shows a deck visibly assembling instead of a generic reactor animation", () => {
  // Ceremony lives in app/components/forge/forge-ceremony.tsx; page only mounts it.
  assert.match(page, /from "\.\/components\/forge\/forge-ceremony"/);
  assert.match(page, /<ForgeCeremonyMotion stage=\{stage\} motionMode=\{motionMode\}/);
  assert.match(ceremony, /className=\{`forge-process-focus/);
  assert.match(ceremony, /className="forge-card-pipeline"/);
  assert.match(ceremony, /className="forge-process-materials"/);
  assert.doesNotMatch(page, /forge-cinematic-core|cinematic-ingot-float/);
  assert.doesNotMatch(ceremony, /entrance-aperture\.mp4|entrance-embers\.mp4|<video/);
  assert.doesNotMatch(page, /CEREMONY_MOTION_ASSETS/);
  assert.doesNotMatch(ceremony, /CEREMONY_MOTION_ASSETS/);
});

test("does not present invented candidate countdown numbers", () => {
  assert.doesNotMatch(page, /CANDIDATE DESIGNS/);
  assert.doesNotMatch(page, /candidate-count/);
  assert.match(page, /STEP \{stage \+ 1\} OF/);
  assert.match(ceremony, /Creating several playable 100-card decks to compare/);
});

test("provides quiet and reduced-motion versions of the ceremony", () => {
  assert.match(ceremony, /forge-process-focus\$\{motionMode === "quiet" \? " is-quiet"/);
  assert.match(css, /prefers-reduced-motion:reduce/);
});
