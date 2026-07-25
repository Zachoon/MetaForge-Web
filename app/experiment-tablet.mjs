// MetaForge Evidence-Led Experiment Tablets
// Synthesizes three controlled, card-exact experiments from data the Forge
// already computes elsewhere: the one-slot counterfactual laboratory (exact
// change, test contract, modeled benefit), the causality engine (structural
// pressure point), and the recorded Arena match log (field observation).
// This module invents no new modeling — it only assembles existing evidence
// into the seven-field tablet shape and is honest when evidence is thin.

import { rankOneSlotCounterfactuals } from "./native-one-slot-lab.mjs";
import { evaluateExperiment } from "./experiment-evidence.mjs";
import { motifForRoles } from "./masterwork-visual-profile.mjs";

const normalized = (value = "") => String(value).normalize("NFKC").trim().toLocaleLowerCase("en");

function pressurePointFor(cardName, causalityReport) {
  if (!causalityReport) return null;
  const name = normalized(cardName);
  const criticalNode = causalityReport.criticalNodes?.find((entry) => normalized(entry.name) === name);
  if (criticalNode) {
    return `${criticalNode.name} is a modeled critical node in ${criticalNode.systemName}, with ${criticalNode.collapseRisk ?? 0}/100 modeled collapse risk.`;
  }
  const bottleneck = causalityReport.bottlenecks?.find((entry) => normalized(entry.name) === name);
  if (bottleneck) {
    return `${bottleneck.name} is a modeled bottleneck in ${bottleneck.systemName}, with ${bottleneck.bottleneckScore ?? 0}/100 modeled bottleneck pressure.`;
  }
  if (causalityReport.mostFragileSystem) {
    return causalityReport.headline || `${causalityReport.mostFragileSystem.name} is the current structural-risk hypothesis.`;
  }
  return null;
}

function describeBenefit(delta) {
  const roleCoveragePct = (delta.roleCoverage * 100).toFixed(1);
  const curveSign = delta.curveHealth >= 0 ? "+" : "";
  return `Modeled structural score improves by ${delta.score.toFixed(1)} (role coverage ${delta.roleCoverage >= 0 ? "+" : ""}${roleCoveragePct}%, curve health ${curveSign}${delta.curveHealth.toFixed(1)}).`;
}

function describeTradeoff(delta) {
  if (delta.resilienceDensity < 0) {
    return `Interaction, protection, and recursion density drops by ${Math.abs(delta.resilienceDensity * 100).toFixed(1)}%.`;
  }
  return "No measured resilience-density cost; the open tradeoff is unproven match performance until tested.";
}

// causalityReport: output of buildForgeStructuralAnalysis (forge-causality-engine.mjs), or null.
// matchLog: the array already held in page.tsx state — {result: "win"|"loss", ...}[].
export function buildExperimentTablets({ selected, candidates, causalityReport = null, matchLog = [], options = {} }) {
  const ranked = rankOneSlotCounterfactuals(selected, candidates, options);
  const observation = evaluateExperiment(matchLog);
  const fieldObservation = observation.sampleSize
    ? `${observation.wins}-${observation.losses} across ${observation.sampleSize} recorded match${observation.sampleSize === 1 ? "" : "es"} with this build: ${observation.narrative}`
    : "No Arena matches recorded against this build yet.";

  if (ranked.verdict !== "advance" || !ranked.experiments.length) {
    return { status: "inconclusive", summary: ranked.summary, boundary: ranked.boundary, tablets: [] };
  }

  const tablets = ranked.experiments.map((experiment, index) => ({
    id: `experiment-${index + 1}`,
    fieldObservation,
    pressurePoint: pressurePointFor(experiment.cut, causalityReport)
      || "No structural-risk hypothesis currently isolates this card; the case rests on modeled role coverage and curve.",
    change: { cut: experiment.cut, add: experiment.add },
    // The motif the card being added belongs to (same vocabulary as the deck
    // identity badge) — real, from the engine's own role classification.
    motif: motifForRoles(experiment.addRoles),
    testContract: experiment.contract,
    expectedBenefit: describeBenefit(experiment.delta),
    tradeoff: describeTradeoff(experiment.delta),
    evidenceStatus: observation.confidence,
    summary: experiment.summary,
  }));

  return { status: "advance", summary: ranked.summary, boundary: ranked.boundary, tablets };
}
