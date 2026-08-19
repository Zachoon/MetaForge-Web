// =============================================================================
// Archetype Catalog — Founder #028 (POC) + #029 (batch 2) + #030 (batch 3)
// =============================================================================
// A second, DECLARATIVE package layer, sibling to strategic-intent.mjs's
// hand-authored PACKAGE_CATALOG. Each entry supplies oracle-text pattern
// lists plus a named false-friend "shape" instead of a bespoke detector
// function; strategic-intent.mjs's generic dispatch fallback (the same path
// auras/equipment/blink already run through) evaluates these records, so
// every downstream consumer that dispatches by package-id string needs zero
// changes. #028 validated 3 entries; #029 added 6 more (lifegain, lands
// matter, burn, enchantress, mill, wheels); #030 adds a further 6 (legends,
// discard, graveyard, clones, flying, group_slug) by real EDHREC prevalence —
// still not the full ~20-archetype remainder. #030 introduces zero new
// false-friend shapes: all 6 reuse `broad-type-superset`, `incidental-rider`,
// or `wrong-target-scope`, each re-grounded in independent real-card evidence
// (see each entry's comment). See docs/FOUNDER_ISSUES.md #028/#029/#030.
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

const ENCHANTRESS_SUPPORT_PATTERNS = Object.freeze([
  /search your library for an enchantment card/i,
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

export const ARCHETYPE_CATALOG = Object.freeze({
  artifacts_matter: artifactsMatter,
  counters_matter: countersMatter,
  group_hug: groupHug,
  lifegain,
  lands_matter: landsMatter,
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
