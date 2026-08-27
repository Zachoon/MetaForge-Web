const textOf = (card = {}) => String(card.oracleText || card.oracle_text || "");
const typeOf = (card = {}) => String(card.typeLine || card.type_line || "");
const costOf = (card = {}) => String(card.manaCost || card.mana_cost || "");
const evaluationCache = new WeakMap();

export function isManaFilterOnly(card = {}) {
  const oracle = textOf(card);
  if (!/\badd\b[^.]*mana|\badd\b[^.]*\{[WUBRGC]\}/i.test(oracle)) return false;
  const abilities = oracle.split(/\n|\.(?:\s|$)/).filter((line) => /:\s*add\b/i.test(line));
  return abilities.length > 0 && abilities.every((line) => {
    const cost = line.split(":", 1)[0];
    return /\{[1-9X]\}/i.test(cost) && !/sacrifice (?:this|~)/i.test(cost);
  });
}

export function additionalCostRequirements(card = {}) {
  const oracle = textOf(card);
  const requirements = [];
  if (/as an additional cost to cast this spell,? sacrifice (?:an?|another) (?:artifact|creature|permanent)|sacrifice (?:an?|another) (?:artifact|creature|permanent) in addition to paying/i.test(oracle)) requirements.push("sacrifice-permanent");
  if (/as an additional cost to cast this spell,? discard|discard (?:a|one|two|\d+) cards? in addition to paying/i.test(oracle)) requirements.push("discard-card");
  if (/as an additional cost to cast this spell,? pay \d+ life/i.test(oracle)) requirements.push("pay-life");
  if (/as an additional cost to cast this spell,? exile [^.]* from your graveyard/i.test(oracle)) requirements.push("exile-from-graveyard");
  return [...new Set(requirements)];
}

