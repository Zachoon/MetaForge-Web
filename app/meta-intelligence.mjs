import SNAPSHOT from "./meta-snapshot.mjs";

export function getMetaIntelligence() {
  const current = SNAPSHOT.current;
  const historical = SNAPSHOT.historicalPrior;
  const majority = SNAPSHOT.readyForCurrentMajorityClaim ? current.majority : null;
  const historicalMajority = historical.majority;
  const warning = majority ? null : `Only ${current.sampleSize} current decklists are available; that is not enough to identify today’s majority.`;
  return {
    ...SNAPSHOT,
    majority,
    historicalMajority,
    warning,
    generatorGate: majority ? "open" : "historical-only",
    recommendation: majority
      ? `Generate candidates that pressure ${majority.toLocaleLowerCase()} while retaining game against the rest of the field.`
      : `Use the ${historical.sampleSize}-deck historical field as a prior, but do not publish a “current meta counter” until fresh coverage improves.`,
  };
}
