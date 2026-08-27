import { requiresCreatureForImmediateValue } from "./conditional-effect-credit.mjs";
import { evaluateSituationalCard, isManaFilterOnly } from "./situational-card-evaluation.mjs";

const COLORS = ["W", "U", "B", "R", "G"];

function isLand(card) {
  const typeLine = String(card?.typeLine || "").trim();
  // Once card facts are available, the rules type is authoritative. A mana
  // rock, ritual, dork, or land-search spell is useful mana infrastructure,
  // but it is never an opening land and cannot rescue a zero-land keep.
  if (typeLine) return /\bland\b/i.test(typeLine);
  return card?.role === "Mana source";
}

function isOtherManaCard(card) {
  if (isLand(card)) return false;
  if (isManaFilterOnly(card)) return false;
  const oracle = String(card?.oracleText || "");
  return card?.role === "Mana source"
    || card?.role === "Acceleration"
    || (Array.isArray(card?.producedMana) && card.producedMana.length > 0)
    || /\badd\b[^.\n]*\bmana\b|\badd\b[^.\n]*\{[WUBRGC]\}/i.test(oracle);
}

// {X}{X} costs report cmc 0 under the official off-the-stack convention
// (X=0), which is real and correct — but it also means an X-cost card would
// always win an "earliest/cheapest" sort against fixed-cost cards, even
// though X=0 usually does nothing (Hangarback Walker at X=0 is a 0/0 that
// immediately dies). A card whose real early-game cost is unscoped should
// not be crowned "the cheapest play" by an artifact of that convention.
function isUnscopedXCost(card) {
  return /\{X\}/i.test(String(card?.manaCost || ""));
}

function pipsIn(cost = "") {
  const pips = new Set();
  for (const color of COLORS) if (String(cost).includes(`{${color}}`)) pips.add(color);
  return pips;
}

function manaColors(card) {
  const explicit = Array.isArray(card?.producedMana) ? card.producedMana : [];
  const oracle = String(card?.oracleText || "");
  const colors = new Set([...(card?.colorIdentity || []), ...explicit]);
  // Color identity is not a mana-production contract. Lands such as City of
  // Brass and Mana Confluence must be credited from their verified rules text
  // even if catalog identity metadata is absent or incomplete.
  if (/add one mana of any colou?r/i.test(oracle) || /add one mana of any type/i.test(oracle)) {
    for (const color of COLORS) colors.add(color);
  }
  for (const color of COLORS) {
    if (new RegExp(`add[^.]*\\{${color}\\}`, "i").test(oracle)) colors.add(color);
  }
  return [...colors];
}

function isPersistentManaSource(card) {
  if (!isOtherManaCard(card)) return false;
  const oracle = String(card?.oracleText || "");
  const hasVerifiedProduction = (Array.isArray(card?.producedMana) && card.producedMana.length > 0)
    || /\badd\b[^.\n]*\bmana\b|\badd\b[^.\n]*\{[WUBRGC]\}/i.test(oracle);
  // Rituals can accelerate one turn, but they do not permanently repair a
  // missing color on following turns. Rocks, dorks, and enchantments do.
  return hasVerifiedProduction
    && !/\b(?:Instant|Sorcery)\b/i.test(String(card?.typeLine || ""));
}

function isAvailableFromEmptyBattlefield(card) {
  if (requiresCreatureForImmediateValue(card)) return false;
  const read = evaluateSituationalCard(card);
  if (read.additionalCosts.includes("sacrifice-permanent") || read.additionalCosts.includes("exile-from-graveyard")) return false;
  if (read.battlefieldRequirements.some((need) => ["creature-target", "creature-you-control", "artifact-or-creature-fodder"].includes(need))) return false;
  return true;
}

function canCastFromSources(card, sourceCount, sourceColors) {
  const cmc = Number(card?.cmc);
  if (!Number.isFinite(cmc) || cmc > sourceCount) return false;
  return [...pipsIn(card?.manaCost)].every((color) => sourceColors.has(color));
}

/**
 * Follow mana permanents the hand can actually deploy, instead of judging
 * color access from lands alone. This is deliberately bounded to cards in
 * the opening seven and to verified persistent mana producers: it can see
 * "two lands cast Talisman, then Talisman supplies red", but does not assume
 * a future draw or pretend an uncastable/missing-color rock fixes anything.
 */
function reachableMana(hand, lands) {
  const colors = new Set(lands.flatMap(manaColors));
  let sourceCount = lands.length;
  const remaining = hand.filter(isPersistentManaSource);
  const deployed = [];
  let progressed = true;
  while (progressed) {
    progressed = false;
    for (let index = remaining.length - 1; index >= 0; index -= 1) {
      const card = remaining[index];
      if (!canCastFromSources(card, sourceCount, colors)) continue;
      remaining.splice(index, 1);
      deployed.push(card);
      sourceCount += 1;
      for (const color of manaColors(card)) colors.add(color);
      progressed = true;
    }
  }
  return { colors, deployed };
}

const COLOR_NAMES = { W: "white", U: "blue", B: "black", R: "red", G: "green" };

