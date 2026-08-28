// =============================================================================
// Archetype Catalog — #028 (POC) + #029 (batch 2) + #030 (batch 3) + #031
// (batch 4) + #032 (batch 5, final of the original ~26-archetype scope) +
// #033 (batch 6, first of the deferred lower-prevalence bucket) + #034
// (batch 7, final — closes out the deferred bucket and the full archetype-
// catalog effort begun at #028: 32 + 6 = 38 archetypes across 7 batches)
// =============================================================================
// A second, DECLARATIVE package layer, sibling to strategic-intent.mjs's
// hand-authored PACKAGE_CATALOG. Each entry supplies oracle-text pattern
// lists plus a named false-friend "shape" instead of a bespoke detector
// function; strategic-intent.mjs's generic dispatch fallback (the same path
// auras/equipment/blink already run through) evaluates these records, so
// every downstream consumer that dispatches by package-id string needs zero
// changes. #028 validated 3 entries; #029 added 6 more (lifegain, lands
// matter, burn, enchantress, mill, wheels); #030 added a further 6 (legends,
// discard, graveyard, clones, flying, group_slug); #031 added 6 more (infect,
// extra_combats, theft, superfriends, goad, vehicles); #032 added the final 5
// (neg_counters, pillow_fort, toughness_matters, extra_turns, sagas) by real
// EDHREC prevalence, completing the original ~26-archetype research scope
// (3 POC + 6 + 6 + 6 + 5 = 26). #033 begins the deferred, lower-prevalence
// bucket with 6 more (energy, populate, monarch, anthems, devotion, cascade),
// introducing zero new top-level shapes: energy and anthems reuse
// `wrong-target-scope` (a bare-word-vs-mana-symbol mismatch for energy, an
// object-subtype scope mismatch for anthems); populate and devotion also
// reuse `wrong-target-scope` (populate reusing clones' own object-type-
// mismatch sub-domain from the opposite direction; devotion opening a
// gating-clause-vs-scaling-reward mismatch grounded in the whole Theros god
// cycle); monarch and cascade reuse `incidental-rider`, the same gated-rider
// shape counters_matter/lifegain/burn/discard/graveyard/toughness_matters
// already use. #034 (batch 7, final) closes the deferred bucket with 6 more
// (cantrips, toolbox, x_spells, exile_matters, hatebears, spell_copy),
// introducing zero new top-level shapes — every one of these 6 also reuses
// `wrong-target-scope`, including 3 named CRITICAL overlap risks (cantrips
// vs. the original spellslinger package, exile_matters vs. #030's graveyard,
// hatebears vs. BOTH #032's pillow_fort and the original stax package) and
// one deliberate complementary pair (spell_copy grounded in Twincast, #030's
// clones' own documented false friend, proving both archetypes' boundaries
// from opposite directions with the same real card). See each entry's
// comment for its grounding, and
// docs/FOUNDER_ISSUES.md #028/#029/#030/#031/#032/#033/#034.
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

// wrong-target-scope: the archetype's own action verb is present (a mention
// broader than any single corePattern requires), but the effect is scoped to
// the wrong entity for the archetype's actual promise — a self-mill creature
// that fuels your own graveyard is not the "mill your opponents" archetype;
// a personal loot spell that discards-then-draws for you alone is not the
// symmetric/opponent-punishing "wheels" archetype. Distinct from
// incidental-rider (that shape is about a minor rider gated behind an
// unrelated condition on a card whose dominant effect is something else
// entirely; this shape is about the SAME effect existing but pointed at the
// wrong player) and from excluded-by-tag (that shape consumes a tag
// strategicSemanticsFor already computed; this shape is a self-contained
// mention-vs-scope check within one card's own oracle text, no external tag
// vocabulary required). Config: { mentionPattern, requiredScopePattern }.
//
// #030 generalizes "wrong entity" past player-scope (mill/wheels) to two more
// structurally identical mismatches, confirming this is a genuinely generic
// mention-vs-precise-scope check rather than a player-scope-only shape:
// clones (mention "copy" of anything vs. required scope "copy of a
// creature/permanent" — an object-TYPE mismatch, not a player mismatch) and
// flying/group_slug (mention a broad keyword/punisher shape vs. required
// scope tying it to the archetype's real payoff clause or trigger subject).
// Each reuse is grounded in its own independent real-card false friend — see
// each entry's comment.
//
// #031 generalizes it two further ways, still the same "broad mention
// passes, precise required scope fails" evaluator: a grant-vs-negate
// POLARITY mismatch (infect's own hate text mentions "infect"/"poison
// counters" while removing them, not granting/scaling them; extra_combats'
// own skip-combat hosers mention "combat phase" while denying one, not
// granting an additional one) and a mention-vs-count-reward mismatch
// (superfriends/goad: a card can mention "planeswalkers you control" or
// "goaded" without itself rewarding having many planeswalkers or applying
// goad). theft reuses the object-TYPE-mismatch sub-domain #030 opened for
// clones, scoped to a battlefield-permanent-vs-graveyard-card mismatch
// instead of creature-vs-spell. See each #031 entry's comment for its own
// independent real-card grounding.
function wrongTargetScope(entry, config) {
  const oracle = oracleOf(entryCard(entry));
  if (!config.mentionPattern.test(oracle)) return false;
  return !config.requiredScopePattern.test(oracle);
}

