const MIN_REVISION_SAMPLE = 4;
const MIN_REPEATED_WINS = 2;

const clamp = (value, minimum = 0, maximum = 1) =>
  Math.min(maximum, Math.max(minimum, Number(value) || 0));

const observedRate = (matches) => {
  if (!matches.length) return 0;
  return matches.filter((match) => match.result === "win").length / matches.length;
};

const revisionMatches = (matches, revision) =>
  matches.filter((match) => Number(match.revision || 1) === Number(revision));

export function learnFromForgeInterventions(interventions = [], matches = []) {
  const experiments = interventions
    .filter((intervention) => intervention?.id && intervention?.kind)
    .map((intervention) => {
      const revision = Math.max(1, Number(intervention.revision) || 1);
      const after = revisionMatches(matches, revision);
      const before = revisionMatches(matches, Math.max(1, revision - 1));
      const afterRate = observedRate(after);
      const beforeRate = observedRate(before);
      const comparable =
        intervention.decision === "accepted" &&
        revision > 1 &&
        before.length >= MIN_REVISION_SAMPLE &&
        after.length >= MIN_REVISION_SAMPLE;
      const delta = comparable ? afterRate - beforeRate : 0;

      return {
        ...intervention,
        revision,
        beforeSample: before.length,
        afterSample: after.length,
        beforeRate: clamp(beforeRate),
        afterRate: clamp(afterRate),
        delta,
        comparable,
        verdict:
          intervention.decision === "dismissed"
            ? "player-declined"
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
      "MetaForge never rewrites its own rules from one result. An intervention needs four matches before and after, and the same kind must improve twice before it becomes a reusable player prior.",
  });
}

export const FORGE_INTERVENTION_MIN_SAMPLE = MIN_REVISION_SAMPLE;
