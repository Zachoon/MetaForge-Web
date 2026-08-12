import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildBrainShadowEvaluationFromFixtures,
  summarizeLiveBrainShadow,
} from "../../app/knowledge/brain-shadow-evaluation.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("Epic 6 — Brain Shadow Evaluation", () => {
  it("does not import Brain construction mutators and stays frozen", () => {
    const source = readFileSync(join(root, "app/knowledge/brain-shadow-evaluation.mjs"), "utf8");
    assert.match(source, /writesToBrain:\s*false/);
    assert.match(source, /brainV1RemainsFrozen:\s*true/);
    assert.doesNotMatch(source, /forgeNativeMasterwork|chooseSpells|prospectiveSlotDelta|package-plan-optimizer/);
  });

  it("fixture shadow eval is read-only and inspectable", () => {
    const intel = buildBrainShadowEvaluationFromFixtures();
    assert.equal(intel.writesToBrain, false);
    assert.equal(intel.brainV1RemainsFrozen, true);
    assert.equal(intel.brainChanges, 0);
    assert.equal(intel.promoted, false);
    assert.ok(intel.corpus.decks >= 50);
    assert.ok(intel.brainHumanCompare.agreements + intel.brainHumanCompare.humanSupportedBlindSpots
      + intel.brainHumanCompare.metaforgeDisagreements >= 0);
    assert.ok(intel.shadowFindings.length >= 1);
    assert.ok(intel.promotionGate.requiredNext.includes("Validation Harness"));
    assert.equal(intel.shadowFindings.every((row) => row.promotesToBrain === false), true);
  });

  it("live artifact summary is read-only when present", () => {
    const path = join(root, "tests/field-intelligence/corpus-intelligence-v1.json");
    if (!existsSync(path)) return;
    const artifact = JSON.parse(readFileSync(path, "utf8"));
    const summary = summarizeLiveBrainShadow(artifact);
    assert.equal(summary.writesToBrain, false);
    assert.equal(summary.brainV1RemainsFrozen, true);
    assert.equal(summary.constructionMutated, false);
    assert.ok((summary.sample || []).length >= 1);
  });

  it("program docs and report script exist", () => {
    const docs = readFileSync(join(root, "docs/KNOWLEDGE_EXPANSION_PROGRAM.md"), "utf8");
    assert.match(docs, /Epic 6/);
    assert.match(docs, /Brain Shadow Evaluation/);
    const page = readFileSync(join(root, "tests/knowledge/run-epic6-report.mjs"), "utf8");
    assert.match(page, /Strategic Knowledge Report/);
  });
});
