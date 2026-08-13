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

  it("explains why a lone survivor lived without Compare details", () => {
    const report = buildPreChoiceCoaching({
      candidates: [
        candidate(
          "resilience",
          "Resilient Temper",
          { cohesion: 70, resilience: 88, curveHealth: 68 },
          ["Sol Ring", "Counterspell"],
        ),
      ],
      recommendedId: "resilience",
    });
    assert.equal(report.alone, true);
    assert.equal(report.builds[0].alone, true);
    assert.match(report.builds[0].whySurvived, /longer games|interaction/i);
    assert.doesNotMatch(report.builds[0].whySurvived, /Prioritized consistency/i);
  });

  it("wires Pre-Choice Coaching into the masterworks chamber", () => {
    const page = [
      readFileSync(join(root, "app/page.tsx"), "utf8"),
      readFileSync(join(root, "app/components/forge/philosophy-compare.tsx"), "utf8"),
    ].join("\n");
    const polish = readFileSync(join(root, "app/forge-polish.css"), "utf8");
    const anvil = readFileSync(join(root, "app/testing-anvil.css"), "utf8");
    const contract = readFileSync(join(root, "docs/CONVERSATION_CONTRACT.md"), "utf8");
    assert.match(page, /PRE-CHOICE COACHING|HERE ARE THE PHILOSOPHIES|CHOOSE YOUR EXPERIENCE/);
    assert.match(page, /BUILT FOR PLAYERS WHO|BEST FIT FOR YOU/);
    assert.match(page, /EXPECTED TRADEOFF|TRADEOFF/);
    assert.match(page, /whySurvived|whyBuilt/);
    assert.match(page, /One experience made the cut/);
    assert.match(page, /Compare details|Compare both|Compare all three/);
    assert.match(page, /1 · I HEARD YOU/);
    assert.match(page, /I heard you asking for|You asked for/);
    assert.match(page, /Choose the way you want to experience this commander|Does this experience fit how you want to play|Choose how you want this deck to play/);
    assert.match(page, /This is how I want to play|Choose \$\{build\.label\}/);
    assert.doesNotMatch(page, /\(pendingCandidateChoice\.nativeReport\.candidates\?\.length \|\| 1\) > 1 && \(/);
    assert.match(page, /masterworksRequestRecognition|buildRequestRecognition/);
    assert.match(page, /How do you know\?/);
    // Player Surface Law: research voice stays off the default philosophy card.
    assert.doesNotMatch(page, /build\.currentUnderstanding\?\.paragraph/);
    assert.doesNotMatch(page, /build\.principleUnderstanding\?\.paragraph/);
    assert.match(page, /VERDICT|WHAT STILL NEEDS WORK/);
    assert.match(page, /YOUR COACH/);
    assert.match(page, /honest-coach-brief-stream/);
    assert.match(page, /WHY · OPENING PRIORITIES|intentions\.establish/);
    assert.doesNotMatch(page, /honest-coach-priority-grid/);
    assert.doesNotMatch(page, /HONEST COACH · BRAIN v1/);
    assert.doesNotMatch(page, /watchingVoice\?\.paragraph/);
    assert.doesNotMatch(page, /principleVoice\?\.paragraph/);
    assert.doesNotMatch(page, /WHAT MAKES IT RUN/);
    assert.match(contract, /Player Surface Law/);
    assert.match(contract, /Verdict → Change → Why/);
    assert.match(polish, /\.pre-choice-built-for\b/);
    assert.match(polish, /\.pre-choice-why-survived\b/);
    assert.match(anvil, /\.request-recognition-checklist\b/);
    assert.match(anvil, /\.honest-coach-brief-stream\b/);
  });
});
