import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("the completed Forge resets to the beginning of the decision screen", async () => {
  const page = await read("app/page.tsx");
  assert.match(page, /if \(chamber !== "masterworks" \|\| !pendingCandidateChoice\) return/);
  assert.match(page, /window\.scrollTo\(0, 0\)/);
  assert.match(page, /requestAnimationFrame\(\(\) => window\.scrollTo\(0, 0\)\)/);
  assert.match(page, /id="masterwork-choice-start"/);
});

test("the recommended experience is explicitly first in the philosophy list", async () => {
  const compare = await read("app/components/forge/philosophy-compare.tsx");
  // All directions render in one shared grid (no full-width takeover that
  // pushes the alternatives below the fold) — recommended-first ordering
  // is guaranteed by construction, not by a separate leading section.
  assert.match(compare, /\[comparison\.recommended,\s*\.\.\.comparison\.alternatives\]\.filter\(Boolean\)/);
  assert.match(compare, /BEST FIT FOR YOU/);
});

test("the mockup navigation frame is site-level rather than deck-only", async () => {
  const page = await read("app/page.tsx");
  const css = await read("app/testing-anvil.css");
  const frame = await read("app/site-frame.css");
  assert.match(page, /className="forge-global-nav"/);
  assert.match(page, /className="forge-global-rail"/);
  assert.match(page, />Premium<\/button>/);
  assert.equal([...page.matchAll(/>Explore<\/button>/g)].length, 1);
  assert.equal([...page.matchAll(/<span>Decklist<\/span>/g)].length, 1);
  assert.doesNotMatch(page, /className="masterwork-shell-top"/);
  assert.doesNotMatch(page, /className="masterwork-shell-rail"/);
  assert.doesNotMatch(page, /masterwork-wordmark/);
  assert.doesNotMatch(page, /aria-label="Masterwork workspace"/);
  assert.doesNotMatch(page, /aria-label="Deck tools"/);
  assert.doesNotMatch(page, /setChamber\(deck\.trim\(\) \? "refine" : "commission"\)>Explore/);
  assert.match(page, /id="deck-gallery"/);
  assert.match(css, /\.forge-global-rail\{position:fixed/);
  assert.match(css, /\.forge-bar\{position:sticky/);
  assert.match(css, /\.deck-manuscript\{display:flex;flex-direction:column\}/);
  assert.doesNotMatch(css, /\.deck-manuscript\{display:contents\}/);
  assert.doesNotMatch(css, /:has\(\.masterwork-shell-top\)/);
  assert.match(frame, /masterwork-shell-top,\s*\r?\n\.masterwork-shell-rail\{display:none!important\}/);
});

test("Explore/home scrolls so the private archive is reachable", async () => {
  const frame = await read("app/site-frame.css");
  assert.doesNotMatch(
    frame,
    /\.great-forge\.chamber-entrance\{height:100svh!important;overflow:hidden!important\}/,
    "entrance must not lock to the viewport",
  );
  assert.match(frame, /\.great-forge\.chamber-entrance\{height:auto!important;min-height:100svh!important;overflow:visible!important\}/);
  assert.match(frame, /\.chamber-entrance>\.forge-entrance\{[\s\S]*?overflow:visible!important/);
  assert.match(frame, /\.chamber-entrance \.masterwork-history\{margin-top:8px!important/);
});

test("a completed Forge lands on Decklist with the card gallery first in the pane", async () => {
  const page = await read("app/page.tsx");
  const frame = await read("app/site-frame.css");
  const ceremony = await read("app/components/forge/forge-ceremony.tsx");
  assert.match(page, /function landOnCompletedDecklist\(/);
  assert.match(page, /setSiteRail\("decklist"\)/);
  assert.match(page, /enterMasterwork[\s\S]*?landOnCompletedDecklist\(\)/);
  assert.match(page, /openSavedMasterwork[\s\S]*?landOnCompletedDecklist\(\)/);
  assert.match(page, /hasValidatedDeck && siteRail !== "decklist"/);
  const galleryAt = page.indexOf('id="deck-gallery"');
  const mentorAt = page.indexOf("<RevisionOpinionPanel");
  assert.ok(galleryAt > 0 && mentorAt > galleryAt, "Mentor must mount after #deck-gallery, never above the Decklist");
  assert.doesNotMatch(page, /forge-descent-atmosphere/);
  assert.match(page, /chamber === "forging" && \(/);
  assert.doesNotMatch(page, /YOUR FREE PREVIEW IS SPENT/);
  assert.doesNotMatch(page, /Create an account to keep forging/);
  assert.match(frame, /:has\(\.chapter-1-active\) \.workbench-coach-stack\{display:none!important\}/);
  assert.doesNotMatch(ceremony, /processing-heat-ring/);
  assert.doesNotMatch(ceremony, /processing-index-ring/);
  assert.doesNotMatch(ceremony, /processing-crucible/);
});

test("the ceremony phase rail spans the full forge, not the copy column", async () => {
  const page = await read("app/page.tsx");
  const journey = await read("app/forge-journey.css");
  const ceremony = await read("app/components/forge/forge-ceremony.tsx");
  assert.match(page, /<\/div>\s*<ol className="ceremony-phase-rail"/);
  assert.match(journey, /\.forging-ceremony>\.ceremony-phase-rail\{grid-column:1\/-1/);
  assert.match(journey, /grid-template-rows:minmax\(0,1fr\) auto/);
  assert.match(ceremony, /\["Field"\]/);
  assert.match(ceremony, /\["Seal"\]/);
});
