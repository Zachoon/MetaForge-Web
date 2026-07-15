import { evaluateExperiment } from "./experiment-evidence.mjs";
import { classifyRevealedOpponent } from "./opponent-classifier.mjs";

export const DECK_BENCH_STORAGE_KEY = "metaforge.deckBench.v1";

export function emptyDeckBench() {
  return { schemaVersion: 1, families: [] };
}

export function readDeckBench(value) {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return parsed?.schemaVersion === 1 && Array.isArray(parsed.families) ? parsed : emptyDeckBench();
  } catch {
    return emptyDeckBench();
  }
}

export function recordExperiment(bench, experiment, format = "Standard") {
  const next = structuredClone(bench);
  let family = next.families.find((item) => item.name.toLowerCase() === experiment.deckName.toLowerCase() && item.format === format);
  if (!family) {
    family = { id: crypto.randomUUID(), name: experiment.deckName, format, createdAt: experiment.startedAt, archived: false, promotedFingerprint: experiment.originalFingerprint, revisions: [] };
    next.families.push(family);
  }
  const addRevision = (fingerprint, deckText, source, parentFingerprint) => {
    if (!fingerprint || family.revisions.some((revision) => revision.fingerprint === fingerprint)) return;
    family.revisions.push({ id: crypto.randomUUID(), version: family.revisions.length + 1, fingerprint, deckText, source, parentFingerprint, experimentId: experiment.id, createdAt: experiment.startedAt, decision: source === "original" ? "baseline" : experiment.status, matches: [] });
  };
  addRevision(experiment.originalFingerprint, experiment.originalDeck, "original", null);
  addRevision(experiment.proposedFingerprint, experiment.proposedDeck, "forge", experiment.originalFingerprint);
  const proposed = family.revisions.find((revision) => revision.fingerprint === experiment.proposedFingerprint);
  if (proposed) proposed.decision = experiment.status;
  if (experiment.status === "kept") family.promotedFingerprint = experiment.proposedFingerprint;
  if (experiment.status === "reverted") family.promotedFingerprint = experiment.originalFingerprint;
  return next;
}

export function attachMatches(bench, matches) {
  const next = structuredClone(bench);
  for (const family of next.families) {
    for (const revision of family.revisions) {
      revision.matches = matches.filter((match) => match.deckFingerprint === revision.fingerprint).map((match) => ({ ...match }));
    }
  }
  return next;
}

export function updateFamily(bench, familyId, action, fingerprint) {
  const next = structuredClone(bench);
  const family = next.families.find((item) => item.id === familyId);
  if (!family) return next;
  if (action === "archive") family.archived = true;
  if (action === "restore") family.archived = false;
  if (action === "promote" && family.revisions.some((revision) => revision.fingerprint === fingerprint)) family.promotedFingerprint = fingerprint;
  return next;
}

export function revisionEvidence(revision) {
  const matches = revision.matches || [];
  const evidence = evaluateExperiment(matches);
  const matchups = {};
  for (const match of matches) {
    const label = classifyRevealedOpponent(match.revealedOpponentCards).strategy;
    matchups[label] ||= { wins: 0, losses: 0 };
    matchups[label][match.result === "win" ? "wins" : "losses"] += 1;
  }
  return { ...evidence, matchups };
}

export function rankedFamilies(bench) {
  return bench.families.filter((family) => !family.archived).map((family) => {
    const revisions = family.revisions.map((revision) => ({ ...revision, evidence: revisionEvidence(revision) }));
    revisions.sort((a, b) => b.evidence.posteriorMean - a.evidence.posteriorMean || b.evidence.sampleSize - a.evidence.sampleSize);
    return { ...family, revisions, leader: revisions[0] || null };
  }).sort((a, b) => (b.leader?.evidence.posteriorMean || 0) - (a.leader?.evidence.posteriorMean || 0));
}
