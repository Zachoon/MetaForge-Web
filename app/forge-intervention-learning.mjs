const MIN_REVISION_SAMPLE = 4;
const MIN_REPEATED_WINS = 2;

const clamp = (value, minimum = 0, maximum = 1) =>
  Math.min(maximum, Math.max(minimum, Number(value) || 0));

const observedRate = (matches) => {
  const resultMatches = matches.filter((match) => match.result === "win" || match.result === "loss");
  if (!resultMatches.length) return 0;
  return resultMatches.filter((match) => match.result === "win").length / resultMatches.length;
};

const revisionMatches = (matches, revision) =>
  matches.filter((match) => Number(match.revision || 1) === Number(revision));

const targetedIssueRead = (matches, targetCategory) => {
  if (!targetCategory) return { sample: 0, issueRate: 0 };
  const outcomes = matches
    .map((match) => match?.fieldTest)
    .filter((test) => test?.source === targetCategory && ["observed", "missed"].includes(test?.outcome));
  return {
    sample: outcomes.length,
    issueRate: outcomes.length ? outcomes.filter((test) => test.outcome === "observed").length / outcomes.length : 0,
  };
};

export function learnFromForgeInterventions(interventions = [], matches = []) {
  const experiments = interventions
    .filter((intervention) => intervention?.id && intervention?.kind)
    .map((intervention) => {
      const revision = Math.max(1, Number(intervention.revision) || 1);
      const after = revisionMatches(matches, revision);
      const before = revisionMatches(matches, Math.max(1, revision - 1));
      const afterRate = observedRate(after);
      const beforeRate = observedRate(before);
      const targetedBefore = targetedIssueRead(before, intervention.targetCategory);
      const targetedAfter = targetedIssueRead(after, intervention.targetCategory);
      const targetComparable = intervention.decision === "accepted" && targetedBefore.sample >= 2 && targetedAfter.sample >= 2;
      const targetDelta = targetComparable ? targetedAfter.issueRate - targetedBefore.issueRate : 0;
      const beforeResults = before.filter((match) => match.result === "win" || match.result === "loss");
      const afterResults = after.filter((match) => match.result === "win" || match.result === "loss");
      const aggregateComparable =
        intervention.decision === "accepted" &&
        revision > 1 &&
        beforeResults.length >= MIN_REVISION_SAMPLE &&
        afterResults.length >= MIN_REVISION_SAMPLE;
      const comparable = targetComparable || aggregateComparable;
      const delta = aggregateComparable ? afterRate - beforeRate : 0;

      return {
        ...intervention,
        revision,
        beforeSample: before.length,
        afterSample: after.length,
        beforeRate: clamp(beforeRate),
        afterRate: clamp(afterRate),
        delta,
        targetCategory: intervention.targetCategory || null,
        targetBeforeSample: targetedBefore.sample,
        targetAfterSample: targetedAfter.sample,
        targetIssueRateBefore: clamp(targetedBefore.issueRate),
        targetIssueRateAfter: clamp(targetedAfter.issueRate),
        targetComparable,
        targetDelta,
        comparable,
        verdict:
          intervention.decision === "dismissed"
            ? "player-declined"
            : targetComparable
              ? targetDelta <= -0.5
                ? "promising"
                : targetDelta >= 0.5
                  ? "regressed"
                  : "inconclusive"
            : !comparable
              ? "collecting-evidence"
              : delta >= 0.1
                ? "promising"
                : delta <= -0.1
                  ? "regressed"
                  : "inconclusive",
      };
    });

  const byKind = new Map();
  for (const experiment of experiments) {
    const row = byKind.get(experiment.kind) || {
      kind: experiment.kind,
      accepted: 0,
      dismissed: 0,
      promising: 0,
      regressed: 0,
      comparable: 0,
    };
    if (experiment.decision === "accepted") row.accepted += 1;
    if (experiment.decision === "dismissed") row.dismissed += 1;
    if (experiment.comparable) row.comparable += 1;
    if (experiment.verdict === "promising") row.promising += 1;
    if (experiment.verdict === "regressed") row.regressed += 1;
    byKind.set(experiment.kind, row);
  }

  const patterns = [...byKind.values()]
    .map((row) => ({
      ...row,
      reusable:
        row.promising >= MIN_REPEATED_WINS &&
        row.promising > row.regressed,
      confidence:
        row.comparable >= 4
          ? "developing intervention pattern"
          : row.comparable >= 2
            ? "repeated controlled clue"
            : "insufficient comparative evidence",
    }))
    .sort(
      (left, right) =>
        Number(right.reusable) - Number(left.reusable) ||
        right.comparable - left.comparable ||
        left.kind.localeCompare(right.kind),
    );

  const reusable = patterns.filter((pattern) => pattern.reusable);
  const reusableGuidance = reusable.length
    ? `Previously verified intervention patterns: ${reusable
        .map((pattern) => pattern.kind)
        .join(", ")}. Treat these as player-specific priors, preserve legality and identity, and retest every new deck.`
    : "No intervention has earned reuse yet. Build from the current Blueprint and collect controlled before/after evidence.";

  return Object.freeze({
    experiments: Object.freeze(experiments.map((experiment) => Object.freeze(experiment))),
    patterns: Object.freeze(patterns.map((pattern) => Object.freeze(pattern))),
    reusable: Object.freeze(reusable.map((pattern) => Object.freeze({ ...pattern }))),
    reusableGuidance,
    evidenceBoundary:
      "MetaForge never rewrites its own rules from one result. It prefers repeated before/after observations of the intervention's named target; otherwise it requires four matches before and after. The same kind must improve twice before it becomes a reusable player prior.",
  });
}

export const FORGE_INTERVENTION_MIN_SAMPLE = MIN_REVISION_SAMPLE;
