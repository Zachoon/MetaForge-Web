import assert from "node:assert/strict";
import test from "node:test";
import { describeCardJob, parseOracleMechanics } from "../app/reasoning-engine/oracle-mechanics.mjs";
import { linksBetween } from "../app/reasoning-engine/mechanic-graph.mjs";
import { buildDeckProfile, rolesOf } from "../app/reasoning-engine/deck-profile.mjs";
import { reasonAboutCandidate } from "../app/reasoning-engine/reasoner.mjs";
import { buildReasoningContext } from "../app/reasoning-engine/index.mjs";

const card = (name, typeLine, oracleText) => ({ name, typeLine, oracleText });

const GALAZETH = card(
  "Galazeth Prismari",
  "Legendary Creature — Elder Dragon",
  "Flying\nWhen Galazeth Prismari enters, create a Treasure token.\nArtifacts you control have \"{T}: Add one mana of any color. Spend this mana only to cast an instant or sorcery spell.\"",
);
const STORM = card(
  "Storm-Kiln Artist",
  "Creature — Dwarf Shaman",
  "Magecraft — Whenever you cast or copy an instant or sorcery spell, create a Treasure token. This creature gets +1/+0 for each artifact you control.",
);

function parsed(entry) {
  return parseOracleMechanics(entry);
}

test("Storm-Kiln Artist makes Treasure and counts artifacts; it does not spend them", () => {
  const mechanics = parsed(STORM);
  assert.ok(mechanics.produces.includes("treasure"));
  assert.ok(mechanics.listens.includes("spell-cast"));
  assert.ok(mechanics.scales.includes("artifact"));
  assert.ok(!mechanics.consumes.includes("artifact"));
  assert.ok(!mechanics.listens.includes("artifact-cast"));
  assert.ok(!mechanics.produces.includes("blink"));
  assert.equal(mechanics.rampMode, "unrestricted");
  assert.equal(mechanics.selfEtb, false);
  assert.ok(rolesOf(STORM).has("ramp"));
  assert.match(describeCardJob(STORM), /makes Treasure whenever you cast an instant or sorcery/);
  assert.match(describeCardJob(STORM), /without spending them/);
});

test("Galazeth's one enter Treasure is not a cast trigger, and Storm-Kiln does not spend the artifacts", () => {
  const galazeth = parsed(GALAZETH);
  assert.equal(galazeth.selfEtb, true);
  assert.ok(galazeth.produces.includes("treasure"));
  assert.ok(!galazeth.listens.includes("spell-cast"));
  assert.ok(!galazeth.produces.includes("blink"));
  assert.equal(galazeth.tapMode, "grant");
  assert.equal(galazeth.rampMode, "both");
  const mechanisms = [...linksBetween(GALAZETH, STORM), ...linksBetween(STORM, GALAZETH)].map((link) => link.mechanism);
  assert.ok(mechanisms.some((line) => /scales with the artifacts Galazeth Prismari makes, without spending them/.test(line)));
  assert.ok(mechanisms.some((line) => /Galazeth Prismari gives artifacts Storm-Kiln Artist makes an extra tap ability that can only be spent on instants and sorceries/.test(line)));
  assert.ok(mechanisms.some((line) => /Treasure already adds mana on its own/.test(line)));
  assert.ok(mechanisms.every((line) => !/spends|taps for mana/.test(line)));
});

test("Storm-Kiln under Galazeth is told the truth, at a confidence that matches the claim", () => {
  const ctx = buildReasoningContext({ commanders: [GALAZETH], picks: [] });
  assert.equal(ctx.profile.plan.id, "spellslinger");
  assert.equal(ctx.profile.plan.label, "Spells and artifact ramp");
  assert.ok(ctx.profile.plan.confidence >= 0.8);
  assert.equal(ctx.profile.plan.certaintyNote, null);
  assert.equal(ctx.profile.plan.model.selfEtb, true);
  assert.match(ctx.profile.plan.restrictionNote, /Treasure already adds mana on its own/);
  assert.match(ctx.profile.plan.restrictionNote, /extra tap ability|tap ability that can only be spent on instants and sorceries/);
  assert.notEqual(ctx.profile.plan.id, "blink");

  const reason = reasonAboutCandidate(STORM, { ...ctx, category: "synergyPieces" });
  assert.equal(reason.confidenceLabel, "high");
  assert.ok(reason.confidence >= 0.7);
  assert.equal(reason.confidenceNote, null);
  assert.match(reason.summary, /makes Treasure whenever you cast an instant or sorcery/);
  assert.doesNotMatch(reason.summary, /shell/);
  const text = reason.reasons.map((entry) => entry.text).join(" ");
  assert.match(text, /without spending them/);
  assert.match(text, /extra tap ability that can only be spent on instants and sorceries/);
  assert.match(text, /Treasure already adds mana on its own/);
  assert.doesNotMatch(text, /spends|taps for mana/);
  assert.match(text, /spells and artifact ramp/);
  assert.doesNotMatch(text, /blink|enter-the-battlefield/);
  assert.match(text, /ramp 0\/10/);
  assert.doesNotMatch(text, /core piece of your/);
});

