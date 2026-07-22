import { runNativeMasterworkTournament } from "./native-masterwork-tournament.mjs";
import { explainNativeMasterworkDecision } from "./native-masterwork-reasoning.mjs";
import { runOneSlotCounterfactualLab } from "./native-one-slot-lab.mjs";

// MetaForge Native Masterwork Engine
// Card facts may come from verified catalogs; every construction and ranking
// decision in this module is deterministic and owned by MetaForge.

const BASIC_BY_COLOR = Object.freeze({
  W: "Plains", U: "Island", B: "Swamp", R: "Mountain", G: "Forest", C: "Wastes",
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
});

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
  const desiredRoles = conceptSignals(source);
  const requestedTerms = unique(
    source
      .split(/[^a-z0-9+'/-]+/)
      .filter((term) => term.length >= 4 && !BLUEPRINT_FILLER_WORDS.has(term)),
  );
  const promises = [
    ...tribalTypes.map((type) => `${type} typal`),
    ...desiredRoles.map((role) => role === "counters" ? "+1/+1 counter growth" : role),
  ];
  return Object.freeze({ source, tribalTypes, desiredRoles, requestedTerms, promises: unique(promises) });
}

function manaValueFromCost(cost = "", fallback = 0) {
  const symbols = [...String(cost).matchAll(/\{([^}]+)\}/g)].map((match) => match[1]);
  if (!symbols.length) return Number(fallback) || 0;
  return symbols.reduce((sum, symbol) => sum + (/^\d+$/.test(symbol) ? Number(symbol) : /^(X|Y|Z)$/.test(symbol) ? 0 : 1), 0);
}

