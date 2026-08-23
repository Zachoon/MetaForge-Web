import assert from "node:assert/strict";
import test from "node:test";
import {
  cardCanDealDamageToOwnCreature,
  cardDealsMassDamageToCreatures,
  classifyNativeCard,
  colorlessPipsFromCost,
  colorPipsFromCost,
  commanderCaresAboutXSpells,
  commanderConnectionSignalsFor,
  commanderInteractsWithRooms,
  commanderMechanicalScopes,
  commanderProfitsFromBeingDamaged,
  commanderValuesPlaneswalkerCheats,
  conditionalRampProductionFactor,
  conditionalTokenProductionFactor,
  forgeNativeMasterwork,
  interactionQualityFor,
  landColoredManaFixingFactor,
  landRestrictedFixingPenalty,
  listHasTypalDensity,
  manaConsistencyReport,
  modalAwareRoleScore,
  curveManaValue,
  colorlessFixingCredit,
  commanderTribesFromOracle,
  identityTribalTypesFor,
  identityMechanicIdsFor,
  restrictedEffectCastingFactor,
  restrictedWinconFactor,
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

  const cityOracle = "Whenever this land becomes tapped, it deals 1 damage to you. {T}: Add one mana of any color.";
  const confluenceOracle = "{T}, Pay 1 life: Add one mana of any color.";
  const commandTowerOracle = "{T}: Add one mana of any color in your commander's color identity.";
  const orchardOracle = "{T}: Add one mana of any color that a land an opponent controls could produce.";
  assert.equal(landColoredManaFixingFactor(cityOracle, { colorCount: 2 }), 0.12);
  assert.equal(landColoredManaFixingFactor(cityOracle, { colorCount: 3 }), 0.12);
  assert.equal(landRestrictedFixingPenalty(cityOracle, { colorCount: 2 }), -6);
  assert.equal(landColoredManaFixingFactor(confluenceOracle, { colorCount: 3 }), 0.12);
  assert.equal(landColoredManaFixingFactor(cityOracle, { colorCount: 4 }), 1, "four-color lists actually need the extra reach");
  assert.equal(landColoredManaFixingFactor(cityOracle, { colorCount: 5 }), 1);
  assert.equal(landColoredManaFixingFactor(commandTowerOracle, { colorCount: 2 }), 1, "identity tap is a dual in two-color");
  assert.equal(landColoredManaFixingFactor(orchardOracle, { colorCount: 2 }), 1, "opponent-gated orchard is not City of Brass");

  const havenOracle = "{T}: Add {C}. {T}: Add one mana of any color. Spend this mana only to cast a Dragon creature spell.";
  const maelstromOracle = "{T}: Add {C}. {T}: Add one mana of any color. Spend this mana only to cast a Dragon spell or an Omen spell.";
  assert.equal(landColoredManaFixingFactor(havenOracle, { typal: true, tribes: ["bear"] }), 0.12, "a Bear list does not make Dragon lands into duals");
  assert.equal(landColoredManaFixingFactor(havenOracle, { tribes: [] }), 0.12);
  assert.equal(landRestrictedFixingPenalty(havenOracle, { tribes: [] }), -6);
  assert.equal(landColoredManaFixingFactor(havenOracle, { tribes: ["dragon"] }), 1);
  assert.equal(landColoredManaFixingFactor(maelstromOracle, { tribes: ["dragon"] }), 1);

  const revelOracle = "Whenever an opponent dies, create a Treasure token. At the beginning of your upkeep, if you control ten or more Treasures, you win the game.";
  const felidarOracle = "Vigilance, lifelink. At the beginning of your upkeep, if you have 40 or more life, you win the game.";
  const clueCommander = "Deathtouch. At the beginning of your end step, investigate for each opponent who lost life this turn. Whenever a Clue you control is put into a graveyard from the battlefield, create a 1/1 white and black Spirit creature token with flying.";
  assert.equal(restrictedWinconFactor({ oracle: revelOracle, commanderOracle: clueCommander }), 0.12);
  assert.equal(restrictedWinconFactor({ oracle: revelOracle, commanderOracle: "Whenever you attack, create a Treasure token." }), 1);
  assert.equal(restrictedWinconFactor({ oracle: felidarOracle, commanderOracle: clueCommander }), 0.12);
  assert.equal(restrictedWinconFactor({ oracle: felidarOracle, commanderOracle: "At the beginning of your upkeep, you gain 2 life." }), 1);
  assert.equal(restrictedWinconFactor({ oracle: "Whenever this deals combat damage to a player, you win the game.", commanderOracle: clueCommander }), 1);
  assert.deepEqual(commanderTribesFromOracle([{ oracleText: clueCommander }]), []);
  assert.deepEqual(
    commanderTribesFromOracle([{ oracleText: "Whenever a land you control enters, create a 1/1 green Plant creature token." }]),
    [],
    "landfall is not a creature tribe",
  );
  assert.ok(commanderTribesFromOracle([{ oracleText: "Whenever a Dragon you control enters, copy it." }]).includes("dragon"));
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

const clueOligarch = {
  name: "Clue Oligarch",
  colors: ["W", "B"],
  oracleText: "Deathtouch. At the beginning of your end step, investigate for each opponent who lost life this turn. Whenever a Clue you control is put into a graveyard from the battlefield, create a 1/1 white and black Spirit creature token with flying.",
};

const investigateScout = {
  name: "Investigate Scout",
  oracleText: "When this enters, investigate. (Create a Clue token. It's an artifact with \"{2}, Sacrifice this artifact: Draw a card.\")",
  typeLine: "Creature — Human Advisor",
  manaCost: "{2}{W}",
  colorIdentity: ["W"],
  popularityRank: 1,
};

const angelHost = {
  name: "Angel Host",
  oracleText: "At the beginning of combat on your turn, create a 4/4 white Angel creature token with flying.",
  typeLine: "Creature — Angel",
  manaCost: "{3}{W}",
  colorIdentity: ["W"],
  popularityRank: 1,
};

const artifactDispute = {
  name: "Artifact Dispute",
  oracleText: "As an additional cost to cast this spell, sacrifice an artifact or creature. Draw two cards and create a Treasure token.",
  typeLine: "Instant",
  manaCost: "{1}{B}",
  colorIdentity: ["B"],
  popularityRank: 1,
};

test("Founder #026: investigate/clue is not generic token-maker synergy", () => {
  const scopes = commanderMechanicalScopes(clueOligarch);
  assert.deepEqual(scopes.produces.clues, ["clue"]);
  assert.deepEqual(scopes.produces.artifacts, ["clue"]);
  assert.deepEqual(scopes.produces.tokens, ["spirit"]);
  assert.deepEqual(scopes.rewards.clues, ["clue"]);
  assert.ok(!scopes.rewards.tokens?.length, "creating a Spirit is production, not a token-maker payoff");

  const commanderMechanics = extractMechanicalSignals(clueOligarch);
  assert.ok(commanderMechanics.produces.includes("clues"));
  assert.ok(commanderMechanics.rewards.includes("clues"));
  assert.ok(!commanderMechanics.rewards.includes("evasion"), "a token with flying is not a flying-matters payoff");

  const investigateLinks = connectionSignals(investigateScout, clueOligarch);
  const disputeLinks = connectionSignals(artifactDispute, clueOligarch);
  const angelLinks = connectionSignals(angelHost, clueOligarch);
  assert.ok(investigateLinks.includes("clues"), "investigate produces the resource the commander actually rewards");
  assert.ok(disputeLinks.length > 0, "sacrificing an artifact is a real Clue outlet");
  assert.ok(!angelLinks.includes("clues") && !angelLinks.includes("tokens"), "an Angel token factory is not the Clue engine");
  assert.equal(angelLinks.length, 0, "token-with-flying must not connect every flier");
});

test("Founder #026: a Clue commander selects investigate and artifact outlets as engine pieces", () => {
  const wbSpells = [
    ...Array.from({ length: 28 }, (_, i) => ({ name: `Flow ${i}`, oracleText: "When this enters, draw a card. Scry 1.", typeLine: "Creature — Advisor", manaCost: "{2}{W}", colorIdentity: ["W"], popularityRank: 40 })),
    ...Array.from({ length: 24 }, (_, i) => ({ name: `Answer ${i}`, oracleText: "Exile target nonland permanent.", typeLine: "Instant", manaCost: "{1}{W}{B}", colorIdentity: ["W", "B"], popularityRank: 40 })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Shield ${i}`, oracleText: "Target creature gains hexproof until end of turn.", typeLine: "Instant", manaCost: "{1}{W}", colorIdentity: ["W"], popularityRank: 40 })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Stone ${i}`, oracleText: "Add one mana. Create a Treasure token.", typeLine: "Artifact", manaCost: "{2}", colorIdentity: [], popularityRank: 40 })),
  ];
  const wbDuals = Array.from({ length: 20 }, (_, i) => ({
    name: `Orzhov Gate ${i}`,
    oracleText: "This land enters the battlefield tapped. {T}: Add {W} or {B}.",
    typeLine: "Land",
    manaCost: "",
    colorIdentity: ["W", "B"],
    producedMana: ["W", "B"],
    popularityRank: 5,
    priceUsd: 0.5,
  }));
  const report = forgeNativeMasterwork({
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    seed: 11,
    commander: clueOligarch,
    cards: [...wbSpells, investigateScout, angelHost, artifactDispute, ...wbDuals],
  });
  const names = report.selected.rows.map((row) => row.name);
  assert.ok(names.includes("Investigate Scout"), "the Clue producer is an engine piece");
  assert.ok(names.includes("Artifact Dispute"), "an artifact sacrifice spell is a Clue outlet");
});