test("a secondary that the plan label does not include is still named as off-plan", () => {
  const teysa = card("Teysa Karlov", "Legendary Creature — Human Advisor", "If a creature dying causes a triggered ability of a permanent you control to trigger, that ability triggers an additional time. Creature tokens you control have vigilance and lifelink.");
  const anthem = card("Token Anthem", "Enchantment", "Creature tokens you control get +1/+1.");
  const ctx = buildReasoningContext({ commanders: [teysa], picks: [] });
  assert.equal(ctx.profile.plan.coversSecondary, false);
  const text = reasonAboutCandidate(anthem, { ...ctx, category: "synergyPieces" }).reasons.map((entry) => entry.text).join(" ");
  assert.match(text, /pays off your go-wide tokens plan/);
  assert.match(text, /does not advance the aristocrats/);
});

test("a Treasure maker feeds Galazeth's hybrid plan, because one enter Treasure is ramp", () => {
  const ctx = buildReasoningContext({ commanders: [GALAZETH], picks: [] });
  const tithe = card("Smothering Tithe", "Enchantment", "Whenever an opponent draws a card, that player may pay {2}. If the player doesn't, you create a Treasure token.");
  const reason = reasonAboutCandidate(tithe, { ...ctx, category: "synergyPieces" });
  const text = reason.reasons.map((entry) => entry.text).join(" ");
  assert.match(text, /feeds your spells and artifact ramp plan/);
  assert.doesNotMatch(text, /does not advance/);
  assert.match(text, /Treasure already adds mana on its own/);
});

test("a job summary reads the nested card, including the printed name on an enter trigger", () => {
  const nested = {
    roles: ["ramp"],
    card: {
      name: "Dockside Extortionist",
      typeLine: "Creature — Goblin Pirate",
      oracleText: "When Dockside Extortionist enters, create a Treasure token.",
    },
  };
  assert.match(describeCardJob(nested), /makes Treasure when it enters/);
  assert.equal(describeCardJob({ card: STORM }), describeCardJob(STORM));
});

