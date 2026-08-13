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

// Philosophy / coach surfaces speak to players. Deep Forge keeps research badges.
const PLAYER_STATE_BADGE = freeze({
  strongly_supported: freeze({ emoji: "🟢", label: "Worth trusting" }),
  emerging: freeze({ emoji: "🟡", label: "Worth noticing" }),
  contradicted: freeze({ emoji: "🔴", label: "Still contested" }),
  retired: freeze({ emoji: "⚫", label: "Retired for now" }),
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
 * Pick hypotheses relevant to a commander (or general meta if allowed).
 * Philosophy selection should pass includeGeneral:false — otherwise every
 * build gets unrelated lab features like curveLow / Brain-shadow notes.
 */
export function selectRelevantHypotheses({
  commanderName = "",
  hypotheses = null,
  limit = 2,
  includeGeneral = true,
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
    } else if (includeGeneral && (!hyp.subject || /curve|sequencing|interaction|shadow|expert/i.test(hyp.subject))) {
      general.push(hyp);
    }
  }
  const picked = [...matched, ...(includeGeneral ? general : [])].slice(0, limit);
  return freeze(picked);
}

export function playerBadgeForHypothesis(hypothesis = null) {
  if (!hypothesis) return null;
  const badge = PLAYER_STATE_BADGE[hypothesis.state] || PLAYER_STATE_BADGE.emerging;
  return freeze({
    ...badge,
    state: hypothesis.state,
    title: badge.label,
  });
}

/**
 * Translate research claims into Commander-coach language.
 * Keeps the evidence object intact; only changes what players read.
 */
export function playerFacingHypothesisLine(hyp, philosophyLabel = "") {
  const claim = String(hyp?.claim || "").replace(/\s+/g, " ").trim();
  const subject = hyp?.subject || "this commander";
  if (!claim) return null;

  // Internal Brain-shadow / feature-key claims must never reach player UI raw.
  if (/brain v1|brain_missing|curveLow|curveHigh|elite converter structure surfaces/i.test(claim)) {
    if (/curveLow/i.test(claim) || /curveLow/i.test(subject)) {
      return "Strong tournament lists often care about how many cheap early plays they run. MetaForge doesn't force that as a build rule yet — treat it as a feel to check at the table.";
    }
    return "We're still comparing what strong tournament lists do versus what MetaForge currently builds. That gap is something to notice, not a finished rule.";
  }

  if (hyp.state === "contradicted" && /vs/.test(claim)) {
    return `Successful ${subject} pilots are still split across competing plans rather than one settled shell.${philosophyLabel ? ` This philosophy is one of those live branches.` : ""}`;
  }

  let line = claim
    .replace(/^[^:]+:\s*/, "")
    .replace(/elite converters repeatedly center on /gi, "recent high-finishing lists often center on ")
    .replace(/elite converters/gi, "high-finishing lists")
    .replace(/\brole:threat\b/gi, "a clear threat package")
    .replace(/\breplicated in (\d+)\/(\d+) decks\b/gi, "showing up in $1 of $2 recent lists");

  line = line.charAt(0).toUpperCase() + line.slice(1);
  if (!/[.!?]$/.test(line)) line += ".";
  return line;
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
  // Commander-matched only. Generic lab hyps (curveLow, Brain shadow) are
  // research objects for Deep Forge — not copy for "choose this experience."
  const [hyp] = selectRelevantHypotheses({
    commanderName,
    hypotheses,
    limit: 1,
    includeGeneral: false,
  });
  if (!hyp) return null;
  const badge = playerBadgeForHypothesis(hyp);
  const stance = presentAsStrategicStance(hyp);
  const observation = playerFacingHypothesisLine(hyp, philosophyLabel);
  if (!observation) return null;
  const forward = hyp.uniquenessAngle
    ? ` Evidence here is still ${hyp.state === "contradicted" ? "mixed" : hyp.confidence?.level || "early"}.`
    : hyp.state === "contradicted"
      ? " Tournament results still disagree on which plan settles."
      : "";
  const paragraph = `${observation}${forward}`.trim();

  return freeze({
    writesToBrain: false,
    surface: "philosophy_selection",
    hypothesisId: hyp.id,
    badge,
    leadIn: null,
    paragraph,
    whyWeBelieve: freeze(hyp.evidence.notes || []),
    whatWouldChangeOurMind: freeze(hyp.retirementCriteria || []),
    stanceStatement: stance?.statement || null,
  });
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
    ? `${hyp.subject} lists still disagree on the primary plan.`
    : playerFacingHypothesisLine(hyp) || String(hyp.claim || "").trim();
  const forward = hyp.prediction?.expectToObserve?.[0]
    && !/brain|curveLow|elite converter/i.test(String(hyp.prediction.expectToObserve[0]))
    ? ` If that holds, we should keep seeing ${String(hyp.prediction.expectToObserve[0]).replace(/^Continued /i, "").toLowerCase()}.`
    : "";

  return freeze({
    writesToBrain: false,
    surface: "honest_coach",
    hypothesisId: hyp.id,
    badge: playerBadgeForHypothesis(hyp) || badge,
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
