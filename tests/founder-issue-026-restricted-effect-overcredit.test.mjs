import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyNativeCard,
  colorlessPipsFromCost,
  colorPipsFromCost,
  commanderConnectionSignalsFor,
  commanderMechanicalScopes,
  forgeNativeMasterwork,
  interactionQualityFor,
  landColoredManaFixingFactor,
  landRestrictedFixingPenalty,
  listHasTypalDensity,
  manaConsistencyReport,
  modalAwareRoleScore,
  curveManaValue,
  colorlessFixingCredit,
  restrictedEffectCastingFactor,
  parseNativeBlueprintIntent,
  roleFloorCredit,
} from "../app/native-masterwork-engine.mjs";
import { extractMechanicalSignals } from "../app/forge-interaction-graph.mjs";

// =============================================================================
// Founder #026 — Restricted-effect overcredit
// =============================================================================
// Construction now withholds full credit unless the condition holds in this
// list. Classification is unchanged: a modal wail is still interaction.
// =============================================================================

const gwCard = (name, oracleText, typeLine = "Creature — Test", manaCost = "{2}{G}{W}", extra = {}) => ({
  name,
  oracleText,
  typeLine,
  manaCost,
  colorIdentity: ["G", "W"],
  ...extra,
});

const vibraniumSovereign = {
  name: "Vibranium Sovereign",
  colors: ["G", "W"],
  oracleText: "Whenever this enters or attacks, create a tapped Vibranium token. (It's an artifact with indestructible and \"{T}: Add {C}. This mana can't be spent to cast a nonartifact spell.\") Whenever you cast an artifact spell with mana value 4 or greater, put two +1/+1 counters on this.",
};

const gwSpells = [
  ...Array.from({ length: 28 }, (_, i) => gwCard(`Flow ${i}`, "When this enters, draw a card. Scry 1.")),
  ...Array.from({ length: 24 }, (_, i) => gwCard(`Answer ${i}`, "Exile target nonland permanent.")),
  ...Array.from({ length: 18 }, (_, i) => gwCard(`Shield ${i}`, "Target creature gains hexproof and indestructible until end of turn.")),
  ...Array.from({ length: 18 }, (_, i) => gwCard(`Stone ${i}`, "Add one mana. Create a Treasure token.", "Artifact", "{2}", { colorIdentity: [] })),
];

const cavern = {
  name: "Cavern of Souls",
  oracleText: "As this land enters, choose a creature type. {T}: Add {C}. {T}: Add one mana of any color. Spend this mana only to cast a creature spell of the chosen type.",
  typeLine: "Land",
  manaCost: "",
  colorIdentity: [],
  producedMana: ["W", "U", "B", "R", "G"],
  popularityRank: 5,
  priceUsd: 45,
};

const tappedDuals = Array.from({ length: 20 }, (_, i) => ({
  name: `Canopy Gate ${i}`,
  oracleText: "This land enters the battlefield tapped. {T}: Add {G} or {W}.",
  typeLine: "Land",
  manaCost: "",
  colorIdentity: ["G", "W"],
  producedMana: ["G", "W"],
  popularityRank: 5,
  priceUsd: 0.5,
}));

test("Founder #026: a non-typal artifact/counters commander does not request a tribe in the Blueprint", () => {
  const blueprint = parseNativeBlueprintIntent({
    commander: vibraniumSovereign,
    note: "",
    strategy: "Balanced midrange",
  });
  assert.deepEqual(blueprint.tribalTypes, []);
  assert.ok(!blueprint.promises.some((promise) => /typal|tribal/i.test(promise)));
});

