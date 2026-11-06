import assert from "node:assert/strict";
import test from "node:test";
import "../app/native-masterwork-engine.mjs";
import { additionIssue, buildGhostQueue, diagnoseFreeDeck } from "../app/free-build-coach.mjs";

const card = (name, typeLine, manaCost, oracleText, extra = {}) => ({
  name, typeLine, manaCost, oracleText, colorIdentity: extra.colorIdentity || [], legal: extra.legal, ...extra,
});

const teysa = card(
  "Teysa Karlov",
  "Legendary Creature — Human Advisor",
  "{2}{W}{B}",
  "If a creature dying causes a triggered ability of a permanent you control to trigger, that ability triggers an additional time.",
  { colorIdentity: ["W", "B"] },
);
const solRing = card("Sol Ring", "Artifact", "{1}", "{T}: Add {C}{C}.", { colorIdentity: [] });
const signet = card("Arcane Signet", "Artifact", "{2}", "{T}: Add one mana of any color in your commander's color identity.", { colorIdentity: [] });
const mindStone = card("Mind Stone", "Artifact", "{2}", "{T}: Add {C}.\n{1}, {T}, Sacrifice Mind Stone: Draw a card.", { colorIdentity: [] });
const swords = card("Swords to Plowshares", "Instant", "{W}", "Exile target creature. Its controller gains life equal to its power.", { colorIdentity: ["W"] });
const bolt = card("Lightning Bolt", "Instant", "{R}", "Lightning Bolt deals 3 damage to any target.", { colorIdentity: ["R"], legal: true });
const plains = card("Plains", "Basic Land — Plains", "", "{T}: Add {W}.", { colorIdentity: ["W"] });

test("a partial list reports real role floors and starts on the largest open gap", () => {
  const diagnosis = diagnoseFreeDeck({
    commanders: [teysa],
    entries: [solRing, signet, mindStone],
    strategy: "Balanced midrange",
    deckSize: 100,
  });
  const ramp = diagnosis.steps.find((step) => step.id === "ramp");
  assert.equal(ramp.countText, "3/10");
  assert.equal(ramp.actual, 3);
  assert.equal(ramp.target, 10);
  assert.equal(ramp.done, false);
  const lands = diagnosis.steps.find((step) => step.id === "lands");
  assert.equal(lands.countText, "0/35");
  assert.equal(diagnosis.currentId, "lands");
  assert.equal(diagnosis.steps[0].id, "lands");
  assert.equal(diagnosis.strategy, "Balanced midrange");
  assert.equal(diagnosis.cardCount, 3);
  assert.equal(diagnosis.types.Artifacts, 3);
});

test("a stored power tier changes the fundamental floors and a full ramp step is done", () => {
  const casual = diagnoseFreeDeck({
    commanders: [teysa],
    entries: [],
    targetPowerTier: "Casual",
  });
  const focused = diagnoseFreeDeck({
    commanders: [teysa],
    entries: [],
    targetPowerTier: "Focused",
  });
  assert.equal(casual.steps.find((step) => step.id === "interaction").target, 6);
  assert.equal(focused.steps.find((step) => step.id === "interaction").target, 8);
  assert.equal(casual.targetPowerTier, "Casual");

  const filled = diagnoseFreeDeck({
    commanders: [teysa],
    entries: [
      solRing, signet, mindStone,
      card("Fellwar Stone", "Artifact", "{2}", "{T}: Add one mana of any color that a land an opponent controls could produce."),
      card("Thought Vessel", "Artifact", "{2}", "{T}: Add {C}."),
      card("Commander Sphere", "Artifact", "{3}", "{T}: Add one mana of any color in your commander's color identity."),
      card("Llanowar Elves", "Creature — Elf Druid", "{G}", "{T}: Add {G}.", { colorIdentity: ["G"] }),
      card("Birds of Paradise", "Creature — Bird", "{G}", "Flying\n{T}: Add one mana of any color.", { colorIdentity: ["G"] }),
      card("Cultivate", "Sorcery", "{2}{G}", "Search your library for up to two basic land cards, put one onto the battlefield tapped and the other into your hand, then shuffle.", { colorIdentity: ["G"] }),
      card("Kodama's Reach", "Sorcery", "{2}{G}", "Search your library for up to two basic land cards, put one onto the battlefield tapped and the other into your hand, then shuffle.", { colorIdentity: ["G"] }),
    ],
    targetPowerTier: "Focused",
  });
  const ramp = filled.steps.find((step) => step.id === "ramp");
  assert.ok(ramp.actual >= 10, `expected at least 10 ramp, got ${ramp.actual}`);
  assert.equal(ramp.done, true);
  assert.ok(filled.steps.at(-1).done || filled.steps.filter((step) => step.done).length > 0);
  assert.notEqual(filled.steps[0].id, "ramp");
});

test("ghost proposals are ranked from the suggestion engine and never change the counts", () => {
  const entries = [solRing, signet, mindStone];
  const before = diagnoseFreeDeck({ commanders: [teysa], entries, targetPowerTier: "Focused" });
  const ghosts = buildGhostQueue({
    diagnosis: before,
    entries,
    commanders: [teysa],
    pool: [plains, swords, card("Night's Whisper", "Instant", "{1}{B}", "You draw two cards and you lose 2 life.", { colorIdentity: ["B"] }), solRing],
    targetPowerTier: "Focused",
  });
  const after = diagnoseFreeDeck({ commanders: [teysa], entries, targetPowerTier: "Focused" });
  assert.equal(after.steps.find((step) => step.id === "ramp").countText, before.steps.find((step) => step.id === "ramp").countText);
  assert.equal(ghosts[0].stepId, "lands");
  assert.equal(ghosts[0].primary.name, "Plains");
  assert.match(ghosts[0].primary.caption, /Lands are 0\/35/);
  const offered = new Set(ghosts.flatMap((ghost) => [ghost.primary.name, ghost.runnerUp?.name].filter(Boolean)));
  assert.equal(offered.has("Sol Ring"), false);
  assert.ok(ghosts.some((ghost) => ghost.stepId === "interaction" && ghost.primary.name === "Swords to Plowshares"));
  const interaction = ghosts.find((ghost) => ghost.stepId === "interaction");
  assert.match(interaction.primary.caption, /Swords to Plowshares/);
  assert.equal(interaction.primary.section, "Instants");
});

test("color identity, commander legality, and the singleton rule reject an add", () => {
  assert.match(additionIssue(bolt, { commanders: [teysa], existing: [] }), /Outside your commander's colors \(R\)/);
  const mesa = card("Arid Mesa", "Land", "", "{T}, Pay 1 life, Sacrifice this land: Search your library for a Mountain or Plains card, put it onto the battlefield, then shuffle.", { colorIdentity: [] });
  assert.match(additionIssue(mesa, { commanders: [teysa], existing: [] }), /Outside your commander's colors/);
  assert.match(
    additionIssue({ ...swords, legal: false }, { commanders: [teysa], existing: [] }),
    /not legal in Commander/,
  );
  assert.match(additionIssue(solRing, { commanders: [teysa], existing: [solRing] }), /one copy/);
  assert.equal(additionIssue(plains, { commanders: [teysa], existing: [{ ...plains, quantity: 4 }] }), null);
  assert.match(additionIssue(teysa, { commanders: [teysa], existing: [] }), /already the commander/);
});
