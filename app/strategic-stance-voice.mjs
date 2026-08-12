// =============================================================================
// Strategic Stance Voice — product presentation of Strategic Hypotheses
// =============================================================================
// Stance is a VOICE, not a section. Hypotheses are research objects.
// 90/10 rule: ~90% grounded observation, ~10% forward-looking.
// Request Recognition must never mention hypotheses.
// writesToBrain: false
// =============================================================================

import snapshot from "./knowledge/strategic-hypothesis-snapshot.mjs";
import { presentAsStrategicStance } from "./knowledge/strategic-hypothesis.mjs";
import {
  buildDeepForgeConceptDossier,
  buildHonestCoachConceptVoice,
  buildPhilosophyConceptVoice,
  buildSessionConceptVoice,
} from "./concept-stance-voice.mjs";

const freeze = (value) => Object.freeze(value);

const STATE_BADGE = freeze({
  strongly_supported: freeze({ emoji: "🟢", label: "Strongly Supported" }),
  emerging: freeze({ emoji: "🟡", label: "Current Understanding" }),
  contradicted: freeze({ emoji: "🔴", label: "Contested" }),
  retired: freeze({ emoji: "⚫", label: "Retired Understanding" }),
});

function normalize(value = "") {
  return String(value || "")
    .toLocaleLowerCase("en")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function defaultHypothesisSnapshot() {
  return freeze({
    writesToBrain: false,
    hypotheses: freeze([...(snapshot.hypotheses || [])]),
    counts: freeze({ ...(snapshot.counts || {}) }),
  });
}

export function badgeForHypothesis(hypothesis = null) {
  if (!hypothesis) return null;
  const badge = STATE_BADGE[hypothesis.state] || STATE_BADGE.emerging;
  return freeze({
    ...badge,
    state: hypothesis.state,
    title: `${badge.emoji} ${badge.label}`,
  });
}

/**
 * Pick hypotheses relevant to a commander (or general meta if none match).
 */
export function selectRelevantHypotheses({
  commanderName = "",
  hypotheses = null,
  limit = 2,
} = {}) {
  const pool = hypotheses || defaultHypothesisSnapshot().hypotheses || [];
  const needle = normalize(commanderName);
  const matched = [];
  const general = [];
  for (const hyp of pool) {
    if (hyp.state === "retired") continue;
    const subject = normalize(hyp.subject || "");
    if (needle && subject && (subject.includes(needle) || needle.includes(subject.split(" ")[0] || ""))) {
      matched.push(hyp);
    } else if (!hyp.subject || /curve|sequencing|interaction|shadow|expert/i.test(hyp.subject)) {
      general.push(hyp);
    }
  }
  const picked = [...matched, ...general].slice(0, limit);
  return freeze(picked);
}

/**
 * Philosophy Selection voice — short, coach-like, 90/10.
 * Never titles a section "Strategic Stance".
 */
export function buildPhilosophyStanceVoice({
  commanderName = "",
  philosophyLabel = "",
  hypotheses = null,
} = {}) {
  const [hyp] = selectRelevantHypotheses({ commanderName, hypotheses, limit: 1 });
  if (!hyp) return null;
  const badge = badgeForHypothesis(hyp);
  const stance = presentAsStrategicStance(hyp);
  const observation = groundedObservationLine(hyp, philosophyLabel);
  const forward = hyp.uniquenessAngle
    ? ` We're watching that tradeoff because the evidence is still ${hyp.state === "contradicted" ? "mixed" : hyp.confidence.level}.`
    : hyp.state === "contradicted"
      ? " Tournament evidence is still mixed on which plan settles."
      : "";
  // ~90% observation, ~10% forward (single hedge clause).
  const paragraph = `${observation}${forward}`.trim();

  return freeze({
    writesToBrain: false,
    surface: "philosophy_selection",
    hypothesisId: hyp.id,
    badge,
    leadIn: "Current understanding suggests",
    paragraph,
    whyWeBelieve: freeze(hyp.evidence.notes || []),
    whatWouldChangeOurMind: freeze(hyp.retirementCriteria || []),
    stanceStatement: stance?.statement || null,
  });
}

function groundedObservationLine(hyp, philosophyLabel = "") {
  const claim = String(hyp.claim || "").replace(/\s+/g, " ").trim();
  // Soften research phrasing into coach voice.
  if (hyp.state === "contradicted" && /vs/.test(claim)) {
    const subject = hyp.subject || "this commander";
    return `Current understanding suggests successful ${subject} pilots are still split across competing plans rather than a single settled shell.${philosophyLabel ? ` This philosophy is one of those live branches.` : ""}`;
  }
  if (/spellslinger|threat|ramp|artifacts|tokens/i.test(claim)) {
    return `Current understanding suggests ${claim.replace(/^[^:]+:\s*/, "").replace(/elite converters repeatedly center on /i, "recent high-performing lists often center on ")}.`;
  }
  if (hyp.evidence.tournament === "high") {
    return `Current understanding suggests ${claim.charAt(0).toLowerCase()}${claim.slice(1)}`;
  }
  return `Current understanding suggests ${claim.charAt(0).toLowerCase()}${claim.slice(1)}`;
}

/**
 * Honest Coach — "One thing we're watching" (not a Stance panel).
 */
export function buildHonestCoachWatchingVoice({
  commanderName = "",
  hypotheses = null,
} = {}) {
  const hyps = selectRelevantHypotheses({ commanderName, hypotheses, limit: 2 });
  // Prefer contested / emerging for "watching"
  const hyp = hyps.find((row) => row.state === "contradicted" || row.state === "emerging") || hyps[0];
  if (!hyp) return null;
  const badge = badgeForHypothesis(hyp);
  const observation = hyp.state === "contradicted"
    ? `Current tournament evidence suggests ${hyp.subject} lists still disagree on the primary plan.`
    : `Current tournament evidence suggests ${String(hyp.claim).replace(/^[^:]+:\s*/, "").replace(/\.$/, "")}.`;
  const forward = hyp.prediction?.expectToObserve?.[0]
    ? ` If that holds, we should keep seeing ${String(hyp.prediction.expectToObserve[0]).replace(/^Continued /i, "").toLowerCase()}.`
    : "";

  return freeze({
    writesToBrain: false,
    surface: "honest_coach",
    hypothesisId: hyp.id,
    badge,
    label: "One thing we're watching",
    paragraph: `${observation}${forward}`.trim(),
    whyWeBelieve: freeze(hyp.evidence.notes || []),
    whatWouldChangeOurMind: freeze(hyp.retirementCriteria || []),
  });
}

/**
 * Deep Forge — full research object (evidence, prediction, retirement, contradictions).
 */
export function buildDeepForgeUnderstandingDossier({
  commanderName = "",
  hypotheses = null,
  limit = 3,
} = {}) {
  const hyps = selectRelevantHypotheses({ commanderName, hypotheses, limit });
  if (!hyps.length) return null;
  return freeze({
    writesToBrain: false,
    surface: "deep_forge",
    title: "Current understanding (research)",
    note: "Hypotheses can be retired. This is not Brain construction.",
    entries: freeze(hyps.map((hyp) => freeze({
      id: hyp.id,
      badge: badgeForHypothesis(hyp),
      claim: hyp.claim,
      state: hyp.state,
      evidence: hyp.evidence,
      prediction: hyp.prediction,
      retirementCriteria: hyp.retirementCriteria,
      uniquenessAngle: hyp.uniquenessAngle,
      confidence: hyp.confidence,
      brainInheritance: hyp.brainInheritance,
    }))),
    retiredEntries: freeze(
      (hypotheses || defaultHypothesisSnapshot().hypotheses || [])
        .filter((hyp) => hyp.state === "retired")
        .map((hyp) => freeze({
          id: hyp.id,
          badge: badgeForHypothesis(hyp),
          claim: hyp.claim,
          whyBelieved: freeze(hyp.evidence?.notes || []),
          whyRetired: freeze(hyp.retirementCriteria || []),
        })),
    ),
  });
}

/**
 * Bundle all product voices for a forge session. Request Recognition excluded on purpose.
 * Era 2.1: hypothesis stance + concept stance (both voices, not sections).
 */
export function buildSessionStanceVoice({
  commanderName = "",
  philosophyLabel = "",
  fantasyLabel = "",
  priorities = [],
  hypotheses = null,
} = {}) {
  const pool = hypotheses || defaultHypothesisSnapshot().hypotheses;
  const fantasy = fantasyLabel || philosophyLabel || "";
  const conceptSession = buildSessionConceptVoice({
    fantasyLabel: fantasy,
    priorities,
  });
  return freeze({
    writesToBrain: false,
    version: "strategic-stance-voice-v0.1",
    requestRecognition: freeze({
      includeHypotheses: false,
      includeConcepts: false,
      note: "I heard you — hypotheses and strategic concepts stay out of recognition.",
    }),
    philosophy: buildPhilosophyStanceVoice({ commanderName, philosophyLabel, hypotheses: pool }),
    philosophyConcept: conceptSession.philosophy,
    honestCoach: buildHonestCoachWatchingVoice({ commanderName, hypotheses: pool }),
    honestCoachConcept: conceptSession.honestCoach,
    deepForge: buildDeepForgeUnderstandingDossier({ commanderName, hypotheses: pool }),
    deepForgeConcepts: conceptSession.deepForge,
  });
}

export {
  buildPhilosophyConceptVoice,
  buildHonestCoachConceptVoice,
  buildDeepForgeConceptDossier,
  buildSessionConceptVoice,
};
