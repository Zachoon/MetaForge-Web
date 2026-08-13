// =============================================================================
// Deck Display Classification — Founder Issue #017
// =============================================================================
// Presentation only. Primary (front) face determines deck section.
// Full Oracle typing remains available for Brain / structural analysis.
// =============================================================================

/**
 * Type line used for player-facing deck sections.
 * MDFCs / DFCs: front face only — Commander players expect creature-front
 * cards (e.g. Vorinclex // The Grand Evolution) under Creatures, not
 * Enchantments, even when the back face is a Saga.
 */
export function primaryDisplayTypeLine(fact = {}) {
  const faceType = fact?.card_faces?.[0]?.type_line;
  if (faceType) return String(faceType);
  const full = String(fact?.type_line || "");
  if (!full) return "";
  return full.split(/\s*\/\/\s*/)[0].trim();
}

/**
 * Player-facing deck section for a card.
 * Does not change legality, Brain scoring, or structural typing.
 */
export function deckDisplaySection(fact, isCommander = false) {
  if (isCommander) return "Commander";
  const type = primaryDisplayTypeLine(fact);
  if (!type) return "Other";
  // Lands first (including land-front MDFCs).
  if (/\bLand\b/i.test(type)) return "Lands";
  // Creatures before Enchantment/Artifact so "Enchantment Creature" /
  // "Artifact Creature" land with Creatures — Commander list convention.
  if (/\bCreature\b/i.test(type)) return "Creatures";
  if (/\bPlaneswalker\b/i.test(type)) return "Planeswalkers";
  if (/\bInstant\b/i.test(type)) return "Instants";
  if (/\bSorcery\b/i.test(type)) return "Sorceries";
  if (/\bArtifact\b/i.test(type)) return "Artifacts";
  if (/\bEnchantment\b/i.test(type)) return "Enchantments";
  if (/\bBattle\b/i.test(type)) return "Battles";
  return "Other";
}