test("Founder #026: type-restricted rainbow is not full color-fixing unless the list is typal", () => {
  const cavernOracle = cavern.oracleText;
  const pathOracle = "Choose a creature type. {T}: Add one mana of any color in your commander's color identity. {T}: Add one mana of any color. Spend this mana only to cast a creature spell of the chosen type.";
  assert.equal(landColoredManaFixingFactor(cavernOracle, { typal: false }), 0.12);
  assert.equal(landRestrictedFixingPenalty(cavernOracle, { typal: false }), -6);
  assert.equal(landColoredManaFixingFactor(cavernOracle, { typal: true }), 1);
  assert.equal(landRestrictedFixingPenalty(cavernOracle, { typal: true }), 0);
  assert.equal(landColoredManaFixingFactor(pathOracle, { typal: false }), 1);
  assert.equal(listHasTypalDensity([], {}, []), false);
  assert.equal(listHasTypalDensity([], {}, ["bear"]), true);

  const nykthosOracle = "{T}: Add {C}. {2}, {T}: Choose a color. Add an amount of mana of that color equal to your devotion to that color.";
  const threeTreeOracle = "As this land enters, choose a creature type. {T}: Add {C}. {2}, {T}: Choose a color. Add an amount of mana of that color equal to the number of creatures you control of the chosen type.";
  assert.equal(landColoredManaFixingFactor(nykthosOracle, { colorCount: 1 }), 1);
  assert.equal(landColoredManaFixingFactor(nykthosOracle, { colorCount: 2 }), 0.12);
  assert.equal(landRestrictedFixingPenalty(nykthosOracle, { colorCount: 2, typal: true }), -6, "split devotion is still split in a typal multicolor list");
  assert.equal(landColoredManaFixingFactor(threeTreeOracle, { typal: false }), 0.12);
  assert.equal(landColoredManaFixingFactor(threeTreeOracle, { typal: true }), 1);
  assert.equal(landRestrictedFixingPenalty(threeTreeOracle, { typal: false }), -6);

  const coffersOracle = "{T}: Add {C}. {2}, {T}: Add {B} for each Swamp you control.";
  const castleOracle = "This land enters tapped unless you control a Forest. {T}: Add {G}. {2}{G}{G}, {T}: Add {G} for each creature you control.";
  const cradleOracle = "{T}: Add {G} for each creature you control.";
  const towerOracle = "You have no maximum hand size. {T}: Add {C}.";
  assert.equal(landColoredManaFixingFactor(coffersOracle, { colorCount: 1 }), 1);
  assert.equal(landColoredManaFixingFactor(coffersOracle, { colorCount: 3 }), 0.12);
  assert.equal(landColoredManaFixingFactor(castleOracle, { colorCount: 2 }), 1, "an unrestricted {G} tap is still a Forest");
  assert.equal(landColoredManaFixingFactor(cradleOracle, { colorCount: 2, producedMana: ["G"], commanderColors: ["G", "W"] }), 1);
  assert.equal(landColoredManaFixingFactor(towerOracle, { producedMana: ["C"], commanderColors: ["G", "W"] }), 0.12);
  assert.equal(landRestrictedFixingPenalty(towerOracle, { producedMana: ["C"], commanderColors: ["G", "W"] }), -6);
});

test("Founder #026: type-restricted rainbow does not beat in-color duals in a non-typal GW mana base", () => {
  const report = forgeNativeMasterwork({
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    seed: 11,
    commander: vibraniumSovereign,
    cards: [...gwSpells, cavern, ...tappedDuals],
  });
  assert.ok(
    !report.selected.rows.some((row) => row.name === "Cavern of Souls"),
    "Cavern of Souls must lose to in-color duals when the list is not typal",
  );
  assert.ok(report.selected.rows.some((row) => String(row.name).startsWith("Canopy Gate")));
});

