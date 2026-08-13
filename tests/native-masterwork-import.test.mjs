import assert from "node:assert/strict";
import test from "node:test";
import { forgeImportedMasterwork } from "../app/native-masterwork-engine.mjs";

const card = (name, oracleText, typeLine = "Creature — Test", manaCost = "{2}{U}", colorIdentity = ["U"]) => ({ name, oracleText, typeLine, manaCost, colorIdentity });
const pool = [
  ...Array.from({ length: 28 }, (_, i) => card(`Flow ${i}`, "When this enters, draw a card. Scry 1.")),
  ...Array.from({ length: 24 }, (_, i) => card(`Answer ${i}`, "Exile target nonland permanent.")),
  ...Array.from({ length: 18 }, (_, i) => card(`Shield ${i}`, "Target creature gains hexproof and indestructible until end of turn.")),
  ...Array.from({ length: 18 }, (_, i) => card(`Stone ${i}`, "Add one mana. Create a Treasure token.", "Artifact", "{2}")),
  ...Array.from({ length: 10 }, (_, i) => card(`Island Utility ${i}`, "{T}: Add {U}.", "Land", "", ["U"])),
];

const baseInput = { format: "Standard", target: 60, strategy: "Balanced midrange", path: "", note: "", seed: 7, commander: null, cards: pool, colors: ["U"] };

test("adapts a short pasted list into one legal, complete deck", () => {
  const input = { ...baseInput, importedRows: [
    { quantity: 4, name: "Flow 0" },
    { quantity: 4, name: "Answer 0" },
    { quantity: 20, name: "Island" },
  ] };
  const first = forgeImportedMasterwork(input);
  const second = forgeImportedMasterwork(input);
  assert.equal(first.engine, second.engine, "deterministic for the same input");
  assert.deepEqual(first.selected.rows, second.selected.rows, "deterministic for the same input");
  assert.deepEqual(first.changes, second.changes, "deterministic for the same input");
  assert.equal(first.engine, "metaforge-native-import-v1");
  assert.equal(first.selected.rows.reduce((sum, row) => sum + row.quantity, 0), 60);
  const flow0 = first.selected.rows.find((row) => row.name === "Flow 0");
  assert.equal(flow0.quantity, 4, "the player's own card quantity is preserved");
  assert.ok(first.changes.added.length > 0, "gaps beyond the pasted list get filled and disclosed");
  assert.equal(first.tournament.selectedId, first.selected.id, "the imported build is always the selected candidate");
});

test("preserves every card and the exact land split of a complete submitted deck", () => {
  const submittedSpells = Array.from({ length: 9 }, (_, index) => ({ quantity: 4, name: `Flow ${index}` }));
  const importedRows = [...submittedSpells, { quantity: 24, name: "Island" }];
  const report = forgeImportedMasterwork({ ...baseInput, importedRows });
  const selectedByName = new Map(report.selected.rows.map((row) => [row.name, row.quantity]));
  for (const row of importedRows) assert.equal(selectedByName.get(row.name), row.quantity, `${row.name} must be preserved exactly`);
  assert.deepEqual(report.changes.added, []);
  assert.deepEqual(report.changes.trimmed, []);
});

test("trims a copy-limit violation instead of silently dropping the whole card", () => {
  const input = { ...baseInput, importedRows: [
    { quantity: 8, name: "Flow 0" }, // over Standard's 4-copy limit
    { quantity: 20, name: "Island" },
  ] };
  const report = forgeImportedMasterwork(input);
  const flow0 = report.selected.rows.find((row) => row.name === "Flow 0");
  assert.equal(flow0.quantity, 4);
  const trimmedEntry = report.changes.trimmed.find((entry) => entry.name === "Flow 0");
  assert.ok(trimmedEntry, "the trim is disclosed in changes.trimmed");
  assert.equal(trimmedEntry.cut, 4);
});

