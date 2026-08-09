const clean = (value) => String(value || "").trim();

export function buildCoachingSession({ coachingDiagnosis, provingGrounds, experimentTablets, activeFieldTest = null } = {}) {
  const primary = coachingDiagnosis?.primary || {};
  const category = clean(primary.category) || "collect-more-evidence";
  const confidentExperiment = experimentTablets?.tablets?.find((tablet) =>
    tablet?.type === "experiment" && tablet?.confident !== false && tablet?.change?.cut && tablet?.change?.add,
  ) || null;
  const evidence = Array.isArray(primary.evidence) ? primary.evidence : [];
  const plainRead = {
    "lower curve / faster deployment": "The deck may take too long to get started",
    "more early interaction": "The deck may not have enough early answers",
    "more card advantage": "The deck may run out of useful cards",
    "more resilience": "The deck may struggle to recover",
    "more protection": "Your key cards may need more protection",
    "mana repair": "The deck may not find the right mana reliably",
  }[clean(primary.focus).toLowerCase()];
  const base = {
    engine: "metaforge-coaching-session-v1",
    goal: coachingDiagnosis?.playerGoal || null,
    diagnosis: plainRead || primary.label || category,
    confidence: primary.occurrences ? `SEEN IN ${primary.occurrences} GAMES` : primary.confidence || "insufficient",
    evidence,
    hypothesisId: provingGrounds?.hypothesisId || null,
    progress: provingGrounds?.evidence || { supporting: 0, contradicting: 0, uninformative: 0 },
    measurement: provingGrounds?.watchFor || primary.measurement || "Record the next honest result.",
    boundary: provingGrounds?.boundary || coachingDiagnosis?.evidenceBoundary || "One result is one clue.",
  };

  if (activeFieldTest) return Object.freeze({
    ...base,
    mode: "observe",
    title: "Finish the active table question before changing anything.",
    action: activeFieldTest.question,
    change: null,
    cta: "Return with the result",
  });
  if (category === "piloting-decision") return Object.freeze({
    ...base,
    mode: "practice",
    title: "Coach the decision; hold the deck steady.",
    action: provingGrounds?.question || primary.recommendation,
    change: null,
    cta: "Begin the decision test",
  });
  if (category === "construction-pressure" && confidentExperiment) return Object.freeze({
    ...base,
    mode: "experiment",
    title: "One bounded deck experiment is ready.",
    action: `Remove ${confidentExperiment.change.cut}; add ${confidentExperiment.change.add}.`,
    change: Object.freeze({ ...confidentExperiment.change, tabletId: confidentExperiment.id }),
    expectedBenefit: confidentExperiment.expectedBenefit || "The change cleared the Forge's structural gate.",
    tradeoff: confidentExperiment.tradeoff || "Real-match performance remains unproven.",
    measurement: confidentExperiment.testContract || base.measurement,
    cta: "Review the exact experiment",
  });
  return Object.freeze({
    ...base,
    mode: category === "revision-effect" ? "hold" : "observe",
    title: category === "revision-effect" ? "Hold this revision while its intended effect is measured." : "The evidence does not justify a deck change yet.",
    action: provingGrounds?.question || primary.recommendation,
    change: null,
    cta: category === "revision-effect" ? "Continue this one-question test" : "Start this one-question test",
  });
}
