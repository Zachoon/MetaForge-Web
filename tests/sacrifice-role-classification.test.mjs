import assert from "node:assert/strict";
import test from "node:test";
import { ROLE_PATTERNS } from "../app/blueprint-note-and-mana.mjs";
import { classifyNativeCard } from "../app/card-role-classification.mjs";

// =============================================================================
// Founder #086: the "sacrifice"/"sacrifices" verb-form and "dies"/"die"
// plural gaps #055/#062/#073 already found and fixed in native-masterwork-
// engine.mjs's and forge-interaction-graph.mjs's own sacrifice signals,
// duplicated here in blueprint-note-and-mana.mjs's own parallel role
// classifier — and this one is construction-critical (see card-role-
// classification.mjs's own header comment: classifyNativeCard feeds real
// deck-construction scoring, not just a cosmetic label). Confirmed via
// direct test: Diabolic Edict and Innocent Blood (real, classic
// forced-sacrifice edicts) returned zero roles at all — not even
// "sacrifice" — because the old pattern required first-person "sacrifice"
// immediately followed by a determiner, never the third-person
// "sacrifices" real edicts use. Also fixed the plural "die" verb form
// (Vraan, Executioner Thane's real "creatures you control die") and
// widened the "whenever...dies" window from 25 to 45 characters to fit
// Vraan's real, longer subject clause.
// =============================================================================

const diabolicEdict = { name: "Diabolic Edict", typeLine: "Instant", oracleText: "Target player sacrifices a creature of their choice." };
const innocentBlood = { name: "Innocent Blood", typeLine: "Sorcery", oracleText: "Each player sacrifices a creature of their choice." };
const viscereSeer = { name: "Viscera Seer", typeLine: "Creature", oracleText: "Sacrifice a creature: Scry 1." };
const yawgmoth = { name: "Yawgmoth, Thran Physician", typeLine: "Legendary Creature", oracleText: "Pay 1 life, Sacrifice another creature: Put a -1/-1 counter on up to one target creature and draw a card." };
const vraan = { name: "Vraan, Executioner Thane", typeLine: "Legendary Creature", oracleText: "Whenever one or more other creatures you control die, each opponent loses 2 life and you gain 2 life. This ability triggers only once each turn." };
const bolasCitadel = { name: "Bolas's Citadel", typeLine: "Legendary Artifact", oracleText: "You may look at the top card of your library any time.\nYou may play lands and cast spells from the top of your library. If you cast a spell this way, pay life equal to its mana value rather than pay its mana cost.\n{T}, Sacrifice ten nonland permanents: Each opponent loses 10 life." };

test("blueprint-note-and-mana.mjs's ROLE_PATTERNS.sacrifice recognizes the real third-person 'sacrifices' edict shape (Diabolic Edict, Innocent Blood), not just first-person 'sacrifice'", () => {
  const textOf = (card) => `${card.name}\n${card.typeLine}\n${card.oracleText}`;
  assert.equal(ROLE_PATTERNS.sacrifice.some((p) => p.test(textOf(diabolicEdict))), true);
  assert.equal(ROLE_PATTERNS.sacrifice.some((p) => p.test(textOf(innocentBlood))), true);
});

test("blueprint-note-and-mana.mjs's ROLE_PATTERNS.sacrifice still recognizes the pre-existing outlet-cost wording (Viscera Seer, Yawgmoth's 'sacrifice another')", () => {
  const textOf = (card) => `${card.name}\n${card.typeLine}\n${card.oracleText}`;
  assert.equal(ROLE_PATTERNS.sacrifice.some((p) => p.test(textOf(viscereSeer))), true);
  assert.equal(ROLE_PATTERNS.sacrifice.some((p) => p.test(textOf(yawgmoth))), true);
});

test("blueprint-note-and-mana.mjs's ROLE_PATTERNS.sacrifice recognizes the real plural 'creatures die' verb form (Vraan, Executioner Thane), not just singular 'dies'", () => {
  const textOf = (card) => `${card.name}\n${card.typeLine}\n${card.oracleText}`;
  assert.equal(ROLE_PATTERNS.sacrifice.some((p) => p.test(textOf(vraan))), true);
});

test("blueprint-note-and-mana.mjs's ROLE_PATTERNS.sacrifice recognizes a real specific-number quantifier (Bolas's Citadel: 'Sacrifice ten nonland permanents')", () => {
  const textOf = (card) => `${card.name}\n${card.typeLine}\n${card.oracleText}`;
  assert.equal(ROLE_PATTERNS.sacrifice.some((p) => p.test(textOf(bolasCitadel))), true);
});

test("card-role-classification.mjs's classifyNativeCard grants the 'sacrifice' role for real forced-sacrifice edicts (Diabolic Edict, Innocent Blood), which returned zero roles at all before this fix", () => {
  assert.ok(classifyNativeCard(diabolicEdict).includes("sacrifice"));
  assert.ok(classifyNativeCard(innocentBlood).includes("sacrifice"));
});

test("card-role-classification.mjs's classifyNativeCard still grants 'sacrifice' for real outlet-cost and death-payoff cards (Viscera Seer, Yawgmoth, Vraan, Bolas's Citadel)", () => {
  assert.ok(classifyNativeCard(viscereSeer).includes("sacrifice"));
  assert.ok(classifyNativeCard(yawgmoth).includes("sacrifice"));
  assert.ok(classifyNativeCard(vraan).includes("sacrifice"));
  assert.ok(classifyNativeCard(bolasCitadel).includes("sacrifice"));
});