const FALSE_FRIEND_SHAPES = Object.freeze({
  "broad-type-superset": broadTypeSuperset,
  "incidental-rider": incidentalRider,
  "excluded-by-tag": excludedByTag,
  "wrong-target-scope": wrongTargetScope,
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

// Founder #101 (same round as the enchantress fix below): the singular "an
// artifact card" phrasing missed real plural/quantified artifact tutors —
// Disciples of Gix ("search your library for up to three artifact cards"),
// Myr Incubator ("search your library for any number of artifact cards"),
// and Saheeli Rai's ultimate ("search your library for up to three artifact
// cards with different names") — verified via Scryfall, only 3 real cards
// use this shape (narrower than the enchantress/Aura case), but real and
// previously uncovered. Widened the same way: optional "up to N"/"any
// number of" quantifier, plural "cards" allowed.
const ARTIFACT_SUPPORT_PATTERNS = Object.freeze([
  /sacrifice an artifact\b/i,
  /search your library for (?:(?:up to (?:an?|one|two|three|four|five|\d+)|any number of) )?(?:an? )?artifact cards?/i,
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

// -----------------------------------------------------------------------------
// Lifegain
// -----------------------------------------------------------------------------
// Core is a real payoff for gaining life (Trelasarra, Moon Dancer; Vito,
// Thorn of the Dusk Rose; Karlov of the Ghost Council all trigger off
// "whenever you gain life") or a reliable doubling engine (Rhox Faithmender /
// The Wind Crystal: "If you would gain life, you gain twice that much life
// instead."). False-friend shape: incidental-rider, reused as-is — a card
// whose dominant effect is something else entirely (Horrific Assault: fight-
// style combat damage) that gains a minor, gated amount of life as a rider
// ("If you control an Eldrazi, you gain 3 life.") is not core, the same way
// a removal spell's gated +1/+1-counter clause isn't core to counters_matter.
// Support is production, not reaction: raw repeatable lifegain sources
// (team-wide lifelink granting, extort, flat "gain life equal to X" effects)
// enable the archetype without themselves being the payoff.
//
// Checked #027's commanderPayoffMagnitudeGates reuse per the task brief: a
// real magnitude-qualified lifegain (and burn) commander exists — Y'shtola,
// Night's Blessed ("Whenever you cast a noncreature spell with mana value 3
// or greater, Y'shtola deals 2 damage to each opponent and you gain 2
// life.") — but its cast-trigger clause is already caught directly by the
// generic corePatterns below (a magnitude-qualifier in the middle of the
// sentence doesn't stop a `[^.]*` match), so the #027 gate reuse would be
// redundant here, not load-bearing the way it is for T'Challa's artifact
// trigger. Not forced.
const LIFEGAIN_TRIGGER_PATTERNS = Object.freeze([
  /whenever you gain life,/i,
  /if you would gain life,? you (?:instead )?gain twice that much life instead/i,
]);

const LIFEGAIN_SUPPORT_PATTERNS = Object.freeze([
  /creatures you control (?:have|gain) lifelink/i,
  /\bextort\b/i,
  /gain life equal to/i,
]);

const LIFEGAIN_MENTION = /\byou gain \d+ life\b/i;
const LIFEGAIN_RIDER_GATE = /\bif\b(?:(?!life)[^.,])*,[^.]*you gain \d+ life\b/i;
const LIFEGAIN_DOMINANT_OTHER = /\b(?:destroy target|exile target|counter target spell|deals? damage (?:to|equal to)|return target [^.]* to (?:its owner'?s hand|the battlefield))\b/i;

const LIFEGAIN_RIDER_CONFIG = Object.freeze({
  mentionPattern: LIFEGAIN_MENTION,
  gatePattern: LIFEGAIN_RIDER_GATE,
  dominantOtherPattern: LIFEGAIN_DOMINANT_OTHER,
});

const lifegain = Object.freeze({
  id: "lifegain",
  label: "Lifegain package",
  corePatterns: LIFEGAIN_TRIGGER_PATTERNS,
  supportPatterns: LIFEGAIN_SUPPORT_PATTERNS,
  reuseProtectionSupport: true,
  falseFriendShape: "incidental-rider",
  falseFriendConfig: LIFEGAIN_RIDER_CONFIG,
  commander: Object.freeze({
    oraclePatterns: LIFEGAIN_TRIGGER_PATTERNS,
  }),
  note: Object.freeze({
    aliases: Object.freeze(["lifegain", "life gain", "gain life", "lifegain matters", "lifelink matters"]),
  }),
  density: Object.freeze({ singletonCore: 8, constructedCore: 5, singletonSupport: 10, constructedSupport: 5 }),
});

// -----------------------------------------------------------------------------
// Lands matter
// -----------------------------------------------------------------------------
// Core is a real landfall-shaped payoff (the Landfall keyword itself; Aesi,
// Tyrant of Gyre Strait's "Whenever a land you control enters, you may draw
// a card."; The Gitrog Monster's and Titania, Protector of Argoth's land-
// leaves-battlefield payoffs), not the Land type line — false-friend shape:
// broad-type-superset, reused as-is with typePattern /\bLand\b/i, structurally
// identical to artifacts_matter's own use of the same shape. A plain dual
// like Command Tower ("{T}: Add one mana of any color in your commander's
// color identity.") is a Land by type but has no landfall-shaped trigger at
// all — same false-friend pattern as a vanilla artifact, different type.
// Extra land drops (Aesi's own "You may play an additional land on each of
// your turns.") are an enabler, not the payoff itself — support, the same
// role tutoring/recursion play for artifacts_matter.
//
// Checked #027's magnitude-gate reuse: no real "lands matter" commander with
// a magnitude-qualified land trigger was found (the type word a magnitude
// gate parses is a cast/play trigger's spell/permanent type, not a structural
// fit for a landfall trigger at all) — not forced.
const LANDS_MATTER_CORE_PATTERNS = Object.freeze([
  /\blandfall\b/i,
  /whenever a land you control enters(?: the battlefield)?[^.]*(?:draw|create|gain|search|token|counter|add)/i,
  /whenever one or more land cards? (?:are|is) put into your graveyard from anywhere,[^.]*draw/i,
  /whenever a land you control is put into a graveyard from the battlefield,[^.]*create/i,
]);

const LANDS_MATTER_SUPPORT_PATTERNS = Object.freeze([
  /play (?:an? )?additional land/i,
  /search your library for [^.]*land card/i,
  /return target land card from your graveyard to (?:your hand|the battlefield)/i,
]);

const landsMatter = Object.freeze({
  id: "lands_matter",
  label: "Lands-matter package",
  corePatterns: LANDS_MATTER_CORE_PATTERNS,
  supportPatterns: LANDS_MATTER_SUPPORT_PATTERNS,
  reuseProtectionSupport: true,
  falseFriendShape: "broad-type-superset",
  falseFriendConfig: Object.freeze({ typePattern: /\bLand\b/i }),
  commander: Object.freeze({
    oraclePatterns: LANDS_MATTER_CORE_PATTERNS,
  }),
  note: Object.freeze({
    aliases: Object.freeze(["lands matter", "landfall", "land synergy", "ramp into lands", "lands deck"]),
  }),
  density: Object.freeze({ singletonCore: 10, constructedCore: 6, singletonSupport: 8, constructedSupport: 4 }),
});

// -----------------------------------------------------------------------------
// Land sacrifice
// -----------------------------------------------------------------------------
// Founder #060 — found via a real Hearthhull, the Worldseed decklist and
// Moxfield primer comparison. Deliberately distinct from PACKAGE_CATALOG's
// own `aristocrats` entry (creature/permanent/token sacrifice only, by that
// package's own detectAristocratsCommander design comment: "Artifact-sac
// commanders are not aristocrats") and from this file's own `lands_matter`
// just above (landfall / a land entering / land-to-graveyard-then-DRAW
// specifically) — confirmed Hearthhull's real trigger ("Whenever you
// sacrifice a land, each opponent loses 2 life.") matches none of
// lands_matter's four core patterns before building this. Before this fix,
// the whole archetype had zero structural recognition anywhere in the
// engine: the generic mechanical "sacrifice" signal never connected
// Hearthhull to its own real payoff cards (Squandered Resources, Zuran Orb,
// Crop Rotation, Sylvan Safekeeper) because both sides land on the REWARDS
// half of that signal with no producer counterpart, verified directly via
// commanderConnectionSignalsFor before writing any of this.
//
// Core is the archetype's own defining shape — sacrificing a land directly
// for value (Squandered Resources: "Sacrifice a land: Add one mana...";
// Zuran Orb: "Sacrifice a land: You gain 2 life."; Crop Rotation: sacrifice
// a land as an additional cost, tutoring any land card; Sylvan Safekeeper's
// protection cost), a direct payoff for the act (Hearthhull's own "whenever
// you sacrifice a land" trigger), or the closely related, broader land-to-
// graveyard payoff (The Gitrog Monster: "Whenever one or more land cards
// are put into your graveyard from anywhere, draw a card." — the real
// commander most associated with this archetype alongside Hearthhull; both
// verified via Scryfall).
//
// False-friend shape: wrong-target-scope. A card that mentions "sacrifice"
// near "land" without actually sacrificing a land itself — a creature-sac
// edict whose effect happens to also destroy a land, say — is not core; the
// precise required scope is the real "sacrifice a/an/another/any number of
// land(s)" cost/effect shape, "whenever you sacrifice ... land", or the
// land-to-graveyard payoff shape. Since corePatterns and requiredScopePattern
// are the same precise shapes here, no card can pass core and still be
// mislabeled a false friend — matching how broad-type-superset's own type
// check never accidentally satisfies corePatterns either.
//
// Support is refilling the resource actually being sacrificed — extra land
// drops (Exploration/Azusa, Lost but Seeking's own "play an/two additional
// land(s)") and land recursion (Crucible of Worlds/Ramunap Excavator: "play
// lands from your graveyard") — the Hearthhull primer's own Ramp section
// names exactly this need verbatim: "this is a land SACRIFICE deck... lots
// of our ramp eats up lands."
const LAND_SAC_MENTION = /\bsacrifice\b[\s\S]{0,40}\bland/i;

const LAND_SAC_CORE_PATTERNS = Object.freeze([
  /sacrifice (?:a|an|another|any number of) lands?\b/i,
  /whenever you sacrifice [^.]*\bland\b/i,
  /whenever one or more land cards? (?:are|is) put into your graveyard from anywhere/i,
]);

const LAND_SAC_SUPPORT_PATTERNS = Object.freeze([
  /play (?:an?|two|three|four|five|\d+) additional lands?\b/i,
  /play lands? from your graveyard/i,
]);

const LAND_SAC_SCOPE_CONFIG = Object.freeze({
  mentionPattern: LAND_SAC_MENTION,
  requiredScopePattern: /sacrifice (?:a|an|another|any number of) lands?\b|whenever you sacrifice [^.]*\bland\b|whenever one or more land cards? (?:are|is) put into your graveyard from anywhere/i,
});

const landSacrifice = Object.freeze({
  id: "land_sacrifice",
  label: "Land sacrifice package",
  corePatterns: LAND_SAC_CORE_PATTERNS,
  supportPatterns: LAND_SAC_SUPPORT_PATTERNS,
  falseFriendShape: "wrong-target-scope",
  falseFriendConfig: LAND_SAC_SCOPE_CONFIG,
  commander: Object.freeze({
    oraclePatterns: LAND_SAC_CORE_PATTERNS,
  }),
  note: Object.freeze({
    aliases: Object.freeze(["land sacrifice", "sac lands", "landsac", "sacrifice lands for value"]),
  }),
  density: Object.freeze({ singletonCore: 8, constructedCore: 5, singletonSupport: 8, constructedSupport: 4 }),
});

// -----------------------------------------------------------------------------
// Burn
// -----------------------------------------------------------------------------
// Core is direct damage aimed at opponents/players, not damage in general —
// a repeatable cast-trigger pinger (Guttersnipe / Electrostatic Field:
// "Whenever you cast an instant or sorcery spell, ... deals damage to each
// opponent."), a damage amplifier (Torbran, Thane of Red Fell: "If a red
// source you control would deal damage to an opponent ..., it deals that
// much damage plus 2 instead."; Fiery Emancipation), a land-punisher (Zo-Zu
// the Punisher), or a direct burn spell that can actually hit a player
// (Lightning Bolt's "any target", Fireball's "any number of targets") — all
// four are the archetype's real identity, unlike artifacts_matter's vanilla
// artifact, so none of them are demoted to support.
//
// False-friend shape: incidental-rider, reused with burn-specific config. A
// removal spell whose dominant effect is destroying/exiling a creature and
// which deals a minor, gated amount of damage to a player as a rider —
// Unlicensed Disintegration: "Destroy target creature. If you control an
// artifact, Unlicensed Disintegration deals 3 damage to that creature's
// controller." — is not core; the "damage to a player" mention only exists
// because of an unrelated artifact-count condition on a card whose real job
// is creature removal, structurally identical to counters_matter's gated
// +1/+1-counter removal-spell rider.
//
// Considered a target-scope false friend (a creature-only damage spell like
// Flame Slash, "deals 4 damage to target creature", never touches a player)
// but corePatterns already require "to any target/opponent/player" — Flame
// Slash's "target creature" phrasing simply never matches core, no shape
// needed for that case (same reasoning broad-type-superset gets a free pass
// on the core-satisfaction gate).
//
// Checked #027's magnitude-gate reuse: see lifegain's note on Y'shtola,
// Night's Blessed — the same real commander is magnitude-qualified for burn
// too, and is already caught by the generic cast-trigger corePattern below
// without needing the reuse.
const BURN_CORE_PATTERNS = Object.freeze([
  /whenever you cast (?:an? )?(?:instant or sorcery|noncreature|instant|sorcery) spell[^.]*,[^.]*deals? \d+ damage to each opponent/i,
  /would deal damage to (?:an? )?(?:permanent or player|opponent)[^.]*it deals (?:double|triple|that much damage plus \d+)[^.]*instead/i,
  /whenever (?:a|another) land enters,[^.]*deals? \d+ damage to that land'?s controller/i,
  /deals? (?:\d+|x) damage[^.]*(?:to any target|to target opponent|to target player|to each opponent|divided[^.]*among any number of targets)/i,
]);

const BURN_SUPPORT_PATTERNS = Object.freeze([
  /instant or sorcery spells you (?:cast|control) cost \{[^}]+\} less/i,
  /whenever you cast an instant or sorcery spell,[^.]*create/i,
]);

const BURN_MENTION = /\bdeals? \d+ damage\b/i;
const BURN_RIDER_GATE = /\bif\b(?:(?!damage)[^.,])*,[^.]*deals? \d+ damage\b/i;
const BURN_DOMINANT_OTHER = /\b(?:destroy target|exile target|counter target spell)\b/i;

const BURN_RIDER_CONFIG = Object.freeze({
  mentionPattern: BURN_MENTION,
  gatePattern: BURN_RIDER_GATE,
  dominantOtherPattern: BURN_DOMINANT_OTHER,
});

const burn = Object.freeze({
  id: "burn",
  label: "Burn package",
  corePatterns: BURN_CORE_PATTERNS,
  supportPatterns: BURN_SUPPORT_PATTERNS,
  reuseProtectionSupport: true,
  falseFriendShape: "incidental-rider",
  falseFriendConfig: BURN_RIDER_CONFIG,
  commander: Object.freeze({
    oraclePatterns: BURN_CORE_PATTERNS,
  }),
  note: Object.freeze({
    aliases: Object.freeze(["burn", "direct damage", "burn deck", "pinger", "damage doubler"]),
  }),
  density: Object.freeze({ singletonCore: 14, constructedCore: 8, singletonSupport: 6, constructedSupport: 3 }),
});

// -----------------------------------------------------------------------------
// Enchantress
// -----------------------------------------------------------------------------
// Core is the enchantment-triggered draw ability itself — "whenever you cast
// an enchantment spell, draw a card" (Argothian Enchantress, the archetype's
// namesake; Verduran Enchantress; Sythis, Harvest's Hand) or the Constellation
// enchantment-enters-the-battlefield shape (Setessan Champion; Eidolon of
// Blossoms) — not merely drawing cards, and not merely being an Enchantment.
// False-friend shape: broad-type-superset, reused with typePattern
// /\bEnchantment\b/i. Rhystic Study is the clean real fixture: its type line
// says Enchantment, but its payoff ("Whenever an opponent casts a spell, you
// may draw a card unless that player pays {1}.") has nothing to do with
// enchantments — a spell-tax draw engine that happens to be printed as an
// Enchantment, structurally identical to Iron Cog being a vanilla Artifact.
// Considered generalizing broad-type-superset past the literal type line to
// "has the enchantment-triggered draw ability" per the task's own worked
// example, but that framing doesn't fit: it would just restate corePatterns
// itself (an "enchantment-triggered draw ability" IS the core pattern), not
// describe a distinct false-friend shape. The real false friend here is
// exactly the ordinary broad-type mismatch the existing shape already models.
// Auras are a real EDH package already (PACKAGE_CATALOG's own `auras` entry)
// — Enchantress is deliberately not scoped to the narrower Aura subtype, and
// this entry does not touch that one.
//
// Checked #027's magnitude-gate reuse: no real Enchantress commander with a
// magnitude-qualified enchantment trigger was found (Bello, Bard of the
// Brambles animates enchantments with mana value 4+ into creatures — an
// unrelated mechanic, not an enchantment-cast/enters draw payoff) — not
// forced.
const ENCHANTRESS_CORE_PATTERNS = Object.freeze([
  /whenever you cast (?:an? )?enchantment spell,[^.]*draw/i,
  /whenever [^.]* enchantment (?:you control )?enters(?: the battlefield)?[^.]*draw/i,
  /whenever an enchantment is put into a graveyard from the battlefield,[^.]*draw/i,
]);

// Founder #101: Idyllic Tutor's own literal "an enchantment card" was the
// only shape this ever matched — two more real, iconic enchantress-support
// tutors used different real templates and produced zero support credit.
// Enlightened Tutor ("Search your library for an artifact or enchantment
// card...") never contains the literal substring "an enchantment card" (the
// "an" belongs to "an artifact", not "enchantment"). Three Dreams ("Search
// your library for up to three Aura cards with different names...") is both
// plural and Aura-specific rather than the bare word "enchantment" — real
// Auras are the enchantress archetype's single most common payoff type, and
// this pattern never recognized a real Aura-specific tutor at all. Verified
// against all four real cards below (both previously-working singular cases
// still match).
const ENCHANTRESS_SUPPORT_PATTERNS = Object.freeze([
  /search your library for (?:up to )?(?:an?|one|two|three|four|five|\d+)? ?(?:artifact or |enchantment or )?(?:enchantment|aura) cards?/i,
  /return (?:target|all) enchantment(?:s| cards?)? [^.]*graveyards?[^.]* to the battlefield/i,
  /other enchantments you control have (?:shroud|hexproof|indestructible)/i,
]);

const enchantress = Object.freeze({
  id: "enchantress",
  label: "Enchantress package",
  corePatterns: ENCHANTRESS_CORE_PATTERNS,
  supportPatterns: ENCHANTRESS_SUPPORT_PATTERNS,
  reuseProtectionSupport: true,
  falseFriendShape: "broad-type-superset",
  falseFriendConfig: Object.freeze({ typePattern: /\bEnchantment\b/i }),
  commander: Object.freeze({
    oraclePatterns: ENCHANTRESS_CORE_PATTERNS,
  }),
  note: Object.freeze({
    aliases: Object.freeze(["enchantress", "enchantment matters", "enchantments matter", "constellation"]),
  }),
  density: Object.freeze({ singletonCore: 8, constructedCore: 5, singletonSupport: 6, constructedSupport: 3 }),
});

// -----------------------------------------------------------------------------
// Mill
// -----------------------------------------------------------------------------
// Core is milling your OPPONENTS' libraries — "target player mills"/"each
// opponent mills" (Hedron Crab, Ruin Crab, Fleet Swallower, Maddening
// Cacophony, Traumatize), a mill doubler (Bruvac the Grandiloquent: "If an
// opponent would mill one or more cards, they mill twice that many cards
// instead."), a granted repeatable mill ability (Phenax, God of Deception's
// "Creatures you control have '{T}: Target player mills X cards...'"), or a
// library-depletion effect without the literal keyword (Consuming
// Aberration / Mind Grind's "each opponent reveals cards from the top of
// their library ... puts ... into their graveyard").
//
// False-friend shape: wrong-target-scope (new — see justification below). A
// card that mills but only itself — Stitcher's Supplier: "When this creature
// enters or dies, mill three cards." — is a graveyard/reanimator enabler
// (self-mill), not the Mill archetype, which is specifically about depleting
// an opponent's library. None of the 3 #028 shapes structurally fit: it is
// not a broad type-line mismatch (no type-line concept applies to a mill
// trigger), it is not an incidental-rider (the mill IS the card's entire,
// unconditional effect — there is no gate and no separate dominant effect to
// be a rider on), and it is not excluded-by-tag (strategicSemanticsFor has no
// self-mill-vs-opponent-mill tag, and inventing one would violate the "does
// not invent a new tag" rule the shape itself is built on). The genuinely
// new, genuinely shared structural pattern is: the archetype's action verb
// is present, but pointed at the wrong player. This exact shape recurs for
// wheels below (personal loot vs. symmetric/opponent-facing wheel effects),
// confirming it is reusable rather than a one-off bolted onto mill alone.
//
// Support is scaling off the opponent graveyards mill produces, not
// producing mill itself — Consuming Aberration's own power/toughness clause
// ("...equal to the number of cards in your opponents' graveyards") is a
// real secondary payoff for the archetype's byproduct, the same ancillary
// role tutoring/recursion play for artifacts_matter.
//
// Checked #027's magnitude-gate reuse: no real Mill commander with a
// magnitude-qualified mill trigger was found — not forced.
const MILL_CORE_PATTERNS = Object.freeze([
  /(?:target player|target opponent|each opponent) mills? (?:a|an|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|x|\d+|that many|twice that many|half (?:their|its) library)/i,
  /if (?:an? )?opponent would mill[^.]*mill (?:twice|three times) that many/i,
  /creatures you control have[^.]*target player mills/i,
  /each opponent reveals cards from the top of (?:their|its) library[^.]*graveyard/i,
]);

const MILL_SUPPORT_PATTERNS = Object.freeze([
  /power and toughness are each equal to the number of cards in your opponents(?:'|’)? graveyards?/i,
]);

const MILL_SELF_MENTION = /\bmills?\b/i;
const MILL_REQUIRED_OPPONENT_SCOPE = /target player mills|target opponent mills|each opponent mills|an opponent would mill|creatures you control have[^.]*target player mills|each opponent reveals cards from the top/i;

const MILL_SCOPE_CONFIG = Object.freeze({
  mentionPattern: MILL_SELF_MENTION,
  requiredScopePattern: MILL_REQUIRED_OPPONENT_SCOPE,
});

const mill = Object.freeze({
  id: "mill",
  label: "Mill package",
  corePatterns: MILL_CORE_PATTERNS,
  supportPatterns: MILL_SUPPORT_PATTERNS,
  falseFriendShape: "wrong-target-scope",
  falseFriendConfig: MILL_SCOPE_CONFIG,
  commander: Object.freeze({
    oraclePatterns: MILL_CORE_PATTERNS,
  }),
  note: Object.freeze({
    aliases: Object.freeze(["mill", "mill deck", "deck out", "library destruction"]),
  }),
  density: Object.freeze({ singletonCore: 12, constructedCore: 7, singletonSupport: 6, constructedSupport: 3 }),
});

// -----------------------------------------------------------------------------
// Wheels
// -----------------------------------------------------------------------------
// Core is a symmetric hand-refill effect (Wheel of Fortune: "Each player
// discards their hand, then draws seven cards."; Dark Deal; Winds of Change)
// or a punisher that reacts specifically to an OPPONENT's draw/discard
// (Nekusar, the Mindrazer: "At the beginning of each player's draw step,
// that player draws an additional card. Whenever an opponent draws a card,
// Nekusar deals 1 damage to that player."; Waste Not).
//
// False-friend shape: wrong-target-scope, the same shape mill needs (see
// mill's comment for why none of the 3 #028 shapes fit and why this one
// generalizes). A personal loot/rummage spell — Cathartic Reunion: "As an
// additional cost to cast this spell, discard two cards. Draw three cards."
// — mentions both discard and draw, exactly like a real wheel, but only ever
// touches the caster's own hand; it is card filtering, not the archetype,
// the same way Stitcher's Supplier's self-mill is graveyard fuel and not the
// Mill archetype. Glint-Horn Buccaneer ("Whenever you discard a card, this
// creature deals 1 damage to each opponent.") is real support instead of a
// false friend: it does not itself wheel, but it is a genuine payoff for
// discarding that a wheels deck reliably triggers off its own wheel effects.
//
// Checked #027's magnitude-gate reuse: no real Wheels commander with a
// magnitude-qualified wheel/punisher trigger was found — not forced.
const WHEELS_CORE_PATTERNS = Object.freeze([
  /each player (?:discards their hand|discards all the cards in their hand|shuffles the cards from their hand into their library)[^.]*draws?/i,
  /whenever an opponent draws a card,[^.]*(?:deals? \d+ damage|loses? \d+ life)/i,
  /at the beginning of each player'?s draw step,[^.]* draws? an additional card/i,
  /whenever an opponent discards[^.]*(?:draw|create|add)/i,
]);

const WHEELS_SUPPORT_PATTERNS = Object.freeze([
  /whenever you discard a card,[^.]*(?:draw|deals? \d+ damage|create)/i,
  /no maximum hand size/i,
]);

const WHEELS_MENTION = /\bdiscards?\b[\s\S]{0,60}\bdraws?\b|\bdraws?\b[\s\S]{0,60}\bdiscards?\b/i;
const WHEELS_REQUIRED_SCOPE = /each player (?:discards|shuffles)|whenever an opponent draws|whenever an opponent discards/i;

const WHEELS_SCOPE_CONFIG = Object.freeze({
  mentionPattern: WHEELS_MENTION,
  requiredScopePattern: WHEELS_REQUIRED_SCOPE,
});

const wheels = Object.freeze({
  id: "wheels",
  label: "Wheels package",
  corePatterns: WHEELS_CORE_PATTERNS,
  supportPatterns: WHEELS_SUPPORT_PATTERNS,
  falseFriendShape: "wrong-target-scope",
  falseFriendConfig: WHEELS_SCOPE_CONFIG,
  commander: Object.freeze({
    oraclePatterns: WHEELS_CORE_PATTERNS,
  }),
  note: Object.freeze({
    aliases: Object.freeze(["wheels", "wheel effects", "punisher", "discard matters"]),
  }),
  density: Object.freeze({ singletonCore: 6, constructedCore: 4, singletonSupport: 6, constructedSupport: 3 }),
});

// -----------------------------------------------------------------------------
// Legends (legendary matters)
// -----------------------------------------------------------------------------
// Core is a real payoff for OTHER legendary permanents you control, not
// merely being legendary yourself — Sisay, Weatherlight Captain ("Sisay gets
// +1/+1 for each color among other legendary permanents you control." plus
// her own "Search your library for a legendary permanent card..." tutor),
// Gimli of the Glittering Caves ("Whenever another legendary creature you
// control enters, put a +1/+1 counter on Gimli."), Yoshimaru, Ever Faithful
// (the same shape for "legendary permanent"). False-friend shape: broad-
// type-superset, reused with typePattern /\bLegendary\b/i — structurally
// identical to artifacts_matter/lands_matter/enchantress: Rograkh, Son of
// Rohgahh ("First strike, menace, trample.") is a Legendary Creature by type
// line with zero legendary-matters text, the same mismatch as a vanilla
// Artifact or a plain Land.
//
// Support is recursion/anti-legend-rule enabling, not the payoff itself —
// Loyal Retainers ("Sacrifice this creature: Return target legendary
// creature card from your graveyard to the battlefield.") and Mirror
// Gallery-class "the 'legend rule' doesn't apply" effects let a legends deck
// run and rebuy its legendary permanents without themselves rewarding
// controlling many — the same ancillary role tutoring/recursion play for
// artifacts_matter.
//
// Checked #027's commanderPayoffMagnitudeGates reuse: no real Legends
// commander with a magnitude-qualified legendary-permanent trigger was
// found (Sisay's tutor is gated on the target's mana value being less than
// her own power — a comparative gate, not the "N or greater/less" fixed-
// threshold shape the parser looks for) — not forced.
const LEGENDS_CORE_PATTERNS = Object.freeze([
  /(?:for each|gets? \+\d+\/\+\d+ for each)[^.]* legendary (?:creatures?|permanents?) you control/i,
  /whenever (?:another|a) legendary (?:creature|permanent) (?:you control )?enters(?: the battlefield)?/i,
  /search your library for a legendary [^.]*card/i,
]);

const LEGENDS_SUPPORT_PATTERNS = Object.freeze([
  /return target legendary creature card from your graveyard to the battlefield/i,
  /the (?:"|')?legend rule(?:"|')? doesn'?t apply/i,
]);

const legends = Object.freeze({
  id: "legends",
  label: "Legends package",
  corePatterns: LEGENDS_CORE_PATTERNS,
  supportPatterns: LEGENDS_SUPPORT_PATTERNS,
  reuseProtectionSupport: true,
  falseFriendShape: "broad-type-superset",
  falseFriendConfig: Object.freeze({ typePattern: /\bLegendary\b/i }),
  commander: Object.freeze({
    oraclePatterns: LEGENDS_CORE_PATTERNS,
  }),
  note: Object.freeze({
    aliases: Object.freeze(["legends matter", "legendary matters", "legendary tribal", "the historic deck", "legendary permanents"]),
  }),
  density: Object.freeze({ singletonCore: 10, constructedCore: 6, singletonSupport: 6, constructedSupport: 3 }),
});

// -----------------------------------------------------------------------------
// Discard
// -----------------------------------------------------------------------------
// Core is a real single-target/self-discard payoff, deliberately distinct
// from #029's wheels (symmetric hand-refill or a punisher keyed to an
// opponent's DRAW). Four real shapes: targeted discard-as-removal (Mind Rot:
// "Target player discards two cards."), hand-disruption (Thoughtseize:
// "Target player reveals their hand. You choose a nonland card from it. That
// player discards that card."), an opponent-discard value payoff that is NOT
// a symmetric wheel or a damage/life-loss punisher (Tergrid, God of Fright:
// "Whenever an opponent sacrifices a nontoken permanent or discards a
// permanent card, you may put that card from a graveyard onto the
// battlefield under your control." — reanimator-adjacent discard synergy,
// exactly the class the task brief names), and self-discard/madness-style
// payoffs (Bone Miser: "Whenever you discard a creature card, create a 2/2
// black Zombie creature token. ... Whenever you discard a noncreature,
// nonland card, draw a card.").
//
// Kept out of wheels' territory on purpose: wheels' own corePatterns require
// literal "whenever an opponent discards[^.]*(?:draw|create|add)" (immediately
// after "opponent discards") or symmetric "each player discards their hand".
// Tergrid's actual text is "opponent sacrifices a nontoken permanent OR
// discards a permanent card" — "opponent discards" is never a contiguous
// substring — so she does not open wheels, and Nekusar's "whenever an
// opponent draws a card" never contains the word "discard" at all, so he
// does not open this package either. Two commanders, two disjoint triggers.
//
// False-friend shape: incidental-rider, reused with discard-specific config.
// Big Score ("As an additional cost to cast this spell, discard a card. Draw
// two cards and create two Treasure tokens.") mentions discard, but only as
// a cost-gate paid to enable an unrelated dominant effect (card draw) — not
// a discard-matters payoff, the same shape as counters_matter's gated
// removal-spell rider and burn's gated damage rider.
//
// Support is discard as a tool, not the payoff — connive (draw-then-discard
// with a conditional upside) and discard-outlet tutors (Fauna Shaman: "{G},
// {T}, Discard a creature card: Search your library for a creature card...")
// enable the archetype without themselves rewarding discard density.
//
// Checked #027's commanderPayoffMagnitudeGates reuse: no real Discard
// commander with a magnitude-qualified discard trigger was found — not
// forced.
const DISCARD_CORE_PATTERNS = Object.freeze([
  /target (?:player|opponent) discards (?:a|an|one|two|three|four|five|\d+|that many) cards?/i,
  /reveals? (?:their|his or her) hand[\s\S]{0,120}discards? that card/i,
  /whenever an opponent[^.]*discards? a (?:permanent|nonland) card/i,
  /whenever you discard a (?:creature|land|noncreature|nonland)[^,]*,[^.]*(?:create|add|draw)/i,
  /\bmadness\b/i,
]);

const DISCARD_SUPPORT_PATTERNS = Object.freeze([
  /\bconnive\b/i,
  /discard a creature card:[^.]*search your library/i,
]);

const DISCARD_MENTION = /\bdiscards?\b/i;
const DISCARD_RIDER_GATE = /as an additional cost to cast this (?:spell|card)[^.]*discard/i;
const DISCARD_DOMINANT_OTHER = /draw (?:a|two|three|four|\d+|that many) cards?/i;

const DISCARD_RIDER_CONFIG = Object.freeze({
  mentionPattern: DISCARD_MENTION,
  gatePattern: DISCARD_RIDER_GATE,
  dominantOtherPattern: DISCARD_DOMINANT_OTHER,
});

const discard = Object.freeze({
  id: "discard",
  label: "Discard package",
  corePatterns: DISCARD_CORE_PATTERNS,
  supportPatterns: DISCARD_SUPPORT_PATTERNS,
  falseFriendShape: "incidental-rider",
  falseFriendConfig: DISCARD_RIDER_CONFIG,
  commander: Object.freeze({
    oraclePatterns: DISCARD_CORE_PATTERNS,
  }),
  note: Object.freeze({
    aliases: Object.freeze(["discard matters", "madness", "discard deck", "hand disruption", "targeted discard"]),
  }),
  density: Object.freeze({ singletonCore: 8, constructedCore: 5, singletonSupport: 8, constructedSupport: 4 }),
});

// -----------------------------------------------------------------------------
// Graveyard
// -----------------------------------------------------------------------------
// Core is using the graveyard as a general resource — delirium/threshold,
// flashback/escape, and "from your graveyard" cast/scale payoffs — explicitly
// distinct from the existing PACKAGE_CATALOG `reanimator` entry, which is
// about reanimation SPELLS specifically (creature-onto-battlefield). Muldrotha,
// the Gravetide ("During each of your turns, you may play a land and cast a
// permanent spell of each permanent type from your graveyard.") is the real
// commander: a repeated cast-from-graveyard permission, not a reanimation
// spell. Ishkanah, Grafwidow carries the Delirium keyword itself; Tarmogoyf
// ("power is equal to the number of card types among cards in all
// graveyards...") scales off graveyard contents generically; Kroxa, Titan of
// Death's Hunger and Underworld Breach both grant/use Escape.
//
// A real reanimation spell never satisfies this core in the first place —
// Reanimate's actual printed text ("Put target creature card from a
// graveyard onto the battlefield under your control. You lose life equal to
// that card's mana value.") has no delirium/threshold/flashback/escape
// keyword and no "cast ... from your graveyard" phrasing, so it simply never
// matches corePatterns — the same "doesn't even qualify, no shape needed for
// THAT card" outcome burn's own Flame Slash demonstrates.
//
// False-friend shape: incidental-rider, reused with a genuinely different
// real fixture than Reanimate. Grim Lavamancer ("{R}, {T}, Exile two cards
// from your graveyard: This creature deals 2 damage to any target.")
// mentions "graveyard", and its activation cost is gated on spending
// graveyard cards, but its dominant effect is unrelated direct damage — the
// graveyard is a mana-adjacent resource sink here, not a delirium/escape-
// style value payoff, the same shape as counters_matter's and discard's
// gated riders.
//
// Support is setup that fills the graveyard without itself being the value
// payoff — surveil, and self-mill (Stitcher's Supplier: "When this creature
// enters or dies, mill three cards." — the exact card #029's mill entry
// flags as a self-mill FALSE FRIEND for opponent-depletion mill is genuine
// SUPPORT here, since fueling your own graveyard is precisely this
// archetype's enabler role; the same real card legitimately occupies two
// different roles in two different archetypes, per the task's own overlap
// allowance).
//
// Checked #027's commanderPayoffMagnitudeGates reuse: no real Graveyard
// commander with a magnitude-qualified graveyard trigger was found — not
// forced.
const GRAVEYARD_CORE_PATTERNS = Object.freeze([
  /\bdelirium\b/i,
  /\bthreshold\b/i,
  /\bflashback\b/i,
  /\bescape[—-]/i,
  /\bhas escape\b/i,
  /cast [^.]* from your graveyard/i,
  /card types among cards in [^.]*graveyards?/i,
]);

const GRAVEYARD_SUPPORT_PATTERNS = Object.freeze([
  /\bsurveil \d/i,
  /mills? (?:one|two|three|four|five|\d+) cards?/i,
]);

const GRAVEYARD_MENTION = /\bgraveyard\b/i;
const GRAVEYARD_RIDER_GATE = /exile (?:two|three|four|five|\d+|a|one) cards? from your graveyard/i;
const GRAVEYARD_DOMINANT_OTHER = /deals? \d+ damage to any target/i;

const GRAVEYARD_RIDER_CONFIG = Object.freeze({
  mentionPattern: GRAVEYARD_MENTION,
  gatePattern: GRAVEYARD_RIDER_GATE,
  dominantOtherPattern: GRAVEYARD_DOMINANT_OTHER,
});

const graveyard = Object.freeze({
  id: "graveyard",
  label: "Graveyard package",
  corePatterns: GRAVEYARD_CORE_PATTERNS,
  supportPatterns: GRAVEYARD_SUPPORT_PATTERNS,
  falseFriendShape: "incidental-rider",
  falseFriendConfig: GRAVEYARD_RIDER_CONFIG,
  commander: Object.freeze({
    oraclePatterns: GRAVEYARD_CORE_PATTERNS,
  }),
  note: Object.freeze({
    aliases: Object.freeze(["graveyard matters", "graveyard value", "delirium", "threshold", "self-mill value"]),
  }),
  density: Object.freeze({ singletonCore: 10, constructedCore: 6, singletonSupport: 8, constructedSupport: 4 }),
});

// -----------------------------------------------------------------------------
// Clones
// -----------------------------------------------------------------------------
// Core is copying creatures/permanents — Sakashima of a Thousand Faces ("You
// may have Sakashima enter as a copy of another creature you control..."),
// Progenitor Mimic ("You may have this creature enter as a copy of any
// creature on the battlefield..."), Rite of Replication ("Create a token
// that's a copy of target creature.").
//
// False-friend shape: wrong-target-scope (reused — see the shared-evaluator
// comment above for why this generalizes past player-scope). Twincast
// ("Copy target instant or sorcery spell. You may choose new targets for the
// copy.") mentions "copy" broadly, exactly like a real clone effect, but the
// object being copied is a SPELL, not a creature/permanent — an object-TYPE
// scope mismatch rather than mill/wheels' player-scope mismatch, proving the
// shape generalizes rather than being a player-scope-only tool.
//
// Support is clone-shell enabling, not the copy effect itself — Mirror
// Gallery ("The 'legend rule' doesn't apply.") lets a deck stack multiple
// copies of the same legendary creature without losing them to the legend
// rule, the same ancillary role tutoring/recursion play for artifacts_matter.
//
// Checked #027's commanderPayoffMagnitudeGates reuse: no real Clones
// commander with a magnitude-qualified copy trigger was found — not forced.
const CLONES_CORE_PATTERNS = Object.freeze([
  /enters? (?:the battlefield )?as a copy of (?:any|target|another)? ?creature/i,
  /create[s]? a token that'?s a copy of (?:target|another|any) creature/i,
  /becomes? a copy of (?:target|another|any)? ?creature/i,
]);

const CLONES_SUPPORT_PATTERNS = Object.freeze([
  /the (?:"|')?legend rule(?:"|')? doesn'?t apply/i,
]);

const CLONES_MENTION = /\bcopy\b/i;
const CLONES_REQUIRED_SCOPE = /copy of (?:any|target|another)? ?creature|token that'?s a copy of (?:target|another|any) creature|becomes? a copy of (?:target|another|any)? ?creature/i;

const CLONES_SCOPE_CONFIG = Object.freeze({
  mentionPattern: CLONES_MENTION,
  requiredScopePattern: CLONES_REQUIRED_SCOPE,
});

const clones = Object.freeze({
  id: "clones",
  label: "Clones package",
  corePatterns: CLONES_CORE_PATTERNS,
  supportPatterns: CLONES_SUPPORT_PATTERNS,
  falseFriendShape: "wrong-target-scope",
  falseFriendConfig: CLONES_SCOPE_CONFIG,
  commander: Object.freeze({
    oraclePatterns: CLONES_CORE_PATTERNS,
  }),
  note: Object.freeze({
    aliases: Object.freeze(["clones", "clone deck", "copy creatures", "clone tribal", "copy matters"]),
  }),
  density: Object.freeze({ singletonCore: 6, constructedCore: 4, singletonSupport: 4, constructedSupport: 2 }),
});

// -----------------------------------------------------------------------------
// Flying
// -----------------------------------------------------------------------------
// Core is evasion-matters via the Flying keyword specifically, not generic
// evasion (menace/unblockable stay out) — Sephara, Sky's Blade ("Other
// creatures you control with flying have indestructible."), Favorable Winds
// ("Creatures you control with flying get +1/+1."), Aven Gagglemaster ("you
// gain 2 life for each creature you control with flying").
//
// False-friend shape: wrong-target-scope (reused). Serra Angel ("Flying,
// Vigilance.") mentions flying broadly (it has the keyword), but the effect
// never reaches a reward clause tying flying to a payoff — a keyword-vs-
// payoff scope mismatch, distinct from mill/wheels' player-scope mismatch
// and clones' object-type mismatch, further confirming the shape's general
// "broad mention passes, precise required scope fails" structure rather than
// being tied to any one domain.
//
// Support is temporarily granting flying, not rewarding it — Starry-Eyed
// Skyrider ("Whenever this creature attacks, another target creature you
// control gains flying until end of turn.") enables evasion without itself
// being the flying-matters payoff, the same ancillary role tutoring/
// recursion play for artifacts_matter.
//
// Checked #027's commanderPayoffMagnitudeGates reuse: no real Flying
// commander with a magnitude-qualified flying trigger was found — not
// forced.
const FLYING_CORE_PATTERNS = Object.freeze([
  /creatures? you control with flying (?:get|have|gain)/i,
  /for each creature you control with flying/i,
]);

const FLYING_SUPPORT_PATTERNS = Object.freeze([
  /(?:target|another target) creature[^.]* gains flying/i,
]);

const FLYING_MENTION = /\bflying\b/i;
const FLYING_REQUIRED_SCOPE = /creatures? you control with flying (?:get|have|gain)|for each creature you control with flying/i;

const FLYING_SCOPE_CONFIG = Object.freeze({
  mentionPattern: FLYING_MENTION,
  requiredScopePattern: FLYING_REQUIRED_SCOPE,
});

const flying = Object.freeze({
  id: "flying",
  label: "Flying package",
  corePatterns: FLYING_CORE_PATTERNS,
  supportPatterns: FLYING_SUPPORT_PATTERNS,
  falseFriendShape: "wrong-target-scope",
  falseFriendConfig: FLYING_SCOPE_CONFIG,
  commander: Object.freeze({
    oraclePatterns: FLYING_CORE_PATTERNS,
  }),
  note: Object.freeze({
    aliases: Object.freeze(["flying matters", "flying tribal", "evasion matters", "fliers deck", "skies"]),
  }),
  density: Object.freeze({ singletonCore: 12, constructedCore: 7, singletonSupport: 6, constructedSupport: 3 }),
});

// -----------------------------------------------------------------------------
// Group Slug
// -----------------------------------------------------------------------------
// Core is a symmetric multiplayer punisher keyed to an OPPONENT's own
// action, not your own spellcasting (that is burn's job) and not an
// opponent's draw/discard specifically (that is wheels'/discard's job) —
// Kaervek the Merciless ("Whenever an opponent casts a spell, Kaervek deals
// damage equal to that spell's mana value to any target."), Manabarbs
// ("Whenever a player taps a land for mana, this enchantment deals 1 damage
// to that player."), Revenge of Ravens ("Whenever a creature attacks you or
// a planeswalker you control, that creature's controller loses 1 life and
// you gain 1 life."). Deliberately scoped away from "whenever an opponent
// draws/discards" triggers — those already belong to wheels (#029) and
// discard (this batch) respectively; group_slug's own real territory is
// casting/mana-tapping/attacking triggers, not card-resource triggers.
//
// False-friend shape: wrong-target-scope (reused). Guttersnipe ("Whenever
// you cast an instant or sorcery spell, this creature deals 2 damage to each
// opponent.") is burn's own established core card — it mentions the same
// "deals damage to each opponent" punisher shape, but the trigger's SUBJECT
// is "you" (your own casting), not an opponent's/player's own action, a
// trigger-subject scope mismatch. Using burn's own core fixture as
// group_slug's false friend directly proves the two archetypes' promises
// don't overlap: the identical card is core for one and a false friend for
// the other, for exactly the reason each archetype's promise says it should
// be.
//
// Support is pillow-fort enabling, not the punisher trigger itself — Ghostly
// Prison ("Creatures can't attack you unless their controller pays {2} for
// each creature they control that's attacking you.") makes the archetype's
// plan viable without itself being a damage/life-loss trigger, the same
// ancillary role tutoring/recursion play for artifacts_matter.
//
// Checked #027's commanderPayoffMagnitudeGates reuse: Kaervek's damage is
// scaled BY a spell's mana value ("deals damage equal to that spell's mana
// value"), not GATED behind a "mana value N or greater/less" threshold — a
// different shape the magnitude-gate parser does not match — and no other
// real Group Slug commander with a magnitude-qualified trigger was found;
// not forced.
const GROUP_SLUG_CORE_PATTERNS = Object.freeze([
  /whenever (?:an opponent|a player|each opponent|each player) casts? a spell,[^.]*deals? [^.]*damage/i,
  /whenever a player taps a land for mana,[^.]*deals? \d+ damage/i,
  /whenever [^.]* attacks you(?: or a planeswalker you control)?,[^.]*(?:loses? \d+ life|deals? \d+ damage)/i,
]);

const GROUP_SLUG_SUPPORT_PATTERNS = Object.freeze([
  /can'?t attack you unless (?:their|its) controller pays/i,
]);

const GROUP_SLUG_MENTION = /deals? \d+ damage to (?:each opponent|that player|any target)|loses? \d+ life/i;
const GROUP_SLUG_REQUIRED_SCOPE = /whenever (?:an opponent|a player|each opponent|each player)[^.]*(?:casts?|draws?|discards?|attacks?|taps?)/i;

const GROUP_SLUG_SCOPE_CONFIG = Object.freeze({
  mentionPattern: GROUP_SLUG_MENTION,
  requiredScopePattern: GROUP_SLUG_REQUIRED_SCOPE,
});

const groupSlug = Object.freeze({
  id: "group_slug",
  label: "Group Slug package",
  corePatterns: GROUP_SLUG_CORE_PATTERNS,
  supportPatterns: GROUP_SLUG_SUPPORT_PATTERNS,
  falseFriendShape: "wrong-target-scope",
  falseFriendConfig: GROUP_SLUG_SCOPE_CONFIG,
  commander: Object.freeze({
    oraclePatterns: GROUP_SLUG_CORE_PATTERNS,
  }),
  note: Object.freeze({
    aliases: Object.freeze(["group slug", "symmetric damage", "punisher deck", "pillow fort damage", "table-wide punisher"]),
  }),
  density: Object.freeze({ singletonCore: 8, constructedCore: 5, singletonSupport: 6, constructedSupport: 3 }),
});

// -----------------------------------------------------------------------------
// Infect
// -----------------------------------------------------------------------------
// Core is the Infect/Toxic keyword mechanic itself and real poison-counter
// payoffs — Skithiryx, the Blight Dragon carries Infect directly ("This
// creature deals damage to creatures in the form of -1/-1 counters and to
// players in the form of poison counters."); Vishgraz, the Doomhive grants
// toxic 1 and scales off poison ("Vishgraz gets +1/+1 for each poison
// counter your opponents have."); Ixhel, Scion of Atraxa's Corrupted ability
// is a real poison-threshold payoff ("each opponent who has three or more
// poison counters exiles..."). Unlike flying/legends (where merely HAVING
// the keyword is a false friend), an infect creature genuinely IS the
// archetype's payoff, the same way a real burn spell is burn's own core —
// having infect/toxic is not demoted to support.
//
// False-friend shape: wrong-target-scope, generalized to a grant-vs-negate
// POLARITY mismatch (new sub-domain — see the shared evaluator's comment).
// Melira, Sylvok Outcast — "You can't get poison counters. Creatures you
// control can't have -1/-1 counters put on them. Creatures your opponents
// control lose infect." — is real infect-HATE, not infect: it mentions
// "infect" and "poison counters" as broadly as any real payoff card, but
// every clause is a negation (lose/can't), the polarity opposite of the
// archetype's promise. corePatterns exclude "lose infect" by construction
// (a negative lookbehind on "lose(s) " immediately before "infect"), so
// Melira never satisfies core in the first place; the false-friend check
// then explicitly flags her via the broader mention-without-grant scope,
// rather than letting her silently fall through as ordinary non-occupancy.
//
// Support is proliferate — a real infect enabler (grows poison counters
// alongside every other counter in the deck) without itself being the
// "many poison counters/infect creatures" payoff. Proliferate is CORE to
// counters_matter and SUPPORT here — the same card legitimately occupying
// different roles in different archetypes, per the task's own overlap
// allowance (see mill/graveyard's Stitcher's Supplier precedent).
//
// Checked #027's commanderPayoffMagnitudeGates reuse: no real Infect
// commander with a magnitude-qualified cast/play trigger was found —
// Skithiryx's own text has no cast trigger at all — not forced.
const INFECT_CORE_PATTERNS = Object.freeze([
  /(?<!loses? )\binfect\b/i,
  /\btoxic \d+\b/i,
  /for each poison counter/i,
  /poison counters?[^.]*(?:exiles?|draws?|creates?|gains?|deals?)/i,
]);

const INFECT_SUPPORT_PATTERNS = Object.freeze([
  /\bproliferate\b/i,
]);

const INFECT_MENTION = /\binfect\b|\btoxic \d+\b|\bpoison counters?\b/i;
const INFECT_REQUIRED_SCOPE = /(?<!loses? )\binfect\b|\btoxic \d+\b|for each poison counter|poison counters?[^.]*(?:exiles?|draws?|creates?|gains?|deals?)/i;

const INFECT_SCOPE_CONFIG = Object.freeze({
  mentionPattern: INFECT_MENTION,
  requiredScopePattern: INFECT_REQUIRED_SCOPE,
});

const infect = Object.freeze({
  id: "infect",
  label: "Infect package",
  corePatterns: INFECT_CORE_PATTERNS,
  supportPatterns: INFECT_SUPPORT_PATTERNS,
  falseFriendShape: "wrong-target-scope",
  falseFriendConfig: INFECT_SCOPE_CONFIG,
  commander: Object.freeze({
    oraclePatterns: INFECT_CORE_PATTERNS,
  }),
  note: Object.freeze({
    aliases: Object.freeze(["infect", "poison", "poison counters", "toxic", "poison deck"]),
  }),
  density: Object.freeze({ singletonCore: 10, constructedCore: 6, singletonSupport: 6, constructedSupport: 3 }),
});

// -----------------------------------------------------------------------------
// Extra Combats
// -----------------------------------------------------------------------------
// Core is a real granted additional combat phase — WotC's templating for
// this effect is a single fixed phrase across every printing (Aurelia, the
// Warleader: "After this phase, there is an additional combat phase.";
// Relentless Assault; Aggravated Assault; Moraug, Fury of Akoum; Seize the
// Day) — not merely attacking, dealing combat damage, or having haste.
//
// False-friend shape: wrong-target-scope, the same grant-vs-negate POLARITY
// mismatch infect needs (see that entry's comment and the shared
// evaluator's comment), confirming the sub-domain is genuinely shared across
// two independent archetypes rather than a one-off. Stonehorn Dignitary —
// "When this creature enters, target opponent skips their next combat
// phase." — and the same-shaped Moment of Silence / Empty City Ruse / False
// Peace all mention "combat phase" as broadly as any real extra-combat
// card, but deny one from an opponent rather than granting one to you — the
// exact polarity opposite of the archetype's promise, real pillow-fort/stax
// staples, not a hypothetical.
//
// Support is haste — Fervor ("Creatures you control have haste.") lets
// creatures played or untapped mid-turn actually attack in the granted
// second combat, without itself granting the phase, the same ancillary role
// tutoring/recursion play for artifacts_matter.
//
// Checked #027's commanderPayoffMagnitudeGates reuse: Tifa, Martial Artist
// is a real commander whose extra-combat trigger is power-magnitude-gated
// ("creatures you control with power 7 or greater deal combat damage to a
// player") — but the gate parser only matches "whenever you cast/play a
// [type] spell/permanent with [metric] N or greater/less" (a cast/play
// trigger), and Tifa's trigger is a combat-damage trigger, not a cast/play
// trigger, so it structurally does not parse as a magnitude gate at all;
// not forced. Tifa's own text already satisfies corePatterns directly
// (it contains "there is an additional combat phase"), so she opens the
// package through the generic pattern regardless.
const EXTRA_COMBATS_CORE_PATTERNS = Object.freeze([
  /\badditional combat phase\b/i,
]);

const EXTRA_COMBATS_SUPPORT_PATTERNS = Object.freeze([
  /creatures you control have haste/i,
]);

const EXTRA_COMBATS_MENTION = /\bcombat phase\b/i;
const EXTRA_COMBATS_REQUIRED_SCOPE = /\badditional combat phase\b/i;

const EXTRA_COMBATS_SCOPE_CONFIG = Object.freeze({
  mentionPattern: EXTRA_COMBATS_MENTION,
  requiredScopePattern: EXTRA_COMBATS_REQUIRED_SCOPE,
});

const extraCombats = Object.freeze({
  id: "extra_combats",
  label: "Extra Combats package",
  corePatterns: EXTRA_COMBATS_CORE_PATTERNS,
  supportPatterns: EXTRA_COMBATS_SUPPORT_PATTERNS,
  falseFriendShape: "wrong-target-scope",
  falseFriendConfig: EXTRA_COMBATS_SCOPE_CONFIG,
  commander: Object.freeze({
    oraclePatterns: EXTRA_COMBATS_CORE_PATTERNS,
  }),
  note: Object.freeze({
    aliases: Object.freeze(["extra combats", "additional combat phase", "extra combat phase", "combat matters", "attack twice"]),
  }),
  density: Object.freeze({ singletonCore: 6, constructedCore: 4, singletonSupport: 6, constructedSupport: 3 }),
});

// -----------------------------------------------------------------------------
// Theft
// -----------------------------------------------------------------------------
// Core is gaining control of an opponent's live battlefield permanent —
// Dragonlord Silumgar ("gain control of target creature or planeswalker for
// as long as you control Dragonlord Silumgar."), Zealous-Conscripts-class
// temporary steals, Memnarch ("Gain control of target artifact."), and
// Insurrection's real mass-theft ("Untap all creatures and gain control of
// them until end of turn. They gain haste until end of turn.").
//
// False-friend shape: wrong-target-scope, reusing #030's object-TYPE-
// mismatch sub-domain (clones' spell-vs-creature) but scoped instead to a
// battlefield-permanent-vs-graveyard-card mismatch. Reanimate — "Put target
// creature card from a graveyard onto the battlefield under your control."
// — mentions "under your control" as broadly as any real theft card, but
// the object is a graveyard CARD (could be anyone's, including your own),
// not a live permanent currently under an opponent's control — a source-
// scope mismatch, not the archetype's promise. corePatterns require the
// literal "gain control of target X" construction Reanimate never uses (its
// verb is "Put ... onto the battlefield", not "gain control of"), so she
// never satisfies core; wrong-target-scope's broader mention (bare "under
// your control") still catches and explicitly flags her. Notably, the exact
// same card is graveyard's (#030) own "doesn't even qualify, no shape
// needed" example there — here it DOES trip the broader mention and gets an
// explicit false-friend flag instead, a legitimately different outcome for
// the identical card in two different archetypes' worked examples.
//
// Support is a sacrifice outlet — Ashnod's Altar ("Sacrifice a creature:
// Add {C}{C}.") converts a temporarily-stolen creature into permanent value
// before a "for as long as"/"until end of turn" steal expires and the
// creature returns to its owner, a real and common theft-deck pattern,
// without itself being the control-change effect.
//
// Checked #027's commanderPayoffMagnitudeGates reuse: no real Theft
// commander with a magnitude-qualified cast/play trigger was found —
// Dragonlord Silumgar's own trigger is an ETB, not a cast/play-with-type
// trigger — not forced.
const THEFT_CORE_PATTERNS = Object.freeze([
  /gain control of target [^.]{0,30}?(?:creature|permanent|artifact|planeswalker)\b/i,
  /untap all creatures and gain control of them/i,
]);

const THEFT_SUPPORT_PATTERNS = Object.freeze([
  /sacrifice a creature:/i,
]);

const THEFT_MENTION = /gain control of|under your control|owner'?s control/i;
const THEFT_REQUIRED_SCOPE = /gain control of target [^.]{0,30}?(?:creature|permanent|artifact|planeswalker)\b|gain control of all creatures/i;

const THEFT_SCOPE_CONFIG = Object.freeze({
  mentionPattern: THEFT_MENTION,
  requiredScopePattern: THEFT_REQUIRED_SCOPE,
});

const theft = Object.freeze({
  id: "theft",
  label: "Theft package",
  corePatterns: THEFT_CORE_PATTERNS,
  supportPatterns: THEFT_SUPPORT_PATTERNS,
  falseFriendShape: "wrong-target-scope",
  falseFriendConfig: THEFT_SCOPE_CONFIG,
  commander: Object.freeze({
    oraclePatterns: THEFT_CORE_PATTERNS,
  }),
  note: Object.freeze({
    aliases: Object.freeze(["theft", "control magic", "steal creatures", "mind control", "threaten effects"]),
  }),
  density: Object.freeze({ singletonCore: 6, constructedCore: 4, singletonSupport: 4, constructedSupport: 2 }),
});

// -----------------------------------------------------------------------------
// Planeswalkers / Superfriends
// -----------------------------------------------------------------------------
// Core is a real payoff for having MANY planeswalkers together, not merely
// generic +1/+1-counter synergy proliferate also touches — Mila, Crafty
// Companion (front face of Mila // Lukka, a real legendary-creature
// commander): "Whenever an opponent attacks one or more planeswalkers you
// control, put a loyalty counter on each planeswalker you control."; Chandra,
// Legacy of Fire: "Chandra deals X damage to each opponent, where X is the
// number of planeswalkers you control." / "Add {R} for each planeswalker you
// control."; Oath of Teferi: "You may activate the loyalty abilities of
// planeswalkers you control twice each turn rather than only once."
//
// Deliberately kept disjoint from #028's counters_matter on purpose: a
// planeswalker's LOYALTY counter is a structurally different counter type
// from a +1/+1 counter, and superfriends' corePatterns never use "+1/+1"
// wording at all, while counters_matter's own corePatterns all require the
// literal "+1/+1" substring — neither list can accidentally satisfy the
// other by construction, not just by empirical luck. Concretely: Atraxa,
// Praetors' Voice ("At the beginning of your end step, proliferate.") is
// this codebase's own canonical "Superfriends commander" reference
// (docs/FOUNDER_ISSUES.md #023/#024) — bare proliferate opens counters_matter
// (its own corePatterns include /\bproliferate\b/i directly) but deliberately
// does NOT open superfriends, since Atraxa's text never mentions a
// planeswalker at all. That is why Atraxa was NOT chosen as this entry's
// commander fixture even though she is the codebase's go-to Superfriends
// flavor example — Mila is the honest choice because her own text is
// planeswalker-specific, not generic-counter-shaped. Verified in the test
// file with an explicit disjointness assertion, the same way #030 proved
// discard/wheels and group_slug/burn disjointness with real fixtures.
//
// False-friend shape: wrong-target-scope, a mention-vs-count-reward
// mismatch (new sub-domain, shared with goad below). Baird, Steward of
// Argive — "Creatures can't attack you or planeswalkers you control unless
// their controller pays {1} for each of those creatures." — mentions
// "planeswalkers you control" as broadly as any real payoff card, but is a
// flat attack-tax that helps identically whether you control one
// planeswalker or ten — it never rewards HAVING MANY, the archetype's real
// promise.
//
// Support is proliferate — grows loyalty across every planeswalker you
// control without itself being the "many planeswalkers together" payoff,
// the same enabler role it plays for infect above and the same
// cross-archetype role split the task specifically asked to guard.
// reuseProtectionSupport is also set: a Shalai-class "planeswalkers you
// control have hexproof" grant is a genuine enabler (protects the plan)
// rather than a false friend, consumed via the same existing "protection"
// semantic tag artifacts_matter/lifegain/lands_matter/legends already reuse.
//
// Checked #027's commanderPayoffMagnitudeGates reuse: no real Superfriends
// commander with a magnitude-qualified cast/play trigger was found — not
// forced.
const SUPERFRIENDS_CORE_PATTERNS = Object.freeze([
  /loyalty counters? on each planeswalker/i,
  /for each planeswalker you control/i,
  /loyalty abilities of planeswalkers you control/i,
  /number of planeswalkers you control/i,
]);

const SUPERFRIENDS_SUPPORT_PATTERNS = Object.freeze([
  /\bproliferate\b/i,
]);

const SUPERFRIENDS_MENTION = /planeswalkers? you control|loyalty (?:counters?|abilit(?:y|ies))/i;
const SUPERFRIENDS_REQUIRED_SCOPE = /loyalty counters? on each planeswalker|for each planeswalker you control|loyalty abilities of planeswalkers you control|number of planeswalkers you control/i;

const SUPERFRIENDS_SCOPE_CONFIG = Object.freeze({
  mentionPattern: SUPERFRIENDS_MENTION,
  requiredScopePattern: SUPERFRIENDS_REQUIRED_SCOPE,
});

const superfriends = Object.freeze({
  id: "superfriends",
  label: "Planeswalkers / Superfriends package",
  corePatterns: SUPERFRIENDS_CORE_PATTERNS,
  supportPatterns: SUPERFRIENDS_SUPPORT_PATTERNS,
  reuseProtectionSupport: true,
  falseFriendShape: "wrong-target-scope",
  falseFriendConfig: SUPERFRIENDS_SCOPE_CONFIG,
  commander: Object.freeze({
    oraclePatterns: SUPERFRIENDS_CORE_PATTERNS,
  }),
  note: Object.freeze({
    aliases: Object.freeze(["superfriends", "planeswalkers matter", "planeswalker tribal", "loyalty matters", "walker deck"]),
  }),
  density: Object.freeze({ singletonCore: 6, constructedCore: 4, singletonSupport: 6, constructedSupport: 3 }),
});

// -----------------------------------------------------------------------------
// Forced Combat / Goad
// -----------------------------------------------------------------------------
// Core is the Goad keyword/mechanic itself — Marisi, Breaker of the Coil
// ("Whenever a creature you control deals combat damage to a player, goad
// each creature that player controls."), Alela, Cunning Conqueror ("goad
// target creature that player controls"), Baeloth Barrityl, Entertainer
// ("Creatures your opponents control with power less than Baeloth
// Barrityl's power are goaded.") — not merely attack triggers in general
// (that stays group_slug's/burn's territory).
//
// False-friend shape: wrong-target-scope, the same mention-vs-count-reward
// mismatch superfriends needs above, confirming the sub-domain is shared
// rather than a one-off. Serene Sleuth — "At the beginning of combat on
// your turn, investigate for each goaded creature you control. Then each
// creature you control is no longer goaded." — mentions "goaded" as broadly
// as any real goad card, but never itself applies goad to anything; it only
// counts and then REMOVES existing goaded status as a rider on an unrelated
// card-advantage engine (investigate/Clues) — the mention passes, but the
// archetype's real action verb (goad target/each/all creature(s)) never
// appears.
//
// Support is a byproduct-of-goad payoff — Kardur, Doomscourge's own second
// ability ("Whenever an attacking creature dies, each opponent loses 1 life
// and you gain 1 life.") rewards the combat goad forces without itself
// applying goad (Kardur's own first ability is goad's unkeyworded effect,
// predating the Ixalan keyword — real evidence the effect existed before
// the reminder text, not a fixture for corePatterns), the same ancillary
// role tutoring/recursion play for artifacts_matter.
//
// Checked #027's commanderPayoffMagnitudeGates reuse: no real Goad commander
// with a magnitude-qualified cast/play trigger was found — not forced.
const GOAD_CORE_PATTERNS = Object.freeze([
  /\bgoad (?:target|each|all|one or more)\b[^.]{0,25}?\bcreatures?\b/i,
  /\bgoad it\b/i,
  /\bare goaded\b/i,
  /\bis goaded\b/i,
]);

const GOAD_SUPPORT_PATTERNS = Object.freeze([
  /whenever an attacking creature dies,[^.]*(?:lose|gain) \d+ life/i,
]);

const GOAD_MENTION = /\bgoad(?:ed|s)?\b/i;
const GOAD_REQUIRED_SCOPE = /\bgoad (?:target|each|all|one or more)\b[^.]{0,25}?\bcreatures?\b|\bgoad it\b|\bare goaded\b|\bis goaded\b/i;

const GOAD_SCOPE_CONFIG = Object.freeze({
  mentionPattern: GOAD_MENTION,
  requiredScopePattern: GOAD_REQUIRED_SCOPE,
});

const goad = Object.freeze({
  id: "goad",
  label: "Forced Combat / Goad package",
  corePatterns: GOAD_CORE_PATTERNS,
  supportPatterns: GOAD_SUPPORT_PATTERNS,
  falseFriendShape: "wrong-target-scope",
  falseFriendConfig: GOAD_SCOPE_CONFIG,
  commander: Object.freeze({
    oraclePatterns: GOAD_CORE_PATTERNS,
  }),
  note: Object.freeze({
    aliases: Object.freeze(["goad", "goad deck", "forced combat", "make them fight", "political combat"]),
  }),
  density: Object.freeze({ singletonCore: 8, constructedCore: 5, singletonSupport: 6, constructedSupport: 3 }),
});

// -----------------------------------------------------------------------------
// Vehicles
// -----------------------------------------------------------------------------
// Core is a real Vehicle-specific payoff — Depala, Pilot Exemplar's own
// "Each Vehicle you control gets +1/+1 as long as it's a creature.", Kotori,
// Pilot Prodigy's "Vehicles you control have crew 2.", Astor, Bearer of
// Blades' "Vehicles you control have crew 1.", Cid, Freeflier Pilot's
// "Equipment and Vehicle spells you cast cost {1} less to cast.", and a
// combat-damage payoff keyed to the type specifically (Edward Kenway:
// "Whenever a Vehicle you control deals combat damage to a player, ...").
//
// False-friend shape: broad-type-superset, reused DIRECTLY from
// artifacts_matter (not a new sub-domain) with typePattern /\bVehicle\b/i
// instead of /\bArtifact\b/i — deliberately one level deeper than
// artifacts_matter's own trap, since every Vehicle is already an Artifact
// by rules text ("Artifact — Vehicle"). Cultivator's Caravan — "{T}: Add
// one mana of any color. Crew 3." — proves the trap recurs: its type line
// carries BOTH "Artifact" and "Vehicle", but it is a vanilla mana rock with
// zero payoff text for either archetype, the same false-friend shape one
// subtype layer down.
//
// Kept structurally disjoint from artifacts_matter on purpose (the task's
// own overlap warning): every corePattern here requires the literal word
// "Vehicle", and none of artifacts_matter's ARTIFACT_PAYOFF_PATTERNS do —
// neither list can accidentally satisfy the other by construction. Verified
// against real evidence, not just the regex: Depala's own payoff clause
// ("Each Vehicle you control gets +1/+1...") does not contain the word
// "artifact" anywhere and does not open artifacts_matter; conversely
// artifacts_matter's own commander fixture, T'Challa, the Black Panther,
// has no "Vehicle" text and does not open this package. The reward-mapping
// evidence tells the same story one layer further down: PAYOFFS.artifacts
// in forge-interaction-graph.mjs requires the literal word "artifact", and
// Depala's own text never says it either — confirmed by testing the regex
// directly, not assumed — which is exactly why this package maps to `[]` in
// package-plan-optimizer.mjs rather than reusing artifacts_matter's
// "artifacts" reward category (see that file's own comment). Verified with
// an explicit disjointness test, the same way #030 proved discard/wheels
// and group_slug/burn disjointness with real commander fixtures.
//
// Support is Vehicle-specific recursion — Cid, Freeflier Pilot's own second
// clause ("Return target Equipment or Vehicle card from your graveyard to
// your hand.") is real recursion support, the same ancillary role
// tutoring/recursion play for artifacts_matter.
//
// Checked #027's commanderPayoffMagnitudeGates reuse: no real Vehicles
// commander with a magnitude-qualified cast/play trigger was found — not
// forced.
const VEHICLES_CORE_PATTERNS = Object.freeze([
  /vehicles? you control (?:get|have|gain)/i,
  /vehicle spells? you cast cost \{[^}]+\} less/i,
  /whenever (?:a|another) vehicle (?:you control )?(?:enters|attacks|deals combat damage to a player)/i,
]);

const VEHICLES_SUPPORT_PATTERNS = Object.freeze([
  /return target (?:equipment or )?vehicle card from your graveyard to your hand/i,
]);

const vehicles = Object.freeze({
  id: "vehicles",
  label: "Vehicles package",
  corePatterns: VEHICLES_CORE_PATTERNS,
  supportPatterns: VEHICLES_SUPPORT_PATTERNS,
  reuseProtectionSupport: true,
  falseFriendShape: "broad-type-superset",
  falseFriendConfig: Object.freeze({ typePattern: /\bVehicle\b/i }),
  commander: Object.freeze({
    oraclePatterns: VEHICLES_CORE_PATTERNS,
  }),
  note: Object.freeze({
    aliases: Object.freeze(["vehicles", "vehicle tribal", "crew matters", "pilots deck", "vehicles matter"]),
  }),
  density: Object.freeze({ singletonCore: 8, constructedCore: 5, singletonSupport: 6, constructedSupport: 3 }),
});

// -----------------------------------------------------------------------------
// -1/-1 Counters
// -----------------------------------------------------------------------------
// Core is real -1/-1-counter placement and its payoffs — the archetype's own
// application shape (Wither itself: "This deals damage to creatures in the
// form of -1/-1 counters." — genuinely core here, not demoted, the same way
// the Infect keyword itself is core for #031's infect) plus a real placement/
// reward engine: Hapatra, Vizier of Poisons ("Whenever Hapatra deals combat
// damage to a player, you may put a -1/-1 counter on target creature." /
// "Whenever you put one or more -1/-1 counters on a creature, create a 1/1
// green Snake creature token with deathtouch."), The Scorpion God ("Whenever
// a creature with a -1/-1 counter on it dies, draw a card."), Auntie Ool,
// Cursewretch ("Whenever one or more -1/-1 counters are put on a creature,
// draw a card if you control that creature."), and for-each payoffs (Dusk
// Urchins: "draw a card for each -1/-1 counter on it").
//
// Deliberately kept disjoint from #028's counters_matter and #031's infect by
// construction, not just by empirical luck: counters_matter's own
// corePatterns all require the literal "+1/+1" substring, which no
// -1/-1-counter card ever contains; infect's own corePatterns require
// "infect"/"toxic N"/"poison counter" text, which Hapatra's own oracle text
// never contains either way. Verified with real fixtures: Hapatra (this
// entry's commander) opens neither counters_matter nor infect; Vorel of the
// Hull Clade (counters_matter's own commander, "Double the number of each
// kind of counter...") never says "-1/-1" and does not open this package;
// Skithiryx, the Blight Dragon (infect's own commander) DOES mention
// "-1/-1 counters" inside Infect's own reminder text ("deals damage to
// creatures in the form of -1/-1 counters"), but that phrasing never matches
// this entry's corePatterns (the verb is "deals damage ... in the form of",
// never "put ... on target/another/each"), so she does not open this package
// either — checked directly, not assumed.
//
// False-friend shape: wrong-target-scope, a self-cost-vs-payoff scope
// mismatch (new sub-domain — a card's own -1/-1-counter placement targets
// ITSELF as an unrelated activation cost, not a real placement/payoff).
// Devoted Druid — "Put a -1/-1 counter on this creature: Untap this
// creature." — mentions "-1/-1 counter" as broadly as any real payoff card,
// but the counter goes on "this creature" (itself, as a cost to ramp mana),
// never on a target/another/each creature the way every real core fixture's
// text does — corePatterns' own "on (?:target|another|each)" requirement
// already excludes "on this creature" by construction, and the false-friend
// check explicitly flags her via the broader bare mention.
//
// Support is proliferate — grows -1/-1 counters (and poison counters, and
// +1/+1 counters) alongside everything else in the deck without itself being
// the "-1/-1 counters matter" payoff. The same card is CORE for
// counters_matter and SUPPORT for both infect and here — the same real card
// legitimately occupying different roles in different archetypes, the same
// cross-archetype allowance #031's infect entry already exercises.
//
// Checked #027's commanderPayoffMagnitudeGates reuse: no real -1/-1 Counters
// commander with a magnitude-qualified cast/play trigger was found — Hapatra's
// own triggers are combat-damage/placement triggers, not cast/play triggers —
// not forced.
const NEG_COUNTERS_CORE_PATTERNS = Object.freeze([
  /put (?:a|one|two|three|four|five|x|that many|\d+) -1\/-1 counters? on (?:target|another|each)\b/i,
  /whenever you put (?:one or more )?-1\/-1 counters? on|whenever one or more -1\/-1 counters? (?:is|are) put/i,
  /whenever a creature (?:with a -1\/-1 counter on it|that has a -1\/-1 counter)[^.]* dies/i,
  /for each -1\/-1 counter/i,
  /\bwither\b/i,
]);

const NEG_COUNTERS_SUPPORT_PATTERNS = Object.freeze([
  /\bproliferate\b/i,
]);

const NEG_COUNTERS_MENTION = /-1\/-1 counters?\b|\bwither\b/i;
const NEG_COUNTERS_REQUIRED_SCOPE = /put (?:a|one|two|three|four|five|x|that many|\d+) -1\/-1 counters? on (?:target|another|each)\b|whenever you put (?:one or more )?-1\/-1 counters? on|whenever one or more -1\/-1 counters? (?:is|are) put|whenever a creature (?:with a -1\/-1 counter on it|that has a -1\/-1 counter)[^.]* dies|for each -1\/-1 counter|\bwither\b/i;

const NEG_COUNTERS_SCOPE_CONFIG = Object.freeze({
  mentionPattern: NEG_COUNTERS_MENTION,
  requiredScopePattern: NEG_COUNTERS_REQUIRED_SCOPE,
});

const negCounters = Object.freeze({
  id: "neg_counters",
  label: "-1/-1 Counters package",
  corePatterns: NEG_COUNTERS_CORE_PATTERNS,
  supportPatterns: NEG_COUNTERS_SUPPORT_PATTERNS,
  falseFriendShape: "wrong-target-scope",
  falseFriendConfig: NEG_COUNTERS_SCOPE_CONFIG,
  commander: Object.freeze({
    oraclePatterns: NEG_COUNTERS_CORE_PATTERNS,
  }),
  note: Object.freeze({
    aliases: Object.freeze(["-1/-1 counters", "negative counters", "wither", "poison counters on creatures", "-1/-1 counters matter"]),
  }),
  density: Object.freeze({ singletonCore: 10, constructedCore: 6, singletonSupport: 6, constructedSupport: 3 }),
});

// -----------------------------------------------------------------------------
// Pillow Fort
// -----------------------------------------------------------------------------
// Core is the defensive taxation/deterrence shape itself — "creatures can't
// attack you (or planeswalkers you control) unless their controller pays" —
// WotC's fixed templating across the archetype's own staples: Ghostly Prison
// and Propaganda ("Creatures can't attack you unless their controller pays
// {2} for each creature they control that's attacking you."), Baird, Steward
// of Argive ("Creatures can't attack you or planeswalkers you control unless
// their controller pays {1} for each of those creatures."), Norn's Annex,
// Sphere of Safety, Windborn Muse, Archangel of Tithes.
//
// This is deliberately the exact text #030's group_slug already documents as
// its own SUPPORT (Ghostly Prison is group_slug's own supportPatterns
// fixture) and correctly REJECTS as group_slug core (Baird has no "deals
// damage"/"loses life" clause, so group_slug's own corePatterns never match
// her) — this entry captures that same taxation shape as ITS real core
// identity instead. Baird legitimately occupies two different roles in two
// different archetypes: support (a pillow-fort enabler) for group_slug's
// punisher plan, and core (the archetype's own defining promise) here — the
// same cross-archetype allowance #030's own Stitcher's Supplier precedent
// established. Verified with real fixtures: Baird opens this package; Kaervek
// the Merciless (group_slug's own commander, "Whenever an opponent casts a
// spell, Kaervek deals damage equal to that spell's mana value to any
// target.") has no "attack"/"can't attack" text at all and does not open this
// package; conversely Baird's own static tax ability has no "whenever ...
// casts/taps/attacks ...deals damage/loses life" trigger shape and does not
// open group_slug — checked directly against both entries' real corePatterns,
// not assumed disjoint.
//
// False-friend shape: wrong-target-scope, a hard-prevention-vs-taxation scope
// mismatch (new sub-domain). Sandwurm Convergence — "Creatures with flying
// can't attack you or planeswalkers you control." — mentions "can't attack
// you" as broadly as any real pillow-fort card, but is an absolute ban with
// no "unless ... pays" taxation clause at all; its real payoff is a 5/5 Wurm
// token each end step, a token-engine-plus-wall card, not the propaganda-tax
// promise this archetype is scoped to.
//
// Support is a one-shot/repeatable Fog effect — Inkshield and Druid's
// Deliverance's shared "Prevent all combat damage that would be dealt to you
// this turn." buys a single turn of safety without itself being the
// repeatable taxation payoff, an enabler role rather than the archetype's own
// identity.
//
// Checked #027's commanderPayoffMagnitudeGates reuse: no real Pillow Fort
// commander with a magnitude-qualified cast/play trigger was found — Baird's
// own tax is a static ability, not a cast/play trigger — not forced.
const PILLOW_FORT_CORE_PATTERNS = Object.freeze([
  /creatures? can'?t attack you(?: or (?:a|another)? ?planeswalkers? you control)? unless (?:their|its) controller pays/i,
]);

const PILLOW_FORT_SUPPORT_PATTERNS = Object.freeze([
  /prevent all combat damage that would be dealt to you this turn/i,
]);

const PILLOW_FORT_MENTION = /can'?t attack you\b/i;
const PILLOW_FORT_REQUIRED_SCOPE = /creatures? can'?t attack you(?: or (?:a|another)? ?planeswalkers? you control)? unless (?:their|its) controller pays/i;

const PILLOW_FORT_SCOPE_CONFIG = Object.freeze({
  mentionPattern: PILLOW_FORT_MENTION,
  requiredScopePattern: PILLOW_FORT_REQUIRED_SCOPE,
});

const pillowFort = Object.freeze({
  id: "pillow_fort",
  label: "Pillow Fort package",
  corePatterns: PILLOW_FORT_CORE_PATTERNS,
  supportPatterns: PILLOW_FORT_SUPPORT_PATTERNS,
  falseFriendShape: "wrong-target-scope",
  falseFriendConfig: PILLOW_FORT_SCOPE_CONFIG,
  commander: Object.freeze({
    oraclePatterns: PILLOW_FORT_CORE_PATTERNS,
  }),
  note: Object.freeze({
    aliases: Object.freeze(["pillow fort", "propaganda deck", "taxation defense", "stay safe", "attack tax"]),
  }),
  density: Object.freeze({ singletonCore: 8, constructedCore: 5, singletonSupport: 6, constructedSupport: 3 }),
});

// -----------------------------------------------------------------------------
// Toughness Matters
// -----------------------------------------------------------------------------
// Core is a real payoff scaling off a creature's toughness specifically —
// Doran, the Siege Tower ("Each creature assigns combat damage equal to its
// toughness rather than its power."), Arcades, the Strategist (the same
// combat-damage swap scoped to defender creatures, plus "Whenever a creature
// you control with defender enters, draw a card."), Plagon, Lord of the
// Beach ("draw a card for each creature you control with toughness greater
// than its power."), Fruit of the First Tree ("you gain X life and draw X
// cards, where X is its toughness.") — distinct from #028's generic
// counters_matter (a +1/+1-counter-shaped promise, not a stat-shaped one).
//
// False-friend shape: incidental-rider, reused as-is (the same shape
// counters_matter/lifegain/burn/discard/graveyard already use — no type-line
// concept applies to a stat like toughness, and this is not a player-scope
// mismatch, so wrong-target-scope doesn't structurally fit the way it does
// for neg_counters/pillow_fort above). Blood Lust — "If target creature has
// toughness 5 or greater, it gets +4/-4 until end of turn. Otherwise, it gets
// +4/-X until end of turn, where X is its toughness minus 1." — mentions
// "toughness" as a magnitude-gate condition and even contains the literal
// substring "where X is its toughness" (which would otherwise satisfy this
// entry's own corePatterns), but the dominant effect is an unrelated combat-
// trick/removal pump, not a toughness-matters payoff — the rider gate
// excludes her from core before corePatterns is even checked, the same
// protection counters_matter's own gated-removal-spell rider gets.
//
// Support is a defender-attack enabler, not the payoff itself — Felothar the
// Steadfast's and Arcades' own "Creatures you control can attack as though
// they didn't have defender." clause lets a wall-heavy board actually turn
// sideways in the granted combat-damage-by-toughness mode without itself
// being the toughness-scaling reward, the same ancillary role haste plays
// for #031's extra_combats.
//
// Checked #027's commanderPayoffMagnitudeGates reuse: no real Toughness
// Matters commander with a magnitude-qualified cast/play trigger was found —
// Doran's/Arcades'/Plagon's own triggers are combat-damage/ETB triggers, not
// cast/play triggers — not forced.
const TOUGHNESS_CORE_PATTERNS = Object.freeze([
  /assigns? combat damage equal to its toughness rather than its power/i,
  /toughness greater than its power/i,
  /where x is its toughness\b/i,
  /whenever a creature you control with defender enters,[^.]*draw/i,
]);

const TOUGHNESS_SUPPORT_PATTERNS = Object.freeze([
  /can attack as though (?:it|they) didn'?t have defender/i,
]);

const TOUGHNESS_MENTION = /\btoughness\b/i;
const TOUGHNESS_RIDER_GATE = /\bif\b[^.]*toughness[^.]*,/i;
const TOUGHNESS_DOMINANT_OTHER = /gets? [+-]\d+\/[+-]\d+ until end of turn/i;

const TOUGHNESS_RIDER_CONFIG = Object.freeze({
  mentionPattern: TOUGHNESS_MENTION,
  gatePattern: TOUGHNESS_RIDER_GATE,
  dominantOtherPattern: TOUGHNESS_DOMINANT_OTHER,
});

const toughnessMatters = Object.freeze({
  id: "toughness_matters",
  label: "Toughness Matters package",
  corePatterns: TOUGHNESS_CORE_PATTERNS,
  supportPatterns: TOUGHNESS_SUPPORT_PATTERNS,
  falseFriendShape: "incidental-rider",
  falseFriendConfig: TOUGHNESS_RIDER_CONFIG,
  commander: Object.freeze({
    oraclePatterns: TOUGHNESS_CORE_PATTERNS,
  }),
  note: Object.freeze({
    aliases: Object.freeze(["toughness matters", "defender matters", "walls deck", "big butts", "toughness tribal"]),
  }),
  density: Object.freeze({ singletonCore: 8, constructedCore: 5, singletonSupport: 6, constructedSupport: 3 }),
});

// -----------------------------------------------------------------------------
// Extra Turns
// -----------------------------------------------------------------------------
// Core is a real granted extra turn — WotC's fixed templating across the
// archetype's own staples: Time Warp, Temporal Manipulation, Beacon of
// Tomorrows ("Target player takes an extra turn after this one."), Time
// Stretch ("Target player takes two extra turns after this one."), and the
// real commander fixture Medomai the Ageless ("Whenever Medomai deals combat
// damage to a player, take an extra turn after this one.") — distinct from
// #031's extra_combats, which is extra COMBAT PHASES within the same turn,
// not extra turns. Kept disjoint by construction: extra_combats' own
// corePatterns require the literal "additional combat phase" substring,
// which no extra-turn card's text contains, and this entry's own
// corePatterns require "extra turn(s) after this one", which no extra-combat
// card's text contains either. Verified with real fixtures: Medomai (this
// entry's commander) has no "additional combat phase" text and does not open
// extra_combats; Aurelia, the Warleader (extra_combats' own commander,
// "After this phase, there is an additional combat phase.") has no "extra
// turn" text at all and does not open this package — checked directly, not
// assumed.
//
// False-friend shape: wrong-target-scope, the same grant-vs-negate POLARITY
// mismatch #031's infect/extra_combats already established, confirming the
// sub-domain is genuinely shared rather than tied to combat-phase text
// specifically. Stranglehold — "If an opponent would begin an extra turn,
// that player skips that turn instead." — mentions "extra turn" as broadly
// as any real grant, but denies one rather than granting it, a real stax
// staple, not a hypothetical (the same real-card class as extra_combats' own
// Stonehorn Dignitary).
//
// Support is Seedborn Muse's own "Untap all permanents you control during
// each other player's untap step." — keeps mana and creatures available
// across turns that aren't your own (both your own granted bonus turns and
// an opponent's turn when politically gifting one), a real archetype-
// adjacent enabler without itself granting or denying an extra turn.
//
// Checked #027's commanderPayoffMagnitudeGates reuse: no real Extra Turns
// commander with a magnitude-qualified cast/play trigger was found —
// Medomai's own trigger is a combat-damage trigger, not a cast/play trigger —
// not forced.
const EXTRA_TURNS_CORE_PATTERNS = Object.freeze([
  /extra turns? after this one\b/i,
]);

const EXTRA_TURNS_SUPPORT_PATTERNS = Object.freeze([
  /untap all permanents you control during each other player'?s untap step/i,
]);

const EXTRA_TURNS_MENTION = /extra turns?\b/i;
const EXTRA_TURNS_REQUIRED_SCOPE = /extra turns? after this one\b/i;

const EXTRA_TURNS_SCOPE_CONFIG = Object.freeze({
  mentionPattern: EXTRA_TURNS_MENTION,
  requiredScopePattern: EXTRA_TURNS_REQUIRED_SCOPE,
});

const extraTurns = Object.freeze({
  id: "extra_turns",
  label: "Extra Turns package",
  corePatterns: EXTRA_TURNS_CORE_PATTERNS,
  supportPatterns: EXTRA_TURNS_SUPPORT_PATTERNS,
  falseFriendShape: "wrong-target-scope",
  falseFriendConfig: EXTRA_TURNS_SCOPE_CONFIG,
  commander: Object.freeze({
    oraclePatterns: EXTRA_TURNS_CORE_PATTERNS,
  }),
  note: Object.freeze({
    aliases: Object.freeze(["extra turns", "additional turns", "time walk effects", "take another turn", "turns matter"]),
  }),
  density: Object.freeze({ singletonCore: 6, constructedCore: 4, singletonSupport: 6, constructedSupport: 3 }),
});

// -----------------------------------------------------------------------------
// Sagas
// -----------------------------------------------------------------------------
// Core is the Saga enchantment subtype's own chapter-based mechanic
// specifically — the real commander fixture Narci, Fable Singer ("Whenever
// the final chapter ability of a Saga you control resolves, each opponent
// loses X life and you gain X life, where X is that Saga's mana value."),
// Tom Bombadil (the same "final chapter ability ... resolves" trigger shape,
// plus "As long as there are four or more lore counters among Sagas you
// control..."), Garnet, Princess of Alexandria ("remove a lore counter from
// each of any number of Sagas you control. Put a +1/+1 counter on Garnet for
// each lore counter removed this way."), Satsuki, the Living Lore ("Put a
// lore counter on each Saga you control.").
//
// A deliberately narrow substitute for what EDHREC calls "Historic" (skipped
// in #031's batch specifically because its literal definition — legendary +
// artifact + Saga — would have overlapped both #030's legends and #029's
// artifacts_matter): Sagas is the one clean, non-overlapping third of that
// tag. Kept disjoint from #029's enchantress and #030's legends by
// construction, not just by empirical luck — this entry's own corePatterns
// require the literal chapter/lore-counter mechanic ("final chapter ability
// ... resolves", "lore counter(s) ... Sagas you control"), never the bare
// words "Enchantment" or "Legendary" enchantress's/legends' own corePatterns
// look for. Verified with the real commander fixture: Narci's own oracle
// text ALSO has "Whenever you sacrifice an enchantment, draw a card." — a
// real enchantment-adjacent clause — but its literal wording ("sacrifice an
// enchantment") never matches enchantress's own corePatterns (which require
// the literal phrase "is put into a graveyard from the battlefield," not
// "sacrifice"), so Narci does not open enchantress; she has no legendary-
// permanents-you-control text at all, so she does not open legends either —
// checked directly against both entries' real corePatterns, not assumed.
//
// False-friend shape: broad-type-superset, reused DIRECTLY from
// enchantress/legends/vehicles, one Enchantment-subtype layer deeper — every
// Saga is already an Enchantment by rules text ("Enchantment — Saga"), the
// same trap vehicles already proved recurs one Artifact-subtype layer down
// from artifacts_matter. The Eldest Reborn — "(As this Saga enters and after
// your draw step, add a lore counter. Sacrifice after III.) I — ... II — ...
// III — ..." — is a vanilla Saga: its type line carries "Saga", and its own
// reminder text even says "lore counter", but that reminder text is generic
// to every Saga ever printed and never reaches this entry's own required
// "final chapter ability ... resolves" or "lore counter(s) ... Sagas you
// control" construction, so she never satisfies corePatterns despite being
// exactly the type. The same false-friend flag The Eldest Reborn trips here
// also legitimately trips enchantress's own broad-type-superset check (her
// type line contains "Enchantment" too), the same double-false-friend
// outcome vehicles' own Cultivator's Caravan already established for
// artifacts_matter/vehicles.
//
// Support is Saga-specific recursion — Rydia, Summoner of Mist's own "Return
// target Saga card with mana value X from your graveyard to the battlefield
// ..." rebuys a spent Saga without itself being the chapter-payoff, the same
// ancillary role tutoring/recursion play for artifacts_matter.
//
// Checked #027's commanderPayoffMagnitudeGates reuse: no real Sagas
// commander with a magnitude-qualified cast/play trigger was found — Narci's/
// Tom Bombadil's own triggers are chapter-resolution triggers, not cast/play
// triggers — not forced.
const SAGAS_CORE_PATTERNS = Object.freeze([
  /final chapter ability of a saga[^.]* resolves/i,
  /lore counters?[^.]{0,40}sagas? you control/i,
]);

const SAGAS_SUPPORT_PATTERNS = Object.freeze([
  /return target saga card[^.]*from your graveyard/i,
]);

const sagas = Object.freeze({
  id: "sagas",
  label: "Sagas package",
  corePatterns: SAGAS_CORE_PATTERNS,
  supportPatterns: SAGAS_SUPPORT_PATTERNS,
  falseFriendShape: "broad-type-superset",
  falseFriendConfig: Object.freeze({ typePattern: /\bSaga\b/i }),
  commander: Object.freeze({
    oraclePatterns: SAGAS_CORE_PATTERNS,
  }),
  note: Object.freeze({
    aliases: Object.freeze(["sagas", "saga tribal", "chapter matters", "lore counters", "saga deck"]),
  }),
  density: Object.freeze({ singletonCore: 6, constructedCore: 4, singletonSupport: 4, constructedSupport: 2 }),
});

// -----------------------------------------------------------------------------
// Energy
// -----------------------------------------------------------------------------
// Core is the Energy counter resource pool itself — producing it ("you get
// {E}") and spending it ("pay {E}: [effect]") — Nissa, Worldsoul Speaker
// ("Landfall — Whenever a land you control enters, you get {E}{E}. You may
// pay eight {E} rather than pay the mana cost for permanent spells you
// cast."), Dr. Madison Li ("Whenever you cast an artifact spell, you get {E}.
// {T}, Pay {E}{E}{E}: Draw a card."), Saheeli, Radiant Creator, Pia Nalaar,
// Chief Mechanic. Unlike a broad type line, {E} is a precise mana-symbol
// construction that virtually never appears for anything unrelated to the
// archetype — the same way Infect's own keyword genuinely IS #031's core, not
// demoted to support. Task brief flags Energy as a player-RESOURCE pool,
// structurally distinct from a permanent-attached +1/+1 or -1/-1 counter —
// checked directly, not assumed: counters_matter's own corePatterns all
// require the literal "+1/+1" substring and neg_counters' all require "-1/-1",
// neither of which any real {E} card's text ever contains (Nissa's and Dr.
// Madison Li's own oracle text have zero "+1/+1"/"-1/-1" substrings), while
// counters_matter's own commander (Vorel of the Hull Clade, "Double the
// number of each kind of counter...") and neg_counters' own commander
// (Hapatra, Vizier of Poisons) both have zero "{E}" text. A single real card
// can still legitimately spend energy for a permanent counter (Longtusk Cub:
// "Pay {E}{E}: Put a +1/+1 counter on this creature." — genuinely opens both
// energy AND counters_matter) without breaking COMMANDER-level disjointness,
// the same multi-role allowance #030's Stitcher's Supplier precedent
// established.
//
// False-friend shape: wrong-target-scope, a bare-word-vs-mana-symbol
// mismatch (new sub-domain — the word "energy" predates and outlives the
// Kaladesh {E} mechanic in card text far more than any other archetype's
// keyword). Death Tyrant's own named ability "Negative Energy Cone —
// Whenever an attacking creature you control or a blocking creature an
// opponent controls dies, create a 2/2 black Zombie creature token." mentions
// "Energy" as broadly as any real payoff card, but never uses the {E} symbol
// anywhere — an unrelated death-trigger token maker that merely borrowed the
// word for its ability name. Energy Bolt ("Energy Bolt deals X damage to
// target player or planeswalker.") is the same trap by card name alone: it
// is a plain burn spell with zero energy-counter mechanic in its own oracle
// text.
//
// Support is a cost-discount enabler, not the pool itself — Blaster Hulk's
// own "This spell costs {1} less to cast for each {E} (energy counter)
// you've paid or lost this turn." makes future energy-spending cheaper as a
// byproduct without itself being a get/pay payoff, the same ancillary role
// tutoring/recursion play for artifacts_matter.
//
// Checked #027's commanderPayoffMagnitudeGates reuse: no real Energy
// commander with a magnitude-qualified cast/play trigger was found — Nissa's
// own trigger is Landfall, not a cast/play trigger, and Dr. Madison Li's/
// Saheeli's own triggers have no numeric mana-value/power/toughness bar at
// all — not forced.
const ENERGY_CORE_PATTERNS = Object.freeze([
  /you get (?:an? |two |three |four |five |six |seven |eight |nine |ten |x |an amount of |that many )?\{e\}/i,
  /pay (?:\{e\}+|any amount of \{e\}|one or more \{e\}|x \{e\}|eight \{e\}|\d+ \{e\})/i,
  /amount of \{e\} you have/i,
]);

const ENERGY_SUPPORT_PATTERNS = Object.freeze([
  /costs? \{[^}]+\} less to cast for each \{e\}/i,
]);

const ENERGY_MENTION = /\benergy\b/i;
const ENERGY_REQUIRED_SCOPE = /\{e\}/i;

const ENERGY_SCOPE_CONFIG = Object.freeze({
  mentionPattern: ENERGY_MENTION,
  requiredScopePattern: ENERGY_REQUIRED_SCOPE,
});

const energy = Object.freeze({
  id: "energy",
  label: "Energy package",
  corePatterns: ENERGY_CORE_PATTERNS,
  supportPatterns: ENERGY_SUPPORT_PATTERNS,
  falseFriendShape: "wrong-target-scope",
  falseFriendConfig: ENERGY_SCOPE_CONFIG,
  commander: Object.freeze({
    oraclePatterns: ENERGY_CORE_PATTERNS,
  }),
  note: Object.freeze({
    aliases: Object.freeze(["energy", "energy counters", "get energy", "kaladesh energy", "energy matters"]),
  }),
  density: Object.freeze({ singletonCore: 8, constructedCore: 5, singletonSupport: 4, constructedSupport: 2 }),
});

// -----------------------------------------------------------------------------
// Populate
// -----------------------------------------------------------------------------
// Core is the Populate keyword/mechanic specifically — Ghired, Conclave Exile
// ("Whenever Ghired attacks, populate. ... (To populate, create a token
// that's a copy of a creature token you control.)"), Trostani, Selesnya's
// Voice ("{1}{G}{W}, {T}: Populate.").
//
// CRITICAL overlap risk named by the task: #030's clones already covers
// creature-copying broadly. Kept disjoint by construction, not just by
// empirical luck: clones' own second corePattern requires the literal
// determiner "target"/"another"/"any" immediately before "creature"
// (/create[s]? a token that'?s a copy of (?:target|another|any) creature/i),
// while every real Populate card's own reminder text uses the determiner "a"
// instead ("a copy of A creature token you control") — "a" is not "target",
// "another", or "any", so it never satisfies clones' own pattern. Verified
// directly against both entries' real corePatterns: Ghired's and Trostani's
// own oracle text opens populate but not clones; conversely clones' own
// commander fixture, Sakashima of a Thousand Faces ("You may have Sakashima
// enter as a copy of another creature you control..."), has no "populate"
// text and no "copy of a ... token you control" construction, so he does not
// open populate either.
//
// False-friend shape: wrong-target-scope, reusing #030's object-TYPE-mismatch
// sub-domain clones itself opened, but from the OPPOSITE direction — a card
// that broadly reads like a token-copy effect but copies the WRONG source
// object. Rite of Replication ("Create a token that's a copy of target
// creature.") mentions "create a token that's a copy of" as broadly as any
// real populate card, but the object is "target creature" (any creature on
// the battlefield), not specifically a token you already control — clones'
// own real core card is populate's own false friend, directly proving the
// two promises don't overlap, the same way #030's group_slug used burn's own
// Guttersnipe.
//
// Support is raw creature-token production, not the copy effect itself —
// Ghired's own first ability ("When Ghired enters, create a 4/4 green Rhino
// creature token with trample.") feeds populate's required raw material
// (you must already control a token to populate from) without itself being
// the copy effect, the same ancillary role tutoring/recursion play for
// artifacts_matter — deliberately reusing tokens' own token-generator
// territory here since populate structurally REQUIRES it, unlike other
// archetypes' merely-adjacent enablers.
//
// Checked #027's commanderPayoffMagnitudeGates reuse: no real Populate
// commander with a magnitude-qualified cast/play trigger was found —
// Ghired's own trigger is an attack trigger, not a cast/play trigger — not
// forced.
const POPULATE_CORE_PATTERNS = Object.freeze([
  /\bpopulate\b/i,
  /create[s]? a token that'?s a copy of (?:a|one of (?:those|your)|another) (?:creature )?tokens? you control/i,
]);

const POPULATE_SUPPORT_PATTERNS = Object.freeze([
  /create(?:s)? (?:a|an|\d+|x) [^.]{0,30} creature tokens?/i,
]);

const POPULATE_MENTION = /create[s]? a token that'?s a copy of/i;
const POPULATE_REQUIRED_SCOPE = /\bpopulate\b|create[s]? a token that'?s a copy of (?:a|one of (?:those|your)|another) (?:creature )?tokens? you control/i;

const POPULATE_SCOPE_CONFIG = Object.freeze({
  mentionPattern: POPULATE_MENTION,
  requiredScopePattern: POPULATE_REQUIRED_SCOPE,
});

const populate = Object.freeze({
  id: "populate",
  label: "Populate package",
  corePatterns: POPULATE_CORE_PATTERNS,
  supportPatterns: POPULATE_SUPPORT_PATTERNS,
  falseFriendShape: "wrong-target-scope",
  falseFriendConfig: POPULATE_SCOPE_CONFIG,
  commander: Object.freeze({
    oraclePatterns: POPULATE_CORE_PATTERNS,
  }),
  note: Object.freeze({
    aliases: Object.freeze(["populate", "token copy", "copy a token", "populate deck", "token doubling"]),
  }),
  density: Object.freeze({ singletonCore: 6, constructedCore: 4, singletonSupport: 6, constructedSupport: 3 }),
});

// -----------------------------------------------------------------------------
// Monarch
// -----------------------------------------------------------------------------
// Core is the Monarch mechanic itself — becoming the monarch (self-grant, the
// archetype's own headline promise) and reward clauses conditioned on holding
// or observing the crown — Queen Marchesa ("When Queen Marchesa enters, you
// become the monarch. At the beginning of your upkeep, if an opponent is the
// monarch, create a 1/1 black Assassin creature token..."), the Throne of
// Eldraine Court cycle (Court of Ire: "When this enchantment enters, you
// become the monarch. At the beginning of your upkeep, this enchantment
// deals 2 damage to any target. If you're the monarch, it deals 7 damage
// instead."), Dawnglade Regent ("As long as you're the monarch, permanents
// you control have hexproof.").
//
// False-friend shape: incidental-rider, reused with a genuinely different
// real fixture than the other incidental-rider entries. Fight for the
// Throne — "Put a +1/+1 counter on target creature you control. Then it
// fights target creature an opponent controls. When the creature an
// opponent controls dies this turn, if you control your commander, you
// become the monarch." — mentions "you become the monarch" as literally as
// any real payoff card, but its dominant effect is an unrelated fight-style
// removal spell, and the monarch grant is a minor bonus gated behind an
// unrelated commander-control condition — structurally identical to
// counters_matter's/burn's/discard's/graveyard's/toughness_matters' own
// gated-rider precedent. No real hate/negation card for Monarch was found
// among 61 real printed "monarch" cards checked directly (Jared Carthalion's
// own "You can't become the monarch this turn." is a minor self-denial
// clause on a card whose OTHER ability, "while you're the monarch, prevent
// that damage...", is itself a genuine core-matching payoff, so the card as
// a whole is core, not a clean false friend) — Fight for the Throne is the
// one real card whose dominant identity is unambiguously not the archetype.
//
// Support is monarch-conditioned evasion/attack-restriction, not the
// grant/payoff itself — Azure Fleet Admiral's own "This creature can't be
// blocked by creatures the monarch controls." and Crown-Hunter Hireling's
// own "This creature can't attack unless defending player is the monarch."
// are real political enablers for a crown-focused board plan without
// themselves granting or rewarding monarchy, the same ancillary role
// tutoring/recursion play for artifacts_matter.
//
// Checked #027's commanderPayoffMagnitudeGates reuse: no real Monarch
// commander with a magnitude-qualified cast/play trigger was found — Queen
// Marchesa's own trigger is an ETB, not a cast/play trigger — not forced.
const MONARCH_CORE_PATTERNS = Object.freeze([
  /\bbecomes? the monarch\b/i,
  /(?:if|while|whenever|as long as) [^.]*(?:is|are|'?re) the monarch\b/i,
]);

const MONARCH_SUPPORT_PATTERNS = Object.freeze([
  /can'?t be blocked by creatures the monarch controls/i,
  /can'?t attack unless defending player is the monarch/i,
]);

const MONARCH_MENTION = /\bmonarch\b/i;
const MONARCH_RIDER_GATE = /\bif\b(?:(?!monarch)[^.,])*,[^.]*you become the monarch\b/i;
const MONARCH_DOMINANT_OTHER = /fights? target creature|\+1\/\+1 counter on target creature/i;

const MONARCH_RIDER_CONFIG = Object.freeze({
  mentionPattern: MONARCH_MENTION,
  gatePattern: MONARCH_RIDER_GATE,
  dominantOtherPattern: MONARCH_DOMINANT_OTHER,
});

const monarch = Object.freeze({
  id: "monarch",
  label: "Monarch package",
  corePatterns: MONARCH_CORE_PATTERNS,
  supportPatterns: MONARCH_SUPPORT_PATTERNS,
  falseFriendShape: "incidental-rider",
  falseFriendConfig: MONARCH_RIDER_CONFIG,
  commander: Object.freeze({
    oraclePatterns: MONARCH_CORE_PATTERNS,
  }),
  note: Object.freeze({
    aliases: Object.freeze(["monarch", "become the monarch", "crown", "monarchy", "king of the hill"]),
  }),
  density: Object.freeze({ singletonCore: 8, constructedCore: 5, singletonSupport: 6, constructedSupport: 3 }),
});

// -----------------------------------------------------------------------------
// Anthems
// -----------------------------------------------------------------------------
// Core is a real STATIC team-wide pump — Elesh Norn, Grand Cenobite ("Other
// creatures you control get +2/+2."), Maja, Bretagard Protector ("Other
// creatures you control get +1/+1."), Jetmir, Nexus of Revels ("Creatures
// you control get +1/+0 ... as long as you control three or more
// creatures.") — deliberately excluding a temporary/activated pump
// ("... until end of turn") from core via a bounded negative lookahead, the
// same way the archetype's own real identity is an always-on team boost, not
// a combat trick.
//
// CRITICAL overlap risk named by the task: the original 10 PACKAGE_CATALOG's
// own `tokens` entry (strategic-intent.mjs), since anthem effects are
// frequently paired with token strategies but are not the same promise. Kept
// disjoint by construction: every corePattern here requires the literal word
// "creatures" immediately before "you control get/have", and Intangible
// Virtue — the real card proving the boundary — reads "Creature tokens you
// control get +1/+1 and have vigilance." The substring "creatures you
// control get" never appears (the actual adjacent words are "tokens you
// control get"), so corePatterns never match; the false-friend check's
// broader mention (bare "tokens you control get +1/+1") does match, correctly
// flagging her. The same real card is genuine SUPPORT for tokens (Intangible
// Virtue trips tokens' own token_payoff semantic, /tokens? you control/i,
// directly) and a FALSE FRIEND here — the same real card legitimately
// occupying two different roles in two different archetypes, the precedent
// #030's Stitcher's Supplier and #032's Ghostly Prison already established.
// Verified with a commander-level check too: Elesh Norn's own pure-anthem
// text has zero "token" mentions at all and does not open tokens (confirmed
// against detectTokensCommander's own literal "create ... token"
// requirement); conversely Krenko, Mob Boss ("{T}: Create X 1/1 red Goblin
// creature tokens...") — a real tokens commander — has zero "+X/+X" pump
// text and does not open anthems.
//
// Support is a temporary/activated pump, not the static payoff itself —
// Purphoros, God of the Forge's own "{2}{R}: Creatures you control get
// +1/+0 until end of turn." and Balmor, Battlemage Captain's own "creatures
// you control get +1/+0 ... until end of turn" are real triggered/activated
// boosts, an enabler role distinct from the archetype's always-on promise.
//
// Checked #027's commanderPayoffMagnitudeGates reuse: no real Anthems
// commander with a magnitude-qualified cast/play trigger was found — Elesh
// Norn's own pump is a static ability, not a cast/play trigger — not forced.
const ANTHEM_CORE_PATTERNS = Object.freeze([
  /(?:other )?(?:\w+ )?creatures you control get \+\d+\/\+\d+(?![^.]*until end of turn)/i,
]);

const ANTHEM_SUPPORT_PATTERNS = Object.freeze([
  /creatures you control get \+\d+\/\+\d+[^.]*until end of turn/i,
]);

const ANTHEM_MENTION = /(?:tokens?|creatures?) you control (?:get|have) \+\d+\/\+\d+/i;
// Deliberately does NOT repeat corePatterns' "until end of turn" exclusion —
// that exclusion is a core-vs-support split (static vs. temporary pump), not
// a core-vs-false-friend one. A temporary team pump (Purphoros's own "{2}{R}:
// Creatures you control get +1/+0 until end of turn.") must pass this check
// so it lands as real SUPPORT, not get double-flagged as a false friend for
// the unrelated reason of being temporary — false friend here is reserved for
// the token/creature object-type mismatch Intangible Virtue actually trips.
const ANTHEM_REQUIRED_SCOPE = /(?:other )?(?:\w+ )?creatures you control (?:get|have) \+\d+\/\+\d+/i;

const ANTHEM_SCOPE_CONFIG = Object.freeze({
  mentionPattern: ANTHEM_MENTION,
  requiredScopePattern: ANTHEM_REQUIRED_SCOPE,
});

const anthems = Object.freeze({
  id: "anthems",
  label: "Anthems package",
  corePatterns: ANTHEM_CORE_PATTERNS,
  supportPatterns: ANTHEM_SUPPORT_PATTERNS,
  falseFriendShape: "wrong-target-scope",
  falseFriendConfig: ANTHEM_SCOPE_CONFIG,
  commander: Object.freeze({
    oraclePatterns: ANTHEM_CORE_PATTERNS,
  }),
  note: Object.freeze({
    aliases: Object.freeze(["anthem", "anthems", "team pump", "creatures get +1/+1", "lord effects"]),
  }),
  density: Object.freeze({ singletonCore: 10, constructedCore: 6, singletonSupport: 6, constructedSupport: 3 }),
});

// -----------------------------------------------------------------------------
// Devotion
// -----------------------------------------------------------------------------
// Core is a real devotion-COUNT payoff — a stat or scaling effect that reads
// your devotion to a color as its own X — the Theros Beyond Death Demigod
// cycle (Anax, Hardened in the Forge: "Anax's power is equal to your
// devotion to red."; Daxos, Blessed by the Sun; Renata, Called to the Hunt),
// Gray Merchant of Asphodel ("each opponent loses X life, where X is your
// devotion to black."), and the devotion-scaled mana engines Nykthos, Shrine
// to Nyx and Karametra's Acolyte ("Add an amount of {G} equal to your
// devotion to green.").
//
// False-friend shape: wrong-target-scope, a gating-clause-vs-scaling-reward
// mismatch (new sub-domain, grounded in the entire Theros god cycle, not a
// one-off). Every Theros/Theros Beyond Death god shares the identical
// templating "As long as your devotion to [color] is less than five, ~ isn't
// a creature." — Purphoros, God of the Forge mentions "devotion to red" as
// broadly as any real payoff card, but that clause is purely a creature/
// noncreature status TOGGLE, not a scaling reward, and his own actual value
// engine ("Whenever another creature you control enters, Purphoros deals 2
// damage to each opponent.") has nothing to do with devotion count at all —
// confirmed against six independent real gods sharing the exact same gating
// text (Heliod, Sun-Crowned; Xenagos, God of Revels; Thassa, Deep-Dwelling;
// Iroas, God of Victory; Mogis, God of Slaughter; Klothys, God of Destiny),
// not a single-card coincidence.
//
// Support is a devotion-count amplifier, not the scaling payoff itself —
// Altar of the Pantheon's own "Your devotion to each color and each
// combination of colors is increased by one." artificially inflates your
// devotion count without itself being a reward that reads it, the same
// ancillary role tutoring/recursion play for artifacts_matter.
//
// Checked #027's commanderPayoffMagnitudeGates reuse: no real Devotion
// commander with a magnitude-qualified cast/play trigger was found — Anax's/
// Daxos's/Renata's own triggers are static stat-defining abilities, not
// cast/play triggers — not forced.
const DEVOTION_CORE_PATTERNS = Object.freeze([
  /equal to your devotion to \w+/i,
  /where x is your devotion to \w+/i,
]);

const DEVOTION_SUPPORT_PATTERNS = Object.freeze([
  /devotion to [^.]* is increased by/i,
]);

const DEVOTION_MENTION = /devotion to \w+/i;
// Required scope also accepts the support-tier "is increased by" construction
// (Altar of the Pantheon) so a genuine devotion-count enabler lands as real
// SUPPORT rather than getting double-flagged as a false friend — the isCreature
// gating clause (Purphoros and the rest of the Theros god cycle) is the only
// real false friend this check is meant to catch, not every non-scaling
// devotion mention.
const DEVOTION_REQUIRED_SCOPE = /equal to your devotion to \w+|where x is your devotion to \w+|devotion to [^.]* is increased by/i;

const DEVOTION_SCOPE_CONFIG = Object.freeze({
  mentionPattern: DEVOTION_MENTION,
  requiredScopePattern: DEVOTION_REQUIRED_SCOPE,
});

const devotion = Object.freeze({
  id: "devotion",
  label: "Devotion package",
  corePatterns: DEVOTION_CORE_PATTERNS,
  supportPatterns: DEVOTION_SUPPORT_PATTERNS,
  falseFriendShape: "wrong-target-scope",
  falseFriendConfig: DEVOTION_SCOPE_CONFIG,
  commander: Object.freeze({
    oraclePatterns: DEVOTION_CORE_PATTERNS,
  }),
  note: Object.freeze({
    aliases: Object.freeze(["devotion", "devotion matters", "theros gods", "devotion count", "devotion to a color"]),
  }),
  density: Object.freeze({ singletonCore: 8, constructedCore: 5, singletonSupport: 6, constructedSupport: 3 }),
});

// -----------------------------------------------------------------------------
// Cascade
// -----------------------------------------------------------------------------
// Core is the Cascade keyword mechanic itself — having it or granting it —
// Maelstrom Wanderer ("Cascade, cascade"), Imoti, Celebrant of Bounty
// ("Cascade. Spells you cast with mana value 6 or greater have cascade."),
// Zhulodok, Void Gorger, Yidris, Maelstrom Wielder ("...as you cast spells
// from your hand this turn, they gain cascade."). A negative lookbehind
// excludes the reactive phrase "a spell WITH cascade" (referencing someone
// else's spell having the keyword) from corePatterns, distinct from "Cascade"
// as a standalone keyword line or "have/has/gain cascade" as a grant
// construction — the same real distinction infect's own corePatterns draw
// between having/granting infect and merely referencing it.
//
// False-friend shape: incidental-rider. Rain of Riches — "When this
// enchantment enters, create two Treasure tokens. The first spell you cast
// each turn that mana from a Treasure was spent to cast has cascade." —
// mentions "cascade" as literally as any real grant, gated behind an
// unrelated Treasure-spending condition, on a card whose dominant identity is
// Treasure-token production (tokens/ramp territory), not a "cascade matters"
// payoff — structurally identical to counters_matter's/burn's/discard's own
// gated-rider precedent.
//
// Support is a reward for casting cascade spells, not having/granting
// cascade itself — The First Doctor's own "Whenever you cast a spell with
// cascade, put a +1/+1 counter on target artifact or creature." rewards a
// cascade-dense deck without itself carrying or granting the keyword (the
// "with cascade" reactive phrasing is exactly what corePatterns' negative
// lookbehind excludes), the same byproduct-of-the-mechanic role #031's
// goad entry established for Kardur, Doomscourge's second ability.
//
// Checked #027's commanderPayoffMagnitudeGates reuse: no real Cascade
// commander with a magnitude-qualified cast/play trigger was found — every
// real granted-cascade clause checked (Imoti's "mana value 6 or greater",
// Zhulodok's "mana value 7 or greater") gates whether a spell GAINS cascade,
// not a payoff magnitude gate on an unrelated reward — structurally a
// different shape than #027's parser targets — not forced.
const CASCADE_CORE_PATTERNS = Object.freeze([
  /(?<!with )\bcascade\b(?=\s*[,.(]|$)/i,
]);

const CASCADE_SUPPORT_PATTERNS = Object.freeze([
  /whenever you cast a spell with cascade,[^.]*(?:counter|draw|create|deals?)/i,
]);

const CASCADE_MENTION = /\bcascade\b/i;
const CASCADE_RIDER_GATE = /\bthat\b(?:(?!cascade)[^.,])*\bhas cascade\b/i;
const CASCADE_DOMINANT_OTHER = /create (?:a |two |three |four |\d+ )?treasure tokens?/i;

const CASCADE_RIDER_CONFIG = Object.freeze({
  mentionPattern: CASCADE_MENTION,
  gatePattern: CASCADE_RIDER_GATE,
  dominantOtherPattern: CASCADE_DOMINANT_OTHER,
});

const cascade = Object.freeze({
  id: "cascade",
  label: "Cascade package",
  corePatterns: CASCADE_CORE_PATTERNS,
  supportPatterns: CASCADE_SUPPORT_PATTERNS,
  falseFriendShape: "incidental-rider",
  falseFriendConfig: CASCADE_RIDER_CONFIG,
  commander: Object.freeze({
    oraclePatterns: CASCADE_CORE_PATTERNS,
  }),
  note: Object.freeze({
    aliases: Object.freeze(["cascade", "cascade deck", "free spells", "cascade triggers", "cascade value"]),
  }),
  density: Object.freeze({ singletonCore: 6, constructedCore: 4, singletonSupport: 4, constructedSupport: 2 }),
});

// -----------------------------------------------------------------------------
// Cantrips
// -----------------------------------------------------------------------------
// Core is deliberately narrower than the original PACKAGE_CATALOG's own
// `spellslinger` entry (coreSemantics: ["cheap_spell"] — ANY instant/sorcery
// with mana value <= 2, regardless of what it does). Cantrips' real promise
// is specifically CHEAP, REPLACEMENT-VALUE spells and payoffs keyed to
// casting many of them, not casting instants/sorceries generally. Two real
// shapes: (1) the cantrip SPELLS themselves — Opt ("Scry 1. ... Draw a
// card."), Preordain ("Scry 2, then draw a card."), Consider ("Surveil 1. ...
// Draw a card.") — a card-neutral scry/surveil-then-draw template; (2) the
// payoff for casting many of them — Jori En, Ruin Diver ("Whenever you cast
// your second spell each turn, draw a card."), Kraum, Violent Cacophony
// ("Whenever you cast your second spell each turn, put a +1/+1 counter on
// Kraum and draw a card.").
//
// Disjointness from spellslinger, verified directly rather than assumed: (a)
// card-level — every real cantrip is inherently ALSO spellslinger fuel (Opt
// is a cmc-1 Instant, so it always satisfies spellslinger's own cheap_spell
// semantic too) — this is a genuine, legitimate co-occupancy, the same
// precedent already established for graveyard/reanimator both touching the
// graveyard-resource vocabulary "without either stealing the other's
// promise" (see this file's own #030 comment and package-plan-optimizer.mjs's
// PACKAGE_RELEVANT_REWARDS comment for graveyard). (b) commander-level — this
// is where the real discrimination lives. spellslinger's own
// detectSpellslingerCommander/spell_payoff semantics require the literal
// words "instant"/"sorcery"/"noncreature"/magecraft/"copy target instant or
// sorcery" immediately after "cast". Jori En's and Kraum's own real trigger
// text says "cast your second spell" — bare "spell", no type word — so ithe
// commander never trips spellslinger's own detection at all. Checked
// directly: neither /whenever you cast (?:an? )?(?:instant|sorcery|
// noncreature)/i nor magecraft nor "copy target instant or sorcery" appears
// in either commander's text.
//
// False-friend shape: wrong-target-scope (reused), a new "Nth-spell-mention
// vs draw-reward" sub-domain. Kalamax, the Stormsire — "Whenever you cast
// your first instant spell each turn, if Kalamax is tapped, copy that spell."
// — mentions the same "cast your [Nth] ... spell each turn" construction as
// broadly as Jori En/Kraum (this file's own required-scope check would
// otherwise treat it as a mention), but its reward is a COPY, not a draw —
// spell_copy's own real territory (see that entry below), not cantrips'.
// Required scope requires the literal word "draw" inside the same trigger
// sentence; Kalamax's clause never has it. Verified directly: Kalamax fails
// cantrips' own corePatterns, and cardIsArchetypeFalseFriend flags him
// correctly — while he remains real CORE for spell_copy, the same
// same-real-card-two-different-roles precedent #030's Stitcher's Supplier
// and #032's Ghostly Prison already established.
//
// Support is a raw cost-reduction enabler, not the payoff or the cantrip
// itself — Baral, Chief of Compliance's own "Instant and sorcery spells you
// cast cost {1} less to cast." lowers the bar for casting many cheap spells
// without itself drawing a card or gating on spell count, the same ancillary
// role tutoring/recursion play for artifacts_matter.
//
// Checked #027's commanderPayoffMagnitudeGates reuse: the gate parser
// requires a captured type word between the determiner and "spell"
// (PAYOFF_MAGNITUDE_CONDITION's own capture group), so a bare "cast your
// second spell" (no type word at all) can never populate a gate — not a
// structural fit, not forced.
const CANTRIPS_PAYOFF_PATTERNS = Object.freeze([
  /whenever you cast your (?:first|second|third) [^.]*spell each turn,[^.]*draw/i,
]);

const CANTRIPS_SPELL_SHAPE_PATTERNS = Object.freeze([
  /\b(?:scry|surveil) \d+\b[\s\S]{0,120}?draw a card\b/i,
]);

const CANTRIPS_CORE_PATTERNS = Object.freeze([
  ...CANTRIPS_PAYOFF_PATTERNS,
  ...CANTRIPS_SPELL_SHAPE_PATTERNS,
]);

const CANTRIPS_SUPPORT_PATTERNS = Object.freeze([
  /instant and sorcery spells you cast cost \{[^}]+\} less to cast/i,
]);

const CANTRIPS_MENTION = /whenever you cast your (?:first|second|third)[^.]*spell each turn\b/i;
const CANTRIPS_REQUIRED_SCOPE = /whenever you cast your (?:first|second|third)[^.]*spell each turn,[^.]*draw/i;

const CANTRIPS_SCOPE_CONFIG = Object.freeze({
  mentionPattern: CANTRIPS_MENTION,
  requiredScopePattern: CANTRIPS_REQUIRED_SCOPE,
});

const cantrips = Object.freeze({
  id: "cantrips",
  label: "Cantrips package",
  corePatterns: CANTRIPS_CORE_PATTERNS,
  supportPatterns: CANTRIPS_SUPPORT_PATTERNS,
  falseFriendShape: "wrong-target-scope",
  falseFriendConfig: CANTRIPS_SCOPE_CONFIG,
  commander: Object.freeze({
    oraclePatterns: CANTRIPS_PAYOFF_PATTERNS,
  }),
  note: Object.freeze({
    aliases: Object.freeze(["cantrips", "cantrip deck", "replacement spells", "cheap card draw", "spell velocity"]),
  }),
  density: Object.freeze({ singletonCore: 14, constructedCore: 8, singletonSupport: 4, constructedSupport: 2 }),
});

// -----------------------------------------------------------------------------
// Toolbox
// -----------------------------------------------------------------------------
// Core is a versatile, TYPE-CONDITIONED search — the deck's own repeatable
// answer-fetching plan — Prime Speaker Vannifar ("{T}, Sacrifice another
// creature: Search your library for a creature card with mana value equal to
// 1 plus the sacrificed creature's mana value, put that card onto the
// battlefield..." — the modern Birthing Pod as a commander), Birthing Pod
// itself, Yisan, the Wanderer Bard ("Search your library for a creature card
// with mana value equal to the number of verse counters on Yisan, put it
// onto the battlefield..."), Trinket Mage ("search your library for an
// artifact card with mana value 1 or less..."), Fauna Shaman ("Search your
// library for a creature card, reveal it, put it into your hand...").
//
// False-friend shape: wrong-target-scope, a new "generic tutor vs
// type-conditioned search" sub-domain, grounded in the task's own named
// distinction from "generic tutoring, which already exists as SUPPORT in
// several archetypes". Demonic Tutor — "Search your library for a card, put
// that card into your hand, then shuffle." — mentions "search your library
// for" as broadly as any real toolbox card, but has no type/characteristic
// qualifier between "for a" and "card" at all — an unconditional, any-card
// tutor, not the narrower flexible-ANSWER-fetching promise this archetype is
// scoped to. Verified directly: Demonic Tutor fails toolbox's own
// corePatterns and is flagged as a false friend by the shared evaluator.
//
// Support is raw sacrifice fodder, not the search effect itself — Bitterblossom's
// own "create a 1/1 black Faerie Rogue creature token with flying" each
// upkeep feeds a Birthing-Pod-style engine's required raw material (you must
// have a creature to sacrifice before you can search) without itself being
// the tutor, the same required-raw-material role #033's populate established
// for its own token-generator support.
//
// Checked #027's commanderPayoffMagnitudeGates reuse: no real Toolbox
// commander with a magnitude-qualified cast/play trigger was found —
// Vannifar's/Yisan's own triggers are activated abilities with a
// mana-value-EQUALS (not N-or-greater/less) condition on the SEARCH target,
// not a cast/play trigger on the commander's own caster action at all — not
// a structural fit, not forced.
const TOOLBOX_CORE_PATTERNS = Object.freeze([
  /search your library for (?:a|an|up to \w+) (?:creature|artifact|enchantment|land|permanent|planeswalker)s? cards?\b/i,
]);

const TOOLBOX_SUPPORT_PATTERNS = Object.freeze([
  /create(?:s)? (?:a|an|\d+|x) [^.]{0,30} creature tokens?/i,
]);

const TOOLBOX_MENTION = /search your library for/i;
const TOOLBOX_REQUIRED_SCOPE = /search your library for (?:a|an|up to \w+) (?:creature|artifact|enchantment|land|permanent|planeswalker)s? cards?\b/i;

const TOOLBOX_SCOPE_CONFIG = Object.freeze({
  mentionPattern: TOOLBOX_MENTION,
  requiredScopePattern: TOOLBOX_REQUIRED_SCOPE,
});

const toolbox = Object.freeze({
  id: "toolbox",
  label: "Toolbox package",
  corePatterns: TOOLBOX_CORE_PATTERNS,
  supportPatterns: TOOLBOX_SUPPORT_PATTERNS,
  falseFriendShape: "wrong-target-scope",
  falseFriendConfig: TOOLBOX_SCOPE_CONFIG,
  commander: Object.freeze({
    oraclePatterns: TOOLBOX_CORE_PATTERNS,
  }),
  note: Object.freeze({
    aliases: Object.freeze(["toolbox", "birthing pod", "type tutor", "silver bullet", "answer for everything"]),
  }),
  density: Object.freeze({ singletonCore: 6, constructedCore: 4, singletonSupport: 6, constructedSupport: 3 }),
});

// -----------------------------------------------------------------------------
// X Spells
// -----------------------------------------------------------------------------
// Core is a real payoff scaling off casting spells with {X} in their own
// mana cost — Zaxara, the Exemplary ("Whenever you cast a spell with {X} in
// its mana cost, create a 0/0 green Hydra creature token, then put X +1/+1
// counters on it."), Zimone, Infinite Analyst ("The first spell you cast
// with {X} in its mana cost each turn costs {1} less to cast for each +1/+1
// counter on Zimone. Whenever you cast your first spell with {X} in its
// mana cost each turn, put two +1/+1 counters on Zimone."), Nev, the
// Practical Dean (the same "cast your first spell with {X}..." shape).
//
// No CRITICAL overlap risk was named for this entry (unlike cantrips/
// exile_matters/hatebears). Checked the plausible near-miss anyway: all
// three real commanders' own trigger text literally contains "whenever you
// cast", which does connect to PACKAGE_RELEVANT_REWARDS' "spells" category
// below — a genuine, verified connection (see that file's own comment), not
// a structural coincidence.
//
// False-friend shape: wrong-target-scope, the same grant-vs-negate POLARITY
// mismatch #031's infect/extra_combats and #033's extra_turns already
// established. Frontline Medic — "Sacrifice this creature: Counter target
// spell with {X} in its mana cost." — mentions "{X} in its mana cost" as
// broadly as any real payoff, but COUNTERS an X spell rather than rewarding
// one being cast — hate, not the archetype's own promise. Verified directly:
// Frontline Medic fails corePatterns and is flagged as a false friend.
//
// Support is ramp scoped specifically to X spells, not the scaling payoff
// itself — Rosheen, Roaring Prophet's own "{T}: Reveal any number of cards
// with {X} in their mana cost in your hand. Add {C}{C} for each card
// revealed this way. Spend this mana only on costs that contain {X}." lets a
// deck actually afford a big X rather than rewarding having cast one, the
// same ancillary role tutoring/recursion play for artifacts_matter.
//
// Checked #027's commanderPayoffMagnitudeGates reuse: the gate parser's own
// capture group requires a literal type WORD (artifact/creature/etc.)
// between the determiner and "spell/permanent" — "a spell with {X} in its
// mana cost" has no such type word (the magnitude condition here is the
// literal presence of {X}, not a numeric N-or-greater/less threshold on
// mana value/power/toughness at all) — not a structural fit, not forced.
const X_SPELLS_CORE_PATTERNS = Object.freeze([
  /whenever you cast (?:a|your first) spell with \{x\} in its mana cost/i,
  /the first spell you cast with \{x\} in its mana cost each turn costs [^.]* less/i,
]);

const X_SPELLS_SUPPORT_PATTERNS = Object.freeze([
  /reveal any number of cards? with \{x\} in (?:its|their) mana costs? in your hand\.[^.]*add \{c\}\{c\}/i,
]);

const X_SPELLS_MENTION = /\{x\} in (?:its|their) mana costs?/i;
const X_SPELLS_REQUIRED_SCOPE = /whenever you cast (?:a|your first) spell with \{x\} in its mana cost|the first spell you cast with \{x\} in its mana cost each turn costs [^.]* less/i;

const X_SPELLS_SCOPE_CONFIG = Object.freeze({
  mentionPattern: X_SPELLS_MENTION,
  requiredScopePattern: X_SPELLS_REQUIRED_SCOPE,
});

const xSpells = Object.freeze({
  id: "x_spells",
  label: "X Spells package",
  corePatterns: X_SPELLS_CORE_PATTERNS,
  supportPatterns: X_SPELLS_SUPPORT_PATTERNS,
  falseFriendShape: "wrong-target-scope",
  falseFriendConfig: X_SPELLS_SCOPE_CONFIG,
  commander: Object.freeze({
    oraclePatterns: X_SPELLS_CORE_PATTERNS,
  }),
  note: Object.freeze({
    aliases: Object.freeze(["x spells", "x spell matters", "big x", "x cost matters", "x tribal"]),
  }),
  density: Object.freeze({ singletonCore: 8, constructedCore: 5, singletonSupport: 6, constructedSupport: 3 }),
});

// -----------------------------------------------------------------------------
// Exile-matters
// -----------------------------------------------------------------------------
// Core is impulse draw and the exile zone as a real resource — Prosper,
// Tome-Bound ("Mystic Arcanum — At the beginning of your end step, exile the
// top card of your library. Until the end of your next turn, you may play
// that card. Pact Boon — Whenever you play a card from exile, create a
// Treasure token."), Laelia, the Blade Reforged, Urabrask, Heretic Praetor —
// all real "exile the top card ... you may play it" commanders.
//
// CRITICAL overlap risk named by the task: #030's graveyard already covers
// "alternate zone as a resource". Kept disjoint by construction, not just by
// empirical luck: exile_matters' own corePatterns require the literal "exile
// the top card ... you may play/cast" or "whenever you play a card from
// exile" construction, which NONE of graveyard's own corePatterns
// (delirium/threshold/flashback/escape/"cast ... from your graveyard") ever
// produce — and vice versa. The sharpest real proof is Kroxa, Titan of
// Death's Hunger, graveyard's own documented Escape fixture: its cost text
// is "Escape—{2}{B}{R}, Exile five other cards from your graveyard." — this
// LITERALLY contains the word "exile" (satisfying exile_matters' own broad
// mention check), but the construction is "exile ... FROM your graveyard" as
// an activation COST, not "exile the top of your library, then you may play
// it" as an impulse-draw EFFECT — exile_matters' required scope correctly
// rejects it, while graveyard's own /\bhas escape\b/i correctly keeps him as
// graveyard's own core. Verified directly, the same rigor #030's own
// sagas/enchantress/legends disjointness proof used: Prosper's, Laelia's,
// and Urabrask's own real text never trips graveyard's corePatterns either
// (no delirium/threshold/flashback/escape/"from your graveyard" substring in
// any of the three).
//
// Support is a reward for casting from exile without itself producing the
// impulse draw — Nico Minoru, Runaway's own "Whenever you cast a spell from
// anywhere other than your hand, Nico Minoru deals 2 damage to each
// opponent." rewards the byproduct of an exile-matters deck's own plan
// without itself exiling anything, the same byproduct-of-the-mechanic role
// #033's cascade established for The First Doctor's own support clause.
//
// Checked #027's commanderPayoffMagnitudeGates reuse: no real Exile-matters
// commander with a magnitude-qualified cast/play trigger was found —
// Prosper's/Laelia's/Urabrask's own triggers are end-step/attack/upkeep
// triggers, not cast/play triggers — not forced.
const EXILE_MATTERS_CORE_PATTERNS = Object.freeze([
  /exile the top (?:card|\w+ cards?) of your library\.?\s*(?:until[^.]*)?\s*you may (?:play|cast) (?:that|it|them)/i,
  /whenever you play a card from exile/i,
  /exile cards? from the top of your library until you exile a nonland card[^.]*you may (?:cast|play)/i,
]);

const EXILE_MATTERS_SUPPORT_PATTERNS = Object.freeze([
  /whenever you cast (?:a|an) spell from (?:anywhere other than your hand|exile)/i,
]);

const EXILE_MATTERS_MENTION = /\bexile[ds]?\b/i;
const EXILE_MATTERS_REQUIRED_SCOPE = /exile the top (?:card|\w+ cards?) of your library\.?\s*(?:until[^.]*)?\s*you may (?:play|cast) (?:that|it|them)|whenever you play a card from exile|exile cards? from the top of your library until you exile a nonland card[^.]*you may (?:cast|play)/i;

const EXILE_MATTERS_SCOPE_CONFIG = Object.freeze({
  mentionPattern: EXILE_MATTERS_MENTION,
  requiredScopePattern: EXILE_MATTERS_REQUIRED_SCOPE,
});

const exileMatters = Object.freeze({
  id: "exile_matters",
  label: "Exile-matters package",
  corePatterns: EXILE_MATTERS_CORE_PATTERNS,
  supportPatterns: EXILE_MATTERS_SUPPORT_PATTERNS,
  falseFriendShape: "wrong-target-scope",
  falseFriendConfig: EXILE_MATTERS_SCOPE_CONFIG,
  commander: Object.freeze({
    oraclePatterns: EXILE_MATTERS_CORE_PATTERNS,
  }),
  note: Object.freeze({
    aliases: Object.freeze(["exile matters", "impulse draw", "play from exile", "exile zone", "impulsive"]),
  }),
  density: Object.freeze({ singletonCore: 8, constructedCore: 5, singletonSupport: 6, constructedSupport: 3 }),
});

// -----------------------------------------------------------------------------
// Hatebears
// -----------------------------------------------------------------------------
// Core is a real hard-denial restriction — Iona, Shield of Emeria ("Your
// opponents can't cast spells of the chosen color."), Gaddock Teeg
// ("Noncreature spells with mana value 4 or greater can't be cast.
// Noncreature spells with {X} in their mana costs can't be cast."), Meddling
// Mage ("Spells with the chosen name can't be cast."), Grand Abolisher
// ("During your turn, your opponents can't cast spells or activate
// abilities..."), Aven Mindcensor (a search-replacement denial), Containment
// Priest (an ETB-without-being-cast denial) — broad-spectrum disruption
// aimed at casting/activating/searching/entering, not a single narrow lever.
//
// CRITICAL overlap risk named by the task: BOTH #032's pillow_fort
// (attack-taxation specifically) and the original PACKAGE_CATALOG's own
// stax entry. Kept disjoint by construction against both, verified with real
// fixtures, not assumed: false-friend shape wrong-target-scope, mention
// pattern deliberately as broad as stax's OWN detectStaxCommander regex
// (can't cast/activate/attack/search/untap, cost-more-to-cast/activate,
// unless-controller-pays) — required scope narrows to hatebears' own hard
// DENIAL construction only. Baird, Steward of Argive / Ghostly Prison
// ("Creatures can't attack you ... unless their controller pays...") trips
// the broad mention (can't attack) but fails required scope — pillow_fort's
// own attack-tax territory, not hatebears'. Vryn Wingmare / Thalia, Guardian
// of Thraben-style ("Noncreature spells cost {1} more to cast.") trips the
// broad mention (cost more to cast) but fails required scope — a symmetric
// mana TAX, stax's own real territory, not a denial. Winter Orb-style
// ("Players can't untap more than one land during their untap steps.") trips
// the broad mention (can't ... untap) but fails required scope — stax's own
// resource-denial territory, not an opponent-cast/activate/search denial.
// Verified the reverse direction too: Iona's/Gaddock Teeg's/Grand
// Abolisher's own real text never trips detectStaxCommander's regex at all
// (no literal "players can't", "cost {X} more to cast/activate", or "unless
// ... pays" substring in any of the three) and never trips pillow_fort's own
// corePatterns (no "attack" text at all in any of the three).
//
// Support reuses reuseProtectionSupport (the same flag artifacts_matter/
// lifegain/burn/lands_matter/legends/enchantress already use) — a hatebears
// piece is usually the table's first removal target, so keeping it alive
// (hexproof/indestructible/protection grants) is a genuine archetype-adjacent
// enabler without itself being the disruption payoff.
//
// Checked #027's commanderPayoffMagnitudeGates reuse: Gaddock Teeg's own
// "mana value 4 or greater" clause is a DENIAL threshold (spells at or above
// it CAN'T be cast at all), not a payoff magnitude gate on an unrelated
// reward the way T'Challa's artifact trigger is — structurally a different
// shape than #027's parser targets — not forced.
const HATEBEARS_CORE_PATTERNS = Object.freeze([
  /(?:your )?opponents can'?t cast spells(?: of the chosen color| from anywhere other than their hands?)?\b/i,
  /noncreature spells? (?:with mana value \d+ or greater |with \{x\} in (?:its|their) mana costs? )?can'?t be cast\b/i,
  /spells? with the chosen name can'?t be cast\b/i,
  /(?:during your turn, )?(?:your )?opponents can'?t cast spells or activate abilities/i,
  /if an opponent would search a library, that player searches the top (?:four|\d+) cards? of that library instead/i,
  /if a nontoken creature would enter and it wasn'?t cast, exile it instead/i,
]);

const HATEBEARS_SUPPORT_PATTERNS = Object.freeze([]);

const HATEBEARS_MENTION = /can'?t (?:cast|activate|attack|search|untap)|cost \{[^}]+\} more to (?:cast|activate)|unless (?:its|their) controller pays/i;
const HATEBEARS_REQUIRED_SCOPE = /(?:your )?opponents can'?t cast spells(?: of the chosen color| from anywhere other than their hands?)?\b|noncreature spells? (?:with mana value \d+ or greater |with \{x\} in (?:its|their) mana costs? )?can'?t be cast\b|spells? with the chosen name can'?t be cast\b|(?:during your turn, )?(?:your )?opponents can'?t cast spells or activate abilities|if an opponent would search a library, that player searches the top (?:four|\d+) cards? of that library instead|if a nontoken creature would enter and it wasn'?t cast, exile it instead/i;

const HATEBEARS_SCOPE_CONFIG = Object.freeze({
  mentionPattern: HATEBEARS_MENTION,
  requiredScopePattern: HATEBEARS_REQUIRED_SCOPE,
});

const hatebears = Object.freeze({
  id: "hatebears",
  label: "Hatebears package",
  corePatterns: HATEBEARS_CORE_PATTERNS,
  supportPatterns: HATEBEARS_SUPPORT_PATTERNS,
  reuseProtectionSupport: true,
  falseFriendShape: "wrong-target-scope",
  falseFriendConfig: HATEBEARS_SCOPE_CONFIG,
  commander: Object.freeze({
    oraclePatterns: HATEBEARS_CORE_PATTERNS,
  }),
  note: Object.freeze({
    aliases: Object.freeze(["hatebears", "disruptive creatures", "hate bears", "creature stax", "efficient hosers"]),
  }),
  density: Object.freeze({ singletonCore: 10, constructedCore: 6, singletonSupport: 4, constructedSupport: 2 }),
});

// -----------------------------------------------------------------------------
// Spell Copy
// -----------------------------------------------------------------------------
// Core is copying instants/sorceries specifically — Twincast ("Copy target
// instant or sorcery spell. You may choose new targets for the copy."),
// Kalamax, the Stormsire ("Whenever you cast your first instant spell each
// turn, if Kalamax is tapped, copy that spell. ... Whenever you copy an
// instant spell, put a +1/+1 counter on Kalamax."), Stella Lee, Wild Card
// ("{T}: Copy target instant or sorcery spell you control...").
//
// This is the NATURAL complementary pair the task names: #030's clones
// already documents Twincast as ITS OWN false friend ("the object being
// copied is a SPELL, not a creature/permanent"). This entry grounds its own
// core in exactly that rejected card — Twincast is clones' false friend and
// spell_copy's own real core, the same real card proving both boundaries at
// once. False-friend shape: wrong-target-scope, reusing #030's object-TYPE-
// mismatch sub-domain from the opposite direction (the same reuse #033's
// populate already established for the clones/populate pair). Sakashima of a
// Thousand Faces / Progenitor Mimic (clones' own real core fixtures) mention
// "copy" as broadly as any real spell-copy card, but copy a CREATURE, not a
// spell — clones' own real territory, not this entry's. Verified directly:
// both fail spell_copy's own corePatterns and are flagged as false friends
// by the shared evaluator, while Twincast fails clones' own corePatterns and
// is flagged as clones' false friend (already true in the shipped code,
// confirmed unchanged) — fully symmetric, not a one-directional carve-out.
//
// Support is a cost-reduction enabler, not the copy effect itself — Baral,
// Chief of Compliance's own "Instant and sorcery spells you cast cost {1}
// less to cast." (the same real card cantrips' own support reuses, a
// different real card legitimately enabling two different archetypes) lowers
// the bar for holding up mana to copy without itself copying anything.
//
// Checked #027's commanderPayoffMagnitudeGates reuse: no real Spell Copy
// commander with a magnitude-qualified cast/play trigger was found —
// Kalamax's own gate is a tapped/untapped STATE condition, not a numeric
// N-or-greater/less magnitude threshold — not a structural fit, not forced.
const SPELL_COPY_CORE_PATTERNS = Object.freeze([
  /copy target instant or sorcery spell\b/i,
  /cast[^.]*instant spell[^.]*,[^.]*copy (?:that|it) spell\b/i,
  /whenever you copy an instant (?:or sorcery )?spell\b/i,
]);

const SPELL_COPY_SUPPORT_PATTERNS = Object.freeze([
  /instant and sorcery spells you cast cost \{[^}]+\} less to cast/i,
]);

const SPELL_COPY_MENTION = /\bcopy\b/i;
const SPELL_COPY_REQUIRED_SCOPE = /copy target instant or sorcery spell\b|cast[^.]*instant spell[^.]*,[^.]*copy (?:that|it) spell\b|whenever you copy an instant (?:or sorcery )?spell\b/i;

const SPELL_COPY_SCOPE_CONFIG = Object.freeze({
  mentionPattern: SPELL_COPY_MENTION,
  requiredScopePattern: SPELL_COPY_REQUIRED_SCOPE,
});

const spellCopy = Object.freeze({
  id: "spell_copy",
  label: "Spell Copy package",
  corePatterns: SPELL_COPY_CORE_PATTERNS,
  supportPatterns: SPELL_COPY_SUPPORT_PATTERNS,
  falseFriendShape: "wrong-target-scope",
  falseFriendConfig: SPELL_COPY_SCOPE_CONFIG,
  commander: Object.freeze({
    oraclePatterns: SPELL_COPY_CORE_PATTERNS,
  }),
  note: Object.freeze({
    aliases: Object.freeze(["spell copy", "copy spells", "storm copy", "copy instants", "twincast effects"]),
  }),
  density: Object.freeze({ singletonCore: 6, constructedCore: 4, singletonSupport: 4, constructedSupport: 2 }),
});

export const ARCHETYPE_CATALOG = Object.freeze({
  artifacts_matter: artifactsMatter,
  counters_matter: countersMatter,
  group_hug: groupHug,
  lifegain,
  lands_matter: landsMatter,
  land_sacrifice: landSacrifice,
  burn,
  enchantress,
  mill,
  wheels,
  legends,
  discard,
  graveyard,
  clones,
  flying,
  group_slug: groupSlug,
  infect,
  extra_combats: extraCombats,
  theft,
  superfriends,
  goad,
  vehicles,
  neg_counters: negCounters,
  pillow_fort: pillowFort,
  toughness_matters: toughnessMatters,
  extra_turns: extraTurns,
  sagas,
  energy,
  populate,
  monarch,
  anthems,
  devotion,
  cascade,
  cantrips,
  toolbox,
  x_spells: xSpells,
  exile_matters: exileMatters,
  hatebears,
  spell_copy: spellCopy,
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
