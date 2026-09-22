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
  const finish = source.slice(source.indexOf("function finishGuidedBuild("), source.indexOf("function exitGuidedBuild()"));
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

test("the guided build carries the player's existing budget/price/commons/strategy preferences end to end", () => {
  const client = read("app/forge-session-context.tsx");
  const start = client.slice(client.indexOf("async function startGuidedBuild()"), client.indexOf("async function requestGuidedOffer"));
  for (const field of ["strategy,", "complexity,", "budget,", "maxCardPrice,", "commonsOnly,"]) {
    assert.ok(start.includes(field), `startGuidedBuild must send ${field}`);
  }
  const worker = read("worker/forge-guided-build.ts");
  assert.match(worker, /budgetConstraint: input\.budget === "Budget conscious"/);
  assert.match(worker, /powerConstraint: input\.targetPowerTier === "Casual"/);
  assert.match(worker, /maxCardPrice: forgeInput\.maxCardPrice \?\? undefined/);
  assert.match(worker, /commonsOnly: Boolean\(forgeInput\.commonsOnly\)/);
});

test("a reload restores the guided build only for accounts, only when the snapshot still matches, and finishing clears it", () => {
  const source = read("app/forge-session-context.tsx");
  assert.match(source, /const GUIDED_STORAGE_KEY = "metaforge-guided-session";/);
  const restoreStart = source.indexOf("const guidedRestoredRef");
  const restore = source.slice(restoreStart, source.indexOf("}, [guestMode]);", restoreStart));
  assert.match(restore, /if \(guestMode \|\| guidedRestoredRef\.current\) return;/);
  assert.match(restore, /session\.key !== savedKey/);
  assert.match(restore, /GUIDED_STORAGE_MAX_AGE_MS/);
  assert.match(restore, /requestGuidedOffer\(restored, \{\}\)/);
  const finish = source.slice(source.indexOf("function finishGuidedBuild("), source.indexOf("function exitGuidedBuild()"));
  assert.match(finish, /clearStoredGuidedSession\(\)/);
  // A session for a different commander/shell/format must be dropped, not adopted.
  assert.match(source, /guidedSession\.key !== guidedKey/);
});

test("guided telemetry carries actions and role categories only — never card names or the list", () => {
  const source = read("app/forge-session-context.tsx");
  const calls = [...source.matchAll(/trackLaunchEvent\("guided_[a-z]+",[\s\S]*?\}\);/g)].map((match) => match[0]);
  assert.ok(calls.length >= 3);
  for (const call of calls) assert.doesNotMatch(call, /accepted\.(join|map)|\.name\b|deckText|declined/);
  assert.match(read("worker/launch-telemetry.ts"), /"guided_started", "guided_step", "guided_finished", "guided_failed"/);
  assert.match(read("app/launch-telemetry.ts"), /\| "guided_failed"/);
});

test("manual search cards are sent to the server on every request, not just the request that adds them", () => {
  const source = read("app/forge-session-context.tsx");
  const addFn = source.slice(source.indexOf("function addGuidedManualCard("), source.indexOf("function removeGuidedPick("));
  assert.match(addFn, /manualCards: \{ \.\.\.guidedSession\.manualCards, \[lower\]: rawCard \}/);
  const requestFn = source.slice(source.indexOf("async function requestGuidedOffer("), source.indexOf("async function requestGuidedOffer(") + 1200);
  assert.match(requestFn, /manualCards: Object\.values\(next\.manualCards\)/);
  // A pre-manual-cards snapshot restored from storage must not crash the next request.
  const restoreStart = source.indexOf("const guidedRestoredRef");
  const restore = source.slice(restoreStart, source.indexOf("}, [guestMode]);", restoreStart));
  assert.match(restore, /const restored: GuidedSession = \{ manualCards: \{\}, \.\.\.session \};/);
});

test("the worker classifies manual cards through the real card-fact transform, caps their count, and folds them into the cache key", () => {
  const worker = read("worker/forge-guided-build.ts");
  assert.match(worker, /import \{[\s\S]*?nativeCardFact,[\s\S]*?\} from "\.\/forge-generate"/);
  assert.match(worker, /MAX_MANUAL_CARDS = 30/);
  assert.match(worker, /\.slice\(0, MAX_MANUAL_CARDS\)/);
  assert.match(worker, /manualCards\.map\(\(card\) => normalizeKey\(String\(card\?\.name \|\| ""\)\)\)\.sort\(\)\.join\(","\)/);
});

test("restarting a guided build requires a two-step confirm and never silently discards picks", () => {
  const source = read("app/components/forge/guided-build-chamber.tsx");
  // The bare button only ever arms the confirm; it must never call
  // startGuidedBuild directly (that would be exactly the silent one-click
  // bulk mutation this project's own UX principle rules out).
  const armStart = source.indexOf('className="guided-restart"');
  const armButton = source.slice(armStart, armStart + 200);
  assert.match(armButton, /onClick=\{\(\) => setConfirmingRestart\(true\)\}/);
  assert.doesNotMatch(armButton, /startGuidedBuild/);
  // Only the confirmed path actually restarts.
  assert.match(source, /onClick=\{\(\) => \{ setConfirmingRestart\(false\); void startGuidedBuild\(\); \}\}/);
  // A pending confirm is dropped if the player does anything else instead —
  // it must not survive into an unrelated later click.
  assert.match(source, /setConfirmingRestart\(false\);\s*\}, \[session\?\.accepted\.length, session\?\.categoryIndex, guidedLoading\]\);/);
});

test("both guided endpoints require an authenticated account and a rate limit", () => {
  const source = read("worker/forge-guided-build.ts");
  assert.equal((source.match(/await userKey\(request, env\)/g) || []).length, 2);
  assert.equal((source.match(/checkRateLimit\(/g) || []).length, 2);
  assert.match(source, /Authenticated account required/);
});
