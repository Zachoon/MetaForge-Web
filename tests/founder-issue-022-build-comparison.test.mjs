import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  buildPreChoiceCoaching,
  buildStrategyBuildComparison,
  identityForLabel,
} from "../app/strategy-build-comparison.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function candidate(id, label, scores, cards) {
  return {
    id,
    label,
    evaluation: scores,
    boundary: "Native structural candidate.",
    rows: cards.map((name) => ({ quantity: 1, name, typeLine: "Creature" })),
  };
}

describe("Founder Issue #022 — Pre-Choice Coaching", () => {
  it("leads with identity / tradeoff voice, not scores", () => {
    const identity = identityForLabel("Resilient Temper");
    assert.match(identity.builtForPlayersWho, /survive interaction|longer games/i);
    assert.ok(Array.isArray(identity.prioritizes));
    assert.match(identity.expectedTradeoff, /later|slower|explosive/i);

    const report = buildPreChoiceCoaching({
      candidates: [
        candidate(
          "resilience",
          "Resilient Temper",
          { cohesion: 70, resilience: 88, curveHealth: 68 },
          ["Sol Ring", "Counterspell", "Cyclonic Rift"],
        ),
        candidate(
          "cohesion",
          "Synergy Temper",
          { cohesion: 90, resilience: 64, curveHealth: 72 },
          ["Sol Ring", "Goldspan Dragon", "Jeska's Will"],
        ),
      ],
      recommendedId: "resilience",
    });

    assert.equal(report.writesToBrain, false);
    assert.match(report.principle, /before asking them to commit/i);
    assert.match(report.version, /^pre-choice-coaching-v1/);
    const recommended = report.builds.find((build) => build.recommended);
    assert.equal(recommended.builtForPlayersWho, identity.builtForPlayersWho);
    assert.deepEqual([...recommended.prioritizes], [...identity.prioritizes]);
    assert.ok(recommended.feel);
    assert.ok(recommended.expectedTradeoff);
  });

  it("keeps Compare Details as the power-user layer", () => {
    const report = buildStrategyBuildComparison({
      candidates: [
        candidate("resilience", "Resilient Temper", { cohesion: 70, resilience: 88, curveHealth: 68 }, ["Counterspell"]),
        candidate("cohesion", "Synergy Temper", { cohesion: 90, resilience: 64, curveHealth: 72 }, ["Goldspan Dragon"]),
      ],
      recommendedId: "resilience",
    });
    const alternate = report.builds.find((build) => !build.recommended);
    assert.ok(alternate.fullComparison.adds.length || alternate.fullComparison.cuts.length);
  });

  it("wires Pre-Choice Coaching into the masterworks chamber", () => {
    const page = readFileSync(join(root, "app/page.tsx"), "utf8");
    const polish = readFileSync(join(root, "app/forge-polish.css"), "utf8");
    const anvil = readFileSync(join(root, "app/testing-anvil.css"), "utf8");
    assert.match(page, /PRE-CHOICE COACHING|HERE ARE THE PHILOSOPHIES/);
    assert.match(page, /BUILT FOR PLAYERS WHO/);
    assert.match(page, /EXPECTED TRADEOFF/);
    assert.match(page, /Compare details/);
    assert.match(page, /1 · I HEARD YOU/);
    assert.match(page, /I heard you asking for|You asked for/);
    assert.match(page, /Choose the way you want to experience this commander|Does this experience fit how you want to play/);
    assert.match(page, /This is how I want to play/);
    assert.doesNotMatch(page, /\(pendingCandidateChoice\.nativeReport\.candidates\?\.length \|\| 1\) > 1 && \(/);
    assert.match(page, /masterworksRequestRecognition|buildRequestRecognition/);
    assert.match(page, /How do you know\?/);
    assert.match(polish, /\.pre-choice-built-for\b/);
    assert.match(anvil, /\.request-recognition-checklist\b/);
  });
});
