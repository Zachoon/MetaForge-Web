import assert from "node:assert/strict";
import test from "node:test";
import { classifyPrintedCard } from "../app/curve-role-coach.mjs";

function card(name, oracleText, typeLine = "Instant", extra = {}) {
  return classifyPrintedCard({ name, oracleText, typeLine, ...extra });
}

test("mana that can only cast creature spells is not generic ramp", () => {
  const jaheira = card(
    "Jaheira, Friend of the Forest",
    "{T}: Add {G}. Spend this mana only to cast creature spells.",
    "Legendary Creature — Human Druid",
  );
  assert.equal(jaheira.ramp, false);
  assert.equal(jaheira.conditionalRamp, true);
  assert.match(jaheira.conditionalRampReason, /creature spells/i);
});

test("mana that can only cast one creature type is not generic ramp", () => {
  const dragons = card(
    "Dragon Stone",
    "{T}: Add {R}{R}. Spend this mana only to cast Dragon spells.",
    "Artifact",
  );
  assert.equal(dragons.ramp, false);
  assert.equal(dragons.conditionalRamp, true);
  assert.match(dragons.conditionalRampReason, /Dragon spells/);
});

test("Powerstone mana that cannot cast a nonartifact spell is not generic ramp", () => {
  const powerstone = card(
    "Powerstone",
    "{T}: Add {C}. This mana can't be spent to cast a nonartifact spell.",
    "Artifact — Powerstone",
  );
  assert.equal(powerstone.ramp, false);
  assert.equal(powerstone.conditionalRamp, true);
  assert.match(powerstone.conditionalRampReason, /artifact spells/i);

  const parenthetical = card(
    "Buried Powerstone",
    "{T}: Add {C}. ({T}: Add {C}. This mana can't be spent to cast a nonartifact spell.)",
    "Artifact",
  );
  assert.equal(parenthetical.ramp, false);
  assert.equal(parenthetical.conditionalRamp, true);
});

test("mana that can cast any spell is generic ramp", () => {
  const open = card("Open Stone", "{T}: Add {C}. Spend this mana only to cast a spell.", "Artifact");
  assert.equal(open.ramp, true);
  assert.equal(open.conditionalRamp, false);
});

test("taxed and conditional Treasure is not generic ramp", () => {
  const tithe = card(
    "Smothering Tithe",
    "Whenever an opponent draws a card, that player may pay {2}. If the player doesn't, you create a Treasure token.",
    "Enchantment",
  );
  const tax = card(
    "Monologue Tax",
    "Whenever an opponent casts their second spell each turn, you create a Treasure token.",
    "Enchantment",
  );
  const dockside = card(
    "Dockside Extortionist",
    "When Dockside Extortionist enters, create X Treasure tokens, where X is the number of artifacts and enchantments your opponents control. (Treasure tokens are artifacts with \"{T}, Sacrifice this artifact: Add one mana of any color.\")",
    "Creature — Goblin Pirate",
  );
  const heist = card(
    "The Great Train Heist",
    "Spree (Choose one or more additional costs.)\n• {2} — The Great Train Heist deals damage equal to the number of creatures you control to target creature.\n• {3} — Creatures you control get +1/+0 and gain haste until end of turn. If it's your combat phase, there is an additional combat phase after this phase.\n• {R} — Creatures you control gain first strike until end of turn. When this creature deals combat damage to a player this turn, create a Treasure token.",
    "Instant",
  );
  const ritual = card("Strike It Rich", "Create a Treasure token.", "Sorcery");
  for (const printed of [tithe, tax, dockside, heist, ritual]) {
    assert.equal(printed.ramp, false, printed.name);
    assert.equal(printed.conditionalRamp, true, printed.name);
  }
  assert.equal(heist.interaction, true);
  assert.equal(heist.wincon, true);
});

test("a repeating Treasure the deck can plan around is ramp", () => {
  const stash = card(
    "Bootleggers' Stash",
    "At the beginning of your end step, create a Treasure token for each land you control that doesn't have a stash counter on it. Then put a stash counter on each land you control.",
    "Artifact",
  );
  assert.equal(stash.ramp, true);
  assert.equal(stash.conditionalRamp, false);
});

test("Sol Ring and a land put onto the battlefield are generic ramp", () => {
  const sol = card("Sol Ring", "{T}: Add {C}{C}.", "Artifact", { manaCost: "{1}" });
  const cultivate = card(
    "Cultivate",
    "Search your library for up to two basic land cards, reveal those cards, put one onto the battlefield tapped and the other into your hand, then shuffle.",
    "Sorcery",
  );
  const elder = card(
    "Sakura-Tribe Elder",
    "Sacrifice Sakura-Tribe Elder: Search your library for a basic land card, put that card onto the battlefield tapped, then shuffle.",
    "Creature — Snake Shaman",
  );
  assert.equal(sol.ramp, true);
  assert.equal(cultivate.ramp, true);
  assert.equal(elder.ramp, true);
  assert.equal(elder.conditionalRamp, false);
});

test("sacrificing a creature for mana is not generic ramp", () => {
  const fodder = card("Priest of the Dead", "Sacrifice a creature: Add {B}{B}.", "Creature — Human Cleric");
  assert.equal(fodder.ramp, false);
  assert.equal(fodder.conditionalRamp, true);
  assert.match(fodder.conditionalRampReason, /sacrifice a creature/i);
});

test("a mana filter is not ramp", () => {
  const prism = card("Prophetic Prism", "{1}, {T}: Add one mana of any color.", "Artifact");
  assert.equal(prism.ramp, false);
  assert.equal(prism.conditionalRamp, false);
});

