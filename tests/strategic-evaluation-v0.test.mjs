import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  evaluateStrategicDecision,
  evaluateCutAddRecommendation,
} from "../app/strategic-evaluation.mjs";
import { explainRecommendationWhy } from "../app/honest-coach-summary.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("Strategic Evaluation v0", () => {
  it("does not mutate Brain and is judgment not construction", () => {
    const source = readFileSync(join(root, "app/strategic-evaluation.mjs"), "utf8");
    assert.match(source, /writesToBrain:\s*false/);
    assert.match(source, /Does NOT pick cards/);
    assert.doesNotMatch(source, /forgeNativeMasterwork|chooseSpells|prospectiveSlotDelta/);
  });

  it("evaluates a cut/add decision with pros, cons, tradeoff, confidence", () => {
    const evaluation = evaluateStrategicDecision({
      decision: {
        kind: "cut_add",
        cut: "Smothering Tithe",
        add: "Swan Song",
      },
      commission: {
        fantasyLabel: "Superfriends",
        priorities: ["theme", "planeswalkers"],
      },
      commanderName: "Atraxa, Praetors' Voice",
      selected: {
        slotJustificationLedger: {
          byName: {
            "smothering tithe": {
              name: "Smothering Tithe",
              flags: { rawPowerDominant: true },
            },
          },
        },
      },
    });
    assert.equal(evaluation.ok, true);
    assert.equal(evaluation.kind, "StrategicEvaluation");
    assert.equal(evaluation.brainInheritance, "none");
    assert.ok(evaluation.pros.length >= 1);
    assert.ok(evaluation.cons.length >= 1);
    assert.ok(evaluation.strategicTradeoff.length >= 1);
    assert.ok(evaluation.confidence.level);
    assert.match(evaluation.coachVoice.paragraph, /Evaluating/i);
    assert.ok(evaluation.alternatives.some((a) => /Counterspell/i.test(a.card)));
    assert.match(evaluation.designForFutureGameplay.question, /in-game decision/i);
    assert.equal(evaluation.conceptsCited[0]?.name, "Plan Integrity");
    assert.ok(evaluation.conceptsCited.some((c) => c.name === "Commitment Timing"));
    assert.match(evaluation.coachVoice.paragraph, /Concept: Plan Integrity/);
  });

  it("explainRecommendationWhy can attach strategic evaluation", () => {
    const why = explainRecommendationWhy({
      cut: "Smothering Tithe",
      add: "Swan Song",
      commanderName: "Atraxa, Praetors' Voice",
      commission: { fantasyLabel: "Superfriends", priorities: ["theme"] },
      selected: {
        slotJustificationLedger: {
          byName: {
            "smothering tithe": { flags: { weaklyJustified: true } },
          },
        },
      },
      includeStrategicEvaluation: true,
    });
    assert.ok(why.strategicEvaluation?.ok);
    assert.equal(why.strategicEvaluation.decision.cut, "Smothering Tithe");
  });

  it("cut-add helper matches evaluateStrategicDecision shape", () => {
    const evaluation = evaluateCutAddRecommendation({
      cut: "Sol Ring",
      add: "Arcane Signet",
      commanderName: "Kinnan, Bonder Prodigy",
    });
    assert.equal(evaluation.decision.kind, "cut_add");
    assert.equal(evaluation.writesToBrain, false);
  });
});
