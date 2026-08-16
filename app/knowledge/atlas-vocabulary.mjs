// =============================================================================

import {
  classifyArtifactKinds,
  classifyAuraKinds,
  classifyCombatKinds,
  classifyCounterKinds,
  classifyDamageKinds,
  classifyDrawKinds,
  classifyEquipmentKinds,
  classifyEvasionKinds,
  classifyGraveyardKinds,
  classifyLandKinds,
  classifyLifeKinds,
  classifyLoopKind,
  classifyProtectionKinds,
  classifySacrificeKinds,
  classifySelectionKinds,
  classifySpellKinds,
  classifyTokenKinds,
  classifyTriggerKinds,
  extractMechanicalSignals,
  LOOP_KINDS,
  resetPayShape,
  RESET_SHAPES,
} from "../forge-interaction-graph.mjs";
// Atlas Vocabulary Registry v0 — Age of Vocabulary engineering surface
// =============================================================================
// Stable meanings + illustrative equivalence. Naming is not promotion.
// Atlas never writes to Brain. coverageScore does not exist.
// writesToBrain: false
// =============================================================================

const freeze = (value) => Object.freeze(value);

function seatKindRows(definitions, kinds, card = {}) {
  const rows = [];
  for (const definition of definitions) {
    if (!kinds.includes(definition.kind)) continue;
    rows.push(freeze({
      kind: definition.kind,
      capability: definition.capability,
      seat: definition.seat,
      contrast: definition.contrast,
      implementation: freeze({
        card: String(card.name || "Unknown card"),
        roles: freeze([definition.role]),
        evidenceSignals: freeze([definition.kind]),
      }),
      writesToBrain: false,
    }));
  }
  return freeze(rows);
}

/** Core Atlas terms — working meanings locked for Age of Vocabulary. */
export const ATLAS_CORE_TERMS = freeze([
  freeze({ id: "capability", term: "Capability", meaning: "A transferable strategic job across archetypes", status: "stable" }),
  freeze({ id: "seat", term: "Seat", meaning: "A capability slot that must remain occupiable; cards are fillers", status: "stable" }),
  freeze({ id: "coverage", term: "Coverage", meaning: "Multidimensional profile of which seats/capabilities are present and substitutable — never one scalar", status: "stable" }),
  freeze({ id: "plan", term: "Plan", meaning: "A local sequence toward a win or defense", status: "stable" }),
  freeze({ id: "principle", term: "Principle", meaning: "An Academy claim about elite structure, inert until promoted", status: "stable" }),
  freeze({ id: "card", term: "Card", meaning: "Concrete game object that implements one or more capabilities", status: "stable" }),
  freeze({ id: "package", term: "Package", meaning: "Recurring co-occurrence of cards/roles with a shared mid-level job", status: "stable" }),
  freeze({ id: "equivalence", term: "Equivalence", meaning: "Atlas statement: card A and card B both implement seat S (not a quality rank)", status: "stable" }),
  freeze({ id: "dependency", term: "Dependency", meaning: "A plan or capability that fails when another seat is vacant", status: "stable" }),
  freeze({ id: "recovery", term: "Recovery", meaning: "Ability to re-occupy vacated seats or restore a disrupted plan", status: "stable" }),
  freeze({ id: "pressure", term: "Pressure", meaning: "Force opponents to answer or lose tempo / life / resources", status: "stable" }),
  freeze({ id: "conversion", term: "Conversion", meaning: "Turn resources / board / timing into a winning line", status: "stable" }),
  freeze({ id: "interaction-count", term: "Interaction count", meaning: "Cheap observable proxy — not a primitive", status: "stable" }),
  freeze({ id: "topology", term: "Topology (current)", meaning: "Incomplete graph abstraction; not measuring seat optionality well", status: "stable" }),
]);

/**
 * Working capability vocabulary — draft labels only.
 * Coverage Observation 001 admitted **0** of these to Atlas as earned Capabilities.
 */
export const ATLAS_CAPABILITY_DRAFT = freeze([
  "Threat Removal",
  "Stack Protection",
  "Plan Protection",
  "Commander Protection",
  "Path Protection",
  "Combo Protection",
  "Tempo Recovery",
  "Pressure Conversion",
  "Resource Recovery",
  "Pivot",
  "Acceleration",
  "Closure",
  "Path Clearing",
  "Initiative Conversion",
  "Emergency Interaction",
  "Multifunction Seat",
].map((label) => freeze({
  id: label.toLocaleLowerCase("en").replace(/\s+/g, "-"),
  label,
  status: "draft_not_admitted",
  atlasAdmitted: false,
})));

/** Multidimensional coverage axes — forever non-scalar. */
export const ATLAS_COVERAGE_DIMENSIONS = freeze([
  freeze({ id: "protection", label: "Protection / Defensive", question: "Survive disruption" }),
  freeze({ id: "recovery", label: "Recovery", question: "Rebuild after interruption" }),
  freeze({ id: "pressure", label: "Pressure / Offensive", question: "Convert toward a win" }),
  freeze({ id: "flexibility", label: "Flexibility", question: "Pivot when the original plan fails" }),
  freeze({ id: "information", label: "Information", question: "Tutors, selection, digging, reconnaissance" }),
  freeze({ id: "acceleration", label: "Acceleration / Resource", question: "Mana, cards, recursion, efficiency" }),
]);

/**
 * Illustrative equivalence bindings — NOT authoritative Academy admissions.
 * Used so Mentor / reports can speak seat language without inventing rankings.
 */
export const ATLAS_EQUIVALENCE_ILLUSTRATIVE = freeze([
  freeze({ card: "Force of Will", seats: freeze(["Stack Protection", "Emergency Interaction", "Multifunction Seat"]) }),
  freeze({ card: "Silence", seats: freeze(["Path Protection", "Combo Protection", "Initiative Conversion"]) }),
  freeze({ card: "Flawless Maneuver", seats: freeze(["Commander Protection"]) }),
  freeze({ card: "Lightning Greaves", seats: freeze(["Commander Protection"]) }),
  freeze({ card: "Skrelv, Defector Mite", seats: freeze(["Commander Protection"]) }),
  freeze({ card: "Teferi's Protection", seats: freeze(["Commander Protection", "Plan Protection"]) }),
  freeze({ card: "Doubling Season", seats: freeze(["Pressure Conversion", "Acceleration"]) }),
]);

/**
 * Descriptive seating for the closed named-artifact-token vocabulary.
 * These are not Capability admissions and never become construction inputs.
 * Atlas consumes the interaction graph's language instead of maintaining a
 * second set of oracle regexes that could drift from the engine.
 */
export const ATLAS_NAMED_RESOURCE_SEATS = freeze([
  ["clue", "clues", "Clue"],
  ["treasure", "treasure", "Treasure"],
  ["food", "food", "Food"],
  ["blood", "blood", "Blood"],
  ["gold", "gold", "Gold"],
  ["map", "maps", "Map"],
  ["junk", "junk", "Junk"],
  ["powerstone", "powerstones", "Powerstone"],
].map(([resource, signal, label]) => freeze({
  resource,
  signal,
  capability: freeze({
    id: `cap:${resource}_resource_engine`,
    label: `${label} Resource Engine`,
    status: "descriptive_not_admitted",
    atlasAdmitted: false,
  }),
  seat: freeze({
    id: `seat:${resource}_engine_piece`,
    label: `${label} Engine Piece`,
  }),
  writesToBrain: false,
})));

function normalizedResources(resources = []) {
  return [...new Set((resources || []).map((value) => String(value || "").trim().toLocaleLowerCase("en")).filter(Boolean))];
}