test("Founder #026: a Food commander selects Food makers and Food payoffs as engine pieces", () => {
  const foodChef = {
    name: "Food Chef",
    colors: ["B", "G"],
    oracleText: "At the beginning of your end step, create a Food token for each nontoken creature you controlled that entered this turn.",
  };
  const foodMaker = {
    name: "Provisioner",
    oracleText: "When this creature enters, create a Food token.",
    typeLine: "Creature — Halfling",
    manaCost: "{2}{G}",
    colorIdentity: ["G"],
    popularityRank: 1,
  };
  const foodOutlet = {
    name: "Feast Outlet",
    oracleText: "Whenever you sacrifice a Food, draw a card.",
    typeLine: "Enchantment",
    manaCost: "{1}{B}",
    colorIdentity: ["B"],
    popularityRank: 1,
  };
  const treasureReward = {
    name: "Coin Reward",
    oracleText: "Whenever you sacrifice a Treasure, draw a card.",
    typeLine: "Enchantment",
    manaCost: "{1}{B}",
    colorIdentity: ["B"],
    popularityRank: 999999,
  };
  const gbSpells = [
    ...Array.from({ length: 28 }, (_, i) => ({ name: `Meal Flow ${i}`, oracleText: "When this enters, draw a card. Scry 1.", typeLine: "Creature — Halfling", manaCost: "{2}{G}", colorIdentity: ["G"], popularityRank: 40 })),
    ...Array.from({ length: 24 }, (_, i) => ({ name: `Meal Answer ${i}`, oracleText: "Destroy target nonland permanent.", typeLine: "Instant", manaCost: "{1}{B}{G}", colorIdentity: ["B", "G"], popularityRank: 40 })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Meal Shield ${i}`, oracleText: "Target creature gains hexproof until end of turn.", typeLine: "Instant", manaCost: "{1}{G}", colorIdentity: ["G"], popularityRank: 40 })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Meal Stone ${i}`, oracleText: "{T}: Add one mana.", typeLine: "Artifact", manaCost: "{2}", colorIdentity: [], popularityRank: 40 })),
  ];
  const gbDuals = Array.from({ length: 20 }, (_, i) => ({
    name: `Golgari Gate ${i}`,
    oracleText: "This land enters the battlefield tapped. {T}: Add {B} or {G}.",
    typeLine: "Land",
    manaCost: "",
    colorIdentity: ["B", "G"],
    producedMana: ["B", "G"],
    popularityRank: 5,
    priceUsd: 0.5,
  }));
  const report = forgeNativeMasterwork({
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    seed: 11,
    commander: foodChef,
    cards: [...gbSpells, foodMaker, foodOutlet, treasureReward, ...gbDuals],
  });
  const names = report.selected.rows.map((row) => row.name);
  assert.ok(names.includes("Provisioner"), "the Food maker is selected as an engine piece");
  assert.ok(names.includes("Feast Outlet"), "the Food payoff is selected as an engine piece");
});

test("Founder #026: a Blood commander selects Blood makers and Blood payoffs as engine pieces", () => {
  const bloodHost = {
    name: "Blood Host",
    colors: ["B", "R"],
    oracleText: "Whenever Blood Host or one or more other Vampires enter under your control, create a Blood token. This ability triggers only once each turn.",
  };
  const bloodMaker = {
    name: "Voldaren Guest",
    oracleText: "When this creature enters, create a Blood token.",
    typeLine: "Creature — Vampire",
    manaCost: "{2}{R}",
    colorIdentity: ["R"],
    popularityRank: 1,
  };
  const bloodPayoff = {
    name: "Blood Reveler",
    oracleText: "Whenever you sacrifice a Blood token, draw a card.",
    typeLine: "Creature — Vampire",
    manaCost: "{1}{B}",
    colorIdentity: ["B"],
    popularityRank: 1,
  };
  const rbSpells = [
    ...Array.from({ length: 28 }, (_, i) => ({ name: `Blood Flow ${i}`, oracleText: "When this enters, draw a card. Scry 1.", typeLine: "Creature — Vampire", manaCost: "{2}{R}", colorIdentity: ["R"], popularityRank: 40 })),
    ...Array.from({ length: 24 }, (_, i) => ({ name: `Blood Answer ${i}`, oracleText: "Destroy target creature.", typeLine: "Instant", manaCost: "{1}{B}", colorIdentity: ["B"], popularityRank: 40 })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Blood Shield ${i}`, oracleText: "Target creature gains indestructible until end of turn.", typeLine: "Instant", manaCost: "{1}{B}", colorIdentity: ["B"], popularityRank: 40 })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Blood Stone ${i}`, oracleText: "{T}: Add one mana.", typeLine: "Artifact", manaCost: "{2}", colorIdentity: [], popularityRank: 40 })),
  ];
  const rbDuals = Array.from({ length: 20 }, (_, i) => ({
    name: `Blood Crypt ${i}`,
    oracleText: "This land enters the battlefield tapped. {T}: Add {B} or {R}.",
    typeLine: "Land",
    manaCost: "",
    colorIdentity: ["B", "R"],
    producedMana: ["B", "R"],
    popularityRank: 5,
    priceUsd: 0.5,
  }));
  const report = forgeNativeMasterwork({
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    seed: 11,
    commander: bloodHost,
    cards: [...rbSpells, bloodMaker, bloodPayoff, ...rbDuals],
  });
  const names = report.selected.rows.map((row) => row.name);
  assert.ok(names.includes("Voldaren Guest"), "the Blood maker is selected as an engine piece");
  assert.ok(names.includes("Blood Reveler"), "the Blood payoff is selected as an engine piece");
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

const cityOfBrass = {
  name: "City of Brass",
  oracleText: "Whenever this land becomes tapped, it deals 1 damage to you. {T}: Add one mana of any color.",
  typeLine: "Land",
  manaCost: "",
  colorIdentity: [],
  producedMana: ["W", "U", "B", "R", "G"],
  popularityRank: 1,
  priceUsd: 12,
};

const manaConfluence = {
  name: "Mana Confluence",
  oracleText: "{T}, Pay 1 life: Add one mana of any color.",
  typeLine: "Land",
  manaCost: "",
  colorIdentity: [],
  producedMana: ["W", "U", "B", "R", "G"],
  popularityRank: 1,
  priceUsd: 30,
};

const commandTower = {
  name: "Command Tower",
  oracleText: "{T}: Add one mana of any color in your commander's color identity.",
  typeLine: "Land",
  manaCost: "",
  colorIdentity: [],
  producedMana: ["W", "U", "B", "R", "G"],
  popularityRank: 1,
  priceUsd: 1,
};

const exoticOrchard = {
  name: "Exotic Orchard",
  oracleText: "{T}: Add one mana of any color that a land an opponent controls could produce.",
  typeLine: "Land",
  manaCost: "",
  colorIdentity: [],
  producedMana: ["W", "U", "B", "R", "G"],
  popularityRank: 1,
  priceUsd: 1,
};

test("Founder #026: unconditional rainbow loses to in-color duals in two- and three-color; identity and orchard stay", () => {
  const twoColor = forgeNativeMasterwork({
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    seed: 11,
    commander: vibraniumSovereign,
    cards: [...gwSpells, cityOfBrass, manaConfluence, commandTower, exoticOrchard, ...tappedDuals],
  });
  const twoColorNames = twoColor.selected.rows.map((row) => row.name);
  assert.ok(!twoColorNames.includes("City of Brass"), "City of Brass is 4–5 color reach, not a GW dual");
  assert.ok(!twoColorNames.includes("Mana Confluence"), "Mana Confluence is 4–5 color reach, not a GW dual");
  assert.ok(twoColorNames.includes("Command Tower"), "identity tap stays in two-color");
  assert.ok(twoColorNames.includes("Exotic Orchard"), "opponent-gated orchard stays in two-color");
  assert.ok(twoColorNames.some((name) => String(name).startsWith("Canopy Gate")));

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
  const threeColor = forgeNativeMasterwork({
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    seed: 11,
    commander: esper,
    cards: [...esperSpells, cityOfBrass, manaConfluence, ...esperDuals],
  });
  assert.ok(
    !threeColor.selected.rows.some((row) => row.name === "City of Brass" || row.name === "Mana Confluence"),
    "three-color still covers pips with duals; rainbow pain is unused reach",
  );
});

test("Founder #026: unconditional rainbow stays in a five-color mana base", () => {
  const sisay = {
    name: "Five-Color Sovereign",
    colors: ["W", "U", "B", "R", "G"],
    oracleText: "Whenever this attacks, draw a card.",
  };
  const fiveSpells = [
    ...Array.from({ length: 28 }, (_, i) => ({ name: `Flow ${i}`, oracleText: "When this enters, draw a card. Scry 1.", typeLine: "Creature — Advisor", manaCost: "{2}{W}{U}", colorIdentity: ["W", "U"] })),
    ...Array.from({ length: 24 }, (_, i) => ({ name: `Answer ${i}`, oracleText: "Exile target nonland permanent.", typeLine: "Instant", manaCost: "{1}{B}{R}", colorIdentity: ["B", "R"] })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Shield ${i}`, oracleText: "Target creature gains hexproof until end of turn.", typeLine: "Instant", manaCost: "{1}{G}", colorIdentity: ["G"] })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Stone ${i}`, oracleText: "Add one mana. Create a Treasure token.", typeLine: "Artifact", manaCost: "{2}", colorIdentity: [] })),
  ];
  const fiveDuals = Array.from({ length: 20 }, (_, i) => ({
    name: `Prism Gate ${i}`,
    oracleText: "This land enters the battlefield tapped. {T}: Add one mana of any color.",
    typeLine: "Land",
    manaCost: "",
    colorIdentity: [],
    producedMana: ["W", "U", "B", "R", "G"],
    popularityRank: 5,
    priceUsd: 0.5,
  }));
  const report = forgeNativeMasterwork({
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    seed: 11,
    commander: sisay,
    cards: [...fiveSpells, cityOfBrass, ...fiveDuals],
  });
  assert.ok(report.selected.rows.some((row) => row.name === "City of Brass"), "five-color lists actually need the extra reach");
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

const havenOfTheSpiritDragon = {
  name: "Haven of the Spirit Dragon",
  oracleText: "{T}: Add {C}. {T}: Add one mana of any color. Spend this mana only to cast a Dragon creature spell. {2}, {T}, Sacrifice this land: Return target Dragon creature card or Ugin planeswalker card from your graveyard to your hand.",
  typeLine: "Land",
  manaCost: "",
  colorIdentity: [],
  producedMana: ["W", "U", "B", "R", "G"],
  popularityRank: 1,
  priceUsd: 2,
};

