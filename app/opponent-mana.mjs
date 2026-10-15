// Mana that is "any color an opponent could produce" (Exotic Orchard,
// Fellwar Stone, and the same templating). It is not a promise of any
// particular color, so color and mana-base counts must not treat it as
// five-color fixing. A later sentence about an opponent (Forbidden
// Orchard's Spirit token) is a different ability and stays "any color".

/** True when this add-clause's color depends on an opponent. */
export function opponentDependentAddClause(clause) {
  return /\bopponent\b/i.test(clause) && /could produce|\bany color\b/i.test(clause);
}

/** True when any add ability on the card is opponent-dependent. */
export function opponentDependentManaText(text) {
  return [...String(text || "").matchAll(/\badd\b([^.]*)/gi)].some((match) => opponentDependentAddClause(match[1]));
}
