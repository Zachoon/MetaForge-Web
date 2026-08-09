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
  assert.match(source, /const \{ generationId, \.\.\.storedBody \} = generation\.body/);
  assert.match(source, /claimToken, guestPreview: true/);
  assert.match(source, /claimed_by IS NULL/);
});

test("the authenticated Forge retains its existing account boundary", async () => {
  const source = await read("worker/forge-generate.ts");
  assert.match(source, /const key = await userKey\(request, env\)/);
  assert.match(source, /Authenticated account required/);
  assert.match(source, /generateForgeResult\(request, env, key\)/);
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

test("the published Sites hostname stays on the public guest Forge instead of the authenticated endpoint", async () => {
  const source = await read("app/page.tsx");
  assert.match(
    source,
    /host\.endsWith\("\.chatgpt\.site"\)/,
    "a published Sites build must remain usable before the visitor creates an account",
  );
  assert.match(source, /const isGuest = isPublicForgeHost \|\|/);
});

test("production gives bounded native construction enough CPU to reach its own cleanup and response path", async () => {
  const config = await read("wrangler.jsonc");
  assert.match(config, /"limits"\s*:\s*\{\s*"cpu_ms"\s*:\s*120000\s*\}/);
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

// P0 follow-up: a production walkthrough proved a network-rate-limit 429
// used to render literally contradictory copy in the same failure state —
// "this network has used its preview" alongside "your preview was not
// used, try again" — because every guest-forge failure fell through one
// generic catch and one generic message-string render. The fix gives the
// server six machine-readable codes (worker/guest-forge.ts,
// worker/forge-generate.ts) and the client a single normalizeForgeFailure
// mapping (app/page.tsx) that the failure UI branches on by code, never by
// comparing message text. These tests pin that contract at the source
// level: the normalization table itself, and that each rendered branch
// only ever shows copy consistent with its own code.

test("the server defines exactly the six required guest-forge error codes", async () => {
  const guestForge = await read("worker/guest-forge.ts");
  const forgeGenerate = await read("worker/forge-generate.ts");
  const validator = await read("worker/forge-result-validator.mjs");
  const combined = guestForge + forgeGenerate + validator;
  for (const code of [
    "GUEST_PREVIEW_ALREADY_USED",
    "NETWORK_RATE_LIMITED",
    "HUMAN_VERIFICATION_REQUIRED",
    "INCOMPLETE_GENERATION",
    "CATALOG_UNAVAILABLE",
    "GENERATION_FAILED",
  ]) {
    assert.match(combined, new RegExp(`code: "${code}"`), `expected ${code} to be returned by the server`);
  }
});

test("NETWORK_RATE_LIMITED is a 429 that explicitly denies the preview was ever used, and never claims the network's preview was spent", async () => {
  const source = await read("worker/guest-forge.ts");
  const block = source.match(/if \(!networkLimit\.allowed\) \{[\s\S]*?429,\n\s*\{[\s\S]*?\);\n\s*\}/)?.[0];
  assert.ok(block, "expected the network-rate-limit response block");
  assert.match(block, /429/);
  assert.match(block, /"NETWORK_RATE_LIMITED"/);
  assert.match(block, /Your preview has not been used/);
  assert.doesNotMatch(block, /has used its preview/i, "the network limiter must never claim a preview was used — a network is not a player");
});

test("GUEST_PREVIEW_ALREADY_USED stays a 409 and is the only server response allowed to say the preview was used", async () => {
  const source = await read("worker/guest-forge.ts");
  const block = source.match(/if \(!holdsReservation\) \{[\s\S]*?409,\n\s*\);/)?.[0];
  assert.ok(block, "expected the already-reserved response block");
  assert.match(block, /409/);
  assert.match(block, /"GUEST_PREVIEW_ALREADY_USED"/);
  assert.match(block, /already been used/);
  assert.match(block, /claimToken/);
});

test("a stale pending reservation can be reclaimed only via one atomic UPDATE guarded by status and staleness, never by deleting or reading-then-writing", async () => {
  const source = await read("worker/guest-forge.ts");
  const block = source.match(/const reclaim = await env\.DB\.prepare\([\s\S]*?\.run\(\);/)?.[0];
  assert.ok(block, "expected the reclaim UPDATE statement");
  assert.match(block, /UPDATE guest_forge_sessions SET created_at = \?, expires_at = \?/);
  assert.match(block, /WHERE session_key = \? AND status = 'pending' AND created_at < \?/, "reclaim must never match a 'used' row, and must require staleness");
});

test("normalizeForgeFailure maps every code to its retry/preview/verification meaning exactly once, defaulting unknown codes to GENERATION_FAILED's meta (never to already-used)", async () => {
  const source = await read("app/page.tsx");
  const table = source.match(/const GUEST_FORGE_ERROR_META[\s\S]*?\n\};/)?.[0];
  assert.ok(table, "expected the GUEST_FORGE_ERROR_META table");
  assert.match(table, /GUEST_PREVIEW_ALREADY_USED: \{ retryable: false, previewConsumed: true, requiresVerification: false \}/);
  assert.match(table, /NETWORK_RATE_LIMITED: \{ retryable: false, previewConsumed: false, requiresVerification: false \}/);
  assert.match(table, /HUMAN_VERIFICATION_REQUIRED: \{ retryable: true, previewConsumed: false, requiresVerification: true \}/);
  assert.match(table, /INCOMPLETE_GENERATION: \{ retryable: true, previewConsumed: false, requiresVerification: true \}/);
  assert.match(table, /CATALOG_UNAVAILABLE: \{ retryable: true, previewConsumed: false, requiresVerification: true \}/);
  assert.match(table, /GENERATION_FAILED: \{ retryable: true, previewConsumed: false, requiresVerification: true \}/);

  const fn = source.match(/function normalizeForgeFailure[\s\S]*?\n\}/)?.[0];
  assert.ok(fn, "expected the normalizeForgeFailure function");
  assert.match(
    fn,
    /const meta = code === "UNKNOWN" \? GUEST_FORGE_ERROR_META\.GENERATION_FAILED : GUEST_FORGE_ERROR_META\[code\];/,
    "an unrecognized code must fall back to GENERATION_FAILED's meta, which is retryable and never previewConsumed",
  );
});

test("only requiresVerification failures reset the Turnstile widget; NETWORK_RATE_LIMITED and GUEST_PREVIEW_ALREADY_USED do not", async () => {
  const source = await read("app/page.tsx");
  const catchBlock = source.match(/\} catch \(error\) \{\s*const failure = normalizeForgeFailure\(error\);[\s\S]*?\} finally \{/)?.[0];
  assert.ok(catchBlock, "expected the commitDirectForge catch block");
  assert.match(
    catchBlock,
    /if \(failure\.requiresVerification\) resetGuestVerificationAfterFailure\(\);/,
    "the reset must be gated on requiresVerification, not called unconditionally",
  );
});

// Each branch is sliced by the unique heading string that opens it, rather
// than by matching nested-ternary `) : (` closers — the three branches
// share that same closer token structurally, which makes it an unreliable
// boundary. The heading strings are each unique in the file and appear in
// source order, so slicing between them isolates exactly one branch's JSX.
function forgeFailureBranches(source) {
  const alreadyUsedStart = source.indexOf("YOUR FREE PREVIEW IS SPENT");
  const networkStart = source.indexOf("TOO MANY ATTEMPTS FROM THIS NETWORK");
  const retryableStart = source.indexOf("THE METAL DID NOT SET");
  const blockEnd = source.indexOf("The Forge is waiting for a valid commission");
  assert.ok(alreadyUsedStart > 0 && networkStart > alreadyUsedStart, "expected the GUEST_PREVIEW_ALREADY_USED branch heading before the NETWORK_RATE_LIMITED heading");
  assert.ok(retryableStart > networkStart && blockEnd > retryableStart, "expected the retryable-branch heading before the end of the failure block");
  return {
    alreadyUsed: source.slice(alreadyUsedStart, networkStart),
    network: source.slice(networkStart, retryableStart),
    retryable: source.slice(retryableStart, blockEnd),
  };
}

test("the failure UI renders a distinct, non-contradictory branch per error code", async () => {
  const source = await read("app/page.tsx");
  const { alreadyUsed, network, retryable } = forgeFailureBranches(source);

  assert.match(alreadyUsed, /already been used/);
  assert.doesNotMatch(alreadyUsed, /Strike the Anvil Again/, "an already-used preview must never offer a retry — retry cannot succeed under the same guest identity");
  assert.doesNotMatch(alreadyUsed, /preview was not used/i, "an already-used preview must never simultaneously claim the preview was not used");

  assert.match(network, /reached today's Forge limit/);
  assert.doesNotMatch(network, /Strike the Anvil Again/, "the network limiter must never present a retry button pretending an immediate retry can work");
  assert.doesNotMatch(network, /card-data|catalog/i, "the network limiter must never render catalog/card-data failure language");
  assert.doesNotMatch(network, /No incomplete deck was saved/i, "the network limiter must never render incomplete-generation language");
  assert.match(network, /Sign in \/ create account/, "the network limiter must offer the sign-in path");

  assert.match(retryable, /Strike the Anvil Again/);
  assert.doesNotMatch(retryable, /already been used|preview is spent/i, "retryable failures must never claim the preview was already used");
});

// Hard regression lock for the exact production video: a NETWORK_RATE_LIMITED
// 429 must never be able to render both "this network has used its preview"
// and "your preview was not used, complete verification and try again" in
// the same state — the two claims directly contradict each other and that
// contradiction is what made the failure unreadable for weeks.
test("regression: a NETWORK_RATE_LIMITED state can never render both the old contradictory claims at once", async () => {
  const source = await read("app/page.tsx");
  const { network } = forgeFailureBranches(source);
  assert.doesNotMatch(network, /has used its preview Forge for now/);
  assert.doesNotMatch(network, /Complete the verification above, then try again/);
});
