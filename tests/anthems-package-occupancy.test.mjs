import assert from "node:assert/strict";
import test from "node:test";
import {
  buildStrategicIntent,
  cardIsPackageFalseFriend,
  cardSatisfiesPackageCore,
  cardSatisfiesPackageSupport,
} from "../app/strategic-intent.mjs";
import {
  commanderMechanicalScopes,
  forgeNativeMasterwork,
} from "../app/native-masterwork-engine.mjs";
import { detectTokensCommander } from "../app/strategic-intent.mjs";

// =============================================================================
// Founder #033 (batch 6) — Anthems
// =============================================================================
// Core is a real STATIC team-wide pump ("creatures you control get +X/+X").
// CRITICAL overlap risk named by the task: the original 10 PACKAGE_CATALOG's
// own `tokens` entry, since anthem effects are frequently paired with token
// strategies but are not the same promise. Kept disjoint by construction:
// every corePattern here requires the literal word "creatures" immediately
// before "you control get/have". Intangible Virtue ("Creature tokens you
// control get +1/+1 and have vigilance.") is the real card proving the
// boundary — the substring "creatures you control get" never appears (the
// actual adjacent words are "tokens you control get"), so corePatterns never
// match; the false-friend check's broader mention (bare "tokens you control
// get +1/+1") does match, correctly flagging her. The same real card is
// genuine SUPPORT for tokens (trips tokens' own token_payoff semantic
// directly) and a FALSE FRIEND here — the same real card legitimately
// occupying two different roles in two different archetypes.
// =============================================================================

const emptyBlueprint = {
  source: "",
  requestedMechanics: [],
  desiredRoles: [],
  packageSignals: [],
  promises: [],
};

function intentFor(commander, extraContext = {}) {
  return buildStrategicIntent(
    { format: "Commander", strategy: "Balanced midrange", commander },
    {
      blueprint: emptyBlueprint,
      commanderScopes: commanderMechanicalScopes(commander),
      ...extraContext,
    },
  );
}

// Real card, verified via Scryfall (2026-08-19): Elesh Norn, Grand Cenobite —
// a real legendary-creature commander whose own text is a pure static
// anthem, with zero "token" text at all.
const eleshNorn = {
  name: "Elesh Norn, Grand Cenobite",
  oracleText: "Vigilance\nOther creatures you control get +2/+2.\nCreatures your opponents control get -2/-2.",
  typeLine: "Legendary Creature — Phyrexian Praetor",
  manaCost: "{5}{W}{W}",
  colorIdentity: ["W"],
};

const inertGolem = {
  name: "Test Inert Golem",
  colors: [],
  oracleText: "Trample.",
  typeLine: "Legendary Creature — Golem",
  manaCost: "{4}",
};

// Real card, verified via Scryfall (2026-08-19): Intangible Virtue — the
// real token-anthem card proving the anthems/tokens boundary.
const intangibleVirtue = {
  name: "Intangible Virtue",
  oracleText: "Creature tokens you control get +1/+1 and have vigilance.",
  typeLine: "Enchantment",
  manaCost: "{1}{W}",
  colorIdentity: ["W"],
};

// Real card, verified via Scryfall (2026-08-19): a real tokens commander
// (see tests/token-package-occupancy.test.mjs for the tokens package's own
// commander-path convention) with zero "+X/+X" static pump text.
const krenko = {
  name: "Krenko, Mob Boss",
  oracleText: "{T}: Create X 1/1 red Goblin creature tokens, where X is the number of Goblins you control.",
  typeLine: "Legendary Creature — Goblin Warrior",
  manaCost: "{2}{R}{R}",
  colorIdentity: ["R"],
};

test("anthems opens on a real Anthems commander and stays closed on an unrelated one", () => {
  assert.ok(intentFor(eleshNorn).packageIds.includes("anthems"));
  assert.ok(!intentFor(inertGolem).packageIds.includes("anthems"));
});

test("anthems opens from a free-text note alias with an unrelated commander (note.aliases path)", () => {
  const intent = intentFor(inertGolem, { blueprint: { ...emptyBlueprint, source: "I want an anthems team pump deck" } });
  assert.ok(intent.packageIds.includes("anthems"));
});

test("anthems core requires the literal 'creatures you control get' construction, never satisfied by tokens' own token-scoped wording (wrong-target-scope)", () => {
  const intent = intentFor(eleshNorn);
  const genericPump = { name: "Test Generic Anthem Fragment", oracleText: "Other creatures you control get +1/+1.", typeLine: "Enchantment", manaCost: "{2}{W}" };
  assert.equal(cardSatisfiesPackageCore(genericPump, "anthems", intent), true);
  assert.equal(cardSatisfiesPackageCore(intangibleVirtue, "anthems", intent), false);
  assert.equal(cardIsPackageFalseFriend(intangibleVirtue, "anthems", intent), true);
  assert.equal(cardIsPackageFalseFriend(genericPump, "anthems", intent), false);
});

