import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  buildPreChoiceCoaching,
  commissionFitForCandidate,
  explainRecommendedBadge,
} from "../app/strategy-build-comparison.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const JAY_NOTE =
  "Build me a Commander deck around Doubling Season Superfriends. I don't mind if it isn't the strongest version. I want the deck to feel like a true Superfriends deck where Doubling Season is one of the stars of the show.";

function walker(name) {
  return {
    quantity: 1,
    name,
    typeLine: `Legendary Planeswalker — ${name.split(",")[0].split(" ")[0]}`,
  };
}

function candidate(id, label, scores, rows) {
  return {
    id,
    label,
    evaluation: scores,
    boundary: "Native structural candidate.",
    strategicIntent: {
      commanders: [{ name: "Atraxa, Praetors' Voice" }],
      blueprint: { promises: ["+1/+1 counter growth"] },
    },
    rows: [
      {
        quantity: 1,
        name: "Atraxa, Praetors' Voice",
        typeLine: "Legendary Creature — Phyrexian Angel Horror",
        roles: ["commander"],
      },
      ...rows,
    ],
  };
}

describe("Founder Issue #025 — Commission-Aware Philosophy Comparison", () => {
  it("attributes commission fit to a specific philosophy, never inventing Brain imports", () => {
    const source = readFileSync(join(root, "app/strategy-build-comparison.mjs"), "utf8");
    assert.doesNotMatch(source, /native-masterwork-engine|package-plan-optimizer|prospective-slot-delta/);
    assert.match(source, /writesToBrain:\s*false/);
    assert.match(source, /commissionFitForCandidate/);
  });

  it("grades each philosophy against the same commission note", () => {
    const light = candidate(
      "resilience",
      "Resilient Temper",
      { cohesion: 88, resilience: 90, curveHealth: 80 },
      [
        { quantity: 1, name: "Doubling Season", typeLine: "Enchantment" },
        walker("Jace, the Mind Sculptor"),
        walker("Teferi, Hero of Dominaria"),
        walker("Narset Transcendent"),
      ],
    );
    const denser = candidate(
      "synergy",
      "Synergy Temper",
      { cohesion: 70, resilience: 64, curveHealth: 72 },
      [
        { quantity: 1, name: "Doubling Season", typeLine: "Enchantment" },
        walker("Jace, the Mind Sculptor"),
        walker("Teferi, Hero of Dominaria"),
        walker("Narset Transcendent"),
        walker("Chandra, Torch of Defiance"),
        walker("Nissa, Who Shakes the World"),
        walker("Liliana, Dreadhorde General"),
        walker("Garruk Wildspeaker"),
        walker("Elspeth, Knight-Errant"),
        walker("Ajani Goldmane"),
      ],
    );

    const lightFit = commissionFitForCandidate({
      note: JAY_NOTE,
      commanderName: "Atraxa, Praetors' Voice",
      candidate: light,
    });
    const denseFit = commissionFitForCandidate({
      note: JAY_NOTE,
      commanderName: "Atraxa, Praetors' Voice",
      candidate: denser,
    });

    assert.ok(lightFit);
    assert.ok(denseFit);
    assert.match(lightFit.headline, /%/);
    assert.ok(
      denseFit.matchPercent > lightFit.matchPercent,
      "denser Superfriends list should grade closer to the commission",
    );

    const report = buildPreChoiceCoaching({
      candidates: [light, denser],
      recommendedId: "resilience",
      commanderName: "Atraxa, Praetors' Voice",
      commissionNote: JAY_NOTE,
    });

    assert.equal(report.version, "pre-choice-coaching-v1.3");
    assert.equal(report.builds.length, 2);
    for (const build of report.builds) {
      assert.ok(build.commissionFit?.headline, `${build.label} must carry its own commission fit`);
    }
    const recommended = report.builds.find((build) => build.recommended);
    assert.match(
      recommended.recommendedWhy,
      /play structure|commission fit/i,
    );
    assert.match(
      recommended.recommendedWhy,
      /another option may stay closer|play structure/i,
    );
  });

  it("explains recommended as structure, commission fit, or both", () => {
    const both = explainRecommendedBadge([
      {
        recommended: true,
        scores: { cohesion: 90, resilience: 88, curveHealth: 84 },
        commissionFit: { matchPercent: 80 },
      },
      {
        recommended: false,
        scores: { cohesion: 70, resilience: 64, curveHealth: 72 },
        commissionFit: { matchPercent: 50 },
      },
    ]);
    assert.match(both, /play structure and closer commission fit/i);

    const structureOnly = explainRecommendedBadge([
      {
        recommended: true,
        scores: { cohesion: 90, resilience: 88, curveHealth: 84 },
        commissionFit: { matchPercent: 45 },
      },
      {
        recommended: false,
        scores: { cohesion: 70, resilience: 64, curveHealth: 72 },
        commissionFit: { matchPercent: 70 },
      },
    ]);
    assert.match(structureOnly, /another option may stay closer to your commission/i);

    const tied = explainRecommendedBadge([
      {
        recommended: true,
        scores: { cohesion: 90, resilience: 88, curveHealth: 84 },
        commissionFit: { matchPercent: 50 },
      },
      {
        recommended: false,
        scores: { cohesion: 70, resilience: 64, curveHealth: 72 },
        commissionFit: { matchPercent: 50 },
      },
    ]);
    assert.match(tied, /commission fit is tied/i);
    assert.doesNotMatch(tied, /closer commission fit/i);
  });

  it("wires per-philosophy commission fit into the choice screen", () => {
    const page = readFileSync(join(root, "app/page.tsx"), "utf8");
    const polish = readFileSync(join(root, "app/forge-polish.css"), "utf8");
    assert.match(page, /commissionNote:\s*note/);
    assert.match(page, /COMMISSION FIT · THIS PHILOSOPHY/);
    assert.match(page, /pre-choice-recommended-why/);
    assert.match(page, /score is never shared across options/);
    assert.match(polish, /\.pre-choice-commission-fit\b/);
    assert.match(polish, /\.pre-choice-recommended-why\b/);
  });
});
