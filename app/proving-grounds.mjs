// A bounded, server-side handoff from analysis to one playable question.
// This does not predict a result or prescribe a deck change. It translates the
// strongest current evidence into one observation a player can carry to a game.

const clean = (value) => String(value || "").trim();

export function buildProvingGroundsBrief({ coachingDiagnosis, failureAnalysis, simulationDossier } = {}) {
  const primary = coachingDiagnosis?.primary || {};
  const category = clean(primary.category) || "collect-more-evidence";
  const weakest = clean(simulationDossier?.matrix?.weakest?.opponent);
  const structuralTest = clean(failureAnalysis?.nextTest);

  const briefs = {
    "construction-pressure": {
      question: "Does the same construction pressure appear again in a real game?",
      watchFor: clean(primary.measurement) || structuralTest,
      why: clean(primary.evidence?.[0]) || "A repeated deck-level signal is ready for a controlled table check.",
    },
    "piloting-decision": {
      question: "Can one different mulligan or sequencing decision change the critical turn?",
      watchFor: clean(primary.measurement),
      why: clean(primary.evidence?.[0]) || "The current evidence points to a decision point before it points to a card change.",
    },
    "matchup-pressure": {
      question: `Does this revision find its plan against ${weakest || "the matchup under review"}?`,
      watchFor: clean(primary.measurement),
      why: clean(primary.evidence?.[0]) || "The recorded evidence is concentrated in one opponent family.",
    },
    "revision-effect": {
      question: "Does the accepted revision improve the exact problem it was meant to change?",
      watchFor: clean(primary.measurement),
      why: clean(primary.evidence?.[0]) || "This revision has a measurable before-and-after question.",
    },
    "ordinary-variance": {
      question: "Can this exact revision complete its plan without a repeatable failure emerging?",
      watchFor: clean(primary.measurement) || "Notice the first moment the plan succeeds or stalls; do not change the list from one result.",
      why: "The current evidence does not justify blaming construction or play decisions.",
    },
    "collect-more-evidence": {
      question: "What is the first repeatable reason this deck succeeds or stalls?",
      watchFor: structuralTest || clean(primary.measurement) || "Notice the first decisive turn and name only the clearest observable lesson.",
      why: "There is not enough exact-revision evidence for an honest diagnosis yet.",
    },
  };
  const selected = briefs[category] || briefs["collect-more-evidence"];
  return Object.freeze({
    engine: "metaforge-proving-grounds-v1",
    source: category,
    question: selected.question,
    watchFor: selected.watchFor,
    why: selected.why,
    successPrompt: "Yes — the thing I watched happened",
    missedPrompt: "No — it did not happen",
    boundary: "One game supplies one clue, not a verdict. The Forge will preserve the exact revision and look for repetition before recommending a change.",
  });
}

export function interpretProvingGroundsResult(outcome) {
  if (outcome === "observed") return Object.freeze({
    headline: "The test produced a supporting clue.",
    guidance: "Keep this revision stable and look for the same observation once more before acting on it.",
  });
  if (outcome === "missed") return Object.freeze({
    headline: "The expected signal did not appear.",
    guidance: "That weakens the hypothesis for this game, but one miss is not enough to discard it. Repeat the same test once before changing the deck.",
  });
  if (outcome === "not-tested") return Object.freeze({
    headline: "This game did not test the question.",
    guidance: "No conclusion is the honest conclusion. Preserve the test and carry it into the next relevant game.",
  });
  return Object.freeze({
    headline: "The clue was not clear enough to classify.",
    guidance: "Keep the deck unchanged. In the next game, watch only the named moment instead of trying to diagnose everything at once.",
  });
}
