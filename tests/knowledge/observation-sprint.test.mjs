import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("Observation Sprint — Post Era 3", () => {
  it("closes shippable observation phases without claiming Era 4 Complete or Brain", () => {
    const sprint = readFileSync(join(root, "docs/OBSERVATION_SPRINT.md"), "utf8");
    const era4 = readFileSync(join(root, "docs/ERA4_INSIGHT_FOUNDING.md"), "utf8");
    assert.match(sprint, /Knowledge Era 1 Complete/);
    assert.match(sprint, /Age of Vocabulary Complete/);
    assert.match(sprint, /Stream 002/);
    assert.match(sprint, /Mentor Shadow/);
    assert.match(sprint, /Era 4 Insight \*\*Founding\*\*/);
    assert.match(era4, /\*\*Status:\*\* founded · \*\*not complete\*\*/i);
    assert.match(era4, /Can it teach an expert something/);
    assert.match(era4, /Declaring Era 4 Complete from elegance/);
  });
});