test("Founder #026: a typal commander still keeps Cavern over equally popular tapped duals", () => {
  const ayula = {
    name: "Ayula, Queen Among Bears",
    colors: ["G"],
    oracleText: "Whenever Ayula, Queen Among Bears or another Bear you control enters, you may have target Bear you control fight another target creature.",
  };
  const gSpells = [
    ...Array.from({ length: 28 }, (_, i) => ({ name: `Flow ${i}`, oracleText: "When this enters, draw a card. Scry 1.", typeLine: "Creature — Bear", manaCost: "{2}{G}", colorIdentity: ["G"] })),
    ...Array.from({ length: 24 }, (_, i) => ({ name: `Answer ${i}`, oracleText: "Fight target creature you don't control.", typeLine: "Creature — Bear", manaCost: "{2}{G}", colorIdentity: ["G"] })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Shield ${i}`, oracleText: "Target creature gains hexproof until end of turn.", typeLine: "Creature — Bear", manaCost: "{1}{G}", colorIdentity: ["G"] })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Stone ${i}`, oracleText: "Add one mana. Create a Treasure token.", typeLine: "Artifact", manaCost: "{2}", colorIdentity: [] })),
  ];
  const gDuals = Array.from({ length: 20 }, (_, i) => ({
    name: `Green Gate ${i}`,
    oracleText: "This land enters the battlefield tapped. {T}: Add {G}.",
    typeLine: "Land",
    manaCost: "",
    colorIdentity: ["G"],
    producedMana: ["G"],
    popularityRank: 5,
    priceUsd: 0.5,
  }));
  const report = forgeNativeMasterwork({
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    seed: 11,
    commander: ayula,
    cards: [...gSpells, cavern, ...gDuals],
  });
  assert.ok(report.selected.rows.some((row) => row.name === "Cavern of Souls"), "Cavern remains a real tribal land when the commander implies a tribe");
});

const nykthos = {
  name: "Nykthos, Shrine to Nyx",
  oracleText: "{T}: Add {C}. {2}, {T}: Choose a color. Add an amount of mana of that color equal to your devotion to that color. (Your devotion to a color is the number of mana symbols of that color among the mana costs of permanents you control.)",
  typeLine: "Legendary Land",
  manaCost: "",
  colorIdentity: [],
  producedMana: ["W", "U", "B", "R", "G"],
  popularityRank: 1,
  priceUsd: 40,
};

const threeTreeCity = {
  name: "Three Tree City",
  oracleText: "As this land enters, choose a creature type. {T}: Add {C}. {2}, {T}: Choose a color. Add an amount of mana of that color equal to the number of creatures you control of the chosen type.",
  typeLine: "Land",
  manaCost: "",
  colorIdentity: [],
  producedMana: ["W", "U", "B", "R", "G"],
  popularityRank: 1,
  priceUsd: 20,
};

test("Founder #026: devotion-scaled rainbow is not a dual in a multicolor mana base", () => {
  const report = forgeNativeMasterwork({
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    seed: 11,
    commander: vibraniumSovereign,
    cards: [...gwSpells, nykthos, ...tappedDuals],
  });
  assert.ok(
    !report.selected.rows.some((row) => row.name === "Nykthos, Shrine to Nyx"),
    "Nykthos must lose to in-color duals when devotion is split across two colors",
  );
});

test("Founder #026: devotion-scaled rainbow stays in a mono-color mana base", () => {
  const greenSovereign = {
    name: "Green Sovereign",
    colors: ["G"],
    oracleText: "Whenever this attacks, draw a card.",
  };
  const gSpells = [
    ...Array.from({ length: 28 }, (_, i) => ({ name: `Flow ${i}`, oracleText: "When this enters, draw a card. Scry 1.", typeLine: "Creature — Druid", manaCost: "{2}{G}", colorIdentity: ["G"] })),
    ...Array.from({ length: 24 }, (_, i) => ({ name: `Answer ${i}`, oracleText: "Fight target creature you don't control.", typeLine: "Instant", manaCost: "{2}{G}", colorIdentity: ["G"] })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Shield ${i}`, oracleText: "Target creature gains hexproof until end of turn.", typeLine: "Instant", manaCost: "{1}{G}", colorIdentity: ["G"] })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Stone ${i}`, oracleText: "Add one mana. Create a Treasure token.", typeLine: "Artifact", manaCost: "{2}", colorIdentity: [] })),
  ];
  const gDuals = Array.from({ length: 20 }, (_, i) => ({
    name: `Green Gate ${i}`,
    oracleText: "This land enters the battlefield tapped. {T}: Add {G}.",
    typeLine: "Land",
    manaCost: "",
    colorIdentity: ["G"],
    producedMana: ["G"],
    popularityRank: 5,
    priceUsd: 0.5,
  }));
  const report = forgeNativeMasterwork({
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    seed: 11,
    commander: greenSovereign,
    cards: [...gSpells, nykthos, ...gDuals],
  });
  assert.ok(report.selected.rows.some((row) => row.name === "Nykthos, Shrine to Nyx"), "mono-color devotion is the condition Nykthos actually pays");
});

