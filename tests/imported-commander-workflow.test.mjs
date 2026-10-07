import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

// The imported-decklist ("refine") workflow used to render the same
// commander-discovery experience as a fresh build ("commission") — gated
// only on isCommanderFormat(format), never on chamber — so pasting a
// complete Commander decklist still prompted the player to search for or
// randomly "reveal three commanders" after they'd already supplied one.
// These assertions pin the state-machine shape of the fix directly in
// app/page.tsx's source: no component-render harness exists in this repo
// (see tests/guest-forge-boundary.test.mjs for the same convention), so UI
// behavior is verified against the literal conditionals that produce it.

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
// The commander auto-detection effect, discovery fetch, and commitDirectForge
// catch block moved to forge-session-context.tsx during the page.tsx
// decomposition (Phase 4 Stage 2).
const readCtx = () => read("app/forge-session-context.tsx");
// The commander search/discovery JSX moved to the commission/refine
// chamber's own component during the page.tsx decomposition (Phase 4
// Stage 3).
const readCommissionChamber = () => read("app/components/forge/commission-chamber.tsx");

test("refine mode auto-detects a commander from the pasted list — commission mode never does", async () => {
  const source = await readCtx();
  assert.match(
    source,
    /if \(chamber !== "refine" \|\| !isCommanderFormat\(format\) \|\| selectedCommander\) return;/,
    "auto-detection only runs in the refine chamber, only for commander formats, and only while no commander is already selected",
  );
  assert.match(source, /resolvePastedCommanderCandidate\(\{/);
  assert.match(source, /if \(resolved\) setSelectedCommander\(resolved\);/);
  assert.match(source, /format,\s*\n\s*mapCard: commanderOptionFromCard/);
});

test("commander discovery uses MetaForge's resilient endpoint and distinguishes an outage from zero matches", async () => {
  const source = await readCtx();
  assert.match(source, /\/api\/cards\/commanders\?format=/);
  assert.match(source, /The commander index is temporarily unavailable/);
  assert.match(await readCommissionChamber(), /Retry commander search/);
});

test("a detected or selected commander renders the selected-commander summary, not the discovery UI, in either chamber", async () => {
  const source = await readCommissionChamber();
  assert.match(
    source,
    /\{selectedCommander \? \(\s*<article>/,
    "selectedCommander truthy always renders the summary <article>, never the search/discovery branch",
  );
});

// Refine now covers two build paths: "complete" (a pasted list, where the
// commander is detected and random suggestions would be noise) and
// "scratch" (an empty list, where a suggestion is genuinely useful).
test("the random three-commander suggestion action is hidden for a pasted list but present for scratch and commission", async () => {
  const source = await readCommissionChamber();
  assert.match(source, /const isComplete = chamber === "refine" && buildPath === "complete";/);
  assert.match(
    source,
    /\{!isComplete && \(\s*<button\s*\n\s*type="button"\s*\n\s*disabled=\{randomizingCommander\}\s*\n\s*onClick=\{chooseRandomCommander\}/,
    "the random-suggestion button is wrapped in a !isComplete guard, so it renders for scratch/commission and is hidden for a pasted list",
  );
});

test("refine mode without a detectable commander keeps the manual search input as a fallback (not chamber-gated)", async () => {
  const source = await readCommissionChamber();
  // The commander-search <div> (containing the search <input>) has no
  // chamber condition of its own — only the random-suggestion button
  // nested inside it does — so a paste that extractPastedCommanderName
  // can't resolve still leaves the manual search box available in refine.
  // Bounded on the button's own conditional close (not on a later sibling
  // marker) so it stays stable regardless of what else renders after the
  // button inside .commander-search (e.g. the suggested-commander picker).
  const searchBlockMatch = source.match(/<div\s*\n\s*className="commander-search"[\s\S]*?disabled=\{randomizingCommander\}[\s\S]*?\)\}/);
  assert.ok(searchBlockMatch, "the commander-search block exists");
  assert.match(searchBlockMatch[0], /\{!isComplete && \(/, "the nested random-suggestion button carries the only path gate");
  assert.doesNotMatch(
    searchBlockMatch[0].split(`{!isComplete && (`)[0],
    /chamber !== "refine"|isComplete/,
    "the search input itself (before the nested random-suggestion button) carries no refine-only gate",
  );
});

test("commission mode's discovery copy is unchanged; refine mode gets its own confirmation copy", async () => {
  const source = await readCommissionChamber();
  assert.match(source, /"Choose a legend—or let the Forge discover one"/, "the fresh-build discovery copy is untouched by this fix");
  assert.match(source, /"Confirm the commander from your list"/);
  assert.match(
    source,
    /chamber === "refine"\s*\n\s*\? "Confirm the commander from your list"\s*\n\s*: "Choose a legend—or let the Forge discover one"/,
  );
});

test("the imported-generate call still targets the authenticated or guest generate endpoint unchanged", async () => {
  const source = await readCtx();
  assert.match(source, /guestMode \? "\/api\/forge\/guest-generate" : "\/api\/forge\/generate"/);
});

test("a failed forge attempt still preserves the pasted decklist and selected commander (deck/commander state is never cleared on catch)", async () => {
  const source = await readCtx();
  // The catch block opens with the guided-finish branch before the shared
  // failure handling, so take the whole block from its catch to its finally.
  const failureStart = source.indexOf("const failure = normalizeForgeFailure(error);\n      setForgedDeck(\"\");");
  assert.ok(failureStart >= 0, "the commitForge catch block exists");
  const catchBlock = source.slice(source.lastIndexOf("} catch (error) {", failureStart), source.indexOf("} finally {", failureStart));
  assert.doesNotMatch(catchBlock, /setDeck\(/, "the pasted decklist text is never cleared on a failed generation");
  assert.doesNotMatch(catchBlock, /setSelectedCommander\(/, "the selected/detected commander is never cleared on a failed generation");
});
