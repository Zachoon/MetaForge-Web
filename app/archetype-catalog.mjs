// =============================================================================
// Archetype Catalog — proof of concept (Founder #028)
// =============================================================================
// A second, DECLARATIVE package layer, sibling to strategic-intent.mjs's
// hand-authored PACKAGE_CATALOG. Each entry supplies oracle-text pattern
// lists plus a named false-friend "shape" instead of a bespoke detector
// function; strategic-intent.mjs's generic dispatch fallback (the same path
// auras/equipment/blink already run through) evaluates these records, so
// every downstream consumer that dispatches by package-id string needs zero
// changes. Exactly 3 entries — a scale-out validation, not the full ~26-
// archetype batch. See docs/FOUNDER_ISSUES.md #028.
//
// Dual reachability contract (same as the existing 10): a real archetype
// commander with an empty note must open the package via `commander`
// (oracle-text patterns, optionally a #027 magnitude-gate type word), and a
// free-text fantasy note must open it via `note.aliases` — independently.
// =============================================================================

import { commanderPayoffMagnitudeGates } from "./conditional-effect-credit.mjs";

function entryCard(entry) {
  return entry?.card || entry || {};
}

function typeLineOf(card = {}) {
  return String(card.typeLine || card.type_line || "");
}

function oracleOf(card = {}) {
  return String(card.oracleText || card.oracle_text || "");
}

function cardMatchesAny(patterns = [], text = "") {
  return patterns.some((pattern) => pattern.test(text));
}

// -----------------------------------------------------------------------------
// Shared, reusable false-friend "shape" evaluators. Each is generic over the
// per-entry config a catalog record supplies — built for exactly the 3 shapes
// these 3 archetypes need, not a speculative general framework.
// -----------------------------------------------------------------------------

// broad-type-superset: the card carries the archetype's broad type line
// (e.g. "Artifact"), which is not by itself the narrower functional core
// (e.g. an artifact *payoff*). Config: { typePattern }.
function broadTypeSuperset(entry, config) {
  return config.typePattern.test(typeLineOf(entryCard(entry)));
}

// incidental-rider: the archetype's own keyword/phrase is present, but only
// as a minor rider clause gated behind an unrelated condition on a card
// whose dominant effect is something else entirely (a removal spell's "if
// you control a Human, put a +1/+1 counter..." clause). Config:
// { mentionPattern, gatePattern, dominantOtherPattern }.
function incidentalRider(entry, config) {
  const oracle = oracleOf(entryCard(entry));
  if (!config.mentionPattern.test(oracle)) return false;
  if (!config.gatePattern.test(oracle)) return false;
  return config.dominantOtherPattern.test(oracle);
}

// excluded-by-tag: the card superficially reads like the archetype (e.g.
// "each opponent may ..."), but strategic-intent.mjs's own strategicSemanticsFor
// has already tagged it with a semantic that means the real intent is
// something else (a Stax-adjacent tax dressed as generosity). Does not invent
// a new tag — consumes whatever semantics the caller already computed.
// Config: { mentionPattern, excludedTags }.
function excludedByTag(entry, config, semantics) {
  const oracle = oracleOf(entryCard(entry));
  if (!config.mentionPattern.test(oracle)) return false;
  return (config.excludedTags || []).some((tag) => semantics.has(tag));
}

const FALSE_FRIEND_SHAPES = Object.freeze({
  "broad-type-superset": broadTypeSuperset,
  "incidental-rider": incidentalRider,
  "excluded-by-tag": excludedByTag,
});

export function evaluateFalseFriendShape(shape, entry, config, semantics) {
  const evaluator = FALSE_FRIEND_SHAPES[shape];
  if (!evaluator || !config) return false;
  return evaluator(entry, config, semantics);
}

// -----------------------------------------------------------------------------
// Artifacts matter
// -----------------------------------------------------------------------------
// Core is the payoff, not the type. "Whenever an artifact enters the
// battlefield under your control" / metalcraft / affinity / artifacts-you-
// control anthems and cost reduction. A T'Challa-shaped commander whose only
// artifact tie is a #027 magnitude-qualified cast trigger ("whenever you cast
// an artifact spell with mana value 4 or greater") never says any of that —
// reuse commanderPayoffMagnitudeGates rather than re-deriving that parse.
const ARTIFACT_PAYOFF_PATTERNS = Object.freeze([
  /\bmetalcraft\b/i,
  /\baffinity for artifacts\b/i,
  /artifacts? (?:creatures? )?you control/i,
  /whenever (?:an?|another) artifact (?:you control )?enters(?: the battlefield)?/i,
  /whenever you cast an artifact spell/i,
  /artifact spells? (?:you cast )?cost \{[^}]+\} less/i,
]);

const ARTIFACT_SUPPORT_PATTERNS = Object.freeze([
  /sacrifice an artifact\b/i,
  /search your library for an? artifact card/i,
  /return target artifact card from your graveyard/i,
]);