test("Founder #026: type-count scaled rainbow is not a dual unless the list is typal", () => {
  const gwReport = forgeNativeMasterwork({
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    seed: 11,
    commander: vibraniumSovereign,
    cards: [...gwSpells, threeTreeCity, ...tappedDuals],
  });
  assert.ok(
    !gwReport.selected.rows.some((row) => row.name === "Three Tree City"),
    "Three Tree City must lose to in-color duals when the list is not typal",
  );

  const ayula = {
    name: "Ayula, Queen Among Bears",
    colors: ["G"],
    oracleText: "Whenever Ayula, Queen Among Bears or another Bear you control enters, you may have target Bear you control fight another target creature.",
  };
  const gSpells = [
    ...Array.from({ length: 28 }, (_, i) => ({ name: `Flow ${i}`, oracleText: "When this enters, draw a card. Scry 1.", typeLine: "Creature — Bear", manaCost: "{2}{G}", colorIdentity: ["G"] })),
    ...Array.from({ length: 24 }, (_, i) => ({ name: `Answer ${i}`, oracleText: "Fight target creature you don't control.", typeLine: "Creature — Bear", manaCost: "{2}{G}", colorIdentity: ["G"] })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Shield ${i}`, oracleText: "Target creature gains hexproof until end of turn.", typeLine: "Creature — Bear", manaCost: "{1}{G}", colorIdentity: ["G"] })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Stone ${i}`, oracleText: "Add one mana. Create a Treasure token.", typeLine: "Artifact", manaCost: "{2}", colorIdentity: [] })),
  ];
  const gDuals = Array.from({ length: 20 }, (_, i) => ({
    name: `Green Gate ${i}`,
    oracleText: "This land enters the battlefield tapped. {T}: Add {G}.",
    typeLine: "Land",
    manaCost: "",
    colorIdentity: ["G"],
    producedMana: ["G"],
    popularityRank: 5,
    priceUsd: 0.5,
  }));
  const typalReport = forgeNativeMasterwork({
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    seed: 11,
    commander: ayula,
    cards: [...gSpells, threeTreeCity, ...gDuals],
  });
  assert.ok(typalReport.selected.rows.some((row) => row.name === "Three Tree City"), "type-count mana is real when the commander implies a tribe");
});

test("Founder #026: classification still unions modal modes; scoring and floors do not treat them as simultaneous jobs", () => {
  const kozilekOracle = [
    "Choose two —",
    "Create two 0/1 colorless creature tokens. They have \"Sacrifice this creature: Add {C}.\"",
    "Draw two cards and discard two cards.",
    "Exile target player's graveyard.",
    "Target player mills four cards.",
  ].join(" ");
  const kozilekShape = classifyNativeCard({
    name: "Modal Colorless Command",
    oracleText: kozilekOracle,
    typeLine: "Instant",
    manaCost: "{X}{C}",
    colorIdentity: [],
  });
  const warpingOracle = [
    "Choose one —",
    "Exile target creature with power or toughness 1 or less.",
    "Counter target sorcery spell.",
    "Create a 0/1 colorless creature token. It has \"Sacrifice this creature: Add {C}.\"",
  ].join(" ");
  const warpingShape = classifyNativeCard({
    name: "Modal Colorless Wail",
    oracleText: warpingOracle,
    typeLine: "Instant",
    manaCost: "{1}{C}",
    colorIdentity: [],
  });

  for (const role of ["tokens", "draw", "selection", "graveyard", "interaction"]) {
    assert.ok(kozilekShape.includes(role), `modal command should still be classified as ${role}`);
  }
  assert.ok(warpingShape.includes("interaction"));
  assert.ok(warpingShape.includes("tokens"));
  assert.equal(roleFloorCredit(warpingOracle), 0.4);
  assert.equal(roleFloorCredit("Destroy target creature."), 1);

  const weights = { ramp: 10, draw: 10, interaction: 11, protection: 6, recursion: 6, threat: 10 };
  const kozilekParts = kozilekShape.map((role) => (weights[role] || (role === "threat" ? 7 : 2)) * (role === "interaction" ? interactionQualityFor(kozilekOracle) : 1));
  const modalTotal = modalAwareRoleScore(kozilekParts, kozilekOracle);
  const topTwo = [...kozilekParts].filter((value) => value > 0).sort((left, right) => right - left).slice(0, 2).reduce((sum, value) => sum + value, 0);
  assert.equal(modalTotal, topTwo, "choose two scores only the two best modes, not every listed role");
  assert.equal(modalAwareRoleScore([11, 10, 2], warpingOracle), 11, "choose one scores only the best mode");
  assert.equal(modalAwareRoleScore([11, 10, 2], "Destroy target creature."), 23, "non-modal cards still sum every real job");
});

