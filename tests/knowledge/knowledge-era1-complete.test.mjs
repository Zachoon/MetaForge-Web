import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateStrategicDecision } from "../../app/strategic-evaluation.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("Knowledge Era 1 Complete", () => {
  it("marks evaluation complete without Brain inheritance", () => {
    const charter = readFileSync(join(root, "docs/KNOWLEDGE_ERA1_COMPLETE.md"), "utf8");
    assert.match(charter, /Knowledge Era 1 — Complete/i);
    assert.match(charter, /Brain waits|Brain inheritance/i);
    assert.match(charter, /writesToBrain:\s*false/);
  });

  it("keeps Strategic Evaluation as judgment not construction", () => {
    const evaluation = evaluateStrategicDecision({
      decision: { kind: "cut_add", cut: "Smothering Tithe", add: "Swan Song" },
      commission: { fantasyLabel: "Superfriends", priorities: ["theme"] },
      commanderName: "Atraxa, Praetors' Voice",
    });
    assert.equal(evaluation.ok, true);
    assert.equal(evaluation.brainInheritance, "none");
    assert.equal(evaluation.writesToBrain, false);
  });
});
