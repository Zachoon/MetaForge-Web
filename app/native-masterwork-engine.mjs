import { runNativeMasterworkTournament } from "./native-masterwork-tournament.mjs";
import { explainNativeMasterworkDecision } from "./native-masterwork-reasoning.mjs";
import { rankOneSlotCounterfactuals, runOneSlotCounterfactualLab } from "./native-one-slot-lab.mjs";
import { evaluateCommanderPowerSignal, POWER_TIERS, powerSignalCategoryFor, CATEGORY_WEIGHT as POWER_CATEGORY_WEIGHT } from "./commander-power-signal.mjs";

import {
  buildForgeStructuralAnalysis,
} from "./forge-structural-pipeline.mjs";

import {
  createForgeRecommendationRecord,
} from "./forge-recommendation-ledger.mjs";

import {
  extractMechanicalSignals,
  findUnusedEnginePartners,
} from "./forge-interaction-graph.mjs";

import CARD_MECHANICS from "./card-mechanics.mjs";

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
const BASIC_LAND_NAMES = Object.freeze(["Plains", "Island", "Swamp", "Mountain", "Forest", "Wastes"]);
const isBasicLandName = (name = "") => BASIC_LAND_NAMES.some((basic) => basic.toLowerCase() === String(name).trim().toLowerCase());
const BASIC_COLOR_BY_NAME = Object.freeze({
  Plains: ["W"], Island: ["U"], Swamp: ["B"], Mountain: ["R"], Forest: ["G"], Wastes: [],
});