test("Founder #026: named-type rainbow is not a dual unless that type is in the tribe lens", () => {
  const gwReport = forgeNativeMasterwork({
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    seed: 11,
    commander: vibraniumSovereign,
    cards: [...gwSpells, havenOfTheSpiritDragon, ...tappedDuals],
  });
  assert.ok(
    !gwReport.selected.rows.some((row) => row.name === "Haven of the Spirit Dragon"),
    "Haven must lose to in-color duals when the list is not Dragons",
  );

  const ayula = {
    name: "Ayula, Queen Among Bears",
    colors: ["G"],
    oracleText: "Whenever Ayula, Queen Among Bears or another Bear you control enters, you may have target Bear you control fight another target creature.",
  };
  const gSpells = [
    ...Array.from({ length: 28 }, (_, i) => ({ name: `Flow ${i}`, oracleText: "When this enters, draw a card. Scry 1.", typeLine: "Creature — Bear", manaCost: "{2}{G}", colorIdentity: ["G"] })),
    ...Array.from({ length: 24 }, (_, i) => ({ name: `Answer ${i}`, oracleText: "Fight target creature you don't control.", typeLine: "Creature — Bear", manaCost: "{2}{G}", colorIdentity: ["G"] })),
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
  const bearReport = forgeNativeMasterwork({
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    seed: 11,
    commander: ayula,
    cards: [...gSpells, havenOfTheSpiritDragon, ...gDuals],
  });
  assert.ok(
    !bearReport.selected.rows.some((row) => row.name === "Haven of the Spirit Dragon"),
    "Bear typal does not turn Dragon-only mana into a dual",
  );

  const miirym = {
    name: "Dragon Sentinel",
    colors: ["G", "U", "R"],
    oracleText: "Whenever a Dragon you control enters, create a token that's a copy of it except it's not legendary.",
  };
  const dragonSpells = [
    ...Array.from({ length: 28 }, (_, i) => ({ name: `Flow ${i}`, oracleText: "When this enters, draw a card. Scry 1.", typeLine: "Creature — Dragon", manaCost: "{3}{G}{U}", colorIdentity: ["G", "U"] })),
    ...Array.from({ length: 24 }, (_, i) => ({ name: `Answer ${i}`, oracleText: "Fight target creature you don't control.", typeLine: "Instant", manaCost: "{2}{R}", colorIdentity: ["R"] })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Shield ${i}`, oracleText: "Target creature gains hexproof until end of turn.", typeLine: "Instant", manaCost: "{1}{G}", colorIdentity: ["G"] })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Stone ${i}`, oracleText: "Add one mana. Create a Treasure token.", typeLine: "Artifact", manaCost: "{2}", colorIdentity: [] })),
  ];
  const dragonDuals = Array.from({ length: 20 }, (_, i) => ({
    name: `Temur Gate ${i}`,
    oracleText: "This land enters the battlefield tapped. {T}: Add {G} or {U} or {R}.",
    typeLine: "Land",
    manaCost: "",
    colorIdentity: ["G", "U", "R"],
    producedMana: ["G", "U", "R"],
    popularityRank: 5,
    priceUsd: 0.5,
  }));
  const dragonReport = forgeNativeMasterwork({
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    seed: 11,
    commander: miirym,
    cards: [...dragonSpells, havenOfTheSpiritDragon, ...dragonDuals],
  });
  assert.ok(dragonReport.selected.rows.some((row) => row.name === "Haven of the Spirit Dragon"), "Dragon-typed mana is real when the commander implies Dragons");
});

test("Founder #026: a conditional wincon is not a threat unless the commander produces the stated resource", () => {
  const clueOligarch = {
    name: "Clue Oligarch",
    colors: ["W", "B"],
    oracleText: "Deathtouch. At the beginning of your end step, investigate for each opponent who lost life this turn. Whenever a Clue you control is put into a graveyard from the battlefield, create a 1/1 white and black Spirit creature token with flying.",
  };
  const wbSpells = [
    ...Array.from({ length: 28 }, (_, i) => ({ name: `Flow ${i}`, oracleText: "When this enters, draw a card. Scry 1.", typeLine: "Creature — Advisor", manaCost: "{2}{W}", colorIdentity: ["W"] })),
    ...Array.from({ length: 24 }, (_, i) => ({ name: `Answer ${i}`, oracleText: "Exile target nonland permanent.", typeLine: "Instant", manaCost: "{1}{W}{B}", colorIdentity: ["W", "B"] })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Shield ${i}`, oracleText: "Target creature gains hexproof until end of turn.", typeLine: "Instant", manaCost: "{1}{W}", colorIdentity: ["W"] })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Stone ${i}`, oracleText: "Add one mana. Create a Treasure token.", typeLine: "Artifact", manaCost: "{2}", colorIdentity: [] })),
  ];
  const revel = {
    name: "Revel in Riches",
    oracleText: "Whenever an opponent dies, create a Treasure token. At the beginning of your upkeep, if you control ten or more Treasures, you win the game.",
    typeLine: "Enchantment",
    manaCost: "{4}{B}",
    colorIdentity: ["B"],
    popularityRank: 1,
  };
  const wbDuals = Array.from({ length: 20 }, (_, i) => ({
    name: `Orzhov Gate ${i}`,
    oracleText: "This land enters the battlefield tapped. {T}: Add {W} or {B}.",
    typeLine: "Land",
    manaCost: "",
    colorIdentity: ["W", "B"],
    producedMana: ["W", "B"],
    popularityRank: 5,
    priceUsd: 0.5,
  }));
  const clueReport = forgeNativeMasterwork({
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    seed: 11,
    commander: clueOligarch,
    cards: [...wbSpells, revel, ...wbDuals],
  });
  assert.ok(
    !clueReport.selected.rows.some((row) => row.name === "Revel in Riches"),
    "ten-treasure win is not a Clue engine's close",
  );

  const treasureBoss = {
    name: "Treasure Boss",
    colors: ["B", "R"],
    oracleText: "Whenever you attack, create a Treasure token.",
  };
  const rbSpells = [
    ...Array.from({ length: 28 }, (_, i) => ({ name: `Flow ${i}`, oracleText: "When this enters, draw a card. Scry 1.", typeLine: "Creature — Pirate", manaCost: "{2}{R}", colorIdentity: ["R"] })),
    ...Array.from({ length: 24 }, (_, i) => ({ name: `Answer ${i}`, oracleText: "Destroy target creature.", typeLine: "Instant", manaCost: "{1}{B}", colorIdentity: ["B"] })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Shield ${i}`, oracleText: "Target creature gains hexproof until end of turn.", typeLine: "Instant", manaCost: "{1}{R}", colorIdentity: ["R"] })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Stone ${i}`, oracleText: "Add one mana. Create a Treasure token.", typeLine: "Artifact", manaCost: "{2}", colorIdentity: [] })),
  ];
  const rbDuals = Array.from({ length: 20 }, (_, i) => ({
    name: `Rakdos Gate ${i}`,
    oracleText: "This land enters the battlefield tapped. {T}: Add {B} or {R}.",
    typeLine: "Land",
    manaCost: "",
    colorIdentity: ["B", "R"],
    producedMana: ["B", "R"],
    popularityRank: 5,
    priceUsd: 0.5,
  }));
  const treasureReport = forgeNativeMasterwork({
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    seed: 11,
    commander: treasureBoss,
    cards: [...rbSpells, revel, ...rbDuals],
  });
  assert.ok(treasureReport.selected.rows.some((row) => row.name === "Revel in Riches"), "a treasure-producing commander makes the treasure win real");
});

// =============================================================================
// Founder #028: fodder-gated token production is not free token production
// =============================================================================
// Reported directly by a user building a Smaug the Impenetrable (pure,
// zero-sacrifice-text Treasure commander) list: Warren Soultrader ("Pay 1
// life, Sacrifice another creature: Create a Treasure token.") needs
// creature fodder the list may not reliably have, so it should not compete
// for the tokens package core the same way an unconditional or
// death-triggered producer does.
// =============================================================================

test("Founder #028: token production gated behind sacrificing a creature is discounted, unconditional/death-triggered production is not", () => {
  const warrenOracle = "Pay 1 life, Sacrifice another creature: Create a Treasure token. (It's an artifact with \"{T}, Sacrifice this token: Add one mana of any color.\")";
  const pitilessPlunderOracle = "Whenever another creature you control dies, create a Treasure token. (It's an artifact with \"{T}, Sacrifice this token: Add one mana of any color.\")";
  const docksideOracle = "When this creature enters, create X Treasure tokens, where X is the number of artifacts and enchantments your opponents control. (Treasure tokens are artifacts with \"{T}, Sacrifice this token: Add one mana of any color.\")";
  const smaugOracle = "Flying, indestructible, haste\nWhenever Smaug is dealt noncombat damage, create that many Treasure tokens.";
  const mahadiOracle = "At the beginning of your end step, create a Treasure token for each creature that died this turn. (It's an artifact with \"{T}, Sacrifice this token: Add one mana of any color.\")";
  assert.equal(conditionalTokenProductionFactor(warrenOracle), 0.35);
  assert.equal(conditionalTokenProductionFactor(pitilessPlunderOracle), 1, "a death trigger pays no activation cost");
  assert.equal(conditionalTokenProductionFactor(docksideOracle), 1, "an ETB is not gated behind sacrificing a creature");
  assert.equal(conditionalTokenProductionFactor(smaugOracle), 1, "a damage trigger is not gated behind sacrificing a creature");
  assert.equal(conditionalTokenProductionFactor(mahadiOracle), 1, "an end-step trigger off deaths pays no activation cost");
  assert.equal(
    conditionalTokenProductionFactor("{1}, Sacrifice a Treasure: Create a Food token."),
    1,
    "converting one token into another is not fodder-dependent on creatures",
  );
  assert.equal(
    conditionalTokenProductionFactor("Sacrifice another creature: Create a 1/1 white Spirit creature token."),
    0.35,
    "the gate applies to creature-token production too, not only Treasure",
  );
  assert.equal(
    conditionalTokenProductionFactor("Sacrifice a creature. Create a Treasure token."),
    1,
    "an unrelated sacrifice in an earlier sentence does not gate a later, separate token trigger",
  );
});

const treasureSovereign = {
  name: "Treasure Sovereign",
  colors: ["B"],
  oracleText: "Whenever this creature deals damage, create that many Treasure tokens.",
};

const fodderTrader = {
  name: "Fodder Trader",
  oracleText: "Pay 1 life, Sacrifice another creature: Create a Treasure token.",
  typeLine: "Creature — Human Advisor",
  manaCost: "{2}{B}{B}",
  colorIdentity: ["B"],
  popularityRank: 1,
};

