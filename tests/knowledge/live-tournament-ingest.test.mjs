import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadTournamentsFromLiveCache } from "../../app/knowledge/live-tournament-ingest.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("Live tournament observation ingest", () => {
  it("does not import Brain construction mutators", () => {
    const source = readFileSync(join(root, "app/knowledge/live-tournament-ingest.mjs"), "utf8");
    assert.match(source, /writesToBrain:\s*false/);
    assert.doesNotMatch(source, /forgeNativeMasterwork|chooseSpells|prospectiveSlotDelta/);
  });

  it("can read TopDeck live-cache when present", () => {
    const cacheDir = join(root, "tests/field-intelligence/live-cache");
    if (!existsSync(join(cacheDir, "topdeck"))) return;
    const loaded = loadTournamentsFromLiveCache(cacheDir);
    assert.equal(loaded.ok, true);
    assert.ok(loaded.tournaments.length >= 1);
    assert.ok(loaded.chunksRead >= 1);
  });

  it("live report script exists and is continuous (not Friday-gated)", () => {
    const page = readFileSync(join(root, "tests/knowledge/run-epic2-live-report.mjs"), "utf8");
    assert.match(page, /continuous observation/i);
    assert.match(page, /does not wait for Friday/i);
    assert.match(page, /writesToBrain:\s*false|Brain changes:\*\* 0/);
  });
});