/** Capability → Seat → Implementation, observed from already-shipped graph signals. */
export function seatNamedResourceImplementation(card = {}, { activeResources = [] } = {}) {
  const mechanics = card.mechanics || extractMechanicalSignals(card);
  const active = normalizedResources(activeResources);
  const rows = [];
  for (const definition of ATLAS_NAMED_RESOURCE_SEATS) {
    const produces = mechanics.produces?.includes(definition.signal) || false;
    const rewards = mechanics.rewards?.includes(definition.signal) || false;
    const genericArtifactOutlet = active.includes(definition.resource)
      && mechanics.rewards?.includes("artifacts")
      && !produces
      && !rewards;
    if (!produces && !rewards && !genericArtifactOutlet) continue;
    rows.push(freeze({
      resource: definition.resource,
      capability: definition.capability,
      seat: definition.seat,
      implementation: freeze({
        card: String(card.name || "Unknown card"),
        roles: freeze([
          ...(produces ? ["producer"] : []),
          ...(rewards ? ["payoff"] : []),
          ...(genericArtifactOutlet ? ["generic_artifact_outlet"] : []),
        ]),
        evidenceSignals: freeze([
          ...(produces || rewards ? [definition.signal] : []),
          ...(genericArtifactOutlet ? ["artifacts"] : []),
        ]),
      }),
      writesToBrain: false,
    }));
  }
  return freeze(rows);
}

/**
 * Descriptive seating for selection that is not draw.
 * Consumes graph `selectionKinds` — no second oracle regex family.
 * Not Capability admissions. Never construction inputs.
 */
export const ATLAS_SELECTION_SEATS = freeze([
  freeze({
    kind: "scry",
    capability: freeze({
      id: "cap:scry_library_selection",
      label: "Library Selection",
      status: "descriptive_not_admitted",
      atlasAdmitted: false,
    }),
    seat: freeze({ id: "seat:scry_filter", label: "Scry Filter" }),
    contrast: "not mill",
    writesToBrain: false,
  }),
  freeze({
    kind: "surveil",
    capability: freeze({
      id: "cap:surveil_graveyard_selection",
      label: "Graveyard Selection",
      status: "descriptive_not_admitted",
      atlasAdmitted: false,
    }),
    seat: freeze({ id: "seat:surveil_filter", label: "Surveil Filter" }),
    contrast: "not mill",
    writesToBrain: false,
  }),
  freeze({
    kind: "rummage",
    capability: freeze({
      id: "cap:rummage_hand_filter",
      label: "Hand Filter",
      status: "descriptive_not_admitted",
      atlasAdmitted: false,
    }),
    seat: freeze({ id: "seat:rummage_filter", label: "Rummage Filter" }),
    contrast: "not net draw",
    writesToBrain: false,
  }),
  freeze({
    kind: "connive",
    capability: freeze({
      id: "cap:connive_mixed_selector",
      label: "Mixed Selector",
      status: "descriptive_not_admitted",
      atlasAdmitted: false,
    }),
    seat: freeze({ id: "seat:connive_filter", label: "Connive Selector" }),
    contrast: "not a draw engine",
    writesToBrain: false,
  }),
  freeze({
    kind: "impulse",
    capability: freeze({
      id: "cap:impulse_exile_selection",
      label: "Impulse Selection",
      status: "descriptive_not_admitted",
      atlasAdmitted: false,
    }),
    seat: freeze({ id: "seat:impulse_filter", label: "Impulse Filter" }),
    contrast: "not a Junk token",
    writesToBrain: false,
  }),
  freeze({
    kind: "draw",
    capability: freeze({
      id: "cap:net_draw",
      label: "Net Draw",
      status: "descriptive_not_admitted",
      atlasAdmitted: false,
    }),
    seat: freeze({ id: "seat:net_draw", label: "Net Draw" }),
    contrast: null,
    writesToBrain: false,
  }),
]);

export function seatSelectionImplementation(card = {}) {
  const mechanics = card.mechanics || extractMechanicalSignals(card);
  const kinds = mechanics.selectionKinds
    || classifySelectionKinds(card.oracleText || card.oracle_text || "");
  const rows = [];
  for (const definition of ATLAS_SELECTION_SEATS) {
    if (!kinds.includes(definition.kind)) continue;
    rows.push(freeze({
      kind: definition.kind,
      capability: definition.capability,
      seat: definition.seat,
      contrast: definition.contrast,
      implementation: freeze({
        card: String(card.name || "Unknown card"),
        roles: freeze(["selector"]),
        evidenceSignals: freeze([definition.kind]),
      }),
      writesToBrain: false,
    }));
  }
  return freeze(rows);
}

/**
 * Descriptive seating for graveyard kinds.
 * Consumes graph `graveyardKinds` — no second oracle regex family.
 * Mill is not surveil. Dredge is not mill. Flashback and Escape are casts
 * from the yard, distinct from dredge's return-to-hand. Unearth is a
 * temporary battlefield return, not permanent reanimation.
 * Not Capability admissions. Never construction inputs.
 */
export const ATLAS_GRAVEYARD_SEATS = freeze([
  freeze({
    kind: "mill",
    capability: freeze({
      id: "cap:mill_graveyard_dump",
      label: "Graveyard Dump",
      status: "descriptive_not_admitted",
      atlasAdmitted: false,
    }),
    seat: freeze({ id: "seat:mill_dump", label: "Mill Dump" }),
    contrast: "not surveil",
    role: "dumper",
    writesToBrain: false,
  }),
  freeze({
    kind: "dredge",
    capability: freeze({
      id: "cap:dredge_graveyard_recursion",
      label: "Graveyard Recursion",
      status: "descriptive_not_admitted",
      atlasAdmitted: false,
    }),
    seat: freeze({ id: "seat:dredge_recursion", label: "Dredge Recursion" }),
    contrast: "not mill",
    role: "recurring_filter",
    writesToBrain: false,
  }),
  freeze({
    kind: "flashback",
    capability: freeze({
      id: "cap:flashback_recast",
      label: "Flashback Recast",
      status: "descriptive_not_admitted",
      atlasAdmitted: false,
    }),
    seat: freeze({ id: "seat:flashback_recast", label: "Flashback Recast" }),
    contrast: "not dredge-to-hand",
    role: "recaster",
    writesToBrain: false,
  }),
  freeze({
    kind: "unearth",
    capability: freeze({
      id: "cap:unearth_temporary_return",
      label: "Unearth Return",
      status: "descriptive_not_admitted",
      atlasAdmitted: false,
    }),
    seat: freeze({ id: "seat:unearth_return", label: "Unearth Return" }),
    contrast: "temporary, not permanent reanimation",
    role: "temporary_returner",
    writesToBrain: false,
  }),
  freeze({
    kind: "escape",
    capability: freeze({
      id: "cap:escape_recast",
      label: "Escape Recast",
      status: "descriptive_not_admitted",
      atlasAdmitted: false,
    }),
    seat: freeze({ id: "seat:escape_recast", label: "Escape Recast" }),
    contrast: "not dredge-to-hand",
    role: "recaster",
    writesToBrain: false,
  }),
]);

export function seatGraveyardImplementation(card = {}) {
  const mechanics = card.mechanics || extractMechanicalSignals(card);
  const kinds = mechanics.graveyardKinds
    || classifyGraveyardKinds(card.oracleText || card.oracle_text || "");
  const rows = [];
  for (const definition of ATLAS_GRAVEYARD_SEATS) {
    if (!kinds.includes(definition.kind)) continue;
    rows.push(freeze({
      kind: definition.kind,
      capability: definition.capability,
      seat: definition.seat,
      contrast: definition.contrast,
      implementation: freeze({
        card: String(card.name || "Unknown card"),
        roles: freeze([definition.role]),
        evidenceSignals: freeze([definition.kind]),
      }),
      writesToBrain: false,
    }));
  }
  return freeze(rows);
}

