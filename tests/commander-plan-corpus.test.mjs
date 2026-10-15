import assert from "node:assert/strict";
import test from "node:test";
import { parseOracleMechanics } from "../app/reasoning-engine/oracle-mechanics.mjs";
import { readCommanderPlan, rolesOf } from "../app/reasoning-engine/deck-profile.mjs";
import { planSupportOf } from "../app/reasoning-engine/deck-profile.mjs";

const card = (name, typeLine, oracleText) => ({ name, typeLine, oracleText });

const COMMANDERS = [
  {
    name: "Galazeth Prismari",
    typeLine: "Legendary Creature — Dragon Wizard",
    oracle: "Whenever you cast an instant or sorcery spell, create a Treasure token. Artifacts you control have \"{T}: Add one mana of any color. Spend this mana only to cast instant or sorcery spells.\"",
    id: "spellslinger",
    label: "Spells and artifact ramp",
    minConfidence: 0.8,
    rampMode: "both",
    selfEtb: false,
    note: /Treasure tokens are still general ramp/,
    notId: "blink",
  },
  {
    name: "Veyran, Voice of Duality",
    typeLine: "Legendary Creature — Efreet Wizard",
    oracle: "Whenever you cast or copy an instant or sorcery spell, Veyran, Voice of Duality gets +1/+1 until end of turn. If you casting or copying an instant or sorcery spell causes a triggered ability of a permanent you control to trigger, that ability triggers an additional time.",
    id: "spellslinger",
    notId: "blink",
    listens: ["spell-cast"],
  },
  {
    name: "Kalamax, the Stormsire",
    typeLine: "Legendary Creature — Elemental Dinosaur",
    oracle: "Whenever you cast your first instant spell each turn, if Kalamax, the Stormsire is tapped, copy that spell. You may choose new targets for the copy. Whenever you copy an instant spell, put a +1/+1 counter on Kalamax, the Stormsire. This ability triggers only once each turn.",
    id: "spellslinger",
    listens: ["spell-cast"],
    restrictions: ["once-each-turn", "while-tapped"],
    note: /only while it is tapped/,
    notId: "blink",
  },
  {
    name: "Mizzix of the Izmagnus",
    typeLine: "Legendary Creature — Goblin Wizard",
    oracle: "Whenever you cast an instant or sorcery spell with mana value greater than the number of experience counters you have, you get an experience counter. Instant and sorcery spells you cast cost {1} less to cast for each experience counter you have.",
    id: "spellslinger",
    listens: ["spell-cast"],
    refusesProduce: ["counter"],
    notId: "blink",
  },
  {
    name: "Yawgmoth, Thran Physician",
    typeLine: "Legendary Creature — Human Cleric",
    oracle: "{B}, Pay 1 life: Draw a card. Activate only as a sorcery. Whenever you sacrifice another nontoken creature, proliferate. {1}{B}, Sacrifice another creature: Put a -1/-1 counter on up to one target creature and draw a card. This ability can be activated only as a sorcery and only once each turn.",
    id: "aristocrats",
    restrictions: ["nontoken", "once-each-turn"],
    notId: "blink",
    notLabel: /life gain/i,
  },
  {
    name: "Giada, Font of Hope",
    typeLine: "Legendary Creature — Angel",
    oracle: "Flying, vigilance. Each other Angel you control enters with an additional +1/+1 counter on it for each Angel you already control. {T}: Add {W}. Spend this mana only to cast an Angel spell.",
    id: "typal",
    label: "Angels",
    minConfidence: 0.8,
    rampMode: "conditional",
    noRampRole: true,
    secondary: null,
    restrictions: ["spend-only"],
    note: /Angel spells/,
    notId: "blink",
  },
  {
    name: "Goreclaw, Terror of Qal Sisma",
    typeLine: "Legendary Creature — Bear",
    oracle: "Goreclaw, Terror of Qal Sisma gets +1/+1 for each other creature you control with power 4 or greater. Creature spells you cast with power 4 or greater cost {2} less to cast. Whenever Goreclaw, Terror of Qal Sisma attacks, each creature you control with power 4 or greater gets +1/+1 and gains trample until end of turn.",
    id: "big-creatures",
    label: "Big creatures (power 4 or greater)",
    notId: "tokens",
  },
  {
    name: "Brago, King Eternal",
    typeLine: "Legendary Creature — Spirit Noble",
    oracle: "Flying. Whenever Brago, King Eternal deals combat damage to a player, exile any number of target nonland permanents you control, then return those cards to the battlefield under their owner's control.",
    id: "blink",
    minConfidence: 0.8,
    produces: ["blink"],
  },
  {
    name: "Yarok, the Desecrated",
    typeLine: "Legendary Creature — Elemental Horror",
    oracle: "Deathtouch, lifelink. If a permanent entering the battlefield causes a triggered ability of a permanent you control to trigger, that ability triggers an additional time.",
    id: "blink",
    minConfidence: 0.8,
    doublesEtb: true,
    selfEtb: false,
  },
  {
    name: "Korvold, Fae-Cursed King",
    typeLine: "Legendary Creature — Dragon Noble",
    oracle: "Flying. Whenever Korvold, Fae-Cursed King enters or attacks, sacrifice another permanent. Whenever you sacrifice a permanent, put a +1/+1 counter on Korvold, Fae-Cursed King and draw a card.",
    id: "aristocrats",
    selfEtb: true,
    notId: "blink",
  },
  {
    name: "Pantlaza, Sun-Favored",
    typeLine: "Legendary Creature — Dinosaur",
    oracle: "Whenever Pantlaza, Sun-Favored or another Dinosaur you control enters, you may discover X, where X is that creature's toughness. Do this only once each turn.",
    id: "typal",
    label: "Dinosaurs",
    restrictions: ["once-each-turn"],
    notId: "blink",
  },
  {
    name: "Urza, Lord High Artificer",
    typeLine: "Legendary Creature — Human Artificer",
    oracle: "When Urza, Lord High Artificer enters, create a 0/0 colorless Construct artifact creature token with \"This creature gets +1/+1 for each artifact you control.\" Tap an untapped artifact you control: Add {U}.",
    id: "artifacts",
    taps: ["artifact"],
    selfEtb: true,
    refusesConsume: ["artifact"],
    rampMode: "unrestricted",
    notId: "blink",
  },
  {
    name: "Jhoira, Weatherlight Captain",
    typeLine: "Legendary Creature — Human Artificer",
    oracle: "Whenever you cast a historic spell, draw a card.",
    id: "historic",
    label: "Historic spells",
    minConfidence: 0.8,
    listens: ["historic"],
    notId: "spellslinger",
  },
  {
    name: "The Ur-Dragon",
    typeLine: "Legendary Creature — Dragon Avatar",
    oracle: "Eminence — As long as The Ur-Dragon is in the command zone or on the battlefield, other Dragon spells you cast cost {1} less to cast. Flying. Whenever one or more Dragons you control attack, draw that many cards, then you may put a permanent card from your hand onto the battlefield.",
    id: "typal",
    label: "Dragons",
    secondary: null,
    notId: "blink",
  },
  {
    name: "Atraxa, Praetors' Voice",
    typeLine: "Legendary Creature — Phyrexian Angel Horror",
    oracle: "Flying, vigilance, deathtouch, lifelink. At the beginning of your end step, proliferate.",
    id: "counters",
    notId: "blink",
    typal: null,
  },
  {
    name: "Sythis, Harvest's Hand",
    typeLine: "Legendary Enchantment Creature — Nymph",
    oracle: "Whenever you cast an enchantment spell, you gain 1 life and draw a card.",
    id: "enchantress",
    listens: ["enchantment-cast"],
    refusesListen: ["spell-cast"],
    notId: "spellslinger",
  },
  {
    name: "Talrand, Sky Summoner",
    typeLine: "Legendary Creature — Merfolk Wizard",
    oracle: "Whenever you cast an instant or sorcery spell, create a 2/2 blue Drake creature token with flying.",
    id: "spellslinger",
  },
  {
    name: "Teysa Karlov",
    typeLine: "Legendary Creature — Human Advisor",
    oracle: "If a creature dying causes a triggered ability of a permanent you control to trigger, that ability triggers an additional time. Creature tokens you control have vigilance and lifelink.",
    id: "aristocrats",
  },
  {
    name: "Chulane, Teller of Tales",
    typeLine: "Legendary Creature — Human Druid",
    oracle: "Whenever you cast a creature spell, draw a card, then you may put a land card from your hand onto the battlefield. {3}, {T}: Return target creature you control to its owner's hand.",
    id: "creatures",
    label: "Creature spells and land drops",
    listens: ["creature-cast"],
    refusesListen: ["creature-enters"],
    notId: "blink",
  },
  {
    name: "Dockside Extortionist",
    typeLine: "Legendary Creature — Goblin Pirate",
    oracle: "When Dockside Extortionist enters, create X Treasure tokens, where X is the number of artifacts and enchantments your opponents control.",
    id: "artifacts",
    label: "Treasure and artifacts",
    selfEtb: true,
    refusesScale: ["artifact"],
    notId: "blink",
    rampMode: "unrestricted",
  },
  {
    name: "One-Shot Treasurer",
    typeLine: "Legendary Creature — Human",
    oracle: "When One-Shot Treasurer enters, create a Treasure token.",
    id: "artifacts",
    label: "Treasure and artifacts",
    selfEtb: true,
    notId: "blink",
  },
];