test("never fabricates a card that isn't in the verified pool", () => {
  const input = { ...baseInput, importedRows: [
    { quantity: 4, name: "Definitely Not A Real Card" },
    { quantity: 4, name: "Flow 0" },
    { quantity: 20, name: "Island" },
  ] };
  const report = forgeImportedMasterwork(input);
  assert.ok(!report.selected.rows.some((row) => row.name === "Definitely Not A Real Card"));
});

test("reserves the commander and preserves color identity in Commander format", () => {
  const input = {
    ...baseInput,
    format: "Commander",
    target: 100,
    commander: { name: "Scholar of Tests", colors: ["U"], oracleText: "Whenever you draw your second card, create a token." },
    importedRows: [
      { quantity: 1, name: "Flow 0" },
      { quantity: 1, name: "Answer 0" },
      { quantity: 38, name: "Island" },
    ],
  };
  const report = forgeImportedMasterwork(input);
  assert.equal(report.selected.rows[0].name, "Scholar of Tests");
  assert.equal(report.selected.rows.reduce((sum, row) => sum + row.quantity, 0), 100);
});

test("exposes a real one-slot laboratory and reasoning, compatible with the experiment tablets", () => {
  const input = { ...baseInput, importedRows: [
    { quantity: 4, name: "Flow 0" },
    { quantity: 20, name: "Island" },
  ] };
  const report = forgeImportedMasterwork(input);
  assert.equal(typeof report.laboratory.verdict, "string");
  assert.ok(Array.isArray(report.candidates) && report.candidates.length >= 2);
  assert.equal(report.reasoning.selectedId, report.selected.id);
});

test("refuses to fabricate a legal deck when the pasted list has no verifiable cards", () => {
  const input = { ...baseInput, importedRows: [{ quantity: 4, name: "Not Real At All" }] };
  assert.throws(() => forgeImportedMasterwork(input), /could be matched/i);
});

test("refuses an empty imported list outright", () => {
  const input = { ...baseInput, importedRows: [] };
  assert.throws(() => forgeImportedMasterwork(input), /at least one verified card/i);
});

// --- Honest power-tier auditing: imported decks ------------------------
// Imported decks never receive a targetPowerTier (forge-generate.ts
// omits it unconditionally) and never get rebuilt — the player's
// submitted list is preserved exactly, "audited and warned about" means
// the real measured tier is reported honestly, never that the Forge
// silently substitutes its own optimization.
const yawgmothLike = card(
  "Test Sacrifice Engine",
  "{B}, Sacrifice a creature: Put a -1/-1 counter on up to one target creature. If a creature card was put into a graveyard this way this turn, draw a card.",
  "Legendary Creature — Test",
  "{1}{B}",
  ["B"],
);
const commanderPoolWithEngine = [...pool, yawgmothLike];

test("an imported Commander list containing a real high-ceiling card is honestly measured, not silently relabeled Casual", () => {
  const input = {
    ...baseInput,
    format: "Commander",
    target: 100,
    colors: ["U", "B"],
    commander: { name: "Scholar of Tests", colors: ["U"], oracleText: "Draw a card." },
    cards: commanderPoolWithEngine,
    importedRows: [
      { quantity: 1, name: "Test Sacrifice Engine" },
      { quantity: 1, name: "Flow 0" },
      { quantity: 1, name: "Answer 0" },
      { quantity: 37, name: "Island" },
    ],
  };
  const report = forgeImportedMasterwork(input);
  assert.ok(report.selected.rows.some((row) => row.name === "Test Sacrifice Engine"), "the player's own submitted card must never be silently excluded");
  assert.ok(report.powerSignal.repeatableValueEngine.includes("Test Sacrifice Engine"), "the real measured tier must actually see and report the card's power signal");
  assert.equal(report.powerAudit, null, "imported decks have no requested tier to audit against, and are never rebuilt");
});

