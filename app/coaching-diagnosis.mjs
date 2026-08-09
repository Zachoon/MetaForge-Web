// Exact-revision coaching diagnosis
// ---------------------------------
// Separates repeated construction pressure, explicit play-decision evidence,
// matchup concentration, ordinary unresolved variance, and measured revision
// effects. This module never infers a piloting mistake from a loss alone and
// never treats an observed win rate as a predicted one.

import { classifyPlayerSignal } from "./revision-learning.mjs";

const NEGATIVE_SIGNAL_LABELS = new Set([
  "more early interaction",
  "lower curve / faster deployment",
  "more card advantage",
  "more resilience",
  "mana repair",
  "more protection",
]);

const CATEGORY_LABELS = Object.freeze({
  "construction-pressure": "Construction pressure",
  "piloting-decision": "Decision or sequencing pressure",
  "matchup-pressure": "Matchup pressure",
  "ordinary-variance": "No repeatable failure isolated",
  "revision-effect": "Revision effect",
  "collect-more-evidence": "Collect more evidence",
});

const clamp = (value, minimum = 0, maximum = 1) =>
  Math.min(maximum, Math.max(minimum, Number(value) || 0));

const revisionMatches = (matches, revision) => matches.filter((match) =>
  Number(match?.revision || revision) === Number(revision),
);

function explicitDecisionEvidence(match) {
  const debrief = match?.coachDebrief || {};
  const moments = [
    ...(Array.isArray(match?.decisionMoments) ? match.decisionMoments : []),
    ...(Array.isArray(debrief?.decisionMoments) ? debrief.decisionMoments : []),
    ...(Array.isArray(match?.capturedAlternatives) ? match.capturedAlternatives : []),
  ];
  const text = [match?.signal, match?.sequencingIssue, debrief?.read, debrief?.detail]
    .filter(Boolean)
    .join(" ");
  return moments.length > 0 || /mulligan|sequenc|misplay|kept (?:the |a )?.{0,24}hand|wrong line|missed line/i.test(text);
}

function decisionBranchSummary(match) {
  const moment = match?.coachDebrief?.decisionMoments?.[0];
  if (!moment?.chosenLine || !moment?.alternativeLine) return null;
  return `${moment.window || "decision"}: chose “${String(moment.chosenLine).slice(0, 120)}”; alternative “${String(moment.alternativeLine).slice(0, 120)}”`;
}

function diagnosis(category, confidence, evidence, recommendation, measurement, details = {}) {
  return Object.freeze({
    category,
    label: CATEGORY_LABELS[category],
    confidence,
    evidence: Object.freeze(evidence),
    recommendation,
    measurement,
    ...details,
  });
}

function fieldTestEvidence(matches, category) {
  const categoryTests = matches
    .map((match) => match?.fieldTest)
    .filter((test) => test?.source === category && ["observed", "missed", "not-tested", "unsure"].includes(test?.outcome));
  const currentHypothesisId = [...categoryTests].reverse().find((test) => test?.hypothesisId)?.hypothesisId;
  const tests = currentHypothesisId
    ? categoryTests.filter((test) => test?.hypothesisId === currentHypothesisId)
    : categoryTests.filter((test) => !test?.hypothesisId);
  const observed = tests.filter((test) => test.outcome === "observed").length;
  const missed = tests.filter((test) => test.outcome === "missed").length;
  return Object.freeze({ total: tests.length, observed, missed, uninformative: tests.length - observed - missed });
}

function applyFieldTestEvidence(candidate, matches) {
  const fieldEvidence = fieldTestEvidence(matches, candidate.category);
  if (!fieldEvidence.total) return Object.freeze({ ...candidate, fieldEvidence });
  const evidence = [...candidate.evidence];
  evidence.push(`${fieldEvidence.observed} supporting and ${fieldEvidence.missed} contradicting focused field-test result${fieldEvidence.observed + fieldEvidence.missed === 1 ? "" : "s"}`);
  if (fieldEvidence.uninformative) evidence.push(`${fieldEvidence.uninformative} field test${fieldEvidence.uninformative === 1 ? " was" : "s were"} not informative`);
  return Object.freeze({
    ...candidate,
    confidence: fieldEvidence.observed >= 2 && fieldEvidence.observed > fieldEvidence.missed
      ? "repeated focused observation"
      : candidate.confidence,
    evidence: Object.freeze(evidence),
    fieldEvidence,
  });
}

