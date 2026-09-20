import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("the guided-build chamber is a real Chamber value and is rendered by the page", () => {
  assert.match(read("app/forge-types.ts"), /\|\s*"guided-build"/);
  const page = read("app/page.tsx");
  assert.match(page, /import \{ GuidedBuildChamber \}/);
  assert.match(page, /chamber === "guided-build" && <GuidedBuildChamber \/>/);
});

test("the guided-build stylesheet is actually loaded", () => {
  assert.match(read("app/globals.css"), /@import "\.\/guided-build\.css";/);
});

test("Build launches the guided loop only for a picked shell, signed-in accounts, on the discover path", () => {
  const source = read("app/forge-session-context.tsx");
  const awaken = source.slice(source.indexOf("const awaken = () =>"), source.indexOf("const awaken = () =>") + 900);
  assert.match(awaken, /chamber === "commission"/);
  assert.match(awaken, /selectedShell/);
  assert.match(awaken, /!guestMode/);
  assert.match(awaken, /isCommanderFormat\(format\)/);
  assert.match(awaken, /!deck\.trim\(\)/);
  // Guests and shell-less builds must still reach the untouched one-shot path.
  assert.match(awaken, /const seed = Date\.now\(\);/);
});

test("the imported branch of commitDirectForge reads the override text, never a stale deck state, and only guided finishes carry the shell", () => {
  const source = read("app/forge-session-context.tsx");
  const start = source.indexOf('if (mode === "decklist") {');
  const branch = source.slice(start, source.indexOf("} else {", start));
  assert.match(source, /const deckText = options\.deckOverride \?\? deck;/);
  assert.match(branch, /deck: deckText,/);
  assert.doesNotMatch(branch, /deck\.length/);
  assert.match(branch, /focusPackageId: options\.guided && isCommanderFormat\(format\)/);
});

test("a guided finish never writes the deck state (it would reroute a later plain Build click into import mode)", () => {
  const source = read("app/forge-session-context.tsx");
  const finish = source.slice(source.indexOf("function finishGuidedBuild()"), source.indexOf("function exitGuidedBuild()"));
  assert.doesNotMatch(finish, /setDeck\(/);
  assert.match(finish, /deckOverride/);
  assert.match(finish, /guided: true/);
});

test("worker routes both guided endpoints and validates focusPackageId against the real package catalog", () => {
  const index = read("worker/index.ts");
  assert.match(index, /"\/api\/forge\/guided\/start"\) return await handleForgeGuidedStart/);
  assert.match(index, /"\/api\/forge\/guided\/next"\) return await handleForgeGuidedNext/);
  const generate = read("worker/forge-generate.ts");
  assert.match(generate, /STRATEGIC_PACKAGE_IDS\.includes\(body\.focusPackageId\)/);
  assert.match(generate, /focusPackageId: isCommanderFormat\(body\.format\) \? body\.focusPackageId \|\| undefined : undefined/);
});

test("both guided endpoints require an authenticated account and a rate limit", () => {
  const source = read("worker/forge-guided-build.ts");
  assert.equal((source.match(/await userKey\(request, env\)/g) || []).length, 2);
  assert.equal((source.match(/checkRateLimit\(/g) || []).length, 2);
  assert.match(source, /Authenticated account required/);
});
