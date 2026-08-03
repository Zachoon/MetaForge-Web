import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const walkthrough = fs.readFileSync(new URL("../app/forge-walkthrough.tsx", import.meta.url), "utf8");
const walkthroughStyles = fs.readFileSync(new URL("../app/forge-walkthrough.css", import.meta.url), "utf8");
const journeyStyles = fs.readFileSync(new URL("../app/forge-journey.css", import.meta.url), "utf8");
const page = fs.readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");

test("mobile tour uses a stable bottom sheet and a bounded form target", () => {
  assert.match(walkthrough, /mobileTargetSelector: "\.mark-grid > label:first-child"/);
  assert.match(walkthrough, /mobileTargetSelector: "\.commission-note textarea"/);
  assert.match(walkthrough, /scrollIntoView\(\{ behavior: "auto", block: "center", inline: "nearest" \}\)/);
  assert.match(walkthrough, /if \(!rect \|\| mobileLayout\) return undefined/);
  assert.match(walkthroughStyles, /@media \(max-width: 700px\)[\s\S]*?\.forge-walkthrough-tooltip,[\s\S]*?bottom: max\(10px, env\(safe-area-inset-bottom\)\)/);
  assert.match(walkthroughStyles, /\.forge-walkthrough-spotlight \{ transition: none; \}/);
  assert.match(page, /guestMode && !forgedDeck && !walkthroughActive/);
});

test("mobile Blueprint keeps inline definitions and removes overlapping question controls", () => {
  assert.match(journeyStyles, /@media\(max-width:700px\)[^{]*\{[\s\S]*?\.blueprint-glossary-tip\{display:none\}/);
  assert.doesNotMatch(journeyStyles, /@media\(max-width:700px\)[\s\S]*?\.blueprint-choice-definition\{display:none\}/);
});
