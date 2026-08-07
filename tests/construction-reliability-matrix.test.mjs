import assert from "node:assert/strict";
import test from "node:test";
import { forgeNativeMasterwork } from "../app/native-masterwork-engine.mjs";

// P0 Part 8 — deterministic construction reliability matrix. Confirms
// ordinary supported inputs (a real commander color-identity shape, a
// supported format, any of the three strategy families) do not routinely
// fall into an incomplete deck. Synthetic pools, not live Scryfall data —
// same convention every other native-masterwork-engine test in this repo
// already uses, specifically so this suite stays fast, deterministic, and
// network-free (Ayula, Queen Among Bears herself was verified separately
// against the real, live Scryfall pool — see the P0 investigation report;
// re-running that here on every test invocation would make CI depend on
// an external network call succeeding).
//
// Each color gets real role diversity (a draw effect, a removal effect, a
// protection effect, a ramp effect, a body/threat) so a mono-color
// commander is exercised against a pool shaped like real Magic, not a
// monoculture of one effect repeated — the same shape that already
// surfaces real chooseSpells/role-coverage-gate issues elsewhere in this
// file's sibling tests.

const ROLE_TEXT = {
  draw: "When this enters, draw a card. Scry 1.",
  removal: "Destroy target creature.",
  protection: "Target creature you control gains hexproof and indestructible until end of turn.",
  ramp: "Search your library for a basic land card, put it onto the battlefield tapped, then shuffle.",
  threat: "Whenever this attacks, it deals 2 damage to any target.",
};
const ROLE_TYPE = {
  draw: "Creature — Test",
  removal: "Sorcery",
  protection: "Instant",
  ramp: "Sorcery",
  threat: "Creature — Test",
};
const BASIC_BY_COLOR = { W: "Plains", U: "Island", B: "Swamp", R: "Mountain", G: "Forest" };

function poolForColors(colors) {
  const cards = [];
  for (const color of colors) {
    for (const [role, oracleText] of Object.entries(ROLE_TEXT)) {
      for (let i = 0; i < 16; i += 1) {
        cards.push({
          name: `${color} ${role} ${i}`,
          oracleText,
          typeLine: ROLE_TYPE[role],
          manaCost: `{1}{${color}}`,
          cmc: 2,
          colorIdentity: [color],
        });
      }
    }
    for (let i = 0; i < 10; i += 1) {
      cards.push({
        name: `${BASIC_BY_COLOR[color]} Utility ${i}`,
        oracleText: `{T}: Add {${color}}.`,
        typeLine: "Land",
        manaCost: "",
        cmc: 0,
        colorIdentity: [color],
      });
    }
  }
  for (let i = 0; i < 12; i += 1) {
    cards.push({
      name: `Signet Rock ${i}`,
      oracleText: "Add one mana of any color.",
      typeLine: "Artifact",
      manaCost: "{2}",
      cmc: 2,
      colorIdentity: [],
    });
  }
  return cards;
}

const COMMANDER_SHAPES = [
  { label: "mono-color", colors: ["G"] },
  { label: "two-color", colors: ["U", "B"] },
  { label: "three-color", colors: ["W", "U", "B"] },
  { label: "five-color", colors: ["W", "U", "B", "R", "G"] },
];
const STRATEGIES = ["Aggressive pressure", "Balanced midrange", "Reactive control"];
const SEEDS = [11, 97];

// Copy limit differs by format (singleton vs up to 4) — asserted per row
// below rather than assumed, so a regression that lets a singleton format
// slip in extra copies is actually caught.
function assertLegalDeck(report, { target, singleton, commanderColors }) {
  const rows = report.selected.rows;
  const total = rows.reduce((sum, row) => sum + row.quantity, 0);
  assert.equal(total, target, `expected exactly ${target} cards`);
  const copyLimit = singleton ? 1 : 4;
  for (const row of rows) {
    if (row.name === "Test Commander") continue;
    const isBasic = Object.values(BASIC_BY_COLOR).some((basic) => row.name.startsWith(basic));
    if (isBasic) continue; // basics are exempt from the copy limit, real deckbuilding rule
    assert.ok(row.quantity <= copyLimit, `${row.name} has ${row.quantity} copies, over the ${copyLimit}-copy limit`);
  }
  if (commanderColors) {
    const commanderRow = rows.find((row) => row.roles?.includes("commander"));
    assert.ok(commanderRow, "expected a commander row in a Commander-format deck");
  }
  // Every displayed candidate (not just the recommended one) must itself
  // be complete — the masterworks screen lets the player choose any of
  // them (P0 Part 4).
  for (const candidate of report.candidates) {
    const candidateTotal = candidate.rows.reduce((sum, row) => sum + row.quantity, 0);
    assert.equal(candidateTotal, target, `candidate ${candidate.id} must also reach exactly ${target} cards`);
  }
}

for (const shape of COMMANDER_SHAPES) {
  const pool = poolForColors(shape.colors);
  for (const strategy of STRATEGIES) {
    for (const seed of SEEDS) {
      test(`Commander format: a ${shape.label} commander (${strategy}, seed ${seed}) reaches a complete, legal 100-card deck with every candidate valid`, () => {
        const report = forgeNativeMasterwork({
          format: "Commander",
          target: 100,
          strategy,
          seed,
          colors: shape.colors,
          commander: { name: "Test Commander", colors: shape.colors, oracleText: "" },
          cards: pool,
        });
        assertLegalDeck(report, { target: 100, singleton: true, commanderColors: shape.colors });
      });
    }
  }
}

const NONSINGLETON_FORMATS = ["Standard", "Modern", "Pioneer"];
for (const format of NONSINGLETON_FORMATS) {
  // Non-Commander formats have no commander — the pool is drawn from one
  // representative two-color identity, same shape a real player picking
  // "no commander, just colors from my note" would get.
  const pool = poolForColors(["U", "B"]);
  for (const strategy of STRATEGIES) {
    test(`${format}: a two-color deck (${strategy}) reaches a complete, legal 60-card deck with every candidate valid`, () => {
      const report = forgeNativeMasterwork({
        format,
        target: 60,
        strategy,
        seed: 33,
        colors: ["U", "B"],
        commander: null,
        cards: pool,
      });
      assertLegalDeck(report, { target: 60, singleton: false, commanderColors: null });
    });
  }
}

for (const format of ["Brawl", "Standard Brawl"]) {
  const target = format === "Brawl" ? 100 : 60;
  const pool = poolForColors(["R", "G"]).map((card) => ({ ...card, }));
  test(`${format}: a two-color commander reaches a complete, legal ${target}-card singleton deck`, () => {
    const report = forgeNativeMasterwork({
      format,
      target,
      strategy: "Balanced midrange",
      seed: 51,
      colors: ["R", "G"],
      commander: { name: "Test Commander", colors: ["R", "G"], oracleText: "" },
      cards: pool,
    });
    assertLegalDeck(report, { target, singleton: true, commanderColors: ["R", "G"] });
  });
}

// The "obscure commander" case (a real, legal commander with a genuinely
// thin supporting card pool — the mid-conversation follow-up alongside
// this P0 task) is exactly the recovery ladder's target scenario:
// tests/native-masterwork-engine.test.mjs's scarce-pool tests already
// prove it end to end (recovers when relaxation can help; fails cleanly,
// never silently, when it genuinely can't). Not re-duplicated here.
