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
  assert.match(page, /walkthroughActive \? " tour-hidden" : ""/);
});

test("the tour follows reordered targets and avoids covering them", () => {
  assert.match(walkthrough, /if \(el && !positionedTarget\)/);
  assert.match(walkthrough, /tooltipRef\.current\?\.getBoundingClientRect\(\)/);
  assert.match(walkthrough, /window\.innerWidth - rect\.right >= tooltipSize\.width/);
  assert.match(walkthrough, /rect\.left >= tooltipSize\.width/);
  assert.match(walkthrough, /Deck to review it, Tune to try a useful change, and Test for one clear next-game question/);
  assert.doesNotMatch(walkthrough, /four-chapter Testing Anvil|Chapter 4/);
});

test("mobile Blueprint keeps inline definitions and removes overlapping question controls", () => {
  assert.match(journeyStyles, /@media\(max-width:700px\)[^{]*\{[\s\S]*?\.blueprint-glossary-tip\{display:none\}/);
  assert.doesNotMatch(journeyStyles, /@media\(max-width:700px\)[\s\S]*?\.blueprint-choice-definition\{display:none\}/);
});