/**
 * Descriptive seating for sacrifice kinds — splits the single blended
 * `sacrifice` produces/rewards signal into named seats.
 * Consumes graph `sacrificeKinds` — no second oracle regex family.
 * Outlet is a cost, not a reaction. Death payoff is not an outlet.
 * Incidental yard is a named resource or discard leaving the graveyard as a
 * side effect — distinct from a Mill Dump.
 * Not Capability admissions. Never construction inputs.
 */
export const ATLAS_SACRIFICE_SEATS = freeze([
  freeze({
    kind: "outlet",
    capability: freeze({
      id: "cap:sacrifice_outlet",
      label: "Sacrifice Outlet",
      status: "descriptive_not_admitted",
      atlasAdmitted: false,
    }),
    seat: freeze({ id: "seat:sacrifice_outlet", label: "Sacrifice Outlet" }),
    contrast: "not a death payoff",
    role: "outlet",
    writesToBrain: false,
  }),
  freeze({
    kind: "death_payoff",
    capability: freeze({
      id: "cap:death_payoff",
      label: "Death Payoff",
      status: "descriptive_not_admitted",
      atlasAdmitted: false,
    }),
    seat: freeze({ id: "seat:death_payoff", label: "Death Payoff" }),
    contrast: "not a sacrifice outlet",
    role: "payoff",
    writesToBrain: false,
  }),
  freeze({
    kind: "incidental_yard",
    capability: freeze({
      id: "cap:incidental_graveyard_filler",
      label: "Incidental Graveyard Filler",
      status: "descriptive_not_admitted",
      atlasAdmitted: false,
    }),
    seat: freeze({ id: "seat:incidental_yard", label: "Incidental Yard" }),
    contrast: "not a mill dump",
    role: "incidental_filler",
    writesToBrain: false,
  }),
]);

export function seatSacrificeImplementation(card = {}) {
  const mechanics = card.mechanics || extractMechanicalSignals(card);
  const kinds = mechanics.sacrificeKinds
    || classifySacrificeKinds(card.oracleText || card.oracle_text || "");
  const rows = [];
  for (const definition of ATLAS_SACRIFICE_SEATS) {
    if (!kinds.includes(definition.kind)) continue;
    rows.push(freeze({
      kind: definition.kind,
      capability: definition.capability,
      seat: definition.seat,
      contrast: definition.contrast,
      implementation: freeze({
        card: String(card.name || "Unknown card"),
        roles: freeze([definition.role]),
        evidenceSignals: freeze([definition.kind]),
      }),
      writesToBrain: false,
    }));
  }
  return freeze(rows);
}

/**
 * Descriptive seating for a card's own trigger condition.
 * Consumes graph `triggerKinds` — no second oracle regex family.
 * Enter is not a blink/flicker recursion pattern. Cast is not spellslinger
 * construction occupancy. Attack is not extra-combat amplification and not
 * stax construction occupancy. Combat damage is not an Attack Trigger and
 * not extra-combat amplification. Noncombat damage is not a Combat Damage
 * Trigger and not the damage-doubling amplifier — all five are named
 * trigger conditions only.
 * Not Capability admissions. Never construction inputs.
 */
export const ATLAS_TRIGGER_SEATS = freeze([
  freeze({
    kind: "enter",
    capability: freeze({
      id: "cap:enter_trigger",
      label: "Enter Trigger",
      status: "descriptive_not_admitted",
      atlasAdmitted: false,
    }),
    seat: freeze({ id: "seat:enter_trigger", label: "Enter Trigger" }),
    contrast: "not a blink/flicker effect",
    role: "entry_trigger",
    writesToBrain: false,
  }),
  freeze({
    kind: "cast",
    capability: freeze({
      id: "cap:cast_trigger",
      label: "Cast Trigger",
      status: "descriptive_not_admitted",
      atlasAdmitted: false,
    }),
    seat: freeze({ id: "seat:cast_trigger", label: "Cast Trigger" }),
    contrast: "not spellslinger construction occupancy",
    role: "cast_trigger",
    writesToBrain: false,
  }),
  freeze({
    kind: "attack",
    capability: freeze({
      id: "cap:attack_trigger",
      label: "Attack Trigger",
      status: "descriptive_not_admitted",
      atlasAdmitted: false,
    }),
    seat: freeze({ id: "seat:attack_trigger", label: "Attack Trigger" }),
    contrast: "not extra-combat amplification or stax construction occupancy",
    role: "attack_trigger",
    writesToBrain: false,
  }),
  freeze({
    kind: "combat_damage",
    capability: freeze({
      id: "cap:combat_damage_trigger",
      label: "Combat Damage Trigger",
      status: "descriptive_not_admitted",
      atlasAdmitted: false,
    }),
    seat: freeze({ id: "seat:combat_damage_trigger", label: "Combat Damage Trigger" }),
    contrast: "not an Attack Trigger or extra-combat amplification",
    role: "combat_damage_trigger",
    writesToBrain: false,
  }),
  freeze({
    kind: "noncombat_damage",
    capability: freeze({
      id: "cap:noncombat_damage_trigger",
      label: "Damage Trigger",
      status: "descriptive_not_admitted",
      atlasAdmitted: false,
    }),
    seat: freeze({ id: "seat:noncombat_damage_trigger", label: "Damage Trigger" }),
    contrast: "not a Combat Damage Trigger or extra-combat amplification",
    role: "noncombat_damage_trigger",
    writesToBrain: false,
  }),
]);

export function seatTriggerImplementation(card = {}) {
  const mechanics = card.mechanics || extractMechanicalSignals(card);
  const kinds = mechanics.triggerKinds
    || classifyTriggerKinds(card.oracleText || card.oracle_text || "");
  const rows = [];
  for (const definition of ATLAS_TRIGGER_SEATS) {
    if (!kinds.includes(definition.kind)) continue;
    rows.push(freeze({
      kind: definition.kind,
      capability: definition.capability,
      seat: definition.seat,
      contrast: definition.contrast,
      implementation: freeze({
        card: String(card.name || "Unknown card"),
        roles: freeze([definition.role]),
        evidenceSignals: freeze([definition.kind]),
      }),
      writesToBrain: false,
    }));
  }
  return freeze(rows);
}

/**
 * Descriptive seating for counter kinds — splits the single blended
 * `counters` produces/rewards signal into named seats.
 * Consumes graph `counterKinds` — no second oracle regex family.
 * Put is placement, not proliferate. Proliferate is its own keyword, not a
 * single counter placement. Remove is neither placement nor proliferate.
 * Not Capability admissions. Never construction inputs.
 */
export const ATLAS_COUNTER_SEATS = freeze([
  freeze({
    kind: "put",
    capability: freeze({
      id: "cap:counter_placement",
      label: "Counter Placement",
      status: "descriptive_not_admitted",
      atlasAdmitted: false,
    }),
    seat: freeze({ id: "seat:counter_placement", label: "Counter Placement" }),
    contrast: "not proliferate",
    role: "counter_producer",
    writesToBrain: false,
  }),
  freeze({
    kind: "proliferate",
    capability: freeze({
      id: "cap:proliferate",
      label: "Proliferate Effect",
      status: "descriptive_not_admitted",
      atlasAdmitted: false,
    }),
    seat: freeze({ id: "seat:proliferate", label: "Proliferate Effect" }),
    contrast: "not a single counter placement",
    role: "proliferator",
    writesToBrain: false,
  }),
  freeze({
    kind: "remove",
    capability: freeze({
      id: "cap:counter_removal",
      label: "Counter Removal",
      status: "descriptive_not_admitted",
      atlasAdmitted: false,
    }),
    seat: freeze({ id: "seat:counter_removal", label: "Counter Removal" }),
    contrast: "not counter placement or proliferate",
    role: "counter_remover",
    writesToBrain: false,
  }),
]);