const ROLE_PATTERNS = Object.freeze({
  ramp: [/add .{0,18}mana/i, /create .{0,18}treasure/i, /search your library for .{0,30}land/i, /land card.{0,30}battlefield/i],
  draw: [/draw (?:a|one|two|three|x|that many|cards?)/i, /look at the top .{0,40}(?:hand|exile)/i, /impulse/i],
  interaction: [/destroy target/i, /exile target/i, /counter target/i, /deals? \d+ damage to/i, /return target .{0,25}owner'?s hand/i, /-\d+\/-\d+/i],
  protection: [/hexproof/i, /indestructible/i, /phase out/i, /protection from/i, /counter target spell or ability/i],
  recursion: [/return target .{0,35}(?:graveyard|battlefield|hand)/i, /cast .{0,30}from your graveyard/i, /reanimate/i],
  sweeper: [/destroy all/i, /exile all/i, /all creatures get -/i, /deals? \d+ damage to each/i],
  selection: [/scry/i, /surveil/i, /discard .{0,20}draw/i, /draw .{0,20}discard/i],
  tokens: [/create (?:a|one|two|three|x|that many|\d+) .{0,45}token/i],
  sacrifice: [/sacrifice (?:a|another|one|target)/i, /whenever .{0,25} dies/i],
  counters: [/[+\-]\d+\/[+\-]\d+ counter/i, /one or more counters/i, /proliferate/i],
  graveyard: [/graveyard/i, /mill /i, /surveil/i, /flashback/i, /escape/i],
  artifacts: [/artifact/i, /equipment/i, /treasure/i],
  spells: [/instant or sorcery/i, /noncreature spell/i, /whenever you cast/i, /prowess/i],
  lifegain: [/you gain .{0,12}life/i, /whenever you gain life/i, /lifelink/i],
  combat: [/whenever .{0,25} attacks/i, /combat damage/i, /double strike/i, /extra combat/i],
  // Hand disruption is its own deckbuilding axis, not covered by
  // "interaction" above (which only matches destroy/exile/counter/damage/
  // bounce). Scoped to the opponent discarding, not a self-loot effect
  // ("you may discard a card, then draw"), which "selection" already owns.
  discard: [/target (?:player|opponent) discards?/i, /each (?:player|opponent) discards?/i, /that player discards?/i],
});

// Rules-text regex alone misses real cards that do the same job in an
// unusual phrasing — a card tagged mana_acceleration in the curated
// card-mechanics database (app/card-mechanics.mjs) is real evidence a card
// ramps, even when it doesn't match any of the ramp patterns above. Only
// roles with one clean, unambiguous tag are mapped here; roles the tag
// database has no dedicated signal for (interaction, sweeper, artifacts,
// combat, discard, draw — "card_advantage" is too broad to stand in for
// draw specifically) are left to the regex alone rather than guessing.
const ROLE_TAGS = Object.freeze({
  ramp: ["mana_acceleration"],
  protection: ["protection"],
  recursion: ["graveyard_recursion"],
  selection: ["scry", "surveil"],
  tokens: ["token_producer"],
  sacrifice: ["sacrifice_outlet"],
  counters: ["counter_producer"],
  graveyard: ["graveyard_setup", "mill"],
  spells: ["spell_payoff"],
  lifegain: ["lifegain", "lifegain_payoff"],
});

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

// ROLE_PATTERNS matches verified rules text, which speaks in precise oracle
// phrasing ("destroy target creature"). A player's commission note speaks in
// plain language ("removal", "board wipes") that never appears in rules text,
// so notes need their own, looser vocabulary layered on top.
const NOTE_ROLE_ALIASES = Object.freeze({
  ramp: [/\bramp\b/i, /\bmana ramp\b/i, /\bacceleration\b/i, /\baccelerate\b/i],
  draw: [/\bcard draw\b/i, /\bdraw(?:ing)? cards?\b/i, /\bcard advantage\b/i],
  interaction: [/\bremoval\b/i, /\bcounterspells?\b/i, /\binteraction\b/i, /\bdisruption\b/i, /\bspot removal\b/i],
  protection: [/\bprotection\b/i, /\bhexproof\b/i, /\bsafety\b/i],
  recursion: [/\brecursion\b/i, /\breanimator\b/i, /\breanimate\b/i, /\bbring(?:ing)? back\b/i],
  sweeper: [/\bboard wipes?\b/i, /\bwraths?\b/i, /\bsweepers?\b/i, /\bmass removal\b/i],
  selection: [/\bcard selection\b/i, /\bfiltering\b/i],
  tokens: [/\bgo wide\b/i, /\btoken(?:s)? strategy\b/i, /\btokens\b/i, /\bwide board\b/i],
  sacrifice: [/\baristocrats\b/i, /\bsac(?:rifice)? deck\b/i, /\bsacrifice\b/i, /\bsac(?:s)?\b/i],
  counters: [/\bcounters strategy\b/i, /\bproliferate\b/i],
  graveyard: [/\bgraveyard value\b/i, /\bself-?mill\b/i, /\bmill strategy\b/i],
  artifacts: [/\bartifact synerg(?:y|ies)\b/i, /\bartifacts matter\b/i],
  spells: [/\bspellslinger\b/i, /\bspells matter\b/i, /\binstants and sorceries\b/i],
  lifegain: [/\blife ?gain\b/i, /\bgaining life\b/i],
  combat: [/\bcombat tricks?\b/i, /\bbig combat\b/i],
  discard: [/\bdiscard\b/i, /\bhand disruption\b/i, /\bhand attack\b/i, /\bdisrupt(?:ion)? (?:their|the opponent'?s) hand\b/i],
});
const NOTE_NEGATION_CUE = /\b(no|not|never|avoid|avoiding|without|don'?t want|doesn'?t want|hate|skip|exclude|excluding)\b/i;
const toGlobal = (pattern) => new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`);

// Every role signal in a note is either something the player asked for or
// something they explicitly ruled out ("no sacrifice"). A short lookbehind
// window decides which; "no" flips the nearest role mention, not the whole
// note, so "no sacrifice but plenty of removal" reads correctly.
function noteRoleSignals(source = "") {
  const desired = new Set();
  const excluded = new Set();
  for (const role of Object.keys(ROLE_PATTERNS)) {
    const patterns = [...ROLE_PATTERNS[role], ...(NOTE_ROLE_ALIASES[role] || [])];
    for (const pattern of patterns) {
      for (const match of source.matchAll(toGlobal(pattern))) {
        const windowStart = Math.max(0, match.index - 24);
        const negated = NOTE_NEGATION_CUE.test(source.slice(windowStart, match.index));
        (negated ? excluded : desired).add(role);
      }
    }
  }
  for (const role of excluded) desired.delete(role);
  return { desired: [...desired], excluded: [...excluded] };
}

const STRATEGY_WEIGHTS = Object.freeze({
  Aggressive: { ramp: 4, draw: 7, interaction: 8, protection: 7, threat: 14, combat: 10 },
  Control: { ramp: 7, draw: 13, interaction: 15, protection: 6, sweeper: 12, threat: 5 },
  Combo: { ramp: 10, draw: 13, interaction: 7, protection: 10, selection: 10, threat: 5 },
  "Balanced midrange": { ramp: 10, draw: 10, interaction: 11, protection: 6, recursion: 6, threat: 10 },
  Midrange: { ramp: 9, draw: 10, interaction: 10, protection: 6, recursion: 7, threat: 11 },
  Tempo: { ramp: 4, draw: 9, interaction: 12, protection: 9, threat: 10, combat: 7 },
});

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

const BLUEPRINT_FILLER_WORDS = new Set([
  "tribal", "typal", "synergy", "synergies", "theme", "themed", "archetype",
  "build", "around", "plus", "counters", "counter", "and", "or", "with",
]);

function normalizeBlueprintText(value = "") {
  return normalized(value)
    .replace(/\+\s*1\s*(?:\+|\/)\s*1\s*counters?/g, "+1/+1 counter")
    .replace(/\bplus one plus one counters?\b/g, "+1/+1 counter");
}

export function parseNativeBlueprintIntent(input = {}) {
  const source = normalizeBlueprintText(input.note || "");
  const tribalTypes = unique([
    ...[...source.matchAll(/\b([a-z][a-z0-9'-]{2,})\s+(?:tribal|typal)\b/g)].map((match) => match[1]),
    ...[...source.matchAll(/\b(?:tribal|typal)\s+([a-z][a-z0-9'-]{2,})\b/g)].map((match) => match[1]),
  ]).filter((term) => !BLUEPRINT_FILLER_WORDS.has(term));
  const roleSignals = noteRoleSignals(source);
  const desiredRoles = roleSignals.desired;
  const excludedRoles = roleSignals.excluded;
  const requestedTerms = unique(
    source
      .split(/[^a-z0-9+'/-]+/)
      .filter((term) => term.length >= 4 && !BLUEPRINT_FILLER_WORDS.has(term)),
  );
  const promises = [
    ...tribalTypes.map((type) => `${type} typal`),
    ...desiredRoles.map((role) => role === "counters" ? "+1/+1 counter growth" : role),
  ];
  return Object.freeze({ source, tribalTypes, desiredRoles, excludedRoles, requestedTerms, promises: unique(promises) });
}

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

// Only ever called for a requested Casual build that measured materially
// higher (see forgeNativeMasterwork) — never for imported decks, whose
// contract preserves the player's submitted list unconditionally.
// Excludes exactly the cards evaluateCommanderPowerSignal itself flagged
// as high-ceiling from the eligible spell pool, then re-runs the same
// pure selection function for the same variant. If the commander itself
// is the (or the only) flagged card, no nonland exclusion can fix that —
// this returns null rather than pretending a rebuild happened, and the
// caller falls back to an honest disclosed mismatch.
function rebuildExcludingHighCeilingCards(input, variant, analysis, excludedNames) {
  if (!variant || !excludedNames?.length) return null;
  const excluded = new Set(excludedNames.map(normalized));
  const filteredSpells = analysis.spells.filter((entry) => !excluded.has(normalized(entry.card.name)));
  if (filteredSpells.length === analysis.spells.length) return null;
  try {
    return buildCandidate(input, variant, { ...analysis, spells: filteredSpells });
  } catch {
    return null;
  }
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

// Every basic land is tagged mana_acceleration in the database — "adds
// mana" is true of literally every land, which isn't what the "ramp" role
// means here (accelerating ahead of your land drops). Real mana rocks and
// dorks are never lands, so the tag is only trustworthy for the "ramp"
// role specifically when the card isn't one.
function roleTagsFor(card, isLand) {
  const tags = CARD_MECHANICS[normalized(card?.name)];
  if (!tags) return [];
  return Object.entries(ROLE_TAGS)
    .filter(([role, tagNames]) => !(isLand && role === "ramp") && tagNames.some((tag) => tags.includes(tag)))
    .map(([role]) => role);
}

export function classifyNativeCard(card) {
  const typeLine = String(card.typeLine || card.type_line || "");
  const text = cardText(card);
  const roles = [];
  const isLand = /\bLand\b/i.test(typeLine);
  if (isLand) roles.push("land");
  for (const [role, patterns] of Object.entries(ROLE_PATTERNS)) {
    if (patterns.some((pattern) => pattern.test(text))) roles.push(role);
  }
  roles.push(...roleTagsFor(card, isLand));
  if (!roles.includes("land") && (/\bCreature\b|Planeswalker/i.test(typeLine) || /you win the game/i.test(text))) roles.push("threat");
  return unique(roles);
}

// Same database cross-reference as classifyNativeCard, applied to a
// commander's own text so the synergy bonus below ("does this card do what
// my commander cares about") sees the same evidence a card's own role
// classification does — a commander whose ramp ability is phrased in a way
// the regex above doesn't cover would otherwise silently grant no ramp
// synergy bonus at all.
export function conceptSignals(card) {
  const text = normalized(card?.oracleText || card?.oracle_text || "");
  const regexSignals = Object.keys(ROLE_PATTERNS).filter((role) => ROLE_PATTERNS[role].some((pattern) => pattern.test(text)));
  const isLand = /\bLand\b/i.test(card?.typeLine || card?.type_line || "");
  return unique([...regexSignals, ...roleTagsFor(card, isLand)]);
}

function preferenceTerms(input) {
  const ignored = new Set(["this", "that", "with", "from", "your", "deck", "cards", "card", "want", "play", "forge", "must", "never", "should"]);
  const commanderText = allCommanders(input).map((commander) => commander.oracleText || "").join(" ");
  return unique(normalized(`${input.strategy} ${input.path} ${input.note} ${commanderText}`)
    .split(/[^a-z0-9+'-]+/).filter((term) => term.length >= 4 && !ignored.has(term)));
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
  const mechanicsByIndex = cards.map((card) => {
    if (/\bLand\b/i.test(card.typeLine || card.type_line || "")) return { signals: [], produces: [], rewards: [] };
    const mechanics = extractMechanicalSignals(card);
    for (const signal of mechanics.produces) producerCounts.set(signal, (producerCounts.get(signal) || 0) + 1);
    for (const signal of mechanics.rewards) payoffCounts.set(signal, (payoffCounts.get(signal) || 0) + 1);
    return mechanics;
  });
  return { mechanicsByIndex, producerCounts, payoffCounts };
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
  const directTribes = context.blueprint.tribalTypes.filter((tribe) =>
    new RegExp(`(?:^|[^a-z])${tribe}(?:$|[^a-z])`, "i").test(typeLine),
  );
  const tribalSupport = context.blueprint.tribalTypes.filter((tribe) =>
    (!directTribes.includes(tribe) && text.includes(tribe)) ||
    /choose a creature type|creature type of your choice|creatures? you control of the chosen type|changeling|kindred/i.test(text),
  );
  const identityHits = unique([...directTribes, ...tribalSupport]);
  const blueprintRoleHits = roles.filter((role) => context.blueprint.desiredRoles.includes(role));
  const excludedRoleHits = roles.filter((role) => context.blueprint.excludedRoles.includes(role));
  const fieldPressureHits = roles.filter((role) => context.fieldCounterRoles.includes(role)).length;
  return {
    card,
    roles,
    text,
    cmc: manaValueFromCost(card.manaCost || card.mana_cost, card.cmc),
    roleScore: roles.reduce((sum, role) => {
      const weight = context.weights[role] || (role === "threat" ? 7 : 2);
      const quality = role === "interaction" ? interactionQualityFor(text) : 1;
      return sum + weight * quality;
    }, 0),
    synergyHits: roles.filter((role) => context.commanderSignals.includes(role)).length,
    synergyPotential: synergyPotentialFor(mechanics, poolSignals),
    preferenceHits: context.terms.filter((term) => text.includes(term)).length,
    resilienceRoles: roles.filter((role) => ["draw", "protection", "recursion", "interaction"].includes(role)).length,
    evidenceScore: clamp(Number(evidence.evidenceScore || 0) * 100) * 0.12,
    discovery: evidence.newCardPotential ? 2 : 0,
    popularityScore: popularityScoreFromRank(card.popularityRank),
    budgetScore: budgetScoreFor(card.priceUsd, context.budget),
    complexityScore: complexityScoreFor(oracleTextComplexity(card.oracleText || card.oracle_text), context.complexity),
    powerTierScore: powerTierScoreFor(card, context.targetPowerTier),
    fieldPressureHits,
    directTribes,
    tribalSupport,
    identityHits,
    blueprintRoleHits,
    excludedRoleHits,
    mechanics: mechanics || { signals: [], produces: [], rewards: [] },
    colorPips: colorPipsFromCost(card.manaCost || card.mana_cost),
  };
}

function prepareForgeAnalysis(input, evidenceByName) {
  const blueprint = parseNativeBlueprintIntent(input);
  const context = {
    weights: STRATEGY_WEIGHTS[input.strategy] || STRATEGY_WEIGHTS["Balanced midrange"],
    commanderSignals: unique(allCommanders(input).flatMap((commander) => conceptSignals(commander))),
    terms: preferenceTerms(input),
    ideal: /Aggressive|Tempo/i.test(input.strategy) ? 2.4 : /Control/i.test(input.strategy) ? 3.2 : 2.9,
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
  return {
    context,
    cards,
    spells: eligible.filter((entry) => !entry.roles.includes("land") && !commanderNames.has(normalized(entry.card.name))),
    lands: eligible.filter((entry) => entry.roles.includes("land")).map((entry) => entry.card),
  };
}

function scoreCard(entry, input, variant, context) {
  const curveScore = Math.max(0, 10 - Math.abs(entry.cmc - context.ideal) * 3.2) * variant.curve;
  const deterministicTieBreak = (hash(`${input.seed}|${variant.id}|${entry.card.name}`) % 1000) / 100000;
  return {
    card: entry.card,
    roles: entry.roles,
    cmc: entry.cmc,
    score: entry.roleScore + entry.synergyHits * 7 * variant.synergy + entry.synergyPotential * 1.5 * variant.synergy + entry.preferenceHits * 3.5 + entry.directTribes.length * 34 + entry.tribalSupport.length * 13 + entry.blueprintRoleHits.length * 12 + entry.fieldPressureHits * 4 + curveScore + entry.resilienceRoles * 3 * variant.resilience + entry.evidenceScore + entry.discovery + entry.popularityScore + entry.budgetScore + entry.complexityScore + entry.powerTierScore + deterministicTieBreak,
    synergyHits: entry.synergyHits,
    synergyPotential: entry.synergyPotential,
    preferenceHits: entry.preferenceHits,
    fieldPressureHits: entry.fieldPressureHits,
    directTribes: entry.directTribes,
    tribalSupport: entry.tribalSupport,
    identityHits: entry.identityHits,
    blueprintRoleHits: entry.blueprintRoleHits,
    mechanics: entry.mechanics,
    colorPips: entry.colorPips,
  };
}

function roleTargets(format, strategy) {
  const commander = format === "Commander" || format === "Brawl";
  const scale = commander ? 1 : 0.55;
  const control = /Control/i.test(strategy);
  return {
    ramp: Math.round(10 * scale),
    draw: Math.round(10 * scale),
    interaction: Math.round((control ? 13 : 10) * scale),
    protection: Math.round(5 * scale),
    recursion: Math.round(4 * scale),
    sweeper: Math.round((control ? 4 : 2) * scale),
  };
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
  const shape = /Aggressive|Tempo/i.test(strategy)
    ? CURVE_SHAPES.aggro
    : /Control/i.test(strategy)
      ? CURVE_SHAPES.control
      : CURVE_SHAPES.default;
  return Object.fromEntries(Object.entries(shape).map(([bucket, ratio]) => [bucket, Math.round(ratio * slots)]));
}

function chooseSpells(scored, slots, singleton, targets, blueprint, preset = [], curveGoals = {}) {
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
  const copies = singleton ? 1 : 4;
  let remaining = slots;

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
    for (const role of row.roles) roleCounts.set(role, (roleCounts.get(role) || 0) + quantity);
    trackMechanics(row.mechanics);
    trackCmc(row.cmc, quantity);
    remaining -= quantity;
  }

  const addCandidate = (candidate) => {
    if (!candidate || remaining <= 0 || selectedNames.has(normalized(candidate.card.name))) return false;
    const quantity = Math.min(copies, remaining);
    selected.push({
      quantity,
      name: candidate.card.name,
      roles: candidate.roles,
      score: Number(candidate.score.toFixed(3)),
      cmc: candidate.cmc,
      directTribes: candidate.directTribes,
      tribalSupport: candidate.tribalSupport,
      identityHits: candidate.identityHits,
      blueprintRoleHits: candidate.blueprintRoleHits,
      mechanics: candidate.mechanics,
      colorPips: candidate.colorPips,
      // Scryfall's produced_mana exists on any permanent, not just lands —
      // a mana rock or dork is a real color source the consistency math
      // should credit, same as a land. Empty for the vast majority of
      // nonland cards that don't produce mana at all.
      producesColors: nonlandProducedColorsOf(candidate.card),
    });
    selectedNames.add(normalized(candidate.card.name));
    for (const role of candidate.roles) roleCounts.set(role, (roleCounts.get(role) || 0) + quantity);
    trackMechanics(candidate.mechanics);
    trackCmc(candidate.cmc, quantity);
    remaining -= quantity;
    return true;
  };
  const ranked = [...scored].sort((left, right) => right.score - left.score || left.card.name.localeCompare(right.card.name));

  // Explicit identity requests are construction anchors, not flavor text.
  // Direct tribe members are reserved first, then cards that support that tribe,
  // then a meaningful floor for each requested mechanical package.
  const tribeAnchorLimit = singleton ? 24 : 8;
  for (const candidate of ranked.filter((entry) => entry.directTribes.length).slice(0, tribeAnchorLimit)) addCandidate(candidate);
  const supportLimit = singleton ? 12 : 4;
  for (const candidate of ranked.filter((entry) => entry.tribalSupport.length && !entry.directTribes.length).slice(0, supportLimit)) addCandidate(candidate);
  const roleAnchorLimit = singleton ? 10 : 4;
  for (const role of blueprint.desiredRoles) {
    for (const candidate of ranked.filter((entry) => entry.blueprintRoleHits.includes(role)).slice(0, roleAnchorLimit)) addCandidate(candidate);
  }

  while (remaining > 0) {
    let candidate = null;
    let bestAdjusted = Number.NEGATIVE_INFINITY;
    for (const entry of scored) {
      if (selectedNames.has(normalized(entry.card.name))) continue;
      // Unmet targets reward a candidate; roles already well past their
      // target actively penalize one, or a strongly-weighted requested role
      // (e.g. "interaction" boosted by both strategy weight and the note
      // bonus) can win every round indefinitely and crowd out roles with no
      // note support of their own, like ramp or protection. This only
      // applies to roles that actually have a target — "threat" and every
      // other untracked role must stay neutral, or a role every creature
      // naturally carries would accrue an ever-growing penalty as the deck
      // fills in and start losing to genuinely empty filler.
      const deficit = entry.roles.reduce((sum, role) => (role in targets ? sum + ((targets[role] || 0) - (roleCounts.get(role) || 0)) * 4 : sum), 0);
      // Rewards a candidate for connecting to cards that actually made the
      // deck so far, not just ones that existed in the pool. Capped per
      // signal so one prolific pairing can't dominate every remaining pick.
      const inDeckSynergy = entry.mechanics.rewards.reduce((sum, signal) => sum + Math.min(4, producedSoFar.get(signal) || 0), 0)
        + entry.mechanics.produces.reduce((sum, signal) => sum + Math.min(4, rewardedSoFar.get(signal) || 0), 0);
      // Same fair-fill idea as the role deficit above, applied to mana cost:
      // a bucket already past its share stops competing for more (but never
      // goes punitive the way the role deficit can — a spread that's merely
      // a little heavy somewhere shouldn't get treated like a broken promise
      // the way an excluded role would).
      const bucket = curveBucket(entry.cmc);
      const curveDeficit = Math.max(0, (curveGoals[bucket] || 0) - (cmcCounts.get(bucket) || 0)) * 3;
      const adjusted = entry.score + deficit + inDeckSynergy * 2 + curveDeficit;
      if (adjusted > bestAdjusted || (adjusted === bestAdjusted && candidate && entry.card.name.localeCompare(candidate.card.name) < 0)) {
        candidate = entry;
        bestAdjusted = adjusted;
      }
    }
    if (!candidate) break;
    addCandidate(candidate);
  }
  if (remaining) throw new Error(`Native Forge could not fill ${remaining} spell slot(s)`);
  return { selected, roleCounts };
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

// log(n!) via a plain cumulative sum rather than a gamma-function
// approximation — deck sizes never exceed a few hundred cards, so the O(n)
// loop is cheap and exact enough for probabilities we're going to round to a
// percent anyway.
function logFactorial(n) {
  let sum = 0;
  for (let index = 2; index <= n; index += 1) sum += Math.log(index);
  return sum;
}
function logChoose(n, k) {
  if (k < 0 || k > n || n < 0) return -Infinity;
  return logFactorial(n) - logFactorial(k) - logFactorial(n - k);
}

// P(X >= minSuccesses) for X ~ Hypergeometric(populationSize, successStates,
// sampleSize) — e.g. "drawing at least 2 of your 9 black sources in your
// first 8 cards out of a 60-card deck." Computed in log space term-by-term
// (rather than naive factorials) so it stays numerically stable at
// Commander-sized (100-card) populations, where raw binomial coefficients
// overflow a double long before the final ratio would.
export function hypergeometricAtLeast(populationSize, successStates, sampleSize, minSuccesses) {
  const N = Math.max(0, Math.round(Number(populationSize) || 0));
  const K = Math.max(0, Math.min(N, Math.round(Number(successStates) || 0)));
  const n = Math.max(0, Math.min(N, Math.round(Number(sampleSize) || 0)));
  const min = Math.max(0, Math.round(Number(minSuccesses) || 0));
  if (min <= 0) return 1;
  const maxK = Math.min(n, K);
  if (min > maxK) return 0;
  const logDenominator = logChoose(N, n);
  let probability = 0;
  for (let k = min; k <= maxK; k += 1) {
    probability += Math.exp(logChoose(K, k) + logChoose(N - K, n - k) - logDenominator);
  }
  return clamp(probability, 0, 1);
}

// How many cards a player has seen by the turn they'd naturally cast a spell
// of this cost — opening hand plus one draw per turn, assuming the play (the
// more common, slightly less forgiving case; drawing on turn one moves this
// up by one card and is left as a deliberate simplification, not modeled
// separately).
function cardsSeenByTurn(turn) {
  return 6 + Math.max(1, Math.round(turn));
}

// Real mana math, not a heuristic: for each colored-pip spell in the built
// deck, what's the actual probability of having enough sources of every
// color it needs by the turn it wants to be cast? Land rows count via
// colorIdentity (a stand-in for "produces this color," accurate for real
// duals/fetches/basics but would overcredit a land that merely shares a
// color identity without actually tapping for it — no such lands exist in
// the current pool-selection logic). Nonland rows count via producesColors
// (Scryfall's produced_mana, threaded through at selection time) — a mana
// rock or dork is a real, static color source the same way a land is; this
// deliberately doesn't model WHEN it came down (a rock cast turn 3 isn't
// actually a source turn 1), matching the same whole-game simplification
// already made for lands. Multi-color requirements use the minimum across
// colors, a marginal-probability approximation rather than a true joint
// distribution (the two draws aren't independent) — deliberately
// conservative-leaning, not exact.
export function manaConsistencyReport(rows, deckSize) {
  const sourcesByColor = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  for (const row of rows) {
    const produces = row.roles?.includes("land") ? row.colorIdentity : row.producesColors;
    for (const color of produces || []) {
      if (color in sourcesByColor) sourcesByColor[color] += row.quantity;
    }
  }
  const cards = [];
  for (const row of rows) {
    if (row.roles?.includes("land")) continue;
    const neededColors = Object.entries(row.colorPips || {}).filter(([, count]) => count > 0);
    if (!neededColors.length) continue;
    const turn = Math.max(1, Math.round(row.cmc));
    const draws = cardsSeenByTurn(turn);
    const probability = Math.min(
      ...neededColors.map(([color, count]) => hypergeometricAtLeast(deckSize, sourcesByColor[color] || 0, draws, count)),
    );
    cards.push({ name: row.name, turn, colors: neededColors.map(([color]) => color), probability: Number(probability.toFixed(3)) });
  }
  const overall = cards.length ? cards.reduce((sum, entry) => sum + entry.probability, 0) / cards.length : 1;
  const risky = [...cards].sort((left, right) => left.probability - right.probability).filter((entry) => entry.probability < 0.8);
  return { overall: Number(clamp(overall, 0, 1).toFixed(3)), sourcesByColor, cards, risky };
}

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
  return card.producedMana || card.colorIdentity || card.color_identity || [];
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
  const colorFit = (card) => {
    const produced = producedColorsOf(card);
    return produced.reduce((sum, color) => sum + (pipTotals[color] || 0), 0) / totalPips;
  };
  const rankedLands = lands
    .filter((card) => {
      const identity = card.colorIdentity || card.color_identity || [];
      return identity.every((color) => colors.includes(color)) && !presetLandNames.has(normalized(card.name));
    })
    .sort((left, right) => {
      const leftText = normalized(cardText(left));
      const rightText = normalized(cardText(right));
      // Lands ride through the same edhrec-ordered fetch as spells and
      // already carry a popularityRank from it — a well-adopted dual
      // (Godless Shrine) previously ranked identically to an obscure
      // equal-color-fit land nobody plays, since only color fit and text
      // heuristics were scored. Same signal, same scale, as spell scoring.
      const leftScore = (leftText.includes("enters the battlefield tapped") ? -4 : 2) + (leftText.includes("add") ? 2 : 0) + colorFit(left) * 4 + popularityScoreFromRank(left.popularityRank) + (hash(`${input.seed}|${variant.id}|${left.name}`) % 100) / 10000;
      const rightScore = (rightText.includes("enters the battlefield tapped") ? -4 : 2) + (rightText.includes("add") ? 2 : 0) + colorFit(right) * 4 + popularityScoreFromRank(right.popularityRank) + (hash(`${input.seed}|${variant.id}|${right.name}`) % 100) / 10000;
      return rightScore - leftScore || left.name.localeCompare(right.name);
    });
  const nonbasicLimit = Math.min(lands.length, singleton ? Math.min(landSlots - 18, 18) : 6);
  for (const land of rankedLands.slice(0, nonbasicLimit)) {
    const used = rows.reduce((sum, row) => sum + row.quantity, 0);
    if (used >= landSlots) break;
    rows.push({ quantity: singleton ? 1 : Math.min(4, landSlots - used), name: land.name, roles: ["land"], score: 0, cmc: 0, colorIdentity: producedColorsOf(land) });
  }
  const remaining = landSlots - rows.reduce((sum, row) => sum + row.quantity, 0);
  const basicCounts = proportionalBasicCounts(colors, pipTotals, remaining);
  for (const [color, count] of Object.entries(basicCounts)) {
    if (!count) continue;
    const name = BASIC_BY_COLOR[color] || "Wastes";
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
  const curveIdeal = /Aggressive|Tempo/i.test(input.strategy) ? 2.5 : /Control/i.test(input.strategy) ? 3.3 : 3;
  const curveHealth = clamp(100 - Math.abs(averageCmc - curveIdeal) * 24);
  const cohesion = clamp(roleCoverage * 70 + multiRole * 30 + variant.synergy * 4);
  const resilience = clamp((roleCounts.get("interaction") || 0) * 2.5 + (roleCounts.get("protection") || 0) * 3 + (roleCounts.get("recursion") || 0) * 2 + variant.resilience * 12);
  const score = roleCoverage * 39 + multiRole * 18 + curveHealth * 0.19 + cohesion * 0.13 + resilience * 0.11;
  return { score: Number(score.toFixed(3)), roleCoverage: Number(roleCoverage.toFixed(3)), multiRoleDensity: Number(multiRole.toFixed(3)), averageCmc: Number(averageCmc.toFixed(2)), curveHealth: Math.round(curveHealth), cohesion: Math.round(cohesion), resilience: Math.round(resilience) };
}

function computeBlueprintAlignment(analysis, selected, singleton) {
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
    status: !analysis.context.blueprint.promises.length
      ? "no-explicit-theme"
      : analysis.context.blueprint.tribalTypes.length && !availableIdentityCards
        ? "unsupported-identity-in-verified-pool"
        : selectedIdentityCards < requiredIdentityCards || analysis.context.blueprint.desiredRoles.some(
          (role) => requestedRoleCoverage[role] < Math.min(availableRoleCoverage[role], singleton ? 8 : 4),
        )
          ? "missed-supported-blueprint"
          : "honored-best-effort",
    boundary: analysis.context.blueprint.tribalTypes.length && !availableIdentityCards
      ? `No legal card naming or carrying the ${analysis.context.blueprint.tribalTypes.join("/")} identity was present in the verified pool; the Forge preserved legality and must say so instead of inventing support.`
      : `Blueprint contract reserved ${selectedIdentityCards}/${requiredIdentityCards} required identity cards before general optimization; legality and minimum deck function remained binding.`,
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
  const theoreticalOptions = { format: input.format, strategy: input.strategy, target: input.target, ...options, limit: Math.min(PRACTICAL_POOL_CAP, limit + 3) };
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
  const theoreticalOptions = { format: input.format, strategy: input.strategy, target: input.target, ...options };
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

function buildCandidate(input, variant, analysis) {
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
    ? chooseSpells(scored, baselineSpellSlots, singleton, targets, analysis.context.blueprint, [], curveTargets(input.strategy, baselineSpellSlots))
    : null;
  const landSlots = singleton
    ? clamp(
        baselineLandSlots + curveAwareLandAdjustment(preliminary.selected),
        Math.round(target * 0.32),
        Math.round(target * 0.42),
      )
    : baselineLandSlots;
  const spellSlots = target - landSlots - commanderSlots;
  const { selected, roleCounts } = spellSlots === baselineSpellSlots && preliminary
    ? preliminary
    : chooseSpells(scored, spellSlots, singleton, targets, analysis.context.blueprint, [], curveTargets(input.strategy, spellSlots));
  const mana = buildManaBase(input, landSlots, lands, variant, [], aggregatePipTotals(selected), selected);
  const rows = [
    ...allCommanders(input).map((commander) => ({ quantity: 1, name: commander.name, roles: ["commander"], score: 100, cmc: manaValueFromCost(commander.manaCost, commander.cmc) })),
    ...selected,
    ...mana,
  ];
  const evaluation = evaluateCandidate(rows, roleCounts, input, variant);
  const blueprintAlignment = computeBlueprintAlignment(analysis, selected, singleton);
  return {
    id: variant.id,
    label: variant.label,
    rows,
    deckText: rows.map((row) => `${row.quantity} ${row.name}`).join("\n"),
    evaluation,
    blueprintAlignment,
    score: evaluation.score,
    sideboard: sideboardFor(scored, selected, singleton),
    boundary: "Native structural candidate. Legality and simulations are hard gates; real match performance remains unproven.",
  };
}

// Reserves the player's own imported card names first (capped at the copy
// limit and exact deck size), then fills any remaining gaps with the same
// scoring/anchoring logic buildCandidate uses. Guarantees a legal, complete
// deck by construction rather than hoping the pasted list happens to work.
function buildImportedCandidate(input, analysis) {
  const target = input.target || (["Commander", "Brawl"].includes(input.format) ? 100 : 60);
  const singleton = ["Commander", "Brawl", "Standard Brawl"].includes(input.format);
  const commanderSlots = allCommanders(input).length;
  const commanderNames = commanderNamesNormalized(input);

  const spellByName = new Map(analysis.spells.map((entry) => [normalized(entry.card.name), entry]));
  const landByName = new Map(analysis.lands.map((card) => [normalized(card.name), card]));
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
      directTribes: spellEntry.directTribes,
      tribalSupport: spellEntry.tribalSupport,
      identityHits: spellEntry.identityHits,
      blueprintRoleHits: spellEntry.blueprintRoleHits,
      mechanics: spellEntry.mechanics,
      colorPips: spellEntry.colorPips,
      producesColors: nonlandProducedColorsOf(spellEntry.card),
    });
  }
  if (!presetSpellRows.length && !presetLandRows.length) {
    throw new Error("None of the submitted cards could be matched to the verified pool");
  }

  // The player's own submitted spells are the real curve/ramp signal here
  // — more precise than the candidate-pool estimate buildCandidate has to
  // fall back on, since we already know exactly what's going in the deck.
  const baselineLandSlots = singleton ? Math.round(target * 0.37) : Math.round(target * 0.4);
  const landSlots = singleton
    ? clamp(
        baselineLandSlots + curveAwareLandAdjustment(presetSpellRows),
        Math.round(target * 0.32),
        Math.round(target * 0.42),
      )
    : baselineLandSlots;

  // Preset rows are reserved unconditionally, so this variant only shapes
  // which cards fill any slots the player's list didn't already occupy.
  const variant = { id: "imported", label: "Your List", synergy: 1, resilience: 1, curve: 1 };
  const scored = analysis.spells.map((entry) => scoreCard(entry, input, variant, analysis.context));
  const spellSlots = target - landSlots - commanderSlots;
  const { selected, roleCounts } = chooseSpells(scored, spellSlots, singleton, roleTargets(input.format, input.strategy), analysis.context.blueprint, presetSpellRows, curveTargets(input.strategy, spellSlots));
  const mana = buildManaBase(input, landSlots, analysis.lands, variant, presetLandRows, aggregatePipTotals(selected), selected);
  const rows = [
    ...allCommanders(input).map((commander) => ({ quantity: 1, name: commander.name, roles: ["commander"], score: 100, cmc: manaValueFromCost(commander.manaCost, commander.cmc) })),
    ...selected,
    ...mana,
  ];
  const evaluation = evaluateCandidate(rows, roleCounts, input, variant);
  const blueprintAlignment = computeBlueprintAlignment(analysis, selected, singleton);
  return {
    id: variant.id,
    label: variant.label,
    rows,
    deckText: rows.map((row) => `${row.quantity} ${row.name}`).join("\n"),
    evaluation,
    blueprintAlignment,
    score: evaluation.score,
    sideboard: sideboardFor(scored, selected, singleton),
    boundary: "Adapted directly from your submitted list. Legality and simulations are hard gates; real match performance remains unproven.",
  };
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
        const merit = evaluation.score * 100 + candidate.scored.score + restorationMerit;
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
    return {
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
    };
  });
  packages.sort((left, right) =>
    right.context.preservationScore - left.context.preservationScore ||
    right.evaluation.score - left.evaluation.score ||
    left.id.localeCompare(right.id),
  );
  return Object.freeze({ packages });
}

export function forgeNativeMasterwork(input) {
  if (!input || !Array.isArray(input.cards) || !input.cards.length) throw new Error("Native Forge requires a verified card pool");
  const evidenceByName = new Map((input.evidence || []).map((entry) => [normalized(entry.name), entry]));
  const analysis = prepareForgeAnalysis(input, evidenceByName);
  const candidates = VARIANTS.map((variant) => buildCandidate(input, variant, analysis));
  const structuralTournament = runNativeMasterworkTournament(candidates, { format: input.format, target: input.target });
  const { tournament, practicalTiebreak } = applyPracticalTiebreak(structuralTournament, candidates, input);
  const verdictById = new Map(tournament.results.map((result) => [result.id, result]));
  let ranked = candidates
    .map((candidate) => ({ ...candidate, tournament: verdictById.get(candidate.id) }))
    .sort((left, right) => right.tournament.tournamentScore - left.tournament.tournamentScore || left.id.localeCompare(right.id));
  let selected = ranked.find((candidate) => candidate.id === tournament.selectedId);

  let structuralCards = buildSelectedStructuralCards(selected, input);
  let structuralAnalysis = buildForgeStructuralAnalysis(structuralCards, { commanderName: input.commander?.name || "" });
  let powerSignal = ["Commander", "Brawl", "Standard Brawl"].includes(input.format) ? evaluateCommanderPowerSignal(structuralCards, structuralAnalysis.graph) : null;
  let powerAudit = null;

  // Requested tier is a construction-time bias (powerTierScoreFor above),
  // never a hard exclusion — so a thin pool, or role/curve requirements
  // that outweigh the bias, can still finish somewhere other than
  // requested. A Casual request that measured materially higher gets one
  // real rebuild attempt, excluding exactly the flagged high-ceiling
  // cards from the eligible pool and re-selecting for the same variant.
  // Any other direction of mismatch (a High-Power/Maximum request that
  // measured lower, say — often just an honest reflection of a thin
  // pool, not a defect) is disclosed, never silently forced upward.
  if (powerSignal && input.targetPowerTier) {
    const audit = auditPowerTier(powerSignal, input.targetPowerTier);
    powerAudit = audit;
    if (audit?.mismatch && audit.direction === "higherThanRequested" && input.targetPowerTier === "Casual") {
      const variant = VARIANTS.find((entry) => entry.id === selected.id);
      const rebuilt = rebuildExcludingHighCeilingCards(input, variant, analysis, powerSignal.highCeilingCards);
      if (rebuilt) {
        const rebuiltStructuralCards = buildSelectedStructuralCards(rebuilt, input);
        const rebuiltStructuralAnalysis = buildForgeStructuralAnalysis(rebuiltStructuralCards, { commanderName: input.commander?.name || "" });
        const rebuiltPowerSignal = evaluateCommanderPowerSignal(rebuiltStructuralCards, rebuiltStructuralAnalysis.graph);
        const rebuiltAudit = auditPowerTier(rebuiltPowerSignal, input.targetPowerTier);
        const improved = POWER_TIER_INDEX[rebuiltPowerSignal.tier] < POWER_TIER_INDEX[powerSignal.tier];
        if (improved) {
          // The rebuilt candidate replaces the delivered decklist even
          // when it only partially closes the gap (Maximum -> High-Power
          // while targeting Casual, say) — "rebuild within the
          // constraint when possible" means take the real improvement,
          // never discard it just because it fell short. rebuildImproved
          // and rebuildReachedTarget stay independently honest either way.
          const rebuiltCandidate = { ...selected, ...rebuilt, id: selected.id, tournament: selected.tournament };
          ranked = ranked.map((candidate) => (candidate.id === selected.id ? rebuiltCandidate : candidate));
          selected = rebuiltCandidate;
          structuralCards = rebuiltStructuralCards;
          structuralAnalysis = rebuiltStructuralAnalysis;
          powerSignal = rebuiltPowerSignal;
          powerAudit = { ...rebuiltAudit, rebuildAttempted: true, rebuildImproved: true, rebuildReachedTarget: !rebuiltAudit.mismatch, originalMeasuredTier: audit.measured };
        } else {
          // The rebuild ran but produced no real improvement (a thin
          // pool with no legal alternative worth shipping) — the
          // original, pre-rebuild candidate stays delivered, and the
          // audit says so honestly rather than claiming any progress.
          powerAudit = { ...audit, rebuildAttempted: true, rebuildImproved: false, rebuildReachedTarget: false };
        }
      } else {
        powerAudit = { ...audit, rebuildAttempted: false, rebuildImproved: false, rebuildReachedTarget: false };
      }
    }
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

  return Object.freeze({
    engine: "metaforge-native-masterwork-v6",
    selected,
    candidates: ranked,
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

    methodology: `MetaForge analyzed each verified card once, reserved explicit Blueprint identity before general optimization, filled minimum deck-function requirements, assembled three complete structural tempers, applied hard rejection gates, advanced a nondominated Blueprint tradeoff, compared it with the closest viable rival, and exhaustively gated exact one-slot experiments.${selected.blueprintAlignment.requested.length ? ` Blueprint promise: ${selected.blueprintAlignment.requested.join(", ")} — ${selected.blueprintAlignment.status.replaceAll("-", " ")}.` : ""}`,
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
  if (!importedResult?.gate.passed) {
    throw new Error(`Native Forge could not adapt your list into a legal ${input.format} deck: ${importedResult?.gate.reasons.join(" ") || "an unexpected structural gate failure"}`);
  }

  const forcedTournament = tournament.selectedId === imported.id ? tournament : Object.freeze({
    ...tournament,
    selectedId: imported.id,
    results: tournament.results.map((result) => result.id === imported.id
      ? { ...result, verdict: "advance", reason: `${imported.label} is adapted directly from your submitted list; the Forge preserves it rather than substituting its own optimization.` }
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
    changes: Object.freeze(changes),
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
