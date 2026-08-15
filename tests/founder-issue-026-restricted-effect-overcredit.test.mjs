import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyNativeCard,
  colorlessPipsFromCost,
  colorPipsFromCost,
  forgeNativeMasterwork,
  interactionQualityFor,
  landColoredManaFixingFactor,
  landRestrictedFixingPenalty,
  listHasTypalDensity,
  manaConsistencyReport,
  modalAwareRoleScore,
  parseNativeBlueprintIntent,
  roleFloorCredit,
} from "../app/native-masterwork-engine.mjs";

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
  oracleText: "Whenever this enters or attacks, create a tapped artifact token. Whenever you cast an artifact spell with mana value 4 or greater, put two +1/+1 counters on this.",
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
  const modalTotal = modalAwareRoleScore(
    kozilekShape.map((role) => (weights[role] || (role === "threat" ? 7 : 2)) * (role === "interaction" ? interactionQualityFor(kozilekOracle) : 1)),
    kozilekOracle,
  );
  const dedicatedRemoval = modalAwareRoleScore([11], "Destroy target creature.");
  assert.ok(modalTotal < 11 + 10, "modal extra modes must not sum as if they were simultaneous jobs");
  assert.ok(modalTotal > dedicatedRemoval, "optionality still keeps a flexibility remainder over a single-mode spell");
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