export function seatCounterImplementation(card = {}) {
  const mechanics = card.mechanics || extractMechanicalSignals(card);
  const kinds = mechanics.counterKinds
    || classifyCounterKinds(card.oracleText || card.oracle_text || "");
  const rows = [];
  for (const definition of ATLAS_COUNTER_SEATS) {
    if (!kinds.includes(definition.kind)) continue;
    rows.push(freeze({
      kind: definition.kind,
      capability: definition.capability,
      seat: definition.seat,
      contrast: definition.contrast,
      implementation: freeze({
        card: String(card.name || "Unknown card"),
        roles: freeze([definition.role]),
        evidenceSignals: freeze([definition.kind]),
      }),
      writesToBrain: false,
    }));
  }
  return freeze(rows);
}

/**
 * Descriptive seating for life kinds — splits the single blended `life`
 * produces/rewards signal into named seats.
 * Consumes graph `lifeKinds` — no second oracle regex family.
 * Gain is an actual life-gain effect, not a whenever-you-gain-life payoff
 * and not lifelink reminder. Lifelink is the keyword, not a lifegain spell.
 * Pay is spending your own life, not opponents losing life.
 * Not Capability admissions. Never construction inputs.
 */
export const ATLAS_LIFE_SEATS = freeze([
  freeze({
    kind: "gain",
    capability: freeze({
      id: "cap:life_gain",
      label: "Life Gain",
      status: "descriptive_not_admitted",
      atlasAdmitted: false,
    }),
    seat: freeze({ id: "seat:life_gain", label: "Life Gain" }),
    contrast: "not lifelink or a whenever-you-gain-life payoff",
    role: "life_gain",
    writesToBrain: false,
  }),
  freeze({
    kind: "lifelink",
    capability: freeze({
      id: "cap:lifelink",
      label: "Lifelink",
      status: "descriptive_not_admitted",
      atlasAdmitted: false,
    }),
    seat: freeze({ id: "seat:lifelink", label: "Lifelink" }),
    contrast: "not a lifegain spell",
    role: "lifelink",
    writesToBrain: false,
  }),
  freeze({
    kind: "pay",
    capability: freeze({
      id: "cap:life_pay",
      label: "Life Payment",
      status: "descriptive_not_admitted",
      atlasAdmitted: false,
    }),
    seat: freeze({ id: "seat:life_pay", label: "Life Payment" }),
    contrast: "not gaining life or opponents losing life",
    role: "life_pay",
    writesToBrain: false,
  }),
]);

export function seatLifeImplementation(card = {}) {
  const mechanics = card.mechanics || extractMechanicalSignals(card);
  const kinds = mechanics.lifeKinds
    || classifyLifeKinds(card.oracleText || card.oracle_text || "");
  const rows = [];
  for (const definition of ATLAS_LIFE_SEATS) {
    if (!kinds.includes(definition.kind)) continue;
    rows.push(freeze({
      kind: definition.kind,
      capability: definition.capability,
      seat: definition.seat,
      contrast: definition.contrast,
      implementation: freeze({
        card: String(card.name || "Unknown card"),
        roles: freeze([definition.role]),
        evidenceSignals: freeze([definition.kind]),
      }),
      writesToBrain: false,
    }));
  }
  return freeze(rows);
}

/**
 * Descriptive seating for protection kinds — splits the single blended
 * `protection` produces/rewards signal into named seats.
 * Consumes graph `protectionKinds` — no second oracle regex family.
 * Hexproof is the keyword, not indestructible or ward. Indestructible is
 * the keyword, not hexproof or ward. Ward is a tax on targeting, not
 * hexproof. Shroud is the keyword, not hexproof. Protection-from is the ability, not hexproof or ward. Phase-out is phasing, not blink occupancy.
 * Not Capability admissions. Never construction inputs.
 */
export const ATLAS_PROTECTION_SEATS = freeze([
  freeze({
    kind: "hexproof",
    capability: freeze({
      id: "cap:hexproof",
      label: "Hexproof",
      status: "descriptive_not_admitted",
      atlasAdmitted: false,
    }),
    seat: freeze({ id: "seat:hexproof", label: "Hexproof" }),
    contrast: "not indestructible or ward",
    role: "hexproof",
    writesToBrain: false,
  }),
  freeze({
    kind: "indestructible",
    capability: freeze({
      id: "cap:indestructible",
      label: "Indestructible",
      status: "descriptive_not_admitted",
      atlasAdmitted: false,
    }),
    seat: freeze({ id: "seat:indestructible", label: "Indestructible" }),
    contrast: "not hexproof or ward",
    role: "indestructible",
    writesToBrain: false,
  }),
  freeze({
    kind: "ward",
    capability: freeze({
      id: "cap:ward",
      label: "Ward",
      status: "descriptive_not_admitted",
      atlasAdmitted: false,
    }),
    seat: freeze({ id: "seat:ward", label: "Ward" }),
    contrast: "not hexproof or indestructible",
    role: "ward",
    writesToBrain: false,
  }),
  freeze({
    kind: "shroud",
    capability: freeze({
      id: "cap:shroud",
      label: "Shroud",
      status: "descriptive_not_admitted",
      atlasAdmitted: false,
    }),
    seat: freeze({ id: "seat:shroud", label: "Shroud" }),
    contrast: "not hexproof",
    role: "shroud",
    writesToBrain: false,
  }),
  freeze({
    kind: "protection_from",
    capability: freeze({
      id: "cap:protection_from",
      label: "Protection From",
      status: "descriptive_not_admitted",
      atlasAdmitted: false,
    }),
    seat: freeze({ id: "seat:protection_from", label: "Protection From" }),
    contrast: "not hexproof or ward",
    role: "protection_from",
    writesToBrain: false,
  }),
  freeze({
    kind: "phase_out",
    capability: freeze({
      id: "cap:phase_out",
      label: "Phase Out",
      status: "descriptive_not_admitted",
      atlasAdmitted: false,
    }),
    seat: freeze({ id: "seat:phase_out", label: "Phase Out" }),
    contrast: "not blink occupancy",
    role: "phase_out",
    writesToBrain: false,
  }),
]);

export function seatProtectionImplementation(card = {}) {
  const mechanics = card.mechanics || extractMechanicalSignals(card);
  const kinds = mechanics.protectionKinds
    || classifyProtectionKinds(card.oracleText || card.oracle_text || "");
  const rows = [];
  for (const definition of ATLAS_PROTECTION_SEATS) {
    if (!kinds.includes(definition.kind)) continue;
    rows.push(freeze({
      kind: definition.kind,
      capability: definition.capability,
      seat: definition.seat,
      contrast: definition.contrast,
      implementation: freeze({
        card: String(card.name || "Unknown card"),
        roles: freeze([definition.role]),
        evidenceSignals: freeze([definition.kind]),
      }),
      writesToBrain: false,
    }));
  }
  return freeze(rows);
}

/**
 * Descriptive seating for evasion kinds — splits the single blended
 * `evasion` produces/rewards signal into named seats.
 * Consumes graph `evasionKinds` — no second oracle regex family.
 * Flying, menace, and trample are each the keyword, not the others.
 * Unblockable is can't-be-blocked, not skulk. Skulk is the keyword, not unblockable. Reach is the keyword, not flying. Fear and shadow stay unnamed.
 * Not Capability admissions. Never construction inputs.
 */
