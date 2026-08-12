// =============================================================================
// Era 2 — Situational Strategic Evaluation v0.1
// =============================================================================
// Critique ONE in-game decision given a simplified EDH state.
// Judgment without construction. Simulation is a future witness, not the judge.
// writesToBrain: false · activated: false · promoted: false
// =============================================================================

import { createGameState, createCandidateLine } from "./game-state-schema.mjs";
import { reviewStrategicDecision } from "../strategic-reasoner.mjs";
import { createStrategicHypothesis } from "../knowledge/strategic-hypothesis.mjs";
import {
  assertFixtureTeachesConcept,
  getStrategicConcept,
} from "../knowledge/strategic-concept.mjs";
import { witnessSituationalLine } from "./simulation-witness.mjs";

const freeze = (value) => Object.freeze(value);

function you(state) {
  return (state.players || []).find((p) => p.seat === "you") || state.players?.[0] || null;
}

function threats(state) {
  return (state.players || []).filter((p) => p.seat !== "you");
}

function classifyLine(lineText) {
  // Order matters: let-resolve / conserve permission must win over "Counterspell" card names
  // and over "Tutor" appearing as the stack object being discussed.
  const isLetResolveLine = /\blet\b.*\bresolve\b|allow (it )?to resolve|do not counter|don't counter|pass priority|keep (the )?(counterspell|counter|permission)/i.test(lineText);
  const isRespondLine = !isLetResolveLine
    && /\bcounter the\b|respond on (the )?stack|respond with|negate |swan song|force of will|stop (the|it|them)\b/i.test(lineText);
  const isSeatHierarchyLine = /threat hierarchy|combo seat|highest threat|not (the )?grudge|leave .+ (alive|intact)|table check|greed.?kill|political|only clock|grudge seat/i.test(lineText);
  const isPlanIntegrityLine = /protect the wincon|chump with the token|decline (the )?greedy|do not empty the plan|keep the plan|overextend|dump the whole plan|chump with the wincon|only defender|refuse to block/i.test(lineText);
  const isInfoAsymmetryLine = /play around|known empty|unknown|incomplete ≠|incomplete !=|respect the range|tap out for the payoff into|race ends now|convert into unknown/i.test(lineText);
  const isHoldLine = !isLetResolveLine && !isRespondLine && !isSeatHierarchyLine && !isPlanIntegrityLine && !isInfoAsymmetryLine
    && (/\b(hold|preserve)\b|don't tap|do not tap/i.test(lineText) || /\bpass\b/i.test(lineText));
  const isConvertLine = !isLetResolveLine && !isRespondLine && !isPlanIntegrityLine
    && !/(do not|don't)\s+tap(\s+out)?/i.test(lineText)
    && /\b(attack|combo|win|convert)\b|go for it|tap out|cast.*finisher/i.test(lineText);
  const isTutorLine = !isLetResolveLine && !isRespondLine
    && /\b(tutor for|search for|dig for|cast .*tutor)\b/i.test(lineText);
  return {
    isHoldLine,
    isConvertLine,
    isTutorLine,
    isRespondLine,
    isLetResolveLine,
    isSeatHierarchyLine,
    isPlanIntegrityLine,
    isInfoAsymmetryLine,
  };
}

/**
 * Evaluate a situational play decision.
 */
export function evaluateSituationalDecision({
  state: rawState = null,
  decision = null,
  lines = [],
  chosenId = null,
  claim = null,
  fixtureId = null,
  teaches = null,
} = {}) {
  const state = rawState?.kind === "GameState" ? rawState : createGameState(rawState || {});
  const candidateLines = (lines.length ? lines : decision?.lines || [])
    .map((line, index) => createCandidateLine({ id: line.id || `line-${index + 1}`, ...line }));
  const chosen = chosenId || decision?.chosenId || candidateLines[0]?.id || null;
  const chosenLine = candidateLines.find((line) => line.id === chosen) || null;

  if (!chosenLine || candidateLines.length < 2) {
    return freeze({
      writesToBrain: false,
      ok: false,
      reason: "needs_context",
      note: "Situational evaluation needs ≥2 legal lines and a chosen line. Unknown is not absent.",
      state,
      modelCompleteness: state.modelCompleteness,
    });
  }

  const self = you(state);
  const table = threats(state);
  const openInteraction = table.some((p) => p.hasInteractionOpen === true);
  const unknownInteraction = table.some((p) => p.hasInteractionOpen == null);
  const lowLife = self?.life != null && self.life <= 6;
  const opponentLow = table.some((p) => p.life != null && p.life <= 6);
  const stackTop = state.stackTop || null;

  const pros = [];
  const cons = [];
  const tradeoff = [];
  const lineText = `${chosenLine.label} ${chosenLine.summary}`;
  const {
    isHoldLine,
    isConvertLine,
    isTutorLine,
    isRespondLine,
    isLetResolveLine,
    isSeatHierarchyLine,
    isPlanIntegrityLine,
    isInfoAsymmetryLine,
  } = classifyLine(lineText);

  if (isSeatHierarchyLine) {
    if (/attack-innocent|avoid looking spiteful|optics/i.test(lineText)) {
      cons.push("Avoiding optics while ignoring the real clock fails Seat Pressure.");
      tradeoff.push("Sportsmanlike narrative vs stopping the winning seat.");
    } else if (/grudge seat|only clock|hierarchy and grievance coincide/i.test(lineText)) {
      pros.push("Hierarchy and grievance coincide — pressure the real clock even if it looks like revenge.");
      cons.push("Table narrative may misread the assignment as spite.");
      tradeoff.push("Correct threat assignment vs political optics.");
    } else if (/grudge|revenge/i.test(lineText) && !/not (the )?grudge|also the only clock/i.test(lineText)) {
      cons.push("Grudge seating allocates pressure by grievance, not by who ends the game.");
      tradeoff.push("Emotional satisfaction vs stopping the actual winning seat.");
    } else if (/leave .+ (alive|intact)|table check|do not greed/i.test(lineText) || /Leave Right alive/i.test(chosenLine.label)) {
      pros.push("Preserves the seat that constrains the favorite — hierarchy includes who not to kill.");
      cons.push("The check may point at you; politics can invert.");
      tradeoff.push("Table geometry vs a greedy elimination.");
    } else {
      pros.push("Assigns pressure to the highest real threat — Seat Pressure over convenience.");
      cons.push("The non-priority seat may become relevant if the read is wrong.");
      tradeoff.push("Stop the winning seat now vs settle secondary scores.");
    }
  }

  if (isPlanIntegrityLine) {
    if (/only defender|chump-wincon-to-live|Chump with the wincon — only/i.test(lineText) || /only defender vs lethal/i.test(chosenLine.label)) {
      pros.push("Surviving lethal preserves the chance to have a plan — Plan Integrity is not martyrdom.");
      cons.push("The load-bearing piece is spent; the line is delayed or broken.");
      tradeoff.push("Game continuation vs piece preservation.");
    } else if (/wincon|chump with the token|protect the wincon|keep the plan|decline/i.test(lineText)
      && !/chump with the wincon|dump the whole plan|greedy dump|refuse to block/i.test(chosenLine.label)) {
      pros.push("Protects the primary line — locally ugly plays that keep the plan beat false tempo.");
      cons.push("Life totals or board presence may look worse short-term.");
      tradeoff.push("Plan integrity vs immediate comfort or greed.");
    } else if (/chump with the wincon|dump the whole plan|greedy dump|refuse to block|die with a pretty/i.test(lineText)) {
      cons.push("Dilutes or risks the primary plan for local survival/speed — or preserves a piece while losing the game.");
      tradeoff.push("Short-term patch vs long-term line integrity.");
    }
  }

  if (isInfoAsymmetryLine) {
    if (/race ends now|convert into unknown|delay loses/i.test(lineText)) {
      pros.push("Race math overrides default range respect — delay loses harder than the possible punish.");
      cons.push("Hidden answers can still punish the conversion.");
      tradeoff.push("Forced conversion vs dying to the crack-back.");
    } else if (/play around|respect the range|lead bait|hold/i.test(lineText) && !/known empty|convert now|race ends/i.test(lineText)) {
      pros.push("Respects hidden information — unknown open resources are not treated as empty.");
      cons.push("If the range was blank, you lose tempo.");
      tradeoff.push("Range respect vs raw speed.");
    } else if (/known empty|convert now/i.test(lineText)) {
      pros.push("Updates on revealed information — when the range collapses, conversion becomes coherent.");
      cons.push("Topdecks and other seats can still punish.");
      tradeoff.push("Exploit collapsed information vs lingering hesitation.");
    } else if (/tap out for the payoff into|assuming the unknown|wait-and-die|play around forever/i.test(lineText)) {
      cons.push("Treats unknown as absent — or respects range past the point race math allows.");
      tradeoff.push("Assumed blanks / endless hesitation vs actual constraints.");
    }
  }

  if (isRespondLine && stackTop) {
    if (stackTop.terminalThreat) {
      pros.push(`Answers terminal (or near-terminal) stack object: ${stackTop.spell}.`);
    } else if (/no later window/i.test(lineText)) {
      pros.push(`Spends on non-terminal ${stackTop.spell} because preservation has no future window — Commitment Timing nuance.`);
      cons.push("If the find was blank, you spent your last answer early.");
      tradeoff.push("Forced spend on setup vs dying with permission unused.");
    } else {
      pros.push(`Cuts off ${stackTop.spell} before it improves their future lines.`);
      cons.push("Spending interaction on a non-terminal object can leave you naked for the real attempt.");
      cons.push("Opportunity cost: this may not be the highest-leverage moment to spend permission.");
      if (stackTop.enablesFutureTerminal || stackTop.threatClass === "tutor") {
        pros.push("The spell enables future terminal assembly — stopping it reduces later risk.");
      }
    }
    if (stackTop.targetsYou) {
      pros.push("The stack object targets you — answering it protects your seat directly.");
    }
    if (self?.hasInteractionOpen === false) {
      cons.push("You are marked without open interaction — this line may be illegal or mana-incoherent.");
    }
    tradeoff.push("Spend permission now vs save it for a later, clearer terminal attempt.");
  } else if (isRespondLine && !stackTop) {
    cons.push("Respond line chosen but stack top is unknown/empty — incomplete state, not proof of correctness.");
    tradeoff.push("Priority decisions require a known stack object; unknown is not absent.");
  }

  if (isLetResolveLine && stackTop) {
    if (stackTop.terminalThreat) {
      cons.push(`Letting terminal threat ${stackTop.spell} resolve may end the game.`);
    } else {
      pros.push(`Conserves interaction by letting non-terminal ${stackTop.spell} resolve.`);
      pros.push("Preserves the answer for a clearer terminal attempt — threat timing over reflex.");
      if (stackTop.enablesFutureTerminal || stackTop.threatClass === "tutor") {
        cons.push(`${stackTop.spell} is dangerous setup: resolving it raises future terminal risk.`);
        cons.push("Uncertainty: you do not know which payoff they find — incomplete ≠ safe.");
      }
    }
    if (unknownInteraction) {
      pros.push("Other seats may also have answers — spending first is not always mandatory.");
    }
    tradeoff.push("Resource preservation and future optionality vs letting dangerous setup resolve now.");
  }

  if (isHoldLine) {
    pros.push("Preserves reaction potential into unknown stacks or combat.");
    if (openInteraction || unknownInteraction) {
      pros.push("Table interaction is open or unknown — tapping out is especially fragile.");
    }
    if (opponentLow) {
      cons.push("An opponent is low enough that converting now might end the game before politics reshuffle.");
    }
    tradeoff.push("Higher survival / permission; slower conversion of current board advantage.");
  }

  if (isConvertLine) {
    pros.push("Converts existing position into concrete pressure or a terminal attempt.");
    if (openInteraction) {
      cons.push("At least one opponent is marked as having interaction open — the line can be punished.");
    }
    if (unknownInteraction) {
      cons.push("Opponent interaction is unknown — confidence must stay limited.");
    }
    if (lowLife) {
      cons.push("Your own life total is low; failed conversion may lose the race.");
    }
    tradeoff.push("Higher terminal upside; lower robustness if the table has answers.");
  }

  if (isTutorLine) {
    pros.push("Improves future line quality if the game goes long.");
    cons.push("Spends tempo now; can be wrong if the table demands an immediate answer.");
    tradeoff.push("Card selection vs clock — classic sequencing tension.");
  }

  for (const assumption of chosenLine.assumptions || []) {
    pros.push(`Assumption held: ${assumption}`);
  }
  for (const risk of chosenLine.risks || []) {
    cons.push(`Risk: ${risk}`);
  }
  if (!pros.length) pros.push("Line is intelligible under stated assumptions, but gameplay evidence is still thin.");
  if (!cons.length) cons.push("No hard contradiction found in the simplified state — not proof the line is correct.");
  if (!tradeoff.length) tradeoff.push("Table politics and hidden hands can invert this read.");

  // Optional 1v1 reasoner as a WITNESS only (mapped clocks). Never the sole judge.
  let witness = null;
  if (self?.life != null && table[0]?.life != null) {
    const mapped = {
      ownClock: Math.max(1, self.life),
      opponentClock: Math.max(1, Math.min(...table.map((p) => p.life).filter((n) => n != null))),
      boardAdvantage: /attack|board|pressure/i.test(chosenLine.summary) ? 0.3 : 0,
      inevitability: /hold|permission|inevitable/i.test(chosenLine.summary) ? 0.35 : 0.1,
      uncertainty: state.modelCompleteness.band === "thin" ? 0.8 : unknownInteraction ? 0.65 : 0.4,
    };
    const options = candidateLines.map((line) => ({
      id: line.id,
      label: line.label,
      legal: line.legal,
      tempo: /attack|tap out|cast|counter/i.test(line.label) ? 0.6 : 0.1,
      pressure: /attack|win|combo|counter/i.test(line.label) ? 0.7 : 0.1,
      risk: /hold|pass|let .*resolve/i.test(line.label) ? -0.2 : 0.4,
      flexibility: /hold|pass|let .*resolve/i.test(line.label) ? 0.7 : 0.2,
      inevitability: /hold|permission|let .*resolve/i.test(line.label) ? 0.5 : 0.2,
      evidence: 0.45,
      downside: /tap out|attack|counter/i.test(line.label) ? 0.55 : 0.25,
      fragility: unknownInteraction ? 0.6 : 0.3,
      assumptions: line.assumptions,
    }));
    witness = reviewStrategicDecision({
      state: mapped,
      options,
      chosenId: chosen,
    });
  }

  const simulationWitness = witnessSituationalLine({
    state,
    chosenLine,
    alternatives: candidateLines,
    teaches,
  });

  const confidence = confidenceForSituation({
    state,
    unknownInteraction,
    openInteraction,
    lineCount: candidateLines.length,
    witness,
    simulationWitness,
    stackAware: Boolean(stackTop),
  });

  const hypothesisClaim = claim
    || `In this state, choosing “${chosenLine.label}” is the more coherent line under the stated assumptions.`;

  const retirementCriteria = freeze([
    "A richer game-state capture (stack, exact open interaction, combat math) contradicts this read",
    "OR expert/tournament sequencing notes for this archetype prefer the alternate line in analogous seats",
    "OR simulation witnesses (when available) repeatedly punish the chosen line under matching assumptions",
  ]);

  const stateLabel = confidence.level === "insufficient" || state.modelCompleteness.band === "thin"
    ? "emerging"
    : confidence.level === "high"
      ? "strongly_supported"
      : "emerging";

  const evaluation = freeze({
    writesToBrain: false,
    ok: true,
    version: "situational-strategic-evaluation-v0.1",
    kind: "SituationalStrategicEvaluation",
    era: 2,
    activated: false,
    promoted: false,
    brainInheritance: "none",
    state,
    decision: freeze({
      chosenId: chosen,
      chosenLabel: chosenLine.label,
      summary: chosenLine.summary,
      alternatives: freeze(candidateLines.filter((line) => line.id !== chosen).map((line) => line.label)),
      stackTop: stackTop
        ? freeze({
          spell: stackTop.spell,
          controller: stackTop.controller,
          terminalThreat: stackTop.terminalThreat,
          enablesFutureTerminal: stackTop.enablesFutureTerminal,
          threatClass: stackTop.threatClass,
        })
        : null,
    }),
    pros: freeze(pros.slice(0, 5)),
    cons: freeze(cons.slice(0, 5)),
    strategicTradeoff: freeze(tradeoff.slice(0, 3)),
    evidence: freeze({
      tournament: "none",
      experts: "none",
      shadow: "none",
      simulation: simulationWitness.band || "none",
      fixture: "authored_v0",
      witness: witness ? witness.status : "none",
      simulationWitness: simulationWitness.verdict,
      notes: freeze([
        `modelCompleteness=${state.modelCompleteness.band}`,
        `simWitness=${simulationWitness.verdict} (${simulationWitness.status})`,
        ...(stackTop ? [`stackTop=${stackTop.spell};terminal=${stackTop.terminalThreat}`] : ["stackTop=none"]),
        ...(state.modelCompleteness.incomplete.slice(0, 4).map((item) => `incomplete:${item}`)),
        ...(witness ? [`1v1_witness=${witness.status}: ${witness.message}`] : []),
      ]),
    }),
    confidence,
    claim: hypothesisClaim,
    retirementCriteria,
    stateLabel,
    witness: witness
      ? freeze({
          status: witness.status,
          message: witness.message,
          role: witness.role?.role || null,
          note: "1v1 reasoner is a witness only — not an EDH rules judge.",
        })
      : null,
    simulationWitness,
    coachVoice: freeze({
      lead: "Situational read",
      paragraph: buildSituationalParagraph({
        chosenLine,
        pros,
        cons,
        tradeoff,
        confidence,
        politicsNote: state.politicsNote,
        stackTop,
        simulationWitness,
      }),
      mustNotSay: freeze([
        "Definitely the correct play",
        "The board is fully known",
        "Brain requires this line",
        "Simulation proved this",
      ]),
    }),
  });

  return freeze({
    ...evaluation,
    hypothesis: situationalEvaluationToHypothesis(evaluation, { fixtureId }),
  });
}

/**
 * Bridge Era 2 judgment → Strategic Hypothesis research object.
 * Naming is not promotion. Gameplay claims stay sandbox until earned.
 */
export function situationalEvaluationToHypothesis(evaluation, { fixtureId = null } = {}) {
  if (!evaluation?.ok) return null;
  return createStrategicHypothesis({
    id: `gameplay:${fixtureId || evaluation.decision?.chosenId || "anonymous"}`,
    claim: evaluation.claim,
    subject: freeze({
      era: 2,
      kind: "situational_line",
      chosen: evaluation.decision?.chosenLabel || null,
      alternatives: evaluation.decision?.alternatives || [],
      stackTop: evaluation.decision?.stackTop || null,
    }),
    state: evaluation.stateLabel || "emerging",
    evidence: {
      tournament: "none",
      experts: "none",
      shadow: "none",
      simulation: "none",
      notes: [
        "source:situational-strategic-evaluation-v0.1",
        ...(evaluation.evidence?.notes || []),
      ],
    },
    prediction: {
      windowDays: 120,
      expectToObserve: [
        "Expert sequencing notes or richer board captures that support or contradict this line preference",
        "OR future simulation witnesses under matching assumptions",
      ],
      note: "Gameplay hypothesis from authored fixture until live capture exists.",
    },
    retirementCriteria: [...(evaluation.retirementCriteria || [])],
    uniquenessAngle: "Era 2 situational judgment under incomplete information",
    confidence: evaluation.confidence,
    sources: [{ kind: "authored_fixture", id: fixtureId || null }],
  });
}

function confidenceForSituation({
  state,
  unknownInteraction,
  openInteraction,
  lineCount,
  witness,
  simulationWitness,
  stackAware,
}) {
  let score = 0.35;
  if (state.modelCompleteness.band === "adequate_for_v0") score += 0.15;
  else if (state.modelCompleteness.band === "partial") score += 0.05;
  else score -= 0.1;
  if (lineCount >= 2) score += 0.1;
  if (stackAware) score += 0.08;
  if (unknownInteraction) score -= 0.12;
  if (openInteraction) score += 0.05;
  if (witness?.status === "sound") score += 0.15;
  else if (witness?.status === "close") score += 0.05;
  else if (witness?.status === "review") score -= 0.05;
  if (simulationWitness?.verdict === "supports") score += 0.08;
  else if (simulationWitness?.verdict === "pressures") score -= 0.05;
  const level = score >= 0.7 ? "high" : score >= 0.5 ? "moderate" : score >= 0.3 ? "limited" : "insufficient";
  return freeze({ level, score: Number(Math.max(0, Math.min(0.95, score)).toFixed(3)) });
}

function buildSituationalParagraph({
  chosenLine,
  pros,
  cons,
  tradeoff,
  confidence,
  politicsNote,
  stackTop,
  simulationWitness,
}) {
  const firstCon = cons[0]
    ? cons[0].replace(/^Risk:\s*/i, "").replace(/\.\s*$/, "").replace(/^./, (ch) => ch.toLowerCase())
    : "";
  const politics = politicsNote
    ? ` Politics note: ${String(politicsNote).replace(/\.\s*$/, "")}.`
    : "";
  const stack = stackTop ? ` Stack top: ${stackTop.spell}.` : "";
  const sim = simulationWitness?.verdict && simulationWitness.verdict !== "inconclusive"
    ? ` Witness ${simulationWitness.verdict} the line under stated assumptions.`
    : "";
  return `Current understanding of this board: “${chosenLine.label}” looks coherent.${stack} ${pros[0] || ""}${firstCon ? ` However, ${firstCon}.` : ""} Tradeoff: ${tradeoff[0] || "context-dependent."}${sim} Confidence: ${confidence.level}.${politics}`;
}

/**
 * Run a named fixture through the situational evaluator.
 * Era 2 rule: fixture must teach a strategic concept.
 */
export function evaluateSituationalFixture(fixture = null) {
  if (!fixture) {
    return freeze({ ok: false, reason: "missing_fixture", writesToBrain: false });
  }
  const teachesCheck = assertFixtureTeachesConcept(fixture);
  if (!teachesCheck.ok) {
    return freeze({
      writesToBrain: false,
      ok: false,
      reason: teachesCheck.reason,
      note: teachesCheck.note,
    });
  }
  const evaluation = evaluateSituationalDecision({
    state: fixture.state,
    lines: fixture.lines,
    chosenId: fixture.chosenId,
    claim: fixture.claim || null,
    fixtureId: fixture.id || null,
    teaches: fixture.teaches || null,
  });
  if (!evaluation.ok) return evaluation;

  const concept = getStrategicConcept(fixture.teaches.conceptId);
  return freeze({
    ...evaluation,
    teaches: freeze(fixture.teaches),
    concept: concept
      ? freeze({
          id: concept.id,
          name: concept.name,
          status: concept.status,
          confidence: concept.confidence,
          implementation: fixture.teaches.implementation,
          relation: fixture.teaches.relation,
          question: "Which concept did this teach?",
        })
      : null,
  });
}