test("Founder #028: a fodder-gated Treasure producer loses the tokens package core to unconditional producers", () => {
  const bSpells = [
    ...Array.from({ length: 28 }, (_, i) => ({ name: `Ledger Flow ${i}`, oracleText: "When this enters, draw a card. Scry 1.", typeLine: "Creature — Horror", manaCost: "{2}{B}", colorIdentity: ["B"], popularityRank: 40 })),
    ...Array.from({ length: 24 }, (_, i) => ({ name: `Ledger Answer ${i}`, oracleText: "Destroy target creature.", typeLine: "Instant", manaCost: "{1}{B}", colorIdentity: ["B"], popularityRank: 40 })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Ledger Shield ${i}`, oracleText: "Target creature gains hexproof until end of turn.", typeLine: "Instant", manaCost: "{B}", colorIdentity: ["B"], popularityRank: 40 })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Coin Minter ${i}`, oracleText: "When this creature enters, create a Treasure token.", typeLine: "Creature — Human Rogue", manaCost: "{2}{B}", colorIdentity: ["B"], popularityRank: 40 })),
  ];
  const bGates = Array.from({ length: 20 }, (_, i) => ({
    name: `Swamp Gate ${i}`,
    oracleText: "This land enters the battlefield tapped. {T}: Add {B}.",
    typeLine: "Land",
    manaCost: "",
    colorIdentity: ["B"],
    producedMana: ["B"],
    popularityRank: 5,
    priceUsd: 0.5,
  }));
  const report = forgeNativeMasterwork({
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    seed: 11,
    commander: treasureSovereign,
    cards: [...bSpells, fodderTrader, ...bGates],
  });
  assert.ok(
    !report.selected.rows.some((row) => row.name === "Fodder Trader"),
    "Coin Minter's unconditional Treasure production must fill the tokens package ahead of a sac-for-Treasure activated ability",
  );
  assert.ok(report.selected.rows.some((row) => String(row.name).startsWith("Coin Minter")));
});

// =============================================================================
// Founder #029: fodder-gated mana production is not free ramp either
// =============================================================================
// Same shape as #028 (classifyNativeCard's "ramp" role is exactly as
// cost-blind as the old token_generator semantic was), found by auditing
// for other cards this gap affects: Ashnod's Altar / Phyrexian Altar
// ("Sacrifice a creature: Add...") need the same fodder Warren Soultrader
// does, but were getting full, undiscounted ramp credit.
// =============================================================================

test("Founder #029: mana production gated behind sacrificing a creature is discounted, unconditional/self-sacrificing production is not", () => {
  assert.equal(conditionalRampProductionFactor("Sacrifice a creature: Add {C}{C}."), 0.35, "Ashnod's Altar");
  assert.equal(conditionalRampProductionFactor("Sacrifice a creature: Add one mana of any color."), 0.35, "Phyrexian Altar");
  assert.equal(
    conditionalRampProductionFactor("Sacrifice an artifact: Add {C}{C}."),
    1,
    "Krark-Clan Ironworks sacrifices an artifact, not a creature — a distinct, not-yet-covered class",
  );
  assert.equal(
    conditionalRampProductionFactor(
      "When this creature enters, you may search your library for a basic land card, put that card onto the battlefield tapped, then shuffle.\nWhen this creature dies, you may draw a card.",
    ),
    1,
    "Solemn Simulacrum's land tutor is an ETB, not a sacrifice-gated activated ability",
  );
  assert.equal(
    conditionalRampProductionFactor("{T}, Sacrifice this artifact: Add one mana of any color."),
    1,
    "Lotus Petal sacrifices itself, not a creature — not fodder-dependent",
  );
  assert.equal(conditionalRampProductionFactor("{T}: Add {C}{C}."), 1, "Sol Ring pays no cost at all");
  assert.equal(
    conditionalRampProductionFactor("Sacrifice a creature. Add one mana of any color."),
    1,
    "an unrelated sacrifice in an earlier sentence does not gate a later, separate mana ability",
  );
});

// =============================================================================
// Founder #036: a commander immune to a symmetric damage sweep and
// rewarded for being damaged turns a normally-bad effect into pure profit
// =============================================================================
// Found comparing the engine's real Smaug the Impenetrable build against a
// real high-power player list for the same commander: the player's
// removal suite (Pestilence, Chain Reaction, Star of Extinction,
// Self-Destruct, Pain for All) isn't generic — every one of those cards
// hits Smaug too, but Smaug is indestructible, so it survives and floods
// the board with Treasures while everything else dies. The generic
// produce/reward signal system has no way to see this: it's a structural
// rules interaction (indestructible specifically survives lethal damage,
// not -X/-X or sacrifice), not a keyword any card "produces" the way
// tokens/treasure/artifacts are — it only becomes visible by reading the
// commander's own printed trigger condition, the same way
// commanderPayoffMagnitudeGates already reads magnitude-qualified ones.
// =============================================================================

test("Founder #036: commanderProfitsFromBeingDamaged requires both indestructible AND a real dealt-damage trigger on the same commander", () => {
  assert.equal(
    commanderProfitsFromBeingDamaged("Flying, indestructible, haste\nWhenever Smaug is dealt noncombat damage, create that many Treasure tokens."),
    true,
    "Smaug the Impenetrable's real printed text",
  );
  assert.equal(
    commanderProfitsFromBeingDamaged("Flying, indestructible, haste"),
    false,
    "indestructible alone, no dealt-damage reward at all, is not the combo",
  );
  assert.equal(
    commanderProfitsFromBeingDamaged("Whenever this creature is dealt damage, create that many Treasure tokens."),
    false,
    "the same reward with no indestructible is not the combo — this commander just dies to the sweeper",
  );
  assert.equal(
    commanderProfitsFromBeingDamaged("Flying, indestructible, haste\nWhenever Smaug attacks, create a Treasure token."),
    false,
    "an unrelated attack trigger on an indestructible creature is not this combo",
  );
});

test("Founder #036: cardDealsMassDamageToCreatures matches real symmetric sweepers, including scaling-damage ones with no fixed number", () => {
  const realSweepers = [
    "Pestilence deals 1 damage to each creature and each player.",
    "Chain Reaction deals damage equal to the number of creatures on the battlefield to each creature.",
    "Pain for All deals 2 damage to each creature and each player.",
    "Cave-In deals 2 damage to each creature and each player.",
    "Anger of the Gods deals 3 damage to each creature. Exile all creatures dealt damage this way.",
  ];
  for (const oracle of realSweepers) assert.ok(cardDealsMassDamageToCreatures(oracle), oracle);

  // Must not match a damage-ping engine that only hits opponents (the
  // exact Founder #032 false-sweeper case), or a -X/-X effect (which kills
  // even an indestructible creature via 0 toughness, bypassing the
  // protection entirely — the opposite of a combo, not a real connection).
  assert.equal(cardDealsMassDamageToCreatures("Whenever a creature you control enters, this enchantment deals 1 damage to each opponent."), false);
  assert.equal(cardDealsMassDamageToCreatures("All creatures get -3/-3 until end of turn."), false);
  assert.equal(cardDealsMassDamageToCreatures("Whenever Smaug is dealt noncombat damage, create that many Treasure tokens."), false, "the commander's own trigger text is not itself a producer of the effect");
});

const selfDamageCommander = {
  name: "Test Impenetrable Wyrm",
  colors: ["R"],
  oracleText: "Flying, indestructible, haste\nWhenever this creature is dealt noncombat damage, create that many Treasure tokens.",
};

const noRewardCommander = {
  name: "Test Plain Indestructible Wyrm",
  colors: ["R"],
  oracleText: "Flying, indestructible, haste",
};

const massDamageCard = {
  name: "Test Cataclysmic Blast",
  oracleText: "Test Cataclysmic Blast deals 3 damage to each creature.",
  typeLine: "Sorcery",
  manaCost: "{1}{R}{R}",
  colorIdentity: ["R"],
  popularityRank: 40,
};

test("Founder #036: a real self-damage-synergy card wins a reserved anchor slot for a commander that profits from being damaged", () => {
  const filler = [
    ...Array.from({ length: 28 }, (_, i) => ({ name: `Flow ${i}`, oracleText: "When this enters, draw a card. Scry 1.", typeLine: "Creature — Dragon", manaCost: "{2}{R}", colorIdentity: ["R"], popularityRank: 40 })),
    ...Array.from({ length: 24 }, (_, i) => ({ name: `Answer ${i}`, oracleText: "Exile target nonland permanent.", typeLine: "Instant", manaCost: "{1}{R}", colorIdentity: ["R"], popularityRank: 40 })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Stone ${i}`, oracleText: "Add one mana. Create a Treasure token.", typeLine: "Artifact", manaCost: "{2}", colorIdentity: [], popularityRank: 40 })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Threat ${i}`, oracleText: "Vigilance", typeLine: "Creature — Dragon", manaCost: "{3}{R}", colorIdentity: ["R"], popularityRank: 40 })),
  ];
  const gates = Array.from({ length: 20 }, (_, i) => ({
    name: `Mountain Gate ${i}`, oracleText: "This land enters the battlefield tapped. {T}: Add {R}.", typeLine: "Land",
    manaCost: "", colorIdentity: ["R"], producedMana: ["R"], popularityRank: 5, priceUsd: 0.5,
  }));

  const withCombo = forgeNativeMasterwork({
    format: "Commander", target: 100, strategy: "Balanced midrange", seed: 11,
    commander: selfDamageCommander, cards: [...filler, massDamageCard, ...gates],
  });
  assert.ok(
    withCombo.selected.rows.some((row) => row.name === "Test Cataclysmic Blast"),
    "a real mass-damage sweeper must be selected as an anchor for a commander that profits from being damaged",
  );
  const row = withCombo.selected.rows.find((row) => row.name === "Test Cataclysmic Blast");
  assert.equal(row.selfDamageSynergyHit, 1);

  // Same exact card, same exact pool, an otherwise-identical commander
  // that lacks the dealt-damage reward — the sweeper is not owed a
  // reserved slot here, since there is no combo to credit.
  const withoutCombo = forgeNativeMasterwork({
    format: "Commander", target: 100, strategy: "Balanced midrange", seed: 11,
    commander: noRewardCommander, cards: [...filler, massDamageCard, ...gates],
  });
  const controlRow = withoutCombo.selected.rows.find((row) => row.name === "Test Cataclysmic Blast");
  assert.ok(!controlRow || controlRow.selfDamageSynergyHit === 0, "no combo credit without the commander's own dealt-damage reward");
});

