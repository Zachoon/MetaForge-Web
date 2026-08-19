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
import { buildCommissionContract } from "./commission-contract.mjs";
import { matchPlayerCompassCandidates, playerCompassFitForTemper } from "./player-compass.mjs";
import { blueprintMechanicDefinition } from "./blueprint-note-and-mana.mjs";

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
    whyBuilt: "This direction kept winning longer games when interaction showed up.",
    pitch: "Built for longer games.",
  }),
  precision: freeze({
    builtForPlayersWho: "like forcing opponents to answer them immediately",
    prioritizes: freeze(["Fast pressure", "High ceiling", "Aggressive sequencing"]),
    feel: "High risk, high reward.",
    expectedTradeoff: "Recovery after disruption is much harder.",
    whyBuilt: "This direction was the clearest way to force answers on a schedule.",
    pitch: "Built to win on schedule.",
  }),
  synergy: freeze({
    builtForPlayersWho: "want to maximize commander triggers and interlocking pieces",
    prioritizes: freeze(["Commander synergy", "Engine density", "Tight sequencing"]),
    feel: "Highest ceiling when the engine clicks.",
    expectedTradeoff: "Lower floor if sequencing slips.",
    whyBuilt: "This direction leaned hardest into the commander's interlocking pieces.",
    pitch: "Built around commander interactions.",
  }),
  imported: freeze({
    builtForPlayersWho: "want their own list refined, not replaced",
    prioritizes: freeze(["Your card choices", "Legality", "Familiar lines"]),
    feel: "Closest to what you already brought.",
    expectedTradeoff: "Less tournament exploration than a from-scratch forge.",
    whyBuilt: "This kept your submitted list as the experience — refined, not replaced.",
    pitch: "Built from your submitted list.",
  }),
  default: freeze({
    builtForPlayersWho: "want another philosophy on the same ask",
    prioritizes: freeze(["Structural alternate", "Same commission", "Different temper"]),
    feel: "Same rules, different personality.",
    expectedTradeoff: "Tradeoffs depend on the table.",
    whyBuilt: "This was the clearest alternate personality on the same commission.",
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

// -----------------------------------------------------------------------
// Grounded, deck-specific copy (Founder Issue #022/#025 follow-up).
// TEMPER_IDENTITY above is a category-shaped fallback ("Engine density",
// "different bet") that reads the same for every deck sharing a temper —
// exactly what player feedback flagged as gobbledygook. Below, the same
// six fields are re-derived per candidate from data the engine already
// computed and already attached to candidate.rows (classifyNativeCard's
// `roles`, and blueprint-note-and-mana.mjs's `blueprintMechanicHits`) plus
// the real added/cut card names keyDifferences already produces. Falls
// back to TEMPER_IDENTITY field-by-field wherever a candidate genuinely
// carries no such data (e.g. unit-test fixtures, or two structurally
// identical builds) — honest-generic rather than fabricated-specific.
// -----------------------------------------------------------------------

const unique = (values) => [...new Set(values.filter(Boolean))];

/** Short noun bullets — "STRONG AT" list voice. */
const ROLE_LABEL = freeze({
  ramp: "Ramp",
  draw: "Card draw",
  interaction: "Interaction",
  protection: "Protection",
  recursion: "Graveyard recursion",
  sweeper: "Board wipes",
  selection: "Card selection",
  tokens: "Token production",
  sacrifice: "Sacrifice value",
  counters: "+1/+1 counters",
  graveyard: "Graveyard value",
  artifacts: "Artifact synergy",
  spells: "Spellslinging",
  lifegain: "Lifegain",
  combat: "Combat triggers",
  discard: "Hand disruption",
  threat: "Big threats",
});

/** Lowercase verb-phrase fragments — "leans on X to ___" / "can ___" voice. */
const ROLE_FEEL = freeze({
  ramp: "ramp into bigger threats early",
  draw: "keep the cards flowing",
  interaction: "answer whatever the table plays",
  protection: "protect its key pieces",
  recursion: "bring threats back from the graveyard",
  sweeper: "wipe the board when it gets out of hand",
  selection: "dig for exactly the right card",
  tokens: "flood the board with tokens",
  sacrifice: "turn permanents into value",
  counters: "grow creatures with +1/+1 counters",
  graveyard: "turn the graveyard into a resource",
  artifacts: "build around artifacts",
  spells: "reward casting instants and sorceries",
  lifegain: "gain life and buy time",
  combat: "punish combat and attacking",
  discard: "strip cards from opponents' hands",
  threat: "close games with real damage",
});

function joinNames(names) {
  const list = (names || []).filter(Boolean);
  if (!list.length) return "";
  if (list.length === 1) return list[0];
  if (list.length === 2) return `${list[0]} and ${list[1]}`;
  return `${list.slice(0, -1).join(", ")}, and ${list[list.length - 1]}`;
}

const capitalize = (text = "") => (text ? text.charAt(0).toUpperCase() + text.slice(1) : text);

function rowsForNames(candidate, names) {
  if (!names?.length) return [];
  const wanted = new Set(names.map(normalizeName));
  return (candidate?.rows || []).filter((row) => wanted.has(normalizeName(row?.name || "")));
}

function rankedTags(rows, field, limit) {
  const counts = new Map();
  for (const row of rows) {
    for (const tag of row?.[field] || []) {
      if (tag === "land" || tag === "commander") continue;
      counts.set(tag, (counts.get(tag) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([tag]) => tag)
    .slice(0, limit);
}

const dominantMechanics = (rows, limit = 2) => rankedTags(rows, "blueprintMechanicHits", limit);
const dominantRoles = (rows, limit = 2) => rankedTags(rows, "roles", limit);

/**
 * What a group of rows actually does, in real terms — prefers the more
 * specific blueprint mechanic tags (e.g. "sacrifice and death payoffs")
 * over the coarser role tags (e.g. "sacrifice"), and returns null (never a
 * guess) when neither is present on these particular rows.
 */
function describeLean(rows) {
  const mechanicIds = dominantMechanics(rows, 2);
  if (mechanicIds.length) {
    return freeze({
      kind: "mechanic",
      ids: mechanicIds,
      text: joinNames(mechanicIds.map((id) => blueprintMechanicDefinition(id).label.toLowerCase())),
    });
  }
  const roleIds = dominantRoles(rows, 2);
  const feelBits = roleIds.map((id) => ROLE_FEEL[id]).filter(Boolean);
  if (feelBits.length) {
    return freeze({ kind: "role", ids: roleIds, text: joinNames(feelBits) });
  }
  return null;
}

function exampleNamesFor(rows, lean, limit = 2) {
  if (!lean) return [];
  const matches = rows.filter((row) => (lean.kind === "mechanic"
    ? (row.blueprintMechanicHits || []).some((id) => lean.ids.includes(id))
    : (row.roles || []).some((id) => lean.ids.includes(id))));
  return matches.map((row) => row.name).filter(Boolean).slice(0, limit);
}

/** Pick the mechanic/role phrasing branch; `none()` covers "cards named, no tag data". */
function phraseForLean(lean, { mechanic, role, none }) {
  if (lean?.kind === "mechanic") return mechanic(lean.text);
  if (lean?.kind === "role") return role(lean.text);
  return none();
}

/**
 * Single-survivor case: no baseline to diff against, so ground against the
 * whole build instead of the (empty) keyDifferences.
 */
function groundedWholeDeckWhyBuilt(candidate) {
  const rows = (candidate?.rows || []).filter((row) => {
    const roles = row?.roles || [];
    return !roles.includes("land") && !roles.includes("commander");
  });
  if (!rows.length) return null;
  const lean = describeLean(rows);
  if (!lean) return null;
  const examples = exampleNamesFor(rows, lean, 2);
  const tail = examples.length ? ` — ${joinNames(examples)} do the heavy lifting.` : ".";
  const body = lean.kind === "mechanic" ? `This build leans on ${lean.text}` : `This build leans on cards that ${lean.text}`;
  return `${body}${tail}`;
}

/**
 * Re-derives the six pre-choice-coaching voice fields from real, already-
 * computed per-candidate data (keyDifferences' card names + candidate.rows'
 * role/mechanic tags) instead of the static per-temper template. Falls
 * back to identityForLabel field-by-field wherever this specific candidate
 * doesn't carry enough real data to say something specific and true.
 */
function groundedIdentity(candidate, baseline, diffs) {
  const fallback = identityForLabel(candidate.label);
  const addCards = (diffs?.adds || []).slice(0, 2);
  const cutCards = (diffs?.cuts || []).slice(0, 2);

  if (!baseline || (!addCards.length && !cutCards.length)) {
    return freeze({
      ...fallback,
      whyBuilt: (!baseline && groundedWholeDeckWhyBuilt(candidate)) || fallback.whyBuilt,
    });
  }

  const addRows = rowsForNames(candidate, diffs.adds);
  const lean = describeLean(addRows);

  const feel = addCards.length
    ? phraseForLean(lean, {
        mechanic: (text) => `Leans on ${joinNames(addCards)} for ${text}.`,
        role: (text) => `Leans on ${joinNames(addCards)} to ${text}.`,
        none: () => `Leans on ${joinNames(addCards)}, the pieces that set it apart from ${baseline.label}.`,
      })
    : fallback.feel;

  const builtForPlayersWho = addCards.length
    ? phraseForLean(lean, {
        mechanic: (text) => `want a deck built around ${text}`,
        role: (text) => `want a deck that can ${text}`,
        none: () => fallback.builtForPlayersWho,
      })
    : fallback.builtForPlayersWho;

  const prioritizes = (() => {
    const mechanics = dominantMechanics(addRows, 3).map((id) => capitalize(blueprintMechanicDefinition(id).label));
    const roles = dominantRoles(addRows, 3).map((id) => ROLE_LABEL[id]).filter(Boolean);
    const bullets = unique([...mechanics, ...roles]).slice(0, 3);
    return bullets.length ? freeze(bullets) : fallback.prioritizes;
  })();

  const cutRows = rowsForNames(baseline, diffs.cuts);
  const cutLean = describeLean(cutRows);
  const expectedTradeoff = cutCards.length
    ? phraseForLean(cutLean, {
        mechanic: (text) => `Skips ${joinNames(cutCards)}, so you'll get less ${text} than ${baseline.label}.`,
        role: (text) => `Skips ${joinNames(cutCards)}, so it won't ${text} the way ${baseline.label} does.`,
        none: () => `Skips ${joinNames(cutCards)}, which ${baseline.label} keeps.`,
      })
    : fallback.expectedTradeoff;

  const whyBuilt = addCards.length
    ? phraseForLean(lean, {
        mechanic: (text) => `This direction leaned into ${text} — ${joinNames(addCards)} carries that plan.`,
        role: (text) => `This direction leaned into cards that ${text} — ${joinNames(addCards)} carries that plan.`,
        none: () => `This direction kept ${joinNames(addCards)}, cards the alternative cuts.`,
      })
    : fallback.whyBuilt;

  const pitchLabel = dominantMechanics(addRows, 1).map((id) => blueprintMechanicDefinition(id).label)[0]
    || dominantRoles(addRows, 1).map((id) => ROLE_LABEL[id]).filter(Boolean)[0]
    || null;
  const pitch = pitchLabel ? `Built around ${pitchLabel.toLowerCase()}.` : fallback.pitch;

  return freeze({ builtForPlayersWho, prioritizes, feel, expectedTradeoff, whyBuilt, pitch });
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

/**
 * "Why not the alternative" must say something a standalone tradeoff line
 * doesn't already say — the actual comparison against the specific build
 * being passed over, not a restated copy of this build's own cost.
 */
function describeWhyNotAlternative(candidate, baseline, tradeoffLines, diffs) {
  if (!baseline || candidate.id === baseline.id) {
    return identityForLabel(candidate.label).whyBuilt;
  }
  const advantages = tradeoffLines
    .filter((line) => line.startsWith("+"))
    .map((line) => line.slice(1).trim().replace(/^./, (c) => c.toLowerCase()));
  if (advantages.length) {
    return `Compared with ${baseline.label}: ${advantages.join(", ")}.`;
  }
  const cutCards = (diffs?.cuts || []).slice(0, 2);
  if (cutCards.length) {
    const cutLean = describeLean(rowsForNames(baseline, cutCards));
    return phraseForLean(cutLean, {
      mechanic: (text) => `${baseline.label} leans on ${text} instead — this build skips ${joinNames(cutCards)}.`,
      role: (text) => `${baseline.label} leans on cards that ${text} instead — this build skips ${joinNames(cutCards)}.`,
      none: () => `${baseline.label} keeps ${joinNames(cutCards)} that this build cuts.`,
    });
  }
  return `${identityForLabel(candidate.label).whyBuilt} ${baseline.label} is built around a different bet.`;
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

function structureAverage(scores = {}) {
  const parts = [scores.cohesion, scores.resilience, scores.curveHealth]
    .map(Number)
    .filter(Number.isFinite);
  if (!parts.length) return null;
  return parts.reduce((sum, value) => sum + value, 0) / parts.length;
}

const STRUCTURE_LANGUAGE = freeze({
  curveHealth: "more reliable early plays and smoother mana development",
  resilience: "more ways to recover after removal or a setback",
  cohesion: "more cards working together toward the same plan",
});

/** Turn internal structural scores into consequences a player can recognize. */
export function explainPlayConsequences(recommended, others = []) {
  if (!recommended) return null;
  const scores = recommended.scores || recommended.evaluation || {};
  const peers = Array.isArray(others) ? others.filter(Boolean) : [];
  const advantages = Object.keys(STRUCTURE_LANGUAGE)
    .map((key) => {
      const value = Number(scores[key]);
      if (!Number.isFinite(value)) return null;
      const peerValues = peers.map((peer) => Number((peer.scores || peer.evaluation || {})[key])).filter(Number.isFinite);
      const bestPeer = peerValues.length ? Math.max(...peerValues) : null;
      return { key, value, lead: bestPeer == null ? 0 : value - bestPeer };
    })
    .filter(Boolean)
    .sort((left, right) => right.lead - left.lead || right.value - left.value);
  const meaningful = advantages.filter((entry) => entry.lead >= 0.5);
  const chosen = (meaningful.length ? meaningful : advantages).slice(0, 2);
  if (!chosen.length) return "it gives you the clearest complete plan among these options";
  return chosen.map((entry) => STRUCTURE_LANGUAGE[entry.key]).join(" and ");
}

/**
 * Grade one philosophy's finished candidate against the same commission note.
 * Presentation only — never mutates construction.
 */
export function commissionFitForCandidate({
  note = "",
  commanderName = "",
  candidate = null,
} = {}) {
  if (!String(note || "").trim() || !candidate) return null;
  const contract = buildCommissionContract({
    note,
    commanderName,
    selected: candidate,
    deckCardNames: (candidate.rows || []).map((row) => row.name).filter(Boolean),
    blueprint: candidate?.strategicIntent?.blueprint || null,
  });
  if (!contract?.hasContract) return null;
  const shortfalls = (contract.whatIBuilt || []).filter((entry) => entry.status !== "met");
  const headline = Number.isFinite(contract.matchPercent)
    ? `${contract.matchPercent}% · ${contract.matchLabel}`
    : (contract.matchLabel || "Heard");
  const detail = shortfalls
    .slice(0, 2)
    .map((entry) => entry.detail || entry.label)
    .filter(Boolean)
    .join(" · ") || null;
  return freeze({
    matchPercent: contract.matchPercent,
    matchLabel: contract.matchLabel,
    headline,
    detail,
    shortfalls: freeze(shortfalls.map((entry) => entry.label)),
  });
}

/** Explain RECOMMENDED using consequences a player can recognize. */
export function explainRecommendedBadge(builds = []) {
  const list = Array.isArray(builds) ? builds.filter(Boolean) : [];
  const recommended = list.find((build) => build.recommended) || null;
  if (!recommended) return null;
  if (list.length <= 1) {
    return "This is the experience that survived construction for your commission.";
  }
  const others = list.filter((build) => !build.recommended);
  const recStructure = structureAverage(recommended.scores || {});
  const otherStructures = others
    .map((build) => structureAverage(build.scores || {}))
    .filter((value) => value != null);
  const bestOtherStructure = otherStructures.length ? Math.max(...otherStructures) : null;
  const strongerStructure =
    recStructure == null
      ? true
      : bestOtherStructure == null || recStructure + 0.5 >= bestOtherStructure;

  const recFit = recommended.commissionFit?.matchPercent;
  const otherFits = others
    .map((build) => build.commissionFit?.matchPercent)
    .filter((value) => Number.isFinite(value));
  const bestOtherFit = otherFits.length ? Math.max(...otherFits) : null;
  const hasCommissionGrades = Number.isFinite(recFit) || bestOtherFit != null;
  const consequences = explainPlayConsequences(recommended, others);
  if (!hasCommissionGrades) {
    return `Recommended because it offers ${consequences}.`;
  }
  // Founder Trial 2026-08-12: "closer commission fit" requires a strictly
  // higher attributable score. Equal percentages are a tie — never "closer."
  const closerFit = Number.isFinite(recFit) && (bestOtherFit == null || recFit > bestOtherFit);
  const tiedFit = Number.isFinite(recFit) && bestOtherFit != null && recFit === bestOtherFit;
  const weakerFit = Number.isFinite(recFit) && bestOtherFit != null && recFit < bestOtherFit;
  if (closerFit && strongerStructure) {
    return `Recommended because it stays closest to what you asked for and offers ${consequences}.`;
  }
  if (tiedFit && strongerStructure) {
    return `Both options fit your request equally well. This one is recommended because it offers ${consequences}.`;
  }
  if (weakerFit) {
    return `Recommended because it offers ${consequences}. Another option stays closer to what you asked for, so compare that tradeoff before choosing.`;
  }
  if (closerFit) {
    return "Recommended because it stays closest to the experience you asked MetaForge to build.";
  }
  if (tiedFit) {
    return `Both options fit your request equally well. This one is recommended because it offers ${consequences}.`;
  }
  return `Recommended because it offers ${consequences}.`;
}

export function buildPreChoiceCoaching({
  candidates = [],
  recommendedId = "",
  commanderName = "",
  stanceVoice = null,
  fantasyLabel = "",
  philosophyLabel = "",
  priorities = [],
  commissionNote = "",
  playerCompass = null,
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
    const diffs = keyDifferences(candidate, baseline);
    const identity = groundedIdentity(candidate, baseline, diffs);
    const full = fullCardDiff(candidate, baseline);
    const tradeoffLines = tradeoffsVersus(candidate, baseline);
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
    const alone = list.length === 1;

    return freeze({
      id: candidate.id,
      label: candidate.label || "Build",
      recommended: Boolean(recommended && candidate.id === recommended.id),
      alone,
      builtForPlayersWho: identity.builtForPlayersWho,
      prioritizes: freeze([...(identity.prioritizes || [])]),
      feel: identity.feel,
      expectedTradeoff: identity.expectedTradeoff,
      whyBuilt: identity.whyBuilt,
      // Single survivor: default-surface explanation (stage-2 pass sound).
      whySurvived: alone
        ? (identity.whyBuilt
          || `This was the clearest experience that matched the commission${commanderName ? ` for ${commanderName}` : ""}.`)
        : null,
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
      tradeoffs: tradeoffLines,
      keyDifferences: diffs,
      fullComparison: full,
      boundary: candidate.boundary || null,
      commissionFit: commissionFitForCandidate({
        note: commissionNote,
        commanderName,
        candidate,
      }),
      playerFitEvidence: playerCompassFitForTemper(playerCompass, temperKey(candidate.label)),
      playerFit: playerCompassFitForTemper(playerCompass, temperKey(candidate.label))?.explanation
        || identity.builtForPlayersWho,
      whatThisFeelsLike: identity.feel,
      whyNotTheAlternative: describeWhyNotAlternative(candidate, baseline, tradeoffLines, diffs),
      recommendedWhy: null,
    });
  });

  const graded = builds.filter((build) => Number.isFinite(build.commissionFit?.matchPercent));
  const bestCommissionFit = graded.length
    ? Math.max(...graded.map((build) => build.commissionFit.matchPercent))
    : null;
  const commissionPool = bestCommissionFit == null
    ? builds
    : builds.filter((build) => build.commissionFit?.matchPercent === bestCommissionFit);
  let selectedId = recommended?.id || null;
  let decidedBy = list.length === 1 ? "only_legal_option" : "structural_evidence";
  let compassMatch = null;

  if (bestCommissionFit != null && commissionPool.length === 1) {
    selectedId = commissionPool[0].id;
    decidedBy = "commission";
  } else if (commissionPool.length > 1) {
    compassMatch = matchPlayerCompassCandidates(
      playerCompass,
      commissionPool.map((build) => ({ id: build.id, temper: temperKey(build.label) })),
    );
    if (compassMatch) {
      selectedId = compassMatch.winnerId;
      decidedBy = compassMatch.trueTie ? "true_tie" : "player_compass";
    }
  }

  const selectedBuilds = builds.map((build) => freeze({
    ...build,
    recommended: build.id === selectedId,
  }));
  const selectedBuild = selectedBuilds.find((build) => build.recommended) || null;
  const others = selectedBuilds.filter((build) => !build.recommended);
  const consequences = explainPlayConsequences(selectedBuild, others);
  // The "why" line sits directly under the provenance label (DECIDED_BY_LABELS),
  // which already states the reason as a short tag — this must add something
  // that tag doesn't, not restate it in full-sentence form.
  const recommendedWhy = decidedBy === "commission"
    ? `This is what you asked MetaForge to build, and it offers ${consequences}.`
    : decidedBy === "player_compass"
      ? `This plays the way you told us you enjoy, and it offers ${consequences}.`
      : decidedBy === "only_legal_option"
        ? `This was the only direction that satisfied the request. It offers ${consequences}.`
        : decidedBy === "true_tie"
          ? `Shown first for consistency between equally good fits. It offers ${consequences}.`
          : `This is how this particular list came together, offering ${consequences}.`;
  const buildsWithWhy = selectedBuilds.map((build) => (
    build.recommended
      ? freeze({ ...build, decidedBy, recommendedWhy, recommendedBecause: recommendedWhy })
      : freeze({
          ...build,
          decidedBy: null,
          recommendedWhy: null,
          recommendedBecause: null,
          alternativeBecause: decidedBy === "commission" && build.playerFitEvidence
            ? "This direction may be closer to your usual play preferences, but it did not match your explicit request as closely."
            : null,
        })
  ));

  return freeze({
    writesToBrain: false,
    version: "pre-choice-coaching-v1.5",
    principle:
      "The Forge should explain enough for a player to choose confidently before asking them to commit to a build.",
    recommendedId: selectedId,
    decidedBy,
    compassMatch,
    recommendedWhy,
    alone: list.length === 1,
    builds: freeze(buildsWithWhy),
  });
}

/** @deprecated Prefer buildPreChoiceCoaching — same output. */
export function buildStrategyBuildComparison(args) {
  return buildPreChoiceCoaching(args);
}
