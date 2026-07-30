import { runNativeMasterworkTournament } from "./native-masterwork-tournament.mjs";
import { explainNativeMasterworkDecision } from "./native-masterwork-reasoning.mjs";
import { runOneSlotCounterfactualLab } from "./native-one-slot-lab.mjs";

import {
  buildForgeStructuralAnalysis,
} from "./forge-structural-pipeline.mjs";

import {
  createForgeRecommendationRecord,
} from "./forge-recommendation-ledger.mjs";

import {
  extractMechanicalSignals,
} from "./forge-interaction-graph.mjs";

import {
  getMetaIntelligence,
} from "./meta-intelligence.mjs";

// MetaForge Native Masterwork Engine
// Card facts may come from verified catalogs; every construction and ranking
// decision in this module is deterministic and owned by MetaForge.

const BASIC_BY_COLOR = Object.freeze({
  W: "Plains", U: "Island", B: "Swamp", R: "Mountain", G: "Forest", C: "Wastes",
});
const BASIC_LAND_NAMES = Object.freeze(["Plains", "Island", "Swamp", "Mountain", "Forest", "Wastes"]);
const isBasicLandName = (name = "") => BASIC_LAND_NAMES.some((basic) => basic.toLowerCase() === String(name).trim().toLowerCase());

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
});

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
    ...(input.commander
      ? [input.commander]
      : []),
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

  const commanderName =
    normalized(
      input.commander?.name,
    );

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
        normalized(row.name) ===
        commanderName,
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

export function classifyNativeCard(card) {
  const typeLine = String(card.typeLine || card.type_line || "");
  const text = cardText(card);
  const roles = [];
  if (/\bLand\b/i.test(typeLine)) roles.push("land");
  for (const [role, patterns] of Object.entries(ROLE_PATTERNS)) {
    if (patterns.some((pattern) => pattern.test(text))) roles.push(role);
  }
  if (!roles.includes("land") && (/\bCreature\b|Planeswalker/i.test(typeLine) || /you win the game/i.test(text))) roles.push("threat");
  return unique(roles);
}

function conceptSignals(text = "") {
  const source = normalized(text);
  return Object.keys(ROLE_PATTERNS).filter((role) => ROLE_PATTERNS[role].some((pattern) => pattern.test(source)));
}

