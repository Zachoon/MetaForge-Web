import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildHonestCoachConceptVoice,
  buildPhilosophyConceptVoice,
  buildSessionConceptVoice,
  presentAsConceptStance,
  selectRelevantConcepts,
} from "../app/concept-stance-voice.mjs";
import { buildSessionStanceVoice } from "../app/strategic-stance-voice.mjs";
import { buildPreChoiceCoaching } from "../app/strategy-build-comparison.mjs";
import { buildHonestCoachSummary } from "../app/honest-coach-summary.mjs";
import { buildStrategicConceptLibrary } from "../app/knowledge/strategic-concept.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("Era 2.1 — Concept Stance voice", () => {
  it("is a voice not a Strategic Concepts section and never mutates Brain", () => {
    const source = readFileSync(join(root, "app/concept-stance-voice.mjs"), "utf8");
    assert.match(source, /Stance is a VOICE/);
    assert.match(source, /Request Recognition must never/);
    assert.doesNotMatch(source, /forgeNativeMasterwork|chooseSpells/);
  });

  it("presents emerging concepts with current-understanding hedges", () => {
    const concept = buildStrategicConceptLibrary().byId["commitment-timing"];
    const stance = presentAsConceptStance(concept);
    assert.equal(stance.kind, "ConceptStance");
    assert.match(stance.statement, /Current understanding suggests/i);
    assert.equal(stance.brainInheritance, "none");
    assert.ok(stance.whatWouldChangeOurMind.length >= 1);
  });

  it("selects Plan Integrity for theme commissions and Commitment Timing for interaction language", () => {
    const [theme] = selectRelevantConcepts({
      fantasyLabel: "Doubling Season Superfriends",
      priorities: ["theme", "planeswalkers"],
      limit: 1,
    });
    assert.equal(theme.id, "plan-integrity");

    const [interact] = selectRelevantConcepts({
      fantasyLabel: "Control",
      priorities: ["interaction", "permission"],
      limit: 1,
    });
    assert.equal(interact.id, "commitment-timing");
  });

  it("session concept voice keeps concepts out of request recognition", () => {
    const session = buildSessionConceptVoice({
      fantasyLabel: "Superfriends",
      priorities: ["theme"],
    });
    assert.equal(session.requestRecognition.includeConcepts, false);
    assert.ok(session.philosophy?.paragraph);
    assert.equal(session.honestCoach.label, "One principle we're watching");
    assert.ok(session.deepForge.entries.length >= 1);
  });

  it("merged session stance voice excludes both hypotheses and concepts from recognition", () => {
    const session = buildSessionStanceVoice({
      commanderName: "Atraxa, Praetors' Voice",
      fantasyLabel: "Superfriends",
      priorities: ["theme"],
    });
    assert.equal(session.requestRecognition.includeHypotheses, false);
    assert.equal(session.requestRecognition.includeConcepts, false);
    assert.ok(session.philosophyConcept?.paragraph || session.honestCoachConcept?.paragraph);
  });

  it("pre-choice coaching exposes principleUnderstanding without a Concepts panel title", () => {
    const coaching = buildPreChoiceCoaching({
      commanderName: "Atraxa, Praetors' Voice",
      fantasyLabel: "Superfriends",
      priorities: ["theme"],
      candidates: [
        {
          id: "a",
          label: "Theme Masterwork",
          evaluation: { cohesion: 70, resilience: 72, curveHealth: 68 },
          rows: [{ name: "Doubling Season", typeLine: "Enchantment" }],
        },
      ],
      recommendedId: "a",
    });
    assert.ok(coaching.builds[0].principleUnderstanding?.paragraph);
    assert.match(coaching.builds[0].principleUnderstanding.paragraph, /Current understanding suggests/i);
    assert.doesNotMatch(coaching.builds[0].principleUnderstanding.paragraph, /Strategic Concepts/i);
  });

  it("honest coach summary exposes principleVoice and deepForgePrinciples", () => {
    const summary = buildHonestCoachSummary({
      activeCommanderName: "Atraxa, Praetors' Voice",
      commission: { fantasyLabel: "Superfriends", priorities: ["theme"] },
      selected: {
        strategicIntent: {
          commanders: [{ name: "Atraxa, Praetors' Voice" }],
          packages: [{ label: "Planeswalker Engine" }],
        },
        rows: [{ name: "Doubling Season", typeLine: "Enchantment" }],
      },
    });
    assert.ok(summary.principleVoice?.paragraph);
    assert.equal(summary.principleVoice.label, "One principle we're watching");
    assert.ok(summary.deepForgePrinciples?.entries?.length >= 1);
  });
});
