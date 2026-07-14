import SNAPSHOT from "./meta-snapshot.mjs";

export function getMetaIntelligence() {
  const current = SNAPSHOT.current;
  const historical = SNAPSHOT.historicalPrior;
  const majority = SNAPSHOT.readyForCurrentMajorityClaim ? current.majority : null;
  const leadingStrategy = SNAPSHOT.readyForCurrentFieldUse ? current.leadingStrategy : null;
  const historicalMajority = historical.majority;
  const warning = majority
    ? null
    : SNAPSHOT.readyForCurrentFieldUse
      ? `${leadingStrategy} is the largest measured strategic family, but its ${(current.strategies[0].share * 100).toFixed(1)}% share is a plurality—not a majority.`
      : `Only ${current.sampleSize} usable current decklists are available; that is not enough to identify today’s field.`;
  return {
    ...SNAPSHOT,
    majority,
    leadingStrategy,
    historicalMajority,
    warning,
    generatorGate: SNAPSHOT.readyForCurrentFieldUse ? "fresh-field-open" : "historical-only",
    recommendation: SNAPSHOT.readyForCurrentFieldUse
      ? `Generate candidates that pressure the leading ${leadingStrategy.toLocaleLowerCase()} family while retaining game against the rest of the mixed field.`
      : `Use the ${historical.sampleSize}-deck historical field as a prior, but do not publish a current-field counter until fresh coverage improves.`,
  };
}