test("Founder #026: interactionQualityFor downweights the narrow exile mode but classification still grants the interaction role", () => {
  const wailText = "Choose one — Exile target creature with power or toughness 1 or less. Counter target sorcery spell. Create a 0/1 colorless creature token.";
  assert.ok(interactionQualityFor(wailText) < 1);
  assert.ok(
    classifyNativeCard({
      name: "Modal Colorless Wail",
      oracleText: wailText,
      typeLine: "Instant",
      manaCost: "{1}{C}",
    }).includes("interaction"),
  );
});

test("Founder #026: {C} pip demand is visible to pip math and mana consistency", () => {
  assert.deepEqual(colorPipsFromCost("{1}{C}"), { W: 0, U: 0, B: 0, R: 0, G: 0 });
  assert.equal(colorlessPipsFromCost("{1}{C}"), 1);
  assert.equal(colorlessPipsFromCost("{X}{C}"), 1);

  const wailRow = {
    name: "Modal Colorless Wail",
    manaCost: "{1}{C}",
    colorPips: colorPipsFromCost("{1}{C}"),
    colorlessPips: colorlessPipsFromCost("{1}{C}"),
    roles: ["interaction"],
    cmc: 2,
    quantity: 1,
  };
  const forest = {
    name: "Forest",
    roles: ["land"],
    colorIdentity: ["G"],
    quantity: 36,
  };
  const report = manaConsistencyReport([wailRow, forest], 37);
  assert.equal(report.cards.length, 1);
  assert.equal(report.cards[0].name, "Modal Colorless Wail");
  assert.ok(report.cards[0].probability < 0.05, "Forests cannot pay {C}, so consistency must collapse");
  assert.equal(report.sourcesByColor.C, 0);
});

const kozilekCommand = {
  name: "Kozilek's Command",
  oracleText: "Choose two — Create two 0/1 colorless creature tokens. They have \"Sacrifice this creature: Add {C}.\" Draw two cards and discard two cards. Exile target player's graveyard. Target player mills four cards.",
  typeLine: "Instant",
  manaCost: "{X}{C}",
  colorIdentity: [],
  popularityRank: 1,
};

const warpingWail = {
  name: "Warping Wail",
  oracleText: "Choose one — Exile target creature with power or toughness 1 or less. Counter target sorcery spell. Create a 0/1 colorless creature token. It has \"Sacrifice this creature: Add {C}.\"",
  typeLine: "Instant",
  manaCost: "{1}{C}",
  colorIdentity: [],
  popularityRank: 2,
};

const uginEye = {
  name: "Ugin, Eye of the Storms",
  oracleText: "Whenever you cast a colorless spell, exile up to one target permanent that's one or more colors.",
  typeLine: "Legendary Planeswalker — Ugin",
  manaCost: "{7}",
  colorIdentity: [],
  popularityRank: 1,
};

