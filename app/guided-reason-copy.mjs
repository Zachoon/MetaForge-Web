// Player-facing wording for the guided Build category loop. Kept as pure
// functions over the structured evidence guided-suggestion.mjs already
// returns (deficitsFilled tags + top positive + nearest alternative) so the
// sentence a player reads is always traceable to real scoring evidence —
// never free text invented by the UI.

export const GUIDED_CATEGORY_COPY = Object.freeze({
  ramp: {
    label: "Ramp",
    blurb: "Mana rocks and land-fetchers that get you to your good cards sooner. Most decks want roughly a tenth of their slots here.",
  },
  interaction: {
    label: "Interaction",
    blurb: "Removal and counterspells — your answers to the things opponents do. Cheap and flexible beats expensive and narrow.",
  },
  protection: {
    label: "Protection",
    blurb: "Ways to keep your commander and key pieces alive through removal and wipes.",
  },
  sweeper: {
    label: "Board wipes",
    blurb: "Mass removal for when you fall behind. Only a couple — and fewer still if your plan is to build a big board yourself.",
  },
  recursion: {
    label: "Recursion",
    blurb: "Ways to get things back from the graveyard so one removal spell doesn't end your plan.",
  },
  draw: {
    label: "Card draw",
    blurb: "Engines that keep your hand full so you never run out of gas.",
  },
  winConditions: {
    label: "Win conditions",
    blurb: "The threats and finishers that actually close the game.",
  },
  synergyPieces: {
    label: "Shell synergy",
    blurb: "The pieces that make your chosen shell work — the reason this deck is different from anyone else's.",
  },
});

export function guidedCategoryLabel(category) {
  return GUIDED_CATEGORY_COPY[category]?.label || String(category || "");
}

function humanizeTag(tag) {
  const [kind, first, second] = String(tag).split(":");
  const words = (value) => String(value || "").replaceAll("_", " ");
  switch (kind) {
    case "role": return `fills a real ${words(first)} gap`;
    case "package_core": return `is a core piece of your ${words(first)} shell`;
    case "package_support": return `supports your ${words(first)} shell`;
    case "package_leg": return `covers the ${words(second)} side of your ${words(first)} shell`;
    case "curve": return `fills an open spot at ${first === "5+" ? "5 or more" : first} mana`;
    case "sequence": return `helps your ${words(first)} turns`;
    case "commander_connection": return "connects directly to your commander";
    default: return null;
  }
}

/**
 * One or two plain sentences explaining why the Forge is offering this card,
 * built only from guided-suggestion's reason object.
 */
export function describeGuidedReason(reason, offerName = "This card") {
  if (!reason) return "";
  const clauses = [...new Set((reason.deficitsFilled || []).map(humanizeTag).filter(Boolean))].slice(0, 3);
  let sentence = "";
  if (clauses.length === 1) sentence = `${offerName} ${clauses[0]}.`;
  else if (clauses.length === 2) sentence = `${offerName} ${clauses[0]} and ${clauses[1]}.`;
  else if (clauses.length >= 3) sentence = `${offerName} ${clauses[0]}, ${clauses[1]}, and ${clauses[2]}.`;
  else if (reason.topPositive) {
    const fallback = humanizeTag(reason.topPositive.kind === "tracked_role" ? `role:${reason.topPositive.key}` : "");
    sentence = fallback
      ? `${offerName} ${fallback}.`
      : `${offerName} is the best fit for this slot given what you've picked so far.`;
  } else {
    sentence = `${offerName} is the best fit for this slot given what you've picked so far.`;
  }
  const alt = reason.nearestAlternative;
  if (alt?.name && Number(alt.margin) > 0) {
    sentence += ` It edged out ${alt.name} for the spot.`;
  }
  return sentence;
}

/**
 * How the live ledger describes one category, purely informational — the
 * ledger never blocks a pick (spec: only format legality is a hard stop).
 */
export function describeLedgerRow(row) {
  if (!row) return "";
  // Win conditions counts every creature or planeswalker among the picks
  // (the "threat" role), not just cards taken on the win-conditions step, so
  // say what is actually being counted instead of implying a step tally.
  if (row.category === "winConditions") return `${row.actual} ${row.actual === 1 ? "threat" : "threats"} among your picks`;
  if (row.status === "no-target" || !row.target) return `${row.actual} picked`;
  const range = row.target.min === row.target.max ? `${row.target.min}` : `${row.target.min}–${row.target.max}`;
  if (row.status === "under") return `${row.actual} of ${range} — room for ${Math.max(1, row.target.min - row.actual)} more`;
  if (row.status === "over") return `${row.actual} (typical ${range}) — more here means less room for other things`;
  return `${row.actual} of ${range} — right in range`;
}
