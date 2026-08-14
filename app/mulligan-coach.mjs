const COLORS = ["W", "U", "B", "R", "G"];

function isManaSource(card) {
  return card?.role === "Mana source" || /\bland\b/i.test(String(card?.typeLine || ""));
}

function pipsIn(cost = "") {
  const pips = new Set();
  for (const color of COLORS) if (String(cost).includes(`{${color}}`)) pips.add(color);
  return pips;
}

export function evaluateMulliganHand(hand, { strategy = "Balanced midrange" } = {}) {
  const mana = hand.filter(isManaSource);
  const spells = hand.filter((card) => !isManaSource(card));
  const early = spells.filter((card) => Number.isFinite(card?.cmc) && card.cmc <= 2);
  const interaction = spells.filter((card) => ["Interaction", "Protection"].includes(card?.role));
  const unknown = spells.filter((card) => !Number.isFinite(card?.cmc));
  const availableColors = new Set(mana.flatMap((card) => card.colorIdentity || []));
  const neededColors = new Set(spells.flatMap((card) => [...pipsIn(card.manaCost)]));
  const missingColors = [...neededColors].filter((color) => !availableColors.has(color));
  const landCount = mana.length;

  let verdict = "keep";
  let confidence = "moderate";
  const reasons = [];
  const warnings = [];

  if (landCount < 2) {
    verdict = "mulligan";
    confidence = "high";
    warnings.push(`Only ${landCount} mana source${landCount === 1 ? "" : "s"} makes this hand unlikely to function on time.`);
  } else if (landCount > 5) {
    verdict = "mulligan";
    confidence = "high";
    warnings.push(`${landCount} mana sources leaves too little action to carry the deck's plan.`);
  } else if (missingColors.length) {
    verdict = "mulligan";
    confidence = "moderate";
    warnings.push("The mana in this hand cannot currently cast every color it is asking for.");
  } else if (early.length === 0) {
    verdict = "close";
    confidence = "moderate";
    warnings.push("It has workable mana, but no play costing two or less, so the first turns may be passive.");
  } else {
    reasons.push(`${landCount} mana sources and ${early.length} early play${early.length === 1 ? "" : "s"} give this hand a real start.`);
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
    counts: { manaSources: landCount, earlyPlays: early.length, responses: interaction.length },
    disclaimer: "This is coaching for this opening seven, not a prediction that the game will be won.",
    writesToBrain: false,
  };
}