function listNames(cards, limit = 3) {
  const names = [...new Set(cards.map((card) => card?.name).filter(Boolean))].slice(0, limit);
  if (names.length < 2) return names[0] || "";
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

function sequencingRead({ spells, early, interaction, reachable, landColors, neededColors }) {
  const colorsMissingFromLands = [...neededColors].filter((color) => !landColors.has(color));
  const bridge = reachable.deployed.find((card) =>
    manaColors(card).some((color) => colorsMissingFromLands.includes(color)),
  );
  const immediateDevelopment = early.filter(isAvailableFromEmptyBattlefield);
  const candidates = [...new Map(
    [...reachable.deployed, ...immediateDevelopment]
      .filter((card) => Number.isFinite(card?.cmc) && !isUnscopedXCost(card))
      .sort((a, b) => a.cmc - b.cmc)
      .map((card) => [card.name, card]),
  ).values()].slice(0, 4);
  let recommended = bridge || candidates.find((card) => !interaction.includes(card)) || candidates[0] || null;
  if (!recommended) recommended = spells
    .filter((card) => Number.isFinite(card?.cmc) && isAvailableFromEmptyBattlefield(card))
    .sort((a, b) => a.cmc - b.cmc)[0] || null;

  let reason = "This hand has no verified early sequence beyond making land drops and reassessing the next draw.";
  if (bridge) {
    const unlocked = manaColors(bridge)
      .filter((color) => colorsMissingFromLands.includes(color))
      .map((color) => COLOR_NAMES[color] || color)
      .join(" and ");
    const unlockedCards = spells.filter((card) =>
      [...pipsIn(card.manaCost)].some((color) => manaColors(bridge).includes(color) && colorsMissingFromLands.includes(color)),
    );
    reason = `Deploy ${bridge.name} as soon as the lands can cast it. It unlocks ${unlocked} for ${listNames(unlockedCards) || "the colored spells in this hand"}, so spending that turn on the mana bridge makes the rest of the seven real.`;
  } else if (recommended && interaction.includes(recommended)) {
    reason = `${recommended.name} is the earliest verified play, but it is also ${recommended.role.toLowerCase()}. Hold it until there is a target unless passing would waste the turn.`;
  } else if (recommended) {
    reason = `Lead development with ${recommended.name}, the earliest non-reactive play in this seven. That advances the hand while leaving ${listNames(interaction) || "later interaction"} available for a real target.`;
  }
  return { recommendedCard: recommended?.name || null, options: candidates.map((card) => card.name), reason };
}

export function evaluateMulliganHand(hand, { strategy = "Balanced midrange" } = {}) {
  const lands = hand.filter(isLand);
  const otherMana = hand.filter(isOtherManaCard);
  const spells = hand.filter((card) => !isLand(card));
  const early = spells.filter((card) => {
    const usefulMana = evaluateSituationalCard(card).minimumUsefulMana;
    return Number.isFinite(usefulMana) && usefulMana <= 2 && isAvailableFromEmptyBattlefield(card);
  });
  const interaction = spells.filter((card) => ["Interaction", "Protection"].includes(card?.role));
  const unknown = spells.filter((card) => !Number.isFinite(card?.cmc));
  const reachable = reachableMana(hand, lands);
  const landColors = new Set(lands.flatMap(manaColors));
  const availableColors = reachable.colors;
  const neededColors = new Set(spells.flatMap((card) => [...pipsIn(card.manaCost)]));
  const missingColors = [...neededColors].filter((color) => !availableColors.has(color));
  const landCount = lands.length;

  let verdict = "keep";
  let confidence = "moderate";
  const reasons = [];
  const warnings = [];

  if (landCount < 2) {
    verdict = "mulligan";
    confidence = "high";
    warnings.push(landCount === 0
      ? "This hand has no lands. A spell that can make mana later cannot be cast without one."
      : "Only 1 land makes this hand too dependent on immediately drawing another one.");
  } else if (landCount > 5) {
    verdict = "mulligan";
    confidence = "high";
    warnings.push(`${landCount} lands leave too little action to carry the deck's plan.`);
  } else if (missingColors.length) {
    verdict = "mulligan";
    confidence = "moderate";
    const missingNames = missingColors.map((color) => COLOR_NAMES[color] || color).join(" and ");
    const stranded = spells.filter((card) => [...pipsIn(card.manaCost)].some((color) => missingColors.includes(color)));
    warnings.push(`This hand has no reachable ${missingNames} source for ${listNames(stranded) || "its colored spells"}.`);
  } else if (early.length === 0) {
    verdict = "close";
    confidence = "moderate";
    warnings.push("It has workable mana, but no play costing two or less, so the first turns may be passive.");
  } else {
    reasons.push(`${landCount} lands can support ${listNames(early) || `${early.length} early plays`} in the opening turns.`);
  }

  if (reachable.deployed.length) {
    reasons.push(`${reachable.deployed.map((card) => card.name).join(" and ")} can be cast from this hand and extend its available mana colors.`);
  }

  if (verdict === "keep" && landCount === 5 && early.length <= 1) {
    verdict = "close";
    warnings.push("Five lands make the hand functional, but one early play may not be enough action if the next draws are also lands.");
  }

  if (interaction.length) reasons.push(`${listNames(interaction)} ${interaction.length === 1 ? "is" : "are"} the hand's interaction or protection.`);
  else warnings.push("It has no early interaction or protection, so keeping means trusting your own development.");
  if (/aggro|explosive|tempo/i.test(strategy) && early.length < 2 && verdict === "keep") verdict = "close";
  if (unknown.length) confidence = "limited";

  const headline = verdict === "keep" ? "MetaForge would keep this hand." : verdict === "mulligan" ? "MetaForge would take a mulligan." : "This is a close decision.";
  const sequence = sequencingRead({ spells, early, interaction, reachable, landColors, neededColors });
  return {
    verdict,
    confidence,
    headline,
    reasons,
    warnings,
    sequence,
    counts: { lands: landCount, otherMana: otherMana.length, earlyPlays: early.length, responses: interaction.length },
    disclaimer: "This is coaching for this opening seven, not a prediction that the game will be won.",
    writesToBrain: false,
  };
}
