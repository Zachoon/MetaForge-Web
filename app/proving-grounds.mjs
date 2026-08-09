// A bounded, server-side handoff from analysis to one playable question.
// This does not predict a result or prescribe a deck change. It translates the
// strongest current evidence into one observation a player can carry to a game.

const clean = (value) => String(value || "").trim();

const stableHypothesisId = (revision, category, measurement) => {
  const input = `${Number(revision) || 1}|${category}|${clean(measurement).toLowerCase()}`;
  let hash = 2166136261;
  for (const character of input) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return `coach-${(hash >>> 0).toString(36)}`;
};

export function buildProvingGroundsBrief({ coachingDiagnosis, failureAnalysis, simulationDossier, matches = [] } = {}) {
  const primary = coachingDiagnosis?.primary || {};
  const activeIntervention = coachingDiagnosis?.activeIntervention || null;
  const playerGoal = clean(coachingDiagnosis?.playerGoal);
  const category = clean(primary.category) || "collect-more-evidence";
  const weakest = clean(simulationDossier?.matrix?.weakest?.opponent);
  const structuralTest = clean(failureAnalysis?.nextTest);
  const repeatedFocus = clean(primary.focus);

  const briefs = {
    "construction-pressure": {
      question: repeatedFocus ? `Does “${repeatedFocus}” happen again?` : "Does the same deck problem appear again in a real game?",
      watchFor: repeatedFocus
        ? `Play normally. Afterward, answer only this: did “${repeatedFocus}” meaningfully affect the game?`
        : clean(primary.measurement) || structuralTest,
      why: repeatedFocus
        ? `You reported “${repeatedFocus}” in ${Number(primary.occurrences) || 2} games with this exact deck revision.`
        : clean(primary.evidence?.[0]) || "A repeated deck problem is ready for one focused table check.",
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
  const revision = Number(coachingDiagnosis?.revision) || 1;
  const evidenceSource = clean(activeIntervention?.targetCategory) || category;
  const hypothesisId = stableHypothesisId(revision, evidenceSource, primary.measurement || selected.watchFor);
  const results = matches
    .filter((match) => Number(match?.revision || revision) === revision)
    .map((match) => match?.fieldTest)
    .filter((test) => test?.source === evidenceSource && (!test.hypothesisId || test.hypothesisId === hypothesisId));
  const supporting = results.filter((test) => test.outcome === "observed").length;
  const contradicting = results.filter((test) => test.outcome === "missed").length;
  const informative = supporting + contradicting;
  const status = supporting >= 2 && supporting > contradicting
    ? "supported"
    : contradicting >= 2 && supporting === 0
      ? "retired"
      : supporting && contradicting
        ? "mixed"
        : "testing";
  const nextAction = status === "supported"
    ? clean(primary.recommendation) || "Use the repeated observation to choose the smallest relevant intervention."
    : status === "retired"
      ? "Retire this question and keep the revision stable until a different pressure repeats."
      : status === "mixed"
        ? "Repeat the exact question once more without changing the deck."
        : informative === 1
          ? "Repeat the exact question once more before changing the deck."
          : "Run this exact question in the next relevant game.";
  return Object.freeze({
    engine: "metaforge-proving-grounds-v2",
    hypothesisId,
    revision,
    playerGoal: playerGoal || null,
    source: evidenceSource,
    diagnosisCategory: category,
    question: selected.question,
    watchFor: selected.watchFor,
    why: playerGoal ? `${selected.why} Player goal: ${playerGoal}.` : selected.why,
    successPrompt: repeatedFocus ? `Yes — “${repeatedFocus}” affected the game` : "Yes — the thing I watched happened",
    missedPrompt: repeatedFocus ? `No — “${repeatedFocus}” did not affect the game` : "No — it did not happen",
    evidence: Object.freeze({ supporting, contradicting, uninformative: results.length - informative }),
    status,
    nextAction,
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
