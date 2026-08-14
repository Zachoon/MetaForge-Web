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
  return !isLand(card) && card?.role === "Mana source";
}

function pipsIn(cost = "") {
  const pips = new Set();
  for (const color of COLORS) if (String(cost).includes(`{${color}}`)) pips.add(color);
  return pips;
}

export function evaluateMulliganHand(hand, { strategy = "Balanced midrange" } = {}) {
  const lands = hand.filter(isLand);
  const otherMana = hand.filter(isOtherManaCard);
  const spells = hand.filter((card) => !isLand(card));
  const early = spells.filter((card) => Number.isFinite(card?.cmc) && card.cmc <= 2);
  const interaction = spells.filter((card) => ["Interaction", "Protection"].includes(card?.role));
  const unknown = spells.filter((card) => !Number.isFinite(card?.cmc));
  const availableColors = new Set(lands.flatMap((card) => card.colorIdentity || []));
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
    warnings.push("The mana in this hand cannot currently cast every color it is asking for.");
  } else if (early.length === 0) {
    verdict = "close";
    confidence = "moderate";
    warnings.push("It has workable mana, but no play costing two or less, so the first turns may be passive.");
  } else {
    reasons.push(`${landCount} lands and ${early.length} early play${early.length === 1 ? "" : "s"} give this hand a real start.`);
  }

  if (verdict === "keep" && landCount === 5 && early.length <= 1) {
    verdict = "close";
    warnings.push("Five lands make the hand functional, but one early play may not be enough action if the next draws are also lands.");
  }

  if (interaction.length) reasons.push(`${interaction.length} card${interaction.length === 1 ? "" : "s"} can interact with or protect the plan.`);
  else warnings.push("It has no early interaction or protection, so keeping means trusting your own development.");
  if (/aggro|explosive|tempo/i.test(strategy) && early.length < 2 && verdict === "keep") verdict = "close";
  if (unknown.length) confidence = "limited";

  const headline = verdict === "keep" ? "MetaForge would keep this hand." : verdict === "mulligan" ? "MetaForge would take a mulligan." : "This is a close decision.";
  return {
    verdict,
    confidence,
    headline,
    reasons,
    warnings,
    counts: { lands: landCount, otherMana: otherMana.length, earlyPlays: early.length, responses: interaction.length },
    disclaimer: "This is coaching for this opening seven, not a prediction that the game will be won.",
    writesToBrain: false,
  };
}