test("the commander who grants the mana is named, even when it is not in the first slot", () => {
  const partner = card("Partner Pal", "Legendary Creature — Human", "Partner");
  const ctx = buildReasoningContext({ commanders: [partner, GALAZETH], picks: [] });
  assert.equal(ctx.profile.plan.label, "Spells and artifact ramp");
  assert.ok(ctx.profile.plan.confidence >= 0.8);
  assert.equal(ctx.profile.plan.certaintyNote, null);
  assert.equal(ctx.profile.plan.model.selfEtb, true);
  const opt = card("Opt", "Instant", "Scry 1. Draw a card.");
  const text = reasonAboutCandidate(opt, { ...ctx, category: "draw" }).reasons.map((entry) => entry.text).join(" ");
  assert.match(text, /Galazeth Prismari's mana can pay for this/);
  assert.doesNotMatch(text, /Partner Pal's mana/);
});

test("a card with no shared mechanic is a thin read, and the wording says so", () => {
  const ctx = buildReasoningContext({ commanders: [GALAZETH], picks: [] });
  const vanilla = card("Colossal Dreadmaw", "Creature — Dinosaur", "Trample");
  const reason = reasonAboutCandidate(vanilla, { ...ctx, category: "synergyPieces" });
  assert.equal(reason.confidenceLabel, "low");
  assert.ok(reason.confidence < 0.45);
  assert.match(reason.confidenceNote, /thin/);
  assert.match(reason.confidenceNote, /would raise it/);
  assert.match(reason.summary, /thin fit/);
  const text = reason.reasons.map((entry) => entry.text).join(" ");
  assert.match(text, /doesn't advance your spells and artifact ramp plan/);
  assert.doesNotMatch(text, /feeds and pays off|core piece of your/);
});

test("treasure producers fill the ramp gap; spend-only mana does not", () => {
  const smothering = card("Smothering Tithe", "Enchantment", "Whenever an opponent draws a card, that player may pay {2}. If the player doesn't, you create a Treasure token.");
  const lotus = card("Jeweled Lotus", "Artifact", "{T}, Sacrifice Jeweled Lotus: Add three mana of any one color. Spend this mana only to cast your commander.");
  const giada = card("Giada, Font of Hope", "Legendary Creature — Angel", "Flying, vigilance. Each other Angel you control enters with an additional +1/+1 counter on it for each Angel you already control. {T}: Add {W}. Spend this mana only to cast an Angel spell.");
  assert.equal(parsed(smothering).rampMode, "unrestricted");
  assert.ok(!rolesOf(smothering).has("draw"), "an opponent drawing is not this card drawing");
  assert.ok(rolesOf(smothering).has("ramp"));
  assert.equal(parsed(lotus).rampMode, "conditional");
  assert.ok(!rolesOf(lotus).has("ramp"));
  assert.equal(parsed(giada).rampMode, "conditional");
  assert.ok(!rolesOf(giada).has("ramp"));
  assert.equal(parsed(GALAZETH).rampMode, "both");
  assert.ok(rolesOf(GALAZETH).has("ramp"));

  const profile = buildDeckProfile({ commanders: [giada], picks: [smothering, lotus, STORM] });
  assert.equal(profile.roles.find((row) => row.role === "ramp").actual, 2, "Tithe and Storm-Kiln ramp; Jeweled Lotus does not");
});

const CORPUS = [
  {
    name: "Smothering Tithe",
    typeLine: "Enchantment",
    oracle: "Whenever an opponent draws a card, that player may pay {2}. If the player doesn't, you create a Treasure token.",
    produces: ["treasure"],
    refuses: { consumes: ["card-draw"], listens: ["spell-cast"] },
    rampMode: "unrestricted",
  },
  {
    name: "Dockside Extortionist",
    typeLine: "Creature — Goblin Pirate",
    oracle: "When Dockside Extortionist enters, create X Treasure tokens, where X is the number of artifacts and enchantments your opponents control.",
    produces: ["treasure"],
    refuses: { scales: ["artifact"], consumes: ["artifact"] },
    selfEtb: true,
    rampMode: "unrestricted",
    job: /makes Treasure when it enters/,
  },
  {
    name: "Academy Manufactor",
    typeLine: "Artifact Creature — Assembly-Worker",
    oracle: "If you would create a Clue, Food, or Treasure token, instead create one of each.",
    produces: ["clue", "food", "treasure"],
    refuses: { consumes: ["artifact", "clue", "food", "treasure"] },
    job: /replaces a Clue, Food, or Treasure/,
  },
  {
    name: "Pitiless Plunderer",
    typeLine: "Creature — Human Pirate",
    oracle: "Whenever another creature you control dies, create a Treasure token.",
    produces: ["treasure"],
    listens: ["creature-dies"],
    refuses: { consumes: ["creature-body", "treasure"] },
    job: /makes Treasure whenever a creature dies/,
  },
  {
    name: "Marionette Master",
    typeLine: "Creature — Human Artificer",
    oracle: "Fabricate 3 (When this creature enters, put three +1/+1 counters on it or create three 1/1 colorless Servo artifact creature tokens.) Whenever an artifact you control is put into a graveyard, target opponent loses life equal to Marionette Master's power.",
    listens: ["artifact-leaves"],
    refuses: { consumes: ["artifact"] },
    job: /leaving the battlefield/,
  },
  {
    name: "Krark-Clan Ironworks",
    typeLine: "Artifact",
    oracle: "{T}, Sacrifice an artifact: Add {C}{C}.",
    consumes: ["artifact"],
    verb: ["artifact", "sacrifices"],
    rampMode: "unrestricted",
  },
  {
    name: "Ashnod's Altar",
    typeLine: "Artifact",
    oracle: "Sacrifice a creature: Add {C}{C}.",
    consumes: ["creature-body"],
    verb: ["creature-body", "sacrifices"],
  },
  {
    name: "Panharmonicon",
    typeLine: "Artifact",
    oracle: "If an artifact or creature entering the battlefield causes a triggered ability of a permanent you control to trigger, that ability triggers an additional time.",
    listens: ["etb-value"],
    doublesEtb: true,
    refuses: { produces: ["blink"] },
  },
  {
    name: "Soul Warden",
    typeLine: "Creature — Human Cleric",
    oracle: "Whenever another creature enters, you gain 1 life.",
    listens: ["creature-enters"],
    produces: ["lifegain"],
    refuses: { consumes: ["creature-body"] },
  },
  {
    name: "Blood Artist",
    typeLine: "Creature — Vampire",
    oracle: "Whenever Blood Artist or another creature dies, target player loses 1 life and you gain 1 life.",
    listens: ["creature-dies"],
    produces: ["lifegain", "life-drain"],
    refuses: { consumes: ["creature-body"] },
  },
  {
    name: "Young Pyromancer",
    typeLine: "Creature — Human Shaman",
    oracle: "Whenever you cast an instant or sorcery spell, create a 1/1 red Elemental creature token.",
    listens: ["spell-cast"],
    produces: ["creature-token"],
    refuses: { consumes: ["spell-cast"] },
  },
  {
    name: "Guttersnipe",
    typeLine: "Creature — Goblin Shaman",
    oracle: "Whenever you cast an instant or sorcery spell, Guttersnipe deals 2 damage to each opponent.",
    listens: ["spell-cast"],
    refuses: { consumes: ["spell-cast"] },
    job: /deals damage whenever you cast an instant or sorcery/,
  },
  {
    name: "Mentor of the Meek",
    typeLine: "Creature — Human Soldier",
    oracle: "Whenever another creature with power 2 or less enters, you may pay {1}. If you do, draw a card.",
    listens: ["creature-enters"],
    produces: ["card-draw"],
    refuses: { consumes: ["creature-body"] },
  },
  {
    name: "Rhystic Study",
    typeLine: "Enchantment",
    oracle: "Whenever an opponent casts a spell, you may draw a card unless that player pays {1}.",
    refuses: { listens: ["spell-cast"] },
    produces: ["card-draw"],
  },
  {
    name: "Esper Sentinel",
    typeLine: "Artifact Creature — Human Soldier",
    oracle: "Whenever an opponent casts their first noncreature spell each turn, draw a card unless that player pays {X}, where X is Esper Sentinel's power.",
    refuses: { listens: ["spell-cast"] },
    produces: ["card-draw"],
  },
  {
    name: "Skullclamp",
    typeLine: "Artifact — Equipment",
    oracle: "Equipped creature gets +1/-1. Whenever equipped creature dies, draw two cards. Equip {1}.",
    listens: ["creature-dies"],
    produces: ["card-draw"],
    refuses: { consumes: ["creature-body"] },
  },
  {
    name: "Purphoros, God of the Forge",
    typeLine: "Legendary Enchantment Creature — God",
    oracle: "Indestructible. As long as your devotion to red is less than five, Purphoros isn't a creature. Whenever another creature you control enters, Purphoros deals 2 damage to each opponent.",
    listens: ["creature-enters"],
    refuses: { consumes: ["creature-body"] },
  },
  {
    name: "Impact Tremors",
    typeLine: "Enchantment",
    oracle: "Whenever a creature you control enters, this enchantment deals 1 damage to each opponent.",
    listens: ["creature-enters"],
    refuses: { consumes: ["creature-body"] },
  },
  {
    name: "Doubling Season",
    typeLine: "Enchantment",
    oracle: "If an effect would create one or more tokens under your control, it creates twice that many of those tokens instead. If an effect would put one or more counters on a permanent you control, it puts twice that many of those counters on that permanent instead.",
    produces: ["token", "counter"],
    refuses: { consumes: ["token", "counter"] },
    job: /doubles tokens or counters/,
  },
  {
    name: "Cranial Plating",
    typeLine: "Artifact — Equipment",
    oracle: "Equipped creature gets +1/+0 for each artifact you control. Equip {1}.",
    scales: ["artifact"],
    refuses: { consumes: ["artifact"] },
  },
  {
    name: "All That Glitters",
    typeLine: "Enchantment — Aura",
    oracle: "Enchant creature. Enchanted creature gets +1/+1 for each artifact and/or enchantment you control.",
    scales: ["artifact"],
    refuses: { consumes: ["artifact"] },
  },
  {
    name: "Professional Face-Breaker",
    typeLine: "Creature — Human Warrior",
    oracle: "Menace. Whenever one or more creatures you control deal combat damage to a player, create a Treasure token. Sacrifice a Treasure: You may cast a spell from among cards exiled with this creature without paying its mana cost.",
    produces: ["treasure"],
    consumes: ["treasure"],
    verb: ["treasure", "sacrifices"],
  },
  {
    name: "Goldspan Dragon",
    typeLine: "Creature — Dragon",
    oracle: "Flying, haste. Whenever Goldspan Dragon attacks or a Treasure you control enters, create a Treasure token. Treasures you control have \"{T}, Sacrifice this artifact: Add two mana of any one color.\"",
    produces: ["treasure"],
    consumes: ["treasure", "artifact"],
    verb: ["artifact", "sacrifices"],
  },
];

test("producer, payoff, and outlet cards keep their direction", () => {
  for (const spec of CORPUS) {
    const mechanics = parsed(card(spec.name, spec.typeLine, spec.oracle));
    for (const resource of spec.produces || []) assert.ok(mechanics.produces.includes(resource), `${spec.name} produces ${resource}`);
    for (const resource of spec.listens || []) assert.ok(mechanics.listens.includes(resource), `${spec.name} listens ${resource}`);
    for (const resource of spec.scales || []) assert.ok(mechanics.scales.includes(resource), `${spec.name} scales ${resource}`);
    for (const resource of spec.consumes || []) assert.ok(mechanics.consumes.includes(resource), `${spec.name} consumes ${resource}`);
    for (const [bucket, resources] of Object.entries(spec.refuses || {})) {
      for (const resource of resources) assert.ok(!mechanics[bucket].includes(resource), `${spec.name} must not ${bucket} ${resource}`);
    }
    if (spec.verb) assert.equal(mechanics.spendVerbs[spec.verb[0]], spec.verb[1], spec.name);
    if (spec.rampMode) assert.equal(mechanics.rampMode, spec.rampMode, spec.name);
    if (spec.selfEtb !== undefined) assert.equal(mechanics.selfEtb, spec.selfEtb, spec.name);
    if (spec.doublesEtb !== undefined) assert.equal(mechanics.doublesEtb, spec.doublesEtb, spec.name);
    if (spec.job) assert.match(describeCardJob(card(spec.name, spec.typeLine, spec.oracle)), spec.job, spec.name);
  }
});

test("Sai sacrifices Treasure; Reckless Fireweaver triggers when Treasure enters", () => {
  const treasure = card("Smothering Tithe", "Enchantment", "Whenever an opponent draws a card, that player may pay {2}. If the player doesn't, you create a Treasure token.");
  const sai = card("Sai, Master Thopterist", "Legendary Creature — Human Artificer", "Whenever you cast an artifact spell, create a 1/1 colorless Thopter artifact creature token with flying. {1}{U}, Sacrifice two artifacts: Draw a card.");
  const fireweaver = card("Reckless Fireweaver", "Creature — Human Artificer", "Whenever an artifact you control enters, Reckless Fireweaver deals 1 damage to each opponent.");
  const toSai = linksBetween(treasure, sai);
  assert.ok(toSai.some((link) => link.kind === "consumes" && link.resource === "artifact"));
  assert.ok(!toSai.some((link) => link.kind === "listens" && link.resource === "artifact-cast"));
  assert.match(toSai.find((link) => link.kind === "consumes").mechanism, /sacrifices/);
  const toFire = linksBetween(treasure, fireweaver);
  assert.ok(toFire.some((link) => link.kind === "listens" && link.resource === "artifact-enters"));
});

test("Jeweled Lotus says its mana does not fill the general ramp gap", () => {
  const lotus = card("Jeweled Lotus", "Artifact", "{T}, Sacrifice Jeweled Lotus: Add three mana of any one color. Spend this mana only to cast your commander.");
  const giada = card("Giada, Font of Hope", "Legendary Creature — Angel", "{T}: Add {W}. Spend this mana only to cast an Angel spell. Each other Angel you control enters with an additional +1/+1 counter on it for each Angel you already control.");
  const ctx = buildReasoningContext({ commanders: [giada], picks: [] });
  const reason = reasonAboutCandidate(lotus, { ...ctx, category: "ramp" });
  const text = reason.reasons.map((entry) => entry.text).join(" ");
  assert.match(text, /does not fill the general ramp gap/);
  assert.match(text, /commander/);
  assert.ok(!rolesOf(lotus).has("ramp"));
});
