import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildAtlasVocabularyRegistry,
  seatsImplementedBy,
  cardsImplementingSeat,
  seatNamedResourceImplementation,
  seatTypalImplementation,
  seatAristocratsImplementation,
  seatSpellslingerImplementation,
  seatReanimatorImplementation,
  seatLandfallImplementation,
  seatStaxImplementation,
  seatSelectionImplementation,
  seatGraveyardImplementation,
  seatSacrificeImplementation,
  seatTriggerImplementation,
  seatCounterImplementation,
  seatLifeImplementation,
  seatProtectionImplementation,
  seatEvasionImplementation,
  seatLandImplementation,
  seatArtifactImplementation,
  seatTokenImplementation,
  seatAuraImplementation,
  seatSpellImplementation,
  seatDrawImplementation,
  seatDamageImplementation,
  seatEquipmentImplementation,
  seatCombatImplementation,
  seatLoopImplementation,
} from "../../app/knowledge/atlas-vocabulary.mjs";

describe("Atlas Vocabulary Registry v0", () => {
  it("ships stable core terms with zero Capability admissions and no coverageScore", () => {
    const registry = buildAtlasVocabularyRegistry();
    assert.equal(registry.writesToBrain, false);
    assert.equal(registry.ageOfVocabulary.complete, true);
    assert.ok(registry.summary.coreTermCount >= 10);
    assert.equal(registry.summary.capabilityAdmittedCount, 0);
    assert.equal(registry.summary.coverageScoreExists, false);
    assert.equal(registry.observation001.capabilityLabelsAdmitted, 0);
    assert.equal(registry.brainInheritance, "none");
  });

  it("supports seat equivalence without shared-card ranking", () => {
    assert.ok(seatsImplementedBy("Lightning Greaves").includes("Commander Protection"));
    const holders = cardsImplementingSeat("Commander Protection");
    assert.ok(holders.includes("Flawless Maneuver"));
    assert.ok(holders.includes("Lightning Greaves"));
    assert.ok(holders.includes("Skrelv, Defector Mite"));
  });

  it("seats the closed named-resource vocabulary without admitting Capabilities", () => {
    const registry = buildAtlasVocabularyRegistry();
    assert.equal(registry.summary.namedResourceSeatCount, 8);
    assert.equal(registry.summary.capabilityAdmittedCount, 0);
    assert.ok(registry.namedResourceSeats.every((row) => row.writesToBrain === false && row.capability.atlasAdmitted === false));

    const clue = seatNamedResourceImplementation({ name: "Investigator", oracleText: "When this enters, investigate." });
    assert.deepEqual(clue[0].implementation.roles, ["producer"]);
    assert.equal(clue[0].seat.label, "Clue Engine Piece");

    const outlet = seatNamedResourceImplementation(
      { name: "Dispute", oracleText: "Sacrifice an artifact: Draw two cards." },
      { activeResources: ["clue"] },
    );
    assert.deepEqual(outlet[0].implementation.roles, ["generic_artifact_outlet"]);
    assert.equal(outlet[0].resource, "clue");

    const angel = seatNamedResourceImplementation({ name: "Angel Host", oracleText: "Create a 4/4 white Angel creature token with flying." });
    assert.deepEqual(angel, [], "generic creature tokens do not occupy a named-resource Atlas seat");
  });

  it("seats typal engine / member / mention from occupancy language without admitting Capabilities", () => {
    const registry = buildAtlasVocabularyRegistry();
    assert.equal(registry.summary.typalSeatCount, 3);
    assert.equal(registry.summary.capabilityAdmittedCount, 0);
    assert.ok(registry.revisions.some((row) => /typal engine \/ member \/ mention/i.test(row.change)));

    const lord = seatTypalImplementation({
      name: "Dwarf Lord",
      oracleText: "Dwarf creatures you control get +1/+1.",
      typeLine: "Legendary Creature — Dwarf Noble",
    });
    assert.ok(lord.some((row) => row.kind === "engine"));
    assert.ok(lord.some((row) => row.kind === "member"));
    assert.deepEqual(lord.find((row) => row.kind === "engine").tribes, ["dwarf"]);
    assert.equal(lord.find((row) => row.kind === "engine").capability.atlasAdmitted, false);

    const cub = seatTypalImplementation({
      name: "Bear Cub",
      oracleText: "Vigilance.",
      typeLine: "Creature — Bear",
    }, { tribalTypes: ["bear"] });
    assert.equal(cub[0].kind, "member");
    assert.equal(cub[0].seat.label, "Typal Member");

    const grenade = seatTypalImplementation({
      name: "Goblin Grenade",
      oracleText: "As an additional cost to cast this spell, sacrifice a Goblin.",
      typeLine: "Sorcery",
    }, { tribalTypes: ["goblin"] });
    assert.equal(grenade[0].kind, "mention");
    assert.equal(grenade[0].seat.label, "Typal Mention");

    const hojo = seatTypalImplementation({
      name: "Professor Hojo",
      oracleText: "Whenever one or more creatures you control become the target of an activated ability, draw a card.",
      typeLine: "Legendary Creature — Human Scientist",
    });
    assert.deepEqual(hojo, []);

    const minstrel = seatTypalImplementation({
      name: "The Wandering Minstrel",
      oracleText: "If you control five or more Towns, create a token. Other creatures you control get +X/+X, where X is the number of Towns you control.",
      typeLine: "Legendary Creature — Human Bard",
    });
    assert.deepEqual(minstrel, []);
  });

  it("seats an aristocrats engine from occupancy detect without admitting Capabilities", () => {
    const registry = buildAtlasVocabularyRegistry();
    assert.equal(registry.summary.aristocratsSeatCount, 1);
    assert.equal(registry.summary.capabilityAdmittedCount, 0);
    assert.ok(registry.revisions.some((row) => /aristocrats engine from occupancy detect/i.test(row.change)));

    const korvold = seatAristocratsImplementation({
      name: "Sacrifice King",
      oracleText: "Whenever this enters or attacks, sacrifice another permanent. Whenever you sacrifice a permanent, draw a card.",
    });
    assert.equal(korvold[0].kind, "aristocrats_engine");
    assert.equal(korvold[0].seat.label, "Aristocrats Engine");
    assert.equal(korvold[0].capability.atlasAdmitted, false);

    const chatterfang = seatAristocratsImplementation({
      name: "Squirrel General",
      oracleText: "If one or more tokens would be created under your control, those tokens plus that many 1/1 green Squirrel creature tokens are created instead. {B}, Sacrifice X Squirrels: Target creature gets +X/-X until end of turn.",
    });
    assert.equal(chatterfang[0].kind, "aristocrats_engine");

    const magda = seatAristocratsImplementation({
      name: "Artifact Outlaw",
      oracleText: "Sacrifice an artifact: Create a Treasure token.",
    });
    assert.deepEqual(magda, []);

    const food = seatAristocratsImplementation({
      name: "Food Payoff",
      oracleText: "Whenever you sacrifice a Food, gain 3 life.",
    });
    assert.deepEqual(food, []);
  });

  it("seats a spellslinger engine from occupancy detect without admitting Capabilities", () => {
    const registry = buildAtlasVocabularyRegistry();
    assert.equal(registry.summary.spellslingerSeatCount, 1);
    assert.equal(registry.summary.capabilityAdmittedCount, 0);
    assert.ok(registry.revisions.some((row) => /spellslinger engine from occupancy detect/i.test(row.change)));

    const parun = seatSpellslingerImplementation({
      name: "Player Cast Dragon",
      oracleText: "Whenever a player casts an instant or sorcery spell, you may draw a card.",
    });
    assert.equal(parun[0].kind, "spellslinger_engine");
    assert.equal(parun[0].seat.label, "Spellslinger Engine");
    assert.equal(parun[0].capability.atlasAdmitted, false);

    const stella = seatSpellslingerImplementation({
      name: "Copy Mage",
      oracleText: "{T}: Copy target instant or sorcery spell you control.",
    });
    assert.equal(stella[0].kind, "spellslinger_engine");

    const drawBurn = seatSpellslingerImplementation({
      name: "Draw Burn",
      oracleText: "Whenever you draw a card, this deals 1 damage to any target.",
    });
    assert.deepEqual(drawBurn, []);
  });

  it("seats reanimator, landfall, and stax engines from occupancy detect without admitting Capabilities", () => {
    const registry = buildAtlasVocabularyRegistry();
    assert.equal(registry.summary.reanimatorSeatCount, 1);
    assert.equal(registry.summary.landfallOccupancySeatCount, 1);
    assert.equal(registry.summary.staxSeatCount, 1);
    assert.equal(registry.summary.capabilityAdmittedCount, 0);
    assert.ok(registry.revisions.some((row) => /reanimator \/ landfall \/ stax engines from occupancy detect/i.test(row.change)));

    const meren = seatReanimatorImplementation({
      name: "Grave Recruiter",
      oracleText: "Whenever another creature you control dies, return target creature card from your graveyard to the battlefield.",
    });
    assert.equal(meren[0].kind, "reanimator_engine");
    assert.equal(meren[0].capability.atlasAdmitted, false);
    assert.deepEqual(seatReanimatorImplementation({ name: "Miller", oracleText: "Target player mills two cards." }), []);

    const aesi = seatLandfallImplementation({
      name: "Land Titan",
      oracleText: "Landfall — Whenever a land you control enters, draw a card.",
    });
    assert.equal(aesi[0].kind, "landfall_engine");
    assert.deepEqual(seatLandfallImplementation({ name: "Fetcher", oracleText: "Search your library for a land card and put it onto the battlefield." }), []);

    const arbiter = seatStaxImplementation({
      name: "Tax Collector",
      oracleText: "Spells your opponents cast cost {1} more to cast.",
    });
    assert.equal(arbiter[0].kind, "stax_engine");
    assert.deepEqual(seatStaxImplementation({ name: "Group Hug", oracleText: "Each player draws a card." }), []);
  });



  it("maps each shipped graph signal through Capability to Seat to Implementation", () => {
    const expected = [
      ["clue", "clues"],
      ["treasure", "treasure"],
      ["food", "food"],
      ["blood", "blood"],
      ["gold", "gold"],
      ["map", "maps"],
      ["junk", "junk"],
      ["powerstone", "powerstones"],
    ];
    for (const [resource, signal] of expected) {
      const [seating] = seatNamedResourceImplementation({
        name: `${resource} producer`,
        mechanics: { produces: [signal], rewards: [], signals: [signal] },
      });
      assert.equal(seating.resource, resource);
      assert.equal(seating.capability.id, `cap:${resource}_resource_engine`);
      assert.equal(seating.seat.id, `seat:${resource}_engine_piece`);
      assert.deepEqual(seating.implementation.roles, ["producer"]);
      assert.equal(seating.writesToBrain, false);
    }
  });

  it("seats selection kinds from graph labels without admitting Capabilities", () => {
    const registry = buildAtlasVocabularyRegistry();
    assert.equal(registry.summary.selectionSeatCount, 6);
    assert.equal(registry.summary.capabilityAdmittedCount, 0);
    assert.ok(registry.selectionSeats.every((row) => row.writesToBrain === false && row.capability.atlasAdmitted === false));

    const loot = seatSelectionImplementation({
      name: "Looter",
      oracleText: "Whenever this deals combat damage to a player, discard a card, then draw a card.",
    });
    assert.equal(loot.length, 1);
    assert.equal(loot[0].kind, "rummage");
    assert.equal(loot[0].seat.label, "Rummage Filter");
    assert.equal(loot[0].contrast, "not net draw");
    assert.equal(loot[0].writesToBrain, false);

    const mill = seatSelectionImplementation({
      name: "Tome Scour",
      oracleText: "Target player mills two cards.",
    });
    assert.deepEqual(mill, [], "mill is not a selection seat");

    const seer = seatSelectionImplementation({
      name: "Seer",
      oracleText: "When this enters, scry 2.",
    });
    assert.equal(seer[0].kind, "scry");
    assert.equal(seer[0].contrast, "not mill");

    const fromGraph = seatSelectionImplementation({
      name: "Pre-classified",
      mechanics: { selectionKinds: ["impulse"], produces: [], rewards: [], signals: [] },
    });
    assert.equal(fromGraph[0].kind, "impulse");
    assert.equal(fromGraph[0].contrast, "not a Junk token");
  });

  it("seats mill as a graveyard dump, distinct from surveil, without admitting Capabilities", () => {
    const registry = buildAtlasVocabularyRegistry();
    assert.equal(registry.summary.graveyardSeatCount, 14);
    assert.equal(registry.summary.capabilityAdmittedCount, 0);
    assert.ok(registry.graveyardSeats.every((row) => row.writesToBrain === false && row.capability.atlasAdmitted === false));

    const mill = seatGraveyardImplementation({
      name: "Tome Scour",
      oracleText: "Target player mills two cards.",
    });
    assert.equal(mill.length, 1);
    assert.equal(mill[0].kind, "mill");
    assert.equal(mill[0].seat.label, "Mill Dump");
    assert.equal(mill[0].contrast, "not surveil");
    assert.equal(mill[0].writesToBrain, false);

    const surveil = seatGraveyardImplementation({
      name: "Street Wraith",
      oracleText: "When this enters, surveil 1.",
    });
    assert.deepEqual(surveil, [], "surveil is selection, not a mill dump");

    const fromGraph = seatGraveyardImplementation({
      name: "Pre-classified",
      mechanics: { graveyardKinds: ["mill"], produces: ["graveyard"], rewards: [], signals: [] },
    });
    assert.equal(fromGraph[0].kind, "mill");
    assert.equal(fromGraph[0].writesToBrain, false);
  });

  it("seats dredge as graveyard recursion, distinct from a mill dump, without admitting Capabilities", () => {
    const registry = buildAtlasVocabularyRegistry();
    const dredgeSeat = registry.graveyardSeats.find((row) => row.kind === "dredge");
    const millSeat = registry.graveyardSeats.find((row) => row.kind === "mill");
    assert.equal(dredgeSeat.seat.label, "Dredge Recursion");
    assert.equal(dredgeSeat.contrast, "not mill");
    assert.equal(dredgeSeat.capability.status, "descriptive_not_admitted");
    assert.equal(dredgeSeat.capability.atlasAdmitted, false);
    assert.equal(dredgeSeat.writesToBrain, false);
    assert.equal(millSeat.seat.label, "Mill Dump", "the mill seat is unchanged");
    assert.equal(millSeat.contrast, "not surveil", "the mill seat is unchanged");
    assert.equal(registry.summary.capabilityAdmittedCount, 0);
    assert.ok(registry.revisions.some((row) => row.date === "2026-08-15" && /dredge/i.test(row.change)));

    const dredge = seatGraveyardImplementation({
      name: "Golgari Grave-Troll",
      oracleText: "Dredge 6 (If you would draw a card, you may mill six cards instead. If you do, return this card from your graveyard to your hand.)",
    });
    assert.equal(dredge.length, 1, "dredge's reminder mill clause does not add a Mill Dump row");
    assert.equal(dredge[0].kind, "dredge");
    assert.equal(dredge[0].seat.label, "Dredge Recursion");
    assert.equal(dredge[0].writesToBrain, false);

    const fromGraph = seatGraveyardImplementation({
      name: "Pre-classified",
      mechanics: { graveyardKinds: ["dredge"], produces: [], rewards: [], signals: [] },
    });
    assert.equal(fromGraph[0].seat.label, "Dredge Recursion");
    assert.equal(fromGraph[0].writesToBrain, false);
  });

  it("seats flashback, unearth, and escape as graveyard returns, distinct from mill dump and dredge-to-hand, without admitting Capabilities", () => {
    const registry = buildAtlasVocabularyRegistry();
    const flashbackSeat = registry.graveyardSeats.find((row) => row.kind === "flashback");
    const unearthSeat = registry.graveyardSeats.find((row) => row.kind === "unearth");
    const escapeSeat = registry.graveyardSeats.find((row) => row.kind === "escape");
    assert.equal(flashbackSeat.seat.label, "Flashback Recast");
    assert.equal(flashbackSeat.contrast, "not dredge-to-hand");
    assert.equal(unearthSeat.seat.label, "Unearth Return");
    assert.equal(unearthSeat.contrast, "temporary, not permanent reanimation");
    assert.equal(escapeSeat.seat.label, "Escape Recast");
    assert.equal(escapeSeat.contrast, "not dredge-to-hand");
    for (const seat of [flashbackSeat, unearthSeat, escapeSeat]) {
      assert.equal(seat.capability.status, "descriptive_not_admitted");
      assert.equal(seat.capability.atlasAdmitted, false);
      assert.equal(seat.writesToBrain, false);
    }
    assert.equal(registry.summary.capabilityAdmittedCount, 0);
    assert.ok(registry.revisions.some((row) => row.date === "2026-08-15" && /flashback, unearth, and escape/i.test(row.change)));

    const flashback = seatGraveyardImplementation({
      name: "Faithless Looting",
      oracleText: "Draw two cards, then discard two cards. Flashback {2}{R}",
    });
    assert.equal(flashback.some((row) => row.kind === "flashback"), true);
    assert.equal(flashback.some((row) => row.kind === "mill"), false, "flashback is not a mill dump");

    const unearth = seatGraveyardImplementation({
      name: "Reassembling Skeleton",
      oracleText: "Unearth {1}{B} (Pay {1}{B}: Return this card from your graveyard to the battlefield. It gains \"Sacrifice this creature: Return this card to its owner's hand\" and \"Sacrifice this creature at the beginning of the next end step.\" Cast this ability only as a sorcery.)",
    });
    assert.equal(unearth.length, 1);
    assert.equal(unearth[0].kind, "unearth");
    assert.equal(unearth[0].seat.label, "Unearth Return");

    const escape = seatGraveyardImplementation({
      name: "Uro, Titan of Nature's Wrath",
      oracleText: "Escape—{4}{G}{U}, Exile five other cards from your graveyard. (You may cast this card from your graveyard for its escape cost.)",
    });
    assert.equal(escape.length, 1);
    assert.equal(escape[0].kind, "escape");
    assert.equal(escape[0].seat.label, "Escape Recast");

    const dredgeStaysDredge = seatGraveyardImplementation({
      name: "Golgari Grave-Troll",
      oracleText: "Dredge 6 (If you would draw a card, you may mill six cards instead. If you do, return this card from your graveyard to your hand.)",
    });
    assert.deepEqual(dredgeStaysDredge.map((row) => row.kind), ["dredge"], "dredge does not also earn flashback/unearth/escape");

    const fromGraph = seatGraveyardImplementation({
      name: "Pre-classified",
      mechanics: { graveyardKinds: ["flashback"], produces: [], rewards: [], signals: [] },
    });
    assert.equal(fromGraph[0].seat.label, "Flashback Recast");
    assert.equal(fromGraph[0].writesToBrain, false);
  });


  it("seats persist / undying / jump-start as graveyard kinds without admitting Capabilities", () => {
    const registry = buildAtlasVocabularyRegistry();
    assert.equal(registry.summary.graveyardSeatCount, 14);
    const persist = seatGraveyardImplementation({ name: "Kitchen Finks", oracleText: "Persist" });
    assert.equal(persist[0].kind, "persist");
    assert.equal(persist[0].seat.label, "Persist Return");
    const undying = seatGraveyardImplementation({ name: "Young Wolf", oracleText: "Undying" });
    assert.equal(undying[0].kind, "undying");
    const jump = seatGraveyardImplementation({ name: "Direct Current", oracleText: "Jump-start" });
    assert.equal(jump[0].kind, "jump_start");
    const aftermath = seatGraveyardImplementation({ name: "Toil // Trouble", oracleText: "Aftermath (Cast this spell only from your graveyard. Then exile it.)" });
    assert.equal(aftermath[0].kind, "aftermath");
  });


  it("seats aftermath / madness / retrace as graveyard kinds without admitting Capabilities", () => {
    const registry = buildAtlasVocabularyRegistry();
    assert.equal(registry.summary.graveyardSeatCount, 14);
    const aftermath = seatGraveyardImplementation({ name: "Toil", oracleText: "Aftermath" });
    assert.equal(aftermath[0].kind, "aftermath");
    assert.equal(aftermath[0].seat.label, "Aftermath Recast");
    const madness = seatGraveyardImplementation({ name: "Basking Rootwalla", oracleText: "Madness {1}{G}" });
    assert.equal(madness[0].kind, "madness");
    const retrace = seatGraveyardImplementation({ name: "Raven's Crime", oracleText: "Retrace" });
    assert.equal(retrace[0].kind, "retrace");
  });

  it("seats disturb / embalm / eternalize as graveyard kinds without admitting Capabilities", () => {
    const registry = buildAtlasVocabularyRegistry();
    assert.equal(registry.summary.graveyardSeatCount, 14);
    assert.ok(registry.revisions.some((row) => row.date === "2026-08-16" && /disturb.*embalm.*eternalize/i.test(row.change)));
    const disturb = seatGraveyardImplementation({ name: "Beloved Princess", oracleText: "Disturb {1}{W}" });
    assert.equal(disturb[0].kind, "disturb");
    assert.equal(disturb[0].seat.label, "Disturb Recast");
    assert.equal(disturb[0].contrast, "not flashback");
    assert.equal(disturb[0].writesToBrain, false);
    const embalm = seatGraveyardImplementation({ name: "Trueheart Duelist", oracleText: "Embalm {3}{W}" });
    assert.equal(embalm[0].kind, "embalm");
    assert.equal(embalm[0].seat.label, "Embalm Token");
    const eternalize = seatGraveyardImplementation({ name: "Champion of Wits", oracleText: "Eternalize {4}{U}{U}" });
    assert.equal(eternalize[0].kind, "eternalize");
    assert.equal(eternalize[0].seat.label, "Eternalize Token");
  });

  it("seats outlet / death payoff / incidental yard, splitting the blended sacrifice signal, without admitting Capabilities", () => {
    const registry = buildAtlasVocabularyRegistry();
    assert.equal(registry.summary.sacrificeSeatCount, 3);
    assert.equal(registry.summary.capabilityAdmittedCount, 0);
    assert.ok(registry.sacrificeSeats.every((row) => row.writesToBrain === false && row.capability.atlasAdmitted === false));
    assert.ok(registry.revisions.some((row) => row.date === "2026-08-15" && /outlet.*death payoff.*incidental yard/i.test(row.change)));

    const outlet = seatSacrificeImplementation({
      name: "Viscera Seer",
      oracleText: "Sacrifice a creature: Scry 1.",
    });
    assert.equal(outlet.length, 1);
    assert.equal(outlet[0].kind, "outlet");
    assert.equal(outlet[0].seat.label, "Sacrifice Outlet");
    assert.equal(outlet[0].contrast, "not a death payoff");

    const deathPayoff = seatSacrificeImplementation({
      name: "Blood Artist",
      oracleText: "Whenever Blood Artist or another creature dies, target player loses 1 life and you gain 1 life.",
    });
    assert.equal(deathPayoff.length, 1);
    assert.equal(deathPayoff[0].kind, "death_payoff");
    assert.equal(deathPayoff[0].seat.label, "Death Payoff");
    assert.equal(deathPayoff[0].contrast, "not a sacrifice outlet");

    const incidental = seatSacrificeImplementation({
      name: "Merchant of the Vale",
      oracleText: "{1}, Sacrifice a Clue: Draw a card.",
    });
    assert.equal(incidental.length, 1);
    assert.equal(incidental[0].kind, "incidental_yard");
    assert.equal(incidental[0].seat.label, "Incidental Yard");
    assert.equal(incidental[0].contrast, "not a mill dump");

    // A card can hold multiple sacrifice seats at once (Viscera Seer-class outlet + payoff).
    const both = seatSacrificeImplementation({
      name: "Combo",
      oracleText: "Sacrifice a creature: Draw a card. Whenever a creature dies, you gain 1 life.",
    });
    assert.deepEqual(both.map((row) => row.kind), ["outlet", "death_payoff"]);

    const fromGraph = seatSacrificeImplementation({
      name: "Pre-classified",
      mechanics: { sacrificeKinds: ["outlet"], produces: [], rewards: [], signals: [] },
    });
    assert.equal(fromGraph[0].seat.label, "Sacrifice Outlet");
    assert.equal(fromGraph[0].writesToBrain, false);
  });

  it("seats enter and cast as a card's own trigger condition, without admitting Capabilities", () => {
    const registry = buildAtlasVocabularyRegistry();
    assert.equal(registry.summary.triggerSeatCount, 5);
    assert.equal(registry.summary.capabilityAdmittedCount, 0);
    assert.ok(registry.triggerSeats.every((row) => row.writesToBrain === false && row.capability.atlasAdmitted === false));
    assert.ok(registry.revisions.some((row) => row.date === "2026-08-15" && /enter and cast/i.test(row.change)));
    assert.ok(registry.revisions.some((row) => row.date === "2026-08-15" && /attack/i.test(row.change) && /trigger/i.test(row.change)));
    assert.ok(registry.revisions.some((row) => row.date === "2026-08-15" && /combat damage/i.test(row.change)));
    assert.ok(registry.revisions.some((row) => row.date === "2026-08-15" && /noncombat damage/i.test(row.change)));

    const enter = seatTriggerImplementation({
      name: "Bauble",
      oracleText: "When this enters the battlefield, draw a card.",
    });
    assert.equal(enter.length, 1);
    assert.equal(enter[0].kind, "enter");
    assert.equal(enter[0].seat.label, "Enter Trigger");
    assert.equal(enter[0].contrast, "not a blink/flicker effect");

    const cast = seatTriggerImplementation({
      name: "Prowess Creature",
      oracleText: "Whenever you cast an instant or sorcery spell, draw a card.",
    });
    assert.equal(cast.length, 1);
    assert.equal(cast[0].kind, "cast");
    assert.equal(cast[0].seat.label, "Cast Trigger");
    assert.equal(cast[0].contrast, "not spellslinger construction occupancy");

    const attack = seatTriggerImplementation({
      name: "Bloodthirsty Aerialist",
      oracleText: "Whenever this creature attacks, draw a card.",
    });
    assert.equal(attack.length, 1);
    assert.equal(attack[0].kind, "attack");
    assert.equal(attack[0].seat.label, "Attack Trigger");
    assert.equal(attack[0].contrast, "not extra-combat amplification or stax construction occupancy");

    const combatDamage = seatTriggerImplementation({
      name: "Silent-Blade Oni",
      oracleText: "Whenever this creature deals combat damage to a player, create a Treasure token.",
    });
    assert.equal(combatDamage.length, 1);
    assert.equal(combatDamage[0].kind, "combat_damage");
    assert.equal(combatDamage[0].seat.label, "Combat Damage Trigger");
    assert.equal(combatDamage[0].contrast, "not an Attack Trigger or extra-combat amplification");

    const noncombatDamage = seatTriggerImplementation({
      name: "Firebrand Archer",
      oracleText: "Whenever this creature deals damage to a player, draw a card.",
    });
    assert.equal(noncombatDamage.length, 1);
    assert.equal(noncombatDamage[0].kind, "noncombat_damage");
    assert.equal(noncombatDamage[0].seat.label, "Damage Trigger");
    assert.equal(noncombatDamage[0].contrast, "not a Combat Damage Trigger or extra-combat amplification");

    // Damage doubling is not a Damage Trigger.
    const damageDoubler = seatTriggerImplementation({
      name: "Fiery Emancipation",
      oracleText: "If a source you control would deal damage to a permanent or player, it deals double that damage instead.",
    });
    assert.deepEqual(damageDoubler, []);

    // Extra combat is not a Combat Damage Trigger.
    const extraCombat = seatTriggerImplementation({
      name: "Aggravated Assault",
      oracleText: "Untap all creatures you control. After this main phase, there is an additional combat phase.",
    });
    assert.deepEqual(extraCombat, []);

    // A flashback/escape "you may cast" permission is not a Cast Trigger.
    const flashback = seatTriggerImplementation({
      name: "Faithless Looting",
      oracleText: "Draw two cards, then discard two cards. Flashback {2}{R} (You may cast this card from your graveyard for its flashback cost. Then exile it.)",
    });
    assert.deepEqual(flashback, []);

    const fromGraph = seatTriggerImplementation({
      name: "Pre-classified",
      mechanics: { triggerKinds: ["cast"], produces: [], rewards: [], signals: [] },
    });
    assert.equal(fromGraph[0].seat.label, "Cast Trigger");
    assert.equal(fromGraph[0].writesToBrain, false);
  });

  it("seats put / proliferate / remove, splitting the blended counters signal, without admitting Capabilities", () => {
    const registry = buildAtlasVocabularyRegistry();
    assert.equal(registry.summary.counterSeatCount, 3);
    assert.equal(registry.summary.capabilityAdmittedCount, 0);
    assert.ok(registry.counterSeats.every((row) => row.writesToBrain === false && row.capability.atlasAdmitted === false));
    assert.ok(registry.revisions.some((row) => row.date === "2026-08-15" && /put \/ proliferate \/ remove/i.test(row.change)));

    const put = seatCounterImplementation({
      name: "Hardened Scales",
      oracleText: "If one or more +1/+1 counters would be put on a creature you control, that many plus one +1/+1 counters are put on it instead.",
    });
    assert.equal(put.length, 1);
    assert.equal(put[0].kind, "put");
    assert.equal(put[0].seat.label, "Counter Placement");
    assert.equal(put[0].contrast, "not proliferate");

    const proliferate = seatCounterImplementation({
      name: "Evolution Sage",
      oracleText: "Landfall — Whenever a land enters the battlefield under your control, proliferate.",
    });
    assert.equal(proliferate.length, 1);
    assert.equal(proliferate[0].kind, "proliferate");
    assert.equal(proliferate[0].seat.label, "Proliferate Effect");
    assert.equal(proliferate[0].contrast, "not a single counter placement");

    const remove = seatCounterImplementation({
      name: "Hapatra, Vizier of Poisons",
      oracleText: "Remove a -1/-1 counter from a creature you control: Create a 1/1 black Snake creature token.",
    });
    assert.equal(remove.length, 1);
    assert.equal(remove[0].kind, "remove");
    assert.equal(remove[0].seat.label, "Counter Removal");
    assert.equal(remove[0].contrast, "not counter placement or proliferate");

    const fromGraph = seatCounterImplementation({
      name: "Pre-classified",
      mechanics: { counterKinds: ["proliferate"], produces: [], rewards: [], signals: [] },
    });
    assert.equal(fromGraph[0].seat.label, "Proliferate Effect");
    assert.equal(fromGraph[0].writesToBrain, false);
  });

  it("seats gain / lifelink / pay, splitting the blended life signal, without admitting Capabilities", () => {
    const registry = buildAtlasVocabularyRegistry();
    assert.equal(registry.summary.lifeSeatCount, 3);
    assert.equal(registry.summary.capabilityAdmittedCount, 0);
    assert.ok(registry.lifeSeats.every((row) => row.writesToBrain === false && row.capability.atlasAdmitted === false));
    assert.ok(registry.revisions.some((row) => row.date === "2026-08-15" && /gain \/ lifelink \/ pay/i.test(row.change)));

    const gain = seatLifeImplementation({
      name: "Soul Warden",
      oracleText: "Whenever another creature enters the battlefield, you gain 1 life.",
    });
    assert.equal(gain.length, 1);
    assert.equal(gain[0].kind, "gain");
    assert.equal(gain[0].seat.label, "Life Gain");
    assert.equal(gain[0].contrast, "not lifelink or a whenever-you-gain-life payoff");

    const lifelink = seatLifeImplementation({
      name: "Vampire Nighthawk",
      oracleText: "Lifelink (Damage dealt by this creature also causes you to gain that much life.)",
    });
    assert.equal(lifelink.length, 1);
    assert.equal(lifelink[0].kind, "lifelink");
    assert.equal(lifelink[0].seat.label, "Lifelink");
    assert.equal(lifelink[0].contrast, "not a lifegain spell");

    const pay = seatLifeImplementation({
      name: "Necropotence",
      oracleText: "Pay 1 life: Exile the top card of your library face down.",
    });
    assert.equal(pay.length, 1);
    assert.equal(pay[0].kind, "pay");
    assert.equal(pay[0].seat.label, "Life Payment");
    assert.equal(pay[0].contrast, "not gaining life or opponents losing life");

    const payoff = seatLifeImplementation({
      name: "Ajani's Pridemate",
      oracleText: "Whenever you gain life, put a +1/+1 counter on this creature.",
    });
    assert.deepEqual(payoff, []);

    const fromGraph = seatLifeImplementation({
      name: "Pre-classified",
      mechanics: { lifeKinds: ["lifelink"], produces: [], rewards: [], signals: [] },
    });
    assert.equal(fromGraph[0].seat.label, "Lifelink");
    assert.equal(fromGraph[0].writesToBrain, false);
  });

  it("seats hexproof / indestructible / ward, splitting the blended protection signal, without admitting Capabilities", () => {
    const registry = buildAtlasVocabularyRegistry();
    assert.equal(registry.summary.protectionSeatCount, 6);
    assert.equal(registry.summary.capabilityAdmittedCount, 0);
    assert.ok(registry.protectionSeats.every((row) => row.writesToBrain === false && row.capability.atlasAdmitted === false));
    assert.ok(registry.revisions.some((row) => row.date === "2026-08-15" && /hexproof \/ indestructible \/ ward/i.test(row.change)));

    const hexproof = seatProtectionImplementation({
      name: "Swiftfoot Boots",
      oracleText: "Equipped creature has hexproof and haste.",
    });
    assert.equal(hexproof.length, 1);
    assert.equal(hexproof[0].kind, "hexproof");
    assert.equal(hexproof[0].seat.label, "Hexproof");
    assert.equal(hexproof[0].contrast, "not indestructible or ward");

    const indestructible = seatProtectionImplementation({
      name: "Darksteel Plate",
      oracleText: "Equipped creature has indestructible.",
    });
    assert.equal(indestructible.length, 1);
    assert.equal(indestructible[0].kind, "indestructible");
    assert.equal(indestructible[0].seat.label, "Indestructible");
    assert.equal(indestructible[0].contrast, "not hexproof or ward");

    const ward = seatProtectionImplementation({
      name: "Slippery Bogbonder",
      oracleText: "Ward {2} (Whenever this creature becomes the target of a spell or ability an opponent controls, counter it unless that player pays {2}.)",
    });
    assert.equal(ward.length, 1);
    assert.equal(ward[0].kind, "ward");
    assert.equal(ward[0].seat.label, "Ward");
    assert.equal(ward[0].contrast, "not hexproof or indestructible");

    const shroud = seatProtectionImplementation({
      name: "Whispersilk Cloak",
      oracleText: "Equipped creature has shroud.",
    });
    assert.equal(shroud[0].kind, "shroud");
    assert.equal(shroud[0].seat.label, "Shroud");

    const protectionFrom = seatProtectionImplementation({
      name: "Mother of Runes",
      oracleText: "Protection from the color of your choice.",
    });
    assert.equal(protectionFrom[0].kind, "protection_from");
    assert.equal(protectionFrom[0].seat.label, "Protection From");

    const phaseOut = seatProtectionImplementation({
      name: "Teferi's Protection",
      oracleText: "Permanents you control phase out.",
    });
    assert.equal(phaseOut[0].kind, "phase_out");
    assert.equal(phaseOut[0].seat.label, "Phase Out");

    const fromGraph = seatProtectionImplementation({
      name: "Pre-classified",
      mechanics: { protectionKinds: ["ward"], produces: [], rewards: [], signals: [] },
    });
    assert.equal(fromGraph[0].seat.label, "Ward");
    assert.equal(fromGraph[0].writesToBrain, false);
  });

  it("seats flying / menace / trample, splitting the blended evasion signal, without admitting Capabilities", () => {
    const registry = buildAtlasVocabularyRegistry();
    assert.equal(registry.summary.evasionSeatCount, 9);
    assert.equal(registry.summary.capabilityAdmittedCount, 0);
    assert.ok(registry.evasionSeats.every((row) => row.writesToBrain === false && row.capability.atlasAdmitted === false));
    assert.ok(registry.revisions.some((row) => row.date === "2026-08-15" && /flying \/ menace \/ trample/i.test(row.change)));

    const flying = seatEvasionImplementation({ name: "Storm Crow", oracleText: "Flying" });
    assert.equal(flying.length, 1);
    assert.equal(flying[0].kind, "flying");
    assert.equal(flying[0].seat.label, "Flying");
    assert.equal(flying[0].contrast, "not menace or trample");

    const menace = seatEvasionImplementation({ name: "Boggart Brute", oracleText: "Menace" });
    assert.equal(menace[0].kind, "menace");
    assert.equal(menace[0].seat.label, "Menace");

    const trample = seatEvasionImplementation({ name: "Craw Wurm", oracleText: "Trample" });
    assert.equal(trample[0].kind, "trample");
    assert.equal(trample[0].seat.label, "Trample");

    const unblockable = seatEvasionImplementation({
      name: "Whispersilk Cloak",
      oracleText: "Equipped creature can't be blocked.",
    });
    assert.equal(unblockable[0].kind, "unblockable");
    const skulk = seatEvasionImplementation({ name: "Deadly Visit", oracleText: "Skulk" });
    assert.equal(skulk[0].kind, "skulk");
    const reach = seatEvasionImplementation({ name: "Giant Spider", oracleText: "Reach" });
    assert.equal(reach[0].kind, "reach");
    const fear = seatEvasionImplementation({ name: "Fear Beast", oracleText: "This creature can't be blocked except by artifact creatures and/or black creatures." });
    assert.equal(fear[0].kind, "fear");
    const shadow = seatEvasionImplementation({ name: "Dauthi Horror", oracleText: "Shadow" });
    assert.equal(shadow[0].kind, "shadow");
    const intimidate = seatEvasionImplementation({ name: "Boggart Brute", oracleText: "Intimidate" });
    assert.equal(intimidate[0].kind, "intimidate");
    assert.deepEqual(seatEvasionImplementation({ name: "Zhalfirin Knight", oracleText: "This creature can't be blocked except by creatures with horsemanship." }), []);

    const fromGraph = seatEvasionImplementation({
      name: "Pre-classified",
      mechanics: { evasionKinds: ["trample"], produces: [], rewards: [], signals: [] },
    });
    assert.equal(fromGraph[0].seat.label, "Trample");
    assert.equal(fromGraph[0].writesToBrain, false);
  });

  it("seats landfall / extra drop / search, splitting the blended lands signal, without admitting Capabilities", () => {
    const registry = buildAtlasVocabularyRegistry();
    assert.equal(registry.summary.landSeatCount, 3);
    assert.ok(registry.revisions.some((row) => row.date === "2026-08-15" && /landfall \/ extra land drop \/ search/i.test(row.change)));

    const landfall = seatLandImplementation({
      name: "Lotus Cobra",
      oracleText: "Landfall — Whenever a land you control enters, add {G}.",
    });
    assert.equal(landfall[0].kind, "landfall");
    assert.equal(landfall[0].seat.label, "Landfall");
    assert.equal(landfall[0].contrast, "not an extra land drop or a land search");

    const extra = seatLandImplementation({
      name: "Exploration",
      oracleText: "You may play an additional land on each of your turns.",
    });
    assert.equal(extra[0].kind, "extra_drop");
    assert.equal(extra[0].seat.label, "Extra Land Drop");

    const search = seatLandImplementation({
      name: "Rampant Growth",
      oracleText: "Search your library for a basic land card, put it onto the battlefield tapped, then shuffle.",
    });
    assert.equal(search[0].kind, "search");
    assert.equal(search[0].seat.label, "Land Search");
    assert.equal(search[0].contrast, "not landfall or an extra land drop");

    const tapped = seatLandImplementation({
      name: "Guildgate",
      oracleText: "This land enters tapped.",
    });
    assert.deepEqual(tapped, []);
  });

  it("seats spell / matters / outlet, splitting the blended artifacts signal, without admitting Capabilities", () => {
    const registry = buildAtlasVocabularyRegistry();
    assert.equal(registry.summary.artifactSeatCount, 3);
    assert.ok(registry.revisions.some((row) => row.date === "2026-08-15" && /spell \/ matters \/ outlet/i.test(row.change)));

    const spell = seatArtifactImplementation({
      name: "Sai, Master Thopterist",
      oracleText: "Whenever you cast an artifact spell, draw a card.",
    });
    assert.equal(spell[0].kind, "spell");
    assert.equal(spell[0].seat.label, "Artifact Spell");
    assert.equal(spell[0].contrast, "not artifacts-you-control or an artifact outlet");

    const matters = seatArtifactImplementation({
      name: "Tempered Steel",
      oracleText: "Artifact creatures you control get +1/+1.",
    });
    assert.equal(matters[0].kind, "matters");
    assert.equal(matters[0].seat.label, "Artifact Matters");

    const outlet = seatArtifactImplementation({
      name: "Krark-Clan Ironworks",
      oracleText: "Sacrifice an artifact: Add {C}{C}.",
    });
    assert.equal(outlet[0].kind, "outlet");
    assert.equal(outlet[0].seat.label, "Artifact Outlet");

    const rock = seatArtifactImplementation({
      name: "Sol Ring",
      oracleText: "{T}: Add {C}{C}.",
    });
    assert.deepEqual(rock, []);
  });

  it("seats create / go-wide / sac, splitting the blended tokens signal, without admitting Capabilities", () => {
    const registry = buildAtlasVocabularyRegistry();
    assert.equal(registry.summary.tokenSeatCount, 3);
    assert.ok(registry.revisions.some((row) => /create \/ go-wide \/ sac/i.test(row.change)));

    const create = seatTokenImplementation({ name: "Raise the Alarm", oracleText: "Create a 1/1 white Soldier creature token." });
    assert.equal(create[0].kind, "create");
    assert.equal(create[0].seat.label, "Token Create");

    const goWide = seatTokenImplementation({ name: "Intangible Virtue", oracleText: "Creature tokens you control get +1/+1." });
    assert.equal(goWide[0].kind, "go_wide");
    assert.equal(goWide[0].seat.label, "Token Go-Wide");

    const sac = seatTokenImplementation({ name: "Ashnod's Altar", oracleText: "Sacrifice a token: Add {C}{C}." });
    assert.equal(sac[0].kind, "sac");
    assert.deepEqual(seatTokenImplementation({ name: "Altar", oracleText: "Sacrifice a creature: Add {C}{C}." }), []);
  });

  it("seats enchant / matters / affinity, splitting the blended auras signal, without admitting Capabilities", () => {
    const registry = buildAtlasVocabularyRegistry();
    assert.equal(registry.summary.auraSeatCount, 3);
    const enchant = seatAuraImplementation({ name: "Pacifism", oracleText: "Enchant creature" });
    assert.equal(enchant[0].kind, "enchant");
    assert.equal(enchant[0].seat.label, "Aura Enchant");
    const matters = seatAuraImplementation({ name: "Sphere of Safety", oracleText: "Auras you control get +1/+1." });
    assert.equal(matters[0].kind, "matters");
    const affinity = seatAuraImplementation({ name: "Pearl-Ear", oracleText: "Affinity for Auras" });
    assert.equal(affinity[0].kind, "affinity");
    assert.deepEqual(seatAuraImplementation({ name: "Sword", oracleText: "Equip {2}" }), []);
  });

  it("seats copy / free / noncreature, splitting the blended spells signal, without admitting Capabilities", () => {
    const registry = buildAtlasVocabularyRegistry();
    assert.equal(registry.summary.spellSeatCount, 6);
    const copy = seatSpellImplementation({ name: "Twincast", oracleText: "Copy target spell." });
    assert.equal(copy[0].kind, "copy");
    assert.equal(copy[0].seat.label, "Spell Copy");
    const free = seatSpellImplementation({ name: "Omniscience", oracleText: "You may cast that card without paying its mana cost." });
    assert.equal(free[0].kind, "free");
    const noncreature = seatSpellImplementation({ name: "Goblin Electromancer", oracleText: "Instant and sorcery spells you cast cost {1} less to cast." });
    assert.equal(noncreature[0].kind, "noncreature");
    assert.deepEqual(seatSpellImplementation({ name: "Faithless Looting", oracleText: "Flashback {2}{R} (You may cast this card from your graveyard for its flashback cost. Then exile it.)" }), []);
  });


  it("seats storm / cascade / rebound as spell kinds without admitting Capabilities", () => {
    const registry = buildAtlasVocabularyRegistry();
    assert.equal(registry.summary.spellSeatCount, 6);
    const storm = seatSpellImplementation({ name: "Grapeshot", oracleText: "Storm" });
    assert.equal(storm[0].kind, "storm");
    assert.equal(storm[0].seat.label, "Storm");
    const cascade = seatSpellImplementation({ name: "Bloodbraid Elf", oracleText: "Cascade" });
    assert.equal(cascade[0].kind, "cascade");
    const rebound = seatSpellImplementation({ name: "Staggershock", oracleText: "Rebound" });
    assert.equal(rebound[0].kind, "rebound");
  });

  it("seats watch / wheel / hand, splitting the blended draw signal, without admitting Capabilities", () => {
    const registry = buildAtlasVocabularyRegistry();
    assert.equal(registry.summary.drawSeatCount, 3);
    const watch = seatDrawImplementation({ name: "Psychosis Crawler", oracleText: "Whenever you draw a card, put a +1/+1 counter on this creature." });
    assert.equal(watch[0].kind, "watch");
    assert.equal(watch[0].seat.label, "Draw Watch");
    const wheel = seatDrawImplementation({ name: "Windfall", oracleText: "Each player discards their hand, then draws seven cards." });
    assert.equal(wheel[0].kind, "wheel");
    const hand = seatDrawImplementation({ name: "Psychosis Crawler", oracleText: "This creature gets +1/+1 for each card in your hand." });
    assert.equal(hand[0].kind, "hand");
    assert.deepEqual(seatDrawImplementation({ name: "Opt", oracleText: "Draw a card." }), []);
    assert.deepEqual(seatDrawImplementation({ name: "Faithless Looting", oracleText: "Draw two cards, then discard two cards." }), []);
  });


  it("seats deal / drain / prevent as damage kinds without admitting Capabilities", () => {
    const registry = buildAtlasVocabularyRegistry();
    assert.equal(registry.summary.damageSeatCount, 3);
    assert.ok(registry.revisions.some((row) => /deal \/ drain \/ prevent/i.test(row.change)));
    const deal = seatDamageImplementation({ name: "Lightning Bolt", oracleText: "Lightning Bolt deals 3 damage to any target." });
    assert.equal(deal[0].kind, "deal");
    assert.equal(deal[0].seat.label, "Damage Deal");
    const drain = seatDamageImplementation({ name: "Gray Merchant of Asphodel", oracleText: "Each opponent loses 2 life." });
    assert.equal(drain[0].kind, "drain");
    const prevent = seatDamageImplementation({ name: "Fog", oracleText: "Prevent all combat damage that would be dealt this turn." });
    assert.equal(prevent[0].kind, "prevent");
    assert.deepEqual(seatDamageImplementation({ name: "Nielth", oracleText: "Whenever this creature deals combat damage to a player, draw a card." }), []);
  });

  it("seats equip / attach / bonus as equipment kinds without admitting Capabilities", () => {
    const registry = buildAtlasVocabularyRegistry();
    assert.equal(registry.summary.equipmentSeatCount, 3);
    const equip = seatEquipmentImplementation({ name: "Colossus Hammer", oracleText: "Equip {8}" });
    assert.equal(equip[0].kind, "equip");
    const attach = seatEquipmentImplementation({ name: "Puresteel Paladin", oracleText: "Whenever an Equipment becomes attached to a creature you control, draw a card." });
    assert.equal(attach[0].kind, "attach");
    const bonus = seatEquipmentImplementation({ name: "Bonesplitter", oracleText: "Equipped creature gets +2/+0." });
    assert.equal(bonus[0].kind, "bonus");
    assert.deepEqual(seatEquipmentImplementation({ name: "Pacifism", oracleText: "Enchant creature" }), []);
  });

  it("seats haste / extra / vigilance as combat kinds without admitting Capabilities", () => {
    const registry = buildAtlasVocabularyRegistry();
    assert.equal(registry.summary.combatSeatCount, 6);
    const haste = seatCombatImplementation({ name: "Ball Lightning", oracleText: "Trample, haste" });
    assert.equal(haste[0].kind, "haste");
    const extra = seatCombatImplementation({ name: "Aggravated Assault", oracleText: "After this main phase, there is an additional combat phase followed by an additional main phase." });
    assert.equal(extra[0].kind, "extra");
    const vigilance = seatCombatImplementation({ name: "Serra Angel", oracleText: "Flying, vigilance" });
    assert.equal(vigilance[0].kind, "vigilance");
    const first = seatCombatImplementation({ name: "White Knight", oracleText: "First strike" });
    assert.equal(first[0].kind, "first_strike");
    const dbl = seatCombatImplementation({ name: "Firesong", oracleText: "Double strike" });
    assert.equal(dbl[0].kind, "double_strike");
    const touch = seatCombatImplementation({ name: "Wasteland Viper", oracleText: "Deathtouch" });
    assert.equal(touch[0].kind, "deathtouch");
    assert.deepEqual(seatCombatImplementation({ name: "Giant Spider", oracleText: "Reach" }), []);
  });

  it("seats loop kinds and reset shapes from graph labels without admitting Capabilities", () => {
    const registry = buildAtlasVocabularyRegistry();
    assert.equal(registry.summary.loopSeatCount, 3);
    assert.equal(registry.summary.resetShapeSeatCount, 4);
    assert.equal(registry.summary.capabilityAdmittedCount, 0);
    assert.ok(registry.loopSeats.every((row) => row.writesToBrain === false && row.capability.atlasAdmitted === false));

    const engine = seatLoopImplementation({
      left: { name: "Token Herald", oracleText: "Whenever you draw your second card each turn, create a 1/1 colorless Servo artifact creature token." },
      right: { name: "Card Herald", oracleText: "Draw two cards. Whenever a token you control attacks, this creature gets +1/+0 until end of turn." },
      loopKind: "engine",
    });
    assert.equal(engine[0].kind, "engine");
    assert.equal(engine[0].seat.label, "Mutual Engine");
    assert.equal(engine[0].contrast, "not a verified infinite");
    assert.equal(engine[0].writesToBrain, false);

    const unlabeled = seatLoopImplementation({
      left: { name: "Vanilla A", oracleText: "Vigilance." },
      right: { name: "Vanilla B", oracleText: "Reach." },
    });
    assert.deepEqual(unlabeled, [], "unlabeled pairs stay unknown rather than defaulting to engine");

    const reset = seatLoopImplementation({
      left: { name: "Basalt Monolith", oracleText: "{T}: Add {C}{C}{C}. {3}: Untap this artifact." },
      right: { name: "Voltaic Key", oracleText: "{1}, {T}: Untap target artifact." },
    });
    assert.equal(reset[0].kind, "closed_loop");
    assert.equal(reset[0].shape, "artifact_untap");
    assert.equal(reset[0].resetSeat.label, "Artifact Untap Reset");
    assert.equal(reset[0].contrast, "investigate, not a verified infinite");

    const fromGraph = seatLoopImplementation({
      cards: ["Isochron Scepter", "Dramatic Reversal"],
      loopKind: "closed_loop",
      shape: "imprint_untap_all",
    });
    assert.equal(fromGraph[0].resetSeat.label, "Imprint Untap Reset");
    assert.deepEqual(fromGraph[0].implementation.roles, ["reset_shape"]);

    const win = seatLoopImplementation({
      leftOracle: "Whenever an opponent dies, create a Treasure token. At the beginning of your upkeep, if you control ten or more Treasures, you win the game.",
      rightOracle: "Whenever you attack, create a Treasure token.",
      cards: ["Revel in Riches", "Dockside Extortionist"],
    });
    assert.equal(win[0].kind, "conditional_win");
    assert.equal(win[0].seat.label, "Conditional Board Win");
    assert.equal(win[0].contrast, "a board-state win, not a loop");
  });
});
