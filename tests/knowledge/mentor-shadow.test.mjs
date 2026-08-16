import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { explainCardAsMentor, explainPairAsMentor, buildMentorShadowReport } from "../../app/knowledge/mentor-shadow.mjs";

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
});
