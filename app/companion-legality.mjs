// Validates the printed "Companion —" deckbuilding restriction for each of
// the ten Ikoria companions against the rest of a deck. This is a deck
// *legality* gate, not a play-sequencing one: a deck with an illegal
// companion is not a legal deck, regardless of how well it can be cast.
//
// Restriction wording verified 2026-08-27 against Scryfall/Gatherer oracle
// text (direct Scryfall API access was unavailable this session; wording
// was cross-referenced through search results citing those sources).
//
// Rule 702.139f: the command zone is not part of the "starting deck" for
// this check. Callers must pass the noncommander cards only -- never
// include the commander(s) themselves in `cards`.

function manaValueFromCost(cost) {
  const symbols = String(cost || "").match(/\{[^}]+\}/g);
  if (!symbols) return 0;
  let total = 0;
  for (const raw of symbols) {
    const symbol = raw.slice(1, -1);
    if (/^\d+$/.test(symbol)) { total += Number(symbol); continue; }
    if (/^[XYZ]$/.test(symbol)) continue; // rule 202.3b: X/Y/Z are 0 off the stack
    const hybridGeneric = symbol.match(/^(\d+)\//);
    if (hybridGeneric) { total += Number(hybridGeneric[1]); continue; }
    total += 1; // every other pip (colored, hybrid, Phyrexian, snow, colorless C) is 1
  }
  return total;
}

export function manaValueOf(card) {
  if (typeof card.cmc === "number") return card.cmc;
  if (typeof card.mana_value === "number") return card.mana_value;
  return manaValueFromCost(card.mana_cost ?? card.manaCost);
}

function coloredSymbolCountsOf(card) {
  const cost = card.mana_cost ?? card.manaCost ?? "";
  const symbols = cost.match(/\{[^}]+\}/g) || [];
  const counts = new Map();
  for (const raw of symbols) {
    const symbol = raw.slice(1, -1);
    if (/^\d+$/.test(symbol) || /^[XYZ]$/.test(symbol)) continue;
    counts.set(symbol, (counts.get(symbol) || 0) + 1);
  }
  return counts;
}

const CARD_TYPES = ["Artifact", "Battle", "Creature", "Enchantment", "Instant", "Kindred", "Land", "Planeswalker", "Sorcery", "Tribal"];

function typeLineFront(typeLine) {
  return String(typeLine || "").split("//")[0];
}

export function cardTypesOf(card) {
  const front = typeLineFront(card.type_line ?? card.typeLine).split("—")[0];
  return CARD_TYPES.filter((type) => new RegExp(`\\b${type}\\b`).test(front));
}

export function isLand(card) {
  return cardTypesOf(card).includes("Land");
}

export function isPermanent(card) {
  return cardTypesOf(card).some((type) => type !== "Instant" && type !== "Sorcery");
}

function creatureTypesOf(card) {
  const front = typeLineFront(card.type_line ?? card.typeLine);
  const afterDash = front.split("—")[1] || "";
  return afterDash.trim().split(/\s+/).filter(Boolean);
}

const KAHEERA_CREATURE_TYPES = ["Cat", "Elemental", "Nightmare", "Dinosaur", "Beast"];

// Heuristic: an activated ability prints as "<cost>: <effect>" -- a colon
// after something that isn't a full sentence. Covers the overwhelming
// majority of real cards; a reminder-text colon could false-positive. Worth
// a manual spot-check before this gates anything at build time.
function hasActivatedAbility(card) {
  const text = card.oracle_text ?? card.oracleText ?? "";
  return /(^|\n)[^\n.]*:\s*\S/.test(text);
}

function nameOf(card) {
  return String(card.name || "").split(" // ")[0].trim();
}

export const COMPANION_RESTRICTIONS = {
  "gyruda, doom of depths": {
    summary: "every card has an even mana value",
    findViolations(cards) {
      return cards.filter((card) => manaValueOf(card) % 2 !== 0);
    },
  },
  "jegantha, the wellspring": {
    summary: "no card repeats the same colored, hybrid, or Phyrexian mana symbol within its own cost",
    findViolations(cards) {
      return cards.filter((card) => [...coloredSymbolCountsOf(card).values()].some((count) => count > 1));
    },
  },
  "kaheera, the orphanguard": {
    summary: "every creature card is a Cat, Elemental, Nightmare, Dinosaur, or Beast",
    findViolations(cards) {
      return cards.filter((card) => cardTypesOf(card).includes("Creature")
        && !creatureTypesOf(card).some((type) => KAHEERA_CREATURE_TYPES.includes(type)));
    },
  },
  "keruga, the macrosage": {
    summary: "every nonland card has mana value 3 or greater",
    findViolations(cards) {
      return cards.filter((card) => !isLand(card) && manaValueOf(card) < 3);
    },
  },
  "lurrus of the dream-den": {
    summary: "every permanent card has mana value 2 or less",
    findViolations(cards) {
      return cards.filter((card) => isPermanent(card) && manaValueOf(card) > 2);
    },
  },
  "lutri, the spellchaser": {
    summary: "every nonland card has a different name -- Commander's own singleton rule already guarantees this",
    findViolations() {
      return [];
    },
  },
  "obosh, the preypiercer": {
    summary: "every nonland card has an odd mana value",
    findViolations(cards) {
      return cards.filter((card) => !isLand(card) && manaValueOf(card) % 2 !== 1);
    },
  },
  "umori, the collector": {
    summary: "every nonland card shares at least one card type with every other nonland card",
    findViolations(cards) {
      const nonland = cards.filter((card) => !isLand(card));
      if (!nonland.length) return [];
      const shared = nonland.reduce((intersection, card) => {
        const types = new Set(cardTypesOf(card));
        return intersection === null ? types : new Set([...intersection].filter((type) => types.has(type)));
      }, null);
      return shared && shared.size > 0 ? [] : nonland;
    },
  },
  "yorion, sky nomad": {
    summary: "the starting deck must be at least 20 cards over the format minimum -- impossible in Commander's fixed 100-card deck, so Yorion can never legally be a Commander companion",
    findViolations() {
      return [];
    },
  },
  "zirda, the dawnwaker": {
    summary: "every permanent card has an activated ability",
    findViolations(cards) {
      return cards.filter((card) => isPermanent(card) && !hasActivatedAbility(card));
    },
  },
};

export function validateCompanion(companionName, cards, { format = "commander" } = {}) {
  const key = String(companionName || "").trim().toLocaleLowerCase();
  const rule = COMPANION_RESTRICTIONS[key];
  if (!rule) return { recognized: false, legal: true, summary: null, violations: [], structuralIssue: null };

  if (key === "yorion, sky nomad" && format === "commander") {
    return {
      recognized: true,
      legal: false,
      summary: rule.summary,
      violations: [],
      structuralIssue: "Yorion cannot be a legal companion in Commander -- the format's fixed 100-card deck can never satisfy \"20 cards more than the minimum deck size.\"",
    };
  }

  const violations = rule.findViolations(cards).map((card) => nameOf(card));
  return { recognized: true, legal: violations.length === 0, summary: rule.summary, violations, structuralIssue: null };
}
