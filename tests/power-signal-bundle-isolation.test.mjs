import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

// The Commander power-signal model (commander-power-signal.mjs) and its
// construction-time bias/audit/rebuild logic (native-masterwork-engine.mjs)
// are algorithm internals: the specific detectors, category weights, and
// tier thresholds that decide how a build gets judged. They must only
// ever run server-side (forge-generate.ts) — never ship to the browser,
// where anyone could read the exact weights and thresholds out of dev
// tools. Requires `npm run build` to have already produced dist/client
// and dist/server, same assumption every other worker/API test in this
// suite already makes.
const CLIENT_DIR = new URL("../dist/client/", import.meta.url);
const SERVER_FILE = new URL("../dist/server/index.js", import.meta.url);

function readAllClientJs() {
  const dir = fileURLToPath(CLIENT_DIR);
  const files = [];
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".js")) files.push(full);
    }
  };
  walk(dir);
  return files.map((file) => fs.readFileSync(file, "utf8")).join("\n");
}

const ENGINE_INTERNAL_IDENTIFIERS = [
  "isRepeatableValueEngine",
  "isRepeatableSacEngine",
  "isEfficientInteraction",
  "isResourceMultiplier",
  "CATEGORY_WEIGHT",
  "POWER_TIER_INDEX",
  "repairPowerOffenders",
  "commanderAmplifiesSpells",
  "auditPowerTier",
];

test("power-signal engine internals never reach the client bundle", () => {
  assert.ok(fs.existsSync(CLIENT_DIR), "dist/client must exist — run `npm run build` first");
  const clientSource = readAllClientJs();
  for (const identifier of ENGINE_INTERNAL_IDENTIFIERS) {
    assert.doesNotMatch(clientSource, new RegExp(identifier), `${identifier} must not appear anywhere in the client bundle`);
  }
});

test("power-signal engine internals are present server-side, confirming the check above isn't vacuous", () => {
  assert.ok(fs.existsSync(new URL("../dist/server/", import.meta.url)), "dist/server must exist — run `npm run build` first");
  const serverSource = fs.readFileSync(SERVER_FILE, "utf8");
  for (const identifier of ["isRepeatableValueEngine", "CATEGORY_WEIGHT", "repairPowerOffenders", "commanderAmplifiesSpells"]) {
    assert.match(serverSource, new RegExp(identifier), `${identifier} should be present in the server bundle — if this fails, the client-side check above may be passing vacuously`);
  }
});
