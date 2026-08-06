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
  // Both generation catch blocks (inspectMasterwork's native-reveal path and
  // commitDirectForge's decklist/commander path) must call the reset —
  // exactly two call sites, matching the two places a guest generation can
  // fail after Turnstile has already been spent.
  const occurrences = source.match(/resetGuestVerificationAfterFailure\(\);/g) || [];
  assert.equal(occurrences.length, 2, "expected the reset to run in both generation failure catch blocks");
});