export const ATLAS_EVASION_SEATS = freeze([
  freeze({
    kind: "flying",
    capability: freeze({
      id: "cap:flying",
      label: "Flying",
      status: "descriptive_not_admitted",
      atlasAdmitted: false,
    }),
    seat: freeze({ id: "seat:flying", label: "Flying" }),
    contrast: "not menace or trample",
    role: "flying",
    writesToBrain: false,
  }),
  freeze({
    kind: "menace",
    capability: freeze({
      id: "cap:menace",
      label: "Menace",
      status: "descriptive_not_admitted",
      atlasAdmitted: false,
    }),
    seat: freeze({ id: "seat:menace", label: "Menace" }),
    contrast: "not flying or trample",
    role: "menace",
    writesToBrain: false,
  }),
  freeze({
    kind: "trample",
    capability: freeze({
      id: "cap:trample",
      label: "Trample",
      status: "descriptive_not_admitted",
      atlasAdmitted: false,
    }),
    seat: freeze({ id: "seat:trample", label: "Trample" }),
    contrast: "not flying or menace",
    role: "trample",
    writesToBrain: false,
  }),
  freeze({
    kind: "unblockable",
    capability: freeze({
      id: "cap:unblockable",
      label: "Unblockable",
      status: "descriptive_not_admitted",
      atlasAdmitted: false,
    }),
    seat: freeze({ id: "seat:unblockable", label: "Unblockable" }),
    contrast: "not skulk or fear/shadow",
    role: "unblockable",
    writesToBrain: false,
  }),
  freeze({
    kind: "skulk",
    capability: freeze({
      id: "cap:skulk",
      label: "Skulk",
      status: "descriptive_not_admitted",
      atlasAdmitted: false,
    }),
    seat: freeze({ id: "seat:skulk", label: "Skulk" }),
    contrast: "not unblockable",
    role: "skulk",
    writesToBrain: false,
  }),
  freeze({
    kind: "reach",
    capability: freeze({
      id: "cap:reach",
      label: "Reach",
      status: "descriptive_not_admitted",
      atlasAdmitted: false,
    }),
    seat: freeze({ id: "seat:reach", label: "Reach" }),
    contrast: "not flying",
    role: "reach",
    writesToBrain: false,
  }),
]);

export function seatEvasionImplementation(card = {}) {
  const mechanics = card.mechanics || extractMechanicalSignals(card);
  const kinds = mechanics.evasionKinds
    || classifyEvasionKinds(card.oracleText || card.oracle_text || "");
  const rows = [];
  for (const definition of ATLAS_EVASION_SEATS) {
    if (!kinds.includes(definition.kind)) continue;
    rows.push(freeze({
      kind: definition.kind,
      capability: definition.capability,
      seat: definition.seat,
      contrast: definition.contrast,
      implementation: freeze({
        card: String(card.name || "Unknown card"),
        roles: freeze([definition.role]),
        evidenceSignals: freeze([definition.kind]),
      }),
      writesToBrain: false,
    }));
  }
  return freeze(rows);
}

/**
 * Descriptive seating for land kinds — splits the single blended `lands`
 * produces/rewards signal into named seats.
 * Consumes graph `landKinds` — no second oracle regex family.
 * Landfall is a land-enters trigger or the landfall keyword, not an extra
 * land drop and not a land search. Extra land drop is permission to play
 * more lands, not landfall. Search is tutoring a land from the library,
 * not landfall.
 * Not Capability admissions. Never construction inputs.
 */
export const ATLAS_LAND_SEATS = freeze([
  freeze({
    kind: "landfall",
    capability: freeze({
      id: "cap:landfall",
      label: "Landfall",
      status: "descriptive_not_admitted",
      atlasAdmitted: false,
    }),
    seat: freeze({ id: "seat:landfall", label: "Landfall" }),
    contrast: "not an extra land drop or a land search",
    role: "landfall",
    writesToBrain: false,
  }),
  freeze({
    kind: "extra_drop",
    capability: freeze({
      id: "cap:extra_land_drop",
      label: "Extra Land Drop",
      status: "descriptive_not_admitted",
      atlasAdmitted: false,
    }),
    seat: freeze({ id: "seat:extra_land_drop", label: "Extra Land Drop" }),
    contrast: "not landfall or a land search",
    role: "extra_land_drop",
    writesToBrain: false,
  }),
  freeze({
    kind: "search",
    capability: freeze({
      id: "cap:land_search",
      label: "Land Search",
      status: "descriptive_not_admitted",
      atlasAdmitted: false,
    }),
    seat: freeze({ id: "seat:land_search", label: "Land Search" }),
    contrast: "not landfall or an extra land drop",
    role: "land_search",
    writesToBrain: false,
  }),
]);

export function seatLandImplementation(card = {}) {
  const mechanics = card.mechanics || extractMechanicalSignals(card);
  const kinds = mechanics.landKinds
    || classifyLandKinds(card.oracleText || card.oracle_text || "");
  const rows = [];
  for (const definition of ATLAS_LAND_SEATS) {
    if (!kinds.includes(definition.kind)) continue;
    rows.push(freeze({
      kind: definition.kind,
      capability: definition.capability,
      seat: definition.seat,
      contrast: definition.contrast,
      implementation: freeze({
        card: String(card.name || "Unknown card"),
        roles: freeze([definition.role]),
        evidenceSignals: freeze([definition.kind]),
      }),
      writesToBrain: false,
    }));
  }
  return freeze(rows);
}

/**
 * Descriptive seating for artifact kinds — splits the single blended
 * `artifacts` produces/rewards signal into named seats.
 * Consumes graph `artifactKinds` — no second oracle regex family.
 * Spell is casting an artifact, not artifacts-you-control and not an
 * artifact outlet. Matters is artifacts you control or an artifact-enters
 * watch, not an artifact-spell trigger. Outlet is sacrificing an artifact,
 * not named-resource occupancy.
 * Not Capability admissions. Never construction inputs.
 */
export const ATLAS_ARTIFACT_SEATS = freeze([
  freeze({
    kind: "spell",
    capability: freeze({
      id: "cap:artifact_spell",
      label: "Artifact Spell",
      status: "descriptive_not_admitted",
      atlasAdmitted: false,
    }),
    seat: freeze({ id: "seat:artifact_spell", label: "Artifact Spell" }),
    contrast: "not artifacts-you-control or an artifact outlet",
    role: "artifact_spell",
    writesToBrain: false,
  }),
  freeze({
    kind: "matters",
    capability: freeze({
      id: "cap:artifact_matters",
      label: "Artifact Matters",
      status: "descriptive_not_admitted",
      atlasAdmitted: false,
    }),
    seat: freeze({ id: "seat:artifact_matters", label: "Artifact Matters" }),
    contrast: "not an artifact-spell trigger or an artifact outlet",
    role: "artifact_matters",
    writesToBrain: false,
  }),
  freeze({
    kind: "outlet",
    capability: freeze({
      id: "cap:artifact_outlet",
      label: "Artifact Outlet",
      status: "descriptive_not_admitted",
      atlasAdmitted: false,
    }),
    seat: freeze({ id: "seat:artifact_outlet", label: "Artifact Outlet" }),
    contrast: "not an artifact spell or artifact-matters",
    role: "artifact_outlet",
    writesToBrain: false,
  }),
]);

export function seatArtifactImplementation(card = {}) {
  const mechanics = card.mechanics || extractMechanicalSignals(card);
  const kinds = mechanics.artifactKinds
    || classifyArtifactKinds(card.oracleText || card.oracle_text || "");
  const rows = [];
  for (const definition of ATLAS_ARTIFACT_SEATS) {
    if (!kinds.includes(definition.kind)) continue;
    rows.push(freeze({
      kind: definition.kind,
      capability: definition.capability,
      seat: definition.seat,
      contrast: definition.contrast,
      implementation: freeze({
        card: String(card.name || "Unknown card"),
        roles: freeze([definition.role]),
        evidenceSignals: freeze([definition.kind]),
      }),
      writesToBrain: false,
    }));
  }
  return freeze(rows);
}

