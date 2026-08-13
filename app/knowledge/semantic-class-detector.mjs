// =============================================================================
// Knowledge — Semantic Class Detector (Epic 1)
// =============================================================================
// Observation only. Expands strategic class coverage from Oracle text / type
// lines WITHOUT mutating Brain construction, strategicSemanticsFor, or roles.
// writesToBrain: false
// =============================================================================

const freeze = (value) => Object.freeze(value);

/**
 * Knowledge-layer semantic classes — inspected by humans, not consumed by Brain.
 * Fix classes of Oracle patterns, not individual cards.
 */
export const KNOWLEDGE_SEMANTIC_CLASSES = freeze([
  freeze({
    id: "planeswalker_permanent",
    label: "Planeswalker permanent",
    packageHints: freeze(["superfriends"]),
    test: (card, text, typeLine) => /\bPlaneswalker\b/i.test(typeLine),
  }),
  freeze({
    id: "proliferate",
    label: "Proliferate",
    packageHints: freeze(["counters", "superfriends"]),
    test: (_card, text) => /\bproliferate\b/i.test(text),
  }),
  freeze({
    id: "counter_growth",
    label: "Counter growth",
    packageHints: freeze(["counters"]),
    test: (_card, text) =>
      /\+1\/\+1 counter/i.test(text)
      || /\bloyalty counter/i.test(text)
      || /\bput (?:a|one|two|three|x|\d+)[^.]*counters?\b/i.test(text),
  }),
  freeze({
    id: "loyalty_interaction",
    label: "Loyalty interaction",
    packageHints: freeze(["superfriends"]),
    test: (_card, text) =>
      /\bloyalty\b/i.test(text)
      || /\bplaneswalker\b/i.test(text)
      || /\[(?:\+|-|0|\+|−)/.test(text),
  }),
  freeze({
    id: "combat_damage_payoff",
    label: "Combat-damage payoff",
    packageHints: freeze([]),
    test: (_card, text) =>
      /deals combat damage to (?:a player|an opponent|them)/i.test(text)
      || /whenever .+ deals combat damage/i.test(text),
  }),
  freeze({
    id: "token_generation",
    label: "Token generation",
    packageHints: freeze(["tokens"]),
    test: (_card, text) => /create(?:s)? [^.]* token/i.test(text),
  }),
  freeze({
    id: "blink_etb",
    label: "Blink / ETB value",
    packageHints: freeze(["blink"]),
    test: (_card, text) =>
      /exile [^.]*return [^.]*battlefield/i.test(text)
      || /when(?:ever)? [^.]* enters(?: the battlefield)?/i.test(text),
  }),
  freeze({
    id: "graveyard_fill",
    label: "Graveyard fill",
    packageHints: freeze(["reanimator"]),
    test: (_card, text) => /\bmill\b|\bsurveil\b|put .{0,40} into .{0,20}graveyard/i.test(text),
  }),
  freeze({
    id: "reanimation",
    label: "Reanimation",
    packageHints: freeze(["reanimator"]),
    test: (_card, text) =>
      /return target [^.]* from (?:your |a )?graveyard to the battlefield/i.test(text)
      || /put target [^.]* from (?:your |a )?graveyard onto the battlefield/i.test(text)
      || /\breanimate\b/i.test(text),
  }),
  freeze({
    id: "artifact_recursion",
    label: "Artifact recursion",
    packageHints: freeze([]),
    test: (_card, text) =>
      /return target artifact[^.]* from .{0,20}graveyard/i.test(text)
      || /artifacts? from .{0,20}graveyard/i.test(text),
  }),
  freeze({
    id: "typal_membership",
    label: "Typal membership signal",
    packageHints: freeze(["typal"]),
    test: (_card, text) =>
      /other [A-Z][a-z]+s? you control/i.test(text)
      || /[A-Z][a-z]+s? you control get/i.test(text)
      || /\bcho(?:sen|ice) (?:a )?creature type\b/i.test(text)
      || /creatures? you control that are [A-Z]/i.test(text),
  }),
  freeze({
    id: "cost_reduction",
    label: "Cost reduction",
    packageHints: freeze([]),
    test: (_card, text) =>
      /cost[s]? \{[^}]+\} less/i.test(text)
      || /spells? you cast cost/i.test(text)
      || /affinity for/i.test(text),
  }),
  freeze({
    id: "alternate_cost",
    label: "Alternate cost / cost cheat",
    packageHints: freeze([]),
    test: (_card, text) =>
      /cast [^.]* without paying/i.test(text)
      || /you may (?:cast|play)[^.]* without paying/i.test(text)
      || /put [^.]* onto the battlefield/i.test(text)
      || /\bevict\b|\bsuspend\b|\bflashback\b|\bescape\b|\bencore\b/i.test(text),
  }),
  freeze({
    id: "protection",
    label: "Protection",
    packageHints: freeze([]),
    test: (_card, text) =>
      /\bhexproof\b|\bindestructible\b|\bward\b|protection from|can't be countered|phasing/i.test(text),
  }),
  freeze({
    id: "tutor_search",
    label: "Tutor / search",
    packageHints: freeze([]),
    test: (_card, text) => /search your library for/i.test(text),
  }),
  freeze({
    id: "sacrifice_engine",
    label: "Sacrifice engine",
    packageHints: freeze(["aristocrats"]),
    test: (_card, text) =>
      /sacrifice (?:a|another|one|target)/i.test(text)
      || /whenever you sacrifice/i.test(text)
      || /whenever .{0,40} dies/i.test(text),
  }),
  freeze({
    id: "spell_payoff",
    label: "Spellcasting payoff",
    packageHints: freeze(["spellslinger"]),
    test: (_card, text) =>
      /whenever you cast (?:an? )?(?:instant|sorcery|noncreature)/i.test(text)
      || /\bmagecraft\b/i.test(text),
  }),
  freeze({
    id: "named_oracle_reference",
    label: "Explicit named Oracle reference",
    packageHints: freeze([]),
    test: (_card, text) =>
      /\bnamed [A-Z]/i.test(text)
      || /\bPartner with [A-Z]/i.test(text)
      || /\bMeld with [A-Z]/i.test(text),
  }),
  freeze({
    id: "doubling_effect",
    label: "Doubling / copy counters or tokens",
    packageHints: freeze(["counters", "tokens", "superfriends"]),
    test: (_card, text) =>
      /twice that many/i.test(text)
      || /double (?:the number of|those|the)/i.test(text)
      || /enters with twice/i.test(text),
  }),
]);

function oracleOf(card = {}) {
  return String(card.oracleText || card.oracle_text || "").trim();
}

function typeLineOf(card = {}) {
  return String(card.typeLine || card.type_line || "").trim();
}

/**
 * Detect knowledge-layer semantic classes for one card.
 */
export function detectKnowledgeSemanticClasses(card = {}) {
  const text = oracleOf(card);
  const typeLine = typeLineOf(card);
  const hits = [];
  for (const entry of KNOWLEDGE_SEMANTIC_CLASSES) {
    if (entry.test(card, text, typeLine)) {
      hits.push(
        freeze({
          id: entry.id,
          label: entry.label,
          packageHints: entry.packageHints,
        }),
      );
    }
  }
  return freeze(hits);
}

export function knowledgePackageHintsFor(card = {}) {
  const hints = new Set();
  for (const hit of detectKnowledgeSemanticClasses(card)) {
    for (const packageId of hit.packageHints || []) hints.add(packageId);
  }
  return freeze([...hints].sort());
}
