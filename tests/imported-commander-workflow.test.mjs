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

test("refine mode auto-detects a commander from the pasted list — commission mode never does", async () => {
  const source = await read("app/page.tsx");
  assert.match(
    source,
    /if \(chamber !== "refine" \|\| !isCommanderFormat\(format\) \|\| selectedCommander\) return;/,
    "auto-detection only runs in the refine chamber, only for commander formats, and only while no commander is already selected",
  );
  assert.match(source, /resolvePastedCommanderCandidate\(\{/);
  assert.match(source, /if \(resolved\) setSelectedCommander\(resolved\);/);
});

test("a detected or selected commander renders the selected-commander summary, not the discovery UI, in either chamber", async () => {
  const source = await read("app/page.tsx");
  assert.match(
    source,
    /\{selectedCommander \? \(\s*<article>/,
    "selectedCommander truthy always renders the summary <article>, never the search/discovery branch",
  );
});

test("the random three-commander suggestion action is hidden in refine mode but present in commission mode", async () => {
  const source = await read("app/page.tsx");
  assert.match(
    source,
    /\{chamber !== "refine" && \(\s*<button\s*\n\s*type="button"\s*\n\s*disabled=\{randomizingCommander\}\s*\n\s*onClick=\{chooseRandomCommander\}/,
    "the random-suggestion button is wrapped in a chamber !== \"refine\" guard, so it renders for commission and is hidden for refine",
  );
});

test("refine mode without a detectable commander keeps the manual search input as a fallback (not chamber-gated)", async () => {
  const source = await read("app/page.tsx");
  // The commander-search <div> (containing the search <input>) has no
  // chamber condition of its own — only the random-suggestion button
  // nested inside it does — so a paste that extractPastedCommanderName
  // can't resolve still leaves the manual search box available in refine.
  const searchBlockMatch = source.match(/<div\s*\n\s*className="commander-search"[\s\S]*?<\/div>\s*\{commanderSearchOpen/);
  assert.ok(searchBlockMatch, "the commander-search block exists");
  assert.doesNotMatch(
    searchBlockMatch[0].split(`{chamber !== "refine" && (`)[0],
    /chamber !== "refine"/,
    "the search input itself (before the nested random-suggestion button) carries no refine-only gate",
  );
});

test("commission mode's discovery copy is unchanged; refine mode gets its own confirmation copy", async () => {
  const source = await read("app/page.tsx");
  assert.match(source, /"Choose a legend—or let the Forge discover one"/, "the fresh-build discovery copy is untouched by this fix");
  assert.match(source, /"Confirm the commander from your list"/);
  assert.match(
    source,
    /chamber === "refine"\s*\n\s*\? "Confirm the commander from your list"\s*\n\s*: "Choose a legend—or let the Forge discover one"/,
  );
});

test("the imported-generate call still targets the authenticated or guest generate endpoint unchanged", async () => {
  const source = await read("app/page.tsx");
  assert.match(source, /guestMode \? "\/api\/forge\/guest-generate" : "\/api\/forge\/generate"/);
});

test("a failed forge attempt still preserves the pasted decklist and selected commander (deck/commander state is never cleared on catch)", async () => {
  const source = await read("app/page.tsx");
  const catchBlock = source.match(/\} catch \(error\) \{\s*setForgedDeck\(""\);[\s\S]*?\} finally \{/);
  assert.ok(catchBlock, "the commitForge catch block exists");
  assert.doesNotMatch(catchBlock[0], /setDeck\(/, "the pasted decklist text is never cleared on a failed generation");
  assert.doesNotMatch(catchBlock[0], /setSelectedCommander\(/, "the selected/detected commander is never cleared on a failed generation");
});