function descriptiveKindSeat(kind, label, contrast, role, capId = `cap:${kind}`) {
  return freeze({
    kind,
    capability: freeze({
      id: capId,
      label,
      status: "descriptive_not_admitted",
      atlasAdmitted: false,
    }),
    seat: freeze({ id: `seat:${kind}`, label }),
    contrast,
    role,
    writesToBrain: false,
  });
}

/**
 * Descriptive seating for token kinds — splits the single blended `tokens`
 * produces/rewards signal into named seats.
 * Consumes graph `tokenKinds` — no second oracle regex family.
 * Create is making a token, not a go-wide anthem. Go-wide is tokens you
 * control, not creation. Sac is sacrificing a token, not a creature outlet.
 * Not Capability admissions. Never construction inputs.
 */
export const ATLAS_TOKEN_SEATS = freeze([
  descriptiveKindSeat("create", "Token Create", "not a go-wide anthem or sacrificing a token", "token_create"),
  descriptiveKindSeat("go_wide", "Token Go-Wide", "not token creation or sacrificing a token", "token_go_wide", "cap:token_go_wide"),
  descriptiveKindSeat("sac", "Token Sac", "not token creation or a creature outlet", "token_sac", "cap:token_sac"),
]);

export function seatTokenImplementation(card = {}) {
  const mechanics = card.mechanics || extractMechanicalSignals(card);
  const kinds = mechanics.tokenKinds || classifyTokenKinds(card.oracleText || card.oracle_text || "");
  return seatKindRows(ATLAS_TOKEN_SEATS, kinds, card);
}

/**
 * Descriptive seating for aura kinds — splits the single blended `auras`
 * produces/rewards signal into named seats.
 * Consumes graph `auraKinds` — no second oracle regex family.
 * Enchant is the Aura enchant-clause, not auras-you-control. Matters is
 * auras you control, not the enchant clause. Affinity is affinity for
 * Auras, not enchanting. Equipment stays unnamed this phase.
 * Not Capability admissions. Never construction inputs.
 */
export const ATLAS_AURA_SEATS = freeze([
  descriptiveKindSeat("enchant", "Aura Enchant", "not auras-you-control or affinity", "aura_enchant", "cap:aura_enchant"),
  descriptiveKindSeat("matters", "Aura Matters", "not the enchant clause or affinity", "aura_matters", "cap:aura_matters"),
  descriptiveKindSeat("affinity", "Aura Affinity", "not the enchant clause or auras-you-control", "aura_affinity", "cap:aura_affinity"),
]);

export function seatAuraImplementation(card = {}) {
  const mechanics = card.mechanics || extractMechanicalSignals(card);
  const kinds = mechanics.auraKinds || classifyAuraKinds(card.oracleText || card.oracle_text || "");
  return seatKindRows(ATLAS_AURA_SEATS, kinds, card);
}

/**
 * Descriptive seating for spell kinds — splits the single blended `spells`
 * produces/rewards signal into named seats.
 * Consumes graph `spellKinds` — no second oracle regex family.
 * Copy is copying a spell, not casting without paying. Free is casting
 * without paying mana, not flashback. Noncreature is instant-or-sorcery
 * text, not a whenever-you-cast trigger kind and not magecraft.
 * Not Capability admissions. Never construction inputs.
 */
export const ATLAS_SPELL_SEATS = freeze([
  descriptiveKindSeat("copy", "Spell Copy", "not casting without paying or an instant-or-sorcery watch", "spell_copy", "cap:spell_copy"),
  descriptiveKindSeat("free", "Free Spell", "not copy or flashback", "spell_free", "cap:spell_free"),
  descriptiveKindSeat("noncreature", "Noncreature Spell", "not a whenever-you-cast trigger kind and not magecraft", "spell_noncreature", "cap:spell_noncreature"),
]);

export function seatSpellImplementation(card = {}) {
  const mechanics = card.mechanics || extractMechanicalSignals(card);
  const kinds = mechanics.spellKinds || classifySpellKinds(card.oracleText || card.oracle_text || "");
  return seatKindRows(ATLAS_SPELL_SEATS, kinds, card);
}

/**
 * Descriptive seating for draw kinds — splits the single blended `draw`
 * produces/rewards signal into named seats.
 * Consumes graph `drawKinds` — no second oracle regex family.
 * Watch is a whenever-you-draw payoff, not net draw. Wheel is each-player
 * discard/draw, not rummage. Hand is cards-in-hand, not a draw spell.
 * Not Capability admissions. Never construction inputs.
 */
export const ATLAS_DRAW_SEATS = freeze([
  descriptiveKindSeat("watch", "Draw Watch", "not net draw or a wheel", "draw_watch", "cap:draw_watch"),
  descriptiveKindSeat("wheel", "Wheel", "not rummage or a whenever-you-draw payoff", "draw_wheel", "cap:draw_wheel"),
  descriptiveKindSeat("hand", "Hand Size", "not a draw spell or a wheel", "draw_hand", "cap:draw_hand"),
]);

export function seatDrawImplementation(card = {}) {
  const mechanics = card.mechanics || extractMechanicalSignals(card);
  const kinds = mechanics.drawKinds || classifyDrawKinds(card.oracleText || card.oracle_text || "");
  return seatKindRows(ATLAS_DRAW_SEATS, kinds, card);
}

export const ATLAS_DAMAGE_SEATS = freeze([
  descriptiveKindSeat("deal", "Damage Deal", "not a combat-damage trigger or drain", "damage_deal", "cap:damage_deal"),
  descriptiveKindSeat("drain", "Life Drain", "not dealing damage or paying your own life", "damage_drain", "cap:damage_drain"),
  descriptiveKindSeat("prevent", "Damage Prevent", "not dealing damage or drain", "damage_prevent", "cap:damage_prevent"),
]);

export function seatDamageImplementation(card = {}) {
  const mechanics = card.mechanics || extractMechanicalSignals(card);
  const kinds = mechanics.damageKinds || classifyDamageKinds(card.oracleText || card.oracle_text || "");
  return seatKindRows(ATLAS_DAMAGE_SEATS, kinds, card);
}

export const ATLAS_EQUIPMENT_SEATS = freeze([
  descriptiveKindSeat("equip", "Equip", "not an attach trigger or an equipped-creature bonus", "equipment_equip", "cap:equipment_equip"),
  descriptiveKindSeat("attach", "Equipment Attach", "not the equip keyword or an equipped-creature bonus", "equipment_attach", "cap:equipment_attach"),
  descriptiveKindSeat("bonus", "Equipped Bonus", "not the equip keyword or an attach trigger", "equipment_bonus", "cap:equipment_bonus"),
]);

export function seatEquipmentImplementation(card = {}) {
  const mechanics = card.mechanics || extractMechanicalSignals(card);
  const kinds = mechanics.equipmentKinds || classifyEquipmentKinds(card.oracleText || card.oracle_text || "");
  return seatKindRows(ATLAS_EQUIPMENT_SEATS, kinds, card);
}

export const ATLAS_COMBAT_SEATS = freeze([
  descriptiveKindSeat("haste", "Haste", "not extra combat or vigilance", "combat_haste", "cap:combat_haste"),
  descriptiveKindSeat("extra", "Extra Combat", "not an Attack Trigger and not haste", "combat_extra", "cap:combat_extra"),
  descriptiveKindSeat("vigilance", "Vigilance", "not haste or extra combat", "combat_vigilance", "cap:combat_vigilance"),
  descriptiveKindSeat("first_strike", "First Strike", "not double strike or deathtouch", "combat_first_strike", "cap:combat_first_strike"),
  descriptiveKindSeat("double_strike", "Double Strike", "not first strike or deathtouch", "combat_double_strike", "cap:combat_double_strike"),
  descriptiveKindSeat("deathtouch", "Deathtouch", "not first strike or double strike", "combat_deathtouch", "cap:combat_deathtouch"),
]);

