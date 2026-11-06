// Optional "why did you pass on the suggestion?" intent.
// Persisted per deck. A deck-level bracket setting replaces the prompt.
// Coaching sentences use only the names, scores, prices, and power signals
// the comparison already computed.

export const INTENT_CHIPS = Object.freeze([
  Object.freeze({ id: "unowned", label: "Don't own the others" }),
  Object.freeze({ id: "lower", label: "Keeping power down" }),
  Object.freeze({ id: "push", label: "Pushing power" }),
  Object.freeze({ id: "theme", label: "Theme" }),
  Object.freeze({ id: "like", label: "Just like it" }),
]);

export const BRACKET_SETTINGS = Object.freeze([
  Object.freeze({ id: "2", label: "Bracket 2", tier: "Casual" }),
  Object.freeze({ id: "3", label: "Bracket 3", tier: "Focused" }),
  Object.freeze({ id: "4", label: "Bracket 4", tier: "High-Power" }),
  Object.freeze({ id: "5", label: "Bracket 5 · cEDH", tier: "Maximum" }),
]);

const CHIP_IDS = new Set(INTENT_CHIPS.map((chip) => chip.id));
const BRACKETS = new Map(BRACKET_SETTINGS.map((row) => [row.id, row]));

export function tierForIntent(chip, bracket) {
  if (bracket && BRACKETS.has(String(bracket))) {
    const row = BRACKETS.get(String(bracket));
    return Object.freeze({ bracket: row.id, tier: row.tier });
  }
  if (chip === "lower") return Object.freeze({ bracket: "2", tier: "Casual" });
  if (chip === "push") return Object.freeze({ bracket: "5", tier: "Maximum" });
  return Object.freeze({ bracket: null, tier: null });
}

export function emptyDeckIntent() {
  return Object.freeze({
    chip: null,
    bracket: null,
    tier: null,
    dismissed: false,
    prompts: "on",
  });
}

/** Shapes stored JSON. Unknown chips and brackets are dropped. */
export function normalizeDeckIntent(raw) {
  const base = emptyDeckIntent();
  if (!raw || typeof raw !== "object") return base;
  const chip = CHIP_IDS.has(raw.chip) ? raw.chip : null;
  const bracket = BRACKETS.has(String(raw.bracket || "")) ? String(raw.bracket) : null;
  const mapped = tierForIntent(chip, bracket);
  const prompts = raw.prompts === "off" ? "off" : "on";
  return Object.freeze({
    chip,
    bracket: mapped.bracket,
    tier: mapped.tier,
    dismissed: Boolean(raw.dismissed),
    prompts,
  });
}

/**
 * The prompt is rare: only after the player overrides a suggestion,
 * only when this deck has no intent yet, and only while prompts are on.
 */
export function shouldShowIntentPrompt(intent, { overriding = false } = {}) {
  const stored = normalizeDeckIntent(intent);
  if (!overriding) return false;
  if (stored.prompts === "off") return false;
  if (stored.dismissed) return false;
  if (stored.chip || stored.bracket) return false;
  return true;
}

const SIGNAL_LABEL = Object.freeze({
  fastMana: "fast mana",
  tutor: "tutor",
  extraTurn: "extra turn",
  massLandDenial: "mass land denial",
  efficientInteraction: "efficient interaction",
  freeInteraction: "free interaction",
  explicitWinCondition: "explicit win",
  resourceDenial: "resource denial",
  gameChanger: "game changer",
  repeatableValueEngine: "repeatable engine",
  resourceMultiplier: "resource multiplier",
});

function signalText(card) {
  const id = card?.powerSignal || card?.factors?.powerSignal;
  if (!id || !card?.name) return "";
  return `${card.name} carries a ${SIGNAL_LABEL[id] || id} signal`;
}

function money(value) {
  if (value == null || value === "") return null;
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return `$${number.toFixed(2)}`;
}

function score(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Number.isInteger(number) ? String(number) : String(number);
}

/**
 * @param {{ chip?: string, bracket?: string, categoryLabel?: string, added?: any, passed?: any[], differentRole?: string | null }} input
 */
export function coachForIntent(input = {}) {
  const chip = CHIP_IDS.has(input.chip) ? input.chip : null;
  if (!chip) return "";
  const added = input.added || {};
  const passed = (input.passed || []).filter((card) => card?.name && card.name !== added.name);
  const top = [...passed].sort((left, right) => Number(right.rank || 0) - Number(left.rank || 0))[0] || null;
  const label = input.categoryLabel || "this";
  const addedScore = score(added.rank);
  const topScore = top ? score(top.rank) : null;
  const addedPrice = money(added.priceUsd);
  const topPrice = top ? money(top.priceUsd) : null;
  const signal = signalText;

  if (chip === "unowned") {
    if (!top || (addedScore != null && topScore != null && Number(added.rank) >= Number(top.rank))) {
      return addedScore
        ? `${added.name} stays. You don't own the others, and it also leads these cards on engine score (${addedScore}).`
        : `${added.name} stays. You don't own the others.`;
    }
    const price = addedPrice && topPrice ? ` ${top.name} is about ${topPrice}. ${added.name} is about ${addedPrice}.` : "";
    return `${added.name} stays because you own it. ${top.name} is the upgrade for this ${label.toLowerCase()} slot when you can get it: engine score ${topScore} against ${addedScore}.${price}`;
  }

  if (chip === "lower") {
    const held = passed.map(signal).filter(Boolean);
    const aside = held.length ? ` ${held[0]}, and it stays out.` : "";
    return `Power stays down. This deck's target is bracket 2, and the Forge will leave stronger cards on the table.${aside}`;
  }

  if (chip === "push") {
    const bracket = input.bracket === "4" ? "bracket 4" : "bracket 4–5, up to cEDH";
    const candid = top && topScore != null && addedScore != null && Number(top.rank) > Number(added.rank)
      ? ` ${top.name} ranks higher: engine score ${topScore} against ${addedScore}. That gap is what this pick gives up.`
      : addedScore
        ? ` ${added.name} leads these cards on engine score (${addedScore}).`
        : "";
    const marked = [added, ...passed].map(signal).filter(Boolean)[0];
    return `Pushing power, ${bracket}.${candid}${marked ? ` ${marked}.` : ""}`;
  }

  if (chip === "theme") {
    const role = input.differentRole
      ? ` ${input.differentRole}`
      : added.role
        ? ` ${added.name} still fills the ${String(added.role).toLowerCase()} slot.`
        : "";
    return `Theme is the reason this card is in the deck.${role}`;
  }

  const role = input.differentRole ? ` ${input.differentRole}` : "";
  return `${added.name} is in the deck because you like it.${role}`;
}