const artifactsMatter = Object.freeze({
  id: "artifacts_matter",
  label: "Artifacts-matter package",
  corePatterns: ARTIFACT_PAYOFF_PATTERNS,
  supportPatterns: ARTIFACT_SUPPORT_PATTERNS,
  reuseProtectionSupport: true,
  falseFriendShape: "broad-type-superset",
  falseFriendConfig: Object.freeze({ typePattern: /\bArtifact\b/i }),
  commander: Object.freeze({
    oraclePatterns: ARTIFACT_PAYOFF_PATTERNS,
    magnitudeGateTypeWord: "artifact",
  }),
  note: Object.freeze({
    aliases: Object.freeze(["artifacts matter", "artifact synergy", "metalcraft", "affinity for artifacts"]),
  }),
  density: Object.freeze({ singletonCore: 10, constructedCore: 6, singletonSupport: 6, constructedSupport: 3 }),
});

// -----------------------------------------------------------------------------
// +1/+1 Counters matter
// -----------------------------------------------------------------------------
// Core is genuine counter engine density: proliferate, doubling ("Double the
// number of each kind of counter" — Doubling Season / Vorel-class effects are
// always worded generically, never literally "+1/+1"), for-each-counter
// payoffs, modified-creature, and real +1/+1 placement. A card that only
// mentions a +1/+1 counter as a minor rider gated behind an unrelated
// condition on an otherwise different spell (a removal spell's "if you
// control a Human, put a +1/+1 counter on target creature you control") is
// the incidental-rider false friend, not core — the same gate excludes it
// from core in the first place.
const COUNTER_MENTION = /\+1\/\+1 counters?\b/i;
const COUNTER_RIDER_GATE = /\bif\b(?:(?!\+1\/\+1 counter)[^.,])*,\s*(?:you may )?put[^.]*\+1\/\+1 counters?\b/i;
const COUNTER_DOMINANT_OTHER_EFFECT = /\b(?:destroy target|exile target|counter target spell|deals? \d+ damage to|return target [^.]* to (?:its owner'?s hand|the battlefield)|draw (?:a|two|three|\d+) cards?)\b/i;

const CORE_COUNTER_PATTERNS = Object.freeze([
  /\bproliferate\b/i,
  /double the number of (?:each kind of )?counters?\b/i,
  /would be put on [^.]* you control[^.]*(?:that many plus one|twice that many|instead)/i,
  /for each \+1\/\+1 counter/i,
  /\bmodified creature\b/i,
  /whenever (?:one or more|a) \+1\/\+1 counters? (?:is|are) put on/i,
  /put (?:a|one|two|three|four|five|x|that many|\d+) \+1\/\+1 counters? on (?:each|another|target|it|this)\b/i,
]);

const SUPPORT_COUNTER_PATTERNS = Object.freeze([
  /\badapt \d/i,
  /\bevolve\b/i,
  /\bmentor\b/i,
  /\bsupport \d/i,
  /\bmonstrosity \d/i,
  /\boutlast\b/i,
  /\bbolster \d/i,
  /enters the battlefield with [^.]*\+1\/\+1 counters? on it/i,
]);

const COUNTER_RIDER_CONFIG = Object.freeze({
  mentionPattern: COUNTER_MENTION,
  gatePattern: COUNTER_RIDER_GATE,
  dominantOtherPattern: COUNTER_DOMINANT_OTHER_EFFECT,
});

const countersMatter = Object.freeze({
  id: "counters_matter",
  label: "+1/+1 Counters-matter package",
  corePatterns: CORE_COUNTER_PATTERNS,
  supportPatterns: SUPPORT_COUNTER_PATTERNS,
  falseFriendShape: "incidental-rider",
  falseFriendConfig: COUNTER_RIDER_CONFIG,
  commander: Object.freeze({
    oraclePatterns: CORE_COUNTER_PATTERNS,
  }),
  note: Object.freeze({
    aliases: Object.freeze(["+1/+1 counters matter", "counters matter", "counter synergy", "proliferate", "hardened scales"]),
  }),
  density: Object.freeze({ singletonCore: 12, constructedCore: 7, singletonSupport: 5, constructedSupport: 2 }),
});

// -----------------------------------------------------------------------------
// Group Hug
// -----------------------------------------------------------------------------
// Core is real symmetric generosity: each player draws/untaps/plays an extra
// land/gains, no downside. A card that superficially reads "each player" /
// "each opponent may" but is also tagged stax_piece or asymmetric_stax by
// strategic-intent.mjs's own strategicSemanticsFor (an asymmetric "you may
// pay or suffer" clause folded into the same sentence) is a tax dressed as
// generosity, not real hug — reuses that existing tag vocabulary rather than
// inventing a parallel one.
const GROUP_HUG_MENTION_PATTERN = /each (?:player|opponent)[^.]*(?:may|draws?|untaps?|creates?|gains?|searches?|puts?)\b/i;

const GROUP_HUG_CORE_PATTERNS = Object.freeze([
  /each (?:player|opponent)[^.]*\bdraws? (?:a|an?|\d+|that many) cards?\b/i,
  /each player[^.]* may (?:play|put|search|draw|untap|create)/i,
  /at the beginning of each player'?s (?:draw step|upkeep|end step)[^.]* draws? a card/i,
  /each player[^.]* (?:untaps?|creates? a|gains? \d+ life|searches? their library)/i,
  /each opponent may /i,
]);

const GROUP_HUG_SUPPORT_PATTERNS = Object.freeze([
  /target opponent (?:may )?(?:draws?|creates?|gains?)/i,
  /whenever an opponent draws a card[^.]*, you (?:may )?(?:draw|gain|create)/i,
  /each player'?s (?:hand size|maximum hand size)/i,
]);

const GROUP_HUG_EXCLUDED_TAG_CONFIG = Object.freeze({
  mentionPattern: GROUP_HUG_MENTION_PATTERN,
  excludedTags: Object.freeze(["stax_piece", "asymmetric_stax"]),
});

const groupHug = Object.freeze({
  id: "group_hug",
  label: "Group Hug package",
  corePatterns: GROUP_HUG_CORE_PATTERNS,
  supportPatterns: GROUP_HUG_SUPPORT_PATTERNS,
  falseFriendShape: "excluded-by-tag",
  falseFriendConfig: GROUP_HUG_EXCLUDED_TAG_CONFIG,
  commander: Object.freeze({
    oraclePatterns: GROUP_HUG_CORE_PATTERNS,
  }),
  note: Object.freeze({
    aliases: Object.freeze(["group hug", "hug deck", "political hug", "share the wealth"]),
  }),
  density: Object.freeze({ singletonCore: 10, constructedCore: 6, singletonSupport: 6, constructedSupport: 3 }),
});

export const ARCHETYPE_CATALOG = Object.freeze({
  artifacts_matter: artifactsMatter,
  counters_matter: countersMatter,
  group_hug: groupHug,
});

export const ARCHETYPE_PACKAGE_IDS = Object.freeze(Object.keys(ARCHETYPE_CATALOG));

// -----------------------------------------------------------------------------
// Generic dispatch consumed by strategic-intent.mjs's own generic fallback.
// -----------------------------------------------------------------------------

// A card is core only when it is not itself gated shut by the archetype's own
// false-friend shape (incidental-rider / excluded-by-tag gate before a card
// can be core in the first place; broad-type-superset has no such gate since
// the type check alone can never accidentally satisfy corePatterns).
export function cardSatisfiesArchetypeCore(entry, definition, semantics) {
  if (!definition) return false;
  const oracle = oracleOf(entryCard(entry));
  if (definition.falseFriendShape === "incidental-rider" && incidentalRider(entry, definition.falseFriendConfig)) return false;
  if (definition.falseFriendShape === "excluded-by-tag" && excludedByTag(entry, definition.falseFriendConfig, semantics)) return false;
  return cardMatchesAny(definition.corePatterns, oracle);
}

export function cardSatisfiesArchetypeSupport(entry, definition, semantics) {
  if (!definition) return false;
  if (cardSatisfiesArchetypeCore(entry, definition, semantics)) return true;
  const oracle = oracleOf(entryCard(entry));
  if (cardMatchesAny(definition.supportPatterns, oracle)) return true;
  return Boolean(definition.reuseProtectionSupport) && semantics.has("protection");
}

// Caller (strategic-intent.mjs's cardIsPackageFalseFriend) already guarantees
// the card failed cardSatisfiesArchetypeCore before calling this.
export function cardIsArchetypeFalseFriend(entry, definition, semantics) {
  if (!definition) return false;
  return evaluateFalseFriendShape(definition.falseFriendShape, entry, definition.falseFriendConfig, semantics);
}

function noteMatchesAlias(source, alias) {
  const escaped = String(alias).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "i").test(source);
}

export function archetypeTriggeredByCommander(definition, commanders = []) {
  const oracles = (commanders || []).filter(Boolean).map((commander) => oracleOf(commander));
  if (oracles.some((oracle) => cardMatchesAny(definition.commander?.oraclePatterns || [], oracle))) return true;
  const gateTypeWord = definition.commander?.magnitudeGateTypeWord;
  if (!gateTypeWord) return false;
  return oracles.some((oracle) => commanderPayoffMagnitudeGates(oracle).some((gate) => gate.typeWord === gateTypeWord));
}

export function archetypeTriggeredByNote(definition, blueprint = {}) {
  const source = String(blueprint?.source || "");
  if (!source) return false;
  return (definition.note?.aliases || []).some((alias) => noteMatchesAlias(source, alias));
}

export function archetypeTriggered(definition, commanders, blueprint) {
  return archetypeTriggeredByCommander(definition, commanders) || archetypeTriggeredByNote(definition, blueprint);
}