const fleshraker = {
  name: "Glaring Fleshraker",
  oracleText: "Whenever you cast a colorless spell, create a 0/1 colorless Eldrazi Spawn creature token. Whenever another colorless creature you control enters, this deals 1 damage to each opponent.",
  typeLine: "Creature — Eldrazi Drone",
  manaCost: "{2}{C}",
  colorIdentity: [],
  popularityRank: 3,
};

const solRing = {
  name: "Sol Ring",
  oracleText: "{T}: Add {C}{C}.",
  typeLine: "Artifact",
  manaCost: "{1}",
  colorIdentity: [],
  popularityRank: 1,
};

const thunderhulk = {
  name: "Threefold Thunderhulk",
  oracleText: "This creature enters with three +1/+1 counters on it. Whenever this creature or another artifact you control enters, create a 1/1 colorless Gnome artifact creature token. {2}, Sacrifice another artifact: Put a +1/+1 counter on this creature.",
  typeLine: "Artifact Creature — Gnome",
  manaCost: "{7}",
  colorIdentity: [],
  popularityRank: 4,
};

function connectionSignals(card, commander) {
  const mechanics = extractMechanicalSignals(card);
  const commanderMechanics = extractMechanicalSignals(commander);
  return commanderConnectionSignalsFor(
    card,
    mechanics,
    { produces: commanderMechanics.produces, rewards: commanderMechanics.rewards },
    commanderMechanicalScopes(commander),
  );
}

test("Founder #026: artifact-only {C} does not pay colorless nonartifact spells, and does pay artifacts", () => {
  const gw = { commanderOracle: vibraniumSovereign.oracleText, commanderColors: ["G", "W"] };
  assert.equal(restrictedEffectCastingFactor({ manaCost: "{X}{C}", colorIdentity: [], typeLine: "Instant", ...gw }), 0.12);
  assert.equal(restrictedEffectCastingFactor({ manaCost: "{2}{C}", colorIdentity: [], typeLine: "Creature — Eldrazi", ...gw }), 0.12);
  assert.equal(restrictedEffectCastingFactor({ manaCost: "{7}", colorIdentity: [], typeLine: "Legendary Planeswalker — Ugin", ...gw }), 0.12);
  assert.equal(restrictedEffectCastingFactor({ manaCost: "{1}", colorIdentity: [], typeLine: "Artifact", ...gw }), 1);
  assert.equal(restrictedEffectCastingFactor({ manaCost: "{7}", colorIdentity: [], typeLine: "Artifact Creature — Gnome", ...gw }), 1);
  assert.equal(restrictedEffectCastingFactor({
    manaCost: "{X}{C}",
    colorIdentity: [],
    typeLine: "Instant",
    commanderOracle: "When you cast this spell, you may pay {C}.",
    commanderColors: [],
  }), 1, "a colorless commander still gets full colorless credit");
});

test("Founder #026: 'cast an artifact spell' is not a spellslinger connection for colorless instants", () => {
  assert.deepEqual(commanderMechanicalScopes(vibraniumSovereign).rewards.spells, ["artifact"]);
  assert.equal(connectionSignals(kozilekCommand, vibraniumSovereign).length, 0);
  assert.equal(connectionSignals(warpingWail, vibraniumSovereign).length, 0);
  assert.equal(connectionSignals(uginEye, vibraniumSovereign).length, 0);
  assert.ok(connectionSignals(thunderhulk, vibraniumSovereign).length > 0, "an artifact that feeds the commander's artifact trigger remains connected");
});

test("Founder #026: a GW artifact/counters commander does not select the colorless nonartifact toolbox", () => {
  const report = forgeNativeMasterwork({
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    seed: 11,
    commander: vibraniumSovereign,
    cards: [
      ...gwSpells,
      kozilekCommand,
      warpingWail,
      uginEye,
      fleshraker,
      solRing,
      thunderhulk,
      ...tappedDuals,
    ],
  });
  const names = report.selected.rows.map((row) => row.name);
  for (const name of ["Kozilek's Command", "Warping Wail", "Ugin, Eye of the Storms", "Glaring Fleshraker"]) {
    assert.ok(!names.includes(name), `${name} is not payable with artifact-only {C} and must not beat in-color cards`);
  }
  assert.ok(names.includes("Sol Ring"), "generic artifact mana still belongs in the list");
});

