// =============================================================================
// Pre-Choice Coaching — Founder Issue #022
// =============================================================================
// Presentation only. Confidence before commitment.
// Answers "I don't like not seeing what I'm choosing" with build identity /
// personality / tradeoffs — not scores-first, not a spreadsheet.
// Full card diffs stay behind Compare Details. Does not change Brain.
// =============================================================================

import { buildPhilosophyStanceVoice } from "./strategic-stance-voice.mjs";
import { buildPhilosophyConceptVoice } from "./concept-stance-voice.mjs";

const freeze = (value) => Object.freeze(value);

const SCORE_DELTA = 4;
const KEY_DIFF_LIMIT = 4;

/** Temper → pre-choice coaching voice (friend-length, not metrics). */
const TEMPER_IDENTITY = freeze({
  resilient: freeze({
    builtForPlayersWho: "want to survive interaction and gradually take over longer games",
    prioritizes: freeze(["Consistency", "Interaction", "Stable mana"]),
    feel: "Forgiving. Strong even after setbacks.",
    expectedTradeoff: "You'll usually win later than the more explosive builds.",
    whyBuilt: "Prioritized consistency over explosiveness.",
    pitch: "Built for longer games.",
  }),
  precision: freeze({
    builtForPlayersWho: "like forcing opponents to answer them immediately",
    prioritizes: freeze(["Fast pressure", "High ceiling", "Aggressive sequencing"]),
    feel: "High risk, high reward.",
    expectedTradeoff: "Recovery after disruption is much harder.",
    whyBuilt: "Prioritized a cleaner curve and sequencing.",
    pitch: "Built to win on schedule.",
  }),
  synergy: freeze({
    builtForPlayersWho: "want to maximize commander triggers and interlocking pieces",
    prioritizes: freeze(["Commander synergy", "Engine density", "Tight sequencing"]),
    feel: "Highest ceiling when the engine clicks.",
    expectedTradeoff: "Lower floor if sequencing slips.",
    whyBuilt: "Prioritized interlocking synergy over flexible answers.",
    pitch: "Built around commander interactions.",
  }),
  imported: freeze({
    builtForPlayersWho: "want their own list refined, not replaced",
    prioritizes: freeze(["Your card choices", "Legality", "Familiar lines"]),
    feel: "Closest to what you already brought.",
    expectedTradeoff: "Less tournament exploration than a from-scratch forge.",
    whyBuilt: "Preserved your submitted list as closely as legality allowed.",
    pitch: "Built from your submitted list.",
  }),
  default: freeze({
    builtForPlayersWho: "want another philosophy on the same ask",
    prioritizes: freeze(["Structural alternate", "Same commission", "Different temper"]),
    feel: "Same rules, different personality.",
    expectedTradeoff: "Tradeoffs depend on the table.",
    whyBuilt: "A structural alternate on the same commission.",
    pitch: "A structural alternate on this commission.",
  }),
});

