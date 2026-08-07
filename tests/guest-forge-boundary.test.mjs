import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("the public Forge verifies Turnstile server-side and never trusts the browser alone", async () => {
  const source = await read("worker/guest-forge.ts");
  assert.match(source, /challenges\.cloudflare\.com\/turnstile\/v0\/siteverify/);
  assert.match(source, /TURNSTILE_SECRET_KEY/);
  assert.match(source, /Please complete the human verification/);
});

test("a guest receives a claim token but not the reusable generation handle", async () => {
  const source = await read("worker/guest-forge.ts");
  assert.match(source, /delete responseBody\.generationId/);
  assert.match(source, /claimToken, guestPreview: true/);
  assert.match(source, /claimed_by IS NULL/);
});

test("the authenticated Forge retains its existing account boundary", async () => {
  const source = await read("worker/forge-generate.ts");
  assert.match(source, /const key = await userKey\(request, env\)/);
  assert.match(source, /Authenticated account required/);
  assert.match(source, /handleForgeGenerateForKey\(request, env, key\)/);
});

test("guest UI uses the guest endpoint and suppresses persistence and structural analysis", async () => {
  const source = await read("app/page.tsx");
  const styles = await read("app/globals.css");
  assert.match(source, /guestMode \? "\/api\/forge\/guest-generate" : "\/api\/forge\/generate"/);
  assert.match(source, /persist: !guestMode/);
  assert.match(source, /if \(guestMode\) \{\s*setStructuralAnalysisStatus\("idle"\)/);
  assert.match(source, /https:\/\/app\.metaforge\.gg\/\?claim=/);
  assert.match(source, /!guestMode && !editAnvilOpen/);
  assert.match(source, /size: "flexible"/);
  assert.match(source, /appearance: "interaction-only"/);
  assert.match(source, /turnstile-host\$\{turnstileToken \? " verified" : ""\}/);
  assert.match(source, /guest-forge-pass\$\{turnstileToken \? " verified" : ""\}\$\{walkthroughActive \? " tour-hidden" : ""\}/);
  assert.match(styles, /\.guest-forge-pass \.turnstile-host\.verified \{ display: none; \}/);
  assert.match(styles, /> \.guest-forge-pass\.verified,[\s\S]*?> \.guest-forge-pass\.tour-hidden \{ display: none; \}/);
  assert.match(styles, /\.great-forge\[data-guest-mode="true"\] > \.guest-forge-pass,[\s\S]*?position: fixed/);
  assert.match(styles, /\.great-forge\[data-guest-mode="true"\][\s\S]*?padding-bottom/);
});

// A Turnstile siteverify token is single-use server-side (worker/guest-
// forge.ts's validateTurnstile spends it the moment it's checked) whether
// or not the deck-construction attempt that follows succeeds. Before this
// fix, turnstileToken was only cleared on a full success, so a generation
// failure for any unrelated reason left the browser holding a token
// Cloudflare had already spent — every "Strike the Anvil Again" retry
// resent that same dead token, and Cloudflare correctly rejected it every
// time, surfacing "complete the human verification" on every retry and
// permanently hiding whatever the real first failure was.
test("a failed guest generation resets the Turnstile widget so the retry gets a real fresh token, not the one already spent verifying this attempt", async () => {
  const source = await read("app/page.tsx");
  assert.match(
    source,
    /function resetGuestVerificationAfterFailure\(\) \{\s*if \(!guestMode\) return;\s*setTurnstileToken\(""\);/,
    "the helper must bail for non-guest sessions and otherwise clear the stale token",
  );
  assert.match(
    source,
    /turnstile\.reset\(turnstileWidgetRef\.current\)/,
    "the helper must actually re-render the Turnstile challenge, not just clear local state",
  );
  // commitDirectForge is now the only generation call site (its commander
  // branch produces all three Masterwork candidates in one call and routes
  // through the masterworks picker instead of a separate inspectMasterwork
  // generation per selection), so exactly one catch block needs the reset.
  const occurrences = source.match(/resetGuestVerificationAfterFailure\(\);/g) || [];
  assert.equal(occurrences.length, 1, "expected the reset to run in the one generation failure catch block");
});

// Root cause of "0 cards / 0 sections / human-verification retry
// messaging": awaken() (the ~8 second forging-animation trigger) and
// "Strike the Anvil Again" were never gated on turnstileToken presence, so
// a guest whose token had quietly expired in the background (Cloudflare's
// own ~5 minute window, easily crossed while configuring format/commander/
// strategy/preferences) could click Forge, watch the full animation play
// out, and only then hit "Complete the human verification" with an empty
// deck — a worse experience than failing before the click ever did
// anything. Both triggers must refuse to fire without a live token.
test("the Forge trigger (awaken) and its retry are both disabled in guest mode until a live Turnstile token exists", async () => {
  const source = await read("app/page.tsx");
  const awakenBlock = source.match(/className="awaken-button"[\s\S]*?<\/button>/)?.[0];
  assert.ok(awakenBlock, "expected to find the awaken-button block");
  assert.match(awakenBlock, /\(guestMode && !turnstileToken\)/, "awaken must be disabled without a live guest token");
  assert.match(
    awakenBlock,
    /guestMode && !turnstileToken\s*\n\s*\? "Confirm you're human above, then build your deck"/,
    "the button's own status text must explain why it's blocked, not just go dark",
  );

  const retryBlock = source.match(/forge-generation-failure" role="alert"[\s\S]*?Strike the Anvil Again/)?.[0];
  assert.ok(retryBlock, "expected to find the failure-state retry block");
  assert.match(retryBlock, /disabled=\{guestMode && !turnstileToken\}/, "retry must not be clickable without a live guest token");
  assert.match(
    retryBlock,
    /Your preview was not used\. Complete the verification above, then try again\./,
    "the failure state must plainly confirm the preview was not used and point back at verification",
  );
});

// Cloudflare Turnstile tokens expire on their own timer even when nothing
// ever fails — clearing React state alone (the old expired-callback) could
// leave the widget's own DOM showing a stale "verified" appearance instead
// of a real, interactive challenge, since nothing ever called reset() on
// that path. Natural expiry must get the same explicit reset() the
// failure path already gets, not rely on assumptions about Turnstile's
// own default behavior.
test("a naturally expired or errored Turnstile token also forces an explicit widget reset, not just cleared React state", async () => {
  const source = await read("app/page.tsx");
  const renderBlock = source.match(/turnstileWidgetRef\.current = turnstile\.render\(turnstileHostRef\.current, \{[\s\S]*?\}\);/)?.[0];
  assert.ok(renderBlock, "expected to find the turnstile.render(...) call");
  assert.match(
    renderBlock,
    /"expired-callback": \(\) => \{\s*setTurnstileToken\(""\);\s*if \(turnstileWidgetRef\.current\) turnstile\.reset\(turnstileWidgetRef\.current\);\s*\}/,
  );
  assert.match(
    renderBlock,
    /"error-callback": \(\) => \{\s*setTurnstileToken\(""\);\s*if \(turnstileWidgetRef\.current\) turnstile\.reset\(turnstileWidgetRef\.current\);\s*\}/,
  );
});
