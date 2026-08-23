import assert from "node:assert/strict";
import test from "node:test";
import { ROLE_PATTERNS } from "../app/blueprint-note-and-mana.mjs";
import { classifyNativeCard } from "../app/card-role-classification.mjs";

// =============================================================================
// Founder #089: "extra combat" is not real Magic phrasing at all — verified
// via Scryfall, zero real cards use this exact phrase, making the whole
// alternative dead code since ROLE_PATTERNS.combat was written. The actual,
// standard real template is "additional combat phase" (46 real cards via
// Scryfall) — forge-interaction-graph.mjs's own combat-doubler amplifier (a
// different signal, same underlying rules fact) and archetype-catalog.mjs's
// own note aliases both already correctly use this real phrase; this file's
// ROLE_PATTERNS was the one place still using the never-real "extra combat"
// text. Confirmed via direct test: Aggravated Assault, one of the format's
// most iconic extra-combat enablers, returned no "combat" role at all.
// =============================================================================

const aggravatedAssault = { name: "Aggravated Assault", typeLine: "Artifact", oracleText: "{2}{R}{R}, {T}: Untap all creatures you control. After this main phase, there is an additional combat phase followed by an additional main phase." };
const combatCelebrant = { name: "Combat Celebrant", typeLine: "Creature", oracleText: "If this creature hasn't been exerted this turn, you may exert it as it attacks. When you do, untap all other creatures you control and after this phase, there is an additional combat phase." };

test("blueprint-note-and-mana.mjs's ROLE_PATTERNS.combat recognizes the real 'additional combat phase' shape (Aggravated Assault, Combat Celebrant), not the never-real 'extra combat' phrase", () => {
  const textOf = (card) => `${card.name}\n${card.typeLine}\n${card.oracleText}`;
  assert.equal(ROLE_PATTERNS.combat.some((p) => p.test(textOf(aggravatedAssault))), true);
  assert.equal(ROLE_PATTERNS.combat.some((p) => p.test(textOf(combatCelebrant))), true);
});

test("card-role-classification.mjs's classifyNativeCard grants the 'combat' role for real extra-combat enablers (Aggravated Assault, Combat Celebrant), which returned no 'combat' role at all before this fix", () => {
  assert.ok(classifyNativeCard(aggravatedAssault).includes("combat"));
  assert.ok(classifyNativeCard(combatCelebrant).includes("combat"));
});