function preferenceTerms(input) {
  const ignored = new Set(["this", "that", "with", "from", "your", "deck", "cards", "card", "want", "play", "forge", "must", "never", "should"]);
  return unique(normalized(`${input.strategy} ${input.path} ${input.note} ${input.commander?.oracleText || ""}`)
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
    roleScore: roles.reduce((sum, role) => sum + (context.weights[role] || (role === "threat" ? 7 : 2)), 0),
    synergyHits: roles.filter((role) => context.commanderSignals.includes(role)).length,
    synergyPotential: synergyPotentialFor(mechanics, poolSignals),
    preferenceHits: context.terms.filter((term) => text.includes(term)).length,
    resilienceRoles: roles.filter((role) => ["draw", "protection", "recursion", "interaction"].includes(role)).length,
    evidenceScore: clamp(Number(evidence.evidenceScore || 0) * 100) * 0.12,
    discovery: evidence.newCardPotential ? 2 : 0,
    popularityScore: popularityScoreFromRank(card.popularityRank),
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
    commanderSignals: conceptSignals(input.commander?.oracleText || ""),
    terms: preferenceTerms(input),
    ideal: /Aggressive|Tempo/i.test(input.strategy) ? 2.4 : /Control/i.test(input.strategy) ? 3.2 : 2.9,
    blueprint,
    fieldCounterRoles: fieldCounterRolesFor(input.format, getMetaIntelligence()),
  };
  const commanderName = normalized(input.commander?.name);
  const poolSignals = poolMechanicalSignals(input.cards);
  const cards = input.cards.map((card, index) =>
    analyzeCard(card, context, evidenceByName, poolSignals.mechanicsByIndex[index], poolSignals));
  // A stated exclusion ("no sacrifice") is a hard constraint, not a scoring
  // nudge — the commission promises the deck "must never become" it. Cards
  // are dropped from candidacy entirely rather than merely deprioritized,
  // so an unsatisfiable exclusion surfaces as the existing "could not fill
  // N spell slot(s)" error instead of silently breaking the promise.
  const eligible = cards.filter((entry) => !entry.excludedRoleHits.length);
  return {
    context,
    cards,
    spells: eligible.filter((entry) => !entry.roles.includes("land") && normalized(entry.card.name) !== commanderName),
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
    score: entry.roleScore + entry.synergyHits * 7 * variant.synergy + entry.synergyPotential * 1.5 * variant.synergy + entry.preferenceHits * 3.5 + entry.directTribes.length * 34 + entry.tribalSupport.length * 13 + entry.blueprintRoleHits.length * 12 + entry.fieldPressureHits * 4 + curveScore + entry.resilienceRoles * 3 * variant.resilience + entry.evidenceScore + entry.discovery + entry.popularityScore + deterministicTieBreak,
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

function buildManaBase(input, landSlots, lands, variant, presetLands = [], pipTotals = {}) {
  const colors = input.commander?.colors?.length ? input.commander.colors : input.colors?.length ? input.colors : ["W", "U", "B", "R", "G"];
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
    else rows.push({ quantity, name: land.name, roles: ["land"], score: 0, cmc: 0 });
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
    const identity = card.colorIdentity || card.color_identity || [];
    return identity.reduce((sum, color) => sum + (pipTotals[color] || 0), 0) / totalPips;
  };
  const rankedLands = lands
    .filter((card) => {
      const identity = card.colorIdentity || card.color_identity || [];
      return identity.every((color) => colors.includes(color)) && !presetLandNames.has(normalized(card.name));
    })
    .sort((left, right) => {
      const leftText = normalized(cardText(left));
      const rightText = normalized(cardText(right));
      const leftScore = (leftText.includes("enters the battlefield tapped") ? -4 : 2) + (leftText.includes("add") ? 2 : 0) + colorFit(left) * 4 + (hash(`${input.seed}|${variant.id}|${left.name}`) % 100) / 10000;
      const rightScore = (rightText.includes("enters the battlefield tapped") ? -4 : 2) + (rightText.includes("add") ? 2 : 0) + colorFit(right) * 4 + (hash(`${input.seed}|${variant.id}|${right.name}`) % 100) / 10000;
      return rightScore - leftScore || left.name.localeCompare(right.name);
    });
  const nonbasicLimit = Math.min(lands.length, singleton ? Math.min(landSlots - 18, 18) : 6);
  for (const land of rankedLands.slice(0, nonbasicLimit)) {
    const used = rows.reduce((sum, row) => sum + row.quantity, 0);
    if (used >= landSlots) break;
    rows.push({ quantity: singleton ? 1 : Math.min(4, landSlots - used), name: land.name, roles: ["land"], score: 0, cmc: 0 });
  }
  const remaining = landSlots - rows.reduce((sum, row) => sum + row.quantity, 0);
  const basicCounts = proportionalBasicCounts(colors, pipTotals, remaining);
  for (const [color, count] of Object.entries(basicCounts)) {
    if (!count) continue;
    const name = BASIC_BY_COLOR[color] || "Wastes";
    const existing = rows.find((row) => row.name === name);
    if (existing) existing.quantity += count;
    else rows.push({ quantity: count, name, roles: ["land"], score: 0, cmc: 0 });
  }
  return rows;
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

function buildCandidate(input, variant, analysis) {
  const target = input.target || (["Commander", "Brawl"].includes(input.format) ? 100 : 60);
  const singleton = ["Commander", "Brawl", "Standard Brawl"].includes(input.format);
  const commanderSlots = input.commander ? 1 : 0;
  const landSlots = singleton ? Math.round(target * 0.37) : Math.round(target * 0.4);
  const spells = analysis.spells;
  const lands = analysis.lands;
  const scored = spells.map((entry) => scoreCard(entry, input, variant, analysis.context));
  const spellSlots = target - landSlots - commanderSlots;
  const { selected, roleCounts } = chooseSpells(scored, spellSlots, singleton, roleTargets(input.format, input.strategy), analysis.context.blueprint, [], curveTargets(input.strategy, spellSlots));
  const mana = buildManaBase(input, landSlots, lands, variant, [], aggregatePipTotals(selected));
  const rows = [
    ...(input.commander ? [{ quantity: 1, name: input.commander.name, roles: ["commander"], score: 100, cmc: manaValueFromCost(input.commander.manaCost, input.commander.cmc) }] : []),
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
  const commanderSlots = input.commander ? 1 : 0;
  const landSlots = singleton ? Math.round(target * 0.37) : Math.round(target * 0.4);
  const commanderName = normalized(input.commander?.name);

  const spellByName = new Map(analysis.spells.map((entry) => [normalized(entry.card.name), entry]));
  const landByName = new Map(analysis.lands.map((card) => [normalized(card.name), card]));
  const presetSpellRows = [];
  const presetLandRows = [];
  for (const row of input.importedRows) {
    const key = normalized(row.name);
    if (key === commanderName) continue;
    const landCard = landByName.get(key);
    if (landCard) {
      presetLandRows.push({ quantity: row.quantity, name: landCard.name });
      continue;
    }
    if (isBasicLandName(row.name)) {
      // Basic lands are always legal and don't need to appear in the
      // verified pool — the Forge already synthesizes them on demand.
      presetLandRows.push({ quantity: row.quantity, name: BASIC_LAND_NAMES.find((basic) => basic.toLowerCase() === row.name.trim().toLowerCase()) });
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
    });
  }
  if (!presetSpellRows.length && !presetLandRows.length) {
    throw new Error("None of the submitted cards could be matched to the verified pool");
  }

  // Preset rows are reserved unconditionally, so this variant only shapes
  // which cards fill any slots the player's list didn't already occupy.
  const variant = { id: "imported", label: "Your List", synergy: 1, resilience: 1, curve: 1 };
  const scored = analysis.spells.map((entry) => scoreCard(entry, input, variant, analysis.context));
  const spellSlots = target - landSlots - commanderSlots;
  const { selected, roleCounts } = chooseSpells(scored, spellSlots, singleton, roleTargets(input.format, input.strategy), analysis.context.blueprint, presetSpellRows, curveTargets(input.strategy, spellSlots));
  const mana = buildManaBase(input, landSlots, analysis.lands, variant, presetLandRows, aggregatePipTotals(selected));
  const rows = [
    ...(input.commander ? [{ quantity: 1, name: input.commander.name, roles: ["commander"], score: 100, cmc: manaValueFromCost(input.commander.manaCost, input.commander.cmc) }] : []),
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

export function forgeNativeMasterwork(input) {
  if (!input || !Array.isArray(input.cards) || !input.cards.length) throw new Error("Native Forge requires a verified card pool");
  const evidenceByName = new Map((input.evidence || []).map((entry) => [normalized(entry.name), entry]));
  const analysis = prepareForgeAnalysis(input, evidenceByName);
  const candidates = VARIANTS.map((variant) => buildCandidate(input, variant, analysis));
  const tournament = runNativeMasterworkTournament(candidates, { format: input.format, target: input.target });
  const verdictById = new Map(tournament.results.map((result) => [result.id, result]));
  const ranked = candidates
    .map((candidate) => ({ ...candidate, tournament: verdictById.get(candidate.id) }))
    .sort((left, right) => right.tournament.tournamentScore - left.tournament.tournamentScore || left.id.localeCompare(right.id));
  const selected = ranked.find((candidate) => candidate.id === tournament.selectedId);
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

  const structuralCards =
    buildSelectedStructuralCards(
      selected,
      input,
    );

  const structuralAnalysis =
    buildForgeStructuralAnalysis(
      structuralCards,
      {
        commanderName:
          input.commander?.name || "",
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
    reasoning,
    laboratory,
    structuralAnalysis,
    recommendationRecord,
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
    recommendationRecord,
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