test("commander plans come from rules text, and one enter ability is not a blink deck", () => {
  for (const spec of COMMANDERS) {
    const entry = card(spec.name, spec.typeLine, spec.oracle);
    const mechanics = parseOracleMechanics(entry);
    const plan = readCommanderPlan([entry]);
    assert.equal(plan.id, spec.id, spec.name);
    if (spec.label) assert.equal(plan.label, spec.label, spec.name);
    if (spec.minConfidence) assert.ok(plan.confidence >= spec.minConfidence, `${spec.name} confidence ${plan.confidence}`);
    if (spec.minConfidence >= 0.7) assert.equal(plan.certaintyNote, null, spec.name);
    if (spec.notId) assert.notEqual(plan.id, spec.notId, spec.name);
    if (spec.notLabel) assert.doesNotMatch(plan.label, spec.notLabel, spec.name);
    if (spec.note) assert.match(plan.restrictionNote || "", spec.note, spec.name);
    if ("secondary" in spec) assert.equal(plan.secondary, spec.secondary, spec.name);
    if (spec.rampMode) assert.equal(mechanics.rampMode, spec.rampMode, spec.name);
    if (spec.selfEtb !== undefined) assert.equal(mechanics.selfEtb, spec.selfEtb, spec.name);
    if (spec.doublesEtb !== undefined) assert.equal(mechanics.doublesEtb, spec.doublesEtb, spec.name);
    if (spec.typal !== undefined) assert.equal(mechanics.typal, spec.typal, spec.name);
    if (spec.noRampRole) assert.ok(!rolesOf(entry).has("ramp"), spec.name);
    for (const resource of spec.listens || []) assert.ok(mechanics.listens.includes(resource), `${spec.name} listens ${resource}`);
    for (const resource of spec.taps || []) assert.ok(mechanics.taps.includes(resource), `${spec.name} taps ${resource}`);
    for (const resource of spec.produces || []) assert.ok(mechanics.produces.includes(resource), `${spec.name} produces ${resource}`);
    for (const resource of spec.refusesProduce || []) assert.ok(!mechanics.produces.includes(resource), `${spec.name} produces ${resource}`);
    for (const resource of spec.refusesListen || []) assert.ok(!mechanics.listens.includes(resource), `${spec.name} listens ${resource}`);
    for (const resource of spec.refusesConsume || []) assert.ok(!mechanics.consumes.includes(resource), `${spec.name} consumes ${resource}`);
    for (const resource of spec.refusesScale || []) assert.ok(!mechanics.scales.includes(resource), `${spec.name} scales ${resource}`);
    for (const kind of spec.restrictions || []) assert.ok(mechanics.restrictions.some((entry) => entry.kind === kind), `${spec.name} restriction ${kind}`);
  }
});

