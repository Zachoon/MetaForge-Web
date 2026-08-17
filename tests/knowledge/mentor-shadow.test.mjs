import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { explainCardAsMentor, explainPackageAsMentor, occupancySeatingForPackage, explainPairAsMentor, explainPairsForCardAsMentor, occupancyEngineLabelsForCommander, occupancyEngineLabelsForCommanders, buildMentorShadowReport } from "../../app/knowledge/mentor-shadow.mjs";

describe("Mentor Shadow v0", () => {
  it("explains seats without scores or Brain writes", () => {
    const explanation = explainCardAsMentor({
      cardName: "Teferi's Protection",
      commanderName: "Atraxa, Praetors' Voice",
      fantasyLabel: "Superfriends",
    });
    assert.equal(explanation.ok, true);
    assert.equal(explanation.writesToBrain, false);
    assert.ok(explanation.seats.includes("Commander Protection"));
    assert.doesNotMatch(explanation.paragraph, /score of|Protection score/i);
    assert.ok(explanation.mustNotSay.some((line) => /score/i.test(line)));
  });

  it("builds a shadow report for multiple cards", () => {
    const report = buildMentorShadowReport({
      cardNames: ["Lightning Greaves", "Force of Will", "Doubling Season"],
      commanderName: "Atraxa, Praetors' Voice",
      fantasyLabel: "Superfriends",
      commissionMismatch: true,
      limit: 3,
    });
    assert.equal(report.status, "first_embodiment");
    assert.equal(report.explanations.length, 3);
    assert.equal(report.brainInheritance, "none");
  });

  it("names a Clue engine without calling it a generic go-wide tokens deck", () => {
    const explanation = explainCardAsMentor({
      cardName: "Investigate Scout",
      oracleText: "When this enters, investigate.",
      commanderName: "Clue Oligarch",
      activeResources: ["clue"],
    });
    assert.equal(explanation.writesToBrain, false);
    assert.equal(explanation.resourceSeating[0].resource, "clue");
    assert.match(explanation.paragraph, /Clue Engine Piece/);
    assert.match(explanation.paragraph, /not evidence of a generic go-wide tokens plan/);
  });

  it("names a Dwarf typal engine without calling it generic tokens, and rejects Hojo", () => {
    const lord = explainCardAsMentor({
      cardName: "Dwarf Lord",
      oracleText: "Dwarf creatures you control get +1/+1.",
      typeLine: "Legendary Creature — Dwarf Noble",
    });
    assert.equal(lord.writesToBrain, false);
    assert.ok(lord.typalSeating.some((row) => row.kind === "engine"));
    assert.match(lord.paragraph, /Typal Engine/);
    assert.match(lord.paragraph, /not a false-open and not generic tokens/);

    const hojo = explainCardAsMentor({
      cardName: "Professor Hojo",
      oracleText: "Whenever one or more creatures you control become the target of an activated ability, draw a card.",
      typeLine: "Legendary Creature — Human Scientist",
    });
    assert.deepEqual(hojo.typalSeating, []);

    const kediss = explainCardAsMentor({
      cardName: "Emberclaw",
      oracleText: "Whenever a commander you control deals combat damage to an opponent, it deals that much damage to each other opponent.",
      typeLine: "Legendary Creature — Elemental Lizard",
    });
    assert.deepEqual(kediss.typalSeating, []);
  });

  it("names an aristocrats engine without calling it generic tokens, and rejects artifact-sac", () => {
    const king = explainCardAsMentor({
      cardName: "Sacrifice King",
      oracleText: "Whenever this enters or attacks, sacrifice another permanent. Whenever you sacrifice a permanent, draw a card.",
    });
    assert.equal(king.writesToBrain, false);
    assert.equal(king.aristocratsSeating[0].kind, "aristocrats_engine");
    assert.match(king.paragraph, /Aristocrats Engine/);
    assert.match(king.paragraph, /not artifact-sac and not generic tokens/);

    const outlaw = explainCardAsMentor({
      cardName: "Artifact Outlaw",
      oracleText: "Sacrifice an artifact: Create a Treasure token.",
    });
    assert.deepEqual(outlaw.aristocratsSeating, []);
  });

  it("names a spellslinger engine without calling it generic tokens, and rejects draw-damage", () => {
    const parun = explainCardAsMentor({
      cardName: "Player Cast Dragon",
      oracleText: "Whenever a player casts an instant or sorcery spell, you may draw a card.",
    });
    assert.equal(parun.writesToBrain, false);
    assert.equal(parun.spellslingerSeating[0].kind, "spellslinger_engine");
    assert.match(parun.paragraph, /Spellslinger Engine/);
    assert.match(parun.paragraph, /not draw-damage and not generic tokens/);

    const burn = explainCardAsMentor({
      cardName: "Draw Burn",
      oracleText: "Whenever you draw a card, this deals 1 damage to any target.",
    });
    assert.deepEqual(burn.spellslingerSeating, []);
  });

  it("names reanimator, landfall, and stax engines without calling them generic tokens", () => {
    const meren = explainCardAsMentor({
      cardName: "Grave Recruiter",
      oracleText: "Whenever another creature you control dies, return target creature card from your graveyard to the battlefield.",
    });
    assert.equal(meren.writesToBrain, false);
    assert.equal(meren.reanimatorSeating[0].kind, "reanimator_engine");
    assert.match(meren.paragraph, /Reanimator Engine/);
    assert.match(meren.paragraph, /not mill dump and not dredge-to-hand/);

    const aesi = explainCardAsMentor({
      cardName: "Land Titan",
      oracleText: "Landfall — Whenever a land you control enters, draw a card.",
    });
    assert.equal(aesi.landfallOccupancySeating[0].kind, "landfall_engine");
    assert.match(aesi.paragraph, /Landfall Engine/);

    const arbiter = explainCardAsMentor({
      cardName: "Tax Collector",
      oracleText: "Spells your opponents cast cost {1} more to cast.",
    });
    assert.equal(arbiter.staxSeating[0].kind, "stax_engine");
    assert.match(arbiter.paragraph, /Stax Engine/);
    assert.match(arbiter.paragraph, /not each-player draws and not generic tokens/);

    const hug = explainCardAsMentor({
      cardName: "Group Hug",
      oracleText: "Each player draws a card.",
    });
    assert.deepEqual(hug.staxSeating, []);
  });

  it("names auras, equipment, and blink engines without calling them generic tokens", () => {
    const paws = explainCardAsMentor({
      cardName: "Aura Voice",
      oracleText: "Whenever an Aura you control becomes attached to a creature you control, draw a card.",
    });
    assert.equal(paws.writesToBrain, false);
    assert.equal(paws.aurasOccupancySeating[0].kind, "auras_engine");
    assert.match(paws.paragraph, /Auras Engine/);

    const akiri = explainCardAsMentor({
      cardName: "Line Slinger",
      oracleText: "Whenever an equipped creature you control attacks, put a +1/+1 counter on it.",
    });
    assert.equal(akiri.equipmentOccupancySeating[0].kind, "equipment_engine");
    assert.match(akiri.paragraph, /Equipment Engine/);

    const flicker = explainCardAsMentor({
      cardName: "Blink Mage",
      oracleText: "Exile target creature you control, then return it to the battlefield.",
    });
    assert.equal(flicker.blinkSeating[0].kind, "blink_engine");
    assert.match(flicker.paragraph, /Blink Engine/);
  });

  it("names a tokens occupancy engine and keeps Magda-class and Chatterfang closed", () => {
    const foundry = explainCardAsMentor({
      cardName: "Token Foundry",
      oracleText: "At the beginning of combat on your turn, create a 1/1 white Citizen creature token.",
    });
    assert.equal(foundry.writesToBrain, false);
    assert.equal(foundry.tokensOccupancySeating[0].kind, "tokens_engine");
    assert.match(foundry.paragraph, /Tokens Engine/);
    assert.match(foundry.paragraph, /not a lone named-artifact-token-sac create/);

    const magda = explainCardAsMentor({
      cardName: "Magda Shape",
      oracleText: "Other Dwarves you control have haste. Sacrifice five Treasures: Create a 4/4 red Dragon creature token with flying.",
    });
    assert.deepEqual(magda.tokensOccupancySeating, []);

    const chatterfang = explainCardAsMentor({
      cardName: "Chatterfang Shape",
      oracleText: "If one or more tokens would be created under your control, those tokens plus that many 1/1 green Squirrel creature tokens are created instead.",
    });
    assert.deepEqual(chatterfang.tokensOccupancySeating, []);
  });

  it("names Spellslinger Engine before oversaturated health strain", () => {
    const explanation = explainPackageAsMentor({
      packageState: {
        id: "spellslinger",
        label: "Spellslinger",
        legs: {},
        anchors: [],
        curve: {},
        interactionDensity: 1,
        commanderContribution: 1,
        slotCost: 22,
        weaklyJustified: 0,
        redundancy: 0,
        density: { core: 22, floor: 14, surplus: 8, deficit: 0 },
      },
      commanderName: "Player Cast Dragon",
      commanderOracleText: "Whenever a player casts an instant or sorcery spell, you may draw a card.",
    });
    assert.equal(explanation.ok, true);
    assert.equal(explanation.writesToBrain, false);
    assert.equal(explanation.occupancySeating[0].kind, "spellslinger_engine");
    assert.equal(explanation.packageHealthSeating[0].kind, "oversaturated");
    assert.match(explanation.paragraph, /Spellslinger Engine/);
    assert.match(explanation.paragraph, /Oversaturated Package/);
    assert.match(explanation.vacancyRisk, /health strain is commentary, not a reason to close occupancy/);
    assert.doesNotMatch(explanation.paragraph, /this package should not be open|cohesion score|Brain selected/i);
    assert.ok(explanation.mustNotSay.some((line) => /cohesion score/i.test(line)));
  });

  it("names underfilled tokens strain without proposing a new floor", () => {
    const explanation = explainPackageAsMentor({
      packageState: {
        id: "tokens",
        label: "Tokens",
        legs: {},
        anchors: [],
        curve: {},
        interactionDensity: 1,
        commanderContribution: 1,
        slotCost: 12,
        weaklyJustified: 0,
        redundancy: 0,
        density: { core: 4, floor: 10, surplus: 0, deficit: 6 },
      },
      commanderName: "Token Foundry",
      commanderOracleText: "At the beginning of combat on your turn, create a 1/1 white Citizen creature token.",
    });
    assert.equal(explanation.ok, true);
    assert.equal(explanation.writesToBrain, false);
    assert.equal(explanation.occupancySeating[0].kind, "tokens_engine");
    assert.equal(explanation.packageHealthSeating[0].kind, "underfilled");
    assert.match(explanation.paragraph, /Tokens Engine/);
    assert.match(explanation.paragraph, /Underfilled Package/);
    assert.doesNotMatch(explanation.paragraph, /new floor|raise the floor|singletonCore|constructedCore|coreMin/i);
    assert.match(explanation.vacancyRisk, /health strain is commentary/);
  });

  it("binds occupancy to the package being explained, not the first engine on the commander", () => {
    const oracle = "Other Goblins you control get +1/+1. At the beginning of combat on your turn, create a 1/1 red Goblin creature token.";
    const card = { name: "Goblin Foundry", oracleText: oracle };
    assert.equal(occupancySeatingForPackage("typal", card)[0].kind, "engine");
    assert.equal(occupancySeatingForPackage("tokens", card)[0].kind, "tokens_engine");
    assert.deepEqual(occupancySeatingForPackage("spellslinger", card), []);

    const tokensOnSlinger = explainPackageAsMentor({
      packageState: {
        id: "tokens",
        label: "Tokens",
        legs: {},
        anchors: [],
        curve: {},
        interactionDensity: 1,
        commanderContribution: 1,
        slotCost: 12,
        weaklyJustified: 0,
        redundancy: 0,
        density: { core: 4, floor: 10, surplus: 0, deficit: 6 },
      },
      commanderName: "Player Cast Dragon",
      commanderOracleText: "Whenever a player casts an instant or sorcery spell, you may draw a card.",
    });
    assert.deepEqual(tokensOnSlinger.occupancySeating, []);
    assert.equal(tokensOnSlinger.commentary, "");
    assert.match(tokensOnSlinger.paragraph, /Atlas has no occupancy engine seat/);
    assert.doesNotMatch(tokensOnSlinger.paragraph, /Tokens Engine/);
  });

  it("exposes occupancy-first health commentary without a cohesion score", () => {
    const explanation = explainPackageAsMentor({
      packageState: {
        id: "spellslinger",
        label: "Spellslinger",
        legs: {},
        anchors: [],
        curve: {},
        interactionDensity: 1,
        commanderContribution: 1,
        slotCost: 22,
        weaklyJustified: 0,
        redundancy: 0,
        density: { core: 22, floor: 14, surplus: 8, deficit: 0 },
      },
      commanderName: "Player Cast Dragon",
      commanderOracleText: "Whenever a player casts an instant or sorcery spell, you may draw a card.",
    });
    assert.match(explanation.commentary, /Oversaturated Package/);
    assert.match(explanation.commentary, /health strain is commentary/);
    assert.doesNotMatch(explanation.commentary, /cohesion score|score of/i);
  });








  it("names rummage as a hand filter, not net draw", () => {
    const explanation = explainCardAsMentor({
      cardName: "Faithless Looting",
      oracleText: "Draw two cards, then discard two cards.",
    });
    assert.equal(explanation.writesToBrain, false);
    assert.equal(explanation.selectionSeating[0].kind, "rummage");
    assert.match(explanation.paragraph, /Rummage Filter/);
    assert.match(explanation.paragraph, /not net draw/);
  });

  it("names scry as library selection, not mill", () => {
    const explanation = explainCardAsMentor({
      cardName: "Preordain",
      oracleText: "Scry 2, then draw a card.",
    });
    assert.equal(explanation.selectionSeating.some((row) => row.kind === "scry"), true);
    assert.match(explanation.paragraph, /Scry Filter/);
    assert.match(explanation.paragraph, /not mill/);
  });

  it("names mill as a graveyard dump, not surveil", () => {
    const explanation = explainCardAsMentor({
      cardName: "Tome Scour",
      oracleText: "Target player mills two cards.",
    });
    assert.equal(explanation.writesToBrain, false);
    assert.equal(explanation.graveyardSeating[0].kind, "mill");
    assert.match(explanation.paragraph, /Mill Dump/);
    assert.match(explanation.paragraph, /not surveil/);
    assert.doesNotMatch(explanation.paragraph, /Surveil Filter/);
    assert.doesNotMatch(explanation.paragraph, /Dredge Recursion/);
  });

  it("names dredge as graveyard recursion, not a mill dump", () => {
    const explanation = explainCardAsMentor({
      cardName: "Golgari Grave-Troll",
      oracleText: "Dredge 6 (If you would draw a card, you may mill six cards instead. If you do, return this card from your graveyard to your hand.)",
    });
    assert.equal(explanation.writesToBrain, false);
    assert.equal(explanation.graveyardSeating.length, 1);
    assert.equal(explanation.graveyardSeating[0].kind, "dredge");
    assert.match(explanation.paragraph, /Dredge Recursion/);
    assert.match(explanation.paragraph, /not mill/);
    assert.doesNotMatch(explanation.paragraph, /Mill Dump/);
    assert.doesNotMatch(explanation.paragraph, /Surveil Filter/);
    assert.doesNotMatch(explanation.paragraph, /Net Draw/);
  });

  it("names flashback, unearth, and escape as graveyard returns, not a mill dump or dredge-to-hand", () => {
    const flashback = explainCardAsMentor({
      cardName: "Faithless Looting",
      oracleText: "Draw two cards, then discard two cards. Flashback {2}{R} (You may cast this card from your graveyard for its flashback cost. Then exile it.)",
    });
    assert.equal(flashback.writesToBrain, false);
    assert.equal(flashback.graveyardSeating[0].kind, "flashback");
    assert.match(flashback.paragraph, /Flashback Recast/);
    assert.match(flashback.paragraph, /not dredge-to-hand/);
    assert.doesNotMatch(flashback.paragraph, /Mill Dump/);
    assert.doesNotMatch(flashback.paragraph, /Dredge Recursion/);

    const unearth = explainCardAsMentor({
      cardName: "Reassembling Skeleton",
      oracleText: "Unearth {1}{B} (Pay {1}{B}: Return this card from your graveyard to the battlefield. Sacrifice it at the beginning of the next end step. Unearth only as a sorcery.)",
    });
    assert.equal(unearth.graveyardSeating[0].kind, "unearth");
    assert.match(unearth.paragraph, /Unearth Return/);
    assert.match(unearth.paragraph, /not permanent reanimation/);

    const escape = explainCardAsMentor({
      cardName: "Uro, Titan of Nature's Wrath",
      oracleText: "Escape—{4}{G}{U}, Exile five other cards from your graveyard. (You may cast this card from your graveyard for its escape cost. Then exile it.)",
    });
    assert.equal(escape.graveyardSeating[0].kind, "escape");
    assert.match(escape.paragraph, /Escape Recast/);
    assert.match(escape.paragraph, /not dredge-to-hand/);
  });


  it("names persist, undying, and jump-start as graveyard kinds", () => {
    const persist = explainCardAsMentor({ cardName: "Kitchen Finks", oracleText: "Persist" });
    assert.equal(persist.graveyardSeating[0].kind, "persist");
    assert.match(persist.paragraph, /Persist Return/);
    const undying = explainCardAsMentor({ cardName: "Young Wolf", oracleText: "Undying" });
    assert.equal(undying.graveyardSeating[0].kind, "undying");
    assert.match(undying.paragraph, /Undying Return/);
    const jump = explainCardAsMentor({ cardName: "Direct Current", oracleText: "Jump-start" });
    assert.equal(jump.graveyardSeating[0].kind, "jump_start");
    assert.match(jump.paragraph, /Jump-Start Recast/);
  });


  it("names aftermath, madness, and retrace as graveyard kinds", () => {
    const aftermath = explainCardAsMentor({ cardName: "Toil", oracleText: "Aftermath" });
    assert.equal(aftermath.graveyardSeating[0].kind, "aftermath");
    assert.match(aftermath.paragraph, /Aftermath Recast/);
    const madness = explainCardAsMentor({ cardName: "Basking Rootwalla", oracleText: "Madness {1}{G}" });
    assert.equal(madness.graveyardSeating[0].kind, "madness");
    assert.match(madness.paragraph, /Madness Recast/);
    const retrace = explainCardAsMentor({ cardName: "Raven's Crime", oracleText: "Retrace" });
    assert.equal(retrace.graveyardSeating[0].kind, "retrace");
    assert.match(retrace.paragraph, /Retrace Recast/);
  });

  it("names disturb, embalm, and eternalize as graveyard kinds", () => {
    const disturb = explainCardAsMentor({ cardName: "Beloved Princess", oracleText: "Disturb {1}{W}" });
    assert.equal(disturb.graveyardSeating[0].kind, "disturb");
    assert.match(disturb.paragraph, /Disturb Recast/);
    const embalm = explainCardAsMentor({ cardName: "Trueheart Duelist", oracleText: "Embalm {3}{W}" });
    assert.equal(embalm.graveyardSeating[0].kind, "embalm");
    assert.match(embalm.paragraph, /Embalm Token/);
    const eternalize = explainCardAsMentor({ cardName: "Champion of Wits", oracleText: "Eternalize {4}{U}{U}" });
    assert.equal(eternalize.graveyardSeating[0].kind, "eternalize");
    assert.match(eternalize.paragraph, /Eternalize Token/);
  });

  it("names outlet, death payoff, and incidental yard, not a mill dump", () => {
    const outlet = explainCardAsMentor({
      cardName: "Viscera Seer",
      oracleText: "Sacrifice a creature: Scry 1.",
    });
    assert.equal(outlet.writesToBrain, false);
    assert.equal(outlet.sacrificeSeating[0].kind, "outlet");
    assert.match(outlet.paragraph, /Sacrifice Outlet/);
    assert.match(outlet.paragraph, /not a death payoff/);

    const deathPayoff = explainCardAsMentor({
      cardName: "Blood Artist",
      oracleText: "Whenever Blood Artist or another creature dies, target player loses 1 life and you gain 1 life.",
    });
    assert.equal(deathPayoff.sacrificeSeating[0].kind, "death_payoff");
    assert.match(deathPayoff.paragraph, /Death Payoff/);
    assert.match(deathPayoff.paragraph, /not a sacrifice outlet/);

    const incidental = explainCardAsMentor({
      cardName: "Merchant of the Vale",
      oracleText: "{1}, Sacrifice a Clue: Draw a card.",
    });
    assert.equal(incidental.sacrificeSeating[0].kind, "incidental_yard");
    assert.match(incidental.paragraph, /Incidental Yard/);
    assert.match(incidental.paragraph, /not a mill dump/);
    assert.doesNotMatch(incidental.paragraph, /Mill Dump/);
  });

  it("names enter and cast as a card's own trigger condition, not blink/flicker or spellslinger occupancy", () => {
    const enter = explainCardAsMentor({
      cardName: "Bauble",
      oracleText: "When this enters the battlefield, draw a card.",
    });
    assert.equal(enter.writesToBrain, false);
    assert.equal(enter.triggerSeating[0].kind, "enter");
    assert.match(enter.paragraph, /Enter Trigger/);
    assert.match(enter.paragraph, /not a blink\/flicker effect/);

    const cast = explainCardAsMentor({
      cardName: "Prowess Creature",
      oracleText: "Whenever you cast an instant or sorcery spell, draw a card.",
    });
    assert.equal(cast.triggerSeating[0].kind, "cast");
    assert.match(cast.paragraph, /Cast Trigger/);
    assert.match(cast.paragraph, /not spellslinger construction occupancy/);
  });

  it("names attack as a third trigger kind, not extra-combat amplification or stax occupancy", () => {
    const attack = explainCardAsMentor({
      cardName: "Bloodthirsty Aerialist",
      oracleText: "Whenever this creature attacks, draw a card.",
    });
    assert.equal(attack.writesToBrain, false);
    assert.equal(attack.triggerSeating[0].kind, "attack");
    assert.match(attack.paragraph, /Attack Trigger/);
    assert.match(attack.paragraph, /not extra-combat amplification or stax construction occupancy/);
  });

  it("names combat damage as a fourth trigger kind, not an Attack Trigger or extra-combat amplification", () => {
    const combatDamage = explainCardAsMentor({
      cardName: "Silent-Blade Oni",
      oracleText: "Whenever this creature deals combat damage to a player, create a Treasure token.",
    });
    assert.equal(combatDamage.writesToBrain, false);
    assert.equal(combatDamage.triggerSeating[0].kind, "combat_damage");
    assert.match(combatDamage.paragraph, /Combat Damage Trigger/);
    assert.match(combatDamage.paragraph, /not an Attack Trigger or extra-combat amplification/);
  });

  it("names noncombat damage as a fifth trigger kind, not a Combat Damage Trigger or extra-combat amplification", () => {
    const damage = explainCardAsMentor({
      cardName: "Firebrand Archer",
      oracleText: "Whenever this creature deals damage to a player, draw a card.",
    });
    assert.equal(damage.writesToBrain, false);
    assert.equal(damage.triggerSeating[0].kind, "noncombat_damage");
    assert.match(damage.paragraph, /Damage Trigger/);
    assert.match(damage.paragraph, /not a Combat Damage Trigger or extra-combat amplification/);
  });

  it("names put, proliferate, and remove, splitting the blended counters signal", () => {
    const put = explainCardAsMentor({
      cardName: "Hardened Scales",
      oracleText: "If one or more +1/+1 counters would be put on a creature you control, that many plus one +1/+1 counters are put on it instead.",
    });
    assert.equal(put.writesToBrain, false);
    assert.equal(put.counterSeating[0].kind, "put");
    assert.match(put.paragraph, /Counter Placement/);
    assert.match(put.paragraph, /not proliferate/);

    const proliferate = explainCardAsMentor({
      cardName: "Evolution Sage",
      oracleText: "Landfall — Whenever a land enters the battlefield under your control, proliferate.",
    });
    assert.equal(proliferate.counterSeating[0].kind, "proliferate");
    assert.match(proliferate.paragraph, /Proliferate Effect/);
    assert.match(proliferate.paragraph, /not a single counter placement/);

    const remove = explainCardAsMentor({
      cardName: "Hapatra, Vizier of Poisons",
      oracleText: "Remove a -1/-1 counter from a creature you control: Create a 1/1 black Snake creature token.",
    });
    assert.equal(remove.counterSeating[0].kind, "remove");
    assert.match(remove.paragraph, /Counter Removal/);
    assert.match(remove.paragraph, /not counter placement or proliferate/);
  });

  it("names gain, lifelink, and pay, splitting the blended life signal", () => {
    const gain = explainCardAsMentor({
      cardName: "Soul Warden",
      oracleText: "Whenever another creature enters the battlefield, you gain 1 life.",
    });
    assert.equal(gain.writesToBrain, false);
    assert.equal(gain.lifeSeating[0].kind, "gain");
    assert.match(gain.paragraph, /Life Gain/);
    assert.match(gain.paragraph, /not lifelink or a whenever-you-gain-life payoff/);

    const lifelink = explainCardAsMentor({
      cardName: "Vampire Nighthawk",
      oracleText: "Lifelink (Damage dealt by this creature also causes you to gain that much life.)",
    });
    assert.equal(lifelink.lifeSeating[0].kind, "lifelink");
    assert.match(lifelink.paragraph, /Lifelink/);
    assert.match(lifelink.paragraph, /not a lifegain spell/);

    const pay = explainCardAsMentor({
      cardName: "Necropotence",
      oracleText: "Pay 1 life: Exile the top card of your library face down.",
    });
    assert.equal(pay.lifeSeating[0].kind, "pay");
    assert.match(pay.paragraph, /Life Payment/);
    assert.match(pay.paragraph, /not gaining life or opponents losing life/);
  });

  it("names hexproof, indestructible, and ward, splitting the blended protection signal", () => {
    const hexproof = explainCardAsMentor({
      cardName: "Swiftfoot Boots",
      oracleText: "Equipped creature has hexproof and haste.",
    });
    assert.equal(hexproof.writesToBrain, false);
    assert.equal(hexproof.protectionSeating[0].kind, "hexproof");
    assert.match(hexproof.paragraph, /Hexproof/);
    assert.match(hexproof.paragraph, /not indestructible or ward/);

    const indestructible = explainCardAsMentor({
      cardName: "Darksteel Plate",
      oracleText: "Equipped creature has indestructible.",
    });
    assert.equal(indestructible.protectionSeating[0].kind, "indestructible");
    assert.match(indestructible.paragraph, /Indestructible/);
    assert.match(indestructible.paragraph, /not hexproof or ward/);

    const ward = explainCardAsMentor({
      cardName: "Slippery Bogbonder",
      oracleText: "Ward {2} (Whenever this creature becomes the target of a spell or ability an opponent controls, counter it unless that player pays {2}.)",
    });
    assert.equal(ward.protectionSeating[0].kind, "ward");
    assert.match(ward.paragraph, /Ward/);
    assert.match(ward.paragraph, /not hexproof or indestructible/);
  });


  it("names shroud, protection-from, and phase-out as protection kinds", () => {
    const shroud = explainCardAsMentor({ cardName: "Whispersilk Cloak", oracleText: "Equipped creature has shroud." });
    assert.equal(shroud.protectionSeating.some((row) => row.kind === "shroud"), true);
    assert.match(shroud.paragraph, /Shroud/);
    const from = explainCardAsMentor({ cardName: "Mother of Runes", oracleText: "Protection from the color of your choice." });
    assert.equal(from.protectionSeating[0].kind, "protection_from");
    assert.match(from.paragraph, /Protection From/);
    const phase = explainCardAsMentor({ cardName: "Teferi's Veil", oracleText: "Permanents you control phase out." });
    assert.equal(phase.protectionSeating[0].kind, "phase_out");
    assert.match(phase.paragraph, /Phase Out/);
  });

  it("names flying, menace, and trample, splitting the blended evasion signal", () => {
    const flying = explainCardAsMentor({ cardName: "Storm Crow", oracleText: "Flying" });
    assert.equal(flying.writesToBrain, false);
    assert.equal(flying.evasionSeating[0].kind, "flying");
    assert.match(flying.paragraph, /Flying/);
    assert.match(flying.paragraph, /not menace or trample/);

    const menace = explainCardAsMentor({ cardName: "Boggart Brute", oracleText: "Menace" });
    assert.equal(menace.evasionSeating[0].kind, "menace");
    assert.match(menace.paragraph, /Menace/);

    const trample = explainCardAsMentor({ cardName: "Craw Wurm", oracleText: "Trample" });
    assert.equal(trample.evasionSeating[0].kind, "trample");
    assert.match(trample.paragraph, /Trample/);
  });


  it("names unblockable, skulk, and reach as evasion kinds", () => {
    const unblockable = explainCardAsMentor({ cardName: "Rogue's Passage", oracleText: "Target creature can't be blocked this turn." });
    assert.equal(unblockable.evasionSeating[0].kind, "unblockable");
    assert.match(unblockable.paragraph, /Unblockable/);
    const skulk = explainCardAsMentor({ cardName: "Deadly Visit", oracleText: "Skulk" });
    assert.equal(skulk.evasionSeating[0].kind, "skulk");
    assert.match(skulk.paragraph, /Skulk/);
    const reach = explainCardAsMentor({ cardName: "Giant Spider", oracleText: "Reach" });
    assert.equal(reach.evasionSeating[0].kind, "reach");
    assert.match(reach.paragraph, /Reach/);
  });


  it("names fear, shadow, and intimidate as evasion kinds", () => {
    const fear = explainCardAsMentor({ cardName: "Fear Beast", oracleText: "Fear" });
    assert.equal(fear.evasionSeating[0].kind, "fear");
    assert.match(fear.paragraph, /Fear/);
    const shadow = explainCardAsMentor({ cardName: "Dauthi Horror", oracleText: "Shadow" });
    assert.equal(shadow.evasionSeating[0].kind, "shadow");
    assert.match(shadow.paragraph, /Shadow/);
    const intimidate = explainCardAsMentor({ cardName: "Intimidate Beast", oracleText: "Intimidate" });
    assert.equal(intimidate.evasionSeating[0].kind, "intimidate");
    assert.match(intimidate.paragraph, /Intimidate/);
  });

  it("names landfall, extra land drop, and land search, splitting the blended lands signal", () => {
    const landfall = explainCardAsMentor({
      cardName: "Lotus Cobra",
      oracleText: "Landfall — Whenever a land you control enters, add {G}.",
    });
    assert.equal(landfall.landSeating[0].kind, "landfall");
    assert.match(landfall.paragraph, /Landfall/);
    assert.match(landfall.paragraph, /not an extra land drop or a land search/);

    const extra = explainCardAsMentor({
      cardName: "Exploration",
      oracleText: "You may play an additional land on each of your turns.",
    });
    assert.equal(extra.landSeating[0].kind, "extra_drop");
    assert.match(extra.paragraph, /Extra Land Drop/);

    const search = explainCardAsMentor({
      cardName: "Rampant Growth",
      oracleText: "Search your library for a basic land card, put it onto the battlefield tapped, then shuffle.",
    });
    assert.equal(search.landSeating[0].kind, "search");
    assert.match(search.paragraph, /Land Search/);
  });

  it("names artifact spell, matters, and outlet, splitting the blended artifacts signal", () => {
    const spell = explainCardAsMentor({
      cardName: "Sai, Master Thopterist",
      oracleText: "Whenever you cast an artifact spell, draw a card.",
    });
    assert.equal(spell.artifactSeating[0].kind, "spell");
    assert.match(spell.paragraph, /Artifact Spell/);
    assert.match(spell.paragraph, /not artifacts-you-control or an artifact outlet/);

    const matters = explainCardAsMentor({
      cardName: "Tempered Steel",
      oracleText: "Artifact creatures you control get +1/+1.",
    });
    assert.equal(matters.artifactSeating[0].kind, "matters");
    assert.match(matters.paragraph, /Artifact Matters/);

    const outlet = explainCardAsMentor({
      cardName: "Krark-Clan Ironworks",
      oracleText: "Sacrifice an artifact: Add {C}{C}.",
    });
    assert.equal(outlet.artifactSeating[0].kind, "outlet");
    assert.match(outlet.paragraph, /Artifact Outlet/);
  });

  it("names token create, go-wide, and sac, splitting the blended tokens signal", () => {
    const create = explainCardAsMentor({ cardName: "Raise the Alarm", oracleText: "Create a 1/1 white Soldier creature token." });
    assert.equal(create.tokenSeating[0].kind, "create");
    assert.match(create.paragraph, /Token Create/);
    const goWide = explainCardAsMentor({ cardName: "Intangible Virtue", oracleText: "Creature tokens you control get +1/+1." });
    assert.equal(goWide.tokenSeating[0].kind, "go_wide");
    assert.match(goWide.paragraph, /Token Go-Wide/);
    const sac = explainCardAsMentor({ cardName: "Token Altar", oracleText: "Sacrifice a token: Add {C}{C}." });
    assert.equal(sac.tokenSeating[0].kind, "sac");
    assert.match(sac.paragraph, /Token Sac/);
  });

  it("names aura enchant, matters, and affinity, splitting the blended auras signal", () => {
    const enchant = explainCardAsMentor({ cardName: "Pacifism", oracleText: "Enchant creature" });
    assert.equal(enchant.auraSeating[0].kind, "enchant");
    assert.match(enchant.paragraph, /Aura Enchant/);
    const matters = explainCardAsMentor({ cardName: "Sphere of Safety", oracleText: "Auras you control get +1/+1." });
    assert.equal(matters.auraSeating[0].kind, "matters");
    const affinity = explainCardAsMentor({ cardName: "Pearl-Ear Scout", oracleText: "Affinity for Auras" });
    assert.equal(affinity.auraSeating[0].kind, "affinity");
    assert.match(affinity.paragraph, /Aura Affinity/);
  });

  it("names spell copy, free, and noncreature, splitting the blended spells signal", () => {
    const copy = explainCardAsMentor({ cardName: "Twincast", oracleText: "Copy target spell." });
    assert.equal(copy.spellSeating[0].kind, "copy");
    assert.match(copy.paragraph, /Spell Copy/);
    const free = explainCardAsMentor({ cardName: "Omniscience", oracleText: "You may cast that card without paying its mana cost." });
    assert.equal(free.spellSeating[0].kind, "free");
    assert.match(free.paragraph, /Free Spell/);
    const noncreature = explainCardAsMentor({ cardName: "Goblin Electromancer", oracleText: "Instant and sorcery spells you cast cost {1} less to cast." });
    assert.equal(noncreature.spellSeating[0].kind, "noncreature");
    assert.match(noncreature.paragraph, /Noncreature Spell/);
  });


  it("names storm, cascade, and rebound as spell kinds", () => {
    const storm = explainCardAsMentor({ cardName: "Grapeshot", oracleText: "Storm" });
    assert.equal(storm.spellSeating[0].kind, "storm");
    assert.match(storm.paragraph, /Storm/);
    const cascade = explainCardAsMentor({ cardName: "Bloodbraid Elf", oracleText: "Cascade" });
    assert.equal(cascade.spellSeating[0].kind, "cascade");
    assert.match(cascade.paragraph, /Cascade/);
    const rebound = explainCardAsMentor({ cardName: "Staggershock", oracleText: "Rebound" });
    assert.equal(rebound.spellSeating[0].kind, "rebound");
    assert.match(rebound.paragraph, /Rebound/);
  });

  it("names draw watch, wheel, and hand, splitting the blended draw signal", () => {
    const watch = explainCardAsMentor({ cardName: "Toothy", oracleText: "Whenever you draw a card, put a +1/+1 counter on this creature." });
    assert.equal(watch.drawSeating[0].kind, "watch");
    assert.match(watch.paragraph, /Draw Watch/);
    const wheel = explainCardAsMentor({ cardName: "Windfall", oracleText: "Each player discards their hand, then draws seven cards." });
    assert.equal(wheel.drawSeating[0].kind, "wheel");
    assert.match(wheel.paragraph, /Wheel/);
    const hand = explainCardAsMentor({ cardName: "Hand Size Beast", oracleText: "This creature gets +1/+1 for each card in your hand." });
    assert.equal(hand.drawSeating[0].kind, "hand");
    assert.match(hand.paragraph, /Hand Size/);
  });


  it("names damage deal, drain, and prevent", () => {
    const deal = explainCardAsMentor({ cardName: "Lightning Bolt", oracleText: "Lightning Bolt deals 3 damage to any target." });
    assert.equal(deal.damageSeating[0].kind, "deal");
    assert.match(deal.paragraph, /Damage Deal/);
    const drain = explainCardAsMentor({ cardName: "Gray Merchant", oracleText: "Each opponent loses 2 life." });
    assert.equal(drain.damageSeating[0].kind, "drain");
    assert.match(drain.paragraph, /Life Drain/);
    const prevent = explainCardAsMentor({ cardName: "Fog", oracleText: "Prevent all combat damage that would be dealt this turn." });
    assert.equal(prevent.damageSeating[0].kind, "prevent");
    assert.match(prevent.paragraph, /Damage Prevent/);
  });

  it("names equipment equip, attach, and bonus", () => {
    const equip = explainCardAsMentor({ cardName: "Colossus Hammer", oracleText: "Equip {8}" });
    assert.equal(equip.equipmentSeating[0].kind, "equip");
    assert.match(equip.paragraph, /Equip/);
    const attach = explainCardAsMentor({ cardName: "Attach Watcher", oracleText: "Whenever an Equipment becomes attached to a creature you control, draw a card." });
    assert.equal(attach.equipmentSeating[0].kind, "attach");
    const bonus = explainCardAsMentor({ cardName: "Bonesplitter", oracleText: "Equipped creature gets +2/+0." });
    assert.equal(bonus.equipmentSeating[0].kind, "bonus");
    assert.match(bonus.paragraph, /Equipped Bonus/);
  });

  it("names combat haste, extra, and vigilance", () => {
    const haste = explainCardAsMentor({ cardName: "Ball Lightning", oracleText: "Trample, haste" });
    assert.equal(haste.combatSeating[0].kind, "haste");
    assert.match(haste.paragraph, /Haste/);
    const extra = explainCardAsMentor({ cardName: "Aggravated Assault", oracleText: "After this main phase, there is an additional combat phase followed by an additional main phase." });
    assert.equal(extra.combatSeating[0].kind, "extra");
    assert.match(extra.paragraph, /Extra Combat/);
    const vigilance = explainCardAsMentor({ cardName: "Serra Angel", oracleText: "Flying, vigilance" });
    assert.equal(vigilance.combatSeating[0].kind, "vigilance");
    assert.match(vigilance.paragraph, /Vigilance/);
  });


  it("names first strike, double strike, and deathtouch as combat kinds", () => {
    const first = explainCardAsMentor({ cardName: "White Knight", oracleText: "First strike" });
    assert.equal(first.combatSeating[0].kind, "first_strike");
    assert.match(first.paragraph, /First Strike/);
    const dbl = explainCardAsMentor({ cardName: "Firesong", oracleText: "Double strike" });
    assert.equal(dbl.combatSeating[0].kind, "double_strike");
    assert.match(dbl.paragraph, /Double Strike/);
    const touch = explainCardAsMentor({ cardName: "Wasteland Viper", oracleText: "Deathtouch" });
    assert.equal(touch.combatSeating[0].kind, "deathtouch");
    assert.match(touch.paragraph, /Deathtouch/);
  });

  it("names a reset pair as a closed loop, not a verified infinite", () => {
    const explanation = explainPairAsMentor({
      left: { name: "Basalt Monolith", oracleText: "{T}: Add {C}{C}{C}. {3}: Untap this artifact." },
      right: { name: "Voltaic Key", oracleText: "{1}, {T}: Untap target artifact." },
    });
    assert.equal(explanation.ok, true);
    assert.equal(explanation.writesToBrain, false);
    assert.equal(explanation.loopSeating[0].kind, "closed_loop");
    assert.match(explanation.paragraph, /Reset Closed Loop/);
    assert.match(explanation.paragraph, /Artifact Untap Reset/);
    assert.match(explanation.paragraph, /Not a verified infinite/);
    assert.doesNotMatch(explanation.paragraph, /this combo wins/i);
  });

  it("names a graph engine pair without claiming it goes infinite", () => {
    const explanation = explainPairAsMentor({
      left: { name: "Token Herald" },
      right: { name: "Card Herald" },
      loopKind: "engine",
    });
    assert.equal(explanation.loopSeating[0].kind, "engine");
    assert.match(explanation.paragraph, /Mutual Engine/);
    assert.match(explanation.paragraph, /not a verified infinite/);
  });

  it("explains graph pairs that include the inspected card without claiming they go infinite", () => {
    const reset = {
      cards: ["Basalt Monolith", "Voltaic Key"],
      loopKind: "closed_loop",
      shape: "artifact_untap",
    };
    const engine = { cards: ["Token Herald", "Card Herald"], loopKind: "engine" };
    const oracleFor = (name) => ({
      "Basalt Monolith": "{T}: Add {C}{C}{C}. {3}: Untap this artifact.",
      "Voltaic Key": "{1}, {T}: Untap target artifact.",
    }[name] || "");

    const forBasalt = explainPairsForCardAsMentor({
      cardName: "Basalt Monolith",
      enginePairs: [engine],
      resetPairs: [reset],
      oracleFor,
      limit: 2,
    });
    assert.equal(forBasalt.length, 1);
    assert.equal(forBasalt[0].loopSeating[0].kind, "closed_loop");
    assert.match(forBasalt[0].paragraph, /Not a verified infinite/);
    assert.doesNotMatch(forBasalt[0].paragraph, /this combo wins/i);

    assert.deepEqual(occupancyEngineLabelsForCommander({
      name: "Goblin Foundry",
      oracleText: "Other Goblins you control get +1/+1. At the beginning of combat on your turn, create a 1/1 red Goblin creature token.",
    }), ["Typal Engine", "Tokens Engine"]);

    assert.deepEqual(explainPairsForCardAsMentor({
      cardName: "Unrelated Stone",
      enginePairs: [engine],
      resetPairs: [reset],
      oracleFor,
    }), []);
  });

  it("names occupancy engines from commander oracle before the 99 exists", () => {
    assert.deepEqual(occupancyEngineLabelsForCommander({
      name: "Aura Voice",
      typeLine: "Legendary Creature — Fox",
      oracleText: "Whenever an Aura you control becomes attached to a creature you control, draw a card.",
    }), ["Auras Engine"]);
    const magda = occupancyEngineLabelsForCommander({
      name: "Magda Shape",
      typeLine: "Legendary Creature — Dwarf Berserker",
      oracleText: "Other Dwarves you control have haste. Sacrifice five Treasures: Create a 4/4 red Dragon creature token with flying.",
    });
    assert.ok(!magda.includes("Tokens Engine"));
  });

  it("unions occupancy engines across partner commanders without inventing a shared score", () => {
    assert.deepEqual(occupancyEngineLabelsForCommanders([
      {
        name: "Aura Voice",
        oracleText: "Whenever an Aura you control becomes attached to a creature you control, draw a card.",
      },
      {
        name: "Token Foundry",
        oracleText: "At the beginning of combat on your turn, create a 1/1 white Citizen creature token.",
      },
    ]), ["Auras Engine", "Tokens Engine"]);
  });

});
