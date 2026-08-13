import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  buildValidationReport,
  VALIDATION_REPORT_VERSION,
} from "../app/validation-harness.mjs";
import {
  compareConstructedLists,
  runListDisagreementCase,
  runOfflineListDisagreement,
  summarizeListDisagreement,
  LIST_DISAGREEMENT_VERSION,
} from "../app/validation-harness-disagreement.mjs";
import { loadOfflineFieldCorpusCases } from "../app/validation-harness-corpus.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("Field Validation — Brain vs corpus list disagreement", () => {
  it("does not invent Brain construction imports", () => {
    const source = readFileSync(join(root, "app/validation-harness-disagreement.mjs"), "utf8");
    assert.doesNotMatch(source, /package-plan-optimizer|prospective-slot-delta|strategic-plan-competition/);
    assert.match(source, /writesToBrain:\s*false/);
    assert.equal(LIST_DISAGREEMENT_VERSION, "list-disagreement-v1");
  });

  it("compares spell name sets without counting basics or commander", () => {
    const diff = compareConstructedLists({
      commanderName: "Pearl-Ear, Imperial Advisor",
      brainRows: [
        { name: "Pearl-Ear, Imperial Advisor", typeLine: "Legendary Creature — Fox Advisor" },
        { name: "Aura Piece 0", typeLine: "Enchantment — Aura" },
        { name: "Sol Ring", typeLine: "Artifact" },
        { name: "Plains", typeLine: "Basic Land — Plains" },
      ],
      corpusRows: [
        { name: "Pearl-Ear, Imperial Advisor", typeLine: "Legendary Creature — Fox Advisor" },
        { name: "Aura Piece 0", typeLine: "Enchantment — Aura" },
        { name: "Swords to Plowshares", typeLine: "Instant" },
        { name: "Plains", typeLine: "Basic Land — Plains" },
      ],
    });
    assert.equal(diff.sharedCount, 1);
    assert.equal(diff.onlyBrainCount, 1);
    assert.equal(diff.onlyCorpusCount, 1);
    assert.ok(diff.onlyBrain.includes("Sol Ring"));
    assert.ok(diff.onlyCorpus.includes("Swords to Plowshares"));
    assert.equal(diff.writesToBrain, false);
  });

  it("runs one offline pair into the shared validation report shape", () => {
    const packed = loadOfflineFieldCorpusCases({ limit: 1, seeds: [11] });
    const record = runListDisagreementCase(packed.cases[0]);
    assert.ok(record.listDisagreement);
    assert.equal(record.listDisagreement.writesToBrain, false);
    assert.ok(Number.isFinite(record.listDisagreement.jaccard) || record.listDisagreement.unavailable);

    const report = buildValidationReport([record], {
      mode: "list-disagreement",
      includeRecords: true,
      generatedAt: "2026-08-13T00:00:00.000Z",
    });
    assert.equal(report.version, VALIDATION_REPORT_VERSION);
    assert.equal(report.listDisagreement.present, true);
    assert.equal(report.listDisagreement.writesToBrain, false);
    assert.ok(report.records[0].listDisagreement);
  });

  it("summarizes multiple disagreement rows", () => {
    const summary = summarizeListDisagreement([
      {
        listDisagreement: {
          jaccard: 0.2,
          brainCoverageOfCorpus: 0.3,
          corpusCoverageOfBrain: 0.4,
          onlyBrainCount: 10,
          onlyCorpusCount: 12,
          commanderName: "A",
        },
      },
      {
        listDisagreement: {
          jaccard: 0.6,
          brainCoverageOfCorpus: 0.7,
          corpusCoverageOfBrain: 0.5,
          onlyBrainCount: 4,
          onlyCorpusCount: 5,
          commanderName: "B",
        },
      },
    ]);
    assert.equal(summary.present, true);
    assert.equal(summary.cases, 2);
    assert.equal(summary.meanJaccard, 0.4);
    assert.ok(summary.lowOverlapSamples.some((row) => row.commanderName === "A"));
  });

  it("wires runner and docs milestone", () => {
    const runner = readFileSync(join(root, "tests/validation-harness/run-disagreement.mjs"), "utf8");
    const docs = readFileSync(join(root, "docs/VALIDATION_HARNESS.md"), "utf8");
    const pkg = readFileSync(join(root, "package.json"), "utf8");
    assert.match(runner, /list-disagreement/);
    assert.match(pkg, /validate:harness:disagreement/);
    assert.match(docs, /disagreement|Brain-built vs corpus/);
    // Smoke that offline batch helper exists without running many forges here.
    assert.equal(typeof runOfflineListDisagreement, "function");
  });
});