// Founder #041: found by cross-checking the Smaug the Impenetrable
// primer's own named "Damage Engines"/"Big Explosions" against the
// shipped #036 detector — Fire Covenant, Self-Destruct, and The Last Agni
// Kai are all explicit primer MVPs that scored zero self-damage-synergy
// hits, because none of them deal damage to EACH creature; they're
// single/divided-target effects instead. Real oracle text, verified via
// Scryfall (2026-08-21).
test("Founder #041: cardCanDealDamageToOwnCreature matches real fight/self-inflicted/divided-damage shapes cardDealsMassDamageToCreatures misses", () => {
  const fireCovenant = "As an additional cost to cast this spell, pay X life.\nFire Covenant deals X damage divided as you choose among any number of target creatures.";
  const selfDestruct = "Target creature you control deals X damage to any other target and X damage to itself, where X is its power.";
  const theLastAgniKai = "Target creature you control fights target creature an opponent controls. If the creature the opponent controls is dealt excess damage this way, add that much {R}.\nUntil end of turn, you don't lose unspent red mana as steps and phases end.";
  for (const oracle of [fireCovenant, selfDestruct, theLastAgniKai]) {
    assert.ok(cardCanDealDamageToOwnCreature(oracle), oracle);
    assert.equal(cardDealsMassDamageToCreatures(oracle), false, "none of these three are board-wide sweepers — must not double up with the #036 shape");
  }
  // Negative controls: plain single-target removal with no self-damage
  // angle, and Smaug's own dealt-damage trigger, must both stay unmatched.
  assert.equal(cardCanDealDamageToOwnCreature("Destroy target creature."), false);
  assert.equal(cardCanDealDamageToOwnCreature("Whenever Smaug is dealt noncombat damage, create that many Treasure tokens."), false);
});

const fireCovenantCard = {
  name: "Test Fire Covenant",
  oracleText: "As an additional cost to cast this spell, pay X life.\nTest Fire Covenant deals X damage divided as you choose among any number of target creatures.",
  typeLine: "Instant",
  manaCost: "{X}{B}",
  colorIdentity: ["B"],
  popularityRank: 40,
};

test("Founder #041: a real divided-damage/fight/self-inflicted card wins a reserved anchor slot for a commander that profits from being damaged", () => {
  const filler = [
    ...Array.from({ length: 28 }, (_, i) => ({ name: `Flow ${i}`, oracleText: "When this enters, draw a card. Scry 1.", typeLine: "Creature — Dragon", manaCost: "{2}{R}", colorIdentity: ["R"], popularityRank: 40 })),
    ...Array.from({ length: 24 }, (_, i) => ({ name: `Answer ${i}`, oracleText: "Exile target nonland permanent.", typeLine: "Instant", manaCost: "{1}{R}", colorIdentity: ["R"], popularityRank: 40 })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Stone ${i}`, oracleText: "Add one mana. Create a Treasure token.", typeLine: "Artifact", manaCost: "{2}", colorIdentity: [], popularityRank: 40 })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Threat ${i}`, oracleText: "Vigilance", typeLine: "Creature — Dragon", manaCost: "{3}{R}", colorIdentity: ["R"], popularityRank: 40 })),
  ];
  const gates = Array.from({ length: 20 }, (_, i) => ({
    name: `Mountain Gate ${i}`, oracleText: "This land enters the battlefield tapped. {T}: Add {R}.", typeLine: "Land",
    manaCost: "", colorIdentity: ["R"], producedMana: ["R"], popularityRank: 5, priceUsd: 0.5,
  }));

  const withCombo = forgeNativeMasterwork({
    format: "Commander", target: 100, strategy: "Balanced midrange", seed: 11,
    commander: selfDamageCommander, cards: [...filler, fireCovenantCard, ...gates],
  });
  assert.ok(
    withCombo.selected.rows.some((row) => row.name === "Test Fire Covenant"),
    "a real divided-damage-among-targets card must be selected as an anchor for a commander that profits from being damaged",
  );
  const row = withCombo.selected.rows.find((row) => row.name === "Test Fire Covenant");
  assert.equal(row.selfDamageSynergyHit, 1);

  const withoutCombo = forgeNativeMasterwork({
    format: "Commander", target: 100, strategy: "Balanced midrange", seed: 11,
    commander: noRewardCommander, cards: [...filler, fireCovenantCard, ...gates],
  });
  const controlRow = withoutCombo.selected.rows.find((row) => row.name === "Test Fire Covenant");
  assert.ok(!controlRow || controlRow.selfDamageSynergyHit === 0, "no combo credit without the commander's own dealt-damage reward");
});

// Founder #046: found by comparing a real Zimone, Infinite Analyst
// construction against her own primer — her entire identity is "the
// first spell you cast with {X} in its mana cost each turn costs {1}
// less... and grows Zimone," a real trigger shape
// commanderPayoffMagnitudeGates (#027) doesn't cover (a boolean cost-shape
// check, not a numeric mana-value threshold). Verified on a real
// construction: before this fix, real X-spells (Walking Ballista, Wan Shi
// Tong Librarian, Goldvein Hydra, and others) were essentially absent —
// only 3 X-cost cards total made the build, all by generic merit
// unrelated to Zimone. After the fix, 9 did, 6 of them newly present.
const zimoneOracle = "The first spell you cast with {X} in its mana cost each turn costs {1} less to cast for each +1/+1 counter on Zimone.\nWhenever you cast your first spell with {X} in its mana cost each turn, put two +1/+1 counters on Zimone.";

test("Founder #046: commanderCaresAboutXSpells matches Zimone's real \"spell with {X} in its mana cost\" trigger", () => {
  assert.equal(commanderCaresAboutXSpells(zimoneOracle), true);
  // A commander with no X-spell-specific text must stay closed.
  assert.equal(commanderCaresAboutXSpells("Whenever you cast a noncreature spell, draw a card."), false);
});

const xSpellCommander = { name: "Test X-Spell Commander", colors: ["U", "G"], oracleText: zimoneOracle };
const noXSpellCommander = { name: "Test Plain Commander", colors: ["U", "G"], oracleText: "Whenever you cast a noncreature spell, draw a card." };

const walkingBallistaCard = {
  name: "Test X Threat", oracleText: "Draw X cards.", typeLine: "Sorcery",
  manaCost: "{X}{U}", colorIdentity: ["U"], popularityRank: 40,
};

test("Founder #046: a real X-cost card wins a reserved anchor slot for a commander that cares about X spells", () => {
  const filler = [
    ...Array.from({ length: 28 }, (_, i) => ({ name: `Flow ${i}`, oracleText: "When this enters, draw a card. Scry 1.", typeLine: "Creature — Wizard", manaCost: "{2}{G}", colorIdentity: ["G"], popularityRank: 40 })),
    ...Array.from({ length: 24 }, (_, i) => ({ name: `Answer ${i}`, oracleText: "Exile target nonland permanent.", typeLine: "Instant", manaCost: "{1}{U}", colorIdentity: ["U"], popularityRank: 40 })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Stone ${i}`, oracleText: "Add one mana. Create a Treasure token.", typeLine: "Artifact", manaCost: "{2}", colorIdentity: [], popularityRank: 40 })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Threat ${i}`, oracleText: "Vigilance", typeLine: "Creature — Wizard", manaCost: "{3}{G}", colorIdentity: ["G"], popularityRank: 40 })),
  ];
  const gates = Array.from({ length: 20 }, (_, i) => ({
    name: `GU Gate ${i}`, oracleText: "This land enters the battlefield tapped. {T}: Add {G} or {U}.", typeLine: "Land",
    manaCost: "", colorIdentity: ["G", "U"], producedMana: ["G", "U"], popularityRank: 5, priceUsd: 0.5,
  }));

  const withCombo = forgeNativeMasterwork({
    format: "Commander", target: 100, strategy: "Balanced midrange", seed: 11,
    commander: xSpellCommander, cards: [...filler, walkingBallistaCard, ...gates],
  });
  assert.ok(
    withCombo.selected.rows.some((row) => row.name === "Test X Threat"),
    "a real X-cost card must be selected as an anchor for a commander that cares about X spells",
  );
  const row = withCombo.selected.rows.find((row) => row.name === "Test X Threat");
  assert.equal(row.xSpellSynergyHit, 1);

  const withoutCombo = forgeNativeMasterwork({
    format: "Commander", target: 100, strategy: "Balanced midrange", seed: 11,
    commander: noXSpellCommander, cards: [...filler, walkingBallistaCard, ...gates],
  });
  const controlRow = withoutCombo.selected.rows.find((row) => row.name === "Test X Threat");
  assert.ok(!controlRow || controlRow.xSpellSynergyHit === 0, "no combo credit without the commander's own X-spell-caring trigger");
});

// Founder #049: found by comparing a real Esika, God of the Tree //
// The Prismatic Bridge construction against her own primer ("Ultimate
// your super friends"). Her real back-face ability ("reveal cards from
// the top of your library until you reveal a creature or planeswalker
// card. Put that card onto the battlefield") cheats Planeswalkers into
// play for free — a real "superfriends" enabler. Verified on a real
// construction: the engine's own self-generated build ran only 6
// planeswalkers against the real player's 20, because Planeswalker isn't
// a creature type (commanderTribesFromOracle's typal system correctly
// doesn't apply — it's already excluded via ARTIFACT_OR_TOKEN_TYPES, same
// as Equipment/Vehicle in #047) and nothing else specifically valued a
// Planeswalker card higher for this commander shape.
const esikaOracle = "At the beginning of your upkeep, reveal cards from the top of your library until you reveal a creature or planeswalker card. Put that card onto the battlefield and the rest on the bottom of your library in a random order.";

test("Founder #049: commanderValuesPlaneswalkerCheats requires both a planeswalker mention and a real cost-cheat mechanism", () => {
  assert.equal(commanderValuesPlaneswalkerCheats(esikaOracle), true);
  // A real, common removal template ("destroy target creature or
  // planeswalker") mentions the type with no cost-cheat text at all, and
  // must stay closed — a bare type mention is not "superfriends" support.
  assert.equal(commanderValuesPlaneswalkerCheats("{2}{W}{B}, {T}: Destroy target creature or planeswalker."), false);
  // A cost-cheat commander with no planeswalker mention at all must also
  // stay closed.
  assert.equal(commanderValuesPlaneswalkerCheats("You may put a land card from your hand onto the battlefield."), false);
});