export function buildCoachingDiagnosis({
  matches = [],
  currentRevision = 1,
  interventionLearning = null,
  playerGoal = "",
} = {}) {
  const scoped = revisionMatches(matches, currentRevision);
  const losses = scoped.filter((match) => match?.result === "loss");
  const candidates = [];

  const latestComparable = [...(interventionLearning?.experiments || [])]
    .reverse()
    .find((experiment) => experiment?.comparable && Number(experiment.revision) === Number(currentRevision));
  const activeIntervention = [...(interventionLearning?.experiments || [])]
    .reverse()
    .find((experiment) => experiment?.decision === "accepted" && Number(experiment.revision) === Number(currentRevision) && !experiment?.comparable);
  if (latestComparable) {
    const direction = latestComparable.verdict === "promising"
      ? "improved"
      : latestComparable.verdict === "regressed"
        ? "regressed"
        : "did not separate clearly";
    candidates.push(diagnosis(
      "revision-effect",
      latestComparable.verdict === "inconclusive" ? "developing" : "meaningful comparative sample",
      [
        `${latestComparable.beforeSample} matches before and ${latestComparable.afterSample} after the accepted revision`,
        `Observed results ${direction}; this is a comparison of recorded samples, not a predicted win rate`,
      ],
      latestComparable.verdict === "regressed"
        ? "Revisit the accepted change before stacking another edit on top of it."
        : latestComparable.verdict === "promising"
          ? "Keep this exact revision stable long enough to confirm the effect."
          : "Hold the revision steady and collect more comparable matches.",
      "Compare the same targeted issue and opponent mix across the next four exact-revision matches.",
    ));
  }
  if (!latestComparable && activeIntervention) {
    candidates.push(diagnosis(
      "revision-effect",
      "controlled test in progress",
      [`Revision ${currentRevision} accepted ${activeIntervention.summary || activeIntervention.kind}`],
      "Keep this exact revision stable until the named intervention target has a comparable before-and-after read.",
      activeIntervention.targetMeasurement || `Watch whether ${activeIntervention.targetCategory || "the named pressure"} improves without creating a new repeatable failure.`,
    ));
  }

  const decisionMatches = scoped.filter(explicitDecisionEvidence);
  if (decisionMatches.length >= 2) {
    const capturedBranches = decisionMatches.map(decisionBranchSummary).filter(Boolean).slice(-2);
    candidates.push(diagnosis(
      "piloting-decision",
      decisionMatches.length >= 4 ? "developing pattern" : "repeated explicit clue",
      [`${decisionMatches.length} exact-revision reports captured a mulligan, sequencing, or alternative-line decision`, ...capturedBranches],
      "Keep the deck stable and test the decision point before changing construction.",
      "Record the alternative line and whether it changes the same failure in at least two comparable games.",
    ));
  }

  const signalCounts = new Map();
  for (const match of scoped) {
    for (const label of classifyPlayerSignal(match?.signal || "")) {
      if (NEGATIVE_SIGNAL_LABELS.has(label)) signalCounts.set(label, (signalCounts.get(label) || 0) + 1);
    }
  }
  const repeatedSignal = [...signalCounts]
    .filter(([, count]) => count >= 2)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0];
  if (repeatedSignal) {
    candidates.push(diagnosis(
      "construction-pressure",
      repeatedSignal[1] >= 4 ? "developing pattern" : "repeated player signal",
      [`${repeatedSignal[1]} exact-revision matches independently reported ${repeatedSignal[0]}`],
      `Run the smallest controlled construction test aimed at ${repeatedSignal[0]}; preserve unrelated packages.`,
      `After a change, record whether “${repeatedSignal[0]}” still happens. Call the change promising only if that exact problem stops appearing in at least three relevant games.`,
      { focus: repeatedSignal[0], occurrences: repeatedSignal[1] },
    ));
  }

  const matchups = new Map();
  for (const match of scoped) {
    const opponent = String(match?.opponent || match?.opponentStrategy || "Unknown / not sure");
    if (/unknown|not sure/i.test(opponent)) continue;
    const row = matchups.get(opponent) || { opponent, wins: 0, losses: 0 };
    if (match?.result === "win") row.wins += 1;
    if (match?.result === "loss") row.losses += 1;
    matchups.set(opponent, row);
  }
  const matchup = [...matchups.values()]
    .map((row) => ({ ...row, sample: row.wins + row.losses }))
    .filter((row) => row.sample >= 4 && row.losses / row.sample >= 0.65)
    .sort((left, right) => right.sample - left.sample || right.losses - left.losses || left.opponent.localeCompare(right.opponent))[0];
  if (matchup) {
    candidates.push(diagnosis(
      "matchup-pressure",
      matchup.sample >= 8 ? "meaningful observed sample" : "developing matchup sample",
      [`${matchup.wins}–${matchup.losses} recorded against ${matchup.opponent} on this exact revision`],
      `Test one ${matchup.opponent}-specific adjustment without rewriting the deck's unrelated plan.`,
      `Compare at least four more ${matchup.opponent} matches on the proposed revision; do not generalize this result to the full field.`,
    ));
  }

  if (!candidates.length && scoped.length >= 4) {
    const noLesson = scoped.filter((match) => /no single lesson isolated/i.test(match?.signal || "")).length;
    const observedRate = scoped.length ? (scoped.length - losses.length) / scoped.length : 0;
    if (noLesson >= Math.ceil(scoped.length / 2) && observedRate >= 0.25 && observedRate <= 0.75) {
      candidates.push(diagnosis(
        "ordinary-variance",
        "bounded hold signal",
        [`${noLesson} of ${scoped.length} reports isolated no repeatable lesson`, "Results remain mixed rather than clustering around one failure"],
        "Keep the exact revision unchanged; the current evidence does not justify a deck or piloting correction.",
        "Continue recording explicit lessons until one repeats or the matchup evidence separates.",
      ));
    }
  }

  if (!candidates.length) {
    candidates.push(diagnosis(
      "collect-more-evidence",
      "insufficient",
      [`${scoped.length} match${scoped.length === 1 ? "" : "es"} attached to this revision`, "No category has crossed its evidence gate"],
      "Preserve the list and record the next honest result, opponent family, and clearest lesson.",
      "Two repeated issue signals, two explicit decision moments, or four concentrated matchup games can open a diagnosis.",
    ));
  }

  const priority = new Map([
    ["revision-effect", 5],
    ["piloting-decision", 4],
    ["construction-pressure", 3],
    ["matchup-pressure", 2],
    ["ordinary-variance", 1],
    ["collect-more-evidence", 0],
  ]);
  const retiredCategories = new Set(
    candidates
      .filter((candidate) => {
        const fieldEvidence = fieldTestEvidence(scoped, candidate.category);
        return fieldEvidence.missed >= 2 && fieldEvidence.observed === 0;
      })
      .map((candidate) => candidate.category),
  );
  const activeCandidates = candidates
    .filter((candidate) => !retiredCategories.has(candidate.category))
    .map((candidate) => applyFieldTestEvidence(candidate, scoped));
  if (!activeCandidates.length) {
    activeCandidates.push(diagnosis(
      "collect-more-evidence",
      "focused hypothesis weakened",
      [`Two focused field tests contradicted the prior ${[...retiredCategories][0] || "coaching"} hypothesis`],
      "Retire that question, keep the exact revision stable, and observe the next repeatable pressure before prescribing a new change.",
      "Record the next decisive moment without forcing it into the retired hypothesis.",
    ));
  }
  activeCandidates.sort((left, right) => (priority.get(right.category) || 0) - (priority.get(left.category) || 0));

  return Object.freeze({
    engine: "metaforge-exact-revision-coach-v1",
    revision: Number(currentRevision) || 1,
    playerGoal: String(playerGoal || "").trim() || null,
    sampleSize: scoped.length,
    primary: activeCandidates[0],
    alternatives: Object.freeze(activeCandidates.slice(1)),
    retiredHypotheses: Object.freeze([...retiredCategories]),
    activeIntervention: activeIntervention ? Object.freeze({
      id: activeIntervention.id,
      kind: activeIntervention.kind,
      summary: activeIntervention.summary,
      targetCategory: activeIntervention.targetCategory || null,
      hypothesisId: activeIntervention.hypothesisId || null,
    }) : null,
    evidenceBoundary: "MetaForge diagnoses repeated evidence attached to this exact revision. A loss alone never proves a bad deck or a piloting mistake, and observed samples are not predicted win rates.",
    confidence: clamp(scoped.length / 8),
  });
}
