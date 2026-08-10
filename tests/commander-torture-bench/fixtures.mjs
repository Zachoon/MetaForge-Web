import { classifyNativeCard, colorPipsFromCost } from "../../app/native-masterwork-engine.mjs";
import { extractMechanicalSignals } from "../../app/forge-interaction-graph.mjs";
import { strategicSemanticsFor } from "../../app/strategic-intent.mjs";

// Deterministic torture-bench fixtures. Synthetic cards keep the bench
// reproducible offline while stressing distinct construction problems.

const card = (name, typeLine, oracleText, cmc, colors = ["W"], priceUsd = 0.2) => {
  const generic = Math.max(0, Number(cmc) - colors.length);
  const manaCost = colors.length
    ? `${generic > 0 ? `{${generic}}` : ""}${colors.map((c) => `{${c}}`).join("")}` || `{0}`
    : `{${cmc}}`;
  return {
    name,
    typeLine,
    oracleText,
    cmc,
    manaCost,
    colorIdentity: colors,
    priceUsd,
  };
};

function supportSuite(prefix, colors, { draws = 12, removals = 12, ramps = 12, threats = 8, protection = 0 } = {}) {
  const threatColors = colors.length ? colors : [];
  return [
    ...Array.from({ length: draws }, (_, i) => card(`${prefix} Flow ${i}`, "Instant", "Draw two cards.", 3, colors)),
    ...Array.from({ length: removals }, (_, i) => card(`${prefix} Answer ${i}`, "Instant", "Exile target nonland permanent.", 3, colors)),
    ...Array.from({ length: ramps }, (_, i) => card(`${prefix} Stone ${i}`, "Artifact", "Add one mana. Create a Treasure token.", 2, [])),
    ...Array.from({ length: threats }, (_, i) => card(`${prefix} Threat ${i}`, "Creature — Construct", "Vigilance", 3 + (i % 3), threatColors)),
    ...Array.from({ length: protection }, (_, i) => card(`${prefix} Ward ${i}`, "Instant", "Target creature gains hexproof and indestructible until end of turn.", 2, colors.length ? colors : [])),
  ];
}

function countProduces(candidate, signal) {
  return candidate.rows.filter((row) => !(row.roles || []).includes("land") && !(row.roles || []).includes("commander")
    && (row.mechanics?.produces || []).includes(signal)).length;
}

function countRewards(candidate, signal) {
  return candidate.rows.filter((row) => !(row.roles || []).includes("land") && !(row.roles || []).includes("commander")
    && (row.mechanics?.rewards || []).includes(signal)).length;
}

function countType(candidate, pattern) {
  return candidate.rows.filter((row) => {
    if ((row.roles || []).includes("land") || (row.roles || []).includes("commander")) return false;
    // type line is not always on rows; fall back via name prefixes in fixtures.
    return pattern.test(row.name) || pattern.test(String(row.typeLine || ""));
  }).length;
}

function countSemantic(candidate, semantic) {
  return candidate.rows.filter((row) => {
    if ((row.roles || []).includes("land") || (row.roles || []).includes("commander")) return false;
    const set = row.strategicSemantics;
    if (set?.has) return set.has(semantic);
    return false;
  }).length;
}