const planeswalkerCheatCommander = { name: "Test Esika", colors: ["W", "U", "B", "R", "G"], oracleText: esikaOracle };
const noCheatCommander = { name: "Test Plain Commander", colors: ["W", "U", "B", "R", "G"], oracleText: "Whenever you cast a noncreature spell, draw a card." };

const testPlaneswalkerCard = {
  name: "Test Planeswalker", oracleText: "Test Planeswalker enters with three loyalty counters on it.", typeLine: "Legendary Planeswalker — Test",
  manaCost: "{3}{U}{U}", colorIdentity: ["U"], popularityRank: 40,
};

test("Founder #049: a real Planeswalker card wins a reserved anchor slot for a commander that cheats them into play", () => {
  const filler = [
    ...Array.from({ length: 28 }, (_, i) => ({ name: `Flow ${i}`, oracleText: "When this enters, draw a card. Scry 1.", typeLine: "Creature — Wizard", manaCost: "{2}{G}", colorIdentity: ["G"], popularityRank: 40 })),
    ...Array.from({ length: 24 }, (_, i) => ({ name: `Answer ${i}`, oracleText: "Exile target nonland permanent.", typeLine: "Instant", manaCost: "{1}{U}", colorIdentity: ["U"], popularityRank: 40 })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Stone ${i}`, oracleText: "Add one mana. Create a Treasure token.", typeLine: "Artifact", manaCost: "{2}", colorIdentity: [], popularityRank: 40 })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Threat ${i}`, oracleText: "Vigilance", typeLine: "Creature — Wizard", manaCost: "{3}{G}", colorIdentity: ["G"], popularityRank: 40 })),
  ];
  const gates = Array.from({ length: 20 }, (_, i) => ({
    name: `WUBRG Gate ${i}`, oracleText: "This land enters the battlefield tapped. {T}: Add one mana of any color.", typeLine: "Land",
    manaCost: "", colorIdentity: ["W", "U", "B", "R", "G"], producedMana: ["W", "U", "B", "R", "G"], popularityRank: 5, priceUsd: 0.5,
  }));

  const withCombo = forgeNativeMasterwork({
    format: "Commander", target: 100, strategy: "Balanced midrange", seed: 11,
    commander: planeswalkerCheatCommander, cards: [...filler, testPlaneswalkerCard, ...gates],
  });
  assert.ok(
    withCombo.selected.rows.some((row) => row.name === "Test Planeswalker"),
    "a real Planeswalker card must be selected as an anchor for a commander that cheats them into play",
  );
  const row = withCombo.selected.rows.find((row) => row.name === "Test Planeswalker");
  assert.equal(row.planeswalkerCheatSynergyHit, 1);

  const withoutCombo = forgeNativeMasterwork({
    format: "Commander", target: 100, strategy: "Balanced midrange", seed: 11,
    commander: noCheatCommander, cards: [...filler, testPlaneswalkerCard, ...gates],
  });
  const controlRow = withoutCombo.selected.rows.find((row) => row.name === "Test Planeswalker");
  assert.ok(!controlRow || controlRow.planeswalkerCheatSynergyHit === 0, "no combo credit without the commander's own planeswalker-cheat trigger");
});

// Founder #050: found by comparing a real Marina Vendrell construction
// against her own primer (a real deck built around Duskmourn's Room
// permanent subtype and its lock/unlock mechanic — "Marina Vendrell +
// Intruder Alarm + Ghostly Dancers"). Her real activated ability ("{T}:
// Lock or unlock a door of target Room you control") directly interacts
// with Room, but Room isn't a creature type (commanderTribesFromOracle's
// typal system correctly doesn't apply — already excluded via
// ARTIFACT_OR_TOKEN_TYPES, same as Planeswalker in #049) and there's no
// dedicated Rooms package. Verified on a real construction: a real
// 5-color pool for Marina surfaced zero Room cards at all out of the 28
// real ones that exist.
const marinaOracle = "When Marina Vendrell enters, reveal the top seven cards of your library. Put all enchantment cards from among them into your hand and the rest on the bottom of your library in a random order.\n{T}: Lock or unlock a door of target Room you control. Activate only as a sorcery.";

test("Founder #050: commanderInteractsWithRooms matches Marina's real \"target Room you control\" ability", () => {
  assert.equal(commanderInteractsWithRooms(marinaOracle), true);
  assert.equal(commanderInteractsWithRooms("Whenever you cast a noncreature spell, draw a card."), false);
});

const roomCommander = { name: "Test Marina", colors: ["W", "U", "B", "R", "G"], oracleText: marinaOracle };
const noRoomCommander = { name: "Test Plain Commander", colors: ["W", "U", "B", "R", "G"], oracleText: "Whenever you cast a noncreature spell, draw a card." };

const testRoomCard = {
  name: "Test Room", oracleText: "You may cast either half of this card, but not both. As you cast this spell, choose the left or right half.", typeLine: "Enchantment — Room",
  manaCost: "{1}{U}", colorIdentity: ["U"], popularityRank: 40,
};

test("Founder #050: a real Room card wins a reserved anchor slot for a commander that interacts with Rooms", () => {
  const filler = [
    ...Array.from({ length: 28 }, (_, i) => ({ name: `Flow ${i}`, oracleText: "When this enters, draw a card. Scry 1.", typeLine: "Creature — Wizard", manaCost: "{2}{G}", colorIdentity: ["G"], popularityRank: 40 })),
    ...Array.from({ length: 24 }, (_, i) => ({ name: `Answer ${i}`, oracleText: "Exile target nonland permanent.", typeLine: "Instant", manaCost: "{1}{U}", colorIdentity: ["U"], popularityRank: 40 })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Stone ${i}`, oracleText: "Add one mana. Create a Treasure token.", typeLine: "Artifact", manaCost: "{2}", colorIdentity: [], popularityRank: 40 })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Threat ${i}`, oracleText: "Vigilance", typeLine: "Creature — Wizard", manaCost: "{3}{G}", colorIdentity: ["G"], popularityRank: 40 })),
  ];
  const gates = Array.from({ length: 20 }, (_, i) => ({
    name: `WUBRG Gate ${i}`, oracleText: "This land enters the battlefield tapped. {T}: Add one mana of any color.", typeLine: "Land",
    manaCost: "", colorIdentity: ["W", "U", "B", "R", "G"], producedMana: ["W", "U", "B", "R", "G"], popularityRank: 5, priceUsd: 0.5,
  }));

  const withCombo = forgeNativeMasterwork({
    format: "Commander", target: 100, strategy: "Balanced midrange", seed: 11,
    commander: roomCommander, cards: [...filler, testRoomCard, ...gates],
  });
  assert.ok(
    withCombo.selected.rows.some((row) => row.name === "Test Room"),
    "a real Room card must be selected as an anchor for a commander that interacts with Rooms",
  );
  const row = withCombo.selected.rows.find((row) => row.name === "Test Room");
  assert.equal(row.roomSynergyHit, 1);

  const withoutCombo = forgeNativeMasterwork({
    format: "Commander", target: 100, strategy: "Balanced midrange", seed: 11,
    commander: noRoomCommander, cards: [...filler, testRoomCard, ...gates],
  });
  const controlRow = withoutCombo.selected.rows.find((row) => row.name === "Test Room");
  assert.ok(!controlRow || controlRow.roomSynergyHit === 0, "no combo credit without the commander's own Room-interaction trigger");
});

// =============================================================================
// Founder #038: a multi-tribe payoff commander's own tribe list was never
// extracted at all
// =============================================================================
// Found comparing the engine's real Blech, Loafing Pest build against a
// real player list for the same commander: Blech's actual printed ability
// ("Whenever you gain life, put a +1/+1 counter on each Pest, Bat, Insect,
// Snake, and Spider you control.") lists five tribes in one comma/"and"-
// separated clause — a shape none of commanderTribesFromOracle's four
// existing patterns match (they only handle a single tribe: "another Bear
// you control", "a Dragon you control", etc.). The result wasn't "misses
// some tribes" — it was zero tribes, silently disabling every
// tribeAnchorLimit reservation in chooseSpells for the commander's entire
// actual payoff. Verified on a real, full-pool construction: with tribes
// returning empty, the engine's Blech build had only 3 real on-type
// creatures among 36 creatures total (64 nonland cards) — after the fix,
// the exact same real card pool produced 24 on-type creatures among 46.
// =============================================================================

const blechOracle = "Whenever you gain life, put a +1/+1 counter on each Pest, Bat, Insect, Snake, and Spider you control.";

test("Founder #038: commanderTribesFromOracle extracts every tribe from a multi-type list, not just single-tribe phrasings", () => {
  assert.deepEqual(commanderTribesFromOracle([{ oracleText: blechOracle }]), ["pest", "bat", "insect", "snake", "spider"]);
  // Single-tribe phrasings (Ayula, Queen Among Bears' real text) are unaffected.
  assert.deepEqual(
    commanderTribesFromOracle([{ oracleText: "Whenever another Bear you control enters, choose one —\n• Put two +1/+1 counters on target Bear.\n• Target Bear you control fights target creature you don't control." }]),
    ["bear"],
  );
  // A generic "each creature you control" must still yield nothing —
  // "creature" is already a stop word, and the new pattern reuses the
  // exact same final filter every other pattern does.
  assert.deepEqual(commanderTribesFromOracle([{ oracleText: "Whenever a creature you control dies, draw a card." }]), []);
});

