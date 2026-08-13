import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  buildRequestRecognition,
  detectRequestedThemes,
} from "../app/request-recognition.mjs";
import { buildHonestCoachSummary } from "../app/honest-coach-summary.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function jaySelected() {
  return {
    evaluation: { cohesion: 78, resilience: 72, roleCoverage: 0.7 },
    strategicIntent: {
      strategy: "Focused",
      packages: [{ id: "tokens", label: "Tokens package" }],
      blueprint: { promises: ["+1/+1 counter growth"] },
      commanders: [{ name: "Atraxa, Praetors' Voice" }],
    },
    strategicCohesionGate: { ok: true },
    slotJustificationLedger: { critique: { weaklyJustified: [] } },
    rows: [
      { name: "Atraxa, Praetors' Voice", quantity: 1, roles: ["commander"], typeLine: "Legendary Creature — Phyrexian Angel Horror" },
      { name: "Doubling Season", quantity: 1, typeLine: "Enchantment" },
      { name: "Jace, the Mind Sculptor", quantity: 1, typeLine: "Legendary Planeswalker — Jace" },
      { name: "Teferi, Hero of Dominaria", quantity: 1, typeLine: "Legendary Planeswalker — Teferi" },
      { name: "Narset Transcendent", quantity: 1, typeLine: "Legendary Planeswalker — Narset" },
      { name: "Chandra, Torch of Defiance", quantity: 1, typeLine: "Legendary Planeswalker — Chandra" },
      { name: "Sol Ring", quantity: 1, typeLine: "Artifact" },
    ],
  };
}

describe("Founder Issue #023 — Intent vs Recommendation Transparency", () => {
  it("detects Superfriends and Doubling Season from the commission note", () => {
    const themes = detectRequestedThemes("Doubling Season + Superfriends");
    assert.ok(themes.some((theme) => theme.id === "superfriends"));
    assert.ok(themes.some((theme) => theme.id === "doubling_season"));
  });

  it("detects theme-over-optimization preference language", () => {
    const themes = detectRequestedThemes(
      "Doubling Season + Superfriends — theme over optimization please",
    );
    assert.ok(themes.some((theme) => theme.id === "theme_priority"));
  });

  it("explains light planeswalker density without judging the idea", () => {
    const report = buildRequestRecognition({
      note: "Doubling Season + Superfriends please",
      selected: jaySelected(),
    });

    assert.equal(report.writesToBrain, false);
    assert.match(report.principle, /never silently changes/i);
    assert.ok(report.heard.some((theme) => theme.id === "superfriends"));
    assert.ok(report.heard.some((theme) => theme.id === "doubling_season" && theme.status === "present"));
    assert.equal(report.evidence.planeswalkers, 4);
    assert.ok(report.adjustments.length >= 1);
    assert.match(report.adjustments[0].reason, /planeswalker|walker/i);
    assert.ok(report.adjustments[0].reason.length < 160);
    assert.doesNotMatch(report.adjustments[0].reason, /\byour idea is bad\b/i);
    assert.ok(Number.isFinite(report.fidelity.themeFidelity));
    assert.ok(Number.isFinite(report.fidelity.competitiveHealth));
  });

  it("does not invent themes that were not requested", () => {
    const report = buildRequestRecognition({
      note: "Make a solid midrange list",
      selected: jaySelected(),
    });
    assert.ok(!report.heard.some((theme) => theme.id === "superfriends"));
    assert.equal(report.adjustments.filter((entry) => entry.themeId === "superfriends").length, 0);
  });

  it("wires Request Recognition through Honest Coach", () => {
    const summary = buildHonestCoachSummary({
      selected: jaySelected(),
      commissionNote: "Doubling Season + Superfriends",
      activeCommanderName: "Atraxa, Praetors' Voice",
      deckCardNames: jaySelected().rows.map((row) => row.name),
    });
    assert.equal(summary.version, "honest-coach-v0.9");
    assert.ok(summary.requestRecognition?.heard?.length);
    assert.ok(summary.fieldsUsed.includes("commissionNote (request recognition #023)"));
  });

  it("surfaces Request Recognition in the coach UI + CSS", () => {
    const page = readFileSync(join(root, "app/page.tsx"), "utf8");
    const css = readFileSync(join(root, "app/testing-anvil.css"), "utf8");
    assert.match(page, /1 · I HEARD YOU/);
    assert.match(page, /requestRecognition/);
    assert.match(page, /masterworksRequestRecognition/);
    assert.match(page, /How do you know\? → Deep Forge evidence/);
    assert.match(css, /\.request-recognition\b/);
  });

  it("surfaces a blueprint-missed adjustment using the engine's own boundary explanation", () => {
    const report = buildRequestRecognition({
      note: "",
      selected: {
        ...jaySelected(),
        blueprintAlignment: {
          status: "missed-supported-blueprint",
          boundary: "Blueprint contract reserved 8/12 required identity cards before general optimization; legality and minimum deck function remained binding.",
        },
      },
    });
    const adjustment = report.adjustments.find((entry) => entry.id === "blueprint-missed");
    assert.ok(adjustment, `expected a blueprint-missed adjustment, got: ${JSON.stringify(report.adjustments)}`);
    assert.equal(adjustment.reason, "Blueprint contract reserved 8/12 required identity cards before general optimization; legality and minimum deck function remained binding.");
  });

  it("never surfaces a blueprint-missed adjustment when the blueprint was honored", () => {
    const report = buildRequestRecognition({
      note: "",
      selected: {
        ...jaySelected(),
        blueprintAlignment: { status: "honored-best-effort", boundary: "Should never be read." },
      },
    });
    assert.equal(report.adjustments.some((entry) => entry.id === "blueprint-missed"), false);
  });
});
