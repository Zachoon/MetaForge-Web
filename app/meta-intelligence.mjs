import SNAPSHOT from "./meta-snapshot.mjs";

export function getMetaIntelligence(options = {}) {
  const current = SNAPSHOT.current;
  const historical = SNAPSHOT.historicalPrior;
  const now = options.now ? new Date(options.now) : new Date();
  const observed = new Date(`${current.provenance.observedAt}T00:00:00Z`);
  const ageDays = Math.max(0, Math.floor((now.getTime() - observed.getTime()) / 86400000));
  const freshness = ageDays <= 7 ? "fresh" : ageDays <= 21 ? "aging" : "stale";
  const coverageReady = current.sampleSize >= 100 && current.classificationCoverage >= 0.7;
  const readyForCurrentFieldUse = coverageReady && freshness !== "stale";
  const majority = readyForCurrentFieldUse && SNAPSHOT.readyForCurrentMajorityClaim ? current.majority : null;
  const leadingStrategy = readyForCurrentFieldUse ? current.leadingStrategy : null;
  const historicalMajority = historical.majority;
  const warning = majority
    ? null
    : readyForCurrentFieldUse
      ? `${leadingStrategy} is the largest measured strategic family, but its ${(current.strategies[0].share * 100).toFixed(1)}% share is a plurality—not a majority.`
      : `Only ${current.sampleSize} usable current decklists are available; that is not enough to identify today’s field.`;
  const boundedWarning = !readyForCurrentFieldUse && freshness === "stale"
    ? `The latest measured field is ${ageDays} days old. Treat it as historical context until the collector refreshes.`
    : warning;
  return {
    ...SNAPSHOT,
    current: { ...current, ageDays, freshness },
    readyForCurrentFieldUse,
    majority,
    leadingStrategy,
    historicalMajority,
    warning: boundedWarning,
    generatorGate: readyForCurrentFieldUse ? (freshness === "fresh" ? "fresh-field-open" : "aging-field-caution") : "historical-only",
    recommendation: readyForCurrentFieldUse
      ? `Generate candidates that pressure the leading ${leadingStrategy.toLocaleLowerCase()} family while retaining game against the rest of the mixed field.`
      : `Use the ${historical.sampleSize}-deck historical field as a prior, but do not publish a current-field counter until fresh coverage improves.`,
  };
}
