import assert from "node:assert/strict";
import test from "node:test";
import { classifyNativeCard } from "../app/card-role-classification.mjs";
import { strategicSemanticsFor, detectReanimatorCommander } from "../app/strategic-intent.mjs";
// Side-effect import: configures the real card-mechanics tag lookup.
import "../app/native-masterwork-engine.mjs";

// =============================================================================
// Founder #031: bounce is not recursion, and "put ... onto the battlefield"
// reanimation spells were invisible to the reanimator package
// =============================================================================
// Found auditing for more instances of the Founder #030 class of bug
// (a regex credits an effect for something its own text doesn't actually
// promise). Two distinct, real, high-impact misses in the same
// neighborhood:
//
// 1. ROLE_PATTERNS.recursion's "return target ... (graveyard|battlefield|
//    hand)" alternation let "hand" match on its own — Unsummon, Vapor Snag,
//    and Boomerang ("return target creature to its owner's hand") never
//    touch a graveyard at all, but were classified as the load-bearing
//    "recursion" role purely because they share the word "return" with
//    real graveyard recursion. Fixed by requiring "graveyard" to actually
//    appear as the stated source.
//
// 2. The reanimation semantic (and detectReanimatorCommander) required
//    literal "return ... from a graveyard to the battlefield" — but
//    Reanimate, Exhume, and Necromancy all say "put"/"puts", not "return",
//    and Animate Dead is an Aura whose "graveyard" and "battlefield"
//    mentions are in different sentences ("Enchant creature card in a
//    graveyard" / "Return enchanted creature card to the battlefield").
//    Four of the most-played reanimation spells in Magic's history were
//    getting ZERO reanimation credit — worse than Many Partings' problem,
//    the same "gets it backwards" shape found in Founder #030.
// =============================================================================

const unsummon = { name: "Unsummon", oracleText: "Return target creature to its owner's hand.", typeLine: "Instant", manaCost: "{U}" };
const vaporSnag = { name: "Vapor Snag", oracleText: "Return target creature to its owner's hand. Its controller loses 1 life.", typeLine: "Instant", manaCost: "{U}" };
const boomerang = { name: "Boomerang", oracleText: "Return target permanent to its owner's hand.", typeLine: "Instant", manaCost: "{1}{U}" };
const raiseDead = { name: "Raise Dead", oracleText: "Return target creature card from your graveyard to your hand.", typeLine: "Sorcery", manaCost: "{B}" };
const sunTitan = { name: "Sun Titan", oracleText: "Vigilance\nWhenever this creature enters or attacks, you may return target permanent card with mana value 3 or less from your graveyard to the battlefield.", typeLine: "Creature — Giant", manaCost: "{4}{W}{W}" };
// Named to avoid the coincidence where the literal card name "Reanimate"
// happens to satisfy the unrelated /reanimate/i fallback pattern on its
// own — this fixture proves the oracle-text regex itself, not the name.
const reanimateSpell = { name: "Bring Back", oracleText: "Put target creature card from a graveyard onto the battlefield under your control. You lose life equal to that card's mana value.", typeLine: "Sorcery", manaCost: "{B}" };
const exhume = { name: "Exhume", oracleText: "Each player puts a creature card from their graveyard onto the battlefield.", typeLine: "Sorcery", manaCost: "{1}{B}" };
const necromancy = { name: "Necromancy", oracleText: "Put target creature card from a graveyard onto the battlefield under your control and attach this enchantment to it.", typeLine: "Enchantment", manaCost: "{2}{B}" };
const animateDead = { name: "Animate Dead", oracleText: "Enchant creature card in a graveyard\nReturn enchanted creature card to the battlefield under your control and attach this Aura to it. Enchanted creature gets -1/-0.", typeLine: "Enchantment — Aura", manaCost: "{1}{B}" };

test("classifyNativeCard: bounce is interaction, never recursion — it doesn't touch a graveyard", () => {
  for (const card of [unsummon, vaporSnag, boomerang]) {
    const roles = classifyNativeCard(card);
    assert.ok(roles.includes("interaction"), `${card.name} is real interaction (bounce)`);
    assert.ok(!roles.includes("recursion"), `${card.name} never touches a graveyard, not recursion`);
  }
});

test("classifyNativeCard: real graveyard recursion (to hand or to the battlefield) keeps the recursion role", () => {
  for (const card of [raiseDead, sunTitan, reanimateSpell, exhume, necromancy]) {
    assert.ok(classifyNativeCard(card).includes("recursion"), `${card.name} is real graveyard recursion`);
  }
});

test("strategicSemanticsFor: the reanimation semantic covers put/return-onto-battlefield phrasing, not just \"return\"", () => {
  for (const card of [sunTitan, reanimateSpell, exhume, necromancy, animateDead]) {
    assert.ok(strategicSemanticsFor(card).has("reanimation"), `${card.name} reanimates a creature onto the battlefield`);
  }
  // Raise Dead brings a card back to HAND, not the battlefield — real
  // recursion, but not the reanimation semantic specifically.
  assert.ok(!strategicSemanticsFor(raiseDead).has("reanimation"));
  for (const card of [unsummon, vaporSnag, boomerang]) {
    assert.ok(!strategicSemanticsFor(card).has("reanimation"), `${card.name} is bounce, not reanimation`);
  }
});

test("detectReanimatorCommander: recognizes \"onto the battlefield\" phrasing and the Aura reanimator template, not just \"to the battlefield\"", () => {
  for (const card of [sunTitan, reanimateSpell, exhume, necromancy, animateDead]) {
    assert.ok(detectReanimatorCommander(card.oracleText), `${card.name} reanimates a creature onto the battlefield`);
  }
  assert.ok(!detectReanimatorCommander(raiseDead.oracleText));
  for (const card of [unsummon, vaporSnag, boomerang]) {
    assert.ok(!detectReanimatorCommander(card.oracleText), `${card.name} is bounce, not reanimation`);
  }
});
