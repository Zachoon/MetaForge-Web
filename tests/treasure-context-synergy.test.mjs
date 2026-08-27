import test from "node:test";
import assert from "node:assert/strict";
import { extractMechanicalSignals } from "../app/forge-interaction-graph.mjs";
import { configureCardTagLookup, strategicSemanticsFor } from "../app/strategic-intent.mjs";

configureCardTagLookup(() => []);

const strikeItRich = {
  name: "Strike It Rich",
  typeLine: "Sorcery",
  manaCost: "{R}",
  cmc: 1,
  oracleText: "Create a Treasure token. Flashback {2}{R}.",
};

test("Treasure makers connect to Jaheira's reusable token-mana conversion", () => {
  const strike = extractMechanicalSignals(strikeItRich);
  const jaheira = extractMechanicalSignals({
    name: "Jaheira, Friend of the Forest",
    typeLine: "Legendary Creature — Human Elf Druid",
    oracleText: "Tokens you control have ‘{T}: Add {G}.’",
  });
  assert.ok(strike.produces.includes("persistent_token_mana"));
  assert.ok(jaheira.rewards.includes("persistent_token_mana"));
});

test("Treasure makers connect to Galazeth's reusable but spell-restricted artifact mana", () => {
  const strike = extractMechanicalSignals(strikeItRich);
  const galazeth = extractMechanicalSignals({
    name: "Galazeth Prismari",
    typeLine: "Legendary Creature — Elder Dragon",
    oracleText: "Artifacts you control have ‘{T}: Add one mana of any color. Spend this mana only to cast an instant or sorcery spell.’",
  });
  assert.ok(strike.produces.includes("persistent_artifact_mana"));
  assert.ok(galazeth.rewards.includes("persistent_artifact_mana"));
});

test("Strike It Rich carries spell-velocity value for storm without becoming ramp", () => {
  assert.ok(strategicSemanticsFor(strikeItRich).has("spell_velocity"));
  const strike = extractMechanicalSignals(strikeItRich);
  const stormPayoff = extractMechanicalSignals({
    name: "Test Storm Payoff",
    typeLine: "Creature",
    oracleText: "Whenever you cast an instant or sorcery spell, put a counter on this creature. Storm.",
  });
  assert.ok(strike.produces.includes("spell_velocity"));
  assert.ok(stormPayoff.rewards.includes("spell_velocity"));
});
