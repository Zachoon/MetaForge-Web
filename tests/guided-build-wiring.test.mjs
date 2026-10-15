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

test("Build is guided-only: every Commander build goes through the guided loop, and nothing calls the one-shot generate path", () => {
  const source = read("app/forge-session-context.tsx");
  const start = source.indexOf("const awaken = () =>");
  const awaken = source.slice(start, source.indexOf("\n  };", start));
  assert.match(awaken, /isCommanderFormat\(format\)/);
  // Guests build too (on an anonymous server session), so awaken never
  // bounces them to sign in.
  assert.doesNotMatch(awaken, /window\.location\.assign/);
  assert.match(awaken, /startGuidedBuild\(deck\.trim\(\) \? \{ seedDeck: deck \} : \{\}\)/);
  assert.doesNotMatch(awaken, /commitDirectForge|setChamber\("forging"\)/);
  // The only remaining commitDirectForge caller is the guided finish.
  const callers = [...source.matchAll(/await commitDirectForge\(|void commitDirectForge\(/g)];
  assert.equal(callers.length, 1);
  assert.match(source, /await commitDirectForge\([^)]*guided: true/);
});

test("guided/next carries the learning signals and adopts the server's step order", () => {
  const client = read("app/forge-session-context.tsx");
  const next = client.slice(client.indexOf("async function requestGuidedOffer"), client.indexOf("const trackGuidedStep"));
  for (const field of ["declineFeedback:", "playerCompass,", "categories: next.categories,", "categoryIndex: next.categoryIndex,"]) {
    assert.ok(next.includes(field), `guided/next must send ${field}`);
  }
  assert.match(next, /data\.categoryOrder/);
  const worker = read("worker/forge-guided-build.ts");
  assert.match(worker, /sanitizeDeclineFeedback\(body\?\.declineFeedback/);
  assert.match(worker, /preferenceProfile,\n      reasoningContext,\n    \},/);
  assert.match(worker, /orderRemainingCategories\(clientOrder, categoryIndex/);
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
  const start = client.slice(client.indexOf("async function startGuidedBuild("), client.indexOf("async function requestGuidedOffer"));
  for (const field of ["strategy,", "complexity,", "budget,", "maxCardPrice,", "commonsOnly,"]) {
    assert.ok(start.includes(field), `startGuidedBuild must send ${field}`);
  }
  const worker = read("worker/forge-guided-build.ts");
  assert.match(worker, /budgetConstraint: input\.budget === "Budget conscious"/);
  assert.match(worker, /powerConstraint: input\.targetPowerTier === "Casual"/);
  assert.match(worker, /maxCardPrice: forgeInput\.maxCardPrice \?\? undefined/);
  assert.match(worker, /commonsOnly: Boolean\(forgeInput\.commonsOnly\)/);
});

test("a reload offers an owner-scoped draft and finishing keeps it until a durable result is applied", () => {
  const source = read("app/forge-session-context.tsx");
  assert.match(source, /const GUIDED_STORAGE_KEY = "metaforge-guided-session";/);
  const restoreStart = source.indexOf("const guidedRestoredRef");
  const restore = source.slice(restoreStart, source.indexOf("}, [guestMode]);", restoreStart));
  // Guests restore too: their draft lives under the anonymous guest session.
  assert.match(restore, /if \(guidedRestoredRef\.current\) return;/);
  assert.match(restore, /guidedAccountRequest\("GET"\)/);
  assert.match(restore, /validGuidedDraft\(local\.draft\)/);
  assert.match(restore, /setGuidedAvailableDraft/);
  assert.match(restore, /setGuidedConflict/);
  const finish = source.slice(source.indexOf("function finishGuidedBuild("), source.indexOf("function exitGuidedBuild()"));
  assert.doesNotMatch(finish, /clearStoredGuidedSession\(\)/);
  assert.match(finish, /await saveGuidedDraft/);
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
  assert.match(source, /setGuidedSession\(\{ manualCards: \{\}, \.\.\.saved\.session \}\)/);
});

test("the worker classifies manual cards through the real card-fact transform, caps their count, and folds them into the cache key", () => {
  const worker = read("worker/forge-guided-build.ts");
  assert.match(worker, /import \{[\s\S]*?nativeCardFact,[\s\S]*?\} from "\.\/forge-generate"/);
  assert.match(worker, /MAX_MANUAL_CARDS = 30/);
  assert.match(worker, /\.slice\(0, MAX_MANUAL_CARDS\)/);
  assert.match(worker, /manualCards\.map\(\(card\) => normalizeKey\(String\(card\?\.name \|\| ""\)\)\)\.sort\(\)\.join\(","\)/);
});

test("restart and a session-less retry keep the pasted list, and a pool refresh sends the picks already made", () => {
  const client = read("app/forge-session-context.tsx");
  const start = client.slice(client.indexOf("async function startGuidedBuild("), client.indexOf("async function requestGuidedOffer"));
  assert.match(start, /const seedSource = options\.seedDeck \?\? deck;/);
  const refresh = client.slice(client.indexOf("async function refreshGuidedPool("), client.indexOf("async function retryGuidedBuild("));
  assert.match(refresh, /seedNames: draft\.session\.accepted/);
});

test("a guided offer drops a response that lost the race, and a compass change during a request is retried", () => {
  const source = read("app/forge-session-context.tsx");
  const offer = source.slice(source.indexOf("async function requestGuidedOffer("), source.indexOf("const trackGuidedStep"));
  assert.match(offer, /const seq = \+\+guidedOfferSeqRef\.current/);
  assert.match(offer, /if \(seq !== guidedOfferSeqRef\.current\) return;/);
  assert.match(offer, /if \(seq === guidedOfferSeqRef\.current\) setGuidedLoading\(false\)/);
  const compass = source.slice(source.indexOf("const guidedCompassRef"), source.indexOf("type VerifiedAction"));
  const assignAt = compass.indexOf("guidedCompassRef.current = playerCompass");
  const waitAt = compass.indexOf("if (session && !guidedConflict && !guidedCompletionRef.current && guidedLoading) return;");
  assert.ok(waitAt !== -1 && assignAt !== -1 && waitAt < assignAt, "a compass change during loading must leave the ref stale so the effect retries");
  assert.match(compass, /requestGuidedOffer\(session, \{\}\)/);
  assert.match(compass, /\[playerCompass, guidedLoading\]/);
});

test("pasted seeds missing from the popularity pool are resolved into the stored generation", () => {
  const worker = read("worker/forge-guided-build.ts");
  assert.match(worker, /api\.scryfall\.com\/cards\/collection/);
  assert.match(worker, /resolveSeedCardsOutsidePool\(pool\.cards, seedNames\)/);
  assert.match(worker, /cardPool: cards/);
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

test("a guided finish's completion request carries maxCardPrice/commonsOnly through to the Forge fill, but never a retroactive targetPowerTier", () => {
  // A guided finish hands its accepted picks to forge-generate.ts's
  // "imported" branch as a decklist (finishGuidedBuild -> commitDirectForge
  // -> callForgeGenerate({ mode: "imported", ... })) — the exact same call
  // any plain "complete my pasted list" request makes. Most of a guided
  // build's final deck (everything past the handful of cards actually
  // picked one at a time) comes from whatever this call fills in, so if it
  // silently drops the player's budget/rarity preferences, the guided
  // loop's own carefully-priced suggestions are followed by dozens of
  // Forge-added cards with no price awareness at all. targetPowerTier is a
  // deliberate, tested exception (native-masterwork-import.test.mjs) — the
  // engine has no code path for a retroactive power audit on this path.
  const client = read("app/forge-session-context.tsx");
  const decklistStart = client.indexOf('if (mode === "decklist") {');
  const decklistCall = client.slice(decklistStart, client.indexOf("});", decklistStart));
  assert.match(decklistCall, /mode: "imported"/);
  assert.match(decklistCall, /\bmaxCardPrice,/);
  assert.match(decklistCall, /\bcommonsOnly,/);
  // Checks for the field actually being sent (a bare key), not just the
  // word — the surrounding comment explaining the exclusion necessarily
  // says "targetPowerTier" itself.
  assert.doesNotMatch(decklistCall, /\btargetPowerTier[,:]/);

  const worker = read("worker/forge-generate.ts");
  const importedStart = worker.indexOf('if (body.mode === "imported") {');
  const importedCall = worker.slice(importedStart, worker.indexOf("});", importedStart));
  assert.match(importedCall, /forgeImportedMasterwork\(\{/);
  assert.match(importedCall, /maxCardPrice: body\.maxCardPrice,/);
  assert.match(importedCall, /commonsOnly: body\.commonsOnly,/);
  assert.doesNotMatch(importedCall, /\btargetPowerTier[,:]/);
});

test("a manual card search discards a response that arrives after a newer search has started", () => {
  const source = read("app/components/forge/guided-build-chamber.tsx");
  const effectStart = source.indexOf("const searchSeq = useRef(0);");
  const effect = source.slice(effectStart, source.indexOf("}, [search, format, identityClause]);"));
  assert.match(effect, /const seq = \+\+searchSeq\.current;/);
  // Both the success path and the catch path must check the token before
  // touching state — a stale rejection clearing fresh results would be the
  // same bug in a different shape.
  assert.match(effect, /if \(seq !== searchSeq\.current\) return;/);
  assert.match(effect, /seq === searchSeq\.current && !controller\.signal\.aborted/);
  assert.match(effect, /setSearchState\("error"\)/);
  assert.match(effect, /controller\.abort\(\)/);
});

test("the guided ledger scales fundamentals targets to the request's real deck size, not a hardcoded 100", () => {
  // Standard Brawl is 60 cards, not 100 (see worker/forge-result-validator.mjs's
  // targetDeckSize) — without threading that through, every guided build's
  // ledger used fundamentals-target-table.mjs's 100-card-scale numbers
  // regardless of format, so a Standard Brawl build's fundamentals
  // minimums alone (32 cards) left almost no room for its own ~23 lands.
  const source = read("worker/forge-guided-build.ts");
  assert.match(source, /import \{ isCommanderFormat, targetDeckSize \} from "\.\/forge-result-validator\.mjs";/);
  const ledgerCall = source.slice(source.indexOf("const ledger = buildCategoryBudgetLedger("), source.indexOf("return { suggestion, ledger, analysis };"));
  assert.match(ledgerCall, /deckTarget: targetDeckSize\(input\.format\)/);
});

test("every guided endpoint resolves an account or a signed guest session and is rate limited", () => {
  const source = read("worker/forge-guided-build.ts");
  assert.equal((source.match(/await guidedStartIdentity\(request, env, body\?\.turnstileToken\)/g) || []).length, 1, "start is the only place a guest session can be minted");
  assert.equal((source.match(/await guidedIdentity\(request, env\)/g) || []).length, 2, "next and finish need an existing account or guest session");
  assert.equal((source.match(/await guestStepLimit\(request, env, identity\)/g) || []).length, 2);
  assert.equal((source.match(/checkRateLimit\(/g) || []).length, 3);
  const identity = read("worker/guided-identity.ts");
  assert.match(identity, /validateTurnstile\(request, env\.TURNSTILE_SECRET_KEY, turnstileToken\)/);
  assert.match(identity, /"guided-guest-start-network"/);
  assert.match(identity, /"guided-guest-complete"/);
});

test("the last step opens the guided finish, and the deck only finishes from a confirmed review", () => {
  const source = read("app/forge-session-context.tsx");
  const category = source.slice(source.indexOf("function finishGuidedCategory()"), source.indexOf("// ── Guided finish"));
  assert.match(category, /void enterGuidedFinish\(\);/);
  assert.doesNotMatch(category, /finishGuidedBuild\(false\)/);
  const finish = source.slice(source.indexOf("async function finishGuidedBuild("), source.indexOf("function exitGuidedBuild()"));
  assert.match(finish, /guidedSession\.finish\.stage !== "review" \|\| !guidedSession\.finish\.manaConfirmed \|\| status\.open \|\| status\.over/);
  assert.match(finish, /guidedPickText\(\{ session: guidedSession \}\)/);
  const worker = read("worker/guided-draft.ts");
  assert.match(worker, /const gate = finishGate\(/);
  assert.match(worker, /review\.added\.length \|\| trimmed\.length/);
  const index = read("worker/index.ts");
  assert.match(index, /"\/api\/forge\/guided\/finish"\) return await handleForgeGuidedFinish/);
});

test("guests start guided builds through the human check, and the claim moves the build into the account", () => {
  const source = read("app/forge-session-context.tsx");
  const start = source.slice(source.indexOf("async function startGuidedBuild("), source.indexOf("async function requestGuidedOffer("));
  assert.match(start, /if \(guestMode && !turnstileToken\) \{\s*runWhenVerified\("awaken"\);/);
  assert.match(start, /\.\.\.\(guestMode \? \{ turnstileToken \} : \{\}\)/);
  assert.match(source, /claimGuided=\$\{encodeURIComponent\(guestGuidedClaimToken\)\}/);
  assert.match(source, /JSON\.stringify\(\{ guidedClaimToken: claimGuided \}\)/);
  assert.match(source, /replaceUnfinished: true/);
  assert.match(source, /claim\.status === 409 && claim\.data\?\.guestDraft/);
  const adjust = source.slice(source.indexOf("function adjustGuidedBasic("), source.indexOf("function acceptGuidedUtilityLand("));
  assert.match(adjust, /guidedSessionRef\.current/);
  assert.match(adjust, /basicsCustom: true/);
  const requestFinish = source.slice(source.indexOf("async function requestGuidedFinish("), source.indexOf("async function enterGuidedFinish("));
  assert.match(requestFinish, /landTargetChanged \|\| !previous\.basicsCustom/);
  assert.doesNotMatch(requestFinish, /!previous\.manaConfirmed/);
  const back = source.slice(source.indexOf("function goToGuidedCategory("), source.indexOf("function finishGuidedCategory("));
  assert.match(back, /suspended: true/);
  const worker = read("worker/guided-draft.ts");
  assert.match(worker, /replaceUnfinished/);
  assert.match(worker, /review\.quantityDrift\.length \|\| review\.total !== confirmedSize/);
  const index = read("worker/index.ts");
  assert.match(index, /peek\?\.guidedClaimToken \? handleGuidedClaim\(request, env\) : handleGuestClaim\(request, env\)/);
});