test("mana an opponent could produce is not fixing", () => {
  const fellwar = card(
    "Fellwar Stone",
    "{T}: Add one mana of any color that a land an opponent controls could produce.",
    "Artifact",
  );
  assert.equal(fellwar.ramp, true);
  assert.equal(fellwar.fixesColors, false);
  assert.equal(fellwar.opponentMana, true);
  assert.match(fellwar.notes.join(" "), /opponent/i);

  const orchard = card(
    "Exotic Orchard",
    "{T}: Add one mana of any color that a land an opponent controls could produce.",
    "Land",
  );
  assert.equal(orchard.land, true);
  assert.equal(orchard.ramp, false);
  assert.equal(orchard.fixesColors, false);
  assert.equal(orchard.opponentMana, true);
});

test("draw then discard is a loot, and a larger hand is card advantage", () => {
  const looting = card("Faithless Looting", "Draw two cards, then discard two cards.\nFlashback {2}{R}");
  const looter = card("Merfolk Looter", "{T}: Draw a card, then discard a card.", "Creature — Merfolk Rogue");
  const rummage = card("Rummage", "You may discard a card. If you do, draw a card.");
  const connive = card("Conniver", "When this creature enters, it connives.", "Creature — Human Rogue");
  for (const printed of [looting, looter, rummage, connive]) {
    assert.equal(printed.loot, true, printed.name);
    assert.equal(printed.draw, false, printed.name);
  }

  const thrill = card("Thrill of Possibility", "As an additional cost to cast this spell, discard a card.\nDraw two cards.");
  const whisper = card("Night's Whisper", "You draw two cards and you lose 2 life.");
  const chart = card("Chart a Course", "Draw two cards. Then discard a card unless you attacked this turn.");
  const impulse = card("Paid Impulse", "You may discard a card. If you do, draw two cards.");
  for (const printed of [thrill, whisper, chart, impulse]) {
    assert.equal(printed.draw, true, printed.name);
    assert.equal(printed.loot, false, printed.name);
  }
});

test("wheels and an opponent drawing are not this deck's card advantage", () => {
  const wheel = card("Wheel of Fortune", "Each player discards their hand, then draws seven cards.", "Sorcery");
  const nekusar = card(
    "Nekusar, the Mindrazer",
    "At the beginning of each player's draw step, that player draws an additional card.\nWhenever an opponent draws a card, Nekusar, the Mindrazer deals 1 damage to that player.",
    "Legendary Creature — Zombie Wizard",
  );
  assert.equal(wheel.draw, false);
  assert.equal(wheel.loot, false);
  assert.equal(nekusar.draw, false);
  assert.equal(nekusar.loot, false);
});

test("a modal spell counts as interaction when a mode is an answer", () => {
  const split = card(
    "Answer or Draw",
    "Choose one —\n• Destroy target creature.\n• Draw two cards.",
  );
  assert.equal(split.modal, true);
  assert.equal(split.interaction, true);
  assert.equal(split.draw, true);
  assert.equal(split.loot, false);
  assert.match(split.notes.join(" "), /mode is interaction/i);

  const abrade = card(
    "Abrade",
    "Choose one —\n• Abrade deals 3 damage to target creature.\n• Destroy target artifact.",
  );
  assert.equal(abrade.interaction, true);
  assert.equal(abrade.draw, false);

  const lootOrCounter = card(
    "Filter or Counter",
    "Choose one —\n• Draw a card, then discard a card.\n• Counter target spell.",
  );
  assert.equal(lootOrCounter.interaction, true);
  assert.equal(lootOrCounter.loot, true);
  assert.equal(lootOrCounter.draw, false);

  const drawOnly = card(
    "Draw or Draw",
    "Choose one —\n• Draw two cards.\n• Draw a card.",
  );
  assert.equal(drawOnly.interaction, false);
  assert.equal(drawOnly.draw, true);
});

test("a wipe is not single-target interaction, and a graveyard exile is not a wipe", () => {
  const wrath = card("Wrath of God", "Destroy all creatures. They can't be regenerated.", "Sorcery");
  const blasphemous = card(
    "Blasphemous Act",
    "This spell costs {1} less to cast for each creature on the battlefield.\nBlasphemous Act deals 13 damage to each creature.",
    "Sorcery",
  );
  const deluge = card(
    "Toxic Deluge",
    "As an additional cost to cast this spell, pay X life.\nAll creatures get -X/-X until end of turn.",
    "Sorcery",
  );
  for (const printed of [wrath, blasphemous, deluge]) {
    assert.equal(printed.wipes, true, printed.name);
    assert.equal(printed.interaction, false, printed.name);
  }

  const stretch = card("Time Stretch", "Take two extra turns after this one.", "Sorcery");
  assert.equal(stretch.wincon, true);

  const graves = card("Empty the Graves", "Exile all graveyards.", "Sorcery");
  assert.equal(graves.wipes, false);

  const farewell = card(
    "Farewell",
    "Choose one or more —\n• Exile all artifacts.\n• Exile all creatures.\n• Exile all enchantments.\n• Exile all graveyards.",
    "Sorcery",
  );
  assert.equal(farewell.wipes, true);
  assert.equal(farewell.interaction, false);

  const rift = card(
    "Cyclonic Rift",
    "Return target nonland permanent you don't control to its owner's hand.\nOverload {6}{U} (You may cast this spell for its overload cost. If you do, change \"target\" in its text to \"each.\")",
  );
  assert.equal(rift.interaction, true);
  assert.equal(rift.wipes, true);

  const both = card(
    "Wipe or Answer",
    "Choose one —\n• Destroy all creatures.\n• Destroy target creature.",
    "Sorcery",
  );
  assert.equal(both.wipes, true);
  assert.equal(both.interaction, true);
});
