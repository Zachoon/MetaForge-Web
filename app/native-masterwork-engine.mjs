import { runNativeMasterworkTournament } from "./native-masterwork-tournament.mjs";
import { explainNativeMasterworkDecision } from "./native-masterwork-reasoning.mjs";
import { rankOneSlotCounterfactuals, runOneSlotCounterfactualLab } from "./native-one-slot-lab.mjs";
import { evaluateCommanderPowerSignal, POWER_TIERS, powerSignalCategoryFor, CATEGORY_WEIGHT as POWER_CATEGORY_WEIGHT } from "./commander-power-signal.mjs";
import { activeInteractionWiring, resolveBrainPolicy, BRAIN_POLICY_V1_CONTROL } from "./brain-policy.mjs";
import {
  cardCanDealDamageToOwnCreature,
  cardClearsPayoffMagnitudeGate,
  cardDealsMassDamageToCreatures,
  colorlessFixingCredit,
  colorlessPipsFromCost,
  commanderCaresAboutXSpells,
  commanderPayoffMagnitudeGates,
  commanderProfitsFromBeingDamaged,
  commanderInteractsWithRooms,
  commanderValuesPlaneswalkerCheats,
  conditionalRampProductionFactor,
  conditionalTokenProductionFactor,
  curveManaValue,
  hasVariableGenericCost,
  isModalToolbox,
  landColoredManaFixingFactor,
  landRestrictedFixingPenalty,
  listHasTypalDensity,
  modalAwareRoleScore,
  oracleOf,
  payoffMagnitudeHitsFor,
  restrictedEffectCastingFactor,
  restrictedWinconFactor,
  roleFloorCredit,
} from "./conditional-effect-credit.mjs";
import {
  evaluateSituationalCard,
  resourceCompetitionFactor,
  situationalReliabilityFactor,
} from "./situational-card-evaluation.mjs";
export {
  cardCanDealDamageToOwnCreature,
  cardClearsPayoffMagnitudeGate,
  cardDealsMassDamageToCreatures,
  colorlessFixingCredit,
  colorlessPipsFromCost,
  commanderCaresAboutXSpells,
  commanderInteractsWithRooms,
  commanderPayoffMagnitudeGates,
  commanderProfitsFromBeingDamaged,
  commanderValuesPlaneswalkerCheats,
  conditionalRampProductionFactor,
  conditionalTokenProductionFactor,
  curveManaValue,
  hasVariableGenericCost,
  isModalToolbox,
  landColoredManaFixingFactor,
  landRestrictedFixingPenalty,
  listHasTypalDensity,
  modalAwareRoleScore,
  payoffMagnitudeHitsFor,
  restrictedEffectCastingFactor,
  restrictedWinconFactor,
  roleFloorCredit,
};

import {
  buildForgeStructuralAnalysis,
} from "./forge-structural-pipeline.mjs";

import {
  createForgeRecommendationRecord,
} from "./forge-recommendation-ledger.mjs";

import {
  configureInteractionGraphTagLookup,
  extractMechanicalSignals,
  findUnusedEnginePartners,
} from "./forge-interaction-graph.mjs";

import {
  buildStrategicIntent,
  cardSatisfiesPackageCore,
  cardSatisfiesPackageSupport,
  commanderPackageIdsFromOracle,
  configureCardTagLookup,
  expensiveThreatSupport,
  replacementCompatible,
  singularizeTribe,
  strategicSemanticsFor,
  validateStrategicCohesion,
} from "./strategic-intent.mjs";

import {
  attachSlotJustificationLedger,
  buildJustificationFootprint,
  buildSlotJustificationLedger,
  compareReplacementJustification,
  justificationPreservationScore,
} from "./slot-justification-ledger.mjs";

import {
  buildLiveDeficitState,
  counterfactualSwapDelta,
  prospectiveSlotDelta,
} from "./prospective-slot-delta.mjs";

import {
  createDeficitClosureMemory,
  observeDeficitClosure,
} from "./deficit-closure-memory.mjs";

import {
  optimizePackagePlan,
} from "./package-plan-optimizer.mjs";

import {
  applyPhaseWeights,
  constructionPhase,
  createConstructionPhaseTracker,
} from "./construction-phase.mjs";

import {
  compactDeficitSnapshot,
  createConstructionTraceSession,
  recordConstructionPick,
  sealConstructionTrace,
} from "./construction-trace.mjs";

import {
  attachSelfEvaluationToCandidate,
} from "./reasoning-drift.mjs";

import {
  attachWeakSlotForensics,
  repairWeaklyJustifiedSlots,
} from "./weak-slot-forensics.mjs";

import {
  applyStrategicPlanToAnalysis,
  realizeStrategicPlanScore,
  selectStrategicPlans,
} from "./strategic-plan-competition.mjs";

import CARD_MECHANICS from "./card-mechanics.mjs";
// strategic-intent.mjs's tagsOf() takes its real per-card lookup by
// injection rather than a static import (see configureCardTagLookup there
// for why) — this is the one place that wires the real database in, since
// every real server construction path reaches this module first.
configureCardTagLookup((normalizedName) => CARD_MECHANICS[normalizedName] || []);
configureInteractionGraphTagLookup((normalizedName) => CARD_MECHANICS[normalizedName] || []);
// parseNativeBlueprintIntent/manaConsistencyReport/hypergeometricAtLeast and
// the small helpers they alone need (ROLE_PATTERNS, BLUEPRINT_FILLER_WORDS,
// blueprintMechanicDefinition) live in blueprint-note-and-mana.mjs, a leaf
// module with no path back to CARD_MECHANICS or any other server-only
// construction file — that isolation is what keeps page.tsx's commission-
// note/mana-consistency UI from pulling the ~1.9MB card-mechanics.mjs
// database into the client bundle (it used to import them from here).
import {
  blueprintMechanicDefinition,
  BLUEPRINT_FILLER_WORDS,
  hypergeometricAtLeast,
  manaConsistencyReport,
  parseNativeBlueprintIntent,
  ROLE_PATTERNS,
} from "./blueprint-note-and-mana.mjs";
export { hypergeometricAtLeast, manaConsistencyReport, parseNativeBlueprintIntent } from "./blueprint-note-and-mana.mjs";

// classifyNativeCard/conceptSignals also moved out — see that file's header.
// app/deck-motif-scan.mjs (a CLIENT module, reachable from page.tsx) calls
// classifyNativeCard for a cosmetic motif-icon feature; leaving these here
// meant importing classifyNativeCard from this module at all pulled this
// module's ENTIRE server-only construction graph (CARD_MECHANICS included)
// into the browser bundle, regardless of the two fixes above.
import { classifyNativeCard, conceptSignals, configureCardRoleTagLookup } from "./card-role-classification.mjs";
export { classifyNativeCard, conceptSignals } from "./card-role-classification.mjs";
configureCardRoleTagLookup((normalizedName) => CARD_MECHANICS[normalizedName] || []);

import {
  getMetaIntelligence,
} from "./meta-intelligence.mjs";

import { buildSideboard, simulationRoleFor, strategyArchetypeFor } from "./adaptive-recommendation.mjs";
import { evaluateSimulationGate } from "./goldfish-simulation.mjs";
import { evaluateMatchupMatrix } from "./matchup-simulation.mjs";

// MetaForge Native Masterwork Engine
// Card facts may come from verified catalogs; every construction and ranking
// decision in this module is deterministic and owned by MetaForge.

const BASIC_BY_COLOR = Object.freeze({
  W: "Plains", U: "Island", B: "Swamp", R: "Mountain", G: "Forest", C: "Wastes",
});
const SNOW_BASIC_BY_COLOR = Object.freeze({
  W: "Snow-Covered Plains", U: "Snow-Covered Island", B: "Snow-Covered Swamp", R: "Snow-Covered Mountain", G: "Snow-Covered Forest", C: "Wastes",
});
const BASIC_LAND_NAMES = Object.freeze([
  "Plains", "Island", "Swamp", "Mountain", "Forest", "Wastes",
  "Snow-Covered Plains", "Snow-Covered Island", "Snow-Covered Swamp", "Snow-Covered Mountain", "Snow-Covered Forest",
]);
const isBasicLandName = (name = "") => BASIC_LAND_NAMES.some((basic) => basic.toLowerCase() === String(name).trim().toLowerCase());
const BASIC_COLOR_BY_NAME = Object.freeze({
  Plains: ["W"], Island: ["U"], Swamp: ["B"], Mountain: ["R"], Forest: ["G"], Wastes: [],
  "Snow-Covered Plains": ["W"], "Snow-Covered Island": ["U"], "Snow-Covered Swamp": ["B"], "Snow-Covered Mountain": ["R"], "Snow-Covered Forest": ["G"],
});

// ROLE_PATTERNS now lives in blueprint-note-and-mana.mjs (imported above) —
// noteRoleSignals, the only other consumer, moved there with it.
// Rules-text regex alone misses real cards that do the same job in an
// unusual phrasing — a card tagged mana_acceleration in the curated
// card-mechanics database (app/card-mechanics.mjs) is real evidence a card
// ramps, even when it doesn't match any of the ramp patterns above. Only
// roles with one clean, unambiguous tag are mapped here; roles the tag
// database has no dedicated signal for (interaction, sweeper, artifacts,
// combat, discard, draw — "card_advantage" is too broad to stand in for
// draw specifically) are left to the regex alone rather than guessing.
// ROLE_TAGS/roleTagsFor/classifyNativeCard/conceptSignals now live in
// card-role-classification.mjs (imported and re-exported above) — see that
// file's header for why.

// "Destroy target creature" and "destroy target creature with mana value 3
// or less" both earn the "interaction" role identically above, but a real
// deckbuilder values them very differently — the restricted version can
// simply whiff. This only downweights the "interaction" role's own
// contribution to roleScore (below); it doesn't touch classification, so a
// restricted removal spell is still correctly tagged "interaction" and
// still counts toward the format's interaction role target.
const CMC_OR_STAT_CAP = /(?:power|toughness|mana value|converted mana cost) (\d+) or (less|greater|more)/i;
const TAX_COUNTERSPELL = /unless (?:its|their|that player'?s?) controller pays(?:[^.]*?\{(\d+)\})?/i;
const COMBAT_STATE_RESTRICTION = /target (?:attacking|blocking|tapped)(?:\s+or\s+(?:attacking|blocking|tapped))?\s+creature/i;
// Color/token/artifact restrictions genuinely narrow what a spell can hit
// (Doom Blade-style "nonblack creature"). "Nonland permanent" is the
// opposite — excluding lands from "permanent" is what makes that template
// one of the broadest, most flexible removal effects in the game (e.g.
// Anguished Unmaking), not a restriction, so "land" is deliberately absent
// from this list.
const COLOR_TYPE_RESTRICTION = /target non(?:white|blue|black|red|green|artifact|token) (?:creature|permanent|artifact|enchantment)/i;

// A numeric cap's real cost depends on which side of the number it misses,
// not just that a number exists. "Mana value N or less" (or "power/
// toughness N or less") gets *broader* — and so more valuable — as N rises,
// since it covers more of a real card pool. "N or greater/more" is the
// mirror image: it gets *narrower* as N rises, since fewer permanents clear
// a high bar. Either shape keeps the same band: a cap is never quite as
// good as no cap at all (0.92 ceiling) and never so narrow it's worthless
// (0.42 floor), stepping roughly an eighth per point of breadth and landing
// close to the old flat 0.65 penalty right around breadth 3 — a card like
// the original "mana value 3 or less" example scores almost the same as it
// always did, while a 1-or-less cap and a 6-or-less cap now land far apart
// instead of being scored identically.
function capQuality(cap, direction) {
  const breadth = direction === "less" ? cap : Math.max(1, 8 - cap);
  return Math.round(clamp(0.42 + breadth * 0.08, 0.42, 0.92) * 100) / 100;
}

// A counterspell's tax restricts the *opponent*, not the caster — quality
// rises with the tax amount instead of falling, the mirror image of a
// removal cap (a {1} tax is barely a tax; a {5} tax approaches a hard
// counter). A tax with no parseable numeric amount (an X cost, or phrasing
// this pattern doesn't capture) keeps the original flat penalty rather than
// inventing a severity from nothing.
function taxQuality(tax) {
  return Math.round(clamp(0.5 + tax * 0.08, 0.5, 0.92) * 100) / 100;
}

export function interactionQualityFor(text = "") {
  const capMatch = text.match(CMC_OR_STAT_CAP);
  if (capMatch) return capQuality(Number(capMatch[1]), capMatch[2] === "less" ? "less" : "greater");
  const taxMatch = text.match(TAX_COUNTERSPELL);
  if (taxMatch) return taxMatch[1] ? taxQuality(Number(taxMatch[1])) : 0.65;
  if (COMBAT_STATE_RESTRICTION.test(text) || COLOR_TYPE_RESTRICTION.test(text)) return 0.65;
  return 1;
}

// NOTE_ROLE_ALIASES/noteRoleSignals (the plain-language note vocabulary
// layered on top of ROLE_PATTERNS) also moved to blueprint-note-and-mana.mjs
// with parseNativeBlueprintIntent, their only caller.

const STRATEGY_WEIGHTS = Object.freeze({
  Aggressive: { ramp: 4, draw: 7, interaction: 8, protection: 7, threat: 14, combat: 10 },
  Control: { ramp: 7, draw: 13, interaction: 15, protection: 6, sweeper: 12, threat: 5 },
  Combo: { ramp: 10, draw: 13, interaction: 7, protection: 10, selection: 10, threat: 5 },
  "Balanced midrange": { ramp: 10, draw: 10, interaction: 11, protection: 6, recursion: 6, threat: 10 },
  Midrange: { ramp: 9, draw: 10, interaction: 10, protection: 6, recursion: 7, threat: 11 },
  Tempo: { ramp: 4, draw: 9, interaction: 12, protection: 9, threat: 10, combat: 7 },
});

// UI copy and persisted decks use descriptive labels ("Aggressive
// pressure", "Reactive control"), while older engine callers use archetype
// names. Resolve both here so descriptive labels never silently inherit the
// Balanced midrange weights while later curve code treats them differently.
export function strategyProfileFor(strategy = "") {
  const value = String(strategy).trim();
  if (/aggro|aggressive|pressure/i.test(value)) return "Aggressive";
  if (/reactive|control/i.test(value)) return "Control";
  if (/combo/i.test(value)) return "Combo";
  if (/tempo/i.test(value)) return "Tempo";
  if (/^midrange$/i.test(value)) return "Midrange";
  return "Balanced midrange";
}

const VARIANTS = Object.freeze([
  { id: "cohesion", label: "Synergy Temper", synergy: 1.35, resilience: 0.8, curve: 0.9 },
  { id: "resilience", label: "Resilient Temper", synergy: 0.9, resilience: 1.4, curve: 0.9 },
  { id: "precision", label: "Precision Temper", synergy: 1.0, resilience: 1.0, curve: 1.35 },
]);

const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, Number(value) || 0));
const normalized = (value = "") => String(value).normalize("NFKC").trim().toLocaleLowerCase("en");
const hash = (value = "") => Array.from(String(value)).reduce((total, character) => ((total * 33) ^ character.charCodeAt(0)) >>> 0, 5381);
const unique = (values) => [...new Set(values.filter(Boolean))];

// A Commander deck can have a second card in the command zone — a Partner
// commander or a Background — which combines its color identity, oracle
// text, and physical card slot with the primary commander rather than
// replacing it. input.secondCommander is optional and purely additive:
// every helper below degrades to exactly the existing single-commander
// behavior when it's absent, so nothing changes for a deck without one.
function allCommanders(input) {
  return [input.commander, input.secondCommander].filter(Boolean);
}
function commanderColors(input) {
  const colors = new Set();
  for (const commander of allCommanders(input)) {
    for (const color of commander.colors || []) colors.add(color);
  }
  return [...colors];
}
function commanderNamesNormalized(input) {
  return new Set(allCommanders(input).map((commander) => normalized(commander.name)));
}
const BASIC_LAND_FACTS = Object.freeze({
  Plains: {
    typeLine: "Basic Land — Plains",
    oracleText: "{T}: Add {W}.",
  },
  Island: {
    typeLine: "Basic Land — Island",
    oracleText: "{T}: Add {U}.",
  },
  Swamp: {
    typeLine: "Basic Land — Swamp",
    oracleText: "{T}: Add {B}.",
  },
  Mountain: {
    typeLine: "Basic Land — Mountain",
    oracleText: "{T}: Add {R}.",
  },
  Forest: {
    typeLine: "Basic Land — Forest",
    oracleText: "{T}: Add {G}.",
  },
  Wastes: {
    typeLine: "Basic Land — Wastes",
    oracleText: "{T}: Add {C}.",
  },
  "Snow-Covered Plains": { typeLine: "Basic Snow Land — Plains", oracleText: "{T}: Add {W}." },
  "Snow-Covered Island": { typeLine: "Basic Snow Land — Island", oracleText: "{T}: Add {U}." },
  "Snow-Covered Swamp": { typeLine: "Basic Snow Land — Swamp", oracleText: "{T}: Add {B}." },
  "Snow-Covered Mountain": { typeLine: "Basic Snow Land — Mountain", oracleText: "{T}: Add {R}." },
  "Snow-Covered Forest": { typeLine: "Basic Snow Land — Forest", oracleText: "{T}: Add {G}." },
});


function createVerifiedCardIndex(input) {
  const entries = [
    ...(Array.isArray(input.cards)
      ? input.cards
      : []),
    ...allCommanders(input),
  ];

  return new Map(
    entries
      .filter((card) => card?.name)
      .map((card) => [
        normalized(card.name),
        card,
      ]),
  );
}


function createBasicLandRecord(name) {
  const facts =
    BASIC_LAND_FACTS[name];

  if (!facts) {
    return null;
  }

  return {
    name,
    typeLine: facts.typeLine,
    oracleText: facts.oracleText,
    colorIdentity:
      name === "Wastes"
        ? []
        : [
            {
              Plains: "W",
              Island: "U",
              Swamp: "B",
              Mountain: "R",
              Forest: "G",
            }[name],
          ],
  };
}


function buildSelectedStructuralCards(
  selected,
  input,
) {
  const verifiedByName =
    createVerifiedCardIndex(input);

  const commanderNames =
    commanderNamesNormalized(input);

  return selected.rows.map((row) => {
    const verified =
      verifiedByName.get(
        normalized(row.name),
      );

    const source =
      verified ||
      createBasicLandRecord(
        row.name,
      ) ||
      {
        name: row.name,
        typeLine:
          row.roles.includes("land")
            ? "Land"
            : "",
        oracleText: "",
      };

    return {
      ...source,
      name: row.name,
      typeLine:
        source.typeLine ||
        source.type_line ||
        "",
      oracleText:
        source.oracleText ||
        source.oracle_text ||
        "",
      quantity:
        Math.max(
          1,
          Number(row.quantity || 1),
        ),
      isCommander:
        commanderNames.has(
          normalized(row.name),
        ),
    };
  });
}

// BLUEPRINT_FILLER_WORDS, BLUEPRINT_MECHANICS, PACKAGE_SIGNAL_BY_MECHANIC,
// PACKAGE_SIGNAL_BY_ROLE, KNOWN_MECHANIC_TAGS, blueprintMechanicDefinition,
// mechanicsMentionedIn, and requestedBlueprintMechanics all moved to
// blueprint-note-and-mana.mjs with parseNativeBlueprintIntent. What stays
// here (blueprintMechanicHitsFor, blueprintMechanicQueryFor,
// commanderTribesFromOracle) needs blueprintMechanicDefinition and
// BLUEPRINT_FILLER_WORDS back, imported above.

function blueprintMechanicHitsFor(card, requestedMechanics = []) {
  const oracle = String(card.oracleText || card.oracle_text || "");
  const typeLine = String(card.typeLine || card.type_line || "");
  const keywords = (card.keywords || []).map((keyword) => normalized(keyword).replaceAll("-", "_").replaceAll(" ", "_"));
  const tags = CARD_MECHANICS[normalized(card.name)] || [];
  return requestedMechanics.filter((mechanic) => {
    if (mechanic === "creature_activated_ability") return /\bcreature\b/i.test(typeLine) && /(^|\n)[^\n]{0,180}:/m.test(oracle);
    const definition = blueprintMechanicDefinition(mechanic);
    return keywords.includes(mechanic) || tags.includes(mechanic) || definition.tags?.some((tag) => tags.includes(tag)) || definition.oracle?.some((pattern) => pattern.test(oracle));
  });
}

export function blueprintMechanicQueryFor(mechanic) {
  const definition = blueprintMechanicDefinition(mechanic);
  return definition.query || `(kw:"${definition.label}" OR o:"${definition.label}")`;
}

// normalizeBlueprintText moved to blueprint-note-and-mana.mjs with
// parseNativeBlueprintIntent, its only caller.

const GENERIC_SCOPE_WORDS = new Set(["card", "creature", "permanent", "player", "opponent", "spell", "token", "target"]);
// Founder #066: colors ("Black creature spells you cast cost {1} less" —
// Bontu's Monument) sit in the exact same "WORD [permanent|creature|...]
// spells you cast" position the real tribe name occupies (Ashling, the
// Limitless: "Elemental permanent spells you cast..."), so widening that
// pattern to skip an optional type-qualifier word (below) opens a real
// risk of a color word getting captured as a fake tribe on some future
// card. No real legendary creature currently uses a color-qualified
// "COLOR creature spells you cast" phrasing (checked all five colors via
// Scryfall), so this doesn't fix an existing bug — it's defensive
// hardening for the same fix, shipped alongside it rather than as a
// separate speculative change.
// Founder #067: "legendary" — a real supertype, not a creature type — sits
// in the same "attack with one or more WORD" capture position a real tribe
// occupies (Amazing Alliance's real "Whenever you attack with one or more
// legendary creatures, draw a card."), verified via Scryfall.
// Founder #070: found via a real Aang, Airbending Master comparison — his
// real text ("Whenever one or more creatures you control leave the
// battlefield without dying...") made the old "TRIBE creatures you
// control" pattern (below) capture "more" as a fake tribe, since "more"
// sits directly before "creatures you control" the exact same way a real
// tribe name would ("Dragon creatures you control"). Pre-existing bug,
// not introduced by #070's own new pattern — found while verifying that
// pattern's own negative control. Verified 67 real cards use the "one or
// more creatures you control" phrasing via Scryfall, including at least
// one other real legendary creature (Disa the Restless) beyond Aang.
// Founder #071: "historic" — a real type qualifier, not a creature type —
// sits in the same "cast a WORD spell" capture position (below) a real
// tribe occupies (Gev, Scaled Scorch's real "Whenever you cast a Lizard
// spell..."). Confirmed, real risk: 13 real commanders use "cast a
// historic spell" (Scryfall-verified). The much more common sibling risk,
// any "cast a non-WORD spell" (68 real commanders use "cast a
// noncreature spell" alone, including Vibranium Sovereign's real
// "...can't be spent to cast a nonartifact spell", caught by this
// session's own pre-existing test suite, plus a noncreature-spell-payoff
// commander fixed by an earlier, unrelated round in this file's own
// history), is excluded at the pattern itself via a negative lookahead
// rather than enumerated here, since any negated type/quality word is
// definitionally not a real creature type.
// Founder #072: "of" — found the same way #070 found "more": a synthetic
// negative-control test for the new "number of TRIBE you control" scaling
// pattern (below) exposed that the pre-existing "TRIBE creatures you
// control" pattern also captures "of" as a fake tribe from the common
// real phrase "the number of creatures you control" (13 real commanders
// via Scryfall, including Adeline, Resplendent Cathar). Pre-existing bug,
// not introduced by #072's own new patterns.
// Founder #076: the five basic land type names — real land subtypes, not
// creature types — sit in the same "search your library for TYPE card(s)"
// capture position (below) a real tribe occupies (Korlash, Heir to
// Blackblade's real "Search your library for up to two Swamp cards...").
// ARTIFACT_OR_TOKEN_TYPES already excludes the generic "land"/"nonland",
// but not the five specific basic type names, which the new pattern's
// capture position exposes directly for the first time.
// Founder #082 (found the same way #070/#072 found "more"/"of"): a
// synthetic negative-control test for the new "whenever a/an TRIBE
// attacks" pattern exposed that the pre-existing "TRIBE creatures you
// control" pattern also captures "if" as a fake tribe from the real
// "Formidable"-style template "if creatures you control have total
// power/toughness N or greater" (4 real commanders via Scryfall —
// Finneas, Ace Archer; Betor, Kin to All; Orysa, Tide Choreographer;
// Surrak, the Hunt Caller). Pre-existing bug, not introduced by #081's
// own new pattern.
// Founder #101: "basic" added defensively alongside the #101 widening of
// the "search your library for TYPE card(s)" pattern below — a real
// "up to three basic land cards" tutor phrase would otherwise capture the
// qualifier "basic" instead of "land" (already its own stop word) as the
// first word after the quantifier. No real commander currently uses this
// exact phrasing for its own text, but it is free, safe hardening directly
// motivated by researching that fix, the same precedent #066's color-word
// additions used.
// Founder #101 (second addition, same round): confirmed via a real
// Hazezon, Shaper of Sand comparison — his real "Whenever a Desert you
// control enters, create..." leaked "desert" as a fake creature tribe
// (commanderTribesFromOracle returned ["desert"] before this fix; Desert
// is a real land subtype, never a creature type). Plains/Island/Swamp/
// Mountain/Forest were already filtered as the five BASIC land subtypes,
// but the complete real land-subtype list is longer — verified against
// Scryfall's own authoritative catalog (api.scryfall.com/catalog/land-
// types): Cave, Cloud, Desert, Gate, Lair, Locus, Mine, Planet,
// Power-Plant, Sphere, Tower, Town, and Urza's. Added the remaining ones
// defensively, same "free, safe hardening" precedent as "basic" above —
// this is a small, closed, authoritative rules list, not a guess.
const TRIBAL_STOP_WORDS = new Set(["target", "equipped", "enchanted", "attacking", "blocking", "tapped", "untapped", "nontoken", "other", "another", "each", "all", "more", "of", "if", "historic", "basic", "plains", "island", "swamp", "mountain", "forest", "cave", "cloud", "desert", "gate", "lair", "locus", "mine", "planet", "power-plant", "sphere", "tower", "town", "urza's", "black", "white", "blue", "red", "green", "colorless", "multicolored", "legendary", ...GENERIC_SCOPE_WORDS]);

const ARTIFACT_OR_TOKEN_TYPES = new Set([
  "clue", "treasure", "food", "gold", "blood", "map", "junk", "powerstone",
  "vehicle", "equipment", "fortification", "aura", "contraption", "attraction",
  "land", "lands", "nonland", "enchantment", "artifact", "instant", "sorcery",
  "planeswalker", "battle", "saga", "class", "case", "room", "background", "role",
]);

// Founder #038: none of the single-tribe patterns above ever match a
// multi-tribe payoff commander's own list — Blech, Loafing Pest ("put a
// +1/+1 counter on each Pest, Bat, Insect, Snake, and Spider you control")
// returned zero tribes, silently disabling every tribeAnchorLimit
// reservation in chooseSpells for the commander's entire actual payoff.
// Verified on a real, full-pool construction: with tribes returning empty,
// the engine's Blech build had only 3 real on-type creatures among its 64
// nonland cards, out of 36 creatures total. Captures a comma/"and"-
// separated list of Title-Case type words immediately before "each/all ...
// you control" and splits it into individual tribe names, which then run
// through the exact same TRIBAL_STOP_WORDS/GENERIC_SCOPE_WORDS filter
// below as every other pattern — "each creature you control" still
// correctly yields nothing, since "creature" is already a stop word.
const MULTI_TRIBE_LIST = /\b(?:each|all) ((?:[A-Za-z][A-Za-z'-]+(?:,\s*)?)+(?:and\s+[A-Za-z][A-Za-z'-]+)?) you control\b/gi;