test("anthems support is a temporary/activated pump, not the static payoff itself", () => {
  const intent = intentFor(eleshNorn);
  const purphorosClause = { name: "Test Temporary Pump Fragment", oracleText: "{2}{R}: Creatures you control get +1/+0 until end of turn.", typeLine: "Legendary Enchantment Creature — God", manaCost: "{3}{R}" };
  assert.equal(cardSatisfiesPackageSupport(purphorosClause, "anthems", intent), true);
  assert.equal(cardSatisfiesPackageCore(purphorosClause, "anthems", intent), false);
  // A temporary pump is real support, not a false friend — it correctly
  // occupies the archetype at the support density level, not zero.
  assert.equal(cardIsPackageFalseFriend(purphorosClause, "anthems", intent), false);
});

test("anthems and tokens are disjoint: a real static-anthem commander doesn't cross-open tokens, and a real tokens commander doesn't open anthems", () => {
  assert.equal(detectTokensCommander(eleshNorn.oracleText), false);
  const eleshNornIntent = intentFor(eleshNorn);
  assert.ok(eleshNornIntent.packageIds.includes("anthems"));
  assert.ok(!eleshNornIntent.packageIds.includes("tokens"));

  const krenkoIntent = intentFor(krenko);
  assert.ok(krenkoIntent.packageIds.includes("tokens"));
  assert.ok(!krenkoIntent.packageIds.includes("anthems"));
});

test("Intangible Virtue legitimately occupies two roles: SUPPORT for tokens' own promise, FALSE FRIEND for anthems' narrower one", () => {
  const eleshNornIntent = intentFor(eleshNorn);
  const krenkoIntent = intentFor(krenko);
  assert.equal(cardSatisfiesPackageSupport(intangibleVirtue, "tokens", krenkoIntent), true);
  assert.equal(cardSatisfiesPackageCore(intangibleVirtue, "anthems", eleshNornIntent), false);
  assert.equal(cardIsPackageFalseFriend(intangibleVirtue, "anthems", eleshNornIntent), true);
});

test("a real Elesh-Norn-shaped commander forges the real static anthem over an otherwise-identical token-scoped trap", () => {
  const wFiller = [
    ...Array.from({ length: 30 }, (_, i) => ({ name: `Flow ${i}`, oracleText: "When this enters, draw a card. Scry 1.", typeLine: "Creature — Test", manaCost: "{2}{W}", colorIdentity: ["W"] })),
    ...Array.from({ length: 24 }, (_, i) => ({ name: `Answer ${i}`, oracleText: "Exile target nonland permanent.", typeLine: "Instant", manaCost: "{1}{W}", colorIdentity: ["W"] })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Shield ${i}`, oracleText: "Target creature gains hexproof until end of turn.", typeLine: "Instant", manaCost: "{1}{W}", colorIdentity: ["W"] })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Stone ${i}`, oracleText: "Add one mana. Create a Treasure token.", typeLine: "Artifact", manaCost: "{2}", colorIdentity: [] })),
  ];
  const wDuals = Array.from({ length: 20 }, (_, i) => ({
    name: `Plains ${i}`,
    oracleText: "{T}: Add {W}.",
    typeLine: "Basic Land — Plains",
    manaCost: "",
    colorIdentity: [],
    producedMana: ["W"],
    popularityRank: 5,
    priceUsd: 0.1,
  }));
  const wGenericPump = { name: "Test Generic Anthem Card", oracleText: "Other creatures you control get +1/+1.", typeLine: "Enchantment", manaCost: "{2}{W}", colorIdentity: ["W"] };
  const wIntangibleVirtue = { ...intangibleVirtue, colorIdentity: ["W"] };
  const report = forgeNativeMasterwork({
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    seed: 11,
    commander: eleshNorn,
    cards: [...wFiller, wGenericPump, wIntangibleVirtue, ...wDuals],
  });
  const names = new Set(report.selected.rows.map((row) => row.name));
  const intent = report.selected.strategicIntent;
  assert.ok(intent.packageIds.includes("anthems"), "Elesh Norn's deck should carry the anthems package");
  assert.ok(names.has("Test Generic Anthem Card"), "the real static anthem should be reserved as package core");
  assert.equal(cardSatisfiesPackageCore(wGenericPump, "anthems", intent), true);
  assert.equal(cardSatisfiesPackageCore(wIntangibleVirtue, "anthems", intent), false);
});