export function seatCombatImplementation(card = {}) {
  const mechanics = card.mechanics || extractMechanicalSignals(card);
  const kinds = mechanics.combatKinds || classifyCombatKinds(card.oracleText || card.oracle_text || "");
  return seatKindRows(ATLAS_COMBAT_SEATS, kinds, card);
}

/**
 * Descriptive seating for mutual loops and reset/pay shapes.
 * Consumes graph `loopKind` / `shape` — no second oracle regex family.
 * Pair observation only. Not a combo solver. Never construction inputs.
 */
export const ATLAS_LOOP_SEATS = freeze([
  freeze({
    kind: LOOP_KINDS.ENGINE,
    capability: freeze({
      id: "cap:mutual_engine_loop",
      label: "Mutual Engine",
      status: "descriptive_not_admitted",
      atlasAdmitted: false,
    }),
    seat: freeze({ id: "seat:mutual_engine", label: "Mutual Engine" }),
    contrast: "not a verified infinite",
    writesToBrain: false,
  }),
  freeze({
    kind: LOOP_KINDS.CLOSED_LOOP,
    capability: freeze({
      id: "cap:reset_closed_loop",
      label: "Reset Closed Loop",
      status: "descriptive_not_admitted",
      atlasAdmitted: false,
    }),
    seat: freeze({ id: "seat:reset_closed_loop", label: "Reset Closed Loop" }),
    contrast: "investigate, not a verified infinite",
    writesToBrain: false,
  }),
  freeze({
    kind: LOOP_KINDS.CONDITIONAL_WIN,
    capability: freeze({
      id: "cap:conditional_board_win",
      label: "Conditional Board Win",
      status: "descriptive_not_admitted",
      atlasAdmitted: false,
    }),
    seat: freeze({ id: "seat:conditional_board_win", label: "Conditional Board Win" }),
    contrast: "a board-state win, not a loop",
    writesToBrain: false,
  }),
]);

export const ATLAS_RESET_SHAPE_SEATS = freeze([
  freeze({
    shape: RESET_SHAPES.ARTIFACT_UNTAP,
    seat: freeze({ id: "seat:artifact_untap_reset", label: "Artifact Untap Reset" }),
    writesToBrain: false,
  }),
  freeze({
    shape: RESET_SHAPES.COPY_ACTIVATED,
    seat: freeze({ id: "seat:copy_activated_reset", label: "Copy-Activated Reset" }),
    writesToBrain: false,
  }),
  freeze({
    shape: RESET_SHAPES.COPY_ETB_UNTAP,
    seat: freeze({ id: "seat:copy_etb_untap_reset", label: "Copy Enter Untap Reset" }),
    writesToBrain: false,
  }),
  freeze({
    shape: RESET_SHAPES.IMPRINT_UNTAP_ALL,
    seat: freeze({ id: "seat:imprint_untap_reset", label: "Imprint Untap Reset" }),
    writesToBrain: false,
  }),
]);

function oracleOf(card = {}) {
  return String(card.oracleText || card.oracle_text || "");
}

/**
 * Seat a graph-labeled pair. Engine requires an explicit `loopKind` from
 * the graph so two unrelated oracles are not seated as engines by default.
 */
export function seatLoopImplementation(pair = {}) {
  const left = pair.left || {};
  const right = pair.right || {};
  const leftOracle = oracleOf(left) || String(pair.leftOracle || "");
  const rightOracle = oracleOf(right) || String(pair.rightOracle || "");
  const shape = pair.shape || resetPayShape(leftOracle, rightOracle) || null;
  let loopKind = pair.loopKind || null;
  if (!loopKind) {
    if (shape) loopKind = LOOP_KINDS.CLOSED_LOOP;
    else {
      const classified = classifyLoopKind(leftOracle, rightOracle);
      if (classified !== LOOP_KINDS.ENGINE) loopKind = classified;
    }
  }
  const loopDef = ATLAS_LOOP_SEATS.find((row) => row.kind === loopKind);
  if (!loopDef) return freeze([]);
  const shapeDef = ATLAS_RESET_SHAPE_SEATS.find((row) => row.shape === shape) || null;
  const cards = freeze([
    left.name || pair.cards?.[0] || "Unknown card",
    right.name || pair.cards?.[1] || "Unknown card",
  ].map((name) => String(name)));
  return freeze([freeze({
    kind: loopDef.kind,
    shape: shape || null,
    capability: loopDef.capability,
    seat: loopDef.seat,
    resetSeat: shapeDef?.seat || null,
    contrast: loopDef.contrast,
    implementation: freeze({
      cards,
      roles: freeze(shape ? ["reset_shape"] : ["mutual_loop"]),
      evidenceSignals: freeze([loopDef.kind, ...(shape ? [shape] : [])]),
    }),
    writesToBrain: false,
  })]);
}

/** Coverage Observation 001 — honest Age of Vocabulary result. */
export const ATLAS_OBSERVATION_001 = freeze({
  paper: "What Is Strategic Coverage?",
  verdict: "PARTIAL_SIGNAL_NO_UMBRELLA_ADMISSION",
  capabilityLabelsAdmitted: 0,
  capabilityLabelsRejectedLevelA: 7,
  coverageScoreExists: false,
  brainUntouched: true,
  note: "Global residuals correlate after interaction-count controls, but several reverse under Level-A same-commander contrasts. Atlas refused Capability words from elegant but commander-uncontrolled signals.",
});

