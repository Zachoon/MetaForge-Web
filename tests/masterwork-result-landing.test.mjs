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

test("Explore/home is a no-scroll hero; saved Masterworks live on Decks", async () => {
  const page = await read("app/page.tsx");
  const frame = await read("app/site-frame.css");
  const entranceStart = page.indexOf('{chamber === "entrance" && (');
  const archiveStart = page.indexOf('{chamber === "archive" && (');
  assert.ok(entranceStart > 0 && archiveStart > entranceStart);
  const homeChunk = page.slice(entranceStart, archiveStart);
  assert.match(homeChunk, /className="forge-entrance"/);
  assert.doesNotMatch(homeChunk, /masterwork-history/);
  assert.doesNotMatch(homeChunk, /Return to a Masterwork/);
  assert.match(page, /function openPrivateArchive\(/);
  assert.match(page, /setChamber\("archive"\)/);
  assert.match(page, /\{chamber === "archive" && \(/);
  assert.match(page, /className="masterwork-archive"/);
  assert.match(page, /className="masterwork-history"/);
  // Decks lives once, on the left rail — the top nav no longer duplicates it.
  assert.match(page, /onClick=\{openPrivateArchive\}><i className="forge-rail-cardback" aria-hidden="true">MF<\/i><span>Decks<\/span><\/button>/);
  assert.doesNotMatch(page, /<nav className="forge-global-nav"[\s\S]*?onClick=\{openPrivateArchive\}>Decks<\/button>[\s\S]*?<\/nav>/);
  assert.doesNotMatch(page, /disabled=\{!hasValidatedDeck\} onClick=\{\(\) => \{ setChamber\("workbench"\);[\s\S]*?\}>Decks<\/button>/);
  assert.match(frame, /\.great-forge\.chamber-entrance\{height:100svh!important;overflow:hidden!important\}/);
  assert.match(frame, /\.great-forge\.chamber-archive\{height:100svh!important;overflow:hidden!important\}/);
  assert.match(frame, /\.chamber-archive>\.masterwork-archive\{[\s\S]*?overflow:auto!important/);
});

test("a completed Forge lands on Overview with the coach brief open", async () => {
  const page = await read("app/page.tsx");
  const frame = await read("app/site-frame.css");
  const ceremony = await read("app/components/forge/forge-ceremony.tsx");
  assert.match(page, /function landOnCompletedDecklist\(/);
  const landStart = page.indexOf("function landOnCompletedDecklist(");
  const landEnd = page.indexOf("\n  }\n", landStart);
  const landBody = page.slice(landStart, landEnd);
  assert.match(landBody, /setSiteRail\("overview"\)/);
  assert.match(landBody, /coachBriefDetailsRef\.current\.open = true/);
  assert.match(page, /enterMasterwork[\s\S]*?landOnCompletedDecklist\(\)/);
  assert.match(page, /openSavedMasterwork[\s\S]*?landOnCompletedDecklist\(\)/);
  assert.match(page, /hasValidatedDeck && siteRail !== "decklist"/);
  // The Decklist nav tab remains the one-click escape hatch to the bare
  // card grid — it must still set siteRail back to "decklist" and
  // explicitly collapse the coach brief on click, unchanged by the above.
  assert.match(page, /setSiteRail\("decklist"\); if \(coachBriefDetailsRef\.current\) coachBriefDetailsRef\.current\.open = false;/);
  const galleryAt = page.indexOf('id="deck-gallery"');
  const mentorAt = page.indexOf("<RevisionOpinionPanel");
  assert.ok(galleryAt > 0 && mentorAt > galleryAt, "Mentor must mount after #deck-gallery, never above the Decklist");
  assert.doesNotMatch(page, /forge-descent-atmosphere/);
  assert.match(page, /chamber === "forging" && \(/);
  assert.doesNotMatch(page, /forge-heat-haze/);
  assert.doesNotMatch(page, /setMilestoneMotion\(\{[\s\S]*?kind: "masterwork-ready"/);
  assert.match(frame, /\.forge-heat-haze,/);
  assert.match(frame, /\.milestone-masterwork-ready,/);
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
