export function evaluateExperiment(matches) {
  const sampleSize = matches.length;
  const wins = matches.filter((match) => match.result === "win").length;
  const losses = sampleSize - wins;
  const posteriorMean = (wins + 2) / (sampleSize + 4);
  const z = 1.96;
  const observed = sampleSize ? wins / sampleSize : 0.5;
  const denominator = 1 + z * z / Math.max(sampleSize, 1);
  const center = (observed + z * z / (2 * Math.max(sampleSize, 1))) / denominator;
  const spread = sampleSize ? z * Math.sqrt(observed * (1 - observed) / sampleSize + z * z / (4 * sampleSize * sampleSize)) / denominator : 0.5;
  const interval = [Math.max(0, center - spread), Math.min(1, center + spread)];
  const confidence = sampleSize < 5 ? "early signal" : sampleSize < 12 ? "developing" : sampleSize < 25 ? "meaningful sample" : "strong sample";
  let decision = "continue";
  if (sampleSize >= 8 && interval[1] < 0.5) decision = "challenge";
  else if (sampleSize >= 12 && interval[0] > 0.5) decision = "support";
  else if (sampleSize >= 25 && posteriorMean < 0.47) decision = "retire";
  const narrative = sampleSize === 0
    ? "No Arena matches have been matched to this proposed build yet."
    : decision === "support"
      ? "Observed results now support keeping this strategy in the candidate pool. Continue testing across different matchups."
      : decision === "challenge" || decision === "retire"
        ? "Observed results challenge this strategy. Preserve the record, promote the next candidate, and compare rather than silently rewriting history."
        : `${sampleSize} matched match${sampleSize === 1 ? "" : "es"} remain inconclusive. Continue testing; MetaForge will not convert noise into a deck change.`;
  return { sampleSize, wins, losses, posteriorMean, interval, confidence, decision, narrative };
}