test("an imported deck's power signal is never influenced by a targetPowerTier — the field doesn't exist for this path", () => {
  const input = {
    ...baseInput,
    format: "Commander",
    target: 100,
    colors: ["U", "B"],
    commander: { name: "Scholar of Tests", colors: ["U"], oracleText: "Draw a card." },
    cards: commanderPoolWithEngine,
    // targetPowerTier deliberately supplied here to confirm forgeImportedMasterwork
    // has no code path that reads it at all — forge-generate.ts already
    // never passes it for imports, this is defense in depth at the engine level.
    targetPowerTier: "Casual",
    importedRows: [
      { quantity: 1, name: "Test Sacrifice Engine" },
      { quantity: 1, name: "Flow 0" },
      { quantity: 37, name: "Island" },
    ],
  };
  const report = forgeImportedMasterwork(input);
  assert.ok(report.selected.rows.some((row) => row.name === "Test Sacrifice Engine"), "must never be excluded even if a targetPowerTier is somehow supplied");
  assert.equal(report.powerAudit, null);
});

// P0 recovery ladder, Review/import path: the player's own submitted rows
// are always reserved first (they can never be dropped), but the gaps
// their list leaves open are filled from the same eligible pool a fresh
// build uses — a strict budget cap on top of a scarce color identity can
// leave that gap-filling short exactly like buildCandidate's, and must
// recover the same way instead of failing the whole import.
test("a strict budget cap that would leave too few eligible cards to fill the gaps in a pasted list recovers instead of failing outright", () => {
  const cheapDraw = (n) => ({ ...card(`Cheap Draw ${n}`, "When this enters, draw a card. Scry 1.", "Creature — Test", "{1}{G}", ["G"]), priceUsd: 0.5 });
  const cheapAnswer = (n) => ({ ...card(`Cheap Answer ${n}`, "Destroy target creature.", "Sorcery", "{1}{G}", ["G"]), priceUsd: 0.5 });
  const cheapShield = (n) => ({ ...card(`Cheap Shield ${n}`, "Target creature gains hexproof and indestructible until end of turn.", "Instant", "{G}", ["G"]), priceUsd: 0.5 });
  const premiumDraw = (n) => ({ ...card(`Premium Draw ${n}`, "When this enters, draw a card. Scry 1.", "Creature — Test", "{2}{G}", ["G"]), priceUsd: 45 });
  const premiumAnswer = (n) => ({ ...card(`Premium Answer ${n}`, "Destroy target creature. Draw a card.", "Sorcery", "{2}{G}", ["G"]), priceUsd: 45 });
  const premiumRamp = (n) => ({ ...card(`Premium Rock ${n}`, "Add one mana of any color.", "Artifact", "{1}", []), priceUsd: 45 });
  const scarcePool = [
    ...Array.from({ length: 14 }, (_, i) => cheapDraw(i)),
    ...Array.from({ length: 13 }, (_, i) => cheapAnswer(i)),
    ...Array.from({ length: 13 }, (_, i) => cheapShield(i)),
    ...Array.from({ length: 14 }, (_, i) => premiumDraw(i)),
    ...Array.from({ length: 13 }, (_, i) => premiumAnswer(i)),
    ...Array.from({ length: 13 }, (_, i) => premiumRamp(i)),
    ...Array.from({ length: 20 }, (_, i) => card(`Forest Utility ${i}`, "{T}: Add {G}.", "Land", "", ["G"])),
  ];
  const input = {
    ...baseInput,
    format: "Commander",
    target: 100,
    colors: ["G"],
    commander: { name: "Test Commander", colors: ["G"], oracleText: "" },
    cards: scarcePool,
    maxCardPrice: 2,
    importedRows: [
      { quantity: 1, name: "Cheap Draw 0" },
      { quantity: 30, name: "Forest" },
    ],
  };
  const report = forgeImportedMasterwork(input);
  const total = report.selected.rows.reduce((sum, row) => sum + row.quantity, 0);
  assert.equal(total, 100, "the deck must still reach the exact legal target size");
  assert.equal(report.selected.recoveryStage, "relaxed-preferences");
  const submitted = report.selected.rows.find((row) => row.name === "Cheap Draw 0");
  assert.equal(submitted.quantity, 1, "the player's own submitted card is never affected by recovery");
});
