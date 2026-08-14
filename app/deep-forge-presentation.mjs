// =============================================================================
// Deep Forge presentation — player language over research dossiers
// =============================================================================
// Presentation only. Does not change Brain, hypotheses, or evidence records.
// Default view: what MetaForge noticed / what it could mean / confidence /
// what would prove this wrong. Raw research stays one click beneath.
// writesToBrain: false
// =============================================================================

import { playerFacingHypothesisLine } from "./strategic-stance-voice.mjs";

const freeze = (value) => Object.freeze(value);
const clean = (value = "") => String(value || "").replace(/\s+/g, " ").trim();

const CONFIDENCE_COPY = freeze({
  high: "High confidence — repeated signals point the same way.",
  moderate: "Moderate confidence — useful to notice, not a finished rule.",
  limited: "Limited confidence — early signal only.",
  low: "Low confidence — treat this as a question, not an answer.",
  insufficient: "Insufficient evidence — MetaForge will not invent a conclusion.",
  unknown: "Confidence is unclear from the available record.",
});

const EVIDENCE_STRENGTH = freeze({
  high: "strong",
  medium: "moderate",
  low: "limited",
  none: "none",
});

const FORBIDDEN_PLAYER_TOKENS = /curveLow|curveHigh|shadow classification|Brain inheritance|converter cohorts|modality copy|structural seat|brain_agrees|brain_missing|Level-A/i;

function strengthWord(value) {
  const key = clean(value).toLowerCase();
  return EVIDENCE_STRENGTH[key] || (key || "unknown");
}

function confidenceCopy(confidence) {
  const level = clean(confidence?.level || "unknown").toLowerCase();
  return CONFIDENCE_COPY[level] || CONFIDENCE_COPY.unknown;
}

function translateResearchPhrase(text = "") {
  let line = clean(text);
  if (!line) return "";
  line = line
    .replace(/Elite converter structure surfaces\s*"?curveLow"?\s*as strategically meaningful[^.]*/gi,
      "Strong tournament lists often care about how many cheap early plays they run")
    .replace(/Brain v1 does not encode it as a construction concept/gi,
      "MetaForge does not yet treat that as a hard build rule")
    .replace(/elite converters?/gi, "high-finishing lists")
    .replace(/converter cohorts/gi, "groups of strong tournament lists")
    .replace(/Level-A\s*\/\s*converter cohorts/gi, "controlled tournament comparisons")
    .replace(/Level-A cohorts/gi, "controlled tournament comparisons")
    .replace(/measurable curveLow effects/gi, "a real advantage from cheaper early plays")
    .replace(/curveLow effects/gi, "cheap early-play density")
    .replace(/\bcurveLow\b/gi, "cheap early plays")
    .replace(/\bcurveHigh\b/gi, "expensive top-end cards")
    .replace(/shadow classification flips to brain_agrees on holdout/gi,
      "later checks show MetaForge already builds this way on held-out lists")
    .replace(/shadow classification/gi, "research comparison status")
    .replace(/without Brain inheritance/gi, "without changing how MetaForge builds decks")
    .replace(/Brain inheritance/gi, "changing how MetaForge builds decks")
    .replace(/Not a modal 99 copy — a structural seat Brain may be under-preparing for\./gi,
      "This is not about copying a popular list — it may be a role the deck still under-prepares for.")
    .replace(/structural seat/gi, "important deck role")
    .replace(/modality copy/gi, "copying a popular list shape")
    .replace(/concept not found in Brain v1 encoded surfaces/gi,
      "MetaForge does not currently build around this as an explicit rule")
    .replace(/shadowConfidence=([0-9.]+)/gi, "research comparison strength=$1")
    .replace(/independentExperts=(\d+)/gi, "$1 independent expert sources")
    .replace(/authors=/gi, "sources=")
    .replace(/observation-only, not Brain behavior/gi, "observation only — not a build rule yet")
    .replace(/Naming is not promotion\.?/gi, "Naming something does not make it a build rule.")
    .replace(/Not Brain construction\.?/gi, "This does not change how decks are built.")
    .replace(/Concepts can be retired\.?/gi, "These ideas can be retired if later evidence disagrees.");
  if (!/[.!?]$/.test(line)) line += ".";
  return line;
}

function evidenceSourcesSummary(evidence = {}) {
  const parts = [];
  const tournament = strengthWord(evidence.tournament);
  const experts = strengthWord(evidence.experts);
  const shadow = strengthWord(evidence.shadow);
  const simulation = strengthWord(evidence.simulation);
  const fixtures = evidence.fixtures;
  if (tournament && tournament !== "none" && tournament !== "unknown") {
    parts.push(`tournament signal: ${tournament}`);
  }
  if (experts && experts !== "none" && experts !== "unknown") {
    parts.push(`expert signal: ${experts}`);
  }
  if (shadow && shadow !== "none" && shadow !== "unknown") {
    parts.push(`research comparison: ${shadow}`);
  }
  if (simulation && simulation !== "none" && simulation !== "unknown") {
    parts.push(`simulation signal: ${simulation}`);
  }
  if (Number.isFinite(Number(fixtures)) && Number(fixtures) > 0) {
    parts.push(`fixture checks: ${Number(fixtures)}`);
  }
  if (!parts.length) {
    return "No supporting evidence streams are recorded yet — MetaForge is not treating absence as support.";
  }
  return parts.join(" · ");
}

