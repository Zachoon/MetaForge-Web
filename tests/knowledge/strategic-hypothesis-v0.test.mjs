import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createStrategicHypothesis,
  deriveStrategicHypothesesV0,
  presentAsStrategicStance,
} from "../../app/knowledge/strategic-hypothesis.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("Strategic Hypothesis v0", () => {
  it("does not import Brain mutators and stays unpromoted", () => {
    const source = readFileSync(join(root, "app/knowledge/strategic-hypothesis.mjs"), "utf8");
    assert.match(source, /writesToBrain:\s*false/);
    assert.match(source, /brainInheritance/);
    assert.doesNotMatch(source, /forgeNativeMasterwork|chooseSpells|prospectiveSlotDelta/);
  });

  it("hypotheses are falsifiable objects with prediction + retirement", () => {
    const hyp = createStrategicHypothesis({
      id: "hyp-test",
      claim: "Converters emphasize interaction more than Brain priors.",
      state: "emerging",
      evidence: { tournament: "medium", shadow: "mixed" },
      prediction: {
        windowDays: 90,
        expectToObserve: ["higher interaction density among converters"],
      },
      retirementCriteria: ["Fails holdout over next 60 days"],
    });
    assert.equal(hyp.kind, "StrategicHypothesis");
    assert.equal(hyp.promoted, false);
    assert.equal(hyp.brainInheritance, "none");
    assert.ok(hyp.prediction.expectToObserve.length >= 1);
    assert.ok(hyp.retirementCriteria.length >= 1);

    const stance = presentAsStrategicStance(hyp);
    assert.equal(stance.kind, "StrategicStance");
    assert.match(stance.statement, /Current understanding suggests/i);
    assert.ok(stance.coachMustNotSay.some((s) => /definitely correct/i.test(s)));
  });

  it("derives a capped v0 bundle from live-shaped intelligence", () => {
    const bundle = deriveStrategicHypothesesV0({
      liveIntelligence: {
        label: "test-live",
        corpus: { decks: 100, events: 20 },
        commanderProfiles: [
          {
            commanderIdentity: "Kinnan, Bonder Prodigy",
            sampleSize: 25,
            independentEvents: 19,
            confidence: { level: "high", score: 0.85 },
          },
        ],
        strongestReplicatedObservations: [
          {
            commanderIdentity: "Ral, Monsoon Mage // Ral, Leyline Prodigy",
            observation: "Primary plan spellslinger replicated in 16/16 decks",
            confidence: "high",
          },
          {
            commanderIdentity: "Kinnan, Bonder Prodigy",
            observation: "Primary plan role:threat replicated in 17/25 decks",
            confidence: "high",
          },
        ],
        contradictions: [
          {
            commanderIdentity: "Kinnan, Bonder Prodigy",
            text: "Competing primary plans observed: role:threat vs role:artifacts",
          },
        ],
      },
      shadowLive: {
        sample: [
          {
            feature: "interactionDensity",
            classification: "brain_underweights",
            confidence: 0.45,
            note: "converters show more interaction",
          },
        ],
      },
      expertCorpus: {
        candidates: [
          {
            conceptId: "sequencing",
            label: "sequencing",
            independentExperts: 3,
            authors: ["a", "b", "c"],
          },
        ],
      },
      limit: 5,
    });
    assert.equal(bundle.writesToBrain, false);
    assert.ok(bundle.hypotheses.length >= 3);
    assert.ok(bundle.hypotheses.length <= 5);
    assert.equal(bundle.stances.length, bundle.hypotheses.length);
    assert.ok(bundle.hypotheses.every((h) => h.prediction && h.retirementCriteria.length));
    assert.ok(bundle.pipeline.includes("Strategic Hypotheses"));
    assert.ok(bundle.pipeline.includes("Strategic Stance (product presentation)"));
  });

  it("observatory report script exists", () => {
    const page = readFileSync(join(root, "tests/knowledge/run-strategic-hypothesis-v0.mjs"), "utf8");
    assert.match(page, /Strategic Observatory/);
    assert.match(page, /What would change my mind/);
    if (existsSync(join(root, "docs/KNOWLEDGE_EXPANSION_PROGRAM.md"))) {
      const docs = readFileSync(join(root, "docs/KNOWLEDGE_EXPANSION_PROGRAM.md"), "utf8");
      assert.match(docs, /Strategic Hypothesis/);
    }
  });
});
