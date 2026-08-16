import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildAtlasVocabularyRegistry,
  seatsImplementedBy,
  cardsImplementingSeat,
  seatNamedResourceImplementation,
  seatSelectionImplementation,
  seatGraveyardImplementation,
  seatSacrificeImplementation,
  seatTriggerImplementation,
  seatCounterImplementation,
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
    assert.equal(registry.summary.graveyardSeatCount, 5);
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