test("Founder #026: X is not a 1-drop on the construction curve", () => {
  assert.equal(curveManaValue("{X}{C}"), 4);
  assert.equal(curveManaValue("{X}{G}{W}"), 4);
  assert.equal(curveManaValue("{X}{X}{G}"), 4);
  assert.equal(curveManaValue("{1}{C}"), 2);
  assert.equal(curveManaValue("{2}{G}{W}"), 4);
});

test("Founder #026: colorless-only rocks do not close colored ramp floors", () => {
  assert.equal(roleFloorCredit("{T}: Add {C}{C}.", { colorIdentity: [], commanderColors: ["G", "W"] }), 0.4);
  assert.equal(roleFloorCredit("{T}: Add one mana of any color in your commander's color identity.", { colorIdentity: [], commanderColors: ["G", "W"] }), 1);
  assert.equal(roleFloorCredit("{T}: Add {C}{C}.", { colorIdentity: [], commanderColors: [] }), 1, "a colorless commander still counts colorless rocks at full ramp");
  assert.equal(colorlessFixingCredit({
    oracle: "{T}: Add {C}{C}.",
    colorIdentity: [],
    manaCost: "{1}",
    commanderColors: ["G", "W"],
  }), 1, "1-mana colorless rocks are still real acceleration");
  assert.equal(colorlessFixingCredit({
    oracle: "{T}: Add {C}. {1}, {T}, Sacrifice this artifact: Draw a card.",
    colorIdentity: [],
    manaCost: "{2}",
    commanderColors: ["G", "W"],
  }), 0.12, "2+ mana colorless rocks do not pay WUBRG pips");
});

test("Founder #026: a land that produces none of the commander's colors loses to in-color duals", () => {
  const tower = {
    name: "Reliquary Tower",
    oracleText: "You have no maximum hand size. {T}: Add {C}.",
    typeLine: "Land",
    manaCost: "",
    colorIdentity: [],
    producedMana: ["C"],
    popularityRank: 1,
    priceUsd: 3,
  };
  const report = forgeNativeMasterwork({
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    seed: 11,
    commander: vibraniumSovereign,
    cards: [...gwSpells, tower, ...tappedDuals],
  });
  assert.ok(
    !report.selected.rows.some((row) => row.name === "Reliquary Tower"),
    "Reliquary Tower is a utility slot, not a GW dual",
  );
  assert.ok(report.selected.rows.some((row) => String(row.name).startsWith("Canopy Gate")));
});

