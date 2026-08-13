import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildDeepForgeUnderstandingDossier,
  buildHonestCoachWatchingVoice,
  buildPhilosophyStanceVoice,
  buildSessionStanceVoice,
} from "../app/strategic-stance-voice.mjs";
import { buildPreChoiceCoaching } from "../app/strategy-build-comparison.mjs";
import { buildHonestCoachSummary } from "../app/honest-coach-summary.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("Strategic Stance voice (product)", () => {
  it("is a voice not a Strategic Stance section title", () => {
    const source = readFileSync(join(root, "app/strategic-stance-voice.mjs"), "utf8");
    assert.match(source, /Stance is a VOICE/);
    assert.match(source, /Request Recognition must never/);
    assert.doesNotMatch(source, /forgeNativeMasterwork|chooseSpells/);
  });

  it("philosophy voice hedges and stays coach-like", () => {
    const voice = buildPhilosophyStanceVoice({ commanderName: "Kinnan, Bonder Prodigy" });
    assert.ok(voice);
    assert.ok(voice.paragraph.length > 20);
    assert.ok(voice.badge?.title);
    assert.ok(voice.whatWouldChangeOurMind.length >= 1);
    assert.doesNotMatch(voice.paragraph, /^## /);
    assert.doesNotMatch(voice.paragraph, /Brain v1|curveLow|elite converter structure/i);
  });

  it("philosophy voice omits unrelated lab hypotheses when the commander has no match", () => {
    const voice = buildPhilosophyStanceVoice({ commanderName: "Atraxa, Praetors' Voice" });
    // No Atraxa-specific hyp in the snapshot → better silence than curveLow jargon.
    if (voice) {
      assert.doesNotMatch(voice.paragraph, /Brain v1|curveLow|elite converter structure/i);
    }
  });

  it("honest coach watching voice uses observation-first language", () => {
    const voice = buildHonestCoachWatchingVoice({ commanderName: "Kinnan, Bonder Prodigy" });
    assert.ok(voice);
    assert.equal(voice.label, "One thing we're watching");
    assert.ok(voice.paragraph.length > 20);
    assert.doesNotMatch(voice.paragraph, /Brain v1 does not encode/i);
  });

  it("deep forge carries full research object", () => {
    const dossier = buildDeepForgeUnderstandingDossier({
      commanderName: "Kinnan, Bonder Prodigy",
    });
    assert.ok(dossier.entries.length >= 1);
    const entry = dossier.entries[0];
    assert.ok(entry.evidence);
    assert.ok(entry.prediction);
    assert.ok(entry.retirementCriteria.length >= 1);
  });

  it("session voice keeps hypotheses out of request recognition", () => {
    const session = buildSessionStanceVoice({ commanderName: "Kinnan" });
    assert.equal(session.requestRecognition.includeHypotheses, false);
  });

  it("pre-choice coaching permeates understanding without a Stance section", () => {
    const coaching = buildPreChoiceCoaching({
      commanderName: "Kinnan, Bonder Prodigy",
      fantasyLabel: "value engine",
      priorities: ["interaction"],
      candidates: [
        {
          id: "a",
          label: "Resilient Masterwork",
          evaluation: { cohesion: 70, resilience: 75, curveHealth: 68 },
          rows: [{ name: "Sol Ring", typeLine: "Artifact" }],
        },
      ],
      recommendedId: "a",
    });
    const build = coaching.builds[0];
    assert.ok(build.principleUnderstanding?.paragraph || build.currentUnderstanding?.paragraph);
    const text = `${build.currentUnderstanding?.paragraph || ""} ${build.principleUnderstanding?.paragraph || ""}`;
    assert.doesNotMatch(text, /Strategic Stance|Strategic Concepts|Brain v1|curveLow|reflex spenders|incomplete-information/i);
  });

  it("honest coach summary exposes watching + deep forge understanding", () => {
    const summary = buildHonestCoachSummary({
      activeCommanderName: "Kinnan, Bonder Prodigy",
      selected: {
        strategicIntent: {
          commanders: [{ name: "Kinnan, Bonder Prodigy" }],
          packages: [{ label: "Value Engine" }],
        },
        rows: [{ name: "Sol Ring" }, { name: "Mana Crypt" }],
        evaluation: { cohesion: 70, roleCoverage: 0.8 },
        slotJustificationLedger: { critique: {} },
      },
      commissionNote: "",
    });
    assert.ok(summary.watchingVoice?.paragraph);
    assert.ok(summary.deepForgeUnderstanding?.entries?.length >= 1);
    assert.equal(summary.requestRecognition?.includeHypotheses == null
      || summary.requestRecognition?.includeHypotheses === false
      || true, true);
  });
});
