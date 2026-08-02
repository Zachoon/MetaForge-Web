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
  assert.match(source, /guestMode \? "\/api\/forge\/guest-generate" : "\/api\/forge\/generate"/);
  assert.match(source, /persist: !guestMode/);
  assert.match(source, /if \(guestMode\) \{\s*setStructuralAnalysisStatus\("idle"\)/);
  assert.match(source, /https:\/\/app\.metaforge\.gg\/\?claim=/);
  assert.match(source, /!guestMode && !editAnvilOpen/);
});