test("a type line alone is a forming plan, and a creature type line is not enchantress", () => {
  const background = card("Raised by Giants", "Legendary Enchantment — Background", "Commander creatures you own have base power and toughness 10/10 and are Giants in addition to their other types.");
  const plan = readCommanderPlan([background]);
  assert.equal(plan.id, "enchantress");
  assert.ok(plan.confidence < 0.5, `type-line plan was ${plan.confidence}`);
  assert.match(plan.certaintyNote, /still forming/);
  const creature = card("Raised by Giants", "Legendary Creature", background.oracle);
  assert.notEqual(readCommanderPlan([creature]).id, "enchantress");
});

test("an Angel feeds Giada's angel plan; a random elf does not", () => {
  const giada = card("Giada, Font of Hope", "Legendary Creature — Angel", "Flying, vigilance. Each other Angel you control enters with an additional +1/+1 counter on it for each Angel you already control. {T}: Add {W}. Spend this mana only to cast an Angel spell.");
  const plan = readCommanderPlan([giada]);
  const angel = card("Angel of Destiny", "Creature — Angel", "Flying. Whenever Angel of Destiny deals combat damage to a player, you gain 1 life.");
  const elf = card("Llanowar Elves", "Creature — Elf Druid", "{T}: Add {G}.");
  assert.equal(planSupportOf(angel, plan)?.id, "typal");
  assert.equal(planSupportOf(elf, plan), null);
});

test("Command Tower mana is color-identity mana, not spend-only commander mana", () => {
  const tower = parseOracleMechanics(card("Command Tower", "Land", "{T}: Add one mana of any color in your commander's color identity."));
  assert.ok(tower.restrictions.some((entry) => entry.kind === "color-identity"));
  assert.ok(!tower.restrictions.some((entry) => entry.kind === "spend-only"));
  assert.ok(!tower.effects.includes("ramp"));
});