/** Logged vocabulary revisions (Age of Vocabulary success criterion #1). */
export const ATLAS_VOCABULARY_REVISIONS = freeze([
  freeze({
    date: "2026-08-11",
    change: "Named Age of Vocabulary; Atlas primary focus; Capability admission stays 0 after Coverage 001",
  }),
  freeze({
    date: "2026-08-12",
    change: "Registry v0 engineering surface — stable core terms + illustrative equivalence; still 0 Capability admissions",
  }),
  freeze({
    date: "2026-08-15",
    change: "Seated graph selection kinds (scry / surveil / rummage / connive / impulse / draw); still 0 Capability admissions",
  }),
  freeze({
    date: "2026-08-15",
    change: "Seated graph loop kinds and reset/pay shapes; still 0 Capability admissions",
  }),
  freeze({
    date: "2026-08-15",
    change: "Seated mill as a graveyard dump, distinct from surveil; still 0 Capability admissions",
  }),
  freeze({
    date: "2026-08-15",
    change: "Seated dredge as a graveyard filter/engine, distinct from mill dump; still 0 Capability admissions",
  }),
  freeze({
    date: "2026-08-15",
    change: "Seated flashback, unearth, and escape as graveyard returns, distinct from mill dump and dredge-to-hand; still 0 Capability admissions",
  }),
  freeze({
    date: "2026-08-15",
    change: "Split the blended sacrifice signal into outlet / death payoff / incidental yard seats; still 0 Capability admissions",
  }),
  freeze({
    date: "2026-08-15",
    change: "Named enter and cast as a card's own trigger condition, distinct from blink/flicker and from spellslinger occupancy; still 0 Capability admissions",
  }),
  freeze({
    date: "2026-08-15",
    change: "Added attack as a third trigger kind, distinct from extra-combat amplification and from stax occupancy; still 0 Capability admissions",
  }),
  freeze({
    date: "2026-08-15",
    change: "Added combat damage as a fourth trigger kind, distinct from Attack Trigger and from extra-combat amplification; still 0 Capability admissions",
  }),
  freeze({
    date: "2026-08-15",
    change: "Added noncombat damage as a fifth trigger kind, distinct from Combat Damage Trigger and from the damage-doubling amplifier; still 0 Capability admissions",
  }),
  freeze({
    date: "2026-08-15",
    change: "Split the blended counters signal into put / proliferate / remove seats; still 0 Capability admissions",
  }),
  freeze({
    date: "2026-08-15",
    change: "Split the blended life signal into gain / lifelink / pay seats; still 0 Capability admissions",
  }),
  freeze({
    date: "2026-08-15",
    change: "Split the blended protection signal into hexproof / indestructible / ward seats; still 0 Capability admissions",
  }),
  freeze({
    date: "2026-08-15",
    change: "Split the blended evasion signal into flying / menace / trample seats; still 0 Capability admissions",
  }),
  freeze({
    date: "2026-08-15",
    change: "Split the blended lands signal into landfall / extra land drop / search seats; still 0 Capability admissions",
  }),
  freeze({
    date: "2026-08-15",
    change: "Split the blended artifacts signal into spell / matters / outlet seats; still 0 Capability admissions",
  }),
  freeze({
    date: "2026-08-15",
    change: "Split the blended tokens signal into create / go-wide / sac seats; still 0 Capability admissions",
  }),
  freeze({
    date: "2026-08-15",
    change: "Split the blended auras signal into enchant / matters / affinity seats; still 0 Capability admissions",
  }),
  freeze({
    date: "2026-08-15",
    change: "Split the blended spells signal into copy / free / noncreature seats; still 0 Capability admissions",
  }),
  freeze({
    date: "2026-08-15",
    change: "Split the blended draw signal into watch / wheel / hand seats; still 0 Capability admissions",
  }),
  freeze({
    date: "2026-08-15",
    change: "Named deal / drain / prevent as damage kinds; still 0 Capability admissions",
  }),
  freeze({
    date: "2026-08-15",
    change: "Named equip / attach / bonus as equipment kinds; still 0 Capability admissions",
  }),
  freeze({
    date: "2026-08-15",
    change: "Named haste / extra combat / vigilance as combat kinds; still 0 Capability admissions",
  }),
  freeze({
    date: "2026-08-15",
    change: "Named shroud / protection-from / phase-out as protection kinds; still 0 Capability admissions",
  }),
  freeze({
    date: "2026-08-15",
    change: "Named first strike / double strike / deathtouch as combat kinds; still 0 Capability admissions",
  }),
  freeze({
    date: "2026-08-16",
    change: "Named unblockable / skulk / reach as evasion kinds; still 0 Capability admissions",
  }),
]);

export function seatsImplementedBy(cardName = "") {
  const want = String(cardName || "").trim().toLocaleLowerCase("en");
  if (!want) return freeze([]);
  const hit = ATLAS_EQUIVALENCE_ILLUSTRATIVE.find(
    (row) => row.card.toLocaleLowerCase("en") === want,
  );
  return freeze(hit ? [...hit.seats] : []);
}

export function cardsImplementingSeat(seatLabel = "") {
  const want = String(seatLabel || "").trim().toLocaleLowerCase("en");
  if (!want) return freeze([]);
  return freeze(
    ATLAS_EQUIVALENCE_ILLUSTRATIVE
      .filter((row) => row.seats.some((seat) => seat.toLocaleLowerCase("en") === want))
      .map((row) => row.card),
  );
}

/**
 * Atlas Vocabulary Registry — inspectable Age of Vocabulary artifact.
 */
export function buildAtlasVocabularyRegistry() {
  return freeze({
    kind: "AtlasVocabularyRegistry",
    version: "atlas-vocabulary-v0",
    writesToBrain: false,
    activated: false,
    promoted: false,
    ageOfVocabulary: freeze({
      complete: true,
      label: "Age of Vocabulary — Engineering Complete",
      note: "Atlas terms stable · equivalence inspectable · Coverage multidimensional · Capability admissions: 0 · Brain: 0",
    }),
    coreTerms: ATLAS_CORE_TERMS,
    capabilityDraft: ATLAS_CAPABILITY_DRAFT,
    coverageDimensions: ATLAS_COVERAGE_DIMENSIONS,
    equivalenceIllustrative: ATLAS_EQUIVALENCE_ILLUSTRATIVE,
    namedResourceSeats: ATLAS_NAMED_RESOURCE_SEATS,
    selectionSeats: ATLAS_SELECTION_SEATS,
    graveyardSeats: ATLAS_GRAVEYARD_SEATS,
    sacrificeSeats: ATLAS_SACRIFICE_SEATS,
    triggerSeats: ATLAS_TRIGGER_SEATS,
    counterSeats: ATLAS_COUNTER_SEATS,
    lifeSeats: ATLAS_LIFE_SEATS,
    protectionSeats: ATLAS_PROTECTION_SEATS,
    evasionSeats: ATLAS_EVASION_SEATS,
    landSeats: ATLAS_LAND_SEATS,
    artifactSeats: ATLAS_ARTIFACT_SEATS,
    tokenSeats: ATLAS_TOKEN_SEATS,
    auraSeats: ATLAS_AURA_SEATS,
    spellSeats: ATLAS_SPELL_SEATS,
    drawSeats: ATLAS_DRAW_SEATS,
    damageSeats: ATLAS_DAMAGE_SEATS,
    equipmentSeats: ATLAS_EQUIPMENT_SEATS,
    combatSeats: ATLAS_COMBAT_SEATS,
    loopSeats: ATLAS_LOOP_SEATS,
    resetShapeSeats: ATLAS_RESET_SHAPE_SEATS,
    observation001: ATLAS_OBSERVATION_001,
    revisions: ATLAS_VOCABULARY_REVISIONS,
    summary: freeze({
      coreTermCount: ATLAS_CORE_TERMS.length,
      capabilityDraftCount: ATLAS_CAPABILITY_DRAFT.length,
      capabilityAdmittedCount: ATLAS_CAPABILITY_DRAFT.filter((c) => c.atlasAdmitted).length,
      coverageDimensionCount: ATLAS_COVERAGE_DIMENSIONS.length,
      equivalenceBindingCount: ATLAS_EQUIVALENCE_ILLUSTRATIVE.length,
      namedResourceSeatCount: ATLAS_NAMED_RESOURCE_SEATS.length,
      selectionSeatCount: ATLAS_SELECTION_SEATS.length,
      graveyardSeatCount: ATLAS_GRAVEYARD_SEATS.length,
      sacrificeSeatCount: ATLAS_SACRIFICE_SEATS.length,
      triggerSeatCount: ATLAS_TRIGGER_SEATS.length,
      counterSeatCount: ATLAS_COUNTER_SEATS.length,
      lifeSeatCount: ATLAS_LIFE_SEATS.length,
      protectionSeatCount: ATLAS_PROTECTION_SEATS.length,
      evasionSeatCount: ATLAS_EVASION_SEATS.length,
      landSeatCount: ATLAS_LAND_SEATS.length,
      artifactSeatCount: ATLAS_ARTIFACT_SEATS.length,
      tokenSeatCount: ATLAS_TOKEN_SEATS.length,
      auraSeatCount: ATLAS_AURA_SEATS.length,
      spellSeatCount: ATLAS_SPELL_SEATS.length,
      drawSeatCount: ATLAS_DRAW_SEATS.length,
      damageSeatCount: ATLAS_DAMAGE_SEATS.length,
      equipmentSeatCount: ATLAS_EQUIPMENT_SEATS.length,
      combatSeatCount: ATLAS_COMBAT_SEATS.length,
      loopSeatCount: ATLAS_LOOP_SEATS.length,
      resetShapeSeatCount: ATLAS_RESET_SHAPE_SEATS.length,
      coverageScoreExists: false,
    }),
    brainInheritance: "none",
  });
}
