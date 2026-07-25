// MetaForge Player Identity Resolver
// Aggregates real, already-recorded signals into one deterministic sigil —
// deliberately not an XP system. Every axis traces back to counted evidence
// (computeMastery, saved commander colors, motif weights the player has
// already revealed by inspecting their own decks) and is honest when a
// signal doesn't have enough evidence yet, rather than guessing.

import { computeMastery } from "./forge-mastery.mjs";
import { COLOR_ACCENT } from "./masterwork-visual-profile.mjs";

const round = (value, digits = 3) => Number(Number(value || 0).toFixed(digits));

// Ordered so `depth` (how many have been reached) is meaningful as a count —
// each one is a real, already-counted fact, not an arbitrary point value.
const MILESTONES = Object.freeze([
  { id: "first-spark", label: "First Spark", test: (m) => m.experimentsAccepted >= 1 || m.totalMatches >= 1 },
  { id: "first-masterwork", label: "First Finished Masterwork", test: (m) => m.finished >= 1 },
  { id: "five-experiments", label: "Five Experiments Tested", test: (m) => m.experimentsAccepted >= 5 },
  { id: "ten-matches", label: "Ten Matches Recorded", test: (m) => m.totalMatches >= 10 },
  { id: "three-masterworks", label: "Three Finished Masterworks", test: (m) => m.finished >= 3 },
  { id: "three-identities", label: "Three Strategic Identities", test: (m) => m.distinctStrategies >= 3 },
  { id: "twentyfive-experiments", label: "Twenty-Five Experiments Tested", test: (m) => m.experimentsAccepted >= 25 },
  { id: "twentyfive-matches", label: "Twenty-Five Matches Recorded", test: (m) => m.totalMatches >= 25 },
]);

function resolveDominantColors(families) {
  const counts = {};
  for (const family of families) {
    for (const color of family.commander?.colors || []) {
      if (!COLOR_ACCENT[color]) continue;
      counts[color] = (counts[color] || 0) + 1;
    }
  }
  const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return ranked.slice(0, 2).map(([color]) => color);
}

function resolveAccent(dominantColors) {
  if (!dominantColors.length) return COLOR_ACCENT.C;
  return COLOR_ACCENT[dominantColors[0]];
}

// motifWeightsByFamily: { [familyId]: { [motif]: weight } } — populated only
// for decks the player has actually opened (the profile's existing lazy
// structural-inspection flow), so "not enough explored yet" is genuinely
// true, not a stand-in for a slow fetch.
function resolveDominantMotif(motifWeightsByFamily) {
  const familyWeights = Object.values(motifWeightsByFamily || {});
  if (!familyWeights.length) return { dominantMotif: null, motifWeights: null };
  const combined = {};
  for (const weights of familyWeights) {
    for (const [motif, weight] of Object.entries(weights)) {
      combined[motif] = (combined[motif] || 0) + Number(weight || 0);
    }
  }
  const total = Object.values(combined).reduce((sum, value) => sum + value, 0) || 1;
  const normalized = Object.fromEntries(Object.entries(combined).map(([motif, value]) => [motif, round(value / total)]));
  const [dominantMotif] = Object.entries(normalized).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0] || [null];
  return { dominantMotif: dominantMotif || null, motifWeights: normalized };
}

function resolveStyle(mastery, familyCount) {
  if (!familyCount) return null;
  const avgExperiments = mastery.experimentsAccepted / familyCount;
  if (avgExperiments < 0.5) return "curator";
  if (avgExperiments < 2) return "explorer";
  return "tinkerer";
}

// Mirrors the four-game floor already used elsewhere in the app before a
// matchup read is trusted (revision-learning.mjs) — a win rate from fewer
// games than that is noise, not a temper.
function resolveTemper(mastery) {
  if (mastery.totalMatches < 4) return "unproven";
  const winRate = mastery.wins / mastery.totalMatches;
  if (winRate >= 0.6) return "tempered";
  if (winRate >= 0.4) return "balanced";
  return "hard-fought";
}

export function computePlayerIdentity({ families = [], motifWeightsByFamily = {} } = {}) {
  const mastery = computeMastery(families);
  const dominantColors = resolveDominantColors(families);
  const { dominantMotif, motifWeights } = resolveDominantMotif(motifWeightsByFamily);
  const allMilestones = MILESTONES.map((milestone) => ({
    id: milestone.id,
    label: milestone.label,
    reached: milestone.test(mastery),
  }));
  const milestonesReached = allMilestones.filter((milestone) => milestone.reached);
  const nextMilestone = allMilestones.find((milestone) => !milestone.reached) || null;

  return Object.freeze({
    mastery,
    accent: resolveAccent(dominantColors),
    dominantColors,
    dominantMotif,
    motifWeights,
    style: resolveStyle(mastery, families.length),
    temper: resolveTemper(mastery),
    depth: milestonesReached.length,
    allMilestones,
    milestonesReached: milestonesReached.map((m) => ({ id: m.id, label: m.label })),
    nextMilestone: nextMilestone ? { id: nextMilestone.id, label: nextMilestone.label } : null,
  });
}