test("Founder #026: swamp-scaled mana is not a dual in a multicolor identity", () => {
  const coffers = {
    name: "Cabal Coffers",
    oracleText: "{T}: Add {C}. {2}, {T}: Add {B} for each Swamp you control.",
    typeLine: "Land",
    manaCost: "",
    colorIdentity: ["B"],
    producedMana: ["B", "C"],
    popularityRank: 1,
    priceUsd: 30,
  };
  const esper = {
    name: "Esper Sovereign",
    colors: ["W", "U", "B"],
    oracleText: "Whenever this attacks, draw a card.",
  };
  const esperSpells = [
    ...Array.from({ length: 28 }, (_, i) => ({ name: `Flow ${i}`, oracleText: "When this enters, draw a card. Scry 1.", typeLine: "Creature — Advisor", manaCost: "{2}{W}{U}", colorIdentity: ["W", "U"] })),
    ...Array.from({ length: 24 }, (_, i) => ({ name: `Answer ${i}`, oracleText: "Exile target nonland permanent.", typeLine: "Instant", manaCost: "{1}{W}{B}", colorIdentity: ["W", "B"] })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Shield ${i}`, oracleText: "Target creature gains hexproof until end of turn.", typeLine: "Instant", manaCost: "{1}{U}", colorIdentity: ["U"] })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Stone ${i}`, oracleText: "Add one mana. Create a Treasure token.", typeLine: "Artifact", manaCost: "{2}", colorIdentity: [] })),
  ];
  const esperDuals = Array.from({ length: 20 }, (_, i) => ({
    name: `Esper Gate ${i}`,
    oracleText: "This land enters the battlefield tapped. {T}: Add {W} or {U} or {B}.",
    typeLine: "Land",
    manaCost: "",
    colorIdentity: ["W", "U", "B"],
    producedMana: ["W", "U", "B"],
    popularityRank: 5,
    priceUsd: 0.5,
  }));
  const multi = forgeNativeMasterwork({
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    seed: 11,
    commander: esper,
    cards: [...esperSpells, coffers, ...esperDuals],
  });
  assert.ok(
    !multi.selected.rows.some((row) => row.name === "Cabal Coffers"),
    "Coffers needs a swamp-dense mono identity, not a three-color split",
  );

  const monoBlack = {
    name: "Black Sovereign",
    colors: ["B"],
    oracleText: "Whenever this attacks, draw a card.",
  };
  const bSpells = [
    ...Array.from({ length: 28 }, (_, i) => ({ name: `Flow ${i}`, oracleText: "When this enters, draw a card. Scry 1.", typeLine: "Creature — Horror", manaCost: "{2}{B}", colorIdentity: ["B"] })),
    ...Array.from({ length: 24 }, (_, i) => ({ name: `Answer ${i}`, oracleText: "Destroy target creature.", typeLine: "Instant", manaCost: "{1}{B}", colorIdentity: ["B"] })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Shield ${i}`, oracleText: "Target creature gains hexproof until end of turn.", typeLine: "Instant", manaCost: "{B}", colorIdentity: ["B"] })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Stone ${i}`, oracleText: "Add one mana. Create a Treasure token.", typeLine: "Artifact", manaCost: "{2}", colorIdentity: [] })),
  ];
  const bGates = Array.from({ length: 20 }, (_, i) => ({
    name: `Black Gate ${i}`,
    oracleText: "This land enters the battlefield tapped. {T}: Add {B}.",
    typeLine: "Land",
    manaCost: "",
    colorIdentity: ["B"],
    producedMana: ["B"],
    popularityRank: 5,
    priceUsd: 0.5,
  }));
  const mono = forgeNativeMasterwork({
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    seed: 11,
    commander: monoBlack,
    cards: [...bSpells, coffers, ...bGates],
  });
  assert.ok(mono.selected.rows.some((row) => row.name === "Cabal Coffers"), "mono-black swamp scaling is the condition Coffers actually pays");
});

test("Founder #026: colored land-search ramp still beats a pile of colorless rocks", () => {
  const rocks = Array.from({ length: 8 }, (_, i) => ({
    name: `Mind Stone ${i}`,
    oracleText: "{T}: Add {C}. {1}, {T}, Sacrifice this artifact: Draw a card.",
    typeLine: "Artifact",
    manaCost: "{2}",
    colorIdentity: [],
    popularityRank: 1,
  }));
  const reaches = Array.from({ length: 18 }, (_, i) => ({
    name: `Reach ${i}`,
    oracleText: "Search your library for up to two basic land cards, put them onto the battlefield tapped, then shuffle.",
    typeLine: "Sorcery",
    manaCost: "{2}{G}",
    colorIdentity: ["G"],
    popularityRank: 20,
  }));
  const report = forgeNativeMasterwork({
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    seed: 11,
    commander: vibraniumSovereign,
    cards: [...gwSpells, solRing, ...rocks, ...reaches, ...tappedDuals],
  });
  const names = report.selected.rows.map((row) => row.name);
  const rockCount = names.filter((name) => String(name).startsWith("Mind Stone")).length;
  const reachCount = names.filter((name) => String(name).startsWith("Reach")).length;
  assert.ok(names.includes("Sol Ring"), "Sol Ring may still make the list");
  assert.ok(reachCount >= 2, "colored land-search still fills ramp once colorless rocks stop closing the floor");
  assert.ok(rockCount <= 3, "a pile of colorless rocks must not consume the ramp quota");
});

