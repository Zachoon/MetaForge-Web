import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildExpertStrategyCorpusFromFixtures } from "../../app/knowledge/expert-strategy-corpus.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("Stream 002 Complete — fixtures", () => {
  it("marks fixture pipeline complete while live ingest stays gated", () => {
    const charter = readFileSync(join(root, "docs/STREAM_002_COMPLETE.md"), "utf8");
    assert.match(charter, /fixture observation complete/i);
    assert.match(charter, /live ingestion still gated|Live expert scrape/i);
  });

  it("answers the falsifiable question without Brain writes", () => {
    const report = buildExpertStrategyCorpusFromFixtures();
    assert.equal(report.writesToBrain, false);
    assert.equal(report.stream, "academy-evidence-stream-002");
    assert.ok(["yes_candidates_only", "no_honest_zero_admission"].includes(report.outcome.answer));
    assert.ok(Number.isFinite(report.outcome.replicatedConcepts));
  });
});
