import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const source = async (path) => readFile(new URL(path, root), "utf8");

test("optional tracking waits for an explicit visitor choice", async () => {
  const layout = await source("app/layout.tsx");
  const controls = await source("app/privacy-controls.tsx");
  assert.doesNotMatch(layout, /utt\.impactcdn\.com/);
  assert.match(layout, /<PrivacyControls\s*\/>/);
  assert.match(controls, /measurementConsent\(\) !== "allowed"|current === "allowed"/);
  assert.match(controls, /No thanks/);
  assert.match(controls, /Allow anonymous measurement/);
});

test("launch funnel covers the complete visitor journey without deck contents", async () => {
  const telemetry = await source("app/launch-telemetry.ts");
  const page = await source("app/page.tsx");
  for (const event of ["forge_started", "forge_succeeded", "forge_failed", "coaching_opened", "experiment_started", "save_continue_clicked"]) {
    assert.match(page, new RegExp(`trackLaunchEvent\\(\\"${event}\\"`));
  }
  assert.doesNotMatch(telemetry, /decklist|cardChoices|email/i);
  assert.match(telemetry, /utm_source/);
  assert.match(telemetry, /keepalive: true/);
});

test("server reliability telemetry is aggregate and never delays generation", async () => {
  const worker = await source("worker/index.ts");
  const telemetry = await source("worker/launch-telemetry.ts");
  assert.match(worker, /ctx\.waitUntil\(recordOperationalGeneration/);
  assert.match(telemetry, /generation_succeeded/);
  assert.match(telemetry, /generation_failed/);
  assert.doesNotMatch(telemetry, /CF-Connecting-IP|user-agent|decklist|commander/i);
});

test("founder dashboard reports funnel, reliability, and campaign outcomes", async () => {
  const founder = await source("app/founder/page.tsx");
  assert.match(founder, /Visitor journey/);
  assert.match(founder, /Production reliability/);
  assert.match(founder, /What brings builders/);
  assert.match(founder, /VISIT → DECK/);
});