test("Founder #038: a multi-tribe commander reserves real on-type anchors instead of generic goodstuff", () => {
  const blech = { name: "Test Blech", colors: ["B", "G"], oracleText: blechOracle };
  const filler = [
    ...Array.from({ length: 28 }, (_, i) => ({ name: `Flow ${i}`, oracleText: "When this enters, draw a card. Scry 1.", typeLine: "Creature — Human Warrior", manaCost: "{2}{G}", colorIdentity: ["G"], popularityRank: 40 })),
    ...Array.from({ length: 24 }, (_, i) => ({ name: `Answer ${i}`, oracleText: "Exile target nonland permanent.", typeLine: "Instant", manaCost: "{1}{B}", colorIdentity: ["B"], popularityRank: 40 })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Shield ${i}`, oracleText: "Target creature gains hexproof and indestructible until end of turn.", typeLine: "Instant", manaCost: "{1}{G}", colorIdentity: ["G"], popularityRank: 40 })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Stone ${i}`, oracleText: "Add one mana. Create a Treasure token.", typeLine: "Artifact", manaCost: "{2}", colorIdentity: [], popularityRank: 40 })),
  ];
  const pests = Array.from({ length: 10 }, (_, i) => ({
    name: `Test Pest ${i}`, oracleText: "You gain 1 life.", typeLine: "Creature — Pest", manaCost: "{1}{B}", cmc: 2, colorIdentity: ["B"], popularityRank: 200,
  }));
  const gates = Array.from({ length: 20 }, (_, i) => ({
    name: `Swamp Gate ${i}`, oracleText: "This land enters the battlefield tapped. {T}: Add {B} or {G}.", typeLine: "Land",
    manaCost: "", colorIdentity: ["B", "G"], producedMana: ["B", "G"], popularityRank: 5, priceUsd: 0.5,
  }));
  const report = forgeNativeMasterwork({
    format: "Commander", target: 100, strategy: "Balanced midrange", seed: 11,
    commander: blech, cards: [...filler, ...pests, ...gates],
  });
  const pestsSelected = report.selected.rows.filter((row) => row.name.startsWith("Test Pest")).length;
  assert.ok(pestsSelected >= 8, `expected most of the 10 real on-type Pests to be reserved as anchors, got ${pestsSelected}`);
});

// Hei Bai, Forest Guardian's real oracle text: "When Hei Bai enters, reveal
// cards from the top of your library until you reveal a Shrine card. You
// may put that card onto the battlefield. Then shuffle." — a "dig until you
// find TYPE" payoff, structurally unlike every "X you control"/"X spells
// you cast" phrasing the earlier patterns cover.
const heiBaiOracle = "When Hei Bai enters, reveal cards from the top of your library until you reveal a Shrine card. You may put that card onto the battlefield. Then shuffle.";

test("Founder #039: commanderTribesFromOracle extracts a \"reveal until you reveal a TYPE card\" payoff type", () => {
  assert.deepEqual(commanderTribesFromOracle([{ oracleText: heiBaiOracle }]), ["shrine"]);
  // Generic reveal-tutors for land/creature cards (common ramp/dig
  // templates) must not turn "land" or "creature" into a fake tribe —
  // both are already caught by ARTIFACT_OR_TOKEN_TYPES/TRIBAL_STOP_WORDS,
  // same guard every other pattern in this function relies on.
  assert.deepEqual(
    commanderTribesFromOracle([{ oracleText: "Reveal cards from the top of your library until you reveal a land card. Put that card onto the battlefield and the rest into your graveyard." }]),
    [],
  );
  assert.deepEqual(
    commanderTribesFromOracle([{ oracleText: "Reveal cards from the top of your library until you reveal a creature card. Put that card into your hand and the rest on the bottom of your library in a random order." }]),
    [],
  );
});

test("Founder #039: a dig-until-Shrine commander reserves real Shrine anchors, creature or enchantment alike", () => {
  const heiBai = { name: "Test Hei Bai", colors: ["W", "U", "B", "R", "G"], oracleText: heiBaiOracle };
  const filler = [
    ...Array.from({ length: 28 }, (_, i) => ({ name: `Flow ${i}`, oracleText: "When this enters, draw a card. Scry 1.", typeLine: "Creature — Human Warrior", manaCost: "{2}{G}", colorIdentity: ["G"], popularityRank: 40 })),
    ...Array.from({ length: 24 }, (_, i) => ({ name: `Answer ${i}`, oracleText: "Exile target nonland permanent.", typeLine: "Instant", manaCost: "{1}{B}", colorIdentity: ["B"], popularityRank: 40 })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Shield ${i}`, oracleText: "Target creature gains hexproof and indestructible until end of turn.", typeLine: "Instant", manaCost: "{1}{W}", colorIdentity: ["W"], popularityRank: 40 })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Stone ${i}`, oracleText: "Add one mana. Create a Treasure token.", typeLine: "Artifact", manaCost: "{2}", colorIdentity: [], popularityRank: 40 })),
  ];
  // Shrine spans both creatures (the real Go-Shintai cycle) and pure
  // enchantments (the real Honden/Sanctum cycles) — directTribes matches
  // by typeLine substring, not a "Creature" requirement, so both shapes
  // need to anchor equally once "shrine" is extracted at all.
  const shrineCreatures = Array.from({ length: 6 }, (_, i) => ({
    name: `Test Shrine Creature ${i}`, oracleText: "Whenever you gain life, draw a card.", typeLine: "Legendary Enchantment Creature — Shrine", manaCost: "{2}{G}", cmc: 3, colorIdentity: ["G"], popularityRank: 200,
  }));
  const shrineEnchantments = Array.from({ length: 16 }, (_, i) => ({
    name: `Test Shrine Enchantment ${i}`, oracleText: "At the beginning of your upkeep, if you control three or more Shrines, draw a card.", typeLine: "Legendary Enchantment — Shrine", manaCost: "{2}{U}", cmc: 3, colorIdentity: ["U"], popularityRank: 200,
  }));
  const gates = Array.from({ length: 20 }, (_, i) => ({
    name: `WUBRG Gate ${i}`, oracleText: "This land enters the battlefield tapped. {T}: Add one mana of any color.", typeLine: "Land",
    manaCost: "", colorIdentity: ["W", "U", "B", "R", "G"], producedMana: ["W", "U", "B", "R", "G"], popularityRank: 5, priceUsd: 0.5,
  }));
  const report = forgeNativeMasterwork({
    format: "Commander", target: 100, strategy: "Balanced midrange", seed: 11,
    commander: heiBai, cards: [...filler, ...shrineCreatures, ...shrineEnchantments, ...gates],
  });
  const shrinesSelected = report.selected.rows.filter((row) => row.name.startsWith("Test Shrine")).length;
  assert.ok(shrinesSelected >= 18, `expected most of the 22 real on-type Shrines (creature and enchantment alike) to be reserved as anchors, got ${shrinesSelected}`);
});

// Founder #047: found while investigating a real "Hero tribal" Nick Fury,
// Agent of S.H.I.E.L.D. decklist — his real ability ("look at the top
// seven cards of your library. You may put a Hero, Equipment, or Vehicle
// card from among them onto the battlefield") is a THIRD "dig, then put a
// TYPE card into play" shape, distinct from #039's "reveal ... until you
// reveal" (fixed sample instead of digging-until-found, AND multiple
// candidate types at once).
const nickFuryOracle = "Power-up — {W}{U}{B}{R}{G}: Put two +1/+1 counters on Nick Fury, then look at the top seven cards of your library. You may put a Hero, Equipment, or Vehicle card from among them onto the battlefield. If it's a double-faced card, you may transform it. Put the rest on the bottom of your library in a random order.";

test("Founder #047: commanderTribesFromOracle extracts a \"you may put a TYPE1, TYPE2, or TYPE3 card onto the battlefield\" payoff type", () => {
  assert.deepEqual(commanderTribesFromOracle([{ oracleText: nickFuryOracle }]), ["hero"]);
  // Equipment and Vehicle are both already in ARTIFACT_OR_TOKEN_TYPES —
  // correctly filtered out by the same shared stop-list every other
  // pattern here uses, since Equipment already has its own dedicated
  // package and Vehicle has neither a typal identity nor an existing one.
  // Generic land/creature dig-and-cheat templates must not turn "land" or
  // "creature" into a fake tribe either.
  assert.deepEqual(
    commanderTribesFromOracle([{ oracleText: "You may put a land card from among them onto the battlefield." }]),
    [],
  );
  assert.deepEqual(
    commanderTribesFromOracle([{ oracleText: "You may put a creature card from among them onto the battlefield." }]),
    [],
  );
});

test("Founder #047: a dig-and-cheat Hero commander reserves real on-type anchors", () => {
  const nickFury = { name: "Test Nick Fury", colors: ["W", "U", "B", "R", "G"], oracleText: nickFuryOracle };
  const filler = [
    ...Array.from({ length: 28 }, (_, i) => ({ name: `Flow ${i}`, oracleText: "When this enters, draw a card. Scry 1.", typeLine: "Creature — Human Warrior", manaCost: "{2}{G}", colorIdentity: ["G"], popularityRank: 40 })),
    ...Array.from({ length: 24 }, (_, i) => ({ name: `Answer ${i}`, oracleText: "Exile target nonland permanent.", typeLine: "Instant", manaCost: "{1}{B}", colorIdentity: ["B"], popularityRank: 40 })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Shield ${i}`, oracleText: "Target creature gains hexproof and indestructible until end of turn.", typeLine: "Instant", manaCost: "{1}{W}", colorIdentity: ["W"], popularityRank: 40 })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Stone ${i}`, oracleText: "Add one mana. Create a Treasure token.", typeLine: "Artifact", manaCost: "{2}", colorIdentity: [], popularityRank: 40 })),
  ];
  const heroes = Array.from({ length: 10 }, (_, i) => ({
    name: `Test Hero ${i}`, oracleText: "Vigilance.", typeLine: "Legendary Creature — Human Hero", manaCost: "{1}{R}", cmc: 2, colorIdentity: ["R"], popularityRank: 200,
  }));
  const gates = Array.from({ length: 20 }, (_, i) => ({
    name: `WUBRG Gate ${i}`, oracleText: "This land enters the battlefield tapped. {T}: Add one mana of any color.", typeLine: "Land",
    manaCost: "", colorIdentity: ["W", "U", "B", "R", "G"], producedMana: ["W", "U", "B", "R", "G"], popularityRank: 5, priceUsd: 0.5,
  }));
  const report = forgeNativeMasterwork({
    format: "Commander", target: 100, strategy: "Balanced midrange", seed: 11,
    commander: nickFury, cards: [...filler, ...heroes, ...gates],
  });
  const heroesSelected = report.selected.rows.filter((row) => row.name.startsWith("Test Hero")).length;
  assert.ok(heroesSelected >= 8, `expected most of the 10 real on-type Heroes to be reserved as anchors, got ${heroesSelected}`);
});

// Founder #063: found via a real Winota, Joiner of Forces comparison — one
// of the format's single most popular commanders. Her real, current
// oracle text is the same #047 "dig a fixed sample, put a TYPE card onto
// the battlefield" shape, but with one extra descriptor word between the
// captured type and the literal "card" — "Human CREATURE card", not Nick
// Fury's bare "Hero... card" — which the #047 pattern never accounted for.
const winotaOracle = "Whenever a non-Human creature you control attacks, look at the top six cards of your library. You may put a Human creature card from among them onto the battlefield tapped and attacking. It gains indestructible until end of turn. Put the rest of the cards on the bottom of your library in a random order.";

