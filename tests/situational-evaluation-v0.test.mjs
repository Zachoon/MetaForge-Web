import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createGameState, createStackObject } from "../app/gameplay/game-state-schema.mjs";
import {
  evaluateSituationalDecision,
  evaluateSituationalFixture,
  situationalEvaluationToHypothesis,
} from "../app/gameplay/situational-evaluation.mjs";
import { SITUATIONAL_FIXTURES_V0 } from "../app/gameplay/fixtures/situational-v0.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("Era 2 — Situational Strategic Evaluation v0.1", () => {
  it("does not mutate Brain and is not a rules engine", () => {
    const source = readFileSync(join(root, "app/gameplay/situational-evaluation.mjs"), "utf8");
    assert.match(source, /writesToBrain:\s*false/);
    assert.match(source, /Judgment without construction/);
    assert.doesNotMatch(source, /forgeNativeMasterwork|chooseSpells|prospectiveSlotDelta/);
  });

  it("marks incomplete zones instead of inventing empty-board truth", () => {
    const state = createGameState({
      players: [{ seat: "you", name: "You", life: 40 }],
    });
    assert.equal(state.writesToBrain, false);
    assert.equal(state.knownVsUnknown.opponentHands, "unknown");
    assert.equal(state.knownVsUnknown.stack, "unknown");
    assert.ok(state.modelCompleteness.incomplete.includes("stack"));
    assert.match(state.modelCompleteness.note, /Unknown is not absent/i);
  });

  it("records known stack top when stack is authored", () => {
    const state = createGameState({
      players: [
        { seat: "you", life: 40, handSize: 3, hasInteractionOpen: true },
        { seat: "left", life: 40, handSize: 2, hasInteractionOpen: false },
      ],
      stack: [createStackObject({ spell: "Demonic Tutor", terminalThreat: false })],
      knownHands: false,
    });
    assert.equal(state.knownVsUnknown.stack, "known");
    assert.equal(state.stackTop.spell, "Demonic Tutor");
    assert.equal(state.stackTop.terminalThreat, false);
  });

  it("refuses when fewer than two lines are supplied", () => {
    const evaluation = evaluateSituationalDecision({
      state: SITUATIONAL_FIXTURES_V0[0].state,
      lines: [SITUATIONAL_FIXTURES_V0[0].lines[0]],
      chosenId: "hold-permission",
    });
    assert.equal(evaluation.ok, false);
    assert.equal(evaluation.reason, "needs_context");
  });

  it("evaluates the hold-permission fixture with inspectable judgment", () => {
    const evaluation = evaluateSituationalFixture(SITUATIONAL_FIXTURES_V0[0]);
    assert.equal(evaluation.ok, true);
    assert.equal(evaluation.era, 2);
    assert.equal(evaluation.brainInheritance, "none");
    assert.equal(evaluation.decision.chosenId, "hold-permission");
    assert.ok(evaluation.pros.length >= 1);
    assert.ok(evaluation.cons.length >= 1);
    assert.ok(evaluation.hypothesis?.kind === "StrategicHypothesis");
    assert.equal(evaluation.hypothesis.brainInheritance, "none");
    assert.equal(evaluation.concept.name, "Commitment Timing");
    assert.equal(evaluation.teaches.implementation, "Threat Timing");
    assert.ok(
      evaluation.pros.every((p) => !/Converts existing position/i.test(p)),
      "hold line must not fire the convert branch via 'do not tap out'",
    );
  });

  it("evaluates the attack fixture and keeps 1v1 reasoner as witness only", () => {
    const evaluation = evaluateSituationalFixture(SITUATIONAL_FIXTURES_V0[1]);
    assert.equal(evaluation.ok, true);
    assert.equal(evaluation.decision.chosenId, "attack-left");
    if (evaluation.witness) {
      assert.match(evaluation.witness.note, /witness only/i);
    }
    assert.equal(evaluation.evidence.simulation, "none");
  });

  it("evaluates the stack-priority fixture as a respond decision", () => {
    const fixture = SITUATIONAL_FIXTURES_V0.find((f) => f.id === "fixture-counter-terminal-on-stack");
    const evaluation = evaluateSituationalFixture(fixture);
    assert.equal(evaluation.ok, true);
    assert.equal(evaluation.decision.chosenId, "counter-terminal");
    assert.equal(evaluation.decision.stackTop.spell, "Thassa's Oracle");
    assert.equal(evaluation.decision.stackTop.terminalThreat, true);
    assert.ok(evaluation.pros.some((p) => /terminal/i.test(p)));
    assert.match(evaluation.coachVoice.paragraph, /Stack top/i);
    assert.equal(evaluation.hypothesis.id, "gameplay:fixture-counter-terminal-on-stack");
  });

  it("evaluates non-terminal tutor timing: conserve interaction over reflex counter", () => {
    const fixture = SITUATIONAL_FIXTURES_V0.find((f) => f.id === "fixture-hold-counter-vs-dangerous-tutor");
    const evaluation = evaluateSituationalFixture(fixture);
    assert.equal(evaluation.ok, true);
    assert.equal(evaluation.decision.chosenId, "let-tutor-resolve");
    assert.equal(evaluation.decision.stackTop.spell, "Demonic Tutor");
    assert.equal(evaluation.decision.stackTop.terminalThreat, false);
    assert.equal(evaluation.decision.stackTop.enablesFutureTerminal, true);
    assert.equal(evaluation.decision.stackTop.threatClass, "tutor");
    assert.ok(evaluation.pros.some((p) => /non-terminal|Conserves interaction|threat timing/i.test(p)));
    assert.ok(evaluation.cons.some((p) => /future terminal|Uncertainty|dangerous setup/i.test(p)));
    assert.ok(evaluation.strategicTradeoff.some((t) => /Resource preservation|optionality|setup/i.test(t)));
    assert.ok(
      evaluation.pros.every((p) => !/Cuts off Demonic Tutor/i.test(p)),
      "let-resolve must not also fire the respond branch",
    );
    assert.ok(
      evaluation.cons.every((c) => !/Spends tempo now/i.test(c)),
      "stack timing must not fire the self-tutor branch",
    );
    assert.match(evaluation.claim, /not automatically the correct place/i);
    assert.equal(evaluation.hypothesis.id, "gameplay:fixture-hold-counter-vs-dangerous-tutor");
  });

  it("bridges situational judgment into a Strategic Hypothesis research object", () => {
    const evaluation = evaluateSituationalFixture(SITUATIONAL_FIXTURES_V0[0]);
    const hypothesis = situationalEvaluationToHypothesis(evaluation, {
      fixtureId: SITUATIONAL_FIXTURES_V0[0].id,
    });
    assert.equal(hypothesis.kind, "StrategicHypothesis");
    assert.equal(hypothesis.writesToBrain, false);
    assert.equal(hypothesis.activated, false);
    assert.equal(hypothesis.promoted, false);
    assert.match(hypothesis.id, /^gameplay:/);
    assert.ok(hypothesis.prediction?.expectToObserve?.length >= 1);
    assert.ok(hypothesis.retirementCriteria.length >= 1);
  });

  it("ships fourteen authored fixtures across the founding concept set", () => {
    assert.equal(SITUATIONAL_FIXTURES_V0.length, 14);
    assert.ok(SITUATIONAL_FIXTURES_V0.some((f) => f.id === "fixture-hold-counter-vs-dangerous-tutor"));
    assert.ok(SITUATIONAL_FIXTURES_V0.some((f) => f.id === "fixture-pressure-combo-seat-not-grudge"));
    assert.ok(SITUATIONAL_FIXTURES_V0.some((f) => f.id === "fixture-dont-chump-with-wincon"));
    assert.ok(SITUATIONAL_FIXTURES_V0.some((f) => f.id === "fixture-play-around-unknown-open-mana"));
    assert.ok(SITUATIONAL_FIXTURES_V0.some((f) => f.id === "fixture-convert-into-unknown-race-ends"));
  });
});

