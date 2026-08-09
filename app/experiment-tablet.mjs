// MetaForge Evidence-Led Experiment Tablets
// Synthesizes three controlled, card-exact experiments from data the Forge
// already computes elsewhere: the one-slot counterfactual laboratory (exact
// change, test contract, modeled benefit), the causality engine (structural
// pressure point), and the recorded Arena match log (field observation).
// This module invents no new modeling — it only assembles existing evidence
// into the seven-field tablet shape and is honest when evidence is thin.

import { rankOneSlotCounterfactuals } from "./native-one-slot-lab.mjs";
import { rankPracticalOneSlotCounterfactuals } from "./native-masterwork-engine.mjs";
import { evaluateExperiment } from "./experiment-evidence.mjs";
import { motifForRoles } from "./masterwork-visual-profile.mjs";
import { learnRevisionPreferences } from "./revision-learning.mjs";

// A free-text revision signal ("I died before I could answer their board")
// is only actionable once it's tied to a role the one-slot lab actually
// tracks. Deliberately narrow: only signals with an unambiguous, defensible
// role mapping are included, so an unmappable preference (curve, mana) is
// silently dropped rather than guessed at.
const PREFERENCE_ROLE_MAP = Object.freeze({
  "more early interaction": "interaction",
  "more card advantage": "draw",
  "more resilience": "protection",
  "more protection": "protection",
});

// What's this deck actually been losing to? Scoped to the single opponent
// archetype with the worst *actionable* (sample >= 4) record, then re-runs
// the same signal classifier used for general revision guidance, but
// filtered to just that matchup's matches — so "more early interaction"
// here means "against this specific opponent," not a vague aggregate.
// Returns null (not an empty/default preference) whenever there isn't yet
// enough recorded evidence, so the one-slot lab's ranking stays exactly as
// it was before this existed until real data actually supports a claim.
function matchupCounterPreference(matchLog) {
  if (!matchLog?.length) return null;
  const overall = learnRevisionPreferences(matchLog, null);
  const worst = [...overall.matchups]
    .filter((matchup) => matchup.actionable)
    .sort((left, right) => left.observedRate - right.observedRate)[0];
  if (!worst) return null;
  const opponentMatches = matchLog.filter((match) => (match.opponent || "Unknown / not sure") === worst.opponent);
  const scoped = learnRevisionPreferences(opponentMatches, null);
  const preferredRoles = [...new Set(
    scoped.actionable.map((pattern) => PREFERENCE_ROLE_MAP[pattern.preference]).filter(Boolean),
  )];
  if (!preferredRoles.length) return null;
  return { opponent: worst.opponent, preferredRoles };
}

const normalized = (value = "") => String(value).normalize("NFKC").trim().toLocaleLowerCase("en");

function pressurePointFor(cardName, causalityReport) {
  if (!causalityReport) return null;
  const name = normalized(cardName);
  const criticalNode = causalityReport.criticalNodes?.find((entry) => normalized(entry.name) === name);
  if (criticalNode) {
    return `${criticalNode.name} appears to be one of the cards ${criticalNode.systemName} leans on most. If it is removed, that part of the plan may be harder to keep working.`;
  }
  const bottleneck = causalityReport.bottlenecks?.find((entry) => normalized(entry.name) === name);
  if (bottleneck) {
    return `${bottleneck.name} is doing an important job in ${bottleneck.systemName} with too few obvious backups.`;
  }
  if (causalityReport.mostFragileSystem) {
    return causalityReport.headline || `${causalityReport.mostFragileSystem.name} is the part of the plan most worth watching when a key card is removed.`;
  }
  return null;
}

function describeBenefit(delta) {
  const roleCoveragePct = (delta.roleCoverage * 100).toFixed(1);
  const curveSign = delta.curveHealth >= 0 ? "+" : "";
  const cohesionNote = delta.cohesion > 0 ? ` More cards now contribute to the same plan (${(delta.cohesion * 100).toFixed(1)}% improvement).` : "";
  return `The replacement covers more of the deck's important jobs (${delta.roleCoverage >= 0 ? "+" : ""}${roleCoveragePct}%) and changes the mana curve by ${curveSign}${delta.curveHealth.toFixed(1)}.${cohesionNote}`;
}

function describeTradeoff(delta) {
  if (delta.resilienceDensity < 0) {
    return `The deck would have ${Math.abs(delta.resilienceDensity * 100).toFixed(1)}% less interaction, protection, and graveyard recovery.`;
  }
  return "No obvious defensive job is lost, but only real games can show whether the change actually feels better.";
}

