import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildExpertStrategyCorpusFromFixtures,
  extractDecisionConceptsFromExcerpt,
  replicateDecisionConcepts,
  FIXTURE_EXPERT_REASONING_CORPUS,
} from "../../app/knowledge/expert-strategy-corpus.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("Epic 4 — Expert Strategy Corpus (Stream 002)", () => {
  it("does not import Brain construction mutators and stays unpromoted", () => {
    const source = readFileSync(join(root, "app/knowledge/expert-strategy-corpus.mjs"), "utf8");
    assert.match(source, /writesToBrain:\s*false/);
    assert.match(source, /activated:\s*false/);
    assert.match(source, /promoted:\s*false/);
    assert.doesNotMatch(source, /forgeNativeMasterwork|chooseSpells|prospectiveSlotDelta/);
  });

  it("extracts player-language concepts only when earned by text", () => {
    const hit = extractDecisionConceptsFromExcerpt({
      id: "t1",
      authorKey: "a",
      independenceGroup: "v1",
      excerpt: "Opportunity cost matters when you sequence ramp before interaction.",
    });
    const ids = hit.concepts.map((c) => c.conceptId);
    assert.ok(ids.includes("opportunity_cost"));
    assert.ok(ids.includes("sequencing"));

    const miss = extractDecisionConceptsFromExcerpt({
      id: "t2",
      authorKey: "b",
      excerpt: "Flavor wins games for me. Vibes are the strategy.",
    });
    assert.equal(miss.concepts.length, 0);
    assert.equal(miss.emptyReason, "no_decision_concept_detected");
  });

  it("requires ≥2 independent experts before candidate admission", () => {
    const replication = replicateDecisionConcepts([
      {
        sourceId: "1",
        authorKey: "a",
        independenceGroup: "voice_a",
        concepts: [{ conceptId: "tempo", label: "tempo" }],
      },
      {
        sourceId: "2",
        authorKey: "b",
        independenceGroup: "voice_b",
        concepts: [{ conceptId: "tempo", label: "tempo" }],
      },
      {
        sourceId: "3",
        authorKey: "c",
        independenceGroup: "voice_c",
        concepts: [{ conceptId: "risk", label: "risk" }],
      },
    ]);
    assert.ok(replication.candidates.some((c) => c.conceptId === "tempo"));
    assert.ok(replication.rejects.some((c) => c.conceptId === "risk"));
    assert.equal(replication.candidates.find((c) => c.conceptId === "tempo").promoted, false);
    assert.equal(replication.activated, false);
  });

  it("fixture corpus produces an inspectable Stream 002 observation", () => {
    assert.ok(FIXTURE_EXPERT_REASONING_CORPUS.length >= 5);
    const intel = buildExpertStrategyCorpusFromFixtures();
    assert.equal(intel.writesToBrain, false);
    assert.equal(intel.activated, false);
    assert.equal(intel.promoted, false);
    assert.equal(intel.brainChanges, 0);
    assert.equal(intel.stream, "academy-evidence-stream-002");
    assert.ok(intel.candidates.length >= 1);
    assert.ok(intel.rejects.length >= 0);
    assert.ok(intel.corpus.emptyExtracted >= 1);
    assert.match(intel.outcome.answer, /yes_candidates_only|no_honest/);
  });

  it("program docs and report script exist", () => {
    const docs = readFileSync(join(root, "docs/KNOWLEDGE_EXPANSION_PROGRAM.md"), "utf8");
    assert.match(docs, /Epic 4/);
    assert.match(docs, /Expert Strategy Corpus/);
    const charter = readFileSync(join(root, "docs/ACADEMY_EVIDENCE_STREAM_002.md"), "utf8");
    assert.match(charter, /Elite Strategic Reasoning/);
    const page = readFileSync(join(root, "tests/knowledge/run-epic4-report.mjs"), "utf8");
    assert.match(page, /Strategic Knowledge Report/);
  });
});