// Founder #039: none of the patterns above match a "dig until you find
// TYPE" payoff either — Hei Bai, Forest Guardian ("reveal cards from the
// top of your library until you reveal a Shrine card. You may put that
// card onto the battlefield") returned zero tribes, so "Shrine" was never
// reserved as an anchor type even though it's Hei Bai's entire identity.
// Shrine spans both creatures (the Go-Shintai cycle) and enchantments (the
// Honden/Sanctum cycles); directTribes already matches by typeLine
// substring rather than requiring "Creature", so this needed only
// extraction, not new matching logic. Generic captures ("a land card", "a
// creature card") are already caught by the existing
// ARTIFACT_OR_TOKEN_TYPES/TRIBAL_STOP_WORDS filter below, same as every
// other pattern here.
const REVEAL_UNTIL_TYPE_CARD = /\breveal[^.]*?\breveal (?:a|an) ([A-Za-z][A-Za-z'-]+) card\b/gi;

// Founder #047: a third "dig, then put a TYPE card into play" shape,
// distinct from #039's "reveal ... until you reveal" (single type) — Nick
// Fury, Agent of S.H.I.E.L.D.'s real ability ("look at the top seven
// cards of your library. You may put a Hero, Equipment, or Vehicle card
// from among them onto the battlefield") looks at a fixed sample instead
// of digging until found, AND lists multiple candidate types at once, the
// same multi-type shape #038 handled for "each/all X, Y, and Z you
// control" but for a completely different verb structure. Deliberately
// anchored on "you may put ... card ... onto the battlefield" alone
// (not requiring "look at"/"reveal" earlier in the same clause) since
// that phrase crosses a sentence boundary in Nick Fury's own real text
// ("...your library. You may put...") that a same-sentence lookbehind
// can't reach. Equipment and Vehicle both already exist in
// ARTIFACT_OR_TOKEN_TYPES below, so they're correctly filtered out by the
// exact same shared stop-list every other pattern here uses — Hero is
// the only one of the three that survives, which is exactly right: it's
// the real creature type, Equipment already has its own dedicated
// package, and Vehicle has neither a typal identity nor an existing
// package to route into.
// Founder #063: found via a real Winota, Joiner of Forces comparison — one
// of the format's single most popular commanders (2,400+ likes on the one
// real decklist checked). Her real, current oracle text ("look at the top
// six cards of your library. You may put a Human creature card from among
// them onto the battlefield tapped and attacking...") is the exact same
// "dig a fixed sample, put a TYPE card onto the battlefield" shape #047
// built this pattern for, but with one extra descriptor word between the
// captured type and the literal "card" — "Human CREATURE card", not
// Nick Fury's bare "Hero... card". The old pattern required the captured
// type word(s) to be immediately followed by " card", so it silently
// never matched Winota's real text at all — the single most-played
// tribal-cheat-into-play commander in the identity-tribal-types pipeline
// produced zero targeted pool-fetch queries for her own core resource.
// Made "creature"/"permanent"/"land" optional between the type and "card"
// — the three words real cards use in this exact position (a fourth,
// "planeswalker", doesn't apply here since Planeswalker is excluded via
// ARTIFACT_OR_TOKEN_TYPES the same way Equipment/Vehicle already are).
// Verified Nick Fury's own multi-type extraction is unaffected.
// Founder #075: found via a real Gishath, Sun's Avatar comparison — the
// single most iconic Dinosaur tribal commander in the format. Her real
// text ("Put any number of Dinosaur creature cards from among them onto
// the battlefield...") never matched, since the old pattern required the
// literal "you may put (a|an)" opening — Gishath's real template has
// neither "you may" nor a singular determiner at all, using "Put any
// number of" plus a plural "cards" instead. Verified via Scryfall: this
// exact "put any number of TYPE creature cards ... onto the battlefield"
// shape is real but narrow (9 cards total, including Ghalta, Stampede
// Tyrant, also Dinosaur). Widened the opening to accept either the
// existing "you may put a/an" or this new "put any number of" as
// alternatives, and made the trailing "card" accept an optional plural
// "s" — Kaalia's and Nick Fury's existing singular-"card" extraction
// verified unaffected.
const PUT_TYPE_CARD_ONTO_BATTLEFIELD = /(?:you may put (?:a|an)|put any number of) ((?:[A-Za-z][A-Za-z'-]+(?:,\s*)?)+(?:or\s+[A-Za-z][A-Za-z'-]+)?) (?:creature |permanent |land )?cards?[^.]*?\bonto the battlefield\b/gi;

/**
 * Tribes implied by commander rules text ("another Bear you control",
 * "a Dragon you control", "Dragon spells you cast", "each Pest, Bat,
 * Insect, Snake, and Spider you control").
 * Used for scoring/semantics/package membership — NOT for Blueprint identity
 * floors, which remain note-explicit ("bear tribal").
 * Artifact/token types (Clue, Treasure) are not creature tribes.
 */
export function commanderTribesFromOracle(commanders = []) {
  const oracle = commanders.map((commander) => String(commander?.oracleText || commander?.oracle_text || "")).join(" ");
  return unique([
    // Founder #068: found via a real Cosmic Spider-Man comparison — his
    // real text ("other Spiders you control gain flying...") never
    // matched, since the old pattern only accepted "another" (a singular
    // determiner: "another Spider", never "another Spiders"), not the
    // bare "other" real cards use with a plural tribe ("other Spiders",
    // never "other Spider"). Verified 34 real cards use this "other
    // TRIBE-PLURAL you control" shape via Scryfall, including several
    // well-known legendary creatures/commanders (Haldir, Lórien
    // Lieutenant: Elves; Ishkanah, Broodmother: Spiders; General Kudro of
    // Drannith: Humans). Widened to accept "other" alongside "another",
    // and switched from normalized to singularizeTribe (imported above
    // for #067) since "other"'s capture is genuinely plural in real text
    // the same way #067's "attack with" capture was — normalized alone
    // would leave "Spiders" as "spiders", never matching a real Spider
    // creature's singular "Spider" type line. singularizeTribe is a safe
    // no-op on "another"'s already-singular captures too, verified
    // directly.
    //
    // Also caught a second, real, independent bug while verifying the
    // above: this pattern matched the literal keyword itself
    // ("another"/"other") with no case-insensitive flag. General Kudro of
    // Drannith's own real text opens a fresh sentence with it — "Other
    // Humans you control get +1/+1." — capitalized because it's the
    // first word of that sentence, not mid-clause after "Whenever".
    // Verified directly against the real stored oracle text (not just a
    // case-insensitive Scryfall search, which would give false positives
    // here) for 6 of 7 sampled real legendary creatures: General Kudro of
    // Drannith, Ishkanah Broodmother, Shelob Child of Ungoliant,
    // Thranduil Sindarin Liege, Tomb Tyrant, and Jirina Kudro all
    // genuinely open a sentence this way. The captured TRIBE word itself
    // was never the problem (`[A-Za-z]` already covers both cases by
    // construction) — only the literal "another"/"other" needed `/i`.
    // Founder #074: found via a real Inalla, Archmage Ritualist comparison
    // — her real Eminence trigger ("Whenever another nontoken Wizard you
    // control enters...") never matched, since "nontoken" sits directly
    // between "another" and the tribe, the same position #066 already had
    // to make an optional qualifier word for a different pattern ("TRIBE
    // TYPE-WORD spells you cast"). Verified 44 real commanders use this
    // "another nontoken TRIBE you control" shape via Scryfall, including
    // Arahbo, the First Fang (Cat) and Anafenza, Kin-Tree Spirit (generic
    // "creature", correctly still filtered downstream). Made "nontoken"
    // optional between "another"/"other" and the tribe capture.
    ...[...oracle.matchAll(/\b(?:another|other) (?:nontoken )?([A-Za-z][A-Za-z'-]+)s? you control\b/gi)].map((match) => singularizeTribe(match[1])),
    ...[...oracle.matchAll(/\b([A-Za-z][A-Za-z'-]+) creatures you control\b/gi)].map((match) => normalized(match[1])),
    // Added /i here too, defensively — same reasoning as the pattern
    // above, though no real card in a real-text-verified (not just
    // case-insensitive-search) sample of 18 candidates currently opens a
    // sentence with capitalized "A"/"An" this way. A pure widening with
    // no real downside, so shipped alongside the verified fix rather than
    // held back for lack of a currently-known case.
    ...[...oracle.matchAll(/\b(?:a|an) ([A-Za-z][A-Za-z'-]+)s? you control\b/gi)].map((match) => normalized(match[1])),
    // Founder #066: found via a real Ashling, the Limitless comparison —
    // her real text ("Elemental permanent spells you cast from your
    // hand gain evoke...") has a type-qualifier word (permanent/creature/
    // artifact/etc.) sitting directly between the real tribe and "spells
    // you cast", which the old pattern's single-word capture (positioned
    // immediately before "spells") couldn't skip — it grabbed "permanent"
    // (already a stop word, so the whole match silently produced nothing)
    // instead of "Elemental". Verified 57 real cards use this "TRIBE
    // TYPE-WORD spells you cast" shape via Scryfall (Herald's Horn,
    // Goreclaw, Bontu's Monument, others). Made the qualifier word
    // optional between the captured tribe and "spells you cast" — see
    // TRIBAL_STOP_WORDS above for the color-word guard shipped alongside
    // this same fix.
    ...[...oracle.matchAll(/\b([A-Za-z][A-Za-z'-]+) (?:permanent |creature |artifact |enchantment |instant |sorcery |noncreature |historic )?spells? you cast\b/g)].map((match) => normalized(match[1])),
    ...[...oracle.matchAll(MULTI_TRIBE_LIST)].flatMap((match) =>
      match[1].split(/,\s*(?:and\s+)?|\s+and\s+/i).filter(Boolean).map((word) => normalized(word))),
    ...[...oracle.matchAll(REVEAL_UNTIL_TYPE_CARD)].map((match) => normalized(match[1])),
    ...[...oracle.matchAll(PUT_TYPE_CARD_ONTO_BATTLEFIELD)].flatMap((match) =>
      match[1].split(/,\s*(?:or\s+)?|\s+or\s+/i).filter(Boolean).map((word) => normalized(word))),
    // Founder #067: found via a real Sidar Jabari of Zhalfir comparison —
    // his real Eminence trigger ("Whenever you attack with one or more
    // Knights...") never matched any existing pattern, none of which
    // handle an "attack with" clause at all. Verified 22 real cards use
    // this "attack with one or more TRIBE" shape via Scryfall (Arboreal
    // Alliance/Celeborn the Wise: Elves; Hermes, Overseer of Elpis: Birds;
    // Hired Claw: Lizards). Unlike every other pattern here, the tribe
    // word in this specific real template is genuinely plural in the
    // source text ("Knights", not "Knight") — every other pattern's
    // capture happens to already be singular in real oracle text, so this
    // is the first one that needs singularizeTribe (imported from
    // strategic-intent.mjs, the same helper extractTypalTribes already
    // uses, rather than reinventing pluralization rules) to correctly
    // turn "Elves" into "elf" — a naive trailing-s strip would produce
    // the wrong "elve". Excluded a negated "non-TRIBE" object (Anim Pakal,
    // Thousandth Moon's real "one or more non-Gnome creatures" — the
    // card cares about creatures WITHOUT that type, the opposite of what
    // extraction should capture) via a negative lookahead — both real
    // cards found and fixed in the same pass. "legendary" (Amazing
    // Alliance's real "one or more legendary creatures") is excluded via
    // TRIBAL_STOP_WORDS above instead, alongside this pattern's own bare
    // "creatures"/"creature" already-covered case.
    ...[...oracle.matchAll(/\battack with one or more (?!non-?[A-Za-z])([A-Za-z][A-Za-z'-]+)\b/gi)].map((match) => singularizeTribe(match[1])),
    // Founder #069: found via a real Sigarda, Champion of Light comparison
    // — her real text ("Humans you control get +1/+1.") has NO determiner
    // before the tribe at all (not "a/an", not "another/other" — a bare
    // plural noun opening the sentence), a fourth shape none of the
    // patterns above cover. Verified via Scryfall against Gisa, the
    // Hellraiser ("Skeletons and Zombies you control get +1/+1...") and
    // Temmet, Naktamun's Will ("...Zombies you control get +1/+1...") —
    // both also currently return []. Deliberately captures only the
    // single tribe word immediately before "you control get" rather than
    // a full comma/"and"-joined list the way MULTI_TRIBE_LIST/
    // PUT_TYPE_CARD_ONTO_BATTLEFIELD do: an early multi-word design was
    // tested and found to have two real bugs — it grabbed only the LAST
    // word of a two-item "X and Y" list with no Oxford comma (Gisa's
    // "Skeletons and Zombies" produced just "Zombies", since the other
    // patterns' list logic assumes a comma always precedes "and"), and it
    // bled backward across an unrelated preceding clause when the tribe
    // followed a mid-sentence comma (Temmet's "Whenever you draw a card,
    // Zombies you control get..." captured "card, Zombies" instead of
    // "Zombies"). The single-word capture here sidesteps both bugs at the
    // cost of only ever getting the LAST tribe in a multi-tribe list
    // (Gisa's Skeleton still isn't captured) — a real, smaller, documented
    // gap left for later rather than risking either bug shipping. Plural
    // in real text ("Humans", "Zombies"), so needs singularizeTribe the
    // same way #067's "attack with" capture does. Verified the generic
    // "Creatures you control get +1/+1" shape (many real cards) still
    // correctly yields nothing — "creature" is already a stop word via
    // GENERIC_SCOPE_WORDS.
    ...[...oracle.matchAll(/\b([A-Za-z][A-Za-z'-]+) you control get\b/gi)].map((match) => singularizeTribe(match[1])),
    // Founder #070: found via a real Malcolm, Keen-Eyed Navigator
    // comparison — his real text ("Whenever one or more Pirates you
    // control deal damage to your opponents, you create a Treasure
    // token...") never matched any pattern above, none of which handle a
    // "TRIBE deals damage" payoff trigger at all (only "attacks with"/
    // "spells you cast"/anthem shapes). Verified 80 real cards use this
    // "one or more TRIBE you control deal damage" template via Scryfall,
    // including several well-known partner/legendary commanders (Breeches,
    // Brazen Plunderer: Pirates; Anowon, the Ruin Thief: Rogues; Feline
    // Sovereign: Cats; Alela, Cunning Conqueror: Faeries). Anchored on
    // "you control deal" (plural "deal", not singular "deals") rather than
    // requiring the "one or more" prefix immediately before the capture,
    // the same way #069's "you control get" anchor works — this both
    // avoids re-deriving a second anchor style and, as a side effect,
    // still recovers the LAST tribe in a real "TRIBE1 and/or TRIBE2 you
    // control deal" multi-tribe list (Aphelia, Viper Whisperer's real
    // "Gorgons and/or Snakes" yields "snake", not zero) the same
    // documented partial-list trade-off #069 already accepts. The far
    // more common singular "a creature you control deals combat damage to
    // a player" combat-damage-trigger template (used by hundreds of
    // unrelated real cards) does not match at all, since "deal" and
    // "deals" are different words — verified directly.
    ...[...oracle.matchAll(/\b([A-Za-z][A-Za-z'-]+) you control deal\b/gi)].map((match) => singularizeTribe(match[1])),
    // Founder #071: found via a real Gev, Scaled Scorch comparison — his
    // real text ("Whenever you cast a Lizard spell, Gev deals 1 damage to
    // target opponent.") is the reverse word order of the existing "TRIBE
    // spells you cast" pattern above (that one requires the tribe BEFORE
    // "spells", this real template puts "cast a/an" first and the tribe
    // immediately before the trailing "spell") — a structurally distinct
    // real shape, not a superset. Verified via Scryfall: only 4 real
    // commanders use this exact "cast a/an TRIBE spell" trigger shape
    // (Rohgahh, Kher Keep Overlord: Kobold AND, in a second clause,
    // Dragon; Katilda and Lier: Human; Emperor Mihail II: Merfolk) — a
    // deliberately narrow template, unlike #066's 57-card "TRIBE TYPE-WORD
    // spells you cast" shape, but still real and currently invisible
    // (Gev's own trigger returned [] before this fix). A negative
    // lookahead excludes any "non-WORD" type qualifier ("nonartifact",
    // "noncreature", "nonland", ...) from being captured as a fake tribe
    // — caught for real by this session's own pre-existing test suite
    // (Vibranium Sovereign's real "...can't be spent to cast a
    // nonartifact spell" broke a Three Tree City typal-gating test before
    // this lookahead was added). "historic" doesn't start with "non-" so
    // it needed its own TRIBAL_STOP_WORDS entry instead — see above.
    ...[...oracle.matchAll(/\bcast (?:a|an) (?!non-?[A-Za-z])([A-Za-z][A-Za-z'-]+) spell\b/gi)].map((match) => normalized(match[1])),
    // Founder #072: found via a real Krenko, Mob Boss comparison — one of
    // the format's oldest and most iconic tribal commanders. His entire
    // identity ("Create X 1/1 red Goblin creature tokens, where X is the
    // number of Goblins you control.") is a scaling clause none of the
    // patterns above cover; returned [] before this fix. Verified via
    // Scryfall: this exact "the number of TRIBE you control" shape also
    // drives The Scarab God (Zombie) and Voja, Jaws of the Conclave and
    // Abomination of Llanowar (both Elf) — three more real, well-known
    // commanders, not a one-off. Plural in real text ("Goblins",
    // "Zombies", "Elves"), so needs singularizeTribe, same as #067/#068's
    // plural captures. A real "untapped Mountains"-style qualifier word
    // between "number of" and the tribe (Ben-Ben, Akki Hermit's real
    // text) or a multi-word "basic land types among lands" clause
    // (Bortuk Bonerattle) correctly produces no match at all — the
    // pattern only ever captures the single word directly adjacent to
    // "number of", same discipline as every other pattern here.
    ...[...oracle.matchAll(/\bnumber of ([A-Za-z][A-Za-z'-]+) you control\b/gi)].map((match) => singularizeTribe(match[1])),
    // Founder #072 (second, related shape, same commit): Voja's own real
    // text has a SECOND tribal scaling clause in a different shape —
    // "Draw a card for each Wolf you control." Verified 43 real commanders
    // use this "for each TRIBE you control" template via Scryfall (Rhys
    // the Exiled: Elf; real, recurring, not narrow like #071's 4-card
    // "cast a TRIBE spell" shape). Unlike #072's own "number of" sibling
    // above, the real source text here is already singular ("for each
    // Elf you control", not "Elves") — normalized alone is correct,
    // singularizeTribe is not needed and would be a safe no-op if it
    // were used, but matching the actual source grammar is clearer.
    ...[...oracle.matchAll(/\bfor each ([A-Za-z][A-Za-z'-]+) you control\b/gi)].map((match) => normalized(match[1])),
    // Founder #076: found via a real Tiamat comparison — one of the
    // single most iconic Dragon tribal commanders in all of Magic. Her
    // real text ("search your library for up to five Dragon cards...")
    // is a TUTOR shape, structurally distinct from every existing pattern
    // here: PUT_TYPE_CARD_ONTO_BATTLEFIELD requires "onto the
    // battlefield" (a cheat-into-play, not a search-to-hand), and
    // REVEAL_UNTIL_TYPE_CARD requires "reveal ... until you reveal" (a
    // dig, not a direct tutor). None of them match "search your library
    // for" at all. Verified 8 real commanders use a "search your library
    // for [quantity] TYPE cards" shape via Scryfall (Kura, the Boundless
    // Sky: land, already filtered; Korlash, Heir to Blackblade: Swamp —
    // see the TRIBAL_STOP_WORDS basic-land-type addition above, shipped
    // in the same commit as required hardening, not speculative; Bilbo,
    // Birthday Celebrant: creature, already filtered). Handles all three
    // real quantity-phrase shapes ("up to <N>", "any number of", bare
    // "a"/"an") and an optional trailing "s" on "card" for the plural
    // quantified cases.
    // Founder #101: found via a real Magda, Brazen Outlaw comparison — her
    // real "Search your library for an artifact or Dragon card, put that
    // card onto the battlefield..." only ever captured a single word here,
    // so "artifact or Dragon" silently produced nothing (returned []
    // before this fix — verified directly via commanderTribesFromOracle).
    // Widened the capture to the same comma/"or"-list shape
    // PUT_TYPE_CARD_ONTO_BATTLEFIELD above already uses, and split it the
    // same way (flatMap, not map) — "artifact" is filtered downstream via
    // ARTIFACT_OR_TOKEN_TYPES same as always, leaving "dragon". Verified 66
    // real cards use a "search your library for [TYPE] card(s)...put that
    // card/them onto the battlefield" shape via Scryfall (Academy Rector:
    // enchantment; Anchor to Reality: "an Equipment or Vehicle card" — a
    // second real disjunctive-type case); Tiamat's own single-type #076
    // capture ("Dragon"), Korlash's basic-land-type capture ("Swamp"), and
    // Bilbo's generic "creature" capture all verified unaffected by the
    // widened group.
    ...[...oracle.matchAll(/\bsearch your library for (?:up to [a-z]+ |any number of |a |an )?((?:[A-Za-z][A-Za-z'-]+(?:,\s*)?)+(?:\s*or\s+[A-Za-z][A-Za-z'-]+)?) cards?\b/gi)].flatMap((match) =>
      match[1].split(/,\s*(?:or\s+)?|\s+or\s+/i).filter(Boolean).map((word) => normalized(word))),
    // Founder #077: found via a real Grub, Storied Matriarch comparison —
    // her real text ("return up to one target Goblin card from your
    // graveyard to your hand") is a graveyard-recursion tutor shape none
    // of the existing patterns cover; #076's pattern is anchored on
    // "search your library", a completely different location. Verified
    // 57 real cards use a "target TYPE card from your graveyard" shape
    // via Scryfall, including real popular commanders (Greasefang, Okiba
    // Boss: Vehicle, already filtered via ARTIFACT_OR_TOKEN_TYPES; Adun
    // Oakenshield and Geth, Thane of Contracts: generic "creature",
    // already filtered).
    // Founder #080 (same commit as originally shipped #077 pattern,
    // widened after a real Admiral Brass, Unsinkable comparison): her
    // real text ("return target Pirate creature card from your graveyard
    // to the battlefield") has a type-qualifier word ("creature") sitting
    // directly between the tribe and "card", the exact same optional-
    // qualifier gap #063/#066/#074 each hit for a different pattern in
    // this file. The old pattern's single-word capture grabbed "creature"
    // itself (already a stop word, so the whole match silently produced
    // nothing) instead of "Pirate". Verified 42 real cards use "TRIBE
    // creature card from your graveyard" and 20 more use "TRIBE permanent
    // card from your graveyard" via Scryfall (Bladewing the Risen:
    // Dragon). Made "creature"/"permanent"/"artifact"/"land" optional
    // between the tribe and "card", the same qualifier set #063 already
    // established for PUT_TYPE_CARD_ONTO_BATTLEFIELD.
    ...[...oracle.matchAll(/\btarget ([A-Za-z][A-Za-z'-]+) (?:creature |permanent |artifact |land )?card from your graveyard\b/gi)].map((match) => normalized(match[1])),
    // Founder #078: found via a real Éowyn, Shieldmaiden comparison — her
    // real text ("Then if you control six or more Humans, draw a card.")
    // is a quantity-threshold check none of the existing patterns cover;
    // her OTHER clause ("another Human entered the battlefield under
    // your control") uses "under your control", not "you control", so it
    // doesn't match #068's pattern either — she returned [] entirely
    // before this fix, despite being a real, well-known Human tribal
    // commander. Verified 40 real commanders use a "you control N or
    // more TRIBE" shape via Scryfall (Beorn the Fierce: Bear, already
    // redundantly covered by his own "Other Bears you control" clause;
    // Bast, Panther Goddess and Jetmir, Nexus of Revels: generic
    // "creatures", already filtered). The captured word is genuinely
    // plural in real text ("Humans", "Bears"), so this needs
    // singularizeTribe the same way #067's "attack with one or more"
    // capture does — plain normalized() would leave "creatures"
    // unfiltered (GENERIC_SCOPE_WORDS only lists the singular "creature")
    // and "Humans"/"Bears" would never match a real singular type line,
    // caught directly while verifying this fix.
    ...[...oracle.matchAll(/\byou control [a-z]+ or more ([A-Za-z][A-Za-z'-]+)\b/gi)].map((match) => singularizeTribe(match[1])),
    // Founder #081: found via a real Najeela, the Blade-Blossom comparison
    // — one of the format's single most powerful and popular Warrior
    // tribal commanders. Her real text ("Whenever a Warrior attacks, you
    // may have its controller create a 1/1 white Warrior creature
    // token...") has neither "you control" (unlike every #067-#080
    // pattern) nor the "attack with one or more" shape #067 covers — a
    // bare "TRIBE attacks" trigger, deliberately firing off ANY player's
    // Warrior, not just the caster's own. Verified 19 real commanders use
    // a "whenever a/an TRIBE attacks" shape via Scryfall — most of the
    // raw hits are generic "opponent"/"creature"/"player" (already
    // filtered via GENERIC_SCOPE_WORDS), confirming Najeela is the real,
    // genuine beneficiary of this specific shape.
    ...[...oracle.matchAll(/\bwhenever an? ([A-Za-z][A-Za-z'-]+) attacks\b/gi)].map((match) => normalized(match[1])),
    // Founder #083: found via a real Lathril, Blade of the Elves
    // comparison — one of the format's single most popular Elf tribal
    // commanders. Her real activated-ability cost ("Tap ten untapped
    // Elves you control: Each opponent loses 10 life...") is a real
    // "tap N untapped TRIBE you control" cost shape none of the existing
    // patterns cover. Verified 28 real commanders use this shape via
    // Scryfall (Azami, Lady of Scrolls: "Tap an untapped Wizard you
    // control" — the quantity word here is "an", not a number, still
    // matched by the same flexible `[a-z]+`; Eladamri, Korvecdal: generic
    // "creatures", already filtered). The captured word is genuinely
    // plural in Lathril's own real text ("Elves"), so this needs
    // singularizeTribe the same way #078's "you control N or more TRIBE"
    // capture does.
    ...[...oracle.matchAll(/\btap [a-z]+ untapped ([A-Za-z][A-Za-z'-]+)s? you control\b/gi)].map((match) => singularizeTribe(match[1])),
  ]).filter((term) => term && !BLUEPRINT_FILLER_WORDS.has(term) && !TRIBAL_STOP_WORDS.has(term) && !ARTIFACT_OR_TOKEN_TYPES.has(term));
}

// Founder #039: worker/forge-generate.ts's loadNativeForgePool used to build
// its targeted Scryfall identityQueries only from the player's typed note
// (blueprint.tribalTypes) — a typal payoff commander's own oracle text
// never earned a targeted search unless the player also happened to type
// the tribe name themselves. Invisible for a tight 1-2 color pool (the
// popularity-ordered fetch surfaces on-tribe cards anyway), but for a
// wide-identity commander like Hei Bai (WUBRG) a niche subtype — 22 real
// Shrine-subtype cards total — can be entirely absent from ~1050
// popularity-ordered cards, so there is nothing left for the anchor-
// reservation loop above to reserve even after extraction is fixed.
// Merged (not replaced) with the note-derived list, note first, so an
// explicit player note still takes priority in identityQueries' slot cap.
export function identityTribalTypesFor(noteTribalTypes = [], commander, secondCommander) {
  const commanderTribes = commanderTribesFromOracle([commander, secondCommander].filter(Boolean));
  return [...new Set([...noteTribalTypes, ...commanderTribes])];
}

// Founder #040: same shape as identityTribalTypesFor above, but for
// non-typal package mechanics (blink, aristocrats) that carry a precise,
// hand-authored Scryfall query in BLUEPRINT_MECHANICS under the same id
// as their PACKAGE_CATALOG entry. A commander that structurally opens one
// of these packages (detectBlinkCommander, detectAristocratsCommander)
// used to get no targeted search for it unless the player also typed the
// mechanic name in their note. Invisible for a tight color identity — the
// popularity-ordered fetch below surfaces real blink/sac-outlet staples
// anyway — but Hei Bai's real WUBRG pool held exactly 3 "blink_effect"
// core candidates (one a false positive: Inkmoth Nexus's "Blinkmoth"
// substring match, a separate pre-existing gap) against the format's real
// blink suite (Cloudshift, Ghostly Flicker, Momentary Blink, Displace,
// Essence Flux, Siren's Ruse, Slip Out the Back, Scrollshift, ...), so
// opening the package (#040) alone still left almost nothing real to
// reserve — the commander wants to be blinked, but the 99 couldn't back
// it up. Deliberately narrow: only mechanics with a real hand-authored
// .query (not the generic keyword-label fallback) qualify, via the exact
// filter blueprintMechanicDefinition already applies for a missing entry,
// so this never fires a noisy, unverified search for a package with no
// precise query defined (tokens, landfall, typal — typal already has its
// own precise mechanism above — spellslinger, equipment, auras, stax,
// reanimator).
export function identityMechanicIdsFor(noteMechanicIds = [], commander, secondCommander) {
  const packageIds = commanderPackageIdsFromOracle([commander, secondCommander].filter(Boolean));
  const commanderMechanicIds = packageIds.filter((id) => blueprintMechanicDefinition(id).query);
  return [...new Set([...noteMechanicIds, ...commanderMechanicIds])];
}

// parseNativeBlueprintIntent moved to blueprint-note-and-mana.mjs (imported
// and re-exported above) — internal callers at prepareForgeAnalysis and
// forgeImportedMasterwork below use the imported binding unchanged.

function manaValueFromCost(cost = "", fallback = 0) {
  const symbols = [...String(cost).matchAll(/\{([^}]+)\}/g)].map((match) => match[1]);
  if (!symbols.length) return Number(fallback) || 0;
  return symbols.reduce((sum, symbol) => sum + (/^\d+$/.test(symbol) ? Number(symbol) : /^(X|Y|Z)$/.test(symbol) ? 0 : 1), 0);
}

// Hybrid symbols ({W/U}, {B/P}, etc.) count toward every named color at full
// weight rather than splitting — a simplification, but a card that can be
// cast with either color genuinely does pull the mana base toward both.
export function colorPipsFromCost(cost = "") {
  const symbols = [...String(cost).matchAll(/\{([^}]+)\}/g)].map((match) => match[1]);
  const pips = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  for (const symbol of symbols) {
    for (const color of Object.keys(pips)) {
      if (symbol.includes(color)) pips[color] += 1;
    }
  }
  return pips;
}

function cardText(card) {
  return `${card.name || ""}\n${card.typeLine || card.type_line || ""}\n${card.oracleText || card.oracle_text || ""}\n${(card.keywords || []).join(" ")}`;
}

// Scryfall's own edhrec-order popularity rank (0 = most played) is real,
// already-fetched evidence for "is this card actually good," previously
// used only to decide fetch order and then discarded by the scorer. Every
// non-Commander format has no other card-quality signal at all — role text
// alone can't tell a strong card from weak filler that happens to match a
// pattern. Log decay keeps the top of the list meaningfully ahead without
// letting popularity dominate synergy/role/curve fit lower down.
export function popularityScoreFromRank(rank) {
  if (!Number.isFinite(rank) || rank < 0) return 0;
  return Math.max(0, 9 - Math.log2(rank + 1) * 1.3);
}

// The Blueprint's budget selector ("Budget conscious", "Moderate
// investment", ...) was pure UI decoration — never once read by
// construction, so a player who picked "Budget conscious" got the exact
// same deck as "No strict limit." "No strict limit" and "Competitive
// optimization" intentionally carry no pressure (undefined lookup), so
// unset/optimized budgets are byte-for-byte the pre-existing behavior. A
// card with no known price is never penalized — absence of data isn't
// evidence it's expensive.
const BUDGET_PRICE_PRESSURE = Object.freeze({
  "Budget conscious": 1.4,
  "Moderate investment": 0.5,
});
export function budgetScoreFor(priceUsd, budget) {
  const pressure = BUDGET_PRICE_PRESSURE[budget];
  if (!pressure || !Number.isFinite(priceUsd) || priceUsd <= 0) return 0;
  return -Math.log2(priceUsd + 1) * pressure;
}

// A soft nudge toward a player-chosen target power tier, same shape as
// budgetScoreFor above — never a hard exclusion, since a tier is a
// heuristic estimate of the *finished* deck, not a rule any single card
// can be judged against in isolation. Reuses powerSignalCategoryFor
// (commander-power-signal.mjs) so this reads the exact same certain,
// oracle-text-anchored signals the honest post-hoc tier report itself
// uses, rather than a second, drifting definition of "powerful."
// Mass land denial is weighted double, mirroring evaluateCommanderPowerSignal's
// own signalScore weighting for the same category.
const POWER_TIER_BIAS = Object.freeze({ Casual: -3, Focused: -1, "High-Power": 1, Maximum: 3 });
export function powerTierScoreFor(card, targetPowerTier) {
  const bias = POWER_TIER_BIAS[targetPowerTier];
  if (!bias) return 0;
  const category = powerSignalCategoryFor(card);
  if (!category) return 0;
  return bias * (POWER_CATEGORY_WEIGHT[category] || 1);
}

// Requested tier (a construction-time bias, above) and measured tier
// (evaluateCommanderPowerSignal's own honest post-hoc read of the actual
// finished decklist) are independent by design — the bias nudges card
// selection but never excludes, so a thin pool or a bias too weak to
// overcome real role/curve requirements can still finish somewhere other
// than requested. This is the audit that catches that gap rather than
// silently reporting the measured tier next to a target it may not
// match.
const POWER_TIER_INDEX = Object.freeze(Object.fromEntries(POWER_TIERS.map((tier, index) => [tier, index])));

// rebuildAttempted/rebuildImproved/rebuildReachedTarget are three
// separate, honest claims — never conflated into one "rebuilt" boolean.
// A rebuild can be attempted and genuinely improve the measured tier
// (Maximum -> High-Power, say) without ever reaching the requested one;
// that must read as "improved but still disclosed as mismatched," never
// as "reached it." Only rebuildReachedTarget licenses the "reached the
// requested tier" copy anywhere downstream (native-masterwork-engine's
// own caller, and page.tsx's rendering of this same field).
function auditPowerTier(powerSignal, requestedTier) {
  const requestedIndex = POWER_TIER_INDEX[requestedTier];
  if (requestedIndex === undefined) return null;
  const measuredIndex = POWER_TIER_INDEX[powerSignal.tier];
  const mismatch = measuredIndex !== requestedIndex;
  return {
    requested: requestedTier,
    measured: powerSignal.tier,
    mismatch,
    direction: !mismatch ? null : measuredIndex > requestedIndex ? "higherThanRequested" : "lowerThanRequested",
    rebuildAttempted: false,
    rebuildImproved: false,
    rebuildReachedTarget: false,
  };
}

// Same broken-promise shape as budget above: the Blueprint's complexity
// selector ("Accessible", "Technical", "Maximum depth") was never read past
// its own form state. Word count is a blunt but honest proxy for how much a
// card asks of its pilot; choice points (modal bullets, "may"/"choose"),
// triggers, and activated-ability costs count for more than plain wording,
// since those are what actually make a card hard to play correctly.
export function oracleTextComplexity(oracleText = "") {
  const text = String(oracleText);
  const words = text.split(/\s+/).filter(Boolean).length;
  const choicePoints = (text.match(/\bchoose\b|\bmay\b|•/gi) || []).length;
  const triggers = (text.match(/\bwhenever\b|\bat the beginning of\b/gi) || []).length;
  const activatedAbilities = (text.match(/\{[^}]*\}[^.]*?:/g) || []).length;
  return words * 0.5 + choicePoints * 4 + triggers * 3 + activatedAbilities * 3;
}

// "Balanced" and any unset value carry no pressure, so the default
// experience is byte-for-byte the pre-existing behavior — same contract as
// the budget pressures above.
const COMPLEXITY_PRESSURE = Object.freeze({
  Accessible: -0.35,
  Technical: 0.35,
  "Maximum depth": 0.6,
});
export function complexityScoreFor(textComplexity, complexity) {
  const pressure = COMPLEXITY_PRESSURE[complexity];
  if (!pressure || !Number.isFinite(textComplexity)) return 0;
  return textComplexity * pressure;
}

// roleTagsFor/classifyNativeCard/conceptSignals moved to
// card-role-classification.mjs (imported and re-exported above).

function preferenceTerms(input) {
  const ignored = new Set(["this", "that", "with", "from", "your", "deck", "cards", "card", "want", "play", "forge", "must", "never", "should"]);
  const commanderText = allCommanders(input).map((commander) => commander.oracleText || "").join(" ");
  return unique(normalized(`${input.strategy} ${input.path} ${input.note} ${commanderText}`)
    .split(/[^a-z0-9+'-]+/).filter((term) => term.length >= 4 && !ignored.has(term)));
}

// Producer/payoff labels are intentionally broad, but commander text often
// narrows them: Ayula does not reward every ETB and cannot place counters on
// every creature; both clauses are Bear-only. Preserve that rules-text scope
// so a Plant token maker or non-Bear counter card cannot claim a commander
// connection merely because it shares the words "enters" or "counter."
const MANA_COLOR_WORDS = new Set(["white", "blue", "black", "red", "green", "colorless", "gold"]);

export function commanderMechanicalScopes(card = {}) {
  const oracle = String(card.oracleText || card.oracle_text || "");
  const collect = (patterns) => unique(patterns.flatMap((pattern) => [...oracle.matchAll(pattern)].map((match) => normalized(match[1]))))
    .filter((term) => term && !BLUEPRINT_FILLER_WORDS.has(term) && !TRIBAL_STOP_WORDS.has(term) && !GENERIC_SCOPE_WORDS.has(term));
  const namedArtifactTokens = unique([
    ...collect([/create [^.]*?(clue|treasure|food|blood|gold|map|junk|powerstone) (?:artifact )?token/gi]),
    ...(/investigate/i.test(oracle) ? ["clue"] : []),
  ]);
  return Object.freeze({
    produces: Object.freeze({
      counters: collect([/put [^.]*?counters? on target ([a-z][a-z'-]+)/gi]),
      tokens: collect([/create [^.]*?([a-z][a-z'-]+) creature token/gi]).filter((term) => !MANA_COLOR_WORDS.has(term)),
      artifacts: namedArtifactTokens,
      treasure: namedArtifactTokens.filter((term) => term === "treasure"),
      clues: namedArtifactTokens.filter((term) => term === "clue"),
      food: namedArtifactTokens.filter((term) => term === "food"),
      blood: namedArtifactTokens.filter((term) => term === "blood"),
      gold: namedArtifactTokens.filter((term) => term === "gold"),
      maps: namedArtifactTokens.filter((term) => term === "map"),
      junk: namedArtifactTokens.filter((term) => term === "junk"),
      powerstones: namedArtifactTokens.filter((term) => term === "powerstone"),
    }),
    rewards: Object.freeze({
      etb: collect([
        /whenever another ([a-z][a-z'-]+)(?: you control)? enters/gi,
        /whenever (?:a|one or more) ([a-z][a-z'-]+)s?(?: you control)? enter/gi,
        /whenever [^.]+ or another ([a-z][a-z'-]+)(?: you control)? enters/gi,
      ]),
      spells: collect([/whenever you cast (?:an?|one or more) ([a-z][a-z'-]+) spells?/gi]),
      artifacts: unique([
        ...collect([/whenever you cast (?:an?|one or more) ([a-z][a-z'-]+) spells?/gi]),
        ...collect([/whenever a(?:n)? (clue|treasure|food|blood|gold|map|junk|powerstone) you control/gi]),
      ]),
      treasure: collect([/whenever a(?:n)? (treasure) you control/gi]),
      clues: collect([/whenever a(?:n)? (clue) you control/gi]),
      food: collect([/whenever a(?:n)? (food) you control/gi]),
      blood: collect([/whenever a(?:n)? (blood) you control/gi]),
      gold: collect([/whenever a(?:n)? (gold) you control/gi]),
      maps: collect([/whenever a(?:n)? (map) you control/gi]),
      junk: collect([/whenever a(?:n)? (junk) you control/gi]),
      powerstones: collect([/whenever a(?:n)? (powerstone) you control/gi]),
    }),
  });
}

function cardFitsMechanicalScope(card, signal, tribes = []) {
  if (!tribes.length) return true;
  const typeLine = normalized(card.typeLine || card.type_line || "");
  const oracle = normalized(card.oracleText || card.oracle_text || "");
  if (tribes.some((tribe) => new RegExp(`(?:^|[^a-z])${tribe}(?:s)?(?:$|[^a-z])`, "i").test(typeLine))) return true;
  if (tribes.some((tribe) => new RegExp(`create[^.]{0,80}${tribe}[^.]{0,30}token`, "i").test(oracle))) return true;
  if (signal === "counters" && /counters? would be put on (?:a|one or more|each|target) (?:creature|permanent)|put twice that many counters/i.test(oracle)) return true;
  // Generic token payoffs still support a scoped token producer (Spirits
  // are tokens). Named artifact tokens need their own maker or outlet.
  if (signal === "tokens" && /tokens? you control|for each token/i.test(oracle)) return true;
  if (signal === "artifacts" && /artifacts? you control|artifact enters|sacrifice an artifact/i.test(oracle)) return true;
  if (tribes.includes("clue") && /investigate|clue token|sacrifice an artifact/i.test(oracle)) return true;
  if (tribes.includes("treasure") && /treasure token|sacrifice a treasure/i.test(oracle)) return true;
  if (tribes.includes("food") && /food token|sacrifice a food/i.test(oracle)) return true;
  if (tribes.includes("blood") && /blood token|sacrifice a blood/i.test(oracle)) return true;
  if (tribes.includes("gold") && /gold token|sacrifice a gold/i.test(oracle)) return true;
  if (tribes.includes("map") && /map token|sacrifice a map/i.test(oracle)) return true;
  if (tribes.includes("junk") && /junk token|sacrifice a junk/i.test(oracle)) return true;
  if (tribes.includes("powerstone") && /powerstone token|sacrifice a powerstone/i.test(oracle)) return true;
  return false;
}

export function commanderConnectionSignalsFor(card, mechanics, commanderMechanics, commanderScopes) {
  const typeLine = String(card.typeLine || card.type_line || "");
  const effectiveProduces = unique([
    ...mechanics.produces,
    // A permanent entering is itself a real ETB event. This matters for a
    // scoped commander such as Ayula: every Bear creature is a true engine
    // piece even if its own rules text has no ETB ability, while the scope
    // check below still rejects Plants, Eldrazi, and other unrelated bodies.
    ...(!/\bInstant\b|\bSorcery\b/i.test(typeLine) ? ["etb"] : []),
  ]);
  return unique([
    ...mechanics.rewards.filter((signal) =>
      commanderMechanics.produces.includes(signal) && cardFitsMechanicalScope(card, signal, commanderScopes.produces?.[signal] || [])),
    ...effectiveProduces.filter((signal) =>
      commanderMechanics.rewards.includes(signal) && cardFitsMechanicalScope(card, signal, commanderScopes.rewards?.[signal] || [])),
  ]);
}

// The same producer/payoff vocabulary that powers the post-build interaction
// graph (forge-interaction-graph.mjs), applied one pool-wide pass ahead of
// scoring instead of after construction. A single pass is O(n): count how
// many pool cards produce or reward each mechanical signal, then each card's
// synergyPotential is how many of those counts its own produces/rewards tap
// into. This deliberately skips the O(n^2) pairwise edge graph — the goal
// here is "does this plug into an active theme in the pool", not the exact
// edge list, which the interaction graph already reports after the fact.
// Exposed alongside classifyNativeCard for direct unit testing of the
// scoring analysis, independent of running a full construction.
export function poolMechanicalSignals(cards) {
  const producerCounts = new Map();
  const payoffCounts = new Map();
  const claimCounts = new Map();
  const mechanicsByIndex = cards.map((card) => {
    if (/\bLand\b/i.test(card.typeLine || card.type_line || "")) return { signals: [], produces: [], rewards: [] };
    const mechanics = extractMechanicalSignals(card);
    for (const signal of mechanics.produces) producerCounts.set(signal, (producerCounts.get(signal) || 0) + 1);
    for (const signal of mechanics.rewards) payoffCounts.set(signal, (payoffCounts.get(signal) || 0) + 1);
    for (const claim of evaluateSituationalCard(card).resourceClaims) claimCounts.set(claim, (claimCounts.get(claim) || 0) + 1);
    return mechanics;
  });
  return { mechanicsByIndex, producerCounts, payoffCounts, claimCounts };
}

export function synergyPotentialFor(mechanics, poolSignals) {
  if (!mechanics || !poolSignals) return 0;
  const rewardConnections = mechanics.rewards.reduce((sum, signal) => {
    const producers = (poolSignals.producerCounts.get(signal) || 0) - (mechanics.produces.includes(signal) ? 1 : 0);
    return sum + Math.min(4, Math.max(0, producers));
  }, 0);
  const produceConnections = mechanics.produces.reduce((sum, signal) => {
    const payoffs = (poolSignals.payoffCounts.get(signal) || 0) - (mechanics.rewards.includes(signal) ? 1 : 0);
    return sum + Math.min(4, Math.max(0, payoffs));
  }, 0);
  return rewardConnections + produceConnections;
}

// Mirrors the counter-strategy pattern already used for simulated-matchup
// pressure testing (pressureQuery in page.tsx's Meta Breaker experiments),
// expressed in this engine's own role vocabulary. Only meaningful data the
// Forge actually has justifies a bias in construction — a verified,
// current, sufficiently-sampled tournament field, not a guess.
const FIELD_COUNTER_ROLES = Object.freeze({
  Aggro: ["lifegain", "sweeper", "protection"],
  Control: ["protection", "recursion"],
  Midrange: ["interaction", "draw"],
  Tempo: ["interaction"],
  Combo: ["interaction"],
  Ramp: ["interaction", "sweeper"],
});

// Pure and separately testable from getMetaIntelligence()'s live snapshot so
// coverage doesn't depend on today's actual tournament data staying the same.
export function fieldCounterRolesFor(format, meta) {
  if (format !== "Standard" || !meta?.readyForCurrentFieldUse || !meta.leadingStrategy) return [];
  return FIELD_COUNTER_ROLES[meta.leadingStrategy] || [];
}

function analyzeCard(card, context, evidenceByName, mechanics, poolSignals) {
  const roles = classifyNativeCard(card);
  const text = normalized(cardText(card));
  const evidence = evidenceByName.get(normalized(card.name)) || {};
  const typeLine = normalized(card.typeLine || card.type_line || "");
  const tribeLens = unique([...(context.blueprint.tribalTypes || []), ...(context.commanderTribes || [])]);
  const directTribes = tribeLens.filter((tribe) =>
    new RegExp(`(?:^|[^a-z])${tribe}(?:$|[^a-z])`, "i").test(typeLine),
  );
  const tribalSupport = tribeLens.filter((tribe) =>
    (!directTribes.includes(tribe) && text.includes(tribe)) ||
    /choose a creature type|creature type of your choice|creatures? you control of the chosen type|changeling|kindred/i.test(text),
  );
  const identityHits = unique([...directTribes, ...tribalSupport]);
  const blueprintRoleHits = roles.filter((role) => context.blueprint.desiredRoles.includes(role));
  const blueprintMechanicHits = blueprintMechanicHitsFor(card, context.blueprint.requestedMechanics);
  const commanderConnectionSignals = commanderConnectionSignalsFor(card, mechanics, context.commanderMechanics, context.commanderScopes);
  const payoffMagnitudeHits = payoffMagnitudeHitsFor(card, context.commanderPayoffGates || []);
  const selfDamageSynergyHit = context.commanderProfitsFromDamage
    && (cardDealsMassDamageToCreatures(card.oracleText || card.oracle_text || "")
      || cardCanDealDamageToOwnCreature(card.oracleText || card.oracle_text || ""))
    ? 1 : 0;
  const xSpellSynergyHit = context.commanderCaresAboutXSpells
    && hasVariableGenericCost(card.manaCost || card.mana_cost || "")
    ? 1 : 0;
  const planeswalkerCheatSynergyHit = context.commanderValuesPlaneswalkerCheats
    && /\bPlaneswalker\b/i.test(card.typeLine || card.type_line || "")
    ? 1 : 0;
  const roomSynergyHit = context.commanderInteractsWithRooms
    && /\bRoom\b/i.test(card.typeLine || card.type_line || "")
    ? 1 : 0;
  const castingFactor = restrictedEffectCastingFactor({
    manaCost: card.manaCost || card.mana_cost || "",
    colorIdentity: card.colorIdentity || card.color_identity || [],
    typeLine: card.typeLine || card.type_line || "",
    commanderOracle: context.commanderOracle || "",
    commanderColors: context.commanderColors || [],
  });
  const winconFactor = restrictedWinconFactor({
    oracle: card.oracleText || card.oracle_text || "",
    commanderOracle: context.commanderOracle || "",
    blueprintText: `${context.blueprint?.source || ""} ${(context.blueprint?.requestedMechanics || []).join(" ")} ${(context.blueprint?.promises || []).join(" ")}`,
  });
  const tokenProductionFactor = conditionalTokenProductionFactor(card.oracleText || card.oracle_text || "");
  const rampProductionFactor = conditionalRampProductionFactor(card.oracleText || card.oracle_text || "");
  const situational = evaluateSituationalCard(card);
  const situationalFactor = situationalReliabilityFactor(card) * resourceCompetitionFactor(card, poolSignals);
  const printedCmc = manaValueFromCost(card.manaCost || card.mana_cost, card.cmc);
  const cmc = curveManaValue(card.manaCost || card.mana_cost, printedCmc);
  const floorCredit = roleFloorCredit(card.oracleText || card.oracle_text || "", {
    colorIdentity: card.colorIdentity || card.color_identity || [],
    commanderColors: context.commanderColors || [],
    commanderOracle: context.commanderOracle || "",
    blueprintText: `${context.blueprint?.source || ""} ${(context.blueprint?.requestedMechanics || []).join(" ")}`,
  });
  const sequenceStages = unique([
    ...(cmc <= 3 && roles.some((role) => ["ramp", "draw", "selection"].includes(role)) ? ["setup"] : []),
    ...(cmc <= 3 && roles.some((role) => ["interaction", "protection"].includes(role)) ? ["stabilize"] : []),
    ...(commanderConnectionSignals.length || mechanics.rewards.length ? ["convert"] : []),
    ...(roles.some((role) => ["recursion", "draw", "protection"].includes(role)) ? ["recover"] : []),
    ...((cmc >= 4 && roles.includes("threat")) || roles.includes("combat") || mechanics.rewards.includes("combat") ? ["close"] : []),
  ]);
  const excludedRoleHits = roles.filter((role) => context.blueprint.excludedRoles.includes(role));
  const fieldPressureHits = roles.filter((role) => context.fieldCounterRoles.includes(role)).length;
  const strategicSemantics = strategicSemanticsFor(card);
  // Typal membership is type-line precise; oracle-only tribe mentions are
  // false friends that must never satisfy typal density.
  if (directTribes.length) strategicSemantics.add("typal_member");
  if (tribalSupport.length && !directTribes.length) strategicSemantics.add("typal_mention");
  return {
    card,
    roles,
    text,
    cmc,
    roleScore: modalAwareRoleScore(roles.map((role) => {
      const weight = context.weights[role] || (role === "threat" ? 7 : 2);
      const quality = role === "interaction" ? interactionQualityFor(text) : 1;
      return weight * quality;
    }), text),
    synergyHits: roles.filter((role) => context.commanderSignals.includes(role)).length,
    synergyPotential: synergyPotentialFor(mechanics, poolSignals),
    preferenceHits: context.terms.filter((term) => text.includes(term)).length,
    resilienceRoles: roles.filter((role) => ["draw", "protection", "recursion", "interaction"].includes(role)).length,
    evidenceScore: clamp(Number(evidence.evidenceScore || 0) * 100) * 0.12,
    discovery: evidence.newCardPotential ? 2 : 0,
    popularityScore: popularityScoreFromRank(card.popularityRank),
    castingFactor,
    winconFactor,
    tokenProductionFactor,
    rampProductionFactor,
    situational,
    situationalFactor,
    roleFloorCredit: floorCredit,
    budgetScore: budgetScoreFor(card.priceUsd, context.budget),
    complexityScore: complexityScoreFor(oracleTextComplexity(card.oracleText || card.oracle_text), context.complexity),
    powerTierScore: powerTierScoreFor(card, context.targetPowerTier),
    fieldPressureHits,
    directTribes,
    tribalSupport,
    identityHits,
    blueprintRoleHits,
    blueprintMechanicHits,
    commanderConnectionSignals,
    payoffMagnitudeHits,
    selfDamageSynergyHit,
    xSpellSynergyHit,
    planeswalkerCheatSynergyHit,
    roomSynergyHit,
    sequenceStages,
    excludedRoleHits,
    strategicSemantics,
    mechanics: mechanics || { signals: [], produces: [], rewards: [] },
    colorPips: colorPipsFromCost(card.manaCost || card.mana_cost),
    needsSnowSupport: /\bsnow (?:land|permanent|mana)|\{S\}/i.test(String(card.oracleText || card.oracle_text || "")),
  };
}

function prepareForgeAnalysis(input, evidenceByName) {
  const blueprint = parseNativeBlueprintIntent(input);
  const commanderMechanicRows = allCommanders(input).map((commander) => extractMechanicalSignals(commander));
  const commanderScopeRows = allCommanders(input).map((commander) => commanderMechanicalScopes(commander));
  const context = {
    weights: STRATEGY_WEIGHTS[strategyProfileFor(input.strategy)],
    commanderSignals: unique(allCommanders(input).flatMap((commander) => conceptSignals(commander))),
    commanderMechanics: Object.freeze({
      produces: unique(commanderMechanicRows.flatMap((mechanics) => mechanics.produces)),
      rewards: unique(commanderMechanicRows.flatMap((mechanics) => mechanics.rewards)),
    }),
    commanderScopes: Object.freeze({
      produces: Object.freeze({
        counters: unique(commanderScopeRows.flatMap((scope) => scope.produces.counters || [])),
        tokens: unique(commanderScopeRows.flatMap((scope) => scope.produces.tokens || [])),
        artifacts: unique(commanderScopeRows.flatMap((scope) => scope.produces.artifacts || [])),
        treasure: unique(commanderScopeRows.flatMap((scope) => scope.produces.treasure || [])),
        clues: unique(commanderScopeRows.flatMap((scope) => scope.produces.clues || [])),
        food: unique(commanderScopeRows.flatMap((scope) => scope.produces.food || [])),
        blood: unique(commanderScopeRows.flatMap((scope) => scope.produces.blood || [])),
        gold: unique(commanderScopeRows.flatMap((scope) => scope.produces.gold || [])),
        maps: unique(commanderScopeRows.flatMap((scope) => scope.produces.maps || [])),
        junk: unique(commanderScopeRows.flatMap((scope) => scope.produces.junk || [])),
        powerstones: unique(commanderScopeRows.flatMap((scope) => scope.produces.powerstones || [])),
      }),
      rewards: Object.freeze({
        etb: unique(commanderScopeRows.flatMap((scope) => scope.rewards.etb || [])),
        spells: unique(commanderScopeRows.flatMap((scope) => scope.rewards.spells || [])),
        artifacts: unique(commanderScopeRows.flatMap((scope) => scope.rewards.artifacts || [])),
        treasure: unique(commanderScopeRows.flatMap((scope) => scope.rewards.treasure || [])),
        clues: unique(commanderScopeRows.flatMap((scope) => scope.rewards.clues || [])),
        food: unique(commanderScopeRows.flatMap((scope) => scope.rewards.food || [])),
        blood: unique(commanderScopeRows.flatMap((scope) => scope.rewards.blood || [])),
        gold: unique(commanderScopeRows.flatMap((scope) => scope.rewards.gold || [])),
        maps: unique(commanderScopeRows.flatMap((scope) => scope.rewards.maps || [])),
        junk: unique(commanderScopeRows.flatMap((scope) => scope.rewards.junk || [])),
        powerstones: unique(commanderScopeRows.flatMap((scope) => scope.rewards.powerstones || [])),
      }),
    }),
    commanderTribes: Object.freeze(commanderTribesFromOracle(allCommanders(input))),
    commanderOracle: allCommanders(input).map((commander) => commander.oracleText || commander.oracle_text || "").join(" "),
    // Founder #027: "whenever you cast an artifact spell with mana value 4
    // or greater" read directly off the commander, independent of any note —
    // a player who picks a payoff commander with no custom fantasy text
    // still gets graded against its real trigger condition.
    commanderPayoffGates: Object.freeze(allCommanders(input).flatMap((commander) =>
      commanderPayoffMagnitudeGates(commander.oracleText || commander.oracle_text || ""))),
    // Founder #036: checked per-commander, not joined text — the
    // indestructible and the "dealt damage" trigger must both be on the
    // SAME commander (Smaug the Impenetrable's own body) for the survive-
    // and-profit combo to be real; joining a partner pair's text the way
    // commanderCostCheat does below would falsely combine an indestructible
    // partner with an unrelated damage-triggered one.
    commanderProfitsFromDamage: allCommanders(input).some((commander) =>
      commanderProfitsFromBeingDamaged(commander.oracleText || commander.oracle_text || "")),
    // Founder #046: same per-commander (not joined-text) scoping as
    // commanderProfitsFromDamage above, for the same reason — a partner
    // pair shouldn't falsely combine an X-spell-caring commander with an
    // unrelated one.
    commanderCaresAboutXSpells: allCommanders(input).some((commander) =>
      commanderCaresAboutXSpells(commander.oracleText || commander.oracle_text || "")),
    // Founder #049: same per-commander (not joined-text) scoping as the
    // others above, for the same reason.
    commanderValuesPlaneswalkerCheats: allCommanders(input).some((commander) =>
      commanderValuesPlaneswalkerCheats(commander.oracleText || commander.oracle_text || "")),
    // Founder #050: same per-commander (not joined-text) scoping as the
    // others above, for the same reason.
    commanderInteractsWithRooms: allCommanders(input).some((commander) =>
      commanderInteractsWithRooms(commander.oracleText || commander.oracle_text || "")),
    // Same cost_cheat detection strategic-intent.mjs's expensiveThreatSupport
    // uses to credit the 99, applied here to the commander's own text. A
    // commander whose ability puts cards into play without paying for them
    // (Tony Stark // The Invincible Iron Man cheating an artifact in each
    // combat, say) makes an expensive payoff's printed mana value a much
    // weaker signal of how "castable" it really is - scoreCard's curve
    // term below needs to know that too, not just the final cohesion gate.
    commanderCostCheat: /cast [^.]* without paying|put [^.]* onto the battlefield|mana value .{0,20} less to cast|costs? \{[^}]+\} less/i
      .test(allCommanders(input).map((commander) => commander.oracleText || commander.oracle_text || "").join(" ")),
    commanderColors: Object.freeze(commanderColors(input)),
    terms: preferenceTerms(input),
    ideal: ["Aggressive", "Tempo"].includes(strategyProfileFor(input.strategy))
      ? 2.4
      : strategyProfileFor(input.strategy) === "Control" ? 3.2 : 2.9,
    blueprint,
    fieldCounterRoles: fieldCounterRolesFor(input.format, getMetaIntelligence()),
    budget: input.budget,
    complexity: input.complexity,
    targetPowerTier: input.targetPowerTier,
  };
  const commanderNames = commanderNamesNormalized(input);
  const poolSignals = poolMechanicalSignals(input.cards);
  const cards = input.cards.map((card, index) =>
    analyzeCard(card, context, evidenceByName, poolSignals.mechanicsByIndex[index], poolSignals));
  // A stated exclusion ("no sacrifice") is a hard constraint, not a scoring
  // nudge — the commission promises the deck "must never become" it. Cards
  // are dropped from candidacy entirely rather than merely deprioritized,
  // so an unsatisfiable exclusion surfaces as the existing "could not fill
  // N spell slot(s)" error instead of silently breaking the promise.
  //
  // maxCardPrice and commonsOnly are the same kind of hard promise, not a
  // scoring nudge: a player building a budget or commons-only list needs
  // the Forge to actually never print an over-budget or non-common card,
  // not just deprioritize it. A card with no known price is never
  // excluded on price — absence of data isn't evidence it's over budget,
  // same convention budgetScoreFor already follows for its soft nudge.
  const eligible = cards.filter((entry) =>
    !entry.excludedRoleHits.length &&
    !(Number.isFinite(input.maxCardPrice) && Number.isFinite(entry.card.priceUsd) && entry.card.priceUsd > input.maxCardPrice) &&
    !(input.commonsOnly && entry.card.rarity && entry.card.rarity !== "common"));
  const strategicIntent = buildStrategicIntent(input, {
    ...context,
    roleTargets: roleTargets(input.format, input.strategy),
  });
  context.strategicIntent = strategicIntent;
  return {
    context,
    strategicIntent,
    cards,
    spells: eligible.filter((entry) => !entry.roles.includes("land") && !commanderNames.has(normalized(entry.card.name))),
    // Kept as full analyzed entries, not stripped to bare cards — same
    // shape `spells` already uses. This used to be
    // `.map((entry) => entry.card)`, which discarded budgetScore/
    // powerTierScore/complexityScore before buildManaBase ever ran,
    // silently exempting every land from every player preference that
    // isn't the numeric maxCardPrice/commonsOnly hard filter (that filter
    // already ran above, in `eligible`, so it was never the gap).
    lands: eligible.filter((entry) => entry.roles.includes("land")),
  };
}

// Recovery-ladder step 2 (see buildCandidate below): a scarce color
// identity combined with a strict budget or commons-only preference can
// leave too few eligible cards to fill every slot — buildCandidate's first
// attempt throws in exactly that case (chooseSpells' "could not fill N
// spell slot(s)"). Budget and rarity are real preferences, not rules: this
// rebuilds the spell/land pools from the same already-analyzed cards
// without the maxCardPrice/commonsOnly exclusion, so a second attempt has
// a realistic chance to actually complete. A stated hard exclusion
// (excludedRoleHits — "this deck must never become X") is deliberately
// NOT relaxed here: only preferences the player never asked to be
// absolute may bend. Legality, format, color identity, and the commander
// itself were never filtered here at all — they're guaranteed further
// upstream, by the verified pool this analysis was built from.
function relaxAnalysisPreferences(analysis, input) {
  const commanderNames = commanderNamesNormalized(input);
  const eligible = analysis.cards.filter((entry) => !entry.excludedRoleHits.length);
  return {
    ...analysis,
    spells: eligible.filter((entry) => !entry.roles.includes("land") && !commanderNames.has(normalized(entry.card.name))),
    // Same analyzed-entry shape as prepareForgeAnalysis's `lands` above —
    // relaxation only widens which entries are eligible, never changes
    // what shape they are.
    lands: eligible.filter((entry) => entry.roles.includes("land")),
  };
}

// Curve-fit contribution to a card's score: how far its CMC sits from the
// deck's ideal average. A commander that cheats cards into play makes an
// expensive card's printed mana value a much weaker signal of how hard it
// really is to get online than a flat per-point deviation penalty assumes.
// Halving the deviation still floors this term at 0 for anything truly
// expensive (a 12-drop is still ~4.5 "effective" points above a ~2.9 ideal,
// past the point of the *10 - x*3.2* formula ever going positive) -
// capping it instead means a genuine payoff always registers some real,
// non-zero curve credit rather than reading identically to every other
// wildly-off-curve card. Only applies above the curve's own ideal; a card
// already cheaper than ideal gains nothing extra from a commander that
// skips paying for pricier ones, and it still has to be drawn - this isn't
// free, just no longer scored as if it always has to be hard-cast. Exposed
// for direct unit testing, independent of running a full construction
// (same pattern as poolMechanicalSignals/synergyPotentialFor above).
export function curveScoreFor(cmc, ideal, commanderCostCheat, curveWeight = 1) {
  const deviation = Math.abs(cmc - ideal);
  const effectiveDeviation = commanderCostCheat && cmc > ideal ? Math.min(deviation, 3) : deviation;
  return Math.max(0, 10 - effectiveDeviation * 3.2) * curveWeight;
}

function scoreCard(entry, input, variant, context) {
  const curveScore = curveScoreFor(entry.cmc, context.ideal, context.commanderCostCheat, variant.curve);
  const deterministicTieBreak = (hash(`${input.seed}|${variant.id}|${entry.card.name}`) % 1000) / 100000;
  const oracleText = entry.card.oracleText || entry.card.oracle_text || entry.text || "";
  const castingFactor = Number.isFinite(entry.castingFactor) ? entry.castingFactor : 1;
  const winconFactor = Number.isFinite(entry.winconFactor) ? entry.winconFactor : 1;
  const tokenProductionFactor = Number.isFinite(entry.tokenProductionFactor) ? entry.tokenProductionFactor : 1;
  const rampProductionFactor = Number.isFinite(entry.rampProductionFactor) ? entry.rampProductionFactor : 1;
  const fixingCredit = colorlessFixingCredit({
    oracle: oracleText,
    colorIdentity: entry.card.colorIdentity || entry.card.color_identity || [],
    manaCost: entry.card.manaCost || entry.manaCost || entry.card.mana_cost || "",
    commanderColors: context.commanderColors || [],
  });
  return {
    card: entry.card,
    roles: entry.roles,
    cmc: entry.cmc,
    castingFactor,
    winconFactor,
    tokenProductionFactor,
    rampProductionFactor,
    fixingCredit,
    score: (entry.roleScore + entry.synergyHits * 7 * variant.synergy + entry.synergyPotential * 1.5 * variant.synergy + entry.commanderConnectionSignals.length * 14 * variant.synergy + entry.payoffMagnitudeHits * 14 * variant.synergy + entry.selfDamageSynergyHit * 14 * variant.synergy + entry.xSpellSynergyHit * 14 * variant.synergy + entry.planeswalkerCheatSynergyHit * 14 * variant.synergy + entry.roomSynergyHit * 14 * variant.synergy + entry.preferenceHits * 3.5 + entry.directTribes.length * 34 + entry.tribalSupport.length * 13 + entry.blueprintRoleHits.length * 12 + entry.blueprintMechanicHits.reduce((sum, mechanic) => sum + blueprintMechanicDefinition(mechanic).score, 0) + entry.fieldPressureHits * 4 + curveScore + entry.resilienceRoles * 3 * variant.resilience + entry.evidenceScore + entry.discovery + entry.popularityScore + entry.budgetScore + entry.complexityScore + entry.powerTierScore + deterministicTieBreak) * castingFactor * fixingCredit * winconFactor * tokenProductionFactor * rampProductionFactor * entry.situationalFactor,
    synergyHits: entry.synergyHits,
    synergyPotential: entry.synergyPotential,
    situational: entry.situational,
    situationalFactor: entry.situationalFactor,
    preferenceHits: entry.preferenceHits,
    fieldPressureHits: entry.fieldPressureHits,
    directTribes: entry.directTribes || [],
    tribalSupport: entry.tribalSupport || [],
    identityHits: entry.identityHits || [],
    blueprintRoleHits: entry.blueprintRoleHits || [],
    blueprintMechanicHits: entry.blueprintMechanicHits || [],
    commanderConnectionSignals: entry.commanderConnectionSignals || [],
    payoffMagnitudeHits: entry.payoffMagnitudeHits || 0,
    selfDamageSynergyHit: entry.selfDamageSynergyHit || 0,
    xSpellSynergyHit: entry.xSpellSynergyHit || 0,
    planeswalkerCheatSynergyHit: entry.planeswalkerCheatSynergyHit || 0,
    roomSynergyHit: entry.roomSynergyHit || 0,
    sequenceStages: entry.sequenceStages || [],
    strategicSemantics: entry.strategicSemantics,
    mechanics: entry.mechanics,
    colorPips: entry.colorPips,
    oracleText,
    roleFloorCredit: Number.isFinite(entry.roleFloorCredit)
      ? entry.roleFloorCredit
      : roleFloorCredit(oracleText, {
        colorIdentity: entry.card.colorIdentity || entry.card.color_identity || [],
        commanderColors: context.commanderColors || [],
        commanderOracle: context.commanderOracle || "",
        blueprintText: context.blueprint?.source || "",
      }),
    needsSnowSupport: entry.needsSnowSupport,
  };
}

function isUnrestrictedConstructionCredit(entry) {
  return (entry.castingFactor ?? 1) >= 1
    && (entry.fixingCredit ?? 1) >= 1
    && (entry.winconFactor ?? 1) >= 1
    && (entry.tokenProductionFactor ?? 1) >= 1
    && (entry.rampProductionFactor ?? 1) >= 1;
}

// An explicit Blueprint is a deck-level contract, not merely another
// additive card bonus. This predicate deliberately asks whether a card
// advances that contract through identity, the requested mechanic/role,
// the requested producer/payoff package, or a verified commander edge.
// Generic structural cards can still enter through unmet role floors in
// chooseSpells; they simply stop beating connected alternatives on raw
// popularity or standalone rate once those floors are satisfied.
function advancesStrategyContract(entry, blueprint) {
  return Boolean(
    entry.directTribes?.length ||
    entry.tribalSupport?.length ||
    entry.blueprintRoleHits?.length ||
    entry.blueprintMechanicHits?.length ||
    entry.commanderConnectionSignals?.length ||
    entry.payoffMagnitudeHits ||
    entry.selfDamageSynergyHit ||
    entry.xSpellSynergyHit ||
    entry.planeswalkerCheatSynergyHit ||
    entry.roomSynergyHit ||
    blueprint.packageSignals.some((signal) =>
      entry.mechanics?.produces?.includes(signal) || entry.mechanics?.rewards?.includes(signal)),
  );
}

const STRATEGY_ROLE_TARGETS = Object.freeze({
  Aggressive: { ramp: 7, draw: 8, interaction: 8, protection: 7, recursion: 2, sweeper: 1 },
  Control: { ramp: 9, draw: 13, interaction: 14, protection: 6, recursion: 6, sweeper: 5 },
  Combo: { ramp: 10, draw: 12, interaction: 7, protection: 10, recursion: 4, sweeper: 1, selection: 10 },
  Tempo: { ramp: 7, draw: 9, interaction: 11, protection: 9, recursion: 3, sweeper: 1, selection: 5 },
  Midrange: { ramp: 9, draw: 10, interaction: 10, protection: 6, recursion: 7, sweeper: 2 },
  "Balanced midrange": { ramp: 10, draw: 10, interaction: 10, protection: 5, recursion: 4, sweeper: 2 },
});

export function roleTargets(format, strategy) {
  const commander = format === "Commander" || format === "Brawl";
  const scale = commander ? 1 : 0.55;
  const profile = STRATEGY_ROLE_TARGETS[strategyProfileFor(strategy)];
  return Object.fromEntries(Object.entries(profile).map(([role, target]) => [role, Math.round(target * scale)]));
}

// A single "ideal CMC" scored per card (below, in scoreCard) pulls every
// candidate toward the same point - which fights against a deck actually
// having a curve, since a real curve wants a spread of costs, not every
// card sitting near the average. This is a real distribution of buckets
// instead, scaled to how many spell slots this deck actually has (so a
// 100-card Commander deck gets room for a taller top end than a 60-card
// Standard deck), used as a fill-time nudge rather than replacing the
// existing per-card pull, which still gives the mana curve a baseline
// even before enough of the deck is built to make bucket targets useful.
const CURVE_SHAPES = Object.freeze({
  aggro: { "1": 0.22, "2": 0.32, "3": 0.24, "4": 0.14, "5+": 0.08 },
  control: { "1": 0.06, "2": 0.16, "3": 0.22, "4": 0.24, "5+": 0.32 },
  default: { "1": 0.12, "2": 0.24, "3": 0.26, "4": 0.20, "5+": 0.18 },
});
function curveBucket(cmc) {
  if (cmc <= 1) return "1";
  if (cmc >= 5) return "5+";
  return String(Math.round(cmc));
}
export function curveTargets(strategy, slots) {
  const profile = strategyProfileFor(strategy);
  const shape = ["Aggressive", "Tempo"].includes(profile)
    ? CURVE_SHAPES.aggro
    : profile === "Control"
      ? CURVE_SHAPES.control
      : CURVE_SHAPES.default;
  return Object.fromEntries(Object.entries(shape).map(([bucket, ratio]) => [bucket, Math.round(ratio * slots)]));
}

function chooseSpells(scored, slots, singleton, targets, blueprint, preset = [], curveGoals = {}, strategicIntent = null, traceMeta = null) {
  const selected = [];
  const selectedNames = new Set();
  const roleCounts = new Map();
  // Tracks what the deck-in-progress actually produces/rewards, as opposed
  // to synergyPotential (a static, whole-pool estimate computed before any
  // picks exist). This is what lets the fill loop below prefer a card that
  // plugs into cards that actually made the cut, not ones that merely
  // existed somewhere in the candidate pool.
  const producedSoFar = new Map();
  const rewardedSoFar = new Map();
  const cmcCounts = new Map();
  const sequenceCounts = new Map();
  const sequenceGoals = singleton
    ? { setup: 10, stabilize: 7, convert: 8, recover: 7, close: 6 }
    : { setup: 8, stabilize: 6, convert: 6, recover: 5, close: 5 };
  const copies = singleton ? 1 : 4;
  let remaining = slots;
  const traceEnabled = traceMeta?.enabled !== false;
  const traceSession = traceEnabled
    ? createConstructionTraceSession({
      planId: strategicIntent?.activePlan?.id || traceMeta?.planId || null,
      planLabel: strategicIntent?.activePlan?.label || traceMeta?.planLabel || null,
      packageIds: (strategicIntent?.packageIds || []).slice(),
      variantId: traceMeta?.variantId || null,
    })
    : null;
  // Temporal memory of recently closed needs — drives saturation-aware
  // prospective scoring without a new planning abstraction.
  const closureMemory = createDeficitClosureMemory();
  const noteClosure = (entryOrRow, delta = null) => {
    const afterState = buildLiveDeficitState(selected, strategicIntent || {}, {
      roleTargets: targets,
      curveGoals,
      sequenceGoals,
    });
    const name = entryOrRow?.card?.name || entryOrRow?.name;
    let deficitsFilled = delta?.deficitsFilled || [];
    let surplusIntroduced = delta?.surplusIntroduced || [];
    if (!delta && strategicIntent?.packages?.length) {
      deficitsFilled = [];
      surplusIntroduced = [];
      for (const packageSpec of strategicIntent.packages) {
        if (cardSatisfiesPackageCore(entryOrRow, packageSpec.id, strategicIntent)) {
          const core = afterState.packages?.[packageSpec.id]?.core;
          if (core?.deficit > 0) deficitsFilled.push(`package_core:${packageSpec.id}`);
          else surplusIntroduced.push(`package_core:${packageSpec.id}`);
        } else if (cardSatisfiesPackageSupport(entryOrRow, packageSpec.id, strategicIntent)) {
          const support = afterState.packages?.[packageSpec.id]?.support;
          if (support?.deficit > 0) deficitsFilled.push(`package_support:${packageSpec.id}`);
          else surplusIntroduced.push(`package_support:${packageSpec.id}`);
        }
      }
      for (const role of entryOrRow.roles || []) {
        if (!["ramp", "draw", "interaction", "protection", "recursion", "sweeper"].includes(role)) continue;
        const roleState = afterState.roles?.[role];
        if (!roleState || roleState.status === "untracked") continue;
        if (roleState.deficit > 0) deficitsFilled.push(`role:${role}`);
        else surplusIntroduced.push(`role:${role}`);
      }
    }
    observeDeficitClosure(closureMemory, {
      pickIndex: selected.length,
      name,
      deficitsFilled,
      surplusIntroduced,
      deficitState: afterState,
      footprintSig: delta?.footprintSignature || null,
    });
  };

  const trackMechanics = (mechanics) => {
    for (const signal of mechanics?.produces || []) producedSoFar.set(signal, (producedSoFar.get(signal) || 0) + 1);
    for (const signal of mechanics?.rewards || []) rewardedSoFar.set(signal, (rewardedSoFar.get(signal) || 0) + 1);
  };
  const trackCmc = (cmc, quantity) => {
    const bucket = curveBucket(cmc);
    cmcCounts.set(bucket, (cmcCounts.get(bucket) || 0) + quantity);
  };

  // Preset rows (e.g. a player's own imported decklist) are reserved first,
  // capped at the copy limit and remaining slots, before any competitive
  // scoring runs — this is what guarantees the imported path stays legal.
  for (const row of preset) {
    if (remaining <= 0 || selectedNames.has(normalized(row.name))) continue;
    const quantity = Math.min(copies, row.quantity, remaining);
    if (quantity <= 0) continue;
    selected.push({ ...row, quantity });
    selectedNames.add(normalized(row.name));
    const presetCredit = roleFloorCredit(oracleOf(row));
    for (const role of row.roles) roleCounts.set(role, (roleCounts.get(role) || 0) + quantity * presetCredit);
    for (const stage of row.sequenceStages || []) sequenceCounts.set(stage, (sequenceCounts.get(stage) || 0) + quantity);
    trackMechanics(row.mechanics);
    trackCmc(row.cmc, quantity);
    remaining -= quantity;
    if (traceSession) {
      recordConstructionPick(traceSession, {
        source: "preset",
        name: row.name,
        constructionPhase: "foundation",
        rawScore: row.score,
        adjustedScore: row.score,
        roles: row.roles,
        cmc: row.cmc,
        commanderConnectionSignals: row.commanderConnectionSignals,
        sequenceStages: row.sequenceStages,
        prospectiveDelta: row.prospectiveDelta || { total: 0, deficitsFilled: [], surplusIntroduced: [], positives: [], negatives: [] },
        deficitBefore: compactDeficitSnapshot({}),
        shortlistSize: 0,
        rejectedAlternatives: [],
      });
    }
    noteClosure(row, row.prospectiveDelta || null);
  }

  const addCandidate = (candidate, traceOptions = null) => {
    if (!candidate || remaining <= 0 || selectedNames.has(normalized(candidate.card.name))) return false;
    const quantity = Math.min(copies, remaining);
    selected.push({
      quantity,
      name: candidate.card.name,
      roles: candidate.roles,
      score: Number(candidate.score.toFixed(3)),
      cmc: candidate.cmc,
      directTribes: candidate.directTribes || [],
      tribalSupport: candidate.tribalSupport || [],
      identityHits: candidate.identityHits || [],
      blueprintRoleHits: candidate.blueprintRoleHits || [],
      blueprintMechanicHits: candidate.blueprintMechanicHits || [],
      commanderConnectionSignals: candidate.commanderConnectionSignals || [],
      payoffMagnitudeHits: candidate.payoffMagnitudeHits || 0,
      selfDamageSynergyHit: candidate.selfDamageSynergyHit || 0,
      xSpellSynergyHit: candidate.xSpellSynergyHit || 0,
      planeswalkerCheatSynergyHit: candidate.planeswalkerCheatSynergyHit || 0,
      roomSynergyHit: candidate.roomSynergyHit || 0,
      sequenceStages: candidate.sequenceStages || [],
      strategicSemantics: candidate.strategicSemantics,
      mechanics: candidate.mechanics,
      colorPips: candidate.colorPips,
      colorlessPips: colorlessPipsFromCost(candidate.card.manaCost || candidate.card.mana_cost || ""),
      manaCost: candidate.card.manaCost || candidate.card.mana_cost || "",
      oracleText: candidate.oracleText || candidate.card.oracleText || candidate.card.oracle_text || candidate.text || "",
      roleFloorCredit: Number.isFinite(candidate.roleFloorCredit)
        ? candidate.roleFloorCredit
        : roleFloorCredit(candidate.card.oracleText || candidate.card.oracle_text || candidate.text || ""),
      needsSnowSupport: candidate.needsSnowSupport,
      // Scryfall's produced_mana exists on any permanent, not just lands —
      // a mana rock or dork is a real color source the consistency math
      // should credit, same as a land. Empty for the vast majority of
      // nonland cards that don't produce mana at all.
      producesColors: nonlandProducedColorsOf(candidate.card),
    });
    selectedNames.add(normalized(candidate.card.name));
    const floorCredit = Number.isFinite(candidate.roleFloorCredit)
      ? candidate.roleFloorCredit
      : roleFloorCredit(candidate.card.oracleText || candidate.card.oracle_text || candidate.text || "");
    for (const role of candidate.roles) roleCounts.set(role, (roleCounts.get(role) || 0) + quantity * floorCredit);
    for (const stage of candidate.sequenceStages || []) sequenceCounts.set(stage, (sequenceCounts.get(stage) || 0) + quantity);
    trackMechanics(candidate.mechanics);
    trackCmc(candidate.cmc, quantity);
    remaining -= quantity;
    if (traceSession && traceOptions) {
      recordConstructionPick(traceSession, {
        source: traceOptions.source || "anchor",
        name: candidate.card.name,
        constructionPhase: traceOptions.constructionPhase || "foundation",
        rawScore: candidate.score,
        adjustedScore: traceOptions.adjustedScore ?? candidate.score,
        roles: candidate.roles,
        cmc: candidate.cmc,
        commanderConnectionSignals: candidate.commanderConnectionSignals,
        sequenceStages: candidate.sequenceStages,
        prospectiveDelta: traceOptions.prospectiveDelta || {
          total: 0,
          deficitsFilled: [],
          surplusIntroduced: [],
          positives: [],
          negatives: [],
        },
        deficitBefore: traceOptions.deficitBefore || compactDeficitSnapshot({}),
        shortlistSize: traceOptions.shortlistSize || 0,
        shortlistRank: traceOptions.shortlistRank ?? null,
        rejectedAlternatives: traceOptions.rejectedAlternatives || [],
      });
    }
    noteClosure(candidate, traceOptions?.prospectiveDelta || null);
    return true;
  };
  const payable = [...scored]
    .filter((entry) => isUnrestrictedConstructionCredit(entry))
    .sort((left, right) => right.score - left.score || left.card.name.localeCompare(right.card.name));
  const poolProducerSignals = new Set(scored.flatMap((entry) => entry.mechanics.produces));
  const explicitStrategyContract = blueprint.promises.length > 0;

  // Explicit identity requests are construction anchors, not flavor text.
  // Direct tribe members are reserved first, then cards that support that tribe,
  // then a meaningful floor for each requested mechanical package.
  // Cards the list cannot actually pay for (restricted {C}, artifact-only {C}
  // on a nonartifact) are not engine anchors.
  const tribeAnchorLimit = singleton ? 24 : 8;
  for (const candidate of payable.filter((entry) => (entry.directTribes || []).length).slice(0, tribeAnchorLimit)) {
    addCandidate(candidate, { source: "anchor", constructionPhase: "foundation" });
  }
  const supportLimit = singleton ? 12 : 4;
  for (const candidate of payable.filter((entry) => (entry.tribalSupport || []).length && !(entry.directTribes || []).length).slice(0, supportLimit)) {
    addCandidate(candidate, { source: "anchor", constructionPhase: "foundation" });
  }
  for (const mechanic of blueprint.requestedMechanics) {
    const limit = blueprintMechanicDefinition(mechanic).anchorLimit[singleton ? "singleton" : "constructed"];
    for (const candidate of payable.filter((entry) => (entry.blueprintMechanicHits || []).includes(mechanic)).slice(0, limit)) {
      addCandidate(candidate, { source: "anchor", constructionPhase: "foundation" });
    }
  }
  // A named theme needs both halves of an engine, not just cards carrying
  // the requested word. Reserve a small, bounded producer/payoff package
  // for each relationship the request implies before generic filling.
  const packageAnchorLimit = singleton ? 5 : 4;
  for (const signal of blueprint.packageSignals) {
    for (const candidate of payable.filter((entry) => entry.mechanics.produces.includes(signal)).slice(0, packageAnchorLimit)) {
      addCandidate(candidate, { source: "anchor", constructionPhase: "foundation" });
    }
    for (const candidate of payable.filter((entry) => entry.mechanics.rewards.includes(signal)).slice(0, packageAnchorLimit)) {
      addCandidate(candidate, { source: "anchor", constructionPhase: "foundation" });
    }
  }
  // Precise package cores (Aura ≠ enchantment, Equipment ≠ artifact, etc.)
  // are reserved from strategic intent, not from broad producer/payoff words.
  for (const packageSpec of strategicIntent?.packages || []) {
    const coreLimit = Math.min(packageSpec.coreMin, singleton ? 20 : 10);
    for (const candidate of payable.filter((entry) => cardSatisfiesPackageCore(entry, packageSpec.id, strategicIntent)).slice(0, coreLimit)) {
      addCandidate(candidate, { source: "anchor", constructionPhase: "foundation" });
    }
  }
  // The commander is itself part of the engine. Preserve a bounded core of
  // cards with a real producer/payoff edge to its verified rules text so a
  // generic staple cannot crowd every commander-specific connection out.
  const commanderAnchorLimit = singleton ? 8 : 4;
  for (const candidate of payable.filter((entry) => (entry.commanderConnectionSignals || []).length).slice(0, commanderAnchorLimit)) {
    addCandidate(candidate, { source: "anchor", constructionPhase: "foundation" });
  }
  // A candidate that actually clears the commander's own magnitude-qualified
  // trigger (mana value / power / toughness N or greater/less) is a more
  // certain connection than a same-type card that never fires it — reserve
  // it the same way, not folded into the type-only role anchor below.
  for (const candidate of payable.filter((entry) => entry.payoffMagnitudeHits).slice(0, commanderAnchorLimit)) {
    addCandidate(candidate, { source: "anchor", constructionPhase: "foundation" });
  }
  // Founder #036: a commander that is functionally immune to a symmetric
  // damage sweep (real printed indestructible) and explicitly rewards
  // being dealt damage turns a normally-bad effect into pure profit —
  // Smaug the Impenetrable survives Pestilence/Chain Reaction/Star of
  // Extinction and floods the board with Treasures while it kills every
  // other creature. This is a structural rules interaction, not a keyword
  // any card "produces" — invisible to the generic commanderConnectionSignals
  // pairing above, so it gets its own anchor reservation the same way a
  // magnitude-gate hit does.
  for (const candidate of payable.filter((entry) => entry.selfDamageSynergyHit).slice(0, commanderAnchorLimit)) {
    addCandidate(candidate, { source: "anchor", constructionPhase: "foundation" });
  }
  // Founder #046: same anchor-reservation shape as selfDamageSynergyHit
  // above — a real X-spell (Torment of Hailfire, Exsanguinate, Finale of
  // Devastation) is invisible to the generic commanderConnectionSignals
  // pairing, since "has {X} in its own printed cost" is a property of the
  // card's mana cost, not an oracle-text producer/payoff signal.
  for (const candidate of payable.filter((entry) => entry.xSpellSynergyHit).slice(0, commanderAnchorLimit)) {
    addCandidate(candidate, { source: "anchor", constructionPhase: "foundation" });
  }
  // Founder #049: same anchor-reservation shape as xSpellSynergyHit above
  // — "is this a Planeswalker card" is a property of the candidate's own
  // type line, not an oracle-text producer/payoff signal, so it's
  // invisible to the generic commanderConnectionSignals pairing.
  for (const candidate of payable.filter((entry) => entry.planeswalkerCheatSynergyHit).slice(0, commanderAnchorLimit)) {
    addCandidate(candidate, { source: "anchor", constructionPhase: "foundation" });
  }
  // Founder #050: same anchor-reservation shape as planeswalkerCheatSynergyHit
  // above — "is this a Room card" is a property of the candidate's own
  // type line, not an oracle-text producer/payoff signal.
  for (const candidate of payable.filter((entry) => entry.roomSynergyHit).slice(0, commanderAnchorLimit)) {
    addCandidate(candidate, { source: "anchor", constructionPhase: "foundation" });
  }
  const roleAnchorLimit = singleton ? 10 : 4;
  for (const role of blueprint.desiredRoles) {
    for (const candidate of payable.filter((entry) => (entry.blueprintRoleHits || []).includes(role)).slice(0, roleAnchorLimit)) {
      addCandidate(candidate, { source: "anchor", constructionPhase: "foundation" });
    }
  }

  const phaseTracker = createConstructionPhaseTracker();
  while (remaining > 0) {
    let candidate = null;
    let bestAdjusted = Number.NEGATIVE_INFINITY;
    let bestDelta = null;
    let bestPhaseInfo = null;
    let bestShortlistRank = null;
    const rejectedPool = [];
    // Prospective deficit state is recomputed once per pick so every
    // remaining candidate is judged against the same live deck, not a
    // stale snapshot from the start of construction.
    const deficitState = buildLiveDeficitState(selected, strategicIntent || {}, {
      roleTargets: targets,
      curveGoals,
      sequenceGoals,
    });
    const phaseInfo = constructionPhase(deficitState, selected, strategicIntent || {}, { spellTarget: slots });
    const footprintCache = new Map();
    const selectedFootprints = selected.map((row) => {
      const key = normalized(row.name);
      const footprint = buildJustificationFootprint(row, strategicIntent || {});
      footprintCache.set(key, footprint);
      return footprint;
    });
    // Bounded shortlist: top raw-score candidates plus every card that
    // still fills an open package/role deficit. Avoids O(pool) full delta
    // work once the deck is already mostly shaped.
    const remainingAll = scored.filter((entry) => !selectedNames.has(normalized(entry.card.name)));
    const remainingPayable = remainingAll.filter((entry) => isUnrestrictedConstructionCredit(entry));
    const remainingEntries = remainingPayable.length ? remainingPayable : remainingAll;
    const byScore = [...remainingEntries].sort((left, right) => right.score - left.score || left.card.name.localeCompare(right.card.name));
    const shortlist = new Map();
    const shortlistLimit = Math.min(56, Math.max(24, remainingEntries.length));
    for (const entry of byScore.slice(0, 32)) shortlist.set(normalized(entry.card.name), entry);
    for (const entry of remainingEntries) {
      if (shortlist.size >= shortlistLimit) break;
      const key = normalized(entry.card.name);
      if (shortlist.has(key)) continue;
      const fillsPackage = (strategicIntent?.packages || []).some((pkg) => {
        const state = deficitState.packages[pkg.id];
        if (!state) return false;
        if (state.core.deficit > 0 && cardSatisfiesPackageCore(entry, pkg.id, strategicIntent)) return true;
        if ((pkg.requireBalancedLegs || []).some((leg) => state.legs?.[leg]?.deficit > 0 && entry.strategicSemantics?.has?.(leg))) return true;
        return false;
      });
      const fillsRole = entry.roles.some((role) => (deficitState.roles[role]?.deficit || 0) > 0);
      if (fillsPackage || fillsRole || (((entry.commanderConnectionSignals || []).length || entry.payoffMagnitudeHits || entry.selfDamageSynergyHit || entry.xSpellSynergyHit || entry.planeswalkerCheatSynergyHit || entry.roomSynergyHit) && isUnrestrictedConstructionCredit(entry))) {
        shortlist.set(key, entry);
      }
    }
    if (shortlist.size < Math.min(16, remainingEntries.length)) {
      for (const entry of byScore) {
        shortlist.set(normalized(entry.card.name), entry);
        if (shortlist.size >= shortlistLimit) break;
      }
    }
    const evaluatePool = shortlist.size ? [...shortlist.values()] : remainingEntries;
    let evalIndex = 0;
    for (const entry of evaluatePool) {
      evalIndex += 1;
      const protectsUnmetDeckFunction = entry.roles.some((role) => role in targets && (roleCounts.get(role) || 0) < targets[role]);
      const inDeckSynergy = entry.mechanics.rewards.reduce((sum, signal) => sum + Math.min(4, producedSoFar.get(signal) || 0), 0)
        + entry.mechanics.produces.reduce((sum, signal) => sum + Math.min(4, rewardedSoFar.get(signal) || 0), 0);
      const requestedPackageSynergy = blueprint.packageSignals.reduce((sum, signal) => sum
        + (entry.mechanics.rewards.includes(signal) ? Math.min(4, producedSoFar.get(signal) || 0) : 0)
        + (entry.mechanics.produces.includes(signal) ? Math.min(4, rewardedSoFar.get(signal) || 0) : 0), 0);
      const orphanPayoffPenalty = entry.mechanics.rewards.reduce((sum, signal) => {
        if (producedSoFar.get(signal)) return sum;
        return sum + (poolProducerSignals.has(signal) ? 24 : 6);
      }, 0);
      const disconnectedStrategyTax = explicitStrategyContract && !protectsUnmetDeckFunction && !advancesStrategyContract(entry, blueprint) ? 35 : 0;
      const delta = prospectiveSlotDelta(selected, entry, strategicIntent || {}, {
        deficitState,
        roleTargets: targets,
        curveGoals,
        sequenceGoals,
        footprintCache,
        selectedFootprints,
        closureMemory,
        brainPolicy: strategicIntent?.brainPolicy || BRAIN_POLICY_V1_CONTROL,
        targetPowerTier: strategicIntent?.targetPowerTier ?? null,
      });
      const wiring = activeInteractionWiring(
        strategicIntent?.brainPolicy,
        strategicIntent?.targetPowerTier ?? null,
      );
      const synergy = inDeckSynergy * wiring.liveSynergyMultiplier + requestedPackageSynergy * 3;
      const castingFactor = Number.isFinite(entry.castingFactor) ? entry.castingFactor : 1;
      const fixingCredit = Number.isFinite(entry.fixingCredit) ? entry.fixingCredit : 1;
      const winconFactor = Number.isFinite(entry.winconFactor) ? entry.winconFactor : 1;
      const tokenProductionFactor = Number.isFinite(entry.tokenProductionFactor) ? entry.tokenProductionFactor : 1;
      const rampProductionFactor = Number.isFinite(entry.rampProductionFactor) ? entry.rampProductionFactor : 1;
      const phased = applyPhaseWeights({
        rawScore: entry.score,
        prospectiveDelta: delta.total * castingFactor * fixingCredit * winconFactor * tokenProductionFactor * rampProductionFactor,
        synergy,
        orphanPenalty: orphanPayoffPenalty * 0.65,
        disconnectTax: disconnectedStrategyTax,
        phase: phaseInfo,
      });
      const adjusted = phased.adjusted;
      rejectedPool.push({
        name: entry.card.name,
        rawScore: entry.score,
        adjusted,
        prospectiveTotal: delta.total,
        deficitsFilled: delta.deficitsFilled,
        rank: evalIndex,
      });
      if (adjusted > bestAdjusted || (adjusted === bestAdjusted && candidate && entry.card.name.localeCompare(candidate.card.name) < 0)) {
        candidate = entry;
        bestAdjusted = adjusted;
        bestDelta = delta;
        bestPhaseInfo = phaseInfo;
        bestShortlistRank = evalIndex;
      }
    }
    if (!candidate) break;
    const rejectedAlternatives = rejectedPool
      .filter((entry) => normalized(entry.name) !== normalized(candidate.card.name))
      .sort((left, right) => right.adjusted - left.adjusted || left.name.localeCompare(right.name));
    addCandidate(candidate, {
      source: "live_fill",
      constructionPhase: bestPhaseInfo?.phase || phaseInfo.phase,
      adjustedScore: bestAdjusted,
      prospectiveDelta: bestDelta,
      deficitBefore: compactDeficitSnapshot(deficitState),
      shortlistSize: evaluatePool.length,
      shortlistRank: bestShortlistRank,
      rejectedAlternatives,
    });
    if (bestDelta && bestPhaseInfo) {
      phaseTracker.observe(bestPhaseInfo, candidate, bestDelta);
      const last = selected[selected.length - 1];
      last.prospectiveDelta = {
        total: bestDelta.total,
        deficitsFilled: bestDelta.deficitsFilled,
        surplusIntroduced: bestDelta.surplusIntroduced,
        falseFriendRisk: bestDelta.falseFriendRisk,
        unsupportedAnchorRisk: bestDelta.unsupportedAnchorRisk,
        unsupportedHighCmcRisk: bestDelta.unsupportedHighCmcRisk,
      };
      last.constructionPhase = bestPhaseInfo.phase;
    }
  }
  if (remaining) throw new Error(`Native Forge could not fill ${remaining} spell slot(s)`);
  return {
    selected,
    roleCounts,
    constructionPhaseDiagnostics: phaseTracker.snapshot(),
    constructionTrace: sealConstructionTrace(traceSession),
  };
}

function aggregatePipTotals(rows) {
  const totals = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  for (const row of rows) {
    const pips = row.colorPips || {};
    for (const color of Object.keys(totals)) totals[color] += (pips[color] || 0) * row.quantity;
  }
  return totals;
}

// Splits `remaining` basics across colors in proportion to how many colored
// mana symbols the selected spells actually need, instead of an even share
// per color regardless of how lopsided the deck's real costs are. Falls
// back to an even split only when there's no pip signal at all (e.g. an
// all-colorless pool), matching the previous behavior exactly in that case.
export function proportionalBasicCounts(colors, pipTotals, remaining) {
  const relevant = colors.filter((color) => (pipTotals[color] || 0) > 0);
  const totalPips = relevant.reduce((sum, color) => sum + pipTotals[color], 0);
  const counts = {};
  if (!totalPips || !relevant.length) {
    for (let index = 0; index < remaining; index += 1) {
      const color = colors[index % colors.length];
      counts[color] = (counts[color] || 0) + 1;
    }
    return counts;
  }
  const shares = relevant.map((color) => ({ color, exact: (pipTotals[color] / totalPips) * remaining }));
  let assigned = 0;
  for (const { color, exact } of shares) {
    counts[color] = Math.floor(exact);
    assigned += counts[color];
  }
  // Largest-remainder method: hand out any leftover basics (from rounding
  // down) to the colors with the biggest fractional shortfall first, so the
  // total always sums to exactly `remaining` rather than drifting.
  const remainders = shares
    .map(({ color, exact }) => ({ color, fraction: exact - Math.floor(exact) }))
    .sort((a, b) => b.fraction - a.fraction || a.color.localeCompare(b.color));
  for (let index = 0; assigned < remaining; index += 1) {
    const color = remainders[index % remainders.length].color;
    counts[color] = (counts[color] || 0) + 1;
    assigned += 1;
  }
  return counts;
}

// logFactorial/logChoose/hypergeometricAtLeast/cardsSeenByTurn/
// manaConsistencyReport moved to blueprint-note-and-mana.mjs (imported and
// re-exported above) — internal callers at refineBasicSplitForConsistency,
// forgeNativeMasterwork, and forgeImportedMasterwork below use the imported
// binding unchanged.

// Aggregate pip totals capture HOW MUCH of each color a deck needs, but not
// WHEN — a double-pip 2-drop is far less forgiving than the same pips on a
// 6-drop, since by turn 6 you've seen many more cards. proportionalBasicCounts
// below splits basics purely by raw pip share, which can still under-serve a
// color whose pips concentrate in early, urgent slots even though its total
// pip count looks smaller. This uses the same real hypergeometric math the
// consistency report surfaces to nudge the split toward whichever color is
// actually struggling on its own cards' casting turns — never below 1 basic
// for a color still in the deck's identity, and bounded to a handful of
// one-land nudges rather than a full re-solve.
function refineBasicSplitForConsistency(rows, colors, spellRows, deckSize, iterations = 8) {
  if (!spellRows?.length || !Number.isFinite(deckSize)) return rows;
  for (let pass = 0; pass < iterations; pass += 1) {
    const report = manaConsistencyReport([...rows, ...spellRows], deckSize);
    if (!report.cards.length) break;
    const totals = {};
    for (const card of report.cards) {
      for (const color of card.colors) {
        if (!colors.includes(color)) continue;
        if (!totals[color]) totals[color] = { sum: 0, count: 0 };
        totals[color].sum += card.probability;
        totals[color].count += 1;
      }
    }
    const averages = Object.entries(totals).map(([color, { sum, count }]) => [color, sum / count]);
    if (averages.length < 2) break;
    averages.sort((left, right) => left[1] - right[1]);
    const [worstColor, worstAverage] = averages[0];
    const [bestColor, bestAverage] = averages[averages.length - 1];
    if (bestAverage - worstAverage < 0.08) break;
    const bestName = BASIC_BY_COLOR[bestColor];
    const bestRow = rows.find((row) => row.name === bestName);
    if (!bestRow || bestRow.quantity <= 1) break;
    bestRow.quantity -= 1;
    const worstName = BASIC_BY_COLOR[worstColor];
    const worstRow = rows.find((row) => row.name === worstName);
    if (worstRow) worstRow.quantity += 1;
    else rows.push({ quantity: 1, name: worstName, roles: ["land"], score: 0, cmc: 0, colorIdentity: [worstColor] });
  }
  return rows;
}

// Scryfall's own `produced_mana` field is the authoritative "what colors can
// this permanent actually tap for" — a direct answer, not an inference.
// `colorIdentity` is a broader rules concept (every colored symbol anywhere
// in the card's text, including a colored activated ability that costs
// mana but doesn't produce it) and can overcount a land as a source of a
// color it never actually adds. Falls back to colorIdentity for lands that
// predate this field being threaded through (imported/preset rows, test
// fixtures) so nothing regresses when the richer data isn't available.
function producedColorsOf(card) {
  const produced = [...(card.producedMana || card.colorIdentity || card.color_identity || [])];
  const oracle = String(card.oracleText || card.oracle_text || "");
  // {C} is a real mana type Scryfall sometimes omits from produced_mana on
  // lands whose headline identity is "any color." An explicit Add {C} ability
  // is still a colorless source for {C} pip math.
  if (/add \{C\}/i.test(oracle) && !produced.includes("C")) produced.push("C");
  return produced;
}

// The colorIdentity/color_identity fallback above is only sound for lands
// (where it's a reasonable proxy for what a card taps for, per the comment
// above). Applied to a nonland card it would be actively wrong — a random
// blue creature has color identity U but doesn't produce blue mana just by
// existing. Nonland rows need the direct, no-fallback signal: only real
// produced_mana counts, so a mana rock or dork is credited and everything
// else correctly contributes nothing.
function nonlandProducedColorsOf(card) {
  return card.producedMana || [];
}

// The built deck's rows carry only what construction needed (name, roles,
// cmc, colorPips) — not typeLine/oracleText — so finding unused engine
// partners needs the original fetched card objects for the deck's members,
// matched back by name against the same pool the row came from.
function unusedEnginePartnersFor(selected, input) {
  const deckNames = new Set(selected.rows.map((row) => normalized(row.name)));
  const deckCardObjects = (input.cards || []).filter((card) => deckNames.has(normalized(card.name)));
  return findUnusedEnginePartners(deckCardObjects, input.cards || []);
}

// Applied only to a land's own already-computed budgetScore (reused as-is
// from analyzeCard/scoreCard — the exact same computation the working
// multi-refill replacement path already scores lands with, see
// forgeMultiSlotRefills) when combining it into buildManaBase's ranking
// sum below. Not a second budget formula — budgetScoreFor itself is
// untouched, so spell scoring and multi-refill are unaffected. It exists
// because this sum's other dominant term, popularity, tops out at +9 for
// the single most-played land in the pool — exactly the kind of
// universally-adopted utility land "Budget conscious" is meant to push
// back on — and budgetScoreFor's log-scaled penalty for a real $20-80
// utility land (roughly -6 to -9) can't outweigh a near-max popularity
// term unscaled. This weight brings a genuinely expensive land's own
// penalty above that popularity ceiling, so budget becomes a real
// counterweight in land ranking instead of a token one.
const LAND_BUDGET_WEIGHT = 1.5;

function buildManaBase(input, landSlots, lands, variant, presetLands = [], pipTotals = {}, spellRows = []) {
  const colors = commanderColors(input).length ? commanderColors(input) : input.colors?.length ? input.colors : ["W", "U", "B", "R", "G"];
  const singleton = ["Commander", "Brawl", "Standard Brawl"].includes(input.format);
  const rows = [];

  // A player's own land rows (imported path) are reserved first, capped at
  // the remaining land slots and (for nonbasics) the copy limit, before the
  // ranked nonbasic fill runs below. Basics are exempt from the copy limit,
  // same as real deckbuilding rules.
  const landCopyLimit = singleton ? 1 : 4;
  for (const land of presetLands) {
    const used = rows.reduce((sum, row) => sum + row.quantity, 0);
    if (used >= landSlots) break;
    const existing = rows.find((row) => row.name === land.name);
    const limit = isBasicLandName(land.name) ? Infinity : landCopyLimit;
    const already = existing?.quantity || 0;
    const quantity = Math.min(land.quantity, limit - already, landSlots - used);
    if (quantity <= 0) continue;
    if (existing) existing.quantity += quantity;
    else rows.push({ quantity, name: land.name, roles: ["land"], score: 0, cmc: 0, colorIdentity: producedColorsOf(land) });
  }
  const presetLandNames = new Set(rows.map((row) => normalized(row.name)));

  // A nonbasic that fixes colors the deck is actually starved for (heavy
  // black pip demand, say) is worth more than one that happens to fix a
  // barely-played splash color — and a dual touching two in-demand colors
  // should outrank a mono land, since it does double duty. colorFit sums the
  // land's own producible colors against the pip totals and normalizes to the
  // same rough 0-4 scale as the existing untapped/fixing-text terms below, so
  // it nudges the ranking rather than swamping it.
  const totalPips = Object.values(pipTotals).reduce((sum, count) => sum + count, 0) || 1;
  const blueprint = parseNativeBlueprintIntent(input);
  const commanderTribes = commanderTribesFromOracle(allCommanders(input));
  const typalManaBase = listHasTypalDensity(spellRows, blueprint, commanderTribes);
  const colorCount = commanderColors(input).length || (input.colors || []).length || 0;
  const tribes = unique([...(blueprint.tribalTypes || []), ...commanderTribes]);
  const landFixingOptions = { typal: typalManaBase, colorCount, commanderColors: colors, tribes };
  const colorFit = (card) => {
    const produced = producedColorsOf(card);
    const raw = produced.reduce((sum, color) => sum + (pipTotals[color] || 0), 0) / totalPips;
    return raw * landColoredManaFixingFactor(card.oracleText || card.oracle_text || "", {
      ...landFixingOptions,
      producedMana: produced,
    });
  };
  const rankedLands = lands
    .filter((entry) => {
      const identity = entry.card.colorIdentity || entry.card.color_identity || [];
      return identity.every((color) => colors.includes(color)) && !presetLandNames.has(normalized(entry.card.name));
    })
    .sort((left, right) => {
      const leftText = normalized(cardText(left.card));
      const rightText = normalized(cardText(right.card));
      const leftOracle = left.card.oracleText || left.card.oracle_text || "";
      const rightOracle = right.card.oracleText || right.card.oracle_text || "";
      // Lands ride through the same edhrec-ordered fetch as spells and
      // already carry a popularityRank from it — a well-adopted dual
      // (Godless Shrine) previously ranked identically to an obscure
      // equal-color-fit land nobody plays, since only color fit and text
      // heuristics were scored. Same signal, same scale, as spell scoring.
      // popularityScore/budgetScore are reused directly from analyzeCard —
      // real preference-aware evidence, not re-derived here — see
      // LAND_BUDGET_WEIGHT above for why budgetScore is weighted going in.
      const leftProduced = producedColorsOf(left.card);
      const rightProduced = producedColorsOf(right.card);
      const leftScore = (leftText.includes("enters the battlefield tapped") ? -4 : 2) + (leftText.includes("add") ? 2 : 0) + colorFit(left.card) * 4 + landRestrictedFixingPenalty(leftOracle, { ...landFixingOptions, producedMana: leftProduced }) + left.popularityScore + left.budgetScore * LAND_BUDGET_WEIGHT + (hash(`${input.seed}|${variant.id}|${left.card.name}`) % 100) / 10000;
      const rightScore = (rightText.includes("enters the battlefield tapped") ? -4 : 2) + (rightText.includes("add") ? 2 : 0) + colorFit(right.card) * 4 + landRestrictedFixingPenalty(rightOracle, { ...landFixingOptions, producedMana: rightProduced }) + right.popularityScore + right.budgetScore * LAND_BUDGET_WEIGHT + (hash(`${input.seed}|${variant.id}|${right.card.name}`) % 100) / 10000;
      return rightScore - leftScore || left.card.name.localeCompare(right.card.name);
    });
  const nonbasicLimit = Math.min(lands.length, singleton ? Math.min(landSlots - 18, 18) : 6);

  // Land-side scarcity mirrors chooseSpells' own "could not fill N spell
  // slot(s)" signal (see buildCandidate's recovery ladder below), but for
  // lands specifically: unlike spells, a nonbasic shortfall never makes
  // the deck illegal — proportionalBasicCounts below is an infinite legal
  // fallback — so completing silently would hide a real quality tradeoff
  // a hard price/rarity filter just forced: fewer real fixing lands than
  // the format wanted, quietly replaced with plain basics the player
  // never asked for. Only fires when a hard filter is actually active:
  // the soft "Budget conscious" preference never removes a land from
  // `lands` at all (it only nudges rankedLands' order above), so it can
  // never by itself cause this — the same asymmetry the existing
  // spell-scarcity check already has against "Budget conscious" alone.
  const hardFilterActive = Number.isFinite(input.maxCardPrice) || input.commonsOnly === true;
  if (hardFilterActive && rankedLands.length < nonbasicLimit) {
    throw new Error(`could not fill ${nonbasicLimit - rankedLands.length} legal land slot(s)`);
  }

  for (const land of rankedLands.slice(0, nonbasicLimit)) {
    const used = rows.reduce((sum, row) => sum + row.quantity, 0);
    if (used >= landSlots) break;
    rows.push({ quantity: singleton ? 1 : Math.min(4, landSlots - used), name: land.card.name, roles: ["land"], score: 0, cmc: 0, colorIdentity: producedColorsOf(land.card) });
  }
  const remaining = landSlots - rows.reduce((sum, row) => sum + row.quantity, 0);
  const needsSnowManaBase = spellRows.some((row) => row.needsSnowSupport);
  const basicCounts = proportionalBasicCounts(colors, pipTotals, remaining);
  for (const [color, count] of Object.entries(basicCounts)) {
    if (!count) continue;
    // A selected snow payoff is a hard deckbuilding dependency, not flavor
    // text. Basic snow lands have the same color production and unlimited
    // basic-land copy allowance, so using them here preserves the mana math
    // while ensuring cards such as Spirit of the Aldergard are never paired
    // with a mana base that makes their rules text nonfunctional.
    const name = (needsSnowManaBase ? SNOW_BASIC_BY_COLOR : BASIC_BY_COLOR)[color] || "Wastes";
    const existing = rows.find((row) => row.name === name);
    if (existing) existing.quantity += count;
    else rows.push({ quantity: count, name, roles: ["land"], score: 0, cmc: 0, colorIdentity: [color] });
  }
  return refineBasicSplitForConsistency(rows, colors, spellRows, input.target);
}

function evaluateCandidate(rows, roleCounts, input, variant) {
  const total = rows.reduce((sum, row) => sum + row.quantity, 0);
  const lands = rows.filter((row) => row.roles.includes("land")).reduce((sum, row) => sum + row.quantity, 0);
  const nonlands = Math.max(1, total - lands);
  const averageCmc = rows.filter((row) => !row.roles.includes("land")).reduce((sum, row) => sum + row.cmc * row.quantity, 0) / nonlands;
  const targets = roleTargets(input.format, input.strategy);
  const roleCoverage = Object.entries(targets).reduce((sum, [role, target]) => sum + Math.min(1, (roleCounts.get(role) || 0) / Math.max(1, target)), 0) / Object.keys(targets).length;
  const multiRole = rows.filter((row) => row.roles.length >= 2).reduce((sum, row) => sum + row.quantity, 0) / nonlands;
  const strategyProfile = strategyProfileFor(input.strategy);
  const curveIdeal = ["Aggressive", "Tempo"].includes(strategyProfile) ? 2.5 : strategyProfile === "Control" ? 3.3 : 3;
  const curveHealth = clamp(100 - Math.abs(averageCmc - curveIdeal) * 24);
  const cohesion = clamp(roleCoverage * 70 + multiRole * 30 + variant.synergy * 4);
  const resilience = clamp((roleCounts.get("interaction") || 0) * 2.5 + (roleCounts.get("protection") || 0) * 3 + (roleCounts.get("recursion") || 0) * 2 + variant.resilience * 12);
  const score = roleCoverage * 39 + multiRole * 18 + curveHealth * 0.19 + cohesion * 0.13 + resilience * 0.11;
  return { score: Number(score.toFixed(3)), roleCoverage: Number(roleCoverage.toFixed(3)), multiRoleDensity: Number(multiRole.toFixed(3)), averageCmc: Number(averageCmc.toFixed(2)), curveHealth: Math.round(curveHealth), cohesion: Math.round(cohesion), resilience: Math.round(resilience) };
}

// A row built from an imported decklist (buildImportedCandidateAttempt's
// presetSpellRows) can reach here without directTribes/identityHits/
// blueprintRoleHits/blueprintMechanicHits ever having been set, unlike a
// row that went through analyzeCard's own computation (always a real
// array via .filter()). Reproduced directly: a real Marvel-set commander
// deck crashed here with "Cannot read properties of undefined (reading
// 'length')" during repairWeaklyJustifiedSlots. Normalizing once here
// matches the same defensive fallback already used in poolEntryToRow
// (weak-slot-forensics.mjs) and one other site in this file, just applied
// consistently instead of scattered per-callsite.
function normalizeBlueprintEntry(entry) {
  return {
    ...entry,
    directTribes: entry.directTribes || [],
    identityHits: entry.identityHits || [],
    blueprintRoleHits: entry.blueprintRoleHits || [],
    blueprintMechanicHits: entry.blueprintMechanicHits || [],
  };
}

function computeBlueprintAlignment(analysisIn, selectedIn, singleton) {
  const analysis = { ...analysisIn, spells: analysisIn.spells.map(normalizeBlueprintEntry) };
  const selected = selectedIn.map(normalizeBlueprintEntry);
  const availableTribeCards = analysis.spells.filter((entry) => entry.directTribes.length).length;
  const selectedTribeCards = selected.filter((entry) => entry.directTribes.length).length;
  const availableIdentityCards = analysis.spells.filter((entry) => entry.identityHits.length).length;
  const selectedIdentityCards = selected.filter((entry) => entry.identityHits.length).length;
  const requiredIdentityCards = analysis.context.blueprint.tribalTypes.length
    ? Math.min(availableIdentityCards, singleton ? 12 : 4)
    : 0;
  const availableRoleCoverage = Object.fromEntries(
    analysis.context.blueprint.desiredRoles.map((role) => [
      role,
      analysis.spells.filter((entry) => entry.blueprintRoleHits.includes(role)).length,
    ]),
  );
  const requestedRoleCoverage = Object.fromEntries(
    analysis.context.blueprint.desiredRoles.map((role) => [
      role,
      selected.filter((entry) => entry.blueprintRoleHits.includes(role)).reduce((sum, entry) => sum + entry.quantity, 0),
    ]),
  );
  const availableMechanicCoverage = Object.fromEntries(
    analysis.context.blueprint.requestedMechanics.map((mechanic) => [
      mechanic,
      analysis.spells.filter((entry) => entry.blueprintMechanicHits.includes(mechanic)).length,
    ]),
  );
  const requestedMechanicCoverage = Object.fromEntries(
    analysis.context.blueprint.requestedMechanics.map((mechanic) => [
      mechanic,
      selected.filter((entry) => entry.blueprintMechanicHits?.includes(mechanic)).reduce((sum, entry) => sum + entry.quantity, 0),
    ]),
  );
  const missedMechanic = analysis.context.blueprint.requestedMechanics.find((mechanic) => {
    const limit = blueprintMechanicDefinition(mechanic).anchorLimit[singleton ? "singleton" : "constructed"];
    return requestedMechanicCoverage[mechanic] < Math.min(availableMechanicCoverage[mechanic], limit);
  });
  const unsupportedMechanic = analysis.context.blueprint.requestedMechanics.find(
    (mechanic) => availableMechanicCoverage[mechanic] === 0,
  );
  const packageCoverage = Object.fromEntries(analysis.context.blueprint.packageSignals.map((signal) => {
    const producers = selected.filter((entry) => entry.mechanics?.produces?.includes(signal));
    const rewards = selected.filter((entry) => entry.mechanics?.rewards?.includes(signal));
    const connectedNames = new Set([...producers, ...rewards].map((entry) => entry.name));
    return [signal, Object.freeze({
      producers: producers.reduce((sum, entry) => sum + entry.quantity, 0),
      payoffs: rewards.reduce((sum, entry) => sum + entry.quantity, 0),
      connectedCards: connectedNames.size,
      connected: producers.length > 0 && rewards.length > 0,
    })];
  }));
  const explicitStrategyContract = analysis.context.blueprint.promises.length > 0;
  const copyCapacity = singleton ? 1 : 4;
  const selectedSpellQuantity = selected.reduce((sum, entry) => sum + entry.quantity, 0);
  const availableContractCapacity = explicitStrategyContract
    ? analysis.spells.filter((entry) => advancesStrategyContract(entry, analysis.context.blueprint)).length * copyCapacity
    : 0;
  const selectedContractCards = explicitStrategyContract
    ? selected.filter((entry) => advancesStrategyContract(entry, analysis.context.blueprint)).reduce((sum, entry) => sum + entry.quantity, 0)
    : 0;
  // Forty percent is a meaningful center of gravity, not a demand that
  // every utility spell carry theme text. The target is capped by what the
  // verified legal pool can actually supply, so thin or novel mechanics
  // remain honest best-effort requests rather than impossible gates.
  const requiredContractCards = explicitStrategyContract
    ? Math.min(availableContractCapacity, Math.ceil(selectedSpellQuantity * 0.4))
    : 0;
  const strategyDensity = explicitStrategyContract
    ? Number((selectedContractCards / Math.max(1, selectedSpellQuantity)).toFixed(3))
    : 0;
  const missedStrategyDensity = explicitStrategyContract && selectedContractCards < requiredContractCards;
  return Object.freeze({
    requested: analysis.context.blueprint.promises,
    tribalTypes: analysis.context.blueprint.tribalTypes,
    availableTribeCards,
    selectedTribeCards,
    availableIdentityCards,
    selectedIdentityCards,
    requiredIdentityCards,
    availableRoleCoverage,
    requestedRoleCoverage,
    availableMechanicCoverage,
    requestedMechanicCoverage,
    packageCoverage,
    availableContractCapacity,
    selectedContractCards,
    requiredContractCards,
    strategyDensity,
    status: !analysis.context.blueprint.promises.length
      ? "no-explicit-theme"
      : analysis.context.blueprint.tribalTypes.length && !availableIdentityCards
        ? "unsupported-identity-in-verified-pool"
        : unsupportedMechanic
          ? "unsupported-mechanic-in-verified-pool"
        : selectedIdentityCards < requiredIdentityCards || missedMechanic || missedStrategyDensity || analysis.context.blueprint.desiredRoles.some(
          (role) => requestedRoleCoverage[role] < Math.min(availableRoleCoverage[role], singleton ? 8 : 4),
        )
          ? "missed-supported-blueprint"
          : "honored-best-effort",
    boundary: analysis.context.blueprint.tribalTypes.length && !availableIdentityCards
      ? `No legal card naming or carrying the ${analysis.context.blueprint.tribalTypes.join("/")} identity was present in the verified pool; the Forge preserved legality and must say so instead of inventing support.`
      : unsupportedMechanic
        ? `No legal ${blueprintMechanicDefinition(unsupportedMechanic).label} card was present in the verified pool; the Forge preserved legality and must say so instead of pretending the requested focus was honored.`
      : analysis.context.blueprint.requestedMechanics.length
        ? `Mechanic contract found ${analysis.context.blueprint.requestedMechanics.map((mechanic) => `${availableMechanicCoverage[mechanic]} legal ${blueprintMechanicDefinition(mechanic).label} cards and selected ${requestedMechanicCoverage[mechanic]}`).join("; ")}. ${selectedContractCards}/${requiredContractCards} required strategy-contract cards were selected; legality and minimum deck function remained binding.`
        : `Blueprint contract reserved ${selectedIdentityCards}/${requiredIdentityCards} required identity cards before general optimization; legality and minimum deck function remained binding.`,
  });
}

function computeCommanderCompatibility(analysis, selected) {
  const availableConnected = analysis.spells.filter((entry) => entry.commanderConnectionSignals?.length);
  const connected = selected.filter((entry) => entry.commanderConnectionSignals?.length);
  const bySignal = Object.fromEntries(unique(connected.flatMap((entry) => entry.commanderConnectionSignals)).map((signal) => [
    signal,
    connected.filter((entry) => entry.commanderConnectionSignals.includes(signal)).reduce((sum, entry) => sum + entry.quantity, 0),
  ]));
  return Object.freeze({
    commanderProduces: analysis.context.commanderMechanics.produces,
    commanderRewards: analysis.context.commanderMechanics.rewards,
    availableConnectedCardCount: availableConnected.length,
    connectedCardCount: connected.reduce((sum, entry) => sum + entry.quantity, 0),
    connectedUniqueCards: connected.length,
    bySignal,
    status: !analysis.context.commanderMechanics.produces.length && !analysis.context.commanderMechanics.rewards.length
      ? "no-detectable-commander-package"
      : connected.length
        ? "connected"
        : "no-supported-connection-in-pool",
  });
}

// A permanent entering is itself a real ETB event, whether or not its own
// rules text says anything about entering — the same fact
// commanderConnectionSignalsFor already accounts for (see its comment on the
// Ayula case: every Bear is a true engine piece even with vanilla rules
// text). Without this, any "whenever a creature enters" payoff reads as an
// orphan payoff whenever its actual fuel is ordinary vanilla creatures
// rather than cards whose own oracle text happens to mention "enters" —
// confirmed against a synthetic 40-creature enters-payoff deck: without this
// boost the payoff was flagged orphaned and the whole package read as
// "no-detected-package" despite commanderCompatibility correctly finding 42
// genuinely connected cards.
function effectiveProducesForCoherence(entry) {
  const produces = entry.mechanics?.produces || [];
  const typeLine = String(entry.typeLine || entry.type_line || "");
  if (produces.includes("etb") || /\bInstant\b|\bSorcery\b/i.test(typeLine)) return produces;
  return unique([...produces, "etb"]);
}

function computeStrategicCoherence(analysis, selected) {
  const producerCounts = new Map();
  const payoffCounts = new Map();
  for (const signal of analysis.context.commanderMechanics.produces) producerCounts.set(signal, 1);
  for (const signal of analysis.context.commanderMechanics.rewards) payoffCounts.set(signal, 1);
  for (const entry of selected) {
    for (const signal of effectiveProducesForCoherence(entry)) producerCounts.set(signal, (producerCounts.get(signal) || 0) + entry.quantity);
    for (const signal of entry.mechanics?.rewards || []) payoffCounts.set(signal, (payoffCounts.get(signal) || 0) + entry.quantity);
  }
  const connectedSignals = unique([...producerCounts.keys()].filter((signal) => payoffCounts.has(signal)));
  const connectedNames = new Set(selected.filter((entry) =>
    connectedSignals.some((signal) => effectiveProducesForCoherence(entry).includes(signal) || entry.mechanics?.rewards?.includes(signal)))
    .map((entry) => entry.name));
  const orphanPayoffs = selected.filter((entry) =>
    entry.mechanics?.rewards?.some((signal) => !producerCounts.has(signal)))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));
  return Object.freeze({
    connectedSignals,
    connectedCardCount: connectedNames.size,
    connectionDensity: Number((connectedNames.size / Math.max(1, selected.length)).toFixed(3)),
    orphanPayoffs,
    status: connectedSignals.length ? (orphanPayoffs.length ? "connected-with-isolated-payoffs" : "connected") : "no-detected-package",
  });
}

function computeStrategicSequence(selected, singleton) {
  const goals = singleton
    ? { setup: 10, stabilize: 7, convert: 8, recover: 7, close: 6 }
    : { setup: 8, stabilize: 6, convert: 6, recover: 5, close: 5 };
  const counts = Object.fromEntries(Object.keys(goals).map((stage) => [
    stage,
    selected.filter((entry) => entry.sequenceStages?.includes(stage)).reduce((sum, entry) => sum + entry.quantity, 0),
  ]));
  const coverage = Object.fromEntries(Object.entries(goals).map(([stage, goal]) => [stage, Number(Math.min(1, counts[stage] / goal).toFixed(3))]));
  const weakestStage = Object.keys(goals).sort((left, right) => coverage[left] - coverage[right] || left.localeCompare(right))[0];
  const overall = Number((Object.values(coverage).reduce((sum, value) => sum + value, 0) / Object.keys(coverage).length).toFixed(3));
  return Object.freeze({
    stages: Object.freeze(Object.fromEntries(Object.keys(goals).map((stage) => [stage, Object.freeze({ count: counts[stage], floor: goals[stage], coverage: coverage[stage] })]))),
    weakestStage,
    overallCoverage: overall,
    status: overall === 1 ? "complete-sequence" : "sequence-needs-support",
  });
}

// A Commander deck's real land needs move with its actual curve and ramp
// density, not a flat 37% — the well-known deckbuilding guidance (Frank
// Karsten's land-count tables) scales land count up with average CMC and
// down with mana-rock/dork density, since a rock meaningfully substitutes
// for a land. Roughly +1 land per +0.5 average CMC above a 3.0 baseline.
// Ramp gets a grace allowance first: nearly every Commander deck already
// runs a handful of staple rocks (Sol Ring, signets) regardless of
// strategy, and especially a multicolor deck's ramp package is doing
// double duty fixing colors, not just accelerating — so only ramp beyond
// that normal baseline counts against land count, and even then it's
// capped well short of the curve signal it's weighed against (confirmed
// against a real 5-color, high-curve, ramp-heavy fetched pool: without
// this grace/cap, 16 ordinary ramp pieces alone swamped a real +1 curve
// signal down to the hard floor). Bounded to a handful of lands either
// side of the existing default — this nudges a well-tested baseline, it
// doesn't replace it. Scoped to singleton formats only: a 60-card
// constructed deck's 4-copy density and sideboard-backed consistency make
// the same per-card curve math a much shakier fit, so that ratio is left
// alone.
export function curveAwareLandAdjustment(samples) {
  let totalCmc = 0;
  let totalQuantity = 0;
  let rampQuantity = 0;
  for (const sample of samples) {
    const quantity = Math.max(1, Number(sample.quantity) || 1);
    totalCmc += (sample.cmc || 0) * quantity;
    totalQuantity += quantity;
    if (sample.roles?.includes("ramp")) rampQuantity += quantity;
  }
  if (!totalQuantity) return 0;
  const avgCmc = totalCmc / totalQuantity;
  const curveAdjustment = Math.round((avgCmc - 3.0) * 2);
  const rampGrace = 3;
  const rampAdjustment = Math.min(3, Math.floor(Math.max(0, rampQuantity - rampGrace) / 3));
  return clamp(curveAdjustment - rampAdjustment, -4, 4);
}

// Constructed (non-singleton) formats play best-of-3 with a real 15-card
// sideboard; Commander/Brawl/Standard Brawl are singleton and don't have
// one. Built from whatever of the same scored, verified pool didn't make
// the main deck, so it's real match-ready evidence
// adaptive-recommendation.mjs's PLANS/evaluateMatchupEvidence can act on —
// the missing half of that module's pipeline, which could always describe
// a repair but never had a real candidate.sideboard to search until now.
function sideboardFor(scored, selected, singleton) {
  if (singleton) return undefined;
  const pool = scored.map((entry) => ({ ...entry.card, score: entry.score }));
  const mainDeckNames = selected.map((row) => row.name);
  return buildSideboard(pool, mainDeckNames);
}

// The practical simulation gate: the same evidence tier the Testing Anvil
// shows a finished deck (goldfish opening-hand consistency, matchup
// archetype pressure) run against a one-slot swap *before* it's ever
// recommended, not just reported on afterward — the user's own framing:
// theoretical, then practical, before the Forge decides. Reduced trial
// count from the Testing Anvil's own defaults (300 vs. 1200-2000), since
// this runs on several candidates per decision rather than once on a
// finished deck, and a real regression shows up well within a few hundred
// trials.
const PRACTICAL_TRIALS = 300;
const PRACTICAL_SEED = 7919;
// How many theoretically-confident candidates get a practical check
// before trimming to the final recommended count — bounded so a build
// with many passing structural swaps doesn't run an unbounded number of
// simulation batches.
const PRACTICAL_POOL_CAP = 6;

// Rows built for deck construction carry only what construction needed
// (name, roles, cmc, colorPips) — not typeLine/oracleText, the same gap
// unusedEnginePartnersFor already works around by matching back to the
// original verified pool by name. Reuses that exact reconnection idiom,
// then classifies each card into the land/sweeper/removal/counter/ramp/
// draw/protection/finisher/stabilizer vocabulary the two simulators
// already model — via simulationRoleFor, not classifyNativeCard's roles,
// since that vocabulary can't distinguish counter from removal (both read
// "interaction") the way real oracle text can. Prefers colorPips/
// colorIdentity already computed onto the row during construction over
// re-deriving them, since that's the more authoritative, already-verified
// value for everything except the bare commander row.
function buildSimulationModel(rows, input) {
  const verifiedByName = createVerifiedCardIndex(input);
  return rows.map((row) => {
    const isLandRow = row.roles.includes("land");
    const verified = verifiedByName.get(normalized(row.name));
    const source = verified || createBasicLandRecord(row.name) || { name: row.name, typeLine: isLandRow ? "Land" : "", oracleText: "" };
    const card = {
      ...source,
      name: row.name,
      typeLine: source.typeLine || source.type_line || "",
      oracleText: source.oracleText || source.oracle_text || "",
    };
    return {
      quantity: Math.max(1, Number(row.quantity || 1)),
      card: row.name,
      role: simulationRoleFor(card),
      cmc: Number(row.cmc || 0),
      colorIdentity: isLandRow ? (row.colorIdentity || producedColorsOf(card)) : undefined,
      producedMana: isLandRow ? undefined : (row.producedMana || nonlandProducedColorsOf(card)),
      colorPips: isLandRow ? undefined : (row.colorPips || colorPipsFromCost(card.manaCost || card.mana_cost)),
    };
  });
}

function simulatePractical(model, strategyName) {
  return {
    goldfish: evaluateSimulationGate(model, strategyName, PRACTICAL_TRIALS, PRACTICAL_SEED),
    matrix: evaluateMatchupMatrix(model, undefined, PRACTICAL_TRIALS, PRACTICAL_SEED),
  };
}

const GOLDFISH_GATE_RANK = { unsupported: 0, "consistency-fail": 1, "goldfish-fail": 2, "goldfish-pass": 3 };
const MATRIX_GATE_RANK = { "matrix-hold": 0, "matrix-pass": 1 };
// How much a rate is allowed to fall within the *same* gate tier before
// counting as a regression on its own — a swap that stays "goldfish-pass"
// but drops from 80% keepable to 68% keepable is still a real practical
// cost a tier-only comparison would miss entirely.
const PRACTICAL_RATE_FLOOR = 0.08;

// Compares two already-run practical simulation results. Exposed
// separately from evaluatePracticalImpact below for direct testing
// against fixed, hand-built results, without paying for two full
// simulation runs per test case.
export function comparePracticalImpact(before, after) {
  const reasons = [];
  if (GOLDFISH_GATE_RANK[after.goldfish.gate] < GOLDFISH_GATE_RANK[before.goldfish.gate]) {
    reasons.push(`Opening-hand consistency regresses from ${before.goldfish.gate.replaceAll("-", " ")} to ${after.goldfish.gate.replaceAll("-", " ")}.`);
  }
  const keepableDrop = before.goldfish.expert.keepableRate - after.goldfish.expert.keepableRate;
  if (keepableDrop > PRACTICAL_RATE_FLOOR) {
    reasons.push(`Opening-hand keepable rate falls by ${(keepableDrop * 100).toFixed(1)} points.`);
  }
  const realizationDrop = before.goldfish.expert.planRealizationRate - after.goldfish.expert.planRealizationRate;
  if (realizationDrop > PRACTICAL_RATE_FLOOR) {
    reasons.push(`Plan realization rate falls by ${(realizationDrop * 100).toFixed(1)} points.`);
  }
  if (MATRIX_GATE_RANK[after.matrix.gate] < MATRIX_GATE_RANK[before.matrix.gate]) {
    reasons.push(`Matchup stress testing regresses from ${before.matrix.gate.replaceAll("-", " ")} to ${after.matrix.gate.replaceAll("-", " ")}.`);
  }
  const scenarioDrop = (before.matrix.weakest?.scenarioPassRate || 0) - (after.matrix.weakest?.scenarioPassRate || 0);
  if (scenarioDrop > PRACTICAL_RATE_FLOOR) {
    reasons.push(`Hardest stress-test pass rate falls by ${(scenarioDrop * 100).toFixed(1)} points against ${after.matrix.weakest?.opponent || "its toughest matchup"}.`);
  }
  return { passed: reasons.length === 0, reasons };
}

// Runs the actual practical simulation for a one-slot swap's resulting
// rows and compares it against an already-computed "before" baseline —
// the caller supplies `before` once and reuses it across every candidate
// swap being evaluated against the same starting deck, instead of
// re-simulating the unchanged side of the comparison every time.
export function evaluatePracticalImpact(before, afterRows, input) {
  const strategyName = strategyArchetypeFor(input.strategy);
  const after = simulatePractical(buildSimulationModel(afterRows, input), strategyName);
  return { ...comparePracticalImpact(before, after), before, after };
}

// runNativeMasterworkTournament's own contract is explicit: its weighted
// score is a deterministic structural comparison, not a predicted win rate
// — by design, it can't know that two candidates scoring within a few
// points of each other are a genuine toss-up rather than a real, decisive
// lead. That gap is exactly where a real goldfish/matchup check earns its
// cost: only the handful of candidates that close to the leader ever get
// simulated, so the common case (one clear structural leader) never pays
// for it at all.
const TOURNAMENT_PRACTICAL_MARGIN = 6;

// Ordered the same way comparePracticalImpact prioritizes evidence: gate
// tier first (a real pass/fail line), then rate, and only once a rate gap
// clears PRACTICAL_RATE_FLOOR — the same noise floor used everywhere else
// in this file — so two contenders that are practically indistinguishable
// don't get an invented winner.
export function practicalOutranks(a, b) {
  if (GOLDFISH_GATE_RANK[a.goldfish.gate] !== GOLDFISH_GATE_RANK[b.goldfish.gate]) {
    return GOLDFISH_GATE_RANK[a.goldfish.gate] > GOLDFISH_GATE_RANK[b.goldfish.gate];
  }
  if (MATRIX_GATE_RANK[a.matrix.gate] !== MATRIX_GATE_RANK[b.matrix.gate]) {
    return MATRIX_GATE_RANK[a.matrix.gate] > MATRIX_GATE_RANK[b.matrix.gate];
  }
  const keepableGap = a.goldfish.expert.keepableRate - b.goldfish.expert.keepableRate;
  if (Math.abs(keepableGap) > PRACTICAL_RATE_FLOOR) return keepableGap > 0;
  const scenarioGap = (a.matrix.weakest?.scenarioPassRate || 0) - (b.matrix.weakest?.scenarioPassRate || 0);
  return scenarioGap > PRACTICAL_RATE_FLOOR;
}

// Wraps a completed structural tournament exactly the way
// forgeImportedMasterwork already overrides one to force-preserve a
// player's own list (see `forcedTournament` below): never mutates the
// original, only ever produces a shallow-frozen copy with `selectedId`
// and the affected `results` entries reassigned, so every downstream
// consumer (reasoning, recommendationRecord, UI) reads one consistent
// tournament regardless of whether a tiebreak fired.
export function applyPracticalTiebreak(tournament, candidates, input) {
  const leaderScore = tournament.results.find((result) => result.id === tournament.selectedId)?.tournamentScore || 0;
  const contenders = tournament.results
    .filter((result) => result.verdict !== "reject" && leaderScore - result.tournamentScore <= TOURNAMENT_PRACTICAL_MARGIN)
    .map((result) => candidates.find((candidate) => candidate.id === result.id))
    .filter(Boolean);
  if (contenders.length < 2) return { tournament, practicalTiebreak: null };

  const strategyName = strategyArchetypeFor(input.strategy);
  const evaluated = contenders.map((candidate) => ({
    candidate,
    practical: simulatePractical(buildSimulationModel(candidate.rows, input), strategyName),
  }));
  const practicalWinner = evaluated.reduce((best, entry) =>
    (practicalOutranks(entry.practical, best.practical) ? entry : best));
  const contenderSummary = evaluated.map((entry) => ({
    id: entry.candidate.id,
    label: entry.candidate.label,
    goldfishGate: entry.practical.goldfish.gate,
    matrixGate: entry.practical.matrix.gate,
    keepableRate: entry.practical.goldfish.expert.keepableRate,
  }));

  const structuralWinnerId = tournament.selectedId;
  if (practicalWinner.candidate.id === structuralWinnerId) {
    return { tournament, practicalTiebreak: { triggered: true, overridden: false, contenders: contenderSummary } };
  }

  const structuralWinner = evaluated.find((entry) => entry.candidate.id === structuralWinnerId);
  const reason = `${practicalWinner.candidate.label} and ${structuralWinner.candidate.label} scored within ${TOURNAMENT_PRACTICAL_MARGIN} structural points of each other, so the Forge ran a real goldfish and matchup simulation to break the tie. ${practicalWinner.candidate.label} cleared ${practicalWinner.practical.goldfish.gate.replaceAll("-", " ")} / ${practicalWinner.practical.matrix.gate.replaceAll("-", " ")} at ${(practicalWinner.practical.goldfish.expert.keepableRate * 100).toFixed(0)}% keepable, while ${structuralWinner.candidate.label} only reached ${structuralWinner.practical.goldfish.gate.replaceAll("-", " ")} / ${structuralWinner.practical.matrix.gate.replaceAll("-", " ")} at ${(structuralWinner.practical.goldfish.expert.keepableRate * 100).toFixed(0)}% keepable.`;
  const results = tournament.results.map((result) => {
    if (result.id === practicalWinner.candidate.id) return { ...result, verdict: "advance", reason };
    if (result.id === structuralWinnerId) {
      return { ...result, verdict: result.onFrontier ? "hold" : "reject", reason: `${result.label} led on structure alone, but lost a practical simulation tiebreak to ${practicalWinner.candidate.label}.` };
    }
    return result;
  });

  return {
    tournament: Object.freeze({ ...tournament, selectedId: practicalWinner.candidate.id, results }),
    practicalTiebreak: {
      triggered: true,
      overridden: true,
      fromId: structuralWinnerId,
      fromLabel: structuralWinner.candidate.label,
      toId: practicalWinner.candidate.id,
      toLabel: practicalWinner.candidate.label,
      contenders: contenderSummary,
      reason,
    },
  };
}

// The theoretical structural gate (role coverage, curve, cohesion) only
// ever reasons about rules text — it can't say whether a swap that looks
// better on paper actually draws worse or folds to real pressure. Ranks
// the same way rankOneSlotCounterfactuals already does, then requires
// each theoretically-confident candidate to also clear a practical
// simulation check before it keeps its "confident" status — never
// promoting a candidate the theoretical gate already rejected, only ever
// demoting one it accepted.
export function rankPracticalOneSlotCounterfactuals(selected, candidates, input, options = {}) {
  const limit = options.limit || 3;
  // format/strategy/target come from `input`, same as every other call site
  // in this file derives them — callers of the practical wrappers supply
  // `options` only for the extra knobs (limit, preferredRoles,
  // matchupOpponent), not a second, easy-to-drift copy of the format.
  const theoreticalOptions = { format: input.format, strategy: input.strategy, target: input.target, strategicIntent: selected.strategicIntent || input.strategicIntent || null, ...options, limit: Math.min(PRACTICAL_POOL_CAP, limit + 3) };
  const theoretical = rankOneSlotCounterfactuals(selected, candidates, theoreticalOptions);
  if (theoretical.verdict !== "advance" || !theoretical.experiments.length) {
    return { ...theoretical, experiments: theoretical.experiments.map((experiment) => ({ ...experiment, practical: null })) };
  }

  const strategyName = strategyArchetypeFor(input.strategy);
  const before = simulatePractical(buildSimulationModel(selected.rows, input), strategyName);

  const withPractical = theoretical.experiments.map((experiment) => {
    // Only spend simulation budget on candidates the structural gate
    // already accepted — a speculative candidate's fate is already
    // decided, so a practical check would tell us nothing new about
    // whether to recommend it.
    if (!experiment.confident) return { ...experiment, practical: null };
    const practical = evaluatePracticalImpact(before, experiment.rows, input);
    return {
      ...experiment,
      practical,
      confident: experiment.confident && practical.passed,
      summary: practical.passed
        ? `${experiment.summary} Practical goldfish and matchup simulation confirm no regression.`
        : `Speculative experiment: replace ${experiment.cut} with ${experiment.add}. This cleared the Forge's structural gate but failed practical simulation testing (${practical.reasons.join(" ")}) — the modeled improvement doesn't hold up when actually drawn and played.`,
    };
  });

  withPractical.sort((left, right) => Number(right.confident) - Number(left.confident));

  return {
    ...theoretical,
    experiments: withPractical.slice(0, limit),
    boundary: "These are deterministic structural and simulated experiments, not proof of better real-game match performance.",
  };
}

// Same practical upgrade as rankPracticalOneSlotCounterfactuals, reshaped
// to runOneSlotCounterfactualLab's single-best contract: wraps the
// existing (unchanged) theoretical function, then only advances if the
// theoretical winner also clears the practical check — falling to
// "inconclusive" rather than recommending a change simulation shows
// doesn't actually hold up, the same shape the original function already
// uses when nothing clears the structural gate.
export function runPracticalOneSlotCounterfactualLab(selected, candidates, reasoning, input, options = {}) {
  // Same reasoning as rankPracticalOneSlotCounterfactuals above:
  // format/strategy/target come from `input`, not a second copy in options.
  const theoreticalOptions = { format: input.format, strategy: input.strategy, target: input.target, strategicIntent: selected.strategicIntent || input.strategicIntent || null, ...options };
  const theoretical = runOneSlotCounterfactualLab(selected, candidates, reasoning, theoreticalOptions);
  if (theoretical.verdict !== "advance") return { ...theoretical, practical: null };

  const strategyName = strategyArchetypeFor(input.strategy);
  const before = simulatePractical(buildSimulationModel(selected.rows, input), strategyName);
  const practical = evaluatePracticalImpact(before, theoretical.experiment.rows, input);
  if (practical.passed) {
    return { ...theoretical, practical, summary: `${theoretical.summary} Practical goldfish and matchup simulation confirm no regression.` };
  }
  return {
    verdict: "inconclusive",
    experimentsTested: theoretical.experimentsTested,
    experiment: theoretical.experiment,
    practical,
    summary: `Controlled experiment: replace ${theoretical.experiment.cut} with ${theoretical.experiment.add}. This cleared every structural gate but failed practical simulation testing (${practical.reasons.join(" ")}), so the selected Masterwork remains unchanged.`,
    contract: theoretical.contract,
    boundary: "This is a deterministic structural and simulated experiment, not proof of better real-game match performance.",
  };
}

function buildCandidateAttempt(input, variant, analysis) {
  const target = input.target || (["Commander", "Brawl"].includes(input.format) ? 100 : 60);
  const singleton = ["Commander", "Brawl", "Standard Brawl"].includes(input.format);
  const commanderSlots = allCommanders(input).length;
  const baselineLandSlots = singleton ? Math.round(target * 0.37) : Math.round(target * 0.4);
  const scored = analysis.spells.map((entry) => scoreCard(entry, input, variant, analysis.context));
  const lands = analysis.lands;
  const targets = roleTargets(input.format, input.strategy);
  const baselineSpellSlots = target - baselineLandSlots - commanderSlots;
  // A raw score-sorted sample skews toward whatever the scorer rewards
  // (efficiency, synergy) rather than the deck's real curve — chooseSpells'
  // own curve-shaping only kicks in once it runs. So the land estimate
  // instead measures a real preliminary selection (curve targets already
  // applied) and only re-runs selection if that changes the land count.
  const preliminary = singleton
    ? chooseSpells(scored, baselineSpellSlots, singleton, targets, analysis.context.blueprint, [], curveTargets(input.strategy, baselineSpellSlots), analysis.strategicIntent, { enabled: false })
    : null;
  const landSlots = singleton
    ? clamp(
        baselineLandSlots + curveAwareLandAdjustment(preliminary.selected),
        Math.round(target * 0.32),
        Math.round(target * 0.42),
      )
    : baselineLandSlots;
  const spellSlots = target - landSlots - commanderSlots;
  const spellResult = spellSlots === baselineSpellSlots && preliminary
    ? chooseSpells(scored, spellSlots, singleton, targets, analysis.context.blueprint, [], curveTargets(input.strategy, spellSlots), analysis.strategicIntent, {
      enabled: true,
      variantId: variant.id,
      planId: analysis.strategicIntent?.activePlan?.id || null,
      planLabel: analysis.strategicIntent?.activePlan?.label || null,
    })
    : chooseSpells(scored, spellSlots, singleton, targets, analysis.context.blueprint, [], curveTargets(input.strategy, spellSlots), analysis.strategicIntent, {
      enabled: true,
      variantId: variant.id,
      planId: analysis.strategicIntent?.activePlan?.id || null,
      planLabel: analysis.strategicIntent?.activePlan?.label || null,
    });
  const { selected, roleCounts, constructionPhaseDiagnostics, constructionTrace } = spellResult;
  const mana = buildManaBase(input, landSlots, lands, variant, [], aggregatePipTotals(selected), selected);
  const rows = [
    ...allCommanders(input).map((commander) => ({ quantity: 1, name: commander.name, roles: ["commander"], score: 100, cmc: manaValueFromCost(commander.manaCost, commander.cmc), manaCost: commander.manaCost || "" })),
    ...selected,
    ...mana,
  ];
  const evaluation = evaluateCandidate(rows, roleCounts, input, variant);
  const blueprintAlignment = computeBlueprintAlignment(analysis, selected, singleton);
  const commanderCompatibility = computeCommanderCompatibility(analysis, selected);
  const strategicCoherence = computeStrategicCoherence(analysis, selected);
  const strategicSequence = computeStrategicSequence(selected, singleton);
  return {
    id: variant.id,
    label: variant.label,
    rows,
    deckText: rows.map((row) => `${row.quantity} ${row.name}`).join("\n"),
    evaluation,
    blueprintAlignment,
    commanderCompatibility,
    strategicCoherence,
    strategicSequence,
    constructionPhaseDiagnostics,
    constructionTrace,
    strategicPlan: analysis.strategicIntent?.activePlan || null,
    score: evaluation.score,
    sideboard: sideboardFor(scored, selected, singleton),
    boundary: "Native structural candidate. Legality and simulations are hard gates; real match performance remains unproven.",
  };
}

// Recovery ladder, step 1 -> step 2: buildCandidateAttempt throws
// (chooseSpells' "could not fill N spell slot(s)") only when the eligible
// spell pool genuinely runs out — every legal, color-correct, non-excluded
// card already used. That's real card-pool scarcity, not a bug in the
// picker itself, and it is exactly the condition that used to surface to
// the player as an unrecoverable failure (or, before the server-side
// validator, a silently incomplete "success"). One retry with budget/
// commons-only preferences relaxed (relaxAnalysisPreferences) covers the
// dominant real-world cause: a narrow color identity plus a strict budget
// or commons-only preference. Format legality, color identity, the
// commander, singleton rules, and any stated hard exclusion are never
// touched by either attempt — only this one soft-preference lever bends.
function buildCandidate(input, variant, analysis) {
  let built;
  try {
    built = { ...buildCandidateAttempt(input, variant, analysis), recoveryStage: "ideal" };
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    // Same ladder, two possible triggers: chooseSpells' spell-scarcity
    // message, or buildManaBase's land-scarcity one (only thrown when a
    // hard price/rarity filter is active — see buildManaBase). Both bend
    // the exact same lever (relaxAnalysisPreferences), just checked
    // against the pool the error actually came from.
    const spellMatch = error.message.match(/could not fill (\d+) spell slot/);
    const landMatch = spellMatch ? null : error.message.match(/could not fill (\d+) legal land slot/);
    if (!spellMatch && !landMatch) throw error;
    const missingSlots = Number((spellMatch || landMatch)[1]) || null;
    const relaxed = relaxAnalysisPreferences(analysis, input);
    // If relaxing budget/commons-only preferences didn't actually grow the
    // eligible pool, the scarcity is structural (a genuinely thin color
    // identity, or a hard exclusion doing the work) — retrying would fail
    // identically. Let the original, more specific error surface instead
    // of masking it with a second identical failure.
    const grew = spellMatch ? relaxed.spells.length > analysis.spells.length : relaxed.lands.length > analysis.lands.length;
    if (!grew) throw error;
    const recovered = buildCandidateAttempt(input, variant, relaxed);
    built = {
      ...recovered,
      recoveryStage: "relaxed-preferences",
      recoveryNote: spellMatch
        ? "Budget or rarity preferences were relaxed to complete this deck. Format legality, color identity, and your commander were never affected."
        : "Budget or rarity preferences were relaxed to complete the mana base. Format legality, color identity, and your commander were never affected.",
      // Server-side observability only (worker/forge-generate.ts logs
      // this) — never surfaced to the player as-is.
      recoveryDiagnostics: spellMatch
        ? { kind: "spells", missingSlots, initialEligibleCount: analysis.spells.length, relaxedEligibleCount: relaxed.spells.length }
        : { kind: "lands", missingSlots, initialEligibleCount: analysis.lands.length, relaxedEligibleCount: relaxed.lands.length },
    };
  }
  // Phase 2B: a bounded, one-shot pass that only ever removes a card the
  // budget audit itself flagged unjustified, and only ever runs at all
  // when the player actually asked for Budget conscious — see
  // repairBudgetOffenders. Applied last, after either recovery branch
  // above, so it always sees the real, complete, legal candidate that's
  // about to be delivered. Strategic cohesion is attached immediately
  // after so later power repair and the tournament see the same contract.
  // Weak-slot cleanup is deferred until after power repair (see
  // forgeNativeMasterwork) so Casual exclusions are not undone, and so
  // power repair still sees the pre-cleanup list.
  return finalizeCandidateStrategy(input, applyBudgetRepair(input, built), analysis, {
    skipWeakSlotRepair: true,
  });
}

// Reserves the player's own imported card names first (capped at the copy
// limit and exact deck size), then fills any remaining gaps with the same
// scoring/anchoring logic buildCandidate uses. Guarantees a legal, complete
// deck by construction rather than hoping the pasted list happens to work.
function buildImportedCandidateAttempt(input, analysis) {
  const target = input.target || (["Commander", "Brawl"].includes(input.format) ? 100 : 60);
  const singleton = ["Commander", "Brawl", "Standard Brawl"].includes(input.format);
  const commanderSlots = allCommanders(input).length;
  const commanderNames = commanderNamesNormalized(input);

  const spellByName = new Map(analysis.spells.map((entry) => [normalized(entry.card.name), entry]));
  const landByName = new Map(analysis.lands.map((entry) => [normalized(entry.card.name), entry.card]));
  const presetSpellRows = [];
  const presetLandRows = [];
  for (const row of input.importedRows) {
    const key = normalized(row.name);
    if (commanderNames.has(key)) continue;
    const landCard = landByName.get(key);
    if (landCard) {
      presetLandRows.push({ quantity: row.quantity, name: landCard.name, colorIdentity: producedColorsOf(landCard) });
      continue;
    }
    if (isBasicLandName(row.name)) {
      // Basic lands are always legal and don't need to appear in the
      // verified pool — the Forge already synthesizes them on demand.
      const basicName = BASIC_LAND_NAMES.find((basic) => basic.toLowerCase() === row.name.trim().toLowerCase());
      presetLandRows.push({ quantity: row.quantity, name: basicName, colorIdentity: BASIC_COLOR_BY_NAME[basicName] || [] });
      continue;
    }
    const spellEntry = spellByName.get(key);
    if (!spellEntry) continue; // never reached in practice: the caller only ever supplies rows already verified against this same analyzed pool
    presetSpellRows.push({
      quantity: row.quantity,
      name: spellEntry.card.name,
      roles: spellEntry.roles,
      score: Number((spellEntry.roleScore || 0).toFixed(3)),
      cmc: spellEntry.cmc,
      // Matches poolEntryToRow's (weak-slot-forensics.mjs) defensive
      // fallback for the same fields - an imported row otherwise reaches
      // repair/blueprint-alignment code with these undefined instead of
      // empty, which crashes rather than just reading as "no hits".
      directTribes: spellEntry.directTribes || [],
      tribalSupport: spellEntry.tribalSupport || [],
      identityHits: spellEntry.identityHits || [],
      blueprintRoleHits: spellEntry.blueprintRoleHits || [],
      blueprintMechanicHits: spellEntry.blueprintMechanicHits || [],
      commanderConnectionSignals: spellEntry.commanderConnectionSignals || [],
      sequenceStages: spellEntry.sequenceStages || [],
      mechanics: spellEntry.mechanics,
      colorPips: spellEntry.colorPips,
      needsSnowSupport: spellEntry.needsSnowSupport,
      producesColors: nonlandProducedColorsOf(spellEntry.card),
      manaCost: spellEntry.card.manaCost || spellEntry.card.mana_cost || "",
    });
  }
  if (!presetSpellRows.length && !presetLandRows.length) {
    throw new Error("None of the submitted cards could be matched to the verified pool");
  }

  // The player's own submitted spells are the real curve/ramp signal here
  // — more precise than the candidate-pool estimate buildCandidate has to
  // fall back on, since we already know exactly what's going in the deck.
  const presetLandQuantity = presetLandRows.reduce((sum, row) => sum + row.quantity, 0);
  const presetSpellQuantity = presetSpellRows.reduce((sum, row) => sum + row.quantity, 0);
  const completeSubmittedDeck = presetLandQuantity + presetSpellQuantity === target - commanderSlots;
  const baselineLandSlots = singleton ? Math.round(target * 0.37) : Math.round(target * 0.4);
  const suggestedLandSlots = singleton
    ? clamp(baselineLandSlots + curveAwareLandAdjustment(presetSpellRows), Math.round(target * 0.32), Math.round(target * 0.42))
    : baselineLandSlots;
  // A complete list is evidence, not a sketch: retain its actual land/spell
  // split exactly. Incomplete lists may be filled, but never by allocating
  // fewer slots than the player already submitted.
  const landSlots = completeSubmittedDeck
    ? presetLandQuantity
    : Math.min(target - commanderSlots - presetSpellQuantity, Math.max(presetLandQuantity, suggestedLandSlots));

  // Preset rows are reserved unconditionally, so this variant only shapes
  // which cards fill any slots the player's list didn't already occupy.
  const variant = { id: "imported", label: "Your List", synergy: 1, resilience: 1, curve: 1 };
  const scored = analysis.spells.map((entry) => scoreCard(entry, input, variant, analysis.context));
  const spellSlots = target - landSlots - commanderSlots;
  // constructionTrace was previously left undestructured here, so the same
  // per-pick evidence buildCandidateAttempt already carries (roles,
  // deficitsFilled, nearest-alternative comparison — see construction-trace.mjs)
  // was computed by this identical chooseSpells() call and then silently
  // dropped before reaching the imported candidate. Capturing it is what lets
  // forgeImportedMasterwork explain each filled slot with real evidence
  // instead of one canned sentence for every addition.
  const { selected, roleCounts, constructionTrace } = chooseSpells(scored, spellSlots, singleton, roleTargets(input.format, input.strategy), analysis.context.blueprint, presetSpellRows, curveTargets(input.strategy, spellSlots), analysis.strategicIntent, { enabled: true, variantId: variant.id });
  const mana = buildManaBase(input, landSlots, analysis.lands, variant, presetLandRows, aggregatePipTotals(selected), selected);
  const rows = [
    ...allCommanders(input).map((commander) => ({ quantity: 1, name: commander.name, roles: ["commander"], score: 100, cmc: manaValueFromCost(commander.manaCost, commander.cmc), manaCost: commander.manaCost || "" })),
    ...selected,
    ...mana,
  ];
  const evaluation = evaluateCandidate(rows, roleCounts, input, variant);
  const blueprintAlignment = computeBlueprintAlignment(analysis, selected, singleton);
  const commanderCompatibility = computeCommanderCompatibility(analysis, selected);
  const strategicCoherence = computeStrategicCoherence(analysis, selected);
  const strategicSequence = computeStrategicSequence(selected, singleton);
  return {
    id: variant.id,
    label: variant.label,
    rows,
    deckText: rows.map((row) => `${row.quantity} ${row.name}`).join("\n"),
    evaluation,
    blueprintAlignment,
    commanderCompatibility,
    strategicCoherence,
    strategicSequence,
    constructionTrace,
    score: evaluation.score,
    sideboard: sideboardFor(scored, selected, singleton),
    boundary: "Adapted directly from your submitted list. Legality and simulations are hard gates; real match performance remains unproven.",
  };
}

// Same recovery ladder as buildCandidate above, for the Review/import
// path: the player's own submitted cards are always reserved first
// (buildImportedCandidateAttempt's preset rows), so this only ever
// relaxes the Forge's own fill choices for the gaps their list left open
// — it can never drop or substitute a card the player actually pasted in.
function buildImportedCandidate(input, analysis) {
  try {
    return finalizeCandidateStrategy(input, { ...buildImportedCandidateAttempt(input, analysis), recoveryStage: "ideal" }, analysis);
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    const spellMatch = error.message.match(/could not fill (\d+) spell slot/);
    const landMatch = spellMatch ? null : error.message.match(/could not fill (\d+) legal land slot/);
    if (!spellMatch && !landMatch) throw error;
    const missingSlots = Number((spellMatch || landMatch)[1]) || null;
    const relaxed = relaxAnalysisPreferences(analysis, input);
    const grew = spellMatch ? relaxed.spells.length > analysis.spells.length : relaxed.lands.length > analysis.lands.length;
    if (!grew) throw error;
    const recovered = buildImportedCandidateAttempt(input, relaxed);
    return finalizeCandidateStrategy(input, {
      ...recovered,
      recoveryStage: "relaxed-preferences",
      recoveryNote: spellMatch
        ? "Budget or rarity preferences were relaxed to complete this deck. Format legality, color identity, your commander, and every card you submitted were never affected."
        : "Budget or rarity preferences were relaxed to complete the mana base. Format legality, color identity, your commander, and every card you submitted were never affected.",
      recoveryDiagnostics: spellMatch
        ? { kind: "spells", missingSlots, initialEligibleCount: analysis.spells.length, relaxedEligibleCount: relaxed.spells.length }
        : { kind: "lands", missingSlots, initialEligibleCount: analysis.lands.length, relaxedEligibleCount: relaxed.lands.length },
    }, analysis);
  }
}

// Enumerates every deviation from the player's original pasted list so
// nothing is silently rewritten: cards the Forge added to fill role/size
// gaps, and copies trimmed to respect the format's copy limit or exact size.
function diffImportedChanges(importedRows, selectedRows) {
  const selectedByName = new Map(
    selectedRows.filter((row) => !row.roles.includes("commander")).map((row) => [normalized(row.name), row.quantity]),
  );
  const importedNames = new Set(importedRows.map((row) => normalized(row.name)));
  const added = selectedRows
    .filter((row) => !row.roles.includes("commander") && !importedNames.has(normalized(row.name)))
    .map((row) => row.name);
  const trimmed = importedRows
    .map((row) => ({ name: row.name, cut: Math.max(0, row.quantity - (selectedByName.get(normalized(row.name)) || 0)) }))
    .filter((entry) => entry.cut > 0);
  return { added, trimmed };
}

const IMPORTED_ADDITION_ROLE_LABELS = Object.freeze({
  ramp: "ramp", draw: "card draw", interaction: "interaction",
  protection: "protection", recursion: "recursion", sweeper: "board wipes",
});
const GENERIC_IMPORTED_ADDITION_REASON = "Added to fill a role or curve gap the submitted list left open.";

// Turns one construction-trace pick (construction-trace.mjs) into the same
// plain-language justification prospective-slot-delta.mjs's evidence already
// supports elsewhere in the Forge - never invented prose. Falls back to the
// old generic sentence only when a card genuinely carries no tracked role or
// deficit evidence (e.g. a pure filler pick with no tracked role), or when no
// trace pick exists for it at all (an older cached generation, or a preset/
// commander row that should never reach this path in practice).
function describeImportedAddition(pick) {
  if (!pick) return GENERIC_IMPORTED_ADDITION_REASON;
  const deficits = pick.prospectiveDelta?.deficitsFilled || [];
  const roleDeficit = deficits.find((tag) => tag.startsWith("role:"));
  const curveDeficit = deficits.find((tag) => tag.startsWith("curve:"));
  const roles = pick.roles || [];
  let clause;
  if (roleDeficit) {
    const role = roleDeficit.slice("role:".length);
    clause = `Added for ${IMPORTED_ADDITION_ROLE_LABELS[role] || role} — the submitted list was short there.`;
  } else if (curveDeficit) {
    clause = `Added to fill an open slot at ${curveDeficit.slice("curve:".length)} mana on the curve.`;
  } else if (roles.length) {
    clause = `Added for its ${IMPORTED_ADDITION_ROLE_LABELS[roles[0]] || roles[0]} role.`;
  } else {
    return GENERIC_IMPORTED_ADDITION_REASON;
  }
  const nearest = pick.reasonOverNearest;
  if (nearest?.nearestName && nearest.note === "higher_phased_adjusted" && nearest.adjustedMargin > 0) {
    clause += ` Edged out ${nearest.nearestName} for the slot.`;
  }
  return clause;
}

// Additive alongside diffImportedChanges' plain `added` name list (never
// replaces it - forge-generation-store.ts's client whitelist and existing
// tests both key off `added` as a bare string[]). One real reason per added
// card, sourced from the same chooseSpells() call that picked it.
function describeImportedAdditions(added, constructionTrace) {
  const pickByName = new Map((constructionTrace?.picks || []).map((pick) => [pick.name, pick]));
  return added.map((name) => ({ name, reason: describeImportedAddition(pickByName.get(name)) }));
}

// Fills explicit player-created gaps without rebuilding or silently
// rebalancing the rest of the deck. Every uncut quantity is copied into
// each package exactly as supplied. Cut names are hard-excluded from all
// additions, while the original land/nonland shape of the removed slots is
// preserved so a spell cut cannot quietly become an extra land (or vice
// versa). The three established Forge variants produce alternative packages
// from the same commission rather than a pile of independently-good cards.
export function forgeMultiSlotRefills(input, currentRows, requestedCuts) {
  if (!input?.cards?.length) throw new Error("Multi-slot refill requires a verified card pool");
  if (!Array.isArray(currentRows) || !currentRows.length || !Array.isArray(requestedCuts) || !requestedCuts.length) {
    throw new Error("Multi-slot refill requires a current deck and explicit cuts");
  }
  const evidenceByName = new Map((input.evidence || []).map((entry) => [normalized(entry.name), entry]));
  const analysis = prepareForgeAnalysis(input, evidenceByName);
  const analyzedByName = new Map(analysis.cards.map((entry) => [normalized(entry.card.name), entry]));
  const commanders = commanderNamesNormalized(input);
  const excluded = new Set(requestedCuts.map((cut) => normalized(cut.name)));
  if (requestedCuts.some((cut) => commanders.has(normalized(cut.name)))) throw new Error("The commander cannot be cut in a refill experiment");

  const cutKinds = [];
  for (const cut of requestedCuts) {
    const entry = analyzedByName.get(normalized(cut.name));
    const land = entry?.roles.includes("land") || isBasicLandName(cut.name);
    for (let count = 0; count < Number(cut.quantity || 0); count += 1) cutKinds.push(land ? "land" : "spell");
  }
  const target = input.target || currentRows.reduce((sum, row) => sum + Number(row.quantity || 0), 0) + cutKinds.length;
  const singleton = ["Commander", "Brawl", "Standard Brawl"].includes(input.format);
  const copyLimit = singleton ? 1 : 4;

  // A refill is not just an empty-slot problem. The removed cards carried
  // concrete deck functions, and often participated in one or more connected
  // systems. Track those losses explicitly so replacement merit rewards
  // restoring the player's existing plan instead of merely selecting the
  // strongest generally useful card that happens to fit the slot type.
  const cutRoleNeeds = new Map();
  for (const cut of requestedCuts) {
    const entry = analyzedByName.get(normalized(cut.name));
    for (const role of entry?.roles || []) {
      if (role === "land") continue;
      cutRoleNeeds.set(role, (cutRoleNeeds.get(role) || 0) + Number(cut.quantity || 0));
    }
  }
  const originalRows = currentRows.map((row) => ({ ...row }));
  for (const cut of requestedCuts) {
    const existing = originalRows.find((row) => normalized(row.name) === normalized(cut.name));
    if (existing) existing.quantity += Number(cut.quantity || 0);
    else originalRows.push({ name: cut.name, quantity: Number(cut.quantity || 0) });
  }

  const enrich = (row) => {
    const key = normalized(row.name);
    if (commanders.has(key)) return { ...row, roles: ["commander"], score: 100, cmc: 0 };
    const entry = analyzedByName.get(key);
    if (entry) return { ...row, roles: entry.roles, cmc: entry.cmc, colorPips: entry.colorPips, colorIdentity: entry.card.colorIdentity || entry.card.color_identity };
    if (isBasicLandName(row.name)) return { ...row, roles: ["land"], cmc: 0, colorPips: {}, colorIdentity: BASIC_COLOR_BY_NAME[row.name] || [] };
    return { ...row, roles: [], cmc: 0, colorPips: {} };
  };

  const structuralReportFor = (rows) => buildForgeStructuralAnalysis(
    buildSelectedStructuralCards({ rows: rows.map(enrich) }, input),
    { commanderName: input.commander?.name || "" },
  );
  const originalStructural = structuralReportFor(originalRows);
  const cutNames = new Set(requestedCuts.map((cut) => normalized(cut.name)));
  const affectedSystems = originalStructural.systems.systems.filter((system) =>
    system.members.some((name) => cutNames.has(normalized(name))),
  );

  const packages = VARIANTS.map((variant) => {
    const rows = currentRows.map((row) => enrich({ name: row.name, quantity: Number(row.quantity || 0) })).filter((row) => row.quantity > 0);
    const additions = [];
    const restoredRoleCounts = new Map();
    const scored = analysis.cards.map((entry) => ({ entry, scored: scoreCard(entry, input, variant, analysis.context) }));
    for (const kind of cutKinds) {
      const candidates = scored.filter(({ entry }) => {
        const key = normalized(entry.card.name);
        const isLand = entry.roles.includes("land");
        const existing = rows.find((row) => normalized(row.name) === key)?.quantity || 0;
        return !excluded.has(key) && !commanders.has(key) && (kind === "land" ? isLand : !isLand) && existing < copyLimit;
      });
      let best = null;
      for (const candidate of candidates) {
        const trial = rows.map((row) => ({ ...row }));
        const existing = trial.find((row) => normalized(row.name) === normalized(candidate.entry.card.name));
        if (existing) existing.quantity += 1;
        else trial.push(enrich({ name: candidate.entry.card.name, quantity: 1 }));
        const roleCounts = new Map();
        for (const row of trial) for (const role of row.roles || []) roleCounts.set(role, (roleCounts.get(role) || 0) + row.quantity);
        const evaluation = evaluateCandidate(trial, roleCounts, input, variant);
        const restoredRoles = candidate.entry.roles.filter((role) =>
          cutRoleNeeds.has(role) && (restoredRoleCounts.get(role) || 0) < cutRoleNeeds.get(role),
        );
        // Role restoration is intentionally material but not absolute: hard
        // legality/deck-shape gates remain upstream, while the structural
        // evaluation can still reject a superficially similar but damaging
        // replacement.
        const restorationMerit = restoredRoles.reduce((sum, role) => {
          const scarcity = 1 / Math.max(1, cutRoleNeeds.get(role));
          return sum + 180 + scarcity * 40;
        }, 0);
        const cutEntries = requestedCuts.map((cut) => analyzedByName.get(normalized(cut.name))).filter(Boolean);
        const packageMerit = cutEntries.some((cutEntry) =>
          replacementCompatible(cutEntry, candidate.entry, analysis.strategicIntent, {
            trackedRoles: TRACKED_LOAD_BEARING_ROLES,
          }).compatible,
        ) ? 220 : 0;
        const falseFriendPenalty = cutEntries.some((cutEntry) => {
          const result = replacementCompatible(cutEntry, candidate.entry, analysis.strategicIntent, {
            trackedRoles: TRACKED_LOAD_BEARING_ROLES,
          });
          return result.reasons.some((reason) => /false-friend/i.test(reason));
        }) ? 400 : 0;
        // Prefer replacements that preserve the cut card's full justification
        // footprint, not merely one overlapping role label.
        const preservationMerit = cutEntries.reduce((sum, cutEntry) => {
          const score = justificationPreservationScore(
            buildJustificationFootprint(cutEntry, analysis.strategicIntent),
            buildJustificationFootprint(candidate.entry, analysis.strategicIntent),
          );
          return sum + Math.round(score * 320);
        }, 0);
        const merit = evaluation.score * 100 + candidate.scored.score + restorationMerit + packageMerit + preservationMerit - falseFriendPenalty;
        if (!best || merit > best.merit || (merit === best.merit && candidate.entry.card.name.localeCompare(best.candidate.entry.card.name) < 0)) {
          best = { candidate, merit, evaluation };
        }
      }
      if (!best) throw new Error("The verified pool cannot fill every requested slot");
      const existing = rows.find((row) => normalized(row.name) === normalized(best.candidate.entry.card.name));
      if (existing) existing.quantity += 1;
      else rows.push(enrich({ name: best.candidate.entry.card.name, quantity: 1 }));
      const added = additions.find((row) => normalized(row.name) === normalized(best.candidate.entry.card.name));
      if (added) added.quantity += 1;
      else additions.push({ name: best.candidate.entry.card.name, quantity: 1, roles: best.candidate.entry.roles });
      for (const role of best.candidate.entry.roles) {
        if (cutRoleNeeds.has(role)) restoredRoleCounts.set(role, (restoredRoleCounts.get(role) || 0) + 1);
      }
    }
    const roleCounts = new Map();
    for (const row of rows) for (const role of row.roles || []) roleCounts.set(role, (roleCounts.get(role) || 0) + row.quantity);
    const evaluation = evaluateCandidate(rows, roleCounts, input, variant);
    const finalStructural = structuralReportFor(rows);
    const finalSystemsByName = new Map(finalStructural.systems.systems.map((system) => [system.name, system]));
    const additionNames = new Set(additions.map((row) => normalized(row.name)));
    const removedRoles = [...cutRoleNeeds.keys()].sort();
    const restoredRoles = removedRoles.filter((role) => (restoredRoleCounts.get(role) || 0) > 0);
    const exposedRoles = removedRoles.filter((role) => (restoredRoleCounts.get(role) || 0) < cutRoleNeeds.get(role));
    const repairedSystems = affectedSystems
      .filter((system) => finalSystemsByName.get(system.name)?.members.some((name) => additionNames.has(normalized(name))))
      .map((system) => system.name);
    const preservedSystems = affectedSystems
      .filter((system) => finalSystemsByName.has(system.name))
      .map((system) => system.name);
    const exposedSystems = affectedSystems
      .filter((system) => !finalSystemsByName.has(system.name))
      .map((system) => system.name);
    const roleNeedTotal = [...cutRoleNeeds.values()].reduce((sum, count) => sum + count, 0);
    const roleRestoredTotal = [...cutRoleNeeds].reduce((sum, [role, count]) => sum + Math.min(count, restoredRoleCounts.get(role) || 0), 0);
    const rolePreservation = roleNeedTotal ? roleRestoredTotal / roleNeedTotal : 1;
    const systemPreservation = affectedSystems.length ? preservedSystems.length / affectedSystems.length : 1;
    const preservationScore = Number(((rolePreservation * 0.6 + systemPreservation * 0.4) * 100).toFixed(1));
    const summaryParts = [];
    if (restoredRoles.length) summaryParts.push(`Restores ${restoredRoles.join(", ")}`);
    if (repairedSystems.length) summaryParts.push(`reconnects ${repairedSystems.join(", ")}`);
    if (exposedRoles.length || exposedSystems.length) {
      summaryParts.push(`leaves ${[...exposedRoles, ...exposedSystems].join(", ")} less supported`);
    }
    if (!summaryParts.length) summaryParts.push("Preserves the cut cards' structural footprint");
    if (rows.reduce((sum, row) => sum + row.quantity, 0) !== target) throw new Error("A refill package changed deck size");
    const packageCandidate = attachStrategicCohesion({
      id: variant.id,
      label: variant.label,
      rows,
      additions,
      evaluation,
      context: {
        preservationScore,
        rolePreservation: Number((rolePreservation * 100).toFixed(1)),
        systemPreservation: Number((systemPreservation * 100).toFixed(1)),
        removedRoles,
        restoredRoles,
        exposedRoles,
        affectedSystems: affectedSystems.map((system) => system.name),
        preservedSystems,
        repairedSystems,
        exposedSystems,
        summary: `${summaryParts.join("; ")}.`,
      },
      boundary: "Exact-size, constraint-preserving modeled refill. Real match performance remains unproven.",
    }, analysis);
    return attachSlotJustificationLedger(packageCandidate, analysis.strategicIntent, {
      budgetConstraint: input.budget === "Budget conscious",
      powerConstraint: input.targetPowerTier === "Casual",
    });
  });
  packages.sort((left, right) =>
    right.context.preservationScore - left.context.preservationScore ||
    right.evaluation.score - left.evaluation.score ||
    left.id.localeCompare(right.id),
  );
  return Object.freeze({ packages });
}

// Phase 1E: candidate-level budget observability. Deliberately not a hard
// deck-dollar cap — no product rule defines one, and inventing one here
// would go beyond what "Budget conscious" was scoped to mean (see
// relaxAnalysisPreferences and LAND_BUDGET_WEIGHT above for where budget
// actually acts, as a ranking/eligibility preference). This exists so the
// team can measure what a delivered deck actually costs and whether
// recovery had to relax budget/rarity to complete it — the same
// server-side-only observability pattern as recoveryDiagnostics.
const PRICE_BANDS_USD = [10, 25, 50];

function budgetDiagnosticsFor(candidate, input) {
  const priceByName = new Map(
    (input.cards || [])
      .filter((card) => Number.isFinite(card.priceUsd))
      .map((card) => [normalized(card.name), card.priceUsd]),
  );
  let knownDeckPriceUsd = 0;
  let knownLandPriceUsd = 0;
  let mostExpensiveCard = null;
  const cardsAbovePriceBand = Object.fromEntries(PRICE_BANDS_USD.map((band) => [band, 0]));
  for (const row of candidate.rows) {
    const price = priceByName.get(normalized(row.name));
    if (!Number.isFinite(price)) continue;
    knownDeckPriceUsd += price * row.quantity;
    if (row.roles?.includes("land")) knownLandPriceUsd += price * row.quantity;
    for (const band of PRICE_BANDS_USD) {
      if (price > band) cardsAbovePriceBand[band] += row.quantity;
    }
    if (!mostExpensiveCard || price > mostExpensiveCard.priceUsd) mostExpensiveCard = { name: row.name, priceUsd: price };
  }
  return {
    knownDeckPriceUsd: Number(knownDeckPriceUsd.toFixed(2)),
    knownLandPriceUsd: Number(knownLandPriceUsd.toFixed(2)),
    mostExpensiveCard,
    cardsAbovePriceBand,
    budgetRecoveryOccurred: candidate.recoveryStage === "relaxed-preferences",
  };
}

// The six roles roleTargets/hardGate actually track and enforce a floor
// for. Every other classifyNativeCard tag (threat, counters, artifacts,
// combat, graveyard, tokens, selection, spells, lifegain...) is real and
// meaningful elsewhere (structural analysis, tribal synergy) but carries
// no construction-time floor of its own — "threat" in particular applies
// to nearly any real creature. Treating those as valid "same slot"
// evidence let one broadly-tagged, high-scoring card get flagged as the
// substitute for a dozen unrelated offenders in the first real-generation
// audit pass. Only these six count as a load-bearing slot to protect.
const TRACKED_LOAD_BEARING_ROLES = ["ramp", "draw", "interaction", "protection", "recursion", "sweeper"];
const BUDGET_IGNORED_CONCLUSION = "budget preference is being ignored relative to a small structural gain";

// Persistent repair intent. Later stages used to rebuild their own eligible
// pools and could silently reintroduce cards an earlier stage had already
// cut (the confirmed budget-after-power leak). Every substitution audit and
// repair pass must honor this shared exclusion set instead of asking only
// "is there another legal card?"
export function collectRepairExcludedNames(candidate = {}, extraNames = []) {
  return new Set(
    unique([
      ...(candidate.budgetRepair?.removedNames || []),
      ...(candidate.powerRepair?.removedNames || []),
      ...extraNames,
    ].map((name) => normalized(name)).filter(Boolean)),
  );
}

export function repairForbidsPowerSignals(input = {}) {
  return input.targetPowerTier === "Casual";
}

function alternativeHonorsRepairIntent(entry, constraints = {}) {
  const key = normalized(entry.card?.name || entry.name || "");
  if (!key) return false;
  if (constraints.excludedNames?.has(key)) return false;
  if (constraints.forbidPowerSignals && powerSignalCategoryFor(entry.card || entry) != null) return false;
  return true;
}

function rowFromAnalyzedEntry(entry, score = entry.roleScore) {
  return {
    quantity: 1,
    name: entry.card.name,
    roles: entry.roles,
    score: Number((Number(score) || 0).toFixed(3)),
    cmc: entry.cmc,
    directTribes: entry.directTribes || [],
    tribalSupport: entry.tribalSupport || [],
    identityHits: entry.identityHits || [],
    blueprintRoleHits: entry.blueprintRoleHits || [],
    blueprintMechanicHits: entry.blueprintMechanicHits || [],
    commanderConnectionSignals: entry.commanderConnectionSignals || [],
    sequenceStages: entry.sequenceStages || [],
    strategicSemantics: entry.strategicSemantics,
    mechanics: entry.mechanics,
    colorPips: entry.colorPips,
    colorlessPips: colorlessPipsFromCost(entry.card.manaCost || entry.card.mana_cost || ""),
    manaCost: entry.card.manaCost || entry.card.mana_cost || "",
    oracleText: entry.card.oracleText || entry.card.oracle_text || entry.text || "",
    roleFloorCredit: Number.isFinite(entry.roleFloorCredit)
      ? entry.roleFloorCredit
      : roleFloorCredit(entry.card.oracleText || entry.card.oracle_text || entry.text || "", {
        colorIdentity: entry.card.colorIdentity || entry.card.color_identity || [],
        commanderColors: [],
      }),
    needsSnowSupport: entry.needsSnowSupport,
    producesColors: nonlandProducedColorsOf(entry.card),
  };
}

function refreshCandidateStrategyMetrics(candidate, analysis, input) {
  const singleton = ["Commander", "Brawl", "Standard Brawl"].includes(input.format);
  const analyzedByName = new Map(analysis.cards.map((entry) => [normalized(entry.card.name), entry]));
  // Hand-built repair fixtures and older row shapes may omit strategy
  // metadata. Rehydrate every nonland from the current analysis so
  // alignment/coherence math never crashes on missing arrays and always
  // reflects the deck after the swap batch.
  const selected = candidate.rows
    .filter((row) => !row.roles?.includes("land") && !row.roles?.includes("commander"))
    .map((row) => {
      const entry = analyzedByName.get(normalized(row.name));
      if (!entry) {
        return {
          ...row,
          directTribes: row.directTribes || [],
          tribalSupport: row.tribalSupport || [],
          identityHits: row.identityHits || [],
          blueprintRoleHits: row.blueprintRoleHits || [],
          blueprintMechanicHits: row.blueprintMechanicHits || [],
          commanderConnectionSignals: row.commanderConnectionSignals || [],
          sequenceStages: row.sequenceStages || [],
          mechanics: row.mechanics || { produces: [], rewards: [] },
        };
      }
      return {
        ...rowFromAnalyzedEntry(entry, row.score),
        quantity: row.quantity,
      };
    });
  return {
    ...candidate,
    blueprintAlignment: computeBlueprintAlignment(analysis, selected, singleton),
    commanderCompatibility: computeCommanderCompatibility(analysis, selected),
    strategicCoherence: computeStrategicCoherence(analysis, selected),
    strategicSequence: computeStrategicSequence(selected, singleton),
  };
}

function cohesionOptionsFor(analysis) {
  const intent = analysis.strategicIntent;
  return {
    availablePackageCore: Object.fromEntries((intent?.packages || []).map((pkg) => [
      pkg.id,
      analysis.spells.filter((entry) => cardSatisfiesPackageCore(entry, pkg.id, intent)).length,
    ])),
    availableCommanderConnections: analysis.spells.filter((entry) => entry.commanderConnectionSignals?.length).length,
    requireCommanderFloor: true,
  };
}

function attachStrategicCohesion(candidate, analysis) {
  const intent = analysis.strategicIntent;
  const strategicCohesionGate = validateStrategicCohesion(candidate, intent, cohesionOptionsFor(analysis));
  return {
    ...candidate,
    strategicIntent: intent,
    strategicCohesionGate,
  };
}

function repairUnsupportedBombs(input, candidate, analysis) {
  const intent = analysis.strategicIntent;
  const gate = candidate.strategicCohesionGate || validateStrategicCohesion(candidate, intent, cohesionOptionsFor(analysis));
  if (!gate.unsupportedBombs?.length) return attachStrategicCohesion(candidate, analysis);

  const bombNames = new Set(gate.unsupportedBombs.map(normalized));
  let rows = candidate.rows.map((row) => ({ ...row }));
  let freed = 0;
  rows = rows.map((row) => {
    if (!bombNames.has(normalized(row.name))) return row;
    freed += row.quantity;
    return { ...row, quantity: 0 };
  }).filter((row) => row.quantity > 0);

  const selectedNames = new Set(rows.map((row) => normalized(row.name)));
  const variant = VARIANTS.find((entry) => entry.id === candidate.id) || VARIANTS[0];
  const scored = analysis.spells
    .map((entry) => scoreCard(entry, input, variant, analysis.context))
    .filter((entry) => !selectedNames.has(normalized(entry.card.name)))
    .filter((entry) => !(entry.strategicSemantics?.has?.("bomb_cmc") || entry.cmc >= 10)
      || (entry.commanderConnectionSignals || []).length
      || (intent?.packageIds || []).some((id) => cardSatisfiesPackageCore(entry, id, intent)))
    .sort((left, right) => {
      const leftPackage = (intent?.packageIds || []).some((id) => cardSatisfiesPackageCore(left, id, intent)) ? 1 : 0;
      const rightPackage = (intent?.packageIds || []).some((id) => cardSatisfiesPackageCore(right, id, intent)) ? 1 : 0;
      return rightPackage - leftPackage || right.score - left.score || left.card.name.localeCompare(right.card.name);
    });

  for (const entry of scored) {
    if (freed <= 0) break;
    rows.push(rowFromAnalyzedEntry(entry));
    selectedNames.add(normalized(entry.card.name));
    freed -= 1;
  }
  if (freed > 0) return attachStrategicCohesion(candidate, analysis);

  const roleCounts = new Map();
  for (const row of rows) for (const role of row.roles || []) roleCounts.set(role, (roleCounts.get(role) || 0) + row.quantity);
  const evaluation = evaluateCandidate(rows, roleCounts, input, variant);
  const repaired = refreshCandidateStrategyMetrics({
    ...candidate,
    rows,
    deckText: rows.map((row) => `${row.quantity} ${row.name}`).join("\n"),
    evaluation,
    score: evaluation.score,
    cohesionBombRepair: Object.freeze({ removedNames: [...gate.unsupportedBombs] }),
  }, analysis, input);
  return attachStrategicCohesion(repaired, analysis);
}

function rowsLeakExcludedNames(rows, excludedNames) {
  if (!excludedNames?.size) return [];
  return rows.filter((row) => excludedNames.has(normalized(row.name))).map((row) => row.name);
}

// Phase 2A: budget substitution diagnostic — server-side/dev observability
// only, not wired into any player-facing report yet. The land fix (Phase 1)
// showed that a real preference term can exist and still lose every
// decision because it's summed unweighted alongside far larger structural
// terms; before guessing a SPELL_BUDGET_WEIGHT the same way, this measures
// whether that's actually what's happening for a given expensive selected
// card, or whether the price is buying something real (a role floor or
// hard gate the deck would otherwise miss). Phase 2B tunes weights from
// these numbers; this step only answers "why did this card survive?" —
// see auditBudgetSubstitutions' offenders[].conclusion.
export function auditBudgetSubstitutions(input, options = {}) {
  const priceThresholdUsd = Number.isFinite(options.priceThresholdUsd) ? options.priceThresholdUsd : 15;
  // A real built candidate is authoritative about its own variant — it
  // must never be silently audited under a different one. Auditing a
  // "cohesion" candidate as if it were "resilience" (the old unconditional
  // default) produced a real wrong verdict on a live generation: a card
  // that was genuinely role-floor-justified under its actual variant
  // looked unjustified under the wrong one. Only when no real candidate is
  // supplied (ad-hoc/investigation use) does this fall back to an explicit
  // variantId or the historical default.
  const variant = options.candidate
    ? VARIANTS.find((entry) => entry.id === options.candidate.id) || VARIANTS.find((entry) => entry.id === options.variantId) || VARIANTS[1]
    : VARIANTS.find((entry) => entry.id === options.variantId) || VARIANTS[1];
  const evidenceByName = new Map((input.evidence || []).map((entry) => [normalized(entry.name), entry]));
  const analysis = prepareForgeAnalysis(input, evidenceByName);
  const candidate = options.candidate || buildCandidateAttempt(input, variant, analysis);

  const analyzedByName = new Map(analysis.cards.map((entry) => [normalized(entry.card.name), entry]));
  const scored = analysis.cards.map((entry) => ({ entry, scored: scoreCard(entry, input, variant, analysis.context) }));
  const scoredByName = new Map(scored.map((item) => [normalized(item.entry.card.name), item]));
  // Only cards that actually passed eligibility (legality, exclusions, any
  // active hard price/rarity cap) are legitimate substitution candidates —
  // matches what real construction could have picked instead.
  const spellNames = new Set(analysis.spells.map((entry) => normalized(entry.card.name)));
  const excludedAlternativeNames = options.excludedNames instanceof Set
    ? options.excludedNames
    : new Set((options.excludedNames || []).map(normalized));
  const forbidPowerSignals = Boolean(options.forbidPowerSignals);
  const repairConstraints = { excludedNames: excludedAlternativeNames, forbidPowerSignals };

  const singleton = ["Commander", "Brawl", "Standard Brawl"].includes(input.format);
  const copyLimit = singleton ? 1 : 4;
  const targets = roleTargets(input.format, input.strategy);
  const quantityByName = new Map(candidate.rows.map((row) => [normalized(row.name), row.quantity]));
  const roleCounts = new Map();
  for (const row of candidate.rows) for (const role of row.roles || []) roleCounts.set(role, (roleCounts.get(role) || 0) + row.quantity);

  const offenders = candidate.rows.filter((row) => {
    if (row.roles.includes("land") || row.roles.includes("commander")) return false;
    const entry = analyzedByName.get(normalized(row.name));
    return entry && Number.isFinite(entry.card.priceUsd) && entry.card.priceUsd >= priceThresholdUsd;
  });

  const results = offenders.map((row) => {
    const key = normalized(row.name);
    const entry = analyzedByName.get(key);
    const own = scoredByName.get(key);
    const roles = entry.roles.filter((role) => role !== "land");
    const trackedRoles = roles.filter((role) => TRACKED_LOAD_BEARING_ROLES.includes(role));
    // A "luxury" card holds down no load-bearing role at all — it's in
    // the deck for some other reason (raw power, synergy, a pet card),
    // not to satisfy a counted construction requirement. It gets the
    // fallback rule below instead of a role-matched comparison, since
    // there is no role floor of its own to hold it to a like-for-like
    // substitute.
    const isLuxuryCard = trackedRoles.length === 0;

    const cheaperAndLegal = (candidateEntry, candidateKey) =>
      candidateKey !== key &&
      spellNames.has(candidateKey) &&
      Number.isFinite(candidateEntry.card.priceUsd) &&
      candidateEntry.card.priceUsd < entry.card.priceUsd &&
      (quantityByName.get(candidateKey) || 0) < copyLimit &&
      alternativeHonorsRepairIntent(candidateEntry, repairConstraints);

    // Tracked-role cards: only a card sharing one of ITS tracked roles is
    // a fair "same slot" comparison. Luxury cards: no role requirement —
    // the fallback rule (below) does the real filtering instead.
    const pool = scored
      .filter(({ entry: candidateEntry }) => {
        const candidateKey = normalized(candidateEntry.card.name);
        if (!cheaperAndLegal(candidateEntry, candidateKey)) return false;
        if (!(isLuxuryCard || trackedRoles.some((role) => candidateEntry.roles.includes(role)))) return false;
        return replacementCompatible(entry, candidateEntry, analysis.strategicIntent, {
          excludedNames: excludedAlternativeNames,
          forbidPowerSignals,
          powerSignalCategoryFor,
          trackedRoles: TRACKED_LOAD_BEARING_ROLES,
        }).compatible;
      })
      .map((option) => ({
        ...option,
        justification: compareReplacementJustification(entry, option.entry, analysis.strategicIntent),
      }))
      .sort((a, b) =>
        b.justification.score - a.justification.score
        || b.scored.score - a.scored.score
        || a.entry.card.name.localeCompare(b.entry.card.name));

    // Simulates cutting `row` for `option` and reports both the
    // load-bearing-floor/hard-gate impact and how the swap moves the
    // deck's own overall evaluateCandidate score (used only by the
    // luxury fallback below).
    const evaluateSwap = (option) => {
      const optionKey = normalized(option.entry.card.name);
      const trialRoleCounts = new Map(roleCounts);
      for (const role of entry.roles) trialRoleCounts.set(role, (trialRoleCounts.get(role) || 0) - 1);
      for (const role of option.entry.roles) trialRoleCounts.set(role, (trialRoleCounts.get(role) || 0) + 1);
      const alreadyPresent = quantityByName.has(optionKey);
      const trialRows = candidate.rows
        .map((r) => {
          const rKey = normalized(r.name);
          if (rKey === key) return { ...r, quantity: r.quantity - 1 };
          if (alreadyPresent && rKey === optionKey) return { ...r, quantity: r.quantity + 1 };
          return r;
        })
        .filter((r) => r.quantity > 0);
      if (!alreadyPresent) {
        trialRows.push({ name: option.entry.card.name, quantity: 1, roles: option.entry.roles, cmc: option.entry.cmc, colorPips: option.entry.colorPips });
      }
      const trialEvaluation = evaluateCandidate(trialRows, trialRoleCounts, input, variant);
      const brokenRole = Object.entries(targets).find(
        ([role, target]) => (roleCounts.get(role) || 0) >= target && (trialRoleCounts.get(role) || 0) < target,
      );
      const hardGateImpact = brokenRole
        ? `role floor: ${brokenRole[0]} would fall below ${brokenRole[1]}`
        : trialEvaluation.roleCoverage < 0.45
          ? "structural gate: role coverage would fall below the 45% floor"
          : trialEvaluation.curveHealth < 45
            ? "structural gate: curve health would fall below the 45/100 floor"
            : "none";
      return { hardGateImpact, deckScoreDelta: trialEvaluation.score - candidate.evaluation.score };
    };

    // The top 5 are evaluated up front so compatibleAlternatives can carry
    // each one's own hardGateImpact — Phase 2B's repair pass walks this
    // list directly and needs to know, per candidate, whether swapping it
    // in is safe, without re-running this whole audit for every offender
    // it repairs (see repairBudgetOffenders below: "one static snapshot").
    const topFive = pool.slice(0, 5).map((option) => ({ option, swap: evaluateSwap(option) }));
    const compatibleAlternatives = topFive.map(({ option, swap }) => ({
      name: option.entry.card.name,
      priceUsd: option.entry.card.priceUsd,
      score: Number(option.scored.score.toFixed(2)),
      justificationPreservation: option.justification?.score ?? null,
      hardGateImpact: swap.hardGateImpact,
    }));

    let best = null;
    let hardGateImpact;
    if (!pool.length) {
      hardGateImpact = isLuxuryCard
        ? "no cheaper legal alternative exists"
        : "no cheaper legal alternative shares a tracked load-bearing role";
    } else if (isLuxuryCard) {
      // Walk cheapest-restriction-free candidates best-score-first (the
      // already-evaluated top 5 first, then the rest of the pool only if
      // none of those clear the bar); the first one that doesn't cost the
      // deck's own overall score or trip a hard-gate/role-floor metric is
      // the fallback rule's answer. A luxury card has nothing of its own
      // to defend, so a candidate that WOULD regress the deck isn't a fair
      // swap and is skipped, not reported.
      const safeInTopFive = topFive.find(({ swap }) => swap.hardGateImpact === "none" && swap.deckScoreDelta >= 0);
      if (safeInTopFive) {
        best = safeInTopFive.option;
        hardGateImpact = "none";
      } else {
        for (const option of pool.slice(5)) {
          const swap = evaluateSwap(option);
          if (swap.hardGateImpact === "none" && swap.deckScoreDelta >= 0) { best = option; hardGateImpact = "none"; break; }
        }
        if (!best) hardGateImpact = "no cheaper legal alternative preserves this deck's overall score without breaking a hard-gate metric";
      }
    } else {
      best = pool[0];
      hardGateImpact = topFive[0].swap.hardGateImpact;
    }
    const alternative = best
      ? { name: best.entry.card.name, priceUsd: best.entry.card.priceUsd, score: Number(best.scored.score.toFixed(2)) }
      : null;
    const scoreDifference = best ? Number((own.scored.score - best.scored.score).toFixed(2)) : null;

    return {
      name: row.name,
      priceUsd: entry.card.priceUsd,
      roles,
      trackedRoles,
      luxuryCard: isLuxuryCard,
      score: Number(own.scored.score.toFixed(2)),
      budgetContribution: Number(entry.budgetScore.toFixed(2)),
      alternative,
      compatibleAlternatives,
      priceDifferenceUsd: alternative ? Number((entry.card.priceUsd - alternative.priceUsd).toFixed(2)) : null,
      scoreDifference,
      hardGateImpact,
      conclusion: !alternative
        ? hardGateImpact
        : hardGateImpact !== "none"
          ? "expensive inclusion has a structural justification"
          : BUDGET_IGNORED_CONCLUSION,
    };
  });

  // Budget debt: the sum of price gaps for every offender whose premium
  // wasn't earned — each one's own `alternative` already passed the
  // load-bearing-role/hard-gate-safe swap check above, so this is the
  // real, already-verified cost of the cards budget preference should
  // have declined but didn't. A "structurally justified" offender
  // contributes nothing here; its price bought something real. This is a
  // measurement, not a target embedded in scoring — Phase 2B tunes
  // against watching this number fall, not the other way around.
  const debtOffenders = results
    .filter((offender) => offender.conclusion === BUDGET_IGNORED_CONCLUSION && Number.isFinite(offender.priceDifferenceUsd))
    .sort((a, b) => b.priceDifferenceUsd - a.priceDifferenceUsd);
  const budgetDebt = {
    totalAvoidableSpendUsd: Number(debtOffenders.reduce((sum, offender) => sum + offender.priceDifferenceUsd, 0).toFixed(2)),
    topOffenders: debtOffenders.map((offender) => ({ name: offender.name, avoidableCostUsd: offender.priceDifferenceUsd })),
  };

  return {
    budget: input.budget || null,
    priceThresholdUsd,
    variantId: variant.id,
    offenderCount: results.length,
    offenders: results,
    budgetDebt,
  };
}

// Phase 2C's read-only audit, mirroring auditBudgetSubstitutions'
// architecture exactly. The bounded repair below consumes this static
// snapshot; the audit itself changes no scoring or construction. Identifies every selected
// nonland card the engine ALREADY recognizes as a power signal
// (powerSignalCategoryFor — the same detector powerTierScoreFor and the
// post-hoc evaluateCommanderPowerSignal both use), and for each asks
// whether a same-slot, strictly-lower-power (or power-neutral)
// alternative exists that doesn't cost a tracked role floor or hard
// gate — the exact same question auditBudgetSubstitutions asks about
// price, asked here about power instead.
export function auditPowerSubstitutions(input, options = {}) {
  const variant = options.candidate
    ? VARIANTS.find((entry) => entry.id === options.candidate.id) || VARIANTS.find((entry) => entry.id === options.variantId) || VARIANTS[1]
    : VARIANTS.find((entry) => entry.id === options.variantId) || VARIANTS[1];
  const evidenceByName = new Map((input.evidence || []).map((entry) => [normalized(entry.name), entry]));
  const analysis = prepareForgeAnalysis(input, evidenceByName);
  const candidate = options.candidate || buildCandidateAttempt(input, variant, analysis);

  const analyzedByName = new Map(analysis.cards.map((entry) => [normalized(entry.card.name), entry]));
  const scored = analysis.cards.map((entry) => ({ entry, scored: scoreCard(entry, input, variant, analysis.context) }));
  const scoredByName = new Map(scored.map((item) => [normalized(item.entry.card.name), item]));
  const spellNames = new Set(analysis.spells.map((entry) => normalized(entry.card.name)));
  const excludedAlternativeNames = options.excludedNames instanceof Set
    ? options.excludedNames
    : collectRepairExcludedNames(options.candidate, options.excludedNames || []);
  const repairConstraints = { excludedNames: excludedAlternativeNames, forbidPowerSignals: false };

  const singleton = ["Commander", "Brawl", "Standard Brawl"].includes(input.format);
  const copyLimit = singleton ? 1 : 4;
  const targets = roleTargets(input.format, input.strategy);
  const quantityByName = new Map(candidate.rows.map((row) => [normalized(row.name), row.quantity]));
  const roleCounts = new Map();
  for (const row of candidate.rows) for (const role of row.roles || []) roleCounts.set(role, (roleCounts.get(role) || 0) + row.quantity);

  const offenders = candidate.rows.filter((row) => {
    if (row.roles.includes("land") || row.roles.includes("commander")) return false;
    const entry = analyzedByName.get(normalized(row.name));
    return entry && powerSignalCategoryFor(entry.card) != null;
  });

  const results = offenders.map((row) => {
    const key = normalized(row.name);
    const entry = analyzedByName.get(key);
    const own = scoredByName.get(key);
    const category = powerSignalCategoryFor(entry.card);
    const ownWeight = POWER_CATEGORY_WEIGHT[category] || 1;
    const roles = entry.roles.filter((role) => role !== "land");
    const trackedRoles = roles.filter((role) => TRACKED_LOAD_BEARING_ROLES.includes(role));
    const isLuxuryCard = trackedRoles.length === 0;

    // "Lower power" = no recognized category at all, or a category whose
    // CATEGORY_WEIGHT is strictly less than this card's own — the same
    // weight table powerTierScoreFor itself reads, so "lower power" here
    // means exactly what the construction-time bias already means by it.
    const lowerPowerAndLegal = (candidateEntry, candidateKey) => {
      if (candidateKey === key || !spellNames.has(candidateKey)) return false;
      if ((quantityByName.get(candidateKey) || 0) >= copyLimit) return false;
      if (!alternativeHonorsRepairIntent(candidateEntry, repairConstraints)) return false;
      const altCategory = powerSignalCategoryFor(candidateEntry.card);
      const altWeight = altCategory ? (POWER_CATEGORY_WEIGHT[altCategory] || 1) : 0;
      return altWeight < ownWeight;
    };

    const pool = scored
      .filter(({ entry: candidateEntry }) => {
        const candidateKey = normalized(candidateEntry.card.name);
        if (!lowerPowerAndLegal(candidateEntry, candidateKey)) return false;
        if (!(isLuxuryCard || trackedRoles.some((role) => candidateEntry.roles.includes(role)))) return false;
        return replacementCompatible(entry, candidateEntry, analysis.strategicIntent, {
          excludedNames: excludedAlternativeNames,
          trackedRoles: TRACKED_LOAD_BEARING_ROLES,
        }).compatible;
      })
      .map((option) => ({
        ...option,
        justification: compareReplacementJustification(entry, option.entry, analysis.strategicIntent),
      }))
      .sort((a, b) =>
        b.justification.score - a.justification.score
        || b.scored.score - a.scored.score
        || a.entry.card.name.localeCompare(b.entry.card.name));

    const evaluateSwap = (option) => {
      const optionKey = normalized(option.entry.card.name);
      const trialRoleCounts = new Map(roleCounts);
      for (const role of entry.roles) trialRoleCounts.set(role, (trialRoleCounts.get(role) || 0) - 1);
      for (const role of option.entry.roles) trialRoleCounts.set(role, (trialRoleCounts.get(role) || 0) + 1);
      const alreadyPresent = quantityByName.has(optionKey);
      const trialRows = candidate.rows
        .map((r) => {
          const rKey = normalized(r.name);
          if (rKey === key) return { ...r, quantity: r.quantity - 1 };
          if (alreadyPresent && rKey === optionKey) return { ...r, quantity: r.quantity + 1 };
          return r;
        })
        .filter((r) => r.quantity > 0);
      if (!alreadyPresent) {
        trialRows.push({ name: option.entry.card.name, quantity: 1, roles: option.entry.roles, cmc: option.entry.cmc, colorPips: option.entry.colorPips });
      }
      const trialEvaluation = evaluateCandidate(trialRows, trialRoleCounts, input, variant);
      const brokenRole = Object.entries(targets).find(
        ([role, target]) => (roleCounts.get(role) || 0) >= target && (trialRoleCounts.get(role) || 0) < target,
      );
      const hardGateImpact = brokenRole
        ? `role floor: ${brokenRole[0]} would fall below ${brokenRole[1]}`
        : trialEvaluation.roleCoverage < 0.45
          ? "structural gate: role coverage would fall below the 45% floor"
          : trialEvaluation.curveHealth < 45
            ? "structural gate: curve health would fall below the 45/100 floor"
            : "none";
      return { hardGateImpact, deckScoreDelta: trialEvaluation.score - candidate.evaluation.score };
    };

    const evaluatedPool = pool.map((option) => ({ option, swap: evaluateSwap(option) }));
    const compatibleAlternatives = evaluatedPool.map(({ option, swap }) => ({
      name: option.entry.card.name,
      powerCategory: powerSignalCategoryFor(option.entry.card),
      score: Number(option.scored.score.toFixed(2)),
      justificationPreservation: option.justification?.score ?? null,
      hardGateImpact: swap.hardGateImpact,
    }));

    let best = null;
    let hardGateImpact;
    if (!pool.length) {
      hardGateImpact = isLuxuryCard ? "no lower-power legal alternative exists" : "no lower-power legal alternative shares a tracked load-bearing role";
    } else if (isLuxuryCard) {
      const safe = evaluatedPool.find(({ swap }) => swap.hardGateImpact === "none");
      if (safe) {
        best = safe.option;
        hardGateImpact = "none";
      } else {
        if (!best) hardGateImpact = "no lower-power legal alternative preserves this deck's hard-gate metrics";
      }
    } else {
      const safe = evaluatedPool.find(({ swap }) => swap.hardGateImpact === "none");
      best = safe?.option || pool[0];
      hardGateImpact = safe?.swap.hardGateImpact || evaluatedPool[0].swap.hardGateImpact;
    }

    const alternative = best
      ? { name: best.entry.card.name, powerCategory: powerSignalCategoryFor(best.entry.card), score: Number(best.scored.score.toFixed(2)) }
      : null;
    const scoreDifference = best ? Number((own.scored.score - best.scored.score).toFixed(2)) : null;
    const structurallyRequired = !alternative || hardGateImpact !== "none";

    return {
      name: row.name,
      priceUsd: entry.card.priceUsd ?? null,
      powerCategory: category,
      powerCategoryWeight: ownWeight,
      powerContribution: Number((entry.powerTierScore || 0).toFixed(2)),
      roles,
      trackedRoles,
      luxuryCard: isLuxuryCard,
      score: Number(own.scored.score.toFixed(2)),
      alternative,
      compatibleAlternatives,
      scoreDifference,
      hardGateImpact,
      structurallyRequired,
      conclusion: !alternative
        ? hardGateImpact
        : structurallyRequired
          ? "structurally required for Casual"
          : "unjustified high-power inclusion for Casual",
    };
  });

  return {
    targetPowerTier: input.targetPowerTier || null,
    variantId: variant.id,
    offenderCount: results.length,
    offenders: results,
  };
}

// Phase 2B: which budget preferences actually warrant a repair pass. No
// existing product rule defines a narrower Moderate-investment threshold,
// and inventing one here would be exactly the kind of guessed magic
// number this whole investigation existed to avoid — so this first
// implementation only repairs under Budget conscious. Moderate investment
// and no stated preference are both left completely untouched.
function budgetIntentWarrantsRepair(budget) {
  return budget === "Budget conscious";
}

// Locked from a real parameter sweep against the stored Ayula generation
// (2026-08-08) comparing $15/$10/$7.50/$5, same input/seed, no other
// logic changed between runs. $15 was too permissive (15 remaining
// offenders, $78.10 residual debt). $5 started attempting replacements
// with no safe alternative on 9 different cards — a sign it was pushing
// into structural choices, not just price. $7.50 was the strongest
// balance: real reduction ($61.43 residual debt vs $78.10), hard gates
// and the "cohesion" variant's own identity essentially untouched
// (roleCoverage 0.900, curveHealth 80, cohesion 97 vs baseline 92), and
// exactly one remaining $10+ card (Surrak and Goreclaw, $11.60) — the
// engine tried to replace it and correctly found no safe alternative,
// which is the behavior "Budget conscious" is actually supposed to mean:
// scrutinized and kept on its merits, not exempted by being under a line.
const BUDGET_CONSCIOUS_REPAIR_THRESHOLD_USD = 7.5;

// Phase 2B: bounded, claim-aware, one-shot budget repair — investigated
// before it was written, not guessed. An inline per-pick construction-time
// gate has no natural insertion point in chooseSpells' live deficit-
// tracking loop; separately simulating an iterate-to-convergence repair
// (re-auditing after every individual swap) against a real production
// generation showed it thrashing — cutting and re-adding the same cards
// across iterations, and cutting a genuinely role-floor-justified card
// purely because intermediate state made it look replaceable. This
// instead audits the finished candidate exactly once, decides every swap
// against that ONE static snapshot, applies them as a single batch, and
// revalidates the whole resulting candidate exactly once. It never
// iterates further. If the batch doesn't clear the deck-level hard-gate
// floors, the entire batch is discarded and the original candidate comes
// back untouched — no partial application.
//
// The one-pass contract is enforced structurally, not just by convention:
// every return path stamps budgetRepair.completed (with the exact budget
// intent and threshold it ran under) directly onto the returned
// candidate. A later call carrying that same candidate for the same
// intent/threshold short-circuits immediately — no re-audit, no second
// decision round — so genuine idempotence never depends on a future
// caller happening to invoke this only once. This is deliberately NOT
// "re-run until nothing changes": the sweep proved iterating this same
// logic to convergence thrashes and can cut a genuinely safe card. A
// second call is a no-op by construction, never a second optimization
// pass.
//
// Exported for direct testing with a hand-built candidate — the same
// {rows, evaluation, id} shape auditBudgetSubstitutions' own options.candidate
// already accepts. buildCandidate is still the only real caller in
// production (wired in as the last step of every native construction).
export function repairBudgetOffenders(input, candidate) {
  const already = candidate.budgetRepair;
  if (already?.completed && already.budgetIntent === (input.budget || null) && already.thresholdUsd === BUDGET_CONSCIOUS_REPAIR_THRESHOLD_USD) {
    return { candidate, budgetRepair: already };
  }

  const diagnostics = {
    attempted: false,
    completed: false,
    thresholdUsd: BUDGET_CONSCIOUS_REPAIR_THRESHOLD_USD,
    budgetIntent: input.budget || null,
    appliedCount: 0,
    avoidableSpendBeforeUsd: 0,
    avoidableSpendAfterUsd: 0,
    savingsAppliedUsd: 0,
    skippedNoSafeAlternative: 0,
    revertedByFinalValidation: false,
    removedNames: [],
    alternativesAddedNames: [],
  };
  if (!budgetIntentWarrantsRepair(input.budget)) {
    diagnostics.completed = true;
    return { candidate: { ...candidate, budgetRepair: diagnostics }, budgetRepair: diagnostics };
  }

  // Honor exclusions already established by a prior power repair (or any
  // caller-supplied strategic cut list). Rebuilding eligibility from the
  // raw pool without this set is the confirmed intent-leak pathway.
  const excludedNames = collectRepairExcludedNames(candidate);
  const forbidPowerSignals = repairForbidsPowerSignals(input);
  const audit = auditBudgetSubstitutions(input, {
    candidate,
    priceThresholdUsd: BUDGET_CONSCIOUS_REPAIR_THRESHOLD_USD,
    excludedNames,
    forbidPowerSignals,
  });
  diagnostics.attempted = true;
  diagnostics.avoidableSpendBeforeUsd = audit.budgetDebt.totalAvoidableSpendUsd;
  diagnostics.avoidableSpendAfterUsd = audit.budgetDebt.totalAvoidableSpendUsd;

  // Every per-offender hardGateImpact above was checked against THIS one
  // static snapshot — never against an evolving mid-batch state. Two (or
  // three) individually-safe swaps can still combine to break a role
  // floor neither one would have broken alone; the aggregate roleCoverage/
  // curveHealth gate below is too coarse to reliably catch that on its
  // own (a single role's count moving by 1-2 barely nudges a 6-role
  // average). The final revalidation re-checks every tracked role
  // specifically for exactly this reason.
  const originalRoleCounts = new Map();
  for (const row of candidate.rows) for (const role of row.roles || []) originalRoleCounts.set(role, (originalRoleCounts.get(role) || 0) + row.quantity);
  const originalTargets = roleTargets(input.format, input.strategy);

  // Deterministic order: highest avoidable spend first, stable name
  // tiebreak — exactly budgetDebt.topOffenders' own ordering.
  const offendersByName = new Map(audit.offenders.map((entry) => [entry.name, entry]));
  const orderedOffenders = audit.budgetDebt.topOffenders
    .map((entry) => offendersByName.get(entry.name))
    .sort((a, b) => b.priceDifferenceUsd - a.priceDifferenceUsd || a.name.localeCompare(b.name));

  // Only a name present here was ever eligible to be removed; only a name
  // this loop actually claims was ever eligible to be added. Every other
  // selected row — anything not in `orderedOffenders` at all — is
  // structurally protected: it can never appear on either side of a swap
  // decided by this loop.
  const claimed = new Set();
  const cut = new Set();
  const swaps = [];
  for (const offender of orderedOffenders) {
    const pick = (offender.compatibleAlternatives || []).find((alt) => {
      const key = normalized(alt.name);
      return alt.hardGateImpact === "none"
        && !claimed.has(alt.name)
        && !cut.has(alt.name)
        && !excludedNames.has(key);
    });
    if (!pick) { diagnostics.skippedNoSafeAlternative += 1; continue; }
    claimed.add(pick.name);
    cut.add(offender.name);
    swaps.push({ offenderName: offender.name, pickName: pick.name, savedUsd: offender.priceDifferenceUsd });
  }
  if (!swaps.length) {
    diagnostics.completed = true;
    return { candidate: { ...candidate, budgetRepair: diagnostics }, budgetRepair: diagnostics };
  }

  // Building each new row needs the same analyzed shape (roles/cmc/
  // colorPips) every other row already carries — an independent lookup,
  // not a reuse of anything auditBudgetSubstitutions computed internally.
  const evidenceByName = new Map((input.evidence || []).map((entry) => [normalized(entry.name), entry]));
  const analysis = prepareForgeAnalysis(input, evidenceByName);
  const analyzedByName = new Map(analysis.cards.map((entry) => [normalized(entry.card.name), entry]));

  let rows = candidate.rows.map((row) => ({ ...row }));
  for (const swap of swaps) {
    rows = rows
      .map((row) => (row.name === swap.offenderName ? { ...row, quantity: row.quantity - 1 } : row))
      .filter((row) => row.quantity > 0);
    const entry = analyzedByName.get(normalized(swap.pickName));
    rows.push(rowFromAnalyzedEntry(entry));
  }

  if (rowsLeakExcludedNames(rows, excludedNames).length) {
    diagnostics.revertedByFinalValidation = true;
    diagnostics.completed = true;
    return { candidate: { ...candidate, budgetRepair: diagnostics }, budgetRepair: diagnostics };
  }

  const roleCounts = new Map();
  for (const row of rows) for (const role of row.roles || []) roleCounts.set(role, (roleCounts.get(role) || 0) + row.quantity);
  const variant = VARIANTS.find((entry) => entry.id === candidate.id);
  const evaluation = evaluateCandidate(rows, roleCounts, input, variant);

  // The revalidation gate: the same two metrics hardGate itself enforces
  // (native-masterwork-tournament.mjs) — deck size and land share are
  // structurally unaffected, since every swap here is a 1-for-1 nonland-
  // for-nonland trade, and copy limits/singleton were already respected
  // by construction (the claimed/cut sets) — PLUS a per-role floor check
  // covering exactly the combined-effect gap the aggregate metrics alone
  // would miss: any tracked role that met its target before this batch
  // must still meet it after.
  const brokenByBatch = Object.entries(originalTargets).find(
    ([role, target]) => (originalRoleCounts.get(role) || 0) >= target && (roleCounts.get(role) || 0) < target,
  );
  if (evaluation.roleCoverage < 0.45 || evaluation.curveHealth < 45 || brokenByBatch) {
    diagnostics.revertedByFinalValidation = true;
    diagnostics.completed = true;
    return { candidate: { ...candidate, budgetRepair: diagnostics }, budgetRepair: diagnostics };
  }

  const repaired = refreshCandidateStrategyMetrics({
    ...candidate,
    rows,
    deckText: rows.map((row) => `${row.quantity} ${row.name}`).join("\n"),
    evaluation,
    score: evaluation.score,
  }, analysis, input);
  // One more audit call — against the now-repaired candidate — to report
  // the real remaining debt honestly (skipped offenders still owe it, and
  // a newly-added replacement could itself cross the threshold) rather
  // than assuming applied savings subtract cleanly. This is the one
  // revalidation the design calls for, not a second repair attempt.
  const after = auditBudgetSubstitutions(input, {
    candidate: repaired,
    priceThresholdUsd: BUDGET_CONSCIOUS_REPAIR_THRESHOLD_USD,
    excludedNames,
    forbidPowerSignals,
  });

  // Second-order pass — bounded, scoped ONLY to the cards pass one itself
  // just added. Found via a real threshold-sweep verification (The
  // Ur-Dragon, 5-color, 2026-08-21): pass one audits offenders from the
  // ORIGINAL candidate, so a replacement it picks can itself still have
  // its own cheaper same-role alternative that never gets checked (e.g.
  // Waste Not, added as pass one's pick for a cut card, itself had a
  // cheaper same-role alternative — Idol of Oblivion — with no hard-gate
  // impact). This is deliberately NOT the iterate-to-convergence design
  // already proven unsafe above: it runs exactly once, over exactly the
  // small named set `pass1AddedNames`, and never a third time. A card
  // pass one scrutinized and deliberately kept (skippedNoSafeAlternative)
  // is never reconsidered here — only pass one's own picks are eligible.
  const pass1AddedNames = new Set(swaps.map((swap) => swap.pickName));
  const secondOrderOffenders = after.offenders
    .filter((entry) => pass1AddedNames.has(entry.name))
    .sort((a, b) => b.priceDifferenceUsd - a.priceDifferenceUsd || a.name.localeCompare(b.name));

  const secondPass = {
    attempted: secondOrderOffenders.length > 0,
    appliedCount: 0,
    skippedNoSafeAlternative: 0,
    revertedByFinalValidation: false,
    removedNames: [],
    alternativesAddedNames: [],
    savingsAppliedUsd: 0,
  };
  let finalRepaired = repaired;
  let finalAudit = after;
  if (secondOrderOffenders.length) {
    // Carries pass one's claimed/cut sets forward so pass two can never
    // reclaim a name pass one already used, nor silently re-add a name
    // pass one deliberately removed.
    const claimed2 = new Set(claimed);
    const cut2 = new Set(cut);
    const swaps2 = [];
    for (const offender of secondOrderOffenders) {
      const pick = (offender.compatibleAlternatives || []).find((alt) => {
        const key = normalized(alt.name);
        return alt.hardGateImpact === "none"
          && !claimed2.has(alt.name)
          && !cut2.has(alt.name)
          && !excludedNames.has(key);
      });
      if (!pick) { secondPass.skippedNoSafeAlternative += 1; continue; }
      claimed2.add(pick.name);
      cut2.add(offender.name);
      swaps2.push({ offenderName: offender.name, pickName: pick.name, savedUsd: offender.priceDifferenceUsd });
    }
    if (swaps2.length) {
      let rowsAfterSecondPass = rows.map((row) => ({ ...row }));
      for (const swap of swaps2) {
        rowsAfterSecondPass = rowsAfterSecondPass
          .map((row) => (row.name === swap.offenderName ? { ...row, quantity: row.quantity - 1 } : row))
          .filter((row) => row.quantity > 0);
        const entry = analyzedByName.get(normalized(swap.pickName));
        rowsAfterSecondPass.push(rowFromAnalyzedEntry(entry));
      }
      const roleCounts2 = new Map();
      for (const row of rowsAfterSecondPass) for (const role of row.roles || []) roleCounts2.set(role, (roleCounts2.get(role) || 0) + row.quantity);
      const brokenByPass2 = Object.entries(originalTargets).find(
        ([role, target]) => (originalRoleCounts.get(role) || 0) >= target && (roleCounts2.get(role) || 0) < target,
      );
      const evaluation2 = evaluateCandidate(rowsAfterSecondPass, roleCounts2, input, variant);
      if (rowsLeakExcludedNames(rowsAfterSecondPass, excludedNames).length || evaluation2.roleCoverage < 0.45 || evaluation2.curveHealth < 45 || brokenByPass2) {
        secondPass.revertedByFinalValidation = true;
      } else {
        finalRepaired = refreshCandidateStrategyMetrics({
          ...candidate,
          rows: rowsAfterSecondPass,
          deckText: rowsAfterSecondPass.map((row) => `${row.quantity} ${row.name}`).join("\n"),
          evaluation: evaluation2,
          score: evaluation2.score,
        }, analysis, input);
        finalAudit = auditBudgetSubstitutions(input, {
          candidate: finalRepaired,
          priceThresholdUsd: BUDGET_CONSCIOUS_REPAIR_THRESHOLD_USD,
          excludedNames,
          forbidPowerSignals,
        });
        secondPass.appliedCount = swaps2.length;
        secondPass.removedNames = swaps2.map((swap) => swap.offenderName);
        secondPass.alternativesAddedNames = swaps2.map((swap) => swap.pickName);
        secondPass.savingsAppliedUsd = Number(swaps2.reduce((sum, swap) => sum + swap.savedUsd, 0).toFixed(2));
      }
    }
  }

  diagnostics.appliedCount = swaps.length + secondPass.appliedCount;
  diagnostics.removedNames = [...swaps.map((swap) => swap.offenderName), ...secondPass.removedNames];
  diagnostics.alternativesAddedNames = [...swaps.map((swap) => swap.pickName), ...secondPass.alternativesAddedNames];
  diagnostics.savingsAppliedUsd = Number((swaps.reduce((sum, swap) => sum + swap.savedUsd, 0) + secondPass.savingsAppliedUsd).toFixed(2));
  diagnostics.avoidableSpendAfterUsd = finalAudit.budgetDebt.totalAvoidableSpendUsd;
  diagnostics.completed = true;
  diagnostics.secondPass = secondPass;
  // Short, player-facing prose — the same shape recoveryNote already uses
  // for Phase 1's land-budget disclosure. Generated once here, server-side,
  // rather than templated client-side from the raw counts, so there is one
  // source of truth for the sentence regardless of caller.
  diagnostics.note = `${diagnostics.appliedCount} card${diagnostics.appliedCount === 1 ? "" : "s"} over your budget preference ${diagnostics.appliedCount === 1 ? "was" : "were"} swapped for a same-role alternative that fits, saving $${diagnostics.savingsAppliedUsd.toFixed(2)}.`;

  const finished = refreshLedgerAfterRepair(input, { ...finalRepaired, budgetRepair: diagnostics }, analysis);
  return { candidate: finished, budgetRepair: diagnostics };
}

function applyBudgetRepair(input, built) {
  return repairBudgetOffenders(input, built).candidate;
}

function refreshLedgerAfterRepair(input, candidate, analysis) {
  const withCohesion = attachStrategicCohesion(candidate, analysis);
  return attachSlotJustificationLedger(withCohesion, analysis.strategicIntent, {
    budgetConstraint: input.budget === "Budget conscious",
    powerConstraint: input.targetPowerTier === "Casual",
  });
}

function finalizeCandidateStrategy(input, candidate, analysis, options = {}) {
  const withCohesion = attachStrategicCohesion(candidate, analysis);
  const repaired = repairUnsupportedBombs(input, withCohesion, analysis);
  const optimized = optimizePackagePlan(repaired, analysis, input, {
    powerSignalCategoryFor,
    cohesionOptions: cohesionOptionsFor(analysis),
  });
  const refreshed = optimized.packagePlanOptimization?.applied
    ? refreshCandidateStrategyMetrics(optimized, analysis, input)
    : optimized;
  const audited = attachStrategicCohesion(refreshed, analysis);
  const withLedger = attachSlotJustificationLedger(audited, analysis.strategicIntent, {
    budgetConstraint: input.budget === "Budget conscious",
    powerConstraint: input.targetPowerTier === "Casual",
  });
  // Forensic baseline showed ~90% of weakly justified final slots were
  // avoidable live-fill survivors with superior eligible alternatives.
  // Bounded cleanup only — never raw-score-only, capped attempts.
  // Skipped on the pre-power-repair finalize so Casual power exclusions
  // remain authoritative and cleanup runs once on the delivered list.
  const cleaned = options.skipWeakSlotRepair
    ? {
      ...withLedger,
      weakSlotRepair: Object.freeze({
        version: "weak-slot-forensics-v1",
        attempted: false,
        applied: false,
        appliedCount: 0,
        considered: 0,
        skippedPackageCritical: 0,
        skippedNoAlternative: 0,
        skippedFloorRegression: 0,
        skippedBlueprintRegression: 0,
        skippedForbiddenAdd: 0,
        removedNames: Object.freeze([]),
        alternativesAddedNames: Object.freeze([]),
        swaps: Object.freeze([]),
        runtimeMs: 0,
        reason: "deferred-until-after-power-repair",
      }),
    }
    : repairWeaklyJustifiedSlots(withLedger, {
      intent: analysis.strategicIntent,
      poolEntries: analysis.spells || [],
      format: input.format,
      strategy: input.strategy,
      target: input.target,
      budgetConstraint: input.budget === "Budget conscious",
      powerConstraint: input.targetPowerTier === "Casual",
      maxRepairs: 6,
      buildSlotJustificationLedger,
      validateCohesion: (probe) => validateStrategicCohesion(
        probe,
        analysis.strategicIntent,
        cohesionOptionsFor(analysis),
      ),
      blueprintAlignmentFor: (rows) => {
        const selected = rows.filter((row) => !(row.roles || []).includes("land") && !(row.roles || []).includes("commander"));
        const singleton = ["Commander", "Brawl", "Standard Brawl"].includes(input.format);
        return computeBlueprintAlignment(analysis, selected, singleton);
      },
      isProtectedCut: (row) => {
        if (!row) return false;
        if ((row.blueprintMechanicHits || []).length > 0) return true;
        if ((row.directTribes || []).length > 0 && (analysis.context?.blueprint?.tribalTypes || []).length) return true;
        if ((row.blueprintRoleHits || []).length > 0) return true;
        return false;
      },
      isForbiddenAdd: (entry) => {
        const excluded = collectRepairExcludedNames(withLedger);
        const nameKey = normalized(entry?.card?.name || entry?.name || "");
        if (excluded.has(nameKey)) return true;
        if (repairForbidsPowerSignals(input) && powerSignalCategoryFor(entry?.card || entry) != null) return true;
        return false;
      },
    });
  let afterCleanup = cleaned;
  if (cleaned.weakSlotRepair?.applied) {
    const variant = VARIANTS.find((entry) => entry.id === cleaned.id) || VARIANTS[0];
    const roleCounts = new Map();
    for (const row of cleaned.rows) {
      for (const role of row.roles || []) {
        roleCounts.set(role, (roleCounts.get(role) || 0) + Number(row.quantity || 0));
      }
    }
    const evaluation = evaluateCandidate(cleaned.rows, roleCounts, input, variant);
    afterCleanup = refreshCandidateStrategyMetrics({
      ...cleaned,
      evaluation,
      score: evaluation.score,
    }, analysis, input);
    afterCleanup = attachStrategicCohesion(afterCleanup, analysis);
    afterCleanup = attachSlotJustificationLedger(afterCleanup, analysis.strategicIntent, {
      budgetConstraint: input.budget === "Budget conscious",
      powerConstraint: input.targetPowerTier === "Casual",
    });
  }
  // Self-Evaluation v1: observational only — attaches construction-trace
  // outcomes + reasoning drift without changing construction weights.
  const withSelfEval = attachSelfEvaluationToCandidate(afterCleanup);
  // Weak-slot forensics: explain residual weaklyJustified final cards.
  return attachWeakSlotForensics(withSelfEval, {
    intent: analysis.strategicIntent,
    poolEntries: analysis.spells || [],
    format: input.format,
    strategy: input.strategy,
    target: input.target,
    budgetConstraint: input.budget === "Budget conscious",
    powerConstraint: input.targetPowerTier === "Casual",
  });
}

function powerSignalForCandidate(candidate, input) {
  const structuralCards = buildSelectedStructuralCards(candidate, input);
  const structuralAnalysis = buildForgeStructuralAnalysis(structuralCards, { commanderName: input.commander?.name || "" });
  return evaluateCommanderPowerSignal(structuralCards, structuralAnalysis.graph);
}

// Phase 2C: one static, claim-aware repair snapshot. It runs only after
// Phase 2B has completed, never invokes construction or budget analysis,
// and therefore cannot undo a budget cut through a second pool rebuild.
export function repairPowerOffenders(input, candidate) {
  const already = candidate.powerRepair;
  if (already?.completed && already.targetTier === (input.targetPowerTier || null)) return { candidate, powerRepair: already };

  const before = ["Commander", "Brawl", "Standard Brawl"].includes(input.format) ? powerSignalForCandidate(candidate, input) : null;
  const diagnostics = {
    attempted: false,
    completed: false,
    targetTier: input.targetPowerTier || null,
    signalScoreBefore: before?.signalScore ?? null,
    signalScoreAfter: before?.signalScore ?? null,
    tierBefore: before?.tier ?? null,
    tierAfter: before?.tier ?? null,
    appliedCount: 0,
    skippedNoSafeAlternative: 0,
    revertedByFinalValidation: false,
    revertedBecauseNoPowerImprovement: false,
    removedNames: [],
    alternativesAddedNames: [],
  };
  if (input.targetPowerTier !== "Casual" || !before || before.signalScore <= 2) {
    diagnostics.completed = true;
    return { candidate: { ...candidate, powerRepair: diagnostics }, powerRepair: diagnostics };
  }

  diagnostics.attempted = true;
  const excludedNames = collectRepairExcludedNames(candidate);
  const audit = auditPowerSubstitutions(input, { candidate, excludedNames });
  diagnostics.skippedNoSafeAlternative = audit.offenders.filter(
    (entry) => entry.conclusion !== "unjustified high-power inclusion for Casual",
  ).length;
  const orderedOffenders = audit.offenders
    .filter((entry) => entry.conclusion === "unjustified high-power inclusion for Casual")
    .sort((a, b) => b.powerCategoryWeight - a.powerCategoryWeight || a.name.localeCompare(b.name));

  const originalRoleCounts = new Map();
  for (const row of candidate.rows) for (const role of row.roles || []) originalRoleCounts.set(role, (originalRoleCounts.get(role) || 0) + row.quantity);
  const targets = roleTargets(input.format, input.strategy);
  const selected = new Set(candidate.rows.map((row) => normalized(row.name)));
  const claimed = new Set();
  const cut = new Set();
  const swaps = [];
  for (const offender of orderedOffenders) {
    const pick = (offender.compatibleAlternatives || []).find((alt) => {
      const key = normalized(alt.name);
      return alt.hardGateImpact === "none" && !selected.has(key) && !claimed.has(key) && !cut.has(key) && !excludedNames.has(key);
    });
    if (!pick) { diagnostics.skippedNoSafeAlternative += 1; continue; }
    claimed.add(normalized(pick.name));
    cut.add(normalized(offender.name));
    swaps.push({ offenderName: offender.name, pickName: pick.name });
  }
  if (!swaps.length) {
    diagnostics.completed = true;
    return { candidate: { ...candidate, powerRepair: diagnostics }, powerRepair: diagnostics };
  }

  const evidenceByName = new Map((input.evidence || []).map((entry) => [normalized(entry.name), entry]));
  const analysis = prepareForgeAnalysis(input, evidenceByName);
  const analyzedByName = new Map(analysis.cards.map((entry) => [normalized(entry.card.name), entry]));
  let rows = candidate.rows.map((row) => ({ ...row }));
  for (const swap of swaps) {
    rows = rows.map((row) => normalized(row.name) === normalized(swap.offenderName) ? { ...row, quantity: row.quantity - 1 } : row).filter((row) => row.quantity > 0);
    const entry = analyzedByName.get(normalized(swap.pickName));
    rows.push(rowFromAnalyzedEntry(entry));
  }

  if (rowsLeakExcludedNames(rows, excludedNames).length) {
    diagnostics.revertedByFinalValidation = true;
    diagnostics.completed = true;
    return { candidate: { ...candidate, powerRepair: diagnostics }, powerRepair: diagnostics };
  }

  const roleCounts = new Map();
  for (const row of rows) for (const role of row.roles || []) roleCounts.set(role, (roleCounts.get(role) || 0) + row.quantity);
  const variant = VARIANTS.find((entry) => entry.id === candidate.id);
  const evaluation = evaluateCandidate(rows, roleCounts, input, variant);
  const brokenRole = Object.entries(targets).find(([role, target]) => (originalRoleCounts.get(role) || 0) >= target && (roleCounts.get(role) || 0) < target);
  if (!variant || evaluation.roleCoverage < 0.45 || evaluation.curveHealth < 45 || brokenRole) {
    diagnostics.revertedByFinalValidation = true;
    diagnostics.completed = true;
    return { candidate: { ...candidate, powerRepair: diagnostics }, powerRepair: diagnostics };
  }

  const repaired = refreshCandidateStrategyMetrics({
    ...candidate,
    rows,
    deckText: rows.map((row) => `${row.quantity} ${row.name}`).join("\n"),
    evaluation,
    score: evaluation.score,
  }, analysis, input);
  const after = powerSignalForCandidate(repaired, input);
  diagnostics.signalScoreAfter = after.signalScore;
  diagnostics.tierAfter = after.tier;
  const improved = after.signalScore < before.signalScore || POWER_TIER_INDEX[after.tier] < POWER_TIER_INDEX[before.tier];
  if (!improved) {
    diagnostics.revertedBecauseNoPowerImprovement = true;
    diagnostics.completed = true;
    diagnostics.signalScoreAfter = before.signalScore;
    diagnostics.tierAfter = before.tier;
    return { candidate: { ...candidate, powerRepair: diagnostics }, powerRepair: diagnostics };
  }

  diagnostics.appliedCount = swaps.length;
  diagnostics.removedNames = swaps.map((swap) => swap.offenderName);
  diagnostics.alternativesAddedNames = swaps.map((swap) => swap.pickName);
  diagnostics.completed = true;
  // Same short player-facing prose pattern as budgetRepair.note.
  diagnostics.note = `${diagnostics.appliedCount} high-power card${diagnostics.appliedCount === 1 ? "" : "s"} ${diagnostics.appliedCount === 1 ? "was" : "were"} swapped for a same-role alternative to keep this deck at Casual power.`;
  const finished = refreshLedgerAfterRepair(input, { ...repaired, powerRepair: diagnostics }, analysis);
  return { candidate: finished, powerRepair: diagnostics };
}

function applyPowerRepair(input, candidate) {
  return repairPowerOffenders(input, candidate).candidate;
}

/**
 * After weak-slot cleanup (and the primary power-repair pass), residual
 * Casual power-signal cards may remain when the strict role-matched audit
 * found no alternative. Sweep them with a looser but still floor-safe
 * replacement so Casual exclusions stay authoritative.
 */
function sweepResidualCasualPowerCards(input, candidate, analysis) {
  if (!repairForbidsPowerSignals(input)) return candidate;
  // Only tidy residuals after a successful Casual rebuild — never force a
  // deeper cut when the primary power repair already disclosed it cannot
  // reach Casual without unsafe swaps.
  if (candidate.powerRepair?.tierAfter !== "Casual") return candidate;
  const analyzedByName = new Map(analysis.cards.map((entry) => [normalized(entry.card.name), entry]));
  const present = new Set(candidate.rows.map((row) => normalized(row.name)));
  const offenders = candidate.rows.filter((row) => {
    if ((row.roles || []).includes("land") || (row.roles || []).includes("commander")) return false;
    const entry = analyzedByName.get(normalized(row.name));
    return entry && powerSignalCategoryFor(entry.card) != null;
  });
  if (!offenders.length) return candidate;

  const excluded = collectRepairExcludedNames(candidate);
  const nonPowerPool = (analysis.spells || [])
    .filter((entry) => !present.has(normalized(entry.card.name)))
    .filter((entry) => !excluded.has(normalized(entry.card.name)))
    .filter((entry) => powerSignalCategoryFor(entry.card) == null)
    .sort((left, right) => (right.score || 0) - (left.score || 0) || left.card.name.localeCompare(right.card.name));

  let rows = candidate.rows.map((row) => ({ ...row, roles: [...(row.roles || [])] }));
  const removed = [];
  const added = [];
  const beforeGate = candidate.strategicCohesionGate;

  for (const offender of offenders.sort((a, b) => a.name.localeCompare(b.name))) {
    let swapped = false;
    for (const alt of nonPowerPool) {
      if (rows.some((row) => normalized(row.name) === normalized(alt.card.name))) continue;
      const next = rows.map((row) => ({ ...row, roles: [...(row.roles || [])] }));
      const cut = next.find((row) => normalized(row.name) === normalized(offender.name));
      if (!cut) break;
      cut.quantity -= 1;
      const existing = next.find((row) => normalized(row.name) === normalized(alt.card.name));
      if (existing) existing.quantity += 1;
      else next.push(rowFromAnalyzedEntry(alt));
      const filtered = next.filter((row) => row.quantity > 0);
      const roleCounts = new Map();
      for (const row of filtered) {
        for (const role of row.roles || []) roleCounts.set(role, (roleCounts.get(role) || 0) + row.quantity);
      }
      const variant = VARIANTS.find((entry) => entry.id === candidate.id) || VARIANTS[0];
      const evaluation = evaluateCandidate(filtered, roleCounts, input, variant);
      if (evaluation.roleCoverage < 0.45 || evaluation.curveHealth < 45) continue;
      const cohesion = validateStrategicCohesion({ ...candidate, rows: filtered }, analysis.strategicIntent, cohesionOptionsFor(analysis));
      if (beforeGate?.passed && cohesion.passed === false) continue;
      rows = filtered;
      removed.push(offender.name);
      added.push(alt.card.name);
      present.add(normalized(alt.card.name));
      swapped = true;
      break;
    }
    void swapped;
  }

  if (!removed.length) return candidate;

  const roleCounts = new Map();
  for (const row of rows) for (const role of row.roles || []) roleCounts.set(role, (roleCounts.get(role) || 0) + row.quantity);
  const variant = VARIANTS.find((entry) => entry.id === candidate.id) || VARIANTS[0];
  const evaluation = evaluateCandidate(rows, roleCounts, input, variant);
  const refreshed = refreshCandidateStrategyMetrics({
    ...candidate,
    rows,
    deckText: rows.map((row) => `${row.quantity} ${row.name}`).join("\n"),
    evaluation,
    score: evaluation.score,
    casualPowerSweep: Object.freeze({
      applied: true,
      removedNames: Object.freeze(removed),
      alternativesAddedNames: Object.freeze(added),
    }),
  }, analysis, input);
  const withCohesion = attachStrategicCohesion(refreshed, analysis);
  const withLedger = attachSlotJustificationLedger(withCohesion, analysis.strategicIntent, {
    budgetConstraint: input.budget === "Budget conscious",
    powerConstraint: true,
  });
  return attachWeakSlotForensics(attachSelfEvaluationToCandidate(withLedger), {
    intent: analysis.strategicIntent,
    poolEntries: analysis.spells || [],
    format: input.format,
    strategy: input.strategy,
    target: input.target,
    budgetConstraint: input.budget === "Budget conscious",
    powerConstraint: true,
  });
}

export function forgeNativeMasterwork(input) {
  if (!input || !Array.isArray(input.cards) || !input.cards.length) throw new Error("Native Forge requires a verified card pool");
  const evidenceByName = new Map((input.evidence || []).map((entry) => [normalized(entry.name), entry]));
  const analysis = prepareForgeAnalysis(input, evidenceByName);
  const planSelection = selectStrategicPlans(analysis, analysis.strategicIntent, input, {
    spellTarget: Math.round((input.target || 100) * 0.63),
    limits: { maxBuilt: 3, maxGenerated: 8 },
  });
  // Bind up to three diverse plans onto the three tempers. If fewer plans
  // survive evidence gates, remaining variants reuse the best plan rather
  // than inventing unsupported strategies.
  const buildSpecs = VARIANTS.map((variant, index) => {
    const selectedPlan = planSelection.selected[index] || planSelection.selected[0] || null;
    return {
      variant,
      planEntry: selectedPlan,
      analysis: selectedPlan ? applyStrategicPlanToAnalysis(analysis, selectedPlan.plan) : analysis,
    };
  });
  const buildStarted = Date.now();
  const candidates = buildSpecs.map(({ variant, planEntry, analysis: planAnalysis }) => {
    const powered = applyPowerRepair(input, buildCandidate(input, variant, planAnalysis));
    const finished = finalizeCandidateStrategy(input, powered, planAnalysis);
    const swept = sweepResidualCasualPowerCards(input, finished, planAnalysis);
    const realization = planEntry
      ? realizeStrategicPlanScore(swept, planEntry.plan, planEntry.prediction, planAnalysis.strategicIntent)
      : null;
    // Predicted-vs-realized gate: a plan that collapses cohesion after build
    // is marked underperformed for tournament diagnostics.
    return {
      ...swept,
      strategicPlanPrediction: planEntry?.prediction || null,
      strategicPlanRealization: realization,
      planCompetition: {
        planId: planEntry?.plan?.id || null,
        label: planEntry?.plan?.label || null,
        underperformed: Boolean(realization?.underperformed),
      },
    };
  });
  const planBuildMs = Date.now() - buildStarted;
  const structuralTournament = runNativeMasterworkTournament(candidates, { format: input.format, target: input.target });
  const { tournament, practicalTiebreak } = applyPracticalTiebreak(structuralTournament, candidates, input);
  const verdictById = new Map(tournament.results.map((result) => [result.id, result]));
  let ranked = candidates
    .map((candidate) => ({ ...candidate, tournament: verdictById.get(candidate.id) }))
    .sort((left, right) => {
      // Soft demote plans whose realized cohesion/plan quality collapsed.
      const leftPenalty = left.planCompetition?.underperformed ? -8 : 0;
      const rightPenalty = right.planCompetition?.underperformed ? -8 : 0;
      return (right.tournament.tournamentScore + rightPenalty) - (left.tournament.tournamentScore + leftPenalty)
        || left.id.localeCompare(right.id);
    });
  let selected = ranked.find((candidate) => candidate.id === tournament.selectedId);
  if (selected?.planCompetition?.underperformed) {
    const healthier = ranked.find((candidate) => !candidate.planCompetition?.underperformed && candidate.strategicCohesionGate?.passed !== false);
    if (healthier) selected = healthier;
  }

  let structuralCards = buildSelectedStructuralCards(selected, input);
  let structuralAnalysis = buildForgeStructuralAnalysis(structuralCards, { commanderName: input.commander?.name || "" });
  let powerSignal = ["Commander", "Brawl", "Standard Brawl"].includes(input.format) ? evaluateCommanderPowerSignal(structuralCards, structuralAnalysis.graph) : null;
  let powerAudit = null;

  // Requested tier remains a construction-time bias, while the bounded
  // per-variant repair above is the only corrective pass. Other target
  // tiers are disclosed honestly and are never forced upward.
  if (powerSignal && input.targetPowerTier) {
    const audit = auditPowerTier(powerSignal, input.targetPowerTier);
    const repair = selected.powerRepair;
    powerAudit = {
      ...audit,
      rebuildAttempted: Boolean(repair?.attempted),
      rebuildImproved: Boolean(repair?.appliedCount),
      rebuildReachedTarget: !audit.mismatch,
      ...(repair?.attempted ? { originalMeasuredTier: repair.tierBefore } : {}),
    };
  }

  const reasoning = explainNativeMasterworkDecision(ranked, tournament);
  const laboratory = runOneSlotCounterfactualLab(
    selected,
    ranked,
    reasoning,
    {
      format: input.format,
      strategy: input.strategy,
      target: input.target,
      strategicIntent: selected.strategicIntent || analysis.strategicIntent,
    },
  );

  const recommendationRecord =
    createForgeRecommendationRecord({
      engineVersion:
        "metaforge-native-masterwork-v6",
      format:
        input.format,
      strategy:
        input.strategy,
      commanderName:
        input.commander?.name ||
        "",
      deckRows:
        selected.rows,
      recommendation: {
        candidateId:
          selected.id,
        label:
          selected.label,
        score:
          selected.score,
        tournamentScore:
          selected.tournament
            ?.tournamentScore ||
          0,
        reason:
          selected.tournament
            ?.reason ||
          "",
      },
      alternatives:
        ranked
          .filter(
            (candidate) =>
              candidate.id !==
              selected.id,
          )
          .map(
            (candidate) => ({
              id:
                candidate.id,
              label:
                candidate.label,
              score:
                candidate.score,
              tournamentScore:
                candidate
                  .tournament
                  ?.tournamentScore ||
                0,
              reason:
                candidate
                  .tournament
                  ?.reason ||
                "",
            }),
          ),
      reasoning,
      structuralAnalysis,
      blueprintIntent:
        analysis.context
          .blueprint,
    });

  // The masterworks screen lets the player enter ANY exposed candidate —
  // never just the recommended one — so a candidate that failed its own
  // hard gate (role coverage, mana-share, curve, or a >=90% duplicate of
  // an already-passing design) must never be one of the choices. The
  // tournament above already computes this per candidate (gate.passed);
  // `selected` was already guaranteed to come from the passing set, but
  // `ranked` on its own still carried every candidate, rejected ones
  // included. `selected` remaining reachable here is guaranteed: the
  // tournament itself already throws before this point if zero
  // candidates pass, so at least one (the winner) always survives this
  // filter.
  const publicCandidates = ranked.filter((candidate) => candidate.tournament?.gate?.passed !== false);

  return Object.freeze({
    engine: "metaforge-native-masterwork-v6",
    selected,
    candidates: publicCandidates,
    tournament,
    practicalTiebreak,
    reasoning,
    laboratory,
    structuralAnalysis,
    powerSignal,
    powerAudit,
    recommendationRecord,
    manaConsistency: manaConsistencyReport(selected.rows, input.target),
    unusedEnginePartners: unusedEnginePartnersFor(selected, input),
    blueprintIntent: analysis.context.blueprint,
    budgetDiagnostics: budgetDiagnosticsFor(selected, input),
    planCompetition: Object.freeze({
      version: planSelection.version,
      generated: planSelection.generated,
      pruned: planSelection.pruned,
      built: planSelection.instrumentation.built,
      predictionMs: planSelection.instrumentation.predictionMs,
      buildMs: planBuildMs,
      selectedPlanId: selected.planCompetition?.planId || null,
      plans: Object.freeze(planSelection.selected.map((entry) => Object.freeze({
        id: entry.plan.id,
        label: entry.plan.label,
        predictedScore: entry.prediction.predictedScore,
        confidence: entry.prediction.confidence,
        supportingProfiles: entry.plan.supportingProfiles,
      }))),
    }),
  diagnostics: Object.freeze({
    analysisPasses: 1,
    cardsAnalyzed:
      analysis.cards.length,
    candidatesBuilt:
      ranked.length,
    structuralCardsAnalyzed:
      structuralAnalysis
        .uniqueCardCount,
    detectedSystems:
      structuralAnalysis
        .systems
        .systems
        .length,
}),

    methodology: `MetaForge analyzed each verified card once, compiled explicit Blueprint requests into a strategy contract, competed evidence-backed strategic plans, built phase-aware tempers, protected minimum deck-function requirements, enforced a meaningful contract-card density, assembled distinct structural variants, applied hard rejection gates, advanced a nondominated Blueprint tradeoff, compared it with the closest viable rival, and exhaustively gated exact one-slot experiments.${selected.blueprintAlignment.requested.length ? ` Blueprint promise: ${selected.blueprintAlignment.requested.join(", ")} — ${selected.blueprintAlignment.status.replaceAll("-", " ")}; ${selected.blueprintAlignment.selectedContractCards}/${selected.blueprintAlignment.requiredContractCards} required strategy-contract cards selected.` : ""}`,
    selfEvaluation: selected.selfEvaluation || null,
    weakSlotForensics: selected.weakSlotForensics || null,
  });
}

// Adapts a player's own decklist (or a locked-in commander with no random
// reveal) directly into one legal, complete deck instead of generating three
// alternates. The imported candidate is compared against a hidden internal
// baseline for real structural axes, but is always kept as the selected
// build as long as it clears the hard gates — the Forge never silently
// substitutes its own optimization for what the player actually submitted.
export function forgeImportedMasterwork(input) {
  if (!input || !Array.isArray(input.cards) || !input.cards.length) throw new Error("Native Forge requires a verified card pool");
  if (!Array.isArray(input.importedRows) || !input.importedRows.length) throw new Error("Native Forge requires at least one verified card from your decklist");
  const evidenceByName = new Map((input.evidence || []).map((entry) => [normalized(entry.name), entry]));
  const analysis = prepareForgeAnalysis(input, evidenceByName);
  const imported = buildImportedCandidate(input, analysis);
  const baseline = buildCandidate(input, VARIANTS[0], analysis);

  const tournament = runNativeMasterworkTournament([imported, baseline], { format: input.format, target: input.target });
  const importedResult = tournament.results.find((result) => result.id === imported.id);
  const blockingImportedReasons = (importedResult?.gate.reasons || []).filter((reason) =>
    /Deck size|Copy limit|Mana-base share/i.test(reason));
  if (blockingImportedReasons.length) {
    throw new Error(`Native Forge could not preserve your list as a legal ${input.format} deck: ${blockingImportedReasons.join(" ")}`);
  }

  const forcedTournament = tournament.selectedId === imported.id ? tournament : Object.freeze({
    ...tournament,
    selectedId: imported.id,
    results: tournament.results.map((result) => result.id === imported.id
      ? { ...result, gate: { ...result.gate, passed: true }, verdict: "advance", reason: `${imported.label} is your submitted list, preserved exactly; structural weaknesses remain coaching evidence rather than permission to substitute another deck.` }
      : { ...result, verdict: "hold" }),
  });

  const ranked = [imported, baseline].map((candidate) => ({
    ...candidate,
    tournament: forcedTournament.results.find((result) => result.id === candidate.id),
  }));
  const selected = ranked.find((candidate) => candidate.id === imported.id);
  const reasoning = explainNativeMasterworkDecision(ranked, forcedTournament);
  const laboratory = runOneSlotCounterfactualLab(selected, ranked, reasoning, {
    format: input.format,
    strategy: input.strategy,
    target: input.target,
    strategicIntent: selected.strategicIntent || analysis.strategicIntent,
  });

  const structuralCards = buildSelectedStructuralCards(selected, input);
  const structuralAnalysis = buildForgeStructuralAnalysis(structuralCards, { commanderName: input.commander?.name || "" });
  const powerSignal = ["Commander", "Brawl", "Standard Brawl"].includes(input.format) ? evaluateCommanderPowerSignal(structuralCards, structuralAnalysis.graph) : null;
  const recommendationRecord = createForgeRecommendationRecord({
    engineVersion: "metaforge-native-import-v1",
    format: input.format,
    strategy: input.strategy,
    commanderName: input.commander?.name || "",
    deckRows: selected.rows,
    recommendation: {
      candidateId: selected.id,
      label: selected.label,
      score: selected.score,
      tournamentScore: selected.tournament?.tournamentScore || 0,
      reason: selected.tournament?.reason || "",
    },
    alternatives: ranked
      .filter((candidate) => candidate.id !== selected.id)
      .map((candidate) => ({
        id: candidate.id,
        label: candidate.label,
        score: candidate.score,
        tournamentScore: candidate.tournament?.tournamentScore || 0,
        reason: candidate.tournament?.reason || "",
      })),
    reasoning,
    structuralAnalysis,
    blueprintIntent: analysis.context.blueprint,
  });

  const changes = diffImportedChanges(input.importedRows, selected.rows);
  const changesWithReasons = {
    ...changes,
    addedDetail: describeImportedAdditions(changes.added, selected.constructionTrace),
  };

  return Object.freeze({
    engine: "metaforge-native-import-v1",
    selected,
    candidates: ranked,
    tournament: forcedTournament,
    reasoning,
    laboratory,
    structuralAnalysis,
    powerSignal,
    // Imported decks never receive a targetPowerTier (forge-generate.ts
    // deliberately omits it — the player's submitted list is preserved
    // unconditionally, never rebuilt), so there is never anything to
    // audit against. powerSignal above still reports the real measured
    // tier honestly; this stays null for a consistent report shape
    // rather than being omitted.
    powerAudit: null,
    recommendationRecord,
    manaConsistency: manaConsistencyReport(selected.rows, input.target),
    unusedEnginePartners: unusedEnginePartnersFor(selected, input),
    blueprintIntent: analysis.context.blueprint,
    budgetDiagnostics: budgetDiagnosticsFor(selected, input),
    changes: Object.freeze(changesWithReasons),
    diagnostics: Object.freeze({
      analysisPasses: 1,
      cardsAnalyzed: analysis.cards.length,
      candidatesBuilt: ranked.length,
      structuralCardsAnalyzed: structuralAnalysis.uniqueCardCount,
      detectedSystems: structuralAnalysis.systems.systems.length,
    }),
    methodology: `Your submitted list was reserved first, then the Forge filled the remaining slots to reach a complete, legal ${input.format} deck.${changes.added.length ? ` ${changes.added.length} card${changes.added.length === 1 ? "" : "s"} added to fill role or size gaps.` : " No cards needed to be added."}${changes.trimmed.length ? ` ${changes.trimmed.reduce((sum, entry) => sum + entry.cut, 0)} cop${changes.trimmed.reduce((sum, entry) => sum + entry.cut, 0) === 1 ? "y" : "ies"} trimmed to respect the format's copy limit or exact deck size.` : ""}`,
  });
}
