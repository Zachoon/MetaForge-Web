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

// Mirrors the fields native-masterwork-engine.mjs actually attaches to a
// real candidate row (roles from classifyNativeCard, blueprintMechanicHits
// from blueprint-note-and-mana.mjs) — the fixture above only ever carries
// typeLine, so it can never exercise the grounded-copy path this covers.
function taggedRow(name, { roles = [], blueprintMechanicHits = [] } = {}) {
  return { quantity: 1, name, typeLine: "Creature", roles, blueprintMechanicHits };
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

  it("grounds identity copy in this deck's real cards and tags, not a static per-temper template", () => {
    const commonRows = [
      { quantity: 1, name: "Sol Ring", typeLine: "Artifact", roles: ["ramp"] },
      { quantity: 1, name: "Arcane Signet", typeLine: "Artifact", roles: ["ramp"] },
    ];
    const resilient = {
      id: "resilience",
      label: "Resilient Temper",
      evaluation: { cohesion: 70, resilience: 88, curveHealth: 68 },
      rows: [
        ...commonRows,
        taggedRow("Counterspell", { roles: ["interaction"] }),
        taggedRow("Cyclonic Rift", { roles: ["interaction", "sweeper"] }),
      ],
    };
    const synergy = {
      id: "cohesion",
      label: "Synergy Temper",
      evaluation: { cohesion: 90, resilience: 64, curveHealth: 72 },
      rows: [
        ...commonRows,
        taggedRow("Skullclamp", { roles: ["draw"], blueprintMechanicHits: ["aristocrats"] }),
        taggedRow("Goblin Bombardment", { roles: ["sacrifice"], blueprintMechanicHits: ["aristocrats"] }),
      ],
    };

    const report = buildPreChoiceCoaching({
      candidates: [resilient, synergy],
      recommendedId: "resilience",
    });
    const recommended = report.builds.find((build) => build.recommended);
    const alternative = report.builds.find((build) => !build.recommended);
    const genericFeel = identityForLabel("Resilient Temper").feel;
    const genericPrioritizes = identityForLabel("Resilient Temper").prioritizes;

    // Grounded, not the static per-temper template.
    assert.notEqual(recommended.feel, genericFeel);
    assert.notDeepEqual([...recommended.prioritizes], [...genericPrioritizes]);
    // Names a real card actually unique to this build (from keyDifferences).
    assert.match(recommended.feel, /Counterspell|Cyclonic Rift/);
    // The two builds' identity copy differs from each other — this is the
    // exact bug report: identical boilerplate regardless of what's in the
    // deck. "Synergy Temper" carries a real blueprint mechanic tag
    // (aristocrats) that resilient's cards don't, so its copy should
    // reflect that specific mechanic rather than a shared generic phrase.
    assert.notEqual(recommended.feel, alternative.feel);
    assert.notDeepEqual([...recommended.prioritizes], [...alternative.prioritizes]);
    assert.match(alternative.feel, /Skullclamp|Goblin Bombardment/);
    assert.match(alternative.prioritizes.join(" "), /sacrifice and death payoffs/i);
    // Cards shared by both builds (Sol Ring, Arcane Signet) never appear as
    // "what sets this apart" — only the real keyDifferences pool does.
    assert.doesNotMatch(recommended.feel, /Sol Ring|Arcane Signet/);
  });

  it("falls back honestly to the generic per-temper voice when a candidate carries no diff or tag data", () => {
    // Identical decks: keyDifferences is empty by construction, so there is
    // nothing real to ground copy in — must stay honestly generic rather
    // than inventing a distinction that isn't there.
    const rows = [taggedRow("Sol Ring", { roles: ["ramp"] })];
    const report = buildPreChoiceCoaching({
      candidates: [
        { id: "a", label: "Resilient Temper", evaluation: { cohesion: 70, resilience: 88, curveHealth: 68 }, rows },
        { id: "b", label: "Resilient Temper", evaluation: { cohesion: 70, resilience: 88, curveHealth: 68 }, rows },
      ],
      recommendedId: "a",
    });
    const identity = identityForLabel("Resilient Temper");
    const recommended = report.builds.find((build) => build.recommended);
    assert.equal(recommended.feel, identity.feel);
    assert.deepEqual([...recommended.prioritizes], [...identity.prioritizes]);
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
