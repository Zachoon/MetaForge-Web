import assert from "node:assert/strict";
import test from "node:test";
import {
  buildStrategicIntent,
  cardIsPackageFalseFriend,
  cardSatisfiesPackageCore,
  namedArtifactTokenScopeFromIntent,
} from "../app/strategic-intent.mjs";
import {
  commanderMechanicalScopes,
  forgeNativeMasterwork,
} from "../app/native-masterwork-engine.mjs";

const emptyBlueprint = {
  source: "",
  requestedMechanics: [],
  desiredRoles: [],
  packageSignals: [],
  promises: [],
};

function intentFor(commander, extraContext = {}) {
  return buildStrategicIntent(
    { format: "Commander", strategy: "Balanced midrange", commander },
    {
      blueprint: emptyBlueprint,
      commanderScopes: commanderMechanicalScopes(commander),
      ...extraContext,
    },
  );
}

const clueOligarch = {
  name: "Clue Oligarch",
  colors: ["W", "B"],
  oracleText: "Deathtouch. At the beginning of your end step, investigate for each opponent who lost life this turn. Whenever a Clue you control is put into a graveyard from the battlefield, create a 1/1 white and black Spirit creature token with flying.",
  typeLine: "Legendary Creature — Human Advisor",
  manaCost: "{2}{W}{B}",
};

const treasureTrove = {
  name: "Treasure Trove",
  colors: ["R"],
  oracleText: "Whenever you attack, create a Treasure token.",
  typeLine: "Legendary Creature — Pirate",
  manaCost: "{2}{R}",
};

const landfallTitan = {
  name: "Test Landfall Titan",
  colors: ["G"],
  oracleText: "Landfall — Whenever a land you control enters, create a 0/1 green Plant creature token.",
  typeLine: "Legendary Creature — Elemental",
  manaCost: "{4}{G}{G}",
};

const tokenFoundry = {
  name: "Test Token Foundry",
  colors: ["W"],
  oracleText: "At the beginning of combat on your turn, create a 1/1 white Citizen creature token.",
  typeLine: "Legendary Creature — Human Citizen",
  manaCost: "{2}{W}",
};

const equipmentSmith = {
  name: "Test Equipment Smith",
  colors: ["W"],
  oracleText: "Whenever an Equipment you control becomes attached to a creature you control, put a +1/+1 counter on that creature.",
  typeLine: "Legendary Creature — Kor Artificer",
  manaCost: "{2}{W}",
};

const investigateScout = {
  name: "Investigate Scout",
  oracleText: "When this enters, investigate.",
  typeLine: "Creature — Human Advisor",
  manaCost: "{2}{W}",
};

const clueForge = {
  name: "Clue Forge",
  oracleText: "Create a Clue token.",
  typeLine: "Artifact",
  manaCost: "{2}",
};

const angelHost = {
  name: "Angel Host",
  oracleText: "At the beginning of combat on your turn, create a 4/4 white Angel creature token with flying.",
  typeLine: "Creature — Angel",
  manaCost: "{3}{W}",
};

const plantNursery = {
  name: "Plant Nursery",
  oracleText: "Whenever a land you control enters, create a 0/1 green Plant creature token.",
  typeLine: "Creature — Elf Druid",
  manaCost: "{2}{G}",
};

const citizenMuster = {
  name: "Citizen Muster",
  oracleText: "Create a 1/1 white Citizen creature token.",
  typeLine: "Creature — Human",
  manaCost: "{1}{W}",
};

const artifactDispute = {
  name: "Artifact Dispute",
  oracleText: "As an additional cost to cast this spell, sacrifice an artifact or creature. Draw two cards and create a Treasure token.",
  typeLine: "Instant",
  manaCost: "{1}{B}",
};

const treasureDigger = {
  name: "Treasure Digger",
  oracleText: "When this enters, create a Treasure token.",
  typeLine: "Creature — Pirate",
  manaCost: "{1}{R}",
};