test("Founder #063: commanderTribesFromOracle extracts the real \"you may put a TYPE creature card onto the battlefield\" shape (Winota), not just the bare \"TYPE card\" #047 covers", () => {
  assert.deepEqual(commanderTribesFromOracle([{ oracleText: winotaOracle }]), ["human"]);
  // #047's own multi-type extraction (bare "TYPE1, TYPE2, or TYPE3 card",
  // no descriptor word) must still work unchanged.
  assert.deepEqual(commanderTribesFromOracle([{ oracleText: nickFuryOracle }]), ["hero"]);
  // The optional descriptor word itself must never become a fake tribe.
  assert.deepEqual(
    commanderTribesFromOracle([{ oracleText: "You may put a creature card from among them onto the battlefield." }]),
    [],
  );
  assert.deepEqual(
    commanderTribesFromOracle([{ oracleText: "You may put a land card from among them onto the battlefield." }]),
    [],
  );
  assert.deepEqual(
    commanderTribesFromOracle([{ oracleText: "You may put a permanent card from among them onto the battlefield." }]),
    [],
  );
});

test("Founder #063: a dig-and-cheat Human commander reserves real on-type anchors", () => {
  const winota = { name: "Test Winota", colors: ["R", "W"], oracleText: winotaOracle };
  const filler = [
    ...Array.from({ length: 28 }, (_, i) => ({ name: `Flow ${i}`, oracleText: "When this enters, draw a card. Scry 1.", typeLine: "Creature — Elemental", manaCost: "{2}{R}", colorIdentity: ["R"], popularityRank: 40 })),
    ...Array.from({ length: 24 }, (_, i) => ({ name: `Answer ${i}`, oracleText: "Exile target nonland permanent.", typeLine: "Instant", manaCost: "{1}{W}", colorIdentity: ["W"], popularityRank: 40 })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Shield ${i}`, oracleText: "Target creature gains hexproof and indestructible until end of turn.", typeLine: "Instant", manaCost: "{1}{W}", colorIdentity: ["W"], popularityRank: 40 })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Stone ${i}`, oracleText: "Add one mana. Create a Treasure token.", typeLine: "Artifact", manaCost: "{2}", colorIdentity: [], popularityRank: 40 })),
  ];
  const humans = Array.from({ length: 10 }, (_, i) => ({
    name: `Test Human ${i}`, oracleText: "Vigilance.", typeLine: "Creature — Human Soldier", manaCost: "{1}{W}", cmc: 2, colorIdentity: ["W"], popularityRank: 200,
  }));
  const gates = Array.from({ length: 20 }, (_, i) => ({
    name: `RW Gate ${i}`, oracleText: "This land enters the battlefield tapped. {T}: Add {R} or {W}.", typeLine: "Land",
    manaCost: "", colorIdentity: ["R", "W"], producedMana: ["R", "W"], popularityRank: 5, priceUsd: 0.5,
  }));
  const report = forgeNativeMasterwork({
    format: "Commander", target: 100, strategy: "Balanced midrange", seed: 11,
    commander: winota, cards: [...filler, ...humans, ...gates],
  });
  const humansSelected = report.selected.rows.filter((row) => row.name.startsWith("Test Human")).length;
  assert.ok(humansSelected >= 8, `expected most of the 10 real on-type Humans to be reserved as anchors, got ${humansSelected}`);
});

// Founder #066: found via a real Ashling, the Limitless comparison. Her
// real text ("Elemental permanent spells you cast from your hand gain
// evoke...") has a type-qualifier word (permanent/creature/artifact/etc.)
// sitting directly between the real tribe and "spells you cast" — the old
// pattern's single-word capture (positioned immediately before "spells")
// grabbed "permanent" instead, which is already a stop word, so the whole
// extraction silently produced nothing.
const ashlingOracle = "Elemental permanent spells you cast from your hand gain evoke {4} as you cast them. (If you cast a spell for its evoke cost, it's sacrificed when it enters.)\nWhenever you sacrifice a nontoken Elemental, create a token that's a copy of it. The token gains haste until end of turn. At the beginning of your next end step, sacrifice it unless you pay {W}{U}{B}{R}{G}.";

test("Founder #066: commanderTribesFromOracle extracts the real \"TRIBE TYPE-WORD spells you cast\" shape (Ashling, the Limitless), not just the bare \"TRIBE spells you cast\" the old pattern covers", () => {
  assert.deepEqual(commanderTribesFromOracle([{ oracleText: ashlingOracle }]), ["elemental"]);
  // The bare single-word case (no qualifier) must still work unchanged.
  assert.deepEqual(
    commanderTribesFromOracle([{ oracleText: "Dragon spells you cast cost {1} less to cast." }]),
    ["dragon"],
  );
  // A generic type-word alone, with no real tribe before it, must not
  // become a fake tribe — Rakdos, Lord of Riots' real text.
  assert.deepEqual(
    commanderTribesFromOracle([{ oracleText: "Creature spells you cast cost {1} less to cast for each 1 life your opponents have lost this turn." }]),
    [],
  );
  // A color word sitting in the same position (Bontu's Monument's real
  // shape) must not become a fake tribe either — no real commander uses
  // this phrasing today, but the qualifier-skipping widening makes the
  // position reachable, so it's guarded defensively.
  assert.deepEqual(
    commanderTribesFromOracle([{ oracleText: "Black creature spells you cast cost {1} less to cast." }]),
    [],
  );
});

test("Founder #066: an Elemental-typal-cheat commander reserves real on-type anchors", () => {
  const ashling = { name: "Test Ashling", colors: ["W", "U", "B", "R", "G"], oracleText: ashlingOracle };
  const filler = [
    ...Array.from({ length: 28 }, (_, i) => ({ name: `Flow ${i}`, oracleText: "When this enters, draw a card. Scry 1.", typeLine: "Creature — Spirit", manaCost: "{2}{U}", colorIdentity: ["U"], popularityRank: 40 })),
    ...Array.from({ length: 24 }, (_, i) => ({ name: `Answer ${i}`, oracleText: "Exile target nonland permanent.", typeLine: "Instant", manaCost: "{1}{B}", colorIdentity: ["B"], popularityRank: 40 })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Bolt ${i}`, oracleText: "This deals 2 damage to any target.", typeLine: "Instant", manaCost: "{R}", colorIdentity: ["R"], popularityRank: 40 })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Stone ${i}`, oracleText: "Add one mana. Create a Treasure token.", typeLine: "Artifact", manaCost: "{2}", colorIdentity: [], popularityRank: 40 })),
  ];
  const elementals = Array.from({ length: 10 }, (_, i) => ({
    name: `Test Elemental ${i}`, oracleText: "Vigilance.", typeLine: "Creature — Elemental", manaCost: "{1}{R}", cmc: 2, colorIdentity: ["R"], popularityRank: 200,
  }));
  const gates = Array.from({ length: 20 }, (_, i) => ({
    name: `WUBRG Gate ${i}`, oracleText: "This land enters the battlefield tapped. {T}: Add one mana of any color.", typeLine: "Land",
    manaCost: "", colorIdentity: ["W", "U", "B", "R", "G"], producedMana: ["W", "U", "B", "R", "G"], popularityRank: 5, priceUsd: 0.5,
  }));
  const report = forgeNativeMasterwork({
    format: "Commander", target: 100, strategy: "Balanced midrange", seed: 11,
    commander: ashling, cards: [...filler, ...elementals, ...gates],
  });
  const elementalsSelected = report.selected.rows.filter((row) => row.name.startsWith("Test Elemental")).length;
  assert.ok(elementalsSelected >= 8, `expected most of the 10 real on-type Elementals to be reserved as anchors, got ${elementalsSelected}`);
});

test("Founder #039: identityTribalTypesFor merges commander-derived tribes with the player's typed note, note first", () => {
  const heiBai = { name: "Hei Bai, Forest Guardian", colors: ["W", "U", "B", "R", "G"], oracleText: heiBaiOracle };
  assert.deepEqual(identityTribalTypesFor([], heiBai, null), ["shrine"]);
  // An explicit note-typed tribe stays first and isn't duplicated.
  assert.deepEqual(identityTribalTypesFor(["shrine"], heiBai, null), ["shrine"]);
  assert.deepEqual(identityTribalTypesFor(["spirit"], heiBai, null), ["spirit", "shrine"]);
  // A commander with no extractable tribe contributes nothing extra.
  const genericCommander = { name: "Test Generic", colors: ["U"], oracleText: "Whenever a creature you control dies, draw a card." };
  assert.deepEqual(identityTribalTypesFor(["spells"], genericCommander, null), ["spells"]);
});

test("Founder #040: identityMechanicIdsFor folds in commander-implied package mechanics that have a real hand-authored query", () => {
  // Hei Bai has no blink-others text, but its valuable self-ETB opens the
  // blink package (detectBlinkCommander, strategic-intent.mjs) as of #040,
  // and "blink" has a precise BLUEPRINT_MECHANICS query.
  const heiBaiCommander = { name: "Test Hei Bai", colors: ["W", "U", "B", "R", "G"], oracleText: heiBaiOracle };
  assert.deepEqual(identityMechanicIdsFor([], heiBaiCommander, null), ["blink"]);
  // Already-typed note mechanics stay first and aren't duplicated.
  assert.deepEqual(identityMechanicIdsFor(["blink"], heiBaiCommander, null), ["blink"]);
  assert.deepEqual(identityMechanicIdsFor(["power_up"], heiBaiCommander, null), ["power_up", "blink"]);
  // A commander that opens a package with no real hand-authored query
  // (tokens has no BLUEPRINT_MECHANICS entry) contributes nothing extra —
  // this must never fire a noisy generic-fallback search.
  const tokenCommander = { name: "Test Token Commander", colors: ["R"], oracleText: "Whenever a creature enters the battlefield under your control, create a 1/1 red Goblin creature token." };
  assert.deepEqual(identityMechanicIdsFor([], tokenCommander, null), []);
  // A commander with no package-opening text at all contributes nothing.
  const genericCommander2 = { name: "Test Generic 2", colors: ["U"], oracleText: "Whenever a creature you control dies, draw a card." };
  assert.deepEqual(identityMechanicIdsFor(["spells"], genericCommander2, null), ["spells"]);
});