function meaningFromEntry(entry) {
  if (entry.state === "contradicted") {
    return "Successful pilots still disagree here. Treat this as a live fork, not settled truth.";
  }
  if (entry.state === "retired") {
    return "MetaForge previously believed this, then retired it. It stays visible so the history is honest.";
  }
  if (entry.uniquenessAngle) {
    return translateResearchPhrase(entry.uniquenessAngle);
  }
  if (entry.description) {
    return translateResearchPhrase(entry.description);
  }
  return "If this holds up, games may feel smoother when the deck prepares for that role early.";
}

function falsifiersFrom(entry) {
  const criteria = Array.isArray(entry.retirementCriteria) ? entry.retirementCriteria : [];
  const translated = criteria.map(translateResearchPhrase).filter(Boolean);
  if (translated.length) return freeze(translated);
  return freeze(["Later evidence contradicts this reading, or stronger independent signals fail to appear."]);
}

function playerBadge(entry) {
  const state = entry.state || entry.status || "emerging";
  if (state === "strongly_supported") return "Worth trusting";
  if (state === "contradicted") return "Still contested";
  if (state === "retired") return "Retired for now";
  return "Worth noticing";
}

/**
 * Translate one understanding (hypothesis) research entry into player fields.
 */
export function presentDeepForgeUnderstandingEntry(entry = {}) {
  const noticed = playerFacingHypothesisLine(entry)
    || translateResearchPhrase(entry.claim)
    || "MetaForge noticed a pattern worth watching.";
  const researchNotes = (entry.evidence?.notes || []).map(translateResearchPhrase).filter(Boolean);
  return freeze({
    id: entry.id,
    kind: "understanding",
    badge: playerBadge(entry),
    state: entry.state || null,
    noticed,
    meaning: meaningFromEntry(entry),
    confidence: confidenceCopy(entry.confidence),
    confidenceLevel: clean(entry.confidence?.level || "unknown"),
    proveWrong: falsifiersFrom(entry),
    evidenceSummary: evidenceSourcesSummary(entry.evidence),
    research: freeze({
      claim: entry.claim || null,
      badgeTitle: entry.badge?.title || entry.state || null,
      evidence: entry.evidence || null,
      notes: freeze(researchNotes),
      prediction: entry.prediction || null,
      retirementCriteria: freeze([...(entry.retirementCriteria || [])]),
      uniquenessAngle: entry.uniquenessAngle || null,
      confidence: entry.confidence || null,
      brainInheritance: entry.brainInheritance ?? "none",
      sources: freeze([...(entry.sources || [])]),
    }),
  });
}

/**
 * Translate one strategic-principle research entry into player fields.
 */
export function presentDeepForgePrincipleEntry(entry = {}) {
  const noticed = translateResearchPhrase(entry.name)
    || "A strategic principle MetaForge is watching.";
  const meaning = translateResearchPhrase(entry.description)
    || ((entry.implementations || []).length
      ? `In practice this often shows up as: ${(entry.implementations || []).slice(0, 3).join(", ")}.`
      : "MetaForge is watching whether this principle stays useful across decks.");
  return freeze({
    id: entry.id,
    kind: "principle",
    badge: playerBadge(entry),
    state: entry.status || entry.state || null,
    noticed,
    meaning,
    confidence: confidenceCopy(entry.confidence),
    confidenceLevel: clean(entry.confidence?.level || "unknown"),
    proveWrong: falsifiersFrom(entry),
    evidenceSummary: evidenceSourcesSummary(entry.evidence),
    implementations: freeze([...(entry.implementations || [])].slice(0, 6)),
    research: freeze({
      name: entry.name || null,
      description: entry.description || null,
      badgeTitle: entry.badge?.title || entry.status || null,
      evidence: entry.evidence || null,
      implementations: freeze([...(entry.implementations || [])]),
      predictions: entry.predictions || null,
      retirementCriteria: freeze([...(entry.retirementCriteria || [])]),
      confidence: entry.confidence || null,
      brainInheritance: entry.brainInheritance ?? "none",
    }),
  });
}

export function presentDeepForgeUnderstanding(dossier = null) {
  if (!dossier?.entries?.length) return null;
  return freeze({
    writesToBrain: false,
    version: "deep-forge-presentation-v1",
    title: "What MetaForge noticed",
    note: "Player language first. Research details stay available underneath — and absence of evidence is never treated as support.",
    entries: freeze(dossier.entries.map(presentDeepForgeUnderstandingEntry)),
    retiredEntries: freeze((dossier.retiredEntries || []).map((entry) => freeze({
      id: entry.id,
      badge: playerBadge(entry),
      noticed: playerFacingHypothesisLine(entry) || translateResearchPhrase(entry.claim) || entry.claim,
      whyBelieved: freeze((entry.whyBelieved || []).map(translateResearchPhrase)),
      whyRetired: freeze((entry.whyRetired || []).map(translateResearchPhrase)),
      research: freeze({
        claim: entry.claim || null,
        whyBelieved: freeze([...(entry.whyBelieved || [])]),
        whyRetired: freeze([...(entry.whyRetired || [])]),
        badgeTitle: entry.badge?.title || "Retired",
      }),
    }))),
  });
}

export function presentDeepForgePrinciples(dossier = null) {
  if (!dossier?.entries?.length) return null;
  return freeze({
    writesToBrain: false,
    version: "deep-forge-presentation-v1",
    title: "Principles MetaForge is watching",
    note: "These are research ideas about how decks behave — not automatic build rules.",
    entries: freeze(dossier.entries.map(presentDeepForgePrincipleEntry)),
  });
}

/** True when a string still contains developer-facing research vocabulary. */
export function containsResearchJargon(text = "") {
  return FORBIDDEN_PLAYER_TOKENS.test(String(text || ""));
}