test("tokens occupancy scopes only named artifact tokens, never creature riders", () => {
  const clueIntent = intentFor(clueOligarch);
  const tokens = clueIntent.packages.find((pkg) => pkg.id === "tokens");
  assert.ok(tokens, "investigate + Spirit rider still opens the tokens package");
  assert.deepEqual(tokens.tokenScope, ["clue"]);
  assert.deepEqual(namedArtifactTokenScopeFromIntent(clueIntent), ["clue"]);
  assert.ok(!tokens.tokenScope.includes("spirit"), "Spirit payoff tokens do not specialize occupancy");

  const landfallIntent = intentFor(landfallTitan);
  const landfallTokens = landfallIntent.packages.find((pkg) => pkg.id === "tokens");
  assert.ok(landfallTokens, "a Plant landfall commander still has a generic tokens package");
  assert.deepEqual(landfallTokens.tokenScope, []);

  const goWideIntent = intentFor(tokenFoundry);
  assert.deepEqual(goWideIntent.packages.find((pkg) => pkg.id === "tokens")?.tokenScope, []);

  const equipmentIntent = intentFor(equipmentSmith);
  assert.ok(!equipmentIntent.packageIds.includes("tokens"));
  assert.deepEqual(namedArtifactTokenScopeFromIntent(equipmentIntent), []);
});

test("a Clue engine treats investigate as tokens core and Angel factories as false friends", () => {
  const intent = intentFor(clueOligarch);
  assert.equal(cardSatisfiesPackageCore(investigateScout, "tokens", intent), true);
  assert.equal(cardSatisfiesPackageCore(clueForge, "tokens", intent), true);
  assert.equal(cardSatisfiesPackageCore(angelHost, "tokens", intent), false);
  assert.equal(cardSatisfiesPackageCore(plantNursery, "tokens", intent), false);
  assert.equal(cardIsPackageFalseFriend(angelHost, "tokens", intent), true);
  assert.equal(cardIsPackageFalseFriend(plantNursery, "tokens", intent), true);
  assert.equal(cardSatisfiesPackageCore(artifactDispute, "tokens", intent), false);
  assert.equal(cardIsPackageFalseFriend(artifactDispute, "tokens", intent), false);
  assert.equal(cardSatisfiesPackageCore(treasureDigger, "tokens", intent), false);
  assert.equal(cardIsPackageFalseFriend(treasureDigger, "tokens", intent), false);
});

test("a Treasure engine does not treat Clue makers as its tokens core", () => {
  const intent = intentFor(treasureTrove);
  assert.deepEqual(intent.packages.find((pkg) => pkg.id === "tokens")?.tokenScope, ["treasure"]);
  assert.equal(cardSatisfiesPackageCore(treasureDigger, "tokens", intent), true);
  assert.equal(cardSatisfiesPackageCore(investigateScout, "tokens", intent), false);
  assert.equal(cardIsPackageFalseFriend(angelHost, "tokens", intent), true);
  assert.equal(cardIsPackageFalseFriend(investigateScout, "tokens", intent), false);
});

test("creature-token commanders keep generic tokens occupancy", () => {
  const landfallIntent = intentFor(landfallTitan);
  assert.equal(cardSatisfiesPackageCore(plantNursery, "tokens", landfallIntent), true);
  assert.equal(cardSatisfiesPackageCore(angelHost, "tokens", landfallIntent), true);
  assert.equal(cardIsPackageFalseFriend(angelHost, "tokens", landfallIntent), false);

  const goWideIntent = intentFor(tokenFoundry);
  assert.equal(cardSatisfiesPackageCore(citizenMuster, "tokens", goWideIntent), true);
  assert.equal(cardSatisfiesPackageCore(angelHost, "tokens", goWideIntent), true);
  assert.equal(cardIsPackageFalseFriend(angelHost, "tokens", goWideIntent), false);
});

test("a Clue commander forges investigate and artifact outlets, not Angel factories as package core", () => {
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
    cards: [...wbSpells, investigateScout, angelHost, artifactDispute, clueForge, ...wbDuals],
  });
  const names = report.selected.rows.map((row) => row.name);
  const intent = report.selected.strategicIntent;
  assert.ok(names.includes("Investigate Scout"), "the Clue producer is an engine piece");
  assert.ok(names.includes("Artifact Dispute"), "an artifact sacrifice spell is a Clue outlet");
  const angelRow = report.selected.rows.find((row) => row.name === "Angel Host");
  assert.equal(cardSatisfiesPackageCore(investigateScout, "tokens", intent), true);
  assert.equal(cardSatisfiesPackageCore(angelHost, "tokens", intent), false);
  if (angelRow) {
    assert.equal(cardSatisfiesPackageCore(angelRow, "tokens", intent), false, "an Angel factory must not occupy Clue tokens core");
  }
});