function normalizeName(name = "") {
  return String(name || "")
    .toLocaleLowerCase("en")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function temperKey(label = "") {
  if (/Resilient/i.test(label)) return "resilient";
  if (/Precision/i.test(label)) return "precision";
  if (/Synergy|Cohesion/i.test(label)) return "synergy";
  if (/Your List|Imported/i.test(label)) return "imported";
  return "default";
}

export function identityForLabel(label = "") {
  return TEMPER_IDENTITY[temperKey(label)] || TEMPER_IDENTITY.default;
}

function spellNames(candidate = {}) {
  return (candidate.rows || [])
    .filter((row) => {
      const name = String(row?.name || "").trim();
      if (!name) return false;
      const type = String(row?.typeLine || row?.type_line || "");
      if (type && /\bLand\b/i.test(type) && !/\bCreature\b|\bArtifact\b|\bEnchantment\b/i.test(type)) {
        return false;
      }
      return true;
    })
    .map((row) => String(row.name).trim());
}

function nameSet(candidate) {
  return new Set(spellNames(candidate).map(normalizeName));
}

function displayNamesForKeys(candidate, keys) {
  const byKey = new Map();
  for (const name of spellNames(candidate)) {
    byKey.set(normalizeName(name), name);
  }
  return keys.map((key) => byKey.get(key)).filter(Boolean);
}

function tradeoffsVersus(candidate, baseline) {
  if (!baseline || candidate.id === baseline.id) {
    return tradeoffsVersusPeers(candidate);
  }
  const a = candidate.evaluation || {};
  const b = baseline.evaluation || {};
  const lines = [];

  const push = (delta, plus, minus) => {
    if (delta >= SCORE_DELTA) lines.push(plus);
    else if (delta <= -SCORE_DELTA) lines.push(minus);
  };

  push(
    Number(a.resilience) - Number(b.resilience),
    "+ Better against removal",
    "- Softer against removal",
  );
  push(
    Number(a.curveHealth) - Number(b.curveHealth),
    "+ Cleaner curve",
    "- Slightly slower starts",
  );
  push(
    Number(a.cohesion) - Number(b.cohesion),
    "+ Tighter synergy",
    "- Looser synergy",
  );

  if (!lines.length) {
    const identity = identityForLabel(candidate.label);
    lines.push(`+ ${identity.feel.split(".")[0]}`);
    lines.push(`− ${identity.expectedTradeoff}`);
  }

  return freeze(lines.slice(0, 3));
}

function tradeoffsVersusPeers(candidate) {
  const identity = identityForLabel(candidate.label);
  if (/Resilient/i.test(candidate.label)) {
    return freeze(["+ Better against removal", "- Slightly less explosive"]);
  }
  if (/Precision/i.test(candidate.label)) {
    return freeze(["+ Cleaner curve", "- Fewer flex answers"]);
  }
  if (/Synergy|Cohesion/i.test(candidate.label)) {
    return freeze(["+ Tighter synergy", "- Less resilient if the engine breaks"]);
  }
  return freeze([`+ ${identity.feel.split(".")[0]}`, `− ${identity.expectedTradeoff}`]);
}

function keyDifferences(candidate, baseline) {
  if (!baseline || candidate.id === baseline.id) {
    return freeze({ adds: freeze([]), cuts: freeze([]), versus: null });
  }
  const mine = nameSet(candidate);
  const theirs = nameSet(baseline);
  const addKeys = [...mine].filter((key) => !theirs.has(key)).slice(0, KEY_DIFF_LIMIT);
  const cutKeys = [...theirs].filter((key) => !mine.has(key)).slice(0, KEY_DIFF_LIMIT);
  return freeze({
    adds: freeze(displayNamesForKeys(candidate, addKeys)),
    cuts: freeze(displayNamesForKeys(baseline, cutKeys)),
    versus: baseline.label || baseline.id,
  });
}

function fullCardDiff(candidate, baseline) {
  if (!baseline || candidate.id === baseline.id) {
    return freeze({ adds: freeze([]), cuts: freeze([]), versus: null });
  }
  const mine = nameSet(candidate);
  const theirs = nameSet(baseline);
  const addKeys = [...mine].filter((key) => !theirs.has(key));
  const cutKeys = [...theirs].filter((key) => !mine.has(key));
  return freeze({
    adds: freeze(displayNamesForKeys(candidate, addKeys)),
    cuts: freeze(displayNamesForKeys(baseline, cutKeys)),
    versus: baseline.label || baseline.id,
  });
}

/**
 * Pre-choice coaching cards for candidate builds.
 * Alias kept: buildStrategyBuildComparison
 */
export function buildPreChoiceCoaching({
  candidates = [],
  recommendedId = "",
  commanderName = "",
  stanceVoice = null,
  fantasyLabel = "",
  philosophyLabel = "",
  priorities = [],
} = {}) {
  const list = Array.isArray(candidates) ? candidates.filter(Boolean) : [];
  const recommended =
    list.find((entry) => entry.id === recommendedId) || list[0] || null;

  // Resolve philosophy voice once per session (optional). Never a "Strategic Stance" section.
  const philosophyVoice = stanceVoice?.philosophy
    || (commanderName
      ? buildPhilosophyStanceVoice({ commanderName })
      : null);
  const conceptVoice = stanceVoice?.philosophyConcept
    || buildPhilosophyConceptVoice({
      fantasyLabel: fantasyLabel || philosophyLabel || "",
      priorities,
    });

  const builds = list.map((candidate) => {
    const baseline =
      recommended && candidate.id !== recommended.id
        ? recommended
        : list.find((entry) => entry.id !== candidate.id) || null;
    const evaluation = candidate.evaluation || {};
    const identity = identityForLabel(candidate.label);
    const diffs = keyDifferences(candidate, baseline);
    const full = fullCardDiff(candidate, baseline);
    const understanding = philosophyVoice
      || buildPhilosophyStanceVoice({
        commanderName,
        philosophyLabel: candidate.label || "",
      });
    const principle = conceptVoice
      || buildPhilosophyConceptVoice({
        fantasyLabel: fantasyLabel || candidate.label || "",
        priorities,
      });

    return freeze({
      id: candidate.id,
      label: candidate.label || "Build",
      recommended: Boolean(recommended && candidate.id === recommended.id),
      builtForPlayersWho: identity.builtForPlayersWho,
      prioritizes: freeze([...(identity.prioritizes || [])]),
      feel: identity.feel,
      expectedTradeoff: identity.expectedTradeoff,
      whyBuilt: identity.whyBuilt,
      pitch: identity.pitch,
      // Stance voice permeates context — not a titled section
      currentUnderstanding: understanding
        ? freeze({
            badge: understanding.badge?.title || null,
            paragraph: understanding.paragraph,
            whyWeBelieve: understanding.whyWeBelieve,
            whatWouldChangeOurMind: understanding.whatWouldChangeOurMind,
          })
        : null,
      // Era 2.1 concept voice — principle, not a "Strategic Concepts" panel
      principleUnderstanding: principle
        ? freeze({
            badge: principle.badge?.title || null,
            paragraph: principle.paragraph,
            conceptId: principle.conceptId || null,
            whyWeBelieve: principle.whyWeBelieve,
            whatWouldChangeOurMind: principle.whatWouldChangeOurMind,
          })
        : null,
      // Secondary — compare details / power users
      scores: freeze({
        cohesion: Number(evaluation.cohesion) || null,
        resilience: Number(evaluation.resilience) || null,
        curveHealth: Number(evaluation.curveHealth) || null,
      }),
      tradeoffs: tradeoffsVersus(candidate, baseline),
      keyDifferences: diffs,
      fullComparison: full,
      boundary: candidate.boundary || null,
    });
  });

  return freeze({
    writesToBrain: false,
    version: "pre-choice-coaching-v1.1",
    principle:
      "The Forge should explain enough for a player to choose confidently before asking them to commit to a build.",
    recommendedId: recommended?.id || null,
    builds: freeze(builds),
  });
}

/** @deprecated Prefer buildPreChoiceCoaching — same output. */
export function buildStrategyBuildComparison(args) {
  return buildPreChoiceCoaching(args);
}