// causalityReport: output of buildForgeStructuralAnalysis (forge-causality-engine.mjs), or null.
// matchLog: the array already held in page.tsx state — {result: "win"|"loss", ...}[].
// input: the same verified-pool object passed to forgeNativeMasterwork
// (needs .cards, .format, .strategy, .target). Optional — when supplied,
// each theoretically-confident swap also has to clear a real goldfish/
// matchup simulation before it's recommended, not just look better on
// paper (see rankPracticalOneSlotCounterfactuals). Omitted, this falls
// back to exactly today's theoretical-only ranking, unchanged.
export function buildExperimentTablets({ selected, candidates, causalityReport = null, matchLog = [], options = {}, input = null }) {
  const matchupPreference = matchupCounterPreference(matchLog);
  const rankingOptions = matchupPreference
    ? { ...options, preferredRoles: matchupPreference.preferredRoles, matchupOpponent: matchupPreference.opponent }
    : options;
  const ranked = input
    ? rankPracticalOneSlotCounterfactuals(selected, candidates, input, rankingOptions)
    : rankOneSlotCounterfactuals(selected, candidates, rankingOptions);
  const observation = evaluateExperiment(matchLog);
  const fieldObservation = observation.sampleSize
    ? `${observation.wins}-${observation.losses} across ${observation.sampleSize} recorded match${observation.sampleSize === 1 ? "" : "es"} with this build: ${observation.narrative}`
    : "No Arena matches recorded against this build yet.";

  const passed = ranked.verdict === "advance" ? ranked.experiments : [];

  const tablets = passed.map((experiment, index) => ({
    id: `experiment-${index + 1}`,
    type: "experiment",
    // False once the engine has run out of swaps that clear its own quality
    // gate — still a real, distinct candidate, just not a confident one.
    // Surfaced honestly rather than hidden, so players never hit a wall of
    // silence just because nothing left is a slam dunk.
    confident: experiment.confident,
    fieldObservation,
    pressurePoint: pressurePointFor(experiment.cut, causalityReport)
      || "No single weakness points directly at this card. The case for changing it comes from the jobs the replacement covers and where it fits on the mana curve.",
    change: { cut: experiment.cut, add: experiment.add },
    // The motif the card being added belongs to (same vocabulary as the deck
    // identity badge) — real, from the engine's own role classification.
    motif: motifForRoles(experiment.addRoles),
    testContract: experiment.contract,
    expectedBenefit: describeBenefit(experiment.delta),
    tradeoff: experiment.confident
      ? describeTradeoff(experiment.delta)
      : !experiment.gate.passed
        ? `${describeTradeoff(experiment.delta)} Below the Forge's gain threshold: ${experiment.gate.reasons.join(" ")}`
        // Cleared the structural gate but failed the practical simulation
        // check — a real, distinct reason from a plain structural miss,
        // and worth saying so rather than reusing the same gate-reasons
        // phrasing for a different kind of rejection.
        : `${describeTradeoff(experiment.delta)} Cleared the structural gate but failed practical simulation testing: ${experiment.practical?.reasons.join(" ") || "modeled regression detected."}`,
    evidenceStatus: experiment.confident ? observation.confidence : "speculative",
    // Real goldfish/matchup simulation evidence for this exact swap, when
    // an `input` was supplied to buildExperimentTablets — null otherwise
    // (theoretical-only ranking, or a candidate the structural gate
    // already rejected before it was worth spending simulation budget on).
    practicalEvidence: experiment.practical || null,
    matchupRelevant: experiment.matchupRelevant || false,
    matchupNote: experiment.matchupRelevant && matchupPreference
      ? `This card was specifically prioritized because it answers what you've reported losing to against ${matchupPreference.opponent}.`
      : null,
    summary: experiment.summary,
  }));

  // Fewer than three swaps clearing every structural gate isn't a dead end —
  // it's itself a signal. Rather than an empty slot (or none at all), the
  // last position becomes an honest, non-experiment statement: the Forge has
  // no confident case left to make, so sealing the build is the reasonable
  // next move. Never more than one of these — it isn't a real option to pad.
  if (tablets.length < 3) {
    tablets.push({
      id: "confidence",
      type: "confidence",
      headline: tablets.length
        ? "No further structural swap clears the bar."
        : "No structural swap clears the bar right now.",
      detail: `${ranked.summary} That silence is itself a signal: the Forge has no confident case left to make against this build.`,
    });
  }

  return { status: "advance", summary: ranked.summary, boundary: ranked.boundary, tablets };
}