export function battlefieldRequirements(card = {}) {
  const oracle = textOf(card);
  const typeLine = typeOf(card);
  const requirements = [];
  if (/\bAura\b/i.test(typeLine) && /enchant creature/i.test(oracle)) requirements.push("creature-target");
  if (/target creature you control|creatures? you control (?:get|gain)|additional combat phase/i.test(oracle)) requirements.push("creature-you-control");
  if (/equip \{|reconfigure \{/i.test(oracle) || /\bEquipment\b/i.test(typeLine)) requirements.push("creature-to-equip");
  if (/sacrifice (?:an?|another) artifact(?: or creature)?\s*:/i.test(oracle)) requirements.push("artifact-or-creature-fodder");
  return [...new Set(requirements)];
}

export function timingConstraints(card = {}) {
  const oracle = textOf(card);
  const constraints = [];
  if (/create[^.]*tapped (?:treasure|powerstone|artifact|token)/i.test(oracle)) constraints.push("created-resource-tapped");
  if (/enters(?: the battlefield)? tapped/i.test(oracle)) constraints.push("enters-tapped");
  if (/at the beginning of (?:your )?(?:next )?(?:upkeep|end step)|at the beginning of the next/i.test(oracle)) constraints.push("delayed-trigger");
  if (/activate only as a sorcery/i.test(oracle)) constraints.push("sorcery-speed");
  if (/activate only once each turn|triggers only once each turn/i.test(oracle)) constraints.push("once-per-turn");
  if (/\{T\}:/i.test(oracle) && /\bCreature\b/i.test(typeOf(card)) && !/\bhaste\b/i.test(oracle)) constraints.push("summoning-sickness");
  return constraints;
}

export function restrictedManaUses(card = {}) {
  const oracle = textOf(card);
  const restrictions = [];
  for (const match of oracle.matchAll(/spend this mana only to (?:cast|activate) ([^.]+)/gi)) restrictions.push(match[1].trim().toLowerCase());
  if (/this mana can(?:'|’)t be spent to cast a nonartifact spell/i.test(oracle)) restrictions.push("cast artifact spells or activate abilities");
  return [...new Set(restrictions)];
}

export function conditionalCostMechanics(card = {}) {
  const oracle = textOf(card);
  const cost = costOf(card);
  const mechanics = [];
  for (const name of ["convoke", "improvise", "delve", "affinity", "emerge"]) if (new RegExp(`\\b${name}\\b`, "i").test(oracle)) mechanics.push(name);
  if (/costs? \{?\d+\}? less to cast|costs? less to cast for each/i.test(oracle)) mechanics.push("conditional-discount");
  if (/\{X\}/i.test(cost)) mechanics.push("variable-x");
  return [...new Set(mechanics)];
}

export function minimumUsefulMana(card = {}) {
  const printed = Number(card.cmc);
  if (!/\{X\}/i.test(costOf(card))) return Number.isFinite(printed) ? printed : null;
  const xSymbols = (costOf(card).match(/\{X\}/gi) || []).length;
  return Math.max(1, xSymbols);
}

export function repeatableCastMechanics(card = {}) {
  const oracle = textOf(card);
  const typeLine = typeOf(card);
  const found = [];
  for (const name of ["flashback", "retrace", "jump-start", "rebound", "buyback", "escape", "disturb", "aftermath", "adventure", "suspend", "plot", "foretell"]) {
    if (new RegExp(`\\b${name}\\b`, "i").test(`${oracle} ${typeLine}`)) found.push(name);
  }
  return found;
}

export function opponentDependencies(card = {}) {
  const oracle = textOf(card);
  const dependencies = [];
  if (/for each (?:artifact|enchantment|creature|land)[^.]*your opponents control|number of [^.]*your opponents control/i.test(oracle)) dependencies.push("opponent-board");
  if (/if an opponent|unless an opponent|opponent has|opponent controls/i.test(oracle)) dependencies.push("opponent-condition");
  return [...new Set(dependencies)];
}

export function zoneRequirements(card = {}) {
  const oracle = textOf(card);
  const requirements = [];
  if (/from your graveyard|in your graveyard|cards? in (?:all )?graveyards?/i.test(oracle)) requirements.push("graveyard-stock");
  if (/threshold|delirium/i.test(oracle)) requirements.push("graveyard-threshold");
  if (/discard (?:a|one|two|\d+) cards?/i.test(oracle)) requirements.push("hand-stock");
  if (/hand size|cards? in your hand/i.test(oracle)) requirements.push("hand-size");
  return [...new Set(requirements)];
}

export function lifeResourceRequirements(card = {}) {
  const oracle = textOf(card);
  const requirements = [];
  if (/pay (?:\d+|x) life|lose (?:\d+|x) life/i.test(oracle)) requirements.push("life-payment");
  if (/you may play the top card[^.]*pay life|rather than pay[^.]*mana cost[^.]*life/i.test(oracle)) requirements.push("life-as-mana");
  return requirements;
}

export function modalChoicePressure(card = {}) {
  const oracle = textOf(card);
  const chooseCount = (oracle.match(/choose (?:one|two|three|one or more)|•/gi) || []).length;
  return {
    mutuallyExclusive: /choose one(?! or more)|choose two|one that hasn(?:'|’)t been chosen/i.test(oracle),
    modeSignals: chooseCount,
    escalatingCost: /spree|escalate|entwine/i.test(oracle),
  };
}

export function resourceClaims(card = {}) {
  const oracle = textOf(card);
  const claims = [];
  if (/sacrifice (?:an?|another) (?:artifact|treasure)/i.test(oracle)) claims.push("artifact-fodder");
  if (/sacrifice (?:an?|another) creature/i.test(oracle)) claims.push("creature-fodder");
  if (/remove [^.]* counters?/i.test(oracle)) claims.push("counters");
  if (/discard (?:a|one|two|\d+) cards?/i.test(oracle)) claims.push("cards-in-hand");
  if (/pay (?:\d+|x) life/i.test(oracle)) claims.push("life-total");
  return [...new Set(claims)];
}

export function evaluateSituationalCard(card = {}) {
  if (card && typeof card === "object" && evaluationCache.has(card)) return evaluationCache.get(card);
  const result = Object.freeze({
    manaFilterOnly: isManaFilterOnly(card),
    additionalCosts: Object.freeze(additionalCostRequirements(card)),
    battlefieldRequirements: Object.freeze(battlefieldRequirements(card)),
    timing: Object.freeze(timingConstraints(card)),
    restrictedMana: Object.freeze(restrictedManaUses(card)),
    conditionalCosts: Object.freeze(conditionalCostMechanics(card)),
    minimumUsefulMana: minimumUsefulMana(card),
    repeatableCasting: Object.freeze(repeatableCastMechanics(card)),
    opponentDependencies: Object.freeze(opponentDependencies(card)),
    zoneRequirements: Object.freeze(zoneRequirements(card)),
    lifeRequirements: Object.freeze(lifeResourceRequirements(card)),
    modal: Object.freeze(modalChoicePressure(card)),
    resourceClaims: Object.freeze(resourceClaims(card)),
  });
  if (card && typeof card === "object") evaluationCache.set(card, result);
  return result;
}

export function situationalReliabilityFactor(card = {}) {
  const read = evaluateSituationalCard(card);
  let factor = 1;
  if (read.additionalCosts.length) factor *= 0.82;
  if (read.battlefieldRequirements.length) factor *= 0.88;
  if (read.opponentDependencies.length) factor *= 0.72;
  if (read.timing.includes("created-resource-tapped") || read.timing.includes("delayed-trigger")) factor *= 0.86;
  if (read.timing.includes("summoning-sickness") || read.timing.includes("once-per-turn")) factor *= 0.92;
  if (read.restrictedMana.length) factor *= 0.85;
  if (read.conditionalCosts.length) factor *= 0.86;
  if (read.zoneRequirements.length) factor *= 0.86;
  if (read.lifeRequirements.length) factor *= 0.9;
  if (read.modal.mutuallyExclusive && read.modal.modeSignals > 1) factor *= 0.9;
  return Math.max(0.35, factor);
}

export function resourceCompetitionFactor(card = {}, poolSignals = {}) {
  const claims = evaluateSituationalCard(card).resourceClaims;
  if (!claims.length) return 1;
  const signalFor = {
    "artifact-fodder": "artifacts",
    "creature-fodder": "tokens",
    counters: "counters",
    "cards-in-hand": "draw",
    "life-total": "life",
  };
  let factor = 1;
  for (const claim of claims) {
    const producers = poolSignals.producerCounts?.get(signalFor[claim]) || 0;
    const competitors = poolSignals.claimCounts?.get(claim) || 1;
    if (producers === 0) factor *= 0.55;
    else if (competitors > producers) factor *= Math.max(0.65, producers / competitors);
  }
  return Math.max(0.35, factor);
}