function cardText(card) {
  return `${card.name || ""}\n${card.typeLine || card.type_line || ""}\n${card.oracleText || card.oracle_text || ""}\n${(card.keywords || []).join(" ")}`;
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

function analyzeCard(card, context, evidenceByName) {
  const roles = classifyNativeCard(card);
  const text = normalized(cardText(card));
  const evidence = evidenceByName.get(normalized(card.name)) || {};
  const typeLine = normalized(card.typeLine || card.type_line || "");
  const directTribes = context.blueprint.tribalTypes.filter((tribe) =>
    new RegExp(`(?:^|[^a-z])${tribe}(?:$|[^a-z])`, "i").test(typeLine),
  );
  const tribalSupport = context.blueprint.tribalTypes.filter((tribe) =>
    text.includes(tribe) ||
    /choose a creature type|creature type of your choice|creatures? you control of the chosen type|changeling|kindred/i.test(text),
  );
  const blueprintRoleHits = roles.filter((role) => context.blueprint.desiredRoles.includes(role));
  return {
    card,
    roles,
    text,
    cmc: manaValueFromCost(card.manaCost || card.mana_cost, card.cmc),
    roleScore: roles.reduce((sum, role) => sum + (context.weights[role] || (role === "threat" ? 7 : 2)), 0),
    synergyHits: roles.filter((role) => context.commanderSignals.includes(role)).length,
    preferenceHits: context.terms.filter((term) => text.includes(term)).length,
    resilienceRoles: roles.filter((role) => ["draw", "protection", "recursion", "interaction"].includes(role)).length,
    evidenceScore: clamp(Number(evidence.evidenceScore || 0) * 100) * 0.12,
    discovery: evidence.newCardPotential ? 2 : 0,
    directTribes,
    tribalSupport,
    blueprintRoleHits,
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
  };
  const commanderName = normalized(input.commander?.name);
  const cards = input.cards.map((card) => analyzeCard(card, context, evidenceByName));
  return {
    context,
    cards,
    spells: cards.filter((entry) => !entry.roles.includes("land") && normalized(entry.card.name) !== commanderName),
    lands: cards.filter((entry) => entry.roles.includes("land")).map((entry) => entry.card),
  };
}

function scoreCard(entry, input, variant, context) {
  const curveScore = Math.max(0, 10 - Math.abs(entry.cmc - context.ideal) * 3.2) * variant.curve;
  const deterministicTieBreak = (hash(`${input.seed}|${variant.id}|${entry.card.name}`) % 1000) / 100000;
  return {
    card: entry.card,
    roles: entry.roles,
    cmc: entry.cmc,
    score: entry.roleScore + entry.synergyHits * 7 * variant.synergy + entry.preferenceHits * 3.5 + entry.directTribes.length * 34 + entry.tribalSupport.length * 13 + entry.blueprintRoleHits.length * 12 + curveScore + entry.resilienceRoles * 3 * variant.resilience + entry.evidenceScore + entry.discovery + deterministicTieBreak,
    synergyHits: entry.synergyHits,
    preferenceHits: entry.preferenceHits,
    directTribes: entry.directTribes,
    tribalSupport: entry.tribalSupport,
    blueprintRoleHits: entry.blueprintRoleHits,
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

function chooseSpells(scored, slots, singleton, targets, blueprint) {
  const selected = [];
  const selectedNames = new Set();
  const roleCounts = new Map();
  const copies = singleton ? 1 : 4;
  let remaining = slots;
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
      blueprintRoleHits: candidate.blueprintRoleHits,
    });
    selectedNames.add(normalized(candidate.card.name));
    for (const role of candidate.roles) roleCounts.set(role, (roleCounts.get(role) || 0) + quantity);
    remaining -= quantity;
    return true;
  };
  const ranked = [...scored].sort((left, right) => right.score - left.score || left.card.name.localeCompare(right.card.name));

  // Explicit identity requests are construction anchors, not flavor text.
  // Direct tribe members are reserved first, then cards that support that tribe,
  // then a meaningful floor for each requested mechanical package.
  const tribeAnchorLimit = singleton ? 18 : 8;
  for (const candidate of ranked.filter((entry) => entry.directTribes.length).slice(0, tribeAnchorLimit)) addCandidate(candidate);
  const supportLimit = singleton ? 6 : 3;
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
      const deficit = entry.roles.reduce((sum, role) => sum + Math.max(0, (targets[role] || 0) - (roleCounts.get(role) || 0)) * 4, 0);
      const adjusted = entry.score + deficit;
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

function buildManaBase(input, landSlots, lands, variant) {
  const colors = input.commander?.colors?.length ? input.commander.colors : input.colors?.length ? input.colors : ["W", "U", "B", "R", "G"];
  const rankedLands = lands
    .filter((card) => {
      const identity = card.colorIdentity || card.color_identity || [];
      return identity.every((color) => colors.includes(color));
    })
    .sort((left, right) => {
      const leftText = normalized(cardText(left));
      const rightText = normalized(cardText(right));
      const leftScore = (leftText.includes("enters the battlefield tapped") ? -4 : 2) + (leftText.includes("add") ? 2 : 0) + (hash(`${input.seed}|${variant.id}|${left.name}`) % 100) / 10000;
      const rightScore = (rightText.includes("enters the battlefield tapped") ? -4 : 2) + (rightText.includes("add") ? 2 : 0) + (hash(`${input.seed}|${variant.id}|${right.name}`) % 100) / 10000;
      return rightScore - leftScore || left.name.localeCompare(right.name);
    });
  const singleton = ["Commander", "Brawl", "Standard Brawl"].includes(input.format);
  const rows = [];
  const nonbasicLimit = Math.min(lands.length, singleton ? Math.min(landSlots - 18, 18) : 6);
  for (const land of rankedLands.slice(0, nonbasicLimit)) rows.push({ quantity: singleton ? 1 : Math.min(4, landSlots - rows.reduce((sum, row) => sum + row.quantity, 0)), name: land.name, roles: ["land"], score: 0, cmc: 0 });
  let remaining = landSlots - rows.reduce((sum, row) => sum + row.quantity, 0);
  for (let index = 0; remaining > 0; index += 1) {
    const name = BASIC_BY_COLOR[colors[index % colors.length]] || "Wastes";
    const existing = rows.find((row) => row.name === name);
    if (existing) existing.quantity += 1;
    else rows.push({ quantity: 1, name, roles: ["land"], score: 0, cmc: 0 });
    remaining -= 1;
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

function buildCandidate(input, variant, analysis) {
  const target = input.target || (["Commander", "Brawl"].includes(input.format) ? 100 : 60);
  const singleton = ["Commander", "Brawl", "Standard Brawl"].includes(input.format);
  const commanderSlots = input.commander ? 1 : 0;
  const landSlots = singleton ? Math.round(target * 0.37) : Math.round(target * 0.4);
  const spells = analysis.spells;
  const lands = analysis.lands;
  const scored = spells.map((entry) => scoreCard(entry, input, variant, analysis.context));
  const { selected, roleCounts } = chooseSpells(scored, target - landSlots - commanderSlots, singleton, roleTargets(input.format, input.strategy), analysis.context.blueprint);
  const mana = buildManaBase(input, landSlots, lands, variant);
  const rows = [
    ...(input.commander ? [{ quantity: 1, name: input.commander.name, roles: ["commander"], score: 100, cmc: manaValueFromCost(input.commander.manaCost, input.commander.cmc) }] : []),
    ...selected,
    ...mana,
  ];
  const evaluation = evaluateCandidate(rows, roleCounts, input, variant);
  const availableTribeCards = analysis.spells.filter((entry) => entry.directTribes.length).length;
  const selectedTribeCards = selected.filter((entry) => entry.directTribes.length).length;
  const requestedRoleCoverage = Object.fromEntries(
    analysis.context.blueprint.desiredRoles.map((role) => [
      role,
      selected.filter((entry) => entry.blueprintRoleHits.includes(role)).reduce((sum, entry) => sum + entry.quantity, 0),
    ]),
  );
  const blueprintAlignment = Object.freeze({
    requested: analysis.context.blueprint.promises,
    tribalTypes: analysis.context.blueprint.tribalTypes,
    availableTribeCards,
    selectedTribeCards,
    requestedRoleCoverage,
    status: !analysis.context.blueprint.promises.length
      ? "no-explicit-theme"
      : analysis.context.blueprint.tribalTypes.length && !availableTribeCards
        ? "unsupported-tribe-in-verified-pool"
        : "honored-best-effort",
    boundary: analysis.context.blueprint.tribalTypes.length && !availableTribeCards
      ? `No legal ${analysis.context.blueprint.tribalTypes.join("/")} creature was present in the verified pool; the Forge preserved legality and must say so instead of inventing support.`
      : "Explicit Blueprint identity was reserved before general optimization; legality and minimum deck function remained binding.",
  });
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
  const laboratory = runOneSlotCounterfactualLab(selected, ranked, reasoning, {
    format: input.format,
    strategy: input.strategy,
    target: input.target,
  });
  return Object.freeze({
    engine: "metaforge-native-masterwork-v5",
    selected,
    candidates: ranked,
    tournament,
    reasoning,
    laboratory,
    blueprintIntent: analysis.context.blueprint,
    diagnostics: Object.freeze({ analysisPasses: 1, cardsAnalyzed: analysis.cards.length, candidatesBuilt: ranked.length }),
    methodology: `MetaForge analyzed each verified card once, reserved explicit Blueprint identity before general optimization, filled minimum deck-function requirements, assembled three complete structural tempers, applied hard rejection gates, advanced a nondominated Blueprint tradeoff, compared it with the closest viable rival, and exhaustively gated exact one-slot experiments.${selected.blueprintAlignment.requested.length ? ` Blueprint promise: ${selected.blueprintAlignment.requested.join(", ")} — ${selected.blueprintAlignment.status.replaceAll("-", " ")}.` : ""}`,
  });
}
