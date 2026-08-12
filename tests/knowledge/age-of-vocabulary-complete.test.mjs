import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildAtlasVocabularyRegistry } from "../../app/knowledge/atlas-vocabulary.mjs";
import { buildMentorShadowReport } from "../../app/knowledge/mentor-shadow.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("Age of Vocabulary Complete", () => {
  it("charters engineering complete without Brain v2 embodiment", () => {
    const charter = readFileSync(join(root, "docs/AGE_OF_VOCABULARY_COMPLETE.md"), "utf8");
    assert.match(charter, /Engineering Complete/i);
    assert.match(charter, /0 admitted|Capability admissions:\s*0/i);
    assert.doesNotMatch(charter, /Brain v2 complete/i);
  });

  it("Atlas registry + Mentor shadow stay construction-inert", () => {
    const registry = buildAtlasVocabularyRegistry();
    const mentor = buildMentorShadowReport({
      cardNames: ["Teferi's Protection", "Doubling Season"],
      commanderName: "Atraxa, Praetors' Voice",
      fantasyLabel: "Superfriends",
      commissionMismatch: true,
    });
    assert.equal(registry.writesToBrain, false);
    assert.equal(mentor.writesToBrain, false);
    assert.ok(mentor.explanations.length >= 1);
    assert.match(mentor.explanations[0].paragraph, /Teferi's Protection|seat|Insurance/i);
  });
});