export const TORTURE_FIXTURES = Object.freeze([
  Object.freeze({
    id: "pearl-ear-auras",
    archetype: "aura_voltron",
    why: "Canonical Aura payoff commander; regression lock for subtype precision.",
    commanderRole: "payoff_only",
    minCommanderConnections: 6,
    note: "focus on auras",
    commander: {
      name: "Pearl-Ear, Imperial Advisor",
      colors: ["W"],
      oracleText: "Enchantment spells you cast have affinity for Auras. Whenever an Aura you control becomes attached to a nonland permanent, draw a card.",
      typeLine: "Legendary Creature — Fox Advisor",
      manaCost: "{1}{W}",
    },
    cards: [
      ...Array.from({ length: 22 }, (_, i) => card(`Aura Piece ${i}`, "Enchantment — Aura", "Enchant creature. Enchanted creature gets +1/+1 and has hexproof.", 1 + (i % 3))),
      ...Array.from({ length: 8 }, (_, i) => card(`Enchant Soup ${i}`, "Enchantment", "Creatures you control get +1/+1.", 3)),
      ...Array.from({ length: 8 }, (_, i) => card(`Ward ${i}`, "Instant", "Target creature gains hexproof and indestructible until end of turn.", 2)),
      ...supportSuite("Aura", ["W"]),
      card("Ulamog, the Ceaseless Hunger", "Legendary Creature — Eldrazi", "When you cast this spell, exile two target permanents.", 10, [], 25),
    ],
    assertions: Object.freeze([
      {
        id: "aura_density_beats_enchantments",
        check: (candidate) => {
          const auras = countSemantic(candidate, "aura");
          const soup = countSemantic(candidate, "non_aura_enchantment");
          return auras >= 12 && auras > soup ? true : `aura_density_${auras}_vs_soup_${soup}`;
        },
      },
      {
        id: "no_unsupported_eldrazi",
        check: (candidate) => !candidate.rows.some((row) => /ulamog/i.test(row.name)) || "unsupported_eldrazi_survived",
      },
    ]),
  }),

  Object.freeze({
    id: "equipment-voltron",
    archetype: "equipment_voltron",
    why: "Equipment subtype precision vs generic artifacts.",
    commanderRole: "payoff_only",
    minCommanderConnections: 4,
    note: "equip your commander",
    commander: {
      name: "Test Equipment Marshal",
      colors: ["W"],
      oracleText: "Whenever an Equipment you control becomes attached to a creature you control, draw a card. Equipped creatures you control get +1/+1.",
      typeLine: "Legendary Creature — Human Soldier",
      manaCost: "{2}{W}",
    },
    cards: [
      ...Array.from({ length: 16 }, (_, i) => card(`Sword ${i}`, "Artifact — Equipment", "Equipped creature gets +2/+2. Equip {2}", 2, [])),
      ...Array.from({ length: 10 }, (_, i) => card(`Rock ${i}`, "Artifact", "Add one mana.", 2, [])),
      ...Array.from({ length: 8 }, (_, i) => card(`Ward ${i}`, "Instant", "Target creature gains hexproof and indestructible until end of turn.", 2)),
      ...supportSuite("Equip", ["W"]),
    ],
    assertions: Object.freeze([
      {
        id: "equipment_beats_generic_artifacts",
        check: (candidate) => {
          const equipment = countSemantic(candidate, "equipment");
          const rocks = countSemantic(candidate, "non_equipment_artifact");
          return equipment >= 8 && equipment >= rocks ? true : `equipment_${equipment}_vs_rocks_${rocks}`;
        },
      },
    ]),
  }),

  Object.freeze({
    id: "ayula-typal",
    archetype: "typal",
    why: "Typal density must require actual tribe members, not cards that merely mention Bears.",
    commanderRole: "payoff_only",
    minCommanderConnections: 4,
    note: "bear tribal",
    commander: {
      name: "Ayula, Queen Among Bears",
      colors: ["G"],
      oracleText: "Whenever Ayula, Queen Among Bears or another Bear you control enters, you may have target Bear you control fight another target creature.",
      typeLine: "Legendary Creature — Bear",
      manaCost: "{1}{G}",
    },
    cards: [
      ...Array.from({ length: 18 }, (_, i) => card(`Bear Cub ${i}`, "Creature — Bear", "Trample", 2, ["G"])),
      ...Array.from({ length: 10 }, (_, i) => card(`Mention Bear ${i}`, "Instant", "Target Bear gets +2/+2 until end of turn. Draw a card.", 2, ["G"])),
      ...Array.from({ length: 8 }, (_, i) => card(`Elf ${i}`, "Creature — Elf", "When this enters, create a 1/1 green Elf creature token.", 2, ["G"])),
      ...supportSuite("Typal", ["G"], { threats: 4 }),
    ],
    assertions: Object.freeze([
      {
        id: "typal_members_not_mentions",
        check: (candidate) => {
          const bears = candidate.rows.filter((row) => /Bear Cub/i.test(row.name)).length;
          const mentions = candidate.rows.filter((row) => /Mention Bear/i.test(row.name)).length;
          return bears >= mentions && bears >= 10 ? true : `bears_${bears}_mentions_${mentions}`;
        },
      },
    ]),
  }),

  Object.freeze({
    id: "token-go-wide",
    archetype: "tokens",
    why: "Token producers vs token payoffs must stay distinct.",
    commanderRole: "enabler_only",
    minCommanderConnections: 3,
    note: "tokens matter",
    commander: {
      name: "Test Token Foundry",
      colors: ["W", "G"],
      oracleText: "At the beginning of combat on your turn, create a 1/1 green and white Citizen creature token.",
      typeLine: "Legendary Creature — Human Artificer",
      manaCost: "{2}{G}{W}",
    },
    cards: [
      ...Array.from({ length: 12 }, (_, i) => card(`Maker ${i}`, "Creature — Human", "When this enters, create a 1/1 white Soldier creature token.", 2, ["W"])),
      ...Array.from({ length: 10 }, (_, i) => card(`Payoff ${i}`, "Creature — Human", "Creatures you control get +1/+1. Token creatures you control get an additional +1/+1.", 3, ["W", "G"])),
      ...supportSuite("Token", ["W", "G"], { draws: 14, removals: 12, ramps: 12, threats: 8 }),
    ],
    assertions: Object.freeze([
      {
        id: "token_payoffs_present_for_enabler_commander",
        check: (candidate) => countSemantic(candidate, "token_payoff") >= 4 || countProduces(candidate, "tokens") >= 8
          ? true
          : "missing_token_payoff_or_density",
      },
    ]),
  }),

  Object.freeze({
    id: "aristocrats",
    archetype: "aristocrats",
    why: "Requires balanced outlets, payoffs, and fodder — classic leg-balance stress.",
    commanderRole: "payoff_only",
    minCommanderConnections: 3,
    note: "aristocrats sacrifice",
    commander: {
      name: "Test Aristocrat",
      colors: ["B"],
      oracleText: "Whenever a creature you control dies, each opponent loses 1 life. Sacrifice a creature: Draw a card.",
      typeLine: "Legendary Creature — Vampire",
      manaCost: "{2}{B}",
    },
    cards: [
      ...Array.from({ length: 10 }, (_, i) => card(`Outlet ${i}`, "Creature — Vampire", "{T}, Sacrifice a creature: Draw a card.", 2, ["B"])),
      ...Array.from({ length: 12 }, (_, i) => card(`Death Pay ${i}`, "Creature — Vampire", "Whenever a creature you control dies, each opponent loses 1 life.", 2, ["B"])),
      ...Array.from({ length: 10 }, (_, i) => card(`Fodder ${i}`, "Creature — Thrull", "When this enters, create a 1/1 black Thrull creature token.", 2, ["B"])),
      ...supportSuite("Aristo", ["B"]),
    ],
    assertions: Object.freeze([
      {
        id: "aristocrats_legs_present",
        check: (candidate) => {
          const outlets = countSemantic(candidate, "sacrifice_outlet");
          const payoffs = countSemantic(candidate, "death_payoff");
          const fodder = countSemantic(candidate, "token_generator");
          return outlets >= 3 && payoffs >= 3 && fodder >= 2
            ? true
            : `legs_outlet_${outlets}_payoff_${payoffs}_fodder_${fodder}`;
        },
      },
    ]),
  }),

  Object.freeze({
    id: "reanimator",
    archetype: "reanimator",
    why: "Targets, enablers, and reanimation effects must all exist.",
    commanderRole: "enabler_only",
    minCommanderConnections: 2,
    note: "reanimator",
    commander: {
      name: "Test Grave Tutor",
      colors: ["B", "G"],
      oracleText: "When Test Grave Tutor enters, mill four cards. {2}{B}: Return target creature card from your graveyard to your hand.",
      typeLine: "Legendary Creature — Zombie Warlock",
      manaCost: "{2}{B}{G}",
    },
    cards: [
      ...Array.from({ length: 8 }, (_, i) => card(`Reanimate ${i}`, "Sorcery", "Return target creature card from your graveyard to the battlefield.", 2, ["B"])),
      ...Array.from({ length: 8 }, (_, i) => card(`Mill ${i}`, "Instant", "Surveil 2. Draw a card. Mill two cards.", 2, ["B"])),
      ...Array.from({ length: 8 }, (_, i) => card(`Giant ${i}`, "Creature — Horror", "Trample. When this enters, draw a card.", 7, ["B", "G"])),
      ...supportSuite("Reanim", ["B", "G"], { draws: 14, removals: 12, ramps: 12, threats: 6 }),
    ],
    assertions: Object.freeze([
      {
        id: "reanimator_triangle",
        check: (candidate) => {
          const reanim = countSemantic(candidate, "reanimation");
          const fill = countSemantic(candidate, "graveyard_enabler");
          const targets = countSemantic(candidate, "reanimation_target");
          return reanim >= 2 && fill >= 2 && targets >= 2
            ? true
            : `reanim_${reanim}_fill_${fill}_targets_${targets}`;
        },
      },
    ]),
  }),

  Object.freeze({
    id: "spellslinger",
    archetype: "spellslinger",
    why: "Cheap spell density vs spell payoffs are different obligations.",
    commanderRole: "payoff_only",
    minCommanderConnections: 3,
    note: "cast many spells",
    commander: {
      name: "Test Spell Echo",
      colors: ["U", "R"],
      oracleText: "Whenever you cast an instant or sorcery spell, Test Spell Echo deals 1 damage to each opponent. If that spell's mana value is 2 or less, draw a card.",
      typeLine: "Legendary Creature — Otter Wizard",
      manaCost: "{1}{U}{R}",
    },
    cards: [
      ...Array.from({ length: 16 }, (_, i) => card(`Cantrip ${i}`, "Instant", "Draw a card.", 1, ["U"])),
      ...Array.from({ length: 10 }, (_, i) => card(`Burn ${i}`, "Instant", "Test Spell Echo deals 2 damage to any target.", 2, ["R"])),
      ...Array.from({ length: 8 }, (_, i) => card(`Spell Pay ${i}`, "Creature — Wizard", "Instant and sorcery spells you cast cost {1} less. Whenever you cast an instant or sorcery spell, create a Treasure token.", 3, ["U", "R"])),
      ...Array.from({ length: 6 }, (_, i) => card(`Fat Sorcery ${i}`, "Sorcery", "Draw three cards.", 5, ["U"])),
      ...supportSuite("Spell", ["U", "R"], { draws: 12, removals: 10, ramps: 12, threats: 6 }),
    ],
    assertions: Object.freeze([
      {
        id: "cheap_spell_density",
        check: (candidate) => {
          const cheap = candidate.rows.filter((row) => !(row.roles || []).includes("land") && !(row.roles || []).includes("commander") && Number(row.cmc) <= 2).length;
          return cheap >= 14 ? true : `cheap_spells_${cheap}`;
        },
      },
    ]),
  }),

  Object.freeze({
    id: "landfall",
    archetype: "landfall",
    why: "Landfall payoffs need land-drop/enabler support, not just random creatures.",
    commanderRole: "payoff_only",
    minCommanderConnections: 3,
    note: "landfall",
    commander: {
      name: "Test Landfall Titan",
      colors: ["G"],
      oracleText: "Landfall — Whenever a land you control enters, create a 2/2 green Elemental creature token.",
      typeLine: "Legendary Creature — Elemental",
      manaCost: "{3}{G}",
    },
    cards: [
      ...Array.from({ length: 10 }, (_, i) => card(`Land Pay ${i}`, "Creature — Elemental", "Landfall — Whenever a land you control enters, put a +1/+1 counter on this creature.", 2, ["G"])),
      ...Array.from({ length: 10 }, (_, i) => card(`Rampant ${i}`, "Sorcery", "Search your library for a basic land card, put it onto the battlefield tapped, then shuffle.", 2, ["G"])),
      ...Array.from({ length: 8 }, (_, i) => card(`Bounce Land Helper ${i}`, "Creature — Druid", "When this enters, you may return a land you control to its owner's hand. If you do, draw a card.", 3, ["G"])),
      ...supportSuite("Land", ["G"], { draws: 14, removals: 12, ramps: 10, threats: 8 }),
    ],
    assertions: Object.freeze([
      {
        id: "landfall_support_present",
        check: (candidate) => candidate.rows.filter((row) => /Rampant|Land Pay|Bounce Land/i.test(row.name)).length >= 8
          || "thin_landfall_package",
      },
    ]),
  }),

  Object.freeze({
    id: "blink-etb",
    archetype: "blink",
    why: "Blink effects vs valuable ETB targets are distinct.",
    commanderRole: "enabler_only",
    minCommanderConnections: 2,
    note: "blink etb",
    commander: {
      name: "Test Flicker Guide",
      colors: ["W", "U"],
      oracleText: "{1}{W}{U}: Exile another target creature you control, then return it to the battlefield under its owner's control.",
      typeLine: "Legendary Creature — Spirit Advisor",
      manaCost: "{2}{W}{U}",
    },
    cards: [
      ...Array.from({ length: 10 }, (_, i) => card(`Blink ${i}`, "Instant", "Exile target creature you control, then return it to the battlefield under its owner's control.", 2, ["W"])),
      ...Array.from({ length: 12 }, (_, i) => card(`ETB Prize ${i}`, "Creature — Spirit", "When this enters, draw a card.", 3, ["U"])),
      ...Array.from({ length: 6 }, (_, i) => card(`Vanilla ${i}`, "Creature — Bird", "Flying", 2, ["W"])),
      ...supportSuite("Blink", ["W", "U"], { draws: 14, removals: 12, ramps: 12, threats: 6 }),
    ],
    assertions: Object.freeze([
      {
        id: "blink_targets_and_effects",
        check: (candidate) => {
          const blinks = candidate.rows.filter((row) => /Blink /i.test(row.name)).length;
          const targets = candidate.rows.filter((row) => /ETB Prize/i.test(row.name)).length;
          return blinks >= 3 && targets >= 5 ? true : `blink_${blinks}_targets_${targets}`;
        },
      },
    ]),
  }),

  Object.freeze({
    id: "artifacts",
    archetype: "artifacts",
    why: "Artifact synergy package with producers and payoffs.",
    commanderRole: "payoff_only",
    minCommanderConnections: 3,
    note: "artifacts matter",
    commander: {
      name: "Test Artifact Engine",
      colors: [],
      oracleText: "Artifact spells you cast cost {1} less. Whenever an artifact enters under your control, draw a card.",
      typeLine: "Legendary Artifact Creature — Construct",
      manaCost: "{4}",
    },
    cards: [
      ...Array.from({ length: 14 }, (_, i) => card(`Cog ${i}`, "Artifact Creature — Construct", "When this enters, create a Treasure token.", 2, [])),
      ...Array.from({ length: 8 }, (_, i) => card(`Art Pay ${i}`, "Artifact", "Artifacts you control get +1/+1. {2}, {T}: Draw a card. Activate only if you control three or more artifacts.", 3, [])),
      ...supportSuite("Art", [], { draws: 14, removals: 12, ramps: 12, threats: 10 }),
    ],
    assertions: Object.freeze([
      {
        id: "artifact_density",
        check: (candidate) => candidate.rows.filter((row) => /Cog |Art Pay /i.test(row.name)).length >= 10 || "thin_artifact_package",
      },
    ]),
  }),

  Object.freeze({
    id: "stax",
    archetype: "stax",
    why: "Stax needs asymmetric support; raw disruption alone is not a plan.",
    commanderRole: "payoff_only",
    minCommanderConnections: 2,
    note: "stax resource denial",
    commander: {
      name: "Test Tax Collector",
      colors: ["W"],
      oracleText: "Players can't cast more than one spell each turn. Activated abilities of artifacts and creatures cost {2} more to activate unless they are mana abilities.",
      typeLine: "Legendary Creature — Human Advisor",
      manaCost: "{2}{W}",
    },
    cards: [
      ...Array.from({ length: 10 }, (_, i) => card(`Tax ${i}`, "Enchantment", "Players can't untap more than one creature during their untap steps.", 3)),
      ...Array.from({ length: 8 }, (_, i) => card(`Asym ${i}`, "Creature — Human", "Creatures your opponents control get -1/-0. You may cast creature spells as though they had flash.", 3)),
      ...Array.from({ length: 8 }, (_, i) => card(`Rampart ${i}`, "Artifact", "Creatures can't attack you unless their controller pays {2} for each creature they control that's attacking you.", 3, [])),
      ...Array.from({ length: 10 }, (_, i) => card(`Generic Bomb ${i}`, "Creature — Elemental", "Trample. When this enters, draw two cards.", 6)),
      ...supportSuite("Stax", ["W"], { threats: 2 }),
    ],
    assertions: Object.freeze([
      {
        id: "stax_not_just_generic_bombs",
        check: (candidate) => {
          const stax = candidate.rows.filter((row) => /Tax |Asym |Rampart /i.test(row.name)).length;
          const bombs = candidate.rows.filter((row) => /Generic Bomb/i.test(row.name)).length;
          return stax >= bombs && stax >= 6 ? true : `stax_${stax}_bombs_${bombs}`;
        },
      },
    ]),
  }),

  Object.freeze({
    id: "combo-partners",
    archetype: "combo",
    why: "Combo pieces must not be treated as independent goodstuff without partners.",
    commanderRole: "unknown",
    minCommanderConnections: 0,
    note: "infinite combo",
    commander: {
      name: "Test Combo Anchor",
      colors: ["U", "B"],
      oracleText: "At the beginning of your upkeep, surveil 1.",
      typeLine: "Legendary Creature — Horror",
      manaCost: "{2}{U}{B}",
    },
    cards: [
      ...Array.from({ length: 4 }, (_, i) => card(`Combo A ${i}`, "Creature — Wizard", "If you control Combo B, you win the game. {1}{U}: Untap target creature.", 3, ["U"])),
      ...Array.from({ length: 4 }, (_, i) => card(`Combo B ${i}`, "Creature — Horror", "If you control Combo A, create a Treasure token. {1}{B}: Surveil 1.", 3, ["B"])),
      ...Array.from({ length: 16 }, (_, i) => card(`Goodstuff ${i}`, "Creature — Horror", "Flying. When this enters, draw a card.", 4, ["U", "B"])),
      ...supportSuite("Combo", ["U", "B"], { draws: 14, removals: 12, ramps: 12, threats: 6 }),
    ],
    assertions: Object.freeze([
      {
        id: "combo_partners_or_not_orphan_half",
        check: (candidate) => {
          const a = candidate.rows.filter((row) => /Combo A /i.test(row.name)).length;
          const b = candidate.rows.filter((row) => /Combo B /i.test(row.name)).length;
          if (a === 0 && b === 0) return true; // avoided unsupported combo
          return a > 0 && b > 0 ? true : `orphan_combo_a_${a}_b_${b}`;
        },
      },
    ]),
  }),

  Object.freeze({
    id: "multiplan-commander",
    archetype: "multi_direction",
    why: "Commander with multiple legitimate support directions stresses plan competition.",
    commanderRole: "payoff_only",
    minCommanderConnections: 4,
    note: "auras and protection",
    commander: {
      name: "Test Dual Path Fox",
      colors: ["W"],
      oracleText: "Enchantment spells you cast have affinity for Auras. Whenever an Aura you control becomes attached to a creature you control, that creature gains hexproof until end of turn. {2}{W}: Return target Aura card from your graveyard to your hand.",
      typeLine: "Legendary Creature — Fox Cleric",
      manaCost: "{2}{W}",
    },
    cards: [
      ...Array.from({ length: 18 }, (_, i) => card(`Aura Piece ${i}`, "Enchantment — Aura", "Enchant creature. Enchanted creature gets +1/+1 and has vigilance.", 2)),
      ...Array.from({ length: 10 }, (_, i) => card(`Ward ${i}`, "Instant", "Target creature gains hexproof and indestructible until end of turn.", 2)),
      ...Array.from({ length: 8 }, (_, i) => card(`Recur Aura ${i}`, "Sorcery", "Return target enchantment card from your graveyard to your hand.", 2)),
      ...supportSuite("Dual", ["W"]),
    ],
    assertions: Object.freeze([
      {
        id: "plan_competition_recorded",
        check: (_candidate, report) => (report.planCompetition?.built || 0) >= 1 || "no_plan_competition",
      },
    ]),
  }),
]);

export function fixtureInput(fixture, seed = 11) {
  return {
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    seed,
    commander: fixture.commander,
    note: fixture.note,
    cards: fixture.cards,
  };
}
