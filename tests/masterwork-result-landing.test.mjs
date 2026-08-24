import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
// openPrivateArchive/landOnCompletedDecklist and the masterworks-scroll
// effect moved to forge-session-context.tsx during the page.tsx
// decomposition (Phase 4 Stage 2).
const readCtx = () => read("app/forge-session-context.tsx");

test("the completed Forge resets to the beginning of the decision screen", async () => {
  const source = await readCtx();
  assert.match(source, /if \(chamber !== "masterworks" \|\| !pendingCandidateChoice\) return/);
  assert.match(source, /window\.scrollTo\(0, 0\)/);
  assert.match(source, /requestAnimationFrame\(\(\) => window\.scrollTo\(0, 0\)\)/);
  assert.match(await read("app/components/forge/masterworks-chamber.tsx"), /id="masterwork-choice-start"/);
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
  // #deck-gallery's own JSX moved to the workbench chamber's own component
  // during the page.tsx decomposition (Phase 4 Stage 4).
  const workbenchChamber = await read("app/components/forge/workbench-chamber.tsx");
  assert.match(workbenchChamber, /id="deck-gallery"/);
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
  // The entrance chamber's JSX moved to its own component during the
  // page.tsx decomposition (Phase 4 Stage 3) — it's a clean, isolated file
  // now, so the "home chunk" it must not reach into is the entire file.
  const entranceChamber = await read("app/components/forge/entrance-chamber.tsx");
  assert.match(entranceChamber, /className="forge-entrance"/);
  assert.doesNotMatch(entranceChamber, /masterwork-history/);
  assert.doesNotMatch(entranceChamber, /Return to a deck/);
  assert.match(await readCtx(), /function openPrivateArchive\(/);
  assert.match(await readCtx(), /setChamber\("archive"\)/);
  // The archive chamber's JSX moved to its own component during the
  // page.tsx decomposition (Phase 4 Stage 3).
  const archiveChamber = await read("app/components/forge/archive-chamber.tsx");
  assert.match(page, /\{chamber === "archive" && <ArchiveChamber \/>\}/);
  assert.match(archiveChamber, /className="masterwork-archive"/);
  assert.match(archiveChamber, /className="masterwork-history"/);
  // Decks lives once, on the left rail — the top nav no longer duplicates it.
  assert.match(page, /onClick=\{openPrivateArchive\}><i className="forge-rail-cardback" aria-hidden="true">MF<\/i><span>Decks<\/span><\/button>/);
  assert.doesNotMatch(page, /<nav className="forge-global-nav"[\s\S]*?onClick=\{openPrivateArchive\}>Decks<\/button>[\s\S]*?<\/nav>/);
  assert.doesNotMatch(page, /disabled=\{!hasValidatedDeck\} onClick=\{\(\) => \{ setChamber\("workbench"\);[\s\S]*?\}>Decks<\/button>/);
  assert.match(frame, /\.great-forge\.chamber-entrance\{height:100svh!important;overflow:hidden!important\}/);
  assert.match(frame, /\.great-forge\.chamber-archive\{height:100svh!important;overflow:hidden!important\}/);
  assert.match(frame, /\.chamber-archive>\.masterwork-archive\{[\s\S]*?overflow:auto!important/);
});

// Site cleanup Phase 2: the header's "Analyze" button and the rail's
// "Analysis" button had byte-identical onClick handlers (setChamber
// "workbench", setActiveForgeChapter 2, setSiteRail "analysis") — the
// same class of duplication the "Decks lives once" test above already
// guards against for the archive chamber, just missed for Analysis.
test("Analysis lives once, on the left rail — the top nav no longer duplicates it", async () => {
  const page = await read("app/page.tsx");
  assert.doesNotMatch(page, /<nav className="forge-global-nav"[\s\S]*?>Analyze<\/button>[\s\S]*?<\/nav>/);
  assert.match(page, /<span>Analysis<\/span>/);
  assert.equal([...page.matchAll(/setActiveForgeChapter\(2\); setSiteRail\("analysis"\); \}\}/g)].length, 1);
});

test("a completed Forge lands on the plain decklist, coaching and experiments reached by explicit choice", async () => {
  const page = await read("app/page.tsx");
  const frame = await read("app/site-frame.css");
  const ceremony = await read("app/components/forge/forge-ceremony.tsx");
  const forgeSessionContext = await readCtx();
  // The coach-brief/experiment-lab/next-step JSX moved to the workbench
  // chamber's own component during the page.tsx decomposition (Phase 4
  // Stage 4).
  const workbenchChamber = await read("app/components/forge/workbench-chamber.tsx");
  assert.match(forgeSessionContext, /function landOnCompletedDecklist\(/);
  const landStart = forgeSessionContext.indexOf("function landOnCompletedDecklist(");
  const landEnd = forgeSessionContext.indexOf("\n  }\n", landStart);
  const landBody = forgeSessionContext.slice(landStart, landEnd);
  assert.match(landBody, /setSiteRail\("decklist"\)/);
  assert.match(landBody, /coachBriefDetailsRef\.current\.open = false/);
  assert.match(forgeSessionContext, /enterMasterwork[\s\S]*?landOnCompletedDecklist\(\)/);
  assert.match(forgeSessionContext, /openSavedMasterwork[\s\S]*?landOnCompletedDecklist\(\)/);
  assert.match(workbenchChamber, /hasValidatedDeck && siteRail !== "decklist"/);
  // The Decklist nav tab remains the one-click escape hatch to the bare
  // card grid — it must still set siteRail back to "decklist" and
  // explicitly collapse the coach brief on click, unchanged by the above.
  assert.match(page, /setSiteRail\("decklist"\); if \(coachBriefDetailsRef\.current\) coachBriefDetailsRef\.current\.open = false;/);
  // Coaching and rival experiments are reached from the decklist header by
  // explicit choice, not shown by default on landing.
  assert.match(workbenchChamber, /className="conduct-experiment-cta"/);
  assert.match(workbenchChamber, /Want to conduct an experiment\?/);
  assert.match(workbenchChamber, /setExperimentLabOpen\(true\)/);
  assert.match(workbenchChamber, /experimentLabOpen && createPortal\(/);
  assert.match(workbenchChamber, /className="experiment-lab-backdrop"/);
  assert.match(workbenchChamber, /className="refinement-starters-vault experiment-lab-dialog" role="dialog" aria-modal="true"/);
  assert.doesNotMatch(workbenchChamber, /setSiteRail\("overview"\);\s*window\.requestAnimationFrame\(\(\) => document\.querySelector\("\.refinement-starters-vault"\)/);
  assert.match(workbenchChamber, /className="next-step-cta"/);
  assert.match(workbenchChamber, /This deck is done! →/);
  const galleryAt = workbenchChamber.indexOf('id="deck-gallery"');
  const mentorAt = workbenchChamber.indexOf("<RevisionOpinionPanel");
  assert.ok(galleryAt > 0 && mentorAt > galleryAt, "Mentor must mount after #deck-gallery, never above the Decklist");
  assert.doesNotMatch(workbenchChamber, /forge-descent-atmosphere/);
  assert.match(page, /chamber === "forging" && <ForgingChamber \/>/);
  assert.doesNotMatch(workbenchChamber, /forge-heat-haze/);
  assert.doesNotMatch(workbenchChamber, /setMilestoneMotion\(\{[\s\S]*?kind: "masterwork-ready"/);
  assert.match(frame, /\.forge-heat-haze,/);
  assert.match(frame, /\.milestone-masterwork-ready,/);
  assert.doesNotMatch(workbenchChamber, /YOUR FREE PREVIEW IS SPENT/);
  assert.doesNotMatch(workbenchChamber, /Create an account to keep forging/);
  assert.match(frame, /:has\(\.chapter-1-active\) \.workbench-coach-stack\{display:none!important\}/);
  assert.doesNotMatch(ceremony, /processing-heat-ring/);
  assert.doesNotMatch(ceremony, /processing-index-ring/);
  assert.doesNotMatch(ceremony, /processing-crucible/);
});

test("the ceremony phase rail spans the full forge, not the copy column", async () => {
  const journey = await read("app/forge-journey.css");
  const ceremony = await read("app/components/forge/forge-ceremony.tsx");
  // The forging chamber's JSX moved to its own component during the
  // page.tsx decomposition (Phase 4 Stage 3).
  const forgingChamber = await read("app/components/forge/forging-chamber.tsx");
  assert.match(forgingChamber, /<\/div>\s*<ol className="ceremony-phase-rail"/);
  assert.match(journey, /\.forging-ceremony>\.ceremony-phase-rail\{grid-column:1\/-1/);
  assert.match(journey, /grid-template-rows:minmax\(0,1fr\) auto/);
  assert.match(ceremony, /\["Field"\]/);
  assert.match(ceremony, /\["Seal"\]/);
});
